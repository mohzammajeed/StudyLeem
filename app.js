/* ── app.js: Homepage logic ── */
document.addEventListener('DOMContentLoaded', () => {
  setupMobileMenu();
  setupSearch();
  loadData();
});

function setupMobileMenu() {
  const btn  = document.getElementById('mobileMenuBtn');
  const menu = document.getElementById('mobileMenu');
  if (btn && menu) {
    btn.onclick = e => { e.stopPropagation(); menu.classList.toggle('active'); };
    document.onclick = e => {
      if (!menu.contains(e.target) && !btn.contains(e.target)) menu.classList.remove('active');
    };
    menu.querySelectorAll('a').forEach(a => a.onclick = () => menu.classList.remove('active'));
  }
}

function setupSearch() {
  const input   = document.getElementById('searchInput');
  const btn     = document.getElementById('searchBtn');
  const results = document.getElementById('searchResults');
  if (!input || !btn) return;

  let allMaterials = [];
  let searchTimer;

  // Lazy-load materials for search
  async function ensureLoaded() {
    if (!allMaterials.length && typeof DB !== 'undefined') {
      allMaterials = await DB.getAll().catch(() => []);
    }
  }

  async function doSearch() {
    const q = input.value.trim().toLowerCase();
    if (!q || q.length < 2) { results.style.display = 'none'; return; }
    await ensureLoaded();
    const hits = allMaterials.filter(m =>
      (m.title && m.title.toLowerCase().includes(q)) ||
      (m.subject && m.subject.toLowerCase().includes(q)) ||
      (m.chapterTitle && m.chapterTitle.toLowerCase().includes(q))
    ).slice(0, 8);

    if (!hits.length) {
      results.innerHTML = '<div class="search-no-results">No results found.</div>';
      results.style.display = 'block';
      return;
    }

    results.innerHTML = hits.map(m => {
      const slug = m.subjectSlug || toSlug(m.subject || '');
      const href = `/fbise/${m.type === 'books' ? 'books' : 'notes'}/${m.class}/${slug}`;
      const icon = m.type === 'books' ? '📚' : '📝';
      return `<a href="${href}" class="search-result-item">
        ${icon} <strong>${escHtml(m.title)}</strong>
        <span class="search-meta">Class ${m.class} · ${escHtml(m.subject)}</span>
      </a>`;
    }).join('');
    results.style.display = 'block';
  }

  input.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(doSearch, 250);
  });
  btn.addEventListener('click', doSearch);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
  document.addEventListener('click', e => {
    if (!input.contains(e.target) && !results.contains(e.target)) results.style.display = 'none';
  });
}

async function loadData() {
  if (typeof DB === 'undefined') {
    console.error('DB not ready');
    return;
  }
  try {
    const materials = await DB.getAll();
    loadLatestMaterials(materials);
    loadPopularSubjects(materials);
    updateStats(materials);
  } catch (err) {
    console.error('loadData error:', err);
  }
}

function loadLatestMaterials(materials) {
  const container = document.getElementById('latestMaterials');
  if (!container) return;
  const latest = materials.slice(0, 6);
  if (!latest.length) { container.innerHTML = '<p class="loading">No materials yet.</p>'; return; }

  container.innerHTML = latest.map(m => {
    const slug = m.subjectSlug || toSlug(m.subject || '');
    const href = `/fbise/${m.type === 'books' ? 'books' : 'notes'}/${m.class}/${slug}`;
    return `
    <a href="${href}" class="material-card">
      <div style="position:relative">
        <img src="${escHtml(m.coverImage)}" alt="${escHtml(m.title)}" class="material-cover"
          onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27208%27 height=%27300%27%3E%3Crect fill=%27%23f3f4f6%27 width=%27208%27 height=%27300%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 text-anchor=%27middle%27 dy=%27.3em%27 fill=%27%239ca3af%27 font-family=%27Arial%27 font-size=%2714%27%3ENo Image%3C/text%3E%3C/svg%3E'"
          loading="lazy">
        <span class="material-type-badge">${m.type === 'books' ? '📚 Book' : '📝 Notes'}</span>
      </div>
      <div class="material-content">
        <h3 class="material-title">${escHtml(m.title)}</h3>
        <div class="material-meta">
          <span>Class ${m.class}</span>
          <span>${escHtml(m.subject)}</span>
          ${m.chapterNumber ? `<span>Ch. ${m.chapterNumber}</span>` : ''}
        </div>
        <p class="material-description">${escHtml((m.description || '').substring(0, 80))}${(m.description||'').length > 80 ? '…' : ''}</p>
      </div>
    </a>`;
  }).join('');
}

function loadPopularSubjects(materials) {
  const container = document.getElementById('subjectsGrid');
  if (!container) return;
  const subjectMap = {};
  materials.forEach(m => {
    const slug = m.subjectSlug || toSlug(m.subject || '');
    const key  = `${m.class}-${slug}`;
    if (!subjectMap[key]) subjectMap[key] = { class: m.class, subject: m.subject, slug, count: 0 };
    subjectMap[key].count++;
  });
  const subjects = Object.values(subjectMap).sort((a, b) => b.count - a.count).slice(0, 8);
  if (!subjects.length) { container.innerHTML = '<p class="loading">No subjects yet.</p>'; return; }
  container.innerHTML = subjects.map(s => `
    <a href="/fbise/notes/${s.class}/${s.slug}" class="subject-card">
      <h3>${escHtml(s.subject)}</h3>
      <p>Class ${s.class} · FBISE</p>
      <p>${s.count} material${s.count !== 1 ? 's' : ''}</p>
    </a>
  `).join('');
}

function updateStats(materials) {
  const stats = {
    total: materials.length,
    books: materials.filter(m => m.type === 'books').length,
    notes: materials.filter(m => m.type === 'notes').length
  };
  [['totalMaterials', stats.total], ['totalBooks', stats.books], ['totalNotes', stats.notes]]
    .forEach(([id, val]) => { const el = document.getElementById(id); if (el) el.textContent = val; });
}

function toSlug(str) {
  return String(str).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function escHtml(t) {
  if (!t) return '';
  const d = document.createElement('div');
  d.textContent = t;
  return d.innerHTML;
}
