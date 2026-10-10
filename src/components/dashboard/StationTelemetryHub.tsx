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
  AlertTriangleIcon,
  BarChart3Icon,
  ActivityIcon,
  CompassIcon,
  LayersIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "../ui/Icons";
import { Badge } from "../ui/Badge";

interface StationTelemetryHubProps {
  station: Station;
  stations?: Station[];
  onSelectStation?: (stationId: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

type HubViewMode = "sensors" | "chart";

export const StationTelemetryHub = memo(function StationTelemetryHub({
  station,
  stations,
  onSelectStation,
  onRefresh: _onRefresh,
  isRefreshing: _isRefreshing = false,
}: StationTelemetryHubProps) {
  const navigate = useNavigate();

  // View mode switcher: 'sensors' (Primary Bento cards) or 'chart' (Live Trend Graph)
  const [viewMode, setViewMode] = useState<HubViewMode>("sensors");

  // Mobile expandable diagnostics toggle (shows primary by default, expands to 8)
  const [showAllMetrics, setShowAllMetrics] = useState(false);

  const [recentReadings, setRecentReadings] = useState<Reading[]>([]);

  // Water level display unit: 'm' (meters, default) or 'cm' (centimeters)
  const [waterUnit, setWaterUnit] = useState<"m" | "cm">("m");

  // Helper to format water level based on active unit (m or cm)
  const formatLevel = (valInMeters: number | null | undefined): string => {
    if (valInMeters === null || valInMeters === undefined) return "-";
    if (waterUnit === "cm") {
      const cmVal = valInMeters * 100;
      const sign = cmVal >= 0 ? "+" : "";
      return `${sign}${cmVal.toFixed(1)}`;
    }
    const sign = valInMeters >= 0 ? "+" : "";
    return `${sign}${valInMeters.toFixed(3)}`;
  };

  const formatDistanceVal = (valInMeters: number | null | undefined): string => {
    if (valInMeters === null || valInMeters === undefined) return "-";
    if (waterUnit === "cm") {
      return `${(valInMeters * 100).toFixed(1)} ซม.`;
    }
    return `${valInMeters.toFixed(2)} ม.`;
  };

  const formatThresholdVal = (valInMeters: number | null | undefined): string => {
    if (valInMeters === null || valInMeters === undefined) return "ไม่กำหนด";
    if (waterUnit === "cm") {
      const cmVal = valInMeters * 100;
      const sign = cmVal >= 0 ? "+" : "";
      return `${sign}${cmVal.toFixed(1)} ซม.`;
    }
    const sign = valInMeters >= 0 ? "+" : "";
    return `${sign}${valInMeters.toFixed(2)} ม.`;
  };

  // Real-time audio synthesizer for tactile water resonance
  const playFluidResonance = () => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // Audio fallback safe
    }
  };

  // Fetch recent readings for this specific station
  useEffect(() => {
    let isMounted = true;
    fetchReadingsByStation(station.id, 12)
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
  // Dynamic battery color coding: Green >50%, Amber/Yellow 21-50%, Red <=20%
  const battColor =
    battPercent <= 20
      ? "#EF4444"
      : battPercent <= 50
      ? "#F59E0B"
      : "#10B981";

  const battTrackGradient =
    battPercent <= 20
      ? "linear-gradient(90deg, #E11D48 0%, #EF4444 100%)"
      : battPercent <= 50
      ? "linear-gradient(90deg, #F59E0B 0%, #FBBF24 100%)"
      : "linear-gradient(90deg, #10B981 0%, #34D399 100%)";

  const battGlow =
    battPercent <= 20
      ? "0 0 8px rgba(239, 68, 68, 0.5)"
      : battPercent <= 50
      ? "0 0 6px rgba(245, 158, 11, 0.35)"
      : "0 0 6px rgba(16, 185, 129, 0.35)";
  const battVolt = station.batteryVoltage ?? 13.0;
  const rssi = station.rssi ?? -71;
  const snr = station.snr ?? 14.5;
  const tiltX = station.tiltX ?? 4.1;
  const tiltY = station.tiltY ?? -1.1;
  const gateway = station.gatewayName || "Gateway_01";
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

  // Tactical Situational Intelligence Insight
  const situationalInsight = useMemo(() => {
    if (isOffline) {
      return {
        text: "สถานีปิดบริการชั่วคราว · ตรวจสอบระบบเซนเซอร์",
        dotColor: "#94A3B8",
      };
    }
    if (hasCritical && waterLevel >= criticalLevel!) {
      return {
        text: `ระดับวิกฤต · เกินเกณฑ์ +${(waterLevel - criticalLevel!).toFixed(2)} ม. เสี่ยงน้ำล้นตลิ่ง`,
        dotColor: "var(--beacon-red, #EF4444)",
      };
    }
    if (hasWarning && waterLevel >= warningLevel!) {
      const distToCrit = criticalLevel ? (criticalLevel - waterLevel).toFixed(2) : "0.50";
      return {
        text: `เฝ้าระวังพิเศษ · ต่ำกว่าวิกฤต ${distToCrit} ม.`,
        dotColor: "var(--tactical-amber, #F59E0B)",
      };
    }
    if (waterLevel > 0) {
      return {
        text: `ระดับน้ำสูงกว่า${refName} +${waterLevel.toFixed(2)} ม. เริ่มล้นตลิ่ง`,
        dotColor: "var(--beacon-red, #EF4444)",
      };
    }
    const margin = Math.abs(waterLevel);
    return {
      text: `สถานการณ์ปกติ · ระดับน้ำต่ำกว่า${refName} ${margin.toFixed(2)} ม.`,
      dotColor: "var(--sonar-green, #10B981)",
    };
  }, [isOffline, hasCritical, criticalLevel, hasWarning, warningLevel, waterLevel, refName]);

  // Hydro-Tactical Water Gauge Percentage Calculations
  const minExpected = -Math.max(1.5, sensorToRef * 0.85);
  const maxExpected = Math.max(0.8, (criticalLevel ?? 0.5) + 0.6);
  const span = maxExpected - minExpected;
  const currentRatio = Math.max(0.04, Math.min(0.98, (waterLevel - minExpected) / (span || 1)));
  const gaugePercent = Math.round(currentRatio * 100);
  const datumPercent = Math.max(12, Math.min(88, Math.round(((0 - minExpected) / (span || 1)) * 100)));
  const warnPercent = hasWarning ? Math.max(15, Math.min(94, Math.round(((warningLevel! - minExpected) / (span || 1)) * 100))) : null;
  const critPercent = hasCritical ? Math.max(18, Math.min(96, Math.round(((criticalLevel! - minExpected) / (span || 1)) * 100))) : null;


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
      { time: "17:15", level: Number((waterLevel - 0.02).toFixed(3)) },
      { time: "17:20", level: Number((waterLevel - 0.01).toFixed(3)) },
      { time: "17:25", level: waterLevel },
      { time: "17:30", level: Number((waterLevel + 0.005).toFixed(3)) },
      { time: "17:35", level: waterLevel },
      { time: "17:40", level: waterLevel },
      { time: "17:45", level: waterLevel },
      { time: "17:50", level: Number((waterLevel + 0.003).toFixed(3)) },
      { time: "17:55", level: waterLevel },
      { time: "18:00", level: waterLevel },
    ];
  }, [recentReadings, sensorToRef, waterLevel]);

