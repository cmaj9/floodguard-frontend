# Rule: Comprehensive Responsive Architecture & UI/UX Standards

This workspace enforces strict canonical responsive architecture, multi-viewport ergonomics, and accessibility standards across all screen sizes. All frontend refactoring, components, and layout implementations must strictly adhere to the following non-negotiable rules.

---

## 1. Strict Guardrails & Non-Negotiable Constraints

### 1.1 Zero Unwarranted Design Drift (Critical)
- **Do NOT alter, redesign, or restyle any visual elements unrelated to responsive behavior.**
- Retain the exact color palette, theme tokens, brand identity, typography pairings, borders, shadows, and core aesthetic character of the original design.
- Do NOT introduce decorative changes, new visual themes, or arbitrary layout revamps. Any layout shift must strictly serve responsive accessibility, ergonomics, and structural viewport adaptation.

### 1.2 Adaptive Scope
- Existing CSS/components may be refactored or wrapped in responsive shells, layout adapters, and conditional viewports as long as they strictly comply with these architectural rules.

### 1.3 Engineering Standards
- Execute with Principal Frontend / Application Developer rigor.
- Focus intensely on usability, ergonomics, accessibility (WCAG 2.2 AA/AAA), and performance.
- Every breakpoint shift must feel natural, intentional, and ergonomic.

---

## 2. Breakpoint Classification Laws (Canonical Window Size Classes)

Layout logic must be dynamically determined by Logical Viewport Width and Height—never hardcoded to specific hardware models:

### 2.1 Compact Viewport (< 600dp / px width)
- **Target Environments**: Smartphones in portrait, folded foldables, small split-screen panes (e.g., iPad Slide Over, 1/3 Split View).
- **Shell Architecture**: Strictly Single-Pane layout. Secondary screens push/pop via navigation stacks or present as overlays.
- **Primary Navigation**: Bottom Navigation Bar / Tab Bar anchored directly to bottom safe area:
  - Height: 56dp to 80dp.
  - Destination Count: 3 to 5 primary destinations maximum.
  - Labeling: Persistent or active-only text labels with vector icons.
- **Spatial Metrics**:
  - Screen Margin: Exactly 16dp / 16px.
  - Responsive Grid: 4-column layout.
  - Column Gutters: 8dp to 16dp.

### 2.2 Medium Viewport (600dp to 839dp width)
- **Target Environments**: Small tablets (e.g., iPad Mini), unfolded foldables in portrait, large smartphones in landscape.
- **Shell Architecture**: Single-pane default or 50/50 dual-pane only for low information density flows.
- **Primary Navigation**: Vertical Navigation Rail pinned to leading/left edge:
  - Width: 72dp to 80dp.
  - Content: Icon-centric destinations with optional short labels below icons.
- **Spatial Metrics**:
  - Screen Margin: 20pt (iOS) or 24dp (Android).
  - Responsive Grid: 8-column layout.
  - Column Gutters: 16dp to 24dp.
  - Pane Spacer: Exactly 24dp when splitting into two panes.

### 2.3 Expanded Viewport (840dp to 1199dp width)
- **Target Environments**: Standard and Pro tablets (10" to 13") in landscape/portrait, desktop browser windows.
- **Shell Architecture**: Multi-pane Canonical Layouts (List-Detail, Supporting Pane, or Multi-column Feed).
- **Primary Navigation**: Persistent Sidebar / Navigation Drawer (width: 240dp to 280dp) displaying icons, full text labels, and category headers.
- **Spatial Metrics**:
  - Screen Margin: 24dp to 32dp.
  - Responsive Grid: 12-column layout.
  - Column Gutters: 24dp.

### 2.4 Large / Extra-Expanded Viewport (>= 1200dp width)
- **Target Environments**: Large desktop displays, multi-window desktop environments (iPad Stage Manager, Samsung DeX).
- **Shell Architecture**: Centered layout with structural constraints:
  - Container Max-Width: Bound main content to a centered container (`max-width: 1200dp` to `1440dp`; `margin: 0 auto` or `max-w-7xl`).
  - Never allow single data tables, cards, or text columns to stretch unconstrained edge-to-edge across wide viewports.

---

## 3. Canonical Layout Implementation Patterns

Map screen information architecture to exactly one of the three patterns:

### 3.1 List-Detail Pattern (Hierarchical & Relational Data)
- **Compact Viewport**: Master List and Detail operate as separate navigation steps via stack navigation (push/pop with back button).
- **Medium & Expanded Viewports**: Display side-by-side simultaneously:
  - Master List Pane: Fixed width 360dp to 400dp (or ~40% width).
  - Detail Pane: Fills remaining available width (`flex: 1` / `flex-grow: 1`).
  - State: Selected item highlighted; deep links open detail pane while preserving list scroll position.

