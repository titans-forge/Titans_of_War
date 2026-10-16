import { readBattleDisplayPreferences } from '../battle/battleDisplayPreferences.js';
import { GettysburgJacksonMissionConditions } from './GettysburgJacksonMissionConditions.jsx';
import { getGettysburgJacksonMissionPresentation, presentGettysburgJacksonSnapshot } from '../battle/gettysburgJacksonMission.js';
import { TurnClearanceRecovery } from './TurnClearanceRecovery.jsx';
import { rememberTurnClearance, confirmTurnClearance, updateTurnClearance, turnClearanceResume, clearancePreviewMatches } from '../battle/turnClearanceRecovery.js';
import { practiceAmmunitionLabel } from '../game/practiceConditions.js';
import { battleLocations } from '../battle/battleLocations.js';
import { FormationReadinessCard, selectableRetreatBlocker } from './FormationReadinessCard.jsx';
import { siegeBrief, siegeCommand } from '../battle/siegeCommand.js';
import { withdrawalBrief, withdrawalCommand } from '../battle/withdrawalCommand.js';
import { WithdrawalGoals } from './WithdrawalGoals.jsx';
import { CHICKAMAUGA_PRESERVATION_BRIEF } from '../battle/chickamaugaPreservation.js';
import { SHILOH_RESERVE_BRIEF, shilohReserveConditions } from '../battle/shilohReserveObjective.js';
import { siegeTerrainGuide } from '../battle/siegeTerrainVisual.js';
import { landmarkField } from '../battle/historicalLandmarks.js';
import { henryHillConditions } from '../battle/henryHillObjective.js';
import { GroupOrders } from './GroupOrders.jsx';
import { rallyFeedback, objectiveFeedback, armyAttention } from '../battle/battleFeedback.js';
import { periodStandardFor } from '../battle/periodStandards.js';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, BookOpen, Check, ChevronLeft, ChevronRight, Crosshair, FastForward, Flag, Hand, HeartPulse, Maximize, Minus, MousePointer2, Pause, Plus, Shield, Swords, Undo2, X } from 'lucide-react';
import { CivilWarBattlefield } from '../battle/CivilWarBattlefield.jsx';
import { battleResultLabel } from '../game/battles.js';
import { BATTLE_OBJECTIVES, getBattleAssessment } from '../battle/battleAssessment.js';
import { canCommand } from '../battle/battleUsability.js';
import { getBattleEngineConfig } from '../battle/battleDefinitions.js';
import { combatEventLabel, compassHeading, formationStatusLabel } from '../battle/battleTactics.js';
import { BattleAudioManager } from '../engine/BattleAudioManager.js';
import { BATTLE_GUIDE_STORAGE_KEY, BATTLE_GUIDE_STEPS, battleGuideReducer, createBattleGuide, guideSpeed, reserveGuidance } from '../battle/battleGuide.js';
import { GETTYSBURG_STAGING_PLAN, getGettysburgCommandBrief, getGettysburgForceReport } from '../battle/gettysburgCommandBrief.js';
import '../battle/battleUsability.css';
import { fieldAttackPlanFor, fieldPlanStepStatus } from '../battle/fieldAttackPlans.js';
import { FIELD_BATTLE_PROFILES } from '../battle/fieldBattleProfiles.js';
import { assaultSectorPresentation } from '../battle/assaultSectorPresentation.js';

export function BattleMechanicsUpgrade({ battleId, snapshot, checkpoint = null, onUpgrade }) {
  // A suspended field retains its recorded rules, even when saved at time zero.
  // Upgrading its campaign inputs would invalidate the unchanged checkpoint.
  if (checkpoint != null || !snapshot || snapshot.time
    || !(battleId === 'gettysburg' ? snapshot.battleRulesVersion < 18 : snapshot.battleRulesVersion < 17 && FIELD_BATTLE_PROFILES[battleId])) return null;
  return <section className="cw-gettysburg-detail"><p>This saved campaign uses earlier field-command rules.</p><button onClick={onUpgrade}>Use updated battle mechanics</button><p>Only this battle uses the update; past results keep their recorded rules.</p></section>;
}

