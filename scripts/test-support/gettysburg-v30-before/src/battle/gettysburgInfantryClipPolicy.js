// Small selection policy only: atlas JSON is loaded by Phaser for the selected
// pass, never imported into the application bundle for normal play.
const atlas = (directory, key, image) => Object.freeze({ directory, key, image });
const marchE3 = atlas('gettysburg-v3', 'union-gettysburg-v3-march-e', 'union-a-march-e.png');
const marchE4 = atlas('gettysburg-v4', 'union-gettysburg-v4-march-e', 'union-a-march-e.png');
const actionsE4 = atlas('gettysburg-v4', 'union-gettysburg-v4-actions-e', 'union-a-actions-e.png');
const actionsE5 = atlas('gettysburg-v5', 'union-gettysburg-v5-actions-e', 'union-a-actions-e.png');
const marchSE5 = atlas('gettysburg-v5', 'union-gettysburg-v5-march-se', 'union-a-march-se.png');
const actionsSE6 = atlas('gettysburg-v6', 'union-gettysburg-v6-actions-se', 'union-a-actions-se.png');
const v6Atlases = [marchE4, actionsE5, marchSE5, actionsSE6];
const v7Atlases = [...v6Atlases,
  atlas('gettysburg-v7', 'union-gettysburg-v7-a-march-s', 'union-a-march-s.png'),
  atlas('gettysburg-v7', 'union-gettysburg-v7-a-actions-s', 'union-a-actions-s.png'),
  atlas('gettysburg-v7', 'union-gettysburg-v7-b-march-s', 'union-b-march-s.png'),
  atlas('gettysburg-v7', 'union-gettysburg-v7-b-actions-s', 'union-b-actions-s.png'),
  atlas('gettysburg-v7', 'confederate-gettysburg-v7-a-march-n', 'confederate-a-march-n.png'),
  atlas('gettysburg-v7', 'confederate-gettysburg-v7-a-actions-n', 'confederate-a-actions-n.png'),
];
const v8Atlases = [...v7Atlases,
  atlas('gettysburg-v8', 'union-gettysburg-v8-a-march-sw', 'union-a-march-sw.png'),
  atlas('gettysburg-v8', 'union-gettysburg-v8-a-actions-sw', 'union-a-actions-sw.png'),
  atlas('gettysburg-v8', 'union-gettysburg-v8-b-march-sw', 'union-b-march-sw.png'),
  atlas('gettysburg-v8', 'union-gettysburg-v8-b-actions-sw', 'union-b-actions-sw.png'),
];
const v9Atlases = [...v8Atlases,
  atlas('gettysburg-v9', 'union-gettysburg-v9-a-march-w', 'union-a-march-w.png'),
  atlas('gettysburg-v9', 'union-gettysburg-v9-a-actions-w', 'union-a-actions-w.png'),
  atlas('gettysburg-v9', 'union-gettysburg-v9-b-march-w', 'union-b-march-w.png'),
  atlas('gettysburg-v9', 'union-gettysburg-v9-b-actions-w', 'union-b-actions-w.png'),
];
const v10Atlases = [...v9Atlases,
  atlas('gettysburg-v10', 'confederate-gettysburg-v10-a-march-ne', 'confederate-a-march-ne.png'),
  atlas('gettysburg-v10', 'confederate-gettysburg-v10-a-actions-ne', 'confederate-a-actions-ne.png'),
  atlas('gettysburg-v10', 'confederate-gettysburg-v10-a-march-nw', 'confederate-a-march-nw.png'),
  atlas('gettysburg-v10', 'confederate-gettysburg-v10-a-actions-nw', 'confederate-a-actions-nw.png'),
];
const v11Atlases = [...v10Atlases,
  atlas('gettysburg-v11', 'union-gettysburg-v11-b-march-e', 'union-b-march-e.png'),
  atlas('gettysburg-v11', 'union-gettysburg-v11-b-actions-e', 'union-b-actions-e.png'),
  atlas('gettysburg-v11', 'union-gettysburg-v11-b-march-se', 'union-b-march-se.png'),
  atlas('gettysburg-v11', 'union-gettysburg-v11-b-actions-se', 'union-b-actions-se.png'),
];
const v13Atlases = [...v11Atlases,
  atlas('gettysburg-v13', 'confederate-gettysburg-v13-a-march-e', 'confederate-a-march-e.png'),
  atlas('gettysburg-v13', 'confederate-gettysburg-v13-a-actions-e', 'confederate-a-actions-e.png'),
  atlas('gettysburg-v13', 'confederate-gettysburg-v13-a-march-w', 'confederate-a-march-w.png'),
  atlas('gettysburg-v13', 'confederate-gettysburg-v13-a-actions-w', 'confederate-a-actions-w.png'),
];
const v14Atlases = [...v13Atlases,
  atlas('gettysburg-v14', 'confederate-gettysburg-v14-a-march-s', 'confederate-a-march-s.png'),
  atlas('gettysburg-v14', 'confederate-gettysburg-v14-a-actions-s', 'confederate-a-actions-s.png'),
];
const v15Atlases = [...v14Atlases,
  atlas('gettysburg-v15', 'confederate-gettysburg-v15-a-march-se', 'confederate-a-march-se.png'),
  atlas('gettysburg-v15', 'confederate-gettysburg-v15-a-actions-se', 'confederate-a-actions-se.png'),
  atlas('gettysburg-v15', 'confederate-gettysburg-v15-a-march-sw', 'confederate-a-march-sw.png'),
  atlas('gettysburg-v15', 'confederate-gettysburg-v15-a-actions-sw', 'confederate-a-actions-sw.png'),
];
// Replace one complete native action for this opt-in; every historical pass
// keeps its original descriptor and the selected texture count stays fixed.
const v16Atlases = v15Atlases.map(descriptor => descriptor.key === 'confederate-gettysburg-v15-a-march-sw'
  ? atlas('gettysburg-v16', 'confederate-gettysburg-v16-a-march-sw', 'confederate-a-march-sw.png')
  : descriptor);
