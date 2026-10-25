# Phase 8 Implementation Plan: System Toast Notifications (00:19–00:20), Custom Liquid HUD & Multitasking Desktop/Window Hooks

## Executive Summary
Phase 8 implements the complete **System Toast Notification Engine**, **Custom Liquid System HUD (Volume, Brightness, Mic Mute)**, **Battery Health Guard**, and **Native Win32 Multitasking & Window Hooks** for LiquidIsland OS.

Adhering strictly to `ARCHITECTURE_LOCK.md` (`325px × 64px`, `border-radius: 32px`), this phase brings to life the authentic dynamic island transitions seen in the reference video at `00:19` and `00:20`:
1. **Toast Mode A — AirBuds Pro Connected (`00:19` Reference 1:1)**:
   - Dynamic expansion to `325px × 64px`.
   - Left: Blue glowing Bluetooth icon (`#3b82f6`) with radiating acoustic wave arcs.
   - Center: Title `"AirBuds Pro"` and subtitle `"Connected - 70%"`.
   - Right: Animated `28×28px` blue sonar ring with expanding radial pulse wave (`sonarPulse`).
2. **Toast Mode B — Battery Charging & Health Guard (`00:20` Reference 1:1)**:
   - Left: Glowing lightning bolt icon (`#22c55e`) with ambient green neon radiance.
   - Center: Dynamic label: `"Charging"`, `"Battery Low 20%"`, or `"Charge Limit 85%"`.
   - Right: Bold percentage text `"70%"` (or dynamic value) + Mini Companion reaction badge (Slime or Cat energized spark / golden glow).
3. **Toast Mode C — Custom Liquid System HUD (Volume / Brightness / Mic Mute)**:
   - Triggered dynamically via mouse wheel scroll over the Notch surface, or shortcut/toggle for Mic Mute.
   - Displays sleek icon (`🔊`, `☀️`, or `🎙️`), liquid glass progress bar (`0%–100%`) with specular highlight, and numeric percentage, auto-reverting to the previous state after `2.2s`.
4. **Toast Mode D — Virtual Desktop & Active Window Switch Pill**:
   - Directional **Liquid Slide-Wave** (`translateX(±14px)`) when switching Windows Virtual Desktops (`Ctrl + Win + Left/Right`) or toggling Always-on-Top Window Pin (`Ctrl + Alt + T`).
5. **Interactive Companion Reactions (Slime & Cat)**:
   - Charging: Energized electric sparks, star-sparkle pupils, cheerful vibrant bounce.
   - Low Battery: Sleepy droopy eyelids, slow breathing cycle, soft `zZZ` floating bubbles.
6. **Native Win32 Rust Window Hooks (`src-tauri/src/window_hooks.rs`)**:
   - `toggle_pin_active_window() -> String`: Win32 `GetForegroundWindow()`, `GetWindowLongW()`, and `SetWindowPos(..., HWND_TOPMOST / HWND_NOTOPMOST, ...)` to pin any active application window on top, returning the formatted window title.
   - `check_fullscreen_state() -> bool`: Determines if foreground application covers the entire monitor rect (e.g., games or fullscreen media), allowing auto-stealth to `'bezel-line'` when `autoFullscreenStealth` is active.

---

## 1. Architecture & Component Directory Map

```
d:\LiquidIsland\
├── docs/
│   ├── PHASE_1_PLAN.md
│   ├── PHASE_2_PLAN.md
│   ├── PHASE_3_PLAN.md
│   ├── PHASE_4_PLAN.md
│   ├── PHASE_5_PLAN.md
│   └── PHASE_8_PLAN.md                     # [THIS DOCUMENT] Phase 8 Implementation Plan
├── src/
│   ├── types/
│   │   └── liquid.ts                       # Extended with ToastPayload, ToastType, BatteryState, etc.
│   ├── store/
│   │   └── useSystemStore.ts               # triggerToast(), mic mute, window pin, auto-revert timer
│   ├── utils/
│   │   └── sfx.ts                          # AirBuds chime, Battery chime, Pin snap, Slide wave whoosh
│   ├── styles/
│   │   └── liquid-glass.css                # Sonar pulse, slide-wave keyframes, toast glass styling
│   ├── components/
│   │   ├── IslandShell.tsx                 # Notch shell integration + scroll routing to Toast HUD
│   │   ├── ToastView.tsx                   # [NEW] Master Toast Container (325px × 64px, Modes A-D)
│   │   ├── CompactView.tsx                 # Preserved Phase 3 compact view
│   │   ├── ExpandedContainer.tsx           # Preserved Phase 5 expanded carousel
│   │   └── companions/
│   │       ├── SlimeCompanion.tsx          # Enhanced with energized spark & sleepy low-battery expressions
│   │       ├── CatCompanion.tsx            # Enhanced with happy electric cheeks & sleepy droop expressions
│   │       └── CompanionStage.tsx          # Passes battery & charging reaction states
│   └── App.tsx                             # Renders ToastView when islandState === 'toast', Dev trigger toolbar
└── src-tauri/
    ├── Cargo.toml                          # Added windows-sys Win32_UI_WindowsAndMessaging & Win32_Graphics_Gdi
    └── src/
        ├── lib.rs                          # Registered window_hooks invoke commands
        └── window_hooks.rs                 # [NEW] Win32 toggle_pin_active_window and check_fullscreen_state
```

