# 40MB EDITION — STAGE 3 OF 3 IMPLEMENTATION PLAN: 3D PERSPECTIVE ALT+TAB / TAB SWITCHER CAROUSEL & SPATIAL VIRTUAL DESKTOP PANORAMA

> **Status:** APPROVED & IN EXECUTION  
> **Target RAM Budget:** $\le 40.0\text{ MB}$ High-Fluidity Tier (GPU-accelerated 120fps CSS 3D transforms)  
> **Key Capabilities:** Win32 Alt+Tab & Ctrl+Tab Interceptor, Enriched 5-App Payload with Base64 Icons, VisionOS 3D CoverFlow Stage Deck, Spatial Virtual Desktop Panorama with Spring Physics, Full-Screen Synchronized Aurora Waves.

---

## 1. ARCHITECTURE & SPECIFICATION MATRIX

| Component | File Path | Scope of Enhancements |
| :--- | :--- | :--- |
| **Win32 Hotkey & Window Hook Engine** | `src-tauri/src/window_hooks.rs` | 1. Intercept `Alt + Tab` (`VK_MENU` + `VK_TAB`) & `Ctrl + Tab` (`VK_CONTROL` + `VK_TAB`).<br>2. On any `app-switch`, `tab-switch`, or `desktop-switch`, query top 5 visible running apps via `crate::taskbar::get_running_apps()` and embed inside `recent_apps` payload.<br>3. Enrich `WorkspaceActivityPayload` struct. |
| **Types & State Store** | `src/types/liquid.ts`<br>`src/store/useSystemStore.ts` | 1. Add `recent_apps?: RunningAppInfo[]` to `WorkspaceActivityPayload`.<br>2. Store `recent_apps` in `workspaceActivity` state in `useSystemStore.ts`. |
| **VisionOS 3D CoverFlow & Panorama Overlay** | `src/components/WorkspaceSwitcherOverlay.tsx` | 1. Floating $540\text{px} \times 148\text{px}$ **3D Liquid Glass Stage Deck** (`perspective: 1200px`, `transform-style: preserve-3d`, `backdrop-filter: blur(42px)`).<br>2. **3D CoverFlow Cards:** Center card `translateZ(36px) scale(1.08)` with $48\times 48\text{px}$ icon & slot-machine text transitions; flanking cards angled at $\pm 24^\circ$ (`rotateY(\pm 24deg)`, `opacity: 0.55`).<br>3. **Spatial 3D Virtual Desktop Panorama:** 3 miniature frosted-glass monitor workspaces sliding with spring physics (`stiffness: 360, damping: 24`, `rotateY(\pm 12deg)`). |
| **Top Island Synchronized Wave & Aurora** | `src/components/IslandShell.tsx`<br>`src/App.tsx` | 1. Mount `WorkspaceSwitcherOverlay` in `src/App.tsx`.<br>2. Elastic liquid stretch on top `IslandShell` (`scaleX: 1.14`, `scaleY: 0.90`).<br>3. Screen-width top bezel aurora light sweep (`#38bdf8` to `#a855f7`) on `desktop-switch`. |
| **Bottom Taskbar Dock Neon Rim Wave** | `src/components/TaskbarPreviewDock.tsx` | Synchronize traveling neon rim wave across the dock container on `workspace-activity` and full-width bottom aurora glow sweep on `desktop-switch`. |
| **Hardware CSS Shaders** | `src/styles/liquid-glass.css` | 3D perspective styles (`preserve-3d`, `translateZ`, `rotateY`, `perspective: 1200px`, GPU specular highlights). |

---

## 2. DETAILED IMPLEMENTATION STEPS

### Step 1: Rust Backend Hook Enrichment (`src-tauri/src/window_hooks.rs`)
1. Extend `WorkspaceActivityPayload`:
   ```rust
   #[derive(Serialize, Deserialize, Clone, Debug)]
   pub struct WorkspaceActivityPayload {
       pub kind: String, // "tab-switch" | "app-switch" | "desktop-switch"
       pub app_name: String,
       pub tab_title: String,
       pub direction: Option<String>,
       pub accent_color: String,
       pub recent_apps: Option<Vec<crate::taskbar::RunningAppInfo>>,
   }
   ```
