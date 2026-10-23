# Phase 3 Implementation Plan: 1:1 Notch Shell Geometry, Dual Liquid Glass Theme Engine, Bezel-Line & Compact View

## Executive Summary
Phase 3 builds the authentic physical geometry and visual identity of **LiquidIsland OS**. It implements the **1:1 Notch Shell Geometry** with top bezel integration and concave SVG corner fillets, the **Dual Liquid Glass Theme Engine** with mouse-tracking specular highlights, the **Stealth Bezel-Line** with magnetic tension wake, and the feature-complete **Compact View** (`184px × 40px`) featuring live clock, dynamic network throughput toggle, smart calendar schedule pill, and GPU-accelerated 5-bar audio visualizer.

All implementations strictly adhere to `ARCHITECTURE_LOCK.md` and build seamlessly upon the Phase 1 Win32 memory trimmer and Phase 2 Windows System Tray (`^`) integration.

---

## 1. Directory & File Manifest for Phase 3

```
d:\LiquidIsland\
├── docs/
│   ├── PHASE_1_PLAN.md                      # Phase 1: Win32 RAM Trimmer & AI Consistency Lock
│   ├── PHASE_2_PLAN.md                      # Phase 2: Windows System Tray (^) & Context Menu
│   └── PHASE_3_PLAN.md                      # [THIS PLAN] Notch Shell Geometry, Themes & Compact View
├── src/
│   ├── styles/
│   │   └── liquid-glass.css                 # [NEW] Dual Liquid Glass Theme Engine & Waveform Keyframes
│   ├── components/
│   │   ├── IslandShell.tsx                  # [NEW] Master Notch Container, Bezel, Ears, Gestures
│   │   └── CompactView.tsx                  # [NEW] Compact Pill: Ring, Clock/Net, Calendar, Visualizer
│   ├── types/
│   │   └── liquid.ts                        # Preserved strict contract + Phase 3 volume/brightness state
│   ├── store/
│   │   └── useSystemStore.ts                # Preserved persistence + volume, brightness, audio handlers
│   ├── utils/
│   │   └── sfx.ts                           # Preserved oscillators + playScrollTick() synthesis
│   ├── App.tsx                              # Integration shell with collapsible diagnostic toolbar
│   └── index.css                            # Imports liquid-glass.css with root viewport rules
```

---

## 2. Dual "Liquid Glass" Theme Engine (`src/styles/liquid-glass.css`)

### 2.1 Locked CSS Variables Mapping
Matching Section 4 of `ARCHITECTURE_LOCK.md`, the themes provide high-contrast, crystal-clear glassmorphism:

| CSS Variable | `.theme-dark` (Obsidian Droplet) | `.theme-light` (Quartz Droplet) | Architectural Purpose |
| :--- | :--- | :--- | :--- |
| `--island-bg` | `rgba(18, 18, 22, 0.88)` | `rgba(248, 250, 252, 0.88)` | Base blurred backdrop substrate |
| `--glass-surface` | `linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)` | `linear-gradient(135deg, rgba(255,255,255,0.90) 0%, rgba(255,255,255,0.40) 100%)` | Specular inner luminous gradient |
| `--glass-border` | `rgba(255, 255, 255, 0.12)` | `rgba(0, 0, 0, 0.08)` | 1px perimeter border outline |
| `--glass-rim-top` | `rgba(255, 255, 255, 0.25)` | `rgba(255, 255, 255, 0.95)` | Specular top edge refraction line |
| `--glass-rim-bottom`| `rgba(0, 0, 0, 0.35)` | `rgba(0, 0, 0, 0.06)` | Diffuse bottom grounding shadow line |
| `--glass-shadow` | `0 16px 36px -4px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08)` | `0 16px 36px -4px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)` | Multi-stage ambient floating shadow |
| `--text-primary` | `#f8fafc` | `#0f172a` | High-contrast typography & icons |
| `--text-secondary`| `#94a3b8` | `#64748b` | Muted readouts & metadata |
| `--pill-bg` | `rgba(255, 255, 255, 0.10)` | `rgba(0, 0, 0, 0.06)` | Interactive button surfaces |
| `--bezel-bg` | `#0b0b0e` | `#e2e8f0` | Physical top screen bezel fusion bar |
| `--ear-fill` | `#1e1e24` | `#e2e8f0` | Concave notch corner fillet fill |
| `--blue-glow` | `rgba(59, 130, 246, 0.45)` | `rgba(37, 99, 235, 0.25)` | Active media / bezel-line glow accent |
| `--lyrics-glow` | `rgba(168, 85, 247, 0.40)` | `rgba(147, 51, 234, 0.22)` | Synchronized lyrics glow accent |

