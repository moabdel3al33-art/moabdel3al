/* Book reader: draws each PDF page on a canvas (view only). There is no download or print button,
 * right-click, text selection, Ctrl+S and Ctrl+P are blocked, and every page carries a faint watermark
 * with the reader's name and phone. */
(function () {
  'use strict';
  const D = JSON.parse(document.getElementById('rdData').textContent);
  const pagesEl = document.getElementById('rdPages');
  const pageLabel = document.getElementById('rdPage');
  const bar = document.getElementById('rdBar');
  const zoomLabel = document.getElementById('rdZoom');
  const lib = window.pdfjsLib;
  if (!lib) { fail(); return; }
  lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  let pdf = null;
  let zoom = 1; // 1 = fit the width of the screen (max 900px)
  const slots = [];
  const rendered = new Map(); // page number -> zoom it was drawn at

  function fail() { pagesEl.innerHTML = `<div class="rd-loading err"><p>${D.t.error}</p></div>`; pageLabel.textContent = ''; }

  // Download the bytes with a progress bar, then open them with PDF.js.
  async function load() {
    const res = await fetch(D.pdf, { headers: { 'X-Requested-With': 'reader' }, credentials: 'same-origin' });
    if (!res.ok || !res.body) throw new Error(String(res.status));
    const total = Number(res.headers.get('content-length')) || 0;
    const reader = res.body.getReader();
    const chunks = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value); got += value.length;
      if (total) bar.style.width = `${Math.min(100, (got / total) * 100)}%`;
    }
    bar.style.width = '100%';
    setTimeout(() => { bar.parentNode.classList.add('done'); }, 400);
    const data = new Uint8Array(got);
    let o = 0;
    for (const c of chunks) { data.set(c, o); o += c.length; }
    return lib.getDocument({ data, isEvalSupported: false }).promise;
  }

  const baseWidth = () => Math.min(900, pagesEl.clientWidth - 24);

  async function layout() {
    pagesEl.innerHTML = '';
    slots.length = 0;
    rendered.clear();
    const first = await pdf.getPage(1);
    const vp1 = first.getViewport({ scale: 1 });
    for (let n = 1; n <= pdf.numPages; n++) {
      const slot = document.createElement('div');
      slot.className = 'rd-page';
      slot.dataset.n = n;
      const w = baseWidth() * zoom;
      slot.style.width = `${w}px`;
      slot.style.height = `${(w * vp1.height) / vp1.width}px`;
      slot.innerHTML = `<span class="rd-num">${n}</span>`;
      pagesEl.appendChild(slot);
      slots.push(slot);
      io.observe(slot);
    }
    updateLabel();
  }

  async function draw(slot) {
    const n = Number(slot.dataset.n);
    if (rendered.get(n) === zoom) return;
    rendered.set(n, zoom);
    const page = await pdf.getPage(n);
    const cssW = baseWidth() * zoom;
    const vp = page.getViewport({ scale: 1 });
    const scale = cssW / vp.width;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const view = page.getViewport({ scale: scale * dpr });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(view.width);
    canvas.height = Math.floor(view.height);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${(cssW * vp.height) / vp.width}px`;
    slot.style.height = canvas.style.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: view }).promise;
    if (rendered.get(n) !== zoom) return; // zoom changed while drawing
    slot.querySelectorAll('canvas, .rd-mark').forEach((x) => x.remove());
    slot.prepend(canvas);
    if (D.mark) {
      const m = document.createElement('div');
      m.className = 'rd-mark';
      m.innerHTML = `<span>${D.mark.replace(/[&<>"]/g, '')}</span>`.repeat(3);
      slot.appendChild(m);
    }
  }

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) draw(e.target).catch(() => {});
  }, { root: pagesEl, rootMargin: '800px 0px' });

  function updateLabel() {
    if (!pdf) return;
    const mid = pagesEl.scrollTop + pagesEl.clientHeight / 3;
    let cur = 1;
    for (const s of slots) { if (s.offsetTop <= mid) cur = Number(s.dataset.n); else break; }
    pageLabel.textContent = `${D.t.page} ${cur} ${D.t.of} ${pdf.numPages}`;
  }
  pagesEl.addEventListener('scroll', () => requestAnimationFrame(updateLabel), { passive: true });

  async function setZoom(z) {
    const ratio = pagesEl.scrollTop / Math.max(1, pagesEl.scrollHeight);
    zoom = Math.min(3, Math.max(0.5, Math.round(z * 100) / 100));
    zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
    await layout();
    pagesEl.scrollTop = ratio * pagesEl.scrollHeight;
  }
  document.getElementById('rdIn').onclick = () => setZoom(zoom + 0.25);
  document.getElementById('rdOut').onclick = () => setZoom(zoom - 0.25);
  document.getElementById('rdFull').onclick = () => {
    if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {});
  };
  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => pdf && setZoom(zoom), 300); });

  // view only: no saving, printing, selecting or dragging
  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && ['s', 'p', 'c', 'a'].includes(k)) e.preventDefault();
    if ((e.ctrlKey || e.metaKey) && (k === '+' || k === '=')) { e.preventDefault(); setZoom(zoom + 0.25); }
    if ((e.ctrlKey || e.metaKey) && k === '-') { e.preventDefault(); setZoom(zoom - 0.25); }
  });
  document.addEventListener('dragstart', (e) => e.preventDefault());

  load().then((doc) => { pdf = doc; return layout(); }).catch(fail);
})();
