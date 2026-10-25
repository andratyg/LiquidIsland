import { systemStore } from '../store/useSystemStore';

export type AmbientSoundMode = 'off' | 'rain' | 'lofi-pad' | 'white-noise';

let ambientCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let currentMode: AmbientSoundMode = 'off';
let activeStopCallbacks: (() => void)[] = [];
let dropletInterval: ReturnType<typeof setInterval> | null = null;

function getAmbientContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!ambientCtx) {
    ambientCtx = new AudioContextClass();
  }
  if (ambientCtx.state === 'suspended') {
    ambientCtx.resume().catch(() => {});
  }
  return ambientCtx;
}

/**
 * Stop and disconnect all procedural ambient nodes immediately.
 * Zero RAM leak guarantee.
 */
export function stopAmbientSound(): void {
  currentMode = 'off';

  if (dropletInterval) {
    clearInterval(dropletInterval);
    dropletInterval = null;
  }

  for (const stopFn of activeStopCallbacks) {
    try {
      stopFn();
    } catch {
      // Ignored if already stopped
    }
  }
  activeStopCallbacks = [];

  if (masterGain && ambientCtx) {
    try {
      const now = ambientCtx.currentTime;
      masterGain.gain.setValueAtTime(masterGain.gain.value, now);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
      setTimeout(() => {
        try {
          masterGain?.disconnect();
          masterGain = null;
        } catch {
          // Ignore
        }
      }, 60);
    } catch {
      try {
        masterGain.disconnect();
      } catch {
        // Ignore
      }
      masterGain = null;
    }
  }

  // Update store state
  systemStore.setLofiAmbientSound('off');
}

/**
 * Returns current ambient sound mode.
 */
export function getCurrentAmbientMode(): AmbientSoundMode {
  return currentMode;
}

/**
 * Synthesizes procedural rain: filtered pink noise + soft randomized water droplets.
 */
function startRainSoundscape(ctx: AudioContext, destination: AudioNode): void {
  const sampleRate = ctx.sampleRate || 44100;
  const bufferDuration = 2; // 2 seconds looped
  const bufferSize = sampleRate * bufferDuration;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
  const output = noiseBuffer.getChannelData(0);

  // Paul Kellet's filter for pink noise generation
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }

  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;

  // Gentle lowpass filter for distant steady rainfall
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1150, ctx.currentTime);
  filter.Q.setValueAtTime(0.7, ctx.currentTime);

  const rainGain = ctx.createGain();
  rainGain.gain.setValueAtTime(0.42, ctx.currentTime);

  noiseSource.connect(filter);
  filter.connect(rainGain);
  rainGain.connect(destination);

  noiseSource.start();

  activeStopCallbacks.push(() => {
    try {
      noiseSource.stop();
      noiseSource.disconnect();
      filter.disconnect();
      rainGain.disconnect();
    } catch {
      // Ignore
    }
  });

  // Soft randomized micro-droplets on glass
  dropletInterval = setInterval(() => {
    if (!systemStore.getState().enableOptionalLofi || currentMode !== 'rain') return;
    try {
      const now = ctx.currentTime;
      const dropOsc = ctx.createOscillator();
      const dropGain = ctx.createGain();

      const freq = 1200 + Math.random() * 1400; // 1.2kHz - 2.6kHz
      dropOsc.type = 'sine';
      dropOsc.frequency.setValueAtTime(freq, now);
      dropOsc.frequency.exponentialRampToValueAtTime(freq * 0.65, now + 0.035);

      const dropVol = 0.03 + Math.random() * 0.04;
      dropGain.gain.setValueAtTime(0.001, now);
      dropGain.gain.linearRampToValueAtTime(dropVol, now + 0.003);
      dropGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.038);

      dropOsc.connect(dropGain);
      dropGain.connect(destination);

      dropOsc.start(now);
      dropOsc.stop(now + 0.04);
    } catch {
      // Ignore
    }
  }, 240);
}

/**
 * Synthesizes procedural warm lofi pad: detuned 4-oscillator chord (Cadd9 / Fmaj7)
 * through a breathing low-pass filter with analog tape warmth.
 */
