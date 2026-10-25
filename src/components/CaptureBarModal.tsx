import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStore, systemStore } from '../store/useSystemStore';
import { playToggleClick, playGlassPop, playWaterDrop } from '../utils/sfx';
import {
  Crop,
  Monitor,
  AppWindow,
  Video,
  Clock,
  FolderDown,
  X,
} from 'lucide-react';

interface CaptureBarModalProps {
  onClose: () => void;
}

interface CaptureResult {
  success: boolean;
  data_url: string;
  filename: string;
  width: number;
  height: number;
}

async function safeInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T | null> {
  try {
    const isTauri =
      typeof window !== 'undefined' &&
      ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
    if (!isTauri) return null;
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<T>(cmd, args);
  } catch (err) {
    console.warn(`[CaptureBar IPC] "${cmd}" returned:`, err);
    return null;
  }
}

export const CaptureBarModal: React.FC<CaptureBarModalProps> = ({ onClose }) => {
  const isScreenRecording = useSystemStore((s) => s.isScreenRecording ?? false);
  const [delaySec, setDelaySec] = useState<0 | 3 | 5>(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [autoSaveShelf, setAutoSaveShelf] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem('liquid_capture_auto_shelf') !== 'false';
  });

  // Toggle Auto-Save to Shelf preference
  const toggleAutoShelf = () => {
    playToggleClick();
    setAutoSaveShelf((prev) => {
      const next = !prev;
      window.localStorage.setItem('liquid_capture_auto_shelf', String(next));
      return next;
    });
  };

  // Keyboard shortcut listener: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && countdown === null) {
        playToggleClick();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, countdown]);

  // Processes capture result: auto-saves to Shelf and triggers dynamic island toast
  const handleCaptureResult = useCallback(
    (res: CaptureResult | null) => {
      if (!res || !res.success || !res.data_url) return;

      playWaterDrop();

      if (autoSaveShelf) {
        systemStore.addShelfFile({
          id: `shelf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: res.filename,
          size: Math.round(res.data_url.length * 0.75),
          formattedSize: `${Math.round((res.data_url.length * 0.75) / 1024)} KB`,
          type: 'image/png',
          previewUrl: res.data_url,
          timestamp: 'Just now',
          isCompressed: false,
        });
      }

      systemStore.showScreenshotToast(res.filename, res.data_url);
      onClose();
    },
    [autoSaveShelf, onClose]
  );

  // Executes capture with optional delay countdown
  const executeDelayedCapture = useCallback(
    (captureFn: () => Promise<CaptureResult | null>) => {
      if (delaySec === 0) {
        onClose();
        setTimeout(async () => {
          const res = await captureFn();
          handleCaptureResult(res);
        }, 120);
        return;
      }

      setCountdown(delaySec);
      let count = delaySec;
      const timer = setInterval(() => {
        count -= 1;
        if (count <= 0) {
          clearInterval(timer);
          setCountdown(null);
          onClose();
          setTimeout(async () => {
            const res = await captureFn();
            handleCaptureResult(res);
          }, 80);
        } else {
          setCountdown(count);
          playToggleClick();
        }
      }, 1000);
    },
    [delaySec, onClose, handleCaptureResult]
  );

  // 1. Area Snip (Selection)
  const handleAreaSnip = async () => {
    playGlassPop();
    onClose();
    await safeInvoke('open_snipping_tool');
  };

  // 2. Fullscreen Shot
  const handleFullscreenShot = () => {
    playGlassPop();
    executeDelayedCapture(() => safeInvoke<CaptureResult>('capture_fullscreen'));
  };

  // 3. Active Window Shot
  const handleActiveWindowShot = () => {
    playGlassPop();
    executeDelayedCapture(() => safeInvoke<CaptureResult>('capture_active_window'));
  };

  // 4. Video Recording Toggle
  const handleToggleRecording = () => {
    playGlassPop();
    const next = !isScreenRecording;
    systemStore.setIsScreenRecording(next);
    onClose();
    if (next) {
      systemStore.triggerToast('airbuds', {
        title: 'Screen Recording Started',
        subtitle: 'Dynamic Island HUD active • Click to finish',
      });
    } else {
      systemStore.triggerToast('airbuds', {
        title: 'Recording Finished',
        subtitle: 'Video saved to Captures',
      });
    }
  };

  // Cycle delay: 0s -> 3s -> 5s -> 0s
  const handleCycleDelay = () => {
    playToggleClick();
    setDelaySec((prev) => (prev === 0 ? 3 : prev === 3 ? 5 : 0));
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: '88px',
        pointerEvents: 'auto',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && countdown === null) {
          playToggleClick();
          onClose();
        }
      }}
    >
      {/* Visual Countdown Badge during timed capture */}
      <AnimatePresence>
        {countdown !== null && (
          <motion.div
            key="countdown-pill"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.4, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 350 }}
            style={{
              position: 'fixed',
              top: '40%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '88px',
              height: '88px',
              borderRadius: '50%',
              background: 'rgba(15, 17, 23, 0.94)',
              backdropFilter: 'blur(30px)',
              border: '2px solid rgba(59, 130, 246, 0.6)',
              boxShadow: '0 0 40px rgba(59, 130, 246, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '42px',
              fontWeight: 700,
              color: '#ffffff',
              fontVariantNumeric: 'tabular-nums',
              pointerEvents: 'none',
              zIndex: 100000,
            }}
          >
            {countdown}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Liquid Glass Capture Bar */}
      <motion.div
        key="capture-bar-capsule"
        initial={{ opacity: 0, y: -24, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.94 }}
        transition={{ type: 'spring', damping: 26, stiffness: 380 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          height: '60px',
          padding: '6px 14px',
          borderRadius: '26px',
          background: 'rgba(18, 18, 22, 0.94)',
          backdropFilter: 'blur(36px) saturate(200%)',
          WebkitBackdropFilter: 'blur(36px) saturate(200%)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow:
            '0 28px 64px -8px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.08)',
          userSelect: 'none',
        }}
      >
        {/* Left Action Group: Capture Modes */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          {/* Mode 1: Area Snip */}
          <button
            type="button"
            onClick={handleAreaSnip}
            style={actionBtnStyle}
            title="Area Snip (Selection Tool - Win+Shift+S)"
          >
            <div style={iconBadgeStyle('#38bdf8')}>
              <Crop size={16} strokeWidth={2.2} />
            </div>
            <span style={labelStyle}>Area</span>
          </button>

          {/* Mode 2: Fullscreen */}
          <button
            type="button"
            onClick={handleFullscreenShot}
            style={actionBtnStyle}
            title="Capture Fullscreen (Primary Display)"
          >
            <div style={iconBadgeStyle('#22c55e')}>
              <Monitor size={16} strokeWidth={2.2} />
            </div>
            <span style={labelStyle}>Screen</span>
          </button>

          {/* Mode 3: Active Window */}
          <button
            type="button"
            onClick={handleActiveWindowShot}
            style={actionBtnStyle}
            title="Capture Active Window"
          >
            <div style={iconBadgeStyle('#a855f7')}>
              <AppWindow size={16} strokeWidth={2.2} />
            </div>
            <span style={labelStyle}>Window</span>
          </button>

          {/* Mode 4: Screen Video Recording */}
          <button
            type="button"
            onClick={handleToggleRecording}
            style={{
              ...actionBtnStyle,
              background: isScreenRecording
                ? 'rgba(239, 68, 68, 0.22)'
                : 'rgba(255, 255, 255, 0.04)',
              border: isScreenRecording
                ? '1px solid rgba(239, 68, 68, 0.5)'
                : '1px solid transparent',
            }}
            title={isScreenRecording ? 'Stop Screen Recording' : 'Start Screen Recording'}
          >
            <div
              style={iconBadgeStyle(
                isScreenRecording ? '#ef4444' : '#f59e0b',
                isScreenRecording ? 'rgba(239, 68, 68, 0.3)' : undefined
              )}
            >
              <Video size={16} strokeWidth={2.2} />
            </div>
            <span
              style={{
                ...labelStyle,
                color: isScreenRecording ? '#ef4444' : '#e2e8f0',
              }}
            >
              {isScreenRecording ? 'Recording' : 'Record'}
            </span>
          </button>
        </div>

        {/* Separator Divider */}
        <div
          style={{
            width: '1px',
            height: '28px',
            background: 'rgba(255, 255, 255, 0.12)',
            margin: '0 4px',
          }}
        />

        {/* Right Option Group: Delay & Auto-Shelf */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          {/* Delay Toggle Pill */}
          <button
            type="button"
            onClick={handleCycleDelay}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 10px',
              borderRadius: '12px',
              background:
                delaySec > 0
                  ? 'rgba(56, 189, 248, 0.18)'
                  : 'rgba(255, 255, 255, 0.05)',
              border:
                delaySec > 0
                  ? '1px solid rgba(56, 189, 248, 0.45)'
                  : '1px solid rgba(255, 255, 255, 0.08)',
              color: delaySec > 0 ? '#38bdf8' : '#94a3b8',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none',
              transition: 'all 0.15s ease',
            }}
            title="Capture Delay Countdown (Now / 3s / 5s)"
          >
            <Clock size={13} strokeWidth={2.2} />
            <span>{delaySec === 0 ? 'Now' : `${delaySec}s`}</span>
          </button>

          {/* Auto-Save to Shelf Toggle */}
          <button
            type="button"
            onClick={toggleAutoShelf}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 10px',
              borderRadius: '12px',
              background: autoSaveShelf
                ? 'rgba(34, 197, 94, 0.16)'
                : 'rgba(255, 255, 255, 0.05)',
              border: autoSaveShelf
                ? '1px solid rgba(34, 197, 94, 0.4)'
                : '1px solid rgba(255, 255, 255, 0.08)',
              color: autoSaveShelf ? '#22c55e' : '#64748b',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none',
              transition: 'all 0.15s ease',
            }}
            title="Toggle Automatic Screenshot Saving to Quick Shelf"
          >
            <FolderDown size={13} strokeWidth={2.2} />
            <span>Shelf</span>
          </button>

          {/* Close Button */}
          <button
            type="button"
            onClick={() => {
              playToggleClick();
              onClose();
            }}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#94a3b8',
              cursor: 'pointer',
              outline: 'none',
              marginLeft: '2px',
              transition: 'all 0.15s ease',
            }}
            title="Close Capture Bar (Esc)"
          >
            <X size={14} strokeWidth={2.2} />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

/* ==========================================================================
   Inline Styles
   ========================================================================== */

const actionBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '6px 12px',
  borderRadius: '16px',
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.07)',
  cursor: 'pointer',
  outline: 'none',
  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
};

const iconBadgeStyle = (
  color: string,
  customBg?: string
): React.CSSProperties => ({
  width: '28px',
  height: '28px',
  borderRadius: '10px',
  background: customBg || `${color}22`,
  border: `1px solid ${color}44`,
  color: color,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: '#f8fafc',
  letterSpacing: '-0.2px',
};
