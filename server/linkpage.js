'use strict';
// The hidden "link in bio" page (like Linktree). It lives at /p/<secret link>, is never linked from the
// website and is hidden from search engines, so only people who get the link can open it.
// Everything on it is edited in Admin > Link page and saved as one JSON setting.
const crypto = require('crypto');
const settings = require('./settings');

const SOCIAL_TYPES = ['youtube', 'tiktok', 'instagram', 'facebook', 'linkedin', 'x', 'whatsapp', 'telegram', 'email', 'phone', 'website'];
const newSlug = () => crypto.randomBytes(5).toString('hex');
const newId = () => crypto.randomBytes(4).toString('hex');

function defaults() {
  const s = settings.all();
  const socials = ['youtube', 'tiktok', 'instagram', 'facebook'].filter((k) => s[`social_${k}`]).map((type) => ({ type, url: s[`social_${type}`] }));
  const link = (title, url) => ({ id: newId(), title, url, image: '', visible: true });
  return {
    enabled: true, slug: newSlug(), dir: 'rtl', image: s.img_hero || '', show_logo: true,
    name: s.site_name_ar || '', bio: s.tagline_ar || '', heading: 'ابدأ هنا حسب ما تحتاجه',
    socials,
    links: [link('لديك سؤال؟ تواصل معنا الآن', '/chat'), link('الكورسات', '/courses'), link('الكتب', '/books'),
      link('الاستشارات الخاصة', '/consultations'), link('العضوية', '/membership')],
  };
}

// Links may point to a page of this website (/courses), a full web address, an email or a phone number.
function cleanUrl(v, type) {
  let u = settings.socialUrl(type, String(v || '').trim().slice(0, 600)); // usernames -> profile links
  if (!u) return '';
  if (type === 'email' && !/^mailto:/i.test(u)) u = `mailto:${u}`;
  if (type === 'phone' && !/^tel:/i.test(u)) u = `tel:${u.replace(/[^\d+]/g, '')}`;
  if (type === 'whatsapp' && /^\+?[\d\s-]{7,}$/.test(u)) u = `https://wa.me/${u.replace(/\D/g, '')}`;
  if (/^\/(?!\/)/.test(u) || /^(https?:\/\/|mailto:|tel:)/i.test(u)) return u;
  if (/^[\w-]+(\.[\w-]+)+/.test(u)) return `https://${u}`; // "instagram.com/name"
  return null;
}
const str = (v, max) => String(v == null ? '' : v).trim().slice(0, max);

function normalize(input, current) {
  const d = { ...current };
  if ('enabled' in input) d.enabled = !!input.enabled;
  if ('slug' in input) {
    const slug = str(input.slug, 60).toLowerCase();
    if (!/^[a-z0-9-]{4,60}$/.test(slug)) throw new Error('The link name must be 4-60 English letters, numbers or dashes');
    d.slug = slug;
  }
  if ('dir' in input) d.dir = input.dir === 'ltr' ? 'ltr' : 'rtl';
  if ('show_logo' in input) d.show_logo = !!input.show_logo;
  for (const [k, max] of [['image', 600], ['name', 120], ['bio', 400], ['heading', 200]]) if (k in input) d[k] = str(input[k], max);
  if (Array.isArray(input.socials)) {
    d.socials = input.socials.slice(0, 20).map((x) => ({ type: SOCIAL_TYPES.includes(x.type) ? x.type : 'website', url: cleanUrl(x.url, x.type) }))
      .filter((x) => x.url !== '');
    if (d.socials.some((x) => x.url === null)) throw new Error('One of the social links is not a valid link');
  }
  if (Array.isArray(input.links)) {
    d.links = input.links.slice(0, 60).map((x) => ({
      id: /^[a-f0-9]{8}$/.test(x.id) ? x.id : newId(), title: str(x.title, 160), url: cleanUrl(x.url), image: str(x.image, 600),
      visible: x.visible !== false, highlight: !!x.highlight,
    })).filter((x) => x.title || x.url);
    if (d.links.some((x) => x.url === null || !x.url)) throw new Error('Every button needs a valid link');
    if (d.links.some((x) => !x.title)) throw new Error('Every button needs a title');
  }
  return d;
}

async function get() {
  let d = null;
  try { d = JSON.parse(settings.get('linkpage') || 'null'); } catch (e) { d = null; }
  if (!d || !d.slug) { d = defaults(); await settings.save({ linkpage: JSON.stringify(d) }); }
  d.socials = (d.socials || []).map((x) => ({ ...x, url: settings.socialUrl(x.type, x.url) })); // fixes links saved before
  return d;
}
async function save(input) {
  const d = normalize(input, await get());
  await settings.save({ linkpage: JSON.stringify(d) });
  return d;
}
// The page data for a visitor, or null when the link is wrong or the page is switched off.
async function bySlug(slug) {
  const d = await get();
  return d.enabled && String(slug || '').toLowerCase() === d.slug ? d : null;
}

module.exports = { get, save, bySlug, SOCIAL_TYPES };
