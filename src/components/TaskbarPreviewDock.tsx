import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStore, systemStore } from '../store/useSystemStore';
import {
  playToggleClick,
  playGlassPop,
  playWaterDrop,
} from '../utils/sfx';
import {
  Search,
  ChevronUp,
  Wifi,
  Volume2,
  BatteryCharging,
  Sliders,
  Folder,
  Music,
  Code2,
  Terminal,
  Globe,
  Settings,
  Power,
  Eye,
  Radio,
  Cpu,
  ShieldCheck,
  Cloud,
  Bluetooth,
  Maximize2,
  Minimize2,
  Layers,
  Zap,
} from 'lucide-react';
import { RunningAppInfo } from '../types/liquid';

interface TaskbarPreviewDockProps {
  onOpenSettings?: () => void;
  onOpenSpotlight?: () => void;
  onTrayAction?: (action: string) => void;
}

// Safe IPC Invoker with fallback
async function safeInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T | null> {
  try {
    const isTauri =
      typeof window !== 'undefined' &&
      ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
    if (!isTauri) return null;
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<T>(cmd, args);
  } catch (err) {
    console.warn(`[Tauri IPC] "${cmd}" returned:`, err);
    return null;
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
  } catch (err) {
    console.warn(`[Tauri Event] "${event}" emit error:`, err);
  }
}

