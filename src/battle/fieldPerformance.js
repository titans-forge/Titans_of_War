// Opt-in local diagnostics. No gameplay state or telemetry leaves the page.
const SAMPLE_LIMIT = 120;
const FLUSH_MS = 1000;
const STATUS_MS = 2000;

export function percentile(values, fraction) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

// Source identities are counted once even when two atlases refer to the same
// Image/Canvas. Four bytes per pixel is a nominal RGBA comparison only: this
// does not measure decoded residency, process memory, GPU use or traffic.
export function fieldTextureBudget(textures) {
  const sources = new Set();
  let pixels = 0, canvasSources = 0, imageSources = 0, candidateAtlases = 0, candidateClips = 0;
  for (const [key, texture] of Object.entries(textures?.list || {})) {
    if (/gettysburg-v(?:[3-9]|1[0134568])-/.test(key)) {
      candidateAtlases++;
      const meta = texture?.customData?.meta;
      candidateClips += Array.isArray(meta?.clips) ? meta.clips.length : meta?.clip ? 1 : 0;
    }
    for (const source of texture?.source || []) {
      const image = source?.image;
      const width = source?.width ?? image?.width;
      const height = source?.height ?? image?.height;
      if (!image || sources.has(image) || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) continue;
      sources.add(image);
      pixels += width * height;
      if (String(image.tagName).toUpperCase() === 'CANVAS') canvasSources++;
      else imageSources++;
    }
  }
  return { sources: sources.size, pixels, nominalRgbaBytes: pixels * 4, canvasSources, imageSources, candidateAtlases, candidateClips };
}

function pageState() {
  return `${document.hidden ? 'hidden' : 'visible'} / ${typeof document.hasFocus === 'function' && document.hasFocus() ? 'focused' : 'unfocused'}`;
}

function metric(samples, name, digits = 1) {
  const values = samples.map(sample => sample[name]).filter(Number.isFinite);
  return values.length ? `${percentile(values, .95).toFixed(digits)} ms` : 'awaiting samples';
}

function showProfile(profile, now = profile.now()) {
  if (profile.stopped) return;
  const samples = profile.samples.length ? profile.samples : profile.lastSamples;
  const budget = profile.budget;
  const textures = budget
    ? ` · textures ${budget.sources} (${budget.canvasSources} canvas / ${budget.imageSources} image) · nominal RGBA ${(budget.nominalRgbaBytes / 1048576).toFixed(2)} MiB · candidate ${budget.candidateAtlases} atlases / ${budget.candidateClips} clips`
    : '';
  const since = profile.lastFrameAt === null ? `${Math.max(0, now - profile.startedAt).toFixed(0)} ms; no frame delivered` : `${Math.max(0, now - profile.lastFrameAt).toFixed(0)} ms`;
  profile.output.textContent = `Field profile · ${profile.mode || 'starting'} · ${pageState()} · ready ${profile.readyMs.toFixed(0)} ms · delivered ${profile.frameCount} frames · since frame ${since} · window ${samples.length} frames · wall interval p95 ${metric(samples, 'wallMs')} · Phaser delta p95 ${metric(samples, 'delta')} · update p95 ${metric(samples, 'updateMs', 2)} · render p95 ${metric(samples, 'renderMs', 2)} · snapshots ${samples.reduce((n, sample) => n + sample.snapshotBuilds, 0)} · formation passes ${samples.reduce((n, sample) => n + sample.formationPasses, 0)}${textures} · nominal estimate only`;
}

function flushProfile(profile, now) {
  if (profile.samples.length >= SAMPLE_LIMIT || now - profile.flushedAt >= FLUSH_MS) {
    showProfile(profile, now);
    profile.lastSamples = profile.samples;
    profile.samples = [];
    profile.flushedAt = now;
  }
}

export function startFieldProfile(host, start, options = {}) {
  if (new URLSearchParams(window.location.search).get('fieldProfile') !== '1') return null;
  const now = options.now || (() => performance.now());
  const startedAt = now();
  const output = document.createElement('output');
  output.setAttribute('aria-label', 'Battle performance');
  Object.assign(output.style, { position: 'absolute', bottom: '8px', left: '8px', zIndex: 50, background: '#101917', color: '#fff', padding: '6px', font: '11px monospace', pointerEvents: 'none', maxWidth: '95%' });
  host.appendChild(output);
  const profile = { output, start, readyMs: startedAt - start, startedAt, now, samples: [], lastSamples: [], mode: null, frameCount: 0, lastFrameAt: null, flushedAt: startedAt, cleanup: [], stopped: false };
  const showStatus = () => showProfile(profile);
  // One low-rate status heartbeat can report no frames during a render stall.
  // It never advances simulation or polls the game state.
  if (typeof window.setInterval === 'function') {
    const timer = window.setInterval(showStatus, STATUS_MS);
    profile.cleanup.push(() => window.clearInterval(timer));
  }
  for (const [target, event] of [[document, 'visibilitychange'], [window, 'focus'], [window, 'blur']]) {
    target.addEventListener?.(event, showStatus);
    profile.cleanup.push(() => target.removeEventListener?.(event, showStatus));
  }
  showStatus();
  return profile;
}

export function attachFieldProfileRenderer(profile, game) {
  if (!profile || profile.stopped || profile.rendererAttached || !game?.events?.on) return;
  profile.rendererAttached = true;
  profile.budget = fieldTextureBudget(game.textures);
  const beforeRender = () => { profile.renderStartedAt = profile.now(); };
  const afterRender = () => {
    const now = profile.now();
    if (profile.lastSample && Number.isFinite(profile.renderStartedAt)) profile.lastSample.renderMs = Math.max(0, now - profile.renderStartedAt);
    profile.lastSample = null;
    profile.renderStartedAt = null;
    flushProfile(profile, now);
  };
  // Game events surround scene rendering and renderer.postRender. They exclude
  // renderer.preRender's initial clear and browser compositing/capture.
  game.events.on('prerender', beforeRender);
  game.events.on('postrender', afterRender);
  profile.cleanup.push(() => {
    game.events.off('prerender', beforeRender);
    game.events.off('postrender', afterRender);
  });
  showProfile(profile);
}

export function recordFieldProfile(profile, mode, delta, updateMs, snapshotBuilds, formationPasses) {
  if (!profile || profile.stopped) return;
  const now = profile.now();
  const modeChanged = profile.mode !== mode;
  if (modeChanged) {
    profile.samples = [];
    profile.lastSamples = [];
    profile.lastFrameAt = null;
    profile.flushedAt = now;
    profile.mode = mode;
  }
  const sample = { delta, updateMs, snapshotBuilds, formationPasses, wallMs: profile.lastFrameAt === null ? null : Math.max(0, now - profile.lastFrameAt) };
  profile.lastFrameAt = now;
  profile.frameCount++;
  profile.lastSample = sample;
  profile.samples.push(sample);
  // Remain bounded even if a caller records updates without matching renders.
  if (profile.samples.length > SAMPLE_LIMIT) profile.samples.shift();
  if (modeChanged) showProfile(profile, now);
  if (!profile.rendererAttached) flushProfile(profile, now);
}

export function stopFieldProfile(profile) {
  if (!profile || profile.stopped) return;
  profile.stopped = true;
  for (const cleanup of profile.cleanup) cleanup();
  profile.cleanup = [];
  profile.output.remove();
}
