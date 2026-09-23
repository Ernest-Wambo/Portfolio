/**
 * Spiral Drill engine — Gurren Lagann timing game, pure logic.
 *
 * A needle sweeps a 0..1 gauge; strike() grades how close it is to the
 * sweet zone. Filling a layer drills up to the next one; every layer
 * narrows the zone and speeds the needle. Losing all fighting spirit ends
 * the run — except once, when Kamina believes in you.
 */
(function (root) {
  'use strict';

  const LAYERS = [
    { id: 'jeeha', name: 'Jeeha Village', line: 'Dig. Just dig. Everyone down here says the ceiling is the sky.' },
    { id: 'surface', name: 'The Surface', line: 'Row, row, fight the power!' },
    { id: 'sky', name: 'The Open Sky', line: "Who the hell do you think I am?!" },
    { id: 'moon', name: 'The Moon', line: 'The moon is falling. Drill through it anyway.' },
    { id: 'space', name: 'Deep Space', line: 'Our drill is the drill that creates the heavens!' },
    { id: 'labyrinth', name: 'Anti-Spiral Labyrinth', line: 'Despair is a choice. Choose the drill.' },
    { id: 'heavens', name: 'The Heavens', line: 'GIGA DRILL BREAK!!!' },
  ];

  function createSpiral({ random = Math.random, startWidth = 0.26, startSpeed = 0.75 } = {}) {
    const state = {};

    function newZone() {
      const half = state.zoneWidth / 2;
      state.zoneCenter = half + 0.04 + random() * (1 - state.zoneWidth - 0.08);
    }

    function reset() {
      Object.assign(state, {
        phase: 'ready',
        layer: 0,
        progress: 0,
        combo: 0,
        bestCombo: 0,
        spirit: 3,
        kaminaUsed: false,
        score: 0,
        needle: 0,
        dir: 1,
        speed: startSpeed,
        zoneWidth: startWidth,
        zoneCenter: 0.5,
        events: [],
      });
      newZone();
    }

    const emit = (type, payload = {}) => state.events.push(Object.assign({ type }, payload));

    function start() {
      reset();
      state.phase = 'playing';
      emit('layer', { layer: 0, name: LAYERS[0].name, line: LAYERS[0].line });
    }

    function tick(dt) {
      if (state.phase !== 'playing') return;
      state.needle += state.dir * state.speed * Math.min(dt, 0.05);
      if (state.needle >= 1) { state.needle = 1; state.dir = -1; }
      if (state.needle <= 0) { state.needle = 0; state.dir = 1; }
    }

    function grade(position) {
      const d = Math.abs(position - state.zoneCenter);
      const half = state.zoneWidth / 2;
      if (d <= half * 0.3) return 'perfect';
      if (d <= half) return 'good';
      return 'miss';
    }

    function strike(position = state.needle) {
      if (state.phase !== 'playing') return null;
      const result = grade(position);

      if (result === 'miss') {
        state.combo = 0;
        state.spirit -= 1;
        state.progress = Math.max(0, state.progress - 12);
        emit('miss', { spirit: state.spirit });
        if (state.spirit <= 0) {
          if (!state.kaminaUsed) {
            state.kaminaUsed = true;
            state.spirit = 1;
            emit('kamina');
          } else {
            state.phase = 'lost';
            emit('lost', { layer: state.layer, score: state.score });
          }
        }
        return result;
      }

      state.combo += 1;
      state.bestCombo = Math.max(state.bestCombo, state.combo);
      const gain = result === 'perfect' ? 34 + Math.min(state.combo, 8) * 3 : 20;
      state.progress += gain;
      state.score += (result === 'perfect' ? 300 : 120) * (1 + state.layer) + state.combo * 25;
      emit(result, { combo: state.combo });

      if (state.progress >= 100) {
        state.progress = 0;
        if (state.layer === LAYERS.length - 1) {
          state.phase = 'won';
          state.score += 10000;
          emit('won', { score: state.score });
          return result;
        }
        state.layer += 1;
        state.zoneWidth = Math.max(0.07, state.zoneWidth * 0.84);
        state.speed *= 1.16;
        emit('layer', { layer: state.layer, name: LAYERS[state.layer].name, line: LAYERS[state.layer].line });
      }
      newZone();
      return result;
    }

    reset();
    return { state, start, tick, strike, grade, drainEvents: () => state.events.splice(0) };
  }

  const api = { createSpiral, LAYERS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OtakuSpiral = api;
})(typeof window !== 'undefined' ? window : globalThis);
