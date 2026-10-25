import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStore, systemStore } from '../../store/useSystemStore';
import { playToggleClick, playGlassPop, playWaterDrop } from '../../utils/sfx';
import {
  PAPER_SKY_LYRICS,
  TOTAL_DURATION,
  formatTime,
  formatRemaining,
  type LyricLine,
} from '../../utils/lyricsData';
import {
  fetchLiveLyrics,
  type LiveLyricLine,
} from '../../utils/liveLyricsFetcher';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  MessageSquareText,
  Languages,
  Radio,
} from 'lucide-react';

export { type LyricLine, PAPER_SKY_LYRICS };

const AUDIO_OUTPUT_DEVICES = [
  'AirBuds Pro',
  'Realtek Speakers',
  'Studio Monitors',
];

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

export const MusicLyricsSlide: React.FC = () => {
  const isAudioPlaying = useSystemStore((s) => s.isAudioPlaying);
  const lyricsOpen = useSystemStore((s) => s.lyricsOpen);
  const dualSubtitleEnabled = useSystemStore((s) => s.dualSubtitleEnabled);
  const islandState = useSystemStore((s) => s.islandState);
  const currentTime = useSystemStore((s) => s.playbackTime ?? 193);

  // Real Windows SMTC Media Metadata
  const mediaTitle = useSystemStore((s) => s.mediaTitle || 'Paper Sky');
  const mediaArtist = useSystemStore((s) => s.mediaArtist || 'Sora & The Clouds');
  const mediaAlbum = useSystemStore((s) => s.mediaAlbum || 'Tokyo Lo-Fi');
  const mediaSourceApp = useSystemStore((s) => s.mediaSourceApp || 'Spotify');
  const mediaThumbnail = useSystemStore((s) => s.mediaThumbnail);
  const totalDuration = useSystemStore((s) => (s.mediaDuration && s.mediaDuration > 0 ? s.mediaDuration : TOTAL_DURATION));

  const [deviceIndex, setDeviceIndex] = useState<number>(0);

  // Active synced lyrics array from LRCLib or fallback
  const [lyricsLines, setLyricsLines] = useState<LiveLyricLine[]>(() =>
    PAPER_SKY_LYRICS.map((l) => ({ time: l.time, text: l.textEn, textId: l.textId }))
  );

  // Seek bar drag state
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isSeeking, setIsSeeking] = useState<boolean>(false);

  // Active lyric item scroll ref
  const activeLineRef = useRef<HTMLDivElement>(null);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);

  // Automatically fetch synchronized lyrics whenever song changes
  useEffect(() => {
    let active = true;

    async function loadLyrics() {
      try {
        const fetched = await fetchLiveLyrics(mediaTitle, mediaArtist);
        if (active && fetched && fetched.length > 0) {
          setLyricsLines(fetched);
        }
      } catch {
        if (active) {
          setLyricsLines(
            PAPER_SKY_LYRICS.map((l) => ({ time: l.time, text: l.textEn, textId: l.textId }))
          );
        }
      }
    }

    loadLyrics();

    return () => {
      active = false;
    };
  }, [mediaTitle, mediaArtist]);

  // Determine current active lyric index based on timestamp
  const activeLyricIndex = (() => {
    for (let i = lyricsLines.length - 1; i >= 0; i--) {
      if (currentTime >= lyricsLines[i].time) {
        return i;
      }
    }
    return 0;
  })();

  // Smooth auto-scroll active lyric into center view
  useEffect(() => {
    if (activeLineRef.current && lyricsContainerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeLyricIndex, lyricsOpen]);

  // Toggle Play / Pause via real Windows SMTC
  const handleTogglePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    playToggleClick();
    await safeInvoke('media_play_pause');
    systemStore.toggleAudioPlaying();
  };

  // Skip Previous via real Windows SMTC
  const handlePrev = async (e: React.MouseEvent) => {
    e.stopPropagation();
    playGlassPop();
    const handled = await safeInvoke<boolean>('media_prev_track');
    if (!handled) {
      systemStore.setPlaybackTime(0);
    }
  };

  // Skip Next via real Windows SMTC
  const handleNext = async (e: React.MouseEvent) => {
    e.stopPropagation();
    playGlassPop();
    const handled = await safeInvoke<boolean>('media_next_track');
    if (!handled) {
      const nextLine = lyricsLines[Math.min(activeLyricIndex + 1, lyricsLines.length - 1)];
      systemStore.setPlaybackTime(nextLine.time);
    }
  };

  // Toggle Lyrics Wing
  const handleToggleLyrics = (e: React.MouseEvent) => {
    e.stopPropagation();
    playGlassPop();
    systemStore.toggleLyrics();
  };

  // Toggle Dual Subtitle (Indonesian Translation)
  const handleToggleDualSubtitle = (e: React.MouseEvent) => {
    e.stopPropagation();
    playToggleClick();
    systemStore.toggleDualSubtitle();
  };

  // Cycle Audio Output Device
  const handleCycleDevice = (e: React.MouseEvent) => {
    e.stopPropagation();
    playToggleClick();
    setDeviceIndex((prev) => (prev + 1) % AUDIO_OUTPUT_DEVICES.length);
  };

  // Seek bar interaction (click or drag)
  const handleSeekFromEvent = (clientX: number) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const ratio = clickX / rect.width;
    const newTime = Math.round(ratio * totalDuration);
    systemStore.setPlaybackTime(newTime);
  };

  const handleSeekMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsSeeking(true);
    handleSeekFromEvent(e.clientX);

    const onMouseMove = (moveEvent: MouseEvent) => {
      handleSeekFromEvent(moveEvent.clientX);
    };

    const onMouseUp = () => {
      setIsSeeking(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Click on specific lyric line to jump
  const handleLyricClick = (lineTime: number, e: React.MouseEvent) => {
    e.stopPropagation();
    playWaterDrop();
    systemStore.setPlaybackTime(lineTime);
  };

  const isExpandedLyrics = islandState === 'expanded-lyrics' || lyricsOpen;
  const progressRatio = Math.max(0, Math.min(1, currentTime / (totalDuration || 1)));

  // Source App Badge Color Coding
  const getSourceBadgeStyle = () => {
    const app = (mediaSourceApp || '').toLowerCase();
    if (app.includes('spotify')) {
      return { dotColor: '#1ed760', borderColor: 'rgba(30, 215, 96, 0.35)', bg: 'rgba(30, 215, 96, 0.12)' };
    }
    if (app.includes('youtube music')) {
      return { dotColor: '#f43f5e', borderColor: 'rgba(244, 63, 94, 0.35)', bg: 'rgba(244, 63, 94, 0.12)' };
    }
    if (app.includes('youtube')) {
      return { dotColor: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.35)', bg: 'rgba(239, 68, 68, 0.12)' };
    }
    if (app.includes('apple')) {
      return { dotColor: '#ec4899', borderColor: 'rgba(236, 72, 153, 0.35)', bg: 'rgba(236, 72, 153, 0.12)' };
    }
    return { dotColor: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.35)', bg: 'rgba(59, 130, 246, 0.12)' };
  };

  const sourceStyle = getSourceBadgeStyle();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        position: 'relative',
        boxSizing: 'border-box',
        gap: isExpandedLyrics ? '12px' : '0px',
      }}
    >
      {/* ==================================================================== */}
      {/* 1. Left Music Player Section (Width: 376px / 100%)                   */}
      {/* ==================================================================== */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: isExpandedLyrics ? '376px' : '100%',
          height: '100%',
          flexShrink: 0,
          position: 'relative',
          zIndex: 2,
        }}
      >
        {/* Top Info Row: Album Art + Track Info + Device Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '11px', width: '100%' }}>
          {/* Album Art: 66x66px Clean Glass Aesthetic */}
          <div
            className={`album-art-card notebook-paper-texture ${isAudioPlaying ? 'album-art-playing' : ''}`}
            title={`${mediaArtist} - ${mediaTitle}`}
            style={{
              width: '66px',
              height: '66px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              overflow: 'hidden',
              position: 'relative',
              backgroundColor: mediaThumbnail ? '#000000' : 'rgba(255, 255, 255, 0.05)',
            }}
          >
            {mediaThumbnail ? (
              <img
                src={mediaThumbnail}
                alt={`${mediaArtist} - ${mediaTitle}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '12px',
                }}
              />
            ) : (
              /* SVG Minimalist Graphic */
              <svg width="36" height="36" viewBox="0 0 42 42" fill="none">
                <circle
                  cx="21"
                  cy="21"
                  r="16"
                  stroke={sourceStyle.dotColor}
                  strokeWidth="2.6"
                  fill="rgba(255, 255, 255, 0.04)"
                />
                <path
                  d="M 12 30 L 30 12"
                  stroke={sourceStyle.dotColor}
                  strokeWidth="2.6"
                  strokeLinecap="round"
                />
                <circle cx="21" cy="21" r="3" fill={sourceStyle.dotColor} />
              </svg>
            )}
          </div>

          {/* Track Metadata & Audio Output Device Switcher */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, gap: '2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '6px' }}>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  letterSpacing: '0.2px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  flex: 1,
                }}
              >
                {mediaTitle}
              </span>

              {/* Real Windows SMTC Source App Badge */}
              <div
                style={{
                  fontSize: '9.5px',
                  fontWeight: 600,
                  padding: '2px 7px',
                  borderRadius: '9999px',
                  background: sourceStyle.bg,
                  border: `1px solid ${sourceStyle.borderColor}`,
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
                title={`Active Media Source: ${mediaSourceApp}`}
              >
                <span
                  style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '9999px',
                    backgroundColor: sourceStyle.dotColor,
                    boxShadow: `0 0 6px ${sourceStyle.dotColor}`,
                  }}
                />
                <span>{mediaSourceApp}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '220px',
                }}
              >
                {mediaArtist} {mediaAlbum ? `• ${mediaAlbum}` : ''}
              </span>

              {/* Per-Device Audio Output Switcher Pill */}
              <button
                type="button"
                onClick={handleCycleDevice}
                title="Switch Audio Output Device"
                style={{
                  fontSize: '9px',
                  fontWeight: 600,
                  padding: '1px 6px',
                  borderRadius: '9999px',
                  background: 'var(--pill-bg)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  whiteSpace: 'nowrap',
                  outline: 'none',
                }}
              >
                <Radio size={9} strokeWidth={2} />
                <span>{AUDIO_OUTPUT_DEVICES[deviceIndex]}</span>
              </button>
            </div>

            {/* Media Controls Bar (Lyrics Toggle, Subtitle Badge, Prev, Play, Next) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                marginTop: '4px',
              }}
            >
              {/* Left Badges: Lyrics Toggle & Dual Subtitle Badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                {/* Synced Lyrics Toggle Button */}
                <button
                  type="button"
                  onClick={handleToggleLyrics}
                  title={isExpandedLyrics ? 'Close Lyrics Wing' : 'Open Synced Lyrics Wing'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 7px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: isExpandedLyrics ? '#3b82f6' : 'var(--glass-border)',
                    background: isExpandedLyrics ? 'rgba(59, 130, 246, 0.22)' : 'var(--pill-bg)',
                    color: isExpandedLyrics ? '#38bdf8' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '10px',
                    fontWeight: 600,
                    outline: 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <MessageSquareText size={11} />
                  <span>Lyrics</span>
                </button>

                {/* Dual Subtitle Toggle Badge (ID · EN) */}
                <button
                  type="button"
                  onClick={handleToggleDualSubtitle}
                  title={
                    dualSubtitleEnabled
                      ? 'Dual Subtitles (Bahasa Indonesia + English) Enabled'
                      : 'Dual Subtitles Disabled (English Only)'
                  }
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    padding: '3px 6px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: dualSubtitleEnabled ? '#06b6d4' : 'var(--glass-border)',
                    background: dualSubtitleEnabled ? 'rgba(6, 182, 212, 0.20)' : 'var(--pill-bg)',
                    color: dualSubtitleEnabled ? '#22d3ee' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '9.5px',
                    fontWeight: 700,
                    outline: 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Languages size={10} />
                  <span>{dualSubtitleEnabled ? 'ID · EN' : 'EN'}</span>
                </button>
              </div>

              {/* Right Media Control Buttons: Prev, Play/Pause, Next */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handlePrev}
                  title="Previous Track on Windows SMTC (⏮)"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2px',
                    opacity: 0.8,
                  }}
                >
                  <SkipBack size={15} />
                </button>

                {/* Circular Play / Pause Button */}
                <button
                  type="button"
                  onClick={handleTogglePlay}
                  title={isAudioPlaying ? 'Pause Windows Media (⏸)' : 'Play Windows Media (▶)'}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '9999px',
                    background: isAudioPlaying ? '#3b82f6' : 'var(--text-primary)',
                    color: isAudioPlaying ? '#ffffff' : 'var(--island-bg)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: isAudioPlaying ? '0 0 10px rgba(59, 130, 246, 0.6)' : '0 2px 6px rgba(0,0,0,0.2)',
                    transition: 'transform 0.1s ease, background-color 0.15s ease',
                  }}
                >
                  {isAudioPlaying ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" style={{ marginLeft: '1.5px' }} />}
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  title="Next Track on Windows SMTC (⏭)"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2px',
                    opacity: 0.8,
                  }}
                >
                  <SkipForward size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Interactive Seek Bar: Elapsed + Progress + Remaining */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            marginTop: '5px',
          }}
        >
          {/* Elapsed Time */}
          <span
            style={{
              fontSize: '10px',
              fontFamily: 'monospace',
              color: 'var(--text-secondary)',
              width: '32px',
              textAlign: 'left',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatTime(currentTime)}
          </span>

          {/* Clickable Progress Bar with Glowing Thumb */}
          <div
            ref={progressBarRef}
            onMouseDown={handleSeekMouseDown}
            style={{
              flex: 1,
              height: '14px',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              position: 'relative',
            }}
            title="Click or Drag to Seek"
          >
            {/* Background track */}
            <div
              style={{
                width: '100%',
                height: '4px',
                borderRadius: '9999px',
                background: 'rgba(255, 255, 255, 0.14)',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {/* Fill */}
              <div
                style={{
                  height: '100%',
                  width: `${progressRatio * 100}%`,
                  backgroundColor: '#3b82f6',
                  borderRadius: '9999px',
                  transition: isSeeking ? 'none' : 'width 0.15s linear',
                }}
              />
            </div>

            {/* Glowing Thumb */}
            <div
              style={{
                position: 'absolute',
                left: `${progressRatio * 100}%`,
                transform: 'translateX(-50%)',
                width: '8px',
                height: '8px',
                borderRadius: '9999px',
                backgroundColor: '#ffffff',
                boxShadow: '0 0 6px #3b82f6',
                pointerEvents: 'none',
              }}
            />
          </div>

          {/* Remaining Time */}
          <span
            style={{
              fontSize: '10px',
              fontFamily: 'monospace',
              color: 'var(--text-secondary)',
              width: '36px',
              textAlign: 'right',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatRemaining(currentTime, totalDuration)}
          </span>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. Right Synced Lyrics Wing (595px Asymmetric Extension)              */}
      {/* ==================================================================== */}
      <AnimatePresence>
        {isExpandedLyrics && (
          <motion.div
            key="lyrics-wing"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 178 }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden',
              borderLeft: '1px solid var(--glass-border)',
              paddingLeft: '10px',
            }}
          >
            {/* Ambient Radial Lyrics Glow in Background */}
            <div className="lyrics-ambient-glow" />

            {/* Scrollable Synced Lyrics List with Gradient Fade Mask */}
            <div
              ref={lyricsContainerRef}
              className="lyrics-scroll-container lyrics-mask"
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                padding: '16px 2px',
                zIndex: 2,
              }}
            >
              {lyricsLines.map((line, idx) => {
                const isActive = idx === activeLyricIndex;
                return (
                  <div
                    key={`${line.time}-${idx}`}
                    ref={isActive ? activeLineRef : null}
                    onClick={(e) => handleLyricClick(line.time, e)}
                    className={`lyrics-line-item ${isActive ? 'lyrics-line-active' : 'lyrics-line-inactive'}`}
                    title="Click line to seek"
                  >
                    {/* Primary Lyric Line */}
                    <div style={{ lineHeight: 1.25 }}>{line.text}</div>

                    {/* Dual Subtitle: Indonesian Translation */}
                    {dualSubtitleEnabled && line.textId && (
                      <div className="dual-subtitle-id">
                        {line.textId}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
