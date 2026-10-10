# Design Specification: Kretya Studio Sidebar, Zero-TopBar & Notification Intelligence Hub

**Date:** 2026-10-10  
**Status:** Approved  
**Topic:** UI Architecture Modernization — Kretya Sidebar, Zero-TopBar Canvas, Dedicated Notification Hub & Floating Quick Refresh  

---

## 1. Overview & Goals

FloodGuard's layout shell is being modernized from a traditional top-heavy dashboard into a modern, full-height tactical workspace inspired by the **Kretya Studio** design pattern.

### Key Decisions Resolved Through Discovery:
1. **Zero-TopBar Architecture**: Complete removal of the static 60px TopBar. The application canvas starts directly from the top edge of the viewport, maximizing vertical data visibility for hydro telemetry.
2. **Kretya Studio Collapsible Sidebar**:
   - macOS window control dots (`● ● ●`) at top.
   - Dual-state layout: Full width (`256px`) and compact icon rail (`76px`) with smooth transitions and floating hover tooltips.
   - **No Quick Search Bar** (purged per explicit user requirement).
   - Preserves 100% of existing authentication & logout logic (modal confirmation, guest vs. logged-in state, `id="sidebar-logout-btn"`).
   - Station nodes group with real-time status dots (Green = Online, Slate = Offline).
3. **Dedicated Notification Hub (`/notifications`)**:
   - First-class sidebar navigation item with an unread badge counter (`[2]`).
   - Replaces awkward small popovers with an executive Incident Intelligence Center featuring 24h KPI summary cards (Critical, Warning, Outages, System Health) and time-decay grouped alert feeds.
4. **Floating Tactile Refresh Pod**:
   - A single, ultra-minimal circular frosted glass button (`44×44px`) fixed at the bottom-right corner (`bottom: 28px; right: 28px`), providing 1-click global telemetry refresh without cluttering the screen.

---

## 2. Architecture & File Impacts

### 2.1 File Changes
| File Path | Action | Description |
| :--- | :--- | :--- |
| `src/components/layout/Layout.tsx` | Modify | Remove `<TopBar />`, add `<FloatingRefreshButton />`, maintain `<Sidebar />` & `<BottomNav />` |
| `src/components/layout/Sidebar.tsx` | Rewrite | Implement Kretya Studio structure, collapse/expand toggle, hover tooltips, unit switcher, preserved logout modal |
| `src/components/layout/FloatingRefreshButton.tsx` | Create | Minimalist circular frosted glass button for global `app:refresh` dispatch |
| `src/pages/NotificationHubPage.tsx` | Create | Full-page Alert Intelligence Hub with 24h KPI summary, severity filters, and real notification list |
| `src/App.tsx` | Modify | Register route `/notifications` pointing to `<NotificationHubPage />` |
| `src/index.css` | Modify | Remove `.main-content` top padding, add sidebar collapse transition rules, floating button styles |

---

## 3. Component Specifications

### 3.1 Kretya Sidebar (`Sidebar.tsx`)
- **State Management**:
  - `isCollapsed: boolean` (persisted in `localStorage.getItem("floodguard_sidebar_collapsed")`).
- **Header**:
  - macOS dots (`#FF5F56`, `#FFBD2E`, `#27C93F`).
  - FloodGuard Droplet Logo + collapse/expand toggle icon.
- **Navigation Groups**:
  - **เมนูหลัก (MENU)**:
    - แดชบอร์ด (`/dashboard`)
    - กราฟระดับน้ำ (`/chart`)
    - ประวัติข้อมูล (`/history`)
    - การแจ้งเตือน (`/notifications`) — with dynamic badge counter from `useNotifications().notifications.filter(n => !n.read).length`
  - **การจัดการ (MANAGEMENT)** (Role-gated):
    - จัดการสถานี (`/stations`)
    - จัดการผู้ใช้ (`/users`)
  - **สถานีตรวจวัด (NODES)**:
    - Real stations mapped from API/context with live status dots. Clicking routes to `/dashboard` or `/chart`.
- **Bottom Section**:
  - Segmented unit pill `[ เมตร | ซม. ]`
  - User profile row: avatar circle, name, role.
  - Logout action preserving existing `showLogoutConfirm` dialog with zero functional degradation.
- **Collapsed Mode**:
  - Width: `76px`.
  - Icon-only with centered alignment.
  - Badges compress into top-right dot indicators.
  - Right-aligned floating tooltip pills appear instantly on `:hover`.

### 3.2 Floating Refresh Button (`FloatingRefreshButton.tsx`)
- **Positioning**: `position: fixed; bottom: 28px; right: 28px; z-index: 90;`
- **Dimensions**: `44px × 44px` circular button (meets WCAG touch target).
- **Appearance**: Obsidian glass (`rgba(6, 14, 30, 0.85)` + `backdrop-filter: blur(20px)` + `border: 1px solid rgba(56, 189, 248, 0.35)`).
- **Interaction**:
  - Hover: Elevates by `translateY(-2px)` with subtle cyan glow.
  - Click: Dispatches `window.dispatchEvent(new CustomEvent("app:refresh"))` and runs 0.8s CSS rotation animation.
- **Responsive**: On screen widths `<= 768px`, floats above BottomNav (`bottom: 74px; right: 16px;`).

### 3.3 Notification Intelligence Hub (`NotificationHubPage.tsx`)
- **Route**: `/notifications`
- **Header**:
  - Title: "ศูนย์แจ้งเตือนและประวัติเหตุการณ์"
  - Quick action: "ทำเครื่องหมายอ่านแล้วทั้งหมด" (calls `markAllRead()`)
- **24-Hour KPI Summary**:
  - 4 high-contrast cards:
    1. *วิกฤต (Critical)* — Red badge, count of critical water thresholds
    2. *เฝ้าระวัง (Warning)* — Amber badge, count of warning thresholds
    3. *สถานีขาดการเชื่อมต่อ (Outages)* — Slate badge, count of offline nodes
    4. *สถานะระบบ (Reliability)* — Green badge, "ปกติ 100%"
- **Alert Feed**:
  - Integrated directly with `useNotifications()`.
  - Displays type icon, timestamp, station name, detailed message, and action button (e.g. "ดูกราฟ").

---

## 4. Verification & Quality Gates
- Zero-Colon Rule: No `:` in Thai labels.
- Layout Stability: No reflow, animations use GPU `transform` and `opacity`.
- Mechanical detector: `detect.mjs` must return `[]` (0 errors).
- Build compilation: `npm run build` must complete cleanly with exit code 0.
