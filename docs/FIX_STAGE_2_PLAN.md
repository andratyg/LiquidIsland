# FIX STAGE 2 OF 4: SYSTEM TRAY CAPSULE SUPERCHARGED, SMART DOCK AUTO-HIDE & PERMANENT NATIVE TASKBAR BLOCK

## OVERVIEW
Fix Stage 2 delivers three critical capabilities to LiquidIsland:
1. **Supercharged System Tray Capsule (Image 4):**
   - Exact layout preserved: `^` (Chevron), Wi-Fi icon, Speaker / Volume icon, Battery Pill (`84%`), Digital Clock (`14.16 Sun, 25 Oct`).
   - Every single capsule item is deeply functional with interactive, macOS-style Liquid Glass flyouts:
     - `^` -> **Active Background Apps & System Tray Flyout** (live running apps with crisp uncropped icons from Stage 1, status dots, focus switcher, and LiquidIsland quick tools).
     - **Wi-Fi** -> **Network & Bluetooth Control Center** (toggles for Wi-Fi, Bluetooth, Airplane Mode, plus direct Windows native shortcuts for `ms-availablenetworks:` and `ms-settings:bluetooth`).
     - **Speaker** -> **Volume & Brightness Control Center** (volume and brightness sliders, output device selector, and `ms-settings:sound` shortcut).
     - **Battery Pill** -> **Battery & Power Health Guard** (charging status, power modes: Balanced/Performance/Saver, health guard metric, and `ms-settings:powersleep` shortcut).
     - **Clock** -> **Monthly Calendar & Today's Agenda Flyout** (interactive month calendar, today's checklist tasks from system store, and `ms-settings:dateandtime` shortcut).
2. **Smart Dock Auto-Hide When Using Apps:**
   - In `src-tauri/src/taskbar.rs`, cursor position tracking detects when mouse approaches the bottom screen edge (`pt.y >= monitor_bottom - 12`), revealing the dock with `set_ignore_cursor_events(false)` and emitting `"dock-visibility": true`.
   - While revealed, the mouse can freely interact across the 76px dock (or 360px when a flyout is open).
   - Moving the mouse upward into active applications (`pt.y < monitor_bottom - 80` with no flyout open and dock unpinned) triggers `set_ignore_cursor_events(true)` and emits `"dock-visibility": false`.
   - In `TaskbarPreviewDock.tsx`, spring physics smoothly slides the dock out of the way (`translateY(72px)`) and glides back up (`translateY(0)`).
   - A dock pin button (`📌`) is provided so users can lock the dock visible if preferred.
3. **Permanently Prevent Native Windows Taskbar From Popping Up:**
   - In `taskbar.rs`, the background loop continuously checks whether `Shell_TrayWnd` or `Shell_SecondaryTrayWnd` has become visible (`IsWindowVisible != 0`) while `NATIVE_TASKBAR_HIDDEN` is active.
   - If visible, `ShowWindow(hwnd, SW_HIDE)` is instantly called, preventing Windows Explorer from revealing the native taskbar when pressing keys or clicking screen edges.
   - Restored cleanly with `SW_SHOW` and unclipped regions on app exit or when explicitly toggled.

---

## ARCHITECTURE & IMPLEMENTATION DETAILS

### 1. Rust Native Engine (`src-tauri/src/taskbar.rs` & `src-tauri/src/lib.rs`)
- **Continuous Native Taskbar Suppression:**
  - In `start_dock_hit_test_loop`:
    ```rust
    if NATIVE_TASKBAR_HIDDEN.load(Ordering::Relaxed) {
        let primary = win32::get_taskbar_hwnd();
        if !primary.is_null() && unsafe { IsWindowVisible(primary) } != 0 {
            unsafe { ShowWindow(primary, SW_HIDE) };
        }
        let secondary = win32::get_secondary_taskbar_hwnd();
        if !secondary.is_null() && unsafe { IsWindowVisible(secondary) } != 0 {
            unsafe { ShowWindow(secondary, SW_HIDE) };
        }
    }
    ```
- **Smart Dock Cursor Proximity & Auto-Hide:**
  - Atomic flags:
    - `DOCK_PINNED: AtomicBool` (toggled via `set_dock_pinned`)
    - `FLYOUT_OPEN: AtomicBool` (toggled via `set_taskbar_flyout_open`)
    - `DOCK_HOVERED: AtomicBool` (toggled via `set_dock_click_through`)
  - Logic in 35ms loop:
    - Determine `screen_bottom = pos.y + size.height as i32`.
    - If `is_pinned || is_flyout`: dock is visible, `ignore_cursor = false`.
    - Else if `pt.y >= screen_bottom - 12`: cursor hit bottom edge -> dock revealed (`visible = true`, `ignore_cursor = false`).
    - Else if current dock is revealed and `pt.y >= screen_bottom - (76.0 * scale) as i32`: stay visible (`visible = true`, `ignore_cursor = false`).
    - Else (cursor moved up into app area `pt.y < screen_bottom - (80.0 * scale) as i32`): auto-hide (`visible = false`, `ignore_cursor = true`).
    - Emit `"dock-visibility": bool` and `"dock-hover-state": bool` when visibility state transitions.
