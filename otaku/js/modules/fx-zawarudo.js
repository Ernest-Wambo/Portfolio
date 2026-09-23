/**
 * ZA WARUDO — time stops. A shockwave inverts the page, everything freezes
 * (ghost included), five seconds tick by, then time resumes.
 * Trigger: type "zawarudo", or emit fx:zawarudo.
 */
Otaku.register('fx-zawarudo', ({ bus, sfx, input, stage }) => {
  const STOPPED_SECONDS = 5;
  const DURATION = 1200 + STOPPED_SECONDS * 1000 + 900;

  function stopTime() {
    const root = document.documentElement;
    const started = stage.run('zawarudo', {
      className: 'fx-zawarudo',
      duration: DURATION,
      freeze: true,
      render(overlay) {
        overlay.innerHTML = `
          <div class="fx-zawarudo-wave"></div>
          <div class="fx-zawarudo-text">
            <strong>ZA WARUDO!</strong>
            <span class="fx-zawarudo-sub">Toki wo tomare.</span>
            <span class="fx-zawarudo-count" aria-live="off"></span>
          </div>`;

        const sub = overlay.querySelector('.fx-zawarudo-sub');
        const count = overlay.querySelector('.fx-zawarudo-count');
        const timers = [];

        timers.push(setTimeout(() => root.classList.add('is-time-stopped'), 900));
        for (let s = 1; s <= STOPPED_SECONDS; s++) {
          timers.push(
            setTimeout(() => {
              count.textContent = `${s} ${s === 1 ? 'second has' : 'seconds have'} passed`;
              sfx.play('tick');
            }, 1200 + s * 1000 - 1000)
          );
        }
        timers.push(
          setTimeout(() => {
            sub.textContent = 'Soshite, toki wa ugoki dasu.';
            count.textContent = '';
            root.classList.remove('is-time-stopped');
          }, 1200 + STOPPED_SECONDS * 1000)
        );

        return () => {
          timers.forEach(clearTimeout);
          root.classList.remove('is-time-stopped');
        };
      },
    });
    if (!started) return;
    sfx.play('timestop');
    bus.emit('secret:found', { id: 'zawarudo' });
  }

  input.sequence('zawarudo', stopTime);
  bus.on('fx:zawarudo', stopTime);

  return { stopTime };
});
