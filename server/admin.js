'use strict';
const path = require('path');
const express = require('express');
const multer = require('multer');
const config = require('./config');
const { one, find, byId, insert, set, setOne, remove, count, aggregate, distinct, mapById, isDup, dupKey, rx } = require('./db');
const settings = require('./settings');
const social = require('./social');
const chat = require('./chat');
const shop = require('./shop');
const auth = require('./auth');
const { now, slugify, isEmail, hashPassword } = require('./util');
const payments = require('./payments');
const storage = require('./storage');
const countries = require('../public/countries');

const router = express.Router();
const { wrap, fail, requirePerm } = auth;

// Counts grouped by a field, e.g. lessons per course -> Map(course_id => n)
async function countBy(coll, match, field) {
  const rows = await aggregate(coll, [{ $match: match }, { $group: { _id: `$${field}`, n: { $sum: 1 } } }]);
  return new Map(rows.map((r) => [r._id, r.n]));
}

// ---------------------------------------------------------------------------
// Generic content resources
// ---------------------------------------------------------------------------
const RES = {
  courses: {
    table: 'courses', perm: 'content', slug: true, sort: { sort: 1, id: -1 },
    fields: { title: 'str!', subtitle: 'str', description: 'text', cover: 'str', price: 'num', old_price: 'numnull', published: 'bool', coming_soon: 'bool', sort: 'int' },
    async enrich(rows) {
      const ids = rows.map((r) => r.id);
      const lessons = await countBy('lessons', { course_id: { $in: ids } }, 'course_id');
      const students = await countBy('entitlements', { item_type: 'course', item_id: { $in: ids } }, 'item_id');
      return rows.map((r) => ({ ...r, lessons_count: lessons.get(r.id) || 0, students: students.get(r.id) || 0 }));
    },
  },
  lessons: {
    table: 'lessons', perm: 'content', sort: { sort: 1, id: 1 }, filter: ['course_id'],
    fields: { course_id: 'int!', title: 'str!', video_url: 'str', duration: 'str', is_preview: 'bool', notes: 'text', sort: 'int' },
  },
  books: {
    table: 'books', perm: 'content', slug: true, sort: { sort: 1, id: -1 },
    fields: { title: 'str!', subtitle: 'str', description: 'text', cover: 'str', price: 'num', old_price: 'numnull', file_path: 'str', file_name: 'str', external_url: 'str', pages: 'intnull', published: 'bool', coming_soon: 'bool', sort: 'int' },
    async enrich(rows) {
      const owners = await countBy('entitlements', { item_type: 'book', item_id: { $in: rows.map((r) => r.id) } }, 'item_id');
      return rows.map((r) => ({ ...r, owners: owners.get(r.id) || 0 }));
    },
  },
  posts: {
    table: 'posts', perm: 'content', slug: true, sort: { published_at: -1, created_at: -1 },
    fields: { title: 'str!', excerpt: 'str', body: 'text', cover: 'str', published: 'bool', published_at: 'datetime' },
  },
  consult_types: {
    table: 'consult_types', perm: 'content', sort: { sort: 1, id: 1 },
    fields: { title: 'str!', description: 'text', duration_min: 'int', price: 'num', cover: 'str', published: 'bool', sort: 'int' },
  },
  social_posts: {
    table: 'social_posts', perm: 'content', sort: { pinned: -1, posted_at: -1, created_at: -1 },
    fields: { platform: 'str!', url: 'str!', title: 'str', thumbnail: 'str', posted_at: 'datetime', pinned: 'bool', hidden: 'bool' },
  },
  plans: {
    table: 'plans', perm: 'settings', sort: { sort: 1, months: 1 },
    fields: { title: 'str!', months: 'int', price: 'num', old_price: 'numnull', description: 'text', published: 'bool', sort: 'int' },
    async enrich(rows) {
      const g = await aggregate('subscriptions', [{ $match: { status: 'active', ends_at: { $gt: now() } } }, { $group: { _id: '$plan_id', users: { $addToSet: '$user_id' } } }]);
      const m = new Map(g.map((x) => [x._id, x.users.length]));
      return rows.map((r) => ({ ...r, members: m.get(r.id) || 0 }));
    },
  },
  quick_replies: {
    table: 'quick_replies', perm: 'quick', sort: { title: 1 },
    fields: { title: 'str!', body: 'text!' },
  },
};

