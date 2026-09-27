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
  const formattedTime = station.lastUpdated
    ? new Date(station.lastUpdated).toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "เมื่อสักครู่";

  // Chart data from recent readings
  const chartData = useMemo(() => {
    if (recentReadings.length > 0) {
      return [...recentReadings].reverse().map((r) => ({
        time: new Date(r.timestamp).toLocaleTimeString("th-TH", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        level:
          r.raw_distance !== null && r.raw_distance !== undefined
            ? Number((sensorToRef - Number(r.raw_distance)).toFixed(3))
            : (r.water_level !== null
                ? Number(Number(r.water_level).toFixed(3))
                : waterLevel),
      }));
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
      className="bento-card animate-fade-in"
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
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "0.35rem",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontFamily: "monospace",
                fontSize: "1rem",
                fontWeight: 800,
                color: "#38BDF8",
                background: "rgba(37, 99, 235, 0.15)",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                padding: "0.25rem 0.65rem",
                borderRadius: "0.5rem",
                letterSpacing: "0.04em",
              }}
            >
              {station.id}
            </span>
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: 800,
                color: "#FFFFFF",
                margin: 0,
                letterSpacing: "-0.02em",
              }}
            >
              {station.name}
            </h2>
            <div
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
              }}
            >
              <StatusIcon size={15} />
              <span>{statusLabel}</span>
            </div>
          </div>

          <div
            style={{
              fontSize: "0.875rem",
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              gap: "0.875rem",
              flexWrap: "wrap",
              fontWeight: 500,
            }}
          >
            <span
              style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}
            >
              <MapPinIcon size={15} style={{ color: "var(--sky-highlight)" }} />
              <span>{station.location || "จุดบริการลุ่มน้ำ"}</span>
            </span>
            <span>·</span>
            <span>
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

        {/* Right: Space-Efficient Controls (Segmented View Switcher + Refined CTA) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          {/* Segmented Control / Sliding Pill Switcher (User Idea #1) */}
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
                gap: "0.4rem",
                padding: "0.4rem 0.85rem",
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
                gap: "0.4rem",
                padding: "0.4rem 0.85rem",
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
              }}
            >
              <BarChart3Icon size={14} />
              <span>กราฟแนวโน้ม</span>
            </button>
          </div>

          {/* Refined, Space-Efficient CTA Button (Replacing chunky neon button in Image 1) */}
          <button
            type="button"
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
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(37, 99, 235, 0.15)";
              e.currentTarget.style.borderColor = "var(--cyan-glow)";
              e.currentTarget.style.color = "var(--cyan-glow)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.14)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
          >
            <ActivityIcon size={15} />
            <span>กราฟเชิงลึก ↗</span>
          </button>
        </div>
      </div>

      {/* Offline Status Alert Banner */}
      {isOffline && (
        <div
          style={{
            marginBottom: "1.25rem",
            padding: "10px 16px",
            borderRadius: "0.75rem",
            background: "rgba(245, 158, 11, 0.08)",
            border: "1px solid rgba(245, 158, 11, 0.25)",
            color: "#F59E0B",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "0.875rem",
            fontWeight: 600,
          }}
        >
          <AlertTriangleIcon size={18} style={{ flexShrink: 0 }} />
          <span>สถานีปิดให้บริการชั่วคราว (Offline) — งดส่งการแจ้งเตือนและถ่ายทอดข้อมูล</span>
        </div>
      )}

      {/* ── 2. PRIMARY WATER LEVEL & SAFETY SCALE ── */}
      <div
        style={{
          background: "rgba(8, 12, 20, 0.8)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "1.25rem",
          padding: "1.5rem 1.75rem",
          marginBottom: "1.25rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1.25rem",
            marginBottom: "1.25rem",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.625rem",
                marginBottom: "0.35rem",
              }}
            >
              <div style={{ color: "var(--sky-highlight)", display: "flex" }}>
                <DropletsIcon size={22} />
              </div>
              <span
                style={{
                  fontSize: "1.0625rem",
                  fontWeight: 700,
                  color: "#E2E8F0",
                }}
              >
                ระดับน้ำเทียบกับ{refName}
              </span>
            </div>
            <div
              style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}
            >
              {isOffline ? (
                <span
                  style={{
                    fontSize: "3rem",
                    fontWeight: 700,
                    color: "var(--text-muted)",
                    lineHeight: 1,
                  }}
                >
                  -
                </span>
              ) : (
                <>
                  <span
                    style={{
                      fontSize: "3rem",
                      fontWeight: 900,
                      fontFamily: "monospace, inherit",
                      color: waterLevel >= 0 ? "#F87171" : "#38BDF8",
                      letterSpacing: "-0.03em",
                      lineHeight: 1,
                    }}
                  >
                    {waterLevel >= 0
                      ? `+${waterLevel.toFixed(3)}`
                      : waterLevel.toFixed(3)}
                  </span>
                  <span
                    style={{
                      fontSize: "1.25rem",
                      color: "var(--text-secondary)",
                      fontWeight: 700,
                    }}
                  >
                    เมตร (ม.)
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Qualitative Human Assessment Box */}
          <div
            style={{
              padding: "0.875rem 1.5rem",
              borderRadius: "1rem",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              textAlign: "right",
            }}
          >
            <div
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.875rem",
                marginBottom: "0.25rem",
                fontWeight: 500,
              }}
            >
              สถานะเทียบกับ{refName}
            </div>
            <div
              style={{
                color: isOffline
                  ? "#F59E0B"
                  : waterLevel < 0
                    ? "#10B981"
                    : waterLevel === 0
                      ? "#F59E0B"
                      : "#EF4444",
                fontSize: "1.125rem",
                fontWeight: 800,
              }}
            >
              {isOffline
                ? "ออฟไลน์"
                : waterLevel < 0
                ? `ต่ำกว่า${refName} ${Math.abs(waterLevel).toFixed(3)} ม.`
                : waterLevel === 0
                  ? `เสมอ${refName} พอดี (0.00 ม.)`
                  : `สูงกว่า${refName} ${waterLevel.toFixed(3)} ม. (น้ำล้น)`}
            </div>
          </div>
        </div>

        {/* Blind Zone Warning Banner if triggered */}
        {isBlindZone && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.75rem 1rem",
              borderRadius: "0.75rem",
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              color: "#F87171",
              fontSize: "0.875rem",
              fontWeight: 600,
              marginBottom: "1rem",
            }}
          >
            <AlertTriangleIcon size={18} />
            <span>
              คำเตือน ผิวน้ำเข้าสู่ระยะบอดของเซนเซอร์ A01NYUB (&lt; 0.28 ม.)
              เซนเซอร์อาจจมน้ำหรืออ่านค่าคลาดเคลื่อน
            </span>
          </div>
        )}

        {/* Reference Specs & Calibration Summary */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "0.75rem",
            padding: "0.75rem 1rem",
            borderRadius: "0.75rem",
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            fontSize: "0.8125rem",
          }}
        >
          <div>
            <span style={{ color: "var(--text-secondary)" }}>
              ระยะผิวน้ำที่เซนเซอร์วัดได้{" "}
            </span>
            <strong
              style={{ color: isOffline ? "var(--text-muted)" : "var(--text-primary)", fontFamily: "monospace" }}
            >
              {isOffline ? "-" : `${rawDistance.toFixed(3)} ม.`}
            </strong>
          </div>
          <div>
            <span style={{ color: "var(--text-secondary)" }}>
              ระยะติดตั้งถึง{refName}{" "}
            </span>
            <strong
              style={{ color: "var(--text-primary)", fontFamily: "monospace" }}
            >
              {sensorToRef.toFixed(2)} ม.
            </strong>
          </div>
          <div>
            <span style={{ color: "var(--text-secondary)" }}>
              เกณฑ์เฝ้าระวัง{" "}
            </span>
            <strong
              style={{ color: hasWarning ? "#F59E0B" : "var(--text-muted)" }}
            >
              {hasWarning
                ? `${warningLevel! >= 0 ? "+" : ""}${warningLevel!.toFixed(2)} ม.`
                : "ไม่กำหนด"}
            </strong>
          </div>
          <div>
            <span style={{ color: "var(--text-secondary)" }}>เกณฑ์วิกฤต </span>
            <strong
              style={{ color: hasCritical ? "#EF4444" : "var(--text-muted)" }}
            >
              {hasCritical
                ? `${criticalLevel! >= 0 ? "+" : ""}${criticalLevel!.toFixed(2)} ม.`
                : "ไม่กำหนด"}
            </strong>
          </div>
        </div>
      </div>

      {/* ── 3. VIEW MODE A: INTERACTIVE METRIC / KPI FILTER TABS (Idea #2) ── */}
      {viewMode === "sensors" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.25rem",
            marginBottom: "1.75rem",
          }}
        >
          {/* Metric Tab 1: อุณหภูมิอากาศ */}
          <div
            role="button"
            tabIndex={0}
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

          {/* Metric Tab 4: แรงดันไฟฟ้าโซลาร์ */}
          <div
            role="button"
            tabIndex={0}
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

          {/* Metric Tab 5: ความแรงสัญญาณ RSSI */}
          <div
            role="button"
            tabIndex={0}
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

          {/* Metric Tab 6: อัตราสัญญาณต่อสัญญาณรบกวน (SNR) */}
          <div
            role="button"
            tabIndex={0}
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

          {/* Metric Tab 7: ความเอียงทางกายภาพ (Tilt Incline X & Y) */}
          <div
            role="button"
            tabIndex={0}
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
                  gap: "0.75rem",
                  marginBottom: "0.25rem",
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
                        fontSize: "1.5rem",
                        fontWeight: 800,
                        color: "#FFFFFF",
                        fontFamily: "monospace",
                      }}
                    >
                      X {tiltX > 0 ? `+${tiltX.toFixed(1)}` : tiltX.toFixed(1)}°
                    </span>
                    <span
                      style={{
                        fontSize: "1.5rem",
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

            </div>
          </div>

          {/* Metric Tab 8: จุดรับส่งข้อมูลเกตเวย์ */}
          <div
            role="button"
            tabIndex={0}
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
        </div>
      ) : (
        /* ── 3. VIEW MODE B: LIVE WATER LEVEL TREND AREA CHART (Tufte Data-Ink) ── */
        <div
          style={{
            background: "rgba(8, 12, 20, 0.7)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "1.25rem",
            padding: "1.5rem 1.75rem",
            marginBottom: "1.75rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1rem",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <ActivityIcon size={18} style={{ color: "var(--sky-highlight)" }} />
              <h3
                style={{
                  fontSize: "1.0625rem",
                  fontWeight: 700,
                  color: "#FFFFFF",
                  margin: 0,
                }}
              >
                กราฟแนวโน้มระดับน้ำเทียบกับ{refName}
              </h3>
            </div>
            <span
              style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}
            >
              เกณฑ์เฝ้าระวัง{" "}
              {hasWarning
                ? `${warningLevel! >= 0 ? "+" : ""}${warningLevel!.toFixed(2)} ม.`
                : "ไม่กำหนด"}{" "}
              · วิกฤต{" "}
              {hasCritical
                ? `${criticalLevel! >= 0 ? "+" : ""}${criticalLevel!.toFixed(2)} ม.`
                : "ไม่กำหนด"}
            </span>
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
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
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

      {/* ── 4. HARDWARE SPECIFICATIONS & PRECISE GEOLOCATION ── */}
      <div
        style={{
          background: "rgba(8, 12, 20, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "1rem",
          padding: "1.25rem 1.75rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1.25rem",
          fontSize: "0.875rem",
          marginBottom: "1.75rem",
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
          <strong style={{ color: "var(--sky-highlight)", fontWeight: 700 }}>
            {station.lat.toFixed(6)}, {station.lng.toFixed(6)}
          </strong>
        </div>
      </div>
    </div>
  );
});

export default StationTelemetryHub;
