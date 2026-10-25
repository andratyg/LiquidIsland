# FIX STAGE 4 OF 4 IMPLEMENTATION PLAN: FULL-SCREEN MACOS-STYLE "LIQUID GLASS STAGE & TAB SWITCHER HUD" (IMAGE 2 UPGRADE)

**Author:** Antigravity Architect  
**Date:** 2026-10-25  
**Version:** 1.0.0  
**Target:** macOS Sonoma/Sequoia-style Liquid Glass Stage HUD for real-time Tab, App, and Virtual Desktop Switching.

---

## 1. Executive Summary & Root Cause Analysis

### 1.1 Context & Problem Statement
- In Image 2, the user demonstrated standard Windows Alt+Tab / Task View (a plain, rigid grey block).
- Previously in LiquidIsland, tab-switch and app-switch feedback was constrained to a minuscule 10.5px text pill directly beneath the Dynamic Island.
- Switching Virtual Desktops (`Ctrl + Win + Left/Right`) showed brief aurora lines but did not present an informative, tangible spatial stage representation.
- The user requested upgrading this into a dedicated, ultra-sleek **macOS Sonoma/Sequoia-style Floating Liquid Glass Stage HUD (`src/components/WorkspaceSwitcherOverlay.tsx`)** that:
  1. Floats right below the Dynamic Island with frosted glass (`380px` × `82px`, `backdrop-filter: blur(32px)`).
  2. For **Tab Switch** and **App Switch**:
     - Large `48×48px` squircle container displaying the real application icon / vector logo with ambient radial glow.
     - Top tracking badge: `"ACTIVE TAB SWITCHED"` or `"WINDOW FOCUSED"`.
     - Sliding title: Clean tab/document title (e.g. `"Gemini - Google Chrome"`, `"LiquidIsland - Antigravity"`).
     - Subtitle: Process name + Active workspace identifier.
     - Right: Mini Command+Tab strip showing recent running apps with the active app highlighted.
  3. For **Virtual Desktop Switch**:
     - Animated 3-desktop stage preview (`[ Desktop 1 ] ➔ [ Desktop 2 ● ] ➔ [ Desktop 3 ]`) with directional liquid wave (`x: direction === 'right' ? [45, 0] : [-45, 0]`, `scale: [0.92, 1]`).
     - Synchronized sweeping neon edge light on top bezel and bottom Taskbar dock.
  4. Non-intrusive lifecycle:
     - 100% click-through (`pointer-events: none`) so it never captures clicks or typing focus.
     - Automatically smoothly scales and fades out after `1.25s` (`1250ms`).

---

## 2. Architecture & Component Interaction Flow

```
+--------------------------------------------------------------------------+
| Win32 Hooks (window_hooks.rs)                                            |
| - Polling GetForegroundWindow() & GetWindowTextW() every 200ms           |
| - Detects Ctrl+Win+Left/Right for Virtual Desktop Switch                 |
| - Emits: "workspace-activity" { kind, app_name, tab_title, direction }  |
+--------------------------------------------------------------------------+
                                    |
                                    v
+--------------------------------------------------------------------------+
| React App & Zustand Store (useSystemStore.ts & App.tsx)                  |
| - Receives "workspace-activity" IPC event                                |
| - Updates store.workspaceActivity with timestamp & 1.25s auto-clear      |
| - Tracks active Virtual Desktop index (1, 2, 3) with directional wrap    |
+--------------------------------------------------------------------------+
         |                                                 |
         v                                                 v
+------------------------------------+    +--------------------------------+
| WorkspaceSwitcherOverlay.tsx       |    | TaskbarPreviewDock.tsx         |
| (Top Window, below Island)         |    | (Bottom Dock Window)           |
| - 380px x 82px Frosted Glass Card  |    | - Sweeping edge neon wave      |
| - 48px App Icon with Radial Glow   |    | - Focused app icon indicator   |
| - Tab Title + Command+Tab strip    |    | - Synchronized desktop sweep   |
| - 3-Desktop Virtual Stage Preview  |    +--------------------------------+
| - 1.25s auto-exit (pointer-events) |
+------------------------------------+
```

---

## 3. Detailed Component Specifications

