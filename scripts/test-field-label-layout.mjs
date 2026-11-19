import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fitOverviewLabels } from '../src/battle/fieldLabelLayout.js';

const world = { width: 1600, height: 900 };
const marker = (key, kind, x, y, width, height = 19, originY = .5) =>
  ({ key, kind, x, y, width, height, originX: .5, originY });
const crowded = [
  marker('redoubt', 'Landmark', 820, 280, 113),
  marker('approach', 'Sector', 1140, 282, 113),
  marker('rear', 'Exit', 137, 540, 118),
  marker('railroad', 'Terrain', 1170, 735, 113),
  marker('ravine', 'Terrain', 1120, 724, 87),
];

for (const viewport of [{ width: 390, height: 348 }, { width: 664, height: 190 }, { width: 320, height: 150 }]) {
  test(`overview labels fit in the board and keep a gap at ${viewport.width}×${viewport.height}`, () => {
    const zoom = Math.min(viewport.width / world.width, viewport.height / world.height);
    const layout = fitOverviewLabels(crowded, viewport, world, zoom);
    const boxes = [];
    assert.equal(layout.size, crowded.length);
    for (const entry of crowded) {
      const location = layout.get(entry.key);
      const left = location.x * zoom - entry.width * entry.originX;
      const top = location.y * zoom - entry.height * entry.originY;
      const right = left + entry.width;
      const bottom = top + entry.height;
      assert.ok(left >= 3.99 && right <= world.width * zoom - 3.99, entry.key);
      assert.ok(top >= 3.99 && bottom <= world.height * zoom - 3.99, entry.key);
      assert.ok(boxes.every(box =>
        left - box.right >= 3.99 || box.left - right >= 3.99
        || top - box.bottom >= 3.99 || box.top - bottom >= 3.99), entry.key);
      boxes.push({ left, top, right, bottom });
    }
    assert.ok(layout.get('approach').leader, 'separated sector still points to its authored anchor');
    assert.ok(layout.get('rear').x > crowded[2].x, 'label no longer clips the west edge');
    assert.deepEqual(fitOverviewLabels(crowded, viewport, world, zoom), layout);
  });
}

test('overfull maps retain the objective first and respect a bottom-origin label', () => {
  const viewport = { width: 160, height: 90 };
  const markers = [
    marker('scenery', 'Terrain', 800, 450, 150, 57),
    marker('objective', 'Objective', 800, 450, 150, 57, 1),
    marker('oversize', 'Landmark', 800, 450, 158),
  ];
  const layout = fitOverviewLabels(markers, viewport, world, .1);
  assert.deepEqual([...layout.keys()], ['objective']);
  assert.equal(layout.get('objective').y, 610);
});

test('a rear label fits between the lower command button and the road label', () => {
  const viewport = { width: 390, height: 312 };
  const zoom = viewport.width / world.width;
  const rear = marker('rear', 'Exit', world.width / 2, 874, 111, 16);
  const road = marker('plank-road', 'Sector', 830, 695, 120, 19.5);
  const control = { left: 99, right: 291, top: 252.85, bottom: 304.45 };
  const layout = fitOverviewLabels([rear, road], viewport, world, zoom, control);
  const mapTop = (viewport.height - world.height * zoom) / 2;
  const rearCenter = mapTop + layout.get(rear.key).y * zoom;
  const roadBottom = mapTop + layout.get(road.key).y * zoom + road.height / 2;
  assert.ok(rearCenter - rear.height / 2 >= roadBottom + 4);
  assert.ok(rearCenter + rear.height / 2 <= control.top - 4);
});

test('Wilderness desktop exit clears the full-height Begin Battle button and returns to its anchor when running', () => {
  const viewport = { width: 1194, height: 570 };
  const zoom = viewport.height / world.height;
  const rear = marker('rear', 'Exit', 800, 874, 111.15, 17.385);
  const road = marker('plank-road', 'Sector', 830, 695, 137, 22.14);
  const start = { left: 501, right: 693, top: 510.89, bottom: 562.48 };
  for (const control of [start, { ...start, left: 510, right: 684, top: 518 }]) {
    const layout = fitOverviewLabels([rear, road], viewport, world, zoom, control);
    assert.ok(layout.get(rear.key).y * zoom + rear.height / 2 <= control.top - 4);
    assert.ok(layout.get(rear.key).leader);
    assert.equal(layout.get(road.key).y, road.y);
  }
  assert.equal(fitOverviewLabels([rear, road], viewport, world, zoom).get(rear.key).y, rear.y);
});
