import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStore, systemStore } from '../store/useSystemStore';
import {
  playToggleClick,
  playGlassPop,
  playWaterDrop,
} from '../utils/sfx';
import {
  X,
  Smile,
  Cat,
  Eye,
  Slash,
  Headphones,
  Sliders,
  Moon,
  Sun,
  Layout,
  Monitor,
  Languages,
  Radio,
  Volume2,
  VolumeX,
  Shield,
  SunMedium,
  Cpu,
  RefreshCw,
  Sparkles,
  Check,
  Maximize2,
} from 'lucide-react';
import { CompanionMode, TaskbarMode } from '../types/liquid';

// Safe Tauri IPC Invoker with web browser fallback
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

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ramWorkingSet: number | null;
  onTrimRam: () => Promise<number | null>;
  monitors: string[];
  onSelectMonitor: (index: number) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  ramWorkingSet,
  onTrimRam,
  monitors,
  onSelectMonitor,
}) => {
  const theme = useSystemStore((s) => s.theme);
  const companionMode = useSystemStore((s) => s.companionMode);
  const companionColor = useSystemStore((s) => s.companionColor);
  const autoAccessories = useSystemStore((s) => s.autoAccessories);
  const companionSensitivity = useSystemStore((s) => s.companionSensitivity);
  const taskbarMode = useSystemStore((s) => s.taskbarMode);
  const selectedMonitor = useSystemStore((s) => s.selectedMonitor);
  const dualSubtitleEnabled = useSystemStore((s) => s.dualSubtitleEnabled);
  const enableOptionalLofi = useSystemStore((s) => s.enableOptionalLofi);
  const enableSfx = useSystemStore((s) => s.enableSfx);
  const privacyBlurEnabled = useSystemStore((s) => s.privacyBlurEnabled);
  const nightEyeCareEnabled = useSystemStore((s) => s.nightEyeCareEnabled);
  const isWindowMaximizedSimulated = useSystemStore(
    (s) => s.isWindowMaximizedSimulated
  );

  const [activeTab, setActiveTab] = useState<'companion' | 'appearance' | 'features' | 'memory'>('companion');
  const [isTrimmingLocal, setIsTrimmingLocal] = useState(false);
  const [localRam, setLocalRam] = useState<number | null>(ramWorkingSet);

  useEffect(() => {
    if (ramWorkingSet !== null) {
      setLocalRam(ramWorkingSet);
    }
  }, [ramWorkingSet]);

  if (!isOpen) return null;

  const colorSwatches = [
    { color: '#06b6d4', name: 'Cyan Neon' },
    { color: '#10b981', name: 'Emerald' },
    { color: '#a855f7', name: 'Purple Lotus' },
    { color: '#f59e0b', name: 'Amber Gold' },
    { color: '#f43f5e', name: 'Rose' },
  ];

  const handleManualTrim = async () => {
    playWaterDrop();
    setIsTrimmingLocal(true);
    const newRam = await onTrimRam();
    if (newRam !== null) {
      setLocalRam(newRam);
    }
    setIsTrimmingLocal(false);
  };

  return (
    <AnimatePresence>
      <div
        id="settings-modal-root"
        className="settings-modal-overlay"
        onClick={onClose}
        onMouseEnter={() => safeInvoke('set_click_through', { ignore: false })}
        onMouseLeave={() => safeInvoke('set_click_through', { ignore: true })}
      >
        <motion.div
          key="settings-card"
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="settings-modal-card"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px 12px',
              borderBottom: '1px solid var(--glass-border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4), rgba(168, 85, 247, 0.4))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <Sliders size={16} style={{ color: '#38bdf8' }} />
              </div>
              <div>
                <h2 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>
                  LiquidIsland OS Dashboard
                </h2>
                <p style={{ fontSize: '10.5px', color: 'var(--text-secondary)', margin: 0 }}>
                  Configuration, Character Studio & System Telemetry
                </p>
              </div>
            </div>

            <button
              type="button"
              className="carousel-chevron-btn"
              style={{ width: '28px', height: '28px' }}
              onClick={onClose}
              title="Close Settings (Esc)"
            >
              <X size={14} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '8px 20px',
              background: 'rgba(0, 0, 0, 0.1)',
              borderBottom: '1px solid var(--glass-border)',
            }}
          >
            {[
              { id: 'companion', label: 'Character Studio', icon: Smile },
              { id: 'appearance', label: 'Appearance & Taskbar', icon: Layout },
              { id: 'features', label: 'Features & Privacy', icon: Shield },
              { id: 'memory', label: '~10 MB RAM Telemetry', icon: Cpu },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    playToggleClick();
                    setActiveTab(tab.id as typeof activeTab);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '5px 10px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: isActive ? 'var(--blue-glow)' : 'transparent',
                    background: isActive ? 'var(--pill-bg)' : 'transparent',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontSize: '11px',
                    fontWeight: isActive ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Icon size={12} style={{ color: isActive ? '#38bdf8' : 'inherit' }} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Body Content */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {/* ============================================================== */}
            {/* TAB 1: COMPANION CHARACTER STUDIO                              */}
            {/* ============================================================== */}
            {activeTab === 'companion' && (
              <motion.div
                key="tab-companion"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
              >
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Select Companion Persona
                  </label>
                  <p style={{ fontSize: '10px', color: 'var(--text-secondary)', margin: '2px 0 8px' }}>
                    Choose your companion pet displayed inside the Dynamic Island during idle moments.
                  </p>

                  {/* Character Selection Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    {[
                      {
                        id: 'slime' as CompanionMode,
                        title: '💧 Concept B: Liquid Slime',
                        desc: 'Organic zero-gravity fluid blob with idle breathing & petting reaction',
                        icon: Smile,
                        color: '#10b981',
                      },
                      {
                        id: 'cat' as CompanionMode,
                        title: '🐱 Concept C: Shadow Cat',
                        desc: 'Playful neko peek with ear twitching & purr vibration physics',
                        icon: Cat,
                        color: '#a855f7',
                      },
                      {
                        id: 'eyes' as CompanionMode,
                        title: '👀 Original Cyber-Eyes',
                        desc: 'Minimalist neon aperture eyes tracking cursor movement',
                        icon: Eye,
                        color: '#06b6d4',
                      },
                      {
                        id: 'off' as CompanionMode,
                        title: '🚫 Off (Compact Pill)',
                        desc: 'Standard minimal status pill without character graphics',
                        icon: Slash,
                        color: '#ef4444',
                      },
                    ].map((card) => {
                      const Icon = card.icon;
                      const isSelected = companionMode === card.id;
                      return (
                        <div
                          key={card.id}
                          onClick={() => {
                            playGlassPop();
                            systemStore.setCompanionMode(card.id);
                            if (card.id !== 'off') {
                              systemStore.setIslandState('eyes');
                            } else {
                              systemStore.setIslandState('compact');
                            }
                          }}
                          style={{
                            padding: '10px 8px',
                            borderRadius: '12px',
                            border: '1px solid',
                            borderColor: isSelected ? card.color : 'var(--glass-border)',
                            background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'var(--pill-bg)',
                            boxShadow: isSelected ? `0 0 14px -2px ${card.color}40` : 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            gap: '6px',
                            transition: 'all 0.16s ease',
                          }}
                        >
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: `${card.color}20`,
                              border: `1px solid ${card.color}60`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Icon size={18} style={{ color: card.color }} />
                          </div>
                          <span style={{ fontSize: '10.5px', fontWeight: 600 }}>{card.title}</span>
                          <span style={{ fontSize: '9px', color: 'var(--text-secondary)', lineHeight: 1.2 }}>
                            {card.desc}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Color Swatch Picker */}
                <div style={{ paddingTop: '8px', borderTop: '1px solid var(--glass-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Companion Luminescent Tint
                      </label>
                      <p style={{ fontSize: '10px', color: 'var(--text-secondary)', margin: '2px 0 6px' }}>
                        Color aura reflected across companion eyes, blush cheeks, and accessories.
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {colorSwatches.map((swatch) => (
                        <button
                          key={swatch.color}
                          type="button"
                          onClick={() => {
                            playToggleClick();
                            systemStore.setCompanionColor(swatch.color);
                          }}
                          title={swatch.name}
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            backgroundColor: swatch.color,
                            border: companionColor === swatch.color ? '2px solid #ffffff' : '1px solid rgba(0,0,0,0.3)',
                            boxShadow: companionColor === swatch.color ? `0 0 8px ${swatch.color}` : 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {companionColor === swatch.color && <Check size={11} color="#ffffff" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Auto Accessories & Sensitivity */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '10px',
                    paddingTop: '8px',
                    borderTop: '1px solid var(--glass-border)',
                  }}
                >
                  {/* Auto Accessories Toggle */}
                  <div
                    style={{
                      padding: '10px',
                      borderRadius: '10px',
                      background: 'var(--pill-bg)',
                      border: '1px solid var(--glass-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Headphones size={13} style={{ color: '#3b82f6' }} />
                        <span style={{ fontSize: '11px', fontWeight: 600 }}>Auto Accessories</span>
                      </div>
                      <button
                        type="button"
                        className="btn-pill"
                        onClick={() => systemStore.setAutoAccessories(!autoAccessories)}
                        style={{
                          fontSize: '9.5px',
                          padding: '2px 8px',
                          borderColor: autoAccessories ? '#10b981' : 'var(--glass-border)',
                          background: autoAccessories ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                        }}
                      >
                        {autoAccessories ? 'ON' : 'OFF'}
                      </button>
                    </div>
                    <p style={{ fontSize: '9.5px', color: 'var(--text-secondary)', margin: 0 }}>
                      Automatically equips Mini Headphones on music and Focus Glasses during Pomodoro focus sessions.
                    </p>
                  </div>

                  {/* Behavior Sensitivity Selector */}
                  <div
                    style={{
                      padding: '10px',
                      borderRadius: '10px',
                      background: 'var(--pill-bg)',
                      border: '1px solid var(--glass-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Sparkles size={13} style={{ color: '#f59e0b' }} />
                        <span style={{ fontSize: '11px', fontWeight: 600 }}>Behavior Sensitivity</span>
                      </div>
                      <div style={{ display: 'flex', gap: '3px' }}>
                        <button
                          type="button"
                          className="btn-pill"
                          onClick={() => systemStore.setCompanionSensitivity('playful')}
                          style={{
                            fontSize: '9px',
                            padding: '2px 6px',
                            borderColor: companionSensitivity === 'playful' ? '#f59e0b' : 'var(--glass-border)',
                            background: companionSensitivity === 'playful' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                          }}
                        >
                          Playful
                        </button>
                        <button
                          type="button"
                          className="btn-pill"
                          onClick={() => systemStore.setCompanionSensitivity('calm')}
                          style={{
                            fontSize: '9px',
                            padding: '2px 6px',
                            borderColor: companionSensitivity === 'calm' ? '#38bdf8' : 'var(--glass-border)',
                            background: companionSensitivity === 'calm' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                          }}
                        >
                          Calm
                        </button>
                      </div>
                    </div>
                    <p style={{ fontSize: '9.5px', color: 'var(--text-secondary)', margin: 0 }}>
                      Playful: energetic cursor tracking and bounce animations. Calm: subtle, gentle movements.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ============================================================== */}
            {/* TAB 2: APPEARANCE & TASKBAR                                    */}
            {/* ============================================================== */}
            {activeTab === 'appearance' && (
              <motion.div
                key="tab-appearance"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
              >
                {/* Theme Selector */}
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Liquid Glass Theme Engine
                  </label>
                  <p style={{ fontSize: '10px', color: 'var(--text-secondary)', margin: '2px 0 8px' }}>
                    Select between high-contrast obsidian dark crystal or luminous quartz light glass.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    <div
                      onClick={() => {
                        playToggleClick();
                        systemStore.setTheme('dark');
                      }}
                      style={{
                        padding: '12px',
                        borderRadius: '12px',
                        border: '1px solid',
                        borderColor: theme === 'dark' ? '#3b82f6' : 'var(--glass-border)',
                        background: 'rgba(18, 18, 22, 0.85)',
                        color: '#f8fafc',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                    >
                      <Moon size={20} style={{ color: '#93c5fd' }} />
                      <div>
                        <div style={{ fontSize: '11.5px', fontWeight: 600 }}>Liquid Dark Obsidian</div>
                        <div style={{ fontSize: '9.5px', color: '#94a3b8' }}>Deep nocturnal crystal backdrop</div>
                      </div>
                    </div>

                    <div
                      onClick={() => {
                        playToggleClick();
                        systemStore.setTheme('light');
                      }}
                      style={{
                        padding: '12px',
                        borderRadius: '12px',
                        border: '1px solid',
                        borderColor: theme === 'light' ? '#3b82f6' : 'var(--glass-border)',
                        background: 'rgba(248, 250, 252, 0.85)',
                        color: '#0f172a',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                    >
                      <Sun size={20} style={{ color: '#f59e0b' }} />
                      <div>
                        <div style={{ fontSize: '11.5px', fontWeight: 600 }}>Liquid Light Quartz</div>
                        <div style={{ fontSize: '9.5px', color: '#64748b' }}>Bright daytime translucent glass</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Taskbar Mode Selector (Options A, B, C) */}
                <div style={{ paddingTop: '8px', borderTop: '1px solid var(--glass-border)' }}>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Liquid Glass Taskbar Styler
                  </label>
                  <p style={{ fontSize: '10px', color: 'var(--text-secondary)', margin: '2px 0 8px' }}>
                    Controls the synchronized bottom Windows Taskbar & Interactive Dock appearance.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {[
                      {
                        mode: 'A' as TaskbarMode,
                        title: 'Option A: Full-Width Glass',
                        desc: 'Full-width bottom crystal bar (100% width, 48px height) with Acrylic blur',
                      },
                      {
                        mode: 'B' as TaskbarMode,
                        title: 'Option B: 2-Capsule Dock',
                        desc: 'Modern floating dual capsules (Left App Dock + Right System Tray)',
                      },
                      {
                        mode: 'C' as TaskbarMode,
                        title: 'Option C: Adaptive Morph',
                        desc: 'Automatically morphs from floating dock to full-width when maximized',
                      },
                    ].map((item) => {
                      const isSelected = taskbarMode === item.mode;
                      return (
                        <div
                          key={item.mode}
                          onClick={() => {
                            playGlassPop();
                            systemStore.setTaskbarMode(item.mode);
                          }}
                          style={{
                            padding: '10px',
                            borderRadius: '10px',
                            border: '1px solid',
                            borderColor: isSelected ? '#3b82f6' : 'var(--glass-border)',
                            background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'var(--pill-bg)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600 }}>{item.title}</span>
                            {isSelected && <Check size={12} style={{ color: '#3b82f6' }} />}
                          </div>
                          <span style={{ fontSize: '9px', color: 'var(--text-secondary)', lineHeight: 1.25 }}>
                            {item.desc}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Multi-Monitor Selector */}
                <div style={{ paddingTop: '8px', borderTop: '1px solid var(--glass-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Multi-Monitor Display Target
                      </label>
                      <p style={{ fontSize: '10px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                        Center the Dynamic Island flush on top of the designated display.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {(monitors.length > 0 ? monitors : ['0: Primary Display (1920x1080)']).map((_mon, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="btn-pill"
                        onClick={() => onSelectMonitor(idx)}
                        style={{
                          fontSize: '10px',
                          padding: '4px 9px',
                          borderColor: selectedMonitor === idx ? '#8b5cf6' : 'var(--glass-border)',
                          background: selectedMonitor === idx ? 'rgba(139, 92, 246, 0.2)' : 'var(--pill-bg)',
                        }}
                      >
                        <Monitor size={11} style={{ color: '#8b5cf6' }} />
                        <span>Display #{idx}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ============================================================== */}
            {/* TAB 3: FEATURES & PRIVACY                                      */}
            {/* ============================================================== */}
            {activeTab === 'features' && (
              <motion.div
                key="tab-features"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
              >
                {[
                  {
                    title: 'Dual Subtitle Indonesian Lyrics (Feature #2)',
                    desc: 'Renders cyan Indonesian translations directly beneath synchronized English lyrics.',
                    icon: Languages,
                    color: '#06b6d4',
                    active: dualSubtitleEnabled,
                    toggle: () => systemStore.toggleDualSubtitle(),
                  },
                  {
                    title: 'Screen Privacy Blur ("Boss Key" Ctrl + Alt + B)',
                    desc: 'Instantly masks the entire desktop with deep frosted privacy glass and suspends audio.',
                    icon: Shield,
                    color: '#3b82f6',
                    active: privacyBlurEnabled,
                    toggle: () => systemStore.togglePrivacyBlur(),
                  },
                  {
                    title: 'Night Eye Care Filter',
                    desc: 'Applies an ambient warm amber tint to reduce blue-light fatigue during evening focus.',
                    icon: SunMedium,
                    color: '#f59e0b',
                    active: nightEyeCareEnabled,
                    toggle: () => systemStore.toggleNightEyeCare(),
                  },
                  {
                    title: 'Optional Lofi Focus Audio Engine',
                    desc: 'Enables background ambient sounds (rain, lofi chord pads) in Pomodoro and music mode.',
                    icon: Radio,
                    color: '#a855f7',
                    active: enableOptionalLofi,
                    toggle: () => systemStore.toggleOptionalLofi(),
                  },
                  {
                    title: 'Subtle WebAudio Glass SFX',
                    desc: 'Acoustic oscillator feedback for pops, water droplets, and toggle clicks.',
                    icon: enableSfx ? Volume2 : VolumeX,
                    color: '#10b981',
                    active: enableSfx,
                    toggle: () => systemStore.setEnableSfx(!enableSfx),
                  },
                  {
                    title: 'Simulate Maximized Window (Option C Morph)',
                    desc: 'Simulate a full-screen window to test Taskbar Option C adaptive morphing.',
                    icon: Maximize2,
                    color: '#38bdf8',
                    active: isWindowMaximizedSimulated,
                    toggle: () => systemStore.toggleWindowMaximizedSimulated(),
                  },
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={idx}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '12px',
                        background: 'var(--pill-bg)',
                        border: '1px solid var(--glass-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '8px',
                            background: `${item.color}20`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Icon size={15} style={{ color: item.color }} />
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 600 }}>{item.title}</div>
                          <div style={{ fontSize: '9.5px', color: 'var(--text-secondary)' }}>{item.desc}</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn-pill"
                        onClick={item.toggle}
                        style={{
                          fontSize: '10px',
                          padding: '3px 10px',
                          borderColor: item.active ? item.color : 'var(--glass-border)',
                          background: item.active ? `${item.color}25` : 'transparent',
                          color: item.active ? '#ffffff' : 'var(--text-secondary)',
                          minWidth: '50px',
                        }}
                      >
                        {item.active ? 'ENABLED' : 'OFF'}
                      </button>
                    </div>
                  );
                })}
              </motion.div>
            )}

            {/* ============================================================== */}
            {/* TAB 4: ~10 MB RAM TELEMETRY & WIN32 MEMORY TRIMMER             */}
            {/* ============================================================== */}
            {activeTab === 'memory' && (
              <motion.div
                key="tab-memory"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
              >
                {/* Working Set Meter Card */}
                <div
                  style={{
                    padding: '16px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(16, 185, 129, 0.12) 100%)',
                    border: '1px solid var(--glass-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Cpu size={18} style={{ color: '#10b981' }} />
                      <div>
                        <span style={{ fontSize: '13px', fontWeight: 700 }}>
                          Active Physical Working Set
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block' }}>
                          Native Win32 K32GetProcessMemoryInfo telemetry
                        </span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontSize: '20px',
                          fontWeight: 800,
                          color: (localRam ?? 9.2) <= 10.5 ? '#10b981' : '#f59e0b',
                        }}
                      >
                        {localRam ? `${localRam.toFixed(2)} MB` : '~9.20 MB'}
                      </span>
                      <span style={{ fontSize: '9px', color: 'var(--text-secondary)', display: 'block' }}>
                        Target: ~8–10 MB
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar against 15 MB boundary */}
                  <div
                    style={{
                      height: '6px',
                      background: 'rgba(255, 255, 255, 0.12)',
                      borderRadius: '9999px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, ((localRam ?? 9.2) / 15) * 100)}%`,
                        background: 'linear-gradient(90deg, #10b981 0%, #3b82f6 100%)',
                        borderRadius: '9999px',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>

                {/* 1-Click Flush Button */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: 'var(--pill-bg)',
                    border: '1px solid var(--glass-border)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '11.5px', fontWeight: 600 }}>
                      Flush Working Set (K32EmptyWorkingSet)
                    </div>
                    <div style={{ fontSize: '9.5px', color: 'var(--text-secondary)' }}>
                      Reclaims all non-essential resident physical pages back to Windows VMM immediately.
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-pill"
                    onClick={handleManualTrim}
                    disabled={isTrimmingLocal}
                    style={{
                      fontSize: '11px',
                      padding: '6px 14px',
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(59, 130, 246, 0.3) 100%)',
                      borderColor: '#10b981',
                      fontWeight: 600,
                    }}
                  >
                    <RefreshCw size={12} className={isTrimmingLocal ? 'animate-spin' : ''} />
                    <span>{isTrimmingLocal ? 'Flushing...' : 'Optimize RAM Now'}</span>
                  </button>
                </div>

                {/* Architecture Note */}
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'rgba(0, 0, 0, 0.12)',
                    fontSize: '9.5px',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.4,
                  }}
                >
                  <p style={{ margin: 0 }}>
                    <strong>Architecture Lock #8:</strong> A background daemon thread in Rust wakes every 25 seconds
                    and executes <code style={{ color: '#38bdf8' }}>trim_ram_working_set_internal()</code> whenever the island is
                    compact or idle. Audio oscillators are suspended when paused to ensure physical footprint stays near ~8–10 MB.
                  </p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer Bar */}
          <div
            style={{
              padding: '10px 20px',
              borderTop: '1px solid var(--glass-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '10px',
              color: 'var(--text-secondary)',
              background: 'rgba(0, 0, 0, 0.08)',
            }}
          >
            <span>LiquidIsland OS · Phase 10 Production Release</span>
            <button
              type="button"
              className="btn-pill"
              onClick={onClose}
              style={{ fontSize: '10.5px', padding: '3px 12px' }}
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
