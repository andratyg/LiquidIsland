# Phase 6 Implementation Plan: Pomodoro Focus Timer, Lofi Ambient Mixer & Water Reminder

## Executive Summary
Phase 6 delivers two core productivity slides of LiquidIsland OS:
1. **Slide 1 (Slide Index 1) — Pomodoro Focus Timer (`00:09`)**:
   - High-precision, drift-free timestamp delta timer logic (`25:00` Focus, `05:00` Short Break).
   - Authentic 1:1 visual fidelity from the reference video (`00:09`): `72x72px` glowing red stopwatch ring (`#ef4444`) with top crown ticks, tabular countdown display, circular reset button, daily focus streak pill (`🔥 2h 05m`), and mode switch pills.
   - Optional Lofi Focus Mixer Badge (`enableOptionalLofi`) providing on-demand procedural ambient soundscapes (`Rain`, `Warm Pad`, `White Noise`, `Off`).
   - Seamless companion synchronization: when the Pomodoro timer is active, `isPomodoroRunning` / `pomodoroActive` in `useSystemStore` triggers the companion to wear `FocusGlasses.tsx`.
2. **Slide 2 (Slide Index 2) — Water Reminder & 8-Bar Hourly Intake Chart (`00:10–00:11`)**:
   - 1:1 visual recreation from the reference video (`00:10–00:11`): bold volume intake readout (`1.5 / 1.5 L`), interactive blue toggle switch (`#3b82f6`), progress subtitle (`"100% • Goal reached"`), `💧 Drink` (+0.25 L with `playWaterDrop()` SFX), and `⚙ Settings` (cycle goal / reset intake).
   - 8-bar hourly consumption chart inside dark glass card with staggered spring entry animation (`cubic-bezier(0.22, 1.35, 0.36, 1)`), 6px wide blue gradient bars, X-axis hour ticks (`09`, `12`, `15`), and Y-axis scale markers (`400 ml`, `200 ml`, `0 ml`).
3. **Zero-RAM Procedural Ambient Audio Generator (`src/utils/ambientAudio.ts`)**:
   - Zero external audio files (0 KB disk / memory asset footprint). Pure WebAudio synthesis for soothing rain, warm detuned low-pass pad chord, and soft white noise.
   - Guaranteed immediate node teardown and context suspension when stopped or when `enableOptionalLofi === false`.
4. **Strict DOM Unmounting & RAM Protection (~8–10 MB Target)**:
   - In `ExpandedContainer.tsx`, only the active slide (`activeSlide`) is mounted in the React DOM.
   - Slides 3 & 4 remain lightweight placeholders until Phase 7.

---

## 1. Architecture & Component Structure

```
d:\LiquidIsland\
├── docs/
│   ├── ARCHITECTURE_LOCK.md
│   ├── PHASE_1_PLAN.md
│   ├── PHASE_2_PLAN.md
│   ├── PHASE_3_PLAN.md
│   ├── PHASE_4_PLAN.md
│   ├── PHASE_5_PLAN.md
│   └── PHASE_6_PLAN.md                 # [THIS DOCUMENT] Phase 6 Implementation Plan
├── src/
│   ├── types/
│   │   └── liquid.ts                   # Preserved TypeScript contracts + Phase 6 Pomodoro & Water settings
│   ├── store/
│   │   └── useSystemStore.ts           # State store with pomodoro & water helpers + backward-compatible aliases
│   ├── utils/
│   │   ├── sfx.ts                      # Preserved short interaction SFX (playGlassPop, playWaterDrop, etc.)
│   │   └── ambientAudio.ts             # [NEW] Zero-RAM procedural ambient audio engine (Rain, Lofi Pad, White Noise)
│   ├── styles/
│   │   └── liquid-glass.css            # Pomodoro glowing ring, stopwatch crown, water chart & pill styles
│   ├── components/
│   │   ├── ExpandedContainer.tsx       # Updated to mount PomodoroSlide (idx 1) and WaterSlide (idx 2)
│   │   ├── slides/
│   │   │   ├── MusicLyricsSlide.tsx    # Slide 0 (Preserved Phase 5)
│   │   │   ├── PomodoroSlide.tsx       # [NEW] Slide 1: 1:1 Pomodoro Timer + Optional Lofi Badge
│   │   │   ├── WaterSlide.tsx          # [NEW] Slide 2: 1:1 Water Reminder + 8-Bar Hourly Chart
│   │   │   └── SlidePlaceholder.tsx    # Slide 3 & 4 placeholders (Shelf & Todo)
│   │   └── companions/
│   │       ├── CompanionStage.tsx      # Preserved Stage with FocusGlasses auto-mount
│   │       └── accessories/
│   │           └── FocusGlasses.tsx    # Preserved Focus Glasses accessory
│   └── App.tsx                         # Master router & Dev contrast toolbar
```

