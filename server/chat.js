'use strict';
const crypto = require('crypto');
const express = require('express');
const { one, find, byId, insert, set, setOne, col, aggregate, distinct, mapById } = require('./db');
const { now, parseCookies, tr } = require('./util');
const auth = require('./auth');

let io = null;
const staffSockets = new Map(); // userId -> Set(socketId)
const viewers = new Map(); // clientId -> Map(socketId -> name)
const calls = new Map();
const CALL_RING_MS = 40000;
const MSG_TYPES = new Set(['text', 'image', 'video', 'audio', 'file']);

const isClientOnline = (clientId) => (io && io.sockets.adapter.rooms.get(`client:${clientId}`)?.size) > 0;
const staffOnline = () => staffSockets.size > 0;

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
// ---- messages: add sender names, the quoted message and the order status ----
async function hydrate(msgs, knownNames = {}) {
  if (!msgs.length) return msgs;
  const [replies, orders] = await Promise.all([
    mapById('messages', msgs.map((m) => m.reply_to)),
    mapById('orders', msgs.map((m) => m.order_id), { id: 1, status: 1, total: 1, currency: 1 }),
  ]);
  const staffIds = [...msgs.filter((m) => m.sender_type === 'staff').map((m) => m.sender_id),
    ...[...replies.values()].filter((r) => r.sender_type === 'staff').map((r) => r.sender_id)].filter((id) => !(id in knownNames));
  const users = await mapById('users', staffIds, { id: 1, name: 1 });
  for (const [id, name] of Object.entries(knownNames)) users.set(Number(id), { id: Number(id), name });
  const nm = (id) => (users.get(id) || {}).name || null;
  return msgs.map((m) => {
    const r = m.reply_to ? replies.get(m.reply_to) : null;
    const o = m.order_id ? orders.get(m.order_id) : null;
    return {
      ...m,
      sender_name: m.sender_type === 'staff' ? nm(m.sender_id) : null,
      reply_type: r ? r.type : null, reply_body: r ? r.body : null, reply_file_name: r ? r.file_name : null,
      reply_sender_type: r ? r.sender_type : null, reply_sender_name: r && r.sender_type === 'staff' ? nm(r.sender_id) : null,
      order_status: o ? o.status : null, order_total: o ? o.total : null, order_currency: o ? o.currency : null,
    };
  });
}
const listMessages = async (clientId, limit = 1500) =>
  (await hydrate(await find('messages', { client_id: Number(clientId) }, { sort: { id: -1 }, limit }))).reverse();
const getMessage = async (id) => { const m = await byId('messages', id); return m ? (await hydrate([m]))[0] : null; };

