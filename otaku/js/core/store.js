/**
 * Namespaced, failure-tolerant persistence over localStorage.
 * Private windows or blocked storage fall back to an in-memory map, so
 * features keep working for the session instead of throwing.
 */
(function (Otaku) {
  'use strict';

  const PREFIX = 'otaku:v1:';
  const memory = new Map();

  function backend() {
    try {
      const probe = PREFIX + '__probe';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      return window.localStorage;
    } catch {
      return null;
    }
  }

  const storage = backend();

  Otaku.provide('store', {
    get(key, fallback) {
      try {
        const raw = storage ? storage.getItem(PREFIX + key) : memory.get(key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },

    set(key, value) {
      const raw = JSON.stringify(value);
      try {
        if (storage) storage.setItem(PREFIX + key, raw);
        else memory.set(key, raw);
      } catch {
        memory.set(key, raw);
      }
      return value;
    },

    remove(key) {
      try {
        if (storage) storage.removeItem(PREFIX + key);
      } catch {
        /* ignore */
      }
      memory.delete(key);
    },

    /** Keep the highest value seen for `key`; returns true when it's a new record. */
    recordMax(key, value) {
      const prev = this.get(key, null);
      if (prev === null || value > prev) {
        this.set(key, value);
        return true;
      }
      return false;
    },

    /** Keep the lowest value seen for `key` (e.g. best times). */
    recordMin(key, value) {
      const prev = this.get(key, null);
      if (prev === null || value < prev) {
        this.set(key, value);
        return true;
      }
      return false;
    },
  });
})(window.Otaku);
