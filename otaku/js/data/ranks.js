/**
 * 2048: Evolution of Power — the shinobi rank ladder.
 * Each tile shows `image` + `short`. Drop a PNG in assets/otaku/ranks/ and
 * add it in front of the SVG to swap the art without touching code.
 */
(function () {
  const R = 'assets/otaku/ranks/';
  Otaku.defineData('ranks', {
    ladder: [
      { value: 2, name: 'Academy Student', short: 'Student', image: [R + 'academy-student.svg'] },
      { value: 4, name: 'Genin', short: 'Genin', image: [R + 'genin.svg'] },
      { value: 8, name: 'Chunin', short: 'Chunin', image: [R + 'chunin.svg'] },
      { value: 16, name: 'Special Jonin', short: 'Sp. Jonin', image: [R + 'special-jonin.svg'] },
      { value: 32, name: 'Jonin', short: 'Jonin', image: [R + 'jonin.svg'] },
      { value: 64, name: 'Anbu', short: 'Anbu', image: [R + 'anbu.svg'] },
      { value: 128, name: 'Akatsuki Initiate', short: 'Akatsuki', image: [R + 'akatsuki.svg'] },
      { value: 256, name: 'Kage', short: 'Kage', image: [R + 'kage.svg'] },
      { value: 512, name: 'Legendary Sannin', short: 'Sannin', image: [R + 'sannin.svg'] },
      { value: 1024, name: 'Six Paths', short: 'Six Paths', image: [R + 'six-paths.svg'] },
      { value: 2048, name: 'Ghost of the Uchiha', short: 'Uchiha', image: [R + 'uchiha-ghost.svg'] },
    ],
    beyond: { name: 'Infinite Tsukuyomi', short: 'Tsukuyomi', image: [R + 'infinite-tsukuyomi.svg'] },
  });
})();
