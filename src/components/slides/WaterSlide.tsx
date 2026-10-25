import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useSystemStore, systemStore } from '../../store/useSystemStore';
import { playWaterDrop, playToggleClick, playGlassPop } from '../../utils/sfx';
import { Droplet, Settings, RotateCcw, Check } from 'lucide-react';

export const WaterSlide: React.FC = () => {
  const intakeLiters = useSystemStore((s) => s.waterIntakeLiters ?? 1.5);
  const goalLiters = useSystemStore((s) => s.waterGoalLiters ?? 1.5);
  const reminderActive = useSystemStore((s) => s.waterReminderActive ?? true);
  const hourlyBars = useSystemStore(
    (s) => s.waterHourlyBars ?? [150, 200, 250, 300, 200, 150, 250, 0]
  );

  const [drinkRipple, setDrinkRipple] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  // Toggle water reminder notification
  const handleToggleReminder = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    playToggleClick();
    systemStore.toggleWaterReminder();
  }, []);

  // Drink water (+0.25 L = 250 ml)
  const handleDrink = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      playWaterDrop();
      setDrinkRipple(true);
      setTimeout(() => setDrinkRipple(false), 500);
      systemStore.addWaterIntake(0.25);
    },
    []
  );

  // Cycle Goal Settings (1.5L -> 2.0L -> 2.5L)
  const handleCycleGoal = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    playToggleClick();
    systemStore.cycleWaterGoal();
  }, []);

  // Reset daily water intake
  const handleResetIntake = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    playGlassPop();
    systemStore.resetWaterIntake();
    setShowSettingsMenu(false);
  }, []);

  // Calculate percentage and status subtitle
  const percentage = Math.round((intakeLiters / (goalLiters || 1.5)) * 100);
  const statusSubtitle =
    percentage >= 100 ? `${percentage}% • Goal reached` : `${percentage}% • Keep hydrating`;

  // 8-Bar Hourly Chart Configurations
  // Maximum capacity per bar: 400 ml
  const MAX_BAR_HEIGHT = 52; // pixels

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
        gap: '12px',
      }}
    >
      {/* ==================================================================== */}
      {/* 1. Left Column: Readout, Reminder Toggle, Subtitle & Buttons         */}
      {/* ==================================================================== */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '185px',
          height: '100%',
          flexShrink: 0,
        }}
      >
        {/* Top Row: Volume Readout ("1.5 / 1.5 L") + Blue Toggle Switch */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          {/* Bold Volume Readout */}
          <div
            style={{
              fontVariantNumeric: 'tabular-nums',
              fontSize: '19px',
              fontWeight: 700,
              letterSpacing: '-0.4px',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'baseline',
              gap: '2px',
            }}
          >
            <span>{intakeLiters.toFixed(1)}</span>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 2px' }}>
              /
            </span>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              {goalLiters.toFixed(1)} L
            </span>
          </div>

          {/* Interactive Blue Toggle Switch (#3b82f6) */}
          <div
            onClick={handleToggleReminder}
            title={`Hourly Hydration Reminders (${reminderActive ? 'Active' : 'Disabled'})`}
            style={{
              width: '32px',
              height: '18px',
              borderRadius: '9999px',
              background: reminderActive ? '#3b82f6' : 'rgba(255, 255, 255, 0.12)',
              border: '1px solid',
              borderColor: reminderActive ? '#2563eb' : 'var(--glass-border)',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background-color 0.2s ease, border-color 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              padding: '1.5px',
            }}
          >
            <motion.div
              animate={{ x: reminderActive ? 14 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              style={{
                width: '13px',
                height: '13px',
                borderRadius: '50%',
                background: '#ffffff',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.35)',
              }}
            />
          </div>
        </div>

        {/* Middle Subtitle: "100% • Goal reached" */}
        <div
          style={{
            fontSize: '11px',
            fontWeight: 500,
            color: percentage >= 100 ? '#38bdf8' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            marginTop: '-2px',
          }}
        >
          {percentage >= 100 && <Check size={11} style={{ color: '#38bdf8' }} />}
          <span>{statusSubtitle}</span>
        </div>

        {/* Bottom Action Buttons: "💧 Drink" and "⚙ Settings" */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
          }}
        >
          {/* Drink Pill Button (+0.25 L) */}
          <motion.button
            type="button"
            onClick={handleDrink}
            whileTap={{ scale: 0.94 }}
            title="Log Drink (+0.25 L / 250 ml)"
            style={{
              flex: 1,
              height: '27px',
              borderRadius: '9999px',
              background: 'rgba(59, 130, 246, 0.16)',
              border: '1px solid rgba(59, 130, 246, 0.35)',
              color: '#60a5fa',
              fontSize: '10.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              transition: 'all 0.15s ease',
              outline: 'none',
              padding: '0 8px',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.24)';
              e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.55)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.16)';
              e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.35)';
            }}
          >
            {drinkRipple && (
              <motion.span
                initial={{ scale: 0, opacity: 0.6 }}
                animate={{ scale: 2.5, opacity: 0 }}
                transition={{ duration: 0.5 }}
                style={{
                  position: 'absolute',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'rgba(96, 165, 250, 0.4)',
                  pointerEvents: 'none',
                }}
              />
            )}
            <Droplet size={11} fill="#60a5fa" strokeWidth={0} />
            <span>Drink</span>
          </motion.button>

          {/* Settings Pill Button */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowSettingsMenu((prev) => !prev)}
              title="Hydration Settings (Cycle Daily Goal / Reset)"
              style={{
                height: '27px',
                borderRadius: '9999px',
                background: showSettingsMenu ? 'rgba(255, 255, 255, 0.14)' : 'var(--pill-bg)',
                border: '1px solid',
                borderColor: showSettingsMenu ? 'rgba(255, 255, 255, 0.3)' : 'var(--glass-border)',
                color: showSettingsMenu ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: '10.5px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                transition: 'all 0.15s ease',
                outline: 'none',
                padding: '0 10px',
              }}
            >
              <Settings size={11} />
              <span>Settings</span>
            </button>

            {/* Settings Quick Popover */}
            {showSettingsMenu && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '33px',
                  left: 0,
                  width: '136px',
                  borderRadius: '10px',
                  background: 'var(--island-bg)',
                  backgroundImage: 'var(--glass-surface)',
                  border: '1px solid var(--glass-border)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
                  backdropFilter: 'blur(16px)',
                  padding: '5px',
                  zIndex: 30,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px',
                }}
              >
                {/* Goal Switcher Option */}
                <button
                  type="button"
                  onClick={handleCycleGoal}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '10px',
                    fontWeight: 500,
                    padding: '4px 6px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span>Goal:</span>
                  <span style={{ fontWeight: 700, color: '#38bdf8' }}>{goalLiters.toFixed(1)} L</span>
                </button>

                {/* Reset Intake Option */}
                <button
                  type="button"
                  onClick={handleResetIntake}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#f87171',
                    fontSize: '10px',
                    fontWeight: 500,
                    padding: '4px 6px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <RotateCcw size={9} />
                  <span>Reset Intake</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. Right Column: 8-Bar Hourly Chart with Staggered Spring Animation  */}
      {/* ==================================================================== */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flex: 1,
          height: '100%',
          minWidth: 0,
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '8px 10px 6px 12px',
          boxSizing: 'border-box',
        }}
      >
        {/* Main Chart Graphic: 8 Vertical Bars + X-Axis Labels */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '100%',
            flex: 1,
          }}
        >
          {/* Vertical Bars Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              height: `${MAX_BAR_HEIGHT}px`,
              padding: '0 4px',
            }}
          >
            {hourlyBars.map((intakeMl, index) => {
              const clampedMl = Math.max(0, Math.min(400, intakeMl));
              const barHeight = Math.max(4, Math.round((clampedMl / 400) * MAX_BAR_HEIGHT));

              return (
                <div
                  key={`water-slot-${index}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    height: `${MAX_BAR_HEIGHT}px`,
                    width: '6px',
                  }}
                  title={`Hour ${index + 8}:00 - ${clampedMl} ml`}
                >
                  {/* Background Track Slot */}
                  <div
                    style={{
                      width: '6px',
                      height: `${MAX_BAR_HEIGHT}px`,
                      background: 'rgba(255, 255, 255, 0.04)',
                      borderRadius: '3px',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'flex-end',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Animated Blue Gradient Bar with Staggered Spring Entry */}
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: `${barHeight}px`, opacity: 1 }}
                      transition={{
                        type: 'spring',
                        stiffness: 340,
                        damping: 22,
                        delay: index * 0.035,
                      }}
                      style={{
                        width: '100%',
                        borderRadius: '3px',
                        background: 'linear-gradient(180deg, #60a5fa 0%, #2563eb 100%)',
                        boxShadow: clampedMl > 200 ? '0 0 8px rgba(96, 165, 250, 0.35)' : 'none',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* X-Axis Hour Labels (09, 12, 15) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 4px',
              fontSize: '8.5px',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <span>09</span>
            <span>12</span>
            <span>15</span>
          </div>
        </div>

        {/* Right Y-Axis Scale Markers (400 ml, 200 ml, 0 ml) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            height: `${MAX_BAR_HEIGHT}px`,
            paddingLeft: '8px',
            fontSize: '7.5px',
            fontWeight: 500,
            color: 'var(--text-secondary)',
            fontVariantNumeric: 'tabular-nums',
            userSelect: 'none',
          }}
        >
          <span>400 ml</span>
          <span>200 ml</span>
          <span>0 ml</span>
        </div>
      </div>
    </div>
  );
};
