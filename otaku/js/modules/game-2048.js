/**
 * 2048: Evolution of Power — view/controller over the pure engine
 * (games/g2048-engine.js). Tiles show the shinobi rank emblem + title from
 * js/data/ranks.js instead of numbers. Keyboard (arrows / WASD while the board has
 * focus), swipe, three Izanagi undos per game, rank-up toasts, and the game
 * auto-saves so a refresh never costs a run.
 */
Otaku.register('game-2048', ({ bus, sfx, store, toast, data, dom }) => {
  const root = document.querySelector('[data-game="2048"]');
  if (!root || !window.OtakuG2048) return;

  const { ladder: RANKS, beyond: TRANSCENDENT } = data.get('ranks');
  const WIN_VALUE = 2048;
  const SECRET_VALUE = 256;
  const IZANAGI_PER_GAME = 3;
  const SLIDE_MS = 120;
  const SWIPE_MIN = 24;
  const KEYS = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right',
  };

  const rankFor = (value) => RANKS.find((r) => r.value === value) || TRANSCENDENT;
  const levelOf = (value) => Math.round(Math.log2(value));

  const board = root.querySelector('.g2048-board');
  const cellsLayer = root.querySelector('.g2048-cells');
  const tilesLayer = root.querySelector('.g2048-tiles');
  const message = root.querySelector('.g2048-message');
  const scoreEl = root.querySelector('[data-2048-score]');
  const bestEl = root.querySelector('[data-2048-best]');
  const rankEl = root.querySelector('[data-2048-rank]');
  const izanagiBtn = root.querySelector('[data-2048-undo]');
  const izanagiCount = root.querySelector('[data-2048-izanagi]');
  const ladder = root.querySelector('.g2048-ladder');

  const engine = window.OtakuG2048.createEngine({ size: 4 });
  const elements = new Map();

  let izanagi = IZANAGI_PER_GAME;
  let history = null;
  let won = false;
  let keepPlaying = false;
  let over = false;
  let peak = 0;
  let animating = false;

  for (let i = 0; i < engine.size * engine.size; i++) {
    const cell = document.createElement('div');
    cell.className = 'g2048-cell';
    cellsLayer.appendChild(cell);
  }

  // ── Persistence ────────────────────────────────────────────────────────
  function save() {
    store.set('2048.state', Object.assign(engine.serialize(), { izanagi, won, keepPlaying, over }));
  }

  function restoreSaved() {
    const saved = store.get('2048.state', null);
    if (!saved || saved.over || !engine.load(saved)) return false;
    izanagi = Number.isInteger(saved.izanagi) ? saved.izanagi : IZANAGI_PER_GAME;
    won = !!saved.won;
    // A run saved right after winning resumes in "keep going" mode.
    keepPlaying = !!saved.keepPlaying || won;
    return true;
  }

  // ── Rendering ──────────────────────────────────────────────────────────
  function tileElement(tile) {
    let el = elements.get(tile.id);
    if (!el) {
      el = document.createElement('div');
      el.className = 'g2048-tile';
      el.innerHTML = '<div class="g2048-tile-inner"><span class="g2048-art"></span><span class="g2048-rank"></span></div>';
      elements.set(tile.id, el);
      tilesLayer.appendChild(el);
    }
    return el;
  }

  function paintTile(el, tile) {
    el.style.setProperty('--r', tile.r);
    el.style.setProperty('--c', tile.c);
    if (el.dataset.value !== String(tile.value)) {
      const rank = rankFor(tile.value);
      el.dataset.value = String(tile.value);
      el.className = `g2048-tile g2048-tile--lv${Math.min(levelOf(tile.value), 12)}`;
      el.querySelector('.g2048-rank').textContent = rank.short;
      dom.mount(el.querySelector('.g2048-art'), dom.img({ src: rank.image, alt: '', kind: 'character', loading: 'eager' }));
      el.setAttribute('title', `${rank.name} (${tile.value})`);
    }
  }

  function flash(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  function render({ merged = [], consumed = [], spawned = null } = {}) {
    const live = new Set(engine.tiles.map((t) => t.id));

    consumed.forEach((tile) => {
      const el = elements.get(tile.id);
      if (!el) return;
      el.classList.add('is-consumed');
      el.style.setProperty('--r', tile.r);
      el.style.setProperty('--c', tile.c);
      elements.delete(tile.id);
      setTimeout(() => el.remove(), SLIDE_MS);
    });

    elements.forEach((el, id) => {
      if (!live.has(id)) {
        el.remove();
        elements.delete(id);
      }
    });

    engine.tiles.forEach((tile) => {
      const isNew = !elements.has(tile.id);
      const el = tileElement(tile);
      paintTile(el, tile);
      if (isNew || (spawned && tile.id === spawned.id)) flash(el, 'is-new');
    });

    merged.forEach((tile) => {
      const el = elements.get(tile.id);
      if (el) setTimeout(() => flash(el, 'is-merged'), SLIDE_MS * 0.6);
    });

    renderHud();
  }

  function renderHud() {
    const max = engine.maxValue();
    scoreEl.textContent = engine.score.toLocaleString('en-US');
    bestEl.textContent = Math.max(store.get('2048.best', 0), engine.score).toLocaleString('en-US');
    rankEl.textContent = max ? rankFor(max).name : '—';
    izanagiCount.textContent = izanagi;
    izanagiBtn.disabled = izanagi === 0 || !history;
    renderLadder();
  }

  function renderLadder() {
    const bestEver = store.get('2048.bestTile', 0);
    const current = engine.maxValue();
    ladder.innerHTML = '';
    RANKS.forEach((rank) => {
      const li = document.createElement('li');
      li.className = `g2048-ladder-step g2048-tile--lv${levelOf(rank.value)}`;
      if (rank.value <= bestEver) li.classList.add('is-reached');
      if (rank.value === current) li.classList.add('is-current');
      li.append(dom.img({ src: rank.image, alt: '', className: 'g2048-ladder-art' }), dom.h('strong', { text: rank.name }));
      ladder.appendChild(li);
    });
  }

  function showMessage(title, text, actions) {
    message.hidden = false;
    message.querySelector('strong').textContent = title;
    message.querySelector('p').textContent = text;
    const row = message.querySelector('.g2048-message-actions');
    row.innerHTML = '';
    actions.forEach(({ label, onClick, primary }) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `arcade-btn${primary ? ' arcade-btn--primary' : ''}`;
      btn.textContent = label;
      btn.addEventListener('click', onClick);
      row.appendChild(btn);
    });
    const first = row.querySelector('button');
    if (first) first.focus({ preventScroll: true });
  }

  function hideMessage() {
    message.hidden = true;
  }

  // ── Game flow ──────────────────────────────────────────────────────────
  function newGame() {
    engine.reset();
    izanagi = IZANAGI_PER_GAME;
    history = null;
    won = false;
    keepPlaying = false;
    over = false;
    peak = engine.maxValue();
    bestEl.classList.remove('is-record');
    hideMessage();
    render();
    save();
    board.focus({ preventScroll: true });
  }

  function checkMilestones() {
    const max = engine.maxValue();
    if (max > peak) {
      peak = max;
      if (max >= 8) {
        const rank = rankFor(max);
        toast(`Promoted to ${rank.name}.`, { icon: 'fa-angles-up', tone: max >= SECRET_VALUE ? 'gold' : 'cyan', duration: 2200 });
      }
    }
    if (store.recordMax('2048.bestTile', max)) renderLadder();
    if (max >= SECRET_VALUE) bus.emit('secret:found', { id: 'kage' });

    if (max >= WIN_VALUE && !won) {
      won = true;
      sfx.play('win');
      bus.emit('arcade:victory', { game: '2048' });
      showMessage('Ghost of the Uchiha', 'You reached 2048. The world is yours. Keep climbing?', [
        { label: 'Keep going', primary: true, onClick: () => { keepPlaying = true; hideMessage(); board.focus(); save(); } },
        { label: 'New game', onClick: newGame },
      ]);
    }
  }

  function checkGameOver() {
    if (engine.canMove()) return;
    over = true;
    sfx.play('lose');
    const actions = [{ label: 'Try again', primary: true, onClick: newGame }];
    if (izanagi > 0 && history) actions.push({ label: `Izanagi (${izanagi} left)`, onClick: undo });
    showMessage('Chakra exhausted', `Final score ${engine.score.toLocaleString('en-US')}. Even Madara lost sometimes.`, actions);
  }

  function move(dir) {
    if (animating || over || (won && !keepPlaying)) return;
    const before = engine.snapshot();
    const result = engine.move(dir);
    if (!result.moved) return;

    history = before;
    animating = true;
    setTimeout(() => (animating = false), SLIDE_MS * 0.8);

    if (result.merged.length) {
      const top = Math.max(...result.merged.map((t) => t.value));
      sfx.play('merge', { level: levelOf(top) });
    } else {
      sfx.play('slide');
    }

    render(result);
    if (store.recordMax('2048.best', engine.score)) bestEl.classList.add('is-record');
    checkMilestones();
    checkGameOver();
    save();
    bus.emit('stats:changed', { key: '2048' });
  }

  function undo() {
    if (izanagi === 0 || !history) return;
    engine.restore(history);
    history = null;
    izanagi -= 1;
    over = false;
    hideMessage();
    sfx.play('pop');
    toast(`Izanagi cast. Reality rewritten. ${izanagi} left this game.`, { icon: 'fa-clock-rotate-left', tone: 'red', duration: 2200 });
    render();
    save();
    board.focus({ preventScroll: true });
  }

  // ── Input ──────────────────────────────────────────────────────────────
  board.addEventListener('keydown', (event) => {
    const dir = KEYS[event.key.length === 1 ? event.key.toLowerCase() : event.key];
    if (!dir) return;
    event.preventDefault();
    move(dir);
  });

  let start = null;
  board.addEventListener('pointerdown', (event) => {
    if (event.target.closest('.g2048-message')) return;
    start = { x: event.clientX, y: event.clientY };
    board.focus({ preventScroll: true });
  });
  board.addEventListener('pointerup', (event) => {
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    start = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
  });
  board.addEventListener('pointercancel', () => (start = null));

  root.querySelector('[data-2048-new]').addEventListener('click', newGame);
  izanagiBtn.addEventListener('click', undo);

  // ── Boot ───────────────────────────────────────────────────────────────
  if (restoreSaved()) {
    peak = engine.maxValue();
    render();
  } else {
    engine.reset();
    peak = engine.maxValue();
    render();
    save();
  }

  return { newGame, move, undo, get score() { return engine.score; } };
});
