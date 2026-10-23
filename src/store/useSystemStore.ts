import { useSyncExternalStore } from 'react';
import {
  SystemSettings,
  IslandState,
  LiquidTheme,
  CompanionMode,
  TaskbarMode,
  SlideIndex
} from '../types/liquid';

export const STORAGE_KEY = 'liquidisland_os_state_v1';

export const DEFAULT_SETTINGS: SystemSettings = {
  islandEnabled: true,
  islandState: 'compact',
  activeSlide: 0,
  lyricsOpen: false,
  dualSubtitleEnabled: true,
  theme: 'dark',
  companionMode: 'slime',
  companionColor: '#10b981',
  autoAccessories: true,
  enableOptionalLofi: true,
  enableSfx: true,
  selectedMonitor: 0,
  taskbarMode: 'B',
};

function loadInitialSettings(): SystemSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);

    const validStates: IslandState[] = ['bezel-line', 'eyes', 'compact', 'toast', 'expanded', 'expanded-lyrics'];
    const validThemes: LiquidTheme[] = ['dark', 'light'];
    const validCompanionModes: CompanionMode[] = ['slime', 'cat', 'eyes', 'off'];
    const validTaskbarModes: TaskbarMode[] = ['A', 'B', 'C'];
    const validSlideIndices: SlideIndex[] = [0, 1, 2, 3, 4];

    return {
      islandEnabled: typeof parsed.islandEnabled === 'boolean' ? parsed.islandEnabled : DEFAULT_SETTINGS.islandEnabled,
      islandState: validStates.includes(parsed.islandState) ? parsed.islandState : DEFAULT_SETTINGS.islandState,
      activeSlide: validSlideIndices.includes(parsed.activeSlide) ? parsed.activeSlide : DEFAULT_SETTINGS.activeSlide,
      lyricsOpen: typeof parsed.lyricsOpen === 'boolean' ? parsed.lyricsOpen : DEFAULT_SETTINGS.lyricsOpen,
      dualSubtitleEnabled: typeof parsed.dualSubtitleEnabled === 'boolean' ? parsed.dualSubtitleEnabled : DEFAULT_SETTINGS.dualSubtitleEnabled,
      theme: validThemes.includes(parsed.theme) ? parsed.theme : DEFAULT_SETTINGS.theme,
      companionMode: validCompanionModes.includes(parsed.companionMode) ? parsed.companionMode : DEFAULT_SETTINGS.companionMode,
      companionColor: typeof parsed.companionColor === 'string' ? parsed.companionColor : DEFAULT_SETTINGS.companionColor,
      autoAccessories: typeof parsed.autoAccessories === 'boolean' ? parsed.autoAccessories : DEFAULT_SETTINGS.autoAccessories,
      enableOptionalLofi: typeof parsed.enableOptionalLofi === 'boolean' ? parsed.enableOptionalLofi : DEFAULT_SETTINGS.enableOptionalLofi,
      enableSfx: typeof parsed.enableSfx === 'boolean' ? parsed.enableSfx : DEFAULT_SETTINGS.enableSfx,
      selectedMonitor: typeof parsed.selectedMonitor === 'number' ? parsed.selectedMonitor : DEFAULT_SETTINGS.selectedMonitor,
      taskbarMode: validTaskbarModes.includes(parsed.taskbarMode) ? parsed.taskbarMode : DEFAULT_SETTINGS.taskbarMode,
    };
  } catch (err) {
    console.error('[LiquidIsland Store] Failed to parse localStorage state:', err);
    return DEFAULT_SETTINGS;
  }
}

let currentSettings: SystemSettings = loadInitialSettings();
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function saveSettings(updated: SystemSettings) {
  currentSettings = updated;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('[LiquidIsland Store] Failed to persist state:', err);
  }
  emitChange();
}

export const systemStore = {
  getState(): SystemSettings {
    return currentSettings;
  },
  setState(partial: Partial<SystemSettings>) {
    saveSettings({ ...currentSettings, ...partial });
  },
  setIslandEnabled(islandEnabled: boolean) {
    saveSettings({ ...currentSettings, islandEnabled });
  },
  setIslandState(islandState: IslandState) {
    saveSettings({ ...currentSettings, islandState });
  },
  setActiveSlide(activeSlide: SlideIndex) {
    saveSettings({ ...currentSettings, activeSlide });
  },
  setLyricsOpen(lyricsOpen: boolean) {
    saveSettings({ ...currentSettings, lyricsOpen });
  },
  setDualSubtitleEnabled(dualSubtitleEnabled: boolean) {
    saveSettings({ ...currentSettings, dualSubtitleEnabled });
  },
  setTheme(theme: LiquidTheme) {
    saveSettings({ ...currentSettings, theme });
  },
  toggleTheme() {
    saveSettings({
      ...currentSettings,
      theme: currentSettings.theme === 'dark' ? 'light' : 'dark',
    });
  },
  setCompanionMode(companionMode: CompanionMode) {
    saveSettings({ ...currentSettings, companionMode });
  },
  setCompanionColor(companionColor: string) {
    saveSettings({ ...currentSettings, companionColor });
  },
  setAutoAccessories(autoAccessories: boolean) {
    saveSettings({ ...currentSettings, autoAccessories });
  },
  setEnableOptionalLofi(enableOptionalLofi: boolean) {
    saveSettings({ ...currentSettings, enableOptionalLofi });
  },
  setEnableSfx(enableSfx: boolean) {
    saveSettings({ ...currentSettings, enableSfx });
  },
  setSelectedMonitor(selectedMonitor: number) {
    saveSettings({ ...currentSettings, selectedMonitor });
  },
  setTaskbarMode(taskbarMode: TaskbarMode) {
    saveSettings({ ...currentSettings, taskbarMode });
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export function useSystemStore<T = SystemSettings>(selector?: (state: SystemSettings) => T): T {
  const state = useSyncExternalStore(
    systemStore.subscribe,
    systemStore.getState,
    () => DEFAULT_SETTINGS
  );
  return selector ? selector(state) : (state as unknown as T);
}
