import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStore, systemStore } from '../store/useSystemStore';
import { playToggleClick, playGlassPop } from '../utils/sfx';
import {
  Bell,
  BellOff,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Scissors,
  Sparkles,
} from 'lucide-react';
import { SystemNotificationItem } from '../types/liquid';

interface NotificationCalendarHubProps {
  onClose: () => void;
  onOpenSettings?: () => void;
}

// Calendar matrix computation helper
interface CalendarDay {
  key: string;
  day: number;
  isCurrentMonth: boolean;
  dateObj: Date;
}

function getCalendarMatrix(year: number, month: number): CalendarDay[] {
  const firstDay = new Date(year, month, 1);
  const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days: CalendarDay[] = [];

  // Previous month trailing days
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    days.push({
      key: `prev-${dayNum}`,
      day: dayNum,
      isCurrentMonth: false,
      dateObj: new Date(year, month - 1, dayNum),
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      key: `curr-${i}`,
      day: i,
      isCurrentMonth: true,
      dateObj: new Date(year, month, i),
    });
  }

  // Next month leading days (fill up to 35 or 42 cells)
  const remaining = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    days.push({
      key: `next-${i}`,
      day: i,
      isCurrentMonth: false,
      dateObj: new Date(year, month + 1, i),
    });
  }

  return days;
}

