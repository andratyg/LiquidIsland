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
 * Ultra-crisp, subtle haptic mechanical scroll tick.
 * Zero external audio files, ~0 KB RAM footprint.
 */
export function playScrollTick(): void {
  if (!systemStore.getState().enableSfx) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(3200, now);
  osc.frequency.exponentialRampToValueAtTime(1200, now + 0.005);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.06, now + 0.001);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.006);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.007);
}

/**
 * Soft, squishy jelly droplet bounce sound for Slime interactions.
 */
export function playJellyBounce(): void {
  if (!systemStore.getState().enableSfx) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(320, now);
  osc.frequency.exponentialRampToValueAtTime(540, now + 0.05);
  osc.frequency.exponentialRampToValueAtTime(280, now + 0.14);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.20, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.15);
}

/**
 * Gentle feline purr micro-chime for Cat petting interaction.
 */
export function playPetPurr(): void {
  if (!systemStore.getState().enableSfx) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const modOsc = ctx.createOscillator();
  const modGain = ctx.createGain();
  const mainGain = ctx.createGain();

  // Low frequency carrier with ~28Hz vibrato to simulate purring throat rumble
  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, now);
  osc.frequency.linearRampToValueAtTime(140, now + 0.15);

  modOsc.type = 'sine';
  modOsc.frequency.setValueAtTime(28, now); // 28Hz purr rumble

  modGain.gain.setValueAtTime(30, now);
  modOsc.connect(modGain);
  modGain.connect(osc.frequency);

  mainGain.gain.setValueAtTime(0.001, now);
  mainGain.gain.linearRampToValueAtTime(0.14, now + 0.04);
  mainGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

  osc.connect(mainGain);
  mainGain.connect(ctx.destination);

  modOsc.start(now);
  osc.start(now);

  modOsc.stop(now + 0.23);
  osc.stop(now + 0.23);
}

/**
 * Alias for playToggleClick
 */
export const playSwitchClick = playToggleClick;

/**
 * Phase 8: AirBuds Pro connection chime (00:19 Reference 1:1)
 * High-tech rising dual-tone crystal chime (660Hz -> 880Hz) with acoustic resonance.
 */
export function playAirBudsChime(): void {
  if (!systemStore.getState().enableSfx) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();

  // Tone 1: 660 Hz
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(660, now);
  gain1.gain.setValueAtTime(0.001, now);
  gain1.gain.linearRampToValueAtTime(0.22, now + 0.015);
  gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);

  // Tone 2: 880 Hz delayed by 100ms
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(880, now + 0.10);
  gain2.gain.setValueAtTime(0.001, now);
  gain2.gain.setValueAtTime(0.001, now + 0.095);
  gain2.gain.linearRampToValueAtTime(0.26, now + 0.115);
  gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);

  osc1.start(now);
  osc1.stop(now + 0.26);
  osc2.start(now + 0.095);
  osc2.stop(now + 0.43);
}

/**
 * Phase 8: Battery Charging chime (00:20 Reference 1:1)
 * Uplifting harmonic triad power-up chime (C5 -> E5 -> G5).
 */
export function playChargingChime(): void {
  if (!systemStore.getState().enableSfx) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
  const step = 0.07;

  notes.forEach((freq, idx) => {
    const noteTime = now + idx * step;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, noteTime);

    gain.gain.setValueAtTime(0.001, noteTime);
    gain.gain.linearRampToValueAtTime(0.20, noteTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.24);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(noteTime);
    osc.stop(noteTime + 0.25);
  });
}

/**
 * Phase 8: Battery Low / Guard warning chime.
 * Double descending chime (440Hz -> 349Hz).
 */
export function playBatteryLowChime(): void {
  if (!systemStore.getState().enableSfx) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [440, 349.23]; // A4 -> F4
  const step = 0.12;

  notes.forEach((freq, idx) => {
    const noteTime = now + idx * step;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, noteTime);

    gain.gain.setValueAtTime(0.001, noteTime);
    gain.gain.linearRampToValueAtTime(0.18, noteTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(noteTime);
    osc.stop(noteTime + 0.23);
  });
}

/**
 * Phase 8: Window Pin / Unpin snap sound.
 * Crisp metallic pin click with high harmonic frequency.
 */
export function playPinChime(): void {
  if (!systemStore.getState().enableSfx) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(1760, now);
  osc.frequency.exponentialRampToValueAtTime(3520, now + 0.03);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.24, now + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.065);
}

/**
 * Phase 8: Virtual Desktop Slide-Wave whoosh sound.
 * Fluid whoosh sweep with bandpass filter.
 */
export function playSlideWaveSound(): void {
  if (!systemStore.getState().enableSfx) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(280, now);
  osc.frequency.exponentialRampToValueAtTime(560, now + 0.06);
  osc.frequency.exponentialRampToValueAtTime(240, now + 0.14);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.16);
}
