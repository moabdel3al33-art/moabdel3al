'use strict';
const crypto = require('crypto');
const express = require('express');
const nodemailer = require('nodemailer');
const config = require('./config');
const { one, find, insert, set, setOne, remove, col, aggregate } = require('./db');
const settings = require('./settings');
const { now, esc, normPhone, isEmail, hashPassword, verifyPassword, parseCookies, limited, tr } = require('./util');
const countries = require('../public/countries');

// ---------------------------------------------------------------------------
// Roles & permissions
// ---------------------------------------------------------------------------
// The Owner (is_super) is the single permanent, hidden account with every permission.
// Only the Owner has 'team' (create / edit / block / delete staff) and 'accounts' (block / delete clients).
const ROLE_PERMS = {
  admin: ['chat', 'orders', 'bookings', 'clients', 'content', 'settings', 'quick', 'comments', 'team_view'],
  support: ['chat', 'orders', 'bookings', 'clients', 'comments'],
  editor: ['content', 'comments'],
};
const OWNER_PERMS = [...ROLE_PERMS.admin, 'team', 'accounts'];
const STAFF_ROLES = Object.keys(ROLE_PERMS);
const isStaff = (u) => !!u && STAFF_ROLES.includes(u.role);
const permsOf = (u) => (!u ? [] : u.is_super ? OWNER_PERMS : (ROLE_PERMS[u.role] || []));
const can = (u, perm) => !!u && isStaff(u) && permsOf(u).includes(perm);

// Every user document starts with these fields (so checks like "active" always have a value).
const USER_DEFAULTS = {
  role: 'client', name: '', email: null, phone: null, country: null, login: null, password_hash: '', is_super: 0, active: 1,
  email_verified: 0, is_guest: 0, client_rating: null, client_note: null, last_seen: null,
};
const newUser = (fields) => insert('users', { ...USER_DEFAULTS, created_at: now(), ...fields });
const SAFE = { password_hash: 0 }; // never load password hashes unless needed
const publicUser = (u) => u && {
  id: u.id, role: u.role, name: u.name, email: u.email, phone: u.phone, country: u.country, is_guest: !!u.is_guest, login: u.login,
  is_super: !!u.is_super, active: !!u.active, email_verified: !!u.email_verified, created_at: u.created_at,
  perms: permsOf(u),
};

// ---------------------------------------------------------------------------
// Sessions (HttpOnly cookie "sid")
// ---------------------------------------------------------------------------
// remember = true: stay logged in for SESSION_DAYS. false: logged out when the browser is closed (max 1 day).
async function createSession(res, userId, remember = true) {
  const token = crypto.randomBytes(24).toString('hex');
  const ttl = remember ? config.sessionDays * 864e5 : 864e5;
  await insert('sessions', { token, user_id: userId, created_at: now(), expires_at: now() + ttl });
  const opts = { httpOnly: true, sameSite: 'lax', secure: config.siteUrl.startsWith('https'), path: '/' };
  if (remember) opts.maxAge = ttl;
  res.cookie('sid', token, opts);
  return token;
}
const wantsRemember = (body) => !(body && (body.remember === false || body.remember === 'false' || body.remember === '0'));
// Logged-in users are remembered for a few seconds so every page click doesn't wait for the database.
const sessionCache = new Map(); // token -> { user, at }
const SESSION_CACHE_MS = 20000;
function forgetUser(userId) { for (const [k, v] of sessionCache) if (v.user && v.user.id === Number(userId)) sessionCache.delete(k); }
async function userFromToken(token) {
  if (!token || typeof token !== 'string' || token.length !== 48) return null;
  const hit = sessionCache.get(token);
  if (hit && now() - hit.at < SESSION_CACHE_MS) return hit.user;
  // session + user in a single database trip
  const [u] = await aggregate('sessions', [
    { $match: { token, expires_at: { $gt: now() } } }, { $limit: 1 },
    { $lookup: { from: 'users', localField: 'user_id', foreignField: 'id', as: 'u' } }, { $unwind: '$u' },
    { $replaceRoot: { newRoot: '$u' } }, { $project: { _id: 0, password_hash: 0 } },
  ]);
  let user = u || null;
  if (user && !user.active) user = null;
  if (user && user.role === 'client' && !user.email_verified && !user.is_guest) user = null;
  if (sessionCache.size > 5000) sessionCache.clear();
  sessionCache.set(token, { user, at: now() });
  return user;
}
async function destroySession(req, res) {
  const token = parseCookies(req.headers.cookie).sid;
  if (token) { sessionCache.delete(token); await remove('sessions', { token }); }
  res.clearCookie('sid', { path: '/' });
}

