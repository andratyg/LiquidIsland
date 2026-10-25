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
  type SystemNotificationItem,
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
  playGlassPop,
} from '../utils/sfx';

export const DEFAULT_NOTIFICATIONS: SystemNotificationItem[] = [
  {
    id: 'notif-snip-1',
    appName: 'Snipping Tool',
    title: 'Screenshot copied to clipboard',
    subtitle: 'Select here to mark up and share the image',
    timestamp: '16:35',
    icon: 'snipping-tool',
    thumbnail: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80" viewBox="0 0 120 80"><rect width="120" height="80" fill="%231e293b"/><circle cx="60" cy="40" r="18" fill="%2338bdf8" opacity="0.3"/><path d="M48 40l8 8 16-16" stroke="%2338bdf8" stroke-width="3" fill="none"/></svg>',
    unread: true,
    actionType: 'shelf',
    slideIndex: 3,
  },
  {
    id: 'notif-sys-2',
    appName: 'LiquidIsland OS',
    title: '40 MB High-Fluidity Tier Active',
    subtitle: '120fps GPU blur shaders and memory governor calibrated',
    timestamp: '16:30',
    icon: 'system',
    unread: false,
    actionType: 'settings',
  },
];

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

  // Fix Stage 2 defaults
  dockPinned: false,
  networkSsid: 'Home-WiFi-5G',
  isWifiEnabled: true,
  isBluetoothEnabled: true,
  isAirplaneMode: false,
  powerMode: 'balanced',
  batteryHealth: 98,

  // Fix Stage 3 defaults
  launchpadOpen: false,

  // 40MB Edition - Stage 1 defaults
  captureBarOpen: false,
  isScreenRecording: false,
  recordingSeconds: 0,

  // 40MB Edition - Stage 2 defaults
  doNotDisturb: false,
  notifications: DEFAULT_NOTIFICATIONS,
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

      // Fix Stage 2 settings & 40MB Edition - Stage 1 auto-hide migration (liquid_dock_pinned_v2)
      dockPinned: (() => {
        const v2 = window.localStorage.getItem('liquid_dock_pinned_v2');
        if (v2 !== null) return v2 === 'true';
        window.localStorage.setItem('liquid_dock_pinned_v2', 'false');
        return false;
      })(),
      networkSsid: typeof parsed.networkSsid === 'string' ? parsed.networkSsid : 'Home-WiFi-5G',
      isWifiEnabled: typeof parsed.isWifiEnabled === 'boolean' ? parsed.isWifiEnabled : true,
      isBluetoothEnabled: typeof parsed.isBluetoothEnabled === 'boolean' ? parsed.isBluetoothEnabled : true,
      isAirplaneMode: typeof parsed.isAirplaneMode === 'boolean' ? parsed.isAirplaneMode : false,
      powerMode: ['balanced', 'performance', 'saver'].includes(parsed.powerMode) ? parsed.powerMode : 'balanced',
      batteryHealth: typeof parsed.batteryHealth === 'number' ? parsed.batteryHealth : 98,

      // Fix Stage 3: Always closed on fresh boot
      launchpadOpen: false,

      // 40MB Edition - Stage 1: Always reset capture & recording states on boot
      captureBarOpen: false,
      isScreenRecording: false,
      recordingSeconds: 0,

      // 40MB Edition - Stage 2: Do Not Disturb & Notifications
      doNotDisturb: typeof parsed.doNotDisturb === 'boolean' ? parsed.doNotDisturb : false,
      notifications: Array.isArray(parsed.notifications) && parsed.notifications.length > 0
        ? parsed.notifications
        : DEFAULT_NOTIFICATIONS,
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

