(function () {
  'use strict';
  const { esc, toast, openModal, starInput, makeApi, notifySound, ChatView, CallManager, T } = WA;
  const data = JSON.parse(document.getElementById('chatData').textContent);
  const $ = (id) => document.getElementById(id);
  const api = makeApi(() => null, () => { location.href = '/login?next=/chat'; });

  const socket = io();
  const cv = new ChatView($('cv'), {
    viewer: 'client',
    socket,
    getToken: () => null,
    meId: data.me.id,
    meName: data.me.name,
    clientId: () => data.me.id,
    clientName: () => data.me.name,
    emptyText: T('Hi {name} 👋 Send us a message and our team will reply right here.', { name: data.me.name.split(' ')[0] }),
    onOrderClick: () => { location.href = '/account'; },
  });
  new CallManager(socket, { viewer: 'client' }); // receives calls from the team

  const state = { conversation: null, staffOnline: false, typing: null };
  let unseen = 0;
  let ratingOpen = false;
  let draftPlaced = false;
  const baseTitle = document.title;

  socket.on('connect', load);
  socket.on('connect_error', (err) => { if (err.message === 'unauthorized') location.href = '/login?next=/chat'; });
  socket.on('msg:new', (m) => {
    if (m.client_id !== data.me.id) return;
    cv.addMessage(m);
    if (m.sender_type !== 'client') {
      setTyping(null);
      if (visible()) markRead();
      else { unseen++; title(); notifySound(); }
    }
  });
  socket.on('receipt', (ev) => cv.applyReceipt(ev));
  socket.on('order:update', (ev) => cv.updateOrder(ev.orderId, ev.status));
  socket.on('typing', (ev) => setTyping(ev.on ? ev.name : null));
  socket.on('staff:presence', (p) => { state.staffOnline = p.online; status(); });
  socket.on('conversation', (c) => { state.conversation = c; renderConversation(true); });

  async function load() {
    try {
      const [st, msgs] = await Promise.all([api('/api/chat/me/state'), api('/api/chat/me/messages')]);
      Object.assign(state, st);
      cv.setMessages(msgs);
      status();
      renderConversation(false);
      if (data.draft && !draftPlaced) { draftPlaced = true; cv.setDraft(data.draft, data.orderId); history.replaceState(null, '', '/chat'); }
      if (visible()) markRead();
    } catch (e) { toast(e.message); }
  }

  const visible = () => document.visibilityState === 'visible';
  function markRead() { socket.emit('msg:read'); unseen = 0; title(); }
  function title() { document.title = unseen ? `(${unseen}) ${baseTitle}` : baseTitle; }
  document.addEventListener('visibilitychange', () => { if (visible()) markRead(); });

  let typingTimer;
  function setTyping(name) {
    state.typing = name;
    clearTimeout(typingTimer);
    if (name) typingTimer = setTimeout(() => setTyping(null), 6000);
    status();
  }
  function status() {
    const el = $('coStatus');
    el.classList.toggle('typing', !!state.typing);
    el.textContent = state.typing ? T('{name} is typing…', { name: state.typing })
      : state.staffOnline ? T('Online now') : T('We will reply as soon as possible');
  }

  function renderConversation(prompt) {
    const c = state.conversation;
    if (c && c.status === 'awaiting_rating') {
      cv.setBanner(`<span>${esc(T('{name} ended this chat. How did we do?', { name: c.closed_by_name || T('Our team') }))}</span><button class="btn small" id="rateNow">${esc(T('Rate this chat'))}</button>`);
      $('rateNow').onclick = openRating;
      if (prompt) openRating();
    } else cv.setBanner('');
  }

  function openRating() {
    const c = state.conversation;
    if (ratingOpen || !c || c.status !== 'awaiting_rating') return;
    ratingOpen = true;
    const m = openModal(`<h2>${esc(T('Rate your chat'))}</h2>
      <p class="sub">${esc(T('How was your conversation with {name}?', { name: c.closed_by_name || T('Our team') }))}</p>
      <div class="stars-slot"></div>
      <div class="field"><textarea rows="3" maxlength="1000" placeholder="${esc(T('Leave a comment (optional)'))}"></textarea></div>
      <div class="error-text"></div>
      <div class="actions"><button class="btn ghost" data-skip>${esc(T('Skip'))}</button><button class="btn" data-ok>${esc(T('Submit'))}</button></div>`, {
      onClose: () => { ratingOpen = false; },
    });
    const stars = starInput(0);
    m.el.querySelector('.stars-slot').appendChild(stars);
    const send = async (skip) => {
      if (!skip && !stars.value) { m.el.querySelector('.error-text').textContent = T('Please choose 1 to 5 stars'); return; }
      try {
        await api('/api/chat/me/rate', { method: 'POST', body: { conversationId: c.id, rating: stars.value, comment: m.el.querySelector('textarea').value, skip } });
        m.close();
        if (!skip) toast(T('Thank you for your feedback!'));
      } catch (e) { m.el.querySelector('.error-text').textContent = e.message; }
    };
    m.el.querySelector('[data-ok]').onclick = () => send(false);
    m.el.querySelector('[data-skip]').onclick = () => send(true);
  }
})();
