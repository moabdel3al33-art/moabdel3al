'use strict';
const express = require('express');
const { one, find, byId, insert, set, setOne, col } = require('./db');
const settings = require('./settings');
const { now, money, esc, tr, limited, isEmail } = require('./util');
const auth = require('./auth');
const chat = require('./chat');
const config = require('./config');
const payments = require('./payments');

const ITEM_TABLE = { course: 'courses', book: 'books', consultation: 'consult_types', plan: 'plans' };
const SUB_TYPES = ['course', 'book']; // what a membership unlocks

// ---------------------------------------------------------------------------
// Memberships
// ---------------------------------------------------------------------------
const addMonths = (ts, months) => { const d = new Date(Number(ts)); d.setMonth(d.getMonth() + Number(months)); return d.getTime(); };
async function activeSub(user) {
  if (!user || user.role !== 'client') return null;
  const s = await one('subscriptions', { user_id: user.id, status: 'active', starts_at: { $lte: now() }, ends_at: { $gt: now() } }, { sort: { ends_at: -1 } });
  if (!s) return null;
  const plan = s.plan_id ? await byId('plans', s.plan_id) : null;
  return { ...s, plan_title: plan ? plan.title : null };
}
// Latest end date of all active memberships (renewals stack on top of each other).
async function subEnd(userId) {
  const r = await one('subscriptions', { user_id: Number(userId), status: 'active', ends_at: { $gt: now() } }, { sort: { ends_at: -1 } });
  return r ? Number(r.ends_at) : null;
}
async function grantSubscription(userId, { months, planId = null, orderId = null, by = null }) {
  const start = (await subEnd(userId)) || now();
  const end = addMonths(start, months);
  await insert('subscriptions', { user_id: userId, plan_id: planId, order_id: orderId, months, starts_at: start, ends_at: end, status: 'active', granted_by: by, reminded: 0, created_at: now() });
  return end;
}

async function loadItem(type, id) {
  const table = ITEM_TABLE[type];
  if (!table) return null;
  return byId(table, id);
}

async function hasAccess(user, type, id) {
  if (!user) return false;
  if (auth.isStaff(user)) return true; // staff can preview everything
  if (await one('entitlements', { user_id: user.id, item_type: type, item_id: Number(id) })) return true;
  return SUB_TYPES.includes(type) && !!(await activeSub(user));
}
// Set of owned ids. With an active membership everything counts as owned (.sub = true).
async function ownedIds(user, type) {
  if (!user) return new Set();
  if (SUB_TYPES.includes(type) && (await activeSub(user))) return Object.assign(new Set(), { has: () => true, sub: true });
  const rows = await find('entitlements', { user_id: user.id, item_type: type });
  return new Set(rows.map((r) => r.item_id));
}
async function pendingOrderFor(user, type, id) {
  if (!user) return null;
  return one('orders', { user_id: user.id, status: 'pending', items: { $elemMatch: { item_type: type, item_id: Number(id) } } }, { sort: { id: -1 } });
}

async function createOrder(user, items) {
  const total = items.reduce((s, i) => s + Number(i.price || 0), 0);
  // the items live inside the order document
  const orderId = await insert('orders', {
    user_id: user.id, status: 'pending', total, currency: settings.get('currency'), note: null, created_at: now(), paid_at: null, paid_by: null,
    items: items.map((i) => ({ item_type: i.type, item_id: i.id, title: i.title, price: Number(i.price) || 0 })),
  });
  chat.pushChatRow(user.id).catch(() => {});
  return orderId;
}

async function orderWithItems(orderId) {
  const order = await byId('orders', orderId);
  if (!order) return null;
  order.items = order.items || [];
  order.booking = await one('bookings', { order_id: order.id });
  return order;
}

