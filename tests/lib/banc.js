// Banc d'essai commun, exécuté dans la page : un terrain plat en l'air, le joueur, des outils
    window.__errs = window.__errs || [];
    const st = World.state(), S = Sim, M = S.M, CS = 6; const X0 = Math.round(Gen.X(600)), Y = 46;
    const res = [];
    const ok = (nom, pass, detail) => res.push({ nom, ok: !!pass, detail });
    // ---------- banc d'essai ----------
    const banc = (opts = {}) => {
      for (let x = X0 - 80; x <= X0 + 80; x++) for (let y = Y - 45; y <= Y + 8; y++) S.set(x, y, y > Y ? M.PIERRE : M.AIR);
      if (opts.mur !== undefined) for (let y = Y - 25; y <= Y; y++) for (let x = X0 + opts.mur; x < X0 + opts.mur + 2; x++) S.set(x, y, M.PIERRE);
      if (opts.mare !== undefined) { for (let y = Y - 5; y <= Y; y++) { S.set(X0 + opts.mare - 1, y, M.PIERRE); S.set(X0 + opts.mare + 10, y, M.PIERRE); } for (let x = X0 + opts.mare; x < X0 + opts.mare + 10; x++) for (let y = Y - 3; y <= Y; y++) S.set(x, y, M.EAU); }
      if (opts.marche) for (let x = X0 + opts.marche; x < X0 + 80; x++) for (let y = Y - 3; y <= Y; y++) S.set(x, y, M.PIERRE);
      S.ancrer();
      const p = st.p; p.x = (X0 - 50) * CS; p.y = (Y - 9) * CS + 2; p.vx = p.vy = 0; p.ink = 9999; p.inkMax = 9999; p.hp = p.hpMax; for (const k in p.sta) p.sta[k] = 0; p.pg = null; p.trap = null; p.selfTimer = null;
      st.sp = []; st.gz = []; st.marques = []; st.portails = []; st.control = null; st.lien = null;
      st.cam.x = X0 * CS - 640; st.cam.y = Y * CS - 420;
      // écarter toutes les créatures et caisses
      for (const c of st.crs) { if (c.x > (X0 - 90) * CS && c.x < (X0 + 90) * CS && c.y < (Y + 10) * CS) { c.x = 50 * CS; c.y = 50 * CS; } c.vx = c.vy = 0; }
      for (const o of st.objs) if (o.dyn && o.x > (X0 - 90) * CS && o.x < (X0 + 90) * CS) { o.x = 60 * CS; o.y = 60 * CS; }
      vus = new WeakSet(); eclats = []; t = 0;
    };
    const bete = (t2, cellX, cellY = Y) => { const c = st.crs.find((q) => q.t === t2 && q.hp > 0 && !q.__pris); c.__pris = true; c.x = cellX * CS; c.y = cellY * CS - c.h; c.vx = c.vy = 0; c.hp = c.hpMax; for (const k in c.sta) c.sta[k] = 0; c.sta.tame = false; c.sta.stun = 999; c.fuite = null; return c; };
    const libere = () => { for (const c of st.crs) if (c.__pris) { c.__pris = false; c.sta.stun = 0; c.x = 50 * CS; c.y = 50 * CS; c.hp = c.hpMax; } };
    let vus = new WeakSet(), eclats = [], t = 0;
    const scan = () => { for (const q of st.sp) if (q.k === 'ring' && !vus.has(q)) { vus.add(q); eclats.push({ t, x: q.x, y: q.y, r: q.r, core: q.core }); } };
    const run = (n, cb) => { for (let i = 0; i < n; i++) { World.update(1 / 60, window.__inp, { x: 0, y: 0 }); t += 1 / 60; scan(); if (cb) cb(i); } };
    const souris = (wx, wy) => { game.inp.mouse.x = wx - st.cam.x; game.inp.mouse.y = wy - st.cam.y; };
    const lance = (seal, ax, ay, o = {}) => { st.p.gestes = { R: null, L: null }; souris(ax, ay); return World.castSeal(Seal.clone(Object.assign({ taille: 'moyen', trigger: 'contact' }, seal)), { x: ax, y: ay }, false, o.charge || 0); };
    const projs = () => st.sp.filter((q) => q.k === 'proj');
    const P0 = () => ({ x: st.p.x + st.p.w / 2, y: st.p.y + st.p.h * 0.45 });
    const tempsDeTest = () => 1;
