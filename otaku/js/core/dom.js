/**
 * Tiny DOM toolkit shared by every renderer.
 *
 *   dom.h('div', { class: 'card', dataset: { id: 'x' }, onClick: fn }, child, 'text')
 *   dom.icon('fa-fire', '#fbbf24')
 *   dom.img({ src: ['a.png', 'a.svg'], alt, kind: 'character' })
 *
 * dom.img implements the Drop-In Rule: it walks the `src` list in order and
 * finally lands on the matching placeholder, so a missing asset never shows
 * as a broken image and a newly dropped-in file is picked up automatically.
 */
(function (Otaku) {
  'use strict';

  const PLACEHOLDERS = {
    character: 'assets/otaku/placeholders/character-placeholder.svg',
    poster: 'assets/otaku/placeholders/poster-placeholder.svg',
    manhwa: 'assets/otaku/placeholders/manhwa-placeholder.svg',
  };

  function h(tag, props, ...children) {
    const el = document.createElement(tag);
    Object.entries(props || {}).forEach(([key, value]) => {
      if (value == null || value === false) return;
      if (key === 'class') el.className = value;
      else if (key === 'text') el.textContent = value;
      else if (key === 'html') el.innerHTML = value; // trusted, static strings only
      else if (key === 'dataset') Object.assign(el.dataset, value);
      else if (key === 'style' && typeof value === 'object') {
        Object.entries(value).forEach(([prop, v]) => el.style.setProperty(prop, v));
      } else if (key.startsWith('on') && typeof value === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (value === true) el.setAttribute(key, '');
      else el.setAttribute(key, value);
    });
    children.flat(Infinity).forEach((child) => {
      if (child == null || child === false) return;
      el.append(child.nodeType ? child : document.createTextNode(String(child)));
    });
    return el;
  }

  function icon(name, color, extra = '') {
    return h('i', {
      class: `${name.startsWith('fa-brands') ? '' : 'fa-solid '}${name} ${extra}`.trim(),
      'aria-hidden': 'true',
      style: color ? { color } : null,
    });
  }

  function img({ src, alt = '', kind = 'poster', className, loading = 'lazy', position } = {}) {
    const sources = [].concat(src || []).filter(Boolean);
    sources.push(PLACEHOLDERS[kind] || PLACEHOLDERS.poster);
    let index = 0;
    const el = h('img', { src: sources[0], alt, class: className, loading, decoding: 'async' });
    if (position) el.style.objectPosition = position;
    el.addEventListener('error', function next() {
      index += 1;
      if (index < sources.length) el.src = sources[index];
      else el.removeEventListener('error', next);
    });
    return el;
  }

  /** Clear a container and fill it with the given nodes. */
  function mount(container, ...nodes) {
    if (!container) return null;
    container.replaceChildren(...nodes.flat(Infinity).filter(Boolean));
    return container;
  }

  const slug = (text) => String(text).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  Otaku.provide('dom', { h, icon, img, mount, slug, PLACEHOLDERS });
})(window.Otaku);
