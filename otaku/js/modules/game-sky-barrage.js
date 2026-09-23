/**
 * Tanya: Sky Barrage — canvas view/controller over games/sky-barrage-engine.js.
 *
 * Controls: arrows / WASD (canvas focused) or steer with the mouse / finger.
 * Space or E fires the Elinium Type 95 overdrive when the gauge is full.
 * Esc pauses. The loop only runs while the cabinet is visible.
 */
Otaku.register('game-sky-barrage', ({ bus, sfx, store, toast, motion }) => {
  const root = document.querySelector('[data-game="sky"]');
  if (!root || !window.OtakuSkyBarrage) return;

  const { createSkyBarrage, WIDTH: W, HEIGHT: H } = window.OtakuSkyBarrage;
  const canvas = root.querySelector('.sky-canvas');
  const ctx = canvas.getContext('2d');
  const overlay = root.querySelector('.sky-overlay');
  const caption = root.querySelector('.sky-caption');
  const panel = root.closest('[role="tabpanel"]');
  const ui = {
    score: root.querySelector('[data-sky-score]'),
    best: root.querySelector('[data-sky-best]'),
    wave: root.querySelector('[data-sky-wave]'),
    lives: root.querySelector('[data-sky-lives]'),
    gauge: root.querySelector('[data-sky-gauge]'),
    special: root.querySelector('[data-sky-special]'),
  };

  const LINES = {
    start: 'Major Tanya Degurechaff, 203rd Aerial Mage Battalion. Engaging.',
    wave: (n) => `Wave ${n}. Salaryman efficiency, people.`,
    overdrive: 'Deus lo vult… (she hated every syllable of that)',
    hit: 'Tch. That is going to be paperwork.',
    boss: 'Being X. You again.',
    won: 'I will never pray to you. Mission complete.',
    lost: 'Being X is laughing somewhere. Again, Major.',
  };

  const sprite = (src) => { const img = new Image(); img.src = src; return img; };
  const art = {
    tanya: sprite('assets/otaku/characters/tanya.png'),
    beingX: sprite('assets/otaku/characters/being-x.png'),
  };

  const game = createSkyBarrage({ waves: 5 });
  const keys = new Set();
  let pointer = null;
  let specialQueued = false;
  let paused = false;
  let last = 0;
  let scroll = 0;
  let particles = [];
  let captionTimer = null;

  // ── Canvas sizing (logical 800×450, crisp on HiDPI) ─────────────────────
  function resize() {
    const cssW = canvas.clientWidth || W;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round((cssW * H) / W * dpr);
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    draw();
  }

  // ── Drawing ──────────────────────────────────────────────────────────────
  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#0b1026');
    sky.addColorStop(0.55, '#3b1d4a');
    sky.addColorStop(0.85, '#c2410c');
    sky.addColorStop(1, '#451a03');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(253, 186, 116, 0.25)';
    ctx.beginPath();
    ctx.arc(640, 330, 70, 0, Math.PI * 2);
    ctx.fill();

    // Smoke columns (far layer)
    ctx.fillStyle = 'rgba(15, 10, 20, 0.45)';
    for (let i = 0; i < 6; i++) {
      const x = ((i * 170 - scroll * 0.25) % (W + 170) + W + 170) % (W + 170) - 85;
      ctx.beginPath();
      ctx.moveTo(x - 14, H - 40);
      ctx.quadraticCurveTo(x - 30, H - 170, x + 10, H - 260);
      ctx.quadraticCurveTo(x + 40, H - 170, x + 16, H - 40);
      ctx.fill();
    }

    // Clouds (mid layer)
    ctx.fillStyle = 'rgba(203, 213, 225, 0.08)';
    for (let i = 0; i < 5; i++) {
      const x = ((i * 230 - scroll * 0.6) % (W + 230) + W + 230) % (W + 230) - 115;
      const y = 60 + (i % 3) * 70;
      ctx.beginPath();
      ctx.ellipse(x, y, 90, 18, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 50, y - 10, 60, 16, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Trench line + barbed wire (near layer)
    ctx.fillStyle = '#12090a';
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 40) {
      const off = ((x + scroll * 1.2) % 80) / 80;
      ctx.lineTo(x, H - 28 - Math.sin(off * Math.PI * 2) * 6);
    }
    ctx.lineTo(W, H);
    ctx.fill();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -20; x <= W + 20; x += 12) {
      const px = x - (scroll * 1.2) % 12;
      ctx.lineTo(px, H - 40 + (Math.floor((x + scroll * 1.2) / 12) % 2 ? -4 : 4));
    }
    ctx.stroke();
  }

  function drawPortrait(img, x, y, r, ring, glow) {
    ctx.save();
    ctx.shadowColor = glow;
    ctx.shadowBlur = 18;
    ctx.fillStyle = ring;
    ctx.beginPath();
    ctx.arc(x, y, r + 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    if (img.complete && img.naturalWidth) {
      const s = (r * 2) / Math.min(img.naturalWidth, img.naturalHeight);
      ctx.drawImage(img, x - (img.naturalWidth * s) / 2, y - r, img.naturalWidth * s, img.naturalHeight * s);
    } else {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.restore();
  }

  function drawEnemy(e) {
    ctx.save();
    ctx.translate(e.x, e.y);
    if (e.type === 'scout') {
      ctx.fillStyle = '#60a5fa';
      ctx.beginPath();
      ctx.moveTo(-e.r, 0);
      ctx.lineTo(e.r, -e.r * 0.7);
      ctx.lineTo(e.r * 0.5, 0);
      ctx.lineTo(e.r, e.r * 0.7);
      ctx.fill();
    } else if (e.type === 'mage') {
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#1d4ed8';
      ctx.beginPath();
      ctx.moveTo(-e.r, e.r);
      ctx.lineTo(0, -e.r * 0.4);
      ctx.lineTo(e.r, e.r);
      ctx.fill();
      ctx.fillStyle = '#fecaca';
      ctx.beginPath();
      ctx.arc(0, -e.r * 0.7, e.r * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, e.r + 4, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#334155';
      ctx.fillRect(-e.r, -e.r * 0.7, e.r * 2, e.r * 1.4);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-e.r - 14, -3, 16, 6);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-e.r + 4, -e.r * 0.7 + 4, 6, 6);
    }
    ctx.restore();
  }

  function drawBoss(b) {
    const s = game.state;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(s.time * 0.6);
    ctx.strokeStyle = b.enraged ? 'rgba(248, 113, 113, 0.6)' : 'rgba(253, 224, 71, 0.55)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 12; i++) {
      ctx.rotate(Math.PI / 6);
      ctx.beginPath();
      ctx.moveTo(b.r + 8, 0);
      ctx.lineTo(b.r + 26 + Math.sin(s.time * 4 + i) * 6, 0);
      ctx.stroke();
    }
    ctx.restore();
    drawPortrait(art.beingX, b.x, b.y, b.r, b.enraged ? '#f87171' : '#fde047', '#fbbf24');

    // HP bar
    const w = 360;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(W / 2 - w / 2, 14, w, 10);
    ctx.fillStyle = b.enraged ? '#ef4444' : '#fbbf24';
    ctx.fillRect(W / 2 - w / 2, 14, (w * b.hp) / b.maxHp, 10);
    ctx.fillStyle = '#fef3c7';
    ctx.font = '600 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BEING X — "THE CREATOR"', W / 2, 38);
  }

  function draw() {
    const s = game.state;
    drawBackground();

    particles.forEach((pt) => {
      ctx.globalAlpha = Math.max(0, pt.life);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    s.enemies.forEach(drawEnemy);
    if (s.boss && s.boss.hp > 0) drawBoss(s.boss);

    ctx.fillStyle = '#fb923c';
    ctx.shadowColor = '#f97316';
    ctx.shadowBlur = 8;
    s.enemyShots.forEach((b) => {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.strokeStyle = '#67e8f9';
    ctx.shadowColor = '#22d3ee';
    ctx.lineWidth = 3;
    s.shots.forEach((b) => {
      ctx.beginPath();
      ctx.moveTo(b.x - 12, b.y - (b.vy || 0) * 0.02);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    });
    ctx.shadowBlur = 0;

    const p = s.player;
    const blink = p.inv > 0 && Math.floor(s.time * 12) % 2 === 0;
    if (!blink && s.phase !== 'lost') {
      if (s.overdrive > 0) {
        ctx.strokeStyle = 'rgba(253, 224, 71, 0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + 10 + Math.sin(s.time * 20) * 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      drawPortrait(art.tanya, p.x, p.y, p.r + 4, s.overdrive > 0 ? '#fde047' : '#38bdf8', '#38bdf8');
    }
  }

  // ── HUD & events ─────────────────────────────────────────────────────────
  function say(text) {
    caption.textContent = text;
    caption.classList.add('is-visible');
    clearTimeout(captionTimer);
    captionTimer = setTimeout(() => caption.classList.remove('is-visible'), 2800);
  }

  function burst(x, y, color, count = 14) {
    if (motion.reduced) return;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 40 + Math.random() * 160;
      particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 1.5 + Math.random() * 2.5, life: 1, color });
    }
  }

  function renderHud() {
    const s = game.state;
    ui.score.textContent = s.score.toLocaleString('en-US');
    ui.best.textContent = Math.max(store.get('sky.best', 0), s.score).toLocaleString('en-US');
    ui.wave.textContent = s.phase === 'boss' || (s.boss && s.phase === 'won') ? 'Being X' : `${s.wave || 0} / ${s.waves}`;
    ui.lives.textContent = s.lives > 0 ? '♥'.repeat(s.lives) : '—';
    ui.gauge.style.width = `${s.elinium}%`;
    ui.gauge.parentElement.classList.toggle('is-full', s.elinium >= 100);
    ui.special.disabled = s.elinium < 100 || !(s.phase === 'playing' || s.phase === 'boss');
  }

  function showOverlay(title, text, label) {
    overlay.hidden = false;
    overlay.querySelector('strong').textContent = title;
    overlay.querySelector('p').textContent = text;
    overlay.querySelector('button').innerHTML = `<i class="fa-solid fa-plane-up" aria-hidden="true"></i> ${label}`;
  }

  function handleEvents() {
    game.drainEvents().forEach((ev) => {
      switch (ev.type) {
        case 'start': say(LINES.start); break;
        case 'wave': if (ev.wave > 1) say(LINES.wave(ev.wave)); sfx.play('beep'); break;
        case 'kill': burst(ev.x, ev.y, ev.type === 'artillery' ? '#fbbf24' : '#f87171'); sfx.play('pop'); break;
        case 'hit': say(LINES.hit); sfx.play('miss'); document.documentElement.classList.add('is-shaking');
          setTimeout(() => document.documentElement.classList.remove('is-shaking'), 400); break;
        case 'overdrive': say(LINES.overdrive); sfx.play('aura'); burst(game.state.player.x, game.state.player.y, '#fde047', 40); break;
        case 'boss': say(`${LINES.boss} — "${ev.line}"`); sfx.play('geass'); break;
        case 'taunt': say(`Being X: "${ev.line}"`); break;
        case 'won': finish(true); burst(ev.x, ev.y, '#fde047', 80); break;
        case 'lost': finish(false); break;
        default: break;
      }
    });
  }

  function finish(won) {
    const s = game.state;
    const record = store.recordMax('sky.best', s.score);
    if (won) {
      sfx.play('win');
      say(LINES.won);
      showOverlay('Being X defeated', `Score ${s.score.toLocaleString('en-US')}${record ? ' — new record' : ''}. The Rhine is quiet. For now.`, 'Fly again');
      toast('Being X has been refused. Loudly.', { title: 'Sky Barrage cleared', icon: 'fa-crosshairs', tone: 'gold' });
      bus.emit('secret:found', { id: 'being-x' });
      bus.emit('arcade:victory', { game: 'sky' });
    } else {
      sfx.play('lose');
      say(LINES.lost);
      showOverlay('Shot down', `Score ${s.score.toLocaleString('en-US')}${record ? ' — new record' : ''}. Wave ${s.wave}.`, 'Retry sortie');
    }
    renderHud();
  }

  // ── Loop ─────────────────────────────────────────────────────────────────
  const visible = () => !document.hidden && !(panel && panel.hidden);

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    if (!visible()) return;

    const active = game.state.phase === 'playing' || game.state.phase === 'boss';
    if (active && !paused) {
      const input = {
        dx: (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0),
        dy: (keys.has('down') ? 1 : 0) - (keys.has('up') ? 1 : 0),
        target: keys.size ? null : pointer,
        special: specialQueued,
      };
      specialQueued = false;
      game.update(dt, input);
      handleEvents();
      renderHud();
    }
    if (!paused) {
      scroll += dt * (active ? 90 : 25);
      particles.forEach((pt) => { pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.life -= dt * 1.4; });
      particles = particles.filter((pt) => pt.life > 0);
    }
    draw();
  }

  // ── Input ────────────────────────────────────────────────────────────────
  const KEYMAP = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };

  canvas.addEventListener('keydown', (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (KEYMAP[key]) {
      event.preventDefault();
      keys.add(KEYMAP[key]);
    } else if (key === ' ' || key === 'e') {
      event.preventDefault();
      specialQueued = true;
    } else if (key === 'Escape') {
      paused = !paused;
      say(paused ? 'Paused. Press Esc to resume.' : 'Resuming sortie.');
    }
  });
  canvas.addEventListener('keyup', (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (KEYMAP[key]) keys.delete(KEYMAP[key]);
  });
  canvas.addEventListener('blur', () => keys.clear());

  const toLogical = (event) => {
    const rect = canvas.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) / rect.width) * W, y: ((event.clientY - rect.top) / rect.height) * H };
  };
  canvas.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'mouse' || event.buttons) pointer = toLogical(event);
  });
  canvas.addEventListener('pointerdown', (event) => {
    canvas.focus({ preventScroll: true });
    pointer = toLogical(event);
  });
  canvas.addEventListener('pointerleave', () => (pointer = null));

  ui.special.addEventListener('click', () => {
    specialQueued = true;
    canvas.focus({ preventScroll: true });
  });

  overlay.querySelector('button').addEventListener('click', () => {
    overlay.hidden = true;
    particles = [];
    paused = false;
    game.start();
    renderHud();
    canvas.focus({ preventScroll: true });
  });

  if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
  else window.addEventListener('resize', resize);

  resize();
  renderHud();
  requestAnimationFrame(frame);

  return {
    get state() { return game.state; },
    start: () => overlay.querySelector('button').click(),
    skipToBoss: () => game.skipToBoss(),
  };
});
