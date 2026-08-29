/* =========================================================================
   RITUEL — écrans
   Le Bureau des Exorcistes convoque un réceptacle, lui fait remplir un
   formulaire, l'examine, puis le Haut Conseil lui attribue un grade.
   ========================================================================= */
(function (root) {
  'use strict';
  const JJK = (root.JJK = root.JJK || {});
  const { el, clamp, wait, titre, chaos } = JJK.core;
  const U = JJK.ui;

  const G = {
    porteur: '', declaration: null, poids: null, archetype: 'seuil',
    tech: null, ref: null, corps: null, mods: null,
    serments: [], maturation: 0, descente: 0, grade: null,
    catalogue: [], reponsesExamen: [],
  };
  JJK.jeu = G;

  function M() { return JJK.memoire; }
  function C() { return JJK.CORPUS || {}; }
  function T() { return JJK.taxo; }
  function amb(k, def) { return U.pioche((C().ambiance || {})[k], def); }

  /* =====================================================================
     REPLIS — le jeu doit tourner même si le corpus est amputé
     ===================================================================== */
  const FORMULAIRE_SECOURS = {
    titre_formulaire: 'Formulaire D-4 · déclaration de technique innée',
    questions: T().AXES.map((a, i) => ({
      axe: a.id, numero: i + 1,
      intitule: a.id.charAt(0).toUpperCase() + a.id.slice(1),
      question: 'Rubrique ' + (i + 1) + ' : que déclarez-vous ?',
      precision: 'Répondez. Le dossier reste ouvert jusqu\'à la dernière ligne.',
      reponses: a.tags.map(t => ({ tag: t, texte: t.replace(/_/g, ' '), consequence: '' })),
    })),
  };
  const EXAMEN_SECOURS = {
    questions: [
      { question: "Le jour où vous avez cessé de répondre au téléphone, qu'aviez-vous dans les mains ?",
        precision: "Le Bureau connaît la date. Il vérifie seulement l'objet.",
        reponses: [
          { texte: "Un torchon. Je n'ai pas arrêté d'essuyer.", archetype: 'répétition', axe: 'flux', note: 'Occupe ses mains pour ne pas décider.' },
          { texte: "Rien. Je les avais posées à plat sur la table.", archetype: 'mesure', axe: 'lucidite', note: 'Attend que la chose se compte elle-même.' },
          { texte: "L'appareil. Je l'ai gardé jusqu'à ce qu'il chauffe.", archetype: 'lien', axe: 'inversion', note: 'Ne lâche pas ce qui brûle.' },
        ] },
      { question: "À qui n'avez-vous jamais rendu ce que vous aviez pris ?",
        precision: "Un nom suffit. Le Bureau ne le transmettra pas.",
        reponses: [
          { texte: "À quelqu'un qui est mort avant que je m'en souvienne.", archetype: 'soustraction', axe: 'tranchant', note: 'La dette a survécu au créancier.' },
          { texte: "À moi-même, et je tiens les comptes.", archetype: 'échange', axe: 'flux', note: 'Se facture ses propres heures.' },
          { texte: "À personne. J'ai tout rendu, et trop tôt.", archetype: 'seuil', axe: 'vigueur', note: 'Solde nul, rancune intacte.' },
        ] },
      { question: "Quand vous refaites le même trajet, à quel endroit ralentissez-vous ?",
        precision: "Vous ralentissez. Tout le monde ralentit quelque part.",
        reponses: [
          { texte: "Devant une porte cochère que je ne franchis plus.", archetype: 'seuil', axe: 'vigueur', note: 'Contourne un seuil précis depuis des années.' },
          { texte: "Au dernier virage, pour retarder l'arrivée.", archetype: 'métamorphose', axe: 'tranchant', note: 'Diffère le moment d\'être vu.' },
          { texte: "Nulle part. J'ai changé de trajet.", archetype: 'témoignage', axe: 'lucidite', note: 'A déplacé le problème sans le résoudre.' },
        ] },
    ],
  };

  /* Une réponse cochée fige la liste : les autres options s'effacent, la
     retenue reste lisible, et plus rien n'attend un clic qui ne compte plus. */
  function choisirDansListe(liste, reponses, champNote) {
    return new Promise(res => {
      let pris = false;
      (reponses || []).forEach(rep => {
        const b = el('button', 'reponse');
        b.appendChild(document.createTextNode(rep.texte));
        if (rep[champNote]) b.appendChild(el('span', 'murmure', rep[champNote]));
        b.addEventListener('click', () => {
          if (pris) return;
          pris = true;
          JJK.audio.tick(680, 0.03, 0.06);
          JJK.fx.pulse(chaos.r(0, JJK.fx.size.W), chaos.r(0, JJK.fx.size.H), 150, '#b31217', 0.5);
          Array.prototype.forEach.call(liste.children, x => {
            x.disabled = true;
            if (x !== b) x.classList.add('ecartee'); else x.classList.add('retenue');
          });
          res(rep);
        });
        liste.appendChild(b);
      });
    });
  }

  function formulaire() {
    const f = C().formulaire;
    return (f && Array.isArray(f.questions) && f.questions.length >= 10) ? f : FORMULAIRE_SECOURS;
  }
  function examenSource() {
    const e = C().examen;
    return (e && Array.isArray(e.questions) && e.questions.length >= 3) ? e.questions : EXAMEN_SECOURS.questions;
  }

  /* =====================================================================
     1. LA CONVOCATION
     ===================================================================== */
  async function seuil() {
    U.calmer();
    const n = U.montrer('ecran-seuil');
    n.innerHTML = '';
    n.style.position = 'relative';
    JJK.fx.setIntensity(0.12);
    JJK.fx.setHue('#b31217', '#f2c14e');
    U.majBarre({ graine: '', grade: '', registre: '' });

    const reg = M().lire();
    const retour = M().estUnRetour();

    const tete = el('div');
    tete.appendChild(el('span', 'etiquette rouge', 'Bureau des exorcistes · service des enregistrements'));
    tete.appendChild(el('h1', 'titre-rituel', 'RITUEL'));
    tete.appendChild(el('div', 'jp faible', '呪法帳 · じゅほうちょう'));
    n.appendChild(tete);
    n.appendChild(el('hr', 'trait'));

    const presse = el('p', 'discret mort');
    presse.style.cssText = 'position:absolute;right:0;top:0;font-family:var(--mono);font-size:9px;letter-spacing:.22em';
    presse.textContent = 'CLIC — PLUS VITE';
    n.appendChild(presse);
    setTimeout(() => presse.remove(), 14000);

    const flux = el('div');
    n.appendChild(flux);

    const ouverture = (C().ambiance || {}).convocation || (C().rituel || {}).ouverture || [
      "Vous avez été convoqué. Ce n'est pas une distinction.",
      "Le Bureau n'attribue pas de techniques : il enregistre celles qui existent déjà.",
      "Une loi innée ne s'apprend pas, ne se choisit pas, ne se refuse pas. Elle se déclare.",
      "Vous allez remplir dix rubriques. Chacune restreint ce que vous serez.",
      "Ensuite seulement, on vous dira ce que vous portez.",
    ];

    if (retour) {
      const mort = reg.epitaphes[0];
      await U.dire(flux, amb('convocation', "Vous êtes déjà passé par ce service."), { forte: true, apres: 420 });
      if (mort) {
        await U.dire(flux, 'Dossier clos : ' + (mort.nom || 'sans nom') + ', porteur de « ' + (mort.technique || 'rien') +
          ' », tombé au tour ' + (mort.tour || '?') + ' devant ' + (mort.tueur || 'quelque chose') + '.', { apres: 380 });
        await U.dire(flux, U.voix('retour', "Rien ne vous oblige à rouvrir un dossier. Rien ne vous en empêche."), { apres: 260 });
      }
    } else {
      const lignes = ouverture.length > 6 ? ouverture.slice(0, 5).concat([ouverture[ouverture.length - 1]]) : ouverture;
      for (let i = 0; i < lignes.length; i++) {
        await U.dire(flux, lignes[i], { forte: i === lignes.length - 1, apres: i === 0 ? 400 : 190 });
      }
    }

    const boite = el('div');
    boite.style.marginTop = '30px';
    boite.appendChild(el('span', 'etiquette', 'Nom porté par le réceptacle'));
    const champ = el('input', 'champ');
    champ.type = 'text'; champ.maxLength = 32;
    champ.placeholder = 'à inscrire au dossier';
    champ.autocomplete = 'off'; champ.spellcheck = false;
    boite.appendChild(champ);
    const avert = el('p', 'discret');
    avert.style.marginTop = '12px';
    avert.textContent = "Ce nom ne détermine rien. Il sert au dossier, aux convocations et, le cas échéant, à l'épitaphe. Votre technique, elle, sortira de ce que vous allez déclarer.";
    boite.appendChild(avert);
    const alerte = el('p', 'discret sang');
    alerte.style.cssText = 'margin-top:10px;min-height:1.4em;font-style:italic';
    boite.appendChild(alerte);
    n.appendChild(boite);

    const r = U.rangee();
    const go = U.bouton('Ouvrir un dossier', 'rouge', valider);
    go.disabled = true;
    r.appendChild(go);
    r.appendChild(U.bouton('Reprendre un dossier existant', 'fantome', reprendre));
    if (reg.epitaphes.length) r.appendChild(U.bouton('Consulter les morts', 'fantome', registre));
    n.appendChild(r);

    champ.addEventListener('input', () => {
      go.disabled = champ.value.trim().length < 1;
      if (champ.value.length && Math.random() < 0.22 && JJK.audio) JJK.audio.tick(chaos.r(600, 1800), 0.014, 0.02);
      const g2 = JJK.core.normalizeSeed(champ.value);
      const morts = reg.epitaphes.filter(e => JJK.core.normalizeSeed(e.nom || '') === g2);
      if (g2 && morts.length) {
        alerte.textContent = 'Ce nom figure déjà au registre des pertes' + (morts.length > 1 ? ' (' + morts.length + ' fois)' : '') +
          ' — porteur de « ' + morts[0].technique + ' ».';
        JJK.fx.shake(0.08);
      } else alerte.textContent = '';
    });
    champ.addEventListener('keydown', e => { if (e.key === 'Enter' && !go.disabled) valider(); });
    setTimeout(() => champ.focus(), 300);

    async function valider() {
      const v = champ.value.trim();
      if (!v) return;
      JJK.audio.unlock();
      G.porteur = v;
      M().ecrire({ graine: JJK.core.normalizeSeed(v) });
      U.majBarre({ graine: JJK.core.normalizeSeed(v) });
      JJK.fx.pulse(null, null, null, '#b31217', 1.2);
      await wait(280);
      declaration();
    }

    function reprendre() {
      const code = prompt("Numéro de dossier (par exemple R1-B824-01E83) :", '');
      if (!code) return;
      const lu = T().lireDossierCode(code);
      if (!lu) { alerte.textContent = "Ce numéro ne correspond à aucun dossier."; JJK.fx.shake(0.2); return; }
      G.porteur = champ.value.trim() || 'sans nom';
      consultation(lu);
    }
  }

  /* =====================================================================
     2. LA DÉCLARATION — dix rubriques
     ===================================================================== */
  async function declaration() {
    U.calmer();
    const n = U.montrer('ecran-declaration');
    n.innerHTML = '';
    JJK.fx.setIntensity(0.26);
    /* pas de murmures pendant qu'on lit un formulaire : ils passeraient
       par-dessus les questions, et ces questions demandent qu'on les lise */
    U.murmures(false);

    const f = formulaire();
    const questions = f.questions.slice().sort((a, b) => (a.numero || 0) - (b.numero || 0)).slice(0, 10);
    G.declaration = {};

    n.appendChild(el('span', 'etiquette rouge', f.titre_formulaire || 'Déclaration de technique innée'));
    const grille = el('div', 'formulaire');

    const gauche = el('div');
    const droite = el('aside', 'feuille');
    const enTete = el('span', 'etiquette');
    enTete.textContent = 'Dossier en cours · 0 / 10';
    droite.appendChild(enTete);
    const lignes = el('div', 'lignes-dossier');
    droite.appendChild(lignes);
    const codeVif = el('div', 'code-dossier');
    codeVif.textContent = '— — — —';
    droite.appendChild(codeVif);

    grille.appendChild(gauche); grille.appendChild(droite);
    n.appendChild(grille);

    const jauge = el('div', 'jauge-rituel');
    questions.forEach(() => jauge.appendChild(el('i')));
    n.appendChild(jauge);

    /* la feuille se remplit à mesure : on voit son dossier se fermer sur soi */
    questions.forEach(q => {
      const l = el('div', 'ligne-dossier');
      l.appendChild(el('b', '', q.intitule || q.axe));
      l.appendChild(el('span', 'valeur', '—'));
      l.dataset.axe = q.axe;
      lignes.appendChild(l);
    });

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      gauche.innerHTML = '';
      const eyebrow = el('div', 'etiquette');
      eyebrow.textContent = 'Rubrique ' + (i + 1) + ' / ' + questions.length + ' · ' + (q.intitule || q.axe);
      gauche.appendChild(eyebrow);
      const h = el('h2', 'question-texte');
      gauche.appendChild(h);
      await JJK.fx.type(h, q.question, { speed: 16 });
      if (q.precision) {
        const p = el('p', 'precision');
        gauche.appendChild(p);
        await JJK.fx.type(p, q.precision, { speed: 12, sound: false });
      }

      const liste = el('div', 'reponses');
      gauche.appendChild(liste);
      const choix = await choisirDansListe(liste, q.reponses, 'consequence');

      const tag = T().tagValide(q.axe, choix.tag) ? choix.tag : T().AXE[q.axe].tags[0];
      G.declaration[q.axe] = tag;
      const rangee = lignes.querySelector('[data-axe="' + q.axe + '"]');
      if (rangee) {
        rangee.classList.add('remplie');
        const ligne = rangee.querySelector('.valeur');
        ligne.textContent = choix.texte;
        ligne.classList.add('inscrite');
      }
      enTete.textContent = 'Dossier en cours · ' + (i + 1) + ' / ' + questions.length;
      jauge.children[i].classList.add('pleine');
      JJK.fx.setIntensity(0.26 + (i / questions.length) * 0.3);
      /* le numéro de dossier se forme sous les yeux du déclarant */
      const partiel = {};
      T().AXES.forEach(a => { partiel[a.id] = G.declaration[a.id] || a.tags[0]; });
      codeVif.textContent = T().codeDeclaration(partiel);
      if (choix.consequence) {
        const note = el('p', 'consequence-inscrite');
        gauche.appendChild(note);
        await JJK.fx.type(note, '↳ ' + choix.consequence, { speed: 11, sound: false });
        await wait(340);
      }
    }

    /* toute rubrique manquante est remplie d'office : un dossier ne reste pas ouvert */
    T().AXES.forEach(a => { if (!G.declaration[a.id]) G.declaration[a.id] = a.tags[0]; });
    examen();
  }

  /* =====================================================================
     3. L'EXAMEN DU PORTEUR
     ===================================================================== */
  async function examen() {
    U.calmer();
    const n = U.montrer('ecran-examen');
    n.innerHTML = '';
    JJK.fx.setIntensity(0.4);

    const src = examenSource().slice();
    for (let i = src.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = src[i]; src[i] = src[j]; src[j] = t; }
    const choisies = src.slice(0, Math.min(8, src.length));

    G.poids = { vigueur: 0, flux: 0, tranchant: 0, lucidite: 0, inversion: 0 };
    G.reponsesExamen = [];
    const compteArch = {};

    n.appendChild(el('span', 'etiquette rouge', 'Examen du réceptacle · seconde partie'));
    const intro = el('p', 'discret');
    intro.style.maxWidth = '64ch';
    intro.textContent = "La technique est enregistrée. Ce qui suit ne la modifiera pas : on établit seulement de quoi votre corps est capable en la portant.";
    n.appendChild(intro);

    const zone = el('div', 'question-bloc');
    n.appendChild(zone);
    const jauge = el('div', 'jauge-rituel');
    choisies.forEach(() => jauge.appendChild(el('i')));
    n.appendChild(jauge);

    const relances = (C().ambiance || {}).bureau || ['Noté.', 'Le dossier vous suit.', 'Poursuivons.'];

    for (let i = 0; i < choisies.length; i++) {
      const q = choisies[i];
      zone.innerHTML = '';
      const h = el('h2', 'question-texte');
      zone.appendChild(h);
      await JJK.fx.type(h, q.question, { speed: 16 });
      if (q.precision) {
        const p = el('p', 'precision');
        zone.appendChild(p);
        await JJK.fx.type(p, q.precision, { speed: 12, sound: false });
      }
      const liste = el('div', 'reponses');
      zone.appendChild(liste);
      const choix = await choisirDansListe(liste, q.reponses, 'note');
      const axe = T().AXES_CORPS.indexOf(choix.axe) >= 0 ? choix.axe : 'vigueur';
      G.poids[axe] = Math.min(8, (G.poids[axe] || 0) + 1);
      const a = choix.archetype || 'seuil';
      compteArch[a] = (compteArch[a] || 0) + 1;
      G.reponsesExamen.push({ axe, archetype: a });
      jauge.children[i].classList.add('pleine');
      if (i < choisies.length - 1) {
        zone.innerHTML = '';
        const t = el('p', 'rituel-ligne forte');
        zone.appendChild(t);
        await JJK.fx.type(t, relances[i % relances.length], { speed: 16 });
        await wait(320);
      }
    }

    G.archetype = Object.keys(compteArch).sort((a, b) => compteArch[b] - compteArch[a])[0] || 'seuil';
    assembler();
    revelation();
  }

  function assembler() {
    G.tech = JJK.forge.forgeDepuisDeclaration(G.declaration);
    G.ref = JJK.forge.forgeReceptacle(G.declaration, G.poids);
    G.corps = appliquerMaturation(G.ref, G.maturation);
    G.mods = JJK.serments.agreger(G.serments, G.ref.profil.mod);
    G.code = T().dossierCode(G.declaration, G.poids, G.archetype);
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
     4. LA NOMINATION
     ===================================================================== */
  async function revelation() {
    U.calmer();
    const n = U.montrer('ecran-revelation');
    n.innerHTML = '';
    const t = G.tech;
    JJK.fx.setHue(t.couleur, '#f2c14e');
    JJK.fx.setIntensity(0.45);

    const intro = el('div');
    n.appendChild(intro);
    await U.dire(intro, 'Dix rubriques, huit réponses. Le dossier est complet.', { apres: 300 });
    await U.dire(intro, amb('verdicts_conseil', "Le Haut Conseil des Exorcistes a lu votre déclaration et lui a donné un nom."), { forte: true, apres: 460 });

    JJK.audio.oath();
    JJK.fx.flash('#b31217', 900);
    JJK.fx.invert(90);
    JJK.fx.shake(0.6);
    JJK.fx.pulse(null, null, null, t.couleur, 1.6);
    await wait(560);
    intro.remove();

    const g = JJK.forge.grade(G.corps.puissance, G.serments.length);
    G.grade = g;
    U.majBarre({ grade: g.grade });
    U.titreFurtif(t.nom + ' — 呪法帳', 6000);

    const dossier = el('div', 'dossier');
    const gauche = el('div');
    gauche.appendChild(el('span', 'etiquette rouge', 'Technique innée · ' + (t.essence.emotion_source || 'origine non établie')));
    gauche.appendChild(el('h1', 'nom-technique', t.nom));
    const jl = el('div', 'nom-jp');
    jl.textContent = t.nomJp + ' · ' + t.romaji;
    gauche.appendChild(jl);
    gauche.appendChild(el('hr', 'trait'));

    gauche.appendChild(U.bloc('La loi', t.loi.enonce || t.loi.nom, 'loi'));
    const desc = JJK.forge.dossier(t);
    if (desc) gauche.appendChild(U.bloc('Constat', desc));
    if (t.vecteur && t.vecteur.condition) gauche.appendChild(U.bloc('Vecteur — ' + t.vecteur.nom, t.vecteur.condition));
    if (!t.tenu.portee) {
      const w = U.bloc('Réserve du Bureau', "La portée déclarée et la condition d'énonciation ne se rencontrent pas dans le réel. Le service a retenu la condition : c'est elle qui décide où la loi s'applique.");
      w.querySelector('p').style.color = 'var(--sang-vif)';
      gauche.appendChild(w);
    }
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

    /* ce que la déclaration coûte, en clair, sans euphémisme */
    const conseq = el('div', 'bloc');
    conseq.appendChild(el('span', 'etiquette rouge', 'Conséquences de votre déclaration'));
    const ul = el('div', 'notes-formulaire');
    G.ref.profil.notes.forEach(x => {
      const li = el('div', 'note-formulaire');
      li.appendChild(el('b', '', x.axe));
      li.appendChild(el('span', '', x.note));
      ul.appendChild(li);
    });
    conseq.appendChild(ul);
    gauche.appendChild(conseq);

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

    const part = el('div', 'bloc');
    part.appendChild(el('span', 'etiquette', 'Numéro de dossier'));
    const lien = el('p', 'mono');
    lien.style.cssText = 'font-size:1.3rem;letter-spacing:.16em;color:var(--or);-webkit-user-select:all;user-select:all';
    lien.textContent = G.code;
    part.appendChild(lien);
    const sous = el('p', 'discret');
    sous.textContent = "Ce numéro contient la déclaration entière. Donnez-le à quelqu'un : le service lui montrera exactement ce que vous portez.";
    part.appendChild(sous);
    const cp = U.bouton('Copier le lien', 'fantome', () => {
      const url = lienDe(G.code);
      const fini = () => { cp.textContent = 'Lien copié'; setTimeout(() => { cp.textContent = 'Copier le lien'; }, 2200); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(fini, () => selectionner(lien));
      else selectionner(lien);
    });
    cp.style.marginTop = '10px';
    part.appendChild(cp);
    gauche.appendChild(part);

    dossier.appendChild(gauche);

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
    droite.appendChild(leg);
    dossier.appendChild(droite);

    n.appendChild(dossier);
    requestAnimationFrame(() => JJK.fx.sigil(cvs, t.code, { size: cvs.clientWidth || 320, accent: t.couleur }));

    const r = U.rangee();
    r.appendChild(U.bouton('Prêter serment', 'rouge', serments));
    r.appendChild(U.bouton('Descendre sans rien signer', 'fantome', () => { G.serments = []; assembler(); descente(); }));
    r.appendChild(U.bouton('Refaire une déclaration', 'fantome', declaration));
    n.appendChild(r);
  }

  function lienDe(code) { return location.href.split('#')[0] + '#d=' + encodeURIComponent(code); }
  function selectionner(node) {
    try {
      const r = document.createRange(); r.selectNodeContents(node);
      const s2 = getSelection(); s2.removeAllRanges(); s2.addRange(r);
    } catch (e) {}
  }

  /* =====================================================================
     CONSULTATION — on arrive par un numéro de dossier
     ===================================================================== */
  async function consultation(lu) {
    U.calmer();
    const n = U.montrer('ecran-consultation');
    n.innerHTML = '';
    const tech = JJK.forge.forgeDepuisDeclaration(lu.declaration);
    const ref = JJK.forge.forgeReceptacle(lu.declaration, lu.poids);
    JJK.fx.setHue(tech.couleur, '#f2c14e');
    JJK.fx.setIntensity(0.4);

    const flux = el('div');
    n.appendChild(flux);
    await U.dire(flux, "On vous a communiqué un numéro de dossier.", { apres: 320 });
    await U.dire(flux, "Le service ne fabrique rien. Il ressort la fiche.", { forte: true, apres: 380 });
    JJK.audio.oath();
    JJK.fx.flash('#b31217', 800);
    await wait(400);
    flux.remove();

    const d = el('div', 'dossier');
    const g2 = el('div');
    g2.appendChild(el('span', 'etiquette rouge', 'Consultation · lecture seule'));
    g2.appendChild(el('h1', 'nom-technique', tech.nom));
    g2.appendChild(el('div', 'nom-jp', tech.nomJp + ' · ' + tech.romaji));
    g2.appendChild(el('hr', 'trait'));
    g2.appendChild(U.bloc('La loi', tech.loi.enonce || tech.loi.nom, 'loi'));
    const pr = JJK.forge.dossier(tech);
    if (pr) g2.appendChild(U.bloc('Constat', pr));
    if (tech.loi.limite) g2.appendChild(U.bloc('Faille structurelle', tech.loi.limite));
    if (tech.domaine) g2.appendChild(U.bloc('Extension du territoire', tech.domaine.nom_fr + ' — ' + (tech.domaine.effet_garanti || '')));
    const decl = el('div', 'bloc');
    decl.appendChild(el('span', 'etiquette', 'Déclaration enregistrée'));
    const dl = el('div', 'notes-formulaire');
    T().AXES.forEach(a => {
      const li = el('div', 'note-formulaire');
      li.appendChild(el('b', '', a.id));
      li.appendChild(el('span', '', String(lu.declaration[a.id]).replace(/_/g, ' ')));
      dl.appendChild(li);
    });
    decl.appendChild(dl);
    g2.appendChild(decl);
    g2.appendChild(U.stats([
      [ref.stats.vigueur, 'Vigueur'], [ref.stats.flux, 'Flux'], [ref.stats.tranchant, 'Tranchant'],
      [ref.stats.lucidite, 'Lucidité'], [ref.stats.inversion, 'Inversion'],
    ]));
    d.appendChild(g2);

    const dr = el('div', 'sceau-boite');
    const cvs = el('canvas', 'sceau-rot');
    cvs.style.width = '100%';
    dr.appendChild(cvs);
    const lg = el('p', 'discret centre');
    lg.style.marginTop = '14px';
    lg.textContent = 'Dossier ' + T().dossierCode(lu.declaration, lu.poids, lu.archetype);
    dr.appendChild(lg);
    d.appendChild(dr);
    n.appendChild(d);
    requestAnimationFrame(() => JJK.fx.sigil(cvs, tech.code, { size: cvs.clientWidth || 320, accent: tech.couleur }));

    const r = U.rangee();
    r.appendChild(U.bouton('Reprendre ce dossier', 'rouge', () => {
      if (history.replaceState) history.replaceState(null, '', location.href.split('#')[0]);
      G.declaration = lu.declaration; G.poids = lu.poids; G.archetype = lu.archetype;
      if (!G.porteur) G.porteur = 'sans nom';
      assembler();
      revelation();
    }));
    r.appendChild(U.bouton('Ouvrir mon propre dossier', 'fantome', () => {
      if (history.replaceState) history.replaceState(null, '', location.href.split('#')[0]);
      seuil();
    }));
    n.appendChild(r);
  }

  /* =====================================================================
     5. LES SERMENTS
     ===================================================================== */
  function capSerments() { return Math.min(5, 3 + Math.floor(G.maturation / 4)); }

  async function serments() {
    U.calmer();
    const n = U.montrer('ecran-serments');
    n.innerHTML = '';
    JJK.fx.setIntensity(0.4);
    G.catalogue = G.catalogue.length ? G.catalogue : JJK.serments.catalogue(G.tech.code);
    G.serments = G.serments || [];
    const cap = capSerments();
    while (G.serments.length > cap) G.serments.pop();

    n.appendChild(el('span', 'etiquette rouge', 'Serments contraignants'));
    n.appendChild(el('h1', 'titre-rituel', 'Ce que vous <em>rendez</em>'));
    const p = el('p');
    p.style.cssText = 'max-width:62ch;font-weight:300;color:var(--os-faible)';
    p.textContent = "Un serment n'est pas une amélioration : c'est une amputation payée d'avance. Vous perdez réellement ce qui est écrit, dans ce jeu, tout de suite. " +
      (cap > 3 ? "Vous êtes descendu assez bas pour qu'on vous en laisse signer " + cap + "." : "Trois pour l'instant. Plus bas, on vous en laissera davantage.");
    n.appendChild(p);

    const compteur = el('p', 'etiquette');
    compteur.style.marginTop = '18px';
    n.appendChild(compteur);
    const liste = el('div');
    liste.style.marginTop = '18px';
    n.appendChild(liste);

    const r = U.rangee();
    const suite = U.bouton('Descendre', 'rouge', () => {
      assembler();
      if (G.mods.coupeSon) { JJK.audio.toggleMute(true); M().ecrire({ sonCoupe: true }); }
      U.majSon();
      M().ecrire({ serments: G.serments.map(s => s.id) });
      descente();
    });
    r.appendChild(suite);
    n.appendChild(r);

    function maj() {
      const reste = cap - G.serments.length;
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
          if (signe) { G.serments.splice(G.serments.indexOf(s), 1); JJK.audio.tick(300, 0.08, 0.06); maj(); return; }
          if (G.serments.length >= cap) { JJK.fx.shake(0.15); return; }
          G.serments.push(s);
          JJK.audio.oath(); JJK.fx.invert(140); JJK.fx.flash('#b31217', 700);
          JJK.fx.shake(0.5); JJK.fx.slash('#b31217', 1); JJK.fx.ink(null, null, 0.5, '#b31217');
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
     6. LA DESCENTE
     ===================================================================== */
  const ORDRE = ['4', '4', '3', '3', '2', '2', '1', '1', 'semi-spécial', 'semi-spécial', 'spécial'];
  function gradeCible(i) { return ORDRE[Math.min(i, ORDRE.length - 1)]; }
  function courbe(i) { return 1 + i * 0.11; }

  function descente() {
    const n = U.montrer('ecran-descente');
    n.innerHTML = '';
    JJK.fx.setIntensity(0.35);
    U.murmures(true);
    if (!G.mods) assembler();
    G.corps = appliquerMaturation(G.ref, G.maturation);
    const g = JJK.forge.grade(G.corps.puissance, G.serments.length);
    G.grade = g;
    U.majBarre({ grade: g.grade, registre: 'DESCENTE ' + (G.descente + 1) + ' · ' + M().lire().morts + ' MORT(S)' });

    const missions = (C().ambiance || {}).missions || [];
    const mission = missions.length ? missions[(G.descente + Math.floor(Math.random() * missions.length)) % missions.length] : null;

    n.appendChild(el('span', 'etiquette rouge', 'Ordre de mission ' + (G.descente + 1)));
    n.appendChild(el('h1', 'titre-rituel', 'Ce qui vous <em>ouvrira</em>'));

    if (mission) {
      const m = el('div', 'ordre-mission');
      m.appendChild(el('div', 'etiquette', 'Secteur'));
      m.appendChild(el('p', 'lieu-mission', mission.lieu));
      m.appendChild(el('p', 'signalement', mission.signalement));
      if (mission.consigne) m.appendChild(el('p', 'consigne', '« ' + mission.consigne + ' »'));
      n.appendChild(m);
    }

    const info = el('p', 'discret');
    info.style.maxWidth = '64ch';
    info.textContent = (G.porteur || 'Sans nom') + ', porteur de « ' + G.tech.nom + ' ». ' + G.corps.pvMax + ' points de vie, ' +
      G.corps.attaque + " d'attaque, " + G.serments.length + ' serment(s). Maturation ' + G.maturation + '. Dossier ' + G.code + '.';
    n.appendChild(info);
    n.appendChild(el('hr', 'trait'));

    const gr = gradeCible(G.descente);
    const bes = ((C().bestiaire || {}).fleaux) || [];
    const pool = bes.filter(f => String(f.grade) === gr);
    const choix = (pool.length ? pool : bes).slice();
    for (let i = choix.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = choix[i]; choix[i] = choix[j]; choix[j] = t; }
    let trois = choix.slice(0, 3);
    if (!trois.length) trois = [{ id: 'vide', nom: "Quelque chose qui n'a pas de nom", grade: gr, apparence: '', origine: '', replique: '…' }];

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
      c.appendChild(el('h4', '', f.nom));
      const sg = el('div', 'etiquette' + (estRevenant ? ' or' : ''));
      sg.textContent = 'Grade ' + (f.grade || '?') + (estRevenant ? ' · revenant' : '');
      c.appendChild(sg);
      if (f.apparence) { const p2 = el('p', 'clause'); p2.style.marginTop = '10px'; p2.textContent = f.apparence; c.appendChild(p2); }
      if (f.origine) { const p3 = el('p', 'discret'); p3.textContent = 'Né de : ' + f.origine; c.appendChild(p3); }
      c.addEventListener('click', async () => {
        JJK.audio.tick(400, 0.06, 0.08);
        /* on abaisse le Voile sur le secteur : dehors, personne ne verra rien */
        await JJK.fx.voile({
          texte: amb('voile', "Le Voile tombe sur le secteur. Dehors, la rue continue sans savoir."),
          tenue: 820,
          pendant: () => JJK.duel.lancer(f, { courbe: courbe(G.descente), revenant: estRevenant }),
        });
      });
      return c;
    }
  }

  /* =====================================================================
     7. LE REGISTRE
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
      p.textContent = "Aucune perte enregistrée. Le registre attend, comme une page réglée.";
      n.appendChild(p);
    } else {
      const l = el('div');
      l.style.marginTop = '24px';
      r.epitaphes.forEach(e => {
        const t = el('div', 'tombe');
        t.appendChild(el('div', 'nom', (e.nom || 'sans nom') + ' — « ' + (e.technique || '?') + ' »'));
        const d = el('div', 'det');
        d.textContent = 'Tombé au tour ' + (e.tour || '?') + ' · ' + (e.tueur || 'inconnu') +
          ' · grade ' + (e.grade || '?') + ' · ' + (e.serments || []).length + ' serment(s)' +
          (e.dossier ? ' · dossier ' + e.dossier : '');
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
    rr.appendChild(U.bouton('Ouvrir un nouveau dossier', 'fantome', () => { reinit(); seuil(); }));
    rr.appendChild(U.bouton('Brûler le registre', 'fantome', () => {
      if (!confirm("Effacer définitivement toutes les pertes, tous les titres, toute la mémoire ? Cela ne se défait pas.")) return;
      M().effacer(); JJK.fx.inkClear(); JJK.fx.flash('#fff', 900); reinit(); seuil();
    }));
    n.appendChild(rr);
  }

  function reinit() {
    G.tech = null; G.ref = null; G.corps = null; G.mods = null; G.declaration = null;
    G.poids = null; G.archetype = 'seuil'; G.code = null;
    G.serments = []; G.reponsesExamen = []; G.maturation = 0; G.descente = 0;
    G.catalogue = [];
    JJK.fx.setDead(0);
  }

  JJK.ecrans = {
    seuil, declaration, examen, revelation, serments, descente, registre, consultation,
    reinit, assembler, appliquerMaturation, capSerments, gradeCible, courbe, lienDe, G,
  };
})(window);
