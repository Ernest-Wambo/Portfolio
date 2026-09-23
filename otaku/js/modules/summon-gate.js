/**
 * Summon Gate — a gacha over js/data/characters.js (engine: games/gacha-engine.js).
 *
 * Tickets: 3 welcome tickets, 1 free per day, 1 per newly unlocked secret
 * (secret:unlocked), 1 per arcade victory (arcade:victory, max 3 per day).
 * Pulls fill the Collection Binder; the first SSR unlocks a secret.
 */
Otaku.register('summon-gate', ({ bus, sfx, store, toast, stage, data, dom }) => {
  const root = document.querySelector('[data-summon]');
  if (!root || !window.OtakuGacha) return;

  const { h, img, mount, icon } = dom;
  const pool = data.get('characters');
  const gacha = window.OtakuGacha.createGacha({ pool });
  const $ = (sel) => root.querySelector(sel);
  const ui = {
    art: $('[data-summon-art]'),
    tickets: $('[data-summon-tickets]'),
    pity: $('[data-summon-pity]'),
    one: $('[data-summon-one]'),
    ten: $('[data-summon-ten]'),
    results: $('[data-summon-results]'),
    binder: $('[data-binder]'),
    binderCount: $('[data-binder-count]'),
    filters: [...root.querySelectorAll('[data-binder-filter]')],
  };

  const WELCOME_TICKETS = 3;
  const ARCADE_DAILY_CAP = 3;
  const today = () => new Date().toLocaleDateString('en-CA');

  let tickets = store.get('gacha.tickets', null);
  let pullState = store.get('gacha.state', gacha.freshState());
  let collection = store.get('gacha.collection', {});
  let filter = 'all';

  function setTickets(n) {
    tickets = Math.max(0, n);
    store.set('gacha.tickets', tickets);
    renderControls();
  }

  function grant(amount, reason) {
    setTickets(tickets + amount);
    toast(`${reason} +${amount} summon ticket${amount > 1 ? 's' : ''}.`, { icon: 'fa-ticket', tone: 'gold', duration: 2600 });
  }

  // ── Rendering ────────────────────────────────────────────────────────────
  function card(character, { owned = true, count = 0, index = 0, fresh = false } = {}) {
    return h('article', {
      class: `gacha-card rarity-${character.rarity}${owned ? '' : ' is-locked'}${fresh ? ' is-fresh' : ''}`,
      style: { '--reveal-delay': `${index * 110}ms` },
      title: owned ? `${character.name} — “${character.line}”` : 'Not summoned yet',
    },
    h('div', { class: 'gacha-card-art' }, img({ src: character.image, alt: owned ? character.name : '', kind: 'character', position: 'top' })),
    h('span', { class: 'gacha-rarity', text: character.rarity }),
    count > 1 ? h('span', { class: 'gacha-count', text: `×${count}` }) : null,
    h('div', { class: 'gacha-card-copy' },
      h('strong', { text: owned ? character.name : '???' }),
      h('span', { text: owned ? character.series : character.rarity + ' · locked' })));
  }

  function renderControls() {
    ui.tickets.textContent = tickets;
    ui.one.disabled = tickets < 1;
    ui.ten.disabled = tickets < 10;
    const toSR = gacha.pity.SR - pullState.sinceSR;
    const toSSR = gacha.pity.SSR - pullState.sinceSSR;
    ui.pity.textContent = `SR+ guaranteed within ${toSR} · SSR guaranteed within ${toSSR} · ${pullState.total} total pulls`;
  }

  function renderBinder() {
    const owned = pool.filter((c) => collection[c.id]).length;
    ui.binderCount.textContent = `${owned} / ${pool.length} collected`;
    const order = { SSR: 0, SR: 1, R: 2 };
    const list = pool
      .filter((c) => filter === 'all' || c.rarity === filter)
      .slice()
      .sort((a, b) => order[a.rarity] - order[b.rarity]);
    mount(ui.binder, list.map((c) => card(c, { owned: !!collection[c.id], count: collection[c.id] || 0 })));
    ui.filters.forEach((btn) => btn.setAttribute('aria-pressed', String(btn.dataset.binderFilter === filter)));
  }

  function ssrCinematic(character) {
    stage.run('ssr', {
      className: 'fx-ssr',
      duration: 2200,
      render(overlay) {
        overlay.append(
          h('div', { class: 'fx-ssr-rays' }),
          h('div', { class: 'fx-ssr-card' },
            img({ src: character.image, alt: character.name, kind: 'character', position: 'top' }),
            h('strong', { text: 'SSR' }),
            h('span', { text: character.name })));
      },
    });
  }

  // ── Summoning ────────────────────────────────────────────────────────────
  function summon(count) {
    if (tickets < count) return;
    setTickets(tickets - count);
    const { results, state } = gacha.pullMany(pullState, count);
    pullState = state;
    store.set('gacha.state', pullState);

    const fresh = new Set();
    results.forEach(({ character }) => {
      if (!collection[character.id]) fresh.add(character.id);
      collection[character.id] = (collection[character.id] || 0) + 1;
    });
    store.set('gacha.collection', collection);

    mount(ui.results, results.map(({ character }, index) =>
      card(character, { index, fresh: fresh.has(character.id), count: collection[character.id] })));
    ui.results.classList.remove('is-revealing');
    void ui.results.offsetWidth;
    ui.results.classList.add('is-revealing');

    const best = results.find((r) => r.rarity === 'SSR') || results.find((r) => r.rarity === 'SR');
    if (best && best.rarity === 'SSR') {
      sfx.play('win');
      ssrCinematic(best.character);
      bus.emit('secret:found', { id: 'ssr' });
    } else {
      sfx.play(best ? 'achievement' : 'flip');
    }
    if (count === 1) {
      const { character } = results[0];
      toast(`“${character.line}”`, { title: `${character.rarity} · ${character.name}`, icon: 'fa-star', tone: character.rarity === 'R' ? 'cyan' : 'gold', duration: 3200 });
    }
    renderControls();
    renderBinder();
    bus.emit('summon:pulled', { count, results: results.map((r) => ({ id: r.character.id, rarity: r.rarity })) });
  }

  // ── Ticket economy ──────────────────────────────────────────────────────
  if (tickets === null) {
    tickets = 0;
    setTickets(WELCOME_TICKETS);
    store.set('gacha.lastDaily', today());
  } else if (store.get('gacha.lastDaily', null) !== today()) {
    store.set('gacha.lastDaily', today());
    setTimeout(() => grant(1, 'Daily login bonus:'), 1200);
  }

  bus.on('secret:unlocked', ({ name }) => grant(1, `Secret “${name}” found:`));
  bus.on('arcade:victory', () => {
    const log = store.get('gacha.arcadeLog', { date: today(), count: 0 });
    if (log.date !== today()) Object.assign(log, { date: today(), count: 0 });
    if (log.count >= ARCADE_DAILY_CAP) return;
    log.count += 1;
    store.set('gacha.arcadeLog', log);
    grant(1, 'Arcade victory:');
  });

  // ── Wiring ───────────────────────────────────────────────────────────────
  mount(ui.art, pool.filter((c) => c.rarity === 'SSR').slice(0, 3).map((c, i) =>
    h('div', { class: 'summon-art-card', style: { '--i': i } }, img({ src: c.image, alt: '', kind: 'character', position: 'top' }))));

  ui.one.addEventListener('click', () => summon(1));
  ui.ten.addEventListener('click', () => summon(10));
  ui.filters.forEach((btn) => btn.addEventListener('click', () => {
    filter = btn.dataset.binderFilter;
    renderBinder();
  }));

  mount(ui.results, h('p', { class: 'summon-empty' }, icon('fa-dungeon'), ' The gate is quiet. Spend a ticket and see who answers.'));
  renderControls();
  renderBinder();

  return { summon, grant, get tickets() { return tickets; }, get collection() { return Object.assign({}, collection); } };
});