---

## 2. Technical Specifications: System Toast View (`ToastView.tsx`)

### 2.1 Geometric & Motion Specifications
- **Dimension Lock**: Strictly `325px × 64px` (`border-radius: 32px` capsule).
- **Placement**: Nested directly inside `IslandShell.tsx`, taking full advantage of the liquid glass backdrop filter and top notch fillet ears.
- **Spring Transition**:
  - `stiffness: 440, damping: 32, mass: 0.75` for instant, snappy expansion.
  - Directional slide wave: `x: [-14, 0]` (Left) or `x: [14, 0]` (Right) with elastic rebound.
- **Auto-Revert**:
  - Mode A (AirBuds), Mode B (Battery), Mode D (Desktop/Pin): Reverts after `3.2s`.
  - Mode C (HUD Volume / Brightness / Mic): Reverts after `2.2s` of scroll inactivity.
  - User can tap `×` to immediately dismiss the toast and return to idle.

### 2.2 Toast Mode A — AirBuds Pro Connected (`00:19` Reference 1:1)
- **Left Column**:
  - Bluetooth icon with two concentric radiating acoustic arcs (`#3b82f6`).
  - Ambient blue drop-shadow glow (`drop-shadow(0 0 8px rgba(59, 130, 246, 0.6))`).
- **Center Column**:
  - Primary Title: `"AirBuds Pro"` (`13.5px`, `font-weight: 600`, color `var(--text-primary)`).
  - Secondary Subtitle: `"Connected - 70%"` (`11px`, `font-weight: 500`, color `var(--text-secondary)`).
  - Left / Right bud micro battery indicator icons with tiny battery capsules.
- **Right Column**:
  - `28×28px` animated blue sonar ring (`#3b82f6`).
  - Centered glowing dot (`8×8px`) with an outer ring expanding and fading outwards (`sonarPulse` animation: `scale 0.8 -> 1.5`, `opacity 0.8 -> 0`).

### 2.3 Toast Mode B — Battery Charging & Health Guard (`00:20` Reference 1:1)
- **Left Column**:
  - Neon green lightning bolt icon (`#22c55e`) with pulsating green aura (`drop-shadow(0 0 10px rgba(34, 197, 94, 0.7))`).
  - When in Low Battery mode (`20%`): Amber bolt (`#f59e0b`).
  - When in Charge Limit mode (`85%`): Cyan bolt (`#06b6d4`).
- **Center Column**:
  - Primary Title: `"Charging"` (or `"Battery Low 20%"` / `"Charge Limit 85%"`).
  - Subtitle: `"Fast Charging - 45m until full"` (or `"Connect charger to preserve workflow"`).
- **Right Column**:
  - Bold green percentage: `"70%"` (or current battery level, `15.5px`, `font-weight: 700`, color `#22c55e`).
  - **Mini Companion Reaction Badge**:
    - Cute `22×22px` rounded glass badge.
    - Inside: Micro vector of active companion (`slime` or `cat`) with energized electrical spark particles (or sleepy `zZZ` if low battery).

### 2.4 Toast Mode C — Custom Liquid System HUD (Volume / Brightness / Mic Mute)
- **Trigger**: Notch mouse-wheel scroll or Mic Mute toggle.
- **Left Column**:
  - High-contrast icon:
    - Volume: `<Volume2 />` (blue `#3b82f6`) or `<VolumeX />` (red `#ef4444`) when 0%.
    - Brightness: `<SunMedium />` (amber `#f59e0b`).
    - Mic Mute: `<Mic />` (emerald `#10b981`) or `<MicOff />` (rose `#f43f5e`).
- **Center Column**:
  - Liquid Glass Progress Bar Track: `160px × 8px`, `background: rgba(255, 255, 255, 0.12)`, `border-radius: 4px`.
  - Liquid Fill: Smooth animated width percentage, gradient matching icon color (`#3b82f6` or `#f59e0b`), with a specular gloss top rim.
- **Right Column**:
  - Value pill: `"75%"` or `"MUTED"` / `"ACTIVE"` in crisp high-contrast typography.

### 2.5 Toast Mode D — Virtual Desktop & Active Window Switch Pill
- **Trigger**: Desktop navigation hotkey or Window Pin (`Ctrl + Alt + T`).
- **Slide-Wave Motion**: Container executes a horizontal whip:
  - Left desktop switch: `[-16px, 2px, 0px]`.
  - Right desktop switch: `[16px, -2px, 0px]`.
- **Content**:
  - Desktop Switch: Layers icon `<Layers />`, Title `"Virtual Desktop 2"`, Subtitle `"Work & Code"`.
  - Window Pin: Pin icon `<Pin />`, Title `"Window Pinned"`, Subtitle `"Always-on-Top Active"` (or window title from Win32 hook).

---

## 3. Companion Reactions: Charging & Low Battery Expressions