async function safeEmit(event: string, payload?: unknown) {
  try {
    const isTauri =
      typeof window !== 'undefined' &&
      ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
    if (!isTauri) return;
    const { emit } = await import('@tauri-apps/api/event');
    await emit(event, payload);
  } catch {
    // Non-fatal
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

    // Monotonic Playback Guard:
    // When receiving "system-media-update" for the SAME track while isPlaying === true,
    // if incomingPosition < currentPlaybackTime and (currentPlaybackTime - incomingPosition) < 3.0,
    // IGNORE the backward timestamp overwrite! Only sync backward if the user explicitly seeked (delta >= 3.0s) or changed tracks.
    const isSameTrack =
      Boolean(payload.title) &&
      payload.title === currentSettings.mediaTitle &&
      (!payload.artist || payload.artist === currentSettings.mediaArtist);
    const currentPlaybackTime = currentSettings.playbackTime ?? 0;

    let targetPosition = pos;
    if (isSameTrack && currentSettings.isAudioPlaying && isPlaying) {
      if (pos < currentPlaybackTime && (currentPlaybackTime - pos) < 3.0) {
        // Retain the higher-precision smooth local playback time
        targetPosition = currentPlaybackTime;
      }
    }

    saveSettings({
      ...currentSettings,
      mediaTitle: payload.title || currentSettings.mediaTitle,
      mediaArtist: payload.artist || currentSettings.mediaArtist,
      mediaAlbum: payload.album_title || currentSettings.mediaAlbum,
      mediaSourceApp: payload.source_app || currentSettings.mediaSourceApp,
      mediaIsPlaying: isPlaying,
      isAudioPlaying: isPlaying,
      mediaPosition: targetPosition,
      playbackTime: targetPosition,
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
    } else if (type === 'wifi') {
      playWaterDrop();
      fullPayload = {
        type: 'wifi',
        title: payload?.title ?? 'Wi-Fi Connected',
        subtitle: payload?.subtitle ?? (currentSettings.networkSsid || 'Home-WiFi-5G'),
        icon: 'wifi',
        ...payload,
      };
    } else if (type === 'bluetooth') {
      playWaterDrop();
      fullPayload = {
        type: 'bluetooth',
        title: payload?.title ?? 'Bluetooth Connected',
        subtitle: payload?.subtitle ?? 'AirBuds Pro Connected',
        icon: 'bluetooth',
        ...payload,
      };
    } else if (type === 'screenshot') {
      playWaterDrop();
      fullPayload = {
        type: 'screenshot',
        title: payload?.title ?? 'Screenshot Saved',
        subtitle: payload?.subtitle ?? (payload?.filename || 'Saved to Shelf & Clipboard'),
        icon: 'screenshot',
        thumbnail: payload?.thumbnail,
        filename: payload?.filename,
        dataUrl: payload?.dataUrl,
        ...payload,
      };
    } else if (type === 'workspace') {
      fullPayload = {
        type: 'workspace',
        title: payload?.title ?? 'Window Focused',
        subtitle: payload?.subtitle ?? 'Active Window',
        appName: payload?.appName,
        tabTitle: payload?.tabTitle,
        accentColor: payload?.accentColor ?? '#38bdf8',
        workspaceActivity: payload?.workspaceActivity,
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

    safeEmit('system-toast', { type, payload: fullPayload });

    const autoRevertMs = (type === 'charging' || type === 'unplugged') ? 3000 : (type === 'hud' ? 2000 : 3200);
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

    const activityData: WorkspaceActivityPayload = {
      ...payload,
      timestamp: Date.now(),
    };

    // Save activity in settings immediately for bottom dock and overlay synchronization
    saveSettings({
      ...currentSettings,
      workspaceActivity: activityData,
    });

    // UNIFIED DYNAMIC ISLAND: When switching tabs or windows, smoothly expand the top notch into the Apple-style alert!
    if (payload.kind === 'app-switch' || payload.kind === 'tab-switch') {
      const kindLabel =
        payload.kind === 'tab-switch'
          ? 'Active Tab Switched'
          : 'Window Focused';

      const iconData = payload.recent_apps?.[0]?.icon_data;

      this.triggerToast('workspace', {
        title: kindLabel,
        subtitle: payload.tab_title || payload.app_name || 'Active Window',
        appName: payload.app_name,
        tabTitle: payload.tab_title,
        accentColor: payload.accent_color || '#38bdf8',
        iconData,
        workspaceActivity: activityData,
      });
    }

    // Auto-revert back to compact pill after 1.8 seconds (1800ms)
    workspaceActivityTimeoutId = setTimeout(() => {
      saveSettings({
        ...currentSettings,
        workspaceActivity: null,
      });
      workspaceActivityTimeoutId = null;
    }, 1800);
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

  tickPlaybackTime(delta: number = 0.2) {
    if (!currentSettings.isAudioPlaying) return;
    const current = currentSettings.playbackTime ?? 193;
    const dur = currentSettings.duration ?? 256;
    const next = current + delta >= dur ? 0 : Math.round((current + delta) * 1000) / 1000;
    saveSettings({ ...currentSettings, playbackTime: next, mediaPosition: next });
  },

  setDuration(duration: number) {
    saveSettings({ ...currentSettings, duration });
  },

  // Fix Stage 2: Supercharged System Tray & Smart Dock Auto-Hide
  setDockPinned(dockPinned: boolean) {
    playToggleClick();
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('liquid_dock_pinned_v2', String(dockPinned));
    }
    saveSettings({ ...currentSettings, dockPinned });
  },

  toggleDockPinned() {
    const next = !currentSettings.dockPinned;
    systemStore.setDockPinned(next);
  },

  toggleWifi() {
    playToggleClick();
    const next = !currentSettings.isWifiEnabled;
    saveSettings({ ...currentSettings, isWifiEnabled: next });
    this.triggerToast('wifi', {
      title: next ? 'Wi-Fi Connected' : 'Wi-Fi Disconnected',
      subtitle: next ? (currentSettings.networkSsid || 'Home-WiFi-5G') : 'Turned Off',
    });
  },

  toggleBluetooth() {
    playToggleClick();
    const next = !currentSettings.isBluetoothEnabled;
    saveSettings({ ...currentSettings, isBluetoothEnabled: next });
    this.triggerToast('bluetooth', {
      title: next ? 'Bluetooth Connected' : 'Bluetooth Disconnected',
      subtitle: next ? 'AirBuds Pro Connected' : 'Turned Off',
    });
  },

  toggleAirplaneMode() {
    playToggleClick();
    const next = !currentSettings.isAirplaneMode;
    saveSettings({
      ...currentSettings,
      isAirplaneMode: next,
      ...(next ? { isWifiEnabled: false, isBluetoothEnabled: false } : {}),
    });
    this.triggerToast('workspace', {
      title: next ? 'Airplane Mode Enabled' : 'Airplane Mode Disabled',
      subtitle: next ? 'All wireless radios off' : 'Wi-Fi & Bluetooth available',
    });
  },

  setPowerMode(powerMode: 'balanced' | 'performance' | 'saver') {
    playToggleClick();
    saveSettings({ ...currentSettings, powerMode });
  },

  // Fix Stage 3: Liquid Launchpad
  setLaunchpadOpen(launchpadOpen: boolean) {
    playToggleClick();
    saveSettings({ ...currentSettings, launchpadOpen });
  },

  toggleLaunchpad() {
    const next = !currentSettings.launchpadOpen;
    systemStore.setLaunchpadOpen(next);
  },

  // 40MB Edition - Stage 1: Custom Screen Capture & Recording
  setCaptureBarOpen(captureBarOpen: boolean) {
    playToggleClick();
    saveSettings({ ...currentSettings, captureBarOpen });
  },

  toggleCaptureBar() {
    const next = !currentSettings.captureBarOpen;
    systemStore.setCaptureBarOpen(next);
  },

  setIsScreenRecording(isScreenRecording: boolean) {
    playToggleClick();
    saveSettings({
      ...currentSettings,
      isScreenRecording,
      recordingSeconds: isScreenRecording ? 0 : (currentSettings.recordingSeconds ?? 0),
    });
  },

  tickRecordingSeconds() {
    saveSettings({
      ...currentSettings,
      recordingSeconds: (currentSettings.recordingSeconds ?? 0) + 1,
    });
  },

  showScreenshotToast(filename: string, thumbnail: string) {
    this.triggerToast('screenshot', {
      title: 'Screenshot Saved',
      subtitle: filename,
      thumbnail,
      filename,
      dataUrl: thumbnail,
      icon: 'screenshot',
    });
  },

  // 40MB Edition - Stage 2: Notification Center, DND & Focus Session
  setDoNotDisturb(doNotDisturb: boolean) {
    playToggleClick();
    saveSettings({ ...currentSettings, doNotDisturb });
  },

  toggleDoNotDisturb() {
    const next = !currentSettings.doNotDisturb;
    playToggleClick();
    saveSettings({ ...currentSettings, doNotDisturb: next });
    this.triggerToast('airbuds', {
      title: next ? 'Do Not Disturb On' : 'Do Not Disturb Off',
      subtitle: next ? 'Only priority alerts will appear' : 'All notifications active',
    });
  },

  addNotification(notif: SystemNotificationItem) {
    const existing = currentSettings.notifications ?? [];
    saveSettings({
      ...currentSettings,
      notifications: [notif, ...existing.filter((n) => n.id !== notif.id)],
    });
  },

  removeNotification(id: string) {
    playToggleClick();
    const existing = currentSettings.notifications ?? [];
    saveSettings({
      ...currentSettings,
      notifications: existing.filter((n) => n.id !== id),
    });
  },

  clearAllNotifications() {
    playGlassPop();
    saveSettings({
      ...currentSettings,
      notifications: [],
    });
  },

  startFocusSession(durationMinutes: number) {
    playGlassPop();
    const totalSecs = Math.max(5, Math.min(180, durationMinutes)) * 60;
    saveSettings({
      ...currentSettings,
      pomodoroMode: 'focus',
      pomodoroTotalSeconds: totalSecs,
      pomodoroSecondsLeft: totalSecs,
      isPomodoroRunning: true,
      pomodoroActive: true,
      doNotDisturb: true,
      islandState: 'expanded',
      activeSlide: 1, // Pomodoro Slide
    });
    this.triggerToast('airbuds', {
      title: `Focus Session Started (${durationMinutes}m)`,
      subtitle: 'Do Not Disturb enabled • Focus Glasses equipped',
    });
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
