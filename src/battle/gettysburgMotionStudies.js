import v7SourceAnnotations from '../../docs/art-pass/manifests/gettysburg-v7-source-annotations.json' with { type: 'json' };
import v8SourceAnnotations from '../../docs/art-pass/manifests/gettysburg-v8-source-annotations.json' with { type: 'json' };
import v9SourceAnnotations from '../../docs/art-pass/manifests/gettysburg-v9-source-annotations.json' with { type: 'json' };
import v10SourceAnnotations from '../../docs/art-pass/manifests/gettysburg-v10-source-annotations.json' with { type: 'json' };
import v11SourceAnnotations from '../../docs/art-pass/manifests/gettysburg-v11-source-annotations.json' with { type: 'json' };
import v13SourceAnnotations from '../../docs/art-pass/manifests/gettysburg-v13-source-annotations.json' with { type: 'json' };
import v14SourceAnnotations from '../../docs/art-pass/manifests/gettysburg-v14-source-annotations.json' with { type: 'json' };
import v15SourceAnnotations from '../../docs/art-pass/manifests/gettysburg-v15-source-annotations.json' with { type: 'json' };
import v16SourceAnnotations from '../../docs/art-pass/manifests/gettysburg-v16-source-annotations.json' with { type: 'json' };

// Development reviewer inputs. These URLs point to original files in docs,
// not release assets. Equal cells are inspection windows, not approved crops.
const PREVIOUS_STUDIES = [
  Object.freeze({
    id: 'union-se-march-v5', label: 'Union SE — alternating contact and passing',
    source: '/docs/art-pass/candidates/gettysburg-v5/union-se-march-padded-candidate.png',
    receipt: '/docs/art-pass/reviews/gettysburg-v5-march-se-measurement.json',
    width: 1254, height: 1254, columns: 2, rows: 2,
    status: 'pilot', statusLabel: 'New diagonal march · opt-in only', approved: false,
    phases: ['Far contact', 'First passing · far support', 'Near contact', 'Opposite passing · near support'],
    root: { x: 342 / 627, y: 612 / 627, kind: 'measured', meaning: 'Manual pelvis roots and row-shared ground planes, approximately ±5–8 native pixels; one source scale preserves posture and source variation' },
    phaseRoots: [[342, 612], [241, 612], [344, 605], [241, 605]].map(([x, y]) => ({ x: x / 627, y: y / 627 })),
    referenceHeight: 490,
    limitations: [
      'Contacts and passing supports plausibly alternate when traced from hips through knees; screen-space boot order alone cannot establish anatomy.',
      'The passing leg was corrected with imagegen, then cell padding corrected. Every phase was re-reviewed; earlier attempts remain recorded.',
      'One uniform 490 px body reference retains the 469–491 px sole-span variation rather than normalizing each phase.',
      'Solid padding is at least 16 px at alpha64; faint RGB/alpha residue remains untouched.',
      'SE has march coverage only. Other actions use accepted art; full-family and production approval remain false.',
    ],
  }),
  Object.freeze({
    id: 'union-e-march-v5', label: 'Union E — retained V4 gait for V5',
    source: '/docs/art-pass/candidates/gettysburg-v4/union-e-march-candidate.png',
    receipt: '/docs/art-pass/reviews/gettysburg-v4-march-measurement.json',
    width: 1254, height: 1254, columns: 2, rows: 2,
    status: 'pilot', statusLabel: 'Retained gait · opt-in only', approved: false,
    phases: ['Far contact', 'First passing', 'Near contact', 'Opposite passing'],
    root: { x: 310 / 627, y: 565 / 627, kind: 'measured', meaning: 'Unchanged V4 pelvis roots and row-shared ground planes; approximately ±5 native pixels' },
    phaseRoots: [[310, 565], [310, 565], [307, 550], [316, 550]].map(([x, y]) => ({ x: x / 627, y: y / 627 })),
    referenceHeight: 412,
    limitations: [
      'This is the exact V4 march source, retained after the fresh E march repeated its contact silhouettes.',
      'Registration describes source placement; it does not establish anatomical footwork or kit continuity.',
      'Low-alpha colored residue remains unchanged. V5 adds stationary actions rather than claiming a new E gait.',
      'Only Union A is covered; production and full-family approval remain false.',
    ],
  }),
  Object.freeze({
    id: 'union-e-actions-v5', label: 'Union E — distinct bayonet and loading rod',
    source: '/docs/art-pass/candidates/gettysburg-v5/union-e-actions-candidate.png',
    receipt: '/docs/art-pass/reviews/gettysburg-v5-actions-e-measurement.json',
    width: 1254, height: 1254, columns: 2, rows: 2,
    status: 'pilot', statusLabel: 'New stationary actions · opt-in only', approved: false,
    phases: ['Ready carry', 'Shouldered aim / fire', 'Simplified loading', 'Raised ramrod'],
    root: { x: 219 / 627, y: 609 / 627, kind: 'measured', meaning: 'Manual pelvis roots and row-shared ground planes, approximately ±5–8 native pixels; one ready-based scale across all stationary actions' },
    phaseRoots: [[219, 609], [145, 609], [247, 590], [233, 590]].map(([x, y]) => ({ x: x / 627, y: y / 627 })),
    referenceHeight: 485,
    limitations: [
      'Offset socket bayonet is visually separate from bore and ramrod; loading is still two simplified states, not a complete verified drill.',
      'Ready/load/ram diagnostic body spans are 481/478/476 px. One 485 px ground reference preserves the remaining source variation.',
      'Firing retains the same scale; its lower head remains posture rather than a height correction.',
      'Colored RGB residue persists below alpha8 in the measured blue diagnostic; no alpha cleanup was applied.',
      'Source and geometry review support a limited preview; historical, human and production validation remain incomplete.',
    ],
  }),
  Object.freeze({
    id: 'union-e-march-v4', label: 'Union E — steadier rifle gait',
    source: '/docs/art-pass/candidates/gettysburg-v4/union-e-march-candidate.png',
    receipt: '/docs/art-pass/reviews/gettysburg-v4-march-measurement.json',
    width: 1254, height: 1254, columns: 2, rows: 2,
    status: 'pilot', statusLabel: 'Opt-in action-family preview', approved: false,
    phases: ['Far contact', 'First passing', 'Near contact', 'Opposite passing'],
    root: { x: 310 / 627, y: 565 / 627, kind: 'measured', meaning: 'Manual pelvis roots and row-shared ground planes; approximately ±5 source pixels' },
    phaseRoots: [[310, 565], [310, 565], [307, 550], [316, 550]].map(([x, y]) => ({ x: x / 627, y: y / 627 })),
    referenceHeight: 412,
    limitations: [
      'Two-hand rifle grips and a distinct bayonet are steadier; contacts and passing silhouettes differ.',
      'Rows differ in source placement. Registered preview uses measured roots and one march reference; it cannot certify anatomy.',
      'Colored edge fringes, faint ghost pixels, and occluded passing boots remain.',
      'Only Union A, E is covered; this is not production-approved art.',
    ],
  }),
  Object.freeze({
    id: 'union-e-actions-v4', label: 'Union E — ready, aim, load, ram',
    source: '/docs/art-pass/candidates/gettysburg-v4/union-e-actions-candidate.png',
    receipt: '/docs/art-pass/reviews/gettysburg-v4-actions-measurement.json',
    width: 1254, height: 1254, columns: 2, rows: 2,
    status: 'pilot', statusLabel: 'Opt-in action-family preview', approved: false,
    phases: ['Ready carry', 'Shouldered aim / fire', 'Simplified loading', 'Raised ramrod'],
    root: { x: 224 / 627, y: 590 / 627, kind: 'measured', meaning: 'Manual pelvis roots and row-shared ground planes; separate reload reference corrects source size drift in-game' },
    phaseRoots: [[224, 590], [138, 590], [222, 570], [228, 570]].map(([x, y]) => ({ x: x / 627, y: y / 627 })),
    referenceHeight: 426,
    limitations: [
      'Cheek meets the stock and both hands support the rifle; discharge effects are drawn by the game.',
      'This reviewer keeps one 426 px reference to expose the larger reload source. In-game reload uses a separately measured 447 px reference.',
      'Ramrod and bayonet partly coalesce near the muzzle; these two states are not a full or historically certified loading drill.',
      'Source placement, weapon detail, and edge fringes still limit promotion.',
    ],
  }),
  Object.freeze({
    id: 'union-e-rig-guided', label: 'Union E — rig-guided gait pilot',
    source: '/docs/art-pass/candidates/gettysburg-v3/union-e-rig-guided-candidate.png',
    width: 2172, height: 724, columns: 4, rows: 1,
    status: 'pilot', statusLabel: 'Opt-in gait pilot', approved: false,
    phases: ['Left / far contact', 'Near / right passing', 'Right / near contact', 'Far / left passing'],
    root: { x: .5, y: 632 / 724, kind: 'measured', meaning: 'Manual pelvis roots with shared ground row 632 px; approximately ±5 source pixels of annotation uncertainty' },
    phaseRoots: [272, 266, 291, 313].map(x => ({ x: x / 543, y: 632 / 724 })),
    referenceHeight: 548,
    limitations: [
      'Registered view centers the recorded pelvis roots and retains one 548 px body-height reference; it does not remove source posture variation.',
      'Passing sole offset remains up to 19 source pixels, and apparent human height varies 2.9% across phases.',
      'Musket grip shifts between poses; bayonet details and continuity with ready, firing, and casualty actions remain under review.',
      'This is an opt-in movement pilot, not production-approved artwork or anatomical validation.',
    ],
  }),
  Object.freeze({
    id: 'union-e-strip', label: 'Union E — four-pose attempt',
    source: '/docs/art-pass/candidates/gettysburg-v3/union-e-strip-rejected.png',
    width: 1983, height: 793, columns: 4, rows: 1,
    status: 'rejected', statusLabel: 'Rejected source', approved: false,
    phases: ['Contact requested', 'Passing requested', 'Opposite contact requested', 'Opposite passing requested'],
    root: { x: .5, y: .88, kind: 'nominal', meaning: 'Nominal cell guide; no authored root registration' },
    limitations: [
      'Contact samples repeat the leading-leg silhouette instead of providing reliable opposing contacts.',
      'Equal sheet divisions do not establish clean crops, anatomy, or consistent body registration.',
    ],
  }),
  Object.freeze({
    id: 'union-e-single', label: 'Union E — opposing-contact attempt',
    source: '/docs/art-pass/candidates/gettysburg-v3/union-e-single-rejected.png',
    width: 1024, height: 1536, columns: 1, rows: 1,
    status: 'rejected', statusLabel: 'Rejected source', approved: false,
    phases: ['Single rejected pose'],
    root: { x: .5, y: .88, kind: 'nominal', meaning: 'Nominal cell guide; no authored root registration' },
    limitations: [
      'Rejected opposing-contact attempt; this single pose cannot demonstrate an alternating cycle.',
      'Camera, body scale, and contact registration remain unapproved.',
    ],
  }),
  Object.freeze({
    id: 'union-e-rig', label: 'Union E — native Blender gait guide',
    source: '/docs/art-pass/candidates/gettysburg-v3/union-e-rig-guide.png',
    receipt: '/docs/art-pass/candidates/gettysburg-v3/union-e-rig-guide.json',
    width: 1536, height: 512, columns: 4, rows: 1,
    status: 'reference_only', statusLabel: 'Structural reference only', approved: false,
    phases: ['Left / far contact', 'Near / right passing', 'Right / near contact', 'Far / left passing'],
    root: { x: 192 / 384, y: 440 / 512, kind: 'authored', meaning: 'Authored rig ground origin: 192, 440 px per cell' },
    referenceHeight: 250,
    limitations: [
      'Distinct articulated rig poses provide structural cues; stylized anatomy and equipment are not accepted game art.',
      'Head moves 6.438 source pixels vertically; musket tilt and missing distinct bayonet are inherited rig limitations.',
    ],
  }),
];

