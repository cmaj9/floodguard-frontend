import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
  ActivityIcon,
} from "../components/ui/Icons";
import Papa from "papaparse";
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

const PAGE_SIZE = 50;
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

function getReadingWaterStatus(
  r: Reading,
  station?: StationWithReading
): { status: WaterStatus; label: string; color: string; bg: string; dot: string } {
  if (r.water_level == null) {
    return { status: "unknown", label: "ไม่มีข้อมูล", color: "#6ba3c4", bg: "rgba(107,163,196,0.12)", dot: "#6ba3c4" };
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
    return { status: "critical", label: "วิกฤต", color: "#EF4444", bg: "rgba(239, 68, 68, 0.15)", dot: "#EF4444" };
  }
  if (s === "warning") {
    return { status: "warning", label: "เฝ้าระวัง", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.15)", dot: "#F59E0B" };
  }
  return { status: "normal", label: "ปกติ", color: "#10B981", bg: "rgba(16, 185, 129, 0.15)", dot: "#10B981" };
}

function BatteryBar({ pct }: { pct: number | null }) {
  if (pct == null) return <span style={{ color: "#6ba3c4", fontSize: 12 }}>—</span>;
  const color = pct > 50 ? "#10B981" : pct > 20 ? "#F59E0B" : "#EF4444";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color, fontVariantNumeric: "tabular-nums" }}>
        {pct.toFixed(0)}%
      </span>
      <div style={{ width: 44, height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
        <div
          style={{
            width: `${Math.min(100, Math.max(0, pct))}%`,
            height: "100%",
            background: color,
            borderRadius: 2,
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}

type TimePreset = "all" | "24h" | "7d" | "30d" | "custom";
type StatusFilterType = "all" | "normal" | "warning" | "critical" | "anomaly";
type HistoryViewMode = "table" | "chart";

export default function DataHistoryPage() {
  const { user, isGuest } = useAuth();
  const canExport = !isGuest && (user?.role === "admin" || user?.role === "staff");

  const [readings, setReadings] = useState<Reading[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [isExported, setIsExported] = useState(false);

  const [stations, setStations] = useState<StationWithReading[]>([]);
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

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
        setErrorMsg(err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูลทั้งหมดสำหรับส่งออกได้");
      } finally {
        setExportLoading(false);
      }
    }
  };

  const handleExportCSV = () => {
    if (total === 0 || loading) return;
    setIsExportModalOpen(true);
  };

  // ── Handle Preset Switching ───────────────────────────────────
  const handleTimePresetChange = (preset: TimePreset) => {
    setTimePreset(preset);
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

  useEffect(() => {
    const load = () => { fetchStations().then(setStations).catch(() => {}); };
    load();
    window.addEventListener("app:refresh", load);
    return () => {
      window.removeEventListener("app:refresh", load);
    };
  }, []);

  const loadReadings = useCallback(async (p: number, silent = false) => {
    if (!silent) setLoading(true);
    setErrorMsg("");
    try {
      const params: Record<string, string | number> = { limit: PAGE_SIZE, offset: p * PAGE_SIZE };
      if (filterStation) params.stationId = filterStation;
      if (filterStart)   params.start     = new Date(filterStart).toISOString();
      if (filterEnd)     params.end       = new Date(filterEnd).toISOString();
      const result = await fetchReadingsHistory(params);
      setReadings(result.data);
      setTotal(result.total);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "ไม่สามารถโหลดข้อมูลได้");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [filterStation, filterStart, filterEnd]);

  useEffect(() => { setPage(0); loadReadings(0); }, [filterStation, filterStart, filterEnd]); // eslint-disable-line
  useEffect(() => { loadReadings(page); }, [page]); // eslint-disable-line

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => loadReadings(page, true), REFRESH_INTERVAL_MS);
    const handleGlobalRefresh = () => {
      loadReadings(page);
    };
    window.addEventListener("app:refresh", handleGlobalRefresh);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      window.removeEventListener("app:refresh", handleGlobalRefresh);
    };
  }, [loadReadings, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ── Station dropdown options (Zero Colon) ───────────────────────────────────
  const stationDropdownOptions: DropdownOption[] = useMemo(() => {
    const rawIds = user?.stationIds || (user as any)?.station_ids || [];
    const userStationIds = (Array.isArray(rawIds) ? rawIds : []).map((id: string) =>
      String(id).trim().toUpperCase()
    );
    const isCitizen = !isGuest && user?.role === "citizen" && user?.id !== "citizen_guest";
    const isStaff = !isGuest && user?.role === "staff";

    const opts: DropdownOption[] = [
      {
        value: "",
        label: `ทุกสถานี (${stations.length} สถานี)`,
        sublabel: "ดึงข้อมูลจากทุกสถานีตรวจวัดในระบบ",
        count: total,
      },
    ];
    stations.forEach((s) => {
      const isUserStation = userStationIds.includes(s.station_id.toUpperCase());
      const sublabel = isUserStation
        ? `${s.location_name ? s.location_name + " · " : ""}${isCitizen ? "สถานีที่ติดตาม" : isStaff ? "สถานีที่รับผิดชอบ" : ""}`
        : (s.location_name || undefined);

      opts.push({
        value: s.station_id,
        label: `${s.station_id} · ${s.station_name}`,
        sublabel,
        statusDotColor:
          s.water_status === "critical"
            ? "#EF4444"
            : s.water_status === "warning"
            ? "#F59E0B"
            : "#10B981",
        badge: s.water_level != null ? `${Number(s.water_level).toFixed(2)}m` : undefined,
      });
    });
    return opts;
  }, [stations, total, user, isGuest]);

  // ── Filter and Counts for Quick Status Tabs ─────────────────────────────
  const { filteredReadings, statusCounts } = useMemo(() => {
    let normalCount = 0;
    let warningCount = 0;
    let criticalCount = 0;
    let anomalyCount = 0;

    readings.forEach((r) => {
      const st = stations.find((s) => s.station_id === r.station_id);
      const s = getReadingWaterStatus(r, st);
      if (s.status === "normal") normalCount++;
      if (s.status === "warning") warningCount++;
      if (s.status === "critical") criticalCount++;

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
    return [...filteredReadings]
      .reverse()
      .map((r) => ({
        time: new Date(r.timestamp).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
        water_level: r.water_level,
        temperature: r.temperature,
        humidity: r.humidity,
        station: r.station_name || r.station_id,
      }));
  }, [filteredReadings]);

  return (
    <div className="page-container" style={{ paddingBottom: 60 }}>
      {/* ══ 1. CONNECTED TACTICAL CONTROL BAR (ZERO-GLOW & ZERO-COLON) ════════ */}
      <div className="history-toolbar-tactical">
        {/* Left: Station Selector & Reset Button */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <CompactFilterDropdown
            options={stationDropdownOptions}
            value={filterStation}
            onChange={(val) => setFilterStation(val)}
            placeholder="เลือกสถานีตรวจวัด..."
            width={240}
            variant="tactical"
          />

          {(filterStation || filterStart || filterEnd || statusFilter !== "all") && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setFilterStation("");
                setTimePreset("all");
                setFilterStart("");
                setFilterEnd("");
                setStatusFilter("all");
              }}
              style={{
                fontSize: 12,
                padding: "6px 10px",
                borderRadius: 8,
                color: "var(--color-critical)",
                gap: 4,
                border: "1px solid rgba(239, 68, 68, 0.2)",
                background: "rgba(239, 68, 68, 0.05)",
              }}
              title="ล้างการตั้งค่าตัวกรองทั้งหมด"
            >
              <XIcon size={13} />
              <span>ล้างตัวกรอง</span>
            </button>
          )}
        </div>

        {/* Center: Connected Tactical Button Group for Time Presets */}
        <div className="tactical-btn-group" role="tablist" aria-label="ช่วงเวลาของประวัติข้อมูล">
          {timePresetOptions.map((opt, idx) => (
            <React.Fragment key={opt.value}>
              {idx > 0 && <div className="tactical-btn-divider" />}
              <button
                type="button"
                role="tab"
                aria-selected={timePreset === opt.value}
                className={`tactical-btn-item ${timePreset === opt.value ? "active" : ""}`}
                onClick={() => handleTimePresetChange(opt.value)}
              >
                {opt.label}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Right: Connected Tactical Button Group for View Mode & CSV Export */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div className="tactical-btn-group" role="tablist" aria-label="สลับมุมมองตารางหรือกราฟ">
            {viewModeOptions.map((opt, idx) => (
              <React.Fragment key={opt.value}>
                {idx > 0 && <div className="tactical-btn-divider" />}
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === opt.value}
                  className={`tactical-btn-item ${viewMode === opt.value ? "active" : ""}`}
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
              type="button"
              onClick={handleExportCSV}
              disabled={readings.length === 0 || loading}
              className={`csv-flight-button ${isExported ? "success" : ""}`}
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
            background: "rgba(15, 23, 42, 0.75)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 8,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 12, color: "#38bdf8", fontWeight: 600 }}>กำหนดช่วงวันเวลา</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>ตั้งแต่</span>
            <input
              type="datetime-local"
              className="input"
              value={filterStart}
              onChange={(e) => setFilterStart(e.target.value)}
              style={{ fontSize: 12, padding: "4px 8px", width: "auto" }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>ถึง</span>
            <input
              type="datetime-local"
              className="input"
              value={filterEnd}
              onChange={(e) => setFilterEnd(e.target.value)}
              style={{ fontSize: 12, padding: "4px 8px", width: "auto" }}
            />
          </div>
        </div>
      )}

      {/* ══ 2. 4-COLUMN INDEPENDENT KPI METRIC CARDS ══ */}
      <div className="history-kpi-grid">
        <div className="history-kpi-card">
          <div className="history-kpi-card-left">
            <BarChart3Icon size={15} style={{ color: "#38bdf8" }} />
            <span className="history-kpi-card-title">บันทึกในระบบ</span>
          </div>
          <span className="history-kpi-card-val" style={{ color: "var(--text-primary)" }}>
            {total.toLocaleString()} รายการ
          </span>
        </div>

        <div className="history-kpi-card">
          <div className="history-kpi-card-left">
            <TrendingUpIcon size={15} style={{ color: "#EF4444" }} />
            <span className="history-kpi-card-title">ระดับสูงสุด</span>
          </div>
          <span className="history-kpi-card-val" style={{ color: "#EF4444" }}>
            {stats.maxLevel != null ? `${stats.maxLevel > 0 ? "+" : ""}${stats.maxLevel.toFixed(2)} ม.` : "—"}
          </span>
        </div>

        <div className="history-kpi-card">
          <div className="history-kpi-card-left">
            <TrendingDownIcon size={15} style={{ color: "#10B981" }} />
            <span className="history-kpi-card-title">ระดับต่ำสุด</span>
          </div>
          <span className="history-kpi-card-val" style={{ color: "#10B981" }}>
            {stats.minLevel != null ? `${stats.minLevel > 0 ? "+" : ""}${stats.minLevel.toFixed(2)} ม.` : "—"}
          </span>
        </div>

        <div className="history-kpi-card">
          <div className="history-kpi-card-left">
            <DropletsIcon size={15} style={{ color: "#818cf8" }} />
            <span className="history-kpi-card-title">ระดับเฉลี่ย</span>
          </div>
          <span className="history-kpi-card-val" style={{ color: "#818cf8" }}>
            {stats.avgLevel != null ? `${stats.avgLevel > 0 ? "+" : ""}${stats.avgLevel.toFixed(2)} ม.` : "—"}
          </span>
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
          background: "rgba(15, 23, 42, 0.85)",
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
              className={`table-tab-item ${statusFilter === "all" ? "active" : ""}`}
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
              className={`table-tab-item ${statusFilter === "normal" ? "active" : ""}`}
              onClick={() => setStatusFilter("normal")}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", flexShrink: 0 }} />
              <span>ปกติ</span>
              <span className={`table-tab-badge ${statusCounts.normal === 0 ? "dimmed" : ""}`}>
                {statusCounts.normal}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === "warning"}
              className={`table-tab-item ${statusFilter === "warning" ? "active" : ""}`}
              onClick={() => setStatusFilter("warning")}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#F59E0B", flexShrink: 0 }} />
              <span>เฝ้าระวัง</span>
              <span className={`table-tab-badge ${statusCounts.warning === 0 ? "dimmed" : ""}`}>
                {statusCounts.warning}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === "critical"}
              className={`table-tab-item ${statusFilter === "critical" ? "active" : ""}`}
              onClick={() => setStatusFilter("critical")}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#EF4444", flexShrink: 0 }} />
              <span>วิกฤต</span>
              <span className={`table-tab-badge ${statusCounts.critical === 0 ? "dimmed" : ""}`}>
                {statusCounts.critical}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === "anomaly"}
              className={`table-tab-item ${statusFilter === "anomaly" ? "active" : ""}`}
              onClick={() => setStatusFilter("anomaly")}
              title="บันทึกที่พบจุดบอด Blind Zone หรือเสาเอียง หรือแบตเตอรี่วิกฤต"
            >
              <AlertTriangleIcon size={13} style={{ color: "#F59E0B", flexShrink: 0 }} />
              <span>แจ้งเตือนผิดปกติ</span>
              <span className={`table-tab-badge ${statusCounts.anomaly === 0 ? "dimmed" : ""}`}>
                {statusCounts.anomaly}
              </span>
            </button>
          </div>

          {/* Right: Page Indicator & Count */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
              {loading
                ? "กำลังโหลดข้อมูล..."
                : `แสดง ${filteredReadings.length} จาก ${readings.length} รายการ`}
            </span>
            <span style={{ color: "rgba(255, 255, 255, 0.15)" }}>•</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
              หน้า {page + 1} จาก {totalPages}
            </span>
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
                  ไม่พบบันทึกข้อมูลตามเงื่อนไข
                </div>
                <div className="empty-state-desc" style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                  ลองปรับเปลี่ยนสถานี ตัวกรองสถานะ หรือขยายช่วงเวลา
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

                          const tX = r.tilt_x != null ? Number(r.tilt_x) : null;
                          const tY = r.tilt_y != null ? Number(r.tilt_y) : null;
                          const relTotal = r.relative_total_tilt != null ? Number(r.relative_total_tilt) : null;
                          const isTilted = Boolean(r.is_pole_tilted || (relTotal != null && relTotal > 15));

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
                                        color: "#38bdf8",
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
                                    <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                                      <span
                                        style={{
                                          fontSize: 14,
                                          fontWeight: 700,
                                          color: r.water_level != null
                                            ? (status.status === "critical" ? "#EF4444" : status.status === "warning" ? "#F59E0B" : "var(--text-primary)")
                                            : "var(--text-muted)",
                                          fontVariantNumeric: "tabular-nums",
                                        }}
                                      >
                                        {r.water_level != null ? `${r.water_level > 0 ? "+" : ""}${r.water_level.toFixed(2)} m` : "—"}
                                      </span>
                                      {r.is_blind_zone && (
                                        <span
                                          style={{
                                            fontSize: 9,
                                            fontWeight: 700,
                                            padding: "1px 4px",
                                            borderRadius: 3,
                                            background: "rgba(239, 68, 68, 0.15)",
                                            border: "1px solid rgba(239, 68, 68, 0.3)",
                                            color: "#EF4444",
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
                                    <span style={{ color: "#F59E0B", fontWeight: 600 }}>{fmt(r.temperature, "°C", 1)}</span>
                                    <span style={{ color: "rgba(255,255,255,0.2)" }}>/</span>
                                    <span style={{ color: "#38bdf8", fontWeight: 600 }}>{fmt(r.humidity, "%", 0)}</span>
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
                                          background: isTilted ? "#EF4444" : "#10B981",
                                          flexShrink: 0,
                                        }}
                                      />
                                      <span
                                        style={{
                                          fontSize: 12,
                                          fontWeight: 600,
                                          color: isTilted ? "#EF4444" : "var(--text-primary)",
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

                                {/* Status */}
                                <td>
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
                                </td>

                                {/* Expand Chevron */}
                                <td style={{ textAlign: "center" }}>
                                  <button
                                    type="button"
                                    className="btn btn-ghost"
                                    style={{ padding: 4, color: "var(--text-muted)", cursor: "pointer" }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleRowExpand(r.reading_id);
                                    }}
                                    aria-label="ขยายดูรายละเอียดเชิงลึก"
                                  >
                                    <ChevronDownIcon
                                      size={14}
                                      style={{
                                        transform: isExpanded ? "rotate(180deg)" : "none",
                                        transition: "transform 0.2s ease",
                                      }}
                                    />
                                  </button>
                                </td>
                              </tr>

                              {/* Accordion Sub-row Details (Zero Colon) */}
                              {isExpanded && (
                                <tr className="tactical-accordion-row">
                                  <td colSpan={9} style={{ padding: 0 }}>
                                    <div className="tactical-telemetry-grid">
                                      {/* Telemetry Card 1: Ultrasonic & Water Level */}
                                      <div className="tactical-telemetry-card">
                                        <div className="tactical-telemetry-card-title">
                                          <DropletsIcon size={12} style={{ color: "#38bdf8" }} />
                                          <span>ระบบตรวจวัดระดับน้ำ</span>
                                        </div>
                                        <div className="tactical-telemetry-item">
                                          <span className="tactical-telemetry-item-label">จุดอ้างอิงสถานี</span>
                                          <span className="tactical-telemetry-item-val">{r.reference_point_name || "ระดับพื้นผิวมาตรฐาน"}</span>
                                        </div>
                                        <div className="tactical-telemetry-item">
                                          <span className="tactical-telemetry-item-label">ระดับน้ำคำนวณได้</span>
                                          <span className="tactical-telemetry-item-val" style={{ color: status.color }}>
                                            {r.water_level != null ? `${r.water_level > 0 ? "+" : ""}${r.water_level.toFixed(2)} ม.` : "—"}
                                          </span>
                                        </div>
                                        <div className="tactical-telemetry-item">
                                          <span className="tactical-telemetry-item-label">ระยะที่เซนเซอร์วัดได้</span>
                                          <span className="tactical-telemetry-item-val">
                                            {r.raw_distance != null ? `${Number(r.raw_distance).toFixed(2)} ม.` : "—"}
                                          </span>
                                        </div>
                                        <div className="tactical-telemetry-item">
                                          <span className="tactical-telemetry-item-label">ระยะบอดเซนเซอร์</span>
                                          <span
                                            className="tactical-telemetry-item-val"
                                            style={{ color: r.is_blind_zone ? "#EF4444" : "#10B981" }}
                                          >
                                            {r.is_blind_zone ? "ระยะบอด (< 28 ซม.)" : "ระยะปกติ"}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Telemetry Card 2: Power & Environment */}
                                      <div className="tactical-telemetry-card">
                                        <div className="tactical-telemetry-card-title">
                                          <BatteryChargingIcon size={12} style={{ color: "#10B981" }} />
                                          <span>พลังงานและสภาพแวดล้อม</span>
                                        </div>
                                        <div className="tactical-telemetry-item">
                                          <span className="tactical-telemetry-item-label">ระดับแบตเตอรี่</span>
                                          <span className="tactical-telemetry-item-val">{r.battery_percent != null ? `${r.battery_percent.toFixed(0)}%` : "—"}</span>
                                        </div>
                                        <div className="tactical-telemetry-item">
                                          <span className="tactical-telemetry-item-label">แรงดันไฟแบตเตอรี่</span>
                                          <span className="tactical-telemetry-item-val">{r.battery_voltage != null ? `${Number(r.battery_voltage).toFixed(2)} V` : "—"}</span>
                                        </div>
                                        <div className="tactical-telemetry-item">
                                          <span className="tactical-telemetry-item-label">อุณหภูมิแวดล้อม</span>
                                          <span className="tactical-telemetry-item-val" style={{ color: "#F59E0B" }}>{fmt(r.temperature, "°C", 1)}</span>
                                        </div>
                                        <div className="tactical-telemetry-item">
                                          <span className="tactical-telemetry-item-label">ความชื้นสัมพัทธ์</span>
                                          <span className="tactical-telemetry-item-val" style={{ color: "#38bdf8" }}>{fmt(r.humidity, "%", 1)}</span>
                                        </div>
                                      </div>

                                      {/* Telemetry Card 3: Gyro Stability & RF Signal */}
                                      <div className="tactical-telemetry-card">
                                        <div className="tactical-telemetry-card-title">
                                          <ActivityIcon size={12} style={{ color: "#818cf8" }} />
                                          <span>ความนิ่งของเสาและเครือข่าย</span>
                                        </div>
                                        <div className="tactical-telemetry-item">
                                          <span className="tactical-telemetry-item-label">มุมเอียงระนาบ (X / Y)</span>
                                          <span className="tactical-telemetry-item-val">
                                            {tX != null && tY != null ? `${tX.toFixed(1)}° / ${tY.toFixed(1)}°` : "—"}
                                          </span>
                                        </div>
                                        <div className="tactical-telemetry-item">
                                          <span className="tactical-telemetry-item-label">ความเอียงสัมพัทธ์สุทธิ</span>
                                          <span
                                            className="tactical-telemetry-item-val"
                                            style={{ color: isTilted ? "#EF4444" : "var(--text-primary)" }}
                                          >
                                            {relTotal != null ? `${relTotal.toFixed(1)}°` : "—"}
                                            {isTilted ? " (เสาเอียง)" : " (ระนาบปกติ)"}
                                          </span>
                                        </div>
                                        <div className="tactical-telemetry-item">
                                          <span className="tactical-telemetry-item-label">ความแรงสัญญาณ LoRa</span>
                                          <span className="tactical-telemetry-item-val">{r.rssi != null ? `${r.rssi.toFixed(0)} dBm` : "—"}</span>
                                        </div>
                                        <div className="tactical-telemetry-item">
                                          <span className="tactical-telemetry-item-label">Signal-to-Noise (SNR)</span>
                                          <span className="tactical-telemetry-item-val">{r.snr != null ? `${r.snr.toFixed(1)} dB` : "—"}</span>
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

                    const tX = r.tilt_x != null ? Number(r.tilt_x) : null;
                    const tY = r.tilt_y != null ? Number(r.tilt_y) : null;
                    const relTotal = r.relative_total_tilt != null ? Number(r.relative_total_tilt) : null;
                    const isTilted = Boolean(r.is_pole_tilted || (relTotal != null && relTotal > 15));

                    return (
                      <div
                        key={r.reading_id}
                        className={`tactical-mobile-card ${isExpanded ? "expanded" : ""}`}
                      >
                        {/* Card Header: Timestamp & Status */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <span style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                            {fmtTimestamp(r.timestamp)}
                          </span>
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
                              color: "#38bdf8",
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
                            background: "rgba(17, 24, 39, 0.6)",
                            border: "1px solid rgba(255, 255, 255, 0.05)",
                            borderRadius: 8,
                            marginBottom: 10,
                          }}
                        >
                          <div>
                            <span style={{ fontSize: 10, color: "var(--text-muted)", display: "block" }}>ระดับน้ำ</span>
                            <span
                              style={{
                                fontSize: 14,
                                fontWeight: 700,
                                color: r.water_level != null ? status.color : "var(--text-muted)",
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {r.water_level != null ? `${r.water_level > 0 ? "+" : ""}${r.water_level.toFixed(2)}m` : "—"}
                            </span>
                          </div>

                          <div>
                            <span style={{ fontSize: 10, color: "var(--text-muted)", display: "block" }}>แบตเตอรี่</span>
                            <BatteryBar pct={r.battery_percent} />
                          </div>

                          <div>
                            <span style={{ fontSize: 10, color: "var(--text-muted)", display: "block" }}>สัญญาณ LoRa</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                              {r.rssi != null ? `${r.rssi.toFixed(0)} dBm` : "—"}
                            </span>
                          </div>
                        </div>

                        {/* Accordion Toggle Action */}
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => toggleRowExpand(r.reading_id)}
                          style={{
                            width: "100%",
                            justifyContent: "space-between",
                            fontSize: 12,
                            padding: "6px 8px",
                            borderRadius: 6,
                            color: "var(--text-secondary)",
                            background: "rgba(255, 255, 255, 0.02)",
                          }}
                        >
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                            <CpuIcon size={13} style={{ color: "#38bdf8" }} />
                            <span>{isExpanded ? "ซ่อนข้อมูลเซนเซอร์เชิงลึก" : "ดูข้อมูลเซนเซอร์เชิงลึก"}</span>
                          </span>
                          <ChevronDownIcon
                            size={14}
                            style={{
                              transform: isExpanded ? "rotate(180deg)" : "none",
                              transition: "transform 0.2s ease",
                            }}
                          />
                        </button>

                        {/* Expanded Mobile Telemetry (Zero Colon) */}
                        {isExpanded && (
                          <div
                            style={{
                              marginTop: 10,
                              paddingTop: 10,
                              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                              display: "flex",
                              flexDirection: "column",
                              gap: 10,
                            }}
                          >
                            <div className="tactical-telemetry-card">
                              <div className="tactical-telemetry-card-title">
                                <DropletsIcon size={12} style={{ color: "#38bdf8" }} />
                                <span>เซนเซอร์ระดับน้ำ</span>
                              </div>
                              <div className="tactical-telemetry-item">
                                <span className="tactical-telemetry-item-label">ระยะที่วัดได้</span>
                                <span className="tactical-telemetry-item-val">{r.raw_distance != null ? `${Number(r.raw_distance).toFixed(2)} ม.` : "—"}</span>
                              </div>
                              <div className="tactical-telemetry-item">
                                <span className="tactical-telemetry-item-label">จุดบอดเซนเซอร์</span>
                                <span className="tactical-telemetry-item-val" style={{ color: r.is_blind_zone ? "#EF4444" : "#10B981" }}>
                                  {r.is_blind_zone ? "ตรวจพบจุดบอด" : "ปกติ"}
                                </span>
                              </div>
                            </div>

                            <div className="tactical-telemetry-card">
                              <div className="tactical-telemetry-card-title">
                                <BatteryChargingIcon size={12} style={{ color: "#10B981" }} />
                                <span>สภาพแวดล้อมและไฟเลี้ยง</span>
                              </div>
                              <div className="tactical-telemetry-item">
                                <span className="tactical-telemetry-item-label">แรงดันไฟแบตฯ</span>
                                <span className="tactical-telemetry-item-val">{r.battery_voltage != null ? `${Number(r.battery_voltage).toFixed(2)} V` : "—"}</span>
                              </div>
                              <div className="tactical-telemetry-item">
                                <span className="tactical-telemetry-item-label">อุณหภูมิ</span>
                                <span className="tactical-telemetry-item-val">{fmt(r.temperature, "°C", 1)}</span>
                              </div>
                              <div className="tactical-telemetry-item">
                                <span className="tactical-telemetry-item-label">ความชื้น</span>
                                <span className="tactical-telemetry-item-val">{fmt(r.humidity, "%", 0)}</span>
                              </div>
                            </div>

                            <div className="tactical-telemetry-card">
                              <div className="tactical-telemetry-card-title">
                                <ActivityIcon size={12} style={{ color: "#818cf8" }} />
                                <span>ความมั่นคงเสาและสัญญาณ</span>
                              </div>
                              <div className="tactical-telemetry-item">
                                <span className="tactical-telemetry-item-label">มุมเอียง Gyro (X / Y)</span>
                                <span className="tactical-telemetry-item-val">
                                  {tX != null && tY != null ? `${tX.toFixed(1)}° / ${tY.toFixed(1)}°` : "—"}
                                </span>
                              </div>
                              <div className="tactical-telemetry-item">
                                <span className="tactical-telemetry-item-label">สถานะเสา</span>
                                <span className="tactical-telemetry-item-val" style={{ color: isTilted ? "#EF4444" : "var(--text-primary)" }}>
                                  {isTilted ? "เสาเอียง (>15°)" : "ปกติ"}
                                </span>
                              </div>
                              <div className="tactical-telemetry-item">
                                <span className="tactical-telemetry-item-label">SNR</span>
                                <span className="tactical-telemetry-item-val">{r.snr != null ? `${r.snr.toFixed(1)} dB` : "—"}</span>
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
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                  <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} domain={["dataMin - 0.2", "dataMax + 0.2"]} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(15, 23, 42, 0.95)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "0.5rem",
                      fontSize: "0.75rem",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                    }}
                  />
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

        {/* Tactical Footer / Pagination */}
        <div
          style={{
            padding: "10px 18px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "rgba(15, 23, 42, 0.7)",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page === 0 || loading}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              style={{ fontSize: 12, padding: "5px 12px", borderRadius: 6 }}
            >
              ← ก่อนหน้า
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page >= totalPages - 1 || loading}
              onClick={() => setPage((p) => p + 1)}
              style={{ fontSize: 12, padding: "5px 12px", borderRadius: 6 }}
            >
              ถัดไป →
            </button>
          </div>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            แสดงผล {PAGE_SIZE} รายการต่อหน้า · ดึงข้อมูลจากฐานข้อมูล FloodGuard
          </span>
        </div>
      </div>

      {/* ══ TACTICAL EXPORT SCOPE MODAL ══ */}
      {isExportModalOpen && (
        <div className="export-modal-backdrop" onClick={() => !exportLoading && setIsExportModalOpen(false)}>
          <div className="export-modal-panel" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                ส่งออก CSV
              </h3>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: 4, color: "var(--text-muted)" }}
                onClick={() => !exportLoading && setIsExportModalOpen(false)}
                disabled={exportLoading}
              >
                <XIcon size={16} />
              </button>
            </div>

            {/* Body: Options */}
            <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Option 1: All Filtered */}
              <div
                className={`export-option-card ${exportScope === "all_filtered" ? "selected" : ""}`}
                onClick={() => setExportScope("all_filtered")}
              >
                <input
                  type="radio"
                  name="exportScope"
                  checked={exportScope === "all_filtered"}
                  onChange={() => setExportScope("all_filtered")}
                />
                <div style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                    ข้อมูลทั้งหมดตามตัวกรอง
                  </span>
                  <span style={{ color: "#38bdf8", fontVariantNumeric: "tabular-nums", fontSize: 12 }}>
                    {total.toLocaleString()} รายการ
                  </span>
                </div>
              </div>

              {/* Option 2: Current Page Only */}
              <div
                className={`export-option-card ${exportScope === "current_page" ? "selected" : ""}`}
                onClick={() => setExportScope("current_page")}
              >
                <input
                  type="radio"
                  name="exportScope"
                  checked={exportScope === "current_page"}
                  onChange={() => setExportScope("current_page")}
                />
                <div style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                    เฉพาะข้อมูลในหน้านี้
                  </span>
                  <span style={{ color: "var(--text-muted)", fontVariantNumeric: "tabular-nums", fontSize: 12 }}>
                    {filteredReadings.length} รายการ
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: "12px 18px", background: "rgba(11, 19, 27, 0.7)", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsExportModalOpen(false)}
                disabled={exportLoading}
                style={{ fontSize: 12 }}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleConfirmExport}
                disabled={exportLoading || (exportScope === "current_page" ? filteredReadings.length === 0 : total === 0)}
                style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                {exportLoading ? (
                  <>
                    <div style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
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