function coerce(def, body, partial) {
  const row = {};
  for (const [k, typeDef] of Object.entries(def.fields)) {
    if (!(k in body)) { if (!partial && typeDef.endsWith('!')) return { error: k }; continue; }
    const type = typeDef.replace('!', '');
    let v = body[k];
    if (type === 'str') v = v == null ? null : String(v).trim().slice(0, 500) || null;
    else if (type === 'text') v = v == null ? null : String(v).slice(0, 200000) || null;
    else if (type === 'num') v = Math.max(0, Number(v) || 0);
    else if (type === 'numnull') v = v === '' || v == null || !Number(v) ? null : Math.max(0, Number(v));
    else if (type === 'int') v = Math.round(Number(v) || 0);
    else if (type === 'intnull') v = v === '' || v == null ? null : Math.round(Number(v)) || null;
    else if (type === 'bool') v = v ? 1 : 0;
    else if (type === 'datetime') v = v === '' || v == null ? null : Number(v) || Date.parse(v) || null;
    if (typeDef.endsWith('!') && (v == null || v === '')) return { error: k };
    row[k] = v;
  }
  return { row };
}
async function uniqueSlug(table, base, id) {
  let slug = slugify(base);
  for (let i = 2; ; i++) {
    if (!(await one(table, { slug, id: { $ne: id || 0 } }))) return slug;
    slug = `${slugify(base)}-${i}`;
  }
}
function getRes(req, res) {
  const def = RES[req.params.res];
  if (!def) { fail(res, 404, 'Unknown resource'); return null; }
  if (!auth.can(req.user, def.perm)) { fail(res, 403, req.t('You do not have permission to do this')); return null; }
  return def;
}
const afterChange = (name) => { if (name === 'quick_replies') chat.staffEmit('quickreplies:changed'); };

router.get('/r/:res', requirePerm(), wrap(async (req, res) => {
  const def = getRes(req, res); if (!def) return;
  const filter = {};
  for (const f of def.filter || []) if (req.query[f] != null) filter[f] = Number(req.query[f]);
  const rows = await find(def.table, filter, { sort: def.sort });
  res.json(def.enrich ? await def.enrich(rows) : rows);
}));
router.get('/r/:res/:id', requirePerm(), wrap(async (req, res) => {
  const def = getRes(req, res); if (!def) return;
  const row = await byId(def.table, req.params.id);
  if (!row) return fail(res, 404, req.t('Not found'));
  res.json(row);
}));
router.post('/r/:res', requirePerm(), wrap(async (req, res) => {
  const def = getRes(req, res); if (!def) return;
  const { row, error } = coerce(def, req.body, false);
  if (error) return fail(res, 400, req.t('Please fill in: {field}', { field: req.t(error) }));
  if (def.slug) row.slug = await uniqueSlug(def.table, req.body.slug || row.title);
  if (def.table !== 'quick_replies') row.updated_at = now();
  row.created_at = now();
  if (def.table === 'posts') { row.author_id = req.user.id; if (row.published && !row.published_at) row.published_at = now(); }
  if (def.table === 'quick_replies') row.created_by = req.user.id;
  if (def.table === 'social_posts') { row.source = 'manual'; row.external_id = null; }
  const id = await insert(def.table, row);
  afterChange(req.params.res);
  res.json({ ok: true, id });
}));
router.put('/r/:res/:id', requirePerm(), wrap(async (req, res) => {
  const def = getRes(req, res); if (!def) return;
  const id = Number(req.params.id);
  const current = await byId(def.table, id);
  if (!current) return fail(res, 404, req.t('Not found'));
  const { row, error } = coerce(def, req.body, true);
  if (error) return fail(res, 400, req.t('Please fill in: {field}', { field: req.t(error) }));
  if (def.slug && req.body.slug !== undefined) row.slug = await uniqueSlug(def.table, req.body.slug || row.title || current.title, id);
  if (def.table !== 'quick_replies') row.updated_at = now();
  if (def.table === 'posts' && row.published && !current.published_at && !row.published_at) row.published_at = now();
  if (Object.keys(row).length) await setOne(def.table, { id }, row);
  afterChange(req.params.res);
  res.json({ ok: true });
}));
router.delete('/r/:res/:id', requirePerm(), wrap(async (req, res) => {
  const def = getRes(req, res); if (!def) return;
  const id = Number(req.params.id);
  await remove(def.table, { id });
  if (def.table === 'courses') await remove('lessons', { course_id: id });
  afterChange(req.params.res);
  res.json({ ok: true });
}));

// ---------------------------------------------------------------------------
// Media library & private files
// ---------------------------------------------------------------------------
const fixName = (n) => {
  if (/[^\x00-\xff]/.test(n)) return n;
  const d = Buffer.from(n, 'latin1').toString('utf8');
  return d.includes('�') ? n : d;
};
// Files go to MongoDB Atlas (storage.js), never to the server's disk.
const mediaUpload = multer({ storage: storage.multerStorage(), limits: { fileSize: config.maxUploadMb * 1048576 } });
const privateUpload = multer({ storage: storage.multerStorage({ isPrivate: true }), limits: { fileSize: 200 * 1048576 } });
const contentOrSettings = (req, res, next) => (auth.can(req.user, 'content') || auth.can(req.user, 'settings') ? next() : fail(res, 403, req.t('You do not have permission to do this')));

