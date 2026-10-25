import React from 'react';
import { motion } from 'framer-motion';
import { useSystemStore, systemStore } from '../store/useSystemStore';
import {
  Bluetooth,
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
      title="Notification - Click to dismiss"
      style={{
        width: '340px',
        height: '64px',
        borderRadius: '32px',
        backgroundColor: '#000000',
        padding: '0 22px',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        userSelect: 'none',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 16px 36px -4px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.06)',
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
