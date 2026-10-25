# Phase 9 Implementation Plan: MacBook-Style Liquid Spotlight Search (Alt+Space), Smart Clipboard & Pinned Snippet Manager (Feature #3) & Dev Port Watcher

## Executive Summary
Phase 9 delivers the **MacBook-Style Liquid Glass Spotlight Search Overlay (`Alt + Space`)**, **Feature #3: Smart Clipboard & Pinned Snippet Manager**, **Localhost Dev Port Watcher (`:3000`, `:5173`, `:8080`, `:1420`, `:4000`, `:8000`)**, and the **Quick Developer Scratchpad & Screen-Snip-to-Shelf Engine** for LiquidIsland OS.

Adhering strictly to `ARCHITECTURE_LOCK.md`, this phase introduces:
1. **Global `Alt + Space` Hotkey & Fluid Spring Dropdown Choreography**:
   - A floating `620px` wide liquid glass spotlight container smoothly descending beneath the top bezel upon `Alt + Space` or clicking the 🔍 search icon.
   - Dynamic overlay window height expansion via Tauri IPC (`window.set_size` / `adjust_overlay_window_size`): smoothly expands window height from `220px` to `560px` when Spotlight is active so the `620px` glass panel is never clipped on the Windows desktop, reverting to `220px` when dismissed.
   - Dual Liquid Glass theme adaptation (`.theme-dark` obsidian glass & `.theme-light` quartz crystal) powered by the 12 locked CSS variables.
2. **Tab 1: Omni Search, Math Calculator, Island Commands & `?` AI Helper**:
   - **Instant Math Calculator**: Real-time evaluation of mathematical expressions (e.g., `1450 * 1.11`, `2^10`, `sqrt(144)`) rendering formatted results (`= 1,609.5`) with 1-click copy.
   - **Island Command Runner**: Direct execution of system commands (`slime`, `cat`, `eyes`, `dark`, `light`, `pomo`, `water`, `shelf`, `todo`, `trim`) on `Enter`.
   - **`?` AI Developer Quick-Reference**: Instant developer cheat sheets and technical guidance cards with code copy triggers.
3. **Tab 2 — Feature #3: Smart Clipboard & Pinned Snippet Manager**:
   - Backed by `ClipboardSnippetItem[]` persisted in `localStorage` under `liquidisland_clipboard_snippets_v1`.
   - **Real-Time Search & Category Filters**: Instant fuzzy search across text, code, and `#HEX` color codes.
   - **Automatic Kind & Color Swatch Detection**: Regex detection for color codes (`#HEX`, `rgb()`, `hsl()`) rendering interactive live color swatches; monospaced syntax highlighting for code snippets.
   - **Permanent Pin / Lock System (`📌`)**: Pinned items remain locked in a dedicated top section, immune to eviction.
   - **One-Click Actions**: "+ New Snippet" creation input, 1-click clipboard copy (`playGlassPop()`), and 1-click "Send to Shelf" linking directly to Slide 3.
4. **Tab 3: Localhost Dev Port Watcher**:
   - Native Rust port scanner querying active TCP development ports (`3000`, `5173`, `8080`, `1420`, `4000`, `8000`) using `netstat -ano -p tcp` with PID and process name resolution (`node.exe`, `vite.exe`, `cargo.exe`, `python.exe`).
   - Browser preview mock fallback for instant zero-error web development.
   - Process termination via `kill_dev_port(pid)`.
   - 1-click "Open in Browser" (`http://localhost:<port>`).
5. **Tab 4: Quick Developer Scratchpad & Screen-Snip to Shelf**:
   - Persistent auto-saving markdown/code scratchpad in `localStorage`.
   - "📸 Snip Screen to Shelf" capturing an instant visual snapshot card directly into Slide 3 (Shelf).

---

## 1. Architecture & Component Hierarchy