const v18Atlases = v16Atlases.map(descriptor => descriptor.key === 'confederate-gettysburg-v13-a-actions-e'
  ? atlas('gettysburg-v18', 'confederate-gettysburg-v18-a-actions-e', 'confederate-a-actions-e.png')
  : descriptor);
const policy = (directions, atlases, stableUnionIdentity = false) => Object.freeze({
  directions: Object.freeze(directions), atlases: Object.freeze(atlases), stableUnionIdentity,
});
const POLICIES = Object.freeze({
  'gettysburg-v3': policy([0], [marchE3]),
  'gettysburg-v4': policy([0], [marchE4, actionsE4]),
  'gettysburg-v5': policy([0, 1], [marchE4, actionsE5, marchSE5]),
  'gettysburg-v6': policy([0, 1], v6Atlases),
  'gettysburg-v7': policy([0, 1, 2, 6], v7Atlases, true),
  'gettysburg-v8': policy([0, 1, 2, 3, 6], v8Atlases, true),
  'gettysburg-v9': policy([0, 1, 2, 3, 4, 6], v9Atlases, true),
  'gettysburg-v10': policy([0, 1, 2, 3, 4, 5, 6, 7], v10Atlases, true),
  'gettysburg-v11': policy([0, 1, 2, 3, 4, 5, 6, 7], v11Atlases, true),
  // Motion-only opt-in: the reviewed sources, keys and metadata stay v11.
  'gettysburg-v12': Object.freeze({
    ...policy([0, 1, 2, 3, 4, 5, 6, 7], v11Atlases, true), shotMotion: true,
  }),
  'gettysburg-v13': Object.freeze({
    ...policy([0, 1, 2, 3, 4, 5, 6, 7], v13Atlases, true),
    shotMotion: true, shotPresentationId: 'gettysburg-v13',
  }),
  'gettysburg-v14': Object.freeze({
    ...policy([0, 1, 2, 3, 4, 5, 6, 7], v14Atlases, true),
    shotMotion: true, shotPresentationId: 'gettysburg-v14',
  }),
  'gettysburg-v15': Object.freeze({
    ...policy([0, 1, 2, 3, 4, 5, 6, 7], v15Atlases, true),
    shotMotion: true, shotPresentationId: 'gettysburg-v15',
  }),
  'gettysburg-v16': Object.freeze({
    ...policy([0, 1, 2, 3, 4, 5, 6, 7], v16Atlases, true),
    shotMotion: true, shotPresentationId: 'gettysburg-v16',
  }),
  // Presentation-only opt-in: exactly the v16 atlases; reload advances once
  // from loading to ramming using existing combat checkpoint facts.
  'gettysburg-v17': Object.freeze({
    ...policy([0, 1, 2, 3, 4, 5, 6, 7], v16Atlases, true),
    shotMotion: true, shotPresentationId: 'gettysburg-v17', monotonicReload: true,
  }),
  // One whole-source six-cell stationary pilot: ready, fire, and four ordered
  // loading poses. Other selected sources and all historical policies stay exact.
  'gettysburg-v18': Object.freeze({
    ...policy([0, 1, 2, 3, 4, 5, 6, 7], v18Atlases, true),
    shotMotion: true, shotPresentationId: 'gettysburg-v18', monotonicReload: true, nativeReloadSequence: true,
  }),
});

