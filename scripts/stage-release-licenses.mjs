// Copyright (c) 2026 Titans Forge LLC.
// Forge Game License 2.0; see LICENSE and LICENSING.md.
// Stage rights notices without modifying gameplay files or fetching anything.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = fs.realpathSync(fileURLToPath(new URL('..', import.meta.url)));
const dist = path.join(root, 'dist');
const checkOnly = process.argv.slice(2).includes('--check');
if (process.argv.slice(2).some(arg => arg !== '--check')) {
  throw new Error('Only --check is supported');
}
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const approvedHash = '01c53180ca78bee80411c2d07e436014b62f7e48dd37de70c2fed72238ee57dc';
const previousPolicyHash = '28638be413f7815704fe68aed52a4ea4cb7bd4d28b35f2dca9b78d438a4a90bf';
function readRegular(file) {
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Expected a regular, non-symlink file: ' + path.basename(file));
  return fs.readFileSync(file);
}
if (!fs.lstatSync(dist).isDirectory() || fs.lstatSync(dist).isSymbolicLink() || fs.realpathSync(dist) !== dist) {
  throw new Error('dist must be a regular directory inside this project');
}
readRegular(path.join(dist, 'index.html'));
const checkpoint = JSON.parse(readRegular(path.join(root, 'LICENSING_CHECKPOINT.json')));
if (checkpoint.schema !== 'forge_game_license_checkpoint_v2' ||
    checkpoint.license_sha256 !== approvedHash ||
    checkpoint.license !== 'Forge Game License 2.0' ||
    checkpoint.release_id !== 'FG2-TITANS-OF-WAR-CIVIL-WAR-20261015' ||
    checkpoint.prior_grants_preserved !== true ||
    checkpoint.previous_policy_sha256 !== previousPolicyHash ||
    hash(readRegular(path.join(root, 'LICENSE_ADOPTION_SOURCE.json'))) !== checkpoint.adoption_source_sha256) {
  throw new Error('Invalid licensing checkpoint');
}
const copies = [
  ['LICENSE', 'LICENSE'],
  ['LICENSE-LEGACY-MIT.txt', 'LICENSE-LEGACY-MIT.txt'],
  ['LICENSING.md', 'LICENSING.txt'],
  ['LICENSING_CHECKPOINT.json', 'LICENSING_CHECKPOINT.json'],
];
for (const [source, target] of [['MEDIA_RIGHTS.md', 'MEDIA_RIGHTS.txt'], ['NOTICE', 'NOTICE.txt']]) {
  if (fs.existsSync(path.join(root, source))) copies.push([source, target]);
}
for (const entry of [['LICENSE-LEGACY-PRE-FORGE-2.0.txt', 'LICENSE-LEGACY-PRE-FORGE-2.0.txt'], ['LICENSE_ADOPTION_SOURCE.json', 'LICENSE_ADOPTION_SOURCE.json'], ['FORGE-LICENSING.html', 'licensing.html']]) {
  if (!copies.some(([, dest]) => dest === entry[1])) copies.push(entry);
}
// Validate every source and destination before the first write.
const prepared = copies.map(([source, target]) => {
  const bytes = readRegular(path.join(root, source));
  const dest = path.join(dist, target);
  if (fs.existsSync(dest) || fs.lstatSync(dist).isSymbolicLink()) {
    if (!fs.lstatSync(dest).isFile() || fs.lstatSync(dest).isSymbolicLink()) throw new Error('Unsafe notice destination: ' + target);
  } else {
    // existsSync follows links; a dangling symlink must still be rejected.
    try {
      fs.lstatSync(dest);
      throw new Error('Unsafe notice destination: ' + target);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  if (source === 'LICENSE-LEGACY-PRE-FORGE-2.0.txt' && hash(bytes) !== previousPolicyHash) throw new Error('Preserved prior license hash mismatch');
  if (source === 'LICENSE' && hash(bytes) !== approvedHash) throw new Error('Approved license hash mismatch');
  if (source === 'LICENSE-LEGACY-MIT.txt' && hash(bytes) !== checkpoint.previous_mit_license_sha256) throw new Error('Legacy MIT notice hash mismatch');
  return { dest, target, bytes };
});
for (const { dest, target, bytes } of prepared) {
  if (checkOnly) {
    if (!fs.existsSync(dest) || !readRegular(dest).equals(bytes)) throw new Error('Missing or stale build notice: ' + target);
  } else {
    fs.writeFileSync(dest, bytes);
  }
}
console.log((checkOnly ? 'Verified' : 'Staged') + ' ' + prepared.length + ' release licensing notices; gameplay unchanged.');
