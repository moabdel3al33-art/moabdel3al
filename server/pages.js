'use strict';
const path = require('path');
const express = require('express');
const config = require('./config');
const { one, find, byId, count, aggregate, mapById } = require('./db');
const shop = require('./shop');
const comments = require('./comments');
const auth = require('./auth');
const views = require('./views');
const settings = require('./settings');
const payments = require('./payments');
const consult = require('./consult');
const linkpage = require('./linkpage');
const storage = require('./storage');
const gdrive = require('./gdrive');
const { origin } = require('./util');

const router = express.Router();
const ctxOf = (req) => ({ t: req.t, lang: req.lang, user: req.user, path: req.originalUrl, countryGuess: req.countryGuess });
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const notFound = (req, res) => res.status(404).send(views.notFound(ctxOf(req)));
const loginRedirect = (req, res) => res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
// Pages that need a full account: visitors log in, chat-only clients create an account.
const needAccount = (req, res) => {
  if (!req.user) { loginRedirect(req, res); return true; }
  if (req.user.is_guest) { res.redirect(`/register?next=${encodeURIComponent(req.originalUrl)}`); return true; }
  return false;
};

const plansList = () => find('plans', { published: 1 }, { sort: { sort: 1, months: 1 } });
const cheapestMonthly = (plans) => (plans.length ? Math.min(...plans.map((p) => Number(p.price) / Math.max(1, p.months))) : null);
async function withLessonCounts(list) {
  const counts = await aggregate('lessons', [{ $match: { course_id: { $in: list.map((c) => c.id) } } }, { $group: { _id: '$course_id', n: { $sum: 1 } } }]);
  const m = new Map(counts.map((c) => [c._id, c.n]));
  return list.map((c) => ({ ...c, lessons_count: m.get(c.id) || 0 }));
}
const courseList = async (limit) => withLessonCounts(await find('courses', { published: 1 }, { sort: { sort: 1, id: -1 }, limit }));
const NEWEST_POSTS = { published_at: -1, created_at: -1 };

router.get('/', wrap(async (req, res) => {
  // everything on the home page is loaded at the same time
  const [courses, books, posts, social, reviews, plans, siteRating, ownedCourses, ownedBooks, memberUntil] = await Promise.all([
    courseList(6),
    find('books', { published: 1 }, { sort: { sort: 1, id: -1 }, limit: 4 }),
    find('posts', { published: 1 }, { sort: NEWEST_POSTS, limit: 3 }),
    find('social_posts', { hidden: { $ne: 1 } }, { sort: { pinned: -1, posted_at: -1, created_at: -1 }, limit: 8 }),
    comments.testimonials(10), plansList(), comments.ratingFor('site', 0),
    shop.ownedIds(req.user, 'course'), shop.ownedIds(req.user, 'book'), req.user ? shop.subEnd(req.user.id) : null,
  ]);
  res.send(views.home(ctxOf(req), {
    courses, books, posts, social,
    ownedCourses, ownedBooks, reviews, plans, siteRating, memberUntil,
  }));
}));

router.get('/lang/:lang', (req, res) => {
  const lang = req.params.lang === 'en' ? 'en' : 'ar';
  res.cookie('lang', lang, { maxAge: 365 * 864e5, sameSite: 'lax', path: '/' });
  const next = String(req.query.next || '/');
  res.redirect(/^\/(?!\/)/.test(next) ? next : '/');
});