### 3.2 Supporting Pane Pattern (Focus + Context / Ancillary Tools)
- **Compact Viewport**: Focus Pane occupies 100% width. Supporting Pane collapses into an on-demand modal bottom sheet.
- **Expanded Viewport**: Dual-panel workspace side-by-side:
  - Primary Focus Pane: ~66% width.
  - Supporting Pane: Permanently anchored to trailing edge taking ~33% width.

### 3.3 Feed Pattern (Homogeneous Collections & Catalogs)
- **Compact Viewport**: Single-column vertical stream.
- **Medium & Expanded Viewports**: Multi-column auto-fitting CSS grid using dynamic minmax sizing:
  - `grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));`
  - Gutter spacing: 16dp on Medium, 24dp on Expanded.

---

## 4. Modal, Sheet & Overlay Adaptation Rules

- **Compact Adaptations**: Dialogs, context menus, and filters transform into swipeable Bottom Sheets or Full-screen Dialogs. Anchor primary actions (Confirm, Apply, Close) within the lower 40% thumb zone.
- **Medium & Expanded Adaptations**: Transform bottom sheets into Centered Modal Dialogs with translucent backdrop scrim (max-width capped at 560dp). Context menus transform into Anchored Popovers attached to the triggering interactive target.

---

## 5. Ergonomics, Touch Targets & Short Viewport Laws

### 5.1 Touch Boundaries (Accessibility Laws - Non-Negotiable)
- **Physical Hit Boundaries**: Minimum 48 x 48 dp (Android/Web), 44 x 44 pt (iOS). Target minimum 44 x 44 px for Level AAA (never drop below 24 x 24 CSS px per WCAG 2.2 AA SC 2.5.8).
- **Touch Separation**: Minimum 8dp / 8pt clear gap between adjacent interactive targets.
- **Decoupling Visual Size from Target Area**: When visual icons are small (20px–24px), expand clickable area via invisible padding or pseudo-elements (`::after`).

### 5.2 Ergonomic Zone Mapping
- **Handheld / Phone**: Primary controls, tab bars, FABs, and submit buttons must reside within the bottom 40% (Natural Thumb Zone).
- **Tablet / Expanded**: Distribute primary actions along lateral/peripheral borders where hands grip the bezel. Avoid placing primary buttons in the top-center 25% dead zone.
- **Foldables**: Avoid positioning actionable buttons, modal splits, or single-line text across physical hinges.

### 5.3 Short Viewport Rule (Height < 480dp / Phone Landscape)
- Auto-hide Top App Bars on downward scroll.
- Suppress fixed Bottom Nav; switch to a slim auto-hiding side rail or collapsible floating action button.
- Make modal dialogs scrollable to prevent action buttons from being clipped by the screen bottom.

---

## 6. Typography, Line Measure & Asset Scaling

- **Dynamic Text Scaling**: Containers must accommodate up to 200% system font scaling without text truncating into ellipses, overflowing, or overlapping siblings.
- **Reading Measure**: Enforce 45 to 75 characters per line (approx. 600dp to 720dp) for running body text. Never stretch paragraph blocks 100% width on Expanded screens.
- **Fluid Typography**: Use `clamp()` for headings (e.g., `font-size: clamp(1.25rem, 1rem + 1vw, 2rem);`).
- **Asset Density**: All functional glyphs must be SVG. Raster images must use `srcset` (1x, 2x, 3x) and `image-set`.

---

## 7. Presentation & TV Wall Fullscreen Mode Specification

When entering TV Wall / Kiosk Fullscreen Mode:
- **Navigation Suppression**: Fully unmount or hide mobile bottom bars, navigation rails, and side drawers.
- **Fullscreen API**: Bind to `document.documentElement.requestFullscreen()`.
- **Dashboard Grid Scaling**: Transition grid into high-density, auto-scaling wall layout spanning 100vw and 100vh. Enforce high-contrast text and prominent metric counters legible from a 3-meter distance. Zero scrollbars allowed; all widgets flex-fit screen dimensions.
- **Overlay Protection**: Exit controls or settings must anchor to peripheral corners with low-opacity hover triggers.

---

## 8. Web App, PWA & Modern Frontend Technical Constraints

- **Viewport Meta**:
  ```html
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  ```
- **Viewport Units**: Use `100dvh` or `100svh`. Ban legacy `100vh` on full-height screens.
- **Safe Area Integration**:
  ```css
  padding-top: calc(env(safe-area-inset-top, 0px) + [base-spacing]);
  padding-bottom: calc(env(safe-area-inset-bottom, 0px) + [base-spacing]);
  padding-left: calc(env(safe-area-inset-left, 0px) + [base-spacing]);
  padding-right: calc(env(safe-area-inset-right, 0px) + [base-spacing]);
  ```
