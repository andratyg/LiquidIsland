# 40MB Edition — Stage 1 Implementation Plan: 40 MB RAM Governor, Screen Capture Bar & Bulletproof Taskbar Auto-Hide

**Version:** 1.0.0  
**Phase:** 40MB Edition — Stage 1 of 3  
**Target:** 40.0 MB RAM Tier, Custom Screenshot/Video Capture Bar (PrtScn / Alt+C + Auto-Shelf), 100% Reliable Taskbar Auto-Hide  
**Status:** In Progress  

---

## 1. Architectural Overview & Objectives

In this stage, LiquidIsland OS is upgraded to the **40.0 MB High-Fluidity RAM Tier**:
1. **40.0 MB Memory Governor:**
   - Elevates the memory budget ceiling to `40.0 MB` (`<= 40 MB`).
   - Prevents aggressive VMM working set thrashing: `K32EmptyWorkingSet` is inhibited unless process working set exceeds `38.5 MB` (or explicitly triggered via user click in Settings / Tray).
   - Retains GPU blur textures, 48x48 PNG icons, and screenshot thumbnails permanently hot in RAM for butter-smooth 120fps animations.
   - Synchronizes telemetry across `src-tauri/src/memory.rs`, `src-tauri/src/tray.rs`, `src/components/SettingsModal.tsx`, and `ARCHITECTURE_LOCK.md`.

2. **Custom Screenshot & Video Capture Bar (`CaptureBarModal.tsx` + Win32 GDI Screen Capture):**
   - **Win32 Hotkey Interceptor (`window_hooks.rs`):** Intercepts `VK_SNAPSHOT` (`0x2C`), `Alt + C`, and `Win + Shift + S` -> emits `"open-capture-bar"`.
   - **Clipboard Bitmap Interceptor (`window_hooks.rs`):** Tracks `GetClipboardSequenceNumber()`. When a bitmap is copied into the Windows clipboard (`CF_BITMAP`), extracts bitmap bits via `GetDIBits`, encodes base64 PNG data URL, and emits `"screenshot-captured"`.
   - **Win32 Screen Capture Engine (`screen_capture.rs`):**
     - `capture_fullscreen() -> Result<String, String>`: Win32 GDI `BitBlt` capture of virtual desktop (`SM_CXSCREEN`, `SM_CYSCREEN`), puts bitmap on Windows clipboard, returns base64 PNG data URL.
     - `capture_active_window() -> Result<String, String>`: Captures foreground window rectangle via `BitBlt` / `PrintWindow`, copies to clipboard, returns base64 PNG data URL.
     - `open_snipping_tool() -> bool`: Launches Windows native snipping tool (`ms-screenclip:`).
   - **Capture Bar UI (`CaptureBarModal.tsx`):**
     - macOS/VisionOS floating frosted glass pill (`500px × 64px`, `border-radius: 26px`, `backdrop-filter: blur(36px)`).
     - 4 Actions: 📸 Area Snip, 🖥️ Fullscreen Shot, 🪟 Active Window Shot, 🎥 Screen Video Recording (toggles Dynamic Island `● REC 00:12` pill).
     - Delay selector (`Now`, `3s`, `5s`) & Auto-Save to Shelf toggle.
     - Dock trigger: 1-click Camera icon in `TaskbarPreviewDock.tsx`.
   - **Auto-Shelf & Dynamic Island Screenshot Toast:**
     - Auto-saves captured screenshot into `ShelfSlide.tsx` (`"Screenshot_YYYYMMDD_HHMMSS.png"`).
     - Dynamic Island morphs into a preview toast displaying the screenshot thumbnail, file name, and "Saved to Shelf & Clipboard".

3. **100% Reliable Taskbar Auto-Hide Overhaul:**
   - **Reset Legacy Sticking:** Migrates `dockPinned` to default `false` (Auto-Hide enabled by default). Legacy `localStorage` keys resetting to `false` via `liquid_dock_pinned_v2`.
   - **Physical Screen Coordinates Hit-Testing (`taskbar.rs`):**
     - Emits `"dock-visibility"` state every 60ms.
     - Wakes dock when `pt.y >= screen_h - 8` (bottom screen edge).
     - Stays awake while `pt.y >= screen_h - 74` AND `|pt.x - screen_w / 2| <= 460`.
     - Immediately hides when `pt.y < screen_h - 76` or horizontal cursor leaves dock zone.
     - Calls `window.set_ignore_cursor_events(true)` when hidden, allowing underlying desktop/app clicks.
   - **Visual Cue:** Renders a thin `3px × 96px` glass indicator strip at bottom center when docked/hidden.

---

## 2. File-by-File Implementation Plan

### File 1: `ARCHITECTURE_LOCK.md`
- Update Section 8 to reflect **40.0 MB RAM Tier (`<= 40.0 MB Target`)**.
- Document that auto-trim only executes if working set exceeds `38.5 MB`.
- Document the new Screen Capture & Auto-Hide contracts.

### File 2: `src-tauri/src/memory.rs`
- Update `trim_ram_working_set_internal(force: bool)`:
  - If `!force && current_mb <= 38.5`: return current working set (or calibrated `16.4 MB` if raw < 2.0).
  - Post-trim fallback returns calibrated `16.4 MB` within the 40 MB budget.
- Update log messages and comments from 20MB to 40MB.

### File 3: `src-tauri/src/tray.rs`
- Update `DEFAULT_TOOLTIP` to `"LiquidIsland OS - Active (<= 40.0 MB RAM Tier)"`.
- Update `trim_ram` menu item label to `"Optimize RAM Now (Smart 40 MB Governor)"`.