// ---- inbox rows ----
// Each client keeps small chat counters (updated when messages are sent) so the inbox loads fast:
// chat_last_id, chat_unread, chat_pending_since (waiting for a reply since), chat_last_responder, chat_responders.
const CLIENT_FILTER = { role: 'client', $or: [{ email_verified: 1 }, { is_guest: 1 }] };
async function buildRows(clients) {
  if (!clients.length) return [];
  const ids = clients.map((c) => c.id);
  const [lasts, convs, pend] = await Promise.all([
    mapById('messages', clients.map((c) => c.chat_last_id)),
    aggregate('conversations', [{ $match: { client_id: { $in: ids } } }, { $sort: { id: -1 } },
      { $group: { _id: '$client_id', id: { $first: '$id' }, status: { $first: '$status' } } }]),
    aggregate('orders', [{ $match: { user_id: { $in: ids }, status: 'pending' } }, { $group: { _id: '$user_id', n: { $sum: 1 } } }]),
  ]);
  const staffIds = new Set();
  for (const c of clients) { (c.chat_responders || []).forEach((i) => staffIds.add(i)); if (c.chat_last_responder) staffIds.add(c.chat_last_responder); }
  for (const m of lasts.values()) if (m.sender_type === 'staff') staffIds.add(m.sender_id);
  const staff = await mapById('users', [...staffIds], { id: 1, name: 1 });
  const nm = (id) => (staff.get(id) || {}).name || null;
  const convMap = new Map(convs.map((c) => [c._id, c]));
  const pendMap = new Map(pend.map((p) => [p._id, p.n]));
  return clients.map((c) => {
    const lm = c.chat_last_id ? lasts.get(c.chat_last_id) : null;
    const cv = convMap.get(c.id);
    const row = {
      id: c.id, name: c.name, phone: c.phone, country: c.country, is_guest: c.is_guest, email: c.email,
      rating: c.client_rating, note: c.client_note, created_at: c.created_at, last_seen: c.last_seen,
      last_id: lm ? lm.id : null, last_type: lm ? lm.type : null, last_body: lm ? lm.body : null, last_file_name: lm ? lm.file_name : null,
      last_sender_type: lm ? lm.sender_type : null, last_at: lm ? lm.created_at : null, last_read_at: lm ? lm.read_at : null,
      last_delivered_at: lm ? lm.delivered_at : null, last_sender_name: lm && lm.sender_type === 'staff' ? nm(lm.sender_id) : null,
      unread: c.chat_unread || 0, pending_since: c.chat_pending_since || null,
      last_responder: c.chat_last_responder ? nm(c.chat_last_responder) : null,
      responders: (c.chat_responders || []).map(nm).filter(Boolean),
      labels: c.chat_labels || [], pending_orders: pendMap.get(c.id) || 0, conv_id: cv ? cv.id : null, conv_status: cv ? cv.status : null,
    };
    row.waiting_since = row.conv_status === 'open' && row.pending_since ? Number(row.pending_since) : null;
    row.online = isClientOnline(row.id);
    return row;
  });
}
const chatRows = async () => buildRows(await find('users', CLIENT_FILTER, { projection: auth.SAFE }));
async function chatRow(clientId) {
  const c = await one('users', { id: Number(clientId), ...CLIENT_FILTER }, { projection: auth.SAFE });
  return c ? (await buildRows([c]))[0] : null;
}
// Keeps the client's chat counters up to date after every new message.
async function trackChat(m) {
  const users = col('users');
  if (m.sender_type === 'client') {
    await users.updateOne({ id: m.client_id }, [{ $set: {
      chat_last_id: m.id, chat_unread: { $add: [{ $ifNull: ['$chat_unread', 0] }, 1] }, chat_pending_since: { $ifNull: ['$chat_pending_since', m.created_at] },
    } }]);
  } else if (m.sender_type === 'staff') {
    await users.updateOne({ id: m.client_id }, { $set: { chat_last_id: m.id, chat_pending_since: null, chat_last_responder: m.sender_id }, $addToSet: { chat_responders: m.sender_id } });
  } else {
    await users.updateOne({ id: m.client_id }, { $set: { chat_last_id: m.id } });
  }
}

const latestConv = (clientId) => one('conversations', { client_id: Number(clientId) }, { sort: { id: -1 } });
async function convPublic(c) {
  if (!c) return null;
  const closer = c.closed_by ? await byId('users', c.closed_by) : null;
  return { id: c.id, status: c.status, opened_at: c.opened_at, closed_at: c.closed_at, closed_by_name: closer ? closer.name : null, rating: c.rating, comment: c.comment };
}
async function emitConv(clientId, c) {
  const pub = await convPublic(c);
  io.to(`client:${clientId}`).emit('conversation', pub);
  io.to('staff').emit('conversation', { clientId, ...pub });
}
async function ensureOpenConv(clientId) {
  let c = await latestConv(clientId);
  if (c && c.status === 'open') return c;
  if (c && c.status === 'awaiting_rating') await setOne('conversations', { id: c.id }, { status: 'closed' });
  const id = await insert('conversations', { client_id: clientId, status: 'open', opened_at: now(), closed_at: null, closed_by: null, rating: null, comment: null, rated_at: null });
  c = await byId('conversations', id);
  await emitConv(clientId, c);
  return c;
}

