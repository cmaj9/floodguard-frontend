import { useState, useEffect, useMemo, useRef, memo } from "react";
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
  AlertTriangleIcon,
  BarChart3Icon,
  ActivityIcon,
  CompassIcon,
  LayersIcon,
} from "../ui/Icons";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

interface StationTelemetryHubProps {
  station: Station;
  stations?: Station[];
  onSelectStation?: (stationId: string) => void;
}

type HubViewMode = "sensors" | "chart";
type ActiveMetricKey =
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
  stations,
  onSelectStation,
}: StationTelemetryHubProps) {
  const navigate = useNavigate();

  // View mode switcher: 'sensors' (8 Bento cards) or 'chart' (Live Trend Graph)
  const [viewMode, setViewMode] = useState<HubViewMode>("sensors");

  // Mobile expandable diagnostics toggle (shows primary by default, expands to 8)
  const [showAllMetrics, setShowAllMetrics] = useState(false);

  // Active Metric card highlight
  const [activeMetric, setActiveMetric] = useState<ActiveMetricKey>("temp");

  const [recentReadings, setRecentReadings] = useState<Reading[]>([]);

  // VisionOS Sliding Glass Pill indicator coordinates
  const trackRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const [sliderStyle, setSliderStyle] = useState<{ left: number; width: number; ready: boolean }>({
    left: 0,
    width: 0,
    ready: false,
  });

  useEffect(() => {
    const updateSlider = () => {
      const activeBtn = buttonRefs.current[station.id];
      const track = trackRef.current;
      if (activeBtn && track) {
        setSliderStyle({
          left: activeBtn.offsetLeft,
          width: activeBtn.offsetWidth,
          ready: true,
        });
      }
    };

    updateSlider();
    const frameId = requestAnimationFrame(updateSlider);
    window.addEventListener("resize", updateSlider);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", updateSlider);
    };
  }, [station.id, stations]);

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

  // Water level thresholds
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
  const isOffline = !station.isActive || station.operatingStatus === "offline";

  // Tactical Sonar status derivation
  let statusBadgeType: "normal" | "warning" | "critical" | "offline" = "normal";
  let statusText = `ระดับน้ำปกติ (ต่ำกว่า${refName})`;

  if (isOffline) {
    statusBadgeType = "offline";
    statusText = "ปิดให้บริการชั่วคราว (Offline)";
  } else if (hasCritical && waterLevel >= (criticalLevel as number)) {
    statusBadgeType = "critical";
    statusText = `ระดับน้ำวิกฤต (สูงกว่า${refName})`;
  } else if (hasWarning && waterLevel >= (warningLevel as number)) {
    statusBadgeType = "warning";
    statusText = "เกณฑ์เฝ้าระวังพิเศษ";
  } else if (waterLevel > 0) {
    statusBadgeType = "critical";
    statusText = `น้ำสูงกว่า${refName} (+${waterLevel.toFixed(2)} ม.)`;
  }

  // Signal Strength Rating
  let signalRating = "สัญญาณดีเยี่ยม";
  let signalColor = "var(--sonar-green)";
  if (rssi < -90) {
    signalRating = "สัญญาณอ่อน";
    signalColor = "var(--beacon-red)";
  } else if (rssi < -75) {
    signalRating = "สัญญาณปานกลาง";
    signalColor = "var(--tactical-amber)";
  }

  // Tilt Status
  const isTilted = station.isPoleTilted ?? (Math.abs(tiltX) > 15 || Math.abs(tiltY) > 15);

  // Format timestamp
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
  }, [recentReadings, sensorToRef, waterLevel]);

  return (
    <div
      className="bento-card animate-fade-in telemetry-hub-card"
      style={{
        background: "var(--card-surface)",
        borderRadius: "14px",
        border: "1px solid var(--card-border)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5), 0 1px 2px rgba(0, 0, 0, 0.3)",
        padding: "1.5rem",
        marginBottom: "1.75rem",
      }}
    >
      {/* ── 0. INTEGRATED STATION CAPSULE TRACK (VisionOS Floating Glass with Sliding Pill) ── */}
      {stations && stations.length > 1 && onSelectStation && (
        <div
          className="station-capsule-track-container"
          style={{
            marginBottom: "1.25rem",
            paddingBottom: "1rem",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          {/* Scroll wrapper for multi-device touch scrolling */}
          <div
            className="vision-capsule-scroll-wrapper"
            style={{
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
              padding: "2px 2px",
            }}
          >
            {/* The VisionOS Frosted Glass Pill Dock */}
            <div
              ref={trackRef}
              role="tablist"
              aria-label="เลือกสถานีตรวจวัด"
              className="vision-glass-dock"
              style={{
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                background: "rgba(8, 14, 22, 0.75)",
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
                border: "1px solid rgba(255, 255, 255, 0.09)",
                borderRadius: "9999px",
                padding: "4px",
                boxShadow:
                  "inset 0 1.5px 3px rgba(0, 0, 0, 0.6), inset 0 0.5px 0 rgba(255, 255, 255, 0.1), 0 4px 16px rgba(0, 0, 0, 0.4)",
              }}
            >
              {/* Animated Floating Glass Pill Indicator */}
              {sliderStyle.ready && (
                <div
                  className="vision-sliding-glass-pill"
                  style={{
                    position: "absolute",
                    top: "4px",
                    bottom: "4px",
                    left: `${sliderStyle.left}px`,
                    width: `${sliderStyle.width}px`,
                    borderRadius: "9999px",
                    background:
                      "linear-gradient(135deg, rgba(2, 132, 199, 0.3) 0%, rgba(14, 165, 233, 0.14) 100%)",
                    border: "1px solid rgba(56, 189, 248, 0.55)",
                    boxShadow:
                      "0 0 16px rgba(2, 132, 199, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.3), inset 0 -1px 0 rgba(0, 0, 0, 0.3)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    transition:
                      "left 0.35s cubic-bezier(0.16, 1, 0.3, 1), width 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
                    pointerEvents: "none",
                    zIndex: 1,
                  }}
                />
              )}

              {/* Station Pills */}
              {stations.map((s) => {
                const isSelected = s.id === station.id;
                const isOffline = !s.isActive || s.operatingStatus === "offline";

                let dotColor = "var(--sonar-green)";
                if (isOffline) {
                  dotColor = "#94a3b8";
                } else if (s.status === "critical") {
                  dotColor = "var(--beacon-red)";
                } else if (s.status === "warning") {
                  dotColor = "var(--tactical-amber)";
                }

                return (
                  <button
                    key={`hub-capsule-${s.id}`}
                    ref={(el) => {
                      buttonRefs.current[s.id] = el;
                    }}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => onSelectStation(s.id)}
                    className={`vision-capsule-item ${isSelected ? "selected" : ""}`}
                    style={{
                      position: "relative",
                      zIndex: 2,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "6px 14px",
                      borderRadius: "9999px",
                      fontSize: "0.8125rem",
                      fontWeight: isSelected ? 600 : 500,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                      minHeight: "34px",
                      outline: "none",
                      border: "none",
                      background: "transparent",
                      color: isSelected ? "#f0f9ff" : "#94a3b8",
                      transition: "color 0.2s ease, transform 0.15s ease",
                    }}
                  >
                    {/* Sonar Radar Dot with Pulse Ripple */}
                    <span
                      style={{
                        position: "relative",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "8px",
                        height: "8px",
                        flexShrink: 0,
                      }}
                    >
                      {isSelected && !isOffline && (
                        <span
                          className="sonar-pulse-ring"
                          style={{
                            position: "absolute",
                            width: "100%",
                            height: "100%",
                            borderRadius: "9999px",
                            backgroundColor: dotColor,
                            opacity: 0.75,
                          }}
                        />
                      )}
                      <span
                        style={{
                          position: "relative",
                          width: "7px",
                          height: "7px",
                          borderRadius: "9999px",
                          backgroundColor: dotColor,
                          boxShadow:
                            !isOffline && isSelected
                              ? `0 0 8px ${dotColor}`
                              : "none",
                        }}
                      />
                    </span>

                    {/* Station ID Tag */}
                    <span
                      className="tabular-nums"
                      style={{
                        fontWeight: 700,
                        letterSpacing: "0.02em",
                        color: isSelected ? "#38bdf8" : "#cbd5e1",
                      }}
                    >
                      {s.id}
                    </span>

                    {/* Station Name */}
                    <span
                      style={{
                        maxWidth: "150px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {s.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── 1. HUB HEADER: Station Identity & Tactical Sonar Status ── */}
      <div
        className="telemetry-hub-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          paddingBottom: "1.25rem",
          marginBottom: "1.25rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        {/* Left: Station Identity */}
        <div className="telemetry-hub-station-header" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div className="telemetry-station-primary-row" style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span
              className="tabular-nums"
              style={{
                fontSize: "0.8125rem",
                fontWeight: 700,
                color: "var(--marine-blue)",
                background: "var(--marine-blue-dim)",
                border: "1px solid rgba(2, 132, 199, 0.3)",
                padding: "3px 8px",
                borderRadius: "6px",
                letterSpacing: "0.02em",
              }}
            >
              {station.id}
            </span>

            <h2
              className="telemetry-station-title"
              style={{
                fontSize: "1.25rem",
                fontWeight: 700,
                color: "var(--text-primary)",
                margin: 0,
                letterSpacing: "-0.01em",
              }}
            >
              {station.name}
            </h2>

            <Badge status={statusBadgeType} dot label={statusText} />
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
            <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <MapPinIcon size={14} style={{ color: "var(--marine-blue)" }} />
              <span>{station.location || "จุดบริการลุ่มน้ำ"}</span>
            </span>
            <span>·</span>
            <span className="tabular-nums telemetry-coords">
              พิกัด{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                {station.lat.toFixed(6)}, {station.lng.toFixed(6)}
              </strong>
            </span>
            <span className="telemetry-coords">·</span>
            <span className="tabular-nums">
              อัปเดตล่าสุด{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                {formattedTime} น.
              </strong>
            </span>
          </div>
        </div>

        {/* Right: Controls & Navigation CTA */}
        <div className="telemetry-view-switcher-wrap" style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          {/* Segmented View Switcher: Sensors vs Chart */}
          <div
            role="tablist"
            aria-label="สลับมุมมองข้อมูลสถานี"
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "rgba(6, 11, 15, 0.85)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "9999px",
              padding: "3px",
              gap: "3px",
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
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "9999px",
                background:
                  viewMode === "sensors"
                    ? "var(--marine-blue)"
                    : "transparent",
                color: viewMode === "sensors" ? "#FFFFFF" : "var(--text-secondary)",
                border: "none",
                fontSize: "0.8125rem",
                fontWeight: viewMode === "sensors" ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.15s ease",
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
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "9999px",
                background:
                  viewMode === "chart"
                    ? "var(--marine-blue)"
                    : "transparent",
                color: viewMode === "chart" ? "#FFFFFF" : "var(--text-secondary)",
                border: "none",
                fontSize: "0.8125rem",
                fontWeight: viewMode === "chart" ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <BarChart3Icon size={14} />
              <span>กราฟแนวโน้ม</span>
            </button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            className="telemetry-desktop-cta"
            onClick={() => navigate("/chart")}
            rightIcon={<ActivityIcon size={14} />}
            title="เปิดหน้าระบบวิเคราะห์ประวัติย้อนหลังแบบเต็มหน้าจอ"
          >
            กราฟเชิงลึก
          </Button>
        </div>
      </div>

      {/* ── 2. PRIMARY WATER LEVEL & SAFETY SCALE HERO ── */}
      <div
        className="telemetry-hero-card"
        style={{
          background: "linear-gradient(135deg, rgba(8, 16, 23, 0.95) 0%, rgba(11, 19, 27, 0.98) 100%)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "12px",
          padding: "1.25rem 1.5rem",
          marginBottom: "1.25rem",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.25)",
        }}
      >
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
            <DropletsIcon size={18} style={{ color: "var(--marine-blue)", flexShrink: 0 }} />
            <span style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--text-primary)" }}>
              ระดับน้ำเทียบกับ{refName}
            </span>
          </div>

          <Badge
            status={waterLevel >= 0 ? "critical" : "normal"}
            dot
            label={
              isOffline
                ? "ออฟไลน์"
                : waterLevel < 0
                ? `ต่ำกว่า${refName} ${Math.abs(waterLevel).toFixed(2)} ม.`
                : waterLevel === 0
                ? `เสมอ${refName} พอดี`
                : `สูงกว่า${refName} ${waterLevel.toFixed(2)} ม. (น้ำล้น)`
            }
          />
        </div>

        {/* Large Prominent Numerical Readout (Jitter-free tabular-nums) */}
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
              className="tabular-nums"
              style={{
                fontSize: "2.75rem",
                fontWeight: 800,
                color: "var(--text-muted)",
                lineHeight: 1,
              }}
            >
              -
            </span>
          ) : (
            <>
              <span
                className="tabular-nums"
                style={{
                  fontSize: "2.75rem",
                  fontWeight: 900,
                  color: waterLevel >= 0 ? "var(--beacon-red)" : "var(--sonar-green)",
                  letterSpacing: "-0.02em",
                  lineHeight: 1,
                }}
              >
                {waterLevel >= 0 ? `+${waterLevel.toFixed(3)}` : waterLevel.toFixed(3)}
              </span>
              <span
                style={{
                  fontSize: "1.125rem",
                  color: "var(--text-secondary)",
                  fontWeight: 600,
                }}
              >
                เมตร (ม.)
              </span>
            </>
          )}
        </div>

        {/* Blind Zone Alert Banner */}
        {isBlindZone && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.625rem",
              padding: "0.625rem 0.875rem",
              borderRadius: "8px",
              background: "var(--beacon-red-dim)",
              border: "1px solid rgba(220, 38, 38, 0.35)",
              color: "var(--beacon-red)",
              fontSize: "0.8125rem",
              fontWeight: 600,
              marginBottom: "0.875rem",
            }}
          >
            <AlertTriangleIcon size={16} />
            <span>คำเตือน ผิวน้ำเข้าสู่ระยะบอดของเซนเซอร์ (&lt; 0.28 ม.)</span>
          </div>
        )}

        {/* Integrated Calibration Metrics Grid */}
        <div className="hero-calibration-grid">
          <div className="hero-calibration-item">
            <span className="hero-calibration-label">ระยะผิวน้ำที่วัดได้</span>
            <strong
              className="hero-calibration-val tabular-nums"
              style={{ color: isOffline ? "var(--text-muted)" : "var(--text-primary)" }}
            >
              {isOffline ? "-" : `${rawDistance.toFixed(2)} ม.`}
            </strong>
          </div>
          <div className="hero-calibration-item">
            <span className="hero-calibration-label">ระยะติดตั้งถึง{refName}</span>
            <strong className="hero-calibration-val tabular-nums" style={{ color: "var(--text-primary)" }}>
              {sensorToRef.toFixed(2)} ม.
            </strong>
          </div>
          <div className="hero-calibration-item">
            <span className="hero-calibration-label">เกณฑ์เฝ้าระวัง</span>
            <strong
              className="hero-calibration-val tabular-nums"
              style={{ color: hasWarning ? "var(--tactical-amber)" : "var(--text-muted)" }}
            >
              {hasWarning ? `${warningLevel! >= 0 ? "+" : ""}${warningLevel!.toFixed(2)} ม.` : "ไม่กำหนด"}
            </strong>
          </div>
          <div className="hero-calibration-item">
            <span className="hero-calibration-label">เกณฑ์วิกฤต</span>
            <strong
              className="hero-calibration-val tabular-nums"
              style={{ color: hasCritical ? "var(--beacon-red)" : "var(--text-muted)" }}
            >
              {hasCritical ? `${criticalLevel! >= 0 ? "+" : ""}${criticalLevel!.toFixed(2)} ม.` : "ไม่กำหนด"}
            </strong>
          </div>
        </div>
      </div>

      {/* ── 3. VIEW MODE A: TACTICAL BENTO TELEMETRY GRID ── */}
      {viewMode === "sensors" ? (
        <div>
          <div className="telemetry-bento-grid" style={{ marginBottom: "1rem" }}>
            {/* Metric 1: Temperature */}
            <div
              role="button"
              tabIndex={0}
              className="telemetry-metric-card"
              onClick={() => setActiveMetric("temp")}
              style={{
                background: activeMetric === "temp" ? "rgba(245, 158, 11, 0.08)" : "var(--bg-glass)",
                border: activeMetric === "temp" ? "1.5px solid var(--tactical-amber)" : "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "12px",
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "0.75rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.9375rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                  อุณหภูมิอากาศ
                </span>
                <ThermometerIcon size={20} style={{ color: "var(--tactical-amber)" }} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
                  <span className="tabular-nums" style={{ fontSize: "1.875rem", fontWeight: 800, color: "#FFFFFF" }}>
                    {isOffline ? "-" : temp.toFixed(1)}
                  </span>
                  {!isOffline && <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>°C</span>}
                </div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>เซนเซอร์อุณหภูมิภายนอก</span>
              </div>
            </div>

            {/* Metric 2: Humidity */}
            <div
              role="button"
              tabIndex={0}
              className="telemetry-metric-card"
              onClick={() => setActiveMetric("hum")}
              style={{
                background: activeMetric === "hum" ? "rgba(2, 132, 199, 0.08)" : "var(--bg-glass)",
                border: activeMetric === "hum" ? "1.5px solid var(--marine-blue)" : "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "12px",
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "0.75rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.9375rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                  ความชื้นสัมพัทธ์
                </span>
                <DropletsIcon size={20} style={{ color: "var(--marine-blue)" }} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
                  <span className="tabular-nums" style={{ fontSize: "1.875rem", fontWeight: 800, color: "#FFFFFF" }}>
                    {isOffline ? "-" : hum.toFixed(1)}
                  </span>
                  {!isOffline && <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>%</span>}
                </div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>ความชื้นในอากาศโดยรอบ</span>
              </div>
            </div>

            {/* Metric 3: Battery */}
            <div
              role="button"
              tabIndex={0}
              className="telemetry-metric-card"
              onClick={() => setActiveMetric("batt")}
              style={{
                background: activeMetric === "batt" ? "rgba(16, 185, 129, 0.08)" : "var(--bg-glass)",
                border: activeMetric === "batt" ? "1.5px solid var(--sonar-green)" : "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "12px",
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "0.75rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.9375rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                  ระดับแบตเตอรี่
                </span>
                {battPercent > 20 ? (
                  <BatteryChargingIcon size={20} style={{ color: "var(--sonar-green)" }} />
                ) : (
                  <BatteryLowIcon size={20} style={{ color: "var(--beacon-red)" }} />
                )}
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
                  <span className="tabular-nums" style={{ fontSize: "1.875rem", fontWeight: 800, color: "#FFFFFF" }}>
                    {isOffline ? "-" : Math.round(battPercent)}
                  </span>
                  {!isOffline && <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>%</span>}
                </div>
                {!isOffline && (
                  <div style={{ marginTop: "6px" }}>
                    <div style={{ height: 4, width: "100%", background: "rgba(255, 255, 255, 0.08)", borderRadius: 9999, overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.min(100, Math.max(0, battPercent))}%`,
                          background: battPercent > 50 ? "var(--sonar-green)" : battPercent > 20 ? "var(--tactical-amber)" : "var(--beacon-red)",
                          borderRadius: 9999,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Metric 4: LoRa RSSI Signal */}
            <div
              role="button"
              tabIndex={0}
              className="telemetry-metric-card"
              onClick={() => setActiveMetric("rssi")}
              style={{
                background: activeMetric === "rssi" ? "rgba(2, 132, 199, 0.08)" : "var(--bg-glass)",
                border: activeMetric === "rssi" ? "1.5px solid var(--marine-blue)" : "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "12px",
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "0.75rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.9375rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                  ความแรงสัญญาณ LoRa
                </span>
                <RadioIcon size={20} style={{ color: signalColor }} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
                  <span className="tabular-nums" style={{ fontSize: "1.875rem", fontWeight: 800, color: "#FFFFFF" }}>
                    {isOffline ? "-" : rssi}
                  </span>
                  {!isOffline && <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>dBm</span>}
                </div>
                <span style={{ fontSize: "0.75rem", color: signalColor, fontWeight: 600 }}>
                  {isOffline ? "ขาดการเชื่อมต่อ" : signalRating}
                </span>
              </div>
            </div>

            {/* Secondary Diagnostics (Shown on desktop or expanded on mobile) */}
            <div
              role="button"
              tabIndex={0}
              className={`telemetry-metric-card telemetry-secondary-metric ${showAllMetrics ? "show" : ""}`}
              onClick={() => setActiveMetric("volt")}
              style={{
                background: activeMetric === "volt" ? "rgba(245, 158, 11, 0.08)" : "var(--bg-glass)",
                border: activeMetric === "volt" ? "1.5px solid var(--tactical-amber)" : "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "12px",
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "0.75rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.9375rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                  แรงดันโซลาร์เซลล์
                </span>
                <ZapIcon size={20} style={{ color: "var(--tactical-amber)" }} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
                  <span className="tabular-nums" style={{ fontSize: "1.875rem", fontWeight: 800, color: "#FFFFFF" }}>
                    {isOffline ? "-" : battVolt.toFixed(1)}
                  </span>
                  {!isOffline && <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>V</span>}
                </div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>ระบบประจุไฟฟ้าสำรอง</span>
              </div>
            </div>

            {/* Metric 6: SNR Quality */}
            <div
              role="button"
              tabIndex={0}
              className={`telemetry-metric-card telemetry-secondary-metric ${showAllMetrics ? "show" : ""}`}
              onClick={() => setActiveMetric("snr")}
              style={{
                background: activeMetric === "snr" ? "rgba(2, 132, 199, 0.08)" : "var(--bg-glass)",
                border: activeMetric === "snr" ? "1.5px solid var(--marine-blue)" : "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "12px",
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "0.75rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.9375rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                  คุณภาพสัญญาณ SNR
                </span>
                <WifiIcon size={20} style={{ color: "var(--marine-blue)" }} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
                  <span className="tabular-nums" style={{ fontSize: "1.875rem", fontWeight: 800, color: "#FFFFFF" }}>
                    {isOffline ? "-" : snr.toFixed(1)}
                  </span>
                  {!isOffline && <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>dB</span>}
                </div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>สัญญาณต่อสัญญาณรบกวน</span>
              </div>
            </div>

            {/* Metric 7: Mast Tilt Detection */}
            <div
              role="button"
              tabIndex={0}
              className={`telemetry-metric-card telemetry-secondary-metric ${showAllMetrics ? "show" : ""}`}
              onClick={() => setActiveMetric("tilt")}
              style={{
                background: isTilted ? "var(--beacon-red-dim)" : activeMetric === "tilt" ? "rgba(16, 185, 129, 0.08)" : "var(--bg-glass)",
                border: isTilted ? "1.5px solid var(--beacon-red)" : activeMetric === "tilt" ? "1.5px solid var(--sonar-green)" : "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "12px",
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "0.75rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.9375rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                  การเอียงของเสาตรวจวัด
                </span>
                <CompassIcon size={20} style={{ color: isTilted ? "var(--beacon-red)" : "var(--sonar-green)" }} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                  <span className="tabular-nums" style={{ fontSize: "1.125rem", fontWeight: 700, color: "#FFFFFF" }}>
                    X: {tiltX.toFixed(1)}°
                  </span>
                  <span className="tabular-nums" style={{ fontSize: "1.125rem", fontWeight: 700, color: "#FFFFFF" }}>
                    Y: {tiltY.toFixed(1)}°
                  </span>
                </div>
                <span style={{ fontSize: "0.75rem", color: isTilted ? "var(--beacon-red)" : "var(--sonar-green)", fontWeight: 600 }}>
                  {isTilted ? "เสาเอียงเกินเกณฑ์ปลอดภัย" : "แนวตั้งฉากปกติ"}
                </span>
              </div>
            </div>

            {/* Metric 8: Gateway Connection */}
            <div
              role="button"
              tabIndex={0}
              className={`telemetry-metric-card telemetry-secondary-metric ${showAllMetrics ? "show" : ""}`}
              onClick={() => setActiveMetric("gateway")}
              style={{
                background: activeMetric === "gateway" ? "rgba(2, 132, 199, 0.08)" : "var(--bg-glass)",
                border: activeMetric === "gateway" ? "1.5px solid var(--marine-blue)" : "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "12px",
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "0.75rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.9375rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                  เกตเวย์รับข้อมูล
                </span>
                <ActivityIcon size={20} style={{ color: "var(--sonar-green)" }} />
              </div>
              <div>
                <div style={{ fontSize: "1.125rem", fontWeight: 700, color: "#FFFFFF", marginBottom: "2px" }}>
                  {isOffline ? "-" : gateway}
                </div>
                <span style={{ fontSize: "0.75rem", color: "var(--sonar-green)", fontWeight: 600 }}>
                  {isOffline ? "ออฟไลน์" : `เชื่อมต่อ ${gatewayStatus}`}
                </span>
              </div>
            </div>

            {/* Hardware Metadata Bar */}
            <div
              className={`telemetry-hw-specs-card telemetry-secondary-metric ${showAllMetrics ? "show" : ""}`}
              style={{
                gridColumn: "1 / -1",
                background: "rgba(6, 11, 15, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "10px",
                padding: "0.875rem 1.25rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "1rem",
                fontSize: "0.8125rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <CpuIcon size={16} style={{ color: "var(--marine-blue)" }} />
                <span>รุ่นอุปกรณ์: <strong style={{ color: "#FFFFFF" }}>{model}</strong></span>
              </div>
              <div>
                <span>เฟิร์มแวร์: <strong style={{ color: "#FFFFFF" }}>{firmware}</strong></span>
              </div>
              <div>
                <span>ประเภทสถานี: <strong style={{ color: "#FFFFFF" }}>{station.stationType || "แม่น้ำ"}</strong></span>
              </div>
              <div className="tabular-nums">
                <span>พิกัดเรดาร์: <strong style={{ color: "var(--sonar-green)" }}>{station.lat.toFixed(6)}, {station.lng.toFixed(6)}</strong></span>
              </div>
            </div>

            {/* Mobile Expand / Collapse Toggle Button */}
            <div className="telemetry-metrics-toggle-row">
              <Button
                variant="ghost"
                size="sm"
                fullWidth
                onClick={() => setShowAllMetrics((prev) => !prev)}
                rightIcon={<span style={{ fontSize: "10px" }}>{showAllMetrics ? "▲" : "▼"}</span>}
              >
                {showAllMetrics ? "ซ่อนข้อมูลเพิ่มเติม" : "ดูเซนเซอร์และฮาร์ดแวร์เพิ่มเติม"}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* ── 3. VIEW MODE B: HYDROLOGICAL WATER TREND CHART (Marine Blue Pulse) ── */
        <div
          className="telemetry-chart-card"
          style={{
            background: "rgba(6, 11, 15, 0.75)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "12px",
            padding: "1.25rem 1.5rem",
            marginBottom: "1rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1rem",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <ActivityIcon size={18} style={{ color: "var(--marine-blue)" }} />
              <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                แนวโน้มระดับน้ำจริงย้อนหลัง (10 จุดตรวจวัดล่าสุด)
              </h3>
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              แกน Y: เมตรเทียบกับ{refName}
            </span>
          </div>

          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="sonarWaterGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284C7" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#0284C7" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" />
                <XAxis
                  dataKey="time"
                  stroke="var(--text-muted)"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  stroke="var(--text-muted)"
                  fontSize={11}
                  tickLine={false}
                  domain={["auto", "auto"]}
                  tickFormatter={(v) => `${v.toFixed(2)}m`}
                />
                <Tooltip
                  contentStyle={{
                    background: "#060B0F",
                    border: "1px solid rgba(2, 132, 199, 0.4)",
                    borderRadius: "8px",
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.8)",
                    color: "#FFFFFF",
                    fontSize: "12px",
                  }}
                  formatter={(value: any) => [`${Number(value).toFixed(3)} ม.`, "ระดับน้ำ"]}
                  labelFormatter={(lbl) => `เวลา ${lbl} น.`}
                />
                {hasWarning && (
                  <ReferenceLine
                    y={warningLevel!}
                    stroke="var(--tactical-amber)"
                    strokeDasharray="4 4"
                    label={{ value: "เฝ้าระวัง", fill: "var(--tactical-amber)", fontSize: 10, position: "insideTopRight" }}
                  />
                )}
                {hasCritical && (
                  <ReferenceLine
                    y={criticalLevel!}
                    stroke="var(--beacon-red)"
                    strokeDasharray="4 4"
                    label={{ value: "วิกฤต", fill: "var(--beacon-red)", fontSize: 10, position: "insideTopRight" }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="level"
                  stroke="#0284C7"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#sonarWaterGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
});

export default StationTelemetryHub;
