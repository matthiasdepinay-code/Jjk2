'use strict';
// ---------- Simulation de matières (grille « falling sand ») et rendu encre par morceaux ----------
const Sim = (() => {
  const CS = 6;        // taille d'une cellule en pixels
  const CH = 32;       // cellules par côté de morceau (chunk)
  const CPX = CS * CH; // pixels par morceau
  let W = 0, H = 0, CW = 0, CHn = 0;
  let mat, aux, elec, upd;
  let chunkActive, chunkDirty, chunkCv, chunkLights, chunkHasLiquid;
  let frame = 0;
  let onEvent = null;
  let sunny = true;
  let surf = null; // hauteur de surface par colonne (cellules), fournie par la génération

  const M = { AIR: 0, PIERRE: 1, TERRE: 2, SABLE: 3, BOIS: 4, PLANTE: 5, HERBE: 6, EAU: 7, HUILE: 8, ACIDE: 9, LAVE: 10, GLACE: 11, NEIGE: 12, VAPEUR: 13, FUMEE: 14, FEU: 15, SEVE: 16, VERRE: 17, METAL: 18, OBSIDIENNE: 19, CENDRE: 20, CRISTAL: 21 };
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
  const FLAMMABLE_SOLID = (m) => m === M.BOIS || m === M.PLANTE || m === M.HERBE;

  function init(w, h) {
    W = w; H = h; CW = Math.ceil(W / CH); CHn = Math.ceil(H / CH);
    mat = new Uint8Array(W * H); aux = new Uint8Array(W * H); elec = new Uint8Array(W * H); upd = new Uint8Array(W * H);
    chunkActive = new Int32Array(CW * CHn); chunkDirty = new Uint8Array(CW * CHn).fill(1); chunkHasLiquid = new Uint8Array(CW * CHn);
    chunkCv = new Array(CW * CHn).fill(null); chunkLights = new Array(CW * CHn).fill(null);
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
  function set(x, y, m, a = 0) { if (!inB(x, y)) return; const i = y * W + x; mat[i] = m; aux[i] = a; elec[i] = 0; touch(i); }
  function setI(i, m, a = 0) { mat[i] = m; aux[i] = a; elec[i] = 0; touch(i); }
  function swap(i, j) {
    const m = mat[i], a = aux[i], e = elec[i];
    mat[i] = mat[j]; aux[i] = aux[j]; elec[i] = elec[j];
    mat[j] = m; aux[j] = a; elec[j] = e;
    upd[i] = frame & 255; upd[j] = frame & 255;
    touch(i); touch(j);
  }
  function wake(x, y) { if (inB(x, y)) touch(y * W + x); }
  function evt(kind, x, y) { if (onEvent) onEvent(kind, x * CS + CS / 2, y * CS + CS / 2); }
  const rnd = Math.random;

  // ---------- Pas de simulation ----------
  function step(camCells) {
    frame++;
    const f = frame & 255;
    // réveils aléatoires (processus lents loin de l'action)
    for (let k = 0; k < 6; k++) { const c = (rnd() * CW * CHn) | 0; if (chunkActive[c] <= frame) chunkActive[c] = frame + 1; }
    const ltr = (frame & 1) === 0;
    for (let cy = CHn - 1; cy >= 0; cy--) {
      for (let cx = 0; cx < CW; cx++) {
        const c = cy * CW + cx;
        if (chunkActive[c] <= frame) continue;
        const y0 = cy * CH, y1 = Math.min(H, y0 + CH), x0 = cx * CH, x1 = Math.min(W, x0 + CH);
        let hasLiquid = 0;
        for (let y = y1 - 1; y >= y0; y--) {
          if (ltr) { for (let x = x0; x < x1; x++) { const i = y * W + x; if (upd[i] === f) continue; const m = mat[i]; if (m) { if (P[m].liquid) hasLiquid = 1; cell(x, y, i, m, f); } } }
          else { for (let x = x1 - 1; x >= x0; x--) { const i = y * W + x; if (upd[i] === f) continue; const m = mat[i]; if (m) { if (P[m].liquid) hasLiquid = 1; cell(x, y, i, m, f); } } }
        }
        chunkHasLiquid[c] = hasLiquid;
      }
    }
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
    if (y + 1 >= H) return;
    const b = i + W;
    if (canEnter(b, 9)) { swap(i, b); return; }
    const dir = rnd() < 0.5 ? 1 : -1;
    for (const d of [dir, -dir]) {
      const nx = x + d; if (nx < 0 || nx >= W) continue;
      const s = i + d, bd = b + d;
      if (!P[mat[s]].solid && canEnter(bd, 9)) { swap(i, bd); return; }
    }
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
      }
      if (sunny && y > 0 && mat[i - W] === M.AIR && rnd() < 0.00012) { setI(i, M.VAPEUR, 120); return; }
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
    if (y + 1 >= H) return;
    const b = i + W;
    if (canEnter(b, p.dens)) { if (m !== M.SEVE || rnd() < 0.25) swap(i, b); return; }
    const dir = rnd() < 0.5 ? 1 : -1;
    for (const d of [dir, -dir]) {
      const nx = x + d; if (nx < 0 || nx >= W) continue;
      if (!P[mat[i + d]].solid && canEnter(b + d, p.dens)) { if (m !== M.SEVE || rnd() < 0.1) swap(i, b + d); return; }
    }
    if (p.flow === 0) return;
    // étalement latéral
    for (let k = 1; k <= p.flow; k++) {
      const nx = x + dir * k; if (nx < 0 || nx >= W) break;
      const j = i + dir * k; const n = mat[j];
      if (n === M.AIR || P[n].gas) { swap(i, j); return; }
      if (n !== m && !(P[n].liquid && P[n].dens <= p.dens)) break;
    }
  }
  function stepGas(x, y, i, m, p) {
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
        if (FLAMMABLE_SOLID(n) && aux[j] === 0 && rnd() < q.flam) { aux[j] = q.burn; touch(j); evt('incendie', x, y); }
        else if ((n === M.HUILE || n === M.SEVE) && rnd() < q.flam) { setI(j, M.FEU, q.burn); evt('incendie', x, y); }
        else if ((n === M.GLACE || n === M.NEIGE) && rnd() < 0.15) { setI(j, M.EAU); evt('fonte', x, y); }
      }
      if (rnd() < 0.45) return; // le feu reste près de son combustible
    }
    if (y === 0) { setI(i, M.AIR); return; }
    const u = i - W;
    const r = rnd();
    if (r < 0.6 && (mat[u] === M.AIR || P[mat[u]].liquid)) { swap(i, u); return; }
    const dir = rnd() < 0.5 ? 1 : -1;
    if (x + dir >= 0 && x + dir < W) {
      if (r < 0.85 && mat[u + dir] === M.AIR) { swap(i, u + dir); return; }
      if (mat[i + dir] === M.AIR) { swap(i, i + dir); return; }
    }
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
      if (hotNear(i) && rnd() < p.flam) { aux[i] = p.burn; touch(i); evt('incendie', x, y); }
      return;
    }
    if (m === M.GLACE) { if (hotNear(i) && rnd() < 0.25) { setI(i, M.EAU); evt('fonte', x, y); } return; }
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
    let anySolid = false;
    // 1. remplissages
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = y * W + x; const m = mat[i]; if (!m) continue;
        const p = P[m]; const lx = (x - x0) * CS, ly = (y - y0) * CS;
        if (p.solid && !p.powder) anySolid = true;
        if (m === M.FEU) {
          const h = U.hash2(x + frame, y);
          g.fillStyle = h < 0.4 ? '#e8842a' : h < 0.7 ? '#f0b040' : '#d9622b';
          g.globalAlpha = 0.45 + aux[i] / 60;
          g.beginPath(); g.arc(lx + CS / 2, ly + CS / 2, CS * 0.8, 0, Math.PI * 2); g.fill();
          g.globalAlpha = 1;
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
    chunkLights[c] = lights;
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
    let budget = 40;
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      const c = cy * CW + cx;
      if ((chunkDirty[c] || !chunkCv[c]) && budget-- > 0) renderChunk(c);
      if (chunkCv[c]) ctx.drawImage(chunkCv[c], cx * CPX, cy * CPX);
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
    const runs = []; let cur = mat[0], n = 0;
    for (let i = 0; i < mat.length; i++) { if (mat[i] === cur) n++; else { runs.push(cur + ':' + n); cur = mat[i]; n = 1; } }
    runs.push(cur + ':' + n);
    return runs.join(',');
  }
  function deserialize(s) {
    let i = 0;
    for (const r of s.split(',')) { const k = r.indexOf(':'); const m = +r.substring(0, k), n = +r.substring(k + 1); mat.fill(m, i, i + n); i += n; }
    aux.fill(0); elec.fill(0); dirtyAll();
    for (let c = 0; c < chunkActive.length; c++) chunkActive[c] = frame + 40;
  }

  return { CS, CH, M, P, init, get, set, swap, wake, touch, idx, step, matAt, solidAt, rectBlocked, rectHas, forRadius, raycast, countAround, countRect, draw, lights, dirtyAll, serialize, deserialize,
    get W() { return W; }, get H() { return H; }, get mat() { return mat; }, get aux() { return aux; }, get elec() { return elec; },
    set onEvent(f) { onEvent = f; }, set sunny(v) { sunny = v; }, set surf(v) { surf = v; }, get surf() { return surf; }, get frame() { return frame; } };
})();