export const GETTYSBURG_INFANTRY_CLIPS_IDS = Object.freeze(Object.keys(POLICIES));

// Keep the historical registry and its preservation inventory exact. V20 is
// a separate opt-in contact/casualty extension of the complete v18 family.
// Existing shot checkpoints retain their v18 presentation identity.
const V20_CONTACT_POLICY = Object.freeze({
  ...POLICIES['gettysburg-v18'],
  atlases: Object.freeze([...v18Atlases,
    atlas('gettysburg-v20', 'confederate-gettysburg-v20-a-contact-e', 'confederate-a-contact-e.png'),
    atlas('gettysburg-v20', 'confederate-gettysburg-v20-a-casualty-e', 'confederate-a-casualty-e.png'),
  ]),
  nativeContactCasualty: true,
});

// An additive Union A west partner. Both existing registries and the whole
// Confederate v20 policy remain exact; Union B retains accepted fallback.
const V21_UNION_CONTACT_POLICY = Object.freeze({
  ...V20_CONTACT_POLICY,
  atlases: Object.freeze([...V20_CONTACT_POLICY.atlases,
    atlas('gettysburg-v21', 'union-gettysburg-v21-a-contact-w', 'union-a-contact-w.png'),
    atlas('gettysburg-v21', 'union-gettysburg-v21-a-casualty-w', 'union-a-casualty-w.png'),
  ]),
  nativeUnionContactCasualty: true,
});

// Add the primary opposing north/south contact axis while retaining every
// complete v21 source and the existing v18 shot checkpoint presentation.
const V22_CARDINAL_CONTACT_POLICY = Object.freeze({
  ...V21_UNION_CONTACT_POLICY,
  atlases: Object.freeze([...V21_UNION_CONTACT_POLICY.atlases,
    atlas('gettysburg-v22', 'union-gettysburg-v22-a-contact-s', 'union-a-contact-s.png'),
    atlas('gettysburg-v22', 'union-gettysburg-v22-a-casualty-s', 'union-a-casualty-s.png'),
    atlas('gettysburg-v22', 'confederate-gettysburg-v22-a-contact-n', 'confederate-a-contact-n.png'),
    atlas('gettysburg-v22', 'confederate-gettysburg-v22-a-casualty-n', 'confederate-a-casualty-n.png'),
  ]),
  nativeCardinalContactCasualty: true,
});