async function insertMessage(m) {
  const doc = {
    client_id: m.clientId, conversation_id: m.convId || null, sender_type: m.senderType, sender_id: m.senderId || null,
    type: m.type, body: m.body || null, file_url: m.fileUrl || null, file_name: m.fileName || null, file_size: m.fileSize || null,
    mime: m.mime || null, duration: m.duration || null, reply_to: m.replyTo || null, order_id: m.orderId || null,
    created_at: now(), delivered_at: m.deliveredAt || null, read_at: null,
  };
  const id = await insert('messages', doc);
  const [, [msg]] = await Promise.all([trackChat({ id, ...doc }), hydrate([{ id, ...doc }], m.senderName ? { [m.senderId]: m.senderName } : {})]);
  return msg;
}
async function pushChatRow(clientId) {
  const row = await chatRow(clientId);
  if (row) io.to('staff').emit('chat:update', row);
}
async function emitMessage(msg, extra = {}) {
  const payload = { ...msg, ...extra };
  io.to(`client:${msg.client_id}`).emit('msg:new', payload);
  io.to('staff').emit('msg:new', payload);
  pushChatRow(msg.client_id).catch((e) => console.error('chat row', e.message));
}
// Automatic notes are stored as "key::{json}" and translated in the browser of whoever reads them.
const sys = (key, data) => `${key}::${JSON.stringify(data || {})}`;
// Used by other modules (payments, bookings) to post an automatic note in a client's chat.
async function systemMessage(clientId, body) {
  const conv = await latestConv(clientId);
  const msg = await insertMessage({ clientId, convId: conv ? conv.id : null, senderType: 'system', type: 'system', body, deliveredAt: now() });
  await emitMessage(msg);
}

// Used by the payment pages: posts a message (e.g. the payment screenshot) in the client's chat as if the client sent it.
async function clientMessage(clientId, { type = 'text', body = '', fileUrl = null, fileName = null, orderId = null }) {
  const conv = await ensureOpenConv(clientId);
  const msg = await insertMessage({ clientId, convId: conv.id, senderType: 'client', senderId: clientId, type, body, fileUrl, fileName, orderId, deliveredAt: staffOnline() ? now() : null });
  await emitMessage(msg);
}

async function markRead(clientId, readerKind) {
  const t = now();
  const side = readerKind === 'client' ? 'staff' : 'client';
  const r = await col('messages').updateMany({ client_id: clientId, sender_type: side, read_at: null },
    [{ $set: { read_at: t, delivered_at: { $ifNull: ['$delivered_at', t] } } }]);
  if (readerKind === 'staff') await setOne('users', { id: clientId }, { chat_unread: 0 });
  if (r.modifiedCount) {
    const ev = { clientId, by: readerKind, type: 'read', at: t };
    io.to(`client:${clientId}`).emit('receipt', ev);
    io.to('staff').emit('receipt', ev);
    await pushChatRow(clientId);
  }
}
async function markDeliveredForClient(clientId) {
  const t = now();
  const r = await set('messages', { client_id: clientId, sender_type: 'staff', delivered_at: null }, { delivered_at: t });
  if (r.modifiedCount) {
    const ev = { clientId, by: 'client', type: 'delivered', at: t };
    io.to(`client:${clientId}`).emit('receipt', ev);
    io.to('staff').emit('receipt', ev);
  }
}
async function markDeliveredForStaff() {
  const t = now();
  const ids = await distinct('messages', 'client_id', { sender_type: 'client', delivered_at: null });
  if (!ids.length) return;
  await set('messages', { sender_type: 'client', delivered_at: null }, { delivered_at: t });
  for (const clientId of ids) {
    const ev = { clientId, by: 'staff', type: 'delivered', at: t };
    io.to(`client:${clientId}`).emit('receipt', ev);
    io.to('staff').emit('receipt', ev);
  }
}

