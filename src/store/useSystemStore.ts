import { useSyncExternalStore } from 'react';
import {
  SystemSettings,
  IslandState,
  LiquidTheme,
  CompanionMode,
  TaskbarMode,
  SlideIndex,
  ToastType,
  ToastPayload,
  BatteryStatus,
  type ShelfFileItem,
  type TodoTaskItem,
  type SystemMediaPayload,
  type WorkspaceActivityPayload,
} from '../types/liquid';
import {
  playAirBudsChime,
  playChargingChime,
  playBatteryLowChime,
  playPinChime,
  playSlideWaveSound,
  playScrollTick,
  playWaterDrop,
  playToggleClick,
  playOvershootChime,
} from '../utils/sfx';

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
  volume: 75,
  brightness: 80,
  isAudioPlaying: true,
  playbackTime: 193,
  duration: 256,
  isPomodoroRunning: false,

  // Refinement Phase 2 media defaults
  mediaTitle: 'Paper Sky',
  mediaArtist: 'Sora & The Clouds',
  mediaAlbum: 'Tokyo Lo-Fi Beats',
  mediaSourceApp: 'Spotify',
  mediaDuration: 256,
  mediaPosition: 193,
  mediaIsPlaying: true,
  mediaThumbnail: null,
  hasSystemMedia: false,

  // Phase 6 defaults
  pomodoroActive: false,
  pomodoroMode: 'focus',
  pomodoroSecondsLeft: 25 * 60,
  pomodoroTotalSeconds: 25 * 60,
  lofiAmbientSound: 'off',
  waterIntakeLiters: 1.5,
  waterGoalLiters: 1.5,
  waterReminderActive: true,
  waterHourlyBars: [150, 200, 250, 300, 200, 150, 250, 0],

  // Phase 8 defaults
  toastPayload: null,
  isMicMuted: false,
  batteryLevel: 70,
  isCharging: false,
  batteryStatus: 'normal',
  autoFullscreenStealth: false,

  // Shelf & Todo defaults
  shelfFiles: [],
  todoTasks: [
    { id: '1', text: 'Liquid Island UI verification', completed: true, createdAt: 1 },
    { id: '2', text: 'AirBuds Pro Sonar Pulse animation', completed: true, createdAt: 2 },
    { id: '3', text: 'Battery Charging & Health Guard HUD', completed: true, createdAt: 3 },
    { id: '4', text: 'Win32 Window Pin (Ctrl+Alt+T)', completed: false, createdAt: 4 },
    { id: '5', text: 'Fullscreen auto-stealth testing', completed: false, createdAt: 5 },
  ],

  // Phase 9 defaults
  spotlightOpen: false,
  spotlightActiveTab: 'omni',

  // Phase 10 defaults
  privacyBlurEnabled: false,
  nightEyeCareEnabled: false,
  companionSensitivity: 'playful',
  showTaskbarDock: false,
  isWindowMaximizedSimulated: false,

  // Stage 2 defaults
  workspaceActivity: null,
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
      volume: typeof parsed.volume === 'number' ? Math.max(0, Math.min(100, parsed.volume)) : DEFAULT_SETTINGS.volume,
      brightness: typeof parsed.brightness === 'number' ? Math.max(0, Math.min(100, parsed.brightness)) : DEFAULT_SETTINGS.brightness,
      isAudioPlaying: typeof parsed.isAudioPlaying === 'boolean' ? parsed.isAudioPlaying : DEFAULT_SETTINGS.isAudioPlaying,
      isPomodoroRunning: typeof parsed.isPomodoroRunning === 'boolean' ? parsed.isPomodoroRunning : DEFAULT_SETTINGS.isPomodoroRunning,

      // Phase 6 settings
      pomodoroActive: typeof parsed.pomodoroActive === 'boolean' ? parsed.pomodoroActive : (typeof parsed.isPomodoroRunning === 'boolean' ? parsed.isPomodoroRunning : false),
      pomodoroMode: parsed.pomodoroMode === 'break' ? 'break' : 'focus',
      pomodoroSecondsLeft: typeof parsed.pomodoroSecondsLeft === 'number' ? parsed.pomodoroSecondsLeft : 25 * 60,
      pomodoroTotalSeconds: typeof parsed.pomodoroTotalSeconds === 'number' ? parsed.pomodoroTotalSeconds : 25 * 60,
      lofiAmbientSound: ['off', 'rain', 'lofi-pad', 'white-noise'].includes(parsed.lofiAmbientSound) ? parsed.lofiAmbientSound : 'off',
      waterIntakeLiters: typeof parsed.waterIntakeLiters === 'number' ? parsed.waterIntakeLiters : 1.5,
      waterGoalLiters: typeof parsed.waterGoalLiters === 'number' ? parsed.waterGoalLiters : 1.5,
      waterReminderActive: typeof parsed.waterReminderActive === 'boolean' ? parsed.waterReminderActive : true,
      waterHourlyBars: Array.isArray(parsed.waterHourlyBars) && parsed.waterHourlyBars.length === 8 ? parsed.waterHourlyBars : [150, 200, 250, 300, 200, 150, 250, 0],

      // Phase 8 settings
      toastPayload: null, // Always start null on fresh boot
      isMicMuted: typeof parsed.isMicMuted === 'boolean' ? parsed.isMicMuted : false,
      batteryLevel: typeof parsed.batteryLevel === 'number' ? Math.max(0, Math.min(100, parsed.batteryLevel)) : 70,
      isCharging: typeof parsed.isCharging === 'boolean' ? parsed.isCharging : false,
      batteryStatus: ['charging', 'low', 'guard', 'normal'].includes(parsed.batteryStatus) ? parsed.batteryStatus : 'normal',
      autoFullscreenStealth: typeof parsed.autoFullscreenStealth === 'boolean' ? parsed.autoFullscreenStealth : false,

      // Shelf & Todo settings
      shelfFiles: Array.isArray(parsed.shelfFiles) ? parsed.shelfFiles : [],
      todoTasks: Array.isArray(parsed.todoTasks) ? parsed.todoTasks : DEFAULT_SETTINGS.todoTasks,

      // Phase 9 settings
      spotlightOpen: false, // always closed on fresh boot
      spotlightActiveTab: ['omni', 'clipboard', 'ports', 'scratchpad'].includes(parsed.spotlightActiveTab)
        ? parsed.spotlightActiveTab
        : 'omni',

      // Phase 10 settings
      privacyBlurEnabled: typeof parsed.privacyBlurEnabled === 'boolean' ? parsed.privacyBlurEnabled : false,
      nightEyeCareEnabled: typeof parsed.nightEyeCareEnabled === 'boolean' ? parsed.nightEyeCareEnabled : false,
      companionSensitivity: parsed.companionSensitivity === 'calm' ? 'calm' : 'playful',
      showTaskbarDock: typeof parsed.showTaskbarDock === 'boolean' ? parsed.showTaskbarDock : false,
      isWindowMaximizedSimulated: typeof parsed.isWindowMaximizedSimulated === 'boolean' ? parsed.isWindowMaximizedSimulated : false,

      // Stage 2: Always start null on fresh boot
      workspaceActivity: null,
    };
  } catch (err) {
    console.error('[LiquidIsland Store] Failed to parse localStorage state:', err);
    return DEFAULT_SETTINGS;
  }
}

