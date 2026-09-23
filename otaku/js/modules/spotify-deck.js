/**
 * Late-Night Immersion Deck — renders the tracks (js/data/tracks.js) and swaps
 * the single Spotify embed between them. Remembers the last selected track.
 */
Otaku.register('spotify-deck', ({ store, data, dom }) => {
  const { h, icon, mount } = dom;
  const player = document.getElementById('spotify-deck-player');
  const selector = document.getElementById('spotify-track-selector');
  if (!player || !selector) return;

  const tracks = data.get('tracks');
  const embedUrl = (id) => `https://open.spotify.com/embed/track/${id}?utm_source=generator&theme=0`;

  const buttons = tracks.map((track) =>
    h('button', { class: 'track-button', type: 'button', dataset: { trackId: track.id }, 'aria-pressed': 'false' },
      h('strong', { text: track.title }),
      h('span', { text: track.note })));

  const links = h('div', { class: 'spotify-link-row' }, tracks.map((track) =>
    h('a', { href: track.link, target: '_blank', rel: 'noreferrer' }, icon('fa-brands fa-spotify'), ` ${track.title}`)));

  mount(selector, buttons, links);

  function select(button, { load = true } = {}) {
    if (load) player.src = embedUrl(button.dataset.trackId);
    buttons.forEach((b) => {
      b.classList.toggle('is-active', b === button);
      b.setAttribute('aria-pressed', String(b === button));
    });
    store.set('deck.track', button.dataset.trackId);
  }

  buttons.forEach((button) => button.addEventListener('click', () => select(button)));

  const saved = buttons.find((b) => b.dataset.trackId === store.get('deck.track', null));
  const initial = saved || buttons[0];
  select(initial, { load: false });
  player.src = embedUrl(initial.dataset.trackId);

  return { select: (index) => buttons[index] && select(buttons[index]) };
});
