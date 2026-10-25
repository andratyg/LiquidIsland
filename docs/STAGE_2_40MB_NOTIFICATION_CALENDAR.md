# 40MB Edition — Stage 2 Implementation Plan: Luxury Dual-Card Notification Center & Calendar Hub

**Version:** 1.0.0  
**Phase:** 40MB Edition — Stage 2 of 3  
**Target:** Luxury Dual-Card Notification Center, Do Not Disturb, Snipping Tool Feed & Interactive Calendar + Focus Launcher  
**Status:** In Progress  

---

## 1. Architectural Overview & Objectives

In Stage 2 of the 40MB Edition, we replace the single plain calendar flyout in the bottom Taskbar with a stunning, dual-card stacked **Liquid Glass Notification & Calendar Hub (`src/components/NotificationCalendarHub.tsx`)** that aligns cleanly above the bottom-right taskbar capsule when clicking the Clock / Date.

### Key Capabilities:
1. **Window Hit-Box Expansion (`src-tauri/src/taskbar.rs`):**
   - Expand the bottom transparent `"taskbar-dock"` window height from `520px` to `700px` (scaled by DPI).
   - Update the Win32 hit-test loop in `taskbar.rs` so that when `is_flyout` is true, the cursor zone covers `screen_h - 700px` to `screen_h + 20px`, allowing interaction across the entire 660px stacked dual-card layout without clipping or click-through loss.

2. **Top Card — Liquid Notification Center (`width: 356px`, `border-radius: 26px`):**
   - **Glass Finish:** Deep obsidian frosted glass (`rgba(10, 10, 14, 0.90)`), `backdrop-filter: blur(40px) saturate(190%)`, specular inner rim (`inset 0 1px 0 rgba(255,255,255,0.18)`), subtle cyan/indigo ambient glow.
   - **Header Row:**
     - Left: `"Notifications"` title with bold typography + unread counter badge pill.
     - Right: Interactive glowing cyan-blue **Do Not Disturb (`zZ` bell) toggle button** (`#38bdf8` active glow) + `"Clear all"` frosted glass pill button.
   - **Do Not Disturb Banner:**
     - When DND is active, renders an inner glass card with the `zZ` bell icon, `"Do not disturb is on"`, explanatory subtitle, and a clickable `"Notification settings"` link opening the Settings modal.
   - **Interactive Notification Cards:**
     - Real-time notification feed stored in `useSystemStore`:
       - Seeded default: `"Snipping Tool"` — `"Screenshot copied to clipboard and saved"` at `16:35` with preview thumbnail.
       - Whenever a screenshot is captured, a new notification is dynamically added to the list with the real thumbnail preview!
       - Clicking a Snipping Tool notification opens the screenshot directly in the Dynamic Island **Quick Shelf** (`activeSlide = 3`)!
       - Dismiss button (`X`) on each card.

3. **Bottom Card — Interactive Liquid Calendar & Focus Launcher (`width: 356px`, `border-radius: 26px`, `margin-top: 10px`):**
   - **Top Collapsible Date Header:**
     - Full today date readout (e.g. `"Sunday, 25 October"`).
     - Rounded square collapse toggle button (`ChevronDown` / `ChevronUp`) that smoothly animates the calendar body open or folded shut with spring physics.
   - **Month Switcher Header:**
     - Displays formatted month & year (e.g. `"October 2026"`).
     - Working `▲` (prev month) and `▼` (next month) navigation buttons.
     - `"Today"` jump pill when browsing other months.
   - **7-Column Calendar Grid (`Su Mo Tu We Th Fr Sa`):**
     - Tabular day cells with previous/next month days dimmed (`#52525b`).
     - Today's date highlighted in a glowing cyan-blue pill/circle (`linear-gradient(135deg, #38bdf8, #0284c7)` with `box-shadow: 0 0 16px rgba(56, 189, 248, 0.55)`).
     - Interactive date selection.
   - **Bottom Focus Session Launcher (`[-] 30 mins [+]` & `[▶ Focus]`):**
     - Rounded square `−` button (decrements by 5m, min 5m).
     - Bold `"30 mins"` duration display.
     - Rounded square `+` button (increments by 5m, max 120m).
     - Glowing **`▶ Focus`** pill button on the right.
     - When clicked:
       1. Sets Pomodoro duration to selected minutes (`duration * 60`).
       2. Sets `isPomodoroRunning: true` and `pomodoroActive: true`.
       3. Turns on **Do Not Disturb (`doNotDisturb: true`)**.
       4. Auto-equips `FocusGlasses` on the companion pet via `isPomodoroRunning`.
       5. Synchronizes live countdown progress in both the top Island and the bottom Calendar Hub footer!

---

## 2. File-by-File Implementation Plan

### File 1: `src/types/liquid.ts`
- Define `SystemNotificationItem`:
  ```typescript
  export interface SystemNotificationItem {
    id: string;
    appName: string;
    title: string;
    subtitle: string;
    timestamp: string;
    icon?: 'snipping-tool' | 'system' | 'airbuds' | 'battery' | 'screenshot';
    thumbnail?: string;
    unread: boolean;
    actionType?: 'shelf' | 'settings' | 'slide';
  }
  ```
- Add `doNotDisturb?: boolean; notifications?: SystemNotificationItem[];` to `SystemSettings`.

### File 2: `src/store/useSystemStore.ts`
- Add defaults:
  - `doNotDisturb: false`
  - Seeded initial `notifications`: Snipping Tool screenshot item.
- Add store actions:
  - `setDoNotDisturb(dnd: boolean)`
  - `toggleDoNotDisturb()`
  - `addNotification(notif: SystemNotificationItem)`
  - `removeNotification(id: string)`
  - `clearAllNotifications()`
  - `startFocusSession(durationMinutes: number)`

### File 3: `src-tauri/src/taskbar.rs`
- Expand `height_px` in `spawn_or_update_taskbar_window` from `520.0` to `700.0`.
- Update `start_dock_hit_test_loop`: when `is_flyout` is true, check `pt.y >= (screen_h - 700)`.
- Re-check `poll_dock_autohide_state`.

### File 4: `src/components/NotificationCalendarHub.tsx` (New Component)
- Full implementation of the dual-card stacked layout:
  - Top Card: Header with DND toggle (`zZ` bell icon), DND active banner, notification feed list, Snipping tool card with thumbnail and click-to-shelf.
  - Bottom Card: Collapsible date header, month navigation, 7-column calendar matrix, focus duration adjuster (`[-] 30 mins [+]`), and glowing `▶ Focus` button with live countdown bar.

### File 5: `src/components/TaskbarPreviewDock.tsx`
- Replace inline flyout 5 with `<NotificationCalendarHub>`.
- Wire `activeFlyout === 'calendar'` to open `NotificationCalendarHub`.
- Ensure click outside and backdrop management operate smoothly.

### File 6: `src/App.tsx`
- Listen for `"screenshot-captured"` and also push a new `SystemNotificationItem` to `systemStore` so newly captured screenshots immediately appear in the Notification Center!

---

## 3. Verification & Quality Gates
1. `npx tsc --noEmit` passes with 0 errors.
2. `cargo check --manifest-path src-tauri/Cargo.toml` passes with 0 warnings.
3. `npm run build` generates production bundle cleanly.
