'use strict';
// Comments & reviews: anyone can write one, it appears on the site only after a team member publishes it.
const express = require('express');
const { one, find, byId, insert, setOne, remove, count, aggregate, mapById } = require('./db');
const { now, limited } = require('./util');
const auth = require('./auth');
const chat = require('./chat');

const TARGETS = { site: null, course: 'courses', book: 'books', post: 'posts' };
const PUBLIC = { id: 1, target_type: 1, target_id: 1, name: 1, country: 1, rating: 1, body: 1, featured: 1, reply: 1, reply_by: 1, created_at: 1 };
// adds the name of the team member who replied
async function withReplyNames(rows) {
  const staff = await mapById('users', rows.map((r) => r.reply_by), { id: 1, name: 1 });
  return rows.map((r) => ({ ...r, reply_by_name: (staff.get(r.reply_by) || {}).name || null }));
}

// ---- read helpers used by the website pages ----
const approvedFor = async (type, id, limit = 50) => withReplyNames(await find('comments',
  { target_type: type, target_id: Number(id) || 0, status: 'approved' }, { sort: { featured: -1, id: -1 }, limit, projection: PUBLIC }));
async function ratingFor(type, id) {
  const [r] = await aggregate('comments', [{ $match: { target_type: type, target_id: Number(id) || 0, status: 'approved' } },
    { $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: { $cond: [{ $gt: ['$rating', 0] }, 1, 0] } }, total: { $sum: 1 } } }]);
  return { avg: r && r.avg != null ? Number(r.avg) : null, count: r ? r.n : 0, total: r ? r.total : 0 };
}
// For the home page: featured comments first, then site reviews and other well-rated ones.
async function testimonials(limit = 10) {
  const rows = await find('comments', { status: 'approved', $or: [{ featured: 1 }, { target_type: 'site' }, { rating: { $gte: 4 } }] },
    { sort: { featured: -1, id: -1 }, limit: limit * 3, projection: PUBLIC });
  rows.sort((a, b) => (b.featured - a.featured) || ((b.target_type === 'site') - (a.target_type === 'site')) || (b.id - a.id));
  return withReplyNames(rows.slice(0, limit));
}

// ---- public: write a comment ----
const router = express.Router();
const { wrap, fail } = auth;
router.post('/', wrap(async (req, res) => {
  const t = req.t;
  if (String(req.body.website || '')) return res.json({ ok: true }); // hidden field filled = spam bot
  const ip = req.ip || '';
  if (limited(`comment:${ip}`, 6, 3600e3)) return fail(res, 429, t('Too many comments. Please try again later.'));
  const type = String(req.body.target_type || 'site');
  if (!(type in TARGETS)) return fail(res, 400, t('Invalid item'));
  const targetId = type === 'site' ? 0 : Number(req.body.target_id);
  if (TARGETS[type] && !(await one(TARGETS[type], { id: targetId, published: 1 }))) return fail(res, 404, t('This item is not available'));
  const user = req.user && req.user.role === 'client' ? req.user : null;
  const name = String((user && user.name) || req.body.name || '').trim().slice(0, 100);
  const body = String(req.body.body || '').trim().slice(0, 1500);
  const rating = Number(req.body.rating) >= 1 && Number(req.body.rating) <= 5 ? Math.round(Number(req.body.rating)) : null;
  if (name.length < 2) return fail(res, 400, t('Please enter your full name'));
  if (body.length < 3) return fail(res, 400, t('Please write your comment'));
  await insert('comments', {
    target_type: type, target_id: targetId, user_id: user ? user.id : null, name, country: user ? user.country : null, rating, body,
    status: 'pending', featured: 0, reply: null, reply_by: null, ip: ip.slice(0, 64), reviewed_by: null, reviewed_at: null, created_at: now(),
  });
  chat.staffEmit('comments:new');
  res.json({ ok: true });
}));

// ---- admin: review comments ----
const admin = express.Router();
const pendingCount = () => count('comments', { status: 'pending' });
admin.get('/', auth.requirePerm('comments'), wrap(async (req, res) => {
  const status = ['pending', 'approved', 'rejected'].includes(req.query.status) ? req.query.status : 'pending';
  const list = await find('comments', { status }, { sort: { featured: -1, id: -1 }, limit: 500 });
  const users = await mapById('users', [...list.map((c) => c.user_id), ...list.map((c) => c.reviewed_by), ...list.map((c) => c.reply_by)], { id: 1, name: 1, email: 1, phone: 1 });
  const targets = {};
  for (const [type, table] of Object.entries(TARGETS)) {
    if (table) targets[type] = await mapById(table, list.filter((c) => c.target_type === type).map((c) => c.target_id), { id: 1, title: 1, slug: 1 });
  }
  const rows = list.map((c) => {
    const u = users.get(c.user_id) || {};
    const tg = (targets[c.target_type] && targets[c.target_type].get(c.target_id)) || {};
    return { ...c, email: u.email || null, phone: u.phone || null, reviewed_by_name: (users.get(c.reviewed_by) || {}).name || null,
      reply_by_name: (users.get(c.reply_by) || {}).name || null, target_title: tg.title || null, target_slug: tg.slug || null };
  });
  res.json({ rows, pending: await pendingCount() });
}));
admin.post('/:id', auth.requirePerm('comments'), wrap(async (req, res) => {
  const id = Number(req.params.id);
  const c = await byId('comments', id);
  if (!c) return fail(res, 404, req.t('Not found'));
  const a = req.body.action;
  if (a === 'approve' || a === 'reject') await setOne('comments', { id }, { status: a === 'approve' ? 'approved' : 'rejected', reviewed_by: req.user.id, reviewed_at: now() });
  else if (a === 'feature' || a === 'unfeature') await setOne('comments', { id }, { featured: a === 'feature' ? 1 : 0 });
  else if (a === 'reply') {
    const reply = String(req.body.reply || '').trim().slice(0, 1500) || null;
    await setOne('comments', { id }, { reply, reply_by: reply ? req.user.id : null });
  } else return fail(res, 400, 'Unknown action');
  chat.staffEmit('comments:new');
  res.json({ ok: true, pending: await pendingCount() });
}));
admin.delete('/:id', auth.requirePerm('comments'), wrap(async (req, res) => {
  await remove('comments', { id: Number(req.params.id) });
  chat.staffEmit('comments:new');
  res.json({ ok: true });
}));

module.exports = { router, admin, approvedFor, ratingFor, testimonials, pendingCount };
