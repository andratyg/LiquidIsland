import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStore, systemStore } from '../store/useSystemStore';
import { playGlassPop, playToggleClick, playWaterDrop } from '../utils/sfx';
import { MusicLyricsSlide } from './slides/MusicLyricsSlide';
import { PomodoroSlide } from './slides/PomodoroSlide';
import { WaterSlide } from './slides/WaterSlide';
import { ShelfSlide } from './slides/ShelfSlide';
import { TodoSlide } from './slides/TodoSlide';
import { SlidePlaceholder } from './slides/SlidePlaceholder';
import { ChevronLeft, ChevronRight, X, Settings } from 'lucide-react';
import { SlideIndex } from '../types/liquid';

const SLIDE_TITLES: Record<SlideIndex, string> = {
  0: 'Music',
  1: 'Pomodoro',
  2: 'Water Reminder',
  3: 'Shelf',
  4: 'TodoList',
};

interface ExpandedContainerProps {
  onDropJellyBounce?: () => void;
  onOpenSettings?: () => void;
}

export const ExpandedContainer: React.FC<ExpandedContainerProps> = ({
  onDropJellyBounce,
  onOpenSettings,
}) => {
  const activeSlide = useSystemStore((s) => s.activeSlide);
  const isAudioPlaying = useSystemStore((s) => s.isAudioPlaying);
  const volume = useSystemStore((s) => s.volume);
  const shelfFilesCount = useSystemStore((s) => s.shelfFiles?.length ?? 0);

  // Live real-time formatted date & time: e.g. "Sun 25 Oct 2026  09:32"
  const [currentDateStr, setCurrentDateStr] = useState<string>(() => {
    const now = new Date();
    const datePart = now.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const timePart = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return `${datePart}  ${timePart}`;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const datePart = now.toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      const timePart = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      setCurrentDateStr(`${datePart}  ${timePart}`);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Cycle slide backwards with SFX
  const handlePrevSlide = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    playGlassPop();
    systemStore.cycleSlide(-1);
  }, []);

  // Cycle slide forwards with SFX
  const handleNextSlide = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    playGlassPop();
    systemStore.cycleSlide(1);
  }, []);

  // Jump to specific slide index
  const handleSelectSlide = useCallback((index: SlideIndex, e: React.MouseEvent) => {
    e.stopPropagation();
    playGlassPop();
    systemStore.setActiveSlide(index);
  }, []);

  // Collapse back to idle (compact or eyes)
  const handleCollapse = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    playGlassPop();
    systemStore.collapseIsland();
  }, []);

  // Toggle audio playback
  const handleToggleAudio = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    playToggleClick();
    systemStore.toggleAudioPlaying();
  }, []);

  // Clear Shelf files when activeSlide === 3
  const handleClearShelf = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    playWaterDrop();
    systemStore.clearShelfFiles();
  }, []);

  // Status Ring Calculation for 15x15px green circular progress ring
  const ringCircumference = 2 * Math.PI * 5.5; // ~34.55
  const progressRatio = Math.max(0.15, Math.min(1, volume / 100));
  const strokeDashoffset = ringCircumference - ringCircumference * progressRatio;

  const currentTitle = useMemo(() => SLIDE_TITLES[activeSlide] || 'Music', [activeSlide]);

  return (
    <div className="expanded-carousel-container">
      {/* ==================================================================== */}
      {/* 1. Top Header Bar (1:1 Video Match)                                  */}
      {/* ==================================================================== */}
      <div className="expanded-header">
        {/* Left: Dynamic Slide Title (e.g. TodoList or Shelf (3)) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              fontSize: '11.5px',
              fontWeight: 700,
              letterSpacing: '0.4px',
              color: '#ffffff',
            }}
          >
            {activeSlide === 3 && shelfFilesCount > 0 ? `Shelf (${shelfFilesCount})` : currentTitle}
          </span>

          {/* Shelf "Clear" Action Pill Button */}
          {activeSlide === 3 && shelfFilesCount > 0 && (
            <button
              type="button"
              onClick={handleClearShelf}
              className="btn-pill"
              style={{
                fontSize: '9px',
                padding: '1px 7px',
                height: '17px',
                color: '#f87171',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                cursor: 'pointer',
                borderRadius: '9999px',
              }}
              title="Clear all items from Shelf"
            >
              Clear
            </button>
          )}
        </div>

        {/* Center: Live Formatted Date & Time + 15x15px Green Progress Ring */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '10.5px',
            fontWeight: 500,
            color: '#94a3b8',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {/* 15x15px Circular Green Progress Ring */}
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}>
            {/* Background ring */}
            <circle
              cx="7.5"
              cy="7.5"
              r="5.5"
              stroke="rgba(34, 197, 94, 0.22)"
              strokeWidth="1.8"
              fill="none"
            />
            {/* Active green progress arc */}
            <circle
              cx="7.5"
              cy="7.5"
              r="5.5"
              stroke="#22c55e"
              strokeWidth="1.8"
              fill="none"
              strokeDasharray={ringCircumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform="rotate(-90 7.5 7.5)"
              style={{
                transition: 'stroke-dashoffset 0.3s ease',
              }}
            />
            {/* Center dot */}
            <circle cx="7.5" cy="7.5" r="1.8" fill="#22c55e" />
          </svg>

          <span>{currentDateStr}</span>
        </div>

        {/* Right: 5-Bar Waveform Visualizer + Hover-only Settings + Close Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* 5-Bar Animated Audio Waveform */}
          <div
            title={`Audio Visualizer (${isAudioPlaying ? 'Playing' : 'Paused'})`}
            onClick={handleToggleAudio}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              height: '16px',
              width: '18px',
              cursor: 'pointer',
            }}
          >
            <span className={`audio-bar ${isAudioPlaying ? 'audio-bar-playing' : 'audio-bar-paused'}`} />
            <span className={`audio-bar ${isAudioPlaying ? 'audio-bar-playing' : 'audio-bar-paused'}`} />
            <span className={`audio-bar ${isAudioPlaying ? 'audio-bar-playing' : 'audio-bar-paused'}`} />
            <span className={`audio-bar ${isAudioPlaying ? 'audio-bar-playing' : 'audio-bar-paused'}`} />
            <span className={`audio-bar ${isAudioPlaying ? 'audio-bar-playing' : 'audio-bar-paused'}`} />
          </div>

          {/* Settings Trigger */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              playGlassPop();
              onOpenSettings?.();
            }}
            title="Settings"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2px',
              borderRadius: '4px',
              outline: 'none',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            <Settings size={13} strokeWidth={1.75} />
          </button>

          {/* Close / Collapse Button */}
          <button
            type="button"
            onClick={handleCollapse}
            title="Collapse (Esc)"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2px',
              borderRadius: '4px',
              outline: 'none',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            <X size={13} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. Slide Content Area                                                */}
      {/* ==================================================================== */}
      <div className="slide-content-area">
        <AnimatePresence mode="wait">
          {activeSlide === 0 ? (
            <motion.div
              key="active-slide-0"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              style={{ width: '100%', height: '100%' }}
            >
              <MusicLyricsSlide />
            </motion.div>
          ) : activeSlide === 1 ? (
            <motion.div
              key="active-slide-1"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              style={{ width: '100%', height: '100%' }}
            >
              <PomodoroSlide />
            </motion.div>
          ) : activeSlide === 2 ? (
            <motion.div
              key="active-slide-2"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              style={{ width: '100%', height: '100%' }}
            >
              <WaterSlide />
            </motion.div>
          ) : activeSlide === 3 ? (
            <motion.div
              key="active-slide-3"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              style={{ width: '100%', height: '100%' }}
            >
              <ShelfSlide onDropJellyBounce={onDropJellyBounce} />
            </motion.div>
          ) : activeSlide === 4 ? (
            <motion.div
              key="active-slide-4"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              style={{ width: '100%', height: '100%' }}
            >
              <TodoSlide />
            </motion.div>
          ) : (
            <motion.div
              key={`active-slide-${activeSlide}`}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              style={{ width: '100%', height: '100%' }}
            >
              <SlidePlaceholder index={activeSlide} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ==================================================================== */}
      {/* 3. Floating Left / Right Navigation Chevrons & Bottom Pagination Dots */}
      {/* ==================================================================== */}
      <button
        type="button"
        onClick={handlePrevSlide}
        className="carousel-nav-btn carousel-nav-prev"
        title="Previous (<)"
      >
        <ChevronLeft size={13} strokeWidth={1.75} />
      </button>

      <button
        type="button"
        onClick={handleNextSlide}
        className="carousel-nav-btn carousel-nav-next"
        title="Next (>)"
      >
        <ChevronRight size={13} strokeWidth={1.75} />
      </button>

      {/* Bottom Center Pagination Dots */}
      <div className="carousel-pagination-bottom">
        <div className="pagination-track">
          {([0, 1, 2, 3, 4] as SlideIndex[]).map((idx) => {
            const isActive = activeSlide === idx;
            return (
              <span
                key={`page-dot-${idx}`}
                onClick={(e) => handleSelectSlide(idx, e)}
                className={`pagination-dot ${isActive ? 'active' : ''}`}
                title={`Slide ${idx + 1}: ${SLIDE_TITLES[idx]}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