// The ready-made chat message the client only has to send.
function orderDraft(order, user, lang) {
  const t = tr(lang);
  const kind = { course: t('Course'), book: t('Book'), consultation: t('Consultation'), plan: t('Membership') };
  const lines = [t('Hello, I would like to complete this order:'), ''];
  for (const i of order.items) lines.push(`• ${kind[i.item_type] || ''}: ${i.title} — ${money(i.price, order.currency, lang)}`);
  if (order.booking) {
    const b = order.booking;
    if (b.preferred_date || b.preferred_time) lines.push(`  ${t('Preferred time')}: ${[b.preferred_date, b.preferred_time].filter(Boolean).join(' ')}`);
    if (b.notes) lines.push(`  ${t('Notes')}: ${b.notes}`);
  }
  lines.push('', `${t('Order number')}: #${order.id}`, `${t('Total')}: ${money(order.total, order.currency, lang)}`, '',
    `${t('My details')}:`, `${t('Name')}: ${user.name}`, `${t('Email')}: ${user.email || '-'}`, `${t('Phone')}: ${user.phone ? countries.format(user.phone, user.country) : '-'}`, '',
    t('Please send me the payment details.'));
  return lines.join('\n');
}

// Called by staff after the client has paid (or by the payment gateway, staff = null): unlocks the products and tells the client.
async function confirmOrder(orderId, staff) {
  const by = staff ? staff.id : null;
  const order = await orderWithItems(orderId);
  if (!order) throw Object.assign(new Error('Order not found'), { status: 404 });
  if (order.status === 'paid') return order;
  await setOne('orders', { id: order.id }, { status: 'paid', paid_at: now(), paid_by: by });
  for (const i of order.items) {
    if (i.item_type === 'course' || i.item_type === 'book') {
      const has = await one('entitlements', { user_id: order.user_id, item_type: i.item_type, item_id: i.item_id });
      if (has) await setOne('entitlements', { id: has.id }, { order_id: order.id });
      else await insert('entitlements', { user_id: order.user_id, item_type: i.item_type, item_id: i.item_id, order_id: order.id, granted_by: by, created_at: now() });
    }
    if (i.item_type === 'plan') {
      const plan = await byId('plans', i.item_id);
      const until = await grantSubscription(order.user_id, { months: plan ? plan.months : 1, planId: i.item_id, orderId, by });
      await chat.systemMessage(order.user_id, chat.sys('sub', { title: i.title, until }));
    }
  }
  await set('bookings', { order_id: order.id, status: 'pending_payment' }, { status: 'paid' });
  chat.orderEmit(order.user_id, orderId, 'paid');
  await chat.systemMessage(order.user_id, chat.sys('paid', { id: orderId, items: order.items.map((i) => i.title) }));
  notifyByEmail(order.user_id, 'paid', order).catch((e) => console.error('mail', e.message));
  return orderWithItems(orderId);
}
async function cancelOrder(orderId) {
  const order = await byId('orders', orderId);
  if (!order) throw Object.assign(new Error('Order not found'), { status: 404 });
  await setOne('orders', { id: order.id }, { status: 'cancelled' });
  await set('bookings', { order_id: order.id }, { status: 'cancelled' });
  chat.orderEmit(order.user_id, orderId, 'cancelled');
  await chat.systemMessage(order.user_id, chat.sys('cancelled', { id: orderId }));
}

async function notifyByEmail(userId, kind, order) {
  if (!config.mailEnabled) return;
  const user = await byId('users', userId);
  if (!user || !user.email) return;
  const lang = config.defaultLang;
  const t = tr(lang);
  if (kind === 'paid') {
    const list = order.items.map((i) => `<li>${esc(i.title)}</li>`).join('');
    await auth.sendMail(user.email, t('Your order #{id} is active', { id: order.id }), auth.mailLayout(lang, t('Payment confirmed'),
      `<p>${esc(t('Hello {name},', { name: user.name }))}</p><p>${esc(t('Your payment was confirmed. You now have access to:'))}</p><ul>${list}</ul>
       <p><a href="${config.siteUrl}/account" style="color:#b3132f">${esc(t('Open my account'))}</a></p>`));
  }
}

// ---------------------------------------------------------------------------
// Client API
// ---------------------------------------------------------------------------
const router = express.Router();
const { wrap, fail, requireAccount } = auth;
const countries = require('../public/countries');