- **Full-Bleed Canvas**: Backgrounds and header colors bleed edge-to-edge behind notches and home bars; interactive children remain inside safe paddings.
- **iOS Input Zoom Prevention**: All inputs/selects/textareas must have `font-size: >= 16px` (or `1rem`).
- **Touch Responsiveness**: Apply `touch-action: manipulation;` on interactive items to remove the 300ms double-tap delay.
- **CSS / Breakpoint Mapping**:
  - Compact: Base classes (< 600px / < 640px)
  - Medium: 600px – 839px (md: 768px – 1023px)
  - Expanded: 840px – 1199px (lg: >= 1024px)
  - Large: >= 1200px (xl / 2xl container bounds `max-w-7xl mx-auto`)

---

## 9. Code Quality & Completeness Directive

- Provide fully working, syntactically clean, and complete production code.
- Do NOT use placeholder comments, partial structural blocks, or ellipsis syntax (e.g., `/* ...rest unchanged... */`).
- Preserve all existing business logic, states, hooks, and props while upgrading the responsive presentation shells.

---

## 10. Visual-First Communication & Zero-Redundancy Directive

- **No Verbose / Repetitive Descriptions**: Never write lengthy explanatory paragraphs when design elements can convey the meaning instantly.
- **Communicate via Design Tokens**:
  - **Status Colors**: Emerald (#10B981) for Normal, Amber (#F59E0B) for Watch/Warning, Crimson (#EF4444) for Critical, Slate (#64748B) for Offline.
  - **Categorized Accent Colors**: Cyan for Stations, Blue for Users, Emerald for History/CSV, Violet for LINE Notifications.
  - **Accent Borders & Badges**: Use concise pills (e.g. `2 สถานี`, `ปกติ`, `100%`) instead of repetitive sentences.
- **Aesthetic Refinement (No Glowing Blurs)**:
  - Do NOT apply neon/glow blurs to icons. Use crisp modern surfaces, subtle tinted badge backgrounds, and categorized color accents.

---

## 11. Zero Horizontal Overflow & Hybrid Responsive Data Cards

- **Zero Horizontal Overflow Law**: The application must never trigger a horizontal page scrollbar on any device viewport.
  ```css
  html, body, #root, .app-layout, .main-content, .page-container {
    max-width: 100vw !important;
    overflow-x: hidden !important;
    box-sizing: border-box !important;
  }
  ```
- **Hybrid Responsive Data Cards Pattern**:
  - On Compact screens (<= 768px), wide data tables (readings, stations, users) MUST automatically adapt into **Compact Data Cards** with left status accent borders, prominent metrics, and concise metadata.
  - Raw multi-column tables are preserved exclusively for Expanded screens (> 768px).

---

## 12. Canonical 5-Tab Navigation & Management Hub Architecture

- **Elimination of Navigation Duplication**: Never place "Notifications" in BottomNav if TopBar already contains the live notification bell.
- **Canonical 5-Tab Order**:
  1. แดชบอร์ด (`/dashboard`)
  2. กราฟน้ำ (`/chart`)
  3. ประวัติข้อมูล (`/history`)
  4. การจัดการ (`/management`)
  5. โปรไฟล์ (`/profile` หรือ `/login` สำหรับ Guest) — Profile is strictly far-right.
- **Dedicated Management Hub (`/management`)**:
  - Management actions must open a full-page Hub, never an ephemeral drawer.
  - All sub-pages (`/stations`, `/users`, `/subscribe`) must include a Sticky App-Header Back Bar: `[← กลับศูนย์จัดการ]`.

---

## 13. Three-Tier Role-Based Access Control (RBAC) Invariants

1. **General User / Citizen (ประชาชนทั่วไป)**:
   - View public stations on GIS map & live telemetry.
   - View historical trends (hourly, daily, weekly).
   - Edit own profile & subscribe to LINE alerts.
   - **STRICT PROHIBITION**: Never expose or allow CSV Export.
2. **Local Staff (เจ้าหน้าที่ส่วนท้องถิ่น)**:
   - Monitor stations in assigned jurisdiction.
   - Export CSV data from charts and history tables.
   - Configure station parameters, reference points, offsets, warning/critical thresholds, geofencing, and calibration presets.
   - **STRICT PROHIBITION**: Cannot delete stations and cannot manage staff/admin user accounts.
3. **Administrator (ผู้ดูแลระบบ)**:
   - Full CRUD on all stations across the entire system.
   - Full CRUD on all user accounts (Local Staff & Citizens).
   - Export CSV across all stations and manage system-wide settings.

