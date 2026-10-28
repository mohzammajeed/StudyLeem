/* StudyLeem PDF viewer — embeddable, works with Mega, Google Drive, Dropbox and direct PDF links.
   API: StudyPDF.mount(el, url) · StudyPDF.openModal(title, url) · StudyPDF.download(url, title)
        StudyPDF.withTimer(button, seconds, fn) · StudyPDF.isMega(url) · StudyPDF.downloadUrl(url)          */
(function () {
  'use strict';
  const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  const WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const icon = n => (window.ic ? window.ic(n) : '');

  /* ── styles ── */
  const css = document.createElement('style');
  css.textContent = `
  .sp-host{position:absolute;inset:0;background:#1e1e2e;display:flex;flex-direction:column;min-height:300px}
  .sp-stage{position:relative;flex:1;min-height:0;display:flex;flex-direction:column}
  .sp-bar{display:flex;align-items:center;gap:.5rem;padding:.4rem .75rem;background:#111827;color:#e5e7eb;font:500 .82rem Inter,system-ui,sans-serif;flex-wrap:wrap}
  .sp-bar button{background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.18);border-radius:8px;padding:.25rem .6rem;cursor:pointer;font:600 .85rem Inter,sans-serif}
  .sp-bar button:hover{background:rgba(255,255,255,.2)}.sp-bar .sp-sp{flex:1}
  .sp-scroll{flex:1;overflow:auto;padding:12px;-webkit-overflow-scrolling:touch}
  .sp-page{margin:0 auto 12px;background:#fff;box-shadow:0 4px 16px rgba(0,0,0,.4);position:relative}
  .sp-page canvas{display:block;max-width:none}
  .sp-iframe{flex:1;width:100%;border:0;background:#fff}
  .sp-ovl{position:absolute;top:0;right:0;width:70px;height:62px;z-index:3}
  .sp-msg{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.7rem;color:#cbd5e1;text-align:center;padding:1.5rem;font:500 .95rem Inter,sans-serif;z-index:4;background:#1e1e2e}
  .sp-msg h3{margin:0;color:#fff;font:600 1.15rem Poppins,Inter,sans-serif}
  .sp-msg button{background:#2563eb;color:#fff;border:0;border-radius:10px;padding:.6rem 1.2rem;font:600 .9rem Inter,sans-serif;cursor:pointer}
  .sp-spin{width:42px;height:42px;border:4px solid rgba(255,255,255,.2);border-top-color:#60a5fa;border-radius:50%;animation:sp-r 1s linear infinite}
  @keyframes sp-r{to{transform:rotate(360deg)}}
  .sp-modal{position:fixed;inset:0;z-index:9999;background:#0f172a;display:flex;flex-direction:column}
  .sp-mhead{display:flex;align-items:center;gap:.75rem;padding:.7rem 1rem;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff}
  .sp-mhead b{flex:1;font:600 1rem Poppins,Inter,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .sp-mbtn{display:inline-flex;align-items:center;gap:.4rem;background:rgba(255,255,255,.16);color:#fff;border:1px solid rgba(255,255,255,.3);border-radius:10px;padding:.45rem .9rem;font:600 .85rem Inter,sans-serif;cursor:pointer}
  .sp-mbtn:hover:not(:disabled){background:rgba(255,255,255,.28)}.sp-mbtn:disabled{opacity:.85;cursor:wait}
  .sp-mbody{position:relative;flex:1;min-height:0}`;
  document.head.appendChild(css);

  const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };

  /* ── url helpers ── */
  function megaInfo(url) {
    if (!url || !/mega\.(nz|co\.nz)/i.test(url)) return null;
    const m = url.match(/\/(?:file|embed)\/([\w-]+)#([\w-]+)/i) || url.match(/#!([\w-]+)!([\w-]+)/);
    return m ? { id: m[1], key: m[2] } : null;
  }
  const isMega = u => /mega\.(nz|co\.nz)/i.test(u || '');
  function driveId(url) {
    if (!/drive\.google\.com|docs\.google\.com/i.test(url)) return null;
    const m = url.match(/\/file\/d\/([\w-]+)/) || url.match(/[?&]id=([\w-]+)/) || url.match(/\/d\/([\w-]+)/);
    return m ? m[1] : null;
  }
  function directUrl(url) {
    try {
      const u = new URL(url);
      if (/(^|\.)dropbox\.com$/.test(u.hostname)) { u.hostname = 'dl.dropboxusercontent.com'; u.searchParams.delete('dl'); u.searchParams.set('raw', '1'); return u.toString(); }
      if (u.hostname === 'github.com') return url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
    } catch (_) {}
    return url;
  }
  function downloadUrl(url) {
    const id = driveId(url);
    if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
    if (/dropbox\.com/i.test(url)) { try { const u = new URL(url); u.searchParams.set('dl', '1'); return u.toString(); } catch (_) {} }
    return url;
  }

  /* ── Mega: fetch encrypted file and decrypt in the browser (Mega's own preview is disabled) ── */
  const megaCache = {};
  const b64u = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), c => c.charCodeAt(0)); };
  function megaBytes(url) {
    if (megaCache[url]) return megaCache[url];
    return (megaCache[url] = (async () => {
      const info = megaInfo(url);
      if (!info) throw new Error('Unsupported Mega link (use a file link, not a folder)');
      const r = await fetch('https://g.api.mega.co.nz/cs?id=' + Math.floor(Math.random() * 1e9), {
        method: 'POST', body: JSON.stringify([{ a: 'g', g: 1, ssl: 1, p: info.id }])
      });
      const j = await r.json();
      const o = Array.isArray(j) ? j[0] : j;
      if (typeof o === 'number') throw new Error(o === -9 || o === -8 ? 'File not found on Mega' : o === -16 ? 'File was removed from Mega' : o === -17 ? 'Mega download limit reached, try again later' : 'Mega error ' + o);
      if (!o || !o.g) throw new Error('Mega did not return a download link');
      const enc = await (await fetch(o.g)).arrayBuffer();
      const k = b64u(info.key);
      if (k.length < 32) throw new Error('Invalid Mega key in link');
      const aes = new Uint8Array(16); for (let i = 0; i < 16; i++) aes[i] = k[i] ^ k[i + 16];
      const iv = new Uint8Array(16); iv.set(k.slice(16, 24));
      const ck = await crypto.subtle.importKey('raw', aes, 'AES-CTR', false, ['decrypt']);
      return await crypto.subtle.decrypt({ name: 'AES-CTR', counter: iv, length: 64 }, ck, enc);
    })().catch(e => { delete megaCache[url]; throw e; }));
  }
  async function fetchPdfBytes(url) {
    const r = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const buf = await r.arrayBuffer();
    if (String.fromCharCode(...new Uint8Array(buf.slice(0, 5))).indexOf('%PDF') < 0) throw new Error('Not a PDF');
    return buf;
  }

  /* ── pdf.js loader & renderer ── */
  let pdfjsP;
  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve();
    return pdfjsP || (pdfjsP = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = PDFJS;
      s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER; res(); };
      s.onerror = () => { pdfjsP = null; rej(new Error('Could not load the PDF engine')); };
      document.head.appendChild(s);
    }));
  }
  async function renderPdf(stage, buf) {
    await loadPdfJs();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise;
    const bar = el('div', 'sp-bar'), scroll = el('div', 'sp-scroll');
    const info = el('span', '', `Page 1 / ${pdf.numPages}`);
    const mk = (t, f) => { const b = el('button', '', t); b.type = 'button'; b.onclick = f; return b; };
    let zoom = 1;
    bar.append(info, el('span', 'sp-sp'), mk('−', () => setZoom(zoom - .15)), mk('Fit', () => setZoom(1)), mk('+', () => setZoom(zoom + .15)));
    stage.append(bar, scroll);
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const first = await pdf.getPage(1), fv = first.getViewport({ scale: 1 }), ratio = fv.height / fv.width;
    const holders = [], done = new Set();
    for (let i = 1; i <= pdf.numPages; i++) { const h = el('div', 'sp-page'); h.dataset.n = i; scroll.appendChild(h); holders.push(h); }
    const width = () => Math.max(260, scroll.clientWidth - 24) * zoom;
    function size() { holders.forEach(h => { h.style.width = width() + 'px'; h.style.height = (width() * ratio) + 'px'; }); }
    async function draw(n) {
      if (done.has(n)) return; done.add(n);
      const page = await pdf.getPage(n), base = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: (width() / base.width) * dpr });
      const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
      c.style.width = vp.width / dpr + 'px'; c.style.height = vp.height / dpr + 'px';
      c.oncontextmenu = e => e.preventDefault();
      await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
      const h = holders[n - 1]; h.style.height = c.style.height; h.replaceChildren(c);
    }
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) draw(+e.target.dataset.n); }), { root: scroll, rootMargin: '800px 0px' });
    function setZoom(z) { zoom = Math.min(3, Math.max(.5, z)); done.clear(); holders.forEach(h => h.replaceChildren()); size(); holders.forEach(h => { io.unobserve(h); io.observe(h); }); }
    size(); holders.forEach(h => io.observe(h));
    scroll.addEventListener('scroll', () => {
      const mid = scroll.scrollTop + scroll.clientHeight / 3; let cur = 1;
      for (const h of holders) { if (h.offsetTop <= mid) cur = +h.dataset.n; else break; }
      info.textContent = `Page ${cur} / ${pdf.numPages}`;
    }, { passive: true });
  }

  /* ── mount ── */
  function plan(url) {
    if (isMega(url)) {
      const m = megaInfo(url);
      const p = [{ t: 'mega' }];
      if (m) p.push({ t: 'iframe', url: `https://mega.nz/embed/${m.id}#${m.key}`, wait: 25000 });
      return p;
    }
    const id = driveId(url);
    if (id) return [
      { t: 'iframe', url: `https://drive.google.com/file/d/${id}/preview`, drive: true, wait: 12000 },
      { t: 'fetch', url: `https://drive.google.com/uc?export=download&id=${id}` },
      { t: 'iframe', url: `https://docs.google.com/viewer?url=${encodeURIComponent('https://drive.google.com/uc?export=download&id=' + id)}&embedded=true`, wait: 15000 }
    ];
    const d = directUrl(url);
    return [
      { t: 'fetch', url: d },
      { t: 'iframe', url: `https://docs.google.com/viewer?url=${encodeURIComponent(d)}&embedded=true`, wait: 15000 },
      { t: 'iframe', url: d, wait: 15000 }
    ];
  }

  function mount(host, url) {
    host.innerHTML = ''; host.classList.add('sp-host');
    const stage = el('div', 'sp-stage'); host.appendChild(stage);
    const loading = el('div', 'sp-msg', '<div class="sp-spin"></div><div id="spTxt">Loading PDF…</div>');
    const txt = loading.querySelector('#spTxt');
    let alive = true;
    const fail = (why) => {
      stage.innerHTML = '';
      const m = el('div', 'sp-msg', `<h3>This PDF could not be displayed</h3><div>${why ? String(why).replace(/</g, '&lt;') + '. ' : ''}Please use the Download button.</div>`);
      const b = el('button', '', 'Try again'); b.type = 'button'; b.onclick = () => mount(host, url);
      m.appendChild(b); stage.appendChild(m);
    };
    if (!url) { fail('No PDF link'); return; }
    stage.appendChild(loading);

    (async () => {
      let lastErr = '';
      for (const s of plan(url)) {
        if (!alive) return;
        try {
          if (s.t === 'mega' || s.t === 'fetch') {
            txt.textContent = s.t === 'mega' ? 'Fetching from Mega…' : 'Loading PDF…';
            const buf = s.t === 'mega' ? await megaBytes(url) : await fetchPdfBytes(s.url);
            stage.innerHTML = ''; await renderPdf(stage, buf); return;
          }
          txt.textContent = 'Loading PDF…';
          await new Promise((res, rej) => {
            const f = el('iframe', 'sp-iframe'); f.title = 'PDF Viewer'; f.allowFullscreen = true;
            f.style.visibility = 'hidden';
            const t = setTimeout(() => { f.remove(); rej(new Error('timeout')); }, s.wait || 15000);
            f.onload = () => { clearTimeout(t); f.style.visibility = 'visible'; loading.remove(); if (s.drive) stage.appendChild(el('div', 'sp-ovl')); res(); };
            f.onerror = () => { clearTimeout(t); f.remove(); rej(new Error('blocked')); };
            stage.insertBefore(f, loading); f.src = s.url;
          });
          return;
        } catch (e) { lastErr = e.message; console.warn('PDF strategy failed:', s.t, e); stage.querySelectorAll('iframe,.sp-ovl,.sp-bar,.sp-scroll').forEach(n => n.remove()); }
      }
      fail(lastErr);
    })();
    return { destroy() { alive = false; } };
  }

  /* ── download (blob for Mega, direct link for others) ── */
  async function download(url, title) {
    if (isMega(url) && megaInfo(url)) {
      const buf = await megaBytes(url);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([buf], { type: 'application/pdf' }));
      a.download = (String(title || 'StudyLeem-notes').replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'StudyLeem-notes') + '.pdf';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      return;
    }
    const a = document.createElement('a');
    a.href = downloadUrl(url); a.target = '_blank'; a.rel = 'noopener'; a.download = '';
    document.body.appendChild(a); a.click(); a.remove();
  }

  /* button with countdown, then runs fn */
  function withTimer(btn, seconds, fn) {
    if (btn._busy) return; btn._busy = true;
    const html = btn.innerHTML; btn.disabled = true; let left = seconds;
    const tick = () => {
      if (left > 0) { btn.textContent = `Download in ${left}s`; left--; setTimeout(tick, 1000); }
      else { btn.textContent = 'Starting…'; Promise.resolve().then(fn).catch(e => alert(e.message || 'Download failed')).finally(() => { btn.innerHTML = html; btn.disabled = false; btn._busy = false; }); }
    };
    tick();
  }

  /* in-page modal viewer */
  function openModal(title, url) {
    if (!url) { alert('PDF link not available for this material.'); return; }
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const m = el('div', 'sp-modal'); m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
    const head = el('div', 'sp-mhead'), t = el('b'); t.textContent = title || 'PDF';
    const dl = el('button', 'sp-mbtn', icon('download') + ' Download'); dl.type = 'button';
    dl.onclick = () => withTimer(dl, 15, () => download(url, title));
    const x = el('button', 'sp-mbtn', icon('x') + ' Close'); x.type = 'button';
    head.append(t, dl, x);
    const body = el('div', 'sp-mbody'); m.append(head, body); document.body.appendChild(m);
    const h = mount(body, url);
    const close = () => { h && h.destroy(); m.remove(); document.body.style.overflow = prev; document.removeEventListener('keydown', esc); };
    const esc = e => { if (e.key === 'Escape') close(); };
    x.onclick = close; document.addEventListener('keydown', esc);
  }

  window.StudyPDF = { mount, openModal, download, withTimer, isMega, downloadUrl };
})();
