// Pure development-review playback. These authored samples are inspection
// sequences, not simulation timings, an interpolated turn, or a loading drill.
const PANELS = ['left', 'right'];
const VERSIONS = ['v4', 'v5', 'v6', 'v7', 'v8', 'v9'];
const BEARINGS = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'];
const wrap = (index, count) => ((index % count) + count) % count;

function completeStudy(studies, id) {
  if (!Array.isArray(studies)) return null;
  const matches = studies.filter(study => study?.id === id);
  const study = matches.length === 1 ? matches[0] : null;
  return study && study.status !== 'rejected' && Array.isArray(study.phases) && study.phases.length === 4
    && Number.isInteger(study.columns) && Number.isInteger(study.rows) && study.columns > 0 && study.rows > 0 && study.columns * study.rows === 4
    && (study.cellOrder === undefined || Array.isArray(study.cellOrder) && study.cellOrder.length === 4
      && new Set(study.cellOrder).size === 4 && study.cellOrder.every(index => Number.isInteger(index) && index >= 0 && index < 4))
    ? study : null;
}

const studyId = (version, bearing, kind, identity = 'a', side = 'union') => identity === 'b'
  ? `${side}-b-${bearing}-${kind}-${version}` : `${side}-${bearing}-${kind}-${version}`;
function completeV15Review(studies) {
  return ['s', 'se', 'sw'].every(bearing => ['march', 'actions'].every(kind => {
    const study = completeStudy(studies, studyId('v15', bearing, kind, 'a', 'confederate'));
    return study?.sourceReviewed === true && study.status === 'pilot'
      && /^[a-f0-9]{64}$/i.test(study.sourceSha256 || '')
      && typeof study.source === 'string' && study.source.trim().length > 0
      && typeof study.receipt === 'string' && study.receipt.trim().length > 0
      && [study.width, study.height, study.referenceHeight].every(value => Number.isFinite(value) && value > 0)
      && Array.isArray(study.phaseRoots) && study.phaseRoots.length === 4
      && study.phaseRoots.every(root => [root?.x, root?.y].every(value => Number.isFinite(value) && value >= 0 && value <= 1));
  }));
}
const sample = (study, phase, action, bearing, identity = 'a', side = 'union') => ({
  studyId: study.id, phase, action, bearing, identity, side, label: `${side === 'confederate' ? 'Confederate ' : ''}${identity.toUpperCase()} ${bearing} · ${study.phases[phase]}`,
});
const normalizeBearing = bearing => typeof bearing === 'string' && BEARINGS.includes(bearing.toLowerCase()) ? bearing.toLowerCase() : null;
function normalizeBearingPair(bearingPair) {
  if (!Array.isArray(bearingPair) || bearingPair.length !== 2) return null;
  const pair = bearingPair.map(normalizeBearing);
  return pair.every(Boolean) && pair[0] !== pair[1] ? pair : null;
}

export function createGettysburgActionSequence(studies, version = 'v4', bearing = 'e', identity = 'a', side = 'union') {
  bearing = normalizeBearing(bearing);
  if (!bearing || !['a', 'b'].includes(identity) || !['union', 'confederate'].includes(side)) return [];
  const march = completeStudy(studies, studyId(version, bearing, 'march', identity, side));
  const actions = completeStudy(studies, studyId(version, bearing, 'actions', identity, side));
  if (!march || !actions) return [];
  const direction = bearing.toUpperCase();
  return [
    sample(actions, 0, 'ready', direction, identity, side),
    ...[0, 1, 2, 3].map(phase => sample(march, phase, 'march', direction, identity, side)),
    sample(actions, 0, 'ready', direction, identity, side),
    sample(actions, 1, 'fire', direction, identity, side),
    sample(actions, 2, 'reload', direction, identity, side),
    sample(actions, 3, 'reload', direction, identity, side),
    sample(actions, 0, 'ready', direction, identity, side),
  ];
}

export function createGettysburgTurnSequence(studies, version = 'v5', identity = 'a', bearingPair = ['e', 'se'], side = 'union') {
  const pair = normalizeBearingPair(bearingPair);
  if (!pair || !['a', 'b'].includes(identity) || !['union', 'confederate'].includes(side)) return [];
  const base = completeStudy(studies, studyId(version, pair[0], 'march', identity, side));
  const turned = completeStudy(studies, studyId(version, pair[1], 'march', identity, side));
  if (!base || !turned) return [];
  // Repeat the same gait phase at each bearing switch so the change in
  // silhouette can be inspected without an unrelated contact-phase jump.
  return [
    ...[0, 1, 2, 3].map(phase => sample(base, phase, 'march', pair[0].toUpperCase(), identity, side)),
    ...[3, 0, 1, 2, 3].map(phase => sample(turned, phase, 'march', pair[1].toUpperCase(), identity, side)),
    ...[3, 0, 1, 2, 3].map(phase => sample(base, phase, 'march', pair[0].toUpperCase(), identity, side)),
  ];
}

