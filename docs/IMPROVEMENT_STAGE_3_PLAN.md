# Improvement Stage 3 Implementation Plan: Real App Icons in Taskbar, 100% Working Buttons & System Tray (^) Flyout, and Clock Visibility Fix

## Executive Summary
This stage resolves the remaining visual fidelity, interaction, and clipping issues on the bottom Liquid Glass Taskbar dock:
1. **Real Windows Application Icons**:
   - Extract native 32x32 application icons from running `.exe` binaries in `src-tauri/src/taskbar.rs` via `OpenProcess` + `QueryFullProcessImageNameW` + `SHGetFileInfoW` + `GetIconInfo` + `GetDIBits`, encoded as cached base64 data URLs.
   - Provide high-precision full-color vector logos in `TaskbarPreviewDock.tsx` for Chrome, Edge, Brave, Firefox, VS Code, Cursor, Antigravity, File Explorer, Windows Terminal, Spotify, Discord, Slack, and Settings.
   - Eliminate all generic lightning bolt (`⚡`) fallback icons.
2. **100% Working Taskbar Buttons & Flyout Window Geometry**:
   - Expand `"taskbar-dock"` window height from `68px` to `360px` positioned at `pos.y + size.height - 360px` with `overflow: visible` in `App.tsx`.
   - Implement dynamic hit-testing in `taskbar.rs`: clicks pass through when idle above the 68px dock, but are 100% enabled across the full 360px zone when any flyout is open (`set_taskbar_flyout_open`).
   - Fix window switching in `focus_or_toggle_app(hwnd)` using the Win32 `ALT` keypress / `AttachThreadInput` foreground bypass + `ShowWindow(target, SW_RESTORE)` + `BringWindowToTop(target)`.
3. **Interactive System Tray (^) Flyout & Control Center**:
   - Clicking `^` opens a rich Windows 11-style Quick Actions Flyout with working triggers: Open Settings, Open Spotlight (`Alt+S`), Switch Companion (`Slime/Cat/Eyes`), Switch Theme, Toggle Stealth Bezel, Restore Native Taskbar, Trim RAM, and Quit.
   - Clicking Wi-Fi, Volume, or Battery opens a Quick Control Center Flyout with interactive Volume & Brightness sliders (triggering the top Island HUD).
4. **Clock Visibility Fix**:
   - Update clock typography from dark/unreadable to crisp bright white (`#ffffff`, `font-weight: 600`, `13px`) and date to `#a1a1aa` (`10.5px`).

---

## 1. Architectural Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Rust Tauri Backend                       │
│  src-tauri/src/taskbar.rs:                                  │
│  - Window height: 360px (anchored to screen bottom)         │
│  - QueryFullProcessImageNameW + SHGetFileInfoW icon extract │
│  - In-memory icon cache: HashMap<PathBuf, String>           │
│  - focus_or_toggle_app() with Win32 foreground bypass       │
│  - set_taskbar_flyout_open(bool) hit-box toggle             │
└──────────────────────────────┬──────────────────────────────┘
                               │
                IPC: get_running_apps(), focus_or_toggle_app(),
                     set_taskbar_flyout_open()
                               │