// ---- Courses ----
router.get('/courses', wrap(async (req, res) => {
  res.send(views.courses(ctxOf(req), await courseList(), await shop.ownedIds(req.user, 'course')));
}));
router.get('/courses/:slug', wrap(async (req, res) => {
  const c = await one('courses', { slug: req.params.slug });
  const staff = auth.isStaff(req.user);
  if (!c || (!c.published && !staff)) return notFound(req, res);
  const lessons = await find('lessons', { course_id: c.id }, { sort: { sort: 1, id: 1 } });
  const owned = await shop.hasAccess(req.user, 'course', c.id);
  if (req.query.lesson) {
    const lesson = lessons.find((l) => l.id === Number(req.query.lesson));
    if (!lesson) return res.redirect(`/courses/${encodeURIComponent(c.slug)}`);
    if (!owned && !lesson.is_preview) return res.redirect(req.user ? `/courses/${encodeURIComponent(c.slug)}` : `/login?next=${encodeURIComponent(req.originalUrl)}`);
    return res.send(views.lessonPage(ctxOf(req), c, lessons, lesson, owned));
  }
  const pending = owned ? null : await shop.pendingOrderFor(req.user, 'course', c.id);
  const [list, rating, plans] = await Promise.all([comments.approvedFor('course', c.id), comments.ratingFor('course', c.id), plansList()]);
  res.send(views.course(ctxOf(req), c, lessons, {
    owned, pending, firstLesson: lessons[0] && lessons[0].id, comments: list, rating, fromMonthly: cheapestMonthly(plans),
    viaSub: owned && !auth.isStaff(req.user) && !!(await shop.activeSub(req.user)),
  }));
}));

// ---- Books ----
router.get('/books', wrap(async (req, res) => {
  res.send(views.books(ctxOf(req), await find('books', { published: 1 }, { sort: { sort: 1, id: -1 } }), await shop.ownedIds(req.user, 'book')));
}));
router.get('/books/:slug', wrap(async (req, res) => {
  const b = await one('books', { slug: req.params.slug });
  if (!b || (!b.published && !auth.isStaff(req.user))) return notFound(req, res);
  const owned = await shop.hasAccess(req.user, 'book', b.id);
  const pending = owned ? null : await shop.pendingOrderFor(req.user, 'book', b.id);
  const [list, rating, plans] = await Promise.all([comments.approvedFor('book', b.id), comments.ratingFor('book', b.id), plansList()]);
  res.send(views.book(ctxOf(req), b, { owned, pending, comments: list, rating, fromMonthly: cheapestMonthly(plans) }));
}));
// ---- Book reader: the PDF is shown on screen only (view only, no download button) ----
async function readableBook(req, res) {
  if (needAccount(req, res)) return null;
  const b = await one('books', { slug: req.params.slug });
  if (!b || !(b.file_path || b.external_url)) { notFound(req, res); return null; }
  if (!(await shop.hasAccess(req.user, 'book', b.id))) { res.redirect(`/books/${encodeURIComponent(b.slug)}`); return null; }
  return b;
}
router.get('/books/:slug/download', (req, res) => res.redirect(`/books/${encodeURIComponent(req.params.slug)}/read`)); // old links
router.get('/books/:slug/read', wrap(async (req, res) => {
  const b = await readableBook(req, res); if (!b) return;
  res.set('Cache-Control', 'no-store').send(views.reader(ctxOf(req), b));
}));
// The PDF bytes for the reader. An uploaded file comes from the database; a link (Google Drive, Dropbox, any PDF
// address) is fetched by the server, so the client never sees the original link.
router.get('/books/:slug/pdf', wrap(async (req, res) => {
  if (req.headers['x-requested-with'] !== 'reader') return res.redirect(`/books/${encodeURIComponent(req.params.slug)}/read`); // opened directly
  const b = await readableBook(req, res); if (!b) return;
  res.set('Cache-Control', 'private, no-store').set('Content-Disposition', 'inline');
  if (b.file_path && b.file_path.startsWith('gdrive:')) {
    try { await gdrive.send(req, res, b.file_path.slice(7)); } catch (e) {
      console.error('drive read', b.id, e.message);
      res.status(502).json({ error: req.t('The book file could not be opened. Please tell us in the chat.') });
    }
    return;
  }
  if (b.file_path) {
    if (!(await storage.send(req, res, path.basename(b.file_path), { isPrivate: true }))) notFound(req, res);
    return;
  }
  try {
    const r = await fetch(directPdfUrl(b.external_url), { redirect: 'follow', signal: AbortSignal.timeout(60000), headers: { 'User-Agent': 'Mozilla/5.0' } });
    const type = r.headers.get('content-type') || '';
    if (!r.ok || /text\/html/.test(type)) throw new Error(`HTTP ${r.status} ${type}`);
    res.type('application/pdf');
    if (r.headers.get('content-length')) res.set('Content-Length', r.headers.get('content-length'));
    const { Readable } = require('stream');
    Readable.fromWeb(r.body).on('error', () => res.destroy()).pipe(res);
  } catch (e) {
    console.error('pdf link', b.id, e.message);
    res.status(502).json({ error: req.t('The book file could not be opened. Please tell us in the chat.') });
  }
}));
// Share links -> direct file links. Google Drive files must be shared as "Anyone with the link".
function directPdfUrl(u) {
  const s = String(u || '').trim();
  const g = s.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:.*&)?id=)([\w-]{20,})/);
  if (g) return `https://drive.usercontent.google.com/download?id=${g[1]}&export=download&confirm=t`;
  if (/dropbox\.com\//.test(s)) return s.replace(/([?&])dl=0/, '$1dl=1').replace(/^(?!.*[?&]dl=1)(.*)$/, (m) => `${m}${m.includes('?') ? '&' : '?'}dl=1`);
  return s;
}