// Attaches req.user, req.lang and req.t to every request.
async function attach(req, res, next) {
  try {
    const cookies = parseCookies(req.headers.cookie);
    req.cookies = cookies;
    req.lang = cookies.lang === 'en' || cookies.lang === 'ar' ? cookies.lang : config.defaultLang;
    req.t = tr(req.lang);
    req.user = await userFromToken(cookies.sid);
    req.countryGuess = countries.guess(String(req.headers['accept-language'] || '').split(',')[0]);
    if (req.user && req.user.role === 'client' && (!req.user.last_seen || now() - req.user.last_seen > 10 * 60e3)) {
      req.user.last_seen = now();
      setOne('users', { id: req.user.id }, { last_seen: req.user.last_seen }).catch(() => {});
    }
    next();
  } catch (e) { next(e); }
}
const fail = (res, status, msg) => res.status(status).json({ error: msg });
function requireClient(req, res, next) {
  if (!req.user || req.user.role !== 'client') return fail(res, 401, req.t('Please log in first'));
  next();
}
const isAccount = (u) => !!u && u.role === 'client' && !u.is_guest;
// Buying needs a full account (chat-only clients are asked to create one).
function requireAccount(req, res, next) {
  if (!req.user || req.user.role !== 'client') return fail(res, 401, req.t('Please log in first'));
  if (req.user.is_guest) return fail(res, 401, req.t('Please create an account first'));
  next();
}
function requireUser(req, res, next) {
  if (!req.user) return fail(res, 401, req.t('Please log in first'));
  next();
}
function requirePerm(perm) {
  return (req, res, next) => {
    if (!isStaff(req.user)) return fail(res, 401, req.t('Please log in first'));
    if (perm && !can(req.user, perm)) return fail(res, 403, req.t('You do not have permission to do this'));
    next();
  };
}

// ---------------------------------------------------------------------------
// Email + verification codes
// ---------------------------------------------------------------------------
const transport = config.mailEnabled ? nodemailer.createTransport({
  host: config.smtp.host, port: config.smtp.port, secure: config.smtp.port === 465,
  auth: { user: config.smtp.user, pass: config.smtp.pass },
}) : null;

async function sendMail(to, subject, html) {
  if (!transport) { console.log(`[mail disabled] to=${to} subject="${subject}"`); return false; }
  await transport.sendMail({ from: config.smtp.from, to, subject, html });
  return true;
}
function mailLayout(lang, title, inner) {
  const name = settings.get(`site_name_${lang}`);
  const t = settings.theme();
  return `<div dir="${lang === 'ar' ? 'rtl' : 'ltr'}" style="background:#f4f4f6;padding:24px;font-family:Tahoma,Arial,sans-serif">
    <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
      <div style="background:${t.bg};color:${t.text};padding:18px 24px;font-size:18px;font-weight:bold;border-bottom:3px solid ${t.primary}">${esc(name)}</div>
      <div style="padding:24px;color:#222;font-size:15px;line-height:1.7"><h2 style="margin:0 0 12px;font-size:19px">${esc(title)}</h2>${inner}</div>
    </div></div>`;
}

const CODE_TTL = 15 * 60e3;
const RESEND_GAP = 60e3;
const codeHash = (code) => crypto.createHash('sha256').update(`${config.secret}:${code}`).digest('hex');

