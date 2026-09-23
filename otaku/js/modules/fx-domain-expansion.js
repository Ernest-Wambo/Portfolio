/**
 * Domain Expansion: Infinite Void (Muryōkūsho).
 * Trigger: type "jujutsu" anywhere, or emit fx:domain.
 * The page freezes inside a warp-speed void for ~4s, then snaps back.
 */
Otaku.register('fx-domain-expansion', ({ bus, sfx, input, stage, motion }) => {
  const DURATION = 4200;
  const PARTICLES = 420;
  const COLORS = ['#ffffff', '#a5f3fc', '#c4b5fd', '#818cf8', '#f0abfc'];

  function paintVoid(canvas) {
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let raf = 0;

    function resize() {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    const stars = Array.from({ length: PARTICLES }, () => spawn(Math.random()));
    function spawn(z) {
      return {
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2,
        z: z || 1,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      };
    }

    function project(s) {
      const scale = Math.max(w, h) * 0.55;
      return [w / 2 + (s.x / s.z) * scale, h / 2 + (s.y / s.z) * scale];
    }

    function drawEye(t) {
      const r = Math.min(w, h) * (0.09 + 0.01 * Math.sin(t / 180));
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, r * 3);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(0.25, 'rgba(165,243,252,0.55)');
      g.addColorStop(0.6, 'rgba(129,140,248,0.18)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, r * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    function frame(t) {
      ctx.fillStyle = 'rgba(2, 3, 12, 0.32)';
      ctx.fillRect(0, 0, w, h);
      ctx.lineCap = 'round';

      for (const s of stars) {
        const [px, py] = project(s);
        s.z -= 0.012;
        if (s.z <= 0.02) {
          Object.assign(s, spawn(1));
          continue;
        }
        const [x, y] = project(s);
        if (x < -50 || x > w + 50 || y < -50 || y > h + 50) {
          Object.assign(s, spawn(1));
          continue;
        }
        ctx.strokeStyle = s.color;
        ctx.globalAlpha = Math.min(1, 1.2 - s.z);
        ctx.lineWidth = Math.max(0.6, 2.4 * (1 - s.z));
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      drawEye(t);
      raf = requestAnimationFrame(frame);
    }

    ctx.fillStyle = '#02030c';
    ctx.fillRect(0, 0, w, h);
    if (motion.reduced) {
      stars.forEach((s) => {
        const [x, y] = project(s);
        ctx.fillStyle = s.color;
        ctx.fillRect(x, y, 1.5, 1.5);
      });
      drawEye(0);
    } else {
      raf = requestAnimationFrame(frame);
    }

    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }

  function expand() {
    const started = stage.run('domain', {
      className: 'fx-domain',
      duration: DURATION,
      freeze: true,
      render(overlay) {
        overlay.innerHTML = `
          <canvas class="fx-domain-canvas"></canvas>
          <div class="fx-domain-title">
            <span class="fx-kanji" lang="ja">無量空処</span>
            <strong>Domain Expansion</strong>
            <em>Infinite Void · Muryōkūsho</em>
          </div>`;
        return paintVoid(overlay.querySelector('canvas'));
      },
    });
    if (!started) return;
    sfx.play('bass');
    bus.emit('secret:found', { id: 'domain' });
  }

  input.sequence('jujutsu', expand);
  bus.on('fx:domain', expand);

  return { expand };
});
