# Phase 4 Implementation Plan: Custom Interactive Companions (Concept B: Liquid Slime, Concept C: Shadow Cat & Original Cyber-Eyes)

## Executive Summary
Phase 4 implements the interactive companion ecosystem for **LiquidIsland OS**. Aligned strictly with `ARCHITECTURE_LOCK.md` and Phases 1–3, this phase introduces three character concepts operating inside the locked `eyes` state (`168px × 40px`):
1. **Concept B — Liquid Slime Spirit (`SlimeCompanion.tsx`)**: Translucent SVG liquid droplet creature with `<filter id="liquid-goo">` (`feGaussianBlur` + `feColorMatrix`), zero-gravity breathing morphs, cursor-tracking suspended eyes, file-drag swallow anticipation (`O`), and jelly bounce petting reactions (`^ ^`).
2. **Concept C — Shadow Cat / Neko Peek (`CatCompanion.tsx`)**: Playful silhouette feline peeking from the top bezel with independent ear twitches, laser cursor tracking, interactive paw swat gesture on hover, purring micro-vibrations upon petting, and file-pounce alert (`O O`). Also renders a subtle peek/swaying tail tip in `bezel-line` mode.
3. **Original Video Cyber-Eyes (`CyberEyes.tsx`)**: 1:1 authentic reproduction of the vertical glowing eyes (`6.5px × 14px`) from `00:00–00:02` of the reference video, with natural blinking rhythms, cursor parallax, and diffuse bottom blue glow.
4. **Master Companion Stage & Auto-Accessories (`CompanionStage.tsx`)**: Orchestrates character switching based on `companionMode`, dynamic file drag detection, petting velocity detection, and contextual auto-accessories (mini glowing headphones when music plays; round focus glasses when Pomodoro runs).

All graphics are **100% pure SVG and GPU-accelerated CSS/Framer Motion transforms** with **zero external image or audio files**, keeping idle RAM well within the ~8–10 MB working set lock.

---

## 1. Directory Tree & Component Architecture

```
d:\LiquidIsland\
├── docs/
│   ├── PHASE_1_PLAN.md
│   ├── PHASE_2_PLAN.md
│   ├── PHASE_3_PLAN.md
│   └── PHASE_4_PLAN.md                      # [THIS DOCUMENT] Phase 4 Architecture & Implementation Plan
├── src/
│   ├── types/
│   │   └── liquid.ts                        # Preserved TypeScript contracts & companion types
│   ├── store/
│   │   └── useSystemStore.ts                # Preserved store + companion helpers & accessory toggles
│   ├── utils/
│   │   └── sfx.ts                           # Pure oscillator synthesis + playPetPurr & playJellyBounce
│   ├── styles/
│   │   └── liquid-glass.css                 # Companion keyframes, glow filters & micro-vibrations
│   ├── components/
│   │   ├── IslandShell.tsx                  # Master Notch shell + eyes state routing & cat bezel peek
│   │   ├── CompactView.tsx                  # Preserved Phase 3 Compact view
│   │   └── companions/                      # [NEW COMPANION ECOSYSTEM]
│   │       ├── CompanionStage.tsx           # Master companion switcher, auto-accessories & gesture manager
│   │       ├── SlimeCompanion.tsx           # Concept B: SVG Goo Filter Droplet with file catch & petting
│   │       ├── CatCompanion.tsx             # Concept C: Shadow Cat silhouette, paw swat & purr vibration
│   │       ├── CyberEyes.tsx                # Concept A: Original Video 00:00-00:02 1:1 vertical glowing eyes
│   │       └── accessories/
│   │           ├── MiniHeadphones.tsx       # Music-responsive glowing mini headphones
│   │           └── FocusGlasses.tsx         # Pomodoro-responsive round focus glasses
│   └── App.tsx                              # Dev diagnostics bar with companion selectors & test triggers
```

---

## 2. Mathematical Models & Gesture Algorithms

### 2.1 Normalized Cursor Tracking Math
Companions track the cursor across the entire screen canvas while remaining neatly clamped inside their eye sockets.

1. **Delta Calculation**:
   Given cursor coordinates $(x_{\text{mouse}}, y_{\text{mouse}})$ and Notch center $(x_{\text{center}}, y_{\text{center}})$:
   $$\Delta x = x_{\text{mouse}} - x_{\text{center}}$$
   $$\Delta y = y_{\text{mouse}} - y_{\text{center}}$$