export function CivilWarBattleEncounter({ battle, campaignState, choiceId, onResolve, onClose, onSuspend, checkpoint = null, practice = false }) {
  const displayPreferences = useMemo(() => readBattleDisplayPreferences(checkpoint, battle.id), [checkpoint, battle.id]);
  const [upgradeGettysburg, setUpgradeGettysburg] = useState(false);
  const effectiveCampaignState = useMemo(() => upgradeGettysburg && checkpoint == null ? { ...campaignState, battleRulesVersion: battle.id === 'gettysburg' ? 18 : 17 } : campaignState, [campaignState, upgradeGettysburg, battle.id, checkpoint]);
  const battlefield = useRef(null);
  const [saveError, setSaveError] = useState('');
  const suspend = () => {
    setSpeed(0);
    try {
      const saved = battlefield.current?.checkpoint();
      if (!saved) throw new Error('The battlefield is still preparing. Please try again.');
      onSuspend(saved, effectiveCampaignState);
    } catch (error) { setSaveError(`Battle not saved: ${error.message}`); }
  };
  const battleAudio = useRef(null);
  const [battleSound, setBattleSound] = useState(false);
  useEffect(() => {
    const manager = new BattleAudioManager();
    battleAudio.current = manager;
    return () => { manager.dispose(); battleAudio.current = null; };
  }, []);
  const overlay = useRef(null);
  const inspectorDetails = useRef(null);
  const leaveDialog = useRef(null);
  const closeButton = useRef(null);
  const guideButton = useRef(null);
  const guidePanel = useRef(null);
  const guideHeading = useRef(null);
  const wasGuideOpen = useRef(false);
  const wasLeaving = useRef(false);
  const [guide, dispatchGuide] = useReducer(battleGuideReducer, campaignState, (state) => {
    let seen = false;
    try { seen = window.localStorage.getItem(BATTLE_GUIDE_STORAGE_KEY) === '1'; } catch { /* Storage is optional in private or embedded play. */ }
    return createBattleGuide(seen, state?.battleCampaign?.results);
  });
  const [leaving, setLeaving] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [wideField, setWideField] = useState(false);
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 700px)').matches);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 700px)');
    const update = () => setCompact(query.matches);
    query.addEventListener('change', update);
    update(); // Catch a viewport change between the initial render and subscription.
    return () => query.removeEventListener('change', update);
  }, []);
  const inspectorExpanded = inspectorOpen || guide.open;
  const wideActive = wideField && !compact && !inspectorExpanded;
  const [inputMode, setInputMode] = useState('move');
  const [showRange, setShowRange] = useState(() => displayPreferences.fireArc);
  const [zoom, setZoom] = useState(1);
  const [destination, setDestination] = useState(null);
  const [clearanceRecords, setClearanceRecords] = useState({});
  const pausedClearance = useRef(new WeakSet());
  const [speed, setSpeed] = useState(0);
  const [assaultSectorDrafts, setAssaultSectorDrafts] = useState({});
  const rememberAssaultSector = (id, value) => {
    if (!id) return;
    setAssaultSectorDrafts(previous => ({ ...previous, [id]: value }));
  };
  const [terrainOverlay, setTerrainOverlay] = useState(() => displayPreferences.tacticalOverlay);
  const [briefOpen, setBriefOpen] = useState(false);
  const [missionMarkers, setMissionMarkers] = useState(() => displayPreferences.missionMarkers);
  useEffect(() => {
    const pauseWhenHidden = () => { if (document.hidden) { setSpeed(0); battleAudio.current?.update([], { paused: true, enabled: false, speed: 0 }); } };
    document.addEventListener('visibilitychange', pauseWhenHidden);
    return () => document.removeEventListener('visibilitychange', pauseWhenHidden);
  }, []);

  const [selectedId, setSelectedId] = useState(() => siegeBrief(battle.id, choiceId, effectiveCampaignState?.battleRulesVersion)?.selection || battle.defaultSelection);
  const [snapshot, setSnapshot] = useState(null);
  const locations = useMemo(() => battleLocations(snapshot), [snapshot]);
  const [locationChoice, setLocationChoice] = useState('');
  const [markedLocation, setMarkedLocation] = useState(null);
  const locateMenu = useRef(null);
  const locateButton = useRef(null);
  const locate = id => {
    const site = locations.find(site => site.id === id);
    if (!site || !battlefield.current?.locate(id)) return;
    setSpeed(0); setInspectorOpen(false); setMarkedLocation(site); setLocationChoice(id);
    if (locateMenu.current) locateMenu.current.open = false;
    locateButton.current?.focus();
  };
  const [groupPlan,setGroupPlan] = useState(null);
  const reviewingOrder = Boolean(destination || groupPlan);
  const onGroupPreview=useCallback(plan=>{setGroupPlan(plan);if(plan){setSpeed(0);if(!plan.placing)setInspectorOpen(true);}},[]);
  const onSnapshot = useCallback((next) => setSnapshot(presentGettysburgJacksonSnapshot(next, choiceId)), [choiceId]);
  const onDestination = useCallback((point) => {
    setDestination(point);
    setClearanceRecords(previous => {
      const entries = Object.entries(previous).filter(([, record]) => record.phase !== 'preview' || clearancePreviewMatches(record, point));
      return entries.length === Object.keys(previous).length ? previous : Object.fromEntries(entries);
    });
    if (point) setSpeed(0);
  }, []);
  const selected = useMemo(() => snapshot?.formations.find((formation) => formation.id === selectedId), [snapshot, selectedId]);
  const selectFromRoster = (id) => { setMarkedLocation(null); setSelectedId(id); battlefield.current?.selectAndFocus(id); };
  const attention = useMemo(()=>armyAttention(snapshot),[snapshot]);
  const recovery = rallyFeedback(selected);
  const objectiveReports = useMemo(() => objectiveFeedback(snapshot, selectedId), [snapshot, selectedId]);
  const mission = BATTLE_OBJECTIVES[battle.id]?.[choiceId];
  const withdrawalOrders = siegeBrief(battle.id, choiceId, effectiveCampaignState?.battleRulesVersion) || withdrawalBrief(battle.id, choiceId, effectiveCampaignState?.battleRulesVersion);
  const fieldOrders = withdrawalOrders?.orders || (battle.id === 'chickamauga' && ['option_c', 'option_d'].includes(choiceId) && effectiveCampaignState?.battleRulesVersion >= 15 ? CHICKAMAUGA_PRESERVATION_BRIEF : battle.id === 'shiloh' && choiceId === 'option_b' && effectiveCampaignState?.battleRulesVersion >= 14 ? SHILOH_RESERVE_BRIEF : battle.id === 'gettysburg' && effectiveCampaignState?.battleRulesVersion >= 3 ? ['Advance forms a firing line; Assault commits infantry to the marked ridge.', 'Use the reserve to support a breach. Two uncontested sectors must hold for 18 field minutes.', 'Fallback moves back 135 while returning slow fire. Rally needs 285 separation, safety from enemy fire, and friendly support within 340.', 'Withdraw uses a rear exit or leaves the engagement after 220 field units, including 180 toward the rear, once safely clear of enemy fire. Fallback keeps troops available. Routed troops keep retreating unless you explicitly order Rally. Guns need 5 field minutes to limber and 4 to deploy.'] : battle.fieldOrdersByChoice?.[choiceId] || []);
  const assessment = useMemo(() => snapshot ? getBattleAssessment(snapshot, choiceId) : null, [snapshot, choiceId]);
  const jacksonMission = useMemo(() => getGettysburgJacksonMissionPresentation(snapshot, choiceId), [snapshot, choiceId]);
  const completed = snapshot?.outcome && snapshot.outcome !== 'undecided';
  const resolving = Boolean(snapshot?.resolving);
  const orderlyExit = (snapshot?.decision || snapshot?.outcome) === 'disciplined-withdrawal';
  const disabled = resolving || completed || !canCommand(selected);
  const gettysburg = Boolean(snapshot?.gettysburg);
  const fieldBattle = snapshot?.fieldBattle && withdrawalOrders ? { ...snapshot.fieldBattle, subtitle: withdrawalOrders.title, advice: withdrawalOrders.orders } : snapshot?.fieldBattle;
  const withdrawalStatus = withdrawalCommand(snapshot, choiceId);
  const siegeStatus = siegeCommand(snapshot, choiceId);
  const groundGuide = fieldBattle ? siegeTerrainGuide(battle.id) : null;
  const tactical = gettysburg || Boolean(fieldBattle);
  const attackObjective = fieldBattle?.attackObjective;
  const defenseObjective = fieldBattle?.defenseObjective;
  const commandSectors = snapshot?.gettysburg?.sectors || fieldBattle?.sectors || [];
  const assaultSector = assaultSectorPresentation(selected, commandSectors, assaultSectorDrafts[selectedId]);
  const canRally = tactical && !resolving && !completed && selected?.active && !['broken', 'surrendered'].includes(selected?.status);
  useEffect(() => {
    if (!snapshot) return;
    setClearanceRecords(previous => {
      const next = Object.fromEntries(Object.entries(previous).map(([id, record]) => [id, updateTurnClearance(record, snapshot)]).filter(([, record]) => record));
      return Object.keys(next).length === Object.keys(previous).length && Object.entries(next).every(([id, record]) => record === previous[id]) ? previous : next;
    });
  }, [snapshot]);
  useEffect(() => {
    for (const record of Object.values(clearanceRecords)) {
      if (['ready', 'waiting'].includes(record.phase) && !pausedClearance.current.has(record)) {
        pausedClearance.current.add(record);
        setSpeed(0);
      }
    }
  }, [clearanceRecords]);
  const forgetClearance = (id = selectedId) => setClearanceRecords(previous => {
    if (!previous[id]) return previous;
    const next = { ...previous }; delete next[id]; return next;
  });
  const issueUnitOrder = (order, point) => { forgetClearance(); battlefield.current?.order(order, point); };
  const previewTurningRoom = () => {
    if (guide.open) closeGuide();
    const record = rememberTurnClearance(selected);
    setClearanceRecords(previous => { const next = { ...previous }; delete next[selectedId]; if (record) next[record.id] = record; return next; });
    battlefield.current?.destination(selected.readiness.turnClearance);
    setInspectorOpen(false);
  };
  const confirmDestination = () => {
    setClearanceRecords(previous => {
      const next = { ...previous }, record = confirmTurnClearance(previous[selectedId], destination);
      delete next[selectedId]; if (record) next[selectedId] = record; return next;
    });
    battlefield.current?.confirmMove();
  };
  const resumeSavedAttack = () => {
    const command = turnClearanceResume(clearanceRecords[selectedId], snapshot);
    if (disabled || reviewingOrder || !command) return;
    setSpeed(0); issueUnitOrder(command.order, command.point);
  };
  const selectedOrder = selected?.directMove ? 'move' : selected?.order;
  const commandOrder = selected?.pendingCommand?.order || selectedOrder;
  const commandOptions = tactical ? ['hold', 'advance', 'assault', 'fallback', 'rally', 'withdraw'] : ['hold', 'advance', 'volley', 'reform', 'withdraw'];
  const commandIcons = { hold: Shield, advance: ArrowUpRight, assault: Swords, fallback: Undo2, rally: HeartPulse, withdraw: Flag, volley: Crosshair, reform: HeartPulse };
  const commandDescriptions = { hold: 'Hold position and fire at threats in range.', advance: 'Close toward the enemy, then establish a firing line.', assault: 'Commit this infantry formation to the selected command sector.', fallback: 'Fall back a short distance, returning slow fire; remain available.', rally: 'Recover near friendly support after clearing enemy fire. Routed troops keep retreating until safe.', withdraw: 'Leave the battle permanently once clear of enemy fire.', volley: 'Hold position and fire when reloaded.', reform: 'Reform over 6 field minutes; no firing while reforming.' };
  const forceReport = useMemo(() => {
    const report = tactical ? getGettysburgForceReport(snapshot, assessment) : null;
    return report && jacksonMission ? { ...report, headline: 'Field result recorded', explanation: jacksonMission.resultRationale || report.explanation } : report;
  }, [tactical, snapshot, assessment, jacksonMission]);
  const commandBrief = fieldBattle ? { phase: completed ? 'After action' : snapshot.time ? snapshot.fieldStatus?.label || 'Field command' : 'Command phase · paused', message: snapshot.fieldStatus?.message || fieldBattle.advice[0] } : getGettysburgCommandBrief(snapshot, choiceId);
  const fieldAttackPlan = attackObjective ? fieldAttackPlanFor(battle.id, snapshot.battleRulesVersion) : null;
  const fieldStagingStep = fieldAttackPlan?.steps.find(step => step.id === selectedId);
  const stagingStep = GETTYSBURG_STAGING_PLAN.find(step => step.id === selectedId);
  const world = getBattleEngineConfig(battle.id).world;
  useEffect(() => {
    battleAudio.current?.update(snapshot?.combatEvents || [], {
      enabled: battleSound, paused: leaving || guide.open || completed || !speed,
      speed: guideSpeed(guide, speed), volume: 0.35, listener: { x: selected?.x ?? world.width / 2 }, worldWidth: world.width,
    });
  }, [snapshot, battleSound, leaving, guide.open, speed, selected?.x, world.width, completed]);
  const activeGuideStep = BATTLE_GUIDE_STEPS[guide.step];
  const closeGuide = useCallback(() => {
    dispatchGuide('dismiss');
    setSpeed(0);
    try { window.localStorage.setItem(BATTLE_GUIDE_STORAGE_KEY, '1'); } catch { /* Dismissal still works without storage. */ }
  }, []);
  const selectRetreatBlocker = (id, formationId) => {
    if (resolving || completed || reviewingOrder || selected?.id !== formationId) return;
    const blocker = selectableRetreatBlocker(selected, snapshot, id);
    if (!blocker) return;
    if (guide.open) closeGuide();
    setSpeed(0);
    selectFromRoster(blocker.id);
    setInspectorOpen(true);
  };
  const changeSpeed = (value) => {
    if(value>0 && reviewingOrder)return;
    if (value > 0 && battleSound) void battleAudio.current?.unlock();
    if (value > 0 && guide.open) closeGuide();
    setSpeed(value);
  };
  const openBrief = () => { if (guide.open) closeGuide(); setSpeed(0); setBriefOpen(true); setInspectorOpen(true); };
  const requestClose = useCallback(() => {
    setSpeed(0);
    setLeaving(true);
  }, []);

  useEffect(() => {
    const root = overlay.current;
    const previousFocus = document.activeElement;
    const siblings = [];
    for (let node = root; node?.parentElement; node = node.parentElement) {
      for (const sibling of node.parentElement.children) {
        if (sibling !== node) { siblings.push([sibling, sibling.inert]); sibling.inert = true; }
      }
    }
    root.focus();
    const trap = (event) => {
      const scope = leaveDialog.current || root;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (scope !== root) setLeaving(false);
        else if (guidePanel.current) closeGuide();
        else requestClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const controls = [...scope.querySelectorAll('button:not(:disabled), select, input:not(:disabled), summary, [tabindex="0"]')].filter((element) => element.getClientRects().length && !element.closest('[inert]'));
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === scope)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === scope)) { event.preventDefault(); first?.focus(); }
    };
    root.addEventListener('keydown', trap);
    return () => {
      root.removeEventListener('keydown', trap);
      for (const [sibling, inert] of siblings) sibling.inert = inert;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [requestClose, closeGuide]);

  useEffect(() => {
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  useEffect(() => {
    if (leaving) leaveDialog.current?.querySelector('button')?.focus();
    else if (wasLeaving.current) closeButton.current?.focus();
    wasLeaving.current = leaving;
  }, [leaving]);

  useEffect(() => {
    if (guide.open) guideHeading.current?.focus();
    else if (wasGuideOpen.current) guideButton.current?.focus();
    wasGuideOpen.current = guide.open;
  }, [guide.open, guide.step]);

  const finish = () => {
    if (!completed) return;
    onResolve({
      battleId: battle.id,
      scenarioId: battle.scenarioId,
      result: snapshot.outcome,
      score: snapshot.score,
      choiceId,
      battleRulesVersion: snapshot.battleRulesVersion || 1,
      enemyDoctrineLabel: snapshot.fieldBattle?.coordination?.label,
      assessment: getBattleAssessment(snapshot, choiceId),
      confederateLossRate: snapshot.confederateLossRate,
      unionLossRate: snapshot.unionLossRate,
      commanderStatus: snapshot.commanderStatus,
      delegated: false,
    });
  };

  const mapOptions = <>
    {compact && <div className="cw-locator-zoom"><button onClick={() => battlefield.current?.zoom(0.1)} title="Zoom in" aria-label="Zoom in"><Plus /></button><button onClick={() => battlefield.current?.zoom(-0.1)} title="Zoom out" aria-label="Zoom out"><Minus /></button></div>}
<label className="cw-range-toggle"><input type="checkbox" checked={showRange} onChange={(event) => { setShowRange(event.target.checked); battlefield.current?.range(event.target.checked); }} />{snapshot?.battleRulesVersion >= 2 ? 'Fire arc' : 'Range'}</label>
            {tactical && <label className="cw-range-toggle"><input type="checkbox" checked={missionMarkers} onChange={event => setMissionMarkers(event.target.checked)} />Mission markers</label>}
            {tactical && <label className="cw-range-toggle"><input type="checkbox" title="Show command sectors, rear exits, cover, and movement zones" checked={terrainOverlay} onChange={event => setTerrainOverlay(event.target.checked)} />Tactical overlay</label>}
            <label className="cw-range-toggle"><input type="checkbox" checked={battleSound} onChange={(event) => { setBattleSound(event.target.checked); if (event.target.checked) void battleAudio.current?.unlock(); }} />Battle sound</label>
  </>;

  return (
    <div ref={overlay} tabIndex={-1} className={`cw-battle-overlay cw-tactical${tactical ? ' cw-gettysburg-command' : ''}`} role="dialog" aria-modal="true" aria-label={battle.title}>
      <header className="cw-battle-header" inert={leaving}>
        <div><p className="cw-battle-eyebrow">Titans of War · Field command</p><h2>{battle.title}</h2><span>{battle.date}</span></div>
        <div className="cw-battle-objective"><strong>{completed ? assessment?.evidence.find(item => item.label === 'Field outcome')?.value || battleResultLabel(snapshot.outcome) : resolving ? 'The field is decided' : assessment?.objective.label || mission?.label || 'Follow your selected strategy'}</strong><small>{completed ? `Command ${assessment?.commandScore ?? snapshot.score} · Confederate losses ${Math.round(snapshot.confederateLossRate * 100)}%${snapshot.commanderStatus ? ` · Commander ${snapshot.commanderStatus}` : ''}` : resolving ? tactical ? 'The tactical state is preserved while the result is recorded.' : orderlyExit ? 'The army is preserved. The remaining rearguard withdraws while Union formations hold the field.' : 'The victors hold while the defeated formations leave the field.' : battle.context}</small></div>
        <div className="cw-battle-header-actions">
          {[0, 1, 2, 4].map((value) => <button key={value} aria-pressed={guideSpeed(guide, speed) === value} className={guideSpeed(guide, speed) === value ? 'active' : ''} onClick={() => changeSpeed(value)} disabled={resolving || completed || (value>0 && reviewingOrder)} title={value === 0 ? 'Pause battle' : `Run battle at ${value} times speed`} aria-label={value === 0 ? 'Pause battle' : `Run battle at ${value} times speed`}>{value === 0 ? <Pause /> : value === 4 ? <FastForward /> : `${value}x`}</button>)}
          <button ref={guideButton} aria-expanded={guide.open} aria-controls="cw-battle-guide" disabled={resolving} onClick={() => { if (guide.open) closeGuide(); else { setSpeed(0); dispatchGuide('open'); } }} title="Battle guide" aria-label="Battle guide"><BookOpen /></button>
          <button ref={closeButton} onClick={requestClose} title="Leave battle" aria-label="Leave battle"><X /></button>
        </div>
      </header>
      <div className="cw-battle-stage" data-wide={wideActive} inert={leaving}>
        <aside className="cw-formation-inspector" data-expanded={inspectorExpanded}>
          <div className="cw-inspector-summary">
          
          <label className="cw-roster">Formation roster<select value={selectedId || ''} onChange={(event) => selectFromRoster(event.target.value)}>{snapshot?.formations.filter((unit) => unit.side === 'confederate').map((unit) => <option key={unit.id} value={unit.id}>{unit.name} - {formationStatusLabel(unit)}</option>)}</select></label>
          <button className="cw-inspector-toggle" aria-controls="cw-inspector-details" aria-expanded={inspectorExpanded} onClick={() => { if (guide.open) closeGuide(); setInspectorOpen(!inspectorExpanded); if(!inspectorExpanded)requestAnimationFrame(()=>inspectorDetails.current?.scrollTo({top:0})); setSpeed(0); }}>{inspectorExpanded ? 'Close details' : 'Formation details'}{attention.length>0 && <small> · {attention.length} warnings</small>}</button>
          </div>
          <p className="cw-mobile-unit-summary">{selected?.active ? `${Math.round(selected.strength)} troops · ${selected.inMelee ? 'Close combat' : selected.order === 'rally' ? 'Rallying' : selected.condition || formationStatusLabel(selected)} · ${Math.round(selected.cohesion)}% cohesion · ${selected.ammunition} volleys` : selected?.withdrawn ? formationStatusLabel(selected) : selected?.arrivalTime != null ? `Arrives in ${Math.max(0, Math.ceil(selected.arrivalTime - (snapshot?.time || 0)))}` : 'Not on field'}</p>
          <div ref={inspectorDetails} id="cw-inspector-details" className="cw-inspector-details">
          <div className="cw-formation-modes" role="group" aria-label="Formation order">
            {['line', 'column', 'skirmish'].map((mode) => <button key={mode} aria-pressed={selected?.formationMode === mode} className={selected?.formationMode === mode ? 'active' : ''} onClick={() => { forgetClearance(); battlefield.current?.formation(mode); }} disabled={disabled || selected?.type === 'artillery'}>{mode}</button>)}
          </div>
          {snapshot?.battleRulesVersion >= 2 && <details className="cw-fire-control" aria-label="Facing and target control" open={compact || undefined}>
            <summary>Front and target <span>{compassHeading(selected?.facing || 0)} · {selected?.focusTargetId ? 'Focused target' : selected?.tactics?.frontLocked ? 'Fixed front' : 'Automatic'}</span></summary>
            <p role="status">Current front {compassHeading(selected?.facing || 0)} · {selected?.focusTargetId ? `Tracking selected target: ${snapshot.formations.find(unit => unit.id === selected.focusTargetId)?.name || selected.focusTargetId}` : selected?.tactics?.frontLocked ? `Ordered front ${compassHeading(selected.tactics.desiredFacing)}` : 'Automatic targeting'}{selected?.tactics?.turning ? ` · ${guideSpeed(guide, speed) ? 'Turning toward' : 'Turn pending toward'} ${compassHeading(selected.tactics.desiredFacing)}` : ''} · {selected?.tactics?.arcDegrees}° fire arc</p>
            <div className="cw-facing-buttons" role="group" aria-label="Face direction">
              {[['NW', -135], ['N', -90], ['NE', -45], ['W', 180], ['E', 0], ['SW', 135], ['S', 90], ['SE', 45]].map(([label, degrees]) => <button key={label} disabled={disabled} aria-pressed={selected?.tactics?.frontLocked && compassHeading(selected.tactics.desiredFacing) === label} title={`Face ${label}; hold position and fix this front`} onClick={() => { forgetClearance(); battlefield.current?.face(degrees * Math.PI / 180); setShowRange(true); }}>Face {label}</button>)}
            </div>
            <label>Focus fire<select disabled={disabled} value={selected?.focusTargetId || ''} onChange={(event) => { forgetClearance(); battlefield.current?.target(event.target.value || null); setShowRange(true); }}>
              <option value="">Automatic threats</option>
              {snapshot.formations.filter(unit => unit.side === 'union' && unit.active && unit.status !== 'broken' && unit.strength > 0 && unit.x >= 0 && unit.x <= world.width && unit.y >= 0 && unit.y <= world.height).map(unit => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
            </select></label>
            <button disabled={disabled} onClick={() => { forgetClearance(); battlefield.current?.target(null); setShowRange(true); }}>Automatic targeting</button>
            <p>Infantry fire within a 120° arc; guns use 90°. Turning takes time. The gold arrow is the firing front. {snapshot?.gettysburg ? 'The ridge masks its reverse slope; friendly formations block the line of fire.' : fieldBattle ? 'Friendly formations block firing lanes; the battle’s visibility limit still applies.' : 'No line-of-sight blocking is modeled.'}</p>
            <p>Face holds a fixed front. Focus fire holds position and turns toward that enemy; it does not chase. Hold or Automatic targeting prioritizes threats already in the arc, otherwise turns toward the nearest.</p>
          </details>}
          {practice && <p className="cw-practice-conditions">Practice · {practiceAmmunitionLabel(effectiveCampaignState)}</p>}
          {tactical && <details className="cw-army-attention" open={attention.some(a=>a.priority>=3) || undefined}><summary>Army attention · {attention.length}</summary>{attention.length ? attention.map(a=><button key={a.id} onClick={()=>{setSpeed(0);setSelectedId(a.id);setInspectorOpen(true);}}><strong>{a.name} · {a.reason}</strong><span>{a.advice}</span></button>):<p>No urgent formation warnings.</p>}</details>}
          {guide.open && <section ref={guidePanel} id="cw-battle-guide" className="cw-battle-guide" aria-labelledby="cw-guide-title">
            <div className="cw-guide-heading"><span>Battle guide {guide.step + 1} / {BATTLE_GUIDE_STEPS.length} · Paused</span><button onClick={closeGuide} title="Dismiss battle guide" aria-label="Dismiss battle guide"><X /></button></div>
            <h3 ref={guideHeading} id="cw-guide-title" tabIndex={-1}>{activeGuideStep.title}</h3>
            <p>{activeGuideStep.text}</p>
            {guide.step === 3 && <p className="cw-guide-reserve">{reserveGuidance(snapshot?.formations, snapshot?.time)}</p>}
            <nav aria-label="Battle guide steps"><button onClick={() => dispatchGuide('back')} disabled={guide.step === 0} title="Previous guide step" aria-label="Previous guide step"><ChevronLeft /></button><button onClick={() => { if (guide.step === BATTLE_GUIDE_STEPS.length - 1) closeGuide(); else dispatchGuide('next'); }}>{guide.step === BATTLE_GUIDE_STEPS.length - 1 ? <Check /> : <ChevronRight />}{guide.step === BATTLE_GUIDE_STEPS.length - 1 ? 'Done' : 'Next'}</button></nav>
          </section>}
          {!completed && <WithdrawalGoals report={assessment?.withdrawalGoals} />}
          <BattleMechanicsUpgrade battleId={battle.id} snapshot={snapshot} checkpoint={checkpoint} onUpgrade={() => { if (checkpoint != null) return; setSpeed(0); setUpgradeGettysburg(true); }} />
          {landmarkField(snapshot)?.landmarks?.length > 0 && <details className="cw-gettysburg-detail cw-historical-landmarks">
            <summary>Battlefield landmarks · {landmarkField(snapshot).landmarks.map(site => site.name).join(', ')}</summary>
            <p>Buildings block movement and direct fire for both armies. Leave turning room beside them. The terrain overlay outlines their occupied ground; there is no garrison or healing bonus.</p>
            {landmarkField(snapshot).landmarks.map(site => <p key={site.id}><strong>{site.name}.</strong> <button className="cw-landmark-locate" onClick={() => { locate(`Landmark:${site.id}`); }}>View {site.name}</button>{site.note} <a href={site.source} target="_blank" rel="noreferrer">Historical reference</a></p>)}
            <p>Illustrative reconstructions on a compressed battlefield. Building scale and placement serve this battle’s playable layout.</p>
          </details>}
          {groundGuide && <details className="cw-gettysburg-detail cw-historical-ground">
            <summary>Terrain & history · {groundGuide.title}</summary>
            <p>{groundGuide.history} <a href={groundGuide.source} target="_blank" rel="noreferrer">Historical ground reference</a></p>
            <p>{groundGuide.tactics}</p>
            {battle.id === 'petersburg' && snapshot.battleRulesVersion < 12 && <p>This saved battle retains the earlier road bonus through part of the Crater. Use updated battle mechanics before starting to apply the corrected basin movement.</p>}
            {snapshot.entrenchmentState === 'abandoned' && <p>This opening abandons the prepared defense; the works offer reduced protection.</p>}
            <p>Use the tactical overlay for exact terrain boundaries. Earthworks can be crossed. Positions and scale are representative.</p>
          </details>}
          {gettysburg && <details className="cw-command-brief" open={briefOpen} onToggle={event => setBriefOpen(event.currentTarget.open)}>
            <summary>Command brief <span>{choiceId === 'option_a' ? 'Prepare · Support · Commit' : 'Screen · Disengage · Preserve'}</span></summary>
            <p>The battle begins paused. Your campaign choice sets the mission; formations await individual orders.</p>
            <ObjectiveConditions reports={objectiveReports} selectedName={selected?.name} ridge={gettysburg} />
            <p>{commandBrief.message}</p>
            <ol>{(choiceId === 'option_a' ? [
              ['Prepare the approach', 'Select each formation from the roster. Use Move to preview and confirm a position; moving troops do not fire. Keep the guns’ firing lane clear.'],
              ['Build local support', 'Bring infantry forward as a connected line. Watch cohesion and suppression. A lone brigade is easier to pin and break.'],
              ['Commit and reinforce', 'Choose a ridge sector, then Assault with the selected formation. Keep another brigade near enough to support it and extend the foothold into a second sector.'],
              ['Hold or recover', 'Both sectors must remain uncontested with supported infantry. Use Fallback before collapse and Rally only after reaching safety near a friend.'],
            ] : [
              ['Keep a screen', 'Use Hold or Fallback with one formation while others retire. Fallback keeps troops on the field.'],
              ['Withdraw in order', 'Withdraw sends the selected formation toward safety. Guns need time to limber; cover them while they move.'],
              ['Preserve the army', 'At least 70% of the starting force must leave in order. Routed survivors still survive, but do not count toward an organized withdrawal.'],
            ]).map(([title, detail]) => <li key={title}><strong>{title}</strong><span>{detail}</span></li>)}</ol>
            {choiceId === 'option_a' && <section className="cw-staging-reference" aria-label="Optional supported breach plan">
              <h4>Try a supported breach</h4><p>Use Line formation for all four infantry units. Stage two pairs toward Cemetery Ridge and The Angle, leaving a gap between Pettigrew and Trimble for Alexander’s guns. Focus the battery on Cushing and check that ammunition is being spent: a blocked firing lane cannot prepare the assault. After supporting fire, pause and order each pair to Assault its sector together. Watch Hancock’s reserve and your remaining ammunition.</p>
              <p>If Trimble retreats, the Angle may lose its support. Bring a healthy center formation closer while keeping it on Cemetery Ridge; a position near 900, 375 can reconnect the foothold. Check the selected formation’s support distance before moving.</p>
              <div className="cw-staging-list">{GETTYSBURG_STAGING_PLAN.map(step => <button key={step.id} aria-pressed={selectedId === step.id} onClick={() => { setSelectedId(step.id); if (step.sectorId) rememberAssaultSector(step.id, step.sectorId); setSpeed(0); }}><strong>{step.label}</strong><span>{step.x}, {step.y} · {step.role}</span></button>)}</div>
              <button className="cw-preview-staging" disabled={disabled || !stagingStep} onClick={() => { if (guide.open) closeGuide(); battlefield.current?.destination({ x: stagingStep.x, y: stagingStep.y }); setInspectorOpen(false); }}><MousePointer2 />Preview staging move</button>
              <p>Applies to the selected formation only. Confirm its destination on the map. This is an opening to practice; its success still depends on the troops and the fight.</p>
            </section>}
            <p className="cw-brief-reminder">Queue orders while paused, then resume at 1×. A new order replaces the selected formation’s pending order.</p>
            <p>Union reserve: {snapshot.gettysburg.reserveIntent}. Time remaining: {Math.max(0, Math.ceil(240 - snapshot.time))} field minutes.</p>
          </details>}
          {fieldBattle && <details className="cw-command-brief" open={briefOpen} onToggle={event => setBriefOpen(event.currentTarget.open)}>
            <summary>Command brief <span>{fieldBattle.subtitle}</span></summary>
            {siegeStatus?.targets.length > 0 && <section aria-label="Sortie target checklist"><h4>Siege targets</h4><p>Illustrative supply and engineer yards. Worn tracks connect the sites; tactical cover and movement remain as marked on the overlay.</p>{siegeStatus.targets.map(target => <div key={target.id} className="cw-sortie-target"><span>{target.hit ? '✓ Struck' : 'Not yet struck'} · {target.name}</span><button type="button" onClick={() => { locate(`Objective:${target.id}`); }} aria-label={`View ${target.name}`}>View</button></div>)}</section>}
            <ObjectiveConditions reports={objectiveReports} selectedName={selected?.name} ridge={false} />
            {snapshot.fieldBattle?.reserveObjective && <section className="cw-objective-conditions" aria-label="Shiloh reserve requirements"><h4>Command reserve · hold through minute 128</h4><p>At minute 48, Sherman and McClernand attempt a limited advance. Keep the front connected and Breckinridge in support.</p><ul>{shilohReserveConditions(snapshot.fieldBattle.reserveObjective).map(condition => <li key={condition.label}><strong>{condition.satisfied ? '✓ ' : '○ '}{condition.label}</strong>: {condition.detail}</li>)}</ul><p>Organized troops need morale 30, cohesion 25 and surviving strength. Direct moves, Rally, Fallback and Withdraw do not count while those orders are active. Keep the conditions intact for the final eight field minutes; early withdrawal preserves survivors but misses this mission.</p></section>}
          {snapshot.thirdWinchester && <section className="cw-objective-conditions" aria-label="Winchester withdrawal requirements">
              <h4>Covered withdrawal checkpoints</h4>
              <p>Earn either {getBattleEngineConfig(battle.id).middleFieldHoldRequired} field minutes with two infantry formations defending Middle Field under pressure, or {getBattleEngineConfig(battle.id).rearguardHoldRequired} with Gordon or Wharton covering other retiring troops. Cover time accumulates; it does not reset.</p>
              <p>Then bring at least 65% of the starting force through the lower-left corridor in order, including Gordon or Wharton. Withdraw takes the selected formation toward this exit.</p>
              <ul><li>Middle Field: {snapshot.thirdWinchester.middleFieldHeld.toFixed(1)} / {getBattleEngineConfig(battle.id).middleFieldHoldRequired}</li><li>Rearguard: {snapshot.thirdWinchester.rearguardHeld.toFixed(1)} / {getBattleEngineConfig(battle.id).rearguardHoldRequired}</li><li>Organized corridor escape: {Math.round(snapshot.thirdWinchester.escapedRatio * 100)}% / 65%</li><li>Gordon or Wharton escaped in order: {snapshot.thirdWinchester.rearguardSurvived ? 'Yes' : 'Not yet'}</li></ul>
            </section>}
            <p>{attackObjective ? assessment?.objective.label : mission?.label}</p>
            {!attackObjective && <p>Sector colors show organized troops present. Mission success also requires the specific covering, timing or withdrawal conditions below.</p>}
            <ol>{fieldBattle.advice.map((detail, index) => <li key={detail}><strong>Step {index + 1}</strong><span>{detail}</span></li>)}</ol>
            <p>Move previews and confirms a destination without firing. Advance closes into firing range; Assault commits infantry to a command sector. Keep supporting formations within 340 field units.</p>
            <p>Fallback keeps troops available. Rally needs safety from enemy fire, nearby support and a ten-minute recovery interval. Withdraw sends troops to their own rear; guns need five minutes to limber and four to deploy.</p>
            <p>{fieldBattle.requireExitIds.length ? 'The mission’s designated retiring formations must reach a marked exit. They cannot leave early by distance alone.' : 'Troops may leave after 220 field units of retreat, including 180 toward their own rear, once clear of enemy fire.'}</p>
            <p>{attackObjective ? `Assault presses defenders inside the marked objective. Two supporting infantry must hold ${attackObjective.name} clear for eight uninterrupted field minutes; the timer resets when support breaks or an organized enemy returns.` : 'Command sectors show where troops are standing and where Assault will go. Complete the mission conditions above; occupying a sector alone is not a victory.'}</p>
            {fieldAttackPlan && <section className="cw-staging-reference" aria-label="Optional supported attack plan">
              <h4>Optional opening plan</h4><p>{fieldAttackPlan.instruction}</p>{fieldBattle.coordination && <p>Enemy coordination changes the timing of this opening. Scout the reserve movement and adapt the plan; the example is not an automatic winning sequence.</p>}
              <p>{fieldAttackPlan.followUp || 'Select each formation, set Line, preview its staging move and confirm. Orders remain yours to issue.'}</p>
              <div className="cw-staging-list">{fieldAttackPlan.steps.map(step => <button key={step.id} disabled={!snapshot.formations.some(unit => unit.id === step.id && unit.active)} aria-pressed={selectedId === step.id} onClick={() => { setSelectedId(step.id); rememberAssaultSector(step.id, attackObjective.id); setSpeed(0); }}><strong>{step.label}</strong><span>{step.x}, {step.y} · {fieldPlanStepStatus(snapshot, step)}</span></button>)}</div>
              {['first_manassas', 'shiloh'].includes(battle.id) && snapshot.battleRulesVersion >= 17 && <button className="cw-preview-staging" disabled={!fieldStagingStep} onClick={() => locate(`Plan:${fieldStagingStep.id}`)}>View staging position</button>}
              <button className="cw-preview-staging" disabled={disabled || !fieldStagingStep} onClick={() => { if (guide.open) closeGuide(); battlefield.current?.destination({ x: fieldStagingStep.x, y: fieldStagingStep.y }); setInspectorOpen(false); }}><MousePointer2 />Preview staging move</button>
            </section>}
            {fieldBattle.coordination && <p>Union command approach: {fieldBattle.coordination.label}. Watch for reserve shifts and protect the attacking force’s flanks.</p>}
            <p>Latest dispatch: {fieldBattle.reserveIntent}</p>
            <p>Time remaining: {Math.max(0, Math.ceil((fieldBattle.missionDeadline ?? getBattleEngineConfig(battle.id).maxTime) - snapshot.time))} field minutes.</p>
          </details>}
          <h3>{selected?.name || 'Confederate force'}</h3>
          <div className="cw-unit-state" role="status">{selected?.active ? `${selected.inMelee ? 'Close combat' : selected.order} / ${formationStatusLabel(selected)}` : selected?.withdrawn ? formationStatusLabel(selected) : selected?.arrivalBlocked ? 'Arrival waiting: clear the deployment area' : selected?.arrivalTime != null ? `Arrival in ${Math.max(0, Math.ceil(selected.arrivalTime - (snapshot?.time || 0)))} field minutes` : 'Not on field'}{selected?.order === 'reform' ? ` (${selected.reformRemaining.toFixed(1)} remaining)` : ''}</div>
          <div className="cw-unit-vitals">
          <div className="cw-formation-stat"><span>Strength</span><strong>{selected ? `${Math.round(selected.strength)} / ${selected.initialStrength}` : '—'}</strong></div>
          <div className="cw-formation-stat"><span>Cohesion</span><strong>{Math.round(selected?.cohesion || 0)}%</strong></div>
          <div className="cw-formation-stat"><span>Morale</span><strong>{Math.round(selected?.morale || 0)}%</strong></div>
          <div className="cw-formation-stat"><span>Ammunition</span><strong>{selected ? `${selected.ammunition} / ${selected.initialAmmunition}` : '—'}</strong></div>
          </div>
          <details className="cw-secondary-stats"><summary>Fatigue, reload and terrain</summary>
          <div className="cw-formation-stat"><span>Reload</span><strong>{selected?.ammunition === 0 ? 'Ammo out' : selected?.reload > 0 ? `${selected.reload.toFixed(1)} remaining` : 'Ready'}</strong></div>
          <div className="cw-formation-stat"><span>Fatigue</span><strong>{Math.round(selected?.fatigue || 0)}%</strong></div>
          {selected?.terrainName && <div className="cw-formation-stat"><span>Ground</span><strong>{selected.terrainName}</strong></div>}
          <div className="cw-formation-stat"><span>Cover / movement</span><strong>{selected ? `${selected.defenseMultiplier.toFixed(2)}x / ${selected.movementMultiplier.toFixed(2)}x` : '—'}</strong></div>
          <div className="cw-formation-stat"><span>Firing range</span><strong>{selected?.firingRange ?? '—'}</strong></div>
          </details>
          <p className="cw-command-explainer">Move follows a destination without firing. Advance engages enemies along the way. Hold fires at enemies in range. Enemy contact causes close combat and losses on both sides. Fallback or Withdraw can break contact. Hover over troops for details, or tap on a phone.</p>
          <div className="cw-unit-target">{selected?.fireStatus || (selected?.engagedWith ? `Target: ${snapshot.formations.find((unit) => unit.id === selected.engagedWith)?.name}` : 'No target in range')}{selected?.active && ['advance', 'assault', 'fallback', 'withdraw'].includes(selected?.order) ? ` | Destination ${Math.round(selected.target.x)}, ${Math.round(selected.target.y)}` : ''}</div>
          {tactical && <section className="cw-gettysburg-detail" aria-label={gettysburg ? "Gettysburg command status" : "Formation readiness"}>
            <FormationReadinessCard selected={selected} snapshot={snapshot} fieldBattle={Boolean(fieldBattle)} onSelectRetreatBlocker={selectRetreatBlocker} selectionDisabled={reviewingOrder || resolving || completed} />
            {selected?.retreatOrigin && selected?.active && selected?.order === 'withdraw' && <p>{fieldBattle?.requireExitIds.includes(selected.id) ? 'Marked exit required. Retreat distance' : 'Retreat distance'} {Math.round(Math.hypot(selected.x - selected.retreatOrigin.x, selected.y - selected.retreatOrigin.y))} / 220 · Must also clear enemy fire and move 180 toward the rear.</p>}
            {selected?.withdrawn && <p>{selected.departureReason === 'disengaged' ? 'Left the engagement area safely.' : 'Departed through a rear exit.'} Surviving troops remain counted in force preservation.</p>}
            {selected?.gunState && <p>Guns {selected.gunState}{selected.gunTimer ? ` · ${selected.gunTimer.toFixed(1)} field minutes remaining` : ''}</p>}
            {selected?.active && selected?.readiness?.turnClearance && <div className="cw-clearance-advice">
              <p>Create turning room clear of {selected.readiness.turnClearance.blockerName}. Confirm the move. {rememberTurnClearance(selected) ? 'Your current attack will be remembered for a deliberate resume after the move finishes.' : 'Choose your next order once the formation has moved.'}</p>
              <button className="cw-preview-staging" disabled={disabled} onClick={previewTurningRoom}><MousePointer2 />Preview room to turn</button>
            </div>}
            {recovery && <section className="cw-recovery-checks" aria-label="Rally requirements"><strong>{recovery.message}</strong><ul>{recovery.checks.map(check => <li key={check.label} data-met={check.met}>{check.met ? '✓' : '○'} {check.label}</li>)}</ul><p>Losses and fatigue remain after rallying.</p></section>}
            <details><summary>Period standards</summary><p>Union: {periodStandardFor('union', battle.id).description}. Confederate: {periodStandardFor('confederate', battle.id).description}. These are representative period patterns, not exact regimental reproductions.</p></details>
          </section>}
          {tactical && <details className="cw-group-panel"><summary>Group orders</summary><GroupOrders snapshot={snapshot} world={world} plan={groupPlan} onPlace={request=>{battlefield.current?.placeGroup(request);setInspectorOpen(false);}} onPreview={request=>battlefield.current?.previewGroup(request)} onConfirm={() => { const ids = groupPlan?.ids || []; const result = battlefield.current?.confirmGroup(); if (result?.accepted) setClearanceRecords(previous => Object.fromEntries(Object.entries(previous).filter(([id]) => !ids.includes(id)))); return result; }} onCancel={()=>battlefield.current?.cancelGroup()} /></details>}
          <details className="cw-coordinate-order"><summary>Move destination</summary><form key={`${selectedId}:${Boolean(selected)}`} onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); battlefield.current?.destination({ x: Number(data.get('x')), y: Number(data.get('y')) }); setInspectorOpen(false); }}><div className="cw-coordinate-inputs">{['x', 'y'].map((axis) => <label key={axis}>{axis.toUpperCase()}<input name={axis} type="number" required aria-label={`Destination ${axis.toUpperCase()}`} min={axis === 'x' ? 70 : 45} max={axis === 'x' ? world.width - 70 : world.height - 35} disabled={disabled} defaultValue={Math.round(selected?.[axis] || (axis === 'x' ? 70 : 45))} /></label>)}</div><button type="submit" disabled={disabled}><MousePointer2 /> Preview move</button></form></details>
          {fieldOrders.length > 0 && (
            <details className="cw-field-orders" open={!tactical}>
              <summary>Orders for this mission</summary>
              <ol>{fieldOrders.map((order) => <li key={order}>{order}</li>)}</ol>
            </details>
          )}
          <details className="cw-field-orders cw-battle-context">
            <summary>Battlefield context · general situation</summary>
            <p>These describe the wider battle and possible operations. Follow your selected mission above.</p>
            <p>{battle.objective}</p>
            {battle.fieldOrders?.length > 0 && <ul>{battle.fieldOrders.map((order) => <li key={order}>{order}</li>)}</ul>}
          </details>
          <details className="cw-field-orders cw-combat-log"><summary>Battle signals · sound and text</summary>
            <p>Optional synthesized cues represent these recorded events; they are not historical recordings.</p>
            <ol>{snapshot?.combatEvents?.slice(-8).map(event => <li key={event.id}>Field minute {Math.floor(event.time)}: {combatEventLabel(event, snapshot.formations)}</li>)}</ol>
          </details>
          </div>
        </aside>
        <div className={`cw-battlefield-frame${tactical ? ' cw-gettysburg-frame' : ''}`} inert={compact && inspectorExpanded}>
          {groupPlan?.placing && <div className="cw-group-placement" role="status">Click or tap the field to preview group destinations. <button onClick={()=>battlefield.current?.cancelGroup()}>Cancel group placement</button></div>}

          <CivilWarBattlefield checkpoint={checkpoint} ref={battlefield} scenarioId={battle.id} campaignState={effectiveCampaignState} choiceId={choiceId} speed={guideSpeed(guide, speed)} selectedId={selectedId} onSelect={setSelectedId} onSnapshot={onSnapshot} onDestination={onDestination} onZoom={setZoom} terrainOverlay={terrainOverlay} missionMarkers={missionMarkers} showRange={showRange} onGroupPreview={onGroupPreview} />
          <div className="cw-battle-zoom">
            {!compact && <button className="cw-wide-field-toggle" aria-pressed={wideActive} aria-label={wideActive ? 'Show formation panel' : 'Expand battlefield'} title={wideActive ? 'Show formation panel' : 'Expand battlefield'} onClick={() => { setWideField(!wideActive); setInspectorOpen(false); }}><Maximize /><span>{wideActive ? 'Panel' : 'Expand'}</span></button>}
            {wideActive && <label className="cw-wide-roster">Formation<select aria-label="Expanded battlefield formation roster" value={selectedId || ''} onChange={event => selectFromRoster(event.target.value)}>{snapshot?.formations.filter(unit => unit.side === 'confederate').map(unit => <option key={unit.id} value={unit.id}>{unit.name} · {formationStatusLabel(unit)}</option>)}</select></label>}
            {!compact && <><button onClick={() => battlefield.current?.zoom(0.1)} title="Zoom in" aria-label="Zoom in"><Plus /></button><button onClick={() => battlefield.current?.zoom(-0.1)} title="Zoom out" aria-label="Zoom out"><Minus /></button></>}
            <button onClick={() => { setMarkedLocation(null); battlefield.current?.fit(); }} title={`Fit battlefield (current zoom ${zoom.toFixed(1)}x overview)`} aria-label="Fit battlefield"><Maximize /><span>Overview</span></button>
            <button onClick={() => { setMarkedLocation(null); battlefield.current?.focus(); }} disabled={!selected?.active} title="Focus selected formation" aria-label="Focus selected formation"><Crosshair /><span>Focus</span></button>
            {['pan', 'move'].map((mode) => <button key={mode} aria-pressed={inputMode === mode} disabled={mode === 'move' && disabled} title={mode === 'pan' ? 'Pan battlefield' : 'Choose move destination'} aria-label={mode === 'pan' ? 'Pan battlefield' : 'Choose move destination'} onClick={() => { setInputMode(mode); battlefield.current?.mode(mode); }}>{mode === 'pan' ? <Hand /> : <MousePointer2 />}<span>{mode === 'pan' ? 'Pan' : 'Move'}</span></button>)}
            {locations.length > 0 && <details className="cw-field-locator" ref={locateMenu} onKeyDown={event => { if (event.key === 'Escape' && event.currentTarget.open) { event.preventDefault(); event.stopPropagation(); event.currentTarget.open = false; locateButton.current?.focus(); } }}>
              <summary ref={locateButton}>Find on field</summary>
              <form onSubmit={event => { event.preventDefault(); locate(locationChoice || locations[0].id); }}>
                <label>Battlefield location<select aria-label="Battlefield location" value={locationChoice || locations[0].id} onChange={event => setLocationChoice(event.target.value)}>
                  {['Objective', 'Sector', 'Landmark', 'Plan', 'Exit'].map(kind => <optgroup key={kind} label={kind}>{locations.filter(site => site.kind === kind).map(site => <option key={site.id} value={site.id}>{site.name}</option>)}</optgroup>)}
                </select></label>
                <p>View pauses the battle. Exits are destinations, not guaranteed safe routes. Directions refer to this playable board.</p>
                <button type="submit">View location</button>
              </form>
            </details>}
            {compact ? <details className="cw-map-options"><summary>Map &amp; sound</summary><div>{mapOptions}</div></details> : mapOptions}
            {markedLocation && <div className="cw-location-receipt" role="status">Marked: <strong>{markedLocation.name}</strong> · View only, no order issued.</div>}
          </div>
            {snapshot?.gettysburg && <section className="cw-ridge-progress" aria-label="Ridge objective progress">
              <div className="cw-objective-heading"><div><span className="cw-command-phase">{commandBrief.phase}</span><strong>{choiceId === 'option_a' ? `Ridge held ${snapshot.gettysburg.held.toFixed(1)} / ${snapshot.gettysburg.holdRequired || 18}` : `Force escaped ${Math.round(snapshot.gettysburg.escaped * 100)}% / 70%`}</strong></div><button onClick={openBrief} disabled={resolving} aria-label="Review command brief"><BookOpen /><span>Command brief</span></button></div>
              <progress aria-label={choiceId === 'option_a' ? 'Sustained ridge control' : 'Organized withdrawal progress'} max={choiceId === 'option_a' ? snapshot.gettysburg.holdRequired || 18 : 0.7} value={choiceId === 'option_a' ? snapshot.gettysburg.held : snapshot.gettysburg.escaped} />
              <div className="cw-sector-strip">{snapshot.gettysburg.sectors.map(sector => <button type="button" key={sector.id} data-control={sector.control} title={`View ${sector.name}; pauses without issuing an order`} aria-label={`View ${sector.name}`} onClick={() => locate(`Sector:${sector.id}`)}>{sector.name}<strong>{sector.control === 'confederate' ? 'CS control' : sector.control === 'union' ? 'US control' : sector.control}</strong></button>)}</div>
              {completed && <GettysburgDebrief report={forceReport} assessment={assessment} />}
            </section>}
          {fieldBattle && <section className="cw-ridge-progress cw-field-progress" aria-label="Mission and command sectors">
            <div className="cw-objective-heading"><div><span className="cw-command-phase">{commandBrief.phase}</span><strong>{completed ? assessment?.objective.status === 'achieved' ? 'Mission achieved' : 'Mission incomplete' : attackObjective ? `${attackObjective.name} · ${attackObjective.held.toFixed(1)} / ${attackObjective.required}` : defenseObjective ? `Hold Henry Hill · ${Math.floor(defenseObjective.elapsed)} / ${defenseObjective.deadline}` : assessment?.objective.label || 'Command sectors'}</strong></div><button onClick={openBrief} disabled={resolving} aria-label="Review command brief"><BookOpen /><span>Command brief</span></button></div>
            {!completed && siegeStatus && <div className="cw-reserve-progress" aria-label="Siege mission checkpoints"><strong>{siegeStatus.title}</strong><span>{siegeStatus.progress}</span><span>{siegeStatus.detail}</span></div>}
            {!completed && withdrawalStatus && <div className="cw-reserve-progress" aria-label="Withdrawal command checkpoints"><strong>{withdrawalStatus.title}</strong><span>{withdrawalStatus.progress}</span><span>{withdrawalStatus.detail}</span></div>}
            {fieldBattle.preservationObjective && <div className="cw-reserve-progress" aria-label="Army preservation progress"><strong>Organized army retained · {Math.round(fieldBattle.preservationObjective.retained * 100)}% / 65%</strong><span>On field {Math.round(fieldBattle.preservationObjective.onField * 100)}% · Withdrawn in order {Math.round(fieldBattle.preservationObjective.escaped * 100)}%</span><span>Hold through minute 126, win a field result, or finish an orderly exit. The rail operation and coordination are resolved in the campaign.</span></div>}
            {fieldBattle.reserveObjective && <div className="cw-reserve-progress" aria-label="Command reserve progress">
              <strong>Hold through {fieldBattle.reserveObjective.deadline} · {fieldBattle.reserveObjective.held.toFixed(1)} / {fieldBattle.reserveObjective.required} support minutes</strong>
              <progress aria-label="Continuous reserve support" max={fieldBattle.reserveObjective.required} value={fieldBattle.reserveObjective.held} />
              <span>Organized force {Math.round(fieldBattle.reserveObjective.organizedRatio * 100)}% / 65% · Connected front {fieldBattle.reserveObjective.supporting} / 2 · Reserve {fieldBattle.reserveObjective.reserveReady && fieldBattle.reserveObjective.supported ? 'ready and linked' : 'needs support'}</span>
            </div>}
            {defenseObjective && <HenryHillProgress objective={defenseObjective} completed={completed} />}
            {attackObjective && <><progress aria-label="Supported objective control" max={attackObjective.required} value={attackObjective.held} /><p className="cw-command-explainer">{attackObjective.state} · {attackObjective.eligible} supporting infantry · {attackObjective.defenders} defender{attackObjective.defenders === 1 ? '' : 's'}</p></>}
            <GettysburgJacksonMissionConditions mission={jacksonMission} completed={Boolean(completed)} />
            <div className="cw-sector-strip">{fieldBattle.sectors.map(sector => <button type="button" key={sector.id} data-control={sector.control} title={`View ${sector.name}; pauses without issuing an order`} aria-label={`View ${sector.name}`} onClick={() => locate(`Sector:${sector.id}`)}>{sector.name}<strong>{sector.control === 'confederate' ? 'CS present' : sector.control === 'union' ? 'US present' : sector.control}</strong></button>)}</div>
            {completed && <GettysburgDebrief report={forceReport} assessment={assessment} />}
          </section>}
          <div className="cw-field-overlays">
  <TurnClearanceRecovery record={clearanceRecords[selectedId]} sectors={commandSectors} disabled={disabled || reviewingOrder} onResume={resumeSavedAttack} onDismiss={() => forgetClearance()} />


            {!markedLocation && !guideSpeed(guide, speed) && !completed && !resolving && <button className="cw-begin-battle" disabled={!snapshot || reviewingOrder} onClick={() => changeSpeed(1)}><Swords /> {reviewingOrder ? 'Confirm or cancel orders' : !snapshot ? 'Preparing battlefield' : snapshot.time ? 'Resume battle' : 'Begin battle'}</button>}
            {destination && <div className="cw-destination-confirm" role="status"><span>{destination.error || `Destination ${destination.x}, ${destination.y}`}</span><button disabled={disabled || Boolean(destination.error)} onClick={confirmDestination}><Check /> Confirm move</button><button onClick={() => battlefield.current?.mode(inputMode)} title="Cancel destination" aria-label="Cancel destination"><X /></button></div>}
            {snapshot?.fieldStatus && !tactical && <details className="cw-field-status"><summary>{snapshot.fieldStatus.label}</summary><span>{snapshot.fieldStatus.message}</span></details>}
          </div>
        </div>
      </div>
      <footer className={`cw-battle-command-bar${tactical ? ' cw-gettysburg-command-bar' : ''}`} inert={leaving}>
        {tactical && <div className="cw-command-receipt" aria-label="Selected formation order status"><div className="cw-command-receipt-copy"><strong>{selected?.name || 'Choose a formation'}</strong><span>{selected?.pendingCommand ? <>{selectedOrder} → <span className="cw-pending-label">{selected.pendingCommand.order} en route</span> · {selected.commandDelay.toFixed(1)} min{!guideSpeed(guide, speed) ? ' · paused' : ''}</> : selected?.active ? `${selectedOrder} received` : selected ? formationStatusLabel(selected) : 'Awaiting selection'}</span><small>{selected?.fireStatus || commandBrief.message}</small></div><label className="cw-quick-sector">Assault sector<select value={assaultSector} onChange={event => rememberAssaultSector(selectedId, event.target.value)} disabled={disabled || selected?.type === 'artillery'}><option value="nearest">Nearest sector</option>{commandSectors.map(sector => <option key={sector.id} value={sector.id}>{sector.name}</option>)}</select></label></div>}
        {commandOptions.map((order) => { const Icon = commandIcons[order]; return <button key={order} aria-pressed={commandOrder === order} data-pending={selected?.pendingCommand?.order === order} title={commandDescriptions[order]} onClick={() => issueUnitOrder(order, order === 'assault' && assaultSector !== 'nearest' ? { sectorId: assaultSector } : null)} disabled={(order === 'rally' ? !canRally : disabled) || (order === 'volley' && selected?.ammunition === 0) || (order === 'assault' && selected?.type === 'artillery')}><Icon /><span>{order}</span></button>; })}
        {completed ? <button className="cw-battle-return" onClick={finish}><ArrowLeft />{practice ? 'View practice result' : 'Return consequences to campaign'}</button> : <div className="cw-battle-clock">{resolving ? 'Battle decided' : 'Field time'} <strong>{resolving ? tactical ? 'The tactical state is preserved while the result is recorded.' : orderlyExit ? 'Withdrawing' : 'Routing' : Math.floor(snapshot?.time || 0)}</strong></div>}
      </footer>
      {leaving && <div className="cw-leave-backdrop"><section ref={leaveDialog} className="cw-leave-dialog" role="alertdialog" aria-modal="true" aria-labelledby="cw-leave-title" aria-describedby="cw-leave-description">
        <h3 id="cw-leave-title">Leave this battle?</h3><p id="cw-leave-description">{completed ? 'This result has not been returned to the campaign.' : onSuspend ? 'Save your field orders and return later. Resume starts paused. Discarding restarts this encounter.' : 'Battle progress is not saved. Leaving discards these field orders and restarts this encounter.'}</p>
        {saveError && <p role="alert">{saveError}</p>}
        <div><button onClick={() => setLeaving(false)}>Stay in battle</button>{onSuspend && <button onClick={suspend}>Save and leave</button>}<button onClick={() => { try { onClose(); } catch (error) { setSaveError(error.message); } }}>Discard and leave</button></div>
      </section></div>}
    </div>
  );
}

