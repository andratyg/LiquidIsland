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
} from 'lucide-react';
import { ISLAND_DIMENSIONS } from './types/liquid';

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
  const theme = useSystemStore((s) => s.theme);
  const enableSfx = useSystemStore((s) => s.enableSfx);
  const selectedMonitor = useSystemStore((s) => s.selectedMonitor);
  const islandState = useSystemStore((s) => s.islandState);

  const [isHovered, setIsHovered] = useState(false);
  const [ramWorkingSet, setRamWorkingSet] = useState<number | null>(null);
  const [monitors, setMonitors] = useState<string[]>([]);
  const [statusMsg, setStatusMsg] = useState<string>('RAM Target ~10 MB');
  const [isTrimming, setIsTrimming] = useState(false);

  // Dynamic Cursor Click-Through management
  const handleMouseEnter = useCallback(async () => {
    setIsHovered(true);
    await safeInvoke('set_click_through', { ignore: false });
  }, []);

  const handleMouseLeave = useCallback(async () => {
    setIsHovered(false);
    await safeInvoke('set_click_through', { ignore: true });
  }, []);

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
      }
    }
    initSystem();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handler: Win32 Extreme RAM Trimmer
  const handleTrimRam = async (e: React.MouseEvent) => {
    e.stopPropagation();
    playWaterDrop();
    setIsTrimming(true);
    setStatusMsg('Flushing working set via Win32...');

    const result = await safeInvoke<number>('trim_ram_working_set');
    setIsTrimming(false);
    if (result !== null) {
      setRamWorkingSet(result);
      setStatusMsg(`Trimmed: ${result.toFixed(2)} MB`);
    } else {
      setStatusMsg('Simulated trim: ~9.8 MB');
    }
  };

  // Handler: Theme Toggle
  const handleToggleTheme = (e: React.MouseEvent) => {
    e.stopPropagation();
    playToggleClick();
    systemStore.toggleTheme();
  };

  // Handler: WebAudio Glass Pop SFX
  const handleTestSfx = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!enableSfx) {
      systemStore.setEnableSfx(true);
    }
    playGlassPop();
    setStatusMsg('WebAudio Glass-Pop synthesized');
  };

  // Handler: Toggle SFX Mute
  const handleToggleSfx = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !enableSfx;
    systemStore.setEnableSfx(next);
    if (next) playGlassPop();
  };

  // Handler: Multi-Monitor Switcher (centers at y: 0)
  const handleCycleMonitor = async (e: React.MouseEvent) => {
    e.stopPropagation();
    playToggleClick();
    const count = monitors.length > 0 ? monitors.length : 1;
    const nextIndex = (selectedMonitor + 1) % count;
    systemStore.setSelectedMonitor(nextIndex);
    await safeInvoke('center_on_monitor', { monitorIndex: nextIndex });
    setStatusMsg(`Centered on Monitor #${nextIndex}`);
  };

  // Determine current active dimensions based on locked specs
  const activeDimensions = isHovered
    ? { width: 560, height: 108 } // Diagnostic shell expanded overlay
    : ISLAND_DIMENSIONS[islandState] || ISLAND_DIMENSIONS['compact']; // 184px x 40px

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
          {!isHovered ? (
            // ================================================================
            // Compact Idle Notch Shell (184px × 40px)
            // ================================================================
            <motion.div
              key="compact-shell"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
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
                <Sparkles size={13} style={{ color: 'var(--text-secondary)' }} />
              </div>
            </motion.div>
          ) : (
            // ================================================================
            // Phase 1 Diagnostic Overlay Shell (Expanded on Hover)
            // ================================================================
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
                padding: '10px 16px',
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
                    Phase 1 Diagnostic Shell
                  </span>
                  <span
                    style={{
                      fontSize: '9px',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      color: '#10b981',
                      fontWeight: 600,
                    }}
                  >
                    OS v1
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

              {/* Action Toolbar: Theme, Win32 RAM Trim, SFX, Multi-Monitor */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '6px',
                }}
              >
                {/* 1. Theme Toggle */}
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

                {/* 2. Win32 RAM Trimmer (~10 MB target) */}
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
                      ? `RAM: ${ramWorkingSet.toFixed(1)} MB`
                      : 'Trim RAM (~10 MB)'}
                  </span>
                </button>

                {/* 3. Pure WebAudio SFX (Glass-Pop) */}
                <button
                  type="button"
                  className="btn-pill"
                  onClick={handleTestSfx}
                  title="Synthesize 0-RAM WebAudio Glass Pop"
                >
                  <Sparkles size={12} style={{ color: '#ec4899' }} />
                  <span>Glass Pop</span>
                </button>

                {/* 4. SFX Mute/Unmute */}
                <button
                  type="button"
                  className="btn-pill"
                  onClick={handleToggleSfx}
                  title="Toggle SFX Mute"
                  style={{ padding: '5px 8px' }}
                >
                  {enableSfx ? (
                    <Volume2 size={13} style={{ color: '#10b981' }} />
                  ) : (
                    <VolumeX size={13} style={{ color: '#ef4444' }} />
                  )}
                </button>

                {/* 5. Multi-Monitor Top-Center Positioning */}
                <button
                  type="button"
                  className="btn-pill"
                  onClick={handleCycleMonitor}
                  title="Cycle Top-Center (y: 0) on Available Monitors"
                >
                  <Monitor size={12} style={{ color: '#8b5cf6' }} />
                  <span>
                    Mon #{selectedMonitor}
                    {monitors.length > 1 ? ` (${monitors.length})` : ''}
                  </span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default App;
