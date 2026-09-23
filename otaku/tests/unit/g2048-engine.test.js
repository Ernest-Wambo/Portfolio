const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createEngine } = require('../../js/games/g2048-engine.js');

// Deterministic spawns: always the last empty cell, value 4.
const lastCell = () => 0.9999;
const values = (e) => e.serialize().grid;
const make = (grid, score = 0) => {
  const e = createEngine({ random: lastCell });
  assert.ok(e.load({ grid, score }));
  return e;
};
const EMPTY = () => [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];

test('pairs merge once per move: [2,2,2,2] ← becomes [4,4,0,0]', () => {
  const g = EMPTY(); g[0] = [2, 2, 2, 2];
  const e = make(g);
  const res = e.move('left');
  assert.deepEqual(values(e)[0], [4, 4, 0, 0]);
  assert.equal(res.gained, 8);
  assert.equal(res.merged.length, 2);
  assert.equal(res.consumed.length, 2);
});

test('a freshly merged tile never merges again in the same move', () => {
  const g = EMPTY(); g[0] = [4, 2, 2, 0];
  const e = make(g);
  e.move('right');
  assert.deepEqual(values(e)[0], [0, 0, 4, 4]);
});

test('merges favour the wall side: [2,2,2,0] → ends with [2,4]', () => {
  const g = EMPTY(); g[0] = [2, 2, 2, 0];
  const e = make(g);
  e.move('right');
  assert.deepEqual(values(e)[0].slice(2), [2, 4]);
});

test('vertical moves work column-wise', () => {
  const e = make([[2, 0, 0, 0], [0, 0, 0, 0], [2, 0, 0, 0], [4, 0, 0, 0]]);
  e.move('up');
  assert.deepEqual(values(e).map((row) => row[0]), [4, 4, 0, 0]);
});

test('a no-op move neither spawns nor scores', () => {
  const g = EMPTY(); g[0] = [2, 4, 0, 0];
  const e = make(g);
  assert.equal(e.move('left').moved, false);
  assert.equal(e.tiles.length, 2);
  assert.equal(e.score, 0);
});

test('canMove detects a locked board', () => {
  assert.equal(make([[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 2]]).canMove(), false);
  assert.equal(make([[2, 2, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 2]]).canMove(), true);
});

test('snapshot / restore round-trips (Izanagi)', () => {
  const g = EMPTY(); g[0] = [2, 2, 0, 0];
  const e = make(g, 10);
  const snap = e.snapshot();
  e.move('left');
  e.restore(snap);
  assert.deepEqual(values(e)[0], [2, 2, 0, 0]);
  assert.equal(e.score, 10);
});

test('load rejects malformed saves', () => {
  const e = createEngine();
  assert.equal(e.load(null), false);
  assert.equal(e.load({ grid: [[2]] }), false);
  assert.equal(e.load({ grid: EMPTY() }), false);
});

test('2000 random moves never break invariants', () => {
  const e = createEngine();
  e.reset();
  const dirs = ['up', 'down', 'left', 'right'];
  for (let i = 0; i < 2000 && e.canMove(); i++) {
    e.move(dirs[Math.floor(Math.random() * 4)]);
    const cells = new Set(e.tiles.map((t) => `${t.r},${t.c}`));
    assert.equal(cells.size, e.tiles.length, 'two tiles share a cell');
    assert.ok(e.tiles.every((t) => t.value >= 2 && (t.value & (t.value - 1)) === 0), 'non power-of-two tile');
  }
});
