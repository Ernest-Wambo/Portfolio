/**
 * Secret Codex — the achievement registry.
 *
 * Any module unlocks a secret with:  bus.emit('secret:found', { id })
 * The codex persists progress, renders the locked/unlocked grid, toasts new
 * discoveries and broadcasts codex:changed { found, total } for others
 * (e.g. the alchemy terminal's `secrets` command).
 *
 * New unlocks also emit secret:unlocked { id, name } (the Summon Gate pays a ticket).
 * To add a secret: append it to js/data/secrets.js and emit its id from your module.
 */
Otaku.register('secret-codex', ({ bus, store, sfx, toast, data }) => {
  const SECRETS = data.get("secrets");

  const root = document.getElementById('secret-codex');
  const list = root && root.querySelector('[data-codex-list]');
  const countEl = root && root.querySelector('[data-codex-count]');
  const bar = root && root.querySelector('[data-codex-bar]');
  const resetBtn = root && root.querySelector('[data-codex-reset]');

  let found = store.get('codex.found', {});

  const foundCount = () => SECRETS.filter((s) => found[s.id]).length;

  function broadcast() {
    const count = foundCount();
    document.documentElement.classList.toggle('codex-complete', count === SECRETS.length);
    bus.emit('codex:changed', { found: count, total: SECRETS.length });
  }

  function render() {
    if (!list) return;
    const count = foundCount();
    countEl.textContent = `${count} / ${SECRETS.length} found`;
    bar.style.width = `${(count / SECRETS.length) * 100}%`;
    bar.parentElement.setAttribute('aria-valuenow', String(count));
    bar.parentElement.setAttribute('aria-valuemax', String(SECRETS.length));

    list.innerHTML = '';
    SECRETS.forEach((secret, index) => {
      const unlocked = !!found[secret.id];
      const item = document.createElement('li');
      item.className = `codex-item codex-item--${secret.tone}${unlocked ? ' is-unlocked' : ''}`;

      const icon = document.createElement('span');
      icon.className = 'codex-icon';
      icon.innerHTML = `<i class="fa-solid ${unlocked ? secret.icon : 'fa-lock'}" aria-hidden="true"></i>`;

      const copy = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = unlocked ? secret.name : `Secret #${index + 1}`;
      const text = document.createElement('span');
      text.textContent = unlocked ? secret.how : secret.hint;
      copy.append(title, text);

      item.append(icon, copy);
      list.appendChild(item);
    });
  }

  function unlock(id) {
    const secret = SECRETS.find((s) => s.id === id);
    if (!secret || found[id]) return;

    found = Object.assign({}, found, { [id]: Date.now() });
    store.set('codex.found', found);
    bus.emit('secret:unlocked', { id, name: secret.name });
    sfx.play('achievement');
    toast(secret.name, { title: 'Secret unlocked', icon: secret.icon, tone: secret.tone });
    render();
    broadcast();

    if (foundCount() === SECRETS.length) {
      setTimeout(() => {
        toast('Every secret in the dossier is yours. Villain arc complete.', {
          title: 'Codex complete',
          icon: 'fa-chess-king',
          tone: 'gold',
          duration: 6000,
        });
      }, 900);
    }
  }

  let armed = null;
  if (resetBtn) {
    const idleLabel = resetBtn.innerHTML;
    resetBtn.addEventListener('click', () => {
      if (!armed) {
        resetBtn.textContent = 'Click again to erase every secret';
        resetBtn.classList.add('is-armed');
        armed = setTimeout(() => {
          armed = null;
          resetBtn.innerHTML = idleLabel;
          resetBtn.classList.remove('is-armed');
        }, 3000);
        return;
      }
      clearTimeout(armed);
      armed = null;
      found = {};
      store.set('codex.found', found);
      resetBtn.innerHTML = idleLabel;
      resetBtn.classList.remove('is-armed');
      render();
      broadcast();
      toast('Codex memory wiped. The secrets are hidden again.', { icon: 'fa-eraser', tone: 'cyan' });
    });
  }

  bus.on('secret:found', ({ id }) => unlock(id));
  bus.on('app:ready', broadcast);
  render();

  return {
    get secrets() {
      return SECRETS.map(({ id, name }) => ({ id, name, found: !!found[id] }));
    },
    unlock,
  };
});
