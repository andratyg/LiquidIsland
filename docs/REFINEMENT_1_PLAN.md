# Refinement Phase 1 Plan: Anti-AI-Slop UI Overhaul, Auto-Shrink on Cursor Leave, Stealth Auto-Wake & macOS-Style Settings

## Overview
Refinement Phase 1 strips away artificial "AI slop" aesthetics (clunky cards, emojis, grey seam lines, mismatched fonts) and transforms LiquidIsland into a pixel-perfect, 1:1 replica of the Apple Dynamic Island OLED look shown in the reference video (`00:00–00:15`). It also implements native desktop cursor interaction physics: stealth bezel auto-wake, hover auto-expand (`220ms`), auto-shrink on mouse leave (`280ms`), reliable Win32 hardware cursor hit-testing with event emissions, and a completely redesigned macOS Control Center-style Settings Popover.

---

## 1. Aesthetic Overhaul: Pure OLED Black & 1:1 Geometry

### 1.1 Pure OLED Black Design Tokens (`src/styles/liquid-glass.css`)
- **Theme Dark Properties**:
  - `--island-bg: #000000` (true OLED black, `#000000`).
  - `--bezel-bg: #000000` and `--ear-fill: #000000` to eliminate grey border lines and seams between the top notch bar and the island body.
  - `--glass-border: rgba(255, 255, 255, 0.08)` (ultra-subtle 1px perimeter border).
  - Eliminate top border (`border-top: none !important`), top ear radius artifacts, and any stray shadows or outline borders.
  - Ensure `.notch-ear path` uses `--ear-fill: #000000` flush against the screen bezel.

### 1.2 Total Elimination of Emojis Across Components
- Remove all emoji characters (`💧`, `🔥`, `⚙️`, `🔍`, `🎧`, `🔊`, `📌`, `🐱`, `👀`, `🚫`, `★`, `✓`, etc.).
- Replace with crisp, minimal inline SVG icons using `1.75px` stroke width (Lucide / Apple SF Symbols styling).

### 1.3 1:1 Compact Pill (`src/components/CompactView.tsx`)
- Reference: Video timestamps `00:00–00:02` & `00:11–00:15`.
- **Dimensions**: `184px × 40px`, pill border radius `20px`.
- **Left**: Crisp green circular progress ring (`18px × 18px`), `#22c55e` stroke on `rgba(34, 197, 94, 0.22)` track with center dot.
- **Center**: Clean white tabular clock (`font-size: 14.5px`, `font-weight: 600`, font family `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif`).
- **Right**: 5 crisp white vertical rounded audio bars (`width: 2.5px`, heights `4px, 10px, 14px, 8px, 4px`, `border-radius: 9999px`, animated on audio playback).
- Zero clutter, zero secondary icons on the compact pill.

### 1.4 1:1 Expanded Header & TodoList (`src/components/ExpandedContainer.tsx` & `src/components/slides/TodoSlide.tsx`)
- Reference: Video timestamp `00:12`.
- **Expanded Header**:
  - Left: Bold clean title (`TodoList`, `12px`, `font-weight: 700`, uppercase tracking).
  - Center: 15px green circular ring + live formatted date/time (`Sun 25 Oct 2026  09:32`).
  - Right: 5-bar waveform visualizer + subtle hover-only gear icon (`Settings`, `strokeWidth: 1.75`) + close button (`X`, `strokeWidth: 1.75`).
- **Left Column of `TodoSlide.tsx`**:
  - Large white counter: `0/0` (or `4/5`) rendered in `34px` bold white (`font-weight: 800`, `letter-spacing: -0.5px`, `fontVariantNumeric: 'tabular-nums'`).
  - Subtitle: `Task Done Today` in `#9ca3af` (`font-size: 11px`).
  - Two dark pill buttons:
    - `+ Add Task`: dark pill background, circular plus icon (`PlusCircle` SVG, `1.75px` stroke).
    - `Edit Task`: dark pill background, pencil icon (`Pencil` SVG, `1.75px` stroke).
- **Right Column of `TodoSlide.tsx`**:
  - Dark rounded container (`#0c0c0e`, `border-radius: 18px`, `border: 1px solid rgba(255, 255, 255, 0.06)`, `padding: 8px`).
  - Empty state: clean checklist SVG icon (`CheckSquare` / `ListTodo`) and `"No tasks."`.
  - Populated state: translucent emerald task pills (`rgba(34, 197, 94, 0.22)`, `border-radius: 9999px`, right circular checkmark toggle).

---

## 2. Cursor Physics: Stealth Auto-Wake, Hover Auto-Expand & Leave Auto-Shrink

