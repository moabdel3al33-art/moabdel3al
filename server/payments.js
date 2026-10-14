'use strict';
// Payment methods. Each kind of product (course, book, membership plan, consultation) offers the methods
// chosen in Admin > Payments:
//   chat    - the order is sent in the chat and the team replies with the payment details (the original flow)
//   paypal  - the client pays with PayPal (PayPal.me link or email), then uploads a screenshot of the
//             successful payment. The team checks it and presses "Confirm payment".
//   gateway - automatic online payment with PayPal Checkout (card or PayPal account). The order is
//             activated by itself as soon as PayPal confirms it. Needs PAYPAL_CLIENT_ID + PAYPAL_CLIENT_SECRET.
const express = require('express');
const path = require('path');
const { byId, setOne } = require('./db');
const settings = require('./settings');
const config = require('./config');
const { now, limited, origin } = require('./util');
const auth = require('./auth');
const chat = require('./chat');

const METHODS = ['chat', 'paypal', 'gateway'];
// Settings key for each product type.
const PLACE = { course: 'pay_course', book: 'pay_book', plan: 'pay_plan', consultation: 'pay_consult' };
// Currencies PayPal accepts (EGP is not one of them).
const PAYPAL_CURRENCIES = new Set(['USD', 'EUR', 'GBP', 'CAD', 'AUD']);

const gateway = {
  clientId: process.env.PAYPAL_CLIENT_ID || '',
  secret: process.env.PAYPAL_CLIENT_SECRET || '',
  base: process.env.PAYPAL_MODE === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com',
  mode: process.env.PAYPAL_MODE === 'live' ? 'live' : 'sandbox',
};
const gatewayReady = () => !!(gateway.clientId && gateway.secret);
const paypalReady = () => !!(paypalMeUrl() || settings.get('paypal_email'));

// "https://paypal.me/name", "paypal.me/name" or just "name" -> https://www.paypal.com/paypalme/name
function paypalMeUrl() {
  const raw = String(settings.get('paypal_me') || '').trim();
  if (!raw) return '';
  const m = raw.match(/paypal(?:\.me|\.com\/paypalme)\/([\w.-]+)/i);
  const name = m ? m[1] : raw.replace(/^@/, '');
  return /^[\w.-]+$/.test(name) ? `https://www.paypal.com/paypalme/${name}` : '';
}
function paypalLink(order) {
  const base = paypalMeUrl();
  if (!base) return '';
  return PAYPAL_CURRENCIES.has(order.currency) && Number(order.total) > 0 ? `${base}/${Number(order.total)}${order.currency}` : base;
}

const typeOf = (order) => ((order.items || [])[0] || {}).item_type || 'course';
// Methods the admin chose for a product type, minus the ones that are not set up yet. Never empty.
function methodsFor(type) {
  const chosen = String(settings.get(PLACE[type]) || 'chat').split(',').map((s) => s.trim()).filter((m) => METHODS.includes(m));
  const ok = chosen.filter((m) => (m === 'paypal' ? paypalReady() : m === 'gateway' ? gatewayReady() && PAYPAL_CURRENCIES.has(settings.get('currency')) : true));
  return ok.length ? ok : ['chat'];
}
// Where to send the client right after the order is created.
function nextUrl(orderId, type) {
  const m = methodsFor(type);
  return m.length === 1 && m[0] === 'chat' ? `/chat?order=${orderId}` : `/pay/${orderId}`;
}

