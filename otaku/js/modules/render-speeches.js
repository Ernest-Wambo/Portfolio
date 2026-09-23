/**
 * Renders the Throne Speeches (js/data/speeches.js). Must boot before
 * scouter / fx-super-saiyan, which look up the rendered [data-character] nodes.
 */
Otaku.register('render-speeches', ({ data, dom }) => {
  const { h, icon, img, mount } = dom;
  const container = document.querySelector('[data-render="speeches"]');
  if (!container) return;

  mount(container, data.get('speeches').map((speech) =>
    h('article', {
      class: 'speech-entry',
      dataset: { character: speech.id, deathnote: speech.name },
      'data-power-level': String(speech.power.level),
      'data-power-name': speech.name,
      'data-power-class': speech.power.class,
    },
    h('div', { class: 'speech-portrait' }, img({ src: speech.portrait, alt: `${speech.name} portrait`, kind: 'character', position: 'top' })),
    h('div', { class: 'speech-copy' },
      h('h4', null, icon(speech.icon, speech.color), ` ${speech.name}`),
      h('p', { text: speech.subtitle }),
      h('blockquote', { text: speech.text })))));
});
