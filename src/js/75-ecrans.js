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
    tech: null, ref: null, corps: null, mods: null, variante: 0,
    serments: [], maturation: 0, descente: 0, grade: null,
    catalogue: [], reponsesExamen: [],
  };
  JJK.jeu = G;

  function M() { return JJK.memoire; }

  /* Un générateur doit pouvoir tout retirer d'un coup : déclaration
     entière, poids du réceptacle, archétype et variante. */
  function declarationAuHasard() {
    const d = {};
    T().AXES.forEach(a => { d[a.id] = a.tags[Math.floor(Math.random() * a.tags.length)]; });
    return d;
  }
  function poidsAuHasard() {
    const p = { vigueur: 0, flux: 0, tranchant: 0, lucidite: 0, inversion: 0 };
    for (let i = 0; i < 8; i++) {
      const k = T().AXES_CORPS[Math.floor(Math.random() * 5)];
      p[k] = Math.min(8, p[k] + 1);
    }
    return p;
  }
  function toutRetirer() {
    G.declaration = declarationAuHasard();
    G.poids = poidsAuHasard();
    G.archetype = T().ARCH_LISTE[Math.floor(Math.random() * T().ARCH_LISTE.length)];
    G.variante = Math.floor(Math.random() * T().VARIANTES);
    assembler();
  }
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

  /* Repli écrit à la main pour la manifestation, tant que le corpus ne la
     porte pas : sans lui, la onzième rubrique n'était jamais posée et
     retombait en silence sur « directe ». */
  const RUBRIQUE_MANIFESTATION = {
    axe: 'manifestation', numero: 11, intitule: 'Manifestation déclarée',
    question: "Par quoi votre loi passe-t-elle pour atteindre ce qu'elle vise ?",
    precision: "Une loi doit sortir de vous par quelque chose. Nous consignons par quoi, parce que c'est par là qu'on vous prendra.",
    reponses: [
      { tag: 'directe', texte: "Par moi. Elle sort de mon corps et frappe, sans rien entre nous.",
        consequence: "Application directe. Rien ne s'interpose, donc rien ne peut vous être retiré — et rien ne vous couvre." },
      { tag: 'familier', texte: "Par des choses que j'ai soumises et que j'envoie devant moi.",
        consequence: "式神. Vous les avez battus avant de les diriger, et ils ne reviennent pas : un 式神 détruit l'est définitivement." },
      { tag: 'objet', texte: "Par un objet chargé, que je porte sur moi en permanence.",
        consequence: "呪具. L'objet porte la charge à votre place. Notez sa description : nous aurons à l'identifier sur votre corps." },
      { tag: 'terrain', texte: "Par le lieu. Elle s'installe dans le sol et n'agit que là.",
        consequence: "Installation. Il vous faut du temps sur place, et vous ne valez rien ailleurs. Affectation aux postes fixes." },
    ],
  };

  /* Le formulaire doit poser UNE question par axe : on complète les
     manquantes plutôt que de les laisser retomber en défaut silencieux. */
  function formulaire() {
    const f = C().formulaire;
    const base = (f && Array.isArray(f.questions) && f.questions.length >= 10) ? f : FORMULAIRE_SECOURS;
    const parAxe = {};
    base.questions.forEach(q => { parAxe[q.axe] = q; });
    const manquants = T().AXES.filter(a => !parAxe[a.id]);
    if (!manquants.length) return base;
    const secours = {};
    FORMULAIRE_SECOURS.questions.forEach(q => { secours[q.axe] = q; });
    secours.manifestation = RUBRIQUE_MANIFESTATION;
    const questions = base.questions.concat(manquants.map(a => secours[a.id]).filter(Boolean));
    questions.forEach((q, i) => { q.numero = q.numero || (i + 1); });
    return { titre_formulaire: base.titre_formulaire, questions };
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
    JJK.fx.setIntensity(0.14);
    JJK.fx.setHue('#b31217', '#f2c14e');
    U.majBarre({ graine: '', grade: '', registre: '' });
    U.murmures(false);

    const reg = M().lire();

    const tete = el('div', 'entree-tete');
    tete.appendChild(el('span', 'etiquette rouge', '呪術高専 · greffe des 生得術式'));
    tete.appendChild(U.titreRituel('RITUEL'));
    tete.appendChild(el('div', 'jp faible', '呪法帳 · じゅほうちょう'));
    const pitch = el('p', 'pitch');
    pitch.textContent = "Générateur de techniques innées. On n'attribue rien : on enregistre ce qui existe déjà, on lui donne un nom, un grade, une faille et un territoire.";
    tete.appendChild(pitch);
    n.appendChild(tete);

    /* le nom : facultatif, il ne détermine rien */
    const boite = el('div', 'champ-nom');
    boite.appendChild(el('span', 'etiquette', '受肉体 · nom porté (facultatif)'));
    const champ = el('input', 'champ');
    champ.type = 'text'; champ.maxLength = 32;
    champ.placeholder = 'à inscrire au dossier';
    champ.autocomplete = 'off'; champ.spellcheck = false;
    boite.appendChild(champ);
    const alerte = el('p', 'discret sang');
    alerte.style.cssText = 'margin-top:8px;min-height:1.3em;font-style:italic';
    boite.appendChild(alerte);
    n.appendChild(boite);

    const nom = () => champ.value.trim() || 'sans nom';

    const portes = el('div', 'portes');
    portes.appendChild(porte({
      kanji: '抽選', titre: 'Tirage immédiat', accent: true,
      texte: "Le greffe remplit à votre place. Une fiche complète en une seconde, que vous pourrez ensuite corriger ligne à ligne.",
      pied: 'Recommandé pour voir ce que ça donne',
      action: () => tirageImmediat(nom()),
    }));
    portes.appendChild(porte({
      kanji: '術式開示', titre: 'Ouvrir une procédure',
      texte: "Onze rubriques déclarées une par une, puis huit questions sur vous. Vous choisissez tout, y compris la faille par laquelle on pourra vous détruire.",
      pied: 'Environ cinq minutes',
      action: () => { JJK.audio.unlock(); G.porteur = nom(); enregistrerNom(); declaration(); },
    }));
    portes.appendChild(porte({
      kanji: '登録票', titre: 'Reprendre un dossier',
      texte: "Un numéro de dossier ressort la fiche exacte qu'il désigne, sceau compris. Les codes R1 restent lisibles.",
      pied: (reg.fiches || []).length ? (reg.fiches.length + ' fiche(s) au registre') : 'Ou coller un code reçu',
      action: reprendre,
    }));
    n.appendChild(portes);

    const bas = U.rangee();
    bas.style.marginTop = '18px';
    if ((reg.fiches || []).length || reg.epitaphes.length) {
      bas.appendChild(U.bouton('呪法帳 · registre', 'fantome', registre));
    }
    n.appendChild(bas);

    champ.addEventListener('input', () => {
      const g2 = JJK.core.normalizeSeed(champ.value);
      const morts = reg.epitaphes.filter(e => JJK.core.normalizeSeed(e.nom || '') === g2);
      if (g2 && morts.length) {
        alerte.textContent = 'Ce nom figure déjà au registre des pertes — porteur de « ' + morts[0].technique + ' ».';
        JJK.fx.shake(0.06);
      } else alerte.textContent = '';
    });
    champ.addEventListener('keydown', e => { if (e.key === 'Enter') tirageImmediat(nom()); });
    setTimeout(() => champ.focus(), 260);

    function porte(o) {
      const c = el('button', 'porte' + (o.accent ? ' porte-accent' : ''));
      c.appendChild(el('div', 'porte-kanji jp', o.kanji));
      c.appendChild(el('h3', '', o.titre));
      c.appendChild(el('p', '', o.texte));
      if (o.pied) c.appendChild(el('span', 'porte-pied', o.pied));
      c.addEventListener('click', () => { JJK.audio.tick(720, 0.03, 0.06); o.action(); });
      return c;
    }

    function enregistrerNom() {
      M().ecrire({ graine: JJK.core.normalizeSeed(G.porteur) });
      U.majBarre({ graine: JJK.core.normalizeSeed(G.porteur) });
    }

    async function tirageImmediat(v) {
      JJK.audio.unlock();
      G.porteur = v;
      enregistrerNom();
      toutRetirer();
      JJK.audio.oath();
      JJK.fx.flash('#b31217', 640);
      JJK.fx.shake(0.35);
      await wait(240);
      revelation({ rapide: true });
    }

    function reprendre() {
      const code = prompt("Numéro de dossier (par exemple R2-K3F2-01E83-5) :", '');
      if (!code) return;
      const lu = T().lireDossierCode(code);
      if (!lu) { alerte.textContent = "Ce numéro ne correspond à aucun dossier."; JJK.fx.shake(0.2); return; }
      G.porteur = nom();
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
    const questions = f.questions.slice().sort((a, b) => (a.numero || 0) - (b.numero || 0)).slice(0, T().AXES.length);
    G.declaration = {};

    n.appendChild(el('span', 'etiquette rouge', '術式開示調書 · procès-verbal d\'ouverture de technique'));
    const preface = el('p', 'discret');
    preface.style.cssText = 'max-width:66ch;margin:10px 0 4px';
    preface.textContent = "Énoncer sa technique devant témoin est déjà un serment : vous perdez le secret, et le réel vous rend en efficacité ce que vous cédez en surprise. Le superviseur adjoint tient l'écriture. Il n'a pas de technique ; c'est pour cela qu'on le laisse écouter.";
    n.appendChild(preface);
    const grille = el('div', 'formulaire');

    const gauche = el('div');
    const droite = el('aside', 'feuille');
    const enTete = el('span', 'etiquette');
    enTete.textContent = 'Dossier en cours · 0 / ' + questions.length;
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

    n.appendChild(el('span', 'etiquette rouge', '受肉体検査 · examen du réceptacle'));
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
    G.tech = JJK.forge.forgeDepuisDeclaration(G.declaration, G.variante || 0);
    G.ref = JJK.forge.forgeReceptacle(G.declaration, G.poids, G.tech.jubaku);
    G.corps = appliquerMaturation(G.ref, G.maturation);
    G.mods = JJK.serments.agreger(G.serments, G.ref.profil.mod);
    G.code = T().dossierCode(G.declaration, G.poids, G.archetype, G.variante || 0);
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
  async function revelation(opts) {
    const o = opts || {};
    U.calmer();
    const n = U.montrer('ecran-revelation');
    n.innerHTML = '';
    const t = G.tech;
    JJK.fx.setHue(t.couleur, '#f2c14e');
    JJK.fx.setIntensity(0.45);

    if (!o.rapide) {
      const intro = el('div');
      n.appendChild(intro);
      await U.dire(intro, 'Dix rubriques, huit réponses. Le dossier est complet.', { apres: 280 });
      await U.dire(intro, amb('verdicts_conseil', "Les instances supérieures ont lu votre déclaration et lui ont donné un nom."), { forte: true, apres: 420 });
      JJK.audio.oath();
      JJK.fx.flash('#b31217', 900);
      JJK.fx.invert(90);
      JJK.fx.shake(0.6);
      JJK.fx.pulse(null, null, null, t.couleur, 1.6);
      await wait(520);
      intro.remove();
    } else {
      JJK.audio.tick(520, 0.05, 0.06);
      JJK.fx.pulse(null, null, null, t.couleur, 0.9);
    }

    const g = JJK.forge.grade(G.corps.puissance, G.serments.length);
    G.grade = g;
    U.majBarre({ grade: g.grade });
    U.titreFurtif(t.nom + ' — 呪法帳', 6000);
    /* toute fiche produite entre au registre : c'est une archive, pas un jeu */
    M().archiver({ code: G.code, nom: t.nom, nomJp: t.nomJp, grade: g.grade, jubaku: !!t.jubaku });

    const dossier = el('div', 'dossier');
    const gauche = corpsDeFiche(t, G.corps, { notes: true, modifiable: true });

    /* le numéro de dossier, et de quoi le faire circuler */
    const part = el('div', 'bloc');
    part.appendChild(bandeau('Numéro de dossier', '整理番号'));
    const lien = el('p', 'mono code-fiche');
    lien.textContent = G.code;
    part.appendChild(lien);
    const sous = el('p', 'discret');
    sous.textContent = "Ce numéro contient la déclaration entière, la variante tirée et les poids du réceptacle. Donnez-le : le service ressortira exactement cette fiche.";
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

    /* colonne de droite : sceau, grade, et les commandes du générateur */
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

    const outils = el('div', 'outils-generateur');
    outils.appendChild(el('span', 'etiquette', '抽選 · tirage'));
    const varLigne = el('p', 'discret');
    varLigne.innerHTML = 'Variante <b class="mono or">' + (t.variante + 1) + '</b> sur ' + T().VARIANTES +
      '. La déclaration fixe les familles ; elle ne fixe pas tout.';
    outils.appendChild(varLigne);
    outils.appendChild(U.bouton('Tout retirer', 'rouge large', () => {
      toutRetirer();
      revelation({ rapide: true });
    }));
    outils.appendChild(U.bouton('Changer de variante', 'large', () => {
      G.variante = T().codeVariante((G.variante || 0) + 1);
      assembler();
      revelation({ rapide: true });
    }));
    outils.appendChild(U.bouton('Voir six variantes', 'large', galerie));
    outils.appendChild(U.bouton('Modifier une rubrique', 'large', rubriques));
    const aide = el('p', 'discret raccourcis');
    aide.innerHTML = '<b>R</b> tout retirer · <b>V</b> variante · <b>G</b> galerie';
    outils.appendChild(aide);
    droite.appendChild(outils);
    dossier.appendChild(droite);

    n.appendChild(dossier);
    requestAnimationFrame(() => {
      JJK.fx.sigil(cvs, t.code, { size: cvs.clientWidth || 320, accent: t.couleur });
      droite.insertBefore(sommaire(gauche), outils);
    });

    const r = U.rangee();
    r.appendChild(U.bouton('Prêter serment et descendre', '', serments));
    r.appendChild(U.bouton('Descendre sans rien signer', 'fantome', () => { G.serments = []; assembler(); descente(); }));
    r.appendChild(U.bouton('Refaire une déclaration', 'fantome', declaration));
    n.appendChild(r);
  }

  /* =====================================================================
     GALERIE — six 生得術式 issus de la même déclaration
     ===================================================================== */
  function galerie() {
    const n = U.montrer('ecran-galerie');
    n.innerHTML = '';
    n.appendChild(el('span', 'etiquette rouge', '生得術式 · tirages issus de votre déclaration'));
    n.appendChild(U.titreRituel('Six lois <em>possibles</em>'));
    const p = el('p', 'discret');
    p.style.maxWidth = '66ch';
    p.textContent = "Votre déclaration a fixé les familles : le substrat, l'archétype de la loi, la clause, le territoire, le siège. À l'intérieur de ces limites, le réel a encore le choix. Voici six porteurs qui auraient rempli le même formulaire que vous.";
    n.appendChild(p);

    const grille = el('div', 'galerie');
    const base = G.variante || 0;
    for (let k = 0; k < 6; k++) {
      const v = T().codeVariante(base + k);
      const t = JJK.forge.forgeDepuisDeclaration(G.declaration, v);
      const c = el('div', 'carte-variante' + (v === base ? ' actuelle' : ''));
      const cv = el('canvas', 'sceau-mini');
      c.appendChild(cv);
      const h = el('h4', '', t.nom);
      c.appendChild(h);
      c.appendChild(el('div', 'jp faible', t.nomJp + ' · ' + t.romaji));
      const l = el('p', 'clause');
      l.textContent = t.loi.enonce || t.loi.nom;
      c.appendChild(l);
      const meta = el('div', 'meta-variante');
      meta.appendChild(el('span', '', t.essence.nom));
      if (t.jubaku) { const b = el('span', 'or', '天与呪縛'); meta.appendChild(b); }
      if (v === base) meta.appendChild(el('span', 'sang', 'tirage actuel'));
      c.appendChild(meta);
      c.addEventListener('click', () => {
        G.variante = v; assembler(); JJK.audio.tick(620, 0.04, 0.07);
        revelation({ rapide: true });
      });
      grille.appendChild(c);
      requestAnimationFrame(() => JJK.fx.sigil(cv, t.code, { size: 150, accent: t.couleur }));
    }
    n.appendChild(grille);
    const r = U.rangee();
    r.appendChild(U.bouton('Revenir à la fiche', 'fantome', () => revelation({ rapide: true })));
    r.appendChild(U.bouton('Six tirages de plus', '', () => { G.variante = T().codeVariante((G.variante || 0) + 6); galerie(); }));
    n.appendChild(r);
  }

  /* =====================================================================
     RUBRIQUES — revenir sur une seule ligne du formulaire
     ===================================================================== */
  function rubriques() {
    const n = U.montrer('ecran-rubriques');
    n.innerHTML = '';
    n.appendChild(el('span', 'etiquette rouge', '申告 · déclaration enregistrée'));
    n.appendChild(U.titreRituel('Corriger une <em>rubrique</em>'));
    const p = el('p', 'discret');
    p.style.maxWidth = '66ch';
    p.textContent = "Le service accepte les corrections. Chaque ligne modifiée reforge la technique : c'est la même procédure, pas le même dossier.";
    n.appendChild(p);

    const f = formulaire();
    const liste = el('div', 'liste-rubriques');
    f.questions.slice().sort((a, b) => (a.numero || 0) - (b.numero || 0)).forEach(q => {
      const tag = G.declaration[q.axe];
      const rep = (q.reponses || []).find(x => x.tag === tag);
      const c = el('button', 'rubrique-ligne');
      c.appendChild(el('b', '', q.intitule || q.axe));
      c.appendChild(el('span', 'valeur', rep ? rep.texte : String(tag)));
      const eff = T().effet(q.axe, tag);
      if (eff && eff.note) c.appendChild(el('span', 'effet', eff.note));
      c.addEventListener('click', () => corriger(q));
      liste.appendChild(c);
    });
    n.appendChild(liste);
    const r = U.rangee();
    r.appendChild(U.bouton('Revenir à la fiche', 'fantome', () => revelation({ rapide: true })));
    n.appendChild(r);
  }

  async function corriger(q) {
    const n = U.montrer('ecran-rubriques');
    n.innerHTML = '';
    n.appendChild(el('span', 'etiquette rouge', 'Correction · ' + (q.intitule || q.axe)));
    const h = el('h2', 'question-texte');
    n.appendChild(h);
    await JJK.fx.type(h, q.question, { speed: 14 });
    if (q.precision) {
      const p = el('p', 'precision');
      n.appendChild(p);
      await JJK.fx.type(p, q.precision, { speed: 10, sound: false });
    }
    const liste = el('div', 'reponses');
    n.appendChild(liste);
    const choix = await choisirDansListe(liste, q.reponses, 'consequence');
    const tag = T().tagValide(q.axe, choix.tag) ? choix.tag : T().AXE[q.axe].tags[0];
    G.declaration[q.axe] = tag;
    assembler();
    await wait(420);
    revelation({ rapide: true });
  }

  /* =====================================================================
     LA FICHE — c'est le produit. Tout le reste sert à l'obtenir.
     ===================================================================== */
  /* Les intitulés viennent du lexique du corpus quand il est présent ;
     la liste ci-dessous reste le repli. */
  function sectionsCanon() {
    const l = ((C().lexique || {}).libelles || {}).sections;
    if (!Array.isArray(l) || !l.length) return null;
    const m = {};
    l.forEach(x => { m[x.cle] = x; });
    return m;
  }
  const SECTIONS_REPLI = [
    { cle: 'loi',      libelle: 'Énoncé de la technique', kanji: '生得術式' },
    { cle: 'constat',  libelle: 'Constat', kanji: '所見' },
    { cle: 'junten',   libelle: 'Application directe', kanji: '術式順転' },
    { cle: 'vecteur',  libelle: 'Clause d\'énonciation', kanji: '発動条件' },
    { cle: 'faille',   libelle: 'Faille structurelle', kanji: '弱点' },
    { cle: 'hanten',   libelle: 'Technique inversée', kanji: '反転術式' },
    { cle: 'maximum',  libelle: 'Technique maximale', kanji: '術式最大' },
    { cle: 'kakucho',  libelle: 'Extension de technique', kanji: '術式拡張' },
    { cle: 'kanri',    libelle: 'Territoire simplifié', kanji: '簡易領域' },
    { cle: 'ryoiki',   libelle: 'Extension du territoire', kanji: '領域展開' },
    { cle: 'kokusen',  libelle: 'Aptitude à l\'Éclair Noir', kanji: '黒閃' },
    { cle: 'jubaku',   libelle: 'Restriction céleste', kanji: '天与呪縛' },
  ];

  const SECTIONS = SECTIONS_REPLI;
  function sec(cle, i, suffixe) {
    const m = sectionsCanon();
    const c = m && m[cle];
    const base = SECTIONS_REPLI[i] || { libelle: cle, kanji: '' };
    return {
      libelle: ((c && c.libelle) || base.libelle) + (suffixe || ''),
      kanji: (c && c.kanji) || base.kanji,
    };
  }

  function bandeau(libelle, kanji, rouge) {
    const b = el('div', 'bandeau-section');
    b.appendChild(el('span', 'etiquette' + (rouge ? ' rouge' : ''), libelle));
    if (kanji) b.appendChild(el('span', 'kanji-section jp', kanji));
    return b;
  }

  let compteurSection = 0;
  function section(libelle, kanji, contenu, cls) {
    const b = el('div', 'bloc ' + (cls || ''));
    b.id = 'sec-' + (++compteurSection);
    b.dataset.titre = libelle;
    b.dataset.kanji = kanji || '';
    b.appendChild(bandeau(libelle, kanji, cls === 'loi'));
    if (typeof contenu === 'string') {
      const p = el('p', cls === 'loi' ? 'enonce' : '');
      p.textContent = contenu;
      b.appendChild(p);
    } else if (contenu) b.appendChild(contenu);
    return b;
  }

  /* Construit la colonne de gauche d'une fiche. Utilisée à la nomination
     comme à la consultation : une fiche est une fiche. */
  /* Les onze rubriques déclarées, en tête de fiche : on voit d'un coup
     ce qu'on a signé, et un clic rouvre la ligne qu'on veut changer. */
  function chipsDeclaration(decl, modifiable) {
    const f = formulaire();
    const row = el('div', 'chips-declaration');
    T().AXES.forEach(a => {
      const q = f.questions.find(x => x.axe === a.id);
      const tag = decl[a.id];
      const rep = q && (q.reponses || []).find(x => x.tag === tag);
      const c = el(modifiable ? 'button' : 'span', 'chip' + (modifiable ? ' chip-actif' : ''));
      c.appendChild(el('b', '', (q && q.intitule) || a.id));
      c.appendChild(el('span', '', String(tag).replace(/_/g, ' ')));
      c.title = rep ? rep.texte : String(tag);
      if (modifiable && q) c.addEventListener('click', () => corriger(q));
      row.appendChild(c);
    });
    return row;
  }

  function corpsDeFiche(t, corps, opts) {
    const o = opts || {};
    compteurSection = 0;
    const g = el('div');
    g.appendChild(el('span', 'etiquette rouge', '生得術式 · ' + (t.essence.emotion_source || 'origine non établie')));
    g.appendChild(el('h1', 'nom-technique', t.nom));
    const jl = el('div', 'nom-jp');
    jl.textContent = t.nomJp + ' · ' + t.romaji;
    g.appendChild(jl);
    if (t.declaration) g.appendChild(chipsDeclaration(t.declaration, o.modifiable !== false));
    g.appendChild(el('hr', 'trait'));

    const s0 = sec('loi', 0); g.appendChild(section(s0.libelle, s0.kanji, t.loi.enonce || t.loi.nom, 'loi'));
    const desc = JJK.forge.dossier(t);
    const s1 = sec('constat', 1); if (desc) g.appendChild(section(s1.libelle, s1.kanji, desc));
    const s2 = sec('junten', 2); if (t.junten) g.appendChild(section(s2.libelle, s2.kanji, t.junten));
    if (t.vecteur && t.vecteur.condition) {
      const s3 = sec('vecteur', 3, ' — ' + t.vecteur.nom);
      g.appendChild(section(s3.libelle, s3.kanji, t.vecteur.condition));
    }
    if (!t.tenu.portee) {
      const w = section('Observation du superviseur adjoint', '補助監督所見', "La portée déclarée et la clause d'énonciation ne se rencontrent pas dans le réel. J'ai retenu la clause : c'est elle qui décide où la loi s'applique.");
      w.querySelector('p').style.color = 'var(--sang-vif)';
      g.appendChild(w);
    }
    const s4 = sec('faille', 4); if (t.loi.limite) g.appendChild(section(s4.libelle, s4.kanji, t.loi.limite));
    const s5 = sec('hanten', 5); if (t.hanten) g.appendChild(section(s5.libelle, s5.kanji, t.hanten));
    const s6 = sec('maximum', 6); if (t.maximum) g.appendChild(section(s6.libelle, s6.kanji, t.maximum));

    if (t.kakucho) {
      const d = el('div');
      const h = el('p', 'sous-nom');
      h.textContent = t.kakucho.nom;
      d.appendChild(h);
      if (t.kakucho.kanji) d.appendChild(el('div', 'jp faible', t.kakucho.kanji + (t.kakucho.romaji ? ' · ' + t.kakucho.romaji : '')));
      if (t.kakucho.principe) { const p = el('p'); p.style.marginTop = '10px'; p.textContent = t.kakucho.principe; d.appendChild(p); }
      if (t.kakucho.usage) { const p = el('p', 'discret'); p.textContent = t.kakucho.usage; d.appendChild(p); }
      if (t.kakucho.cout) { const p = el('p', 'cout-ligne'); p.textContent = '↳ ' + t.kakucho.cout; d.appendChild(p); }
      const s7 = sec('kakucho', 7); g.appendChild(section(s7.libelle, s7.kanji, d));
    }

    if (t.kanri) {
      const d = el('div');
      const h = el('p', 'sous-nom');
      h.textContent = t.kanri.nom;
      d.appendChild(h);
      if (t.kanri.kanji) d.appendChild(el('div', 'jp faible', t.kanri.kanji + (t.kanri.romaji ? ' · ' + t.kanri.romaji : '')));
      if (t.kanri.forme) { const p = el('p'); p.style.marginTop = '10px'; p.textContent = t.kanri.forme; d.appendChild(p); }
      if (t.kanri.effet) { const p = el('p', 'discret'); p.textContent = t.kanri.effet; d.appendChild(p); }
      if (t.kanri.limite) { const p = el('p', 'cout-ligne'); p.textContent = '↳ ' + t.kanri.limite; d.appendChild(p); }
      const s8 = sec('kanri', 8); g.appendChild(section(s8.libelle, s8.kanji, d));
    }

    if (t.domaine) {
      const d = el('div');
      const h = el('p', 'sous-nom grand');
      h.textContent = t.domaine.nom_fr;
      d.appendChild(h);
      d.appendChild(el('div', 'jp faible', (t.domaine.nom_jp || '') + ' · ' + (t.domaine.romaji || '')));
      if (t.domaine.paysage) { const p = el('p'); p.style.marginTop = '10px'; p.textContent = t.domaine.paysage; d.appendChild(p); }
      if (t.domaine.incantation) {
        const inc = el('div', 'incantation-fiche');
        String(t.domaine.incantation).replace(/([.;])\s+/g, '$1\n').split(/\n|\s*\/\s*/).filter(Boolean)
          .forEach(v => inc.appendChild(el('p', '', v.trim())));
        d.appendChild(inc);
      }
      if (t.domaine.effet_garanti) {
        const e2 = el('p', 'serif-italique');
        e2.style.cssText = 'margin-top:12px;color:var(--sang-vif)';
        e2.textContent = '↯ Coup au but — ' + t.domaine.effet_garanti;
        d.appendChild(e2);
      }
      if (t.domaine.faille) { const p = el('p', 'cout-ligne'); p.textContent = '↳ ' + t.domaine.faille; d.appendChild(p); }
      const s9 = sec('ryoiki', 9); g.appendChild(section(s9.libelle, s9.kanji, d));
    }

    if (t.kokusen) {
      const d = el('div');
      const h = el('p', 'sous-nom');
      h.textContent = t.kokusen.aptitude;
      d.appendChild(h);
      if (t.kokusen.description) { const p = el('p'); p.style.marginTop = '8px'; p.textContent = t.kokusen.description; d.appendChild(p); }
      const s10 = sec('kokusen', 10); g.appendChild(section(s10.libelle, s10.kanji, d));
    }

    if (t.jubaku) {
      const d = el('div', 'jubaku');
      const h = el('p', 'sous-nom or');
      h.textContent = t.jubaku.nom;
      d.appendChild(h);
      d.appendChild(el('div', 'jp faible', (t.jubaku.kanji || '天与呪縛') + ' · ' + (t.jubaku.romaji || "ten'yo-jubaku")));
      const pv = el('p', 'privation');
      pv.textContent = t.jubaku.privation;
      d.appendChild(pv);
      const cp = el('p', 'contrepartie');
      cp.textContent = t.jubaku.contrepartie;
      d.appendChild(cp);
      if (t.jubaku.constat) { const p = el('p', 'cout-ligne'); p.textContent = '↳ ' + t.jubaku.constat; d.appendChild(p); }
      const mec = el('div', 'echange');
      mec.style.marginTop = '12px';
      mec.appendChild(el('span', 'perte', t.jubaku.perte));
      mec.appendChild(el('span', 'gain', t.jubaku.gain));
      d.appendChild(mec);
      const s11 = sec('jubaku', 11); g.appendChild(section(s11.libelle, s11.kanji, d));
    }

    if (t.contre) {
      const w = section('Neutralisation connue', '対策', t.contre);
      w.querySelector('p').classList.add('discret');
      g.appendChild(w);
    }
    if (t.affectation) {
      const d = el('div');
      const h = el('p', 'sous-nom');
      h.textContent = t.affectation.intitule;
      d.appendChild(h);
      if (t.affectation.motif) { const p = el('p', 'discret'); p.style.marginTop = '6px'; p.textContent = t.affectation.motif; d.appendChild(p); }
      g.appendChild(section('Affectation — 上層部', '任務配属', d));
    }

    if (o.notes && corps && corps.profil) {
      const conseq = el('div', 'bloc');
      conseq.appendChild(bandeau('Conséquences de votre déclaration', '申告', true));
      const ul = el('div', 'notes-formulaire');
      corps.profil.notes.forEach(x => {
        const li = el('div', 'note-formulaire');
        li.appendChild(el('b', '', x.axe));
        li.appendChild(el('span', '', x.note));
        ul.appendChild(li);
      });
      conseq.appendChild(ul);
      g.appendChild(conseq);
    }

    if (corps) {
      const st = corps.stats;
      g.appendChild(U.stats([
        [st.vigueur, 'Vigueur'], [st.flux, 'Flux'], [st.tranchant, 'Tranchant'],
        [st.lucidite, 'Lucidité'], [st.inversion, 'Inversion'],
      ]));
      if (o.chiffres !== false) {
        g.appendChild(U.stats([
          [corps.pvMax, 'Points de vie'], [corps.enMax, '呪力 max'],
          [corps.attaque, 'Attaque'], [Math.round(corps.crit * 100) + '%', 'Critique'],
          [corps.puissance, 'Puissance'],
        ]));
      }
    }
    return g;
  }

  /* La fiche fait plusieurs milliers de pixels : elle se consulte par
     rubriques, elle ne se déroule pas au jugé. */
  function sommaire(colonne) {
    const s2 = el('nav', 'sommaire');
    s2.appendChild(el('span', 'etiquette', '目次 · sommaire'));
    const l = el('div', 'sommaire-liste');
    Array.prototype.forEach.call(colonne.querySelectorAll('.bloc[data-titre]'), b => {
      const a = el('button', 'sommaire-ligne');
      a.appendChild(el('span', 'sk jp', b.dataset.kanji || '—'));
      a.appendChild(el('span', 'sl', b.dataset.titre));
      a.addEventListener('click', () => {
        b.scrollIntoView({ behavior: 'smooth', block: 'start' });
        b.classList.remove('vise'); void b.offsetWidth; b.classList.add('vise');
        JJK.audio.tick(900, 0.02, 0.03);
      });
      l.appendChild(a);
    });
    s2.appendChild(l);
    return s2;
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
    const tech = JJK.forge.forgeDepuisDeclaration(lu.declaration, lu.variante || 0);
    const ref = JJK.forge.forgeReceptacle(lu.declaration, lu.poids, tech.jubaku);
    JJK.fx.setHue(tech.couleur, '#f2c14e');
    JJK.fx.setIntensity(0.4);

    const flux = el('div');
    n.appendChild(flux);
    await U.dire(flux, "On vous a communiqué un numéro de dossier.", { apres: 300 });
    await U.dire(flux, "Le service ne fabrique rien. Il ressort la fiche.", { forte: true, apres: 340 });
    JJK.audio.oath();
    JJK.fx.flash('#b31217', 800);
    await wait(380);
    flux.remove();

    const d = el('div', 'dossier');
    const gauche = corpsDeFiche(tech, ref, { notes: false, chiffres: false, modifiable: false });
    const decl = el('div', 'bloc');
    decl.appendChild(bandeau('Déclaration enregistrée', '申告'));
    const dl = el('div', 'notes-formulaire');
    const f = formulaire();
    T().AXES.forEach(a => {
      const q = f.questions.find(x => x.axe === a.id);
      const rep = q && (q.reponses || []).find(x => x.tag === lu.declaration[a.id]);
      const li = el('div', 'note-formulaire');
      li.appendChild(el('b', '', (q && q.intitule) || a.id));
      li.appendChild(el('span', '', rep ? rep.texte : String(lu.declaration[a.id]).replace(/_/g, ' ')));
      dl.appendChild(li);
    });
    decl.appendChild(dl);
    gauche.appendChild(decl);
    d.appendChild(gauche);

    const dr = el('div', 'sceau-boite');
    const cvs = el('canvas', 'sceau-rot');
    cvs.style.width = '100%';
    dr.appendChild(cvs);
    const lg = el('p', 'discret centre');
    lg.style.marginTop = '14px';
    lg.textContent = 'Dossier ' + T().dossierCode(lu.declaration, lu.poids, lu.archetype, lu.variante || 0);
    dr.appendChild(lg);
    d.appendChild(dr);
    n.appendChild(d);
    requestAnimationFrame(() => JJK.fx.sigil(cvs, tech.code, { size: cvs.clientWidth || 320, accent: tech.couleur }));

    const r = U.rangee();
    r.appendChild(U.bouton('Reprendre ce dossier', 'rouge', () => {
      if (history.replaceState) history.replaceState(null, '', location.href.split('#')[0]);
      G.declaration = lu.declaration; G.poids = lu.poids; G.archetype = lu.archetype;
      G.variante = lu.variante || 0;
      if (!G.porteur) G.porteur = 'sans nom';
      assembler();
      revelation({ rapide: true });
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

    n.appendChild(el('span', 'etiquette rouge', '縛り · serments contraignants'));
    n.appendChild(U.titreRituel('Ce que vous <em>rendez</em>'));
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

    n.appendChild(el('span', 'etiquette rouge', '任務 · ordre de mission ' + (G.descente + 1)));
    n.appendChild(U.titreRituel('Ce qui vous <em>ouvrira</em>'));

    if (mission) {
      const m = el('div', 'ordre-mission');
      m.appendChild(el('div', 'etiquette', '帳 · secteur à voiler'));
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
      sg.textContent = '呪霊 · grade ' + (f.grade || '?') + (estRevenant ? ' · revenant' : '');
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
    n.appendChild(el('span', 'etiquette rouge', '呪法帳 · registre'));
    n.appendChild(U.titreRituel('Ce qui a été <em>enregistré</em>'));

    const fiches = r.fiches || [];
    if (fiches.length) {
      const bl = el('div', 'bloc');
      bl.appendChild(bandeau('生得術式 consignées', '登録簿'));
      const l2 = el('div', 'liste-fiches');
      fiches.forEach(f => {
        const c = el('button', 'fiche-archivee');
        c.appendChild(el('b', '', f.nom));
        const d2 = el('span', 'det');
        d2.textContent = (f.nomJp ? f.nomJp + ' · ' : '') + 'grade ' + (f.grade || '?') + ' · ' + f.code;
        c.appendChild(d2);
        if (f.jubaku) c.appendChild(el('span', 'marque-jubaku', '天与呪縛'));
        c.addEventListener('click', () => {
          const lu = T().lireDossierCode(f.code);
          if (lu) consultation(lu);
        });
        l2.appendChild(c);
      });
      bl.appendChild(l2);
      n.appendChild(bl);
    }

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
    G.serments = []; G.reponsesExamen = []; G.maturation = 0; G.descente = 0; G.variante = 0;
    G.catalogue = [];
    JJK.fx.setDead(0);
  }

  JJK.ecrans = {
    seuil, declaration, examen, revelation, galerie, rubriques, serments, descente, registre, consultation,
    reinit, assembler, appliquerMaturation, capSerments, gradeCible, courbe, lienDe,
    toutRetirer, declarationAuHasard, poidsAuHasard, G,
  };
})(window);
