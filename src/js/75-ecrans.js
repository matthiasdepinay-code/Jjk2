/* =========================================================================
   RITUEL — écrans
   ========================================================================= */
(function (root) {
  'use strict';
  const JJK = (root.JJK = root.JJK || {});
  const { el, $, clamp, wait, titre, chaos } = JJK.core;
  const U = JJK.ui;

  const G = {
    graine: '', tech: null, ref: null, corps: null, mods: null,
    serments: [], reponses: [], maturation: 0, descente: 0, grade: null,
    catalogue: [], sermentsRestants: 3,
  };
  JJK.jeu = G;

  function M() { return JJK.memoire; }
  function C() { return JJK.CORPUS || {}; }

  /* =====================================================================
     1. LE SEUIL
     ===================================================================== */
  async function seuil() {
    const n = U.montrer('ecran-seuil');
    n.innerHTML = '';
    JJK.fx.setIntensity(0.12);
    JJK.fx.setHue('#b31217', '#f2c14e');
    U.majBarre({ graine: '', grade: '', registre: '' });

    const reg = M().lire();
    const retour = M().estUnRetour();

    const tete = el('div');
    tete.appendChild(el('span', 'etiquette rouge', 'Registre des lois innées'));
    tete.appendChild(el('h1', 'titre-rituel', 'RITUEL'));
    const jp = el('div', 'jp faible', '呪法帳 · じゅほうちょう');
    tete.appendChild(jp);
    n.appendChild(tete);
    n.appendChild(el('hr', 'trait'));

    const flux = el('div');
    n.appendChild(flux);

    const ouverture = (C().rituel || {}).ouverture || [
      "On ne t'a pas fait venir.",
      "Tu es entré parce que la porte n'était pas fermée à clé, et c'est déjà un renseignement sur toi.",
      "Ici, on ne distribue pas de pouvoirs. On constate ce qui est déjà là.",
      "Une technique innée ne s'apprend pas, ne se choisit pas, ne se refuse pas.",
      "Elle attend, dans le nom, comme une dent sous la gencive.",
      "Donne un nom. Pas forcément le tien.",
    ];

    if (retour) {
      const mort = reg.epitaphes[0];
      await U.dire(flux, U.voix('retour', "Tu es déjà venu."), { forte: true, apres: 500 });
      if (mort) {
        await U.dire(flux, 'Le registre a gardé ' + (mort.nom || 'quelqu\'un') + ', porteur de « ' + (mort.technique || 'rien') + ' », tombé au tour ' + (mort.tour || '?') + ' devant ' + (mort.tueur || 'quelque chose') + '.', { apres: 400 });
        await U.dire(flux, U.voix('retour', "Rien ne t'oblige à recommencer. Rien ne t'en empêche non plus."), { apres: 300 });
      }
    } else {
      for (let i = 0; i < ouverture.length; i++) {
        await U.dire(flux, ouverture[i], { forte: i === ouverture.length - 1, apres: i === 0 ? 500 : 260 });
      }
    }

    /* saisie */
    const boite = el('div');
    boite.style.marginTop = '34px';
    boite.appendChild(el('span', 'etiquette', 'Nom porté par le réceptacle'));
    const champ = el('input', 'champ');
    champ.type = 'text'; champ.maxLength = 40;
    champ.placeholder = 'écris-le';
    champ.autocomplete = 'off'; champ.spellcheck = false;
    boite.appendChild(champ);
    const avert = el('p', 'discret');
    avert.style.marginTop = '14px';
    avert.textContent = "Le même nom donnera toujours exactement la même technique. Sur cette machine, sur une autre, dans dix ans. Ce n'est pas un tirage : c'est une lecture.";
    boite.appendChild(avert);
    n.appendChild(boite);

    const r = U.rangee();
    const go = U.bouton('Ouvrir le registre', 'rouge', () => valider());
    go.disabled = true;
    r.appendChild(go);
    if (reg.epitaphes.length) r.appendChild(U.bouton('Consulter les morts', 'fantome', registre));
    n.appendChild(r);

    const alerte = el('p', 'discret sang');
    alerte.style.cssText = 'margin-top:10px;min-height:1.4em;font-style:italic';
    boite.appendChild(alerte);

    champ.addEventListener('input', () => {
      go.disabled = champ.value.trim().length < 1;
      if (champ.value.length && Math.random() < 0.25 && JJK.audio) JJK.audio.tick(chaos.r(600, 1800), 0.014, 0.02);
      /* Le registre relit par-dessus ton épaule pendant que tu tapes. */
      const g2 = JJK.core.normalizeSeed(champ.value);
      const dejaMort = reg.epitaphes.filter(e => e.graine === g2);
      if (g2 && dejaMort.length) {
        alerte.textContent = 'Ce nom est déjà tombé ici' + (dejaMort.length > 1 ? ' ' + dejaMort.length + ' fois' : '') +
          ' — porteur de « ' + dejaMort[0].technique + ' », au tour ' + dejaMort[0].tour + '.';
        JJK.fx.shake(0.08);
      } else alerte.textContent = '';
    });
    champ.addEventListener('keydown', e => { if (e.key === 'Enter' && !go.disabled) valider(); });
    setTimeout(() => champ.focus(), 300);

    async function valider() {
      const v = champ.value.trim();
      if (!v) return;
      JJK.audio.unlock();
      G.graine = v;
      G.tech = JJK.forge.forgeTechnique(v);
      go.disabled = true; champ.disabled = true;

      /* ---- l'image subliminale -------------------------------------
         Le nom de la technique passe à l'écran pendant 130 ms, une
         seule fois, sans annonce. Presque personne ne le lit. Presque.  */
      const sub = el('div');
      sub.style.cssText = 'position:fixed;inset:0;z-index:95;display:flex;align-items:center;justify-content:center;' +
        'font-family:var(--serif);font-weight:300;font-size:clamp(2rem,8vw,6rem);color:#e9e2d4;background:#07070a;' +
        'text-align:center;padding:20px;letter-spacing:-.02em';
      sub.textContent = G.tech.nom;
      document.body.appendChild(sub);
      JJK.audio.tick(90, 0.05, 0.10);
      await wait(130);
      sub.remove();
      G.subliminalMontre = true;

      JJK.fx.pulse(null, null, null, '#b31217', 1.4);
      JJK.fx.shake(0.25);
      await wait(450);
      M().ecrire({ graine: JJK.core.normalizeSeed(v) });
      U.majBarre({ graine: JJK.core.normalizeSeed(v) });
      rituel();
    }
  }

  /* =====================================================================
     2. LE RITUEL
     ===================================================================== */
  const QUESTIONS_SECOURS = [
    { question: "Quand on t'a fait du tort, qu'as-tu gardé ?", reponses: [
      { texte: "La date exacte.", archetype: 'mesure', note: 'Tu tiens des comptes.' },
      { texte: "Rien. J'ai rendu le soir même.", archetype: 'échange', note: 'Tu ne portes pas de dettes.' },
      { texte: "Le silence de la pièce juste après.", archetype: 'témoignage', note: 'Tu enregistres.' }] },
    { question: "Qu'est-ce qui, chez toi, ne guérit pas ?", reponses: [
      { texte: "Une phrase que j'ai dite.", archetype: 'répétition', note: 'Elle se rejoue.' },
      { texte: "Un nom que je ne prononce plus.", archetype: 'soustraction', note: 'Tu retranches.' },
      { texte: "Une porte que j'ai passée.", archetype: 'seuil', note: 'Tu franchis.' }] },
    { question: "On te propose de tout recommencer, sans personne. Tu réponds ?", reponses: [
      { texte: "Sans personne, non.", archetype: 'lien', note: 'Tu attaches.' },
      { texte: "Immédiatement.", archetype: 'métamorphose', note: 'Tu mues.' },
      { texte: "Je demande d'abord le prix.", archetype: 'échange', note: 'Tu négocies.' }] },
  ];

  async function rituel() {
    const n = U.montrer('ecran-rituel');
    n.innerHTML = '';
    JJK.fx.setIntensity(0.28);
    U.murmures(true);

    const src = ((C().rituel || {}).questions || []).slice();
    const qs = (src.length >= 3 ? src : QUESTIONS_SECOURS).slice();
    /* mélange léger : on n'interroge pas deux fois dans le même ordre */
    for (let i = qs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = qs[i]; qs[i] = qs[j]; qs[j] = t; }
    const choisies = qs.slice(0, Math.min(6, qs.length));
    G.reponses = [];

    const tete = el('div');
    tete.appendChild(el('span', 'etiquette rouge', 'Examen du réceptacle'));
    n.appendChild(tete);
    const zone = el('div', 'question-bloc');
    n.appendChild(zone);
    const jauge = el('div', 'jauge-rituel');
    choisies.forEach(() => jauge.appendChild(el('i')));
    n.appendChild(jauge);

    const transitions = (C().rituel || {}).transitions || ['Noté.', 'Le registre te suit.', 'Continue.'];

    for (let i = 0; i < choisies.length; i++) {
      const q = choisies[i];
      zone.innerHTML = '';
      const h = el('h2', 'question-texte');
      zone.appendChild(h);
      await JJK.fx.type(h, q.question, { speed: 20 });
      const liste = el('div', 'reponses');
      zone.appendChild(liste);
      const choix = await new Promise(res => {
        (q.reponses || []).forEach(rep => {
          const b = el('button', 'reponse');
          b.appendChild(document.createTextNode(rep.texte));
          if (rep.note) b.appendChild(el('span', 'murmure', rep.note));
          b.addEventListener('click', () => {
            JJK.audio.tick(700, 0.03, 0.06);
            JJK.fx.pulse(chaos.r(0, JJK.fx.size.W), chaos.r(0, JJK.fx.size.H), 160, '#b31217', 0.6);
            res(rep);
          });
          liste.appendChild(b);
        });
      });
      G.reponses.push(choix.archetype || 'seuil');
      jauge.children[i].classList.add('pleine');
      JJK.fx.setIntensity(0.28 + (i / choisies.length) * 0.35);
      if (i < choisies.length - 1) {
        zone.innerHTML = '';
        const t = el('p', 'rituel-ligne forte');
        zone.appendChild(t);
        await JJK.fx.type(t, transitions[i % transitions.length], { speed: 22 });
        await wait(420);
      }
    }

    G.ref = JJK.forge.forgeReceptacle(G.graine, G.reponses);
    G.corps = appliquerMaturation(G.ref, G.maturation);
    revelation();
  }

  function appliquerMaturation(ref, m) {
    const c = JSON.parse(JSON.stringify(ref));
    c.attaque = Math.round(c.attaque * (1 + 0.09 * m));
    c.pvMax = Math.round(c.pvMax * (1 + 0.07 * m));
    c.enMax = c.enMax + Math.floor(m / 3);
    c.puissance = Math.round(c.puissance * (1 + 0.08 * m));
    c.crit = Math.min(0.45, c.crit + 0.008 * m);
    return c;
  }

  /* =====================================================================
     3. LA RÉVÉLATION
     ===================================================================== */
  async function revelation() {
    const n = U.montrer('ecran-revelation');
    n.innerHTML = '';
    const t = G.tech;
    JJK.fx.setHue(t.couleur, '#f2c14e');
    JJK.fx.setIntensity(0.45);

    const intro = el('div');
    n.appendChild(intro);
    await U.dire(intro, 'Tu as répondu ' + G.reponses.length + ' fois.', { apres: 300 });
    await U.dire(intro, "Regarde bien ce qui vient. Rien de ce que tu as répondu n'en a changé une seule lettre.", { forte: true, apres: 500 });
    if (G.subliminalMontre) {
      await U.dire(intro, "Tu l'as d'ailleurs déjà vue. Elle est passée à l'écran pendant un huitième de seconde, juste après que tu aies donné ton nom.", { apres: 600 });
    }
    await U.dire(intro, U.voix('verdicts', "Ta technique était écrite dans ton nom avant que tu ne t'assoies. Tes réponses ont seulement dit comment ton corps la porterait."), { forte: true, apres: 700 });

    JJK.audio.oath();
    JJK.fx.flash('#b31217', 900);
    JJK.fx.invert(90);
    JJK.fx.shake(0.6);
    JJK.fx.pulse(null, null, null, t.couleur, 1.6);
    await wait(600);
    intro.remove();

    const g = JJK.forge.grade(G.corps.puissance, G.serments.length);
    G.grade = g;
    U.majBarre({ grade: g.grade });
    U.titreFurtif(t.nom + ' — 呪法帳', 6000);

    const dossier = el('div', 'dossier');

    /* colonne gauche */
    const gauche = el('div');
    gauche.appendChild(el('span', 'etiquette rouge', 'Technique innée · ' + (t.essence.emotion_source || 'origine inconnue')));
    gauche.appendChild(el('h1', 'nom-technique', t.nom));
    const jl = el('div', 'nom-jp');
    jl.textContent = t.nomJp + ' · ' + t.romaji;
    gauche.appendChild(jl);

    gauche.appendChild(el('hr', 'trait'));
    gauche.appendChild(U.bloc('La loi', t.loi.enonce || t.loi.nom, 'loi'));
    const desc = JJK.forge.dossier(t);
    if (desc) gauche.appendChild(U.bloc('Constat', desc));
    if (t.vecteur && t.vecteur.condition) gauche.appendChild(U.bloc('Vecteur — ' + t.vecteur.nom, t.vecteur.condition));
    if (t.loi.limite) gauche.appendChild(U.bloc('Faille structurelle', t.loi.limite));
    if (t.revers) gauche.appendChild(U.bloc('Technique inversée', t.revers));
    if (t.maximum) gauche.appendChild(U.bloc('Technique maximale', t.maximum));

    if (t.domaine) {
      const d = el('div', 'bloc');
      d.appendChild(el('span', 'etiquette rouge', 'Extension du territoire'));
      const h = el('p');
      h.style.cssText = 'font-size:1.5rem;font-weight:300;margin:6px 0 4px';
      h.textContent = t.domaine.nom_fr;
      d.appendChild(h);
      d.appendChild(el('div', 'jp faible', (t.domaine.nom_jp || '') + ' · ' + (t.domaine.romaji || '')));
      if (t.domaine.paysage) { const p = el('p'); p.style.marginTop = '10px'; p.textContent = t.domaine.paysage; d.appendChild(p); }
      if (t.domaine.effet_garanti) {
        const e2 = el('p', 'serif-italique');
        e2.style.cssText = 'margin-top:10px;color:var(--sang-vif)';
        e2.textContent = '↯ ' + t.domaine.effet_garanti;
        d.appendChild(e2);
      }
      gauche.appendChild(d);
    }

    const s = G.corps.stats;
    gauche.appendChild(U.stats([
      [s.vigueur, 'Vigueur'], [s.flux, 'Flux'], [s.tranchant, 'Tranchant'],
      [s.lucidite, 'Lucidité'], [s.inversion, 'Inversion'],
    ]));
    gauche.appendChild(U.stats([
      [G.corps.pvMax, 'Points de vie'], [G.corps.enMax, 'Réserve'],
      [G.corps.attaque, 'Attaque'], [Math.round(G.corps.crit * 100) + '%', 'Critique'],
      [G.corps.puissance, 'Puissance'],
    ]));

    dossier.appendChild(gauche);

    /* colonne droite : le sceau */
    const droite = el('div', 'sceau-boite');
    const cvs = el('canvas', 'sceau-rot');
    cvs.style.width = '100%';
    droite.appendChild(cvs);
    const leg = el('div', 'sceau-legende');
    leg.appendChild(el('div', 'tampon', 'Grade ' + g.grade));
    const gl = el('p', 'discret');
    gl.style.marginTop = '14px';
    gl.textContent = g.nom + (g.description ? ' — ' + g.description : '');
    leg.appendChild(gl);
    const gl2 = el('p', 'discret');
    gl2.style.marginTop = '10px';
    gl2.innerHTML = 'Sceau tracé depuis la graine <span class="mono sang">' + escape2(t.seed) + '</span>. Aucune autre graine ne trace celui-ci.';
    leg.appendChild(gl2);
    droite.appendChild(leg);
    dossier.appendChild(droite);

    n.appendChild(dossier);
    requestAnimationFrame(() => JJK.fx.sigil(cvs, t.seed, { size: cvs.clientWidth || 320, accent: t.couleur }));

    /* Le lien : la technique d'un nom est vérifiable par n'importe qui,
       depuis n'importe quelle machine. C'est tout l'intérêt d'une lecture. */
    const part = el('div', 'bloc');
    part.appendChild(el('span', 'etiquette', 'Faire vérifier ce nom par quelqu\'un d\'autre'));
    const lien = el('p', 'mono discret');
    lien.style.cssText = 'word-break:break-all;-webkit-user-select:all;user-select:all;color:var(--os-faible)';
    lien.textContent = lienDe(t.seed);
    part.appendChild(lien);
    const cp = U.bouton('Copier le lien', 'fantome', () => {
      const url = lienDe(t.seed);
      const fini = () => { cp.textContent = 'Lien copié'; setTimeout(() => { cp.textContent = 'Copier le lien'; }, 2200); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(fini, () => selectionner(lien));
      else selectionner(lien);
    });
    cp.style.marginTop = '10px';
    part.appendChild(cp);
    gauche.appendChild(part);

    const r = U.rangee();
    r.appendChild(U.bouton('Prêter serment', 'rouge', serments));
    r.appendChild(U.bouton('Descendre sans rien signer', 'fantome', () => { G.serments = []; G.mods = JJK.serments.agreger([]); descente(); }));
    n.appendChild(r);
  }

  function lienDe(graine) {
    const base = location.href.split('#')[0];
    return base + '#g=' + encodeURIComponent(graine);
  }
  function selectionner(node) {
    try {
      const r = document.createRange(); r.selectNodeContents(node);
      const s2 = getSelection(); s2.removeAllRanges(); s2.addRange(r);
    } catch (e) {}
  }

  /* =====================================================================
     CONSULTATION — on arrive par un lien : on ne joue pas, on vérifie.
     ===================================================================== */
  async function consultation(graine) {
    const n = U.montrer('ecran-consultation');
    n.innerHTML = '';
    G.graine = graine;
    G.tech = JJK.forge.forgeTechnique(graine);
    const t = G.tech;
    JJK.fx.setHue(t.couleur, '#f2c14e');
    JJK.fx.setIntensity(0.4);
    U.majBarre({ graine: t.seed });

    const flux = el('div');
    n.appendChild(flux);
    await U.dire(flux, "Quelqu'un t'a envoyé un nom.", { apres: 380 });
    await U.dire(flux, '« ' + graine + ' ».', { forte: true, apres: 420 });
    await U.dire(flux, "Le registre ne fabrique rien. Il relit. Voici ce qui était déjà écrit dessous.", { apres: 500 });
    JJK.audio.oath();
    JJK.fx.flash('#b31217', 800);
    JJK.fx.invert(80);
    await JJK.core.wait(450);
    flux.remove();

    const d = el('div', 'dossier');
    const g2 = el('div');
    g2.appendChild(el('span', 'etiquette rouge', 'Consultation · lecture seule'));
    g2.appendChild(el('h1', 'nom-technique', t.nom));
    const jl = el('div', 'nom-jp'); jl.textContent = t.nomJp + ' · ' + t.romaji;
    g2.appendChild(jl);
    g2.appendChild(el('hr', 'trait'));
    g2.appendChild(U.bloc('La loi', t.loi.enonce || t.loi.nom, 'loi'));
    const pr = JJK.forge.dossier(t);
    if (pr) g2.appendChild(U.bloc('Constat', pr));
    if (t.loi.limite) g2.appendChild(U.bloc('Faille structurelle', t.loi.limite));
    if (t.domaine) g2.appendChild(U.bloc('Extension du territoire', t.domaine.nom_fr + ' — ' + (t.domaine.effet_garanti || '')));
    d.appendChild(g2);

    const dr = el('div', 'sceau-boite');
    const cvs = el('canvas', 'sceau-rot');
    cvs.style.width = '100%';
    dr.appendChild(cvs);
    const lg = el('p', 'discret centre');
    lg.style.marginTop = '14px';
    lg.textContent = 'Sceau de la graine « ' + t.seed + ' ».';
    dr.appendChild(lg);
    d.appendChild(dr);
    n.appendChild(d);
    requestAnimationFrame(() => JJK.fx.sigil(cvs, t.seed, { size: cvs.clientWidth || 320, accent: t.couleur }));

    const r = U.rangee();
    r.appendChild(U.bouton('Porter ce nom et descendre', 'rouge', () => {
      if (history.replaceState) history.replaceState(null, '', location.href.split('#')[0]);
      M().ecrire({ graine: t.seed });
      rituel();
    }));
    r.appendChild(U.bouton('Donner un autre nom', 'fantome', () => {
      if (history.replaceState) history.replaceState(null, '', location.href.split('#')[0]);
      seuil();
    }));
    n.appendChild(r);
  }

  function escape2(s) { return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

  /* =====================================================================
     4. LES SERMENTS
     ===================================================================== */
  async function serments() {
    const n = U.montrer('ecran-serments');
    n.innerHTML = '';
    JJK.fx.setIntensity(0.4);
    G.catalogue = G.catalogue.length ? G.catalogue : JJK.serments.catalogue(G.tech.seed);
    G.serments = G.serments || [];

    n.appendChild(el('span', 'etiquette rouge', 'Serments contraignants'));
    n.appendChild(el('h1', 'titre-rituel', 'Ce que tu <em>rends</em>'));
    const p = el('p');
    p.style.cssText = 'max-width:62ch;font-weight:300;color:var(--os-faible)';
    p.textContent = "Un serment n'est pas une amélioration. C'est une amputation payée d'avance : tu perds vraiment ce qui est écrit, dans ce jeu, tout de suite. En échange, le réel te doit quelque chose. Tu peux en signer trois.";
    n.appendChild(p);

    const compteur = el('p', 'etiquette');
    compteur.style.marginTop = '18px';
    n.appendChild(compteur);

    const liste = el('div');
    liste.style.marginTop = '18px';
    n.appendChild(liste);

    const r = U.rangee();
    const suite = U.bouton('Descendre', 'rouge', () => {
      G.mods = JJK.serments.agreger(G.serments);
      if (G.mods.coupeSon) JJK.audio.toggleMute(true);
      M().ecrire({ serments: G.serments.map(s => s.id) });
      descente();
    });
    r.appendChild(suite);
    n.appendChild(r);

    function maj() {
      const reste = 3 - G.serments.length;
      compteur.textContent = reste > 0 ? (reste + ' serment' + (reste > 1 ? 's' : '') + ' encore possible' + (reste > 1 ? 's' : '')) : 'Le contrat est plein.';
      liste.innerHTML = '';
      G.catalogue.forEach(s => {
        const signe = G.serments.indexOf(s) >= 0;
        const c = el('div', 'contrat' + (signe ? ' signe' : ''));
        c.appendChild(el('h4', '', s.nom));
        c.appendChild(el('p', 'clause', '« ' + s.clause + ' »'));
        const e = el('div', 'echange');
        e.appendChild(el('span', 'perte', s.perte));
        e.appendChild(el('span', 'gain', s.gain));
        e.appendChild(U.pointsDanger(s.danger));
        c.appendChild(e);
        c.addEventListener('click', () => {
          if (signe) {
            G.serments.splice(G.serments.indexOf(s), 1);
            JJK.audio.tick(300, 0.08, 0.06);
            maj();
            return;
          }
          if (G.serments.length >= 3) { JJK.fx.shake(0.15); return; }
          G.serments.push(s);
          JJK.audio.oath();
          JJK.fx.invert(140);
          JJK.fx.flash('#b31217', 700);
          JJK.fx.shake(0.5);
          JJK.fx.slash('#b31217', 1);
          JJK.fx.ink(null, null, 0.5, '#b31217');
          U.titreFurtif('SIGNÉ — ' + s.nom, 4500);
          maj();
        });
        liste.appendChild(c);
      });
      suite.textContent = G.serments.length ? 'Descendre avec ' + G.serments.length + ' serment' + (G.serments.length > 1 ? 's' : '') : 'Descendre les mains libres';
    }
    maj();
  }

  /* =====================================================================
     5. LA DESCENTE
     ===================================================================== */
  const ORDRE = ['4', '4', '3', '3', '2', '2', '1', '1', 'semi-spécial', 'semi-spécial', 'spécial'];

  function gradeCible(i) { return ORDRE[Math.min(i, ORDRE.length - 1)]; }
  function courbe(i) { return 1 + i * 0.11; }

  function descente() {
    const n = U.montrer('ecran-descente');
    n.innerHTML = '';
    JJK.fx.setIntensity(0.35);
    if (!G.mods) G.mods = JJK.serments.agreger(G.serments);
    G.corps = appliquerMaturation(G.ref, G.maturation);
    const g = JJK.forge.grade(G.corps.puissance, G.serments.length);
    G.grade = g;
    U.majBarre({ grade: g.grade, registre: 'DESCENTE ' + (G.descente + 1) + ' · ' + M().lire().morts + ' MORT(S)' });

    n.appendChild(el('span', 'etiquette rouge', 'Descente ' + (G.descente + 1)));
    n.appendChild(el('h1', 'titre-rituel', 'Choisis ce qui <em>t\'ouvrira</em>'));

    const info = el('p', 'discret');
    info.style.maxWidth = '64ch';
    info.textContent = 'Porteur de « ' + G.tech.nom + ' ». ' + G.corps.pvMax + ' points de vie, ' +
      G.corps.attaque + ' d\'attaque, ' + G.serments.length + ' serment(s) signé(s). Maturation ' + G.maturation + '.';
    n.appendChild(info);
    n.appendChild(el('hr', 'trait'));

    const gr = gradeCible(G.descente);
    const bes = ((C().bestiaire || {}).fleaux) || [];
    const pool = bes.filter(f => String(f.grade) === gr);
    const choix = (pool.length ? pool : bes).slice();
    for (let i = choix.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = choix[i]; choix[i] = choix[j]; choix[j] = t; }
    let trois = choix.slice(0, 3);
    if (!trois.length) trois = [{ id: 'vide', nom: 'Quelque chose qui n\'a pas de nom', grade: gr, apparence: '', origine: '', replique: '…' }];

    const rev = M().revenant();
    const grille = el('div');
    grille.style.cssText = 'display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))';

    trois.forEach(f => grille.appendChild(carteFleau(f, false)));
    if (rev) grille.appendChild(carteFleau(rev, true));
    n.appendChild(grille);

    const r = U.rangee();
    r.appendChild(U.bouton('Revoir le dossier', 'fantome', revelation));
    r.appendChild(U.bouton('Modifier les serments', 'fantome', serments));
    r.appendChild(U.bouton('Registre', 'fantome', registre));
    n.appendChild(r);

    function carteFleau(f, estRevenant) {
      const c = el('div', 'contrat');
      if (estRevenant) c.style.borderColor = 'rgba(242,193,78,.5)';
      const h = el('h4', '', f.nom);
      c.appendChild(h);
      const sg = el('div', 'etiquette' + (estRevenant ? ' or' : ''));
      sg.textContent = 'Grade ' + (f.grade || '?') + (estRevenant ? ' · revenant' : '');
      c.appendChild(sg);
      if (f.apparence) { const p2 = el('p', 'clause'); p2.style.marginTop = '10px'; p2.textContent = f.apparence; c.appendChild(p2); }
      if (f.origine) { const p3 = el('p', 'discret'); p3.textContent = 'Né de : ' + f.origine; c.appendChild(p3); }
      c.addEventListener('click', () => {
        JJK.audio.tick(400, 0.06, 0.08);
        JJK.duel.lancer(f, { courbe: courbe(G.descente), revenant: estRevenant });
      });
      return c;
    }
  }

  /* =====================================================================
     6. LE REGISTRE
     ===================================================================== */
  function registre() {
    const n = U.montrer('ecran-registre');
    n.innerHTML = '';
    const r = M().lire();
    n.appendChild(el('span', 'etiquette rouge', 'Registre'));
    n.appendChild(el('h1', 'titre-rituel', 'Ceux qui sont <em>restés</em>'));

    n.appendChild(U.stats([
      [r.descentes, 'Descentes'], [r.victoires, 'Victoires'], [r.morts, 'Morts'],
      [r.domainesOuverts, 'Territoires'], [r.sermentsPretes, 'Serments'],
      [Math.round(r.degatsInfliges), 'Dégâts infligés'],
    ]));

    if (!r.epitaphes.length) {
      const p = el('p', 'discret');
      p.style.marginTop = '20px';
      p.textContent = "Personne n'est encore tombé ici. Le registre attend, comme une page réglée.";
      n.appendChild(p);
    } else {
      const l = el('div');
      l.style.marginTop = '24px';
      r.epitaphes.forEach(e => {
        const t = el('div', 'tombe');
        t.appendChild(el('div', 'nom', (e.nom || 'sans nom') + ' — « ' + (e.technique || '?') + ' »'));
        const d = el('div', 'det');
        d.textContent = 'Tombé au tour ' + (e.tour || '?') + ' · ' + (e.tueur || 'inconnu') +
          ' · grade ' + (e.grade || '?') + ' · ' + (e.serments || []).length + ' serment(s)';
        t.appendChild(d);
        if (e.derniersMots) { const m = el('p', 'clause'); m.style.marginTop = '8px'; m.textContent = '« ' + e.derniersMots + ' »'; t.appendChild(m); }
        l.appendChild(t);
      });
      n.appendChild(l);
    }

    if (r.titres && r.titres.length) {
      n.appendChild(el('hr', 'trait'));
      n.appendChild(el('span', 'etiquette', 'Titres obtenus'));
      const ul = el('div', 'pile');
      ul.style.marginTop = '10px';
      r.titres.forEach(t => { const s = el('div', 'tampon', t); s.style.marginRight = '8px'; ul.appendChild(s); });
      n.appendChild(ul);
    }

    const rr = U.rangee();
    if (G.tech) rr.appendChild(U.bouton('Reprendre la descente', '', descente));
    rr.appendChild(U.bouton('Repartir d\'un autre nom', 'fantome', () => { reinit(); seuil(); }));
    rr.appendChild(U.bouton('Brûler le registre', 'fantome', () => {
      if (!confirm("Effacer définitivement toutes les morts, tous les titres, toute la mémoire ? Cela ne se défait pas.")) return;
      M().effacer(); JJK.fx.inkClear(); JJK.fx.flash('#fff', 900); reinit(); seuil();
    }));
    n.appendChild(rr);
  }

  function reinit() {
    G.tech = null; G.ref = null; G.corps = null; G.mods = null;
    G.serments = []; G.reponses = []; G.maturation = 0; G.descente = 0;
    G.catalogue = []; G.subliminalMontre = false;
    JJK.fx.setDead(0);
  }

  JJK.ecrans = { seuil, rituel, revelation, serments, descente, registre, consultation, reinit, appliquerMaturation, gradeCible, courbe, lienDe, G };
})(window);
