import { useCallback, useEffect, useRef, useState } from 'react';
import { CivilWarBattlefield } from '../battle/CivilWarBattlefield.jsx';
import { COMMAND_LESSONS, TRAINING_A, TRAINING_B } from '../battle/commandTraining.js';
import { rallyFeedback } from '../battle/battleFeedback.js';
import { GroupOrders } from './GroupOrders.jsx';
import { useDialogFocus } from './useDialogFocus.js';
import '../battle/battleUsability.css';
const TRAINING_STATE=Object.freeze({rulesVersion:1,battleRulesVersion:7});
const WORLD=Object.freeze({width:1700,height:900});
const PAIR=[TRAINING_A,TRAINING_B];
export default function CommandTraining({onClose}) {
  const root=useRef(null), field=useRef(null);
  const [step,setStep]=useState(0),[attempt,setAttempt]=useState(0),[snapshot,setSnapshot]=useState(null),[selectedId,setSelectedId]=useState(TRAINING_A),[speed,setSpeed]=useState(0),[destination,setDestination]=useState(null),[groupPlan,setGroupPlan]=useState(null);
  const onSnapshot=useCallback(s=>{setSnapshot(s);if(s.training?.complete)setSpeed(0);},[]);
  const onDestination=useCallback(p=>{setDestination(p);if(p)setSpeed(0);},[]);
  const onGroupPreview=useCallback(p=>{setGroupPlan(p);if(p)setSpeed(0);},[]);
  useDialogFocus(root,true,onClose);
  useEffect(()=>{const pause=()=>{if(document.hidden)setSpeed(0);};document.addEventListener('visibilitychange',pause);return()=>document.removeEventListener('visibilitychange',pause);},[]);
  useEffect(() => { const pause = () => setSpeed(0); window.addEventListener('civil-war-background', pause); return () => window.removeEventListener('civil-war-background', pause); }, []);
  const lesson=COMMAND_LESSONS[step], selected=snapshot?.formations.find(u=>u.id===selectedId), recovery=rallyFeedback(selected), complete=Boolean(snapshot?.training?.complete);
  const reset=next=>{setSpeed(0);setSnapshot(null);setDestination(null);setGroupPlan(null);setSelectedId(TRAINING_A);setStep(next);setAttempt(n=>n+1);};
  return <div ref={root} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Command training" className="cw-training-overlay">
    <header><div><p>Command training · Exercise {step+1} of {COMMAND_LESSONS.length}</p><h2>{lesson.title}</h2></div><button onClick={onClose}>Leave training</button></header>
    <div className="cw-training-stage">
      <aside><p>{lesson.text}</p><details><summary>About this practice field</summary><p>Each exercise resets the units to a prepared position on the Gettysburg terrain. Opposing troops stay in place without ranged ammunition. Movement, friendly fire lanes, close-combat losses and recovery use the game’s battle rules. This is a drill, not a historical battle or campaign result.</p></details>
        <label>Practice formation<select value={selectedId} onChange={e=>setSelectedId(e.target.value)}>{snapshot?.formations.filter(u=>u.active&&u.side==='confederate').map(u=><option value={u.id} key={u.id}>{u.name}</option>)}</select></label>
        <p>{selected?.pendingCommand ? `${selected.pendingCommand.order} en route · ${selected.commandDelay.toFixed(1)} field minutes` : selected ? `${selected.directMove ? 'move' : selected.order} received` : 'Awaiting orders'}</p>
        <p className="cw-training-state">{selected?.fireStatus || 'Preparing exercise…'}</p>
        <p>Strength {Math.round(selected?.strength || 0)} · Morale {Math.floor(selected?.morale || 0)} · Cohesion {Math.floor(selected?.cohesion || 0)} · Ammunition {selected?.ammunition ?? '—'}</p>
        {lesson.point && lesson.id!=='support' && <button disabled={!snapshot || complete || selectedId!==TRAINING_A} onClick={()=>field.current?.destination(lesson.point)}>Preview move to practice marker</button>}
        {destination && <section aria-label="Practice move preview"><p>Destination {destination.x}, {destination.y}. The unit moves only after confirmation and running.</p><button onClick={()=>field.current?.confirmMove()}>Confirm move</button></section>}
        {lesson.id==='support' && <GroupOrders key={`${step}:${attempt}`} snapshot={snapshot} world={WORLD} plan={groupPlan} defaultIds={PAIR} defaultPoint={lesson.point} onPreview={r=>field.current?.previewGroup(r)} onConfirm={()=>field.current?.confirmGroup()} onCancel={()=>field.current?.cancelGroup()} />}
        <div className="cw-training-orders">{['hold','advance','fallback','rally'].map(order=><button disabled={!snapshot || complete || !selected?.active || (selected?.status==='routing' && order!=='rally')} key={order} onClick={()=>field.current?.order(order)}>{order}</button>)}</div>
        {recovery && <section aria-label="Practice rally requirements"><strong>{recovery.message}</strong><ul>{recovery.checks.map(c=><li key={c.label}>{c.met?'✓':'○'} {c.label}</li>)}</ul></section>}
        <section aria-label="Exercise checks" className="cw-training-checks"><h3>{complete?'Exercise completed':'Demonstrate these actions'}</h3><ul>{snapshot?.training?.checks.map(c=><li key={c.label}>{c.met?'✓':'○'} {c.label}</li>)}</ul>{complete && <p>Observed in this exercise. Continue when ready; the next exercise starts a fresh setup.</p>}</section>
      </aside>
      <div className="cw-training-map"><CivilWarBattlefield key={`${step}:${attempt}`} ref={field} scenarioId="gettysburg" campaignState={TRAINING_STATE} choiceId="option_a" trainingLesson={lesson.id} speed={speed} selectedId={selectedId} onSelect={setSelectedId} onSnapshot={onSnapshot} onDestination={onDestination} onGroupPreview={onGroupPreview} missionMarkers={false} />
        <div className="cw-training-camera"><button onClick={()=>field.current?.fit()}>Fit practice field</button><button onClick={()=>field.current?.focus()}>Focus selected</button></div>
      </div>
    </div>
    <footer><button onClick={()=>setSpeed(0)} aria-pressed={speed===0}>Pause exercise</button><button disabled={!snapshot || complete || Boolean(destination || groupPlan)} onClick={()=>setSpeed(2)} aria-pressed={speed===2}>Run exercise</button><span>Field time {Math.floor(snapshot?.time || 0)}</span><button onClick={()=>reset(step)}>Restart exercise</button><button className="cw-training-next" disabled={!complete} onClick={()=>step===COMMAND_LESSONS.length-1?onClose():reset(step+1)}>{step===COMMAND_LESSONS.length-1?'Finish training':'Next exercise'}</button></footer>
  </div>;
}