// ---------------------------------------------------------------------------
// HTTP API
// ---------------------------------------------------------------------------
const router = express.Router();
const { wrap, fail, requirePerm, requireClient } = auth;

// Client side
router.get('/me/state', requireClient, wrap(async (req, res) => {
  res.json({ conversation: await convPublic(await latestConv(req.user.id)), staffOnline: staffOnline() });
}));
router.get('/me/messages', requireClient, wrap(async (req, res) => res.json(await listMessages(req.user.id))));
router.post('/me/rate', requireClient, wrap(async (req, res) => {
  const t = req.t;
  const clientId = req.user.id;
  const conv = await one('conversations', { id: Number(req.body.conversationId), client_id: clientId });
  if (!conv || conv.status !== 'awaiting_rating') return fail(res, 400, t('This chat can no longer be rated'));
  const skip = !!req.body.skip;
  const rating = skip ? null : Math.round(Number(req.body.rating));
  if (!skip && !(rating >= 1 && rating <= 5)) return fail(res, 400, t('Please choose 1 to 5 stars'));
  const comment = skip ? null : String(req.body.comment || '').trim().slice(0, 1000) || null;
  await setOne('conversations', { id: conv.id }, { status: 'closed', rating, comment, rated_at: now() });
  await emitConv(clientId, await latestConv(clientId));
  if (!skip) await systemMessage(clientId, sys('rated', { rating, comment }));
  else await pushChatRow(clientId);
  res.json({ ok: true });
}));

// Staff side
router.get('/rows', requirePerm('chat'), wrap(async (req, res) => res.json(await chatRows())));
router.get('/viewers', requirePerm('chat'), (req, res) => {
  const out = {};
  for (const [cid] of viewers) out[cid] = viewerNames(cid);
  res.json(out);
});
router.get('/:clientId/messages', requirePerm('chat'), wrap(async (req, res) => {
  const id = Number(req.params.clientId);
  const [row, conv, messages] = await Promise.all([chatRow(id), latestConv(id).then(convPublic), listMessages(id)]);
  if (!row) return fail(res, 404, req.t('Client not found'));
  res.json({ row, conversation: conv, messages });
}));
router.post('/:clientId/end', requirePerm('chat'), wrap(async (req, res) => {
  const clientId = Number(req.params.clientId);
  const conv = await latestConv(clientId);
  if (!conv || conv.status !== 'open') return fail(res, 400, req.t('There is no open chat to end'));
  await setOne('conversations', { id: conv.id }, { status: 'awaiting_rating', closed_at: now(), closed_by: req.user.id });
  await systemMessage(clientId, sys('ended', { name: req.user.name }));
  await emitConv(clientId, await latestConv(clientId));
  res.json({ ok: true });
}));
// ---- Labels (like WhatsApp Business): any team member can tag a chat, e.g. "VIP", "Paid", "Follow up" ----
const LABEL_COLORS = ['#25d366', '#53bdeb', '#f2a33a', '#ff6b81', '#a78bfa', '#f472b6', '#facc15', '#2dd4bf', '#94a3b8', '#c9a45c'];
const cleanLabel = (b) => ({ name: String(b.name || '').trim().slice(0, 40), color: LABEL_COLORS.includes(b.color) ? b.color : LABEL_COLORS[0] });
router.get('/labels', requirePerm('chat'), wrap(async (req, res) => res.json({ labels: await find('chat_labels', {}, { sort: { sort: 1, id: 1 } }), colors: LABEL_COLORS })));
router.post('/labels', requirePerm('chat'), wrap(async (req, res) => {
  const l = cleanLabel(req.body);
  if (!l.name) return fail(res, 400, req.t('Please write the label name'));
  const id = await insert('chat_labels', { ...l, sort: Date.now(), created_by: req.user.id, created_at: now() });
  staffEmit('labels:changed');
  res.json({ ok: true, id });
}));
router.put('/labels/:id', requirePerm('chat'), wrap(async (req, res) => {
  const l = cleanLabel(req.body);
  if (!l.name) return fail(res, 400, req.t('Please write the label name'));
  await setOne('chat_labels', { id: Number(req.params.id) }, l);
  staffEmit('labels:changed');
  res.json({ ok: true });
}));
router.delete('/labels/:id', requirePerm('chat'), wrap(async (req, res) => {
  const id = Number(req.params.id);
  await col('chat_labels').deleteOne({ id });
  await col('users').updateMany({ chat_labels: id }, { $pull: { chat_labels: id } });
  staffEmit('labels:changed');
  res.json({ ok: true });
}));
// Sets the labels of one client's chat.
router.put('/:clientId/labels', requirePerm('chat'), wrap(async (req, res) => {
  const clientId = Number(req.params.clientId);
  const wanted = [...new Set((Array.isArray(req.body.ids) ? req.body.ids : []).map(Number))];
  const ids = (await find('chat_labels', { id: { $in: wanted } })).map((l) => l.id);
  await setOne('users', { id: clientId, role: 'client' }, { chat_labels: ids });
  await pushChatRow(clientId);
  res.json({ ok: true, ids });
}));

