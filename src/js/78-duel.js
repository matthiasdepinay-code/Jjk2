/* =========================================================================
   RITUEL — mise en scène du duel
   Le moteur décide. Ici, on ne fait que regarder ce qu'il a décidé,
   d'assez près pour que ça fasse quelque chose.
   ========================================================================= */
(function (root) {
  'use strict';
  const JJK = (root.JJK = root.JJK || {});
  const { el, clamp, wait, chaos } = JJK.core;
  const U = JJK.ui;

  let D = null, N = {}, verrou = false;
  function G() { return JJK.jeu; }
  function M() { return JJK.memoire; }
  function C() { return JJK.CORPUS || {}; }

  /* ---- lancement -------------------------------------------------------- */
  function lancer(fleau, opts) {
    const g = G();
    const o = opts || {};
    g.corps = JJK.ecrans.appliquerMaturation(g.ref, g.maturation);
    if (!g.mods) g.mods = JJK.serments.agreger(g.serments);

    const joueur = JJK.combat.combattantJoueur(g.tech, g.corps, g.mods, g.graine);
    const R = new JJK.core.Rng('fleau:' + (fleau.id || fleau.nom) + ':' + g.descente);
    const ennemi = JJK.combat.combattantFleau(fleau, g.ref, R, o.courbe || 1);
    if (o.revenant) {
      /* Le revenant hérite de ta loi. Il sait donc s'en servir. */
      ennemi.archetype = fleau.archetype || 'seuil';
      ennemi.domaine = g.tech.domaine;
      ennemi.profil = JJK.combat.profilDe(fleau.grade);
      ennemi.attaque = Math.round(ennemi.attaque * 1.10);
    }
    D = JJK.combat.creer({ seed: g.tech.seed, joueur, ennemi, numero: g.descente });
    D.revenant = !!o.revenant;
    D.fleau = fleau;
    M().ecrire({ descentes: M().lire().descentes + 1 });
    dessiner();
    ouverture(fleau);
  }

  async function ouverture(fleau) {
    JJK.fx.setIntensity(0.55);
    JJK.fx.setHue(D.revenant ? '#f2c14e' : (G().tech.couleur || '#b31217'), '#f2c14e');
    JJK.audio.heartbeat(true, 66);
    journal(fleau.replique ? '« ' + fleau.replique + ' »' : '…', 'important');
    if (fleau.comportement) journal(fleau.comportement, '');
    JJK.fx.shake(0.3);
    JJK.fx.pulse(null, null, null, '#b31217', 1.1);
    if (D.revenant) {
      U.titreFurtif('IL PORTE TON NOM', 5000);
      JJK.fx.invert(180);
      JJK.audio.whisper(1.4);
    }
  }

  /* ---- rendu ------------------------------------------------------------ */
  function dessiner() {
    const n = U.montrer('ecran-duel');
    n.innerHTML = '';
    const g = G();

    const arene = el('div', 'arene');
    const cb = el('div', 'combattants');

    N.joueur = fiche(D.joueur, false);
    N.tour = el('div', 'versus centre');
    N.ennemi = fiche(D.ennemi, true);
    cb.appendChild(N.joueur.boite); cb.appendChild(N.tour); cb.appendChild(N.ennemi.boite);
    arene.appendChild(cb);

    const bas = el('div', 'duel-bas');
    N.actions = el('div', 'actions');
    bas.appendChild(N.actions);

    const colJ = el('div');
    N.journal = el('div', 'journal');
    N.journal.appendChild(el('span', 'etiquette', 'Compte rendu'));
    colJ.appendChild(N.journal);
    bas.appendChild(colJ);
    arene.appendChild(bas);

    if (g.mods.masqueJournal) {
      JJK.fx.mutilate(N.journal, 'page blanche — serment');
      N.journal.style.minHeight = '54px';
    }

    n.appendChild(arene);
    majTout();
  }

  function fiche(c, ennemi) {
    const b = el('div', 'fiche' + (ennemi ? ' ennemi' : ''));
    const nom = el('div', 'nom', c.nom);
    const sous = el('div', 'sous', c.sousTitre || '');
    b.appendChild(nom); b.appendChild(sous);

    const pv = el('div', 'barre pv');
    const fant = el('i', 'fantomatique'); fant.style.position = 'absolute';
    const rempl = el('i');
    pv.appendChild(fant); pv.appendChild(rempl);
    b.appendChild(pv);
    const ch = el('div', 'chiffres');
    const gaucheN = el('span'), droiteN = el('span');
    ch.appendChild(gaucheN); ch.appendChild(droiteN);
    b.appendChild(ch);

    const en = el('div', 'barre energie');
    const enR = el('i');
    en.appendChild(enR);
    b.appendChild(en);
    const ch2 = el('div', 'chiffres');
    const e1 = el('span'), e2 = el('span');
    ch2.appendChild(e1); ch2.appendChild(e2);
    b.appendChild(ch2);

    const st = el('div', 'statuts');
    b.appendChild(st);

    if (ennemi && D.fleau && D.fleau.replique) {
      b.appendChild(el('p', 'replique', '« ' + D.fleau.replique + ' »'));
    }

    const o = { boite: b, nom, sous, pv, rempl, fant, gaucheN, droiteN, enR, e1, e2, st };
    if (ennemi && G().mods.masqueVieEnnemi) {
      const cache = el('div');
      cache.appendChild(pv); cache.appendChild(ch);
      b.insertBefore(cache, en);
      JJK.fx.mutilate(cache, 'œil fermé — serment');
      o.cache = cache;
    }
    return o;
  }

  function majFiche(o, c, ennemi) {
    const p = clamp(c.pv / c.pvMax, 0, 1);
    o.rempl.style.width = (p * 100) + '%';
    setTimeout(() => { o.fant.style.width = (p * 100) + '%'; }, 30);
    o.gaucheN.textContent = ennemi && G().mods.masqueVieEnnemi ? '— / —' : (Math.max(0, c.pv) + ' / ' + c.pvMax);
    o.droiteN.textContent = 'TENSION ' + Math.round(c.tension) + (c.tension >= 100 ? ' ↯' : '');
    o.enR.style.width = clamp(c.en / c.enMax, 0, 1) * 100 + '%';
    o.e1.textContent = 'ÉNERGIE ' + c.en + ' / ' + c.enMax;
    o.e2.textContent = c.domaineTours > 0 ? 'TERRITOIRE ' + c.domaineTours : '';
    o.st.innerHTML = '';
    c.statuts.forEach(s => {
      const t = el('span', 'puce ' + (s.type === 'bon' ? 'bon' : 'mauvais'),
        s.nom + (s.tours < 90 ? ' ' + s.tours : ''));
      t.title = (JJK.combat.STATUTS[s.id] || {}).desc || '';
      o.st.appendChild(t);
    });
  }

  function majTout() {
    majFiche(N.joueur, D.joueur, false);
    majFiche(N.ennemi, D.ennemi, true);
    N.tour.textContent = 'TOUR ' + D.tour;
    majActions();
  }

  function majActions() {
    N.actions.innerHTML = '';
    D.actions().forEach(a => {
      const b = el('button', 'acte' + (a.ultime ? ' ultime' : ''));
      const c = el('span', 'cout', a.cout ? a.cout + ' ÉM' : '—');
      b.appendChild(c);
      b.appendChild(el('b', '', a.nom));
      if (a.sous) b.appendChild(el('small', '', a.sous));
      const d = el('small');
      d.style.cssText = 'display:block;margin-top:6px;font-family:var(--serif);font-size:.92rem;letter-spacing:0;text-transform:none;color:var(--os-mort)';
      d.textContent = a.ok ? a.desc : a.raison;
      b.appendChild(d);
      b.disabled = !a.ok || verrou;
      if (a.interdit) { b.classList.add('mutilated'); b.setAttribute('data-scar', 'retiré par serment'); }
      b.addEventListener('click', () => jouer(a.id));
      N.actions.appendChild(b);
    });
  }

  function journal(texte, cls) {
    if (!N.journal) return;
    if (G().mods && G().mods.masqueJournal) return;
    const p = el('p', cls || '');
    p.innerHTML = texte;
    N.journal.appendChild(p);
    N.journal.scrollTop = N.journal.scrollHeight;
    while (N.journal.children.length > 61) N.journal.removeChild(N.journal.children[1]);
  }

  /* ---- jouer un tour ---------------------------------------------------- */
  async function jouer(id) {
    if (verrou || D.fini) return;
    verrou = true; majActions();
    const ev = D.jouer(id);
    for (let i = 0; i < ev.length; i++) {
      await mettreEnScene(ev[i]);
    }
    majTout();
    verrou = false; majActions();
  }

  const NOM = c => (c === 'joueur' ? (D.joueur.nom || 'Toi') : D.ennemi.nom);

  async function mettreEnScene(e) {
    const g = G();
    switch (e.t) {
      case 'acte':
        journal('<span class="mono mort">' + (e.qui === 'joueur' ? '▸' : '◂') + '</span> ' +
          NOM(e.qui) + ' — <span class="important">' + esc(e.nom) + '</span>',
          e.qui === 'joueur' ? '' : 'mal');
        await wait(200);
        break;

      case 'degats': {
        const cible = e.cible === 'joueur' ? N.joueur : N.ennemi;
        const c = e.cible === 'joueur' ? D.joueur : D.ennemi;
        cible.boite.classList.remove('frappe');
        void cible.boite.offsetWidth;
        cible.boite.classList.add('frappe');
        JJK.audio.hit(e.gros ? 1.4 : (e.crit ? 1.0 : 0.55));
        if (e.gros) { JJK.fx.slash('#fff6ee', 2); JJK.audio.slash(); }
        JJK.fx.shake(e.gros ? 0.9 : (e.crit ? 0.45 : 0.22));
        JJK.fx.pulse(null, null, e.gros ? 900 : 320, e.cible === 'joueur' ? '#b31217' : (g.tech.couleur || '#b31217'), e.gros ? 1.6 : 0.8);
        if (e.cible === 'joueur') {
          const grav = clamp(e.montant / D.joueur.pvMax, 0, 1);
          JJK.fx.ink(chaos.r(0.15, 0.85) * JJK.fx.size.W, chaos.r(0.15, 0.85) * JJK.fx.size.H, 0.25 + grav * 1.4, '#b31217');
          M().ecrire({ degatsSubis: M().lire().degatsSubis + e.montant });
        } else {
          M().ecrire({ degatsInfliges: M().lire().degatsInfliges + e.montant });
        }
        const masque = e.cible === 'ennemi' && g.mods.masqueVieEnnemi;
        const chiffre = masque ? '—' : e.montant;
        journal((e.dot ? '· ' : '') + NOM(e.cible === 'joueur' ? 'joueur' : 'ennemi') + ' ' + esc(e.verbe || 'encaisse') +
          ' <span class="n">' + chiffre + '</span>' +
          (e.crit ? ' <span class="mono sang">CRITIQUE</span>' : '') +
          (e.surAuBut ? ' <span class="mono or">COUP AU BUT</span>' : '') +
          (e.echo ? ' <span class="mono">ÉCHO</span>' : ''),
          e.cible === 'joueur' ? 'mal' : 'bien');
        majFiche(cible, c, e.cible === 'ennemi');
        await wait(e.gros ? 420 : 240);
        break;
      }

      case 'soin':
        JJK.audio.heal();
        JJK.fx.inkFade(0.22);
        journal(NOM(e.qui) + ' recoud <span class="n">+' + e.montant + '</span>', 'bien');
        majTout();
        await wait(280);
        break;

      case 'statut': {
        const s = JJK.combat.STATUTS[e.id] || { nom: e.id };
        journal('<span class="mono">' + s.nom.toUpperCase() + '</span> sur ' + NOM(e.qui), '');
        JJK.audio.tick(520, 0.05, 0.05);
        majTout();
        await wait(150);
        break;
      }
      case 'statutFin': break;

      case 'revele':
        journal('Tu lis son flux : il prépare <span class="important">' + esc(nomIntention(e.intention)) + '</span>.', 'bien');
        await wait(260);
        break;

      case 'serment':
        JJK.audio.oath();
        JJK.fx.invert(150); JJK.fx.slash('#b31217', 1);
        JJK.fx.ink(null, null, 1.1, '#b31217');
        JJK.fx.shake(0.6);
        M().ecrire({ sermentsPretes: M().lire().sermentsPretes + 1 });
        journal('Serment improvisé. Tu abandonnes <span class="n">' + e.prix + '</span> points de vie ici, sur place.', 'mal');
        await wait(600);
        break;

      case 'sursis':
        JJK.fx.flash('#f2c14e', 500);
        journal(NOM(e.qui) + ' aurait dû tomber. <span class="or">Sursis.</span>', 'important');
        await wait(400);
        break;

      case 'domaine':
        await sequenceDomaine(e);
        break;

      case 'clash':
        await sequenceClash(e);
        break;

      case 'domaineBrise':
        JJK.fx.flash('#fff', 900);
        JJK.fx.invert(260);
        JJK.fx.shake(1.4);
        JJK.fx.slash('#fff6ee', 4);
        JJK.audio.hit(1.6);
        JJK.fx.domainClose();
        journal('<span class="mono sang">TERRITOIRE BRISÉ</span> — ' + NOM(e.perdant) + ' encaisse <span class="n">' + e.degats + '</span>.', 'important');
        await wait(900);
        break;

      case 'brise':
        JJK.fx.flash('#fff', 1100);
        JJK.fx.shake(1.6);
        JJK.fx.domainClose();
        journal('<span class="mono sang">LES DEUX TERRITOIRES SE FENDENT.</span>', 'important');
        await wait(900);
        break;

      case 'domaineFerme':
        if (e.qui === 'joueur' || e.qui === 'ennemi') {
          JJK.fx.domainClose();
          document.body.classList.remove('domaine-calme');
          journal('Le territoire se referme.', '');
        }
        await wait(200);
        break;

      case 'fuite':
        if (e.reussie) { journal('Tu romps le contact. ' + U.voix('domaine_brise', 'La chose te regarde partir.'), 'important'); }
        else journal('Impossible. Il y a quelque chose entre toi et la sortie.', 'mal');
        await wait(400);
        break;

      case 'sablier':
        JJK.fx.invert(600); JJK.fx.flash('#b31217', 1200); JJK.fx.shake(1.5);
        journal('<span class="mono sang">TOUR ' + (e.limite + 1) + '.</span> Ton serment arrive à échéance. Tu t\'écroules de toi-même.', 'mal');
        await wait(1100);
        break;

      case 'tour':
        journal('<span class="mono mort">— tour ' + e.n + ' —</span>', '');
        JJK.fx.setIntensity(clamp(0.4 + (1 - D.joueur.pv / D.joueur.pvMax) * 0.55, 0, 1));
        JJK.audio.setTension(clamp(1 - D.joueur.pv / D.joueur.pvMax, 0, 1));
        JJK.fx.setDead(clamp((1 - D.joueur.pv / D.joueur.pvMax) * 0.55, 0, 0.55));
        await wait(120);
        break;

      case 'fin':
        await finir(e.vainqueur);
        break;
    }
  }

  function nomIntention(i) {
    const a = JJK.combat.ACTIONS.find(x => x.id === i);
    return a ? a.nom : 'quelque chose';
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

  /* =====================================================================
     L'EXTENSION DU TERRITOIRE
     ===================================================================== */
  function boiteTerritoire() {
    let t = document.getElementById('territoire');
    if (!t) {
      t = el('div'); t.id = 'territoire';
      document.body.appendChild(t);
    }
    return t;
  }

  async function sequenceDomaine(e) {
    const g = G();
    const joueur = e.qui === 'joueur';
    const spec = e.spec || (joueur ? g.tech.domaine : D.ennemi.domaine) || {};
    const t = boiteTerritoire();
    t.innerHTML = '';
    t.classList.add('actif');

    M().ecrire({ domainesOuverts: M().lire().domainesOuverts + 1 });
    JJK.audio.heartbeat(false);
    JJK.audio.domain();
    JJK.fx.setIntensity(1);

    /* --- 1. la convergence : l'air se met à peser ------------------- */
    const sceau = el('canvas');
    sceau.style.cssText = 'width:min(62vmin,420px);height:auto;opacity:0;transition:opacity 1.2s ease,transform 1.6s cubic-bezier(.2,.7,.2,1);transform:scale(.6) rotate(-25deg)';
    t.appendChild(sceau);
    const graineSceau = joueur ? g.tech.seed : ('fleau:' + (D.fleau.id || D.fleau.nom));
    JJK.fx.sigil(sceau, graineSceau, { size: 460, accent: joueur ? (g.tech.couleur || '#b31217') : '#b31217' });
    requestAnimationFrame(() => { sceau.style.opacity = '1'; sceau.style.transform = 'scale(1) rotate(0deg)'; });

    const inc = el('div', 'incantation');
    t.appendChild(inc);
    const gestes = ['領域展開', 'りょういき てんかい'];
    await JJK.fx.type(inc, gestes[0], { speed: 120, sound: false });

    for (let i = 0; i < 16; i++) {
      JJK.fx.shake(0.12 + i * 0.055);
      JJK.fx.pulse(null, null, 120 + i * 55, joueur ? (g.tech.couleur || '#b31217') : '#b31217', 0.5 + i * 0.07);
      await wait(105);
    }

    /* --- 2. la bascule --------------------------------------------- */
    JJK.fx.flash('#ffffff', 1100);
    JJK.fx.invert(220);
    JJK.fx.shake(1.6);
    JJK.fx.domainOpen({
      seed: graineSceau,
      accent: joueur ? (g.tech.couleur || '#b31217') : '#b31217',
      invert: !joueur,               /* son territoire à lui retourne le monde */
      sigilCanvas: sceau,
    });
    U.titreFurtif('領域展開', 6000);
    await wait(260);

    t.innerHTML = '';
    if (!joueur) t.style.color = '#0a0a0c';
    else t.style.color = '';

    const nomFr = el('div', 'nom-dom');
    t.appendChild(nomFr);
    const nomJp = el('div', 'incantation');
    nomJp.style.marginTop = '18px';
    t.appendChild(nomJp);
    await JJK.fx.type(nomFr, spec.nom_fr || 'Territoire sans nom', { speed: 34, sound: false });
    if (spec.nom_jp) await JJK.fx.type(nomJp, spec.nom_jp + (spec.romaji ? ' · ' + spec.romaji : ''), { speed: 40, sound: false });

    /* --- 3. l'incantation ------------------------------------------- */
    if (spec.incantation) {
      const v = el('div', 'vers');
      t.appendChild(v);
      const vers = String(spec.incantation).replace(/([.;])\s+/g, '$1\n').split(/\n|\s*\/\s*/).filter(Boolean);
      for (const ligne of vers) {
        const p = el('p');
        v.appendChild(p);
        await JJK.fx.type(p, ligne.trim(), { speed: 20, sound: false });
      }
    }

    /* --- 4. le coup au but ------------------------------------------ */
    await wait(400);
    if (spec.effet_garanti) {
      const s = el('div', 'sur');
      const lab = el('div', 'etiquette rouge', 'Coup au but — il ne se refuse pas');
      s.appendChild(lab);
      const p = el('p', 'serif-italique');
      p.style.cssText = 'font-size:1.25rem;margin-top:10px;max-width:44ch';
      s.appendChild(p);
      t.appendChild(s);
      await JJK.fx.type(p, spec.effet_garanti, { speed: 18, sound: false });
    }
    JJK.fx.slash('#fff6ee', 3);
    JJK.audio.slash();
    JJK.fx.ink(null, null, 1.6, joueur ? '#b31217' : '#e9e2d4');
    await wait(1200);

    t.classList.remove('actif');
    document.body.classList.add('domaine-calme');
    journal('<span class="mono ' + (joueur ? 'or' : 'sang') + '">EXTENSION DU TERRITOIRE</span> — ' +
      esc(spec.nom_fr || '') + ' · ' + e.tours + ' tours.', 'important');
    if (spec.faille && joueur === false) journal('Une sortie existe : ' + esc(spec.faille), '');
    JJK.audio.heartbeat(true, 84);
  }

  async function sequenceClash(e) {
    const t = boiteTerritoire();
    t.innerHTML = ''; t.classList.add('actif');
    const h = el('div', 'nom-dom');
    h.style.fontSize = 'clamp(1.6rem,6vw,4rem)';
    t.appendChild(h);
    await JJK.fx.type(h, 'DEUX LOIS DANS LA MÊME PIÈCE', { speed: 26, sound: false });
    for (let i = 0; i < 10; i++) {
      JJK.fx.invert(60); JJK.fx.shake(1.2); JJK.audio.hit(1.2);
      JJK.fx.slash(i % 2 ? '#b31217' : '#fff6ee', 2);
      await wait(90);
    }
    const r = el('p', 'discret');
    r.style.marginTop = '20px';
    r.innerHTML = '<span class="mono">RAFFINEMENT ' + e.ra + ' — ' + e.rb + '</span>';
    t.appendChild(r);
    await wait(700);
    t.classList.remove('actif');
    journal('<span class="mono sang">AFFRONTEMENT DE TERRITOIRES</span> — ' + e.ra + ' contre ' + e.rb + '.', 'important');
  }

  /* =====================================================================
     FIN DE DUEL
     ===================================================================== */
  async function finir(vainqueur) {
    const g = G();
    JJK.fx.domainClose();
    document.body.classList.remove('domaine-calme');
    JJK.audio.heartbeat(false);
    JJK.audio.setTension(0.2);
    const t = boiteTerritoire();
    t.classList.remove('actif');

    if (vainqueur === 'joueur' || vainqueur === 'fuite') {
      const gagne = vainqueur === 'joueur';
      JJK.fx.flash(gagne ? '#f2c14e' : '#333', 900);
      JJK.fx.inkFade(0.45);
      journal(gagne ? U.voix('victoire', 'Ce qui te faisait face a cessé de faire face.')
                    : 'Tu sors. Le couloir est plus long qu\'à l\'aller.', 'important');
      const r = M().lire();
      M().ecrire(gagne ? { victoires: r.victoires + 1 } : { fuites: r.fuites + 1 });
      if (gagne) {
        g.maturation++; g.descente++;
        titres();
      }
      await wait(1400);
      ecranApres(gagne);
    } else {
      await mort();
    }
  }

  function ecranApres(gagne) {
    const n = U.montrer('ecran-apres');
    n.innerHTML = '';
    const g = G();
    n.appendChild(el('span', 'etiquette rouge', gagne ? 'Fléau exorcisé' : 'Contact rompu'));
    n.appendChild(el('h1', 'titre-rituel', gagne ? 'Il ne reste <em>rien</em> à ramasser' : 'Tu es <em>sorti</em>'));
    const p = el('p');
    p.style.cssText = 'max-width:60ch;color:var(--os-faible);font-weight:300';
    p.textContent = gagne
      ? 'Ta technique s\'est un peu ouverte. Maturation ' + g.maturation + ' : +' + Math.round(9 * g.maturation) + ' % d\'attaque, +' + Math.round(7 * g.maturation) + ' % de vitalité. Ce qui t\'attend en dessous a grandi aussi.'
      : 'Fuir ne coûte rien tout de suite. C\'est plus tard que ça se paie : le fléau que tu as laissé derrière toi continue, lui.';
    n.appendChild(p);
    const r = U.rangee();
    r.appendChild(U.bouton('Descendre encore', 'rouge', () => JJK.ecrans.descente()));
    r.appendChild(U.bouton('Modifier les serments', 'fantome', () => JJK.ecrans.serments()));
    r.appendChild(U.bouton('Registre', 'fantome', () => JJK.ecrans.registre()));
    n.appendChild(r);
  }

  function titres() {
    const g = G(), r = M().lire();
    const src = ((C().nomenclature || {}).titres_joueur) || [];
    const conditions = [
      [r.victoires >= 1, 0], [r.victoires >= 5, 1], [g.serments.length >= 3, 2],
      [r.domainesOuverts >= 1, 3], [r.morts >= 1, 4], [r.sermentsPretes >= 3, 5],
      [g.maturation >= 8, 6], [r.victoires >= 10, 7],
    ];
    conditions.forEach(([ok, i]) => {
      if (!ok || !src[i]) return;
      if (M().accorderTitre(src[i].titre)) {
        journal('<span class="mono or">TITRE — ' + esc(src[i].titre) + '</span>', 'important');
      }
    });
  }

  async function mort() {
    const g = G();
    JJK.fx.setDead(1);
    JJK.fx.invert(900);
    JJK.fx.flash('#b31217', 1600);
    JJK.fx.ink(null, null, 3, '#b31217');
    JJK.fx.ink(null, null, 2.4, '#b31217');
    JJK.fx.shake(1.4);
    JJK.audio.hit(1.6);
    JJK.audio.stopDrone(2.5);
    U.titreFurtif('— ' + (g.graine || '') + ' —', 9000);
    await wait(1500);

    const derniersMots = U.voix('mort', "Ce n'était pas assez.");
    const fiche = {
      graine: g.tech.seed, nom: g.graine, technique: g.tech.nom, nomJp: g.tech.nomJp,
      tueur: D.ennemi.nom, tour: D.tour, grade: (g.grade || {}).grade || '?',
      serments: g.serments.map(s => s.nom), derniersMots, archetype: g.tech.archetype,
    };
    const efface = g.mods && g.mods.effaceToutALaMort;
    if (!efface) M().inhumer(fiche);

    const n = U.montrer('ecran-mort');
    n.innerHTML = '';
    JJK.fx.setIntensity(0.1);

    const flux = el('div');
    n.appendChild(flux);
    await U.dire(flux, derniersMots, { forte: true, apres: 700 });
    await U.dire(flux, g.graine + ', porteur de « ' + g.tech.nom + ' », est tombé au tour ' + D.tour + ' devant ' + D.ennemi.nom + '.', { apres: 500 });

    if (efface) {
      await U.dire(flux, 'Tu avais signé le Serment de la Trace Effacée.', { forte: true, apres: 600 });
      await U.dire(flux, "Le registre n'écrira rien. Il n'y aura pas eu de toi ici.", { apres: 500 });
      M().effacer();
      JJK.fx.inkClear();
      JJK.fx.flash('#fff', 1400);
      await wait(900);
      await U.dire(flux, 'Tout est effacé. Y compris les morts d\'avant, qui ne t\'avaient rien demandé.', { forte: true, apres: 400 });
    } else {
      await U.dire(flux, "Le registre t'a inscrit. Ce que tu étais reviendra te chercher à la prochaine descente.", { forte: true, apres: 400 });
    }

    const r = U.rangee();
    r.appendChild(U.bouton('Reprendre sous le même nom', 'rouge', () => {
      JJK.fx.setDead(0); JJK.audio.startDrone();
      const gg = G();
      gg.maturation = Math.max(0, gg.maturation - 2);
      gg.descente = Math.max(0, gg.descente - 1);
      JJK.ecrans.descente();
    }));
    r.appendChild(U.bouton('Changer de nom', 'fantome', () => {
      JJK.fx.setDead(0); JJK.audio.startDrone();
      JJK.ecrans.reinit(); JJK.ecrans.seuil();
    }));
    r.appendChild(U.bouton('Registre', 'fantome', () => { JJK.fx.setDead(0); JJK.ecrans.registre(); }));
    n.appendChild(r);
  }

  JJK.duel = { lancer, get D() { return D; } };
})(window);