```
d:\LiquidIsland\
├── docs/
│   ├── ARCHITECTURE_LOCK.md
│   ├── PHASE_1_PLAN.md ... PHASE_8_PLAN.md
│   └── PHASE_9_PLAN.md                      # [THIS DOCUMENT] Phase 9 Implementation Plan
├── src-tauri/
│   ├── Cargo.toml                           # Preserved Tauri v2 & windows-sys dependencies
│   └── src/
│       ├── lib.rs                           # Registered scan_active_dev_ports, kill_dev_port, set_window_size
│       ├── window_manager.rs                # Dynamic set_window_size command for unclipped modal expansion
│       └── clipboard_ports.rs               # [NEW] Port scanner, process PID inspector & process killer
├── src/
│   ├── types/
│   │   └── liquid.ts                        # Preserved contracts + DevPortInfo & SystemSettings updates
│   ├── store/
│   │   └── useSystemStore.ts                # Spotlight state, active tab, shelf sync helpers
│   ├── utils/
│   │   ├── sfx.ts                           # Audio feedback synthesis
│   │   ├── mathEvaluator.ts                 # [NEW] Safe mathematical expression parser & formatter
│   │   └── imageConverter.ts                # Fix unused param warning & canvas helpers
│   ├── styles/
│   │   └── liquid-glass.css                 # 620px Spotlight modal glass styling, swatches, active dots
│   ├── components/
│   │   ├── SpotlightModal.tsx               # [NEW] Master 620px Floating Liquid Spotlight Dialog
│   │   ├── CompactView.tsx                  # 🔍 Search icon trigger for Spotlight
│   │   ├── ExpandedContainer.tsx            # Header 🔍 search trigger & slide management
│   │   └── slides/
│   │       └── ShelfSlide.tsx               # Connected to shelf items emitted by Spotlight
│   └── App.tsx                              # Global Alt+Space hotkey listener, window resize coordinator
```

---

## 2. Technical Specifications

### 2.1 Native Rust Port Scanner & Process Killer (`src-tauri/src/clipboard_ports.rs`)
- **Data Contract**:
  ```rust
  #[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
  pub struct DevPortInfo {
      pub port: u16,
      pub pid: u32,
      pub process_name: String,
      pub active: bool,
  }
  ```
- **Port Inspection Algorithm (`scan_active_dev_ports`)**:
  - Target ports: `[3000, 5173, 8080, 1420, 4000, 8000]`.
  - Probes ports on `127.0.0.1`.
  - On Windows, executes `netstat -ano -p tcp` to obtain the binding PID for each active port in state `LISTENING`.
  - Resolves process names using `tasklist /fi "PID eq <pid>" /fo csv /nh` or OpenProcess query.
  - Returns a vector of `DevPortInfo` structs.
- **Process Termination (`kill_dev_port`)**:
  - Takes `pid: u32`.
  - Executes `taskkill /F /T /PID <pid>` or `TerminateProcess`, returning `true` on successful termination.
- **Dynamic Window Resize (`set_window_size`)**:
  - In `src-tauri/src/window_manager.rs`, exposes:
    ```rust
    #[tauri::command]
    pub fn set_window_size(window: Window, width: u32, height: u32) -> Result<(), String> {
        window.set_size(tauri::Size::Logical(tauri::LogicalSize {
            width: width as f64,
            height: height as f64,
        })).map_err(|e| e.to_string())
    }
    ```
  - When Spotlight opens: window expands to `640px × 560px`.
  - When Spotlight closes: window restores to `640px × 220px`.

### 2.2 Global `Alt + Space` Hotkey & Spring Choreography
- Global listener in `App.tsx`:
  - Listens for `e.altKey && (e.code === 'Space' || e.key === ' ')`.
  - Intercepts and executes `systemStore.toggleSpotlight()`.
  - Listens for `Escape` to close Spotlight when open.
- Click triggers:
  - 🔍 icon placed in `CompactView.tsx` right section and `ExpandedContainer.tsx` top header.
  - Spotlight toggle button in the Dev Diagnostics Toolbar.
