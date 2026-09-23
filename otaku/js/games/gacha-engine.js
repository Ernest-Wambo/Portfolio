/**
 * Gacha engine — pure summon logic with rates and pity, no DOM.
 *
 *   const gacha = createGacha({ pool });
 *   const { character, rarity, pity, state } = gacha.pull(state);
 *
 * Pity: every `pity.SR`-th pull is at least SR; every `pity.SSR`-th is SSR.
 * `state` is plain JSON ({ sinceSR, sinceSSR, total }) so callers can persist it.
 */
(function (root) {
  'use strict';

  const DEFAULT_RATES = { SSR: 0.03, SR: 0.17, R: 0.8 };
  const DEFAULT_PITY = { SR: 10, SSR: 40 };

  function createGacha({ pool, rates = DEFAULT_RATES, pity = DEFAULT_PITY, random = Math.random } = {}) {
    if (!Array.isArray(pool) || pool.length === 0) throw new Error('gacha: empty pool');
    const byRarity = { SSR: [], SR: [], R: [] };
    pool.forEach((c) => {
      if (!byRarity[c.rarity]) throw new Error(`gacha: unknown rarity ${c.rarity} for ${c.id}`);
      byRarity[c.rarity].push(c);
    });

    const freshState = () => ({ sinceSR: 0, sinceSSR: 0, total: 0 });

    function rollRarity(state) {
      if (state.sinceSSR + 1 >= pity.SSR && byRarity.SSR.length) return { rarity: 'SSR', pity: 'SSR' };
      const r = random();
      if (state.sinceSR + 1 >= pity.SR) {
        const ssrShare = rates.SSR / (rates.SSR + rates.SR);
        return { rarity: r < ssrShare ? 'SSR' : 'SR', pity: 'SR' };
      }
      if (r < rates.SSR) return { rarity: 'SSR', pity: null };
      if (r < rates.SSR + rates.SR) return { rarity: 'SR', pity: null };
      return { rarity: 'R', pity: null };
    }

    function pull(prev) {
      const state = Object.assign(freshState(), prev);
      let { rarity, pity: pityHit } = rollRarity(state);
      if (!byRarity[rarity].length) rarity = 'R';
      const list = byRarity[rarity];
      const character = list[Math.floor(random() * list.length)];

      const next = { total: state.total + 1, sinceSR: state.sinceSR + 1, sinceSSR: state.sinceSSR + 1 };
      if (rarity === 'SSR') { next.sinceSR = 0; next.sinceSSR = 0; }
      if (rarity === 'SR') next.sinceSR = 0;
      return { character, rarity, pity: pityHit, state: next };
    }

    function pullMany(prev, count) {
      const results = [];
      let state = prev;
      for (let i = 0; i < count; i++) {
        const res = pull(state);
        state = res.state;
        results.push(res);
      }
      return { results, state };
    }

    return { pull, pullMany, freshState, rates, pity, byRarity };
  }

  const api = { createGacha, DEFAULT_RATES, DEFAULT_PITY };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OtakuGacha = api;
})(typeof window !== 'undefined' ? window : globalThis);
