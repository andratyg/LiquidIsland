import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStore } from '../store/useSystemStore';
import { RunningAppInfo } from '../types/liquid';
import { Monitor } from 'lucide-react';

interface StripAppItem {
  id: string;
  name: string;
  iconData?: string;
  active: boolean;
}

// Safe Tauri IPC Invoker with web browser fallback
async function safeInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T | null> {
  try {
    const isTauri =
      typeof window !== 'undefined' &&
      ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
    if (!isTauri) return null;
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<T>(cmd, args);
  } catch {
    return null;
  }
}

/* ==========================================================================
   Vector Brand Logos for Instant Crisp HUD Display
   ========================================================================== */

const ChromeLogo: React.FC<{ size?: number }> = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <circle cx="24" cy="24" r="20" fill="#ffffff" />
    <path d="M24 14a10 10 0 1 0 10 10A10 10 0 0 0 24 14z" fill="#ffffff" />
    <path d="M4 24h20L15.3 9A20 20 0 0 0 4 24z" fill="#ea4335" />
    <path d="M24 4a20 20 0 0 1 17.3 30H21.3l2.7-6z" fill="#fbbc05" />
    <path d="M24 44a20 20 0 0 1-17.3-10l10-17.3 5.3 9.3z" fill="#34a853" />
    <circle cx="24" cy="24" r="8" fill="#1a73e8" />
    <circle cx="24" cy="24" r="6" fill="#ffffff" />
  </svg>
);

const EdgeLogo: React.FC<{ size?: number }> = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <circle cx="24" cy="24" r="20" fill="#0078d7" opacity="0.15" />
    <path
      d="M39 26c-1.2 7.7-8 14-16.5 14C12.7 40 5 32.8 5 24c0-7.7 5.7-14.2 13.5-15.6.8-.2 1.5.4 1.5 1.2v.3c0 .6-.4 1.1-.9 1.3-5.5 2.1-9.1 7.4-9.1 13.3 0 7.7 6.3 14 14 14 6.8 0 12.5-4.9 13.7-11.4.1-.7.7-1.1 1.4-1.1h.5c.7 0 1.3.5 1.4 1.3z"
      fill="#0078d7"
    />
    <path
      d="M24.5 9c6.6 0 12 5.4 12 12 0 1.1-.9 2-2 2h-18c-1.1 0-2-.9-2-2 0-6.6 5.4-12 12-12z"
      fill="#00bcf2"
    />
  </svg>
);

const VSCodeLogo: React.FC<{ size?: number }> = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <path d="M35 5l8 4v30l-8 4-22-19z" fill="#0065a9" />
    <path d="M35 5L15 22l6 5 14-22z" fill="#007acc" />
    <path d="M15 26l-9 7-3-2v-6l4-3 8 4z" fill="#1f9cf0" />
    <path d="M35 43l-14-11-6 5 20 6z" fill="#007acc" />
  </svg>
);

const TerminalLogo: React.FC<{ size?: number }> = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <rect x="4" y="6" width="40" height="36" rx="8" fill="#0c0c0c" stroke="#4ade80" strokeWidth="2" />
    <path d="M12 17l8 7-8 7" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M24 31h12" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const SpotifyLogo: React.FC<{ size?: number }> = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <circle cx="24" cy="24" r="20" fill="#1db954" />
    <path d="M15 19.5c6.5-1.5 13.5-.8 19 2.5" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" />
    <path d="M16.5 24.5c5-1.2 10.5-.6 15 2" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" />
    <path d="M18 29.5c4-1 8.5-.4 12 1.6" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

