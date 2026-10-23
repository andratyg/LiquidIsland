import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStore, systemStore } from '../store/useSystemStore';
import { playScrollTick, playToggleClick, playGlassPop } from '../utils/sfx';
import { Volume2, SunMedium } from 'lucide-react';
import { IslandDimensions } from '../types/liquid';
import { CatCompanion } from './companions/CatCompanion';

// Safe Tauri IPC invoker with web browser fallback
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

interface IslandShellProps {
  children?: React.ReactNode;
  activeDimensions: IslandDimensions;
  onHoverChange?: (hovered: boolean) => void;
}

export const IslandShell: React.FC<IslandShellProps> = ({
  children,
  activeDimensions,
  onHoverChange,
}) => {
  const islandState = useSystemStore((s) => s.islandState);
  const currentVolume = useSystemStore((s) => s.volume);
  const companionMode = useSystemStore((s) => s.companionMode);
  const companionColor = useSystemStore((s) => s.companionColor);
  const theme = useSystemStore((s) => s.theme);

  const shellRef = useRef<HTMLDivElement>(null);
  const [isMagneticHover, setIsMagneticHover] = useState(false);

  // Transient Scroll HUD Pill state (Volume / Brightness)
  const [hudState, setHudState] = useState<{
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

  // Dynamic Cursor Click-Through on Enter
  const handleMouseEnter = useCallback(async () => {
    if (islandState === 'bezel-line') {
      setIsMagneticHover(true);
    }
    onHoverChange?.(true);
    await safeInvoke('set_click_through', { ignore: false });
  }, [islandState, onHoverChange]);

  // Dynamic Cursor Click-Through on Leave
  const handleMouseLeave = useCallback(async () => {
    setIsMagneticHover(false);
    onHoverChange?.(false);
    await safeInvoke('set_click_through', { ignore: true });
  }, [onHoverChange]);

  // Mouse Wheel: Scroll gesture to adjust Volume or Brightness
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      // Prevent page/window scrolling
      e.stopPropagation();

      const step = e.deltaY < 0 ? 4 : -4;
      const isBrightness = e.shiftKey || e.altKey;

      playScrollTick();

      if (isBrightness) {
        systemStore.setBrightness((prev) => {
          const next = Math.max(0, Math.min(100, prev + step));
          setHudState({ visible: true, type: 'brightness', value: next });
          return next;
        });
      } else {
        systemStore.setVolume((prev) => {
          const next = Math.max(0, Math.min(100, prev + step));
          setHudState({ visible: true, type: 'volume', value: next });
          return next;
        });
      }

      // Auto-dismiss HUD pill after 1.4 seconds of inactivity
      if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
      hudTimerRef.current = setTimeout(() => {
        setHudState((prev) => ({ ...prev, visible: false }));
      }, 1400);
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

  // Wake Island from Stealth Bezel Line to Compact
  const handleWakeFromBezel = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      playGlassPop();
      systemStore.setIslandState('compact');
    },
    []
  );

  const isBezelLine = islandState === 'bezel-line';

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        margin: '0 auto',
      }}
    >
      {/* ==================================================================== */}
      {/* 1. Top Bezel Strip (Fixed 5px Bar Fused with Monitor Edge)          */}
      {/* ==================================================================== */}
      <div className="top-bezel-strip" />

      {/* ==================================================================== */}
      {/* 2. Concave SVG Notch Corner Ears (16x16 Corner Fillets)              */}
      {/* ==================================================================== */}
      {/* Left Notch Ear */}
      <div
        className="notch-ear notch-ear-left"
        style={{
          opacity: isBezelLine ? 0 : 1,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M 0,0 L 16,0 L 16,16 A 16,16 0 0,0 0,0 Z" />
        </svg>
      </div>

      {/* Right Notch Ear (Horizontally Flipped) */}
      <div
        className="notch-ear notch-ear-right"
        style={{
          opacity: isBezelLine ? 0 : 1,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M 0,0 L 16,0 L 16,16 A 16,16 0 0,0 0,0 Z" />
        </svg>
      </div>

      {/* ==================================================================== */}
      {/* 3. Master Notch Container with Spring Physics Transitions             */}
      {/* ==================================================================== */}
      <motion.div
        ref={shellRef}
        className="liquid-notch-shell"
        initial={false}
        animate={{
          width: isBezelLine && isMagneticHover ? 144 : activeDimensions.width,
          height: isBezelLine && isMagneticHover ? 10 : activeDimensions.height,
          scaleX: isBezelLine && isMagneticHover ? 1.06 : 1,
        }}
        transition={{
          type: 'spring',
          stiffness: 420,
          damping: 34,
          mass: 0.8,
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        style={{
          pointerEvents: 'auto',
          position: 'relative',
        }}
      >
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
