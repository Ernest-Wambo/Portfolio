/**
 * Super Saiyan awakening — the Konami code ignites a golden aura around
 * Prince Vegeta's speech. Entering it again powers him back down.
 * Trigger: ↑ ↑ ↓ ↓ ← → ← → B A, or emit fx:saiyan.
 */
Otaku.register('fx-super-saiyan', ({ bus, sfx, input, stage, toast }) => {
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  const SPARKS = 7;

  const vegeta = document.querySelector('[data-character="vegeta"]');
  if (!vegeta) return;

  function addSparks() {
    const layer = document.createElement('div');
    layer.className = 'ssj-sparks';
    layer.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < SPARKS; i++) {
      const spark = document.createElement('span');
      spark.className = 'ssj-spark';
      spark.style.left = `${8 + Math.random() * 84}%`;
      spark.style.top = `${6 + Math.random() * 80}%`;
      spark.style.animationDelay = `${(Math.random() * 1.6).toFixed(2)}s`;
      spark.style.setProperty('--rot', `${Math.round(Math.random() * 90 - 45)}deg`);
      layer.appendChild(spark);
    }
    vegeta.appendChild(layer);
  }

  function powerUp() {
    const ascended = vegeta.classList.toggle('is-super-saiyan');

    if (!ascended) {
      vegeta.querySelectorAll('.ssj-sparks').forEach((el) => el.remove());
      toast('Power level suppressed. The Prince rests.', { icon: 'fa-fire', tone: 'gold', duration: 2600 });
      return;
    }

    vegeta.scrollIntoView({ behavior: 'smooth', block: 'center' });
    addSparks();
    sfx.play('aura');
    stage.run('saiyan', {
      className: 'fx-saiyan',
      duration: 1300,
      render(overlay) {
        overlay.innerHTML = '<strong class="fx-saiyan-text">AAAAAAAAAAHHHH!!!</strong>';
      },
    });
    toast('Super Saiyan awakened. Pride fully restored.', { title: 'Konami code accepted', icon: 'fa-fire', tone: 'gold' });
    bus.emit('secret:found', { id: 'konami' });
  }

  input.sequence(KONAMI, powerUp);
  bus.on('fx:saiyan', powerUp);

  return { powerUp };
});
