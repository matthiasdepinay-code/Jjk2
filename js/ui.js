'use strict';
// ---------- Interface DOM : création du personnage, éditeur de sceaux, chaudron, grimoire, HUD ----------
const UI = (() => {
  let game = null, open = null, selSlot = null, time = 0;
  let caulIngr = [null, null, null], caulSteps = [], grimTab = 'decouvertes', subSlot = null;
  let look = { nom: '', chapeau: 0, cape: 0, acc: 0 };
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  function init(g) {
    game = g;
    // fermetures
    $$('.panel .fermer').forEach((b) => b.addEventListener('click', () => close()));
    // --- création ---
    $('#create-nom').addEventListener('input', (e) => { look.nom = e.target.value; });
    buildChoices('#create-chapeaux', DATA.CHAPEAUX, (i) => { look.chapeau = i; refreshCreate(); });
    buildChoices('#create-capes', DATA.CAPES.map((c) => c.nom), (i) => { look.cape = i; refreshCreate(); }, DATA.CAPES.map((c) => c.c));
    buildChoices('#create-acc', DATA.ACCESSOIRES, (i) => { look.acc = i; refreshCreate(); });
    $('#create-go').addEventListener('click', () => { if (!look.nom.trim()) look.nom = 'Apprenti(e)'; game.setLook({ ...look }); close(); Son.sfx('unlock'); });
    // --- sceaux ---
    const sc = $('#seal-canvas');
    sc.addEventListener('click', (e) => onSealCanvasClick(e, sc));
    sc.addEventListener('contextmenu', (e) => { e.preventDefault(); onSealCanvasClick(e, sc, true); });
    $('#seal-nom').addEventListener('input', (e) => { game.editSeal.nom = e.target.value; });
    $('#seal-new').addEventListener('click', () => { game.editSeal = Seal.create(); selSlot = null; refreshSeal(); Son.sfx('click'); });
    $('#seal-save').addEventListener('click', () => {
      const s = Seal.clone(game.editSeal); if (!s.nom) s.nom = Seal.autoNom(s);
      const idx = game.seals.findIndex((q) => q.nom === s.nom);
      if (idx >= 0) game.seals[idx] = s; else game.seals.push(s);
      game.editSeal.nom = s.nom; game.save(); refreshSeal(); toast('Sceau « ' + s.nom + ' » consigné dans le grimoire.'); Son.sfx('pickup');
    });
    $('#seal-tobar').addEventListener('click', () => { const sp = $('#seal-slots'); sp.classList.toggle('hidden'); });
    buildSlotPicker('#seal-slots', (i) => {
      const s = Seal.clone(game.editSeal); if (!s.nom) s.nom = Seal.autoNom(s);
      game.hotbar[i] = { type: 'seal', seal: s }; game.save(); refreshHotbar(); $('#seal-slots').classList.add('hidden');
      toast('« ' + s.nom + ' » prêt dans l\'emplacement ' + (i + 1) + '.'); Son.sfx('pickup');
    });
    // --- chaudron ---
    for (const id in DATA.STEPS) {
      const b = el('button', 'btn-step', DATA.STEPS[id].icone + ' ' + DATA.STEPS[id].nom);
      b.addEventListener('click', () => { if (caulSteps.length < 3) { caulSteps.push(id); refreshCauldron(); Son.sfx('click'); } });
      $('#caul-stepbtns').appendChild(b);
    }
    $('#caul-brew').addEventListener('click', brew);
    $('#caul-clear').addEventListener('click', () => { caulIngr = [null, null, null]; caulSteps = []; refreshCauldron(); });
    // --- grimoire ---
    $$('#grim-tabs button').forEach((b) => b.addEventListener('click', () => { grimTab = b.dataset.tab; refreshGrimoire(); Son.sfx('click'); }));
    // --- hotbar ---
    const hb = $('#hotbar');
    for (let i = 0; i < 5; i++) {
      const s = el('div', 'slot');
      s.innerHTML = '<canvas width="56" height="56"></canvas><span class="key">' + (i + 1) + '</span><span class="count"></span>';
      s.addEventListener('click', () => { game.selected = i; refreshHotbar(); Son.sfx('click'); });
      s.addEventListener('contextmenu', (e) => { e.preventDefault(); if (game.hotbar[i]) { game.hotbar[i] = null; game.save(); refreshHotbar(); } });
      hb.appendChild(s);
    }
    $('#btn-mute').addEventListener('click', () => { const m = Son.toggleMute(); $('#btn-mute').textContent = m ? '🔇' : '🔊'; });
    $('#btn-help').addEventListener('click', () => openPanel('help'));
    $('#btn-grim').addEventListener('click', () => openPanel('grimoire'));
    $('#btn-lab').addEventListener('click', () => { if (game.state === 'world') game.goLab(); });
    $('#btn-restaurer').addEventListener('click', () => { if (confirm('Remettre le monde à neuf ? Tes découvertes et ton inventaire sont conservés.')) { close(); game.restaurerMonde(); } });
  }

  function buildChoices(sel, noms, cb, colors) {
    const c = $(sel);
    noms.forEach((n, i) => {
      const b = el('button', 'choice', colors ? '' : n);
      if (colors) { b.style.background = colors[i]; b.title = n; b.classList.add('swatch'); }
      b.addEventListener('click', () => { cb(i); $$(sel + ' .choice').forEach((q, k) => q.classList.toggle('on', k === i)); Son.sfx('click'); });
      if (i === 0) b.classList.add('on');
      c.appendChild(b);
    });
  }
  function buildSlotPicker(sel, cb) {
    const c = $(sel); c.innerHTML = '<span>Emplacement :</span>';
    for (let i = 0; i < 5; i++) { const b = el('button', 'btn-slot', String(i + 1)); b.addEventListener('click', () => cb(i)); c.appendChild(b); }
  }

  // ---------- Ouverture / fermeture ----------
  function openPanel(name) {
    close();
    open = name;
    $('#panel-' + name).classList.remove('hidden');
    $('#panels').classList.remove('hidden');
    if (name === 'seal') refreshSeal();
    if (name === 'cauldron') refreshCauldron();
    if (name === 'grimoire') { game.progress.nouveau = false; refreshGrimoire(); }
    if (name === 'create') { look = { ...game.look }; $('#create-nom').value = look.nom || ''; $$('#create-chapeaux .choice').forEach((q, k) => q.classList.toggle('on', k === look.chapeau)); $$('#create-capes .choice').forEach((q, k) => q.classList.toggle('on', k === look.cape)); $$('#create-acc .choice').forEach((q, k) => q.classList.toggle('on', k === look.acc)); refreshCreate(); }
  }
  function close() {
    open = null; selSlot = null;
    $$('.panel').forEach((p) => p.classList.add('hidden'));
    $('#panels').classList.add('hidden');
    $('#seal-slots').classList.add('hidden');
    const sl = $('#seal-sublist'); if (sl) sl.classList.add('hidden');
  }
  function isOpen() { return open; }

  // ---------- Création ----------
  function refreshCreate() {
    const c = $('#create-canvas'), ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    World.drawApprenti(ctx, c.width / 2, c.height - 20, 150, look, 1, 0, null, false);
  }

  // ---------- Éditeur de sceaux ----------
  function onSealCanvasClick(e, canvas, right = false) {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * (canvas.width / r.width), y = (e.clientY - r.top) * (canvas.height / r.height);
    const lay = Seal.layout(canvas.width / 2, canvas.height / 2 + 10, 150);
    const s = game.editSeal;
    const hit = (sl) => U.dist(x, y, sl.x, sl.y) <= sl.r * 1.3;
    let id = null;
    if (hit(lay.core)) id = 'core'; else if (hit(lay.shape)) id = 'shape'; else if (hit(lay.trigger)) id = 'trigger';
    else if (game.progress.fusion && hit(lay.core2)) id = 'core2';
    else for (let i = 0; i < 3; i++) if (hit(lay.mods[i])) id = 'mod' + i;
    if (!id) { selSlot = null; refreshSeal(); return; }
    if (id.startsWith('mod') && +id[3] >= game.progress.slots) { toast('Cet emplacement est encore scellé. Voir le grimoire.', 'warn'); return; }
    if (right || selSlot === id) {
      // vider
      if (id === 'core') s.core = null; else if (id === 'core2') s.core2 = null; else if (id === 'shape') s.shape = null; else if (id === 'trigger') s.trigger = null; else s.mods[+id[3]] = null;
      selSlot = null; Son.sfx('click');
    } else selSlot = id;
    refreshSeal();
  }
  function placeInSeal(kind, id) {
    const s = game.editSeal;
    if (kind === 'core') {
      if (selSlot === 'core2' || (game.progress.fusion && s.core && s.core !== id && !s.core2 && selSlot !== 'core')) { s.core2 = id; selSlot = null; }
      else { s.core = id; if (selSlot === 'core') selSlot = null; }
    }
    else if (kind === 'shape') { s.shape = id; if (selSlot === 'shape') selSlot = null; }
    else if (kind === 'trigger') { s.trigger = id; if (selSlot === 'trigger') selSlot = null; }
    else {
      let i = selSlot && selSlot.startsWith('mod') ? +selSlot[3] : s.mods.findIndex((m, k) => !m && k < game.progress.slots);
      if (i < 0) i = 0;
      if (i >= game.progress.slots) { toast('Aucun emplacement de modificateur libre.', 'warn'); return; }
      if (id === 'sous') { subSlot = i; showSubList(); return; }
      s.mods[i] = id; selSlot = null;
    }
    Son.sfx('cast', s.core || 'vent');
    refreshSeal();
  }
  function showSubList() {
    const box = $('#seal-sublist'); box.innerHTML = '<p class="intro">Quel sceau consigné emboîter ? Il sera lancé là où celui-ci éclate (deux niveaux au plus).</p>';
    const cands = game.seals.filter((q) => q.core && q.shape && Seal.depth(q) < 1 && q.nom !== game.editSeal.nom);
    if (!cands.length) box.appendChild(el('p', 'muted', 'Consigne d\'abord un sceau complet (sans sous-sceau).'));
    for (const q of cands) {
      const it = el('div', 'seal-item');
      const cv = document.createElement('canvas'); cv.width = 40; cv.height = 40; Seal.drawMini(cv.getContext('2d'), q, 20, 20, 17, 0);
      it.appendChild(cv); it.appendChild(el('span', '', q.nom + ' <small>(' + Seal.cost(q) + ')</small>'));
      it.addEventListener('click', () => { game.editSeal.mods[subSlot] = { sub: Seal.clone(q) }; selSlot = null; box.classList.add('hidden'); refreshSeal(); Son.sfx('cast', q.core); });
      box.appendChild(it);
    }
    const b = el('button', '', 'Annuler'); b.addEventListener('click', () => box.classList.add('hidden')); box.appendChild(b);
    box.classList.remove('hidden');
  }
  function refreshSeal() {
    const s = game.editSeal, p = game.progress;
    if (!('core2' in s)) s.core2 = null;
    $('#seal-nom').value = s.nom || '';
    $('#seal-nom').placeholder = Seal.autoNom(s);
    $('#seal-cost').textContent = Seal.cost(s);
    const st = Seal.etat(s);
    const e = $('#seal-etat'); e.textContent = st.ok ? (st.raison || 'Le sceau est complet et vibre doucement.') : st.raison; e.className = st.ok ? 'ok' : 'warn';
    // palette
    const pal = (sel, dict, list, kind) => {
      const c = $(sel); c.innerHTML = '';
      for (const id in dict) {
        const d = dict[id]; const unlocked = list.includes(id);
        const b = el('button', 'glyph-btn' + (unlocked ? '' : ' locked'));
        const cv = document.createElement('canvas'); cv.width = 44; cv.height = 44;
        const cx = cv.getContext('2d');
        if (unlocked) Seal.glyph(cx, id, 22, 22, 15, kind === 'core' ? d.couleur : U.INK, 1);
        else U.txt(cx, '?', 22, 22, 22, 'center', 'rgba(60,45,30,0.4)');
        b.appendChild(cv);
        b.appendChild(el('span', '', unlocked ? d.nom : '???'));
        b.appendChild(el('small', '', unlocked ? d.cout + ' encre' : ''));
        if (unlocked) {
          b.addEventListener('click', () => placeInSeal(kind, id));
          b.addEventListener('mouseenter', () => { $('#pal-desc').innerHTML = '<b>' + d.nom + '</b> — ' + d.desc; });
        } else {
          const u = DATA.UNLOCKS.find((q) => q.item === id || (Array.isArray(q.item) && q.item.includes(id)));
          b.addEventListener('mouseenter', () => { $('#pal-desc').innerHTML = '<b>Inconnu.</b> ' + (u ? 'Indice : ' + u.indice : ''); });
        }
        c.appendChild(b);
      }
    };
    pal('#pal-cores', DATA.CORES, p.cores, 'core');
    pal('#pal-shapes', DATA.SHAPES, p.shapes, 'shape');
    pal('#pal-mods', DATA.MODS, p.mods, 'mod');
    pal('#pal-triggers', DATA.TRIGGERS, p.triggers, 'trigger');
    // liste des sceaux enregistrés
    const list = $('#seal-list'); list.innerHTML = '';
    if (!game.seals.length) list.appendChild(el('p', 'muted', 'Aucun sceau consigné. Compose, puis « Consigner ».'));
    game.seals.forEach((q, i) => {
      const it = el('div', 'seal-item');
      const cv = document.createElement('canvas'); cv.width = 40; cv.height = 40;
      Seal.drawMini(cv.getContext('2d'), q, 20, 20, 17, 0);
      it.appendChild(cv);
      it.appendChild(el('span', '', q.nom + ' <small>(' + Seal.cost(q) + ')</small>'));
      const del = el('button', 'x', '✕'); del.title = 'Oublier ce sceau';
      del.addEventListener('click', (ev) => { ev.stopPropagation(); game.seals.splice(i, 1); game.save(); refreshSeal(); });
      it.appendChild(del);
      it.addEventListener('click', () => { game.editSeal = Seal.clone(q); selSlot = null; refreshSeal(); Son.sfx('click'); });
      list.appendChild(it);
    });
    drawSealCanvas();
  }
  function drawSealCanvas() {
    const c = $('#seal-canvas'); if (!c || open !== 'seal') return;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    Seal.draw(ctx, game.editSeal, c.width / 2, c.height / 2 + 10, 150, { t: time, slots: game.progress.slots, highlight: selSlot, empty: true, fusion: game.progress.fusion });
    const combo = Seal.comboName(game.editSeal);
    const hint = combo ? 'Fusion : ' + combo + '. ' + (DATA.COMBOS[[game.editSeal.core, game.editSeal.core2].sort().join('|')].desc || '') : selSlot === 'core2' ? 'Choisis un second glyphe d\'effet : les deux fusionnent.' : selSlot ? 'Choisis un glyphe dans la palette, ou clique à nouveau pour vider.' : game.progress.fusion ? 'Centre, formes, modificateurs, pointes. En bas : un second effet à fusionner.' : 'Clique un emplacement, puis un glyphe. Clic droit : vider.';
    U.txt(ctx, hint, c.width / 2, 16, 13, 'center', '#6b4f2a', 'IM Fell English', 'italic');
  }

  // ---------- Chaudron ----------
  function refreshCauldron() {
    const shelf = $('#caul-shelf'); shelf.innerHTML = '';
    for (const id in DATA.INGREDIENTS) {
      const I = DATA.INGREDIENTS[id]; const n = I.infini ? Infinity : (game.inv.ingredients[id] || 0);
      const vu = I.infini || game.progress.ingredientsVus.includes(id);
      const b = el('button', 'ingr-btn' + (n <= 0 ? ' locked' : ''));
      b.innerHTML = '<i style="background:' + I.couleur + '"></i><span>' + (vu ? I.nom : '???') + '</span><small>' + (I.infini ? '∞' : n) + '</small>';
      b.title = vu ? I.desc : 'Ingrédient inconnu';
      if (n > 0) b.addEventListener('click', () => { const i = caulIngr.indexOf(null); const used = caulIngr.filter((q) => q === id).length; if (i >= 0 && (I.infini || used < n)) { caulIngr[i] = id; refreshCauldron(); Son.sfx('click'); } });
      shelf.appendChild(b);
    }
    const slots = $('#caul-ingr'); slots.innerHTML = '';
    caulIngr.forEach((id, i) => {
      const d = el('div', 'caul-slot' + (id ? ' full' : ''));
      if (id) { const I = DATA.INGREDIENTS[id]; d.innerHTML = '<i style="background:' + I.couleur + '"></i><span>' + I.nom + '</span>'; d.addEventListener('click', () => { caulIngr[i] = null; refreshCauldron(); }); }
      else d.innerHTML = '<span class="muted">vide</span>';
      slots.appendChild(d);
    });
    const seq = $('#caul-seq'); seq.innerHTML = '';
    if (!caulSteps.length) seq.appendChild(el('span', 'muted', 'Aucune étape (clique ci-dessous).'));
    caulSteps.forEach((id, i) => { const b = el('button', 'step', (i + 1) + '. ' + DATA.STEPS[id].icone + ' ' + DATA.STEPS[id].nom); b.addEventListener('click', () => { caulSteps.splice(i, 1); refreshCauldron(); }); seq.appendChild(b); });
    // potions
    const pots = $('#caul-potions'); pots.innerHTML = '';
    const have = Object.entries(game.inv.potions).filter(([, n]) => n > 0);
    if (!have.length) pots.appendChild(el('p', 'muted', 'Aucune potion en réserve.'));
    for (const [id, n] of have) {
      const P = DATA.POTIONS[id];
      const it = el('div', 'potion-item');
      it.innerHTML = '<i style="background:' + P.couleur + '"></i><div><b>' + P.nom + '</b> ×' + n + '<br><small>' + P.desc + ' <em>(' + (P.usage === 'boire' ? 'à boire' : 'à lancer') + ')</em></small></div>';
      const bar = el('div', 'slotpick'); bar.innerHTML = '<span>→ barre :</span>';
      for (let i = 0; i < 5; i++) { const b = el('button', 'btn-slot', String(i + 1)); b.addEventListener('click', () => { game.hotbar[i] = { type: 'potion', id }; game.save(); refreshHotbar(); toast(P.nom + ' prête dans l\'emplacement ' + (i + 1) + '.'); Son.sfx('pickup'); }); bar.appendChild(b); }
      it.appendChild(bar);
      pots.appendChild(it);
    }
    // fioles de liquide (lançables)
    for (const id in DATA.INGREDIENTS) {
      const I = DATA.INGREDIENTS[id]; const n = game.inv.ingredients[id] || 0;
      if (!I.liquide || n <= 0) continue;
      const it = el('div', 'potion-item');
      it.innerHTML = '<i style="background:' + I.couleur + '"></i><div><b>' + I.nom + '</b> ×' + n + '<br><small>' + I.desc + ' <em>(à lancer)</em></small></div>';
      const bar = el('div', 'slotpick'); bar.innerHTML = '<span>→ barre :</span>';
      for (let i = 0; i < 5; i++) { const b = el('button', 'btn-slot', String(i + 1)); b.addEventListener('click', () => { game.hotbar[i] = { type: 'liquide', id }; game.save(); refreshHotbar(); toast(I.nom + ' prête dans l\'emplacement ' + (i + 1) + '.'); Son.sfx('pickup'); }); bar.appendChild(b); }
      it.appendChild(bar); pots.appendChild(it);
    }
    // recettes connues
    const rec = $('#caul-recettes'); rec.innerHTML = '';
    if (!game.progress.recettes.length) rec.appendChild(el('p', 'muted', 'Aucune recette connue. Essaie : cendre + eau de source, chauffer puis remuer.'));
    for (const id of game.progress.recettes) { const P = DATA.POTIONS[id]; rec.appendChild(el('div', 'recette', '<b>' + P.nom + '</b> : ' + P.ingr.map((i) => DATA.INGREDIENTS[i].nom).join(' + ') + ' → ' + P.etapes.map((s) => DATA.STEPS[s].nom).join(', '))); }
  }
  function brew() {
    const ingr = caulIngr.filter(Boolean);
    if (!ingr.length) { toast('Le chaudron est vide. Mets-y quelque chose.', 'warn'); return; }
    if (!caulSteps.length) { toast('Il faut au moins une étape : chauffer, remuer...', 'warn'); return; }
    const res = game.brew(ingr, caulSteps.slice());
    const out = $('#caul-result');
    if (res.ok) {
      const P = DATA.POTIONS[res.id];
      out.innerHTML = '<b style="color:' + P.couleur + '">' + P.nom + '</b> — ' + P.desc + (res.nouvelle ? ' <em>Nouvelle recette !</em>' : '');
      out.className = 'ok';
      caulIngr = [null, null, null]; caulSteps = [];
    } else {
      out.innerHTML = res.msg + (res.enigme ? '<br><em>Le grimoire murmure : « ' + res.enigme + ' »</em>' : '');
      out.className = 'warn';
    }
    refreshCauldron();
  }

  // ---------- Grimoire ----------
  function refreshGrimoire() {
    $$('#grim-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === grimTab));
    const c = $('#grim-content'); c.innerHTML = '';
    const p = game.progress;
    if (grimTab === 'decouvertes') {
      c.appendChild(el('p', 'intro', 'Chaque expérience réussie dévoile une page nouvelle. Les indices en italique montrent le chemin.'));
      for (const u of DATA.UNLOCKS) {
        const ok = p.done.includes(u.id);
        c.appendChild(el('div', 'decouverte' + (ok ? ' ok' : ''), '<span class="check">' + (ok ? '✓' : '○') + '</span><div><b>' + (ok ? u.titre : '???') + '</b><br><em>' + u.indice + '</em></div>'));
      }
    } else if (grimTab === 'glyphes') {
      const grp = (titre, dict, list, kind) => {
        c.appendChild(el('h3', '', titre));
        const g = el('div', 'glyph-grid');
        for (const id of list) {
          const d = dict[id];
          const it = el('div', 'glyph-card');
          const cv = document.createElement('canvas'); cv.width = 48; cv.height = 48;
          Seal.glyph(cv.getContext('2d'), id, 24, 24, 17, kind === 'core' ? d.couleur : U.INK, 1);
          it.appendChild(cv); it.appendChild(el('div', '', '<b>' + d.nom + '</b> <small>(' + d.cout + ' encre)</small><br>' + d.desc));
          g.appendChild(it);
        }
        c.appendChild(g);
      };
      grp('Glyphes d\'effet (centre)', DATA.CORES, p.cores, 'core');
      grp('Formes (premier anneau)', DATA.SHAPES, p.shapes, 'shape');
      grp('Modificateurs (second anneau) — ' + p.slots + ' emplacement(s)', DATA.MODS, p.mods, 'mod');
      grp('Déclencheurs (pointes)', DATA.TRIGGERS, p.triggers, 'trigger');
      if (p.fusion) {
        c.appendChild(el('h3', '', 'Fusions connues'));
        const known = Object.keys(DATA.COMBOS).filter((k) => k.split('|').every((q) => p.cores.includes(q)));
        if (!known.length) c.appendChild(el('p', 'muted', 'Aucune : il faut posséder les deux glyphes.'));
        for (const k of known) { const [a, b] = k.split('|'); const Cm = DATA.COMBOS[k]; c.appendChild(el('div', 'recette', '<b>' + Cm.nom + '</b> : ' + DATA.CORES[a].nom + ' + ' + DATA.CORES[b].nom + (Cm.desc ? ' — ' + Cm.desc : ''))); }
        c.appendChild(el('p', 'intro', 'Toute autre paire fusionne aussi : les deux effets s\'appliquent ensemble.'));
      }
      c.appendChild(el('p', 'intro', 'Déclencheurs : <b>Immédiat</b> agit en continu sur ce que le sort touche (un projectile traverse les créatures). <b>Au contact</b> éclate en zone à la première chose touchée. <b>Retardé</b> se fixe et éclate après deux secondes.'));
    } else if (grimTab === 'recettes') {
      c.appendChild(el('p', 'intro', 'Le chaudron accepte jusqu\'à trois ingrédients et trois étapes, dans l\'ordre. Les recettes inconnues ne sont que des énigmes.'));
      for (const id in DATA.POTIONS) {
        const P = DATA.POTIONS[id]; const ok = p.recettes.includes(id);
        c.appendChild(el('div', 'decouverte' + (ok ? ' ok' : ''), '<span class="check" style="color:' + P.couleur + '">' + (ok ? '●' : '○') + '</span><div><b>' + (ok ? P.nom : '???') + '</b><br>' + (ok ? P.ingr.map((i) => DATA.INGREDIENTS[i].nom).join(' + ') + ' → ' + P.etapes.map((s) => DATA.STEPS[s].nom).join(', ') + '<br><small>' + P.desc + '</small>' : '<em>' + P.enigme + '</em>') + '</div>'));
      }
    } else if (grimTab === 'ingredients') {
      for (const id in DATA.INGREDIENTS) {
        const I = DATA.INGREDIENTS[id]; const vu = I.infini || p.ingredientsVus.includes(id); const n = I.infini ? '∞' : (game.inv.ingredients[id] || 0);
        c.appendChild(el('div', 'decouverte' + (vu ? ' ok' : ''), '<span class="check"><i class="dot" style="background:' + (vu ? I.couleur : '#aaa') + '"></i></span><div><b>' + (vu ? I.nom : '???') + '</b> <small>×' + n + '</small><br><em>' + I.desc + '</em></div>'));
      }
    } else if (grimTab === 'intuitions') {
      c.appendChild(el('p', 'intro', 'L\'encyclopédie des réactions : chaque phénomène observé dehors s\'inscrit ici, et certains font germer des glyphes au bout de trois observations. Les orages, la lave, la glace et l\'acide sont de bons professeurs.'));
      for (const id in DATA.OBSERVATIONS) {
        const O = DATA.OBSERVATIONS[id]; const n = p.obs[id] || 0;
        const g = O.glyphe ? DATA.CORES[O.glyphe] : null; const connu = g && p.cores.includes(O.glyphe);
        c.appendChild(el('div', 'decouverte' + (n > 0 ? ' ok' : ''), '<span class="check">' + (n >= 3 || connu ? '✓' : n > 0 ? n : '○') + '</span><div><b>' + (n > 0 ? O.nom : '???') + '</b> ' + (g ? '<small>→ glyphe ' + (connu ? g.nom : '???') + '</small>' : '<small>(expérience)</small>') + '<br><em>' + O.desc + '</em></div>'));
      }
    } else if (grimTab === 'pages') {
      c.appendChild(el('p', 'intro', 'Le maître a semé des pages de son grimoire aux quatre coins du monde : en hauteur, au fond, dans le noir. Chacune apprend quelque chose.'));
      for (const P of DATA.PAGES) {
        const lu = p.pagesLues.includes(P.id);
        c.appendChild(el('div', 'decouverte' + (lu ? ' ok' : ''), '<span class="check">' + (lu ? '📜' : '○') + '</span><div><b>' + (lu ? P.titre : '???') + '</b><br><em>' + (lu ? '« ' + P.texte + ' »' : 'Page non retrouvée.') + '</em></div>'));
      }
    } else if (grimTab === 'defis') {
      c.appendChild(el('p', 'intro', 'Les épreuves du maître. Facultatives, mais chacune rapporte de l\'expérience, donc de l\'encre.'));
      for (const D of DATA.DEFIS) {
        const ok = p.defisFaits.includes(D.id);
        c.appendChild(el('div', 'decouverte' + (ok ? ' ok' : ''), '<span class="check">' + (ok ? '✓' : '○') + '</span><div><b>' + D.titre + '</b> <small>(+' + D.xp + ' exp.)</small><br><em>' + D.texte + '</em></div>'));
      }
    } else if (grimTab === 'journal') {
      const k = p.compteurs;
      c.appendChild(el('p', 'intro', 'Ce que ' + (game.look.nom || 'l\'apprenti(e)') + ' a accompli jusqu\'ici. Niveau ' + game.niveau + ', ' + game.xp + ' / ' + DATA.XP.parNiveau(game.niveau) + ' d\'expérience.'));
      const lines = [['Choses différentes touchées', k.kindsHit.length], ['Coups sur les mannequins', k.mannequin], ['Torches allumées', k.torches], ['Graines éveillées', k.graines], ['Golems repoussés par le vent', k.golemPousse], ['Blocs de glace fondus', k.glace], ['Runes déchiffrées', k.runes], ['Créatures apprivoisées', k.tames || 0], ['Potions brassées', k.potions || 0], ['Sceaux lancés', k.sorts || 0]];
      const t = el('table', 'journal'); for (const [a, b] of lines) t.appendChild(el('tr', '', '<td>' + a + '</td><td>' + b + '</td>')); c.appendChild(t);
    }
  }

  // ---------- HUD / barre ----------
  function refreshHotbar() {
    $$('#hotbar .slot').forEach((s, i) => {
      const e = game.hotbar[i];
      s.classList.toggle('on', game.selected === i);
      const cv = s.querySelector('canvas'), ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, 56, 56);
      const cnt = s.querySelector('.count');
      cnt.textContent = '';
      s.classList.remove('empty-potion');
      if (!e) return;
      if (e.type === 'seal') { Seal.drawMini(ctx, e.seal, 28, 28, 22, time); s.title = Seal.nom(e.seal) + ' (' + Seal.cost(e.seal) + ' encre)'; }
      else if (e.type === 'potion') { const P = DATA.POTIONS[e.id]; const n = game.inv.potions[e.id] || 0; drawFlaskIcon(ctx, 28, 30, P.couleur); cnt.textContent = '×' + n; s.title = P.nom; if (n <= 0) s.classList.add('empty-potion'); }
      else if (e.type === 'liquide') { const I = DATA.INGREDIENTS[e.id]; const n = game.inv.ingredients[e.id] || 0; drawFlaskIcon(ctx, 28, 30, I.couleur); cnt.textContent = '×' + n; s.title = I.nom + ' (à lancer)'; if (n <= 0) s.classList.add('empty-potion'); }
    });
  }
  function drawFlaskIcon(ctx, x, y, color) {
    ctx.save(); ctx.strokeStyle = U.INK; ctx.lineWidth = 1.5; ctx.fillStyle = color; ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.moveTo(x - 5, y - 20); ctx.lineTo(x - 5, y - 8); ctx.quadraticCurveTo(x - 16, y + 2, x - 14, y + 12); ctx.lineTo(x + 14, y + 12); ctx.quadraticCurveTo(x + 16, y + 2, x + 5, y - 8); ctx.lineTo(x + 5, y - 20); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; ctx.stroke();
    ctx.fillStyle = '#6b4f2a'; ctx.fillRect(x - 6, y - 24, 12, 5); ctx.restore();
  }
  function refreshHud(p, g) {
    $('#ink-fill').style.width = (100 * p.ink / p.inkMax) + '%';
    $('#ink-txt').textContent = Math.floor(p.ink) + ' / ' + p.inkMax;
    $('#hp-fill').style.width = (100 * Math.max(0, p.hp) / p.hpMax) + '%';
    if (g) { const need = DATA.XP.parNiveau(g.niveau); $('#xp-fill').style.width = (100 * g.xp / need) + '%'; $('#xp-txt').textContent = 'Niveau ' + g.niveau; }
    const sts = [];
    const names = { wet: 'Trempé(e)', stone: 'Peau de pierre', invisible: 'Invisible', lowgrav: 'Léger(ère)', jump: 'Bonds', small: 'Minuscule', vision: 'Vision', burning: 'En feu !', glide: 'Planeur', lumiere: 'Lumineux(se)', patins: 'Patins de givre', vitesse: 'Foudroyé(e)', dissous: 'Mains d\'acide', vol: 'En vol', branchies: 'Branchies', geant: 'Géant(e)', glisse: 'Savonné(e)', hate: 'Hâte', lent: 'Englué(e)', armure: 'Armure' };
    for (const k in p.sta) if (p.sta[k] > 0) sts.push('<span class="st ' + k + '">' + names[k] + ' ' + Math.ceil(p.sta[k]) + 's</span>');
    $('#statuts').innerHTML = sts.join('');
  }
  function setMode(state) {
    document.body.dataset.state = state;
  }
  function toast(msg, kind) {
    const t = el('div', 'toast ' + (kind || ''), msg);
    $('#toasts').appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 500); }, kind === 'unlock' ? 6000 : 3800);
    while ($('#toasts').children.length > 5) $('#toasts').firstChild.remove();
  }
  function zoneTitle(nom) {
    const z = $('#zone-name'); z.textContent = nom; z.classList.remove('show'); void z.offsetWidth; z.classList.add('show');
  }
  function tick(dt) {
    time += dt;
    if (open === 'seal') drawSealCanvas();
    if (open === 'create' && Math.floor(time * 10) % 3 === 0) refreshCreate();
    if (Math.floor(time * 30) % 2 === 0) refreshHotbarIcons();
  }
  function refreshHotbarIcons() {
    $$('#hotbar .slot').forEach((s, i) => { const e = game.hotbar[i]; if (e && e.type === 'seal') { const ctx = s.querySelector('canvas').getContext('2d'); ctx.clearRect(0, 0, 56, 56); Seal.drawMini(ctx, e.seal, 28, 28, 22, time); } });
  }

  return { init, openPanel, close, isOpen, refreshSeal, refreshCauldron, refreshGrimoire, refreshHotbar, refreshHud, toast, zoneTitle, tick, setMode };
})();