const DiscordLogo: React.FC<{ size?: number }> = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <rect x="4" y="4" width="40" height="40" rx="10" fill="#5865f2" />
    <path
      d="M34 16c-2.4-1.1-5-1.9-7.7-2.1l-.3.6c2.9.8 4.2 2.1 4.2 2.1-2.6-1.4-5.2-2.1-7.8-2.1s-5.2.7-7.8 2.1c0 0 1.3-1.3 4.2-2.1l-.3-.6C16 14.1 13.4 14.9 11 16 7.6 21 6.8 26 7.2 31c3.1 2.3 6.1 2.2 6.1 2.2l1.3-1.8c-2.4-.7-3.4-2.2-3.4-2.2.3.2 2.7 1.7 7.8 1.7s7.5-1.5 7.8-1.7c0 0-1 1.5-3.4 2.2l1.3 1.8s3 .1 6.1-2.2c.4-5-.4-10-3.7-15zM17 26.5c-1.4 0-2.5-1.3-2.5-2.8s1.1-2.8 2.5-2.8 2.5 1.3 2.5 2.8-1.1 2.8-2.5 2.8zm11 0c-1.4 0-2.5-1.3-2.5-2.8s1.1-2.8 2.5-2.8 2.5 1.3 2.5 2.8-1.1 2.8-2.5 2.8z"
      fill="#ffffff"
    />
  </svg>
);

const ExplorerLogo: React.FC<{ size?: number }> = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <rect x="4" y="8" width="40" height="32" rx="7" fill="#0284c7" />
    <path d="M4 14h18l4 5h18v21H4V14z" fill="#f59e0b" />
    <path d="M4 19h40v19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V19z" fill="#fbbf24" />
  </svg>
);

const DefaultAppLogo: React.FC<{ size?: number }> = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <rect x="4" y="8" width="40" height="32" rx="7" fill="#1e222a" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
    <path d="M4 17h40" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
    <circle cx="10" cy="12.5" r="2.2" fill="#ef4444" />
    <circle cx="16.5" cy="12.5" r="2.2" fill="#f59e0b" />
    <circle cx="23" cy="12.5" r="2.2" fill="#10b981" />
    <rect x="12" y="24" width="24" height="10" rx="3" fill="rgba(56, 189, 248, 0.22)" stroke="#38bdf8" strokeWidth="1.5" />
  </svg>
);

/* ==========================================================================
   Master WorkspaceSwitcherOverlay Component
   ========================================================================== */