const v6Stationary = Object.freeze({
  id: 'union-se-actions-v6', label: 'Union A SE — matching ready, fire, load, ram',
  source: '/docs/art-pass/candidates/gettysburg-v6/union-se-actions-padded-candidate.png',
  receipt: '/docs/art-pass/reviews/gettysburg-v6-actions-se-measurement.json',
  width: 1254, height: 1254, columns: 2, rows: 2,
  status: 'pilot', statusLabel: 'Matching diagonal actions · opt-in only', approved: false,
  phases: ['Ready carry', 'Shouldered aim / fire', 'Simplified loading', 'Raised ramrod'],
  root: { x: 270 / 627, y: 590 / 627, kind: 'measured', meaning: 'Manual pelvis and row-shared ground references, approximately ±5–8 native pixels; one shared stationary scale' },
  phaseRoots: [[270, 590], [238, 590], [310, 587], [265, 587]].map(([x, y]) => ({ x: x / 627, y: y / 627 })),
  referenceHeight: 495,
  limitations: [
    'Firing barrel projects approximately 31° down-right; shoulder, cheek and grips are plausible by model-assisted review, not anatomical certification.',
    'Ready/load/ram spans are 483/491/488 px; one 495 px reference preserves source and posture variation.',
    'Loading remains two representative states, not a verified historical drill; single firing pose lacks recoil/settling.',
    'Native corrections changed some untargeted details. Earlier padding and firing-bearing failures remain recorded.',
    'Solid alpha64 padding passes; low-alpha RGB/boundary residue remains untouched.',
    'Only E/SE Union A is supported by v6; other bearings, armies, identities, melee and casualties retain accepted artwork.',
  ],
});
const v6Retained = ['union-e-march-v5', 'union-e-actions-v5', 'union-se-march-v5'].map(id => {
  const previous = PREVIOUS_STUDIES.find(study => study.id === id);
  return Object.freeze({ ...previous, id: id.replace('-v5', '-v6'),
    label: id.includes('-actions-') ? 'Union A E — matching stationary actions'
      : id.includes('-se-') ? 'Union A SE — retained four-phase march' : 'Union A E — retained four-phase march',
    limitations: [...previous.limitations.map(line => line.startsWith('SE has march coverage only.')
      ? 'This retained sheet supplies SE march; v6 pairs it with a separately reviewed stationary action source.'
      : line.replace('V5 adds stationary actions rather than claiming a new E gait.', 'E stationary actions are separately retained; the E gait is unchanged.')),
      'Exact retained source in v6; v6 adds matching SE stationary actions.'],
  });
});
function buildAnnotatedStudies(annotations, version, statusLabel) {
  return annotations.sources.map(spec => {
    const [kind, bearing] = spec.name.split('-');
    const cellOrder = spec.actions.flatMap(([, indexes]) => indexes);
    const roots = cellOrder.map(index => spec.roots[index]);
    const phases = kind === 'march'
      ? ['Left contact', 'Left support passing', 'Right contact', 'Right support passing']
      : ['Ready carry', 'Shouldered aim / fire', 'Simplified loading', 'Raised ramrod'];
    return Object.freeze({
      id: `${spec.side}${spec.identity === 'a' ? '' : `-${spec.identity}`}-${bearing}-${kind}-${version}`,
      label: `${spec.side === 'union' ? 'Union' : 'Confederate'} ${spec.identity.toUpperCase()} ${bearing.toUpperCase()} — ${kind === 'march' ? 'alternating contact and passing' : 'matching ready, fire, load, ram'}`,
      source: `/${spec.source}`,
      sourceSha256: spec.sha256,
      receipt: spec.receipt ? `/${spec.receipt}` : `/docs/art-pass/reviews/gettysburg-${version}-${spec.measurementName}-measurement.json`,
      width: spec.cell * 2, height: spec.cell * 2, columns: 2, rows: 2, cellOrder,
      status: 'pilot', statusLabel, approved: false, phases,
      root: { x: roots[0][0] / spec.cell, y: roots[0][1] / spec.cell, kind: 'measured', meaning: spec.annotationMethod },
      phaseRoots: roots.map(([x, y]) => ({ x: x / spec.cell, y: y / spec.cell })),
      referenceHeight: spec.referenceHeight, limitations: spec.limitations,
    });
  });
}
const v7BoardStudies = buildAnnotatedStudies(v7SourceAnnotations, 'v7', 'Board-facing source · opt-in only');
const v8FlankingStudies = buildAnnotatedStudies(v8SourceAnnotations, 'v8', 'SW flanking source · opt-in only');
const v7Retained = [v6Stationary, ...v6Retained].map(study => Object.freeze({
  ...study, id: study.id.replace('-v6', '-v7'),
  label: `${study.label} · v7 retained`,
  limitations: [...study.limitations.map(line => line.startsWith('Only E/SE Union A is supported by v6;')
    ? 'This retained source supports Union A SE actions in v7; new board-facing sheets supply Union S A/B and Confederate N A.'
    : line), 'Exact retained E/SE source; no B E/SE coverage in v7.'],
}));
const v8Retained = [...v7BoardStudies, ...v7Retained].map(study => Object.freeze({
  ...study, id: study.id.replace(/-v7$/, '-v8'),
  label: `${study.label} · v8 retained`,
  statusLabel: 'Exact retained source · opt-in only',
  retainedFrom: study.id,
  limitations: [...study.limitations.filter(line => !line.includes('new board-facing sheets supply')
    && !line.includes('no B E/SE coverage in v7')),
    'Exact v7 source retained for v8 review; this adds no new bearing, identity, action or production approval.',
    'V8 adds separately annotated Union A/B SW march and stationary actions. This retained study keeps its original image, measurements, cell order and limitations.'],
}));
const v9WestStudies = buildAnnotatedStudies(v9SourceAnnotations, 'v9', 'West source · opt-in only');
const v9Retained = [...v8FlankingStudies, ...v8Retained].map(study => Object.freeze({
  ...study, id: study.id.replace(/-v8$/, '-v9'),
  label: `${study.label} · v9 retained`,
  statusLabel: 'Exact retained source · opt-in only',
  retainedFrom: study.id,
  limitations: [...study.limitations,
    'Exact v8 source retained for v9 review; this adds no new bearing, identity, action or production approval.',
    'V9 adds separately annotated Union A/B W march and stationary actions. This retained study keeps its original image, measurements, cell order and limitations.'],
}));
const v10DiagonalStudies = buildAnnotatedStudies(v10SourceAnnotations, 'v10', 'Confederate diagonal source · opt-in only');
const v10Retained = [...v9WestStudies, ...v9Retained].map(study => Object.freeze({
  ...study, id: study.id.replace(/-v9$/, '-v10'),
  label: `${study.label} · v10 retained`,
  statusLabel: 'Exact retained source · opt-in only',
  retainedFrom: study.id,
  limitations: [...study.limitations,
    'Exact v9 source retained for v10 review; this adds no new bearing, identity, action or production approval.',
    'V10 adds separately annotated Confederate A NE/NW march and stationary actions. This retained study keeps its original image, measurements, cell order and limitations.'],
}));
const v11UnionBStudies = buildAnnotatedStudies(v11SourceAnnotations, 'v11', 'Union B E/SE source · opt-in only');
const v11Retained = [...v10DiagonalStudies, ...v10Retained].map(study => Object.freeze({
  ...study, id: study.id.replace(/-v10$/, '-v11'),
  label: `${study.label} · v11 retained`,
  statusLabel: 'Exact retained source · opt-in only',
  retainedFrom: study.id,
  limitations: [...study.limitations,
    'Exact v10 source retained for v11 review; this adds no new bearing, identity, action or production approval.',
    'V11 adds separately annotated Union B E/SE march and stationary actions. This retained study keeps its original image, measurements, cell order and limitations.'],
}));
const v13ConfederateStudies = buildAnnotatedStudies(v13SourceAnnotations, 'v13', 'Confederate E/W source · opt-in only');
const v13Retained = [...v11UnionBStudies, ...v11Retained].map(study => Object.freeze({
  ...study, id: study.id.replace(/-v11$/, '-v13'),
  label: `${study.label} · v13 retained`,
  statusLabel: 'Exact retained source · opt-in only',
  retainedFrom: study.id,
  limitations: [...study.limitations,
    'Exact v12 source retained for v13 review; v12 reused the v11 sources and added renderer-owned shot motion.',
    'V13 adds separately annotated Confederate A E/W march and stationary actions. This retained study keeps its original image, measurements, cell order and limitations.'],
}));
const v14ConfederateStudies = buildAnnotatedStudies(v14SourceAnnotations, 'v14', 'Confederate south source · opt-in only');
const v14Retained = [...v13ConfederateStudies, ...v13Retained].map(study => Object.freeze({
  ...study, id: study.id.replace(/-v13$/, '-v14'),
  label: `${study.label} · v14 retained`,
  statusLabel: 'Exact retained source · opt-in only',
  retainedFrom: study.id,
  limitations: [...study.limitations,
    'Exact v13 source retained for v14 review; this adds no new bearing, identity, action or production approval.',
    'V14 adds separately annotated Confederate A S march and stationary actions. This retained study keeps its original image, measurements, cell order and limitations.'],
}));
const reviewedSource = spec => spec?.nativeReview?.sourceHash === spec.sha256
  && spec.nativeReview.independentReview === true && spec.nativeReview.allFourCellsReviewed === true
  && spec.nativeReview.kitAccepted === true && typeof spec.sourceReview === 'string' && spec.sourceReview.trim().length > 0
  && /^[a-f0-9]{64}$/i.test(spec.sourceReviewSHA256 || '');
