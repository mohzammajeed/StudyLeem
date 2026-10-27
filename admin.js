/* ═══════════════════════════════════════════════════
   StudyLeem Admin Panel JS — Full Rewrite
   Handles: login, upload (chapters + exercises), manage, stats, messages
═══════════════════════════════════════════════════ */

let currentEditId = null;
let allMaterials  = [];
let allMessages   = [];

// ── Boot ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  DB.setAdminMode(true);
  (await Auth.check()) ? showDashboard() : showLogin();
});

// ── Auth ──────────────────────────────────────────
function showLogin() {
  document.getElementById('loginPage').style.display    = 'flex';
  document.getElementById('dashboardPage').style.display = 'none';
  document.getElementById('loginForm').onsubmit = async e => {  
    e.preventDefault();
    const errorEl = document.getElementById('loginError');
    errorEl.textContent = '';
    try {
      await Auth.login(
        document.getElementById('email').value,
        document.getElementById('password').value
      );
      showDashboard();
    } catch (err) {
      errorEl.textContent = '❌ ' + err.message;
    }
  };
}

function showDashboard() {
  document.getElementById('loginPage').style.display    = 'none';
  document.getElementById('dashboardPage').style.display = 'flex';
  setupNavigation();
  setupForms();
  setupMobileSidebar();
  loadMaterials();
  loadStats();
}