function startLofiPadSoundscape(ctx: AudioContext, destination: AudioNode): void {
  const frequencies = [130.81, 196.0, 246.94, 329.63]; // C3, G3, B3, E4
  const detunes = [-6, 5, -4, 7]; // Subtle analog chorus

  const padGain = ctx.createGain();
  padGain.gain.setValueAtTime(0.18, ctx.currentTime);

  // Warm 24dB low-pass filter
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(480, ctx.currentTime);
  filter.Q.setValueAtTime(2.0, ctx.currentTime);

  // Slow LFO for filter breathing (0.15 Hz)
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(0.15, ctx.currentTime);
  lfoGain.gain.setValueAtTime(140, ctx.currentTime); // Filter cutoff sweeps 340Hz - 620Hz

  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  lfo.start();

  const oscs: OscillatorNode[] = [];

  frequencies.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.detune.setValueAtTime(detunes[idx], ctx.currentTime);
    osc.connect(filter);
    osc.start();
    oscs.push(osc);
  });

  filter.connect(padGain);
  padGain.connect(destination);

  activeStopCallbacks.push(() => {
    try {
      lfo.stop();
      lfo.disconnect();
      lfoGain.disconnect();
      oscs.forEach((osc) => {
        osc.stop();
        osc.disconnect();
      });
      filter.disconnect();
      padGain.disconnect();
    } catch {
      // Ignore
    }
  });
}

/**
 * Synthesizes procedural gentle white noise with soothing band-pass ocean roll-off.
 */
function startWhiteNoiseSoundscape(ctx: AudioContext, destination: AudioNode): void {
  const sampleRate = ctx.sampleRate || 44100;
  const bufferDuration = 2;
  const bufferSize = sampleRate * bufferDuration;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
  const output = noiseBuffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    output[i] = (Math.random() * 2 - 1) * 0.16;
  }

  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1800, ctx.currentTime);
  filter.Q.setValueAtTime(0.6, ctx.currentTime);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.36, ctx.currentTime);

  noiseSource.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(destination);

  noiseSource.start();

  activeStopCallbacks.push(() => {
    try {
      noiseSource.stop();
      noiseSource.disconnect();
      filter.disconnect();
      noiseGain.disconnect();
    } catch {
      // Ignore
    }
  });
}

/**
 * Set the ambient soundscape mode ('rain', 'lofi-pad', 'white-noise', 'off').
 * Automatically checks `enableOptionalLofi`.
 */
export function setAmbientMode(mode: AmbientSoundMode): void {
  // If user disabled lofi or requested 'off', teardown immediately
  const { enableOptionalLofi } = systemStore.getState();
  if (!enableOptionalLofi || mode === 'off') {
    stopAmbientSound();
    return;
  }

  // If already playing this mode, no-op
  if (currentMode === mode && masterGain) {
    return;
  }

  // Teardown previous active soundscape
  stopAmbientSound();

  const ctx = getAmbientContext();
  if (!ctx) return;

  masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.001, ctx.currentTime);
  masterGain.gain.linearRampToValueAtTime(0.85, ctx.currentTime + 0.12);
  masterGain.connect(ctx.destination);

  currentMode = mode;
  systemStore.setLofiAmbientSound(mode);

  if (mode === 'rain') {
    startRainSoundscape(ctx, masterGain);
  } else if (mode === 'lofi-pad') {
    startLofiPadSoundscape(ctx, masterGain);
  } else if (mode === 'white-noise') {
    startWhiteNoiseSoundscape(ctx, masterGain);
  }
}

/**
 * Cycles to the next ambient sound mode.
 */
export function cycleAmbientMode(): AmbientSoundMode {
  const modes: AmbientSoundMode[] = ['off', 'rain', 'lofi-pad', 'white-noise'];
  const curIdx = modes.indexOf(currentMode);
  const nextMode = modes[(curIdx + 1) % modes.length];
  setAmbientMode(nextMode);
  return nextMode;
}