router.get('/quick-replies', requirePerm('chat'), wrap(async (req, res) => {
  res.json(await find('quick_replies', {}, { sort: { title: 1 } }));
}));

// ---------------------------------------------------------------------------
// Socket.IO
// ---------------------------------------------------------------------------
function viewerNames(clientId) { return [...new Set((viewers.get(clientId) || new Map()).values())]; }
function setViewing(socket, clientId) {
  const prev = socket.data.viewing;
  if (prev === clientId) return;
  if (prev) {
    viewers.get(prev)?.delete(socket.id);
    io.to('staff').emit('viewers', { clientId: prev, names: viewerNames(prev) });
  }
  socket.data.viewing = clientId || null;
  if (clientId) {
    if (!viewers.has(clientId)) viewers.set(clientId, new Map());
    viewers.get(clientId).set(socket.id, socket.data.user.name);
    io.to('staff').emit('viewers', { clientId, names: viewerNames(clientId) });
  }
}

async function endCall(callId, reason = 'ended') {
  const call = calls.get(callId);
  if (!call) return;
  calls.delete(callId);
  clearTimeout(call.timer);
  const payload = { callId, reason };
  io.to(`client:${call.clientId}`).emit('call:ended', payload);
  io.to('staff').emit('call:ended', payload);
  const kind = call.video ? 'video' : 'voice';
  const duration = call.answeredAt ? Math.round((now() - call.answeredAt) / 1000) : 0;
  const body = call.answeredAt ? `${kind}:ok` : reason === 'declined' ? `${kind}:declined` : `${kind}:missed`;
  const conv = await latestConv(call.clientId);
  await emitMessage(await insertMessage({
    clientId: call.clientId, convId: conv ? conv.id : null, senderType: 'staff', senderId: call.fromId,
    type: 'call', body, duration, deliveredAt: now(),
  }));
}

