import React from 'react';
import { motion } from 'framer-motion';
import { SlideIndex } from '../../types/liquid';
import { systemStore } from '../../store/useSystemStore';
import { playGlassPop } from '../../utils/sfx';
import { Timer, Droplets, Inbox, CheckSquare, Sparkles, Music, LucideIcon } from 'lucide-react';

interface SlidePlaceholderProps {
  index: SlideIndex;
}

interface SlideMeta {
  title: string;
  subtitle: string;
  phase: string;
  icon: LucideIcon;
  accentColor: string;
}

const SLIDE_METAS: Record<SlideIndex, SlideMeta> = {
  0: {
    title: 'Music & Synced Lyrics',
    subtitle: 'Now Playing, Dual Subtitles & Media Controls',
    phase: 'Phase 5 (Active)',
    icon: Music,
    accentColor: '#3b82f6',
  },
  1: {
    title: 'Pomodoro Focus Timer',
    subtitle: 'Focus intervals, break cycles & WebAudio chimes',
    phase: 'Phase 6 (Active)',
    icon: Timer,
    accentColor: '#ef4444',
  },
  2: {
    title: 'Water Hydration Reminder',
    subtitle: 'Hourly water intake log & fluid fill animation',
    phase: 'Phase 6 (Active)',
    icon: Droplets,
    accentColor: '#3b82f6',
  },
  3: {
    title: 'Quick Shelf & Dropzone',
    subtitle: 'Fast clipboard history & file staging zone',
    phase: 'Phase 7',
    icon: Inbox,
    accentColor: '#8b5cf6',
  },
  4: {
    title: 'Daily Todo Checklist',
    subtitle: 'Pin tasks & mark completions in real time',
    phase: 'Phase 7',
    icon: CheckSquare,
    accentColor: '#10b981',
  },
};

export const SlidePlaceholder: React.FC<SlidePlaceholderProps> = ({ index }) => {
  const meta = SLIDE_METAS[index] || SLIDE_METAS[1];
  const Icon = meta.icon;

  const handleReturnToMusic = (e: React.MouseEvent) => {
    e.stopPropagation();
    playGlassPop();
    systemStore.setActiveSlide(0);
  };

  return (
    <motion.div
      key={`placeholder-${index}`}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.16 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        textAlign: 'center',
        gap: '6px',
        padding: '8px 16px',
      }}
    >
      <div
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '12px',
          background: `radial-gradient(circle, ${meta.accentColor}22 0%, rgba(255,255,255,0.04) 100%)`,
          border: `1px solid ${meta.accentColor}44`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 4px 12px ${meta.accentColor}20`,
        }}
      >
        <Icon size={20} style={{ color: meta.accentColor }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {meta.title}
          </span>
          <span
            style={{
              fontSize: '9px',
              padding: '1px 6px',
              borderRadius: '9999px',
              backgroundColor: 'var(--pill-bg)',
              border: '1px solid var(--glass-border)',
              color: meta.accentColor,
              fontWeight: 600,
            }}
          >
            {meta.phase}
          </span>
        </div>

        <p
          style={{
            fontSize: '10.5px',
            color: 'var(--text-secondary)',
            maxWidth: '300px',
            lineHeight: 1.3,
            margin: 0,
          }}
        >
          {meta.subtitle}
        </p>
      </div>

      <button
        type="button"
        onClick={handleReturnToMusic}
        className="btn-pill"
        style={{
          fontSize: '10px',
          padding: '3px 10px',
          marginTop: '2px',
          gap: '4px',
        }}
      >
        <Sparkles size={11} style={{ color: '#3b82f6' }} />
        <span>Return to Music & Lyrics (Slide 0)</span>
      </button>
    </motion.div>
  );
};
