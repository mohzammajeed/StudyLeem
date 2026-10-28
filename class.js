document.addEventListener('DOMContentLoaded', () => {
    const classNum = new URLSearchParams(window.location.search).get('class');

    if (!classNum) {
        window.location.href = '/home';
        return;
    }

    setupMobileMenu();

    initPage(classNum);
});

function setupMobileMenu() {
    const btn = document.getElementById('mobileMenuBtn');
    const menu = document.getElementById('mobileMenu');

    if (btn && menu) {
        btn.onclick = () => menu.classList.toggle('active');
        document.onclick = (e) => {
            if (!menu.contains(e.target) && !btn.contains(e.target)) {
                menu.classList.remove('active');
            }
        };
    }
}

async function initPage(classNum) {
    const titles = {
        '9':  'Class 9 - SSC Part 1',
        '10': 'Class 10 - SSC Part 2',
        '11': 'Class 11 - HSSC Part 1',
        '12': 'Class 12 - HSSC Part 2'
    };

    document.getElementById('pageTitle').textContent = `${titles[classNum]} - StudyLeem`;
    document.getElementById('classTitle').textContent = titles[classNum];

    const container = document.getElementById('subjectsGrid');

    if (typeof DB === 'undefined') {
        console.error('DB not initialized');
        container.innerHTML = '<p class="loading">Database not ready. Please refresh.</p>';
        return;
    }

    try {
        container.innerHTML = '<div class="loading">Loading subjects...</div>';

        const materials = await DB.getByClass(classNum);

        console.log(`Found ${materials.length} materials for class ${classNum}`);

        if (materials.length === 0) {
            container.innerHTML = '<p class="loading">No subjects available for this class yet.</p>';
            return;
        }

        // Group by subject
        const subjectMap = {};
        materials.forEach(m => {
            if (!subjectMap[m.subject]) {
                subjectMap[m.subject] = { books: 0, notes: 0, total: 0 };
            }
            subjectMap[m.subject].total++;
            if (m.type === 'books') subjectMap[m.subject].books++;
            if (m.type === 'notes') subjectMap[m.subject].notes++;
        });

        const subjects = Object.keys(subjectMap).sort();

        container.innerHTML = subjects.map(subject => {
            const counts = subjectMap[subject];
            return `
                <a href="/subject?class=${classNum}&subject=${encodeURIComponent(subject)}" class="subject-card">
                    <h3>${escapeHtml(subject)}</h3>
                    <p>Class ${classNum}</p>
                    <p>${counts.books} Books • ${counts.notes} Notes</p>
                </a>
            `;
        }).join('');

    } catch (error) {
        console.error('Load subjects error:', error);
        container.innerHTML = '<p class="loading">Error loading subjects. Check console for details.</p>';
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
