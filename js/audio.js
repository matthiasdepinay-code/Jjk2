'use strict';
// ---------- Sons génératifs (WebAudio) : doux, cosy, sans fichier externe ----------
const Son = (() => {
  let ctx = null, master = null, muted = false, ambient = null;
  const ELEM_FREQ = { feu: 220, vent: 392, eau: 330, terre: 147, lumiere: 523, ombre: 196, vie: 440, force: 262 };

  function init() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      startAmbient();
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
    o.connect(g); g.connect(master);
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
    src.connect(f); f.connect(g); g.connect(master);
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
    const g = ctx.createGain(); g.gain.value = 0.045; g.connect(master);
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
    ambient = { g, oscs };
  }
  function toggleMute() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 0.5;
    return muted;
  }
  function isMuted() { return muted; }

  return { init, resume, sfx, toggleMute, isMuted };
})();
