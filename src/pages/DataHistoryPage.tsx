import React, { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { fetchReadingsHistory, fetchStations } from "../services/apiService";
import type { Reading, StationWithReading, WaterStatus } from "../types";
import {
  ClipboardListIcon,
  XIcon,
  BarChart3Icon,
  TrendingDownIcon,
  TrendingUpIcon,
  DropletsIcon,
  AlertTriangleIcon,
  ClockIcon,
  RadioIcon,
  ThermometerIcon,
  BatteryChargingIcon,
  WifiIcon,
  InboxIcon,
  CheckCircleIcon,
  CompassIcon,
  ChevronDownIcon,
  CpuIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MapPinIcon,
  ShieldCheckIcon,
  ExternalLinkIcon,
} from "../components/ui/Icons";
import Papa from "papaparse";
import ManagementBackBar from "../components/ui/ManagementBackBar";
import { CompactFilterDropdown, type DropdownOption } from "../components/ui/CompactFilterDropdown";
import { SkeletonCard, SkeletonTable } from "../components/ui/Skeleton";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const REFRESH_INTERVAL_MS = 30_000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(val: number | null, unit = "", decimals = 2): string {
  if (val == null) return "—";
  return `${val.toFixed(decimals)}${unit}`;
}

function fmtTimestamp(ts: string): string {
  try {
    const d = new Date(ts);
    const date = new Intl.DateTimeFormat("th-TH", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d);
    const time = d.toTimeString().slice(0, 8);
    return `${date} ${time}`;
  } catch {
    return ts;
  }
}

// Calculate geodesic distance between two points in meters (Haversine formula)
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function getReadingWaterStatus(
  r: Reading,
  station?: StationWithReading
): { status: WaterStatus; label: string; color: string; bg: string; dot: string } {
  if (r.water_level == null) {
    return { status: "unknown", label: "ไม่มีข้อมูล", color: "var(--text-muted, #94A3B8)", bg: "rgba(148, 163, 184, 0.12)", dot: "var(--text-muted, #94A3B8)" };
  }

  // 1. Primary: Use water_status computed by Backend SQL (Single Source of Truth)
  let s: WaterStatus = r.water_status || "unknown";

  // 2. Fallback: If water_status is missing/unknown, compare level against station thresholds
  if (s === "unknown") {
    const crit = r.critical_level ?? (station?.critical_level != null ? Number(station.critical_level) : null);
    const warn = r.warning_level ?? (station?.warning_level != null ? Number(station.warning_level) : null);
    if (crit != null && r.water_level >= crit) {
      s = "critical";
    } else if (warn != null && r.water_level >= warn) {
      s = "warning";
    } else {
      s = "normal";
    }
  }

  if (s === "critical") {
    return { status: "critical", label: "วิกฤต", color: "var(--color-critical, #EF4444)", bg: "rgba(239, 68, 68, 0.15)", dot: "var(--color-critical, #EF4444)" };
  }
  if (s === "warning") {
    return { status: "warning", label: "เฝ้าระวัง", color: "var(--color-warning, #F59E0B)", bg: "rgba(245, 158, 11, 0.15)", dot: "var(--color-warning, #F59E0B)" };
  }
  return { status: "normal", label: "ปกติ", color: "var(--color-normal, #10B981)", bg: "rgba(16, 185, 129, 0.15)", dot: "var(--color-normal, #10B981)" };
}

function BatteryBar({ pct }: { pct: number | null }) {
  if (pct == null) return <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>;
  const color = pct > 50 ? "var(--color-normal, #10B981)" : pct > 20 ? "var(--color-warning, #F59E0B)" : "var(--color-critical, #EF4444)";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span className="font-mono tabular-nums" style={{ fontSize: 12, fontWeight: 700, color }}>
        {pct.toFixed(0)}%
      </span>
      <div style={{ width: 48, height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
        <div
          style={{
            width: "100%",
            height: "100%",
            transform: `scaleX(${Math.min(1, Math.max(0, pct / 100))})`,
            transformOrigin: "left",
            background: color,
            borderRadius: 2,
            transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
      </div>
    </div>
  );
}

interface HistoryTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      time: string;
      fullTime: string;
      water_level: number | null;
      temperature: number | null;
      humidity: number | null;
      station: string;
    };
  }>;
}

function HistoryChartTooltip({ active, payload }: HistoryTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div
      style={{
        background: "var(--card-surface, #15181E)",
        border: "1px solid rgba(56, 189, 248, 0.28)",
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: 12,
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        minWidth: 170,
      }}
    >
      <div className="tabular-nums font-mono" style={{ color: "var(--text-secondary, #94A3B8)", fontSize: 11, marginBottom: 4 }}>
        {data.fullTime || data.time}
      </div>
      {data.station && (
        <div style={{ color: "var(--text-primary)", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
          {data.station}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>ระดับน้ำ</span>
        <span
          className="tabular-nums font-mono"
          style={{
            color: "var(--color-cyan, #38BDF8)",
            fontWeight: 700,
            fontSize: 18,
          }}
        >
          {data.water_level != null ? `${data.water_level >= 0 ? "+" : ""}${Number(data.water_level).toFixed(2)}` : "-"}
        </span>
        <span style={{ color: "var(--text-secondary, #94A3B8)", fontSize: 11 }}>ม.</span>
      </div>
    </div>
  );
}

type TimePreset = "all" | "24h" | "7d" | "30d" | "custom";
type StatusFilterType = "all" | "normal" | "warning" | "critical" | "rate_of_rise" | "anomaly";
type HistoryViewMode = "table" | "chart";

export default function DataHistoryPage() {
  const { user, isGuest } = useAuth();
  const canExport = !isGuest && (user?.role === "admin" || user?.role === "staff");
  const isStaff = !isGuest && user?.role === "staff";

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(() => {
    const saved = localStorage.getItem("floodguard_history_page_size");
    if (saved === "100") return 100;
    if (saved === "200") return 200;
    if (saved === "500") return 500;
    return 100;
  });

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    localStorage.setItem("floodguard_history_page_size", String(newSize));
    setPage(0);
  };

  const [exportError, setExportError] = useState("");
  const [isExported, setIsExported] = useState(false);

  const [filterStation, setFilterStation] = useState("");
  const [timePreset, setTimePreset] = useState<TimePreset>("all");
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");

  // Tactical Quick Status Filter
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>("all");

  // View Mode: Table vs Chart
  const [viewMode, setViewMode] = useState<HistoryViewMode>("table");

  // Inline Row Accordion Expansion (set of expanded reading_ids)
  const [expandedRowIds, setExpandedRowIds] = useState<Set<number>>(new Set());

  // Modal accessibility refs for Focus Trap & Escape restoration
  const modalPanelRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const exportBtnTriggerRef = useRef<HTMLButtonElement | null>(null);

  const toggleRowExpand = (id: number) => {
    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // ── CSV Export Scope State & Handlers ─────────────────────────
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportScope, setExportScope] = useState<"all_filtered" | "current_page">("all_filtered");
  const [exportLoading, setExportLoading] = useState(false);

  // Focus trap and Escape key listener for Export Modal
  useEffect(() => {
    if (!isExportModalOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (!exportLoading) {
          setIsExportModalOpen(false);
        }
        return;
      }

      if (e.key === "Tab" && modalPanelRef.current) {
        const focusableElements = modalPanelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input[type="radio"]:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    // Auto focus first interactive element in modal
    const focusTimer = setTimeout(() => {
      if (modalPanelRef.current) {
        const firstFocusable = modalPanelRef.current.querySelector<HTMLElement>(
          'button:not([disabled]), input[type="radio"]:not([disabled])'
        );
        firstFocusable?.focus();
      }
    }, 50);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(focusTimer);
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === "function") {
        previousFocusRef.current.focus();
      }
    };
  }, [isExportModalOpen, exportLoading]);

  const triggerCSVDownload = (dataToExport: Reading[], customStationName?: string) => {
    const currentStation = stations.find((s) => s.station_id === filterStation);
    const stationName = customStationName || currentStation?.station_name || (filterStation ? filterStation : "all_stations");

    const rows = dataToExport.map((r) => {
      const st = stations.find((s) => s.station_id === r.station_id) || currentStation;
      const statusObj = getReadingWaterStatus(r, st);
      return {
        "วันที่และเวลา": fmtTimestamp(r.timestamp),
        "รหัสสถานี": r.station_id,
        "ชื่อสถานี": r.station_name || "-",
        "ระดับน้ำ (ม.)": r.water_level != null ? (r.water_level > 0 ? "+" : "") + Number(r.water_level).toFixed(2) : "-",
        "สถานะระดับน้ำ": statusObj.label,
        "ระยะเซนเซอร์วัดได้ (ม.)": r.raw_distance != null ? Number(r.raw_distance).toFixed(2) : "-",
        "สถานะจุดบอด": r.is_blind_zone ? "Blind Zone" : "ปกติ",
        "อุณหภูมิ (°C)": r.temperature != null ? Number(r.temperature).toFixed(1) : "-",
        "ความชื้นสัมพัทธ์ (%)": r.humidity != null ? Number(r.humidity).toFixed(1) : "-",
        "แบตเตอรี่ (%)": r.battery_percent != null ? Number(r.battery_percent).toFixed(0) : "-",
        "แรงดันแบตเตอรี่ (V)": r.battery_voltage != null ? Number(r.battery_voltage).toFixed(2) : "-",
        "ความแรงสัญญาณ RSSI (dBm)": r.rssi != null ? Number(r.rssi).toFixed(0) : "-",
        "SNR (dB)": r.snr != null ? Number(r.snr).toFixed(1) : "-",
        "มุมเอียง Gyro X (°)": r.tilt_x != null ? Number(r.tilt_x).toFixed(1) : "-",
        "มุมเอียง Gyro Y (°)": r.tilt_y != null ? Number(r.tilt_y).toFixed(1) : "-",
        "Offset X (°)": r.tilt_offset_x != null ? Number(r.tilt_offset_x).toFixed(1) : "0.0",
        "Offset Y (°)": r.tilt_offset_y != null ? Number(r.tilt_offset_y).toFixed(1) : "0.0",
        "ความเอียงสัมพัทธ์รวม (°)": r.relative_total_tilt != null ? Number(r.relative_total_tilt).toFixed(1) : "-",
        "สถานะความมั่นคงของเสา": r.is_pole_tilted ? "เสาเอียง (>15°)" : (r.relative_total_tilt != null ? "เสาได้ระนาบ (ปกติ)" : "-"),
      };
    });

    const csv = Papa.unparse(rows, { header: true });
    const bom = "\uFEFF";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `readings_history_${stationName}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setIsExported(true);
    setTimeout(() => setIsExported(false), 2500);
  };

  const handleConfirmExport = async () => {
    if (exportScope === "current_page") {
      triggerCSVDownload(filteredReadings);
      setIsExportModalOpen(false);
    } else {
      setExportLoading(true);
      try {
        const params: Record<string, string | number> = {
          limit: Math.min(total || 50000, 50000),
          offset: 0,
        };
        if (filterStation) params.stationId = filterStation;
        if (filterStart)   params.start     = new Date(filterStart).toISOString();
        if (filterEnd)     params.end       = new Date(filterEnd).toISOString();

        const res = await fetchReadingsHistory(params);
        let list = res.data;

        if (statusFilter !== "all") {
          list = list.filter((r) => {
            const st = stations.find((s) => s.station_id === r.station_id);
            const s = getReadingWaterStatus(r, st);
            if (statusFilter === "normal") return s.status === "normal";
            if (statusFilter === "warning") return s.status === "warning";
            if (statusFilter === "critical") return s.status === "critical";
            if (statusFilter === "rate_of_rise") {
              return Boolean(r.is_rate_of_rise || (r.rate_of_rise != null && r.rate_of_rise >= 0.30));
            }
            if (statusFilter === "anomaly") {
              return Boolean(
                r.is_blind_zone ||
                r.is_pole_tilted ||
                (r.relative_total_tilt != null && Number(r.relative_total_tilt) > 15) ||
                (r.battery_percent != null && r.battery_percent < 20)
              );
            }
            return true;
          });
        }

        triggerCSVDownload(list);
        setIsExportModalOpen(false);
      } catch (err: unknown) {
        setExportError(err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูลทั้งหมดสำหรับส่งออกได้");
      } finally {
        setExportLoading(false);
      }
    }
  };

  const handleExportCSV = () => {
    if (total === 0 || loading) return;
    setExportError("");
    setIsExportModalOpen(true);
  };

  // ── Handle Preset Switching ───────────────────────────────────
  const handleTimePresetChange = (preset: TimePreset) => {
    setTimePreset(preset);
    setPage(0);
    const now = new Date();
    if (preset === "all") {
      setFilterStart("");
      setFilterEnd("");
    } else if (preset === "24h") {
      const past = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      setFilterStart(past.toISOString().slice(0, 16));
      setFilterEnd(now.toISOString().slice(0, 16));
    } else if (preset === "7d") {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setFilterStart(past.toISOString().slice(0, 16));
      setFilterEnd(now.toISOString().slice(0, 16));
    } else if (preset === "30d") {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setFilterStart(past.toISOString().slice(0, 16));
      setFilterEnd(now.toISOString().slice(0, 16));
    }
  };

  // ── TanStack Query: Stations ──────────────────────────────────────────────
  const { data: stations = [], refetch: refetchStations } = useQuery<StationWithReading[]>({
    queryKey: ['stations-raw'],
    queryFn: fetchStations,
    staleTime: 30_000,
  });

  // ── TanStack Query: Readings History ──────────────────────────────────────
  const queryParams = useMemo(() => {
    const params: Record<string, string | number> = { limit: pageSize, offset: page * pageSize };
    if (filterStation) params.stationId = filterStation;
    if (filterStart)   params.start     = new Date(filterStart).toISOString();
    if (filterEnd)     params.end       = new Date(filterEnd).toISOString();
    return params;
  }, [filterStation, filterStart, filterEnd, page, pageSize]);

  const {
    data: historyData,
    isLoading,
    error: queryError,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ['readings-history', filterStation, filterStart, filterEnd, page, pageSize],
    queryFn: () => fetchReadingsHistory(queryParams),
    staleTime: 15_000,
    refetchInterval: REFRESH_INTERVAL_MS,
    placeholderData: keepPreviousData,
  });

  const readings = useMemo(() => historyData?.data ?? [], [historyData]);
  const total = historyData?.total ?? 0;
  const loading = isLoading;

  const errorMsg = exportError || (queryError instanceof Error ? queryError.message : (queryError ? "ไม่สามารถโหลดข้อมูลได้" : ""));

  useEffect(() => {
    const handleGlobalRefresh = () => {
      refetchHistory();
      refetchStations();
    };
    window.addEventListener("app:refresh", handleGlobalRefresh);
    return () => {
      window.removeEventListener("app:refresh", handleGlobalRefresh);
    };
  }, [refetchHistory, refetchStations]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // ─── Stats derived from current page (Zero Colon) ─────────────────────────────
  const stats = useMemo(() => {
    const validLevels = readings.map((r) => r.water_level).filter((v): v is number => v != null);
    const minLevel = validLevels.length > 0 ? Math.min(...validLevels) : null;
    const maxLevel = validLevels.length > 0 ? Math.max(...validLevels) : null;
    const avgLevel = validLevels.length > 0
      ? validLevels.reduce((acc, v) => acc + v, 0) / validLevels.length
      : null;
    return {
      total,
      minLevel,
      maxLevel,
      avgLevel,
    };
  }, [readings, total]);

  // ── Station dropdown options (Zero Colon) ───────────────────────────────────
  const stationDropdownOptions: DropdownOption[] = useMemo(() => {
    const rawIds = user?.stationIds || (user as any)?.station_ids || [];
    const userStationIds = (Array.isArray(rawIds) ? rawIds : [])
      .filter((id: any) => id != null)
      .map((id: any) => String(id).trim().toUpperCase())
      .filter((id: string) => id.length > 0 && id !== 'UNDEFINED' && id !== 'NULL');
    const isCitizen = !isGuest && user?.role === "citizen" && user?.id !== "citizen_guest";
    const isStaff = !isGuest && user?.role === "staff";

    const opts: DropdownOption[] = [
      {
        value: "",
        label: isStaff
          ? (stations.length === 0 ? "ยังไม่มีสถานีที่รับผิดชอบ" : `สถานีที่รับผิดชอบทั้งหมด (${stations.length} สถานี)`)
          : `ทุกสถานี (${stations.length} สถานี)`,
        sublabel: isStaff ? "ดึงข้อมูลเฉพาะสถานีที่ได้รับมอบหมาย" : "ดึงข้อมูลจากทุกสถานีตรวจวัดในระบบ",
        count: total,
      },
    ];
    stations.forEach((s) => {
      const isUserStation = Boolean(s?.station_id && userStationIds.includes(String(s.station_id).toUpperCase()));
      const sublabel = isUserStation
        ? `${s?.location_name ? s.location_name + " · " : ""}${isCitizen ? "สถานีที่ติดตาม" : isStaff ? "สถานีที่รับผิดชอบ" : ""}`
        : (s?.location_name || undefined);

      if (s?.station_id) {
        opts.push({
          value: s.station_id,
          label: `${s.station_id} · ${s.station_name || s.station_id}`,
          sublabel,
          statusDotColor:
            s.water_status === "critical"
              ? "var(--color-critical, #EF4444)"
              : s.water_status === "warning"
              ? "var(--color-warning, #F59E0B)"
              : "var(--color-normal, #10B981)",
          badge: s.water_level != null ? `${Number(s.water_level).toFixed(2)}m` : undefined,
        });
      }
    });
    return opts;
  }, [stations, total, user, isGuest]);

  // ── Filter and Counts for Quick Status Tabs ─────────────────────────────
  const { filteredReadings, statusCounts } = useMemo(() => {
    let normalCount = 0;
    let warningCount = 0;
    let criticalCount = 0;
    let rateOfRiseCount = 0;
    let anomalyCount = 0;

    readings.forEach((r) => {
      const st = stations.find((s) => s.station_id === r.station_id);
      const s = getReadingWaterStatus(r, st);
      if (s.status === "normal") normalCount++;
      if (s.status === "warning") warningCount++;
      if (s.status === "critical") criticalCount++;

      const isRapidRise = Boolean(
        r.is_rate_of_rise || (r.rate_of_rise != null && r.rate_of_rise >= 0.30)
      );
      if (isRapidRise) rateOfRiseCount++;

      const isAnomaly = Boolean(
        r.is_blind_zone ||
        r.is_pole_tilted ||
        (r.relative_total_tilt != null && Number(r.relative_total_tilt) > 15) ||
        (r.battery_percent != null && r.battery_percent < 20)
      );
      if (isAnomaly) anomalyCount++;
    });

    const filtered = readings.filter((r) => {
      if (statusFilter === "all") return true;
      const st = stations.find((s) => s.station_id === r.station_id);
      const s = getReadingWaterStatus(r, st);
      if (statusFilter === "normal") return s.status === "normal";
      if (statusFilter === "warning") return s.status === "warning";
      if (statusFilter === "critical") return s.status === "critical";
      if (statusFilter === "rate_of_rise") {
        return Boolean(r.is_rate_of_rise || (r.rate_of_rise != null && r.rate_of_rise >= 0.30));
      }
      if (statusFilter === "anomaly") {
        return Boolean(
          r.is_blind_zone ||
          r.is_pole_tilted ||
          (r.relative_total_tilt != null && Number(r.relative_total_tilt) > 15) ||
          (r.battery_percent != null && r.battery_percent < 20)
        );
      }
      return true;
    });

    return {
      filteredReadings: filtered,
      statusCounts: {
        all: readings.length,
        normal: normalCount,
        warning: warningCount,
        critical: criticalCount,
        rateOfRise: rateOfRiseCount,
        anomaly: anomalyCount,
      },
    };
  }, [readings, stations, statusFilter]);

  // Time preset connected buttons
  const timePresetOptions: { value: TimePreset; label: string }[] = [
    { value: "all", label: "ทั้งหมด" },
    { value: "24h", label: "24 ชม." },
    { value: "7d", label: "7 วัน" },
    { value: "30d", label: "30 วัน" },
    { value: "custom", label: "กำหนดวัน" },
  ];

  // View mode connected buttons
  const viewModeOptions: { value: HistoryViewMode; label: string; icon: React.ReactNode }[] = [
    { value: "table", label: "ตารางบันทึก", icon: <ClipboardListIcon size={13} /> },
    { value: "chart", label: "กราฟแนวโน้ม", icon: <BarChart3Icon size={13} /> },
  ];

  // Chart data formatting
  const chartData = useMemo(() => {
    const reversed = [...filteredReadings].reverse();
    if (reversed.length === 0) return [];

    const firstTime = new Date(reversed[0].timestamp).getTime();
    const lastTime = new Date(reversed[reversed.length - 1].timestamp).getTime();
    const isMultiDay = Math.abs(lastTime - firstTime) > 24 * 3600 * 1000;

    return reversed.map((r) => {
      const d = new Date(r.timestamp);
      const isValid = !isNaN(d.getTime());

      let timeLabel = r.timestamp;
      let fullTime = r.timestamp;

      if (isValid) {
        const timeStr = d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
        const dateStr = d.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
        timeLabel = isMultiDay ? `${dateStr} ${timeStr}` : timeStr;

        const fullDate = d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
        fullTime = `${fullDate} ${timeStr} น.`;
      }

      return {
        timestamp: r.timestamp,
        time: timeLabel,
        fullTime,
        water_level: r.water_level,
        temperature: r.temperature,
        humidity: r.humidity,
        station: r.station_name || r.station_id,
      };
    });
  }, [filteredReadings]);

  return (
    <div className="page-container" style={{ paddingBottom: 60 }}>
      {/* ── TOP MANAGEMENT BAR ── */}
      <ManagementBackBar title="ประวัติข้อมูลโทรมาตร" showBackButton={false} />

      {/* ══ 1. CONNECTED TACTICAL CONTROL BAR (ZERO-GLOW & ZERO-COLON) ════════ */}
      <div className="history-toolbar-tactical">
        {/* Left: Station Selector & Reset Button */}
        <div className="history-filter-station-wrap" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <CompactFilterDropdown
            options={stationDropdownOptions}
            value={filterStation}
            onChange={(val) => {
              setFilterStation(val);
              setPage(0);
            }}
            placeholder="เลือกสถานีตรวจวัด..."
            width={240}
            variant="tactical"
          />

          {(filterStation || filterStart || filterEnd || statusFilter !== "all") && (
            <button
              type="button"
              className="btn btn-ghost btn-sm tactile-press"
              onClick={() => {
                setFilterStation("");
                setTimePreset("all");
                setFilterStart("");
                setFilterEnd("");
                setStatusFilter("all");
                setPage(0);
              }}
              style={{
                fontSize: 12,
                minHeight: 38,
                padding: "8px 12px",
                borderRadius: 8,
                color: "var(--color-critical)",
                gap: 4,
                border: "1px solid rgba(239, 68, 68, 0.2)",
                background: "rgba(239, 68, 68, 0.05)",
                display: "inline-flex",
                alignItems: "center",
              }}
              title="ล้างการตั้งค่าตัวกรองทั้งหมด"
            >
              <XIcon size={13} />
              <span>ล้างตัวกรอง</span>
            </button>
          )}
        </div>

        {/* Center: Connected Tactical Button Group for Time Presets */}
        <div className="history-time-presets-wrap">
          <div className="tactical-btn-group" role="tablist" aria-label="ช่วงเวลาของประวัติข้อมูล">
            {timePresetOptions.map((opt, idx) => (
              <React.Fragment key={opt.value}>
                {idx > 0 && <div className="tactical-btn-divider" />}
                <button
                  type="button"
                  role="tab"
                  aria-selected={timePreset === opt.value}
                  className={`tactical-btn-item tactile-press ${timePreset === opt.value ? "active" : ""}`}
                  onClick={() => handleTimePresetChange(opt.value)}
                >
                  {opt.label}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Right: Connected Tactical Button Group for View Mode & CSV Export */}
        <div className="history-view-mode-wrap" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div className="tactical-btn-group" role="tablist" aria-label="สลับมุมมองตารางหรือกราฟ">
            {viewModeOptions.map((opt, idx) => (
              <React.Fragment key={opt.value}>
                {idx > 0 && <div className="tactical-btn-divider" />}
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === opt.value}
                  className={`tactical-btn-item tactile-press ${viewMode === opt.value ? "active" : ""}`}
                  onClick={() => setViewMode(opt.value)}
                >
                  {opt.icon}
                  <span>{opt.label}</span>
                </button>
              </React.Fragment>
            ))}
          </div>

          {canExport && (
            <button
              ref={exportBtnTriggerRef}
              type="button"
              onClick={handleExportCSV}
              disabled={readings.length === 0 || loading}
              className={`csv-flight-button tactile-press ${isExported ? "success" : ""}`}
              aria-haspopup="dialog"
              aria-expanded={isExportModalOpen}
              title={
                readings.length === 0
                  ? "ไม่มีข้อมูลสำหรับส่งออก"
                  : `ส่งออกข้อมูลประวัติ ${readings.length} รายการเป็นไฟล์ CSV`
              }
            >
              <div className="flight-svg-wrapper">
                {isExported ? (
                  <CheckCircleIcon size={16} style={{ color: "#ffffff" }} />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 2L11 13" />
                    <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                  </svg>
                )}
              </div>
              <span className="flight-text">
                {isExported ? "ดาวน์โหลดสำเร็จ" : "ส่งออก CSV"}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Progressive Disclosure: Custom Date Range Form (Zero Colon) */}
      {timePreset === "custom" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 14,
            padding: "10px 16px",
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 8,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 12, color: "var(--accent-cyan, #38bdf8)", fontWeight: 600 }}>กำหนดช่วงวันเวลา</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <label htmlFor="history-filter-start" style={{ fontSize: 11, color: "var(--text-muted)" }}>ตั้งแต่</label>
            <input
              id="history-filter-start"
              type="datetime-local"
              className="input"
              value={filterStart}
              onChange={(e) => {
                setFilterStart(e.target.value);
                setPage(0);
              }}
              aria-label="ตั้งแต่วันที่และเวลา"
              style={{ fontSize: 12, padding: "4px 8px", width: "auto" }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <label htmlFor="history-filter-end" style={{ fontSize: 11, color: "var(--text-muted)" }}>ถึง</label>
            <input
              id="history-filter-end"
              type="datetime-local"
              className="input"
              value={filterEnd}
              onChange={(e) => {
                setFilterEnd(e.target.value);
                setPage(0);
              }}
              aria-label="ถึงวันที่และเวลา"
              style={{ fontSize: 12, padding: "4px 8px", width: "auto" }}
            />
          </div>
        </div>
      )}

      {/* ══ 2. 4-COLUMN INDEPENDENT KPI BENTO METRIC CARDS ══ */}
      <div className="history-kpi-grid">
        {/* Card 1: Total Records */}
        <div className="history-kpi-card">
          <div className="history-kpi-card-header">
            <div className="history-kpi-card-left">
              <div style={{ width: 26, height: 26, borderRadius: 6, background: "rgba(56, 189, 248, 0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <BarChart3Icon size={14} style={{ color: "var(--accent-cyan, #38bdf8)" }} />
              </div>
              <span className="history-kpi-card-title">บันทึกในระบบ</span>
            </div>
            <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace", padding: "1px 6px", background: "rgba(255,255,255,0.04)", borderRadius: 4 }}>
              TOTAL
            </span>
          </div>
          <div className="history-kpi-card-val-row">
            <span className="history-kpi-card-val" style={{ color: "var(--text-primary, #ffffff)" }}>
              {total.toLocaleString()}
            </span>
            <span className="history-kpi-card-unit">รายการ</span>
          </div>
          <div className="history-kpi-card-subtitle">
            <span>แสดงผลหน้าละ {pageSize} รายการ</span>
          </div>
        </div>

        {/* Card 2: Max Water Level */}
        <div className="history-kpi-card">
          <div className="history-kpi-card-header">
            <div className="history-kpi-card-left">
              <div style={{ width: 26, height: 26, borderRadius: 6, background: "rgba(239, 68, 68, 0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <TrendingUpIcon size={14} style={{ color: "var(--color-critical, #F87171)" }} />
              </div>
              <span className="history-kpi-card-title">ระดับสูงสุด</span>
            </div>
            <span style={{ fontSize: 10, color: "var(--color-critical, #F87171)", fontFamily: "monospace", padding: "1px 6px", background: "rgba(239, 68, 68, 0.1)", borderRadius: 4 }}>
              MAX
            </span>
          </div>
          <div className="history-kpi-card-val-row">
            <span className="history-kpi-card-val" style={{ color: "var(--color-critical, #F87171)" }}>
              {stats.maxLevel != null ? `${stats.maxLevel > 0 ? "+" : ""}${stats.maxLevel.toFixed(2)}` : "—"}
            </span>
            <span className="history-kpi-card-unit">ม.</span>
          </div>
          <div className="history-kpi-card-subtitle">
            <span>จุดสูงสุดในหน้านี้</span>
          </div>
        </div>

        {/* Card 3: Min Water Level */}
        <div className="history-kpi-card">
          <div className="history-kpi-card-header">
            <div className="history-kpi-card-left">
              <div style={{ width: 26, height: 26, borderRadius: 6, background: "rgba(16, 185, 129, 0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <TrendingDownIcon size={14} style={{ color: "var(--color-normal, #34D399)" }} />
              </div>
              <span className="history-kpi-card-title">ระดับต่ำสุด</span>
            </div>
            <span style={{ fontSize: 10, color: "var(--color-normal, #34D399)", fontFamily: "monospace", padding: "1px 6px", background: "rgba(16, 185, 129, 0.1)", borderRadius: 4 }}>
              MIN
            </span>
          </div>
          <div className="history-kpi-card-val-row">
            <span className="history-kpi-card-val" style={{ color: "var(--color-normal, #34D399)" }}>
              {stats.minLevel != null ? `${stats.minLevel > 0 ? "+" : ""}${stats.minLevel.toFixed(2)}` : "—"}
            </span>
            <span className="history-kpi-card-unit">ม.</span>
          </div>
          <div className="history-kpi-card-subtitle">
            <span>จุดต่ำสุดในหน้านี้</span>
          </div>
        </div>

        {/* Card 4: Avg Water Level */}
        <div className="history-kpi-card">
          <div className="history-kpi-card-header">
            <div className="history-kpi-card-left">
              <div style={{ width: 26, height: 26, borderRadius: 6, background: "rgba(129, 140, 248, 0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <DropletsIcon size={14} style={{ color: "var(--accent-indigo, #818cf8)" }} />
              </div>
              <span className="history-kpi-card-title">ระดับเฉลี่ย</span>
            </div>
            <span style={{ fontSize: 10, color: "var(--accent-indigo, #818cf8)", fontFamily: "monospace", padding: "1px 6px", background: "rgba(129, 140, 248, 0.1)", borderRadius: 4 }}>
              AVG
            </span>
          </div>
          <div className="history-kpi-card-val-row">
            <span className="history-kpi-card-val" style={{ color: "var(--accent-indigo, #818cf8)" }}>
              {stats.avgLevel != null ? `${stats.avgLevel > 0 ? "+" : ""}${stats.avgLevel.toFixed(2)}` : "—"}
            </span>
            <span className="history-kpi-card-unit">ม.</span>
          </div>
          <div className="history-kpi-card-subtitle">
            <span>เฉลี่ยจากข้อมูลที่แสดงผล</span>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="alert-banner alert-banner-critical" style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertTriangleIcon size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ══ 3. MAIN AUDIT LOG CONTENT (TABLE OR CHART) ═══════════════════════ */}
      <div
        style={{
          background: "var(--card-surface, #0C0E12)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 14,
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.4)",
          overflow: "hidden",
        }}
      >
        {/* Table/Card Header Bar with Linear/GitHub Style Tab Strip */}
        <div className="table-header-tabstrip">
          {/* Left: Tab List */}
          <div className="table-tab-list" role="tablist" aria-label="กรองสถานะเหตุการณ์">
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === "all"}
              className={`table-tab-item tab-all tactile-press ${statusFilter === "all" ? "active" : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              <span>ทั้งหมด</span>
              <span className={`table-tab-badge ${statusCounts.all === 0 ? "dimmed" : ""}`}>
                {statusCounts.all}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === "normal"}
              className={`table-tab-item tab-normal tactile-press ${statusFilter === "normal" ? "active" : ""}`}
              onClick={() => setStatusFilter("normal")}
            >
              <span className="table-tab-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-normal, #10B981)", flexShrink: 0 }} />
              <span>ปกติ</span>
              <span className={`table-tab-badge ${statusCounts.normal === 0 ? "dimmed" : ""}`}>
                {statusCounts.normal}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === "warning"}
              className={`table-tab-item tab-warning tactile-press ${statusFilter === "warning" ? "active" : ""}`}
              onClick={() => setStatusFilter("warning")}
            >
              <span className="table-tab-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-warning, #F59E0B)", flexShrink: 0 }} />
              <span>เฝ้าระวัง</span>
              <span className={`table-tab-badge ${statusCounts.warning === 0 ? "dimmed" : ""}`}>
                {statusCounts.warning}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === "critical"}
              className={`table-tab-item tab-critical tactile-press ${statusFilter === "critical" ? "active" : ""}`}
              onClick={() => setStatusFilter("critical")}
            >
              <span className="table-tab-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-critical, #EF4444)", flexShrink: 0 }} />
              <span>วิกฤต</span>
              <span className={`table-tab-badge ${statusCounts.critical === 0 ? "dimmed" : ""}`}>
                {statusCounts.critical}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === "rate_of_rise"}
              className={`table-tab-item tab-rate-of-rise tactile-press ${statusFilter === "rate_of_rise" ? "active" : ""}`}
              onClick={() => setStatusFilter("rate_of_rise")}
              title="บันทึกที่ระดับน้ำเพิ่มขึ้นเร็วผิดปกติ (≥ 0.30 ม./ชม.)"
            >
              <TrendingUpIcon size={13} className="table-tab-icon" style={{ color: "#FB7185", flexShrink: 0 }} />
              <span>น้ำขึ้นเร็ว</span>
              <span className={`table-tab-badge ${statusCounts.rateOfRise === 0 ? "dimmed" : ""}`}>
                {statusCounts.rateOfRise}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === "anomaly"}
              className={`table-tab-item tab-anomaly tactile-press ${statusFilter === "anomaly" ? "active" : ""}`}
              onClick={() => setStatusFilter("anomaly")}
              title="บันทึกที่พบจุดบอด Blind Zone หรือเสาเอียง หรือแบตเตอรี่วิกฤต"
            >
              <AlertTriangleIcon size={13} className="table-tab-icon" style={{ color: "var(--color-warning, #F59E0B)", flexShrink: 0 }} />
              <span>แจ้งเตือนผิดปกติ</span>
              <span className={`table-tab-badge ${statusCounts.anomaly === 0 ? "dimmed" : ""}`}>
                {statusCounts.anomaly}
              </span>
            </button>
          </div>

          {/* Right: Page Indicator & Page Size Selector (Top) */}
          <div className="table-header-right-meta">
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
              {loading
                ? "กำลังโหลดข้อมูล..."
                : `แสดง ${filteredReadings.length.toLocaleString()} รายการ`}
            </span>
            <span style={{ color: "rgba(255, 255, 255, 0.15)" }}>•</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
              จากทั้งหมด {total.toLocaleString()} รายการ
            </span>
            <span style={{ color: "rgba(255, 255, 255, 0.15)" }}>•</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
              หน้า {totalPages === 0 ? 0 : page + 1} จาก {totalPages}
            </span>

            <span style={{ color: "rgba(255, 255, 255, 0.15)" }}>|</span>

            {/* Tactical Page Size Selector (Top) */}
            <div className="tactical-page-size-wrap">
              <span className="tactical-page-size-label">แสดงต่อหน้า</span>
              <div className="tactical-btn-group" role="group" aria-label="เลือกจำนวนรายการต่อหน้า (ส่วนบน)">
                {[50, 100, 200].map((sz, idx) => (
                  <React.Fragment key={sz}>
                    {idx > 0 && <div className="tactical-btn-divider" />}
                    <button
                      type="button"
                      onClick={() => handlePageSizeChange(sz)}
                      className={`tactical-btn-item tactile-press ${pageSize === sz ? "active" : ""}`}
                      style={{ minWidth: 32, padding: "3px 8px", fontSize: 11, minHeight: 26 }}
                      aria-pressed={pageSize === sz}
                    >
                      {sz}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* View Mode 1: Table (Desktop) & Cards (Mobile) */}
        {viewMode === "table" ? (
          <div>
            {loading ? (
              <div style={{ padding: 18 }}>
                <div className="history-desktop-table-container">
                  <SkeletonTable rows={8} cols={7} />
                </div>
                <div className="history-mobile-cards-container">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <SkeletonCard key={idx} height="130px" />
                  ))}
                </div>
              </div>
            ) : filteredReadings.length === 0 ? (
              <div className="empty-state" style={{ textAlign: "center", padding: "48px 20px" }}>
                <div className="empty-state-icon" style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
                  <InboxIcon size={36} style={{ color: "var(--text-muted)" }} />
                </div>
                <div className="empty-state-title" style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                  {isStaff && stations.length === 0
                    ? "คุณยังไม่มีสถานีตรวจวัดที่รับผิดชอบ"
                    : "ไม่พบบันทึกข้อมูลตามเงื่อนไข"}
                </div>
                <div className="empty-state-desc" style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                  {isStaff && stations.length === 0
                    ? "กรุณาติดต่อผู้ดูแลระบบ (Admin) เพื่อมอบหมายสถานี"
                    : "ลองปรับเปลี่ยนสถานี ตัวกรองสถานะ หรือขยายช่วงเวลา"}
                </div>
              </div>
            ) : (
              <>
                {/* ── Desktop Audit Table (> 1024px) ── */}
                <div className="history-desktop-table-container">
                  <div style={{ overflowX: "auto" }}>
                    <table className="tactical-table">
                      <thead>
                        <tr>
                          <th style={{ width: 150 }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                              <ClockIcon size={12} />
                              <span>เวลาตรวจวัด</span>
                            </span>
                          </th>
                          <th style={{ width: 170 }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                              <RadioIcon size={12} />
                              <span>สถานี</span>
                            </span>
                          </th>
                          <th style={{ width: 140 }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                              <DropletsIcon size={12} />
                              <span>ระดับน้ำ (ม.)</span>
                            </span>
                          </th>
                          <th style={{ width: 130 }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                              <ThermometerIcon size={12} />
                              <span>อุณหภูมิ / ความชื้น</span>
                            </span>
                          </th>
                          <th style={{ width: 95 }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                              <BatteryChargingIcon size={12} />
                              <span>แบตเตอรี่</span>
                            </span>
                          </th>
                          <th style={{ width: 110 }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                              <WifiIcon size={12} />
                              <span>สัญญาณ RF</span>
                            </span>
                          </th>
                          <th style={{ width: 130 }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                              <CompassIcon size={12} />
                              <span>ความเอียงเสา</span>
                            </span>
                          </th>
                          <th style={{ width: 95 }}>สถานะ</th>
                          <th style={{ width: 44, textAlign: "center" }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredReadings.map((r, i) => {
                          const st = stations.find((s) => s.station_id === r.station_id);
                          const status = getReadingWaterStatus(r, st);
                          const isExpanded = expandedRowIds.has(r.reading_id);
                          const rowBg = i % 2 === 0 ? "transparent" : "rgba(255, 255, 255, 0.015)";

                          const isRapidRise = Boolean(
                            r.is_rate_of_rise || (r.rate_of_rise != null && r.rate_of_rise >= 0.30)
                          );
                          const rateVal = r.rate_of_rise != null ? Number(r.rate_of_rise) : null;
                          const deltaWater = (r.water_level != null && r.prev_water_level != null)
                            ? Number((r.water_level - r.prev_water_level).toFixed(3))
                            : null;

                          const tX = r.tilt_x != null ? Number(r.tilt_x) : null;
                          const tY = r.tilt_y != null ? Number(r.tilt_y) : null;
                          const relTotal = r.relative_total_tilt != null ? Number(r.relative_total_tilt) : null;
                          const isTilted = Boolean(r.is_pole_tilted || (relTotal != null && relTotal > 15));

                          const readLat = r.latitude != null ? Number(r.latitude) : null;
                          const readLng = r.longitude != null ? Number(r.longitude) : null;
                          const stLat = st?.latitude != null ? Number(st.latitude) : null;
                          const stLng = st?.longitude != null ? Number(st.longitude) : null;

                          const hasReadingGps = readLat != null && readLng != null && (readLat !== 0 || readLng !== 0);
                          const hasStationGps = stLat != null && stLng != null && (stLat !== 0 || stLng !== 0);
                          const activeLat = hasReadingGps ? readLat : (hasStationGps ? stLat : null);
                          const activeLng = hasReadingGps ? readLng : (hasStationGps ? stLng : null);

                          const driftMeters = hasReadingGps && hasStationGps
                            ? getDistanceMeters(readLat!, readLng!, stLat!, stLng!)
                            : null;

                          const isMoved = driftMeters != null && driftMeters > 15;
                          const isStationary = driftMeters != null && driftMeters <= 15;

                          const locationStatusText = isMoved
                            ? "ตรวจพบการเคลื่อนที่"
                            : isStationary
                            ? "ตำแหน่งคงที่ (ไม่เคลื่อนที่)"
                            : hasReadingGps
                            ? "พิกัดโทรมาตรสด"
                            : hasStationGps
                            ? "พิกัดติดตั้งสถานี (คงที่)"
                            : "ไม่มีข้อมูลพิกัด";

                          const locationStatusColor = isMoved
                            ? "var(--color-critical, #EF4444)"
                            : (isStationary || hasStationGps)
                            ? "var(--color-normal, #10B981)"
                            : "var(--text-muted, #94A3B8)";

                          return (
                            <React.Fragment key={r.reading_id}>
                              <tr
                                className={`tactical-table-row ${isExpanded ? "expanded" : ""}`}
                                style={{ background: rowBg }}
                                onClick={() => toggleRowExpand(r.reading_id)}
                              >
                                {/* Timestamp */}
                                <td>
                                  <span style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                                    {fmtTimestamp(r.timestamp)}
                                  </span>
                                </td>

                                {/* Station (Zero Colon) */}
                                <td>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                    <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 13 }}>
                                      {r.station_name ?? r.station_id}
                                    </span>
                                    <span
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 4,
                                        fontSize: 10,
                                        fontWeight: 700,
                                        fontFamily: "monospace",
                                        color: "var(--accent-cyan, #38bdf8)",
                                        background: "rgba(56, 189, 248, 0.08)",
                                        padding: "1px 6px",
                                        borderRadius: 4,
                                        width: "fit-content",
                                      }}
                                    >
                                      STATIC · {r.station_id}
                                    </span>
                                  </div>
                                </td>

                                {/* Water Level */}
                                <td>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                    <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                                      <span
                                        className="font-mono tabular-nums"
                                        style={{
                                          fontSize: 15,
                                          fontWeight: 700,
                                          color: r.water_level != null
                                            ? (status.status === "critical" ? "var(--color-critical, #EF4444)" : status.status === "warning" ? "var(--color-warning, #F59E0B)" : "var(--text-primary)")
                                            : "var(--text-muted)",
                                        }}
                                      >
                                        {r.water_level != null ? `${Number(r.water_level) > 0 ? "+" : ""}${Number(r.water_level).toFixed(2)}` : "—"}
                                      </span>
                                      {r.water_level != null && (
                                        <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>ม.</span>
                                      )}
                                      {r.is_blind_zone && (
                                        <span
                                          style={{
                                            fontSize: 9,
                                            fontWeight: 700,
                                            padding: "1px 5px",
                                            borderRadius: 4,
                                            background: "rgba(239, 68, 68, 0.15)",
                                            border: "1px solid rgba(239, 68, 68, 0.3)",
                                            color: "var(--color-critical, #EF4444)",
                                          }}
                                          title="ระยะห่างเซนเซอร์น้อยกว่า 28 ซม."
                                        >
                                          Blind Zone
                                        </span>
                                      )}
                                    </div>
                                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                                      {r.reference_point_name || "จุดอ้างอิง"}
                                    </span>
                                  </div>
                                </td>

                                {/* Atmosphere (Temp / Humid) */}
                                <td>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
                                    <span style={{ color: "var(--color-warning, #F59E0B)", fontWeight: 600 }}>{fmt(r.temperature, "°C", 1)}</span>
                                    <span style={{ color: "rgba(255,255,255,0.2)" }}>/</span>
                                    <span style={{ color: "var(--accent-cyan, #38bdf8)", fontWeight: 600 }}>{fmt(r.humidity, "%", 0)}</span>
                                  </div>
                                </td>

                                {/* Battery */}
                                <td>
                                  <BatteryBar pct={r.battery_percent} />
                                </td>

                                {/* LoRa RF (Zero Colon) */}
                                <td>
                                  {r.rssi != null ? (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                                        {r.rssi.toFixed(0)} dBm
                                      </span>
                                      {r.snr != null && (
                                        <span style={{ fontSize: 10, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                                          SNR {r.snr.toFixed(1)} dB
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>
                                  )}
                                </td>

                                {/* Pole Stability */}
                                <td>
                                  {tX != null && tY != null ? (
                                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                      <span
                                        style={{
                                          width: 6,
                                          height: 6,
                                          borderRadius: "50%",
                                          background: isTilted ? "var(--color-critical, #EF4444)" : "var(--color-normal, #10B981)",
                                          flexShrink: 0,
                                        }}
                                      />
                                      <span
                                        style={{
                                          fontSize: 12,
                                          fontWeight: 600,
                                          color: isTilted ? "var(--color-critical, #EF4444)" : "var(--text-primary)",
                                          fontVariantNumeric: "tabular-nums",
                                        }}
                                      >
                                        {isTilted ? "เสาเอียง" : "ปกติ"} ({relTotal != null ? `${relTotal.toFixed(1)}°` : `${tX.toFixed(1)}°`})
                                      </span>
                                    </div>
                                  ) : (
                                    <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>
                                  )}
                                </td>

                                {/* Status & Rate of Rise Badge */}
                                <td>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                                    <span
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 5,
                                        padding: "2px 8px",
                                        borderRadius: 6,
                                        background: status.bg,
                                        color: status.color,
                                        fontSize: 11,
                                        fontWeight: 700,
                                      }}
                                    >
                                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: status.dot }} />
                                      {status.label}
                                    </span>
                                    {isRapidRise && (
                                      <span
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: 4,
                                          padding: "2px 7px",
                                          borderRadius: 6,
                                          background: "rgba(244, 63, 94, 0.15)",
                                          border: "1px solid rgba(244, 63, 94, 0.35)",
                                          color: "#FB7185",
                                          fontSize: 10.5,
                                          fontWeight: 700,
                                          whiteSpace: "nowrap",
                                        }}
                                        title={`อัตราน้ำขึ้น ${rateVal != null ? `${rateVal > 0 ? "+" : ""}${rateVal.toFixed(2)}` : ""} ม./ชม. (เกณฑ์เตือนภัย ≥ 0.30 ม./ชม.)`}
                                      >
                                        <TrendingUpIcon size={12} style={{ color: "#FB7185", flexShrink: 0 }} />
                                        <span>น้ำขึ้นเร็ว {rateVal != null ? `${rateVal > 0 ? "+" : ""}${rateVal.toFixed(2)}` : ""}</span>
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Expand Chevron */}
                                <td style={{ textAlign: "center" }}>
                                  <button
                                    type="button"
                                    className="btn btn-ghost tactile-press"
                                    style={{
                                      minWidth: 38,
                                      minHeight: 38,
                                      padding: "6px 8px",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      color: "var(--text-muted)",
                                      cursor: "pointer",
                                      borderRadius: 6,
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleRowExpand(r.reading_id);
                                    }}
                                    aria-expanded={isExpanded}
                                    aria-controls={`telemetry-detail-${r.reading_id}`}
                                    aria-label={isExpanded ? "ย่อรายละเอียดเซนเซอร์" : "ขยายดูรายละเอียดเชิงลึก"}
                                  >
                                    <ChevronDownIcon
                                      size={15}
                                      style={{
                                        transform: isExpanded ? "rotate(180deg)" : "none",
                                        transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                                      }}
                                    />
                                  </button>
                                </td>
                              </tr>

                              {/* Accordion Sub-row Details (Zero Colon) */}
                              {isExpanded && (
                                <tr id={`telemetry-detail-${r.reading_id}`} className="tactical-accordion-row">
                                  <td colSpan={9} style={{ padding: 0 }}>
                                    <div className="tactical-telemetry-grid">
                                      {/* Panel 1: Hydraulics & Environment */}
                                      <div className="tactical-telemetry-card">
                                        <div className="tactical-telemetry-card-title">
                                          <DropletsIcon size={12} style={{ color: "var(--accent-cyan, #38bdf8)" }} />
                                          <span>ระบบตรวจวัดระดับน้ำและสภาพแวดล้อม</span>
                                        </div>

                                        <div className="tactical-metric-tiles">
                                          <div className="tactical-metric-tile">
                                            <span className="tactical-metric-tile-label">จุดอ้างอิงสถานี</span>
                                            <span className="tactical-metric-tile-val">{r.reference_point_name || "ระดับพื้นผิวมาตรฐาน"}</span>
                                          </div>
                                          <div className="tactical-metric-tile">
                                            <span className="tactical-metric-tile-label">ระดับน้ำคำนวณได้</span>
                                            <span className="tactical-metric-tile-val" style={{ color: status.color }}>
                                              {r.water_level != null ? `${Number(r.water_level) > 0 ? "+" : ""}${Number(r.water_level).toFixed(2)} ม.` : "—"}
                                            </span>
                                          </div>
                                          <div className="tactical-metric-tile">
                                            <span className="tactical-metric-tile-label">ระยะที่เซนเซอร์วัดได้</span>
                                            <span className="tactical-metric-tile-val">
                                              {r.raw_distance != null ? `${Number(r.raw_distance).toFixed(2)} ม.` : "—"}
                                            </span>
                                          </div>
                                          <div className="tactical-metric-tile">
                                            <span className="tactical-metric-tile-label">ระยะบอดเซนเซอร์</span>
                                            <span
                                              className="tactical-metric-tile-val"
                                              style={{ color: r.is_blind_zone ? "var(--color-critical, #EF4444)" : "var(--color-normal, #10B981)" }}
                                            >
                                              {r.is_blind_zone ? "ระยะบอด (< 28 ซม.)" : "ระยะปกติ"}
                                            </span>
                                          </div>
                                        </div>

                                        {/* Rate of Rise Subhead & Telemetry */}
                                        <div className="tactical-telemetry-subhead" style={{ marginTop: 12 }}>
                                          <TrendingUpIcon size={12} style={{ color: isRapidRise ? "#FB7185" : "var(--accent-cyan, #38bdf8)" }} />
                                          <span>วิเคราะห์อัตราการเปลี่ยนแปลงระดับน้ำ (Rate of Rise)</span>
                                        </div>

                                        <div className="tactical-metric-tiles cols-3">
                                          <div className="tactical-metric-tile">
                                            <span className="tactical-metric-tile-label">อัตราความเร็วระดับน้ำ</span>
                                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                                              <span
                                                className="tactical-metric-tile-val font-mono tabular-nums"
                                                style={{
                                                  color: isRapidRise
                                                    ? "var(--color-critical, #EF4444)"
                                                    : rateVal != null && rateVal < 0
                                                    ? "var(--accent-cyan, #38bdf8)"
                                                    : "var(--color-normal, #10B981)",
                                                  fontWeight: 700,
                                                }}
                                              >
                                                {rateVal != null ? `${rateVal > 0 ? "+" : ""}${rateVal.toFixed(2)} ม./ชม.` : "—"}
                                              </span>
                                              {isRapidRise ? (
                                                <span
                                                  style={{
                                                    fontSize: 10,
                                                    fontWeight: 700,
                                                    padding: "1px 6px",
                                                    borderRadius: 4,
                                                    background: "rgba(244, 63, 94, 0.2)",
                                                    color: "#FB7185",
                                                    border: "1px solid rgba(244, 63, 94, 0.4)",
                                                  }}
                                                >
                                                  น้ำขึ้นเร็วฉับพลัน
                                                </span>
                                              ) : rateVal != null && rateVal < 0 ? (
                                                <span
                                                  style={{
                                                    fontSize: 10,
                                                    fontWeight: 600,
                                                    padding: "1px 6px",
                                                    borderRadius: 4,
                                                    background: "rgba(56, 189, 248, 0.12)",
                                                    color: "#38bdf8",
                                                  }}
                                                >
                                                  น้ำกำลังลดลง
                                                </span>
                                              ) : rateVal != null && rateVal > 0 ? (
                                                <span
                                                  style={{
                                                    fontSize: 10,
                                                    fontWeight: 600,
                                                    padding: "1px 6px",
                                                    borderRadius: 4,
                                                    background: "rgba(16, 185, 129, 0.12)",
                                                    color: "#10b981",
                                                  }}
                                                >
                                                  อัตราปกติ
                                                </span>
                                              ) : null}
                                            </div>
                                          </div>

                                          <div className="tactical-metric-tile">
                                            <span className="tactical-metric-tile-label">การเปลี่ยนแปลงจากบันทึกก่อนหน้า</span>
                                            <span className="tactical-metric-tile-val font-mono tabular-nums">
                                              {deltaWater != null
                                                ? `${deltaWater > 0 ? "+" : ""}${deltaWater.toFixed(2)} ม. (${r.time_diff_minutes != null ? `${r.time_diff_minutes} นาที` : "—"})`
                                                : "ไม่มีข้อมูลก่อนหน้า"}
                                            </span>
                                          </div>

                                          <div className="tactical-metric-tile">
                                            <span className="tactical-metric-tile-label">เกณฑ์เตือนภัยน้ำขึ้นเร็ว</span>
                                            <span className="tactical-metric-tile-val font-mono tabular-nums" style={{ color: "var(--text-muted)" }}>
                                              ≥ +0.30 ม./ชม.
                                            </span>
                                          </div>
                                        </div>

                                        {/* Simple Calculation Formula Breakdown Box (Zero Colon, Pure SVG / Typography) */}
                                        <div
                                          style={{
                                            marginTop: 8,
                                            padding: "8px 12px",
                                            background: "rgba(255, 255, 255, 0.02)",
                                            border: "1px solid rgba(255, 255, 255, 0.06)",
                                            borderRadius: 6,
                                            fontSize: 11,
                                            color: "var(--text-secondary, #94A3B8)",
                                          }}
                                        >
                                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
                                            <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                                              สูตรคำนวณอัตราน้ำขึ้นอย่างง่าย
                                            </span>
                                            <span style={{ color: "var(--text-muted)", fontSize: 10.5 }}>
                                              คำนวณจากผลต่างระดับน้ำเทียบกับระยะเวลาที่ผ่านไป
                                            </span>
                                          </div>
                                          <div className="font-mono tabular-nums" style={{ fontSize: 11, color: "var(--accent-cyan, #38bdf8)" }}>
                                            {deltaWater != null && r.time_diff_minutes != null && r.time_diff_minutes > 0 ? (
                                              <span>
                                                อัตรา = ({deltaWater > 0 ? "+" : ""}{deltaWater.toFixed(2)} ม.) ÷ ({(r.time_diff_minutes / 60).toFixed(2)} ชม.) = {rateVal != null ? `${rateVal > 0 ? "+" : ""}${rateVal.toFixed(2)}` : "—"} ม./ชม.
                                              </span>
                                            ) : (
                                              <span>
                                                อัตรา = (ระดับน้ำปัจจุบัน - ระดับน้ำก่อนหน้า) ÷ ระยะเวลา (ชม.)
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        {/* Power & Environment Subhead */}
                                        <div className="tactical-telemetry-subhead">
                                          <BatteryChargingIcon size={12} style={{ color: "var(--color-normal, #10B981)" }} />
                                          <span>พลังงานและสภาพแวดล้อม</span>
                                        </div>

                                        <div className="tactical-metric-tiles cols-3">
                                          <div className="tactical-metric-tile">
                                            <span className="tactical-metric-tile-label">ระดับแบตเตอรี่</span>
                                            <span className="tactical-metric-tile-val">
                                              {r.battery_percent != null ? `${r.battery_percent.toFixed(0)}%` : "—"}
                                              {r.battery_voltage != null ? ` (${Number(r.battery_voltage).toFixed(2)} V)` : ""}
                                            </span>
                                          </div>
                                          <div className="tactical-metric-tile">
                                            <span className="tactical-metric-tile-label">อุณหภูมิแวดล้อม</span>
                                            <span className="tactical-metric-tile-val" style={{ color: "var(--color-warning, #F59E0B)" }}>
                                              {fmt(r.temperature, "°C", 1)}
                                            </span>
                                          </div>
                                          <div className="tactical-metric-tile">
                                            <span className="tactical-metric-tile-label">ความชื้นสัมพัทธ์</span>
                                            <span className="tactical-metric-tile-val" style={{ color: "var(--accent-cyan, #38bdf8)" }}>
                                              {fmt(r.humidity, "%", 1)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Panel 2: Node Integrity & Geolocation */}
                                      <div className="tactical-telemetry-card">
                                        <div className="tactical-telemetry-card-title">
                                          <ShieldCheckIcon size={12} style={{ color: "var(--accent-indigo, #818cf8)" }} />
                                          <span>ความสมบูรณ์ของเสาและตำแหน่งโหนด</span>
                                        </div>

                                        {/* Geolocation & Movement Drift Status */}
                                        <div className="tactical-metric-tiles">
                                          <div className="tactical-metric-tile">
                                            <span className="tactical-metric-tile-label">สถานะตำแหน่งโหนด</span>
                                            <div style={{ marginTop: 2 }}>
                                              <span
                                                style={{
                                                  display: "inline-flex",
                                                  alignItems: "center",
                                                  gap: 5,
                                                  padding: "2px 8px",
                                                  borderRadius: 6,
                                                  fontSize: 11,
                                                  fontWeight: 700,
                                                  background: isMoved ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.12)",
                                                  color: locationStatusColor,
                                                  border: `1px solid ${isMoved ? "rgba(239, 68, 68, 0.3)" : "rgba(16, 185, 129, 0.25)"}`,
                                                }}
                                              >
                                                <span style={{ width: 5, height: 5, borderRadius: "50%", background: locationStatusColor }} />
                                                {locationStatusText}
                                              </span>
                                            </div>
                                          </div>

                                          <div className="tactical-metric-tile">
                                            <span className="tactical-metric-tile-label">ระยะขยับตัว (Drift)</span>
                                            <span
                                              className="tactical-metric-tile-val"
                                              style={{ color: isMoved ? "var(--color-critical, #EF4444)" : "var(--text-primary)" }}
                                            >
                                              {driftMeters != null
                                                ? isMoved
                                                  ? `เคลื่อนย้ายไป ${driftMeters.toFixed(1)} ม.`
                                                  : `ขยับ ${driftMeters.toFixed(1)} ม. (เกณฑ์ปกติ)`
                                                : hasStationGps
                                                ? "จุดติดตั้งสถานี"
                                                : "—"}
                                            </span>
                                          </div>

                                          <div className="tactical-metric-tile col-span-2">
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                                              <span className="tactical-metric-tile-label">พิกัด GPS ตรวจวัด</span>
                                              {activeLat != null && activeLng != null && (
                                                <a
                                                  href={`https://www.google.com/maps?q=${activeLat},${activeLng}`}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="tactile-press"
                                                  style={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: 5,
                                                    padding: "2px 8px",
                                                    borderRadius: 5,
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    color: "var(--accent-cyan, #38bdf8)",
                                                    background: "rgba(56, 189, 248, 0.08)",
                                                    border: "1px solid rgba(56, 189, 248, 0.22)",
                                                    textDecoration: "none",
                                                  }}
                                                  title="เปิดพิกัดจริงบนแผนที่ Google Maps"
                                                >
                                                  <MapPinIcon size={11} />
                                                  <span>เปิดดูบนแผนที่</span>
                                                  <ExternalLinkIcon size={10} style={{ opacity: 0.7 }} />
                                                </a>
                                              )}
                                            </div>
                                            <span className="tactical-metric-tile-val" style={{ fontSize: 12.5, marginTop: 2 }}>
                                              {activeLat != null && activeLng != null
                                                ? `${activeLat.toFixed(6)}° N, ${activeLng.toFixed(6)}° E`
                                                : "—"}
                                            </span>
                                          </div>
                                        </div>

                                        {/* Stability & Network Subhead */}
                                        <div className="tactical-telemetry-subhead">
                                          <RadioIcon size={12} style={{ color: "var(--accent-indigo, #818cf8)" }} />
                                          <span>ความนิ่งของเสาและเครือข่าย</span>
                                        </div>

                                        <div className="tactical-metric-tiles cols-3">
                                          <div className="tactical-metric-tile">
                                            <span className="tactical-metric-tile-label">มุมเอียง (X / Y)</span>
                                            <span className="tactical-metric-tile-val">
                                              {tX != null && tY != null ? `${tX.toFixed(1)}° / ${tY.toFixed(1)}°` : "—"}
                                            </span>
                                          </div>
                                          <div className="tactical-metric-tile">
                                            <span className="tactical-metric-tile-label">ความเอียงสัมพัทธ์</span>
                                            <span
                                              className="tactical-metric-tile-val"
                                              style={{ color: isTilted ? "var(--color-critical, #EF4444)" : "var(--text-primary)" }}
                                            >
                                              {relTotal != null ? `${relTotal.toFixed(1)}°` : "—"}
                                              {isTilted ? " (เสาเอียง)" : " (ปกติ)"}
                                            </span>
                                          </div>
                                          <div className="tactical-metric-tile">
                                            <span className="tactical-metric-tile-label">สัญญาณ LoRa</span>
                                            <span className="tactical-metric-tile-val">
                                              {r.rssi != null ? `${r.rssi.toFixed(0)} dBm` : "—"}
                                              {r.snr != null ? ` · SNR ${r.snr.toFixed(1)} dB` : ""}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ── Mobile Responsive Data Cards (<= 1024px, Zero Colon) ── */}
                <div className="history-mobile-cards-container" style={{ padding: "14px" }}>
                  {filteredReadings.map((r) => {
                    const st = stations.find((s) => s.station_id === r.station_id);
                    const status = getReadingWaterStatus(r, st);
                    const isExpanded = expandedRowIds.has(r.reading_id);

                    const isRapidRise = Boolean(
                      r.is_rate_of_rise || (r.rate_of_rise != null && r.rate_of_rise >= 0.30)
                    );
                    const rateVal = r.rate_of_rise != null ? Number(r.rate_of_rise) : null;
                    const deltaWater = (r.water_level != null && r.prev_water_level != null)
                      ? Number((r.water_level - r.prev_water_level).toFixed(3))
                      : null;

                    const tX = r.tilt_x != null ? Number(r.tilt_x) : null;
                    const tY = r.tilt_y != null ? Number(r.tilt_y) : null;
                    const relTotal = r.relative_total_tilt != null ? Number(r.relative_total_tilt) : null;
                    const isTilted = Boolean(r.is_pole_tilted || (relTotal != null && relTotal > 15));

                    const readLat = r.latitude != null ? Number(r.latitude) : null;
                    const readLng = r.longitude != null ? Number(r.longitude) : null;
                    const stLat = st?.latitude != null ? Number(st.latitude) : null;
                    const stLng = st?.longitude != null ? Number(st.longitude) : null;

                    const hasReadingGps = readLat != null && readLng != null && (readLat !== 0 || readLng !== 0);
                    const hasStationGps = stLat != null && stLng != null && (stLat !== 0 || stLng !== 0);
                    const activeLat = hasReadingGps ? readLat : (hasStationGps ? stLat : null);
                    const activeLng = hasReadingGps ? readLng : (hasStationGps ? stLng : null);

                    const driftMeters = hasReadingGps && hasStationGps
                      ? getDistanceMeters(readLat!, readLng!, stLat!, stLng!)
                      : null;

                    const isMoved = driftMeters != null && driftMeters > 15;
                    const isStationary = driftMeters != null && driftMeters <= 15;

                    const locationStatusText = isMoved
                      ? "ตรวจพบการเคลื่อนที่"
                      : isStationary
                      ? "ตำแหน่งคงที่ (ไม่เคลื่อนที่)"
                      : hasReadingGps
                      ? "พิกัดโทรมาตรสด"
                      : hasStationGps
                      ? "พิกัดติดตั้งสถานี (คงที่)"
                      : "ไม่มีข้อมูลพิกัด";

                    const locationStatusColor = isMoved
                      ? "var(--color-critical, #EF4444)"
                      : (isStationary || hasStationGps)
                      ? "var(--color-normal, #10B981)"
                      : "var(--text-muted, #94A3B8)";

                    return (
                      <div
                        key={r.reading_id}
                        className={`tactical-mobile-card ${isExpanded ? "expanded" : ""}`}
                      >
                        {/* Card Header: Timestamp & Status */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
                          <span style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                            {fmtTimestamp(r.timestamp)}
                          </span>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {isRapidRise && (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  padding: "2px 7px",
                                  borderRadius: 6,
                                  background: "rgba(244, 63, 94, 0.15)",
                                  border: "1px solid rgba(244, 63, 94, 0.35)",
                                  color: "#FB7185",
                                  fontSize: 10.5,
                                  fontWeight: 700,
                                }}
                              >
                                <TrendingUpIcon size={12} style={{ color: "#FB7185", flexShrink: 0 }} />
                                <span>น้ำขึ้นเร็ว {rateVal != null ? `${rateVal > 0 ? "+" : ""}${rateVal.toFixed(2)}` : ""}</span>
                              </span>
                            )}
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 5,
                                padding: "2px 8px",
                                borderRadius: 6,
                                background: status.bg,
                                color: status.color,
                                fontSize: 11,
                                fontWeight: 700,
                              }}
                            >
                              <span style={{ width: 5, height: 5, borderRadius: "50%", background: status.dot }} />
                              {status.label}
                            </span>
                          </div>
                        </div>

                        {/* Station Name & ID (Zero Colon) */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
                            {r.station_name ?? r.station_id}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              fontFamily: "monospace",
                              fontWeight: 700,
                              color: "var(--accent-cyan, #38bdf8)",
                              background: "rgba(56, 189, 248, 0.08)",
                              padding: "2px 6px",
                              borderRadius: 4,
                            }}
                          >
                            STATIC · {r.station_id}
                          </span>
                        </div>

                        {/* Core Metrics Strip */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(3, 1fr)",
                            gap: 8,
                            padding: "10px",
                            background: "rgba(255, 255, 255, 0.03)",
                            border: "1px solid rgba(255, 255, 255, 0.05)",
                            borderRadius: 8,
                            marginBottom: 10,
                          }}
                        >
                          <div>
                            <span style={{ fontSize: 10, color: "var(--text-muted)", display: "block" }}>ระดับน้ำ</span>
                            <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                              <span
                                className="font-mono tabular-nums"
                                style={{
                                  fontSize: 15,
                                  fontWeight: 700,
                                  color: r.water_level != null ? status.color : "var(--text-muted)",
                                }}
                              >
                                {r.water_level != null ? `${Number(r.water_level) > 0 ? "+" : ""}${Number(r.water_level).toFixed(2)}` : "—"}
                              </span>
                              {r.water_level != null && (
                                <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 500 }}>ม.</span>
                              )}
                            </div>
                          </div>

                          <div>
                            <span style={{ fontSize: 10, color: "var(--text-muted)", display: "block" }}>แบตเตอรี่</span>
                            <BatteryBar pct={r.battery_percent} />
                          </div>

                          <div>
                            <span style={{ fontSize: 10, color: "var(--text-muted)", display: "block" }}>สัญญาณ LoRa</span>
                            <span className="font-mono tabular-nums" style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
                              {r.rssi != null ? `${r.rssi.toFixed(0)} dBm` : "—"}
                            </span>
                          </div>
                        </div>

                        {/* Accordion Toggle Action */}
                        <button
                          type="button"
                          className="btn btn-ghost tactile-press"
                          onClick={() => toggleRowExpand(r.reading_id)}
                          aria-expanded={isExpanded}
                          aria-controls={`mobile-telemetry-detail-${r.reading_id}`}
                          aria-label={isExpanded ? "ซ่อนข้อมูลเซนเซอร์เชิงลึก" : "ดูข้อมูลเซนเซอร์เชิงลึก"}
                          style={{
                            width: "100%",
                            minHeight: 44,
                            justifyContent: "space-between",
                            fontSize: 12,
                            padding: "10px 14px",
                            borderRadius: 8,
                            color: "var(--text-secondary)",
                            background: "rgba(255, 255, 255, 0.03)",
                          }}
                        >
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <CpuIcon size={14} style={{ color: "var(--accent-cyan, #38bdf8)" }} />
                            <span>{isExpanded ? "ซ่อนข้อมูลเซนเซอร์เชิงลึก" : "ดูข้อมูลเซนเซอร์เชิงลึก"}</span>
                          </span>
                          <ChevronDownIcon
                            size={15}
                            style={{
                              transform: isExpanded ? "rotate(180deg)" : "none",
                              transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                            }}
                          />
                        </button>

                        {/* Expanded Mobile Telemetry (Zero Colon) */}
                        {isExpanded && (
                          <div
                            id={`mobile-telemetry-detail-${r.reading_id}`}
                            style={{
                              marginTop: 10,
                              paddingTop: 10,
                              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                              display: "flex",
                              flexDirection: "column",
                              gap: 10,
                            }}
                          >
                            {/* Mobile Panel 1: Hydraulics & Environment */}
                            <div className="tactical-telemetry-card">
                              <div className="tactical-telemetry-card-title">
                                <DropletsIcon size={12} style={{ color: "var(--accent-cyan, #38bdf8)" }} />
                                <span>ระบบตรวจวัดระดับน้ำและสภาพแวดล้อม</span>
                              </div>

                              <div className="tactical-metric-tiles">
                                <div className="tactical-metric-tile">
                                  <span className="tactical-metric-tile-label">ระยะที่วัดได้</span>
                                  <span className="tactical-metric-tile-val">{r.raw_distance != null ? `${Number(r.raw_distance).toFixed(2)} ม.` : "—"}</span>
                                </div>
                                <div className="tactical-metric-tile">
                                  <span className="tactical-metric-tile-label">จุดบอดเซนเซอร์</span>
                                  <span className="tactical-metric-tile-val" style={{ color: r.is_blind_zone ? "var(--color-critical, #EF4444)" : "var(--color-normal, #10B981)" }}>
                                    {r.is_blind_zone ? "จุดบอด" : "ปกติ"}
                                  </span>
                                </div>
                              </div>

                              {/* Mobile Rate of Rise Subhead & Telemetry */}
                              <div className="tactical-telemetry-subhead" style={{ marginTop: 10 }}>
                                <TrendingUpIcon size={12} style={{ color: isRapidRise ? "#FB7185" : "var(--accent-cyan, #38bdf8)" }} />
                                <span>วิเคราะห์อัตราการเปลี่ยนแปลงระดับน้ำ</span>
                              </div>

                              <div className="tactical-metric-tiles cols-3">
                                <div className="tactical-metric-tile">
                                  <span className="tactical-metric-tile-label">ความเร็วระดับน้ำ</span>
                                  <span
                                    className="tactical-metric-tile-val font-mono tabular-nums"
                                    style={{
                                      color: isRapidRise
                                        ? "var(--color-critical, #EF4444)"
                                        : rateVal != null && rateVal < 0
                                        ? "var(--accent-cyan, #38bdf8)"
                                        : "var(--color-normal, #10B981)",
                                      fontSize: 12.5,
                                      fontWeight: 700,
                                    }}
                                  >
                                    {rateVal != null ? `${rateVal > 0 ? "+" : ""}${rateVal.toFixed(2)} ม./ชม.` : "—"}
                                  </span>
                                </div>
                                <div className="tactical-metric-tile">
                                  <span className="tactical-metric-tile-label">เทียบก่อนหน้า</span>
                                  <span className="tactical-metric-tile-val font-mono tabular-nums" style={{ fontSize: 12.5 }}>
                                    {deltaWater != null
                                      ? `${deltaWater > 0 ? "+" : ""}${deltaWater.toFixed(2)} ม.`
                                      : "—"}
                                  </span>
                                </div>
                                <div className="tactical-metric-tile">
                                  <span className="tactical-metric-tile-label">เกณฑ์เตือนภัย</span>
                                  <span className="tactical-metric-tile-val font-mono tabular-nums" style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                                    ≥ 0.30 ม./ชม.
                                  </span>
                                </div>
                              </div>

                              {/* Mobile Simple Calculation Breakdown Box (Zero Colon, Pure SVG / Typography) */}
                              <div
                                style={{
                                  marginTop: 6,
                                  padding: "7px 10px",
                                  background: "rgba(255, 255, 255, 0.02)",
                                  border: "1px solid rgba(255, 255, 255, 0.06)",
                                  borderRadius: 6,
                                  fontSize: 10.5,
                                  color: "var(--text-secondary, #94A3B8)",
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                                    สูตรคำนวณอัตราน้ำขึ้นอย่างง่าย
                                  </span>
                                  {isRapidRise && (
                                    <span style={{ color: "#FB7185", fontWeight: 700 }}>
                                      น้ำขึ้นเร็ว
                                    </span>
                                  )}
                                </div>
                                <div className="font-mono tabular-nums" style={{ color: "var(--accent-cyan, #38bdf8)" }}>
                                  {deltaWater != null && r.time_diff_minutes != null && r.time_diff_minutes > 0 ? (
                                    <span>
                                      ({deltaWater > 0 ? "+" : ""}{deltaWater.toFixed(2)} ม.) ÷ ({(r.time_diff_minutes / 60).toFixed(2)} ชม.) = {rateVal != null ? `${rateVal > 0 ? "+" : ""}${rateVal.toFixed(2)}` : "—"} ม./ชม.
                                    </span>
                                  ) : (
                                    <span>
                                      อัตรา = ผลต่างระดับน้ำ (ม.) ÷ เวลา (ชม.)
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="tactical-telemetry-subhead">
                                <BatteryChargingIcon size={12} style={{ color: "var(--color-normal, #10B981)" }} />
                                <span>พลังงานและสภาพแวดล้อม</span>
                              </div>

                              <div className="tactical-metric-tiles cols-3">
                                <div className="tactical-metric-tile">
                                  <span className="tactical-metric-tile-label">แรงดันแบตฯ</span>
                                  <span className="tactical-metric-tile-val">{r.battery_voltage != null ? `${Number(r.battery_voltage).toFixed(2)} V` : "—"}</span>
                                </div>
                                <div className="tactical-metric-tile">
                                  <span className="tactical-metric-tile-label">อุณหภูมิ</span>
                                  <span className="tactical-metric-tile-val">{fmt(r.temperature, "°C", 1)}</span>
                                </div>
                                <div className="tactical-metric-tile">
                                  <span className="tactical-metric-tile-label">ความชื้น</span>
                                  <span className="tactical-metric-tile-val">{fmt(r.humidity, "%", 0)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Mobile Panel 2: Node Integrity & Geolocation */}
                            <div className="tactical-telemetry-card">
                              <div className="tactical-telemetry-card-title">
                                <ShieldCheckIcon size={12} style={{ color: "var(--accent-indigo, #818cf8)" }} />
                                <span>ความสมบูรณ์ของเสาและตำแหน่งโหนด</span>
                              </div>

                              <div className="tactical-metric-tiles">
                                <div className="tactical-metric-tile">
                                  <span className="tactical-metric-tile-label">สถานะตำแหน่งโหนด</span>
                                  <div style={{ marginTop: 2 }}>
                                    <span
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 5,
                                        padding: "2px 7px",
                                        borderRadius: 5,
                                        fontSize: 11,
                                        fontWeight: 700,
                                        background: isMoved ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.12)",
                                        color: locationStatusColor,
                                        border: `1px solid ${isMoved ? "rgba(239, 68, 68, 0.3)" : "rgba(16, 185, 129, 0.25)"}`,
                                      }}
                                    >
                                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: locationStatusColor }} />
                                      {locationStatusText}
                                    </span>
                                  </div>
                                </div>

                                <div className="tactical-metric-tile">
                                  <span className="tactical-metric-tile-label">ระยะขยับตัว (Drift)</span>
                                  <span
                                    className="tactical-metric-tile-val"
                                    style={{ color: isMoved ? "var(--color-critical, #EF4444)" : "var(--text-primary)" }}
                                  >
                                    {driftMeters != null
                                      ? isMoved
                                        ? `ย้าย ${driftMeters.toFixed(1)} ม.`
                                        : `ขยับ ${driftMeters.toFixed(1)} ม.`
                                      : hasStationGps
                                      ? "จุดติดตั้งสถานี"
                                      : "—"}
                                  </span>
                                </div>

                                <div className="tactical-metric-tile col-span-2">
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                                    <span className="tactical-metric-tile-label">พิกัด GPS</span>
                                    {activeLat != null && activeLng != null && (
                                      <a
                                        href={`https://www.google.com/maps?q=${activeLat},${activeLng}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="tactile-press"
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: 4,
                                          padding: "3px 8px",
                                          borderRadius: 5,
                                          fontSize: 11,
                                          fontWeight: 600,
                                          color: "var(--accent-cyan, #38bdf8)",
                                          background: "rgba(56, 189, 248, 0.08)",
                                          border: "1px solid rgba(56, 189, 248, 0.22)",
                                          textDecoration: "none",
                                          minHeight: 28,
                                        }}
                                        title="เปิดพิกัดจริงบนแผนที่ Google Maps"
                                      >
                                        <MapPinIcon size={11} />
                                        <span>เปิดดูบนแผนที่</span>
                                        <ExternalLinkIcon size={10} style={{ opacity: 0.7 }} />
                                      </a>
                                    )}
                                  </div>
                                  <span className="tactical-metric-tile-val" style={{ fontSize: 11.5, marginTop: 2 }}>
                                    {activeLat != null && activeLng != null
                                      ? `${activeLat.toFixed(5)}°, ${activeLng.toFixed(5)}°`
                                      : "—"}
                                  </span>
                                </div>
                              </div>

                              <div className="tactical-telemetry-subhead">
                                <RadioIcon size={12} style={{ color: "var(--accent-indigo, #818cf8)" }} />
                                <span>ความนิ่งของเสาและเครือข่าย</span>
                              </div>

                              <div className="tactical-metric-tiles cols-3">
                                <div className="tactical-metric-tile">
                                  <span className="tactical-metric-tile-label">มุมเอียง (X/Y)</span>
                                  <span className="tactical-metric-tile-val">
                                    {tX != null && tY != null ? `${tX.toFixed(1)}° / ${tY.toFixed(1)}°` : "—"}
                                  </span>
                                </div>
                                <div className="tactical-metric-tile">
                                  <span className="tactical-metric-tile-label">เอียงสุทธิ</span>
                                  <span
                                    className="tactical-metric-tile-val"
                                    style={{ color: isTilted ? "var(--color-critical, #EF4444)" : "var(--text-primary)" }}
                                  >
                                    {relTotal != null ? `${relTotal.toFixed(1)}°` : "—"}
                                    {isTilted ? " (เอียง)" : " (ปกติ)"}
                                  </span>
                                </div>
                                <div className="tactical-metric-tile">
                                  <span className="tactical-metric-tile-label">สัญญาณ LoRa</span>
                                  <span className="tactical-metric-tile-val">
                                    {r.rssi != null ? `${r.rssi.toFixed(0)} dBm` : "—"}
                                    {r.snr != null ? ` · SNR ${r.snr.toFixed(1)} dB` : ""}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        ) : (
          /* View Mode 2: Tactical Line Chart (ZERO-GLOW) */
          <div style={{ padding: "18px" }}>
            <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                แนวโน้มระดับน้ำย้อนหลัง ({chartData.length} จุดข้อมูล)
              </span>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                หน่วย เมตร (m)
              </span>
            </div>
            <div style={{ height: 320, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="tacticalWaterFlat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                  <XAxis
                    dataKey="time"
                    minTickGap={75}
                    interval="preserveStartEnd"
                    tick={{ fill: "var(--text-muted, #94A3B8)", fontSize: 11 }}
                    axisLine={{ stroke: "rgba(255, 255, 255, 0.1)" }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="var(--text-muted)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(255, 255, 255, 0.1)" }}
                    domain={["dataMin - 0.2", "dataMax + 0.2"]}
                    tickFormatter={(v) => `${Number(v).toFixed(2)}`}
                  />
                  <Tooltip content={<HistoryChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="water_level"
                    stroke="#0284c7"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#tacticalWaterFlat)"
                    name="ระดับน้ำ (ม.)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tactical Streamlined Pagination Strip (Option A) */}
        <div className="tactical-pagination-strip">
          <div className="tactical-page-controls">
            <button
              type="button"
              className="tactical-page-btn tactile-press"
              disabled={page === 0 || loading}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              title="หน้าก่อนหน้า"
              aria-label="หน้าก่อนหน้า"
            >
              <ChevronLeftIcon size={14} />
            </button>

            <div className="tactical-page-indicator">
              <span className="page-label">หน้า</span>
              <span className="page-num-cur">{totalPages === 0 ? 0 : page + 1}</span>
              <span className="page-sep">/</span>
              <span className="page-num-total">{totalPages}</span>
            </div>

            <button
              type="button"
              className="tactical-page-btn tactile-press"
              disabled={page >= totalPages - 1 || loading}
              onClick={() => setPage((p) => p + 1)}
              title="หน้าถัดไป"
              aria-label="หน้าถัดไป"
            >
              <ChevronRightIcon size={14} />
            </button>
          </div>

          {/* Tactical Page Size Selector */}
          <div className="tactical-page-size-wrap">
            <span className="tactical-page-size-label">แสดงต่อหน้า</span>
            <div className="tactical-btn-group" role="group" aria-label="เลือกจำนวนรายการต่อหน้า">
              {[50, 100, 200].map((sz, idx) => (
                <React.Fragment key={sz}>
                  {idx > 0 && <div className="tactical-btn-divider" />}
                  <button
                    type="button"
                    onClick={() => handlePageSizeChange(sz)}
                    className={`tactical-btn-item tactile-press ${pageSize === sz ? "active" : ""}`}
                    style={{ minWidth: 38, padding: "4px 10px", fontSize: 12 }}
                    aria-pressed={pageSize === sz}
                  >
                    {sz}
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>

          <span className="tactical-page-meta">
            รวม {total.toLocaleString()} รายการ
          </span>
        </div>
      </div>

      {/* ══ TACTICAL EXPORT SCOPE MODAL ══ */}
      {isExportModalOpen && (
        <div className="export-modal-backdrop" onClick={() => !exportLoading && setIsExportModalOpen(false)}>
          <div
            ref={modalPanelRef}
            className="export-modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 id="export-modal-title" style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                ส่งออก CSV
              </h3>
              <button
                type="button"
                className="btn btn-ghost tactile-press"
                style={{
                  width: 40,
                  height: 40,
                  minWidth: 40,
                  minHeight: 40,
                  padding: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-muted)",
                  borderRadius: 8,
                }}
                onClick={() => !exportLoading && setIsExportModalOpen(false)}
                disabled={exportLoading}
                aria-label="ปิดหน้าต่างส่งออก CSV"
              >
                <XIcon size={18} />
              </button>
            </div>

            {/* Body: Options */}
            <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Option 1: All Filtered */}
              <div
                className={`export-option-card tactile-press ${exportScope === "all_filtered" ? "selected" : ""}`}
                onClick={() => setExportScope("all_filtered")}
              >
                <input
                  type="radio"
                  id="export-scope-all"
                  name="exportScope"
                  checked={exportScope === "all_filtered"}
                  onChange={() => setExportScope("all_filtered")}
                />
                <label htmlFor="export-scope-all" style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                    ข้อมูลทั้งหมดตามตัวกรอง
                  </span>
                  <span style={{ color: "var(--accent-cyan, #38bdf8)", fontVariantNumeric: "tabular-nums", fontSize: 12 }}>
                    {total.toLocaleString()} รายการ
                  </span>
                </label>
              </div>

              {/* Option 2: Current Page Only */}
              <div
                className={`export-option-card tactile-press ${exportScope === "current_page" ? "selected" : ""}`}
                onClick={() => setExportScope("current_page")}
              >
                <input
                  type="radio"
                  id="export-scope-page"
                  name="exportScope"
                  checked={exportScope === "current_page"}
                  onChange={() => setExportScope("current_page")}
                />
                <label htmlFor="export-scope-page" style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                    เฉพาะข้อมูลในหน้านี้
                  </span>
                  <span style={{ color: "var(--text-muted)", fontVariantNumeric: "tabular-nums", fontSize: 12 }}>
                    {filteredReadings.length} รายการ
                  </span>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: "12px 18px", background: "var(--card-surface, #0C0E12)", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm tactile-press"
                onClick={() => setIsExportModalOpen(false)}
                disabled={exportLoading}
                style={{ fontSize: 12, borderRadius: 8, minHeight: 38, padding: "8px 16px" }}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm tactile-press"
                onClick={handleConfirmExport}
                disabled={exportLoading || (exportScope === "current_page" ? filteredReadings.length === 0 : total === 0)}
                style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 8, minHeight: 38, padding: "8px 16px" }}
              >
                {exportLoading ? (
                  <>
                    <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
                    <span>กำลังดึงข้อมูล...</span>
                  </>
                ) : (
                  <span>ดาวน์โหลด CSV</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