┌──────────────────────────────▼──────────────────────────────┐
│             Bottom Window (isTaskbarWindow)                 │
│  src/App.tsx:                                               │
│  - height: 360px, overflow: visible, justify-content: flex-end│
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│             src/components/TaskbarPreviewDock.tsx           │
│  - Running App Icons: real icon_data || vector SVG logos    │
│  - 40x40px squircle hover buttons with 28x28px crisp icons  │
│  - Floating tab-title badges on hover/active                │
│  - Interactive ^ System Tray Flyout (Settings, Spotlight,   │
│    Companions, Theme, Stealth, Restore Taskbar, RAM Trim)   │
│  - Interactive Control Center Flyout (Volume & Brightness)  │
│  - High-Contrast Crisp White Clock (#ffffff, 13px)          │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Technical Specifications

### Component A: Real Icon Extraction & Windows Foregorund Bypass (`src-tauri/src/taskbar.rs`)
1. **RunningAppInfo Model**:
   - Add `icon_data: Option<String>` to `RunningAppInfo`.
   - In `enum_windows_callback`:
     - Query PID: `GetWindowThreadProcessId(hwnd, &mut pid)`.
     - Open process: `OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid)`.
     - Query path: `QueryFullProcessImageNameW(hproc, 0, buf.as_mut_ptr(), &mut len)`.
     - Extract icon with `SHGetFileInfoW(..., SHGFI_ICON | SHGFI_LARGEICON)`.
     - Read 32-bit ARGB DIB bits via `GetIconInfo` + `GetDIBits`.
     - Encode as base64 BMP/PNG data URL `data:image/bmp;base64,...`.
     - Cache in thread-safe `ICON_CACHE: Mutex<HashMap<String, String>>`.
2. **Reliable Window Focus (`focus_or_toggle_app`)**:
   - Call `ShowWindow(target, SW_RESTORE)` if `IsIconic(target) != 0`.
   - Simulate benign `ALT` keypress:
     `keybd_event(VK_MENU as u8, 0, 0, 0); keybd_event(VK_MENU as u8, 0, KEYEVENTF_KEYUP, 0);`
   - Call `SetForegroundWindow(target)` and `BringWindowToTop(target)`.
3. **Flyout Hit-Testing & Window Size**:
   - In `spawn_or_update_taskbar_window`: set physical height to `(360.0 * scale).round() as u32` positioned at `pos.y + size.height - height_px`.
   - Command `set_taskbar_flyout_open(open: bool)`.
   - In `start_dock_hit_test_loop`: when `FLYOUT_OPEN` is true, allow clicks across the full 360px window.

### Component B: App Window Render Wrapper (`src/App.tsx`)
- For `isTaskbarWindow`:
  - Change height from `68px` to `360px`.
  - Set `overflow: 'visible'`.
  - Set `display: 'flex'`, `flexDirection: 'column'`, `justifyContent: 'flex-end'`.

### Component C: Visual High-Fidelity Dock & Full Vector Logos (`src/components/TaskbarPreviewDock.tsx`)
1. **Full-Color Vector Logos**:
   - Chrome: 4-color concentric circular pinwheel (red, green, yellow, blue center).
   - Edge: Cyan-blue hydrodynamic spiral wave.
   - VS Code: Iconic blue geometric folded ribbon.
   - Cursor: Purple/violet cubic geometry.
   - Antigravity: Indigo-violet glowing quantum orb / hexagon.
   - File Explorer: Classic Manila folder with blue core tab.
   - Windows Terminal: Deep charcoal acrylic console with green `>_` prompt.
   - Spotify: Vibrant emerald green circle with 3 curved soundwave arcs.
   - Discord: Blurple gamepad silhouette.
   - Slack: Quad-color hashtags.
   - Default fallback: Polished app window icon (NO generic lightning bolt!).
2. **System Tray (^) Quick Actions Flyout**:
   - 3x3 glass grid with real, working actions:
     - Open Settings
     - Open Spotlight (`Alt+S`)
     - Cycle Companions (`Slime` / `Cat` / `Eyes`)
     - Cycle Theme (`Dark` / `Light`)
     - Toggle Stealth Bezel (`bezel-line` / `compact`)
     - Restore Native Windows Taskbar
     - Trim RAM Working Set
     - Restart Windows Explorer
     - Quit LiquidIsland
3. **Quick Control Center Flyout**:
   - Triggered by clicking Wi-Fi, Volume, or Battery.
   - Live Volume slider (synced with `systemStore.adjustVolume`).
   - Live Brightness slider (synced with `systemStore.adjustBrightness`).
   - Battery health pill.
4. **Clock Visibility Fix**:
   - Digital time text: `#ffffff`, `font-size: 13px`, `font-weight: 600`, `letter-spacing: -0.2px`.
   - Date text: `#a1a1aa`, `font-size: 10.5px`, `font-weight: 500`.

---

## 3. Verification Plan
1. **Cargo Check**: `cargo check --manifest-path src-tauri/Cargo.toml` (0 warnings).
2. **TypeScript Compilation**: `npx tsc --noEmit` (0 errors).
3. **Frontend Production Build**: `npm run build` (clean output).
4. **Functional Testing**:
   - Verify running apps display their real icons without any generic lightning bolts.
   - Verify clicking any running app switches focus instantly.
   - Verify clicking `^` opens the System Tray flyout unclipped, and clicking buttons inside works.
   - Verify clicking volume/battery opens the Control Center flyout unclipped.
   - Verify clock text is bright white and legible.