export function createGettysburgActionTurnSequence(studies, version = 'v6', identity = 'a', bearingPair = ['e', 'se'], side = 'union') {
  const pair = normalizeBearingPair(bearingPair);
  if (!pair) return [];
  const base = createGettysburgActionSequence(studies, version, pair[0], identity, side);
  const turned = createGettysburgActionSequence(studies, version, pair[1], identity, side);
  if (!base.length || !turned.length) return [];
  // Each switch keeps both the semantic action and its authored source phase.
  // This is a sequence of comparison holds, never interpolated body rotation.
  return base.flatMap((pose, index) => [pose, turned[index], pose]);
}

export function createGettysburgMarchComparison(studies, leftId, rightId) {
  const left = completeStudy(studies, leftId);
  const right = completeStudy(studies, rightId);
  const isMarch = study => /-march-v\d+$/.test(study?.id || '')
    || ['union-e-rig', 'union-e-rig-guided'].includes(study?.id);
  if (!isMarch(left) || !isMarch(right)) return [];
  return [0, 1, 2, 3].map(phase => ({
    left: { studyId: left.id, phase, action: 'march' },
    right: { studyId: right.id, phase, action: 'march' },
    label: `March phase ${phase + 1} / 4`,
  }));
}

export function getGettysburgMotionPlaybackPresets(studies) {
  const presets = [];
  const v15ReviewComplete = completeV15Review(studies);
  const add = (id, label, description, sequence) => {
    if (sequence.length) presets.push({ id, label, description, sequence,
      ...(id.startsWith('v15-') ? { reviewComplete: v15ReviewComplete } : {}) });
  };
  const addBearingPair = (version, pair, identity = 'a', side = 'union') => {
    const [baseBearing, turnedBearing] = pair;
    const [baseLabel, turnedLabel] = pair.map(bearing => bearing.toUpperCase());
    const army = side === 'confederate' ? ' Confederate A' : '';
    const prefix = `${version}${side === 'confederate' ? '-confederate' : ''}${identity === 'a' ? '' : `-${identity}`}-${baseBearing}-${turnedBearing}`;
    const label = `${version.toUpperCase()}${army}${identity === 'a' ? '' : ` ${identity.toUpperCase()}`} ${baseLabel} ↔ ${turnedLabel}`;
    const base = createGettysburgActionSequence(studies, version, baseBearing, identity, side);
    const turned = createGettysburgActionSequence(studies, version, turnedBearing, identity, side);
    const march = completeStudy(studies, studyId(version, baseBearing, 'march', identity, side));
    add(`${prefix}-march`, `${label} march`, 'Both bearings share the same contact and passing phase.',
      createGettysburgMarchComparison(studies, studyId(version, baseBearing, 'march', identity, side), studyId(version, turnedBearing, 'march', identity, side)));
    add(`${prefix}-actions`, `${label} action sequence`, 'Both bearings follow matching action samples.',
      base.length && turned.length ? base.map((left, index) => ({ left, right: turned[index], label: turned[index].label })) : []);
    const turn = createGettysburgTurnSequence(studies, version, identity, pair, side);
    add(`${prefix}-turn`, `${version.toUpperCase()}${army}${identity === 'a' ? '' : ` ${identity.toUpperCase()}`} ${baseLabel} → ${turnedLabel} → ${baseLabel} turn inspection`,
      `Left retains the ${baseLabel} source at the matching gait phase. Right switches authored bearings at the same phase, then continues marching. This shows bearing transitions without interpolating artwork.`,
      turn.map(right => ({ left: sample(march, right.phase, 'march', baseLabel, identity, side), right, label: right.label })));
    const actionTurn = createGettysburgActionTurnSequence(studies, version, identity, pair, side);
    add(`${prefix}-action-turn`, `${version.toUpperCase()}${army}${identity === 'a' ? '' : ` ${identity.toUpperCase()}`} ${baseLabel} → ${turnedLabel} → ${baseLabel} action inspection`,
      `Each action sample switches from ${baseLabel} to ${turnedLabel} and back while retaining its action and source phase. Left keeps the matching ${baseLabel} reference. These comparison holds do not reproduce battle timings or interpolate artwork.`,
      actionTurn.map((right, index) => ({ left: base[Math.floor(index / 3)], right, label: right.label })));
  };
  for (const version of VERSIONS) {
    const sequence = createGettysburgActionSequence(studies, version);
    const march = completeStudy(studies, `union-e-march-${version}`);
    add(`${version}-actions`, `${version.toUpperCase()} E action sequence`,
      'Left holds a march contact as a body and equipment reference. Right follows ready → four march poses → ready → fire → load → ram → ready.',
      sequence.map(right => ({ left: sample(march, 0, 'march', 'E'), right, label: right.label })));
    if (version === 'v4') continue;
    addBearingPair(version, ['e', 'se']);
  }
  for (const identity of ['a', 'b']) addBearingPair('v8', ['s', 'sw'], identity);
  for (const identity of ['a', 'b']) addBearingPair('v9', ['sw', 'w'], identity);
  for (const pair of [['n', 'ne'], ['n', 'nw'], ['ne', 'nw']]) addBearingPair('v10', pair, 'a', 'confederate');
  for (const identity of ['a', 'b']) addBearingPair('v11', ['e', 'se'], identity);
  addBearingPair('v13', ['e', 'w'], 'a', 'confederate');
  for (const pair of [['n', 's'], ['s', 'e'], ['s', 'w']]) addBearingPair('v14', pair, 'a', 'confederate');
  for (const pair of [['s', 'se'], ['s', 'sw'], ['se', 'sw']]) addBearingPair('v15', pair, 'a', 'confederate');
  for (let index = 1; index < VERSIONS.length; index++) {
    const previousVersion = VERSIONS[index - 1];
    const version = VERSIONS[index];
    const id = `${previousVersion}-${version}`;
    const label = `${previousVersion.toUpperCase()} ↔ ${version.toUpperCase()} E`;
    add(`${id}-march`, `${label} march`, 'Both east-facing sources share the same contact and passing phase.',
      createGettysburgMarchComparison(studies, `union-e-march-${previousVersion}`, `union-e-march-${version}`));
    const previous = createGettysburgActionSequence(studies, previousVersion);
    const current = createGettysburgActionSequence(studies, version);
    add(`${id}-actions`, `${label} action sequence`, 'Both versions follow the same explicit action sequence; source size differences remain visible.',
      previous.length && current.length ? previous.map((left, sampleIndex) => ({ left, right: current[sampleIndex], label: current[sampleIndex].label })) : []);
  }
  for (const version of ['v7', 'v8', 'v9', 'v11']) {
    for (const bearing of version === 'v11' ? ['e', 'se', 's', 'sw', 'w'] : version === 'v9' ? ['s', 'sw', 'w'] : version === 'v8' ? ['s', 'sw'] : ['s']) {
      const label = `${version.toUpperCase()} ${bearing.toUpperCase()} A ↔ B`;
      const previous = createGettysburgActionSequence(studies, version, bearing, 'a');
      const current = createGettysburgActionSequence(studies, version, bearing, 'b');
      add(`${version}-${bearing}-a-b-march`, `${label} march`, 'Both identities share the matching contact and passing phase.',
        createGettysburgMarchComparison(studies, studyId(version, bearing, 'march', 'a'), studyId(version, bearing, 'march', 'b')));
      add(`${version}-${bearing}-a-b-actions`, `${label} action sequence`, 'Both identities follow matching named actions and source phases with their own measured references.',
        previous.length && current.length ? previous.map((left, index) => ({ left, right: current[index], label: current[index].label })) : []);
    }
    const north = createGettysburgActionSequence(studies, version, 'n', 'a', 'confederate');
    const northMarch = completeStudy(studies, studyId(version, 'n', 'march', 'a', 'confederate'));
    add(`${version}-confederate-n-actions`, `${version.toUpperCase()} Confederate A N action sequence`,
      'Left holds a north-facing march contact. Right follows named ready, march, fire and loading states from the Confederate sources.',
      north.map(right => ({ left: sample(northMarch, 0, 'march', 'N', 'a', 'confederate'), right, label: right.label })));
  }
  const previousSW = completeStudy(studies, 'confederate-sw-march-v15');
  const currentSW = completeStudy(studies, 'confederate-sw-march-v16');
  const reviewedSW = study => study?.status === 'pilot' && study.sourceReviewed === true
    && /^[a-f0-9]{64}$/i.test(study.sourceSha256 || '')
    && typeof study.source === 'string' && study.source.trim().length > 0
    && typeof study.receipt === 'string' && study.receipt.trim().length > 0
    && [study.width, study.height, study.referenceHeight].every(value => Number.isFinite(value) && value > 0)
    && Array.isArray(study.phaseRoots) && study.phaseRoots.length === 4
    && study.phaseRoots.every(root => [root?.x, root?.y].every(value => Number.isFinite(value) && value >= 0 && value <= 1));
  if (reviewedSW(previousSW) && reviewedSW(currentSW)) presets.push({
    id: 'v15-v16-confederate-sw-march', label: 'V15 ↔ V16 Confederate A SW march',
    description: 'Matching contact and passing phases compare the original SW source with the complete v16 replacement at one measured scale per source.',
    sequence: createGettysburgMarchComparison(studies, previousSW.id, currentSW.id), reviewComplete: true,
  });
  return presets;
}