router.get('/media', requirePerm(), contentOrSettings, wrap(async (req, res) => res.json(await find('media', {}, { sort: { id: -1 }, limit: 500 }))));
router.post('/media', requirePerm(), contentOrSettings, mediaUpload.single('file'), wrap(async (req, res) => {
  if (!req.file) return fail(res, 400, req.t('No file received'));
  const row = { url: `/uploads/${req.file.filename}`, name: fixName(req.file.originalname).slice(0, 250), size: req.file.size, mime: req.file.mimetype, created_at: now() };
  row.id = await insert('media', row);
  res.json(row);
}));
router.delete('/media/:id', requirePerm(), contentOrSettings, wrap(async (req, res) => {
  const m = await byId('media', req.params.id);
  if (m) {
    await remove('media', { id: m.id });
    storage.remove(path.basename(m.url)).catch(() => {});
  }
  res.json({ ok: true });
}));
router.post('/private-upload', requirePerm('content'), privateUpload.single('file'), (req, res) => {
  if (!req.file) return fail(res, 400, req.t('No file received'));
  res.json({ file_path: req.file.filename, file_name: fixName(req.file.originalname).slice(0, 250) });
});

// ---------------------------------------------------------------------------
// Settings (site texts, images, social links, colours)
// ---------------------------------------------------------------------------
const SETTINGS_PERM_KEYS = ['theme', 'currency', 'pay_course', 'pay_book', 'pay_plan', 'pay_consult', 'paypal_me', 'paypal_email', 'paypal_note_ar', 'paypal_note_en'];
const NOT_EDITABLE = ['youtube_channel_id', 'linkpage', 'currency_usd_done'];
router.get('/settings', requirePerm(), contentOrSettings, (req, res) => res.json({
  values: settings.all(), palettes: settings.PALETTES,
  payments: { gatewayReady: payments.gatewayReady(), gatewayMode: payments.gateway.mode, paypalMe: payments.paypalMeUrl() },
}));
router.put('/settings', requirePerm(), contentOrSettings, wrap(async (req, res) => {
  const values = {};
  for (const [k, v] of Object.entries(req.body.values || {})) {
    if (!(k in settings.DEFAULTS) || NOT_EDITABLE.includes(k)) continue;
    if (SETTINGS_PERM_KEYS.includes(k) ? !auth.can(req.user, 'settings') : !auth.can(req.user, 'content')) continue;
    if (k === 'theme') {
      const t = typeof v === 'string' ? JSON.parse(v) : v;
      if (!['bg', 'surface', 'text', 'primary'].every((c) => settings.HEX.test(t[c] || ''))) return fail(res, 400, 'Invalid colours');
      values.theme = JSON.stringify({ bg: t.bg, surface: t.surface, text: t.text, primary: t.primary, name: t.name || 'Custom' });
    } else if (k.startsWith('pay_')) {
      const list = String(v || '').split(',').filter((m) => payments.METHODS.includes(m));
      values[k] = (list.length ? [...new Set(list)] : ['chat']).join(',');
    } else values[k] = String(v == null ? '' : v).slice(0, 20000);
  }
  if ('social_youtube' in values && values.social_youtube !== settings.get('social_youtube')) {
    values.youtube_channel_id = await social.resolveYoutubeChannel(values.social_youtube);
  }
  await settings.save(values);
  res.json({ ok: true, values: settings.all() });
}));

