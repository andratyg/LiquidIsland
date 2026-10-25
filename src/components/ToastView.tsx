import React from 'react';
import { motion } from 'framer-motion';
import { useSystemStore, systemStore } from '../store/useSystemStore';
import {
  Bluetooth,
  Mic,
  MicOff,
  Layers,
  Pin,
  X,
} from 'lucide-react';

/* ==========================================================================
   Vector Brand Logos for Instant Crisp App Display in Unified Toast
   ========================================================================== */

const ChromeLogo: React.FC<{ size?: number }> = ({ size = 22 }) => (
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

const EdgeLogo: React.FC<{ size?: number }> = ({ size = 22 }) => (
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

const VSCodeLogo: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <path d="M35 5l8 4v30l-8 4-22-19z" fill="#0065a9" />
    <path d="M35 5L15 22l6 5 14-22z" fill="#007acc" />
    <path d="M15 26l-9 7-3-2v-6l4-3 8 4z" fill="#1f9cf0" />
    <path d="M35 43l-14-11-6 5 20 6z" fill="#007acc" />
  </svg>
);

const TerminalLogo: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <rect x="4" y="6" width="40" height="36" rx="8" fill="#0c0c0c" stroke="#4ade80" strokeWidth="2" />
    <path d="M12 17l8 7-8 7" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M24 31h12" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const SpotifyLogo: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <circle cx="24" cy="24" r="20" fill="#1db954" />
    <path d="M15 19.5c6.5-1.5 13.5-.8 19 2.5" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" />
    <path d="M16.5 24.5c5-1.2 10.5-.6 15 2" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" />
    <path d="M18 29.5c4-1 8.5-.4 12 1.6" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

const ExplorerLogo: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <rect x="4" y="8" width="40" height="32" rx="7" fill="#0284c7" />
    <path d="M4 14h18l4 5h18v21H4V14z" fill="#f59e0b" />
    <path d="M4 19h40v19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V19z" fill="#fbbf24" />
  </svg>
);

const DefaultAppLogo: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <rect x="4" y="8" width="40" height="32" rx="7" fill="#1e222a" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
    <path d="M4 17h40" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
    <circle cx="10" cy="12.5" r="2.2" fill="#ef4444" />
    <circle cx="16.5" cy="12.5" r="2.2" fill="#f59e0b" />
    <circle cx="23" cy="12.5" r="2.2" fill="#10b981" />
    <rect x="12" y="24" width="24" height="10" rx="3" fill="rgba(56, 189, 248, 0.22)" stroke="#38bdf8" strokeWidth="1.5" />
  </svg>
);

function renderAppLogo(appName: string, size: number = 22) {
  const n = (appName || '').toLowerCase();
  if (n.includes('chrome')) return <ChromeLogo size={size} />;
  if (n.includes('edge')) return <EdgeLogo size={size} />;
  if (n.includes('code') || n.includes('visual studio')) return <VSCodeLogo size={size} />;
  if (n.includes('terminal') || n.includes('powershell') || n.includes('cmd')) return <TerminalLogo size={size} />;
  if (n.includes('spotify') || n.includes('music')) return <SpotifyLogo size={size} />;
  if (n.includes('explorer')) return <ExplorerLogo size={size} />;
  return <DefaultAppLogo size={size} />;
}