export function getGettysburgMotionPlaybackInitialPreset(presets) {
  // A v15 default needs all three reviewed bearings, including SW when the
  // first comparison is S/SE. Partial source review keeps the prior default.
  const v15 = ['s-se', 's-sw', 'se-sw'].map(pair => presets.find(preset => preset.id === `v15-confederate-${pair}-actions`));
  if (v15.every(preset => preset?.reviewComplete === true)) return v15[0];
  return ['v14-confederate-n-s-actions', 'v13-confederate-e-w-actions', 'v11-b-e-se-actions', 'v10-confederate-ne-nw-actions', 'v9-w-a-b-actions', 'v9-sw-w-actions', 'v8-sw-a-b-actions', 'v8-s-sw-actions', 'v7-s-a-b-actions', 'v7-e-se-actions', 'v7-actions',
    'v6-e-se-actions', 'v6-actions', 'v5-actions', 'v4-actions']
    .map(id => presets.find(preset => preset.id === id)).find(Boolean) || null;
}

export function createGettysburgMotionPlaybackState(studies) {
  const confederateSouthDiagonalsComplete = completeV15Review(studies);
  const confederateNorthSouthComplete = ['n', 's'].every(bearing => createGettysburgActionSequence(studies, 'v14', bearing, 'a', 'confederate').length > 0);
  const confederateEastWestComplete = ['e', 'w'].every(bearing => createGettysburgActionSequence(studies, 'v13', bearing, 'a', 'confederate').length > 0);
  const unionBEastComplete = createGettysburgActionSequence(studies, 'v11', 'e', 'b').length > 0;
  const northeastComplete = createGettysburgActionSequence(studies, 'v10', 'ne', 'a', 'confederate').length > 0;
  const westComplete = createGettysburgActionSequence(studies, 'v9', 'w').length > 0;
  const swComplete = createGettysburgActionSequence(studies, 'v8', 'sw').length > 0;
  const choose = action => (confederateSouthDiagonalsComplete ? completeStudy(studies, `confederate-se-${action}-v15`) : null)
    || (confederateNorthSouthComplete ? completeStudy(studies, `confederate-s-${action}-v14`) : null)
    || (confederateEastWestComplete ? completeStudy(studies, `confederate-e-${action}-v13`) : null)
    || (unionBEastComplete ? completeStudy(studies, `union-b-e-${action}-v11`) : null)
    || (northeastComplete ? completeStudy(studies, `confederate-ne-${action}-v10`) : null)
    || (westComplete ? completeStudy(studies, `union-w-${action}-v9`) : null)
    || (swComplete ? completeStudy(studies, `union-sw-${action}-v8`) : null)
    || [...VERSIONS].reverse().map(version => completeStudy(studies, `union-e-${action}-${version}`)).find(Boolean) || studies?.[0];
  const left = choose('march');
  const right = choose('actions');
  return {
    panels: { left: left ? { studyId: left.id, phase: 0 } : null, right: right ? { studyId: right.id, phase: 0 } : null },
    presetId: 'inspection', sequence: [], sampleIndex: 0, playing: false,
  };
}

