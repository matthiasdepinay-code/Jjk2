/* =========================================================================
   RITUEL — synthèse sonore
   Aucun fichier audio : tout est fabriqué à la volée. Le jeu respire.
   ========================================================================= */
(function (root) {
  'use strict';
  const JJK = (root.JJK = root.JJK || {});
  const { clamp } = JJK.core;

  let ctx = null, master = null, bus = {}, started = false, muted = false;
  let droneNodes = null, heartTimer = null, tension = 0;

  function ready() { return ctx && ctx.state === 'running' && !muted; }

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;

    /* compresseur : les impacts ne doivent pas saturer le drone */
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 12;
    comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.25;
    master.connect(comp); comp.connect(ctx.destination);

    /* réverbération par bruit décroissant : une salle en pierre */
    const rev = ctx.createConvolver();
    rev.buffer = impulse(2.6, 2.4);
    const revGain = ctx.createGain(); revGain.gain.value = 0.32;
    rev.connect(revGain); revGain.connect(master);
    bus.rev = rev;
    bus.dry = master;
  }

  function impulse(seconds, decay) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  function noiseBuffer(seconds) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function env(node, t0, a, d, peak, send) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
    node.connect(g);
    g.connect(bus.dry);
    if (send && bus.rev) { const s = ctx.createGain(); s.gain.value = send; g.connect(s); s.connect(bus.rev); }
    return g;
  }

  /* ---- drone : la nappe d'énergie maudite ---------------------------- */
  function startDrone() {
    if (!ctx || droneNodes) return;
    const t = ctx.currentTime;
    const g = ctx.createGain(); g.gain.value = 0.0001;
    g.gain.exponentialRampToValueAtTime(0.10, t + 6);
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = 220; filt.Q.value = 4;
    g.connect(filt); filt.connect(master);
    const send = ctx.createGain(); send.gain.value = 0.5; filt.connect(send); send.connect(bus.rev);

    const oscs = [];
    [36.71, 55.0, 73.42, 110.0, 164.81].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i < 2 ? 'sine' : 'sawtooth';
      o.frequency.value = f * (1 + (i - 2) * 0.0009);
      const og = ctx.createGain(); og.gain.value = [0.5, 0.35, 0.10, 0.07, 0.035][i];
      o.connect(og); og.connect(g); o.start(t);
      oscs.push(o);
    });
    /* souffle : du bruit très filtré, comme un couloir */
    const n = ctx.createBufferSource(); n.buffer = noiseBuffer(4); n.loop = true;
    const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 340; nf.Q.value = 0.7;
    const ng = ctx.createGain(); ng.gain.value = 0.05;
    n.connect(nf); nf.connect(ng); ng.connect(g); n.start(t);

    /* lent battement de filtre : la nappe n'est jamais immobile */
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.043;
    const lfoG = ctx.createGain(); lfoG.gain.value = 90;
    lfo.connect(lfoG); lfoG.connect(filt.frequency); lfo.start(t);

    droneNodes = { g, filt, oscs, n, lfo, ng };
  }

  function stopDrone(fade) {
    if (!droneNodes) return;
    const d = droneNodes; droneNodes = null;
    const t = ctx.currentTime;
    d.g.gain.cancelScheduledValues(t);
    d.g.gain.setValueAtTime(Math.max(0.0002, d.g.gain.value), t);
    d.g.gain.exponentialRampToValueAtTime(0.0001, t + (fade || 1.5));
    setTimeout(() => {
      try { d.oscs.forEach(o => o.stop()); d.n.stop(); d.lfo.stop(); } catch (e) {}
    }, (fade || 1.5) * 1000 + 200);
  }

  /* la tension monte : le filtre s'ouvre, la nappe devient présente */
  function setTension(v) {
    tension = clamp(v, 0, 1);
    if (!droneNodes || !ctx) return;
    const t = ctx.currentTime;
    droneNodes.filt.frequency.cancelScheduledValues(t);
    droneNodes.filt.frequency.setTargetAtTime(200 + tension * 900, t, 1.2);
    droneNodes.g.gain.setTargetAtTime(0.09 + tension * 0.09, t, 1.5);
  }

  /* ---- grains ponctuels ---------------------------------------------- */
  function tick(freq, dur, vol) {
    if (!ready()) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'square'; o.frequency.value = freq || 1400;
    env(o, t, 0.001, dur || 0.02, (vol == null ? 0.05 : vol), 0.05);
    o.start(t); o.stop(t + (dur || 0.02) + 0.05);
  }

  function hit(power) {
    if (!ready()) return;
    const t = ctx.currentTime, p = clamp(power == null ? 0.5 : power, 0, 1.6);
    /* corps : un sinus qui plonge */
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(180 + p * 120, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.16 + p * 0.1);
    env(o, t, 0.004, 0.30 + p * 0.2, 0.55 * p + 0.12, 0.25);
    o.start(t); o.stop(t + 0.7);
    /* claque : bruit passe-haut */
    const n = ctx.createBufferSource(); n.buffer = noiseBuffer(0.35);
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 900 + p * 1800;
    n.connect(f); env(f, t, 0.002, 0.11 + p * 0.08, 0.20 * p + 0.05, 0.35);
    n.start(t); n.stop(t + 0.4);
  }

  function slash() {
    if (!ready()) return;
    const t = ctx.currentTime;
    const n = ctx.createBufferSource(); n.buffer = noiseBuffer(0.5);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 3.5;
    f.frequency.setValueAtTime(5200, t);
    f.frequency.exponentialRampToValueAtTime(420, t + 0.19);
    n.connect(f); env(f, t, 0.005, 0.22, 0.30, 0.4);
    n.start(t); n.stop(t + 0.5);
  }

  function heal() {
    if (!ready()) return;
    const t = ctx.currentTime;
    [392.0, 523.25, 659.25, 783.99].forEach((f, i) => {
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
      env(o, t + i * 0.055, 0.02, 0.75, 0.075, 0.6);
      o.start(t + i * 0.055); o.stop(t + i * 0.055 + 0.9);
    });
  }

  /* le son du serment : deux notes qui se ferment comme une porte */
  function oath() {
    if (!ready()) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(146.83, t);
    o.frequency.exponentialRampToValueAtTime(97.99, t + 0.9);
    env(o, t, 0.02, 1.4, 0.30, 0.7);
    o.start(t); o.stop(t + 1.8);
    const n = ctx.createBufferSource(); n.buffer = noiseBuffer(1.2);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
    n.connect(f); env(f, t + 0.55, 0.01, 0.5, 0.13, 0.5);
    n.start(t + 0.55); n.stop(t + 1.6);
  }

  /* ---- l'extension du territoire : le sol se dérobe ------------------ */
  function domain() {
    if (!ready()) return;
    const t = ctx.currentTime;
    /* montée inversée : un souffle aspiré */
    const n = ctx.createBufferSource(); n.buffer = noiseBuffer(3);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(120, t);
    f.frequency.exponentialRampToValueAtTime(7000, t + 2.1);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 2.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.5);
    n.connect(f); f.connect(g); g.connect(master);
    if (bus.rev) { const s = ctx.createGain(); s.gain.value = 0.6; g.connect(s); s.connect(bus.rev); }
    n.start(t); n.stop(t + 3);

    /* chute sub : le coup au but */
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(85, t + 2.05);
    o.frequency.exponentialRampToValueAtTime(23, t + 4.0);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, t + 2.0);
    og.gain.exponentialRampToValueAtTime(0.72, t + 2.13);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 4.6);
    o.connect(og); og.connect(master);
    o.start(t + 2.0); o.stop(t + 4.8);

    /* cloche fêlée */
    [61.74, 92.5, 138.59, 233.08].forEach((fr, i) => {
      const b = ctx.createOscillator(); b.type = 'triangle';
      b.frequency.value = fr * (1 + i * 0.0031);
      env(b, t + 2.06, 0.006, 3.2 - i * 0.5, 0.16 / (i + 1) + 0.03, 0.85);
      b.start(t + 2.06); b.stop(t + 6);
    });
  }

  function whisper(len) {
    if (!ready()) return;
    const t = ctx.currentTime, d = len || 0.9;
    const n = ctx.createBufferSource(); n.buffer = noiseBuffer(d + 0.3);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 9;
    f.frequency.setValueAtTime(700, t);
    /* formants approximatifs : ça ne dit rien, et pourtant ça parle */
    for (let i = 0; i < 7; i++) {
      f.frequency.linearRampToValueAtTime(500 + Math.random() * 1500, t + (d * (i + 1)) / 7);
    }
    n.connect(f); env(f, t, 0.06, d, 0.075, 0.5);
    n.start(t); n.stop(t + d + 0.3);
  }

  function heartbeat(on, bpm) {
    if (heartTimer) { clearInterval(heartTimer); heartTimer = null; }
    if (!on || !ctx) return;
    const period = 60000 / (bpm || 72);
    const boom = (v) => {
      if (!ready()) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(72, t);
      o.frequency.exponentialRampToValueAtTime(31, t + 0.16);
      env(o, t, 0.006, 0.22, v, 0.12);
      o.start(t); o.stop(t + 0.45);
    };
    heartTimer = setInterval(() => { boom(0.30); setTimeout(() => boom(0.19), period * 0.22); }, period);
  }

  function toggleMute(force) {
    muted = (force == null) ? !muted : !!force;
    if (master) master.gain.setTargetAtTime(muted ? 0.0001 : 0.9, ctx.currentTime, 0.08);
    return muted;
  }
  function isMuted() { return muted; }

  function unlock() {
    if (started) { if (ctx && ctx.state === 'suspended') ctx.resume(); return; }
    started = true;
    init();
    if (ctx && ctx.state === 'suspended') ctx.resume();
    startDrone();
  }

  JJK.audio = {
    unlock, init, startDrone, stopDrone, setTension, tick, hit, slash, heal,
    oath, domain, whisper, heartbeat, toggleMute, isMuted,
    get started() { return started; },
  };
})(window);