  return (
    <div
      className="bento-card animate-fade-in telemetry-hub-card"
      style={{
        background: "var(--card-surface, #0C0E12)",
        borderRadius: "14px",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5), 0 1px 2px rgba(0, 0, 0, 0.3)",
        padding: "1.5rem",
        marginBottom: "1.75rem",
      }}
    >
      {/* ── 0. THE HYDRO-EQUALIZER STATION DOCK (Data-as-Interface 3D Fluid Columns) ── */}
      {stations && stations.length > 1 && onSelectStation && (
        <div
          className="hydro-equalizer-container"
          style={{
            marginBottom: "1.25rem",
            paddingBottom: "1.25rem",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          {/* Scroll wrapper for smooth responsive scrolling on mobile / tablet */}
          <div
            className="hydro-equalizer-scroll-wrap"
            style={{
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
              padding: "2px 2px",
            }}
          >
            <div
              role="tablist"
              aria-label="แผงวัดระดับมวลน้ำเสมือนและเลือกสถานี"
              className="hydro-equalizer-dock"
              style={{
                display: "flex",
                alignItems: "stretch",
                gap: "12px",
                width: "100%",
                minWidth: "min-content",
              }}
            >
              {stations.map((s) => {
                const isSelected = s.id === station.id;
                const isStationOffline = !s.isActive || s.operatingStatus === "offline";
                const sSensorToRef = s.sensorToRefDistance ?? 2.0;
                const sWaterLevel =
                  s.rawDistance !== null && s.rawDistance !== undefined
                    ? Number((sSensorToRef - s.rawDistance).toFixed(3))
                    : (s.currentLevel ?? 0);
                const hasStCrit =
                  s.criticalLevel !== null &&
                  s.criticalLevel !== undefined &&
                  !isNaN(Number(s.criticalLevel));
                const hasStWarn =
                  s.warningLevel !== null &&
                  s.warningLevel !== undefined &&
                  !isNaN(Number(s.warningLevel));
                const stCrit = hasStCrit ? Number(s.criticalLevel) : null;
                const stWarn = hasStWarn ? Number(s.warningLevel) : null;

                let statusDotColor = "var(--sonar-green, #10B981)";
                let fluidGradient =
                  "linear-gradient(180deg, rgba(56, 189, 248, 0.28) 0%, rgba(56, 189, 248, 0.05) 100%)";
                let fluidBorderTop = "2px solid #38BDF8";

                if (isStationOffline) {
                  statusDotColor = "#64748B";
                  fluidGradient = "transparent";
                  fluidBorderTop = "none";
                } else if (hasStCrit && sWaterLevel >= stCrit!) {
                  statusDotColor = "var(--beacon-red, #EF4444)";
                  fluidGradient =
                    "linear-gradient(180deg, rgba(239, 68, 68, 0.32) 0%, rgba(239, 68, 68, 0.06) 100%)";
                  fluidBorderTop = "2px solid #EF4444";
                } else if (hasStWarn && sWaterLevel >= stWarn!) {
                  statusDotColor = "var(--tactical-amber, #F59E0B)";
                  fluidGradient =
                    "linear-gradient(180deg, rgba(245, 158, 11, 0.3) 0%, rgba(245, 158, 11, 0.06) 100%)";
                  fluidBorderTop = "2px solid #F59E0B";
                }

                // Calculate fluid fill height percentage (between 16% and 88%)
                let fillHeightPercent = 0;
                if (!isStationOffline) {
                  const refVal = stCrit ? stCrit * 1.25 : 3.5;
                  const ratio = Math.max(0, Math.min(1, (sWaterLevel + 0.5) / (refVal + 0.5)));
                  fillHeightPercent = Math.round(18 + ratio * 64);
                }

                return (
                  <button
                    key={`hydro-eq-tube-${s.id}`}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => {
                      playFluidResonance();
                      onSelectStation(s.id);
                    }}
                    className={`hydro-eq-tube tactile-press ${isSelected ? "active" : ""}`}
                    style={{
                      flex: "1 1 0px",
                      minWidth: "170px",
                      height: "106px",
                      background: isSelected
                        ? "rgba(56, 189, 248, 0.05)"
                        : "rgba(255, 255, 255, 0.02)",
                      border: isSelected
                        ? "1px solid #38BDF8"
                        : "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "12px",
                      padding: "14px 14px 12px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      position: "relative",
                      overflow: "hidden",
                      boxShadow: isSelected
                        ? "0 0 20px rgba(56, 189, 248, 0.14), inset 0 0 14px rgba(56, 189, 248, 0.06)"
                        : "none",
                      outline: "none",
                      transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                      textAlign: "left",
                    }}
                  >
                    {/* Simulated 3D Liquid Level Fill */}
                    <div
                      className="tube-water-level"
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: `${fillHeightPercent}%`,
                        background: fluidGradient,
                        borderTop: fluidBorderTop,
                        transition:
                          "height 0.6s cubic-bezier(0.16, 1, 0.3, 1), background 0.3s ease",
                        pointerEvents: "none",
                        zIndex: 1,
                      }}
                    >
                      {!isStationOffline && (
                        <div
                          className="tube-water-meniscus"
                          style={{
                            position: "absolute",
                            top: "-2px",
                            left: 0,
                            right: 0,
                            height: "3px",
                            background: "#FFFFFF",
                            opacity: 0.5,
                            filter: "blur(0.5px)",
                          }}
                        />
                      )}
                    </div>

                    {/* Tube Content */}
                    <div
                      className="tube-content"
                      style={{
                        position: "relative",
                        zIndex: 2,
                        display: "flex",
                        flexDirection: "column",
                        height: "100%",
                        justifyContent: "space-between",
                        width: "100%",
                      }}
                    >
                      {/* Top Row: Station ID & Sonar Pulse Dot */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                        }}
                      >
                        <span
                          className="tabular-nums font-mono"
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 800,
                            color: isSelected ? "#38BDF8" : "var(--text-muted)",
                            letterSpacing: "0.04em",
                          }}
                        >
                          {s.id}
                        </span>

                        <span
                          style={{
                            position: "relative",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "8px",
                            height: "8px",
                          }}
                        >
                          {isSelected && !isStationOffline && (
                            <span
                              className="sonar-pulse-ring"
                              style={{
                                position: "absolute",
                                width: "100%",
                                height: "100%",
                                borderRadius: "50%",
                                backgroundColor: statusDotColor,
                                opacity: 0.6,
                              }}
                            />
                          )}
                          <span
                            style={{
                              width: "6px",
                              height: "6px",
                              borderRadius: "50%",
                              backgroundColor: statusDotColor,
                              boxShadow:
                                isSelected && !isStationOffline
                                  ? `0 0 8px ${statusDotColor}`
                                  : "none",
                            }}
                          />
                        </span>
                      </div>

                      {/* Middle Row: Station Name (Positioned lower, enlarged) */}
                      <span
                        title={s.name}
                        style={{
                          fontSize: "1.0625rem",
                          fontWeight: 700,
                          color: isSelected ? "#FFFFFF" : "#F1F5F9",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          transition: "color 0.15s ease",
                          letterSpacing: "-0.015em",
                          lineHeight: 1.25,
                          transform: "translateY(5px)",
                        }}
                      >
                        {s.name}
                      </span>

                      {/* Bottom Row: Live Liquid Level Value */}
                      <div
                        className="tabular-nums font-mono"
                        style={{
                          fontSize: "1.125rem",
                          fontWeight: 800,
                          color: isStationOffline
                            ? "var(--text-dim, #64748B)"
                            : isSelected
                            ? "#FFFFFF"
                            : "#E2E8F0",
                          letterSpacing: "-0.02em",
                          display: "flex",
                          alignItems: "baseline",
                          gap: "2px",
                          textShadow:
                            isSelected && !isStationOffline
                              ? "0 0 12px rgba(56, 189, 248, 0.4)"
                              : "none",
                        }}
                      >
                        {isStationOffline ? (
                          <span
                            style={{
                              fontSize: "0.8125rem",
                              fontWeight: 600,
                              color: "var(--text-dim, #64748B)",
                              letterSpacing: "normal",
                            }}
                          >
                            ออฟไลน์
                          </span>
                        ) : (
                          <>
                            <span>{sWaterLevel.toFixed(2)}</span>
                            <span
                              style={{
                                fontSize: "0.6875rem",
                                fontWeight: 500,
                                color: isSelected ? "#38BDF8" : "var(--text-muted)",
                                marginLeft: "2px",
                              }}
                            >
                              m
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── 1. HUB HEADER: Station Identity & Consolidated Telemetry Insight ── */}
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
        {/* Left: Station Identity & Consolidated Insight */}
        <div className="telemetry-hub-station-header" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div className="telemetry-station-primary-row" style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span
              className="tabular-nums font-mono"
              style={{
                fontSize: "0.8125rem",
                fontWeight: 700,
                color: "var(--marine-blue, #0284C7)",
                background: "var(--marine-blue-dim, rgba(2, 132, 199, 0.15))",
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
                fontSize: "1.375rem",
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
              <MapPinIcon size={14} style={{ color: "var(--marine-blue, #0284C7)" }} />
              <span>{station.location || "จุดบริการลุ่มน้ำ"}</span>
            </span>
            <span>·</span>
            <span className="tabular-nums font-mono telemetry-coords">
              <strong style={{ color: "var(--text-primary)" }}>
                {station.lat.toFixed(4)}, {station.lng.toFixed(4)}
              </strong>
            </span>
            <span>·</span>
            <span style={{ color: situationalInsight.dotColor, fontWeight: 600 }}>
              {situationalInsight.text}
            </span>
            <span>·</span>
            <span className="tabular-nums font-mono">
              อัปเดต{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                {formattedTime}
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
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "8px",
              padding: "3px",
              gap: "3px",
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "sensors"}
              onClick={() => setViewMode("sensors")}
              className="tactile-press"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "6px",
                background:
                  viewMode === "sensors"
                    ? "rgba(56, 189, 248, 0.15)"
                    : "transparent",
                color: viewMode === "sensors" ? "#38BDF8" : "var(--text-secondary)",
                border: viewMode === "sensors" ? "1px solid rgba(56, 189, 248, 0.35)" : "1px solid transparent",
                fontSize: "0.8125rem",
                fontWeight: viewMode === "sensors" ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <LayersIcon size={14} />
              <span>มาตรวัด</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "chart"}
              onClick={() => setViewMode("chart")}
              className="tactile-press"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "6px",
                background:
                  viewMode === "chart"
                    ? "rgba(56, 189, 248, 0.15)"
                    : "transparent",
                color: viewMode === "chart" ? "#38BDF8" : "var(--text-secondary)",
                border: viewMode === "chart" ? "1px solid rgba(56, 189, 248, 0.35)" : "1px solid transparent",
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

          <button
            type="button"
            className="btn-aqua-fluid telemetry-desktop-cta tactile-press"
            onClick={() => navigate(`/chart?station=${station.id}`)}
            title="เปิดหน้าระบบวิเคราะห์ประวัติย้อนหลังแบบเต็มหน้าจอ"
          >
            <div className="aqua-fluid-backdrop" />
            <div className="btn-content">
              <span>กราฟเชิงลึก</span>
              <ActivityIcon size={14} />
            </div>
          </button>
        </div>
      </div>

      {/* ── 2. PRIMARY WATER LEVEL & SAFETY SCALE HERO (FLATTENED · ZERO NESTING) ── */}
      <div
        className="telemetry-hero-card"
        style={{
          background: "transparent",
          border: "none",
          borderRadius: 0,
          padding: "0 0 1.25rem 0",
          marginBottom: "1.25rem",
          boxShadow: "none",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
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
            <DropletsIcon size={18} style={{ color: "var(--marine-blue, #0284C7)", flexShrink: 0 }} />
            <span style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--text-primary)" }}>
              ระดับน้ำ ({refName})
            </span>
          </div>

          <Badge
            status={statusBadgeType}
            dot
            label={
              isOffline
                ? "ออฟไลน์"
                : waterLevel < 0
                ? `ต่ำกว่าเกณฑ์ ${Math.abs(waterLevel).toFixed(2)} ม.`
                : waterLevel === 0
                ? `เสมอเกณฑ์พอดี`
                : `สูงกว่าเกณฑ์ +${waterLevel.toFixed(2)} ม.`
            }
          />
        </div>

        {/* Large Prominent Giant Telemetry Mono Readout with Interactive Unit Pill */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "0.5rem",
            marginBottom: "0.875rem",
            flexWrap: "wrap",
          }}
        >
          {isOffline ? (
            <span
              className="tabular-nums font-mono"
              style={{
                fontSize: "48px",
                fontWeight: 900,
                color: "var(--text-muted)",
                lineHeight: 1,
              }}
            >
              -
            </span>
          ) : (
            <>
              <span
                key={waterUnit}
                className="tabular-nums font-mono unit-swap-active"
                style={{
                  fontSize: "48px",
                  fontWeight: 900,
                  color:
                    statusBadgeType === "critical"
                      ? "var(--beacon-red, #EF4444)"
                      : statusBadgeType === "warning"
                      ? "var(--tactical-amber, #F59E0B)"
                      : "var(--sonar-green, #10B981)",
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                  display: "inline-block",
                }}
              >
                {formatLevel(waterLevel)}
              </span>

              {/* Interactive Unit Pill (Click to toggle m / cm with 180° rotation) */}
              <button
                type="button"
                onClick={() => setWaterUnit((prev) => (prev === "m" ? "cm" : "m"))}
                title="คลิกเพื่อสลับหน่วยวัด (เมตร ⇄ เซนติเมตร)"
                aria-label={`หน่วยวัดปัจจุบัน ${waterUnit === "cm" ? "เซนติเมตร" : "เมตร"} คลิกเพื่อสลับ`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "6px",
                  padding: "3px 8px",
                  color: "var(--text-secondary, #94A3B8)",
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  userSelect: "none",
                  transform: "translateY(-4px)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--marine-blue, #0284C7)";
                  e.currentTarget.style.color = "var(--telemetry-cyan, #38BDF8)";
                  e.currentTarget.style.background = "rgba(2, 132, 199, 0.12)";
                  e.currentTarget.style.boxShadow = "0 0 8px rgba(56, 189, 248, 0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
                  e.currentTarget.style.color = "var(--text-secondary, #94A3B8)";
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <span key={waterUnit} className="unit-fade-active">{waterUnit === "cm" ? "ซม." : "ม."}</span>
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    opacity: 0.8,
                    transform: waterUnit === "cm" ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                >
                  <path d="M7 16V4m0 0L3 8m4-4l4 4m6-4v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* ── HYDRO-TACTICAL GRADUATED WATER GAUGE (ANIMATE) ── */}
        {!isOffline && (
          <div style={{ marginBottom: "1.25rem" }}>
            {/* Gauge Track */}
            <div
              style={{
                position: "relative",
                height: "26px",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                overflow: "hidden",
                boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.5)",
              }}
              title={`ระดับน้ำเทียบ${refName}: ${waterLevel >= 0 ? '+' : ''}${waterLevel.toFixed(3)} ม.`}
            >
              {/* Fluid Fill Bar */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: 0,
                  width: "100%",
                  transform: `scaleX(${gaugePercent / 100})`,
                  transformOrigin: "left",
                  background:
                    statusBadgeType === "critical"
                      ? "linear-gradient(90deg, #F59E0B 0%, #EF4444 100%)"
                      : statusBadgeType === "warning"
                      ? "linear-gradient(90deg, #0284C7 0%, #F59E0B 100%)"
                      : "linear-gradient(90deg, #0284C7 0%, #38BDF8 60%, #10B981 100%)",
                  borderRadius: "6px",
                  transition: "transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
                  boxShadow: statusBadgeType === "critical" ? "0 0 14px rgba(239, 68, 68, 0.6)" : "none",
                }}
              />

              {/* Datum Marker (0.00m) */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: `${datumPercent}%`,
                  width: "2px",
                  background: "rgba(255, 255, 255, 0.75)",
                  zIndex: 2,
                }}
              />

              {/* Warning Marker */}
              {warnPercent !== null && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: `${warnPercent}%`,
                    width: "2px",
                    background: "var(--tactical-amber, #F59E0B)",
                    zIndex: 2,
                  }}
                />
              )}

              {/* Critical Marker */}
              {critPercent !== null && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: `${critPercent}%`,
                    width: "2px",
                    background: "var(--beacon-red, #EF4444)",
                    zIndex: 2,
                  }}
                />
              )}
            </div>