// ---- Blog ----
router.get('/blog', wrap(async (req, res) => {
  res.send(views.blog(ctxOf(req), await find('posts', { published: 1 }, { sort: NEWEST_POSTS, limit: 100 })));
}));
router.get('/blog/:slug', wrap(async (req, res) => {
  const p = await one('posts', { slug: req.params.slug });
  if (!p || (!p.published && !auth.isStaff(req.user))) return notFound(req, res);
  const more = await find('posts', { published: 1, id: { $ne: p.id } }, { sort: NEWEST_POSTS, limit: 3 });
  res.send(views.post(ctxOf(req), p, more, await comments.approvedFor('post', p.id)));
}));

// ---- Consultations ----
// ---- Membership & reviews ----
router.get('/membership', wrap(async (req, res) => {
  const [plans, nCourses, nBooks] = await Promise.all([plansList(), count('courses', { published: 1 }), count('books', { published: 1 })]);
  const counts = { courses: nCourses, books: nBooks };
  const sub = await shop.activeSub(req.user);
  res.send(views.membership(ctxOf(req), { plans, counts, sub, memberUntil: req.user ? await shop.subEnd(req.user.id) : null }));
}));
router.get('/reviews', wrap(async (req, res) => {
  const [list, rating] = await Promise.all([comments.approvedFor('site', 0, 200), comments.ratingFor('site', 0)]);
  res.send(views.reviews(ctxOf(req), list, rating));
}));

router.get('/consultations', (req, res) => res.send(views.consultations(ctxOf(req))));
router.get('/consultations/book', (req, res) => {
  if (needAccount(req, res)) return;
  if (!consult.tiers().length) return res.redirect('/consultations');
  res.send(views.bookingForm(ctxOf(req), req.query));
});
router.get('/consultations/:id', (req, res) => res.redirect(`/consultations/book${req.query.tier ? `?tier=${encodeURIComponent(req.query.tier)}` : ''}`)); // old links

// ---- Checkout & chat ----
router.get('/checkout', wrap(async (req, res) => {
  if (needAccount(req, res)) return;
  const type = ['book', 'plan'].includes(req.query.type) ? req.query.type : 'course';
  const item = await shop.loadItem(type, req.query.id);
  if (!item || !item.published) return notFound(req, res);
  if (type !== 'plan' && (item.coming_soon || await shop.hasAccess(req.user, type, item.id))) return res.redirect(`/${type}s/${encodeURIComponent(item.slug)}`);
  res.send(views.checkout(ctxOf(req), type, item));
}));