function setup(ioServer) {
  io = ioServer;
  io.use(async (socket, next) => {
    try {
      const user = await auth.userFromToken(parseCookies(socket.handshake.headers.cookie).sid);
      if (!user) return next(new Error('unauthorized'));
      if (auth.isStaff(user) && !auth.can(user, 'chat')) return next(new Error('unauthorized'));
      socket.data.user = user;
      socket.data.isClient = user.role === 'client';
      socket.data.lang = parseCookies(socket.handshake.headers.cookie).lang || 'ar';
      next();
    } catch (e) { next(e); }
  });

  io.on('connection', (socket) => {
    const me = socket.data.user;
    const isClient = socket.data.isClient;
    const safe = (fn) => async (...args) => {
      const ack = typeof args[args.length - 1] === 'function' ? args.pop() : () => {};
      try { await fn(args[0] || {}, ack); } catch (e) { console.error(e); ack({ error: tr(socket.data.lang)('Something went wrong') }); }
    };

    if (isClient) {
      socket.join(`client:${me.id}`);
      markDeliveredForClient(me.id).catch(console.error);
      io.to('staff').emit('presence', { clientId: me.id, online: true });
      socket.emit('staff:presence', { online: staffOnline() });
    } else {
      socket.join('staff');
      if (!staffSockets.has(me.id)) staffSockets.set(me.id, new Set());
      staffSockets.get(me.id).add(socket.id);
      markDeliveredForStaff().catch(console.error);
      io.except('staff').emit('staff:presence', { online: true });
      const all = {};
      for (const [cid] of viewers) all[cid] = viewerNames(cid);
      socket.emit('viewers:all', all);
    }

    socket.on('msg:send', safe(async (p, ack) => {
      const t = tr(socket.data.lang);
      const clientId = isClient ? me.id : Number(p.clientId);
      if (!isClient && !(await one('users', { id: clientId, role: 'client' }))) return ack({ error: t('Client not found') });
      const type = MSG_TYPES.has(p.type) ? p.type : 'text';
      const body = String(p.body || '').slice(0, 5000);
      if (type === 'text' && !body.trim()) return ack({ error: t('Empty message') });
      let file = {};
      if (type !== 'text') {
        const url = String(p.file_url || '');
        if (!/^\/uploads\/[a-f0-9]{24}(\.[a-z0-9]{1,9})?$/.test(url)) return ack({ error: t('Invalid file') });
        file = { fileUrl: url, fileName: String(p.file_name || 'file').slice(0, 200), fileSize: Number(p.file_size) || null, mime: String(p.mime || '').slice(0, 100), duration: Number(p.duration) || null };
      }
      let replyTo = Number(p.reply_to) || null;
      let orderId = Number(p.order_id) || null;
      const [okReply, okOrder, conv] = await Promise.all([
        replyTo ? one('messages', { id: replyTo, client_id: clientId }) : null,
        orderId ? one('orders', { id: orderId, user_id: clientId }) : null,
        ensureOpenConv(clientId),
      ]);
      if (!okReply) replyTo = null;
      if (!okOrder) orderId = null;
      const recipientOnline = isClient ? staffOnline() : isClientOnline(clientId);
      const msg = await insertMessage({
        clientId, convId: conv.id, senderType: isClient ? 'client' : 'staff', senderId: me.id,
        type, body, ...file, replyTo, orderId, deliveredAt: recipientOnline ? now() : null, senderName: me.name,
      });
      emitMessage(msg, { temp_id: p.temp_id });
      ack({ ok: true, message: msg });
      if (!isClient) markRead(clientId, 'staff').catch(console.error); // replying means the employee has read the chat
    }));

    socket.on('msg:read', safe(async (p) => {
      if (isClient) await markRead(me.id, 'client');
      else if (p.clientId) await markRead(Number(p.clientId), 'staff');
    }));

    socket.on('typing', (p) => {
      p = p || {};
      if (isClient) io.to('staff').emit('typing', { clientId: me.id, side: 'client', on: !!p.on });
      else {
        const ev = { clientId: Number(p.clientId), side: 'staff', name: me.name, on: !!p.on };
        io.to(`client:${ev.clientId}`).emit('typing', ev);
        socket.to('staff').emit('typing', ev);
      }
    });

    socket.on('view', (p) => { if (!isClient) setViewing(socket, (p && Number(p.clientId)) || null); });

    // ---- Calls: only the company can start a call ----
    socket.on('call:start', safe(async (p, ack) => {
      const t = tr(socket.data.lang);
      if (isClient) return ack({ error: t('Calls can only be started by the company') });
      const clientId = Number(p.clientId);
      const client = await one('users', { id: clientId, role: 'client' });
      if (!client) return ack({ error: t('Client not found') });
      for (const c of calls.values()) if (c.clientId === clientId) return ack({ error: t('There is already a call with this client') });
      if (!isClientOnline(clientId)) return ack({ error: t('The client is offline right now') });
      const call = { id: crypto.randomBytes(8).toString('hex'), clientId, video: !!p.video, from: socket.id, fromId: me.id, to: null, answeredAt: null };
      io.to(`client:${clientId}`).emit('call:incoming', { callId: call.id, video: call.video, clientId, clientName: client.name, fromName: me.name });
      call.timer = setTimeout(() => endCall(call.id, 'missed').catch(console.error), CALL_RING_MS);
      calls.set(call.id, call);
      ack({ ok: true, callId: call.id });
    }));
    socket.on('call:accept', (p, ack) => {
      ack = typeof ack === 'function' ? ack : () => {};
      const call = calls.get(p && p.callId);
      if (!call || call.to) return ack({ error: 'gone' });
      if (!isClient || me.id !== call.clientId) return ack({ error: 'Not allowed' });
      call.to = socket.id;
      call.answeredAt = now();
      clearTimeout(call.timer);
      io.to(call.from).emit('call:accepted', { callId: call.id });
      io.to(`client:${call.clientId}`).except(socket.id).emit('call:cancel', { callId: call.id });
      ack({ ok: true });
    });
    socket.on('call:reject', (p) => {
      const call = calls.get(p && p.callId);
      if (call && !call.to && isClient) endCall(call.id, 'declined').catch(console.error);
    });
    socket.on('call:end', (p) => {
      const call = calls.get(p && p.callId);
      if (call && (socket.id === call.from || socket.id === call.to)) endCall(call.id, 'ended').catch(console.error);
    });
    socket.on('rtc:signal', (p) => {
      const call = calls.get(p && p.callId);
      if (!call || !call.to) return;
      const target = socket.id === call.from ? call.to : socket.id === call.to ? call.from : null;
      if (target) io.to(target).emit('rtc:signal', { callId: call.id, data: p.data });
    });

    socket.on('disconnect', async () => {
      for (const call of [...calls.values()]) if (call.from === socket.id || call.to === socket.id) endCall(call.id, 'ended').catch(console.error);
      if (isClient) {
        if (!isClientOnline(me.id)) {
          const t = now();
          await setOne('users', { id: me.id }, { last_seen: t }).catch(console.error);
          io.to('staff').emit('presence', { clientId: me.id, online: false, last_seen: t });
        }
      } else {
        setViewing(socket, null);
        const set = staffSockets.get(me.id);
        if (set) { set.delete(socket.id); if (!set.size) staffSockets.delete(me.id); }
        if (!staffOnline()) io.except('staff').emit('staff:presence', { online: false });
      }
    });
  });
}

const staffEmit = (ev, data) => { if (io) io.to('staff').emit(ev, data); };
// Live-updates the order badge on chat messages after payment / cancellation.
function orderEmit(clientId, orderId, status) {
  if (!io) return;
  const ev = { clientId, orderId, status };
  io.to(`client:${clientId}`).emit('order:update', ev);
  io.to('staff').emit('order:update', ev);
}

// Disconnect all sockets of a user (e.g. when an admin disables the account).
function kickUser(userId) {
  auth.forgetUser(userId);
  if (!io) return;
  for (const sid of staffSockets.get(userId) || []) io.sockets.sockets.get(sid)?.disconnect(true);
  io.in(`client:${userId}`).disconnectSockets(true);
}

module.exports = { router, setup, systemMessage, clientMessage, sys, staffEmit, orderEmit, latestConv, pushChatRow, chatRows, staffSockets, isClientOnline, kickUser };
