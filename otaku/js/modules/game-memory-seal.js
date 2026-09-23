/**
 * Sharingan Memory Seal — pair-matching under genjutsu pressure.
 *
 * Every round opens with a "genjutsu preview": all cards face up for a
 * moment, then sealed. Higher tomoe levels mean more pairs, a shorter
 * preview and faster flip-backs. Consecutive matches stack a combo
 * multiplier; best clear times are kept per level.
 */
Otaku.register('game-memory-seal', ({ bus, sfx, store, toast }) => {
  const root = document.querySelector('[data-game="seal"]');
  if (!root) return;

  const LEVELS = {
    1: { pairs: 6, preview: 3000, flipBack: 750, label: '1 Tomoe' },
    2: { pairs: 8, preview: 2000, flipBack: 600, label: '2 Tomoe' },
    3: { pairs: 10, preview: 1200, flipBack: 450, label: 'Mangekyō' },
  };

  const FACES = [
    { id: 'sharingan', icon: 'fa-eye', label: 'Sharingan', color: '#ef4444' },
    { id: 'geass', icon: 'fa-crown', label: 'Geass', color: '#ff0844' },
    { id: 'saiyan', icon: 'fa-fire', label: 'Saiyan Pride', color: '#fbbf24' },
    { id: 'alchemy', icon: 'fa-atom', label: 'Alchemy', color: '#22d3ee' },
    { id: 'deathnote', icon: 'fa-book-skull', label: 'Death Note', color: '#e2e8f0' },
    { id: 'dragonball', icon: 'fa-star', label: 'Dragon Ball', color: '#fb923c' },
    { id: 'survey', icon: 'fa-shield-halved', label: 'Survey Corps', color: '#a3e635' },
    { id: 'tsukuyomi', icon: 'fa-moon', label: 'Tsukuyomi', color: '#a8c5da' },
    { id: 'chidori', icon: 'fa-bolt', label: 'Chidori', color: '#818cf8' },
    { id: 'ghost', icon: 'fa-ghost', label: 'Dossier Ghost', color: '#c4b5fd' },
  ];

  const grid = root.querySelector('[data-seal-grid]');
  const statusEl = root.querySelector('[data-seal-status]');
  const startBtn = root.querySelector('[data-seal-start]');
  const levelBtns = Array.from(root.querySelectorAll('[data-level]'));
  const hud = {
    time: root.querySelector('[data-seal-time]'),
    moves: root.querySelector('[data-seal-moves]'),
    combo: root.querySelector('[data-seal-combo]'),
    score: root.querySelector('[data-seal-score]'),
    best: root.querySelector('[data-seal-best]'),
  };

  let level = store.get('seal.level', 1);
  let cards = [];
  let open = [];
  let locked = true;
  let matched = 0;
  let moves = 0;
  let combo = 0;
  let score = 0;
  let startedAt = 0;
  let clock = null;
  let round = 0;

  const fmtTime = (ms) => `${(ms / 1000).toFixed(1)}s`;

  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function renderHud() {
    hud.moves.textContent = moves;
    hud.combo.textContent = `x${Math.max(1, combo)}`;
    hud.score.textContent = score.toLocaleString('en-US');
    const best = store.get(`seal.best.${level}`, null);
    hud.best.textContent = best ? fmtTime(best) : '—';
    if (!startedAt) hud.time.textContent = '0.0s';
  }

  function setLevel(next) {
    level = next;
    store.set('seal.level', level);
    levelBtns.forEach((btn) => btn.setAttribute('aria-checked', String(Number(btn.dataset.level) === level)));
    renderHud();
  }

  function flip(card, faceUp) {
    card.el.classList.toggle('is-flipped', faceUp);
    card.el.setAttribute('aria-label', faceUp || card.matched ? card.face.label : 'Sealed card');
  }

  function stopClock() {
    clearInterval(clock);
    clock = null;
  }

  function deal() {
    const cfg = LEVELS[level];
    const faces = shuffle(FACES).slice(0, cfg.pairs);
    const deck = shuffle([...faces, ...faces]);
    const thisRound = ++round;

    stopClock();
    grid.innerHTML = '';
    grid.dataset.level = String(level);
    open = [];
    matched = 0;
    moves = 0;
    combo = 0;
    score = 0;
    startedAt = 0;
    locked = true;

    cards = deck.map((face, index) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'seal-card is-flipped';
      el.style.setProperty('--seal-color', face.color);
      el.style.setProperty('--deal-delay', `${index * 25}ms`);
      el.innerHTML = `
        <span class="seal-card-inner">
          <span class="seal-face seal-face--back" aria-hidden="true"><span lang="ja">封</span></span>
          <span class="seal-face seal-face--front" aria-hidden="true">
            <i class="fa-solid ${face.icon}"></i><small></small>
          </span>
        </span>`;
      el.querySelector('small').textContent = face.label;
      el.setAttribute('aria-label', face.label);
      const card = { el, face, matched: false };
      el.addEventListener('click', () => choose(card));
      grid.appendChild(el);
      return card;
    });

    statusEl.textContent = `Genjutsu preview — memorize the seals (${fmtTime(cfg.preview)}).`;
    renderHud();

    setTimeout(() => {
      if (thisRound !== round) return;
      cards.forEach((card) => flip(card, false));
      sfx.play('flip');
      locked = false;
      statusEl.textContent = 'Sealed. Find every pair.';
    }, cfg.preview);
  }

  function choose(card) {
    if (locked || card.matched || open.includes(card)) return;

    if (!startedAt) {
      startedAt = performance.now();
      clock = setInterval(() => (hud.time.textContent = fmtTime(performance.now() - startedAt)), 100);
    }

    flip(card, true);
    sfx.play('flip');
    open.push(card);
    if (open.length < 2) return;

    moves += 1;
    const [a, b] = open;
    open = [];

    if (a.face.id === b.face.id) {
      a.matched = b.matched = true;
      a.el.classList.add('is-matched');
      b.el.classList.add('is-matched');
      combo += 1;
      score += 100 * combo;
      matched += 1;
      sfx.play('match');
      statusEl.textContent = combo > 1 ? `${a.face.label}! Combo x${combo}.` : `${a.face.label} sealed.`;
      if (matched === LEVELS[level].pairs) finish();
    } else {
      combo = 0;
      locked = true;
      sfx.play('miss');
      a.el.classList.add('is-miss');
      b.el.classList.add('is-miss');
      statusEl.textContent = 'Genjutsu broke your focus.';
      const thisRound = round;
      setTimeout(() => {
        if (thisRound !== round) return;
        [a, b].forEach((card) => {
          card.el.classList.remove('is-miss');
          flip(card, false);
        });
        locked = false;
      }, LEVELS[level].flipBack);
    }
    renderHud();
  }

  function finish() {
    const elapsed = performance.now() - startedAt;
    stopClock();
    startedAt = 0;
    locked = true;
    hud.time.textContent = fmtTime(elapsed);

    const record = store.recordMin(`seal.best.${level}`, elapsed);
    sfx.play('win');
    statusEl.textContent = `Seal broken in ${fmtTime(elapsed)} and ${moves} moves.${record ? ' New record.' : ''}`;
    toast(`${LEVELS[level].label} cleared in ${fmtTime(elapsed)}.${record ? ' New record!' : ''}`, {
      title: 'Sharingan Memory Seal',
      icon: 'fa-eye',
      tone: 'red',
    });
    renderHud();
    hud.time.textContent = fmtTime(elapsed);
    bus.emit('secret:found', { id: 'sharingan' });
    bus.emit('arcade:victory', { game: 'seal', level });
    bus.emit('stats:changed', { key: 'seal' });
  }

  levelBtns.forEach((btn) =>
    btn.addEventListener('click', () => {
      setLevel(Number(btn.dataset.level));
      sfx.play('blip');
    })
  );
  startBtn.addEventListener('click', () => {
    startBtn.innerHTML = '<i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Re-seal';
    deal();
  });

  setLevel(LEVELS[level] ? level : 1);
  return { deal, setLevel };
});
