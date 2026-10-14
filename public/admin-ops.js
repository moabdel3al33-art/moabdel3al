/* Admin panel - operations: orders, bookings, clients, team & roles, quick replies. */
(function () {
  'use strict';
  const { esc, avatar, starsHtml, toast, openModal, confirmDialog, T } = WA;
  const ADM = window.ADM;
  const { ic, api, post, put, del, money, date, dateTime, toLocalInput, fromLocalInput, fieldHtml, collect, flag, countryName, fmtPhone } = ADM;

  const ST = { pending: 'Waiting for payment', paid: 'Paid', cancelled: 'Cancelled', pending_payment: 'Waiting for payment', scheduled: 'Scheduled', done: 'Completed' };
  const KIND = { course: '🎓', book: '📚', consultation: '📅' };
  const pill = (s) => `<span class="pill ${esc(s)}">${esc(T(ST[s] || s))}</span>`;
  const chips = (list, cur) => `<div class="chips">${list.map(([k, l]) => `<button class="chip ${cur === k ? 'on' : ''}" data-f="${k}">${esc(T(l))}</button>`).join('')}</div>`;

  ADM.refreshBadges = async () => {
    try {
      const o = await api('/api/admin/overview');
      if (o.pendingOrders != null) ADM.badge('orders', o.pendingOrders);
      if (o.newBookings != null) ADM.badge('bookings', o.newBookings);
      if (o.pendingComments != null) ADM.badge('comments', o.pendingComments);
    } catch (e) { /* ignore */ }
  };
  setInterval(() => ADM.refreshBadges && ADM.refreshBadges(), 60000);

  // ---------------------------------------------------------------------------
  // Orders
  // ---------------------------------------------------------------------------
  let orderFilter = 'pending';
  ADM.views.orders = async (el) => {
    const rows = await api(`/api/admin/orders${orderFilter === 'all' ? '' : `?status=${orderFilter}`}`);
    el.innerHTML = `<div class="toolbar">${chips([['pending', 'Waiting for payment'], ['paid', 'Paid'], ['cancelled', 'Cancelled'], ['all', 'All']], orderFilter)}</div>
      <p class="muted small">${esc(T('When a client pays (in the chat), press "Confirm payment". They get access immediately and are told in the chat.'))}</p>
      <div class="panel"><div class="lst">${rows.map((o) => `<div class="it">
        <div class="grow"><div class="row"><b>#${o.id}</b>${pill(o.status)}<b>${esc(money(o.total))}</b></div>
          <div>${(o.items || '').split(' | ').map((x) => { const [k, ...t] = x.split(':'); return `${KIND[k] || ''} ${esc(t.join(':'))}`; }).join('<br>')}</div>
          <div class="muted small">${esc(o.client_name)} · <span dir="ltr">${esc(o.client_phone || '')}</span> · <span dir="ltr">${esc(o.client_email || '')}</span></div>
          <div class="muted small">${esc(dateTime(o.created_at))}${o.paid_at ? ` · ${esc(T('confirmed by {name}', { name: o.paid_by_name || '—' }))} ${esc(dateTime(o.paid_at))}` : ''}</div></div>
        <div class="row">${o.status === 'pending' ? `<button class="btn green" data-confirm="${o.id}">${ic('check', 'sm')} ${esc(T('Confirm payment'))}</button><button class="btn ghost" data-cancel="${o.id}">${esc(T('Cancel'))}</button>` : ''}
          ${ADM.can('chat') ? `<a class="btn ghost" href="#inbox/${o.user_id}">${ic('chat', 'sm')} ${esc(T('Open chat'))}</a>` : ''}</div></div>`).join('') || `<div class="empty">${esc(T('No orders here.'))}</div>`}</div></div>`;
    el.querySelectorAll('[data-f]').forEach((b) => { b.onclick = () => { orderFilter = b.dataset.f; ADM.views.orders(el); }; });
    el.querySelectorAll('[data-confirm]').forEach((b) => {
      b.onclick = async () => {
        if (!(await confirmDialog(T('Confirm payment?'), T('The client will get access to what they ordered right away and will be told in the chat.'), T('Confirm payment')))) return;
        try { await post(`/api/admin/orders/${b.dataset.confirm}/confirm`); toast(T('Payment confirmed')); ADM.refreshBadges(); ADM.views.orders(el); } catch (e) { toast(e.message); }
      };
    });
    el.querySelectorAll('[data-cancel]').forEach((b) => {
      b.onclick = async () => {
        if (!(await confirmDialog(T('Cancel this order?'), T('The client will be told in the chat.'), T('Cancel order'), true))) return;
        try { await post(`/api/admin/orders/${b.dataset.cancel}/cancel`); ADM.refreshBadges(); ADM.views.orders(el); } catch (e) { toast(e.message); }
      };
    });
  };

  // ---------------------------------------------------------------------------
  // Bookings
  // ---------------------------------------------------------------------------
  let bookingFilter = 'paid';
  ADM.views.bookings = async (el) => {
    const rows = await api(`/api/admin/bookings${bookingFilter === 'all' ? '' : `?status=${bookingFilter}`}`);
    el.innerHTML = `<div class="toolbar">${chips([['paid', 'Paid - to schedule'], ['scheduled', 'Scheduled'], ['pending_payment', 'Waiting for payment'], ['done', 'Completed'], ['cancelled', 'Cancelled'], ['all', 'All']], bookingFilter)}</div>
      <div class="panel"><div class="lst">${rows.map((b) => `<div class="it">
        <div class="grow"><div class="row"><b>${esc(b.title || '')}</b>${pill(b.status)}</div>
          <div>${esc(b.client_name)} · <span dir="ltr">${esc(b.client_phone || '')}</span></div>
          <div class="muted small">${b.scheduled_at ? `📅 ${esc(dateTime(b.scheduled_at))}` : esc(T('Preferred: {when}', { when: [b.preferred_date, b.preferred_time].filter(Boolean).join(' ') }))}</div>
          ${b.notes ? `<div class="small">“${esc(b.notes)}”</div>` : ''}${b.meeting_link ? `<div class="small" dir="ltr">${esc(b.meeting_link)}</div>` : ''}</div>
        <div class="row"><button class="btn" data-edit="${b.id}">${ic('event', 'sm')} ${esc(T('Schedule / update'))}</button>
          ${ADM.can('chat') ? `<a class="btn ghost" href="#inbox/${b.user_id}">${ic('chat', 'sm')}</a>` : ''}</div></div>`).join('') || `<div class="empty">${esc(T('No bookings here.'))}</div>`}</div></div>`;
    el.querySelectorAll('[data-f]').forEach((b) => { b.onclick = () => { bookingFilter = b.dataset.f; ADM.views.bookings(el); }; });
    el.querySelectorAll('[data-edit]').forEach((btn) => { btn.onclick = () => bookingForm(rows.find((r) => r.id === Number(btn.dataset.edit)), () => ADM.views.bookings(el)); });
  };
  function bookingForm(b, done) {
    const m = openModal(`<h2>${esc(b.title || '')}</h2><p class="sub">${esc(b.client_name)} · ${esc(T('Preferred: {when}', { when: [b.preferred_date, b.preferred_time].filter(Boolean).join(' ') }))}</p>
      <div class="fgrid" id="bf">
        ${fieldHtml({ k: 'status', l: 'Status', type: 'select', options: Object.keys(ST).filter((k) => k !== 'pending').map((k) => [k, ST[k]]) }, b.status)}
        ${fieldHtml({ k: 'scheduled_at', l: 'Appointment date & time', type: 'datetime' }, b.scheduled_at)}
        ${fieldHtml({ k: 'meeting_link', l: 'Meeting link (Zoom / Google Meet)', type: 'url', full: 1 }, b.meeting_link)}
        ${fieldHtml({ k: 'admin_note', l: 'Private note (team only)', type: 'textarea', rows: 2 }, b.admin_note)}
        ${fieldHtml({ k: 'notify', l: 'Send the appointment details to the client in the chat', type: 'check' }, 1)}
      </div><div class="error-text err"></div>
      <div class="actions"><button class="btn ghost" data-close>${esc(T('Cancel'))}</button><button class="btn" data-ok>${esc(T('Save'))}</button></div>`);
    m.el.classList.add('wide');
    m.el.querySelector('[data-ok]').onclick = async () => {
      try { await put(`/api/admin/bookings/${b.id}`, collect(m.el.querySelector('#bf'))); m.close(); toast(T('Saved')); ADM.refreshBadges(); done(); } catch (e) { m.el.querySelector('.err').textContent = e.message; }
    };
  }

  // ---------------------------------------------------------------------------
  // Clients
  // ---------------------------------------------------------------------------
  // Filters are kept while moving between pages.
  const CF = { q: '', country: '', status: '', type: '', days: 30 };
  const TYPE_PILL = { guest: ['Chat only', ''], account: ['Account', 'ok'], pending: ['Email not verified', 'warn'] };
  let lastRows = [];

  ADM.views.clients = async (el, arg) => {
    if (arg) return clientPage(el, Number(arg));
    const stats = await api(`/api/admin/clients/stats?days=${CF.days}`);
    const tt = stats.totals;
    ADM.setTitle(T('Clients'), `<button class="btn ghost" id="csv">${ic('download', 'sm')} ${esc(T('Export (Excel/CSV)'))}</button>`);
    const card = (k, v, f) => `<a class="kcard ${f && CF[f[0]] === f[1] ? 'hot' : ''}" ${f ? `data-set="${f[0]}:${f[1]}" href="javascript:void 0"` : ''}><div class="k">${esc(T(k))}</div><div class="v">${v}</div></a>`;
    const max = Math.max(1, ...stats.byCountry.map((c) => c.total));
    el.innerHTML = `<div class="cards">
        ${card('All clients', tt.total, ['status', ''])}
        ${card('Active', `${tt.active} <small>${esc(T('last {n} days', { n: CF.days }))}</small>`, ['status', 'active'])}
        ${card('Inactive', tt.inactive, ['status', 'inactive'])}
        ${card('New this week', tt.new_week)}
        ${card('With account', tt.accounts, ['type', 'account'])}
        ${card('Chat only', tt.guests, ['type', 'guest'])}
        ${card('Buyers', tt.buyers, ['type', 'buyers'])}
        ${card('Countries', tt.countries)}
      </div>
      <div class="panel"><div class="panel-head"><h3>${esc(T('Clients by country'))}</h3>
        <label class="row small muted">${esc(T('"Active" means used the site or chat in the last'))}
          <select id="days" class="search" style="min-width:0;border-radius:8px;padding:4px 8px">${[7, 30, 90, 180].map((d) => `<option value="${d}" ${d === CF.days ? 'selected' : ''}>${esc(T('{n} days', { n: d }))}</option>`).join('')}</select></label></div>
        <div class="table-wrap">${stats.byCountry.length ? `<table class="tbl"><thead><tr><th>${esc(T('Country'))}</th><th>${esc(T('Clients'))}</th><th></th><th>${esc(T('Active'))}</th><th>${esc(T('Inactive'))}</th><th>${esc(T('With account'))}</th><th>${esc(T('Chat only'))}</th><th>${esc(T('Buyers'))}</th></tr></thead>
          <tbody>${stats.byCountry.map((c) => `<tr class="click ${CF.country === c.country ? 'sel' : ''}" data-country="${esc(c.country)}">
            <td><div class="nm">${flag(c.country)} <b>${esc(countryName(c.country))}</b></div></td><td><b>${c.total}</b></td>
            <td><div class="share"><span style="width:${(c.total / max) * 100}%"></span></div></td>
            <td><span class="dot on"></span> ${c.active}</td><td><span class="dot"></span> ${c.inactive}</td><td>${c.accounts}</td><td>${c.guests}</td><td>${c.buyers}</td></tr>`).join('')}</tbody></table>`
        : `<div class="empty">${esc(T('No clients yet.'))}</div>`}</div></div>
      <div class="toolbar">
        <div class="search grow">${ic('search', 'sm')}<input id="cq" value="${esc(CF.q)}" placeholder="${esc(T('Search by name, phone or email'))}"></div>
        <select id="fCountry" class="search" style="border-radius:999px;padding:8px 12px"><option value="">${esc(T('All countries'))}</option>
          ${stats.byCountry.filter((c) => c.country !== '--').map((c) => `<option value="${c.country}" ${CF.country === c.country ? 'selected' : ''}>${esc(countryName(c.country))} (${c.total})</option>`).join('')}</select>
        <select id="fStatus" class="search" style="border-radius:999px;padding:8px 12px">${[['', 'Active & inactive'], ['active', 'Active'], ['inactive', 'Inactive']].map(([v, l]) => `<option value="${v}" ${CF.status === v ? 'selected' : ''}>${esc(T(l))}</option>`).join('')}</select>
        <select id="fType" class="search" style="border-radius:999px;padding:8px 12px">${[['', 'All types'], ['account', 'With account'], ['guest', 'Chat only'], ['buyers', 'Buyers'], ['pending', 'Email not verified']].map(([v, l]) => `<option value="${v}" ${CF.type === v ? 'selected' : ''}>${esc(T(l))}</option>`).join('')}</select>
      </div>
      <div id="ct"><div class="empty">${esc(T('Loading…'))}</div></div>`;

    const load = async () => {
      const qs = new URLSearchParams({ q: CF.q, country: CF.country, status: CF.status, type: CF.type, days: CF.days });
      const rows = await api(`/api/admin/clients?${qs}`);
      lastRows = rows;
      el.querySelector('#ct').innerHTML = `<div class="panel"><div class="panel-head"><h3>${esc(T('{n} clients', { n: rows.length }))}</h3></div><div class="table-wrap">${rows.length ? `<table class="tbl"><thead><tr>
          <th>${esc(T('Name'))}</th><th>${esc(T('Country'))}</th><th>${esc(T('Phone'))}</th><th>${esc(T('Last active'))}</th><th>${esc(T('Messages'))}</th><th>${esc(T('Paid orders'))}</th><th>${esc(T('Total spent'))}</th><th>${esc(T('Joined'))}</th></tr></thead>
        <tbody>${rows.map((c) => `<tr class="click" data-id="${c.id}">
          <td><div class="nm"><span class="dot ${c.is_active ? 'on' : ''}" title="${esc(T(c.is_active ? 'Active' : 'Inactive'))}"></span>${WA.avatar(c.name, c.id)}<div>${esc(c.name)} ${WA.starsHtml(c.client_rating)}
            <div><span class="pill ${TYPE_PILL[c.type][1]}">${esc(T(TYPE_PILL[c.type][0]))}</span>${!c.active ? ` <span class="pill bad">${esc(T('Blocked'))}</span>` : ''}</div>${c.email ? `<div class="muted small" dir="ltr">${esc(c.email)}</div>` : ''}</div></div></td>
          <td>${flag(c.country)} ${esc(countryName(c.country))}</td><td dir="ltr">${esc(fmtPhone(c.phone, c.country) || '')}</td>
          <td class="small">${esc(WA.ago(c.last_active))}</td><td>${c.messages}</td><td>${c.paid_orders}</td><td>${esc(money(c.spent))}</td><td class="muted small">${esc(date(c.created_at))}</td></tr>`).join('')}</tbody></table>`
        : `<div class="empty">${esc(T('No clients found.'))}</div>`}</div></div>`;
      el.querySelectorAll('tr[data-id]').forEach((tr) => { tr.onclick = () => ADM.go(`#clients/${tr.dataset.id}`); });
    };
    const rerender = () => ADM.views.clients(el);
    let timer;
    el.querySelector('#cq').oninput = (e) => { CF.q = e.target.value; clearTimeout(timer); timer = setTimeout(load, 300); };
    el.querySelector('#fCountry').onchange = (e) => { CF.country = e.target.value; rerender(); };
    el.querySelector('#fStatus').onchange = (e) => { CF.status = e.target.value; rerender(); };
    el.querySelector('#fType').onchange = (e) => { CF.type = e.target.value; rerender(); };
    el.querySelector('#days').onchange = (e) => { CF.days = Number(e.target.value); rerender(); };
    el.querySelectorAll('tr[data-country]').forEach((tr) => { tr.onclick = () => { CF.country = CF.country === tr.dataset.country ? '' : tr.dataset.country; rerender(); }; });
    el.querySelectorAll('[data-set]').forEach((a) => {
      a.onclick = () => { const [k, v] = a.dataset.set.split(':'); CF[k] = CF[k] === v ? '' : v; if (k === 'status' && !v) { CF.type = ''; CF.country = ''; } rerender(); };
    });
    document.getElementById('csv').onclick = () => {
      const head = ['Name', 'Phone', 'Country', 'Email', 'Type', 'Active', 'Last active', 'Messages', 'Paid orders', 'Total spent', 'Joined'];
      const lines = [head, ...lastRows.map((c) => [c.name, fmtPhone(c.phone, c.country) || '', countryName(c.country), c.email || '', T(TYPE_PILL[c.type][0]),
        T(c.is_active ? 'Active' : 'Inactive'), dateTime(c.last_active), c.messages, c.paid_orders, c.spent, date(c.created_at)])];
      const csv = lines.map((r) => r.map((v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
      a.download = `clients-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
    };
    await load();
  };
  async function clientPage(el, id) {
    const [info, catalog] = await Promise.all([api(`/api/admin/clients/${id}`), api('/api/admin/catalog')]);
    const c = info.client;
    ADM.setTitle(c.name, ADM.can('chat') ? `<a class="btn" href="#inbox/${c.id}">${ic('chat', 'sm')} ${esc(T('Open chat'))}</a>` : '');
    el.innerHTML = `<a class="btn small ghost" href="#clients">${ic('back', 'sm')} ${esc(T('Back'))}</a>
      <div class="panel" style="margin-top:12px"><div class="panel-body row">${avatar(c.name, c.id, 'lg', c.online)}
        <div class="grow"><div style="font-size:19px;font-weight:800">${esc(c.name)} ${starsHtml(c.client_rating, 'sm')}</div>
        <div class="muted small">${flag(c.country)} ${esc(countryName(c.country))} · <span dir="ltr">${esc(fmtPhone(c.phone, c.country) || '')}</span>${c.email ? ` · <span dir="ltr">${esc(c.email)}</span>` : ''} · ${esc(T('Joined {date}', { date: date(c.created_at) }))}</div>
        <div style="margin-top:4px"><span class="pill ${c.is_guest ? '' : c.email_verified ? 'ok' : 'warn'}">${esc(T(c.is_guest ? 'Chat only' : c.email_verified ? 'Account' : 'Email not verified'))}</span>
          ${c.last_seen ? `<span class="muted small">${esc(T('last seen {time}', { time: dateTime(c.last_seen) }))}</span>` : ''}</div>
        ${c.client_note ? `<div class="small">📝 ${esc(c.client_note)}</div>` : ''}</div>
        ${ADM.can('accounts') ? `<div class="row"><label class="switch"><input type="checkbox" id="active" ${c.active ? 'checked' : ''}> ${esc(T('Account active'))}</label>
          <button class="btn small danger" id="delClient">${ic('trash', 'sm')} ${esc(T('Delete account'))}</button></div>` : (!c.active ? `<span class="pill bad">${esc(T('Blocked'))}</span>` : '')}</div></div>
      <div class="panel"><div class="panel-head"><h3>👑 ${esc(T('Membership'))}</h3>
          ${info.memberUntil ? `<span class="pill ok">${esc(T('Active until {date}', { date: date(info.memberUntil) }))}</span>` : `<span class="pill">${esc(T('No active membership'))}</span>`}</div>
        ${info.subscriptions.length ? `<div class="lst">${info.subscriptions.map((sb) => `<div class="it"><div class="grow"><b>${esc(sb.plan_title || T('Membership'))}</b> <span class="pill ${sb.status === 'active' && Number(sb.ends_at) > Date.now() ? 'ok' : sb.status === 'cancelled' ? 'bad' : ''}">${esc(T(sb.status === 'cancelled' ? 'Cancelled' : Number(sb.ends_at) > Date.now() ? 'Active' : 'Expired'))}</span>
          <div class="muted small">${esc(date(sb.starts_at))} → ${esc(date(sb.ends_at))} · ${sb.order_id ? esc(T('Order #{id}', { id: sb.order_id })) : esc(T('given by {name}', { name: sb.granted_by_name || '—' }))}</div></div>
          ${sb.status === 'active' && Number(sb.ends_at) > Date.now() && ADM.can('orders') ? `<button class="btn small ghost" data-cancelsub="${sb.id}">${esc(T('Cancel'))}</button>` : ''}</div>`).join('')}</div>` : ''}
        <div class="panel-body row" style="border-top:1px solid var(--line)"><select id="subMonths" class="search" style="flex:1;border-radius:10px;padding:8px">
          ${[1, 3, 6, 12].map((n) => `<option value="${n}">${esc(T('{n} month(s)', { n }))}</option>`).join('')}</select>
          <button class="btn" id="grantSub">👑 ${esc(T('Give membership for free'))}</button></div></div>
      <div class="two">
        <div class="panel"><div class="panel-head"><h3>${esc(T('Owned courses & books'))}</h3></div>
          <div class="lst">${info.entitlements.map((e) => `<div class="it"><span>${KIND[e.item_type]}</span><div class="grow">${esc(e.title || `#${e.item_id}`)}<div class="muted small">${esc(date(e.created_at))}${e.order_id ? ` · ${esc(T('Order #{id}', { id: e.order_id }))}` : ` · ${esc(T('given manually'))}`}</div></div>
            <button class="btn small ghost" data-revoke="${e.id}">${esc(T('Remove access'))}</button></div>`).join('') || `<div class="empty">${esc(T('Nothing yet.'))}</div>`}</div>
          <div class="panel-body row" style="border-top:1px solid var(--line)"><select id="grantSel" class="search" style="flex:1;border-radius:10px;padding:8px">
            ${catalog.courses.map((x) => `<option value="course:${x.id}">🎓 ${esc(x.title)}</option>`).join('')}${catalog.books.map((x) => `<option value="book:${x.id}">📚 ${esc(x.title)}</option>`).join('')}</select>
            <button class="btn" id="grant">${esc(T('Give access for free'))}</button></div></div>
        <div class="panel"><div class="panel-head"><h3>${esc(T('Orders'))}</h3></div><div class="lst">${info.orders.map((o) => `<div class="it"><div class="grow"><div class="row"><b>#${o.id}</b>${pill(o.status)}<b>${esc(money(o.total))}</b></div>
          <div class="small">${esc(o.items || '')}</div><div class="muted small">${esc(dateTime(o.created_at))}</div></div></div>`).join('') || `<div class="empty">${esc(T('No orders yet.'))}</div>`}</div></div>
      </div>
      ${info.bookings.length ? `<div class="panel"><div class="panel-head"><h3>${esc(T('Consultations'))}</h3></div><div class="lst">${info.bookings.map((b) => `<div class="it"><div class="grow"><b>${esc(b.title || '')}</b> ${pill(b.status)}
        <div class="muted small">${b.scheduled_at ? esc(dateTime(b.scheduled_at)) : esc([b.preferred_date, b.preferred_time].filter(Boolean).join(' '))}</div></div></div>`).join('')}</div></div>` : ''}`;
    const act = el.querySelector('#active');
    if (act) act.onchange = async (e) => { try { await put(`/api/admin/clients/${id}`, { active: e.target.checked }); toast(T('Saved')); } catch (ex) { toast(ex.message); } };
    const dc = el.querySelector('#delClient');
    if (dc) {
      dc.onclick = async () => {
        if (!(await confirmDialog(T('Delete this account permanently?'), T('All chats, orders, bookings and access of this client will be deleted. This cannot be undone.'), T('Delete account'), true))) return;
        try { await del(`/api/admin/clients/${id}`); toast(T('Deleted')); ADM.go('#clients'); } catch (e) { toast(e.message); }
      };
    }
    el.querySelector('#grantSub').onclick = async () => {
      const months = Number(el.querySelector('#subMonths').value);
      if (!(await confirmDialog(T('Give membership?'), T('{name} will get access to all courses and books for {n} month(s), for free. They will be told in the chat.', { name: c.name, n: months }), T('Give membership')))) return;
      try { await post(`/api/admin/clients/${id}/membership`, { months }); toast(T('Membership given')); clientPage(el, id); } catch (e) { toast(e.message); }
    };
    el.querySelectorAll('[data-cancelsub]').forEach((b) => {
      b.onclick = async () => {
        if (!(await confirmDialog(T('Cancel this membership?'), T('The client loses access to the content included in it.'), T('Cancel membership'), true))) return;
        await post(`/api/admin/subscriptions/${b.dataset.cancelsub}/cancel`); clientPage(el, id);
      };
    });
    el.querySelector('#grant').onclick = async () => {
      const [type, itemId] = el.querySelector('#grantSel').value.split(':');
      if (!itemId) return;
      try { await post(`/api/admin/clients/${id}/grant`, { type, item_id: Number(itemId) }); toast(T('Access given')); clientPage(el, id); } catch (e) { toast(e.message); }
    };
    el.querySelectorAll('[data-revoke]').forEach((b) => {
      b.onclick = async () => {
        if (!(await confirmDialog(T('Remove access?'), T('The client will no longer be able to open this.'), T('Remove access'), true))) return;
        await del(`/api/admin/clients/${id}/grant/${b.dataset.revoke}`); clientPage(el, id);
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Team & roles
  // ---------------------------------------------------------------------------
  const ROLES = [
    ['support', 'Customer support', 'Chats with clients, confirms payments, manages bookings.'],
    ['editor', 'Content editor', 'Adds and edits courses, books, articles, social posts and site texts.'],
    ['admin', 'Admin', 'Full access to everything except creating, editing or deleting accounts.'],
  ];
  ADM.views.team = async (el, arg) => {
    if (arg) return memberPage(el, Number(arg));
    const rows = await api('/api/admin/team');
    ADM.setTitle(T('Team & roles'), ADM.can('team') ? `<button class="btn" id="addMember">${ic('add', 'sm')} ${esc(T('Add team member'))}</button>` : '');
    el.innerHTML = `<div class="panel"><div class="panel-body"><div class="row" style="align-items:flex-start">${ROLES.map(([, l, d]) => `<div style="flex:1;min-width:200px"><span class="pill role">${esc(T(l))}</span><div class="muted small" style="margin-top:4px">${esc(T(d))}</div></div>`).join('')}</div></div></div>
      <div class="panel"><div class="table-wrap"><table class="tbl"><thead><tr><th>${esc(T('Name'))}</th><th>${esc(T('Login'))}</th><th>${esc(T('Role'))}</th><th>${esc(T('Status'))}</th><th>${esc(T('Rating'))}</th><th>${esc(T('Chats ended'))}</th></tr></thead>
      <tbody>${rows.map((u) => `<tr class="click" data-id="${u.id}"><td><div class="nm">${avatar(u.name, u.name, '', u.online)}${esc(u.name)}</div></td>
        <td dir="ltr" class="small">${esc(u.email || fmtPhone(u.phone, u.country) || u.login || '')}</td><td><span class="pill role">${esc(ADM.roleLabel(u))}</span></td>
        <td>${u.active ? (u.online ? `<span class="pill ok">${esc(T('Online'))}</span>` : `<span class="pill">${esc(T('Offline'))}</span>`) : `<span class="pill bad">${esc(T('Disabled'))}</span>`}</td>
        <td>${u.avg_rating ? `${starsHtml(u.avg_rating)} ${u.avg_rating.toFixed(1)}` : '—'}</td><td>${u.chats_closed}</td></tr>`).join('')}</tbody></table></div></div>`;
    const addBtn = document.getElementById('addMember');
    if (addBtn) addBtn.onclick = () => memberForm(null, () => ADM.views.team(el));
    if (!ADM.can('team')) el.insertAdjacentHTML('afterbegin', `<p class="muted small">🔒 ${esc(T('Only the owner can add, edit or delete team accounts.'))}</p>`);
    el.querySelectorAll('tr[data-id]').forEach((tr) => { tr.onclick = () => ADM.go(`#team/${tr.dataset.id}`); });
  };
  function memberForm(u, done) {
    const isNew = !u;
    const me = ADM.user;
    const roles = ROLES;
    const canRole = isNew || !u.is_super;
    const self = u && u.id === me.id;
    const m = openModal(`<h2>${esc(isNew ? T('Add team member') : T('Edit {name}', { name: u.name }))}</h2>
      <div class="fgrid" id="mf">
        ${fieldHtml({ k: 'name', l: 'Full name', req: 1, full: 1 }, u && u.name)}
        ${fieldHtml({ k: 'email', l: 'Email (used to log in)', type: 'email', ltr: 1 }, u && u.email)}
        ${fieldHtml({ k: 'phone', l: 'Phone (can also be used to log in)', type: 'phone', full: 1 }, u ? { phone: u.phone, country: u.country } : null)}
        ${fieldHtml({ k: 'password', l: isNew ? 'Password (min 6 characters)' : 'New password (leave empty to keep)', type: 'text', ltr: 1 }, '')}
        ${canRole ? fieldHtml({ k: 'role', l: 'Role', type: 'select', options: roles.map(([k, l]) => [k, l]) }, u ? u.role : 'support') : ''}
        ${!isNew && !self && !u.is_super ? fieldHtml({ k: 'active', l: 'Account active (turn off to block login)', type: 'check' }, u.active) : ''}
      </div><div class="error-text err"></div>
      <div class="actions">${!isNew && !self && !u.is_super ? `<button class="btn ghost" data-delmember style="color:#ff6b81">${ic('trash', 'sm')} ${esc(T('Delete account'))}</button><span class="spacer"></span>` : ''}
        <button class="btn ghost" data-close>${esc(T('Cancel'))}</button><button class="btn" data-ok>${esc(T(isNew ? 'Create account' : 'Save'))}</button></div>`);
    m.el.classList.add('wide');
    const dm = m.el.querySelector('[data-delmember]');
    if (dm) {
      dm.onclick = async () => {
        if (!(await confirmDialog(T('Delete this account permanently?'), T('{name} will not be able to log in any more. Their past chat messages stay.', { name: u.name }), T('Delete account'), true))) return;
        try { await del(`/api/admin/team/${u.id}`); m.close(); toast(T('Deleted')); ADM.go('#team'); } catch (e) { toast(e.message); }
      };
    }
    m.el.querySelector('[data-ok]').onclick = async () => {
      const body = collect(m.el.querySelector('#mf'));
      try {
        if (isNew) await post('/api/admin/team', body); else await put(`/api/admin/team/${u.id}`, body);
        m.close(); toast(T('Saved')); done();
      } catch (e) { m.el.querySelector('.err').textContent = e.message; }
    };
  }
  async function memberPage(el, id) {
    const { user: u, ratings, distribution } = await api(`/api/admin/team/${id}`);
    const canEdit = ADM.can('team') && !u.is_super;
    ADM.setTitle(u.name, canEdit ? `<button class="btn ghost" id="editMember">${ic('edit', 'sm')} ${esc(T('Edit'))}</button>` : '');
    const max = Math.max(1, ...distribution);
    const card = (k, v) => `<div class="kcard"><div class="k">${esc(T(k))}</div><div class="v">${v}</div></div>`;
    el.innerHTML = `<a class="btn small ghost" href="#team">${ic('back', 'sm')} ${esc(T('Back'))}</a>
      <div class="panel" style="margin-top:12px"><div class="panel-body row">${avatar(u.name, u.name, 'lg', u.online)}<div class="grow"><div style="font-size:19px;font-weight:800">${esc(u.name)}</div>
        <div class="muted small"><span class="pill role">${esc(ADM.roleLabel(u))}</span> <span dir="ltr">${esc(u.email || u.phone || u.login || '')}</span> ${u.active ? '' : `<span class="pill bad">${esc(T('Disabled'))}</span>`}</div></div></div></div>
      <div class="cards">${card('Average rating', u.avg_rating ? `${u.avg_rating.toFixed(1)} <small>/ 5</small>` : '—')}${card('Ratings received', u.ratings_count)}${card('Chats ended', u.chats_closed)}
        ${card('Messages sent', u.messages_sent)}${card('Clients served', u.clients_served)}${card('Payments confirmed', u.orders_confirmed)}</div>
      <div class="two">
        <div class="panel"><div class="panel-head"><h3>${esc(T('Rating breakdown'))}</h3></div><div class="panel-body">${[5, 4, 3, 2, 1].map((s) => `<div class="row" style="margin:6px 0"><span style="width:40px">${s} ★</span>
          <div style="flex:1;height:10px;background:var(--surface-2);border-radius:5px;overflow:hidden"><div style="height:100%;width:${(distribution[s - 1] / max) * 100}%;background:var(--star)"></div></div><span style="width:24px">${distribution[s - 1]}</span></div>`).join('')}</div></div>
        <div class="panel"><div class="panel-head"><h3>${esc(T('Client comments'))}</h3></div><div class="lst">${ratings.filter((r) => r.comment).slice(0, 10).map((r) => `<div class="it"><div class="grow">${starsHtml(r.rating, 'sm')} <span class="muted small">${esc(r.client_name)}</span><div>“${esc(r.comment)}”</div></div></div>`).join('') || `<div class="empty">${esc(T('No comments yet.'))}</div>`}</div></div>
      </div>
      <div class="panel"><div class="panel-head"><h3>${esc(T('Chats ended by {name}', { name: u.name }))} (${ratings.length})</h3></div><div class="lst">${ratings.map((r) => `<div class="it">${avatar(r.client_name, r.client_id)}<div class="grow"><b>${esc(r.client_name)}</b> <span class="muted small">${esc(T('Chat #{id}', { id: r.id }))} · ${esc(dateTime(r.closed_at))}</span>
        <div>${r.rating ? starsHtml(r.rating, 'sm') : `<span class="muted small">${esc(T(r.status === 'awaiting_rating' ? 'Waiting for rating' : 'Not rated'))}</span>`}</div>${r.comment ? `<div>“${esc(r.comment)}”</div>` : ''}</div>
        ${ADM.can('chat') ? `<a class="btn small ghost" href="#inbox/${r.client_id}">${esc(T('Open chat'))}</a>` : ''}</div>`).join('') || `<div class="empty">${esc(T('No chats ended yet.'))}</div>`}</div></div>`;
    const eb = document.getElementById('editMember');
    if (eb) eb.onclick = () => memberForm(u, () => memberPage(el, id));
  }

  // ---------------------------------------------------------------------------
  // Quick replies
  // ---------------------------------------------------------------------------
  ADM.views.quick = async (el) => {
    const rows = await api('/api/admin/r/quick_replies');
    ADM.setTitle(T('Quick replies'), `<button class="btn" id="addQr">${ic('add', 'sm')} ${esc(T('Add quick reply'))}</button>`);
    el.innerHTML = `<p class="muted">${esc(T('Ready answers your team can insert in the chat with the ⚡ button or by typing / in the message box.'))}</p>
      <div class="panel"><div class="lst">${rows.map((q) => `<div class="it"><div class="grow"><b style="color:var(--c-primary)">/${esc(q.title)}</b><div class="muted" style="white-space:pre-wrap">${esc(q.body)}</div></div>
        <button class="btn small ghost" data-edit="${q.id}">${ic('edit', 'sm')}</button><button class="btn small ghost" data-del="${q.id}">${ic('trash', 'sm')}</button></div>`).join('') || `<div class="empty">${esc(T('No quick replies yet.'))}</div>`}</div></div>`;
    const reload = () => ADM.views.quick(el);
    document.getElementById('addQr').onclick = () => qrForm({}, reload);
    el.querySelectorAll('[data-edit]').forEach((b) => { b.onclick = () => qrForm(rows.find((q) => q.id === Number(b.dataset.edit)), reload); });
    el.querySelectorAll('[data-del]').forEach((b) => {
      b.onclick = async () => { if (await confirmDialog(T('Delete quick reply?'), '', T('Delete'), true)) { await del(`/api/admin/r/quick_replies/${b.dataset.del}`); reload(); } };
    });
  };
  function qrForm(q, done) {
    const m = openModal(`<h2>${esc(T(q.id ? 'Edit quick reply' : 'Add quick reply'))}</h2><div class="fgrid" id="qf">
      ${fieldHtml({ k: 'title', l: 'Short name (type /name in the chat to find it)', req: 1, full: 1 }, q.title)}
      ${fieldHtml({ k: 'body', l: 'Message', type: 'textarea', rows: 5, full: 1 }, q.body)}</div>
      <div class="error-text err"></div><div class="actions"><button class="btn ghost" data-close>${esc(T('Cancel'))}</button><button class="btn" data-ok>${esc(T('Save'))}</button></div>`);
    m.el.querySelector('[data-ok]').onclick = async () => {
      const body = collect(m.el.querySelector('#qf'));
      try { if (q.id) await put(`/api/admin/r/quick_replies/${q.id}`, body); else await post('/api/admin/r/quick_replies', body); m.close(); done(); } catch (e) { m.el.querySelector('.err').textContent = e.message; }
    };
  }

  // ---------------------------------------------------------------------------
  // Comments (approve before they appear on the site)
  // ---------------------------------------------------------------------------
  let commentFilter = 'pending';
  const TARGET = { site: ['⭐', 'Reviews page'], course: ['🎓', 'Course'], book: ['📚', 'Book'], post: ['📝', 'Article'] };
  const targetUrl = (c) => (c.target_type === 'site' ? '/reviews' : `/${{ course: 'courses', book: 'books', post: 'blog' }[c.target_type]}/${encodeURIComponent(c.target_slug || '')}#comments`);
  ADM.views.comments = async (el) => {
    const { rows, pending } = await api(`/api/admin/comments?status=${commentFilter}`);
    ADM.badge('comments', pending);
    el.innerHTML = `<div class="toolbar">${chips([['pending', 'Waiting for approval'], ['approved', 'Published'], ['rejected', 'Rejected']], commentFilter)}</div>
      <p class="muted small">${esc(T('Comments appear on the website only after you press Publish. Featured comments are shown first on the home page.'))}</p>
      <div class="cgrid">${rows.map((c) => `<div class="panel ccard" data-id="${c.id}">
        <div class="panel-body">
          <div class="row"><b>${esc(c.name)}</b>${c.rating ? starsHtml(c.rating, 'sm') : ''}${c.featured ? `<span class="pill ok">⭐ ${esc(T('Featured'))}</span>` : ''}<span class="spacer"></span><span class="muted small">${esc(dateTime(c.created_at))}</span></div>
          <div class="muted small">${TARGET[c.target_type][0]} ${esc(T(TARGET[c.target_type][1]))}${c.target_title ? `: <a href="${esc(targetUrl(c))}" target="_blank">${esc(c.target_title)}</a>` : ''}
            ${c.user_id ? ` · ${flag(c.country)} <span dir="ltr">${esc(fmtPhone(c.phone, c.country) || c.email || '')}</span>` : ` · ${esc(T('Visitor'))}`}</div>
          <p style="white-space:pre-wrap;margin:10px 0">${esc(c.body)}</p>
          ${c.reply ? `<div class="small" style="border-inline-start:3px solid var(--c-primary);padding:6px 10px;background:var(--soft);border-radius:8px"><b>${esc(T('Reply'))} (${esc(c.reply_by_name || '')}):</b> ${esc(c.reply)}</div>` : ''}
          ${c.reviewed_by_name ? `<div class="muted small" style="margin-top:6px">${esc(T(c.status === 'approved' ? 'Published by {name}' : 'Rejected by {name}', { name: c.reviewed_by_name }))}</div>` : ''}
        </div>
        <div class="sa row" style="padding:8px 12px;border-top:1px solid var(--line);gap:6px">
          ${c.status !== 'approved' ? `<button class="btn small green" data-a="approve">${ic('check', 'sm')} ${esc(T('Publish'))}</button>` : ''}
          ${c.status !== 'rejected' ? `<button class="btn small ghost" data-a="reject">${esc(T('Reject'))}</button>` : ''}
          <button class="btn small ghost" data-a="reply">${ic('reply', 'sm')} ${esc(T(c.reply ? 'Edit reply' : 'Reply'))}</button>
          ${c.status === 'approved' ? `<button class="btn small ghost" data-a="${c.featured ? 'unfeature' : 'feature'}">⭐ ${esc(T(c.featured ? 'Remove from home' : 'Feature on home'))}</button>` : ''}
          <span class="spacer"></span><button class="icon-btn" data-a="delete" title="${esc(T('Delete'))}">${ic('trash', 'sm')}</button>
        </div></div>`).join('') || `<div class="empty">${esc(T(commentFilter === 'pending' ? 'No comments waiting. All done!' : 'Nothing here yet.'))}</div>`}</div>`;
    el.querySelectorAll('[data-f]').forEach((b) => { b.onclick = () => { commentFilter = b.dataset.f; ADM.views.comments(el); }; });
    el.querySelectorAll('.ccard [data-a]').forEach((b) => {
      b.onclick = async () => {
        const id = b.closest('.ccard').dataset.id;
        const c = rows.find((x) => String(x.id) === id);
        const a = b.dataset.a;
        try {
          if (a === 'delete') {
            if (!(await confirmDialog(T('Delete this comment?'), '', T('Delete'), true))) return;
            await del(`/api/admin/comments/${id}`);
          } else if (a === 'reply') {
            const m = openModal(`<h2>${esc(T('Reply to {name}', { name: c.name }))}</h2><p class="sub">${esc(c.body.slice(0, 200))}</p>
              <div class="field"><textarea rows="4" maxlength="1500">${esc(c.reply || '')}</textarea></div>
              <div class="actions"><button class="btn ghost" data-close>${esc(T('Cancel'))}</button><button class="btn" data-ok>${esc(T('Save'))}</button></div>`);
            m.el.querySelector('[data-ok]').onclick = async () => {
              await post(`/api/admin/comments/${id}`, { action: 'reply', reply: m.el.querySelector('textarea').value });
              m.close(); ADM.views.comments(el);
            };
            return;
          } else await post(`/api/admin/comments/${id}`, { action: a });
          if (a === 'approve') toast(T('Published on the website'));
          ADM.views.comments(el);
        } catch (e) { toast(e.message); }
      };
    });
  };

  // ---------------------------------------------------------------------------
  // Members (memberships)
  // ---------------------------------------------------------------------------
  let memberFilter = 'active';
  ADM.views.members = async (el) => {
    const rows = await api(`/api/admin/subscriptions?status=${memberFilter}`);
    ADM.setTitle(T('Members'), ADM.can('settings') ? `<a class="btn ghost" href="#plans">👑 ${esc(T('Membership plans'))}</a>` : '');
    const left = (ts) => Math.max(0, Math.ceil((Number(ts) - Date.now()) / 864e5));
    el.innerHTML = `<div class="toolbar">${chips([['active', 'Active members'], ['expired', 'Expired']], memberFilter)}</div>
      <p class="muted small">${esc(T('A membership opens every course and book until its end date. Members are reminded in the chat 3 days before it ends. To give one for free, open the client and use "Give membership".'))}</p>
      <div class="panel"><div class="table-wrap">${rows.length ? `<table class="tbl"><thead><tr><th>${esc(T('Client'))}</th><th>${esc(T('Last plan'))}</th><th>${esc(T('Member until'))}</th><th>${esc(T('Days left'))}</th><th>${esc(T('Periods'))}</th></tr></thead>
        <tbody>${rows.map((r) => `<tr class="click" data-id="${r.user_id}"><td><div class="nm">${WA.avatar(r.client_name, r.user_id)}<div>${esc(r.client_name)}<div class="muted small" dir="ltr">${flag(r.client_country)} ${esc(fmtPhone(r.client_phone, r.client_country) || '')}</div></div></div></td>
          <td>${esc(r.plan_title || T('Given for free'))}</td><td>${esc(date(r.member_until || r.ends_at))}</td>
          <td>${memberFilter === 'active' ? `<span class="pill ${left(r.member_until) <= 3 ? 'warn' : 'ok'}">${left(r.member_until)}</span>` : '—'}</td><td>${r.periods}</td></tr>`).join('')}</tbody></table>`
        : `<div class="empty">${esc(T(memberFilter === 'active' ? 'No active members yet.' : 'No expired memberships.'))}</div>`}</div></div>`;
    el.querySelectorAll('[data-f]').forEach((b) => { b.onclick = () => { memberFilter = b.dataset.f; ADM.views.members(el); }; });
    el.querySelectorAll('tr[data-id]').forEach((tr) => { tr.onclick = () => ADM.go(`#clients/${tr.dataset.id}`); });
  };

  ADM.start();
})();
