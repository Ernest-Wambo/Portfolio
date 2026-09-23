/**
 * Tier List Forge — rank every title on the page S → F.
 *
 * Three ways to move a chip, so it works everywhere:
 *   • mouse/pen: drag it onto a row (drop position keeps order)
 *   • touch/click: tap a chip to pick it up, tap a row to place it
 *   • keyboard: focus a chip, press S A B C D F (0 / Backspace = back to pool)
 * State persists; "Dossier canon" loads a verdict inferred from this page;
 * "Export PNG" renders the list to an image.
 */
Otaku.register('tier-list', ({ store, sfx, toast, data, dom }) => {
  const root = document.querySelector('[data-tier-forge]');
  if (!root) return;

  const { h, img, mount } = dom;
  const { tierPool, tierCanon } = data.get('library');
  const TIERS = [
    { id: 'S', color: '#ff4d6d', label: 'Masterpiece' },
    { id: 'A', color: '#ff9f43', label: 'Elite' },
    { id: 'B', color: '#ffd166', label: 'Solid' },
    { id: 'C', color: '#06d6a0', label: 'Fine' },
    { id: 'D', color: '#4cc9f0', label: 'Mid' },
    { id: 'F', color: '#8d99ae', label: 'VF dub' },
  ];
  const byId = new Map(tierPool.map((t) => [t.id, t]));
  const rowsEl = root.querySelector('[data-tier-rows]');
  const poolEl = root.querySelector('[data-tier-pool]');
  const hint = root.querySelector('[data-tier-hint]');

  let state = load();
  let selected = null;

  function empty() {
    return Object.fromEntries(TIERS.map((t) => [t.id, []]));
  }

  function load() {
    const saved = store.get('tier.state', null);
    const next = empty();
    if (saved) TIERS.forEach((t) => (next[t.id] = (saved[t.id] || []).filter((id) => byId.has(id))));
    return next;
  }

  const save = () => store.set('tier.state', state);
  const placed = () => new Set(TIERS.flatMap((t) => state[t.id]));

  function move(id, tier, beforeId = null) {
    TIERS.forEach((t) => (state[t.id] = state[t.id].filter((x) => x !== id)));
    if (tier && state[tier]) {
      const list = state[tier];
      const at = beforeId ? list.indexOf(beforeId) : -1;
      if (at >= 0) list.splice(at, 0, id);
      else list.push(id);
    }
    save();
    sfx.play('slide');
    selected = null;
    render();
    const chip = root.querySelector(`.tier-chip[data-id="${id}"]`);
    if (chip) chip.focus({ preventScroll: true });
  }

  function chip(item) {
    const el = h('button', {
      type: 'button',
      class: `tier-chip${selected === item.id ? ' is-selected' : ''}`,
      dataset: { id: item.id },
      'aria-pressed': String(selected === item.id),
      title: item.title,
    },
    item.cover && item.cover.length ? img({ src: item.cover, alt: '', kind: 'poster', className: 'tier-chip-art' }) : h('span', { class: 'tier-chip-art tier-chip-art--blank', 'aria-hidden': 'true', text: item.title[0] }),
    h('span', { class: 'tier-chip-title', text: item.title }));
    return el;
  }

  function render() {
    mount(rowsEl, TIERS.map((tier) =>
      h('div', { class: 'tier-row', style: { '--tier': tier.color } },
        h('div', { class: 'tier-label' }, h('strong', { text: tier.id }), h('span', { text: tier.label })),
        h('div', { class: 'tier-zone', dataset: { tierZone: tier.id }, 'aria-label': `${tier.id} tier` },
          state[tier.id].map((id) => chip(byId.get(id)))))));
    const inRows = placed();
    mount(poolEl, tierPool.filter((t) => !inRows.has(t.id)).map(chip));
    poolEl.classList.toggle('is-empty', poolEl.children.length === 0);
    hint.textContent = selected
      ? `Holding “${byId.get(selected).title}” — tap a row (or the pool) to place it.`
      : 'Drag chips onto a row, or tap a chip and then a row. Keyboard: focus a chip and press S A B C D F.';
  }

  // ── Click / tap placement ───────────────────────────────────────────────
  let suppressClick = false;
  root.addEventListener('click', (event) => {
    if (suppressClick) { suppressClick = false; return; }
    const c = event.target.closest('.tier-chip');
    const zone = event.target.closest('[data-tier-zone], [data-tier-pool]');
    if (c) {
      if (selected && selected !== c.dataset.id && zone) {
        move(selected, zone.dataset.tierZone || null, c.dataset.id);
        return;
      }
      selected = selected === c.dataset.id ? null : c.dataset.id;
      sfx.play('blip');
      render();
      const again = root.querySelector(`.tier-chip[data-id="${c.dataset.id}"]`);
      if (again) again.focus({ preventScroll: true });
      return;
    }
    if (zone && selected) move(selected, zone.dataset.tierZone || null);
  });

  // ── Keyboard ────────────────────────────────────────────────────────────
  root.addEventListener('keydown', (event) => {
    const c = event.target.closest('.tier-chip');
    if (!c) return;
    const key = event.key.toUpperCase();
    const tier = TIERS.some((t) => t.id === key) ? key : ['0', 'BACKSPACE', 'DELETE'].includes(key) ? null : undefined;
    if (tier === undefined) return;
    // The chip is re-rendered (detached) by move(); stop the event here so the
    // global shortcut layer never sees a key this widget already consumed.
    event.preventDefault();
    event.stopPropagation();
    move(c.dataset.id, tier);
  });

  // ── Mouse / pen drag ────────────────────────────────────────────────────
  let drag = null;
  root.addEventListener('pointerdown', (event) => {
    const c = event.target.closest('.tier-chip');
    if (!c || event.pointerType === 'touch' || event.button !== 0) return;
    drag = { id: c.dataset.id, source: c, x: event.clientX, y: event.clientY, ghost: null };
  });

  document.addEventListener('pointermove', (event) => {
    if (!drag) return;
    if (!drag.ghost) {
      if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 6) return;
      drag.ghost = drag.source.cloneNode(true);
      drag.ghost.classList.add('tier-ghost');
      document.body.appendChild(drag.ghost);
      drag.source.classList.add('is-dragging');
    }
    drag.ghost.style.transform = `translate(${event.clientX - 20}px, ${event.clientY - 20}px)`;
    root.querySelectorAll('.is-drop-target').forEach((el) => el.classList.remove('is-drop-target'));
    const over = document.elementFromPoint(event.clientX, event.clientY);
    const zone = over && over.closest('[data-tier-zone], [data-tier-pool]');
    if (zone && root.contains(zone)) zone.classList.add('is-drop-target');
  });

  document.addEventListener('pointerup', (event) => {
    if (!drag) return;
    const { ghost, id, source } = drag;
    drag = null;
    if (!ghost) return;
    ghost.remove();
    source.classList.remove('is-dragging');
    suppressClick = true;
    setTimeout(() => (suppressClick = false), 0);
    const over = document.elementFromPoint(event.clientX, event.clientY);
    const zone = over && over.closest('[data-tier-zone], [data-tier-pool]');
    if (!zone || !root.contains(zone)) return render();
    const before = over.closest('.tier-chip');
    move(id, zone.dataset.tierZone || null, before && before.dataset.id !== id ? before.dataset.id : null);
  });

  // ── Toolbar ─────────────────────────────────────────────────────────────
  root.querySelector('[data-tier-canon]').addEventListener('click', () => {
    state = empty();
    TIERS.forEach((t) => (state[t.id] = (tierCanon[t.id] || []).filter((id) => byId.has(id))));
    save();
    render();
    toast('Dossier canon loaded — inferred from this page. Overrule it.', { icon: 'fa-scale-balanced', tone: 'cyan', duration: 2600 });
  });

  root.querySelector('[data-tier-clear]').addEventListener('click', () => {
    state = empty();
    save();
    render();
  });

  root.querySelector('[data-tier-export]').addEventListener('click', () => exportPng());

  // ── PNG export ──────────────────────────────────────────────────────────
  function loadImage(src) {
    return new Promise((resolve) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => resolve(null);
      im.src = src;
    });
  }

  async function paint(withArt) {
    const ROW = 120;
    const W = 1400;
    const LABEL = 130;
    const CHIP = 92;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = 120 + TIERS.length * ROW + 40;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#080c16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f1f5f9';
    ctx.font = '700 40px Outfit, Inter, sans-serif';
    ctx.fillText('Tier List Forge', 40, 70);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 20px Inter, sans-serif';
    ctx.fillText('Algebra | BlackPanther | Lumen_Tx — Otaku Dossier', 40, 100);

    for (let r = 0; r < TIERS.length; r++) {
      const tier = TIERS[r];
      const y = 120 + r * ROW;
      ctx.fillStyle = tier.color;
      ctx.fillRect(40, y, LABEL, ROW - 10);
      ctx.fillStyle = '#0b0f19';
      ctx.font = '800 48px Outfit, Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(tier.id, 40 + LABEL / 2, y + 68);
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fillRect(40 + LABEL, y, W - 80 - LABEL, ROW - 10);

      let x = 40 + LABEL + 12;
      for (const id of state[tier.id]) {
        const item = byId.get(id);
        const art = withArt && item.cover && item.cover[0] ? await loadImage(item.cover[0]) : null;
        if (art) {
          const s = Math.max(CHIP / art.naturalWidth, (ROW - 30) / art.naturalHeight);
          ctx.save();
          ctx.beginPath();
          ctx.rect(x, y + 10, CHIP, ROW - 30);
          ctx.clip();
          ctx.drawImage(art, x + (CHIP - art.naturalWidth * s) / 2, y + 10, art.naturalWidth * s, art.naturalHeight * s);
          ctx.restore();
        } else {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(x, y + 10, CHIP, ROW - 30);
        }
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(x, y + ROW - 44, CHIP, 24);
        ctx.fillStyle = '#f8fafc';
        ctx.font = '600 11px Inter, sans-serif';
        const label = item.title.length > 15 ? item.title.slice(0, 14) + '…' : item.title;
        ctx.fillText(label, x + 5, y + ROW - 28);
        x += CHIP + 8;
        if (x > W - 40 - CHIP) break;
      }
    }
    return canvas;
  }

  async function exportPng() {
    let canvas = await paint(true);
    let url;
    try {
      url = canvas.toDataURL('image/png');
    } catch {
      // file:// pages taint the canvas when drawing local images: fall back to text-only chips.
      canvas = await paint(false);
      url = canvas.toDataURL('image/png');
    }
    const a = h('a', { href: url, download: 'otaku-tier-list.png' });
    document.body.appendChild(a);
    a.click();
    a.remove();
    sfx.play('achievement');
    toast('Tier list exported as PNG.', { icon: 'fa-image', tone: 'cyan', duration: 2400 });
  }

  render();
  return { move, get state() { return JSON.parse(JSON.stringify(state)); }, paint };
});
