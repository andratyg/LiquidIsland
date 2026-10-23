# Phase 1 Implementation Plan: Core Rust Backend, Win32 RAM Trimmer (~10 MB), Frameless Overlay & AI Consistency Lock

## Overview
Phase 1 establishes the foundational desktop architecture and AI Consistency Lock for **LiquidIsland OS**, an ultra-lightweight Dynamic Island desktop overlay for Windows. The application is built upon Tauri v2 with a custom Win32 Rust backend and a high-performance React 18 + TypeScript frontend, designed to consume minimal system resources with active working set memory aggressively trimmed to ~8–10 MB RAM.

To guarantee that autonomous AI agents in Phases 2 through 10 maintain 100% architectural and contractual integrity without drift or hallucinations, Phase 1 creates the **AI Consistency Lock** (`ARCHITECTURE_LOCK.md` and `src/types/liquid.ts`).

---

## 1. Exact Directory Tree for Phase 1

```
d:\LiquidIsland\
├── ARCHITECTURE_LOCK.md                    # [MANDATORY AI LOCK] Immutable architectural rules for Phases 2–10
├── docs/
│   └── PHASE_1_PLAN.md                     # Comprehensive Phase 1 architectural & implementation plan
├── index.html                              # Root HTML entry point with zero-margin transparent viewport
├── package.json                            # Frontend dependencies (Tauri v2, React 18, Tailwind, Framer Motion)
├── postcss.config.js                       # PostCSS configuration for Tailwind CSS
├── tailwind.config.js                      # Tailwind CSS configuration with custom glass token extensions
├── tsconfig.json                           # TypeScript client compiler configuration
├── tsconfig.node.json                      # TypeScript node configuration for Vite
├── vite.config.ts                          # Vite bundler configuration optimized for Tauri v2
├── src/
│   ├── types/
│   │   └── liquid.ts                       # [MANDATORY CONTRACT] Strict TypeScript definitions & state machine
│   ├── store/
│   │   └── useSystemStore.ts               # LocalStorage state persistence (key: liquidisland_os_state_v1)
│   ├── utils/
│   │   └── sfx.ts                          # Pure WebAudio synthesis engine (zero external audio files)
│   ├── App.tsx                             # Phase 1 Diagnostic Test Shell & Notch overlay (184px × 40px)
│   ├── index.css                           # Dual Liquid Glass design tokens (theme-dark & theme-light)
│   └── main.tsx                            # React root bootstrapping
└── src-tauri/
    ├── Cargo.toml                          # Rust manifest (Tauri v2 + windows-sys 0.59)
    ├── tauri.conf.json                     # Tauri v2 frameless, transparent, top-center overlay window config
    ├── capabilities/
    │   └── default.json                    # Tauri v2 security capabilities configuration
    ├── build.rs                            # Tauri build script
    └── src/
        ├── lib.rs                          # Tauri application builder, command handler & lifecycle setup
        ├── main.rs                         # Native entry point
        ├── memory.rs                       # Win32 Extreme RAM Trimmer & 25s background daemon
        └── window_manager.rs               # Click-through toggle, multi-monitor query & top-center positioning
```

---

## 2. AI Consistency Lock: Architecture & TypeScript Contract (Phases 2–10)

### 2.1 The Problem Across Multi-Phase AI Development
In multi-phase agentic development, distinct AI instances often suffer from:
1. **Naming Divergence**: E.g., one AI model introduces `isOpen: boolean`, another uses `expanded: boolean`, and a third introduces `islandMode: 'small' | 'large'`.
2. **Dimension Drift**: Differing pixel widths causing jitter, clipped shadows, or broken companion ears.
3. **Monolithic Bloat**: Inlining slides, audio handling, or clipboard listeners directly into `App.tsx`.
4. **IPC Protocol Breakage**: Modifying Tauri Rust command signatures without coordinating frontend invocations.

### 2.2 Strict Mitigation via `ARCHITECTURE_LOCK.md` & `src/types/liquid.ts`
All future AI models in Phases 2–10 are bound by two source-of-truth lock files:

1. **State Machine Single Source of Truth (`src/types/liquid.ts`)**:
   ```typescript
   export type IslandState = 
     | 'bezel-line'        // 136px x 6px: Ultra-thin bezel strip
     | 'eyes'              // 168px x 40px: Companion pet idle state
     | 'compact'           // 184px x 40px: Default compact pill with status
     | 'toast'             // 325px x 64px: Transient system notifications
     | 'expanded'          // 432px x 174px: Active slide dashboard
     | 'expanded-lyrics';  // 595px x 174px: Extended dual-column view with live lyrics
   ```
   No model is permitted to introduce arbitrary intermediate modes or boolean states (`isExpanded`, `isToast`). All transitions must flow through `IslandState`.