export function GettysburgDebrief({ report, assessment }) {
  if (!report) return null;
  return <details className="cw-battle-debrief">
    <summary>After-action report · {report.headline}</summary>
    <div className="cw-debrief-body">
      <p>{report.explanation}</p>
      {assessment?.objective?.label && <p><strong>Selected mission:</strong> {assessment.objective.label}</p>}
      {assessment?.afterAction?.next?.length > 0 && <div className="cw-debrief-next"><strong>Next attempt</strong><ul>{assessment.afterAction.next.map(line => <li key={line}>{line}</li>)}</ul></div>}
      <dl className="cw-force-breakdown">{report.rows.filter(row => row.value > 0 || ['onField', 'disordered', 'casualties'].includes(row.key)).map(row => <div key={row.key} data-state={row.key}><dt>{row.label}</dt><dd>{Math.round(row.value).toLocaleString()} <span>({Math.round(row.percent)}%)</span></dd></div>)}</dl>
      {report.breaks.length > 0 && <div className="cw-break-evidence"><strong>Recorded formation breaks</strong><ol>{report.breaks.map((entry, index) => <li key={`${entry.name}:${index}`}>Minute {Math.round(entry.at)} · {entry.name}: {entry.cause}</li>)}</ol></div>}
      <p>{assessment?.objective?.status === 'achieved' ? 'Mission achieved.' : 'Mission not completed.'} Objective achievement contributes 75% of the command score; preservation contributes 25%.</p>
    </div>
  </details>;
}

