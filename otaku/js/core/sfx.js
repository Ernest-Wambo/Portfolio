/**
 * SFX engine — every sound is synthesized with the Web Audio API, so there
 * are zero audio assets to ship or break. Muted by default; the
 * "Unleash Forbidden Chakra" toggle flips the master switch (persisted).
 *
 *   Otaku.sfx.play('geass');
 *   Otaku.sfx.play('merge', { level: 5 });
 */
(function (Otaku) {
  'use strict';

  const store = Otaku.store;
  let ctx = null;
  let master = null;
  let noiseBuffer = null;
  let enabled = store.get('sfx.enabled', false);

  function audio() {
    if (ctx) return ctx;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    ctx = new AudioCtx();

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.ratio.value = 6;
    master = ctx.createGain();
    master.gain.value = 0.32;
    master.connect(compressor).connect(ctx.destination);

    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return ctx;
  }

  function envelope(node, t, { gain = 0.2, attack = 0.005, dur = 0.2 }) {
    node.gain.setValueAtTime(0.0001, t);
    node.gain.linearRampToValueAtTime(gain, t + attack);
    node.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  function route(source, t, opts) {
    const g = ctx.createGain();
    envelope(g, t, opts);
    let head = source;
    if (opts.filter) {
      const f = ctx.createBiquadFilter();
      f.type = opts.filter;
      f.frequency.setValueAtTime(opts.freq || 1000, t);
      if (opts.filterTo) f.frequency.exponentialRampToValueAtTime(opts.filterTo, t + opts.dur);
      if (opts.q) f.Q.value = opts.q;
      head.connect(f);
      head = f;
    }
    head.connect(g).connect(master);
  }

  /** Oscillator voice. */
  function tone(freq, opts = {}) {
    const t = ctx.currentTime + (opts.delay || 0);
    const dur = opts.dur || 0.2;
    const osc = ctx.createOscillator();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, t + dur);
    route(osc, t, Object.assign({ dur }, opts, { freq: opts.filterFreq }));
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  /** Filtered white-noise voice. */
  function noise(opts = {}) {
    const t = ctx.currentTime + (opts.delay || 0);
    const dur = opts.dur || 0.2;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;
    route(src, t, Object.assign({ dur }, opts));
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  function arpeggio(notes, { step = 0.08, type = 'triangle', gain = 0.16, dur = 0.22 } = {}) {
    notes.forEach((f, i) => tone(f, { type, gain, dur, delay: i * step }));
  }

  const SOUNDS = {
    blip: () => tone(880, { type: 'square', gain: 0.05, dur: 0.05 }),
    beep: () => tone(1320, { type: 'square', gain: 0.06, dur: 0.07 }),
    flip: () => {
      noise({ filter: 'bandpass', freq: 3200, q: 1.4, gain: 0.18, dur: 0.06 });
      tone(620, { gain: 0.06, dur: 0.05 });
    },
    match: () => arpeggio([660, 990], { step: 0.07, gain: 0.14 }),
    miss: () => tone(210, { type: 'sawtooth', slideTo: 110, gain: 0.08, dur: 0.2, filter: 'lowpass', filterFreq: 900 }),
    merge: ({ level = 1 } = {}) => {
      const f = 220 * Math.pow(2, Math.min(level, 14) / 4);
      tone(f, { type: 'triangle', slideTo: f * 1.5, gain: 0.12, dur: 0.12 });
    },
    slide: () => noise({ filter: 'lowpass', freq: 700, gain: 0.05, dur: 0.07 }),
    pop: () => tone(300, { slideTo: 1400, gain: 0.14, dur: 0.09 }),
    crack: () => {
      noise({ filter: 'highpass', freq: 2200, gain: 0.5, dur: 0.45 });
      noise({ filter: 'bandpass', freq: 900, q: 3, gain: 0.3, dur: 0.18, delay: 0.05 });
      tone(180, { type: 'sawtooth', slideTo: 45, gain: 0.18, dur: 0.3 });
    },
    bass: () => {
      tone(55, { slideTo: 32, gain: 0.9, attack: 0.05, dur: 2.8 });
      tone(110, { type: 'triangle', slideTo: 60, gain: 0.25, attack: 0.1, dur: 2.2 });
      noise({ filter: 'lowpass', freq: 260, filterTo: 60, gain: 0.35, attack: 0.3, dur: 2.6 });
      [0.6, 1.2, 1.8].forEach((d, i) => tone(55, { gain: 0.3 / (i + 1), dur: 0.9, delay: d }));
    },
    geass: () => {
      [880, 1318.5, 1760, 2637].forEach((f, i) => tone(f, { gain: 0.14 / (i + 1), dur: 1.6 }));
      [659.3, 987.8, 1318.5].forEach((f, i) => tone(f, { gain: 0.1 / (i + 1), dur: 1.4, delay: 0.22 }));
      noise({ filter: 'bandpass', freq: 5000, q: 6, gain: 0.08, attack: 0.3, dur: 1 });
    },
    aura: () => {
      tone(110, { type: 'sawtooth', slideTo: 880, gain: 0.16, attack: 0.2, dur: 1.4, filter: 'lowpass', filterFreq: 300, filterTo: 4000 });
      tone(55, { type: 'square', slideTo: 220, gain: 0.08, attack: 0.3, dur: 1.4 });
      noise({ filter: 'bandpass', freq: 400, filterTo: 6000, q: 2, gain: 0.2, attack: 0.4, dur: 1.5 });
    },
    timestop: () => {
      noise({ filter: 'bandpass', freq: 200, filterTo: 5000, q: 1, gain: 0.35, attack: 0.9, dur: 1 });
      tone(90, { type: 'sawtooth', slideTo: 40, gain: 0.25, dur: 1.2, delay: 0.95, filter: 'lowpass', filterFreq: 600 });
    },
    tick: () => tone(2000, { type: 'square', gain: 0.05, dur: 0.03 }),
    win: () => arpeggio([523.3, 659.3, 784, 1046.5, 1318.5], { step: 0.09, gain: 0.15, dur: 0.35 }),
    lose: () => arpeggio([392, 329.6, 261.6, 196], { step: 0.14, type: 'sawtooth', gain: 0.07, dur: 0.3 }),
    achievement: () => arpeggio([784, 988, 1175, 1568], { step: 0.07, gain: 0.14, dur: 0.3 }),
    type: () => tone(1800 + Math.random() * 400, { type: 'square', gain: 0.02, dur: 0.02 }),
  };

  Otaku.provide('sfx', {
    get enabled() {
      return enabled;
    },

    setEnabled(value) {
      enabled = !!value;
      store.set('sfx.enabled', enabled);
      if (enabled) {
        const ac = audio();
        if (ac && ac.state === 'suspended') ac.resume();
      }
      Otaku.bus.emit('sfx:toggled', { enabled });
      return enabled;
    },

    toggle() {
      return this.setEnabled(!enabled);
    },

    play(name, opts) {
      if (!enabled || !SOUNDS[name]) return;
      const ac = audio();
      if (!ac) return;
      if (ac.state === 'suspended') ac.resume();
      try {
        SOUNDS[name](opts);
      } catch (err) {
        console.warn('[Otaku] sfx failed:', name, err);
      }
    },

    list() {
      return Object.keys(SOUNDS);
    },
  });
})(window.Otaku);