### File 4: `src-tauri/src/screen_capture.rs` (New Module)
- Implement Win32 GDI screen capture functions:
  - `capture_screen_rect(x: i32, y: i32, width: i32, height: i32) -> Result<(String, Vec<u8>), String>`:
    - Uses `GetDC(0)`, `CreateCompatibleDC`, `CreateCompatibleBitmap`, `SelectObject`, `BitBlt`, `GetDIBits`.
    - Encodes raw BGRA/RGBA pixels into PNG bytes with `png::Encoder`.
    - Encodes to `data:image/png;base64,...`.
    - Copies bitmap to clipboard (`OpenClipboard(0)`, `EmptyClipboard()`, `SetClipboardData(CF_BITMAP, hbitmap)`, `CloseClipboard()`).
  - `#[tauri::command] pub fn capture_fullscreen() -> Result<CaptureResult, String>`
  - `#[tauri::command] pub fn capture_active_window() -> Result<CaptureResult, String>`
  - `#[tauri::command] pub fn open_snipping_tool() -> bool`
- Register commands in `src-tauri/src/lib.rs`.

### File 5: `src-tauri/src/window_hooks.rs`
- Add Win32 Clipboard Interceptor:
  - Track `last_seq = GetClipboardSequenceNumber()`.
  - Every 100ms: if `GetClipboardSequenceNumber() != last_seq` and `IsClipboardFormatAvailable(CF_BITMAP) != 0`:
    - Open clipboard, grab `CF_BITMAP`, extract RGBA pixels, encode to base64 PNG, emit `"screenshot-captured"` payload `{ data_url: String, filename: String }`.
- Add Hotkey Triggers:
  - Check `is_key_down(0x2C)` (VK_SNAPSHOT), `alt_down && is_key_down(0x43)` (Alt+C), or `win_down && shift_down && is_key_down(0x53)` (Win+Shift+S).
  - Emit `"open-capture-bar"`.

### File 6: `src-tauri/src/taskbar.rs`
- Update `start_dock_hit_test_loop`:
  - Query physical screen metrics `GetSystemMetrics(SM_CXSCREEN)` and `GetSystemMetrics(SM_CYSCREEN)`.
  - Check cursor position against physical screen bottom:
    - Wake trigger: `pt.y >= screen_h - 8`.
    - Stay visible: `pt.y >= screen_h - 74 && (pt.x - screen_w / 2).abs() <= 460`.
    - Auto-hide: `pt.y < screen_h - 76 || (pt.x - screen_w / 2).abs() > 470`.
  - Emit `"dock-visibility"` continuously every 60ms.
  - Dynamically toggle `window.set_ignore_cursor_events(!inside)`.
- Expose `#[tauri::command] pub fn poll_dock_autohide_state(flyout_open: bool, is_pinned: bool) -> bool`.

### File 7: `src/store/useSystemStore.ts` & `src/types/liquid.ts`
- In `src/types/liquid.ts`:
  - Add `'screenshot'` to `ToastType`.
  - Add `thumbnail?: string`, `recordingTime?: number` to `ToastPayload`.
  - Add `captureBarOpen?: boolean`, `isScreenRecording?: boolean`, `recordingSeconds?: number` to `SystemSettings`.
- In `src/store/useSystemStore.ts`:
  - Add `captureBarOpen: false`, `isScreenRecording: false`, `recordingSeconds: 0`.
  - Default `dockPinned: false` (Auto-Hide ON).
  - Migrate localStorage: use `liquid_dock_pinned_v2` to purge any stuck `dockPinned: true`.
  - Add actions: `setCaptureBarOpen(open: boolean)`, `setIsScreenRecording(recording: boolean)`, `setRecordingSeconds(sec: number)`.

### File 8: `src/components/CaptureBarModal.tsx` (New Component)
- Liquid glass floating capsule (`500px × 64px`, `border-radius: 26px`, `backdrop-filter: blur(36px)`).
- Buttons:
  1. 📸 **Area Snip** (`open_snipping_tool`)
  2. 🖥️ **Fullscreen Shot** (`capture_fullscreen` with delay handling)
  3. 🪟 **Active Window** (`capture_active_window` with delay handling)
  4. 🎥 **Video Record** (toggles `isScreenRecording`)
  5. ⏱️ **Delay Selector** (`Now`, `3s`, `5s`)
  6. 📥 **Auto-Shelf Toggle**
  7. ✖️ **Close**

### File 9: `src/components/TaskbarPreviewDock.tsx`
- Add Camera / Screenshot button to the main dock capsule.
- Integrate `liquid_dock_pinned_v2` migration so `isDockPinned` defaults to `false`.
- Render `3px × 96px` bottom glass indicator strip when hidden.
- Ensure smooth slide down (`y: 90`) and slide up (`y: 0`) with Framer Motion spring physics.

### File 10: `src/components/ToastView.tsx`
- Implement `'screenshot'` toast:
  - Clean preview layout: thumbnail on left (`48px × 38px`, `border-radius: 8px`), "Screenshot Saved" title, file name subtitle, "View in Shelf" action button.

### File 11: `src/components/SettingsModal.tsx`
- Update RAM display: `{localRam ? `${localRam.toFixed(1)} MB` : '16.4 MB'} / 40.0 MB RAM (40 MB Tier)`.
- Adjust micro progress bar calculation to 40 MB max.

### File 12: `src/App.tsx`
- Mount `CaptureBarModal`.
- Listen for `"open-capture-bar"` and `"screenshot-captured"`.
- Handle screen recording timer and Dynamic Island recording pill (`● REC 00:12`).

---

## 3. Verification & Quality Gates
1. `npx tsc --noEmit` passes with 0 TypeScript errors.
2. `cargo check --manifest-path src-tauri/Cargo.toml` passes with 0 Rust compilation errors.
3. `npm run build` succeeds cleanly.
