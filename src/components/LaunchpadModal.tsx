import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useSystemStore } from '../store/useSystemStore';
import { playGlassPop, playToggleClick } from '../utils/sfx';
import { InstalledAppEntry } from '../types/liquid';
import {
  Search,
  X,
  Lock,
  Moon,
  Cpu,
  Sliders,
} from 'lucide-react';

interface LaunchpadModalProps {
  onClose: () => void;
  onOpenSettings?: () => void;
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
    console.warn(`[Launchpad IPC] "${cmd}" error:`, err);
    return null;
  }
}

// Default Fallback App Icon
const DefaultAppLogo = () => (
  <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
    <rect x="4" y="8" width="40" height="32" rx="7" fill="#1e222a" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
    <path d="M4 17h40" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
    <circle cx="10" cy="12.5" r="2.2" fill="#ef4444" />
    <circle cx="16.5" cy="12.5" r="2.2" fill="#f59e0b" />
    <circle cx="23" cy="12.5" r="2.2" fill="#10b981" />
    <rect x="12" y="24" width="24" height="10" rx="3" fill="rgba(56, 189, 248, 0.22)" stroke="#38bdf8" strokeWidth="1.5" />
  </svg>
);

const CATEGORIES = ['All', 'Productivity', 'Development', 'Media', 'System'] as const;
type CategoryType = (typeof CATEGORIES)[number];

