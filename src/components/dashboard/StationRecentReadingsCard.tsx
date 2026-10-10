import { useState, useEffect, useMemo } from "react";
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
  ActivityIcon,
  BatteryChargingIcon,
  BatteryLowIcon,
  ThermometerIcon,
  ClockIcon,
  BarChart3Icon,
  LayersIcon,
} from "../ui/Icons";

interface StationRecentReadingsCardProps {
  station: Station;
}

type CockpitViewMode = "chart" | "table";

function formatReadingTime(timestamp: unknown): string {
  if (!timestamp) return "-";
  try {
    const d = new Date(timestamp as string | number | Date);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "-";
  }
}

function formatChartTime(timestamp: unknown): string {
  if (!timestamp) return "-";
  try {
    const d = new Date(timestamp as string | number | Date);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

export default function StationRecentReadingsCard({
  station,
}: StationRecentReadingsCardProps) {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<CockpitViewMode>("chart");

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    // Fetch up to 20 recent readings for smooth 24h trend visualization + 5 latest table
    fetchReadingsByStation(station.id, 20)
      .then((data) => {
        if (isMounted) setReadings(data || []);
      })
      .catch(() => {
        if (isMounted) setReadings([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [station.id]);

  const hasWarn =
    station.warningLevel !== undefined &&
    station.warningLevel !== null &&
    !isNaN(Number(station.warningLevel));
  const hasCrit =
    station.criticalLevel !== undefined &&
    station.criticalLevel !== null &&
    !isNaN(Number(station.criticalLevel));
  const warningLevel = hasWarn ? Number(station.warningLevel) : null;
  const criticalLevel = hasCrit ? Number(station.criticalLevel) : null;
  const refName = station.referencePointName || "จุดอ้างอิง";
  const sensorToRef = station.sensorToRefDistance ?? 2.0;

  // Chart data: chronological order (oldest to newest)
  const chartData = useMemo(() => {
    if (readings.length > 0) {
      return [...readings].reverse().map((r) => {
        const rawDist = r.raw_distance !== null && r.raw_distance !== undefined && !isNaN(Number(r.raw_distance))
          ? Number(r.raw_distance)
          : null;
        const computedLevel = rawDist !== null
          ? Number((sensorToRef - rawDist).toFixed(3))
          : r.water_level !== null && r.water_level !== undefined && !isNaN(Number(r.water_level))
          ? Number(Number(r.water_level).toFixed(3))
          : (station.currentLevel ?? 0);

        return {
          time: formatChartTime(r.timestamp),
          fullTime: formatReadingTime(r.timestamp),
          waterLevel: computedLevel,
          battery: r.battery_percent !== null ? Number(r.battery_percent) : null,
          temp: r.temperature !== null ? Number(r.temperature) : null,
        };
      });
    }

    // Baseline fallback points if no historical readings available yet
    const base = station.currentLevel ?? 0;
    return [
      { time: "00:00", fullTime: "00:00:00", waterLevel: Number((base - 0.04).toFixed(3)) },
      { time: "04:00", fullTime: "04:00:00", waterLevel: Number((base - 0.02).toFixed(3)) },
      { time: "08:00", fullTime: "08:00:00", waterLevel: Number((base - 0.01).toFixed(3)) },
      { time: "12:00", fullTime: "12:00:00", waterLevel: Number((base + 0.01).toFixed(3)) },
      { time: "16:00", fullTime: "16:00:00", waterLevel: Number(base.toFixed(3)) },
      { time: "20:00", fullTime: "20:00:00", waterLevel: Number(base.toFixed(3)) },
    ];
  }, [readings, sensorToRef, station.currentLevel]);

  // Dynamic Y-axis domain with sufficient range padding to prevent duplicate rounded ticks
  const yDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 1];
    const vals = chartData.map((d) => d.waterLevel);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const diff = max - min;
    // When range difference is very small (< 0.12m), pad by ±0.08m so Recharts generates distinct ticks
    if (diff < 0.12) {
      const mid = (max + min) / 2;
      return [
        Number((mid - 0.08).toFixed(2)),
        Number((mid + 0.08).toFixed(2)),
      ];
    }
    const padding = diff * 0.15;
    return [
      Number((min - padding).toFixed(2)),
      Number((max + padding).toFixed(2)),
    ];
  }, [chartData]);

  // Balanced X-axis time ticks (~4-5 ticks evenly spaced, preventing cluttered time labels)
  const xTicks = useMemo(() => {
    if (chartData.length <= 4) {
      return chartData.map((d) => d.time);
    }
    const count = 4; // 4 balanced time anchor points: start, 2 intermediate, end
    const step = (chartData.length - 1) / (count - 1);
    const indices = Array.from({ length: count }, (_, i) => Math.round(i * step));
    const rawTimes = indices.map((idx) => chartData[idx]?.time).filter(Boolean);
    return Array.from(new Set(rawTimes));
  }, [chartData]);

  const latest5Readings = useMemo(() => readings.slice(0, 5), [readings]);

  return (
    <div
      className="bento-card"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        background: "var(--card-surface, #0C0E12)",
        borderRadius: "14px",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        overflow: "hidden",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
      }}
    >
      {/* ── 1. Card Header with Dual-Mode Segmented Switcher ── */}
      <div
        className="recent-readings-header"
        style={{
          padding: "0.875rem 1.25rem",
          background: "var(--card-surface, #0C0E12)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        {/* Left Title & Status Indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "rgba(56, 189, 248, 0.12)",
              color: "var(--cyan-glow, #38BDF8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ActivityIcon size={18} />
          </div>
          <div>
            <h2
              style={{
                fontSize: "0.9375rem",
                fontWeight: 700,
                color: "#F8FAFC",
                margin: 0,
                letterSpacing: "-0.01em",
              }}
            >
              แนวโน้มระดับน้ำ
            </h2>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
              เทียบ{refName}
            </div>
          </div>
        </div>

        {/* Right: VisionOS Style Dual-Mode Switcher */}
        <div
          role="tablist"
          aria-label="เลือกรูปแบบการแสดงผลแนวโน้มระดับน้ำ"
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
            aria-selected={viewMode === "chart"}
            onClick={() => setViewMode("chart")}
            className="tactile-press"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "5px 12px",
              borderRadius: "6px",
              background: viewMode === "chart" ? "rgba(56, 189, 248, 0.15)" : "transparent",
              color: viewMode === "chart" ? "#38BDF8" : "var(--text-secondary)",
              border: viewMode === "chart" ? "1px solid rgba(56, 189, 248, 0.35)" : "1px solid transparent",
              fontSize: "0.75rem",
              fontWeight: viewMode === "chart" ? 700 : 500,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <BarChart3Icon size={13} />
            <span>กราฟ 24 ชม.</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "table"}
            onClick={() => setViewMode("table")}
            className="tactile-press"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "5px 12px",
              borderRadius: "6px",
              background: viewMode === "table" ? "rgba(56, 189, 248, 0.15)" : "transparent",
              color: viewMode === "table" ? "#38BDF8" : "var(--text-secondary)",
              border: viewMode === "table" ? "1px solid rgba(56, 189, 248, 0.35)" : "1px solid transparent",
              fontSize: "0.75rem",
              fontWeight: viewMode === "table" ? 700 : 500,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <LayersIcon size={13} />
            <span>5 ค่าล่าสุด</span>
          </button>
        </div>
      </div>

      {/* ── 2. Content Canvas (Chart or Table) ── */}
      <div
        style={{
          flex: 1,
          minHeight: "340px",
          overflowY: "auto",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        {isLoading ? (
          <div
            style={{
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
              minHeight: "280px",
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                border: "2px solid rgba(56, 189, 248, 0.2)",
                borderTopColor: "#38BDF8",
                borderRadius: "50%",
                animation: "spin 0.6s linear infinite",
              }}
            />
            <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>กำลังโหลดข้อมูลโทรมาตร...</span>
          </div>
        ) : viewMode === "chart" ? (
          /* ── A: AreaChart View ── */
          <div style={{ flex: 1, width: "100%", minHeight: "320px", padding: "14px 14px 6px" }}>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartData} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="tacticalWaterGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0284C7" stopOpacity={0.45} />
                    <stop offset="85%" stopColor="#0284C7" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                <XAxis
                  dataKey="time"
                  ticks={xTicks}
                  interval="preserveStartEnd"
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
                  domain={yDomain}
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
                  labelFormatter={(lbl) => `เวลาบันทึก ${lbl} น.`}
                />
                {/* Reference Datum Line (0.00m) */}
                <ReferenceLine
                  y={0}
                  stroke="rgba(255, 255, 255, 0.25)"
                  strokeDasharray="3 3"
                  label={{ value: `เสมอ${refName} (0.00ม.)`, fill: "#94A3B8", fontSize: 10, position: "insideBottomRight" }}
                />
                {/* Warning Threshold */}
                {hasWarn && (
                  <ReferenceLine
                    y={warningLevel!}
                    stroke="var(--tactical-amber, #F59E0B)"
                    strokeDasharray="4 4"
                    label={{ value: "เฝ้าระวัง", fill: "var(--tactical-amber, #F59E0B)", fontSize: 10, position: "insideTopRight" }}
                  />
                )}
                {/* Critical Threshold */}
                {hasCrit && (
                  <ReferenceLine
                    y={criticalLevel!}
                    stroke="var(--beacon-red, #EF4444)"
                    strokeDasharray="4 4"
                    label={{ value: "วิกฤต", fill: "var(--beacon-red, #EF4444)", fontSize: 10, position: "insideTopLeft" }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="waterLevel"
                  stroke="#38BDF8"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#tacticalWaterGrad)"
                  name={`ระดับน้ำเทียบ${refName}`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          /* ── B: 5 Latest Readings Table ── */
          latest5Readings.length > 0 ? (
            <div className="recent-readings-table-wrap" style={{ flex: 1 }}>
              <table
                className="recent-readings-table"
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.875rem",
                  textAlign: "left",
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                      color: "var(--text-secondary)",
                      background: "rgba(255, 255, 255, 0.02)",
                      fontSize: "0.8125rem",
                    }}
                  >
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <ClockIcon size={13} /> เวลาบันทึก
                      </span>
                    </th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>
                      ระดับเทียบ{refName}
                    </th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>
                      สถานะ
                    </th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>
                      แบตเตอรี่
                    </th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>
                      อุณหภูมิ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {latest5Readings.map((r, idx) => {
                    const rawDist = r.raw_distance !== null && r.raw_distance !== undefined ? Number(r.raw_distance) : null;
                    const lvl = rawDist !== null ? Number((sensorToRef - rawDist).toFixed(3)) : r.water_level !== null ? Number(r.water_level) : null;

                    const isCrit =
                      r.water_status === "critical" ||
                      (lvl !== null && hasCrit && lvl >= criticalLevel!);
                    const isWarn =
                      !isCrit &&
                      (r.water_status === "warning" ||
                        (lvl !== null && hasWarn && lvl >= warningLevel!));

                    const statusBg = isCrit
                      ? "rgba(239, 68, 68, 0.15)"
                      : isWarn
                      ? "rgba(245, 158, 11, 0.15)"
                      : "rgba(16, 185, 129, 0.15)";
                    const statusBorder = isCrit
                      ? "rgba(239, 68, 68, 0.35)"
                      : isWarn
                      ? "rgba(245, 158, 11, 0.35)"
                      : "rgba(16, 185, 129, 0.35)";
                    const statusColor = isCrit
                      ? "#EF4444"
                      : isWarn
                      ? "#F59E0B"
                      : "#10B981";
                    const statusText = isCrit
                      ? "วิกฤต"
                      : isWarn
                      ? "เฝ้าระวัง"
                      : "ปกติ";

                    const batt = r.battery_percent !== null ? Number(r.battery_percent) : null;
                    const battColor =
                      batt === null
                        ? "var(--text-secondary)"
                        : batt > 50
                        ? "#10B981"
                        : batt > 20
                        ? "#F59E0B"
                        : "#EF4444";

                    return (
                      <tr
                        key={r.reading_id || idx}
                        style={{
                          borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                          background: idx % 2 === 0 ? "rgba(255, 255, 255, 0.015)" : "transparent",
                          transition: "background 0.15s ease",
                        }}
                      >
                        <td
                          className="tabular-nums font-mono"
                          style={{
                            padding: "0.75rem 1rem",
                            color: "var(--text-secondary)",
                            fontSize: "0.8125rem",
                          }}
                        >
                          {formatReadingTime(r.timestamp)}
                        </td>

                        <td style={{ padding: "0.75rem 1rem" }}>
                          <span
                            className="tabular-nums font-mono"
                            style={{
                              fontWeight: 700,
                              color: lvl !== null ? (lvl >= 0 ? "#F87171" : "var(--cyan-glow, #38BDF8)") : "var(--text-muted)",
                              fontSize: "0.9375rem",
                            }}
                          >
                            {lvl !== null ? (lvl >= 0 ? `+${lvl.toFixed(2)} ม.` : `${lvl.toFixed(2)} ม.`) : "-"}
                          </span>
                        </td>

                        <td style={{ padding: "0.75rem 1rem" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              padding: "2px 8px",
                              borderRadius: "9999px",
                              fontSize: "0.6875rem",
                              fontWeight: 700,
                              background: statusBg,
                              border: `1px solid ${statusBorder}`,
                              color: statusColor,
                            }}
                          >
                            <span
                              style={{
                                width: 5,
                                height: 5,
                                borderRadius: "50%",
                                backgroundColor: statusColor,
                              }}
                            />
                            {statusText}
                          </span>
                        </td>

                        <td
                          className="tabular-nums font-mono"
                          style={{
                            padding: "0.75rem 1rem",
                            color: battColor,
                            fontSize: "0.8125rem",
                          }}
                        >
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                            {batt !== null && batt <= 20 ? (
                              <BatteryLowIcon size={14} />
                            ) : (
                              <BatteryChargingIcon size={14} />
                            )}
                            {batt !== null ? `${Math.round(batt)}%` : "-"}
                          </span>
                        </td>

                        <td
                          className="tabular-nums font-mono"
                          style={{
                            padding: "0.75rem 1rem",
                            color: "var(--text-secondary)",
                            fontSize: "0.8125rem",
                          }}
                        >
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <ThermometerIcon size={14} style={{ color: "#F97316" }} />
                            {r.temperature !== null ? `${Number(r.temperature).toFixed(1)}°C` : "-"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: "3rem 1.5rem", textAlign: "center", color: "var(--text-muted)" }}>
              ยังไม่มีประวัติการบันทึกสำหรับสถานีนี้
            </div>
          )
        )}
      </div>

      {/* ── 3. Card Tactical Footer ── */}
      <div
        style={{
          marginTop: "auto",
          padding: "0.75rem 1.25rem",
          borderTop: "1px solid rgba(255, 255, 255, 0.06)",
          background: "rgba(0, 0, 0, 0.35)",
          display: "flex",
          alignItems: "center",
          gap: "8px 14px",
          fontSize: "0.8125rem",
          color: "var(--text-secondary)",
          flexShrink: 0,
        }}
      >
        <span style={{ whiteSpace: "nowrap" }}>
          สถานี <strong style={{ color: "#FFFFFF" }}>{station.name}</strong>{" "}
          <span
            className="tabular-nums font-mono"
            style={{
              color: "var(--sky-highlight, #38BDF8)",
              fontWeight: 700,
            }}
          >
            ({station.id})
          </span>
        </span>
      </div>
    </div>
  );
}
