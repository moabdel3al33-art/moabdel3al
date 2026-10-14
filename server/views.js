'use strict';
const settings = require('./settings');
const { md, plain } = require('../public/md');
const { esc, money, embedUrl } = require('./util');
const countries = require('../public/countries');
const ImgPos = require('../public/imgpos');
const payments = require('./payments');
const consult = require('./consult');

const VER = Date.now().toString(36); // cache-busting for css/js after each restart

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------
const P = {
  chat: 'M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z',
  play: 'M8 5v14l11-7z',
  lock: 'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z',
  book: 'M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z',
  calendar: 'M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z',
  user: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
  menu: 'M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z',
  home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  crown: 'M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z',
  star: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
  quote: 'M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z',
  comment: 'M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z',
  school: 'M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z',
  article: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z',
  globe: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2z',
  logout: 'M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z',
  close: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  check: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
  clock: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z',
  arrow: 'M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z',
  download: 'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z',
  dashboard: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
  brain: 'M13 8.57c-.79 0-1.43.64-1.43 1.43s.64 1.43 1.43 1.43 1.43-.64 1.43-1.43-.64-1.43-1.43-1.43zM13 3C9.25 3 6.2 5.94 6.02 9.64L4.1 12.2c-.25.33 0 .8.4.8H6v3c0 1.1.9 2 2 2h1v3h7v-4.68c2.36-1.12 4-3.53 4-6.32 0-3.87-3.13-7-7-7zm3 7c0 .13-.01.26-.02.39l.83.66c.08.06.1.16.05.25l-.8 1.39c-.05.09-.16.12-.24.09l-.99-.4c-.21.16-.43.29-.67.39L14 13.83c-.01.1-.1.17-.2.17h-1.6c-.1 0-.18-.07-.2-.17l-.15-1.06c-.25-.1-.47-.23-.68-.39l-.99.4c-.09.03-.2 0-.25-.09l-.8-1.39c-.05-.08-.03-.19.05-.25l.84-.66c-.01-.13-.02-.26-.02-.39s.02-.27.04-.39l-.85-.66c-.08-.06-.1-.16-.05-.26l.8-1.38c.05-.09.15-.12.24-.09l1 .4c.2-.15.43-.29.67-.39L12 6.17c.02-.1.1-.17.2-.17h1.6c.1 0 .18.07.2.17l.15 1.06c.24.1.46.23.67.39l1-.4c.09-.03.2 0 .24.09l.8 1.38c.05.09.03.2-.05.26l-.85.66c.03.12.04.25.04.39z',
  facebook: 'M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.5h-2.8V24C19.62 23.1 24 18.1 24 12.07',
  youtube: 'M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.87.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81zM9.55 15.57V8.43L15.82 12l-6.27 3.57z',
  instagram: 'M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85C2.38 3.92 3.9 2.38 7.15 2.23 8.42 2.17 8.8 2.16 12 2.16zM12 0C8.74 0 8.33.01 7.05.07 2.7.27.27 2.69.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.2 4.36 2.62 6.78 6.98 6.98C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c4.35-.2 6.78-2.62 6.98-6.98.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.2-4.35-2.62-6.78-6.98-6.98C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.41-11.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z',
  linkedin: 'M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zm1.78 13.02H3.56V9h3.56v11.45zM22.23 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0h.01z',
  x: 'M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93zm-1.29 19.5h2.04L6.49 3.24H4.3l13.31 17.41z',
  whatsapp: 'M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.31l-.34-.2-3.56.93.95-3.47-.22-.36a9.4 9.4 0 0 1-1.44-5.02c0-5.2 4.23-9.43 9.44-9.43 2.52 0 4.89.98 6.67 2.77a9.37 9.37 0 0 1 2.76 6.67c0 5.2-4.24 9.43-9.45 9.43zM20.08 3.9A11.32 11.32 0 0 0 12.05.58C5.79.58.7 5.67.7 11.92c0 2 .52 3.95 1.52 5.67L.6 23.5l6.05-1.59a11.3 11.3 0 0 0 5.4 1.38h.01c6.25 0 11.34-5.09 11.34-11.34 0-3.03-1.18-5.88-3.32-8.02z',
  telegram: 'M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z',
  email: 'M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z',
  phone: 'M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z',
  share: 'M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.11 0-2-.9-2-2V10c0-1.11.89-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z',
  dots: 'M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
  card: 'M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z',
  paypal: 'M7.08 21.6H3.55a.6.6 0 0 1-.6-.69L5.86 2.5A.93.93 0 0 1 6.78 1.7h6.06c3.95 0 6.17 1.9 5.6 5.28-.6 3.62-3.1 5.4-6.6 5.4H9.98a.9.9 0 0 0-.9.77l-.98 6.18-.12.79a1 1 0 0 1-.9.83zm12.4-14.06c-.05.3-.1.6-.17.92-.95 4.86-4.2 6.54-8.36 6.54h-.62a1.03 1.03 0 0 0-1.02.87l-.86 5.42-.24 1.54a.54.54 0 0 0 .53.62h3.73a.9.9 0 0 0 .89-.76l.04-.19.7-4.46.05-.25a.9.9 0 0 1 .89-.76h.56c3.63 0 6.47-1.47 7.3-5.73.35-1.78.17-3.26-.75-4.31a3.6 3.6 0 0 0-1.03-.8l-.64-.66z',
  upload: 'M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z',
  copy: 'M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z',
  bolt: 'M7 2v11h3v9l7-12h-4l4-8z',
  infinity: 'M18.6 6.62c-1.44 0-2.8.56-3.77 1.53L12 10.66 10.48 12h.01L7.8 14.39c-.64.64-1.49.99-2.4.99-1.87 0-3.39-1.51-3.39-3.38S3.53 8.62 5.4 8.62c.91 0 1.76.35 2.44 1.03l1.13 1 1.51-1.34L9.22 8.2A5.37 5.37 0 0 0 5.4 6.62C2.42 6.62 0 9.04 0 12s2.42 5.38 5.4 5.38c1.44 0 2.8-.56 3.77-1.53l2.83-2.5.01.01L13.52 12h-.01l2.69-2.39c.64-.64 1.49-.99 2.4-.99 1.87 0 3.39 1.51 3.39 3.38s-1.52 3.38-3.39 3.38c-.9 0-1.76-.35-2.44-1.03l-1.14-1.01-1.51 1.34 1.27 1.12a5.386 5.386 0 0 0 3.82 1.57c2.98 0 5.4-2.41 5.4-5.38s-2.42-5.37-5.4-5.37z',
  hourglass: 'M6 2v6h.01L6 8.01 10 12l-4 4 .01.01H6V22h12v-5.99h-.01L18 16l-4-4 4-3.99-.01-.01H18V2H6zm10 14.5V20H8v-3.5l4-4 4 4zm-4-5l-4-4V4h8v3.5l-4 4z',
  tiktok: 'M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
};
const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${P[n]}"/></svg>`;
const SOCIAL = [
  { key: 'facebook', name: 'Facebook', action: 'Follow' },
  { key: 'tiktok', name: 'TikTok', action: 'Follow' },
  { key: 'youtube', name: 'YouTube', action: 'Subscribe' },
  { key: 'instagram', name: 'Instagram', action: 'Follow' },
];

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
const S = (ctx, key) => settings.get(`${key}_${ctx.lang}`) || settings.get(`${key}_${ctx.lang === 'ar' ? 'en' : 'ar'}`) || '';
const price = (ctx, v) => money(v, settings.get('currency'), ctx.lang);
const fmtDate = (ctx, ts) => (ts ? new Date(Number(ts)).toLocaleDateString(ctx.lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
const fmtDateTime = (ctx, ts) => (ts ? new Date(Number(ts)).toLocaleString(ctx.lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', { dateStyle: 'full', timeStyle: 'short' }) : '');
// Full accounts go straight on; chat-only clients are asked to create an account; visitors log in.
const loginOr = (ctx, next) => (ctx.user && !ctx.user.is_guest ? next : `/${ctx.user ? 'register' : 'login'}?next=${encodeURIComponent(next)}`);
function phoneField(ctx, { country, phone, label } = {}) {
  const iso = country || ctx.countryGuess || countries.DEFAULT;
  const national = phone && phone.startsWith('+') ? countries.format(phone, iso).split(' ').slice(1).join('') : (phone || '');
  return `<label>${esc(label || ctx.t('Phone (WhatsApp)'))}<div class="phone-field" dir="ltr">
    <select name="country" aria-label="${esc(ctx.t('Country'))}">${countries.options(ctx.lang, iso)}</select>
    <input name="phone" type="tel" autocomplete="tel-national" inputmode="tel" required placeholder="1012345678" value="${esc(national)}"></div></label>`;
}
const rememberBox = (ctx) => `<label class="check"><input type="checkbox" name="remember" checked> ${esc(ctx.t('Remember me'))}</label>`;
const enc = encodeURIComponent;

// <img> that fills its frame, using the position/zoom chosen in the admin (see public/imgpos.js).
function pimg(value, alt = '', attrs = '') {
  const p = ImgPos.parse(value);
  return `<img src="${esc(p.src)}" alt="${esc(alt)}" style="${ImgPos.style(p)}" ${attrs || 'loading="lazy"'}>`;
}
const plain_src = (v) => ImgPos.src(v);
const logoTag = (logo) => `<span class="brand-logo">${pimg(logo, '', 'decoding="async"')}</span>`;
function img(src, alt, cls = '') {
  if (src) { const p = ImgPos.parse(src); return `<img class="${cls}" src="${esc(p.src)}" alt="${esc(alt || '')}" style="${ImgPos.style(p)}" loading="lazy">`; }
  return `<div class="ph ${cls}" aria-hidden="true">${icon('brain')}</div>`;
}
function priceHtml(ctx, item) {
  const old = item.old_price && Number(item.old_price) > Number(item.price) ? `<del>${esc(price(ctx, item.old_price))}</del>` : '';
  return `<span class="price">${esc(price(ctx, item.price))}${old}</span>`;
}
function socialLinks(cls = 'soc') {
  return SOCIAL.filter((s) => settings.get(`social_${s.key}`)).map((s) =>
    `<a class="${cls} ${s.key}" href="${esc(settings.socialLink(s.key))}" target="_blank" rel="noopener" aria-label="${s.name}">${icon(s.key)}</a>`).join('');
}
function sectionHead(title, sub, link, linkText) {
  return `<div class="sec-head"><div><h2>${esc(title)}</h2>${sub ? `<p>${esc(sub)}</p>` : ''}</div>${link ? `<a class="more" href="${link}">${esc(linkText)} ${icon('arrow', 'flip')}</a>` : ''}</div>`;
}
function banner(ctx, title, sub, image) {
  return `<section class="banner">${image ? `<div class="banner-bg" style="${esc(ImgPos.bg(image))}"></div>` : ''}
    <div class="wrap"><h1>${esc(title)}</h1>${sub ? `<p>${esc(sub)}</p>` : ''}</div></section>`;
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
// Bottom tab bar (phones) + the "More" sheet it opens.
function tabBar(ctx, active) {
  const { t, lang, user } = ctx;
  const tab = (href, ic, label, key) => `<a href="${href}" class="tab ${active === key ? 'on' : ''}">${icon(ic)}<span>${esc(label)}</span></a>`;
  const other = lang === 'ar' ? 'en' : 'ar';
  const acc = !user ? [['/login', 'user', t('Log in')], ['/register', 'check', t('Create account')]]
    : user.is_guest ? [['/register', 'user', t('Create account')]]
      : user.role === 'client' ? [['/account', 'user', t('My account')]] : [['/admin', 'dashboard', t('Dashboard')]];
  const item = (href, ic, label, cls = '') => `<a class="sheet-item ${cls}" href="${href}">${icon(ic)}<span>${esc(label)}</span></a>`;
  return `<nav class="tabbar" aria-label="${esc(t('Menu'))}">
    ${tab('/', 'home', t('Home'), 'home')}${tab('/courses', 'school', t('Courses'), 'courses')}
    <a href="/chat" class="tab tab-chat"><span class="tc">${icon('chat')}</span><span>${esc(t('Chat'))}</span></a>
    ${tab('/consultations', 'calendar', t('Consultations'), 'consult')}
    <button type="button" class="tab ${['books', 'blog', 'member', 'reviews'].includes(active) ? 'on' : ''}" data-sheet="moreSheet" data-on="${['books', 'blog', 'member', 'reviews'].includes(active) ? 1 : 0}">${icon('menu')}<span>${esc(t('More'))}</span></button>
  </nav>
  <div class="sheet" id="moreSheet" hidden>
    <div class="sheet-back" data-close-sheet></div>
    <div class="sheet-panel" role="dialog">
      <div class="sheet-handle"></div>
      ${user && !user.is_guest ? `<div class="sheet-user"><span class="brand-mark">${icon('user')}</span><div><b>${esc(user.name)}</b><div class="muted small">${esc(user.email || '')}</div></div></div>` : ''}
      <div class="sheet-grid">
        ${item('/membership', 'crown', t('Membership'), 'hl')}${item('/books', 'book', t('Books'))}${item('/blog', 'article', t('Blog'))}${item('/reviews', 'star', t('Reviews'))}
        ${acc.map(([h, i, l]) => item(h, i, l)).join('')}
        ${item(`/lang/${other}?next=${enc(ctx.path || '/')}`, 'globe', other === 'en' ? 'English' : 'العربية')}
        ${user ? `<button class="sheet-item" data-logout>${icon('logout')}<span>${esc(t('Log out'))}</span></button>` : ''}
      </div>
      <div class="sheet-social">${socialLinks('soc')}</div>
    </div>
  </div>`;
}

// Followers of all platforms together (counts up when the page opens). Shown in a bar at the very top of every
// page and as a big counter in the home page's top section.
function followersTotal() {
  if (settings.get('followers_show') !== '1') return 0;
  return require('./social').followers().total;
}
const compactNum = (ctx, n) => new Intl.NumberFormat(ctx.lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
const fanIcons = () => ['youtube', 'tiktok', 'instagram', 'facebook'].filter((k) => settings.get(`social_${k}`))
  .map((k) => `<a class="fan-ic ${k}" href="${esc(settings.socialLink(k))}" target="_blank" rel="noopener" aria-label="${k}">${icon(k)}</a>`).join('');
function followersBar(ctx) {
  const total = followersTotal();
  if (!total) return '';
  return `<div class="fbar"><div class="wrap fbar-in">
    <span class="fbar-live"><i></i>${esc(ctx.t('Join'))}</span>
    <b class="fbar-n count-up" data-count="${total}" dir="ltr">${esc(compactNum(ctx, total))}+</b><span class="fbar-txt">${esc(ctx.t('followers across all platforms'))}</span>
    <span class="fbar-icons">${fanIcons()}</span></div></div>`;
}
function followersHero(ctx) {
  const total = followersTotal();
  if (!total) return '';
  return `<div class="hero-fans"><div class="hf-num"><b class="count-up" data-count="${total}" dir="ltr">${esc(compactNum(ctx, total))}+</b>
    <span>${esc(ctx.t('followers across all platforms'))}</span></div><div class="hf-icons">${fanIcons()}</div></div>`;
}

function layout(ctx, { title, desc, image, body, active = '', bodyClass = '', chrome = true, head = '', scripts = '', bottom }) {
  // bottom: undefined = tab bar on normal pages, a string = custom bottom bar (e.g. Buy), false = nothing.
  const bottomHtml = bottom === undefined ? (chrome === true ? tabBar(ctx, active) : '') : (bottom || '');
  const { t, lang, user } = ctx;
  const name = S(ctx, 'site_name');
  const logo = settings.get('img_logo');
  const fullTitle = title ? `${title} | ${name}` : `${name} — ${S(ctx, 'tagline')}`;
  const nav = [['/', t('Home'), 'home'], ['/courses', t('Courses'), 'courses'], ['/books', t('Books'), 'books'], ['/consultations', t('Consultations'), 'consult'], ['/membership', t('Membership'), 'member'], ['/blog', t('Blog'), 'blog']];
  const accountLink = !user ? `<a class="nav-btn" href="/login">${icon('user')}<span>${esc(t('Log in'))}</span></a>`
    : user.is_guest ? `<a class="nav-btn" href="/register">${icon('user')}<span>${esc(t('Create account'))}</span></a>`
    : user.role === 'client' ? `<a class="nav-btn" href="/account">${icon('user')}<span>${esc(t('My account'))}</span></a>`
      : `<a class="nav-btn" href="/admin">${icon('dashboard')}<span>${esc(t('Dashboard'))}</span></a>`;
  const other = lang === 'ar' ? 'en' : 'ar';
  const path = ctx.path || '/';
  return `<!doctype html>
<html lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}" data-tone="${settings.isLight() ? 'light' : 'dark'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc((desc || S(ctx, 'hero_text')).slice(0, 300))}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc((desc || S(ctx, 'tagline')).slice(0, 300))}">
${image || settings.get('img_hero') ? `<meta property="og:image" content="${esc(plain_src(image || settings.get('img_hero')))}">` : ''}
<meta name="theme-color" content="${settings.theme().bg}">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${esc(plain_src(settings.get('img_logo')) || '/icon.svg')}">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="${esc(S(ctx, 'site_name'))}">
<meta name="format-detection" content="telephone=no">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=El+Messiri:wght@500;600;700&display=swap" rel="stylesheet">
<style>${settings.themeCss()}</style>
<link rel="stylesheet" href="/site.css?v=${VER}">
<script>document.documentElement.classList.add('js')</script>
${head}
</head>
<body class="${bodyClass} ${bottomHtml ? (bottom === undefined ? 'has-tabs' : 'has-bottom') : ''}">
${chrome !== false ? `${followersBar(ctx)}<header class="topbar" id="top">
  <div class="wrap bar">
    <a class="brand" href="/">${logo ? logoTag(logo) : `<span class="brand-mark">${icon('brain')}</span>`}<span>${esc(name)}</span></a>
    <nav class="links" id="navLinks">
      ${nav.map(([href, label, key]) => `<a href="${href}" class="${active === key ? 'on' : ''}">${esc(label)}</a>`).join('')}
      <div class="nav-social">${socialLinks('soc sm')}</div>
    </nav>
    <div class="bar-end">
      <a class="nav-btn chat-btn" href="/chat">${icon('chat')}<span>${esc(t('Chat'))}</span></a>
      ${accountLink}
      ${user ? `<button class="nav-btn logout" type="button" data-logout title="${esc(t('Log out'))}" aria-label="${esc(t('Log out'))}">${icon('logout')}</button>` : ''}
      <a class="nav-btn lang" href="/lang/${other}?next=${enc(path)}" title="${other === 'en' ? 'English' : 'العربية'}">${other === 'en' ? 'EN' : 'ع'}</a>
      <button class="nav-btn burger" id="burger" aria-label="${esc(t('Menu'))}">${icon('menu')}</button>
    </div>
  </div>
</header>` : ''}
<main>${body}</main>
${chrome === true ? `<footer class="foot">
  <div class="wrap foot-in">
    <div>
      <a class="brand" href="/">${logo ? logoTag(logo) : `<span class="brand-mark">${icon('brain')}</span>`}<span>${esc(name)}</span></a>
      <p class="muted">${esc(S(ctx, 'tagline'))}</p>
      <div class="foot-social">${socialLinks()}</div>
    </div>
    <div class="foot-links">${nav.map(([href, label]) => `<a href="${href}">${esc(label)}</a>`).join('')}<a href="/chat">${esc(t('Chat'))}</a></div>
  </div>
  <div class="wrap copy">© ${new Date().getFullYear()} ${esc(name)}</div>
</footer>
<a class="fab" href="/chat" aria-label="${esc(t('Chat with us'))}">${icon('chat')}<span>${esc(t('Chat with us'))}</span></a>` : ''}
${bottomHtml}
<script src="/locales.js?v=${VER}"></script>
<script src="/site.js?v=${VER}" defer></script>
${scripts}
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------
const ownedLabel = (ctx, owned) => (owned === 'sub' ? ctx.t('Included') : ctx.t('Owned'));
const ownedOf = (set, id) => set.has(id) && (set.sub ? 'sub' : true);
const soonBadge = (ctx) => `<span class="badge soon">${icon('hourglass')} ${esc(ctx.t('Coming soon'))}</span>`;
const soonFoot = (ctx) => `<span class="go soon">${esc(ctx.t('Book your seat'))}</span>`;
function courseCard(ctx, c, owned) {
  const soon = c.coming_soon && !owned;
  return `<a class="card" href="/courses/${enc(c.slug)}">
    <div class="card-img">${img(c.cover, c.title)}${owned ? `<span class="badge ok">${icon(owned === 'sub' ? 'crown' : 'check')} ${esc(ownedLabel(ctx, owned))}</span>` : soon ? soonBadge(ctx) : ''}</div>
    <div class="card-body"><h3>${esc(c.title)}</h3>${c.subtitle ? `<p>${esc(c.subtitle)}</p>` : ''}
      <div class="card-foot">${owned ? `<span class="go">${esc(ctx.t('Continue watching'))}</span>` : soon ? soonFoot(ctx) : priceHtml(ctx, c)}
      ${c.lessons_count ? `<span class="meta">${icon('play')} ${esc(ctx.t('{n} lessons', { n: c.lessons_count }))}</span>` : ''}</div></div></a>`;
}
function bookCard(ctx, b, owned, i) {
  const soon = b.coming_soon && !owned;
  return `<a class="card book" href="/books/${enc(b.slug)}"${i != null ? ` style="--i:${i}"` : ''}>
    <div class="card-img tall">${img(b.cover, b.title)}${owned ? `<span class="badge ok">${icon(owned === 'sub' ? 'crown' : 'check')} ${esc(ownedLabel(ctx, owned))}</span>` : soon ? soonBadge(ctx) : ''}</div>
    <div class="card-body"><h3>${esc(b.title)}</h3>${b.subtitle ? `<p>${esc(b.subtitle)}</p>` : ''}
      <div class="card-foot">${owned ? `<span class="go">${esc(ctx.t('Read now'))}</span>` : soon ? soonFoot(ctx) : priceHtml(ctx, b)}</div></div></a>`;
}
function postCard(ctx, p) {
  return `<a class="card post" href="/blog/${enc(p.slug)}">
    <div class="card-img">${img(p.cover, p.title)}</div>
    <div class="card-body"><span class="meta">${esc(fmtDate(ctx, p.published_at || p.created_at))}</span><h3>${esc(p.title)}</h3>
      <p>${esc(p.excerpt || plain(p.body).slice(0, 160))}</p></div></a>`;
}
const openBadge = (ctx) => `<span class="open-badge">${icon('infinity')} ${esc(ctx.t('Open session'))}</span>`;
function socialPostCard(ctx, p) {
  return `<a class="spost ${esc(p.platform)}" href="${esc(p.url)}" target="_blank" rel="noopener">
    <div class="spost-img">${img(p.thumbnail, p.title)}<span class="spost-badge ${esc(p.platform)}">${icon(p.platform)}</span>${p.platform === 'youtube' || p.platform === 'tiktok' ? `<span class="spost-play">${icon('play')}</span>` : ''}</div>
    <div class="spost-body"><p>${esc((p.title || '').slice(0, 140)) || esc(ctx.t('View post'))}</p>${p.posted_at ? `<span class="meta">${esc(fmtDate(ctx, p.posted_at))}</span>` : ''}</div></a>`;
}

// ---------------------------------------------------------------------------
// Comments, ratings, memberships
// ---------------------------------------------------------------------------
function starRow(n, cls = '') {
  const r = Math.round(Number(n) || 0);
  return `<span class="stars ${cls}" aria-label="${r}/5">${[1, 2, 3, 4, 5].map((i) => `<span class="${i <= r ? 'on' : ''}">${icon('star')}</span>`).join('')}</span>`;
}
function ratingSummary(ctx, rating) {
  if (!rating || !rating.count) return '';
  return `<span class="rating-sum">${starRow(rating.avg)} <b>${Number(rating.avg).toFixed(1)}</b> <span class="muted">(${esc(ctx.t('{n} ratings', { n: rating.count }))})</span></span>`;
}
function commentCard(ctx, c, { quote = false } = {}) {
  const where = c.country ? ` · ${esc(countries.name(c.country, ctx.lang))}` : '';
  return `<article class="cmt ${quote ? 'quote' : ''}">
    ${quote ? `<span class="cmt-q">${icon('quote')}</span>` : ''}
    <div class="cmt-head"><span class="cmt-av">${esc(Array.from(c.name.trim())[0] || '?')}</span>
      <div class="cmt-who"><b>${esc(c.name)}</b><span class="meta">${esc(fmtDate(ctx, c.created_at))}${where}</span></div>
      ${c.rating ? starRow(c.rating) : ''}</div>
    <p class="cmt-body">${esc(c.body)}</p>
    ${c.reply ? `<div class="cmt-reply"><b>${icon('chat')} ${esc(ctx.t('Reply from the team'))}</b><p>${esc(c.reply)}</p></div>` : ''}
  </article>`;
}
function commentForm(ctx, type, id, withRating) {
  const { t, user } = ctx;
  const me = user && user.role === 'client' ? user : null;
  return `<form class="form card-form comment-form" id="write" data-api="/api/comments" data-done="${esc(t('Thank you! Your comment will appear after our team reviews it.'))}" data-reset>
    <h3>${esc(type === 'site' ? t('Write your review') : t('Write a comment'))}</h3>
    <input type="hidden" name="target_type" value="${esc(type)}"><input type="hidden" name="target_id" value="${Number(id) || 0}">
    <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
    ${withRating ? `<div class="star-input" role="radiogroup" aria-label="${esc(t('Your rating'))}">${[5, 4, 3, 2, 1].map((n) => `<input type="radio" name="rating" id="r${n}-${type}" value="${n}"><label for="r${n}-${type}" title="${n}">${icon('star')}</label>`).join('')}</div>` : ''}
    ${me ? `<input type="hidden" name="name" value="${esc(me.name)}"><div class="muted small">${esc(t('Posting as {name}', { name: me.name }))}</div>`
    : `<label>${esc(t('Your name'))}<input name="name" required maxlength="100" autocomplete="name"></label>`}
    <label>${esc(t('Your comment'))}<textarea name="body" rows="4" required minlength="3" maxlength="1500"></textarea></label>
    <div class="form-error"></div>
    <button class="btn primary" type="submit">${icon('comment')} ${esc(t('Send'))}</button>
    <p class="note">${esc(t('Comments are published after a quick review by our team.'))}</p>
  </form>`;
}
function commentsSection(ctx, type, id, list, rating, withRating = true) {
  const { t } = ctx;
  return `<section class="wrap sec narrow comments" id="comments">
    <div class="sec-head"><div><h2>${esc(t('Comments'))} <span class="muted">(${list.length})</span></h2>${ratingSummary(ctx, rating)}</div></div>
    ${list.length ? `<div class="clist">${list.map((c) => commentCard(ctx, c)).join('')}</div>` : `<p class="muted">${esc(t('No comments yet. Be the first!'))}</p>`}
    ${commentForm(ctx, type, id, withRating)}
  </section>`;
}
const perMonth = (ctx, p) => price(ctx, Math.round(Number(p.price) / Math.max(1, p.months)));
function planCard(ctx, p, best) {
  const { t } = ctx;
  return `<div class="plan ${best ? 'best' : ''}">${best ? `<span class="plan-tag">${esc(t('Best value'))}</span>` : ''}
    <h3>${esc(p.title)}</h3>
    <div class="plan-price">${priceHtml(ctx, p)}</div>
    ${p.months > 1 ? `<div class="muted small">${esc(t('{price} per month', { price: perMonth(ctx, p) }))}</div>` : `<div class="muted small">${esc(t('Renew whenever you want'))}</div>`}
    ${p.description ? `<p>${esc(p.description)}</p>` : ''}
    <a class="btn ${best ? 'primary' : 'ghost'} block lg" href="${loginOr(ctx, `/checkout?type=plan&id=${p.id}`)}">${icon('crown')} ${esc(t('Subscribe'))}</a>
  </div>`;
}
function memberStatus(ctx, until) {
  if (!until) return '';
  const days = Math.max(0, Math.ceil((Number(until) - Date.now()) / 864e5));
  return `<div class="member-card">${icon('crown')}<div><b>${esc(ctx.t('Your membership is active'))}</b>
    <div class="small">${esc(ctx.t('Until {date} ({n} days left)', { date: fmtDate(ctx, until), n: days }))}</div></div>
    <a class="btn small" href="/membership">${esc(ctx.t('Renew'))}</a></div>`;
}

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------
function home(ctx, d) {
  const { t } = ctx;
  const heroImg = settings.get('img_hero');
  const aboutImg = settings.get('img_about');
  const body = `
<section class="hero">
  ${heroImg ? `<div class="hero-bg" style="${esc(ImgPos.bg(heroImg))}"></div>` : ''}
  <div class="wrap hero-in">
    <div class="hero-text">
      <p class="eyebrow">${esc(S(ctx, 'site_name'))}</p>
      <h1>${esc(S(ctx, 'hero_title'))}</h1>
      <p class="lead">${esc(S(ctx, 'hero_text'))}</p>
      <div class="cta">
        <a class="btn primary lg" href="/chat">${icon('chat')} ${esc(t('Chat with us now'))}</a>
        <a class="btn ghost lg" href="/courses">${esc(t('Explore the courses'))}</a>
      </div>
      ${followersHero(ctx)}
      <div class="hero-social">${socialLinks('soc')}</div>
    </div>
    <div class="hero-photo">${heroImg ? pimg(heroImg, S(ctx, 'site_name'), 'fetchpriority="high"') : `<div class="ph big">${icon('brain')}</div>`}</div>
  </div>
</section>

<section class="wrap chat-strip">
  <div class="chat-strip-ic">${icon('chat')}</div>
  <div><h2>${esc(t('Talk to us directly'))}</h2><p>${esc(t('Questions, orders or help — our team answers you in the chat right here on the website.'))}</p></div>
  <a class="btn primary" href="/chat">${esc(t('Open the chat'))} ${icon('arrow', 'flip')}</a>
</section>

<section class="wrap sec">
  ${sectionHead(t('Follow Mohamed'), t('Daily content on every platform'))}
  <div class="platforms">${SOCIAL.map((s) => `<a class="platform ${s.key}" href="${esc(settings.socialLink(s.key) || '#')}" target="_blank" rel="noopener">
    <span class="platform-ic">${icon(s.key)}</span><strong>${s.name}</strong><span class="platform-act">${esc(t(s.action))}</span></a>`).join('')}</div>
  ${d.social.length ? `<div class="sposts rail">${d.social.map((p) => socialPostCard(ctx, p)).join('')}</div>` : ''}
</section>

${d.courses.length ? `<section class="wrap sec">${sectionHead(t('Courses'), t('Learn step by step with recorded video lessons'), '/courses', t('All courses'))}
  <div class="grid rail">${d.courses.map((c) => courseCard(ctx, c, ownedOf(d.ownedCourses, c.id))).join('')}</div></section>` : ''}

${d.plans.length ? `<section class="wrap sec"><div class="member-banner">
  <div class="mb-ic">${icon('crown')}</div>
  <div class="mb-text"><h2>${esc(t('Everything in one membership'))}</h2>
    <p>${esc(t('All courses and books, and every new one we add, from {price} per month.', { price: price(ctx, Math.round(Math.min(...d.plans.map((p) => Number(p.price) / Math.max(1, p.months))))) }))}</p></div>
  ${d.memberUntil ? memberStatus(ctx, d.memberUntil) : `<a class="btn primary lg" href="/membership">${esc(t('See the plans'))}</a>`}
</div></section>` : ''}

${consult.tiers().length ? `<section class="sec alt"><div class="wrap">${sectionHead(t('Private consultations'), t('A one-to-one session to talk about your situation'), '/consultations', t('Open session'))}
  ${tierCards(ctx)}</div></section>` : ''}

${d.books.length ? `<section class="wrap sec">${sectionHead(t('Books'), t('Digital books you can read anywhere'), '/books', t('All books'))}
  <div class="grid books rail pop-books">${d.books.map((b, i) => bookCard(ctx, b, ownedOf(d.ownedBooks, b.id), i)).join('')}</div></section>` : ''}

<section class="wrap sec about">
  <div class="about-img">${aboutImg ? pimg(aboutImg) : `<div class="ph big">${icon('brain')}</div>`}</div>
  <div><h2>${esc(S(ctx, 'about_title'))}</h2><div class="prose">${md(S(ctx, 'about_text'))}</div>
    <div class="hero-social">${socialLinks('soc')}</div></div>
</section>

<section class="wrap sec reviews-sec">${sectionHead(t('What people say'), '', '/reviews', t('All reviews'))}
  ${ratingSummary(ctx, d.siteRating)}
  ${d.reviews.length ? `<div class="grid rail tgrid">${d.reviews.map((c) => commentCard(ctx, c, { quote: true })).join('')}</div>` : `<p class="muted">${esc(t('No reviews yet. Be the first!'))}</p>`}
  <a class="btn ghost" href="/reviews#write">${icon('comment')} ${esc(t('Write your review'))}</a>
</section>

${d.posts.length ? `<section class="wrap sec">${sectionHead(t('From the blog'), '', '/blog', t('All articles'))}
  <div class="grid rail">${d.posts.map((p) => postCard(ctx, p)).join('')}</div></section>` : ''}

<section class="wrap final-cta">
  <h2>${esc(t('Have a question?'))}</h2><p>${esc(t('Send us a message now — it only takes a moment.'))}</p>
  <a class="btn primary lg" href="/chat">${icon('chat')} ${esc(t('Chat with us now'))}</a>
</section>`;
  return layout(ctx, { body, active: 'home' });
}

function courses(ctx, list, owned) {
  const { t } = ctx;
  const body = `${banner(ctx, t('Courses'), t('Learn step by step with recorded video lessons'), settings.get('img_courses'))}
  <section class="wrap sec">${list.length ? `<div class="grid list">${list.map((c) => courseCard(ctx, c, ownedOf(owned, c.id))).join('')}</div>` : empty(ctx, t('No courses yet. Check back soon.'))}</section>`;
  return layout(ctx, { title: t('Courses'), body, active: 'courses' });
}

// The main action for a course/book page, used by the side box (desktop) and the bottom bar (phones).
function mainAction(ctx, type, item, state) {
  const { t } = ctx;
  if (state.owned) {
    if (type === 'course') return state.firstLesson ? { href: `/courses/${enc(item.slug)}?lesson=${state.firstLesson}`, ic: 'play', label: t('Start watching') } : null;
    if (item.file_path || item.external_url) return { href: `/books/${enc(item.slug)}/read`, ic: 'book', label: t('Read the book') };
    return null;
  }
  if (item.coming_soon) return { href: '#reserve', ic: 'calendar', label: t('Book your seat') };
  if (state.pending) return { href: `/pay/${state.pending.id}`, ic: 'card', label: t('Complete payment') };
  return { href: loginOr(ctx, `/checkout?type=${type}&id=${item.id}`), ic: 'chat', label: Number(item.price) ? t('Buy now') : t('Get it free') };
}
function ctaBar(ctx, type, item, state) {
  const a = mainAction(ctx, type, item, state);
  if (!a) return false;
  const left = state.owned ? `<div class="owned">${icon('check')} ${esc(ctx.t('You own this'))}</div>`
    : item.coming_soon ? `<div class="owned soon">${icon('hourglass')} ${esc(ctx.t('Coming soon'))}</div>` : priceHtml(ctx, item);
  return `<div class="cta-bar">${left}<a class="btn primary lg" href="${esc(a.href)}"${a.ext ? ' target="_blank" rel="noopener"' : ''}>${icon(a.ic)} ${esc(a.label)}</a></div>`;
}
function memberHint(ctx, state) {
  if (state.viaSub) return `<div class="member-hint on">${icon('crown')} ${esc(ctx.t('Included in your membership'))}</div>`;
  if (state.owned || !state.fromMonthly || state.soon) return '';
  return `<a class="member-hint" href="/membership">${icon('crown')} <span>${esc(ctx.t('Or get all courses and books with a membership from {price} per month', { price: price(ctx, Math.round(state.fromMonthly)) }))}</span></a>`;
}
function buyBox(ctx, type, item, state) {
  const { t } = ctx;
  if (state.owned) {
    const action = type === 'course'
      ? (state.firstLesson ? `<a class="btn primary block lg" href="/courses/${enc(item.slug)}?lesson=${state.firstLesson}">${icon('play')} ${esc(t('Start watching'))}</a>` : '')
      : (item.file_path || item.external_url ? `<a class="btn primary block lg" href="/books/${enc(item.slug)}/read">${icon('book')} ${esc(t('Read the book'))}</a>` : '');
    return `<div class="buybox"><div class="owned">${icon('check')} ${esc(t('You own this'))}</div>${action}</div>`;
  }
  if (item.coming_soon) {
    return `<div class="buybox soon"><div class="soon-tag">${icon('hourglass')} ${esc(t('Coming soon'))}</div>
      <p class="soon-text">${esc(t('Stay tuned! This content will be available soon.'))}</p>
      <a class="btn primary block lg" href="#reserve">${icon('calendar')} ${esc(t('Book your seat'))}</a>
      <p class="note">${esc(t('No payment now. Leave your details and you will be the first to know when it opens.'))}</p></div>`;
  }
  if (state.pending) {
    return `<div class="buybox">${priceHtml(ctx, item)}<p class="note">${esc(t('Your order #{id} is waiting for payment confirmation.', { id: state.pending.id }))}</p>
      <a class="btn primary block lg" href="/pay/${state.pending.id}">${icon('card')} ${esc(t('Complete payment'))}</a></div>`;
  }
  const viaChat = onlyChat(type);
  return `<div class="buybox">${priceHtml(ctx, item)}
    <a class="btn primary block lg" href="${loginOr(ctx, `/checkout?type=${type}&id=${item.id}`)}">${esc(Number(item.price) ? t('Buy now') : t('Get it free'))}</a>
    <p class="note">${icon(viaChat ? 'chat' : 'lock')} ${esc(viaChat ? t('Payment is completed with our team in the chat.') : t('Secure payment. Your order is activated as soon as the payment is confirmed.'))}</p></div>`;
}
// True when the chat is the only payment method for this kind of product.
function onlyChat(type) {
  const m = payments.methodsFor(type);
  return m.length === 1 && m[0] === 'chat';
}
// Seat booking for "coming soon" content: details only, no account and no payment.
function reserveSection(ctx, type, item) {
  const { t, user } = ctx;
  const me = user && user.role === 'client' ? user : {};
  return `<section class="wrap sec narrow" id="reserve">
    <form class="form card-form reserve-form" data-api="/api/shop/reserve" data-done="${esc(t('Your seat is booked!'))}">
      <div class="reserve-head"><span class="reserve-ic">${icon('hourglass')}</span><div><h2>${esc(t('Book your seat'))}</h2>
        <p class="muted">${esc(t('Stay tuned! This content will be available soon.'))} ${esc(t('No payment now. Leave your details and you will be the first to know when it opens.'))}</p></div></div>
      <input type="hidden" name="type" value="${type}"><input type="hidden" name="id" value="${item.id}">
      <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <label>${esc(t('Full name'))}<input name="name" autocomplete="name" required maxlength="100" value="${esc(me.name || '')}"></label>
      ${phoneField(ctx, { country: me.country, phone: me.phone })}
      <label>${esc(t('Email (optional)'))}<input name="email" type="email" autocomplete="email" dir="ltr" value="${esc(me.email || '')}"></label>
      <label>${esc(t('Anything you would like to tell us? (optional)'))}<textarea name="notes" rows="3" maxlength="1000"></textarea></label>
      <div class="form-error"></div>
      <button class="btn primary block lg" type="submit">${icon('calendar')} ${esc(t('Book my seat'))}</button>
      <div class="form-thanks" hidden>${icon('check')}<h3>${esc(t('Your seat is booked!'))}</h3><p class="muted">${esc(t('We will contact you as soon as it is available.'))}</p></div>
    </form>
  </section>`;
}

function course(ctx, c, lessons, state) {
  const { t } = ctx;
  const body = `
<section class="detail-hero"><div class="wrap detail-in">
  <div class="detail-img">${img(c.cover, c.title)}</div>
  <div class="detail-text"><a class="crumb" href="/courses">${esc(t('Courses'))}</a><h1>${esc(c.title)}</h1>${c.subtitle ? `<p class="lead">${esc(c.subtitle)}</p>` : ''}
    <div class="meta-row">${c.coming_soon && !state.owned ? `<span class="soon-pill">${icon('hourglass')} ${esc(t('Coming soon'))}</span>` : ''}${lessons.length ? `<span>${icon('play')} ${esc(t('{n} lessons', { n: lessons.length }))}</span>` : ''}${ratingSummary(ctx, state.rating)}</div>
    ${memberHint(ctx, { ...state, soon: c.coming_soon })}</div>
  ${buyBox(ctx, 'course', c, state)}
</div></section>
${c.coming_soon && !state.owned ? reserveSection(ctx, 'course', c) : ''}
<section class="wrap sec two-col">
  <div class="prose">${md(c.description)}</div>
  <div class="curriculum"><h3>${esc(t('Course content'))}</h3>
    ${lessons.map((l, i) => {
    const open = state.owned || l.is_preview;
    return `<${open ? `a href="/courses/${enc(c.slug)}?lesson=${l.id}"` : 'div'} class="lesson ${open ? 'open' : 'locked'}">
      <span class="num">${i + 1}</span><span class="lt">${esc(l.title)}${l.is_preview && !state.owned ? ` <em class="tag">${esc(t('Free preview'))}</em>` : ''}</span>
      ${l.duration ? `<span class="meta">${esc(l.duration)}</span>` : ''}${icon(open ? 'play' : 'lock')}</${open ? 'a' : 'div'}>`;
  }).join('') || `<p class="muted">${esc(t('Lessons will be added soon.'))}</p>`}
  </div>
</section>
${commentsSection(ctx, 'course', c.id, state.comments || [], state.rating)}`;
  return layout(ctx, { title: c.title, desc: c.subtitle || plain(c.description), image: c.cover, body, active: 'courses', bottom: ctaBar(ctx, 'course', c, state) });
}

function lessonPage(ctx, c, lessons, lesson, owned) {
  const { t } = ctx;
  const i = lessons.findIndex((l) => l.id === lesson.id);
  const canOpen = (l) => owned || l.is_preview;
  const prev = lessons.slice(0, i).reverse().find(canOpen);
  const next = lessons.slice(i + 1).find(canOpen);
  const src = embedUrl(lesson.video_url);
  const body = `
<section class="wrap player-wrap">
  <div class="player">
    <a class="crumb" href="/courses/${enc(c.slug)}">${esc(c.title)}</a>
    <div class="video">${src ? `<iframe src="${esc(src)}" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen></iframe>` : `<div class="ph">${icon('play')}</div>`}</div>
    <h1>${esc(lesson.title)}</h1>
    ${lesson.notes ? `<div class="prose">${md(lesson.notes)}</div>` : ''}
    <div class="pn">${prev ? `<a class="btn ghost" href="?lesson=${prev.id}">${esc(t('Previous lesson'))}</a>` : '<span></span>'}
      ${next ? `<a class="btn primary" href="?lesson=${next.id}">${esc(t('Next lesson'))}</a>` : ''}</div>
    ${!owned ? `<div class="upsell">${esc(t('This is a free preview. Buy the course to unlock all lessons.'))} <a class="btn primary" href="/courses/${enc(c.slug)}">${esc(t('Buy the course'))}</a></div>` : ''}
  </div>
  <aside class="curriculum">${lessons.map((l, n) => {
    const open = canOpen(l);
    return `<${open ? `a href="?lesson=${l.id}"` : 'div'} class="lesson ${open ? 'open' : 'locked'} ${l.id === lesson.id ? 'cur' : ''}"><span class="num">${n + 1}</span><span class="lt">${esc(l.title)}</span>${icon(open ? 'play' : 'lock')}</${open ? 'a' : 'div'}>`;
  }).join('')}</aside>
</section>`;
  return layout(ctx, { title: `${lesson.title} — ${c.title}`, body, active: 'courses', chrome: 'nofoot' });
}

function books(ctx, list, owned) {
  const { t } = ctx;
  const body = `${banner(ctx, t('Books'), t('Digital books you can read anywhere'), settings.get('img_books'))}
  <section class="wrap sec">${list.length ? `<div class="grid books">${list.map((b) => bookCard(ctx, b, ownedOf(owned, b.id))).join('')}</div>` : empty(ctx, t('No books yet. Check back soon.'))}</section>`;
  return layout(ctx, { title: t('Books'), body, active: 'books' });
}
function book(ctx, b, state) {
  const { t } = ctx;
  const body = `
<section class="detail-hero"><div class="wrap detail-in">
  <div class="detail-img tall">${img(b.cover, b.title)}</div>
  <div class="detail-text"><a class="crumb" href="/books">${esc(t('Books'))}</a><h1>${esc(b.title)}</h1>${b.subtitle ? `<p class="lead">${esc(b.subtitle)}</p>` : ''}
    <div class="meta-row">${b.coming_soon && !state.owned ? `<span class="soon-pill">${icon('hourglass')} ${esc(t('Coming soon'))}</span>` : ''}${b.pages ? `<span>${icon('book')} ${esc(t('{n} pages', { n: b.pages }))}</span>` : ''}${ratingSummary(ctx, state.rating)}</div>
    ${memberHint(ctx, { ...state, soon: b.coming_soon })}</div>
  ${buyBox(ctx, 'book', b, state)}
</div></section>
${b.coming_soon && !state.owned ? reserveSection(ctx, 'book', b) : ''}
<section class="wrap sec narrow"><div class="prose">${md(b.description)}</div></section>
${commentsSection(ctx, 'book', b.id, state.comments || [], state.rating)}`;
  return layout(ctx, { title: b.title, desc: b.subtitle || plain(b.description), image: b.cover, body, active: 'books', bottom: ctaBar(ctx, 'book', b, state) });
}

function blog(ctx, list) {
  const { t } = ctx;
  const body = `${banner(ctx, t('Blog'), t('Articles about the mind, manipulation and human behaviour'), settings.get('img_blog'))}
  <section class="wrap sec">${list.length ? `<div class="grid list">${list.map((p) => postCard(ctx, p)).join('')}</div>` : empty(ctx, t('No articles yet. Check back soon.'))}</section>`;
  return layout(ctx, { title: t('Blog'), body, active: 'blog' });
}
function post(ctx, p, more, list = []) {
  const { t } = ctx;
  const body = `
<article class="wrap narrow article">
  <a class="crumb" href="/blog">${esc(t('Blog'))}</a>
  <h1>${esc(p.title)}</h1><div class="meta">${esc(fmtDate(ctx, p.published_at || p.created_at))}</div>
  ${p.cover ? `<div class="article-cover">${pimg(p.cover)}</div>` : ''}
  <div class="prose">${md(p.body)}</div>
  <div class="share">${esc(t('Follow Mohamed'))}: ${socialLinks('soc sm')}</div>
</article>
${commentsSection(ctx, 'post', p.id, list, null, false)}
${more.length ? `<section class="wrap sec">${sectionHead(t('More articles'), '', '/blog', t('All articles'))}<div class="grid rail">${more.map((x) => postCard(ctx, x)).join('')}</div></section>` : ''}`;
  return layout(ctx, { title: p.title, desc: p.excerpt || plain(p.body), image: p.cover, body, active: 'blog' });
}

// "Open session" showcase: the sessions have no time limit.
function openSession(ctx) {
  const { t } = ctx;
  return `<div class="open-session">
    <div class="os-art" aria-hidden="true"><svg viewBox="0 0 120 60"><path class="os-track" d="M60 30C70 15 95 15 95 30S70 45 60 30 25 15 25 30 50 45 60 30Z"/>
      <path class="os-flow" pathLength="100" d="M60 30C70 15 95 15 95 30S70 45 60 30 25 15 25 30 50 45 60 30Z"/></svg><span class="os-glow"></span></div>
    <div class="os-text"><span class="os-kicker">${icon('star')} ${esc(t('My special feature'))}</span>
      <h2>${esc(S(ctx, 'consult_open_title'))}</h2><p>${esc(S(ctx, 'consult_open_text'))}</p>
      <ul class="os-points"><li>${icon('infinity')}<span>${esc(t('No time limit'))}</span></li><li>${icon('clock')}<span>${esc(t('No ending hour'))}</span></li>
        <li>${icon('chat')}<span>${esc(t('Talk until you feel at ease'))}</span></li></ul></div>
  </div>`;
}
function tierCards(ctx) {
  const { t } = ctx;
  return `<div class="tiers">${consult.tiers().map((x) => `<a class="tier ${x.k === 'today' ? 'hot' : ''}" href="${loginOr(ctx, `/consultations/book?tier=${x.k}`)}">
      ${x.k === 'today' ? `<span class="tier-tag">${icon('bolt')} ${esc(t('Fastest'))}</span>` : ''}
      <span class="tier-ic">${icon(x.icon)}</span><b class="tier-name">${esc(t(x.label))}</b><span class="tier-sub">${esc(t(x.sub))}</span>
      <span class="tier-price">${esc(price(ctx, x.price))}</span>${openBadge(ctx)}
      <span class="btn ${x.k === 'today' ? 'primary' : 'ghost'} block">${icon('calendar')} ${esc(t('Book now'))}</span></a>`).join('')}</div>`;
}
function consultations(ctx) {
  const { t } = ctx;
  const body = `${banner(ctx, t('Private consultations'), t('A one-to-one session to talk about your situation'), settings.get('img_consult'))}
  <section class="wrap sec">${openSession(ctx)}
  ${consult.tiers().length ? `<h2 class="tiers-h">${esc(t('Choose how soon you want your session'))}</h2>${tierCards(ctx)}` : empty(ctx, t('No consultations available right now.'))}
  <div class="steps">
    <div><b>1</b><span>${esc(t('Choose how soon you want your session'))}</span></div>
    <div><b>2</b><span>${esc(t('Leave your WhatsApp number and complete the payment'))}</span></div>
    <div><b>3</b><span>${esc(t('We contact you on WhatsApp within the time you chose'))}</span></div>
  </div></section>`;
  return layout(ctx, { title: t('Consultations'), body, active: 'consult' });
}
function bookingForm(ctx, q = {}) {
  const { t, user } = ctx;
  const tiers = consult.tiers();
  const pick = tiers.find((x) => x.k === q.tier) || tiers[0];
  const body = `
<section class="wrap narrow sec">
  <a class="crumb" href="/consultations">${esc(t('Consultations'))}</a>
  <div class="checkout">
    <div class="co-item"><div class="consult-ic">${icon('calendar')}</div><div><h1>${esc(t('Private consultation'))}</h1>
      <div class="meta-row">${openBadge(ctx)}<span class="muted small">${esc(t('No time limit — talk as long as you need'))}</span></div></div></div>
    <form class="form" data-api="/api/shop/bookings">
      <h3 class="pay-h">${esc(t('When should we contact you?'))}</h3>
      <div class="pm-list">${tiers.map((x) => `<label class="pm ${x === pick ? 'on' : ''}"><input type="radio" name="tier" value="${x.k}" ${x === pick ? 'checked' : ''} required>
        <span class="pm-ic">${icon(x.icon)}</span><span class="pm-txt"><b>${esc(t(x.label))}</b><span>${esc(t(x.sub))}</span></span>
        <b class="pm-price">${esc(price(ctx, x.price))}</b><span class="pm-dot"></span></label>`).join('')}</div>
      ${phoneField(ctx, { country: user.country, phone: user.phone, label: t('WhatsApp number') })}
      <p class="note" style="margin-top:-8px">${icon('whatsapp')} ${esc(t('We will contact you on this WhatsApp number. Please make sure it is correct.'))}</p>
      <label>${esc(t('What would you like to talk about? (optional)'))}<textarea name="notes" rows="4" maxlength="2000"></textarea></label>
      ${payHint(ctx, 'consultation')}
      <div class="form-error"></div>
      <button class="btn primary block lg" type="submit">${payButtonLabel(ctx, 'consultation')}</button>
    </form>
  </div>
</section>`;
  return layout(ctx, { title: t('Private consultation'), body, active: 'consult' });
}

// ---------------------------------------------------------------------------
// Payment
// ---------------------------------------------------------------------------
const METHOD_INFO = {
  chat: { ic: 'chat', title: 'Pay with our team in the chat', sub: 'We reply with the payment details and activate your order' },
  paypal: { ic: 'paypal', title: 'PayPal', sub: 'Pay with PayPal, then send us a screenshot of the payment' },
  gateway: { ic: 'card', title: 'Pay online now (card or PayPal)', sub: 'Your order is activated automatically right after paying' },
};
// Short note under the order: the chat note when the chat is the only method, otherwise the list of methods.
function payHint(ctx, type) {
  const { t } = ctx;
  if (onlyChat(type)) return `<div class="paynote">${icon('chat')}<p>${esc(S(ctx, 'payment_note'))}</p></div>`;
  return `<div class="pay-methods-mini"><span class="muted small">${esc(t('Payment methods'))}:</span>${payments.methodsFor(type).map((m) => `<span class="pm-mini">${icon(METHOD_INFO[m].ic)} ${esc(t(m === 'gateway' ? 'Card' : m === 'paypal' ? 'PayPal' : 'Chat'))}</span>`).join('')}</div>`;
}
const payButtonLabel = (ctx, type) => (onlyChat(type) ? `${icon('chat')} ${esc(ctx.t('Continue to payment in the chat'))}` : `${icon('lock')} ${esc(ctx.t('Continue to payment'))}`);

function payPage(ctx, order, d) {
  const { t } = ctx;
  const total = money(order.total, order.currency, ctx.lang);
  const head = `<div class="pay-order"><div><span class="meta">${esc(t('Order number'))} #${order.id}</span>
      ${order.items.map((i) => `<h2>${esc(i.title)}</h2>`).join('')}</div><div class="pay-total"><span class="meta">${esc(t('Total'))}</span><b>${esc(total)}</b></div></div>`;
  let inner;
  if (order.status === 'paid') {
    inner = `<div class="pay-done">${icon('check')}<h1>${esc(t('Payment confirmed'))}</h1><p class="muted">${esc(t('Your order is active. Enjoy!'))}</p>
      <a class="btn primary lg" href="/account">${esc(t('Open my account'))}</a></div>${head}`;
  } else if (order.status === 'cancelled') {
    inner = `${head}<div class="paynote">${icon('close')}<p>${esc(t('This order was cancelled.'))}</p></div><a class="btn ghost" href="/">${esc(t('Back to home'))}</a>`;
  } else {
    const ms = d.methods;
    const pick = ms.includes(order.method) ? order.method : order.proof ? 'paypal' : ms[0];
    const proof = order.proof ? `<div class="proof-box">${/\.pdf$/i.test(order.proof.url) ? `<span class="proof-thumb">${icon('article')}</span>` : `<a class="proof-thumb" href="${esc(order.proof.url)}" target="_blank"><img src="${esc(order.proof.url)}" alt=""></a>`}
        <div><b>${icon('check')} ${esc(t('We received your payment screenshot'))}</b><p class="muted small">${esc(t('Our team is checking it now. You will get a message in the chat as soon as your order is active.'))}</p>
        <a class="btn small ghost" href="/chat">${icon('chat')} ${esc(t('Open the chat'))}</a></div></div>` : '';
    const choice = ms.length > 1 ? `<h3 class="pay-h">${esc(t('Choose how to pay'))}</h3><div class="pm-list" role="radiogroup">${ms.map((m) => `<label class="pm ${m === pick ? 'on' : ''}">
        <input type="radio" name="pm" value="${m}" ${m === pick ? 'checked' : ''}><span class="pm-ic ${m}">${icon(METHOD_INFO[m].ic)}</span>
        <span class="pm-txt"><b>${esc(t(METHOD_INFO[m].title))}</b><span>${esc(t(METHOD_INFO[m].sub))}</span></span><span class="pm-dot"></span></label>`).join('')}</div>` : '';
    const panel = (m, html) => (ms.includes(m) ? `<div class="pm-panel" data-pm="${m}" ${m === pick ? '' : 'hidden'}>${html}</div>` : '');
    const chatPanel = `<div class="paynote">${icon('chat')}<p>${esc(S(ctx, 'payment_note'))}</p></div>
      <button class="btn primary block lg" data-pay="chat" data-order="${order.id}">${icon('chat')} ${esc(t('Continue to payment in the chat'))}</button>
      <p class="note center">${esc(t('A message with your order will be ready in the chat — just press send.'))}</p>`;
    const step = (n, title, body) => `<li class="pp-step"><span class="pp-n">${n}</span><div><b>${esc(title)}</b>${body}</div></li>`;
    const ppSend = d.paypalLink
      ? `<p>${esc(t('Press the button. PayPal opens with the amount ready:'))} <b dir="ltr">${esc(total)}</b></p>
         <a class="btn pp-btn block lg" href="${esc(d.paypalLink)}" target="_blank" rel="noopener">${icon('paypal')} ${esc(t('Pay {amount} with PayPal', { amount: total }))}</a>
         ${d.paypalEmail ? `<p class="muted small">${esc(t('Or send it to our PayPal email:'))} <b dir="ltr">${esc(d.paypalEmail)}</b> <button type="button" class="linkish" data-copy="${esc(d.paypalEmail)}">${icon('copy')} ${esc(t('Copy'))}</button></p>` : ''}`
      : `<p>${esc(t('Open PayPal (app or paypal.com) and send exactly {amount} to our PayPal email:', { amount: total }))}</p>
         <div class="copy-row"><b dir="ltr">${esc(d.paypalEmail)}</b><button type="button" class="btn small ghost" data-copy="${esc(d.paypalEmail)}">${icon('copy')} ${esc(t('Copy'))}</button></div>`;
    const ppPanel = `${d.paypalNote ? `<div class="paynote">${icon('paypal')}<p>${esc(d.paypalNote)}</p></div>` : ''}
      <ol class="pp-steps">
        ${step(1, t('Open PayPal'), ppSend)}
        ${step(2, t('Send the payment'), `<p>${esc(t('Log in to PayPal (or pay with a card if PayPal offers it), check that the amount is exactly {amount} and press Send / Pay now.', { amount: total }))}</p>
          <p>${esc(t('If there is a note box, write your order number:'))} <b dir="ltr">#${order.id}</b> <button type="button" class="linkish" data-copy="#${order.id}">${icon('copy')} ${esc(t('Copy'))}</button></p>`)}
        ${step(3, t('Take a screenshot of the success screen'), `<p>${esc(t('When PayPal shows that the payment is complete ("You sent …" / "Payment complete"), take a screenshot of that screen. The amount, date and transaction ID must be clear.'))}</p>
          <ul class="shot-keys"><li><b>Android</b> ${esc(t('Power + Volume down'))}</li><li><b>iPhone</b> ${esc(t('Side button + Volume up'))}</li><li><b>Windows</b> ${esc(t('Windows + Shift + S'))}</li><li><b>Mac</b> ${esc(t('Cmd + Shift + 4'))}</li></ul>`)}
        ${step(4, t('Upload the screenshot here'), `<form class="form proof-form" data-order="${order.id}">
            <label class="drop"><input type="file" name="file" accept="image/*,application/pdf" required><span class="drop-in">${icon('upload')}<b>${esc(order.proof ? t('Choose another screenshot') : t('Choose the screenshot'))}</b><span class="muted small">${esc(t('Image or PDF'))}</span></span><img class="drop-pv" alt="" hidden></label>
            <label>${esc(t('Transaction ID (optional)'))}<input name="txn" dir="ltr" maxlength="80" placeholder="e.g. 8AB12345CD678901E"></label>
            <label>${esc(t('Note (optional)'))}<input name="note" maxlength="500"></label>
            <div class="form-error"></div>
            <button class="btn primary block lg" type="submit">${icon('upload')} ${esc(t('Send the screenshot'))}</button></form>`)}
        ${step(5, t('We confirm and activate your order'), `<p>${esc(t('Our team checks the payment and activates your order, usually within a few hours. You will get a message in the chat.'))}</p>`)}
      </ol>`;
    const gwPanel = `<div class="gw-box">${icon('lock')}<div><b>${esc(t('Secure online payment'))}</b><p class="muted small">${esc(t('You will go to PayPal to pay with your PayPal account or a debit/credit card. Your order is activated automatically right after the payment.'))}</p></div></div>
      ${d.error ? `<div class="form-error">${esc(t('The payment was not completed. Please try again or choose another method.'))}</div>` : ''}
      <button class="btn primary block lg" data-pay="gateway" data-order="${order.id}">${icon('lock')} ${esc(t('Pay {amount} now', { amount: total }))}</button>
      <div class="gw-logos"><span>PayPal</span><span>Visa</span><span>Mastercard</span></div>`;
    inner = `<h1>${esc(t('Complete your payment'))}</h1>${head}${proof}${choice}
      ${panel('gateway', gwPanel)}${panel('paypal', ppPanel)}${panel('chat', chatPanel)}<div class="form-error" data-pay-err></div>`;
  }
  const body = `<section class="wrap narrow sec"><div class="checkout pay">${inner}</div></section>`;
  return layout(ctx, { title: t('Complete your payment'), body });
}

function checkout(ctx, type, item) {
  const { t, user } = ctx;
  const kind = type === 'course' ? t('Course') : type === 'plan' ? t('Membership') : t('Book');
  const body = `
<section class="wrap narrow sec">
  <div class="checkout">
    <h1>${esc(t('Complete your order'))}</h1>
    <div class="co-item"><div class="co-img ${type === 'book' ? 'tall' : ''}">${type === 'plan' ? `<div class="ph">${icon('crown')}</div>` : img(item.cover, item.title)}</div>
      <div><span class="meta">${esc(kind)}</span><h2>${esc(item.title)}</h2>${priceHtml(ctx, item)}
      ${type === 'plan' ? `<div class="muted small">${esc(t('Access to all courses and books for {n} month(s)', { n: item.months }))}</div>` : ''}</div></div>
    <div class="co-user"><h3>${esc(t('Your details'))}</h3>
      <div>${icon('user')} ${esc(user.name)}</div>${user.email ? `<div dir="ltr">${esc(user.email)}</div>` : ''}<div dir="ltr">${esc(countries.format(user.phone, user.country) || '')}</div>
      <a class="muted small" href="/account#profile">${esc(t('Edit my details'))}</a></div>
    ${payHint(ctx, type)}
    <div class="form-error"></div>
    <button class="btn primary block lg" data-buy="${type}" data-id="${item.id}">${payButtonLabel(ctx, type)}</button>
    ${onlyChat(type) ? `<p class="note center">${esc(t('A message with your order will be ready in the chat — just press send.'))}</p>` : ''}
  </div>
</section>`;
  return layout(ctx, { title: t('Complete your order'), body });
}

function authPage(ctx, mode, q) {
  const { t } = ctx;
  const next = q.next && /^\/[^/]/.test(q.next) ? q.next : '';
  const nextQ = next ? `?next=${enc(next)}` : '';
  let inner = '';
  if (mode === 'login') {
    inner = `<h1>${esc(t('Welcome back'))}</h1><p class="muted">${esc(t('Log in to continue'))}</p>
    <form class="form" data-api="/api/auth/login" data-next="${esc(next)}">
      <label>${esc(t('Email or phone'))}<input name="login" autocomplete="username" required dir="ltr"></label>
      <label>${esc(t('Password'))}<input name="password" type="password" autocomplete="current-password" required dir="ltr"></label>
      ${rememberBox(ctx)}
      <div class="form-error"></div>
      <button class="btn primary block lg" type="submit">${esc(t('Log in'))}</button>
    </form>
    <div class="auth-links"><a href="/forgot">${esc(t('Forgot your password?'))}</a>
      <span>${esc(t('New here?'))} <a href="/register${nextQ}"><b>${esc(t('Create an account'))}</b></a></span></div>`;
  } else if (mode === 'register') {
    const g = ctx.user && ctx.user.is_guest ? ctx.user : {};
    inner = `<h1>${esc(t('Create your account'))}</h1><p class="muted">${esc(t('It takes less than a minute'))}</p>
    ${g.id ? `<p class="devcode">${esc(t('Use the same phone number and your previous chats will be linked to your new account.'))}</p>` : ''}
    <form class="form" data-api="/api/auth/register" data-next="${esc(next)}">
      <label>${esc(t('Full name'))}<input name="name" autocomplete="name" required maxlength="100" value="${esc(g.name || '')}"></label>
      ${phoneField(ctx, { country: g.country, phone: g.phone })}
      <label>${esc(t('Email (optional)'))}<input name="email" type="email" autocomplete="email" dir="ltr"></label>
      <label>${esc(t('Password'))}<input name="password" type="password" autocomplete="new-password" minlength="6" required dir="ltr"></label>
      ${rememberBox(ctx)}
      <div class="form-error"></div>
      <button class="btn primary block lg" type="submit">${esc(t('Create account'))}</button>
    </form>
    <div class="auth-links"><span>${esc(t('Already have an account?'))} <a href="/login${nextQ}"><b>${esc(t('Log in'))}</b></a></span></div>`;
  } else if (mode === 'verify') {
    inner = `<div class="auth-ic">${icon('check')}</div><h1>${esc(t('Check your email'))}</h1>
    <p class="muted">${esc(t('We sent a 6-digit code to'))} <b dir="ltr">${esc(q.email || '')}</b></p>
    ${q.dev ? `<p class="devcode">${esc(t('Testing mode (email not set up yet) — your code is:'))} <b dir="ltr">${esc(q.dev)}</b></p>` : ''}
    <form class="form" data-api="/api/auth/verify" data-next="${esc(next)}">
      <input type="hidden" name="email" value="${esc(q.email || '')}">
      <input type="hidden" name="remember" value="${q.remember === '0' ? '0' : '1'}">
      <input class="code" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required dir="ltr" placeholder="••••••">
      <div class="form-error"></div>
      <button class="btn primary block lg" type="submit">${esc(t('Verify'))}</button>
    </form>
    <div class="auth-links"><button class="linkish" data-resend="verify" data-email="${esc(q.email || '')}">${esc(t('Send a new code'))}</button></div>`;
  } else if (mode === 'forgot') {
    inner = `<h1>${esc(t('Reset your password'))}</h1>
    <form class="form" data-api="/api/auth/forgot" data-step="1">
      <p class="muted">${esc(t('Enter your email and we will send you a code.'))}</p>
      <p class="muted small">${esc(t('No email on your account?'))} <a href="/chat">${esc(t('Message us in the chat and we will help you.'))}</a></p>
      <label>${esc(t('Email'))}<input name="email" type="email" required dir="ltr"></label>
      <div class="form-error"></div>
      <button class="btn primary block lg" type="submit">${esc(t('Send code'))}</button>
    </form>
    <form class="form" data-api="/api/auth/reset" data-step="2" data-next="/account" hidden>
      <p class="devcode" hidden></p>
      <input type="hidden" name="email">
      <label>${esc(t('Code from the email'))}<input class="code" name="code" inputmode="numeric" maxlength="6" required dir="ltr" placeholder="••••••"></label>
      <label>${esc(t('New password'))}<input name="password" type="password" minlength="6" required dir="ltr" autocomplete="new-password"></label>
      <div class="form-error"></div>
      <button class="btn primary block lg" type="submit">${esc(t('Save new password'))}</button>
    </form>
    <div class="auth-links"><a href="/login">${esc(t('Back to log in'))}</a></div>`;
  }
  const body = `<section class="auth-wrap"><div class="auth-card">${inner}</div></section>`;
  return layout(ctx, { title: t(mode === 'register' ? 'Create your account' : mode === 'forgot' ? 'Reset your password' : 'Log in'), body, chrome: 'nofoot' });
}

function account(ctx, d) {
  const { t, user } = ctx;
  const statusLabel = {
    pending: t('Waiting for payment'), paid: t('Paid'), cancelled: t('Cancelled'),
    pending_payment: t('Waiting for payment'), scheduled: t('Scheduled'), done: t('Completed'),
  };
  const body = `
<section class="wrap sec account">
  <div class="acc-head"><div><h1>${esc(t('Hello, {name}', { name: user.name.split(' ')[0] }))}</h1><p class="muted" dir="ltr">${esc(user.email || countries.format(user.phone, user.country) || '')}</p></div>
    <a class="btn primary" href="/chat">${icon('chat')} ${esc(t('Open the chat'))}</a></div>
  ${d.memberUntil ? memberStatus(ctx, d.memberUntil) : `<a class="member-hint" href="/membership">${icon('crown')} <span>${esc(t('Get every course and book with one membership'))}</span></a>`}

  <div class="seg" role="tablist">
    <button data-tab="courses" class="on">${icon('school')}<span>${esc(t('My courses'))}</span></button>
    <button data-tab="books">${icon('book')}<span>${esc(t('My books'))}</span></button>
    <button data-tab="consult">${icon('calendar')}<span>${esc(t('My consultations'))}</span></button>
    <button data-tab="orders">${icon('check')}<span>${esc(t('My orders'))}</span></button>
    <button data-tab="profile">${icon('user')}<span>${esc(t('My details'))}</span></button>
  </div>
  <div class="tab-sec" data-sec="courses">
  <h2>${esc(t('My courses'))}</h2>
  ${d.courses.length ? `<div class="grid list">${d.courses.map((c) => courseCard(ctx, c, true)).join('')}</div>` : `<p class="muted">${esc(t('You have no courses yet.'))} <a href="/courses">${esc(t('Browse courses'))}</a></p>`}

  </div><div class="tab-sec" data-sec="books" hidden>
  <h2>${esc(t('My books'))}</h2>
  ${d.books.length ? `<div class="grid books">${d.books.map((b) => bookCard(ctx, b, true)).join('')}</div>` : `<p class="muted">${esc(t('You have no books yet.'))} <a href="/books">${esc(t('Browse books'))}</a></p>`}

  </div><div class="tab-sec" data-sec="consult" hidden>
  <h2>${esc(t('My consultations'))}</h2>
  ${d.bookings.length ? `<div class="list">${d.bookings.map((b) => `<div class="li"><div><b>${esc(b.title || '')}</b>
      <div class="muted small">${b.scheduled_at ? `${icon('calendar')} ${esc(fmtDateTime(ctx, b.scheduled_at))}` : b.tier ? `${esc(t((consult.tier(b.tier) || {}).sub || ''))}` : esc(t('Preferred: {when}', { when: [b.preferred_date, b.preferred_time].filter(Boolean).join(' ') }))}</div>
      ${b.meeting_link && ['scheduled', 'paid'].includes(b.status) ? `<a href="${esc(b.meeting_link)}" target="_blank" rel="noopener">${esc(t('Join the meeting'))}</a>` : ''}</div>
      <span class="pill ${esc(b.status)}">${esc(statusLabel[b.status] || b.status)}</span></div>`).join('')}</div>`
    : `<p class="muted">${esc(t('No consultations yet.'))} <a href="/consultations">${esc(t('Book one'))}</a></p>`}

  </div><div class="tab-sec" data-sec="orders" hidden>
  <h2>${esc(t('My orders'))}</h2>
  ${d.orders.length ? `<div class="list">${d.orders.map((o) => `<div class="li"><div><b>#${o.id}</b> · ${esc(o.items || '')}
      <div class="muted small">${esc(fmtDate(ctx, o.created_at))} · ${esc(money(o.total, o.currency, ctx.lang))}</div></div>
      <div class="li-end"><span class="pill ${esc(o.status === 'pending' && o.proof ? 'review' : o.status)}">${esc(o.status === 'pending' && o.proof ? t('Under review') : statusLabel[o.status] || o.status)}</span>
      ${o.status === 'pending' ? `<a class="btn small" href="/pay/${o.id}">${esc(t('Complete payment'))}</a>` : ''}</div></div>`).join('')}</div>`
    : `<p class="muted">${esc(t('No orders yet.'))}</p>`}

  </div><div class="tab-sec" data-sec="profile" hidden>
  <h2 id="profile">${esc(t('My details'))}</h2>
  <div class="two-forms">
    <form class="form card-form" data-api="/api/auth/profile" data-done="${esc(t('Saved'))}">
      <label>${esc(t('Full name'))}<input name="name" value="${esc(user.name)}" required></label>
      ${phoneField(ctx, { country: user.country, phone: user.phone })}
      <label>${esc(t('Email (optional)'))}<input name="email" type="email" autocomplete="email" dir="ltr" value="${esc(user.email || '')}"></label>
      <div class="form-error"></div><button class="btn primary" type="submit">${esc(t('Save'))}</button>
    </form>
    <form class="form card-form" data-api="/api/auth/password" data-done="${esc(t('Password changed'))}" data-reset>
      <label>${esc(t('Current password'))}<input name="current" type="password" required dir="ltr"></label>
      <label>${esc(t('New password'))}<input name="next" type="password" minlength="6" required dir="ltr"></label>
      <div class="form-error"></div><button class="btn ghost" type="submit">${esc(t('Change password'))}</button>
    </form>
  </div>
  <p><button class="btn ghost" data-logout>${esc(t('Log out'))}</button></p>
  </div>
</section>`;
  return layout(ctx, { title: t('My account'), body });
}

function chatEntry(ctx, q) {
  const { t } = ctx;
  const logo = settings.get('img_logo');
  const body = `<section class="auth-wrap"><div class="auth-card">
    <div class="auth-ic ${logo ? 'has-logo' : ''}">${logo ? pimg(logo) : icon('chat')}</div>
    <h1>${esc(t('Chat with us'))}</h1>
    <p class="muted">${esc(t('Write your name and phone number to start. Use the same number next time to see your previous messages.'))}</p>
    <form class="form" data-api="/api/auth/chat-start" data-next="/chat">
      <label>${esc(t('Full name'))}<input name="name" autocomplete="name" required maxlength="100"></label>
      ${phoneField(ctx, {})}
      ${rememberBox(ctx)}
      <div class="form-error"></div>
      <button class="btn primary block lg" type="submit">${icon('chat')} ${esc(t('Start chatting'))}</button>
    </form>
    <div class="auth-links"><span>${esc(t('Already have an account?'))} <a href="/login?next=/chat"><b>${esc(t('Log in'))}</b></a></span></div>
  </div></section>`;
  return layout(ctx, { title: t('Chat with us'), body, chrome: 'nofoot' });
}

function chatPage(ctx, draft, orderId) {
  const { t, user } = ctx;
  const logo = settings.get('img_logo');
  const data = { me: { id: user.id, name: user.name, is_guest: !!user.is_guest }, company: S(ctx, 'site_name'), logo, draft: draft || '', orderId: orderId || null };
  const body = `<div class="chat-shell">
    <header class="chat-head site-chat-head">
      <a class="icon-btn back" href="/" aria-label="${esc(t('Back'))}">${icon('arrow', 'back')}</a>
      <div class="chat-logo ${logo ? 'has-logo' : ''}">${logo ? pimg(logo) : icon('brain')}</div>
      <div class="who"><div class="name">${esc(data.company)}</div><div class="status" id="coStatus"></div></div>
      <div class="actions">${user.is_guest
    ? `<a class="btn small" href="/register?next=/chat" style="margin-inline-end:6px">${esc(t('Create account'))}</a><button class="icon-btn" data-logout title="${esc(t('Not you? Log out'))}">${icon('close')}</button>`
    : `<a class="icon-btn" href="/account" title="${esc(t('My account'))}">${icon('user')}</a>`}</div>
    </header>
    <div id="cv"></div>
  </div>
  <script id="chatData" type="application/json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
  return layout(ctx, {
    title: t('Chat'), body, bodyClass: 'chat-page', chrome: false,
    head: `<link rel="stylesheet" href="/styles.css?v=${VER}">`,
    scripts: `<script src="/socket.io/socket.io.js"></script><script src="/common.js?v=${VER}"></script><script src="/chat-page.js?v=${VER}"></script>`,
  });
}

function adminShell(ctx) {
  const name = S(ctx, 'site_name');
  const boot = { lang: ctx.lang, siteName: name, logo: settings.get('img_logo'), currency: settings.get('currency') };
  return `<!doctype html>
<html lang="${ctx.lang}" dir="${ctx.lang === 'ar' ? 'rtl' : 'ltr'}" data-tone="${settings.isLight() ? 'light' : 'dark'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">
<title>${esc(ctx.t('Dashboard'))} | ${esc(name)}</title>
<meta name="robots" content="noindex">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=El+Messiri:wght@500;600;700&display=swap" rel="stylesheet">
<style id="themeVars">${settings.themeCss()}</style>
<link rel="stylesheet" href="/styles.css?v=${VER}">
<link rel="stylesheet" href="/admin.css?v=${VER}">
</head>
<body class="admin-body">
<div id="app"></div>
<script id="bootData" type="application/json">${JSON.stringify(boot).replace(/</g, String.fromCharCode(92) + 'u003c')}</script>
<script src="/locales.js?v=${VER}"></script>
<script src="/md.js?v=${VER}"></script>
<script src="/socket.io/socket.io.js"></script>
<script src="/common.js?v=${VER}"></script>
<script src="/countries.js?v=${VER}"></script>
<script src="/imgpos.js?v=${VER}"></script>
<script src="/admin-core.js?v=${VER}"></script>
<script src="/admin-inbox.js?v=${VER}"></script>
<script src="/admin-content.js?v=${VER}"></script>
<script src="/admin-ops.js?v=${VER}"></script>
</body>
</html>`;
}

function membership(ctx, d) {
  const { t } = ctx;
  const best = d.plans.length ? d.plans.reduce((a, b) => (Number(b.price) / b.months < Number(a.price) / a.months ? b : a)) : null;
  const body = `${banner(ctx, t('Membership'), t('One subscription. Every course and every book.'), settings.get('img_courses'))}
  <section class="wrap sec">
    ${memberStatus(ctx, d.memberUntil)}
    <div class="perks">
      <div>${icon('school')}<b>${esc(t('{n} courses', { n: d.counts.courses }))}</b><span>${esc(t('Watch every lesson'))}</span></div>
      <div>${icon('book')}<b>${esc(t('{n} books', { n: d.counts.books }))}</b><span>${esc(t('Read and download'))}</span></div>
      <div>${icon('check')}<b>${esc(t('New content'))}</b><span>${esc(t('Everything we add is included'))}</span></div>
      <div>${icon('chat')}<b>${esc(t('Easy payment'))}</b><span>${esc(t('Pay with our team in the chat'))}</span></div>
    </div>
    ${d.plans.length ? `<div class="plans">${d.plans.map((p) => planCard(ctx, p, best && p.id === best.id)).join('')}</div>` : empty(ctx, t('Plans will be available soon.'))}
    <p class="note center">${esc(t('No automatic renewal. When your membership ends, you can renew whenever you like, and the new time is added to what is left.'))}</p>
  </section>`;
  return layout(ctx, { title: t('Membership'), body, active: 'member' });
}
function reviews(ctx, list, rating) {
  const { t } = ctx;
  const body = `${banner(ctx, t('What people say'), t('Real opinions from people who learned with Mohamed'))}
  <section class="wrap sec">
    ${ratingSummary(ctx, rating)}
    ${list.length ? `<div class="tgrid-all">${list.map((c) => commentCard(ctx, c, { quote: true })).join('')}</div>` : `<p class="muted">${esc(t('No reviews yet. Be the first!'))}</p>`}
  </section>
  <section class="wrap sec narrow">${commentForm(ctx, 'site', 0, true)}</section>`;
  return layout(ctx, { title: t('Reviews'), body, active: 'reviews' });
}

// ---------------------------------------------------------------------------
// Hidden "link in bio" page (/p/<secret link>) - a standalone page, edited in Admin > Link page.
// ---------------------------------------------------------------------------
const LP_SOCIAL_NAMES = { youtube: 'YouTube', tiktok: 'TikTok', instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn', x: 'X', whatsapp: 'WhatsApp', telegram: 'Telegram', email: 'Email', phone: 'Phone', website: 'Website' };
const LP_ICON = { website: 'globe' };
function linkPage(ctx, d, url) {
  const site = S(ctx, 'site_name');
  const logo = settings.get('img_logo');
  const name = d.name || site;
  const ext = (u) => (/^(https?:|mailto:|tel:)/i.test(u) ? ' target="_blank" rel="noopener"' : '');
  const abs = (u) => (/^\//.test(u) ? `${url.origin}${u}` : u);
  const links = d.links.filter((l) => l.visible);
  const cover = d.image ? ImgPos.parse(d.image) : null;
  return `<!doctype html>
<html lang="${d.dir === 'rtl' ? 'ar' : 'en'}" dir="${d.dir}" data-tone="${settings.isLight() ? 'light' : 'dark'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(name)}</title>
<meta name="robots" content="noindex, nofollow">
<meta name="description" content="${esc(d.bio || '')}">
<meta property="og:title" content="${esc(name)}"><meta property="og:description" content="${esc(d.bio || '')}">
${cover ? `<meta property="og:image" content="${esc(abs(cover.src))}">` : ''}
<meta name="theme-color" content="${settings.theme().bg}">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=El+Messiri:wght@600;700&display=swap" rel="stylesheet">
<style>${settings.themeCss()}</style>
<link rel="stylesheet" href="/link.css?v=${VER}">
</head>
<body class="lp">
${cover ? `<div class="lp-backdrop" style="background-image:url('${esc(cover.src)}')"></div>` : '<div class="lp-backdrop plain"></div>'}
<main class="lp-card">
  <header class="lp-hero ${cover ? '' : 'no-img'}">
    ${cover ? pimg(d.image, name, 'fetchpriority="high" decoding="async"') : ''}
    <div class="lp-fade"></div>
    ${d.show_logo ? `<a class="lp-chip lp-logo" href="/" aria-label="${esc(site)}">${logo ? logoTag(logo) : icon('brain')}</a>` : ''}
    <button class="lp-chip lp-share" type="button" data-share="${esc(url.href)}" data-title="${esc(name)}" aria-label="Share">${icon('share')}</button>
  </header>
  <section class="lp-body">
    <h1>${esc(name)}</h1>
    ${d.bio ? `<p class="lp-bio">${esc(d.bio)}</p>` : ''}
    ${d.socials.length ? `<nav class="lp-social">${d.socials.map((x) => `<a href="${esc(x.type === 'youtube' && x.url === settings.get('social_youtube') ? settings.socialLink('youtube') : x.url)}"${ext(x.url)} aria-label="${esc(LP_SOCIAL_NAMES[x.type] || x.type)}" title="${esc(LP_SOCIAL_NAMES[x.type] || x.type)}">${icon(LP_ICON[x.type] || x.type)}</a>`).join('')}</nav>` : ''}
    ${d.heading ? `<h2 class="lp-heading">${esc(d.heading)}</h2>` : ''}
    <div class="lp-links">${links.map((l, i) => `<div class="lp-link ${l.highlight ? 'hl' : ''}" style="--i:${i}">
      <a class="lp-a" href="${esc(l.url)}"${ext(l.url)}>
        <span class="lp-thumb">${l.image ? pimg(l.image, '') : icon(/\/chat/.test(l.url) ? 'chat' : 'arrow', /\/chat/.test(l.url) ? '' : 'flip')}</span>
        <span class="lp-title">${esc(l.title)}</span>
      </a>
      <button class="lp-more" type="button" data-share="${esc(abs(l.url))}" data-title="${esc(l.title)}" aria-label="Share">${icon('dots')}</button>
    </div>`).join('')}</div>
    <footer class="lp-foot"><a href="/">${esc(site)}</a></footer>
  </section>
</main>
<div class="lp-toast" hidden></div>
<script>
(function () {
  var toast = document.querySelector('.lp-toast');
  function say(msg) { toast.textContent = msg; toast.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(function () { toast.hidden = true; }, 2200); }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-share]');
    if (!b) return;
    var url = b.getAttribute('data-share'); var title = b.getAttribute('data-title') || document.title;
    if (navigator.share) { navigator.share({ title: title, url: url }).catch(function () {}); return; }
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { say(${JSON.stringify(ctx.t('Link copied'))}); }, function () { prompt('', url); });
  });
})();
</script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Book reader (view only): pages are drawn on the screen with PDF.js, with no download / print button.
// ---------------------------------------------------------------------------
function reader(ctx, b) {
  const { t, user, lang } = ctx;
  const mark = [user.name, user.phone ? countries.format(user.phone, user.country) : ''].filter(Boolean).join(' · ');
  const data = { pdf: `/books/${enc(b.slug)}/pdf`, mark, t: { page: t('Page'), of: t('of'), error: t('The book file could not be opened. Please tell us in the chat.'), loading: t('Opening the book…') } };
  return `<!doctype html>
<html lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}" data-tone="${settings.isLight() ? 'light' : 'dark'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(b.title)}</title>
<meta name="robots" content="noindex, nofollow">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>${settings.themeCss()}</style>
<link rel="stylesheet" href="/reader.css?v=${VER}">
</head>
<body class="rd" oncontextmenu="return false">
<header class="rd-bar">
  <a class="rd-btn" href="/books/${enc(b.slug)}" aria-label="${esc(t('Back'))}">${icon('arrow', 'back')}</a>
  <div class="rd-title"><b>${esc(b.title)}</b><span id="rdPage">${esc(data.t.loading)}</span></div>
  <div class="rd-tools">
    <button class="rd-btn" id="rdOut" aria-label="-" title="-"><svg class="ic" viewBox="0 0 24 24"><path d="M19 13H5v-2h14v2z"/></svg></button>
    <span class="rd-zoom" id="rdZoom">100%</span>
    <button class="rd-btn" id="rdIn" aria-label="+" title="+"><svg class="ic" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg></button>
    <button class="rd-btn" id="rdFull" aria-label="Full screen"><svg class="ic" viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg></button>
  </div>
  <div class="rd-progress"><span id="rdBar"></span></div>
</header>
<main class="rd-pages" id="rdPages"><div class="rd-loading"><span class="rd-spin"></span><p>${esc(data.t.loading)}</p></div></main>
<script id="rdData" type="application/json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
<script src="/reader.js?v=${VER}"></script>
</body>
</html>`;
}

function empty(ctx, text) { return `<div class="empty">${icon('brain')}<p>${esc(text)}</p></div>`; }
function notFound(ctx) {
  const { t } = ctx;
  return layout(ctx, { title: t('Page not found'), body: `<section class="wrap sec">${empty(ctx, t('This page does not exist.'))}<p class="center"><a class="btn primary" href="/">${esc(t('Back to home'))}</a></p></section>` });
}

module.exports = {
  VER, adminShell, chatEntry, payPage, linkPage, reader, membership, reviews, home, courses, course, lessonPage, books, book, blog, post, consultations, bookingForm, checkout, authPage, account, chatPage, notFound, layout,
};
