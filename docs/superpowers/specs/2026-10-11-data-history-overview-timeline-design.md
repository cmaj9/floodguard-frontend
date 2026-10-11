# Design Specification: Data History Overview Timeline & Flexible Page Size

**Date:** 2026-10-11  
**Target Surface:** `src/pages/DataHistoryPage.tsx` and `src/index.css`  
**Goal:** Enhance the data history telemetry cockpit with an integrated 24-hour activity timeline strip (for rapid macro-level situation assessment and direct time-slice jumping) and a flexible page size selector (50 / 100 / 200 rows per page), solving the limitation of viewing large telemetry datasets in a fixed 50-row window.

---

## 1. Problem Statement & User Need

In the current telemetry cockpit, the fixed `PAGE_SIZE = 50` limit fragments high-frequency telemetry readings (logged every 1–5 minutes) into dozens of disjoint pages (e.g. 62 pages for 3,100 records). Field officers and administrators cannot easily:
1. Grasp when peak flood or abnormal events occurred over a 24-hour window without scanning page by page.
2. Adjust reading density to review 100 or 200 items in a single uninterrupted view.
3. Rapidly jump to the exact hour when water levels crossed warning or critical thresholds.

---

## 2. Architecture & State Management

### 2.1 State Variables
- `pageSize`: `number` (Allowed values: `50 | 100 | 200`, default: `50`).
  - Persisted in browser `localStorage` under key `'floodguard_history_page_size'`.
  - Automatically resets `page = 0` whenever `pageSize` changes.
- `selectedHour`: `number | null` (Allowed values: `0..23` or `null`).
  - Represents the selected hour of the day to isolate telemetry rows.
  - When non-null, filters displayed readings to those where `new Date(r.timestamp).getHours() === selectedHour`.
  - A dismiss button `[✕ ล้างตัวกรองชั่วโมง]` clears this filter.

### 2.2 Data Fetching & Query Key Alignment
- TanStack Query key in `useQuery` is updated to include `pageSize`:
  ```ts
  queryKey: ['readings-history', filterStation, filterStart, filterEnd, page, pageSize]
  ```
- Query parameters passed to `fetchReadingsHistory`:
  ```ts
  const queryParams: ReadingsHistoryParams = useMemo(() => {
    const params: ReadingsHistoryParams = {
      limit: pageSize,
      offset: page * pageSize,
    };
    if (filterStation) params.stationId = filterStation;
    if (filterStart) params.start = new Date(filterStart).toISOString();
    if (filterEnd) params.end = new Date(filterEnd).toISOString();
    return params;
  }, [filterStation, filterStart, filterEnd, page, pageSize]);
  ```
- `staleTime: 15_000`, `placeholderData: keepPreviousData`, and silent background auto-sync (`refetchInterval: 30_000`) remain intact.

---

## 3. Component Specifications

### 3.1 Integrated Tactical Activity Timeline Strip (`.history-activity-timeline`)
- **Placement:** Nested directly beneath `.table-header-tabstrip` inside the main telemetry card container, right above the table header.
- **Visual Design:**
  - Slim 32px height horizontal bar.
  - Displays 24 distinct segment blocks representing hours `00:00` to `23:00`.
  - Bottom subtle time tick labels (`00:00`, `06:00`, `12:00`, `18:00`, `23:00`).
- **Data Aggregation per Bucket:**
  - For each hour `h` from `0` to `23`, scans the current loaded readings (or filtered set):
    - Computes count of readings in that hour.
    - Determines the peak water status:
      - `critical` (`var(--color-critical, #EF4444)`) if any reading is critical.
      - `warning` (`var(--color-warning, #F59E0B)`) if any reading is warning or anomaly.
      - `normal` (`var(--color-normal, #10B981)`) if readings exist and all are normal.
      - `empty` (`rgba(255, 255, 255, 0.05)`) if no readings exist in this hour.
    - Computes peak water level in that hour.
- **Interactions:**
  - **Hover:** Displays interactive floating tactical tooltip showing:
    - `"ช่วงเวลา HH:00 - HH:59"`
    - `"ระดับน้ำสูงสุด: +X.XX ม."` (or `"ไม่มีข้อมูล"`)
    - `"สถานะ: ปกติ / เฝ้าระวัง / วิกฤต (N บันทึก)"`
  - **Click:**
    - Toggles `selectedHour = (selectedHour === h ? null : h)`.
    - If selected, highlights the segment with an active illuminated border and glow matching the status color.
    - Shows an active filter chip above the table: `"กรองเฉพาะช่วง HH:00 น. (N รายการ)"` with a reset button.
  - **Accessibility:**
    - Each segment is rendered as a `<button>` with `role="button"`, `aria-label`, and `aria-pressed`.

### 3.2 Tactical Page Size Selector (`.tactical-page-size-selector`)
- **Placement:** Positioned in the pagination control bar at the bottom of the table/cards, adjacent to the record count and pagination buttons.
- **Visual Design:**
  - Segmented tactical pill group:
    - Label: `"แสดงต่อหน้า"` (Zero-colon rule enforced).
    - Buttons: `50`, `100`, `200`.
    - Active button highlights with `var(--accent-cyan, #38bdf8)` background, border, and glow.
- **Behavior:**
  - Click updates `pageSize` state and saves to `localStorage`.
  - Automatically resets current page to `0`.

---

## 4. Responsive & Accessibility Standards

- **Mobile Viewport (≤ 768px):**
  - Timeline container supports horizontal touch scroll with hidden scrollbars (`-webkit-overflow-scrolling: touch`).
  - Segment touch hit area meets minimum 36–40px touch height standard.
  - Page size buttons scale to min 40px touch height.
- **Contrast Ratios:**
  - All text labels and badge counters maintain > 4.5:1 contrast against dark background `#0C0E12`.
- **Zero-Emoji Policy:**
  - Pure SVG icons only (from `components/ui/Icons.tsx` or `lucide-react`).
- **The Zero-Colon Rule:**
  - Strict prohibition of `:` in Thai text and labels.

---

## 5. Verification Plan

1. **Deterministic Detector:** Run `node C:\Users\usEr\.gemini\config\skills\impeccable\scripts\detect.mjs --json src/pages/DataHistoryPage.tsx` to verify 0 findings.
2. **TypeScript & Bundler:** Run `npm run build` (`tsc -b && vite build`) to confirm 0 compilation errors and clean asset generation.
3. **Functional Verification:**
   - Switching page size between 50, 100, and 200 properly updates total pages, query limit, and refreshes data without layout jitter.
   - Clicking an hour bucket on the timeline isolates records for that hour and displays the reset chip.
   - Page size selection persists across browser refreshes via `localStorage`.
