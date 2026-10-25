# Stage 3 Implementation Plan: True Windows Taskbar Replacement, Live Running Apps Switcher & Luxury Centered Liquid Glass Dock

## Executive Summary
Stage 3 transforms the bottom Liquid Glass Taskbar from a static visual mockup into a true, functional Windows 11 taskbar replacement. It overrides native Windows auto-hide interference by safely hiding `Shell_TrayWnd`, provides a live running apps enumerator and window switcher via Win32 `EnumWindows`, implements hardware start menu and app launch actions, integrates smart cursor proximity auto-hide with click-through protection, and delivers a centered luxury MacBook / Windows 11 Pro floating OLED glass dock.

---

## 1. Architectural Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Rust Tauri Backend                       │
│  src-tauri/src/taskbar.rs:                                  │
│  - set_native_taskbar_hidden(bool): SW_HIDE / SW_SHOW       │
│  - get_running_apps(): EnumWindows -> RunningAppInfo[]      │
│  - focus_or_toggle_app(hwnd): SetForeground / SW_MINIMIZE   │
│  - launch_system_action(action): Start Menu / Terminal / etc │
│  - start_dock_hit_test_loop(): bottom-edge proximity + hover│
└──────────────────────────────┬──────────────────────────────┘
                               │
            Tauri Commands & Event: "dock-hover-state"
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    React Frontend State                     │
│  src/components/TaskbarPreviewDock.tsx                      │
│  - Polls get_running_apps() every 1500ms                   │
│  - Listens to "dock-hover-state" for auto-hide slide-up     │
│  - Center-aligned layout with 10px capsule gap              │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│          Luxury Centered Liquid Glass Dock Layout           │
│  [ Start | Search Pill | Divider | Live Apps | Tools ]      │
│                     (10px Gap)                              │
│  [ ^ Tray | Wi-Fi | Volume | Battery % | Clock & Date ]     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Technical Specifications

### Component 1: Native Taskbar Override & Window Management (`src-tauri/src/taskbar.rs`)
1. **Auto-Hide Override (`Shell_TrayWnd` & `Shell_SecondaryTrayWnd`)**:
   - `set_native_taskbar_hidden(hidden: bool)`:
     - When `hidden == true`, locates `Shell_TrayWnd` and `Shell_SecondaryTrayWnd` and invokes `ShowWindow(hwnd, SW_HIDE)`.
     - When `hidden == false`, invokes `ShowWindow(hwnd, SW_SHOW)` followed by `ensure_taskbar_visible_and_unclipped(hwnd)`.
   - **Safety Restore**:
     - Automatically called on application exit (`tray.rs` quit event and `lib.rs` exit handler) and when the user disables the custom dock in settings.
2. **Running Apps Enumerator (`get_running_apps`)**:
   - Struct:
     ```rust
     #[derive(Serialize, Deserialize, Clone, Debug)]
     pub struct RunningAppInfo {
         pub hwnd: isize,
         pub title: String,
         pub process_name: String,
         pub is_focused: bool,
         pub icon_hint: String, // "chrome", "edge", "code", "terminal", "explorer", "spotify", "discord", "slack", "generic"
     }
     ```
   - Filtering via `EnumWindows`:
     - Checks `IsWindowVisible(hwnd) != 0`.
     - Window rect has non-zero width and height (`GetWindowRect`).
     - Window title is non-empty (`GetWindowTextW`).
     - Excludes `WS_EX_TOOLWINDOW` and cloaked windows (`DwmGetWindowAttribute` with `DWMWA_CLOAKED`).
     - Excludes desktop, shell, taskbar, and LiquidIsland process IDs.
     - Compares `hwnd == GetForegroundWindow()` to flag `is_focused: true`.
3. **App Focus & Toggle Switcher (`focus_or_toggle_app(hwnd)`)**:
   - If `hwnd == GetForegroundWindow()`: minimizes window with `ShowWindow(hwnd, SW_MINIMIZE)`.
   - If minimized (`IsIconic(hwnd) != 0`): restores with `ShowWindow(hwnd, SW_RESTORE)` and sets `SetForegroundWindow(hwnd)`.
   - Otherwise: brings window to foreground with `SetForegroundWindow(hwnd)`.
4. **Hardware Launch Actions (`launch_system_action(action)`)**:
   - `"start_menu"`: Triggers virtual `VK_LWIN` keypress to open the native Windows 11 Start Menu.
   - `"explorer"`: Spawns `explorer.exe`.
   - `"terminal"`: Spawns `wt.exe` (with fallback to `powershell.exe`).
   - `"browser"`: Opens default browser via `cmd /c start https://google.com`.

---

### Component 2: Smart Auto-Hide & Hit-Test Loop (`src-tauri/src/taskbar.rs`)
1. **Cursor Proximity Detection (35ms polling)**:
   - Evaluates cursor `pt.y`:
     - Near bottom edge: `pt.y >= monitor_bottom - 12`
     - Or hovering inside the dock capsules: `pt.y >= monitor_bottom - 72` and `in_capsule_x`
   - When inside:
     - Sets `set_ignore_cursor_events(false)` (100% interactive)
     - Emits `"dock-hover-state": true`
   - When outside:
     - Sets `set_ignore_cursor_events(true)` (click-through to underlying applications)
     - Emits `"dock-hover-state": false`

---

### Component 3: Luxury Centered Liquid Glass Dock UI (`src/components/TaskbarPreviewDock.tsx` & `src/styles/liquid-glass.css`)
1. **Centered Geometry**:
   - Replaces `justify-content: space-between` with `justify-content: center` and a `10px` gap between capsules.
   - Dock height: `52px`, margin bottom: `8px`.
   - Material: Deep OLED obsidian glass (`rgba(8, 8, 11, 0.88)`), `backdrop-filter: blur(28px) saturate(180%)`, crisp top specular rim (`inset 0 1px 0 rgba(255,255,255,0.16)`), `border: 1px solid rgba(255,255,255,0.09)`, `border-radius: 22px`, `padding: 0 10px`.
2. **Main Dock Capsule**:
   - Windows 11 Start Button (4-square vector icon with subtle cyan glow).
   - Compact Search Pill (`Search` + `Alt+Space` badge).
   - Vertical Divider (`1px × 22px`).
   - Live Running Apps (rendered from `get_running_apps()`) with smooth hover magnification (`scale(1.12) translateY(-3px)`), native tooltips, and glowing pill dot for the active foreground window.
   - Quick Launchers (Explorer, Terminal, Settings).
3. **Right System Tray Capsule**:
   - Placed directly next to the main dock (10px gap).
   - `^` System Tray flyout toggle button.
   - Wi-Fi & Volume indicators.
   - Real Battery percentage pill with charging bolt.
   - Two-line date & time readout (`13:00` / `Sun, 25 Oct`).

---

## 3. Implementation Steps & Verification Plan
1. Update `src-tauri/Cargo.toml` with `dwmapi` features if needed for `DwmGetWindowAttribute`.
2. Implement backend commands in `src-tauri/src/taskbar.rs`: `set_native_taskbar_hidden`, `get_running_apps`, `focus_or_toggle_app`, `launch_system_action`, and update the hit-test loop.
3. Register new commands in `src-tauri/src/lib.rs` and update `src-tauri/src/tray.rs` for safe restoration on exit.
4. Redesign CSS in `src/styles/liquid-glass.css` for centered floating layout.
5. Completely update `src/components/TaskbarPreviewDock.tsx` with live apps integration, app switcher clicks, and luxury centered capsules.
6. Verify via `cargo check` and `npm run build`.
