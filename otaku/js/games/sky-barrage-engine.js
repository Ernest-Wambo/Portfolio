/**
 * Sky Barrage engine — Tanya's side-scrolling shooter, pure logic (no DOM,
 * no canvas). The view calls update(dt, input) every frame, draws `state`,
 * and drains `state.events` for sound, captions and toasts.
 *
 * Flow: ready → playing (waves 1..N) → boss (Being X) → won | lost
 */
(function (root) {
  'use strict';

  const W = 800;
  const H = 450;

  const ENEMY_TYPES = {
    scout: { hp: 1, r: 11, speed: 210, score: 60, fireEvery: 0 },
    mage: { hp: 2, r: 14, speed: 115, score: 100, fireEvery: 2.1 },
    artillery: { hp: 6, r: 20, speed: 62, score: 250, fireEvery: 2.4 },
  };

  const BOSS_LINES = [
    'Believe in me, and you shall be saved.',
    'Why do you not pray, little one?',
    'Your faith is lacking. Let me correct that.',
    'I am the Creator. Kneel.',
  ];

  function createSkyBarrage({ waves = 5, random = Math.random, bossHp = 90 } = {}) {
    const state = {};
    const rand = (min, max) => min + random() * (max - min);

    function reset() {
      Object.assign(state, {
        width: W,
        height: H,
        phase: 'ready',
        time: 0,
        score: 0,
        lives: 3,
        wave: 0,
        waves,
        intermission: 1.2,
        spawnQueue: [],
        spawnTimer: 0,
        player: { x: 120, y: H / 2, r: 13, inv: 0, cooldown: 0 },
        shots: [],
        enemyShots: [],
        enemies: [],
        boss: null,
        elinium: 0,
        overdrive: 0,
        kills: 0,
        events: [],
      });
    }

    const emit = (type, payload = {}) => state.events.push(Object.assign({ type }, payload));

    function start() {
      reset();
      state.phase = 'playing';
      emit('start');
    }

    function queueWave(n) {
      const count = 5 + n * 3;
      const mix = n === 1 ? ['scout', 'mage'] : n < 4 ? ['scout', 'mage', 'mage', 'artillery'] : ['scout', 'mage', 'artillery', 'artillery'];
      state.spawnQueue = Array.from({ length: count }, (_, i) => ({ type: mix[Math.floor(random() * mix.length)], delay: 0.35 + (i === 0 ? 0 : rand(0.25, 0.8)) }));
      state.wave = n;
      emit('wave', { wave: n });
    }

    function spawnEnemy(type) {
      const t = ENEMY_TYPES[type];
      state.enemies.push({
        type,
        x: W + 30,
        y: rand(40, H - 40),
        baseY: 0,
        phase: rand(0, Math.PI * 2),
        hp: t.hp,
        r: t.r,
        speed: t.speed * (1 + state.wave * 0.05),
        fire: t.fireEvery ? rand(0.6, t.fireEvery) : Infinity,
      });
      const e = state.enemies[state.enemies.length - 1];
      e.baseY = e.y;
    }

    function spawnBoss() {
      state.phase = 'boss';
      state.boss = { x: W + 80, y: H / 2, r: 48, hp: bossHp, maxHp: bossHp, t: 0, pattern: 0, patternT: 0, fire: 0, angle: 0, enraged: false };
      emit('boss', { line: BOSS_LINES[0] });
    }

    function fireAt(from, speed, spread = 0) {
      const a = Math.atan2(state.player.y - from.y, state.player.x - from.x) + spread;
      state.enemyShots.push({ x: from.x, y: from.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 6 });
    }

    function radial(from, count, speed, offset = 0) {
      for (let i = 0; i < count; i++) {
        const a = offset + (i / count) * Math.PI * 2;
        state.enemyShots.push({ x: from.x, y: from.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 6 });
      }
    }

    function hurtPlayer() {
      const p = state.player;
      if (p.inv > 0 || state.overdrive > 0) return;
      state.lives -= 1;
      p.inv = 2;
      state.enemyShots = state.enemyShots.filter((s) => Math.hypot(s.x - p.x, s.y - p.y) > 120);
      emit('hit', { lives: state.lives });
      if (state.lives <= 0) {
        state.phase = 'lost';
        emit('lost', { score: state.score });
      }
    }

    function killEnemy(e, index) {
      state.enemies.splice(index, 1);
      state.score += ENEMY_TYPES[e.type].score;
      state.kills += 1;
      state.elinium = Math.min(100, state.elinium + 8);
      emit('kill', { x: e.x, y: e.y, type: e.type });
    }

    function damageBoss(amount) {
      const b = state.boss;
      if (!b || b.hp <= 0) return;
      b.hp = Math.max(0, b.hp - amount);
      if (!b.enraged && b.hp <= b.maxHp / 2) {
        b.enraged = true;
        emit('taunt', { line: BOSS_LINES[2] });
      }
      if (b.hp === 0) {
        state.score += 5000 + state.lives * 1000;
        state.phase = 'won';
        emit('won', { score: state.score, x: b.x, y: b.y });
      }
    }

    function overdrive() {
      if (state.elinium < 100 || (state.phase !== 'playing' && state.phase !== 'boss')) return false;
      state.elinium = 0;
      state.overdrive = 1.6;
      state.enemyShots = [];
      for (let i = state.enemies.length - 1; i >= 0; i--) {
        const e = state.enemies[i];
        e.hp -= 25;
        if (e.hp <= 0) killEnemy(e, i);
      }
      damageBoss(18);
      emit('overdrive');
      return true;
    }

    const collide = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r;

    function update(dt, input = {}) {
      if (state.phase !== 'playing' && state.phase !== 'boss') return state;
      dt = Math.min(dt, 0.05);
      state.time += dt;
      const p = state.player;

      // ── Player movement: keyboard vector or pointer target ──
      const SPEED = 280;
      if (input.target) {
        const dx = input.target.x - p.x;
        const dy = input.target.y - p.y;
        const d = Math.hypot(dx, dy);
        if (d > 2) {
          const step = Math.min(d, SPEED * 1.4 * dt);
          p.x += (dx / d) * step;
          p.y += (dy / d) * step;
        }
      } else {
        p.x += (input.dx || 0) * SPEED * dt;
        p.y += (input.dy || 0) * SPEED * dt;
      }
      p.x = Math.max(24, Math.min(W * 0.62, p.x));
      p.y = Math.max(20, Math.min(H - 20, p.y));
      p.inv = Math.max(0, p.inv - dt);
      state.overdrive = Math.max(0, state.overdrive - dt);
      if (input.special) overdrive();

      // ── Auto-fire ──
      p.cooldown -= dt;
      if (p.cooldown <= 0) {
        p.cooldown = 0.14;
        state.shots.push({ x: p.x + 16, y: p.y, vx: 780, r: 4 });
        if (state.overdrive > 0) {
          state.shots.push({ x: p.x + 16, y: p.y, vx: 620, vy: -140, r: 4 }, { x: p.x + 16, y: p.y, vx: 620, vy: 140, r: 4 });
        }
      }

      // ── Waves ──
      if (state.phase === 'playing') {
        if (state.spawnQueue.length) {
          state.spawnTimer -= dt;
          if (state.spawnTimer <= 0) {
            const next = state.spawnQueue.shift();
            spawnEnemy(next.type);
            state.spawnTimer = state.spawnQueue.length ? state.spawnQueue[0].delay : 0;
          }
        } else if (state.enemies.length === 0) {
          state.intermission -= dt;
          if (state.intermission <= 0) {
            state.intermission = 2;
            if (state.wave >= state.waves) spawnBoss();
            else queueWave(state.wave + 1);
          }
        }
      }

      // ── Enemies ──
      for (const e of state.enemies) {
        e.x -= e.speed * dt;
        if (e.type === 'mage') e.y = e.baseY + Math.sin(state.time * 2.4 + e.phase) * 40;
        if (e.type === 'scout') e.y += Math.sign(p.y - e.y) * 40 * dt;
        e.fire -= dt;
        if (e.fire <= 0 && e.x < W - 20) {
          e.fire = ENEMY_TYPES[e.type].fireEvery;
          if (e.type === 'artillery') [-0.25, 0, 0.25].forEach((s) => fireAt(e, 170, s));
          else fireAt(e, 190);
        }
      }
      state.enemies = state.enemies.filter((e) => e.x > -40);

      // ── Boss: Being X ──
      const b = state.boss;
      if (b && b.hp > 0) {
        b.t += dt;
        b.x += ((W - 130) - b.x) * Math.min(1, dt * 1.5);
        b.y = H / 2 + Math.sin(b.t * 0.6) * (H / 2 - 90);
        b.patternT += dt;
        if (b.patternT > 3.2) {
          b.patternT = 0;
          b.pattern = (b.pattern + 1) % 3;
          if (random() < 0.5) emit('taunt', { line: BOSS_LINES[1 + Math.floor(random() * (BOSS_LINES.length - 1))] });
        }
        b.fire -= dt;
        const rate = b.enraged ? 0.75 : 1;
        if (b.fire <= 0 && b.x < W - 60) {
          if (b.pattern === 0) { radial(b, b.enraged ? 18 : 14, 150, b.t); b.fire = 1.2 * rate; }
          else if (b.pattern === 1) { b.angle += 0.5; radial(b, 3, 170, b.angle); b.fire = 0.16 * rate; }
          else { [-0.3, -0.15, 0, 0.15, 0.3].forEach((s) => fireAt(b, 210, s)); b.fire = 0.9 * rate; }
        }
      }

      // ── Projectiles ──
      state.shots.forEach((s) => { s.x += s.vx * dt; s.y += (s.vy || 0) * dt; });
      state.enemyShots.forEach((s) => { s.x += s.vx * dt; s.y += s.vy * dt; });
      state.shots = state.shots.filter((s) => s.x < W + 20 && s.y > -20 && s.y < H + 20);
      state.enemyShots = state.enemyShots.filter((s) => s.x > -20 && s.x < W + 20 && s.y > -20 && s.y < H + 20);

      // ── Collisions ──
      for (let i = state.shots.length - 1; i >= 0; i--) {
        const s = state.shots[i];
        let used = false;
        for (let j = state.enemies.length - 1; j >= 0; j--) {
          const e = state.enemies[j];
          if (collide(s, e)) {
            used = true;
            e.hp -= 1;
            state.elinium = Math.min(100, state.elinium + 1);
            if (e.hp <= 0) killEnemy(e, j);
            break;
          }
        }
        if (!used && b && b.hp > 0 && collide(s, b)) {
          used = true;
          damageBoss(1);
          state.score += 10;
        }
        if (used) state.shots.splice(i, 1);
      }

      if (state.phase === 'playing' || state.phase === 'boss') {
        const hitShot = state.enemyShots.findIndex((s) => collide(s, p));
        if (hitShot >= 0) {
          state.enemyShots.splice(hitShot, 1);
          hurtPlayer();
        }
        const rammed = state.enemies.findIndex((e) => collide(e, p));
        if (rammed >= 0 && p.inv <= 0 && state.overdrive <= 0) {
          state.enemies.splice(rammed, 1);
          hurtPlayer();
        }
        if (b && b.hp > 0 && collide(b, p)) hurtPlayer();
      }
      return state;
    }

    /** Test / debug hook: clear the waves and bring Being X in. */
    function skipToBoss() {
      state.wave = state.waves;
      state.spawnQueue = [];
      state.enemies = [];
      state.phase = 'playing';
      state.intermission = 0;
    }

    reset();
    return { state, start, update, overdrive, skipToBoss, drainEvents: () => state.events.splice(0) };
  }

  const api = { createSkyBarrage, ENEMY_TYPES, WIDTH: W, HEIGHT: H };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OtakuSkyBarrage = api;
})(typeof window !== 'undefined' ? window : globalThis);
