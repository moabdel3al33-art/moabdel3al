'use strict';
const crypto = require('crypto');
const { make } = require('../public/locales');

const now = () => Date.now();
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const normPhone = (p) => String(p || '').replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || ''));

function slugify(s) {
  return String(s || '').toLowerCase().trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || `item-${Date.now().toString(36)}`;
}

function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.scryptSync(String(pw), salt, 64).toString('hex')}`;
}
function verifyPassword(pw, stored) {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  const calc = crypto.scryptSync(String(pw), salt, 64);
  const want = Buffer.from(hash, 'hex');
  return want.length === calc.length && crypto.timingSafeEqual(calc, want);
}

function parseCookies(header) {
  const out = {};
  String(header || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) {
      const k = p.slice(0, i).trim();
      try { out[k] = decodeURIComponent(p.slice(i + 1).trim()); } catch (e) { out[k] = p.slice(i + 1).trim(); }
    }
  });
  return out;
}

// Very small in-memory rate limiter: max `limit` hits per `windowMs` per key.
const buckets = new Map();
function limited(key, limit, windowMs) {
  const t = now();
  const b = buckets.get(key);
  if (!b || t - b.start > windowMs) { buckets.set(key, { start: t, n: 1 }); return false; }
  b.n++;
  return b.n > limit;
}
setInterval(() => { const t = now(); for (const [k, b] of buckets) if (t - b.start > 3600e3) buckets.delete(k); }, 600e3).unref();

const CURRENCY = { EGP: { ar: 'ج.م', en: 'EGP' }, USD: { ar: '$', en: '$' }, SAR: { ar: 'ر.س', en: 'SAR' }, AED: { ar: 'د.إ', en: 'AED' } };
function money(amount, currency, lang) {
  const n = Number(amount) || 0;
  if (!n) return lang === 'ar' ? 'مجاناً' : 'Free';
  const num = n.toLocaleString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', { maximumFractionDigits: 2 });
  const c = CURRENCY[currency] || { ar: currency, en: currency };
  return `${num} ${c[lang] || c.en}`;
}

// Turns a Vimeo / YouTube link into an embeddable player URL.
function embedUrl(url) {
  const u = String(url || '').trim();
  let m = u.match(/player\.vimeo\.com\/video\/(\d+)(?:\?h=([\w]+))?/) || u.match(/vimeo\.com\/(?:.*\/)?(\d+)(?:\/([\w]+))?/);
  if (m) return `https://player.vimeo.com/video/${m[1]}${m[2] ? `?h=${m[2]}&` : '?'}dnt=1&title=0&byline=0&portrait=0`;
  m = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
  if (m) return `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0&modestbranding=1`;
  return /^https:\/\//.test(u) ? u : '';
}

// The address the visitor actually used (https://your-domain), so shared links never point to localhost.
const origin = (req) => `${req.protocol}://${req.get('host')}`;

const translators = { ar: make('ar'), en: make('en') };
const tr = (lang) => translators[lang] || translators.ar;

module.exports = { origin, now, esc, normPhone, isEmail, slugify, hashPassword, verifyPassword, parseCookies, limited, money, embedUrl, tr, CURRENCY };
