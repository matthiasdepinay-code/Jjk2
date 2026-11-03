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
      recettes: [], ingredientsVus: [], done: [], nouveau: false, obs: {}, fusion: false, pagesLues: [], defisFaits: [], bestiaire: {}, especesVues: [], labo: { bac: false, alambic: false, terrarium: false, presse: false },
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
          case 'brule': k.brule = (k.brule || 0) + 1; return;
          case 'pousse': k.pousse = (k.pousse || 0) + 1; return;
          case 'portailEau': k.portailEau = (k.portailEau || 0) + 1; return;
          case 'combo': if (!k.combos) k.combos = []; if (!k.combos.includes(data)) k.combos.push(data); break;
          case 'ile': if (!k.iles) k.iles = []; if (!k.iles.includes(data)) k.iles.push(data); break;
          case 'cadeau': k.cadeaux = (k.cadeaux || 0) + 1; return;
          case 'espece': if (!this.especesVues.includes(data)) { this.especesVues.push(data); game.toast('Nouvelle espèce : ' + DATA.ESPECES[data].nom + '. ' + DATA.ESPECES[data].desc); game.addXp(DATA.XP.ingredient); } return;
          case 'bestiaire': { const b = this.bestiaire[data.t] || (this.bestiaire[data.t] = {}); if (!b[data.k]) { b[data.k] = true; const sp = DATA.ESPECES[data.t]; game.toast('Bestiaire : ' + sp.nom + ' ' + (data.k === 'aime' ? 'aime' : 'craint') + ' ' + DATA.CORES[sp[data.k]].nom.toLowerCase() + '.', 'unlock'); game.addXp(DATA.XP.observation); } break; }
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
          else if (u.type === 'labo') this.labo[u.item] = true;
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
    inv: { ingredients: {}, potions: {}, fortes: {}, parchemins: {}, terrarium: [] },
    seals: [], hotbar: [null, null, null, null, null], selected: 0,
    editSeal: Seal.create(), lastPotion: null, started: false,
    xp: 0, niveau: 1,
    courrier: { active: null, faites: [], pret: false, t: 0, exploitOk: false }, bonus: { encre: 0, vie: 0 }, trophees: [],
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
    lirePage(id) {
      const P = DATA.PAGES.find((q) => q.id === id); if (!P) return;
      const first = !this.progress.pagesLues.includes(id);
      if (first) this.progress.pagesLues.push(id);
      this.toast('📜 ' + P.titre + ' — « ' + P.texte + ' »', 'unlock');
      Son.sfx('unlock');
      if (first && P.don) {
        const d = P.don, p = this.progress;
        if (d.type === 'recette' && !p.recettes.includes(d.id)) { p.recettes.push(d.id); this.toast('Recette apprise : ' + DATA.POTIONS[d.id].nom + '.', 'unlock'); }
        else if (d.type === 'core' && !p.cores.includes(d.id)) { p.cores.push(d.id); p.nouveau = true; this.toast('✦ Glyphe appris : ' + DATA.CORES[d.id].nom, 'unlock'); }
        else if (d.type === 'fusion' && !p.fusion) { p.fusion = true; p.nouveau = true; this.toast('✦ La Fusion t\'est révélée.', 'unlock'); }
        else if (d.type === 'xp') this.addXp(d.n);
        this.addXp(DATA.XP.decouverte);
        p.check();
      }
      this.save();
    },
    // ---------- Courrier du maître ----------
    lettreCourante() { return DATA.LETTRES.find((l) => l.id === this.courrier.active) || null; },
    lettreSuivante() { return DATA.LETTRES.find((l) => !this.courrier.faites.includes(l.id)) || null; },
    tickCourrier(dt) {
      const c = this.courrier;
      if (c.active || c.pret) return;
      const next = this.lettreSuivante(); if (!next) return;
      c.t += dt;
      if (c.t >= (c.faites.length === 0 ? 40 : 110)) { c.pret = true; this.toast('Un corbeau survole le monde, une lettre dans le bec. Il t\'attend au labo.', 'unlock'); Son.sfx('unlock'); this.save(); }
    },
    ouvrirCourrier() {
      const c = this.courrier;
      if (c.pret && !c.active) { const l = this.lettreSuivante(); if (l) { c.active = l.id; c.pret = false; c.exploitOk = false; this.save(); } }
      UI.openPanel('courrier');
    },
    specEpreuve(seal) {
      const prm = Seal.params(seal);
      let cores = [seal.core]; if (seal.core2) cores.push(seal.core2);
      if (prm.inverse) cores = cores.map((q) => (q === 'gravite' ? q : DATA.INVERSE[q] || q));
      return { cores: cores.filter(Boolean), shape: seal.shape, persist: prm.persist, extra: prm.extra, echo: prm.echo, size: prm.size, combo: seal.core2 ? [seal.core, seal.core2].sort().join('|') : null, subs: Seal.subs(seal).length };
    },
    peutLivrer() {
      const l = this.lettreCourante(); if (!l) return false; const m = l.cmd;
      if (m.type === 'potion') return (this.inv.potions[m.id] || 0) >= m.n;
      if (m.type === 'ingredient') return (this.inv.ingredients[m.id] || 0) >= m.n;
      if (m.type === 'exploit') return this.courrier.exploitOk;
      return false;
    },
    livrer(seal) {
      const l = this.lettreCourante(); if (!l) return { ok: false };
      const m = l.cmd;
      if (m.type === 'sceau') {
        if (!seal || !seal.core || !seal.shape) return { ok: false, msg: 'Ce sceau est incomplet : le maître ne saura qu\'en faire.' };
        const E = DATA.EPREUVES[m.epreuve];
        if (!E.test(this.specEpreuve(seal))) { Son.sfx('fail'); return { ok: false, msg: 'Le corbeau revient avec un mot : « Pas tout à fait. ' + E.indice + ' »' }; }
      } else {
        if (!this.peutLivrer()) return { ok: false, msg: 'Il te manque encore ce que le maître demande.' };
        if (m.type === 'potion') this.inv.potions[m.id] -= m.n;
        if (m.type === 'ingredient') this.inv.ingredients[m.id] -= m.n;
      }
      // récompenses
      const recu = [];
      for (const d of l.don) {
        if (d.type === 'encre_max') { this.bonus.encre += d.n; recu.push('+' + d.n + ' d\'encre maximum'); }
        else if (d.type === 'ingredient') { this.inv.ingredients[d.id] = (this.inv.ingredients[d.id] || 0) + d.n; if (!this.progress.ingredientsVus.includes(d.id)) this.progress.ingredientsVus.push(d.id); recu.push(d.n + ' × ' + DATA.INGREDIENTS[d.id].nom); }
        else if (d.type === 'recette') { if (!this.progress.recettes.includes(d.id)) this.progress.recettes.push(d.id); recu.push('recette : ' + DATA.POTIONS[d.id].nom); }
        else if (d.type === 'trophee') { if (!this.trophees.includes(d.id)) this.trophees.push(d.id); recu.push('trophée : ' + DATA.TROPHEES[d.id].nom); }
        else if (d.type === 'xp') { this.addXp(d.n); recu.push('+' + d.n + ' d\'expérience'); }
      }
      this.courrier.faites.push(l.id); this.courrier.active = null; this.courrier.t = 0; this.courrier.exploitOk = false;
      this.applyNiveau(); this.addXp(DATA.XP.decouverte);
      Son.sfx('unlock'); this.toast('✉ Le corbeau repart. ' + l.merci, 'unlock');
      this.save();
      return { ok: true, merci: l.merci, recu };
    },
    bonusPermanent(k, n) { this.bonus[k] = (this.bonus[k] || 0) + n; this.applyNiveau(); this.save(); },
    checkDefis(w) {
      const p = this.progress;
      { const l = this.lettreCourante(); if (l && l.cmd.type === 'exploit' && !this.courrier.exploitOk) { let ok = false; try { ok = l.cmd.cond(p, w); } catch (e) { ok = false; } if (ok) { this.courrier.exploitOk = true; this.toast('✉ Exploit accompli : « ' + l.cmd.texte + ' ». Le corbeau attend ta réponse au labo.', 'unlock'); Son.sfx('unlock'); this.save(); } } }
      for (const d of DATA.DEFIS) {
        if (p.defisFaits.includes(d.id)) continue;
        let ok = false; try { ok = d.cond(p, w); } catch (e) { ok = false; }
        if (!ok) continue;
        p.defisFaits.push(d.id); p.nouveau = true;
        this.toast('✦ Défi relevé : ' + d.titre + ' (+' + d.xp + ' exp.)', 'unlock'); Son.sfx('unlock');
        this.addXp(d.xp); this.save();
      }
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
      w.p.inkMax = 40 + (this.niveau - 1) * DATA.XP.encreParNiveau + (this.bonus.encre || 0);
      w.p.hpMax = 10 + (this.bonus.vie || 0);
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
      this.terrariumCadeaux();
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
    distiller(id) {
      if ((this.inv.potions[id] || 0) < 2) { this.toast('Il faut deux fioles identiques pour en distiller une.', 'warn'); return false; }
      this.inv.potions[id] -= 2; this.inv.fortes[id] = (this.inv.fortes[id] || 0) + 1;
      Son.sfx('brew'); this.toast(DATA.POTIONS[id].nom + ' distillée : effet doublé.'); this.save(); return true;
    },
    presser(seal) {
      if ((this.inv.ingredients.poussiere || 0) < 1) { this.toast('La presse demande une poussière de pierre par tirage.', 'warn'); return false; }
      this.inv.ingredients.poussiere--;
      const nom = seal.nom || Seal.autoNom(seal);
      const q = this.inv.parchemins[nom] || (this.inv.parchemins[nom] = { seal: Seal.clone(seal), n: 0 });
      q.n += 3; Son.sfx('pickup'); this.toast('Trois parchemins « ' + nom + ' » : se lancent sans encre.'); this.save(); return true;
    },
    terrariumAjoute(t) {
      this.inv.terrarium.push({ t, last: Date.now() });
      this.toast(DATA.ESPECES[t].nom + ' s\'installe dans le terrarium. Il t\'offrira des cadeaux à chaque visite.'); this.save();
    },
    terrariumRelache(i) {
      const q = this.inv.terrarium.splice(i, 1)[0]; if (!q) return;
      World.relacher(q.t); this.toast(DATA.ESPECES[q.t].nom + ' retourne dehors, apprivoisé(e).'); this.save();
    },
    terrariumCadeaux() {
      const now = Date.now();
      for (const q of this.inv.terrarium) { const sp = DATA.ESPECES[q.t]; if (sp && sp.drop && now - q.last > 240000) { q.last = now; this.gainIngredient(sp.drop); } }
    },
    brew(ingr, steps) {
      const norm = ingr.map((i) => (i === 'eau' ? 'eau_source' : i));
      const set = norm.slice().sort().join('|');
      const found = Object.values(DATA.POTIONS).find((P) => P.ingr && P.ingr.slice().sort().join('|') === set && P.etapes.join('|') === steps.join('|'));
      if (found) {
        for (const i of ingr) if (!DATA.INGREDIENTS[i].infini) this.inv.ingredients[i] = Math.max(0, (this.inv.ingredients[i] || 0) - 1);
        this.inv.potions[found.id] = (this.inv.potions[found.id] || 0) + 1;
        const nouvelle = !this.progress.recettes.includes(found.id);
        this.progress.event('recette', found.id);
        this.lastPotion = found.id; Son.sfx('brew'); this.save();
        this.toast((nouvelle ? 'Nouvelle recette : ' : 'Brassé : ') + found.nom + ' !');
        return { ok: true, id: found.id, nouvelle };
      }
      const candidates = Object.values(DATA.POTIONS).filter((P) => P.ingr && !this.progress.recettes.includes(P.id) && P.ingr.some((i) => norm.includes(i)));
      const partial = Object.values(DATA.POTIONS).find((P) => P.ingr && P.ingr.slice().sort().join('|') === set);
      const fails = ['Une bouillie qui sent la chaussette. Les ingrédients rares sont recrachés intacts.', 'Ça fume violet, puis ça se calme. Le chaudron te regarde avec reproche.', 'Un gargouillis, une bulle énorme, pof.', 'Le mélange se solidifie en caillou, puis redevient liquide. Curieux.'];
      let msg = fails[Math.floor(Math.random() * fails.length)];
      let enigme = null;
      if (partial) { msg = 'Les ingrédients s\'accordent, mais la préparation n\'y est pas. ' + msg; enigme = partial.enigme; }
      else if (candidates.length) enigme = candidates[Math.floor(Math.random() * candidates.length)].enigme;
      // potion bizarre selon la famille dominante
      const fam = {}; for (const i of norm) { const f = DATA.FAMILLES[i] || 'frais'; fam[f] = (fam[f] || 0) + 1; }
      const dom = Object.keys(fam).sort((a, b) => fam[b] - fam[a])[0];
      const biz = Object.values(DATA.BIZARRES).find((B) => B.famille === dom) || DATA.BIZARRES.hoquet;
      this.inv.potions[biz.id] = (this.inv.potions[biz.id] || 0) + 1;
      this.lastPotion = biz.id;
      if (!this.progress.bizarresVues) this.progress.bizarresVues = [];
      if (!this.progress.bizarresVues.includes(biz.id)) { this.progress.bizarresVues.push(biz.id); this.addXp(DATA.XP.ingredient); }
      msg += ' Il en reste tout de même une fiole : <b>' + biz.nom + '</b>.';
      Son.sfx('fail'); this.save();
      return { ok: false, msg, enigme, bizarre: biz.id };
    },
    // Indices sensoriels du chaudron pour la préparation en cours
    sens(ingr, steps) {
      const norm = ingr.map((i) => (i === 'eau' ? 'eau_source' : i));
      if (!norm.length) return null;
      const fam = {}; for (const i of norm) { const f = DATA.FAMILLES[i] || 'frais'; fam[f] = (fam[f] || 0) + 1; }
      const dom = Object.keys(fam).sort((a, b) => fam[b] - fam[a])[0];
      const cols = norm.map((i) => DATA.INGREDIENTS[i].couleur);
      // meilleure recette candidate
      let best = null, bs = -1;
      for (const P of Object.values(DATA.POTIONS)) {
        if (!P.ingr) continue;
        const inter = P.ingr.filter((i) => norm.includes(i)).length;
        const extra = norm.filter((i) => !P.ingr.includes(i)).length;
        let sc = inter * 2 - extra * 1.5;
        for (let k = 0; k < steps.length; k++) sc += steps[k] === P.etapes[k] ? 1 : -2;
        if (sc > bs) { bs = sc; best = P; }
      }
      const lines = [];
      lines.push((DATA.ODEURS[dom] || 'ça sent bizarre') + '.');
      if (steps.length) lines.push(steps.map((st) => DATA.BRUITS[st]).join(', ') + '.');
      if (best && bs > 0) {
        const exact = best.ingr.slice().sort().join('|') === norm.slice().sort().join('|');
        const stepsOk = steps.every((st, k) => st === best.etapes[k]);
        if (exact && stepsOk && steps.length === best.etapes.length) lines.push('Le mélange frémit et prend une teinte franche : c\'est prêt à brasser.');
        else if (exact && stepsOk) lines.push('Les ingrédients s\'accordent. ' + (steps.length ? 'La préparation prend bonne tournure, il manque encore une étape.' : 'Reste à trouver la préparation.'));
        else if (exact && !stepsOk) lines.push('Les ingrédients s\'accordent, mais la dernière étape a fait tourner le mélange.');
        else if (!exact && stepsOk && best.ingr.filter((i) => norm.includes(i)).length >= 1) {
          const manque = best.ingr.find((i) => !norm.includes(i)); const extra = norm.find((i) => !best.ingr.includes(i));
          if (extra) lines.push('Quelque chose de ' + (DATA.FAMILLES[extra] || 'bizarre') + ' est de trop.');
          else if (manque) lines.push('Il manque quelque chose de ' + (DATA.FAMILLES[manque] || 'bizarre') + (this.progress.ingredientsVus.includes(manque) || DATA.INGREDIENTS[manque].infini ? '' : ', que tu n\'as encore jamais vu') + '.');
        } else lines.push('Le mélange reste terne.');
      } else lines.push('Le mélange reste terne : rien ne s\'accorde vraiment.');
      return { couleur: cols, lines, dom };
    },
    useSelected() {
      const e = this.hotbar[this.selected];
      if (!e) { this.toast('Emplacement vide. Prépare un sceau ou une potion au labo.', 'warn'); return; }
      const aim = World.toWorld(inp.mouse.x, inp.mouse.y);
      if (e.type === 'seal') { if (World.castSeal(e.seal, aim)) this.progress.event('sort'); }
      else if (e.type === 'parchemin') {
        const q = this.inv.parchemins[e.nom];
        if (!q || q.n <= 0) { this.toast('Plus de parchemin « ' + e.nom + ' ». Retourne à la presse.', 'warn'); Son.sfx('fail'); return; }
        if (World.castSeal(q.seal, aim, true)) { q.n--; this.progress.event('sort'); UI.refreshHotbar(); this.save(); }
      }
      else if (e.type === 'potion') {
        const store = e.forte ? this.inv.fortes : this.inv.potions;
        const n = store[e.id] || 0;
        if (n <= 0) { this.toast('Plus de ' + DATA.POTIONS[e.id].nom + (e.forte ? ' distillée' : '') + '. Retourne au ' + (e.forte ? 'à l\'alambic' : 'chaudron') + '.', 'warn'); Son.sfx('fail'); return; }
        if (World.usePotion(e.id, aim, e.forte)) { store[e.id] = n - 1; UI.refreshHotbar(); this.save(); }
      } else if (e.type === 'liquide') {
        const n = this.inv.ingredients[e.id] || 0;
        if (n <= 0) { this.toast('Plus de ' + DATA.INGREDIENTS[e.id].nom + '. Remplis-en une (E près d\'un liquide).', 'warn'); Son.sfx('fail'); return; }
        if (World.useLiquid(e.id, aim)) { this.inv.ingredients[e.id] = n - 1; UI.refreshHotbar(); this.save(); }
      }
    },
    save() {
      this.progress.compteurs.sceaux = this.seals.length;
      try {
        const data = { courrier: this.courrier, bonus: this.bonus, trophees: this.trophees, look: this.look, started: this.started, inv: this.inv, seals: this.seals, hotbar: this.hotbar, lastPotion: this.lastPotion, xp: this.xp, niveau: this.niveau,
          progress: { labo: this.progress.labo, cores: this.progress.cores, shapes: this.progress.shapes, mods: this.progress.mods, triggers: this.progress.triggers, slots: this.progress.slots, fusion: this.progress.fusion, recettes: this.progress.recettes, ingredientsVus: this.progress.ingredientsVus, done: this.progress.done, compteurs: this.progress.compteurs, obs: this.progress.obs, pagesLues: this.progress.pagesLues, defisFaits: this.progress.defisFaits, bizarresVues: this.progress.bizarresVues || [], bestiaire: this.progress.bestiaire, especesVues: this.progress.especesVues } };
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      } catch (e) { /* stockage indisponible */ }
    },
    load() {
      try {
        const raw = localStorage.getItem(SAVE_KEY); if (!raw) return false;
        const d = JSON.parse(raw);
        this.look = d.look || this.look; this.started = !!d.started; this.inv = d.inv || this.inv; this.seals = d.seals || []; this.hotbar = d.hotbar || this.hotbar; this.lastPotion = d.lastPotion || null;
        this.xp = d.xp || 0; this.niveau = d.niveau || 1;
        if (d.courrier) this.courrier = Object.assign(this.courrier, d.courrier); if (d.bonus) this.bonus = Object.assign(this.bonus, d.bonus); if (d.trophees) this.trophees = d.trophees;
        if (d.progress) Object.assign(this.progress, d.progress);
        if (!this.progress.obs) this.progress.obs = {};
        if (!this.progress.pagesLues) this.progress.pagesLues = []; if (!this.progress.defisFaits) this.progress.defisFaits = [];
        if (!this.progress.bestiaire) this.progress.bestiaire = {}; if (!this.progress.especesVues) this.progress.especesVues = [];
        if (!this.progress.labo) this.progress.labo = { bac: false, alambic: false, terrarium: false, presse: false };
        if (!this.inv.fortes) this.inv.fortes = {}; if (!this.inv.parchemins) this.inv.parchemins = {}; if (!this.inv.terrarium) this.inv.terrarium = [];
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
      else if (id === 'corbeau') game.ouvrirCourrier();
      else if (id === 'trophees') { UI.openPanel('grimoire'); UI.grimTab('lettres'); }
      else if (id === 'alambic' || id === 'presse' || id === 'terrarium' || id === 'bac') { if (game.progress.labo[id]) UI.openPanel(id); else { const u = DATA.UNLOCKS.find((q) => q.item === id && q.type === 'labo'); game.toast('Ce poste est encore scellé. ' + (u ? 'Indice : ' + u.indice : ''), 'warn'); } }
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
        game.tickCourrier(dt);
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
