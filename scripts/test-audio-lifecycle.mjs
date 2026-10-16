import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import { InstrumentalPlayer, instrumentalScore, nextInstrumentalKey } from '../src/engine/InstrumentalPlayer.js';
// Exercise the production class at instrumented browser boundaries, without audio hardware.
const source = readFileSync(new URL('../src/engine/StrategyAudioManager.js', import.meta.url), 'utf8').replace(/^import .*;$/gm, '').replaceAll('import.meta.env.PROD', 'true').replace('export class StrategyAudioManager', 'class StrategyAudioManager');
function harness(playerClass = InstrumentalPlayer) {
 const events={document:new Map(),window:new Map()}, timers=new Map(), tracks=[], reads=[]; let id=0;
 const target=map=>({addEventListener(type,fn){if(!map.has(type))map.set(type,new Set());map.get(type).add(fn);},removeEventListener(type,fn){map.get(type)?.delete(fn);}});
 const context=vm.createContext({console,AbortController,URL,Map,Set,WeakMap,InstrumentalPlayer:playerClass,instrumentalScore,nextInstrumentalKey,
 document:{...target(events.document),visibilityState:'visible'},window:{...target(events.window),location:{origin:'http://localhost'}},
 AUDIO_TRACK_LIBRARY:[{key:'test',src:'/test.mp3',type:'music',title:'Test',licenseStatus:'verified'}],publicAssetUrl:p=>p,
 fetch:(_url,options)=>new Promise(resolve=>reads.push({options,resolve})),
 setTimeout:fn=>{timers.set(++id,fn);return id;},setInterval:fn=>{timers.set(++id,fn);return id;},clearTimeout:id=>timers.delete(id),clearInterval:id=>timers.delete(id),
 Audio:class{constructor(src){this.src=src;this.paused=true;this.playCompletions=[];tracks.push(this);}play(){this.paused=false;return new Promise(resolve=>{this.completePlay=resolve;this.playCompletions.push(resolve);});}pause(){this.paused=true;}addEventListener(){}removeAttribute(){this.src='';}load(){}}});
 const Manager=vm.runInContext(`${source}\nStrategyAudioManager`,context);return{Manager,Audio:context.Audio,events,timers,tracks,reads};
}
test('mount, dispose and remount leave one listener pair and no abandoned probe',async()=>{
 const h=harness(),first=new h.Manager();let emissions=0;first.setStatusListener(()=>emissions++);first.init();first.init();
 assert.equal(h.events.document.get('visibilitychange').size,1);assert.equal(h.events.window.get('pageshow').size,1);
 first.registerEffectTimeout(()=>assert.fail('Disposed effect ran'),100);first.dispose();first.dispose();
 assert.equal(h.events.document.get('visibilitychange').size,0);assert.equal(h.events.window.get('pageshow').size,0);assert.equal(h.timers.size,0);assert.equal(h.reads[0].options.signal.aborted,true);
 h.reads[0].resolve({ok:true,headers:{get:()=> 'audio/mpeg'},body:{cancel(){}}});
 await Promise.resolve();await Promise.resolve();await Promise.resolve();assert.equal(first.hasFileLibrary,false);assert.equal(emissions,0);
 const second=new h.Manager();second.init();assert.equal(h.events.document.get('visibilitychange').size,1);assert.equal(h.events.window.get('pageshow').size,1);second.dispose();
});
for(const method of ['stop','dispose'])test(`pending track playback cannot revive a manager after ${method}`,async()=>{
 const h=harness(),manager=new h.Manager();manager.isPlaying=true;manager.manualTrackOverrideKey='test';manager.availableFileTrackMap.set('test',{key:'test',src:'/test.mp3',title:'Test'});
 const pending=manager.playContextualFileTrack({}),track=h.tracks[0];assert.equal(manager.pendingTracks.size,1);manager[method]();track.completePlay();await pending;
 assert.equal(track.paused,true);assert.equal(manager.musicTrack,null);assert.equal(manager.pendingTracks.size,0);assert.equal(manager.isPlaying,false);assert.equal(h.timers.size,0);manager.dispose();
});
test('dispose disconnects and closes the audio graph exactly once',async()=>{
 const h=harness(),manager=new h.Manager();let closed=0,disconnected=0;manager.audioContext={state:'running',suspend:async()=>{},close:async()=>{closed++;}};
 for(const key of ['masterGainNode','musicBusGainNode','ambienceBusGainNode','stingerBusGainNode'])manager[key]={disconnect(){disconnected++;}};
 manager.applyBusLevels=()=>{};manager.dispose();manager.dispose();await Promise.resolve();assert.equal(disconnected,4);assert.equal(closed,1);assert.equal(manager.audioContext,null);
});