function moveTo(state, index, playing) {
  const sampleIndex = wrap(index, state.sequence.length);
  const current = state.sequence[sampleIndex];
  return { ...state, panels: { left: current.left, right: current.right }, sampleIndex, playing };
}

export function reduceGettysburgMotionPlayback(state, event) {
  switch (event.type) {
    case 'inspection':
      return { ...state, presetId: 'inspection', sequence: [], sampleIndex: 0, playing: false };
    case 'inspect':
      if (!PANELS.includes(event.panel) || !event.sample?.studyId || !Number.isInteger(event.sample.phase) || event.sample.phase < 0) return state;
      return { ...state, panels: { ...state.panels, [event.panel]: event.sample },
        presetId: 'inspection', sequence: [], sampleIndex: 0, playing: false };
    case 'preset':
      if (!event.preset?.sequence?.length) return state;
      return moveTo({ ...state, presetId: event.preset.id, sequence: event.preset.sequence }, event.index || 0, false);
    case 'advance':
      return state.playing && state.sequence.length ? moveTo(state, state.sampleIndex + 1, true) : state;
    case 'step':
      return state.sequence.length ? moveTo(state, state.sampleIndex + event.delta, false) : { ...state, playing: false };
    case 'play':
      return state.sequence.length > 1 ? { ...state, playing: true } : state;
    case 'pause':
      return state.playing ? { ...state, playing: false } : state;
    default:
      return state;
  }
}
