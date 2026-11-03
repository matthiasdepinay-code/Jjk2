'use strict';
// ---------- Sons génératifs (WebAudio) : doux, cosy, sans fichier externe ----------
const Son = (() => {
  let ctx = null, master = null, muted = false, ambient = null, sfxBus = null, musicBus = null;
  let volMusique = 1, volEffets = 1, mood = null, nuit = false, melodyT = null;
  // Ambiances : accord tenu, gamme de la mélodie, densité, filtre
  const MOODS = {
    lab:        { chord: [130.81, 164.81, 196.0, 246.94], scale: [523.25, 587.33, 659.25, 783.99, 880.0], dens: 0.32, f: 700 },
    'Le Jardin': { chord: [146.83, 185.0, 220.0, 277.18], scale: [587.33, 659.25, 739.99, 880.0, 987.77], dens: 0.3, f: 750 },
    'La Forêt':  { chord: [110.0, 130.81, 164.81, 196.0], scale: [440.0, 523.25, 587.33, 659.25, 783.99], dens: 0.28, f: 520 },
    'Le Lac':    { chord: [155.56, 196.0, 233.08, 293.66], scale: [622.25, 698.46, 783.99, 932.33, 1046.5], dens: 0.24, f: 650 },
    'La Montagne': { chord: [220.0, 277.18, 329.63, 440.0], scale: [880.0, 987.77, 1108.7, 1318.5, 1480.0], dens: 0.2, f: 1200 },
    'Le Volcan': { chord: [73.42, 110.0, 146.83, 155.56], scale: [587.33, 622.25, 739.99, 880.0, 932.33], dens: 0.22, f: 420 },
    'La Clairière': { chord: [98.0, 123.47, 146.83, 185.0], scale: [392.0, 440.0, 493.88, 587.33, 659.25], dens: 0.34, f: 700 },
    'Les Ruines': { chord: [123.47, 146.83, 185.0, 220.0], scale: [493.88, 587.33, 659.25, 739.99, 880.0], dens: 0.2, f: 600 },
    'Le Désert': { chord: [82.41, 123.47, 164.81, 174.61], scale: [659.25, 698.46, 830.61, 987.77, 1046.5], dens: 0.24, f: 800 },
    souterrain: { chord: [65.41, 77.78, 98.0, 116.54], scale: [261.63, 311.13, 349.23, 392.0, 466.16], dens: 0.12, f: 350 },
    ciel:       { chord: [261.63, 329.63, 392.0, 493.88], scale: [1046.5, 1174.7, 1318.5, 1568.0, 1760.0], dens: 0.3, f: 1500 },
  };
  const ELEM_FREQ = { feu: 220, vent: 392, eau: 330, terre: 147, lumiere: 523, ombre: 196, vie: 440, force: 262 };

  function init() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.gain.value = volEffets; sfxBus.connect(master);
      musicBus = ctx.createGain(); musicBus.gain.value = volMusique; musicBus.connect(master);
      startAmbient();
      melodyT = setInterval(melodie, 420);
    } catch (e) { ctx = null; }
  }
  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }

  function tone(freq, dur, type = 'sine', vol = 0.2, attack = 0.01, detune = 0) {
    if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq; o.detune.value = detune;
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(sfxBus);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol = 0.15, hp = 800) {
    if (!ctx) return;
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(sfxBus);
    src.start();
  }

  function sfx(nom, elem) {
    if (!ctx) return;
    const f = ELEM_FREQ[elem] || 330;
    switch (nom) {
      case 'cast': tone(f, 0.35, 'triangle', 0.18); tone(f * 1.5, 0.5, 'sine', 0.08, 0.05); noise(0.15, 0.05, 2000); break;
      case 'burst': tone(f * 0.5, 0.4, 'sawtooth', 0.08); noise(0.3, 0.12, 400); break;
      case 'fizzle': noise(0.4, 0.08, 1500); tone(180, 0.3, 'triangle', 0.08); break;
      case 'hit': tone(f * 0.75, 0.12, 'square', 0.06); break;
      case 'pickup': tone(660, 0.15, 'sine', 0.12); tone(990, 0.25, 'sine', 0.1, 0.08); break;
      case 'unlock': [523, 659, 784, 1046].forEach((q, i) => setTimeout(() => tone(q, 0.6, 'sine', 0.14), i * 110)); break;
      case 'brew': tone(196, 0.5, 'sine', 0.12); noise(0.6, 0.04, 300); setTimeout(() => tone(392, 0.4, 'triangle', 0.1), 250); break;
      case 'fail': tone(220, 0.3, 'sawtooth', 0.06); setTimeout(() => tone(185, 0.5, 'sawtooth', 0.06), 150); noise(0.5, 0.06, 600); break;
      case 'jump': tone(300, 0.12, 'triangle', 0.06); break;
      case 'hurt': tone(140, 0.25, 'square', 0.08); noise(0.1, 0.1, 1000); break;
      case 'click': tone(880, 0.05, 'sine', 0.05); break;
      case 'drink': tone(440, 0.1, 'sine', 0.08); setTimeout(() => tone(554, 0.15, 'sine', 0.08), 90); setTimeout(() => tone(659, 0.25, 'sine', 0.08), 180); break;
      case 'door': noise(0.3, 0.06, 200); tone(110, 0.4, 'triangle', 0.08); break;
      case 'step': tone(f, 0.08, 'sine', 0.03); break;
    }
  }

  // Nappe ambiante très douce : deux oscillateurs lents + LFO
  function startAmbient() {
    if (!ctx || ambient) return;
    const g = ctx.createGain(); g.gain.value = 0.045; g.connect(musicBus);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 600; f.connect(g);
    const notes = [130.81, 196.0, 261.63, 329.63];
    const oscs = notes.map((n, i) => {
      const o = ctx.createOscillator(); o.type = i % 2 ? 'sine' : 'triangle'; o.frequency.value = n; o.detune.value = (i - 1.5) * 4;
      const og = ctx.createGain(); og.gain.value = 0.25;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.05 + i * 0.03;
      const lg = ctx.createGain(); lg.gain.value = 0.12;
      lfo.connect(lg); lg.connect(og.gain);
      o.connect(og); og.connect(f); o.start(); lfo.start();
      return o;
    });
    ambient = { g, f, oscs };
    setMood(mood || 'lab', nuit);
  }
  function setMood(key, isNuit) {
    const m = MOODS[key] || MOODS.lab;
    if (key === mood && !!isNuit === nuit) return;
    mood = key; nuit = !!isNuit;
    if (!ctx || !ambient) return;
    const t = ctx.currentTime;
    ambient.oscs.forEach((o, i) => o.frequency.setTargetAtTime(m.chord[i] * (nuit ? 0.5 : 1), t, 1.5));
    ambient.f.frequency.setTargetAtTime(m.f * (nuit ? 0.7 : 1), t, 1.5);
    ambient.g.gain.setTargetAtTime(nuit ? 0.035 : 0.045, t, 1.5);
  }
  // mélodie clairsemée : quelques notes pincées dans la gamme de l'ambiance
  function melodie() {
    if (!ctx || muted || ctx.state !== 'running') return;
    const m = MOODS[mood] || MOODS.lab;
    if (Math.random() > m.dens * (nuit ? 0.55 : 1)) return;
    const f = m.scale[Math.floor(Math.random() * m.scale.length)] * (nuit ? 0.5 : 1) * (Math.random() < 0.15 ? 0.5 : 1);
    const o = ctx.createOscillator(), g = ctx.createGain(), fl = ctx.createBiquadFilter();
    o.type = 'triangle'; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.value = m.f * 2.5;
    const t = ctx.currentTime, dur = 1.6 + Math.random() * 1.4;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(fl); fl.connect(g); g.connect(musicBus); o.start(t); o.stop(t + dur + 0.05);
    if (Math.random() < 0.3) { const o2 = ctx.createOscillator(), g2 = ctx.createGain(); o2.type = 'sine'; o2.frequency.value = f * 1.5; g2.gain.setValueAtTime(0, t + 0.25); g2.gain.linearRampToValueAtTime(0.025, t + 0.27); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.25 + dur * 0.7); o2.connect(g2); g2.connect(musicBus); o2.start(t + 0.25); o2.stop(t + 0.3 + dur); }
  }
  function setVolumes(mu, fx) {
    volMusique = mu; volEffets = fx;
    if (musicBus) musicBus.gain.value = mu; if (sfxBus) sfxBus.gain.value = fx;
  }
  function toggleMute() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 0.5;
    return muted;
  }
  function isMuted() { return muted; }

  return { init, resume, sfx, toggleMute, isMuted, setMood, setVolumes };
})();