router.post('/orders', requireAccount, wrap(async (req, res) => {
  const t = req.t;
  const type = String(req.body.type || '');
  if (!['course', 'book', 'plan'].includes(type)) return fail(res, 400, t('Invalid item'));
  const item = await loadItem(type, req.body.id);
  if (!item || !item.published) return fail(res, 404, t('This item is not available'));
  if (item.coming_soon) return fail(res, 400, t('Stay tuned! This content will be available soon.'));
  if (type !== 'plan' && await hasAccess(req.user, type, item.id)) return fail(res, 400, t('You already own this'));
  const existing = await pendingOrderFor(req.user, type, item.id);
  const orderId = existing ? existing.id : await createOrder(req.user, [{ type, id: item.id, title: item.title, price: item.price }]);
  res.json({ ok: true, orderId, redirect: payments.nextUrl(orderId, type) });
}));

router.post('/bookings', requireAccount, wrap(async (req, res) => {
  const t = req.t;
  const type = await loadItem('consultation', req.body.type_id);
  if (!type || !type.published) return fail(res, 404, t('This item is not available'));
  const date = String(req.body.date || '').slice(0, 20);
  const time = String(req.body.time || '').slice(0, 20);
  const notes = String(req.body.notes || '').trim().slice(0, 2000);
  if (!date) return fail(res, 400, t('Please choose a preferred date'));
  const orderId = await createOrder(req.user, [{ type: 'consultation', id: type.id, title: type.title, price: type.price }]);
  await insert('bookings', { user_id: req.user.id, type_id: type.id, order_id: orderId, preferred_date: date, preferred_time: time, notes, status: 'pending_payment', scheduled_at: null, meeting_link: null, admin_note: null, created_at: now() });
  res.json({ ok: true, orderId, redirect: payments.nextUrl(orderId, 'consultation') });
}));

// "Coming soon" courses and books: visitors book a seat with their details only (no account, no payment).
router.post('/reserve', wrap(async (req, res) => {
  const t = req.t;
  if (String(req.body.website || '')) return res.json({ ok: true }); // hidden field only bots fill in
  if (limited(`reserve:${req.ip}`, 15, 3600e3)) return fail(res, 429, t('Too many attempts. Please try again later.'));
  const type = req.body.type === 'book' ? 'book' : 'course';
  const item = await loadItem(type, req.body.id);
  if (!item || !item.published) return fail(res, 404, t('This item is not available'));
  const name = String(req.body.name || '').trim().slice(0, 100);
  if (name.length < 2) return fail(res, 400, t('Please enter your full name'));
  const p = countries.normalize(req.body.country, req.body.phone);
  if (!p) return fail(res, 400, t('Please enter a valid phone number'));
  const email = String(req.body.email || '').trim().toLowerCase().slice(0, 200) || null;
  if (email && !isEmail(email)) return fail(res, 400, t('Please enter a valid email'));
  const notes = String(req.body.notes || '').trim().slice(0, 1000) || null;
  const row = { item_type: type, item_id: item.id, title: item.title, user_id: req.user && req.user.role === 'client' ? req.user.id : null,
    name, phone: p.e164, country: p.country, email, notes, updated_at: now() };
  const same = await one('reservations', { item_type: type, item_id: item.id, phone: p.e164 });
  if (same) await setOne('reservations', { id: same.id }, row);
  else await insert('reservations', { ...row, status: 'new', created_at: now() });
  chat.staffEmit('reservations:changed');
  res.json({ ok: true });
}));

// Reminds members in the chat 3 days before their membership ends.
async function remindEndingSubs() {
  const candidates = await find('subscriptions', { status: 'active', reminded: { $ne: 1 }, ends_at: { $gt: now(), $lt: now() + 3 * 864e5 } });
  const soon = [];
  for (const s of candidates) if ((await subEnd(s.user_id)) === Number(s.ends_at)) soon.push(s); // only the last period of each member
  for (const s of soon) {
    await setOne('subscriptions', { id: s.id }, { reminded: 1 });
    await chat.systemMessage(s.user_id, chat.sys('sub_ending', { until: Number(s.ends_at) }));
  }
}
setInterval(() => remindEndingSubs().catch((e) => console.error('reminders', e.message)), 3600e3).unref();
setTimeout(() => remindEndingSubs().catch(() => {}), 20000).unref();

module.exports = {
  createOrder, activeSub, subEnd, grantSubscription, addMonths,
  router, loadItem, hasAccess, ownedIds, pendingOrderFor, orderWithItems, orderDraft, confirmOrder, cancelOrder, ITEM_TABLE,
};
