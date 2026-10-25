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
  VolumeX,
  SunMedium,
  BatteryCharging,
  Sliders,
  Power,
  Eye,
  Cpu,
  RefreshCw,
  Moon,
  Sun,
  Maximize2,
  Minimize2,
  X,
} from 'lucide-react';
import { RunningAppInfo, CompanionMode } from '../types/liquid';

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

/* ==========================================================================
   High-Precision Full-Color Vector Logos for Authentic Taskbar Icons
   ========================================================================== */

const ChromeLogo = () => (
  <svg width="24" height="24" viewBox="0 0 48 48" fill="none">
    <circle cx="24" cy="24" r="20" fill="#fbbc05" />
    <path d="M24 4c7.3 0 13.7 4 17.1 10H24v10l-8.6 15A20 20 0 0 1 4 24C4 13 13 4 24 4z" fill="#ea4335" />
    <path d="M41.1 14A20 20 0 0 1 24 44l8.6-15H44c0-5.3-1.1-10.4-2.9-15z" fill="#34a853" />
    <circle cx="24" cy="24" r="9.5" fill="#ffffff" />
    <circle cx="24" cy="24" r="7.5" fill="#4285f4" />
  </svg>
);

const EdgeLogo = () => (
  <svg width="24" height="24" viewBox="0 0 48 48" fill="none">
    <path
      d="M24 4C13 4 4 13 4 24c0 8.5 5.3 15.7 12.8 18.5-1.8-3.5-2.8-7.5-2.8-11.5 0-9.4 7.6-17 17-17h10c-4-6-10-10-17-10z"
      fill="url(#edgeGrad1)"
    />
    <path
      d="M24 20c-7.7 0-14 6.3-14 14 0 5.5 3.2 10.2 7.8 12.5C20.2 47.4 22 48 24 48c13.3 0 24-10.7 24-24 0-1.4-.1-2.7-.4-4H34c0 4.4-3.6 8-8 8-3.3 0-6.1-2-7.3-4.9.4-.1.9-.1 1.3-.1h20z"
      fill="url(#edgeGrad2)"
    />
    <defs>
      <linearGradient id="edgeGrad1" x1="4" y1="4" x2="34" y2="24" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0078d7" />
        <stop offset="1" stopColor="#00c8f8" />
      </linearGradient>
      <linearGradient id="edgeGrad2" x1="10" y1="48" x2="48" y2="20" gradientUnits="userSpaceOnUse">
        <stop stopColor="#00c8f8" />
        <stop offset="1" stopColor="#10b981" />
      </linearGradient>
    </defs>
  </svg>
);

const BraveLogo = () => (
  <svg width="24" height="24" viewBox="0 0 48 48" fill="none">
    <path
      d="M24 4l12 7-3 18-9 15-9-15-3-18 12-7z"
      fill="#fb542b"
      stroke="#ffffff"
      strokeWidth="1.5"
    />
    <path d="M24 14l6 4-2 9-4 8-4-8-2-9 6-4z" fill="#ff7a00" />
  </svg>
);

const FirefoxLogo = () => (
  <svg width="24" height="24" viewBox="0 0 48 48" fill="none">
    <circle cx="24" cy="24" r="20" fill="url(#ffGrad1)" />
    <path
      d="M38 12c-3.5-3.5-9-5.5-14-4.5 4 2.5 6 6 5 10.5-2-1.5-4.5-2.5-7-2.5-7.7 0-14 6.3-14 14 0 6 3.8 11.2 9.2 13.2-3.8-3.2-5.2-8.7-3.2-13.7 2 4.5 6.5 7.5 11.5 7.5 7.2 0 13-5.8 13-13 0-4.4-2.2-8.3-5.5-10.7 2.5 1 4.5 2.8 5 4.7 1-2.2 1-4.2 0-5.5z"
      fill="url(#ffGrad2)"
    />
    <defs>
      <linearGradient id="ffGrad1" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
        <stop stopColor="#2563eb" />
        <stop offset="1" stopColor="#7c3aed" />
      </linearGradient>
      <linearGradient id="ffGrad2" x1="10" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop stopColor="#f59e0b" />
        <stop offset="1" stopColor="#ef4444" />
      </linearGradient>
    </defs>
  </svg>
);

