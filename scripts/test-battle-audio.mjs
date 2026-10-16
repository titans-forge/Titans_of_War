import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BattleAudioManager } from '../src/engine/BattleAudioManager.js';
function harness({ suspended = false, delayed = false } = {}) {
  const nodes = [], params = () => ({ value: 0, setValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const node = kind => { const n = { kind, gain: params(), frequency: params(), pan: params(), connections: 0, disconnected: false, connect(){ this.connections++; }, disconnect(){ this.disconnected = true; }, start(){ this.started = true; }, stop(){ this.stopped = true; } }; nodes.push(n); return n; };
  let created = 0, hidden = false, completeResume;
  const ctx = { state: suspended ? 'suspended' : 'running', currentTime: 1, sampleRate: 1000, destination: {},
    createGain: () => node('gain'), createBiquadFilter: () => node('filter'), createStereoPanner: () => node('pan'), createBufferSource: () => node('noise'), createOscillator: () => node('tone'), createBuffer: (_, count) => ({ getChannelData: () => new Float32Array(count) }),
    resume(){ return delayed ? new Promise(resolve => { completeResume = () => { if (ctx.state !== 'closed') ctx.state='running'; resolve(); }; }) : (ctx.state='running', Promise.resolve()); },
    close(){ this.state = 'closed'; this.closed = (this.closed || 0) + 1; return Promise.resolve(); } };
  const manager = new BattleAudioManager({ createContext: () => { created++; return ctx; }, isHidden: () => hidden });
  const event = (id, type='volley', weapon='infantry') => ({id,time:id,type,weapon,position:{x:300}});
  const options = {enabled:true,paused:false,speed:1,volume:0.4};
  return {manager,ctx,nodes,event,options,get created(){return created;},hide(){hidden=true;},resume(){completeResume();}};
}
test('battle cues create no audio context until a user unlocks; first snapshot is silent', async () => {
  const h = harness(); h.manager.update([h.event(1)], h.options); assert.equal(h.created,0);
  assert.equal(await h.manager.unlock(),true); h.manager.update([h.event(1)],h.options); assert.equal(h.manager.voices.size,0);
  h.manager.update([h.event(1),h.event(2)],h.options); assert.equal(h.manager.voices.size,1); h.manager.dispose();
});
test('repeated IDs, muted events, paused events and hidden-tab events cannot replay later', async () => {
  const h=harness(); await h.manager.unlock(); h.manager.update([],h.options);
  h.manager.update([h.event(1)],h.options); assert.equal(h.manager.voices.size,1);
  h.ctx.currentTime+=1; h.manager.update([h.event(1)],h.options); assert.equal(h.manager.voices.size,1);
  h.manager.update([h.event(2)],{...h.options,enabled:false}); assert.equal(h.manager.voices.size,0);
  h.manager.update([h.event(2)],h.options); assert.equal(h.manager.voices.size,0);
  h.manager.update([h.event(3)],{...h.options,paused:true}); h.manager.update([h.event(3)],h.options); assert.equal(h.manager.voices.size,0);
  h.hide(); h.manager.update([h.event(4)],h.options); assert.equal(h.manager.voices.size,0); h.manager.dispose();
});
test('fast simulation rate cannot flood audio; voices are capped and lifecycle disconnects everything', async () => {
  const h=harness(); await h.manager.unlock(); h.manager.update([],h.options);
  h.manager.update(Array.from({length:128},(_,i)=>h.event(i+1)),{...h.options,speed:4}); assert.equal(h.manager.voices.size,1);
  for(let i=0;i<30;i++){h.ctx.currentTime+=1;h.manager.update([h.event(129+i)],h.options);}
  assert.equal(h.manager.voices.size,6); h.manager.dispose();h.manager.dispose();assert.equal(h.ctx.closed,1);assert.equal(h.manager.voices.size,0);assert.ok(h.nodes.every(n=>n.disconnected));
});
test('all event kinds produce bounded audible equivalents; spatial balance is limited', async () => {
  const h=harness();await h.manager.unlock();h.manager.update([],h.options);
  ['volley','routing','broken','departure','reinforcement'].forEach((type,i)=>{h.ctx.currentTime++;h.manager.update([h.event(i+1,type,i===0?'artillery':'infantry')],{...h.options,listener:{x:1700}});});
  assert.equal(h.manager.voices.size,5);assert.equal(h.nodes.filter(n=>n.kind==='noise').length,1);assert.equal(h.nodes.filter(n=>n.kind==='tone').length,4);assert.ok(h.nodes.filter(n=>n.kind==='pan').every(n=>Math.abs(n.pan.value)<=0.75));
  for(const voice of [...h.manager.voices])voice.source.onended();assert.equal(h.manager.voices.size,0);h.manager.dispose();
});
test('a delayed gesture resume cannot revive a disposed battle', async () => {
  const h=harness({suspended:true,delayed:true});const pending=h.manager.unlock();h.manager.dispose();h.resume();assert.equal(await pending,false);h.manager.update([h.event(1)],h.options);assert.equal(h.manager.voices.size,0);assert.equal(h.ctx.closed,1);
});

test('failed graph construction is transactional and retry never publishes a missing master', async () => {
  const h=harness();h.ctx.createGain=()=>{throw new Error('audio allocation failed');};
  assert.equal(await h.manager.unlock(),false);assert.equal(h.manager.context,null);assert.equal(h.manager.master,null);assert.equal(h.ctx.closed,1);
  assert.equal(await h.manager.unlock(),false);assert.doesNotThrow(()=>h.manager.update([h.event(1)],h.options));h.manager.dispose();
});

test('a failed voice allocation is contained and disconnects its partial graph', async () => {
  const h=harness();await h.manager.unlock();h.manager.update([],h.options);h.ctx.createBiquadFilter=()=>{throw new Error('audio unavailable');};
  assert.doesNotThrow(()=>h.manager.update([h.event(1)],h.options));assert.equal(h.manager.voices.size,0);assert.equal(h.manager.enabled,false);
  assert.ok(h.nodes.filter(n=>n.kind==='noise').every(n=>n.disconnected));h.manager.dispose();
});
