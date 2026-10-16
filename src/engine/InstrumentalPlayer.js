import { INSTRUMENTAL_SCORES } from '../game/instrumentalScores.js';

export const instrumentalScore = (key) => INSTRUMENTAL_SCORES.find((s) => s.key === key) || INSTRUMENTAL_SCORES[0];
export function nextInstrumentalKey(key) {
  const index = INSTRUMENTAL_SCORES.findIndex((s) => s.key === key);
  return INSTRUMENTAL_SCORES[(index + 1) % INSTRUMENTAL_SCORES.length].key;
}
// Original synthesized timbres; no recorded voices or samples. Harmonic sums stay below unity.
export function voiceFor(event, mixGain = 1) {
  const lead = event[4] === 1;
  const bass = event[2] < 55;
  return {
    harmonics: lead ? [1, 0.20, 0.12, 0.035] : bass ? [1, 0.22, 0.08] : [1, 0.32, 0.12, 0.05],
    level: (lead ? 0.095 : bass ? 0.026 : 0.021) * Math.max(0.25, event[3] / 127) * mixGain,
    attack: lead ? 0.025 : 0.009,
    release: lead ? 0.09 : 0.18,
    sustain: lead ? 0.72 : 0.30,
    pan: lead ? -0.12 : bass ? 0.1 : 0.25,
  };
}

/** A bounded, audio-clock scheduler. Late timer callbacks skip expired notes, never burst them. */
export class InstrumentalPlayer {
  constructor(context, destination, onEnded, timers = globalThis) {
    this.context = context;
    this.destination = destination;
    this.onEnded = onEnded;
    this.timers = timers;
    this.voices = new Set();
    this.timer = null;
    this.playing = false;
    this.waves = new Map();
  }
  play(score) {
    this.stop();
    this.score = score;
    this.index = 0;
    this.startTime = this.context.currentTime + 0.06;
    this.playing = true;
    this.tick();
  }
  tick() {
    if (!this.playing) return;
    const now = this.context.currentTime;
    while (this.index < this.score.events.length && this.startTime + this.score.events[this.index][0] < now + 0.20) {
      const event = this.score.events[this.index++];
      const at = this.startTime + event[0];
      // Resume at the current musical position after a throttled/background tab.
      if (at + event[1] > now && this.voices.size < 64) this.schedule(event, Math.max(at, now), Math.max(0.015, at + event[1] - Math.max(at, now)));
    }
    if (now >= this.startTime + this.score.duration) {
      this.stop();
      this.onEnded?.();
      return;
    }
    this.timer = this.timers.setTimeout(() => this.tick(), 40);
  }
  schedule(event, at, duration) {
    const ctx = this.context, spec = voiceFor(event, this.score?.mixGain ?? 1);
    const osc = ctx.createOscillator(), gain = ctx.createGain(), pan = ctx.createStereoPanner();
    const key = spec.harmonics.join(',');
    if (!this.waves.has(key)) {
      const real = new Float32Array(spec.harmonics.length + 1);
      const imag = new Float32Array([0, ...spec.harmonics]);
      this.waves.set(key, ctx.createPeriodicWave(real, imag, { disableNormalization: true }));
    }
    osc.setPeriodicWave(this.waves.get(key));
    osc.frequency.value = 440 * 2 ** ((event[2] - 69) / 12);
    const attack = Math.min(spec.attack, duration / 3);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(spec.level, at + attack);
    gain.gain.exponentialRampToValueAtTime(spec.level * spec.sustain, at + duration);
    gain.gain.exponentialRampToValueAtTime(0.00001, at + duration + spec.release);
    pan.pan.value = spec.pan;
    osc.connect(gain); gain.connect(pan); pan.connect(this.destination);
    const voice = { osc, gain, pan };
    this.voices.add(voice);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); pan.disconnect(); this.voices.delete(voice); };
    osc.start(at); osc.stop(at + duration + spec.release + 0.01);
  }
  stop() {
    this.playing = false;
    if (this.timer !== null) this.timers.clearTimeout(this.timer);
    this.timer = null;
    for (const { osc, gain, pan } of this.voices) {
      osc.onended = null;
      try { osc.stop(); } catch { /* already ended */ }
      osc.disconnect(); gain.disconnect(); pan.disconnect();
    }
    this.voices.clear();
  }
}
