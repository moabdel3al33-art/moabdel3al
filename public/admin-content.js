/* Admin panel - content: courses, books, blog, consultations, social posts, site texts & images, colours. */
(function () {
  'use strict';
  const { esc, toast, openModal, confirmDialog, T } = WA;
  const ADM = window.ADM;
  const { ic, api, post, put, del, money, date, fieldHtml, collect, bindFields } = ADM;

  const yes = (v) => (v ? `<span class="pill ok">${esc(T('Visible'))}</span>` : `<span class="pill">${esc(T('Hidden'))}</span>`);
  const thumb = (u, tall) => (u ? `<span class="thumb ${tall ? 'tall' : ''}"><img src="${esc(ImgPos.src(u))}" style="${ADM.imgStyle(u)}" alt=""></span>` : `<span class="thumb ${tall ? 'tall' : ''}"></span>`);

  // ---------------------------------------------------------------------------
  // Definitions
  // ---------------------------------------------------------------------------
  const PUBLISH = { k: 'published', l: 'Visible on the website', type: 'check' };
  const SOON = { k: 'coming_soon', l: 'Coming soon (visitors book a seat, no payment)', type: 'check', hint: 'Shows "Stay tuned! This content will be available soon." and a "Book your seat" form instead of Buy.' };
  const statusPill = (r) => (r.coming_soon ? `${yes(r.published)} <span class="pill warn">${esc(T('Coming soon'))}</span>` : yes(r.published));
  const SORT = { k: 'sort', l: 'Order (smaller number shows first)', type: 'number' };
  const DEFS = {
    courses: {
      res: 'courses', one: 'Course', add: 'Add course', site: (r) => `/courses/${encodeURIComponent(r.slug)}`,
      cols: [['', (r) => thumb(r.cover)], ['Title', (r) => `<b>${esc(r.title)}</b>`], ['Price', (r) => esc(money(r.price))],
        ['Lessons', (r) => r.lessons_count], ['Students', (r) => r.students], ['Status', statusPill]],
      fields: [
        { k: 'title', l: 'Title', req: 1, full: 1 }, { k: 'subtitle', l: 'Short description (one line)', full: 1 },
        { k: 'price', l: 'Price', type: 'number', hint: 'Put 0 to make it free' }, { k: 'old_price', l: 'Old price (optional, shown crossed out)', type: 'number' },
        { k: 'cover', l: 'Cover image', type: 'image', aspects: ['16/10', '1/1'] },
        { k: 'description', l: 'Full description', type: 'md' },
        SORT, PUBLISH, SOON,
      ],
    },
    books: {
      res: 'books', one: 'Book', add: 'Add book', site: (r) => `/books/${encodeURIComponent(r.slug)}`,
      cols: [['', (r) => thumb(r.cover, 1)], ['Title', (r) => `<b>${esc(r.title)}</b>`], ['Price', (r) => esc(money(r.price))],
        ['File', (r) => (r.file_path ? `<span class="pill ok">${r.file_path.startsWith('gdrive:') ? 'Google Drive' : 'PDF'}</span>` : r.external_url ? `<span class="pill ok">${esc(T('PDF link'))}</span>` : `<span class="pill bad">${esc(T('Missing'))}</span>`)],
        ['Buyers', (r) => r.owners], ['Status', statusPill]],
      fields: [
        { k: 'title', l: 'Title', req: 1, full: 1 }, { k: 'subtitle', l: 'Short description (one line)', full: 1 },
        { k: 'price', l: 'Price', type: 'number', hint: 'Put 0 to make it free' }, { k: 'old_price', l: 'Old price (optional, shown crossed out)', type: 'number' },
        { k: 'pages', l: 'Number of pages', type: 'number' },
        { k: 'cover', l: 'Cover image', type: 'image', aspects: ['3/4'] },
        { k: 'file', l: 'Book file (PDF) - buyers read it on the site, it cannot be downloaded', type: 'privatefile' },
        { k: 'external_url', l: 'Or a PDF link instead of uploading (saves storage)', type: 'url', full: 1, hint: 'Google Drive: share the file as "Anyone with the link" and paste the link. Dropbox or any direct PDF link also works. Buyers only see the pages, never the link.' },
        { k: 'description', l: 'Full description', type: 'md' },
        SORT, PUBLISH, SOON,
      ],
    },
    posts: {
      res: 'posts', one: 'Article', add: 'Write an article', site: (r) => `/blog/${encodeURIComponent(r.slug)}`,
      cols: [['', (r) => thumb(r.cover)], ['Title', (r) => `<b>${esc(r.title)}</b>`], ['Date', (r) => esc(date(r.published_at || r.created_at))], ['Status', (r) => yes(r.published)]],
      fields: [
        { k: 'title', l: 'Title', req: 1, full: 1 }, { k: 'excerpt', l: 'Short summary (shown on the blog page)', type: 'textarea', full: 1, rows: 2 },
        { k: 'cover', l: 'Cover image', type: 'image', aspects: ['16/10', '16/9'] },
        { k: 'body', l: 'Article text', type: 'md' },
        { k: 'published_at', l: 'Publish date', type: 'datetime' }, PUBLISH,
      ],
    },
    consults: {
      res: 'consult_types', one: 'Consultation', add: 'Add consultation type', site: () => '/consultations',
      cols: [['Title', (r) => `<b>${esc(r.title)}</b>`], ['Today', (r) => esc(r.price_today ? money(r.price_today) : '—')], ['Within 2 days', (r) => esc(r.price_2d ? money(r.price_2d) : '—')],
        ['Within 4 days', (r) => esc(r.price_4d ? money(r.price_4d) : (!r.price_today && !r.price_2d && r.price ? money(r.price) : '—'))], ['Status', (r) => yes(r.published)]],
      fields: [
        { k: 'title', l: 'Title', req: 1, full: 1 },
        { k: 'price_today', l: 'Price: book for today', type: 'number', hint: 'Leave empty to not offer this option' },
        { k: 'price_2d', l: 'Price: within 2 days', type: 'number', hint: 'Leave empty to not offer this option' },
        { k: 'price_4d', l: 'Price: within 4 days', type: 'number', hint: 'Leave empty to not offer this option' },
        { k: 'cover', l: 'Image (optional)', type: 'image', aspects: ['1/1'] },
        { k: 'description', l: 'Description', type: 'md' },
        SORT, PUBLISH,
      ],
    },
  };
  DEFS.plans = {
    res: 'plans', one: 'Plan', add: 'Add plan', site: () => '/membership',
    cols: [['Title', (r) => `<b>${esc(r.title)}</b>`], ['Duration', (r) => esc(T('{n} month(s)', { n: r.months }))], ['Price', (r) => esc(money(r.price))],
      ['Active members', (r) => r.members], ['Status', (r) => yes(r.published)]],
    fields: [
      { k: 'title', l: 'Title', req: 1, full: 1 },
      { k: 'months', l: 'Duration in months', type: 'number', hint: '1 = monthly, 3 = quarterly, 6 = half-yearly, 12 = yearly' },
      { k: 'price', l: 'Price', type: 'number' }, { k: 'old_price', l: 'Old price (optional, shown crossed out)', type: 'number' },
      { k: 'description', l: 'Short description', type: 'textarea', rows: 2 },
      SORT, PUBLISH,
    ],
  };
  const LESSON_FIELDS = [
    { k: 'title', l: 'Lesson title', req: 1, full: 1 },
    { k: 'video_url', l: 'Video link (Vimeo or YouTube)', type: 'url', full: 1, hint: 'Paste the normal link of the video, e.g. https://vimeo.com/123456789' },
    { k: 'duration', l: 'Duration (e.g. 12:30)' }, SORT,
    { k: 'is_preview', l: 'Free preview (anyone can watch it)', type: 'check' },
    { k: 'notes', l: 'Notes under the video (optional)', type: 'textarea', rows: 3 },
  ];

  // ---------------------------------------------------------------------------
  // Generic list + edit form
  // ---------------------------------------------------------------------------
  function contentView(key) {
    const def = DEFS[key];
    return async (el, arg) => {
      if (arg) return editPage(el, key, def, arg);
      const rows = await api(`/api/admin/r/${def.res}`);
      ADM.setTitle(document.getElementById('admTitle').textContent, `<a class="btn" href="#${key}/new">${ic('add', 'sm')} ${esc(T(def.add))}</a>`);
      el.innerHTML = `<div class="panel"><div class="table-wrap">${rows.length ? `<table class="tbl"><thead><tr>${def.cols.map(([l]) => `<th>${esc(l ? T(l) : '')}</th>`).join('')}</tr></thead>
        <tbody>${rows.map((r) => `<tr class="click" data-id="${r.id}">${def.cols.map(([, f]) => `<td>${f(r)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
        : `<div class="empty">${esc(T('Nothing here yet.'))}<br><br><a class="btn" href="#${key}/new">${ic('add', 'sm')} ${esc(T(def.add))}</a></div>`}</div></div>`;
      el.querySelectorAll('tr[data-id]').forEach((tr) => { tr.onclick = () => ADM.go(`#${key}/${tr.dataset.id}`); });
    };
  }

  async function editPage(el, key, def, arg) {
    const isNew = arg === 'new';
    const row = isNew ? { published: 1, sort: 0, price: 0, duration_min: 60, months: 1 } : await api(`/api/admin/r/${def.res}/${arg}`);
    ADM.setTitle(isNew ? T(def.add) : row.title, !isNew && def.site ? `<a class="btn ghost" href="${def.site(row)}" target="_blank">${ic('external', 'sm')} ${esc(T('View on website'))}</a>` : '');
    const fieldVal = (f) => (f.type === 'privatefile' ? { file_path: row.file_path, file_name: row.file_name } : row[f.k]);
    el.innerHTML = `<a class="btn small ghost" href="#${key}">${ic('back', 'sm')} ${esc(T('Back'))}</a>
      <div class="panel" style="margin-top:12px"><div class="panel-body"><div class="fgrid" id="form">${def.fields.map((f) => fieldHtml(f, fieldVal(f))).join('')}
        ${!['consult_types', 'plans'].includes(def.res) ? fieldHtml({ k: 'slug', l: 'Page link name (optional)', hint: 'Leave empty to create it from the title', ltr: 1 }, row.slug) : ''}</div></div></div>
      <div id="extra"></div>
      <div class="form-actions"><button class="btn" id="save">${esc(T('Save'))}</button>${!isNew ? `<button class="btn ghost" id="remove" style="color:#ff6b81">${ic('trash', 'sm')} ${esc(T('Delete'))}</button>` : ''}<span class="err" id="err"></span></div>`;
    const form = el.querySelector('#form');
    bindFields(form);
    el.querySelector('#save').onclick = async () => {
      const body = collect(form);
      el.querySelector('#err').textContent = '';
      try {
        if (isNew) { const r = await post(`/api/admin/r/${def.res}`, body); toast(T('Saved')); ADM.go(`#${key}/${r.id}`); } else { await put(`/api/admin/r/${def.res}/${row.id}`, body); toast(T('Saved')); ADM.go(`#${key}/${row.id}`); }
      } catch (e) { el.querySelector('#err').textContent = e.message; }
    };
    const rm = el.querySelector('#remove');
    if (rm) {
      rm.onclick = async () => {
        if (!(await confirmDialog(T('Delete permanently?'), T('This cannot be undone. To hide it only, turn off "Visible on the website".'), T('Delete'), true))) return;
        await del(`/api/admin/r/${def.res}/${row.id}`); toast(T('Deleted')); ADM.go(`#${key}`);
      };
    }
    if (key === 'courses' && !isNew) lessonsManager(el.querySelector('#extra'), row.id);
    if (key === 'courses' && isNew) el.querySelector('#extra').innerHTML = `<div class="panel"><div class="panel-body muted">${esc(T('Save the course first, then you can add its lessons here.'))}</div></div>`;
  }

  async function lessonsManager(box, courseId) {
    const lessons = await api(`/api/admin/r/lessons?course_id=${courseId}`);
    box.innerHTML = `<div class="panel"><div class="panel-head"><h3>${esc(T('Lessons'))} (${lessons.length})</h3><button class="btn small" data-add>${ic('add', 'sm')} ${esc(T('Add lesson'))}</button></div>
      <div class="lst">${lessons.map((l, i) => `<div class="it"><b>${i + 1}</b><div class="grow"><b>${esc(l.title)}</b> ${l.is_preview ? `<span class="pill ok">${esc(T('Free preview'))}</span>` : ''}
        <div class="muted small" dir="ltr">${esc(l.video_url || T('No video yet'))}</div></div>
        <button class="icon-btn" data-mv="${l.id}" data-dir="-1" title="${esc(T('Move up'))}">${ic('up')}</button>
        <button class="icon-btn" data-mv="${l.id}" data-dir="1" title="${esc(T('Move down'))}" style="transform:rotate(180deg)">${ic('up')}</button>
        <button class="btn small ghost" data-edit="${l.id}">${ic('edit', 'sm')} ${esc(T('Edit'))}</button></div>`).join('') || `<div class="empty">${esc(T('No lessons yet.'))}</div>`}</div></div>`;
    const reload = () => lessonsManager(box, courseId);
    box.querySelector('[data-add]').onclick = () => lessonForm(courseId, { sort: lessons.length + 1 }, reload);
    box.querySelectorAll('[data-edit]').forEach((b) => { b.onclick = () => lessonForm(courseId, lessons.find((l) => l.id === Number(b.dataset.edit)), reload); });
    box.querySelectorAll('[data-mv]').forEach((b) => {
      b.onclick = async () => {
        const i = lessons.findIndex((l) => l.id === Number(b.dataset.mv));
        const j = i + Number(b.dataset.dir);
        if (j < 0 || j >= lessons.length) return;
        [lessons[i], lessons[j]] = [lessons[j], lessons[i]];
        for (let n = 0; n < lessons.length; n++) await put(`/api/admin/r/lessons/${lessons[n].id}`, { sort: n + 1 });
        reload();
      };
    });
  }
  function lessonForm(courseId, l, done) {
    const isNew = !l.id;
    const m = openModal(`<h2>${esc(T(isNew ? 'Add lesson' : 'Edit lesson'))}</h2><div class="fgrid" id="lf">${LESSON_FIELDS.map((f) => fieldHtml(f, l[f.k])).join('')}</div>
      <div class="error-text err"></div>
      <div class="actions">${!isNew ? `<button class="btn ghost" data-del style="color:#ff6b81">${esc(T('Delete'))}</button><span class="spacer"></span>` : ''}<button class="btn ghost" data-close>${esc(T('Cancel'))}</button><button class="btn" data-ok>${esc(T('Save'))}</button></div>`);
    m.el.classList.add('wide');
    m.el.querySelector('[data-ok]').onclick = async () => {
      const body = { ...collect(m.el.querySelector('#lf')), course_id: courseId };
      try { if (isNew) await post('/api/admin/r/lessons', body); else await put(`/api/admin/r/lessons/${l.id}`, body); m.close(); done(); } catch (e) { m.el.querySelector('.err').textContent = e.message; }
    };
    const d = m.el.querySelector('[data-del]');
    if (d) d.onclick = async () => { if (await confirmDialog(T('Delete this lesson?'), '', T('Delete'), true)) { await del(`/api/admin/r/lessons/${l.id}`); m.close(); done(); } };
  }

  ADM.views.courses = contentView('courses');
  ADM.views.books = contentView('books');
  ADM.views.posts = contentView('posts');
  // Consultations: just the 3 options (no types to create) + the "open session" text.
  ADM.views.consults = async (el) => {
    const { values } = await api('/api/admin/settings');
    ADM.setTitle(T('Consultations'), `<a class="btn ghost" href="/consultations" target="_blank">${ic('external', 'sm')} ${esc(T('View on website'))}</a>`);
    el.innerHTML = `<div class="panel"><div class="panel-head"><h3>${esc(T('Prices of the 3 options'))}</h3></div><div class="panel-body">
        <p class="muted small" style="margin-top:0">${esc(T('Clients choose one option, leave their WhatsApp number and pay. There is no calendar. Leave a price empty to hide that option.'))}</p>
        <div class="fgrid">
          ${fieldHtml({ k: 'consult_price_today', l: 'Book for today', type: 'number', hint: 'We contact you today' }, values.consult_price_today)}
          ${fieldHtml({ k: 'consult_price_2d', l: 'Book within 2 days', type: 'number', hint: 'We contact you within 2 days' }, values.consult_price_2d)}
          ${fieldHtml({ k: 'consult_price_4d', l: 'Book within 4 days', type: 'number', hint: 'We contact you within 4 days' }, values.consult_price_4d)}
        </div></div></div>
      <div class="panel"><div class="panel-head"><h3>${esc(T('Open session (no time limit)'))}</h3></div><div class="panel-body"><div class="fgrid">
        ${both('consult_open_title', 'Title').map((f) => fieldHtml(f, values[f.k])).join('')}
        ${both('consult_open_text', 'Text', 'textarea').map((f) => fieldHtml(f, values[f.k])).join('')}
      </div></div></div>
      <div class="form-actions"><button class="btn" id="save">${esc(T('Save changes'))}</button><a class="btn ghost" href="#bookings">${ic('event', 'sm')} ${esc(T('Consultation bookings'))}</a><span class="err" id="err"></span></div>`;
    el.querySelector('#save').onclick = async () => {
      try { await put('/api/admin/settings', { values: collect(el) }); toast(T('Saved')); } catch (e) { el.querySelector('#err').textContent = e.message; }
    };
  };
  ADM.views.plans = contentView('plans');

  // ---------------------------------------------------------------------------
  // Social media posts
  // ---------------------------------------------------------------------------
  const PLATFORMS = [['facebook', 'Facebook'], ['tiktok', 'TikTok'], ['youtube', 'YouTube'], ['instagram', 'Instagram']];
  ADM.views.social = async (el) => {
    const [rows, st, fol] = await Promise.all([api('/api/admin/r/social_posts'), api('/api/admin/settings'), api('/api/admin/social/followers')]);
    const s = st.values;
    ADM.setTitle(T('Social media'), `<button class="btn" id="addPost">${ic('add', 'sm')} ${esc(T('Add a post'))}</button>`);
    const nf = (n) => Number(n || 0).toLocaleString('en-US');
    const autoInfo = (p) => {
      const f = fol.fetched[p] || {};
      if (f.n && (!f.failed_at || f.at > f.failed_at)) return `<span class="pill ok">${esc(T('Counted automatically: {n}', { n: nf(f.n) }))}</span>`;
      if (f.failed_at) return `<span class="pill">${esc(T('Could not read it automatically - your number is used'))}</span>`;
      return '';
    };
    el.innerHTML = `<div class="panel"><div class="panel-head"><h3>${esc(T('Followers counter'))}</h3><span class="fol-total">${esc(T('Total'))}: <b>${nf(fol.total)}</b></span></div><div class="panel-body" id="folBox">
        <p class="muted small" style="margin-top:0">${esc(T('One total of all your followers is shown at the top of the website. Type each number; with "count automatically" on, the site also tries to read the real numbers every 12 hours (YouTube and TikTok usually work, Instagram and Facebook often block it, so keep your typed number up to date).'))}</p>
        <div class="fgrid">${PLATFORMS.map(([p, l]) => `<div class="fld"><label>${ic(p, 'sm')} ${esc(l)}</label><input type="number" min="0" step="1" data-k="followers_${p}" value="${esc(s[`followers_${p}`] || '')}" placeholder="0">${autoInfo(p)}</div>`).join('')}</div>
        <div class="row" style="margin-top:12px">
          <label class="switch"><input type="checkbox" data-k="followers_auto" ${s.followers_auto === '1' ? 'checked' : ''}> ${esc(T('Count automatically'))}</label>
          <label class="switch"><input type="checkbox" data-k="followers_show" ${s.followers_show === '1' ? 'checked' : ''}> ${esc(T('Show at the top of the website'))}</label></div>
        <div class="row" style="margin-top:12px"><button class="btn" id="folSave">${esc(T('Save'))}</button><button class="btn ghost" id="folNow">${ic('refresh', 'sm')} ${esc(T('Count now'))}</button></div>
      </div></div>
      <div class="panel"><div class="panel-body">
        <p style="margin-top:0">${esc(T('Posts shown on the home page under "Follow Mohamed". YouTube videos are added automatically every few hours. For TikTok, Facebook and Instagram, paste the post link and the title and picture are filled in for you when possible.'))}</p>
        <div class="row"><span class="pill ${s.youtube_channel_id ? 'ok' : 'warn'}">YouTube: ${esc(s.youtube_channel_id ? T('connected') : T('add the channel link in "Site texts & images"'))}</span>
        ${s.youtube_channel_id ? `<button class="btn small ghost" id="sync">${ic('refresh', 'sm')} ${esc(T('Get latest videos now'))}</button>` : ''}</div></div></div>
      <div class="sgrid">${rows.map((r) => `<div class="scard ${r.hidden ? 'hidden-post' : ''}">
        <div class="si" style="${r.thumbnail ? esc(ImgPos.bg(r.thumbnail)) : ''}"><span class="pill plat">${ic(r.platform, 'sm')} ${esc(r.platform)}</span></div>
        <div class="sb">${r.pinned ? '📌 ' : ''}${esc((r.title || '').slice(0, 120) || T('(no title)'))}<div class="muted small">${esc(date(r.posted_at || r.created_at))} · ${esc(T(r.source === 'auto' ? 'automatic' : 'manual'))}</div></div>
        <div class="sa"><button class="btn small ghost" data-pin="${r.id}">${ic('pin', 'sm')} ${esc(T(r.pinned ? 'Unpin' : 'Pin'))}</button>
          <button class="btn small ghost" data-hide="${r.id}">${ic(r.hidden ? 'eye' : 'eyeoff', 'sm')} ${esc(T(r.hidden ? 'Show' : 'Hide'))}</button>
          <button class="btn small ghost" data-edit="${r.id}">${ic('edit', 'sm')}</button>
          <a class="btn small ghost" href="${esc(r.url)}" target="_blank">${ic('external', 'sm')}</a></div></div>`).join('') || `<div class="empty">${esc(T('No posts yet.'))}</div>`}</div>`;
    const reload = () => ADM.views.social(el);
    el.querySelector('#folSave').onclick = async () => {
      const v = collect(el.querySelector('#folBox'));
      v.followers_auto = v.followers_auto ? '1' : '0';
      v.followers_show = v.followers_show ? '1' : '0';
      try { await put('/api/admin/settings', { values: v }); toast(T('Saved')); reload(); } catch (e) { toast(e.message); }
    };
    el.querySelector('#folNow').onclick = async (e) => {
      e.target.disabled = true; e.target.textContent = T('Loading…');
      try { await post('/api/admin/social/followers'); toast(T('Done')); reload(); } catch (ex) { toast(ex.message); e.target.disabled = false; }
    };
    document.getElementById('addPost').onclick = () => socialForm({}, reload);
    const sync = el.querySelector('#sync');
    if (sync) sync.onclick = async () => { sync.disabled = true; try { const r = await post('/api/admin/social/sync'); toast(T('{n} new videos added', { n: r.added || 0 })); reload(); } catch (e) { toast(e.message); sync.disabled = false; } };
    el.querySelectorAll('[data-pin]').forEach((b) => { b.onclick = async () => { const r = rows.find((x) => x.id === Number(b.dataset.pin)); await put(`/api/admin/r/social_posts/${r.id}`, { pinned: !r.pinned }); reload(); }; });
    el.querySelectorAll('[data-hide]').forEach((b) => { b.onclick = async () => { const r = rows.find((x) => x.id === Number(b.dataset.hide)); await put(`/api/admin/r/social_posts/${r.id}`, { hidden: !r.hidden }); reload(); }; });
    el.querySelectorAll('[data-edit]').forEach((b) => { b.onclick = () => socialForm(rows.find((x) => x.id === Number(b.dataset.edit)), reload); });
  };
  function socialForm(r, done) {
    const isNew = !r.id;
    const fields = [
      { k: 'url', l: 'Post link', type: 'url', req: 1, full: 1 },
      { k: 'platform', l: 'Platform', type: 'select', options: PLATFORMS },
      { k: 'posted_at', l: 'Post date', type: 'datetime' },
      { k: 'title', l: 'Short text about the post', type: 'textarea', rows: 2, full: 1 },
      { k: 'thumbnail', l: 'Picture', type: 'image', aspects: ['16/10'] },
      { k: 'pinned', l: 'Pin to the top', type: 'check' },
    ];
    const m = openModal(`<h2>${esc(T(isNew ? 'Add a post' : 'Edit post'))}</h2>
      ${isNew ? `<div class="row" style="margin-bottom:12px"><input class="search" style="flex:1;border-radius:10px;padding:10px 12px" id="pasteUrl" dir="ltr" placeholder="https://www.tiktok.com/@.../video/..."><button class="btn" id="fetchBtn">${esc(T('Fetch details'))}</button></div>` : ''}
      <div class="fgrid" id="sf">${fields.map((f) => fieldHtml(f, r[f.k] != null ? r[f.k] : (f.k === 'platform' ? 'facebook' : ''))).join('')}</div>
      <div class="error-text err"></div>
      <div class="actions">${!isNew ? `<button class="btn ghost" data-del style="color:#ff6b81">${esc(T('Delete'))}</button><span class="spacer"></span>` : ''}<button class="btn ghost" data-close>${esc(T('Cancel'))}</button><button class="btn" data-ok>${esc(T('Save'))}</button></div>`);
    m.el.classList.add('wide');
    const sf = m.el.querySelector('#sf');
    bindFields(sf);
    const set = (k, v) => { const inp = sf.querySelector(`[data-k="${k}"]`); if (inp) inp.value = v || ''; };
    const fb = m.el.querySelector('#fetchBtn');
    if (fb) {
      fb.onclick = async () => {
        const url = m.el.querySelector('#pasteUrl').value.trim();
        fb.disabled = true; fb.textContent = T('Loading…');
        try {
          const p = await post('/api/admin/social/preview', { url });
          set('url', url); if (p.platform) set('platform', p.platform); set('title', p.title);
          if (p.thumbnail) { set('thumbnail', p.thumbnail); const pv = sf.querySelector('[data-img] .pv'); pv.style.backgroundImage = `url('${p.thumbnail}')`; pv.textContent = ''; }
          if (!p.title && !p.thumbnail) toast(T('This platform did not share the details. Please add the text and picture yourself.'));
        } catch (e) { toast(e.message); }
        fb.disabled = false; fb.textContent = T('Fetch details');
      };
    }
    m.el.querySelector('[data-ok]').onclick = async () => {
      const body = collect(sf);
      try { if (isNew) await post('/api/admin/r/social_posts', body); else await put(`/api/admin/r/social_posts/${r.id}`, body); m.close(); done(); } catch (e) { m.el.querySelector('.err').textContent = e.message; }
    };
    const d = m.el.querySelector('[data-del]');
    if (d) d.onclick = async () => { if (await confirmDialog(T('Delete this post?'), '', T('Delete'), true)) { await del(`/api/admin/r/social_posts/${r.id}`); m.close(); done(); } };
  }

  // ---------------------------------------------------------------------------
  // Site texts & images
  // ---------------------------------------------------------------------------
  const both = (k, l, type) => [{ k: `${k}_ar`, l: `${l} (Arabic)`, type }, { k: `${k}_en`, l: `${l} (English)`, type, ltr: 1 }];
  const SITE_GROUPS = [
    ['Name & logo', [...both('site_name', 'Site name'), ...both('tagline', 'Slogan'), { k: 'img_logo', l: 'Logo (small square image)', type: 'image', aspects: ['1/1'], fit: 'contain' }]],
    ['Home page - top section', [...both('hero_title', 'Big title'), ...both('hero_text', 'Text under the title', 'textarea'), { k: 'img_hero', l: 'Main photo of Mohamed', type: 'image', aspects: ['4/5', '1/1'], hint: 'Large on computers (first frame), wider on phones (second frame).' }]],
    ['About section', [...both('about_title', 'Title'), ...both('about_text', 'Text', 'textarea'), { k: 'img_about', l: 'Photo', type: 'image', aspects: ['1/1'], round: true }]],
    ['Page background images', ['img_courses', 'img_books', 'img_blog', 'img_consult'].map((k, i) => ({ k, l: ['Courses page', 'Books page', 'Blog page', 'Consultations page'][i], type: 'image', aspects: ['16/5', '16/9'] }))],
    ['Social media accounts', [
      { k: 'social_facebook', l: 'Facebook page link', type: 'url' }, { k: 'social_tiktok', l: 'TikTok account link', type: 'url' },
      { k: 'social_youtube', l: 'YouTube channel link', type: 'url', hint: 'Used to show the latest videos automatically' }, { k: 'social_instagram', l: 'Instagram account link', type: 'url' }]],
  ];
  ADM.views.site = async (el) => {
    const { values } = await api('/api/admin/settings');
    const canSettings = ADM.can('settings');
    el.innerHTML = `<p class="muted" style="margin-top:0">${esc(T('Change the texts and pictures that appear on the website. Images can be uploaded or chosen from the library.'))}</p>
      ${SITE_GROUPS.map(([g, fields]) => `<div class="panel"><div class="panel-head"><h3>${esc(T(g))}</h3></div><div class="panel-body"><div class="fgrid">${fields.map((f) => fieldHtml(f, values[f.k])).join('')}</div></div></div>`).join('')}
      ${canSettings ? `<div class="panel"><div class="panel-body muted">${esc(T('Currency, payment methods and payment instructions are in Settings > Payments.'))} <a class="btn small ghost" href="#payments">${esc(T('Open'))}</a></div></div>` : ''}
      <div class="form-actions"><button class="btn" id="save">${esc(T('Save changes'))}</button><a class="btn ghost" href="/" target="_blank">${ic('external', 'sm')} ${esc(T('View website'))}</a><span class="err" id="err"></span></div>`;
    bindFields(el);
    el.querySelector('#save').onclick = async () => {
      try {
        const r = await put('/api/admin/settings', { values: collect(el) });
        toast(T('Saved'));
      } catch (e) { el.querySelector('#err').textContent = e.message; }
    };
  };

  // ---------------------------------------------------------------------------
  // Colours (palette tester with live preview)
  // ---------------------------------------------------------------------------
  ADM.views.appearance = async (el) => {
    const { values, palettes } = await api('/api/admin/settings');
    let saved;
    try { saved = JSON.parse(values.theme); } catch (e) { saved = palettes[0]; }
    let cur = { ...saved };
    const lum = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
    const KEYS = [['bg', 'Background'], ['surface', 'Cards & boxes'], ['text', 'Text'], ['primary', 'Main colour']];
    el.innerHTML = `<div class="appearance">
      <div>
        <div class="panel"><div class="panel-head"><h3>${esc(T('Ready-made palettes'))}</h3></div><div class="panel-body">
          <p class="muted small" style="margin-top:0">${esc(T('Click a palette to try it on the preview. Nothing changes on the real website until you press Save.'))}</p>
          ${[['light', '☀️ Bright colours'], ['dark', '🌙 Dark colours']].map(([tone, label]) => `<div class="pal-group">${esc(T(label))}</div>
          <div class="palettes">${palettes.filter((p) => (lum(p.bg) > 0.5) === (tone === 'light')).map((p) => `<button class="pal" data-pal="${p.id}"><div class="sw">${['bg', 'surface', 'primary', 'text'].map((k) => `<span style="background:${p[k]}"></span>`).join('')}</div><div class="pn">${esc(T(p.name))}</div></button>`).join('')}</div>`).join('')}
        </div></div>
        <div class="panel"><div class="panel-head"><h3>${esc(T('Or pick each colour'))}</h3></div><div class="panel-body">
          <div class="colors">${KEYS.map(([k, l]) => `<label>${esc(T(l))}<input type="color" data-c="${k}"></label>`).join('')}</div>
        </div></div>
        <div class="form-actions"><button class="btn" id="save">${esc(T('Save & apply to the website'))}</button><button class="btn ghost" id="undo">${esc(T('Undo'))}</button></div>
      </div>
      <div class="panel"><div class="panel-head"><h3>${esc(T('Live preview'))}</h3><div class="row"><button class="chip on" data-pv="/">${esc(T('Home'))}</button><button class="chip" data-pv="/courses">${esc(T('Courses'))}</button><button class="chip" data-pv="/login">${esc(T('Log in'))}</button></div></div>
        <iframe class="preview-frame" id="pv" src="/"></iframe></div>
    </div>`;
    const frame = el.querySelector('#pv');
    const apply = () => {
      el.querySelectorAll('[data-c]').forEach((inp) => { inp.value = cur[inp.dataset.c]; });
      el.querySelectorAll('[data-pal]').forEach((b) => {
        const p = palettes.find((x) => x.id === b.dataset.pal);
        b.classList.toggle('on', ['bg', 'surface', 'text', 'primary'].every((k) => p[k].toLowerCase() === String(cur[k]).toLowerCase()));
      });
      const theme = { ...cur, 'on-primary': lum(cur.primary) > 0.45 ? '#111111' : '#ffffff' };
      try { frame.contentWindow.postMessage({ type: 'theme', theme, tone: lum(cur.bg) > 0.5 ? 'light' : 'dark' }, location.origin); } catch (e) { /* not loaded yet */ }
    };
    frame.addEventListener('load', apply);
    el.querySelectorAll('[data-pal]').forEach((b) => { b.onclick = () => { const p = palettes.find((x) => x.id === b.dataset.pal); cur = { bg: p.bg, surface: p.surface, text: p.text, primary: p.primary, name: p.name }; apply(); }; });
    el.querySelectorAll('[data-c]').forEach((inp) => { inp.oninput = () => { cur[inp.dataset.c] = inp.value; cur.name = 'Custom'; apply(); }; });
    el.querySelectorAll('[data-pv]').forEach((b) => { b.onclick = () => { el.querySelectorAll('[data-pv]').forEach((x) => x.classList.toggle('on', x === b)); frame.src = b.dataset.pv; }; });
    el.querySelector('#undo').onclick = () => { cur = { ...saved }; apply(); };
    el.querySelector('#save').onclick = async () => {
      try {
        await put('/api/admin/settings', { values: { theme: cur } });
        saved = { ...cur };
        document.documentElement.dataset.tone = lum(cur.bg) > 0.5 ? 'light' : 'dark';
        document.getElementById('themeVars').textContent = `:root{--c-bg:${cur.bg};--c-surface:${cur.surface};--c-text:${cur.text};--c-primary:${cur.primary};--c-on-primary:${lum(cur.primary) > 0.45 ? '#111111' : '#ffffff'};color-scheme:${lum(cur.bg) > 0.5 ? 'light' : 'dark'}}`;
        toast(T('Colours saved. The website now uses them.'));
      } catch (e) { toast(e.message); }
    };
    apply();
  };
  // ---------------------------------------------------------------------------
  // Payments: which methods each place offers, PayPal details, online payment status, currency
  // ---------------------------------------------------------------------------
  const PLACES = [['pay_course', 'Courses'], ['pay_book', 'Books'], ['pay_plan', 'Membership plans'], ['pay_consult', 'Consultations']];
  const PAY_METHODS = [
    ['chat', 'Chat with the team', 'The order is sent in the chat and your team replies with the payment details.'],
    ['paypal', 'PayPal + screenshot', 'The client pays with PayPal, then uploads a screenshot of the payment. You check it and press "Confirm payment".'],
    ['gateway', 'Online payment (automatic)', 'PayPal Checkout: card or PayPal account. The order is activated by itself right after paying.'],
  ];
  ADM.views.payments = async (el) => {
    const { values, payments: ps } = await api('/api/admin/settings');
    const on = (k, m) => String(values[k] || 'chat').split(',').includes(m);
    const ppReady = !!(values.paypal_me || values.paypal_email);
    el.innerHTML = `<p class="muted" style="margin-top:0">${esc(T('Choose how clients pay in each place. When you tick more than one method, the client chooses on the payment page.'))}</p>
      <div class="panel"><div class="panel-head"><h3>${esc(T('Payment method in each place'))}</h3></div>
        <div class="table-wrap"><table class="tbl pm-table"><thead><tr><th></th>${PAY_METHODS.map(([m, l]) => `<th>${esc(T(l))}</th>`).join('')}</tr></thead>
        <tbody>${PLACES.map(([k, l]) => `<tr><td><b>${esc(T(l))}</b></td>${PAY_METHODS.map(([m]) => `<td><label class="switch"><input type="checkbox" data-place="${k}" value="${m}" ${on(k, m) ? 'checked' : ''}></label></td>`).join('')}</tr>`).join('')}</tbody></table></div>
        <div class="panel-body"><ul class="pm-help">${PAY_METHODS.map(([m, l, h]) => `<li><b>${esc(T(l))}:</b> ${esc(T(h))}</li>`).join('')}</ul>
          ${!ppReady ? `<div class="note-warn">${esc(T('PayPal is not set up yet: add your PayPal.me link or PayPal email below. Until then it is not shown to clients.'))}</div>` : ''}
          ${!ps.gatewayReady ? `<div class="note-warn">${esc(T('Online payment is not set up yet (see below). Until then it is not shown to clients.'))}</div>` : ''}</div></div>

      <div class="panel"><div class="panel-head"><h3>${ic('paypal')} PayPal</h3></div><div class="panel-body">
        <div class="fgrid">
          ${fieldHtml({ k: 'paypal_me', l: 'PayPal.me link or username', ltr: 1, hint: 'For example paypal.me/YourName. Clients get a button that opens PayPal with the exact amount filled in.' }, values.paypal_me)}
          ${fieldHtml({ k: 'paypal_email', l: 'PayPal email (optional)', type: 'email', hint: 'Shown so clients can also send the money to this email.' }, values.paypal_email)}
          ${fieldHtml({ k: 'paypal_note_ar', l: 'Extra note for PayPal payments (Arabic)', type: 'textarea', rows: 2 }, values.paypal_note_ar)}
          ${fieldHtml({ k: 'paypal_note_en', l: 'Extra note for PayPal payments (English)', type: 'textarea', rows: 2, ltr: 1 }, values.paypal_note_en)}
        </div>
        <details class="howto"><summary>${esc(T('What the client sees, step by step'))}</summary><ol>
          <li>${esc(T('Presses Buy, then chooses PayPal on the payment page.'))}</li>
          <li>${esc(T('Presses "Pay with PayPal": PayPal opens with the amount ready (or copies your PayPal email).'))}</li>
          <li>${esc(T('Sends the payment and writes the order number in the note.'))}</li>
          <li>${esc(T('Takes a screenshot of the PayPal success screen (the page shows how on every device).'))}</li>
          <li>${esc(T('Uploads the screenshot on the payment page. It appears in your Inbox and in Orders & payments marked "Screenshot received".'))}</li>
          <li>${esc(T('You check the money arrived in your PayPal account, then press "Confirm payment". The client gets access straight away and is told in the chat.'))}</li>
        </ol></details></div></div>

      <div class="panel"><div class="panel-head"><h3>${ic('card')} ${esc(T('Online payment (PayPal Checkout)'))}</h3>
        <span class="pill ${ps.gatewayReady ? 'ok' : 'warn'}">${esc(ps.gatewayReady ? T('Connected ({mode})', { mode: ps.gatewayMode }) : T('Not set up'))}</span></div><div class="panel-body">
        <p style="margin-top:0">${esc(T('Clients pay by card or PayPal on PayPal\'s secure page and the order is activated automatically. To turn it on:'))}</p>
        <ol class="howto-list">
          <li>${esc(T('Open developer.paypal.com and log in with your PayPal Business account.'))}</li>
          <li>${esc(T('Apps & Credentials > switch to "Live" > Create App.'))}</li>
          <li>${esc(T('Copy the Client ID and the Secret.'))}</li>
          <li>${esc(T('On Railway > Variables add: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET and PAYPAL_MODE=live. The server restarts by itself.'))}</li>
          <li>${esc(T('Come back here: it shows "Connected". Then tick "Online payment" above.'))}</li>
        </ol>
        <p class="muted small">${esc(T('To test first without real money, use the Sandbox keys and PAYPAL_MODE=sandbox.'))}</p></div></div>

      <div class="panel"><div class="panel-head"><h3>${ic('chat')} ${esc(T('Chat payment instructions'))}</h3></div><div class="panel-body"><div class="fgrid">
        ${fieldHtml({ k: 'payment_note_ar', l: 'Text (Arabic)', type: 'textarea' }, values.payment_note_ar)}
        ${fieldHtml({ k: 'payment_note_en', l: 'Text (English)', type: 'textarea', ltr: 1 }, values.payment_note_en)}</div></div></div>

      <div class="panel"><div class="panel-head"><h3>${esc(T('Currency'))}</h3></div><div class="panel-body"><div class="fgrid">
        ${fieldHtml({ k: 'currency', l: 'Currency', type: 'select', options: [['USD', 'US dollar (USD)'], ['EUR', 'Euro (EUR)'], ['GBP', 'British pound (GBP)'], ['EGP', 'Egyptian pound (EGP)'], ['SAR', 'Saudi riyal (SAR)'], ['AED', 'UAE dirham (AED)']] }, values.currency)}
        <div class="fld"><span class="lbl">&nbsp;</span><div class="hint">${esc(T('PayPal works with USD, EUR and GBP. Prices are not converted: update them in each course, book, plan and consultation.'))}</div></div></div></div></div>

      <div class="form-actions"><button class="btn" id="save">${esc(T('Save changes'))}</button><span class="err" id="err"></span></div>`;
    el.querySelector('#save').onclick = async () => {
      const err = el.querySelector('#err');
      err.textContent = '';
      const body = collect(el);
      for (const [k, l] of PLACES) {
        const list = [...el.querySelectorAll(`[data-place="${k}"]:checked`)].map((c) => c.value);
        if (!list.length) { err.textContent = T('Choose at least one payment method for: {place}', { place: T(l) }); return; }
        body[k] = list.join(',');
      }
      try {
        const r = await put('/api/admin/settings', { values: body });
        ADM.currency = r.values.currency;
        toast(T('Saved'));
        ADM.views.payments(el);
      } catch (e) { err.textContent = e.message; }
    };
  };

  // ---------------------------------------------------------------------------
  // Google Drive: book PDFs are uploaded into the owner's Drive
  // ---------------------------------------------------------------------------
  ADM.views.gdrive = async (el, arg) => {
    const g = await api('/api/admin/gdrive');
    if (arg === 'ok') toast(T('Google Drive connected'));
    if (arg === 'error') toast(T('Google Drive could not be connected. Please try again.'));
    const steps = [
      'Open console.cloud.google.com with your Google account and create a project (any name).',
      'APIs & Services > Library: search "Google Drive API" and press Enable.',
      'APIs & Services > OAuth consent screen: choose External, fill the app name and your email, then press "Publish app" so the connection does not expire.',
      'APIs & Services > Credentials > Create credentials > OAuth client ID > Web application.',
      'Under "Authorized redirect URIs" add exactly the address below, then Create.',
      'Copy the Client ID and Client secret into Railway > Variables as GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET. The server restarts by itself.',
      'Come back to this page and press "Connect Google Drive".',
    ];
    el.innerHTML = `<div class="panel"><div class="panel-head"><h3>${ic('drive')} ${esc(T('Google Drive for book PDFs'))}</h3>
        <span class="pill ${g.connected ? 'ok' : 'warn'}">${esc(g.connected ? T('Connected') : g.configured ? T('Not connected') : T('Not set up'))}</span></div><div class="panel-body">
        <p style="margin-top:0">${esc(T('When Google Drive is connected, every book PDF you upload goes into a private folder in your own Google Drive instead of the website database. Buyers read it in the on-site reader; the file is never shared publicly.'))}</p>
        ${g.connected ? `<div class="drive-box">${ic('drive')}<div><b>${esc(g.email || '')}</b><div class="muted small">${esc(T('New book PDFs are saved in the folder:'))} <a href="${esc(g.folder)}" target="_blank">${esc(T('Website books (do not delete)'))}</a></div></div></div>
            <div class="row" style="margin-top:12px"><a class="btn ghost" href="/admin/google/connect">${ic('refresh', 'sm')} ${esc(T('Reconnect'))}</a><button class="btn ghost" id="gdOff" style="color:#ff6b81">${esc(T('Disconnect'))}</button></div>
            <p class="muted small">${esc(T('Books uploaded before stay where they are. Do not delete or move the files in that folder, or the books will stop opening.'))}</p>`
          : g.configured ? `<a class="btn" href="/admin/google/connect">${ic('drive', 'sm')} ${esc(T('Connect Google Drive'))}</a>` : ''}
      </div></div>
      ${!g.connected ? `<div class="panel"><div class="panel-head"><h3>${esc(T('One-time setup'))}</h3></div><div class="panel-body">
        <ol class="howto-list">${steps.map((x) => `<li>${esc(T(x))}</li>`).join('')}</ol>
        <div class="slug-row" dir="ltr" style="margin-top:12px"><input readonly value="${esc(g.redirect)}"><button class="btn small ghost" id="gdCopy">${ic('copy')} ${esc(T('Copy'))}</button></div>
      </div></div>` : ''}`;
    const off = el.querySelector('#gdOff');
    if (off) off.onclick = async () => { if (await confirmDialog(T('Disconnect Google Drive?'), T('New PDFs will be saved in the website database again. Books already in Drive will not open until you connect the same account again.'), T('Disconnect'), true)) { await post('/api/admin/gdrive/disconnect'); ADM.views.gdrive(el); } };
    const cp = el.querySelector('#gdCopy');
    if (cp) cp.onclick = async () => { try { await navigator.clipboard.writeText(g.redirect); toast(T('Copied')); } catch (e) { prompt('', g.redirect); } };
  };

  // ---------------------------------------------------------------------------
  // Link page: the hidden "link in bio" page (like Linktree) at /p/<secret link>
  // ---------------------------------------------------------------------------
  const SOCIAL_TYPES = [['youtube', 'YouTube'], ['tiktok', 'TikTok'], ['instagram', 'Instagram'], ['facebook', 'Facebook'], ['linkedin', 'LinkedIn'], ['x', 'X (Twitter)'],
    ['whatsapp', 'WhatsApp'], ['telegram', 'Telegram'], ['email', 'Email'], ['phone', 'Phone'], ['website', 'Website']];
  const SITE_PAGES = [['/chat', 'Chat'], ['/courses', 'Courses'], ['/books', 'Books'], ['/consultations', 'Consultations'], ['/membership', 'Membership'], ['/blog', 'Blog'], ['/reviews', 'Reviews'], ['/', 'Home']];
  const randSlug = () => Array.from(crypto.getRandomValues(new Uint8Array(5)), (b) => b.toString(16).padStart(2, '0')).join('');

  ADM.views.linkpage = async (el) => {
    const [d, cat] = await Promise.all([api('/api/admin/linkpage'), api('/api/admin/catalog').catch(() => ({ courses: [], books: [] }))]);
    const pageUrl = (slug) => `${location.origin}/p/${slug}`;
    const pickOptions = `<option value="">${esc(T('Choose a page of the website…'))}</option>
      <optgroup label="${esc(T('Sections'))}">${SITE_PAGES.map(([u, l]) => `<option value="${esc(u)}" data-title="${esc(T(l))}">${esc(T(l))}</option>`).join('')}</optgroup>
      ${cat.courses.length ? `<optgroup label="${esc(T('Courses'))}">${cat.courses.map((c) => `<option value="/courses/${esc(encodeURIComponent(c.slug))}" data-title="${esc(c.title)}" data-img="${esc(c.cover || '')}">${esc(c.title)}</option>`).join('')}</optgroup>` : ''}
      ${cat.books.length ? `<optgroup label="${esc(T('Books'))}">${cat.books.map((b) => `<option value="/books/${esc(encodeURIComponent(b.slug))}" data-title="${esc(T('Book'))} «${esc(b.title)}»" data-img="${esc(b.cover || '')}">${esc(b.title)}</option>`).join('')}</optgroup>` : ''}`;
    const moveBtns = `<button type="button" class="icon-btn" data-mv="-1" title="${esc(T('Move up'))}">${ic('up')}</button><button type="button" class="icon-btn" data-mv="1" title="${esc(T('Move down'))}" style="transform:rotate(180deg)">${ic('up')}</button>
      <button type="button" class="icon-btn" data-rm title="${esc(T('Delete'))}" style="color:#ff6b81">${ic('trash')}</button>`;
    const socRow = (x = { type: 'instagram', url: '' }) => `<div class="lp-row soc-row" data-row>
      <span class="lp-ic">${ic(x.type === 'website' ? 'globe' : x.type)}</span>
      <select data-f="type">${SOCIAL_TYPES.map(([v, l]) => `<option value="${v}" ${v === x.type ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>
      <input data-f="url" dir="ltr" value="${esc(x.url)}" placeholder="https://…">${moveBtns}</div>`;
    const linkRow = (l = { title: '', url: '', image: '', visible: true }) => `<div class="lp-row link-row ${l.visible ? '' : 'off'}" data-row data-id="${esc(l.id || '')}">
      <div class="lr-img">${fieldHtml({ k: 'image', l: 'Picture', type: 'image', aspects: ['1/1'], round: true }, l.image)}</div>
      <div class="lr-main">
        <label class="lr-l">${esc(T('Button text'))}<input data-f="title" value="${esc(l.title)}" maxlength="160"></label>
        <label class="lr-l">${esc(T('Link'))}<input data-f="url" dir="ltr" value="${esc(l.url)}" placeholder="/courses  ·  https://…"></label>
        <select data-pick>${pickOptions}</select>
        <div class="row"><label class="switch"><input type="checkbox" data-f="visible" ${l.visible ? 'checked' : ''}> ${esc(T('Visible'))}</label>
          <label class="switch"><input type="checkbox" data-f="highlight" ${l.highlight ? 'checked' : ''}> ${esc(T('Highlight (gold)'))}</label></div>
      </div>
      <div class="lr-side">${moveBtns}</div></div>`;

    ADM.setTitle(T('Link page'), `<a class="btn ghost" href="${esc(pageUrl(d.slug))}" target="_blank">${ic('external', 'sm')} ${esc(T('Open the page'))}</a>`);
    el.innerHTML = `<div class="lp-admin"><div class="lp-form">
      <div class="panel"><div class="panel-head"><h3>${esc(T('Secret link'))}</h3></div><div class="panel-body">
        <p class="muted small" style="margin-top:0">${esc(T('This page is not linked anywhere on the website and is hidden from Google. Only people who have the link can open it. Put it in your Instagram / TikTok bio.'))}</p>
        <div class="fgrid" id="lpTop">
          ${fieldHtml({ k: 'enabled', l: 'Page is on', type: 'check' }, d.enabled)}
          <div class="fld full"><label>${esc(T('Link'))}</label><div class="slug-row" dir="ltr"><span class="muted">${esc(location.origin)}/p/</span><input data-k="slug" value="${esc(d.slug)}" maxlength="60"></div>
            <div class="row" style="margin-top:8px"><button type="button" class="btn small" id="copyUrl">${ic('copy')} ${esc(T('Copy link'))}</button>
            <button type="button" class="btn small ghost" id="newSlug">${ic('refresh', 'sm')} ${esc(T('New secret link'))}</button></div>
            <div class="hint">${esc(T('Changing the link stops the old one from working. Use English letters, numbers and dashes.'))}</div></div>
        </div></div></div>

      <div class="panel"><div class="panel-head"><h3>${esc(T('Photo, name and text'))}</h3></div><div class="panel-body"><div class="fgrid" id="lpProfile">
        ${fieldHtml({ k: 'image', l: 'Main photo (its bottom fades into the page)', type: 'image', aspects: ['1/1.08', '16/9'] }, d.image)}
        ${fieldHtml({ k: 'name', l: 'Name' }, d.name)}
        ${fieldHtml({ k: 'heading', l: 'Title above the buttons' }, d.heading)}
        ${fieldHtml({ k: 'bio', l: 'Short text under the name', type: 'textarea', rows: 2 }, d.bio)}
        ${fieldHtml({ k: 'dir', l: 'Page direction', type: 'select', options: [['rtl', 'Arabic (right to left)'], ['ltr', 'English (left to right)']] }, d.dir)}
        ${fieldHtml({ k: 'show_logo', l: 'Show the logo button (top corner)', type: 'check' }, d.show_logo)}
      </div></div></div>

      <div class="panel"><div class="panel-head"><h3>${esc(T('Social media icons'))}</h3><button type="button" class="btn small" id="addSoc">${ic('add', 'sm')} ${esc(T('Add'))}</button></div>
        <div class="panel-body"><div class="lp-rows" id="socRows">${d.socials.map(socRow).join('')}</div></div></div>

      <div class="panel"><div class="panel-head"><h3>${esc(T('Buttons'))}</h3><button type="button" class="btn small" id="addLink">${ic('add', 'sm')} ${esc(T('Add button'))}</button></div>
        <div class="panel-body"><p class="muted small" style="margin-top:0">${esc(T('Each button can open a page of the website (choose it from the list) or any other link.'))}</p>
        <div class="lp-rows" id="linkRows">${d.links.map(linkRow).join('')}</div></div></div>

      <div class="form-actions sticky-save"><button class="btn" id="save">${esc(T('Save changes'))}</button><span class="err" id="err"></span></div>
    </div>
    <div class="lp-preview panel"><div class="panel-head"><h3>${esc(T('Live preview'))}</h3><span class="muted small">${esc(T('Updates after saving'))}</span></div>
      <div class="phone"><iframe id="lpFrame" src="${esc(pageUrl(d.slug))}" title="preview"></iframe></div></div></div>`;

    bindFields(el);
    const socRows = el.querySelector('#socRows');
    const linkRows = el.querySelector('#linkRows');
    el.querySelector('#addSoc').onclick = () => socRows.insertAdjacentHTML('beforeend', socRow());
    el.querySelector('#addLink').onclick = () => { linkRows.insertAdjacentHTML('beforeend', linkRow()); linkRows.lastElementChild.querySelector('[data-f=title]').focus(); };
    el.querySelector('#newSlug').onclick = () => { el.querySelector('[data-k=slug]').value = randSlug(); toast(T('Press Save to use the new link')); };
    el.querySelector('#copyUrl').onclick = async () => {
      const u = pageUrl(el.querySelector('[data-k=slug]').value.trim());
      try { await navigator.clipboard.writeText(u); toast(T('Link copied')); } catch (e) { prompt('', u); }
    };
    el.addEventListener('click', (e) => {
      const row = e.target.closest('[data-row]');
      if (!row) return;
      if (e.target.closest('[data-rm]')) { row.remove(); return; }
      const mv = e.target.closest('[data-mv]');
      if (mv) {
        if (mv.dataset.mv === '-1' && row.previousElementSibling) row.parentNode.insertBefore(row, row.previousElementSibling);
        if (mv.dataset.mv === '1' && row.nextElementSibling) row.parentNode.insertBefore(row.nextElementSibling, row);
      }
    });
    el.addEventListener('change', (e) => {
      const pick = e.target.closest('[data-pick]');
      if (pick && pick.value) {
        const row = pick.closest('[data-row]');
        const opt = pick.selectedOptions[0];
        row.querySelector('[data-f=url]').value = pick.value;
        const title = row.querySelector('[data-f=title]');
        if (!title.value) title.value = opt.dataset.title || '';
        const img = row.querySelector('[data-k=image]');
        if (!img.value && opt.dataset.img) { // use the course / book cover as the picture
          img.value = opt.dataset.img;
          row.querySelector('.pv').innerHTML = `<img src="${esc(ImgPos.src(opt.dataset.img))}" style="${ADM.imgStyle(opt.dataset.img)}" alt="">`;
          row.querySelector('[data-imgo="pos"]').hidden = false;
        }
        pick.value = '';
      }
      const type = e.target.closest('.soc-row [data-f=type]');
      if (type) type.closest('[data-row]').querySelector('.lp-ic').innerHTML = ic(type.value === 'website' ? 'globe' : type.value);
      const vis = e.target.closest('.link-row [data-f=visible]');
      if (vis) vis.closest('[data-row]').classList.toggle('off', !vis.checked);
    });
    const rowVal = (row, f) => { const i = row.querySelector(`[data-f=${f}]`); return i.type === 'checkbox' ? i.checked : i.value; };
    el.querySelector('#save').onclick = async () => {
      const err = el.querySelector('#err');
      err.textContent = '';
      [...linkRows.children].forEach((r) => { if (!rowVal(r, 'title').trim() && !rowVal(r, 'url').trim()) r.remove(); }); // drop empty buttons
      [...socRows.children].forEach((r) => { if (!rowVal(r, 'url').trim()) r.remove(); });
      const body = {
        ...collect(el.querySelector('#lpTop')), ...collect(el.querySelector('#lpProfile')),
        socials: [...socRows.children].map((r) => ({ type: rowVal(r, 'type'), url: rowVal(r, 'url') })),
        links: [...linkRows.children].map((r) => ({ id: r.dataset.id, title: rowVal(r, 'title'), url: rowVal(r, 'url'), image: r.querySelector('[data-k=image]').value, visible: rowVal(r, 'visible'), highlight: rowVal(r, 'highlight') })),
      };
      try {
        const saved = await put('/api/admin/linkpage', body);
        [...linkRows.children].forEach((r, i) => { if (saved.links[i]) r.dataset.id = saved.links[i].id; });
        el.querySelector('#lpFrame').src = pageUrl(saved.slug);
        ADM.setTitle(T('Link page'), `<a class="btn ghost" href="${esc(pageUrl(saved.slug))}" target="_blank">${ic('external', 'sm')} ${esc(T('Open the page'))}</a>`);
        toast(T('Saved'));
      } catch (e) { err.textContent = e.message; }
    };
  };
})();
