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
    $('#create-hasard').addEventListener('click', () => { const r = (n) => Math.floor(Math.random() * n); Object.assign(look, { peau: r(Perso.PEAUX.length), coiffure: r(Perso.COIFFURES.length), cheveux: r(Perso.TEINTES.length), chapeau: r(Perso.CHAPEAUX.length), chapeauC: r(Perso.ETOFFES.length + 1) - 1, cape: r(DATA.CAPES.length), robe: r(Perso.ETOFFES.length + 1) - 1, echarpe: r(Perso.ECHARPES.length), acc: r(Perso.OBJETS.length) }); majChoixCreation(); Son.sfx('click'); });
    $('#create-go').addEventListener('click', () => { if (!look.nom.trim()) look.nom = 'Apprenti(e)'; game.setLook({ ...look }); close(); Son.sfx('unlock'); });
    // --- sceaux ---
    const sc = $('#seal-canvas');
    sc.addEventListener('click', (e) => { if (performance.now() - finGlisse < 350) return; onSealCanvasClick(e, sc); });
    sc.addEventListener('contextmenu', (e) => { e.preventDefault(); if (glisse) return; onSealCanvasClick(e, sc, true); });
    // saisir un glyphe posé : on le déplace sur une autre case, ou hors du cercle pour le retirer
    sc.addEventListener('pointermove', (e) => { if (glisse && glisse.actif) return; const sid = slotSous(e.clientX, e.clientY, null); const v = sid && lireSlot(game.editSeal, sid); survolCase = v != null && v !== false ? sid : null; if (survolCase) decrireCase(survolCase); });
    sc.addEventListener('pointerleave', () => { survolCase = null; });
    sc.addEventListener('pointerdown', (e) => { const sid = slotSous(e.clientX, e.clientY, null); if (!sid || !slotDispo(sid)) return; const v = lireSlot(game.editSeal, sid); if (v == null) return; preparerGlisser(e, { kind: genreDe(sid), id: v, from: sid, copie: e.shiftKey }); });
    document.addEventListener('pointermove', bougerGlisser);
    document.addEventListener('pointerup', lacherGlisser);
    document.addEventListener('pointercancel', () => annulerGlisser());
    document.addEventListener('touchmove', (e) => { if (glisse && glisse.actif) e.preventDefault(); }, { passive: false });
    $('#seal-annuler').addEventListener('click', () => annuler());
    $('#seal-refaire').addEventListener('click', () => refaire());
    // raccourcis de la table : annuler, refaire, retirer le glyphe choisi, désélectionner
    window.addEventListener('keydown', (e) => {
      if (open !== 'seal' || e.target.tagName === 'INPUT') return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.code === 'KeyZ') { e.preventDefault(); e.stopImmediatePropagation(); if (e.shiftKey) refaire(); else annuler(); }
      else if (mod && e.code === 'KeyY') { e.preventDefault(); e.stopImmediatePropagation(); refaire(); }
      else if (e.code === 'Backspace' && recherche) { e.preventDefault(); e.stopImmediatePropagation(); recherche = recherche.slice(0, -1); rechercheT = performance.now(); majRecherche(); }
      else if ((e.code === 'Delete' || e.code === 'Backspace') && selSlot) { e.preventDefault(); e.stopImmediatePropagation(); retirer(selSlot); refreshSeal(); }
      else if (e.code === 'Escape' && recherche) { e.stopImmediatePropagation(); recherche = ''; majRecherche(); }
      else if (e.code === 'Escape' && (selSlot || glisse)) { e.stopImmediatePropagation(); annulerGlisser(); selSlot = null; refreshSeal(); }
      else if (e.code === 'Escape' && pile.length) { e.stopImmediatePropagation(); remonter(); }
      else if (/^Arrow/.test(e.code) && !mod) { e.preventDefault(); e.stopImmediatePropagation(); naviguer(e.code); }
      else if (e.code === 'Enter' && trouve) { e.preventDefault(); e.stopImmediatePropagation(); const b = trouve; recherche = ''; majRecherche(); finGlisse = 0; b.click(); }
      else if (!mod && !e.altKey && e.key && e.key.length === 1 && /[a-zA-Zàâçéèêëîïôûùüÿœ' -]/.test(e.key)) { e.preventDefault(); e.stopImmediatePropagation(); if (performance.now() - rechercheT > 1800) recherche = ''; recherche += e.key; rechercheT = performance.now(); majRecherche(); }
    }, true);
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
    $$('#grim-tabs button').forEach((b) => b.addEventListener('click', () => { grimTab = b.dataset.tab; refreshGrimoire(); $('#panel-grimoire').scrollTop = 0; Son.sfx('click'); }));
    // --- hotbar ---
    const hb = $('#hotbar');
    for (let i = 0; i < 5; i++) {
      const s = el('div', 'slot');
      s.innerHTML = '<canvas width="56" height="56"></canvas><span class="key">' + (i + 1) + '</span><span class="count"></span>';
      s.addEventListener('click', () => { if (game.mainTactile === 'L' && game.progress.deuxMains) game.selectedL = i; else game.selected = i; refreshHotbar(); Son.sfx('click'); });
      s.addEventListener('contextmenu', (e) => { e.preventDefault(); if (document.body.classList.contains('tactile')) return; if (game.hotbar[i]) { game.hotbar[i] = null; game.save(); refreshHotbar(); } });
      hb.appendChild(s);
    }
    $('#btn-mute').addEventListener('click', () => { const m = Son.toggleMute(); $('#btn-mute').textContent = m ? '🔇' : '🔊'; });
    $('#btn-help').addEventListener('click', () => openPanel('help'));
    $('#btn-opt').addEventListener('click', () => openPanel('options'));
    $('#btn-grim').addEventListener('click', () => openPanel('grimoire'));
    $('#btn-lab').addEventListener('click', () => { if (game.state === 'world') game.goLab(); });
    $$('#hotbar .slot').forEach(() => {});
    $('#btn-restaurer').addEventListener('click', () => { if (confirm('Remettre le monde à neuf ? Tes découvertes et ton inventaire sont conservés.')) { close(); game.restaurerMonde(); } });
  }

  // choix de la création : [{v, label, color}]
  const CHOIX_CREATION = () => [
    ['peau', '#create-peau', Perso.PEAUX.map((c, i) => ({ v: i, color: c, label: 'Teint ' + (i + 1) }))],
    ['coiffure', '#create-coiffure', Perso.COIFFURES.map((n, i) => ({ v: i, label: n }))],
    ['cheveux', '#create-cheveux', Perso.TEINTES.map((c, i) => ({ v: i, color: c, label: 'Teinte ' + (i + 1) }))],
    ['chapeau', '#create-chapeau', Perso.CHAPEAUX.map((n, i) => ({ v: i, label: n }))],
    ['chapeauC', '#create-chapeauC', [{ v: -1, label: 'Comme la cape' }].concat(Perso.ETOFFES.map((c, i) => ({ v: i, color: c, label: 'Étoffe ' + (i + 1) })))],
    ['cape', '#create-cape', DATA.CAPES.map((c, i) => ({ v: i, color: c.c, label: c.nom }))],
    ['robe', '#create-robe', [{ v: -1, label: 'Assortie' }].concat(Perso.ETOFFES.map((c, i) => ({ v: i, color: c, label: 'Étoffe ' + (i + 1) })))],
    ['echarpe', '#create-echarpe', Perso.ECHARPES.map((n, i) => ({ v: i, label: n, color: Perso.ECH_C[i] || null }))],
    ['acc', '#create-acc', Perso.OBJETS.map((n, i) => ({ v: i, label: n }))],
  ];
  function construireCreation() {
    for (const [cle, sel, items] of CHOIX_CREATION()) {
      const c = $(sel); c.innerHTML = '';
      for (const it of items) {
        const b = el('button', 'choice' + (it.color ? ' swatch' : ''), it.color ? '' : it.label);
        if (it.color) { b.style.background = it.color; b.title = it.label; }
        b.dataset.v = it.v;
        b.addEventListener('click', () => { look[cle] = it.v; majChoixCreation(); Son.sfx('click'); });
        c.appendChild(b);
      }
    }
  }
  // les compagnons au miroir : une tenue par mascotte, dessinées et animées
  const tenuesCv = [];
  function construireCompagnons() {
    const c = $('#create-compagnons'); if (!c) return; c.innerHTML = ''; tenuesCv.length = 0;
    const R = game.compagnons || (game.compagnons = { actif: true, gribouille: 'classique', grum: 'classique' });
    const gagnees = game.progress.tenues || [];
    for (const qui of ['gribouille', 'grum']) {
      c.appendChild(el('h3', '', (qui === 'grum' ? 'Grum' : 'Gribouille') + ' <small>' + (qui === 'grum' ? 'golem loyal et gourmand' : 'mage théâtral, génie autoproclamé') + '</small>'));
      const box = el('div', 'tenues');
      for (const T of DATA.TENUES_MASCOTTES[qui]) {
        const ok = T.id === 'classique' || gagnees.includes(qui + ':' + T.id), A = Mascottes.TENUES[qui][T.id];
        const b = el('button', 'tenue' + (R[qui] === T.id ? ' on' : '') + (ok ? '' : ' locked'));
        const cv = document.createElement('canvas'); cv.width = 112; cv.height = 120; b.appendChild(cv);
        b.appendChild(el('span', '', ok ? ((n) => n.charAt(0).toUpperCase() + n.slice(1))(A.nom.replace(/^(Gribouille|Grum) /, '')) : '???'));
        b.title = ok ? A.nom + (A.rare ? ' (rare)' : '') : 'À gagner : ' + T.indice + (T.rare ? ' (rare)' : '');
        if (ok) b.addEventListener('click', () => { R[qui] = T.id; game.save(); construireCompagnons(); Son.sfx('click'); });
        tenuesCv.push({ cv, qui, id: T.id, ok });
        box.appendChild(b);
      }
      c.appendChild(box);
    }
    const g = el('div', 'choices'); g.appendChild(el('span', 'label', 'Ils m\'accompagnent dehors'));
    for (const [v, lab] of [[true, 'Oui'], [false, 'Non']]) { const b = el('button', 'choice' + ((R.actif !== false) === v ? ' on' : ''), lab); b.addEventListener('click', () => { R.actif = v; game.save(); construireCompagnons(); Son.sfx('click'); }); g.appendChild(b); }
    c.appendChild(g);
  }
  function dessinerTenues() {
    for (const q of tenuesCv) {
      const ctx = q.cv.getContext('2d'); ctx.clearRect(0, 0, q.cv.width, q.cv.height);
      if (!q.ok) { ctx.save(); ctx.globalAlpha = 0.25; ctx.filter = 'brightness(0)'; }
      Mascottes.dessiner(ctx, q.qui, 56, 112, { tenue: q.id, t: time + (q.qui === 'grum' ? 1.7 : 0), dir: 1, expr: 'neutre' }, q.qui === 'grum' ? 2 : 1.75);
      if (!q.ok) { ctx.restore(); U.txt(ctx, '?', 56, 60, 40, 'center', 'rgba(60,45,30,0.55)'); }
    }
  }
  function majChoixCreation() {
    const N = Perso.norm(look);
    for (const [cle, sel] of CHOIX_CREATION()) $$(sel + ' .choice').forEach((b) => b.classList.toggle('on', +b.dataset.v === N[cle]));
    refreshCreate();
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

  // recette lisible d'un combo : « Feu + Gravité », « Eau (Gel) + Vent »
  function effetLisible(e) { if (DATA.CORES[e] && !DATA.CORES[e].interne) return DATA.CORES[e].nom; for (const a in DATA.ASPECTS) if (DATA.ASPECTS[a].devient === e) return DATA.CORES[DATA.ASPECTS[a].aspect].nom + ' (' + DATA.ASPECTS[a].nom + ')'; return (DATA.CORES[e] || DATA.PSEUDO[e] || { nom: e }).nom; }
  function recetteCombo(k) { return k.split('|').map(effetLisible).join(' + '); }
  const comboConnu = (k) => !!(game.progress.combos && game.progress.combos[k]);
  // ---------- Ouverture / fermeture ----------
  function openPanel(name) {
    close();
    open = name;
    $('#panel-' + name).classList.remove('hidden');
    $('#panels').classList.remove('hidden');
    if (name === 'seal') refreshSeal();
    if (name === 'cauldron') refreshCauldron();
    if (name === 'grimoire') { game.progress.nouveau = false; refreshGrimoire(); }
    if (name === 'courrier') refreshCourrier();
    if (name === 'options') refreshOptions();
    if (name === 'alambic') refreshAlambic();
    if (name === 'presse') refreshPresse();
    if (name === 'terrarium') refreshTerrarium();
    if (name === 'bac') openBac();
    if (name === 'create') { if (!$('#create-peau').children.length) construireCreation(); construireCompagnons(); look = { ...Perso.norm(game.look) }; delete look._cape; $('#create-nom').value = look.nom || ''; majChoixCreation(); }
  }
  function close() {
    if (open === 'seal') { while (pile.length) remonter(true); recherche = ''; }
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
    ctx.save(); ctx.fillStyle = 'rgba(31,26,22,0.12)'; ctx.beginPath(); ctx.ellipse(c.width / 2, c.height - 22, 50, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    const t = time, cast = (t % 6) > 4.6 ? -0.7 : null;
    World.drawApprenti(ctx, c.width / 2, c.height - 22, 230, look, 1, 0, null, false, { t, cast, glow: '#d8a63a' });
    dessinerTenues();
  }

  // ---------- Éditeur de sceaux ----------
  const SEAL_R = 140;
  function sealR() { return SEAL_R * (game.editSeal.taille === 'petit' ? 0.82 : 1); }
  function slotDispo(id, tForce) {
    const s = game.editSeal, p = game.progress, t = tForce || s.taille || 'moyen';
    if (!tForce && estCroissance(id)) return slotDispo(id, tailleSuivante());
    if (id === 'core2') return p.fusion && t !== 'petit';
    if (id === 'core3') return p.fusion && t === 'grand';
    if (id === 'filtre') return t !== 'petit' && p.filtres.length > 0;
    if (id === 'cible') return t !== 'petit' && p.cibles.length > 1;
    if (id === 'trigger2') return t === 'grand';
    if (id.startsWith('mod')) return +id.slice(3) < Seal.nbSlots({ taille: t }, p.slots);
    return true;
  }
  // ---------- la taille s'ajuste : la suivante attend en pointillés ----------
  const ORDRE_T = ['petit', 'moyen', 'grand'];
  function tailleSuivante() { const p = game.progress, i = ORDRE_T.indexOf(game.editSeal.taille || 'moyen'); for (let k = i + 1; k < 3; k++) if (p.tailles.includes(ORDRE_T[k])) return ORDRE_T[k]; return null; }
  function casesCroissance() {
    const nx = tailleSuivante(); if (!nx) return [];
    const c = $('#seal-canvas'), cx = c.width / 2, cy = c.height / 2 + 10, R = sealR();
    const ici = new Set(Seal.slotList(cx, cy, R, game.editSeal.taille || 'moyen').filter((q) => slotDispo(q.id, game.editSeal.taille || 'moyen')).map((q) => q.id));
    return Seal.slotList(cx, cy, R, nx).filter((q) => !ici.has(q.id) && slotDispo(q.id, nx) && (!/core2|core3/.test(q.id) || game.progress.fusion)).map((q) => ({ ...q, grow: true }));
  }
  function estCroissance(id) { return !!id && casesCroissance().some((q) => q.id === id); }
  function toutesLesCases() { const c = $('#seal-canvas'); return Seal.slotList(c.width / 2, c.height / 2 + 10, sealR(), game.editSeal.taille || 'moyen').concat(casesCroissance()); }
  function onSealCanvasClick(e, canvas, right = false) {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * (canvas.width / r.width), y = (e.clientY - r.top) * (canvas.height / r.height);
    const s = game.editSeal;
    const hitSl = toutesLesCases().find((sl) => U.dist(x, y, sl.x, sl.y) <= sl.r * 1.3);
    const id = hitSl ? hitSl.id : null;
    if (!id) { selSlot = null; refreshSeal(); return; }
    if (!slotDispo(id)) { toast(id.startsWith('mod') ? 'Cet emplacement est encore scellé. Voir le grimoire.' : id === 'filtre' ? 'Pointe droite : les filtres de matière ne sont pas encore connus.' : id === 'cible' ? 'Pointe gauche : les cibles ne sont pas encore connues.' : 'Emplacement indisponible.', 'warn'); return; }
    if (!right && selSlot === id && Seal.isSub(lireSlot(s, id))) { ouvrirSous(id); return; }
    if (right || selSlot === id) {
      if (id.startsWith('mod')) s.mods[+id.slice(3)] = null; else s[id] = null;
      selSlot = null; Son.sfx('click');
    } else selSlot = id;
    refreshSeal();
  }

  // ---------- Table des sceaux : cases, glisser-déposer, annuler ----------
  // le genre d'une case : le centre et les essences fusionnées prennent des glyphes d'effet, etc.
  const genreDe = (sid) => (sid === 'core' || sid === 'core2' || sid === 'core3' ? 'core' : sid.startsWith('mod') ? 'mod' : sid === 'trigger2' ? 'trigger' : sid);
  const lireSlot = (s, sid) => (sid.startsWith('mod') ? s.mods[+sid.slice(3)] : s[sid]);
  const ecrireSlot = (s, sid, v) => { if (sid.startsWith('mod')) s.mods[+sid.slice(3)] = v; else s[sid] = v; };
  const OU_VA = { core: 'au centre (ou, la fusion apprise, sous le centre)', shape: 'sur le premier anneau, en haut', mod: 'sur le second anneau', trigger: 'sur la pointe du haut', filtre: 'sur la pointe droite', cible: 'sur la pointe gauche' };
  const PALETTES = [['#pal-cores', 'core'], ['#pal-shapes', 'shape'], ['#pal-mods', 'mod'], ['#pal-triggers', 'trigger'], ['#pal-filtres', 'filtre'], ['#pal-cibles', 'cible']];
  // les cases ouvertes qui acceptent un glyphe de ce genre
  function casesPour(kind) { return toutesLesCases().map((q) => q.id).filter((sid, i, a) => a.indexOf(sid) === i && genreDe(sid) === kind && slotDispo(sid)); }
  function couleurGlyphe(kind, id) { return kind === 'core' ? DATA.CORES[id].couleur : kind === 'filtre' ? DATA.FILTRES[id].couleur : kind === 'mod' && DATA.MODS[id] && DATA.MODS[id].aspect ? DATA.CORES[DATA.MODS[id].aspect].couleur : U.INK; }
  // la case sous le pointeur (parmi « liste » si on en donne une, avec une marge généreuse pour le doigt)
  function slotSous(cx, cy, liste) {
    const c = $('#seal-canvas'), r = c.getBoundingClientRect(); if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) return null;
    const x = (cx - r.left) * (c.width / r.width), y = (cy - r.top) * (c.height / r.height);
    let best = null, bd = 1e9;
    for (const sl of toutesLesCases()) { if (liste && !liste.includes(sl.id)) continue; const d = U.dist(x, y, sl.x, sl.y); if (d <= sl.r * (liste ? 1.9 : 1.3) && d < bd) { bd = d; best = sl.id; } }
    return best;
  }
  function dansCercle(cx, cy) { const c = $('#seal-canvas'), r = c.getBoundingClientRect(); if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) return false; const x = (cx - r.left) * (c.width / r.width), y = (cy - r.top) * (c.height / r.height); return U.dist(x, y, c.width / 2, c.height / 2 + 10) < sealR() * 1.3; }
  function poserEn(sid, kind, id) { if (!slotDispo(sid)) return; if (estCroissance(sid)) { const nx = tailleSuivante(); if (nx) game.editSeal.taille = nx; } selSlot = sid; placeInSeal(kind, id); if (selSlot === sid && kind !== 'mod') selSlot = null; }
  function deplacer(from, to) {
    const s = game.editSeal; if (genreDe(from) !== genreDe(to) || !slotDispo(to)) return;
    const a = lireSlot(s, from), b = lireSlot(s, to); ecrireSlot(s, to, a); ecrireSlot(s, from, b == null ? null : b);
    selSlot = null; Son.sfx('cast', s.core || 'vent');
  }
  function retirer(sid, pouf) { const s = game.editSeal; if (lireSlot(s, sid) == null) return; ecrireSlot(s, sid, null); selSlot = null; Son.sfx(pouf ? 'fizzle' : 'click'); }

  // glisser : à la souris dès qu'on bouge un peu ; au doigt, depuis la palette, après un appui long (sinon on fait défiler)
  let glisse = null, finGlisse = 0, survolPal = null, survolCase = null;
  // ce que fait le glyphe d'une case, et ce qu'il coûte dans ce sceau
  function decrireCase(sid) {
    const s = game.editSeal, v = lireSlot(s, sid), k = genreDe(sid); if (v == null) return;
    const dict = { core: DATA.CORES, shape: DATA.SHAPES, mod: DATA.MODS, trigger: DATA.TRIGGERS, filtre: DATA.FILTRES, cible: DATA.CIBLES }[k];
    const D = Seal.isSub(v) ? { nom: 'Sous-sceau « ' + Seal.nom(v.sub) + ' »', desc: 'Lancé là où ce sceau éclate.' } : dict && dict[v]; if (!D) return;
    const vain = Seal.inutiles(s).find((q) => q.sid === sid), c = Math.round(Seal.coutCase(s, sid) * 10) / 10;
    $('#pal-desc').innerHTML = '<b>' + D.nom + '</b> — ' + (c ? c + ' encre dans ce sceau. ' : '') + (vain ? '<span class="warn">' + vain.raison + '</span> ' : '') + (D.desc || '');
  }
  function preparerGlisser(e, q) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    annulerGlisser();
    glisse = Object.assign({ x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, actif: false, ptr: e.pointerId, doigt: e.pointerType !== 'mouse' }, q);
    if (glisse.doigt && !q.from) glisse.timer = setTimeout(() => { if (glisse && !glisse.actif) activerGlisser(); }, 280);
  }
  function activerGlisser() {
    const g = glisse; g.actif = true; clearTimeout(g.timer);
    g.accepte = casesPour(g.kind); if (g.from && !g.accepte.includes(g.from)) g.accepte.push(g.from);
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; cv.className = 'fantome-glyphe'; const cx = cv.getContext('2d');
    cx.fillStyle = 'rgba(246,238,216,0.9)'; cx.beginPath(); cx.arc(32, 32, 26, 0, Math.PI * 2); cx.fill();
    if (Seal.isSub(g.id)) Seal.drawMini(cx, g.id.sub, 32, 32, 24, time); else Seal.glyph(cx, g.kind === 'filtre' ? 'f_' + g.id : g.kind === 'cible' ? 'c_' + g.id : g.id, 32, 32, 19, couleurGlyphe(g.kind, g.id), 1);
    document.body.appendChild(cv); g.fantome = cv; placerFantome();
    if (g.doigt && navigator.vibrate) navigator.vibrate(12);
    Son.sfx('click');
  }
  // le fantôme se tient en haut à droite du pointeur (au-dessus du doigt) pour laisser voir la case visée
  function placerFantome() { const g = glisse; if (!g || !g.fantome) return; g.fantome.style.left = (g.x - (g.doigt ? 32 : 6)) + 'px'; g.fantome.style.top = (g.y - (g.doigt ? 84 : 58)) + 'px'; }
  function bougerGlisser(e) {
    const g = glisse; if (!g || e.pointerId !== g.ptr) return;
    g.x = e.clientX; g.y = e.clientY;
    if (!g.actif) { const d = Math.hypot(g.x - g.x0, g.y - g.y0); if (g.doigt && !g.from) { if (d > 12) annulerGlisser(); return; } if (d < 6) return; activerGlisser(); }
    placerFantome(); g.survol = slotSous(g.x, g.y, g.accepte);
  }
  function annulerGlisser() { const g = glisse; if (!g) return; clearTimeout(g.timer); if (g.fantome) g.fantome.remove(); if (g.actif) finGlisse = performance.now(); glisse = null; }
  function lacherGlisser(e) {
    const g = glisse; if (!g || e.pointerId !== g.ptr) return;
    if (!g.actif) { annulerGlisser(); return; }
    const cible = slotSous(e.clientX, e.clientY, g.accepte), dedans = dansCercle(e.clientX, e.clientY);
    annulerGlisser();
    const copie = g.from && (g.copie || e.shiftKey);
    if (cible && cible !== g.from && copie) { if (Seal.isSub(g.id)) { ecrireSlot(game.editSeal, cible, { sub: Seal.clone(g.id.sub) }); Son.sfx('cast', game.editSeal.core || 'vent'); } else poserEn(cible, g.kind, g.id); }
    else if (cible && cible !== g.from) { if (g.from) deplacer(g.from, cible); else poserEn(cible, g.kind, g.id); }
    else if (g.from && !cible && !dedans) retirer(g.from, true);
    else if (!g.from && dedans && !cible) toast(g.accepte.length ? 'Ce glyphe va ' + OU_VA[g.kind] + '.' : 'Ce sceau n\'a pas de case ouverte pour ce glyphe.', 'warn');
    refreshSeal();
  }

  // ---------- un sous-sceau s'ouvre sur place : on le retouche, puis on remonte dans son parent ----------
  let pile = [];
  function oublierHistorique() { passe = []; avenir = []; vu = null; }
  function ouvrirSous(sid) {
    const s = game.editSeal, v = lireSlot(s, sid); if (!Seal.isSub(v)) return;
    pile.push({ parent: s, sid }); game.editSeal = Seal.clone(v.sub); selSlot = null; oublierHistorique(); Son.sfx('cast', game.editSeal.core || 'vent'); refreshSeal();
  }
  function remonter(sansRafraichir) {
    const h = pile.pop(); if (!h) return;
    ecrireSlot(h.parent, h.sid, { sub: Seal.clone(game.editSeal) }); game.editSeal = h.parent; selSlot = sansRafraichir ? null : h.sid; oublierHistorique();
    if (!sansRafraichir) { Son.sfx('click'); refreshSeal(); }
  }

  // ---------- le clavier sur le cercle : flèches, lettres, Entrée ----------
  const anneauDe = (sid) => (sid === 'core' ? 0 : sid === 'shape' || sid === 'core2' || sid === 'core3' ? 1 : sid.startsWith('mod') ? 2 : 3);
  function casesNavigables() {
    const c = $('#seal-canvas'), cx = c.width / 2, cy = c.height / 2 + 10, s = game.editSeal, p = game.progress;
    // les cases en pointillés aussi : au clavier, on fait grandir le sceau de la même façon
    return toutesLesCases().filter((q) => slotDispo(q.id) && (!/core2|core3/.test(q.id) || p.fusion) && (q.id !== 'filtre' || p.filtres.length) && (q.id !== 'cible' || p.cibles.length > 1))
      .map((q) => ({ id: q.id, anneau: anneauDe(q.id), angle: (Math.atan2(q.y - cy, q.x - cx) + Math.PI * 2.5) % (Math.PI * 2) }));
  }
  function naviguer(touche) {
    const L = casesNavigables(); if (!L.length) return;
    const ici = L.find((q) => q.id === selSlot);
    if (!ici) { selSlot = 'core'; refreshSeal(); return; }
    let vers = null;
    if (touche === 'ArrowLeft' || touche === 'ArrowRight') {
      const meme = L.filter((q) => q.anneau === ici.anneau).sort((a, b) => a.angle - b.angle); const i = meme.indexOf(ici);
      vers = meme[(i + (touche === 'ArrowRight' ? 1 : -1) + meme.length) % meme.length];
    } else {
      const cible = ici.anneau + (touche === 'ArrowUp' ? 1 : -1); const autre = L.filter((q) => q.anneau === cible);
      const ecart = (a) => { const d = Math.abs(a - ici.angle) % (Math.PI * 2); return Math.min(d, Math.PI * 2 - d); };
      vers = autre.sort((a, b) => ecart(a.angle) - ecart(b.angle))[0] || null;
    }
    if (vers) { selSlot = vers.id; const v = lireSlot(game.editSeal, vers.id); if (v != null) decrireCase(vers.id); Son.sfx('click'); refreshSeal(); }
  }
  let recherche = '', rechercheT = 0, trouve = null;
  const sansAccent = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  function majRecherche() {
    $$('.glyph-btn.trouve').forEach((b) => b.classList.remove('trouve')); trouve = null;
    if (!recherche) return;
    const k = selSlot ? genreDe(selSlot) : null;
    for (const [sel, kind] of PALETTES) { if (k && kind !== k) continue; for (const b of $$(sel + ' .glyph-btn:not(.locked)')) { const n = b.querySelector('span'); if (n && sansAccent(n.textContent).startsWith(sansAccent(recherche))) { trouve = b; break; } } if (trouve) break; }
    if (trouve) { trouve.classList.add('trouve'); trouve.scrollIntoView({ block: 'nearest' }); }
    $('#pal-desc').innerHTML = 'Recherche : « <b>' + recherche + '</b> »' + (trouve ? ' → ' + trouve.querySelector('span').textContent + ' (Entrée pour le poser, Échap pour effacer)' : ' — rien ne commence ainsi' + (k ? ' pour cette case.' : '.'));
  }

  // annuler, refaire : chaque état de la table est noté (le nom tapé seul ne compte pas)
  let passe = [], avenir = [], vu = null, enRestauration = false;
  const instantane = () => JSON.stringify(game.editSeal);
  const sansNom = (j) => j.replace(/"nom":"(?:[^"\\]|\\.)*",?/, '');
  function noterHistorique() {
    const cur = instantane();
    if (vu !== null && !enRestauration && sansNom(cur) !== sansNom(vu)) { passe.push(vu); if (passe.length > 80) passe.shift(); avenir = []; }
    vu = cur;
  }
  function restaurer(j) { game.editSeal = Seal.clone(JSON.parse(j)); selSlot = null; enRestauration = true; refreshSeal(); enRestauration = false; Son.sfx('click'); }
  function annuler() { if (!passe.length) return; avenir.push(instantane()); restaurer(passe.pop()); }
  function refaire() { if (!avenir.length) return; passe.push(instantane()); restaurer(avenir.pop()); }
  function placeInSeal(kind, id) {
    const s = game.editSeal;
    if (selSlot && estCroissance(selSlot)) { const nx = tailleSuivante(); if (nx) s.taille = nx; }
    if (kind === 'core') {
      if (selSlot === 'core3' && slotDispo('core3')) { s.core3 = id; selSlot = null; }
      else if ((selSlot === 'core2' || (game.progress.fusion && s.core && s.core !== id && !s.core2 && selSlot !== 'core')) && slotDispo('core2')) { s.core2 = id; selSlot = null; }
      else if (!selSlot && s.core && s.core2 && !s.core3 && id !== s.core && id !== s.core2 && slotDispo('core3')) { s.core3 = id; }
      else { s.core = id; if (selSlot === 'core') selSlot = null; }
    }
    else if (kind === 'shape') { s.shape = id; if (selSlot === 'shape') selSlot = null; }
    else if (kind === 'trigger') {
      if (selSlot === 'trigger2' || (s.taille === 'grand' && s.trigger && !s.trigger2 && selSlot !== 'trigger' && s.trigger !== id)) s.trigger2 = id; else s.trigger = id;
      if (selSlot === 'trigger' || selSlot === 'trigger2') selSlot = null;
    }
    else if (kind === 'filtre') { if (!slotDispo('filtre')) { toast('Un petit sceau n\'a pas de pointe pour les filtres.', 'warn'); return; } s.filtre = id; if (selSlot === 'filtre') selSlot = null; }
    else if (kind === 'cible') { if (!slotDispo('cible')) { toast('Un petit sceau n\'a pas de pointe pour les cibles.', 'warn'); return; } s.cible = id === 'souris' ? null : id; if (selSlot === 'cible') selSlot = null; }
    else {
      const nb = Seal.nbSlots(s, game.progress.slots);
      let i = selSlot && selSlot.startsWith('mod') ? +selSlot.slice(3) : s.mods.findIndex((m, k) => !m && k < nb);
      if (i < 0) i = 0;
      if (i >= nb) { toast('Aucun emplacement de modificateur libre.', 'warn'); return; }
      if (id === 'sous') { if (pile.length) { toast('Un sous-sceau ne peut pas en contenir un autre.', 'warn'); return; } subSlot = i; showSubList(); return; }
      const lgEl = DATA.MODS[id] && (DATA.MODS[id].langue || DATA.MODS[id].aspect);
      if (lgEl) {
        const niv = DATA.niveauMaitrise((game.progress.maitrise || {})[lgEl] || 0);
        const deja = s.mods.filter((m, k) => m === id && k !== i).length;
        if (deja >= Math.min(2, Math.max(1, niv))) { const nm = DATA.MODS[id].nom; toast(deja >= 2 ? 'Deux glyphes ' + nm + ' au plus.' : 'Pour redoubler ' + nm + ', il faut être Adepte de l\'essence ' + DATA.CORES[lgEl].nom + '.', 'warn'); return; }
      }
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
  let palSig = '';
  function refreshSeal() {
    const s = game.editSeal, p = game.progress;
    if (!('core2' in s)) s.core2 = null;
    // le trait du second déclencheur tombe si son déclencheur ou son essence s'en va
    if (s.lien2 && (!s.trigger2 || !s[s.lien2] || [s.core, s.core2, s.core3].filter(Boolean).length < 2)) s.lien2 = null;
    { const tA = Seal.tailleMin(s, p.tailles, p.slots); if (s.taille !== tA) s.taille = tA; }
    noterHistorique();
    $('#seal-annuler').disabled = !passe.length; $('#seal-refaire').disabled = !avenir.length;
    { const f = $('#seal-fil'); if (pile.length) { const h = pile[pile.length - 1]; f.innerHTML = 'Dans « ' + Seal.nom(h.parent) + ' » › <b>sous-sceau</b> <button id="seal-remonter">↩ Remonter au sceau parent</button>'; f.classList.remove('hidden'); $('#seal-remonter').addEventListener('click', () => remonter()); } else { f.innerHTML = ''; f.classList.add('hidden'); } }
    $('#seal-nom').value = s.nom || '';
    $('#seal-nom').placeholder = Seal.autoNom(s);
    $('#seal-cost').textContent = Seal.cost(s);
    // le détail du coût, anneau par anneau
    { const D = Seal.coutDetail(s), r1 = (v) => Math.round(v * 10) / 10; $('#seal-cout-detail').innerHTML = D.parts.length ? D.parts.map((q) => q.nom + ' <b>' + (q.pct ? q.v + ' %' : (q.cle === 'taille' ? '+' : '') + r1(q.v)) + '</b>').join(' · ') + (D.mul !== 1 ? ' <span class="muted">(moitié prix)</span>' : '') : ''; }
    // les glyphes qui ne servent à rien ici
    { const E = Seal.equilibre(s), z = $('#seal-equilibre'); z.innerHTML = E.etat === 'equilibre' ? '⚖ <b>Équilibré</b> : un dixième d\'encre en moins, et il se trace plus vite.' : E.etat === 'bancal' ? '⚖ <b>Bancal</b> : les modificateurs penchent d\'un côté ; la puissance vacille d\'un sort à l\'autre.' : ''; z.className = E.etat; }
    { const I = Seal.inutiles(s); const z = $('#seal-inutiles'); z.innerHTML = I.length ? '<b>Sans effet ici</b> (encre perdue) : ' + I.map((q) => q.raison).join(' ') : ''; z.classList.toggle('hidden', !I.length); }
    const st = Seal.etat(s);
    const e = $('#seal-etat'); e.textContent = st.ok ? (st.raison || 'Le sceau est complet et vibre doucement.') : st.raison; e.className = st.ok ? 'ok' : 'warn';
    // palette
    const pal = (sel, dict, list, kind) => {
      const c = $(sel); c.innerHTML = '';
      const ids = Object.keys(dict).filter((id) => !dict[id].interne);
      if (kind === 'mod') ids.sort((a, b) => (dict[a].aspect ? 1 : 0) - (dict[b].aspect ? 1 : 0));
      for (const id of ids) {
        const d = dict[id]; const unlocked = list.includes(id);
        const b = el('button', 'glyph-btn' + (unlocked ? '' : ' locked'));
        b.dataset.glyphe = kind + ':' + id;
        const cv = document.createElement('canvas'); cv.width = 44; cv.height = 44;
        const cx = cv.getContext('2d');
        if (unlocked) Seal.glyph(cx, kind === 'filtre' ? 'f_' + id : kind === 'cible' ? 'c_' + id : id, 22, 22, 15, kind === 'core' || kind === 'filtre' ? d.couleur : kind === 'mod' && d.aspect ? DATA.CORES[d.aspect].couleur : U.INK, 1);
        else U.txt(cx, '?', 22, 22, 22, 'center', 'rgba(60,45,30,0.4)');
        b.appendChild(cv);
        b.appendChild(el('span', '', unlocked ? d.nom : '???'));
        b.appendChild(el('small', '', unlocked ? d.cout + ' encre' : ''));
        if (unlocked) {
          const desc = () => { $('#pal-desc').innerHTML = '<b>' + d.nom + '</b> — ' + (kind === 'filtre' ? 'Avec Au contact (ou un piège de zone), le sort ne réagit qu\'à : ' + d.nom.toLowerCase() + '. Il traverse tout le reste, murs compris.' : d.desc); };
          b.addEventListener('click', () => { if (performance.now() - finGlisse < 350) return; placeInSeal(kind, id); });
          b.addEventListener('mouseenter', () => { desc(); survolPal = kind; });
          b.addEventListener('mouseleave', () => { if (survolPal === kind) survolPal = null; });
          b.addEventListener('pointerdown', (e) => { desc(); preparerGlisser(e, { kind, id }); });
          b.addEventListener('contextmenu', (e) => e.preventDefault());
        } else {
          const u = DATA.UNLOCKS.find((q) => (q.type === kind || (kind === 'filtre' && q.type === 'filtres') || (kind === 'cible' && (q.type === 'cible' || q.type === 'marque')) || (kind === 'core' && (q.type === 'core' || q.type === 'marque')) || (kind === 'mod' && q.type === 'mods') || kind === 'shape' || kind === 'trigger') && (q.item === id || (Array.isArray(q.item) && q.item.includes(id))));
          b.addEventListener('mouseenter', () => { $('#pal-desc').innerHTML = '<b>Inconnu.</b> ' + (u ? 'Indice : ' + u.indice : ''); });
        }
        c.appendChild(b);
      }
    };
    const sig = [p.cores, p.shapes, p.mods, p.triggers, p.filtres, p.cibles].map((a) => a.join(',')).join('|');
    if (sig !== palSig) {
      palSig = sig;
      pal('#pal-cores', DATA.CORES, p.cores, 'core');
      pal('#pal-shapes', DATA.SHAPES, p.shapes, 'shape');
      pal('#pal-mods', DATA.MODS, p.mods, 'mod');
      pal('#pal-triggers', DATA.TRIGGERS, p.triggers, 'trigger');
      pal('#pal-filtres', DATA.FILTRES, p.filtres, 'filtre');
      pal('#pal-cibles', DATA.CIBLES, p.cibles, 'cible');
    }
    // une case choisie : les palettes qui n'y vont pas s'estompent
    { const k = selSlot ? genreDe(selSlot) : null; for (const [sel, kind] of PALETTES) { const c = $(sel), hors = !!k && kind !== k; c.classList.toggle('horsjeu', hors); if (c.previousElementSibling) c.previousElementSibling.classList.toggle('horsjeu', hors); } }
    // la taille s'ajuste toute seule à ce que porte le sceau
    { const tz = $('#seal-tailles'), T = DATA.TAILLES[s.taille || 'moyen'], nx = tailleSuivante(); tz.innerHTML = '<span class="label">Taille</span>'; const b = el('span', 'choice on taille-auto', T.nom); b.title = T.desc; tz.appendChild(b); tz.appendChild(el('small', 'muted', nx ? 'elle s\'ajuste à ce que tu poses ; pose un glyphe sur une case en pointillés pour passer au ' + DATA.TAILLES[nx].nom.toLowerCase() + '.' : 'elle s\'ajuste à ce que tu poses.')); }
    // encre
    const ez = $('#seal-encres'); ez.innerHTML = '';
    const connues = Object.keys(DATA.ENCRES).filter((id) => p.recettes.includes(id) || (game.inv.encres || {})[id] > 0);
    if (connues.length) {
      ez.appendChild(el('span', 'label', 'Encre'));
      const bo = el('button', 'choice' + (!s.encre ? ' on' : ''), 'Ordinaire'); bo.addEventListener('click', () => { s.encre = null; refreshSeal(); Son.sfx('click'); }); ez.appendChild(bo);
      for (const id of connues) { const E = DATA.ENCRES[id], n = (game.inv.encres || {})[id] || 0; const b = el('button', 'choice' + (s.encre === id ? ' on' : ''), '<i style="background:' + E.couleur + '"></i>' + ((q) => q.charAt(0).toUpperCase() + q.slice(1))(E.nom.replace(/^Encre (de |d')?/, '')) + ' <small>(' + n + ')</small>'); b.title = E.effet + ' Une goutte par lancer.'; b.addEventListener('click', () => { s.encre = id; refreshSeal(); Son.sfx('click'); }); ez.appendChild(b); }
    }
    // paramètres des déclencheurs
    const pr = $('#seal-params'); pr.innerHTML = '';
    const trs = Seal.triggers(s);
    const reglage = (lab, cle, vals) => { const g = el('div', 'choices'); g.appendChild(el('span', 'label', lab)); for (const v of vals) { const b = el('button', 'choice' + (s[cle] === v ? ' on' : ''), v + ' s'); b.addEventListener('click', () => { s[cle] = v; refreshSeal(); Son.sfx('click'); }); g.appendChild(b); } pr.appendChild(g); };
    if (trs.includes('retarde')) reglage('Délai', 'delai', [1, 2, 5, 10]);
    // dimensions de la forme
    const Dm = DATA.DIMS[s.shape];
    if (Dm && s.taille !== 'petit') for (const ax of ['l', 'h']) { if (!Dm[ax]) continue; const cle = ax === 'l' ? 'dimL' : 'dimH'; const g = el('div', 'choices'); g.appendChild(el('span', 'label', Dm[ax])); for (const v of DATA.DIM_VALS) { const nom = v === 0.25 ? '×¼' : v === 0.5 ? '×½' : '×' + v; const b = el('button', 'choice' + ((s[cle] || 1) === v ? ' on' : ''), nom); b.addEventListener('click', () => { s[cle] = v; refreshSeal(); Son.sfx('click'); }); g.appendChild(b); } pr.appendChild(g); }
    if (trs.includes('repetition')) reglage('Période', 'periode', [1, 2, 5]);
    // le trait : le second déclencheur pour une seule essence (le sort part en deux temps)
    { const ess = ['core', 'core2', 'core3'].filter((k) => s[k]); if (s.taille === 'grand' && s.trigger2 && ess.length >= 2) {
      const g = el('div', 'choices'); g.appendChild(el('span', 'label', 'Second déclencheur pour'));
      for (const [v, lab] of [[null, 'tout le sceau']].concat(ess.map((k) => [k, DATA.CORES[s[k]].nom]))) { const b = el('button', 'choice' + ((s.lien2 || null) === v ? ' on' : ''), lab); b.title = v ? 'Un trait relie le second déclencheur à cette essence : elle part à part, avec lui ; le reste part avec le premier.' : 'Les deux déclencheurs valent pour tout le sceau.'; b.addEventListener('click', () => { s.lien2 = v; refreshSeal(); Son.sfx('click'); }); g.appendChild(b); }
      pr.appendChild(g); } }
    $('#seal-fiche').innerHTML = ficheSceau(s);
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
  function ficheSceau(s) {
    if (!s.core) return '<span class="muted">Pose un glyphe d\'effet au centre pour commencer.</span>';
    const T = Seal.taille(s), prm = Seal.params(s), trs = Seal.triggers(s);
    const nomG = (c) => (DATA.CORES[c] || DATA.PSEUDO[c] || { nom: c }).nom.toLowerCase();
    let cores = Seal.effets(s);
    const invUne = !prm.inverse && prm.invEss && prm.invEss.length;
    if (prm.inverse) cores = cores.map((c) => (c === 'gravite' ? c : DATA.INVERSE[c] || c));
    else if (invUne) cores = cores.map((c) => (prm.invEss.includes(c) && c !== 'gravite' ? DATA.INVERSE[c] || c : c));
    const cleC = cores.length > 1 && !prm.inverse && !invUne ? DATA.comboCle(cores) : null; const infoC = cleC && DATA.comboInfo(cleC);
    const combo = infoC ? (comboConnu(cleC) ? infoC : { nom: 'fusion inconnue', inconnu: true }) : null;
    const L = [];
    L.push('<b>' + T.nom + ' sceau</b> · ' + Seal.cost(s) + ' encre · tracé en ' + (Math.round(Seal.geste(s) * 100) / 100) + ' s · ' + (trs.includes('tenu') ? 'pas de charge : tant que tu tiens le clic, il boit environ ' + Math.max(0.6, Seal.cost(s) * 0.3).toFixed(1).replace('.', ',') + ' encre par seconde.' : 'maintenir le clic charge jusqu\'à +80 %.'));
    let eff = 'Effet : ' + cores.map(nomG).join(' et ') + (combo ? ' (fusion : ' + combo.nom.toLowerCase() + ')' : '') + (prm.inverse ? (cores.includes('gravite') ? ', apesanteur' : ', inversé') : '') + '.';
    L.push(eff);
    if (infoC) L.push(comboConnu(cleC) ? '<b>' + infoC.nom + '</b> : ' + infoC.desc + ' <span class="muted">La fusion remplace les deux effets de base.</span>' : '<b>Fusion inconnue</b> <span class="muted">— ' + infoC.indice + ' Lance-la pour la découvrir.</span>');
    else if (cores.length > 1 && !prm.inverse && !Seal.enDeuxTemps(s)) L.push('<span class="muted">Ces ' + (cores.length > 2 ? cores.length + ' effets' : 'deux effets') + ' ne fusionnent pas : ils s\'appliquent ensemble.</span>');
    // la géométrie : un modificateur contre une essence ne sert qu'elle ; un trait pour le second déclencheur
    { const MASC = ['feu', 'vent', 'temps', 'contre', 'espace', 'esprit'];
      const art = (c) => { const n = DATA.CORES[c] ? DATA.CORES[c].nom : c; return (/^[AEÉIOU]/.test(n) ? 'l\'' : MASC.includes(c) ? 'le ' : 'la ') + n; };
      const Li = prm.liaisons || {}, ls = Object.keys(Li).map((i) => DATA.MODS[s.mods[+i]].nom + ' contre ' + art(s[Li[i]]) + (MASC.includes(s[Li[i]]) ? ' : pour lui seul' : ' : pour elle seule'));
      if (ls.length) L.push('Place : ' + ls.join(' ; ') + '.');
      if (Seal.enDeuxTemps(s)) { const partie = (X) => { const sp = World.makeSpec(Seal.clone(X)), cI = sp.combo && DATA.comboInfo(sp.combo); return sp.cores.map(nomG).join(' et ') + (cI ? ' (fusion : ' + (comboConnu(sp.combo) ? cI.nom.toLowerCase() : 'inconnue') + ')' : ''); }; const [A, B] = Seal.scinder(s);
        L.push('En deux temps : ' + partie(A) + ' avec le premier déclencheur ; ' + partie(B) + ' à part, avec le second (' + DATA.TRIGGERS[s.trigger2].nom.toLowerCase() + ').'); } }
    if (s.shape) L.push('Forme : ' + DATA.SHAPES[s.shape].nom.toLowerCase() + (prm.extra && s.shape !== 'soi' ? ', en double' : '') + (prm.orbite ? ', en orbite autour de toi' : '') + (prm.teleguide ? ', guidé par la souris' : '') + (prm.canalise ? ', canalisé tant que tu maintiens' : '') + '.');
    // sur soi : l'élan de l'essence du centre, teinté des autres
    if (s.shape === 'soi') { const E = DATA.ELANS[cores[0]], tenuS = trs.includes('tenu'), txt = E && (tenuS ? E.tenu : E.imm);
      if (txt) { const t2 = [s.taille !== 'petit' ? s.core2 : null, s.taille === 'grand' ? s.core3 : null].filter((c) => c && c !== s.core && DATA.TEINTES[c]).map((c) => DATA.CORES[c].nom.toLowerCase() + ' : ' + DATA.TEINTES[c]);
        const nAv = (prm.rafale ? (prm.rafale > 1 ? 4 : 2) : 0) + (prm.extra || 0);
        L.push('<b>Élan' + (tenuS ? ' maintenu' : '') + '</b> : ' + txt + (t2.length && !tenuS ? ' Teinté — ' + t2.join(' ; ') + '.' : '') + (nAv && !tenuS ? ' <span class="muted">' + nAv + ' élans d\'avance : reclique dans les 4 s, il repart aussitôt, sans encre.</span>' : '')); } }
    if (s.shape === 'invocation') { const F = DATA.FAMILIERS[s.core] || DATA.FAMILIERS.feu; L.push('Familier : <b>' + F.nom + '</b> — ' + F.desc + (prm.extra ? ' <span class="muted">Double : deux à la fois.</span>' : '')); }
    if (s.cible && s.taille !== 'petit') L.push('Cible : ' + (s.cible === 'creature' ? 'la créature hostile la plus proche, qu\'il suit' : 'ta marque la plus récente, même hors de vue') + '.');
    const tx = [];
    const prim = trs.find((t) => ['tenu', 'immediat', 'contact', 'retarde', 'commande', 'proximite'].includes(t));
    if (prim === 'tenu') tx.push('ne vit que tant que tu tiens le clic : il naît à l\'appui (sans charge), suit la souris, boit de l\'encre, et disparaît quand tu lâches');
    if (!trs.length || prim === 'immediat') tx.push('agit tout de suite');
    if (prim === 'contact') tx.push('éclate au premier contact');
    if (prim === 'retarde') tx.push('se fixe puis éclate après ' + s.delai + ' s');
    if (prim === 'commande') tx.push('attend que tu appuies sur F');
    if (prim === 'proximite') tx.push('éclate dès qu\'une créature approche');
    if (!prim && trs.includes('repetition')) tx.push(s.shape === 'projectile' || s.shape === 'chaine' ? 'éclate au contact' : 'agit tout de suite');
    if (s.filtre && s.taille !== 'petit') tx.push('uniquement au contact de : ' + DATA.FILTRES[s.filtre].nom.toLowerCase() + ' (traverse le reste)');
    if (trs.includes('repetition')) tx.push('puis recommence toutes les ' + s.periode + ' s');
    if (trs.includes('expiration')) tx.push('et éclate une dernière fois quand il s\'éteint');
    L.push('Déclenchement : ' + tx.join(', ') + '.');
    const mv = [];
    if (prm.traj) mv.push({ boomerang: 'revient comme un boomerang', spirale: 'vole en spirale', zigzag: 'file en zigzag', rasesol: 'court au ras du sol', cloche: 'retombe en cloche sur le point visé' }[prm.traj]); if (prm.percant) mv.push('traverse les créatures'); if (prm.gerbe) mv.push('éclate en gerbe'); if (prm.rafale && s.shape !== 'soi') mv.push('part ' + (prm.rafale > 1 ? 5 : 3) + ' fois de suite'); if (prm.matiere) { const mt = cores.map((c) => DATA.MATIERE[c]).find(Boolean); mv.push(mt ? 'devient matière : ' + (mt === 'AIR' ? 'creuse' : Sim.P[Sim.M[mt]].nom) : 'Matière reste muette avec cet effet'); }
    { const Dm = DATA.DIMS[s.shape]; if (Dm && s.taille !== 'petit' && ((s.dimL || 1) !== 1 || (s.dimH || 1) !== 1)) mv.push(Object.keys(Dm).map((ax) => Dm[ax].toLowerCase() + ' ×' + (ax === 'l' ? s.dimL || 1 : s.dimH || 1)).join(', ')); } if (prm.power > 1) mv.push('puissance ×' + prm.power.toFixed(1)); if (prm.range > 1) mv.push('portée ×' + prm.range.toFixed(1)); if (prm.size > 1) mv.push('taille ×' + prm.size.toFixed(1)); if (prm.duration > 1) mv.push('durée ×' + prm.duration.toFixed(1)); if (prm.speed > 1) mv.push('vitesse ×' + prm.speed.toFixed(1)); if (prm.bounces) mv.push(prm.bounces + ' rebonds'); if (prm.persist) mv.push('laisse une trace'); if (prm.echo) mv.push('écho ×' + prm.echo);
    if (mv.length) L.push('Réglages : ' + mv.join(', ') + '.');
    for (const e in prm.asp) { if (![s.core, s.core2, s.core3].includes(e)) continue; const Ls = prm.asp[e]; L.push((Ls.length > 1 ? 'Aspects : ' : 'Aspect : ') + Ls.map((A) => DATA.MODS[A.id].nom + (A.n > 1 ? ' ×2' : '')).join(' et ') + ' — ' + DATA.CORES[e].nom.toLowerCase() + ' devient ' + Ls.map((A) => nomG(A.devient)).join(' et ') + '.'); }
    for (const m of s.mods) { if (typeof m !== 'string') continue; const M2 = DATA.MODS[m]; if (M2 && M2.aspect && ![s.core, s.core2, s.core3].includes(M2.aspect)) L.push('<span class="muted">' + M2.nom + ' reste muet : il lui faut l\'essence ' + DATA.CORES[M2.aspect].nom + '.</span>'); }
    for (const el in prm.lg) { const Lg = DATA.LANGAGES[el]; if (!Lg) continue; if (cores.includes(el) || [s.core, s.core2].includes(el)) L.push('Langage ' + Lg.de + ' : ' + Lg.nom + (prm.lg[el] > 1 ? ' ×2 — ' + Lg.paliers[1] : ' — ' + Lg.paliers[0])); }
    if (s.encre && DATA.ENCRES[s.encre]) { const E = DATA.ENCRES[s.encre]; L.push('Écrit à l\'' + E.nom.toLowerCase() + ' (' + ((game.inv.encres || {})[s.encre] || 0) + ' gouttes) : ' + E.effet); }
    const sb = Seal.subs(s); if (sb.length) L.push('Puis lance : ' + sb.map((q) => '« ' + Seal.nom(q) + ' »').join(', ') + '.');
    return L.map((l) => '<div>' + l + '</div>').join('');
  }
  function drawPreview() {
    const c = $('#seal-preview'); if (!c || open !== 'seal') return;
    const ctx = c.getContext('2d'), W = c.width, H = c.height, s = game.editSeal;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(0, 0, W, H);
    const G = H - 16; ctx.strokeStyle = U.INK; ctx.lineWidth = 1.5; U.inkLine(ctx, 0, G, W, G, 3, 0.6);
    // lanceur
    const px = 26, py = G; ctx.fillStyle = '#6b3f73'; ctx.beginPath(); ctx.moveTo(px - 7, py - 4); ctx.lineTo(px + 7, py - 4); ctx.lineTo(px + 3, py - 22); ctx.lineTo(px - 3, py - 22); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(px, py - 27, 5, 0, U.TAU); ctx.fillStyle = '#efdcc0'; ctx.fill(); ctx.stroke();
    if (!s.core || !s.shape) { U.txt(ctx, s.core ? 'Choisis une forme.' : 'Pose un glyphe d\'effet.', W / 2, H / 2, 13, 'center', '#6b4f2a', 'IM Fell English', 'italic'); return; }
    const col = DATA.CORES[s.core].couleur, col2 = s.core2 && s.taille !== 'petit' ? DATA.CORES[s.core2].couleur : null;
    const prm = Seal.params(s), trs = Seal.triggers(s);
    const prim = trs.find((t) => ['immediat', 'contact', 'retarde', 'commande', 'proximite'].includes(t)) || 'immediat';
    const P = 3.2, t = (time % P) / P;
    const sx = px + 12, sy = py - 18, tx = W - 60, ty = G - 30;
    const burst = (x, y, r, k, cc = col) => { if (k <= 0 || k >= 1) return; ctx.save(); ctx.globalAlpha = 1 - k; ctx.strokeStyle = cc; ctx.lineWidth = 3 * (1 - k) + 1; U.inkCircle(ctx, x, y, r * (0.3 + k), 4, 1.2); if (col2) { ctx.strokeStyle = col2; U.inkCircle(ctx, x, y, r * (0.15 + k * 0.7), 5, 1); } ctx.restore(); };
    // cible et filtre
    const cible = s.taille !== 'petit' ? s.cible : null;
    if (cible === 'creature') { ctx.fillStyle = 'rgba(31,26,22,0.75)'; ctx.beginPath(); ctx.ellipse(tx, G - 7, 12, 7, 0, 0, U.TAU); ctx.fill(); ctx.fillStyle = '#efe3c4'; ctx.beginPath(); ctx.arc(tx + 4, G - 10, 2, 0, U.TAU); ctx.fill(); }
    if (cible === 'marque') Seal.glyph(ctx, 'marque', tx, ty, 7, '#c08a2a', 2);
    const filtre = s.taille !== 'petit' ? s.filtre : null;
    if (filtre) { ctx.fillStyle = 'rgba(168,151,122,0.5)'; ctx.fillRect(W / 2 - 6, G - 56, 12, 56); U.hatch(ctx, W / 2 - 6, G - 56, 12, 56, 4, Math.PI / 4, 3, 0.4); if (filtre !== 'creature') { ctx.fillStyle = DATA.FILTRES[filtre].couleur; ctx.globalAlpha = 0.6; ctx.fillRect(tx - 16, ty + 6, 32, 10); ctx.globalAlpha = 1; } }
    // phase 1 : le sort part (0 → 0.35)
    const arr = 0.35; let ix = tx, iy = ty;
    const enVol = (k) => { const fl = ['lumiere', 'vent', 'ombre', 'foudre', 'gravite', 'son', 'esprit', 'temps', 'metamorphose', 'rembobinage'].includes(s.core); let x = U.lerp(sx, tx, k), y = U.lerp(sy, ty, k) - (fl ? 0 : Math.sin(k * Math.PI) * 26);
      if (prm.traj === 'spirale') y += Math.sin(k * 34) * 9 * Math.min(1, k * 4);
      else if (prm.traj === 'zigzag') y += (2 / Math.PI) * Math.asin(Math.sin(k * 30)) * 9;
      else if (prm.traj === 'cloche') y = U.lerp(sy, ty, k) - Math.sin(k * Math.PI) * 70;
      else if (prm.traj === 'rasesol') y = G - 6;
      else if (prm.traj === 'boomerang') { const kk = k < 0.5 ? k * 2 : 2 - k * 2; x = U.lerp(sx, tx, kk); y = U.lerp(sy, ty, kk) - Math.sin(k * U.TAU) * 16; }
      return { x, y }; };
    switch (s.shape) {
      case 'projectile': case 'chaine': {
        if (t < arr) { const q = enVol(t / arr); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(q.x, q.y, 5 * Math.min(1.6, prm.size), 0, U.TAU); ctx.fill(); ctx.strokeStyle = U.INK; ctx.stroke(); if (prm.extra) { ctx.beginPath(); ctx.arc(q.x, q.y + 10, 4, 0, U.TAU); ctx.fill(); ctx.stroke(); } }
        if (s.shape === 'chaine' && t > arr && t < 0.65) { const k = (t - arr) / 0.3; const pts = [[tx, ty], [tx + 30, ty - 24], [tx + 48, ty + 4]]; const i = Math.min(2, Math.floor(k * 3)); const f = k * 3 - i; const a = pts[i], b = pts[Math.min(2, i + 1)]; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(U.lerp(a[0], b[0], f), U.lerp(a[1], b[1], f), 4, 0, U.TAU); ctx.fill(); for (const q of pts) burst(q[0], q[1], 14, (t - arr) * 3); }
        break;
      }
      case 'trait': if (t < arr) { ctx.strokeStyle = col; ctx.globalAlpha = 1 - t / arr; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(tx, ty); ctx.stroke(); ctx.globalAlpha = 1; } break;
      case 'soi': case 'aura': ix = px; iy = py - 16; if (s.shape === 'aura') { ctx.strokeStyle = col; ctx.globalAlpha = 0.6; ctx.setLineDash([3, 4]); U.inkCircle(ctx, ix, iy, 24 + Math.sin(time * 3) * 2, 2, 1); ctx.setLineDash([]); ctx.globalAlpha = 1; } break;
      case 'mur': if (t > 0.1) for (let k = -2; k <= 2; k++) burst(tx, ty + k * 12, 9, (t - 0.1) * 2.5); break;
      case 'totem': ctx.strokeStyle = U.INK; ctx.lineWidth = 2; U.inkLine(ctx, tx, G, tx, G - 30, 2, 0.4); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(tx - 6, G - 30); ctx.lineTo(tx + 6, G - 30); ctx.lineTo(tx, G - 40); ctx.closePath(); ctx.fill(); ctx.stroke(); for (let k = 0; k < 3; k++) burst(tx, G - 24, 22, ((t * 3) % 1)); iy = G - 24; break;
      case 'pluie': for (let k = 0; k < 7; k++) { const yy = 8 + ((t * 90 + k * 13) % (G - 10)); ctx.fillStyle = col; ctx.fillRect(tx - 30 + k * 10, yy, 2, 6); } ctx.strokeStyle = U.INK; ctx.globalAlpha = 0.5; for (let k = 0; k < 4; k++) U.inkCircle(ctx, tx - 22 + k * 15, 8, 8, k, 0.6); ctx.globalAlpha = 1; break;
      case 'objet': ctx.fillStyle = 'rgba(170,130,70,0.5)'; ctx.fillRect(tx - 10, G - 20, 20, 20); ctx.strokeStyle = U.INK; ctx.strokeRect(tx - 10, G - 20, 20, 20); ctx.strokeStyle = col; ctx.globalAlpha = 0.5 + Math.sin(time * 6) * 0.3; ctx.strokeRect(tx - 13, G - 23, 26, 26); ctx.globalAlpha = 1; iy = G - 10; break;
      case 'invocation': apercuFamilier(ctx, s, px, G, tx, t); break;
      case 'bouclier': ctx.strokeStyle = col; ctx.lineWidth = 6; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.arc(px, py - 16, 26, -1, 1); ctx.stroke(); ctx.globalAlpha = 1; break;
      case 'vague': { const x = U.lerp(px + 14, W - 20, Math.min(1, t * 1.4)); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.moveTo(x - 16, G); ctx.quadraticCurveTo(x - 2, G - 24, x + 10, G - 12); ctx.quadraticCurveTo(x + 5, G - 7, x + 8, G - 3); ctx.stroke(); ctx.globalAlpha = 1; break; }
      case 'colonne': { const k = Math.min(1, t * 3); ctx.fillStyle = col; ctx.globalAlpha = 0.35; ctx.fillRect(tx - 6, G - 60 * k, 12, 60 * k); ctx.globalAlpha = 0.9; ctx.strokeStyle = col; ctx.lineWidth = 1.5; for (let j = 0; j < 3; j++) { const yy = G - ((t * 2 + j / 3) % 1) * 60 * k; ctx.beginPath(); ctx.moveTo(tx - 4, yy); ctx.lineTo(tx + 4, yy - 6); ctx.stroke(); } ctx.globalAlpha = 1; break; }
    }
    // phase 2 : l'impact selon le déclencheur
    const instant = ['zone', 'trait'].includes(s.shape) ? 0.05 : arr;
    const tImpact = s.shape === 'soi' || s.shape === 'aura' ? 0.05 : instant;
    let tBurst = tImpact;
    if (prim === 'retarde') { tBurst = tImpact + 0.3; if (t > tImpact && t < tBurst) { ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ix, iy, 9, -Math.PI / 2, -Math.PI / 2 + U.TAU * (t - tImpact) / 0.3); ctx.stroke(); U.txt(ctx, s.delai + 's', ix + 14, iy - 12, 10, 'left', '#6b4f2a'); } }
    if (prim === 'commande') { tBurst = tImpact + 0.35; if (t > tImpact && t < tBurst) { ctx.strokeStyle = col; ctx.globalAlpha = 0.5 + Math.sin(time * 10) * 0.4; U.inkCircle(ctx, ix, iy, 9, 3, 0.6); ctx.globalAlpha = 1; ctx.fillStyle = '#f6eed8'; ctx.fillRect(ix + 8, iy - 24, 14, 14); ctx.strokeStyle = U.INK; ctx.strokeRect(ix + 8, iy - 24, 14, 14); U.txt(ctx, 'F', ix + 15, iy - 17, 11, 'center', U.INK); } }
    const cleP = !prm.inverse && s.shape !== 'invocation' ? DATA.comboCle(Seal.effets(s)) : null;
    if (cleP && t > tBurst) apercuPhenomene(ctx, cleP, s, ix, iy, G, sx, sy, (t - tBurst) * P, col, col2);
    else if (!['chaine', 'mur', 'totem', 'pluie', 'invocation', 'bouclier', 'objet', 'vague', 'colonne'].includes(s.shape)) burst(ix, iy, 30 * Math.min(1.8, prm.size), (t - tBurst) / 0.22);
    if (trs.includes('repetition')) for (let k = 1; k <= 3; k++) burst(ix, iy, 22, (t - tBurst - k * 0.13) / 0.12);
    if (trs.includes('expiration')) { const te = 0.84; if (t < te && t > tBurst) Seal.glyph(ctx, 'expiration', ix, iy - 22, 5, col, 2); burst(ix, iy, 40, (t - te) / 0.15); }
    // sous-sceau
    const sb = Seal.subs(s)[0];
    if (sb && sb.core) { const k = (t - tBurst - 0.1) / 0.3; if (k > 0 && k < 1) { const c2 = DATA.CORES[sb.core].couleur; ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(ix + k * 40, iy - Math.sin(k * Math.PI) * 30, 4, 0, U.TAU); ctx.fill(); } burst(ix + 40, iy, 18, (t - tBurst - 0.4) / 0.2, DATA.CORES[sb.core].couleur); }
  }
  // la créature qu'on invoque, qui trotte ou vole vers la cible
  function apercuFamilier(ctx, s, px, G, tx, t) {
    const e = DATA.FAMILIERS[s.core] ? s.core : 'feu', F = DATA.FAMILIERS[e];
    const k = Math.min(1, t * 2.2), x = U.lerp(px + 26, tx - 30, k), vole = F.mode === 'vol' || F.mode === 'orbite';
    const c = { espece: e, w: F.w, h: F.h, x: x - F.w / 2, y: (vole ? G - 38 + Math.sin(time * 4) * 4 : G) - F.h, dir: 1, vx: k < 1 ? 60 : 0, vy: 0, phase: time, seed: 3, life: 10, hurt: 0, vole, roule: time * 4, coup: k >= 1 ? Math.max(0, Math.sin(time * 5)) : 0, souffle: k >= 1 ? 0.6 + 0.4 * Math.sin(time * 9) : 0, echelle: 1, age: 0 };
    if (e === 'metamorphose') { const m = (time % 6) / 6; c.stade = m < 0.45 ? 'chenille' : m < 0.6 ? 'cocon' : 'papillon'; c.stadeT = 2; if (c.stade === 'papillon') { c.vole = true; c.y = G - 50; c.w = 26; c.h = 16; } }
    try { Familiers.dessiner(ctx, c, time); } catch (err) { /* aperçu seulement */ }
    U.txt(ctx, F.nom, (px + tx) / 2, 14, 12, 'center', '#6b4f2a', 'IM Fell English', 'italic');
  }
  // le phénomène d'une fusion, en petit : connu, il se montre ; inconnu, c'est un mystère
  function apercuPhenomene(ctx, cle, s, ix, iy, G, sx, sy, dt, col, col2) {
    const connu = !!(game.progress.combos && game.progress.combos[cle]);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, ctx.canvas.width, ctx.canvas.height); ctx.clip();
    if (!connu) {
      ctx.translate(ix, iy); ctx.rotate(time * 1.5); ctx.lineWidth = 2;
      for (let k = 0; k < 2; k++) { ctx.strokeStyle = k ? (col2 || col) : col; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.arc(0, 0, 14 + k * 5, k * 2, k * 2 + 4.2); ctx.stroke(); }
      ctx.rotate(-time * 1.5); ctx.globalAlpha = 1; U.txt(ctx, '?', 0, 6, 18, 'center', '#6b4f2a', 'IM Fell English', '');
      ctx.restore(); U.txt(ctx, 'Fusion inconnue', ix, 14, 12, 'center', '#6b4f2a', 'IM Fell English', 'italic'); return;
    }
    const PHN = World.phen, D = PHN && PHN.defDe(cle);
    if (D && D.draw) {
      const r = D.r * 0.45, pts = [];
      for (let k = 0; k <= 12; k++) { const u = k / 12; pts.push([U.lerp(sx, ix + 20, u), U.lerp(G - 2, G - 2, u) - Math.sin(u * Math.PI) * 40]); }
      const ph = { id: cle, D, x: ix, y: iy, r, r0: r, t: dt, life: 4, max: 5, sz: 0.45, pw: 1, g: 'point', acc: {}, dir: { x: 1, y: 0 }, vx: 120, vy: 300, R: r * 5, H: 60, spot: { x: ix, y: G - 2 },
        ligne: { x1: sx, y1: sy, x2: ix, y2: G - 2, w: 6 }, rect: { x0: ix - 9, x1: ix + 9, y0: G - 70, y1: G }, objs: [{ x: ix - 28, y: iy, w: 56, h: 6 }], arc: pts,
        motes: [0, 1, 2, 3, 4, 5].map((k) => ({ x: ix + Math.cos(time * 1.3 + k) * 22, y: iy + Math.sin(time * 1.7 + k * 2) * 14, ph: k })),
        data: { pts: FX.eclairPts(ix, G - 70, ix, G, 0.15), statues: [], vert: true, eau: 60, hits: new Set(), c: [], orb: [], top: G - 70, q: [], chemin: [] } };
      if (D.bouge === 'tombe') { const u = (dt % 1.2) / 1.2; ph.x = ix - 40 + u * 40; ph.y = 10 + u * (G - 14); }
      if (['eau|feu', 'feu|terre', 'feu|temps', 'eau|vie', 'feu|vent', 'feu|vie', 'eau|terre'].includes(cle)) { ph.y = G - 1; ph.x = ix; }
      try { D.draw(ctx, ph, time); } catch (err) { /* aperçu seulement */ }
    }
    ctx.restore();
    U.txt(ctx, DATA.comboInfo(cle).nom, ix, 14, 12, 'center', '#6b4f2a', 'IM Fell English', 'italic');
  }
  // recopier une fusion ou un familier sur la table des sceaux
  function versLaTable(seal) { game.editSeal = Seal.clone(Object.assign({ taille: seal.core3 ? 'grand' : 'moyen', shape: 'zone', trigger: 'immediat', mods: [] }, seal)); selSlot = null; openPanel('seal'); toast('Le sceau est posé sur la table : change la forme ou les réglages à ton idée.'); }
  function possedeRecette(R) { const p = game.progress; const manque = []; for (const c of [R.core, R.core2, R.core3].filter(Boolean)) if (!p.cores.includes(c)) manque.push(DATA.CORES[c].nom); if (R.core3 && !p.tailles.includes('grand')) manque.push('le grand sceau'); for (const m of R.mods) if (!p.mods.includes(m)) manque.push(DATA.MODS[m].nom); if (R.core2 && !p.fusion) manque.push('la fusion'); return manque; }
  function drawSealCanvas() {
    const c = $('#seal-canvas'); if (!c || open !== 'seal') return;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    const g = glisse && glisse.actif ? glisse : null;
    const bancal = Seal.equilibre(game.editSeal).etat === 'bancal';
    ctx.save(); if (bancal) { ctx.translate(c.width / 2, c.height / 2 + 10); ctx.rotate(Math.sin(time * 2.2) * 0.035); ctx.translate(-c.width / 2, -(c.height / 2 + 10)); }
    Seal.draw(ctx, game.editSeal, c.width / 2, c.height / 2 + 10, SEAL_R, { croissance: casesCroissance(), t: time, slots: game.progress.slots, highlight: selSlot, empty: true, fusion: game.progress.fusion, filtres: game.progress.filtres.length > 0, cibles: game.progress.cibles.length > 1,
      accepte: g ? g.accepte : survolPal ? casesPour(survolPal) : null, survol: g ? g.survol : null, cache: g ? g.from : null, inutiles: Seal.inutiles(game.editSeal).map((q) => q.sid) });
    ctx.restore();
    // survol d'une case : ce que ce glyphe coûte ici
    if (survolCase && !g) { const sl = Seal.slotList(c.width / 2, c.height / 2 + 10, sealR(), game.editSeal.taille || 'moyen').find((q) => q.id === survolCase); const v = Seal.coutCase(game.editSeal, survolCase); if (sl && v) { const lab = (Math.round(v * 10) / 10) + ' encre'; ctx.save(); ctx.font = '12px "IM Fell English", Georgia, serif'; const w = ctx.measureText(lab).width + 10, x = Math.min(c.width - w - 2, sl.x + sl.r + 4), y = sl.y - sl.r - 4; ctx.fillStyle = 'rgba(246,238,216,0.95)'; ctx.strokeStyle = U.INK; ctx.lineWidth = 1; ctx.fillRect(x, y - 13, w, 17); ctx.strokeRect(x, y - 13, w, 17); U.txt(ctx, lab, x + w / 2, y - 1, 12, 'center', '#6b4f2a'); ctx.restore(); } }
    const combo = Seal.comboName(game.editSeal);
    const cleH = DATA.comboCle(Seal.effets(game.editSeal)), infoH = cleH && DATA.comboInfo(cleH);
    const hint = combo ? 'Fusion : ' + combo + '.' : infoH ? 'Fusion inconnue — ' + infoH.indice : selSlot === 'core2' ? 'Choisis un second glyphe d\'effet : les deux fusionnent.' : selSlot === 'core3' ? 'Un troisième effet : certaines fusions à trois existent.' : selSlot === 'filtre' ? 'Choisis un filtre de matière.' : selSlot === 'cible' ? 'Choisis une cible.' : selSlot === 'trigger2' ? 'Choisis un second déclencheur.' : selSlot && Seal.isSub(lireSlot(game.editSeal, selSlot)) ? 'Encore un clic : ouvrir ce sous-sceau sur place.' : selSlot && lireSlot(game.editSeal, selSlot) != null ? 'Encore un clic, Suppr, ou glisse-le hors du cercle : il s\'en va.' : selSlot ? 'Choisis un glyphe : les palettes qui n\'y vont pas s\'estompent.' : g ? (g.from ? (g.copie ? 'Dépose la copie sur une case dorée.' : 'Sur une case dorée (Maj : une copie), ou hors du cercle : retiré.') : 'Dépose-le sur une case dorée.') : game.progress.fusion ? 'Glisse un glyphe sur le cercle. Sous le centre : un effet à fusionner.' : 'Glisse un glyphe sur le cercle, ou clique une case puis un glyphe.';
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
    // aperçu sensoriel
    const sens = game.sens(caulIngr.filter(Boolean), caulSteps);
    const sb = $('#caul-sens');
    if (!sens) sb.innerHTML = '<span class="muted">Le chaudron attend. Dépose des ingrédients : il te dira ce qu\'il sent.</span>';
    else sb.innerHTML = '<div class="sens-lines">' + sens.lines.map((l) => '<div>' + l + '</div>').join('') + '</div>';
    drawCaulCanvas(sens);
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
      it.innerHTML = '<i style="background:' + P.couleur + '"></i><div><b>' + P.nom + '</b> ×' + n + (P.bizarre ? ' <small class="muted">(bizarre)</small>' : '') + '<br><small>' + P.desc + ' <em>(' + (P.usage === 'boire' ? 'à boire' : 'à lancer') + ')</em></small></div>';
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
  let caulSens = null;
  function drawCaulCanvas(sens) {
    caulSens = sens;
    const c = $('#caul-canvas'); if (!c) return; const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    const cx = c.width / 2, cy = c.height / 2 + 6;
    ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = U.INK; ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(40,34,30,0.85)';
    ctx.beginPath(); ctx.moveTo(cx - 40, cy - 14); ctx.quadraticCurveTo(cx - 46, cy + 30, cx, cy + 32); ctx.quadraticCurveTo(cx + 46, cy + 30, cx + 40, cy - 14); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(60,52,46,0.9)'; ctx.beginPath(); ctx.ellipse(cx, cy - 14, 42, 8, 0, 0, U.TAU); ctx.fill(); ctx.stroke();
    const cols = sens ? sens.couleur : ['#5c8f3e'];
    const g = ctx.createLinearGradient(cx - 36, 0, cx + 36, 0); cols.forEach((q, i) => g.addColorStop(cols.length === 1 ? 0 : i / (cols.length - 1), q)); if (cols.length === 1) g.addColorStop(1, cols[0]);
    ctx.fillStyle = g; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.ellipse(cx, cy - 14, 36, 5, 0, 0, U.TAU); ctx.fill(); ctx.globalAlpha = 1;
    const n = sens ? 3 + caulSteps.length * 2 : 1;
    for (let i = 0; i < n; i++) { const t = (time * 0.7 + i * 0.37) % 1; const bx = cx - 30 + ((i * 23) % 60), by = cy - 14 - t * 26; ctx.globalAlpha = 1 - t; ctx.strokeStyle = cols[i % cols.length]; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(bx, by, 2 + t * 4, 0, U.TAU); ctx.stroke(); }
    ctx.restore();
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
      const indice = (kind, id) => { const u = DATA.UNLOCKS.find((q) => ((kind === 'mod' && (q.type === 'mods' || q.type === 'marque')) || (kind === 'filtre' && q.type === 'filtres') || (kind === 'cible' && (q.type === 'cible' || q.type === 'marque')) || q.type === kind) && (q.item === id || (Array.isArray(q.item) && q.item.includes(id)))); return u ? u.indice : null; };
      const grp = (titre, dict, list, kind, garder) => {
        const ids = Object.keys(dict).filter((id) => !dict[id].interne && (!garder || garder(dict[id])));
        if (!ids.length) return;
        const n = ids.filter((id) => list.includes(id)).length;
        c.appendChild(el('h3', '', titre + ' <small>(' + n + ' / ' + ids.length + ')</small>'));
        const g = el('div', 'glyph-grid');
        for (const id of ids) {
          const d = dict[id], ok = list.includes(id);
          const it = el('div', 'glyph-card' + (ok ? '' : ' verrou'));
          const cv = document.createElement('canvas'); cv.width = 48; cv.height = 48;
          const col = kind === 'core' ? d.couleur : kind === 'filtre' ? d.couleur : d.aspect ? DATA.CORES[d.aspect].couleur : U.INK;
          if (ok) Seal.glyph(cv.getContext('2d'), kind === 'filtre' ? 'f_' + id : kind === 'cible' ? 'c_' + id : id, 24, 24, 17, col, 1);
          else U.txt(cv.getContext('2d'), '?', 24, 26, 24, 'center', 'rgba(60,45,30,0.35)');
          it.appendChild(cv);
          const desc = d.desc || (kind === 'filtre' ? 'Avec Au contact, le sort ne réagit qu\'à : ' + d.nom.toLowerCase() + ', et traverse le reste.' : '');
          const ind = indice(kind, id);
          it.appendChild(el('div', '', ok ? '<b>' + d.nom + '</b> <small>(' + d.cout + ' encre)</small><br>' + desc : '<b>???</b><br><span class="muted">' + (ind ? 'Indice : ' + ind : 'Encore inconnu.') + '</span>'));
          g.appendChild(it);
        }
        c.appendChild(g);
      };
      // essences et aspects
      c.appendChild(el('h3', '', 'Essences et aspects'));
      c.appendChild(el('p', 'intro', 'Une essence est une force première. Ce qui en découle est un aspect : un glyphe du second anneau qui lui donne une autre nature (l\'Eau avec Gel devient le froid) ou la renforce (le Feu avec Chaleur). L\'usage d\'une essence t\'en apprend les aspects ; on peut doubler un aspect une fois Adepte, et un Maître paie ses sceaux moins cher.'));
      const lgBox = el('div', 'glyph-grid');
      for (const elt of DATA.ESSENCES) {
        if (!p.cores.includes(elt)) continue;
        const pts = (p.maitrise || {})[elt] || 0, niv = DATA.niveauMaitrise(pts);
        const S = DATA.MAITRISE.seuils, haut = S[Math.min(2, niv)], bas = niv ? S[niv - 1] : 0, k = niv >= 3 ? 1 : Math.min(1, (pts - bas) / (haut - bas));
        const asp = Object.keys(DATA.MODS).filter((m) => DATA.MODS[m].aspect === elt);
        const it = el('div', 'glyph-card');
        const cv = document.createElement('canvas'); cv.width = 48; cv.height = 48;
        Seal.glyph(cv.getContext('2d'), elt, 24, 24, 17, DATA.CORES[elt].couleur, 1);
        it.appendChild(cv);
        const lst = asp.map((m) => p.mods.includes(m) ? '<b style="color:' + DATA.CORES[elt].couleur + '">' + DATA.MODS[m].nom + '</b>' : '<span class="muted">???</span>').join(' · ');
        it.appendChild(el('div', '', '<b>' + DATA.CORES[elt].nom + '</b> — ' + DATA.MAITRISE.noms[niv] + '<div class="barre-maitrise"><i style="width:' + Math.round(k * 100) + '%;background:' + DATA.CORES[elt].couleur + '"></i></div>' + (asp.length ? 'Aspects : ' + lst : '<span class="muted">Pas d\'aspect.</span>')));
        lgBox.appendChild(it);
      }
      c.appendChild(lgBox);
      grp('Glyphes d\'effet (centre)', DATA.CORES, p.cores, 'core');
      grp('Formes (premier anneau)', DATA.SHAPES, p.shapes, 'shape');
      grp('Modificateurs (second anneau) — ' + p.slots + ' emplacement(s)', DATA.MODS, p.mods, 'mod', (d) => !d.aspect);
      grp('Aspects (second anneau, avec leur essence)', DATA.MODS, p.mods, 'mod', (d) => !!d.aspect);
      grp('Déclencheurs (pointe haute ; deux pour le grand sceau)', DATA.TRIGGERS, p.triggers, 'trigger');
      grp('Filtres de matière (pointe droite)', DATA.FILTRES, p.filtres, 'filtre');
      grp('Cibles (pointe gauche)', DATA.CIBLES, p.cibles, 'cible');
      if (false) {
      c.appendChild(el('p', '', p.filtres.length ? p.filtres.map((f) => DATA.FILTRES[f].nom).join(', ') + '. Avec Au contact, le sort ne réagit qu\'à cette matière et traverse tout le reste.' : '<span class="muted">Pas encore connus.</span>'));
      c.appendChild(el('h3', '', 'Cibles (pointe gauche)'));
      c.appendChild(el('p', '', p.cibles.map((q) => DATA.CIBLES[q].nom + ' : ' + DATA.CIBLES[q].desc).join('<br>')));
      }
      c.appendChild(el('h3', '', 'Tailles de sceau'));
      c.appendChild(el('p', '', Object.values(DATA.TAILLES).map((T) => (p.tailles.includes(T.id) ? '<b>' + T.nom + '</b>' : '<span class="muted">' + T.nom + ' (scellé)</span>') + ' : ' + T.desc).join('<br>')));
      c.appendChild(el('p', 'intro', 'Lancer : maintenir le clic charge le sort (plus fort, plus loin, plus cher). ' + (p.deuxMains ? 'Clic droit : main gauche (Maj + 1-5 pour la choisir).' : 'La main gauche viendra avec l\'expérience.') + ' F libère les sorts Sur commande. Deux projectiles qui se croisent fusionnent.'));
      if (p.fusion) c.appendChild(el('p', 'intro', 'Deux effets dans un même sceau peuvent fusionner en un phénomène : voir l\'onglet Fusions.'));
      c.appendChild(el('p', 'intro', 'Déclencheurs : <b>Immédiat</b> agit en continu sur ce que le sort touche (un projectile traverse les créatures). <b>Au contact</b> éclate en zone à la première chose touchée. <b>Retardé</b> se fixe et éclate après deux secondes.'));
    } else if (grimTab === 'fusions') {
      const pc = p.combos || {};
      c.appendChild(el('p', 'intro', 'Pose deux effets dans un sceau (le second sous le cercle, sur un sceau moyen ou grand) : certaines paires font naître un phénomène qui dure, a sa propre physique et prend la forme du sceau (en projectile, en mur, en colonne, en trait, sur soi...). Un aspect compte comme son effet : l\'Eau avec Gel, c\'est le froid. La fusion remplace les deux effets de base.'));
      if (!p.fusion) c.appendChild(el('p', 'muted', 'La fusion de deux effets viendra avec l\'expérience.'));
      const cles = Object.keys(DATA.COMBOS); const nConnus = cles.filter((k) => pc[k]).length;
      c.appendChild(el('h3', '', 'Phénomènes (' + nConnus + ' / ' + cles.length + ')'));
      const possede = (e) => { if (p.cores.includes(e)) return true; for (const a in DATA.ASPECTS) if (DATA.ASPECTS[a].devient === e) return p.cores.includes(DATA.ASPECTS[a].aspect) && p.mods.includes(a); return false; };
      const tri = cles.slice().sort((a, b) => (pc[b] ? 1 : 0) - (pc[a] ? 1 : 0));
      for (const k of tri) {
        const I = DATA.COMBOS[k];
        if (pc[k]) { const d = el('div', 'recette', '<b>' + I.nom + '</b> <span class="muted">(' + recetteCombo(k) + ', lancé ' + pc[k] + ' fois)</span><br>' + I.desc + ' '); const R = DATA.recetteCombo(k); if (R) { const manque = possedeRecette(R); const b = el('button', 'choice mini', manque.length ? 'Il te manque : ' + manque.join(', ') : 'Copier sur la table'); if (manque.length) b.disabled = true; else b.addEventListener('click', () => versLaTable(R)); d.appendChild(b); } c.appendChild(d); }
        else { const pret = k.split('|').every(possede); c.appendChild(el('div', 'recette verrou', '<b>???</b> — <i>' + I.indice + '</i>' + (pret ? ' <span class="muted">Tu as de quoi le tenter.</span>' : ''))); }
      }
      { const tr = Object.keys(DATA.TRIOS), nt = tr.filter((k) => pc[k]).length;
        c.appendChild(el('h3', '', 'Fusions à trois (' + nt + ' / ' + tr.length + ')'));
        c.appendChild(el('p', 'intro', 'Le grand sceau a un troisième emplacement d\'effet, à gauche de l\'anneau intérieur.'));
        for (const k of tr) { const I = DATA.TRIOS[k]; if (pc[k]) { const d = el('div', 'recette', '<b>' + I.nom + '</b> <span class="muted">(' + recetteCombo(k) + ')</span><br>' + I.desc + ' '); const R = DATA.recetteCombo(k); const manque = possedeRecette(R); const b = el('button', 'choice mini', manque.length ? 'Il te manque : ' + manque.join(', ') : 'Copier sur la table'); if (manque.length) b.disabled = true; else b.addEventListener('click', () => versLaTable(R)); d.appendChild(b); c.appendChild(d); } else c.appendChild(el('div', 'recette verrou', '<b>???</b> — <i>' + I.indice + '</i>')); } }
      c.appendChild(el('h3', '', 'Familles'));
      for (const g in DATA.GENRES) {
        const G = DATA.GENRES[g], faits = Object.keys(pc).filter((k) => { const I = DATA.comboInfo(k); return I && I.genre === g; });
        c.appendChild(el('div', 'recette', '<b>' + G.nom + '</b> : ' + DATA.CORES[g].nom + ' + n\'importe quel autre effet. ' + G.desc + (faits.length ? '<br><span class="muted">Déjà : ' + faits.map((k) => DATA.comboInfo(k).nom).join(', ') + '.</span>' : '')));
      }
    } else if (grimTab === 'recettes') {
      c.appendChild(el('p', 'intro', 'Le chaudron accepte jusqu\'à trois ingrédients et trois étapes, dans l\'ordre. Les recettes inconnues ne sont que des énigmes ; le chaudron lui-même te guide par l\'odeur et le bruit.'));
      const bz = (p.bizarresVues || []); if (bz.length) { c.appendChild(el('h3', '', 'Potions bizarres rencontrées')); for (const id of bz) { const B = DATA.BIZARRES[id]; if (B) c.appendChild(el('div', 'recette', '<b>' + B.nom + '</b> — ' + B.desc)); } }
      for (const id in DATA.POTIONS) {
        const P = DATA.POTIONS[id]; if (P.bizarre) continue; const ok = p.recettes.includes(id);
        c.appendChild(el('div', 'decouverte' + (ok ? ' ok' : ''), '<span class="check" style="color:' + P.couleur + '">' + (ok ? '●' : '○') + '</span><div><b>' + (ok ? P.nom : '???') + '</b><br>' + (ok ? P.ingr.map((i) => DATA.INGREDIENTS[i].nom).join(' + ') + ' → ' + P.etapes.map((s) => DATA.STEPS[s].nom).join(', ') + '<br><small>' + P.desc + '</small>' : '<em>' + P.enigme + '</em>') + '</div>'));
      }
    } else if (grimTab === 'ingredients') {
      for (const id in DATA.INGREDIENTS) {
        const I = DATA.INGREDIENTS[id]; const vu = I.infini || p.ingredientsVus.includes(id); const n = I.infini ? '∞' : (game.inv.ingredients[id] || 0);
        c.appendChild(el('div', 'decouverte' + (vu ? ' ok' : ''), '<span class="check"><i class="dot" style="background:' + (vu ? I.couleur : '#aaa') + '"></i></span><div><b>' + (vu ? I.nom : '???') + '</b> <small>×' + n + '</small><br><em>' + I.desc + '</em></div>'));
      }
    } else if (grimTab === 'intuitions') {
      c.appendChild(el('h3', '', 'Enchaînements'));
      c.appendChild(el('p', 'intro', 'Deux sorts à la suite, la seconde qui suit le premier, au même endroit : certaines paires ont un nom.'));
      for (const k in DATA.ENCHAINEMENTS) { const E = DATA.ENCHAINEMENTS[k]; const ok = (p.enchainements || []).includes(k); const [a, b] = k.split('>'); c.appendChild(el('div', 'decouverte' + (ok ? ' ok' : ''), '<span class="check">' + (ok ? '✓' : '○') + '</span><div><b>' + (ok ? E.nom : '???') + '</b> <small>' + (ok ? DATA.CORES[a].nom + ' puis ' + DATA.CORES[b].nom : DATA.CORES[a].nom + ' puis ???') + '</small>' + (ok ? '<br><em>' + E.desc + '</em>' : '') + '</div>')); }
      c.appendChild(el('h3', '', 'Phénomènes'));
      c.appendChild(el('p', 'intro', 'L\'encyclopédie des réactions : chaque phénomène observé dehors s\'inscrit ici, et certains font germer des glyphes au bout de trois observations. Les orages, la lave, la glace et l\'acide sont de bons professeurs.'));
      for (const id in DATA.OBSERVATIONS) {
        const O = DATA.OBSERVATIONS[id]; const n = p.obs[id] || 0;
        const asO = O.glyphe && DATA.MIGRATION[O.glyphe] ? DATA.MIGRATION[O.glyphe][1] : null; const g = asO ? DATA.MODS[asO] : O.glyphe ? DATA.CORES[O.glyphe] : null; const connu = g && (asO ? p.mods.includes(asO) : p.cores.includes(O.glyphe));
        c.appendChild(el('div', 'decouverte' + (n > 0 ? ' ok' : ''), '<span class="check">' + (n >= 3 || connu ? '✓' : n > 0 ? n : '○') + '</span><div><b>' + (n > 0 ? O.nom : '???') + '</b> ' + (g ? '<small>→ glyphe ' + (connu ? g.nom : '???') + '</small>' : '<small>(expérience)</small>') + '<br><em>' + O.desc + '</em></div>'));
      }
    } else if (grimTab === 'carte') {
      game.ensureWorld();
      c.appendChild(el('p', 'intro', 'La carte se dessine à mesure que tu explores. Les pages déchirées retrouvées y sont marquées.'));
      const cv = document.createElement('canvas'); cv.width = Sim.W; cv.height = Sim.H; cv.className = 'carte'; c.appendChild(cv);
      dessinerCarte(cv);
      const leg = el('p', 'muted', '● toi · ⌂ le labo · ✎ pages retrouvées · les zones grises restent à explorer'); c.appendChild(leg);
    } else if (grimTab === 'lettres') {
      c.appendChild(el('p', 'intro', 'Les lettres du maître auxquelles tu as répondu, et les souvenirs qu\'il t\'a envoyés.'));
      const faites = DATA.LETTRES.filter((l) => game.courrier.faites.includes(l.id));
      if (!faites.length) c.appendChild(el('p', 'muted', 'Aucune lettre pour l\'instant. Le corbeau passe quand tu es dehors depuis un moment.'));
      for (const l of faites) c.appendChild(el('div', 'decouverte ok', '<span class="check">✉</span><div><b>' + l.titre + '</b><br><em>« ' + l.merci + ' »</em></div>'));
      c.appendChild(el('h3', '', 'Trophées'));
      if (!game.trophees.length) c.appendChild(el('p', 'muted', 'L\'étagère est vide.'));
      for (const id of game.trophees) { const T = DATA.TROPHEES[id]; c.appendChild(el('div', 'decouverte ok', '<span class="check"><i class="dot" style="background:' + T.couleur + '"></i></span><div><b>' + T.nom + '</b><br><em>' + T.desc + '</em></div>')); }
      c.appendChild(el('p', 'muted', 'Encre en plus, pour toujours : +' + (game.bonus.encre || 0) + ' · Vitalité en plus : +' + (game.bonus.vie || 0)));
    } else if (grimTab === 'bestiaire') {
      c.appendChild(el('p', 'intro', 'Les créatures du monde. Chacune aime un élément (qui l\'apprivoise) et en craint un autre (qui la fait fuir). Une créature apprivoisée te suit et t\'offre un cadeau de temps en temps.'));
      for (const id in DATA.ESPECES) {
        if (id === 'familier') continue;
        const sp = DATA.ESPECES[id]; const vu = p.especesVues.includes(id) || ['limace', 'follet', 'golem'].includes(id) && p.compteurs.kindsHit.includes('creature:' + id);
        const b = p.bestiaire[id] || {};
        c.appendChild(el('div', 'decouverte' + (vu ? ' ok' : ''), '<span class="check"><i class="dot" style="background:' + (vu ? (sp.couleur || '#1f1a16') : '#aaa') + '"></i></span><div><b>' + (vu ? sp.nom : '???') + '</b>' + (vu ? ' <small>' + (sp.hostile ? 'bouscule' : 'paisible') + (sp.nocturne ? ', nocturne' : sp.diurne ? ', diurne' : '') + '</small>' : '') + '<br><em>' + (vu ? sp.desc : 'Espèce non rencontrée.') + '</em>' + (vu ? '<br><small>Aime : ' + (b.aime ? DATA.CORES[sp.aime].nom : '???') + ' · Craint : ' + (b.craint ? DATA.CORES[sp.craint].nom : '???') + ' · Cadeau : ' + (b.aime && sp.drop ? DATA.INGREDIENTS[sp.drop].nom : '???') + '</small>' : '') + '</div>'));
      }
      // les familiers : un par essence, révélés à la première invocation
      const pf = p.familiers || {};
      c.appendChild(el('h3', '', 'Familiers (' + Object.keys(pf).filter((e) => DATA.FAMILIERS[e]).length + ' / ' + Object.keys(DATA.FAMILIERS).length + ')'));
      c.appendChild(el('p', 'intro', 'La forme Invocation fait naître le familier de l\'essence au centre du sceau. Il te suit, te défend, et chacun a son don.'));
      for (const e of DATA.ESSENCES) { const F = DATA.FAMILIERS[e]; if (!F) continue; const vu = !!pf[e]; const ligne = c.appendChild(el('div', 'decouverte' + (vu ? ' ok' : ''), '<span class="check"><i class="dot" style="background:' + (vu ? DATA.CORES[e].couleur : '#aaa') + '"></i></span><div><b>' + (vu ? F.nom : '???') + '</b> <small>' + DATA.CORES[e].nom + '</small><br>' + (vu ? F.desc : '<span class="muted">Invoque un familier ' + (DATA.DE[e] || ({ contre: 'du Contre-sort', metamorphose: 'de la Métamorphose' })[e] || '') + ' pour le rencontrer.</span>') + '</div>')); if (vu && p.shapes.includes('invocation') && p.cores.includes(e)) { const b = el('button', 'choice mini', 'Copier sur la table'); b.addEventListener('click', () => versLaTable({ core: e, shape: 'invocation' })); ligne.lastChild.appendChild(b); } }
      // les gardiens : un par région
      { const pv = p.gardiens || {}, vus = p.gardiensVus || [];
        c.appendChild(el('h3', '', 'Gardiens (' + Object.keys(DATA.GARDIENS).filter((g) => pv[g]).length + ' / ' + Object.keys(DATA.GARDIENS).length + ' vaincus)'));
        c.appendChild(el('p', 'intro', 'Chaque région a son gardien. Aucun ne tombe sous la seule force : chacun a son tour à trouver. Ils dorment tant que tu n\'as pas pris assez de forces, sauf si tu les provoques.'));
        for (const g in DATA.GARDIENS) { const G = DATA.GARDIENS[g], vu = vus.includes(g) || pv[g]; c.appendChild(el('div', 'decouverte' + (pv[g] ? ' ok' : ''), '<span class="check">' + (pv[g] ? '✦' : '<i class="dot" style="background:' + (vu ? G.couleur : '#aaa') + '"></i>') + '</span><div><b>' + (vu ? G.nom : '???') + '</b> <small>' + G.region + (pv[g] ? ', vaincu' : '') + '</small><br>' + (vu ? '<em>' + G.desc + '</em><br><small>' + G.indice + '</small>' : '<span class="muted">Quelque chose garde ' + G.region.replace(/^La /, 'la ').replace(/^Les /, 'les ').replace(/^Le /, 'le ') + '.</span>') + '</div>')); }
      }
    } else if (grimTab === 'pages') {
      c.appendChild(el('p', 'intro', 'Le maître a semé des pages de son grimoire aux quatre coins du monde : en hauteur, au fond, dans le noir. Chacune apprend quelque chose.'));
      for (const P of DATA.PAGES) {
        const lu = p.pagesLues.includes(P.id);
        c.appendChild(el('div', 'decouverte' + (lu ? ' ok' : ''), '<span class="check">' + (lu ? '📜' : '○') + '</span><div><b>' + (lu ? P.titre : '???') + '</b><br><em>' + (lu ? '« ' + P.texte + ' »' : 'Page non retrouvée.') + '</em></div>'));
      }
    } else if (grimTab === 'defis') {
      c.appendChild(el('h3', '', 'Leçons du maître'));
      const vues = p.leconsVues || [], faites = p.leconsFaites || [];
      for (const L of DATA.LECONS) { if (!vues.includes(L.id)) continue; const ok = faites.includes(L.id); c.appendChild(el('div', 'decouverte' + (ok ? ' ok' : ''), '<span class="check">' + (ok ? '✓' : '✉') + '</span><div><b>' + L.titre + '</b> <small>(+' + L.xp + ' exp.)</small><br><em>' + L.essai + '</em></div>')); }
      const reste = DATA.LECONS.length - vues.length; if (reste > 0) c.appendChild(el('p', 'muted', reste + ' leçon' + (reste > 1 ? 's' : '') + ' viendr' + (reste > 1 ? 'ont' : 'a') + ' avec les nouveautés.'));
      c.appendChild(el('h3', '', 'Épreuves'));
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

  // ---------- Carte ----------
  const COUL_CARTE = {};
  function dessinerCarte(cv) {
    const ctx = cv.getContext('2d'); const W = Sim.W, H = Sim.H; const M = Sim.M, P = Sim.P;
    if (!COUL_CARTE.ok) { for (let m = 0; m < P.length; m++) { const h = (P[m].color || '#000000').replace('#', ''); COUL_CARTE[m] = [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; } COUL_CARTE.ok = true; }
    const img = ctx.createImageData(W, H); const d = img.data; const mat = Sim.mat;
    const CB = 20, bw = Math.ceil(W / CB); const carte = game.carte || '';
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const k = (y * W + x) * 4; const vu = carte[Math.floor(y / CB) * bw + Math.floor(x / CB)] === '1';
      if (!vu) { const hh = ((x + y) % 6 === 0) ? 170 : 205; d[k] = hh; d[k + 1] = hh - 12; d[k + 2] = hh - 40; d[k + 3] = 255; continue; }
      const m = mat[y * W + x];
      if (m === M.AIR || P[m].gas) { d[k] = 246; d[k + 1] = 238; d[k + 2] = 216; d[k + 3] = 255; continue; }
      const c = COUL_CARTE[m]; const sh = P[m].solid && !P[m].powder ? 0.82 : 1;
      d[k] = c[0] * sh; d[k + 1] = c[1] * sh; d[k + 2] = c[2] * sh; d[k + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    // contours des zones et marques
    ctx.font = '14px "IM Fell English", Georgia, serif'; ctx.textAlign = 'center'; ctx.fillStyle = U.INK;
    for (const z of World.level().zones) { const zx = z.x / Sim.CS + z.w / Sim.CS / 2; if (carte[Math.floor(110 / CB) * bw + Math.floor(zx / CB)] === '1') ctx.fillText(z.nom, zx, 12); }
    const pr = World.state().p; ctx.fillStyle = '#9a4a3a'; ctx.beginPath(); ctx.arc((pr.x + pr.w / 2) / Sim.CS, (pr.y + pr.h / 2) / Sim.CS, 4, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = U.INK; ctx.stroke();
    ctx.fillStyle = U.INK; ctx.fillText('⌂', 7, 128);
    for (const o of World.objets()) if (o.t === 'page' && o.lue) { ctx.fillText('✎', (o.x + 10) / Sim.CS, (o.y + 12) / Sim.CS); }
  }
  // ---------- Options ----------
  function refreshOptions() {
    const c = $('#options-content'); c.innerHTML = '';
    const o = game.opt;
    const groupe = (titre, cle, choix) => {
      c.appendChild(el('h3', '', titre)); const g = el('div', 'choices');
      for (const [v, lab] of choix) { const b = el('button', 'choice' + (o[cle] === v ? ' on' : ''), lab); b.addEventListener('click', () => { o[cle] = v; game.appliquerOptions(); refreshOptions(); Son.sfx('click'); }); g.appendChild(b); }
      c.appendChild(g);
    };
    groupe('Vitesse du feu', 'feu', [[0.5, 'Lente'], [1, 'Normale'], [2, 'Vive']]);
    groupe('Pluie et orages', 'pluie', [[0, 'Jamais'], [0.5, 'Rares'], [1, 'Normaux'], [2, 'Fréquents']]);
    groupe('Encre', 'encre', [['genereuse', 'Généreuse'], ['normale', 'Normale'], ['rare', 'Précieuse']]);
    groupe('Taille du texte', 'texte', [['normal', 'Normale'], ['grand', 'Grande']]);
    { const R = game.compagnons || (game.compagnons = { actif: true, gribouille: 'classique', grum: 'classique' }); c.appendChild(el('h3', '', 'Gribouille et Grum')); const g = el('div', 'choices'); for (const [v, lab] of [[true, 'M\'accompagnent'], [false, 'Restent au labo']]) { const b = el('button', 'choice' + ((R.actif !== false) === v ? ' on' : ''), lab); b.addEventListener('click', () => { R.actif = v; game.save(); refreshOptions(); Son.sfx('click'); }); g.appendChild(b); } c.appendChild(g); }
    groupe('Musique', 'musique', [[0, 'Muette'], [0.5, 'Douce'], [1, 'Normale']]);
    groupe('Effets sonores', 'effets', [[0, 'Muets'], [0.5, 'Doux'], [1, 'Normaux']]);
    c.appendChild(el('p', 'muted', 'Encre généreuse : les sceaux coûtent un quart de moins et l\'encre revient moitié plus vite. Précieuse : l\'inverse.'));
  }
  // ---------- Courrier ----------
  function descCmd(m) {
    if (m.type === 'potion') return m.n + ' × ' + DATA.POTIONS[m.id].nom + ' <small>(tu en as ' + (game.inv.potions[m.id] || 0) + ')</small>';
    if (m.type === 'ingredient') return m.n + ' × ' + DATA.INGREDIENTS[m.id].nom + ' <small>(tu en as ' + (game.inv.ingredients[m.id] || 0) + ')</small>';
    if (m.type === 'exploit') return m.texte + (game.courrier.exploitOk ? ' <b class="ok">✓ accompli</b>' : ' <small>(à accomplir dehors)</small>');
    if (m.type === 'sceau') return 'Inventer ' + DATA.EPREUVES[m.epreuve].texte + ' <small>(n\'importe quel sceau consigné qui y parvient)</small>';
    return '';
  }
  function refreshCourrier(resultat) {
    const c = $('#courrier-content'); c.innerHTML = '';
    const l = game.lettreCourante();
    if (resultat && resultat.ok) {
      c.appendChild(el('p', 'lettre', '« ' + resultat.merci + ' »'));
      c.appendChild(el('h3', '', 'Le corbeau t\'a laissé'));
      c.appendChild(el('ul', '', resultat.recu.map((r) => '<li>' + r + '</li>').join('')));
      const suiv = game.lettreSuivante(); c.appendChild(el('p', 'muted', suiv ? 'Il reviendra avec une autre lettre quand tu auras passé un moment dehors.' : 'C\'était la dernière lettre. L\'atelier est à toi.'));
      return;
    }
    if (!l) { c.appendChild(el('p', 'muted', game.lettreSuivante() ? 'Pas de lettre pour l\'instant. Le corbeau passe quand tu es dehors depuis un moment.' : 'Toutes les lettres ont reçu réponse. Le maître est fier de toi.')); return; }
    c.appendChild(el('h3', '', l.titre));
    c.appendChild(el('p', 'lettre', '« ' + l.texte + ' »'));
    c.appendChild(el('div', 'commande', '<b>Commande :</b> ' + descCmd(l.cmd)));
    const recompenses = l.don.map((d) => d.type === 'encre_max' ? 'de l\'encre en plus, pour toujours' : d.type === 'ingredient' ? 'un ingrédient rare' : d.type === 'recette' ? 'une recette' : d.type === 'trophee' ? 'un souvenir pour le labo' : 'de l\'expérience');
    c.appendChild(el('p', 'muted', 'En échange : ' + [...new Set(recompenses)].join(', ') + '.'));
    const out = el('div', 'courrier-out'); c.appendChild(out);
    if (l.cmd.type === 'sceau') {
      c.appendChild(el('h3', '', 'Envoyer un sceau consigné'));
      const list = el('div', 'seal-list-c'); c.appendChild(list);
      if (!game.seals.length) list.appendChild(el('p', 'muted', 'Aucun sceau consigné : compose-en un à la table des sceaux.'));
      for (const q of game.seals) {
        const it = el('div', 'seal-item'); const cv = document.createElement('canvas'); cv.width = 40; cv.height = 40; Seal.drawMini(cv.getContext('2d'), q, 20, 20, 17, 0);
        it.appendChild(cv); it.appendChild(el('span', '', q.nom));
        it.addEventListener('click', () => { const r = game.livrer(q); if (r.ok) refreshCourrier(r); else { out.innerHTML = r.msg; out.className = 'courrier-out warn'; } });
        list.appendChild(it);
      }
    } else {
      const b = el('button', '', 'Remettre au corbeau'); b.disabled = !game.peutLivrer();
      b.addEventListener('click', () => { const r = game.livrer(); if (r.ok) refreshCourrier(r); else { out.innerHTML = r.msg; out.className = 'courrier-out warn'; } });
      c.appendChild(b);
    }
  }
  // ---------- Alambic, presse, terrarium ----------
  function slotPicker(entry, label) {
    const bar = el('div', 'slotpick'); bar.innerHTML = '<span>→ barre :</span>';
    for (let i = 0; i < 5; i++) { const b = el('button', 'btn-slot', String(i + 1)); b.addEventListener('click', () => { game.hotbar[i] = entry; game.save(); refreshHotbar(); toast(label + ' dans l\'emplacement ' + (i + 1) + '.'); Son.sfx('pickup'); }); bar.appendChild(b); }
    return bar;
  }
  function refreshAlambic() {
    const l = $('#alambic-list'); l.innerHTML = '';
    const cands = Object.entries(game.inv.potions).filter(([id, n]) => n >= 2 && DATA.POTIONS[id] && !DATA.POTIONS[id].bizarre);
    if (!cands.length) l.appendChild(el('p', 'muted', 'Il faut au moins deux fioles identiques d\'une même potion.'));
    for (const [id, n] of cands) { const P = DATA.POTIONS[id]; const it = el('div', 'potion-item'); it.innerHTML = '<i style="background:' + P.couleur + '"></i><div><b>' + P.nom + '</b> ×' + n + '</div>'; const b = el('button', '', 'Distiller (2 → 1)'); b.addEventListener('click', () => { game.distiller(id); refreshAlambic(); }); it.appendChild(b); l.appendChild(it); }
    const f = $('#alambic-fortes'); f.innerHTML = '';
    const fortes = Object.entries(game.inv.fortes).filter(([, n]) => n > 0);
    if (!fortes.length) f.appendChild(el('p', 'muted', 'Aucune fiole forte.'));
    for (const [id, n] of fortes) { const P = DATA.POTIONS[id]; const it = el('div', 'potion-item'); it.innerHTML = '<i style="background:' + P.couleur + '; box-shadow: 0 0 0 2px ' + P.couleur + '"></i><div><b>' + P.nom + ' forte</b> ×' + n + '<br><small>' + P.desc + '</small></div>'; it.appendChild(slotPicker({ type: 'potion', id, forte: true }, P.nom + ' forte')); f.appendChild(it); }
  }
  function refreshPresse() {
    const l = $('#presse-list'); l.innerHTML = '';
    l.appendChild(el('p', 'muted', 'Poussières de pierre : ' + (game.inv.ingredients.poussiere || 0)));
    if (!game.seals.length) l.appendChild(el('p', 'muted', 'Aucun sceau consigné.'));
    for (const q of game.seals) { const it = el('div', 'seal-item'); const cv = document.createElement('canvas'); cv.width = 40; cv.height = 40; Seal.drawMini(cv.getContext('2d'), q, 20, 20, 17, 0); it.appendChild(cv); it.appendChild(el('span', '', q.nom + ' <small>(' + Seal.cost(q) + ')</small>')); it.addEventListener('click', () => { if (game.presser(q)) refreshPresse(); }); l.appendChild(it); }
    const pz = $('#presse-parchemins'); pz.innerHTML = '';
    const ps = Object.entries(game.inv.parchemins).filter(([, q]) => q.n > 0);
    if (!ps.length) pz.appendChild(el('p', 'muted', 'Aucun parchemin.'));
    for (const [nom, q] of ps) { const it = el('div', 'potion-item'); const cv = document.createElement('canvas'); cv.width = 40; cv.height = 40; Seal.drawMini(cv.getContext('2d'), q.seal, 20, 20, 17, 0); it.appendChild(cv); it.appendChild(el('div', '', '<b>' + nom + '</b> ×' + q.n + '<br><small>sans encre</small>')); it.appendChild(slotPicker({ type: 'parchemin', nom }, 'Parchemin « ' + nom + ' »')); pz.appendChild(it); }
  }
  function refreshTerrarium() {
    const l = $('#terrarium-list'); l.innerHTML = '';
    if (!game.inv.terrarium.length) l.appendChild(el('p', 'muted', 'Le terrarium est vide. Apprivoise une petite créature (Vie, ou son élément préféré), porte-la (E) et rentre au labo avec elle.'));
    game.inv.terrarium.forEach((q, i) => { const sp = DATA.ESPECES[q.t]; const it = el('div', 'potion-item'); it.innerHTML = '<i style="background:' + (sp.couleur || '#1f1a16') + '"></i><div><b>' + sp.nom + '</b><br><small>' + sp.desc + ' Cadeau : ' + (sp.drop ? DATA.INGREDIENTS[sp.drop].nom : 'aucun') + '.</small></div>'; const b = el('button', '', 'Relâcher'); b.addEventListener('click', () => { game.terrariumRelache(i); refreshTerrarium(); }); it.appendChild(b); l.appendChild(it); });
  }
  // ---------- Bac d'essai ----------
  let bac = null, bacMat = 'eau';
  function openBac() {
    if (!bac) {
      bac = createSim(); bac.init(80, 40); bac.onEvent = null;
      const M = bac.M;
      for (let x = 0; x < 80; x++) for (let y = 30; y < 40; y++) bac.set(x, y, y < 33 ? M.TERRE : M.PIERRE);
      for (let x = 20; x < 36; x++) for (let y = 28; y < 33; y++) bac.set(x, y, y === 28 && (x < 22 || x > 33) ? M.TERRE : M.EAU);
      for (let x = 20; x < 36; x++) bac.set(x, 27, M.AIR);
      for (let y = 18; y < 30; y++) { bac.set(55, y, M.BOIS); bac.set(56, y, M.BOIS); }
      for (let y = 12; y < 20; y++) for (let x = 49; x < 63; x++) { const dx = (x - 55.5) / 7, dy = (y - 15.5) / 4; if (dx * dx + dy * dy <= 1) bac.set(x, y, M.PLANTE); }
      for (let x = 66; x < 76; x++) for (let y = 30 - Math.min(5, Math.abs(71 - x) < 3 ? 5 : 3); y < 30; y++) bac.set(x, y, M.SABLE);
      for (let x = 6; x < 10; x++) for (let y = 28; y < 30; y++) bac.set(x, y, M.CRISTAL);
      for (let x = 0; x < 80; x++) if (bac.get(x, 29) === M.TERRE && bac.get(x, 28) === M.AIR && U.hash2(x, 1) < 0.5) bac.set(x, 28, M.HERBE);
      const c = $('#bac-canvas');
      c.addEventListener('mousedown', (e) => {
        const r = c.getBoundingClientRect(); const x = (e.clientX - r.left) * (c.width / r.width), y = (e.clientY - r.top) * (c.height / r.height);
        if (e.button === 2 || e.shiftKey) { let n = 0; bac.forRadius(x, y, 14, (cx, cy, i, m) => { if (m === bac.M.AIR && n < 40) { bac.set(cx, cy, bac.M[bacMat.toUpperCase()]); n++; } }); return; }
        const s = game.editSeal; if (!s.core) { toast('Compose d\'abord un sceau avec un glyphe d\'effet.', 'warn'); return; }
        const prm = Seal.params(s); let cores = Seal.effets(s); if (prm.inverse) cores = cores.map((q) => DATA.INVERSE[q] || q);
        for (const core of cores) World.gridEffectOn(bac, core, x, y, 36 * (prm.size || 1), prm, true, 1);
        Son.sfx('burst', cores[0]);
      });
      c.addEventListener('contextmenu', (e) => e.preventDefault());
      const acts = $('#bac-actions');
      for (const m of ['eau', 'huile', 'acide', 'lave', 'sable', 'neige']) { const b = el('button', 'btn-step', m); b.addEventListener('click', () => { bacMat = m; $$('#bac-actions .btn-step').forEach((q) => q.classList.toggle('on', q.textContent === m)); }); if (m === 'eau') b.classList.add('on'); acts.appendChild(b); }
      const reset = el('button', '', 'Vider le bac'); reset.addEventListener('click', () => { bac = null; openBac(); }); acts.appendChild(reset);
    }
    $('#bac-info').textContent = 'Clic gauche : lancer « ' + Seal.nom(game.editSeal) + ' ». Clic droit (ou Maj + clic) : verser la matière choisie.';
    drawBac();
  }
  function drawBac() {
    if (!bac || open !== 'bac') return;
    bac.step(); const c = $('#bac-canvas'), ctx = c.getContext('2d');
    ctx.fillStyle = '#f6eed8'; ctx.fillRect(0, 0, c.width, c.height);
    bac.draw(ctx, { x: 0, y: 0 }, c.width, c.height);
  }
  // ---------- HUD / barre ----------
  function refreshHotbar() {
    $$('#hotbar .slot').forEach((s, i) => {
      const e = game.hotbar[i];
      s.classList.toggle('on', game.selected === i);
      s.classList.toggle('onL', !!game.progress.deuxMains && game.selectedL === i);
      const cv = s.querySelector('canvas'), ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, 56, 56);
      const cnt = s.querySelector('.count');
      cnt.textContent = '';
      s.classList.remove('empty-potion');
      if (!e) return;
      if (e.type === 'seal') { Seal.drawMini(ctx, e.seal, 28, 28, 22, time); s.title = Seal.nom(e.seal) + ' (' + Seal.cost(e.seal) + ' encre)'; }
      else if (e.type === 'potion') { const P = DATA.POTIONS[e.id]; const n = (e.forte ? game.inv.fortes : game.inv.potions)[e.id] || 0; drawFlaskIcon(ctx, 28, 30, P.couleur); if (e.forte) { ctx.save(); ctx.strokeStyle = P.couleur; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(28, 28, 24, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); } cnt.textContent = '×' + n; s.title = P.nom + (e.forte ? ' (forte)' : ''); if (n <= 0) s.classList.add('empty-potion'); }
      else if (e.type === 'parchemin') { const q = game.inv.parchemins[e.nom]; const n = q ? q.n : 0; if (q) Seal.drawMini(ctx, q.seal, 28, 28, 20, time); ctx.save(); ctx.strokeStyle = U.INK; ctx.lineWidth = 1; ctx.strokeRect(6, 6, 44, 44); ctx.restore(); cnt.textContent = '×' + n; s.title = 'Parchemin « ' + e.nom + ' » (sans encre)'; if (n <= 0) s.classList.add('empty-potion'); }
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
    const names = { forme: 'Métamorphose', wet: 'Trempé(e)', stone: 'Peau de pierre', invisible: 'Invisible', lowgrav: 'Léger(ère)', jump: 'Bonds', small: 'Minuscule', vision: 'Vision', burning: 'En feu !', glide: 'Planeur', lumiere: 'Lumineux(se)', patins: 'Patins de givre', vitesse: 'Foudroyé(e)', dissous: 'Mains d\'acide', vol: 'En vol', branchies: 'Branchies', geant: 'Géant(e)', glisse: 'Savonné(e)', hate: 'Hâte', lent: 'Englué(e)', armure: 'Armure', hoquet: 'Hoquet', glouglou: 'Glouglou', boussole: 'Boussole folle', fantome: 'Sable fin', miroir: 'Miroir', regen: 'Régénération' };
    // les statuts de mécanique (amorti d'un élan, suspension d'un instant...) ne s'affichent pas
    const CACHES = ['amorti', 'suspendu'];
    for (const k in p.sta) if (p.sta[k] > 0 && !CACHES.includes(k)) sts.push('<span class="st ' + k + '">' + (names[k] || k) + ' ' + Math.ceil(p.sta[k]) + 's</span>');
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
    if (open === 'seal') { drawSealCanvas(); drawPreview(); }
    if (open === 'cauldron' && Math.floor(time * 30) % 2 === 0) drawCaulCanvas(caulSens);
    if (open === 'bac') drawBac();
    if (open === 'create') refreshCreate();
    if (Math.floor(time * 30) % 2 === 0) refreshHotbarIcons();
  }
  function refreshHotbarIcons() {
    $$('#hotbar .slot').forEach((s, i) => { const e = game.hotbar[i]; if (e && e.type === 'seal') { const ctx = s.querySelector('canvas').getContext('2d'); ctx.clearRect(0, 0, 56, 56); Seal.drawMini(ctx, e.seal, 28, 28, 22, time); } });
  }

  function setGrimTab(t) { grimTab = t; refreshGrimoire(); const pn = $('#panel-grimoire'); if (pn) pn.scrollTop = 0; }
  const _table = { cases: toutesLesCases, croissance: casesCroissance, annuler, refaire, deplacer, retirer, poserEn, casesPour, ouvrirSous, remonter, naviguer, get sel() { return selSlot; }, set sel(v) { selSlot = v; }, get pile() { return pile.length; }, get passe() { return passe.length; }, get avenir() { return avenir.length; } };
  return { _table, grimTab: setGrimTab, init, openPanel, close, isOpen, refreshSeal, refreshCauldron, refreshGrimoire, refreshHotbar, refreshHud, toast, zoneTitle, tick, setMode };
})();
