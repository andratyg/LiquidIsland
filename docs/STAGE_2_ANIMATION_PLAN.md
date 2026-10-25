# Stage 2 Implementation Plan: Fluid Tab-Switch & Virtual Desktop Liquid Morph Animation Engine

## Executive Overview
Stage 2 introduces real-time detection of foreground tab switches (Chrome, Edge, Brave, Firefox, VS Code, Cursor, Antigravity), application switches, and Windows Virtual Desktop switches (`Ctrl + Win + Left/Right`). It pairs this backend detection with Apple-grade directional liquid morph physics in the Notch Shell (`scaleX`/`scaleY` droplet stretch, directional `x`/`skewX` swoosh, and traveling specular rim highlights) and a 1.4-second transient context micro-pill in the Notch center readout.

---

## 1. Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Rust Tauri Backend                       │
│  window_hooks.rs: Background Polling Thread (200ms)         │
│  - GetForegroundWindow() + GetWindowTextW()                 │
│  - GetWindowThreadProcessId() (Ignore LiquidIsland PIDs)    │
│  - Case 1: Tab-Switch (same HWND, changed title)            │
│  - Case 2: App-Switch (changed HWND)                        │
│  - Case 3: Desktop-Switch (Ctrl + Win + Left/Right)         │
│  - App Name & Accent Color extraction                       │
└──────────────────────────────┬──────────────────────────────┘
                               │
            Tauri Event: "workspace-activity"
            { kind, app_name, tab_title, direction, accent_color }
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    React Frontend State                     │
│  useSystemStore.ts / systemStore:                           │
│  - triggerWorkspaceActivity(payload)                        │
│  - auto-clears / glides back after 1.4s                     │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
┌──────────────▼─────────────┐ ┌──────────────▼──────────────┐
│      IslandShell.tsx       │ │  CompactView.tsx / Stage    │
│  - Tab switch:             │ │  - 1.4s Slot-Machine Morph: │
│    scaleX [1, 1.12, 0.97, 1]│ │    glowing app dot + clean │
│    scaleY [1, 0.92, 1.03, 1]│ │    Tab/App title           │
│    traveling specular sweep│ │  - Glides back smoothly to  │
│  - Desktop switch:         │ │    Clock / Lyrics / Pet     │
│    asymmetric swoosh x/skew│ │                             │
│    cyan/indigo edge trail  │ │                             │
└────────────────────────────┘ └─────────────────────────────┘
```

---

## 2. Technical Specifications

### Component A: Dual-Trigger Windows Activity Detector (`src-tauri/src/window_hooks.rs`)
1. **Background Polling Loop (200ms)**:
   - Queries `GetForegroundWindow()`.
   - Obtains PID with `GetWindowThreadProcessId(hwnd, &mut pid)` and ignores `pid == std::process::id()` (LiquidIsland overlay and taskbar).
   - Reads window title via `GetWindowTextW`.
   - Checks `GetAsyncKeyState` for `VK_CONTROL`, `VK_LWIN`/`VK_RWIN`, and `VK_LEFT`/`VK_RIGHT`:
     - If both `Ctrl` and `Win` are down and `VK_LEFT` or `VK_RIGHT` was pressed, emits `kind: "desktop-switch"` with `direction: "left"` or `"right"`, debounced so holding the keys does not spam.
   - Compares current `hwnd` and `title` against `last_hwnd` and `last_title`:
     - **Tab Switch**: `hwnd == last_hwnd && title != last_title`. Cleans noise suffixes, extracts active tab title, resolves app name and accent color, and emits `kind: "tab-switch"`.
     - **App Switch**: `hwnd != last_hwnd && !title.is_empty()`. Extracts app name, title, accent color, and emits `kind: "app-switch"`.
2. **App Name & Accent Color Parser**:
   - Chrome (`#4285f4`), Edge (`#0078d7`), Brave (`#fb542b`), Firefox (`#ff7139`), VS Code (`#007acc`), Cursor (`#8b5cf6`), Antigravity (`#6366f1`), Spotify (`#22c55e`), YouTube (`#ef4444`), Terminal (`#4ade80`), Explorer (`#f59e0b`).
3. **Registration in `src-tauri/src/lib.rs`**:
   - Spawns `window_hooks::start_workspace_activity_listener(window.clone())` inside `setup()`.

---

### Component B: State Store Integration (`src/types/liquid.ts` & `src/store/useSystemStore.ts`)
1. **Types**:
   ```typescript
   export interface WorkspaceActivityPayload {
     kind: 'tab-switch' | 'app-switch' | 'desktop-switch';
     app_name: string;
     tab_title: string;
     direction?: 'left' | 'right';
     accent_color: string;
     timestamp?: number;
   }
   ```
2. **Store Action**:
   - `triggerWorkspaceActivity(payload)`: Sets active `workspaceActivity` with a monotonic timestamp.
   - Clears after 1400ms via `setTimeout`, notifying subscribers to glide back.

---

### Component C: Signature Liquid Physics & Specular Highlight (`src/components/IslandShell.tsx` & `src/styles/liquid-glass.css`)
1. **Framer Motion Animations**:
   - **Tab Switch Droplet Stretch**:
     - `scaleX`: `[1, 1.12, 0.97, 1]`
     - `scaleY`: `[1, 0.92, 1.03, 1]`
     - `transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] }`
   - **Desktop Switch Directional Swoosh**:
     - Right: `x: [0, -18, 6, 0]`, `skewX: [0, -8, 3, 0]`
     - Left: `x: [0, 18, -6, 0]`, `skewX: [0, 8, -3, 0]`
     - `transition: { duration: 0.50, ease: [0.22, 1, 0.36, 1] }`
2. **CSS Specular & Glow Effects**:
   - `.liquid-rim-sweep`: A thin travelling highlight sweep that glides across the top rim on tab switches.
   - `.liquid-edge-trail-left` / `.liquid-edge-trail-right`: Cyan/indigo glow trail on virtual desktop switches.

---

### Component D: Transient 1.4-Second Context Micro-Pill (`src/components/CompactView.tsx` & `src/components/companions/CompanionStage.tsx`)
1. **Morph Presentation**:
   - While in `compact` or `eyes` mode, if `workspaceActivity` is active (< 1.4s old):
     - Renders a glowing accent dot (`accent_color`, `box-shadow: 0 0 8px ${accent_color}`)
     - Displays `app_name • tab_title` with smooth vertical slot-machine entry (`initial: { y: 8, opacity: 0 }`, `animate: { y: 0, opacity: 1 }`, `exit: { y: -8, opacity: 0 }`).
   - Automatically glides back to the normal clock/lyrics readout once the 1.4s timer elapses.

---

## 3. Verification Plan
1. **Rust Verification**: `cargo check --manifest-path src-tauri/Cargo.toml` (0 warnings).
2. **TypeScript Compilation**: `npx tsc --noEmit` (0 errors).
3. **Vite Bundle Build**: `npm run build` (successful production asset output).
4. **Dimension Lock Compliance**: Verification against `ARCHITECTURE_LOCK.md`.
