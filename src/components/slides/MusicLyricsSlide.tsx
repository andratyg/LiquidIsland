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
  Play,
  Pause,
  SkipBack,
  SkipForward,
  MessageSquareText,
  Languages,
} from 'lucide-react';

export { type LyricLine, PAPER_SKY_LYRICS };

const AUDIO_OUTPUT_DEVICES = [
  '🎧 AirBuds Pro',
  '🔊 Realtek Speakers',
  '🎧 Studio Monitors',
];

export const MusicLyricsSlide: React.FC = () => {
  const isAudioPlaying = useSystemStore((s) => s.isAudioPlaying);
  const lyricsOpen = useSystemStore((s) => s.lyricsOpen);
  const dualSubtitleEnabled = useSystemStore((s) => s.dualSubtitleEnabled);
  const islandState = useSystemStore((s) => s.islandState);
  const currentTime = useSystemStore((s) => s.playbackTime ?? 193);

  const [deviceIndex, setDeviceIndex] = useState<number>(0);

  // Seek bar drag state
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isSeeking, setIsSeeking] = useState<boolean>(false);

  // Active lyric item scroll ref
  const activeLineRef = useRef<HTMLDivElement>(null);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);

  // Determine current active lyric index
  const activeLyricIndex = (() => {
    for (let i = PAPER_SKY_LYRICS.length - 1; i >= 0; i--) {
      if (currentTime >= PAPER_SKY_LYRICS[i].time) {
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

  // Toggle Play / Pause
  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    playToggleClick();
    systemStore.toggleAudioPlaying();
  };

  // Skip Previous (restart or rewind)
  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    playGlassPop();
    systemStore.setPlaybackTime(0);
  };

  // Skip Next
  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    playGlassPop();
    // Advance to next section or loop
    const nextLine = PAPER_SKY_LYRICS[Math.min(activeLyricIndex + 1, PAPER_SKY_LYRICS.length - 1)];
    systemStore.setPlaybackTime(nextLine.time);
  };

  // Toggle Lyrics Wing
  const handleToggleLyrics = (e: React.MouseEvent) => {
    e.stopPropagation();
    playGlassPop();
    systemStore.toggleLyrics();
  };

  // Toggle Dual Subtitle (Indonesian Translation - Feature #2)
  const handleToggleDualSubtitle = (e: React.MouseEvent) => {
    e.stopPropagation();
    playToggleClick();
    systemStore.toggleDualSubtitle();
  };

  // Cycle Per-Device Audio Output
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
    const newTime = Math.round(ratio * TOTAL_DURATION);
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
  const progressRatio = Math.max(0, Math.min(1, currentTime / TOTAL_DURATION));

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
      {/* 1. Left Music Player Section (Width: 388px approx)                   */}
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
          {/* Album Art: 66x66px Notebook Lined Texture + Blue Slash Graphic */}
          <div
            className={`album-art-card notebook-paper-texture ${isAudioPlaying ? 'album-art-playing' : ''}`}
            title="Lumen Coast - Paper Sky"
          >
            {/* SVG Minimalist Graphic: Sapphire Blue Circle with Slash */}
            <svg width="38" height="38" viewBox="0 0 42 42" fill="none">
              <circle
                cx="21"
                cy="21"
                r="16"
                stroke="#2563eb"
                strokeWidth="2.8"
                fill="rgba(37, 99, 235, 0.08)"
              />
              <path
                d="M 12 30 L 30 12"
                stroke="#2563eb"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
              <circle cx="21" cy="21" r="3.5" fill="#2563eb" />
            </svg>
          </div>

          {/* Track Metadata & Audio Output Device Switcher */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, gap: '2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  letterSpacing: '0.2px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                Paper Sky
              </span>

              {/* Per-Device Audio Output Switcher Pill */}
              <button
                type="button"
                onClick={handleCycleDevice}
                title="Switch Audio Output Device"
                style={{
                  fontSize: '9.5px',
                  fontWeight: 600,
                  padding: '2px 7px',
                  borderRadius: '9999px',
                  background: 'var(--pill-bg)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap',
                  outline: 'none',
                }}
              >
                <span>{AUDIO_OUTPUT_DEVICES[deviceIndex]}</span>
                <span style={{ opacity: 0.6 }}>⇄</span>
              </button>
            </div>

            <span
              style={{
                fontSize: '11px',
                color: 'var(--text-secondary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Lumen Coast - Summer Flows
            </span>

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
                  title={isExpandedLyrics ? 'Close Lyrics Wing (Collapse to 432px)' : 'Open Synced Lyrics Wing (Expand to 595px)'}
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

                {/* Dual Subtitle Toggle Badge (ID · EN) - Feature #2 */}
                <button
                  type="button"
                  onClick={handleToggleDualSubtitle}
                  title={
                    dualSubtitleEnabled
                      ? 'Feature #2: Dual Subtitles (Bahasa Indonesia + English) Enabled'
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
                  title="Previous / Restart (⏮)"
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
                  title={isAudioPlaying ? 'Pause (⏸)' : 'Play (▶)'}
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
                  title="Next (⏭)"
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

        {/* Bottom Interactive Seek Bar: Elapsed (03:13) + Track + Remaining (-01:03) */}
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
            {formatRemaining(currentTime)}
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
              {PAPER_SKY_LYRICS.map((line, idx) => {
                const isActive = idx === activeLyricIndex;
                return (
                  <div
                    key={line.id}
                    ref={isActive ? activeLineRef : null}
                    onClick={(e) => handleLyricClick(line.time, e)}
                    className={`lyrics-line-item ${isActive ? 'lyrics-line-active' : 'lyrics-line-inactive'}`}
                    title="Click line to seek"
                  >
                    {/* Primary English Lyric Line */}
                    <div style={{ lineHeight: 1.25 }}>{line.textEn}</div>

                    {/* Feature #2: Indonesian Translation Sub-caption */}
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
