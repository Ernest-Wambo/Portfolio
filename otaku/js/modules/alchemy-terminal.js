/**
 * Amestris State Alchemy Terminal — a tiny retro CLI.
 *
 * Commands are declared in COMMANDS (name → { usage, about, run, hidden }).
 * `run(args, io)` prints through io.print / io.table and may be async.
 * Some hidden commands forward to page-wide effects over the bus.
 */
Otaku.register('alchemy-terminal', ({ bus, sfx }) => {
  const root = document.querySelector('[data-terminal]');
  if (!root) return;

  const log = root.querySelector('.terminal-log');
  const form = root.querySelector('form');
  const field = root.querySelector('input');

  // Mass fractions of the human body and playful "commodity-grade" USD/kg
  // prices. Chemistry roughly right; the market is pure fiction.
  const ELEMENTS = [
    { symbol: 'O', name: 'Oxygen', fraction: 0.65, price: 0.3 },
    { symbol: 'C', name: 'Carbon', fraction: 0.185, price: 0.15 },
    { symbol: 'H', name: 'Hydrogen', fraction: 0.095, price: 1.5 },
    { symbol: 'N', name: 'Nitrogen', fraction: 0.032, price: 0.2 },
    { symbol: 'Ca', name: 'Calcium', fraction: 0.015, price: 2.5 },
    { symbol: 'P', name: 'Phosphorus', fraction: 0.01, price: 3 },
    { symbol: 'K', name: 'Potassium', fraction: 0.004, price: 12 },
    { symbol: 'S', name: 'Sulfur', fraction: 0.003, price: 0.2 },
    { symbol: 'Na', name: 'Sodium', fraction: 0.002, price: 3 },
    { symbol: 'Cl', name: 'Chlorine', fraction: 0.002, price: 0.2 },
    { symbol: 'Mg', name: 'Magnesium', fraction: 0.001, price: 3 },
    { symbol: '··', name: 'Trace (Fe, F, Zn, Si…)', fraction: 0.001, price: 20 },
  ];

  const history = [];
  let historyIndex = 0;
  let busy = false;
  let codex = { found: 0, total: 0 };

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // ── Output ─────────────────────────────────────────────────────────────
  const io = {
    print(text = '', tone) {
      const line = document.createElement('div');
      line.className = `terminal-line${tone ? ` terminal-line--${tone}` : ''}`;
      line.textContent = text;
      log.appendChild(line);
      log.scrollTop = log.scrollHeight;
      return line;
    },
    table(rows) {
      const widths = rows[0].map((_, i) => Math.max(...rows.map((r) => String(r[i]).length)));
      rows.forEach((row, index) => {
        const text = row.map((cell, i) => (i === 0 ? String(cell).padEnd(widths[i]) : String(cell).padStart(widths[i]))).join('   ');
        io.print(text, index === 0 ? 'dim' : undefined);
      });
    },
  };

  const money = (n) => `$${n.toFixed(2)}`;

  // ── Commands ───────────────────────────────────────────────────────────
  const COMMANDS = {
    help: {
      about: 'List the available commands',
      run() {
        io.print('Available commands:', 'accent');
        Object.entries(COMMANDS)
          .filter(([, cmd]) => !cmd.hidden)
          .forEach(([name, cmd]) => io.print(`  ${(cmd.usage || name).padEnd(16)} ${cmd.about}`));
        io.print('Some words are older than this terminal. Speak one and see what answers.', 'dim');
      },
    },

    analyze: {
      usage: 'analyze <kg>',
      about: 'Break a body of <kg> down to raw elements and price it',
      run([kgArg]) {
        const kg = Number(String(kgArg || '').replace(',', '.'));
        if (!Number.isFinite(kg) || kg < 20 || kg > 300) {
          io.print('Equivalent exchange requires a plausible mass. Try: analyze 70', 'error');
          return;
        }
        let total = 0;
        const rows = [['ELEMENT', 'MASS', 'VALUE']];
        ELEMENTS.forEach((el) => {
          const mass = kg * el.fraction;
          const value = mass * el.price;
          total += value;
          rows.push([`${el.symbol.padEnd(3)}${el.name}`, `${mass.toFixed(mass < 1 ? 3 : 2)} kg`, money(value)]);
        });
        io.table(rows);
        io.print('');
        io.print(`Estimated raw-element value: ${money(total)}.`, 'accent');
        io.print('Soul not included. No market for it exists, and none ever should.', 'dim');
      },
    },

    formula: {
      about: "Recite Edward Elric's human-body formula",
      run() {
        [
          'Water 35 L · Carbon 20 kg · Ammonia 4 L · Lime 1.5 kg',
          'Phosphorus 800 g · Salt 250 g · Saltpeter 100 g · Sulfur 80 g',
          'Fluorine 7.5 g · Iron 5 g · Silicon 3 g · + 15 trace elements',
        ].forEach((line) => io.print(line));
        io.print('A child could buy it all with pocket change. And yet — something is always missing.', 'dim');
      },
    },

    transmute: {
      about: 'Attempt the forbidden transmutation',
      async run() {
        io.print('Drawing transmutation circle…', 'accent');
        const bar = io.print('[                    ]');
        for (let i = 1; i <= 20; i++) {
          await wait(70);
          bar.textContent = `[${'▓'.repeat(i)}${' '.repeat(20 - i)}]`;
          sfx.play('type');
        }
        await wait(250);
        io.print('The Gate opens. Something on the other side is smiling.', 'error');
        await wait(700);
        sfx.play('crack');
        root.classList.add('is-rebounding');
        setTimeout(() => root.classList.remove('is-rebounding'), 700);
        io.print('REBOUND. Toll collected: one (1) left leg, one (1) right arm.', 'error');
        io.print('Equivalent exchange rejected. Human transmutation is forbidden.', 'dim');
        bus.emit('secret:found', { id: 'transmute' });
      },
    },

    whoami: {
      about: 'Identify the current operator',
      run() {
        io.print('Algebra | BlackPanther | Lumen_Tx', 'accent');
        io.print('Clearance: villain-coded · Doctrine: sub only · Status: locked in');
      },
    },

    secrets: {
      about: 'Check how much of the codex you have uncovered',
      run() {
        io.print(`Codex progress: ${codex.found} / ${codex.total} secrets.`, 'accent');
        io.print(codex.found === codex.total && codex.total ? 'Nothing left to hide. Impressive.' : 'Keep digging. The ghost knows more than it says.', 'dim');
      },
    },

    op: {
      about: 'Replay the dossier opening sequence',
      run() {
        io.print('Rolling the OP…', 'accent');
        bus.emit('fx:opening');
      },
    },

    clear: {
      about: 'Wipe the terminal',
      run() {
        log.innerHTML = '';
      },
    },

    // Hidden: forward to page-wide effects.
    geass: { hidden: true, run: () => { io.print('The command is absolute.', 'error'); bus.emit('fx:geass'); } },
    jujutsu: { hidden: true, run: () => { io.print('Domain Expansion…', 'accent'); bus.emit('fx:domain'); } },
    zawarudo: { hidden: true, run: () => { io.print('Toki wo tomare.', 'accent'); bus.emit('fx:zawarudo'); } },
    konami: { hidden: true, run: () => io.print('Nice try. Real Saiyans use the arrow keys.', 'dim') },
    sudo: { hidden: true, run: () => io.print('Nice try. The Truth does not accept root access.', 'error') },
  };
  COMMANDS.weigh = Object.assign({}, COMMANDS.analyze, { hidden: true });

  async function execute(raw) {
    const input = raw.trim();
    io.print(`alchemist@amestris:~$ ${input}`, 'prompt');
    if (!input) return;

    history.push(input);
    historyIndex = history.length;

    const [name, ...args] = input.split(/\s+/);
    const command = COMMANDS[name.toLowerCase()];
    if (!command) {
      io.print(`${name}: command not found. Equivalent exchange demands valid input — try "help".`, 'error');
      sfx.play('miss');
      return;
    }

    busy = true;
    field.disabled = true;
    try {
      await command.run(args, io);
    } finally {
      busy = false;
      field.disabled = false;
      field.focus({ preventScroll: true });
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (busy) return;
    const value = field.value;
    field.value = '';
    execute(value);
  });

  field.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowUp' && history.length) {
      event.preventDefault();
      historyIndex = Math.max(0, historyIndex - 1);
      field.value = history[historyIndex];
    } else if (event.key === 'ArrowDown' && history.length) {
      event.preventDefault();
      historyIndex = Math.min(history.length, historyIndex + 1);
      field.value = history[historyIndex] || '';
    } else if (event.key.length === 1) {
      sfx.play('type');
    }
  });

  log.addEventListener('click', () => field.focus({ preventScroll: true }));
  bus.on('codex:changed', (state) => (codex = state));

  io.print('Amestris State Alchemy Terminal v1.0', 'accent');
  io.print('Type "help" to list commands. Try "analyze 70".', 'dim');

  return { execute };
});