const v15ConfederateStudies = buildAnnotatedStudies(v15SourceAnnotations, 'v15', 'Confederate SE/SW source · opt-in only')
  .map((study, index) => Object.freeze({ ...study, sourceReviewed: reviewedSource(v15SourceAnnotations.sources[index]) }));
const v15Retained = [...v14ConfederateStudies, ...v14Retained].map(study => Object.freeze({
  ...study, id: study.id.replace(/-v14$/, '-v15'),
  label: `${study.label} · v15 retained`,
  statusLabel: 'Exact retained source · opt-in only',
  retainedFrom: study.id,
  // The default S/SE/SW inspection requires the independent source reviews
  // for its retained S pair as well as the four new native diagonal sheets.
  sourceReviewed: v14SourceAnnotations.sources.some(spec => spec.sha256 === study.sourceSha256 && reviewedSource(spec)),
  limitations: [...study.limitations,
    'Exact v14 source retained for v15 review; this adds no new bearing, identity, action or production approval.',
    'V15 adds separately annotated Confederate A SE/SW march and stationary actions. This retained study keeps its original image, measurements, cell order and limitations.'],
}));
// One whole-source replacement is enough for the v15/v16 SW comparison;
// historical reviewer rows keep their original identities and measurements.
const v16ConfederateSWStudies = buildAnnotatedStudies(v16SourceAnnotations, 'v16', 'Confederate SW stature source · opt-in only')
  .map((study, index) => Object.freeze({ ...study, sourceReviewed: reviewedSource(v16SourceAnnotations.sources[index]) }));
