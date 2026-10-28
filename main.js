// ============================================
// STUDYLEEM - MAIN JAVASCRIPT
// Global helper functions
// ============================================

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Get URL parameters
function getUrlParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

// Toggle chapter accordion
function toggleChapter(element) {
  const content = element.nextElementSibling;
  content.classList.toggle('expanded');
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Show notification
function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = `alert alert-${type}`;
  notification.textContent = message;
  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.right = '20px';
  notification.style.zIndex = '9999';
  notification.style.minWidth = '300px';
  notification.style.animation = 'slideIn 0.3s ease';
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

console.log('StudyLeem - Main JavaScript Loaded ');

// ============================================
// LEEMAI FLOATING BUTTON — appears on all pages
// except the LeemAI page itself
// ============================================
(function injectLeemAIButton() {
  // Don't show on LeemAI page itself
  if (window.location.pathname === '/leemai' || window.location.pathname === '/leemai.html') return;

  // Inject styles
  const fabStyle = document.createElement('style');
  fabStyle.textContent = `
    .leemai-fab {
      position: fixed;
      bottom: 28px;
      right: 28px;
      z-index: 999;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: linear-gradient(135deg, #2563eb, #1e40af);
      color: white;
      text-decoration: none;
      padding: 0.75rem 1.25rem;
      border-radius: 50px;
      font-family: 'Inter', sans-serif;
      font-size: 0.9rem;
      font-weight: 600;
      box-shadow: 0 4px 20px rgba(37, 99, 235, 0.45);
      transition: all 0.25s ease;
      border: none;
      cursor: pointer;
      animation: fabPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
    .leemai-fab:hover {
      transform: translateY(-3px) scale(1.03);
      box-shadow: 0 8px 28px rgba(37, 99, 235, 0.55);
      color: white;
    }
    .leemai-fab:active {
      transform: translateY(0) scale(0.98);
    }
    .leemai-fab-icon {
      font-size: 1.1rem;
      line-height: 1;
    }
    .leemai-fab-pulse {
      position: absolute;
      top: -3px;
      right: -3px;
      width: 12px;
      height: 12px;
      background: #f97316;
      border-radius: 50%;
      border: 2px solid white;
      animation: fabPulse 2s infinite;
    }
    @keyframes fabPop {
      from { opacity: 0; transform: translateY(20px) scale(0.8); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes fabPulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50%      { transform: scale(1.3); opacity: 0.7; }
    }
    @media (max-width: 480px) {
      .leemai-fab span.leemai-fab-text { display: none; }
      .leemai-fab {
        width: 52px;
        height: 52px;
        padding: 0;
        justify-content: center;
        border-radius: 50%;
      }
    }
  `;
  document.head.appendChild(fabStyle);

  // Inject button
  const fab = document.createElement('a');
  fab.href = '/leemai';
  fab.className = 'leemai-fab';
  fab.setAttribute('aria-label', 'Ask LeemAI — FBISE AI Assistant');
  fab.innerHTML = `
    <div class="leemai-fab-pulse"></div>
    <span class="leemai-fab-icon">${ic('bot')}</span>
    <span class="leemai-fab-text">Ask LeemAI</span>
  `;
  document.body.appendChild(fab);
})();
