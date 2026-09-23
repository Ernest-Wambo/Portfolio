/**
 * Gurren Lagann: Pierce the Heavens — view/controller over games/spiral-engine.js.
 * Strike (Space / Enter / DRILL button) while the needle is in the glowing
 * zone to drill up through seven layers. Reaching the Heavens triggers
 * GIGA DRILL BREAK.
 */
Otaku.register('game-spiral-drill', ({ bus, sfx, store, toast, stage, dom }) => {
  const root = document.querySelector('[data-game="spiral"]');
  if (!root || !window.OtakuSpiral) return;

  const { createSpiral, LAYERS } = window.OtakuSpiral;
  const game = createSpiral();
  const panel = root.closest('[role="tabpanel"]');
  const $ = (sel) => root.querySelector(sel);
  const ui = {
    layers: $('.spiral-layers'),
    drill: $('.spiral-drill'),
    layerName: $('[data-spiral-layer]'),
    line: $('[data-spiral-line]'),
    zone: $('.spiral-zone'),
    sweet: $('.spiral-sweet'),
    needle: $('.spiral-needle'),
    progress: $('[data-spiral-progress]'),
    score: $('[data-spiral-score]'),
    combo: $('[data-spiral-combo]'),
    spirit: $('[data-spiral-spirit]'),
    best: $('[data-spiral-best]'),
    drillBtn: $('[data-spiral-drill]'),
    startBtn: $('[data-spiral-start]'),
    gauge: $('.spiral-gauge'),
  };

  // Shaft: heavens at the top, Jeeha at the bottom.
  dom.mount(ui.layers, [...LAYERS].reverse().map((layer) =>
    dom.h('li', { class: 'spiral-layer', dataset: { layer: layer.id } }, dom.h('span', { text: layer.name }))));
  const layerEls = [...ui.layers.children].reverse();

  let last = 0;

  function renderStatic() {
    const s = game.state;
    ui.zone.style.left = `${(s.zoneCenter - s.zoneWidth / 2) * 100}%`;
    ui.zone.style.width = `${s.zoneWidth * 100}%`;
    ui.sweet.style.left = `${(s.zoneCenter - s.zoneWidth * 0.15) * 100}%`;
    ui.sweet.style.width = `${s.zoneWidth * 30}%`;
    ui.progress.style.width = `${Math.min(100, s.progress)}%`;
    ui.score.textContent = s.score.toLocaleString('en-US');
    ui.combo.textContent = `x${s.combo}`;
    ui.spirit.innerHTML = s.spirit > 0 ? '<i class="fa-solid fa-fire" aria-hidden="true"></i>'.repeat(s.spirit) : '—';
    ui.spirit.setAttribute('aria-label', `${s.spirit} fighting spirit`);
    ui.best.textContent = Math.max(store.get('spiral.best', 0), s.score).toLocaleString('en-US');
    ui.layerName.textContent = LAYERS[s.layer].name;
    layerEls.forEach((el, i) => {
      el.classList.toggle('is-current', i === s.layer);
      el.classList.toggle('is-cleared', i < s.layer || s.phase === 'won');
    });
    const height = ((s.layer + Math.min(s.progress, 100) / 100) / LAYERS.length) * 100;
    ui.drill.style.bottom = `calc(${s.phase === 'won' ? 100 : height}% - 1rem)`;
    ui.drillBtn.disabled = s.phase !== 'playing';
  }

  function flashGauge(cls) {
    ui.gauge.classList.remove('is-perfect', 'is-good', 'is-miss');
    void ui.gauge.offsetWidth;
    ui.gauge.classList.add(cls);
  }

  function gigaDrillBreak() {
    stage.run('giga-drill', {
      className: 'fx-giga-drill',
      duration: 2600,
      render(overlay) {
        overlay.innerHTML = '<div class="fx-giga-spiral"></div><strong class="fx-giga-text">GIGA DRILL BREAK!!!</strong>';
      },
    });
  }

  function handleEvents() {
    game.drainEvents().forEach((ev) => {
      switch (ev.type) {
        case 'perfect': flashGauge('is-perfect'); sfx.play('merge', { level: 6 + Math.min(ev.combo, 6) }); break;
        case 'good': flashGauge('is-good'); sfx.play('merge', { level: 3 }); break;
        case 'miss': flashGauge('is-miss'); sfx.play('miss'); ui.line.textContent = 'The drill slipped. Fighting spirit fading…'; break;
        case 'kamina':
          ui.line.textContent = 'Kamina: "Believe in the you that believes in yourself!" (one more chance)';
          sfx.play('aura');
          toast('Kamina believes in you. One more spirit.', { icon: 'fa-glasses', tone: 'red', duration: 3000 });
          break;
        case 'layer':
          ui.line.textContent = ev.line;
          if (ev.layer > 0) {
            sfx.play('win');
            toast(`Drilled through to ${ev.name}.`, { icon: 'fa-hurricane', tone: 'red', duration: 2000 });
          }
          break;
        case 'won': finish(true); break;
        case 'lost': finish(false); break;
        default: break;
      }
    });
  }

  function finish(won) {
    const s = game.state;
    const record = store.recordMax('spiral.best', s.score);
    store.recordMax('spiral.bestLayer', s.layer);
    ui.startBtn.hidden = false;
    ui.startBtn.innerHTML = '<i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Drill again';
    if (won) {
      ui.line.textContent = `You pierced the Heavens. Score ${s.score.toLocaleString('en-US')}${record ? ' — new record' : ''}.`;
      gigaDrillBreak();
      sfx.play('aura');
      bus.emit('secret:found', { id: 'heavens' });
      bus.emit('arcade:victory', { game: 'spiral' });
    } else {
      sfx.play('lose');
      ui.line.textContent = `The drill stopped at ${LAYERS[s.layer].name}. Score ${s.score.toLocaleString('en-US')}${record ? ' — new record' : ''}.`;
    }
    renderStatic();
  }

  function strike() {
    if (game.state.phase !== 'playing') return;
    game.strike();
    handleEvents();
    renderStatic();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = last ? (now - last) / 1000 : 0;
    last = now;
    if (game.state.phase !== 'playing' || document.hidden || (panel && panel.hidden)) return;
    game.tick(dt);
    ui.needle.style.left = `${game.state.needle * 100}%`;
  }

  root.addEventListener('keydown', (event) => {
    if (event.key === ' ' || event.key === 'Enter') {
      if (event.target.closest('[data-spiral-start]') && game.state.phase !== 'playing') return;
      event.preventDefault();
      strike();
    }
  });
  ui.drillBtn.addEventListener('click', strike);
  ui.startBtn.addEventListener('click', () => {
    game.start();
    ui.startBtn.hidden = true;
    handleEvents();
    renderStatic();
    ui.drillBtn.focus({ preventScroll: true });
  });

  renderStatic();
  requestAnimationFrame(frame);

  return { get state() { return game.state; }, strike, gigaDrillBreak };
});
