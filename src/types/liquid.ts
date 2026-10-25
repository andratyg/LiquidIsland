/**
 * LiquidIsland OS - Strict TypeScript Contract (AI Consistency Lock)
 * Single Source of Truth for Phases 1–10.
 *
 * DO NOT mutate or introduce conflicting types.
 */

export type IslandState =
  | 'bezel-line'        // 136px x 6px
  | 'eyes'              // 168px x 40px (Companion Idle)
  | 'compact'           // 184px x 40px (Default idle pill)
  | 'toast'             // 325px x 64px (Notification banner)
  | 'expanded'          // 432px x 174px (Active slide dashboard)
  | 'expanded-lyrics';  // 595px x 174px (Extended dual-column lyrics dashboard)

export type LiquidTheme = 'dark' | 'light';

export type CompanionMode = 'slime' | 'cat' | 'eyes' | 'off';

export type TaskbarMode = 'A' | 'B' | 'C';

/**
 * Slide Indices for the Expanded Dashboard:
 * 0: Music + Lyrics (Features #1 & #2)
 * 1: Pomodoro Focus Timer (Feature #6)
 * 2: Water Hydration Reminder (Feature #7)
 * 3: Quick Shelf / Clipboard Manager (Feature #3)
 * 4: Daily Todo List (Feature #8)
 */
export type SlideIndex = 0 | 1 | 2 | 3 | 4;

export interface IslandDimensions {
  width: number;
  height: number;
}

export const ISLAND_DIMENSIONS: Record<IslandState, IslandDimensions> = {
  'bezel-line': { width: 136, height: 6 },
  'eyes': { width: 168, height: 40 },
  'compact': { width: 184, height: 40 },
  'toast': { width: 340, height: 64 },
  'expanded': { width: 432, height: 174 },
  'expanded-lyrics': { width: 595, height: 174 },
};

export interface ShelfFileItem {
  id: string;
  name: string;
  size: number | string;
  formattedSize?: string;
  type: string;
  previewUrl?: string;
  timestamp: string;
  isCompressed?: boolean;
  originalSize?: number;
  originalFormattedSize?: string;
  content?: string;
}

export interface TodoTaskItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt?: number;
  timestamp?: string;
}

export type ToastType = 'airbuds' | 'battery' | 'charging' | 'unplugged' | 'hud' | 'desktop-switch' | 'window-pin';

export type BatteryStatus = 'charging' | 'unplugged' | 'low' | 'guard' | 'normal';

export interface ToastPayload {
  type: ToastType;
  title: string;
  subtitle: string;
  value?: number;               // 0–100 or metric
  percent?: number;             // Battery / Device %
  icon?: 'airbuds' | 'battery' | 'charging' | 'unplugged' | 'low' | 'guard' | 'volume' | 'brightness' | 'mic' | 'desktop' | 'pin';
  hudType?: 'volume' | 'brightness' | 'mic';
  hudValue?: number;            // 0–100
  isMicMuted?: boolean;
  direction?: 'left' | 'right';
  batteryStatus?: BatteryStatus;
  pinnedTitle?: string;
  isPinned?: boolean;
}

export interface HardwareToastPayload {
  kind: 'charging' | 'unplugged' | 'bluetooth' | string;
  percent: number;
  title: string;
  subtitle: string;
  device_name?: string | null;
}

export interface SystemSettings {
  islandEnabled: boolean;
  islandState: IslandState;
  activeSlide: SlideIndex;
  lyricsOpen: boolean;
  dualSubtitleEnabled: boolean; // Indonesian lyrics translation toggle
  theme: LiquidTheme;
  companionMode: CompanionMode;
  companionColor: string;
  autoAccessories: boolean;
  enableOptionalLofi: boolean;
  enableSfx: boolean;
  selectedMonitor: number;
  taskbarMode: TaskbarMode;

  // Phase 3 Extensions (backward compatible)
  volume: number;              // 0–100 (Default: 75)
  brightness: number;          // 0–100 (Default: 80)
  isAudioPlaying: boolean;      // True when waveform visualizer is active
  playbackTime?: number;        // Track playback timestamp in seconds (Default: 193)
  duration?: number;            // Total track duration in seconds (Default: 256)