// ---------------------------------------------------------------------------
// PayPal Checkout (the automatic gateway)
// ---------------------------------------------------------------------------
let tokenCache = { value: '', until: 0 };
async function ppToken() {
  if (tokenCache.value && tokenCache.until > now()) return tokenCache.value;
  const res = await fetch(`${gateway.base}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${gateway.clientId}:${gateway.secret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) throw new Error(`PayPal login failed: ${data.error_description || res.status}`);
  tokenCache = { value: data.access_token, until: now() + (Number(data.expires_in) - 60) * 1000 };
  return tokenCache.value;
}
async function ppCall(method, url, body) {
  const res = await fetch(`${gateway.base}${url}`, {
    method,
    headers: { Authorization: `Bearer ${await ppToken()}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`PayPal: ${(data.details && data.details[0] && data.details[0].description) || data.message || res.status}`);
  return data;
}
async function gatewayStart(order, lang, base = config.siteUrl) {
  const amount = Number(order.total).toFixed(2);
  const pp = await ppCall('POST', '/v2/checkout/orders', {
    intent: 'CAPTURE',
    purchase_units: [{
      custom_id: String(order.id), invoice_id: `order-${order.id}-${now()}`,
      description: (order.items || []).map((i) => i.title).join(', ').slice(0, 120),
      amount: { currency_code: order.currency, value: amount },
    }],
    payment_source: { paypal: { experience_context: {
      brand_name: String(settings.get(`site_name_${lang}`) || '').slice(0, 120), locale: lang === 'ar' ? 'ar-EG' : 'en-US',
      user_action: 'PAY_NOW', shipping_preference: 'NO_SHIPPING',
      return_url: `${base}/pay/${order.id}/return`, cancel_url: `${base}/pay/${order.id}`,
    } } },
  });
  await setOne('orders', { id: order.id }, { method: 'gateway', gateway_ref: pp.id });
  const link = (pp.links || []).find((l) => l.rel === 'payer-action' || l.rel === 'approve');
  if (!link) throw new Error('PayPal did not return a payment link');
  return link.href;
}
// Called when PayPal sends the client back. Captures the money and activates the order.
async function gatewayFinish(order, token, shop) {
  if (!token || token !== order.gateway_ref) throw new Error('Unknown payment');
  let pp;
  try { pp = await ppCall('POST', `/v2/checkout/orders/${encodeURIComponent(token)}/capture`, {}); } catch (e) {
    pp = await ppCall('GET', `/v2/checkout/orders/${encodeURIComponent(token)}`); // already captured (page refreshed)
  }
  const unit = (pp.purchase_units || [])[0] || {};
  const cap = (((unit.payments || {}).captures) || [])[0] || {};
  const amountOk = cap.amount && cap.amount.currency_code === order.currency && Math.abs(Number(cap.amount.value) - Number(order.total)) < 0.01;
  if (pp.status !== 'COMPLETED' || cap.status !== 'COMPLETED' || !amountOk || (cap.custom_id || unit.custom_id) !== String(order.id)) {
    throw new Error('The payment was not completed');
  }
  await setOne('orders', { id: order.id }, { method: 'gateway', gateway_capture: cap.id, payer_email: (pp.payer || {}).email_address || null });
  await shop.confirmOrder(order.id, null);
}

// ---------------------------------------------------------------------------
// Client API (/api/pay)
// ---------------------------------------------------------------------------
const router = express.Router();
const { wrap, fail, requireUser } = auth;

async function myPendingOrder(req, res) {
  const order = await byId('orders', req.params.id);
  if (!order || order.user_id !== req.user.id) { fail(res, 404, req.t('Order not found')); return null; }
  if (order.status !== 'pending') { fail(res, 400, req.t('This order is already closed')); return null; }
  return order;
}

// Chat: remember the choice and open the chat with the ready message.
router.post('/:id/chat', requireUser, wrap(async (req, res) => {
  const order = await myPendingOrder(req, res); if (!order) return;
  await setOne('orders', { id: order.id }, { method: 'chat' });
  res.json({ ok: true, redirect: `/chat?order=${order.id}` });
}));

// PayPal: the client uploads the screenshot of the successful payment.
router.post('/:id/proof', requireUser, wrap(async (req, res) => {
  const t = req.t;
  if (limited(`proof:${req.user.id}`, 10, 3600e3)) return fail(res, 429, t('Too many attempts. Please try again later.'));
  const order = await myPendingOrder(req, res); if (!order) return;
  if (!methodsFor(typeOf(order)).includes('paypal')) return fail(res, 400, t('This payment method is not available'));
  const url = String(req.body.url || '');
  if (!/^\/uploads\/[a-f0-9]{24}\.(png|jpe?g|gif|webp|heic|heif|bmp|pdf)$/i.test(url)) return fail(res, 400, t('Please upload the screenshot of the payment'));
  const txn = String(req.body.txn || '').trim().slice(0, 80) || null;
  const note = String(req.body.note || '').trim().slice(0, 500) || null;
  const proof = { url, name: path.basename(url), txn, note, at: now() };
  await setOne('orders', { id: order.id }, { method: 'paypal', proof });
  // The screenshot also goes into the chat, so the team sees it in the inbox next to the client's details.
  const lines = [t('PayPal payment for order #{id}', { id: order.id })];
  if (txn) lines.push(`${t('Transaction ID')}: ${txn}`);
  if (note) lines.push(note);
  await chat.clientMessage(req.user.id, { type: /\.pdf$/i.test(url) ? 'file' : 'image', fileUrl: url, fileName: proof.name, body: lines.join('\n'), orderId: order.id });
  res.json({ ok: true });
}));

// Gateway: create the PayPal Checkout payment and send the client to it.
router.post('/:id/gateway', requireUser, wrap(async (req, res) => {
  const order = await myPendingOrder(req, res); if (!order) return;
  if (!methodsFor(typeOf(order)).includes('gateway')) return fail(res, 400, req.t('This payment method is not available'));
  try { res.json({ ok: true, redirect: await gatewayStart(order, req.lang, origin(req)) }); } catch (e) {
    console.error('gateway', e.message);
    fail(res, 502, req.t('Online payment is not available right now. Please choose another method.'));
  }
}));

module.exports = { router, METHODS, PLACE, methodsFor, nextUrl, typeOf, paypalLink, paypalMeUrl, gatewayReady, gatewayFinish, gateway };
