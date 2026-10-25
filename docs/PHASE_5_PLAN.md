# Phase 5 Implementation Plan: Expanded Container Carousel, Music Player & Dual Subtitle Synced Lyrics (Feature #2)

## Executive Summary
Phase 5 implements the master **Expanded Dashboard Container** and **Slide 1: Music Player & Synced Lyrics with Dual Subtitles (Indonesian & English - Feature #2)** for LiquidIsland OS. 

Building upon the foundations of Phases 1–4, this phase realizes the authentic 1:1 dynamic island expansion seen in the reference video (`00:06–00:08`), incorporating:
1. **Two-Stage Fluid Liquid Expansion**: Smooth spring-driven morphing from idle (`compact` at `184px × 40px` or `eyes` at `168px × 40px`) into standard expanded dashboard (`expanded` at `432px × 174px`), and asymmetric horizontal wing expansion into dual-column lyrics mode (`expanded-lyrics` at `595px × 174px`).
2. **Strict DOM Unmounting Architecture**: Guaranteed zero-leak memory management where only the current active slide (`activeSlide`) is mounted in the DOM. Unmounted slides drop all reactive listeners and timers to keep physical working set strictly around the ~8–10 MB RAM target.
3. **Feature #2 (Dual Subtitle Synced Lyrics)**: Real-time scrolling lyrics for *"Paper Sky"* by *"Lumen Coast - Summer Flows"*, with an active line highlight, interactive timestamp seeking upon click, and a toggleable Dual Subtitle mode displaying Indonesian translations (`dualSubtitleEnabled`) directly beneath the original English lines.
4. **Live Audio & Companion Accessory Synchronization**: Unified playback state in `useSystemStore` directly drives the 5-bar animated audio waveform visualizer, seek bar progress, album art pulsing, and the companions' `MiniHeadphones` accessory overlay.

---

## 1. Architecture & Component Structure

```
d:\LiquidIsland\
├── docs/
│   ├── PHASE_1_PLAN.md
│   ├── PHASE_2_PLAN.md
│   ├── PHASE_3_PLAN.md
│   ├── PHASE_4_PLAN.md
│   └── PHASE_5_PLAN.md                     # [THIS DOCUMENT] Phase 5 Implementation Plan
├── src/
│   ├── types/
│   │   └── liquid.ts                       # Preserved TypeScript contracts (IslandState, SlideIndex, etc.)
│   ├── store/
│   │   └── useSystemStore.ts               # Enhanced store helpers for slide cycling, lyrics toggling
│   ├── utils/
│   │   └── sfx.ts                          # Oscillator sound effects (Glass Pop, Water Drop, Toggle Click)
│   ├── styles/
│   │   └── liquid-glass.css                # CSS variables, lyrics mask gradient, album art pulse, pagination
│   ├── components/
│   │   ├── IslandShell.tsx                 # Master Notch shell + smooth expanding click triggers
│   │   ├── CompactView.tsx                 # Preserved Phase 3 compact view with expand-on-click
│   │   ├── ExpandedContainer.tsx           # [NEW] Master Expanded Carousel with Top Header & Pagination
│   │   ├── slides/
│   │   │   ├── MusicLyricsSlide.tsx        # [NEW] Slide 0: Music Player + Synced Lyrics + Dual Subtitle
│   │   │   └── SlidePlaceholder.tsx        # [NEW] Lightweight Glass Placeholders for Slides 1–4
│   │   └── companions/
│   │       ├── CompanionStage.tsx          # Preserved Phase 4 companion manager (live sync with music)
│   │       └── accessories/
│   │           └── MiniHeadphones.tsx      # Music-responsive headphones synchronized with playback
│   └── App.tsx                             # Master router with Phase 5 expanded states & dev contrast toolbar
```

---

## 2. Technical Specifications & Choreography

### 2.1 Two-Stage Liquid Expansion Choreography
LiquidIsland OS employs a multi-tier spring physics expansion that avoids abrupt layout snaps:
1. **Idle to Standard Expanded (`compact`/`eyes` ➔ `expanded`)**:
   - Triggered by clicking the Notch surface in `compact` or `eyes` mode.
   - Spring configuration: `stiffness: 420, damping: 34, mass: 0.8`.
   - Dimensions morph from `184px × 40px` (or `168px × 40px`) to `432px × 174px`.
   - Notch ear fillets (`16x16px`) and specular highlights adjust smoothly to the wider curved glass pill.
2. **Standard Expanded to Extended Lyrics (`expanded` ➔ `expanded-lyrics`)**:
   - Triggered by toggling the Synced Lyrics button in `MusicLyricsSlide.tsx`.
   - Dimensions morph horizontally from `432px × 174px` to `595px × 174px` (+163px rightward expansion wing).
   - Right lyrics wing smoothly unmasks with purple/blue radial ambient glow (`var(--lyrics-glow)`).
3. **Collapse Back to Idle**:
   - Triggered by clicking the subtle `×` button or Notch header bar.
   - Automatically collapses back to `companionMode !== 'off' ? 'eyes' : 'compact'`, with `playGlassPop()` acoustic confirmation.

### 2.2 Strict DOM Unmounting & RAM Protection (~10 MB Target)
To maintain the strict physical working set constraint of ~8–10 MB:
- `ExpandedContainer.tsx` switches child components using conditional rendering (`activeSlide === 0 ? <MusicLyricsSlide /> : <SlidePlaceholder index={activeSlide} />`).
- React immediately unmounts inactive slides, destroying their DOM trees, animation frame loops, and local state.
- Slides 1–4 (Pomodoro, Water, Shelf, Todo) render an ultra-lightweight glass card with zero overhead until their respective implementation phases (Phases 6–8).
- The lyrics scroll list uses passive event listeners and GPU-accelerated CSS `transform` / `opacity` transitions.

### 2.3 Feature #2: Dual Subtitle Synced Lyrics Architecture
- **Audio & Lyrics Track Data**:
  - Song: *"Paper Sky"* by *"Lumen Coast - Summer Flows"*.
  - Duration: 256 seconds (04:16).
  - Default timestamp for initial demo: `03:13` (193s) elapsed, `-01:03` (63s) remaining.
- **Data Model**:
  ```typescript
  export interface LyricLine {
    id: number;
    time: number;          // Timestamp in seconds
    textEn: string;        // Original English line
    textId: string;        // Feature #2 Indonesian translation
  }
  ```
- **Dual Subtitle Rendering**:
  - Main lyric line rendered in crisp white (`12.5px`, `font-weight: 600`, active line at `opacity: 1`, inactive lines dimmed to `opacity: 0.35`).
  - When `dualSubtitleEnabled` is `true`, an italicized, high-contrast cyan/indigo secondary sub-line (`10.5px`, `font-style: italic`, color: `#38bdf8`) renders directly underneath each lyric line.
  - Clicking any lyric line immediately jumps the audio seek position to that timestamp and plays `playWaterDrop()` SFX.
  - Auto-scroll keeps the current active line vertically centered within the container with smooth CSS behavior and a top/bottom gradient fade mask (`mask-image`).

### 2.4 Live Playback Synchronization with `MiniHeadphones.tsx`
- Play/Pause button in `MusicLyricsSlide.tsx` mutates `isAudioPlaying` in `useSystemStore`.
- The top header 5-bar animated audio waveform immediately reacts:
  - Playing: Bars animate with staggered GPU keyframes (`waveBar`).
  - Paused: Bars collapse into dimmed, static dashes (`scaleY(0.3)`, `opacity: 0.45`).
- When returning to `eyes` state, `CompanionStage.tsx` detects `isAudioPlaying === true` and automatically mounts `MiniHeadphones.tsx` on the Slime, Cat, or Cyber-Eyes companion with an organic bouncy pop!

---

## 3. Detailed Component Plan

### 3.1 `src/components/ExpandedContainer.tsx`
- **Header Bar (`height: 32px`)**:
  - Left: Dynamic slide title (`Music`, `Pomodoro`, `Water Reminder`, `Quick Shelf`, `Daily Todo`).
  - Center: Live formatted date & time (`Fri 23 Oct 2026 07:33`) alongside the iconic `15x15px` green circular progress ring.
  - Right: 5-bar mini audio waveform + glass collapse button (`×`).
- **Body Area (`height: 114px`)**:
  - Active slide content with `AnimatePresence` directional transitions.
- **Footer Bar (`height: 28px`)**:
  - Glass circular chevron navigation buttons: `<` (Previous) and `>` (Next) (`26x26px`).
  - Center pagination indicators: 5 dots (`6px`), where the active slide dot morphs smoothly into a `14px` pill.

### 3.2 `src/components/slides/MusicLyricsSlide.tsx`
- **Left Music Player Section (`width: ~390px`)**:
  - **Album Art (`72x72px`)**: White notebook lined paper background, blue SVG geometric circle with slash, scale pulse on play.
  - **Track Details**: `"Paper Sky"`, `"Lumen Coast - Summer Flows"`.
  - **Audio Device Switcher Pill**: Toggleable pill (`🎧 AirBuds Pro ⇄ 🔊 Speakers`).
  - **Seek Bar**: Real-time elapsed time (`03:13`), progress track with glowing grab handle, remaining time (`-01:03`). Clicking or dragging the track seeks the track.
  - **Control Bar**:
    - Synced Lyrics toggle button (speech bubble with text icon).
    - Dual Subtitle badge (`ID · EN`) with cyan active glow.
    - Media controls: `⏮` Previous, `▶ / ⏸` Play/Pause, `⏭` Next.
- **Right Synced Lyrics Wing (`width: 163px` when in `expanded-lyrics`)**:
  - Ambient radial purple/blue glow overlay.
  - Vertical scrollable lyrics list with top & bottom fade gradient.
  - Dual subtitle lines (English + Indonesian).
  - Click-to-seek functionality on any line.

### 3.3 `src/components/slides/SlidePlaceholder.tsx`
- Clean glass placeholder for slides 1 to 4 (`Pomodoro`, `Water`, `Shelf`, `Todo`).
- Displays slide title, feature icon, phase description, and a quick switch button back to Music.

### 3.4 Integration & Dev Diagnostics in `src/App.tsx`
- Connect `islandState === 'expanded'` and `islandState === 'expanded-lyrics'` to `<ExpandedContainer />`.
- Add interactive "Test Phase 5: Open Music + Dual Subtitle Lyrics" quick button in Dev Toolbar.
- Add "Wallpaper Contrast Preview" button in Dev Toolbar to cycle backgrounds:
  - Transparent (Native Desktop mode)
  - Dark Wallpaper (Obsidian starry night)
  - Light Wallpaper (Alpine quartz morning)
  - Vibrant Wallpaper (Cyberpunk neon sunset)

---

## 4. Verification & Testing Checklist
- [x] TypeScript builds with 0 errors (`tsc && vite build`).
- [x] Two-stage expansion transitions smoothly (`184px` -> `432px` -> `595px` and back).
- [x] DOM unmounting verified: unmounted slides do not retain active intervals.
- [x] Dual subtitles render cleanly in English and Indonesian with toggleable badge.
- [x] Interactive seek bar updates elapsed/remaining time and lyric alignment.
- [x] Companion `MiniHeadphones` accessory stays in perfect sync with Play/Pause state.
- [x] Audio visualizer 5-bar waveform animates during playback and pauses on pause.
- [x] WebAudio SFX (`playGlassPop`, `playWaterDrop`, `playToggleClick`) fire appropriately.