// Creates and emails a 6-digit code. Returns { devCode } when email is not configured (local testing only).
async function sendCode(user, purpose, lang) {
  const t = tr(lang);
  const last = await one('email_codes', { user_id: user.id, purpose }, { sort: { id: -1 } });
  if (last && now() - last.created_at < RESEND_GAP) {
    const err = new Error(t('Please wait a minute before requesting a new code'));
    err.status = 429;
    throw err;
  }
  const code = String(crypto.randomInt(0, 1e6)).padStart(6, '0');
  await remove('email_codes', { user_id: user.id, purpose });
  await insert('email_codes', { user_id: user.id, purpose, code_hash: codeHash(code), expires_at: now() + CODE_TTL, created_at: now() });
  const title = purpose === 'verify' ? t('Verify your email') : t('Reset your password');
  const html = mailLayout(lang, title, `<p>${esc(t('Hello {name},', { name: user.name }))}</p>
    <p>${esc(t('Your code is:'))}</p>
    <div style="font-size:32px;letter-spacing:8px;font-weight:bold;margin:12px 0;direction:ltr;text-align:center">${code}</div>
    <p style="color:#666;font-size:13px">${esc(t('The code expires in 15 minutes. If you did not request it, ignore this email.'))}</p>`);
  let sent = false;
  try { sent = await sendMail(user.email, `${title} - ${code}`, html); } catch (e) { console.error('Email error:', e.message); }
  if (!sent) {
    console.log(`\n  [verification code] ${user.email} (${purpose}): ${code}\n`);
    if (!config.prod) return { devCode: code };
    if (config.mailEnabled) { const err = new Error(t('Could not send the email. Please try again later.')); err.status = 500; throw err; }
  }
  return {};
}
async function checkCode(user, purpose, code, lang) {
  const t = tr(lang);
  const row = await one('email_codes', { user_id: user.id, purpose }, { sort: { id: -1 } });
  if (!row || row.expires_at < now()) return t('The code has expired. Please request a new one.');
  if (row.attempts >= 5) return t('Too many wrong attempts. Please request a new code.');
  if (row.code_hash !== codeHash(String(code || '').replace(/\D/g, ''))) {
    await col('email_codes').updateOne({ id: row.id }, { $inc: { attempts: 1 } });
    return t('Wrong code. Please check the email and try again.');
  }
  await remove('email_codes', { user_id: user.id, purpose });
  return null;
}

