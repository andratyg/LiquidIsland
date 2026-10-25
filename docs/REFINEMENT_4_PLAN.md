# Refinement Phase 4 Plan: Dedicated Bottom Taskbar Overlay Window (Liquid Glass Taskbar at Bottom of Screen)

## Overview
Refinement Phase 4 permanently solves the placement of the Liquid Glass Taskbar dock. Instead of being restricted to the top `220px` canvas of the Dynamic Island, LiquidIsland OS creates and positions a dedicated, transparent, always-on-top, click-through-aware secondary Tauri window labeled `"taskbar-dock"` positioned flush at the bottom of the screen (`y: monitor_height - 68px`).

---

## 1. Rust Dedicated Bottom Taskbar Window (`src-tauri/src/taskbar.rs` & `src-tauri/src/lib.rs`)

### 1.1 `spawn_or_update_taskbar_window(app: &tauri::AppHandle)`
- Created during `.setup()` in `src-tauri/src/lib.rs`.
- Spawns a secondary `WebviewWindow` labeled `"taskbar-dock"` loading `WebviewUrl::App("index.html?window=taskbar".into())`.
- Properties:
  - `decorations: false`
  - `transparent: true`
  - `always_on_top: true`
  - `skip_taskbar: true`
  - `shadow: false`
  - `resizable: false`
- **Dynamic Monitor Geometry:**
  - Queries `app.primary_monitor()`.
  - Calculates:
    - Width: `monitor.size().width` (full physical monitor width)
    - Height: `(68.0 * scale).round()`
    - X: `monitor.position().x`
    - Y: `monitor.position().y + monitor.size().height - height`
  - Sets physical size and position flush at the bottom edge of the display.

### 1.2 Win32 `GetCursorPos` Hit-Test Loop for `"taskbar-dock"`
- Spawns a lightweight background thread (every 35ms) tracking cursor position relative to the dock capsules:
  - When cursor is inside the Option A bar or Option B floating capsules:
    `window.set_ignore_cursor_events(false)`
  - When cursor is in the empty transparent regions outside the capsules:
    `window.set_ignore_cursor_events(true)`
- Allows full click-through to underlying Windows apps (desktop icons, taskbar elements, full-screen apps) while preserving 100% interactive responsiveness on the capsules.

### 1.3 Native Windows `Shell_TrayWnd` Composition
- In `apply_taskbar_mode(mode, theme)`:
  - Uses `SetWindowCompositionAttribute` with `ACCENT_ENABLE_ACRYLICBLURBEHIND` (or transparent acrylic) on `Shell_TrayWnd` so the native Windows taskbar background turns translucent or clear, seamlessly blending behind our Liquid Glass dock capsules.

---

## 2. Multi-Window Frontend Routing & Store Synchronization (`App.tsx` & `useSystemStore.ts`)

### 2.1 Window Route Detection
- In `src/App.tsx`:
  - Inspects `window.location.search.includes('window=taskbar')` (or `window.__TAURI_METADATA__?.currentWindow?.label === 'taskbar-dock'`).
  - **If `"taskbar-dock"`:**
    - Renders ONLY `<TaskbarPreviewDock />` centered at the bottom of the viewport.
    - Sets window container style with `background: transparent; pointer-events: none;`.
  - **If `"main"`:**
    - Renders the top Dynamic Island (`<IslandShell />`), `<SpotlightModal />`, and `<SettingsModal />`.

### 2.2 Cross-Window IPC Synchronization
- **Tauri Event Bridge:**
  - When settings change in the main window (e.g. changing theme, taskbar mode A/B/C, companion mode), emit `'store-sync'` with the full state payload.
  - The bottom window listens to `'store-sync'` and calls `systemStore.syncFromExternal(payload)` so visual updates are instantaneous.
- **HTML5 Storage Event:**
  - Listens to `window.addEventListener('storage', ...)` as a secondary fallback.
- **Action Triggers from Bottom to Top Window:**
  - Clicking "Search / Start" in the dock emits `'open-spotlight'` -> main window opens Spotlight search modal.
  - Clicking "Settings" in the dock emits `'open-settings'` -> main window opens Settings modal.
  - Clicking "Shelf" or "Music" in the dock emits `'open-slide'` -> main window expands and navigates to the target slide.

---

## 3. UI Polish of `TaskbarPreviewDock.tsx`

### 3.1 Eliminating AI Slop
- Replace all static or emoji elements with crisp SF Pro / Inter typography and minimal Lucide SVG vector icons.
- Connect live real hardware battery status (`batteryLevel`, `isCharging`) from `hardware_monitor.rs` into the tray capsule.
- Synchronize digital clock and date with tabular numeric alignment.
- Implement responsive click-through toggling on mouse enter / mouse leave on the floating dock capsules.

---

## 4. Implementation Steps
1. **Rust Taskbar Window Spawner:**
   - Implement `spawn_or_update_taskbar_window` and `start_dock_hit_test_loop` in `src-tauri/src/taskbar.rs`.
   - Call `spawn_or_update_taskbar_window` in `src-tauri/src/lib.rs` during setup.
2. **Store Action & Bridge:**
   - Add `syncFromExternal` action to `src/store/useSystemStore.ts`.
3. **App Routing & Cross-Window Listeners:**
   - Update `src/App.tsx` to conditionally render `TaskbarPreviewDock` in the bottom window.
   - Wire cross-window events: `store-sync`, `open-spotlight`, `open-settings`, `open-slide`.
4. **TaskbarPreviewDock Polish:**
   - Clean up `src/components/TaskbarPreviewDock.tsx` with live battery, SVG icons, and hover click-through triggers.
5. **Build Verification:**
   - Verify `cargo check`, `npm run build`, and `cargo build`.
