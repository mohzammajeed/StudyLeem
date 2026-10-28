/* ── fbise-chapters.js: /fbise/notes/:class/:subject or /fbise/books/:class/:subject ── */

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

  function parsePath() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    // ['fbise', 'notes', '12', 'physics']  or  ['fbise', 'books', '12', 'chemistry']
    const type        = parts[1] || 'notes';
    const cls         = parts[2] || '12';
    const subjectSlug = parts[3] || '';
    return { type, cls, subjectSlug };
  }

  const classLabels = {
    '9':  'Class 9', '10': 'Class 10', '11': 'Class 11', '12': 'Class 12'
  };

  let allItems = [];
  let activeFilter = 'all';

  function setMeta(type, cls, subjectSlug, subjectName) {
    const typeLabel = type === 'books' ? 'Books' : 'Notes';
    const clsLabel  = classLabels[cls] || `Class ${cls}`;
    const subLabel  = subjectName || subjectSlug.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
    const title = `FBISE ${subLabel} ${typeLabel} ${clsLabel} – Chapter Wise PDF | StudyLeem`;
    const desc  = `Free FBISE ${subLabel} ${typeLabel.toLowerCase()} for ${clsLabel} Federal Board Pakistan. Download chapter-wise PDF notes.`;

    document.getElementById('pageTitle').textContent    = title;
    document.getElementById('pageDesc').content         = desc;
    document.getElementById('pageKeywords').content     = `FBISE ${subLabel} notes class ${cls}, ${subLabel} chapter wise notes FBISE, Federal Board ${cls} ${subLabel} PDF, free ${subLabel} notes Pakistan`;
    document.getElementById('pageCanonical').href       = `https://studyleem.vercel.app/fbise/${type}/${cls}/${subjectSlug}`;
    document.getElementById('pageH1').textContent       = `${subLabel} – ${typeLabel} (${clsLabel})`;
    document.getElementById('pageSubtitle').textContent = type === 'books'
      ? `FBISE Federal Board complete textbook in PDF`
      : `FBISE Federal Board chapter-wise notes in PDF`;
    document.getElementById('breadSubject').textContent = subLabel;

    const classLink = document.getElementById('breadClassLink');
    classLink.textContent = clsLabel;
    classLink.href        = `/fbise/${type}/${cls}`;
  }

  function renderItems(items) {
    const grid = document.getElementById('chaptersGrid');
    if (!items.length) {
      grid.innerHTML = '<p class="loading">No materials found for this filter.</p>';
      return;
    }

    const { type, cls, subjectSlug } = parsePath();

    const hasExercise = items.some(m => m.contentType === 'exercise');
    const hasChapter  = items.some(m => !m.contentType || m.contentType === 'chapter');

    const tabs = document.getElementById('filterTabs');
    if (hasExercise && hasChapter) {
      tabs.style.display = 'flex';
    }

    let display = items;
    if (activeFilter === 'chapter')  display = items.filter(m => !m.contentType || m.contentType === 'chapter');
    if (activeFilter === 'exercise') display = items.filter(m => m.contentType === 'exercise');

    // Sort: by chapterNumber then exerciseNumber
    display.sort((a, b) => {
      const nA = Number(a.chapterNumber) || 0;
      const nB = Number(b.chapterNumber) || 0;
      if (nA !== nB) return nA - nB;
      return (Number(a.exerciseNumber) || 0) - (Number(b.exerciseNumber) || 0);
    });

    // ── BOOKS: show as single clickable card (whole PDF), not chapter list ──
    if (type === 'books') {
      grid.innerHTML = display.map(m => {
        const href = `/fbise/books/${cls}/${subjectSlug}/book-${m.id}`;
        return `
          <a href="${href}" class="chapter-item book-item" aria-label="${escHtml(m.title)}">
            <div class="chapter-num">${ic('book-open')} Full Textbook</div>
            <div class="chapter-info">
              <h3 class="chapter-title">${escHtml(m.title)}</h3>
              ${m.description ? `<p class="chapter-desc">${escHtml(m.description.substring(0,120))}${m.description.length>120?'…':''}</p>` : ''}
            </div>
            <div class="chapter-arrow">${ic('arrow-right')}</div>
          </a>
        `;
      }).join('');
      return;
    }

    // ── NOTES: chapter-by-chapter list ──
    grid.innerHTML = display.map(m => {
      const slug  = m.chapterSlug || (m.contentType === 'exercise'
        ? `exercise-${m.chapterNumber}${m.exerciseNumber ? '-' + m.exerciseNumber : ''}`
        : `chapter-${m.chapterNumber}`);
      const href  = `/fbise/${type}/${cls}/${subjectSlug}/${slug}`;
      const isEx  = m.contentType === 'exercise';
      const label = isEx
        ? `Exercise ${m.chapterNumber}.${m.exerciseNumber || ''}`
        : `Chapter ${m.chapterNumber}`;
      const icon  = isEx ? ic('calculator') : ic('book');

      return `
        <a href="${href}" class="chapter-item" aria-label="${escHtml(label)}: ${escHtml(m.title)}">
          <div class="chapter-num">${icon} ${escHtml(label)}</div>
          <div class="chapter-info">
            <h3 class="chapter-title">${escHtml(m.title)}</h3>
            ${m.description ? `<p class="chapter-desc">${escHtml(m.description.substring(0,100))}${m.description.length>100?'…':''}</p>` : ''}
          </div>
          <div class="chapter-arrow">${ic('arrow-right')}</div>
        </a>
      `;
    }).join('');
  }

  function setupFilter(items) {
    document.querySelectorAll('#filterTabs .tab-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('#filterTabs .tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.dataset.filter;
        renderItems(items);
      };
    });
  }

  async function loadChapters(type, cls, subjectSlug) {
    const grid = document.getElementById('chaptersGrid');
    try {
      grid.innerHTML = '<div class="loading">Loading...</div>';
      // For books, fetch without type filter first (books may be stored as type='books')
      allItems = await DB.getBySubjectSlug(cls, subjectSlug, type);

      if (!allItems.length) {
        grid.innerHTML = `<p class="loading">No ${type === 'books' ? 'books' : 'chapters'} uploaded yet for this subject. Check back soon!</p>`;
        return;
      }

      // Get real subject name from first item
      const subjectName = allItems[0].subject || subjectSlug;
      setMeta(type, cls, subjectSlug, subjectName);

      if (type === 'notes') {
        const hasExercise = allItems.some(m => m.contentType === 'exercise');
        const hasChapter  = allItems.some(m => !m.contentType || m.contentType === 'chapter');
        if (hasExercise && hasChapter) {
          document.getElementById('filterTabs').style.display = 'flex';
          setupFilter(allItems);
        }
      }

      renderItems(allItems);
    } catch (err) {
      console.error(err);
      grid.innerHTML = '<p class="loading">Error loading. Please refresh.</p>';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    mobileMenu();
    const { type, cls, subjectSlug } = parsePath();

    // Set initial placeholder meta
    setMeta(type, cls, subjectSlug, subjectSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));

    loadChapters(type, cls, subjectSlug);
  });
})();