const drainMicrotasks = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
function reusableTrackManager(h) {
 const manager = new h.Manager();
 manager.isPlaying = true;
 manager.hasFileLibrary = true;
 manager.useProcedural = false;
 manager.manualTrackOverrideKey = 'test';
 manager.availableFileTrackMap.set('test', { key: 'test', src: '/test.mp3', title: 'Test' });
 // Keep the production play/stop/start paths; only the hardware graph is absent.
 manager.initWebAudio = () => {};
 return manager;
}

test('an old music play promise cannot pause the reused track after Stop then Play', async () => {
 const h = harness(), manager = reusableTrackManager(h);
 const track = new h.Audio('http://localhost/test.mp3');
 manager.musicTrack = track;
 const oldRequest = manager.playContextualFileTrack({});
 manager.stop();
 manager.start({});
 await drainMicrotasks();
 assert.equal(track.playCompletions.length, 2, 'restart reuses the existing element');
 assert.equal(track.paused, false);
 track.playCompletions[0]();
 await oldRequest;
 track.playCompletions[1]();
 await drainMicrotasks();
 assert.equal(manager.musicTrack, track);
 assert.equal(manager.isPlaying, true);
 assert.equal(track.paused, false, 'superseded request must not pause its new owner');
 assert.equal(manager.currentSourceMode, 'file');
 manager.dispose();
});

test('an old ambient play promise cannot pause the reused bed after Stop then Play', async () => {
 const h = harness(), manager = reusableTrackManager(h);
 manager.availableFileTrackMap.set('ambient_campfire', { key: 'ambient_campfire', src: '/ambient.mp3', type: 'ambience' });
 const track = new h.Audio('http://localhost/ambient.mp3');
 manager.ambientCampfire = track;
 const oldRequest = manager.startAmbientFileTrack();
 manager.stop();
 manager.start({});
 await drainMicrotasks();
 assert.equal(track.playCompletions.length, 2);
 track.playCompletions[0]();
 await oldRequest;
 track.playCompletions[1]();
 await drainMicrotasks();
 for (const music of h.tracks.filter((item) => item !== track)) music.completePlay();
 await drainMicrotasks();
 assert.equal(manager.ambientCampfire, track);
 assert.equal(manager.isPlaying, true);
 assert.equal(track.paused, false, 'stale ambient continuation must leave the new playback running');
 manager.dispose();
});

class ScorePlayerStub {
 constructor(_ctx,_dest,onEnded){this.onEnded=onEnded;this.playing=false;}
 play(score){this.score=score;this.playing=true;}
 stop(){this.playing=false;}
}
test('archive recordings are the default and opted-in instrumentals survive campaign updates',()=>{
 const {Manager}=harness(ScorePlayerStub),m=new Manager();assert.equal(m.useProcedural,false);m.setUseProcedural(true);
 m.audioContext={};m.isPlaying=true;m.playContextualProceduralTrack({});
 const player=m.instrumentalPlayer;m.playContextualProceduralTrack({metrics:{publicMorale:10}});
 assert.equal(m.instrumentalPlayer,player);assert.match(m.currentTrackTitle,/Battle Cry of Freedom/);
 m.stopProceduralMelody();assert.equal(player.playing,false);
});
test('completion and Next use the same five-piece cycle and stop silences the active player',()=>{
 const {Manager}=harness(ScorePlayerStub),m=new Manager();m.audioContext={};m.isPlaying=true;m.setUseProcedural(true);
 m.playContextualProceduralTrack({});const names=[];
 for(let i=0;i<5;i++){names.push(m.activeMelodyKey);const old=m.instrumentalPlayer;old.playing=false;old.onEnded();assert.equal(old.playing,false);}
 assert.equal(new Set(names).size,5);assert.equal(m.activeMelodyKey,names[0]);
 const player=m.instrumentalPlayer;m.stop();assert.equal(player.playing,false);assert.equal(m.instrumentalPlayer,null);
});
