/**
 * Toast notifications (bottom-left stack, announced to screen readers).
 *
 *   Otaku.toast('Rank up: Jonin', { icon: 'fa-bolt', tone: 'gold' });
 *
 * Tones: 'violet' (default), 'gold', 'red', 'green', 'cyan'.
 */
(function (Otaku) {
  'use strict';

  const MAX_VISIBLE = 4;
  let stack = null;

  function ensureStack() {
    if (stack) return stack;
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    stack.setAttribute('role', 'status');
    stack.setAttribute('aria-live', 'polite');
    document.body.appendChild(stack);
    return stack;
  }

  function dismiss(el) {
    if (!el.isConnected || el.classList.contains('is-leaving')) return;
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), 300);
  }

  Otaku.provide('toast', function toast(message, { icon = 'fa-bolt', tone = 'violet', title, duration = 3800 } = {}) {
    const root = ensureStack();
    const el = document.createElement('div');
    el.className = `toast toast--${tone}`;

    const iconEl = document.createElement('i');
    iconEl.className = `fa-solid ${icon}`;
    iconEl.setAttribute('aria-hidden', 'true');

    const body = document.createElement('div');
    if (title) {
      const strong = document.createElement('strong');
      strong.textContent = title;
      body.appendChild(strong);
    }
    const text = document.createElement('span');
    text.textContent = message;
    body.appendChild(text);

    el.append(iconEl, body);
    root.appendChild(el);

    while (root.children.length > MAX_VISIBLE) root.firstElementChild.remove();
    setTimeout(() => dismiss(el), duration);
    return el;
  });
})(window.Otaku);