            {/* Gauge Sub-labels */}
            <div
              style={{
                position: "relative",
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.6875rem",
                color: "var(--text-muted)",
                marginTop: "4px",
              }}
            >
              <span>ท้องน้ำ</span>
              <span
                style={{
                  position: "absolute",
                  left: `${datumPercent}%`,
                  transform: "translateX(-50%)",
                  color: "var(--text-secondary)",
                  fontWeight: 600,
                }}
              >
                {refName} (0.00ม.)
              </span>
              {warnPercent !== null && (
                <span
                  style={{
                    position: "absolute",
                    left: `${warnPercent}%`,
                    transform: "translateX(-50%)",
                    color: "var(--tactical-amber, #F59E0B)",
                  }}
                >
                  เฝ้าระวัง
                </span>
              )}
              <span>น้ำล้นตลิ่ง</span>
            </div>
          </div>
        )}

        {/* Blind Zone Alert Banner */}
        {isBlindZone && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.625rem",
              padding: "0.625rem 0.875rem",
              borderRadius: "8px",
              background: "var(--beacon-red-dim, rgba(239, 68, 68, 0.15))",
              border: "1px solid rgba(220, 38, 38, 0.35)",
              color: "var(--beacon-red, #EF4444)",
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
            <span className="hero-calibration-label">ระยะผิวน้ำ</span>
            <strong
              key={waterUnit}
              className="hero-calibration-val tabular-nums font-mono unit-fade-active"
              style={{ color: isOffline ? "var(--text-muted)" : "var(--text-primary)" }}
            >
              {isOffline ? "-" : formatDistanceVal(rawDistance)}
            </strong>
          </div>
          <div className="hero-calibration-item">
            <span className="hero-calibration-label">ระยะติดตั้ง</span>
            <strong
              key={waterUnit}
              className="hero-calibration-val tabular-nums font-mono unit-fade-active"
              style={{ color: "var(--text-primary)" }}
            >
              {formatDistanceVal(sensorToRef)}
            </strong>
          </div>
          <div className="hero-calibration-item">
            <span className="hero-calibration-label">เฝ้าระวัง</span>
            <strong
              key={waterUnit}
              className="hero-calibration-val tabular-nums font-mono unit-fade-active"
              style={{ color: hasWarning ? "var(--tactical-amber, #F59E0B)" : "var(--text-muted)" }}
            >
              {hasWarning ? formatThresholdVal(warningLevel) : "ไม่กำหนด"}
            </strong>
          </div>
          <div className="hero-calibration-item">
            <span className="hero-calibration-label">วิกฤต</span>
            <strong
              key={waterUnit}
              className="hero-calibration-val tabular-nums font-mono unit-fade-active"
              style={{ color: hasCritical ? "var(--beacon-red, #EF4444)" : "var(--text-muted)" }}
            >
              {hasCritical ? formatThresholdVal(criticalLevel) : "ไม่กำหนด"}
            </strong>
          </div>
        </div>
      </div>

      {/* ── 3. VIEW MODE A: TACTICAL BENTO TELEMETRY GRID ── */}
      {viewMode === "sensors" ? (
        <div>
          <div className="telemetry-bento-grid" style={{ marginBottom: "1rem" }}>
            {/* Metric 1: Temperature (Atmosphere) */}
            <div
              className="telemetry-metric-card"
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderTop: "2px solid #38BDF8",
                borderRadius: "10px",
                padding: "1rem 1.15rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "0.5rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                  อุณหภูมิ
                </span>
                <ThermometerIcon size={18} style={{ color: "#38BDF8", filter: "drop-shadow(0 0 6px rgba(56, 189, 248, 0.4))" }} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
                  <span className="tabular-nums font-mono" style={{ fontSize: "1.75rem", fontWeight: 800, color: "#FFFFFF" }}>
                    {isOffline ? "-" : temp.toFixed(1)}
                  </span>
                  {!isOffline && <span style={{ color: "#38BDF8", fontWeight: 700, fontSize: "0.875rem" }}>°C</span>}
                </div>
              </div>
            </div>

            {/* Metric 2: Humidity (Atmosphere) */}
            <div
              className="telemetry-metric-card"
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderTop: "2px solid #38BDF8",
                borderRadius: "10px",
                padding: "1rem 1.15rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "0.5rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                  ความชื้น
                </span>
                <DropletsIcon size={18} style={{ color: "#38BDF8", filter: "drop-shadow(0 0 6px rgba(56, 189, 248, 0.4))" }} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
                  <span className="tabular-nums font-mono" style={{ fontSize: "1.75rem", fontWeight: 800, color: "#FFFFFF" }}>
                    {isOffline ? "-" : hum.toFixed(1)}
                  </span>
                  {!isOffline && <span style={{ color: "#38BDF8", fontWeight: 700, fontSize: "0.875rem" }}>%</span>}
                </div>
              </div>
            </div>

            {/* Metric 3: Battery (Energy & Solar) */}
            <div
              className="telemetry-metric-card"
              style={{
                background: battPercent <= 20 ? "rgba(239, 68, 68, 0.08)" : "rgba(255, 255, 255, 0.02)",
                border: battPercent <= 20 ? "1px solid var(--beacon-red, #EF4444)" : "1px solid rgba(255, 255, 255, 0.08)",
                borderTop: `2px solid ${battColor}`,
                borderRadius: "10px",
                padding: "1rem 1.15rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "0.5rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                  แบตเตอรี่
                </span>
                {battPercent > 20 ? (
                  <BatteryChargingIcon size={18} style={{ color: battColor, filter: `drop-shadow(${battGlow})` }} />
                ) : (
                  <BatteryLowIcon size={18} style={{ color: "#EF4444", filter: "drop-shadow(0 0 6px rgba(239, 68, 68, 0.4))" }} />
                )}
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
                  <span className="tabular-nums font-mono" style={{ fontSize: "1.75rem", fontWeight: 800, color: "#FFFFFF" }}>
                    {isOffline ? "-" : `${Math.round(battPercent)}`}
                  </span>
                  {!isOffline && <span style={{ color: battColor, fontWeight: 700, fontSize: "0.875rem" }}>%</span>}
                </div>
                {/* Sleek Micro Battery Track */}
                {!isOffline && (
                  <div
                    style={{
                      width: "100%",
                      height: "4px",
                      borderRadius: "2px",
                      background: "rgba(255, 255, 255, 0.08)",
                      overflow: "hidden",
                      marginTop: "6px",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: "100%",
                        transform: `scaleX(${Math.max(0.04, Math.min(1, battPercent / 100))})`,
                        transformOrigin: "left",
                        borderRadius: "2px",
                        background: battTrackGradient,
                        boxShadow: battGlow,
                        transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Metric 4: Signal RSSI (Network) */}
            <div
              className="telemetry-metric-card"
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderTop: "2px solid #10B981",
                borderRadius: "10px",
                padding: "1rem 1.15rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "0.5rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                  สัญญาณ LoRa
                </span>
                <RadioIcon size={18} style={{ color: "#10B981", filter: "drop-shadow(0 0 6px rgba(16, 185, 129, 0.4))" }} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
                  <span className="tabular-nums font-mono" style={{ fontSize: "1.75rem", fontWeight: 800, color: "#FFFFFF" }}>
                    {isOffline ? "-" : rssi}
                  </span>
                  {!isOffline && <span style={{ color: "#10B981", fontWeight: 700, fontSize: "0.875rem" }}>dBm</span>}
                </div>
              </div>
            </div>

            {/* Expandable Secondary Metrics (SNR, Tilt, Gateway, Hardware Specs) */}
            {showAllMetrics && (
              <>
                {/* Metric 5: Voltage (Energy & Solar) */}
                <div
                  className="telemetry-metric-card"
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderTop: "2px solid #F59E0B",
                    borderRadius: "10px",
                    padding: "1rem 1.15rem",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "0.5rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                      แรงดันไฟ
                    </span>
                    <ZapIcon size={18} style={{ color: "#F59E0B", filter: "drop-shadow(0 0 6px rgba(245, 158, 11, 0.4))" }} />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
                      <span className="tabular-nums font-mono" style={{ fontSize: "1.75rem", fontWeight: 800, color: "#FFFFFF" }}>
                        {isOffline ? "-" : battVolt.toFixed(1)}
                      </span>
                      {!isOffline && <span style={{ color: "#F59E0B", fontWeight: 700, fontSize: "0.875rem" }}>V</span>}
                    </div>
                  </div>
                </div>

                {/* Metric 6: SNR (Network) */}
                <div
                  className="telemetry-metric-card"
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderTop: "2px solid #10B981",
                    borderRadius: "10px",
                    padding: "1rem 1.15rem",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "0.5rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                      สัญญาณ SNR
                    </span>
                    <WifiIcon size={18} style={{ color: "#10B981", filter: "drop-shadow(0 0 6px rgba(16, 185, 129, 0.4))" }} />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
                      <span className="tabular-nums font-mono" style={{ fontSize: "1.75rem", fontWeight: 800, color: "#FFFFFF" }}>
                        {isOffline ? "-" : snr.toFixed(1)}
                      </span>
                      {!isOffline && <span style={{ color: "#10B981", fontWeight: 700, fontSize: "0.875rem" }}>dB</span>}
                    </div>
                  </div>
                </div>

                {/* Metric 7: Mast Tilt Detection (Rigidity) */}
                <div
                  className="telemetry-metric-card"
                  style={{
                    background: isTilted ? "var(--beacon-red-dim, rgba(239, 68, 68, 0.15))" : "rgba(255, 255, 255, 0.02)",
                    border: isTilted ? "1px solid var(--beacon-red, #EF4444)" : "1px solid rgba(255, 255, 255, 0.08)",
                    borderTop: isTilted ? "2px solid var(--beacon-red, #EF4444)" : "2px solid #818CF8",
                    borderRadius: "10px",
                    padding: "1rem 1.15rem",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "0.5rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                      ความเอียงเสา
                    </span>
                    <CompassIcon size={18} style={{ color: isTilted ? "var(--beacon-red, #EF4444)" : "#818CF8", filter: `drop-shadow(0 0 6px ${isTilted ? "rgba(239, 68, 68, 0.4)" : "rgba(129, 140, 248, 0.4)"})` }} />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                      <span className="tabular-nums font-mono" style={{ fontSize: "1.125rem", fontWeight: 700, color: "#FFFFFF" }}>
                        X {tiltX.toFixed(1)}°
                      </span>
                      <span className="tabular-nums font-mono" style={{ fontSize: "1.125rem", fontWeight: 700, color: "#FFFFFF" }}>
                        Y {tiltY.toFixed(1)}°
                      </span>
                    </div>
                  </div>
                </div>

                {/* Metric 8: Gateway Connection (Network) */}
                <div
                  className="telemetry-metric-card"
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderTop: isOffline ? "2px solid #64748B" : "2px solid #10B981",
                    borderRadius: "10px",
                    padding: "1rem 1.15rem",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "0.5rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                      เกตเวย์
                    </span>
                    <ActivityIcon size={18} style={{ color: isOffline ? "#64748B" : "#10B981", filter: isOffline ? "none" : "drop-shadow(0 0 6px rgba(16, 185, 129, 0.4))" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: "1.125rem", fontWeight: 700, color: "#FFFFFF" }}>
                      {isOffline ? "-" : gateway}
                    </div>
                  </div>
                </div>

                {/* Hardware Metadata Bar (Zero-colon rule compliant) */}
                <div
                  className="telemetry-hw-specs-card"
                  style={{
                    gridColumn: "1 / -1",
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "10px",
                    padding: "0.75rem 1.15rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "0.75rem",
                    fontSize: "0.8125rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <CpuIcon size={16} style={{ color: "var(--marine-blue, #0284C7)" }} />
                    <span>{model}</span>
                  </div>
                  <div>
                    <span>เฟิร์มแวร์ <strong style={{ color: "#FFFFFF" }}>{firmware}</strong></span>
                  </div>
                  <div>
                    <span>{station.stationType || "แม่น้ำ"}</span>
                  </div>
                  <div className="tabular-nums font-mono">
                    <strong style={{ color: "var(--sonar-green, #10B981)" }}>{station.lat.toFixed(4)}, {station.lng.toFixed(4)}</strong>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Toggle Secondary Diagnostics Accordion */}
          <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
            <button
              type="button"
              onClick={() => setShowAllMetrics(!showAllMetrics)}
              className="tactile-press"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "6px",
                padding: "6px 16px",
                fontSize: "0.8125rem",
                color: "var(--text-secondary)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <span>{showAllMetrics ? "ย่อรายละเอียด" : "รายละเอียดฮาร์ดแวร์"}</span>
              {showAllMetrics ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
            </button>
          </div>
        </div>
      ) : (
        /* ── VIEW MODE B: LIVE TREND GRAPH ── */
        <div style={{ width: "100%", height: 320, padding: "10px 0" }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="hubWaterGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0284C7" stopOpacity={0.4} />
                  <stop offset="90%" stopColor="#0284C7" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="var(--text-muted, #94A3B8)"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "rgba(255, 255, 255, 0.08)" }}
              />
              <YAxis
                stroke="var(--text-muted, #94A3B8)"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "rgba(255, 255, 255, 0.08)" }}
                domain={["auto", "auto"]}
                tickFormatter={(v) => `${Number(v).toFixed(2)}m`}
              />
              <Tooltip
                contentStyle={{
                  background: "rgba(12, 14, 18, 0.95)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "10px",
                  boxShadow: "0 12px 32px rgba(0, 0, 0, 0.7)",
                  color: "#FFFFFF",
                  fontSize: "12px",
                  backdropFilter: "blur(12px)",
                }}
                formatter={(value: any) => [`${Number(value).toFixed(3)} ม.`, `ระดับน้ำเทียบ${refName}`]}
                labelFormatter={(lbl) => `เวลา ${lbl} น.`}
              />
              {/* Reference datum line */}
              <ReferenceLine
                y={0}
                stroke="rgba(255, 255, 255, 0.25)"
                strokeDasharray="3 3"
                label={{ value: `เสมอ${refName} (0.00ม.)`, fill: "#94A3B8", fontSize: 10, position: "insideBottomRight" }}
              />
              {hasWarning && (
                <ReferenceLine
                  y={warningLevel!}
                  stroke="var(--tactical-amber, #F59E0B)"
                  strokeDasharray="4 4"
                  label={{ value: "เฝ้าระวัง", fill: "var(--tactical-amber, #F59E0B)", fontSize: 10, position: "insideTopRight" }}
                />
              )}
              {hasCritical && (
                <ReferenceLine
                  y={criticalLevel!}
                  stroke="var(--beacon-red, #EF4444)"
                  strokeDasharray="4 4"
                  label={{ value: "วิกฤต", fill: "var(--beacon-red, #EF4444)", fontSize: 10, position: "insideTopLeft" }}
                />
              )}
              <Area
                type="monotone"
                dataKey="level"
                stroke="#38BDF8"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#hubWaterGrad)"
                name={`ระดับน้ำเทียบ${refName}`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
});

export default StationTelemetryHub;
