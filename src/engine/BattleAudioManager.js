/** Original synthesized field cues. Simulation events drive sound, never render frames. */
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const CUES = new Set(['volley', 'routing', 'broken', 'departure', 'reinforcement', 'melee']);
export class BattleAudioManager {
  constructor({ createContext = () => {
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    return Context ? new Context() : null;
  }, isHidden = () => globalThis.document?.hidden === true } = {}) {
    this.createContext = createContext;
    this.isHidden = isHidden;
    this.context = null;
    this.master = null;
    this.voices = new Set();
    this.lastId = null;
    this.lastCueAt = new Map();
    this.disposed = false;
    this.epoch = 0;
    this.enabled = false;
    this.buffers = new Map();
  }

  // Call from a user gesture. No constructor-time context or autoplay.
  async unlock() {
    if (this.disposed) return false;
    const epoch = this.epoch;
    try {
      if (!this.context) {
        const context = this.createContext();
        if (!context) return false;
        let master;
        try {
          master = context.createGain();
          master.gain.value = 0;
          master.connect(context.destination);
        } catch {
          try { master?.disconnect(); } catch { /* Failed partial graph. */ }
          try { void context.close().catch(() => {}); } catch { /* Already unavailable. */ }
          return false;
        }
        this.context = context;
        this.master = master;
      }
      if (this.context.state === 'suspended') await this.context.resume();
      return !this.disposed && epoch === this.epoch && this.context?.state === 'running';
    } catch { return false; }
  }

  update(events, { enabled = false, paused = false, speed = 1, volume = 0.35, listener, worldWidth = 1700 } = {}) {
    if (this.disposed) return;
    const entries = Array.isArray(events) ? events.filter(e => Number.isSafeInteger(e?.id) && e.id >= 0) : [];
    const newest = entries.reduce((n, e) => Math.max(n, e.id), this.lastId ?? -1);
    const previous = this.lastId;
    this.lastId = newest;
    this.enabled = enabled && !paused && speed > 0 && !this.isHidden();
    if (!this.enabled) { this.silence(); return; }
    const ctx = this.context;
    if (!ctx || !this.master || ctx.state !== 'running') return;
    try {
    // Six bounded voices at these levels remain well below full-scale summation.
    this.master.gain.setTargetAtTime(clamp(Number.isFinite(volume) ? volume : 0.35, 0, 1) * 0.22, ctx.currentTime, 0.015);
    if (previous === null) return; // Opening snapshots must not replay past fighting.
    for (const event of entries) {
      if (event.id <= previous || !CUES.has(event.type) || this.voices.size >= 6) continue;
      const key = event.type === 'volley' ? event.weapon === 'artillery' ? 'cannon' : 'musket' : event.type;
      const gap = key === 'musket' ? 0.11 : key === 'cannon' ? 0.25 : 0.4;
      if (ctx.currentTime - (this.lastCueAt.get(key) ?? -Infinity) < gap) continue;
      this.lastCueAt.set(key, ctx.currentTime);
      const x = Number.isFinite(event.position?.x) ? event.position.x : worldWidth / 2;
      const center = Number.isFinite(listener?.x) ? listener.x : worldWidth / 2;
      const distance = Math.abs(x - center) / Math.max(1, worldWidth);
      this.play(key, clamp((x - center) / (worldWidth / 2 || 1), -0.75, 0.75), 1 / (1 + distance * 2));
    }
    } catch { this.enabled = false; this.silence(); } // Optional sound must never interrupt a battle.
  }

  meleeBuffer() {
    if (this.buffers.has('melee')) return this.buffers.get('melee');
    const buffer = this.context.createBuffer(1, Math.ceil(this.context.sampleRate * .42), this.context.sampleRate);
    buffer.getChannelData(0).set(synthesizeMelee(this.context.sampleRate));
    this.buffers.set('melee', buffer);
    return buffer;
  }