const VSCodeLogo = () => (
  <svg width="24" height="24" viewBox="0 0 48 48" fill="none">
    <path d="M36 4l-14 13-8-6-4 3 6 10-6 10 4 3 8-6 14 13 8-4V8l-8-4z" fill="#007acc" />
    <path d="M36 4l-14 13 14 13 8-4V8l-8-4z" fill="#1f9cf0" opacity="0.85" />
    <path d="M36 30L22 17l-8 6 8 7 14 0z" fill="#0065a9" />
  </svg>
);

const CursorLogo = () => (
  <svg width="24" height="24" viewBox="0 0 48 48" fill="none">
    <rect x="6" y="6" width="36" height="36" rx="8" fill="#18181b" stroke="#8b5cf6" strokeWidth="2" />
    <path d="M16 14l18 10-18 10V14z" fill="url(#cursorGrad)" />
    <defs>
      <linearGradient id="cursorGrad" x1="16" y1="14" x2="34" y2="34" gradientUnits="userSpaceOnUse">
        <stop stopColor="#8b5cf6" />
        <stop offset="1" stopColor="#c084fc" />
      </linearGradient>
    </defs>
  </svg>
);

const AntigravityLogo = () => (
  <svg width="24" height="24" viewBox="0 0 48 48" fill="none">
    <circle cx="24" cy="24" r="20" fill="url(#antiGrad)" />
    <circle cx="24" cy="24" r="8" fill="#ffffff" />
    <path d="M24 8v8M24 32v8M8 24h8M32 24h8" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
    <defs>
      <linearGradient id="antiGrad" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6366f1" />
        <stop offset="1" stopColor="#a855f7" />
      </linearGradient>
    </defs>
  </svg>
);

const SpotifyLogo = () => (
  <svg width="24" height="24" viewBox="0 0 48 48" fill="none">
    <circle cx="24" cy="24" r="21" fill="#1ed760" />
    <path
      d="M34 18c-6.8-4-17.5-4.4-23.7-2.5a2 2 0 1 0 1.2 3.8c5.4-1.6 14.8-1.3 20.8 2.2a2 2 0 1 0 1.7-3.5zm-1.8 7.3c-5.7-3.5-14.4-4.5-21.2-2.4a1.7 1.7 0 1 0 1 3.2c5.8-1.8 13.5-.9 18.5 2.2a1.7 1.7 0 1 0 1.7-3zm-2.4 7.2c-4.9-3-11.2-3.7-16.5-2.1a1.4 1.4 0 0 0 .8 2.7c4.5-1.4 10.2-.8 14.4 1.8a1.4 1.4 0 0 0 1.3-2.4z"
      fill="#000000"
    />
  </svg>
);

const ExplorerLogo = () => (
  <svg width="24" height="24" viewBox="0 0 48 48" fill="none">
    <path d="M6 10h14l4 5h18a3 3 0 0 1 3 3v20a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V13a3 3 0 0 1 3-3z" fill="#f59e0b" />
    <rect x="3" y="18" width="42" height="22" rx="3" fill="#fbbf24" />
    <path d="M12 24h24v2H12z" fill="#38bdf8" />
  </svg>
);

