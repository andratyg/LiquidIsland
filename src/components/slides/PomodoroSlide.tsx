import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useSystemStore, systemStore } from '../../store/useSystemStore';
import { playToggleClick, playGlassPop } from '../../utils/sfx';
import {
  setAmbientMode,
  cycleAmbientMode,
  stopAmbientSound,
  AmbientSoundMode
} from '../../utils/ambientAudio';
import { RotateCcw, Play, Pause, Flame, Sparkles } from 'lucide-react';

const FOCUS_DURATION = 25 * 60; // 25 minutes (1500s)
const BREAK_DURATION = 5 * 60;  // 5 minutes (300s)

export const PomodoroSlide: React.FC = () => {
  const isPomodoroRunning = useSystemStore((s) => s.isPomodoroRunning);
  const enableOptionalLofi = useSystemStore((s) => s.enableOptionalLofi);
  const lofiSound = useSystemStore((s) => s.lofiAmbientSound ?? 'off');

  // Mode: 'focus' (25:00) or 'break' (05:00)
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [secondsLeft, setSecondsLeft] = useState<number>(FOCUS_DURATION);
  const [totalSeconds, setTotalSeconds] = useState<number>(FOCUS_DURATION);

  // High-precision drift-free timestamp delta references
  const targetEndTimeRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Synchronize target time whenever timer is running
  const startTimer = useCallback(() => {
    playToggleClick();
    const targetEnd = Date.now() + secondsLeft * 1000;
    targetEndTimeRef.current = targetEnd;
    systemStore.setIsPomodoroRunning(true);
    systemStore.setPomodoroActive(true);

    // If lofi ambient was chosen, start ambient soundscape
    if (enableOptionalLofi && lofiSound !== 'off') {
      setAmbientMode(lofiSound as AmbientSoundMode);
    }
  }, [secondsLeft, enableOptionalLofi, lofiSound]);

  const pauseTimer = useCallback(() => {
    playToggleClick();
    if (targetEndTimeRef.current) {
      const remaining = Math.max(0, Math.ceil((targetEndTimeRef.current - Date.now()) / 1000));
      setSecondsLeft(remaining);
      targetEndTimeRef.current = null;
    }
    systemStore.setIsPomodoroRunning(false);
    systemStore.setPomodoroActive(false);

    // Stop ambient audio when paused
    stopAmbientSound();
  }, []);

  const resetTimer = useCallback(() => {
    playGlassPop();
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    targetEndTimeRef.current = null;
    const initialSeconds = mode === 'focus' ? FOCUS_DURATION : BREAK_DURATION;
    setSecondsLeft(initialSeconds);
    setTotalSeconds(initialSeconds);
    systemStore.setIsPomodoroRunning(false);
    systemStore.setPomodoroActive(false);

    // Stop ambient audio
    stopAmbientSound();
  }, [mode]);

  const switchMode = useCallback((newMode: 'focus' | 'break') => {
    if (newMode === mode) return;
    playToggleClick();
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    targetEndTimeRef.current = null;
    const initialSeconds = newMode === 'focus' ? FOCUS_DURATION : BREAK_DURATION;
    setMode(newMode);
    setTotalSeconds(initialSeconds);
    setSecondsLeft(initialSeconds);
    systemStore.setIsPomodoroRunning(false);
    systemStore.setPomodoroActive(false);
    stopAmbientSound();
  }, [mode]);

  // High-precision interval check loop (runs every 150ms to ensure zero drift)
  useEffect(() => {
    if (isPomodoroRunning) {
      if (!targetEndTimeRef.current) {
        targetEndTimeRef.current = Date.now() + secondsLeft * 1000;
      }

      timerIntervalRef.current = setInterval(() => {
        if (!targetEndTimeRef.current) return;
        const now = Date.now();
        const diffMs = targetEndTimeRef.current - now;

        if (diffMs <= 0) {
          // Timer finished
          setSecondsLeft(0);
          targetEndTimeRef.current = null;
          systemStore.setIsPomodoroRunning(false);
          systemStore.setPomodoroActive(false);
          playGlassPop();
          stopAmbientSound();

          // Auto-switch to next cycle
          if (mode === 'focus') {
            setMode('break');
            setTotalSeconds(BREAK_DURATION);
            setSecondsLeft(BREAK_DURATION);
          } else {
            setMode('focus');
            setTotalSeconds(FOCUS_DURATION);
            setSecondsLeft(FOCUS_DURATION);
          }
        } else {
          setSecondsLeft(Math.ceil(diffMs / 1000));
        }
      }, 150);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isPomodoroRunning, mode]);

  // Teardown on unmount: stop ambient sound
  useEffect(() => {
    return () => {
      stopAmbientSound();
    };
  }, []);

  // Cycle Lofi focus soundscape
  const handleCycleLofi = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    playToggleClick();
    const next = cycleAmbientMode();
    systemStore.setLofiAmbientSound(next);
  }, []);

  // Format countdown string: "25:00" or "05:00"
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeDisplay = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Stopwatch Circular Progress Calculation (Perimeter ≈ 163.36px for r=26)
  const ringRadius = 26;
  const ringCircumference = 2 * Math.PI * ringRadius; // ~163.36
  const progressRatio = totalSeconds > 0 ? Math.max(0, Math.min(1, secondsLeft / totalSeconds)) : 0;
  const strokeDashoffset = ringCircumference - ringCircumference * progressRatio;

  // Lofi Badge Label
  const lofiLabel =
    lofiSound === 'rain'
      ? '🌧️ Rain'
      : lofiSound === 'lofi-pad'
      ? '🎹 Pad'
      : lofiSound === 'white-noise'
      ? '🌊 Noise'
      : 'Off';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
        position: 'relative',
        boxSizing: 'border-box',
        padding: '0 4px',
        gap: '14px',
      }}
    >
      {/* ==================================================================== */}
      {/* 1. Left Graphic: 72x72px Glowing Red Stopwatch Ring with Crown       */}
      {/* ==================================================================== */}
      <div
        style={{
          width: '72px',
          height: '72px',
          minWidth: '72px',
          borderRadius: '16px',
          background: 'rgba(239, 68, 68, 0.05)',
          border: '1px solid rgba(239, 68, 68, 0.16)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: isPomodoroRunning
            ? '0 0 16px rgba(239, 68, 68, 0.22), inset 0 0 12px rgba(239, 68, 68, 0.08)'
            : '0 4px 12px rgba(0, 0, 0, 0.2)',
          transition: 'box-shadow 0.3s ease',
        }}
        title={`Pomodoro Stopwatch (${isPomodoroRunning ? 'Running' : 'Paused'})`}
      >
        <svg
          width="72"
          height="72"
          viewBox="0 0 72 72"
          fill="none"
          style={{
            filter: 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.42))',
          }}
        >
          {/* Top Stopwatch Mechanical Crown & Winder Button */}
          <rect x="33" y="1" width="6" height="3" rx="1" fill="#ef4444" />
          <rect x="34.5" y="4" width="3" height="3.5" fill="#ef4444" opacity="0.8" />

          {/* Left Lap Trigger Button (Angled at 10 o'clock) */}
          <rect
            x="17"
            y="7.5"
            width="5"
            height="2.5"
            rx="1"
            fill="rgba(239, 68, 68, 0.7)"
            transform="rotate(-36 19.5 8.75)"
          />

          {/* Right Lap Trigger Button (Angled at 2 o'clock) */}
          <rect
            x="50"
            y="7.5"
            width="5"
            height="2.5"
            rx="1"
            fill="rgba(239, 68, 68, 0.7)"
            transform="rotate(36 52.5 8.75)"
          />

          {/* Background Circular Ring Track */}
          <circle
            cx="36"
            cy="40"
            r={ringRadius}
            stroke="rgba(239, 68, 68, 0.16)"
            strokeWidth="4.2"
            fill="none"
          />

          {/* Dynamic Active Glowing Red Ring */}
          <circle
            cx="36"
            cy="40"
            r={ringRadius}
            stroke="#ef4444"
            strokeWidth="4.2"
            fill="none"
            strokeDasharray={ringCircumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 36 40)"
            style={{
              transition: isPomodoroRunning ? 'stroke-dashoffset 0.25s linear' : 'stroke-dashoffset 0.35s ease',
            }}
          />

          {/* Perimeter Index Marks (12, 3, 6, 9 o'clock) */}
          <line x1="36" y1="16" x2="36" y2="18.5" stroke="#ef4444" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
          <line x1="60" y1="40" x2="57.5" y2="40" stroke="#ef4444" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
          <line x1="36" y1="64" x2="36" y2="61.5" stroke="#ef4444" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
          <line x1="12" y1="40" x2="14.5" y2="40" stroke="#ef4444" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
        </svg>

        {/* Center Minimalist Glyph: Flame or Stopwatch Needle */}
        <div
          style={{
            position: 'absolute',
            top: 'calc(50% + 4px)',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          {isPomodoroRunning ? (
            <motion.div
              animate={{ scale: [1, 1.14, 1], opacity: [0.85, 1, 0.85] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
            >
              <Flame size={17} style={{ color: '#ef4444', filter: 'drop-shadow(0 0 6px #ef4444)' }} />
            </motion.div>
          ) : (
            <Flame size={16} style={{ color: 'rgba(239, 68, 68, 0.5)' }} />
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. Right Controls & Tabular Readout Column                           */}
      {/* ==================================================================== */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          flex: 1,
          height: '100%',
          minWidth: 0,
        }}
      >
        {/* Top Row: Reset Button (↺), Large Tabular Countdown, and Focus Streak Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          {/* Left: Reset Button (↺) */}
          <button
            type="button"
            onClick={resetTimer}
            title="Reset Pomodoro Timer (↺)"
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: 'var(--pill-bg)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
              outline: 'none',
              padding: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ef4444';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
              e.currentTarget.style.transform = 'rotate(-45deg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.borderColor = 'var(--glass-border)';
              e.currentTarget.style.transform = 'rotate(0deg)';
            }}
          >
            <RotateCcw size={12} />
          </button>

          {/* Center: Large Tabular Countdown Display */}
          <div
            style={{
              fontVariantNumeric: 'tabular-nums',
              fontSize: '22px',
              fontWeight: 700,
              letterSpacing: '-0.4px',
              color: 'var(--text-primary)',
              textShadow: isPomodoroRunning ? '0 0 10px rgba(239, 68, 68, 0.35)' : 'none',
            }}
          >
            {timeDisplay}
          </div>

          {/* Right: Daily Focus Streak Pill */}
          <div
            title="Today's Total Focus Streak"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2.5px 8px',
              borderRadius: '9999px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.28)',
              color: '#fca5a5',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.2px',
              userSelect: 'none',
            }}
          >
            <Flame size={10} style={{ color: '#ef4444' }} />
            <span>2h 05m</span>
          </div>
        </div>

        {/* Middle/Sub-Row: Optional Lofi Mixer Badge (when enabled) */}
        {enableOptionalLofi && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              width: '100%',
              margin: '-2px 0',
            }}
          >
            <button
              type="button"
              onClick={handleCycleLofi}
              title="Optional Lofi Focus Mixer - Click to cycle soundscape (Rain / Lofi Pad / White Noise / Off)"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 7px',
                borderRadius: '6px',
                background: lofiSound !== 'off' ? 'rgba(59, 130, 246, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                border: '1px solid',
                borderColor: lofiSound !== 'off' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255, 255, 255, 0.08)',
                color: lofiSound !== 'off' ? '#93c5fd' : 'var(--text-secondary)',
                fontSize: '9px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                outline: 'none',
              }}
            >
              <Sparkles size={8} style={{ color: lofiSound !== 'off' ? '#60a5fa' : 'inherit' }} />
              <span>Lofi: {lofiLabel}</span>
            </button>
          </div>
        )}

        {/* Bottom Row: "Short Break" Pill, Circular Play/Pause (▶/⏸), and "Focus Time" Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            gap: '8px',
          }}
        >
          {/* "Short Break" Pill Button */}
          <button
            type="button"
            onClick={() => switchMode('break')}
            title="Switch to 5-minute Short Break"
            style={{
              flex: 1,
              height: '27px',
              borderRadius: '9999px',
              border: '1px solid',
              borderColor: mode === 'break' ? 'rgba(239, 68, 68, 0.45)' : 'var(--glass-border)',
              background: mode === 'break' ? 'rgba(239, 68, 68, 0.16)' : 'var(--pill-bg)',
              color: mode === 'break' ? '#fca5a5' : 'var(--text-secondary)',
              fontSize: '10.5px',
              fontWeight: mode === 'break' ? 700 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
              outline: 'none',
              padding: '0 8px',
            }}
          >
            Short Break
          </button>

          {/* Primary Circular Play/Pause Button (▶ / ⏸) */}
          <button
            type="button"
            onClick={isPomodoroRunning ? pauseTimer : startTimer}
            title={isPomodoroRunning ? 'Pause Focus Timer (⏸)' : 'Start Focus Timer (▶)'}
            style={{
              width: '32px',
              height: '32px',
              minWidth: '32px',
              borderRadius: '50%',
              background: '#ef4444',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 14px rgba(239, 68, 68, 0.45)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              outline: 'none',
              padding: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.08)';
              e.currentTarget.style.boxShadow = '0 0 18px rgba(239, 68, 68, 0.65)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 0 14px rgba(239, 68, 68, 0.45)';
            }}
          >
            {isPomodoroRunning ? (
              <Pause size={13} fill="#ffffff" strokeWidth={0} />
            ) : (
              <Play size={13} fill="#ffffff" strokeWidth={0} style={{ marginLeft: '1.5px' }} />
            )}
          </button>

          {/* "Focus Time" Pill Button */}
          <button
            type="button"
            onClick={() => switchMode('focus')}
            title="Switch to 25-minute Focus Time"
            style={{
              flex: 1,
              height: '27px',
              borderRadius: '9999px',
              border: '1px solid',
              borderColor: mode === 'focus' ? 'rgba(239, 68, 68, 0.45)' : 'var(--glass-border)',
              background: mode === 'focus' ? 'rgba(239, 68, 68, 0.16)' : 'var(--pill-bg)',
              color: mode === 'focus' ? '#fca5a5' : 'var(--text-secondary)',
              fontSize: '10.5px',
              fontWeight: mode === 'focus' ? 700 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
              outline: 'none',
              padding: '0 8px',
            }}
          >
            Focus Time
          </button>
        </div>
      </div>
    </div>
  );
};
