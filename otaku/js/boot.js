/**
 * Boot — loaded last. Every core service and module above has registered
 * itself; start them all once the DOM is ready.
 */
(function () {
  'use strict';
  const start = () => window.Otaku.boot();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
