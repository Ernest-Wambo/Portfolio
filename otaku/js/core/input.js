/**
 * Keyboard input manager.
 *
 *   input.shortcut('m', handler, 'Toggle sound')     single-key shortcut
 *   input.sequence('jujutsu', handler)               typed word
 *   input.sequence(['ArrowUp', ..., 'b', 'a'], fn)   arbitrary key sequence
 *
 * Shortcuts and sequences are ignored while the user types into a field
 * (the alchemy terminal, for instance) or holds a modifier key.
 */
(function (Otaku) {
  'use strict';

  const MAX_BUFFER = 16;
  const shortcuts = new Map();
  const sequences = [];
  let buffer = [];

  function normalize(key) {
    return key.length === 1 ? key.toLowerCase() : key;
  }

  function isEditable(target) {
    if (!target || !target.closest) return false;
    return !!target.closest('input, textarea, select, [contenteditable="true"]');
  }

  function matches(seq) {
    if (buffer.length < seq.length) return false;
    const tail = buffer.slice(-seq.length);
    return seq.every((key, i) => key === tail[i]);
  }

  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (isEditable(event.target)) return;

    const key = normalize(event.key);
    buffer.push(key);
    if (buffer.length > MAX_BUFFER) buffer = buffer.slice(-MAX_BUFFER);

    for (const entry of sequences) {
      if (matches(entry.keys)) {
        buffer = [];
        entry.handler(event);
        return;
      }
    }

    // Shortcuts don't fire from inside interactive widgets that own the keys
    // (e.g. the 2048 board, which uses arrows and WASD).
    if (event.target.closest && event.target.closest('[data-owns-keys]')) return;

    const shortcut = shortcuts.get(key);
    if (shortcut && !event.repeat) {
      event.preventDefault();
      shortcut.handler(event);
    }
  });

  Otaku.provide('input', {
    isEditable,

    shortcut(key, handler, description) {
      shortcuts.set(normalize(key), { handler, description });
    },

    sequence(keys, handler) {
      const list = typeof keys === 'string' ? keys.split('') : keys.map(normalize);
      sequences.push({ keys: list, handler });
    },

    /** Registered shortcuts, for the help overlay. */
    describe() {
      return [...shortcuts.entries()]
        .filter(([, s]) => s.description)
        .map(([key, s]) => ({ key, description: s.description }));
    },
  });
})(window.Otaku);