// Add the reverse opposing axis through its own reviewed sources. Every v22
// descriptor and capability remains exact, including the v18 shot identity.
const V23_REVERSE_CARDINAL_CONTACT_POLICY = Object.freeze({
  ...V22_CARDINAL_CONTACT_POLICY,
  atlases: Object.freeze([...V22_CARDINAL_CONTACT_POLICY.atlases,
    atlas('gettysburg-v23', 'union-gettysburg-v23-a-contact-n', 'union-a-contact-n.png'),
    atlas('gettysburg-v23', 'union-gettysburg-v23-a-casualty-n', 'union-a-casualty-n.png'),
    atlas('gettysburg-v23', 'confederate-gettysburg-v23-a-contact-s', 'confederate-a-contact-s.png'),
    atlas('gettysburg-v23', 'confederate-gettysburg-v23-a-casualty-s', 'confederate-a-casualty-s.png'),
  ]),
  nativeReverseCardinalContactCasualty: true,
});

// Add the remaining opposing east/west partners through separate reviewed
// sources, retaining every v23 descriptor and the v18 shot identity.
const V24_REVERSE_LATERAL_CONTACT_POLICY = Object.freeze({
  ...V23_REVERSE_CARDINAL_CONTACT_POLICY,
  atlases: Object.freeze([...V23_REVERSE_CARDINAL_CONTACT_POLICY.atlases,
    atlas('gettysburg-v24', 'union-gettysburg-v24-a-contact-e', 'union-a-contact-e.png'),
    atlas('gettysburg-v24', 'union-gettysburg-v24-a-casualty-e', 'union-a-casualty-e.png'),
    atlas('gettysburg-v24', 'confederate-gettysburg-v24-a-contact-w', 'confederate-a-contact-w.png'),
    atlas('gettysburg-v24', 'confederate-gettysburg-v24-a-casualty-w', 'confederate-a-casualty-w.png'),
  ]),
  nativeReverseLateralContactCasualty: true,
});

// Add the first opposing diagonal partners through separate reviewed sources,
// retaining every v24 descriptor, stable identity and the v18 shot identity.
const V25_DIAGONAL_CONTACT_POLICY = Object.freeze({
  ...V24_REVERSE_LATERAL_CONTACT_POLICY,
  atlases: Object.freeze([...V24_REVERSE_LATERAL_CONTACT_POLICY.atlases,
    atlas('gettysburg-v25', 'union-gettysburg-v25-a-contact-sw', 'union-a-contact-sw.png'),
    atlas('gettysburg-v25', 'union-gettysburg-v25-a-casualty-sw', 'union-a-casualty-sw.png'),
    atlas('gettysburg-v25', 'confederate-gettysburg-v25-a-contact-ne', 'confederate-a-contact-ne.png'),
    atlas('gettysburg-v25', 'confederate-gettysburg-v25-a-casualty-ne', 'confederate-a-casualty-ne.png'),
  ]),
  nativeDiagonalContactCasualty: true,
});

// Add the reverse opposing diagonal through its own reviewed native sources,
// preserving every v25 descriptor, stable identity and the v18 shot identity.
const V26_REVERSE_DIAGONAL_CONTACT_POLICY = Object.freeze({
  ...V25_DIAGONAL_CONTACT_POLICY,
  atlases: Object.freeze([...V25_DIAGONAL_CONTACT_POLICY.atlases,
    atlas('gettysburg-v26', 'union-gettysburg-v26-a-contact-ne', 'union-a-contact-ne.png'),
    atlas('gettysburg-v26', 'union-gettysburg-v26-a-casualty-ne', 'union-a-casualty-ne.png'),
    atlas('gettysburg-v26', 'confederate-gettysburg-v26-a-contact-sw', 'confederate-a-contact-sw.png'),
    atlas('gettysburg-v26', 'confederate-gettysburg-v26-a-casualty-sw', 'confederate-a-casualty-sw.png'),
  ]),
  nativeReverseDiagonalContactCasualty: true,
});

