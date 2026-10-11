# Data History Page Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remediate accessibility, mobile touch target, caching performance, and design token issues on the Data History page (`src/pages/DataHistoryPage.tsx` and `src/index.css`) to achieve full WCAG AA compliance and a 20/20 Impeccable Audit Health Score.

**Architecture:** 
1. Harden modal interactions with native ARIA dialog attributes, focus trapping, and escape dismiss handling.
2. Adapt tactical UI elements (pagination, buttons, accordions) to meet the 44x44px touch target standard on mobile.
3. Eliminate redundant network cascades by integrating `@tanstack/react-query` for history data caching and seamless page transitions.
4. Align visual rhythm, text contrast ratios, and color tokenization.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS / Vanilla CSS Variables, @tanstack/react-query, Lucide React icons.

## Global Constraints
- **Zero-Emoji Policy:** Pure SVG icons only (from `components/ui/Icons.tsx` or `lucide-react`). No Unicode emoji characters.
- **The Zero-Colon Rule:** Do not use `:` in Thai labels.
- **Approval Gate:** Complete each phase sequentially; pause and verify with `npm run build` and get user approval before proceeding to subsequent phases.

---

## Phase 1: Critical Usability, A11y & Fetch Fixes (P1)

### Task 1: Export Scope Modal Focus Trap & ARIA Attributes (`$impeccable harden`)
**Files:**
- Modify: `src/pages/DataHistoryPage.tsx`

**Requirements:**
- Add `role="dialog"`, `aria-modal="true"`, `aria-labelledby="export-modal-title"` to the modal container.
- Implement an `Escape` key event listener to dismiss the modal when open.
- Implement focus trapping (`Tab` and `Shift+Tab`) inside `.export-modal-panel` so keyboard focus does not leak outside.
- Maintain and restore previously focused trigger element upon close.
- Enlarge close button hit area to at least 40x40px (`min-width: 40px`, `min-height: 40px`).

- [x] **Step 1:** Add focus trap refs (`modalRef`, `previousActiveElementRef`) and `Escape` key listener in `DataHistoryPage.tsx`.
- [x] **Step 2:** Add dialog ARIA attributes and update close button dimensions.
- [x] **Step 3:** Verify keyboard navigation and modal dismiss behavior.

---

### Task 2: Mobile & Desktop Touch Target Remediation (`$impeccable adapt`)
**Files:**
- Modify: `src/index.css`
- Modify: `src/pages/DataHistoryPage.tsx`

**Requirements:**
- Enlarge `.tactical-page-btn` from 28x28px to min 36x36px on desktop and min 44x44px on mobile (`@media (max-width: 768px)`).
- Enlarge table expand chevron button (`DataHistoryPage.tsx`) to min 40x40px touch bounding box.
- Enlarge mobile card accordion button (`DataHistoryPage.tsx`) to `min-height: 44px`.
- Enlarge time presets (`.tactical-btn-item`) touch area on mobile screens to ≥ 40px height.

- [x] **Step 1:** Update `.tactical-page-btn` and `.tactical-btn-item` in `src/index.css`.
- [x] **Step 2:** Update expand button inline styles in `DataHistoryPage.tsx` (table view and mobile card view).
- [x] **Step 3:** Test responsiveness and hit targets across mobile breakpoints.

---

### Task 3: Eliminate Cascading Double Network Fetch (`$impeccable optimize`)
**Files:**
- Modify: `src/pages/DataHistoryPage.tsx`

**Requirements:**
- Prevent duplicate `loadReadings` invocations when changing filter stations or date presets from an offset page (`page > 0`).
- Consolidate filter change reset and page change synchronization.

- [x] **Step 1:** Refactor filter change handlers and effect dependencies to eliminate cascading fetches.
- [x] **Step 2:** Verify that filter updates trigger exactly one fetch request.

---

### Checkpoint 1 (Phase 1 Review Gate)
- Run `npm run build` to confirm zero TypeScript and bundling errors.
- Present completed P1 items for user review and approval before proceeding to Phase 2.

---

## Phase 2: Performance & Query Cache Optimization (P2)

### Task 4: TanStack Query Cache Integration (`$impeccable optimize`)
**Files:**
- Modify: `src/pages/DataHistoryPage.tsx`

**Requirements:**
- Replace manual `useState` + raw `setInterval` history fetching with `useQuery` from `@tanstack/react-query`.
- Configure query key `['readings-history', filterStation, filterStart, filterEnd, page]`.
- Set `staleTime: 15_000`, `refetchInterval: REFRESH_INTERVAL_MS` (30s).
- Use `placeholderData: keepPreviousData` to ensure seamless page transitions without skeleton flashing.

- [x] **Step 1:** Import `useQuery` and `keepPreviousData` from `@tanstack/react-query`.
- [x] **Step 2:** Wire query hook and replace manual timer and fetching logic.
- [x] **Step 3:** Verify smooth pagination and background auto-refetch.

---

### Task 5: ARIA Expanded State on Telemetry Rows (`$impeccable harden`)
**Files:**
- Modify: `src/pages/DataHistoryPage.tsx`

**Requirements:**
- Add `aria-expanded={isExpanded}` and `aria-controls={`telemetry-detail-${r.reading_id}`}` on both desktop table chevron and mobile card accordion buttons.
- Ensure detail container has corresponding `id={`telemetry-detail-${r.reading_id}`}`.

- [x] **Step 1:** Add ARIA attributes to desktop row expand button and expanded container.
- [x] **Step 2:** Add ARIA attributes to mobile accordion button and mobile detail container.

---

### Task 6: Contrast & Layout Rhythm Alignment (`$impeccable colorize` & `$impeccable layout`)
**Files:**
- Modify: `src/index.css`
- Modify: `src/pages/DataHistoryPage.tsx`

**Requirements:**
- Update `.tactical-page-indicator .page-label` in `src/index.css` to `var(--text-muted, #8E9FB5)` to meet WCAG AA 4.5:1 contrast against `#080B0F`.
- Normalize control heights in the toolbar on mobile to a unified 38-40px baseline.

- [x] **Step 1:** Update `.tactical-page-indicator .page-label` styling in `src/index.css`.
- [x] **Step 2:** Align mobile toolbar element heights and flex wrap gaps.

---

### Checkpoint 2 (Phase 2 Review Gate)
- Run `npm run build` to verify clean compilation.
- Present completed P2 items for user review and approval before proceeding to Phase 3.

---

## Phase 3: Visual Polish, Tokens & Final Audit (P3)

### Task 7: Tokenize Hardcoded Hex Colors (`$impeccable polish`)
**Files:**
- Modify: `src/pages/DataHistoryPage.tsx`

**Requirements:**
- Centralize remaining hardcoded color hexes into CSS variables or theme tokens (`var(--status-normal)`, `var(--accent-cyan)`, etc.).

- [x] **Step 1:** Review and replace inline hex codes in KPI cards and status badges.

---

### Task 8: Final Re-Audit Verification (`$impeccable audit`)
**Requirements:**
- Run mechanical detector `node C:\Users\usEr\.gemini\config\skills\impeccable\scripts\detect.mjs --json src/pages/DataHistoryPage.tsx`.
- Perform full review across all 5 dimensions (Design Specificity, Nielsen Heuristics, Cognitive Load, Persona Testing, Contrast/A11y).
- Produce updated score targeting 20/20.

- [x] **Step 1:** Run detector script and verify 0 findings.
- [x] **Step 2:** Deliver final completion audit report.