export const NotificationCalendarHub: React.FC<NotificationCalendarHubProps> = ({
  onClose,
  onOpenSettings,
}) => {
  const doNotDisturb = useSystemStore((s) => s.doNotDisturb ?? false);
  const notifications = useSystemStore((s) => s.notifications ?? []);
  const isPomodoroRunning = useSystemStore((s) => s.isPomodoroRunning);
  const pomodoroSecondsLeft = useSystemStore((s) => s.pomodoroSecondsLeft ?? 25 * 60);

  // Calendar State
  const [calendarMonthOffset, setCalendarMonthOffset] = useState<number>(0);
  const [isCalendarCollapsed, setIsCalendarCollapsed] = useState<boolean>(false);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  // Focus Session Duration Adjustment State (in minutes, default 30)
  const [focusMinutes, setFocusMinutes] = useState<number>(30);

  // Date Calculations
  const today = useMemo(() => new Date(), []);
  const todayDay = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();

  // Formatted Top Date Header: e.g. "Sunday, 25 October"
  const fullDateStr = useMemo(() => {
    return today.toLocaleDateString([], {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }, [today]);

  const displayedDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + calendarMonthOffset);
    return d;
  }, [calendarMonthOffset]);

  const currentYear = displayedDate.getFullYear();
  const currentMonth = displayedDate.getMonth();
  const monthName = displayedDate.toLocaleDateString([], { month: 'long', year: 'numeric' });
  const isViewingCurrentMonth =
    todayYear === currentYear && todayMonth === currentMonth;

  const calendarMatrix = useMemo(() => {
    return getCalendarMatrix(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  // Format Focus Countdown (MM:SS)
  const formatCountdown = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Adjust Focus Duration (-5m, +5m)
  const handleDecrementFocus = (e: React.MouseEvent) => {
    e.stopPropagation();
    playToggleClick();
    setFocusMinutes((prev) => Math.max(5, prev - 5));
  };

  const handleIncrementFocus = (e: React.MouseEvent) => {
    e.stopPropagation();
    playToggleClick();
    setFocusMinutes((prev) => Math.min(120, prev + 5));
  };

  // Start Focus Session
  const handleStartFocus = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPomodoroRunning) {
      playToggleClick();
      systemStore.setIsPomodoroRunning(false);
      systemStore.setPomodoroActive(false);
    } else {
      systemStore.startFocusSession(focusMinutes);
    }
  };

  // Notification item click handler
  const handleNotificationClick = (item: SystemNotificationItem) => {
    playGlassPop();
    if (item.actionType === 'shelf' || item.appName.toLowerCase().includes('snip')) {
      // Expand Dynamic Island into Quick Shelf (Slide 3)
      systemStore.setIslandState('expanded');
      systemStore.setActiveSlide(3);
      onClose();
    } else if (item.actionType === 'settings') {
      onOpenSettings?.();
      onClose();
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '356px',
        userSelect: 'none',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* ================================================================== */}
      {/* TOP CARD: LIQUID NOTIFICATION CENTER                               */}
      {/* ================================================================== */}
      <motion.div
        key="top-notification-card"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 14 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: '100%',
          borderRadius: '26px',
          background: 'rgba(10, 10, 14, 0.90)',
          backdropFilter: 'blur(40px) saturate(190%)',
          WebkitBackdropFilter: 'blur(40px) saturate(190%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow:
            '0 20px 48px -6px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.18)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          maxHeight: '320px',
          overflow: 'hidden',
        }}
      >
        {/* Header: Title + Unread Badge + DND Bell + Clear All */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Left Title + Unread Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: '#ffffff',
                letterSpacing: '-0.3px',
              }}
            >
              Notifications
            </span>
            {notifications.length > 0 && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '1.5px 6.5px',
                  borderRadius: '10px',
                  background: 'rgba(56, 189, 248, 0.2)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                }}
              >
                {notifications.length}
              </span>
            )}
          </div>

          {/* Right: Do Not Disturb Bell Toggle + Clear All Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* Do Not Disturb Toggle Button */}
            <button
              type="button"
              onClick={() => systemStore.toggleDoNotDisturb()}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: doNotDisturb
                  ? 'linear-gradient(135deg, #38bdf8, #0284c7)'
                  : 'rgba(255, 255, 255, 0.06)',
                border: doNotDisturb
                  ? '1px solid #38bdf8'
                  : '1px solid rgba(255, 255, 255, 0.1)',
                color: doNotDisturb ? '#ffffff' : '#94a3b8',
                cursor: 'pointer',
                outline: 'none',
                boxShadow: doNotDisturb ? '0 0 16px rgba(56, 189, 248, 0.6)' : 'none',
                transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                position: 'relative',
              }}
              title={doNotDisturb ? 'Do Not Disturb is On' : 'Turn On Do Not Disturb'}
            >
              {doNotDisturb ? (
                <BellOff size={15} strokeWidth={2.2} />
              ) : (
                <Bell size={15} strokeWidth={2} />
              )}
            </button>

            {/* Clear all button */}
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={() => systemStore.clearAllNotifications()}
                style={{
                  padding: '5px 10px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#94a3b8',
                  fontSize: '11px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Do Not Disturb Active Banner */}
        <AnimatePresence>
          {doNotDisturb && (
            <motion.div
              key="dnd-banner"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              style={{
                borderRadius: '14px',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                padding: '9px 12px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '7px',
                  background: 'rgba(56, 189, 248, 0.22)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#38bdf8',
                  flexShrink: 0,
                  marginTop: '1px',
                }}
              >
                <BellOff size={13} strokeWidth={2.2} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#f0f9ff' }}>
                  Do not disturb is on
                </div>
                <div style={{ fontSize: '10.5px', color: '#93c5fd', lineHeight: 1.35 }}>
                  You'll only see banners for priority notifications and alarms.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onOpenSettings?.();
                    onClose();
                  }}
                  style={{
                    alignSelf: 'flex-start',
                    marginTop: '2px',
                    fontSize: '10.5px',
                    color: '#38bdf8',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Notification settings
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notification Feed List */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            overflowY: 'auto',
            maxHeight: '210px',
            paddingRight: '2px',
          }}
        >
          {notifications.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '28px 0',
                color: 'rgba(255, 255, 255, 0.35)',
                fontSize: '12px',
                gap: '6px',
              }}
            >
              <Bell size={20} opacity={0.3} />
              <span>No new notifications</span>
            </div>
          ) : (
            notifications.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => handleNotificationClick(item)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  borderRadius: '16px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '10px 12px',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                }}
              >
                {/* Notification Item Header: App Name + Time + Dismiss X */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {item.appName.toLowerCase().includes('snip') ? (
                      <Scissors size={12} color="#38bdf8" />
                    ) : (
                      <Sparkles size={12} color="#a855f7" />
                    )}
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'rgba(255, 255, 255, 0.7)',
                      }}
                    >
                      {item.appName}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)' }}>
                      {item.timestamp}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        systemStore.removeNotification(item.id);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'rgba(255, 255, 255, 0.4)',
                        cursor: 'pointer',
                        padding: '1px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Dismiss"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>

                {/* Body Content */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div
                      style={{
                        fontSize: '12.5px',
                        fontWeight: 600,
                        color: '#ffffff',
                        lineHeight: 1.3,
                      }}
                    >
                      {item.title}
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'rgba(255, 255, 255, 0.65)',
                        lineHeight: 1.35,
                      }}
                    >
                      {item.subtitle}
                    </div>
                  </div>

                  {/* Thumbnail Preview for Snipping Tool / Screenshot Notifications */}
                  {item.thumbnail && (
                    <img
                      src={item.thumbnail}
                      alt="Thumbnail Preview"
                      style={{
                        width: '54px',
                        height: '38px',
                        borderRadius: '8px',
                        objectFit: 'cover',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        flexShrink: 0,
                      }}
                    />
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>

      {/* ================================================================== */}
      {/* BOTTOM CARD: INTERACTIVE LIQUID CALENDAR & FOCUS LAUNCHER          */}
      {/* ================================================================== */}
      <motion.div
        key="bottom-calendar-card"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 18 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1], delay: 0.04 }}
        style={{
          width: '100%',
          marginTop: '10px',
          borderRadius: '26px',
          background: 'rgba(10, 10, 14, 0.90)',
          backdropFilter: 'blur(40px) saturate(190%)',
          WebkitBackdropFilter: 'blur(40px) saturate(190%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow:
            '0 24px 54px -8px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.18)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {/* Top Collapsible Date Header: "Sunday, 25 October" + [v] */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: isCalendarCollapsed ? '0px' : '4px',
          }}
        >
          <div
            style={{
              fontSize: '14.5px',
              fontWeight: 600,
              color: '#ffffff',
              letterSpacing: '-0.3px',
            }}
          >
            {fullDateStr}
          </div>

          <button
            type="button"
            onClick={() => {
              playToggleClick();
              setIsCalendarCollapsed((prev) => !prev);
            }}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              outline: 'none',
              transition: 'all 0.15s ease',
            }}
            title={isCalendarCollapsed ? 'Expand Calendar' : 'Collapse Calendar'}
          >
            {isCalendarCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>

        {/* Collapsible Calendar Body (Month Switcher + Matrix Grid) */}
        <AnimatePresence>
          {!isCalendarCollapsed && (
            <motion.div
              key="calendar-body-collapsible"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                overflow: 'hidden',
              }}
            >
              {/* Month Switcher Row: "October 2026" + Prev/Next Controls */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 2px',
                }}
              >
                <span
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 700,
                    color: '#f8fafc',
                    letterSpacing: '-0.2px',
                  }}
                >
                  {monthName}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  {calendarMonthOffset !== 0 && (
                    <button
                      type="button"
                      onClick={() => setCalendarMonthOffset(0)}
                      style={{
                        background: 'rgba(56, 189, 248, 0.18)',
                        border: '1px solid rgba(56, 189, 248, 0.35)',
                        borderRadius: '6px',
                        color: '#38bdf8',
                        fontSize: '9.5px',
                        fontWeight: 700,
                        padding: '2.5px 7px',
                        cursor: 'pointer',
                        marginRight: '2px',
                      }}
                    >
                      Today
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      playToggleClick();
                      setCalendarMonthOffset((c) => c - 1);
                    }}
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '7px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="Previous Month"
                  >
                    <ChevronLeft size={13} />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playToggleClick();
                      setCalendarMonthOffset((c) => c + 1);
                    }}
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '7px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="Next Month"
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>

              {/* Day-of-Week Column Headers: Su Mo Tu We Th Fr Sa */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  textAlign: 'center',
                  fontSize: '10px',
                  fontWeight: 600,
                  color: 'rgba(255, 255, 255, 0.4)',
                }}
              >
                <span>Su</span>
                <span>Mo</span>
                <span>Tu</span>
                <span>We</span>
                <span>Th</span>
                <span>Fr</span>
                <span>Sa</span>
              </div>

              {/* 7-Column Day Numbers Matrix */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: '3px',
                  textAlign: 'center',
                }}
              >
                {calendarMatrix.map((item) => {
                  const isToday =
                    isViewingCurrentMonth &&
                    item.isCurrentMonth &&
                    item.day === todayDay;
                  const isSelected = selectedDayKey === item.key;

                  return (
                    <div
                      key={item.key}
                      onClick={() => {
                        playToggleClick();
                        setSelectedDayKey(item.key);
                      }}
                      style={{
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: isToday ? 700 : isSelected ? 600 : 500,
                        borderRadius: '50%',
                        cursor: 'pointer',
                        color: isToday
                          ? '#ffffff'
                          : isSelected
                          ? '#38bdf8'
                          : item.isCurrentMonth
                          ? '#f1f5f9'
                          : '#52525b',
                        background: isToday
                          ? 'linear-gradient(135deg, #38bdf8, #0284c7)'
                          : isSelected
                          ? 'rgba(56, 189, 248, 0.2)'
                          : 'transparent',
                        border: isSelected && !isToday ? '1px solid #38bdf8' : 'none',
                        boxShadow: isToday ? '0 0 16px rgba(56, 189, 248, 0.55)' : 'none',
                        transition: 'all 0.12s ease',
                      }}
                    >
                      {item.day}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Separator Divider */}
        <div
          style={{
            height: '1px',
            background: 'rgba(255, 255, 255, 0.08)',
            margin: '2px 0',
          }}
        />

        {/* ================================================================ */}
        {/* BOTTOM FOCUS SESSION LAUNCHER: [-] 30 mins [+] & [▶ Focus]      */}
        {/* ================================================================ */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          {/* Duration Selector: [-] 30 mins [+] */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {/* [-] Button */}
            <button
              type="button"
              onClick={handleDecrementFocus}
              disabled={isPomodoroRunning}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: isPomodoroRunning ? '#52525b' : '#ffffff',
                fontSize: '16px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isPomodoroRunning ? 'default' : 'pointer',
                outline: 'none',
                transition: 'all 0.15s ease',
              }}
              title="Decrease focus duration by 5 mins"
            >
              −
            </button>

            {/* Readout */}
            <div
              style={{
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#ffffff',
                minWidth: '58px',
                textAlign: 'center',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {isPomodoroRunning
                ? formatCountdown(pomodoroSecondsLeft)
                : `${focusMinutes} mins`}
            </div>

            {/* [+] Button */}
            <button
              type="button"
              onClick={handleIncrementFocus}
              disabled={isPomodoroRunning}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: isPomodoroRunning ? '#52525b' : '#ffffff',
                fontSize: '16px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isPomodoroRunning ? 'default' : 'pointer',
                outline: 'none',
                transition: 'all 0.15s ease',
              }}
              title="Increase focus duration by 5 mins"
            >
              +
            </button>
          </div>

          {/* Glowing [▶ Focus] Action Pill */}
          <button
            type="button"
            onClick={handleStartFocus}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 16px',
              borderRadius: '14px',
              background: isPomodoroRunning
                ? 'rgba(239, 68, 68, 0.22)'
                : 'linear-gradient(135deg, #38bdf8, #0284c7)',
              border: isPomodoroRunning
                ? '1px solid rgba(239, 68, 68, 0.5)'
                : '1px solid #38bdf8',
              color: isPomodoroRunning ? '#ef4444' : '#ffffff',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              outline: 'none',
              boxShadow: isPomodoroRunning
                ? '0 0 16px rgba(239, 68, 68, 0.4)'
                : '0 0 18px rgba(56, 189, 248, 0.55)',
              transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            title={
              isPomodoroRunning
                ? 'Pause active focus session'
                : `Start ${focusMinutes} minute Focus Session & enable DND`
            }
          >
            {isPomodoroRunning ? (
              <>
                <Pause size={13} fill="#ef4444" strokeWidth={0} />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play size={13} fill="#ffffff" strokeWidth={0} />
                <span>Focus</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