// ---------------------------------------------------------------------------
// Seed super admin
// ---------------------------------------------------------------------------
async function seedAdmin() {
  const exists = await one('users', { is_super: 1 });
  if (exists) {
    // The Owner can never be disabled or demoted, even by editing the database by mistake.
    await setOne('users', { id: exists.id }, { active: 1, role: 'admin' });
    return;
  }
  await newUser({
    role: 'admin', name: 'Super Admin', login: config.admin.login, password_hash: hashPassword(config.admin.password),
    is_super: 1, active: 1, email_verified: 1,
  });
  console.log(`  Created super admin -> login: ${config.admin.login} / ${config.admin.password}`);
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
const router = express.Router();
const ip = (req) => req.ip || req.socket.remoteAddress;
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch((e) => {
  if (e.status) return fail(res, e.status, e.message);
  next(e);
});

async function findByLogin(identifier) {
  const s = String(identifier || '').trim().toLowerCase();
  if (!s) return [];
  const digits = s.replace(/\D/g, '');
  const looksLikePhone = !/[a-z@]/.test(s) && digits.length >= 7;
  const full = s.startsWith('+') || s.startsWith('00') ? `+${digits.replace(/^00/, '')}` : '';
  const tail = digits.replace(/^0+/, '');
  const or = [{ email: s }, { login: s }];
  if (looksLikePhone) or.push({ phone: full || `+${digits}` }, { phone: { $regex: `${tail}$` } });
  return find('users', { $or: or });
}
function phoneFrom(body, t) {
  const p = countries.normalize(body.country, body.phone);
  if (!p) { const e = new Error(t('Please enter a valid phone number')); e.status = 400; throw e; }
  return p;
}

router.post('/register', wrap(async (req, res) => {
  const t = req.t;
  if (limited(`reg:${ip(req)}`, 10, 3600e3)) return fail(res, 429, t('Too many attempts. Please try again later.'));
  const name = String(req.body.name || '').trim().slice(0, 100);
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (name.length < 2) return fail(res, 400, t('Please enter your full name'));
  if (!isEmail(email)) return fail(res, 400, t('Please enter a valid email'));
  const { e164: phone, country } = phoneFrom(req.body, t);
  if (password.length < 6) return fail(res, 400, t('Password must be at least 6 characters'));
  const byEmail = await one('users', { email });
  if (byEmail && (byEmail.email_verified || byEmail.role !== 'client')) return fail(res, 409, t('This email already has an account. Please log in.'));
  const byPhone = await one('users', { phone });
  if (byPhone && !(byPhone.role === 'client' && (byPhone.is_guest || !byPhone.email_verified))) return fail(res, 409, t('This phone number already has an account. Please log in.'));
  // Reuse the earlier chat-only client with this phone, so their past chats join the new account.
  let user = byPhone || byEmail;
  if (byPhone && byEmail && byPhone.id !== byEmail.id) await setOne('users', { id: byEmail.id }, { email: null }); // drop the abandoned sign-up
  if (user) {
    await setOne('users', { id: user.id }, { name, email, phone, country, password_hash: hashPassword(password), email_verified: 0 });
  } else {
    const id = await newUser({ role: 'client', name, email, phone, country, password_hash: hashPassword(password) });
    user = { id };
  }
  user = { ...user, name, email };
  const r = await sendCode(user, 'verify', req.lang).catch((e) => (e.status === 429 ? {} : Promise.reject(e)));
  res.json({ ok: true, needVerify: true, email, remember: wantsRemember(req.body), ...r });
}));

router.post('/verify', wrap(async (req, res) => {
  const t = req.t;
  const email = String(req.body.email || '').trim().toLowerCase();
  if (limited(`verify:${ip(req)}`, 30, 600e3)) return fail(res, 429, t('Too many attempts. Please try again later.'));
  const user = await one('users', { email });
  if (!user) return fail(res, 400, t('Account not found'));
  const err = await checkCode(user, 'verify', req.body.code, req.lang);
  if (err) return fail(res, 400, err);
  await setOne('users', { id: user.id }, { email_verified: 1, is_guest: 0 });
  await createSession(res, user.id, wantsRemember(req.body));
  res.json({ ok: true });
}));

router.post('/resend', wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const purpose = req.body.purpose === 'reset' ? 'reset' : 'verify';
  const user = await one('users', { email });
  if (!user || (purpose === 'verify' && user.email_verified)) return res.json({ ok: true });
  const r = await sendCode(user, purpose, req.lang);
  res.json({ ok: true, ...r });
}));

router.post('/login', wrap(async (req, res) => {
  const t = req.t;
  if (limited(`login:${ip(req)}`, 20, 600e3)) return fail(res, 429, t('Too many attempts. Please try again later.'));
  const password = String(req.body.password || '');
  const user = (await findByLogin(req.body.login)).find((u) => verifyPassword(password, u.password_hash));
  if (!user) return fail(res, 401, t('Wrong email/phone or password'));
  if (!user.active) return fail(res, 403, t('This account is disabled'));
  if (user.role === 'client' && !user.email_verified) {
    const r = await sendCode(user, 'verify', req.lang).catch((e) => (e.status === 429 ? {} : Promise.reject(e)));
    return res.json({ ok: true, needVerify: true, email: user.email, remember: wantsRemember(req.body), ...r });
  }
  await createSession(res, user.id, wantsRemember(req.body));
  res.json({ ok: true, user: publicUser(user), staff: isStaff(user) });
}));

