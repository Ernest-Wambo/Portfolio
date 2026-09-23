/**
 * Faction Skins — swaps the page's design tokens (css/otaku-skins.css) by
 * setting html[data-skin]. Picker lives in the command dock; F cycles skins.
 */
Otaku.register('faction-skins', ({ store, sfx, toast, input, data, dom }) => {
  const skins = data.get('skins');
  const button = document.querySelector('[data-dock="skin"]');
  const menu = document.getElementById('skin-menu');
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (!button || !menu) return;

  let current = store.get('skin', 'lunar');
  if (!skins.some((s) => s.id === current)) current = 'lunar';

  function apply(id, { announce = false } = {}) {
    const skin = skins.find((s) => s.id === id) || skins[0];
    current = skin.id;
    if (skin.id === 'lunar') delete document.documentElement.dataset.skin;
    else document.documentElement.dataset.skin = skin.id;
    if (themeMeta) themeMeta.setAttribute('content', skin.theme);
    store.set('skin', skin.id);
    menu.querySelectorAll('[role="menuitemradio"]').forEach((item) =>
      item.setAttribute('aria-checked', String(item.dataset.skin === skin.id)));
    if (announce) {
      sfx.play('aura');
      toast(skin.note, { title: `Faction: ${skin.name}`, icon: skin.icon, tone: 'violet', duration: 2200 });
    }
  }

  function open(value) {
    menu.hidden = !value;
    button.setAttribute('aria-expanded', String(value));
    if (value) {
      const checked = menu.querySelector('[aria-checked="true"]') || menu.querySelector('[role="menuitemradio"]');
      if (checked) checked.focus();
    }
  }

  dom.mount(menu, skins.map((skin) =>
    dom.h('button', { type: 'button', role: 'menuitemradio', class: 'skin-option', dataset: { skin: skin.id }, 'aria-checked': 'false' },
      dom.h('span', { class: 'skin-swatch', 'aria-hidden': 'true' }, skin.swatch.map((c) => dom.h('i', { style: { background: c } }))),
      dom.h('span', { class: 'skin-copy' }, dom.h('strong', { text: skin.name }), dom.h('small', { text: skin.note })))));

  menu.addEventListener('click', (event) => {
    const option = event.target.closest('[data-skin]');
    if (!option) return;
    apply(option.dataset.skin, { announce: true });
    open(false);
    button.focus();
  });
  menu.addEventListener('keydown', (event) => {
    const items = [...menu.querySelectorAll('[role="menuitemradio"]')];
    const i = items.indexOf(document.activeElement);
    if (event.key === 'ArrowDown') { event.preventDefault(); items[(i + 1) % items.length].focus(); }
    if (event.key === 'ArrowUp') { event.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
    if (event.key === 'Escape') { open(false); button.focus(); }
  });
  button.addEventListener('click', () => open(menu.hidden));
  document.addEventListener('click', (event) => {
    if (!menu.hidden && !menu.contains(event.target) && !button.contains(event.target)) open(false);
  });

  input.shortcut('f', () => {
    const i = skins.findIndex((s) => s.id === current);
    apply(skins[(i + 1) % skins.length].id, { announce: true });
  }, 'Cycle faction skins');

  apply(current);
  return { apply, get current() { return current; } };
});