// Animated Volume Speaker SVG with 3 sequential soundwave arcs
const AnimatedSpeakerSvg: React.FC<{ value: number; isMuted: boolean }> = ({ value, isMuted }) => {
  const muted = value === 0 || isMuted;
  const arc1 = value > 0 && !muted;
  const arc2 = value >= 34 && !muted;
  const arc3 = value >= 67 && !muted;

  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path
        d="M11 5L6 9H2v6h4l5 4V5z"
        fill={muted ? '#ef4444' : '#38bdf8'}
        stroke={muted ? '#ef4444' : '#38bdf8'}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {muted && (
        <line
          x1="22"
          y1="2"
          x2="2"
          y2="22"
          stroke="#ef4444"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      )}
      {arc1 && (
        <path
          d="M15.54 8.46a5 5 0 0 1 0 7.07"
          stroke="#38bdf8"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      )}
      {arc2 && (
        <path
          d="M18.07 5.93a8.5 8.5 0 0 1 0 12.14"
          stroke="#06b6d4"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      )}
      {arc3 && (
        <path
          d="M20.6 3.4a12 12 0 0 1 0 17.2"
          stroke="#10b981"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
};

// Animated Sun SVG with rotating rays and dynamic scale
const AnimatedSunSvg: React.FC<{ value: number }> = ({ value }) => {
  const rotation = value * 1.8;
  const scale = 0.82 + 0.35 * (Math.max(0, Math.min(100, value)) / 100);

  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      style={{
        flexShrink: 0,
        transform: `rotate(${rotation}deg) scale(${scale})`,
        transition: 'transform 0.12s cubic-bezier(0.2, 0.8, 0.2, 1)',
      }}
    >
      <circle cx="12" cy="12" r="4.5" fill="#fde047" stroke="#f59e0b" strokeWidth="1.5" />
      <line x1="12" y1="1" x2="12" y2="3.8" stroke="#fde047" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="12" y1="20.2" x2="12" y2="23" stroke="#fde047" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="4.22" y1="4.22" x2="6.2" y2="6.2" stroke="#fde047" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="17.8" y1="17.8" x2="19.78" y2="19.78" stroke="#fde047" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="1" y1="12" x2="3.8" y2="12" stroke="#fde047" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="20.2" y1="12" x2="23" y2="12" stroke="#fde047" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="4.22" y1="19.78" x2="6.2" y2="17.8" stroke="#fde047" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="17.8" y1="6.2" x2="19.78" y2="4.22" stroke="#fde047" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
};

export const ToastView: React.FC = () => {
  const toastPayload = useSystemStore((s) => s.toastPayload);

  // If no payload is active, fallback gracefully
  const type = toastPayload?.type ?? 'charging';
  const title = toastPayload?.title ?? 'Charging';
  const subtitle = toastPayload?.subtitle ?? 'Charger connected';
  const batteryPct = toastPayload?.percent ?? toastPayload?.value ?? 84;
  const value = toastPayload?.value ?? 84;
  const direction = toastPayload?.direction ?? 'right';
  const batteryStatus = toastPayload?.batteryStatus ?? 'charging';
  const accentColor = toastPayload?.accentColor ?? '#38bdf8';

  const isChargingState = type === 'charging' || (type === 'battery' && batteryStatus === 'charging');
  const isUnpluggedState = type === 'unplugged' || (type === 'battery' && batteryStatus === 'unplugged');
  const isPluggedIn = isChargingState;
  const isHud = type === 'hud';
  const isOvershoot = Boolean(toastPayload?.isOvershoot);
  const isMuted = Boolean(toastPayload?.isMuted || value === 0);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    systemStore.dismissToast();
  };

  return (
    <motion.div
      className={`toast-container-shell ${
        type === 'desktop-switch'
          ? direction === 'left'
            ? 'slide-wave-left'
            : 'slide-wave-right'
          : ''
      }`}
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
        scaleX: isOvershoot ? [1, 1.05, 0.97, 1] : 1,
        scaleY: isOvershoot ? [1, 0.95, 1.02, 1] : 1,
      }}
      exit={{ opacity: 0 }}
      transition={
        isOvershoot
          ? { duration: 0.35, ease: [0.22, 1, 0.36, 1] }
          : { duration: 0.18, ease: 'easeOut' }
      }
      onClick={handleDismiss}
      title="Notification - Click to dismiss"
      style={{
        width: '100%',
        height: '100%',
        padding: isHud ? '0 16px' : '0 18px',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        userSelect: 'none',
        backgroundColor: 'transparent',
        border: 'none',
        boxShadow: 'none',
      }}
    >
      {/* ==================================================================== */}
      {/* 1. Apple-Style Window Focused / Tab Switch Alert                     */}
      {/* ==================================================================== */}
      {type === 'workspace' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            height: '100%',
            gap: '12px',
          }}
        >
          {/* Left: 36x36px Squircle App Icon Container */}
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '11px',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              backgroundImage: `radial-gradient(circle, ${accentColor}35 0%, transparent 70%)`,
              border: `1px solid ${accentColor}55`,
              boxShadow: `0 0 14px ${accentColor}30`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              overflow: 'hidden',
            }}
          >
            {renderAppLogo(toastPayload?.appName || '', 22)}
          </div>

          {/* Center: Badge & Titles */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              minWidth: 0,
              flex: 1,
              lineHeight: 1.25,
              gap: '2px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span
                style={{
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  backgroundColor: accentColor,
                  boxShadow: `0 0 6px ${accentColor}`,
                  display: 'inline-block',
                }}
              />
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: accentColor,
                  textTransform: 'uppercase',
                }}
              >
                {title}
              </span>
            </div>

            <span
              style={{
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#ffffff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                letterSpacing: '-0.1px',
              }}
            >
              {toastPayload?.tabTitle || subtitle}
            </span>
          </div>

          {/* Right: Compact App Tag */}
          <div
            style={{
              fontSize: '9.5px',
              fontWeight: 600,
              color: '#94a3b8',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '9999px',
              padding: '2px 8px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {toastPayload?.appName || 'App'}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. Charging & Unplugged Battery Alert                                */}
      {/* ==================================================================== */}
      {(isChargingState || isUnpluggedState) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            height: '100%',
          }}
        >
          {/* Left: 36x36px Green Progress Ring with Centered Lightning Bolt */}
          <div
            style={{
              position: 'relative',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <circle
                cx="18"
                cy="18"
                r="14"
                stroke="rgba(34, 197, 94, 0.22)"
                strokeWidth="3"
                fill="none"
              />
              <circle
                cx="18"
                cy="18"
                r="14"
                stroke="#22c55e"
                strokeWidth="3"
                fill="none"
                strokeDasharray={87.96}
                strokeDashoffset={87.96 - (87.96 * Math.max(0, Math.min(100, batteryPct))) / 100}
                strokeLinecap="round"
                transform="rotate(-90 18 18)"
                style={{ transition: 'stroke-dashoffset 0.4s ease' }}
              />
            </svg>

            <motion.svg
              initial={false}
              animate={{
                opacity: isPluggedIn ? 1 : 0,
                scale: isPluggedIn ? 1 : 0.4,
              }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="#ffffff"
              style={{
                position: 'absolute',
                pointerEvents: 'none',
              }}
            >
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </motion.svg>
          </div>

          {/* Center-Left: Typography */}
          <div
            style={{
              marginLeft: '14px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              lineHeight: 1.25,
              flex: 1,
            }}
          >
            <div
              style={{
                fontSize: '14.5px',
                fontWeight: 600,
                color: '#ffffff',
                letterSpacing: '-0.2px',
              }}
            >
              {isPluggedIn ? 'Charging' : 'Charger unplugged'}
            </div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 400,
                color: '#8e8e93',
                letterSpacing: '-0.1px',
              }}
            >
              {isPluggedIn ? 'Charger connected' : `${batteryPct}% remaining`}
            </div>
          </div>

          {/* Right: Percentage */}
          <div
            style={{
              marginLeft: 'auto',
              fontSize: '22px',
              fontWeight: 600,
              color: '#ffffff',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.4px',
            }}
          >
            {batteryPct}%
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. Bluetooth Connected / AirBuds Pro                                  */}
      {/* ==================================================================== */}
      {(type === 'airbuds' || (type as string) === 'bluetooth') && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            height: '100%',
          }}
        >
          {/* Left: Glowing Bluetooth with radiating acoustic arcs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'rgba(59, 130, 246, 0.16)',
                border: '1px solid rgba(59, 130, 246, 0.35)',
                filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.6))',
              }}
            >
              <Bluetooth size={16} color="#3b82f6" />
            </div>

            <svg width="18" height="24" viewBox="0 0 18 24" fill="none" style={{ opacity: 0.9 }}>
              <path
                d="M 2 8 A 6 6 0 0 1 2 16"
                stroke="#3b82f6"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M 7 5 A 11 11 0 0 1 7 19"
                stroke="#3b82f6"
                strokeWidth="1.8"
                strokeLinecap="round"
                opacity="0.75"
              />
              <path
                d="M 12 2 A 16 16 0 0 1 12 22"
                stroke="#3b82f6"
                strokeWidth="1.8"
                strokeLinecap="round"
                opacity="0.45"
              />
            </svg>
          </div>

          {/* Center: Title & Subtitle */}
          <div
            style={{
              flex: 1,
              marginLeft: '10px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              lineHeight: 1.25,
            }}
          >
            <div
              style={{
                fontSize: '13.5px',
                fontWeight: 600,
                color: '#ffffff',
                letterSpacing: '-0.2px',
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>{subtitle}</span>
              <span
                style={{
                  display: 'inline-block',
                  width: '4px',
                  height: '4px',
                  borderRadius: '50%',
                  backgroundColor: '#3b82f6',
                  opacity: 0.8,
                }}
              />
              <span style={{ fontSize: '10px', opacity: 0.8 }}>Connected</span>
            </div>
          </div>

          {/* Right: Sonar Pulse Ring & Dismiss */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
            <div className="toast-sonar-ring" title="Connected">
              <div className="toast-sonar-pulse" />
              <div className="toast-sonar-dot" />
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              style={{
                background: 'none',
                border: 'none',
                padding: '2px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                opacity: 0.6,
                display: 'flex',
                alignItems: 'center',
              }}
              title="Dismiss"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 4. Exact 1:1 Slider HUD (Volume / Brightness / Mic)                   */}
      {/* ==================================================================== */}
      {type === 'hud' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            height: '100%',
            gap: '12px',
          }}
        >
          {/* Left: Crisp Vector Icon Slot */}
          <div
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {toastPayload?.hudType === 'brightness' ? (
              <AnimatedSunSvg value={value} />
            ) : toastPayload?.hudType === 'mic' ? (
              toastPayload?.isMicMuted ? (
                <MicOff size={18} color="#f43f5e" />
              ) : (
                <Mic size={18} color="#10b981" />
              )
            ) : (
              <AnimatedSpeakerSvg value={value} isMuted={isMuted} />
            )}
          </div>

          {/* Center/Right: Smooth Grey Track with Filled Liquid Blue Bar & Thumb */}
          <div
            style={{
              flex: 1,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              margin: '0 4px',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '5px',
                borderRadius: '3px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                position: 'relative',
                overflow: 'visible',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.max(0, Math.min(100, value))}%`,
                  borderRadius: '3px',
                  backgroundColor:
                    toastPayload?.hudType === 'brightness'
                      ? '#38bdf8'
                      : isMuted
                      ? '#ef4444'
                      : '#38bdf8',
                  boxShadow: isMuted
                    ? '0 0 10px rgba(239, 68, 68, 0.5)'
                    : '0 0 10px rgba(56, 189, 248, 0.5)',
                  transition: 'width 0.08s ease-out',
                }}
              />

              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: `${Math.max(0, Math.min(100, value))}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '13px',
                  height: '13px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  boxShadow: isMuted
                    ? '0 0 8px rgba(239, 68, 68, 0.8), 0 2px 4px rgba(0,0,0,0.4)'
                    : '0 0 8px rgba(56, 189, 248, 0.8), 0 2px 4px rgba(0,0,0,0.4)',
                  transition: 'left 0.08s ease-out',
                  pointerEvents: 'none',
                }}
              />
            </div>
          </div>

          {/* Right Value Label */}
          <div
            style={{
              fontSize: '12.5px',
              fontWeight: 650,
              color: '#ffffff',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.2px',
              flexShrink: 0,
              minWidth: '36px',
              textAlign: 'right',
            }}
          >
            {toastPayload?.hudType === 'mic'
              ? toastPayload?.isMicMuted
                ? 'MUTED'
                : 'ON'
              : isMuted
              ? 'MUTED'
              : `${value}%`}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 5. Virtual Desktop & Active Window Pin Pill                          */}
      {/* ==================================================================== */}
      {(type === 'desktop-switch' || type === 'window-pin') && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            height: '100%',
          }}
        >
          {/* Left Icon */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor:
                type === 'window-pin'
                  ? 'rgba(236, 72, 153, 0.16)'
                  : 'rgba(139, 92, 246, 0.16)',
              border: `1px solid ${
                type === 'window-pin'
                  ? 'rgba(236, 72, 153, 0.35)'
                  : 'rgba(139, 92, 246, 0.35)'
              }`,
            }}
          >
            {type === 'window-pin' ? (
              <Pin size={16} color="#ec4899" />
            ) : (
              <Layers size={16} color="#8b5cf6" />
            )}
          </div>

          {/* Center Column */}
          <div
            style={{
              flex: 1,
              marginLeft: '10px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              lineHeight: 1.25,
            }}
          >
            <div
              style={{
                fontSize: '13.5px',
                fontWeight: 600,
                color: '#ffffff',
                letterSpacing: '-0.2px',
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '200px',
              }}
            >
              {subtitle}
            </div>
          </div>

          {/* Right Action Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '10px',
                backgroundColor:
                  type === 'window-pin'
                    ? 'rgba(236, 72, 153, 0.2)'
                    : 'rgba(139, 92, 246, 0.2)',
                color: type === 'window-pin' ? '#f472b6' : '#a78bfa',
              }}
            >
              {type === 'window-pin' ? 'PINNED' : direction === 'left' ? 'DESK 1' : 'DESK 2'}
            </span>

            <button
              type="button"
              onClick={handleDismiss}
              style={{
                background: 'none',
                border: 'none',
                padding: '2px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                opacity: 0.6,
                display: 'flex',
                alignItems: 'center',
              }}
              title="Dismiss"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};
