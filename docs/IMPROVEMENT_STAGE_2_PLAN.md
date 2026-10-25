# Improvement Stage 2 Implementation Plan: Dedicated Volume & Brightness Popup HUD + Multi-Window Tab & Desktop Switch Animations

## Executive Summary
This stage delivers two major visual & tactile upgrades across LiquidIsland OS:
1. **Dedicated Volume & Screen Brightness Popup HUD with Liquid Physics**:
   - Win32 hardware key detection in `window_hooks.rs` (`VK_VOLUME_UP`, `VK_VOLUME_DOWN`, `VK_VOLUME_MUTE`, `Alt + ArrowUp`, `Alt + ArrowDown`) broadcasting `"hud-change"`.
   - Mouse wheel split-gesture on Dynamic Island: left half adjusts Screen Brightness, right half adjusts Volume.
   - Taskbar tray wheel gesture to adjust Volume.
   - Dedicated `360px × 62px` Liquid HUD capsule in `ToastView.tsx` with animated Speaker (sequential soundwave arcs) and Sun (rotating & scaling rays) SVGs, liquid gradient bars, floating status mini-pill badge, and elastic overshoot bounce at 100%/0% paired with a crystal harmonic chime.
2. **Synchronized Multi-Window Tab & Desktop Switch Animations**:
   - Broadcast `"workspace-activity"` to BOTH top `"main"` window and bottom `"taskbar-dock"` window via `app_handle.emit()`.
   - **Virtual Desktop Switch (`Ctrl + Win + Left/Right`)**:
     - Synchronized 600px Top & Bottom Edge Liquid Aurora light streak sweeping across the monitor in switch direction.
     - Floating Workspace Switcher Banner (`260px × 44px`) below the Dynamic Island showing animated workspace dots (`[ ●  ○  ○ ]  Workspace 1 / 2`).
   - **Tab Switch & App Switch**:
     - Top Island liquid droplet stretch & title ticker.
     - Bottom Taskbar border specular aura wave and floating tab-title badge above the focused app icon.

---

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Rust Tauri Backend                       │
│  src-tauri/src/window_hooks.rs (40ms polling):              │
│  - Detects Volume Up/Down/Mute (0xAF, 0xAE, 0xAD)           │
│  - Detects Brightness: Alt + Up/Down (VK_MENU + 0x26/0x28)  │
│  - Detects Virtual Desktop: Ctrl + Win + Left/Right         │
│  - Detects Tab Switch & App Switch via GetForegroundWindow  │
│  - Broadcasts via app_handle.emit():                        │
│    -> "hud-change"                                          │
│    -> "workspace-activity"                                  │
└──────────────────────────────┬──────────────────────────────┘
                               │
               Broadcasts to BOTH Tauri Windows:
             "main" (Top) and "taskbar-dock" (Bottom)
                               │
       ┌───────────────────────┴───────────────────────┐
       ▼                                               ▼
