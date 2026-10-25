import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStore, systemStore } from '../../store/useSystemStore';
import { SlimeCompanion } from './SlimeCompanion';
import { CatCompanion } from './CatCompanion';
import { CyberEyes } from './CyberEyes';
import { MiniHeadphones } from './accessories/MiniHeadphones';
import { FocusGlasses } from './accessories/FocusGlasses';
import { getCurrentLyricLine } from '../../utils/lyricsData';
import { fetchLiveLyrics, type LiveLyricLine } from '../../utils/liveLyricsFetcher';
import { playJellyBounce, playPetPurr, playGlassPop, playToggleClick } from '../../utils/sfx';
import { Music } from 'lucide-react';

interface CompanionStageProps {
  testHeadphones?: boolean;
  testGlasses?: boolean;
  testFileDrag?: boolean;
  testPetting?: boolean;
}

export const CompanionStage: React.FC<CompanionStageProps> = ({
  testHeadphones = false,
  testGlasses = false,
  testFileDrag = false,
  testPetting = false,
}) => {
  const companionMode = useSystemStore((s) => s.companionMode);
  const companionColor = useSystemStore((s) => s.companionColor);
  const theme = useSystemStore((s) => s.theme);
  const autoAccessories = useSystemStore((s) => s.autoAccessories);
  const isAudioPlaying = useSystemStore((s) => s.isAudioPlaying);
  const playbackTime = useSystemStore((s) => s.playbackTime ?? 193);
  const dualSubtitleEnabled = useSystemStore((s) => s.dualSubtitleEnabled);
  const isPomodoroRunning = useSystemStore((s) => s.isPomodoroRunning);
  const isCharging = useSystemStore((s) => s.isCharging);
  const batteryStatus = useSystemStore((s) => s.batteryStatus);
  const mediaTitle = useSystemStore((s) => s.mediaTitle || 'Paper Sky');
  const mediaArtist = useSystemStore((s) => s.mediaArtist || 'Sora & The Clouds');

  const [liveLyrics, setLiveLyrics] = useState<LiveLyricLine[]>([]);

  useEffect(() => {
    let active = true;
    fetchLiveLyrics(mediaTitle, mediaArtist).then((lyrics) => {
      if (active && lyrics) {
        setLiveLyrics(lyrics);
      }
    });
    return () => {
      active = false;
    };
  }, [mediaTitle, mediaArtist]);

  // If companionMode is 'off', automatically fallback idle state to 'compact'
  useEffect(() => {
    if (companionMode === 'off') {
      systemStore.setIslandState('compact');
    }
  }, [companionMode]);

  // Cursor Tracking State (Normalized delta from Notch center)
  const [cursorDelta, setCursorDelta] = useState({
    x: 0,
    y: 0,
    angle: Math.PI / 2, // Default looking slightly downward
    distance: 0.3,
  });

  // Petting Detection State
  const [isPetting, setIsPetting] = useState(false);
  const petTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMousePosRef = useRef<{ x: number; time: number; vX: number }>({
    x: 0,
    time: 0,
    vX: 0,
  });
  const reversalsRef = useRef<number[]>([]);

  // Native HTML5 File Drag Anticipation State
  const [isNativeDraggingFile, setIsNativeDraggingFile] = useState(false);
  const dragCounterRef = useRef<number>(0);

  // Global Cursor Movement Tracking
  useEffect(() => {
    function handlePointerMove(e: PointerEvent | MouseEvent) {
      const centerX = window.innerWidth / 2;
      const centerY = 20; // Top Notch center

      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      const maxRadius = Math.max(window.innerWidth / 2, window.innerHeight / 2);
      const normalizedDist = Math.min(1, dist / maxRadius);

      setCursorDelta({
        x: dx,
        y: dy,
        angle,
        distance: normalizedDist,
      });
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, []);

  // Native File Drag Listeners
  useEffect(() => {
    function handleDragEnter(e: DragEvent) {
      if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
        dragCounterRef.current += 1;
        setIsNativeDraggingFile(true);
      }
    }

    function handleDragLeave(_e: DragEvent) {
      dragCounterRef.current -= 1;
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0;
        setIsNativeDraggingFile(false);
      }
    }

    function handleDragOver(e: DragEvent) {
      e.preventDefault();
      if (!isNativeDraggingFile && e.dataTransfer && e.dataTransfer.types.includes('Files')) {
        setIsNativeDraggingFile(true);
      }
    }

    function handleDrop(e: DragEvent) {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsNativeDraggingFile(false);
    }

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [isNativeDraggingFile]);

  // Petting Detection on Local Hover Movement over Notch
  const handleNotchMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const now = performance.now();
      const currentX = e.clientX;
      const prev = lastMousePosRef.current;

      const dt = now - prev.time;
      if (dt > 12 && dt < 200) {
        const vx = (currentX - prev.x) / dt;

        if (prev.vX !== 0 && Math.sign(vx) !== Math.sign(prev.vX) && Math.abs(vx) > 0.30) {
          reversalsRef.current.push(now);
          reversalsRef.current = reversalsRef.current.filter((t) => now - t < 750);

          if (reversalsRef.current.length >= 3) {
            if (!isPetting) {
              setIsPetting(true);
              if (companionMode === 'slime') {
                playJellyBounce();
              } else if (companionMode === 'cat') {
                playPetPurr();
              } else {
                playGlassPop();
              }
            }

            if (petTimeoutRef.current) clearTimeout(petTimeoutRef.current);
            petTimeoutRef.current = setTimeout(() => {
              setIsPetting(false);
              reversalsRef.current = [];
            }, 850);
          }
        }

        lastMousePosRef.current = { x: currentX, time: now, vX: vx };
      } else {
        lastMousePosRef.current = { x: currentX, time: now, vX: prev.vX };
      }
    },
    [companionMode, isPetting]
  );

  const effectivePetting = isPetting || testPetting;
  const effectiveFileDrag = isNativeDraggingFile || testFileDrag;
  const showHeadphones = autoAccessories && (isAudioPlaying || testHeadphones);
  const showGlasses = autoAccessories && (isPomodoroRunning || testGlasses);

  const sharedProps = {
    cursorDelta,
    isPetting: effectivePetting,
    isDraggingFile: effectiveFileDrag,
    companionColor,
    theme,
    isCharging: isCharging || false,
    isLowBattery: batteryStatus === 'low',
  };

  // Expand into Full Dashboard (Click on Companion)
  const handleStageClick = useCallback(
    (_e: React.MouseEvent) => {
      playGlassPop();
      systemStore.setIslandState('expanded');
    },
    []
  );

  // Expand directly to Slide 1 (Music + Synced Lyrics)
  const handleOpenMusicLyrics = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      playGlassPop();
      systemStore.setActiveSlide(0);
      systemStore.setIslandState('expanded');
    },
    []
  );

  // Toggle Audio Playback
  const handleToggleAudio = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      playToggleClick();
      systemStore.toggleAudioPlaying();
    },
    []
  );

  // Current active synced lyric line (synced with real Spotify/YouTube song)
  const activeLyric = getCurrentLyricLine(playbackTime, liveLyrics);

  // =========================================================================
  // Mode A: Live Synced Mini Lyrics View (360px × 44px when Music Playing)
  // =========================================================================
  if (isAudioPlaying) {
    return (
      <div
        className="relative w-full h-full flex items-center select-none"
        onMouseMove={handleNotchMouseMove}
        style={{
          width: '100%',
          height: '100%',
          padding: '0 8px 0 6px',
          boxSizing: 'border-box',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '4px',
        }}
      >
        {/* 1. Left Side (58px): Active Companion with Headphone Bobbing */}
        <motion.div
          animate={{ y: [0, -1.8, 0] }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
          onClick={handleStageClick}
          title="Companion listening to music - Click to open Dashboard"
          style={{
            width: '58px',
            height: '38px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            cursor: 'pointer',
          }}
        >
          {/* Active Headphone Overlay */}
          <MiniHeadphones tintColor={companionColor} />

          {/* Glasses Overlay (if pomodoro running) */}
          {showGlasses && <FocusGlasses frameColor={companionColor} />}

          {/* Active Character */}
          {companionMode === 'slime' && <SlimeCompanion {...sharedProps} />}
          {companionMode === 'cat' && <CatCompanion {...sharedProps} />}
          {companionMode === 'eyes' && (
            <div style={{ transform: 'scale(0.85)', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CyberEyes {...sharedProps} />
            </div>
          )}
        </motion.div>

        {/* 2. Center/Right Side (flex-1): Sleek Mini Live Synced Lyrics Pill */}
        <div
          onClick={handleOpenMusicLyrics}
          title="Mini Live Synced Lyrics - Click to open Full Lyrics View"
          style={{
            flex: 1,
            minWidth: 0,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '0 6px',
            cursor: 'pointer',
            overflow: 'hidden',
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={`mini-lyric-${activeLyric.time}`}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
                width: '100%',
              }}
            >
              {/* Primary English lyric line with glowing musical note badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  color: '#ffffff',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  lineHeight: 1.25,
                }}
              >
                <Music size={11} strokeWidth={2} style={{ color: '#38bdf8', flexShrink: 0 }} />
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {activeLyric.textEn}
                </span>
              </div>

              {/* Synchronized Indonesian translation when dualSubtitleEnabled is true */}
              {dualSubtitleEnabled && activeLyric.textId && (
                <div
                  style={{
                    fontSize: '9.5px',
                    fontStyle: 'italic',
                    color: '#38bdf8',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: 1.2,
                    marginTop: '1px',
                    paddingLeft: '11px',
                    opacity: 0.95,
                    textShadow: '0 0 6px rgba(56, 189, 248, 0.4)',
                  }}
                >
                  {activeLyric.textId}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 3. Far Right (24px): 3-Bar Animated Audio Waveform */}
        <div
          onClick={handleToggleAudio}
          title="Audio Playing - Click to Pause/Play"
          style={{
            width: '24px',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2.5px',
            cursor: 'pointer',
            flexShrink: 0,
            paddingRight: '4px',
          }}
        >
          <span className="audio-bar audio-bar-playing" style={{ height: '9px', width: '2px', backgroundColor: '#38bdf8' }} />
          <span className="audio-bar audio-bar-playing" style={{ height: '15px', width: '2px', backgroundColor: '#38bdf8', animationDelay: '0.15s' }} />
          <span className="audio-bar audio-bar-playing" style={{ height: '11px', width: '2px', backgroundColor: '#38bdf8', animationDelay: '0.3s' }} />
        </div>
      </div>
    );
  }

  // =========================================================================
  // Mode B: Standard Idle Companion View (168px × 40px when Paused/Off)
  // =========================================================================
  return (
    <div
      className="relative w-full h-full flex items-center justify-center select-none"
      onMouseMove={handleNotchMouseMove}
      onClick={handleStageClick}
      title="Companion Idle - Click to Expand Dashboard"
      style={{
        width: '168px',
        height: '40px',
        overflow: 'visible',
        cursor: 'pointer',
      }}
    >
      {/* Contextual Auto-Accessories Overlay */}
      <AnimatePresence>
        {showHeadphones && (
          <MiniHeadphones key="headphones-overlay" tintColor={companionColor} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGlasses && (
          <FocusGlasses key="glasses-overlay" frameColor={companionColor} />
        )}
      </AnimatePresence>

      {/* Active Companion Renderer (Slime / Cat / Cyber-Eyes) */}
      <AnimatePresence mode="wait">
        {companionMode === 'slime' && (
          <SlimeCompanion key="slime-companion" {...sharedProps} />
        )}
        {companionMode === 'cat' && (
          <CatCompanion key="cat-companion" {...sharedProps} />
        )}
        {companionMode === 'eyes' && (
          <CyberEyes key="cyber-eyes-companion" {...sharedProps} />
        )}
      </AnimatePresence>
    </div>
  );
};