2. **Strict Slide Indexing Lock**:
   ```typescript
   export type SlideIndex = 0 | 1 | 2 | 3 | 4;
   // 0: Music + Lyrics (Feature #1 & #2)
   // 1: Pomodoro Timer (Feature #6)
   // 2: Water Reminder (Feature #7)
   // 3: Quick Shelf / Clipboard Manager (Feature #3)
   // 4: Daily Todo List (Feature #8)
   ```

3. **System Settings & LocalStorage Key Lock**:
   - The persistence key is locked to `liquidisland_os_state_v1`.
   - The interface is locked to `SystemSettings`, capturing all configurable parameters across features (Indonesian dual lyrics toggle, companion modes, lofi audio, SFX toggle, monitor index, taskbar mode).

4. **Modular Isolation Rule**:
   - `App.tsx` is strictly the shell and state coordinator.
   - Every feature slide (Music, Pomodoro, Water, Shelf, Todo) and companion character (Slime, Cat) must reside in isolated component directories (`src/components/slides/`, `src/components/companion/`).
   - All components must import shared contracts from `src/types/liquid.ts` and state from `src/store/useSystemStore.ts`.

5. **Dual Liquid Glass CSS Design Tokens**:
   All styling must adhere to the 12 locked CSS custom properties defined in `src/index.css`:
   - `--island-bg`: Base backdrop blur fill
   - `--glass-surface`: Subtle luminous interior gradient
   - `--glass-border`: 1px perimeter border
   - `--glass-rim-top`: Top specular highlight reflection
   - `--glass-rim-bottom`: Bottom diffuse shadow line
   - `--glass-shadow`: Multi-layered ambient drop shadow
   - `--text-primary`: Primary text / icon luminance
   - `--text-secondary`: Muted secondary text
   - `--pill-bg`: Button and pill interactive background
   - `--ear-fill`: Companion ear and accessory fill
   - `--blue-glow`: Active media / audio glow accent
   - `--lyrics-glow`: Active synchronized lyrics accent

---

## 3. Win32 Extreme RAM Trimmer (~8–10 MB Active Working Set)

### 3.1 Chromium / WebView2 Resident Memory Behavior
Windows WebView2 instances host Chromium rendering and JavaScript engine threads. Chromium aggressively reserves private committed working set pages for:
- V8 bytecode caches and JIT compilations
- Skia GPU/DirectX rendering textures
- DOM trees and style recalculation caches

Even when the UI is completely static or idle, Windows keeps these pages resident in physical RAM unless explicitly prompted to trim them.

### 3.2 Win32 Kernel Memory Management Mechanism
In `src-tauri/src/memory.rs`, we invoke the low-level Win32 Memory Management APIs via `windows-sys` (`v0.59`):

1. **`GetCurrentProcess()`**:
   Returns the pseudo-handle for the current process, with default `PROCESS_SET_QUOTA` and `PROCESS_QUERY_INFORMATION` rights.

2. **`K32EmptyWorkingSet(handle)`**:
   Instructs the Windows Virtual Memory Manager (VMM) to aggressively transition as many pages as possible from the process's working set to the standby or modified page lists.
   - Standby pages retain their memory content without disk writes. If the process touches them again, a fast soft page fault brings them back into physical RAM.
   - Truly unreferenced and transient allocations are reclaimed immediately by the OS.

3. **`SetProcessWorkingSetSizeEx(handle, usize::MAX, usize::MAX, 0)`**:
   Passing `(SIZE_T)-1` (`usize::MAX`) for both minimum and maximum working set bounds commands the Windows Memory Manager to strip any temporary working set expansion quotas granted during heap bursts. This resets the working set size to its baseline floor.

4. **`K32GetProcessMemoryInfo(handle, &mut counters, size)`**:
   Retrieves `PROCESS_MEMORY_COUNTERS.WorkingSetSize` (in bytes), divided by `(1024.0 * 1024.0)` to return accurate real-time working set metrics in Megabytes.

### 3.3 Automated 25-Second Background Daemon
To maintain a sustained footprint of ~8–10 MB without requiring manual user intervention:
- A dedicated background thread is spawned at application startup (`setup` hook in `lib.rs`).
- It sleeps for 25 seconds in a loop.
- It verifies that the application is in an idle or compact state (`IS_IDLE_OR_COMPACT`).
- It executes `trim_ram_working_set_internal()`, ensuring that any memory briefly expanded during user interaction, animations, or WebAudio playback is reclaimed within 25 seconds.

