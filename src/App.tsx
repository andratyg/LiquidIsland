import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStore, systemStore } from './store/useSystemStore';
import { playGlassPop, playWaterDrop, playToggleClick } from './utils/sfx';
import { IslandShell } from './components/IslandShell';
import { CompactView } from './components/CompactView';
import { CompanionStage } from './components/companions/CompanionStage';
import { ExpandedContainer } from './components/ExpandedContainer';
import { ToastView } from './components/ToastView';
import { SpotlightModal } from './components/SpotlightModal';
import { SettingsModal } from './components/SettingsModal';
import {
  Sun,
  Moon,
  Cpu,
  Monitor,
  Activity,
  ChevronUp,
  ChevronDown,
  Power,
  Eye,
  Radio,
  Sliders,
  X,
  Wrench,
  Cat,
  Smile,
  Palette,
  Shield,
  SunMedium,
  Layout,
} from 'lucide-react';
import { ISLAND_DIMENSIONS } from './types/liquid';

interface TrayActionPayload {
  action: string;
  ram_mb?: number;
}

// Safe Tauri IPC Invoker with web browser fallback
async function safeInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T | null> {
  try {
    const isTauri =
      typeof window !== 'undefined' &&
      ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
    if (!isTauri) {
      if (cmd === 'trim_ram_working_set') return 9.85 as unknown as T;
      if (cmd === 'get_monitors_list') {
        return [
          '0: Primary Display (1920x1080 at 0,0, scale: 1.0)',
          '1: Secondary Display (1920x1080 at 1920,0, scale: 1.0)',
        ] as unknown as T;
      }
      return null;
    }
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<T>(cmd, args);
  } catch (err) {
    console.warn(`[Tauri IPC] "${cmd}" returned:`, err);
    return null;
  }
}