const TerminalLogo = () => (
  <svg width="24" height="24" viewBox="0 0 48 48" fill="none">
    <rect x="4" y="8" width="40" height="32" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="2" />
    <path d="M14 18l8 6-8 6" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="26" y1="30" x2="34" y2="30" stroke="#f8fafc" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const SettingsLogo = () => (
  <svg width="24" height="24" viewBox="0 0 48 48" fill="none">
    <circle cx="24" cy="24" r="19" fill="#1e293b" stroke="#a855f7" strokeWidth="2" />
    <circle cx="24" cy="24" r="6" fill="#a855f7" />
    <path
      d="M24 9v4M24 35v4M9 24h4M35 24h4M13.4 13.4l2.8 2.8M31.8 31.8l2.8 2.8M13.4 34.6l2.8-2.8M31.8 16.2l2.8-2.8"
      stroke="#a855f7"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);

const DiscordLogo = () => (
  <svg width="24" height="24" viewBox="0 0 48 48" fill="none">
    <rect x="4" y="4" width="40" height="40" rx="10" fill="#5865f2" />
    <path
      d="M34 16c-2.4-1.1-5-1.9-7.7-2.1l-.3.6c2.9.8 4.2 2.1 4.2 2.1-2.6-1.4-5.2-2.1-7.8-2.1s-5.2.7-7.8 2.1c0 0 1.3-1.3 4.2-2.1l-.3-.6C16 14.1 13.4 14.9 11 16 7.6 21 6.8 26 7.2 31c3.1 2.3 6.1 2.2 6.1 2.2l1.3-1.8c-2.4-.7-3.4-2.2-3.4-2.2.3.2 2.7 1.7 7.8 1.7s7.5-1.5 7.8-1.7c0 0-1 1.5-3.4 2.2l1.3 1.8s3 .1 6.1-2.2c.4-5-.4-10-3.7-15zM17 26.5c-1.4 0-2.5-1.3-2.5-2.8s1.1-2.8 2.5-2.8 2.5 1.3 2.5 2.8-1.1 2.8-2.5 2.8zm11 0c-1.4 0-2.5-1.3-2.5-2.8s1.1-2.8 2.5-2.8 2.5 1.3 2.5 2.8-1.1 2.8-2.5 2.8z"
      fill="#ffffff"
    />
  </svg>
);

const SlackLogo = () => (
  <svg width="24" height="24" viewBox="0 0 48 48" fill="none">
    <rect x="4" y="4" width="40" height="40" rx="10" fill="#1e1e24" />
    <path d="M14 26a3 3 0 1 1-3-3h3v3zm2 0a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0v-7z" fill="#e01e5a" />
    <path d="M22 14a3 3 0 1 1 3-3v3h-3zm0 2a3 3 0 0 1 0 6h-7a3 3 0 0 1 0-6h7z" fill="#36c5f0" />
    <path d="M34 22a3 3 0 1 1 3 3h-3v-3zm-2 0a3 3 0 0 1-6 0v-7a3 3 0 0 1 6 0v7z" fill="#2eb67d" />
    <path d="M26 34a3 3 0 1 1-3 3v-3h3zm0-2a3 3 0 0 1 0-6h7a3 3 0 0 1 0 6h-7z" fill="#ecb22e" />
  </svg>
);

// High-Fidelity Default Fallback: Clean application window (NEVER a lightning bolt!)
const DefaultAppLogo = () => (
  <svg width="24" height="24" viewBox="0 0 48 48" fill="none">
    <rect x="4" y="8" width="40" height="32" rx="7" fill="#1e222a" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
    <path d="M4 17h40" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
    <circle cx="10" cy="12.5" r="2.2" fill="#ef4444" />
    <circle cx="16.5" cy="12.5" r="2.2" fill="#f59e0b" />
    <circle cx="23" cy="12.5" r="2.2" fill="#10b981" />
    <rect x="12" y="24" width="24" height="10" rx="3" fill="rgba(56, 189, 248, 0.22)" stroke="#38bdf8" strokeWidth="1.5" />
  </svg>
);

/* ==========================================================================
   Master TaskbarPreviewDock Component
   ========================================================================== */

export const TaskbarPreviewDock: React.FC<TaskbarPreviewDockProps> = ({
  onOpenSettings,
  onOpenSpotlight,
  onTrayAction,
}) => {
  const taskbarMode = useSystemStore((s) => s.taskbarMode);
  const theme = useSystemStore((s) => s.theme);
  const companionMode = useSystemStore((s) => s.companionMode);
  const workspaceActivity = useSystemStore((s) => s.workspaceActivity);
  const volume = useSystemStore((s) => s.volume);
  const brightness = useSystemStore((s) => s.brightness);

  // Real Windows Battery & Hardware Status
  const batteryLevel = useSystemStore((s) => s.batteryLevel ?? 84);
  const isCharging = useSystemStore((s) => s.isCharging ?? true);

  const [showTrayFlyout, setShowTrayFlyout] = useState(false);
  const [showControlCenter, setShowControlCenter] = useState(false);
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
    const interval = setInterval(fetchRunningApps, 1400);
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
    if (!showTrayFlyout && !showControlCenter && !showContextMenu) {
      safeInvoke('set_dock_click_through', { ignore: true });
    }
  }, [showTrayFlyout, showControlCenter, showContextMenu]);

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
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Flyout Open/Close Helpers with Hit-Box Synchronization
  const toggleTrayFlyout = useCallback(() => {
    playToggleClick();
    const next = !showTrayFlyout;
    setShowTrayFlyout(next);
    setShowControlCenter(false);
    setShowContextMenu(false);
    safeInvoke('set_taskbar_flyout_open', { open: next });
  }, [showTrayFlyout]);

  const toggleControlCenter = useCallback(() => {
    playGlassPop();
    const next = !showControlCenter;
    setShowControlCenter(next);
    setShowTrayFlyout(false);
    setShowContextMenu(false);
    safeInvoke('set_taskbar_flyout_open', { open: next });
  }, [showControlCenter]);

  const closeAllFlyouts = useCallback(() => {
    setShowTrayFlyout(false);
    setShowControlCenter(false);
    setShowContextMenu(false);
    safeInvoke('set_taskbar_flyout_open', { open: false });
  }, []);

  // Quick Action Handler for Tray Flyout
  const handleAction = (actionKey: string) => {
    switch (actionKey) {
      case 'settings':
        triggerOpenSettings();
        break;
      case 'spotlight':
        triggerOpenSpotlight();
        break;
      case 'switch_companion': {
        playToggleClick();
        const modes: CompanionMode[] = ['slime', 'cat', 'eyes'];
        const currentIdx = modes.indexOf(companionMode);
        const next = modes[(currentIdx + 1) % modes.length];
        systemStore.setCompanionMode(next);
        break;
      }
      case 'toggle_theme': {
        playToggleClick();
        const nextTheme = theme === 'dark' ? 'light' : 'dark';
        systemStore.setTheme(nextTheme);
        break;
      }
      case 'toggle_stealth': {
        playGlassPop();
        const current = systemStore.getState().islandState;
        if (current === 'bezel-line') {
          systemStore.setIslandState('compact');
        } else {
          systemStore.setIslandState('bezel-line');
        }
        break;
      }
      case 'restore_taskbar': {
        playWaterDrop();
        safeInvoke('restore_default_taskbar');
        break;
      }
      case 'trim_ram': {
        playWaterDrop();
        safeInvoke('trim_ram_working_set');
        break;
      }
      case 'restart_explorer': {
        playWaterDrop();
        safeInvoke('restart_windows_explorer');
        break;
      }
      case 'quit': {
        playGlassPop();
        if (onTrayAction) onTrayAction('quit');
        safeEmit('tray-menu-action', { action: 'quit' });
        break;
      }
    }
  };

  const triggerOpenSpotlight = () => {
    playGlassPop();
    closeAllFlyouts();
    if (onOpenSpotlight) onOpenSpotlight();
    safeEmit('open-spotlight');
  };

  const triggerOpenSettings = () => {
    playGlassPop();
    closeAllFlyouts();
    if (onOpenSettings) onOpenSettings();
    safeEmit('open-settings');
  };

  // Helper for dynamic app icon rendering (real .exe icon or vector logo)
  const renderAppIconGraphic = (hint: string, title?: string, iconData?: string) => {
    if (iconData && iconData.startsWith('data:image/')) {
      return (
        <img
          src={iconData}
          alt={title || 'App'}
          style={{
            width: '26px',
            height: '26px',
            objectFit: 'contain',
            borderRadius: '4px',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))',
          }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      );
    }

    const h = (hint || '').toLowerCase();
    const t = (title || '').toLowerCase();

    if (h === 'chrome' || t.includes('chrome')) return <ChromeLogo />;
    if (h === 'edge' || t.includes('edge')) return <EdgeLogo />;
    if (h === 'brave' || t.includes('brave')) return <BraveLogo />;
    if (h === 'firefox' || t.includes('firefox')) return <FirefoxLogo />;
    if (h === 'code' || t.includes('visual studio code')) return <VSCodeLogo />;
    if (h === 'cursor' || t.includes('cursor')) return <CursorLogo />;
    if (h === 'antigravity' || t.includes('antigravity')) return <AntigravityLogo />;
    if (h === 'spotify' || t.includes('spotify')) return <SpotifyLogo />;
    if (h === 'terminal' || t.includes('terminal') || t.includes('powershell')) return <TerminalLogo />;
    if (h === 'explorer' || t.includes('explorer')) return <ExplorerLogo />;
    if (h === 'settings' || t.includes('settings')) return <SettingsLogo />;
    if (h === 'discord' || t.includes('discord')) return <DiscordLogo />;
    if (h === 'slack' || t.includes('slack')) return <SlackLogo />;

    return <DefaultAppLogo />;
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
        style={{ width: '40px', height: '40px', borderRadius: '10px' }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '2.5px',
            width: '15px',
            height: '15px',
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
          height: '36px',
          padding: '0 11px',
          borderRadius: '9999px',
          background: 'rgba(255, 255, 255, 0.06)',
          border: '1px solid rgba(255, 255, 255, 0.09)',
          color: 'var(--text-secondary)',
          fontSize: '11px',
          cursor: 'pointer',
          transition: 'background-color 0.15s ease',
        }}
        title="Quick Search & Omni Spotlight (Alt + S)"
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
          Alt+S
        </span>
      </button>

      {/* 3. Subtle Vertical Divider */}
      <div
        style={{
          width: '1px',
          height: '24px',
          backgroundColor: 'rgba(255, 255, 255, 0.12)',
          margin: '0 2px',
        }}
      />

      {/* 4. Live Running Windows Apps List */}
      {runningApps.map((app) => {
        const isThisAppActive =
          app.is_focused &&
          (workspaceActivity?.kind === 'tab-switch' || workspaceActivity?.kind === 'app-switch');

        return (
          <div key={`running-app-${app.hwnd}`} style={{ position: 'relative' }}>
            <button
              type="button"
              className={`dock-app-icon ${app.is_focused ? 'active' : ''}`}
              onClick={() => {
                playGlassPop();
                safeInvoke('focus_or_toggle_app', { hwnd: app.hwnd });
                fetchRunningApps();
              }}
              title={app.title}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              {renderAppIconGraphic(app.icon_hint, app.title, app.icon_data)}
              {app.is_focused ? (
                <span className="dock-app-dot-active" />
              ) : (
                <span className="dock-app-dot-running" />
              )}
            </button>

            {/* Floating Tab-Title Badge right above the focused running app icon */}
            <AnimatePresence>
              {isThisAppActive && workspaceActivity && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.9 }}
                  animate={{ opacity: 1, y: -44, scale: 1 }}
                  exit={{ opacity: 0, y: -38, scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 9999,
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    backgroundColor: 'rgba(15, 23, 42, 0.94)',
                    backdropFilter: 'blur(16px)',
                    border: `1px solid ${workspaceActivity.accent_color || '#38bdf8'}`,
                    boxShadow: `0 8px 20px rgba(0, 0, 0, 0.5), 0 0 10px ${
                      workspaceActivity.accent_color || '#38bdf8'
                    }40`,
                    color: '#ffffff',
                    fontSize: '10px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    maxWidth: '220px',
                    overflow: 'hidden',
                  }}
                >
                  <span
                    style={{
                      width: '5px',
                      height: '5px',
                      borderRadius: '50%',
                      backgroundColor: workspaceActivity.accent_color || '#38bdf8',
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {workspaceActivity.tab_title}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {/* Fallback default launch icons if no user apps are active */}
      {runningApps.length === 0 && (
        <>
          <button
            type="button"
            className="dock-app-icon"
            onClick={() => safeInvoke('launch_system_action', { action: 'browser' })}
            title="Launch Web Browser"
            style={{ width: '40px', height: '40px', borderRadius: '10px' }}
          >
            <ChromeLogo />
          </button>
          <button
            type="button"
            className="dock-app-icon"
            onClick={() => safeInvoke('launch_system_action', { action: 'explorer' })}
            title="Launch File Explorer"
            style={{ width: '40px', height: '40px', borderRadius: '10px' }}
          >
            <ExplorerLogo />
          </button>
          <button
            type="button"
            className="dock-app-icon"
            onClick={() => safeInvoke('launch_system_action', { action: 'terminal' })}
            title="Launch Windows Terminal"
            style={{ width: '40px', height: '40px', borderRadius: '10px' }}
          >
            <TerminalLogo />
          </button>
        </>
      )}

      {/* 5. Subtle Divider before Settings */}
      <div
        style={{
          width: '1px',
          height: '24px',
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
        style={{ width: '40px', height: '40px', borderRadius: '10px' }}
      >
        <SettingsLogo />
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
        style={{ width: '30px', height: '36px', borderRadius: '8px' }}
        onClick={toggleTrayFlyout}
        title="Show Hidden Icons & System Tray (^)"
      >
        <ChevronUp
          size={15}
          style={{
            transform: showTrayFlyout ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            color: showTrayFlyout ? '#38bdf8' : 'var(--text-primary)',
          }}
        />
      </button>

      {/* Wi-Fi Icon (Click opens Control Center) */}
      <button
        type="button"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '5px',
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
        }}
        onClick={toggleControlCenter}
        title="Wi-Fi: Connected (Click for Control Center)"
      >
        <Wifi size={14} style={{ color: '#38bdf8' }} />
      </button>

      {/* Volume Indicator (Click = Control Center, Wheel = Adjust Volume) */}
      <button
        type="button"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '5px',
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
        }}
        onClick={toggleControlCenter}
        onWheel={(e) => {
          e.stopPropagation();
          const step = e.deltaY < 0 ? 4 : -4;
          systemStore.adjustVolume(step);
        }}
        title={`Volume: ${volume}% (Scroll to adjust, click for Control Center)`}
      >
        {volume === 0 ? (
          <VolumeX size={15} style={{ color: '#ef4444' }} />
        ) : (
          <Volume2 size={15} style={{ color: '#38bdf8' }} />
        )}
      </button>

      {/* Real Windows Battery Indicator (Click opens Control Center) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          cursor: 'pointer',
          padding: '3px 6px',
          borderRadius: '6px',
          background: 'rgba(255, 255, 255, 0.06)',
        }}
        onClick={toggleControlCenter}
        title={`Battery: ${batteryLevel}% (${isCharging ? 'Charging' : 'On Battery'})`}
      >
        <BatteryCharging size={13} style={{ color: isCharging ? '#22c55e' : '#38bdf8' }} />
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{batteryLevel}%</span>
      </div>

      {/* Digital Clock & Date: 100% Legible Bright White (#ffffff, 13px) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: '2px 8px',
          borderRadius: '8px',
          lineHeight: 1.25,
          userSelect: 'none',
        }}
        onClick={toggleControlCenter}
        title="Windows Notification & Control Center"
      >
        <span
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#ffffff',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.2px',
          }}
        >
          {timeStr || '13:00'}
        </span>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 500,
            color: '#a1a1aa',
            letterSpacing: '0.1px',
          }}
        >
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
      {/* 600px Bottom Edge Liquid Aurora Sweep on Desktop Switch */}
      <AnimatePresence>
        {workspaceActivity?.kind === 'desktop-switch' && (
          <motion.div
            key={`aurora-bottom-${workspaceActivity.timestamp}`}
            initial={{
              x: workspaceActivity.direction === 'right' ? '-100%' : '100%',
              opacity: 0,
            }}
            animate={{
              x: workspaceActivity.direction === 'right' ? '100%' : '-100%',
              opacity: [0, 1, 0.9, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '600px',
              height: '5px',
              background: 'linear-gradient(90deg, transparent, #38bdf8, #818cf8, transparent)',
              boxShadow: '0 0 16px 4px rgba(56, 189, 248, 0.65)',
              pointerEvents: 'none',
              zIndex: 9999,
            }}
          />
        )}
      </AnimatePresence>

      {/* ================================================================== */}
      {/* TASKBAR MODE RENDERING: OPTION A vs OPTION B (CENTERED LUXURY)     */}
      {/* ================================================================== */}
      {taskbarMode === 'A' ? (
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
          style={{ pointerEvents: 'none', position: 'relative' }}
        >
          {/* Main App Dock Capsule */}
          <div
            onMouseEnter={handleDockMouseEnter}
            onMouseLeave={handleDockMouseLeave}
            className="liquid-dock-capsule"
            style={{ position: 'relative', overflow: 'hidden' }}
          >
            {/* Traveling Specular Rim Sweep on Tab/App Switch */}
            <AnimatePresence>
              {(workspaceActivity?.kind === 'tab-switch' || workspaceActivity?.kind === 'app-switch') && (
                <motion.div
                  key={`dock-sweep-${workspaceActivity.timestamp}`}
                  className="liquid-rim-sweep"
                  initial={{ x: '-100%', opacity: 0 }}
                  animate={{ x: '250%', opacity: [0, 1, 0.8, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    zIndex: 10,
                  }}
                />
              )}
            </AnimatePresence>

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

            {/* ============================================================== */}
            {/* 1. Interactive 3x3 Glass System Tray Flyout (^)                 */}
            {/* ============================================================== */}
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
                    bottom: '72px',
                    right: 0,
                    width: '280px',
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    borderRadius: '16px',
                    boxShadow: '0 16px 36px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08)',
                    padding: '12px',
                    boxSizing: 'border-box',
                    pointerEvents: 'auto',
                    zIndex: 99999,
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--text-secondary)',
                      marginBottom: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>System Tray & Quick Actions</span>
                    <button
                      type="button"
                      onClick={closeAllFlyouts}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '2px',
                      }}
                      title="Close flyout"
                    >
                      <X size={12} />
                    </button>
                  </div>

                  {/* 3x3 Working Actions Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '8px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleAction('settings')}
                      className="tray-grid-item"
                      title="Open Settings Dashboard"
                    >
                      <Sliders size={18} style={{ color: '#a855f7' }} />
                      <span>Settings</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAction('spotlight')}
                      className="tray-grid-item"
                      title="Open Spotlight Search (Alt+S)"
                    >
                      <Search size={18} style={{ color: '#38bdf8' }} />
                      <span>Spotlight</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAction('switch_companion')}
                      className="tray-grid-item"
                      title={`Switch Companion (Current: ${companionMode.toUpperCase()})`}
                    >
                      <Eye size={18} style={{ color: '#ec4899' }} />
                      <span style={{ textTransform: 'capitalize' }}>{companionMode}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAction('toggle_theme')}
                      className="tray-grid-item"
                      title={`Toggle Theme (Current: ${theme.toUpperCase()})`}
                    >
                      {theme === 'dark' ? (
                        <Moon size={18} style={{ color: '#818cf8' }} />
                      ) : (
                        <Sun size={18} style={{ color: '#f59e0b' }} />
                      )}
                      <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAction('toggle_stealth')}
                      className="tray-grid-item"
                      title="Toggle Stealth Mode (Bezel-line)"
                    >
                      <Minimize2 size={18} style={{ color: '#10b981' }} />
                      <span>Stealth</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAction('restore_taskbar')}
                      className="tray-grid-item"
                      title="Restore Native Windows Taskbar"
                    >
                      <Maximize2 size={18} style={{ color: '#60a5fa' }} />
                      <span>Taskbar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAction('trim_ram')}
                      className="tray-grid-item"
                      title="Trim System RAM Working Set"
                    >
                      <Cpu size={18} style={{ color: '#22c55e' }} />
                      <span>Trim RAM</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAction('restart_explorer')}
                      className="tray-grid-item"
                      title="Restart Windows Explorer"
                    >
                      <RefreshCw size={18} style={{ color: '#f59e0b' }} />
                      <span>Explorer</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAction('quit')}
                      className="tray-grid-item"
                      style={{ color: '#f87171' }}
                      title="Quit LiquidIsland"
                    >
                      <Power size={18} style={{ color: '#ef4444' }} />
                      <span>Quit</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ============================================================== */}
            {/* 2. Interactive Quick Control Center Flyout                     */}
            {/* ============================================================== */}
            <AnimatePresence>
              {showControlCenter && (
                <motion.div
                  key="control-center"
                  initial={{ opacity: 0, scale: 0.92, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: 12 }}
                  transition={{ duration: 0.16 }}
                  style={{
                    position: 'absolute',
                    bottom: '72px',
                    right: 0,
                    width: '300px',
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    borderRadius: '16px',
                    boxShadow: '0 16px 36px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08)',
                    padding: '14px',
                    boxSizing: 'border-box',
                    pointerEvents: 'auto',
                    zIndex: 99999,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                      paddingBottom: '8px',
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff' }}>
                      Quick Control Center
                    </span>
                    <button
                      type="button"
                      onClick={closeAllFlyouts}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '2px',
                      }}
                      title="Close Control Center"
                    >
                      <X size={13} />
                    </button>
                  </div>

                  {/* Volume Slider Card */}
                  <div
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      padding: '8px 10px',
                      borderRadius: '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Volume2 size={14} style={{ color: '#38bdf8' }} />
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#ffffff' }}>Volume</span>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8' }}>
                        {volume}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={(e) => systemStore.setVolume(Number(e.target.value))}
                      style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer' }}
                    />
                  </div>

                  {/* Brightness Slider Card */}
                  <div
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      padding: '8px 10px',
                      borderRadius: '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <SunMedium size={14} style={{ color: '#f59e0b' }} />
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#ffffff' }}>Brightness</span>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b' }}>
                        {brightness}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={brightness}
                      onChange={(e) => systemStore.setBrightness(Number(e.target.value))}
                      style={{ width: '100%', accentColor: '#f59e0b', cursor: 'pointer' }}
                    />
                  </div>

                  {/* Hardware Status Dual Badges */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div
                      style={{
                        padding: '6px 8px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(255, 255, 255, 0.04)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '10px',
                        color: '#94a3b8',
                      }}
                    >
                      <BatteryCharging size={13} style={{ color: isCharging ? '#22c55e' : '#38bdf8' }} />
                      <span>{isCharging ? 'Charging' : 'Battery'} ({batteryLevel}%)</span>
                    </div>

                    <div
                      style={{
                        padding: '6px 8px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(255, 255, 255, 0.04)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '10px',
                        color: '#94a3b8',
                      }}
                    >
                      <Wifi size={13} style={{ color: '#38bdf8' }} />
                      <span>5GHz Ultra</span>
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
              bottom: '72px',
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
                fontWeight: 600,
              }}
            >
              LiquidIsland Quick Actions
            </div>
            <div className="tray-menu-item" onClick={triggerOpenSettings}>
              <Sliders size={13} />
              <span>Settings Dashboard</span>
            </div>
            <div className="tray-menu-item" onClick={triggerOpenSpotlight}>
              <Search size={13} />
              <span>Omni Search (Alt+S)</span>
            </div>
            <div className="tray-menu-item" onClick={() => handleAction('switch_companion')}>
              <Eye size={13} />
              <span>Switch Companion Mode</span>
            </div>
            <div className="tray-menu-item" onClick={() => handleAction('restore_taskbar')}>
              <Maximize2 size={13} />
              <span>Restore Native Taskbar</span>
            </div>
            <div className="tray-menu-item danger" onClick={() => handleAction('quit')}>
              <Power size={13} />
              <span>Quit LiquidIsland</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
