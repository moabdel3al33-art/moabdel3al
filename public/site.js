(function () {
  'use strict';
  const t = window.t || ((s) => s);

  async function api(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' },
      body: JSON.stringify(body || {}),
    });
    let data = {};
    try { data = await res.json(); } catch (e) { /* empty */ }
    if (!res.ok) throw new Error(data.error || t('Something went wrong'));
    return data;
  }
  function toast(msg) {
    let el = document.querySelector('.toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
    el.textContent = msg; el.hidden = false;
    clearTimeout(el._t); el._t = setTimeout(() => { el.hidden = true; }, 3000);
  }
  const safeNext = (n) => (n && /^\/(?!\/)/.test(n) ? n : '');

  // Mobile menu
  const burger = document.getElementById('burger');
  if (burger) burger.addEventListener('click', () => document.getElementById('navLinks').classList.toggle('open'));

  // Generic forms: <form data-api="/api/..." data-next="/somewhere">
  document.querySelectorAll('form[data-api]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('[type=submit]');
      const err = form.querySelector('.form-error');
      if (err) err.textContent = '';
      const body = Object.fromEntries(new FormData(form).entries());
      form.querySelectorAll('input[type=checkbox][name]').forEach((cb) => { body[cb.name] = cb.checked; });
      btn.disabled = true;
      try {
        const data = await api(form.dataset.api, body);
        const next = safeNext(form.dataset.next);
        if (data.needVerify) {
          const q = new URLSearchParams({ email: data.email });
          if (next) q.set('next', next);
          if (data.devCode) q.set('dev', data.devCode);
          if (data.remember === false) q.set('remember', '0');
          location.href = `/verify?${q}`;
          return;
        }
        if (form.dataset.step === '1') { // forgot password: show step 2
          const f2 = document.querySelector('form[data-step="2"]');
          f2.querySelector('[name=email]').value = data.email;
          if (data.devCode) { const d = f2.querySelector('.devcode'); d.hidden = false; d.textContent = `${t('Testing mode (email not set up yet) — your code is:')} ${data.devCode}`; }
          form.hidden = true; f2.hidden = false;
          f2.querySelector('[name=code]').focus();
          return;
        }
        if (data.redirect) { location.href = data.redirect; return; }
        const thanks = form.querySelector('.form-thanks');
        if (thanks) { // replace the form with its "thank you" message
          [...form.children].forEach((c) => { if (c !== thanks) c.hidden = true; });
          thanks.hidden = false;
          thanks.scrollIntoView({ block: 'center', behavior: 'smooth' });
          return;
        }
        if (form.dataset.done) { toast(form.dataset.done); if (form.hasAttribute('data-reset')) form.reset(); btn.disabled = false; return; }
        location.href = next || (data.staff ? '/admin' : '/account');
      } catch (ex) {
        if (err) err.textContent = ex.message; else toast(ex.message);
        btn.disabled = false;
      }
    });
  });

  document.addEventListener('click', async (e) => {
    const resend = e.target.closest('[data-resend]');
    if (resend) {
      resend.disabled = true;
      try {
        const d = await api('/api/auth/resend', { email: resend.dataset.email, purpose: resend.dataset.resend });
        toast(d.devCode ? `${t('New code')}: ${d.devCode}` : t('A new code was sent to your email'));
      } catch (ex) { toast(ex.message); }
      setTimeout(() => { resend.disabled = false; }, 60000);
      return;
    }
    const buy = e.target.closest('[data-buy]');
    if (buy) {
      buy.disabled = true;
      const err = document.querySelector('.form-error');
      try {
        const d = await api('/api/shop/orders', { type: buy.dataset.buy, id: Number(buy.dataset.id) });
        location.href = d.redirect;
      } catch (ex) { if (err) err.textContent = ex.message; buy.disabled = false; }
      return;
    }
    if (e.target.closest('[data-logout]')) {
      try { await api('/api/auth/logout'); } catch (ex) { /* ignore */ }
      location.href = '/';
    }
  });

  // ---- Payment page ----
  document.querySelectorAll('input[name=pm]').forEach((r) => {
    r.addEventListener('change', () => {
      document.querySelectorAll('.pm').forEach((l) => l.classList.toggle('on', l.contains(r) ? r.checked : false));
      document.querySelectorAll('.pm-panel').forEach((p) => { p.hidden = p.dataset.pm !== r.value; });
    });
  });
  document.addEventListener('click', async (e) => {
    const copy = e.target.closest('[data-copy]');
    if (copy) {
      try { await navigator.clipboard.writeText(copy.dataset.copy); toast(t('Copied')); } catch (ex) { prompt('', copy.dataset.copy); }
      return;
    }
    const pay = e.target.closest('[data-pay]');
    if (pay) {
      pay.disabled = true;
      const err = document.querySelector('[data-pay-err]');
      try {
        const d = await api(`/api/pay/${pay.dataset.order}/${pay.dataset.pay}`);
        location.href = d.redirect;
      } catch (ex) { if (err) err.textContent = ex.message; else toast(ex.message); pay.disabled = false; }
    }
  });
  const proofForm = document.querySelector('.proof-form');
  if (proofForm) {
    const file = proofForm.querySelector('input[type=file]');
    const pv = proofForm.querySelector('.drop-pv');
    file.addEventListener('change', () => {
      const f = file.files[0];
      proofForm.querySelector('.drop').classList.toggle('has', !!f);
      if (f && /^image\//.test(f.type)) { pv.src = URL.createObjectURL(f); pv.hidden = false; } else pv.hidden = true;
      if (f) proofForm.querySelector('.drop-in b').textContent = f.name;
    });
    proofForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = proofForm.querySelector('[type=submit]');
      const err = proofForm.querySelector('.form-error');
      err.textContent = '';
      const f = file.files[0];
      if (!f) { err.textContent = t('Please upload the screenshot of the payment'); return; }
      btn.disabled = true;
      try {
        const fd = new FormData();
        fd.append('file', f, f.name);
        const up = await fetch('/api/upload', { method: 'POST', body: fd, headers: { 'X-Requested-With': 'fetch' } });
        const u = await up.json().catch(() => ({}));
        if (!up.ok) throw new Error(u.error || t('Upload failed'));
        await api(`/api/pay/${proofForm.dataset.order}/proof`, { url: u.url, txn: proofForm.txn.value, note: proofForm.note.value });
        location.reload();
      } catch (ex) { err.textContent = ex.message; btn.disabled = false; }
    });
  }

  // ---- Bottom sheet ("More" menu on phones) ----
  function closeSheets() {
    document.querySelectorAll('.sheet.open').forEach((sh) => { sh.classList.remove('open'); setTimeout(() => { sh.hidden = true; }, 250); });
    document.documentElement.classList.remove('no-scroll');
  }
  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-sheet]');
    if (opener) {
      const sh = document.getElementById(opener.dataset.sheet);
      sh.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => sh.classList.add('open')));
      document.documentElement.classList.add('no-scroll');
      return;
    }
    if (e.target.closest('[data-close-sheet]')) closeSheets();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheets(); });
  document.querySelectorAll('.sheet-panel').forEach((panel) => { // swipe down to close
    let y0 = null;
    panel.addEventListener('touchstart', (e) => { y0 = e.touches[0].clientY; }, { passive: true });
    panel.addEventListener('touchmove', (e) => {
      if (y0 == null) return;
      const dy = e.touches[0].clientY - y0;
      if (dy > 0) panel.style.transform = `translateY(${dy}px)`;
    }, { passive: true });
    panel.addEventListener('touchend', (e) => {
      const dy = (e.changedTouches[0].clientY - (y0 || 0));
      panel.style.transform = '';
      y0 = null;
      if (dy > 70) closeSheets();
    });
  });

  // ---- Account page tabs ----
  const seg = document.querySelector('.seg');
  if (seg) {
    const show = (k, push) => {
      seg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.tab === k));
      document.querySelectorAll('.tab-sec').forEach((sec) => { sec.hidden = sec.dataset.sec !== k; });
      const btn = seg.querySelector(`[data-tab="${k}"]`);
      if (btn) btn.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
      if (push) history.replaceState(null, '', `#${k}`);
    };
    seg.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) show(b.dataset.tab, true); });
    const h = location.hash.slice(1);
    if (h && seg.querySelector(`[data-tab="${h}"]`)) show(h);
  }

  // Live colour preview from Admin > Appearance (only inside the admin's preview frame).
  if (window.parent !== window) {
    window.addEventListener('message', (e) => {
      if (e.origin !== location.origin || !e.data || e.data.type !== 'theme') return;
      const r = document.documentElement.style;
      for (const k of ['bg', 'surface', 'text', 'primary', 'on-primary']) if (e.data.theme[k]) r.setProperty(`--c-${k}`, e.data.theme[k]);
      if (e.data.tone) document.documentElement.dataset.tone = e.data.tone;
    });
  }
})();
