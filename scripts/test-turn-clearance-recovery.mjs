import test from 'node:test';
import assert from 'node:assert/strict';
import { rememberTurnClearance, confirmTurnClearance, updateTurnClearance, turnClearanceResume } from '../src/battle/turnClearanceRecovery.js';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { createPracticeState } from '../src/game/practiceConditions.js';
const unit = { id: 'brigade', name: 'Brigade', active: true, strength: 1000, status: 'steady', order: 'assault', assaultSector: 'east', x: 120, y: 200, readiness: { turnClearance: { x: 160, y: 230 } } };
const snap = patch => ({ outcome: 'undecided', formations: [{ ...structuredClone(unit), ...patch }] });
const remembered = () => rememberTurnClearance(structuredClone(unit));
const confirmed = () => confirmTurnClearance(remembered(), { x: 160, y: 230 });
test('reminder preserves the actual assault sector without changing formation state', () => {
  const before = structuredClone(unit), record = rememberTurnClearance(unit);
  assert.deepEqual(unit, before); assert.equal(record.order, 'assault'); assert.deepEqual(record.point, { sectorId: 'east' });
  assert.equal(turnClearanceResume(record, snap()), null);
  assert.equal(rememberTurnClearance({ ...unit, order: 'advance' }).point, null);
});
for (const patch of [{ order: 'hold' }, { order: 'withdraw' }, { directMove: true }, { pendingCommand: { order: 'advance' } }, { status: 'routing' }, { active: false }, { strength: 0 }]) test(`no attack reminder for ${JSON.stringify(patch)}`, () => assert.equal(rememberTurnClearance({ ...unit, ...patch }), null));
test('changed, invalid or canceled destinations do not retain a previewed attack', () => {
  for (const point of [null, { x: 170, y: 230 }, { x: 160, y: 230, error: 'Blocked' }]) assert.equal(confirmTurnClearance(remembered(), point), null);
});
test('delivery, march and arrival are distinct; nothing resumes automatically', () => {
  const record = confirmed();
  assert.equal(updateTurnClearance(record, snap({ pendingCommand: { order: 'move', point: record.clearance } })).phase, 'confirmed');
  const moving = updateTurnClearance(record, snap({ order: 'advance', directMove: true, target: record.clearance }));
  assert.equal(moving.phase, 'moving'); assert.equal(turnClearanceResume(moving, snap()), null);
  const arrived = snap({ order: 'hold', x: 160, y: 230 });
  const before = structuredClone(arrived), ready = updateTurnClearance(moving, arrived);
  assert.equal(ready.phase, 'ready'); assert.deepEqual(turnClearanceResume(ready, arrived), { order: 'assault', point: { sectorId: 'east' } });
  assert.deepEqual(arrived, before);
});
test('completion, rout, replacement orders and contact invalidate or defer the reminder', () => {
  const record = confirmed();
  for (const patch of [{ active: false }, { status: 'routing' }, { pendingCommand: { order: 'hold' } }, { directMove: true, target: { x: 1, y: 2 } }, { order: 'assault' }]) assert.equal(updateTurnClearance(record, snap(patch)), null);
  assert.equal(updateTurnClearance(record, { ...snap(), outcome: 'defeat' }), null);
  assert.equal(updateTurnClearance(record, { ...snap(), resolving: true }), null);
  for (const patch of [{ turnBlocked: true }, { inMelee: true }]) {
    const s = snap({ order: 'hold', x: 160, y: 230, ...patch });
    assert.equal(updateTurnClearance(record, s).phase, 'waiting'); assert.equal(turnClearanceResume(record, s), null);
  }
});
for (const mode of ['line', 'column', 'skirmish']) test(`real Chickamauga ${mode} blocked advance: ordinary clearance move and deliberate resume`, () => {
  const engine = new CivilWarBattleEngine('chickamauga', createPracticeState({ id: 'chickamauga_battlefield', turn: 17 }), 'option_b');
  for (const u of engine.state.filter(u => u.side === 'confederate' && u.active)) { engine.setFormation(u.id, mode); engine.order(u.id, 'advance'); }
  let blocked;
  for (let i = 0; i < 300 && !blocked; i++) { engine.tick(.1); blocked = engine.snapshot().formations.find(u => u.id === 'hindman-chickamauga' && u.readiness?.turnClearance); }
  assert.ok(blocked, 'Hindman encounters Kershaw through normal commands');
  const record = rememberTurnClearance(blocked); assert.ok(record);
  const before = engine.checkpoint(); assert.equal(record.order, 'advance'); assert.deepEqual(engine.checkpoint(), before);
  assert.equal(engine.move(record.id, record.clearance), true);
  let current = confirmTurnClearance(record, record.clearance);
  for (let i = 0; i < 180 && current && !['ready', 'waiting'].includes(current.phase); i++) { engine.tick(.1); current = updateTurnClearance(current, engine.snapshot()); }
  assert.ok(current && ['ready', 'waiting'].includes(current.phase), 'Move reaches its ordinary destination');
  assert.equal(engine.state.find(u => u.id === record.id).order, 'hold', 'Arrival holds instead of automatically attacking');
  if (current.phase === 'ready') {
    const command = turnClearanceResume(current, engine.snapshot());
    assert.equal(engine.order(record.id, command.order, command.point), true);
    assert.equal(engine.state.find(u => u.id === record.id).pendingCommand.order, 'advance');
  } else assert.equal(turnClearanceResume(current, engine.snapshot()), null);
});
