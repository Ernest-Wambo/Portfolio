/**
 * Manhwa Chapter Tracker — "Currently Locked In" shelf (js/data/manhwa.js)
 * with per-series chapter progress, an optional "latest chapter" target,
 * progress bars and "last read" timestamps. Progress persists per browser.
 */
Otaku.register('manhwa-tracker', ({ store, sfx, toast, data, dom }) => {
  const container = document.querySelector('[data-render="manhwa"]');
  const summary = document.querySelector('[data-manhwa-summary]');
  if (!container) return;

  const { h, img, icon, mount } = dom;
  const shelf = data.get('manhwa');
  let progress = store.get('manhwa.progress', {});

  const entry = (id) => Object.assign({ chapter: 0, latest: 0, readAt: 0 }, progress[id]);

  function ago(ts) {
    if (!ts) return 'not logged yet';
    const s = Math.round((Date.now() - ts) / 1000);
    if (s < 60) return 'read just now';
    const m = Math.round(s / 60);
    if (m < 60) return `read ${m} min ago`;
    const hrs = Math.round(m / 60);
    if (hrs < 24) return `read ${hrs} h ago`;
    const d = Math.round(hrs / 24);
    return `read ${d} day${d > 1 ? 's' : ''} ago`;
  }

  function update(id, patch, { silent = false } = {}) {
    const next = Object.assign(entry(id), patch);
    next.chapter = Math.max(0, Math.floor(next.chapter) || 0);
    next.latest = Math.max(0, Math.floor(next.latest) || 0);
    progress = Object.assign({}, progress, { [id]: next });
    store.set('manhwa.progress', progress);
    if (!silent) sfx.play('blip');
    render();
  }

  function card(series) {
    const p = entry(series.id);
    const caught = p.latest > 0 && p.chapter >= p.latest;
    const pct = p.latest > 0 ? Math.min(100, (p.chapter / p.latest) * 100) : 0;

    return h('article', { class: `manhwa-card manhwa-card--tracked${caught ? ' is-caught-up' : ''}`, dataset: { deathnote: series.title, manhwa: series.id } },
      h('div', { class: 'manhwa-cover' }, img({ src: series.cover, alt: `${series.title} cover`, kind: 'manhwa', position: 'top' })),
      h('div', { class: 'manhwa-body' },
        h('span', { class: 'manhwa-chip' }, icon('fa-circle'), caught ? ' Caught up' : ' Locked In'),
        h('h5', { text: series.title }),
        h('p', { text: series.blurb }),
        h('div', { class: 'manhwa-track' },
          h('button', { type: 'button', class: 'manhwa-step', 'aria-label': `One chapter back on ${series.title}`,
            onClick: () => update(series.id, { chapter: p.chapter - 1 }) }, icon('fa-minus')),
          h('label', { class: 'manhwa-field' }, h('span', { text: 'Ch.' }),
            h('input', { type: 'number', min: '0', inputmode: 'numeric', value: String(p.chapter), 'aria-label': `Current chapter of ${series.title}`,
              onChange: (e) => update(series.id, { chapter: Number(e.target.value), readAt: Date.now() }) })),
          h('button', { type: 'button', class: 'manhwa-step manhwa-step--plus', 'aria-label': `Read one more chapter of ${series.title}`,
            onClick: () => {
              update(series.id, { chapter: p.chapter + 1, readAt: Date.now() });
              if (p.latest && p.chapter + 1 === p.latest) toast(`Caught up on ${series.title}. The weekly wait begins.`, { icon: 'fa-hourglass-half', tone: 'violet', duration: 2400 });
            } }, icon('fa-plus')),
          h('label', { class: 'manhwa-field manhwa-field--latest' }, h('span', { text: 'of' }),
            h('input', { type: 'number', min: '0', inputmode: 'numeric', value: p.latest ? String(p.latest) : '', placeholder: '?', 'aria-label': `Latest released chapter of ${series.title}`,
              onChange: (e) => update(series.id, { latest: Number(e.target.value) }) }))),
        h('div', { class: 'manhwa-progress', role: 'progressbar', 'aria-label': `${series.title} progress`, 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(pct)) },
          h('span', { style: { width: `${pct}%` } })),
        h('small', { class: 'manhwa-meta', text: ago(p.readAt) })));
  }

  function render() {
    const focusedId = document.activeElement && document.activeElement.closest && document.activeElement.closest('[data-manhwa]');
    const focusKey = focusedId && focusedId.dataset.manhwa;
    const focusLabel = document.activeElement && document.activeElement.getAttribute('aria-label');

    mount(container, shelf.map(card));
    const total = shelf.reduce((sum, s) => sum + entry(s.id).chapter, 0);
    if (summary) summary.textContent = `${shelf.length} series · ${total.toLocaleString('en-US')} chapters logged`;

    if (focusKey && focusLabel) {
      const again = container.querySelector(`[data-manhwa="${focusKey}"] [aria-label="${CSS.escape(focusLabel)}"]`);
      if (again) again.focus({ preventScroll: true });
    }
  }

  render();
  // Refresh only the "read x ago" labels, never the inputs someone may be typing in.
  setInterval(() => {
    container.querySelectorAll('[data-manhwa]').forEach((el) => {
      const meta = el.querySelector('.manhwa-meta');
      if (meta) meta.textContent = ago(entry(el.dataset.manhwa).readAt);
    });
  }, 60000);
  return { update, get progress() { return JSON.parse(JSON.stringify(progress)); } };
});