### 2.2 Cursor-Tracking Specular Border Refraction
To achieve the tangible physical feeling of real curved liquid crystal glass, `IslandShell.tsx` tracks local mouse coordinates `(e.clientX - rect.left, e.clientY - rect.top)` and updates CSS custom properties `--mouse-x` and `--mouse-y` dynamically on the shell element.
- The `.island-shell::before` pseudo-element renders a dynamic radial refraction gradient:
  ```css
  background: radial-gradient(
    circle 140px at var(--mouse-x, 50%) var(--mouse-y, 0%),
    rgba(255, 255, 255, 0.35) 0%,
    rgba(255, 255, 255, 0.08) 40%,
    transparent 80%
  );
  ```
- This simulates light catching the curved chamfered glass lip as the pointer approaches the Notch.

### 2.3 GPU-Accelerated Waveform Keyframes (`waveBar`)
Five vertical visualizer bars are rendered with individual animation delays and GPU `transform: scaleY()` interpolation:
```css
@keyframes waveBar {
  0%, 100% {
    transform: scaleY(0.25);
  }
  50% {
    transform: scaleY(1.0);
  }
}
```
Bars execute on compositor threads with zero layout recalculation and zero JS thread overhead.

---

## 3. 1:1 Dynamic Island Shell Architecture (`src/components/IslandShell.tsx`)

### 3.1 Structural Composition
`IslandShell.tsx` serves as the master dynamic geometry container:

```
 ══════════════════════════════════════════════════════════════════════════════ Top Screen Edge (y: 0)
 [Top Bezel Bar: 5px height, var(--bezel-bg), fused with monitor]
 ┌─────────────────┬────────────────────────────────────────────┬─────────────────┐
 │ Left Ear (16x16)│           Main Notch Glass Shell           │Right Ear (16x16)│
 │ Concave Fillet  │  (bezel-line: 136x6px / compact: 184x40px) │ Concave Fillet  │
 │ (left: -15.5px) │   Backdrop Blur, Specular Rim, Glass Fill  │(right: -15.5px) │
 └─────────────────┴────────────────────────────────────────────┴─────────────────┘
```

1. **Top Bezel Strip (5px):**
   - Positioned at `top: 0`, spanning the top container edge with `height: 5px`.
   - Fuses the Notch directly into the physical screen frame, eliminating any floating gap.
2. **Concave SVG Notch Ears (16px × 16px):**
   - Left Ear: `left: -15.5px`, `top: 0`.
   - Right Ear: `right: -15.5px`, `top: 0`, flipped horizontally via `transform: scaleX(-1)`.
   - SVG Path Geometry:
     `d="M 0,0 L 16,0 L 16,16 A 16,16 0 0,0 0,0 Z"`
     Filled with `var(--ear-fill)`.
   - Smoothly hidden (`opacity: 0`, `transition: opacity 0.2s ease`) during `bezel-line` state; fully visible (`opacity: 1`) during `compact` and `expanded` states.

### 3.2 State 0: Stealth `bezel-line` (`136px × 6px`) & Magnetic Tension Wake
- In `bezel-line` mode, the Island shrinks to an ultra-thin 6px glowing liquid thread docked flush against the top monitor bezel.
- **Magnetic Tension Wake:**
  - When the cursor enters the vicinity of the bezel line, the element responds with fluid elastic bulging: `height: 10px`, `transform: scaleX(1.06)`.
  - An interactive click or hover trigger seamlessly wakes the Island from `bezel-line` to `compact` (`184px × 40px`) using Framer Motion springs (`stiffness: 420, damping: 34`).