### 3.1 `WorkspaceSwitcherOverlay.tsx`
- **Location:** `src/components/WorkspaceSwitcherOverlay.tsx`
- **Dimensions & Styling:**
  - Width: `380px`
  - Height: `82px`
  - Position: `position: fixed`, `top: 76px`, `left: 50%`, `transform: translateX(-50%)`
  - Border-radius: `24px`
  - Background: `rgba(10, 10, 14, 0.88)`
  - Backdrop filter: `blur(32px) saturate(190%)`
  - Border: `1px solid ${accent_color}44`
  - Box shadow: `0 20px 50px rgba(0, 0, 0, 0.65), 0 0 24px ${accent_color}25, inset 0 1px 0 rgba(255, 255, 255, 0.15)`
  - `pointerEvents: 'none'` (100% click-through)
  - `zIndex: 99990`
- **View A: Tab & App Switch Mode (`tab-switch` | `app-switch`):**
  - **Left Section (52px width):**
    - `48×48px` squircle container (`borderRadius: 14px`) with ambient radial glow:
      `background: radial-gradient(circle, ${accent_color}35 0%, transparent 70%)`
    - High-res icon: checks `runningApps` / `installedApps` for real `.exe` base64 PNG, or renders high-fidelity vector icons (`Chrome`, `Edge`, `VS Code`, `Terminal`, `Spotify`, `Discord`, etc.).
  - **Center Section (Flex 1, minWidth 0):**
    - Category / Status badge:
      `"ACTIVE TAB SWITCHED"` or `"WINDOW FOCUSED"` in `9.5px` uppercase tracking with pulsing accent dot.
    - Main Tab Title:
      Bold `12.5px` title with marquee/truncation, rendering clean page or document name.
    - Subtitle:
      `10px` muted label displaying application process + `"• Workspace " + desktopIndex`.
  - **Right Section (Mini Command+Tab Strip):**
    - Compact rounded capsule (`padding: 3px 6px`, `borderRadius: 9999px`, `background: rgba(255, 255, 255, 0.06)`).
    - Renders miniature 18×18px icons of the 3-4 most recent open apps, with the currently active window highlighted with a glowing accent ring!
- **View B: Virtual Desktop Switch Mode (`desktop-switch`):**
  - Displays a 3-Desktop Stage:
    - Card 1: `Desktop 1`
    - Card 2: `Desktop 2`
    - Card 3: `Desktop 3`
  - Active card highlighted with glowing cyan border, blue radial backdrop, and glowing status dot.
  - Motion animation:
    - `initial={{ x: direction === 'right' ? 45 : -45, scale: 0.92, opacity: 0 }}`
    - `animate={{ x: 0, scale: 1, opacity: 1 }}`
    - `exit={{ x: direction === 'right' ? -45 : 45, scale: 0.92, opacity: 0 }}`
    - `transition={{ type: 'spring', stiffness: 460, damping: 28 }}`
- **Lifecycle & Timer:**
  - Auto-fades and scales out after 1.25s (1250ms).

### 3.2 Dynamic Island & App Integration (`src/App.tsx` & `src/components/IslandShell.tsx`)
- Mount `<WorkspaceSwitcherOverlay />` inside `App.tsx` so it renders without being clipped by the Island's bounding box.
- Remove redundant duplicate micro-pill from `IslandShell.tsx` while preserving the rim sweep and aurora wave on the island itself.
- Update `useSystemStore.ts` `triggerWorkspaceActivity` timeout from 1400ms to 1250ms (1.25s).
- Expand default top window height slightly from `210px` to `240px` in `updateWindowSize` when modals are closed to give ample room for the 82px floating stage HUD and its drop-shadow.

---

## 4. Implementation Steps & Verification Checklist

| Step | Action | Files | Verification |
|---|---|---|---|
| **1** | Write Stage 4 Architecture Plan | `docs/FIX_STAGE_4_PLAN.md` | File written |
| **2** | Update `useSystemStore.ts` lifecycle timer | `src/store/useSystemStore.ts` | 1250ms timeout |
| **3** | Build `WorkspaceSwitcherOverlay.tsx` | `src/components/WorkspaceSwitcherOverlay.tsx` | Full macOS Stage HUD |
| **4** | Clean up micro-pill in `IslandShell.tsx` | `src/components/IslandShell.tsx` | Delegate to Stage HUD |
| **5** | Integrate into `App.tsx` & adjust window height | `src/App.tsx` | 240px window height |
| **6** | Compiler & Build Verification | `npx tsc`, `cargo check`, `npm run build` | 0 errors |

---
**Status:** Approved for Implementation.
