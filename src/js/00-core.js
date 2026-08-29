/* =========================================================================
   RITUEL — noyau
   Détermnisme absolu : une graine = un destin. Aucun Math.random ici.
   ========================================================================= */
(function (root) {
  'use strict';
  const JJK = (root.JJK = root.JJK || {});

  /* ---- hachage de chaîne : cyrb128 ---------------------------------- */
  function cyrb128(str) {
    let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
    for (let i = 0, k; i < str.length; i++) {
      k = str.charCodeAt(i);
      h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
      h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
      h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
      h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
  }

  /* ---- normalisation de la graine ------------------------------------
     « Matthias », « matthias » et « MATTHIAS  » sont la même personne.
     Le rituel ne se laisse pas berner par une majuscule.                */
  function normalizeSeed(s) {
    return String(s == null ? '' : s)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  /* ---- générateur : mulberry32 --------------------------------------- */
  function Rng(seed) {
    let a;
    if (typeof seed === 'number') a = seed >>> 0;
    else a = cyrb128(String(seed))[0];
    this._a = a >>> 0;
  }
  Rng.prototype.next = function () {
    let t = (this._a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  Rng.prototype.int = function (n) { return Math.floor(this.next() * n); };
  Rng.prototype.range = function (a, b) { return a + this.next() * (b - a); };
  Rng.prototype.intRange = function (a, b) { return a + Math.floor(this.next() * (b - a + 1)); };
  Rng.prototype.chance = function (p) { return this.next() < p; };
  Rng.prototype.pick = function (arr) {
    if (!arr || !arr.length) return undefined;
    return arr[Math.floor(this.next() * arr.length)];
  };
  Rng.prototype.shuffle = function (arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };
  Rng.prototype.sample = function (arr, n) { return this.shuffle(arr).slice(0, n); };
  /* loi normale par Box–Muller, bornée : sert aux stats et au tracé des sceaux */
  Rng.prototype.gauss = function (mu, sigma) {
    const u = Math.max(1e-9, this.next()), v = this.next();
    return mu + sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283185307179586 * v);
  };
  /* sous-générateur nommé : deux axes indépendants ne se contaminent pas */
  Rng.prototype.fork = function (tag) { return new Rng(cyrb128(tag + ':' + this._a)[0]); };

  /* ---- aléatoire non déterministe, réservé aux effets visuels -------- */
  const chaos = {
    f: function () { return Math.random(); },
    i: function (n) { return Math.floor(Math.random() * n); },
    r: function (a, b) { return a + Math.random() * (b - a); },
    pick: function (a) { return a[Math.floor(Math.random() * a.length)]; },
  };

  /* ---- utilitaires ---------------------------------------------------- */
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = {
    out: t => 1 - Math.pow(1 - t, 3),
    in: t => t * t * t,
    inOut: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    back: t => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
  };
  const now = () => (root.performance && root.performance.now ? root.performance.now() : Date.now());

  function el(tag, cls, txt) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.prototype.slice.call((ctx || document).querySelectorAll(sel));

  /* remplace {JETON} dans un gabarit */
  function fill(tpl, map) {
    return String(tpl || '').replace(/\{([A-Z_]+)\}/g, (m, k) =>
      (map[k] != null ? map[k] : m));
  }

  /* premières lettres capitales, en respectant les particules françaises */
  const PARTICULES = { de: 1, du: 1, des: 1, la: 1, le: 1, les: 1, 'l\'': 1, d: 1, au: 1, aux: 1, et: 1, en: 1, par: 1, sans: 1, sur: 1, a: 1 };
  function titre(s) {
    return String(s || '').split(' ').map((w, i) => {
      const low = w.toLowerCase();
      if (i > 0 && PARTICULES[low]) return low;
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(' ');
  }

  function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

  JJK.core = { cyrb128, normalizeSeed, Rng, chaos, clamp, lerp, ease, now, el, $, $$, fill, titre, wait };
})(window);
