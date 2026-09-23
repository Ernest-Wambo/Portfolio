/**
 * Summon Gate pool (modules/summon-gate.js). Rarity: SSR / SR / R.
 * `line` is flavor text for the card: sometimes canon, sometimes dossier commentary.
 */
(function () {
  const P = 'assets/otaku/characters/';
  const c = (id, name, series, rarity, file, line) => ({ id, name, series, rarity, image: [P + file], line });

  Otaku.defineData('characters', [
    // SSR
    c('lelouch', 'Lelouch vi Britannia', 'Code Geass', 'SSR', 'lelouch.png', 'The only ones who should kill are those prepared to be killed.'),
    c('madara', 'Madara Uchiha', 'Naruto Shippuden', 'SSR', 'madara.png', 'Wake up to reality.'),
    c('gojo', 'Satoru Gojo', 'Jujutsu Kaisen', 'SSR', 'gojo.png', 'Throughout Heaven and Earth, I alone am the honored one.'),
    c('guts', 'Guts', 'Berserk', 'SSR', 'guts.png', 'Struggling is the only thing that proves you are alive.'),
    c('dio', 'DIO', "JoJo's Bizarre Adventure", 'SSR', 'dio.png', 'ZA WARUDO! Toki wo tomare!'),
    c('tanya', 'Tanya Degurechaff', 'Saga of Tanya the Evil', 'SSR', 'tanya.png', 'I will never pray to you, Being X.'),
    c('frieren', 'Frieren', "Frieren: Beyond Journey's End", 'SSR', 'frieren.png', 'Humans are so short-lived. That is why I keep collecting spells.'),
    c('being-x', 'Being X', 'Saga of Tanya the Evil', 'SSR', 'being-x.png', 'Believe in me. (Tanya would like a refund.)'),
    // SR
    c('vegeta', 'Prince Vegeta', 'Dragon Ball Z', 'SR', 'vegeta.png', "It's over 9000!"),
    c('goku', 'Son Goku', 'Dragon Ball Z', 'SR', 'goku.png', 'I am the hope of the universe.'),
    c('itachi', 'Itachi Uchiha', 'Naruto Shippuden', 'SR', 'itachi.png', 'Forgive me, Sasuke. There will be no next time.'),
    c('kakashi', 'Kakashi Hatake', 'Naruto Shippuden', 'SR', 'kakashi.png', 'Those who abandon their friends are worse than scum.'),
    c('edward-elric', 'Edward Elric', 'Fullmetal Alchemist', 'SR', 'edward-elric.jpg', 'Equivalent exchange.'),
    c('roy-mustang', 'Roy Mustang', 'Fullmetal Alchemist', 'SR', 'roy-mustang.png', 'Snap. That is the whole strategy.'),
    c('levi', 'Levi Ackerman', 'Attack on Titan', 'SR', 'levi.png', 'Give up on your dreams and die.'),
    c('l', 'L Lawliet', 'Death Note', 'SR', 'l.png', 'I am L.'),
    c('light', 'Light Yagami', 'Death Note', 'SR', 'light.png', 'I am justice!'),
    c('kamina', 'Kamina', 'Gurren Lagann', 'SR', 'kamina.png', 'Who the hell do you think I am?!'),
    c('ayanokoji', 'Kiyotaka Ayanokoji', 'Classroom of the Elite', 'SR', 'ayanokoji.png', 'All people are simply tools.'),
    c('cc', 'C.C.', 'Code Geass', 'SR', 'cc.png', 'Pizza first. Contracts later.'),
    // R
    c('naruto', 'Naruto Uzumaki', 'Naruto Shippuden', 'R', 'naruto.png', 'Believe it!'),
    c('alphonse', 'Alphonse Elric', 'Fullmetal Alchemist', 'R', 'alphonse.jpg', 'Brother!'),
    c('suzaku', 'Suzaku Kururugi', 'Code Geass', 'R', 'suzaku.jpg', 'I will change the system from within.'),
    c('simon', 'Simon', 'Gurren Lagann', 'R', 'simon.jpg', 'My drill is the drill that will pierce the heavens!'),
    c('nia', 'Nia Teppelin', 'Gurren Lagann', 'R', 'nia.png', 'Simon, I will always be with you.'),
    c('viral', 'Viral', 'Gurren Lagann', 'R', 'viral.png', 'Remember the name Viral!'),
    c('soul', 'Soul Eater Evans', 'Soul Eater', 'R', 'soul.png', 'Cool guys do not look at explosions.'),
    c('eren', 'Eren Yeager', 'Attack on Titan', 'R', 'eren.jpg', 'Tatakae.'),
    c('tanjiro', 'Tanjiro Kamado', 'Demon Slayer', 'R', 'tanjiro.png', 'I will never give up!'),
    c('hyakkimaru', 'Hyakkimaru', 'Dororo', 'R', 'hyakkimaru.png', '(silently reclaims another organ)'),
    c('visha', 'Viktoriya Serebryakov', 'Saga of Tanya the Evil', 'R', 'visha.jpg', 'Coffee is ready, Major!'),
    c('ryuk', 'Ryuk', 'Death Note', 'R', 'ryuk.jpg', 'Humans are so interesting.'),
  ]);
})();
