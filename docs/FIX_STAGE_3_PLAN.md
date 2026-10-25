# FIX STAGE 3 OF 4: REAL INSTALLED APP SEARCH & LAUNCHER IN ALT+S SPOTLIGHT + MACBOOK-STYLE LAUNCHPAD

## OVERVIEW
Fix Stage 3 solves the native taskbar conflict caused by Windows Start menu emulation (`VK_LWIN`) and elevates LiquidIsland's application discovery and launching capabilities to match macOS Spotlight and Launchpad:
1. **Real Windows Installed Applications Scanner & Launcher (`src-tauri/src/app_launcher.rs`):**
   - Scans system and user Start Menu programs (`%ProgramData%\Microsoft\Windows\Start Menu\Programs` and `%APPDATA%\Microsoft\Windows\Start Menu\Programs`).
   - Extracts clean display names, executable/shortcut paths, and 32x32 crisp base64 icons via `DrawIconEx`.
   - Caches discovered apps in memory for sub-millisecond retrieval.
   - Provides `launch_installed_app` command using `CREATE_NO_WINDOW` without terminal flashing.
2. **Search & Open Any App via `Alt + S` Spotlight (`src/components/SpotlightModal.tsx`):**
   - Automatically searches and displays matching installed applications at the top of Spotlight's results.
   - Shows app icon, `"Application"` or `"Running"` badge, and `"Press Enter to Open"` action.
   - Pressing `Enter` or clicking an app result launches or switches to it immediately and closes Spotlight.
3. **MacBook-Style "Liquid Launchpad" (`src/components/LaunchpadModal.tsx` & `TaskbarPreviewDock.tsx`):**
   - Stops simulating `VK_LWIN` on the Dock Start button, permanently eliminating the pop-up of the native Windows taskbar and Start Menu.
   - Replaces it with a luxurious `600px × 440px` centered Liquid Glass Launchpad:
     - Top pill search bar (`Search Applications...`).
     - 5-column grid of favorite & installed applications with large 48x48px squircle icons and smooth hover magnification (`scale(1.12)`).
     - Running Now strip + system power actions (*Lock Screen*, *Sleep*, *Task Manager*, *Settings*).

---

## ARCHITECTURE & TECHNICAL DESIGN

### 1. Rust Application Scanner & Launcher (`src-tauri/src/app_launcher.rs`)
- **Data Model:**
  ```rust
  #[derive(Serialize, Deserialize, Clone, Debug)]
  pub struct InstalledAppEntry {
      pub id: String,
      pub name: String,
      pub path: String,
      pub icon_data: Option<String>,
      pub category: String, // "System", "Development", "Media", "Utility", "Application"
      pub is_running: bool,
  }
  ```
- **Directory Walking:**
  - Recursively inspects:
    1. `C:\ProgramData\Microsoft\Windows\Start Menu\Programs`
    2. `C:\Users\<user>\AppData\Roaming\Microsoft\Windows\Start Menu\Programs`
  - Filters out uninstaller shortcuts (`unins*`, `*uninstall*`), `.url` web shortcuts, and documentation links.
  - Adds core built-in Windows applications:
    - `calc.exe` -> "Calculator"
    - `notepad.exe` -> "Notepad"
    - `explorer.exe` -> "File Explorer"
    - `taskmgr.exe` -> "Task Manager"
    - `control.exe` -> "Control Panel"
    - `wt.exe` / `powershell.exe` -> "Windows Terminal"
    - `ms-settings:` -> "Windows Settings"
- **Icon Extraction:**
  - Uses `taskbar::extract_file_icon_base64` (backed by Win32 `DrawIconEx` and `png::Encoder`).
  - Cached in an in-memory `Mutex<Option<Vec<InstalledAppEntry>>>`.
- **Process Launching (`launch_installed_app`):**
  - Executes `cmd.exe /C start "" "<path>"` with Win32 process creation flag `CREATE_NO_WINDOW = 0x08000000`.

---

### 2. Spotlight App Integration (`src/components/SpotlightModal.tsx`)
- Fetches `get_installed_apps()` on mount and caches in component state.
- In Omni search (`activeTab === 'omni'`), when query is typed:
  - Filters installed apps by query:
    `matchedApps = installedApps.filter(app => app.name.toLowerCase().includes(q) || app.category.toLowerCase().includes(q))`
  - Displays matched applications right at the top of the search view before commands.
  - Pressing `Enter` or clicking an app triggers `launch_installed_app(app.path)` (or `focus_or_toggle_app` if already running) and closes Spotlight.

---

### 3. MacBook-Style Liquid Launchpad (`src/components/LaunchpadModal.tsx`)
- Modal dimensions: `600px × 440px`, `border-radius: 28px`.
- Frosted glass finish: `backdrop-filter: blur(36px) saturate(210%)`, `background: rgba(15, 23, 42, 0.92)`.
- Features:
  1. **Search Bar:** Pill input with real-time filtering across apps.
  2. **Category Filter Tabs:** `All`, `Productivity`, `Development`, `Media`, `System`.
  3. **5-Column App Grid:**
     - 48x48px squircle icons with gradient gloss.
     - Hover spring scaling (`scale(1.12)`).
     - Running status indicator dot.
     - 1-click launch.
  4. **Running Now Strip & Quick Actions:**
     - Quick glance at active apps.
     - 4 action buttons: *Lock Screen* (`rundll32.exe user32.dll,LockWorkStation`), *Sleep*, *Task Manager* (`taskmgr.exe`), *Windows Settings* (`ms-settings:`).

---

### 4. Integration in `TaskbarPreviewDock.tsx` and `src/App.tsx`
- In `TaskbarPreviewDock.tsx`:
  - Start button `onClick` replaced: calls `systemStore.toggleLaunchpad()` and emits `'open-launchpad'`.
  - Simulating `VK_LWIN` is removed.
- In `src/types/liquid.ts` & `src/store/useSystemStore.ts`:
  - Add `launchpadOpen: boolean` and `toggleLaunchpad()` action.
- In `src/App.tsx`:
  - Listens for `'open-launchpad'` event.
  - Expands window size when `launchpadOpen` is true (`{ width: 720, height: 960 }`).
  - Renders `<LaunchpadModal onClose={() => systemStore.setLaunchpadOpen(false)} />`.

---

## VERIFICATION PLAN
1. `cargo check --manifest-path src-tauri/Cargo.toml`
2. `npx tsc --noEmit`
3. `npm run build`
