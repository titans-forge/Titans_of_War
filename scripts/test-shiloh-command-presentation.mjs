import assert from 'node:assert/strict';
import test from 'node:test';
import { drawShilohCommandLinks, shilohCommandReadout } from '../src/battle/shilohCommandPresentation.js';

const objective = { protectedCommander: true, elapsed: 0, responseTime: 48, deadline: 128, required: 8, held: 0 };
const network = { organizedRatio: 1, frontIssue: null, reserveIssue: null };

test('the reserve readout distinguishes a ready line from a running timer and a recovered hold', () => {
  assert.equal(shilohCommandReadout(objective, network).detail, 'The timer starts at minute 48.');
  assert.equal(shilohCommandReadout({ ...objective, elapsed: 50, held: 2 }, network).status, 'Building reserve support');
  const established = shilohCommandReadout({ ...objective, elapsed: 56, held: 8 }, network);
  assert.equal(established.status, 'Support established');
  assert.equal(established.detail, 'Hold the line through minute 128.');
  assert.equal(established.timer, '8.0 / 8 min');
});

test('the current field condition explains an interrupted timer', () => {
  const later = { ...objective, elapsed: 85 };
  const moving = shilohCommandReadout(later, { ...network, reserveIssue: 'Breckinridge is moving.' });
  assert.equal(moving.status, 'Support interrupted');
  assert.equal(moving.detail, 'Breckinridge is moving.');
  assert.equal(moving.timer, '0.0 / 8 min');
  assert.match(shilohCommandReadout(later, { ...network, organizedRatio: .64 }).detail, /65%/);
  assert.match(shilohCommandReadout({ ...later, protectedCommander: false }, network).detail, /Johnston/);
});

test('the map draws a solid front, distinguishes the reserve gap, and clears stale lines', () => {
  const units = [
    { id: 'hardee-corps', x: 20, y: 85 },
    { id: 'bragg-corps', x: 110, y: 85 },
    { id: 'breckinridge-reserve', x: 200, y: 40 },
  ];
  const connected = {
    frontLinks: [{ from: 'hardee-corps', to: 'bragg-corps' }],
    reserveLinks: [{ from: 'breckinridge-reserve', to: 'bragg-corps' }],
    reserveReady: true, supported: true, nearestFrontId: 'bragg-corps',
  };
  const strokes = [];
  let pen;
  const graphics = {
    clear() { strokes.length = 0; },
    lineStyle(width, color) { pen = { width, color }; },
    lineBetween(...points) { strokes.push({ ...pen, points }); },
  };
  const count = color => strokes.filter(line => line.color === color).length;
  drawShilohCommandLinks(graphics, units, connected, .5);
  assert.equal(count(0xa9e7d4), 1);
  assert.ok(count(0xf3cc78) > 1);
  assert.equal(count(0xf2a580), 0);
  assert.ok(strokes.every(stroke => stroke.points.every(Number.isFinite)));
  drawShilohCommandLinks(graphics, units, { ...connected, reserveLinks: [], supported: false }, 1);
  assert.equal(count(0xf3cc78), 0);
  assert.ok(count(0xf2a580) > 1);
  drawShilohCommandLinks(graphics, units, null, 1);
  assert.equal(strokes.length, 0);
});
