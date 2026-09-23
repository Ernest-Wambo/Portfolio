/**
 * Renders the library (js/data/library.js) into the Top Five, New Gen and
 * Serious Favorites cards. Every rendered title is tagged as a Death Note
 * target, and the Top Five entries carry scouter power levels.
 */
Otaku.register('render-library', ({ data, dom }) => {
  const { h, icon, img, mount } = dom;
  const lib = data.get('library');
  const $ = (sel) => document.querySelector(`[data-render="${sel}"]`);

  const powerAttrs = (power) =>
    power ? { 'data-power-level': String(power.level), 'data-power-class': power.class } : {};

  const poster = ({ title, label, tagline, cover, alt }) =>
    h('div', { class: 'visual-poster', dataset: { deathnote: title || label } },
      img({ src: cover, alt: alt || title, kind: 'poster' }),
      h('div', { class: 'visual-poster-caption' }, h('strong', { text: label || title }), h('span', { text: tagline })));

  mount($('top-five-covers'), lib.topFive.map((item) =>
    h('div', { class: 'anime-item', title: item.title },
      img({ src: item.cover, alt: item.alt, kind: 'poster' }),
      h('div', { class: 'anime-caption', text: item.caption }))));

  mount($('top-five'), lib.topFive.map((item, i) =>
    h('div', Object.assign({ class: 'ranked-item', dataset: { deathnote: item.title }, 'data-power-name': item.title }, powerAttrs(item.power)),
      h('span', { class: 'ranked-number', text: i + 1 }),
      h('div', { class: 'ranked-copy' }, h('strong', { text: item.title }), h('span', { text: item.tagline })))));

  mount($('new-gen-posters'), lib.newGen.map(poster));
  mount($('new-gen-list'), lib.newGen.map((item) => h('li', { text: item.title })));
  mount($('special-mentions'), lib.specialMentions.map((title) => h('li', { text: title, dataset: { deathnote: title } })));

  mount($('favorites-posters'), lib.favorites.map(poster));
  mount($('favorites-notes'), lib.favoriteNotes.map((note) =>
    h('div', { class: 'otaku-list-item' },
      h('h5', null, icon(note.icon, note.color), ` ${note.title}`),
      h('p', { text: note.text }))));
});
