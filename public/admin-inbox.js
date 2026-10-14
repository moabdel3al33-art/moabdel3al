/* Admin panel - inbox (live chat with clients). */
(function () {
  'use strict';
  const { esc, avatar, listTime, ago, starsHtml, previewText, toast, confirmDialog, starInput, notifySound, ChatView, CallManager, T } = WA;
  const ADM = window.ADM;
  const { ic, api, post, put, money, dateTime, flag, countryName, fmtPhone } = ADM;

  const S = { rows: new Map(), current: null, conv: null, quick: [], labels: [], colors: [], filter: 'all', q: '', viewers: {}, typing: {}, staffTyping: {} };
  let socket; let cv; let calls; let host; let built = false; let unseen = 0;
  const baseTitle = document.title;
  const $ = (id) => document.getElementById(id);

  function build(el) {
    host = el;
    el.innerHTML = `<div class="inbox" id="inbox">
      <aside class="inbox-list">
        <div class="search">${ic('search', 'sm')}<input id="ibSearch" placeholder="${esc(T('Search by name, phone or email'))}"></div>
        <div class="chips" id="ibChips"></div>
        <div class="chat-list" id="ibList"></div>
      </aside>
      <main class="inbox-main">
        <div class="inbox-welcome" id="ibWelcome">${ic('chat')}<h2>${esc(T('Inbox'))}</h2><p>${esc(T('Choose a client from the list. Clients waiting longest for a reply are always at the top.'))}</p></div>
        <section id="ibConv" hidden style="display:flex;flex-direction:column;flex:1;min-height:0">
          <header class="chat-head">
            <button class="icon-btn back-btn" id="ibBack">${ic('back')}</button>
            <div id="ibAvatar"></div>
            <div class="who" id="ibWho"><div class="name"><span id="ibName"></span><span id="ibStars"></span></div><div class="status" id="ibStatus"></div></div>
            <div class="actions">
              <button class="icon-btn" id="ibLabel" title="${esc(T('Labels'))}">${ic('label')}</button>
              <button class="icon-btn" id="ibVideo" title="${esc(T('Video call'))}">${ic('video')}</button>
              <button class="icon-btn" id="ibVoice" title="${esc(T('Voice call'))}">${ic('phone')}</button>
              <button class="btn small ghost end-btn" id="ibEnd">${ic('done', 'sm')}<span>${esc(T('End chat'))}</span></button>
              <button class="icon-btn" id="ibInfo" title="${esc(T('Client info'))}">${ic('info')}</button>
            </div>
          </header>
          <div class="viewing-bar" id="ibViewing" hidden></div>
          <div class="label-bar" id="ibLabels" hidden></div>
          <div id="cv"></div>
        </section>
      </main>
      <aside class="drawer" id="ibDrawer" hidden></aside>
    </div>`;
    cv = new ChatView($('cv'), {
      viewer: 'staff', socket, getToken: () => null, meId: ADM.user.id, meName: ADM.user.name,
      clientId: () => S.current, clientName: () => (S.rows.get(S.current) || {}).name || T('Client'),
      quickReplies: () => S.quick, emptyText: T('No messages yet. Send the first message to this client.'),
      onOrderClick: () => openDrawer(true),
    });
    $('ibList').addEventListener('click', (e) => { const r = e.target.closest('.crow'); if (r) ADM.go(`#inbox/${r.dataset.id}`); });
    $('ibChips').addEventListener('click', (e) => { const c = e.target.closest('.chip'); if (c) { S.filter = c.dataset.f; renderList(); } });
    $('ibSearch').addEventListener('input', (e) => { S.q = e.target.value; renderList(); });
    $('ibBack').onclick = () => ADM.go('#inbox');
    $('ibLabel').onclick = labelPicker;
    $('ibLabels').onclick = labelPicker;
    $('ibInfo').onclick = () => ($('ibDrawer').hidden ? openDrawer() : ($('ibDrawer').hidden = true));
    $('ibWho').onclick = () => openDrawer();
    $('ibVoice').onclick = () => { const r = S.rows.get(S.current); if (r) calls.start(false, { clientId: r.id, peerName: r.name }); };
    $('ibVideo').onclick = () => { const r = S.rows.get(S.current); if (r) calls.start(true, { clientId: r.id, peerName: r.name }); };
    $('ibEnd').onclick = async () => {
      const r = S.rows.get(S.current);
      if (!r || !(await confirmDialog(T('End this chat?'), T('{name} will be asked to rate the conversation. The rating will be added to your profile.', { name: r.name }), T('End chat')))) return;
      try { await post(`/api/chat/${r.id}/end`); } catch (e) { toast(e.message); }
    };
    built = true;
    renderList();
  }

  // ---------------------------------------------------------------------------
  // Socket (connected from start so badges and sounds work on every page)
  // ---------------------------------------------------------------------------
  ADM.initInbox = () => {
    socket = io();
    calls = new CallManager(socket, { viewer: 'staff' });
    socket.on('connect', async () => {
      await Promise.all([loadRows(), loadQuick(), loadLabels()]);
      if (S.current && built) openChat(S.current);
    });
    socket.on('connect_error', (err) => { if (err.message === 'unauthorized') location.href = '/login?next=/admin'; });
    socket.on('msg:new', (m) => {
      if (m.client_id === S.current && cv) {
        cv.addMessage(m);
        if (m.sender_type === 'client' && visible()) markRead();
      }
      if (m.sender_type === 'client') {
        S.typing[m.client_id] = false;
        if (m.client_id !== S.current || !visible()) {
          notifySound();
          if (!visible() || location.hash.indexOf('#inbox') !== 0) { unseen++; title(); notify((S.rows.get(m.client_id) || {}).name || T('New message'), previewText(m)); }
        }
      }
    });
    socket.on('chat:update', (row) => { S.rows.set(row.id, row); schedule(); if (row.id === S.current) renderHeader(); });
    socket.on('receipt', (ev) => { if (ev.clientId === S.current && cv) cv.applyReceipt(ev); });
    socket.on('presence', (p) => {
      const r = S.rows.get(p.clientId); if (!r) return;
      r.online = p.online; if (p.last_seen) r.last_seen = p.last_seen;
      schedule(); if (p.clientId === S.current) renderHeader();
    });
    socket.on('typing', (ev) => {
      const map = ev.side === 'client' ? S.typing : S.staffTyping;
      map[ev.clientId] = ev.on ? (ev.name || true) : false;
      clearTimeout(map[`t${ev.clientId}`]);
      if (ev.on) map[`t${ev.clientId}`] = setTimeout(() => { map[ev.clientId] = false; schedule(); if (ev.clientId === S.current) renderHeader(); }, 6000);
      schedule(); if (ev.clientId === S.current) renderHeader();
    });
    socket.on('viewers', (v) => { S.viewers[v.clientId] = v.names; schedule(); if (v.clientId === S.current) renderHeader(); });
    socket.on('viewers:all', (all) => { S.viewers = all; schedule(); });
    socket.on('conversation', (c) => { if (c.clientId === S.current) { S.conv = c; renderHeader(); renderBanner(); } });
    socket.on('quickreplies:changed', loadQuick);
    socket.on('labels:changed', async () => { await loadLabels(); await loadRows(); if (S.current) renderHeader(); });
    socket.on('comments:new', () => { if (ADM.refreshBadges) ADM.refreshBadges(); });
    socket.on('order:update', (ev) => { if (ev.clientId === S.current && cv) cv.updateOrder(ev.orderId, ev.status); });
    document.addEventListener('visibilitychange', () => { if (visible()) { unseen = 0; title(); markRead(); } });
  };
  ADM.inboxLeave = () => { if (S.current && socket) { socket.emit('view', { clientId: null }); } };

  async function loadRows() {
    try { S.rows = new Map((await api('/api/chat/rows')).map((r) => [r.id, r])); schedule(); } catch (e) { toast(e.message); }
  }
  async function loadLabels() { try { const d = await api('/api/chat/labels'); S.labels = d.labels; S.colors = d.colors; schedule(); } catch (e) { /* ignore */ } }
  const labelById = (id) => S.labels.find((l) => l.id === id);
  const labelChip = (l, cls = '') => `<span class="lbl-chip ${cls}" style="--lc:${esc(l.color)}"><i></i>${esc(l.name)}</span>`;
  async function loadQuick() { try { S.quick = await api('/api/chat/quick-replies'); } catch (e) { /* ignore */ } }
  const visible = () => document.visibilityState === 'visible';
  function markRead() { if (S.current && socket && location.hash.indexOf('#inbox') === 0) socket.emit('msg:read', { clientId: S.current }); }
  function title() { document.title = unseen ? `(${unseen}) ${baseTitle}` : baseTitle; }
  function notify(t, body) {
    try {
      if (!('Notification' in window) || Notification.permission !== 'granted' || document.hasFocus()) return;
      const n = new Notification(t, { body, tag: `chat-${t}` }); n.onclick = () => { window.focus(); n.close(); };
    } catch (e) { /* unsupported */ }
  }

  // ---------------------------------------------------------------------------
  // List
  // ---------------------------------------------------------------------------
  const FILTERS = [['all', 'All'], ['waiting', 'Waiting'], ['unread', 'Unread'], ['orders', 'Pending orders'], ['ended', 'Ended']];
  const match = (r, f) => f === 'all' || (f[0] === 'L' && (r.labels || []).includes(Number(f.slice(1)))) || (f === 'waiting' && r.waiting_since) || (f === 'unread' && r.unread > 0)
    || (f === 'orders' && r.pending_orders > 0) || (f === 'ended' && (r.conv_status === 'awaiting_rating' || r.conv_status === 'closed'));
  let queued = false;
  function schedule() {
    ADM.badge('inbox', [...S.rows.values()].filter((r) => r.waiting_since).length);
    if (queued || !built) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; renderList(); });
  }
  setInterval(() => { if (built && !host.hidden) renderList(); }, 30000);
  const inChat = (names) => {
    const who = names.length === 1 ? names[0] : `${names.slice(0, -1).join('، ')} ${T('and')} ${names[names.length - 1]}`;
    return T(names.length === 1 ? '{who} is in this chat' : '{who} are in this chat', { who });
  };
  function renderList() {
    if (!built) return;
    const all = [...S.rows.values()];
    $('ibChips').innerHTML = FILTERS.map(([k, l]) => {
      const n = k === 'waiting' ? all.filter((r) => r.waiting_since).length : k === 'unread' ? all.filter((r) => r.unread > 0).length : k === 'orders' ? all.filter((r) => r.pending_orders > 0).length : 0;
      return `<button class="chip ${S.filter === k ? 'on' : ''}" data-f="${k}">${esc(T(l))}${n ? ` <b>${n}</b>` : ''}</button>`;
    }).join('') + S.labels.map((l) => {
      const n = all.filter((r) => (r.labels || []).includes(l.id)).length;
      return `<button class="chip lbl ${S.filter === `L${l.id}` ? 'on' : ''}" data-f="L${l.id}" style="--lc:${esc(l.color)}"><i></i>${esc(l.name)}${n ? ` <b>${n}</b>` : ''}</button>`;
    }).join('');
    const q = S.q.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    // People who opened the chat form but never wrote are hidden here (they are on the Clients page) unless searched for.
    const rows = all.filter((r) => match(r, S.filter) && (r.last_id || q || r.id === S.current))
      .filter((r) => !q || r.name.toLowerCase().includes(q) || (r.email || '').toLowerCase().includes(q) || (digits && (r.phone || '').includes(digits.replace(/^0+/, ''))))
      .sort((a, b) => {
        if (a.waiting_since && b.waiting_since) return a.waiting_since - b.waiting_since;
        if (a.waiting_since) return -1;
        if (b.waiting_since) return 1;
        return (b.last_at || b.created_at) - (a.last_at || a.created_at);
      });
    $('ibList').innerHTML = rows.length ? rows.map(rowHtml).join('')
      : `<div class="empty">${esc(S.rows.size ? T('No chats match this filter.') : T('No clients yet. They appear here once they create an account on the website.'))}</div>`;
  }
  function rowHtml(r) {
    const typing = S.typing[r.id];
    let prefix = '';
    let pv;
    if (typing) pv = T('typing…');
    else if (!r.last_id) pv = T('New client - no messages yet');
    else {
      pv = r.last_type === 'system' ? WA.systemText(r.last_body).replace(/<[^>]+>/g, ' ') : previewText({ type: r.last_type, body: r.last_type === 'call' ? WA.callLabel(r.last_body) : r.last_body, file_name: r.last_file_name });
      if (r.last_type === 'call') pv = `📞 ${WA.callLabel(r.last_body)}`;
      if (r.last_sender_type === 'staff') {
        prefix = `<span class="tick ${r.last_read_at ? 'read' : ''}">${WA.icon(r.last_delivered_at || r.last_read_at ? 'dcheck' : 'check', 'xs')}</span>`;
        pv = `${r.last_sender_name === ADM.user.name ? T('You') : (r.last_sender_name || '').split(' ')[0]}: ${pv}`;
      }
    }
    const tags = [];
    if (r.waiting_since) tags.push(`<span class="tag wait ${Date.now() - r.waiting_since > 15 * 60e3 ? 'long' : ''}">${ic('clock')} ${esc(T('Waiting {time}', { time: ago(r.waiting_since) }))}</span>`);
    if (r.pending_orders) tags.push(`<span class="tag order">🧾 ${esc(T('{n} pending order(s)', { n: r.pending_orders }))}</span>`);
    if (r.conv_status === 'awaiting_rating') tags.push(`<span class="tag end">${esc(T('Ended · awaiting rating'))}</span>`);
    if (r.responders.length) tags.push(`<span class="tag" title="${esc(r.responders.join(', '))}">${ic('reply')} ${esc(r.last_responder)}${r.responders.length > 1 ? ` +${r.responders.length - 1}` : ''}</span>`);
    else if (r.last_id) tags.push(`<span class="tag new">${esc(T('No reply yet'))}</span>`);
    const others = (S.viewers[r.id] || []).filter((n) => n !== ADM.user.name);
    if (others.length) tags.push(`<span class="tag view">${ic('eye')} ${esc(inChat(others))}</span>`);
    return `<div class="crow ${S.current === r.id ? 'active' : ''}" data-id="${r.id}">${avatar(r.name, r.id, 'lg', r.online)}
      <div class="crow-main">
        <div class="crow-top"><span class="crow-name">${esc(r.name)}</span>${starsHtml(r.rating)}<span class="crow-time ${r.unread ? 'unread' : ''}">${esc(listTime(r.last_at || r.created_at))}</span></div>
        <div class="crow-mid">${prefix}<span class="pv ${typing ? 'typing' : ''}">${esc(pv)}</span>${r.unread ? `<span class="badge">${r.unread}</span>` : ''}</div>
        ${(r.labels || []).length ? `<div class="crow-labels">${r.labels.map(labelById).filter(Boolean).map((l) => labelChip(l)).join('')}</div>` : ''}
        <div class="crow-sub"><span class="tag" dir="ltr">${flag(r.country)} ${esc(fmtPhone(r.phone, r.country) || '')}</span>${r.is_guest ? `<span class="tag">${esc(T('Chat only'))}</span>` : ''}${tags.join('')}</div>
      </div></div>`;
  }

  // ---------------------------------------------------------------------------
  // Open chat
  // ---------------------------------------------------------------------------
  ADM.views.inbox = async (el, arg) => {
    if (!built) build(el);
    const id = Number(arg) || null;
    if (id) await openChat(id);
    else closeChat();
  };
  async function openChat(id) {
    const switching = S.current !== id;
    S.current = id;
    socket.emit('view', { clientId: id });
    $('ibWelcome').hidden = true; $('ibConv').hidden = false;
    $('inbox').classList.add('show-chat');
    if (switching) { cv.reset(); S.conv = null; }
    renderHeader(); renderList();
    try {
      const d = await api(`/api/chat/${id}/messages`);
      if (S.current !== id) return;
      if (d.row) S.rows.set(id, d.row);
      S.conv = d.conversation;
      cv.setMessages(d.messages);
      renderHeader(); renderBanner();
      if (visible()) markRead();
      if (switching) cv.focus();
    } catch (e) { toast(e.message); }
    if (!$('ibDrawer').hidden) openDrawer();
  }
  function closeChat() {
    if (S.current) socket.emit('view', { clientId: null });
    S.current = null; S.conv = null;
    $('inbox').classList.remove('show-chat');
    $('ibConv').hidden = true; $('ibWelcome').hidden = false; $('ibDrawer').hidden = true;
    renderList();
  }
  function renderHeader() {
    const r = S.rows.get(S.current);
    if (!r || !built) return;
    $('ibAvatar').innerHTML = avatar(r.name, r.id, '', r.online);
    $('ibName').textContent = r.name;
    $('ibStars').innerHTML = starsHtml(r.rating, 'sm');
    const st = $('ibStatus');
    const others = (S.viewers[r.id] || []).filter((n) => n !== ADM.user.name);
    const staffTyping = S.staffTyping[r.id];
    st.classList.toggle('typing', !!(S.typing[r.id] || staffTyping));
    if (S.typing[r.id]) st.textContent = T('typing…');
    else if (staffTyping) st.textContent = T('{name} is typing…', { name: staffTyping });
    else st.textContent = [fmtPhone(r.phone, r.country), r.online ? T('online') : r.last_seen ? T('last seen {time}', { time: listTime(r.last_seen) }) : ''].filter(Boolean).join(' · ');
    $('ibEnd').hidden = !(S.conv && S.conv.status === 'open');
    const lb = $('ibLabels');
    const mine = (r.labels || []).map(labelById).filter(Boolean);
    lb.hidden = !mine.length;
    lb.innerHTML = mine.map((l) => labelChip(l)).join('') + `<span class="lbl-edit">${ic('edit', 'sm')}</span>`;
    const bar = $('ibViewing');
    bar.hidden = !others.length;
    bar.innerHTML = others.length ? `${ic('eye')}<span>${esc(inChat(others))}</span>` : '';
  }
  function renderBanner() {
    const c = S.conv;
    if (c && c.status === 'awaiting_rating') cv.setBanner(`<span>${esc(T('Chat ended by {name}. Waiting for the client rating.', { name: c.closed_by_name || '—' }))}</span>`);
    else if (c && c.status === 'closed' && c.rating) cv.setBanner(`<span>${esc(T('Last chat (ended by {name}) was rated', { name: c.closed_by_name || '—' }))} ${starsHtml(c.rating, 'sm')}${c.comment ? ` — “${esc(c.comment)}”` : ''}</span>`);
    else cv.setBanner('');
  }

  // ---------------------------------------------------------------------------
  // Labels: tick labels for this chat, create / rename / recolour / delete labels
  // ---------------------------------------------------------------------------
  function labelPicker() {
    const r = S.rows.get(S.current);
    if (!r) return;
    const chosen = new Set(r.labels || []);
    let editing = null; // label being edited, or {} for a new one
    const m = WA.openModal(`<h2>${esc(T('Labels'))}</h2><p class="sub">${esc(T('Mark this chat so the whole team can see it at a glance, and filter the inbox by label.'))}</p><div id="lblBody"></div>
      <div class="actions"><button class="btn ghost" data-close>${esc(T('Close'))}</button></div>`);
    const body = m.el.querySelector('#lblBody');
    const save = async () => {
      try { await put(`/api/chat/${r.id}/labels`, { ids: [...chosen] }); r.labels = [...chosen]; renderHeader(); schedule(); } catch (e) { toast(e.message); }
    };
    const draw = () => {
      body.innerHTML = `<div class="lbl-list">${S.labels.map((l) => `<label class="lbl-row"><input type="checkbox" data-id="${l.id}" ${chosen.has(l.id) ? 'checked' : ''}>
          ${labelChip(l, 'big')}<span class="spacer"></span><button type="button" class="icon-btn" data-edit="${l.id}" title="${esc(T('Edit'))}">${ic('edit', 'sm')}</button></label>`).join('')
        || `<div class="muted small">${esc(T('No labels yet. Create the first one.'))}</div>`}</div>
        ${editing ? `<div class="lbl-form"><input id="lblName" maxlength="40" placeholder="${esc(T('Label name, e.g. VIP, Paid, Follow up'))}" value="${esc(editing.name || '')}">
          <div class="lbl-colors">${S.colors.map((c) => `<button type="button" class="lbl-color ${c === (editing.color || S.colors[0]) ? 'on' : ''}" data-color="${c}" style="background:${c}"></button>`).join('')}</div>
          <div class="row">${editing.id ? `<button type="button" class="btn small ghost" data-delete style="color:#ff6b81">${ic('trash', 'sm')} ${esc(T('Delete'))}</button><span class="spacer"></span>` : ''}
          <button type="button" class="btn small ghost" data-cancel>${esc(T('Cancel'))}</button><button type="button" class="btn small" data-savelbl>${esc(T('Save'))}</button></div></div>`
        : `<button type="button" class="btn small ghost" data-new style="margin-top:10px">${ic('add', 'sm')} ${esc(T('New label'))}</button>`}`;
      const name = body.querySelector('#lblName');
      if (name) name.focus();
    };
    body.addEventListener('change', (e) => {
      const cb = e.target.closest('input[data-id]');
      if (!cb) return;
      if (cb.checked) chosen.add(Number(cb.dataset.id)); else chosen.delete(Number(cb.dataset.id));
      save();
    });
    body.addEventListener('click', async (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      e.preventDefault();
      if (b.dataset.new !== undefined) { editing = { color: S.colors[S.labels.length % S.colors.length] }; draw(); }
      else if (b.dataset.edit) { editing = { ...labelById(Number(b.dataset.edit)) }; draw(); }
      else if (b.dataset.color) { editing.name = body.querySelector('#lblName').value; editing.color = b.dataset.color; draw(); }
      else if (b.dataset.cancel !== undefined) { editing = null; draw(); }
      else if (b.dataset.savelbl !== undefined) {
        const data = { name: body.querySelector('#lblName').value, color: editing.color || S.colors[0] };
        try {
          if (editing.id) await put(`/api/chat/labels/${editing.id}`, data);
          else { const res = await post('/api/chat/labels', data); chosen.add(res.id); await save(); }
          await loadLabels(); editing = null; draw(); renderHeader();
        } catch (ex) { toast(ex.message); }
      } else if (b.dataset.delete !== undefined) {
        if (!(await confirmDialog(T('Delete this label?'), T('It will be removed from every chat.'), T('Delete'), true))) return;
        try { await ADM.del(`/api/chat/labels/${editing.id}`); chosen.delete(editing.id); editing = null; await loadLabels(); draw(); } catch (ex) { toast(ex.message); }
      }
    });
    body.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.id === 'lblName') body.querySelector('[data-savelbl]').click(); });
    draw();
  }

  // ---------------------------------------------------------------------------
  // Client info drawer (orders can be confirmed right here)
  // ---------------------------------------------------------------------------
  const ST = { pending: 'Waiting for payment', paid: 'Paid', cancelled: 'Cancelled', pending_payment: 'Waiting for payment', scheduled: 'Scheduled', done: 'Completed', open: 'Open', awaiting_rating: 'Ended · awaiting rating', closed: 'Closed' };
  async function openDrawer(scrollToOrders) {
    const id = S.current;
    if (!id) return;
    const d = $('ibDrawer');
    d.hidden = false;
    d.innerHTML = `<div class="drawer-head"><button class="icon-btn" data-x>${ic('close')}</button><b>${esc(T('Client info'))}</b></div><div class="dsec muted">${esc(T('Loading…'))}</div>`;
    d.querySelector('[data-x]').onclick = () => { d.hidden = true; };
    let info;
    try { info = await api(`/api/admin/clients/${id}`); } catch (e) { toast(e.message); return; }
    if (S.current !== id) return;
    const c = info.client;
    const canOrders = ADM.can('orders');
    const orders = info.orders.sort((a, b) => (a.status === 'pending' ? -1 : 0) - (b.status === 'pending' ? -1 : 0) || b.id - a.id);
    d.innerHTML = `<div class="drawer-head"><button class="icon-btn" data-x>${ic('close')}</button><b>${esc(T('Client info'))}</b>
        ${ADM.can('clients') ? `<a class="btn small ghost" href="#clients/${c.id}" style="margin-inline-start:auto">${esc(T('Full profile'))}</a>` : ''}</div>
      <div class="dsec" style="text-align:center">${avatar(c.name, c.id, 'xl')}<div style="font-size:20px;font-weight:800;margin-top:10px">${esc(c.name)}</div>
        <div dir="ltr">${flag(c.country)} ${esc(fmtPhone(c.phone, c.country) || '')}</div><div class="muted small">${esc(countryName(c.country))}</div>
        ${c.email ? `<div class="muted small" dir="ltr">${esc(c.email)}</div>` : ''}
        <div style="margin-top:6px"><span class="pill ${c.is_guest ? '' : 'ok'}">${esc(T(c.is_guest ? 'Chat only (no account yet)' : 'Has an account'))}</span></div>
        <div class="muted small">${c.online ? esc(T('Online now')) : c.last_seen ? esc(T('last seen {time}', { time: dateTime(c.last_seen) })) : ''}</div></div>
      <div class="dsec" id="dOrders"><h4>🧾 ${esc(T('Orders'))} (${orders.length})</h4>
        ${orders.map((o) => `<div class="hist"><div class="row"><b>#${o.id}</b><span class="pill ${o.status}">${esc(T(ST[o.status] || o.status))}</span><span class="spacer"></span><b>${esc(money(o.total))}</b></div>
          <div class="small">${esc(o.items || '')}</div><div class="muted small">${esc(dateTime(o.created_at))}</div>
          ${o.status === 'pending' && canOrders ? `<div class="row" style="margin-top:6px"><button class="btn small green" data-confirm="${o.id}">${ic('check', 'sm')} ${esc(T('Confirm payment'))}</button><button class="btn small ghost" data-cancel="${o.id}">${esc(T('Cancel order'))}</button></div>` : ''}</div>`).join('') || `<div class="muted small">${esc(T('No orders yet.'))}</div>`}
      </div>
      <div class="dsec"><h4>${esc(T('Owned courses & books'))}</h4>
        ${info.entitlements.map((e) => `<div class="hist">${e.item_type === 'course' ? '🎓' : '📚'} ${esc(e.title || `#${e.item_id}`)}</div>`).join('') || `<div class="muted small">${esc(T('Nothing yet.'))}</div>`}</div>
      ${info.bookings.length ? `<div class="dsec"><h4>📅 ${esc(T('Consultations'))}</h4>${info.bookings.map((b) => `<div class="hist"><div class="row"><b>${esc(b.title || '')}</b><span class="pill ${b.status}">${esc(T(ST[b.status] || b.status))}</span></div>
        <div class="muted small">${ADM.bookingWhen(b)}</div></div>`).join('')}</div>` : ''}
      <div class="dsec"><h4>${esc(T('Client rating (team only)'))}</h4>
        <div class="muted small" style="margin-bottom:6px">${esc(T('Is this a good client? Rate them so your colleagues know.'))}</div>
        <div class="slot"></div>
        <div class="field"><textarea rows="3" maxlength="2000" placeholder="${esc(T('Private note about this client…'))}">${esc(c.client_note || '')}</textarea></div>
        <div class="row"><button class="btn small" data-save>${esc(T('Save'))}</button><button class="btn small ghost" data-clear>${esc(T('Clear rating'))}</button></div></div>
      <div class="dsec"><h4>${esc(T('Chat history'))} (${info.conversations.length})</h4>
        ${info.conversations.map((h) => `<div class="hist"><div class="row"><b>${esc(T('Chat #{id}', { id: h.id }))}</b><span class="spacer"></span><span class="muted small">${esc(T(ST[h.status] || h.status))}</span></div>
          <div class="muted small">${esc(dateTime(h.opened_at))} · ${esc(T('{n} messages', { n: h.message_count }))}</div>
          ${h.closed_at ? `<div class="muted small">${esc(T('Ended by {name}', { name: h.closed_by_name || '—' }))}</div>` : ''}
          ${h.rating ? starsHtml(h.rating, 'sm') : ''}${h.comment ? `<div>“${esc(h.comment)}”</div>` : ''}</div>`).join('') || `<div class="muted small">${esc(T('No chats yet.'))}</div>`}</div>`;
    d.querySelector('[data-x]').onclick = () => { d.hidden = true; };
    const stars = starInput(c.client_rating || 0);
    d.querySelector('.slot').appendChild(stars);
    const save = async (rating) => {
      try { await put(`/api/admin/clients/${id}`, { rating: rating || null, note: d.querySelector('textarea').value }); toast(T('Saved')); } catch (e) { toast(e.message); }
    };
    d.querySelector('[data-save]').onclick = () => save(stars.value);
    d.querySelector('[data-clear]').onclick = () => { stars.value = 0; stars.querySelectorAll('button').forEach((b) => b.classList.remove('on')); save(null); };
    d.querySelectorAll('[data-confirm]').forEach((b) => {
      b.onclick = async () => {
        if (!(await confirmDialog(T('Confirm payment?'), T('The client will get access to what they ordered right away and will be told in the chat.'), T('Confirm payment')))) return;
        try { await post(`/api/admin/orders/${b.dataset.confirm}/confirm`); toast(T('Payment confirmed')); openDrawer(true); ADM.refreshBadges && ADM.refreshBadges(); } catch (e) { toast(e.message); }
      };
    });
    d.querySelectorAll('[data-cancel]').forEach((b) => {
      b.onclick = async () => {
        if (!(await confirmDialog(T('Cancel this order?'), T('The client will be told in the chat.'), T('Cancel order'), true))) return;
        try { await post(`/api/admin/orders/${b.dataset.cancel}/cancel`); openDrawer(true); } catch (e) { toast(e.message); }
      };
    });
    if (scrollToOrders) d.querySelector('#dOrders').scrollIntoView({ block: 'start' });
  }
})();
