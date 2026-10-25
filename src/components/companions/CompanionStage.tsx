import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useSystemStore, systemStore } from '../../store/useSystemStore';
import { SlimeCompanion } from './SlimeCompanion';
import { CatCompanion } from './CatCompanion';
import { CyberEyes } from './CyberEyes';
import { MiniHeadphones } from './accessories/MiniHeadphones';
import { FocusGlasses } from './accessories/FocusGlasses';
import { playJellyBounce, playPetPurr, playGlassPop } from '../../utils/sfx';

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
  const isPomodoroRunning = useSystemStore((s) => s.isPomodoroRunning);
  const isCharging = useSystemStore((s) => s.isCharging);
  const batteryStatus = useSystemStore((s) => s.batteryStatus);

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

      // Normalize distance between 0 and 1 over half-screen radius
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

        // Check for horizontal direction reversal
        if (prev.vX !== 0 && Math.sign(vx) !== Math.sign(prev.vX) && Math.abs(vx) > 0.30) {
          reversalsRef.current.push(now);

          // Keep reversals from last 750ms
          reversalsRef.current = reversalsRef.current.filter((t) => now - t < 750);

          if (reversalsRef.current.length >= 3) {
            if (!isPetting) {
              setIsPetting(true);
              // Trigger character-specific sound
              if (companionMode === 'slime') {
                playJellyBounce();
              } else if (companionMode === 'cat') {
                playPetPurr();
              } else {
                playGlassPop();
              }
            }

            // Extend petting duration
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

  const handleStageClick = useCallback(
    (_e: React.MouseEvent) => {
      if (effectivePetting || effectiveFileDrag) return;
      playGlassPop();
      systemStore.expandIsland();
    },
    [effectivePetting, effectiveFileDrag]
  );

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
      {/* ==================================================================== */}
      {/* 1. Contextual Auto-Accessories Overlay                                */}
      {/* ==================================================================== */}
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

      {/* ==================================================================== */}
      {/* 2. Active Companion Renderer (Slime / Cat / Cyber-Eyes)               */}
      {/* ==================================================================== */}
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
