import { systemStore } from '../store/useSystemStore';

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioContextClass();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

/**
 * Resonant, crystalline Glass-Pop sound synthesized via dual sine wave oscillators.
 * Zero external audio files, ~0 KB RAM footprint.
 */
export function playGlassPop(): void {
  if (!systemStore.getState().enableSfx) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Primary resonant oscillator
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();

  // Secondary harmonic oscillator for glass shimmer
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();

  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(880, now);
  osc1.frequency.exponentialRampToValueAtTime(1760, now + 0.02);
  osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.08);

  gain1.gain.setValueAtTime(0.001, now);
  gain1.gain.linearRampToValueAtTime(0.28, now + 0.004);
  gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.085);

  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(2640, now);
  osc2.frequency.exponentialRampToValueAtTime(3520, now + 0.04);

  gain2.gain.setValueAtTime(0.001, now);
  gain2.gain.linearRampToValueAtTime(0.08, now + 0.005);
  gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

  osc1.connect(gain1);
  gain1.connect(ctx.destination);

  osc2.connect(gain2);
  gain2.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);

  osc1.stop(now + 0.09);
  osc2.stop(now + 0.07);
}

/**
 * Gentle, liquid Water-Drop sound with downward pitch bend.
 */
export function playWaterDrop(): void {
  if (!systemStore.getState().enableSfx) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(620, now);
  osc.frequency.exponentialRampToValueAtTime(320, now + 0.12);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.22, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.13);
}

/**
 * Crisp tactile micro toggle click.
 */
export function playToggleClick(): void {
  if (!systemStore.getState().enableSfx) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(2400, now);
  osc.frequency.exponentialRampToValueAtTime(800, now + 0.015);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.18, now + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.02);
}

/**
 * Alias for playToggleClick
 */
export const playSwitchClick = playToggleClick;
