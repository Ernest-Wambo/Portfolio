/**
 * 2048 engine — pure game logic, no DOM. Tiles keep stable ids so the view
 * can animate slides and merges. Loadable in the browser (window.OtakuG2048)
 * and in Node (module.exports) for unit tests.
 */
(function (root) {
  'use strict';

  const VECTORS = {
    up: { dr: -1, dc: 0 },
    down: { dr: 1, dc: 0 },
    left: { dr: 0, dc: -1 },
    right: { dr: 0, dc: 1 },
  };

  function createEngine({ size = 4, random = Math.random } = {}) {
    let tiles = [];
    let score = 0;
    let nextId = 1;

    const inBounds = (r, c) => r >= 0 && r < size && c >= 0 && c < size;

    function grid() {
      const g = Array.from({ length: size }, () => Array(size).fill(null));
      tiles.forEach((t) => (g[t.r][t.c] = t));
      return g;
    }

    function emptyCells() {
      const g = grid();
      const cells = [];
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) if (!g[r][c]) cells.push({ r, c });
      }
      return cells;
    }

    function spawn() {
      const cells = emptyCells();
      if (cells.length === 0) return null;
      const { r, c } = cells[Math.floor(random() * cells.length)];
      const tile = { id: nextId++, value: random() < 0.9 ? 2 : 4, r, c };
      tiles.push(tile);
      return tile;
    }

    function reset() {
      tiles = [];
      score = 0;
      spawn();
      spawn();
    }

    function move(dir) {
      const v = VECTORS[dir];
      if (!v) throw new Error(`Unknown direction: ${dir}`);

      const g = grid();
      const rows = [...Array(size).keys()];
      const cols = [...Array(size).keys()];
      if (v.dr === 1) rows.reverse();
      if (v.dc === 1) cols.reverse();

      const mergedIds = new Set();
      const merged = [];
      const consumed = [];
      let moved = false;
      let gained = 0;

      for (const r of rows) {
        for (const c of cols) {
          const tile = g[r][c];
          if (!tile) continue;

          let nr = r;
          let nc = c;
          let absorbedBy = null;

          while (inBounds(nr + v.dr, nc + v.dc)) {
            const other = g[nr + v.dr][nc + v.dc];
            if (!other) {
              nr += v.dr;
              nc += v.dc;
              continue;
            }
            if (other.value === tile.value && !mergedIds.has(other.id)) absorbedBy = other;
            break;
          }

          if (absorbedBy) {
            g[r][c] = null;
            tile.r = absorbedBy.r;
            tile.c = absorbedBy.c;
            absorbedBy.value *= 2;
            mergedIds.add(absorbedBy.id);
            merged.push(absorbedBy);
            consumed.push(tile);
            gained += absorbedBy.value;
            moved = true;
          } else if (nr !== r || nc !== c) {
            g[r][c] = null;
            g[nr][nc] = tile;
            tile.r = nr;
            tile.c = nc;
            moved = true;
          }
        }
      }

      if (!moved) return { moved: false, gained: 0, merged: [], consumed: [], spawned: null };

      tiles = tiles.filter((t) => !consumed.includes(t));
      score += gained;
      const spawned = spawn();
      return { moved, gained, merged, consumed, spawned };
    }

    function canMove() {
      if (tiles.length < size * size) return true;
      const g = grid();
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const value = g[r][c].value;
          if (c + 1 < size && g[r][c + 1].value === value) return true;
          if (r + 1 < size && g[r + 1][c].value === value) return true;
        }
      }
      return false;
    }

    function serialize() {
      const values = grid().map((row) => row.map((t) => (t ? t.value : 0)));
      return { grid: values, score };
    }

    function load(state) {
      if (!state || !Array.isArray(state.grid) || state.grid.length !== size) return false;
      const next = [];
      for (let r = 0; r < size; r++) {
        if (!Array.isArray(state.grid[r]) || state.grid[r].length !== size) return false;
        for (let c = 0; c < size; c++) {
          const value = state.grid[r][c];
          if (value) next.push({ id: nextId++, value, r, c });
        }
      }
      if (next.length === 0) return false;
      tiles = next;
      score = Number(state.score) || 0;
      return true;
    }

    return {
      size,
      reset,
      move,
      canMove,
      serialize,
      load,
      snapshot: () => ({ tiles: tiles.map((t) => Object.assign({}, t)), score }),
      restore(snap) {
        tiles = snap.tiles.map((t) => Object.assign({}, t));
        score = snap.score;
      },
      maxValue: () => tiles.reduce((m, t) => Math.max(m, t.value), 0),
      get tiles() {
        return tiles;
      },
      get score() {
        return score;
      },
    };
  }

  const api = { createEngine, VECTORS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OtakuG2048 = api;
})(typeof window !== 'undefined' ? window : globalThis);
