/**
 * Command dock — fixed control surface (top-right) + keyboard shortcuts
 * + the shortcut help dialog.
 *
 * Letter shortcuts deliberately avoid every letter used by the secret words
 * (geass, jujutsu, zawarudo, konami's b/a), so typing a secret never
 * toggles a control by accident.
 */
Otaku.register('command-dock', ({ bus, sfx, input, toast }) => {
  const dock = document.getElementById('command-dock');
  const dialog = document.getElementById('help-dialog');
  if (!dock) return;

  const sfxBtn = dock.querySelector('[data-dock="sfx"]');
  const scouterBtn = dock.querySelector('[data-dock="scouter"]');
  const helpBtn = dock.querySelector('[data-dock="help"]');

  function renderSfx(enabled) {
    sfxBtn.setAttribute('aria-pressed', String(enabled));
    const icon = sfxBtn.querySelector('i');
    icon.className = `fa-solid ${enabled ? 'fa-volume-high' : 'fa-volume-xmark'}`;
  }

  function toggleSfx() {
    const on = sfx.toggle();
    sfx.play('achievement');
    toast(on ? 'Forbidden chakra unleashed. Every button now has a voice.' : 'Chakra sealed. Silence restored.', {
      icon: on ? 'fa-volume-high' : 'fa-volume-xmark',
      tone: on ? 'violet' : 'cyan',
      duration: 2600,
    });
  }

  function jumpTo(id) {
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const focusable = target.querySelector('[tabindex], button, input');
    if (focusable) setTimeout(() => focusable.focus({ preventScroll: true }), 450);
  }

  function openHelp() {
    if (!dialog) return;
    const list = dialog.querySelector('[data-shortcut-list]');
    list.innerHTML = '';
    input.describe().forEach(({ key, description }) => {
      const row = document.createElement('li');
      const kbd = document.createElement('kbd');
      kbd.textContent = key.length === 1 ? key.toUpperCase() : key;
      const label = document.createElement('span');
      label.textContent = description;
      row.append(kbd, label);
      list.appendChild(row);
    });
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  sfxBtn.addEventListener('click', toggleSfx);
  scouterBtn.addEventListener('click', () => bus.emit('scouter:toggle'));
  helpBtn.addEventListener('click', openHelp);

  if (dialog) {
    dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
  }

  bus.on('sfx:toggled', ({ enabled }) => renderSfx(enabled));
  bus.on('scouter:toggled', ({ enabled }) => scouterBtn.setAttribute('aria-pressed', String(enabled)));
  renderSfx(sfx.enabled);

  input.shortcut('m', toggleSfx, 'Unleash / seal Forbidden Chakra (sound effects)');
  input.shortcut('k', () => bus.emit('scouter:toggle'), 'Equip / remove the Scouter (hover anything with a power level)');
  input.shortcut('p', () => jumpTo('otaku-arcade'), 'Jump to the Arcade');
  input.shortcut('c', () => jumpTo('secret-codex'), 'Jump to the Secret Codex');
  input.shortcut('?', openHelp, 'Show this list');

  // Every button and link gets a voice while chakra is unleashed.
  // Widgets with their own sound design opt out via [data-sfx-silent].
  document.addEventListener('click', (event) => {
    const el = event.target.closest && event.target.closest('button, a, [role="button"]');
    if (!el || el.closest('[data-sfx-silent]') || el.closest('#command-dock')) return;
    sfx.play('blip');
  });

  return { openHelp, toggleSfx };
});