let currentSettings: SystemSettings = loadInitialSettings();
const listeners = new Set<() => void>();

let toastTimeoutId: ReturnType<typeof setTimeout> | null = null;
let workspaceActivityTimeoutId: ReturnType<typeof setTimeout> | null = null;
let previousNonToastState: IslandState = 'compact';

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

async function syncToOtherWindows(updated: SystemSettings) {
  try {
    const isTauri =
      typeof window !== 'undefined' &&
      ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
    if (!isTauri) return;
    const { emit } = await import('@tauri-apps/api/event');
    await emit('store-sync', updated);
    await emit('settings-updated', updated);
  } catch {
    // Non-fatal
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
  syncToOtherWindows(updated);
}

// Cross-window localStorage sync listener
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        currentSettings = { ...currentSettings, ...parsed };
        emitChange();
      } catch {
        // Ignore JSON error
      }
    }
  });
}

export const systemStore = {
  syncFromExternal(updates: Partial<SystemSettings>) {
    currentSettings = { ...currentSettings, ...updates };
    emitChange();
  },
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
  toggleIslandEnabled() {
    saveSettings({
      ...currentSettings,
      islandEnabled: !currentSettings.islandEnabled,
    });
  },
  cycleCompanionMode() {
    const modes: CompanionMode[] = ['slime', 'cat', 'eyes', 'off'];
    const currentIndex = modes.indexOf(currentSettings.companionMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    saveSettings({ ...currentSettings, companionMode: nextMode });
  },
  cycleTaskbarMode() {
    const modes: TaskbarMode[] = ['A', 'B', 'C'];
    const currentIndex = modes.indexOf(currentSettings.taskbarMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    saveSettings({ ...currentSettings, taskbarMode: nextMode });
  },
  toggleOptionalLofi() {
    saveSettings({
      ...currentSettings,
      enableOptionalLofi: !currentSettings.enableOptionalLofi,
    });
  },
  toggleExpandedState() {
    const isCurrentlyExpanded =
      currentSettings.islandState === 'expanded' || currentSettings.islandState === 'expanded-lyrics';
    const nextState: IslandState = isCurrentlyExpanded
      ? (currentSettings.companionMode !== 'off' ? 'eyes' : 'compact')
      : (currentSettings.lyricsOpen ? 'expanded-lyrics' : 'expanded');
    saveSettings({ ...currentSettings, islandState: nextState });
  },
  expandIsland() {
    const targetState: IslandState = currentSettings.lyricsOpen ? 'expanded-lyrics' : 'expanded';
    saveSettings({ ...currentSettings, islandState: targetState });
  },
  collapseIsland() {
    const fallbackState: IslandState = currentSettings.companionMode !== 'off' ? 'eyes' : 'compact';
    saveSettings({ ...currentSettings, islandState: fallbackState });
  },
  toggleLyrics() {
    const nextLyricsOpen = !currentSettings.lyricsOpen;
    let nextState = currentSettings.islandState;
    if (currentSettings.islandState === 'expanded' && nextLyricsOpen) {
      nextState = 'expanded-lyrics';
    } else if (currentSettings.islandState === 'expanded-lyrics' && !nextLyricsOpen) {
      nextState = 'expanded';
    }
    saveSettings({
      ...currentSettings,
      lyricsOpen: nextLyricsOpen,
      islandState: nextState,
    });
  },
  toggleDualSubtitle() {
    saveSettings({
      ...currentSettings,
      dualSubtitleEnabled: !currentSettings.dualSubtitleEnabled,
    });
  },
  cycleSlide(delta: 1 | -1) {
    const next = ((currentSettings.activeSlide + delta + 5) % 5) as SlideIndex;
    saveSettings({ ...currentSettings, activeSlide: next });
  },

  // Phase 3 Actions
  setVolume(volumeOrUpdater: number | ((prev: number) => number)) {
    const nextVal = typeof volumeOrUpdater === 'function' ? volumeOrUpdater(currentSettings.volume) : volumeOrUpdater;
    const clamped = Math.max(0, Math.min(100, Math.round(nextVal)));
    saveSettings({ ...currentSettings, volume: clamped });
  },
  setBrightness(brightnessOrUpdater: number | ((prev: number) => number)) {
    const nextVal = typeof brightnessOrUpdater === 'function' ? brightnessOrUpdater(currentSettings.brightness) : brightnessOrUpdater;
    const clamped = Math.max(0, Math.min(100, Math.round(nextVal)));
    saveSettings({ ...currentSettings, brightness: clamped });
  },
  adjustVolume(delta: number) {
    const prev = currentSettings.volume;
    const rawNext = prev + delta;
    const isOvershoot = (prev === 100 && delta > 0) || (prev === 0 && delta < 0);
    const nextVal = Math.max(0, Math.min(100, Math.round(rawNext)));

    if (isOvershoot) {
      playOvershootChime();
    } else {
      playScrollTick();
    }

    saveSettings({ ...currentSettings, volume: nextVal });

    this.triggerToast('hud', {
      hudType: 'volume',
      hudValue: nextVal,
      value: nextVal,
      title: 'Volume',
      subtitle: isOvershoot ? (nextVal === 100 ? '100% MAXIMUM' : '0% MUTED') : `${nextVal}%`,
      isOvershoot,
    });
  },
  adjustBrightness(delta: number) {
    const prev = currentSettings.brightness;
    const rawNext = prev + delta;
    const isOvershoot = (prev === 100 && delta > 0) || (prev === 0 && delta < 0);
    const nextVal = Math.max(0, Math.min(100, Math.round(rawNext)));

    if (isOvershoot) {
      playOvershootChime();
    } else {
      playScrollTick();
    }

    saveSettings({ ...currentSettings, brightness: nextVal });

    this.triggerToast('hud', {
      hudType: 'brightness',
      hudValue: nextVal,
      value: nextVal,
      title: 'Brightness',
      subtitle: isOvershoot ? (nextVal === 100 ? '100% MAXIMUM' : '0% MINIMUM') : `${nextVal}%`,
      isOvershoot,
    });
  },
  toggleMute() {
    const prev = currentSettings.volume;
    let nextVal = 0;
    if (prev === 0) {
      nextVal = (systemStore as any)._lastUnmutedVolume || 50;
    } else {
      (systemStore as any)._lastUnmutedVolume = prev;
      nextVal = 0;
    }

    playToggleClick();
    saveSettings({ ...currentSettings, volume: nextVal });

    this.triggerToast('hud', {
      hudType: 'volume',
      hudValue: nextVal,
      value: nextVal,
      title: 'Volume',
      subtitle: nextVal === 0 ? 'Muted' : `${nextVal}%`,
      isMuted: nextVal === 0,
    });
  },
  setIsAudioPlaying(isAudioPlaying: boolean) {
    saveSettings({ ...currentSettings, isAudioPlaying, mediaIsPlaying: isAudioPlaying });
  },
  toggleAudioPlaying() {
    const nextVal = !currentSettings.isAudioPlaying;
    saveSettings({
      ...currentSettings,
      isAudioPlaying: nextVal,
      mediaIsPlaying: nextVal,
    });
  },
  updateSystemMedia(payload: SystemMediaPayload) {
    const isPlaying = payload.is_playing;
    const pos = payload.position_secs;
    const dur = payload.duration_secs > 0 ? payload.duration_secs : (currentSettings.duration || 256);
    saveSettings({
      ...currentSettings,
      mediaTitle: payload.title || currentSettings.mediaTitle,
      mediaArtist: payload.artist || currentSettings.mediaArtist,
      mediaAlbum: payload.album_title || currentSettings.mediaAlbum,
      mediaSourceApp: payload.source_app || currentSettings.mediaSourceApp,
      mediaIsPlaying: isPlaying,
      isAudioPlaying: isPlaying,
      mediaPosition: pos,
      playbackTime: pos,
      mediaDuration: dur,
      duration: dur,
      mediaThumbnail: payload.thumbnail_base64 !== undefined ? payload.thumbnail_base64 : currentSettings.mediaThumbnail,
      hasSystemMedia: payload.has_media,
    });
  },

  // Phase 4 / Phase 6 Pomodoro Actions
  setIsPomodoroRunning(isPomodoroRunning: boolean) {
    saveSettings({ ...currentSettings, isPomodoroRunning, pomodoroActive: isPomodoroRunning });
  },
  setPomodoroActive(pomodoroActive: boolean) {
    saveSettings({ ...currentSettings, isPomodoroRunning: pomodoroActive, pomodoroActive });
  },
  togglePomodoroRunning() {
    const nextVal = !currentSettings.isPomodoroRunning;
    saveSettings({
      ...currentSettings,
      isPomodoroRunning: nextVal,
      pomodoroActive: nextVal,
    });
  },
  setPomodoroMode(pomodoroMode: 'focus' | 'break') {
    const totalSecs = pomodoroMode === 'focus' ? 25 * 60 : 5 * 60;
    saveSettings({
      ...currentSettings,
      pomodoroMode,
      pomodoroTotalSeconds: totalSecs,
      pomodoroSecondsLeft: totalSecs,
    });
  },
  setPomodoroSecondsLeft(pomodoroSecondsLeft: number) {
    saveSettings({ ...currentSettings, pomodoroSecondsLeft });
  },
  setPomodoroTotalSeconds(pomodoroTotalSeconds: number) {
    saveSettings({ ...currentSettings, pomodoroTotalSeconds });
  },
  setLofiAmbientSound(lofiAmbientSound: 'off' | 'rain' | 'lofi-pad' | 'white-noise') {
    saveSettings({ ...currentSettings, lofiAmbientSound });
  },
  cycleLofiAmbientSound() {
    const modes: ('off' | 'rain' | 'lofi-pad' | 'white-noise')[] = ['off', 'rain', 'lofi-pad', 'white-noise'];
    const curIdx = modes.indexOf(currentSettings.lofiAmbientSound || 'off');
    const nextMode = modes[(curIdx + 1) % modes.length];
    saveSettings({ ...currentSettings, lofiAmbientSound: nextMode });
    return nextMode;
  },

  // Phase 6 Water Actions
  setWaterIntakeLiters(litersOrUpdater: number | ((prev: number) => number)) {
    const prev = currentSettings.waterIntakeLiters ?? 1.5;
    const nextVal = typeof litersOrUpdater === 'function' ? litersOrUpdater(prev) : litersOrUpdater;
    const clamped = Math.max(0, Math.min(10, Math.round(nextVal * 100) / 100));
    saveSettings({ ...currentSettings, waterIntakeLiters: clamped });
  },
  setWaterGoalLiters(waterGoalLiters: number) {
    saveSettings({ ...currentSettings, waterGoalLiters });
  },
  cycleWaterGoal() {
    const goals = [1.5, 2.0, 2.5];
    const curGoal = currentSettings.waterGoalLiters ?? 1.5;
    const curIdx = goals.indexOf(curGoal);
    const nextGoal = goals[(curIdx + 1) % goals.length];
    saveSettings({ ...currentSettings, waterGoalLiters: nextGoal });
    return nextGoal;
  },
  toggleWaterReminder() {
    saveSettings({
      ...currentSettings,
      waterReminderActive: !currentSettings.waterReminderActive,
    });
  },
  addWaterIntake(amountLiters: number = 0.25) {
    const prev = currentSettings.waterIntakeLiters ?? 0;
    const nextVal = Math.round((prev + amountLiters) * 100) / 100;
    const amountMl = Math.round(amountLiters * 1000);

    const currentBars = currentSettings.waterHourlyBars ? [...currentSettings.waterHourlyBars] : [150, 200, 250, 300, 200, 150, 250, 0];
    const lastIdx = currentBars.length - 1;
    currentBars[lastIdx] = Math.min(400, (currentBars[lastIdx] || 0) + amountMl);

    saveSettings({
      ...currentSettings,
      waterIntakeLiters: nextVal,
      waterHourlyBars: currentBars,
    });
  },
  resetWaterIntake() {
    saveSettings({
      ...currentSettings,
      waterIntakeLiters: 0,
      waterHourlyBars: [0, 0, 0, 0, 0, 0, 0, 0],
    });
  },

  // Phase 7 Shelf Actions
  addShelfFile(file: ShelfFileItem) {
    const existing = currentSettings.shelfFiles ?? [];
    saveSettings({
      ...currentSettings,
      shelfFiles: [file, ...existing],
    });
  },
  removeShelfFile(id: string) {
    const existing = currentSettings.shelfFiles ?? [];
    saveSettings({
      ...currentSettings,
      shelfFiles: existing.filter((f) => f.id !== id),
    });
  },
  updateShelfFile(id: string, updates: Partial<ShelfFileItem>) {
    const existing = currentSettings.shelfFiles ?? [];
    saveSettings({
      ...currentSettings,
      shelfFiles: existing.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    });
  },
  clearShelfFiles() {
    saveSettings({
      ...currentSettings,
      shelfFiles: [],
    });
  },
  wakeShelfForDrop() {
    saveSettings({
      ...currentSettings,
      islandState: 'expanded',
      activeSlide: 3,
    });
  },

  // Phase 7 / 8 Todo Actions
  addTodoTask(text: string) {
    const existing = currentSettings.todoTasks ?? [];
    const newTask: TodoTaskItem = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      text,
      completed: false,
      createdAt: Date.now(),
      timestamp: 'Today',
    };
    saveSettings({
      ...currentSettings,
      todoTasks: [newTask, ...existing],
    });
  },
  toggleTodoTask(id: string) {
    const existing = currentSettings.todoTasks ?? [];
    saveSettings({
      ...currentSettings,
      todoTasks: existing.map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t
      ),
    });
  },
  deleteTodoTask(id: string) {
    const existing = currentSettings.todoTasks ?? [];
    saveSettings({
      ...currentSettings,
      todoTasks: existing.filter((t) => t.id !== id),
    });
  },

  // ==========================================================================
  // Phase 8: System Toast Notifications & HUD Actions
  // ==========================================================================

  triggerToast(type: ToastType, payload?: Partial<ToastPayload>) {
    if (currentSettings.islandState !== 'toast') {
      previousNonToastState = currentSettings.islandState;
    }

    if (toastTimeoutId) {
      clearTimeout(toastTimeoutId);
      toastTimeoutId = null;
    }

    let fullPayload: ToastPayload;

    if (type === 'airbuds') {
      playAirBudsChime();
      fullPayload = {
        type: 'airbuds',
        title: payload?.title ?? 'AirBuds Pro',
        subtitle: payload?.subtitle ?? 'Connected - 70%',
        value: payload?.value ?? 70,
        icon: 'airbuds',
        ...payload,
      };
    } else if (type === 'charging') {
      playChargingChime();
      const pct = payload?.percent ?? payload?.value ?? 84;
      fullPayload = {
        type: 'charging',
        title: 'Charging',
        subtitle: 'Charger connected',
        value: pct,
        percent: pct,
        icon: 'charging',
        batteryStatus: 'charging',
        ...payload,
      };
      currentSettings = {
        ...currentSettings,
        batteryLevel: pct,
        isCharging: true,
        batteryStatus: 'charging',
      };
    } else if (type === 'unplugged') {
      playBatteryLowChime();
      const pct = payload?.percent ?? payload?.value ?? 84;
      fullPayload = {
        type: 'unplugged',
        title: 'Charger unplugged',
        subtitle: `${pct}% remaining`,
        value: pct,
        percent: pct,
        icon: 'unplugged',
        batteryStatus: 'unplugged',
        ...payload,
      };
      currentSettings = {
        ...currentSettings,
        batteryLevel: pct,
        isCharging: false,
        batteryStatus: 'unplugged',
      };
    } else if (type === 'battery') {
      const bStatus: BatteryStatus =
        payload?.batteryStatus ??
        (payload?.value !== undefined && payload.value <= 20
          ? 'low'
          : payload?.value === 85
          ? 'guard'
          : 'charging');

      if (bStatus === 'low') {
        playBatteryLowChime();
      } else {
        playChargingChime();
      }

      fullPayload = {
        type: 'battery',
        title:
          payload?.title ??
          (bStatus === 'low'
            ? 'Battery Low 20%'
            : bStatus === 'guard'
            ? 'Charge Limit 85%'
            : 'Charging'),
        subtitle:
          payload?.subtitle ??
          (bStatus === 'low'
            ? 'Connect charger to preserve workflow'
            : bStatus === 'guard'
            ? 'Optimal battery health preserved'
            : 'Fast Charging - 45m until full'),
        value: payload?.value ?? (bStatus === 'low' ? 20 : bStatus === 'guard' ? 85 : 70),
        icon: bStatus === 'low' ? 'low' : bStatus === 'guard' ? 'guard' : 'charging',
        batteryStatus: bStatus,
        ...payload,
      };

      // Also sync store battery settings
      currentSettings = {
        ...currentSettings,
        batteryLevel: fullPayload.value ?? 70,
        isCharging: bStatus === 'charging',
        batteryStatus: bStatus,
      };
    } else if (type === 'hud') {
      playScrollTick();
      const hType = payload?.hudType ?? 'volume';
      const hVal =
        payload?.hudValue ??
        (hType === 'brightness'
          ? currentSettings.brightness
          : currentSettings.volume);

      fullPayload = {
        type: 'hud',
        hudType: hType,
        hudValue: hVal,
        isMicMuted: payload?.isMicMuted ?? currentSettings.isMicMuted,
        title:
          payload?.title ??
          (hType === 'mic'
            ? payload?.isMicMuted
              ? 'Microphone Muted'
              : 'Microphone Active'
            : hType === 'brightness'
            ? 'Brightness'
            : 'Volume'),
        subtitle:
          payload?.subtitle ??
          (hType === 'mic'
            ? payload?.isMicMuted
              ? 'Muted'
              : 'Active'
            : `${hVal}%`),
        value: hVal,
        icon: hType === 'mic' ? 'mic' : hType === 'brightness' ? 'brightness' : 'volume',
        ...payload,
      };
    } else if (type === 'desktop-switch') {
      playSlideWaveSound();
      const dir = payload?.direction ?? 'right';
      fullPayload = {
        type: 'desktop-switch',
        title: payload?.title ?? (dir === 'left' ? 'Desktop 1' : 'Desktop 2'),
        subtitle: payload?.subtitle ?? `Virtual Desktop (${dir === 'left' ? 'Left' : 'Right'})`,
        direction: dir,
        icon: 'desktop',
        ...payload,
      };
    } else if (type === 'window-pin') {
      playPinChime();
      const isPinned = payload?.isPinned ?? true;
      fullPayload = {
        type: 'window-pin',
        title: payload?.title ?? (isPinned ? 'Window Pinned' : 'Window Unpinned'),
        subtitle: payload?.subtitle ?? (payload?.pinnedTitle ?? 'Always-on-Top Active'),
        pinnedTitle: payload?.pinnedTitle,
        isPinned,
        icon: 'pin',
        ...payload,
      };
    } else {
      fullPayload = {
        type: 'airbuds',
        title: 'System Notification',
        subtitle: 'LiquidIsland OS',
        ...payload,
      };
    }

    saveSettings({
      ...currentSettings,
      islandState: 'toast',
      toastPayload: fullPayload,
    });

    const autoRevertMs = (type === 'charging' || type === 'unplugged') ? 3000 : (type === 'hud' ? 2200 : 3200);
    toastTimeoutId = setTimeout(() => {
      systemStore.dismissToast();
    }, autoRevertMs);
  },

  showChargingToast(percent: number = 84) {
    this.triggerToast('charging', { percent, value: percent });
  },

  showUnpluggedToast(percent: number = 84) {
    this.triggerToast('unplugged', { percent, value: percent });
  },

  dismissToast() {
    if (toastTimeoutId) {
      clearTimeout(toastTimeoutId);
      toastTimeoutId = null;
    }
    const fallback =
      previousNonToastState === 'toast'
        ? currentSettings.companionMode !== 'off'
          ? 'eyes'
          : 'compact'
        : previousNonToastState;

    saveSettings({
      ...currentSettings,
      islandState: fallback,
      toastPayload: null,
    });
  },

  toggleMicMute() {
    const nextMicMuted = !currentSettings.isMicMuted;
    saveSettings({
      ...currentSettings,
      isMicMuted: nextMicMuted,
    });
    systemStore.triggerToast('hud', {
      hudType: 'mic',
      isMicMuted: nextMicMuted,
      title: nextMicMuted ? 'Microphone Muted' : 'Microphone Active',
      subtitle: nextMicMuted ? 'Muted' : 'Active (Input Live)',
    });
  },

  setBatteryState(
    batteryLevel: number,
    isCharging: boolean,
    batteryStatus: BatteryStatus = isCharging ? 'charging' : batteryLevel <= 20 ? 'low' : 'normal'
  ) {
    saveSettings({
      ...currentSettings,
      batteryLevel: Math.max(0, Math.min(100, batteryLevel)),
      isCharging,
      batteryStatus,
    });
  },

  setAutoFullscreenStealth(autoFullscreenStealth: boolean) {
    saveSettings({
      ...currentSettings,
      autoFullscreenStealth,
    });
  },

  toggleAutoFullscreenStealth() {
    saveSettings({
      ...currentSettings,
      autoFullscreenStealth: !currentSettings.autoFullscreenStealth,
    });
  },

  triggerVirtualDesktopSwitch(direction: 'left' | 'right') {
    systemStore.triggerToast('desktop-switch', {
      direction,
      title: direction === 'left' ? 'Virtual Desktop 1' : 'Virtual Desktop 2',
      subtitle: `Switched Desktop ${direction === 'left' ? '←' : '→'}`,
    });
  },

  // Stage 2 Workspace Activity Actions
  triggerWorkspaceActivity(payload: WorkspaceActivityPayload) {
    if (workspaceActivityTimeoutId) {
      clearTimeout(workspaceActivityTimeoutId);
      workspaceActivityTimeoutId = null;
    }

    if (payload.kind === 'desktop-switch') {
      playSlideWaveSound();
    }

    saveSettings({
      ...currentSettings,
      workspaceActivity: {
        ...payload,
        timestamp: Date.now(),
      },
    });

    // Transient Context Micro-Pill auto-glides back after 1.4 seconds (1400ms)
    workspaceActivityTimeoutId = setTimeout(() => {
      saveSettings({
        ...currentSettings,
        workspaceActivity: null,
      });
      workspaceActivityTimeoutId = null;
    }, 1400);
  },

  // Phase 9 Spotlight Actions
  setSpotlightOpen(spotlightOpen: boolean) {
    saveSettings({
      ...currentSettings,
      spotlightOpen,
    });
  },
  toggleSpotlight() {
    saveSettings({
      ...currentSettings,
      spotlightOpen: !currentSettings.spotlightOpen,
    });
  },
  setSpotlightActiveTab(spotlightActiveTab: 'omni' | 'clipboard' | 'ports' | 'scratchpad') {
    saveSettings({
      ...currentSettings,
      spotlightActiveTab,
    });
  },

  // Phase 10 Actions
  setPrivacyBlurEnabled(privacyBlurEnabled: boolean) {
    if (privacyBlurEnabled) {
      playWaterDrop();
    } else {
      playToggleClick();
    }
    saveSettings({ ...currentSettings, privacyBlurEnabled });
  },

  togglePrivacyBlur() {
    const next = !currentSettings.privacyBlurEnabled;
    systemStore.setPrivacyBlurEnabled(next);
  },

  setNightEyeCareEnabled(nightEyeCareEnabled: boolean) {
    playToggleClick();
    saveSettings({ ...currentSettings, nightEyeCareEnabled });
  },

  toggleNightEyeCare() {
    const next = !currentSettings.nightEyeCareEnabled;
    systemStore.setNightEyeCareEnabled(next);
  },

  setCompanionSensitivity(companionSensitivity: 'playful' | 'calm') {
    playToggleClick();
    saveSettings({ ...currentSettings, companionSensitivity });
  },

  setShowTaskbarDock(showTaskbarDock: boolean) {
    playToggleClick();
    saveSettings({ ...currentSettings, showTaskbarDock });
  },

  toggleTaskbarDock() {
    const next = !currentSettings.showTaskbarDock;
    systemStore.setShowTaskbarDock(next);
  },

  setIsWindowMaximizedSimulated(isWindowMaximizedSimulated: boolean) {
    playToggleClick();
    saveSettings({ ...currentSettings, isWindowMaximizedSimulated });
  },

  toggleWindowMaximizedSimulated() {
    const next = !currentSettings.isWindowMaximizedSimulated;
    systemStore.setIsWindowMaximizedSimulated(next);
  },

  setPlaybackTime(time: number | ((prev: number) => number)) {
    const current = currentSettings.playbackTime ?? 193;
    const next = typeof time === 'function' ? time(current) : time;
    const dur = currentSettings.duration ?? 256;
    const clamped = next >= dur ? 0 : Math.max(0, next);
    saveSettings({ ...currentSettings, playbackTime: clamped, mediaPosition: clamped });
  },

  tickPlaybackTime() {
    if (!currentSettings.isAudioPlaying) return;
    const current = currentSettings.playbackTime ?? 193;
    const dur = currentSettings.duration ?? 256;
    const next = current + 1 >= dur ? 0 : current + 1;
    saveSettings({ ...currentSettings, playbackTime: next });
  },

  setDuration(duration: number) {
    saveSettings({ ...currentSettings, duration });
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
