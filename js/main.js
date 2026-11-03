'use strict';
// ---------- Boucle principale, états, sauvegarde, progression, expérience ----------
(() => {
  const VW = 1280, VH = 720;
  const SAVE_KEY = 'atelier-des-sceaux-v2';
  const WORLD_KEY = 'atelier-monde-v2';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  let paperPat = null;
  let last = 0, worldSaveT = 0;

  const inp = { left: false, right: false, up: false, down: false, jump: false, jumpHeld: false, interact: false, dig: false, mouse: { x: 640, y: 360, down: false } };
  window.__inp = inp;

  // ---------- Progression ----------
  function makeProgress() {
    return {
      cores: DATA.DEBUT.cores.slice(), shapes: DATA.DEBUT.shapes.slice(), mods: DATA.DEBUT.mods.slice(), triggers: DATA.DEBUT.triggers.slice(), slots: DATA.DEBUT.slots,
      recettes: [], ingredientsVus: [], done: [], nouveau: false, obs: {}, fusion: false,
      compteurs: { kindsHit: [], mannequin: 0, torches: 0, graines: 0, golemPousse: 0, glace: 0, runes: 0, tames: 0, potions: 0, sorts: 0, terre: 0, creaturesTouchees: 0, vols: 0, portes: 0, lancers: 0, niveau: 1, sceaux: 0 },
      event(name, data) {
        const k = this.compteurs;
        switch (name) {
          case 'hit': if (!k.kindsHit.includes(data)) k.kindsHit.push(data); break;
          case 'mannequin': k.mannequin++; break;
          case 'torche': k.torches++; break;
          case 'graine': k.graines++; break;
          case 'golemPousse': k.golemPousse++; break;
          case 'glace': k.glace++; break;
          case 'rune': k.runes++; break;
          case 'tame': k.tames++; break;
          case 'sort': k.sorts++; break;
          case 'terre': k.terre++; break;
          case 'creatureTouchee': k.creaturesTouchees++; break;
          case 'vol': k.vols++; break;
          case 'porte': k.portes++; break;
          case 'lancer': k.lancers++; break;
          case 'ingredient': if (!this.ingredientsVus.includes(data)) { this.ingredientsVus.push(data); game.addXp(DATA.XP.ingredient); } break;
          case 'recette': if (!this.recettes.includes(data)) { this.recettes.push(data); game.addXp(DATA.XP.recette); } k.potions++; break;
        }
        this.check();
      },
      check() {
        for (const u of DATA.UNLOCKS) {
          if (this.done.includes(u.id)) continue;
          if (!u.cond(this)) continue;
          this.done.push(u.id);
          if (u.type === 'core') { if (!this.cores.includes(u.item)) this.cores.push(u.item); }
          else if (u.type === 'shape') { if (!this.shapes.includes(u.item)) this.shapes.push(u.item); }
          else if (u.type === 'trigger') { if (!this.triggers.includes(u.item)) this.triggers.push(u.item); }
          else if (u.type === 'mods') for (const m of u.item) { if (!this.mods.includes(m)) this.mods.push(m); }
          else if (u.type === 'slot') this.slots = Math.max(this.slots, u.item);
          else if (u.type === 'fusion') this.fusion = true;
          this.nouveau = true;
          game.toast('✦ Découverte : ' + u.titre, 'unlock');
          Son.sfx('unlock');
          game.addXp(DATA.XP.decouverte);
          game.save();
          return this.check();
        }
      },
    };
  }

  // ---------- Jeu ----------
  const game = {
    state: 'create',
    look: { nom: '', chapeau: 0, cape: 0, acc: 0 },
    progress: makeProgress(),
    inv: { ingredients: {}, potions: {} },
    seals: [], hotbar: [null, null, null, null, null], selected: 0,
    editSeal: Seal.create(), lastPotion: null, started: false,
    xp: 0, niveau: 1,
    toast(m, k) { UI.toast(m, k); },
    zoneChange(nom) { UI.zoneTitle(nom); },
    gainIngredient(id) {
      this.inv.ingredients[id] = (this.inv.ingredients[id] || 0) + 1;
      const first = !this.progress.ingredientsVus.includes(id);
      this.progress.event('ingredient', id);
      this.toast((first ? 'Nouvel ingrédient : ' : '+1 ') + DATA.INGREDIENTS[id].nom + (first ? '. ' + DATA.INGREDIENTS[id].desc : ''));
      Son.sfx('pickup'); this.save();
    },
    observe(kind) {
      const O = DATA.OBSERVATIONS[kind]; if (!O) return;
      const n = (this.progress.obs[kind] || 0) + 1;
      this.progress.obs[kind] = n;
      if (n <= 3) { this.toast('✎ Intuition : ' + O.nom + (O.glyphe && !this.progress.cores.includes(O.glyphe) ? ' (' + Math.min(n, 3) + '/3)' : ''), n === 1 ? 'unlock' : ''); }
      this.addXp(DATA.XP.observation);
      this.progress.check(); this.save();
    },
    addXp(n) {
      this.xp += n;
      let need = DATA.XP.parNiveau(this.niveau);
      while (this.xp >= need) {
        this.xp -= need; this.niveau++;
        this.toast('✦ Niveau ' + this.niveau + ' : ton encre s\'approfondit.', 'unlock'); Son.sfx('unlock');
        this.progress.compteurs.niveau = this.niveau; this.progress.check();
        need = DATA.XP.parNiveau(this.niveau);
      }
      this.applyNiveau();
    },
    applyNiveau() {
      const w = World.state(); if (!w) return;
      w.p.inkMax = 40 + (this.niveau - 1) * DATA.XP.encreParNiveau;
      w.p.inkRegen = 1.8 + (this.niveau - 1) * DATA.XP.regenParNiveau;
    },
    setLook(l) {
      this.look = l;
      if (!this.started) {
        this.started = true;
        this.seals = DATA.DEBUT.sceaux.map((s) => Seal.clone(s));
        this.hotbar = [{ type: 'seal', seal: Seal.clone(this.seals[0]) }, { type: 'seal', seal: Seal.clone(this.seals[1]) }, { type: 'seal', seal: Seal.clone(this.seals[2]) }, null, null];
        UI.refreshHotbar();
        this.save(); this.goLab(true);
      } else this.save();
    },
    goLab(first) {
      this.state = 'lab'; UI.setMode('lab'); UI.close();
      const w = World.state(); if (w) { w.p.ink = w.p.inkMax; w.p.hp = w.p.hpMax; this.saveWorld(); }
      if (first) { this.toast('Bienvenue dans ton atelier, ' + this.look.nom + '. Trois sceaux t\'attendent déjà dans la barre.'); setTimeout(() => { if (this.state === 'lab' && !UI.isOpen()) UI.openPanel('help'); }, 600); }
      else this.toast('Tu te reposes au labo : encre et vitalité restaurées.');
      this.save();
    },
    goWorld() {
      if (!World.state()) {
        let saved = null;
        try { const raw = localStorage.getItem(WORLD_KEY); if (raw) saved = JSON.parse(raw); } catch (e) { saved = null; }
        World.ensure(this, saved);
      }
      this.applyNiveau();
      this.state = 'world'; UI.setMode('world'); UI.close();
      if (!this.hotbar.some(Boolean)) this.toast('Ta barre est vide ! Prépare un sceau à la table (« Mettre dans la barre »).', 'warn');
      Son.sfx('door');
    },
    saveWorld() {
      if (!World.state()) return;
      try { localStorage.setItem(WORLD_KEY, JSON.stringify(World.serialize())); } catch (e) { /* trop gros ou indisponible */ }
    },
    restaurerMonde() {
      try { localStorage.removeItem(WORLD_KEY); } catch (e) { }
      World.reset();
      this.toast('Le monde a été remis à neuf. Tes découvertes sont intactes.');
      if (this.state === 'world') this.goWorld();
    },
    brew(ingr, steps) {
      const norm = ingr.map((i) => (i === 'eau' ? 'eau_source' : i));
      const set = norm.slice().sort().join('|');
      const found = Object.values(DATA.POTIONS).find((P) => P.ingr.slice().sort().join('|') === set && P.etapes.join('|') === steps.join('|'));
      if (found) {
        for (const i of ingr) if (!DATA.INGREDIENTS[i].infini) this.inv.ingredients[i] = Math.max(0, (this.inv.ingredients[i] || 0) - 1);
        this.inv.potions[found.id] = (this.inv.potions[found.id] || 0) + 1;
        const nouvelle = !this.progress.recettes.includes(found.id);
        this.progress.event('recette', found.id);
        this.lastPotion = found.id; Son.sfx('brew'); this.save();
        this.toast((nouvelle ? 'Nouvelle recette : ' : 'Brassé : ') + found.nom + ' !');
        return { ok: true, id: found.id, nouvelle };
      }
      const candidates = Object.values(DATA.POTIONS).filter((P) => !this.progress.recettes.includes(P.id) && P.ingr.some((i) => norm.includes(i)));
      const partial = Object.values(DATA.POTIONS).find((P) => P.ingr.slice().sort().join('|') === set);
      const fails = ['Une bouillie grise qui sent la chaussette. Rien n\'est perdu, le chaudron a tout recraché.', 'Ça fume violet, puis plus rien. Le chaudron te regarde avec reproche.', 'Un gargouillis, une bulle énorme, pof. Les ingrédients retombent intacts.', 'Le mélange se solidifie en caillou, puis redevient poudre. Curieux.'];
      let msg = fails[Math.floor(Math.random() * fails.length)];
      let enigme = null;
      if (partial) { msg = 'Les ingrédients s\'accordent, mais la préparation n\'y est pas. ' + msg; enigme = partial.enigme; }
      else if (candidates.length) enigme = candidates[Math.floor(Math.random() * candidates.length)].enigme;
      Son.sfx('fail');
      return { ok: false, msg, enigme };
    },
    useSelected() {
      const e = this.hotbar[this.selected];
      if (!e) { this.toast('Emplacement vide. Prépare un sceau ou une potion au labo.', 'warn'); return; }
      const aim = World.toWorld(inp.mouse.x, inp.mouse.y);
      if (e.type === 'seal') { if (World.castSeal(e.seal, aim)) this.progress.event('sort'); }
      else if (e.type === 'potion') {
        const n = this.inv.potions[e.id] || 0;
        if (n <= 0) { this.toast('Plus de ' + DATA.POTIONS[e.id].nom + '. Retourne au chaudron.', 'warn'); Son.sfx('fail'); return; }
        if (World.usePotion(e.id, aim)) { this.inv.potions[e.id] = n - 1; UI.refreshHotbar(); this.save(); }
      } else if (e.type === 'liquide') {
        const n = this.inv.ingredients[e.id] || 0;
        if (n <= 0) { this.toast('Plus de ' + DATA.INGREDIENTS[e.id].nom + '. Remplis-en une (E près d\'un liquide).', 'warn'); Son.sfx('fail'); return; }
        if (World.useLiquid(e.id, aim)) { this.inv.ingredients[e.id] = n - 1; UI.refreshHotbar(); this.save(); }
      }
    },
    save() {
      this.progress.compteurs.sceaux = this.seals.length;
      try {
        const data = { look: this.look, started: this.started, inv: this.inv, seals: this.seals, hotbar: this.hotbar, lastPotion: this.lastPotion, xp: this.xp, niveau: this.niveau,
          progress: { cores: this.progress.cores, shapes: this.progress.shapes, mods: this.progress.mods, triggers: this.progress.triggers, slots: this.progress.slots, fusion: this.progress.fusion, recettes: this.progress.recettes, ingredientsVus: this.progress.ingredientsVus, done: this.progress.done, compteurs: this.progress.compteurs, obs: this.progress.obs } };
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      } catch (e) { /* stockage indisponible */ }
    },
    load() {
      try {
        const raw = localStorage.getItem(SAVE_KEY); if (!raw) return false;
        const d = JSON.parse(raw);
        this.look = d.look || this.look; this.started = !!d.started; this.inv = d.inv || this.inv; this.seals = d.seals || []; this.hotbar = d.hotbar || this.hotbar; this.lastPotion = d.lastPotion || null;
        this.xp = d.xp || 0; this.niveau = d.niveau || 1;
        if (d.progress) Object.assign(this.progress, d.progress);
        if (!this.progress.obs) this.progress.obs = {};
        const K = this.progress.compteurs; for (const k of ['terre', 'creaturesTouchees', 'vols', 'portes', 'lancers', 'sceaux']) if (K[k] == null) K[k] = 0; K.niveau = this.niveau;
        this.hotbar = this.hotbar.map((e) => (e && e.type === 'seal' ? { type: 'seal', seal: Seal.clone(e.seal) } : e)); this.seals = this.seals.map((q) => Seal.clone(q));
        return this.started;
      } catch (e) { return false; }
    },
    reset() { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(WORLD_KEY); location.reload(); },
  };
  game.inp = inp;
  window.game = game;

  // ---------- Entrées ----------
  function keyDir(code) {
    switch (code) {
      case 'ArrowLeft': case 'KeyA': case 'KeyQ': return 'left';
      case 'ArrowRight': case 'KeyD': return 'right';
      case 'ArrowUp': case 'KeyW': case 'KeyZ': return 'up';
      case 'ArrowDown': case 'KeyS': return 'down';
    }
    return null;
  }
  window.addEventListener('keydown', (e) => {
    Son.init(); Son.resume();
    if (e.target.tagName === 'INPUT') { if (e.code === 'Escape') e.target.blur(); return; }
    const d = keyDir(e.code); if (d) { inp[d] = true; e.preventDefault(); }
    if (e.code === 'Space') { if (!inp.jumpHeld) inp.jump = true; inp.jumpHeld = true; e.preventDefault(); }
    if (e.code === 'KeyE' || e.code === 'Enter') inp.interact = true;
    if (e.code === 'KeyX') inp.dig = true;
    if (/^Digit[1-5]$/.test(e.code)) { game.selected = +e.code[5] - 1; UI.refreshHotbar(); }
    if (e.code === 'KeyM') { const m = Son.toggleMute(); document.getElementById('btn-mute').textContent = m ? '🔇' : '🔊'; }
    if (e.code === 'KeyH') { if (UI.isOpen() === 'help') UI.close(); else UI.openPanel('help'); }
    if (e.code === 'KeyG' || e.code === 'Tab') { e.preventDefault(); if (UI.isOpen() === 'grimoire') UI.close(); else if (game.state !== 'create') UI.openPanel('grimoire'); }
    if (e.code === 'Escape') { if (UI.isOpen() && game.state !== 'create') UI.close(); }
    if (e.code === 'KeyR' && e.shiftKey && e.ctrlKey) { if (confirm('Effacer toute la sauvegarde et recommencer ?')) game.reset(); }
  });
  window.addEventListener('keyup', (e) => {
    const d = keyDir(e.code); if (d) inp[d] = false;
    if (e.code === 'Space') inp.jumpHeld = false;
    if (e.code === 'KeyX') inp.dig = false;
  });
  function mousePos(e) { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * (VW / r.width), y: (e.clientY - r.top) * (VH / r.height) }; }
  canvas.addEventListener('mousemove', (e) => { const m = mousePos(e); inp.mouse.x = m.x; inp.mouse.y = m.y; });
  canvas.addEventListener('mousedown', (e) => {
    Son.init(); Son.resume();
    const m = mousePos(e); inp.mouse.x = m.x; inp.mouse.y = m.y;
    if (UI.isOpen()) return;
    if (e.button === 2) { if (game.state === 'world') World.throwCarried(World.toWorld(m.x, m.y)); return; }
    if (e.button !== 0) return;
    inp.mouse.down = true;
    if (game.state === 'lab') {
      const id = Lab.click(m.x, m.y);
      if (!id) return;
      Son.sfx('click');
      if (id === 'table') UI.openPanel('seal');
      else if (id === 'chaudron') UI.openPanel('cauldron');
      else if (id === 'grimoire') UI.openPanel('grimoire');
      else if (id === 'miroir') UI.openPanel('create');
      else if (id === 'lettre') UI.openPanel('help');
      else if (id === 'porte') game.goWorld();
    } else if (game.state === 'world') game.useSelected();
  });
  window.addEventListener('mouseup', (e) => { if (e.button === 0) inp.mouse.down = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('wheel', (e) => { if (game.state !== 'world' || UI.isOpen()) return; game.selected = (game.selected + (e.deltaY > 0 ? 1 : 4)) % 5; UI.refreshHotbar(); e.preventDefault(); }, { passive: false });
  window.addEventListener('blur', () => { inp.left = inp.right = inp.up = inp.down = inp.jumpHeld = inp.dig = false; });
  window.addEventListener('beforeunload', () => { game.save(); game.saveWorld(); });

  function resize() {
    const app = document.getElementById('app');
    const s = Math.min(window.innerWidth / VW, window.innerHeight / VH);
    app.style.width = Math.floor(VW * s) + 'px'; app.style.height = Math.floor(VH * s) + 'px';
    app.style.setProperty('--s', s);
  }
  window.addEventListener('resize', resize);

  // ---------- Boucle ----------
  function frame(t) {
    const dt = Math.min(0.033, (t - last) / 1000 || 0.016); last = t;
    const open = UI.isOpen();
    if (game.state === 'lab') {
      Lab.update(dt, inp);
      Lab.draw(ctx, paperPat, inp, game.editSeal);
    } else if (game.state === 'world') {
      if (!open) {
        World.update(dt, inp, World.toWorld(inp.mouse.x, inp.mouse.y));
        if (inp.interact) World.interact();
        worldSaveT += dt; if (worldSaveT > 30) { worldSaveT = 0; game.saveWorld(); }
      }
      if (game.state === 'world') { World.draw(ctx, paperPat, inp, game.hotbar[game.selected]); UI.refreshHud(World.state().p, game); }
    } else {
      ctx.fillStyle = paperPat; ctx.fillRect(0, 0, VW, VH);
      U.txt(ctx, 'L\'Atelier des Sceaux', VW / 2, 120, 54, 'center', U.INK, 'IM Fell English SC');
    }
    inp.jump = false; inp.interact = false;
    UI.tick(dt);
    requestAnimationFrame(frame);
  }

  let booted = false;
  function start() {
    if (booted) return; booted = true;
    paperPat = ctx.createPattern(U.paper(512, 512, 7), 'repeat');
    resize();
    UI.init(game); Lab.init(game);
    const ok = game.load();
    UI.refreshHotbar();
    if (ok) { game.state = 'lab'; UI.setMode('lab'); game.toast('Bon retour, ' + game.look.nom + '.'); }
    else { game.state = 'create'; UI.setMode('create'); UI.openPanel('create'); }
    requestAnimationFrame(frame);
  }
  if (document.fonts && document.fonts.load) {
    Promise.all([document.fonts.load('18px "IM Fell English"'), document.fonts.load('18px "IM Fell English SC"')]).then(start, start);
    setTimeout(start, 1500);
  } else start();
})();