┌──────────────────────────────┐       ┌──────────────────────────────┐
│      Top Main Window         │       │     Bottom Taskbar Dock      │
│  IslandShell.tsx &           │       │  TaskbarPreviewDock.tsx      │
│  ToastView.tsx:              │       │                              │
│  - 360x62px Liquid HUD       │       │  - 600px Bottom Aurora Sweep │
│  - Soundwave arcs / Sun rays │       │  - Border specular aura wave │
│  - Overshoot scaleX bounce   │       │  - Floating tab-title badge  │
│  - Floating workspace banner │       │    above focused app icon    │
│  - 600px Top Aurora Sweep    │       │  - Wheel-to-adjust volume    │
│  - Wheel split Bright/Vol    │       └──────────────────────────────┘
└──────────────────────────────┘
```

---

## Detailed Specifications

### 1. Rust Hardware Detection & Global Broadcast (`src-tauri/src/window_hooks.rs`)
- Add key states in the 40ms thread loop:
  - `VK_VOLUME_UP` (`0xAF`), `VK_VOLUME_DOWN` (`0xAE`), `VK_VOLUME_MUTE` (`0xAD`).
  - `VK_MENU` (`Alt`) + `VK_UP` (`0x26`) / `VK_DOWN` (`0x28`).
- Debounce presses with repeat suppression for discrete volume/brightness steps.
- Use `window.app_handle().emit(...)` for:
  - `"hud-change"`: `{ kind: "volume" | "brightness" | "mute", delta: i32 }`.
  - `"workspace-activity"`: `{ kind, app_name, tab_title, direction, accent_color }`.

### 2. Audio SFX Engine (`src/utils/sfx.ts`)
- Add `playOvershootChime()`:
  - High-frequency crystalline dual-harmonic chime (C6 1046Hz & C7 2093Hz) synthesized with Web Audio API for 100%/0% boundary collision.

### 3. Store Management (`src/store/useSystemStore.ts` & `src/types/liquid.ts`)
- Add `isOvershoot?: boolean;` and `isMuted?: boolean;` to `ToastPayload`.
- Add helper methods in `systemStore`:
  - `adjustVolume(delta: number)`: clamps 0–100, detects overshoot, triggers HUD toast with `hudType: 'volume'`, plays chime if overshoot.
  - `adjustBrightness(delta: number)`: clamps 0–100, detects overshoot, triggers HUD toast with `hudType: 'brightness'`, plays chime if overshoot.
  - `toggleMute()`: toggles mute state and triggers HUD toast.

### 4. Dedicated Popup HUD Visuals (`src/components/ToastView.tsx`)
- When `toastPayload?.type === 'hud'`:
  - Dynamic Island morphs into `360px × 62px` Liquid HUD capsule.
  - **Volume HUD**:
    - Animated speaker SVG:
      - Cone and body.
      - 3 Soundwave arcs that pop in dynamically:
        - `0%`: diagonal red slash + red muted glow.
        - `1–33%`: arc 1 visible.
        - `34–66%`: arcs 1 & 2 visible.
        - `67–100%`: arcs 1, 2, & 3 visible.
    - Cyan-emerald liquid gradient bar (`linear-gradient(90deg, #06b6d4, #10b981)`).
  - **Brightness HUD**:
    - Animated sun SVG:
      - Central sun core.
      - 8 radiating rays rotating (`rotate(${value * 1.8}deg)`) and scaling (`scale(0.8 + 0.4 * (value / 100))`).
    - Warm golden-white liquid gradient bar (`linear-gradient(90deg, #fde047, #ffffff)`).
  - **Elastic Overshoot Physics**:
    - If `isOvershoot`: capsule bounces with `scaleX: [1, 1.05, 0.98, 1]`.
  - **Floating Mini-Pill Badge**:
    - Renders floating badge right below the capsule with current level or `100% MAXIMUM` / `0% MUTED`.

### 5. Multi-Window Synchronized Animations (`IslandShell.tsx`, `TaskbarPreviewDock.tsx`, `App.tsx`)
- **Virtual Desktop Switch (`desktop-switch`)**:
  - **Top & Bottom Edge Aurora Sweep**: A 600px wide gradient light streak (`linear-gradient(90deg, transparent, #38bdf8, #818cf8, transparent)`) sweeps across the top bezel and bottom dock in switch direction (`left` or `right`).
  - **Floating Workspace Banner (`IslandShell.tsx`)**: Slide-down glass pill (`260px × 44px`) displaying `[ ●  ○  ○ ]  Workspace 1 / 2` with spring entry and exit.
- **Tab Switch & App Switch**:
  - **Top Island**: Liquid droplet stretch and title ticker.
  - **Bottom Taskbar**: Border specular rim wave and a floating tab-title badge (`[App] — [Title]`) positioned right above the focused running app icon in the dock for 1.5s.

---

## Verification Plan
1. **Rust Check**: `cargo check --manifest-path src-tauri/Cargo.toml` (0 warnings).
2. **TypeScript Compilation**: `npx tsc --noEmit` (0 errors).
3. **Frontend Production Build**: `npm run build` (clean output).
4. **Functional Testing**:
   - Volume & Brightness hotkeys and scroll gestures (left = brightness, right = volume).
   - Overshoot chime at 100%/0%.
   - Tab switch & Virtual desktop switch animations on top and bottom dock.
