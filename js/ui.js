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
    if (name === 'create') { if (!$('#create-peau').children.length) construireCreation(); look = { ...Perso.norm(game.look) }; delete look._cape; $('#create-nom').value = look.nom || ''; majChoixCreation(); }
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
    ctx.save(); ctx.fillStyle = 'rgba(31,26,22,0.12)'; ctx.beginPath(); ctx.ellipse(c.width / 2, c.height - 22, 50, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    const t = time, cast = (t % 6) > 4.6 ? -0.7 : null;
    World.drawApprenti(ctx, c.width / 2, c.height - 22, 230, look, 1, 0, null, false, { t, cast, glow: '#d8a63a' });
  }

  // ---------- Éditeur de sceaux ----------
  const SEAL_R = 140;
  function sealR() { return SEAL_R * (game.editSeal.taille === 'petit' ? 0.82 : 1); }
  function slotDispo(id) {
    const s = game.editSeal, p = game.progress, t = s.taille || 'moyen';
    if (id === 'core2') return p.fusion && t !== 'petit';
    if (id === 'filtre') return t !== 'petit' && p.filtres.length > 0;
    if (id === 'cible') return t !== 'petit' && p.cibles.length > 1;
    if (id === 'trigger2') return t === 'grand';
    if (id.startsWith('mod')) return +id.slice(3) < Seal.nbSlots(s, p.slots);
    return true;
  }
  function onSealCanvasClick(e, canvas, right = false) {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * (canvas.width / r.width), y = (e.clientY - r.top) * (canvas.height / r.height);
    const s = game.editSeal;
    const hitSl = Seal.slotList(canvas.width / 2, canvas.height / 2 + 10, sealR(), s.taille || 'moyen').find((sl) => U.dist(x, y, sl.x, sl.y) <= sl.r * 1.3);
    const id = hitSl ? hitSl.id : null;
    if (!id) { selSlot = null; refreshSeal(); return; }
    if (!slotDispo(id)) { toast(id.startsWith('mod') ? 'Cet emplacement est encore scellé. Voir le grimoire.' : id === 'filtre' ? 'Pointe droite : les filtres de matière ne sont pas encore connus.' : id === 'cible' ? 'Pointe gauche : les cibles ne sont pas encore connues.' : 'Emplacement indisponible.', 'warn'); return; }
    if (right || selSlot === id) {
      if (id.startsWith('mod')) s.mods[+id.slice(3)] = null; else s[id] = null;
      selSlot = null; Son.sfx('click');
    } else selSlot = id;
    refreshSeal();
  }
  function changerTaille(t) {
    const s = game.editSeal; s.taille = t;
    const nb = Seal.nbSlots(s, game.progress.slots);
    for (let i = nb; i < s.mods.length; i++) s.mods[i] = null;
    if (t === 'petit') { s.core2 = null; s.filtre = null; s.cible = null; }
    if (t !== 'grand') s.trigger2 = null;
    selSlot = null; Son.sfx('click'); refreshSeal();
  }
  function placeInSeal(kind, id) {
    const s = game.editSeal;
    if (kind === 'core') {
      if ((selSlot === 'core2' || (game.progress.fusion && s.core && s.core !== id && !s.core2 && selSlot !== 'core')) && slotDispo('core2')) { s.core2 = id; selSlot = null; }
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
      if (id === 'sous') { subSlot = i; showSubList(); return; }
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
      const ids = Object.keys(dict).filter((id) => !dict[id].interne);
      if (kind === 'mod') ids.sort((a, b) => (dict[a].aspect ? 1 : 0) - (dict[b].aspect ? 1 : 0));
      for (const id of ids) {
        const d = dict[id]; const unlocked = list.includes(id);
        const b = el('button', 'glyph-btn' + (unlocked ? '' : ' locked'));
        const cv = document.createElement('canvas'); cv.width = 44; cv.height = 44;
        const cx = cv.getContext('2d');
        if (unlocked) Seal.glyph(cx, kind === 'filtre' ? 'f_' + id : kind === 'cible' ? 'c_' + id : id, 22, 22, 15, kind === 'core' || kind === 'filtre' ? d.couleur : kind === 'mod' && d.aspect ? DATA.CORES[d.aspect].couleur : U.INK, 1);
        else U.txt(cx, '?', 22, 22, 22, 'center', 'rgba(60,45,30,0.4)');
        b.appendChild(cv);
        b.appendChild(el('span', '', unlocked ? d.nom : '???'));
        b.appendChild(el('small', '', unlocked ? d.cout + ' encre' : ''));
        if (unlocked) {
          b.addEventListener('click', () => placeInSeal(kind, id));
          b.addEventListener('mouseenter', () => { $('#pal-desc').innerHTML = '<b>' + d.nom + '</b> — ' + (kind === 'filtre' ? 'Avec Au contact (ou un piège de zone), le sort ne réagit qu\'à : ' + d.nom.toLowerCase() + '. Il traverse tout le reste, murs compris.' : d.desc); });
        } else {
          const u = DATA.UNLOCKS.find((q) => (q.type === kind || (kind === 'filtre' && q.type === 'filtres') || (kind === 'cible' && (q.type === 'cible' || q.type === 'marque')) || (kind === 'core' && (q.type === 'core' || q.type === 'marque')) || (kind === 'mod' && q.type === 'mods') || kind === 'shape' || kind === 'trigger') && (q.item === id || (Array.isArray(q.item) && q.item.includes(id))));
          b.addEventListener('mouseenter', () => { $('#pal-desc').innerHTML = '<b>Inconnu.</b> ' + (u ? 'Indice : ' + u.indice : ''); });
        }
        c.appendChild(b);
      }
    };
    pal('#pal-cores', DATA.CORES, p.cores, 'core');
    pal('#pal-shapes', DATA.SHAPES, p.shapes, 'shape');
    pal('#pal-mods', DATA.MODS, p.mods, 'mod');
    pal('#pal-triggers', DATA.TRIGGERS, p.triggers, 'trigger');
    pal('#pal-filtres', DATA.FILTRES, p.filtres, 'filtre');
    pal('#pal-cibles', DATA.CIBLES, p.cibles, 'cible');
    // tailles
    const tz = $('#seal-tailles'); tz.innerHTML = '<span class="label">Taille</span>';
    for (const t in DATA.TAILLES) { const T = DATA.TAILLES[t]; const ok = p.tailles.includes(t); const b = el('button', 'choice' + ((s.taille || 'moyen') === t ? ' on' : '') + (ok ? '' : ' locked'), T.nom); b.title = ok ? T.desc : 'Pas encore débloqué. ' + ((DATA.UNLOCKS.find((u) => u.item === t) || {}).indice || ''); if (ok) b.addEventListener('click', () => changerTaille(t)); else b.disabled = true; tz.appendChild(b); }
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
    if (trs.includes('repetition')) reglage('Période', 'periode', [1, 2, 5]);
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
    if (prm.inverse) cores = cores.map((c) => (c === 'gravite' ? c : DATA.INVERSE[c] || c));
    const combo = cores.length > 1 && !prm.inverse ? DATA.COMBOS[cores.slice().sort().join('|')] : null;
    const L = [];
    L.push('<b>' + T.nom + ' sceau</b> · ' + Seal.cost(s) + ' encre · tracé en ' + T.geste + ' s · maintenir le clic charge jusqu\'à +80 %.');
    let eff = 'Effet : ' + cores.map(nomG).join(' et ') + (combo ? ' (fusion : ' + combo.nom.toLowerCase() + ')' : '') + (prm.inverse ? (cores.includes('gravite') ? ', apesanteur' : ', inversé') : '') + '.';
    L.push(eff);
    if (s.shape) L.push('Forme : ' + DATA.SHAPES[s.shape].nom.toLowerCase() + (prm.extra ? ', en double' : '') + (prm.orbite ? ', en orbite autour de toi' : '') + (prm.teleguide ? ', guidé par la souris' : '') + (prm.canalise ? ', canalisé tant que tu maintiens' : '') + '.');
    if (s.cible && s.taille !== 'petit') L.push('Cible : ' + (s.cible === 'creature' ? 'la créature hostile la plus proche, qu\'il suit' : 'ta marque la plus récente, même hors de vue') + '.');
    const tx = [];
    const prim = trs.find((t) => ['immediat', 'contact', 'retarde', 'commande'].includes(t));
    if (!trs.length || prim === 'immediat') tx.push('agit tout de suite');
    if (prim === 'contact') tx.push('éclate au premier contact');
    if (prim === 'retarde') tx.push('se fixe puis éclate après ' + s.delai + ' s');
    if (prim === 'commande') tx.push('attend que tu appuies sur F');
    if (!prim && trs.includes('repetition')) tx.push(s.shape === 'projectile' || s.shape === 'chaine' ? 'éclate au contact' : 'agit tout de suite');
    if (s.filtre && s.taille !== 'petit') tx.push('uniquement au contact de : ' + DATA.FILTRES[s.filtre].nom.toLowerCase() + ' (traverse le reste)');
    if (trs.includes('repetition')) tx.push('puis recommence toutes les ' + s.periode + ' s');
    if (trs.includes('expiration')) tx.push('et éclate une dernière fois quand il s\'éteint');
    L.push('Déclenchement : ' + tx.join(', ') + '.');
    const mv = [];
    if (prm.traj) mv.push({ boomerang: 'revient comme un boomerang', spirale: 'vole en spirale', rasesol: 'court au ras du sol' }[prm.traj]); if (prm.power > 1) mv.push('puissance ×' + prm.power.toFixed(1)); if (prm.range > 1) mv.push('portée ×' + prm.range.toFixed(1)); if (prm.size > 1) mv.push('taille ×' + prm.size.toFixed(1)); if (prm.duration > 1) mv.push('durée ×' + prm.duration.toFixed(1)); if (prm.speed > 1) mv.push('vitesse ×' + prm.speed.toFixed(1)); if (prm.bounces) mv.push(prm.bounces + ' rebonds'); if (prm.persist) mv.push('laisse une trace'); if (prm.echo) mv.push('écho ×' + prm.echo);
    if (mv.length) L.push('Réglages : ' + mv.join(', ') + '.');
    for (const e in prm.asp) { if (![s.core, s.core2].includes(e)) continue; const Ls = prm.asp[e]; L.push((Ls.length > 1 ? 'Aspects : ' : 'Aspect : ') + Ls.map((A) => DATA.MODS[A.id].nom + (A.n > 1 ? ' ×2' : '')).join(' et ') + ' — ' + DATA.CORES[e].nom.toLowerCase() + ' devient ' + Ls.map((A) => nomG(A.devient)).join(' et ') + '.'); }
    for (const m of s.mods) { if (typeof m !== 'string') continue; const M2 = DATA.MODS[m]; if (M2 && M2.aspect && ![s.core, s.core2].includes(M2.aspect)) L.push('<span class="muted">' + M2.nom + ' reste muet : il lui faut l\'essence ' + DATA.CORES[M2.aspect].nom + '.</span>'); }
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
    const prim = trs.find((t) => ['immediat', 'contact', 'retarde', 'commande'].includes(t)) || 'immediat';
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
      case 'invocation': { const a = time * 3; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(px + Math.cos(a) * 22, py - 30 + Math.sin(a) * 10, 5, 0, U.TAU); ctx.fill(); ctx.stroke(); break; }
      case 'bouclier': ctx.strokeStyle = col; ctx.lineWidth = 6; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.arc(px, py - 16, 26, -1, 1); ctx.stroke(); ctx.globalAlpha = 1; break;
    }
    // phase 2 : l'impact selon le déclencheur
    const instant = ['zone', 'trait'].includes(s.shape) ? 0.05 : arr;
    const tImpact = s.shape === 'soi' || s.shape === 'aura' ? 0.05 : instant;
    let tBurst = tImpact;
    if (prim === 'retarde') { tBurst = tImpact + 0.3; if (t > tImpact && t < tBurst) { ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ix, iy, 9, -Math.PI / 2, -Math.PI / 2 + U.TAU * (t - tImpact) / 0.3); ctx.stroke(); U.txt(ctx, s.delai + 's', ix + 14, iy - 12, 10, 'left', '#6b4f2a'); } }
    if (prim === 'commande') { tBurst = tImpact + 0.35; if (t > tImpact && t < tBurst) { ctx.strokeStyle = col; ctx.globalAlpha = 0.5 + Math.sin(time * 10) * 0.4; U.inkCircle(ctx, ix, iy, 9, 3, 0.6); ctx.globalAlpha = 1; ctx.fillStyle = '#f6eed8'; ctx.fillRect(ix + 8, iy - 24, 14, 14); ctx.strokeStyle = U.INK; ctx.strokeRect(ix + 8, iy - 24, 14, 14); U.txt(ctx, 'F', ix + 15, iy - 17, 11, 'center', U.INK); } }
    if (!['chaine', 'mur', 'totem', 'pluie', 'invocation', 'bouclier', 'objet'].includes(s.shape)) burst(ix, iy, 30 * Math.min(1.8, prm.size), (t - tBurst) / 0.22);
    if (trs.includes('repetition')) for (let k = 1; k <= 3; k++) burst(ix, iy, 22, (t - tBurst - k * 0.13) / 0.12);
    if (trs.includes('expiration')) { const te = 0.84; if (t < te && t > tBurst) Seal.glyph(ctx, 'expiration', ix, iy - 22, 5, col, 2); burst(ix, iy, 40, (t - te) / 0.15); }
    // sous-sceau
    const sb = Seal.subs(s)[0];
    if (sb && sb.core) { const k = (t - tBurst - 0.1) / 0.3; if (k > 0 && k < 1) { const c2 = DATA.CORES[sb.core].couleur; ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(ix + k * 40, iy - Math.sin(k * Math.PI) * 30, 4, 0, U.TAU); ctx.fill(); } burst(ix + 40, iy, 18, (t - tBurst - 0.4) / 0.2, DATA.CORES[sb.core].couleur); }
  }
  function drawSealCanvas() {
    const c = $('#seal-canvas'); if (!c || open !== 'seal') return;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    Seal.draw(ctx, game.editSeal, c.width / 2, c.height / 2 + 10, SEAL_R, { t: time, slots: game.progress.slots, highlight: selSlot, empty: true, fusion: game.progress.fusion, filtres: game.progress.filtres.length > 0, cibles: game.progress.cibles.length > 1 });
    const combo = Seal.comboName(game.editSeal);
    const hint = combo ? 'Fusion : ' + combo + '. ' + (DATA.COMBOS[[game.editSeal.core, game.editSeal.core2].sort().join('|')].desc || '') : selSlot === 'core2' ? 'Choisis un second glyphe d\'effet : les deux fusionnent.' : selSlot === 'filtre' ? 'Choisis un filtre de matière.' : selSlot === 'cible' ? 'Choisis une cible.' : selSlot === 'trigger2' ? 'Choisis un second déclencheur.' : selSlot ? 'Choisis un glyphe dans la palette, ou clique à nouveau pour vider.' : game.progress.fusion ? 'Centre, formes, modificateurs, pointes. En bas : un second effet à fusionner.' : 'Clique un emplacement, puis un glyphe. Clic droit : vider.';
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
      grp('Modificateurs (second anneau) — ' + p.slots + ' emplacement(s)', DATA.MODS, p.mods, 'mod');
      grp('Déclencheurs (pointe haute ; deux pour le grand sceau)', DATA.TRIGGERS, p.triggers, 'trigger');
      c.appendChild(el('h3', '', 'Filtres de matière (pointe droite)'));
      c.appendChild(el('p', '', p.filtres.length ? p.filtres.map((f) => DATA.FILTRES[f].nom).join(', ') + '. Avec Au contact, le sort ne réagit qu\'à cette matière et traverse tout le reste.' : '<span class="muted">Pas encore connus.</span>'));
      c.appendChild(el('h3', '', 'Cibles (pointe gauche)'));
      c.appendChild(el('p', '', p.cibles.map((q) => DATA.CIBLES[q].nom + ' : ' + DATA.CIBLES[q].desc).join('<br>')));
      c.appendChild(el('h3', '', 'Tailles de sceau'));
      c.appendChild(el('p', '', Object.values(DATA.TAILLES).map((T) => (p.tailles.includes(T.id) ? '<b>' + T.nom + '</b>' : '<span class="muted">' + T.nom + ' (scellé)</span>') + ' : ' + T.desc).join('<br>')));
      c.appendChild(el('p', 'intro', 'Lancer : maintenir le clic charge le sort (plus fort, plus loin, plus cher). ' + (p.deuxMains ? 'Clic droit : main gauche (Maj + 1-5 pour la choisir).' : 'La main gauche viendra avec l\'expérience.') + ' F libère les sorts Sur commande. Deux projectiles qui se croisent fusionnent.'));
      if (p.fusion) {
        c.appendChild(el('h3', '', 'Fusions connues'));
        const known = Object.keys(DATA.COMBOS).filter((k) => k.split('|').every((q) => p.cores.includes(q)));
        if (!known.length) c.appendChild(el('p', 'muted', 'Aucune : il faut posséder les deux glyphes.'));
        for (const k of known) { const [a, b] = k.split('|'); const Cm = DATA.COMBOS[k]; c.appendChild(el('div', 'recette', '<b>' + Cm.nom + '</b> : ' + DATA.CORES[a].nom + ' + ' + DATA.CORES[b].nom + (Cm.desc ? ' — ' + Cm.desc : ''))); }
        c.appendChild(el('p', 'intro', 'Toute autre paire fusionne aussi : les deux effets s\'appliquent ensemble.'));
      }
      c.appendChild(el('p', 'intro', 'Déclencheurs : <b>Immédiat</b> agit en continu sur ce que le sort touche (un projectile traverse les créatures). <b>Au contact</b> éclate en zone à la première chose touchée. <b>Retardé</b> se fixe et éclate après deux secondes.'));
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
    const names = { forme: 'Métamorphose', wet: 'Trempé(e)', stone: 'Peau de pierre', invisible: 'Invisible', lowgrav: 'Léger(ère)', jump: 'Bonds', small: 'Minuscule', vision: 'Vision', burning: 'En feu !', glide: 'Planeur', lumiere: 'Lumineux(se)', patins: 'Patins de givre', vitesse: 'Foudroyé(e)', dissous: 'Mains d\'acide', vol: 'En vol', branchies: 'Branchies', geant: 'Géant(e)', glisse: 'Savonné(e)', hate: 'Hâte', lent: 'Englué(e)', armure: 'Armure', hoquet: 'Hoquet', glouglou: 'Glouglou', boussole: 'Boussole folle' };
    for (const k in p.sta) if (p.sta[k] > 0) sts.push('<span class="st ' + k + '">' + (names[k] || k) + ' ' + Math.ceil(p.sta[k]) + 's</span>');
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

  function setGrimTab(t) { grimTab = t; refreshGrimoire(); }
  return { grimTab: setGrimTab, init, openPanel, close, isOpen, refreshSeal, refreshCauldron, refreshGrimoire, refreshHotbar, refreshHud, toast, zoneTitle, tick, setMode };
})();
