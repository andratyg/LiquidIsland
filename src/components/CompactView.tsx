import React, { useState, useEffect, useCallback } from 'react';
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

export const CompactView: React.FC = () => {
  const isAudioPlaying = useSystemStore((s) => s.isAudioPlaying);
  const volume = useSystemStore((s) => s.volume);

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
      {/* 1. Left Indicator: 18x18px Circular Progress Ring                    */}
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
      </div>

      {/* ==================================================================== */}
      {/* 2. Center Clock (09:32, 14.5px, 600 weight, pure white)              */}
      {/* ==================================================================== */}
      <div
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
      </div>

      {/* ==================================================================== */}
      {/* 3. Right Audio Visualizer: 5 Crisp White Waveform Bars               */}
      {/* ==================================================================== */}
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
    </div>
  );
};
