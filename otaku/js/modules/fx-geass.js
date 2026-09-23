/**
 * Geass command — Lelouch's sigil burns across the screen and every card
 * on the page briefly bows to the Emperor.
 * Trigger: type "geass", or emit fx:geass.
 */
Otaku.register('fx-geass', ({ bus, sfx, input, stage }) => {
  const DURATION = 3000;
  const COMMAND = 'Lelouch vi Britannia commands you';

  const SIGIL = `
    <svg class="fx-geass-sigil" viewBox="0 0 200 130" aria-hidden="true">
      <path d="M100 74 C86 44 56 28 8 22 C44 40 62 54 72 74 C55 68 38 68 20 74
               C48 79 72 90 100 116 C128 90 152 79 180 74 C162 68 145 68 128 74
               C138 54 156 40 192 22 C144 28 114 44 100 74 Z" />
    </svg>`;

  function command() {
    const started = stage.run('geass', {
      className: 'fx-geass',
      duration: DURATION,
      render(overlay) {
        overlay.innerHTML = `
          ${SIGIL}
          <div class="fx-geass-text">
            <span class="fx-geass-line"></span>
            <strong>OBEY.</strong>
          </div>`;

        const line = overlay.querySelector('.fx-geass-line');
        let i = 0;
        const typer = setInterval(() => {
          line.textContent = COMMAND.slice(0, ++i);
          if (i % 2 === 0) sfx.play('type');
          if (i >= COMMAND.length) clearInterval(typer);
        }, 38);

        const cards = document.querySelectorAll('.otaku-card');
        cards.forEach((card, idx) => {
          card.style.setProperty('--bow-delay', `${idx * 60}ms`);
          card.classList.add('is-commanded');
        });

        return () => {
          clearInterval(typer);
          cards.forEach((card) => card.classList.remove('is-commanded'));
        };
      },
    });
    if (!started) return;
    sfx.play('geass');
    bus.emit('secret:found', { id: 'geass' });
  }

  input.sequence('geass', command);
  bus.on('fx:geass', command);

  return { command };
});