// ---------------------------------------------------------------------------
// Social posts helpers
// ---------------------------------------------------------------------------
router.post('/social/preview', requirePerm('content'), wrap(async (req, res) => {
  const url = String(req.body.url || '').trim();
  if (!/^https?:\/\//.test(url)) return fail(res, 400, req.t('Please paste a full link starting with https://'));
  res.json(await social.preview(url));
}));
router.post('/social/sync', requirePerm('content'), wrap(async (req, res) => {
  try { res.json(await social.syncYoutube()); } catch (e) { fail(res, 400, e.message); }
}));

// ---------------------------------------------------------------------------
// Team & roles
// ---------------------------------------------------------------------------
// Performance numbers for a list of team members.
async function staffStats(ids) {
  const [conv, msgs, ord] = await Promise.all([
    aggregate('conversations', [{ $match: { closed_by: { $in: ids } } }, { $group: {
      _id: '$closed_by', closed: { $sum: 1 }, rated: { $sum: { $cond: [{ $gt: ['$rating', 0] }, 1, 0] } }, avg: { $avg: '$rating' } } }]),
    aggregate('messages', [{ $match: { sender_type: 'staff', sender_id: { $in: ids } } },
      { $group: { _id: '$sender_id', n: { $sum: 1 }, clients: { $addToSet: '$client_id' } } }, { $project: { n: 1, clients: { $size: '$clients' } } }]),
    aggregate('orders', [{ $match: { paid_by: { $in: ids } } }, { $group: { _id: '$paid_by', n: { $sum: 1 } } }]),
  ]);
  const m = (rows) => new Map(rows.map((r) => [r._id, r]));
  return { conv: m(conv), msgs: m(msgs), ord: m(ord) };
}
const staffOut = (u, st) => {
  const c = st.conv.get(u.id) || {}; const ms = st.msgs.get(u.id) || {}; const o = st.ord.get(u.id) || {};
  return {
    ...auth.publicUser(u), chats_closed: c.closed || 0, ratings_count: c.rated || 0, avg_rating: c.avg == null ? null : Number(c.avg),
    messages_sent: ms.n || 0, clients_served: ms.clients || 0, orders_confirmed: o.n || 0, online: chat.staffSockets.has(u.id),
  };
};
async function teamList(filter) {
  const rows = await find('users', { role: { $in: ['admin', 'support', 'editor'] }, is_super: { $ne: 1 }, ...filter }, { sort: { active: -1, role: 1, name: 1 }, projection: auth.SAFE });
  const st = await staffStats(rows.map((u) => u.id));
  return rows.map((u) => staffOut(u, st));
}

router.get('/team', requirePerm('team_view'), wrap(async (req, res) => res.json(await teamList({}))));
router.get('/team/:id', requirePerm('team_view'), wrap(async (req, res) => {
  const u = await one('users', { id: Number(req.params.id), role: { $ne: 'client' } }, { projection: auth.SAFE });
  if (!u || (u.is_super && !req.user.is_super)) return fail(res, 404, req.t('Not found'));
  const convs = await find('conversations', { closed_by: u.id }, { sort: { closed_at: -1 }, limit: 300 });
  const clients = await mapById('users', convs.map((c) => c.client_id), { id: 1, name: 1 });
  const ratings = convs.map((c) => ({ id: c.id, rating: c.rating, comment: c.comment, closed_at: c.closed_at, status: c.status, client_id: c.client_id, client_name: (clients.get(c.client_id) || {}).name || '—' }));
  const distribution = [1, 2, 3, 4, 5].map((s) => ratings.filter((x) => x.rating === s).length);
  res.json({ user: staffOut(u, await staffStats([u.id])), ratings, distribution });
}));
function validateStaff(body, t, requirePassword) {
  const name = String(body.name || '').trim().slice(0, 100);
  const email = String(body.email || '').trim().toLowerCase() || null;
  let phone = null;
  let country = body.country || null;
  if (String(body.phone || '').trim()) {
    const p = countries.normalize(body.country, body.phone);
    if (!p) return { error: t('Please enter a valid phone number') };
    phone = p.e164; country = p.country;
  }
  const password = String(body.password || '');
  if (name.length < 2) return { error: t('Please enter the full name') };
  if (email && !isEmail(email)) return { error: t('Please enter a valid email') };
  if (!email && !phone) return { error: t('Enter an email or a phone number to log in with') };
  if ((requirePassword || password) && password.length < 6) return { error: t('Password must be at least 6 characters') };
  return { name, email, phone, country, password };
}
const dupMsg = (e, t) => (!isDup(e) ? e.message : dupKey(e) === 'phone' ? t('This phone number is already used by another account') : t('This email is already used by another account'));

router.post('/team', requirePerm('team'), wrap(async (req, res) => {
  const t = req.t;
  const role = ['admin', 'support', 'editor'].includes(req.body.role) ? req.body.role : 'support';
  const v = validateStaff(req.body, t, true);
  if (v.error) return fail(res, 400, v.error);
  try {
    await auth.newUser({ role, name: v.name, email: v.email, phone: v.phone, country: v.country, password_hash: hashPassword(v.password), email_verified: 1 });
  } catch (e) { return fail(res, 400, dupMsg(e, t)); }
  res.json({ ok: true });
}));
router.put('/team/:id', requirePerm('team'), wrap(async (req, res) => {
  const t = req.t;
  const target = await one('users', { id: Number(req.params.id), role: { $ne: 'client' } });
  if (!target) return fail(res, 404, t('Not found'));
  const me = req.user;
  const v = validateStaff({ ...target, ...req.body }, t, false);
  if (v.error) return fail(res, 400, v.error);
  let role = target.role;
  if (req.body.role && !target.is_super && ['admin', 'support', 'editor'].includes(req.body.role)) role = req.body.role;
  let active = req.body.active === undefined ? target.active : (req.body.active ? 1 : 0);
  if (target.is_super || target.id === me.id) active = 1;
  try {
    await setOne('users', { id: target.id }, { name: v.name, email: v.email, phone: v.phone, country: v.country, role, active });
  } catch (e) { return fail(res, 400, dupMsg(e, t)); }
  if (v.password) await setOne('users', { id: target.id }, { password_hash: hashPassword(v.password) });
  auth.forgetUser(target.id);
  if (!active || role !== target.role) { await remove('sessions', { user_id: target.id }); chat.kickUser(target.id); }
  res.json({ ok: true });
}));
// Delete a team member (Owner only). The Owner account itself can never be deleted.
router.delete('/team/:id', requirePerm('team'), wrap(async (req, res) => {
  const target = await one('users', { id: Number(req.params.id), role: { $ne: 'client' } });
  if (!target) return fail(res, 404, req.t('Not found'));
  if (target.is_super || target.id === req.user.id) return fail(res, 403, req.t('This account is permanent and cannot be deleted'));
  await remove('sessions', { user_id: target.id });
  auth.forgetUser(target.id);
  chat.kickUser(target.id);
  await remove('users', { id: target.id }); // their past messages stay in the chats
  res.json({ ok: true });
}));

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------
const CLIENT_FILTER = { role: 'client', $or: [{ email_verified: 1 }, { is_guest: 1 }] };
const clientType = (c) => (c.is_guest ? 'guest' : c.email_verified ? 'account' : 'pending');
const activeDays = (req) => Math.min(365, Math.max(1, Number(req.query.days) || 30));
// Last message time, number of messages and paid orders for a list of clients.
async function activity(ids) {
  const [msgs, paid] = await Promise.all([
    aggregate('messages', [{ $match: { sender_type: 'client', client_id: { $in: ids } } }, { $group: { _id: '$client_id', last: { $max: '$created_at' }, n: { $sum: 1 } } }]),
    aggregate('orders', [{ $match: { status: 'paid', user_id: { $in: ids } } }, { $group: { _id: '$user_id', n: { $sum: 1 }, spent: { $sum: '$total' } } }]),
  ]);
  return { msgs: new Map(msgs.map((r) => [r._id, r])), paid: new Map(paid.map((r) => [r._id, r])) };
}
// Last time the client did anything: visited the site, chatted, or signed up.
const lastActive = (c, act) => Math.max(Number(c.created_at) || 0, Number(c.last_seen) || 0, Number((act.msgs.get(c.id) || {}).last) || 0);

router.get('/clients', requirePerm('clients'), wrap(async (req, res) => {
  const filter = { role: 'client' };
  const term = String(req.query.q || '').trim();
  if (term) {
    const digits = term.replace(/\D/g, '').replace(/^0+/, '');
    filter.$or = [{ name: rx(term) }, { email: rx(term) }, ...(digits ? [{ phone: rx(digits) }] : [])];
  }
  if (req.query.country) filter.country = String(req.query.country).toUpperCase();
  const users = await find('users', filter, { projection: auth.SAFE });
  const act = await activity(users.map((u) => u.id));
  const since = now() - activeDays(req) * 864e5;
  let rows = users.map((c) => {
    const p = act.paid.get(c.id) || {};
    const last = lastActive(c, act);
    return {
      id: c.id, name: c.name, email: c.email, phone: c.phone, country: c.country, is_guest: c.is_guest, email_verified: c.email_verified,
      active: c.active, created_at: c.created_at, last_seen: c.last_seen, client_rating: c.client_rating,
      last_active: last, paid_orders: p.n || 0, spent: p.spent || 0, messages: (act.msgs.get(c.id) || {}).n || 0, type: clientType(c), is_active: last >= since,
    };
  }).sort((a, b) => b.last_active - a.last_active);
  const st = req.query.status;
  if (st === 'active') rows = rows.filter((c) => c.is_active);
  if (st === 'inactive') rows = rows.filter((c) => !c.is_active);
  if (['guest', 'account', 'pending'].includes(req.query.type)) rows = rows.filter((c) => c.type === req.query.type);
  if (req.query.type === 'buyers') rows = rows.filter((c) => c.paid_orders > 0);
  res.json(rows.slice(0, 2000));
}));

// Totals and a per-country breakdown (e.g. 10 Egypt, 5 Saudi Arabia - 2 active, 3 inactive).
async function clientStats(days) {
  const users = await find('users', CLIENT_FILTER, { projection: { id: 1, country: 1, is_guest: 1, created_at: 1, last_seen: 1 } });
  const act = await activity(users.map((u) => u.id));
  const since = now() - days * 864e5;
  const week = now() - 7 * 864e5;
  const blank = () => ({ total: 0, active: 0, inactive: 0, accounts: 0, guests: 0, buyers: 0, new_week: 0 });
  const totals = blank();
  const by = {};
  for (const r of users) {
    const key = r.country || '--';
    by[key] = by[key] || blank();
    for (const b of [totals, by[key]]) {
      b.total++;
      if (lastActive(r, act) >= since) b.active++; else b.inactive++;
      if (r.is_guest) b.guests++; else b.accounts++;
      if (act.paid.has(r.id)) b.buyers++;
      if (Number(r.created_at) >= week) b.new_week++;
    }
  }
  const byCountry = Object.entries(by).map(([country, v]) => ({ country, ...v })).sort((a, b) => b.total - a.total);
  return { days, totals: { ...totals, countries: byCountry.filter((c) => c.country !== '--').length }, byCountry };
}
router.get('/clients/stats', requirePerm('clients'), wrap(async (req, res) => res.json(await clientStats(activeDays(req)))));
router.get('/clients/:id', requirePerm(), wrap(async (req, res) => {
  if (!auth.can(req.user, 'clients') && !auth.can(req.user, 'chat')) return fail(res, 403, req.t('You do not have permission to do this'));
  const id = Number(req.params.id);
  const client = await one('users', { id, role: 'client' }, { projection: auth.SAFE });
  if (!client) return fail(res, 404, req.t('Client not found'));
  client.online = chat.isClientOnline(id);
  const [ents, orderRows, bookingRows, convs, subs] = await Promise.all([
    find('entitlements', { user_id: id }, { sort: { created_at: -1 } }),
    find('orders', { user_id: id }, { sort: { id: -1 } }),
    find('bookings', { user_id: id }, { sort: { id: -1 } }),
    find('conversations', { client_id: id }, { sort: { id: -1 } }),
    find('subscriptions', { user_id: id }, { sort: { id: -1 } }),
  ]);
  const [courses, books, types, plans, people, msgCounts] = await Promise.all([
    mapById('courses', ents.filter((e) => e.item_type === 'course').map((e) => e.item_id), { id: 1, title: 1 }),
    mapById('books', ents.filter((e) => e.item_type === 'book').map((e) => e.item_id), { id: 1, title: 1 }),
    mapById('consult_types', bookingRows.map((b) => b.type_id), { id: 1, title: 1 }),
    mapById('plans', subs.map((s) => s.plan_id), { id: 1, title: 1 }),
    mapById('users', [...convs.map((c) => c.closed_by), ...subs.map((s) => s.granted_by)], { id: 1, name: 1 }),
    countBy('messages', { conversation_id: { $in: convs.map((c) => c.id) }, sender_type: { $ne: 'system' } }, 'conversation_id'),
  ]);
  const name = (m, id2) => (m.get(id2) || {}).title || (m.get(id2) || {}).name || null;
  res.json({
    client,
    entitlements: ents.map((e) => ({ ...e, title: name(e.item_type === 'course' ? courses : books, e.item_id) })),
    orders: orderRows.map((o) => ({ ...o, items: (o.items || []).map((i) => i.title).join(' | ') })),
    bookings: bookingRows.map((b) => ({ ...b, title: name(types, b.type_id) })),
    conversations: convs.map((c) => ({ ...c, closed_by_name: name(people, c.closed_by), message_count: msgCounts.get(c.id) || 0 })),
    subscriptions: subs.map((s) => ({ ...s, plan_title: name(plans, s.plan_id), granted_by_name: name(people, s.granted_by) })),
    memberUntil: await shop.subEnd(id),
  });
}));
router.put('/clients/:id', requirePerm(), wrap(async (req, res) => {
  if (!auth.can(req.user, 'clients') && !auth.can(req.user, 'chat')) return fail(res, 403, req.t('You do not have permission to do this'));
  const id = Number(req.params.id);
  const sets = {};
  if ('rating' in req.body) sets.client_rating = req.body.rating ? Math.max(1, Math.min(5, Math.round(Number(req.body.rating)))) : null;
  if ('note' in req.body) sets.client_note = String(req.body.note || '').trim().slice(0, 2000) || null;
  if ('active' in req.body) {
    if (!auth.can(req.user, 'accounts')) return fail(res, 403, req.t('Only the owner can block or delete accounts'));
    sets.active = req.body.active ? 1 : 0;
  }
  if (Object.keys(sets).length) await setOne('users', { id, role: 'client' }, sets);
  auth.forgetUser(id);
  if (sets.active === 0) { await remove('sessions', { user_id: id }); chat.kickUser(id); }
  chat.pushChatRow(id).catch(() => {});
  res.json({ ok: true });
}));
// Delete a client and everything linked to them (Owner only).
router.delete('/clients/:id', requirePerm('accounts'), wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!(await one('users', { id, role: 'client' }))) return fail(res, 404, req.t('Client not found'));
  auth.forgetUser(id);
  chat.kickUser(id);
  await Promise.all([
    ...['orders', 'bookings', 'entitlements', 'subscriptions', 'sessions', 'email_codes'].map((table) => remove(table, { user_id: id })),
    remove('messages', { client_id: id }), remove('conversations', { client_id: id }), set('comments', { user_id: id }, { user_id: null }),
  ]);
  await remove('users', { id });
  res.json({ ok: true });
}));
// Give a free membership for N months (stacks on top of any membership left).
router.post('/clients/:id/membership', requirePerm('clients'), wrap(async (req, res) => {
  const id = Number(req.params.id);
  const months = Math.max(1, Math.min(36, Math.round(Number(req.body.months) || 1)));
  if (!(await one('users', { id, role: 'client' }))) return fail(res, 404, req.t('Client not found'));
  const until = await shop.grantSubscription(id, { months, planId: Number(req.body.plan_id) || null, by: req.user.id });
  await chat.systemMessage(id, chat.sys('sub', { title: req.t('Membership'), until }));
  res.json({ ok: true, until });
}));
router.post('/subscriptions/:id/cancel', requirePerm('orders'), wrap(async (req, res) => {
  await setOne('subscriptions', { id: Number(req.params.id) }, { status: 'cancelled' });
  res.json({ ok: true });
}));
router.get('/subscriptions', requirePerm('orders'), wrap(async (req, res) => {
  const expired = req.query.status === 'expired';
  const subs = await find('subscriptions', { status: { $ne: 'cancelled' } }, { sort: { id: -1 } });
  // one row per member: their latest membership period
  const byUser = new Map();
  for (const s of subs) {
    const e = byUser.get(s.user_id) || { latest: s, until: 0, periods: 0 };
    e.periods++;
    if (s.status === 'active') e.until = Math.max(e.until, Number(s.ends_at));
    byUser.set(s.user_id, e);
  }
  const users = await mapById('users', [...byUser.keys()], { id: 1, name: 1, phone: 1, country: 1, email: 1 });
  const plans = await mapById('plans', [...byUser.values()].map((e) => e.latest.plan_id), { id: 1, title: 1 });
  const t = now();
  const rows = [...byUser.entries()].map(([uid, e]) => {
    const u = users.get(uid) || {};
    return { ...e.latest, plan_title: (plans.get(e.latest.plan_id) || {}).title || null, client_name: u.name || '—', client_phone: u.phone, client_country: u.country, client_email: u.email, member_until: e.until || null, periods: e.periods };
  }).filter((r) => (expired ? !(Number(r.member_until) > t) : Number(r.member_until) > t))
    .sort((a, b) => (b.member_until || 0) - (a.member_until || 0));
  res.json(rows.slice(0, 1000));
}));

