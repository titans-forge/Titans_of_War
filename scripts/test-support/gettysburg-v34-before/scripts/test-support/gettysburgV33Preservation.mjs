import assert from 'node:assert/strict';
import {readFileSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const ledgerPath='scripts/fixtures/gettysburg-v33-migrations.json';
const ledgerSHA256='c7c57bc491882692f850dd5ab372ba6d72f04622903e3e8349b68e9d9a90e290';
const runtimePaths=['package.json','src/battle/CivilWarBattlefield.jsx'];
const expected={
  "schema": "gettysburg-v33-historical-byte-migration-v1",
  "status": "frozen-approved-runtime-pins",
  "baselineSHA256": "b32990ab452dc92a1e55223f390b4198a653cf284848f388b4ecb7c9823e9ce0",
  "baselineFiles": 1548,
  "fixture": {
    "path": "scripts/fixtures/gettysburg-v33-preservation.json",
    "sha256": "62cab66694c9fb1b11431a0b3c241950b3031a001a31249c12718501a5cba9d4"
  },
  "oldFixturesRefreshed": false,
  "oldMigrationLedgersEdited": false,
  "behavioralAssertionsChanged": false,
  "mandatoryRegistration": "package.json",
  "mandatorySuite": "scripts/test-gettysburg-v33-contact-layout.mjs",
  "migrations": [
    {
      "path": "package.json",
      "archive": "scripts/test-support/gettysburg-v33-before/package.json",
      "beforeSHA256": "a79baf25996a54c90397e606ba821eb494b3554d992d26b82cd7a9df6b41b0c0",
      "currentSHA256": "d9a09499b9ff24ab5eca6ec852f230eb706d29971aadec2fb1d137fb79bb7e1e",
      "reason": "Only four mandatory v33 test script registrations; version, dependencies and lockfile unchanged."
    },
    {
      "path": "src/battle/CivilWarBattlefield.jsx",
      "archive": "scripts/test-support/gettysburg-v33-before/src/battle/CivilWarBattlefield.jsx",
      "beforeSHA256": "379e91d676a98cfc8ee0f49152e89bd2595e19995c8e57113e4382ea808f7ad0",
      "currentSHA256": "005e7cebd723eb3ec399c117b8e47e5ba588c107dfb0d77cb0c049b5ecb885bd",
      "reason": "Root-approved optional contact layout and saved casualty continuity, with authentic legacy behavior witnesses and raw combat preservation."
    },
    {
      "path": "scripts/test-support/gettysburgV29Preservation.mjs",
      "archive": "scripts/test-support/gettysburg-v33-before/scripts/test-support/gettysburgV29Preservation.mjs",
      "beforeSHA256": "ca72235c34761efe6d7d5660e2cedd4d630bc95811ffa7ee0588e5b130405157",
      "currentSHA256": "2212b8b711f782cf22396221b02fbc9577a8a22f5948c5a5599a71115ca640d0",
      "reason": "Only the metadata safeRead import and V33 historical reader call; original V29 ledger and every behavior assertion preserved."
    },
    {
      "path": "scripts/test-support/gettysburgV32Preservation.mjs",
      "archive": "scripts/test-support/gettysburg-v33-before/scripts/test-support/gettysburgV32Preservation.mjs",
      "beforeSHA256": "195d83e67187c3862d102951a3d734484421a05f4e51d6da0404e7c3145566d1",
      "currentSHA256": "ac37edc62f413b6f8debbcd510f1d1c9e22adb87c4911913eac02edbbfc2fe9e",
      "reason": "Only the metadata safeRead import and V33 historical reader call; original V32 ledger and current runtime imports preserved."
    },
    {
      "path": "scripts/test-gettysburg-v31-contact.mjs",
      "archive": "scripts/test-support/gettysburg-v33-before/scripts/test-gettysburg-v31-contact.mjs",
      "beforeSHA256": "92520cf4f6e3be2da56d441465581d69464f5efea294ca37357045f8235d715c",
      "currentSHA256": "3b69a3e2cfab348851e99ebca5b5687371794136da603753a8d167e819925876",
      "reason": "Only its direct Scene metadata hash uses the existing historical reader; all current behavioral assertions remain unchanged."
    },
    {
      "path": "scripts/test-gettysburg-v32-contact.mjs",
      "archive": "scripts/test-support/gettysburg-v33-before/scripts/test-gettysburg-v32-contact.mjs",
      "beforeSHA256": "1b958ec8849ce8ca7702d82ed6d97042baa46de077a84d82e1ab3c5c6879d2f0",
      "currentSHA256": "c0ed55647c7a0f18ab9449132026d414ab58117de250ca83a482f765a14e91e8",
      "reason": "Only its direct Scene metadata hash uses the existing historical reader; all current behavioral assertions remain unchanged."
    }
  ]
};

function directRead(path) {
  assert.ok(typeof path==='string' && path.length>0 && !path.startsWith('/') && !path.includes('\\'),'Canonical relative source path required');
  const parts=path.split('/');
  assert.ok(parts.every(part=>part && part!=='.' && part!=='..'),'Canonical relative source path required');
  for(let i=1;i<=parts.length;i++)assert.equal(lstatSync(ROOT+parts.slice(0,i).join('/')).isSymbolicLink(),false,path);
  assert.ok(lstatSync(ROOT+path).isFile(),path);
  return readFileSync(ROOT+path);
}
function exactLine(text,line) { assert.equal(text.split('\n').filter(value=>value===line).length,1,line); }
function narrowAfter(path,before) {
  if(path==='scripts/test-support/gettysburgV29Preservation.mjs'){
    const anchor="import { createHash } from 'node:crypto';", old='  return readFileSync(url);';
    exactLine(before,anchor);exactLine(before,old);
    return before.replace(anchor,anchor+"\nimport { v33HistoricalSource } from './gettysburgV33Preservation.mjs';")
      .replace(old,'  return v33HistoricalSource(path, url);');
  }
  if(path==='scripts/test-support/gettysburgV32Preservation.mjs'){
    const anchor="import { fileURLToPath } from 'node:url';", old='  return readFileSync(ROOT + path);';
    exactLine(before,anchor);exactLine(before,old);
    return before.replace(anchor,anchor+"\nimport { v33HistoricalSource } from './gettysburgV33Preservation.mjs';")
      .replace(old,'  return v33HistoricalSource(path);');
  }
  if(['scripts/test-gettysburg-v31-contact.mjs','scripts/test-gettysburg-v32-contact.mjs'].includes(path)){
    const old="sha(readFileSync(file('src/battle/CivilWarBattlefield.jsx')))";
    assert.equal(before.split(old).length-1,1,'One direct Scene metadata assertion');
    assert.ok(before.includes('v32HistoricalSource'),'Use the already present current import');
    return before.replace(old,"sha(v32HistoricalSource('src/battle/CivilWarBattlefield.jsx'))");
  }
  assert.fail('No metadata transform for '+path);
}
function authenticFixture() {
  const bytes=directRead(expected.fixture.path);
  assert.equal(sha(bytes),expected.fixture.sha256,'Immutable authentic installed-v32 fixture');
  const fixture=JSON.parse(bytes);
  assert.equal(fixture.schema,'gettysburg-v33-authentic-installed-v32-baseline-v1');
  assert.equal(fixture.baselineSHA256,expected.baselineSHA256);assert.equal(fixture.baselineFiles,1548);
  assert.equal(fixture.sourceFiles.length,6);assert.equal(fixture.protectedFiles.length,1542);
  assert.equal(fixture.oldFixturesRefreshed,false);assert.equal(fixture.oldMigrationLedgersEdited,false);
  assert.deepEqual(fixture.sourceFiles.map(value=>value.path),expected.migrations.map(value=>value.path));
  for(const record of expected.migrations){
    const original=fixture.sourceFiles.find(value=>value.path===record.path);
    assert.equal(original.sha256,record.beforeSHA256);assert.equal(original.candidateCopyBeforeSHA256,record.beforeSHA256);
    assert.equal(original.archive,record.archive);
    assert.equal(sha(directRead(record.archive)),record.beforeSHA256,record.path+' authentic archive');
  }
  return fixture;
}
function exactDraft(ledger) {
  assert.deepEqual(ledger,expected,'Only the exact six-path reviewed V33 migration is accepted');
  authenticFixture();return ledger;
}
function pendingError() {
  const error=new Error('V33 Scene and package hashes await explicit approved final pins.');
  error.code='V33_RUNTIME_PINS_PENDING';return error;
}
function verifyPackage(beforeBytes,currentBytes) {
  const before=JSON.parse(beforeBytes),current=JSON.parse(currentBytes);
  assert.equal(before.version,'0.31.0');assert.equal(current.version,before.version);
  assert.equal(current.scripts['test:gettysburg-v33'],'node --test --test-reporter=spec scripts/test-gettysburg-v33-contact-layout.mjs');
  for(const key of ['test','test:gettysburg-art-current','test:field-continuity']){
    assert.equal(current.scripts[key],before.scripts[key]+' && npm run test:gettysburg-v33',key+' exact append');
    current.scripts[key]=before.scripts[key];
  }
  delete current.scripts['test:gettysburg-v33'];
  assert.deepEqual(current,before,'Only the four mandatory script fields may change');
}
// This draft inspection approves no runtime. It proves only immutable before
// bytes and four whole-file metadata transforms, while Scene/package stay null.
export function verifyGettysburgV33MetadataMigrations() {
  const raw=directRead(ledgerPath);assert.equal(sha(raw),ledgerSHA256);exactDraft(JSON.parse(raw));
  const paths=expected.migrations.filter(record=>!runtimePaths.includes(record.path));
  for(const record of paths){
    const before=directRead(record.archive),current=directRead(record.path);
    assert.equal(sha(current),record.currentSHA256,record.path+' fixed metadata bytes');
    assert.equal(current.toString('utf8'),narrowAfter(record.path,before.toString('utf8')),
      'Every behavioral assertion and current import stays byte exact: '+record.path);
  }
  return {metadataPaths:paths.map(record=>record.path),metadataPathsVerified:4,archivedBeforeFiles:6,
    runtimePinsPending:expected.migrations.some(record=>record.currentSHA256===null),oldFixturesRefreshed:false,oldMigrationLedgersEdited:false};
}
export function validateGettysburgV33MigrationLedger(ledger) {
  exactDraft(ledger);
  if(ledger.migrations.some(record=>record.currentSHA256===null))throw pendingError();
  assert.equal(ledger.status,'frozen-approved-runtime-pins');
  for(const record of ledger.migrations){
    assert.match(record.currentSHA256,/^[0-9a-f]{64}$/);
    const before=directRead(record.archive),current=directRead(record.path);
    assert.equal(sha(current),record.currentSHA256,record.path+' explicitly pinned current bytes');
    if(record.path==='package.json')verifyPackage(before,current);
    if(!runtimePaths.includes(record.path))assert.equal(current.toString('utf8'),narrowAfter(record.path,before.toString('utf8')));
  }
  const fixture=authenticFixture();
  for(const record of fixture.dependencies)assert.equal(sha(directRead(record.path)),record.sha256,'Protected current dependency: '+record.path);
  return ledger;
}
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
let checked;
export function gettysburgV33MigrationLedger() {
  const raw=directRead(ledgerPath);assert.equal(sha(raw),ledgerSHA256,'Exact fixed ledger bytes required');
  if(!checked)checked=freeze(validateGettysburgV33MigrationLedger(JSON.parse(raw)));
  return checked;
}
export function v33BeforeFile(path) {
  assert.ok(typeof path==='string');
  const record=expected.migrations.find(value=>value.path===path);
  assert.ok(record,'Only the six declared authentic snapshots may be read');
  const raw=directRead(ledgerPath);assert.equal(sha(raw),ledgerSHA256);exactDraft(JSON.parse(raw));
  const bytes=directRead(record.archive);assert.equal(sha(bytes),record.beforeSHA256);return bytes;
}
// Metadata-only reader. Current Scene/save/engine imports never use it.
// V29 supplies its resolved path; reject any request outside this exact root.
export function v33HistoricalSource(path,requestedPath=undefined) {
  if(requestedPath!==undefined){
    const resolved=requestedPath instanceof URL?fileURLToPath(requestedPath):requestedPath;
    assert.equal(resolved,ROOT+path,'Historical reader cannot cross candidate roots');
  }
  const current=directRead(path),record=expected.migrations.find(value=>value.path===path);
  if(!record)return current;
  gettysburgV33MigrationLedger();
  assert.equal(sha(current),record.currentSHA256,path+' current bytes remain pinned');
  return v33BeforeFile(path);
}
export const GETTYSBURG_V33_MIGRATION_PATHS=Object.freeze(expected.migrations.map(record=>record.path));

