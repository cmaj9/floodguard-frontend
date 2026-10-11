# Data History Overview Timeline & Flexible Page Size Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a 24-hour activity timeline strip with interactive hourly filtering and a flexible page size selector (50 / 100 / 200 rows per page) in the Data History telemetry cockpit (`src/pages/DataHistoryPage.tsx` and `src/index.css`).

**Architecture:** 
1. Store and persist `pageSize` (50, 100, 200) in `localStorage`, wire it into TanStack Query caching and pagination calculation.
2. Aggregate loaded telemetry readings into 24 hour buckets (`0..23`) with peak water status and water level metrics.
3. Render an interactive `.history-activity-timeline` strip beneath the status tabstrip allowing field operators to click an hour segment to isolate records.
4. Render a segmented `.tactical-page-size-selector` within the pagination footer bar.

**Tech Stack:** React 19, TypeScript, Vite, TanStack Query, Tailwind CSS / Custom CSS Variables, Lucide React icons.

## Global Constraints
- **Zero-Emoji Policy:** Pure SVG icons only (from `components/ui/Icons.tsx` or `lucide-react`). No Unicode emoji characters.
- **The Zero-Colon Rule:** Do not use `:` in Thai labels.
- **Accessibility:** Minimum touch target ≥ 36–40px on mobile, `role="button"`, `aria-label`, and `aria-pressed` on interactive segments.
- **Token Consistency:** Colors must use CSS variables (`var(--accent-cyan)`, `var(--color-normal)`, `var(--color-warning)`, `var(--color-critical)`).

---

### Task 1: Flexible Page Size State & TanStack Query Integration

**Files:**
- Modify: `src/pages/DataHistoryPage.tsx`

**Interfaces:**
- Produces: `pageSize` state (`number`), `handlePageSizeChange(newSize: number)`.
- Updates: `queryParams` and `useQuery` queryKey.

- [x] **Step 1:** Initialize `pageSize` state from `localStorage.getItem('floodguard_history_page_size')` (default 50) and add handler:
```tsx
const [pageSize, setPageSize] = useState<number>(() => {
  const saved = localStorage.getItem("floodguard_history_page_size");
  if (saved === "100") return 100;
  if (saved === "200") return 200;
  return 50;
});

const handlePageSizeChange = (newSize: number) => {
  setPageSize(newSize);
  localStorage.setItem("floodguard_history_page_size", String(newSize));
  setPage(0);
};
```

- [x] **Step 2:** Update `queryParams` and `useQuery` to include `pageSize`:
```tsx
const queryParams: ReadingsHistoryParams = useMemo(() => {
  const params: ReadingsHistoryParams = {
    limit: pageSize,
    offset: page * pageSize,
  };
  if (filterStation) params.stationId = filterStation;
  if (filterStart)   params.start = new Date(filterStart).toISOString();
  if (filterEnd)     params.end = new Date(filterEnd).toISOString();
  return params;
}, [filterStation, filterStart, filterEnd, page, pageSize]);

const {
  data: historyData,
  isLoading,
  error: queryError,
  refetch: refetchHistory,
} = useQuery({
  queryKey: ['readings-history', filterStation, filterStart, filterEnd, page, pageSize],
  queryFn: () => fetchReadingsHistory(queryParams),
  staleTime: 15_000,
  refetchInterval: REFRESH_INTERVAL_MS,
  placeholderData: keepPreviousData,
});
```

- [x] **Step 3:** Update `totalPages` calculation:
```tsx
const totalPages = Math.max(1, Math.ceil(total / pageSize));
```

- [x] **Step 4:** Verify with `npx tsc --noEmit` that types compile without errors.

---

### Task 2: 24-Hour Timeline Bucket Aggregation & Filtering Logic

**Files:**
- Modify: `src/pages/DataHistoryPage.tsx`

**Interfaces:**
- Produces: `selectedHour: number | null` state, `hourlyBuckets: TimelineBucket[]`.

