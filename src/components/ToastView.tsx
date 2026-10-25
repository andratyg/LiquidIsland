import React from 'react';
import { motion } from 'framer-motion';
import { useSystemStore, systemStore } from '../store/useSystemStore';
import {
  Bluetooth,
  Zap,
  BatteryWarning,
  ShieldCheck,
  Volume2,
  VolumeX,
  SunMedium,
  Mic,
  MicOff,
  Layers,
  Pin,
  X,
} from 'lucide-react';

export const ToastView: React.FC = () => {
  const toastPayload = useSystemStore((s) => s.toastPayload);
  const companionMode = useSystemStore((s) => s.companionMode);
  const companionColor = useSystemStore((s) => s.companionColor);

  // If no payload is active, fallback gracefully
  const type = toastPayload?.type ?? 'airbuds';
  const title = toastPayload?.title ?? 'AirBuds Pro';
  const subtitle = toastPayload?.subtitle ?? 'Connected - 70%';
  const value = toastPayload?.value ?? 70;
  const direction = toastPayload?.direction ?? 'right';
  const batteryStatus = toastPayload?.batteryStatus ?? 'charging';

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
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 440, damping: 32, mass: 0.75 }}
      onClick={handleDismiss}
      title="Click to dismiss notification"
    >
      {/* ==================================================================== */}
      {/* Toast Mode A — AirBuds Pro Connected (00:19 Reference Video 1:1)     */}
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

          {/* Right: 28x28px Blue Sonar Ring with Expanding Pulse Wave */}
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
      {/* Toast Mode B — Battery Charging & Health Guard (00:20 Reference 1:1)  */}
      {/* ==================================================================== */}
      {type === 'battery' && (
        <>
          {/* Left: Glowing Lightning Bolt */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor:
                batteryStatus === 'low'
                  ? 'rgba(245, 158, 11, 0.16)'
                  : batteryStatus === 'guard'
                  ? 'rgba(6, 182, 212, 0.16)'
                  : 'rgba(34, 197, 94, 0.16)',
              border: `1px solid ${
                batteryStatus === 'low'
                  ? 'rgba(245, 158, 11, 0.35)'
                  : batteryStatus === 'guard'
                  ? 'rgba(6, 182, 212, 0.35)'
                  : 'rgba(34, 197, 94, 0.35)'
              }`,
            }}
          >
            {batteryStatus === 'low' ? (
              <BatteryWarning size={16} color="#f59e0b" />
            ) : batteryStatus === 'guard' ? (
              <ShieldCheck size={16} color="#06b6d4" />
            ) : (
              <Zap size={16} color="#22c55e" className="toast-battery-bolt" />
            )}
          </div>

          {/* Center: Label & Subtitle */}
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
                color:
                  batteryStatus === 'low'
                    ? '#f59e0b'
                    : batteryStatus === 'guard'
                    ? '#06b6d4'
                    : '#22c55e',
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
              }}
            >
              {subtitle}
            </div>
          </div>

          {/* Right: Bold Percentage + Mini Companion Reaction Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '15.5px',
                fontWeight: 700,
                color:
                  batteryStatus === 'low'
                    ? '#f59e0b'
                    : batteryStatus === 'guard'
                    ? '#06b6d4'
                    : '#22c55e',
                letterSpacing: '-0.3px',
              }}
            >
              {value}%
            </span>

            {/* Mini Companion Reaction Badge */}
            <div
              className="toast-companion-badge"
              title={
                batteryStatus === 'low'
                  ? `${companionMode} is sleepy (low battery)`
                  : `${companionMode} is energized by charging!`
              }
            >
              {companionMode === 'cat' ? (
                /* Mini Cat Vector */
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M 3 6 L 6 10 L 4 11 Z"
                    fill={companionColor}
                  />
                  <path
                    d="M 17 6 L 14 10 L 16 11 Z"
                    fill={companionColor}
                  />
                  <circle cx="10" cy="11" r="6" fill={companionColor} />
                  {batteryStatus === 'low' ? (
                    // Sleepy horizontal slit eyes
                    <>
                      <line x1="7" y1="10" x2="9" y2="10" stroke="#000" strokeWidth="1.2" strokeLinecap="round" />
                      <line x1="11" y1="10" x2="13" y2="10" stroke="#000" strokeWidth="1.2" strokeLinecap="round" />
                    </>
                  ) : (
                    // Happy curved anime eyes
                    <>
                      <path d="M 7 11 Q 8 9 9 11" stroke="#000" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                      <path d="M 11 11 Q 12 9 13 11" stroke="#000" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                      <circle cx="10" cy="13" r="0.75" fill="#f43f5e" />
                    </>
                  )}
                </svg>
              ) : (
                /* Mini Slime Vector */
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M 4 14 Q 3 9 10 7 Q 17 9 16 14 Q 10 17 4 14 Z"
                    fill={companionColor}
                  />
                  {batteryStatus === 'low' ? (
                    // Drowsy eyes
                    <>
                      <ellipse cx="8" cy="11.5" rx="1.4" ry="0.6" fill="#000" />
                      <ellipse cx="12" cy="11.5" rx="1.4" ry="0.6" fill="#000" />
                    </>
                  ) : (
                    // Joyful spark eyes
                    <>
                      <circle cx="8" cy="11" r="1.3" fill="#000" />
                      <circle cx="12" cy="11" r="1.3" fill="#000" />
                      <circle cx="8.4" cy="10.6" r="0.5" fill="#fff" />
                      <circle cx="12.4" cy="10.6" r="0.5" fill="#fff" />
                    </>
                  )}
                </svg>
              )}

              {/* Sparkle Particle Badge */}
              {batteryStatus !== 'low' && (
                <span
                  className="sparkle-particle"
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    fontSize: '9px',
                  }}
                >
                  ⚡
                </span>
              )}
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
      {/* Toast Mode C — Custom Liquid System HUD (Volume / Brightness / Mic)   */}
      {/* ==================================================================== */}
      {type === 'hud' && (
        <>
          {/* Left: High-Contrast Icon */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor:
                toastPayload?.hudType === 'brightness'
                  ? 'rgba(245, 158, 11, 0.16)'
                  : toastPayload?.hudType === 'mic'
                  ? toastPayload?.isMicMuted
                    ? 'rgba(244, 63, 94, 0.16)'
                    : 'rgba(16, 185, 129, 0.16)'
                  : 'rgba(59, 130, 246, 0.16)',
              border: `1px solid ${
                toastPayload?.hudType === 'brightness'
                  ? 'rgba(245, 158, 11, 0.35)'
                  : toastPayload?.hudType === 'mic'
                  ? toastPayload?.isMicMuted
                    ? 'rgba(244, 63, 94, 0.35)'
                    : 'rgba(16, 185, 129, 0.35)'
                  : 'rgba(59, 130, 246, 0.35)'
              }`,
            }}
          >
            {toastPayload?.hudType === 'brightness' ? (
              <SunMedium size={16} color="#f59e0b" />
            ) : toastPayload?.hudType === 'mic' ? (
              toastPayload?.isMicMuted ? (
                <MicOff size={16} color="#f43f5e" />
              ) : (
                <Mic size={16} color="#10b981" />
              )
            ) : value === 0 ? (
              <VolumeX size={16} color="#ef4444" />
            ) : (
              <Volume2 size={16} color="#3b82f6" />
            )}
          </div>

          {/* Center: Title & Liquid Progress Bar */}
          <div
            style={{
              flex: 1,
              marginLeft: '12px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: '4px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingRight: '6px',
              }}
            >
              <span
                style={{
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.2px',
                }}
              >
                {title}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color:
                    toastPayload?.hudType === 'brightness'
                      ? '#f59e0b'
                      : toastPayload?.hudType === 'mic'
                      ? toastPayload?.isMicMuted
                        ? '#f43f5e'
                        : '#10b981'
                      : '#3b82f6',
                }}
              >
                {toastPayload?.hudType === 'mic'
                  ? toastPayload?.isMicMuted
                    ? 'MUTED'
                    : 'ACTIVE'
                  : `${value}%`}
              </span>
            </div>

            {/* Liquid Glass Progress Bar */}
            {toastPayload?.hudType !== 'mic' && (
              <div className="toast-hud-track">
                <div
                  className="toast-hud-fill"
                  style={{
                    width: `${Math.max(0, Math.min(100, value))}%`,
                    backgroundColor:
                      toastPayload?.hudType === 'brightness' ? '#f59e0b' : '#3b82f6',
                    boxShadow:
                      toastPayload?.hudType === 'brightness'
                        ? '0 0 8px rgba(245, 158, 11, 0.6)'
                        : '0 0 8px rgba(59, 130, 246, 0.6)',
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
  );
};
