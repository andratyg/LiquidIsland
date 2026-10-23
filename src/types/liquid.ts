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
  'toast': { width: 325, height: 64 },
  'expanded': { width: 432, height: 174 },
  'expanded-lyrics': { width: 595, height: 174 },
};

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

  // Phase 4 Extensions (backward compatible)
  isPomodoroRunning: boolean;   // True when focus timer is active (triggers focus glasses)
}

export interface ClipboardSnippetItem {
  id: string;
  content: string;
  kind: 'text' | 'code' | 'color' | 'image';
  pinned: boolean;
  timestamp: string;
}
