/* =========================================================================
   RITUEL — allumage
   ========================================================================= */
(function (root) {
  'use strict';
  const JJK = (root.JJK = root.JJK || {});

  function demarrer() {
    if (!document.getElementById('stage')) {
      const s = document.createElement('div');
      s.id = 'stage';
      document.body.appendChild(s);
    }
    JJK.fx.mount();
    JJK.ui.barre();
    JJK.ui.titreOnglet();
    JJK.ui.murmures(false);

    /* Le son attend un geste : les navigateurs l'exigent, et le rituel
       préfère de toute façon qu'on le touche avant de lui parler. */
    const eveil = () => {
      JJK.audio.unlock();
      const r = JJK.memoire.lire();
      if (r.sonCoupe) JJK.audio.toggleMute(true);
      JJK.ui.majSon();
      document.removeEventListener('pointerdown', eveil);
      document.removeEventListener('keydown', eveil);
    };
    document.addEventListener('pointerdown', eveil);
    document.addEventListener('keydown', eveil);

    /* Un lien porte un numéro de dossier : le service ressort la fiche. */
    const m = /[#&?]d=([^&]+)/.exec(location.hash + location.search);
    let code = null;
    if (m) { try { code = decodeURIComponent(m[1]); } catch (e) { code = m[1]; } }
    const lu = code ? JJK.taxo.lireDossierCode(code.trim()) : null;
    if (lu) JJK.ecrans.consultation(lu);
    else JJK.ecrans.seuil();

    /* raccourcis */
    document.addEventListener('keydown', e => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const cible = e.target;
      if (cible && (cible.tagName === 'INPUT' || cible.tagName === 'TEXTAREA')) return;
      /* le générateur se pilote au clavier : on relance sans viser un bouton */
      const surFiche = JJK.ui.actif() === 'ecran-revelation';
      if (surFiche && (e.key === 'r' || e.key === 'R')) {
        JJK.ecrans.toutRetirer(); JJK.ecrans.revelation({ rapide: true }); return;
      }
      if (surFiche && (e.key === 'v' || e.key === 'V')) {
        const G = JJK.jeu;
        G.variante = JJK.taxo.codeVariante((G.variante || 0) + 1);
        JJK.ecrans.assembler(); JJK.ecrans.revelation({ rapide: true }); return;
      }
      if (surFiche && (e.key === 'g' || e.key === 'G')) { JJK.ecrans.galerie(); return; }
      if (e.key === 'Escape' && JJK.ui.actif() !== 'ecran-duel') JJK.ecrans.registre();
      if (e.key >= '1' && e.key <= '9' && JJK.ui.actif() === 'ecran-duel') {
        const b = document.querySelectorAll('#ecran-duel .acte');
        const n = b[parseInt(e.key, 10) - 1];
        if (n && !n.disabled) n.click();
      }
    });

    /* L'onglet quitté n'est pas un onglet oublié. */
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        JJK.ui.titreOnglet('… continue sans toi');
      } else {
        JJK.ui.titreOnglet();
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer);
  else demarrer();
})(window);