// ---- Payment page: the client chooses chat / PayPal / online payment for an order ----
async function myOrder(req, res) {
  if (needAccount(req, res)) return null;
  const order = await shop.orderWithItems(Number(req.params.id));
  if (!order || order.user_id !== req.user.id) { notFound(req, res); return null; }
  return order;
}
router.get('/pay/:id', wrap(async (req, res) => {
  const order = await myOrder(req, res); if (!order) return;
  res.send(views.payPage(ctxOf(req), order, {
    methods: payments.methodsFor(payments.typeOf(order)), paypalLink: payments.paypalLink(order), paypalEmail: settings.get('paypal_email'),
    paypalNote: settings.get(`paypal_note_${req.lang}`) || settings.get(`paypal_note_${req.lang === 'ar' ? 'en' : 'ar'}`), error: !!req.query.err,
  }));
}));
// PayPal sends the client back here after the online payment.
router.get('/pay/:id/return', wrap(async (req, res) => {
  const order = await myOrder(req, res); if (!order) return;
  if (order.status === 'pending') {
    try { await payments.gatewayFinish(order, String(req.query.token || ''), shop); } catch (e) {
      console.error('gateway return', e.message);
      return res.redirect(`/pay/${order.id}?err=1`);
    }
  }
  res.redirect(`/pay/${order.id}`);
}));

// ---- Hidden "link in bio" page: only people with the link can open it ----
router.get('/p/:slug', wrap(async (req, res) => {
  const d = await linkpage.bySlug(req.params.slug);
  if (!d) return notFound(req, res);
  res.set('X-Robots-Tag', 'noindex, nofollow').set('Cache-Control', 'no-store');
  res.send(views.linkPage(ctxOf(req), d, new URL(`/p/${d.slug}`, origin(req))));
}));
router.get('/chat', wrap(async (req, res) => {
  if (!req.user) return res.send(views.chatEntry(ctxOf(req), req.query));
  if (auth.isStaff(req.user)) return res.redirect('/admin#inbox');
  let draft = '';
  let orderId = null;
  if (req.query.order) {
    const order = await shop.orderWithItems(Number(req.query.order));
    if (order && order.user_id === req.user.id && order.status === 'pending') {
      const already = await one('messages', { order_id: order.id, sender_type: 'client' });
      if (!already) { draft = shop.orderDraft(order, req.user, req.lang); orderId = order.id; }
    }
  }
  res.send(views.chatPage(ctxOf(req), draft, orderId));
}));

// ---- Accounts ----
const guestOnly = (mode) => (req, res) => {
  if (req.user && !req.user.is_guest && mode !== 'verify') {
    const next = String(req.query.next || '');
    return res.redirect(auth.isStaff(req.user) ? '/admin' : (/^\/(?!\/)/.test(next) ? next : '/account'));
  }
  res.send(views.authPage(ctxOf(req), mode, req.query));
};
router.get('/login', guestOnly('login'));
router.get('/register', guestOnly('register'));
router.get('/verify', guestOnly('verify'));
router.get('/forgot', guestOnly('forgot'));
router.get('/account', wrap(async (req, res) => {
  if (needAccount(req, res)) return;
  if (auth.isStaff(req.user)) return res.redirect('/admin');
  const uid = req.user.id;
  const ents = await find('entitlements', { user_id: uid }, { sort: { created_at: -1 } });
  const owned = (type, map) => ents.filter((e) => e.item_type === type).map((e) => map.get(e.item_id)).filter(Boolean);
  const [courseMap, bookMap, bookingRows, orderRows] = await Promise.all([
    mapById('courses', ents.filter((e) => e.item_type === 'course').map((e) => e.item_id)),
    mapById('books', ents.filter((e) => e.item_type === 'book').map((e) => e.item_id)),
    find('bookings', { user_id: uid }, { sort: { id: -1 } }),
    find('orders', { user_id: uid }, { sort: { id: -1 } }),
  ]);
  const courses = await withLessonCounts(owned('course', courseMap));
  const books = owned('book', bookMap);
  const types = await mapById('consult_types', bookingRows.map((b) => b.type_id), { id: 1, title: 1 });
  const bookings = bookingRows.map((b) => ({ ...b, title: b.title || (types.get(b.type_id) || {}).title || '' }));
  const orders = orderRows.map((o) => ({ ...o, items: (o.items || []).map((i) => i.title).join(', ') }));
  const sub = await shop.activeSub(req.user);
  res.send(views.account(ctxOf(req), { courses, books, bookings, orders, sub, memberUntil: await shop.subEnd(uid) }));
}));

