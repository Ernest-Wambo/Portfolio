/**
 * Content registry (SEG-09). Data files in js/data/ declare page content:
 *
 *   Otaku.defineData('speeches', [ ... ]);
 *
 * Renderers and features read it back through ctx.data.get('speeches').
 * Editing content never means touching markup or module code.
 */
(function (Otaku) {
  'use strict';

  const registry = new Map();

  Otaku.defineData = function defineData(name, value) {
    if (registry.has(name)) console.warn(`[Otaku] data "${name}" redefined`);
    registry.set(name, value);
    return value;
  };

  Otaku.provide('data', {
    get(name) {
      if (!registry.has(name)) throw new Error(`[Otaku] unknown data set "${name}"`);
      return registry.get(name);
    },
    has: (name) => registry.has(name),
    names: () => [...registry.keys()],
  });
})(window.Otaku);
