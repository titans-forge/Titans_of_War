import { CivilWarBattleEngine } from './civilWarEngine.js';
import { gettysburgLineOfFire } from './gettysburgMechanics.js';
export const TRAINING_A = 'pickett-division', TRAINING_B = 'pettigrew-division', TRAINING_GUN = 'alexander-battalion', TRAINING_FOE = 'gibbon-center';
export const COMMAND_LESSONS = Object.freeze([
  {id:'move',title:'Move without firing',text:'Move the first practice formation to the marker at 500, 570. Preview, confirm, then run. Move travels to a point; it does not stop to engage enemies.',point:{x:500,y:570}},
  {id:'support',title:'Move a supporting pair',text:'Use Group orders to move both formations into a spaced line centered at 750, 690. Confirm the preview and run until both arrive within support range.',point:{x:750,y:690}},
  {id:'advance',title:'Advance into firing range',text:'Order the first formation to Advance and run. It will close toward the opposing line, stop, and fire. Observe ammunition decrease; a confirmed Move alone does not satisfy this exercise.'},
  {id:'lane',title:'Clear the battery’s firing lane',text:'The first formation blocks the training battery. Move it to 610, 540, then run until the battery fires. Friendly troops can block a shot even when the enemy is in range.',point:{x:610,y:540}},
  {id:'contact',title:'Break close contact',text:'Run briefly to observe close combat and losses on both sides. Select the first formation and order Fallback. Run until it breaks contact and falls back at least 80 field units.'},
  {id:'rally',title:'Complete a rally',text:'This setup starts with a shaken formation in safety beside an organized friend. Order Rally, then run. Ten safe minutes must pass before morale and cohesion recover to the required thresholds.'},
]);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const campaign={rulesVersion:1,battleRulesVersion:7,metrics:{militaryStrength:85,munitions:80,publicMorale:80,foodSupply:78,treasury:75}};
// An isolated practice engine. Normal battles never receive these presets.
// Opposing troops hold position without ranged ammunition; contact still uses
// the real damage model. Every exercise explicitly starts a fresh setup.
export class CommandTrainingEngine extends CivilWarBattleEngine {
  constructor(lessonId) {
    super('gettysburg',campaign,'option_a');
    const lesson=COMMAND_LESSONS.find(l=>l.id===lessonId);if(!lesson)throw new Error('Unknown command exercise');
    this.training={id:lessonId,complete:false,checks:[],point:lesson.point || null};this.trainingOrders=[];this.trainingMoves=new Set();this.trainingContact=false;this.trainingMovingFire=false;
    this.gettysburg.nextAi=Infinity;
    for(const u of this.state) Object.assign(u,{active:false,arrivalTime:null,participated:false,withdrawn:false,pendingCommand:null,status:'steady',order:'hold',directMove:false,formationMode:'line',morale:85,cohesion:80,fatigue:0,ammunition:30,initialAmmunition:30,reload:0,suppression:0,condition:'steady',facing:u.side==='confederate'?-Math.PI/2:Math.PI/2});
    const place=(id,name,x,y,extra={})=>{const u=this.state.find(u=>u.id===id);Object.assign(u,{name,x,y,active:true,participated:true,target:{x,y},home:{x,y},...extra});return u;};
    let a=place(TRAINING_A,'First practice formation',500,700), b=place(TRAINING_B,'Second practice formation',820,730);
    const foe=place(TRAINING_FOE,'Opposing practice line',500,400,{ammunition:0,initialAmmunition:0,morale:100,cohesion:100});
    if(lessonId==='move') Object.assign(foe,{y:480,target:{x:500,y:480}});
    if(lessonId==='support'){Object.assign(b,{x:1050,y:700,target:{x:1050,y:700}});foe.active=false;}
    if(lessonId==='advance') Object.assign(a,{y:730,target:{x:500,y:730}});
    if(lessonId==='lane') {Object.assign(a,{x:800,y:540,target:{x:800,y:540}});b.active=false;Object.assign(foe,{x:800,y:330,target:{x:800,y:330}});place(TRAINING_GUN,'Training battery',800,730,{gunState:'deployed',gunTimer:0});}
    if(lessonId==='contact'){Object.assign(a,{x:600,y:620,target:{x:600,y:620}});Object.assign(b,{x:850,y:760,target:{x:850,y:760}});Object.assign(foe,{x:600,y:575,target:{x:600,y:575}});}
    if(lessonId==='rally'){Object.assign(a,{x:600,y:620,target:{x:600,y:620},morale:28,cohesion:22,condition:'wavering'});Object.assign(b,{x:800,y:680,target:{x:800,y:680}});Object.assign(foe,{x:600,y:150,target:{x:600,y:150}});}
    this.trainingStart=structuredClone(this.state);this.updateTraining();
  }
  beginResolution() {} // Drills finish on demonstrated actions, never a campaign victory.
  move(id,point){if(this.training?.complete)return false;const accepted=super.move(id,point);if(accepted)this.trainingMoves?.add(id);return accepted;}
  order(id,order,point){if(this.training?.complete)return false;const accepted=super.order(id,order,point);if(accepted)this.trainingOrders?.push({id,order});return accepted;}
  tick(dt){
    if(this.training.complete)return;
    const before=this.state.find(u=>u.id===TRAINING_A),moving=before.directMove,ammo=before.ammunition;
    super.tick(dt);
    if(moving && before.directMove && before.ammunition<ammo)this.trainingMovingFire=true;
    this.trainingContact ||= before.inMelee===true;
    this.updateTraining();
  }
  updateTraining(){
    const a=this.state.find(u=>u.id===TRAINING_A),b=this.state.find(u=>u.id===TRAINING_B),foe=this.state.find(u=>u.id===TRAINING_FOE),gun=this.state.find(u=>u.id===TRAINING_GUN),start=this.trainingStart.find(u=>u.id===TRAINING_A);
    const ordered=order=>this.trainingOrders.some(o=>o.id===a.id&&o.order===order),check=(label,met)=>({label,met:Boolean(met)});let checks=[];
    switch(this.training.id){
      case 'move':checks=[check('Move confirmed and formation reached the marker',this.trainingMoves.has(a.id)&&distance(a,this.training.point)<5&&!a.directMove),check('No volleys fired while moving',!this.trainingMovingFire)];break;
      case 'support':checks=[check('Both formations moved to the previewed line',this.trainingMoves.has(a.id)&&this.trainingMoves.has(b.id)&&distance(a,{x:670,y:690})<5&&distance(b,{x:830,y:690})<5&&!a.directMove&&!b.directMove),check('Both formations have organized support within 340',a.cohesion>=25&&b.cohesion>=25&&distance(a,b)<=340)];break;
      case 'advance':checks=[check('Advance ordered and formation closed toward the enemy',ordered('advance')&&distance(a,start)>25),check('Formation fired after reaching range',a.ammunition<a.initialAmmunition)];break;
      case 'lane':checks=[check('First formation moved clear of the lane',this.trainingMoves.has(a.id)&&distance(a,this.training.point)<5),check('Battery has a clear shot and fired',gettysburgLineOfFire(this,gun,foe)&&gun.ammunition<gun.initialAmmunition)];break;
      case 'contact':checks=[check('Close combat observed, with losses on both sides',this.trainingContact&&a.strength<start.strength&&foe.strength<this.trainingStart.find(u=>u.id===foe.id).strength),check('Fallback ordered and contact broken',ordered('fallback')&&!a.inMelee&&distance(a,start)>=80)];break;
      case 'rally':checks=[check('Rally explicitly ordered',ordered('rally')),check('Safe interval completed and unit returned to Hold',ordered('rally')&&a.order==='hold'&&a.morale>=40&&a.cohesion>=35&&this.time>=10)];break;
    }
    this.training.checks=checks;this.training.complete=checks.every(c=>c.met);
  }
  snapshot(options){const s=super.snapshot(options);return this.training?{...s,training:structuredClone(this.training)}:s;}
}