- **Windows System Settings Shortcuts:**
  - In `launch_system_action`:
    - `"wifi_networks"`: runs `explorer.exe ms-availablenetworks:` (or fallback `ms-settings:network-wifi`).
    - `"bluetooth_settings"`: runs `cmd /c start ms-settings:bluetooth`.
    - `"sound_settings"`: runs `cmd /c start ms-settings:sound`.
    - `"power_settings"`: runs `cmd /c start ms-settings:powersleep`.
    - `"datetime_settings"`: runs `cmd /c start ms-settings:dateandtime`.

---

### 2. State & Settings Extensions (`src/types/liquid.ts` & `src/store/useSystemStore.ts`)
- Add fields to `LiquidSettings`:
  - `dockPinned: boolean` (default: `false`)
  - `networkSsid: string` (default: `'Home-WiFi-5G'`)
  - `isWifiEnabled: boolean` (default: `true`)
  - `isBluetoothEnabled: boolean` (default: `true`)
  - `isAirplaneMode: boolean` (default: `false`)
  - `powerMode: 'balanced' | 'performance' | 'saver'` (default: `'balanced'`)
  - `batteryHealth: number` (default: `98`)
- Add actions to `useSystemStore`:
  - `setDockPinned(pinned: boolean)`
  - `toggleDockPinned()`
  - `toggleWifi()`
  - `toggleBluetooth()`
  - `toggleAirplaneMode()`
  - `setPowerMode(mode: 'balanced' | 'performance' | 'saver')`

---

### 3. Master Dock Component (`src/components/TaskbarPreviewDock.tsx`)
- **Active Flyout Management:**
  - Single active state: `activeTrayFlyout: 'tray' | 'network' | 'audio' | 'battery' | 'calendar' | null`.
  - When opening any flyout:
    - Inform Rust `set_taskbar_flyout_open(true)` so the upper 360px window region is fully interactive.
  - When closing flyouts:
    - Inform Rust `set_taskbar_flyout_open(false)`.
- **System Tray Capsule Layout (100% faithful to Image 4):**
  1. `^` Button: toggles `activeTrayFlyout === 'tray'`.
  2. Wi-Fi Icon: toggles `activeTrayFlyout === 'network'`.
  3. Speaker / Volume Icon: toggles `activeTrayFlyout === 'audio'`.
  4. Battery Pill (`84%` + charging/battery icon): toggles `activeTrayFlyout === 'battery'`.
  5. Digital Clock (`14.16` + `Sun, 25 Oct`): toggles `activeTrayFlyout === 'calendar'`.
- **Dock Pin & Auto-Hide Animation:**
  - Listen to `"dock-visibility"` and `"dock-hover-state"` events from Rust.
  - Compute `effectiveVisible = isDockPinned || activeTrayFlyout !== null || isDockHovered || isDockVisible`.
  - Animate container with Framer Motion:
    `y: effectiveVisible ? 0 : 72`, `opacity: effectiveVisible ? 1 : 0`.
  - Place a sleek Pin Icon (`📌` / `Pin`) on the main capsule to toggle `isDockPinned` anytime.

---

## IMPLEMENTATION ORDER
1. Update `src-tauri/src/taskbar.rs`:
   - Implement continuous `ShowWindow(hwnd, SW_HIDE)` loop for native taskbars.
   - Implement bottom-edge proximity detection (12px trigger, 76px dock zone, 80px hide threshold).
   - Implement `DOCK_PINNED` flag and `set_dock_pinned` command.
   - Implement system shortcuts in `launch_system_action`.
2. Update `src-tauri/src/lib.rs`:
   - Register `taskbar::set_dock_pinned` in `tauri::generate_handler!`.
3. Update `src/types/liquid.ts`:
   - Add tray & dock auto-hide settings types.
4. Update `src/store/useSystemStore.ts`:
   - Add state and helper actions for tray flyouts and dock pin.
5. Update `src/components/TaskbarPreviewDock.tsx`:
   - Build all 5 interactive flyouts:
     1. Active Background Apps & System Tray Flyout (`^`)
     2. Network & Bluetooth Control Center (`Wi-Fi`)
     3. Volume & Brightness Control Center (`Speaker`)
     4. Battery & Power Health Guard (`Battery Pill`)
     5. Monthly Calendar & Today's Agenda (`Clock`)
   - Add pin toggle button and smooth auto-hide sliding animation.
6. Verification:
   - Run `cargo check --manifest-path src-tauri/Cargo.toml`.
   - Run `npx tsc --noEmit`.
   - Run `npm run build`.
