'use strict';
const { find, col } = require('./db');

// Only 4 base colours - everything else (borders, muted text, hovers) is derived from them in CSS.
const PALETTES = [
  { id: 'royal', name: 'Royal Black & Gold', bg: '#0b0a08', surface: '#16130e', text: '#f4ecdc', primary: '#c9a45c' },
  { id: 'emerald', name: 'Emerald & Gold', bg: '#06120e', surface: '#0e1f19', text: '#eef3ec', primary: '#d4af6a' },
  { id: 'burgundy', name: 'Burgundy & Gold', bg: '#13070a', surface: '#210d13', text: '#f6e9e4', primary: '#d6ab63' },
  { id: 'navy', name: 'Midnight & Gold', bg: '#070b14', surface: '#101828', text: '#e9eef8', primary: '#cfa75a' },
  { id: 'onyx', name: 'Onyx & Champagne', bg: '#0d0d0d', surface: '#191818', text: '#f2efe9', primary: '#e3c99a' },
  { id: 'rose', name: 'Black & Rose Gold', bg: '#0e0b0b', surface: '#1b1515', text: '#f5ebe8', primary: '#d9a28c' },
  { id: 'crimson', name: 'Midnight Crimson', bg: '#0b0a0f', surface: '#16141c', text: '#ece6df', primary: '#b3132f' },
  // ---- bright / white palettes ----
  { id: 'pearl', name: 'Pearl & Gold', bg: '#faf7f2', surface: '#ffffff', text: '#1c1813', primary: '#b08d45' },
  { id: 'ivory', name: 'Ivory & Gold', bg: '#f5efe3', surface: '#fffcf5', text: '#1f1a12', primary: '#a8843c' },
  { id: 'marble', name: 'White Marble & Black', bg: '#f6f6f4', surface: '#ffffff', text: '#111111', primary: '#1c1c1c' },
  { id: 'champagne', name: 'Champagne & Rose Gold', bg: '#fbf5f1', surface: '#ffffff', text: '#2a1e1a', primary: '#bf8770' },
  { id: 'sand', name: 'Desert Sand & Caramel', bg: '#f8f2e9', surface: '#fffdf9', text: '#2b2116', primary: '#c08a42' },
  { id: 'royalblue', name: 'White & Royal Blue', bg: '#f3f6fb', surface: '#ffffff', text: '#121c2c', primary: '#1f4fa0' },
  { id: 'mint', name: 'White & Emerald', bg: '#f2f8f5', surface: '#ffffff', text: '#12241b', primary: '#1d7a57' },
  { id: 'blush', name: 'Blush & Burgundy', bg: '#fcf3f4', surface: '#ffffff', text: '#2b1418', primary: '#8e2c48' },
  { id: 'lavender', name: 'Lavender & Plum', bg: '#f7f4fb', surface: '#ffffff', text: '#21182c', primary: '#6c4aa3' },
  { id: 'sky', name: 'Sky & Silver', bg: '#f1f6fa', surface: '#ffffff', text: '#16222e', primary: '#3b7cb3' },
];