2. **Angle & Normalized Magnitude**:
   $$\theta = \text{atan2}(\Delta y, \Delta x)$$
   $$r_{\text{raw}} = \frac{\sqrt{\Delta x^2 + \Delta y^2}}{D_{\text{viewport\_diag}} / 2}$$
   $$r = \min(1.0, r_{\text{raw}})$$

3. **Pupil Displacement**:
   $$\text{offset}_x = r \cdot \cos(\theta) \cdot R_{\text{max\_x}}$$
   $$\text{offset}_y = r \cdot \sin(\theta) \cdot R_{\text{max\_y}}$$
   - For `SlimeCompanion`: $R_{\text{max\_x}} = 4.5\text{px}, R_{\text{max\_y}} = 3.0\text{px}$
   - For `CatCompanion`: $R_{\text{max\_x}} = 3.5\text{px}, R_{\text{max\_y}} = 2.5\text{px}$
   - For `CyberEyes`: $R_{\text{max\_x}} = 5.0\text{px}, R_{\text{max\_y}} = 2.0\text{px}$

4. **Natural Blink Loop**:
   Blinks trigger via a randomized timer interval ($3500\text{ms} - 5500\text{ms}$), executing a smooth `scaleY` squash from $1.0 \to 0.08 \to 1.0$ over $160\text{ms}$. Occasional double-blinks occur with 20% probability.

### 2.2 Petting Velocity & Direction-Reversal Detection
Petting is detected when the user rapidly rubs the cursor back and forth horizontally across the Notch surface:

1. On each `pointermove` over the companion area, compute:
   $$v_x = \frac{x_t - x_{t-1}}{\Delta t}$$
2. Check for sign reversal in velocity ($\text{sign}(v_x) \neq \text{sign}(v_{x,\text{prev}})$) with $|v_x| > 0.35\text{px/ms}$.
3. Increment reversal counter. If $\ge 3$ reversals occur within an $800\text{ms}$ rolling window, trigger `isPetting = true`.
4. Fire a tactile oscillator chime (`playPetPurr()` or `playJellyBounce()`).
5. Maintain `isPetting = true` until mouse movement stops or leaves for $> 700\text{ms}$, smoothly transitioning back to idle.

### 2.3 File-Drag Anticipation Detection
1. Window-level event listeners for `dragenter`, `dragover`, and `dragleave`.
2. Inspect `e.dataTransfer.types.includes('Files')`.
3. When drag coordinates approach the upper half of the screen ($y_{\text{mouse}} < 300\text{px}$), trigger `isDraggingFile = true`.
4. Companions react dynamically:
   - Slime stretches downward (`scaleY: 1.14`) and opens an excited mouth (`O`).
   - Cat perks ears upright, dilates pupils to full circles (`O O`), and tenses posture.
   - Cyber-Eyes expand horizontally and increase diffuse glow intensity.

---

## 3. Character Specifications

### 3.1 Concept B: Liquid Slime Spirit (`SlimeCompanion.tsx`)
- **Dimensions:** Renders centered inside `168px × 40px`.
- **Goo Filter Architecture:**
  ```xml
  <filter id="liquid-goo" x="-20%" y="-20%" width="140%" height="140%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="3.2" result="blur" />
    <feColorMatrix in="blur" mode="matrix" 
      values="1 0 0 0 0  
              0 1 0 0 0  
              0 0 1 0 0  
              0 0 0 19 -8" result="goo" />
    <feComposite in="SourceGraphic" in2="goo" operator="atop" />
  </filter>
  ```
- **Visual Structure:**
  - Organic translucent teardrop/blob path filled with `companionColor` (with subtle radial gradient and specular inner bubble).
  - Floating idle animation: gentle vertical drift ($\pm 1.8\text{px}$) with phase-shifted horizontal squash/stretch.
  - Two glossy black circular eyes with white highlight specks, floating inside the blob and tracking cursor angle.
  - Dynamic mouth:
    - Normal: cute tiny curved dot/smile.
    - File Drag: wide excited `O` mouth ready to swallow the incoming file.
    - Petting: happy squinting arcs (`^ ^`) with joyful bouncing wobble.

### 3.2 Concept C: Shadow Cat / Neko Peek (`CatCompanion.tsx`)
- **Visual Anatomy:**
  - Silhouette feline head peeking from behind the Notch bezel.
  - Left & right ears with inner ear blush (`--ear-fill` / soft pink tint).
  - Independent ear twitch timers: left ear twitches every ~6s, right ear every ~8s with randomized offsets.
  - Glowing almond feline eyes with vertical pupils that track the cursor like a laser pointer.
  - Two tiny rounded paws resting on the bottom bezel lip.
  - In `bezel-line` mode (`136px × 6px`), a subtle cat ear silhouette and swaying tail tip peek out gracefully.
