import { memo } from "react";
import type { Station } from "../../types";
import {
  DropletsIcon,
  CheckCircleIcon,
  MapPinIcon,
} from "../ui/Icons";

interface StationSegmentedControlProps {
  stations: Station[];
  selectedStationId: string | null;
  onSelectStation: (stationId: string) => void;
}

/**
 * Intuitive Station Selector Cards (Dashboard Concept - Metric / KPI Tabs)
 * Designed for maximum ergonomics, zero cognitive friction, and large click targets (Fitts's Law).
 */
export const StationSegmentedControl = memo(function StationSegmentedControl({
  stations,
  selectedStationId,
  onSelectStation,
}: StationSegmentedControlProps) {
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      {/* ── Prominent Interactive Station Cards Grid ── */}
      <div
        role="tablist"
        aria-label="สถานีตรวจวัดระดับน้ำ"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "1rem",
        }}
      >
        {stations.map((station) => {
          const isSelected = selectedStationId === station.id;
          const isOffline = !station.isActive || station.operatingStatus === "offline";

          // Status colors
          let statusColor = "#10B981";
          let statusBg = "rgba(16, 185, 129, 0.15)";
          let statusBorder = "rgba(16, 185, 129, 0.3)";
          let statusText = "ปกติ (ปลอดภัย)";

          if (isOffline) {
            statusColor = "#94A3B8";
            statusBg = "rgba(100, 116, 139, 0.15)";
            statusBorder = "rgba(100, 116, 139, 0.3)";
            statusText = "ออฟไลน์";
          } else if (station.status === "critical") {
            statusColor = "#EF4444";
            statusBg = "rgba(239, 68, 68, 0.15)";
            statusBorder = "rgba(239, 68, 68, 0.35)";
            statusText = "ระดับวิกฤต (ล้นตลิ่ง)";
          } else if (station.status === "warning") {
            statusColor = "#F59E0B";
            statusBg = "rgba(245, 158, 11, 0.15)";
            statusBorder = "rgba(245, 158, 11, 0.35)";
            statusText = "เฝ้าระวังน้ำสูง";
          }

          const formattedLevel = isOffline
            ? "-"
            : typeof station.currentLevel === "number"
            ? (station.currentLevel > 0 ? "+" : "") + station.currentLevel.toFixed(2)
            : "-";

          return (
            <button
              key={station.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => onSelectStation(station.id)}
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "0.875rem",
                padding: "1.125rem 1.25rem",
                borderRadius: "1rem",
                textAlign: "left",
                cursor: "pointer",
                border: isSelected
                  ? "2px solid #0284c7"
                  : "1px solid rgba(255, 255, 255, 0.1)",
                background: isSelected
                  ? "linear-gradient(135deg, rgba(2, 132, 199, 0.15) 0%, rgba(15, 23, 42, 0.95) 100%)"
                  : "rgba(15, 23, 42, 0.75)",
                boxShadow: isSelected
                  ? "0 4px 16px rgba(0, 0, 0, 0.35)"
                  : "0 2px 8px rgba(0, 0, 0, 0.2)",
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                outline: "none",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.45)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.background = "rgba(26, 36, 56, 0.85)";
                  e.currentTarget.style.boxShadow =
                    "0 8px 24px rgba(0, 0, 0, 0.4)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor =
                    "rgba(255, 255, 255, 0.1)";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.background = "rgba(15, 23, 42, 0.75)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 14px rgba(0, 0, 0, 0.25)";
                }
              }}
            >
              {/* Top Accent Line for Selected Card */}
              {isSelected && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "3px",
                    background: "#2563EB",
                  }}
                />
              )}

              {/* ── Card Header: Station ID Badge & Active State Indicator ── */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.5rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  {/* Clean status dot */}
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: statusColor,
                      flexShrink: 0,
                    }}
                  />

                  {/* ID Badge */}
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontWeight: 800,
                      fontSize: "0.8125rem",
                      padding: "0.2rem 0.55rem",
                      borderRadius: "0.375rem",
                      background: isSelected
                        ? "rgba(37, 99, 235, 0.2)"
                        : "rgba(255, 255, 255, 0.08)",
                      color: isSelected
                        ? "#38BDF8"
                        : "var(--text-primary)",
                      letterSpacing: "0.04em",
                      border: isSelected
                        ? "1px solid rgba(56, 189, 248, 0.3)"
                        : "1px solid transparent",
                    }}
                  >
                    {station.id}
                  </span>

                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {station.stationType || "จุดตรวจวัดหลัก"}
                  </span>
                </div>

                {/* Selection indicator pill */}
                {isSelected && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      fontSize: "0.6875rem",
                      fontWeight: 700,
                      padding: "0.2rem 0.6rem",
                      borderRadius: "9999px",
                      background: isOffline
                        ? "rgba(100, 116, 139, 0.18)"
                        : "rgba(2, 132, 199, 0.15)",
                      border: isOffline
                        ? "1px solid rgba(100, 116, 139, 0.35)"
                        : "1px solid rgba(56, 189, 248, 0.3)",
                      color: isOffline ? "#94A3B8" : "#38BDF8",
                    }}
                  >
                    {!isOffline && <CheckCircleIcon size={12} />}
                    <span>{isOffline ? "เลือกสถานีนี้" : "กำลังแสดงข้อมูล"}</span>
                  </span>
                )}
              </div>

              {/* ── Card Body: Station Name & Location ── */}
              <div>
                <h3
                  style={{
                    fontSize: "1.0625rem",
                    fontWeight: 700,
                    color: isSelected ? "#FFFFFF" : "#E2E8F0",
                    margin: "0 0 0.25rem 0",
                    lineHeight: 1.3,
                  }}
                >
                  {station.name}
                </h3>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    color: "var(--text-secondary)",
                    fontSize: "0.75rem",
                  }}
                >
                  <MapPinIcon
                    size={12}
                    style={{ color: "var(--sky-highlight)", flexShrink: 0 }}
                  />
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {station.location ||
                      `${station.district || ""} ${station.province || ""}`}
                  </span>
                </div>
              </div>

              {/* ── Card Footer: Live Water Level & Status ── */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  paddingTop: "0.625rem",
                  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                  marginTop: "0.25rem",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "0.6875rem",
                      color: "var(--text-muted)",
                      marginBottom: "0.15rem",
                    }}
                  >
                    ระดับน้ำ ({station.referencePointName || "จุดอ้างอิง"})
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: "0.3rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: 900,
                        color: isOffline
                          ? "var(--text-muted)"
                          : isSelected
                          ? "#38BDF8"
                          : "#FFFFFF",
                        fontFamily: "monospace",
                        lineHeight: 1,
                      }}
                    >
                      {formattedLevel}
                    </span>
                    {!isOffline && (
                      <span
                        style={{
                          fontSize: "0.8125rem",
                          color: "var(--text-secondary)",
                          fontWeight: 600,
                        }}
                      >
                        เมตร (ม.)
                      </span>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    padding: "0.25rem 0.65rem",
                    borderRadius: "0.5rem",
                    background: statusBg,
                    border: `1px solid ${statusBorder}`,
                    color: statusColor,
                    fontSize: "0.75rem",
                    fontWeight: 700,
                  }}
                >
                  <DropletsIcon size={12} />
                  <span>{statusText}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});

export default StationSegmentedControl;
