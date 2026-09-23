/**
 * SEG-10 — Hidden gateway from the personal portfolio into the Otaku Zone.
 *
 * Loaded by index.html with a single <script defer> tag. Fully
 * self-contained: it injects its own `gw-` prefixed styles and touches no
 * portfolio CSS or JS. Two ways in:
 *   • poke the roaming ghost five times in a row
 *   • type "otaku" anywhere (outside form fields)
 * If this file is missing, the portfolio behaves exactly as before.
 */
(function () {
  'use strict';

  const TARGET = 'otaku.html';
  const WORD = 'otaku';
  const POKES_TO_ENTER = 5;
  const POKE_WINDOW_MS = 3500;
  const LINES = ['…?', 'Stop poking me.', 'You really want to know?', 'One more and there is no going back.'];

  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let entering = false;

  const css = `
    .gw-bubble { position: fixed; z-index: 10000; max-width: 220px; padding: .45rem .8rem; border-radius: 12px;
      background: rgba(245,243,255,.96); color: #2e1065; font: 600 .78rem/1.3 Inter, system-ui, sans-serif;
      text-align: center; pointer-events: none; box-shadow: 0 8px 22px -6px rgba(124,58,237,.6);
      transform: translate(-50%, -100%); opacity: 0; transition: opacity .2s ease; }
    .gw-bubble.gw-show { opacity: 1; }
    .gw-portal { position: fixed; inset: 0; z-index: 10001; display: flex; align-items: center; justify-content: center;
      flex-direction: column; gap: 1rem; background: #030307; opacity: 0; transition: opacity .35s ease; }
    .gw-portal.gw-open { opacity: 1; }
    .gw-eye { width: min(46vmin, 280px); aspect-ratio: 1; border-radius: 50%; position: relative;
      background: radial-gradient(circle, #111 0 16%, #b91c1c 17% 58%, #450a0a 60% 100%);
      box-shadow: 0 0 80px rgba(220,38,38,.6); animation: gw-spin 1.1s linear infinite; }
    .gw-eye i { position: absolute; width: 14%; height: 14%; border-radius: 50% 50% 50% 0; background: #111;
      top: 50%; left: 50%; }
    .gw-eye i:nth-child(1) { transform: rotate(0deg) translate(0, -210%) rotate(45deg); }
    .gw-eye i:nth-child(2) { transform: rotate(120deg) translate(0, -210%) rotate(45deg); }
    .gw-eye i:nth-child(3) { transform: rotate(240deg) translate(0, -210%) rotate(45deg); }
    .gw-open .gw-eye { animation: gw-spin .5s linear infinite, gw-zoom 1.1s .2s cubic-bezier(.7,0,.3,1) forwards; }
    .gw-text { color: #fecaca; font: 700 .85rem/1 ui-monospace, Consolas, monospace; letter-spacing: .35em;
      text-transform: uppercase; }
    @keyframes gw-spin { to { rotate: 360deg; } }
    @keyframes gw-zoom { to { transform: scale(9); filter: brightness(.2); } }
  `;

  function injectStyles() {
    const style = document.createElement('style');
    style.id = 'gw-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function enter() {
    if (entering) return;
    entering = true;
    if (reduced) {
      window.location.href = TARGET;
      return;
    }
    const portal = document.createElement('div');
    portal.className = 'gw-portal';
    portal.setAttribute('role', 'status');
    portal.innerHTML = '<div class="gw-eye" aria-hidden="true"><i></i><i></i><i></i></div><p class="gw-text">Entering the villain dossier</p>';
    document.body.appendChild(portal);
    requestAnimationFrame(() => portal.classList.add('gw-open'));
    setTimeout(() => { window.location.href = TARGET; }, 1350);
  }

  function wireGhost() {
    const body = document.querySelector('#ghost-pet-char .pet-body');
    const wrapper = document.getElementById('ghost-pet-wrapper');
    if (!body || !wrapper) return;

    body.style.pointerEvents = 'auto';
    body.style.cursor = 'pointer';

    const bubble = document.createElement('div');
    bubble.className = 'gw-bubble';
    bubble.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bubble);

    let pokes = 0;
    let resetTimer = null;
    let hideTimer = null;

    function say(text) {
      const rect = wrapper.getBoundingClientRect();
      bubble.textContent = text;
      bubble.style.left = `${Math.min(window.innerWidth - 120, Math.max(120, rect.left + rect.width / 2))}px`;
      bubble.style.top = `${Math.max(40, rect.top - 6)}px`;
      bubble.classList.add('gw-show');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => bubble.classList.remove('gw-show'), 1800);
    }

    body.addEventListener('click', (event) => {
      event.stopPropagation();
      pokes += 1;
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => (pokes = 0), POKE_WINDOW_MS);
      if (pokes >= POKES_TO_ENTER) {
        say('Fine. Come in.');
        enter();
      } else {
        say(LINES[Math.min(pokes - 1, LINES.length - 1)]);
      }
    });
  }

  function wireWord() {
    let buffer = '';
    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) return;
      if (event.target.closest && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      buffer = (buffer + event.key.toLowerCase()).slice(-WORD.length);
      if (buffer === WORD) enter();
    });
  }

  function init() {
    injectStyles();
    wireGhost();
    wireWord();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
