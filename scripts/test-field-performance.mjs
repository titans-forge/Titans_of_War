import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { attachFieldProfileRenderer, fieldTextureBudget, recordFieldProfile, startFieldProfile, stopFieldProfile } from '../src/battle/fieldPerformance.js';

function fixture(search = '?fieldProfile=1') {
  let clock = 100, removed = 0, appended = 0;
  const timers = new Map(), docEvents = new EventEmitter(), winEvents = new EventEmitter();
  const output = { style: {}, textContent: '', setAttribute(name, value) { this[name] = value; }, remove() { removed++; } };
  const document = { hidden: false, focused: true, hasFocus() { return this.focused; }, createElement() { return output; }, addEventListener: docEvents.on.bind(docEvents), removeEventListener: docEvents.off.bind(docEvents) };
  const window = { location: { search }, addEventListener: winEvents.on.bind(winEvents), removeEventListener: winEvents.off.bind(winEvents), setInterval(callback, ms) { timers.set(1, { callback, ms }); return 1; }, clearInterval(id) { timers.delete(id); } };
  globalThis.document = document;
  globalThis.window = window;
  const profile = startFieldProfile({ appendChild() { appended++; } }, 20, { now: () => clock });
  return { profile, output, document, window, timers, docEvents, winEvents, setTime(value) { clock = value; }, counts: () => ({ removed, appended }) };
}

test('disabled query never creates output, timers or listeners', () => {
  for (const search of ['', '?fieldProfile=0', '?fieldProfile=true']) {
    const f = fixture(search);
    assert.equal(f.profile, null);
    assert.deepEqual(f.counts(), { removed: 0, appended: 0 });
    assert.equal(f.timers.size, 0);
    assert.equal(f.docEvents.eventNames().length, 0);
    attachFieldProfileRenderer(null, {});
    recordFieldProfile(null, 'running', 16, 1, 1, 1);
    stopFieldProfile(null);
  }
});

test('profile is immediately visible and reports frame starvation without a render tick', () => {
  const f = fixture();
  assert.equal(f.output['aria-label'], 'Battle performance');
  assert.match(f.output.textContent, /ready 80 ms/);
  assert.match(f.output.textContent, /no frame delivered/);
  assert.match(f.output.textContent, /visible \/ focused/);
  assert.equal(f.timers.get(1).ms, 2000);
  f.setTime(4100);
  f.timers.get(1).callback();
  assert.match(f.output.textContent, /4000 ms; no frame delivered/);
  assert.equal(f.profile.frameCount, 0);
  stopFieldProfile(f.profile);
});

test('wall intervals remain distinct from smoothed Phaser delta and flush after elapsed time', () => {
  const f = fixture();
  recordFieldProfile(f.profile, 'running', 16, 2, 1, 1);
  f.setTime(260);
  recordFieldProfile(f.profile, 'running', 16, 3, 1, 1);
  f.setTime(1260);
  recordFieldProfile(f.profile, 'running', 16, 4, 1, 1);
  assert.match(f.output.textContent, /wall interval p95 1000.0 ms/);
  assert.match(f.output.textContent, /Phaser delta p95 16.0 ms/);
  assert.match(f.output.textContent, /update p95 4.00 ms/);
  assert.match(f.output.textContent, /snapshots 3/);
  assert.match(f.output.textContent, /formation passes 3/);
  assert.equal(f.profile.samples.length, 0);
  stopFieldProfile(f.profile);
});

test('render hooks measure same-frame work, attach once, and cleanup with the profile', () => {
  const f = fixture(), events = new EventEmitter();
  const image = { width: 10, height: 20, tagName: 'IMG' };
  const game = { events, textures: { list: { field: { source: [{ image }] } } } };
  attachFieldProfileRenderer(f.profile, game);
  attachFieldProfileRenderer(f.profile, game);
  assert.equal(events.listenerCount('prerender'), 1);
  assert.equal(events.listenerCount('postrender'), 1);
  assert.match(f.output.textContent, /textures 1 \(0 canvas \/ 1 image\)/);
  recordFieldProfile(f.profile, 'running', 16, 2, 1, 1);
  f.setTime(110);
  events.emit('prerender');
  f.setTime(119);
  events.emit('postrender');
  assert.equal(f.profile.samples[0].renderMs, 9);
  f.setTime(2200);
  f.timers.get(1).callback();
  assert.match(f.output.textContent, /render p95 9.00 ms/);
  assert.match(f.output.textContent, /since frame 2100 ms/);
  f.document.hidden = true;
  f.document.focused = false;
  f.docEvents.emit('visibilitychange');
  assert.match(f.output.textContent, /hidden \/ unfocused/);
  stopFieldProfile(f.profile);
  stopFieldProfile(f.profile);
  assert.equal(events.eventNames().length, 0);
  assert.equal(f.docEvents.eventNames().length, 0);
  assert.equal(f.winEvents.eventNames().length, 0);
  assert.equal(f.timers.size, 0);
  assert.equal(f.counts().removed, 1);
  const count = f.profile.frameCount;
  recordFieldProfile(f.profile, 'running', 16, 2, 1, 1);
  assert.equal(f.profile.frameCount, count);
});

test('paused/running sample windows reset and remain bounded with missing postrender events', () => {
  const f = fixture(), events = new EventEmitter();
  attachFieldProfileRenderer(f.profile, { events, textures: {} });
  for (let i = 0; i < 500; i++) {
    f.setTime(100 + i);
    recordFieldProfile(f.profile, 'running', 16, 2, 1, 1);
  }
  assert.equal(f.profile.samples.length, 120);
  f.setTime(610);
  recordFieldProfile(f.profile, 'paused', 16, .2, 0, 0);
  assert.equal(f.profile.samples.length, 1);
  assert.equal(f.profile.lastSamples.length, 0);
  assert.equal(f.profile.samples[0].wallMs, null);
  stopFieldProfile(f.profile);
});

test('texture budget deduplicates source identities, filters invalid sources and distinguishes candidate metadata', () => {
  const image = { tagName: 'IMG', width: 1254, height: 1254 };
  const canvas = { tagName: 'CANVAS', width: 1920, height: 768 };
  const source = { image, width: 1254, height: 1254 };
  const result = fieldTextureBudget({ list: {
    'union-gettysburg-v8-a-march-sw': { source: [source], customData: { meta: { clips: [{}, {}] } } },
    'union-gettysburg-v4-march-e': { source: [source], customData: { meta: { clip: {} } } },
    'cloth-us-national-34': { source: [{ image: canvas }] },
    malformed: { source: [{ image: {}, width: 0, height: 10 }] },
  } });
  assert.deepEqual(result, { sources: 2, pixels: 1254 * 1254 + 1920 * 768, nominalRgbaBytes: (1254 * 1254 + 1920 * 768) * 4, canvasSources: 1, imageSources: 1, candidateAtlases: 2, candidateClips: 3 });
  assert.deepEqual(fieldTextureBudget(), { sources: 0, pixels: 0, nominalRgbaBytes: 0, canvasSources: 0, imageSources: 0, candidateAtlases: 0, candidateClips: 0 });
});
