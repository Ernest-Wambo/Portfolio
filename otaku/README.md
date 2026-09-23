# Otaku Zone runtime

Everything behind `otaku.html`. It shares nothing with the personal portfolio (`index.html` / `index.css` / `script.js`). The only link between the two worlds is the self-contained gateway script (SEG-10).

```
otaku/
├── css/
│   ├── otaku-base.css      tokens, reset, glass/card primitives, ghost pet
│   ├── otaku-layout.css    page chrome, dock + skin menu, content cards, manhwa tracker
│   ├── otaku-arcade.css    arcade tabs, 2048, Memory Seal, terminal, Sky Barrage, Spiral Drill, codex
│   ├── otaku-vault.css     Death Note, Tier List Forge, Summon Gate
│   ├── otaku-fx.css        toasts, scouter, cinematics (domain, geass, za warudo, OP, SSR, giga drill)
│   └── otaku-skins.css     faction skins (token overrides only)
├── js/
│   ├── core/       otaku (registry) · bus · store · data · dom · sfx · input · toast · stage
│   ├── data/       CONTENT: speeches, library, tracks, manhwa, ranks, characters, skins, secrets
│   ├── games/      pure engines, no DOM: g2048 · sky-barrage · spiral · gacha
│   ├── modules/    one feature per file; they talk to each other only through bus events
│   └── boot.js     loaded last
├── gateway/
│   └── gateway.js  loaded by index.html: ghost ×5 or typing "otaku" opens a portal to otaku.html
└── tests/
    ├── unit/       node:test suites, run with `npm test`
    └── e2e/        headless Chrome suite, run with `npm run test:e2e`
```

Scripts are plain classic scripts (not ES modules), so the page still works when opened straight from disk (`file://`). Load order in `otaku.html`: **core → data → games → renderers → modules → boot**. The data-integrity test fails if a file exists but is never loaded.

## Editing content (no code needed)

| To change… | Edit |
| --- | --- |
| Speeches, portraits, scouter levels | `js/data/speeches.js` |
| Top Five, New Gen, favorites, tier-list pool | `js/data/library.js` |
| Spotify tracks | `js/data/tracks.js` |
| Manhwa shelf | `js/data/manhwa.js` |
| 2048 ranks and their art | `js/data/ranks.js` + `assets/otaku/ranks/*.svg` |
| Gacha characters and rarities | `js/data/characters.js` |
| Secret hints | `js/data/secrets.js` |

Images use `dom.img({ src: [...] })`: every path in the list is tried in order, then the matching placeholder. To swap art, drop a new file into `assets/otaku/...` and put its path first in the list.

## Adding a module

```js
// otaku/js/modules/my-feature.js
Otaku.register('my-feature', ({ bus, store, data, dom, sfx, input, toast, stage, motion }) => {
  const root = document.querySelector('[data-my-feature]');
  if (!root) return;                 // no-op when the markup is absent
  input.shortcut('x', run, 'Describe it for the ? help scroll');
  bus.on('fx:something', run);
  return { run };                    // public API: Otaku.module('my-feature')
});
```

Then add its `<script>` tag before `boot.js`. Each module starts inside a try/catch, so a crash in one never takes down the rest.

## Rules of the road

- **Secrets:** add the entry to `js/data/secrets.js`, then `bus.emit('secret:found', { id })` from your module. The unit tests fail if a secret can never be emitted, or if a module emits an unknown one.
- **Shortcut letters:** never use a letter from a secret word (`geass`, `jujutsu`, `zawarudo`, and `b`/`a` from Konami). Taken: `M` `K` `P` `C` `F` `?`. Widgets that own keys mark their root with `data-owns-keys`. If they re-render on keydown, they must also `stopPropagation()`.
- **Effects:** go through `stage.run(...)`, so they never overlap and `freeze: true` pauses the page.
- **Game logic:** belongs in `js/games/*` as a pure engine with a unit test. Modules only render and handle input.
- **Arcade rewards:** emit `arcade:victory` on a win. The Summon Gate pays 1 ticket, max 3 per day.
- **Motion:** check `motion.reduced` before heavy animation.
- **Storage keys** are namespaced `otaku:v1:*`.

## Tests

```bash
npm install          # once: installs puppeteer-core (dev only)
npm test             # 35 unit tests: engines + data/asset/markup integrity
npm run test:e2e     # every feature and all 14 secrets in headless Chrome (set CHROME_PATH if needed)
```