// ── Navigation ────────────────────────────────────
function setupNavigation() {
  const titles = { upload:'Upload Material', manage:'Manage Materials', stats:'Statistics', messages:'Contact Messages' };
  document.querySelectorAll('.admin-nav-link[data-page]').forEach(link => {
    link.onclick = e => {
      e.preventDefault();
      const page = link.dataset.page;
      document.querySelectorAll('.admin-nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      document.querySelectorAll('.admin-page').forEach(p => p.classList.remove('active'));
      document.getElementById(`${page}Page`).classList.add('active');
      document.getElementById('pageTitle').textContent = titles[page] || page;
      document.getElementById('adminSidebar').classList.remove('active');
      if (page === 'manage')   loadMaterials();
      if (page === 'stats')    loadStats();
      if (page === 'messages') loadMessages();
    };
  });
  document.getElementById('logoutBtn').onclick = async e => {
    e.preventDefault();
    if (confirm('Logout?')) { await Auth.logout(); location.reload(); }
  };
}

// ── Mobile sidebar ────────────────────────────────
function setupMobileSidebar() {
  document.getElementById('sidebarToggle').onclick = () =>
    document.getElementById('adminSidebar').classList.add('active');
  document.getElementById('sidebarClose').onclick = () =>
    document.getElementById('adminSidebar').classList.remove('active');
}

// ── Forms ─────────────────────────────────────────
function setupForms() {

  // Material type radios (notes / books)
  document.querySelectorAll('input[name="materialType"]').forEach(r => {
    r.onchange = e => {
      const isNotes = e.target.value === 'notes';
      document.getElementById('contentTypeRow').style.display   = isNotes ? 'grid' : 'none';
      document.getElementById('chapterGroup').style.display     = isNotes ? 'block' : 'none';
      document.getElementById('chapterTitleGroup').style.display = isNotes ? 'block' : 'none';
      document.getElementById('chapterNumber').required          = isNotes;
      if (!isNotes) {
        document.getElementById('chapterNumber').value  = '';
        document.getElementById('chapterTitle').value   = '';
        document.getElementById('exerciseNumber').value = '';
        document.getElementById('exerciseRow').style.display = 'none';
      }
      updateExercisePreview();
    };
  });

  // Content type radios (chapter / exercise)
  document.querySelectorAll('input[name="contentType"]').forEach(r => {
    r.onchange = e => {
      const isEx = e.target.value === 'exercise';
      document.getElementById('exerciseRow').style.display       = isEx ? 'grid' : 'none';
      document.getElementById('chapterLabel').textContent        = isEx ? 'Chapter Number * (e.g. 2 for Ex 2.x)' : 'Chapter Number *';
      document.getElementById('chapterTitleLabel').textContent   = isEx ? 'Exercise Title *' : 'Chapter Title *';
      document.getElementById('chapterTitleGroup').style.display = 'block';
      updateExercisePreview();
    };
  });

  // Live exercise preview
  ['chapterNumber','exerciseNumber'].forEach(id => {
    document.getElementById(id).oninput = updateExercisePreview;
  });

  // PDF link preview
  document.getElementById('pdfLink').oninput = function () {
    const v = this.value.trim();
    const el = document.getElementById('pdfPreviewLink');
    if (!v) { el.innerHTML = ''; return; }
    const isGDrive = v.includes('drive.google.com');
    el.innerHTML = isGDrive
      ? '✅ Google Drive link detected — will embed with Google viewer'
      : `Preview: <a href="${escHtml(v)}" target="_blank" rel="noopener">Open URL ↗</a>`;
  };

  // Upload form
  document.getElementById('uploadForm').onsubmit = async e => {
    e.preventDefault();
    const statusEl = document.getElementById('uploadStatus');
    const btnText  = document.getElementById('uploadBtnText');
    const genUrl   = document.getElementById('generatedUrl');
    const genLink  = document.getElementById('generatedUrlLink');
    statusEl.textContent = ''; statusEl.className = '';
    genUrl.style.display = 'none';

    const matType     = document.querySelector('input[name="materialType"]:checked').value;
    const contentType = matType === 'notes'
      ? document.querySelector('input[name="contentType"]:checked').value
      : null;

    const data = {
      type:        matType,
      contentType: contentType,
      title:       document.getElementById('title').value.trim(),
      class:       document.getElementById('class').value,
      subject:     document.getElementById('subject').value.trim(),
      coverImage:  document.getElementById('coverImage').value.trim(),
      pdfLink:     document.getElementById('pdfLink').value.trim(),
      description: document.getElementById('description').value.trim()
    };

    if (matType === 'notes') {
      data.chapterNumber = parseInt(document.getElementById('chapterNumber').value) || null;
      data.chapterTitle  = document.getElementById('chapterTitle').value.trim();
      if (contentType === 'exercise') {
        data.exerciseNumber = parseFloat(document.getElementById('exerciseNumber').value) || null;
      }
    }

    // Validate
    const errors = [];
    if (!data.title)      errors.push('Title');
    if (!data.class)      errors.push('Class');
    if (!data.subject)    errors.push('Subject');
    if (!data.coverImage) errors.push('Cover Image URL');
    if (!data.pdfLink)    errors.push('PDF Link');
    if (!data.description) errors.push('Description');
    if (matType === 'notes') {
      if (!data.chapterNumber) errors.push('Chapter Number');
      if (!data.chapterTitle)  errors.push('Chapter/Exercise Title');
      if (contentType === 'exercise' && !data.exerciseNumber) errors.push('Exercise Number');
    }

    if (errors.length) {
      statusEl.textContent = '❌ Required: ' + errors.join(', ');
      statusEl.className   = 'status-message error';
      return;
    }

    try {
      btnText.textContent = 'Uploading...';
      document.getElementById('uploadForm').querySelectorAll('input,select,textarea,button').forEach(el => el.disabled = true);

      const id = await DB.create(data);

      // Build the clean URL for reference
      const subSlug = toSlug(data.subject);
      let url = '';
      if (matType === 'notes') {
        const chSlug = contentType === 'exercise'
          ? `exercise-${data.chapterNumber}-${data.exerciseNumber}`
          : `chapter-${data.chapterNumber}`;
        url = `/fbise/notes/${data.class}/${subSlug}/${chSlug}`;
      } else {
        url = `/fbise/books/${data.class}/${subSlug}`;
      }

      statusEl.textContent = '✅ Uploaded successfully!';
      statusEl.className   = 'status-message success';
      genLink.textContent  = location.origin + url;
      genLink.href         = url;
      genUrl.style.display = 'block';

      document.getElementById('uploadForm').reset();
      document.querySelector('input[name="materialType"][value="notes"]').checked = true;
      document.querySelector('input[name="contentType"][value="chapter"]').checked = true;
      document.getElementById('contentTypeRow').style.display = 'grid';
      document.getElementById('chapterGroup').style.display   = 'block';
      document.getElementById('chapterTitleGroup').style.display = 'block';
      document.getElementById('exerciseRow').style.display    = 'none';
      document.getElementById('pdfPreviewLink').innerHTML     = '';
      updateExercisePreview();
      setTimeout(() => { statusEl.textContent = ''; statusEl.className = ''; }, 8000);
    } catch (err) {
      statusEl.textContent = '❌ Upload failed: ' + err.message;
      statusEl.className   = 'status-message error';
    } finally {
      btnText.textContent = 'Upload Material';
      document.getElementById('uploadForm').querySelectorAll('input,select,textarea,button').forEach(el => el.disabled = false);
    }
  };

  // Edit form
  document.getElementById('editForm').onsubmit = async e => {
    e.preventDefault();
    if (!currentEditId) return;
    const type = document.getElementById('editType').value;
    const updates = {
      title:       document.getElementById('editTitle').value.trim(),
      class:       document.getElementById('editClass').value,
      subject:     document.getElementById('editSubject').value.trim(),
      coverImage:  document.getElementById('editCoverImage').value.trim(),
      pdfLink:     document.getElementById('editPdfLink').value.trim(),
      description: document.getElementById('editDescription').value.trim()
    };
    if (type === 'notes') {
      updates.chapterNumber  = parseInt(document.getElementById('editChapterNumber').value) || null;
      updates.exerciseNumber = parseFloat(document.getElementById('editExerciseNumber').value) || null;
      updates.chapterTitle   = document.getElementById('editChapterTitle').value.trim();
      // Recalculate slugs
      const isEx = !!updates.exerciseNumber;
      updates.chapterSlug = isEx
        ? `exercise-${updates.chapterNumber}-${updates.exerciseNumber}`
        : `chapter-${updates.chapterNumber}`;
      updates.contentType = isEx ? 'exercise' : 'chapter';
    }
    try {
      await DB.update(currentEditId, updates);
      closeModal('editModal');
      loadMaterials();
      alert('✅ Material updated!');
    } catch (err) {
      alert('❌ Update failed: ' + err.message);
    }
  };

  document.getElementById('closeEditModal').onclick  = () => closeModal('editModal');
  document.getElementById('closeEditModal2').onclick = () => closeModal('editModal');
  document.getElementById('closeViewMessage').onclick = () => closeModal('viewMessageModal');

  ['editModal','viewMessageModal'].forEach(id => {
    document.getElementById(id).onclick = e => { if (e.target.id === id) closeModal(id); };
  });

  const importStatus = document.getElementById('importStatus');
  const say = t => { importStatus.textContent = t; };

  document.getElementById('exportBtn').onclick = async () => {
    const items = await DB.getAll();
    const blob = new Blob([JSON.stringify({ items }, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `studyleem-materials-${new Date().toISOString().slice(0,10)}.json` });
    a.click(); URL.revokeObjectURL(a.href);
    say(`✅ Exported ${items.length} materials.`);
  };

  document.getElementById('importFile').onchange = async function () {
    const file = this.files[0]; if (!file) return;
    say('Importing…');
    try {
      const data = JSON.parse(await file.text());
      const items = Array.isArray(data) ? data : data.items;
      if (!Array.isArray(items)) throw new Error('File must be an array or {"items": [...]}');
      const r = await DB.importItems(items);
      say(`✅ Imported ${r.imported} materials${r.skipped ? `, skipped ${r.skipped} invalid` : ''}.`);
      loadStats(); loadMaterials();
    } catch (e) { say('❌ ' + e.message); }
    this.value = '';
  };

  // Reads the OLD Firebase project over its public REST API (same access the old site had)
  document.getElementById('importBtn').onclick = async function () {
    const PROJECT = 'studyleem786', KEY = 'AIzaSyCsT4j__ioR0SS5nASTnj9QJH4QjUexBqA';
    const val = v => !v ? null : 'stringValue' in v ? v.stringValue : 'integerValue' in v ? Number(v.integerValue)
      : 'doubleValue' in v ? v.doubleValue : 'booleanValue' in v ? v.booleanValue : 'timestampValue' in v ? Date.parse(v.timestampValue) : null;
    this.disabled = true; say('Reading old Firebase…');
    try {
      const items = []; let token = '';
      do {
        const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/materials?pageSize=300&key=${KEY}${token ? '&pageToken=' + encodeURIComponent(token) : ''}`);
        if (!r.ok) throw new Error(`Old project returned ${r.status} (it may be deleted or private). Use "Import JSON" instead.`);
        const j = await r.json();
        for (const d of j.documents || []) {
          const o = { id: d.name.split('/').pop() };
          for (const [k, v] of Object.entries(d.fields || {})) o[k] = val(v);
          items.push(o);
        }
        token = j.nextPageToken || '';
      } while (token);
      const r = await DB.importItems(items);
      say(`✅ Imported ${r.imported} materials${r.skipped ? `, skipped ${r.skipped} invalid` : ''}.`);
      loadStats(); loadMaterials();
    } catch (e) { say('❌ ' + e.message); }
    this.disabled = false;
  };

  document.getElementById('searchMaterials').oninput = filterTable;
  document.getElementById('filterClass').onchange    = filterTable;
  document.getElementById('filterType').onchange     = filterTable;
  document.getElementById('searchMessages').oninput       = filterMessages;
  document.getElementById('filterMessageStatus').onchange = filterMessages;
}

function updateExercisePreview() {
  const el  = document.getElementById('exercisePreview');
  const ch  = document.getElementById('chapterNumber').value;
  const ex  = document.getElementById('exerciseNumber').value;
  const ct  = document.querySelector('input[name="contentType"]:checked');
  if (!el || !ct) return;
  if (ct.value === 'exercise' && ch) {
    el.textContent = `Preview: Exercise ${ch}.${ex || '?'}`;
  } else if (ch) {
    el.textContent = `Preview: Chapter ${ch}`;
  } else {
    el.textContent = 'Preview: —';
  }
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// ── Materials ─────────────────────────────────────
async function loadMaterials() {
  const tbody = document.getElementById('materialsTableBody');
  try {
    tbody.innerHTML = '<tr><td colspan="8" class="loading">Loading...</td></tr>';
    allMaterials = await DB.getAll();
    renderTable(allMaterials);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="loading">Error: ${escHtml(err.message)}</td></tr>`;
  }
}

function renderTable(materials) {
  const tbody = document.getElementById('materialsTableBody');
  if (!materials.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="loading">No materials found</td></tr>';
    return;
  }
  tbody.innerHTML = materials.map(m => {
    const subSlug = m.subjectSlug || toSlug(m.subject || '');
    let url = '';
    if (m.type === 'notes' && m.chapterSlug) {
      url = `/fbise/notes/${m.class}/${subSlug}/${m.chapterSlug}`;
    } else if (m.type === 'books') {
      url = `/fbise/books/${m.class}/${subSlug}`;
    }
    const chEx = m.contentType === 'exercise'
      ? `Ex ${m.chapterNumber}.${m.exerciseNumber || '?'}`
      : (m.chapterNumber ? `Ch ${m.chapterNumber}` : '—');
    return `<tr>
      <td><img src="${escHtml(m.coverImage)}" class="material-cover-thumb"
          onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2760%27 height=%2760%27%3E%3Crect fill=%27%23f3f4f6%27 width=%2760%27 height=%2760%27/%3E%3C/svg%3E'"></td>
      <td>${escHtml(m.title)}</td>
      <td>${m.type === 'books' ? '📚' : '📝'} ${m.type}</td>
      <td>Class ${m.class}</td>
      <td>${escHtml(m.subject)}</td>
      <td>${chEx}</td>
      <td>${url ? `<a href="${url}" target="_blank" style="color:#2563eb;font-size:.78rem;">View ↗</a>` : '—'}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn-secondary btn-sm" onclick="editMaterial('${m.id}')">Edit</button>
          <button class="btn btn-danger btn-sm"    onclick="deleteMaterial('${m.id}')">Delete</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function filterTable() {
  const search = document.getElementById('searchMaterials').value.toLowerCase();
  const cls    = document.getElementById('filterClass').value;
  const type   = document.getElementById('filterType').value;
  let filtered = allMaterials;
  if (cls)    filtered = filtered.filter(m => m.class === cls);
  if (type)   filtered = filtered.filter(m => m.type  === type);
  if (search) filtered = filtered.filter(m =>
    [m.title, m.subject, m.chapterTitle].some(v => v && v.toLowerCase().includes(search))
  );
  renderTable(filtered);
}

window.editMaterial = function(id) {
  const m = allMaterials.find(x => x.id === id);
  if (!m) return;
  currentEditId = id;
  document.getElementById('editId').value          = id;
  document.getElementById('editType').value         = m.type;
  document.getElementById('editTitle').value        = m.title || '';
  document.getElementById('editClass').value        = m.class || '';
  document.getElementById('editSubject').value      = m.subject || '';
  document.getElementById('editCoverImage').value   = m.coverImage || '';
  document.getElementById('editPdfLink').value      = m.pdfLink || '';
  document.getElementById('editDescription').value  = m.description || '';
  const chRow = document.getElementById('editChapterRow');
  if (m.type === 'notes') {
    chRow.style.display = 'block';
    document.getElementById('editChapterNumber').value  = m.chapterNumber || '';
    document.getElementById('editExerciseNumber').value = m.exerciseNumber || '';
    document.getElementById('editChapterTitle').value   = m.chapterTitle || '';
  } else {
    chRow.style.display = 'none';
  }
  document.getElementById('editModal').classList.add('active');
};

window.deleteMaterial = async function(id) {
  if (!confirm('Delete permanently? Cannot be undone.')) return;
  try {
    await DB.delete(id);
    loadMaterials(); loadStats();
    alert('✅ Deleted!');
  } catch (err) {
    alert('❌ ' + err.message);
  }
};

// ── Stats ─────────────────────────────────────────
async function loadStats() {
  try {
    const s = await DB.getStats();
    document.getElementById('totalMaterialsStat').textContent = s.total;
    document.getElementById('totalBooksStat').textContent     = s.books;
    document.getElementById('totalNotesStat').textContent     = s.notes;
    document.getElementById('class9Count').textContent        = s.byClass['9']  || 0;
    document.getElementById('class10Count').textContent       = s.byClass['10'] || 0;
    document.getElementById('class11Count').textContent       = s.byClass['11'] || 0;
    document.getElementById('class12Count').textContent       = s.byClass['12'] || 0;
  } catch (err) { console.error('Stats error:', err); }
}

// ── Messages ──────────────────────────────────────
async function loadMessages() {
  const tbody = document.getElementById('messagesTableBody');
  try {
    tbody.innerHTML = '<tr><td colspan="7" class="loading">Loading...</td></tr>';
    allMessages = await Messages.list();
    renderMessages(allMessages);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="loading">Error: ${escHtml(err.message)}</td></tr>`;
  }
}

function renderMessages(messages) {
  const tbody = document.getElementById('messagesTableBody');
  if (!messages.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="loading">No messages yet.</td></tr>';
    return;
  }
  tbody.innerHTML = messages.map(m => {
    const date    = m.sentAt ? new Date(m.sentAt).toLocaleDateString('en-GB') : '—';
    const preview = (m.message || '').substring(0, 55) + ((m.message || '').length > 55 ? '…' : '');
    return `<tr style="${!m.read ? 'font-weight:600;background:#f0f7ff;' : ''}">
      <td>${!m.read ? '🔵 New' : '✅ Read'}</td>
      <td>${escHtml(m.name || '')}</td>
      <td><a href="mailto:${escHtml(m.email||'')}">${escHtml(m.email||'')}</a></td>
      <td>${escHtml(m.subjectLabel || m.subject || 'General')}</td>
      <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(preview)}</td>
      <td>${date}</td>
      <td><div class="table-actions">
        <button class="btn btn-secondary btn-sm" onclick="viewMessage('${m.id}')">View</button>
        <button class="btn btn-danger btn-sm"    onclick="deleteMessage('${m.id}')">Delete</button>
      </div></td>
    </tr>`;
  }).join('');
}

function filterMessages() {
  const search = document.getElementById('searchMessages').value.toLowerCase();
  const status = document.getElementById('filterMessageStatus').value;
  let filtered = allMessages;
  if (status === 'unread') filtered = filtered.filter(m => !m.read);
  if (status === 'read')   filtered = filtered.filter(m =>  m.read);
  if (search) filtered = filtered.filter(m =>
    [m.name, m.email, m.message].some(v => v && v.toLowerCase().includes(search))
  );
  renderMessages(filtered);
}

window.viewMessage = async function(id) {
  const msg  = allMessages.find(m => m.id === id);
  if (!msg) return;
  const date = msg.sentAt ? new Date(msg.sentAt).toLocaleString('en-GB') : '—';
  document.getElementById('viewMessageBody').innerHTML = `
    <table style="width:100%;border-collapse:collapse;margin-bottom:1rem;">
      <tr><td style="padding:.45rem 0;color:#6b7280;width:110px"><strong>From:</strong></td><td>${escHtml(msg.name||'')}</td></tr>
      <tr><td style="padding:.45rem 0;color:#6b7280"><strong>Email:</strong></td><td><a href="mailto:${escHtml(msg.email||'')}" style="color:#2563eb">${escHtml(msg.email||'')}</a></td></tr>
      <tr><td style="padding:.45rem 0;color:#6b7280"><strong>Date:</strong></td><td>${date}</td></tr>
    </table>
    <hr style="margin:1rem 0;border:1px solid #e5e7eb;">
    <p style="line-height:1.8;white-space:pre-wrap;color:#1f2937;margin-bottom:1.5rem">${escHtml(msg.message||'')}</p>
    <a href="mailto:${escHtml(msg.email||'')}?subject=Re: StudyLeem" class="btn btn-primary">↩ Reply</a>`;
  document.getElementById('viewMessageModal').classList.add('active');
  if (!msg.read) {
    try {
      await Messages.markRead(id);
      const idx = allMessages.findIndex(m => m.id === id);
      if (idx !== -1) allMessages[idx].read = true;
      renderMessages(allMessages);
    } catch (e) { console.error(e); }
  }
};

window.deleteMessage = async function(id) {
  if (!confirm('Delete this message?')) return;
  try {
    await Messages.remove(id);
    allMessages = allMessages.filter(m => m.id !== id);
    renderMessages(allMessages);
  } catch (err) { alert('❌ ' + err.message); }
};

// ── Utilities ─────────────────────────────────────
function escHtml(t) {
  if (!t) return '';
  const d = document.createElement('div');
  d.textContent = t;
  return d.innerHTML;
}

function toSlug(str) {
  return String(str).toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9\-]/g,'').replace(/-+/g,'-').replace(/^-|-$/g,'');
}