router.post('/clients/:id/grant', requirePerm('clients'), wrap(async (req, res) => {
  const type = req.body.type === 'book' ? 'book' : 'course';
  const item = await shop.loadItem(type, req.body.item_id);
  if (!item) return fail(res, 404, req.t('Not found'));
  const userId = Number(req.params.id);
  if (!(await one('entitlements', { user_id: userId, item_type: type, item_id: item.id }))) {
    await insert('entitlements', { user_id: userId, item_type: type, item_id: item.id, order_id: null, granted_by: req.user.id, created_at: now() });
  }
  res.json({ ok: true });
}));
router.delete('/clients/:id/grant/:entId', requirePerm('clients'), wrap(async (req, res) => {
  await remove('entitlements', { id: Number(req.params.entId), user_id: Number(req.params.id) });
  res.json({ ok: true });
}));
router.get('/catalog', requirePerm(), wrap(async (req, res) => {
  res.json({
    courses: await find('courses', {}, { sort: { title: 1 }, projection: { id: 1, title: 1, slug: 1, cover: 1 } }),
    books: await find('books', {}, { sort: { title: 1 }, projection: { id: 1, title: 1, slug: 1, cover: 1 } }),
  });
}));

// ---------------------------------------------------------------------------
// Orders & bookings
// ---------------------------------------------------------------------------
router.get('/orders', requirePerm('orders'), wrap(async (req, res) => {
  const status = ['pending', 'paid', 'cancelled'].includes(req.query.status) ? req.query.status : null;
  const orders = await find('orders', status ? { status } : {}, { sort: { id: -1 }, limit: 500 });
  const users = await mapById('users', [...orders.map((o) => o.user_id), ...orders.map((o) => o.paid_by)], { id: 1, name: 1, email: 1, phone: 1 });
  res.json(orders.map((o) => {
    const u = users.get(o.user_id) || {};
    return { ...o, client_name: u.name || '—', client_email: u.email, client_phone: u.phone, paid_by_name: (users.get(o.paid_by) || {}).name || null,
      items: (o.items || []).map((i) => `${i.item_type}:${i.title}`).join(' | ') };
  }));
}));
router.post('/orders/:id/confirm', requirePerm('orders'), wrap(async (req, res) => {
  await shop.confirmOrder(Number(req.params.id), req.user);
  res.json({ ok: true });
}));
router.post('/orders/:id/cancel', requirePerm('orders'), wrap(async (req, res) => {
  await shop.cancelOrder(Number(req.params.id));
  res.json({ ok: true });
}));

