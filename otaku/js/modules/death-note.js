/**
 * Death Note — write the name of anything visible on this page; forty
 * seconds later it dies of a heart attack (or the cause you chose).
 *
 * Targets: every element tagged [data-deathnote="Name"] by the renderers,
 * plus every titled dossier card. The dead come back on reload, or when
 * their page is torn out of the notebook.
 */
Otaku.register('death-note', ({ bus, sfx, toast, dom }) => {
  const root = document.getElementById('death-note');
  if (!root) return;

  const DELAY_MS = 40000;
  const form = root.querySelector('[data-dn-form]');
  const nameInput = root.querySelector('#dn-name');
  const causeInput = root.querySelector('#dn-cause');
  const response = root.querySelector('[data-dn-response]');
  const entriesEl = root.querySelector('[data-dn-entries]');

  const norm = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');

  // Names the notebook refuses, with the reason.
  const IMMUNE = [
    [['light', 'lightyagami', 'kira'], 'Kira cannot be judged by his own notebook.'],
    [['l', 'llawliet', 'ryuzaki'], 'L already suspected you would try that. Nothing happens… for now.'],
    [['ryuk'], 'Shinigami cannot be killed by a Death Note. Ryuk laughs: “Hyuk hyuk.”'],
    [['algebra', 'blackpanther', 'lumentx', 'erwx'], 'The dossier owner has the Shinigami Eyes. Your name is visible to him now.'],
    [['beingx', 'god'], 'Being X is not human. Tanya is deeply disappointed in the notebook.'],
    [['deathnote'], 'The notebook cannot write its own name. Rule XIV, probably.'],
    [['ghost', 'dossierghost'], 'The ghost is already dead. It is honestly thriving.'],
  ].map(([names, reply]) => ({ names: names.map(norm), reply }));

  const entries = [];

  function targets() {
    const map = new Map();
    const add = (name, el) => {
      const key = norm(name);
      if (!key) return;
      if (!map.has(key)) map.set(key, { name, els: [] });
      map.get(key).els.push(el);
    };
    document.querySelectorAll('[data-deathnote]').forEach((el) => {
      if (!el.closest('#death-note')) add(el.dataset.deathnote, el);
    });
    document.querySelectorAll('.otaku-card[id]').forEach((card) => {
      const title = card.querySelector('.otaku-header h3');
      if (title && card.id !== 'death-note') add(title.textContent.trim(), card);
    });
    return map;
  }

  function reply(text, tone = '') {
    response.textContent = text;
    response.className = `dn-response${tone ? ` dn-response--${tone}` : ''}`;
  }

  function kill(entry) {
    entry.dead = true;
    entry.els.forEach((el) => {
      el.classList.add('is-dn-dying');
      setTimeout(() => {
        el.classList.remove('is-dn-dying');
        el.classList.add('is-dn-dead');
        const stone = dom.h('span', { class: 'dn-tombstone', 'aria-hidden': 'true' }, dom.icon('fa-cross'), ` ${entry.cause}`);
        el.appendChild(stone);
        entry.stones.push(stone);
      }, 1200);
    });
    sfx.play('crack');
    toast(`${entry.name} died of ${entry.cause.toLowerCase()}.`, { title: 'Death Note', icon: 'fa-book-skull', tone: 'red' });
    bus.emit('secret:found', { id: 'deathnote' });
    bus.emit('deathnote:died', { name: entry.name });
    renderEntries();
  }

  function revive(entry) {
    clearTimeout(entry.timer);
    entry.els.forEach((el) => el.classList.remove('is-dn-dying', 'is-dn-dead'));
    entry.stones.forEach((stone) => stone.remove());
    entries.splice(entries.indexOf(entry), 1);
    sfx.play('pop');
    reply(entry.dead ? `Page torn out. ${entry.name} gasps back to life.` : `Page torn out. ${entry.name} will never know.`);
    renderEntries();
  }

  function renderEntries() {
    dom.mount(entriesEl, entries.map((entry) => {
      const left = Math.max(0, Math.ceil((entry.at - Date.now()) / 1000));
      return dom.h('li', { class: `dn-entry${entry.dead ? ' is-dead' : ''}` },
        dom.h('span', { class: 'dn-entry-name', text: entry.name }),
        dom.h('span', { class: 'dn-entry-status', text: entry.dead ? `✝ ${entry.cause}` : `${entry.cause} in ${left}s` }),
        dom.h('button', { type: 'button', class: 'dn-tear', 'aria-label': `Tear out ${entry.name}`, title: 'Tear out this page', onClick: () => revive(entry) },
          dom.icon('fa-xmark')));
    }));
  }

  function write(rawName, cause = 'Heart attack', { delay = DELAY_MS } = {}) {
    const key = norm(rawName);
    if (!key) return reply('The notebook needs a name.');

    const immune = IMMUNE.find((rule) => rule.names.includes(key));
    if (immune) {
      sfx.play('miss');
      return reply(immune.reply, 'warn');
    }

    const target = targets().get(key);
    if (!target) {
      sfx.play('miss');
      return reply('No face, no death. Rule II: the name must be visible somewhere on this page.', 'warn');
    }
    if (entries.some((e) => norm(e.name) === key)) return reply(`${target.name} is already written down. Patience.`);

    const entry = { name: target.name, cause, els: target.els, at: Date.now() + delay, dead: false, stones: [] };
    entry.timer = setTimeout(() => kill(entry), delay);
    entries.push(entry);
    sfx.play('type');
    reply(`${target.name}. ${cause}. Forty seconds. Just as planned.`, 'ok');
    renderEntries();
    return entry;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    write(nameInput.value, causeInput.value);
    nameInput.value = '';
  });

  setInterval(() => {
    if (entries.some((e) => !e.dead)) renderEntries();
  }, 1000);

  return { write, get entries() { return entries.slice(); } };
});