### 3.3 Gestures: Scroll Wheel (Volume/Brightness) & Middle-Click
1. **Scroll Wheel on Notch (`onWheel`):**
   - Scrolling up/down adjusts the live **Volume** (`0%–100%`) or **Brightness** (when Shift/Alt is held or toggled).
   - Each wheel step triggers `playScrollTick()` synthesized in `sfx.ts`.
   - Displays a sleek transient glass HUD pill overlaid on the notch showing the current level (`Volume: 82%` or `Brightness: 75%`) that smoothly auto-dismisses after 1.4 seconds of inactivity.
2. **Middle-Click (`e.button === 1` on `onMouseDown`):**
   - Toggles audio play/pause state or collapses the island into `bezel-line`.
   - Plays tactile feedback `playToggleClick()`.
3. **Click-Through Integration:**
   - Automatically calls `safeInvoke('set_click_through', { ignore: false })` on mouse enter.
   - Automatically calls `safeInvoke('set_click_through', { ignore: true })` on mouse leave.

---

## 4. Compact View Architecture (`src/components/CompactView.tsx`)

Matching the reference video (`00:03–00:04`) at exact locked dimensions **184px × 40px**:

```
 ┌──────────────────────────────────────────────────────────────────────────────┐
 │ [Ring: 17x17]       [Center Readout: 07:33 / ↓ 4.8 MB/s]     [Visualizer: 5] │
 │ SVG #22c55e         Click: Toggle Clock / Network Speed      5x 2px Bars     │
 │ Circular Track      Right-Click / 2x-Click: Calendar Pill    GPU waveBar     │
 └──────────────────────────────────────────────────────────────────────────────┘
```

### 4.1 Left Indicator: Circular Progress Ring
- `17px × 17px` SVG circular ring with stroke width `2px`.
- Background track: `rgba(34, 197, 94, 0.22)`.
- Active progress stroke: `#22c55e` (`strokeDasharray`, `strokeDashoffset`).
- Inner icon: minimalist live pulse dot or volume/battery glyph indicating system health.

### 4.2 Center Readout: 3-Way Mode & Calendar Pill
1. **Mode A (Default): Digital Clock:**
   - Real-time `HH:mm` clock (e.g., `07:33`), updating every 10 seconds.
2. **Mode B: Live Network Throughput:**
   - Clicking the center readout switches to real-time network speed (e.g. `↓ 4.8 MB/s` or `↑ 1.2 MB/s`).
3. **Mode C: Smart Calendar & Schedule Pill:**
   - Right-clicking or double-clicking the center readout displays a floating compact calendar popover displaying today's date (`Fri 23 Oct 2026`) and next upcoming schedule entry (`10:30 AM • Sync`).

### 4.3 Right Audio Visualizer: 5 Rounded Waveform Bars
- 5 vertical rounded bars (`2px` wide, `border-radius: 9999px`).
- Staggered animation delays (`0s`, `0.15s`, `0.3s`, `0.1s`, `0.25s`).
- GPU-driven via CSS `animation: waveBar 1.1s ease-in-out infinite`.
- In paused state, smoothly transitions to neat 3px resting bars.

---

## 5. Integration with `App.tsx` & Collapsible Dev Toolbar

`App.tsx` is streamlined to coordinate:
1. Native Windows System Tray listeners and RAM monitor synchronization.
2. Root canvas hosting `IslandShell` and `CompactView`.
3. A non-intrusive, collapsible floating dev toolbar docked at the bottom of the canvas (`y: bottom`), enabling fast switching between `bezel-line`, `compact`, themes, and Tray simulation for testing before Phase 4 companion pets are added.

---

## 6. Verification & Quality Gates
- **Type Checking:** Run `npx tsc --noEmit` to verify zero TypeScript errors.
- **Vite Build:** Run `npm run build` to confirm clean frontend asset bundling.
- **Rust Backend:** Verify `cargo check` remains 100% passing.
- **Interactive Testing:** Validate smooth spring transitions between `bezel-line` and `compact`, mouse-wheel volume adjustments with audio ticks, network speed toggle, and dual glass theme appearance.