router.get('/bookings', requirePerm('bookings'), wrap(async (req, res) => {
  const status = String(req.query.status || '');
  const list = await find('bookings', status ? { status } : {}, { sort: { id: -1 }, limit: 500 });
  const [types, users, orders] = await Promise.all([
    mapById('consult_types', list.map((b) => b.type_id), { id: 1, title: 1, duration_min: 1 }),
    mapById('users', list.map((b) => b.user_id), { id: 1, name: 1, email: 1, phone: 1 }),
    mapById('orders', list.map((b) => b.order_id), { id: 1, status: 1, total: 1 }),
  ]);
  const rows = list.map((b) => {
    const ty = types.get(b.type_id) || {}; const u = users.get(b.user_id) || {}; const o = orders.get(b.order_id) || {};
    return { ...b, title: ty.title || '', duration_min: ty.duration_min, client_name: u.name || '—', client_email: u.email, client_phone: u.phone, order_status: o.status, total: o.total };
  }).sort((a, b) => ((b.status === 'paid') - (a.status === 'paid')) || ((b.scheduled_at || b.created_at) - (a.scheduled_at || a.created_at)));
  res.json(rows);
}));
router.put('/bookings/:id', requirePerm('bookings'), wrap(async (req, res) => {
  const b = await byId('bookings', req.params.id);
  if (!b) return fail(res, 404, req.t('Not found'));
  b.title = ((await byId('consult_types', b.type_id)) || {}).title || '';
  const sets = {};
  if (['pending_payment', 'paid', 'scheduled', 'done', 'cancelled'].includes(req.body.status)) sets.status = req.body.status;
  if ('scheduled_at' in req.body) sets.scheduled_at = Number(req.body.scheduled_at) || null;
  if ('meeting_link' in req.body) sets.meeting_link = String(req.body.meeting_link || '').trim().slice(0, 500) || null;
  if ('admin_note' in req.body) sets.admin_note = String(req.body.admin_note || '').slice(0, 2000) || null;
  if (sets.scheduled_at && !sets.status && ['paid', 'pending_payment'].includes(b.status)) sets.status = 'scheduled';
  if (Object.keys(sets).length) await setOne('bookings', { id: b.id }, sets);
  if (req.body.notify) {
    const when = sets.scheduled_at || b.scheduled_at;
    await chat.systemMessage(b.user_id, chat.sys('booking', { title: b.title, at: when, link: sets.meeting_link ?? b.meeting_link, status: sets.status || b.status }));
  }
  res.json({ ok: true });
}));

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
router.get('/overview', requirePerm(), wrap(async (req, res) => {
  const out = {};
  const u = req.user;
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const jobs = []; // all dashboard sections are loaded at the same time
  const job = (perm, fn) => { if (auth.can(u, perm)) jobs.push(fn()); };
  job('chat', async () => {
    const rows = await chat.chatRows();
    out.waiting = rows.filter((r) => r.waiting_since).length;
    out.unread = rows.filter((r) => r.unread > 0).length;
    const [r] = await aggregate('conversations', [{ $match: { rating: { $gt: 0 } } }, { $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } }]);
    out.avgRating = r ? Number(r.avg) : null;
    out.ratingsCount = r ? r.n : 0;
    out.staffOnline = chat.staffSockets.size;
  });
  job('orders', async () => {
    const [pending, rev, members] = await Promise.all([
      count('orders', { status: 'pending' }),
      aggregate('orders', [{ $match: { status: 'paid', paid_at: { $gte: monthStart.getTime() } } }, { $group: { _id: null, s: { $sum: '$total' } } }]),
      distinct('subscriptions', 'user_id', { status: 'active', starts_at: { $lte: now() }, ends_at: { $gt: now() } }),
    ]);
    out.pendingOrders = pending;
    out.revenueMonth = rev[0] ? rev[0].s : 0;
    out.activeMembers = members.length;
    out.currency = settings.get('currency');
  });
  job('bookings', async () => { out.newBookings = await count('bookings', { status: 'paid' }); });
  job('orders', async () => {
    [out.newReservations, out.proofsToCheck] = await Promise.all([count('reservations', { status: 'new' }), count('orders', { status: 'pending', proof: { $type: 'object' } })]);
  });
  job('clients', async () => {
    const st = await clientStats(30);
    out.clients = st.totals.total;
    out.clientsActive = st.totals.active;
    out.clientStats = st;
  });
  job('content', async () => { [out.courses, out.books, out.posts] = await Promise.all([count('courses'), count('books'), count('posts')]); });
  job('comments', async () => { out.pendingComments = await count('comments', { status: 'pending' }); });
  job('team_view', async () => { out.team = await teamList({ role: { $in: ['admin', 'support'] }, active: 1 }); });
  await Promise.all(jobs);
  res.json(out);
}));

