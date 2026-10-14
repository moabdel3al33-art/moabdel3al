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
  const SORT = { k: 'sort', l: 'Order (smaller number shows first)', type: 'number' };
  const DEFS = {
    courses: {
      res: 'courses', one: 'Course', add: 'Add course', site: (r) => `/courses/${encodeURIComponent(r.slug)}`,
      cols: [['', (r) => thumb(r.cover)], ['Title', (r) => `<b>${esc(r.title)}</b>`], ['Price', (r) => esc(money(r.price))],
        ['Lessons', (r) => r.lessons_count], ['Students', (r) => r.students], ['Status', (r) => yes(r.published)]],
      fields: [
        { k: 'title', l: 'Title', req: 1, full: 1 }, { k: 'subtitle', l: 'Short description (one line)', full: 1 },
        { k: 'price', l: 'Price', type: 'number', hint: 'Put 0 to make it free' }, { k: 'old_price', l: 'Old price (optional, shown crossed out)', type: 'number' },
        { k: 'cover', l: 'Cover image', type: 'image', aspects: ['16/10', '1/1'] },
        { k: 'description', l: 'Full description', type: 'md' },
        SORT, PUBLISH,
      ],
    },
    books: {
      res: 'books', one: 'Book', add: 'Add book', site: (r) => `/books/${encodeURIComponent(r.slug)}`,
      cols: [['', (r) => thumb(r.cover, 1)], ['Title', (r) => `<b>${esc(r.title)}</b>`], ['Price', (r) => esc(money(r.price))],
        ['File', (r) => (r.file_path ? `<span class="pill ok">PDF</span>` : r.external_url ? `<span class="pill">${esc(T('Link'))}</span>` : `<span class="pill bad">${esc(T('Missing'))}</span>`)],
        ['Buyers', (r) => r.owners], ['Status', (r) => yes(r.published)]],
      fields: [
        { k: 'title', l: 'Title', req: 1, full: 1 }, { k: 'subtitle', l: 'Short description (one line)', full: 1 },
        { k: 'price', l: 'Price', type: 'number', hint: 'Put 0 to make it free' }, { k: 'old_price', l: 'Old price (optional, shown crossed out)', type: 'number' },
        { k: 'pages', l: 'Number of pages', type: 'number' },
        { k: 'cover', l: 'Cover image', type: 'image', aspects: ['3/4'] },
        { k: 'file', l: 'Book file (PDF) - only buyers can download it', type: 'privatefile' },
        { k: 'external_url', l: 'Or a link to read it online (optional)', type: 'url', full: 1 },
        { k: 'description', l: 'Full description', type: 'md' },
        SORT, PUBLISH,
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
      cols: [['Title', (r) => `<b>${esc(r.title)}</b>`], ['Duration', (r) => esc(T('{n} minutes', { n: r.duration_min }))], ['Price', (r) => esc(money(r.price))], ['Status', (r) => yes(r.published)]],
      fields: [
        { k: 'title', l: 'Title', req: 1, full: 1 },
        { k: 'duration_min', l: 'Duration (minutes)', type: 'number' }, { k: 'price', l: 'Price', type: 'number' },
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
  ADM.views.consults = contentView('consults');
  ADM.views.plans = contentView('plans');

  // ---------------------------------------------------------------------------
  // Social media posts
  // ---------------------------------------------------------------------------
  const PLATFORMS = [['facebook', 'Facebook'], ['tiktok', 'TikTok'], ['youtube', 'YouTube'], ['instagram', 'Instagram']];
  ADM.views.social = async (el) => {
    const [rows, st] = await Promise.all([api('/api/admin/r/social_posts'), api('/api/admin/settings')]);
    const s = st.values;
    ADM.setTitle(T('Social media'), `<button class="btn" id="addPost">${ic('add', 'sm')} ${esc(T('Add a post'))}</button>`);
    el.innerHTML = `<div class="panel"><div class="panel-body">
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
    ['Payment instructions (shown before ordering)', both('payment_note', 'Text', 'textarea')],
    ['Social media accounts', [
      { k: 'social_facebook', l: 'Facebook page link', type: 'url' }, { k: 'social_tiktok', l: 'TikTok account link', type: 'url' },
      { k: 'social_youtube', l: 'YouTube channel link', type: 'url', hint: 'Used to show the latest videos automatically' }, { k: 'social_instagram', l: 'Instagram account link', type: 'url' }]],
  ];
  ADM.views.site = async (el) => {
    const { values } = await api('/api/admin/settings');
    const canSettings = ADM.can('settings');
    el.innerHTML = `<p class="muted" style="margin-top:0">${esc(T('Change the texts and pictures that appear on the website. Images can be uploaded or chosen from the library.'))}</p>
      ${SITE_GROUPS.map(([g, fields]) => `<div class="panel"><div class="panel-head"><h3>${esc(T(g))}</h3></div><div class="panel-body"><div class="fgrid">${fields.map((f) => fieldHtml(f, values[f.k])).join('')}</div></div></div>`).join('')}
      ${canSettings ? `<div class="panel"><div class="panel-head"><h3>${esc(T('Currency'))}</h3></div><div class="panel-body"><div class="fgrid">${fieldHtml({ k: 'currency', l: 'Currency', type: 'select', options: [['EGP', 'Egyptian pound (EGP)'], ['USD', 'US dollar (USD)'], ['SAR', 'Saudi riyal (SAR)'], ['AED', 'UAE dirham (AED)']] }, values.currency)}</div></div></div>` : ''}
      <div class="form-actions"><button class="btn" id="save">${esc(T('Save changes'))}</button><a class="btn ghost" href="/" target="_blank">${ic('external', 'sm')} ${esc(T('View website'))}</a><span class="err" id="err"></span></div>`;
    bindFields(el);
    el.querySelector('#save').onclick = async () => {
      try {
        const r = await put('/api/admin/settings', { values: collect(el) });
        ADM.currency = r.values.currency;
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
})();
