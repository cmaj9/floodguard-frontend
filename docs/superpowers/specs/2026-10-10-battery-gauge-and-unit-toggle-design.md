# Design Spec: Battery Micro-Gauge Track & Water Level Unit Toggle (m / cm)

**Date**: 2026-10-10  
**Status**: Approved via Grill-me Interview  
**Target Surface**: `StationTelemetryHub.tsx` (Dashboard Hero & Bento Grid)

---

## 1. Overview & Goals

1. **Battery Level Micro-Gauge Track (`หลอดแบตเตอรี่`)**:
   - Provide an instant visual representation of battery level on the Battery Telemetry Card.
   - Maintain the distilled, minimal look without bottom description text.
   - Use a sleek 4px micro track directly below the `92 %` readout.
   - Dynamic color: Solar Amber (`#F59E0B`) in normal/charging state, turning Red (`#EF4444`) when battery $\le 20\%$.

2. **Water Level Unit Toggle (`สลับหน่วย ม. / ซม.`)**:
   - Allow users to switch between meters (`ม.`) and centimeters (`ซม.`) with a single click.
   - Default mode is always meters (`ม.`).
   - Placement: Compact Micro Segmented Control `[ ม. | ซม. ]` situated directly adjacent to the Hero Water Level Readout.
   - Precision: 1 decimal place in cm mode (e.g. `+0.325 ม.` $\rightarrow$ `+32.5 ซม.`).
   - Coherent sync: Updates both the Hero readout and the integrated calibration grid values below.

---

## 2. Component Architecture & Data Flow

### 2.1 State Management in `StationTelemetryHub.tsx`
```tsx
type WaterUnit = "m" | "cm";
const [waterUnit, setWaterUnit] = useState<WaterUnit>("m");
```

### 2.2 Conversion Helpers
```tsx
const formatWaterLevel = (valInMeters: number, unit: WaterUnit): string => {
  if (unit === "cm") {
    const cmVal = valInMeters * 100;
    const sign = cmVal >= 0 ? "+" : "";
    return `${sign}${cmVal.toFixed(1)}`;
  }
  const sign = valInMeters >= 0 ? "+" : "";
  return `${sign}${valInMeters.toFixed(3)}`;
};

const formatDistance = (valInMeters: number, unit: WaterUnit): string => {
  if (unit === "cm") {
    return `${(valInMeters * 100).toFixed(1)} ซม.`;
  }
  return `${valInMeters.toFixed(2)} ม.`;
};
```

---

## 3. UI Specifications

### 3.1 Water Level Hero & Unit Switcher
- Hero Readout row contains:
  1. Large numeric value: `+0.325` or `+32.5` (`font-size: 48px`, `font-weight: 900`).
  2. Micro Segmented Control:
     - Container: `height: 28px`, `border-radius: 6px`, `background: rgba(255, 255, 255, 0.05)`, `border: 1px solid rgba(255, 255, 255, 0.1)`.
     - Active segment: `background: #0284C7`, `color: #FFFFFF`, `font-weight: 700`, `font-size: 0.75rem`, `padding: 2px 8px`.
     - Inactive segment: `color: var(--text-muted, #94A3B8)`, `font-size: 0.75rem`, `padding: 2px 8px`.

### 3.2 Battery Micro-Gauge Track
- Placed directly inside the bottom value container of Metric Card 3 (`แบตเตอรี่`):
```tsx
{/* Battery Micro Track */}
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
        width: `${Math.max(4, Math.min(100, battPercent))}%`,
        borderRadius: "2px",
        background:
          battPercent <= 20
            ? "linear-gradient(90deg, #DC2626 0%, #EF4444 100%)"
            : "linear-gradient(90deg, #F59E0B 0%, #FBBF24 100%)",
        boxShadow:
          battPercent <= 20
            ? "0 0 8px rgba(239, 68, 68, 0.5)"
            : "0 0 6px rgba(245, 158, 11, 0.35)",
        transition: "width 0.4s ease",
      }}
    />
  </div>
)}
```

---

## 4. Verification & Constraints
- Zero-Colon rule strictly preserved (no `:` in Thai labels).
- All colors verified against `DESIGN.md`: `#38BDF8`, `#0284C7`, `#F59E0B`, `#FBBF24`, `#EF4444`, `#10B981`.
- `detect.mjs` must output 0 errors `[]`.
- `npm run build` must compile cleanly without TS warnings.
- Keep CSV flight button and pastel pink jewel button untouched.
- No git commits or pushes without explicit user permission.