### 2.1 Win32 Hardware-Level Hit Testing (`src-tauri/src/window_manager.rs`)
- In the 35ms `GetCursorPos` loop:
  - Calculate physical bounds of the island based on `HIT_WIDTH` and `HIT_HEIGHT`.
  - Include stealth top bezel zone: when `pt.y <= 14px` and within the center horizontal zone (`win_center_x ± 100px`), treat cursor as inside.
  - Dynamically toggle `window.set_ignore_cursor_events(should_ignore)`.
  - **IPC Event Emission**: When `is_inside` changes, emit `window.emit("cursor-in-island", is_inside)`. This ensures React receives 100% reliable hardware-level cursor state notifications even if native browser mouseleave fails during rapid cursor flicks.

### 2.2 Stealth Auto-Wake & Hover Expansion (`src/components/IslandShell.tsx` & `App.tsx`)
- **Stealth Mode (`bezel-line`) Auto-Wake**:
  - When cursor enters the top bezel zone (`y <= 14px`), wake island immediately to `compact`.
  - If cursor remains hovered inside for `220ms`, smoothly transition `islandState` to `expanded`.
- **Hover Auto-Expand on Compact / Eyes**:
  - When cursor hovers over `compact` or `eyes` for `220ms`, automatically morph into `expanded`.
  - Clicking on the pill triggers immediate expansion (`0ms`).
- **Auto-Shrink on Cursor Leave (`280ms`)**:
  - When cursor leaves the island bounding box (via `onMouseLeave` or Rust `"cursor-in-island"` false event):
    - Start a `280ms` debounce timer.
    - Cancel timer if cursor re-enters before `280ms`.
    - Check guards: do not shrink if an input field is focused (`document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA'`) or if a modal is open (`spotlightOpen`, `showSettingsModal`).
    - If clear, shrink back to `compact` (or `eyes` if companion mode is active, or `bezel-line` if stealth mode was active).

---

## 3. Native macOS Control Center-Style Settings Popover (`src/components/SettingsModal.tsx`)

### 3.1 Architecture & Form Factor
- **Dimensions**: `width: 420px`, centered overlay.
- **Glassmorphic Material**: `background: rgba(12, 12, 14, 0.94)`, `backdrop-filter: blur(32px)`, `border: 1px solid rgba(255, 255, 255, 0.1)`, `border-radius: 20px`, `box-shadow: 0 24px 60px rgba(0, 0, 0, 0.8)`.
- **Zero Emojis**: Every single control, tab, and label uses clean typography and 1.75px-stroke Lucide icons.

### 3.2 Segmented Pill Selectors
1. **Companion Selection**:
   - Segmented pill row: `Slime`, `Cat`, `Eyes`, `Off`.
   - Subtle active background highlight (`rgba(255, 255, 255, 0.12)`), smooth animated transition.
2. **Theme Selection**:
   - Segmented pill row: `Obsidian` (Dark) vs `Quartz` (Light).
3. **Taskbar Integration**:
   - Segmented pill row: `Full Bar` (Option A), `Split Dock` (Option B), `Adaptive` (Option C).

### 3.3 iOS-Style Toggle Switches
Implement custom accessible toggle switches (smooth rounded thumb sliding on track):
1. **Stealth Auto-Hide**: Auto-collapses to `bezel-line` when cursor leaves or during fullscreen gaming.
2. **Dual Subtitle (`ID/EN`)**: Displays cyan Indonesian translations under lyrics.
3. **Lofi Focus Audio Engine**: Background ambient focus sounds.
4. **Sound Effects**: Pure WebAudio synthesis.

### 3.4 Sleek Bottom Telemetry Status Footer
- Displays active physical RAM working set: e.g. `9.2 MB` (with green status indicator).
- Minimal `"Optimize"` pill button that triggers `trim_ram_working_set()` with instant visual feedback.

---

## 4. Implementation Steps & Verification Plan
1. **CSS Overhaul**: Update `src/styles/liquid-glass.css` with OLED `#000000` dark theme, clean inner borders, seamless ear fill, and zero grey seams.
2. **Window Manager Hit-Testing**: Update `src-tauri/src/window_manager.rs` to detect top bezel zone (`y <= 14px`) and emit `"cursor-in-island"` (`bool`).
3. **Compact View 1:1**: Refactor `src/components/CompactView.tsx` (18x18 green ring, 14.5px tabular clock, 5 vertical audio bars `4px, 10px, 14px, 8px, 4px`).
4. **Expanded Header & TodoSlide 1:1**: Refactor `src/components/ExpandedContainer.tsx` and `src/components/slides/TodoSlide.tsx` (bold `TodoList` title, date+ring, 34px counter, dark pills with SVGs, `#0c0c0e` rounded container).
5. **Cursor Physics in `IslandShell.tsx` & `App.tsx`**: Add `220ms` hover-expand, `280ms` leave-shrink with input focus guards, and stealth auto-wake.
6. **Settings Redesign**: Overhaul `src/components/SettingsModal.tsx` into the 420px macOS Control Center glass card with segmented selectors and iOS switches.
7. **Clean Emoji Purge**: Verify no remaining emojis exist in any components.
8. **Build & Test**: Run `cargo check` and `npm run build` to ensure zero compilation errors.