export const WorkspaceSwitcherOverlay: React.FC = () => {
  const workspaceActivity = useSystemStore((s) => s.workspaceActivity);
  const [runningApps, setRunningApps] = useState<RunningAppInfo[]>([]);
  const [activeDesktopIndex, setActiveDesktopIndex] = useState<number>(1);

  // Poll real running apps whenever workspace activity triggers
  useEffect(() => {
    let isMounted = true;
    if (workspaceActivity) {
      safeInvoke<RunningAppInfo[]>('get_running_apps').then((apps) => {
        if (isMounted && apps && Array.isArray(apps)) {
          setRunningApps(apps);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [workspaceActivity]);

  // Update Virtual Desktop Index (1, 2, 3) on desktop-switch
  useEffect(() => {
    if (workspaceActivity?.kind === 'desktop-switch') {
      const dir = workspaceActivity.direction;
      setActiveDesktopIndex((prev) => {
        if (dir === 'right') {
          return prev >= 3 ? 1 : prev + 1;
        } else if (dir === 'left') {
          return prev <= 1 ? 3 : prev - 1;
        }
        return prev;
      });
    }
  }, [workspaceActivity]);

  const isVisible = Boolean(workspaceActivity);
  const isDesktopSwitch = workspaceActivity?.kind === 'desktop-switch';
  const isTabOrAppSwitch =
    workspaceActivity?.kind === 'tab-switch' || workspaceActivity?.kind === 'app-switch';
  const accentColor = workspaceActivity?.accent_color || '#38bdf8';

  // Find active app match from running apps list for real base64 icon
  const matchedRunningApp = useMemo(() => {
    if (!workspaceActivity) return null;
    const name = workspaceActivity.app_name.toLowerCase();
    return runningApps.find(
      (a) =>
        a.title.toLowerCase().includes(name) ||
        a.process_name.toLowerCase().includes(name) ||
        a.is_focused
    );
  }, [workspaceActivity, runningApps]);

  // Render app logo helper (real base64 icon or vector fallback)
  const renderLogo = (size: number = 28) => {
    if (matchedRunningApp?.icon_data && matchedRunningApp.icon_data.startsWith('data:image/')) {
      return (
        <img
          src={matchedRunningApp.icon_data}
          alt={workspaceActivity?.app_name || 'App'}
          style={{
            width: `${size}px`,
            height: `${size}px`,
            objectFit: 'contain',
            borderRadius: '6px',
            filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))',
          }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      );
    }

    const appName = (workspaceActivity?.app_name || '').toLowerCase();
    if (appName.includes('chrome')) return <ChromeLogo size={size} />;
    if (appName.includes('edge')) return <EdgeLogo size={size} />;
    if (appName.includes('code') || appName.includes('visual studio')) return <VSCodeLogo size={size} />;
    if (appName.includes('terminal')) return <TerminalLogo size={size} />;
    if (appName.includes('spotify')) return <SpotifyLogo size={size} />;
    if (appName.includes('discord')) return <DiscordLogo size={size} />;
    if (appName.includes('explorer') || appName.includes('file')) return <ExplorerLogo size={size} />;

    return <DefaultAppLogo size={size} />;
  };

  // Mini Command+Tab recent apps list (max 4 apps)
  const recentStripApps = useMemo<StripAppItem[]>(() => {
    if (runningApps.length === 0) {
      return [
        { id: '1', name: workspaceActivity?.app_name || 'App', active: true },
        { id: '2', name: 'Terminal', active: false },
        { id: '3', name: 'Chrome', active: false },
      ];
    }
    return runningApps.slice(0, 4).map((a) => ({
      id: `${a.hwnd}`,
      name: a.title,
      iconData: a.icon_data,
      active:
        a.is_focused ||
        a.title.toLowerCase().includes((workspaceActivity?.app_name || '').toLowerCase()),
    }));
  }, [runningApps, workspaceActivity]);

  return (
    <AnimatePresence>
      {isVisible && workspaceActivity && (
        <motion.div
          key={`stage-hud-${workspaceActivity.timestamp}`}
          className="stage-hud-overlay"
          initial={{ opacity: 0, y: -16, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 480, damping: 28 }}
          style={{
            position: 'fixed',
            top: '76px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '460px',
            height: '84px',
            borderRadius: '26px',
            backgroundColor: 'rgba(12, 14, 22, 0.92)',
            backgroundImage: `radial-gradient(circle at 50% 0%, ${accentColor}22, transparent 80%)`,
            backdropFilter: 'blur(36px) saturate(200%)',
            border: `1px solid ${accentColor}44`,
            boxShadow: `0 24px 64px rgba(0, 0, 0, 0.75), 0 0 28px ${accentColor}28, inset 0 1px 0 rgba(255, 255, 255, 0.2)`,
            display: 'flex',
            alignItems: 'center',
            padding: '12px 20px',
            boxSizing: 'border-box',
            pointerEvents: 'none',
            userSelect: 'none',
            zIndex: 99990,
            overflow: 'hidden',
          }}
        >
          {/* Specular Rim Light Sweep */}
          <motion.div
            className="liquid-rim-sweep"
            initial={{ x: '-100%', opacity: 0 }}
            animate={{ x: '250%', opacity: [0, 1, 0.8, 0] }}
            transition={{ duration: 1.1, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(90deg, transparent 0%, ${accentColor}55 50%, transparent 100%)`,
              pointerEvents: 'none',
            }}
          />

          {/* ================================================================ */}
          {/* VIEW A: APP SWITCH & TAB SWITCH HUD                              */}
          {/* ================================================================ */}
          {isTabOrAppSwitch && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                gap: '14px',
                position: 'relative',
                zIndex: 2,
              }}
            >
              {/* Left: 52x52 Squircle App Icon Container */}
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  backgroundImage: `radial-gradient(circle, ${accentColor}35 0%, transparent 70%)`,
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  boxShadow: `0 6px 16px rgba(0,0,0,0.4), 0 0 18px ${accentColor}35`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {renderLogo(32)}
              </div>

              {/* Center: Badge, Sliding Title & Subtitle */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  minWidth: 0,
                  flex: 1,
                  gap: '3px',
                }}
              >
                {/* Category Tracking Badge with Pulsing Dot */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: accentColor,
                      boxShadow: `0 0 8px ${accentColor}`,
                      display: 'inline-block',
                    }}
                  />
                  <span
                    style={{
                      fontSize: '9.5px',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      color: accentColor,
                      textTransform: 'uppercase',
                    }}
                  >
                    {workspaceActivity.kind === 'tab-switch'
                      ? 'Active Tab Switched'
                      : 'Window Focused'}
                  </span>
                </div>

                {/* Main Clean Tab / Window Title */}
                <span
                  title={workspaceActivity.tab_title}
                  style={{
                    fontSize: '13.5px',
                    fontWeight: 650,
                    color: '#ffffff',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: 1.25,
                    letterSpacing: '-0.1px',
                  }}
                >
                  {workspaceActivity.tab_title}
                </span>

                {/* Subtitle: App Name + Workspace Index */}
                <span
                  style={{
                    fontSize: '10px',
                    color: '#94a3b8',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {workspaceActivity.app_name} &bull; Workspace {activeDesktopIndex}
                </span>
              </div>

              {/* Right: Mini Command+Tab Strip Capsule */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 7px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  flexShrink: 0,
                }}
                title="Recent Windows"
              >
                {recentStripApps.map((item, idx) => (
                  <div
                    key={`mini-app-${item.id}-${idx}`}
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: item.active
                        ? `${accentColor}33`
                        : 'rgba(255, 255, 255, 0.05)',
                      border: item.active
                        ? `1.5px solid ${accentColor}`
                        : '1px solid rgba(255, 255, 255, 0.08)',
                      boxShadow: item.active ? `0 0 8px ${accentColor}` : 'none',
                    }}
                  >
                    {item.iconData && item.iconData.startsWith('data:image/') ? (
                      <img
                        src={item.iconData}
                        alt="app"
                        style={{ width: '15px', height: '15px', objectFit: 'contain' }}
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          color: item.active ? '#ffffff' : '#94a3b8',
                        }}
                      >
                        {item.name ? item.name.trim().charAt(0).toUpperCase() : 'A'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* VIEW B: VIRTUAL DESKTOP SWITCH HUD (Ctrl + Win + Left/Right)     */}
          {/* ================================================================ */}
          {isDesktopSwitch && (
            <motion.div
              initial={{
                x: workspaceActivity.direction === 'right' ? 35 : -35,
                opacity: 0,
                scale: 0.94,
              }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 26 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                position: 'relative',
                zIndex: 2,
              }}
            >
              {[1, 2, 3].map((deskNum) => {
                const isActive = deskNum === activeDesktopIndex;
                return (
                  <div
                    key={`desk-card-${deskNum}`}
                    style={{
                      flex: 1,
                      height: '56px',
                      margin: '0 4px',
                      borderRadius: '12px',
                      backgroundColor: isActive
                        ? 'rgba(56, 189, 248, 0.16)'
                        : 'rgba(255, 255, 255, 0.04)',
                      backgroundImage: isActive
                        ? 'radial-gradient(circle at 50% 0%, rgba(56, 189, 248, 0.25), transparent 80%)'
                        : 'none',
                      border: isActive
                        ? '1.5px solid #38bdf8'
                        : '1px solid rgba(255, 255, 255, 0.08)',
                      boxShadow: isActive
                        ? '0 0 16px rgba(56, 189, 248, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
                        : 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Monitor
                        size={14}
                        style={{ color: isActive ? '#38bdf8' : '#64748b' }}
                      />
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: isActive ? 700 : 500,
                          color: isActive ? '#ffffff' : '#94a3b8',
                        }}
                      >
                        Desktop {deskNum}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span
                        style={{
                          width: '5px',
                          height: '5px',
                          borderRadius: '50%',
                          backgroundColor: isActive ? '#38bdf8' : 'rgba(255,255,255,0.2)',
                          boxShadow: isActive ? '0 0 6px #38bdf8' : 'none',
                        }}
                      />
                      <span
                        style={{
                          fontSize: '9px',
                          color: isActive ? '#38bdf8' : '#64748b',
                          fontWeight: 600,
                        }}
                      >
                        {isActive ? 'ACTIVE' : 'READY'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