---

## 4. Dynamic Cursor Click-Through & Multi-Monitor Top-Center Positioning

### 4.1 Frameless Transparent Canvas & Click-Through (`set_ignore_cursor_events`)
The LiquidIsland window canvas is configured in `tauri.conf.json` with:
- `width: 640`, `height: 220`, `y: 0`
- `decorations: false`, `transparent: true`, `alwaysOnTop: true`, `skipTaskbar: true`, `resizable: false`, `shadow: false`

The window canvas is intentionally larger (`640 × 220`) than the compact island (`184 × 40`) to accommodate:
- Smooth fluid spring expansions (up to `595 × 174` in lyrics mode)
- Soft ambient drop shadows and companion ear popouts
- Zero window resizing stutter or visual clipping

**Click-Through Operation**:
- Transparent regions of the canvas (`rgba(0,0,0,0)`) must not block clicks to browser tabs, address bars, or window close buttons underneath.
- Tauri v2 provides `window.set_ignore_cursor_events(ignore)`.
- At application startup, `set_ignore_cursor_events(true)` is activated. Mouse clicks pass straight through the transparent canvas into native desktop applications below.
- In React, the Notch element binds `onMouseEnter` to call `safeInvoke('set_click_through', { ignore: false })`, instantly activating hover, drag, and click responsiveness on the island.
- On `onMouseLeave`, the Notch invokes `safeInvoke('set_click_through', { ignore: true })`, re-enabling full cursor passthrough.

### 4.2 Multi-Monitor Top-Center Positioning (`center_on_monitor`)
Multi-monitor configurations on Windows frequently feature mixed resolutions (e.g. 4K primary + 1080p secondary), varying DPI scaling factors (100%, 125%, 150%), and negative virtual coordinates.

1. **`get_monitors_list(window: Window) -> Vec<String>`**:
   Enumerates `window.available_monitors()`, querying name, physical resolution, physical position `(x, y)`, and DPI scale factor.

2. **`center_on_monitor(window: Window, monitor_index: usize)`**:
   - Queries `available_monitors()`.
   - Bounds-checks and selects `monitors[monitor_index]` (defaulting to monitor 0 if index is out of bounds).
   - Obtains monitor physical bounds: `monitor_pos.x`, `monitor_pos.y`, `monitor_size.width`.
   - Obtains window outer width: `window_size.width`.
   - Calculates the exact horizontal center coordinate:
     $$\text{center\_x} = \text{monitor\_pos.x} + \left\lfloor\frac{\text{monitor\_size.width} - \text{window\_size.width}}{2}\right\rfloor$$
   - Sets the vertical coordinate flush against the top bezel:
     $$\text{top\_y} = \text{monitor\_pos.y}$$
   - Applies the physical coordinates via `window.set_position(Position::Physical(PhysicalPosition { x: center_x, y: top_y }))`.

---

## 5. Implementation Roadmap & Verification

1. **Write AI Consistency Lock (`ARCHITECTURE_LOCK.md`)**:
   Establish the immutable rules, pixel dimensions, state machine, and CSS tokens.
2. **Write TypeScript Contract (`src/types/liquid.ts`)**:
   Export `IslandState`, `LiquidTheme`, `CompanionMode`, `TaskbarMode`, `SlideIndex`, `SystemSettings`, and `ClipboardSnippetItem`.
3. **Configure Tailwind & CSS Design Tokens (`tailwind.config.js`, `postcss.config.js`, `src/index.css`)**:
   Include all 12 CSS variables for `.theme-dark` and `.theme-light`.
4. **Implement Persistent Store (`src/store/useSystemStore.ts`)**:
   Typed strictly against `SystemSettings`, saving to `localStorage` key `liquidisland_os_state_v1`.
5. **Implement WebAudio SFX Engine (`src/utils/sfx.ts`)**:
   Pure oscillator synthesis for `playGlassPop()`, `playWaterDrop()`, and `playToggleClick()` with 0 external audio assets.
6. **Implement Rust Backend (`src-tauri/src/memory.rs`, `src-tauri/src/window_manager.rs`, `src-tauri/src/lib.rs`)**:
   Win32 `K32EmptyWorkingSet` trimmer, 25-second daemon, `set_click_through`, `center_on_monitor`, `get_monitors_list`.
7. **Implement Phase 1 Diagnostic Overlay Shell (`src/App.tsx`)**:
   Render `184px × 40px` compact notch flush at top center with dynamic hover click-through and interactive diagnostic buttons.
8. **Verify Compilation & Testing**:
   Run `cargo check` and `npm run build` to confirm zero errors and zero warnings.
