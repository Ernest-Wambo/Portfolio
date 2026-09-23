/**
 * Stage — shared lifecycle for full-screen cinematic effects
 * (Domain Expansion, Geass, Za Warudo, ...).
 *
 *   Otaku.stage.run('domain', {
 *     className: 'fx-domain',
 *     duration: 4000,
 *     freeze: true,                 // pause the page + emit time:stop/resume
 *     render(overlay) { ...; return cleanupFn; },
 *   });
 *
 * Only one effect plays at a time. Esc or a click ends it early.
 */
(function (Otaku) {
  'use strict';

  const bus = Otaku.bus;
  let current = null;

  function finish() {
    if (!current) return;
    const { overlay, cleanup, freeze, timer, onKey, name } = current;
    current = null;

    clearTimeout(timer);
    document.removeEventListener('keydown', onKey, true);
    overlay.classList.add('is-leaving');
    setTimeout(() => overlay.remove(), 600);

    if (typeof cleanup === 'function') {
      try {
        cleanup();
      } catch (err) {
        console.error('[Otaku] stage cleanup failed:', err);
      }
    }

    if (freeze) {
      document.documentElement.classList.remove('is-frozen');
      bus.emit('time:resume', { by: name });
    }
    bus.emit('overlay:close', { id: name });
  }

  Otaku.provide('stage', {
    get busy() {
      return !!current;
    },

    run(name, { className = '', duration = 3000, freeze = false, render } = {}) {
      if (current) return false;

      const overlay = document.createElement('div');
      overlay.className = `fx-overlay ${className}`.trim();
      overlay.setAttribute('role', 'presentation');
      document.body.appendChild(overlay);

      const onKey = (event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          finish();
        }
      };

      current = { name, overlay, freeze, onKey, cleanup: null, timer: null };
      current.cleanup = render ? render(overlay) : null;
      current.timer = setTimeout(finish, duration);

      document.addEventListener('keydown', onKey, true);
      overlay.addEventListener('click', finish);

      if (freeze) {
        document.documentElement.classList.add('is-frozen');
        bus.emit('time:stop', { by: name });
      }
      bus.emit('overlay:open', { id: name });

      requestAnimationFrame(() => overlay.classList.add('is-active'));
      return true;
    },

    stop: finish,
  });
})(window.Otaku);
