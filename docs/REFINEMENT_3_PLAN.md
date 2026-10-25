# Refinement Phase 3 Plan: 1:1 Charging / Unplugged Animation (00:03–00:10), Real Hardware Battery/Bluetooth Monitor & Universal File Drag-to-Shelf

## Overview
Refinement Phase 3 achieves exact 1:1 fidelity with timestamps `00:03–00:10` of the reference video and equips LiquidIsland OS with real Windows hardware power detection and universal drag-and-drop file ingestion.

---

## 1. Real Hardware Power & Device Monitoring (`src-tauri/src/hardware_monitor.rs`)

### 1.1 Win32 `GetSystemPowerStatus` Architecture
- Enable `"Win32_System_Power"` in `src-tauri/Cargo.toml` under `windows-sys`.
- Use `SYSTEM_POWER_STATUS`:
  - `ACLineStatus`: `0` = Offline (Battery/Unplugged), `1` = Online (Charger plugged in), `255` = Unknown.
  - `BatteryLifePercent`: `0..=100` (percentage), `255` = Unknown.
- **Polling Loop (every 800ms):**
  - Track `prev_ac_status` and `prev_percent`.
  - When `ACLineStatus` transitions `0 -> 1`:
    - Charger plugged in: emit Tauri event `"hardware-toast"` with payload:
      ```json
      { "kind": "charging", "percent": 84, "title": "Charging", "subtitle": "Charger connected" }
      ```
  - When `ACLineStatus` transitions `1 -> 0`:
    - Charger unplugged: emit Tauri event `"hardware-toast"` with payload:
      ```json
      { "kind": "unplugged", "percent": 84, "title": "Charger unplugged", "subtitle": "84% remaining" }
      ```
  - Fallback / simulation command `get_battery_hardware_status()` returning current real battery stats.

### 1.2 Bluetooth / Audio Endpoint Monitor
- Monitor default or connected audio/Bluetooth endpoints.
- When an audio endpoint or headphones change:
  - Emit `"hardware-toast"` with `{ "kind": "bluetooth", "title": "AirBuds Pro", "subtitle": "Connected", "percent": 70 }`.

---

## 2. 1:1 Video Charging & Unplugged Toast UI (`00:03–00:10`) (`src/components/ToastView.tsx`)

### 2.1 Dimensions & Theme Styling
- **Exact Geometry:** `340px × 64px`, `border-radius: 32px`, padding `0 22px`, pure black `#000000` OLED background, ultra-subtle border `1px solid rgba(255, 255, 255, 0.08)`.
- No emojis, clean SF Pro / Inter typography.

### 2.2 Charging State (`00:03–00:05`)
- **Left (36×36px):**
  - Outer circular track: `rgba(34, 197, 94, 0.22)`.
  - Green progress arc: `#22c55e`, stroke width `3px`, dasharray / dashoffset based on battery percentage.
  - Center: Pure white crisp lightning bolt SVG (`16×16px`).
- **Center-Left (`margin-left: 14px`):**
  - Title: `"Charging"` (15px, weight 600, `#ffffff`).
  - Subtitle: `"Charger connected"` (12.5px, weight 400, `#8e8e93`).
- **Right (`margin-left: auto`):**
  - Battery percent: `"84%"` (22px, weight 600, tabular-nums, `#ffffff`).

### 2.3 Unplugged State (`00:06–00:09`)
- **Left (36×36px):**
  - Identical green circular progress ring (`#22c55e`).
  - Lightning bolt smoothly scales down and fades out (`scale: 0.4, opacity: 0`) leaving an open, minimalist center.
- **Center-Left:**
  - Title: `"Charger unplugged"` (15px, weight 600, `#ffffff`).
  - Subtitle: `"${percent}% remaining"` (12.5px, weight 400, `#8e8e93`).
- **Right:**
  - Battery percent: `"84%"` (22px, weight 600, `#ffffff`).

### 2.4 Morph Back to Compact (`00:10`)
- Toast stays visible for `3.0s` (`3000ms`), then automatically triggers `systemStore.dismissToast()`.
- Morph smoothly shrinks from `340×64px` back to `184×40px` (`compact`), maintaining the position of the left green circular ring so the morph feels seamless.

---

## 3. Universal File & Image Drag-and-Drop Auto-Wake to Shelf (`IslandShell.tsx` & `ShelfSlide.tsx`)

### 3.1 Dual-Level Drag-Drop Ingestion
- **Tauri Native Window Event:** `getCurrentWindow().onDragDropEvent((event) => ...)` handles OS-level dragged files from Windows File Explorer / desktop.
- **HTML5 Drag & Drop on `window`:** Handles files, browser image drags, and dropzone events.
- **Auto-Wake Behavior:**
  - When dragging over the Island (or window area):
    - Wake Island immediately to `islandState = 'expanded'`.
    - Switch active slide to `activeSlide = 3` (Quick Shelf).
    - Inhibit the 280ms cursor auto-shrink while `isDragging` is active.

### 3.2 Accept All File Types
- Images (`png`, `jpg`, `jpeg`, `webp`, `gif`, `svg`): generate instant thumbnail preview.
- Documents (`pdf`, `docx`, `txt`, `csv`, `md`), archives (`zip`, `rar`, `7z`), code (`rs`, `ts`, `tsx`, `json`, `py`): generate clean vector icon badge and calculate human-readable file size (`KB / MB`).
- Add item to `shelfFiles` in `useSystemStore`.
- Provide `"Clear All"` button in Shelf header to empty the shelf.
- Enable dragging/copying items out of the shelf or clicking to open/download.

---

## 4. Implementation Steps
1. **Cargo Configuration:** Add `"Win32_System_Power"` to `src-tauri/Cargo.toml`.
2. **Hardware Monitor:** Create `src-tauri/src/hardware_monitor.rs` and connect it in `src-tauri/src/lib.rs`.
3. **Type & Store Updates:** Extend `src/types/liquid.ts` and `src/store/useSystemStore.ts` with charging/unplugged toast types and 3000ms auto-dismiss.
4. **Toast View Overhaul:** Update `src/components/ToastView.tsx` with 1:1 pixel fidelity for charging and unplugged states.
5. **Universal Drag-to-Shelf:** Integrate native and DOM drag listeners in `IslandShell.tsx` and enhance `ShelfSlide.tsx` for all file types.
6. **Build Verification:** Verify `cargo check`, `npm run build`, and `cargo build`.
