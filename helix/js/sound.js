/**
 * Sound — the constellation's ambient voice.
 *
 * Procedural audio via Web Audio API. No samples, no loops.
 * Space and ocean are the same dark. This is what it sounds like inside.
 *
 * Spatial: chimes ring from where the pebble is. Startles splash at the fish.
 * The drone stays everywhere — it's the ocean, not a point source.
 * A procedural reverb gives everything a sense of being inside a space.
 */

let ctx = null;
let masterGain = null;
let reverbSend = null;
let reverbGain = null;
let isStarted = false;
let drones = [];

// ─── Public API ─────────────────────────────────────────────────

export function isAudioStarted() {
  return isStarted;
}

export function startAudio() {
  if (isStarted) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = ctx.createGain();
  masterGain.gain.value = 0;
  masterGain.connect(ctx.destination);

  // Fade in over 3 seconds
  masterGain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 3);

  buildReverb();
  buildDrones();
  isStarted = true;
}

/**
 * Update the audio listener position to match the camera.
 * Call this every frame from the render loop.
 *
 * @param {Object} pos - { x, y, z } camera world position
 * @param {Object} fwd - { x, y, z } camera forward direction (unit vector)
 */
export function updateListener(pos, fwd) {
  if (!ctx) return;
  const listener = ctx.listener;

  if (listener.positionX) {
    // Modern API (AudioParam-based)
    listener.positionX.value = pos.x;
    listener.positionY.value = pos.y;
    listener.positionZ.value = pos.z;
    listener.forwardX.value = fwd.x;
    listener.forwardY.value = fwd.y;
    listener.forwardZ.value = fwd.z;
    listener.upX.value = 0;
    listener.upY.value = 1;
    listener.upZ.value = 0;
  } else {
    // Legacy API
    listener.setPosition(pos.x, pos.y, pos.z);
    listener.setOrientation(fwd.x, fwd.y, fwd.z, 0, 1, 0);
  }
}

// ─── Reverb ─────────────────────────────────────────────────────
//
// Procedural impulse response: exponentially decaying noise.
// Sounds like a large, dark space. Cathedral of nothing.

function buildReverb() {
  const duration = 2.5; // seconds
  const decay = 2.0;
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const impulse = ctx.createBuffer(2, length, sampleRate);

  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t / decay);
    }
  }

  const convolver = ctx.createConvolver();
  convolver.buffer = impulse;

  // Reverb send bus — spatial sounds route here for wet signal
  reverbSend = ctx.createGain();
  reverbSend.gain.value = 1.0;

  reverbGain = ctx.createGain();
  reverbGain.gain.value = 0.15; // subtle — space, not wash

  reverbSend.connect(convolver);
  convolver.connect(reverbGain);
  reverbGain.connect(masterGain);
}

// ─── Spatial panner helper ──────────────────────────────────────

function createPanner(x, y, z) {
  const panner = ctx.createPanner();
  panner.panningModel = 'HRTF';
  panner.distanceModel = 'inverse';
  panner.refDistance = 3;
  panner.maxDistance = 50;
  panner.rolloffFactor = 1.2;
  panner.coneInnerAngle = 360;
  panner.coneOuterAngle = 360;
  panner.coneOuterGain = 1;
  panner.setPosition(x, y, z);
  return panner;
}

// ─── Ambient drone ──────────────────────────────────────────────
//
// Three layers:
// 1. Sub bass — barely audible foundation, slow movement
// 2. Mid pad — warm harmonic bed, two detuned oscillators
// 3. High shimmer — very quiet, adds sparkle

function buildDrones() {
  // Layer 1: Sub bass (~55 Hz, slow LFO on pitch)
  const sub = createDrone({
    freq: 55,
    type: 'sine',
    gain: 0.25,
    lfoFreq: 0.03,
    lfoDepth: 2,
  });
  drones.push(sub);

  // Layer 2a: Mid pad (~110 Hz)
  const mid1 = createDrone({
    freq: 110,
    type: 'sine',
    gain: 0.08,
    lfoFreq: 0.07,
    lfoDepth: 3,
  });
  drones.push(mid1);

  // Layer 2b: Mid pad detuned (~113 Hz — beating)
  const mid2 = createDrone({
    freq: 113,
    type: 'sine',
    gain: 0.06,
    lfoFreq: 0.05,
    lfoDepth: 2,
  });
  drones.push(mid2);

  // Layer 3: High shimmer (~880 Hz, very quiet)
  const shimmer = createDrone({
    freq: 880,
    type: 'sine',
    gain: 0.012,
    lfoFreq: 0.11,
    lfoDepth: 8,
  });
  drones.push(shimmer);

  // Layer 4: Breath — filtered noise, slow volume LFO
  buildBreath();
}

