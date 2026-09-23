/**
 * The anime library: rankings, radar, favorites, and the tier-list pool.
 * Rendered by modules/render-library.js; the Tier List Forge reads `tierPool`
 * and `tierCanon`, and the Death Note treats every title here as a target.
 */
(function () {
  const C = 'assets/otaku/covers/';

  const topFive = [
    { id: 'code-geass', title: 'Code Geass', caption: 'Code Geass', tagline: 'The throne, the scheme, the speechcraft.',
      cover: [C + 'Code-Geass-R2.jpg'], alt: 'Code Geass chess and rebellion', power: { level: 99000000, class: 'Throne strategist' } },
    { id: 'fullmetal-alchemist', title: 'Fullmetal Alchemist', caption: 'Fullmetal', tagline: 'Consequences, tension, and elite cast work.',
      cover: [C + 'fullMetal.jpg'], alt: 'Fullmetal Alchemist brotherhood and consequence', power: { level: 48000000, class: 'State alchemist' } },
    { id: 'gurren-lagann', title: 'Gurren Lagann', caption: 'Gurren Lagann', tagline: 'Pure irrational hype weaponized into greatness.',
      cover: [C + 'gurren-lagann.png'], alt: 'Gurren Lagann key visual', power: { level: 66600000, class: 'Galaxy-piercing drill' } },
    { id: 'naruto', title: 'Naruto', caption: 'Naruto', tagline: 'Legacy, speeches, and endings that still hit.',
      cover: [C + 'Naruto.jpg'], alt: 'Naruto willpower and legacy', power: { level: 52000000, class: 'Hidden Leaf legacy' } },
    { id: 'saga-of-tanya', title: 'Saga of Tanya the Evil', caption: 'Tanya', tagline: 'Strategic menace with divine disrespect.',
      cover: [C + 'saga-of-tanya.png'], alt: 'Saga of Tanya the Evil key visual', power: { level: 31000000, class: 'Imperial mage' } },
  ];

  const newGen = [
    { id: 'classroom-of-the-elite', title: 'Classroom of the Elite', tagline: 'Cold eyes, colder agenda.',
      cover: [C + 'classroom-of-the-elite.jpg'], alt: 'Classroom of the Elite visual' },
    { id: 'wistoria', title: 'Wistoria', tagline: 'Pure fantasy climb energy.',
      cover: [C + 'wistoria.jpg'], alt: 'Wistoria Wand and Sword visual' },
    { id: 'demon-slayer', title: 'Demon Slayer', tagline: 'When the visuals refuse to behave.',
      cover: [C + 'demon-slayer.jpg'], alt: 'Demon Slayer Infinity Castle visual' },
    { id: 'takopi', title: "Takopi's Original Sin", tagline: 'Cute surface, emotional damage underneath.',
      cover: [C + 'takopi.jpg'], alt: "Takopi's Original Sin cover" },
  ];

  const specialMentions = ['I Want to Eat Your Pancreas', 'Your Lie in April', 'Bubble', 'A Silent Voice', 'Dororo'];

  const favorites = [
    { label: 'Best Fight', tagline: 'Goku vs Jiren was event television.',
      cover: [C + 'dragon-ball-super.jpg'], alt: 'Dragon Ball Super visual' },
    { label: 'Best Speech', tagline: 'Damocles. F.L.E.I.J.A. Authority.',
      cover: [C + 'Code-Geass-R2.jpg'], alt: 'Code Geass Lelouch visual' },
    { label: 'Endings That Stayed', tagline: 'Naruto still carries that final-residue effect.',
      cover: [C + 'Naruto.jpg'], alt: 'Naruto ending legacy visual' },
    { label: 'Permanent Residue', tagline: 'Attack on Titan and Dororo still linger.',
      cover: [C + 'attack-on-titan.jpg'], alt: 'Attack on Titan final season visual' },
  ];

  const favoriteNotes = [
    { icon: 'fa-fire', color: 'var(--accent-orange)', title: 'Best fight',
      text: 'Goku vs Jiren in Tournament of Power. That whole fight felt like a global event.' },
    { icon: 'fa-bullhorn', color: 'var(--accent-pink)', title: 'Best speech',
      text: "Lelouch's Damocles and F.L.E.I.J.A proclamation. Pure theatrical domination." },
    { icon: 'fa-feather-pointed', color: 'var(--accent-cyan)', title: 'Endings that stayed',
      text: 'Code Geass, Attack on Titan, Naruto, and Dororo all left permanent residue.' },
  ];

  // Every title mentioned anywhere on the page, for the Tier List Forge.
  const extra = [
    { id: 'soul-eater', title: 'Soul Eater', cover: [C + 'soul-eater.png'] },
    { id: 'attack-on-titan', title: 'Attack on Titan', cover: [C + 'attack-on-titan.jpg'] },
    { id: 'dragon-ball', title: 'Dragon Ball', cover: [C + 'dragon-ball-super.jpg'] },
    { id: 'frieren', title: 'Frieren', cover: [C + 'frieren.jpg'] },
    { id: 'berserk', title: 'Berserk', cover: [C + 'berserk.jpg'] },
    { id: 'death-note', title: 'Death Note', cover: [C + 'death-note.jpg'] },
  ];

  const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const tierPool = [
    ...topFive.map(({ id, title, cover }) => ({ id, title, cover })),
    ...newGen.map(({ id, title, cover }) => ({ id, title, cover })),
    ...specialMentions.map((title) => ({ id: slug(title), title, cover: [] })),
    ...extra,
  ];

  // "Dossier canon": a starting verdict inferred from what this page says.
  const tierCanon = {
    S: ['code-geass', 'fullmetal-alchemist', 'gurren-lagann', 'naruto', 'saga-of-tanya'],
    A: ['soul-eater', 'attack-on-titan', 'dragon-ball', 'dororo', 'frieren'],
    B: ['classroom-of-the-elite', 'wistoria', 'demon-slayer', 'takopi', 'your-lie-in-april', 'a-silent-voice'],
    C: ['i-want-to-eat-your-pancreas', 'bubble'],
    D: [],
    F: [],
  };

  Otaku.defineData('library', { topFive, newGen, specialMentions, favorites, favoriteNotes, tierPool, tierCanon });
})();
