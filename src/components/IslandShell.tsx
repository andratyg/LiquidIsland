import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStore, systemStore } from '../store/useSystemStore';
import { playToggleClick, playGlassPop } from '../utils/sfx';
import { Volume2, SunMedium } from 'lucide-react';
import { IslandDimensions } from '../types/liquid';
import { CatCompanion } from './companions/CatCompanion';

interface IslandShellProps {
  children?: React.ReactNode;
  activeDimensions: IslandDimensions;
  onHoverChange?: (hovered: boolean) => void;
  isJellyBouncing?: boolean;
}

export const IslandShell: React.FC<IslandShellProps> = ({
  children,
  activeDimensions,
  onHoverChange,
  isJellyBouncing = false,
}) => {
  const islandState = useSystemStore((s) => s.islandState);
  const currentVolume = useSystemStore((s) => s.volume);
  const companionMode = useSystemStore((s) => s.companionMode);
  const companionColor = useSystemStore((s) => s.companionColor);
  const theme = useSystemStore((s) => s.theme);

  const shellRef = useRef<HTMLDivElement>(null);
  const [isMagneticHover, setIsMagneticHover] = useState(false);

  // Transient Scroll HUD Pill state (Volume / Brightness)
  const [hudState] = useState<{
    visible: boolean;
    type: 'volume' | 'brightness';
    value: number;
  }>({
    visible: false,
    type: 'volume',
    value: currentVolume,
  });

  const hudTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear HUD timer on unmount
  useEffect(() => {
    return () => {
      if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    };
  }, []);

  // Mouse Move: Updates specular reflection coordinates (--mouse-x, --mouse-y)
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!shellRef.current) return;
    const rect = shellRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    shellRef.current.style.setProperty('--mouse-x', `${x}px`);
    shellRef.current.style.setProperty('--mouse-y', `${y}px`);
  }, []);

  // Dynamic Cursor Tracking on Enter
  const handleMouseEnter = useCallback(() => {
    if (islandState === 'bezel-line') {
      setIsMagneticHover(true);
    }
    onHoverChange?.(true);
  }, [islandState, onHoverChange]);

  // Dynamic Cursor Tracking on Leave
  const handleMouseLeave = useCallback(() => {
    setIsMagneticHover(false);
    onHoverChange?.(false);
  }, [onHoverChange]);

  // Double-Click Notch to Expand into Dashboard
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const current = systemStore.getState().islandState;
    if (current === 'compact' || current === 'eyes' || current === 'bezel-line') {
      playGlassPop();
      systemStore.setIslandState('expanded');
    }
  }, []);

  // Mouse Wheel: Scroll gesture to adjust Volume or Brightness via Toast Mode C HUD
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      // Prevent page/window scrolling
      e.stopPropagation();

      const step = e.deltaY < 0 ? 4 : -4;
      const isBrightness = e.shiftKey || e.altKey;

      if (isBrightness) {
        systemStore.setBrightness((prev) => {
          const next = Math.max(0, Math.min(100, prev + step));
          systemStore.triggerToast('hud', {
            hudType: 'brightness',
            hudValue: next,
            title: 'Brightness',
            subtitle: `${next}%`,
          });
          return next;
        });
      } else {
        systemStore.setVolume((prev) => {
          const next = Math.max(0, Math.min(100, prev + step));
          systemStore.triggerToast('hud', {
            hudType: 'volume',
            hudValue: next,
            title: 'Volume',
            subtitle: `${next}%`,
          });
          return next;
        });
      }
    },
    []
  );

  // Middle-Click Gesture (e.button === 1): Toggle music or collapse to bezel-line
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button === 1) {
        // Middle click
        e.preventDefault();
        e.stopPropagation();
        playToggleClick();
        if (islandState === 'bezel-line') {
          systemStore.setIslandState('compact');
        } else {
          // If in compact or expanded, toggle audio playback
          systemStore.toggleAudioPlaying();
        }
      }
    },
    [islandState]
  );

  // Wake Island from Stealth Bezel Line to Expanded Dashboard
  const handleWakeFromBezel = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      playGlassPop();
      systemStore.setIslandState('expanded');
    },
    []
  );

  const isBezelLine = islandState === 'bezel-line';

  // Dynamic bottom squircle radii
  const bottomCornerRadius =
    islandState === 'expanded' || islandState === 'expanded-lyrics'
      ? '34px'
      : islandState === 'toast'
      ? '32px'
      : islandState === 'bezel-line'
      ? '4px'
      : '24px';

  return (
    <div
      id="liquid-island-root"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onDoubleClick={handleDoubleClick}
      style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* ==================================================================== */}
      {/* 1. Top Bezel Strip (Fixed 5px Bar Fused with Monitor Edge)          */}
      {/* ==================================================================== */}
      <div className="top-bezel-strip" />

      {/* ==================================================================== */}
      {/* 2. Master Notch Container with Spring Physics Transitions             */}
      {/* ==================================================================== */}
      <motion.div
        ref={shellRef}
        className="liquid-notch-shell"
        initial={false}
        animate={{
          width: isBezelLine && isMagneticHover ? 144 : activeDimensions.width,
          height: isBezelLine && isMagneticHover ? 10 : activeDimensions.height,
          scaleX: isJellyBouncing ? [1, 1.05, 0.96, 1.02, 1] : (isBezelLine && isMagneticHover ? 1.06 : 1),
          scaleY: isJellyBouncing ? [1, 0.94, 1.05, 0.98, 1] : 1,
        }}
        transition={{
          type: 'spring',
          stiffness: 420,
          damping: 34,
          mass: 0.8,
        }}
        onMouseMove={handleMouseMove}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        style={{
          pointerEvents: 'auto',
          position: 'relative',
          borderBottomLeftRadius: bottomCornerRadius,
          borderBottomRightRadius: bottomCornerRadius,
        }}
      >
        {/* Concave SVG Notch Corner Ears (Mounted inside motion.div for 1:1 edge tracking) */}
        {!isBezelLine && (
          <>
            {/* Left Notch Ear */}
            <div className="notch-ear notch-ear-left">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M 0,0 L 16,0 L 16,16 A 16,16 0 0,0 0,0 Z" />
              </svg>
            </div>

            {/* Right Notch Ear (Horizontally Flipped) */}
            <div className="notch-ear notch-ear-right">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M 0,0 L 16,0 L 16,16 A 16,16 0 0,0 0,0 Z" />
              </svg>
            </div>
          </>
        )}
        {/* State 0: Stealth Bezel Line with Magnetic Tension Wake */}
        {isBezelLine ? (
          <div
            className={`bezel-line-strip ${isMagneticHover ? 'magnetic-hover' : ''}`}
            onClick={handleWakeFromBezel}
            title="Stealth Bezel Active (136x6). Click or hover to wake into Compact view."
          >
            {companionMode === 'cat' && (
              <CatCompanion
                isBezelLine
                cursorDelta={{ x: 0, y: 0, angle: Math.PI / 2, distance: 0 }}
                isPetting={false}
                isDraggingFile={false}
                companionColor={companionColor}
                theme={theme}
              />
            )}
          </div>
        ) : (
          /* Active Island Content (Compact, Expanded, etc.) */
          <>
            {children}

            {/* Transient Scroll HUD Pill for Volume/Brightness */}
            <AnimatePresence>
              {hudState.visible && (
                <motion.div
                  key="scroll-hud"
                  className="scroll-hud-pill"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.12 }}
                >
                  {hudState.type === 'volume' ? (
                    <Volume2 size={13} style={{ color: '#3b82f6', flexShrink: 0 }} />
                  ) : (
                    <SunMedium size={13} style={{ color: '#f59e0b', flexShrink: 0 }} />
                  )}
                  <span style={{ fontSize: '10.5px', textTransform: 'capitalize' }}>
                    {hudState.type}: {hudState.value}%
                  </span>
                  <div className="scroll-hud-track">
                    <div
                      className="scroll-hud-fill"
                      style={{
                        width: `${hudState.value}%`,
                        backgroundColor: hudState.type === 'volume' ? '#3b82f6' : '#f59e0b',
                      }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </motion.div>
    </div>
  );
};
