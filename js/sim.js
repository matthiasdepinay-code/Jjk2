'use strict';
// ---------- Simulation de matières (grille « falling sand ») et rendu encre par morceaux ----------
function createSim() {
  return (() => {
  const CS = 6;        // taille d'une cellule en pixels
  const CH = 32;       // cellules par côté de morceau (chunk)
  const CPX = CS * CH; // pixels par morceau
  let W = 0, H = 0, CW = 0, CHn = 0;
  let mat, aux, elec, upd, chaud, temp, ancre, enBloc, vis, sure, chunkVide, chunkRendu, chunkHeat, nDraw = 0;
  let visGen = 1, fiss = [], fissStamp = null, blocs = [], effondre = true;
  let tzones = []; // bulles de temps : { x, y, r, f } en pixels ; f = 0 figé, < 1 ralenti, > 1 accéléré
  let chunkActive, chunkDirty, chunkCv, chunkLights, chunkHasLiquid;
  let frame = 0;
  let onEvent = null;
  let sunny = true;
  let surf = null; // hauteur de surface par colonne (cellules), fournie par la génération
  let gzones = [];  // champs de gravité locaux : {x, y, r (px), gx, gy, mag}
  let feuMul = 1;   // option : vitesse de propagation du feu

  const M = { AIR: 0, PIERRE: 1, TERRE: 2, SABLE: 3, BOIS: 4, PLANTE: 5, HERBE: 6, EAU: 7, HUILE: 8, ACIDE: 9, LAVE: 10, GLACE: 11, NEIGE: 12, VAPEUR: 13, FUMEE: 14, FEU: 15, SEVE: 16, VERRE: 17, METAL: 18, OBSIDIENNE: 19, CENDRE: 20, CRISTAL: 21, POUDRE: 22, MOUSSE: 23, MIEL: 24, SEL: 25, SAUMURE: 26, BOUE: 27, BULLE: 28, MEUBLE: 29, GAZ: 30 };
  const P = [];
  const def = (id, p) => { P[id] = Object.assign({ solid: 0, powder: 0, liquid: 0, gas: 0, pass: 0, climb: 0, dig: 0, flam: 0, burn: 0, corrode: 0, dens: 0, flow: 0, hot: 0, light: 0, cond: 0, hatch: 0, alpha: 0.6 }, p); };
  def(M.AIR, { nom: 'air' });
  def(M.PIERRE, { nom: 'pierre', solid: 1, color: '#a8977a', hatch: 1, corrode: 0.02 });
  def(M.TERRE, { nom: 'terre', solid: 1, dig: 1, color: '#a3844f', hatch: 1, corrode: 0.08 });
  def(M.SABLE, { nom: 'sable', solid: 1, powder: 1, dig: 1, color: '#d9c48a', corrode: 0.06 });
  def(M.BOIS, { nom: 'bois', solid: 1, color: '#8d6a3c', flam: 0.03, burn: 170, corrode: 0.06 });
  def(M.PLANTE, { nom: 'plante', pass: 1, climb: 1, dig: 1, color: '#6a9a45', flam: 0.1, burn: 45, corrode: 0.1, alpha: 0.7 });
  def(M.HERBE, { nom: 'herbe', pass: 1, dig: 1, color: '#78a24a', flam: 0.05, burn: 8, corrode: 0.2, alpha: 0.7 });
  def(M.EAU, { nom: 'eau', liquid: 1, dens: 2, flow: 5, color: '#3f7ab8', cond: 1, alpha: 0.5 });
  def(M.HUILE, { nom: 'huile', liquid: 1, dens: 1, flow: 3, color: '#3a2c18', flam: 0.6, burn: 30, alpha: 0.75 });
  def(M.ACIDE, { nom: 'acide', liquid: 1, dens: 3, flow: 4, color: '#8fbf2a', alpha: 0.6 });
  def(M.LAVE, { nom: 'lave', liquid: 1, dens: 5, flow: 1, color: '#e0622b', hot: 1, light: 1, alpha: 0.9 });
  def(M.GLACE, { nom: 'glace', solid: 1, color: '#bfe0f2', alpha: 0.55 });
  def(M.NEIGE, { nom: 'neige', solid: 1, powder: 1, dig: 1, color: '#f6f8fa', alpha: 0.9 });
  def(M.VAPEUR, { nom: 'vapeur', gas: 1, color: '#cfcfcf', alpha: 0.35 });
  def(M.FUMEE, { nom: 'fumée', gas: 1, color: '#5a524c', alpha: 0.35 });
  def(M.FEU, { nom: 'feu', gas: 1, color: '#e8842a', hot: 1, light: 1, alpha: 0.85 });
  def(M.SEVE, { nom: 'sève', liquid: 1, dens: 2, flow: 0, color: '#c9a63a', flam: 0.1, burn: 20, alpha: 0.7 });
  def(M.VERRE, { nom: 'verre', solid: 1, color: '#cfe3ea', alpha: 0.4 });
  def(M.METAL, { nom: 'métal', solid: 1, color: '#737e86', hatch: 1, cond: 1, corrode: 0.02 });
  def(M.OBSIDIENNE, { nom: 'obsidienne', solid: 1, color: '#2d2830', hatch: 1, alpha: 0.85 });
  def(M.CENDRE, { nom: 'cendre', solid: 1, powder: 1, dig: 1, color: '#7a736b', corrode: 0.3, alpha: 0.7 });
  def(M.CRISTAL, { nom: 'cristal', solid: 1, color: '#b58fd8', light: 1, dig: 1, alpha: 0.6 });
  def(M.POUDRE, { nom: 'poudre', solid: 1, powder: 1, dig: 1, color: '#3a3430', corrode: 0.2, alpha: 0.85 });
  def(M.MOUSSE, { nom: 'mousse', pass: 1, dig: 1, color: '#7a9a4a', flam: 0.02, burn: 30, corrode: 0.2, alpha: 0.75 });
  def(M.MIEL, { nom: 'miel', liquid: 1, dens: 4, flow: 0, color: '#d8a03a', alpha: 0.8 });
  def(M.SEL, { nom: 'sel', solid: 1, powder: 1, dig: 1, color: '#f2efe6', corrode: 0.3, alpha: 0.9 });
  def(M.SAUMURE, { nom: 'saumure', liquid: 1, dens: 2.5, flow: 5, color: '#5f8fb8', cond: 1, alpha: 0.55 });
  def(M.BULLE, { nom: 'bulle', color: '#a8dede', alpha: 0.28 });
  def(M.GAZ, { nom: 'gaz', gas: 1, color: '#d8e8c8', alpha: 0.28, flam: 1 });
  def(M.MEUBLE, { nom: 'terre meuble', solid: 1, powder: 1, dig: 1, color: '#a3844f', corrode: 0.08, alpha: 0.95 });
  def(M.BOUE, { nom: 'boue', liquid: 1, dens: 4.5, flow: 1, color: '#6b5330', alpha: 0.85 });
  const FLAMMABLE_SOLID = (m) => m === M.BOIS || m === M.PLANTE || m === M.HERBE;
  // ---------- Chaleur : une température par case (AMB = ambiante) ----------
  const AMB = 64, T_LAVE = 225;
  const NAT = new Uint8Array(64).fill(AMB); NAT[M.GLACE] = 40; NAT[M.NEIGE] = 42; NAT[M.LAVE] = T_LAVE;
  const COND = new Float32Array(64).fill(0.12);
  [[M.AIR, 0.14], [M.PIERRE, 0.26], [M.TERRE, 0.12], [M.SABLE, 0.1], [M.BOIS, 0.07], [M.PLANTE, 0.09], [M.HERBE, 0.09], [M.EAU, 0.26], [M.HUILE, 0.14], [M.ACIDE, 0.2], [M.LAVE, 0.3], [M.GLACE, 0.22], [M.NEIGE, 0.08], [M.VAPEUR, 0.18], [M.FEU, 0.4], [M.VERRE, 0.2], [M.METAL, 0.5], [M.OBSIDIENNE, 0.16], [M.CRISTAL, 0.22], [M.SAUMURE, 0.26], [M.BOUE, 0.15], [M.MEUBLE, 0.1], [M.MOUSSE, 0.09]].forEach(([m, c]) => { COND[m] = c; });
  const RELAX = new Float32Array(64).fill(0.005);
  RELAX[M.AIR] = 0.035; for (const m of [M.VAPEUR, M.FUMEE, M.FEU, M.BULLE]) RELAX[m] = 0.04; for (const m of [M.EAU, M.HUILE, M.ACIDE, M.SAUMURE, M.BOUE, M.MIEL, M.SEVE]) RELAX[m] = 0.012; RELAX[M.METAL] = 0.012; RELAX[M.LAVE] = 0.004;
  const BRULE = new Uint8Array(64); for (const m of [M.BOIS, M.PLANTE, M.HERBE, M.MOUSSE]) BRULE[m] = 1;
  const EMET = new Uint8Array(64); for (const m of [M.FEU, M.LAVE, M.BOIS, M.PLANTE, M.HERBE, M.MOUSSE]) EMET[m] = 1;
  // température d'une source (0 : pas une source)
  function emitT(i, m) { if (m === M.FEU) return 165 + 35 * chaud[i]; if (m === M.LAVE) return temp[i] >= 170 ? T_LAVE : 0; if (BRULE[m] && aux[i] > 0) return 160; return 0; }
  const visT = (t, m) => (t > 124 ? 1 + ((t - 124) >> 5) : t < 46 && m !== M.GLACE && m !== M.NEIGE ? -1 - ((46 - t) >> 4) : 0);
  function chauffeChunk(i) { const x = i % W, y = (i - x) / W, c = (y >> 5) * CW + (x >> 5); chunkHeat[c] = frame + 60; }
  // ---------- Effondrement : la pierre qui ne tient plus sur rien tombe ----------
  const STRUCT = new Uint8Array(64); for (const m of [M.PIERRE, M.TERRE, M.BOIS, M.METAL, M.GLACE, M.CRISTAL, M.OBSIDIENNE, M.VERRE]) STRUCT[m] = 1;
  const PASSAGER = new Uint8Array(64); for (const m of [M.HERBE, M.PLANTE, M.MOUSSE]) PASSAGER[m] = 1;
  function fissure(i) {
    if (!fissStamp) return; const x = i % W, y = (i - x) / W, b = (y >> 2) * Math.ceil(W / 4) + (x >> 2);
    if (fissStamp[b] === frame + 1) return; fissStamp[b] = frame + 1; if (fiss.length < 3000) fiss.push(b);
  }
  function changeMat(i, m) { const o = mat[i]; if (STRUCT[o] !== STRUCT[m] && !enBloc[i]) { if (STRUCT[o]) ancre[i] = 0; fissure(i); } }
  // gravité locale d'une cellule : [dx, dy, mag] ; mag 0 = apesanteur
  function gravAt(x, y) {
    for (const z of gzones) { const px = (x + 0.5) * CS, py = (y + 0.5) * CS; if (z.rect ? px >= z.rect.x0 && px <= z.rect.x1 && py >= z.rect.y0 && py <= z.rect.y1 : (px - z.x) * (px - z.x) + (py - z.y) * (py - z.y) <= z.r * z.r) return [z.gx, z.gy, z.mag]; }
    return [0, 1, 1];
  }
  function tempsAt(x, y) { const px = (x + 0.5) * CS, py = (y + 0.5) * CS; for (const z of tzones) { if (z.rect ? px >= z.rect.x0 && px <= z.rect.x1 && py >= z.rect.y0 && py <= z.rect.y1 : (px - z.x) * (px - z.x) + (py - z.y) * (py - z.y) <= z.r * z.r) return z.f; } return 1; }
  function cellT(x, y, i, m, f) {
    if (tzones.length) { const t = tempsAt(x, y); if (t !== 1) { if (t <= 0) { upd[i] = f; return; } if (t < 1 && rnd() > t) return; } }
    cell(x, y, i, m, f);
  }
  function cellIn(x, y) { return x >= 0 && y >= 0 && x < W && y < H; }

  function init(w, h) {
    W = w; H = h; CW = Math.ceil(W / CH); CHn = Math.ceil(H / CH);
    mat = new Uint8Array(W * H); aux = new Uint8Array(W * H); elec = new Uint8Array(W * H); upd = new Uint8Array(W * H); chaud = new Uint8Array(W * H); temp = new Uint8Array(W * H).fill(AMB);
    ancre = new Uint8Array(W * H); enBloc = new Uint8Array(W * H); vis = new Uint32Array(W * H); sure = new Uint32Array(W * H); fissStamp = new Uint32Array(Math.ceil(W / 4) * Math.ceil(H / 4)); fiss = []; blocs = [];
    chunkHeat = new Int32Array(Math.ceil(W / CH) * Math.ceil(H / CH)).fill(30);
    chunkActive = new Int32Array(CW * CHn); chunkDirty = new Uint8Array(CW * CHn).fill(1); chunkHasLiquid = new Uint8Array(CW * CHn);
    chunkCv = new Array(CW * CHn).fill(null); chunkLights = new Array(CW * CHn).fill(null); chunkVide = new Uint8Array(CW * CHn); chunkRendu = new Uint32Array(CW * CHn);
    frame = 0;
  }
  const idx = (x, y) => y * W + x;
  const inB = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  function get(x, y) { return inB(x, y) ? mat[y * W + x] : (y < 0 ? M.AIR : M.PIERRE); }
  function touch(i) {
    const x = i % W, y = (i - x) / W;
    const cx = x >> 5, cy = y >> 5;
    const t = frame + 24;
    const mark = (a, b) => { if (a >= 0 && b >= 0 && a < CW && b < CHn) { const c = b * CW + a; chunkActive[c] = t; chunkDirty[c] = 1; } };
    mark(cx, cy);
    const lx = x & 31, ly = y & 31;
    if (lx === 0) mark(cx - 1, cy); else if (lx === 31) mark(cx + 1, cy);
    if (ly === 0) mark(cx, cy - 1); else if (ly === 31) mark(cx, cy + 1);
  }
  function set(x, y, m, a = 0) { if (!inB(x, y)) return; const i = y * W + x; changeMat(i, m); mat[i] = m; aux[i] = a; elec[i] = 0; chaud[i] = 0; temp[i] = NAT[m]; if (m === M.LAVE || m === M.FEU) chauffeChunk(i); touch(i); }
  function setI(i, m, a = 0) { changeMat(i, m); mat[i] = m; aux[i] = a; elec[i] = 0; chaud[i] = 0; if (m === M.LAVE) temp[i] = T_LAVE; if (m === M.LAVE || m === M.FEU) chauffeChunk(i); touch(i); }
  // flamme chauffée : 1 blanche, 2 bleue
  function setFeu(x, y, a, c) { if (!inB(x, y)) return; set(x, y, M.FEU, a); chaud[y * W + x] = c; }
  // chauffer (T > AMB) ou refroidir (T < AMB) une zone, en pixels
  function chauffer(px, py, r, T, k = 0.6) {
    forRadius(px, py, r, (x, y, i, m) => {
      const dx = (x + 0.5) * CS - px, dy = (y + 0.5) * CS - py, f = k * (1 - 0.5 * Math.sqrt(dx * dx + dy * dy) / Math.max(1, r));
      if (m === M.FEU && T < AMB) { setI(i, M.VAPEUR, 20); return; }
      temp[i] = Math.max(0, Math.min(255, Math.round(temp[i] + (T - temp[i]) * f)));
      chauffeChunk(i); touch(i);
    });
  }
  function tempAt(px, py) { const x = Math.floor(px / CS), y = Math.floor(py / CS); return inB(x, y) ? temp[y * W + x] : AMB; }
  function tempMax(px, py, r) { let t = 0; forRadius(px, py, r, (x, y, i) => { if (temp[i] > t) t = temp[i]; }); return t; }
  function tempMin(px, py, r) { let t = 255; forRadius(px, py, r, (x, y, i) => { if (temp[i] < t) t = temp[i]; }); return t; }
  function swap(i, j) {
    const m = mat[i], a = aux[i], e = elec[i], c = chaud[i], t = temp[i];
    mat[i] = mat[j]; aux[i] = aux[j]; elec[i] = elec[j]; chaud[i] = chaud[j]; temp[i] = temp[j];
    mat[j] = m; aux[j] = a; elec[j] = e; chaud[j] = c; temp[j] = t;
    upd[i] = frame & 255; upd[j] = frame & 255;
    touch(i); touch(j);
  }
  function wake(x, y) { if (inB(x, y)) touch(y * W + x); }
  function evt(kind, x, y) { if (onEvent) onEvent(kind, x * CS + CS / 2, y * CS + CS / 2); }
  const rnd = Math.random;

  // ---------- Pas de simulation ----------
  function step(camCells) {
    frame++;
    explosions = 0;
    const f = frame & 255;
    // réveils aléatoires (processus lents loin de l'action)
    for (let k = 0; k < 6; k++) { const c = (rnd() * CW * CHn) | 0; if (chunkActive[c] <= frame) chunkActive[c] = frame + 1; }
    for (const z of gzones) { const c0x = Math.max(0, Math.floor((z.x - z.r) / CPX)), c1x = Math.min(CW - 1, Math.floor((z.x + z.r) / CPX)), c0y = Math.max(0, Math.floor((z.y - z.r) / CPX)), c1y = Math.min(CHn - 1, Math.floor((z.y + z.r) / CPX)); for (let cy = c0y; cy <= c1y; cy++) for (let cx = c0x; cx <= c1x; cx++) chunkActive[cy * CW + cx] = frame + 2; }
    const ltr = (frame & 1) === 0;
    for (let cy = CHn - 1; cy >= 0; cy--) {
      for (let cx = 0; cx < CW; cx++) {
        const c = cy * CW + cx;
        if (chunkActive[c] <= frame) continue;
        const y0 = cy * CH, y1 = Math.min(H, y0 + CH), x0 = cx * CH, x1 = Math.min(W, x0 + CH);
        let hasLiquid = 0;
        for (let y = y1 - 1; y >= y0; y--) {
          if (ltr) { for (let x = x0; x < x1; x++) { const i = y * W + x; if (upd[i] === f) continue; const m = mat[i]; if (m) { if (P[m].liquid) hasLiquid = 1; cellT(x, y, i, m, f); } } }
          else { for (let x = x1 - 1; x >= x0; x--) { const i = y * W + x; if (upd[i] === f) continue; const m = mat[i]; if (m) { if (P[m].liquid) hasLiquid = 1; cellT(x, y, i, m, f); } } }
        }
        chunkHasLiquid[c] = hasLiquid;
      }
    }
    // bulles de temps accéléré : la matière y fait des pas supplémentaires
    for (const z of tzones) {
      if (z.f <= 1) continue;
      const x0 = Math.max(0, Math.floor((z.x - z.r) / CS)), x1 = Math.min(W - 1, Math.floor((z.x + z.r) / CS)), y0 = Math.max(0, Math.floor((z.y - z.r) / CS)), y1 = Math.min(H - 1, Math.floor((z.y + z.r) / CS));
      for (let pass = 1; pass < Math.min(4, Math.round(z.f)); pass++) {
        const ff = (frame + 101 * pass) & 255;
        for (let y = y1; y >= y0; y--) for (let x = x0; x <= x1; x++) { const px = (x + 0.5) * CS, py = (y + 0.5) * CS; if (z.rect ? px < z.rect.x0 || px > z.rect.x1 || py < z.rect.y0 || py > z.rect.y1 : (px - z.x) * (px - z.x) + (py - z.y) * (py - z.y) > z.r * z.r) continue; const i = y * W + x; if (upd[i] === ff) continue; const m = mat[i]; if (m) { upd[i] = ff; cell(x, y, i, m, ff); } }
      }
      for (let cy = Math.floor(y0 / CH); cy <= Math.floor(y1 / CH); cy++) for (let cx = Math.floor(x0 / CH); cx <= Math.floor(x1 / CH); cx++) { const c = cy * CW + cx; if (chunkActive[c] <= frame) chunkActive[c] = frame + 2; }
    }
    if (frame % 3 === 0) stepChaleur();
    if (effondre) { traiterFissures(); majBlocs(); }
  }
  // ---------- Chaleur : conduction de l'écart à la température naturelle, retour au calme, changements d'état ----------
  function stepChaleur() {
    const N = W * H;
    for (let c = 0; c < CW * CHn; c++) {
      if (chunkHeat[c] <= frame) continue;
      const cx = c % CW, cy = (c - cx) / CW, x0 = cx * CH, y0 = cy * CH, x1 = Math.min(W, x0 + CH), y1 = Math.min(H, y0 + CH);
      let vivant = false, redraw = false;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const i = y * W + x, m = mat[i];
        const e = EMET[m] ? emitT(i, m) : 0;
        if (e) { temp[i] = e; vivant = true;
          // rayonnement : l'air juste au-dessus d'une flamme ou de la lave brûle
          if (m === M.LAVE || m === M.FEU) { const kr = m === M.LAVE ? 0.35 : 0.15, nr = m === M.LAVE ? 3 : 2; let j = i - W; for (let dd = 1; dd <= nr && j >= 0 && mat[j] === M.AIR; dd++, j -= W) { const tt = temp[j], tg = e - 26 * dd; if (tt < tg) temp[j] = tt + (((tg - tt) * kr) | 0); } }
          if (x === x0 || y === y0 || x === x1 - 1 || y === y1 - 1) { if (x === x0 && cx > 0) chunkHeat[c - 1] = frame + 60; if (x === x1 - 1 && cx < CW - 1) chunkHeat[c + 1] = frame + 60; if (y === y0 && cy > 0) chunkHeat[c - CW] = frame + 60; if (y === y1 - 1 && cy < CHn - 1) chunkHeat[c + CW] = frame + 60; } continue; }
        const t = temp[i], n0 = NAT[m]; let d = t - n0; let any = d > 1 || d < -1; const cm = COND[m]; let flux = 0;
        for (let k = 0; k < 4; k++) {
          const j = k === 0 ? i - W : k === 1 ? i + W : k === 2 ? (x > 0 ? i - 1 : -1) : (x < W - 1 ? i + 1 : -1);
          if (j < 0 || j >= N) continue;
          const nj = mat[j], ej = EMET[nj] ? emitT(j, nj) : 0, dj = ej ? ej - AMB : temp[j] - NAT[nj];
          if (dj > 1 || dj < -1) any = true; else if (!any) continue;
          flux += (ej ? 0.45 : cm < COND[nj] ? cm : COND[nj]) * (dj - d);
        }
        if (!any) continue;
        d = (d + flux * 0.55) * (1 - RELAX[m] * 1.5);
        let nt = n0 + d; nt = nt < 0 ? 0 : nt > 255 ? 255 : nt; nt = (nt + rnd()) | 0; if (nt > 255) nt = 255;
        if (visT(t, m) !== visT(nt, m)) redraw = true;
        temp[i] = nt;
        // l'air chaud monte
        if (m === M.AIR && nt > AMB + 6 && y > 0 && mat[i - W] === M.AIR && temp[i - W] < nt && rnd() < 0.6) { temp[i] = temp[i - W]; temp[i - W] = nt; }
        // l'air froid descend
        else if (m === M.AIR && nt < AMB - 6 && i + W < N && mat[i + W] === M.AIR && temp[i + W] > nt && rnd() < 0.5) { temp[i] = temp[i + W]; temp[i + W] = nt; }
        if (nt - n0 > 1 || nt - n0 < -1) { vivant = true; if ((x === x0 && cx > 0) || (x === x1 - 1 && cx < CW - 1) || (y === y0 && cy > 0) || (y === y1 - 1 && cy < CHn - 1)) { if (x === x0 && cx > 0) chunkHeat[c - 1] = Math.max(chunkHeat[c - 1], frame + 20); if (x === x1 - 1 && cx < CW - 1) chunkHeat[c + 1] = Math.max(chunkHeat[c + 1], frame + 20); if (y === y0 && cy > 0) chunkHeat[c - CW] = Math.max(chunkHeat[c - CW], frame + 20); if (y === y1 - 1 && cy < CHn - 1) chunkHeat[c + CW] = Math.max(chunkHeat[c + CW], frame + 20); } }
        if (nt >= 100 || nt <= 50) etat(x, y, i, m, nt);
      }
      if (vivant) chunkHeat[c] = frame + 60;
      if (redraw) chunkDirty[c] = 1;
    }
  }
  function etat(x, y, i, m, t) {
    switch (m) {
      case M.AIR: if (t <= 24 && rnd() < 0.004) { setI(i, M.NEIGE); temp[i] = t; } break;
      case M.EAU: if (t >= 112) { setI(i, M.VAPEUR, 70); evt('ebullition', x, y); } else if (t <= 44) { setI(i, M.GLACE); temp[i] = t; evt('gel', x, y); } break;
      case M.SAUMURE: if (t >= 116) { setI(i, rnd() < 0.3 ? M.SEL : M.VAPEUR, 70); } else if (t <= 28) { setI(i, M.GLACE); temp[i] = t; } break;
      case M.GLACE: if (t >= 74) { setI(i, M.EAU); evt('fonte', x, y); } break;
      case M.NEIGE: if (t >= 70) { setI(i, M.EAU); evt('fonte', x, y); } break;
      case M.VAPEUR: if (t <= 50) setI(i, M.EAU); break;
      case M.BOUE: if (t >= 106) setI(i, M.TERRE); break;
      case M.BOIS: if (t >= 165 && aux[i] === 0 && rnd() < 0.35 * feuMul) { aux[i] = P[m].burn; touch(i); evt('incendie', x, y); } break;
      case M.PLANTE: case M.HERBE: if (t >= 150 && aux[i] === 0 && rnd() < 0.3 * feuMul) { aux[i] = P[m].burn; touch(i); if (rnd() < 0.2) evt('incendie', x, y); } break;
      case M.MOUSSE: if (t >= 155 && aux[i] === 0 && rnd() < 0.3 * feuMul) { aux[i] = 20; touch(i); } break;
      case M.HUILE: case M.SEVE: if (t >= 138) { setI(i, M.FEU, P[m].burn); evt('incendie', x, y); } break;
      case M.POUDRE: if (t >= 135) explode(x, y, 5); break;
      case M.SABLE: if (t >= 205) { setI(i, M.VERRE); temp[i] = t; evt('verre', x, y); } break;
      case M.LAVE: if (t < 150) { setI(i, M.OBSIDIENNE); temp[i] = t; evt('obsidienne', x, y); } break;
      case M.PIERRE: case M.TERRE: case M.VERRE: case M.SEL: case M.CRISTAL: if (t >= 236) { setI(i, M.LAVE); evt('magma', x, y); } break;
      case M.METAL: if (t >= 245) { setI(i, M.LAVE); evt('magma', x, y); } break;
    }
  }
  // ---------- Effondrement ----------
  const LIM_BLOC = 2600;
  function traiterFissures() {
    let budget = 9000, n = 0; const lot = visGen + 1;
    while (fiss.length && budget > 0 && n < 10) {
      const b = fiss.shift(); n++;
      const BW = Math.ceil(W / 4), bx = (b % BW) * 4, by = ((b / BW) | 0) * 4;
      // tout le carreau et son pourtour : les bords de la coupure
      for (let y = Math.max(0, by - 1); y <= Math.min(H - 1, by + 4); y++) for (let x = Math.max(0, bx - 1); x <= Math.min(W - 1, bx + 4); x++) {
        const j = y * W + x;
        if (!STRUCT[mat[j]] || enBloc[j] || sure[j] === frame || vis[j] >= lot) continue;
        budget -= flotte(j);
      }
    }
  }
  // explore le morceau qui contient s ; s'il ne tient à rien, il devient un bloc qui tombe. Renvoie le coût.
  function flotte(s) {
    visGen++; const g = visGen, st = [s], comp = []; vis[s] = g; let ancreOk = false;
    while (st.length) {
      const a = st.pop(); comp.push(a);
      const x = a % W;
      // sous la surface d'origine, la roche tient au reste du monde
      if (comp.length > LIM_BLOC || ancre[a] || a >= W * (H - 2) || sure[a] === frame || (surf && (a - x) / W > surf[x] + 12)) { ancreOk = true; break; }
      // l'ordre fait descendre d'abord : on trouve vite le sol
      if (a >= W) { const j = a - W; if (vis[j] !== g && STRUCT[mat[j]] && !enBloc[j]) { vis[j] = g; st.push(j); } }
      if (x > 0) { const j = a - 1; if (vis[j] !== g && STRUCT[mat[j]] && !enBloc[j]) { vis[j] = g; st.push(j); } }
      if (x < W - 1) { const j = a + 1; if (vis[j] !== g && STRUCT[mat[j]] && !enBloc[j]) { vis[j] = g; st.push(j); } }
      { const j = a + W; if (j < W * H && vis[j] !== g && STRUCT[mat[j]] && !enBloc[j]) { vis[j] = g; st.push(j); } }
    }
    if (ancreOk) { for (const a of comp) sure[a] = frame; return comp.length + 20; }
    creerBloc(comp, g);
    return comp.length + 20;
  }
  function creerBloc(comp, g) {
    // les herbes, plantes et mousses accrochées suivent (si elles ne tiennent pas ailleurs)
    const pass = []; const q = comp.slice();
    while (q.length && pass.length < 900) {
      const a = q.pop(); const x = a % W;
      for (const j of [a - W, a + W, x > 0 ? a - 1 : -1, x < W - 1 ? a + 1 : -1]) {
        if (j < 0 || j >= W * H || vis[j] === g || !PASSAGER[mat[j]]) continue;
        vis[j] = g; const xj = j % W; let tient = false;
        for (const k of [j - W, j + W, xj > 0 ? j - 1 : -1, xj < W - 1 ? j + 1 : -1]) if (k >= 0 && k < W * H && STRUCT[mat[k]] && vis[k] !== g) tient = true;
        if (!tient) { pass.push(j); q.push(j); }
      }
    }
    const cells = comp.concat(pass).sort((a, b) => b - a);
    let leger = 0, glace = 0, x0 = W, x1 = 0, y0 = H, y1 = 0;
    for (const a of cells) { enBloc[a] = 1; const m = mat[a]; if (m === M.BOIS || PASSAGER[m]) leger++; else if (m === M.GLACE) glace++; const x = a % W, y = (a - x) / W; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const dens = leger > cells.length * 0.6 ? 1.4 : glace + leger > cells.length * 0.6 ? 1.8 : 6;
    blocs.push({ cells, n: comp.length, vy: 0, acc: 0, dens, x0, x1, y0, y1, chute: 0, pose: false, impact: 0 });
    if (onEvent) onEvent('effondrement', (x0 + x1 + 1) / 2 * CS, (y0 + y1 + 1) / 2 * CS);
  }
  function majBlocs() {
    for (let k = blocs.length - 1; k >= 0; k--) {
      const b = blocs[k];
      if (b.pose) { blocs.splice(k, 1); continue; }
      b.vy = Math.min(3, b.vy + 0.07); b.acc += b.vy;
      while (b.acc >= 1) { b.acc -= 1; if (!descendre(b)) { atterrir(b); break; } }
    }
  }
  function descendre(b) {
    // les cases qui ont changé de nature (fondu, brûlé, rongé) quittent le bloc
    let n = 0; for (let k = 0; k < b.cells.length; k++) { const a = b.cells[k]; if (STRUCT[mat[a]] || PASSAGER[mat[a]]) b.cells[n++] = a; else enBloc[a] = 0; }
    b.cells.length = n; if (!n) return false;
    for (const a of b.cells) {
      const j = a + W; if (j >= W * H) return false;
      if (enBloc[j]) continue;
      const q = P[mat[j]];
      if (mat[j] === M.AIR || q.gas) continue;
      if (q.liquid && q.dens < b.dens) continue;
      return false;
    }
    for (let k = 0; k < b.cells.length; k++) { const a = b.cells[k], j = a + W; swap(a, j); enBloc[a] = 0; enBloc[j] = 1; b.cells[k] = j; }
    b.y0++; b.y1++; b.chute++;
    return true;
  }
  function atterrir(b) {
    b.pose = true; b.impact = b.vy;
    for (const a of b.cells) enBloc[a] = 0;
    if (b.vy > 0.9) {
      const set0 = new Set(b.cells);
      for (const a of b.cells) {
        if (set0.has(a + W)) continue; const m = mat[a], r = rnd();
        if (m === M.PIERRE && r < 0.35) setI(a, M.SABLE);
        else if (m === M.TERRE && r < 0.5) setI(a, M.MEUBLE);
        else if (m === M.GLACE && r < 0.4) setI(a, M.NEIGE);
        else if ((m === M.VERRE || m === M.CRISTAL) && r < 0.6) setI(a, M.AIR);
      }
    }
    if (onEvent) onEvent('eboulement', (b.x0 + b.x1 + 1) / 2 * CS, (b.y1 + 1) * CS);
  }
  // au chargement : ce qui flotte déjà (îles volantes...) est ancré par magie
  function ancrer() {
    ancre.fill(0); enBloc.fill(0); fiss = []; blocs = []; if (fissStamp) fissStamp.fill(0);
    const seen = new Uint8Array(W * H), stk = [];
    for (let x = 0; x < W; x++) for (const y of [H - 1, H - 2]) { const i = y * W + x; if (STRUCT[mat[i]] && !seen[i]) { seen[i] = 1; stk.push(i); } }
    while (stk.length) { const a = stk.pop(); const x = a % W; for (const j of [a - W, a + W, x > 0 ? a - 1 : -1, x < W - 1 ? a + 1 : -1]) if (j >= 0 && j < W * H && !seen[j] && STRUCT[mat[j]]) { seen[j] = 1; stk.push(j); } }
    let n = 0; for (let i = 0; i < W * H; i++) if (STRUCT[mat[i]] && !seen[i]) { ancre[i] = 1; n++; }
    for (let i = 0; i < W * H; i++) temp[i] = NAT[mat[i]];
    chunkHeat.fill(frame + 4);
    return n;
  }

  function cell(x, y, i, m, f) {
    const p = P[m];
    // électricité
    if (elec[i] > 0) {
      elec[i]--; touch(i);
      if (p.cond && elec[i] > 1) {
        for (const d of [1, -1, W, -W]) { const j = i + d; if (j < 0 || j >= W * H) continue; const n = mat[j]; if (P[n].cond && elec[j] < elec[i] - 1) { elec[j] = elec[i] - 1; touch(j); if (rnd() < 0.002) evt('conduction', x, y); } else if (n === M.HUILE && rnd() < 0.3) { setI(j, M.FEU, 25); } }
      }
    }
    if (p.powder) stepPowder(x, y, i, m, p);
    else if (p.liquid) stepLiquid(x, y, i, m, p);
    else if (p.gas) stepGas(x, y, i, m, p);
    else stepSolid(x, y, i, m, p);
  }
  function canEnter(j, dens) { const n = mat[j]; const q = P[n]; return n === M.AIR || q.gas || (q.liquid && q.dens < dens); }

  function stepPowder(x, y, i, m, p) {
    if (m === M.NEIGE && hotNear(i)) { setI(i, M.EAU); evt('fonte', x, y); return; }
    if (m === M.POUDRE && (hotNear(i) || elec[i] > 0)) { explode(x, y, 5); return; }
    if (m === M.SEL) { const d = [1, -1, W, -W][(rnd() * 4) | 0]; const j = i + d; if (j >= 0 && j < W * H && mat[j] === M.EAU && rnd() < 0.08) { setI(j, M.SAUMURE); setI(i, rnd() < 0.5 ? M.SAUMURE : M.AIR); evt('sel', x, y); return; } if (j >= 0 && j < W * H && (mat[j] === M.GLACE || mat[j] === M.NEIGE) && rnd() < 0.1) { setI(j, M.SAUMURE); evt('fonte', x, y); if (rnd() < 0.3) { setI(i, M.SAUMURE); return; } } }
    const [gx, gy, mag] = gzones.length ? gravAt(x, y) : [0, 1, 1];
    if (mag === 0) { if (rnd() < 0.15) { const d = [[1, 0], [-1, 0], [0, 1], [0, -1]][(rnd() * 4) | 0]; const nx = x + d[0], ny = y + d[1]; if (cellIn(nx, ny) && canEnter(ny * W + nx, 9)) swap(i, ny * W + nx); } return; }
    const bx = x + gx, by = y + gy; if (!cellIn(bx, by)) return;
    const b = by * W + bx;
    if (canEnter(b, 9)) { swap(i, b); if (m === M.MEUBLE) aux[b] = 0; if (mag > 1 && cellIn(bx + gx, by + gy) && canEnter((by + gy) * W + bx + gx, 9)) swap(b, (by + gy) * W + bx + gx); return; }
    const sx = -gy, sy = gx; // perpendiculaire
    const dir = rnd() < 0.5 ? 1 : -1;
    // la terre meuble glisse peu (elle fait des tas), puis se tasse en terre une fois au repos
    if (m !== M.MEUBLE || rnd() < 0.3) for (const d of [dir, -dir]) {
      const nx = x + sx * d, ny = y + sy * d; if (!cellIn(nx, ny)) continue;
      const dx2 = nx + gx, dy2 = ny + gy; if (!cellIn(dx2, dy2)) continue;
      if (!P[mat[ny * W + nx]].solid && canEnter(dy2 * W + dx2, 9)) { swap(i, dy2 * W + dx2); return; }
    }
    if (m === M.MEUBLE) { aux[i]++; touch(i); if (aux[i] > 14) setI(i, M.TERRE); }
  }
  let explosions = 0;
  function explode(cx, cy, r) {
    if (explosions > 6) return; explosions++;
    for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
      if (!cellIn(x, y)) continue; const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy); if (d2 > r * r) continue;
      const j = y * W + x, m = mat[j];
      if (m === M.OBSIDIENNE || m === M.METAL) continue;
      if (m === M.POUDRE) { setI(j, M.FEU, 6); continue; }
      if (m !== M.AIR && rnd() < (P[m].liquid ? 0.4 : 0.85)) setI(j, d2 < r * r * 0.3 ? M.FEU : rnd() < 0.5 ? M.FUMEE : M.AIR, 20 + (rnd() * 20) | 0);
      else if (m === M.AIR && rnd() < 0.3) setI(j, M.FUMEE, 30);
    }
    if (onEvent) onEvent('explosion', (cx + 0.5) * CS, (cy + 0.5) * CS);
  }
  function hotNear(i) {
    for (const d of [1, -1, W, -W]) { const j = i + d; if (j >= 0 && j < W * H && P[mat[j]].hot) return true; }
    return false;
  }
  function stepLiquid(x, y, i, m, p) {
    // réactions
    if (m === M.EAU) {
      for (const d of [1, -1, W, -W]) {
        const j = i + d; if (j < 0 || j >= W * H) continue; const n = mat[j];
        if (n === M.LAVE) { setI(j, M.OBSIDIENNE); setI(i, M.VAPEUR, 60); evt('obsidienne', x, y); return; }
        if (n === M.ACIDE && rnd() < 0.02) { setI(j, M.EAU); evt('dilution', x, y); }
        if (n === M.TERRE && d === W && rnd() < 0.0003) { setI(j, M.BOUE, 160); evt('boue', x, y); }
      }
      if (sunny && y > 0 && mat[i - W] === M.AIR && rnd() < 0.00012) { setI(i, M.VAPEUR, 120); return; }
    } else if (m === M.BOUE) {
      if (aux[i] === 0) aux[i] = 120 + ((rnd() * 80) | 0);
      let mouille = false; for (const d of [1, -1, W, -W]) { const j = i + d; if (j >= 0 && j < W * H && (mat[j] === M.EAU || mat[j] === M.SAUMURE)) mouille = true; }
      if (!mouille && sunny && rnd() < 0.05) { aux[i]--; touch(i); if (aux[i] <= 1) { setI(i, M.TERRE); evt('boue_seche', x, y); return; } }
      if (hotNear(i) && rnd() < 0.05) { setI(i, M.TERRE); return; }
      if (rnd() < 0.6) return; // très lente
    } else if (m === M.MIEL) {
      if (hotNear(i) && rnd() < 0.02) { setI(i, M.FUMEE, 30); return; }
      if (rnd() < 0.85) return; // coule à peine
    } else if (m === M.HUILE || m === M.SEVE) {
      if (hotNear(i) && rnd() < p.flam) { setI(i, M.FEU, p.burn); evt(m === M.HUILE ? 'huile_feu' : 'incendie', x, y); return; }
      if (m === M.HUILE && y > 0 && mat[i - W] === M.EAU && rnd() < 0.05) evt('flottaison', x, y);
    } else if (m === M.ACIDE) {
      const d = [1, -1, W, -W][(rnd() * 4) | 0]; const j = i + d;
      if (j >= 0 && j < W * H) {
        const n = mat[j]; const q = P[n];
        if (q.corrode > 0 && rnd() < q.corrode * 0.12) { setI(j, rnd() < 0.5 ? M.FUMEE : M.AIR, 20); if (rnd() < 0.35) setI(i, M.AIR); evt('corrosion', x, y); return; }
      }
    } else if (m === M.LAVE) {
      const d = [1, -1, W, -W][(rnd() * 4) | 0]; const j = i + d;
      if (j >= 0 && j < W * H) {
        const n = mat[j]; const q = P[n];
        if (FLAMMABLE_SOLID(n) && aux[j] === 0 && rnd() < q.flam * 3) { aux[j] = q.burn; touch(j); evt('incendie', x, y); }
        else if (n === M.SABLE && rnd() < 0.2) { setI(j, M.VERRE); evt('verre', x, y); }
        else if ((n === M.NEIGE || n === M.GLACE) && rnd() < 0.3) { setI(j, M.EAU); evt('fonte', x, y); }
      }
    }
    const [gx, gy, mag] = gzones.length ? gravAt(x, y) : [0, 1, 1];
    if (mag === 0) { if (rnd() < 0.2) { const d = [[1, 0], [-1, 0], [0, 1], [0, -1]][(rnd() * 4) | 0]; const nx = x + d[0], ny = y + d[1]; if (cellIn(nx, ny) && canEnter(ny * W + nx, p.dens)) swap(i, ny * W + nx); } return; }
    const bx = x + gx, by = y + gy; if (!cellIn(bx, by)) return;
    const b = by * W + bx;
    if (canEnter(b, p.dens)) { if (m !== M.SEVE || rnd() < 0.25) swap(i, b); return; }
    const sx = -gy, sy = gx;
    const dir = rnd() < 0.5 ? 1 : -1;
    for (const d of [dir, -dir]) {
      const nx = x + sx * d, ny = y + sy * d; if (!cellIn(nx, ny)) continue;
      const dx2 = nx + gx, dy2 = ny + gy; if (!cellIn(dx2, dy2)) continue;
      if (!P[mat[ny * W + nx]].solid && canEnter(dy2 * W + dx2, p.dens)) { if (m !== M.SEVE || rnd() < 0.1) swap(i, dy2 * W + dx2); return; }
    }
    if (p.flow === 0) return;
    // étalement perpendiculaire à la gravité
    for (let k = 1; k <= p.flow; k++) {
      const nx = x + sx * dir * k, ny = y + sy * dir * k; if (!cellIn(nx, ny)) break;
      const j = ny * W + nx; const n = mat[j];
      if (n === M.AIR || P[n].gas) { swap(i, j); return; }
      if (n !== m && !(P[n].liquid && P[n].dens <= p.dens)) break;
    }
  }
  function stepGas(x, y, i, m, p) {
    if (m === M.GAZ && (hotNear(i) || temp[i] > 160)) { explode(x, y, 3); return; }
    if (aux[i] > 0) aux[i]--;
    if (aux[i] === 0) {
      if (m === M.VAPEUR) { if (rnd() < 0.3) { setI(i, M.EAU); evt('condensation', x, y); } else setI(i, M.AIR); }
      else if (m === M.FEU) setI(i, rnd() < 0.35 ? M.FUMEE : M.AIR, 30);
      else setI(i, M.AIR);
      return;
    }
    touch(i);
    if (m === M.FEU) {
      for (const d of [1, -1, W, -W]) {
        const j = i + d; if (j < 0 || j >= W * H) continue; const n = mat[j]; const q = P[n];
        if (n === M.EAU) { setI(i, M.VAPEUR, 50); evt('vapeur', x, y); return; }
        if (FLAMMABLE_SOLID(n) && aux[j] === 0 && rnd() < q.flam * feuMul) { aux[j] = q.burn; touch(j); evt('incendie', x, y); }
        else if ((n === M.HUILE || n === M.SEVE) && rnd() < q.flam) { setI(j, M.FEU, q.burn); evt('incendie', x, y); }
        else if ((n === M.GLACE || n === M.NEIGE) && rnd() < 0.15) { setI(j, M.EAU); evt('fonte', x, y); }
        if (chaud[i]) {
          const c = chaud[i];
          if ((n === M.GLACE || n === M.NEIGE) && rnd() < 0.6) setI(j, M.EAU);
          else if (n === M.SABLE && rnd() < 0.06 * c) { setI(j, M.VERRE); evt('verre', x, y); }
          else if (c >= 2 && (n === M.PIERRE || n === M.TERRE || n === M.METAL || n === M.VERRE || n === M.SABLE || n === M.CRISTAL || n === M.OBSIDIENNE || n === M.SEL) && rnd() < (n === M.OBSIDIENNE ? 0.01 : n === M.METAL ? 0.035 : 0.06)) { setI(j, M.LAVE); evt('magma', x, y); }
        }
      }
      if (rnd() < 0.45) return; // le feu reste près de son combustible
    }
    const [gx, gy, mag] = gzones.length ? gravAt(x, y) : [0, 1, 1];
    const ux = x - gx * (mag ? 1 : 0), uy = y - gy * (mag ? 1 : 0);
    if (uy < 0 && mag) { setI(i, M.AIR); return; }
    if (!cellIn(ux, uy)) return;
    const u = uy * W + ux;
    const r = rnd();
    if (mag && r < 0.6 && (mat[u] === M.AIR || P[mat[u]].liquid)) { swap(i, u); return; }
    const sx = mag ? -gy : 1, sy = mag ? gx : 0;
    const dir = rnd() < 0.5 ? 1 : -1;
    const nx = ux + sx * dir, ny = uy + sy * dir, lx = x + sx * dir, ly = y + sy * dir;
    if (cellIn(nx, ny) && r < 0.85 && mat[ny * W + nx] === M.AIR) { swap(i, ny * W + nx); return; }
    if (cellIn(lx, ly) && mat[ly * W + lx] === M.AIR) { swap(i, ly * W + lx); return; }
    if (!mag && rnd() < 0.5) { const d = [[0, 1], [0, -1]][(rnd() * 2) | 0]; const qx = x + d[0], qy = y + d[1]; if (cellIn(qx, qy) && mat[qy * W + qx] === M.AIR) swap(i, qy * W + qx); }
  }
  function stepSolid(x, y, i, m, p) {
    if (FLAMMABLE_SOLID(m)) {
      if (aux[i] > 0) {
        aux[i]--; touch(i);
        const d = [1, -1, W, -W][(rnd() * 4) | 0]; const j = i + d;
        if (j >= 0 && j < W * H && mat[j] === M.AIR && rnd() < 0.45) setI(j, M.FEU, 20 + (rnd() * 20) | 0);
        if (aux[i] === 0) { if (m === M.BOIS) { setI(i, M.CENDRE); evt('cendre', x, y); } else if (m === M.PLANTE) setI(i, rnd() < 0.4 ? M.CENDRE : M.AIR); else setI(i, M.AIR); if (onEvent) onEvent('brule', x * CS, y * CS); }
        return;
      }
      if (hotNear(i) && rnd() < p.flam * feuMul) { aux[i] = p.burn; touch(i); evt('incendie', x, y); }
      return;
    }
    if (m === M.GLACE) { if (hotNear(i) && rnd() < 0.25) { setI(i, M.EAU); evt('fonte', x, y); } return; }
    if (m === M.PIERRE && rnd() < 0.002) {
      // pierre humide et à l'air : la mousse s'y installe
      let eau = false, air = -1;
      for (const d of [1, -1, W, -W]) { const j = i + d; if (j < 0 || j >= W * H) continue; const n = mat[j]; if (n === M.EAU || n === M.SAUMURE || n === M.MOUSSE) eau = true; if (n === M.AIR) air = j; }
      if (eau && air >= 0) { setI(air, M.MOUSSE); evt('mousse', x, y); }
    }
    if (m === M.MOUSSE) { if (aux[i] > 0) { aux[i]--; touch(i); if (aux[i] === 0) setI(i, M.AIR); else if (rnd() < 0.3) { const j = i - W; if (j >= 0 && mat[j] === M.AIR) setI(j, M.FEU, 10); } return; } if (hotNear(i) && rnd() < 0.02 * feuMul) { aux[i] = 20; touch(i); } }
  }

  // ---------- Requêtes pour les entités (coordonnées pixels) ----------
  const cellOf = (px) => Math.floor(px / CS);
  function matAt(px, py) { return get(cellOf(px), cellOf(py)); }
  function solidAt(px, py) { const x = cellOf(px), y = cellOf(py); if (y < 0) return false; if (x < 0 || x >= W || y >= H) return true; return P[mat[y * W + x]].solid === 1; }
  function rectBlocked(r) {
    const x0 = cellOf(r.x), x1 = cellOf(r.x + r.w - 0.01), y0 = cellOf(r.y), y1 = cellOf(r.y + r.h - 0.01);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { if (y < 0) continue; if (x < 0 || x >= W || y >= H) return true; if (P[mat[y * W + x]].solid) return true; }
    return false;
  }
  function rectHas(r, pred) {
    const x0 = cellOf(r.x), x1 = cellOf(r.x + r.w - 0.01), y0 = cellOf(r.y), y1 = cellOf(r.y + r.h - 0.01);
    for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) { const i = y * W + x; if (pred(mat[i], i)) return true; }
    return false;
  }
  function forRadius(px, py, r, fn) {
    const cx = cellOf(px), cy = cellOf(py), rc = Math.ceil(r / CS);
    for (let y = Math.max(0, cy - rc); y <= Math.min(H - 1, cy + rc); y++) for (let x = Math.max(0, cx - rc); x <= Math.min(W - 1, cx + rc); x++) {
      const dx = (x + 0.5) * CS - px, dy = (y + 0.5) * CS - py;
      if (dx * dx + dy * dy <= r * r) { const i = y * W + x; fn(x, y, i, mat[i]); }
    }
  }
  function raycast(px, py, dx, dy, len) {
    for (let t = 0; t < len; t += CS * 0.5) { const x = px + dx * t, y = py + dy * t; if (solidAt(x, y)) return { x, y, t }; }
    return null;
  }
  function countRect(x0, y0, x1, y1, m) { let n = 0; for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) if (mat[y * W + x] === m) n++; return n; }
  function countAround(px, py, r, m) { let n = 0; forRadius(px, py, r, (x, y, i, q) => { if (q === m) n++; }); return n; }

  // ---------- Rendu par morceaux ----------
  const COLORS = {};
  for (let m = 0; m < P.length; m++) COLORS[m] = P[m].color;
  function renderChunk(c) {
    let cv = chunkCv[c];
    if (!cv) { cv = document.createElement('canvas'); cv.width = CPX; cv.height = CPX; chunkCv[c] = cv; }
    const g = cv.getContext('2d');
    g.clearRect(0, 0, CPX, CPX);
    const cx = c % CW, cy = (c - cx) / CW;
    const x0 = cx * CH, y0 = cy * CH, x1 = Math.min(W, x0 + CH), y1 = Math.min(H, y0 + CH);
    const lights = [];
    let anySolid = false, plein = 0;
    // 1. remplissages
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = y * W + x; const m = mat[i];
        if (!m) { const t = temp[i]; if (t > 118 || t < 40) { plein = 1; g.fillStyle = t > 118 ? '#f08a3a' : '#cfe8f6'; g.globalAlpha = t > 118 ? Math.min(0.22, (t - 118) / 300) : Math.min(0.3, (40 - t) / 60); g.fillRect((x - x0) * CS, (y - y0) * CS, CS, CS); g.globalAlpha = 1; } continue; }
        plein = 1;
        const p = P[m]; const lx = (x - x0) * CS, ly = (y - y0) * CS;
        if (p.solid && !p.powder) anySolid = true;
        if (m === M.FEU) {
          const hh = CS * (1.4 + U.hash2(x + (frame >> 1), y) * 1.2) * Math.min(1, 0.5 + aux[i] / 30);
          FX.flamme(g, lx + CS / 2, ly + CS, hh, CS * 0.95, frame / 30 + x, chaud[i], 0.85);
          if (((x & 3) === 0) && ((y & 3) === 0)) lights.push({ x: (x + 0.5) * CS, y: (y + 0.5) * CS, r: 70 });
          continue;
        }
        if (p.gas) {
          g.fillStyle = p.color; g.globalAlpha = p.alpha * Math.min(1, aux[i] / 30);
          g.beginPath(); g.arc(lx + CS / 2, ly + CS / 2, CS * 0.9, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
          continue;
        }
        g.fillStyle = p.color; g.globalAlpha = p.alpha;
        if (m === M.LAVE) { g.fillStyle = U.hash2(x, y + (frame >> 3)) < 0.5 ? '#e0622b' : '#f0a040'; }
        g.fillRect(lx, ly, CS, CS);
        g.globalAlpha = 1;
        if (p.light && ((x & 3) === 0) && ((y & 3) === 0)) lights.push({ x: (x + 0.5) * CS, y: (y + 0.5) * CS, r: m === M.LAVE ? 90 : 60 });
        if ((m === M.BOIS || m === M.PLANTE || m === M.HERBE) && aux[i] > 0) { g.fillStyle = U.hash2(x, y + (frame >> 2)) < 0.5 ? '#e0642a' : '#f0a040'; g.globalAlpha = 0.55; g.fillRect(lx, ly, CS, CS); g.globalAlpha = 1; if (((x & 3) === 0) && ((y & 3) === 0)) lights.push({ x: (x + 0.5) * CS, y: (y + 0.5) * CS, r: 60 }); }
        { const t = temp[i]; if (t > 124 && m !== M.LAVE) { g.fillStyle = t > 200 ? '#f6d080' : t > 165 ? '#f08a3a' : '#c8502a'; g.globalAlpha = Math.min(0.65, (t - 124) / 120); g.fillRect(lx, ly, CS, CS); g.globalAlpha = 1; if (t > 175 && ((x & 3) === 0) && ((y & 3) === 0)) lights.push({ x: (x + 0.5) * CS, y: (y + 0.5) * CS, r: 50 }); } else if (t < 46 && m !== M.GLACE && m !== M.NEIGE && !p.gas) { g.fillStyle = '#e4f2fa'; g.globalAlpha = Math.min(0.55, (46 - t) / 40); g.fillRect(lx, ly, CS, CS); g.globalAlpha = 1; } }
        if (elec[i] > 0 && U.hash2(x, y + frame) < 0.5) { g.fillStyle = '#fff4a0'; g.globalAlpha = 0.6; g.fillRect(lx, ly, CS, CS); g.globalAlpha = 1; }
      }
    }
    // 2. hachures sur les solides pleins (pas les poudres)
    if (anySolid) {
      g.save(); g.beginPath();
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const p = P[mat[y * W + x]]; if (p.solid && !p.powder && p.hatch) g.rect((x - x0) * CS, (y - y0) * CS, CS, CS); }
      g.clip();
      g.strokeStyle = U.INK; g.globalAlpha = 0.28; g.lineWidth = 1;
      const sp = 7; const r = U.mulberry32(c + 11);
      g.beginPath();
      for (let k = -CPX; k < CPX * 2; k += sp) { const o = (r() - 0.5) * 3; g.moveTo(k + o, 0); g.lineTo(k + o + CPX, CPX); }
      g.stroke();
      g.restore();
      // bois : fibres verticales ; plante : feuilles
      g.save(); g.strokeStyle = U.INK; g.globalAlpha = 0.3; g.lineWidth = 1;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const m = mat[y * W + x]; const lx = (x - x0) * CS, ly = (y - y0) * CS;
        if (m === M.BOIS) { g.beginPath(); g.moveTo(lx + 2 + (x & 1), ly); g.lineTo(lx + 2 + (x & 1), ly + CS); g.stroke(); }
        else if (m === M.PLANTE && U.hash2(x, y) < 0.5) { g.beginPath(); g.ellipse(lx + CS / 2, ly + CS / 2, 3.2, 1.8, U.hash2(y, x) * 3, 0, Math.PI * 2); g.stroke(); }
        else if (m === M.HERBE) { g.beginPath(); g.moveTo(lx + 2, ly + CS); g.lineTo(lx + 1, ly + 1); g.moveTo(lx + 4, ly + CS); g.lineTo(lx + 5, ly + 2); g.stroke(); }
        else if (m === M.SABLE || m === M.CENDRE || m === M.NEIGE) { if (U.hash2(x, y) < 0.35) { g.fillStyle = U.INK; g.globalAlpha = m === M.NEIGE ? 0.08 : 0.25; g.fillRect(lx + 1 + ((x * 7 + y * 3) % 4), ly + 1 + ((x * 3 + y * 5) % 4), 1, 1); g.globalAlpha = 0.3; } }
        else if (m === M.GLACE && U.hash2(x, y) < 0.15) { g.strokeStyle = '#7fb4d8'; g.beginPath(); g.moveTo(lx, ly + CS); g.lineTo(lx + CS, ly); g.stroke(); g.strokeStyle = U.INK; }
        else if (m === M.MOUSSE && U.hash2(x, y) < 0.6) { g.fillStyle = '#4e6b2a'; g.globalAlpha = 0.5; g.fillRect(lx + 1 + ((x * 3) % 3), ly + 1 + ((y * 5) % 3), 2, 2); g.globalAlpha = 0.3; }
        else if (m === M.POUDRE && U.hash2(x, y) < 0.5) { g.fillStyle = '#9a4a3a'; g.globalAlpha = 0.5; g.fillRect(lx + 2, ly + 2, 1.5, 1.5); g.globalAlpha = 0.3; }
        else if (m === M.SEL && U.hash2(x, y) < 0.3) { g.strokeStyle = '#a8a29a'; g.beginPath(); g.moveTo(lx + 1, ly + 1); g.lineTo(lx + 3, ly + 3); g.stroke(); g.strokeStyle = U.INK; }
        else if (m === M.CRISTAL) { g.strokeStyle = '#efe3c4'; g.beginPath(); g.moveTo(lx + 1, ly + CS - 1); g.lineTo(lx + CS - 1, ly + 1); g.stroke(); g.strokeStyle = U.INK; }
      }
      g.restore();
    }
    // 3. contours encre : arêtes entre solide et non-solide, en segments fusionnés
    g.save(); g.lineCap = 'round'; g.strokeStyle = U.INK;
    const cls = (x, y) => { const m = get(x, y); const p = P[m]; return p.solid ? (p.powder ? 2 : 1) : p.liquid ? 3 : 0; };
    // arêtes horizontales
    for (let y = y0; y <= y1; y++) {
      let run = -1, kind = 0;
      for (let x = x0; x <= x1; x++) {
        const a = cls(x, y - 1), b = cls(x, y);
        let k = 0;
        if (x < x1 && a !== b) { if ((a >= 1 && a <= 2) !== (b >= 1 && b <= 2)) k = 1; else if (a === 3 || b === 3) k = 3; else k = 2; }
        if (k !== kind || x === x1) {
          if (run >= 0 && kind) edge(g, (run - x0) * CS, (y - y0) * CS, (x - x0) * CS, (y - y0) * CS, kind, run + y * 7);
          run = k ? x : -1; kind = k;
        }
      }
    }
    // arêtes verticales
    for (let x = x0; x <= x1; x++) {
      let run = -1, kind = 0;
      for (let y = y0; y <= y1; y++) {
        const a = cls(x - 1, y), b = cls(x, y);
        let k = 0;
        if (y < y1 && a !== b) { if ((a >= 1 && a <= 2) !== (b >= 1 && b <= 2)) k = 1; else if (a === 3 || b === 3) k = 3; else k = 2; }
        if (k !== kind || y === y1) {
          if (run >= 0 && kind) edge(g, (x - x0) * CS, (run - y0) * CS, (x - x0) * CS, (y - y0) * CS, kind, x + run * 5);
          run = k ? y : -1; kind = k;
        }
      }
    }
    g.restore();
    chunkLights[c] = lights.length ? lights : null;
    chunkVide[c] = plein ? 0 : 1;
    chunkDirty[c] = 0;
  }
  function edge(g, x1, y1, x2, y2, kind, seed) {
    if (kind === 1) { g.globalAlpha = 0.95; g.lineWidth = 2; U.inkLine(g, x1, y1, x2, y2, seed, 1.2); }
    else if (kind === 3) { g.globalAlpha = 0.7; g.lineWidth = 1.4; g.strokeStyle = '#3b6fb6'; U.inkLine(g, x1, y1, x2, y2, seed, 1.5); g.strokeStyle = U.INK; }
    else { g.globalAlpha = 0.25; g.lineWidth = 1; U.inkLine(g, x1, y1, x2, y2, seed, 0.6); }
  }
  function draw(ctx, cam, vw, vh) {
    const cx0 = Math.max(0, Math.floor(cam.x / CPX)), cx1 = Math.min(CW - 1, Math.floor((cam.x + vw) / CPX));
    const cy0 = Math.max(0, Math.floor(cam.y / CPX)), cy1 = Math.min(CHn - 1, Math.floor((cam.y + vh) / CPX));
    let budget = 40; nDraw++;
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      const c = cy * CW + cx;
      // un bloc qui change sans cesse (feu, eau qui coule) n'est redessiné qu'une image sur deux
      if ((!chunkCv[c] || (chunkDirty[c] && nDraw - chunkRendu[c] >= 2)) && budget-- > 0) { renderChunk(c); chunkRendu[c] = nDraw; }
      if (chunkCv[c] && !chunkVide[c]) ctx.drawImage(chunkCv[c], cx * CPX, cy * CPX);
    }
  }
  function lights(cam, vw, vh) {
    const out = [];
    const cx0 = Math.max(0, Math.floor(cam.x / CPX) - 1), cx1 = Math.min(CW - 1, Math.floor((cam.x + vw) / CPX) + 1);
    const cy0 = Math.max(0, Math.floor(cam.y / CPX) - 1), cy1 = Math.min(CHn - 1, Math.floor((cam.y + vh) / CPX) + 1);
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) { const l = chunkLights[cy * CW + cx]; if (l) for (const q of l) out.push(q); }
    return out;
  }
  function dirtyAll() { chunkDirty.fill(1); }

  // ---------- Sauvegarde ----------
  function serialize() {
    const runs = []; const v = (q) => (q === M.BULLE ? M.AIR : q); let cur = v(mat[0]), n = 0;
    for (let i = 0; i < mat.length; i++) { const q = v(mat[i]); if (q === cur) n++; else { runs.push(cur + ':' + n); cur = q; n = 1; } }
    runs.push(cur + ':' + n);
    return runs.join(',');
  }
  function deserialize(s) {
    let i = 0;
    for (const r of s.split(',')) { const k = r.indexOf(':'); const m = +r.substring(0, k), n = +r.substring(k + 1); mat.fill(m, i, i + n); i += n; }
    aux.fill(0); elec.fill(0); chaud.fill(0); for (let k = 0; k < mat.length; k++) temp[k] = NAT[mat[k]]; dirtyAll();
    for (let c = 0; c < chunkActive.length; c++) chunkActive[c] = frame + 40;
  }

  return { CS, CH, M, P, init, get, set, swap, wake, touch, idx, step, matAt, solidAt, rectBlocked, rectHas, forRadius, raycast, countAround, countRect, draw, lights, dirtyAll, serialize, deserialize,
    get W() { return W; }, get H() { return H; }, get mat() { return mat; }, get aux() { return aux; }, get elec() { return elec; }, get chaud() { return chaud; }, setFeu, chauffer, tempAt, tempMax, tempMin, ancrer, get temp() { return temp; }, get blocs() { return blocs; }, get AMB() { return AMB; }, set effondre(v) { effondre = v; }, get effondre() { return effondre; }, get nFiss() { return fiss.length; }, ancrerCase(i, v) { ancre[i] = v ? 1 : 0; }, fissurer(i) { fissure(i); },
    set onEvent(f) { onEvent = f; }, set sunny(v) { sunny = v; }, get gzones() { return gzones; }, set gzones(v) { gzones = v; }, set tzones(v) { tzones = v; }, get tzones() { return tzones; }, tempsAt, gravAt, set feuMul(v) { feuMul = v; }, set surf(v) { surf = v; }, get surf() { return surf; }, get frame() { return frame; } };
})();
}
const Sim = createSim();