const DEFAULTS = {
  theme: JSON.stringify(PALETTES[0]),
  currency: 'USD',
  currency_usd_done: '',
  site_name_ar: 'محمد عبد العال',
  site_name_en: 'Mohamed Abdel3al',
  tagline_ar: 'افهم العقل… قبل أن يُستخدم ضدك',
  tagline_en: 'Understand the mind… before it is used against you',
  hero_title_ar: 'علم النفس المظلم بلغة بسيطة',
  hero_title_en: 'Dark psychology, made simple',
  hero_text_ar: 'كورسات وكتب واستشارات خاصة تساعدك تكتشف أساليب التلاعب، تحمي نفسك، وتفهم الناس من حولك.',
  hero_text_en: 'Courses, books and private consultations that help you spot manipulation, protect yourself and truly understand people.',
  about_title_ar: 'من هو محمد عبد العال؟',
  about_title_en: 'Who is Mohamed Abdel3al?',
  about_text_ar: 'صانع محتوى متخصص في علم النفس المظلم والسلوك الإنساني. يقدّم المعرفة بأسلوب مباشر وعملي يتابعه مئات الآلاف على السوشيال ميديا.',
  about_text_en: 'A content creator specialised in dark psychology and human behaviour, followed by hundreds of thousands of people for his direct and practical style.',
  payment_note_ar: 'بعد إرسال طلبك في الشات، سيرد عليك فريقنا بطرق الدفع المتاحة. بمجرد تأكيد الدفع يتم تفعيل طلبك فوراً.',
  payment_note_en: 'After you send your order in the chat, our team will reply with the available payment methods. Your order is activated as soon as the payment is confirmed.',
  // ---- Payment methods: which ones each kind of product offers (comma list of chat, paypal, gateway) ----
  pay_course: 'chat',
  pay_book: 'chat',
  pay_plan: 'chat',
  pay_consult: 'chat',
  paypal_me: '',
  paypal_email: '',
  paypal_note_ar: '',
  paypal_note_en: '',
  // ---- Hidden "link in bio" page (JSON, edited in Admin > Link page) ----
  linkpage: '',
  // ---- Consultations: the 3 options and their prices (empty = option hidden) ----
  consult_price_today: '',
  consult_price_2d: '',
  consult_price_4d: '',
  consult_tiers_done: '',
  consult_open_title_ar: 'جلستك مفتوحة… بلا وقت محدد',
  consult_open_title_en: 'Your session is open… with no time limit',
  consult_open_text_ar: 'ميزتي الخاصة: لا يوجد عدّاد دقائق ولا ساعة نهاية. تكلّم معي بالوقت الذي تحتاجه حتى تصل لإجابتك وتطمئن تماماً.',
  consult_open_text_en: 'My special feature: no minute counter and no ending hour. Talk with me for as long as you need, until you get your answer and feel fully at ease.',
  img_logo: '',
  img_hero: '',
  img_about: '',
  img_courses: '',
  img_books: '',
  img_blog: '',
  img_consult: '',
  social_facebook: 'https://www.facebook.com/',
  social_tiktok: 'https://www.tiktok.com/',
  social_youtube: 'https://www.youtube.com/',
  social_instagram: 'https://www.instagram.com/',
  youtube_channel_id: '',
  // ---- Followers counter (top of the website) ----
  followers_show: '1',
  followers_auto: '1',
  followers_facebook: '',
  followers_tiktok: '',
  followers_youtube: '',
  followers_instagram: '',
  followers_fetched: '',
};

