const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createSpiral, LAYERS } = require('../../js/games/spiral-engine.js');

const started = () => {
  const s = createSpiral({ random: () => 0.5 });
  s.start();
  s.drainEvents();
  return s;
};

test('grades: dead centre is perfect, zone edge is good, far away is a miss', () => {
  const s = started();
  const { zoneCenter: c, zoneWidth: w } = s.state;
  assert.equal(s.grade(c), 'perfect');
  assert.equal(s.grade(c + w * 0.45), 'good');
  assert.equal(s.grade(c + w * 0.9 > 1 ? c - w * 0.9 : c + w * 0.9), 'miss');
});

test('the needle bounces between 0 and 1', () => {
  const s = started();
  for (let i = 0; i < 200; i++) {
    s.tick(0.05);
    assert.ok(s.state.needle >= 0 && s.state.needle <= 1);
  }
});

test('three perfects drill through a layer, which narrows the zone and speeds the needle', () => {
  const s = started();
  const { zoneWidth, speed } = s.state;
  for (let i = 0; i < 3; i++) s.strike(s.state.zoneCenter);
  assert.equal(s.state.layer, 1);
  assert.ok(s.state.zoneWidth < zoneWidth);
  assert.ok(s.state.speed > speed);
  assert.ok(s.drainEvents().some((e) => e.type === 'layer' && e.layer === 1));
});

test('Kamina revives once, then the run ends', () => {
  const s = started();
  const miss = () => s.strike(s.state.zoneCenter > 0.5 ? 0 : 1);
  miss(); miss(); miss();
  assert.equal(s.state.phase, 'playing');
  assert.equal(s.state.spirit, 1);
  assert.ok(s.drainEvents().some((e) => e.type === 'kamina'));
  miss();
  assert.equal(s.state.phase, 'lost');
});

test('perfect play pierces the Heavens', () => {
  const s = started();
  let guard = 0;
  while (s.state.phase === 'playing' && guard++ < 200) s.strike(s.state.zoneCenter);
  assert.equal(s.state.phase, 'won');
  assert.equal(s.state.layer, LAYERS.length - 1);
  assert.ok(s.state.score > 10000);
});