  noiseBuffer(seconds) {
    if (this.buffers.has(seconds)) return this.buffers.get(seconds);
    const buffer = this.context.createBuffer(1, Math.ceil(this.context.sampleRate * seconds), this.context.sampleRate);
    const samples = buffer.getChannelData(0);
    let seed = 1861;
    for (let i = 0; i < samples.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      samples[i] = ((seed / 4294967296) * 2 - 1) * Math.exp(-i / samples.length * 6);
    }
    this.buffers.set(seconds, buffer);
    return buffer;
  }

  play(key, pan, attenuation) {
    const ctx = this.context, now = ctx.currentTime;
    const shot = key === 'cannon' || key === 'musket' || key === 'melee';
    const duration = key === 'cannon' ? 0.65 : key === 'musket' ? 0.19 : key === 'melee' ? 0.42 : 0.32;
    const nodes = [];
    try {
    const source = shot ? ctx.createBufferSource() : ctx.createOscillator(); nodes.push(source);
    const gain = ctx.createGain(); nodes.push(gain);
    const filter = ctx.createBiquadFilter(); nodes.push(filter);
    const panner = ctx.createStereoPanner?.(); if (panner) nodes.push(panner);
    if (shot) source.buffer = key === 'melee' ? this.meleeBuffer() : this.noiseBuffer(duration);
    else {
      source.type = 'triangle';
      const pitch = key === 'reinforcement' ? 392 : key === 'departure' ? 294 : 196;
      source.frequency.setValueAtTime(pitch, now);
      source.frequency.setValueAtTime(key === 'reinforcement' ? 523 : key === 'departure' ? 349 : 147, now + 0.14);
    }
    filter.type = 'lowpass';
    filter.frequency.value = key === 'cannon' ? 650 : key === 'musket' ? 2800 : key === 'melee' ? 5500 : 1200;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime((shot ? 0.55 : 0.18) * attenuation, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    source.connect(filter); filter.connect(gain);
    if (panner) { panner.pan.value = pan; gain.connect(panner); panner.connect(this.master); }
    else gain.connect(this.master);
    const voice = { source, nodes };
    this.voices.add(voice);
    source.onended = () => { for (const node of nodes) { try { node.disconnect(); } catch { /* Context may have closed. */ } } this.voices.delete(voice); };
    source.start(now); source.stop(now + duration + 0.02);
    } catch (error) {
      for (const node of nodes) { try { node.disconnect(); } catch { /* Incomplete graph. */ } }
      throw error;
    }
  }

  silence() {
    if (this.master && this.context?.state !== 'closed') {
      try {
        this.master.gain.cancelScheduledValues(this.context.currentTime);
        this.master.gain.setValueAtTime(0, this.context.currentTime);
      } catch { /* Browser audio may have become unavailable. */ }
    }
    for (const voice of this.voices) {
      voice.source.onended = null;
      try { voice.source.stop(); } catch { /* A completed source is already silent. */ }
      for (const node of voice.nodes) { try { node.disconnect(); } catch { /* Browser audio may have closed. */ } }
    }
    this.voices.clear();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true; this.epoch++;
    this.silence(); try { this.master?.disconnect(); } catch { /* Closed graph. */ }
    const context = this.context;
    this.context = null; this.master = null; this.buffers.clear();
    if (context && context.state !== 'closed') { try { void context.close().catch(() => {}); } catch { /* Already unavailable. */ } }
  }
}

// Original inharmonic metal-on-metal impacts with short wooden/noise transients.
// Deterministic samples allow a rendered listening proof and a clipping gate.
export function synthesizeMelee(sampleRate = 44100) {
  const samples = new Float32Array(Math.ceil(sampleRate * .42));
  let seed = 1864;
  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const noise = seed / 2147483648 - 1;
    let value = 0;
    for (const [at, gain] of [[0, 1], [.073, .65], [.163, .45]]) {
      const age = t - at;
      if (age < 0) continue;
      const attack = Math.min(1, age / .0015);
      const metal = [617, 1031, 1739, 2383].reduce((n, f, k) => n + Math.sin(2 * Math.PI * f * age) * Math.exp(-age * (18 + k * 9)) / (k + 2), 0);
      value += gain * attack * (metal * .42 + noise * Math.exp(-age * 160) * .2);
    }
    samples[i] = Math.max(-.8, Math.min(.8, value));
  }
  return samples;
}
