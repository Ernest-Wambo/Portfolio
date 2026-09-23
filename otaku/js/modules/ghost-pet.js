/**
 * Ghost pet — the dossier's suspicious mascot.
 * Roams the viewport, freezes during time-stop effects, and talks back
 * when clicked. Three pokes in a row unlock the "ghost" secret.
 */
Otaku.register('ghost-pet', ({ bus, sfx, motion }) => {
  const GHOST_W = 80;
  const GHOST_H = 96;
  const SPEED = 2.4;
  const IDLE_MIN = 400;
  const IDLE_MAX = 1000;
  const TRAIL_INTERVAL = 55;
  const TRAIL_DIST = 10;
  const POKES_FOR_SECRET = 3;

  const LINES = [
    'Boo. Classified.',
    'Sub only. I checked.',
    'I have seen your watch history.',
    'Try typing something forbidden…',
    'The arcade is open, coward.',
    'I am... the ghost of this dossier.',
    'Equivalent exchange: one click, one boo.',
    'Up, up, down, down… you know the rest.',
  ];

  const wrapper = document.getElementById('ghost-pet-wrapper');
  const char = document.getElementById('ghost-pet-char');
  if (!wrapper || !char) return;

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  let x = window.innerWidth - GHOST_W - 24;
  let y = window.innerHeight - GHOST_H - 24;
  let targetX = x;
  let targetY = y;
  let isIdle = true;
  let frozen = false;
  let idleTimer = null;
  let lastTrailX = x;
  let lastTrailY = y;
  let lastTrailTime = 0;
  let pokes = 0;
  let pokeReset = null;
  let bubble = null;

  const roams = () => !motion.reduced;

  function pickTarget() {
    if (frozen || !roams()) return scheduleNext();
    const margin = 20;
    targetX = clamp(Math.random() * (window.innerWidth - GHOST_W), margin, window.innerWidth - GHOST_W - margin);
    targetY = clamp(Math.random() * (window.innerHeight - GHOST_H), margin, window.innerHeight - GHOST_H - margin);
    isIdle = false;
    char.classList.remove('idle');
  }

  function scheduleNext() {
    isIdle = true;
    char.classList.add('idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(pickTarget, IDLE_MIN + Math.random() * (IDLE_MAX - IDLE_MIN));
  }

  function dropTrail() {
    const dot = document.createElement('div');
    dot.className = 'paw-trail';
    dot.style.left = x + GHOST_W / 2 + 'px';
    dot.style.top = y + GHOST_H * 0.85 + 'px';
    document.body.appendChild(dot);
    dot.addEventListener('animationend', () => dot.remove(), { once: true });
  }

  function tick(now) {
    if (!frozen) {
      const dx = targetX - x;
      const dy = targetY - y;
      const dist = Math.hypot(dx, dy);

      if (dist > 2) {
        const step = Math.min(SPEED, dist);
        x += (dx / dist) * step;
        y += (dy / dist) * step;

        if (dx < -1) char.classList.add('flipped');
        else if (dx > 1) char.classList.remove('flipped');

        if (Math.hypot(x - lastTrailX, y - lastTrailY) >= TRAIL_DIST && now - lastTrailTime > TRAIL_INTERVAL) {
          dropTrail();
          lastTrailX = x;
          lastTrailY = y;
          lastTrailTime = now;
        }
      } else if (!isIdle) {
        x = targetX;
        y = targetY;
        scheduleNext();
      }

      wrapper.style.transform = `translate(${x}px, ${y}px)`;
      if (bubble) positionBubble();
    }
    requestAnimationFrame(tick);
  }

  function positionBubble() {
    const left = clamp(x + GHOST_W / 2, 110, window.innerWidth - 110);
    bubble.style.transform = `translate(calc(${left}px - 50%), ${Math.max(8, y - 46)}px)`;
  }

  function say(text) {
    if (!bubble) {
      bubble = document.createElement('div');
      bubble.className = 'ghost-bubble';
      bubble.setAttribute('role', 'status');
      document.body.appendChild(bubble);
    }
    bubble.textContent = text;
    bubble.classList.remove('is-visible');
    void bubble.offsetWidth; // restart the pop-in animation
    bubble.classList.add('is-visible');
    positionBubble();
    clearTimeout(say.timer);
    say.timer = setTimeout(() => bubble && bubble.classList.remove('is-visible'), 2600);
  }

  char.querySelector('.pet-body').addEventListener('click', () => {
    sfx.play('pop');
    pokes += 1;
    clearTimeout(pokeReset);
    pokeReset = setTimeout(() => (pokes = 0), 2500);

    if (pokes >= POKES_FOR_SECRET) {
      pokes = 0;
      say('Fine. You found me. Secret logged.');
      bus.emit('secret:found', { id: 'ghost' });
      return;
    }
    say(LINES[Math.floor(Math.random() * LINES.length)]);
  });

  bus.on('time:stop', () => {
    frozen = true;
    char.classList.add('is-frozen');
  });
  bus.on('time:resume', () => {
    frozen = false;
    char.classList.remove('is-frozen');
  });

  window.addEventListener('resize', () => {
    x = clamp(x, 0, window.innerWidth - GHOST_W);
    y = clamp(y, 0, window.innerHeight - GHOST_H);
    targetX = clamp(targetX, 0, window.innerWidth - GHOST_W);
    targetY = clamp(targetY, 0, window.innerHeight - GHOST_H);
  });

  wrapper.style.transform = `translate(${x}px, ${y}px)`;
  scheduleNext();
  requestAnimationFrame(tick);

  return { say };
});
