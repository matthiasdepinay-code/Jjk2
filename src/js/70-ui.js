/* =========================================================================
   RITUEL — interface, socle
   ========================================================================= */
(function (root) {
  'use strict';
  const JJK = (root.JJK = root.JJK || {});
  const { el, $, $$, chaos, clamp, wait } = JJK.core;

  const UI = {};
  UI.etat = null;              /* l'état de partie, posé par le boot */
  let ecranActif = null;
  let murmureTimer = null;

  /* ---- écrans ---------------------------------------------------------- */
  function scene() { return document.getElementById('stage'); }

  function ecran(id) {
    let n = document.getElementById(id);
    if (!n) { n = el('section', 'ecran'); n.id = id; scene().appendChild(n); }
    return n;
  }

  function montrer(id) {
    $$('.ecran').forEach(e => e.classList.remove('actif'));
    const n = ecran(id);
    n.classList.add('actif');
    ecranActif = id;
    root.scrollTo({ top: 0, behavior: 'smooth' });
    return n;
  }
  function actif() { return ecranActif; }

  /* ---- boutons --------------------------------------------------------- */
  function bouton(texte, cls, fn) {
    const b = el('button', 'btn ' + (cls || ''), texte);
    b.addEventListener('click', e => { if (JJK.audio) JJK.audio.tick(1500, 0.02, 0.05); fn(e); });
    return b;
  }
  function rangee() { return el('div', 'btn-rangee'); }

  /* ---- lignes de rituel ------------------------------------------------ */
  /* La hâte : au premier clic, tout ce qui reste à dire est déjà dit.
     Un rituel qui impose son tempo n'est plus un rituel, c'est une attente. */
  UI.hate = false;
  function calmer() { UI.hate = false; }

  async function dire(parent, texte, opts) {
    const o = opts || {};
    const p = el('p', 'rituel-ligne' + (o.forte ? ' forte' : ''));
    parent.appendChild(p);
    if (UI.hate) {
      p.textContent = texte;
      await wait(24);
      return p;
    }
    const t = JJK.fx.type(p, texte, { speed: o.speed || 19, sound: o.sound !== false });
    UI._enCours = t;
    await t;
    UI._enCours = null;
    if (o.apres && !UI.hate) await wait(o.apres);
    return p;
  }

  function presser() {
    UI.hate = true;
    if (UI._enCours && UI._enCours.skip) UI._enCours.skip();
  }
  /* On ne presse que si quelque chose est en train de se dire : sinon un
     clic sur un bouton emporterait la tirade suivante avant qu'elle existe. */
  document.addEventListener('click', () => { if (UI._enCours) presser(); }, true);
  document.addEventListener('keydown', e => {
    if ((e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') && UI._enCours) presser();
  }, true);

  /* ---- murmures : le décor n'est jamais tout à fait muet --------------- */
  function murmures(on) {
    if (murmureTimer) { clearInterval(murmureTimer); murmureTimer = null; }
    if (!on) return;
    murmureTimer = setInterval(() => {
      if (document.hidden) return;
      const v = ((JJK.CORPUS || {}).voix || {}).murmures || [];
      if (!v.length || Math.random() > 0.55) return;
      const n = el('div', 'murmure-flottant', v[Math.floor(Math.random() * v.length)]);
      n.style.top = chaos.r(12, 82) + 'vh';
      n.style.left = chaos.r(45, 92) + 'vw';
      document.body.appendChild(n);
      if (JJK.audio && Math.random() < 0.35) JJK.audio.whisper(chaos.r(0.5, 1.1));
      setTimeout(() => n.remove(), 13500);
    }, 9000);
  }

  /* ---- le titre de l'onglet parle aussi -------------------------------- */
  const TITRE_BASE = 'RITUEL — 呪法帳';
  function titreOnglet(t) { document.title = t || TITRE_BASE; }
  function titreFurtif(t, ms) {
    titreOnglet(t);
    setTimeout(() => titreOnglet(), ms || 4000);
  }

  /* ---- barre d'état ---------------------------------------------------- */
  function barre() {
    let b = document.getElementById('barre-etat');
    if (b) return b;
    b = el('div'); b.id = 'barre-etat';
    b.innerHTML = '<span id="be-graine">—</span><span id="be-grade"></span><span class="sep"></span>' +
      '<span id="be-registre"></span>';
    const son = el('button', '', 'SON : ON');
    son.id = 'be-son';
    son.addEventListener('click', () => {
      /* Le Serment de l'Oreille Coupée ne se reprend pas : le bouton reste
         là, il refuse simplement d'obéir, et il le dit. */
      if (sonScelle()) { JJK.fx.shake(0.12); majSon(); return; }
      JJK.audio.unlock();
      JJK.audio.toggleMute();
      majSon();
    });
    const reg = bouton('REGISTRE', 'fantome', () => { if (JJK.ecrans) JJK.ecrans.registre(); });
    reg.style.cssText = 'border:0;padding:4px 0;font-size:10px;letter-spacing:.2em;margin:0;color:inherit';
    b.appendChild(son); b.appendChild(reg);
    document.body.appendChild(b);
    majSon();
    return b;
  }

  function sonScelle() {
    const g = JJK.jeu;
    if (g && g.mods && g.mods.coupeSon) return true;
    return !!(JJK.memoire && JJK.memoire.lire().sonCoupe);
  }
  function majSon() {
    const n = document.getElementById('be-son');
    if (!n) return;
    if (sonScelle()) { n.textContent = 'SON : SCELLÉ'; n.style.color = 'var(--sang)'; n.title = "Serment de l'Oreille Coupée."; return; }
    n.style.color = '';
    n.textContent = 'SON : ' + (JJK.audio.isMuted() ? 'OFF' : 'ON');
  }
  function majBarre(o) {
    barre();
    if (o.graine != null) document.getElementById('be-graine').textContent = o.graine ? ('DOSSIER : ' + o.graine.toUpperCase()) : '—';
    if (o.grade != null) document.getElementById('be-grade').textContent = o.grade ? ('GRADE ' + String(o.grade).toUpperCase()) : '';
    if (o.registre != null) document.getElementById('be-registre').textContent = o.registre;
  }

  /* ---- petites fabriques ----------------------------------------------- */
  function bloc(etiquette, contenu, cls) {
    const b = el('div', 'bloc ' + (cls || ''));
    b.appendChild(el('span', 'etiquette', etiquette));
    if (typeof contenu === 'string') {
      const p = el('p', cls === 'loi' ? 'enonce' : '');
      p.textContent = contenu;
      b.appendChild(p);
    } else if (contenu) b.appendChild(contenu);
    return b;
  }

  function stats(paires) {
    const g = el('div', 'grille-stats');
    paires.forEach(([v, k]) => {
      const s = el('div', 'stat');
      s.appendChild(el('b', '', String(v)));
      s.appendChild(el('span', '', k));
      g.appendChild(s);
    });
    return g;
  }

  function pointsDanger(n) {
    const d = el('span', 'danger');
    for (let i = 0; i < 5; i++) d.appendChild(el('i', i < n ? 'on' : ''));
    return d;
  }

  function pioche(liste, def) {
    if (!liste || !liste.length) return def || '';
    return liste[Math.floor(Math.random() * liste.length)];
  }
  function voix(k, def) { return pioche(((JJK.CORPUS || {}).voix || {})[k], def); }

  JJK.ui = {
    ecran, montrer, actif, bouton, rangee, dire, presser, calmer, murmures, titreOnglet, titreFurtif,
    barre, majBarre, majSon, sonScelle, bloc, stats, pointsDanger, pioche, voix, UI,
  };
})(window);
