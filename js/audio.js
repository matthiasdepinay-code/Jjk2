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
  // ---------- Nappes des phénomènes : chacun son bruit, qui suit sa position ----------
  const actives = new Map(); let bruitBuf = null;
  function bruitSource() { if (!bruitBuf) { const n = ctx.sampleRate * 2; bruitBuf = ctx.createBuffer(1, n, ctx.sampleRate); const d = bruitBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; } const s = ctx.createBufferSource(); s.buffer = bruitBuf; s.loop = true; return s; }
  function creerNappe(type) {
    const out = ctx.createGain(); out.gain.value = 0;
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null; if (pan) { out.connect(pan); pan.connect(sfxBus); } else out.connect(sfxBus);
    const nodes = [];
    const osc = (f, ty, v) => { const o = ctx.createOscillator(); o.type = ty; o.frequency.value = f; const g = ctx.createGain(); g.gain.value = v; o.connect(g); g.connect(out); o.start(); nodes.push(o); return { o, g }; };
    const nz = (ft, f, q, v) => { const s = bruitSource(); const fl = ctx.createBiquadFilter(); fl.type = ft; fl.frequency.value = f; fl.Q.value = q; const g = ctx.createGain(); g.gain.value = v; s.connect(fl); fl.connect(g); g.connect(out); s.start(); nodes.push(s); return { s, fl, g }; };
    const lfo = (param, f, prof) => { const l = ctx.createOscillator(); l.frequency.value = f; const lg = ctx.createGain(); lg.gain.value = prof; l.connect(lg); lg.connect(param); l.start(); nodes.push(l); };
    switch (type) {
      case 'soleil': { const a = osc(82, 'sine', 0.5); osc(123, 'triangle', 0.16); lfo(a.g.gain, 3.1, 0.18); const n = nz('bandpass', 2400, 0.8, 0.12); lfo(n.g.gain, 7, 0.1); break; }
      case 'orage': { const n = nz('lowpass', 140, 0.7, 1); lfo(n.g.gain, 0.23, 0.6); nz('highpass', 3000, 0.5, 0.05); break; }
      case 'vent': { const n = nz('bandpass', 700, 1.2, 0.6); lfo(n.fl.frequency, 0.4, 350); lfo(n.g.gain, 0.7, 0.25); break; }
      case 'eau': { const n = nz('bandpass', 900, 2.5, 0.55); lfo(n.fl.frequency, 5.3, 400); break; }
      case 'feu': { const n = nz('highpass', 1800, 0.5, 0.25); lfo(n.g.gain, 13, 0.2); osc(110, 'sawtooth', 0.03); break; }
      case 'trounoir': { osc(41, 'sine', 0.7); osc(41.7, 'sine', 0.5); const w = osc(320, 'sine', 0.05); lfo(w.o.frequency, 0.2, 120); break; }
      case 'foudre': { const b = osc(110, 'sawtooth', 0.1); lfo(b.g.gain, 17, 0.08); nz('highpass', 4000, 0.5, 0.08); break; }
      case 'terre': { const n = nz('lowpass', 90, 0.7, 0.8); lfo(n.g.gain, 2.2, 0.4); break; }
      case 'magie': { [523.25, 659.25, 783.99].forEach((f, i) => { const a = osc(f, 'sine', 0.05); lfo(a.g.gain, 0.5 + i * 0.3, 0.04); }); break; }
      case 'temps': { osc(220, 'sine', 0.02); break; }
      default: osc(330, 'sine', 0.03);
    }
    return { out, pan, nodes, type, tic: 0 };
  }
  // liste : [{ id, type, vol (0..1), pan (-1..1) }] ; ce qui n'y est plus s'éteint en douceur
  function nappes(liste) {
    if (!ctx) return;
    const t = ctx.currentTime, vus = new Set();
    if (!muted) for (const q of liste.slice(0, 5)) {
      vus.add(q.id); let b = actives.get(q.id);
      if (!b) { b = creerNappe(q.type); actives.set(q.id, b); }
      b.out.gain.setTargetAtTime(Math.max(0, Math.min(1, q.vol)) * 0.16, t, 0.15);
      if (b.pan) b.pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, q.pan || 0)), t, 0.1);
      if (q.type === 'temps' && t > b.tic) { b.tic = t + 0.5; tone(1760, 0.04, 'square', 0.03 * q.vol); }
    }
    for (const [id, b] of actives) if (!vus.has(id)) { b.out.gain.setTargetAtTime(0, t, 0.2); const nb = b; setTimeout(() => { for (const n of nb.nodes) { try { n.stop(); } catch (e) { /* déjà arrêté */ } } try { nb.out.disconnect(); } catch (e) { /* déjà débranché */ } }, 1200); actives.delete(id); }
  }
  // la voix de chaque familier, à l'attaque ou à l'invocation
  function voix(esp) {
    switch (esp) {
      case 'feu': noise(0.25, 0.07, 2500); tone(180, 0.15, 'sawtooth', 0.04); break;
      case 'eau': tone(520, 0.08, 'sine', 0.08); setTimeout(() => tone(780, 0.1, 'sine', 0.06), 60); break;
      case 'terre': tone(70, 0.25, 'sine', 0.16); noise(0.15, 0.08, 150); break;
      case 'vent': noise(0.3, 0.06, 1200); tone(900, 0.2, 'sine', 0.03); break;
      case 'vie': tone(1320, 0.06, 'sine', 0.05); setTimeout(() => tone(1760, 0.08, 'sine', 0.04), 70); break;
      case 'lumiere': [1568, 2093, 2637].forEach((f, i) => setTimeout(() => tone(f, 0.15, 'sine', 0.035), i * 50)); break;
      case 'foudre': tone(2200, 0.05, 'square', 0.04); noise(0.12, 0.1, 3000); break;
      case 'gravite': tone(110, 0.3, 'sine', 0.1); tone(55, 0.4, 'sine', 0.08); break;
      case 'temps': tone(392, 0.25, 'triangle', 0.06); setTimeout(() => tone(330, 0.35, 'triangle', 0.05), 220); break;
      case 'portail': { if (!ctx) break; const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime; o.frequency.setValueAtTime(900, t); o.frequency.exponentialRampToValueAtTime(220, t + 0.25); g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 0.35); break; }
      case 'esprit': tone(660, 0.3, 'sine', 0.03, 0.1); tone(990, 0.4, 'sine', 0.02, 0.15); break;
      case 'transmutation': tone(1046, 0.5, 'triangle', 0.04); tone(1568, 0.6, 'sine', 0.025); break;
      case 'contre': tone(1200, 0.06, 'square', 0.04); setTimeout(() => tone(1000, 0.08, 'square', 0.035), 90); break;
      case 'metamorphose': noise(0.2, 0.03, 4000); tone(1400, 0.1, 'sine', 0.03); break;
    }
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

  return { init, resume, sfx, toggleMute, isMuted, setMood, setVolumes, nappes, voix };
})();
