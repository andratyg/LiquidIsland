import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStore, systemStore } from './store/useSystemStore';
import { playGlassPop, playWaterDrop, playToggleClick } from './utils/sfx';
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
  Power,
  Eye,
  Minimize2,
  Radio,
  Sliders,
  X,
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
      console.log(`[Browser Fallback] invoke("${cmd}", ${JSON.stringify(args)})`);
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
  const enableOptionalLofi = useSystemStore((s) => s.enableOptionalLofi);
  const taskbarMode = useSystemStore((s) => s.taskbarMode);
  const enableSfx = useSystemStore((s) => s.enableSfx);
  const selectedMonitor = useSystemStore((s) => s.selectedMonitor);

  const [isHovered, setIsHovered] = useState(false);
  const [ramWorkingSet, setRamWorkingSet] = useState<number | null>(null);
  const [monitors, setMonitors] = useState<string[]>([]);
  const [statusMsg, setStatusMsg] = useState<string>('Tray Active (^)');
  const [isTrimming, setIsTrimming] = useState(false);
  const [showTraySim, setShowTraySim] = useState(false);

  // Dynamic Cursor Click-Through management
  const handleMouseEnter = useCallback(async () => {
    setIsHovered(true);
    await safeInvoke('set_click_through', { ignore: false });
  }, []);

  const handleMouseLeave = useCallback(async () => {
    setIsHovered(false);
    setShowTraySim(false);
    await safeInvoke('set_click_through', { ignore: true });
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

  // Handler: Manual RAM Trim
  const handleTrimRam = async (e: React.MouseEvent) => {
    e.stopPropagation();
    handleTrayAction({ action: 'trim_ram' });
  };

  // Handler: Theme Toggle
  const handleToggleTheme = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleTrayAction({ action: 'switch_theme' });
  };

  // Handler: WebAudio Glass Pop SFX
  const handleTestSfx = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!enableSfx) {
      systemStore.setEnableSfx(true);
    }
    playGlassPop();
    setStatusMsg('Glass-Pop Synthesized');
  };

  // Handler: Toggle SFX Mute
  const handleToggleSfx = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !enableSfx;
    systemStore.setEnableSfx(next);
    if (next) playGlassPop();
  };

  // Handler: Multi-Monitor Switcher
  const handleCycleMonitor = async (e: React.MouseEvent) => {
    e.stopPropagation();
    playToggleClick();
    const count = monitors.length > 0 ? monitors.length : 1;
    const nextIndex = (selectedMonitor + 1) % count;
    systemStore.setSelectedMonitor(nextIndex);
    await safeInvoke('center_on_monitor', { monitorIndex: nextIndex });
    setStatusMsg(`Monitor #${nextIndex}`);
  };

  // Determine active dimensions strictly matching ARCHITECTURE_LOCK
  const baseDimensions = ISLAND_DIMENSIONS[islandState] || ISLAND_DIMENSIONS['compact'];
  const activeDimensions = !islandEnabled
    ? { width: 140, height: 26 } // Subtle disabled pill indicator
    : isHovered
    ? showTraySim
      ? { width: 580, height: 212 } // Expanded to host Tray Simulator menu
      : { width: 580, height: 112 } // Standard diagnostic toolbar
    : baseDimensions;

  return (
    <div className={`island-canvas theme-${theme}`}>
      <motion.div
        className="island-shell"
        initial={false}
        animate={{
          width: activeDimensions.width,
          height: activeDimensions.height,
        }}
        transition={{
          type: 'spring',
          stiffness: 420,
          damping: 34,
          mass: 0.8,
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          margin: '0 auto',
          position: 'relative',
        }}
      >
        <AnimatePresence mode="wait">
          {/* ================================================================ */}
          {/* 1. Power Disabled Standby Pill                                    */}
          {/* ================================================================ */}
          {!islandEnabled ? (
            <motion.div
              key="disabled-shell"
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
          ) : !isHovered ? (
            /* ============================================================== */
            /* 2. Unhovered Dynamic States (Bezel-Line, Compact, Expanded)     */
            /* ============================================================== */
            islandState === 'bezel-line' ? (
              // Stealth Bezel Line (136px × 6px)
              <motion.div
                key="bezel-line"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '3px',
                  background: 'var(--glass-surface)',
                  boxShadow: '0 0 8px var(--blue-glow)',
                  cursor: 'pointer',
                }}
                title="Stealth Bezel Active (136x6). Hover to expand."
              />
            ) : (
              // Default Compact Idle Notch Shell (184px × 40px)
              <motion.div
                key="compact-shell"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={() => handleTrayAction({ action: 'toggle_expand' })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  height: '100%',
                  padding: '0 14px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      position: 'relative',
                      display: 'flex',
                      height: '8px',
                      width: '8px',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        display: 'inline-flex',
                        height: '100%',
                        width: '100%',
                        borderRadius: '50%',
                        backgroundColor: '#10b981',
                        opacity: 0.75,
                        animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
                      }}
                    />
                    <span
                      style={{
                        position: 'relative',
                        display: 'inline-flex',
                        borderRadius: '50%',
                        height: '8px',
                        width: '8px',
                        backgroundColor: '#10b981',
                      }}
                    />
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      letterSpacing: '0.3px',
                      color: 'var(--text-primary)',
                    }}
                  >
                    LiquidIsland
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {ramWorkingSet !== null && (
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 500,
                        color: 'var(--text-secondary)',
                        backgroundColor: 'var(--pill-bg)',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {ramWorkingSet.toFixed(1)}M
                    </span>
                  )}
                  <span title="System Tray (^) Integrated">
                    <ChevronUp
                      size={13}
                      style={{ color: 'var(--text-secondary)' }}
                    />
                  </span>
                </div>
              </motion.div>
            )
          ) : (
            /* ============================================================== */
            /* 3. Phase 2 Diagnostic Shell (Expanded on Hover)                 */
            /* ============================================================== */
            <motion.div
              key="diagnostic-shell"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                height: '100%',
                padding: '10px 14px',
                gap: '8px',
                justifyContent: 'space-between',
              }}
            >
              {/* Header: Title & Real-time Diagnostic Status */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid var(--glass-border)',
                  paddingBottom: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <Activity size={13} style={{ color: '#10b981' }} />
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                      color: 'var(--text-primary)',
                    }}
                  >
                    Phase 2: Tray (^) Shell
                  </span>
                  <span
                    style={{
                      fontSize: '9px',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(59, 130, 246, 0.15)',
                      color: '#60a5fa',
                      fontWeight: 600,
                    }}
                  >
                    Native Win32
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      color: 'var(--text-secondary)',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                    }}
                  >
                    {statusMsg}
                  </span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '6px',
                }}
              >
                {/* 1. Tray Menu Simulator Dropdown Toggle */}
                <button
                  type="button"
                  className="btn-pill"
                  onClick={() => setShowTraySim((prev) => !prev)}
                  title="Simulate Native Windows System Tray (^) Context Menu"
                  style={{
                    backgroundColor: showTraySim
                      ? 'rgba(59, 130, 246, 0.25)'
                      : 'var(--pill-bg)',
                    borderColor: showTraySim ? '#3b82f6' : 'var(--glass-border)',
                  }}
                >
                  <ChevronUp size={12} style={{ color: '#60a5fa' }} />
                  <span>Tray Menu (^)</span>
                </button>

                {/* 2. Theme Toggle */}
                <button
                  type="button"
                  className="btn-pill"
                  onClick={handleToggleTheme}
                  title="Toggle Dark / Light Liquid Glass Theme"
                >
                  {theme === 'dark' ? (
                    <Moon size={12} style={{ color: '#93c5fd' }} />
                  ) : (
                    <Sun size={12} style={{ color: '#f59e0b' }} />
                  )}
                  <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
                </button>

                {/* 3. Win32 RAM Trimmer */}
                <button
                  type="button"
                  className="btn-pill"
                  onClick={handleTrimRam}
                  title="Invoke Win32 K32EmptyWorkingSet + SetProcessWorkingSetSizeEx"
                  style={{
                    borderColor:
                      ramWorkingSet && ramWorkingSet <= 12
                        ? 'rgba(16, 185, 129, 0.4)'
                        : 'var(--glass-border)',
                  }}
                >
                  <Cpu
                    size={12}
                    className={isTrimming ? 'animate-spin' : ''}
                    style={{ color: '#3b82f6' }}
                  />
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {ramWorkingSet !== null
                      ? `${ramWorkingSet.toFixed(1)} MB`
                      : 'Trim RAM'}
                  </span>
                </button>

                {/* 4. Pure WebAudio SFX */}
                <button
                  type="button"
                  className="btn-pill"
                  onClick={handleTestSfx}
                  title="Synthesize 0-RAM WebAudio Glass Pop"
                >
                  <Sparkles size={12} style={{ color: '#ec4899' }} />
                  <span>SFX</span>
                </button>

                {/* 5. SFX Mute/Unmute */}
                <button
                  type="button"
                  className="btn-pill"
                  onClick={handleToggleSfx}
                  title="Toggle SFX Mute"
                  style={{ padding: '5px 7px' }}
                >
                  {enableSfx ? (
                    <Volume2 size={12} style={{ color: '#10b981' }} />
                  ) : (
                    <VolumeX size={12} style={{ color: '#ef4444' }} />
                  )}
                </button>

                {/* 6. Multi-Monitor */}
                <button
                  type="button"
                  className="btn-pill"
                  onClick={handleCycleMonitor}
                  title="Cycle Top-Center (y: 0) on Available Monitors"
                >
                  <Monitor size={12} style={{ color: '#8b5cf6' }} />
                  <span>Mon #{selectedMonitor}</span>
                </button>
              </div>

              {/* ============================================================ */}
              {/* Tray Context Menu Simulator Popover                          */}
              {/* ============================================================ */}
              {showTraySim && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    padding: '8px',
                    borderRadius: '8px',
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid var(--glass-border)',
                  }}
                >
                  {/* Tray Tooltip Preview Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '10px',
                      color: 'var(--text-secondary)',
                      paddingBottom: '4px',
                      borderBottom: '1px dashed var(--glass-border)',
                    }}
                  >
                    <span>
                      Tooltip: LiquidIsland OS - Active (~
                      {ramWorkingSet ? ramWorkingSet.toFixed(1) : '9.2'} MB RAM)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowTraySim(false)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)',
                        padding: 0,
                      }}
                    >
                      <X size={11} />
                    </button>
                  </div>

                  {/* Context Menu Items Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '4px',
                      marginTop: '2px',
                    }}
                  >
                    {/* Item 1: toggle_power */}
                    <button
                      type="button"
                      className="btn-pill"
                      onClick={() => handleTrayAction({ action: 'toggle_power' })}
                      style={{ fontSize: '10px', padding: '4px 6px' }}
                    >
                      <Power size={11} style={{ color: '#ef4444' }} />
                      <span>Power ({islandEnabled ? 'ON' : 'OFF'})</span>
                    </button>

                    {/* Item 2: stealth_bezel */}
                    <button
                      type="button"
                      className="btn-pill"
                      onClick={() => handleTrayAction({ action: 'stealth_bezel' })}
                      style={{ fontSize: '10px', padding: '4px 6px' }}
                    >
                      <Minimize2 size={11} style={{ color: '#38bdf8' }} />
                      <span>Stealth Bezel</span>
                    </button>

                    {/* Item 3: switch_theme */}
                    <button
                      type="button"
                      className="btn-pill"
                      onClick={() => handleTrayAction({ action: 'switch_theme' })}
                      style={{ fontSize: '10px', padding: '4px 6px' }}
                    >
                      <Sun size={11} style={{ color: '#f59e0b' }} />
                      <span>Theme: {theme}</span>
                    </button>

                    {/* Item 4: switch_companion */}
                    <button
                      type="button"
                      className="btn-pill"
                      onClick={() => handleTrayAction({ action: 'switch_companion' })}
                      style={{ fontSize: '10px', padding: '4px 6px' }}
                    >
                      <Eye size={11} style={{ color: '#10b981' }} />
                      <span>Pet: {companionMode}</span>
                    </button>

                    {/* Item 5: toggle_lofi */}
                    <button
                      type="button"
                      className="btn-pill"
                      onClick={() => handleTrayAction({ action: 'toggle_lofi' })}
                      style={{ fontSize: '10px', padding: '4px 6px' }}
                    >
                      <Radio size={11} style={{ color: '#a855f7' }} />
                      <span>Lofi: {enableOptionalLofi ? 'ON' : 'OFF'}</span>
                    </button>

                    {/* Item 6: cycle_taskbar */}
                    <button
                      type="button"
                      className="btn-pill"
                      onClick={() => handleTrayAction({ action: 'cycle_taskbar' })}
                      style={{ fontSize: '10px', padding: '4px 6px' }}
                    >
                      <Sliders size={11} style={{ color: '#ec4899' }} />
                      <span>Taskbar: {taskbarMode}</span>
                    </button>

                    {/* Left-Click action */}
                    <button
                      type="button"
                      className="btn-pill"
                      onClick={() => handleTrayAction({ action: 'toggle_expand' })}
                      style={{ fontSize: '10px', padding: '4px 6px' }}
                    >
                      <ChevronUp size={11} style={{ color: '#10b981' }} />
                      <span>Left-Click (Toggle)</span>
                    </button>

                    {/* Item 8: trim_ram */}
                    <button
                      type="button"
                      className="btn-pill"
                      onClick={() => handleTrayAction({ action: 'trim_ram' })}
                      style={{ fontSize: '10px', padding: '4px 6px' }}
                    >
                      <Cpu size={11} style={{ color: '#3b82f6' }} />
                      <span>Trim RAM Now</span>
                    </button>

                    {/* Item 9: quit_app */}
                    <button
                      type="button"
                      className="btn-pill"
                      onClick={() => handleTrayAction({ action: 'quit_app' })}
                      style={{
                        fontSize: '10px',
                        padding: '4px 6px',
                        color: '#f87171',
                      }}
                    >
                      <X size={11} />
                      <span>Quit Island</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default App;
