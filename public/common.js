/* Shared chat UI used by both the client page and the staff page. */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Icons (Material Design paths)
  // ---------------------------------------------------------------------------
  const P = {
    send: 'M2.01 21L23 12 2.01 3 2 10l15 2-15 2z',
    mic: 'M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z',
    micOff: 'M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z',
    attach: 'M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z',
    emoji: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z',
    phone: 'M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z',
    video: 'M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z',
    videoOff: 'M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z',
    callEnd: 'M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z',
    callMissed: 'M19.59 7L12 14.59 6.41 9H11V7H3v8h2v-4.59l7 7 9-9z',
    callOut: 'M9 5v2h6.59L4 18.59 5.41 20 17 8.41V15h2V5z',
    callIn: 'M20 5.41L18.59 4 7 15.59V9H5v10h10v-2H8.41z',
    check: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
    dcheck: 'M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z',
    clock: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z',
    alert: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z',
    play: 'M8 5v14l11-7z',
    pause: 'M6 19h4V5H6v14zm8-14v14h4V5h-4z',
    doc: 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z',
    download: 'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z',
    close: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
    trash: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
    reply: 'M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z',
    bolt: 'M7 2v11h3v9l7-12h-4l4-8z',
    more: 'M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
    search: 'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
    back: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
    image: 'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z',
    camera: 'M12 15.2a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4zM9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z',
    star: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
    info: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
    logout: 'M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z',
    dashboard: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
    chat: 'M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z',
    lock: 'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z',
    done: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
    add: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
    edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
    person: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
    group: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
    down: 'M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z',
    eye: 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z',
  };
  const T = (s, p) => (window.t ? window.t(s, p) : s);
  const LOC = (document.documentElement.lang || 'en').startsWith('ar') ? 'ar-EG-u-nu-latn' : 'en-GB';
  const icon = (name, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${P[name]}"/></svg>`;

  // ---------------------------------------------------------------------------
  // Formatting helpers
  // ---------------------------------------------------------------------------
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const linkify = (text) => esc(text).replace(/(https?:\/\/[^\s<&]+[^\s<&.,;:!?)\]])/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');

  const COLORS = ['#00a884', '#25a3d9', '#7f66ff', '#e26ab6', '#f79d3f', '#1fa855', '#a5b337', '#ff6b6b', '#5e8ff0', '#c86c3a', '#02a698', '#d3396d'];
  const colorFor = (seed) => { let h = 0; for (const ch of String(seed)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return COLORS[h % COLORS.length]; };
  const initials = (name) => {
    const p = String(name || '?').trim().split(/\s+/);
    return (Array.from(p[0] || '?')[0] + (p.length > 1 ? Array.from(p[p.length - 1])[0] : '')).toUpperCase();
  };
  const avatar = (name, seed, cls = '', online = false) =>
    `<div class="avatar ${cls}" style="background:${colorFor(seed == null ? name : seed)}">${esc(initials(name))}${online ? '<span class="dot"></span>' : ''}</div>`;

  const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
  const fmtTime = (ts) => new Date(ts).toLocaleTimeString(LOC, { hour: '2-digit', minute: '2-digit' });
  function dayLabel(ts) {
    const d = new Date(ts);
    if (sameDay(d, Date.now())) return T('Today');
    if (sameDay(d, Date.now() - 864e5)) return T('Yesterday');
    if (Date.now() - d < 6 * 864e5) return d.toLocaleDateString(LOC, { weekday: 'long' });
    return d.toLocaleDateString(LOC, { day: 'numeric', month: 'long', year: 'numeric' });
  }
  function listTime(ts) {
    if (!ts) return '';
    if (sameDay(ts, Date.now())) return fmtTime(ts);
    if (sameDay(ts, Date.now() - 864e5)) return T('Yesterday');
    if (Date.now() - ts < 6 * 864e5) return new Date(ts).toLocaleDateString(LOC, { weekday: 'short' });
    return new Date(ts).toLocaleDateString(LOC);
  }
  const fmtDateTime = (ts) => (ts ? new Date(ts).toLocaleString(LOC, { dateStyle: 'medium', timeStyle: 'short' }) : '—');
  const fmtDur = (s) => { s = Math.max(0, Math.round(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const fmtSize = (b) => (!b ? '' : b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`);
  function ago(ts) {
    const s = Math.max(0, (Date.now() - ts) / 1000);
    if (s < 60) return T('just now');
    if (s < 3600) return T('{n} min', { n: Math.floor(s / 60) });
    if (s < 86400) return T('{h} h {m} min', { h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60) });
    return T('{n} days', { n: Math.floor(s / 86400) });
  }
  const starsHtml = (n, cls = 'xs') => {
    if (!n) return '';
    const r = Math.round(n);
    return `<span class="stars" title="${Number(n).toFixed(1)} / 5">${[1, 2, 3, 4, 5].map((i) => `<span class="${i <= r ? '' : 'off'}">${icon('star', cls)}</span>`).join('')}</span>`;
  };
  function previewText(m) {
    switch (m.type) {
      case 'image': return `📷 ${m.body || T('Photo')}`;
      case 'video': return `🎥 ${m.body || T('Video')}`;
      case 'audio': return `🎤 ${T('Voice message')}`;
      case 'file': return `📄 ${m.file_name || T('Document')}`;
      case 'call': return `📞 ${callLabel(m.body)}`;
      default: return m.body || '';
    }
  }
  // Calls are stored as "voice:ok", "video:missed", "voice:declined".
  function callLabel(body) {
    const [kind, st] = String(body || '').split(':');
    const v = kind === 'video';
    if (st === 'missed') return T(v ? 'Missed video call' : 'Missed voice call');
    if (st === 'declined') return T(v ? 'Declined video call' : 'Declined voice call');
    return T(v ? 'Video call' : 'Voice call');
  }
  // Automatic notes are stored as "key::{json}" and translated here.
  function systemText(body) {
    const m = String(body || '').match(/^(\w+)::([\s\S]*)$/);
    if (!m) return esc(body);
    let d = {};
    try { d = JSON.parse(m[2]); } catch (e) { return esc(body); }
    switch (m[1]) {
      case 'ended': return esc(T('Chat ended by {name}', { name: d.name }));
      case 'rated': return `${esc(T('Chat rated'))} ${'★'.repeat(d.rating)}${'☆'.repeat(5 - d.rating)}${d.comment ? ` — “${esc(d.comment)}”` : ''}`;
      case 'paid': return `✅ ${esc(T('Payment confirmed for order #{id}. You now have access to: {items}', { id: d.id, items: (d.items || []).join(' / ') }))}`;
      case 'cancelled': return `❌ ${esc(T('Order #{id} was cancelled', { id: d.id }))}`;
      case 'sub': return `👑 ${esc(T('Membership active: {title}. You can open every course and book until {date}.', { title: d.title || '', date: new Date(d.until).toLocaleDateString(LOC, { dateStyle: 'long' }) }))}`;
      case 'sub_ending': return `⏳ ${esc(T('Your membership ends on {date}. Renew any time to keep your access.', { date: new Date(d.until).toLocaleDateString(LOC, { dateStyle: 'long' }) }))} <a href="/membership">${esc(T('Renew'))}</a>`;
      case 'booking': {
        let txt = `📅 ${esc(d.title || '')}`;
        if (d.at) txt += ` — ${esc(new Date(d.at).toLocaleString(LOC, { dateStyle: 'full', timeStyle: 'short' }))}`;
        if (d.status === 'done') txt += ` — ${esc(T('Completed'))}`;
        if (d.status === 'cancelled') txt += ` — ${esc(T('Cancelled'))}`;
        if (d.link) txt += `<br><a href="${esc(d.link)}" target="_blank" rel="noopener">${esc(T('Join the meeting'))}</a>`;
        return txt;
      }
      default: return esc(body);
    }
  }
  function fileKind(name) {
    const ext = (String(name || '').split('.').pop() || '').toLowerCase();
    if (ext === 'pdf') return ['pdf', 'PDF'];
    if (['doc', 'docx', 'rtf', 'odt', 'txt'].includes(ext)) return ['doc', ext.toUpperCase()];
    if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) return ['xls', ext.toUpperCase()];
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return ['zip', ext.toUpperCase()];
    return ['', (ext || 'FILE').slice(0, 4).toUpperCase()];
  }

  // ---------------------------------------------------------------------------
  // Toast, modals, lightbox
  // ---------------------------------------------------------------------------
  let toastTimer;
  function toast(msg, ms = 3200) {
    let el = document.querySelector('.toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, ms);
  }
  function openModal(html, { onClose, dismissable = true } = {}) {
    const back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML = `<div class="modal" role="dialog">${html}</div>`;
    document.body.appendChild(back);
    const close = () => { if (!back.isConnected) return; back.remove(); document.removeEventListener('keydown', onKey); onClose && onClose(); };
    const onKey = (e) => { if (e.key === 'Escape' && dismissable) close(); };
    document.addEventListener('keydown', onKey);
    if (dismissable) back.addEventListener('mousedown', (e) => { if (e.target === back) close(); });
    back.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
    const first = back.querySelector('input, textarea');
    if (first) setTimeout(() => first.focus(), 30);
    return { el: back.querySelector('.modal'), close };
  }
  function confirmDialog(title, text, okLabel = T('OK'), danger = false) {
    return new Promise((resolve) => {
      let ok = false;
      const m = openModal(`<h2>${esc(title)}</h2><p class="sub">${esc(text)}</p>
        <div class="actions"><button class="btn ghost" data-close>${T('Cancel')}</button><button class="btn ${danger ? 'danger' : ''}" data-ok>${esc(okLabel)}</button></div>`,
      { onClose: () => resolve(ok) });
      m.el.querySelector('[data-ok]').onclick = () => { ok = true; m.close(); };
    });
  }
  // Returns an element with clickable stars; read value with el.value.
  function starInput(value = 0, size = '') {
    const el = document.createElement('div');
    el.className = 'stars-input';
    el.value = value;
    const draw = () => { el.innerHTML = [1, 2, 3, 4, 5].map((i) => `<button type="button" data-v="${i}" class="${i <= el.value ? 'on' : ''}" aria-label="${i} stars">${icon('star', size)}</button>`).join(''); };
    el.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { el.value = Number(b.dataset.v); draw(); el.dispatchEvent(new Event('change')); } });
    draw();
    return el;
  }
  function openLightbox(src) {
    const lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.innerHTML = `<div class="lb-bar"><a class="icon-btn" href="${esc(src)}" download title="${T('Download')}">${icon('download')}</a><button class="icon-btn" title="${T('Close')}">${icon('close')}</button></div>
      <div class="lb-body"><img src="${esc(src)}" alt=""></div>`;
    const close = () => { lb.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    lb.querySelector('button').onclick = close;
    lb.querySelector('.lb-body').addEventListener('click', (e) => { if (e.target.tagName !== 'IMG') close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(lb);
  }

  // ---------------------------------------------------------------------------
  // API helpers
  // ---------------------------------------------------------------------------
  function makeApi(getToken, onUnauthorized) {
    return async function api(url, { method = 'GET', body } = {}) {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' },
        credentials: 'same-origin',
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      let data = null;
      try { data = await res.json(); } catch (e) { /* empty body */ }
      if (res.status === 401 && onUnauthorized) onUnauthorized();
      if (!res.ok) throw new Error((data && data.error) || T('Something went wrong'));
      return data;
    };
  }
  function uploadFile(file, token, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const fd = new FormData();
      fd.append('file', file, file.name);
      xhr.open('POST', '/api/upload');
      xhr.setRequestHeader('X-Requested-With', 'fetch');
      xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
      xhr.onload = () => {
        let data = null;
        try { data = JSON.parse(xhr.responseText); } catch (e) { /* ignore */ }
        if (xhr.status >= 200 && xhr.status < 300 && data) resolve(data);
        else reject(new Error((data && data.error) || T('Upload failed')));
      };
      xhr.onerror = () => reject(new Error(T('Upload failed - check your connection')));
      xhr.send(fd);
    });
  }

  // ---------------------------------------------------------------------------
  // Sounds
  // ---------------------------------------------------------------------------
  let audioCtx;
  function ctx() {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    return audioCtx;
  }
  function tone(freq, start, len, vol = 0.08) {
    try {
      const c = ctx();
      const o = c.createOscillator();
      const g = c.createGain();
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, c.currentTime + start);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + len);
      o.connect(g); g.connect(c.destination);
      o.start(c.currentTime + start); o.stop(c.currentTime + start + len + 0.05);
    } catch (e) { /* audio not available */ }
  }
  const notifySound = () => { tone(880, 0, 0.12); tone(1320, 0.13, 0.18); };

  // ---------------------------------------------------------------------------
  // Voice note player (one shared <audio>)
  // ---------------------------------------------------------------------------
  const player = { audio: null, el: null };
  function voiceUi(el, ratio, time, playing) {
    el.querySelector('.vfill').style.width = `${ratio * 100}%`;
    el.querySelector('.vknob').style.insetInlineStart = `${ratio * 100}%`;
    el.querySelector('.vtime').textContent = fmtDur(time);
    el.querySelector('.vplay').innerHTML = icon(playing ? 'pause' : 'play');
  }
  function stopVoice() {
    if (!player.audio) return;
    player.audio.pause();
    if (player.el.isConnected) voiceUi(player.el, 0, Number(player.el.dataset.dur), false);
    player.audio = null; player.el = null;
  }
  function toggleVoice(el, seekRatio) {
    if (player.el === el) {
      const a = player.audio;
      if (seekRatio != null) { const d = isFinite(a.duration) && a.duration > 0 ? a.duration : Number(el.dataset.dur); if (d) a.currentTime = seekRatio * d; return; }
      if (a.paused) a.play(); else a.pause();
      return;
    }
    stopVoice();
    const a = new Audio(el.dataset.src);
    player.audio = a; player.el = el;
    const dur = () => (isFinite(a.duration) && a.duration > 0 ? a.duration : Number(el.dataset.dur) || 0);
    a.ontimeupdate = () => { const d = dur(); voiceUi(el, d ? Math.min(1, a.currentTime / d) : 0, a.currentTime, !a.paused); };
    a.onplay = () => voiceUi(el, dur() ? a.currentTime / dur() : 0, a.currentTime, true);
    a.onpause = () => { if (player.audio === a) voiceUi(el, dur() ? a.currentTime / dur() : 0, a.currentTime, false); };
    a.onended = () => { if (player.audio === a) stopVoice(); };
    a.play().catch(() => toast(T('Could not play this voice message')));
  }
  document.addEventListener('click', (e) => {
    const playBtn = e.target.closest('.voice .vplay');
    if (playBtn) { toggleVoice(playBtn.closest('.voice')); return; }
    const bar = e.target.closest('.voice .vbar');
    if (bar) {
      const r = bar.getBoundingClientRect();
      const v = bar.closest('.voice');
      const rtl = getComputedStyle(bar).direction === 'rtl';
      const ratio = rtl ? (r.right - e.clientX) / r.width : (e.clientX - r.left) / r.width;
      if (player.el === v) toggleVoice(v, Math.min(1, Math.max(0, ratio)));
      return;
    }
    const img = e.target.closest('img.media-img');
    if (img && !img.closest('.pending')) openLightbox(img.dataset.full || img.src);
  });

  // ---------------------------------------------------------------------------
  // Message rendering
  // ---------------------------------------------------------------------------
  function tickHtml(m) {
    if (m.failed) return `<span class="tick failed" title="${T('Not sent - tap to retry')}">${icon('alert', 'xs')}</span>`;
    if (m.pending) return `<span class="tick">${icon('clock', 'xs')}</span>`;
    if (m.read_at) return `<span class="tick read" title="${T('Read')}">${icon('dcheck', 'sm')}</span>`;
    if (m.delivered_at) return `<span class="tick" title="${T('Delivered')}">${icon('dcheck', 'sm')}</span>`;
    return `<span class="tick" title="${T('Sent')}">${icon('check', 'sm')}</span>`;
  }

  class ChatView {
    /**
     * opts: viewer ('client'|'staff'), socket, getToken(), meId, meName, clientId(), clientName(),
     *       quickReplies() (staff only), onIncomingSeen()
     */
    constructor(root, opts) {
      this.root = root;
      this.o = opts;
      this.messages = [];
      this.payloads = new Map();
      this.reply = null;
      this.unseen = 0;
      root.classList.add('chat-view');
      root.innerHTML = `
        <div class="cv-messages"></div>
        <button class="cv-scroll-down" hidden title="${T('Scroll to bottom')}">${icon('down')}<span class="badge" hidden></span></button>
        <div class="cv-bottom">
          <div class="cv-banner" hidden></div>
          <div class="popover emoji-panel" hidden></div>
          <div class="popover attach-menu" hidden>
            <button type="button" data-pick="media"><span class="ai" style="background:#007bfc">${icon('image', 'sm')}</span>${T('Photos & videos')}</button>
            <button type="button" data-pick="camera"><span class="ai" style="background:#ff2e74">${icon('camera', 'sm')}</span>${T('Camera')}</button>
            <button type="button" data-pick="doc"><span class="ai" style="background:#7f66ff">${icon('doc', 'sm')}</span>${T('Document')}</button>
          </div>
          <div class="popover qr-panel" hidden></div>
          <div class="cv-reply" hidden><div class="quote"></div><button type="button" class="icon-btn" data-act="cancel-reply" title="${T('Cancel reply')}">${icon('close', 'sm')}</button></div>
          <div class="cv-composer">
            <button type="button" class="icon-btn" data-act="emoji" title="${T('Emoji')}">${icon('emoji')}</button>
            <button type="button" class="icon-btn" data-act="attach" title="${T('Attach')}">${icon('attach')}</button>
            ${opts.viewer === 'staff' ? `<button type="button" class="icon-btn" data-act="qr" title="${T('Quick replies (or type /)')}">${icon('bolt')}</button>` : ''}
            <div class="input-wrap"><textarea rows="1" placeholder="${T('Type a message')}" aria-label="${T('Type a message')}"></textarea></div>
            <button type="button" class="icon-btn send-btn" data-act="send" title="${T('Record voice message')}">${icon('mic')}</button>
          </div>
          <div class="cv-recording" hidden>
            <button type="button" class="icon-btn" data-act="rec-cancel" title="${T('Delete recording')}">${icon('trash')}</button>
            <span class="rec-dot"></span><span class="rec-time">0:00</span>
            <button type="button" class="icon-btn send-btn" data-act="rec-send" title="${T('Send voice message')}">${icon('send')}</button>
          </div>
        </div>
        <input type="file" class="f-media" accept="image/*,video/*" multiple hidden>
        <input type="file" class="f-camera" accept="image/*" capture="environment" hidden>
        <input type="file" class="f-doc" multiple hidden>`;
      this.list = root.querySelector('.cv-messages');
      this.ta = root.querySelector('textarea');
      this.sendBtn = root.querySelector('[data-act="send"]');
      this.scrollBtn = root.querySelector('.cv-scroll-down');
      this.emojiPanel = root.querySelector('.emoji-panel');
      this.attachMenu = root.querySelector('.attach-menu');
      this.qrPanel = root.querySelector('.qr-panel');
      this.replyBar = root.querySelector('.cv-reply');
      this.banner = root.querySelector('.cv-banner');
      this._bind();
    }

    // ---- public ----
    setMessages(list) {
      this.messages = list.slice();
      this.unseen = 0;
      this.render();
      this.scrollToBottom(false);
    }
    render() {
      if (!this.messages.length) {
        this.list.innerHTML = `<div class="cv-empty">${esc(this.o.emptyText || T('No messages yet. Say hello! 👋'))}</div>`;
        return;
      }
      let html = '';
      this.messages.forEach((m, i) => { html += this._html(m, this.messages[i - 1]); });
      this.list.innerHTML = html;
    }
    addMessage(m) {
      // Already have it (e.g. our own message echoed back) -> just refresh it.
      const existing = m.id ? this.messages.findIndex((x) => x.id === m.id) : -1;
      if (existing >= 0) { this._replaceAt(existing, { ...this.messages[existing], ...m, pending: false, failed: false }); return; }
      if (m.temp_id) {
        const ti = this.messages.findIndex((x) => x.temp_id === m.temp_id && !x.id);
        if (ti >= 0) {
          const old = this.messages[ti];
          if (old.file_url && old.file_url.startsWith('blob:') && m.file_url && !m.pending) setTimeout(() => URL.revokeObjectURL(old.file_url), 5000);
          this._replaceAt(ti, { ...m, pending: !!m.pending, failed: false });
          return;
        }
      }
      const nearBottom = this._nearBottom();
      const prev = this.messages[this.messages.length - 1];
      this.messages.push(m);
      if (this.messages.length === 1) this.list.innerHTML = '';
      this.list.insertAdjacentHTML('beforeend', this._html(m, prev));
      const mine = this._mine(m);
      if (mine || nearBottom) this.scrollToBottom(true);
      else if (m.type !== 'system') { this.unseen++; this._updateScrollBtn(); }
    }
    applyReceipt(ev) {
      // ev.by = who read/received; affects messages sent by the other side.
      const side = ev.by === 'client' ? 'staff' : 'client';
      this.messages.forEach((m, i) => {
        if (!m.id || m.sender_type !== side || m.created_at > ev.at) return;
        let changed = false;
        if (ev.type === 'read' && !m.read_at) { m.read_at = ev.at; changed = true; }
        if (!m.delivered_at) { m.delivered_at = ev.at; changed = true; }
        if (changed) this._refreshTick(i);
      });
    }
    setBanner(html) {
      this.banner.hidden = !html;
      this.banner.innerHTML = html || '';
    }
    setReply(m) {
      this.reply = m;
      const q = this.replyBar.querySelector('.quote');
      const name = this._senderLabel(m);
      q.style.setProperty('--qc', colorFor(m.sender_type === 'client' ? 'client' : m.sender_id));
      q.innerHTML = `<div class="q-in"><div class="q-name">${esc(name)}</div><div class="q-text">${esc(previewText(m))}</div></div>`;
      this.replyBar.hidden = false;
      this.ta.focus();
    }
    updateOrder(orderId, status) {
      this.messages.forEach((m, i) => { if (m.order_id === orderId) this._replaceAt(i, { ...m, order_status: status }); });
    }
    setDraft(text, orderId) {
      this.ta.value = text || '';
      this.draftOrderId = orderId || null;
      this._autosize();
      this._onInput();
      setTimeout(() => { this.ta.focus(); this.ta.setSelectionRange(0, 0); this.ta.scrollTop = 0; }, 50);
    }
    clearReply() { this.reply = null; this.replyBar.hidden = true; }
    focus() { if (window.matchMedia('(hover: hover)').matches) this.ta.focus(); }
    scrollToBottom(smooth) {
      this.list.scrollTo({ top: this.list.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
      this.unseen = 0;
      this._updateScrollBtn();
    }
    reset() {
      this.messages = [];
      this.list.innerHTML = '';
      this.ta.value = '';
      this._autosize();
      this.clearReply();
      this.setBanner('');
      this._closePopovers();
      if (this.rec) this._stopRecording(false);
    }

    // ---- rendering ----
    _mine(m) { return this.o.viewer === 'client' ? m.sender_type === 'client' : m.sender_type === 'staff'; }
    _senderLabel(m) {
      if (m.sender_type === 'client') return this.o.viewer === 'client' ? T('You') : this.o.clientName();
      if (m.sender_type === 'staff') return this.o.viewer === 'staff' && m.sender_id === this.o.meId ? T('You') : (m.sender_name || T('Support'));
      return '';
    }
    _quoteHtml(m) {
      if (!m.reply_to) return '';
      const name = m.reply_sender_type === 'client'
        ? (this.o.viewer === 'client' ? T('You') : this.o.clientName())
        : (this.o.viewer === 'staff' && m.reply_sender_name === this.o.meName ? T('You') : (m.reply_sender_name || T('Support')));
      const text = previewText({ type: m.reply_type, body: m.reply_body, file_name: m.reply_file_name });
      const color = colorFor(m.reply_sender_type === 'client' ? 'client' : m.reply_sender_name);
      return `<div class="quote" data-goto="${m.reply_to}" style="--qc:${color}"><div class="q-in"><div class="q-name">${esc(name)}</div><div class="q-text">${esc(text || '…')}</div></div></div>`;
    }
    _html(m, prev) {
      let out = '';
      if (!prev || !sameDay(prev.created_at, m.created_at)) out += `<div class="day-sep">${esc(dayLabel(m.created_at))}</div>`;
      if (m.type === 'system') return `${out}<div class="sys-msg" data-id="${m.id || ''}">${systemText(m.body)}</div>`;
      const mine = this._mine(m);
      const first = !prev || prev.type === 'system' || prev.sender_type !== m.sender_type || prev.sender_id !== m.sender_id
        || !sameDay(prev.created_at, m.created_at) || m.created_at - prev.created_at > 10 * 60e3;
      let sender = '';
      if (first && m.sender_type === 'staff' && !(this.o.viewer === 'staff' && m.sender_id === this.o.meId)) {
        sender = `<div class="sender" style="color:${colorFor(m.sender_name)}">${esc(m.sender_name || T('Support'))}</div>`;
      }
      const meta = `<span class="meta">${fmtTime(m.created_at)}${mine ? tickHtml(m) : ''}</span>`;
      const metaOver = `<span class="meta over">${fmtTime(m.created_at)}${mine ? tickHtml(m) : ''}</span>`;
      const progress = m.pending && m.progress != null && m.progress < 1 ? `<div class="progress">${T('Uploading')} ${Math.round(m.progress * 100)}%</div>` : '';
      const quote = this._quoteHtml(m);
      let body = '';
      let media = false;
      const url = esc(m.file_url || '');
      switch (m.type) {
        case 'image':
          media = true;
          body = `<img class="media-img" src="${url}" data-full="${url}" alt="" loading="lazy">${progress}`
            + (m.body ? `<div class="caption text">${linkify(m.body)}${meta}</div>` : metaOver);
          break;
        case 'video':
          media = true;
          body = `<video class="media-vid" src="${url}" controls preload="metadata" playsinline></video>${progress}`
            + (m.body ? `<div class="caption text">${linkify(m.body)}${meta}</div>` : metaOver);
          break;
        case 'audio':
          body = `<div class="voice" data-src="${url}" data-dur="${m.duration || 0}"><button type="button" class="vplay" aria-label="${T('Play')}">${icon('play')}</button>`
            + `<div class="vtrack"><div class="vbar"><div class="vfill"></div><div class="vknob"></div></div><div class="vtime">${fmtDur(m.duration)}</div></div>`
            + `<div class="vmic" style="background:${mine ? 'var(--brand)' : '#8696a0'}">${icon('mic', 'sm')}</div></div>${progress}<div style="overflow:hidden">${meta}</div>`;
          break;
        case 'file': {
          const [cls, label] = fileKind(m.file_name);
          const sub = [label, fmtSize(m.file_size)].filter(Boolean).join(' · ');
          body = `<a class="file-card" href="${url}" target="_blank" rel="noopener" ${m.pending ? '' : 'download="' + esc(m.file_name) + '"'}>`
            + `<div class="ficon ${cls}">${esc(label)}</div><div class="finfo"><div class="fname">${esc(m.file_name)}</div><div class="fsub">${esc(sub)}</div></div>`
            + `<span class="fdl">${icon('download')}</span></a>${progress}`
            + (m.body ? `<div class="text" style="margin-top:4px">${linkify(m.body)}${meta}</div>` : `<div style="overflow:hidden">${meta}</div>`);
          break;
        }
        case 'call': {
          const missed = /:(missed|declined)$/.test(m.body || '');
          const ic = missed ? 'callMissed' : (mine ? 'callOut' : 'callIn');
          body = `<div class="call-bubble"><div class="cicon ${missed ? 'missed' : ''}">${icon(/^video/.test(m.body) ? 'video' : 'phone', 'sm')}</div>`
            + `<div><div>${esc(callLabel(m.body))}</div><div class="csub">${icon(ic, 'xs')} ${m.duration ? fmtDur(m.duration) : (missed ? T('No answer') : '')}</div></div></div>`
            + `<div style="overflow:hidden">${meta}</div>`;
          break;
        }
        default:
          body = `<div class="text">${linkify(m.body)}${meta}</div>`;
      }
      if (m.order_id) {
        const st = { pending: T('Waiting for payment'), paid: T('Paid'), cancelled: T('Cancelled') }[m.order_status] || '';
        body += `<button type="button" class="order-chip ${esc(m.order_status || '')}" data-order="${m.order_id}">🧾 ${esc(T('Order #{id}', { id: m.order_id }))}${st ? ` · ${esc(st)}` : ''}</button>`;
      }
      const actions = m.id && m.type !== 'call' ? `<div class="msg-actions"><button type="button" data-act="reply" title="${T('Reply')}">${icon('reply', 'sm')}</button></div>` : '';
      return `${out}<div class="msg ${mine ? 'out' : 'in'} ${first ? 'first' : ''} ${m.pending ? 'pending' : ''} ${m.failed ? 'failed' : ''}" data-id="${m.id || ''}" data-temp="${esc(m.temp_id || '')}">`
        + `<div class="bubble ${media ? 'media' : ''}">${sender}${quote}${body}</div>${actions}</div>`;
    }
    _elFor(m) {
      if (m.id) { const el = this.list.querySelector(`.msg[data-id="${m.id}"], .sys-msg[data-id="${m.id}"]`); if (el) return el; }
      if (m.temp_id) return this.list.querySelector(`.msg[data-temp="${CSS.escape(m.temp_id)}"]`);
      return null;
    }
    _replaceAt(i, m) {
      const el = this._elFor(this.messages[i]);
      this.messages[i] = m;
      if (!el) return;
      const tmp = document.createElement('div');
      tmp.innerHTML = this._html(m, this.messages[i - 1]);
      const fresh = tmp.querySelector('.msg, .sys-msg');
      el.replaceWith(fresh);
    }
    _refreshTick(i) {
      const m = this.messages[i];
      const el = this._elFor(m);
      if (!el) return;
      el.querySelectorAll('.tick').forEach((t) => { t.outerHTML = tickHtml(m); });
    }
    _nearBottom() { const l = this.list; return l.scrollHeight - l.scrollTop - l.clientHeight < 160; }
    _updateScrollBtn() {
      const far = this.list.scrollHeight - this.list.scrollTop - this.list.clientHeight > 300;
      this.scrollBtn.hidden = !far && !this.unseen;
      const b = this.scrollBtn.querySelector('.badge');
      b.hidden = !this.unseen;
      b.textContent = this.unseen;
      if (!far && this.unseen) { this.unseen = 0; b.hidden = true; this.scrollBtn.hidden = true; }
    }

    // ---- sending ----
    _temp(fields) {
      const t = {
        temp_id: `t${Date.now()}${Math.random().toString(36).slice(2, 8)}`,
        id: null, pending: true, client_id: this.o.clientId(),
        sender_type: this.o.viewer === 'client' ? 'client' : 'staff', sender_id: this.o.meId, sender_name: this.o.meName,
        created_at: Date.now(), ...fields,
      };
      if (this.reply) {
        const r = this.reply;
        Object.assign(t, { reply_to: r.id, reply_type: r.type, reply_body: r.body, reply_file_name: r.file_name, reply_sender_type: r.sender_type, reply_sender_name: r.sender_name });
        this.clearReply();
      }
      return t;
    }
    _emit(temp, payload) {
      payload = { ...payload, temp_id: temp.temp_id, clientId: this.o.clientId(), reply_to: temp.reply_to || null };
      this.payloads.set(temp.temp_id, payload);
      this.o.socket.timeout(20000).emit('msg:send', payload, (err, res) => {
        if (err || !res || res.error) {
          const i = this.messages.findIndex((x) => x.temp_id === temp.temp_id && !x.id);
          if (i >= 0) this._replaceAt(i, { ...this.messages[i], pending: false, failed: true });
          if (res && res.error) toast(res.error);
          return;
        }
        this.payloads.delete(temp.temp_id);
        this.addMessage({ ...res.message, temp_id: temp.temp_id });
      });
    }
    _retry(tempId) {
      const payload = this.payloads.get(tempId);
      const i = this.messages.findIndex((x) => x.temp_id === tempId && !x.id);
      if (!payload || i < 0) return;
      const temp = { ...this.messages[i], pending: true, failed: false };
      this._replaceAt(i, temp);
      this._emit(temp, payload);
    }
    sendText() {
      const text = this.ta.value.trim();
      if (!text) return;
      const orderId = this.draftOrderId || null;
      this.draftOrderId = null;
      const temp = this._temp({ type: 'text', body: text, order_id: orderId, order_status: orderId ? 'pending' : null });
      this.addMessage(temp);
      this.ta.value = '';
      this._autosize();
      this._onInput();
      this._typing(false);
      this._emit(temp, { type: 'text', body: text, order_id: orderId });
    }
    async sendFiles(files, caption = '', extra = {}) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const mt = file.type || '';
        const type = mt.startsWith('image/') ? 'image' : mt.startsWith('video/') ? 'video' : mt.startsWith('audio/') ? 'audio' : 'file';
        const local = type === 'file' ? null : URL.createObjectURL(file);
        const temp = this._temp({
          type, body: i === 0 ? caption : '', file_url: local, file_name: file.name, file_size: file.size, mime: mt,
          duration: extra.duration || null, progress: 0,
        });
        this.addMessage(temp);
        try {
          const up = await uploadFile(file, this.o.getToken(), (p) => {
            const el = this._elFor(temp);
            const pr = el && el.querySelector('.progress');
            if (pr) pr.textContent = p < 1 ? `${T('Uploading')} ${Math.round(p * 100)}%` : T('Sending…');
          });
          this._emit(temp, { type, body: temp.body, file_url: up.url, file_name: up.name, file_size: up.size, mime: up.mime, duration: temp.duration });
        } catch (e) {
          const idx = this.messages.findIndex((x) => x.temp_id === temp.temp_id);
          if (idx >= 0) { this._elFor(temp)?.remove(); this.messages.splice(idx, 1); }
          toast(e.message);
        }
      }
    }
    previewFiles(files) {
      files = Array.from(files || []).filter((f) => f.size > 0);
      if (!files.length) return;
      const cards = files.map((f, i) => {
        const t = f.type || '';
        let thumb;
        if (t.startsWith('image/')) thumb = `<img src="${URL.createObjectURL(f)}" alt="">`;
        else if (t.startsWith('video/')) thumb = `<video src="${URL.createObjectURL(f)}" muted></video>`;
        else thumb = `<div class="ficon-big">${esc(fileKind(f.name)[1])}</div>`;
        return `<div class="pv" data-i="${i}">${thumb}<div class="pn" title="${esc(f.name)}">${esc(f.name)}</div><div>${fmtSize(f.size)}</div></div>`;
      }).join('');
      const m = openModal(`<h2>${files.length > 1 ? T('Send {n} files', { n: files.length }) : T('Send file')}</h2>
        <div class="preview-grid">${cards}</div>
        <div class="field"><input class="pv-caption" placeholder="${T('Add a caption…')}" maxlength="2000"></div>
        <div class="actions"><button class="btn ghost" data-close>${T('Cancel')}</button><button class="btn" data-send>${icon('send', 'sm')} ${T('Send')}</button></div>`, {
        onClose: () => m.el.querySelectorAll('img,video').forEach((x) => URL.revokeObjectURL(x.src)),
      });
      const go = () => { const cap = m.el.querySelector('.pv-caption').value.trim(); m.close(); this.sendFiles(files, cap); };
      m.el.querySelector('[data-send]').onclick = go;
      m.el.querySelector('.pv-caption').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
    }

    // ---- voice recording ----
    async _startRecording() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
        toast(T('Voice messages need a secure (https) page or a newer browser')); return;
      }
      let stream;
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) {
        toast(T('Please allow microphone access to record voice messages')); return;
      }
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find((t) => MediaRecorder.isTypeSupported(t));
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      const start = Date.now();
      const timeEl = this.root.querySelector('.rec-time');
      timeEl.textContent = '0:00';
      const timer = setInterval(() => {
        const s = (Date.now() - start) / 1000;
        timeEl.textContent = fmtDur(s);
        if (s >= 300) this._stopRecording(true);
      }, 250);
      this.rec = { rec, stream, chunks, start, timer };
      rec.start(250);
      this.root.querySelector('.cv-composer').hidden = true;
      this.root.querySelector('.cv-recording').hidden = false;
      this._typing(true);
    }
    _stopRecording(send) {
      const r = this.rec;
      if (!r) return;
      this.rec = null;
      clearInterval(r.timer);
      const duration = (Date.now() - r.start) / 1000;
      r.rec.onstop = () => {
        r.stream.getTracks().forEach((t) => t.stop());
        if (!send) return;
        if (duration < 0.8) { toast(T('Hold on - that recording was too short')); return; }
        const type = (r.rec.mimeType || 'audio/webm').split(';')[0];
        const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
        const file = new File(r.chunks, `voice-${Date.now()}.${ext}`, { type });
        this.sendFiles([file], '', { duration });
      };
      try { r.rec.stop(); } catch (e) { r.stream.getTracks().forEach((t) => t.stop()); }
      this.root.querySelector('.cv-composer').hidden = false;
      this.root.querySelector('.cv-recording').hidden = true;
      this._typing(false);
    }

    // ---- composer behaviour ----
    _autosize() { this.ta.style.height = 'auto'; this.ta.style.height = `${Math.min(140, this.ta.scrollHeight)}px`; }
    _onInput() {
      const has = this.ta.value.trim().length > 0;
      this.sendBtn.innerHTML = icon(has ? 'send' : 'mic');
      this.sendBtn.title = has ? T('Send') : T('Record voice message');
      if (this.o.viewer === 'staff') this._updateQr(false);
    }
    _typing(on) {
      clearTimeout(this.typingTimer);
      if (on) {
        if (!this.isTyping) { this.isTyping = true; this.o.socket.emit('typing', { clientId: this.o.clientId(), on: true }); }
        this.typingTimer = setTimeout(() => this._typing(false), 3000);
      } else if (this.isTyping) {
        this.isTyping = false;
        this.o.socket.emit('typing', { clientId: this.o.clientId(), on: false });
      }
    }
    _closePopovers(except) {
      [this.emojiPanel, this.attachMenu, this.qrPanel].forEach((p) => { if (p !== except) p.hidden = true; });
      if (except !== this.qrPanel) this.qrForced = false;
    }
    _toggle(panel) { const show = panel.hidden; this._closePopovers(panel); panel.hidden = !show; return show; }
    _updateQr(forced) {
      if (forced) this.qrForced = true;
      const list = (this.o.quickReplies && this.o.quickReplies()) || [];
      const v = this.ta.value;
      let filter = null;
      if (v.startsWith('/')) filter = v.slice(1).toLowerCase();
      else if (this.qrForced) filter = '';
      if (filter === null) { this.qrPanel.hidden = true; return; }
      this.qrItems = list.filter((q) => !filter || q.title.toLowerCase().includes(filter) || q.body.toLowerCase().includes(filter));
      this.qrSel = 0;
      this.qrPanel.innerHTML = `<div class="qr-head">${T('Quick replies')}</div>${this.qrItems.length
        ? this.qrItems.map((q, i) => `<button type="button" class="qr-item ${i === 0 ? 'sel' : ''}" data-qi="${i}"><div class="qt">/${esc(q.title)}</div><div class="qb">${esc(q.body)}</div></button>`).join('')
        : `<div class="qr-head" style="text-transform:none">${list.length ? T('No match') : T('No quick replies yet - an admin can add them in the Admin panel.')}</div>`}`;
      this._closePopovers(this.qrPanel);
      this.qrPanel.hidden = false;
    }
    _pickQr(i) {
      const q = this.qrItems && this.qrItems[i];
      if (!q) return;
      this.ta.value = q.body;
      this.qrForced = false;
      this.qrPanel.hidden = true;
      this._autosize();
      this._onInput();
      this.ta.focus();
    }
    _insertEmoji(e) {
      const ta = this.ta;
      const s = ta.selectionStart ?? ta.value.length;
      ta.value = ta.value.slice(0, s) + e + ta.value.slice(ta.selectionEnd ?? s);
      ta.selectionStart = ta.selectionEnd = s + e.length;
      this._onInput();
      ta.focus();
    }

    _bind() {
      const r = this.root;
      this.emojiPanel.innerHTML = '😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 😉 😍 🥰 😘 😋 😎 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤯 😳 😱 😨 🤗 🤔 🤭 🤫 😶 😐 😑 😬 🙄 😯 😴 🤤 😷 🤒 🤕 👍 👎 👌 ✌️ 🤞 🙏 👏 🙌 💪 👋 🤝 ❤️ 🧡 💛 💚 💙 💜 🖤 💔 💯 ✅ ❌ ⭐ 🔥 🎉 🎁 📞 📷 📎 📄 ⏰ 🚚 💰'
        .split(' ')
        .map((c) => `<button type="button">${c}</button>`).join('');

      this.ta.addEventListener('input', () => { this._autosize(); this._onInput(); if (this.ta.value) this._typing(true); });
      this.ta.addEventListener('keydown', (e) => {
        if (!this.qrPanel.hidden && this.qrItems && this.qrItems.length) {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            this.qrSel = (this.qrSel + (e.key === 'ArrowDown' ? 1 : -1) + this.qrItems.length) % this.qrItems.length;
            this.qrPanel.querySelectorAll('.qr-item').forEach((b, i) => b.classList.toggle('sel', i === this.qrSel));
            return;
          }
          if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); this._pickQr(this.qrSel); return; }
        }
        if (e.key === 'Escape') { this._closePopovers(); return; }
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && window.matchMedia('(hover: hover)').matches) {
          e.preventDefault();
          this.sendText();
        }
      });
      this.ta.addEventListener('paste', (e) => {
        const files = Array.from(e.clipboardData?.files || []);
        if (files.length) { e.preventDefault(); this.previewFiles(files); }
      });

      r.addEventListener('dragover', (e) => { if (e.dataTransfer?.types.includes('Files')) e.preventDefault(); });
      r.addEventListener('drop', (e) => { if (e.dataTransfer?.files.length) { e.preventDefault(); this.previewFiles(e.dataTransfer.files); } });

      r.addEventListener('click', (e) => {
        const chip = e.target.closest('.order-chip');
        if (chip) { if (this.o.onOrderClick) this.o.onOrderClick(Number(chip.dataset.order)); return; }
        const t = e.target.closest('[data-act], [data-pick], .emoji-panel button, .qr-item, .quote[data-goto], .msg.failed');
        if (!t) { if (!e.target.closest('.popover')) this._closePopovers(); return; }
        if (t.matches('.emoji-panel button')) { this._insertEmoji(t.textContent); return; }
        if (t.matches('.qr-item')) { this._pickQr(Number(t.dataset.qi)); return; }
        if (t.matches('.quote[data-goto]')) {
          const el = this.list.querySelector(`.msg[data-id="${t.dataset.goto}"]`);
          if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
          return;
        }
        if (t.matches('.msg.failed')) { this._retry(t.dataset.temp); return; }
        if (t.dataset.pick) {
          this._closePopovers();
          r.querySelector(`.f-${t.dataset.pick}`).click();
          return;
        }
        switch (t.dataset.act) {
          case 'emoji': this._toggle(this.emojiPanel); break;
          case 'attach': this._toggle(this.attachMenu); break;
          case 'qr': if (this.qrPanel.hidden) this._updateQr(true); else { this.qrForced = false; this.qrPanel.hidden = true; } break;
          case 'send': this._closePopovers(); if (this.ta.value.trim()) this.sendText(); else this._startRecording(); break;
          case 'rec-cancel': this._stopRecording(false); break;
          case 'rec-send': this._stopRecording(true); break;
          case 'cancel-reply': this.clearReply(); break;
          case 'reply': {
            const id = Number(t.closest('.msg').dataset.id);
            const m = this.messages.find((x) => x.id === id);
            if (m) this.setReply(m);
            break;
          }
          default: break;
        }
      });

      ['media', 'camera', 'doc'].forEach((k) => {
        const inp = r.querySelector(`.f-${k}`);
        inp.addEventListener('change', () => { this.previewFiles(inp.files); inp.value = ''; });
      });

      this.list.addEventListener('scroll', () => this._updateScrollBtn(), { passive: true });
      this.scrollBtn.addEventListener('click', () => this.scrollToBottom(true));

      // Long-press a bubble on touch screens to reply.
      let pressTimer;
      this.list.addEventListener('touchstart', (e) => {
        const msgEl = e.target.closest('.msg');
        if (!msgEl || !msgEl.dataset.id) return;
        pressTimer = setTimeout(() => {
          const m = this.messages.find((x) => x.id === Number(msgEl.dataset.id));
          if (m && m.type !== 'call') { if (navigator.vibrate) navigator.vibrate(20); this.setReply(m); }
        }, 550);
      }, { passive: true });
      ['touchend', 'touchmove', 'touchcancel'].forEach((ev) => this.list.addEventListener(ev, () => clearTimeout(pressTimer), { passive: true }));
    }
  }

  // ---------------------------------------------------------------------------
  // Voice / video calls (WebRTC, signaling through Socket.IO)
  // ---------------------------------------------------------------------------
  const ICE = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];

  async function getMedia(video) {
    if (video) {
      try { return await navigator.mediaDevices.getUserMedia({ audio: true, video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } }); } catch (e) { /* fall back to audio */ }
    }
    return navigator.mediaDevices.getUserMedia({ audio: true });
  }

  class CallManager {
    constructor(socket, { viewer, onIncoming } = {}) {
      this.socket = socket;
      this.viewer = viewer;
      this.onIncoming = onIncoming;
      this.call = null;
      const el = document.createElement('div');
      el.className = 'call-overlay';
      el.hidden = true;
      el.innerHTML = `<video class="remote" autoplay playsinline></video><video class="local" autoplay playsinline muted hidden></video>
        <div class="call-info"><div class="cav"></div><div class="call-name"></div><div class="call-status"></div></div>
        <div class="call-actions"></div>`;
      document.body.appendChild(el);
      this.el = el;
      this.remote = el.querySelector('video.remote');
      this.local = el.querySelector('video.local');
      el.querySelector('.call-actions').addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        ({ accept: () => this.accept(), decline: () => this.decline(), end: () => this.hangup(), mute: () => this._toggleTrack('audio'), cam: () => this._toggleTrack('video') })[b.dataset.a]?.();
      });
      socket.on('call:incoming', (p) => this._incoming(p));
      socket.on('call:accepted', (p) => this._accepted(p));
      socket.on('call:cancel', (p) => { if (this.call && this.call.id === p.callId && this.call.state === 'ringing') this._cleanup(T('Answered by a colleague')); });
      socket.on('call:ended', (p) => {
        if (!this.call || this.call.id !== p.callId) return;
        const c = this.call;
        this._cleanup(p.reason === 'declined' ? T('Call declined') : p.reason === 'missed' ? (c.role === 'caller' ? T('No answer') : T('Missed call')) : T('Call ended'));
      });
      socket.on('rtc:signal', (p) => this._signal(p).catch((e) => console.warn('rtc', e)));
      socket.on('disconnect', () => { if (this.call) this._cleanup(T('Connection lost')); });
    }

    get busy() { return !!this.call; }

    async start(video, { clientId, peerName }) {
      if (this.call) return;
      if (!window.RTCPeerConnection || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast(T('Calls need a secure (https) page or a newer browser')); return;
      }
      const c = { id: null, video, role: 'caller', peerName, state: 'calling', candidates: [] };
      this.call = c;
      this._render();
      try { c.stream = await getMedia(video); } catch (e) {
        this._cleanup(); toast(T(video ? 'Please allow microphone and camera access to call' : 'Please allow microphone access to call')); return;
      }
      if (this.call !== c) { c.stream.getTracks().forEach((t) => t.stop()); return; }
      c.video = c.stream.getVideoTracks().length > 0;
      this._showLocal();
      this.socket.timeout(10000).emit('call:start', { clientId, video: c.video }, (err, res) => {
        if (this.call !== c) return;
        if (err || !res || res.error) { this._cleanup(); toast((res && res.error) || T('Could not start the call')); return; }
        c.id = res.callId;
        c.state = 'ringing-out';
        this._tones('ringback');
        this._render();
      });
    }
    async accept() {
      const c = this.call;
      if (!c || c.state !== 'ringing') return;
      c.state = 'connecting';
      this._tones(null);
      this._render();
      try { c.stream = await getMedia(c.video); } catch (e) {
        toast(T('Please allow microphone access to answer')); this.decline(); return;
      }
      if (this.call !== c) { c.stream.getTracks().forEach((t) => t.stop()); return; }
      this._showLocal();
      this._createPc(c);
      this.socket.timeout(10000).emit('call:accept', { callId: c.id }, (err, res) => {
        if (err || !res || res.error) { if (this.call === c) this._cleanup((res && res.error) || T('Call failed')); }
      });
    }
    decline() {
      const c = this.call;
      if (!c) return;
      this.socket.emit('call:reject', { callId: c.id });
      this._cleanup();
    }
    hangup() {
      const c = this.call;
      if (!c) return;
      if (c.id) this.socket.emit('call:end', { callId: c.id });
      this._cleanup(T('Call ended'));
    }

    _incoming(p) {
      if (this.call) return; // already in a call
      this.call = {
        id: p.callId, video: p.video, role: 'callee', state: 'ringing', candidates: [],
        peerName: this.viewer === 'staff' ? p.clientName : p.fromName,
      };
      this._tones('ring');
      this._render();
      if (this.onIncoming) this.onIncoming(p);
    }
    async _accepted(p) {
      const c = this.call;
      if (!c || c.id !== p.callId || c.role !== 'caller') return;
      c.state = 'connecting';
      this._tones(null);
      this._render();
      const pc = this._createPc(c);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.socket.emit('rtc:signal', { callId: c.id, data: { sdp: pc.localDescription } });
    }
    _createPc(c) {
      const pc = new RTCPeerConnection({ iceServers: ICE });
      c.stream.getTracks().forEach((t) => pc.addTrack(t, c.stream));
      pc.onicecandidate = (e) => { if (e.candidate) this.socket.emit('rtc:signal', { callId: c.id, data: { candidate: e.candidate } }); };
      pc.ontrack = (e) => {
        this.remote.srcObject = e.streams[0];
        this.remote.play().catch(() => {});
        if (e.track.kind === 'video') this.el.classList.add('has-video');
        if (c.state !== 'active') {
          c.state = 'active';
          c.startAt = Date.now();
          c.timer = setInterval(() => this._status(), 1000);
          this._render();
        }
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' && this.call === c) { toast(T('Call connection failed')); this.hangup(); }
      };
      c.pc = pc;
      return pc;
    }
    async _signal({ callId, data }) {
      const c = this.call;
      if (!c || c.id !== callId || !c.pc || !data) return;
      const pc = c.pc;
      if (data.sdp) {
        await pc.setRemoteDescription(data.sdp);
        if (data.sdp.type === 'offer') {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          this.socket.emit('rtc:signal', { callId, data: { sdp: pc.localDescription } });
        }
        for (const cand of c.candidates.splice(0)) await pc.addIceCandidate(cand).catch(() => {});
      } else if (data.candidate) {
        if (pc.remoteDescription) await pc.addIceCandidate(data.candidate).catch(() => {});
        else c.candidates.push(data.candidate);
      }
    }
    _showLocal() {
      const c = this.call;
      if (c && c.stream && c.stream.getVideoTracks().length) {
        this.local.srcObject = c.stream;
        this.local.hidden = false;
      }
    }
    _toggleTrack(kind) {
      const c = this.call;
      if (!c || !c.stream) return;
      const tracks = kind === 'audio' ? c.stream.getAudioTracks() : c.stream.getVideoTracks();
      tracks.forEach((t) => { t.enabled = !t.enabled; });
      if (kind === 'audio') c.muted = !tracks[0]?.enabled; else c.camOff = !tracks[0]?.enabled;
      this._render();
    }
    _status() {
      const c = this.call;
      if (!c) return;
      const s = {
        calling: T('Starting…'), 'ringing-out': T('Ringing…'), ringing: T(c.video ? 'Incoming video call' : 'Incoming voice call'),
        connecting: T('Connecting…'), active: fmtDur((Date.now() - c.startAt) / 1000),
      }[c.state] || '';
      this.el.querySelector('.call-status').textContent = s;
    }
    _render() {
      const c = this.call;
      if (!c) return;
      this.el.hidden = false;
      this.el.querySelector('.cav').innerHTML = avatar(c.peerName, c.peerName, `xl ${c.state === 'ringing' || c.state === 'ringing-out' ? 'pulse' : ''}`);
      this.el.querySelector('.call-name').textContent = c.peerName || '';
      this._status();
      const btn = (a, ic, cls = '', title = '') => `<button type="button" class="cbtn ${cls}" data-a="${a}" title="${title}">${icon(ic)}</button>`;
      this.el.querySelector('.call-actions').innerHTML = c.state === 'ringing'
        ? btn('decline', 'callEnd', 'red', T('Decline')) + btn('accept', c.video ? 'video' : 'phone', 'green', T('Answer'))
        : btn('mute', c.muted ? 'micOff' : 'mic', c.muted ? 'on' : '', T('Mute'))
          + (c.video ? btn('cam', c.camOff ? 'videoOff' : 'video', c.camOff ? 'on' : '', T('Camera')) : '')
          + btn('end', 'callEnd', 'red', T('End call'));
    }
    _tones(kind) {
      clearInterval(this.toneTimer);
      if (!kind) return;
      const play = kind === 'ring'
        ? () => { tone(880, 0, 0.35, 0.1); tone(660, 0.45, 0.35, 0.1); }
        : () => { tone(425, 0, 1, 0.05); };
      play();
      this.toneTimer = setInterval(play, kind === 'ring' ? 2000 : 3000);
    }
    _cleanup(message) {
      const c = this.call;
      if (!c) return;
      this.call = null;
      this._tones(null);
      clearInterval(c.timer);
      try { c.pc && c.pc.close(); } catch (e) { /* ignore */ }
      if (c.stream) c.stream.getTracks().forEach((t) => t.stop());
      this.remote.srcObject = null;
      this.local.srcObject = null;
      this.local.hidden = true;
      this.el.classList.remove('has-video');
      if (message) {
        this.el.querySelector('.call-status').textContent = message;
        this.el.querySelector('.call-actions').innerHTML = '';
        setTimeout(() => { if (!this.call) this.el.hidden = true; }, 1400);
      } else this.el.hidden = true;
    }
  }

  window.WA = {
    icon, esc, linkify, avatar, colorFor, initials, fmtTime, dayLabel, listTime, fmtDateTime, fmtDur, fmtSize, ago,
    starsHtml, previewText, toast, openModal, confirmDialog, starInput, openLightbox, makeApi, uploadFile, notifySound,
    ChatView, CallManager, T, systemText, callLabel,
  };
})();