export const GETTYSBURG_MOTION_STUDIES = Object.freeze([
  ...v16ConfederateSWStudies,
  ...v15ConfederateStudies, ...v15Retained,
  ...v14ConfederateStudies, ...v14Retained,
  ...v13ConfederateStudies, ...v13Retained,
  ...v11UnionBStudies, ...v11Retained,
  ...v10DiagonalStudies, ...v10Retained,
  ...v9WestStudies, ...v9Retained,
  ...v8FlankingStudies, ...v8Retained, ...v7BoardStudies, ...v7Retained, v6Stationary, ...v6Retained, ...PREVIOUS_STUDIES,
]);

export function getGettysburgMotionStudyCell(study, phase) {
  const count = study?.columns * study?.rows;
  if (!Number.isInteger(count) || count <= 0 || !Number.isInteger(phase) || phase < 0 || phase >= count) return null;
  const order = study.cellOrder;
  if (order !== undefined && (!Array.isArray(order) || order.length !== count || new Set(order).size !== count
    || order.some(index => !Number.isInteger(index) || index < 0 || index >= count))) return null;
  const sourceIndex = order?.[phase] ?? phase;
  const width = study.width / study.columns;
  const height = study.height / study.rows;
  return { x: sourceIndex % study.columns * width, y: Math.floor(sourceIndex / study.columns) * height, w: width, h: height };
}
