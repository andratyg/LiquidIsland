import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStore, systemStore } from './store/useSystemStore';
import { playGlassPop, playWaterDrop, playToggleClick } from './utils/sfx';
import { IslandShell } from './components/IslandShell';
import { CompactView } from './components/CompactView';
import { CompanionStage } from './components/companions/CompanionStage';
import {
  Sun,
  Moon,
  Cpu,
  Volume2,
  VolumeX,
  Monitor,
  Activity,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Power,
  Eye,
  Minimize2,
  Radio,
  Sliders,
  X,
  Wrench,
  Cat,
  Smile,
  Headphones,
  Glasses,
  Upload,
  Heart,
  Palette,
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
  const autoAccessories = useSystemStore((s) => s.autoAccessories);
  const enableOptionalLofi = useSystemStore((s) => s.enableOptionalLofi);
  const taskbarMode = useSystemStore((s) => s.taskbarMode);
  const enableSfx = useSystemStore((s) => s.enableSfx);
  const selectedMonitor = useSystemStore((s) => s.selectedMonitor);

  const [ramWorkingSet, setRamWorkingSet] = useState<number | null>(null);
  const [monitors, setMonitors] = useState<string[]>([]);
  const [statusMsg, setStatusMsg] = useState<string>('Phase 4 Companions Active');
  const [isTrimming, setIsTrimming] = useState(false);
  const [showTraySim, setShowTraySim] = useState(false);
  const [showDevToolbar, setShowDevToolbar] = useState(false);

  // Companion Phase 4 Test Toggles
  const [testHeadphones, setTestHeadphones] = useState(false);
  const [testGlasses, setTestGlasses] = useState(false);
  const [testFileDrag, setTestFileDrag] = useState(false);
  const [testPetting, setTestPetting] = useState(false);

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
          setStatusMsg(`Taskbar Mode: Opsi ${currentTaskbar}`);
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

        case 'quit_app': {
          playToggleClick();
          setStatusMsg('Exiting LiquidIsland...');
          break;
        }

        default:
          console.warn('[Tray Event] Unrecognized action:', action);
      }
    },
    [syncTrayTooltip]
  );

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

  // Click-Through handling for floating Dev Toolbar
  const handleToolbarMouseEnter = useCallback(async () => {
    await safeInvoke('set_click_through', { ignore: false });
  }, []);

  const handleToolbarMouseLeave = useCallback(async () => {
    await safeInvoke('set_click_through', { ignore: true });
  }, []);

  // Determine active dimensions strictly matching ARCHITECTURE_LOCK
  const activeDimensions = !islandEnabled
    ? { width: 140, height: 26 }
    : ISLAND_DIMENSIONS[islandState] || ISLAND_DIMENSIONS['compact'];

  return (
    <div className={`island-canvas theme-${theme}`}>
      {/* ==================================================================== */}
      {/* Master 1:1 Dynamic Island Shell                                      */}
      {/* ==================================================================== */}
      <IslandShell activeDimensions={activeDimensions}>
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
              <CompanionStage
                testHeadphones={testHeadphones}
                testGlasses={testGlasses}
                testFileDrag={testFileDrag}
                testPetting={testPetting}
              />
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
          ) : (
            /* Fallback / Future Phase Placeholder */
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
      {/* Collapsible Floating Dev Toolbar (Bottom of Viewport)                */}
      {/* ==================================================================== */}
      <div
        onMouseEnter={handleToolbarMouseEnter}
        onMouseLeave={handleToolbarMouseLeave}
        style={{
          position: 'fixed',
          bottom: '8px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          zIndex: 100,
          pointerEvents: 'auto',
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
          title="Toggle Phase 3 Developer & Diagnostics Toolbar"
          style={{
            fontSize: '10px',
            padding: '3px 9px',
            backgroundColor: showDevToolbar ? 'rgba(59, 130, 246, 0.25)' : 'var(--pill-bg)',
            borderColor: showDevToolbar ? '#3b82f6' : 'var(--glass-border)',
          }}
        >
          <Wrench size={11} style={{ color: '#3b82f6' }} />
          <span>Dev Toolbar</span>
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
                maxWidth: '600px',
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
                    Phase 4 Companion Controls
                  </span>
                  <span>({statusMsg})</span>
                </div>
                <span>RAM: {ramWorkingSet ? `${ramWorkingSet.toFixed(1)} MB` : '~9.2 MB'}</span>
              </div>

              {/* Row 1: Island State & Theme Switching */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-pill"
                  onClick={() => {
                    playToggleClick();
                    systemStore.setIslandState('bezel-line');
                    setStatusMsg('State: Bezel-Line (136x6)');
                  }}
                  style={{
                    borderColor: islandState === 'bezel-line' ? '#38bdf8' : 'var(--glass-border)',
                    fontSize: '10px',
                    padding: '3px 7px',
                  }}
                >
                  <Minimize2 size={11} style={{ color: '#38bdf8' }} />
                  <span>Bezel-Line</span>
                </button>

                <button
                  type="button"
                  className="btn-pill"
                  onClick={() => {
                    playToggleClick();
                    systemStore.setIslandState('compact');
                    setStatusMsg('State: Compact (184x40)');
                  }}
                  style={{
                    borderColor: islandState === 'compact' ? '#10b981' : 'var(--glass-border)',
                    fontSize: '10px',
                    padding: '3px 7px',
                  }}
                >
                  <span>Compact</span>
                </button>

                <button
                  type="button"
                  className="btn-pill"
                  onClick={() => {
                    playToggleClick();
                    systemStore.setIslandState('eyes');
                    setStatusMsg('State: Eyes (168x40 Companion)');
                  }}
                  style={{
                    borderColor: islandState === 'eyes' ? '#ec4899' : 'var(--glass-border)',
                    fontSize: '10px',
                    padding: '3px 7px',
                  }}
                >
                  <Eye size={11} style={{ color: '#ec4899' }} />
                  <span>Eyes (Pet)</span>
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

                <button
                  type="button"
                  className="btn-pill"
                  onClick={() => {
                    playGlassPop();
                    setStatusMsg('Glass Pop SFX');
                  }}
                  style={{ fontSize: '10px', padding: '3px 7px' }}
                >
                  <Sparkles size={11} style={{ color: '#ec4899' }} />
                  <span>SFX</span>
                </button>

                <button
                  type="button"
                  className="btn-pill"
                  onClick={() => {
                    const next = !enableSfx;
                    systemStore.setEnableSfx(next);
                    if (next) playGlassPop();
                  }}
                  style={{ fontSize: '10px', padding: '3px 6px' }}
                  title="Toggle SFX Mute/Unmute"
                >
                  {enableSfx ? (
                    <Volume2 size={11} style={{ color: '#10b981' }} />
                  ) : (
                    <VolumeX size={11} style={{ color: '#ef4444' }} />
                  )}
                </button>

                <button
                  type="button"
                  className="btn-pill"
                  onClick={() => setShowTraySim((prev) => !prev)}
                  style={{
                    fontSize: '10px',
                    padding: '3px 7px',
                    backgroundColor: showTraySim ? 'rgba(59, 130, 246, 0.25)' : 'var(--pill-bg)',
                  }}
                >
                  <ChevronUp size={11} style={{ color: '#60a5fa' }} />
                  <span>Tray Sim</span>
                </button>
              </div>

              {/* Row 2: Companion Characters & Tint Color Swatches */}
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
                        border: companionColor === swatch.color ? '2px solid #ffffff' : '1px solid rgba(0,0,0,0.3)',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Row 3: Test Accessories & Reaction Triggers */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  flexWrap: 'wrap',
                  paddingTop: '3px',
                }}
              >
                <span style={{ fontSize: '9.5px', color: 'var(--text-secondary)', marginRight: '2px' }}>
                  Test Triggers:
                </span>

                <button
                  type="button"
                  className="btn-pill"
                  onClick={() => {
                    playToggleClick();
                    setTestHeadphones((prev) => {
                      const next = !prev;
                      setStatusMsg(`Test Headphones: ${next ? 'ON' : 'OFF'}`);
                      return next;
                    });
                  }}
                  style={{
                    fontSize: '9.5px',
                    padding: '2px 6px',
                    borderColor: testHeadphones ? '#3b82f6' : 'var(--glass-border)',
                  }}
                >
                  <Headphones size={10} style={{ color: '#3b82f6' }} />
                  <span>Headphones</span>
                </button>

                <button
                  type="button"
                  className="btn-pill"
                  onClick={() => {
                    playToggleClick();
                    setTestGlasses((prev) => {
                      const next = !prev;
                      setStatusMsg(`Test Glasses: ${next ? 'ON' : 'OFF'}`);
                      return next;
                    });
                  }}
                  style={{
                    fontSize: '9.5px',
                    padding: '2px 6px',
                    borderColor: testGlasses ? '#f59e0b' : 'var(--glass-border)',
                  }}
                >
                  <Glasses size={10} style={{ color: '#f59e0b' }} />
                  <span>Glasses</span>
                </button>

                <button
                  type="button"
                  className="btn-pill"
                  onClick={() => {
                    playToggleClick();
                    setTestFileDrag((prev) => {
                      const next = !prev;
                      setStatusMsg(`File Drag Anticipation: ${next ? 'ALERT' : 'IDLE'}`);
                      return next;
                    });
                  }}
                  style={{
                    fontSize: '9.5px',
                    padding: '2px 6px',
                    borderColor: testFileDrag ? '#ec4899' : 'var(--glass-border)',
                  }}
                >
                  <Upload size={10} style={{ color: '#ec4899' }} />
                  <span>File Catch</span>
                </button>

                <button
                  type="button"
                  className="btn-pill"
                  onClick={() => {
                    playToggleClick();
                    setTestPetting((prev) => {
                      const next = !prev;
                      setStatusMsg(`Petting Reaction: ${next ? 'ACTIVE (^ ^)' : 'IDLE'}`);
                      return next;
                    });
                  }}
                  style={{
                    fontSize: '9.5px',
                    padding: '2px 6px',
                    borderColor: testPetting ? '#f43f5e' : 'var(--glass-border)',
                  }}
                >
                  <Heart size={10} style={{ color: '#f43f5e' }} />
                  <span>Pet (^ ^)</span>
                </button>

                <button
                  type="button"
                  className="btn-pill"
                  onClick={() => {
                    playToggleClick();
                    const next = !autoAccessories;
                    systemStore.setAutoAccessories(next);
                    setStatusMsg(`Auto-Accessories: ${next ? 'ON' : 'OFF'}`);
                  }}
                  style={{
                    fontSize: '9.5px',
                    padding: '2px 6px',
                    borderColor: autoAccessories ? '#10b981' : 'var(--glass-border)',
                  }}
                >
                  <span>Auto-Acc: {autoAccessories ? 'ON' : 'OFF'}</span>
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
    </div>
  );
};

export default App;