- Motion choreography:
  - Framer motion spring: `initial={{ opacity: 0, y: -24, scale: 0.96 }}`, `animate={{ opacity: 1, y: 0, scale: 1 }}`, `exit={{ opacity: 0, y: -20, scale: 0.96 }}`, `transition={{ type: 'spring', stiffness: 450, damping: 32 }}`.
  - Centered horizontally, width strictly `620px`.

### 2.3 Tab 1 — Omni Search, Math Calculator, Island Commands & `?` AI Helper
1. **Instant Math Calculator**:
   - Regular expression tests if input is a valid mathematical expression (e.g. `^[\d\.\+\-\*\/\^\(\)\%\s\,]+$` with operators, or functions `sqrt`, `sin`, `cos`, `log`).
   - Safely evaluates expression without `eval()`: replaces `^` with `**`, tokenizes and computes value.
   - Formats result using `Intl.NumberFormat` (e.g. `1450 * 1.11` ➔ `= 1,609.5`).
   - Features a 1-click "Copy Result" button with `playGlassPop()`.
2. **Island Command Runner**:
   - Matches keywords:
     - `slime` ➔ switches companion to Slime
     - `cat` ➔ switches companion to Shadow Cat
     - `eyes` ➔ switches companion to Cyber-Eyes
     - `dark` ➔ sets dark theme
     - `light` ➔ sets light theme
     - `pomo` ➔ switches to Slide 1 and starts/toggles Pomodoro
     - `water` ➔ switches to Slide 2
     - `shelf` ➔ switches to Slide 3
     - `todo` ➔ switches to Slide 4
     - `trim` ➔ triggers RAM trimmer
     - `compact` ➔ collapses to compact pill
     - `bezel` ➔ collapses to bezel line
   - Pressing `Enter` executes the top matched command instantly, provides audio feedback, and automatically closes Spotlight.
3. **`? <question>` Instant AI Quick-Reference**:
   - Queries starting with `?` display a dedicated developer cheat sheet card.
   - Includes curated solutions for common developer tasks:
     - Git: `? git undo commit`, `? git squash`, `? git reset head`
     - CSS: `? flex center`, `? grid layout`, `? glassmorphism`
     - Docker: `? docker prune`, `? docker run`
     - TypeScript/Rust: `? typescript generics`, `? rust closure`, `? regex email`
     - HTTP: `? http 418`, `? http 404`, `? status codes`
   - Dynamically synthesizes code snippets with syntax styling and 1-click copy for any arbitrary query.

### 2.4 Tab 2 — Feature #3: Smart Clipboard & Pinned Snippet Manager
- **Storage**: Persisted in `localStorage` (`liquidisland_clipboard_snippets_v1`).
- **Initial Seed Snippets**:
  - Code: `const [active, setActive] = useState(false);`
  - Color: `#10b981` (Emerald), `#3b82f6` (Sapphire Blue), `#a855f7` (Violet Glow)
  - Text: `git commit -m "feat: liquid glass dynamic island"`
  - Code: `fn trim_ram_working_set() -> f64`
- **Instant Search & Filter Bar**:
  - Search input filters items by text matching.
  - Filter pills: `All`, `📌 Pinned`, `Code`, `Color`, `Text`.
- **Automatic Badge & Color Detection**:
  - Color detection: Matches `#HEX` (3, 6, 8 hex digits), `rgb(...)`, or `hsl(...)`. Renders an interactive live color swatch preview alongside the hex code.
  - Code detection: Matches language keywords (`const`, `function`, `class`, `import`, `fn`, `pub`, `def`, `SELECT`, `<div>`, etc.). Renders monospaced syntax card.
  - Text detection: Standard text badge.
- **Permanent Pin / Lock System (`📌`)**:
  - Clicking 📌 toggles item pinning.
  - Pinned items are locked at the top under `"📌 Pinned Snippets"` and protected against eviction.
