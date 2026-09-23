/**
 * Opening Sequence — an anime-OP style cold open on the first visit
 * (title card → alias slams → cast strip → credits → final title).
 * Skippable with Esc, a click or any key. Watching it to the end unlocks
 * a secret. Replay: the "▶ OP" pill in the header, or `op` in the terminal.
 */
Otaku.register('fx-opening', ({ bus, sfx, store, stage, data, dom, motion }) => {
  const DURATION = 10200;
  const CAST = ['lelouch', 'tanya', 'edward-elric', 'madara', 'vegeta', 'kamina'];

  const characters = data.get('characters');
  const speeches = data.get('speeches');
  const portraitOf = (id) => {
    const speech = speeches.find((s) => s.id === id);
    const character = characters.find((c) => c.id === id);
    return (speech && speech.portrait) || (character && character.image) || [];
  };
  const nameOf = (id) => {
    const character = characters.find((c) => c.id === id);
    return character ? character.name : id;
  };

  function play({ auto = false } = {}) {
    const started = stage.run('opening', {
      className: 'fx-opening',
      duration: motion.reduced ? 3500 : DURATION,
      render(overlay) {
        const { h, img } = dom;
        const timers = [];
        const at = (ms, fn) => timers.push(setTimeout(fn, ms));
        const show = (cls) => overlay.classList.add(cls);

        overlay.append(
          h('div', { class: 'op-flash' }),
          h('div', { class: 'op-cut op-cut--logo' },
            h('span', { class: 'op-kicker', text: 'OP 01' }),
            h('strong', { text: 'OTAKU ZONE' }),
            h('em', { text: 'the villain dossier' })),
          h('div', { class: 'op-cut op-cut--alias' },
            h('span', { class: 'op-alias op-alias--1', text: 'ALGEBRA' }),
            h('span', { class: 'op-alias op-alias--2', text: 'BLACKPANTHER' }),
            h('span', { class: 'op-alias op-alias--3', text: 'LUMEN_TX' })),
          h('div', { class: 'op-cut op-cut--cast' },
            h('div', { class: 'op-speedlines' }),
            h('div', { class: 'op-cast' }, CAST.map((id, i) =>
              h('figure', { class: 'op-cast-card', style: { '--i': i } },
                img({ src: portraitOf(id), alt: '', kind: 'character', loading: 'eager', position: 'top' }),
                h('figcaption', { text: nameOf(id) }))))),
          h('div', { class: 'op-cut op-cut--credits' },
            h('p', null, h('small', { text: 'Directed by' }), h('strong', { text: 'Er_Wx' })),
            h('p', null, h('small', { text: 'Subtitles' }), h('strong', { text: 'VOSTFR only' })),
            h('p', null, h('small', { text: 'Soundtrack' }), h('strong', { text: 'The Immersion Deck' }))),
          h('div', { class: 'op-cut op-cut--title' },
            h('strong', { text: 'THE VILLAIN DOSSIER' }),
            h('span', { text: 'press anything to enter' })),
          h('button', { type: 'button', class: 'op-skip', text: 'Skip ▸▸' }));

        const flash = () => {
          overlay.classList.remove('op-beat');
          void overlay.offsetWidth;
          overlay.classList.add('op-beat');
          sfx.play('tick');
        };

        if (motion.reduced) {
          show('op-show-title');
        } else {
          show('op-show-logo');
          [300, 900, 1500].forEach((ms) => at(ms, flash));
          at(1900, () => { show('op-show-alias'); flash(); });
          at(2350, flash);
          at(2800, flash);
          at(3700, () => { show('op-show-cast'); flash(); sfx.play('aura'); });
          [4200, 4700, 5200, 5700].forEach((ms) => at(ms, flash));
          at(6400, () => { show('op-show-credits'); flash(); });
          at(8200, () => { show('op-show-title'); flash(); sfx.play('geass'); });
          at(DURATION - 300, () => bus.emit('secret:found', { id: 'opening' }));
        }

        const skip = (event) => {
          if (event.type === 'keydown' && event.key === 'Tab') return;
          stage.stop();
        };
        at(400, () => document.addEventListener('keydown', skip));

        return () => {
          timers.forEach(clearTimeout);
          document.removeEventListener('keydown', skip);
          store.set('op.seen', true);
        };
      },
    });
    if (!started && !auto) setTimeout(() => play(), 800);
  }

  document.querySelectorAll('[data-replay-op]').forEach((btn) => btn.addEventListener('click', () => play()));
  bus.on('fx:opening', () => play());
  bus.on('app:ready', () => {
    if (!store.get('op.seen', false)) setTimeout(() => play({ auto: true }), 350);
  });

  return { play };
});