router.post('/forgot', wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (limited(`forgot:${ip(req)}`, 10, 3600e3)) return fail(res, 429, req.t('Too many attempts. Please try again later.'));
  const user = await one('users', { email, active: 1 });
  let r = {};
  if (user) r = await sendCode(user, 'reset', req.lang);
  res.json({ ok: true, email, ...r }); // same answer whether or not the email exists
}));

router.post('/reset', wrap(async (req, res) => {
  const t = req.t;
  if (limited(`reset:${ip(req)}`, 30, 600e3)) return fail(res, 429, t('Too many attempts. Please try again later.'));
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (password.length < 6) return fail(res, 400, t('Password must be at least 6 characters'));
  const user = await one('users', { email, active: 1 });
  if (!user) return fail(res, 400, t('Wrong code. Please check the email and try again.'));
  const err = await checkCode(user, 'reset', req.body.code, req.lang);
  if (err) return fail(res, 400, err);
  await setOne('users', { id: user.id }, { password_hash: hashPassword(password), email_verified: 1, is_guest: 0 });
  await remove('sessions', { user_id: user.id });
  forgetUser(user.id);
  await createSession(res, user.id);
  res.json({ ok: true });
}));

// Chat without an account: name + phone. The phone is the client's ID, so the same number reopens the same chat.
router.post('/chat-start', wrap(async (req, res) => {
  const t = req.t;
  if (limited(`chat:${ip(req)}`, 20, 600e3)) return fail(res, 429, t('Too many attempts. Please try again later.'));
  const name = String(req.body.name || '').trim().slice(0, 100);
  if (name.length < 2) return fail(res, 400, t('Please enter your full name'));
  const { e164: phone, country } = phoneFrom(req.body, t);
  let user = await one('users', { phone });
  if (user && (user.role !== 'client' || !user.is_guest)) {
    return res.status(409).json({ error: t('This phone number has an account. Please log in to see your chat.'), needLogin: true });
  }
  if (!user) {
    const id = await newUser({ role: 'client', name, phone, country, is_guest: 1, last_seen: now() });
    user = { id };
  } else if (!user.active) return fail(res, 403, t('This account is disabled'));
  await createSession(res, user.id, wantsRemember(req.body));
  res.json({ ok: true, redirect: '/chat' });
}));

router.post('/logout', wrap(async (req, res) => {
  await destroySession(req, res);
  res.json({ ok: true });
}));

router.get('/me', (req, res) => res.json({ user: publicUser(req.user) }));

router.post('/profile', requireUser, wrap(async (req, res) => {
  const t = req.t;
  const name = String(req.body.name || '').trim().slice(0, 100);
  if (name.length < 2) return fail(res, 400, t('Please enter your full name'));
  const { e164: phone, country } = phoneFrom(req.body, t);
  const taken = await one('users', { phone, id: { $ne: req.user.id } });
  if (taken) return fail(res, 409, t('This phone number is already used by another account'));
  await setOne('users', { id: req.user.id }, { name, phone, country });
  forgetUser(req.user.id);
  res.json({ ok: true });
}));

router.post('/password', requireUser, wrap(async (req, res) => {
  const t = req.t;
  const u = await one('users', { id: req.user.id });
  if (!verifyPassword(req.body.current || '', u.password_hash)) return fail(res, 400, t('Current password is wrong'));
  if (String(req.body.next || '').length < 6) return fail(res, 400, t('Password must be at least 6 characters'));
  await setOne('users', { id: req.user.id }, { password_hash: hashPassword(req.body.next) });
  res.json({ ok: true });
}));

module.exports = {
  router, attach, requireClient, requireAccount, isAccount, requireUser, requirePerm, can, isStaff, permsOf, publicUser, userFromToken,
  forgetUser, seedAdmin, sendMail, mailLayout, ROLE_PERMS, STAFF_ROLES, USER_DEFAULTS, newUser, SAFE, wrap, fail,
};
