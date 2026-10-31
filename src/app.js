import { buildSidebar } from './ui/sidebar.js';
import { initGlobalSearch } from './ui/search.js';
import { initAuthGreeting } from './ui/auth-greeting.js';
import { initTopButton } from './ui/top-button.js';
import { initBugReport, closeBugReportModal } from './ui/bug-report.js';
import { router } from './core/router.js';

buildSidebar();
initGlobalSearch();
initAuthGreeting();
initTopButton();
initBugReport();
router();
window.addEventListener('hashchange', router);

// Экспорт для onclick в HTML
window.closeBugReportModal = closeBugReportModal;

// --- Полоса прогресса чтения ---
function initReadingProgress() {
  const progressBar = document.getElementById('reading-progress');
  if (!progressBar) return;

  const updateProgress = () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    progressBar.style.width = `${progress}%`;
  };

  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress(); // Инициализация
}

initReadingProgress();