export const TaskbarPreviewDock: React.FC<TaskbarPreviewDockProps> = ({
  onOpenSettings,
  onOpenSpotlight,
  onTrayAction,
}) => {
  const taskbarMode = useSystemStore((s) => s.taskbarMode);
  const theme = useSystemStore((s) => s.theme);
  const islandEnabled = useSystemStore((s) => s.islandEnabled);
  const companionMode = useSystemStore((s) => s.companionMode);
  const enableOptionalLofi = useSystemStore((s) => s.enableOptionalLofi);
  const isWindowMaximizedSimulated = useSystemStore((s) => s.isWindowMaximizedSimulated);
  const workspaceActivity = useSystemStore((s) => s.workspaceActivity);

  // Real Windows Battery & Hardware Status
  const batteryLevel = useSystemStore((s) => s.batteryLevel ?? 84);
  const isCharging = useSystemStore((s) => s.isCharging ?? true);

  const [showTrayFlyout, setShowTrayFlyout] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [isDockHovered, setIsDockHovered] = useState(true);
  const [runningApps, setRunningApps] = useState<RunningAppInfo[]>([]);

  const flyoutRef = useRef<HTMLDivElement>(null);

  // 1. Hide Native Windows Taskbar on mount, restore on unmount
  useEffect(() => {
    safeInvoke('set_native_taskbar_hidden', { hidden: true });
    return () => {
      safeInvoke('set_native_taskbar_hidden', { hidden: false });
    };
  }, []);

  // 2. Listen to background cursor proximity auto-hide events from taskbar.rs
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let isMounted = true;

    async function initDockListener() {
      const isTauri =
        typeof window !== 'undefined' &&
        ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
      if (!isTauri) return;

      try {
        const { listen } = await import('@tauri-apps/api/event');
        if (!isMounted) return;
        const sub = await listen<boolean>('dock-hover-state', (event) => {
          setIsDockHovered(event.payload);
        });
        unlisten = sub;
      } catch (err) {
        console.warn('[Dock Proximity] Listener error:', err);
      }
    }

    initDockListener();

    return () => {
      isMounted = false;
      if (unlisten) unlisten();
    };
  }, []);

  // 3. Poll and synchronize real running Windows apps
  const fetchRunningApps = useCallback(async () => {
    const apps = await safeInvoke<RunningAppInfo[]>('get_running_apps');
    if (apps && Array.isArray(apps)) {
      setRunningApps(apps);
    }
  }, []);

  useEffect(() => {
    fetchRunningApps();
    const interval = setInterval(fetchRunningApps, 1500);
    return () => clearInterval(interval);
  }, [fetchRunningApps]);

  // Re-fetch running apps immediately on workspace tab/app switch
  useEffect(() => {
    if (workspaceActivity) {
      fetchRunningApps();
    }
  }, [workspaceActivity, fetchRunningApps]);

  // Click-Through toggle helper for bottom dock
  const handleDockMouseEnter = useCallback(() => {
    setIsDockHovered(true);
    safeInvoke('set_dock_click_through', { ignore: false });
  }, []);

  const handleDockMouseLeave = useCallback(() => {
    safeInvoke('set_dock_click_through', { ignore: true });
  }, []);

  // Synchronized Win32 Digital Clock & Date
  useEffect(() => {
    function updateClock() {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      );
      setDateStr(
        now.toLocaleDateString([], {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })
      );
    }
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close flyout and context menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        flyoutRef.current &&
        !flyoutRef.current.contains(e.target as Node)
      ) {
        setShowTrayFlyout(false);
        setShowContextMenu(false);
      }
    }
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const effectiveMode =
    taskbarMode === 'C'
      ? isWindowMaximizedSimulated
        ? 'A'
        : 'B'
      : taskbarMode;

  const handleAction = (act: string) => {
    if (onTrayAction) {
      onTrayAction(act);
    } else {
      switch (act) {
        case 'toggle_power':
          systemStore.toggleIslandEnabled();
          break;
        case 'stealth_bezel':
          systemStore.setIslandState('bezel-line');
          break;
        case 'switch_theme':
          systemStore.toggleTheme();
          break;
        case 'switch_companion':
          systemStore.cycleCompanionMode();
          break;
        case 'toggle_lofi':
          systemStore.toggleOptionalLofi();
          break;
        case 'open_settings':
          if (onOpenSettings) onOpenSettings();
          else safeEmit('open-settings');
          break;
        case 'trim_ram':
          playWaterDrop();
          safeInvoke('trim_ram_working_set');
          break;
      }
    }
    setShowContextMenu(false);
    setShowTrayFlyout(false);
  };

  const triggerOpenSpotlight = () => {
    playGlassPop();
    if (onOpenSpotlight) onOpenSpotlight();
    safeEmit('open-spotlight');
  };

  const triggerOpenSettings = () => {
    playGlassPop();
    if (onOpenSettings) onOpenSettings();
    safeEmit('open-settings');
  };

  // Helper for dynamic app icon rendering
  const renderAppIconGraphic = (hint: string) => {
    switch (hint) {
      case 'chrome':
        return <Globe size={17} style={{ color: '#4285f4' }} />;
      case 'edge':
        return <Globe size={17} style={{ color: '#0078d7' }} />;
      case 'brave':
        return <Globe size={17} style={{ color: '#fb542b' }} />;
      case 'firefox':
        return <Globe size={17} style={{ color: '#ff7139' }} />;
      case 'code':
        return <Code2 size={17} style={{ color: '#007acc' }} />;
      case 'cursor':
        return <Code2 size={17} style={{ color: '#8b5cf6' }} />;
      case 'antigravity':
        return <Zap size={17} style={{ color: '#6366f1' }} />;
      case 'terminal':
        return <Terminal size={16} style={{ color: '#4ade80' }} />;
      case 'explorer':
        return <Folder size={17} style={{ color: '#f59e0b' }} />;
      case 'spotify':
        return <Music size={17} style={{ color: '#22c55e' }} />;
      case 'youtube':
        return <Music size={17} style={{ color: '#ef4444' }} />;
      case 'discord':
        return <Layers size={17} style={{ color: '#5865f2' }} />;
      case 'slack':
        return <Layers size={17} style={{ color: '#e01e5a' }} />;
      default:
        return <Zap size={16} style={{ color: '#38bdf8' }} />;
    }
  };

  // Main Dock Section: Windows 11 Start, Search Pill, Divider, Live Running Apps & Tools
  const renderMainDockCapsule = () => (
    <>
      {/* 1. Real Windows 11 Start Button */}
      <button
        type="button"
        className="dock-app-icon"
        onClick={() => {
          playToggleClick();
          safeInvoke('launch_system_action', { action: 'start_menu' });
        }}
        title="Windows 11 Start Menu"
        style={{ width: '38px', height: '38px' }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '2.5px',
            width: '14px',
            height: '14px',
          }}
        >
          <div style={{ background: '#38bdf8', borderRadius: '1.5px', boxShadow: '0 0 5px rgba(56, 189, 248, 0.55)' }} />
          <div style={{ background: '#38bdf8', borderRadius: '1.5px', boxShadow: '0 0 5px rgba(56, 189, 248, 0.55)' }} />
          <div style={{ background: '#38bdf8', borderRadius: '1.5px', boxShadow: '0 0 5px rgba(56, 189, 248, 0.55)' }} />
          <div style={{ background: '#38bdf8', borderRadius: '1.5px', boxShadow: '0 0 5px rgba(56, 189, 248, 0.55)' }} />
        </div>
      </button>

      {/* 2. Compact Search Pill */}
      <button
        type="button"
        onClick={triggerOpenSpotlight}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          height: '34px',
          padding: '0 10px',
          borderRadius: '9999px',
          background: 'rgba(255, 255, 255, 0.06)',
          border: '1px solid rgba(255, 255, 255, 0.09)',
          color: 'var(--text-secondary)',
          fontSize: '11px',
          cursor: 'pointer',
          transition: 'background-color 0.15s ease',
        }}
        title="Quick Search & Omni Spotlight (Alt + Space)"
      >
        <Search size={13} style={{ color: '#38bdf8' }} />
        <span style={{ fontWeight: 500 }}>Search</span>
        <span
          style={{
            fontSize: '9px',
            padding: '1.5px 5.5px',
            borderRadius: '4px',
            background: 'rgba(255, 255, 255, 0.12)',
            color: 'var(--text-secondary)',
            fontWeight: 600,
          }}
        >
          Alt+Space
        </span>
      </button>

      {/* 3. Subtle Vertical Divider */}
      <div
        style={{
          width: '1px',
          height: '22px',
          backgroundColor: 'rgba(255, 255, 255, 0.12)',
          margin: '0 2px',
        }}
      />

      {/* 4. Live Running Windows Apps List */}
      {runningApps.map((app) => (
        <button
          key={`running-app-${app.hwnd}`}
          type="button"
          className={`dock-app-icon ${app.is_focused ? 'active' : ''}`}
          onClick={() => {
            playGlassPop();
            safeInvoke('focus_or_toggle_app', { hwnd: app.hwnd });
            fetchRunningApps();
          }}
          title={app.title}
        >
          {renderAppIconGraphic(app.icon_hint)}
          {app.is_focused ? (
            <span className="dock-app-dot-active" />
          ) : (
            <span className="dock-app-dot-running" />
          )}
        </button>
      ))}

      {/* Fallback default launch icons if no user apps are active */}
      {runningApps.length === 0 && (
        <>
          <button
            type="button"
            className="dock-app-icon"
            onClick={() => safeInvoke('launch_system_action', { action: 'browser' })}
            title="Launch Web Browser"
          >
            <Globe size={17} style={{ color: '#38bdf8' }} />
          </button>
          <button
            type="button"
            className="dock-app-icon"
            onClick={() => safeInvoke('launch_system_action', { action: 'explorer' })}
            title="Launch File Explorer"
          >
            <Folder size={17} style={{ color: '#f59e0b' }} />
          </button>
          <button
            type="button"
            className="dock-app-icon"
            onClick={() => safeInvoke('launch_system_action', { action: 'terminal' })}
            title="Launch Windows Terminal"
          >
            <Terminal size={16} style={{ color: '#4ade80' }} />
          </button>
        </>
      )}

      {/* 5. Subtle Divider before Settings */}
      <div
        style={{
          width: '1px',
          height: '22px',
          backgroundColor: 'rgba(255, 255, 255, 0.12)',
          margin: '0 2px',
        }}
      />

      {/* 6. Settings Dashboard Launcher */}
      <button
        type="button"
        className="dock-app-icon"
        onClick={triggerOpenSettings}
        title="Settings Dashboard & Character Studio"
      >
        <Settings size={16} style={{ color: '#a855f7' }} />
      </button>
    </>
  );

  // Right System Tray Capsule: Flyout Chevron, Wi-Fi, Audio, Battery & Clock
  const renderTrayCapsule = () => (
    <>
      {/* Hidden Icons (^) Chevron Button */}
      <button
        type="button"
        className="dock-app-icon"
        style={{ width: '28px', height: '34px', borderRadius: '8px' }}
        onClick={() => {
          playToggleClick();
          setShowTrayFlyout((prev) => !prev);
          setShowContextMenu(false);
        }}
        title="Show Hidden Icons (^)"
      >
        <ChevronUp
          size={14}
          style={{
            transform: showTrayFlyout ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        />
      </button>

      {/* Wi-Fi Icon */}
      <button
        type="button"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px',
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
        }}
        title="Wi-Fi: Connected (High Speed)"
      >
        <Wifi size={14} style={{ color: '#38bdf8' }} />
      </button>

      {/* Volume Indicator */}
      <button
        type="button"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px',
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
        }}
        onClick={() => {
          playGlassPop();
          systemStore.triggerToast('hud', {
            hudType: 'volume',
            hudValue: 75,
            title: 'Volume',
            subtitle: '75%',
          });
        }}
        title="Volume: 75%"
      >
        <Volume2 size={14} />
      </button>

      {/* Real Windows Battery Indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
          fontSize: '10.5px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          cursor: 'pointer',
          padding: '2px 5px',
          borderRadius: '6px',
          background: 'rgba(255, 255, 255, 0.06)',
        }}
        onClick={() => {
          playGlassPop();
          if (isCharging) {
            systemStore.showChargingToast(batteryLevel);
          } else {
            systemStore.showUnpluggedToast(batteryLevel);
          }
        }}
        title={`Battery: ${batteryLevel}% (${isCharging ? 'Charging' : 'On Battery'})`}
      >
        <BatteryCharging size={13} style={{ color: isCharging ? '#22c55e' : '#38bdf8' }} />
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{batteryLevel}%</span>
      </div>

      {/* Digital Clock & Date */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          justifyContent: 'center',
          paddingLeft: '6px',
          borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
          lineHeight: 1.15,
          cursor: 'pointer',
        }}
        onClick={() => {
          playToggleClick();
          systemStore.triggerToast('hud', {
            title: 'Notification Center',
            subtitle: `${dateStr} · LiquidIsland Active`,
          });
        }}
        title="Windows Notification Center"
      >
        <span style={{ fontSize: '11px', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          {timeStr || '13:00'}
        </span>
        <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>
          {dateStr || 'Sun, 25 Oct'}
        </span>
      </div>
    </>
  );

  return (
    <div
      ref={flyoutRef}
      style={{
        position: 'relative',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        pointerEvents: 'none',
      }}
    >
      {/* ================================================================== */}
      {/* TASKBAR MODE RENDERING: OPTION A vs OPTION B (CENTERED LUXURY)     */}
      {/* ================================================================== */}
      {effectiveMode === 'A' ? (
        /* OPTION A: Full-Width Bottom Crystal Bar */
        <motion.div
          key="taskbar-full-width"
          onMouseEnter={handleDockMouseEnter}
          onMouseLeave={handleDockMouseLeave}
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: isDockHovered ? 0 : 38, opacity: isDockHovered ? 1 : 0.85 }}
          exit={{ y: 50, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="liquid-taskbar-full"
          style={{ pointerEvents: 'auto' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {renderMainDockCapsule()}
          </div>

          <div
            style={{
              fontSize: '10px',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {taskbarMode === 'C' && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  background: 'rgba(59, 130, 246, 0.2)',
                  color: '#60a5fa',
                  fontSize: '9.5px',
                  fontWeight: 600,
                }}
              >
                <Maximize2 size={10} />
                <span>Maximized Morph (Option C)</span>
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {renderTrayCapsule()}
          </div>
        </motion.div>
      ) : (
        /* OPTION B: Centered Luxury 2-Capsule Floating OLED Glass Dock */
        <motion.div
          className="liquid-dock-container"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: isDockHovered ? 0 : 38, opacity: isDockHovered ? 1 : 0.85 }}
          transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          style={{ pointerEvents: 'none' }}
        >
          {/* Main App Dock Capsule */}
          <div
            onMouseEnter={handleDockMouseEnter}
            onMouseLeave={handleDockMouseLeave}
            className="liquid-dock-capsule"
          >
            {renderMainDockCapsule()}
          </div>

          {/* Adjacent System Tray Capsule */}
          <div
            style={{ position: 'relative' }}
            onMouseEnter={handleDockMouseEnter}
            onMouseLeave={handleDockMouseLeave}
          >
            <div className="liquid-dock-capsule">
              {renderTrayCapsule()}
            </div>

            {/* Interactive 3x3 Glass System Tray Flyout */}
            <AnimatePresence>
              {showTrayFlyout && (
                <motion.div
                  key="tray-flyout"
                  initial={{ opacity: 0, scale: 0.92, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: 12 }}
                  transition={{ duration: 0.16 }}
                  className="tray-flyout-panel"
                  style={{
                    position: 'absolute',
                    bottom: '60px',
                    right: 0,
                    pointerEvents: 'auto',
                  }}
                >
                  <div
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>Hidden Icons</span>
                    <span style={{ fontSize: '9px', color: '#38bdf8' }}>Windows 11 Glass</span>
                  </div>

                  {/* 3x3 Tray Grid */}
                  <div className="tray-grid-3x3">
                    <div
                      className="tray-grid-item active"
                      onClick={() => {
                        playGlassPop();
                        setShowContextMenu((prev) => !prev);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        playGlassPop();
                        setShowContextMenu(true);
                      }}
                      title="LiquidIsland OS — Click or Right-Click for Full Context Menu"
                    >
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 0 8px rgba(59, 130, 246, 0.7)',
                        }}
                      >
                        <div
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: '#ffffff',
                          }}
                        />
                      </div>
                      <span style={{ fontWeight: 600 }}>LiquidOS</span>
                    </div>

                    <div
                      className="tray-grid-item"
                      onClick={() => handleAction('onedrive')}
                      title="OneDrive: Up to date"
                    >
                      <Cloud size={16} style={{ color: '#60a5fa' }} />
                      <span>Cloud</span>
                    </div>

                    <div
                      className="tray-grid-item"
                      onClick={() => handleAction('bluetooth')}
                      title="Bluetooth: Devices Paired"
                    >
                      <Bluetooth size={16} style={{ color: '#3b82f6' }} />
                      <span>Bluetooth</span>
                    </div>

                    <div
                      className="tray-grid-item"
                      onClick={() => handleAction('security')}
                      title="Windows Defender: Protected"
                    >
                      <ShieldCheck size={16} style={{ color: '#10b981' }} />
                      <span>Security</span>
                    </div>

                    <div
                      className="tray-grid-item"
                      onClick={() => handleAction('gpu')}
                      title="GPU: High Performance Profile"
                    >
                      <Cpu size={16} style={{ color: '#22c55e' }} />
                      <span>NVIDIA</span>
                    </div>

                    <div
                      className="tray-grid-item"
                      onClick={triggerOpenSettings}
                      title="Open Settings Dashboard"
                    >
                      <Sliders size={16} style={{ color: '#a855f7' }} />
                      <span>Settings</span>
                    </div>

                    <div
                      className="tray-grid-item"
                      onClick={() => handleAction('switch_companion')}
                      title={`Companion: ${companionMode.toUpperCase()}`}
                    >
                      <Eye size={16} style={{ color: '#ec4899' }} />
                      <span>{companionMode}</span>
                    </div>

                    <div
                      className="tray-grid-item"
                      onClick={() => handleAction('toggle_lofi')}
                      title={`Lofi Focus: ${enableOptionalLofi ? 'ON' : 'OFF'}`}
                    >
                      <Radio size={16} style={{ color: '#f59e0b' }} />
                      <span>Lofi</span>
                    </div>

                    <div
                      className="tray-grid-item"
                      onClick={() => handleAction('trim_ram')}
                      title="Flush Working Set (~10 MB RAM)"
                    >
                      <Zap size={16} style={{ color: '#38bdf8' }} />
                      <span>Trim RAM</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* ================================================================== */}
      {/* NATIVE-STYLE LIQUIDISLAND CONTEXT MENU                             */}
      {/* ================================================================== */}
      <AnimatePresence>
        {showContextMenu && (
          <motion.div
            key="tray-context-menu"
            onMouseEnter={handleDockMouseEnter}
            onMouseLeave={handleDockMouseLeave}
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ duration: 0.15 }}
            className="tray-context-menu"
            style={{
              bottom: '68px',
              right: 'calc(50% - 140px)',
              pointerEvents: 'auto',
            }}
          >
            <div
              style={{
                padding: '6px 10px 4px',
                borderBottom: '1px solid var(--glass-border)',
                marginBottom: '4px',
                fontSize: '10px',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                LiquidIsland OS v1.0
              </span>
              <span style={{ color: '#10b981' }}>● Active</span>
            </div>

            <div
              className="tray-menu-item"
              onClick={() => handleAction('toggle_power')}
            >
              <Power
                size={13}
                style={{ color: islandEnabled ? '#10b981' : '#ef4444' }}
              />
              <span>
                {islandEnabled ? 'Nonaktifkan Island (Standby)' : 'Aktifkan Island (On)'}
              </span>
            </div>

            <div
              className="tray-menu-item"
              onClick={() => handleAction('stealth_bezel')}
            >
              <Minimize2 size={13} style={{ color: '#38bdf8' }} />
              <span>Sembunyikan ke Garis Bezel (Stealth)</span>
            </div>

            <div
              className="tray-menu-item"
              onClick={() => handleAction('switch_theme')}
            >
              <Layers size={13} style={{ color: '#60a5fa' }} />
              <span>
                Ganti Tema: {theme === 'dark' ? 'Light Quartz' : 'Dark Obsidian'}
              </span>
            </div>

            <div
              className="tray-menu-item"
              onClick={() => handleAction('switch_companion')}
            >
              <Eye size={13} style={{ color: '#ec4899' }} />
              <span>Ganti Karakter: Slime / Cat / Eyes</span>
            </div>

            <div
              className="tray-menu-item"
              onClick={() => handleAction('toggle_lofi')}
            >
              <Radio size={13} style={{ color: '#f59e0b' }} />
              <span>
                Fitur Lofi Focus: {enableOptionalLofi ? 'Matikan' : 'Aktifkan'}
              </span>
            </div>

            <div
              style={{
                height: '1px',
                background: 'var(--glass-border)',
                margin: '4px 6px',
              }}
            />

            <div
              className="tray-menu-item"
              onClick={() => {
                triggerOpenSettings();
                setShowContextMenu(false);
                setShowTrayFlyout(false);
              }}
            >
              <Sliders size={13} style={{ color: '#a855f7' }} />
              <span style={{ fontWeight: 600 }}>Buka Settings Dashboard...</span>
            </div>

            <div
              className="tray-menu-item"
              onClick={() => handleAction('trim_ram')}
            >
              <Cpu size={13} style={{ color: '#10b981' }} />
              <span>Optimize RAM Now (~10 MB Trimmer)</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};