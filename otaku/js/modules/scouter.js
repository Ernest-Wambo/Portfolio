/**
 * Scouter — Saiyan power-level HUD.
 *
 * Equip with K or the dock button, then hover (or tap) anything marked:
 *   data-power-level="1240000"   numeric reading, or "over9000" for Vegeta
 *   data-power-name="Lelouch"    optional; defaults to the element's heading
 *   data-power-class="Strategist" optional class readout
 *
 * Reading Vegeta overloads the lens: it cracks, the page shakes, and the
 * "over9000" secret is logged.
 */
Otaku.register('scouter', ({ bus, sfx, toast }) => {
  const OFFSET = 18;
  const READ_MS = 900;
  const OVERLOAD_MS = 1600;

  let enabled = false;
  let target = null;
  let readTimer = null;
  let rebooting = false;

  const hud = document.createElement('div');
  hud.className = 'scouter-hud';
  hud.setAttribute('aria-hidden', 'true');
  hud.innerHTML = `
    <div class="scouter-lens">
      <div class="scouter-scan"></div>
      <span class="scouter-label">Target</span>
      <strong class="scouter-name">—</strong>
      <span class="scouter-class"></span>
      <span class="scouter-label">Power level</span>
      <strong class="scouter-value">0</strong>
      <svg class="scouter-crack" viewBox="0 0 200 140" preserveAspectRatio="none">
        <path d="M120 0 L108 38 L126 52 L96 88 L112 104 L90 140" />
        <path d="M108 38 L70 30 L40 46" />
        <path d="M96 88 L150 96 L200 84" />
        <path d="M126 52 L170 40" />
        <path d="M112 104 L60 118 L0 112" />
      </svg>
    </div>`;
  document.body.appendChild(hud);

  const nameEl = hud.querySelector('.scouter-name');
  const classEl = hud.querySelector('.scouter-class');
  const valueEl = hud.querySelector('.scouter-value');

  const fmt = (n) => Math.round(n).toLocaleString('en-US');

  function readName(el) {
    if (el.dataset.powerName) return el.dataset.powerName;
    const heading = el.querySelector('h1, h2, h3, h4, h5, strong');
    return heading ? heading.textContent.trim() : 'Unknown entity';
  }

  function place(x, y) {
    const rect = hud.getBoundingClientRect();
    let left = x + OFFSET;
    let top = y + OFFSET;
    if (left + rect.width > window.innerWidth - 8) left = x - rect.width - OFFSET;
    if (top + rect.height > window.innerHeight - 8) top = y - rect.height - OFFSET;
    hud.style.transform = `translate(${Math.max(8, left)}px, ${Math.max(8, top)}px)`;
  }

  function stopReading() {
    clearInterval(readTimer);
    readTimer = null;
  }

  function hide() {
    stopReading();
    target = null;
    if (!rebooting) hud.classList.remove('is-visible');
  }

  function overload() {
    rebooting = true;
    valueEl.textContent = "IT'S OVER 9000!!!";
    hud.classList.add('is-overloaded');
    document.documentElement.classList.add('is-shaking');
    sfx.play('crack');
    bus.emit('secret:found', { id: 'over9000' });

    setTimeout(() => document.documentElement.classList.remove('is-shaking'), 600);
    setTimeout(() => {
      hud.classList.remove('is-overloaded', 'is-visible');
      rebooting = false;
      if (enabled) toast('Scouter rebooted. Try not to read the Prince again.', { icon: 'fa-glasses', tone: 'green', duration: 2600 });
    }, OVERLOAD_MS);
  }

  function read(el) {
    stopReading();
    target = el;
    const raw = el.dataset.powerLevel;
    const isVegeta = raw === 'over9000';
    const goal = isVegeta ? 9001 : Number(raw) || 0;

    nameEl.textContent = readName(el);
    classEl.textContent = el.dataset.powerClass ? `Class: ${el.dataset.powerClass}` : '';
    valueEl.textContent = 'BEEP…';
    hud.classList.add('is-visible');

    const start = performance.now();
    let lastBeep = 0;
    readTimer = setInterval(() => {
      const now = performance.now();
      const t = Math.min(1, (now - start) / READ_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      valueEl.textContent = fmt(goal * eased);

      if (now - lastBeep > 140) {
        sfx.play('beep');
        lastBeep = now;
      }
      if (t >= 1) {
        stopReading();
        if (isVegeta) overload();
      }
    }, 40);
  }

  function setEnabled(value) {
    enabled = value;
    document.documentElement.classList.toggle('scouter-on', enabled);
    if (!enabled) hide();
    sfx.play(enabled ? 'beep' : 'blip');
    bus.emit('scouter:toggled', { enabled });
    toast(enabled ? 'Scouter equipped. Hover anything that looks dangerous.' : 'Scouter removed.', {
      icon: 'fa-glasses',
      tone: 'green',
      duration: 2400,
    });
  }

  document.addEventListener('pointerover', (event) => {
    if (!enabled || rebooting) return;
    const el = event.target.closest && event.target.closest('[data-power-level]');
    if (el && el !== target) {
      read(el);
      place(event.clientX, event.clientY);
    }
  });

  document.addEventListener('pointerout', (event) => {
    if (!enabled || !target) return;
    const into = event.relatedTarget;
    if (!into || !target.contains(into)) {
      const next = into && into.closest && into.closest('[data-power-level]');
      if (!next) hide();
    }
  });

  document.addEventListener('pointermove', (event) => {
    if (enabled && hud.classList.contains('is-visible')) place(event.clientX, event.clientY);
  });

  bus.on('scouter:toggle', () => setEnabled(!enabled));

  return { get enabled() { return enabled; }, setEnabled };
});
