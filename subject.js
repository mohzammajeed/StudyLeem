let allMaterials = [];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const classNum = params.get('class');
    const subject = params.get('subject');

    if (!classNum || !subject) {
        window.location.href = '/home';
        return;
    }

    setupMobileMenu();
    setupTabs();

    loadMaterials(classNum, subject);

    document.getElementById('pageTitle').textContent = `${subject} - Class ${classNum} | StudyLeem`;
    document.getElementById('subjectTitle').textContent = subject;
});

function setupMobileMenu() {
    const btn = document.getElementById('mobileMenuBtn');
    const menu = document.getElementById('mobileMenu');
    if (btn && menu) {
        btn.onclick = (e) => {
            e.stopPropagation();
            menu.classList.toggle('active');
        };
        document.onclick = (e) => {
            if (!menu.contains(e.target) && !btn.contains(e.target)) {
                menu.classList.remove('active');
            }
        };
    }
}

function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.type;
            filterMaterials();
        };
    });
}

async function loadMaterials(classNum, subject) {
    if (typeof DB === 'undefined') {
        console.error('DB not initialized');
        document.getElementById('materialsGrid').innerHTML = '<p class="loading">Database not ready. Please refresh.</p>';
        return;
    }

    try {
        allMaterials = await DB.getBySubject(classNum, subject);
        allMaterials.sort((a, b) => (a.chapterNumber || 0) - (b.chapterNumber || 0));
        filterMaterials();
    } catch (error) {
        console.error('Load materials error:', error);
        document.getElementById('materialsGrid').innerHTML = '<p class="loading">Error loading materials.</p>';
    }
}

function filterMaterials() {
    const filtered = currentFilter === 'all'
        ? allMaterials
        : allMaterials.filter(m => m.type === currentFilter);

    const grid = document.getElementById('materialsGrid');

    if (filtered.length === 0) {
        grid.innerHTML = '<p class="loading">No materials found</p>';
        return;
    }

    grid.innerHTML = filtered.map(m => {
        const titleJson  = JSON.stringify(m.title);
        const urlJson    = JSON.stringify(m.pdfLink);
        return `
        <div class="material-card"
             role="button"
             tabindex="0"
             title="Click to preview ${escapeHtml(m.title)}"
             onclick='openPreview(${titleJson}, ${urlJson})'
             onkeydown='if(event.key==="Enter"||event.key===" ")openPreview(${titleJson}, ${urlJson})'>
            <div style="position:relative">
                <img src="${m.coverImage}"
                     alt="${escapeHtml(m.title)}"
                     class="material-cover"
                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27208%27 height=%27300%27%3E%3Crect fill=%27%23f3f4f6%27 width=%27208%27 height=%27300%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 text-anchor=%27middle%27 dy=%27.3em%27 fill=%27%239ca3af%27 font-family=%27Arial%27 font-size=%2714%27%3ENo Image%3C/text%3E%3C/svg%3E'"
                     loading="lazy">
                <span class="material-type-badge">${m.type === 'books' ? ic('book-open') + ' Book' : ic('notes') + ' Notes'}</span>
            </div>
            <div class="material-content">
                <h3 class="material-title">${escapeHtml(m.title)}</h3>
                <div class="material-meta">
                    <span>Class ${m.class}</span>
                    <span>${escapeHtml(m.subject)}</span>
                    ${m.chapterNumber ? `<span>Ch. ${m.chapterNumber}</span>` : ''}
                </div>
                <p class="material-description">${escapeHtml(m.description || '')}</p>
                <div class="card-preview-hint">${ic('eye')} Click to Preview &amp; Download</div>
            </div>
        </div>`;
    }).join('');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Open the PDF viewer inside this page (no page change)
window.openPreview = function(title, url) {
    if (!url) { alert('PDF link not available for this material.'); return; }
    if (window.StudyPDF) { StudyPDF.openModal(title, url); return; }
    window.location.href = '/pdf-preview?title=' + encodeURIComponent(title) + '&url=' + encodeURIComponent(url) + '&back=' + encodeURIComponent(location.pathname + location.search);
};