- [x] **Step 1:** Define `TimelineBucket` interface and `selectedHour` state:
```tsx
interface TimelineBucket {
  hour: number;
  label: string;
  count: number;
  maxLevel: number | null;
  status: "normal" | "warning" | "critical" | "empty";
}

const [selectedHour, setSelectedHour] = useState<number | null>(null);
```

- [x] **Step 2:** Implement `hourlyBuckets` calculation using `useMemo` over `readings`:
```tsx
const hourlyBuckets: TimelineBucket[] = useMemo(() => {
  const buckets: TimelineBucket[] = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    label: `${String(h).padStart(2, "0")}:00`,
    count: 0,
    maxLevel: null,
    status: "empty",
  }));

  readings.forEach((r) => {
    const d = new Date(r.timestamp);
    const h = d.getHours();
    if (h >= 0 && h < 24) {
      const b = buckets[h];
      b.count++;
      if (r.water_level != null) {
        b.maxLevel = b.maxLevel == null ? r.water_level : Math.max(b.maxLevel, r.water_level);
      }
      const st = stations.find((s) => s.station_id === r.station_id);
      const s = getReadingWaterStatus(r, st);
      if (s.status === "critical") {
        b.status = "critical";
      } else if (s.status === "warning" && b.status !== "critical") {
        b.status = "warning";
      } else if (b.status === "empty") {
        b.status = "normal";
      }
    }
  });

  return buckets;
}, [readings, stations]);
```

- [x] **Step 3:** Update `filteredReadings` to account for `selectedHour`:
```tsx
if (selectedHour !== null) {
  const readingHour = new Date(r.timestamp).getHours();
  if (readingHour !== selectedHour) return false;
}
```

- [x] **Step 4:** Ensure resetting filters clears `selectedHour` (`setSelectedHour(null)`).

---

### Task 3: Integrated Activity Timeline UI & CSS Styling

**Files:**
- Modify: `src/pages/DataHistoryPage.tsx`
- Modify: `src/index.css`

**Requirements:**
- Render `.history-activity-timeline` below `.table-header-tabstrip`.
- Each hour segment is an interactive button with tooltip and status glow.
- When `selectedHour` is active, display clear chip: `"กรองเฉพาะช่วง HH:00 น."` with an `X` icon button to reset.

- [x] **Step 1:** Add timeline markup and active filter banner in `src/pages/DataHistoryPage.tsx`.
- [x] **Step 2:** Add `.history-activity-timeline`, `.timeline-segment`, and hover tooltip styling in `src/index.css`.
- [x] **Step 3:** Ensure responsive horizontal scrolling on mobile viewports.

---

### Task 4: Tactical Page Size Selector UI & Pagination Footer Alignment

**Files:**
- Modify: `src/pages/DataHistoryPage.tsx`
- Modify: `src/index.css`

**Requirements:**
- Render `.tactical-page-size-selector` in the pagination footer next to page buttons.
- Options: `50`, `100`, `200` with active cyan styling.
- Zero-colon rule: label `"แสดงต่อหน้า"` (not `"แสดงต่อหน้า:"`).

- [x] **Step 1:** Add `.tactical-page-size-selector` JSX in pagination containers (desktop and mobile).
- [x] **Step 2:** Add CSS rules for `.tactical-page-size-selector` in `src/index.css`.
- [x] **Step 3:** Verify responsive layout across desktop and mobile screens.

---

### Task 5: End-to-End Verification & Production Build

- [x] **Step 1:** Run deterministic detector:
```bash
node C:\Users\usEr\.gemini\config\skills\impeccable\scripts\detect.mjs --json src/pages/DataHistoryPage.tsx
```
- [x] **Step 2:** Run TypeScript and Vite build:
```bash
npm run build
```
- [x] **Step 3:** Test page size switching (50, 100, 200) and verify `localStorage` persistence.
- [x] **Step 4:** Test timeline segment click, active filtering, and filter reset.
