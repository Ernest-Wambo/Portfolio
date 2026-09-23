/**
 * Event bus — the only channel modules use to talk to each other.
 *
 * Event catalogue (keep this list current when adding events):
 *   app:ready                 { modules }
 *   secret:found              { id }            → codex unlocks a secret
 *   codex:changed             { found, total }
 *   stats:changed             { key }           → records strip refreshes
 *   sfx:toggled               { enabled }
 *   scouter:toggled           { enabled }
 *   fx:domain / fx:geass / fx:zawarudo / fx:saiyan   → trigger a screen effect
 *   time:stop / time:resume   → page-wide freeze (ghost, cards)
 *   overlay:open / overlay:close  { id }
 */
(function (Otaku) {
  'use strict';

  const listeners = new Map();

  Otaku.provide('bus', {
    on(event, handler) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(handler);
      return () => this.off(event, handler);
    },

    once(event, handler) {
      const off = this.on(event, (payload) => {
        off();
        handler(payload);
      });
      return off;
    },

    off(event, handler) {
      const set = listeners.get(event);
      if (set) set.delete(handler);
    },

    emit(event, payload) {
      const set = listeners.get(event);
      if (!set) return;
      [...set].forEach((handler) => {
        try {
          handler(payload || {});
        } catch (err) {
          console.error(`[Otaku] listener for "${event}" threw:`, err);
        }
      });
    },
  });
})(window.Otaku);