### 3.1 Slime Companion Reactions
- **Charging Reaction (`isCharging: true`)**:
  - Aura: Pulsing neon electric green/yellow gradient filter.
  - Spark Particles: 3 micro floating electric spark stars (`⚡`) popping around the jelly crown.
  - Facial Expression: Wide joyful eyes with star-shaped sparkle reflections; bouncy, buoyant squishy wobble.
- **Low Battery Reaction (`isLowBattery: true`)**:
  - Body: Dimmed, translucent cyan-slate tint; slow, lethargic breathing animation.
  - Facial Expression: Droopy half-closed eyelids (`scaleY: 0.35`); floating `z` text slowly rising and fading.

### 3.2 Cat Companion Reactions
- **Charging Reaction (`isCharging: true`)**:
  - Ears: High-frequency playful ear twitches.
  - Cheeks: Rosy electric blushing sparks with glowing whiskers.
  - Eyes: Cheerful anime crescent eyes (`^ ^`).
- **Low Battery Reaction (`isLowBattery: true`)**:
  - Ears: Softly drooping sideways (`rotate: -12deg`).
  - Eyes: Sleepy horizontal slits (`- -`); tiny `zZZ` sleepy particles drifting up.

---

## 4. Rust Win32 Native Desktop & Window Hooks

### 4.1 Implementation in `src-tauri/src/window_hooks.rs`
1. **`toggle_pin_active_window() -> String`**:
   - Queries `hwnd = GetForegroundWindow()`.
   - Checks if `hwnd` is null, desktop (`GetDesktopWindow()`), or our own island window.
   - Evaluates current topmost status:
     ```rust
     let ex_style = GetWindowLongW(hwnd, GWL_EXSTYLE);
     let is_topmost = (ex_style & (WS_EX_TOPMOST as i32)) != 0;
     ```
   - Toggles window position:
     ```rust
     let target = if is_topmost { HWND_NOTOPMOST } else { HWND_TOPMOST };
     SetWindowPos(hwnd, target, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_SHOWWINDOW);
     ```
   - Fetches window title via `GetWindowTextW(hwnd, buf, 256)`.
   - Returns string: `"📌 Pinned: [Title]"` or `"Unpinned: [Title]"`.

2. **`check_fullscreen_state() -> bool`**:
   - Gets `hwnd = GetForegroundWindow()`.
   - Obtains monitor via `hmonitor = MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST)`.
   - Compares `GetWindowRect(hwnd)` against `monitor_info.rcMonitor`.
   - If window rect completely blankets or exceeds the monitor rect, returns `true`.
   - Frontend listens or queries this state to slip into `'bezel-line'` stealth mode when `autoFullscreenStealth` is enabled.

---

## 5. WebAudio Acoustic Chime Design in `sfx.ts`

Phase 8 introduces 4 new procedural WebAudio synthesisers:
1. `playAirBudsChime()`: Pure dual-tone Bluetooth pairing chord (`660Hz` -> `880Hz` ascending crystal bell).
2. `playChargingChime()`: Triple-tone harmonic power-up chord (`523.25Hz [C5]` -> `659.25Hz [E5]` -> `783.99Hz [G5]`).
3. `playBatteryLowChime()`: Double descending alert chime (`440Hz` -> `349Hz`).
4. `playPinChime()`: Crisp metallic snap with high-frequency tactile ping (`1800Hz` -> `3200Hz` decay).
5. `playSlideWaveSound()`: Liquid whoosh slide sound (`300Hz` upward sweep with bandpass filter).

---

## 6. State Machine & Store Extensions

In `src/types/liquid.ts` & `src/store/useSystemStore.ts`:
- Add `ToastType` and `ToastPayload` interfaces.
- Add fields to `SystemSettings`:
  - `isMicMuted: boolean` (default: `false`)
  - `batteryLevel: number` (default: `70`)
  - `isCharging: boolean` (default: `false`)
  - `batteryStatus: 'charging' | 'low' | 'guard' | 'normal'` (default: `'normal'`)
  - `autoFullscreenStealth: boolean` (default: `false`)
  - `toastPayload: ToastPayload | null`
- Add action methods:
  - `triggerToast(type: ToastType, payload?: Partial<ToastPayload>)`
  - `dismissToast()`
  - `toggleMicMute()`
  - `setBatteryState(level: number, charging: boolean, status?: ...)`
  - `setAutoFullscreenStealth(enabled: boolean)`
  - `triggerVirtualDesktopSwitch(direction: 'left' | 'right')`

---

## 7. Dev Toolbar Wiring & Verification Plan

Add a dedicated Phase 8 diagnostic section in `App.tsx`:
- Trigger AirBuds Toast (`00:19`)
- Trigger Charging Toast (`00:20`)
- Trigger Battery Low 20% Toast
- Trigger Charge Limit 85% Toast
- Trigger Custom Liquid HUD (Volume 80%, Brightness 65%, Mic Muted)
- Trigger Virtual Desktop Slide-Wave (Left / Right)
- Trigger Pin Active Window (`Ctrl + Alt + T`)
- Toggle Auto Fullscreen Stealth Mode
