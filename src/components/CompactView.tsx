import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStore, systemStore } from '../store/useSystemStore';
import { playToggleClick, playGlassPop } from '../utils/sfx';

// Safe Tauri IPC Invoker with fallback
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

function formatRecordingTime(sec: number = 0) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const CompactView: React.FC = () => {
  const isAudioPlaying = useSystemStore((s) => s.isAudioPlaying);
  const volume = useSystemStore((s) => s.volume);
  const mediaTitle = useSystemStore((s) => s.mediaTitle || 'Paper Sky');
  const mediaArtist = useSystemStore((s) => s.mediaArtist || 'Sora & The Clouds');
  const mediaSourceApp = useSystemStore((s) => s.mediaSourceApp || 'Spotify');
  const mediaThumbnail = useSystemStore((s) => s.mediaThumbnail);
  const workspaceActivity = useSystemStore((s) => s.workspaceActivity);
  const isScreenRecording = useSystemStore((s) => s.isScreenRecording ?? false);
  const recordingSeconds = useSystemStore((s) => s.recordingSeconds ?? 0);

  // Compute source app badge (Spotify = Green, YouTube = Red, YouTube Music = Crimson)
  const sourceAppNormalized = (mediaSourceApp || '').toLowerCase();
  const sourceBadge = sourceAppNormalized.includes('youtube music')
    ? { label: 'YT Music', bg: 'rgba(220, 38, 38, 0.22)', border: 'rgba(239, 68, 68, 0.45)', textCol: '#f87171' }
    : sourceAppNormalized.includes('youtube')
    ? { label: 'YouTube', bg: 'rgba(239, 68, 68, 0.22)', border: 'rgba(239, 68, 68, 0.45)', textCol: '#ef4444' }
    : sourceAppNormalized.includes('spotify')
    ? { label: 'Spotify', bg: 'rgba(34, 197, 94, 0.22)', border: 'rgba(34, 197, 94, 0.45)', textCol: '#22c55e' }
    : { label: mediaSourceApp || 'Music', bg: 'rgba(56, 189, 248, 0.22)', border: 'rgba(56, 189, 248, 0.45)', textCol: '#38bdf8' };

  // Live real-time clock: formatted as HH:mm (e.g. 09:32)
  const [timeStr, setTimeStr] = useState<string>(() => {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  });

  useEffect(() => {
    const clockTimer = setInterval(() => {
      const d = new Date();
      setTimeStr(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    }, 1000);

    return () => {
      clearInterval(clockTimer);
    };
  }, []);

  // Toggle audio playback visualizer & native Windows SMTC
  const handleToggleAudio = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    playToggleClick();
    await safeInvoke('media_play_pause');
    systemStore.toggleAudioPlaying();
  }, []);

  // Progress offset calculation: circumference = 2 * PI * 6.5 ≈ 40.84
  const circumference = 40.84;
  const progressPercent = Math.max(0.15, Math.min(1, volume / 100));
  const strokeDashoffset = circumference - circumference * progressPercent;

  // Expand into ExpandedContainer on click
  const handleExpandIsland = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    playGlassPop();
    systemStore.setIslandState('expanded');
  }, []);

  return (
    <div
      onClick={handleExpandIsland}
      title="Dynamic Island - Click to expand"
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
        padding: '0 12px',
        userSelect: 'none',
        cursor: 'pointer',
      }}
    >
      {/* ==================================================================== */}
      {/* 1. Left Indicator: Track Artwork OR Circular Progress Ring           */}
      {/* ==================================================================== */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '18px',
          height: '18px',
          flexShrink: 0,
        }}
      >
        {mediaThumbnail && isAudioPlaying ? (
          <img
            src={mediaThumbnail}
            alt="Track Artwork"
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '4px',
              objectFit: 'cover',
              border: '1px solid rgba(255, 255, 255, 0.15)',
            }}
          />
        ) : (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            {/* Background circular track */}
            <circle
              cx="9"
              cy="9"
              r="6.5"
              stroke="rgba(34, 197, 94, 0.22)"
              strokeWidth="2"
              fill="none"
            />
            {/* Active green progress arc */}
            <circle
              cx="9"
              cy="9"
              r="6.5"
              stroke="#22c55e"
              strokeWidth="2"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform="rotate(-90 9 9)"
              style={{
                transition: 'stroke-dashoffset 0.3s ease',
              }}
            />
            {/* Center glowing jewel dot */}
            <circle cx="9" cy="9" r="2.2" fill="#22c55e" />
          </svg>
        )}
      </div>

      {/* ==================================================================== */}
      {/* 2. Center Content: Recording Pill OR Workspace Activity OR Live Track */}
      {/* ==================================================================== */}
      <AnimatePresence mode="wait">
        {isScreenRecording ? (
          <motion.div
            key="compact-recording-pill"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#ef4444',
                boxShadow: '0 0 10px #ef4444',
              }}
            />
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#ef4444',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '0.2px',
              }}
            >
              REC {formatRecordingTime(recordingSeconds)}
            </span>
          </motion.div>
        ) : workspaceActivity ? (
          <motion.div
            key={`ws-activity-${workspaceActivity.timestamp}`}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -8, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              maxWidth: '120px',
              overflow: 'hidden',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: workspaceActivity.accent_color,
                boxShadow: `0 0 8px ${workspaceActivity.accent_color}`,
                flexShrink: 0,
              }}
            />
            <span
              title={`${workspaceActivity.app_name} • ${workspaceActivity.tab_title}`}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#ffffff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif",
                letterSpacing: '-0.1px',
              }}
            >
              {workspaceActivity.tab_title || workspaceActivity.app_name}
            </span>
          </motion.div>
        ) : isAudioPlaying ? (
          <motion.div
            key="compact-audio-active"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.18 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              maxWidth: '115px',
              overflow: 'hidden',
            }}
          >
            <span
              style={{
                fontSize: '8px',
                fontWeight: 700,
                padding: '1.5px 4px',
                borderRadius: '3px',
                backgroundColor: sourceBadge.bg,
                border: `1px solid ${sourceBadge.border}`,
                color: sourceBadge.textCol,
                flexShrink: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.3px',
                lineHeight: 1,
              }}
            >
              {sourceBadge.label}
            </span>
            <span
              title={`${mediaTitle} - ${mediaArtist}`}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#ffffff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif",
              }}
            >
              {mediaTitle}
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="compact-clock"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.18 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14.5px',
              fontWeight: 600,
              color: '#ffffff',
              letterSpacing: '-0.2px',
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif",
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {timeStr}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================================================================== */}
      {/* 3. Right: Recording Stop Button OR Audio Visualizer Waveform         */}
      {/* ==================================================================== */}
      {isScreenRecording ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            playGlassPop();
            systemStore.setIsScreenRecording(false);
            systemStore.triggerToast('airbuds', {
              title: 'Recording Saved',
              subtitle: `Captured ${formatRecordingTime(recordingSeconds)} • Saved to Captures`,
            });
          }}
          title="Stop Screen Recording"
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            background: 'rgba(239, 68, 68, 0.22)',
            border: '1px solid rgba(239, 68, 68, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
            outline: 'none',
          }}
        >
          <div style={{ width: '8px', height: '8px', borderRadius: '1.5px', background: '#ef4444' }} />
        </button>
      ) : (
        <div
          title={`Audio Visualizer (${isAudioPlaying ? 'Playing' : 'Paused'})`}
          onClick={handleToggleAudio}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2px',
            height: '18px',
            width: '20px',
            cursor: 'pointer',
            padding: '0 1px',
          }}
        >
          <span
            className={`audio-bar ${isAudioPlaying ? 'audio-bar-playing' : 'audio-bar-paused'}`}
          />
          <span
            className={`audio-bar ${isAudioPlaying ? 'audio-bar-playing' : 'audio-bar-paused'}`}
          />
          <span
            className={`audio-bar ${isAudioPlaying ? 'audio-bar-playing' : 'audio-bar-paused'}`}
          />
          <span
            className={`audio-bar ${isAudioPlaying ? 'audio-bar-playing' : 'audio-bar-paused'}`}
          />
          <span
            className={`audio-bar ${isAudioPlaying ? 'audio-bar-playing' : 'audio-bar-paused'}`}
          />
        </div>
      )}
    </div>
  );
};