function ObjectiveConditions({ reports, selectedName, ridge }) {
  if (!reports.length) return null;
  return <details className="cw-objective-conditions" open><summary>Objective conditions</summary>
    <p>{ridge ? 'Hold two sectors simultaneously for 18 uninterrupted field minutes. Each needs infantry with at least 600 troops, morale 30 and cohesion 25, supported by an organized friend within 340. Eligible Union infantry contests control.' : 'Keep two supporting infantry formations inside the objective and within 340 for eight uninterrupted field minutes. Morale must be at least 30 and cohesion 25. Direct moves, Fallback, Withdraw and Rally do not capture. Clear organized defenders.'}</p>
    <p>Capture tests the formation’s center, not the front rank. Losing the required control resets the timer. Mission markers locate the ground; Tactical overlay shows the exact boundary.</p>
    {reports.map(report => <section key={report.id}><h4>{report.name}</h4><p><strong>{selectedName}:</strong> {report.reason}</p><p>Eligible and supported: {report.supported.join(', ') || 'None'}.</p><p>Organized defenders: {report.defenders.join(', ') || 'None'}.</p></section>)}
  </details>;
}

export function HenryHillProgress({ objective, completed }) {
  const conditions = henryHillConditions(objective);
  return <div className="cw-defense-progress">
    <progress aria-label="Defensive interval elapsed" value={objective.elapsed} max={objective.deadline} />
    <details className="cw-mission-conditions" open={Boolean(completed)}>
      <summary>Mission conditions · {conditions.filter(condition => condition.satisfied).length} / 4 met<span>{objective.supporting} supporting · {objective.enemies ? 'Hill contested' : 'Hill clear'} · {objective.underFire ? 'Fire recorded' : 'Awaiting fire'}</span></summary>
      <p className="cw-mission-note">{completed ? 'Conditions when the battle ended.' : `At minute ${objective.deadline}, hold the hill with supporting infantry and no organized enemy. The hill defense must have come under fire during this battle.`}</p>
      <ul className="cw-mission-checklist" aria-label="Henry Hill mission conditions">{conditions.map(condition => <li key={condition.label} data-met={condition.satisfied}><span aria-hidden="true">{condition.satisfied ? '✓' : '○'}</span><div><strong>{condition.label}</strong><small>{condition.satisfied ? 'Met' : 'Unmet'}: {condition.detail}</small></div></li>)}</ul>
    </details>
  </div>;
}
