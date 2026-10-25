import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStore, systemStore } from '../store/useSystemStore';
import { playToggleClick, playWaterDrop } from '../utils/sfx';
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
  Monitor,
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
  const taskbarMode = useSystemStore((s) => s.taskbarMode);
  const selectedMonitor = useSystemStore((s) => s.selectedMonitor);
  const autoFullscreenStealth = useSystemStore((s) => s.autoFullscreenStealth ?? false);
  const dualSubtitleEnabled = useSystemStore((s) => s.dualSubtitleEnabled);
  const enableOptionalLofi = useSystemStore((s) => s.enableOptionalLofi);
  const enableSfx = useSystemStore((s) => s.enableSfx);

  const [isTrimmingLocal, setIsTrimmingLocal] = useState(false);
  const [localRam, setLocalRam] = useState<number | null>(ramWorkingSet);

  useEffect(() => {
    if (ramWorkingSet !== null) {
      setLocalRam(ramWorkingSet);
    }
  }, [ramWorkingSet]);

  if (!isOpen) return null;

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
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
      >
        <motion.div
          key="settings-macos-popover"
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="settings-macos-popover"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px 14px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  margin: 0,
                  color: '#ffffff',
                  letterSpacing: '-0.2px',
                }}
              >
                LiquidIsland Settings
              </h2>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>
                System Controls & Character Studio
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                outline: 'none',
                transition: 'background-color 0.15s ease, color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#94a3b8';
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
              }}
              title="Close (Esc)"
            >
              <X size={12} strokeWidth={2} />
            </button>
          </div>

          {/* Body Content */}
          <div
            style={{
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              maxHeight: '75vh',
              overflowY: 'auto',
            }}
          >
            {/* 1. Companion Mode Segmented Control */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
                      onClick={() => {
                        playToggleClick();
                        systemStore.setCompanionMode(item.id);
                        if (item.id !== 'off') {
                          systemStore.setIslandState('eyes');
                        } else {
                          systemStore.setIslandState('compact');
                        }
                      }}
                    >
                      <Icon size={12} strokeWidth={1.75} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Theme Segmented Control */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Appearance Theme
              </label>
              <div className="segmented-control">
                <button
                  type="button"
                  className={`segmented-btn ${theme === 'dark' ? 'active' : ''}`}
                  onClick={() => {
                    playToggleClick();
                    systemStore.setTheme('dark');
                  }}
                >
                  <Moon size={12} strokeWidth={1.75} />
                  <span>Obsidian</span>
                </button>
                <button
                  type="button"
                  className={`segmented-btn ${theme === 'light' ? 'active' : ''}`}
                  onClick={() => {
                    playToggleClick();
                    systemStore.setTheme('light');
                  }}
                >
                  <Sun size={12} strokeWidth={1.75} />
                  <span>Quartz</span>
                </button>
              </div>
            </div>

            {/* 3. Taskbar Integration Segmented Control */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
                      onClick={() => {
                        playToggleClick();
                        systemStore.setTaskbarMode(item.id);
                      }}
                    >
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. iOS-Style Feature Toggles */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: '14px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              {/* Toggle 1: Stealth Auto-Hide */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff' }}>
                    Stealth Auto-Hide
                  </div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                    Collapse to bezel line when inactive or in fullscreen
                  </div>
                </div>
                <button
                  type="button"
                  className={`ios-switch ${autoFullscreenStealth ? 'active' : ''}`}
                  onClick={() => {
                    playToggleClick();
                    systemStore.toggleAutoFullscreenStealth();
                  }}
                  title="Toggle Stealth Auto-Hide"
                >
                  <span className="ios-switch-thumb" />
                </button>
              </div>

              <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.05)' }} />

              {/* Toggle 2: Dual Subtitle (ID/EN) */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff' }}>
                    Dual Subtitle (ID/EN)
                  </div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                    Show Indonesian translations below lyrics
                  </div>
                </div>
                <button
                  type="button"
                  className={`ios-switch ${dualSubtitleEnabled ? 'active' : ''}`}
                  onClick={() => {
                    playToggleClick();
                    systemStore.toggleDualSubtitle();
                  }}
                  title="Toggle Dual Subtitle"
                >
                  <span className="ios-switch-thumb" />
                </button>
              </div>

              <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.05)' }} />

              {/* Toggle 3: Lofi Focus Audio */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff' }}>
                    Lofi Focus Audio
                  </div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                    Ambient focus sound generator in background
                  </div>
                </div>
                <button
                  type="button"
                  className={`ios-switch ${enableOptionalLofi ? 'active' : ''}`}
                  onClick={() => {
                    playToggleClick();
                    systemStore.toggleOptionalLofi();
                  }}
                  title="Toggle Lofi Focus Audio"
                >
                  <span className="ios-switch-thumb" />
                </button>
              </div>

              <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.05)' }} />

              {/* Toggle 4: Sound Effects */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff' }}>
                    Sound Effects
                  </div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                    Acoustic feedback on glass clicks and transitions
                  </div>
                </div>
                <button
                  type="button"
                  className={`ios-switch ${enableSfx ? 'active' : ''}`}
                  onClick={() => {
                    playToggleClick();
                    systemStore.setEnableSfx(!enableSfx);
                  }}
                  title="Toggle Sound Effects"
                >
                  <span className="ios-switch-thumb" />
                </button>
              </div>
            </div>

            {/* 5. Target Monitor Selector */}
            {monitors.length > 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
                      <Monitor size={11} strokeWidth={1.75} />
                      <span>Display #{idx}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sleek Bottom Status Footer: Live RAM usage + Optimize button */}
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(0, 0, 0, 0.2)',
            }}
          >
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
                <Cpu size={12} strokeWidth={1.75} style={{ color: '#94a3b8' }} />
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#ffffff',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {localRam ? `${localRam.toFixed(1)} MB` : '~9.2 MB'}
                </span>
                <span style={{ fontSize: '10px', color: '#64748b' }}>RAM Working Set</span>
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
                padding: '4px 12px',
                borderRadius: '9999px',
                background: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid rgba(34, 197, 94, 0.35)',
                color: '#22c55e',
                cursor: 'pointer',
                outline: 'none',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.15)';
              }}
              title="Flush RAM working set with Win32 K32EmptyWorkingSet"
            >
              <RefreshCw size={11} strokeWidth={2} className={isTrimmingLocal ? 'animate-spin' : ''} />
              <span>{isTrimmingLocal ? 'Optimizing...' : 'Optimize'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