// Add both Union northeast identities through separate complete native action
// sources. All v26 descriptors and the shared timing capabilities stay exact.
const V27_UNION_NORTHEAST_ACTION_POLICY = Object.freeze({
  ...V26_REVERSE_DIAGONAL_CONTACT_POLICY,
  atlases: Object.freeze([...V26_REVERSE_DIAGONAL_CONTACT_POLICY.atlases,
    atlas('gettysburg-v27', 'union-gettysburg-v27-a-actions-ne', 'union-a-actions-ne.png'),
    atlas('gettysburg-v27', 'union-gettysburg-v27-b-actions-ne', 'union-b-actions-ne.png'),
  ]),
  nativeUnionNortheastActions: true,
});

// Complete the Union north/northwest stationary sources through both stable
// identities, retaining all v27 sources and the inherited timing behavior.
const V28_UNION_NORTHERN_ACTION_POLICY = Object.freeze({
  ...V27_UNION_NORTHEAST_ACTION_POLICY,
  atlases: Object.freeze([...V27_UNION_NORTHEAST_ACTION_POLICY.atlases,
    atlas('gettysburg-v28', 'union-gettysburg-v28-a-actions-n', 'union-a-actions-n.png'),
    atlas('gettysburg-v28', 'union-gettysburg-v28-a-actions-nw', 'union-a-actions-nw.png'),
    atlas('gettysburg-v28', 'union-gettysburg-v28-b-actions-n', 'union-b-actions-n.png'),
    atlas('gettysburg-v28', 'union-gettysburg-v28-b-actions-nw', 'union-b-actions-nw.png'),
  ]),
  nativeUnionNorthernActions: true,
});

// Compare presentation size only. Every profile shares the complete v28
// source family; historical policies retain their original objects and fields.
const V29_INFANTRY_SCALE_POLICIES = Object.freeze({
  baseline: Object.freeze({ ...V28_UNION_NORTHERN_ACTION_POLICY, infantryScaleProfile: 'baseline', infantryPresentationScale: 1 }),
  moderate: Object.freeze({ ...V28_UNION_NORTHERN_ACTION_POLICY, infantryScaleProfile: 'moderate', infantryPresentationScale: 0.86 }),
  small: Object.freeze({ ...V28_UNION_NORTHERN_ACTION_POLICY, infantryScaleProfile: 'small', infantryPresentationScale: 0.74 }),
});

export function gettysburgInfantryClipPolicy(scenarioId, search = '') {
  if (scenarioId !== 'gettysburg') return null;
  const parameters = new URLSearchParams(search), pass = parameters.get('artPass');
  if (pass === 'gettysburg-v29') {
    const profile = parameters.get('infantryScale');
    return Object.hasOwn(V29_INFANTRY_SCALE_POLICIES, profile) ? V29_INFANTRY_SCALE_POLICIES[profile] : V29_INFANTRY_SCALE_POLICIES.baseline;
  }
  if (pass === 'gettysburg-v28') return V28_UNION_NORTHERN_ACTION_POLICY;
  if (pass === 'gettysburg-v27') return V27_UNION_NORTHEAST_ACTION_POLICY;
  if (pass === 'gettysburg-v26') return V26_REVERSE_DIAGONAL_CONTACT_POLICY;
  if (pass === 'gettysburg-v25') return V25_DIAGONAL_CONTACT_POLICY;
  if (pass === 'gettysburg-v24') return V24_REVERSE_LATERAL_CONTACT_POLICY;
  if (pass === 'gettysburg-v23') return V23_REVERSE_CARDINAL_CONTACT_POLICY;
  if (pass === 'gettysburg-v22') return V22_CARDINAL_CONTACT_POLICY;
  if (pass === 'gettysburg-v21') return V21_UNION_CONTACT_POLICY;
  if (pass === 'gettysburg-v20') return V20_CONTACT_POLICY;
  return Object.hasOwn(POLICIES, pass) ? POLICIES[pass] : null;
}
