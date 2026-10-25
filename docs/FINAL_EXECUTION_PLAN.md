# FINAL EXECUTION PLAN: CAPSLOCK TOAST, SILENT LIQUID TAB-SWITCH & RELIABLE AUTO-HIDE (40 MB RAM TIER)

## 1. OBJECTIVES & ARCHITECTURE OVERVIEW
This plan delivers the final polish and functional additions for LiquidIsland under the 40.0 MB RAM Tier:
1. **Real-Time CapsLock State Popup Toast:**
   - Detect Win32 hardware `VK_CAPITAL` toggle transitions in `window_hooks.rs` via `GetKeyState(0x14)` and `GetAsyncKeyState(0x14)`.
   - Broadcast `"capslock-change"` with boolean toggle state `{ is_on: bool }`.
   - Render a dedicated luxury Dynamic Island alert in `ToastView.tsx` (`340px × 64px` rounded obsidian pill):
     - Glowing keyboard/lock SVG indicator (`🔠` / `🔒`).
     - Clear headline `"Caps Lock On"` / `"Caps Lock Off"` with subtitle `"Uppercase letters enabled"` / `"Standard lowercase typing"`.
     - Active indicator badge pill with glowing LED status dot.
     - Soft glass pop SFX (`playGlassPop()`) and auto-dismiss after `2.2s`.
2. **Silent Liquid Motion Tab-Switch (Zero Floating Text Badges):**
   - Eliminate all floating tab-title badges and popups from the bottom Taskbar dock (`TaskbarPreviewDock.tsx`) and overlay (`WorkspaceSwitcherOverlay.tsx`).
   - Top Dynamic Island (`IslandShell.tsx`): Trigger a high-fluidity **Liquid Glass Ripple Wave** across the shell with a pulsing color aura matching the active app's `accent_color`.
   - Bottom Taskbar Dock (`TaskbarPreviewDock.tsx`): Trigger a sweeping **neon aurora light streak** across the dock capsule plus a subtle pulsing color glow around the focused app icon.
3. **100% Reliable Taskbar Auto-Hide & Pin Responsiveness:**
   - Ensure `isDockPinned` defaults to `false` (via fresh migration key `liquid_dock_pinned_v3`).
   - Guarantee the dock slides down smoothly into hiding when cursor exits into applications, displaying the 3px glow hint line at the bottom screen edge.

---

## 2. DETAILED IMPLEMENTATION BREAKDOWN

### Component 1: Win32 CapsLock Hook (`src-tauri/src/window_hooks.rs`)
- Add `GetKeyState` and `VK_CAPITAL` (`0x14`) to `windows_sys::Win32::UI::Input::KeyboardAndMouse`.
- Track `last_caps_on = (GetKeyState(0x14) & 0x0001) != 0` and `last_caps_key_down`.
- In the 25ms loop:
  - Check `is_key_down(VK_CAPITAL as i32)` and current toggle state `(GetKeyState(VK_CAPITAL as i32) & 0x0001) != 0`.
  - When the hardware key is pressed or software toggle bit changes, wait 15ms for OS state commitment, sample the new toggle state, update `last_caps_on`, and emit `"capslock-change"` payload `CapsLockPayload { is_on: current_caps_on }`.

### Component 2: Frontend Store & Event Listener (`src/store/useSystemStore.ts` & `src/App.tsx`)
- In `src/types/liquid.ts`:
  - Add `'capslock'` to `ToastType`.
  - Add `isCapsLockOn?: boolean` to `ToastPayload`.
- In `src/store/useSystemStore.ts`:
  - Add `triggerCapsLockToast(isOn: boolean)` method:
    - Plays `playGlassPop()`.
    - Triggers toast with `type: 'capslock'`, auto-dismiss timeout `2200ms` (2.2s).
  - Migrate `dockPinned` default to `false` via `'liquid_dock_pinned_v3'`.
- In `src/App.tsx`:
  - Subscribe to `"capslock-change"` and dispatch `systemStore.triggerCapsLockToast(event.payload.is_on)`.

### Component 3: Luxury CapsLock Toast View (`src/components/ToastView.tsx`)
- Render dedicated `'capslock'` view:
  - **Left Slot (34px × 34px):** Glowing rounded container with custom illuminated SVG lock and uppercase `A` emblem. Glowing cyan `#38bdf8` when ON; subtle obsidian slate `#94a3b8` when OFF.
  - **Center Slot:**
    - Title: `"Caps Lock On"` or `"Caps Lock Off"`.
    - Subtitle: `"Uppercase letters enabled"` or `"Standard lowercase typing"`.
  - **Right Slot:** Sleek indicator pill:
    - ON: `CAPS` badge with glowing neon LED dot (`#38bdf8`, `box-shadow: 0 0 8px #38bdf8`).
    - OFF: `OFF` badge with muted dot (`#64748b`).

### Component 4: Silent Liquid Motion Tab-Switch (`IslandShell.tsx` & `TaskbarPreviewDock.tsx`)
- In `src/components/TaskbarPreviewDock.tsx`:
  - Remove the floating tab title popup badge (`isThisAppActive && workspaceActivity` popup above app icons).
  - When `isTabSwitch` occurs:
    - Render a sweeping neon aurora light streak across the dock top edge: `linear-gradient(90deg, transparent 0%, accent_color 40%, #ffffff 50%, #a855f7 60%, transparent 100%)`.
    - Apply a subtle pulsing aura around the active app icon container (`boxShadow: 0 0 16px accent_color, inset 0 0 10px accent_color`).
- In `src/components/IslandShell.tsx`:
  - Elevate the tab-switch animation to a high-fluidity Liquid Glass Ripple Wave:
    - Ripple wave element traveling across the shell with specular highlights and `accentColor` aura.
    - Outer shell glow `boxShadow` pulsing with `accentColor` for 600ms.

### Component 5: Taskbar Auto-Hide Reliability Verification
- Ensure `isDockPinned` defaults strictly to `false`.
- Ensure `effectiveDockVisible` in `TaskbarPreviewDock.tsx` responds immediately to `dock-hover-state` and `dock-visibility` emitted by Rust.
- Verify sliding down animation (`y: 72, opacity: 0`) and bottom 3px glow hint line (`#dock-hidden-indicator`).

---

## 3. VERIFICATION & QUALITY GATES
1. `cargo check --manifest-path src-tauri/Cargo.toml` $\rightarrow$ Must finish with 0 warnings, 0 errors.
2. `npx tsc --noEmit` $\rightarrow$ Must finish with 0 TypeScript errors.
3. `npm run build` $\rightarrow$ Vite production bundle compilation success.
4. Verify memory ceiling $\le 40.0\text{ MB}$.
