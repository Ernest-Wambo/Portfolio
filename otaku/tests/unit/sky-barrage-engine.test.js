const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createSkyBarrage } = require('../../js/games/sky-barrage-engine.js');

const run = (game, seconds, input = {}) => {
  for (let t = 0; t < seconds; t += 1 / 60) game.update(1 / 60, input);
};

test('starts idle, then wave 1 spawns after take-off', () => {
  const game = createSkyBarrage({ random: () => 0.5 });
  assert.equal(game.state.phase, 'ready');
  game.update(1, {});
  assert.equal(game.state.enemies.length, 0, 'nothing happens before start()');
  game.start();
  run(game, 2.5);
  assert.equal(game.state.wave, 1);
  assert.ok(game.state.enemies.length > 0);
});

test('the player stays inside the flight envelope', () => {
  const game = createSkyBarrage();
  game.start();
  run(game, 3, { dx: -1, dy: -1 });
  assert.ok(game.state.player.x >= 24 && game.state.player.y >= 20);
  run(game, 3, { dx: 1, dy: 1 });
  assert.ok(game.state.player.x <= game.state.width * 0.62 && game.state.player.y <= game.state.height - 20);
});

test('getting hit costs a life and grants invincibility; three hits end the sortie', () => {
  const game = createSkyBarrage();
  game.start();
  const hitPlayer = () => {
    const p = game.state.player;
    game.state.player.inv = 0;
    game.state.enemyShots.push({ x: p.x, y: p.y, vx: 0, vy: 0, r: 6 });
    game.update(1 / 60, {});
  };
  hitPlayer();
  assert.equal(game.state.lives, 2);
  assert.ok(game.state.player.inv > 0);
  hitPlayer();
  hitPlayer();
  assert.equal(game.state.phase, 'lost');
  assert.ok(game.drainEvents().some((e) => e.type === 'lost'));
});

test('Elinium overdrive needs a full gauge, clears shots and damages everything', () => {
  const game = createSkyBarrage();
  game.start();
  assert.equal(game.overdrive(), false);
  game.state.elinium = 100;
  game.state.enemyShots.push({ x: 500, y: 100, vx: -100, vy: 0, r: 6 });
  assert.equal(game.overdrive(), true);
  assert.equal(game.state.enemyShots.length, 0);
  assert.equal(game.state.elinium, 0);
});

test('Being X arrives after the last wave and can be defeated', () => {
  const game = createSkyBarrage({ bossHp: 30 });
  game.start();
  game.skipToBoss();
  run(game, 0.2);
  assert.equal(game.state.phase, 'boss');
  assert.ok(game.state.boss);
  // Park the player in front of the boss lane and keep them alive.
  for (let i = 0; i < 60 * 30 && game.state.phase === 'boss'; i++) {
    game.state.player.inv = 5;
    game.state.player.y = game.state.boss.y;
    game.update(1 / 60, {});
  }
  assert.equal(game.state.phase, 'won');
  assert.ok(game.drainEvents().some((e) => e.type === 'won'));
});
