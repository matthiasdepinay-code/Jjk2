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
      document.removeEventListener('pointerdown', eveil);
      document.removeEventListener('keydown', eveil);
    };
    document.addEventListener('pointerdown', eveil);
    document.addEventListener('keydown', eveil);

    /* Un lien porte un nom : on ouvre alors le registre à cette page-là. */
    const m = /[#&?]g=([^&]+)/.exec(location.hash + location.search);
    let graine = null;
    if (m) { try { graine = decodeURIComponent(m[1]); } catch (e) { graine = m[1]; } }
    if (graine && graine.trim()) JJK.ecrans.consultation(graine.trim().slice(0, 40));
    else JJK.ecrans.seuil();

    /* raccourcis */
    document.addEventListener('keydown', e => {
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
