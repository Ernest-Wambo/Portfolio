/**
 * End-to-end suite for the Otaku Zone — drives a real Chrome/Edge through
 * every feature and unlocks all codex secrets along the way.
 *
 *   npm run test:e2e              (CHROME_PATH=/path/to/chrome to override)
 *
 * Screenshots land in otaku/tests/e2e/artifacts/ (git-ignored).
 */
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer-core');

const ROOT = path.resolve(__dirname, '../../..');
const OTAKU_URL = pathToFileURL(path.join(ROOT, 'otaku.html')).href;
const INDEX_URL = pathToFileURL(path.join(ROOT, 'index.html')).href;
const ARTIFACTS = path.join(__dirname, 'artifacts');
fs.mkdirSync(ARTIFACTS, { recursive: true });

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);
const executablePath = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
if (!executablePath) {
  console.error('No Chrome/Edge found. Set CHROME_PATH.');
  process.exit(2);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (cond, label) => {
  console.log(`${cond ? '  ✔' : '  ✖'} ${label}`);
  if (!cond) failures++;
};
const section = (name) => console.log(`\n${name}`);

async function waitFor(page, fn, timeout = 20000, ...args) {
  try {
    await page.waitForFunction(fn, { timeout, polling: 100 }, ...args);
    return true;
  } catch {
    return false;
  }
}

(async () => {
  const browser = await puppeteer.launch({ executablePath, headless: 'new' });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/i.test(m.text())) errors.push(`console: ${m.text()}`);
  });
  await page.setViewport({ width: 1440, height: 900 });

  const $eval = (sel, fn) => page.$eval(sel, fn);
  const shot = async (name, sel) => {
    const file = path.join(ARTIFACTS, `${name}.png`);
    if (sel) await (await page.$(sel)).screenshot({ path: file });
    else await page.screenshot({ path: file });
  };
  const codexCount = () => page.evaluate(() => JSON.parse(localStorage.getItem('otaku:v1:codex.found') || '{}'));

  // ── Boot & opening ──────────────────────────────────────────────────────
  section('Boot & opening');
  await page.goto(OTAKU_URL, { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
  check(await waitFor(page, () => document.querySelector('.fx-opening')), 'opening plays on the first visit');
  await page.keyboard.press('Escape');
  await sleep(800);
  check(await page.evaluate(() => !document.querySelector('.fx-opening') && localStorage.getItem('otaku:v1:op.seen') === 'true'), 'Esc skips it and it is remembered');

  const missing = await page.evaluate(() => ['render-library', 'render-speeches', 'manhwa-tracker', 'spotify-deck', 'secret-codex',
    'command-dock', 'faction-skins', 'ghost-pet', 'scouter', 'fx-opening', 'fx-domain-expansion', 'fx-geass', 'fx-zawarudo',
    'fx-super-saiyan', 'death-note', 'tier-list', 'summon-gate', 'arcade-tabs', 'game-2048', 'game-memory-seal',
    'game-sky-barrage', 'game-spiral-drill', 'alchemy-terminal'].filter((n) => !window.Otaku.module(n)));
  check(missing.length === 0, `all 23 modules booted${missing.length ? ` (missing ${missing})` : ''}`);

  page.evaluate(() => window.Otaku.module('fx-opening').play());
  check(await waitFor(page, () => JSON.parse(localStorage.getItem('otaku:v1:codex.found') || '{}').opening, 14000), 'watching the whole OP unlocks "Cold Open"');
  await waitFor(page, () => !document.querySelector('.fx-opening'), 3000);

  // ── Data layer ──────────────────────────────────────────────────────────
  section('Data layer (SEG-09)');
  const counts = await page.evaluate(() => ({
    speeches: document.querySelectorAll('[data-render="speeches"] .speech-entry').length,
    topFive: document.querySelectorAll('[data-render="top-five"] .ranked-item').length,
    covers: document.querySelectorAll('[data-render="top-five-covers"] img').length,
    manhwa: document.querySelectorAll('[data-render="manhwa"] [data-manhwa]').length,
    tracks: document.querySelectorAll('#spotify-track-selector .track-button').length,
    brokenImages: [...document.querySelectorAll('main img')].filter((i) => i.complete && i.naturalWidth === 0 && !i.src.includes('archive-feed')).length,
  }));
  check(counts.speeches === 5 && counts.topFive === 5 && counts.covers === 5, 'speeches and Top Five render from data');
  check(counts.manhwa === 8 && counts.tracks === 6, 'manhwa shelf and deck render from data');
  check(counts.brokenImages === 0, `no broken images (${counts.brokenImages})`);

  // ── 2048 ────────────────────────────────────────────────────────────────
  section('2048: Evolution of Power');
  await page.evaluate(() => localStorage.setItem('otaku:v1:2048.state', JSON.stringify({
    grid: [[128, 128, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 2]], score: 1000, izanagi: 3, won: false, keepPlaying: false, over: false,
  })));
  await page.reload({ waitUntil: 'networkidle2' }).catch(() => {});
  check(await $eval('[data-2048-score]', (e) => e.textContent) === '1,000', 'a saved run is restored');
  check(await page.evaluate(() => !!document.querySelector('.g2048-tile img')) && !(await $eval('.g2048-tiles', (e) => /\b128\b/.test(e.textContent))), 'tiles show rank art + titles, not numbers');
  await page.focus('.g2048-board');
  await page.keyboard.press('ArrowLeft');
  await sleep(300);
  check(await page.$$eval('.g2048-tile', (t) => t.some((x) => x.dataset.value === '256' && x.textContent.includes('Kage'))), '128 + 128 evolves into Kage');
  await page.click('[data-2048-undo]');
  await sleep(200);
  check(await $eval('[data-2048-izanagi]', (e) => e.textContent) === '2', 'Izanagi rewinds a move');
  await shot('2048', '#otaku-arcade');

  // ── Memory Seal ─────────────────────────────────────────────────────────
  section('Sharingan Memory Seal');
  await page.click('#tab-seal');
  await page.click('[data-level="1"]');
  await page.click('[data-seal-start]');
  await sleep(3300);
  const labels = await page.$$eval('.seal-card', (c) => c.map((x) => x.querySelector('small').textContent));
  const cards = await page.$$('.seal-card');
  const first = {};
  const pairs = [];
  labels.forEach((l, i) => (first[l] === undefined ? (first[l] = i) : pairs.push([first[l], i])));
  for (const [a, b] of pairs) { await cards[a].click(); await sleep(50); await cards[b].click(); await sleep(100); }
  await sleep(300);
  check(/Seal broken/.test(await $eval('[data-seal-status]', (e) => e.textContent)), 'the seal can be broken');

  // ── Terminal ────────────────────────────────────────────────────────────
  section('Alchemy Terminal');
  await page.click('#tab-terminal');
  await page.type('#alchemy-input', 'analyze 70');
  await page.keyboard.press('Enter');
  await sleep(150);
  check(/Estimated raw-element value: \$\d+\.\d\d/.test(await $eval('.terminal-log', (e) => e.textContent)), 'analyze prices a body');
  await page.type('#alchemy-input', 'transmute');
  await page.keyboard.press('Enter');
  check(await waitFor(page, () => /REBOUND/.test(document.querySelector('.terminal-log').textContent), 5000), 'transmute rebounds');

  // ── Sky Barrage ─────────────────────────────────────────────────────────
  section('Tanya: Sky Barrage');
  await page.click('#tab-sky');
  await page.evaluate(() => window.Otaku.module('game-sky-barrage').start());
  check(await waitFor(page, () => window.Otaku.module('game-sky-barrage').state.enemies.length > 0, 6000), 'wave 1 of Republic mages arrives');
  await shot('sky-barrage', '#otaku-arcade');
  await page.evaluate(() => {
    const api = window.Otaku.module('game-sky-barrage');
    api.skipToBoss();
    window.__godMode = setInterval(() => {
      const s = api.state;
      s.player.inv = 5;
      if (s.boss) s.player.y = s.boss.y;
    }, 16);
  });
  check(await waitFor(page, () => window.Otaku.module('game-sky-barrage').state.phase === 'boss', 5000), 'Being X descends after the last wave');
  await sleep(1500);
  await shot('sky-boss', '#otaku-arcade');
  check(await waitFor(page, () => window.Otaku.module('game-sky-barrage').state.phase === 'won', 60000), 'Being X is refused (defeated)');
  await page.evaluate(() => clearInterval(window.__godMode));

  // ── Spiral Drill ────────────────────────────────────────────────────────
  section('Gurren Lagann: Spiral Drill');
  await page.click('#tab-spiral');
  await page.click('[data-spiral-start]');
  await page.evaluate(async () => {
    const api = window.Otaku.module('game-spiral-drill');
    for (let i = 0; i < 200 && api.state.phase === 'playing'; i++) {
      api.state.needle = api.state.zoneCenter;
      api.strike();
    }
  });
  check(await page.evaluate(() => window.Otaku.module('game-spiral-drill').state.phase === 'won'), 'perfect strikes pierce the Heavens');
  check(await waitFor(page, () => document.querySelector('.fx-giga-drill'), 2000), 'GIGA DRILL BREAK plays');
  await shot('giga-drill');
  await waitFor(page, () => !document.querySelector('.fx-giga-drill'), 4000);

  // ── Typed secrets, Konami, Scouter, ghost ───────────────────────────────
  section('Easter eggs');
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await sleep(700);
  await page.keyboard.type('jujutsu');
  check(await waitFor(page, () => document.querySelector('.fx-domain'), 2000), 'jujutsu → Domain Expansion');
  await page.keyboard.press('Escape');
  await sleep(700);
  await page.keyboard.type('geass');
  check(await waitFor(page, () => document.querySelector('.fx-geass'), 2000), 'geass → absolute obedience');
  await page.keyboard.press('Escape');
  await sleep(700);
  await page.keyboard.type('zawarudo');
  check(await waitFor(page, () => document.documentElement.classList.contains('is-time-stopped'), 3000), 'zawarudo → time stops');
  await page.keyboard.press('Escape');
  await sleep(700);
  for (const k of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']) await page.keyboard.press(k);
  check(await waitFor(page, () => document.querySelector('[data-character="vegeta"]').classList.contains('is-super-saiyan'), 2000), 'Konami → Super Saiyan Vegeta');
  await waitFor(page, () => !document.querySelector('.fx-saiyan'), 3000);
  await page.keyboard.press('k');
  await page.evaluate(() => document.querySelector('[data-character="vegeta"]').scrollIntoView({ block: 'center', behavior: 'instant' }));
  await sleep(200);
  const vb = await (await page.$('[data-character="vegeta"]')).boundingBox();
  await page.mouse.move(vb.x + 80, vb.y + 60);
  check(await waitFor(page, () => document.querySelector('.scouter-hud').classList.contains('is-overloaded'), 3000), "scouter: IT'S OVER 9000");
  await sleep(1800);
  await page.keyboard.press('k');
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => document.querySelector('.pet-body').dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await sleep(100);
  }
  check((await codexCount()).ghost, 'three pokes → ghost secret');

  // ── Death Note ──────────────────────────────────────────────────────────
  section('Death Note');
  await page.evaluate(() => document.getElementById('death-note').scrollIntoView({ behavior: 'instant' }));
  await page.type('#dn-name', 'Ryuk');
  await page.keyboard.press('Enter');
  check(/Shinigami cannot be killed/.test(await $eval('[data-dn-response]', (e) => e.textContent)), 'Ryuk is immune');
  await page.type('#dn-name', 'Not On This Page');
  await page.keyboard.press('Enter');
  check(/No face, no death/.test(await $eval('[data-dn-response]', (e) => e.textContent)), 'unknown names are rejected (Rule II)');
  await page.type('#dn-name', 'wistoria');
  await page.keyboard.press('Enter');
  check(await page.$$eval('.dn-entry', (e) => e.length) === 1 && /in 40s|in 39s/.test(await $eval('.dn-entry-status', (e) => e.textContent)), 'writing a visible title starts the 40s clock');
  await page.evaluate(() => window.Otaku.module('death-note').write('Bubble', 'Watching a VF dub', { delay: 200 }));
  check(await waitFor(page, () => document.querySelector('[data-deathnote="Bubble"]').classList.contains('is-dn-dead'), 4000), 'the victim dies of the chosen cause');
  await shot('death-note', '#death-note');
  await page.click('.dn-entry.is-dead .dn-tear');
  check(await page.evaluate(() => !document.querySelector('[data-deathnote="Bubble"]').classList.contains('is-dn-dead')), 'tearing out the page revives them');

  // ── Tier List Forge ─────────────────────────────────────────────────────
  section('Tier List Forge');
  // Keep the rows clear of the toast stack (bottom-left) so clicks land on chips.
  await page.evaluate(() => document.getElementById('tier-forge').scrollIntoView({ block: 'start', behavior: 'instant' }));
  await page.click('[data-tier-canon]');
  check(await page.$$eval('[data-tier-zone="S"] .tier-chip', (c) => c.length) === 5, 'Dossier canon puts the Top Five in S');
  await page.focus('[data-tier-pool] .tier-chip');
  await page.keyboard.press('f');
  check(await page.$$eval('[data-tier-zone="F"] .tier-chip', (c) => c.length) === 1, 'keyboard: F sends a chip to the F tier');
  await page.click('[data-tier-zone="S"] .tier-chip');
  await page.click('[data-tier-zone="D"]');
  check(await page.$$eval('[data-tier-zone="D"] .tier-chip', (c) => c.length) === 1, 'tap a chip, tap a row: it moves');
  check(await page.evaluate(async () => (await window.Otaku.module('tier-list').paint(false)).toDataURL('image/png').length > 5000), 'PNG export renders');

  // ── Manhwa tracker ──────────────────────────────────────────────────────
  section('Manhwa tracker');
  await page.click('[data-manhwa="mount-hua-sect"] .manhwa-step--plus');
  await page.click('[data-manhwa="mount-hua-sect"] .manhwa-step--plus');
  check(await $eval('[data-manhwa="mount-hua-sect"] .manhwa-field input', (e) => e.value) === '2', '+ logs chapters');
  check(/2 chapters logged/.test(await $eval('[data-manhwa-summary]', (e) => e.textContent)), 'summary totals the shelf');

  // ── Summon Gate ─────────────────────────────────────────────────────────
  section('Summon Gate');
  const ticketsBefore = await page.evaluate(() => window.Otaku.module('summon-gate').tickets);
  check(ticketsBefore >= 3, `welcome + secret tickets granted (${ticketsBefore})`);
  await page.evaluate(() => {
    localStorage.setItem('otaku:v1:gacha.state', JSON.stringify({ sinceSR: 5, sinceSSR: 39, total: 44 }));
    localStorage.setItem('otaku:v1:gacha.tickets', '12');
  });
  await page.reload({ waitUntil: 'networkidle2' }).catch(() => {});
  await page.click('[data-summon-one]');
  check(await waitFor(page, () => document.querySelector('.fx-ssr'), 2000), 'SSR pity triggers the golden cinematic');
  await page.keyboard.press('Escape');
  await sleep(700);
  await page.click('[data-summon-ten]');
  await sleep(1500);
  check(await page.$$eval('[data-summon-results] .gacha-card', (c) => c.length) === 10, '×10 summon reveals ten cards');
  check(/^\d+ \/ 32 collected$/.test(await $eval('[data-binder-count]', (e) => e.textContent)), 'the binder tracks the collection');
  await shot('summon', '#summon-gate');

  // ── Skins, help, codex ──────────────────────────────────────────────────
  section('Skins, help & codex');
  await page.keyboard.press('f');
  check(await page.evaluate(() => document.documentElement.dataset.skin === 'akatsuki'), 'F cycles to the Akatsuki skin');
  await page.click('[data-dock="skin"]');
  await page.click('[data-skin="spiral"]');
  check(await page.evaluate(() => document.documentElement.dataset.skin === 'spiral' && localStorage.getItem('otaku:v1:skin') === '"spiral"'), 'picker applies and remembers a skin');
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(400);
  await shot('skin-spiral');
  await page.click('[data-dock="skin"]');
  await page.click('[data-skin="lunar"]');
  await page.keyboard.press('?');
  check(await page.$eval('#help-dialog', (d) => d.open && d.querySelectorAll('li').length === 6), '? lists all six shortcuts');
  await page.keyboard.press('Escape');
  const found = Object.keys(await codexCount());
  check(found.length === 14, `all 14 codex secrets unlocked (${found.length}: missing ${['opening', 'konami', 'domain', 'geass', 'zawarudo', 'over9000', 'ghost', 'kage', 'sharingan', 'transmute', 'being-x', 'heavens', 'deathnote', 'ssr'].filter((s) => !found.includes(s))})`);
  check(await page.evaluate(() => document.documentElement.classList.contains('codex-complete')), 'codex completion turns the header gold');

  // ── Phone layout ────────────────────────────────────────────────────────
  section('Layout');
  await page.addStyleTag({ content: '.pet-wrapper,.paw-trail,.toast-stack{display:none!important}' });
  await page.screenshot({ path: path.join(ARTIFACTS, 'full-1440.png'), fullPage: true });
  await page.setViewport({ width: 390, height: 844 });
  await sleep(600);
  const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
  check(scrollW <= 390, `no horizontal scroll at 390px (${scrollW})`);
  await page.screenshot({ path: path.join(ARTIFACTS, 'full-390.png'), fullPage: true });

  // ── Gateway (SEG-10) ────────────────────────────────────────────────────
  section('Portfolio gateway (SEG-10)');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(INDEX_URL, { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
  check(await page.evaluate(() => !!document.getElementById('gw-styles')), 'gateway loads on the portfolio');
  await page.keyboard.type('otaku');
  check(await waitFor(page, () => document.querySelector('.gw-portal'), 2000), 'typing "otaku" opens the portal');
  await page.waitForNavigation({ timeout: 5000 }).catch(() => {});
  check(page.url().endsWith('otaku.html'), 'the portal lands in the Otaku Zone');
  await page.goto(INDEX_URL, { waitUntil: 'networkidle2' }).catch(() => {});
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => document.querySelector('#ghost-pet-char .pet-body').dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await sleep(120);
  }
  await page.waitForNavigation({ timeout: 5000 }).catch(() => {});
  check(page.url().endsWith('otaku.html'), 'five ghost pokes also open the gate');

  check(errors.length === 0, `no JS errors${errors.length ? `:\n      ${errors.join('\n      ')}` : ''}`);
  console.log(`\n${failures ? `${failures} FAILURE(S)` : 'ALL E2E CHECKS PASSED'} — screenshots in ${path.relative(ROOT, ARTIFACTS)}`);
  await browser.close();
  process.exit(failures ? 1 : 0);
})();
