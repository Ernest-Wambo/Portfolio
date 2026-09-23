const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createGacha } = require('../../js/games/gacha-engine.js');

const pool = [
  { id: 's1', rarity: 'SSR' }, { id: 's2', rarity: 'SSR' },
  { id: 'a1', rarity: 'SR' }, { id: 'a2', rarity: 'SR' },
  { id: 'r1', rarity: 'R' }, { id: 'r2', rarity: 'R' }, { id: 'r3', rarity: 'R' },
];

// A seeded PRNG so distributions are reproducible.
function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('rejects an empty pool and unknown rarities', () => {
  assert.throws(() => createGacha({ pool: [] }));
  assert.throws(() => createGacha({ pool: [{ id: 'x', rarity: 'UR' }] }));
});

test('R rolls advance both pity counters', () => {
  const g = createGacha({ pool, random: () => 0.99 });
  const { rarity, state } = g.pull(g.freshState());
  assert.equal(rarity, 'R');
  assert.deepEqual(state, { total: 1, sinceSR: 1, sinceSSR: 1 });
});

test('SR pity guarantees at least SR on the 10th pull', () => {
  const g = createGacha({ pool, random: () => 0.99 });
  const { results } = g.pullMany(g.freshState(), 10);
  assert.ok(results.slice(0, 9).every((r) => r.rarity === 'R'));
  assert.equal(results[9].rarity, 'SR');
  assert.equal(results[9].pity, 'SR');
});

test('SSR pity triggers on the 40th pull even with terrible luck', () => {
  const g = createGacha({ pool, random: () => 0.99 });
  const { results, state } = g.pullMany(g.freshState(), 40);
  assert.equal(results[39].rarity, 'SSR');
  assert.equal(results[39].pity, 'SSR');
  assert.deepEqual({ sinceSR: state.sinceSR, sinceSSR: state.sinceSSR }, { sinceSR: 0, sinceSSR: 0 });
});

test('observed rates stay close to 3% / 17% / 80% (pity included)', () => {
  const g = createGacha({ pool, random: mulberry32(42) });
  const { results } = g.pullMany(g.freshState(), 20000);
  const share = (r) => results.filter((x) => x.rarity === r).length / results.length;
  assert.ok(share('SSR') > 0.025 && share('SSR') < 0.07, `SSR ${share('SSR')}`);
  assert.ok(share('SR') > 0.15 && share('SR') < 0.24, `SR ${share('SR')}`);
  assert.ok(share('R') > 0.7 && share('R') < 0.82, `R ${share('R')}`);
});

test('every pulled character belongs to the rolled rarity', () => {
  const g = createGacha({ pool, random: mulberry32(7) });
  g.pullMany(g.freshState(), 500).results.forEach(({ character, rarity }) => assert.equal(character.rarity, rarity));
});
