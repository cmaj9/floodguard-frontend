import { useState, useEffect, useMemo, memo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import type { Station, Reading } from "../../types";
import { fetchReadingsByStation } from "../../services/apiService";
import {
  DropletsIcon,
  ThermometerIcon,
  BatteryChargingIcon,
  BatteryLowIcon,
  WifiIcon,
  RadioIcon,
  ZapIcon,
  CpuIcon,
  MapPinIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  XCircleIcon,
  BarChart3Icon,
  ActivityIcon,
  CompassIcon,
  LayersIcon,
} from "../ui/Icons";

interface StationTelemetryHubProps {
  station: Station;
}

type HubViewMode = "sensors" | "chart";
type ActiveMetricKey =
  | "level"
  | "temp"
  | "hum"
  | "batt"
  | "volt"
  | "rssi"
  | "snr"
  | "tilt"
  | "gateway";

export const StationTelemetryHub = memo(function StationTelemetryHub({
  station,
}: StationTelemetryHubProps) {
  const navigate = useNavigate();

  // View mode switcher: 'sensors' (8 Bento cards) or 'chart' (Live Trend Graph)
  const [viewMode, setViewMode] = useState<HubViewMode>("sensors");

  // Mobile expandable diagnostics toggle (shows 4 primary by default, expands to 8)
  const [showAllMetrics, setShowAllMetrics] = useState(false);

  // Interactive Metric / KPI Filter Tab selection
  const [activeMetric, setActiveMetric] = useState<ActiveMetricKey>("level");

  const [recentReadings, setRecentReadings] = useState<Reading[]>([]);

  // Fetch recent readings for this specific station
  useEffect(() => {
    let isMounted = true;
    fetchReadingsByStation(station.id, 10)
      .then((data) => {
        if (isMounted) setRecentReadings(data || []);
      })
      .catch(() => {
        if (isMounted) setRecentReadings([]);
      });

    return () => {
      isMounted = false;
    };
  }, [station.id]);

  // Derived values & fallbacks
  const temp = station.temperature ?? 30.2;
  const hum = station.humidity ?? 66.3;
  const battPercent = station.batteryPercent ?? 100;
  const battVolt = station.batteryVoltage ?? 13.0;
  const rssi = station.rssi ?? -71;
  const snr = station.snr ?? 14.5;
  const tiltX = station.tiltX ?? 4.1;
  const tiltY = station.tiltY ?? -1.1;
  const gateway = station.gatewayName || "Gateway_01";
  const gatewayStatus = station.gatewayStatus || "online";
  const model = station.model || "Heltec-WiFi-LoRa-32(V3)";
  const firmware = station.firmwareVersion || "v1.2.0";

  // Physical Calibration & Reference Point
  const refName = station.referencePointName || "จุดอ้างอิง";
  const sensorToRef = station.sensorToRefDistance ?? 2.0;
  const rawDistance =
    station.rawDistance ?? Number((sensorToRef - (station.currentLevel ?? 0)).toFixed(3));
  const waterLevel =
    station.rawDistance !== null && station.rawDistance !== undefined
      ? Number((sensorToRef - station.rawDistance).toFixed(3))
      : (station.currentLevel ?? 0);
  const isBlindZone =
    station.isBlindZone || rawDistance <= (station.blindZoneOffset ?? 0.28);

  // Water level thresholds (Optional)
  const hasWarning =
    station.warningLevel !== null &&
    station.warningLevel !== undefined &&
    !isNaN(Number(station.warningLevel));
  const hasCritical =
    station.criticalLevel !== null &&
    station.criticalLevel !== undefined &&
    !isNaN(Number(station.criticalLevel));
  const warningLevel = hasWarning ? Number(station.warningLevel) : null;
  const criticalLevel = hasCritical ? Number(station.criticalLevel) : null;
  const isOffline = !station.isActive || station.operatingStatus === 'offline';

  // Status badge styling
  let statusColor = "var(--status-normal)";
  let statusBg = "var(--status-normal-dim)";
  let statusLabel = `ระดับน้ำปกติ (ต่ำกว่า${refName})`;
  let StatusIcon = CheckCircleIcon;

  if (isOffline) {
    statusColor = "#F59E0B";
    statusBg = "rgba(245, 158, 11, 0.15)";
    statusLabel = "ปิดให้บริการชั่วคราว (Offline)";
    StatusIcon = AlertTriangleIcon;
  } else if (hasCritical && waterLevel >= (criticalLevel as number)) {
    statusColor = "var(--status-critical)";
    statusBg = "var(--status-critical-dim)";
    statusLabel = `ระดับน้ำวิกฤต (สูงกว่า${refName})`;
    StatusIcon = XCircleIcon;
  } else if (hasWarning && waterLevel >= (warningLevel as number)) {
    statusColor = "var(--status-advisory)";
    statusBg = "var(--status-advisory-dim)";
    statusLabel = `เกณฑ์เฝ้าระวังพิเศษ`;
    StatusIcon = AlertTriangleIcon;
  } else if (waterLevel > 0) {
    statusColor = "var(--status-critical)";
    statusBg = "var(--status-critical-dim)";
    statusLabel = `น้ำสูงกว่า${refName} (+${waterLevel.toFixed(2)} ม.)`;
    StatusIcon = AlertTriangleIcon;
  }

  // Signal Strength Rating
  let signalRating = "สัญญาณดีเยี่ยม";
  let signalColor = "#10B981";
  if (rssi < -90) {
    signalRating = "สัญญาณอ่อน";
    signalColor = "#EF4444";
  } else if (rssi < -75) {
    signalRating = "สัญญาณปานกลาง";
    signalColor = "#F59E0B";
  }

  // Format date/time
  let formattedTime = "เมื่อสักครู่";
  if (station.lastUpdated) {
    try {
      const d = new Date(station.lastUpdated);
      if (!isNaN(d.getTime())) {
        formattedTime = d.toLocaleTimeString("th-TH", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
      }
    } catch {}
  }

  // Chart data from recent readings
  const chartData = useMemo(() => {
    if (recentReadings.length > 0) {
      return [...recentReadings].reverse().map((r) => {
        let timeStr = "-";
        try {
          const d = new Date(r.timestamp);
          if (!isNaN(d.getTime())) {
            timeStr = d.toLocaleTimeString("th-TH", {
              hour: "2-digit",
              minute: "2-digit",
            });
          }
        } catch {}

        return {
          time: timeStr,
          level:
            r.raw_distance !== null && r.raw_distance !== undefined && !isNaN(Number(r.raw_distance))
              ? Number((sensorToRef - Number(r.raw_distance)).toFixed(3))
              : (r.water_level !== null && r.water_level !== undefined && !isNaN(Number(r.water_level))
                  ? Number(Number(r.water_level).toFixed(3))
                  : waterLevel),
        };
      });
    }
    // Fallback baseline points
    return [
      { time: "17:15", level: waterLevel - 0.02 },
      { time: "17:20", level: waterLevel - 0.01 },
      { time: "17:25", level: waterLevel },
      { time: "17:30", level: waterLevel + 0.005 },
      { time: "17:35", level: waterLevel },
      { time: "17:40", level: waterLevel },
      { time: "17:45", level: waterLevel },
      { time: "17:50", level: waterLevel + 0.003 },
      { time: "17:55", level: waterLevel },
      { time: "18:00", level: waterLevel },
    ];
  }, [recentReadings, waterLevel]);

  return (
    <div
      className="bento-card animate-fade-in telemetry-hub-card"
      style={{
        background: "var(--card-surface)",
        borderRadius: "1.5rem",
        border: "1px solid var(--card-border)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
        padding: "1.75rem 2rem",
        marginBottom: "2rem",
      }}
    >
      {/* ── 1. HUB HEADER: Station Identity & Segmented View Switcher ── */}
      <div
        className="telemetry-hub-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          paddingBottom: "1.25rem",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        {/* Left: Station Identity */}
        <div className="telemetry-hub-station-header">
          {/* Row 1: Station Code + Station Name + Live Status Pill */}
          <div className="telemetry-station-primary-row">
            <span
              style={{
                fontFamily: "monospace",
                fontSize: "0.9375rem",
                fontWeight: 800,
                color: "#38BDF8",
                background: "rgba(37, 99, 235, 0.15)",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                padding: "0.2rem 0.6rem",
                borderRadius: "0.5rem",
                letterSpacing: "0.04em",
                flexShrink: 0,
              }}
            >
              {station.id}
            </span>
            <h2
              className="telemetry-station-title"
              style={{
                fontSize: "1.375rem",
                fontWeight: 800,
                color: "#FFFFFF",
                margin: 0,
                letterSpacing: "-0.02em",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              {station.name}
            </h2>
            <div
              className="telemetry-status-pill"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.25rem 0.75rem",
                borderRadius: "9999px",
                background: statusBg,
                border: `1.5px solid ${statusColor}60`,
                color: statusColor,
                fontSize: "0.8125rem",
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              <StatusIcon size={14} />
              <span>{statusLabel}</span>
            </div>
          </div>

          <div
            className="telemetry-meta-row"
            style={{
              fontSize: "0.8125rem",
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              flexWrap: "wrap",
              fontWeight: 500,
            }}
          >
            <span
              style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}
            >
              <MapPinIcon size={14} style={{ color: "var(--sky-highlight)" }} />
              <span>{station.location || "จุดบริการลุ่มน้ำ"}</span>
            </span>
            <span className="telemetry-coords">·</span>
            <span className="telemetry-coords">
              พิกัด{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                {station.lat.toFixed(6)}, {station.lng.toFixed(6)}
              </strong>
            </span>
            <span>·</span>
            <span>
              อัปเดตล่าสุด{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                {formattedTime} น.
              </strong>
            </span>
          </div>
        </div>

        {/* Right: Controls (Segmented View Switcher) */}
        <div
          className="telemetry-view-switcher-wrap"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          {/* Segmented Control / Sliding Pill Switcher */}
          <div
            role="tablist"
            aria-label="สลับมุมมองข้อมูลสถานี"
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "rgba(8, 12, 20, 0.9)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "9999px",
              padding: "0.25rem",
              gap: "0.25rem",
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "sensors"}
              onClick={() => setViewMode("sensors")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.45rem 0.95rem",
                borderRadius: "9999px",
                background:
                  viewMode === "sensors"
                    ? "var(--primary-accent)"
                    : "transparent",
                color:
                  viewMode === "sensors" ? "#FFFFFF" : "var(--text-secondary)",
                border: "none",
                fontSize: "0.8125rem",
                fontWeight: viewMode === "sensors" ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
              }}
            >
              <LayersIcon size={14} />
              <span>ข้อมูลตรวจวัด</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "chart"}
              onClick={() => setViewMode("chart")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.45rem 0.95rem",
                borderRadius: "9999px",
                background:
                  viewMode === "chart"
                    ? "var(--primary-accent)"
                    : "transparent",
                color:
                  viewMode === "chart" ? "#FFFFFF" : "var(--text-secondary)",
                border: "none",
                fontSize: "0.8125rem",
                fontWeight: viewMode === "chart" ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
              }}
            >
              <BarChart3Icon size={14} />
              <span>กราฟแนวโน้ม</span>
            </button>
          </div>

          {/* Refined, Space-Efficient CTA Button (Desktop only, hidden on mobile) */}
          <button
            type="button"
            className="telemetry-desktop-cta"
            onClick={() => navigate("/chart")}
            title="เปิดหน้าระบบวิเคราะห์ประวัติย้อนหลังแบบเต็มหน้าจอ"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.45rem 0.875rem",
              borderRadius: "0.625rem",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.14)",
              color: "var(--text-primary)",
              fontSize: "0.8125rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <ActivityIcon size={15} />
            <span>กราฟเชิงลึก ↗</span>
          </button>
        </div>
      </div>

      {/* ── 2. PRIMARY WATER LEVEL & SAFETY SCALE ── */}
      <div
        className="telemetry-hero-card"
        style={{
          background: "rgba(10, 16, 28, 0.85)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "1.25rem",
          padding: "1.25rem 1.5rem",
          marginBottom: "1rem",
        }}
      >
        {/* Section 1: Header with Title and Live Status Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
            marginBottom: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <DropletsIcon size={18} style={{ color: "var(--sky-highlight)", flexShrink: 0 }} />
            <span style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#E2E8F0" }}>
              ระดับน้ำเทียบกับ{refName}
            </span>
          </div>
          <span
            className="telemetry-hero-badge"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.2rem 0.65rem",
              borderRadius: "9999px",
              background: isOffline ? "rgba(245, 158, 11, 0.12)" : waterLevel >= 0 ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)",
              border: `1px solid ${isOffline ? "#F59E0B" : waterLevel >= 0 ? "#EF4444" : "#10B981"}40`,
              color: isOffline ? "#F59E0B" : waterLevel >= 0 ? "#EF4444" : "#10B981",
              fontSize: "0.75rem",
              fontWeight: 700,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
            {isOffline
              ? "ออฟไลน์"
              : waterLevel < 0
              ? `ต่ำกว่า${refName} ${Math.abs(waterLevel).toFixed(2)} ม.`
              : waterLevel === 0
              ? `เสมอ${refName} พอดี`
              : `สูงกว่า${refName} ${waterLevel.toFixed(2)} ม. (น้ำล้น)`}
          </span>
        </div>

        {/* Section 2: Prominent Value Display */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "0.5rem",
            marginBottom: "0.875rem",
          }}
        >
          {isOffline ? (
            <span
              style={{
                fontSize: "2.75rem",
                fontWeight: 800,
                color: "var(--text-muted)",
                lineHeight: 1,
                fontFamily: "monospace",
              }}
            >
              -
            </span>
          ) : (
            <>
              <span
                className="water-level-value"
                style={{
                  fontSize: "2.75rem",
                  fontWeight: 900,
                  fontFamily: "monospace, inherit",
                  color: waterLevel >= 0 ? "#F87171" : "#38BDF8",
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                }}
              >
                {waterLevel >= 0 ? `+${waterLevel.toFixed(3)}` : waterLevel.toFixed(3)}
              </span>
              <span
                style={{
                  fontSize: "1.125rem",
                  color: "var(--text-secondary)",
                  fontWeight: 700,
                }}
              >
                เมตร (ม.)
              </span>
            </>
          )}
        </div>

        {/* Section 3: Blind Zone Warning Banner (only if triggered) */}
        {isBlindZone && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.625rem",
              padding: "0.625rem 0.875rem",
              borderRadius: "0.625rem",
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              color: "#F87171",
              fontSize: "0.8125rem",
              fontWeight: 600,
              marginBottom: "0.875rem",
            }}
          >
            <AlertTriangleIcon size={16} />
            <span>คำเตือน: ผิวน้ำเข้าสู่ระยะบอดของเซนเซอร์ (&lt; 0.28 ม.)</span>
          </div>
        )}

        {/* Section 4: Integrated Calibration Metrics (Unified divider layout) */}
        <div className="hero-calibration-grid">
          <div className="hero-calibration-item">
            <span className="hero-calibration-label">ระยะผิวน้ำที่วัดได้</span>
            <strong
              className="hero-calibration-val"
              style={{ color: isOffline ? "var(--text-muted)" : "var(--text-primary)" }}
            >
              {isOffline ? "-" : `${rawDistance.toFixed(2)} ม.`}
            </strong>
          </div>
          <div className="hero-calibration-item">
            <span className="hero-calibration-label">ระยะติดตั้งถึง{refName}</span>
            <strong
              className="hero-calibration-val"
              style={{ color: "var(--text-primary)" }}
            >
              {sensorToRef.toFixed(2)} ม.
            </strong>
          </div>
          <div className="hero-calibration-item">
            <span className="hero-calibration-label">เกณฑ์เฝ้าระวัง</span>
            <strong
              className="hero-calibration-val"
              style={{ color: hasWarning ? "#F59E0B" : "var(--text-muted)" }}
            >
              {hasWarning ? `${warningLevel! >= 0 ? "+" : ""}${warningLevel!.toFixed(2)} ม.` : "ไม่กำหนด"}
            </strong>
          </div>
          <div className="hero-calibration-item">
            <span className="hero-calibration-label">เกณฑ์วิกฤต</span>
            <strong
              className="hero-calibration-val"
              style={{ color: hasCritical ? "#EF4444" : "var(--text-muted)" }}
            >
              {hasCritical ? `${criticalLevel! >= 0 ? "+" : ""}${criticalLevel!.toFixed(2)} ม.` : "ไม่กำหนด"}
            </strong>
          </div>
        </div>
      </div>

      {/* ── 3. VIEW MODE A: INTERACTIVE METRIC / KPI FILTER TABS (Idea #2) ── */}
      {viewMode === "sensors" ? (
        <div
          className="telemetry-bento-grid"
          style={{
            marginBottom: "1.75rem",
          }}
        >
          {/* Metric Tab 1: อุณหภูมิอากาศ */}
          <div
            role="button"
            tabIndex={0}
            className="telemetry-metric-card"
            onClick={() => setActiveMetric("temp")}
            style={{
              background:
                activeMetric === "temp"
                  ? "rgba(245, 158, 11, 0.08)"
                  : "rgba(255, 255, 255, 0.03)",
              border:
                activeMetric === "temp"
                  ? "1.5px solid #F59E0B"
                  : "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "1.125rem",
              padding: "1.35rem 1.5rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "0.75rem",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{ fontSize: "1rem", color: "#E2E8F0", fontWeight: 600 }}
              >
                อุณหภูมิอากาศ
              </span>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: "rgba(245, 158, 11, 0.15)",
                  color: "#F59E0B",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ThermometerIcon size={22} />
              </div>
            </div>
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "0.35rem",
                  marginBottom: "0.25rem",
                }}
              >
                <span
                  style={{
                    fontSize: "2rem",
                    fontWeight: 800,
                    color: isOffline ? "var(--text-muted)" : "#FFFFFF",
                    fontFamily: "monospace",
                  }}
                >
                  {isOffline ? "-" : temp.toFixed(1)}
                </span>
                {!isOffline && (
                  <span
                    style={{
                      fontSize: "1rem",
                      color: "var(--text-secondary)",
                      fontWeight: 600,
                    }}
                  >
                    °C
                  </span>
                )}
              </div>
              {!isOffline && (
                <div style={{ marginTop: "0.5rem" }}>
                  <div
                    style={{
                      height: 6,
                      width: "100%",
                      background: "rgba(255, 255, 255, 0.08)",
                      borderRadius: 9999,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(100, Math.max(0, Math.round(((temp - 15) / (45 - 15)) * 100)))}%`,
                        background: temp > 35 ? "#EF4444" : temp > 28 ? "#F59E0B" : "#10B981",
                        borderRadius: 9999,
                        transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "0.35rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: temp > 35 ? "#EF4444" : temp > 28 ? "#F59E0B" : "#10B981",
                      }}
                    >
                      {temp > 35 ? "อากาศร้อนจัด" : temp > 28 ? "สภาพอากาศปกติ" : "อากาศเย็น"}
                    </span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        fontFamily: "monospace",
                      }}
                    >
                      เซนเซอร์อากาศ
                    </span>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Metric Tab 2: ความชื้นสัมพัทธ์ */}
          <div
            role="button"
            tabIndex={0}
            className="telemetry-metric-card"
            onClick={() => setActiveMetric("hum")}
            style={{
              background:
                activeMetric === "hum"
                  ? "rgba(56, 189, 248, 0.08)"
                  : "rgba(255, 255, 255, 0.03)",
              border:
                activeMetric === "hum"
                  ? "1.5px solid var(--sky-highlight)"
                  : "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "1.125rem",
              padding: "1.35rem 1.5rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "0.75rem",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{ fontSize: "1rem", color: "#E2E8F0", fontWeight: 600 }}
              >
                ความชื้นสัมพัทธ์
              </span>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: "rgba(56, 189, 248, 0.15)",
                  color: "var(--sky-highlight)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <DropletsIcon size={22} />
              </div>
            </div>
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "0.35rem",
                  marginBottom: "0.25rem",
                }}
              >
                <span
                  style={{
                    fontSize: "2rem",
                    fontWeight: 800,
                    color: isOffline ? "var(--text-muted)" : "#FFFFFF",
                    fontFamily: "monospace",
                  }}
                >
                  {isOffline ? "-" : hum.toFixed(1)}
                </span>
                {!isOffline && (
                  <span
                    style={{
                      fontSize: "1rem",
                      color: "var(--text-secondary)",
                      fontWeight: 600,
                    }}
                  >
                    %RH
                  </span>
                )}
              </div>
              {!isOffline && (
                <div style={{ marginTop: "0.5rem" }}>
                  <div
                    style={{
                      height: 6,
                      width: "100%",
                      background: "rgba(255, 255, 255, 0.08)",
                      borderRadius: 9999,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(100, Math.max(0, hum))}%`,
                        background: "#38BDF8",
                        borderRadius: 9999,
                        transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "0.35rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "#38BDF8",
                      }}
                    >
                      {hum > 80 ? "ความชื้นสูงมาก" : hum > 50 ? "ความชื้นปกติ" : "อากาศแห้ง"}
                    </span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        fontFamily: "monospace",
                      }}
                    >
                      {hum.toFixed(0)}%
                    </span>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Metric Tab 3: ระดับพลังงานแบตเตอรี่ */}
          <div
            role="button"
            tabIndex={0}
            className="telemetry-metric-card"
            onClick={() => setActiveMetric("batt")}
            style={{
              background:
                activeMetric === "batt"
                  ? "rgba(16, 185, 129, 0.08)"
                  : "rgba(255, 255, 255, 0.03)",
              border:
                activeMetric === "batt"
                  ? "1.5px solid #10B981"
                  : "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "1.125rem",
              padding: "1.35rem 1.5rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "0.75rem",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{ fontSize: "1rem", color: "#E2E8F0", fontWeight: 600 }}
              >
                แบตเตอรี่คงเหลือ
              </span>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background:
                    battPercent > 20
                      ? "rgba(16, 185, 129, 0.15)"
                      : "rgba(239, 68, 68, 0.15)",
                  color: battPercent > 20 ? "#10B981" : "#EF4444",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {battPercent > 20 ? (
                  <BatteryChargingIcon size={22} />
                ) : (
                  <BatteryLowIcon size={22} />
                )}
              </div>
            </div>
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "0.35rem",
                  marginBottom: "0.25rem",
                }}
              >
                <span
                  style={{
                    fontSize: "2rem",
                    fontWeight: 800,
                    color: isOffline ? "var(--text-muted)" : "#FFFFFF",
                    fontFamily: "monospace",
                  }}
                >
                  {isOffline ? "-" : battPercent}
                </span>
                {!isOffline && (
                  <span
                    style={{
                      fontSize: "1rem",
                      color: "var(--text-secondary)",
                      fontWeight: 600,
                    }}
                  >
                    %
                  </span>
                )}
              </div>
              {!isOffline && (
                <div style={{ marginTop: "0.5rem" }}>
                  {/* เส้นแสดงเปอร์เซ็นต์แบตเตอรี่พร้อมรหัสสีตามระดับ */}
                  <div
                    style={{
                      height: 6,
                      width: "100%",
                      background: "rgba(255, 255, 255, 0.08)",
                      borderRadius: 9999,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(100, Math.max(0, battPercent))}%`,
                        background:
                          battPercent > 50
                            ? "#10B981"
                            : battPercent > 20
                            ? "#F59E0B"
                            : "#EF4444",
                        borderRadius: 9999,
                        transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "0.35rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color:
                          battPercent > 50
                            ? "#10B981"
                            : battPercent > 20
                            ? "#F59E0B"
                            : "#EF4444",
                      }}
                    >
                      {battPercent > 50
                        ? "พร้อมใช้งาน"
                        : battPercent > 20
                        ? "แบตเตอรี่ปานกลาง"
                        : "แบตเตอรี่ต่ำ"}
                    </span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        fontFamily: "monospace",
                      }}
                    >
                      {battVolt.toFixed(1)}V
                    </span>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Metric Tab 4: ความแรงสัญญาณ (RSSI) - Primary Metric */}
          <div
            role="button"
            tabIndex={0}
            className="telemetry-metric-card"
            onClick={() => setActiveMetric("rssi")}
            style={{
              background:
                activeMetric === "rssi"
                  ? `${signalColor}15`
                  : "rgba(255, 255, 255, 0.03)",
              border:
                activeMetric === "rssi"
                  ? `1.5px solid ${signalColor}`
                  : "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "1.125rem",
              padding: "1.35rem 1.5rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "0.75rem",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{ fontSize: "1rem", color: "#E2E8F0", fontWeight: 600 }}
              >
                ความแรงสัญญาณ (RSSI)
              </span>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: `${signalColor}20`,
                  color: signalColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <WifiIcon size={22} />
              </div>
            </div>
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "0.35rem",
                  marginBottom: "0.25rem",
                }}
              >
                <span
                  style={{
                    fontSize: "2rem",
                    fontWeight: 800,
                    color: isOffline ? "var(--text-muted)" : "#FFFFFF",
                    fontFamily: "monospace",
                  }}
                >
                  {isOffline ? "-" : rssi}
                </span>
                {!isOffline && (
                  <span
                    style={{
                      fontSize: "1rem",
                      color: "var(--text-secondary)",
                      fontWeight: 600,
                    }}
                  >
                    dBm
                  </span>
                )}
              </div>
              {!isOffline && (
                <div style={{ marginTop: "0.5rem" }}>
                  <div
                    style={{
                      height: 6,
                      width: "100%",
                      background: "rgba(255, 255, 255, 0.08)",
                      borderRadius: 9999,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(
                          100,
                          Math.max(0, Math.round(((rssi - -120) / (-50 - -120)) * 100))
                        )}%`,
                        background: signalColor,
                        borderRadius: 9999,
                        transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "0.35rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: signalColor,
                      }}
                    >
                      {signalRating}
                    </span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        fontFamily: "monospace",
                      }}
                    >
                      LoRaWAN
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Metric Tab 5: แรงดันไฟฟ้าโซลาร์ - Secondary Diagnostic */}
          <div
            role="button"
            tabIndex={0}
            className={`telemetry-metric-card telemetry-secondary-metric ${showAllMetrics ? "show" : ""}`}
            onClick={() => setActiveMetric("volt")}
            style={{
              background:
                activeMetric === "volt"
                  ? "rgba(250, 204, 21, 0.08)"
                  : "rgba(255, 255, 255, 0.03)",
              border:
                activeMetric === "volt"
                  ? "1.5px solid #FACC15"
                  : "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "1.125rem",
              padding: "1.35rem 1.5rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "0.75rem",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{ fontSize: "1rem", color: "#E2E8F0", fontWeight: 600 }}
              >
                แรงดันไฟฟ้าโซลาร์
              </span>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: "rgba(250, 204, 21, 0.15)",
                  color: "#FACC15",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ZapIcon size={22} />
              </div>
            </div>
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "0.35rem",
                  marginBottom: "0.25rem",
                }}
              >
                <span
                  style={{
                    fontSize: "2rem",
                    fontWeight: 800,
                    color: isOffline ? "var(--text-muted)" : "#FFFFFF",
                    fontFamily: "monospace",
                  }}
                >
                  {isOffline ? "-" : battVolt.toFixed(1)}
                </span>
                {!isOffline && (
                  <span
                    style={{
                      fontSize: "1rem",
                      color: "var(--text-secondary)",
                      fontWeight: 600,
                    }}
                  >
                    V
                  </span>
                )}
              </div>
              {!isOffline && (
                <div style={{ marginTop: "0.5rem" }}>
                  <div
                    style={{
                      height: 6,
                      width: "100%",
                      background: "rgba(255, 255, 255, 0.08)",
                      borderRadius: 9999,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(
                          100,
                          Math.max(
                            0,
                            battVolt > 6
                              ? Math.round(((battVolt - 11.0) / (14.5 - 11.0)) * 100)
                              : Math.round(((battVolt - 3.2) / (4.2 - 3.2)) * 100)
                          )
                        )}%`,
                        background: "#FACC15",
                        borderRadius: 9999,
                        transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "0.35rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "#FACC15",
                      }}
                    >
                      {battVolt >= 12.5 || (battVolt < 6 && battVolt >= 3.7) ? "จ่ายไฟปกติ" : "แรงดันต่ำ"}
                    </span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        fontFamily: "monospace",
                      }}
                    >
                      โซลาร์เซลล์
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Metric Tab 6: อัตราสัญญาณต่อสัญญาณรบกวน (SNR) - Secondary Diagnostic */}
          <div
            role="button"
            tabIndex={0}
            className={`telemetry-metric-card telemetry-secondary-metric ${showAllMetrics ? "show" : ""}`}
            onClick={() => setActiveMetric("snr")}
            style={{
              background:
                activeMetric === "snr"
                  ? "rgba(37, 99, 235, 0.08)"
                  : "rgba(255, 255, 255, 0.03)",
              border:
                activeMetric === "snr"
                  ? "1.5px solid var(--primary-accent)"
                  : "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "1.125rem",
              padding: "1.35rem 1.5rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "0.75rem",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{ fontSize: "1rem", color: "#E2E8F0", fontWeight: 600 }}
              >
                คุณภาพสัญญาณ (SNR)
              </span>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: "rgba(37, 99, 235, 0.15)",
                  color: "#38BDF8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <RadioIcon size={22} />
              </div>
            </div>
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "0.35rem",
                  marginBottom: "0.25rem",
                }}
              >
                <span
                  style={{
                    fontSize: "2rem",
                    fontWeight: 800,
                    color: isOffline ? "var(--text-muted)" : "#FFFFFF",
                    fontFamily: "monospace",
                  }}
                >
                  {isOffline ? "-" : snr.toFixed(1)}
                </span>
                {!isOffline && (
                  <span
                    style={{
                      fontSize: "1rem",
                      color: "var(--text-secondary)",
                      fontWeight: 600,
                    }}
                  >
                    dB
                  </span>
                )}
              </div>
              {!isOffline && (
                <div style={{ marginTop: "0.5rem" }}>
                  <div
                    style={{
                      height: 6,
                      width: "100%",
                      background: "rgba(255, 255, 255, 0.08)",
                      borderRadius: 9999,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(
                          100,
                          Math.max(0, Math.round(((snr - -10) / (15 - -10)) * 100))
                        )}%`,
                        background: "#38BDF8",
                        borderRadius: 9999,
                        transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "0.35rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: snr >= 0 ? "#10B981" : "#EF4444",
                      }}
                    >
                      {snr >= 5 ? "สัญญาณคมชัด" : snr >= 0 ? "สัญญาณปกติ" : "สัญญาณรบกวนสูง"}
                    </span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        fontFamily: "monospace",
                      }}
                    >
                      SNR {snr.toFixed(1)} dB
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Metric Tab 7: ความเอียงทางกายภาพ (Tilt Incline X & Y) - Secondary Diagnostic */}
          <div
            role="button"
            tabIndex={0}
            className={`telemetry-metric-card telemetry-secondary-metric ${showAllMetrics ? "show" : ""}`}
            onClick={() => setActiveMetric("tilt")}
            style={{
              background:
                activeMetric === "tilt"
                  ? "rgba(37, 99, 235, 0.08)"
                  : "rgba(255, 255, 255, 0.03)",
              border:
                activeMetric === "tilt"
                  ? "1.5px solid var(--primary-accent)"
                  : "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "1.125rem",
              padding: "1.35rem 1.5rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "0.75rem",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{ fontSize: "1rem", color: "#E2E8F0", fontWeight: 600 }}
              >
                มุมเอียงเสา (Tilt X/Y)
              </span>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: "rgba(37, 99, 235, 0.15)",
                  color: "#38BDF8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CompassIcon size={22} />
              </div>
            </div>
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "0.5rem",
                  marginBottom: "0.25rem",
                  flexWrap: "wrap",
                }}
              >
                {isOffline ? (
                  <span
                    style={{
                      fontSize: "2rem",
                      fontWeight: 800,
                      color: "var(--text-muted)",
                      fontFamily: "monospace",
                    }}
                  >
                    -
                  </span>
                ) : (
                  <>
                    <span
                      style={{
                        fontSize: "clamp(1.15rem, 3.8vw, 1.35rem)",
                        fontWeight: 800,
                        color: "#FFFFFF",
                        fontFamily: "monospace",
                      }}
                    >
                      X {tiltX > 0 ? `+${tiltX.toFixed(1)}` : tiltX.toFixed(1)}°
                    </span>
                    <span
                      style={{
                        fontSize: "clamp(1.15rem, 3.8vw, 1.35rem)",
                        fontWeight: 800,
                        color: "#FFFFFF",
                        fontFamily: "monospace",
                      }}
                    >
                      Y {tiltY > 0 ? `+${tiltY.toFixed(1)}` : tiltY.toFixed(1)}°
                    </span>
                  </>
                )}
              </div>
              {!isOffline && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "0.5rem",
                    paddingTop: "0.4rem",
                    borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                    flexWrap: "wrap",
                    gap: "0.25rem",
                  }}
                >
                  {(() => {
                    const relTotal = station.relativeTotalTilt != null ? Number(station.relativeTotalTilt) : null;
                    const isTilted = Boolean(station.isPoleTilted || (relTotal != null && relTotal > 15));
                    return (
                      <>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            color: isTilted ? "#F59E0B" : "#10B981",
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: isTilted ? "#F59E0B" : "#10B981",
                              flexShrink: 0,
                            }}
                          />
                          {isTilted
                            ? `เสาเอียง ${relTotal != null && !isNaN(relTotal) ? `${relTotal.toFixed(1)}°` : ""} (>15°)`
                            : `ได้ระนาบ (${relTotal != null && !isNaN(relTotal) ? `±${relTotal.toFixed(1)}°` : "ปกติ"})`}
                        </span>
                        <span
                          style={{
                            fontSize: "0.6875rem",
                            color: "var(--text-muted)",
                            fontFamily: "monospace",
                          }}
                          title={`ระนาบอ้างอิง: X=${station.tiltOffsetX ?? 0}°, Y=${station.tiltOffsetY ?? 0}°`}
                        >
                          Ref: {station.tiltOffsetX ?? 0}°, {station.tiltOffsetY ?? 0}°
                        </span>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Metric Tab 8: จุดรับส่งข้อมูลเกตเวย์ - Secondary Diagnostic */}
          <div
            role="button"
            tabIndex={0}
            className={`telemetry-metric-card telemetry-secondary-metric ${showAllMetrics ? "show" : ""}`}
            onClick={() => setActiveMetric("gateway")}
            style={{
              background:
                activeMetric === "gateway"
                  ? "rgba(34, 197, 94, 0.08)"
                  : "rgba(255, 255, 255, 0.03)",
              border:
                activeMetric === "gateway"
                  ? "1.5px solid #22C55E"
                  : "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "1.125rem",
              padding: "1.35rem 1.5rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "0.75rem",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{ fontSize: "1rem", color: "#E2E8F0", fontWeight: 600 }}
              >
                เกตเวย์เชื่อมต่อ
              </span>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: "rgba(34, 197, 94, 0.15)",
                  color: "#22C55E",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ActivityIcon size={22} />
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: "1.375rem",
                  fontWeight: 800,
                  color: isOffline ? "var(--text-muted)" : "#FFFFFF",
                  marginBottom: "0.25rem",
                }}
              >
                {isOffline ? "-" : gateway}
              </div>
              <div
                style={{
                  fontSize: "0.8125rem",
                  color: isOffline ? "var(--text-muted)" : "#10B981",
                  fontWeight: 600,
                }}
              >
                {isOffline ? "ออฟไลน์" : `สถานะ ${gatewayStatus}`}
              </div>
            </div>
          </div>

          {/* Hardware Specifications & Geolocation - Secondary Diagnostic */}
          <div
            className={`telemetry-hw-specs-card telemetry-secondary-metric ${showAllMetrics ? "show" : ""}`}
            style={{
              gridColumn: "1 / -1",
              background: "rgba(8, 12, 20, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "1rem",
              padding: "1rem 1.25rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "1rem",
              fontSize: "0.8125rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
              <CpuIcon size={18} style={{ color: "var(--sky-highlight)" }} />
              <div>
                <span style={{ color: "var(--text-secondary)" }}>รุ่นอุปกรณ์ </span>
                <strong style={{ color: "#FFFFFF", fontWeight: 700 }}>
                  {model}
                </strong>
              </div>
            </div>

            <div>
              <span style={{ color: "var(--text-secondary)" }}>เฟิร์มแวร์ </span>
              <strong style={{ color: "#FFFFFF", fontWeight: 700 }}>
                {firmware}
              </strong>
            </div>

            <div>
              <span style={{ color: "var(--text-secondary)" }}>
                ประเภทแหล่งน้ำ{" "}
              </span>
              <strong style={{ color: "#FFFFFF", fontWeight: 700 }}>
                {station.stationType || "แม่น้ำ"}
              </strong>
            </div>

            <div>
              <span style={{ color: "var(--text-secondary)" }}>พิกัดดาวเทียม </span>
              <strong style={{ color: "var(--sky-highlight)", fontWeight: 700, fontFamily: "monospace" }}>
                {station.lat.toFixed(6)}, {station.lng.toFixed(6)}
              </strong>
            </div>
          </div>

          {/* Mobile Expand / Collapse Secondary Metrics Row */}
          <div className="telemetry-metrics-toggle-row">
            <button
              type="button"
              onClick={() => setShowAllMetrics((prev) => !prev)}
              className="telemetry-metrics-toggle-btn"
              aria-expanded={showAllMetrics}
            >
              <span>
                {showAllMetrics
                  ? "ซ่อนข้อมูลเพิ่มเติม"
                  : "ดูเซนเซอร์และข้อมูลอุปกรณ์เพิ่มเติม"}
              </span>
              <span style={{ fontSize: "10px", marginLeft: "4px" }}>
                {showAllMetrics ? "▲" : "▼"}
              </span>
            </button>
          </div>
        </div>
      ) : (
        /* ── 3. VIEW MODE B: LIVE WATER LEVEL TREND AREA CHART (Tufte Data-Ink) ── */
        <div
          className="telemetry-chart-card"
          style={{
            background: "rgba(8, 12, 20, 0.7)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "1.25rem",
            padding: "1.5rem 1.75rem",
            marginBottom: "1.75rem",
          }}
        >
          <div
            className="telemetry-chart-header"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1rem",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <ActivityIcon size={18} style={{ color: "var(--sky-highlight)", flexShrink: 0 }} />
              <h3
                style={{
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: "#FFFFFF",
                  margin: 0,
                  whiteSpace: "nowrap",
                }}
              >
                กราฟแนวโน้มระดับน้ำ
              </h3>
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-secondary)",
                  background: "rgba(255, 255, 255, 0.05)",
                  padding: "0.15rem 0.5rem",
                  borderRadius: "9999px",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  whiteSpace: "nowrap",
                }}
              >
                เทียบ{refName}
              </span>
            </div>
          </div>

          {isOffline ? (
            <div
              style={{
                width: "100%",
                height: 260,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.75rem",
                background: "rgba(0, 0, 0, 0.25)",
                borderRadius: "0.75rem",
                border: "1px dashed rgba(245, 158, 11, 0.3)",
              }}
            >
              <AlertTriangleIcon size={32} style={{ color: "#F59E0B" }} />
              <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#E2E8F0" }}>
                สถานีออฟไลน์
              </div>
              <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                งดแสดงผลข้อมูลระดับน้ำขณะปิดให้บริการ
              </div>
            </div>
          ) : (
            <div style={{ width: "100%", minWidth: 0, height: 260 }}>
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth="100%"
                minHeight={260}
                initialDimension={{ width: 350, height: 260 }}
              >
              <AreaChart
                data={chartData}
                margin={{ top: 15, right: 15, left: 10, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="stationWaterGrad"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#38BDF8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255, 255, 255, 0.05)"
                  vertical={false}
                />
                <XAxis
                  dataKey="time"
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={28}
                />
                <YAxis
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  domain={["auto", "auto"]}
                  tickCount={6}
                  tickFormatter={(val: number) =>
                    `${val >= 0 ? "+" : ""}${val.toFixed(2)} ม.`
                  }
                  width={62}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(15, 23, 42, 0.95)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "0.5rem",
                    color: "#FFFFFF",
                    fontSize: "0.8125rem",
                  }}
                  formatter={(val: any) => [
                    `${Number(val) >= 0 ? "+" : ""}${Number(val).toFixed(3)} ม.`,
                    `ระดับน้ำเทียบ${refName}`,
                  ]}
                />
                {/* 0.00m Reference Point Line */}
                <ReferenceLine
                  y={0}
                  stroke="#38BDF8"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  label={{
                    value: `${refName} (0.00 ม.)`,
                    fill: "#38BDF8",
                    fontSize: 11,
                    position: "right",
                  }}
                />
                {hasWarning && (
                  <ReferenceLine
                    y={warningLevel!}
                    stroke="#F59E0B"
                    strokeDasharray="4 4"
                    label={{
                      value: `เฝ้าระวัง (${warningLevel! >= 0 ? "+" : ""}${warningLevel!.toFixed(2)}ม.)`,
                      fill: "#F59E0B",
                      fontSize: 10,
                      position: "right",
                    }}
                  />
                )}
                {hasCritical && (
                  <ReferenceLine
                    y={criticalLevel!}
                    stroke="#EF4444"
                    strokeDasharray="4 4"
                    label={{
                      value: `วิกฤต (${criticalLevel! >= 0 ? "+" : ""}${criticalLevel!.toFixed(2)}ม.)`,
                      fill: "#EF4444",
                      fontSize: 10,
                      position: "right",
                    }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="level"
                  stroke="#38BDF8"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#stationWaterGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          )}
        </div>
      )}
    </div>
  );
});

export default StationTelemetryHub;