---

## 2. Technical Specifications & Detailed Design

### 2.1 Drift-Free Timestamp Delta Timer Logic (`src/components/slides/PomodoroSlide.tsx`)
A standard `setInterval(() => setTime(t => t - 1), 1000)` suffers from severe drift over 25-minute intervals due to JavaScript thread execution delays, CPU throttling, and browser background tab scheduling.

**Solution**:
1. When the timer starts or resumes, compute `targetEndTime = Date.now() + remainingSeconds * 1000`.
2. Run a lightweight check loop (every 200ms):
   ```typescript
   const now = Date.now();
   const diffMs = targetEndTime - now;
   const secondsLeft = Math.max(0, Math.ceil(diffMs / 1000));
   ```
3. When `secondsLeft <= 0`:
   - Trigger timer completion chime (`playGlassPop()` / triple resonant tone).
   - Automatically switch mode (Focus ➔ Short Break, or Short Break ➔ Focus).
   - Stop ambient sound if playing.
   - Set `isPomodoroRunning: false` and `pomodoroActive: false`.
4. **Companion Sync**:
   - While `isRunning` is `true` in Focus mode, update `systemStore.setState({ isPomodoroRunning: true, pomodoroActive: true })`.
   - In `CompanionStage.tsx`, `showGlasses` detects `isPomodoroRunning` and seamlessly renders `<FocusGlasses frameColor={companionColor} />` with its smooth pop-in spring animation.
   - When paused or reset, `isPomodoroRunning` returns to `false`, causing the companion to gently take off the glasses.

### 2.2 Zero-RAM Procedural Ambient / Lofi Audio Generator (`src/utils/ambientAudio.ts`)
To satisfy the zero-asset constraint (0 external mp3/wav files and ~0 KB persistent memory footprint):
1. **Rain Mode (`'rain'`)**:
   - An in-memory 1.5-second pink noise buffer generated procedurally on demand:
     ```typescript
     // Pink noise via Paul Kellet's filter algorithm
     b0 = 0.99886 * b0 + white * 0.0555179;
     b1 = 0.99332 * b1 + white * 0.0750759;
     b2 = 0.96900 * b2 + white * 0.1538520;
     b3 = 0.86650 * b3 + white * 0.3104856;
     b4 = 0.55000 * b4 + white * 0.5329522;
     b5 = -0.7616 * b5 - white * 0.0168980;
     pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
     ```
   - Passed through a dynamic BiquadFilterNode (`type: 'lowpass'`, frequency modulated between 900Hz and 1400Hz) and soft randomized droplet gain nodes.
2. **Lofi Pad Mode (`'lofi-pad'`)**:
   - Warm, detuned four-oscillator chord (Fmaj7 / Cadd9 voicing: e.g. C3 at 130.81Hz, G3 at 196.00Hz, B3 at 246.94Hz, E4 at 329.63Hz) using `'triangle'` oscillators.
   - Micro-detuning (-5 cents, +4 cents, -3 cents, +6 cents) for an organic analog chorus feel.
   - Warm 24dB low-pass ladder filter (`frequency: 520Hz`, `Q: 2.2`).
   - Slow 0.18Hz sine LFO gently sweeping the cutoff between 420Hz and 640Hz for a relaxing breathing motion.
