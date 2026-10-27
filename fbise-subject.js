/* ── fbise-subject.js: /fbise/notes/:class or /fbise/books/:class ── */

(function () {
  'use strict';

  function escHtml(t) {
    if (!t) return '';
    const d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML;
  }

  function mobileMenu() {
    const btn = document.getElementById('mobileMenuBtn');
    const menu = document.getElementById('mobileMenu');
    if (btn && menu) {
      btn.onclick = e => { e.stopPropagation(); menu.classList.toggle('active'); };
      document.onclick = e => { if (!menu.contains(e.target) && !btn.contains(e.target)) menu.classList.remove('active'); };
      menu.querySelectorAll('a').forEach(a => a.onclick = () => menu.classList.remove('active'));
    }
  }

  // Parse clean URL path: /fbise/notes/12 or /fbise/books/9
  function parsePath() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    // parts = ['fbise','notes','12']
    const type  = parts[1] || 'notes'; // 'notes' or 'books'
    const cls   = parts[2] || '12';
    return { type, cls };
  }

  const classLabels = {
    '9':  'Class 9 – SSC Part 1',
    '10': 'Class 10 – SSC Part 2',
    '11': 'Class 11 – HSSC Part 1',
    '12': 'Class 12 – HSSC Part 2'
  };

  function setMeta(type, cls) {
    const typeLabel = type === 'books' ? 'Books' : 'Notes';
    const clsLabel  = classLabels[cls] || `Class ${cls}`;
    const title = `FBISE ${typeLabel} ${clsLabel} – Free PDF | StudyLeem`;
    const desc  = `Free FBISE ${typeLabel.toLowerCase()} for ${clsLabel} Federal Board Pakistan. Chapter-wise PDF study materials for all subjects.`;
    const keys  = `FBISE ${typeLabel.toLowerCase()} class ${cls}, FBISE class ${cls} ${typeLabel.toLowerCase()}, Federal Board ${cls} ${typeLabel.toLowerCase()} PDF, free FBISE class ${cls} study material Pakistan`;

    document.getElementById('pageTitle').textContent      = title;
    document.getElementById('pageDesc').content           = desc;
    document.getElementById('pageKeywords').content       = keys;
    document.getElementById('pageCanonical').href         = `https://studyleem.vercel.app/fbise/${type}/${cls}`;
    document.getElementById('pageH1').textContent         = `FBISE ${typeLabel} – ${clsLabel}`;
    document.getElementById('pageSubtitle').textContent   = `Select a subject to browse ${typeLabel === 'Books' ? 'textbooks' : 'chapter-wise notes'}`;
    document.getElementById('breadClass').textContent     = clsLabel;

    // Type switcher
    const sw = document.getElementById('typeSwitcher');
    sw.innerHTML = `
      <a href="/fbise/notes/${cls}" class="type-switch-btn ${type==='notes'?'active':''}">📝 Notes</a>
      <a href="/fbise/books/${cls}" class="type-switch-btn ${type==='books'?'active':''}">📚 Books</a>
    `;

    document.getElementById('subjectsHeading').textContent = `${typeLabel} – ${clsLabel}`;
  }

  async function loadSubjects(type, cls) {
    const grid = document.getElementById('subjectsGrid');
    try {
      grid.innerHTML = '<div class="loading">Loading subjects...</div>';
      const materials = await DB.getByClass(cls);
      const filtered  = type === 'all' ? materials : materials.filter(m => m.type === type);

      if (!filtered.length) {
        grid.innerHTML = `<p class="loading">No ${type} available for Class ${cls} yet. Check back soon!</p>`;
        return;
      }

      // Group by subject
      const subjMap = {};
      filtered.forEach(m => {
        const slug = m.subjectSlug || toSlug(m.subject);
        if (!subjMap[slug]) {
          subjMap[slug] = { name: m.subject, slug, count: 0 };
        }
        subjMap[slug].count++;
      });

      const subjects = Object.values(subjMap).sort((a, b) => a.name.localeCompare(b.name));

      grid.innerHTML = subjects.map(s => `
        <a href="/fbise/${type}/${cls}/${s.slug}" class="subject-card">
          <h3>${escHtml(s.name)}</h3>
          <p>Class ${cls} · FBISE</p>
          <p>${s.count} ${type === 'books' ? 'Book(s)' : 'Chapter(s)'}</p>
        </a>
      `).join('');

    } catch (err) {
      console.error(err);
      grid.innerHTML = '<p class="loading">Error loading subjects. Please refresh.</p>';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    mobileMenu();
    const { type, cls } = parsePath();
    setMeta(type, cls);
    loadSubjects(type, cls);
  });
})();