// ---- Install as an app ("Add to home screen") ----
router.get('/manifest.webmanifest', (req, res) => {
  const th = settings.theme();
  const name = settings.get(`site_name_${req.lang}`) || settings.get('site_name_ar');
  const logo = require('../public/imgpos').src(settings.get('img_logo'));
  res.type('application/manifest+json').send(JSON.stringify({
    name, short_name: name.split(' ').slice(0, 2).join(' '), start_url: '/?app=1', scope: '/', display: 'standalone',
    background_color: th.bg, theme_color: th.bg, lang: req.lang, dir: req.lang === 'ar' ? 'rtl' : 'ltr',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }, ...(logo ? [{ src: logo, sizes: '512x512' }] : [])],
  }));
});
router.get('/icon.svg', (req, res) => {
  const th = settings.theme();
  const path = 'M13 8.57c-.79 0-1.43.64-1.43 1.43s.64 1.43 1.43 1.43 1.43-.64 1.43-1.43-.64-1.43-1.43-1.43zM13 3C9.25 3 6.2 5.94 6.02 9.64L4.1 12.2c-.25.33 0 .8.4.8H6v3c0 1.1.9 2 2 2h1v3h7v-4.68c2.36-1.12 4-3.53 4-6.32 0-3.87-3.13-7-7-7z';
  res.type('image/svg+xml').set('Cache-Control', 'public, max-age=3600')
    .send(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="${th.bg}"/><circle cx="256" cy="256" r="190" fill="${th.primary}"/><g transform="translate(96 96) scale(13.3)" fill="${th.bg}"><path d="${path}"/></g></svg>`);
});

// ---- Connect Google Drive (book PDFs are stored in the owner's Drive) ----
const crypto = require('crypto');
router.get('/admin/google/connect', (req, res) => {
  if (!auth.can(req.user, 'settings')) return res.redirect('/login?next=/admin');
  if (!gdrive.configured()) return res.redirect('/admin#gdrive');
  const state = crypto.randomBytes(16).toString('hex');
  res.cookie('gstate', state, { httpOnly: true, sameSite: 'lax', maxAge: 600e3, path: '/admin/google' });
  res.redirect(gdrive.authUrl(`${origin(req)}/admin/google/callback`, state));
});
router.get('/admin/google/callback', wrap(async (req, res) => {
  if (!auth.can(req.user, 'settings')) return res.redirect('/login?next=/admin');
  const ok = req.query.code && req.query.state && req.query.state === req.cookies.gstate;
  res.clearCookie('gstate', { path: '/admin/google' });
  if (!ok) return res.redirect('/admin#gdrive/error');
  try { await gdrive.finishConnect(String(req.query.code), `${origin(req)}/admin/google/callback`); res.redirect('/admin#gdrive/ok'); } catch (e) {
    console.error('drive connect', e.message);
    res.redirect('/admin#gdrive/error');
  }
}));

// ---- Admin panel (single page app) ----
router.get('/admin', (req, res) => {
  if (!auth.isStaff(req.user)) return res.redirect('/login?next=/admin');
  res.send(views.adminShell(ctxOf(req)));
});

module.exports = { router, notFound };