export const LaunchpadModal: React.FC<LaunchpadModalProps> = ({ onClose, onOpenSettings }) => {
  const theme = useSystemStore((s) => s.theme);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryType>('All');
  const [apps, setApps] = useState<InstalledAppEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch installed applications from Rust on mount
  useEffect(() => {
    let isMounted = true;
    async function loadApps() {
      setIsLoading(true);
      const res = await safeInvoke<InstalledAppEntry[]>('get_installed_apps');
      if (isMounted) {
        if (res && res.length > 0) {
          setApps(res);
        } else {
          // Mock fallbacks for preview
          setApps([
            { id: '1', name: 'Google Chrome', path: 'chrome.exe', category: 'Productivity', is_running: true },
            { id: '2', name: 'Visual Studio Code', path: 'code.exe', category: 'Development', is_running: true },
            { id: '3', name: 'Spotify', path: 'spotify.exe', category: 'Media', is_running: false },
            { id: '4', name: 'Windows Terminal', path: 'wt.exe', category: 'Development', is_running: false },
            { id: '5', name: 'File Explorer', path: 'explorer.exe', category: 'System', is_running: true },
            { id: '6', name: 'Calculator', path: 'calc.exe', category: 'System', is_running: false },
            { id: '7', name: 'Notepad', path: 'notepad.exe', category: 'System', is_running: false },
            { id: '8', name: 'Task Manager', path: 'taskmgr.exe', category: 'System', is_running: false },
            { id: '9', name: 'Windows Settings', path: 'ms-settings:', category: 'System', is_running: false },
            { id: '10', name: 'Discord', path: 'discord.exe', category: 'Productivity', is_running: false },
          ]);
        }
        setIsLoading(false);
      }
    }
    loadApps();
    return () => {
      isMounted = false;
    };
  }, []);

  // Auto-focus search input
  useEffect(() => {
    const t = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, []);

  // Filter apps by query & category
  const filteredApps = useMemo(() => {
    let list = apps;
    if (category !== 'All') {
      list = list.filter((a) => a.category.toLowerCase() === category.toLowerCase());
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q) ||
          a.path.toLowerCase().includes(q)
      );
    }
    return list;
  }, [apps, category, query]);

  // Running apps subset
  const runningApps = useMemo(() => {
    return apps.filter((a) => a.is_running);
  }, [apps]);

  // Launch application handler
  const handleLaunchApp = useCallback(
    async (app: InstalledAppEntry) => {
      playGlassPop();
      onClose();
      await safeInvoke('launch_installed_app', { path: app.path });
    },
    [onClose]
  );

  // Keyboard navigation (Escape = close, Enter = launch first app)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      playToggleClick();
      onClose();
    } else if (e.key === 'Enter') {
      if (filteredApps.length > 0) {
        e.preventDefault();
        handleLaunchApp(filteredApps[0]);
      }
    }
  };

  return (
    <motion.div
      className="launchpad-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(8px)',
        zIndex: 99998,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        paddingBottom: '68px',
        paddingLeft: '20px',
        paddingRight: '20px',
        pointerEvents: 'auto',
      }}
    >
      <motion.div
        className="launchpad-modal"
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 24 }}
        transition={{ type: 'spring', stiffness: 440, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        style={{
          width: '600px',
          height: '420px',
          maxHeight: '425px',
          borderRadius: '26px',
          backgroundColor:
            theme === 'light' ? 'rgba(255, 255, 255, 0.96)' : 'rgba(15, 23, 42, 0.94)',
          backgroundImage:
            'radial-gradient(circle at 50% 0%, rgba(56, 189, 248, 0.12), transparent 70%)',
          backdropFilter: 'blur(36px) saturate(210%)',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          boxShadow:
            '0 24px 64px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
          padding: '18px 22px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
          userSelect: 'none',
        }}
      >
        {/* Top Header: Search Pill & Category Tabs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Search Pill Input */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              height: '40px',
              padding: '0 14px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(255, 255, 255, 0.07)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)',
            }}
          >
            <Search size={16} style={{ color: '#38bdf8', flexShrink: 0 }} />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Applications..."
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 500,
                width: '100%',
              }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '2px',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {CATEGORIES.map((cat) => {
              const active = category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    playToggleClick();
                    setCategory(cat);
                  }}
                  style={{
                    padding: '4px 11px',
                    borderRadius: '9999px',
                    border: active
                      ? '1px solid rgba(56, 189, 248, 0.45)'
                      : '1px solid rgba(255, 255, 255, 0.06)',
                    background: active
                      ? 'rgba(56, 189, 248, 0.22)'
                      : 'rgba(255, 255, 255, 0.03)',
                    color: active ? '#38bdf8' : '#94a3b8',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Middle Section: 5-Column Apps Grid */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 2px',
            margin: '6px 0',
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '14px 10px',
            alignContent: 'start',
          }}
        >
          {filteredApps.length > 0 ? (
            filteredApps.map((app) => (
              <motion.div
                key={app.id}
                onClick={() => handleLaunchApp(app)}
                whileHover={{ scale: 1.1, y: -3 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  padding: '6px 4px',
                  borderRadius: '14px',
                }}
              >
                {/* 48x48 Squircle App Icon Container */}
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '13px',
                    backgroundColor: 'rgba(255, 255, 255, 0.07)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    boxShadow: '0 6px 14px rgba(0, 0, 0, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                >
                  {app.icon_data ? (
                    <img
                      src={app.icon_data}
                      alt={app.name}
                      style={{
                        width: '32px',
                        height: '32px',
                        objectFit: 'contain',
                        borderRadius: '6px',
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <DefaultAppLogo />
                  )}

                  {/* Running Indicator Dot */}
                  {app.is_running && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: '-3px',
                        width: '4.5px',
                        height: '4.5px',
                        borderRadius: '50%',
                        backgroundColor: '#22c55e',
                        boxShadow: '0 0 6px #22c55e',
                      }}
                    />
                  )}
                </div>

                {/* App Label */}
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#ffffff',
                    textAlign: 'center',
                    maxWidth: '90px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                  }}
                >
                  {app.name}
                </span>
              </motion.div>
            ))
          ) : (
            <div
              style={{
                gridColumn: 'span 5',
                textAlign: 'center',
                color: '#64748b',
                fontSize: '12px',
                padding: '40px 0',
              }}
            >
              {isLoading ? 'Scanning installed applications...' : `No applications found for "${query}"`}
            </div>
          )}
        </div>

        {/* Bottom Bar: Running Now Strip & Quick System Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '10px',
          }}
        >
          {/* Running Now Strip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '10.5px', fontWeight: 600, color: '#94a3b8' }}>
              Running ({runningApps.length}):
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {runningApps.slice(0, 5).map((rapp) => (
                <div
                  key={`run-${rapp.id}`}
                  onClick={() => handleLaunchApp(rapp)}
                  title={`Switch to ${rapp.name}`}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  {rapp.icon_data ? (
                    <img
                      src={rapp.icon_data}
                      alt=""
                      style={{ width: '16px', height: '16px', borderRadius: '3px' }}
                    />
                  ) : (
                    <span style={{ fontSize: '9px', fontWeight: 700, color: '#38bdf8' }}>
                      {rapp.name.slice(0, 1)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Quick System & Power Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => {
                playGlassPop();
                safeInvoke('launch_system_action', { action: 'lock_workstation' });
              }}
              title="Lock Screen"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 8px',
                borderRadius: '7px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: '#94a3b8',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Lock size={12} />
              <span>Lock</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playGlassPop();
                safeInvoke('launch_system_action', { action: 'sleep' });
              }}
              title="Sleep"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 8px',
                borderRadius: '7px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: '#94a3b8',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Moon size={12} />
              <span>Sleep</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playGlassPop();
                safeInvoke('launch_system_action', { action: 'task_manager' });
              }}
              title="Task Manager"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 8px',
                borderRadius: '7px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: '#94a3b8',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Cpu size={12} />
              <span>Taskmgr</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playGlassPop();
                if (onOpenSettings) {
                  onClose();
                  onOpenSettings();
                } else {
                  safeInvoke('launch_system_action', { action: 'windows_settings' });
                }
              }}
              title="LiquidIsland Settings"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 8px',
                borderRadius: '7px',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                color: '#38bdf8',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Sliders size={12} />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
