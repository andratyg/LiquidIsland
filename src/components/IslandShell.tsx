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
  const toastPayload = useSystemStore((s) => s.toastPayload);
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
      systemStore.wakeShelfForDrop();
    };

    const onWindowDragOver = (e: DragEvent) => {
      e.preventDefault();
      isDraggingRef.current = true;
      systemStore.wakeShelfForDrop();
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

    const onWindowMouseUp = () => {
      dragCounter = 0;
      isDraggingRef.current = false;
    };

    window.addEventListener('dragenter', onWindowDragEnter);
    window.addEventListener('dragover', onWindowDragOver);
    window.addEventListener('dragleave', onWindowDragLeave);
    window.addEventListener('drop', onWindowDrop);
    window.addEventListener('mouseup', onWindowMouseUp);

    // Tauri Native Window Drag-Drop Listener for OS-level Explorer drags
    let unlistenTauriDrag: (() => void) | null = null;
    let unlistenApproach: (() => void) | null = null;
    let isMounted = true;

    async function initDragListeners() {
      const isTauri =
        typeof window !== 'undefined' &&
        ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
      if (!isTauri) return;

      try {
        const { getCurrentWebview } = await import('@tauri-apps/api/webview');
        const { listen } = await import('@tauri-apps/api/event');
        if (!isMounted) return;

        // Listen for hardware-level cursor drag approach from window_manager.rs
        const subApproach = await listen('drag-approach-shelf', () => {
          isDraggingRef.current = true;
          systemStore.wakeShelfForDrop();
        });
        unlistenApproach = subApproach;

        const unlisten = await getCurrentWebview().onDragDropEvent(async (event) => {
          if (!isMounted) return;
          const payload = event.payload;

          if (payload.type === 'enter' || payload.type === 'over') {
            isDraggingRef.current = true;
            systemStore.wakeShelfForDrop();
          } else if (payload.type === 'drop') {
            isDraggingRef.current = false;
            const paths = payload.paths;
            if (paths && paths.length > 0) {
              const { convertFileSrc, invoke } = await import('@tauri-apps/api/core');
              for (const filePath of paths) {
                const name = filePath.split(/[\\/]/).pop() || filePath;
                const ext = name.split('.').pop()?.toLowerCase() || '';
                const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'ico'].includes(ext);

                let previewUrl = '';
                if (isImage) {
                  try {
                    previewUrl = convertFileSrc(filePath);
                  } catch {
                    previewUrl = '';
                  }
                }

                let formattedSize = isImage ? 'Photo' : ext ? `${ext.toUpperCase()} File` : 'File';
                let sizeBytes: number = 1024 * 100;
                let textPreview: string | undefined = undefined;

                try {
                  const meta = await invoke<{
                    formatted_size?: string;
                    size_bytes?: number;
                    text_preview?: string;
                  }>('inspect_dropped_file', { path: filePath });

                  if (meta) {
                    if (meta.formatted_size) formattedSize = meta.formatted_size;
                    if (typeof meta.size_bytes === 'number') sizeBytes = meta.size_bytes;
                    if (meta.text_preview) textPreview = meta.text_preview;
                  }
                } catch {
                  // Fallback to defaults
                }

                const newFile: ShelfFileItem = {
                  id: `shelf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                  name,
                  size: sizeBytes,
                  formattedSize,
                  type: isImage ? `image/${ext}` : ext ? `file/${ext}` : 'application/octet-stream',
                  previewUrl,
                  timestamp: 'Just now',
                  content: textPreview || filePath,
                  path: filePath,
                  originalSize: sizeBytes,
                  originalFormattedSize: formattedSize,
                };
                systemStore.addShelfFile(newFile);
              }
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

    initDragListeners();

    return () => {
      isMounted = false;
      window.removeEventListener('dragenter', onWindowDragEnter);
      window.removeEventListener('dragover', onWindowDragOver);
      window.removeEventListener('dragleave', onWindowDragLeave);
      window.removeEventListener('drop', onWindowDrop);
      window.removeEventListener('mouseup', onWindowMouseUp);
      if (unlistenTauriDrag) unlistenTauriDrag();
      if (unlistenApproach) unlistenApproach();
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
  // Left half of Island = Screen Brightness; Right half = Volume
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      e.stopPropagation();
      const step = e.deltaY < 0 ? 4 : -4;

      let isBrightness = e.shiftKey || e.altKey;
      if (!isBrightness && shellRef.current) {
        const rect = shellRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        isBrightness = mouseX < rect.width / 2;
      }

      if (isBrightness) {
        systemStore.adjustBrightness(step);
      } else {
        systemStore.adjustVolume(step);
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

  const isHudToast = islandState === 'toast' && toastPayload?.type === 'hud';

  // Dynamic bottom squircle radii
  const bottomCornerRadius =
    islandState === 'expanded' || islandState === 'expanded-lyrics'
      ? '34px'
      : isHudToast
      ? '22px'
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

      {/* ==================================================================== */}
      {/* 3. 600px Top Edge Liquid Aurora Sweep on Desktop Switch               */}
      {/* ==================================================================== */}
      <AnimatePresence>
        {isDesktopSwitch && (
          <motion.div
            key={`aurora-top-${workspaceActivity?.timestamp}`}
            initial={{
              x: desktopDirection === 'right' ? '-100%' : '100%',
              opacity: 0,
            }}
            animate={{
              x: desktopDirection === 'right' ? '100%' : '-100%',
              opacity: [0, 1, 0.9, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'fixed',
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '600px',
              height: '5px',
              background: 'linear-gradient(90deg, transparent, #38bdf8, #818cf8, transparent)',
              boxShadow: '0 0 16px 4px rgba(56, 189, 248, 0.65)',
              pointerEvents: 'none',
              zIndex: 9999,
            }}
          />
        )}
      </AnimatePresence>

      {/* ==================================================================== */}
      {/* 4. Floating Workspace Switcher Banner ([● ○ ○] Workspace 1/2)        */}
      {/* ==================================================================== */}
      <AnimatePresence>
        {isDesktopSwitch && (
          <motion.div
            key={`workspace-banner-${workspaceActivity?.timestamp}`}
            initial={{
              opacity: 0,
              y: -12,
              scale: 0.92,
              x: desktopDirection === 'right' ? 24 : -24,
            }}
            animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
            exit={{
              opacity: 0,
              y: -10,
              scale: 0.94,
              x: desktopDirection === 'right' ? -20 : 20,
            }}
            transition={{ type: 'spring', stiffness: 450, damping: 28 }}
            style={{
              marginTop: '8px',
              width: '260px',
              height: '44px',
              borderRadius: '22px',
              backgroundColor: 'rgba(15, 23, 42, 0.92)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5), 0 0 16px rgba(56, 189, 248, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 16px',
              boxSizing: 'border-box',
              color: '#ffffff',
              zIndex: 40,
              pointerEvents: 'none',
            }}
          >
            {/* Animated Workspace Dots */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  width: desktopDirection === 'left' ? '8px' : '6px',
                  height: desktopDirection === 'left' ? '8px' : '6px',
                  borderRadius: '50%',
                  backgroundColor:
                    desktopDirection === 'left' ? '#38bdf8' : 'rgba(255, 255, 255, 0.25)',
                  boxShadow: desktopDirection === 'left' ? '0 0 8px #38bdf8' : 'none',
                  transition: 'all 0.2s ease',
                }}
              />
              <span
                style={{
                  width: desktopDirection === 'right' ? '8px' : '6px',
                  height: desktopDirection === 'right' ? '8px' : '6px',
                  borderRadius: '50%',
                  backgroundColor:
                    desktopDirection === 'right' ? '#818cf8' : 'rgba(255, 255, 255, 0.25)',
                  boxShadow: desktopDirection === 'right' ? '0 0 8px #818cf8' : 'none',
                  transition: 'all 0.2s ease',
                }}
              />
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.25)',
                }}
              />
            </div>

            {/* Workspace Title */}
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.3px',
                color: '#f8fafc',
              }}
            >
              {desktopDirection === 'left' ? 'Workspace 1' : 'Workspace 2'}
            </span>

            {/* Directional Arrow Badge */}
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: '#38bdf8',
                padding: '2px 8px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
              }}
            >
              {desktopDirection === 'left' ? '← DESK 1' : 'DESK 2 →'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