// ---------------------------------------------------------------------------
// Seat reservations for "coming soon" courses and books (no payment)
// ---------------------------------------------------------------------------
router.get('/reservations', requirePerm('orders'), wrap(async (req, res) => {
  const filter = {};
  if (['new', 'contacted'].includes(req.query.status)) filter.status = req.query.status;
  res.json(await find('reservations', filter, { sort: { id: -1 }, limit: 3000 }));
}));
router.put('/reservations/:id', requirePerm('orders'), wrap(async (req, res) => {
  const status = req.body.status === 'contacted' ? 'contacted' : 'new';
  await setOne('reservations', { id: Number(req.params.id) }, { status, handled_by: req.user.id, handled_at: now() });
  res.json({ ok: true });
}));
router.delete('/reservations/:id', requirePerm('orders'), wrap(async (req, res) => {
  await remove('reservations', { id: Number(req.params.id) });
  res.json({ ok: true });
}));

// ---------------------------------------------------------------------------
// Hidden "link in bio" page (/p/<secret link>)
// ---------------------------------------------------------------------------
const linkpage = require('./linkpage');
router.get('/linkpage', requirePerm('content'), wrap(async (req, res) => res.json(await linkpage.get())));
router.put('/linkpage', requirePerm('content'), wrap(async (req, res) => {
  try { res.json(await linkpage.save(req.body || {})); } catch (e) { fail(res, 400, req.t(e.message)); }
}));

module.exports = { router };
