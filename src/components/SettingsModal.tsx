import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStore, systemStore } from '../store/useSystemStore';
import { playToggleClick, playWaterDrop } from '../utils/sfx';
import { setAmbientMode, stopAmbientSound, AmbientSoundMode } from '../utils/ambientAudio';
import {
  X,
  Smile,
  Cat,
  Eye,
  Slash,
  Moon,
  Sun,
  Cpu,
  RefreshCw,
  Check,
  Monitor,
  Headphones,
  Sparkles,
  Radio,
  Volume2,
  Layout,
  Languages,
  Droplets,
} from 'lucide-react';
import { CompanionMode, TaskbarMode } from '../types/liquid';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ramWorkingSet: number | null;
  onTrimRam: () => Promise<number | null>;
  monitors: string[];
  onSelectMonitor: (index: number) => void;
}

// Safe Tauri IPC Invoker
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

// 5 Vibrant Color Palette Accent Dots
const ACCENT_COLORS = [
  { hex: '#10b981', name: 'Emerald' },
  { hex: '#38bdf8', name: 'Cyan' },
  { hex: '#a855f7', name: 'Violet' },
  { hex: '#f43f5e', name: 'Rose' },
  { hex: '#f59e0b', name: 'Amber' },
];

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
  const taskbarMode = useSystemStore((s) => s.taskbarMode);
  const selectedMonitor = useSystemStore((s) => s.selectedMonitor);
  const autoFullscreenStealth = useSystemStore((s) => s.autoFullscreenStealth ?? false);
  const dualSubtitleEnabled = useSystemStore((s) => s.dualSubtitleEnabled);
  const enableOptionalLofi = useSystemStore((s) => s.enableOptionalLofi);
  const lofiAmbientSound = useSystemStore((s) => s.lofiAmbientSound);
  const autoAccessories = useSystemStore((s) => s.autoAccessories);
  const enableSfx = useSystemStore((s) => s.enableSfx);
  const showTaskbarDock = useSystemStore((s) => s.showTaskbarDock);

  const [isTrimmingLocal, setIsTrimmingLocal] = useState(false);
  const [justTrimmed, setJustTrimmed] = useState(false);
  const [localRam, setLocalRam] = useState<number | null>(ramWorkingSet);

  useEffect(() => {
    if (ramWorkingSet !== null) {
      setLocalRam(ramWorkingSet);
    }
  }, [ramWorkingSet]);

  if (!isOpen) return null;

  const isDark = theme === 'dark';

  // Real-time RAM Flush
  const handleManualTrim = async () => {
    playWaterDrop();
    setIsTrimmingLocal(true);
    const newRam = await onTrimRam();
    if (newRam !== null) {
      setLocalRam(newRam);
    }
    setIsTrimmingLocal(false);
    setJustTrimmed(true);
    setTimeout(() => setJustTrimmed(false), 2500);
  };

  // Real-time Color Switch
  const handleSelectColor = (hex: string) => {
    playWaterDrop();
    systemStore.setCompanionColor(hex);
  };

  // Real-time Companion Mode Switch
  const handleSelectCompanion = (mode: CompanionMode) => {
    playToggleClick();
    systemStore.setCompanionMode(mode);
    if (mode !== 'off') {
      systemStore.setIslandState('eyes');
    } else {
      systemStore.setIslandState('compact');
    }
  };

  // Real-time Theme Switch
  const handleSelectTheme = (nextTheme: 'dark' | 'light') => {
    playToggleClick();
    systemStore.setTheme(nextTheme);
  };

  // Real-time Taskbar Mode Switch
  const handleSelectTaskbar = (nextMode: TaskbarMode) => {
    playToggleClick();
    systemStore.setTaskbarMode(nextMode);
  };

  // Real-time Stealth Auto-Hide Switch
  const handleToggleStealth = () => {
    playToggleClick();
    const next = !autoFullscreenStealth;
    systemStore.setAutoFullscreenStealth(next);
    if (next) {
      systemStore.setIslandState('bezel-line');
    } else {
      systemStore.setIslandState('compact');
    }
  };

  // Real-time Dual Subtitle Switch
  const handleToggleDualSubtitle = () => {
    playToggleClick();
    systemStore.toggleDualSubtitle();
  };

  // Real-time Lofi Ambient Audio Switch
  const handleToggleLofi = () => {
    playToggleClick();
    const next = !enableOptionalLofi;
    systemStore.setEnableOptionalLofi(next);
    if (next) {
      const targetSound = lofiAmbientSound === 'off' ? 'rain' : lofiAmbientSound;
      setAmbientMode(targetSound as AmbientSoundMode);
    } else {
      stopAmbientSound();
    }
  };

  // Real-time Inline Lofi Sound Picker
  const handleSelectLofiSound = (sound: AmbientSoundMode) => {
    playToggleClick();
    systemStore.setLofiAmbientSound(sound);
    setAmbientMode(sound);
  };

  // Real-time Smart Auto-Accessories Switch
  const handleToggleAutoAccessories = () => {
    playToggleClick();
    systemStore.setAutoAccessories(!autoAccessories);
  };

  // Real-time Sound Effects Switch
  const handleToggleSfx = () => {
    playToggleClick();
    systemStore.setEnableSfx(!enableSfx);
  };

  // Real-time Replace Windows Taskbar Switch
  const handleToggleReplaceTaskbar = async () => {
    playToggleClick();
    const next = !showTaskbarDock;
    systemStore.setShowTaskbarDock(next);
    await safeInvoke('set_native_taskbar_hidden', { hidden: next });
  };

  return (
    <AnimatePresence>
      <div
        id="settings-modal-root"
        className="settings-modal-overlay"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'transparent',
          backdropFilter: 'none',
          WebkitBackdropFilter: 'none',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          pointerEvents: 'auto',
        }}
      >
        <motion.div
          key="settings-macos-popover"
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="settings-macos-popover"
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '460px',
            maxWidth: '95vw',
            background: isDark ? 'rgba(15, 17, 23, 0.92)' : 'rgba(255, 255, 255, 0.94)',
            backdropFilter: 'blur(40px) saturate(200%)',
            WebkitBackdropFilter: 'blur(40px) saturate(200%)',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.12)',
            borderRadius: '24px',
            boxShadow: isDark
              ? '0 32px 80px -12px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.08)'
              : '0 32px 80px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
            color: isDark ? '#f8fafc' : '#0f172a',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Top Specular Rim */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '24px',
              right: '24px',
              height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.35), transparent)',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          />

          {/* ==================================================================== */}
          {/* Bento Header: Title + Live Mini Companion Preview + Color Dots       */}
          {/* ==================================================================== */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
              background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Mini Live Companion Preview */}
              <div
                className="mini-companion-preview"
                title={`Active Pet: ${companionMode.toUpperCase()}`}
              >
                {companionMode === 'slime' && (
                  <svg width="32" height="26" viewBox="0 0 34 28" fill="none">
                    <motion.path
                      animate={{
                        d: [
                          'M 6 20 C 6 8, 28 8, 28 20 C 28 26, 6 26, 6 20 Z',
                          'M 5 21 C 5 7, 29 7, 29 21 C 29 26, 5 26, 5 21 Z',
                          'M 6 20 C 6 8, 28 8, 28 20 C 28 26, 6 26, 6 20 Z',
                        ],
                      }}
                      transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                      fill={companionColor}
                    />
                    <circle cx="13" cy="17" r="2" fill="#000000" />
                    <circle cx="13.6" cy="16.4" r="0.7" fill="#ffffff" />
                    <circle cx="21" cy="17" r="2" fill="#000000" />
                    <circle cx="21.6" cy="16.4" r="0.7" fill="#ffffff" />
                  </svg>
                )}

                {companionMode === 'cat' && (
                  <svg width="32" height="26" viewBox="0 0 34 28" fill="none">
                    <polygon points="7,17 11,5 16,14" fill={companionColor} opacity="0.9" />
                    <polygon points="27,17 23,5 18,14" fill={companionColor} opacity="0.9" />
                    <circle cx="17" cy="17" r="9.5" fill={companionColor} />
                    <circle cx="13.5" cy="16" r="1.8" fill="#ffffff" />
                    <circle cx="13.5" cy="16" r="1" fill="#0f172a" />
                    <circle cx="20.5" cy="16" r="1.8" fill="#ffffff" />
                    <circle cx="20.5" cy="16" r="1" fill="#0f172a" />
                    <polygon points="16,19 18,19 17,20" fill="#f43f5e" />
                  </svg>
                )}

                {companionMode === 'eyes' && (
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <motion.div
                      animate={{ scaleY: [1, 0.15, 1] }}
                      transition={{ repeat: Infinity, duration: 3.2, times: [0, 0.05, 0.1] }}
                      style={{
                        width: '10px',
                        height: '5px',
                        borderRadius: '2.5px',
                        backgroundColor: companionColor,
                        boxShadow: `0 0 8px ${companionColor}`,
                      }}
                    />
                    <motion.div
                      animate={{ scaleY: [1, 0.15, 1] }}
                      transition={{ repeat: Infinity, duration: 3.2, times: [0, 0.05, 0.1] }}
                      style={{
                        width: '10px',
                        height: '5px',
                        borderRadius: '2.5px',
                        backgroundColor: companionColor,
                        boxShadow: `0 0 8px ${companionColor}`,
                      }}
                    />
                  </div>
                )}

                {companionMode === 'off' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#64748b' }} />
                    <span style={{ fontSize: '8px', color: '#64748b', fontWeight: 700 }}>Zzz</span>
                  </div>
                )}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <h2
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      margin: 0,
                      letterSpacing: '-0.2px',
                    }}
                  >
                    LiquidIsland Studio
                  </h2>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '1px 6px',
                      borderRadius: '9999px',
                      background: 'rgba(56, 189, 248, 0.15)',
                      color: '#38bdf8',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                    }}
                  >
                    Sequoia Glass
                  </span>
                </div>
                <p style={{ fontSize: '11px', color: isDark ? '#94a3b8' : '#64748b', margin: '2px 0 0' }}>
                  System Controls & Character Studio
                </p>
              </div>
            </div>

            {/* Right side: Color Accent Picker + Close Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Color dots */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                  padding: '4px 7px',
                  borderRadius: '9999px',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
                }}
              >
                {ACCENT_COLORS.map((col) => {
                  const isSelected = companionColor.toLowerCase() === col.hex.toLowerCase();
                  return (
                    <button
                      key={col.hex}
                      type="button"
                      onClick={() => handleSelectColor(col.hex)}
                      className={`color-dot-btn ${isSelected ? 'active' : ''}`}
                      style={{
                        backgroundColor: col.hex,
                        color: col.hex,
                      }}
                      title={`${col.name} Accent`}
                    >
                      {isSelected && (
                        <span
                          style={{
                            width: '5px',
                            height: '5px',
                            borderRadius: '50%',
                            backgroundColor: '#ffffff',
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
                  color: isDark ? '#94a3b8' : '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  outline: 'none',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = isDark ? '#ffffff' : '#000000';
                  e.currentTarget.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.14)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = isDark ? '#94a3b8' : '#64748b';
                  e.currentTarget.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
                }}
                title="Close (Esc)"
              >
                <X size={13} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          {/* ==================================================================== */}
          {/* Body Content                                                         */}
          {/* ==================================================================== */}
          <div
            style={{
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              maxHeight: '74vh',
              overflowY: 'auto',
            }}
          >
            {/* 1. Companion Mode Segmented Control */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Companion Pet
              </label>
              <div className="segmented-control">
                {[
                  { id: 'slime' as CompanionMode, label: 'Slime', icon: Smile },
                  { id: 'cat' as CompanionMode, label: 'Cat', icon: Cat },
                  { id: 'eyes' as CompanionMode, label: 'Eyes', icon: Eye },
                  { id: 'off' as CompanionMode, label: 'Off', icon: Slash },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = companionMode === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`segmented-btn ${isActive ? 'active' : ''}`}
                      onClick={() => handleSelectCompanion(item.id)}
                    >
                      <Icon size={12} strokeWidth={1.8} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Theme & Taskbar Dual Segmented Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {/* Theme */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Appearance Theme
                </label>
                <div className="segmented-control">
                  <button
                    type="button"
                    className={`segmented-btn ${theme === 'dark' ? 'active' : ''}`}
                    onClick={() => handleSelectTheme('dark')}
                  >
                    <Moon size={12} strokeWidth={1.8} />
                    <span>Obsidian</span>
                  </button>
                  <button
                    type="button"
                    className={`segmented-btn ${theme === 'light' ? 'active' : ''}`}
                    onClick={() => handleSelectTheme('light')}
                  >
                    <Sun size={12} strokeWidth={1.8} />
                    <span>Quartz</span>
                  </button>
                </div>
              </div>

              {/* Taskbar Mode */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Taskbar Mode
                </label>
                <div className="segmented-control">
                  {[
                    { id: 'A' as TaskbarMode, label: 'Full Bar' },
                    { id: 'B' as TaskbarMode, label: 'Split Dock' },
                    { id: 'C' as TaskbarMode, label: 'Adaptive' },
                  ].map((item) => {
                    const isActive = taskbarMode === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`segmented-btn ${isActive ? 'active' : ''}`}
                        onClick={() => handleSelectTaskbar(item.id)}
                      >
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3. Grouped Bento Glass Feature Rows */}
            <div className="bento-glass-group">
              {/* Row 1: Stealth Auto-Hide */}
              <div className="bento-glass-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: 'rgba(56, 189, 248, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#38bdf8',
                    }}
                  >
                    <Eye size={15} strokeWidth={2} />
                  </div>
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: isDark ? '#ffffff' : '#0f172a' }}>
                      Stealth Auto-Hide
                    </div>
                    <div style={{ fontSize: '10.5px', color: isDark ? '#94a3b8' : '#64748b' }}>
                      Collapse Island to 136×6px top bezel strip when cursor leaves
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className={`ios-switch ${autoFullscreenStealth ? 'active' : ''}`}
                  onClick={handleToggleStealth}
                  title="Toggle Stealth Auto-Hide"
                >
                  <span className="ios-switch-thumb" />
                </button>
              </div>

              <div className="bento-glass-divider" />

              {/* Row 2: Dual Subtitle (ID/EN) */}
              <div className="bento-glass-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: 'rgba(168, 85, 247, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#a855f7',
                    }}
                  >
                    <Languages size={15} strokeWidth={2} />
                  </div>
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: isDark ? '#ffffff' : '#0f172a' }}>
                      Dual Subtitle (ID / EN)
                    </div>
                    <div style={{ fontSize: '10.5px', color: isDark ? '#94a3b8' : '#64748b' }}>
                      Indonesian translations rendered below real-time song lyrics
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className={`ios-switch ${dualSubtitleEnabled ? 'active' : ''}`}
                  onClick={handleToggleDualSubtitle}
                  title="Toggle Dual Subtitle"
                >
                  <span className="ios-switch-thumb" />
                </button>
              </div>

              <div className="bento-glass-divider" />

              {/* Row 3: Lofi Focus Audio + Inline Sound Selector */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="bento-glass-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: 'rgba(245, 158, 11, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#f59e0b',
                      }}
                    >
                      <Headphones size={15} strokeWidth={2} />
                    </div>
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: isDark ? '#ffffff' : '#0f172a' }}>
                        Lofi Focus Audio
                      </div>
                      <div style={{ fontSize: '10.5px', color: isDark ? '#94a3b8' : '#64748b' }}>
                        Zero-RAM procedural ambient focus sound engine
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`ios-switch ${enableOptionalLofi ? 'active' : ''}`}
                    onClick={handleToggleLofi}
                    title="Toggle Lofi Focus Audio"
                  >
                    <span className="ios-switch-thumb" />
                  </button>
                </div>

                {/* Inline Sound Selector when Lofi is ON */}
                {enableOptionalLofi && (
                  <div
                    style={{
                      padding: '4px 16px 12px 54px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {[
                      { id: 'rain' as AmbientSoundMode, label: 'Rain', icon: Droplets },
                      { id: 'lofi-pad' as AmbientSoundMode, label: 'Lofi Pad', icon: Radio },
                      { id: 'white-noise' as AmbientSoundMode, label: 'White Noise', icon: Sparkles },
                    ].map((snd) => {
                      const SndIcon = snd.icon;
                      const isSoundActive = lofiAmbientSound === snd.id;
                      return (
                        <button
                          key={snd.id}
                          type="button"
                          onClick={() => handleSelectLofiSound(snd.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '4px 9px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            outline: 'none',
                            border: isSoundActive
                              ? '1px solid #10b981'
                              : '1px solid rgba(255, 255, 255, 0.08)',
                            background: isSoundActive
                              ? 'rgba(16, 185, 129, 0.2)'
                              : 'rgba(255, 255, 255, 0.04)',
                            color: isSoundActive ? '#10b981' : isDark ? '#94a3b8' : '#64748b',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <SndIcon size={11} strokeWidth={2} />
                          <span>{snd.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bento-glass-divider" />

              {/* Row 4: Smart Auto-Accessories */}
              <div className="bento-glass-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#10b981',
                    }}
                  >
                    <Sparkles size={15} strokeWidth={2} />
                  </div>
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: isDark ? '#ffffff' : '#0f172a' }}>
                      Smart Auto-Accessories
                    </div>
                    <div style={{ fontSize: '10.5px', color: isDark ? '#94a3b8' : '#64748b' }}>
                      Auto-equip headphones during music & glasses during Pomodoro
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className={`ios-switch ${autoAccessories ? 'active' : ''}`}
                  onClick={handleToggleAutoAccessories}
                  title="Toggle Auto-Accessories"
                >
                  <span className="ios-switch-thumb" />
                </button>
              </div>

              <div className="bento-glass-divider" />

              {/* Row 5: Glass Sound Effects */}
              <div className="bento-glass-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: 'rgba(236, 72, 153, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ec4899',
                    }}
                  >
                    <Volume2 size={15} strokeWidth={2} />
                  </div>
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: isDark ? '#ffffff' : '#0f172a' }}>
                      Glass Sound Effects
                    </div>
                    <div style={{ fontSize: '10.5px', color: isDark ? '#94a3b8' : '#64748b' }}>
                      Acoustic tactile feedback on glass clicks and transitions
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className={`ios-switch ${enableSfx ? 'active' : ''}`}
                  onClick={handleToggleSfx}
                  title="Toggle Sound Effects"
                >
                  <span className="ios-switch-thumb" />
                </button>
              </div>

              <div className="bento-glass-divider" />

              {/* Row 6: Replace Windows Taskbar */}
              <div className="bento-glass-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: 'rgba(59, 130, 246, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#3b82f6',
                    }}
                  >
                    <Layout size={15} strokeWidth={2} />
                  </div>
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: isDark ? '#ffffff' : '#0f172a' }}>
                      Replace Windows Taskbar
                    </div>
                    <div style={{ fontSize: '10.5px', color: isDark ? '#94a3b8' : '#64748b' }}>
                      Hide native auto-hide taskbar & anchor Liquid Glass Dock
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className={`ios-switch ${showTaskbarDock ? 'active' : ''}`}
                  onClick={handleToggleReplaceTaskbar}
                  title="Toggle Replace Windows Taskbar"
                >
                  <span className="ios-switch-thumb" />
                </button>
              </div>
            </div>

            {/* 4. Target Monitor Selector (when multiple monitors exist) */}
            {monitors.length > 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Target Display
                </label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {monitors.map((_mon, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="btn-pill"
                      onClick={() => onSelectMonitor(idx)}
                      style={{
                        fontSize: '11px',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        borderColor: selectedMonitor === idx ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)',
                        background: selectedMonitor === idx ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        color: selectedMonitor === idx ? '#ffffff' : '#94a3b8',
                      }}
                    >
                      <Monitor size={11} strokeWidth={1.8} />
                      <span>Display #{idx}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ==================================================================== */}
          {/* Bento Footer: Live RAM Telemetry & Optimized Feedback Button         */}
          {/* ==================================================================== */}
          <div
            style={{
              padding: '12px 20px',
              borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: isDark ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.03)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: '#22c55e',
                    boxShadow: '0 0 6px #22c55e',
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Cpu size={12} strokeWidth={1.8} style={{ color: isDark ? '#94a3b8' : '#64748b' }} />
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: isDark ? '#ffffff' : '#0f172a',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {localRam ? `${localRam.toFixed(1)} MB` : '16.4 MB'} / 40.0 MB
                  </span>
                  <span style={{ fontSize: '9.5px', color: isDark ? '#64748b' : '#94a3b8' }}>
                    (40 MB Tier)
                  </span>
                </div>
              </div>

              {/* Sleek Visual Micro Progress Bar */}
              <div
                style={{
                  width: '148px',
                  height: '4px',
                  borderRadius: '2px',
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                  overflow: 'hidden',
                  marginLeft: '15px',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(100, Math.max(5, ((localRam ?? 16.4) / 40.0) * 100))}%`,
                    borderRadius: '2px',
                    backgroundColor: (localRam ?? 16.4) > 38.5 ? '#f59e0b' : '#22c55e',
                    boxShadow: '0 0 6px rgba(34, 197, 94, 0.4)',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleManualTrim}
              disabled={isTrimmingLocal}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                fontWeight: 600,
                padding: '5px 13px',
                borderRadius: '9999px',
                background: justTrimmed
                  ? 'rgba(34, 197, 94, 0.25)'
                  : 'rgba(34, 197, 94, 0.14)',
                border: justTrimmed
                  ? '1px solid rgba(34, 197, 94, 0.6)'
                  : '1px solid rgba(34, 197, 94, 0.35)',
                color: '#22c55e',
                cursor: 'pointer',
                outline: 'none',
                transition: 'all 0.18s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = justTrimmed
                  ? 'rgba(34, 197, 94, 0.25)'
                  : 'rgba(34, 197, 94, 0.14)';
              }}
              title="Flush RAM working set with Win32 K32EmptyWorkingSet"
            >
              {justTrimmed ? (
                <>
                  <Check size={11} strokeWidth={2.5} />
                  <span>Optimized ✓</span>
                </>
              ) : (
                <>
                  <RefreshCw
                    size={11}
                    strokeWidth={2}
                    className={isTrimmingLocal ? 'animate-spin' : ''}
                  />
                  <span>{isTrimmingLocal ? 'Optimizing...' : 'Trim Working Set'}</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
