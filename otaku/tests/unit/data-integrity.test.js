/**
 * Cross-checks the content layer against the rest of the system:
 * data shape, asset files on disk, secrets emitted by modules, skins CSS,
 * and that otaku.html loads every script that exists (and nothing missing).
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../..'); // Portfolio/
const OTAKU = path.join(ROOT, 'otaku');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

// Load every data file through a stub registry, exactly like the browser does.
const data = {};
globalThis.Otaku = { defineData: (name, value) => (data[name] = value) };
fs.readdirSync(path.join(OTAKU, 'js/data')).forEach((file) => require(path.join(OTAKU, 'js/data', file)));

const uniqueIds = (list, label) => {
  const ids = list.map((x) => x.id);
  assert.equal(new Set(ids).size, ids.length, `duplicate ids in ${label}`);
};
const someAssetExists = (sources, label) =>
  assert.ok([].concat(sources).some(exists), `${label}: none of [${[].concat(sources).join(', ')}] exists`);

test('all data sets are registered', () => {
  ['secrets', 'library', 'speeches', 'tracks', 'manhwa', 'ranks', 'characters', 'skins']
    .forEach((name) => assert.ok(data[name], `missing data set "${name}"`));
});

test('speeches: unique ids, a real portrait, text and a power level', () => {
  uniqueIds(data.speeches, 'speeches');
  data.speeches.forEach((s) => {
    someAssetExists(s.portrait, s.id);
    assert.ok(s.text.length > 50, `${s.id} speech is empty`);
    assert.ok(s.power && s.power.level, `${s.id} has no power level`);
  });
  assert.ok(data.speeches.some((s) => s.id === 'vegeta' && s.power.level === 'over9000'), 'Vegeta must overload the scouter');
});

test('library: covers exist and the tier canon only references pool titles', () => {
  const lib = data.library;
  [...lib.topFive, ...lib.newGen, ...lib.favorites].forEach((item) => someAssetExists(item.cover, item.title || item.label));
  uniqueIds(lib.tierPool, 'tierPool');
  const pool = new Set(lib.tierPool.map((t) => t.id));
  Object.entries(lib.tierCanon).forEach(([tier, ids]) =>
    ids.forEach((id) => assert.ok(pool.has(id), `tierCanon.${tier} references unknown "${id}"`)));
  lib.tierPool.filter((t) => t.cover.length).forEach((t) => someAssetExists(t.cover, `tier chip ${t.id}`));
});

test('manhwa, characters and ranks point at real images', () => {
  uniqueIds(data.manhwa, 'manhwa');
  data.manhwa.forEach((m) => someAssetExists(m.cover, m.id));
  uniqueIds(data.characters, 'characters');
  data.characters.forEach((c) => {
    assert.ok(['SSR', 'SR', 'R'].includes(c.rarity), `${c.id} has rarity ${c.rarity}`);
    someAssetExists(c.image, c.id);
  });
  [...data.ranks.ladder, data.ranks.beyond].forEach((r) => someAssetExists(r.image, r.name));
});

test('2048 ladder is 2, 4, 8 … 2048', () => {
  assert.deepEqual(data.ranks.ladder.map((r) => r.value), Array.from({ length: 11 }, (_, i) => 2 ** (i + 1)));
});

test('tracks are valid Spotify ids', () => {
  uniqueIds(data.tracks, 'tracks');
  data.tracks.forEach((t) => assert.match(t.id, /^[A-Za-z0-9]{22}$/, t.title));
});

test('every secret emitted by a module exists in the codex, and every codex secret is emitted somewhere', () => {
  const known = new Set(data.secrets.map((s) => s.id));
  const emitted = new Set();
  fs.readdirSync(path.join(OTAKU, 'js/modules')).forEach((file) => {
    const src = fs.readFileSync(path.join(OTAKU, 'js/modules', file), 'utf8');
    for (const m of src.matchAll(/secret:found',\s*\{\s*id:\s*'([^']+)'/g)) emitted.add(m[1]);
  });
  emitted.forEach((id) => assert.ok(known.has(id), `module emits unknown secret "${id}"`));
  known.forEach((id) => assert.ok(emitted.has(id), `secret "${id}" can never be unlocked`));
});

test('every non-default skin has a CSS block', () => {
  const css = read('otaku/css/otaku-skins.css');
  data.skins.filter((s) => s.id !== 'lunar').forEach((s) =>
    assert.ok(css.includes(`html[data-skin="${s.id}"]`), `no CSS for skin "${s.id}"`));
});

test('otaku.html loads every runtime script, and every referenced file exists', () => {
  const html = read('otaku.html');
  const referenced = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
  const stylesheets = [...html.matchAll(/<link rel="stylesheet" href="(otaku\/[^"]+)"/g)].map((m) => m[1]);
  [...referenced, ...stylesheets].forEach((src) => assert.ok(exists(src), `otaku.html references missing ${src}`));
  ['core', 'data', 'games', 'modules'].forEach((dir) =>
    fs.readdirSync(path.join(OTAKU, 'js', dir)).forEach((file) =>
      assert.ok(referenced.includes(`otaku/js/${dir}/${file}`), `otaku/js/${dir}/${file} is never loaded`)));
  assert.ok(referenced.at(-1).endsWith('boot.js'), 'boot.js must load last');
});

test('the personal portfolio only knows about the gateway', () => {
  const index = read('index.html');
  assert.ok(index.includes('otaku/gateway/gateway.js'), 'gateway script not wired into index.html');
  assert.ok(!/otaku\/(css|js)\//.test(index), 'index.html must not load Otaku runtime files');
});
