import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStore, systemStore } from '../store/useSystemStore';
import {
  Bluetooth,
  Mic,
  MicOff,
  Layers,
  Pin,
  X,
} from 'lucide-react';

// Animated Volume Speaker SVG with 3 sequential soundwave arcs
const AnimatedSpeakerSvg: React.FC<{ value: number; isMuted: boolean }> = ({ value, isMuted }) => {
  const muted = value === 0 || isMuted;
  const arc1 = value > 0 && !muted;
  const arc2 = value >= 34 && !muted;
  const arc3 = value >= 67 && !muted;

  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      {/* Speaker horn body */}
      <path
        d="M11 5L6 9H2v6h4l5 4V5z"
        fill={muted ? '#ef4444' : '#38bdf8'}
        stroke={muted ? '#ef4444' : '#38bdf8'}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* Diagonal Mute Slash */}
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
      {/* Soundwave Arc 1 (1–33%) */}
      {arc1 && (
        <path
          d="M15.54 8.46a5 5 0 0 1 0 7.07"
          stroke="#38bdf8"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      )}
      {/* Soundwave Arc 2 (34–66%) */}
      {arc2 && (
        <path
          d="M18.07 5.93a8.5 8.5 0 0 1 0 12.14"
          stroke="#06b6d4"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      )}
      {/* Soundwave Arc 3 (67–100%) */}
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
    <>
      <motion.div
        className={`toast-container-shell ${
          type === 'desktop-switch'
            ? direction === 'left'
              ? 'slide-wave-left'
              : 'slide-wave-right'
            : ''
        }`}
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{
          opacity: 1,
          scale: 1,
          scaleX: isOvershoot ? [1, 1.06, 0.97, 1] : 1,
          scaleY: isOvershoot ? [1, 0.94, 1.02, 1] : 1,
        }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={
          isOvershoot
            ? { duration: 0.35, ease: [0.22, 1, 0.36, 1] }
            : { type: 'spring', stiffness: 440, damping: 32, mass: 0.75 }
        }
        onClick={handleDismiss}
        title="Notification - Click to dismiss"
        style={{
          width: isHud ? '360px' : '340px',
          height: isHud ? '62px' : '64px',
          borderRadius: isHud ? '31px' : '32px',
          backgroundColor: '#000000',
          padding: '0 20px',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
          userSelect: 'none',
          border: `1px solid ${isOvershoot ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255, 255, 255, 0.08)'}`,
          boxShadow: isOvershoot
            ? '0 16px 36px -4px rgba(239, 68, 68, 0.35), 0 0 0 1px rgba(239, 68, 68, 0.4)'
            : '0 16px 36px -4px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.06)',
        }}
      >
      {/* ==================================================================== */}
      {/* 1:1 Video Charging & Unplugged Toast UI (00:03–00:10 of Reference)  */}
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
              {/* Dark Green Track */}
              <circle
                cx="18"
                cy="18"
                r="14"
                stroke="rgba(34, 197, 94, 0.22)"
                strokeWidth="3"
                fill="none"
              />
              {/* Active Green Arc */}
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

            {/* Crisp White Lightning Bolt (Visible on Charging, Faded/Scaled out on Unplugged) */}
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

          {/* Center-Left: Exact Typography from Video */}
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
                fontSize: '15px',
                fontWeight: 600,
                color: '#ffffff',
                letterSpacing: '-0.2px',
                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif",
              }}
            >
              {isPluggedIn ? 'Charging' : 'Charger unplugged'}
            </div>
            <div
              style={{
                fontSize: '12.5px',
                fontWeight: 400,
                color: '#8e8e93',
                letterSpacing: '-0.1px',
                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif",
              }}
            >
              {isPluggedIn ? 'Charger connected' : `${batteryPct}% remaining`}
            </div>
          </div>

          {/* Right: Large Tabular Percentage from Video */}
          <div
            style={{
              marginLeft: 'auto',
              fontSize: '22px',
              fontWeight: 600,
              color: '#ffffff',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.4px',
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif",
            }}
          >
            {batteryPct}%
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* Toast Mode A — AirBuds Pro Connected                                 */}
      {/* ==================================================================== */}
      {type === 'airbuds' && (
        <>
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

            {/* Radiating Acoustic Wave Arcs */}
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
              marginLeft: '8px',
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
                color: 'var(--text-primary)',
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
              <span style={{ fontSize: '10px', opacity: 0.8 }}>Stereo ANC</span>
            </div>
          </div>

          {/* Right: Sonar Pulse Ring */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="toast-sonar-ring" title="Connected">
              <div className="toast-sonar-pulse" />
              <div className="toast-sonar-dot" />
            </div>

            <button
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
        </>
      )}

      {/* ==================================================================== */}
      {/* Toast Mode C — Dedicated 360x62px Liquid System HUD                  */}
      {/* ==================================================================== */}
      {type === 'hud' && (
        <>
          {/* Left: Dedicated High-Contrast Animated Graphic */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              minWidth: '36px',
              borderRadius: '50%',
              backgroundColor:
                toastPayload?.hudType === 'brightness'
                  ? 'rgba(253, 224, 71, 0.16)'
                  : toastPayload?.hudType === 'mic'
                  ? toastPayload?.isMicMuted
                    ? 'rgba(244, 63, 94, 0.16)'
                    : 'rgba(16, 185, 129, 0.16)'
                  : isMuted
                  ? 'rgba(239, 68, 68, 0.18)'
                  : 'rgba(56, 189, 248, 0.16)',
              border: `1px solid ${
                toastPayload?.hudType === 'brightness'
                  ? 'rgba(253, 224, 71, 0.35)'
                  : toastPayload?.hudType === 'mic'
                  ? toastPayload?.isMicMuted
                    ? 'rgba(244, 63, 94, 0.35)'
                    : 'rgba(16, 185, 129, 0.35)'
                  : isMuted
                  ? 'rgba(239, 68, 68, 0.45)'
                  : 'rgba(56, 189, 248, 0.35)'
              }`,
              boxShadow:
                toastPayload?.hudType === 'brightness'
                  ? '0 0 12px rgba(253, 224, 71, 0.25)'
                  : isMuted
                  ? '0 0 12px rgba(239, 68, 68, 0.35)'
                  : '0 0 12px rgba(56, 189, 248, 0.25)',
            }}
          >
            {toastPayload?.hudType === 'brightness' ? (
              <AnimatedSunSvg value={value} />
            ) : toastPayload?.hudType === 'mic' ? (
              toastPayload?.isMicMuted ? (
                <MicOff size={17} color="#f43f5e" />
              ) : (
                <Mic size={17} color="#10b981" />
              )
            ) : (
              <AnimatedSpeakerSvg value={value} isMuted={isMuted} />
            )}
          </div>

          {/* Center: Title & Dynamic Liquid Gradient Progress Bar */}
          <div
            style={{
              flex: 1,
              marginLeft: '12px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: '5px',
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingRight: '4px',
              }}
            >
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#ffffff',
                  letterSpacing: '-0.2px',
                }}
              >
                {title}
              </span>
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color:
                    toastPayload?.hudType === 'brightness'
                      ? '#fde047'
                      : toastPayload?.hudType === 'mic'
                      ? toastPayload?.isMicMuted
                        ? '#f43f5e'
                        : '#10b981'
                      : isMuted
                      ? '#ef4444'
                      : value >= 67
                      ? '#10b981'
                      : '#38bdf8',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {toastPayload?.hudType === 'mic'
                  ? toastPayload?.isMicMuted
                    ? 'MUTED'
                    : 'ACTIVE'
                  : isMuted
                  ? 'MUTED'
                  : `${value}%`}
              </span>
            </div>

            {/* Liquid Glass Progress Bar */}
            {toastPayload?.hudType !== 'mic' && (
              <div
                style={{
                  width: '100%',
                  height: '6px',
                  borderRadius: '3px',
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${Math.max(0, Math.min(100, value))}%`,
                    borderRadius: '3px',
                    transition: 'width 0.12s cubic-bezier(0.2, 0.8, 0.2, 1)',
                    background:
                      toastPayload?.hudType === 'brightness'
                        ? 'linear-gradient(90deg, #fde047, #ffffff)'
                        : isMuted
                        ? '#ef4444'
                        : value >= 67
                        ? 'linear-gradient(90deg, #06b6d4, #10b981)'
                        : '#38bdf8',
                    boxShadow:
                      toastPayload?.hudType === 'brightness'
                        ? '0 0 10px rgba(253, 224, 71, 0.7)'
                        : isMuted
                        ? '0 0 10px rgba(239, 68, 68, 0.7)'
                        : value >= 67
                        ? '0 0 12px rgba(16, 185, 129, 0.65)'
                        : '0 0 8px rgba(56, 189, 248, 0.6)',
                  }}
                />
              </div>
            )}
          </div>

          {/* Right: Quick close */}
          <button
            onClick={handleDismiss}
            style={{
              background: 'none',
              border: 'none',
              padding: '4px',
              marginLeft: '4px',
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
        </>
      )}

      {/* ==================================================================== */}
      {/* Toast Mode D — Virtual Desktop & Active Window Switch Pill            */}
      {/* ==================================================================== */}
      {(type === 'desktop-switch' || type === 'window-pin') && (
        <>
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
                color: 'var(--text-primary)',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
        </>
      )}
    </motion.div>

    {/* Floating Mini-Pill Badge below Liquid HUD Capsule */}
    <AnimatePresence>
      {isHud && (
        <motion.div
          key={`hud-pill-${toastPayload?.hudType}-${value}-${isOvershoot}`}
          initial={{ opacity: 0, y: -6, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 500, damping: 28 }}
          style={{
            position: 'absolute',
            top: '68px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 50,
            padding: '3px 12px',
            borderRadius: '9999px',
            backgroundColor: isOvershoot
              ? 'rgba(239, 68, 68, 0.92)'
              : 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(16px)',
            border: `1px solid ${
              isOvershoot ? 'rgba(239, 68, 68, 0.65)' : 'rgba(255, 255, 255, 0.18)'
            }`,
            boxShadow: isOvershoot
              ? '0 8px 20px rgba(239, 68, 68, 0.45)'
              : '0 8px 20px rgba(0, 0, 0, 0.45)',
            color: '#ffffff',
            fontSize: '10.5px',
            fontWeight: 600,
            letterSpacing: '0.3px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <span
            style={{
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              backgroundColor: isOvershoot
                ? '#ffffff'
                : toastPayload?.hudType === 'brightness'
                ? '#fde047'
                : isMuted
                ? '#ef4444'
                : '#38bdf8',
            }}
          />
          <span>
            {isOvershoot
              ? value === 100
                ? '100% MAXIMUM'
                : '0% BOUNDARY'
              : toastPayload?.hudType === 'mic'
              ? toastPayload?.isMicMuted
                ? 'Microphone Muted'
                : 'Microphone Active'
              : isMuted
              ? 'Volume Muted'
              : `${title}: ${value}%`}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  </>
  );
};
