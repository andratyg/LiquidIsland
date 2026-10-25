import React, { useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStore, systemStore } from '../store/useSystemStore';
import { playToggleClick, playGlassPop } from '../utils/sfx';
import { Volume2, SunMedium } from 'lucide-react';
import { IslandDimensions, ShelfFileItem } from '../types/liquid';
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
  const workspaceActivity = useSystemStore((s) => s.workspaceActivity);

  const shellRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDraggingRef = useRef<boolean>(false);

  // Transient Scroll HUD Pill state (Volume / Brightness)
  const [hudState] = React.useState<{
    visible: boolean;
    type: 'volume' | 'brightness';
    value: number;
  }>({
    visible: false,
    type: 'volume',
    value: currentVolume,
  });

  // Cursor Enter Logic: Stealth Auto-Wake and 220ms Hover Auto-Expand
  const handleCursorEnter = useCallback(() => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }

    const current = systemStore.getState().islandState;
    if (current === 'bezel-line') {
      // Stealth Mode Auto-Wake: Wake to compact immediately
      systemStore.setIslandState('compact');
      // If hovered for 220ms, smoothly expand to expanded dashboard
      hoverTimerRef.current = setTimeout(() => {
        const stateNow = systemStore.getState().islandState;
        if (stateNow === 'compact' || stateNow === 'eyes') {
          playGlassPop();
          systemStore.setIslandState('expanded');
        }
      }, 220);
    } else if (current === 'compact' || current === 'eyes') {
      // Hover Auto-Expand: expand after 220ms hover
      hoverTimerRef.current = setTimeout(() => {
        const stateNow = systemStore.getState().islandState;
        if (stateNow === 'compact' || stateNow === 'eyes') {
          playGlassPop();
          systemStore.setIslandState('expanded');
        }
      }, 220);
    }

    onHoverChange?.(true);
  }, [onHoverChange]);

  // Cursor Leave Logic: 280ms Debounced Auto-Shrink with Input Focus & Modal Guards
  const handleCursorLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }

    onHoverChange?.(false);

    // Auto-Shrink on cursor leave after 280ms
    leaveTimerRef.current = setTimeout(() => {
      // Check guards: do not shrink if an input/textarea is focused or modal open
      const activeEl = document.activeElement;
      const isInputFocused =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable);

      const store = systemStore.getState();
      const isModalOpen = store.spotlightOpen || store.privacyBlurEnabled;

      if (isDraggingRef.current) {
        return; // Inhibit auto-shrink while dragging files over the Island
      }

      if (!isInputFocused && !isModalOpen) {
        if (store.islandState === 'expanded' || store.islandState === 'expanded-lyrics') {
          playGlassPop();
          systemStore.collapseIsland();
        }
      }
    }, 280);
  }, [onHoverChange]);

  // Clean up timers on unmount & listen to Win32 hardware events
  useEffect(() => {
    function onCustomCursorEnter() {
      handleCursorEnter();
    }
    function onCustomCursorLeave() {
      handleCursorLeave();
    }

    window.addEventListener('liquid-cursor-enter', onCustomCursorEnter);
    window.addEventListener('liquid-cursor-leave', onCustomCursorLeave);

    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
      window.removeEventListener('liquid-cursor-enter', onCustomCursorEnter);
      window.removeEventListener('liquid-cursor-leave', onCustomCursorLeave);
    };
  }, [handleCursorEnter, handleCursorLeave]);

  // Universal File Drag-and-Drop Auto-Wake to Shelf
  useEffect(() => {
    let dragCounter = 0;

    const onWindowDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter++;
      isDraggingRef.current = true;

      const hasFiles =
        e.dataTransfer &&
        (e.dataTransfer.types.includes('Files') ||
          e.dataTransfer.types.includes('text/uri-list'));

      if (hasFiles) {
        systemStore.wakeShelfForDrop();
      }
    };

    const onWindowDragOver = (e: DragEvent) => {
      e.preventDefault();
      isDraggingRef.current = true;
    };

    const onWindowDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        isDraggingRef.current = false;
      }
    };

    const onWindowDrop = () => {
      dragCounter = 0;
      isDraggingRef.current = false;
    };

    window.addEventListener('dragenter', onWindowDragEnter);
    window.addEventListener('dragover', onWindowDragOver);
    window.addEventListener('dragleave', onWindowDragLeave);
    window.addEventListener('drop', onWindowDrop);

    // Tauri Native Window Drag-Drop Listener for OS-level Explorer drags
    let unlistenTauriDrag: (() => void) | null = null;
    let isMounted = true;

    async function initTauriDragListener() {
      const isTauri =
        typeof window !== 'undefined' &&
        ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
      if (!isTauri) return;

      try {
        const { getCurrentWebview } = await import('@tauri-apps/api/webview');
        const unlisten = await getCurrentWebview().onDragDropEvent((event) => {
          if (!isMounted) return;
          const payload = event.payload;

          if (payload.type === 'enter' || payload.type === 'over') {
            isDraggingRef.current = true;
            systemStore.wakeShelfForDrop();
          } else if (payload.type === 'drop') {
            isDraggingRef.current = false;
            const paths = payload.paths;
            if (paths && paths.length > 0) {
              paths.forEach((filePath) => {
                const name = filePath.split(/[\\/]/).pop() || filePath;
                const ext = name.split('.').pop()?.toLowerCase() || '';
                const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext);

                const newFile: ShelfFileItem = {
                  id: `shelf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                  name,
                  size: 1024 * 120,
                  formattedSize: 'File',
                  type: isImage ? `image/${ext}` : 'application/octet-stream',
                  previewUrl: '',
                  timestamp: 'Just now',
                  content: filePath,
                };
                systemStore.addShelfFile(newFile);
              });
              playGlassPop();
            }
          } else {
            isDraggingRef.current = false;
          }
        });
        unlistenTauriDrag = unlisten;
      } catch (err) {
        console.warn('[Tauri DragDrop] Native drag listener setup:', err);
      }
    }

    initTauriDragListener();

    return () => {
      isMounted = false;
      window.removeEventListener('dragenter', onWindowDragEnter);
      window.removeEventListener('dragover', onWindowDragOver);
      window.removeEventListener('dragleave', onWindowDragLeave);
      window.removeEventListener('drop', onWindowDrop);
      if (unlistenTauriDrag) unlistenTauriDrag();
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

  // Click on compact/eyes or bezel wakes/expands immediately
  const handleClick = useCallback((e: React.MouseEvent) => {
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

  // Middle-Click Gesture: Toggle audio playback or wake from bezel
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button === 1) {
        e.preventDefault();
        e.stopPropagation();
        playToggleClick();
        if (islandState === 'bezel-line') {
          systemStore.setIslandState('compact');
        } else {
          systemStore.toggleAudioPlaying();
        }
      }
    },
    [islandState]
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
      : '20px';

  const isTabSwitch = workspaceActivity?.kind === 'tab-switch' || workspaceActivity?.kind === 'app-switch';
  const isDesktopSwitch = workspaceActivity?.kind === 'desktop-switch';
  const desktopDirection = workspaceActivity?.direction || 'right';

  let scaleXVal: any = 1;
  let scaleYVal: any = 1;
  let xVal: any = 0;
  let skewXVal: any = 0;

  if (isJellyBouncing) {
    scaleXVal = [1, 1.05, 0.96, 1.02, 1];
    scaleYVal = [1, 0.94, 1.05, 0.98, 1];
  } else if (isTabSwitch) {
    scaleXVal = [1, 1.12, 0.97, 1];
    scaleYVal = [1, 0.92, 1.03, 1];
  }

  if (isDesktopSwitch) {
    xVal = desktopDirection === 'right' ? [0, -18, 6, 0] : [0, 18, -6, 0];
    skewXVal = desktopDirection === 'right' ? [0, -8, 3, 0] : [0, 8, -3, 0];
  }

  return (
    <div
      id="liquid-island-root"
      onMouseEnter={handleCursorEnter}
      onMouseLeave={handleCursorLeave}
      onClick={handleClick}
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
        className={`liquid-notch-shell ${
          isDesktopSwitch
            ? desktopDirection === 'right'
              ? 'liquid-edge-trail-right'
              : 'liquid-edge-trail-left'
            : ''
        }`}
        initial={false}
        animate={{
          width: activeDimensions.width,
          height: activeDimensions.height,
          x: xVal,
          skewX: skewXVal,
          scaleX: scaleXVal,
          scaleY: scaleYVal,
        }}
        transition={
          isTabSwitch || isDesktopSwitch
            ? {
                duration: 0.55,
                ease: [0.22, 1, 0.36, 1],
                width: { type: 'spring', stiffness: 420, damping: 34, mass: 0.8 },
                height: { type: 'spring', stiffness: 420, damping: 34, mass: 0.8 },
              }
            : {
                type: 'spring',
                stiffness: 420,
                damping: 34,
                mass: 0.8,
              }
        }
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
        {/* Traveling Specular Rim Sweep Highlight */}
        <AnimatePresence>
          {isTabSwitch && (
            <motion.div
              key={`rim-sweep-${workspaceActivity?.timestamp}`}
              className="liquid-rim-sweep"
              initial={{ x: '-100%', opacity: 0 }}
              animate={{ x: '250%', opacity: [0, 1, 0.8, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            />
          )}
        </AnimatePresence>
        {/* Concave SVG Notch Corner Ears */}
        {!isBezelLine && (
          <>
            <div className="notch-ear notch-ear-left">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M 0,0 L 16,0 L 16,16 A 16,16 0 0,0 0,0 Z" />
              </svg>
            </div>
            <div className="notch-ear notch-ear-right">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M 0,0 L 16,0 L 16,16 A 16,16 0 0,0 0,0 Z" />
              </svg>
            </div>
          </>
        )}

        {/* State 0: Stealth Bezel Line */}
        {isBezelLine ? (
          <div
            className="bezel-line-strip"
            title="Stealth Bezel Active (136x6). Hover or click to wake."
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
