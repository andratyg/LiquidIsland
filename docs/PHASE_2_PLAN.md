# Phase 2 Implementation Plan: Windows System Tray (^) Integration & Native Context Menu

## Executive Summary
Phase 2 integrates **LiquidIsland OS** directly into the native Windows taskbar notification area (System Tray, accessible via the `^` overflow menu or primary tray strip). This establishes seamless desktop background residency, low-overhead native controls, dynamic RAM monitoring tooltips, and bidirectional synchronization between Tauri v2's Win32 event subsystem and React 18's external store (`useSystemStore.ts`).

All architecture, naming conventions, and state contracts strictly adhere to `ARCHITECTURE_LOCK.md` and Phase 1 foundations.

---

## 1. System Architecture & Component Mapping

```
                               ┌──────────────────────────────────────────────┐
                               │       Windows System Tray (^) Area          │
                               │  Icon: LiquidIsland (.ico / .png)            │
                               │  Tooltip: "LiquidIsland OS - Active (~9.2M)" │
                               └──────────────┬───────────────────────────────┘
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
          [Left Click: Toggle Island]                   [Right Click: Context Menu]
          - compact <-> expanded                        - toggle_power (On/Off)
          - wakes island if disabled                    - stealth_bezel (bezel-line)
                      │                                 - switch_theme (Dark/Light)
                      │                                 - switch_companion (Slime/Cat/Eyes)
                      │                                 - toggle_lofi (On/Off)
                      │                                 - cycle_taskbar (A/B/C)
                      │                                 - [Separator]
                      │                                 - trim_ram (Win32 working set)
                      │                                 - quit_app (Clean exit)
                      │                                               │
                      └───────────────────────┬───────────────────────┘
                                              │
                                              ▼
                         ┌─────────────────────────────────────────┐
                         │   src-tauri/src/tray.rs (Tauri v2)      │
                         │   - TrayIconBuilder with ID 'main-tray' │
                         │   - MenuBuilder & MenuItem with ID tags │
                         │   - Window show/hide & RAM flush        │
                         └────────────────────┬────────────────────┘
                                              │
                         ┌────────────────────┴────────────────────┐
                         │       Bidirectional IPC Event Bridge    │
                         │                                         │
                         │ Rust -> React:                          │
                         │  - "tray-menu-action" / "tray-command"  │
                         │    payload: { action, ram_mb }          │
                         │                                         │
                         │ React -> Rust:                          │
                         │  - invoke("update_tray_tooltip", ...)   │
                         │  - window_manager commands              │
                         └────────────────────┬────────────────────┘
                                              │
                                              ▼
                         ┌─────────────────────────────────────────┐
                         │   React 18 Overlay (src/App.tsx)        │
                         │   - listen("tray-menu-action")          │
                         │   - systemStore mutations               │
                         │   - WebAudio feedback (sfx.ts)          │
                         │   - Phase 2 Diagnostic Bar with         │
                         │     "Simulate Tray Menu (^)" dropdown   │
                         └─────────────────────────────────────────┘
```

---

## 2. Technical Specifications: Native Windows Tray (`src-tauri/src/tray.rs`)

### 2.1 Tray Builder & Configuration
- **Tray ID:** `"main-tray"` registered via `TrayIconBuilder::with_id("main-tray")`.
- **Icon Resolution:** Loaded from `app.default_window_icon().cloned()` (or bundled icon resources in `src-tauri/icons/icon.ico` / `32x32.png`), ensuring crisp rendering on 100%, 125%, 150%, and 200% Windows DPI scaling.
- **Dynamic Tooltip:** Initialized to `"LiquidIsland OS - Active (~9.2 MB RAM)"`. Matching the Windows Security / Defender tray tooltip style.
- **Menu Association:** Attaches a native Win32 context menu constructed via `MenuBuilder::new(app)`.

### 2.2 Left-Click Interaction
- Using `TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. }`:
  - If the main window is currently hidden (power disabled), show it (`window.show()`) and emit action `"wake_and_compact"`.
  - If visible, emit action `"toggle_expand"` so React smoothly animates between `compact` (184px × 40px) and `expanded` (432px × 174px).

### 2.3 Right-Click Native Context Menu Hierarchy
The context menu contains 9 items with locked labels and identifiers:

| # | Item ID | Label | Action & System Impact |
| :-: | :--- | :--- | :--- |
| 1 | `toggle_power` | `"Enable / Disable Dynamic Island (On/Off)"` | If island is visible: hides window (`window.hide()`), immediately calls `memory::trim_ram_working_set_internal()`, and notifies React to pause animations/audio. If disabled: calls `window.show()` and resumes state. |
| 2 | `stealth_bezel` | `"Sembunyikan ke Garis Bezel (Stealth Mode)"` | Emits action `stealth_bezel`. React sets `islandState = 'bezel-line'` (136px × 6px docked line). |
| 3 | `switch_theme` | `"Ganti Tema: Liquid Dark / Light Glass"` | Emits action `switch_theme`. React invokes `systemStore.toggleTheme()` between `.theme-dark` and `.theme-light`. |
| 4 | `switch_companion` | `"Ganti Karakter: Slime (B) / Cat (C) / Eyes"` | Emits action `switch_companion`. React cycles `companionMode` (`'slime' -> 'cat' -> 'eyes' -> 'off' -> 'slime'`). |
| 5 | `toggle_lofi` | `"Fitur Lofi Focus Audio (On/Off)"` | Emits action `toggle_lofi`. React toggles `enableOptionalLofi`. |
| 6 | `cycle_taskbar` | `"Mode Taskbar: Opsi A / B / C"` | Emits action `cycle_taskbar`. React cycles `taskbarMode` (`'A' -> 'B' -> 'C' -> 'A'`). |
| 7 | `separator` | `---` | Standard Win32 horizontal separator line via `PredefinedMenuItem::separator(app)`. |
| 8 | `trim_ram` | `"Optimize RAM Now (~10 MB Trimmer)"` | Calls `memory::trim_ram_working_set_internal()` immediately in Rust, updates the tray icon tooltip with the exact new memory figure (`"LiquidIsland OS - Active (~X.X MB RAM)"`), and emits `trim_ram` with `ram_mb` payload. |
| 9 | `quit_app` | `"Quit LiquidIsland OS"` | Calls `app.exit(0)` to cleanly terminate background threads and process handles. |

---

## 3. Bidirectional IPC Event Bridge

### 3.1 Rust-to-React Events
- Event Name: `"tray-menu-action"` (with alias `"tray-command"` for compatibility).
- Payload Structure:
  ```rust
  #[derive(Clone, serde::Serialize)]
  pub struct TrayActionPayload {
      pub action: String,
      pub ram_mb: Option<f64>,
  }
  ```
- Emitted from tray item handler directly to `window.emit("tray-menu-action", &payload)` (or `app.emit(...)`).

### 3.2 React-to-Rust Commands
- `update_tray_tooltip(app: AppHandle, status_text: String) -> Result<(), String>`:
  - Looks up tray by ID `"main-tray"`:
    ```rust
    if let Some(tray) = app.tray_by_id("main-tray") {
        tray.set_tooltip(Some(status_text)).map_err(|e| e.to_string())?;
    }
    ```
  - Enables the frontend to update tooltip whenever background timers or memory trims occur.

---

## 4. Frontend Integration & State Synchronization

### 4.1 Store Action Dispatchers (`src/store/useSystemStore.ts`)
Add dedicated helper methods to `systemStore` while maintaining 100% backward compatibility:
- `toggleIslandEnabled()`: Toggles `islandEnabled` flag.
- `cycleCompanionMode()`: Cycles `'slime' -> 'cat' -> 'eyes' -> 'off' -> 'slime'`.
- `cycleTaskbarMode()`: Cycles `'A' -> 'B' -> 'C' -> 'A'`.
- `toggleOptionalLofi()`: Inverts `enableOptionalLofi`.
- `toggleExpandedState()`: Toggles between `'compact'` and `'expanded'`.

### 4.2 App Listener (`src/App.tsx`)
- In a `useEffect` hook, register `@tauri-apps/api/event` listener for `"tray-menu-action"` and `"tray-command"`.
- Dispatch handler maps actions:
  - `toggle_power`: calls `systemStore.toggleIslandEnabled()`, plays `playToggleClick()`.
  - `stealth_bezel`: calls `systemStore.setIslandState('bezel-line')`, plays `playToggleClick()`.
  - `switch_theme`: calls `systemStore.toggleTheme()`, plays `playToggleClick()`.
  - `switch_companion`: calls `systemStore.cycleCompanionMode()`, plays `playToggleClick()`.
  - `toggle_lofi`: calls `systemStore.toggleOptionalLofi()`, plays `playToggleClick()`.
  - `cycle_taskbar`: calls `systemStore.cycleTaskbarMode()`, plays `playToggleClick()`.
  - `trim_ram`: updates local RAM metric with `payload.ram_mb`, updates status message, plays `playWaterDrop()`.
  - `toggle_expand`: toggles between `'compact'` and `'expanded'`, plays `playGlassPop()`.

### 4.3 Phase 2 Diagnostic Toolbar: "Simulate Tray Menu (^)"
To enable seamless testing and development even when running in browser mode without the native Windows OS tray:
- Add an interactive "Simulate Tray Menu (^)" popup/dropdown inside the Phase 2 diagnostic bar.
- Lists all 9 context menu items. Clicking any item dispatches the exact same action dispatcher as the native Rust tray event.
- Displays live tray tooltip text preview.

---

## 5. Verification & Validation Checklist
1. **Rust Backend Validation**:
   - `cargo check --manifest-path src-tauri/Cargo.toml` finishes with 0 errors.
   - `tray.rs` builds clean menu items and handles clicks without blocking the main thread.
2. **Frontend Type Checking & Build**:
   - `tsc` and `vite build` complete with 0 errors.
   - All types in `src/types/liquid.ts` remain unaltered.
3. **Behavioral Integrity**:
   - Hover and click-through on the island remain responsive.
   - Tray tooltip reflects real-time RAM reading after trims.
   - Left click switches between `compact` and `expanded`.
   - Power toggle cleanly hides/shows the overlay.