2. In `start_workspace_activity_listener`:
   - Add state tracking for `last_alt_tab_down` and `last_ctrl_tab_down`.
   - When `Alt + Tab` is pressed (`is_key_down(VK_MENU as i32)` and `is_key_down(0x09)`):
     - Query `crate::taskbar::get_running_apps()`.
     - Grab top 5 apps: `let top5: Vec<_> = apps.into_iter().take(5).collect()`.
     - Read active foreground window title to parse clean tab and app name.
     - Emit `"workspace-activity"` with `kind: "app-switch"` and `recent_apps: Some(top5)`.
   - When `Ctrl + Tab` is pressed (`is_key_down(VK_CONTROL as i32)` and `is_key_down(0x09)`):
     - Emit `"workspace-activity"` with `kind: "tab-switch"` and `recent_apps: Some(top5)`.
   - In window polling loop (Case 1 `tab-switch` and Case 2 `app-switch`):
     - Include `recent_apps: Some(top5)` in emitted payload.
   - In Case 3 `desktop-switch`:
     - Include `recent_apps: Some(top5)` in emitted payload.

### Step 2: Frontend Types & Zustand Store
1. In `src/types/liquid.ts`:
   - Add `recent_apps?: RunningAppInfo[];` to `WorkspaceActivityPayload`.
2. In `src/store/useSystemStore.ts`:
   - Verify `triggerWorkspaceActivity` preserves `recent_apps`.

### Step 3: VisionOS 3D CoverFlow & Panorama in `WorkspaceSwitcherOverlay.tsx`
1. Re-architect `WorkspaceSwitcherOverlay.tsx`:
   - Container deck: `540px × 148px`, `borderRadius: 32px`, `background: rgba(10, 12, 20, 0.94)`, `backdropFilter: blur(42px) saturate(210%)`, `boxShadow: 0 32px 80px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.25)`.
   - 3D Perspective Context: `perspective: '1200px'`, `transformStyle: 'preserve-3d'`.
   - **View A: 3D CoverFlow App & Tab Switcher (`isTabOrAppSwitch`):**
     - Map over 3 to 5 apps from `workspaceActivity.recent_apps` (or fallback).
     - Find active index (focused app or index 1/center).
     - Active Card:
       - `transform: translateZ(36px) scale(1.08)`
       - $48\times 48\text{px}$ crisp icon with radial glow aura matching `accentColor`.
       - Dual-line text with vertical slot-machine transition:
         - Line 1: Tab title (truncated at 280px).
         - Line 2: App name & category badge.
     - Flanking Cards:
       - Left: `rotateY(24deg) translateX(-18px) scale(0.84)`, `opacity: 0.55`.
       - Right: `rotateY(-24deg) translateX(18px) scale(0.84)`, `opacity: 0.55`.
   - **View B: Spatial 3D Virtual Desktop Panorama (`isDesktopSwitch`):**
     - 3 monitor cards (`Workspace 1`, `Workspace 2`, `Workspace 3`).
     - Motion container with spring physics:
       - `initial={{ x: direction === 'right' ? 70 : -70, rotateY: direction === 'right' ? 14 : -14, opacity: 0 }}`
       - `animate={{ x: 0, rotateY: 0, opacity: 1 }}`
       - `transition={{ type: 'spring', stiffness: 360, damping: 24 }}`
     - Active monitor card has illuminated bezel, desktop wallpaper preview gradient, active badge with glowing dot.

### Step 4: Full-Screen Aurora Sweeps & Mount in `src/App.tsx`
1. Import and mount `<WorkspaceSwitcherOverlay />` in `src/App.tsx`.
2. Add full-width screen-edge aurora light sweeps:
   - Top screen bezel aurora sweep during `desktop-switch`.
   - Synchronized top `IslandShell` liquid stretch (`scaleX: [1, 1.14, 0.96, 1.02, 1]`).
3. In `src/components/TaskbarPreviewDock.tsx`:
   - Enhance the traveling neon rim wave to traverse the entire dock and show bottom aurora glow on `desktop-switch`.

### Step 5: Verification & Quality Assurance
1. Compile backend: `cargo check --manifest-path src-tauri/Cargo.toml`.
2. Typecheck frontend: `npx tsc --noEmit`.
3. Production build: `npm run build`.
4. Verify memory constraints ($\le 40.0\text{ MB}$).
