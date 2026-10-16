import { CAMPAIGN_FINAL_TURN, classifyCampaignEnding } from './simulationEngine.js';

// Created scene art is a presentation layer. Returning null preserves the
// caller's existing creator/archive media; no archival record is relabeled.
const generated = {
  kind: 'generated-art',
  historicalMedium: 'generated-art',
  label: 'AI-generated historical interpretation',
  credit: 'Created for Titans of War with AI image generation · 2026',
  width: 1672,
  height: 941,
  cropMode: 'contain',
  cropFocus: { x: 0.5, y: 0.5 },
};

export const PRESENTATION_ART = Object.freeze({
  sumter: Object.freeze({
    ...generated,
    id: 'sumter-command-v3',
    src: '/images/presentation/sumter-command-v3.webp',
    title: 'Sumter — the surrender decision',
    alt: 'An imagined scene of exhausted Union soldiers beside a heavy gun while an officer reads a paper in a damaged Fort Sumter casemate.',
    caption: 'Fort Sumter, April 13, 1861. An imagined command scene during the surrender decision; the historical garrison evacuated on April 14.',
    scopeNote: 'Anonymous figures and reconstructed details; not an eyewitness image or an exact architectural record.',
    sourceLinks: Object.freeze([
      Object.freeze({
        title: 'Anderson’s evacuation report and NPS historical context',
        url: 'https://home.nps.gov/articles/battle-of-fort-sumter-april-1861.htm',
        evidenceType: 'Primary report reproduced within institutional history',
        supports: 'The damaged fort, April 13 acceptance of terms and April 14 evacuation; not the exact depicted people, equipment or viewpoint.',
      }),
    ]),
  }),
  hamptonRoads: Object.freeze({
    ...generated,
    id: 'hampton-roads-v3',
    src: '/images/presentation/hampton-roads-v3.webp',
    title: 'Hampton Roads — ironclads in confrontation',
    alt: 'An imagined view of the low turreted USS Monitor and the sloping armored CSS Virginia exchanging fire on open water.',
    caption: 'USS Monitor and CSS Virginia, March 9, 1862. This interpretation shows the following day’s historical encounter as context for the March 8 naval decision.',
    scopeNote: 'The historical duel ended in a draw. The image does not predict your selected option or authenticate ship dimensions and positions.',
    sourceLinks: Object.freeze([
      Object.freeze({
        title: 'USS Monitor — NOAA battle history',
        url: 'https://monitor.noaa.gov/shipwrecks/uss_monitor.html',
        evidenceType: 'Institutional historical synthesis',
        supports: 'The two ironclads fought on March 9, 1862; their specific painted positions and construction details are interpretive.',
      }),
      Object.freeze({
        title: 'NOAA — the ironclad encounter and its outcome',
        url: 'https://monitor.noaa.gov/about/history.html',
        evidenceType: 'Institutional historical synthesis',
        supports: 'The prolonged encounter ended in a draw, not the destruction of either vessel at Hampton Roads.',
      }),
    ]),
  }),
  appomattox: Object.freeze({
    ...generated,
    id: 'appomattox-paroles-v3',
    src: '/images/presentation/appomattox-paroles-v3.webp',
    title: 'Appomattox — paroles and the road home',
    alt: 'An imagined parole scene with a Union clerk recording papers, two worn Confederate soldiers waiting and other soldiers walking toward a village.',
    caption: 'Appomattox, April 1865. An imagined scene of parole paperwork after Lee’s historical surrender; the choices in this campaign can lead elsewhere.',
    scopeNote: 'Anonymous figures and an interpretive village setting, not Grant and Lee signing at the McLean House.',
    sourceLinks: Object.freeze([
      Object.freeze({
        title: 'Grant’s terms and Lee’s acceptance — April 9, 1865',
        url: 'https://home.nps.gov/apco/learn/historyculture/surrender-documents.htm',
        evidenceType: 'Primary correspondence reproduced and transcribed by NPS',
        supports: 'The Army of Northern Virginia’s surrender, paroles and conditional return home; not the depicted clerk, village buildings or a settlement binding every army.',
      }),
    ]),
  }),
});

const SCENARIO_ART = new Map([
  ['fort_sumter', PRESENTATION_ART.sumter],
  ['naval_technology', PRESENTATION_ART.hamptonRoads],
  ['appomattox_decision', PRESENTATION_ART.appomattox],
]);

const APPOMATTOX_ENDING_ART = Object.freeze({
  ...PRESENTATION_ART.appomattox,
  caption: 'An imagined parole scene after the Army of Northern Virginia’s surrender. The historical terms allowed a conditional return home; they did not settle every political question of reunion.',
});

/** Unknown, generated and unrelated scenarios retain their existing media. */
export function resolvePresentationArt(scenarioId) {
  return typeof scenarioId === 'string' ? SCENARIO_ART.get(scenarioId) || null : null;
}

/**
 * A parole illustration belongs only to the completed Appomattox parole route.
 * Do not infer an ending from an earlier surrender entry or a broad word match:
 * Greensboro, negotiated independence, collapse and final charges differ.
 */
export function resolveEndingPresentationArt(state) {
  if (!state || state.gameOver !== true || !Array.isArray(state.history)) return null;
  if (!Number.isFinite(state.currentTurn) || state.currentTurn < CAMPAIGN_FINAL_TURN) return null;
  const lastEntry = state.history.at(-1);
  if (lastEntry?.scenarioId !== 'appomattox_decision' || lastEntry?.choiceId !== 'option_b') return null;
  return classifyCampaignEnding(state).endingClass === 'Parole and Reunion' ? APPOMATTOX_ENDING_ART : null;
}
