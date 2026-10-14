/* Admin panel - core: layout, navigation, form fields, media library, dashboard. */
(function () {
  'use strict';
  const { esc, toast, openModal, makeApi, T } = WA;
  const BOOT = JSON.parse(document.getElementById('bootData').textContent);
  const LOC = BOOT.lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB';
  const api = makeApi(() => null, () => { location.href = '/login?next=/admin'; });

  // ---- extra icons ----
  const P = {
    receipt: 'M18 17H6v-2h12v2zm0-4H6v-2h12v2zm0-4H6V7h12v2zM3 22l1.5-1.5L6 22l1.5-1.5L9 22l1.5-1.5L12 22l1.5-1.5L15 22l1.5-1.5L18 22l1.5-1.5L21 22V2l-1.5 1.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2 4.5 3.5 3 2v20z',
    event: 'M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z',
    school: 'M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z',
    book: 'M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z',
    article: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z',
    palette: 'M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
    shield: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z',
    menu: 'M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z',
    external: 'M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z',
    upload: 'M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z',
    refresh: 'M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z',
    pin: 'M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z',
    eyeoff: 'M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z',
    crown: 'M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z',
    comment: 'M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z',
    share: 'M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z',
    up: 'M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z',
    globe: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2z',
    facebook: 'M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.5h-2.8V24C19.62 23.1 24 18.1 24 12.07',
    youtube: 'M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.87.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81zM9.55 15.57V8.43L15.82 12l-6.27 3.57z',
    instagram: 'M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85C2.38 3.92 3.9 2.38 7.15 2.23 8.42 2.17 8.8 2.16 12 2.16zM12 0C8.74 0 8.33.01 7.05.07 2.7.27.27 2.69.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.2 4.36 2.62 6.78 6.98 6.98C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c4.35-.2 6.78-2.62 6.98-6.98.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.2-4.35-2.62-6.78-6.98-6.98C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.41-11.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z',
    linkedin: 'M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zm1.78 13.02H3.56V9h3.56v11.45zM22.23 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0h.01z',
    x: 'M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93zm-1.29 19.5h2.04L6.49 3.24H4.3l13.31 17.41z',
    whatsapp: 'M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.31l-.34-.2-3.56.93.95-3.47-.22-.36a9.4 9.4 0 0 1-1.44-5.02c0-5.2 4.23-9.43 9.44-9.43 2.52 0 4.89.98 6.67 2.77a9.37 9.37 0 0 1 2.76 6.67c0 5.2-4.24 9.43-9.45 9.43zM20.08 3.9A11.32 11.32 0 0 0 12.05.58C5.79.58.7 5.67.7 11.92c0 2 .52 3.95 1.52 5.67L.6 23.5l6.05-1.59a11.3 11.3 0 0 0 5.4 1.38h.01c6.25 0 11.34-5.09 11.34-11.34 0-3.03-1.18-5.88-3.32-8.02z',
    telegram: 'M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z',
    email: 'M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z',
    phone: 'M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z',
    card: 'M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z',
    paypal: 'M7.08 21.6H3.55a.6.6 0 0 1-.6-.69L5.86 2.5A.93.93 0 0 1 6.78 1.7h6.06c3.95 0 6.17 1.9 5.6 5.28-.6 3.62-3.1 5.4-6.6 5.4H9.98a.9.9 0 0 0-.9.77l-.98 6.18-.12.79a1 1 0 0 1-.9.83zm12.4-14.06c-.05.3-.1.6-.17.92-.95 4.86-4.2 6.54-8.36 6.54h-.62a1.03 1.03 0 0 0-1.02.87l-.86 5.42-.24 1.54a.54.54 0 0 0 .53.62h3.73a.9.9 0 0 0 .89-.76l.04-.19.7-4.46.05-.25a.9.9 0 0 1 .89-.76h.56c3.63 0 6.47-1.47 7.3-5.73.35-1.78.17-3.26-.75-4.31a3.6 3.6 0 0 0-1.03-.8l-.64-.66z',
    copy: 'M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z',
    hourglass: 'M6 2v6h.01L6 8.01 10 12l-4 4 .01.01H6V22h12v-5.99h-.01L18 16l-4-4 4-3.99-.01-.01H18V2H6zm10 14.5V20H8v-3.5l4-4 4 4zm-4-5l-4-4V4h8v3.5l-4 4z',
    link: 'M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z',
    tiktok: 'M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
  };
  const ic = (name, cls = '') => (name === 'back' ? WA.icon('back', `${cls} flip-rtl`) : P[name] ? `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${P[name]}"/></svg>` : WA.icon(name, cls));

  // ---- helpers ----
  const money = (v) => {
    const n = Number(v) || 0;
    const cur = { EGP: BOOT.lang === 'ar' ? 'ج.م' : 'EGP', USD: '$', SAR: BOOT.lang === 'ar' ? 'ر.س' : 'SAR', AED: BOOT.lang === 'ar' ? 'د.إ' : 'AED' }[ADM.currency] || ADM.currency;
    return n ? `${n.toLocaleString(LOC, { maximumFractionDigits: 2 })} ${cur}` : T('Free');
  };
  const date = (ts) => (ts ? new Date(Number(ts)).toLocaleDateString(LOC, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
  const dateTime = (ts) => (ts ? new Date(Number(ts)).toLocaleString(LOC, { dateStyle: 'medium', timeStyle: 'short' }) : '—');
  const toLocalInput = (ms) => { if (!ms) return ''; const d = new Date(Number(ms)); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
  const fromLocalInput = (v) => (v ? new Date(v).getTime() : null);
  // Countries: flag image (works on Windows too), localized name, readable phone.
  const C = window.Countries;
  const flag = (iso) => (iso && iso !== '--' ? `<img class="flag" src="https://flagcdn.com/20x15/${esc(iso.toLowerCase())}.png" alt="${esc(iso)}" width="20" height="15" loading="lazy">` : '🌐');
  const countryName = (iso) => (iso && iso !== '--' ? C.name(iso, BOOT.lang) : T('Unknown'));
  const fmtPhone = (phone, iso) => C.format(phone, iso);
  const post = (url, body) => api(url, { method: 'POST', body: body || {} });
  const put = (url, body) => api(url, { method: 'PUT', body });
  const del = (url) => api(url, { method: 'DELETE' });

  async function uploadTo(url, file) {
    const fd = new FormData();
    fd.append('file', file, file.name);
    const res = await fetch(url, { method: 'POST', body: fd, headers: { 'X-Requested-With': 'fetch' } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || T('Upload failed'));
    return data;
  }
  function pickFile(accept) {
    return new Promise((resolve) => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = accept || '';
      inp.onchange = () => resolve(inp.files[0] || null);
      inp.click();
    });
  }

  // ---- media library ----
  async function mediaPicker() {
    return new Promise((resolve) => {
      let chosen = null;
      const m = openModal(`<h2>${esc(T('Image library'))}</h2>
        <p class="sub">${esc(T('Choose an image, or upload a new one.'))}</p>
        <button class="btn" data-up>${ic('upload', 'sm')} ${esc(T('Upload new image'))}</button>
        <div class="media-grid"><div class="empty">${esc(T('Loading…'))}</div></div>
        <div class="actions"><button class="btn ghost" data-close>${esc(T('Close'))}</button></div>`, { onClose: () => resolve(chosen) });
      m.el.classList.add('wide');
      const grid = m.el.querySelector('.media-grid');
      const load = async () => {
        const items = (await api('/api/admin/media')).filter((x) => /^image\//.test(x.mime || '') || /\.(png|jpe?g|gif|webp|svg)$/i.test(x.url));
        grid.innerHTML = items.length ? items.map((x) => `<button type="button" data-url="${esc(x.url)}" style="background-image:url('${esc(x.url)}')" title="${esc(x.name || '')}"><span class="del" data-del="${x.id}" title="${esc(T('Delete'))}">×</span></button>`).join('')
          : `<div class="empty">${esc(T('No images yet. Upload the first one.'))}</div>`;
      };
      load().catch((e) => toast(e.message));
      grid.addEventListener('click', async (e) => {
        const d = e.target.closest('[data-del]');
        if (d) {
          e.stopPropagation();
          if (await WA.confirmDialog(T('Delete image?'), T('If this image is used somewhere on the site it will disappear from there.'), T('Delete'), true)) { await del(`/api/admin/media/${d.dataset.del}`); load(); }
          return;
        }
        const b = e.target.closest('[data-url]');
        if (b) { chosen = b.dataset.url; m.close(); }
      });
      m.el.querySelector('[data-up]').onclick = async () => {
        const f = await pickFile('image/*');
        if (!f) return;
        try { const r = await uploadTo('/api/admin/media', f); chosen = r.url; m.close(); } catch (e) { toast(e.message); }
      };
    });
  }

  // ---- image position editor: drag to choose what shows, slider to zoom ----
  const IP = window.ImgPos;
  const imgStyle = (value, fit = 'cover') => `object-fit:${fit};${IP.style(value)}`;
  function posEditor(value, { aspects = ['16/10'], fit = 'cover', round = false } = {}) {
    return new Promise((resolve) => {
      const p = IP.parse(value);
      let { x, y, z } = p;
      let result = null;
      const minZ = fit === 'contain' ? 0.5 : 1;
      const ratio = (a) => { const [w, h] = a.split('/').map(Number); return w / (h || 1); };
      const frame = (a, i) => `<div class="pos-frame ${i ? 'mini' : 'main'} ${round && !i ? 'round' : ''}" style="aspect-ratio:${a};${i ? '' : `width:min(100%, calc(56vh * ${ratio(a)}))`}"><img src="${esc(p.src)}" alt="" draggable="false"></div>`;
      const m = openModal(`<h2>${esc(T('Adjust image position'))}</h2>
        <p class="sub">${esc(T('Drag the picture to choose what shows. Use the slider (or the mouse wheel) to zoom.'))}</p>
        <div class="pos-wrap"><div class="pos-stage">${frame(aspects[0], 0)}<div class="pos-cross"></div></div>
          ${aspects.length > 1 ? `<div class="pos-side"><div class="muted small">${esc(T('On other screens it looks like this:'))}</div>${aspects.slice(1).map((a, i) => frame(a, i + 1)).join('')}</div>` : ''}</div>
        <label class="pos-zoom">🔍 <input type="range" min="${minZ}" max="3" step="0.01" value="${z}"><span class="pos-zv"></span></label>
        <div class="actions"><button class="btn ghost" data-center>${esc(T('Center'))}</button><span class="spacer"></span>
          <button class="btn ghost" data-close>${esc(T('Cancel'))}</button><button class="btn" data-ok>${esc(T('Save'))}</button></div>`, { onClose: () => resolve(result) });
      m.el.classList.add('wide', 'pos-modal');
      const imgs = m.el.querySelectorAll('.pos-frame img');
      const range = m.el.querySelector('input[type=range]');
      const zv = m.el.querySelector('.pos-zv');
      const draw = () => {
        imgs.forEach((im) => { im.style.cssText = imgStyle({ x, y, z }, fit); });
        range.value = z; zv.textContent = `${Math.round(z * 100)}%`;
      };
      const main = m.el.querySelector('.pos-frame.main');
      let start = null;
      const sign = fit === 'contain' ? 1 : -1; // "cover": dragging right shows more of the left side
      main.addEventListener('pointerdown', (e) => { start = { px: e.clientX, py: e.clientY, x, y }; main.setPointerCapture(e.pointerId); main.classList.add('dragging'); });
      main.addEventListener('pointermove', (e) => {
        if (!start) return;
        const r = main.getBoundingClientRect();
        x = Math.min(100, Math.max(0, start.x + sign * ((e.clientX - start.px) / r.width) * 100 / z));
        y = Math.min(100, Math.max(0, start.y + sign * ((e.clientY - start.py) / r.height) * 100 / z));
        draw();
      });
      const end = () => { start = null; main.classList.remove('dragging'); };
      main.addEventListener('pointerup', end);
      main.addEventListener('pointercancel', end);
      main.addEventListener('wheel', (e) => { e.preventDefault(); z = Math.min(3, Math.max(minZ, z - e.deltaY * 0.0015)); draw(); }, { passive: false });
      range.oninput = () => { z = Number(range.value); draw(); };
      m.el.querySelector('[data-center]').onclick = () => { x = 50; y = 50; z = 1; draw(); };
      m.el.querySelector('[data-ok]').onclick = () => { result = IP.build(p.src, x, y, z); m.close(); };
      draw();
    });
  }

  // ---- form fields ----
  // field: { k, l (label), type: text|url|number|textarea|md|image|check|datetime|select|privatefile|password|email|tel, req, hint, full, options:[[v,label]] }
  function fieldHtml(f, val) {
    const id = `f_${f.k}_${Math.random().toString(36).slice(2, 7)}`;
    const v = val == null ? '' : val;
    const lbl = `<label for="${id}">${esc(T(f.l))}${f.req ? ' *' : ''}</label>`;
    const hint = f.hint ? `<div class="hint">${esc(T(f.hint))}</div>` : '';
    const cls = `fld ${f.full || ['md', 'textarea', 'image', 'privatefile'].includes(f.type) ? 'full' : ''}`;
    const dir = f.ltr ? ' dir="ltr"' : '';
    switch (f.type) {
      case 'number': return `<div class="${cls}">${lbl}<input type="number" step="any" min="0" id="${id}" data-k="${f.k}" value="${esc(v)}">${hint}</div>`;
      case 'textarea': return `<div class="${cls}">${lbl}<textarea id="${id}" data-k="${f.k}" rows="${f.rows || 4}"${dir}>${esc(v)}</textarea>${hint}</div>`;
      case 'md': return `<div class="${cls} mdwrap" data-md>${lbl}
        <div class="mdbar"><button type="button" data-mdo="b" title="${esc(T('Bold'))}"><b>B</b></button><button type="button" data-mdo="h">${esc(T('Heading'))}</button>
        <button type="button" data-mdo="ul">• ${esc(T('List'))}</button><button type="button" data-mdo="q">❝ ${esc(T('Quote'))}</button>
        <button type="button" data-mdo="link">🔗 ${esc(T('Link'))}</button><button type="button" data-mdo="img">🖼 ${esc(T('Image'))}</button>
        <button type="button" data-mdo="vid">▶ ${esc(T('Video'))}</button><span class="spacer"></span><button type="button" data-mdo="pv">👁 ${esc(T('Preview'))}</button></div>
        <textarea id="${id}" data-k="${f.k}" rows="10">${esc(v)}</textarea><div class="mdprev prose" hidden></div>${hint}</div>`;
      case 'image': {
        const aspects = f.aspects || ['16/10'];
        const fit = f.fit || 'cover';
        return `<div class="${cls}">${lbl}<div class="imgfield" data-img data-aspects="${aspects.join('|')}" data-fit="${fit}" data-round="${f.round ? 1 : ''}">
        <div class="pv ${f.round ? 'round' : ''}" style="aspect-ratio:${aspects[0]}">${v ? `<img src="${esc(IP.src(v))}" style="${imgStyle(v, fit)}" alt="">` : `<span>${esc(T('No image'))}</span>`}</div>
        <input type="hidden" data-k="${f.k}" value="${esc(v)}"><div class="btns">
        <button type="button" class="btn small" data-imgo="up">${ic('upload', 'sm')} ${esc(T('Upload'))}</button>
        <button type="button" class="btn small ghost" data-imgo="lib">${esc(T('Choose from library'))}</button>
        <button type="button" class="btn small ghost" data-imgo="pos" ${v ? '' : 'hidden'}>✥ ${esc(T('Adjust position'))}</button>
        <button type="button" class="btn small ghost" data-imgo="rm">${esc(T('Remove'))}</button></div></div>${hint}</div>`;
      }
      case 'check': return `<div class="${cls}"><span class="lbl">&nbsp;</span><label class="switch"><input type="checkbox" data-k="${f.k}" ${v ? 'checked' : ''}> ${esc(T(f.l))}</label>${hint}</div>`;
      case 'datetime': return `<div class="${cls}">${lbl}<input type="datetime-local" id="${id}" data-k="${f.k}" data-dt value="${esc(toLocalInput(v))}">${hint}</div>`;
      case 'select': return `<div class="${cls}">${lbl}<select id="${id}" data-k="${f.k}">${f.options.map(([ov, ol]) => `<option value="${esc(ov)}" ${String(ov) === String(v) ? 'selected' : ''}>${esc(T(ol))}</option>`).join('')}</select>${hint}</div>`;
      case 'phone': {
        const iso = (v && v.country) || C.DEFAULT;
        const nat = v && v.phone ? C.format(v.phone, iso).split(' ').slice(1).join('') : '';
        return `<div class="${cls}">${lbl}<div class="phone-field" dir="ltr"><select data-k="country">${C.options(BOOT.lang, iso)}</select>
          <input type="tel" id="${id}" data-k="phone" value="${esc(nat)}" placeholder="1012345678"></div>${hint}</div>`;
      }
      case 'privatefile': return `<div class="${cls}">${lbl}<div class="row" data-pf><input type="hidden" data-k="file_path" value="${esc(v.file_path || '')}"><input type="hidden" data-k="file_name" value="${esc(v.file_name || '')}">
        <span class="pill ${v.file_path ? 'ok' : ''}" data-pfname>${esc(v.file_name || T('No file'))}</span>
        <button type="button" class="btn small" data-pfo="up">${ic('upload', 'sm')} ${esc(T('Upload file'))}</button>
        <button type="button" class="btn small ghost" data-pfo="rm">${esc(T('Remove'))}</button></div>${hint}</div>`;
      default: return `<div class="${cls}">${lbl}<input type="${['url', 'email', 'tel', 'password'].includes(f.type) ? f.type : 'text'}" id="${id}" data-k="${f.k}" value="${esc(v)}"${f.type === 'url' || f.ltr ? ' dir="ltr"' : ''}>${hint}</div>`;
    }
  }
  function collect(root) {
    const out = {};
    root.querySelectorAll('[data-k]').forEach((el) => {
      const k = el.dataset.k;
      if (el.type === 'checkbox') out[k] = el.checked;
      else if (el.dataset.dt !== undefined) out[k] = fromLocalInput(el.value);
      else out[k] = el.value;
    });
    return out;
  }
  // Wires image pickers, markdown toolbars and file uploads inside root.
  function bindFields(root) {
    root.addEventListener('click', async (e) => {
      const io = e.target.closest('[data-imgo]');
      if (io) {
        const box = io.closest('[data-img]');
        const inp = box.querySelector('[data-k]');
        const pv = box.querySelector('.pv');
        const fit = box.dataset.fit || 'cover';
        const set = (url) => {
          inp.value = url || '';
          pv.innerHTML = url ? `<img src="${esc(IP.src(url))}" style="${imgStyle(url, fit)}" alt="">` : `<span>${esc(T('No image'))}</span>`;
          box.querySelector('[data-imgo="pos"]').hidden = !url;
        };
        if (io.dataset.imgo === 'pos') {
          const v = await posEditor(inp.value, { aspects: box.dataset.aspects.split('|'), fit, round: !!box.dataset.round });
          if (v != null) set(v);
          return;
        }
        if (io.dataset.imgo === 'rm') set('');
        else if (io.dataset.imgo === 'lib') { const u = await mediaPicker(); if (u) set(u); }
        else {
          const f = await pickFile('image/*');
          if (!f) return;
          io.disabled = true;
          try { set((await uploadTo('/api/admin/media', f)).url); } catch (ex) { toast(ex.message); }
          io.disabled = false;
        }
        return;
      }
      const pf = e.target.closest('[data-pfo]');
      if (pf) {
        const box = pf.closest('[data-pf]');
        const [pathInp, nameInp] = box.querySelectorAll('[data-k]');
        const label = box.querySelector('[data-pfname]');
        if (pf.dataset.pfo === 'rm') { pathInp.value = ''; nameInp.value = ''; label.textContent = T('No file'); label.classList.remove('ok'); return; }
        const f = await pickFile('.pdf,.epub,.zip,.doc,.docx');
        if (!f) return;
        pf.disabled = true; label.textContent = T('Uploading…');
        try {
          const r = await uploadTo('/api/admin/private-upload', f);
          pathInp.value = r.file_path; nameInp.value = r.file_name; label.textContent = r.file_name; label.classList.add('ok');
        } catch (ex) { toast(ex.message); label.textContent = nameInp.value || T('No file'); }
        pf.disabled = false;
        return;
      }
      const mo = e.target.closest('[data-mdo]');
      if (mo) {
        const wrap = mo.closest('[data-md]');
        const ta = wrap.querySelector('textarea');
        const pv = wrap.querySelector('.mdprev');
        const op = mo.dataset.mdo;
        if (op === 'pv') {
          const show = pv.hidden;
          pv.hidden = !show; ta.hidden = show; mo.classList.toggle('on', show);
          if (show) pv.innerHTML = window.md(ta.value) || `<p class="muted">${esc(T('Nothing written yet'))}</p>`;
          return;
        }
        const s = ta.selectionStart; const en = ta.selectionEnd;
        const sel = ta.value.slice(s, en);
        const lineStart = ta.value.lastIndexOf('\n', s - 1) + 1;
        let ins = null;
        if (op === 'b') ins = [s, en, `**${sel || T('bold text')}**`];
        else if (op === 'h') ins = [lineStart, lineStart, '## '];
        else if (op === 'ul') ins = [lineStart, lineStart, '- '];
        else if (op === 'q') ins = [lineStart, lineStart, '> '];
        else if (op === 'link') { const u = prompt(T('Paste the link (https://...)')); if (u) ins = [s, en, `[${sel || T('link text')}](${u})`]; }
        else if (op === 'img') { const u = await mediaPicker(); if (u) ins = [s, en, `\n![](${u})\n`]; }
        else if (op === 'vid') { const u = prompt(T('Paste a YouTube or Vimeo link')); if (u) ins = [s, en, `\n${u}\n`]; }
        if (ins) { ta.setRangeText(ins[2], ins[0], ins[1], 'end'); ta.focus(); }
      }
    });
  }

  // ---- shell ----
  const NAV = [
    { id: 'dashboard', l: 'Dashboard', s: 'Overview', ic: 'dashboard' },
    { id: 'inbox', l: 'Inbox', s: 'Chats', ic: 'chat', perm: 'chat' },
    { id: 'orders', l: 'Orders & payments', s: 'Orders', ic: 'receipt', perm: 'orders' },
    { id: 'bookings', l: 'Consultation bookings', s: 'Bookings', ic: 'event', perm: 'bookings' },
    { id: 'clients', l: 'Clients', ic: 'group', perm: 'clients' },
    { id: 'members', l: 'Members', ic: 'crown', perm: 'orders' },
    { id: 'reservations', l: 'Seat bookings (coming soon)', s: 'Seats', ic: 'hourglass', perm: 'orders' },
    { id: 'comments', l: 'Comments', ic: 'comment', perm: 'comments' },
    { grp: 'Content' },
    { id: 'courses', l: 'Courses', ic: 'school', perm: 'content' },
    { id: 'books', l: 'Books', ic: 'book', perm: 'content' },
    { id: 'posts', l: 'Blog', ic: 'article', perm: 'content' },
    { id: 'consults', l: 'Consultations', ic: 'event', perm: 'content' },
    { id: 'social', l: 'Social media', ic: 'share', perm: 'content' },
    { id: 'site', l: 'Site texts & images', s: 'Site', ic: 'image', perm: 'content' },
    { id: 'linkpage', l: 'Link page', ic: 'link', perm: 'content' },
    { grp: 'Settings' },
    { id: 'payments', l: 'Payments', ic: 'card', perm: 'settings' },
    { id: 'plans', l: 'Membership plans', s: 'Plans', ic: 'crown', perm: 'settings' },
    { id: 'appearance', l: 'Colours', ic: 'palette', perm: 'settings' },
    { id: 'team', l: 'Team & roles', ic: 'shield', perm: 'team_view' },
    { id: 'quick', l: 'Quick replies', ic: 'bolt', perm: 'quick' },
  ];
  const ROLE_LABEL = { admin: 'Admin', support: 'Customer support', editor: 'Content editor' };
  // The Owner account is permanent and hidden from other team members.

  const ADM = window.ADM = {
    BOOT, api, post, put, del, ic, money, flag, countryName, fmtPhone, date, dateTime, toLocalInput, fromLocalInput, uploadTo, pickFile, mediaPicker,
    fieldHtml, collect, bindFields, posEditor, imgStyle, views: {}, user: null, perms: [], currency: BOOT.currency, ROLE_LABEL,
    can: (p) => !p || ADM.perms.includes(p),
    roleLabel: (u) => T(u.is_super ? 'Owner' : ROLE_LABEL[u.role] || u.role),
    go: (hash) => { if (location.hash === hash) route(); else location.hash = hash; },
    setTitle: (title, actions = '') => { document.getElementById('admTitle').textContent = title; document.getElementById('admActions').innerHTML = actions; },
    badge(id, n) { document.querySelectorAll(`a[data-v="${id}"] .badge`).forEach((b) => { b.hidden = !n; b.textContent = n; }); },
  };

  function renderShell() {
    const u = ADM.user;
    const other = BOOT.lang === 'ar' ? 'en' : 'ar';
    let navHtml = '';
    let pendingGroup = '';
    for (const n of NAV) {
      if (n.grp) { pendingGroup = n.grp; continue; }
      if (!ADM.can(n.perm)) continue;
      if (pendingGroup) { navHtml += `<div class="grp">${esc(T(pendingGroup))}</div>`; pendingGroup = ''; }
      navHtml += `<a href="#${n.id}" data-v="${n.id}">${ic(n.ic)}<span>${esc(T(n.l))}</span><span class="badge" hidden></span></a>`;
    }
    // Bottom tabs on phones: the 4 most useful sections this person can open.
    const PREF = ['inbox', 'orders', 'comments', 'clients', 'bookings', 'dashboard', 'courses', 'books', 'posts', 'site'];
    const tabsHtml = PREF.map((id) => NAV.find((n) => n.id === id)).filter((n) => n && ADM.can(n.perm)).slice(0, 4)
      .map((n) => `<a class="atab" href="#${n.id}" data-v="${n.id}">${ic(n.ic)}<span>${esc(T(n.s || n.l))}</span><span class="badge" hidden></span></a>`).join('');
    document.getElementById('app').innerHTML = `
    <div class="adm" id="adm">
      <aside class="adm-side">
        <div class="adm-brand"><span class="mark">${BOOT.logo ? `<img src="${esc(IP.src(BOOT.logo))}" style="${imgStyle(BOOT.logo, 'contain')}" alt="">` : ic('shield')}</span><span>${esc(BOOT.siteName)}</span></div>
        <nav class="adm-nav" id="admNav">${navHtml}</nav>
        <div class="adm-me">
          <div class="who">${WA.avatar(u.name, u.name)}<div><b>${esc(u.name)}</b><div class="muted small">${esc(ADM.roleLabel(u))}</div></div></div>
          <div class="row-btns"><a href="/" target="_blank">${esc(T('View website'))}</a><a href="/lang/${other}?next=/admin${esc(location.hash)}">${other === 'en' ? 'English' : 'العربية'}</a></div>
          <div class="row-btns"><button data-act="pw">${esc(T('Change password'))}</button><button data-act="logout">${esc(T('Log out'))}</button></div>
        </div>
      </aside>
      <div class="adm-scrim" id="admScrim"></div>
      <div class="adm-main">
        <header class="adm-top"><button class="icon-btn burger" id="admBurger">${ic('menu')}</button><h1 id="admTitle"></h1><div class="row" id="admActions"></div></header>
        <div class="adm-view" id="view"></div>
        <div class="adm-view flush" id="inboxHost" hidden></div>
        <nav class="adm-tabs" id="admTabs">${tabsHtml}<button type="button" class="atab" id="admMore">${ic('menu')}<span>${esc(T('Menu'))}</span></button></nav>
      </div>
    </div>`;
    const adm = document.getElementById('adm');
    document.getElementById('admBurger').onclick = () => adm.classList.toggle('menu-open');
    document.getElementById('admMore').onclick = () => adm.classList.toggle('menu-open');
    document.getElementById('admScrim').onclick = () => adm.classList.remove('menu-open');
    document.getElementById('admNav').addEventListener('click', () => adm.classList.remove('menu-open'));
    adm.querySelector('[data-act=logout]').onclick = async () => { await post('/api/auth/logout').catch(() => {}); location.href = '/'; };
    adm.querySelector('[data-act=pw]').onclick = changePassword;
  }

  function changePassword() {
    const m = openModal(`<h2>${esc(T('Change password'))}</h2>
      <div class="field"><label>${esc(T('Current password'))}</label><input type="password" name="cur" autocomplete="current-password" dir="ltr"></div>
      <div class="field"><label>${esc(T('New password'))}</label><input type="password" name="nw" autocomplete="new-password" dir="ltr"></div>
      <div class="error-text"></div>
      <div class="actions"><button class="btn ghost" data-close>${esc(T('Cancel'))}</button><button class="btn" data-ok>${esc(T('Save'))}</button></div>`);
    m.el.querySelector('[data-ok]').onclick = async () => {
      try {
        await post('/api/auth/password', { current: m.el.querySelector('[name=cur]').value, next: m.el.querySelector('[name=nw]').value });
        m.close(); toast(T('Password changed'));
      } catch (e) { m.el.querySelector('.error-text').textContent = e.message; }
    };
  }

  async function route() {
    const [id, arg] = (location.hash.replace(/^#/, '') || 'dashboard').split('/');
    let nav = NAV.find((n) => n.id === id && ADM.can(n.perm));
    if (!nav || !ADM.views[id]) nav = NAV.find((n) => n.id && ADM.can(n.perm) && ADM.views[n.id]);
    document.querySelectorAll('.adm-nav a, .adm-tabs a').forEach((a) => a.classList.toggle('on', a.dataset.v === nav.id));
    const view = document.getElementById('view');
    const host = document.getElementById('inboxHost');
    const isInbox = nav.id === 'inbox';
    view.hidden = isInbox; host.hidden = !isInbox;
    ADM.setTitle(T(nav.l));
    if (!isInbox) {
      if (ADM.inboxLeave) ADM.inboxLeave();
      view.innerHTML = `<div class="adm-inner"><div class="empty">${esc(T('Loading…'))}</div></div>`;
      view.scrollTop = 0;
    }
    try {
      await ADM.views[nav.id](isInbox ? host : view.firstElementChild, arg);
    } catch (e) {
      if (!isInbox) view.innerHTML = `<div class="adm-inner"><div class="empty err">${esc(e.message)}</div></div>`;
      else toast(e.message);
    }
  }

  // ---- dashboard ----
  ADM.views.dashboard = async (el) => {
    const o = await api('/api/admin/overview');
    const card = (k, v, href, hot) => `<a class="kcard ${hot ? 'hot' : ''}" ${href ? `href="${href}"` : ''}><div class="k">${esc(T(k))}</div><div class="v">${v}</div></a>`;
    let html = '<div class="cards">';
    if (o.waiting != null) html += card('Clients waiting for a reply', o.waiting, '#inbox', o.waiting > 0);
    if (o.pendingOrders != null) html += card('Orders waiting for payment', o.pendingOrders, '#orders', o.pendingOrders > 0);
    if (o.proofsToCheck) html += card('PayPal screenshots to check', o.proofsToCheck, '#orders', true);
    if (o.newReservations != null) html += card('New seat bookings', o.newReservations, '#reservations', o.newReservations > 0);
    if (o.newBookings != null) html += card('Paid bookings to schedule', o.newBookings, '#bookings', o.newBookings > 0);
    if (o.pendingComments != null) html += card('Comments waiting for approval', o.pendingComments, '#comments', o.pendingComments > 0);
    if (o.activeMembers != null) html += card('Active members', o.activeMembers, '#members');
    if (o.revenueMonth != null) html += card('Sales this month', esc(money(o.revenueMonth)), '#orders');
    if (o.clients != null) html += card('Clients', `${o.clients} <small>${esc(T('{n} active', { n: o.clientsActive }))}</small>`, '#clients');
    if (o.avgRating != null) html += card('Average chat rating', `${Number(o.avgRating).toFixed(1)} <small>/ 5 · ${o.ratingsCount}</small>`);
    if (o.staffOnline != null) html += card('Team online now', o.staffOnline);
    if (o.courses != null) html += card('Courses', o.courses, '#courses') + card('Books', o.books, '#books') + card('Articles', o.posts, '#posts');
    html += '</div>';
    if (o.clientStats && o.clientStats.byCountry.length) {
      const list = o.clientStats.byCountry.slice(0, 8);
      const max = Math.max(1, ...list.map((c) => c.total));
      html += `<div class="panel"><div class="panel-head"><h3>${esc(T('Clients by country'))}</h3><a class="btn small ghost" href="#clients">${esc(T('All details'))}</a></div>
        <div class="table-wrap"><table class="tbl"><thead><tr><th>${esc(T('Country'))}</th><th>${esc(T('Clients'))}</th><th></th><th>${esc(T('Active'))}</th><th>${esc(T('Inactive'))}</th></tr></thead>
        <tbody>${list.map((c) => `<tr><td><div class="nm">${flag(c.country)} <b>${esc(countryName(c.country))}</b></div></td><td><b>${c.total}</b></td>
          <td style="width:40%"><div class="share"><span style="width:${(c.total / max) * 100}%"></span></div></td><td><span class="dot on"></span> ${c.active}</td><td><span class="dot"></span> ${c.inactive}</td></tr>`).join('')}</tbody></table></div>
        <div class="panel-body muted small">${esc(T('Active = used the site or the chat in the last 30 days.'))}</div></div>`;
    }
    if (o.team && o.team.length) {
      const ranked = o.team.sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0) || b.chats_closed - a.chats_closed);
      html += `<div class="panel"><div class="panel-head"><h3>${esc(T('Team performance'))}</h3></div><div class="table-wrap"><table class="tbl">
        <thead><tr><th>${esc(T('Member'))}</th><th>${esc(T('Rating'))}</th><th>${esc(T('Ratings'))}</th><th>${esc(T('Chats ended'))}</th><th>${esc(T('Messages sent'))}</th><th>${esc(T('Payments confirmed'))}</th></tr></thead>
        <tbody>${ranked.map((u) => `<tr class="click" data-href="#team/${u.id}"><td><div class="nm">${WA.avatar(u.name, u.name, '', u.online)}<div>${esc(u.name)}<div class="muted small">${esc(ADM.roleLabel(u))}</div></div></div></td>
          <td>${u.avg_rating ? `${WA.starsHtml(u.avg_rating)} ${Number(u.avg_rating).toFixed(1)}` : '—'}</td><td>${u.ratings_count}</td><td>${u.chats_closed}</td><td>${u.messages_sent}</td><td>${u.orders_confirmed}</td></tr>`).join('')}</tbody>
      </table></div></div>`;
    }
    el.innerHTML = html;
    el.querySelectorAll('[data-href]').forEach((tr) => { tr.onclick = () => ADM.go(tr.dataset.href); });
  };

  ADM.start = async () => {
    try {
      const me = await api('/api/auth/me');
      if (!me.user || !me.user.perms.length) { location.href = '/login?next=/admin'; return; }
      ADM.user = me.user;
      ADM.perms = me.user.perms;
    } catch (e) { location.href = '/login?next=/admin'; return; }
    renderShell();
    if (ADM.initInbox && ADM.can('chat')) ADM.initInbox();
    if (ADM.refreshBadges) ADM.refreshBadges();
    window.addEventListener('hashchange', route);
    route();
  };
})();
