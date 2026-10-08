import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
  FlagIcon,
  InboxIcon,
  DownloadIcon,
  CheckCircleIcon,
  CompassIcon,
} from "../components/ui/Icons";
import Papa from "papaparse";
import { SegmentedControl, type SegmentedOption } from "../components/ui/SegmentedControl";
import { CompactFilterDropdown, type DropdownOption } from "../components/ui/CompactFilterDropdown";
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
      day: "2-digit", month: "short", year: "numeric",
    }).format(d);
    const time = d.toTimeString().slice(0, 8);
    return `${date} ${time}`;
  } catch { return ts; }
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
  if (pct == null) return <span style={{ color: "#6ba3c4" }}>—</span>;
  const color = pct > 50 ? "#06d6a0" : pct > 20 ? "#ffab40" : "#ff5252";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color, fontVariantNumeric: "tabular-nums" }}>{pct.toFixed(0)}%</span>
      <div style={{ width: 48, height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

type TimePreset = "all" | "24h" | "7d" | "30d" | "custom";
type KpiFilterMode = "all" | "min" | "max" | "avg";
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

  const handleExportCSV = () => {
    if (readings.length === 0 || loading) return;
    const currentStation = stations.find((s) => s.station_id === filterStation);
    const stationName = currentStation?.station_name || (filterStation ? filterStation : "all_stations");

    const rows = readings.map((r) => {
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

  const [stations, setStations] = useState<StationWithReading[]>([]);
  const [filterStation, setFilterStation] = useState("");
  const [timePreset, setTimePreset] = useState<TimePreset>("all");
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");

  // Pattern 2: Interactive Metric / KPI Filter Tab State
  const [kpiFilter, setKpiFilter] = useState<KpiFilterMode>("all");

  // View Mode: Table vs Chart
  const [viewMode, setViewMode] = useState<HistoryViewMode>("table");

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Handle Preset Switching (Pattern 1) ───────────────────────────────────
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

  // ─── Stats derived from current page ─────────────────────────────────────
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
    window.addEventListener('app:refresh', load);
    return () => {
      window.removeEventListener('app:refresh', load);
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
    window.addEventListener('app:refresh', handleGlobalRefresh);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      window.removeEventListener('app:refresh', handleGlobalRefresh);
    };
  }, [loadReadings, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ── Filter & Sort readings based on Active Metric / KPI Filter Tab ────────
  const displayedReadings = useMemo(() => {
    const list = [...readings];
    if (kpiFilter === "min") {
      // Sort ascending by water level to highlight minimum values
      return list.sort((a, b) => (a.water_level ?? 999) - (b.water_level ?? 999));
    }
    if (kpiFilter === "max") {
      // Sort descending by water level to highlight peak values
      return list.sort((a, b) => (b.water_level ?? -999) - (a.water_level ?? -999));
    }
    if (kpiFilter === "avg") {
      // Show closest to average
      if (stats.avgLevel != null) {
        const avg = stats.avgLevel;
        return list.sort((a, b) => Math.abs((a.water_level ?? avg) - avg) - Math.abs((b.water_level ?? avg) - avg));
      }
    }
    return list; // standard chronological
  }, [readings, kpiFilter, stats.avgLevel]);

  // Chart data formatting
  const chartData = useMemo(() => {
    return [...readings]
      .reverse()
      .map((r) => ({
        time: new Date(r.timestamp).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
        water_level: r.water_level,
        temperature: r.temperature,
        humidity: r.humidity,
        station: r.station_name || r.station_id,
      }));
  }, [readings]);

  // Station dropdown options (Pattern 4)
  const stationDropdownOptions: DropdownOption[] = useMemo(() => {
    const rawIds = user?.stationIds || (user as any)?.station_ids || [];
    const userStationIds = (Array.isArray(rawIds) ? rawIds : []).map((id: string) =>
      String(id).trim().toUpperCase()
    );
    const isCitizen = !isGuest && user?.role === 'citizen' && user?.id !== 'citizen_guest';
    const isStaff = !isGuest && user?.role === 'staff';

    const opts: DropdownOption[] = [
      {
        value: "",
        label: `ทั้งหมด (${stations.length} สถานี)`,
        sublabel: "ดึงข้อมูลจากทุกสถานีในระบบ",
        count: total,
      },
    ];
    stations.forEach((s) => {
      const isUserStation = userStationIds.includes(s.station_id.toUpperCase());
      const sublabel = isUserStation
        ? `${s.location_name ? s.location_name + ' · ' : ''}${isCitizen ? 'สถานีที่ติดตาม' : isStaff ? 'สถานีที่รับผิดชอบ' : ''}`
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

  // Time preset segmented options (Pattern 1)
  const timePresetOptions: SegmentedOption<TimePreset>[] = [
    { value: "all", label: "ทั้งหมด" },
    { value: "24h", label: "24 ชม." },
    { value: "7d", label: "7 วัน" },
    { value: "30d", label: "30 วัน" },
    { value: "custom", label: "กำหนดวันเอง" },
  ];

  const viewModeOptions: SegmentedOption<HistoryViewMode>[] = [
    { value: "table", label: "ตารางข้อมูล", icon: <ClipboardListIcon size={13} /> },
    { value: "chart", label: "กราฟสถิติ", icon: <BarChart3Icon size={13} /> },
  ];

  return (
    <div className="page-container" style={{ paddingBottom: 50 }}>
      {/* ══ 2. UNIFIED SPACE-EFFICIENT CONTROL BAR (Patterns 1 & 4) ════════ */}
      <div
        className="history-toolbar"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
          marginBottom: 18,
          padding: "12px 18px",
          background: "rgba(17, 24, 39, 0.75)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 16,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          position: "relative",
          zIndex: 50,
        }}
      >
        {/* Left: Compact Dropdown for Station Filter */}
        <div className="history-filter-station-wrap" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <CompactFilterDropdown
            options={stationDropdownOptions}
            value={filterStation}
            onChange={(val) => setFilterStation(val)}
            placeholder="เลือกสถานีตรวจวัด..."
            width={240}
          />

          {(filterStation || filterStart || filterEnd) && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setFilterStation("");
                setTimePreset("all");
                setFilterStart("");
                setFilterEnd("");
              }}
              style={{ fontSize: 12, padding: "6px 10px", color: "var(--color-critical)", gap: 4 }}
              title="ล้างการตั้งค่าตัวกรองทั้งหมด"
            >
              <XIcon size={13} />
              <span>ล้างตัวกรอง</span>
            </button>
          )}
        </div>

        {/* Center: Sliding Pill Switcher for Time Range Presets (Enlarged) */}
        <div className="history-time-presets-wrap" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <SegmentedControl
            options={timePresetOptions}
            value={timePreset}
            onChange={handleTimePresetChange}
            size="lg"
            ariaLabel="ช่วงเวลาของประวัติข้อมูล"
          />
        </div>

        {/* Right: View Mode Toggle & CSV Export Button */}
        <div className="history-view-mode-wrap" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <SegmentedControl
            options={viewModeOptions}
            value={viewMode}
            onChange={(val) => setViewMode(val as HistoryViewMode)}
            size="lg"
            ariaLabel="สลับมุมมองตารางหรือกราฟ"
          />

          {canExport && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleExportCSV}
              disabled={readings.length === 0 || loading}
              title={
                readings.length === 0
                  ? "ไม่มีข้อมูลสำหรับส่งออก"
                  : `ส่งออกข้อมูลประวัติ ${readings.length} รายการเป็นไฟล์ CSV`
              }
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
                fontSize: "0.8125rem",
                fontWeight: 600,
                borderRadius: "0.5rem",
                height: 38,
                padding: "0 14px",
                boxShadow: "none",
              }}
            >
              {isExported ? (
                <>
                  <CheckCircleIcon size={14} style={{ color: "#10B981" }} />
                  <span style={{ color: "#10B981" }}>ดาวน์โหลดสำเร็จ</span>
                </>
              ) : (
                <>
                  <DownloadIcon size={14} />
                  <span>ส่งออก CSV</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Progressive Disclosure: Custom Date Range Form (Only if 'custom' selected) */}
      {timePreset === "custom" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
            padding: "10px 16px",
            background: "rgba(15, 23, 42, 0.6)",
            border: "1px dashed rgba(56, 189, 248, 0.3)",
            borderRadius: 12,
            animation: "fadeIn 0.2s ease",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 12, color: "var(--cyan-glow)", fontWeight: 600 }}>กำหนดช่วงวัน-เวลา</span>
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

      {/* ══ 3. DUAL-FUNCTION METRIC / KPI FILTER TABS (Pattern 2) ══════════ */}
      <div
        className="kpi-filter-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
        role="tablist"
        aria-label="ตัวกรองและสรุปตัวเลขสถิติ"
      >
        {/* KPI Tab 1: All Records */}
        <button
          type="button"
          role="tab"
          aria-selected={kpiFilter === "all"}
          onClick={() => setKpiFilter("all")}
          className={`metric-filter-card ${kpiFilter === "all" ? "active" : ""}`}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 5 }}>
              <BarChart3Icon size={14} style={{ color: "#06B6D4" }} />
              <span>จำนวนครั้ง / ทั้งหมด</span>
            </div>
            {kpiFilter === "all" && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: "rgba(6, 182, 212, 0.2)", color: "var(--cyan-glow)" }}>
                กำลังแสดง
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "2px 0" }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: "#06B6D4", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
              {total.toLocaleString()}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>รายการ</span>
          </div>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            กดเพื่อแสดงข้อมูลตามลำดับเวลาปกติ
          </span>
          <div className="metric-filter-indicator" />
        </button>

        {/* KPI Tab 2: Min Water Level */}
        <button
          type="button"
          role="tab"
          aria-selected={kpiFilter === "min"}
          onClick={() => setKpiFilter("min")}
          className={`metric-filter-card ${kpiFilter === "min" ? "active" : ""}`}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 5 }}>
              <TrendingDownIcon size={14} style={{ color: "#10B981" }} />
              <span>ระดับน้ำต่ำสุด</span>
            </div>
            {kpiFilter === "min" && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: "rgba(16, 185, 129, 0.2)", color: "#10B981" }}>
                เรียงค่าน้อยสุด
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "2px 0" }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: "#10B981", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
              {stats.minLevel != null ? (stats.minLevel > 0 ? "+" : "") + stats.minLevel.toFixed(2) : "—"}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>เมตร</span>
          </div>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            กดเพื่อเรียงดูข้อมูลระดับน้ำต่ำสุด
          </span>
          <div className="metric-filter-indicator" style={{ background: "linear-gradient(90deg, #10B981, #34D399)" }} />
        </button>

        {/* KPI Tab 3: Peak / Max Water Level */}
        <button
          type="button"
          role="tab"
          aria-selected={kpiFilter === "max"}
          onClick={() => setKpiFilter("max")}
          className={`metric-filter-card ${kpiFilter === "max" ? "active" : ""}`}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 5 }}>
              <TrendingUpIcon size={14} style={{ color: "#F59E0B" }} />
              <span>ระดับน้ำสูงสุด</span>
            </div>
            {kpiFilter === "max" && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: "rgba(245, 158, 11, 0.2)", color: "#F59E0B" }}>
                เรียงค่าสูงสุด
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "2px 0" }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: "#F59E0B", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
              {stats.maxLevel != null ? (stats.maxLevel > 0 ? "+" : "") + stats.maxLevel.toFixed(2) : "—"}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>เมตร</span>
          </div>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            กดเพื่อเรียงดูจุดสูงสุด/เฝ้าระวัง
          </span>
          <div className="metric-filter-indicator" style={{ background: "linear-gradient(90deg, #F59E0B, #EF4444)" }} />
        </button>

        {/* KPI Tab 4: Average Water Level */}
        <button
          type="button"
          role="tab"
          aria-selected={kpiFilter === "avg"}
          onClick={() => setKpiFilter("avg")}
          className={`metric-filter-card ${kpiFilter === "avg" ? "active" : ""}`}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 5 }}>
              <DropletsIcon size={14} style={{ color: "#8B5CF6" }} />
              <span>ระดับน้ำเฉลี่ย</span>
            </div>
            {kpiFilter === "avg" && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: "rgba(139, 92, 246, 0.2)", color: "#A78BFA" }}>
                เทียบค่าเฉลี่ย
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "2px 0" }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: "#A78BFA", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
              {stats.avgLevel != null ? (stats.avgLevel > 0 ? "+" : "") + stats.avgLevel.toFixed(2) : "—"}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>เมตร</span>
          </div>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            กดเพื่อเทียบกับเกณฑ์ระดับน้ำเฉลี่ย
          </span>
          <div className="metric-filter-indicator" style={{ background: "linear-gradient(90deg, #8B5CF6, #06B6D4)" }} />
        </button>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="alert-banner alert-banner-critical" style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertTriangleIcon size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ══ 4. MAIN CONTENT AREA: TABLE OR TREND CHART ═════════════════════ */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        {/* Card Header Toolbar */}
        <div
          style={{
            padding: "10px 18px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "rgba(17, 24, 39, 0.8)",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
              {loading ? "กำลังโหลดข้อมูล..." : `แสดง ${displayedReadings.length} จากทั้งหมด ${total.toLocaleString()} รายการ`}
            </span>
            {kpiFilter !== "all" && (
              <span
                style={{
                  fontSize: 11,
                  padding: "2px 8px",
                  borderRadius: 20,
                  background: "rgba(6, 182, 212, 0.15)",
                  border: "1px solid rgba(6, 182, 212, 0.3)",
                  color: "var(--cyan-glow)",
                  fontWeight: 600,
                }}
              >
                {kpiFilter === "min" ? "เรียงค่าน้อยสุดก่อน" : kpiFilter === "max" ? "เรียงค่าสูงสุดก่อน" : "เทียบค่าเฉลี่ย"}
              </span>
            )}
          </div>
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
            หน้า {page + 1} / {totalPages}
          </span>
        </div>

        {/* View Mode 1: Table */}
        {viewMode === "table" ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "rgba(15, 23, 42, 0.8)", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  {[
                    { icon: <ClockIcon size={12} />, label: "เวลาที่ตรวจวัด", w: 155 },
                    { icon: <RadioIcon size={12} />, label: "ชื่อสถานี", w: 180 },
                    { icon: <DropletsIcon size={12} />, label: "ระดับน้ำ (เทียบจุดอ้างอิง)", w: 160 },
                    { icon: <ThermometerIcon size={12} />, label: "อุณหภูมิ", w: 100 },
                    { icon: <DropletsIcon size={12} />, label: "ความชื้น", w: 100 },
                    { icon: <BatteryChargingIcon size={12} />, label: "แบตเตอรี่", w: 100 },
                    { icon: <WifiIcon size={12} />, label: "สัญญาณ LoRa/WiFi", w: 140 },
                    { icon: <CompassIcon size={12} />, label: "มุมเอียง Gyro (X / Y)", w: 160 },
                    { icon: <FlagIcon size={12} />, label: "สถานะ", w: 100 },
                  ].map((h) => (
                    <th
                      key={h.label}
                      style={{
                        padding: "10px 16px",
                        textAlign: "left",
                        width: h.w,
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: "var(--text-muted)",
                        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        {h.icon}
                        <span>{h.label}</span>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            border: "3px solid rgba(6, 182, 212, 0.15)",
                            borderTopColor: "var(--cyan-glow)",
                            borderRadius: "50%",
                            animation: "spin 0.8s linear infinite",
                          }}
                        />
                        <span style={{ fontSize: 13 }}>กำลังดึงข้อมูลประวัติจากฐานข้อมูล...</span>
                      </div>
                    </td>
                  </tr>
                ) : displayedReadings.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <div className="empty-state" style={{ textAlign: "center", padding: "40px 20px" }}>
                        <div className="empty-state-icon" style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                          <InboxIcon size={36} style={{ color: "var(--text-muted)" }} />
                        </div>
                        <div className="empty-state-title" style={{ fontSize: 15, fontWeight: 700 }}>ไม่พบบันทึกข้อมูล</div>
                        <div className="empty-state-desc" style={{ fontSize: 12, color: "var(--text-muted)" }}>ลองปรับช่วงเวลาหรือตัวกรองสถานี</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayedReadings.map((r, i) => {
                    const st = stations.find((s) => s.station_id === r.station_id);
                    const status = getReadingWaterStatus(r, st);
                    const rowBg = i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)";
                    return (
                      <tr
                        key={r.reading_id}
                        style={{ background: rowBg, transition: "background 0.15s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(6, 182, 212, 0.05)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = rowBg)}
                      >
                        {/* เวลา */}
                        <td style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", whiteSpace: "nowrap" }}>
                          <span style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                            {fmtTimestamp(r.timestamp)}
                          </span>
                        </td>

                        {/* ชื่อสถานี */}
                        <td style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
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
                                color: "var(--cyan-glow)",
                                background: "rgba(6, 182, 212, 0.1)",
                                padding: "1px 6px",
                                borderRadius: 4,
                                width: "fit-content",
                                letterSpacing: "0.04em",
                              }}
                            >
                              STATIC · {r.station_id}
                            </span>
                          </div>
                        </td>

                        {/* ระดับน้ำ */}
                        <td style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                              <span
                                style={{
                                  fontSize: 14,
                                  fontWeight: 700,
                                  color: r.water_level != null
                                    ? (status.status === "critical" ? "#EF4444" : status.status === "warning" ? "#F59E0B" : "var(--cyan-glow)")
                                    : "var(--text-muted)",
                                  fontVariantNumeric: "tabular-nums",
                                }}
                              >
                                {r.water_level != null ? (r.water_level > 0 ? "+" : "") + r.water_level.toFixed(2) + " m" : "—"}
                              </span>
                              {r.is_blind_zone && (
                                <span
                                  style={{
                                    fontSize: 9,
                                    fontWeight: 700,
                                    padding: "1px 4px",
                                    borderRadius: 3,
                                    background: "rgba(239, 68, 68, 0.2)",
                                    border: "1px solid rgba(239, 68, 68, 0.4)",
                                    color: "#EF4444",
                                  }}
                                  title="ระยะห่างเซนเซอร์น้อยกว่า 28 ซม. (จุดบอดเซนเซอร์ A01NYUB)"
                                >
                                  Blind Zone
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                              {r.reference_point_name || "จุดอ้างอิง"}
                              {r.raw_distance != null ? ` · เซนเซอร์วัดได้ ${Number(r.raw_distance).toFixed(2)} ม.` : ""}
                            </span>
                          </div>
                        </td>

                        {/* อุณหภูมิ */}
                        <td style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <span style={{ color: "#ffab40", fontWeight: 600, fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
                            {fmt(r.temperature, "°C", 1)}
                          </span>
                        </td>

                        {/* ความชื้น */}
                        <td style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <span style={{ color: "#40c4ff", fontWeight: 600, fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
                            {fmt(r.humidity, "%", 0)}
                          </span>
                        </td>

                        {/* แบตเตอรี่ */}
                        <td style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <BatteryBar pct={r.battery_percent} />
                        </td>

                        {/* สัญญาณ RSSI / SNR */}
                        <td style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          {r.rssi != null ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                                {r.rssi.toFixed(0)} dBm
                              </span>
                              {r.snr != null && (
                                <span style={{ fontSize: 10, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                                  SNR: {r.snr.toFixed(1)} dB
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>
                          )}
                        </td>

                        {/* มุมเอียง Gyro (X / Y) และความนิ่งของเสา */}
                        <td style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          {r.tilt_x != null && r.tilt_y != null ? (() => {
                            const tX = Number(r.tilt_x);
                            const tY = Number(r.tilt_y);
                            const relTotal = r.relative_total_tilt != null ? Number(r.relative_total_tilt) : null;
                            const isTilted = Boolean(r.is_pole_tilted || (relTotal != null && relTotal > 15));
                            return (
                              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                  <span
                                    style={{
                                      width: 6,
                                      height: 6,
                                      borderRadius: "50%",
                                      background: isTilted ? "#F59E0B" : "#10B981",
                                      flexShrink: 0,
                                    }}
                                    title={isTilted ? "เสาเอียงเกินเกณฑ์ 15°" : "เสาได้ระนาบปกติ"}
                                  />
                                  <span
                                    style={{
                                      fontSize: 12,
                                      fontWeight: 600,
                                      color: isTilted ? "#F59E0B" : "var(--text-primary)",
                                      fontVariantNumeric: "tabular-nums",
                                    }}
                                  >
                                    X: {!isNaN(tX) ? (tX > 0 ? `+${tX.toFixed(1)}` : tX.toFixed(1)) : "—"}° / Y: {!isNaN(tY) ? (tY > 0 ? `+${tY.toFixed(1)}` : tY.toFixed(1)) : "—"}°
                                  </span>
                                </div>
                                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                                  {isTilted
                                    ? `เสาเอียง ${relTotal != null && !isNaN(relTotal) ? `${relTotal.toFixed(1)}°` : ""} (>15°)`
                                    : relTotal != null && !isNaN(relTotal)
                                    ? `เบี่ยงเบน ${relTotal.toFixed(1)}° (เสาได้ระนาบ)`
                                    : "เสาได้ระนาบ (ปกติ)"}
                                </span>
                              </div>
                            );
                          })() : (
                            <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>
                          )}
                        </td>

                        {/* สถานะความปลอดภัย */}
                        <td style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              padding: "2px 8px",
                              borderRadius: 20,
                              background: status.bg,
                              color: status.color,
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: status.dot }} />
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* View Mode 2: Integrated Trend Chart */
          <div style={{ padding: "1.5rem" }}>
            <div style={{ marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF" }}>
                แนวโน้มระดับน้ำย้อนหลัง ({chartData.length} จุดข้อมูลล่าสุด)
              </span>
              <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                หน่วย เมตร (m)
              </span>
            </div>
            <div style={{ height: 320, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="historyWaterGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" />
                  <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} domain={["dataMin - 0.2", "dataMax + 0.2"]} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(15, 23, 42, 0.95)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: "0.5rem",
                      fontSize: "0.75rem",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="water_level"
                    stroke="#06B6D4"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#historyWaterGlow)"
                    name="ระดับน้ำ (ม.)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Table Footer / Pagination */}
        <div
          style={{
            padding: "10px 18px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "rgba(15, 23, 42, 0.5)",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page === 0 || loading}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              style={{ fontSize: 12 }}
            >
              ← ก่อนหน้า
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page >= totalPages - 1 || loading}
              onClick={() => setPage((p) => p + 1)}
              style={{ fontSize: 12 }}
            >
              ถัดไป →
            </button>
          </div>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            แสดงผล {PAGE_SIZE} รายการ/หน้า · การคำนวณทั้งหมดใช้ข้อมูลจริงจาก Database
          </span>
        </div>
      </div>
    </div>
  );
}