// ---- Social media links: a username, "@username" or a full link all become the right profile link ----
// (TikTok and YouTube profiles need "@" before the name: tiktok.com/@name, youtube.com/@name)
const SOCIAL_BASE = {
  facebook: 'https://www.facebook.com/', instagram: 'https://www.instagram.com/', tiktok: 'https://www.tiktok.com/@', youtube: 'https://www.youtube.com/@',
  x: 'https://x.com/', linkedin: 'https://www.linkedin.com/in/', telegram: 'https://t.me/',
};
const SOCIAL_HOST = {
  facebook: /(^|\.)(facebook|fb)\.com$/i, instagram: /(^|\.)instagram\.com$/i, tiktok: /(^|\.)tiktok\.com$/i, youtube: /(^|\.)(youtube\.com|youtu\.be)$/i,
  x: /(^|\.)(x|twitter)\.com$/i, linkedin: /(^|\.)linkedin\.com$/i, telegram: /(^|\.)(t|telegram)\.me$/i,
};
const YT_PATHS = ['channel', 'c', 'user', 'watch', 'shorts', 'playlist', 'results', 'live', 'embed'];
function socialUrl(platform, value) {
  let s = String(value || '').trim();
  if (!s || !SOCIAL_BASE[platform]) return s;
  const withProto = /^https?:\/\//i.test(s) ? s : `https://${s.replace(/^\/+/, '')}`;
  let u = null;
  try { u = new URL(withProto); } catch (e) { u = null; }
  if (u && SOCIAL_HOST[platform].test(u.hostname)) {
    const parts = u.pathname.split('/').filter(Boolean);
    if (platform === 'tiktok' && parts.length === 1 && !parts[0].startsWith('@')) u.pathname = `/@${parts[0]}`;
    if (platform === 'youtube' && /youtube/i.test(u.hostname) && parts.length === 1 && !parts[0].startsWith('@') && !YT_PATHS.includes(parts[0])) u.pathname = `/@${parts[0]}`;
    return u.toString().replace(/\/$/, '');
  }
  if (/^https?:\/\//i.test(s)) return s; // a link to another website: keep it
  const name = s.replace(/^@/, '').replace(/\/+$/, '');
  return /^[\w.-]+$/.test(name) ? SOCIAL_BASE[platform] + name : s;
}
const SOCIAL_KEYS = ['facebook', 'instagram', 'tiktok', 'youtube'];
// The link shown to visitors. YouTube "@name" links often open the app's home page on phones instead of the
// channel, so the channel id link (youtube.com/channel/UC...) is used once it is known.
function socialLink(platform) {
  const v = cache[`social_${platform}`] || '';
  if (platform === 'youtube' && v && cache.youtube_channel_id && /youtube\.com\/@/i.test(v)) return `https://www.youtube.com/channel/${cache.youtube_channel_id}`;
  return v;
}

let cache = { ...DEFAULTS };

async function load() {
  const rows = await find('settings');
  cache = { ...DEFAULTS };
  for (const r of rows) if (r.k in DEFAULTS) cache[r.k] = r.v == null ? '' : r.v;
  for (const p of SOCIAL_KEYS) cache[`social_${p}`] = socialUrl(p, cache[`social_${p}`]);
  return cache;
}
const all = () => cache;
const get = (k) => cache[k];
async function save(values) {
  const entries = Object.entries(values).filter(([k]) => k in DEFAULTS)
    .map(([k, v]) => (/^social_/.test(k) && SOCIAL_KEYS.includes(k.slice(7)) ? [k, socialUrl(k.slice(7), v)] : [k, v]));
  for (const [k, v] of entries) {
    await col('settings').updateOne({ k }, { $set: { k, v: v == null ? '' : String(v) } }, { upsert: true });
  }
  return load();
}

const HEX = /^#[0-9a-f]{6}$/i;
function theme() {
  let t;
  try { t = JSON.parse(cache.theme); } catch (e) { t = PALETTES[0]; }
  const base = PALETTES[0];
  const out = {};
  for (const k of ['bg', 'surface', 'text', 'primary']) out[k] = HEX.test(t[k] || '') ? t[k] : base[k];
  return out;
}
function luminance(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
// CSS custom properties for the current theme.
function themeCss(t = theme()) {
  const onPrimary = luminance(t.primary) > 0.45 ? '#111111' : '#ffffff';
  const scheme = luminance(t.bg) > 0.5 ? 'light' : 'dark';
  return `:root{--c-bg:${t.bg};--c-surface:${t.surface};--c-text:${t.text};--c-primary:${t.primary};--c-on-primary:${onPrimary};color-scheme:${scheme}}`;
}

const isLight = (t = theme()) => luminance(t.bg) > 0.5;

// One-time changes for databases created by older versions.
const OLD_NOTES = {
  payment_note_ar: 'بعد إرسال طلبك في الشات، سيرد عليك فريقنا بطرق الدفع المتاحة (فودافون كاش، إنستاباي، تحويل بنكي). بمجرد تأكيد الدفع يتم تفعيل طلبك فوراً.',
  payment_note_en: 'After you send your order in the chat, our team will reply with the available payment methods (Vodafone Cash, InstaPay, bank transfer). Your order is activated as soon as the payment is confirmed.',
};
async function migrate() {
  if (cache.currency_usd_done) return;
  const values = { currency: 'USD', currency_usd_done: '1' };
  for (const [k, old] of Object.entries(OLD_NOTES)) if (cache[k] === old) values[k] = DEFAULTS[k];
  await save(values);
}

module.exports = { socialUrl, socialLink, PALETTES, DEFAULTS, load, all, get, save, migrate, theme, themeCss, isLight, luminance, HEX };
