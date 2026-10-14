/* Tiny, safe Markdown -> HTML (used by the server and by the admin editor preview).
 * Supports: # headings, **bold**, *italic*, [link](url), ![image](url), - lists, 1. lists, > quotes, ---,
 * and a YouTube/Vimeo link alone on a line becomes an embedded video. */
(function (root) {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = (u) => (/^(https?:\/\/|\/)[^\s"'<>]*$/i.test(u) ? u : '#');

  function embed(url) {
    let m = url.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/([\w]+))?/);
    if (m) return `https://player.vimeo.com/video/${m[1]}${m[2] ? `?h=${m[2]}` : ''}`;
    m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
    if (m) return `https://www.youtube-nocookie.com/embed/${m[1]}`;
    return null;
  }

  function inline(text) {
    // text is already escaped
    return text
      .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, alt, u) => `<img src="${safeUrl(u.replace(/&amp;/g, '&'))}" alt="${alt}" loading="lazy">`)
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, u) => {
        const url = safeUrl(u.replace(/&amp;/g, '&'));
        const ext = /^https?:/.test(url);
        return `<a href="${url}"${ext ? ' target="_blank" rel="noopener"' : ''}>${label}</a>`;
      })
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  }

  function md(src) {
    const lines = String(src || '').replace(/\r\n?/g, '\n').split('\n');
    const out = [];
    let para = [];
    let list = null; // { tag, items }
    const flushPara = () => { if (para.length) { out.push(`<p>${para.map((l) => inline(esc(l))).join('<br>')}</p>`); para = []; } };
    const flushList = () => { if (list) { out.push(`<${list.tag}>${list.items.map((i) => `<li>${inline(esc(i))}</li>`).join('')}</${list.tag}>`); list = null; } };
    for (const raw of lines) {
      const line = raw.trimEnd();
      const t = line.trim();
      let m;
      if (!t) { flushPara(); flushList(); continue; }
      if ((m = t.match(/^(#{1,3})\s+(.*)$/))) { flushPara(); flushList(); const n = m[1].length + 1; out.push(`<h${n}>${inline(esc(m[2]))}</h${n}>`); continue; }
      if (/^(-{3,}|\*{3,})$/.test(t)) { flushPara(); flushList(); out.push('<hr>'); continue; }
      if ((m = t.match(/^>\s?(.*)$/))) { flushPara(); flushList(); out.push(`<blockquote>${inline(esc(m[1]))}</blockquote>`); continue; }
      if ((m = t.match(/^[-*•]\s+(.*)$/))) { flushPara(); if (!list || list.tag !== 'ul') { flushList(); list = { tag: 'ul', items: [] }; } list.items.push(m[1]); continue; }
      if ((m = t.match(/^\d+[.)]\s+(.*)$/))) { flushPara(); if (!list || list.tag !== 'ol') { flushList(); list = { tag: 'ol', items: [] }; } list.items.push(m[1]); continue; }
      if (/^https?:\/\/\S+$/.test(t) && embed(t)) { flushPara(); flushList(); out.push(`<div class="video"><iframe src="${esc(embed(t))}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`); continue; }
      if ((m = t.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/))) { flushPara(); flushList(); out.push(`<figure><img src="${esc(safeUrl(m[2]))}" alt="${esc(m[1])}" loading="lazy">${m[1] ? `<figcaption>${esc(m[1])}</figcaption>` : ''}</figure>`); continue; }
      flushList();
      para.push(line);
    }
    flushPara(); flushList();
    return out.join('\n');
  }
  const plain = (src) => String(src || '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[#>*_`-]+/g, ' ').replace(/\s+/g, ' ').trim();

  if (typeof module !== 'undefined' && module.exports) module.exports = { md, plain };
  else { root.md = md; root.mdPlain = plain; }
})(typeof window !== 'undefined' ? window : globalThis);