- **Paw Swat Interactive Gesture:**
  - Hovering within $12\text{px}$ of the bottom rim for $\ge 900\text{ms}$ triggers a quick playful paw swat animation reaching toward the cursor.
- **Petting Reaction:**
  - Eyes close into bliss arcs (`^ ^`), ears fold slightly sideways in comfort, and a subtle $45\text{Hz}$ purr vibration effect triggers.

### 3.3 Concept A: Original Video Cyber-Eyes (`CyberEyes.tsx`)
- **Dimensions:** Two exact vertical pill eyes ($6.5\text{px} \times 14\text{px}$), spaced $22\text{px}$ apart.
- **Visual Styling:**
  - Glowing luminous pill bars tinted with `companionColor` or `#38bdf8`.
  - Ambient bottom blue glow reflection (`var(--blue-glow)`).
  - Natural blinking with vertical compression ($14\text{px} \to 1.5\text{px}$).
  - Cursor parallax: entire eye assembly shifts smoothly in response to cursor position.
  - Petting mode: eyes morph into curved cyber arcs (`^ ^`).

---

## 4. Master Companion Stage & Contextual Auto-Accessories

### 4.1 Master Stage (`CompanionStage.tsx`)
- Checks `useSystemStore`:
  - If `companionMode === 'off'`, automatically falls back/redirects idle state to `'compact'`.
  - Otherwise switches seamlessly between `slime`, `cat`, and `eyes`.
- Passes shared state down to the active companion:
  - `cursorDelta: { x, y, angle, distance }`
  - `isPetting: boolean`
  - `isDraggingFile: boolean`
  - `companionColor: string`
  - `theme: 'dark' | 'light'`

### 4.2 Auto-Accessories Overlay
- **Mini Glowing Headphones (`MiniHeadphones.tsx`)**:
  - Automatically rendered over the companion head when `autoAccessories === true` AND `isAudioPlaying === true` (or when forced via dev controls).
  - Sleek top headband arc bridging the two ears/sides, with two glowing ear pads pulsing gently.
- **Mini Focus Glasses (`FocusGlasses.tsx`)**:
  - Automatically rendered over the eyes when `autoAccessories === true` AND Pomodoro timer is running (or when forced via dev controls).
  - Dual circular wireframe lenses with nose bridge and glass glare reflection.

---

## 5. Dev / Diagnostic Toolbar Extensions
Add dedicated companion controls to the existing collapsible toolbar:
1. **Companion Mode Selector**: Slime (B) / Shadow Cat (C) / Cyber-Eyes / Off.
2. **Companion Color Palette**: Emerald (`#10b981`), Electric Cyan (`#06b6d4`), Violet (`#a855f7`), Coral (`#f43f5e`), Amber (`#f59e0b`).
3. **Interactive Test Triggers**:
   - `[Test Petting]`
   - `[Test File Drag]`
   - `[Toggle Headphones]`
   - `[Toggle Focus Glasses]`
4. Direct button to toggle island state into `'eyes'` (`168px × 40px`).

---

## 6. Implementation & Quality Verification Checklist
- [x] Read `ARCHITECTURE_LOCK.md` and Phases 1–3 documentation.
- [ ] Write `src/utils/sfx.ts` companion audio additions (`playPetPurr`, `playJellyBounce`).
- [ ] Build `src/components/companions/accessories/MiniHeadphones.tsx` (pure SVG).
- [ ] Build `src/components/companions/accessories/FocusGlasses.tsx` (pure SVG).
- [ ] Build `src/components/companions/SlimeCompanion.tsx` (Concept B with Goo filter).
- [ ] Build `src/components/companions/CatCompanion.tsx` (Concept C with paw swat & purr).
- [ ] Build `src/components/companions/CyberEyes.tsx` (1:1 original video vertical glowing eyes).
- [ ] Build `src/components/companions/CompanionStage.tsx` (Gesture tracking & accessory overlay).
- [ ] Wire `CompanionStage` into `IslandShell.tsx` and integrate `CatCompanion` bezel-line peek.
- [ ] Update `App.tsx` dev toolbar with companion switching and test buttons.
- [ ] Run `npx tsc --noEmit` and `npm run build` to confirm zero errors and zero warnings.
