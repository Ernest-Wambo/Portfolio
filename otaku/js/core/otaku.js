/**
 * Otaku Zone runtime — namespace + module registry.
 *
 * Every feature lives in its own file and registers itself here:
 *
 *   Otaku.register('module-name', (ctx) => { ... });
 *
 * `ctx` exposes the shared core services (bus, store, sfx, input, toast,
 * motion). Modules never reach into each other directly; they communicate
 * through bus events. Otaku.boot() runs every module in isolation so one
 * failing module can't take the rest of the page down.
 *
 * Plain classic scripts on purpose: the page keeps working when opened
 * straight from disk (file://), where ES modules are blocked by CORS.
 */
(function (global) {
  'use strict';

  const modules = [];
  let booted = false;

  const Otaku = {
    version: '2.0.0',
    services: {},

    /** Register a core service (bus, store, sfx, ...) on the shared context. */
    provide(name, service) {
      this.services[name] = service;
      this[name] = service;
      return service;
    },

    /** Register a feature module. `init(ctx)` may return a public API object. */
    register(name, init) {
      modules.push({ name, init });
    },

    /** Look up a started module's public API (debugging / console play). */
    module(name) {
      const entry = modules.find((m) => m.name === name);
      return entry ? entry.api : undefined;
    },

    boot() {
      if (booted) return;
      booted = true;

      const ctx = Object.assign({}, this.services, {
        motion: {
          get reduced() {
            return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
          },
        },
      });

      modules.forEach((entry) => {
        try {
          entry.api = entry.init(ctx) || {};
        } catch (err) {
          console.error(`[Otaku] module "${entry.name}" failed to start:`, err);
        }
      });

      if (this.bus) this.bus.emit('app:ready', { modules: modules.map((m) => m.name) });
    },
  };

  global.Otaku = Otaku;
})(window);
