/* =========================================================================
   RITUEL — serments contraignants
   Un serment n'est pas un bonus. C'est une amputation payée d'avance.
   La mécanique est écrite ici, en dur : le jeu doit VRAIMENT te retirer
   ce qu'il prétend te retirer.
   ========================================================================= */
(function (root) {
  'use strict';
  const JJK = (root.JJK = root.JJK || {});
  const { Rng, cyrb128 } = JJK.core;

  /* Chaque emplacement retire une capacité réelle du jeu ou de l'interface. */
  const EMPLACEMENTS = [
    {
      id: 'aveugle', mots: /masqu|cach|invisibl|ne verra|sans voir|à l['’ ]aveugle|information|affich/i,
      nom: 'Le Serment de l\'Œil Fermé',
      clause: "Je renonce à savoir ce qu'il me reste à briser. Je frapperai dans le noir jusqu'à ce que le noir cède.",
      perte: "Les points de vie de l'adversaire ne te seront plus jamais montrés.",
      gain: "+40 % de dégâts sur toutes tes techniques.",
      eff: { masqueVieEnnemi: true, degatsMult: 1.40 }, danger: 2,
    },
    {
      id: 'sansGarde', mots: /garde|défen|bloqu|esquiv|parade|protég/i,
      nom: 'Le Serment du Corps Offert',
      clause: "Je ne me protégerai pas. Ce qui vient vers moi arrivera entier.",
      perte: "L'action Garde t'est retirée. Elle sera barrée de l'écran.",
      gain: "+2 énergie maudite à chaque tour.",
      eff: { interdit: ['garde'], energieBonus: 2 }, danger: 3,
    },
    {
      id: 'sansFuite', mots: /fuir|fuite|retraite|partir|sortir|abandonn/i,
      nom: 'Le Serment de la Porte Murée',
      clause: "Je ne quitterai pas cette pièce autrement que porté.",
      perte: "Tu ne peux plus fuir un combat. Jamais.",
      gain: "+25 % de dégâts et +15 % de points de vie maximum.",
      eff: { interdit: ['fuite'], degatsMult: 1.25, pvMaxMult: 1.15 }, danger: 2,
    },
    {
      id: 'chair', mots: /chair|points de vie|vitalit|pv max|corps|maigr|amput/i,
      nom: 'Le Serment de la Chair Comptée',
      clause: "Je rends la moitié de ce qui me tient debout. Je n'en avais pas l'usage.",
      perte: "−45 % de points de vie maximum, définitivement, pour cette vie.",
      gain: "×2,1 sur tous tes dégâts.",
      eff: { pvMaxMult: 0.55, degatsMult: 2.10 }, danger: 5,
    },
    {
      id: 'sansSoin', mots: /soin|guér|inversé|réparer|recoudre|rétabli/i,
      nom: 'Le Serment de la Plaie Ouverte',
      clause: "Ce qui s'ouvre en moi restera ouvert. Je n'ai pas de temps pour cicatriser.",
      perte: "La technique inversée t'est retirée. Tu ne pourras plus te soigner.",
      gain: "+3 énergie au premier tour et +30 % de dégâts critiques.",
      eff: { interdit: ['inverse'], energieDepart: 3, critMult: 1.30 }, danger: 4,
    },
    {
      id: 'silence', mots: /silence|son|entendre|bruit|musique|sourd/i,
      nom: 'Le Serment de l\'Oreille Coupée',
      clause: "Je n'écouterai plus rien. Ni lui, ni moi, ni ce qui gratte derrière.",
      perte: "Le son du jeu est coupé, définitivement. Tu ne pourras plus le rallumer.",
      gain: "+18 % de chances de coup critique.",
      eff: { coupeSon: true, critBonus: 0.18 }, danger: 2,
    },
    {
      id: 'sansJournal', mots: /journal|texte|lire|récit|compte rendu|log/i,
      nom: 'Le Serment de la Page Blanche',
      clause: "Je ne demanderai pas ce qui vient de se produire. Cela s'est produit, c'est assez.",
      perte: "Le journal de combat est effacé : tu ne sauras plus ce que tu subis.",
      gain: "+1 énergie par tour et +20 % de dégâts.",
      eff: { masqueJournal: true, energieBonus: 1, degatsMult: 1.20 }, danger: 3,
    },
    {
      id: 'sablier', mots: /tour|temps|délai|limite|compte|sablier|minute/i,
      nom: 'Le Serment du Sablier Retourné',
      clause: "J'aurai fini avant le huitième battement. Au neuvième, je m'écroule de moi-même.",
      perte: "Si un combat dépasse 8 tours, tu meurs sur place. Sans exception.",
      gain: "×1,55 sur tes dégâts et +2 énergie par tour.",
      eff: { limiteTours: 8, degatsMult: 1.55, energieBonus: 2 }, danger: 5,
    },
    {
      id: 'disette', mots: /énergie|réserve|flux|coût|jeûne|maigre/i,
      nom: 'Le Serment du Puits Sec',
      clause: "Je ne puiserai qu'au fond. Le fond suffit à qui n'a plus soif.",
      perte: "−3 sur ta réserve maximale d'énergie maudite.",
      gain: "Tes techniques coûtent 1 énergie de moins (minimum 1).",
      eff: { enMaxBonus: -3, remise: 1 }, danger: 3,
    },
    {
      id: 'sansTechnique', mots: /technique innée|sans technique|renonce à ma technique|poings|mains nues/i,
      nom: 'Le Serment des Mains Nues',
      clause: "Ma technique restera pliée dans son étui. J'ai encore deux mains.",
      perte: "Ta technique innée t'est interdite en combat ordinaire.",
      gain: "Tes frappes renforcées frappent trois fois plus fort et ne coûtent rien.",
      eff: { interdit: ['technique'], frappeMult: 3.0 }, danger: 4,
    },
    {
      id: 'sansMemoire', mots: /mémoire|sauvegarde|oubli|effac|trace|souvenir/i,
      nom: 'Le Serment de la Trace Effacée',
      clause: "Si je tombe, qu'il ne reste rien. Pas même la mention que j'ai existé ici.",
      perte: "À ta prochaine mort, toute ta progression enregistrée est détruite.",
      gain: "×1,6 sur les dégâts et +30 % de points de vie maximum.",
      eff: { effaceToutALaMort: true, degatsMult: 1.60, pvMaxMult: 1.30 }, danger: 5,
    },
    {
      id: 'uniqueAction', mots: /une seule|répéter|deux fois|même action|unique/i,
      nom: 'Le Serment de la Formule Unique',
      clause: "Je ne referai jamais deux fois le même geste. Répéter, c'est mendier.",
      perte: "Tu ne peux pas utiliser deux tours de suite la même action.",
      gain: "+35 % de dégâts et +10 % de critique.",
      eff: { pasDeRepetition: true, degatsMult: 1.35, critBonus: 0.10 }, danger: 4,
    },
    {
      id: 'domaineLourd', mots: /territoire|domaine|extension|sanctuaire/i,
      nom: 'Le Serment du Territoire Interdit',
      clause: "Je n'ouvrirai mon territoire qu'une seule fois par existence. Il ne se rouvre pas.",
      perte: "Tu ne peux ouvrir ton extension du territoire qu'une fois par combat, et jamais deux combats de suite.",
      gain: "Ton extension du territoire inflige le double et dure deux tours de plus.",
      eff: { domaineUnique: true, domaineMult: 2.0, domaineTours: 2 }, danger: 3,
    },
    {
      id: 'revanche', mots: /vengeance|revanche|riposte|rendre|dette/i,
      nom: 'Le Serment de la Dette Rendue',
      clause: "Chaque coup reçu sera rendu avec les intérêts. Je tiens des comptes exacts.",
      perte: "+45 % de dégâts subis.",
      gain: "Chaque fois que tu es touché, ta prochaine attaque gagne +30 % cumulatifs.",
      eff: { degatsRecusMult: 1.45, rancune: 0.30 }, danger: 4,
    },
  ];

  /* On accroche la prose du corpus sur les emplacements mécaniques.
     Le style vient du rituel, les chiffres viennent du code. */
  function catalogue(seed) {
    const src = ((JJK.CORPUS || {}).serments || {}).serments || [];
    const pris = {};
    const out = EMPLACEMENTS.map(e => {
      let choisi = null, note = -1;
      src.forEach(s => {
        if (pris[s.id]) return;
        const texte = [s.restriction_code, s.restriction, s.nom, s.clause].join(' ');
        let n = e.mots.test(texte) ? 100 : 0;
        n += (cyrb128(e.id + '|' + (s.id || s.nom))[2] % 40) / 100;
        if (n > note) { note = n; choisi = s; }
      });
      if (choisi && note >= 100) pris[choisi.id || choisi.nom] = 1; else choisi = null;
      return {
        id: e.id,
        nom: (choisi && choisi.nom) || e.nom,
        clause: (choisi && choisi.clause) || e.clause,
        perte: e.perte,
        gain: e.gain,
        pertePoetique: (choisi && choisi.restriction) || e.perte,
        gainPoetique: (choisi && choisi.gain) || e.gain,
        danger: (choisi && choisi.danger) || e.danger,
        eff: e.eff,
      };
    });
    /* le rituel ne propose jamais tout : il propose ce qu'il a jugé bon */
    const R = new Rng('serments:' + seed);
    return R.shuffle(out);
  }

  /* Agrège les effets des serments signés en un modificateur unique. */
  function agreger(signes) {
    const m = {
      degatsMult: 1, degatsRecusMult: 1, pvMaxMult: 1, soinMult: 1,
      critBonus: 0, critMult: 1, energieBonus: 0, energieDepart: 0, enMaxBonus: 0,
      remise: 0, frappeMult: 1, domaineMult: 1, domaineTours: 0, rancune: 0, raffinementBonus: 0,
      interdit: {}, masqueVieEnnemi: false, masqueJournal: false, coupeSon: false,
      pasDeRepetition: false, domaineUnique: false, effaceToutALaMort: false,
      limiteTours: 0,
    };
    /* chaque serment signé affine le territoire : c'est ce qui décide
       d'un affrontement d'extensions, et c'est ce qu'on a payé pour */
    m.raffinementBonus = (signes || []).length * 22;
    (signes || []).forEach(s => {
      const e = s.eff || {};
      if (e.degatsMult) m.degatsMult *= e.degatsMult;
      if (e.degatsRecusMult) m.degatsRecusMult *= e.degatsRecusMult;
      if (e.pvMaxMult) m.pvMaxMult *= e.pvMaxMult;
      if (e.soinMult) m.soinMult *= e.soinMult;
      if (e.critBonus) m.critBonus += e.critBonus;
      if (e.critMult) m.critMult *= e.critMult;
      if (e.energieBonus) m.energieBonus += e.energieBonus;
      if (e.energieDepart) m.energieDepart += e.energieDepart;
      if (e.enMaxBonus) m.enMaxBonus += e.enMaxBonus;
      if (e.remise) m.remise += e.remise;
      if (e.frappeMult) m.frappeMult *= e.frappeMult;
      if (e.domaineMult) m.domaineMult *= e.domaineMult;
      if (e.domaineTours) m.domaineTours += e.domaineTours;
      if (e.rancune) m.rancune += e.rancune;
      if (e.limiteTours) m.limiteTours = m.limiteTours ? Math.min(m.limiteTours, e.limiteTours) : e.limiteTours;
      (e.interdit || []).forEach(k => { m.interdit[k] = true; });
      ['masqueVieEnnemi', 'masqueJournal', 'coupeSon', 'pasDeRepetition', 'domaineUnique', 'effaceToutALaMort']
        .forEach(k => { if (e[k]) m[k] = true; });
    });
    /* Plafond souple : au-delà d'un certain point, empiler des serments
       cesse de payer. Le réel se lasse d'être négocié.                   */
    if (m.degatsMult > 3.0) m.degatsMult = 3.0 + (m.degatsMult - 3.0) * 0.40;
    if (m.pvMaxMult < 0.30) m.pvMaxMult = 0.30;
    return m;
  }

  JJK.serments = { EMPLACEMENTS, catalogue, agreger };
})(window);