- **Snippet Creation & Actions**:
  - `+ New Snippet` input allows adding custom snippets on the fly.
  - 1-click `"Copy"` copies snippet to system clipboard with `playGlassPop()`.
  - 1-click `"Send to Shelf"` sends the snippet to Slide 3 (Shelf) items in `localStorage` (`liquidisland_shelf_items_v1`).

### 2.5 Tab 3 — Localhost Dev Port Watcher
- Monitored ports: `3000`, `5173`, `8080`, `1420`, `4000`, `8000`.
- In Tauri: invokes `scan_active_dev_ports`.
- In Browser Preview: returns instant mock state with Vite (5173) and Node (3000) active.
- Card details:
  - Live status pulse: Green pulsing dot for `Active`, gray dot for `Idle`.
  - Port badge: `http://localhost:5173` (Vite / LiquidIsland).
  - Process badge: `PID 1420 • node.exe`.
  - Actions:
    - `"Open"` button: opens URL in browser (`window.open`).
    - `"Kill Port"` button: invokes `kill_dev_port(pid)` with audio confirmation.
    - Manual `"Refresh"` button with rotating icon.

### 2.6 Tab 4 — Quick Developer Scratchpad & Screen-Snip to Shelf
- Auto-saving markdown/code scratchpad persisted under `liquidisland_scratchpad_v1`.
- Clean monospaced liquid glass textarea with word and character counts.
- Action: `"📸 Snip Screen to Shelf"`:
  - Captures a rich snapshot card with timestamp, title, and preview.
  - Directly adds the snip to Slide 3 (Shelf) items in `localStorage`.
  - Plays `playGlassPop()` and triggers a confirmation banner.

---

## 3. Strict State & RAM Working Set Preservation (~8–10 MB)
- When Spotlight is closed, modal contents are completely unmounted via Framer Motion's `<AnimatePresence>`.
- Port polling interval is suspended while Spotlight is closed.
- Zero external image or audio assets; all UI elements use SVG icons and WebAudio oscillators.
- Main window size safely expands and restores without layout stutter.

---

## 4. Implementation Steps & Verification Plan
1. **Rust Backend (`src-tauri/`)**:
   - Implement `clipboard_ports.rs` with `scan_active_dev_ports` and `kill_dev_port`.
   - Implement `set_window_size` in `window_manager.rs`.
   - Register commands in `src-tauri/src/lib.rs`.
2. **TypeScript Contracts & Store Updates**:
   - Synchronize `SystemSettings` in `src/types/liquid.ts` with all Phase 6-9 extensions.
   - Add Spotlight state and helpers to `src/store/useSystemStore.ts`.
3. **Utilities**:
   - Implement `src/utils/mathEvaluator.ts` for safe instant calculations.
   - Fix unused parameter in `src/utils/imageConverter.ts`.
4. **Spotlight UI Component (`src/components/SpotlightModal.tsx`)**:
   - Build 620px floating Liquid Glass container with 4 tabs.
   - Implement Omni Search, Math Calculator, Island Commands, and AI Quick-Ref.
   - Implement Smart Clipboard & Pinned Snippet Manager.
   - Implement Dev Port Watcher with Open and Kill actions.
   - Implement Quick Scratchpad and "📸 Snip Screen to Shelf".
5. **Shelf Integration (`src/components/slides/ShelfSlide.tsx`)**:
   - Connect Slide 3 to display items sent from Spotlight.
6. **Main App Integration (`src/App.tsx`)**:
   - Register global `Alt + Space` hotkey listener.
   - Add dynamic window resizing on Spotlight open/close.
   - Mount `SpotlightModal` with glass backdrop.
   - Add 🔍 trigger icons in header and compact views.
7. **Verification**:
   - Run `npx tsc --noEmit` and `cargo check` to ensure zero compilation errors.
   - Test `Alt + Space` toggle, math evaluation, commands, pinning, and port watcher.