function createDrone({ freq, type, gain, lfoFreq, lfoDepth }) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;

  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = lfoFreq;

  const lfoGain = ctx.createGain();
  lfoGain.gain.value = lfoDepth;

  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);

  const oscGain = ctx.createGain();
  oscGain.gain.value = gain;

  osc.connect(oscGain);
  oscGain.connect(masterGain);

  osc.start();
  lfo.start();

  return { osc, lfo, oscGain };
}

function buildBreath() {
  // Filtered white noise — ocean-like wash
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1);
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;

  // Bandpass filter — only let through the ocean frequencies
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 400;
  filter.Q.value = 0.5;

  // LFO on filter frequency — slow sweep
  const filterLfo = ctx.createOscillator();
  filterLfo.type = 'sine';
  filterLfo.frequency.value = 0.04;
  const filterLfoGain = ctx.createGain();
  filterLfoGain.gain.value = 200;
  filterLfo.connect(filterLfoGain);
  filterLfoGain.connect(filter.frequency);

  // Volume LFO — breathing
  const volLfo = ctx.createOscillator();
  volLfo.type = 'sine';
  volLfo.frequency.value = 0.06;
  const volLfoGain = ctx.createGain();
  volLfoGain.gain.value = 0.012;

  const breathGain = ctx.createGain();
  breathGain.gain.value = 0.015;

  volLfo.connect(volLfoGain);
  volLfoGain.connect(breathGain.gain);

  noise.connect(filter);
  filter.connect(breathGain);
  breathGain.connect(masterGain);

  noise.start();
  filterLfo.start();
  volLfo.start();
}

// ─── Pebble hover chime ────────────────────────────────────────
//
// Soft bell-like tone. Pitch mapped to pebble index on a
// pentatonic scale — always consonant, never jarring.
// Spatial: the chime rings from the pebble's position in 3D.

const PENTATONIC = [0, 2, 4, 7, 9]; // semitones

export function playPebbleChime(pebbleIndex, position) {
  if (!isStarted) return;

  // Cycle through 3 octaves (C5–A7) so chimes stay audible for any pebble count
  const OCTAVE_COUNT = 3;
  const scaleIndex = pebbleIndex % (PENTATONIC.length * OCTAVE_COUNT);
  const octave = 5 + Math.floor(scaleIndex / PENTATONIC.length);
  const note = PENTATONIC[scaleIndex % PENTATONIC.length];
  const freq = 440 * Math.pow(2, (note - 9 + (octave - 4) * 12) / 12);

  // Two detuned sine oscillators for warmth
  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.value = freq;

  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.value = freq * 1.003; // slight detune

  const gain = ctx.createGain();
  gain.gain.value = 0.06;

  osc1.connect(gain);
  osc2.connect(gain);

  // Spatial routing: dry signal through panner, wet signal to reverb
  if (position) {
    const panner = createPanner(position.x, position.y, position.z);
    gain.connect(panner);
    panner.connect(masterGain);
    // Send to reverb
    gain.connect(reverbSend);
  } else {
    gain.connect(masterGain);
  }

  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0.06, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 2);
  osc2.stop(now + 2);
}

// ─── Fish startle bubble ───────────────────────────────────────
//
// Quick descending chirp + noise burst. Reads as a startled
// splash in the space-ocean. Spatial: splashes at the fish.

export function playFishStartle(position) {
  if (!isStarted) return;

  const now = ctx.currentTime;

  // Descending chirp
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.exponentialRampToValueAtTime(120, now + 0.15);

  const chirpGain = ctx.createGain();
  chirpGain.gain.setValueAtTime(0.08, now);
  chirpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

  osc.connect(chirpGain);

  // Noise burst — bubble pop
  const bufLen = Math.floor(ctx.sampleRate * 0.1);
  const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) {
    d[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buf;

  const bpf = ctx.createBiquadFilter();
  bpf.type = 'bandpass';
  bpf.frequency.value = 2000;
  bpf.Q.value = 2;

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.04, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

  noise.connect(bpf);
  bpf.connect(noiseGain);

  // Spatial routing
  if (position) {
    const panner = createPanner(position.x, position.y, position.z);

    // Merge chirp + noise into panner
    const mixGain = ctx.createGain();
    mixGain.gain.value = 1.0;
    chirpGain.connect(mixGain);
    noiseGain.connect(mixGain);
    mixGain.connect(panner);
    panner.connect(masterGain);

    // Reverb send
    mixGain.connect(reverbSend);
  } else {
    chirpGain.connect(masterGain);
    noiseGain.connect(masterGain);
  }

  osc.start(now);
  osc.stop(now + 0.25);
  noise.start(now);
}
