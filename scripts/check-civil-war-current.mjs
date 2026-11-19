import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentRoot = realpathSync(fileURLToPath(new URL('..', import.meta.url)));
const [archivePath, ...extraArguments] = process.argv.slice(2);
if (extraArguments.length || archivePath === '--help' || archivePath === '-h') {
  console.log('Usage: node scripts/check-civil-war-current.mjs [path-to-frozen-v44-release]');
  process.exit(extraArguments.length ? 2 : 0);
}

const currentSuites = [
  'battle-engine', 'battle-campaign-integration', 'battle-assessment', 'battle-supply',
  'battle-tactics', 'battle-locations', 'battle-feedback', 'battle-audio', 'audio-lifecycle', 'artillery-visual',
  'battle-usability', 'battle-ui-lifecycle', 'formation-readiness-card', 'mobile-field-controls',
  'campaign-assessment', 'campaign-continuity', 'campaign-experience', 'campaign-field-causality',
  'campaign-save-notice', 'campaign-scenario-context', 'campaign-storage-v6', 'campaign-supply',
  'campaign-terminal-once', 'close-combat', 'command-training', 'coordination-animation', 'editorial-coherence',
  'explicit-battle-move', 'field-attacks', 'field-battles', 'field-checkpoint', 'field-owned-release',
  'field-checkpoint-legacy', 'field-label-layout', 'field-mission-checkpoints', 'field-move-cue', 'field-order-guidance', 'field-performance',
  'field-presentation-cache', 'field-view-context', 'formation-state', 'formation-visual-checkpoint',
  'formation-visuals', 'gettysburg-command-brief', 'gettysburg-field-art',
  'gettysburg-mechanics', 'manassas-combined-arms',
  'manassas-current-plan', 'manassas-infantry-art', 'manassas-infantry-motion', 'map-learning', 'mission-feedback',
  'petersburg-command-presentation', 'petersburg-relief', 'practice-battle-library',
  'practice-conditions', 'presentation-art', 'public-scoring', 'retreat-corridors', 'retreat-guidance', 'retreat-pacing',
  'retreat-versioning', 'scene-pause-snapshot', 'scene-presentation-checkpoint', 'selected-mission-ui',
  'shiloh-campaign-settlement', 'shiloh-command-presentation', 'shiloh-current-plan',
  'shiloh-landing-art', 'shiloh-reserve-network', 'siege-command', 'siege-terrain',
  'third-winchester', 'turn-clearance-recovery', 'withdrawal-command', 'withdrawal-goals',
  'withdrawal-goals-ui', 'antietam-campaign-settlement', 'antietam-missions', 'antietam-terrain',
  'cold-harbor-relief', 'cedar-creek-landmark-ground', 'chancellorsville-landmark-ground',
  'chickamauga-landmark-ground', 'wilderness-landmark-ground', 'winchester-landmark-ground',
  ...['five-forks', 'fredericksburg', 'gaines-mill', 'jonesborough', 'kennesaw', 'missionary-ridge',
    'new-market', 'sailors-creek', 'second-manassas', 'spotsylvania', 'vicksburg']
    .flatMap(field => ['campaign', 'missions', 'terrain'].map(suite => `${field}-${suite}`)),
];
const historicalPreservation = 'scripts/test-civil-war-v44-preservation.mjs';
const jacksonSuite = 'scripts/test-gettysburg-jackson-mission.mjs';
const frozenEngineAssertion = 'engine bytes match all three unchanged native preservation gates';
const historicalBehavior = [
  'scripts/test-campaign-field-causality.mjs',
  'scripts/test-field-view-context.mjs',
  'scripts/test-withdrawal-goals-ui.mjs',
];
// Authenticate the historical entry points before executing them. The unchanged
// historical validator verifies the complete frozen source and archive trees.
const historicalEntrypoints = {
  'package.json': '509d351108f9f139b993119fa8e101df2ad1053cf6846c38cca9bed2a21cdbfb',
  'scripts/fixtures/civil-war-v44-migrations.json': 'ef95e09737ae5c0393eac3242042377eabb7b12a6937efc6ca2ea5b362304b2d',
  'scripts/test-support/civilWarV44Preservation.mjs': '3bad2aa4885b5a069ea06043311c5cd1ffbc390d829ee986199da616a2658cb6',
  [historicalPreservation]: '5330eefb8599d6a483e121f06e4aeef293e2a45cc197e292d3a3b6cc4dfa1494',
};

function run(label, cwd, args) {
  console.log(`\n${label}`);
  const result = spawnSync(process.execPath, args, { cwd, stdio: 'inherit' });
  if (result.status === 0) return true;
  console.error(`${label} failed (${result.error?.message || result.signal || `exit ${result.status}`}).`);
  return false;
}

const nodeTestFlags = ['--test', '--test-reporter=spec', '--test-concurrency=2'];
const jacksonBehaviorFilter = Number(process.versions.node.split('.')[0]) >= 22
  ? `--test-skip-pattern=^${frozenEngineAssertion}$`
  // Node 20 filters by name only. Match the descriptive test names without matching the root suite.
  : `--test-name-pattern=^(?!.*${frozenEngineAssertion}).+ .+`;
const currentResults = [
  run('Current campaign smoke checks', currentRoot, ['scripts/smoke-test.mjs']),
  run('Current content validation', currentRoot, ['scripts/validate-content.mjs']),
  run(`Current source verification (${currentSuites.length} test files)`, currentRoot,
    [...nodeTestFlags, ...currentSuites.map(suite => `scripts/test-${suite}.mjs`)]),
  // The sole byte-equality assertion runs in the authenticated frozen release.
  // All Jackson behavior callbacks run against the candidate here.
  run('Current Gettysburg Jackson mission behavior', currentRoot,
    [...nodeTestFlags, jacksonBehaviorFilter, jacksonSuite]),
];
const currentPassed = currentResults.every(Boolean);
console.log(`\nCurrent source verification ${currentPassed ? 'passed' : 'failed'}.`);

let historicalPassed = true;
if (archivePath) {
  try {
    const archiveRoot = realpathSync(archivePath);
    if (archiveRoot === currentRoot) throw new Error('Use a separate frozen v44 release directory.');
    for (const [relativePath, expectedHash] of Object.entries(historicalEntrypoints)) {
      const file = join(archiveRoot, relativePath);
      if (realpathSync(file) !== file || createHash('sha256').update(readFileSync(file)).digest('hex') !== expectedHash) {
        throw new Error(`Frozen v44 entry point differs: ${relativePath}`);
      }
    }
    const preservationPassed = run('Frozen v44 source preservation', archiveRoot, [...nodeTestFlags, historicalPreservation]);
    if (preservationPassed) {
      const behaviorPassed = run('Frozen v44 campaign and field behavior', archiveRoot, [...nodeTestFlags, ...historicalBehavior]);
      const enginePassed = run('Frozen Gettysburg native engine preservation', archiveRoot,
        [...nodeTestFlags, `--test-name-pattern=^${frozenEngineAssertion}$`, jacksonSuite]);
      historicalPassed = behaviorPassed && enginePassed;
    } else historicalPassed = false;
  } catch (error) {
    console.error(`Frozen v44 verification failed: ${error.message}`);
    historicalPassed = false;
  }
  console.log(`Frozen v44 verification ${historicalPassed ? 'passed' : 'failed'}.`);
} else {
  console.log('Frozen v44 verification requires the optional frozen release directory and did not run.');
}
process.exitCode = currentPassed && historicalPassed ? 0 : 1;
