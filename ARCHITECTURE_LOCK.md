# LiquidIsland OS: Architecture & Consistency Lock (Phases 1–10)

> **CRITICAL INSTRUCTION FOR ALL AI SESSIONS & PHASES (2–10)**:
> This document is the immutable single source of truth for LiquidIsland OS.
> Any modifications to state types, state machine keys, dimension locks, or CSS variable names
> across multi-model or multi-phase prompts are strictly forbidden without explicit authorization.

---

## 1. Tech Stack Lock

| Component | Technology | Version / Specification |
| :--- | :--- | :--- |
| **Desktop Wrapper** | Tauri v2 | Tauri 2.x with native `tray-icon` and capabilities |
| **Native Windows API** | `windows-sys` | `0.59` (`Win32_Foundation`, `Win32_System_Threading`, `Win32_System_Memory`, `Win32_System_ProcessStatus`) |
| **Frontend Framework** | React | `18.3.x` with `useSyncExternalStore` for reactive persistence |
| **Language** | TypeScript | `5.6+` in strict mode |
| **Styling** | Tailwind CSS + CSS Variables | Glassmorphism design tokens with zero runtime overhead |
| **Motion & Animation** | Framer Motion | Fluid spring physics for dynamic island expansion |
| **Audio Engine** | WebAudio API | Pure oscillator synthesis (`sfx.ts`) with zero external audio assets |
| **State Persistence** | `localStorage` | Stored under key `liquidisland_os_state_v1` via `src/store/useSystemStore.ts` |

---

## 2. Strict State Machine Lock

The Dynamic Island state MUST strictly adhere to the `IslandState` union:

```typescript
export type IslandState = 
  | 'bezel-line'        // Ultra-thin 6px bezel strip when docked/minimized
  | 'eyes'              // Companion Idle state (Slime/Cat blink & glance)
  | 'compact'           // Default compact pill with status/clock/lofi pip
  | 'toast'             // Transient system notification banner
  | 'expanded'          // Standard active slide dashboard (Music, Pomodoro, Water, Shelf, Todo)
  | 'expanded-lyrics';  // Extended dual-column dashboard with synchronized lyrics
```

**FORBIDDEN**: Do not introduce ad-hoc flags or states such as `isOpen`, `isExpanded`, `isToast`, `mode: 'small'`, etc. All component sizing and morphing must be driven by `IslandState`.

---

## 3. Exact Pixel Dimensions Lock

All transitions and layouts must use these precise pixel dimensions:

| Island State | Width | Height | Purpose / Content |
| :--- | :---: | :---: | :--- |
| `bezel-line` | **136px** | **6px** | Ultra-thin docked screen-edge line |
| `eyes` | **168px** | **40px** | Companion idle mode (eyes blink, tracking) |
| `compact` | **184px** | **40px** | Default compact pill with icon + label + indicator |
| `toast` | **325px** | **64px** | Fast notification toast with action pill |
| `expanded` | **432px** | **174px** | Standard slide dashboard |
| `expanded-lyrics` | **595px** | **174px** | Extended dual-column view: slide controls + real-time lyrics |

- Window container canvas: **640px × 220px** flush at `y: 0` (top center of the active monitor).
- Frameless, transparent (`rgba(0,0,0,0)`), `alwaysOnTop: true`, `skipTaskbar: true`, `shadow: false`.

---

## 4. Dual Liquid Glass CSS Variables Lock

All themes must strictly define and use these exact 12 CSS variables in `src/index.css`:

```css
/* Dark Theme (.theme-dark) */
.theme-dark {
  --island-bg: rgba(18, 18, 22, 0.88);
  --glass-surface: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%);
  --glass-border: rgba(255, 255, 255, 0.12);
  --glass-rim-top: rgba(255, 255, 255, 0.25);
  --glass-rim-bottom: rgba(0, 0, 0, 0.35);
  --glass-shadow: 0 16px 36px -4px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.08);
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --pill-bg: rgba(255, 255, 255, 0.10);
  --ear-fill: #1e1e24;
  --blue-glow: rgba(59, 130, 246, 0.45);
  --lyrics-glow: rgba(168, 85, 247, 0.40);
}

/* Light Theme (.theme-light) */
.theme-light {
  --island-bg: rgba(248, 250, 252, 0.88);
  --glass-surface: linear-gradient(135deg, rgba(255, 255, 255, 0.90) 0%, rgba(255, 255, 255, 0.40) 100%);
  --glass-border: rgba(0, 0, 0, 0.08);
  --glass-rim-top: rgba(255, 255, 255, 0.95);
  --glass-rim-bottom: rgba(0, 0, 0, 0.06);
  --glass-shadow: 0 16px 36px -4px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.04);
  --text-primary: #0f172a;
  --text-secondary: #64748b;
  --pill-bg: rgba(0, 0, 0, 0.06);
  --ear-fill: #e2e8f0;
  --blue-glow: rgba(37, 99, 235, 0.25);
  --lyrics-glow: rgba(147, 51, 234, 0.22);
}
```

---

## 5. Slide Index & Navigation Lock

Slides in the expanded dashboard are indexed as `0 | 1 | 2 | 3 | 4`:

| Index | Name | Associated Feature |
| :---: | :--- | :--- |
| `0` | **Music & Lyrics** | Feature #1 & #2 (Now Playing, Progress, Indonesian Lyrics) |
| `1` | **Pomodoro Timer** | Feature #6 (Focus / Break cycles, WebAudio chimes) |
| `2` | **Water Reminder** | Feature #7 (Hydration tracker & visual level) |
| `3` | **Quick Shelf** | Feature #3 (Clipboard snippet manager & dropzone) |
| `4` | **Daily Todo** | Feature #8 (Quick tasks with completion states) |

---

## 6. Modular Isolation & File Organization Rules

1. **`App.tsx` Purity**:
   `App.tsx` must only coordinate the main overlay shell, cursor event pass-through, and top-level state routing. **NEVER** write slide contents, companion SVGs, or timer logic directly in `App.tsx`.
2. **Component Directory Structure**:
   - `src/components/shell/`: Notch container, glass background, dynamic border rims.
   - `src/components/companion/`: Slime, Cat, and Eyes character renderers.
   - `src/components/slides/`: Dedicated files for each slide index (`MusicSlide.tsx`, `PomodoroSlide.tsx`, etc.).
   - `src/components/toast/`: Toast banner component.
3. **Type Imports**:
   Every file must import shared types exclusively from `src/types/liquid.ts`.
4. **State Access**:
   All state reads and mutations must pass through `src/store/useSystemStore.ts`.

---

## 7. Tauri IPC Command Contracts

The Tauri Rust backend exposes the following immutable commands:

- `trim_ram_working_set() -> f64`: Flushes working set pages using `K32EmptyWorkingSet` and `SetProcessWorkingSetSizeEx`. Returns current working set in MB.
- `set_click_through(window: Window, ignore: bool) -> Result<(), String>`: Configures cursor passthrough on transparent window regions via `window.set_ignore_cursor_events(ignore)`.
- `center_on_monitor(window: Window, monitor_index: usize) -> Result<(), String>`: Computes horizontal center and sets `y: 0` for the target monitor.
- `get_monitors_list(window: Window) -> Vec<String>`: Queries all connected monitors and returns formatted diagnostic strings.

---

## 8. High-Performance RAM Working Set Tier (<= 40.0 MB Target)

- LiquidIsland operates within a strict **40 MB maximum physical working set tier** (`<= 40.0 MB`).
- The memory budget headroom (up to 40 MB) is purposefully allocated to retain GPU blur shaders, 48x48 High-DPI icon caches, screenshot previews, and spring physics animation states permanently hot in RAM for buttery-smooth 120fps responsiveness.
- A background Smart Memory Governor in `src-tauri/src/memory.rs` wakes every 25 seconds and only executes `K32EmptyWorkingSet` if the working set exceeds 38.5 MB, preventing over-aggressive page flushing during interactive sessions.
- Manual optimization via System Tray or Settings triggers a clean working set trim down to the ~16.4 MB baseline.
- WebAudio oscillators must be lazily activated and closed/suspended when idle to avoid continuous audio thread allocations.
