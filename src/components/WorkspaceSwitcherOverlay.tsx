import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStore } from '../store/useSystemStore';
import { RunningAppInfo } from '../types/liquid';
import { Monitor, Layers } from 'lucide-react';

interface DisplayAppCard {
  id: string;
  name: string;
  title: string;
  iconData?: string;
  iconHint?: string;
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
   Vector Brand Logos for Instant Crisp HUD Display Fallback
   ========================================================================== */

const ChromeLogo: React.FC<{ size?: number }> = ({ size = 32 }) => (
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

const EdgeLogo: React.FC<{ size?: number }> = ({ size = 32 }) => (
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

const VSCodeLogo: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <path d="M35 5l8 4v30l-8 4-22-19z" fill="#0065a9" />
    <path d="M35 5L15 22l6 5 14-22z" fill="#007acc" />
    <path d="M15 26l-9 7-3-2v-6l4-3 8 4z" fill="#1f9cf0" />
    <path d="M35 43l-14-11-6 5 20 6z" fill="#007acc" />
  </svg>
);

const TerminalLogo: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <rect x="4" y="6" width="40" height="36" rx="8" fill="#0c0c0c" stroke="#4ade80" strokeWidth="2" />
    <path d="M12 17l8 7-8 7" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M24 31h12" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const SpotifyLogo: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <circle cx="24" cy="24" r="20" fill="#1db954" />
    <path d="M15 19.5c6.5-1.5 13.5-.8 19 2.5" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" />
    <path d="M16.5 24.5c5-1.2 10.5-.6 15 2" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" />
    <path d="M18 29.5c4-1 8.5-.4 12 1.6" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

const DiscordLogo: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <rect x="4" y="4" width="40" height="40" rx="10" fill="#5865f2" />
    <path
      d="M34 16c-2.4-1.1-5-1.9-7.7-2.1l-.3.6c2.9.8 4.2 2.1 4.2 2.1-2.6-1.4-5.2-2.1-7.8-2.1s-5.2.7-7.8 2.1c0 0 1.3-1.3 4.2-2.1l-.3-.6C16 14.1 13.4 14.9 11 16 7.6 21 6.8 26 7.2 31c3.1 2.3 6.1 2.2 6.1 2.2l1.3-1.8c-2.4-.7-3.4-2.2-3.4-2.2.3.2 2.7 1.7 7.8 1.7s7.5-1.5 7.8-1.7c0 0-1 1.5-3.4 2.2l1.3 1.8s3 .1 6.1-2.2c.4-5-.4-10-3.7-15zM17 26.5c-1.4 0-2.5-1.3-2.5-2.8s1.1-2.8 2.5-2.8 2.5 1.3 2.5 2.8-1.1 2.8-2.5 2.8zm11 0c-1.4 0-2.5-1.3-2.5-2.8s1.1-2.8 2.5-2.8 2.5 1.3 2.5 2.8-1.1 2.8-2.5 2.8z"
      fill="#ffffff"
    />
  </svg>
);

const ExplorerLogo: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <rect x="4" y="8" width="40" height="32" rx="7" fill="#0284c7" />
    <path d="M4 14h18l4 5h18v21H4V14z" fill="#f59e0b" />
    <path d="M4 19h40v19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V19z" fill="#fbbf24" />
  </svg>
);

