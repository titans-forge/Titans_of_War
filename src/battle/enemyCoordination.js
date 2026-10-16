import {gettysburgOrganized} from './gettysburgMechanics.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const ENEMY_DOCTRINES=Object.freeze({reserve:'Reserve counterstroke',flank:'Flank pressure',depth:'Defense in depth'});
export function initializeEnemyCoordination(e,campaign){
 const styles=Object.keys(ENEMY_DOCTRINES),seed=Number.isFinite(campaign?.seed)?Math.abs(Math.floor(campaign.seed)):1861;
 const style=Object.hasOwn(ENEMY_DOCTRINES,campaign?.enemyDoctrine)?campaign.enemyDoctrine:styles[seed%styles.length];
 e.fieldBattle.coordination={style,label:ENEMY_DOCTRINES[style],nextPlan:6,assignments:{},dispatch:'Union formations are holding their opening assignments.'};
}
export function coordinateEnemy(e){
 const f=e.fieldBattle,c=f?.coordination,o=f?.attackObjective;if(!c||!o||e.time<c.nextPlan)return;
 c.nextPlan=e.time+8;
 const foes=e.state.filter(u=>u.side==='confederate'&&gettysburgOrganized(u)&&!['withdraw','fallback','rally'].includes(u.order));
 const threatening=foes.filter(u=>distance(u,o)<440);
 if(!threatening.length)return;
 const center={x:threatening.reduce((n,u)=>n+u.x,0)/threatening.length,y:threatening.reduce((n,u)=>n+u.y,0)/threatening.length};
 const issue=(id,role,point,sectorId=null)=>{
  const u=e.state.find(u=>u.id===id);if(!u||!gettysburgOrganized(u)||['withdraw','fallback','rally'].includes(u.order)||['shaken','wavering'].includes(u.condition))return false;
  const target={x:Math.max(90,Math.min(e.world.width-90,point.x)),y:Math.max(55,Math.min(e.world.height-55,point.y))};
  const previous=c.assignments[id];if(previous&&e.time-previous.at<16)return false;
  if(previous&&previous.role===role&&distance(previous.target,target)<110)return false;
  // Orders use the same physical movement, facing and collision rules as players.
  // Keep depleted formations out of new assaults; no recovery or ammunition grants.
  if(u.cohesion<35||u.morale<35||u.ammunition<=0)return false;
  u.order='assault';u.directMove=false;u.assaultSector=sectorId;u.target=target;
  c.assignments[id]={role,target,at:e.time};
  c.dispatch=`${u.name}: ${role}.`;e.events.push({time:e.time,type:'dispatch',message:`Union coordination — ${c.dispatch}`});return true;
 };
 if(e.scenarioId==='shiloh'){
  issue('hurlbut-division','cover the landing',{x:o.x-65,y:o.y-15},o.id);
  const guard=e.state.find(u=>u.id==='hurlbut-division');
  if(c.style==='depth'){
   if(!gettysburgOrganized(guard)||['shaken','wavering'].includes(guard.condition))issue('prentiss-division','replace the weakened landing guard',{x:o.x-150,y:o.y-70},o.id);
  }else if(threatening.length>=2){
   if(c.style==='flank')issue('prentiss-division','press the attacking force’s exposed left',{x:center.x-150,y:center.y-80});
   else issue('prentiss-division','support the landing defense',{x:o.x-145,y:o.y-75},o.id);
  }
  // Preserve a central line instead of sending every division to one objective.
  if(c.assignments['prentiss-division']&&threatening.length>=3&&c.style==='reserve')issue('mcclernand-division','cover the vacated center',{x:850,y:580});
 }else if(e.scenarioId==='first_manassas'){
  if(c.style==='depth')issue('howard-brigade','screen the battery line',{x:o.x+125,y:o.y+30},o.id);
  else if(c.style==='flank')issue('howard-brigade','pressure the counterattack’s outer flank',{x:center.x+160,y:center.y-90});
  else if(e.time>=30&&threatening.length>=2)issue('howard-brigade','reinforce the threatened battery line',{x:o.x+90,y:o.y+20},o.id);
  const battery=e.state.find(u=>u.id==='ricketts-griffin');
  if((!gettysburgOrganized(battery)||battery.gunsAbandoned)&&c.style!=='flank')issue('keyes-brigade','counterattack the lost battery ground',{x:o.x-100,y:o.y},o.id);
 }
}