3. **White Noise Mode (`'white-noise'`)**:
   - Gentle Gaussian white noise buffer passed through a gentle band-pass / low-pass filter (`2200Hz`, `Q: 0.7`) simulating a distant ocean swell or soothing ventilation hum.
4. **Instant Cleanup & Teardown**:
   - Calling `stopAmbientSound()` fades gain to `0` over 80ms, calls `stop()`, disconnects all audio nodes from `AudioContext.destination`, and sets references to `null`.
   - If `enableOptionalLofi` in `useSystemStore` is `false`, any invocation of `setAmbientSound` safely no-ops and stops any running sounds.

### 2.3 Slide 2: Pomodoro Timer Visual Layout (`00:09`)
- **Dimensions**: Sits inside the standard expanded slide content area (`412px × 114px`).
- **Left Graphic (`72x72px`)**:
  - Exact `72x72px` container matching the album art size on Slide 1.
  - SVG circular stopwatch track (`cx="36" cy="36" r="28"`, `stroke="rgba(239,68,68,0.18)"`, `strokeWidth="4.5"`).
  - Active glowing red ring (`stroke="#ef4444"`, `strokeWidth="4.5"`, `strokeLinecap="round"`, `strokeDashoffset` dynamically proportional to elapsed time).
  - Stopwatch top crown at 12 o'clock (`x="33" y="1.5" width="6" height="4" rx="1" fill="#ef4444"`) and subtle index tick marks at 12, 3, 6, 9 o'clock.
  - Drop-shadow glow: `filter: drop-shadow(0 0 12px rgba(239, 68, 68, 0.45))`.
  - Center icon: dynamic red flame / timer glyph with pulsing animation while active.
- **Right Column Readout & Controls**:
  - **Top Row**:
    - Circular Reset button (`↺`) with subtle glass surface (`26x26px`).
    - Tabular countdown display (`fontVariantNumeric: 'tabular-nums'`, `22px`, `font-weight: 700`, crisp `#ffffff`).
    - Daily Focus Streak Pill: `🔥 2h 05m` with amber/crimson glass fill (`background: rgba(239,68,68,0.12)`, `border: 1px solid rgba(239,68,68,0.25)`).
  - **Bottom Row**:
    - Pill button `"Short Break"` (05:00 cycle, toggle active state).
    - Circular Play/Pause button (`▶` / `⏸`) (`32x32px`, red glowing accent `#ef4444`, `box-shadow: 0 0 14px rgba(239,68,68,0.4)`).
    - Pill button `"Focus Time"` (25:00 cycle, toggle active state).
  - **Optional Lofi Badge**:
    - When `enableOptionalLofi === true`, a discreet glass pill badge displays in the header/corner:
      `[ 🌧️ Rain / 🎹 Pad / 🌊 Noise / Off ]`.
    - Clicking toggles/cycles through the soundscapes with smooth acoustic feedback.

### 2.4 Slide 3: Water Reminder Visual Layout & 8-Bar Chart (`00:10–00:11`)
- **Left Column**:
  - Top Row: Bold volume readout (`1.5 / 1.5 L`, tabular nums, `20px`, `font-weight: 700`, `letter-spacing: -0.5px`) alongside an interactive blue toggle switch (`#3b82f6`).
  - Progress Subtitle: `"100% • Goal reached"` (computed: `Math.round((intake / goal) * 100)% • Goal reached`).
  - Bottom Buttons Row:
    - `"💧 Drink"` pill: Adds `+0.25 L` per click, triggers `playWaterDrop()` SFX, increments today's intake and updates the latest hour in the 8-bar chart.
    - `"⚙ Settings"` pill: Cycles daily goal (`1.5 L` ➔ `2.0 L` ➔ `2.5 L` ➔ `1.5 L`) or resets daily intake with `playToggleClick()`.
