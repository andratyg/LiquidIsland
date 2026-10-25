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
  const activeSlide = useSystemStore((s) => s.activeSlide);
  const isWindowMaximizedSimulated = useSystemStore((s) => s.isWindowMaximizedSimulated);

  // Real Windows Hardware Status
  const batteryLevel = useSystemStore((s) => s.batteryLevel ?? 84);
  const isCharging = useSystemStore((s) => s.isCharging ?? true);

  const [showTrayFlyout, setShowTrayFlyout] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  const flyoutRef = useRef<HTMLDivElement>(null);

  // Click-Through toggle helper for bottom dock
  const handleDockMouseEnter = useCallback(() => {
    safeInvoke('set_dock_click_through', { ignore: false });
  }, []);

  const handleDockMouseLeave = useCallback(() => {
    safeInvoke('set_dock_click_through', { ignore: true });
  }, []);

  // Synchronized Win32 Digital Clock
  useEffect(() => {
    function updateClock() {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      );
      setDateStr(
        now.toLocaleDateString([], {
          month: 'short',
          day: 'numeric',
        })
      );
    }
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close flyout when clicking outside
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

  // Effective layout mode: Option C adapts to simulated window maximization
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

  const triggerOpenSlide = (slideIndex: number) => {
    playGlassPop();
    systemStore.setActiveSlide(slideIndex as any);
    systemStore.setIslandState('expanded');
    safeEmit('open-slide', slideIndex);
  };

  // Reusable Dock App Items
  const renderAppIcons = () => (
    <>
      {/* Start Button */}
      <button
        type="button"
        className="dock-app-icon"
        onClick={triggerOpenSpotlight}
        title="Start Menu & Spotlight (Alt + Space)"
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '2px',
            width: '13px',
            height: '13px',
          }}
        >
          <div style={{ background: '#38bdf8', borderRadius: '1.5px' }} />
          <div style={{ background: '#38bdf8', borderRadius: '1.5px' }} />
          <div style={{ background: '#38bdf8', borderRadius: '1.5px' }} />
          <div style={{ background: '#38bdf8', borderRadius: '1.5px' }} />
        </div>
      </button>

      {/* Search Pill */}
      <button
        type="button"
        onClick={triggerOpenSpotlight}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          height: '32px',
          padding: '0 10px',
          borderRadius: '9999px',
          background: 'var(--pill-bg)',
          border: '1px solid var(--glass-border)',
          color: 'var(--text-secondary)',
          fontSize: '11px',
          cursor: 'pointer',
        }}
        title="Quick Search & Apps (Alt + Space)"
      >
        <Search size={13} style={{ color: '#38bdf8' }} />
        <span style={{ fontWeight: 500 }}>Search</span>
        <span
          style={{
            fontSize: '9px',
            padding: '1px 5px',
            borderRadius: '4px',
            background: 'rgba(255,255,255,0.12)',
            color: 'var(--text-secondary)',
          }}
        >
          Alt+Space
        </span>
      </button>

      {/* Pinned App 1: Browser */}
      <button
        type="button"
        className="dock-app-icon"
        onClick={() => {
          playToggleClick();
          systemStore.triggerToast('hud', {
            title: 'Browser Launched',
            subtitle: 'Microsoft Edge / Chromium Ready',
          });
        }}
        title="Browser"
      >
        <Globe size={16} style={{ color: '#38bdf8' }} />
      </button>

      {/* Pinned App 2: Code Editor */}
      <button
        type="button"
        className="dock-app-icon"
        onClick={() => {
          playToggleClick();
          systemStore.triggerToast('hud', {
            title: 'VS Code Editor',
            subtitle: 'Active Workspace: LiquidIsland',
          });
        }}
        title="Visual Studio Code"
      >
        <Code2 size={16} style={{ color: '#60a5fa' }} />
      </button>

      {/* Pinned App 3: Shelf / File Explorer */}
      <button
        type="button"
        className={`dock-app-icon ${activeSlide === 3 ? 'active' : ''}`}
        onClick={() => triggerOpenSlide(3)}
        title="File Shelf (Slide 3)"
      >
        <Folder size={16} style={{ color: '#f59e0b' }} />
      </button>

      {/* Pinned App 4: Music Player */}
      <button
        type="button"
        className={`dock-app-icon ${activeSlide === 0 ? 'active' : ''}`}
        onClick={() => triggerOpenSlide(0)}
        title="Music Player & Lyrics (Slide 0)"
      >
        <Music size={16} style={{ color: '#ec4899' }} />
      </button>

      {/* Pinned App 5: Terminal */}
      <button
        type="button"
        className="dock-app-icon"
        onClick={() => {
          playToggleClick();
          systemStore.triggerToast('hud', {
            title: 'PowerShell / Terminal',
            subtitle: 'Ready at ~\\LiquidIsland',
          });
        }}
        title="Windows Terminal"
      >
        <Terminal size={15} style={{ color: '#10b981' }} />
      </button>

      {/* Pinned App 6: Settings Dashboard */}
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

  // Reusable System Tray Items
  const renderTrayIcons = () => (
    <>
      {/* Hidden Icons (^) Chevron Button */}
      <button
        type="button"
        className="dock-app-icon"
        style={{ width: '26px', height: '32px', borderRadius: '8px' }}
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

      {/* Language Indicator */}
      <div
        style={{
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          padding: '0 4px',
          cursor: 'pointer',
        }}
        title="Keyboard Layout: English (US)"
      >
        ENG
      </div>

      {/* Wi-Fi Icon */}
      <button
        type="button"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '2px',
          color: 'var(--text-primary)',
        }}
        title="Wi-Fi: Connected (LiquidIsland-5G)"
      >
        <Wifi size={14} />
      </button>

      {/* Volume Icon */}
      <button
        type="button"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '2px',
          color: 'var(--text-primary)',
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

      {/* Real Windows Battery Indicator from hardware_monitor.rs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
          fontSize: '10px',
          color: 'var(--text-primary)',
          cursor: 'pointer',
        }}
        onClick={() => {
          playGlassPop();
          if (isCharging) {
            systemStore.showChargingToast(batteryLevel);
          } else {
            systemStore.showUnpluggedToast(batteryLevel);
          }
        }}
        title={`Battery: ${batteryLevel}% (${isCharging ? 'Plugged In / Charging' : 'On Battery'})`}
      >
        <BatteryCharging size={14} style={{ color: isCharging ? '#22c55e' : '#38bdf8' }} />
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{batteryLevel}%</span>
      </div>

      {/* Date & Time */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          justifyContent: 'center',
          paddingLeft: '6px',
          borderLeft: '1px solid var(--glass-border)',
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
          {timeStr || '11:42'}
        </span>
        <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>
          {dateStr || 'Oct 25'}
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
      {/* TASKBAR MODE RENDERING: OPTION A vs OPTION B                       */}
      {/* ================================================================== */}
      {effectiveMode === 'A' ? (
        /* OPTION A: Full-Width Bottom Crystal Bar (100% width, 48px height) */
        <motion.div
          key="taskbar-full-width"
          onMouseEnter={handleDockMouseEnter}
          onMouseLeave={handleDockMouseLeave}
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="liquid-taskbar-full"
          style={{ pointerEvents: 'auto' }}
        >
          {/* Left / Center Section: App Dock */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {renderAppIcons()}
          </div>

          {/* Center Indicator Badge for Option C / A */}
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

          {/* Right Section: System Tray */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {renderTrayIcons()}
          </div>
        </motion.div>
      ) : (
        /* OPTION B: Two Floating Liquid Glass Capsules */
        <div
          className="liquid-dock-container"
          style={{ pointerEvents: 'none' }}
        >
          {/* Left Capsule: App Dock */}
          <motion.div
            key="dock-capsule-left"
            onMouseEnter={handleDockMouseEnter}
            onMouseLeave={handleDockMouseLeave}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className="liquid-dock-capsule"
            style={{ pointerEvents: 'auto' }}
          >
            {renderAppIcons()}
          </motion.div>

          {/* Right Capsule: System Tray */}
          <motion.div
            key="dock-capsule-right"
            onMouseEnter={handleDockMouseEnter}
            onMouseLeave={handleDockMouseLeave}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className="liquid-dock-capsule"
            style={{ pointerEvents: 'auto' }}
          >
            {renderTrayIcons()}
          </motion.div>
        </div>
      )}

      {/* ================================================================== */}
      {/* INTERACTIVE SYSTEM TRAY (^) 3x3 GLASS FLYOUT PANEL                 */}
      {/* ================================================================== */}
      <AnimatePresence>
        {showTrayFlyout && (
          <motion.div
            key="tray-flyout"
            onMouseEnter={handleDockMouseEnter}
            onMouseLeave={handleDockMouseLeave}
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ duration: 0.16 }}
            className="tray-flyout-panel"
            style={{
              bottom: effectiveMode === 'A' ? '54px' : '62px',
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
              {/* Tile 1: LiquidIsland OS */}
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

              {/* Tile 2: OneDrive */}
              <div
                className="tray-grid-item"
                onClick={() => handleAction('onedrive')}
                title="OneDrive: Up to date"
              >
                <Cloud size={16} style={{ color: '#60a5fa' }} />
                <span>Cloud</span>
              </div>

              {/* Tile 3: Bluetooth */}
              <div
                className="tray-grid-item"
                onClick={() => handleAction('bluetooth')}
                title="Bluetooth: Devices Paired"
              >
                <Bluetooth size={16} style={{ color: '#3b82f6' }} />
                <span>Bluetooth</span>
              </div>

              {/* Tile 4: Windows Security */}
              <div
                className="tray-grid-item"
                onClick={() => handleAction('security')}
                title="Windows Defender: Protected"
              >
                <ShieldCheck size={16} style={{ color: '#10b981' }} />
                <span>Security</span>
              </div>

              {/* Tile 5: GPU Engine */}
              <div
                className="tray-grid-item"
                onClick={() => handleAction('gpu')}
                title="GPU: High Performance Profile"
              >
                <Cpu size={16} style={{ color: '#22c55e' }} />
                <span>NVIDIA</span>
              </div>

              {/* Tile 6: Settings Dashboard */}
              <div
                className="tray-grid-item"
                onClick={triggerOpenSettings}
                title="Open Settings Dashboard"
              >
                <Sliders size={16} style={{ color: '#a855f7' }} />
                <span>Settings</span>
              </div>

              {/* Tile 7: Companion Switcher */}
              <div
                className="tray-grid-item"
                onClick={() => handleAction('switch_companion')}
                title={`Companion: ${companionMode.toUpperCase()}`}
              >
                <Eye size={16} style={{ color: '#ec4899' }} />
                <span>{companionMode}</span>
              </div>

              {/* Tile 8: Lofi Engine */}
              <div
                className="tray-grid-item"
                onClick={() => handleAction('toggle_lofi')}
                title={`Lofi Focus: ${enableOptionalLofi ? 'ON' : 'OFF'}`}
              >
                <Radio size={16} style={{ color: '#f59e0b' }} />
                <span>Lofi</span>
              </div>

              {/* Tile 9: Quick RAM Trim */}
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
              bottom: effectiveMode === 'A' ? '64px' : '72px',
              pointerEvents: 'auto',
            }}
          >
            {/* Header */}
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

            {/* Menu Item 1: Enable / Disable Island */}
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

            {/* Menu Item 2: Stealth Bezel Mode */}
            <div
              className="tray-menu-item"
              onClick={() => handleAction('stealth_bezel')}
            >
              <Minimize2 size={13} style={{ color: '#38bdf8' }} />
              <span>Sembunyikan ke Garis Bezel (Stealth)</span>
            </div>

            {/* Menu Item 3: Switch Theme */}
            <div
              className="tray-menu-item"
              onClick={() => handleAction('switch_theme')}
            >
              <Layers size={13} style={{ color: '#60a5fa' }} />
              <span>
                Ganti Tema: {theme === 'dark' ? 'Light Quartz' : 'Dark Obsidian'}
              </span>
            </div>

            {/* Menu Item 4: Switch Companion */}
            <div
              className="tray-menu-item"
              onClick={() => handleAction('switch_companion')}
            >
              <Eye size={13} style={{ color: '#ec4899' }} />
              <span>Ganti Karakter: Slime / Cat / Eyes</span>
            </div>

            {/* Menu Item 5: Toggle Lofi Audio */}
            <div
              className="tray-menu-item"
              onClick={() => handleAction('toggle_lofi')}
            >
              <Radio size={13} style={{ color: '#f59e0b' }} />
              <span>
                Fitur Lofi Focus: {enableOptionalLofi ? 'Matikan' : 'Aktifkan'}
              </span>
            </div>

            {/* Separator */}
            <div
              style={{
                height: '1px',
                background: 'var(--glass-border)',
                margin: '4px 6px',
              }}
            />

            {/* Menu Item 6: Open Settings Dashboard */}
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

            {/* Menu Item 7: Optimize RAM Now */}
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