const DefaultAppLogo: React.FC<{ size?: number }> = ({ size = 32 }) => (
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
   Master WorkspaceSwitcherOverlay Component (Stage 3 - 40MB Edition)
   ========================================================================== */

export const WorkspaceSwitcherOverlay: React.FC = () => {
  const workspaceActivity = useSystemStore((s) => s.workspaceActivity);
  const [runningApps, setRunningApps] = useState<RunningAppInfo[]>([]);
  const [activeDesktopIndex, setActiveDesktopIndex] = useState<number>(1);

  // Poll real running apps if workspace activity payload did not already contain recent_apps
  useEffect(() => {
    let isMounted = true;
    if (workspaceActivity && (!workspaceActivity.recent_apps || workspaceActivity.recent_apps.length === 0)) {
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

  // 1. Resolve Available Apps Pool from Payload or Fallback
  const availableApps = useMemo<RunningAppInfo[]>(() => {
    if (workspaceActivity?.recent_apps && workspaceActivity.recent_apps.length > 0) {
      return workspaceActivity.recent_apps;
    }
    if (runningApps.length > 0) {
      return runningApps;
    }
    return [];
  }, [workspaceActivity, runningApps]);

  // 2. Build 3 to 5 Card 3D CoverFlow List with the Active Window in Center Slot
  const coverFlowCards = useMemo<DisplayAppCard[]>(() => {
    const activeAppName = workspaceActivity?.app_name || 'Active App';
    const activeTabTitle = workspaceActivity?.tab_title || 'Focused Window';

    if (availableApps.length === 0) {
      // High-fluidity default fallback items
      return [
        { id: 'app-left', name: 'Google Chrome', title: 'Chrome — Search', active: false },
        { id: 'app-center', name: activeAppName, title: activeTabTitle, active: true },
        { id: 'app-right', name: 'Terminal', title: 'PowerShell 7.4', active: false },
      ];
    }

    // Identify index of focused or matching app
    const activeIdx = availableApps.findIndex(
      (a) =>
        a.is_focused ||
        a.title.toLowerCase().includes(activeAppName.toLowerCase()) ||
        a.process_name.toLowerCase().includes(activeAppName.toLowerCase())
    );

    const safeActiveIdx = activeIdx >= 0 ? activeIdx : 0;
    const centerApp = availableApps[safeActiveIdx];

    // Rearrange apps into 3-slot arc [Left, Center, Right]
    const leftApp =
      safeActiveIdx > 0
        ? availableApps[safeActiveIdx - 1]
        : availableApps.length > 1
        ? availableApps[availableApps.length - 1]
        : null;

    const rightApp =
      safeActiveIdx < availableApps.length - 1
        ? availableApps[safeActiveIdx + 1]
        : availableApps.length > 2
        ? availableApps[0]
        : null;

    const cards: DisplayAppCard[] = [];

    if (leftApp) {
      cards.push({
        id: `left-${leftApp.hwnd}`,
        name: leftApp.process_name.replace('.exe', '') || 'Application',
        title: leftApp.title,
        iconData: leftApp.icon_data,
        iconHint: leftApp.icon_hint,
        active: false,
      });
    }

    cards.push({
      id: `center-${centerApp.hwnd}`,
      name: activeAppName,
      title: activeTabTitle,
      iconData: centerApp.icon_data,
      iconHint: centerApp.icon_hint,
      active: true,
    });

    if (rightApp && rightApp.hwnd !== leftApp?.hwnd) {
      cards.push({
        id: `right-${rightApp.hwnd}`,
        name: rightApp.process_name.replace('.exe', '') || 'Application',
        title: rightApp.title,
        iconData: rightApp.icon_data,
        iconHint: rightApp.icon_hint,
        active: false,
      });
    }

    return cards;
  }, [availableApps, workspaceActivity]);

  // Render app logo helper (real 48x48 base64 PNG icon or vector logo fallback)
  const renderAppLogo = (app: DisplayAppCard, size: number = 38) => {
    if (app.iconData && app.iconData.startsWith('data:image/')) {
      return (
        <img
          src={app.iconData}
          alt={app.name}
          style={{
            width: `${size}px`,
            height: `${size}px`,
            objectFit: 'contain',
            borderRadius: '10px',
            filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))',
          }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      );
    }

    const n = (app.name || app.iconHint || '').toLowerCase();
    if (n.includes('chrome')) return <ChromeLogo size={size} />;
    if (n.includes('edge')) return <EdgeLogo size={size} />;
    if (n.includes('code') || n.includes('visual studio')) return <VSCodeLogo size={size} />;
    if (n.includes('terminal')) return <TerminalLogo size={size} />;
    if (n.includes('spotify')) return <SpotifyLogo size={size} />;
    if (n.includes('discord')) return <DiscordLogo size={size} />;
    if (n.includes('explorer') || n.includes('file')) return <ExplorerLogo size={size} />;

    return <DefaultAppLogo size={size} />;
  };

  return (
    <AnimatePresence>
      {isVisible && workspaceActivity && (
        <motion.div
          key={`stage-hud-${workspaceActivity.timestamp}`}
          className="stage-deck-3d"
          initial={{ opacity: 0, y: -20, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          style={{
            position: 'fixed',
            top: '76px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '540px',
            height: '148px',
            borderRadius: '32px',
            backgroundColor: 'rgba(10, 12, 20, 0.94)',
            backgroundImage: `radial-gradient(ellipse at 50% 0%, ${accentColor}28 0%, rgba(10, 12, 20, 0.96) 80%)`,
            backdropFilter: 'blur(42px) saturate(210%)',
            WebkitBackdropFilter: 'blur(42px) saturate(210%)',
            border: `1px solid rgba(255, 255, 255, 0.14)`,
            boxShadow: `0 32px 80px rgba(0, 0, 0, 0.85), 0 0 36px ${accentColor}25, inset 0 1px 0 rgba(255, 255, 255, 0.28)`,
            display: 'flex',
            flexDirection: 'column',
            padding: '12px 18px',
            boxSizing: 'border-box',
            pointerEvents: 'none',
            userSelect: 'none',
            zIndex: 99990,
            overflow: 'hidden',
          }}
        >
          {/* Animated Specular Rim Light Sweep */}
          <motion.div
            className="liquid-rim-sweep"
            initial={{ x: '-100%', opacity: 0 }}
            animate={{ x: '250%', opacity: [0, 1, 0.8, 0] }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '2px',
              background: `linear-gradient(90deg, transparent 0%, ${accentColor} 50%, transparent 100%)`,
              pointerEvents: 'none',
            }}
          />

          {/* Top HUD Header Info Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              paddingBottom: '8px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              position: 'relative',
              zIndex: 3,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: accentColor,
                  boxShadow: `0 0 10px ${accentColor}`,
                  display: 'inline-block',
                }}
              />
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 750,
                  letterSpacing: '0.08em',
                  color: accentColor,
                  textTransform: 'uppercase',
                }}
              >
                {workspaceActivity.kind === 'tab-switch'
                  ? 'Active Tab Switched'
                  : workspaceActivity.kind === 'desktop-switch'
                  ? 'Spatial Virtual Desktop'
                  : '3D Application Switcher'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Layers size={11} style={{ color: '#94a3b8' }} />
              <span
                style={{
                  fontSize: '9.5px',
                  fontWeight: 600,
                  color: '#94a3b8',
                  letterSpacing: '0.04em',
                }}
              >
                {isDesktopSwitch ? 'Ctrl + Win + ◄/►' : 'Alt + Tab / Ctrl + Tab'}
              </span>
            </div>
          </div>

          {/* ================================================================ */}
          {/* VIEW A: VISIONOS 3D COVERFLOW APP & TAB SWITCHER                 */}
          {/* ================================================================ */}
          {isTabOrAppSwitch && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                flex: 1,
                perspective: '1200px',
                transformStyle: 'preserve-3d',
                position: 'relative',
                zIndex: 2,
                marginTop: '4px',
              }}
            >
              {coverFlowCards.map((card, idx) => {
                const isCenter = card.active;
                const isLeft = !isCenter && idx === 0;

                // 3D Arc Transformation Matrix
                const cardTransform = isCenter
                  ? 'translateZ(36px) scale(1.08)'
                  : isLeft
                  ? 'rotateY(24deg) translateX(-18px) scale(0.84)'
                  : 'rotateY(-24deg) translateX(18px) scale(0.84)';

                const cardOpacity = isCenter ? 1 : 0.55;

                return (
                  <motion.div
                    key={card.id}
                    className="stage-coverflow-card"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: cardOpacity, scale: 1 }}
                    transition={{ duration: 0.25 }}
                    style={{
                      transform: cardTransform,
                      display: 'flex',
                      alignItems: 'center',
                      gap: isCenter ? '14px' : '8px',
                      padding: isCenter ? '10px 16px' : '8px 12px',
                      borderRadius: isCenter ? '20px' : '16px',
                      backgroundColor: isCenter
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(255, 255, 255, 0.03)',
                      backgroundImage: isCenter
                        ? `radial-gradient(circle at 50% 50%, ${accentColor}30 0%, transparent 80%)`
                        : 'none',
                      border: isCenter
                        ? `1.5px solid ${accentColor}66`
                        : '1px solid rgba(255, 255, 255, 0.09)',
                      boxShadow: isCenter
                        ? `0 16px 36px rgba(0,0,0,0.6), 0 0 28px ${accentColor}35, inset 0 1px 0 rgba(255,255,255,0.2)`
                        : 'none',
                      maxWidth: isCenter ? '320px' : '100px',
                      flexShrink: 0,
                    }}
                  >
                    {/* App Icon Slot */}
                    <div
                      style={{
                        width: isCenter ? '48px' : '36px',
                        height: isCenter ? '48px' : '36px',
                        borderRadius: isCenter ? '14px' : '10px',
                        backgroundColor: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        boxShadow: isCenter ? `0 0 18px ${accentColor}40` : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {renderAppLogo(card, isCenter ? 34 : 24)}
                    </div>

                    {/* Center Card Slot-Machine Vertical Text Transition */}
                    {isCenter && (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          minWidth: 0,
                          flex: 1,
                          gap: '2px',
                        }}
                      >
                        <motion.span
                          key={`tab-title-${card.title}`}
                          initial={{ y: 8, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: -8, opacity: 0 }}
                          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                          style={{
                            fontSize: '13px',
                            fontWeight: 700,
                            color: '#ffffff',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            lineHeight: 1.25,
                            letterSpacing: '-0.1px',
                          }}
                        >
                          {card.title}
                        </motion.span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 600,
                              color: '#94a3b8',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {card.name}
                          </span>
                          <span style={{ fontSize: '9px', color: '#64748b' }}>&bull;</span>
                          <span
                            style={{
                              fontSize: '9.5px',
                              color: accentColor,
                              fontWeight: 650,
                            }}
                          >
                            Focused
                          </span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* ================================================================ */}
          {/* VIEW B: SPATIAL 3D VIRTUAL DESKTOP PANORAMA                      */}
          {/* ================================================================ */}
          {isDesktopSwitch && (
            <motion.div
              key={`panorama-${workspaceActivity.timestamp}`}
              initial={{
                x: workspaceActivity.direction === 'right' ? 80 : -80,
                rotateY: workspaceActivity.direction === 'right' ? 14 : -14,
                opacity: 0,
                scale: 0.92,
              }}
              animate={{ x: 0, rotateY: 0, opacity: 1, scale: 1 }}
              exit={{
                x: workspaceActivity.direction === 'right' ? -60 : 60,
                rotateY: workspaceActivity.direction === 'right' ? -10 : 10,
                opacity: 0,
                scale: 0.94,
              }}
              transition={{ type: 'spring', stiffness: 360, damping: 24 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                width: '100%',
                flex: 1,
                transformStyle: 'preserve-3d',
                perspective: '1200px',
                marginTop: '4px',
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
                      height: '76px',
                      borderRadius: '16px',
                      backgroundColor: isActive
                        ? 'rgba(56, 189, 248, 0.16)'
                        : 'rgba(255, 255, 255, 0.04)',
                      backgroundImage: isActive
                        ? 'radial-gradient(circle at 50% 0%, rgba(56, 189, 248, 0.32) 0%, rgba(14, 18, 30, 0.9) 80%)'
                        : 'none',
                      border: isActive
                        ? '1.5px solid #38bdf8'
                        : '1px solid rgba(255, 255, 255, 0.09)',
                      boxShadow: isActive
                        ? '0 0 24px rgba(56, 189, 248, 0.45), inset 0 1px 0 rgba(255,255,255,0.3)'
                        : 'none',
                      transform: isActive ? 'translateZ(20px) scale(1.04)' : 'scale(0.96)',
                      transition: 'all 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      padding: '6px',
                      boxSizing: 'border-box',
                    }}
                  >
                    {/* Miniature Desktop Wireframe */}
                    <div
                      style={{
                        width: '42px',
                        height: '24px',
                        borderRadius: '4px',
                        backgroundColor: isActive
                          ? 'rgba(56, 189, 248, 0.22)'
                          : 'rgba(255, 255, 255, 0.06)',
                        border: isActive
                          ? '1px solid rgba(56, 189, 248, 0.6)'
                          : '1px solid rgba(255, 255, 255, 0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2px',
                        boxShadow: isActive ? '0 0 10px rgba(56, 189, 248, 0.35)' : 'none',
                      }}
                    >
                      <div
                        style={{
                          width: '14px',
                          height: '14px',
                          borderRadius: '2px',
                          backgroundColor: isActive ? '#38bdf8' : 'rgba(255,255,255,0.2)',
                          opacity: 0.8,
                        }}
                      />
                      <div
                        style={{
                          width: '14px',
                          height: '14px',
                          borderRadius: '2px',
                          backgroundColor: isActive ? '#818cf8' : 'rgba(255,255,255,0.15)',
                          opacity: 0.6,
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Monitor
                        size={12}
                        style={{ color: isActive ? '#38bdf8' : '#64748b' }}
                      />
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: isActive ? 750 : 500,
                          color: isActive ? '#ffffff' : '#94a3b8',
                          letterSpacing: '-0.2px',
                        }}
                      >
                        Workspace {deskNum}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span
                        style={{
                          width: '5px',
                          height: '5px',
                          borderRadius: '50%',
                          backgroundColor: isActive ? '#38bdf8' : 'rgba(255,255,255,0.25)',
                          boxShadow: isActive ? '0 0 8px #38bdf8' : 'none',
                        }}
                      />
                      <span
                        style={{
                          fontSize: '8.5px',
                          color: isActive ? '#38bdf8' : '#64748b',
                          fontWeight: 700,
                          letterSpacing: '0.04em',
                        }}
                      >
                        {isActive ? 'ACTIVE STAGE' : 'READY'}
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