- **Right Column — 8-Bar Hourly Consumption Chart**:
  - Glass card container (`rgba(255, 255, 255, 0.03)`, `border: 1px solid rgba(255, 255, 255, 0.08)`, `border-radius: 12px`, padding `8px 10px`, height `94px`).
  - 8 vertical rounded bars (`width: 6px`, `border-radius: 3px`, gradient `linear-gradient(180deg, #60a5fa 0%, #2563eb 100%)`).
  - Staggered spring entry animation (`cubic-bezier(0.22, 1.35, 0.36, 1)`, staggered delay: `i * 0.035s`).
  - Responsive height scaling: intake in ml / 400ml * maxHeight (max height `58px`).
  - X-Axis Ticks: Hour labels (`09`, `12`, `15`) positioned below bars 1, 4, 7.
  - Y-Axis Scale Markers: (`400 ml`, `200 ml`, `0 ml`) right-aligned alongside the chart.

### 2.5 Strict DOM Unmounting in `ExpandedContainer.tsx`
- Active slide switches conditionally:
  - `activeSlide === 0`: `<MusicLyricsSlide />`
  - `activeSlide === 1`: `<PomodoroSlide />`
  - `activeSlide === 2`: `<WaterSlide />`
  - `activeSlide >= 3`: `<SlidePlaceholder index={activeSlide} />`
- When switching away from a slide, its DOM nodes, animation frames, and local component states are unmounted, keeping RAM tightly under the ~8–10 MB working set threshold.
- Global timer state and hydration intake persist in `useSystemStore` (and `localStorage`), so navigating between slides does not erase timer progress or water intake data.

---

## 3. Step-by-Step Implementation Strategy

| Step | Action | Files Touched |
| :---: | :--- | :--- |
| **3.1** | Define Phase 6 types and store actions with backward compatibility | `src/types/liquid.ts`, `src/store/useSystemStore.ts` |
| **3.2** | Implement Zero-RAM Procedural Ambient Sound Engine | `src/utils/ambientAudio.ts` |
| **3.3** | Build Slide 2 — 1:1 Pomodoro Focus Timer with Lofi Badge & Companion Sync | `src/components/slides/PomodoroSlide.tsx` |
| **3.4** | Build Slide 3 — 1:1 Water Reminder with Staggered 8-Bar Chart | `src/components/slides/WaterSlide.tsx` |
| **3.5** | Add CSS styling tokens for Pomodoro glow, stopwatch crown, and water chart | `src/styles/liquid-glass.css` |
| **3.6** | Mount PomodoroSlide and WaterSlide in `ExpandedContainer.tsx` | `src/components/ExpandedContainer.tsx` |
| **3.7** | Verify TypeScript compilation & zero regressions | `npx tsc --noEmit` & `npm run build` |

---

## 4. Verification & Testing Checklist

- [ ] **TypeScript Check**: `npx tsc --noEmit` compiles with 0 errors.
- [ ] **Pomodoro Timer Precision**:
  - Tabular countdown (`25:00`, `05:00`).
  - Play, Pause, Reset operate without drift using timestamp delta.
  - Glowing red stopwatch ring (`#ef4444`) with crown tick marks reflects exact remaining percentage.
- [ ] **Companion Sync**:
  - Starting the Pomodoro timer sets `isPomodoroRunning: true` and `pomodoroActive: true`.
  - Companion in `eyes` state automatically wears `FocusGlasses.tsx`.
  - Pausing/resetting removes glasses.
- [ ] **Procedural Ambient Audio**:
  - Cycles through `Rain`, `Lofi Pad`, `White Noise`, and `Off`.
  - Zero external files; stops immediately when turned off or when `enableOptionalLofi === false`.
- [ ] **Water Reminder & 8-Bar Chart**:
  - Volume readout (`1.5 / 1.5 L`) and toggle switch.
  - Subtitle updates dynamically based on percentage.
  - Clicking `"💧 Drink"` adds `+0.25 L`, plays water drop SFX, and raises chart bar.
  - 8-bar chart renders with staggered spring entry animation and correct axis labels.
- [ ] **Strict DOM Unmounting**:
  - Switching between slides 0, 1, 2, 3, 4 mounts only the active slide.
  - No memory leaks or orphaned timers.
