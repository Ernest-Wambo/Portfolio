/**
 * Arcade cabinet switcher — accessible tabs (roving tabindex, ←/→/Home/End)
 * that remember the last cabinet you played.
 */
Otaku.register('arcade-tabs', ({ store, sfx }) => {
  const tablist = document.querySelector('#otaku-arcade [role="tablist"]');
  if (!tablist) return;

  const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
  const panels = tabs.map((tab) => document.getElementById(tab.getAttribute('aria-controls')));

  function activate(index, { focus = false } = {}) {
    tabs.forEach((tab, i) => {
      const selected = i === index;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (panels[i]) panels[i].hidden = !selected;
    });
    if (focus) tabs[index].focus();
    store.set('arcade.tab', tabs[index].id);
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      activate(index);
      sfx.play('blip');
    });
  });

  tablist.addEventListener('keydown', (event) => {
    const current = tabs.indexOf(document.activeElement);
    if (current === -1) return;
    const last = tabs.length - 1;
    const next = {
      ArrowRight: current === last ? 0 : current + 1,
      ArrowLeft: current === 0 ? last : current - 1,
      Home: 0,
      End: last,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    activate(next, { focus: true });
  });

  const saved = tabs.findIndex((tab) => tab.id === store.get('arcade.tab', null));
  activate(saved >= 0 ? saved : 0);

  return { activate };
});
