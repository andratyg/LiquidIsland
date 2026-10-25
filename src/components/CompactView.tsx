import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStore, systemStore } from '../store/useSystemStore';
import { playToggleClick, playGlassPop } from '../utils/sfx';
import { Calendar, Clock, ArrowDown, Sparkles, CheckCircle2, Search } from 'lucide-react';

export const CompactView: React.FC = () => {
  const isAudioPlaying = useSystemStore((s) => s.isAudioPlaying);
  const volume = useSystemStore((s) => s.volume);

  // Readout display modes: 'clock' | 'network'
  const [readoutMode, setReadoutMode] = useState<'clock' | 'network'>('clock');
  const [showCalendar, setShowCalendar] = useState<boolean>(false);

  // Live real-time clock
  const [timeStr, setTimeStr] = useState<string>(() => {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  });

  // Simulated dynamic live network speed
  const [netSpeed, setNetSpeed] = useState<string>('4.8 MB/s');

  useEffect(() => {
    const clockTimer = setInterval(() => {
      const d = new Date();
      setTimeStr(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    }, 5000);

    const netTimer = setInterval(() => {
      // Dynamic network throughput simulation (~2.4 - 6.8 MB/s)
      const base = 4.2 + (Math.sin(Date.now() / 3000) * 1.6) + (Math.random() * 0.4 - 0.2);
      setNetSpeed(`${Math.max(1.2, base).toFixed(1)} MB/s`);
    }, 2400);

    return () => {
      clearInterval(clockTimer);
      clearInterval(netTimer);
    };
  }, []);

  // Today's date formatting for the Smart Calendar Schedule Pill
  const formattedDate = useMemo(() => {
    const now = new Date();
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(now);
  }, []);

  // Handle center readout single click: Toggle between Clock and Network Speed
  const handleReadoutClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    playToggleClick();
    setReadoutMode((prev) => (prev === 'clock' ? 'network' : 'clock'));
  }, []);

  // Handle right-click (contextmenu) or double-click: Open Smart Calendar Schedule Pill
  const handleOpenCalendar = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    playGlassPop();
    setShowCalendar((prev) => !prev);
  }, []);

  // Toggle audio playback visualizer
  const handleToggleAudio = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    playToggleClick();
    systemStore.toggleAudioPlaying();
  }, []);

  // Progress offset calculation: circumference = 2 * PI * 6.5 ≈ 40.84
  const circumference = 40.84;
  const progressPercent = Math.max(0.15, Math.min(1, volume / 100));
  const strokeDashoffset = circumference - circumference * progressPercent;

  // Expand into ExpandedContainer on background pill click
  const handleExpandIsland = useCallback(() => {
    playGlassPop();
    systemStore.setIslandState('expanded');
  }, []);

  return (
    <div
      onClick={handleExpandIsland}
      onDoubleClick={(e) => {
        e.stopPropagation();
        handleExpandIsland();
      }}
      title="Compact Island View - Click or Double-Click to Expand Dashboard"
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
        padding: '0 13px',
        userSelect: 'none',
        cursor: 'pointer',
      }}
    >
      {/* ==================================================================== */}
      {/* 1. Left Indicator: 17x17px Circular Progress Ring                    */}
      {/* ==================================================================== */}
      <div
        title={`Status Ring (Volume / Energy: ${volume}%) - Click to Expand Dashboard`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '17px',
          height: '17px',
          flexShrink: 0,
          cursor: 'pointer',
        }}
        onClick={(e) => {
          e.stopPropagation();
          handleExpandIsland();
        }}
      >
        <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
          {/* Background circular track */}
          <circle
            cx="8.5"
            cy="8.5"
            r="6.5"
            stroke="rgba(34, 197, 94, 0.22)"
            strokeWidth="2"
            fill="none"
          />
          {/* Active green progress arc */}
          <circle
            cx="8.5"
            cy="8.5"
            r="6.5"
            stroke="#22c55e"
            strokeWidth="2"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 8.5 8.5)"
            style={{
              transition: 'stroke-dashoffset 0.3s ease',
            }}
          />
          {/* Center glowing jewel dot */}
          <circle cx="8.5" cy="8.5" r="2.2" fill="#22c55e" />
        </svg>
      </div>

      {/* ==================================================================== */}
      {/* 2. Center Interactive Readout (Clock / Network / Calendar)           */}
      {/* ==================================================================== */}
      <motion.button
        type="button"
        onClick={handleReadoutClick}
        onContextMenu={handleOpenCalendar}
        onDoubleClick={handleOpenCalendar}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="Click: Toggle Clock / Network Speed | Right-Click / 2x-Click: Calendar Pill"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '5px',
          background: 'transparent',
          border: 'none',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          padding: '2px 8px',
          borderRadius: '8px',
          outline: 'none',
        }}
      >
        <AnimatePresence mode="wait">
          {readoutMode === 'clock' ? (
            <motion.div
              key="clock-view"
              initial={{ opacity: 0, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 3 }}
              transition={{ duration: 0.14 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '12.5px',
                fontWeight: 600,
                letterSpacing: '0.4px',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <Clock size={11} style={{ color: 'var(--text-secondary)' }} />
              <span>{timeStr}</span>
            </motion.div>
          ) : (
            <motion.div
              key="net-view"
              initial={{ opacity: 0, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 3 }}
              transition={{ duration: 0.14 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#38bdf8',
                letterSpacing: '0.2px',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <ArrowDown size={11} style={{ color: '#38bdf8' }} />
              <span>{netSpeed}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {/* Spotlight Search Trigger (Alt + Space) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            playGlassPop();
            systemStore.toggleSpotlight();
          }}
          title="Spotlight Search & Clipboard (Alt + Space)"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1px',
            opacity: 0.7,
            transition: 'opacity 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
        >
          <Search size={11} />
        </button>

        {/* ==================================================================== */}
        {/* 3. Right Audio Visualizer: 5 Rounded Waveform Bars                   */}
        {/* ==================================================================== */}
        <div
          title={`Audio Visualizer (${isAudioPlaying ? 'Playing' : 'Paused'}) - Click to Toggle`}
          onClick={handleToggleAudio}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2px',
            height: '18px',
            width: '20px',
            cursor: 'pointer',
            padding: '0 2px',
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

      {/* ==================================================================== */}
      {/* Smart Calendar & Upcoming Schedule Pill (Floating Popover)          */}
      {/* ==================================================================== */}
      <AnimatePresence>
        {showCalendar && (
          <motion.div
            key="calendar-popover"
            className="calendar-pill-popover"
            initial={{ opacity: 0, y: -6, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Popover Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--glass-border)',
                paddingBottom: '4px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Calendar size={12} style={{ color: '#3b82f6' }} />
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: '10.5px',
                    color: 'var(--text-primary)',
                  }}
                >
                  {formattedDate}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowCalendar(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '9px',
                }}
              >
                ✕
              </button>
            </div>

            {/* Upcoming Schedule Items */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                marginTop: '2px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '10px',
                  color: 'var(--text-primary)',
                }}
              >
                <Sparkles size={11} style={{ color: '#f59e0b', flexShrink: 0 }} />
                <span style={{ fontWeight: 600 }}>10:30 AM</span>
                <span style={{ color: 'var(--text-secondary)' }}>• Team Sync</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '10px',
                  color: 'var(--text-primary)',
                }}
              >
                <CheckCircle2 size={11} style={{ color: '#10b981', flexShrink: 0 }} />
                <span style={{ fontWeight: 600 }}>02:00 PM</span>
                <span style={{ color: 'var(--text-secondary)' }}>• Deep Work Sprint</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
