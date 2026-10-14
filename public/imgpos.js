/* Image position & zoom chosen in the admin panel (drag to position).
 * Stored inside the image link itself: "/uploads/photo.jpg#pos=50,30,1.2"  (x %, y %, zoom). */
(function (root) {
  'use strict';
  const num = (v, min, max, def) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def; };
  function parse(value) {
    const s = String(value || '');
    const i = s.indexOf('#pos=');
    if (i < 0) return { src: s, x: 50, y: 50, z: 1, set: false };
    const [x, y, z] = s.slice(i + 5).split(',');
    return { src: s.slice(0, i), x: num(x, 0, 100, 50), y: num(y, 0, 100, 50), z: num(z, 0.5, 3, 1), set: true };
  }
  const r1 = (n) => Math.round(n * 10) / 10;
  function build(src, x, y, z) {
    const clean = parse(src).src;
    if (!clean) return '';
    if (Math.abs(x - 50) < 0.1 && Math.abs(y - 50) < 0.1 && Math.abs(z - 1) < 0.01) return clean;
    return `${clean}#pos=${r1(x)},${r1(y)},${Math.round(z * 100) / 100}`;
  }
  // inline style for an <img> filling its frame (frame needs overflow:hidden)
  function style(p) {
    p = typeof p === 'string' ? parse(p) : p;
    let s = `object-position:${p.x}% ${p.y}%;`;
    if (p.z !== 1) s += `transform:scale(${p.z});transform-origin:${p.x}% ${p.y}%;`;
    return s;
  }
  function bg(p) {
    p = typeof p === 'string' ? parse(p) : p;
    return `background-image:url('${p.src.replace(/'/g, '%27')}');background-position:${p.x}% ${p.y}%;`;
  }
  const api = { parse, build, style, bg, src: (v) => parse(v).src };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ImgPos = api;
})(typeof window !== 'undefined' ? window : globalThis);
