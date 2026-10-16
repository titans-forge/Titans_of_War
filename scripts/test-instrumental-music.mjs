import assert from 'node:assert/strict';
import { test } from 'node:test';
import { InstrumentalPlayer, instrumentalScore, nextInstrumentalKey, voiceFor } from '../src/engine/InstrumentalPlayer.js';
import { INSTRUMENTAL_SCORES } from '../src/game/instrumentalScores.js';

function hardware() {
  const scheduled = [], timers = new Map(); let id = 0;
  const param = () => ({ value: 0, setValueAtTime(){}, linearRampToValueAtTime(){}, exponentialRampToValueAtTime(){} });
  const node = () => ({ connect(){}, disconnect(){ this.disconnected = true; }, gain: param(), pan: param() });
  const context = { currentTime: 0, createGain: node, createStereoPanner: node, createPeriodicWave: () => ({}),
    createOscillator() { const n = { ...node(), frequency: param(), setPeriodicWave(){}, start(at){this.at=at;}, stop(at){this.end=at;} }; scheduled.push(n); return n; } };
  return { context, scheduled, timers, clock: { setTimeout(fn){timers.set(++id,fn);return id;}, clearTimeout(id){timers.delete(id);} } };
}

test('playlist visits each available score before returning to its first piece', () => {
  assert.ok(!INSTRUMENTAL_SCORES.some(s=>/Just Before|Tenting/.test(s.title)));
  let key = 'march'; const seen = [];
  for (let i=0;i<INSTRUMENTAL_SCORES.length;i++) { seen.push(key); key=nextInstrumentalKey(key); }
  assert.equal(new Set(seen).size, INSTRUMENTAL_SCORES.length); assert.equal(key, 'march');
  for (const key of ['lorena','dixie','elegy_final','not-a-song',undefined]) assert.equal(instrumentalScore(key).title, 'When Johnny Comes Marching Home');
});
for (const score of INSTRUMENTAL_SCORES) test(`${score.title}: complete finite score with melody and accompaniment`, () => {
  assert.ok(score.duration > 40 && score.duration < 120);
  assert.ok(score.events.length > 400);
  assert.match(score.sourceSha256, /^[a-f0-9]{64}$/);
  let last=-1;
  for (const [at,duration,pitch,velocity,staff] of score.events) {
    assert.ok(at>=last && duration>0 && at+duration<score.duration);
    assert.ok(pitch>=21 && pitch<=108 && velocity>0 && velocity<=127 && staff>=1);
    const spec=voiceFor([at,duration,pitch,velocity,staff]); assert.ok(spec.level>0 && spec.level<0.1);
    last=at;
  }
  assert.ok(score.events.some(e=>e[4]===1)); assert.ok(score.events.some(e=>e[4]>1));
});

test('Stop cancels upcoming notes, disconnects active voices and prevents completion callbacks', () => {
  const h=hardware();let ended=0;
  const player=new InstrumentalPlayer(h.context,{},()=>ended++,h.clock);
  player.play(instrumentalScore('march'));assert.ok(h.scheduled.length>0);assert.equal(h.timers.size,1);
  player.stop();assert.equal(h.timers.size,0);assert.equal(player.voices.size,0);
  assert.ok(h.scheduled.every(n=>n.disconnected && n.end===undefined));
  h.context.currentTime=500;player.tick();assert.equal(ended,0);
});
test('late scheduling skips expired notes and calls completion exactly once', () => {
  const h=hardware();let ended=0;const player=new InstrumentalPlayer(h.context,{},()=>ended++,h.clock);
  player.play(instrumentalScore('march'));const n=h.scheduled.length;
  h.context.currentTime=500;player.tick();player.tick();assert.equal(ended,1);assert.equal(h.scheduled.length,n);assert.equal(h.timers.size,0);
});
test('suspended audio clock does not finish a song or fill the voice queue', () => {
  const h=hardware();let ended=0;const player=new InstrumentalPlayer(h.context,{},()=>ended++,h.clock);
  player.play(instrumentalScore('march'));const count=h.scheduled.length;
  for(let i=0;i<100;i++)player.tick();assert.equal(h.scheduled.length,count);assert.equal(ended,0);player.stop();
});