export const App: React.FC = () => {
  const islandEnabled = useSystemStore((s) => s.islandEnabled);
  const islandState = useSystemStore((s) => s.islandState);
  const theme = useSystemStore((s) => s.theme);
  const companionMode = useSystemStore((s) => s.companionMode);
  const companionColor = useSystemStore((s) => s.companionColor);
  const enableOptionalLofi = useSystemStore((s) => s.enableOptionalLofi);
  const taskbarMode = useSystemStore((s) => s.taskbarMode);
  const selectedMonitor = useSystemStore((s) => s.selectedMonitor);
  const spotlightOpen = useSystemStore((s) => s.spotlightOpen ?? false);
  const autoFullscreenStealth = useSystemStore((s) => s.autoFullscreenStealth ?? false);
  const toastPayload = useSystemStore((s) => s.toastPayload);
  const privacyBlurEnabled = useSystemStore((s) => s.privacyBlurEnabled);
  const nightEyeCareEnabled = useSystemStore((s) => s.nightEyeCareEnabled);
  const showTaskbarDock = useSystemStore((s) => s.showTaskbarDock);
  const isAudioPlaying = useSystemStore((s) => s.isAudioPlaying);

  // Global 1s audio playback ticker so lyrics advance seamlessly in all views
  useEffect(() => {
    if (!isAudioPlaying) return;
    const ticker = setInterval(() => {
      systemStore.tickPlaybackTime();
    }, 1000);
    return () => clearInterval(ticker);
  }, [isAudioPlaying]);

  const [ramWorkingSet, setRamWorkingSet] = useState<number | null>(null);
  const [monitors, setMonitors] = useState<string[]>([]);
  const [statusMsg, setStatusMsg] = useState<string>('Phase 10 Liquid Glass Final Active');
  const [isTrimming, setIsTrimming] = useState(false);
  const [showTraySim, setShowTraySim] = useState(false);
  const [showDevControls, setShowDevControls] = useState(false);
  const [showDevToolbar, setShowDevToolbar] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [wallpaperPreview, setWallpaperPreview] = useState<'none' | 'dark' | 'light' | 'vibrant'>('none');
  const [testHeadphones, setTestHeadphones] = useState(false);
  const [testGlasses, setTestGlasses] = useState(false);
  const [testPetting, setTestPetting] = useState(false);

  // Companion drag anticipation
  const [testFileDrag, setTestFileDrag] = useState(false);

  // Jelly Drop Bounce State
  const [isJellyBouncing, setIsJellyBouncing] = useState(false);
  const triggerJellyBounce = useCallback(() => {
    setIsJellyBouncing(true);
    setTimeout(() => setIsJellyBouncing(false), 650);
  }, []);

  // Update native tray tooltip via Tauri command
  const syncTrayTooltip = useCallback(async (mb: number) => {
    const tooltipText = `LiquidIsland OS - Active (~${mb.toFixed(1)} MB RAM)`;
    await safeInvoke('update_tray_tooltip', { statusText: tooltipText });
  }, []);

  // Central Tray Action Dispatcher (Shared between native Rust tray events & simulation)
  const handleTrayAction = useCallback(
    async (payload: TrayActionPayload) => {
      const { action, ram_mb } = payload;
      console.log(`[Tray Event Received] Action: "${action}", RAM: ${ram_mb ?? 'N/A'}`);

      switch (action) {
        case 'toggle_power': {
          playToggleClick();
          const next = !systemStore.getState().islandEnabled;
          systemStore.setIslandEnabled(next);
          setStatusMsg(next ? 'Island Enabled' : 'Island Disabled (Standby)');
          if (!next && typeof ram_mb === 'number') {
            setRamWorkingSet(ram_mb);
            syncTrayTooltip(ram_mb);
          }
          break;
        }

        case 'stealth_bezel': {
          playToggleClick();
          systemStore.setIslandState('bezel-line');
          setStatusMsg('Stealth Bezel Mode (136x6)');
          break;
        }

        case 'switch_theme': {
          playToggleClick();
          systemStore.toggleTheme();
          const currentTheme = systemStore.getState().theme;
          setStatusMsg(`Theme: ${currentTheme.toUpperCase()}`);
          break;
        }

        case 'switch_companion': {
          playToggleClick();
          systemStore.cycleCompanionMode();
          const currentMode = systemStore.getState().companionMode;
          setStatusMsg(`Companion: ${currentMode.toUpperCase()}`);
          break;
        }

        case 'toggle_lofi': {
          playToggleClick();
          systemStore.toggleOptionalLofi();
          const currentLofi = systemStore.getState().enableOptionalLofi;
          setStatusMsg(`Lofi Focus: ${currentLofi ? 'ON' : 'OFF'}`);
          break;
        }

        case 'cycle_taskbar': {
          playToggleClick();
          systemStore.cycleTaskbarMode();
          const currentTaskbar = systemStore.getState().taskbarMode;
          setStatusMsg(`Taskbar Mode: Option ${currentTaskbar}`);
          break;
        }

        case 'open_settings': {
          playGlassPop();
          setShowSettingsModal(true);
          break;
        }

        case 'trim_ram': {
          playWaterDrop();
          setIsTrimming(true);
          let newRam = ram_mb;
          if (newRam === undefined) {
            const res = await safeInvoke<number>('trim_ram_working_set');
            newRam = res ?? 9.2;
          }
          setIsTrimming(false);
          setRamWorkingSet(newRam);
          syncTrayTooltip(newRam);
          setStatusMsg(`RAM Trimmed: ${newRam.toFixed(2)} MB`);
          break;
        }

        case 'toggle_expand': {
          playGlassPop();
          const currentState = systemStore.getState().islandState;
          const nextState = currentState === 'expanded' ? 'compact' : 'expanded';
          systemStore.setIslandState(nextState);
          setStatusMsg(`Island: ${nextState.toUpperCase()}`);
          break;
        }

        case 'wake_and_compact': {
          playGlassPop();
          systemStore.setIslandEnabled(true);
          systemStore.setIslandState('compact');
          setStatusMsg('Island Awakened');
          break;
        }

        case 'toggle_dev_controls': {
          playToggleClick();
          setShowDevControls((prev) => !prev);
          break;
        }

        case 'toggle_taskbar_dock': {
          playToggleClick();
          systemStore.toggleTaskbarDock();
          const nextDock = systemStore.getState().showTaskbarDock;
          setStatusMsg(`Taskbar Dock: ${nextDock ? 'SHOWN' : 'HIDDEN'}`);
          break;
        }

        case 'restore_native_taskbar': {
          playWaterDrop();
          safeInvoke('restore_default_taskbar');
          setStatusMsg('Windows Taskbar Restored');
          break;
        }

        case 'restart_explorer': {
          playWaterDrop();
          safeInvoke('restart_windows_explorer');
          setStatusMsg('Restarting Windows Explorer...');
          break;
        }

        case 'quit_app': {
          playToggleClick();
          setStatusMsg('Exiting LiquidIsland...');
          safeInvoke('restore_default_taskbar');
          break;
        }

        default:
          console.warn('[Tray Event] Unrecognized action:', action);
      }
    },
    [syncTrayTooltip]
  );

  // Ensure native Windows Taskbar region is unclipped and healthy on mount
  useEffect(() => {
    safeInvoke('restore_default_taskbar');
  }, []);

  // Subscribe to native Windows Tray events via Tauri IPC
  useEffect(() => {
    let unlistenAction: (() => void) | null = null;
    let unlistenCmd: (() => void) | null = null;
    let isMounted = true;

    async function registerTrayListeners() {
      const isTauri =
        typeof window !== 'undefined' &&
        ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
      if (!isTauri) return;

      try {
        const { listen } = await import('@tauri-apps/api/event');
        if (!isMounted) return;

        const sub1 = await listen<TrayActionPayload>('tray-menu-action', (event) => {
          handleTrayAction(event.payload);
        });
        unlistenAction = sub1;

        const sub2 = await listen<TrayActionPayload>('tray-command', (event) => {
          handleTrayAction(event.payload);
        });
        unlistenCmd = sub2;
      } catch (err) {
        console.warn('[Tauri Event Listener] Failed to subscribe to tray events:', err);
      }
    }

    registerTrayListeners();

    return () => {
      isMounted = false;
      if (unlistenAction) unlistenAction();
      if (unlistenCmd) unlistenCmd();
    };
  }, [handleTrayAction]);

  // Query connected monitors and initial RAM working set on mount
  useEffect(() => {
    let isMounted = true;
    async function initSystem() {
      const monitorList = await safeInvoke<string[]>('get_monitors_list');
      if (isMounted && monitorList && monitorList.length > 0) {
        setMonitors(monitorList);
      }
      const initialRam = await safeInvoke<number>('trim_ram_working_set');
      if (isMounted && initialRam !== null) {
        setRamWorkingSet(initialRam);
        syncTrayTooltip(initialRam);
      }
    }
    initSystem();
    return () => {
      isMounted = false;
    };
  }, [syncTrayTooltip]);

  // Global Drag Auto-Wake Listeners
  useEffect(() => {
    let dragCounter = 0;

    function handleGlobalDragEnter(e: DragEvent) {
      if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
        dragCounter += 1;
        setTestFileDrag(true);
      }
    }

    function handleGlobalDragLeave(_e: DragEvent) {
      dragCounter -= 1;
      if (dragCounter <= 0) {
        dragCounter = 0;
        setTestFileDrag(false);
      }
    }

    function handleGlobalDragOver(e: DragEvent) {
      e.preventDefault();
      if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
        setTestFileDrag(true);
        if (e.clientY < 190) {
          const current = systemStore.getState();
          if (current.islandState !== 'expanded' || current.activeSlide !== 3) {
            systemStore.wakeShelfForDrop();
          }
        }
      }
    }

    function handleGlobalDrop(e: DragEvent) {
      e.preventDefault();
      dragCounter = 0;
      setTestFileDrag(false);
    }

    window.addEventListener('dragenter', handleGlobalDragEnter);
    window.addEventListener('dragleave', handleGlobalDragLeave);
    window.addEventListener('dragover', handleGlobalDragOver);
    window.addEventListener('drop', handleGlobalDrop);

    return () => {
      window.removeEventListener('dragenter', handleGlobalDragEnter);
      window.removeEventListener('dragleave', handleGlobalDragLeave);
      window.removeEventListener('dragover', handleGlobalDragOver);
      window.removeEventListener('drop', handleGlobalDrop);
    };
  }, []);

  // Global Hotkey Listener: Alt + Space (Spotlight), Ctrl + Alt + B (Boss Key Privacy Blur), Esc
  useEffect(() => {
    async function handleKeyDown(e: KeyboardEvent) {
      // 1. Alt + Space: Toggle Spotlight Search & Command Launcher
      if (e.altKey && (e.code === 'Space' || e.key === ' ')) {
        e.preventDefault();
        playGlassPop();
        systemStore.toggleSpotlight();
        return;
      }

      // 2. Ctrl + Alt + B: Toggle Screen Privacy Blur ("Boss Key")
      if (e.ctrlKey && e.altKey && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        systemStore.togglePrivacyBlur();
        return;
      }

      // 3. Escape: Close Modals, Unlock Privacy, or Collapse Expanded Dashboard
      if (e.key === 'Escape') {
        if (privacyBlurEnabled) {
          e.preventDefault();
          systemStore.setPrivacyBlurEnabled(false);
          return;
        }
        if (showSettingsModal) {
          e.preventDefault();
          setShowSettingsModal(false);
          return;
        }
        if (systemStore.getState().spotlightOpen) {
          e.preventDefault();
          playToggleClick();
          systemStore.setSpotlightOpen(false);
          return;
        }
        const state = systemStore.getState().islandState;
        if (state === 'expanded' || state === 'expanded-lyrics') {
          e.preventDefault();
          playGlassPop();
          systemStore.collapseIsland();
          return;
        }
      }

      // 4. Ctrl + Alt + T: Toggle Pin Active Window
      if (e.ctrlKey && e.altKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        const res = await safeInvoke<string>('toggle_pin_active_window');
        const msg = res || '📌 Window Pinned Always-on-Top';
        systemStore.triggerToast('window-pin', {
          title: msg.includes('Unpinned') ? 'Window Unpinned' : 'Window Pinned',
          subtitle: msg,
          isPinned: !msg.includes('Unpinned'),
        });
        return;
      }

      // 5. Ctrl + Shift + D: Toggle Developer Controls Toolbar & Taskbar Dock
      if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        playToggleClick();
        setShowDevControls((prev) => !prev);
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [privacyBlurEnabled, showSettingsModal]);

  // Automatic Fullscreen Gaming / Video Stealth Detection
  useEffect(() => {
    if (!autoFullscreenStealth) return;
    const fsTimer = setInterval(async () => {
      const isFullscreen = await safeInvoke<boolean>('check_fullscreen_state');
      if (isFullscreen && systemStore.getState().islandState !== 'bezel-line') {
        systemStore.setIslandState('bezel-line');
      }
    }, 2500);

    return () => clearInterval(fsTimer);
  }, [autoFullscreenStealth]);

  // Synchronize dynamic hit-box with native Rust Win32 GetCursorPos tracker (35ms loop)
  useEffect(() => {
    let width = 210;
    let height = 56;

    if (islandState === 'bezel-line') {
      width = 160;
      height = 28;
    } else if (islandState === 'eyes') {
      width = isAudioPlaying ? 380 : 200;
      height = isAudioPlaying ? 60 : 56;
    } else if (islandState === 'compact') {
      width = 210;
      height = 56;
    } else if (islandState === 'toast') {
      width = 350;
      height = 80;
    } else if (islandState === 'expanded') {
      width = 460;
      height = 195;
    } else if (islandState === 'expanded-lyrics') {
      width = 620;
      height = 195;
    }

    const modalOpen = Boolean(
      spotlightOpen || showSettingsModal || showDevControls
    );

    safeInvoke('update_hit_box', {
      width,
      height,
      modalOpen,
    });
  }, [islandState, isAudioPlaying, spotlightOpen, showSettingsModal, showDevControls]);

  // Collapse Island when clicking outside #liquid-island-root
  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      const currentState = systemStore.getState().islandState;
      if (currentState === 'expanded' || currentState === 'expanded-lyrics') {
        const root = document.getElementById('liquid-island-root');
        if (root && !root.contains(e.target as Node)) {
          playGlassPop();
          systemStore.collapseIsland();
        }
      }
    }
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  // Dynamic Window Resizing for Spotlight & Settings Modals (960px when open, 210px when closed)
  useEffect(() => {
    async function updateWindowSize() {
      if (spotlightOpen || showSettingsModal) {
        await safeInvoke('set_window_size', { width: 720, height: 960 });
      } else {
        await safeInvoke('set_window_size', { width: 640, height: 210 });
      }
    }
    updateWindowSize();
  }, [spotlightOpen, showSettingsModal]);

  // Click-Through handling for floating Dev Toolbar
  const handleToolbarMouseEnter = useCallback(async () => {
    await safeInvoke('set_click_through', { ignore: false });
  }, []);

  const handleToolbarMouseLeave = useCallback(async () => {
    await safeInvoke('set_click_through', { ignore: true });
  }, []);

  // Determine active dimensions: widen to 360x44 in Companion mode when music is playing
  const activeDimensions = !islandEnabled
    ? { width: 140, height: 26 }
    : islandState === 'eyes' && isAudioPlaying
    ? { width: 360, height: 44 }
    : ISLAND_DIMENSIONS[islandState] || ISLAND_DIMENSIONS['compact'];

  return (
    <div className={`island-canvas theme-${theme}`}>
      {/* ==================================================================== */}
      {/* Master 1:1 Dynamic Island Shell                                      */}
      {/* ==================================================================== */}
      <IslandShell
        activeDimensions={activeDimensions}
        isJellyBouncing={isJellyBouncing}
      >
        <AnimatePresence mode="wait">
          {!islandEnabled ? (
            /* Standby / Disabled Pill */
            <motion.div
              key="disabled-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              exit={{ opacity: 0 }}
              onClick={() => handleTrayAction({ action: 'toggle_power' })}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                width: '100%',
                height: '100%',
                cursor: 'pointer',
                fontSize: '10px',
                color: 'var(--text-secondary)',
              }}
              title="Dynamic Island is Disabled. Click or use System Tray (^) to resume."
            >
              <Power size={11} style={{ color: '#ef4444' }} />
              <span>Standby (Tray ^)</span>
            </motion.div>
          ) : islandState === 'toast' && toastPayload ? (
            /* Phase 8 Transient Notification Toast */
            <motion.div
              key="toast-view-container"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.16 }}
              style={{ width: '100%', height: '100%' }}
            >
              <ToastView />
            </motion.div>
          ) : islandState === 'eyes' ? (
            /* Phase 4 Custom Interactive Companion Stage (168px × 40px) */
            <motion.div
              key="companion-stage-container"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ width: '100%', height: '100%' }}
            >
              <CompanionStage testFileDrag={testFileDrag} />
            </motion.div>
          ) : islandState === 'compact' ? (
            /* Phase 3 Feature-Complete Compact View (184px × 40px) */
            <motion.div
              key="compact-view-container"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ width: '100%', height: '100%' }}
            >
              <CompactView />
            </motion.div>
          ) : islandState === 'expanded' || islandState === 'expanded-lyrics' ? (
            /* Phase 5 Expanded Carousel Container */
            <motion.div
              key="expanded-container"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              style={{ width: '100%', height: '100%' }}
            >
              <ExpandedContainer
                onDropJellyBounce={triggerJellyBounce}
                onOpenSettings={() => setShowSettingsModal(true)}
              />
            </motion.div>
          ) : (
            /* Fallback State */
            <motion.div
              key="fallback-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => systemStore.setIslandState('compact')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
                cursor: 'pointer',
                fontSize: '11px',
                color: 'var(--text-secondary)',
              }}
            >
              <span>{islandState.toUpperCase()}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </IslandShell>

      {/* ==================================================================== */}
      {/* Spotlight Command Launcher (Alt + Space)                             */}
      {/* ==================================================================== */}
      <AnimatePresence>
        {spotlightOpen && (
          <SpotlightModal
            onClose={() => systemStore.setSpotlightOpen(false)}
            onOpenSettings={() => {
              systemStore.setSpotlightOpen(false);
              setShowSettingsModal(true);
            }}
          />
        )}
      </AnimatePresence>


      {/* ==================================================================== */}
      {/* Full Settings Dashboard & Companion Character Studio                 */}
      {/* ==================================================================== */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        ramWorkingSet={ramWorkingSet}
        onTrimRam={async () => {
          setIsTrimming(true);
          const res = await safeInvoke<number>('trim_ram_working_set');
          const newRam = res ?? 9.2;
          setIsTrimming(false);
          setRamWorkingSet(newRam);
          syncTrayTooltip(newRam);
          return newRam;
        }}
        monitors={monitors}
        onSelectMonitor={(idx) => {
          systemStore.setSelectedMonitor(idx);
          safeInvoke('center_on_monitor', { monitorIndex: idx });
        }}
      />

      {/* ==================================================================== */}
      {/* Screen Privacy Blur Overlay ("Boss Key" Ctrl + Alt + B)              */}
      {/* ==================================================================== */}
      <AnimatePresence>
        {privacyBlurEnabled && (
          <motion.div
            key="privacy-blur-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="privacy-blur-overlay"
            onClick={() => systemStore.setPrivacyBlurEnabled(false)}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '14px',
                padding: '24px 32px',
                borderRadius: '20px',
                background: 'var(--island-bg)',
                backgroundImage: 'var(--glass-surface)',
                border: '1px solid var(--glass-border)',
                boxShadow: 'var(--glass-shadow)',
                maxWidth: '380px',
                textAlign: 'center',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(59, 130, 246, 0.2)',
                  border: '1px solid #3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)',
                }}
              >
                <Shield size={24} style={{ color: '#60a5fa' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px' }}>
                  Privacy Shield Active
                </h3>
                <p
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    margin: 0,
                    lineHeight: 1.4,
                  }}
                >
                  Desktop frosted privacy veil engaged. Press{' '}
                  <kbd
                    style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: 'var(--pill-bg)',
                      border: '1px solid var(--glass-border)',
                      fontSize: '10px',
                      fontWeight: 600,
                    }}
                  >
                    Ctrl + Alt + B
                  </kbd>{' '}
                  or click below to restore.
                </p>
              </div>
              <button
                type="button"
                className="btn-pill"
                onClick={() => systemStore.setPrivacyBlurEnabled(false)}
                style={{
                  fontSize: '11px',
                  padding: '5px 16px',
                  background: '#3b82f6',
                  color: '#ffffff',
                  borderColor: '#60a5fa',
                  fontWeight: 600,
                }}
              >
                Unlock Screen
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================================================================== */}
      {/* Night Eye Care Warm Filter Overlay                                   */}
      {/* ==================================================================== */}
      {nightEyeCareEnabled && <div className="night-eyecare-overlay" />}

      {/* ==================================================================== */}
      {/* Collapsible Floating Dev Toolbar (Diagnostic & Production Toggle)    */}
      {/* Hidden by default in production. Toggle via Ctrl + Shift + D or Tray */}
      {/* ==================================================================== */}
      {showDevControls && (
        <div
          onMouseEnter={handleToolbarMouseEnter}
          onMouseLeave={handleToolbarMouseLeave}
          style={{
            position: 'fixed',
            bottom: showTaskbarDock ? '54px' : '8px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            zIndex: 85,
            pointerEvents: 'auto',
            transition: 'bottom 0.25s ease',
          }}
        >
        {/* Toggle Pill Button */}
        <button
          type="button"
          className="btn-pill"
          onClick={() => {
            playToggleClick();
            setShowDevToolbar((prev) => !prev);
          }}
          title="Toggle Developer & Diagnostics Toolbar"
          style={{
            fontSize: '10px',
            padding: '3px 9px',
            backgroundColor: showDevToolbar ? 'rgba(59, 130, 246, 0.25)' : 'var(--pill-bg)',
            borderColor: showDevToolbar ? '#3b82f6' : 'var(--glass-border)',
          }}
        >
          <Wrench size={11} style={{ color: '#3b82f6' }} />
          <span>{showDevToolbar ? 'Hide Dev Controls' : 'Dev Controls'}</span>
          {showDevToolbar ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
        </button>

        {/* Collapsible Panel */}
        <AnimatePresence>
          {showDevToolbar && (
            <motion.div
              key="dev-toolbar-panel"
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.16 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                padding: '8px 12px',
                borderRadius: '12px',
                backgroundColor: 'var(--island-bg)',
                backgroundImage: 'var(--glass-surface)',
                border: '1px solid var(--glass-border)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: 'var(--glass-shadow)',
                maxWidth: '640px',
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  borderBottom: '1px solid var(--glass-border)',
                  paddingBottom: '4px',
                  fontSize: '10px',
                  color: 'var(--text-secondary)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Activity size={11} style={{ color: '#10b981' }} />
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    Phase 10 Liquid Glass Final
                  </span>
                  <span>({statusMsg})</span>
                </div>
                <span>RAM: {ramWorkingSet ? `${ramWorkingSet.toFixed(1)} MB` : '~9.2 MB'}</span>
              </div>

              {/* Row 1: Quick Actions & Settings Trigger */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-pill"
                  onClick={() => {
                    playGlassPop();
                    setShowSettingsModal(true);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(59, 130, 246, 0.3))',
                    borderColor: '#a855f7',
                    fontWeight: 600,
                    fontSize: '10px',
                    padding: '3px 8px',
                  }}
                >
                  <Sliders size={11} style={{ color: '#c084fc' }} />
                  <span>Open Settings Dashboard</span>
                </button>

                <button
                  type="button"
                  className="btn-pill"
                  onClick={() => {
                    playToggleClick();
                    systemStore.togglePrivacyBlur();
                  }}
                  style={{
                    borderColor: privacyBlurEnabled ? '#3b82f6' : 'var(--glass-border)',
                    fontSize: '10px',
                    padding: '3px 7px',
                  }}
                >
                  <Shield size={11} style={{ color: '#3b82f6' }} />
                  <span>Boss Key (Blur)</span>
                </button>

                <button
                  type="button"
                  className="btn-pill"
                  onClick={() => {
                    playToggleClick();
                    systemStore.toggleNightEyeCare();
                  }}
                  style={{
                    borderColor: nightEyeCareEnabled ? '#f59e0b' : 'var(--glass-border)',
                    fontSize: '10px',
                    padding: '3px 7px',
                  }}
                >
                  <SunMedium size={11} style={{ color: '#f59e0b' }} />
                  <span>Night Eye Care</span>
                </button>

                <button
                  type="button"
                  className="btn-pill"
                  onClick={() => {
                    playToggleClick();
                    systemStore.toggleTaskbarDock();
                  }}
                  style={{
                    borderColor: showTaskbarDock ? '#10b981' : 'var(--glass-border)',
                    fontSize: '10px',
                    padding: '3px 7px',
                  }}
                >
                  <Layout size={11} style={{ color: '#10b981' }} />
                  <span>Dock: {showTaskbarDock ? 'SHOW' : 'HIDE'}</span>
                </button>

                <button
                  type="button"
                  className="btn-pill"
                  onClick={() => {
                    playToggleClick();
                    systemStore.cycleTaskbarMode();
                  }}
                  style={{ fontSize: '10px', padding: '3px 7px' }}
                >
                  <span>Taskbar: {taskbarMode}</span>
                </button>

                <button
                  type="button"
                  className="btn-pill"
                  onClick={() => {
                    playToggleClick();
                    systemStore.toggleTheme();
                    setStatusMsg(`Theme: ${systemStore.getState().theme.toUpperCase()}`);
                  }}
                  style={{ fontSize: '10px', padding: '3px 7px' }}
                >
                  {theme === 'dark' ? (
                    <Moon size={11} style={{ color: '#93c5fd' }} />
                  ) : (
                    <Sun size={11} style={{ color: '#f59e0b' }} />
                  )}
                  <span>{theme.toUpperCase()}</span>
                </button>

                <button
                  type="button"
                  className="btn-pill"
                  onClick={() => handleTrayAction({ action: 'trim_ram' })}
                  style={{ fontSize: '10px', padding: '3px 7px' }}
                >
                  <Cpu size={11} className={isTrimming ? 'animate-spin' : ''} style={{ color: '#3b82f6' }} />
                  <span>Trim RAM</span>
                </button>
              </div>

              {/* Row 2: Character Switcher & Test Triggers */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  flexWrap: 'wrap',
                  paddingTop: '3px',
                  borderTop: '1px dashed var(--glass-border)',
                }}
              >
                <span style={{ fontSize: '9.5px', color: 'var(--text-secondary)', marginRight: '2px' }}>
                  Character:
                </span>

                <button
                  type="button"
                  className="btn-pill"
                  onClick={() => {
                    playToggleClick();
                    systemStore.setCompanionMode('slime');
                    if (islandState !== 'eyes') systemStore.setIslandState('eyes');
                    setStatusMsg('Companion: Liquid Slime (B)');
                  }}
                  style={{
                    borderColor: companionMode === 'slime' ? '#10b981' : 'var(--glass-border)',
                    fontSize: '9.5px',
                    padding: '2px 6px',
                  }}
                >
                  <Smile size={10} style={{ color: '#10b981' }} />
                  <span>Slime (B)</span>
                </button>

                <button
                  type="button"
                  className="btn-pill"
                  onClick={() => {
                    playToggleClick();
                    systemStore.setCompanionMode('cat');
                    if (islandState !== 'eyes') systemStore.setIslandState('eyes');
                    setStatusMsg('Companion: Shadow Cat (C)');
                  }}
                  style={{
                    borderColor: companionMode === 'cat' ? '#a855f7' : 'var(--glass-border)',
                    fontSize: '9.5px',
                    padding: '2px 6px',
                  }}
                >
                  <Cat size={10} style={{ color: '#a855f7' }} />
                  <span>Shadow Cat</span>
                </button>

                <button
                  type="button"
                  className="btn-pill"
                  onClick={() => {
                    playToggleClick();
                    systemStore.setCompanionMode('eyes');
                    if (islandState !== 'eyes') systemStore.setIslandState('eyes');
                    setStatusMsg('Companion: Cyber-Eyes');
                  }}
                  style={{
                    borderColor: companionMode === 'eyes' ? '#06b6d4' : 'var(--glass-border)',
                    fontSize: '9.5px',
                    padding: '2px 6px',
                  }}
                >
                  <Eye size={10} style={{ color: '#06b6d4' }} />
                  <span>Cyber-Eyes</span>
                </button>

                <button
                  type="button"
                  className="btn-pill"
                  onClick={() => {
                    playToggleClick();
                    systemStore.setCompanionMode('off');
                    systemStore.setIslandState('compact');
                    setStatusMsg('Companion: OFF (Pill Mode)');
                  }}
                  style={{
                    borderColor: companionMode === 'off' ? '#ef4444' : 'var(--glass-border)',
                    fontSize: '9.5px',
                    padding: '2px 6px',
                  }}
                >
                  <X size={10} style={{ color: '#ef4444' }} />
                  <span>Off</span>
                </button>

                {/* Color Swatches */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginLeft: '6px' }}>
                  <Palette size={10} style={{ color: 'var(--text-secondary)' }} />
                  {[
                    { color: '#10b981', label: 'Emerald' },
                    { color: '#06b6d4', label: 'Cyan' },
                    { color: '#a855f7', label: 'Violet' },
                    { color: '#f43f5e', label: 'Coral' },
                    { color: '#f59e0b', label: 'Amber' },
                  ].map((swatch) => (
                    <button
                      key={swatch.color}
                      type="button"
                      onClick={() => {
                        playToggleClick();
                        systemStore.setCompanionColor(swatch.color);
                        setStatusMsg(`Color: ${swatch.label}`);
                      }}
                      title={`Tint: ${swatch.label}`}
                      style={{
                        width: '13px',
                        height: '13px',
                        borderRadius: '50%',
                        backgroundColor: swatch.color,
                        border:
                          companionColor === swatch.color ? '2px solid #ffffff' : '1px solid rgba(0,0,0,0.3)',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    />
                  ))}
                </div>

                {/* Wallpaper Contrast Preview Switcher */}
                <button
                  type="button"
                  className="btn-pill"
                  onClick={() => {
                    playToggleClick();
                    setWallpaperPreview((prev) => {
                      const modes: ('none' | 'dark' | 'light' | 'vibrant')[] = ['none', 'dark', 'light', 'vibrant'];
                      const next = modes[(modes.indexOf(prev) + 1) % modes.length];
                      setStatusMsg(`Wallpaper: ${next}`);
                      return next;
                    });
                  }}
                  style={{ fontSize: '9.5px', padding: '2px 6px' }}
                >
                  <span>Wallpaper: {wallpaperPreview}</span>
                </button>

                {/* Accessory Test Triggers */}
                <button
                  type="button"
                  className="btn-pill"
                  onClick={() => {
                    playToggleClick();
                    setTestHeadphones((p) => !p);
                  }}
                  style={{
                    fontSize: '9.5px',
                    padding: '2px 6px',
                    borderColor: testHeadphones ? '#3b82f6' : 'var(--glass-border)',
                  }}
                >
                  <span>Headphones</span>
                </button>

                <button
                  type="button"
                  className="btn-pill"
                  onClick={() => {
                    playToggleClick();
                    setTestGlasses((p) => !p);
                  }}
                  style={{
                    fontSize: '9.5px',
                    padding: '2px 6px',
                    borderColor: testGlasses ? '#f59e0b' : 'var(--glass-border)',
                  }}
                >
                  <span>Glasses</span>
                </button>

                <button
                  type="button"
                  className="btn-pill"
                  onClick={() => {
                    playToggleClick();
                    setTestPetting((p) => !p);
                  }}
                  style={{
                    fontSize: '9.5px',
                    padding: '2px 6px',
                    borderColor: testPetting ? '#f43f5e' : 'var(--glass-border)',
                  }}
                >
                  <span>Pet</span>
                </button>

                <button
                  type="button"
                  className="btn-pill"
                  onClick={() => setShowTraySim((prev) => !prev)}
                  style={{
                    fontSize: '9.5px',
                    padding: '2px 6px',
                    marginLeft: 'auto',
                    backgroundColor: showTraySim ? 'rgba(59, 130, 246, 0.25)' : 'var(--pill-bg)',
                  }}
                >
                  <span>Tray Sim</span>
                </button>
              </div>

              {/* Tray Simulator Grid */}
              {showTraySim && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '4px',
                    marginTop: '4px',
                    paddingTop: '6px',
                    borderTop: '1px dashed var(--glass-border)',
                  }}
                >
                  <button
                    type="button"
                    className="btn-pill"
                    onClick={() => handleTrayAction({ action: 'toggle_power' })}
                    style={{ fontSize: '9px', padding: '3px 5px' }}
                  >
                    <Power size={10} style={{ color: '#ef4444' }} />
                    <span>Power ({islandEnabled ? 'ON' : 'OFF'})</span>
                  </button>

                  <button
                    type="button"
                    className="btn-pill"
                    onClick={() => handleTrayAction({ action: 'switch_companion' })}
                    style={{ fontSize: '9px', padding: '3px 5px' }}
                  >
                    <Eye size={10} style={{ color: '#10b981' }} />
                    <span>Pet: {companionMode}</span>
                  </button>

                  <button
                    type="button"
                    className="btn-pill"
                    onClick={() => handleTrayAction({ action: 'toggle_lofi' })}
                    style={{ fontSize: '9px', padding: '3px 5px' }}
                  >
                    <Radio size={10} style={{ color: '#a855f7' }} />
                    <span>Lofi: {enableOptionalLofi ? 'ON' : 'OFF'}</span>
                  </button>

                  <button
                    type="button"
                    className="btn-pill"
                    onClick={() => handleTrayAction({ action: 'cycle_taskbar' })}
                    style={{ fontSize: '9px', padding: '3px 5px' }}
                  >
                    <Sliders size={10} style={{ color: '#ec4899' }} />
                    <span>Taskbar: {taskbarMode}</span>
                  </button>

                  <button
                    type="button"
                    className="btn-pill"
                    onClick={() => {
                      const count = monitors.length > 0 ? monitors.length : 1;
                      const next = (selectedMonitor + 1) % count;
                      systemStore.setSelectedMonitor(next);
                      safeInvoke('center_on_monitor', { monitorIndex: next });
                    }}
                    style={{ fontSize: '9px', padding: '3px 5px' }}
                  >
                    <Monitor size={10} style={{ color: '#8b5cf6' }} />
                    <span>Mon #{selectedMonitor}</span>
                  </button>

                  <button
                    type="button"
                    className="btn-pill"
                    onClick={() => handleTrayAction({ action: 'quit_app' })}
                    style={{ fontSize: '9px', padding: '3px 5px', color: '#f87171' }}
                  >
                    <X size={10} />
                    <span>Quit</span>
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      )}
    </div>
  );
};

export default App;