  // Refinement Phase 2 Extensions: Real Windows System Media (Spotify, YouTube, etc.)
  mediaTitle?: string;
  mediaArtist?: string;
  mediaAlbum?: string;
  mediaSourceApp?: string;     // 'Spotify' | 'YouTube' | 'YouTube Music' | 'Apple Music' | 'Windows Media'
  mediaDuration?: number;
  mediaPosition?: number;
  mediaIsPlaying?: boolean;
  mediaThumbnail?: string | null;
  hasSystemMedia?: boolean;

  // Phase 4 Extensions (backward compatible)
  isPomodoroRunning: boolean;   // True when focus timer is active (triggers focus glasses)

  // Phase 6 Extensions (backward compatible)
  pomodoroActive?: boolean;     // Alias/sync with isPomodoroRunning
  pomodoroMode?: 'focus' | 'break'; // 'focus' (25m) or 'break' (5m)
  pomodoroSecondsLeft?: number; // Current remaining seconds
  pomodoroTotalSeconds?: number;// Total cycle duration in seconds
  lofiAmbientSound?: 'off' | 'rain' | 'lofi-pad' | 'white-noise';
  waterIntakeLiters?: number;   // Daily water intake in Liters (e.g. 1.5)
  waterGoalLiters?: number;     // Daily water goal in Liters (e.g. 1.5)
  waterReminderActive?: boolean;// Hourly hydration notification toggle
  waterHourlyBars?: number[];   // 8 hourly consumption values in ml

  // Phase 7 Extensions (backward compatible)
  shelfFiles?: ShelfFileItem[];
  todoTasks?: TodoTaskItem[];

  // Phase 8 Extensions (backward compatible)
  toastPayload?: ToastPayload | null;
  isMicMuted?: boolean;         // True when microphone is muted
  batteryLevel?: number;        // 0–100 (Default: 70)
  isCharging?: boolean;         // True when charging
  batteryStatus?: BatteryStatus;// 'charging' | 'low' | 'guard' | 'normal'
  autoFullscreenStealth?: boolean; // Auto-stealth to bezel-line in fullscreen apps

  // Phase 9 Extensions (MacBook Spotlight & Port Watcher)
  spotlightOpen?: boolean;
  spotlightActiveTab?: 'omni' | 'clipboard' | 'ports' | 'scratchpad';

  // Phase 10 Extensions (backward compatible)
  privacyBlurEnabled?: boolean;          // Boss Key (Ctrl + Alt + B)
  nightEyeCareEnabled?: boolean;         // Warm blue-light filter
  companionSensitivity?: 'playful' | 'calm'; // Companion behavior sensitivity
  showTaskbarDock?: boolean;             // Show/hide bottom liquid glass taskbar dock
  isWindowMaximizedSimulated?: boolean;  // For Taskbar Option C adaptive morphing

  // Stage 2 Extensions (Fluid Tab-Switch & Workspace Activity Morph)
  workspaceActivity?: WorkspaceActivityPayload | null;
}

export interface WorkspaceActivityPayload {
  kind: 'tab-switch' | 'app-switch' | 'desktop-switch';
  app_name: string;
  tab_title: string;
  direction?: 'left' | 'right';
  accent_color: string;
  timestamp?: number;
}

export interface RunningAppInfo {
  hwnd: number;
  title: string;
  process_name: string;
  is_focused: boolean;
  icon_hint: string;
}

export interface ClipboardSnippetItem {
  id: string;
  content: string;
  kind: 'text' | 'code' | 'color' | 'image';
  pinned: boolean;
  timestamp: string;
}

export interface DevPortInfo {
  port: number;
  pid: number;
  process_name: string;
  active: boolean;
}

export interface LiveLyricLine {
  time: number;
  text: string;
  textId?: string;
}

export interface SystemMediaPayload {
  title: string;
  artist: string;
  album_title: string;
  is_playing: boolean;
  position_secs: number;
  duration_secs: number;
  source_app: string;
  thumbnail_base64?: string | null;
  has_media: boolean;
}
