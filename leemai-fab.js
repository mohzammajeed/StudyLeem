/* ============================================================
   leemai-fab.js — "Ask LeemAI" floating button
   Injected on every StudyLeem page except /leemai itself.
   Built by UE Developers | Owned by Makaram MS
   ============================================================ */
(function () {
  'use strict';

  // Don't show on the LeemAI page itself
  var p = window.location.pathname.replace(/\/$/, '');
  if (p === '/leemai' || p === '/leemai.html') return;

  /* ── Inject CSS ── */
  var style = document.createElement('style');
  style.textContent = [
    '.sl-fab{',
    '  position:fixed;bottom:26px;right:26px;z-index:9990;',
    '  display:flex;align-items:center;gap:.45rem;',
    '  background:linear-gradient(135deg,#2563eb,#1e40af);',
    '  color:#fff;text-decoration:none;',
    '  padding:.7rem 1.2rem;border-radius:50px;',
    '  font-family:"Inter","Poppins",sans-serif;',
    '  font-size:.88rem;font-weight:600;',
    '  box-shadow:0 4px 18px rgba(37,99,235,.45);',
    '  border:none;cursor:pointer;',
    '  animation:sl-fab-pop .45s cubic-bezier(.34,1.56,.64,1) forwards;',
    '  transition:transform .2s,box-shadow .2s;',
    '}',
    '.sl-fab:hover{',
    '  transform:translateY(-3px) scale(1.04);',
    '  box-shadow:0 8px 28px rgba(37,99,235,.55);',
    '  color:#fff;',
    '}',
    '.sl-fab:active{transform:translateY(0) scale(.97);}',
    '.sl-fab-dot{',
    '  position:absolute;top:-4px;right:-4px;',
    '  width:13px;height:13px;border-radius:50%;',
    '  background:#f97316;border:2.5px solid #fff;',
    '  animation:sl-fab-pulse 2.2s infinite;',
    '}',
    '@keyframes sl-fab-pop{',
    '  from{opacity:0;transform:translateY(22px) scale(.75);}',
    '  to{opacity:1;transform:translateY(0) scale(1);}',
    '}',
    '@keyframes sl-fab-pulse{',
    '  0%,100%{transform:scale(1);opacity:1;}',
    '  50%{transform:scale(1.4);opacity:.65;}',
    '}',
    '@media(max-width:500px){',
    '  .sl-fab .sl-fab-label{display:none;}',
    '  .sl-fab{width:52px;height:52px;padding:0;justify-content:center;border-radius:50%;}',
    '}'
  ].join('');
  document.head.appendChild(style);

  /* ── Inject button ── */
  function inject() {
    var btn = document.createElement('a');
    btn.href = '/leemai';
    btn.className = 'sl-fab';
    btn.setAttribute('aria-label', 'Ask LeemAI – FBISE AI Study Assistant');
    btn.innerHTML = (
      '<div class="sl-fab-dot"></div>' +
      '<span style="font-size:1.05rem;line-height:1">🤖</span>' +
      '<span class="sl-fab-label">Ask LeemAI</span>'
    );
    document.body.appendChild(btn);
  }

  // Wait for body to be ready
  if (document.body) {
    inject();
  } else {
    document.addEventListener('DOMContentLoaded', inject);
  }
})();
