// src/ui/search.js
import { DATABASE } from '../core/data.js';
import { searchUnits } from '../core/unit-index.js';
import { debounce } from '../utils/debounce.js';
import { escapeHtml } from '../utils/escape.js';

const DEBOUNCE_MS = 120;
const MAX_ARTICLE_RESULTS = 8;

export function initGlobalSearch() {
  const input = document.getElementById('search-input');
  const dropdown = document.getElementById('search-results');

  if (!input || !dropdown) return;

  const runSearch = debounce((query) => {
    renderSearchResults(query, dropdown);
  }, DEBOUNCE_MS);

  input.addEventListener('input', (e) => {
    runSearch(e.target.value);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-box')) {
      dropdown.classList.add('hidden');
    }
  });
}

function renderSearchResults(rawQuery, dropdown) {
  const q = String(rawQuery || '').toLowerCase().trim();

  if (!q) {
    dropdown.classList.add('hidden');
    dropdown.innerHTML = '';
    return;
  }

  if (!DATABASE || DATABASE.length === 0) return;

  // --- Статьи ---
  const articleMatches = DATABASE.filter(item =>
    (item.title && item.title.toLowerCase().includes(q)) ||
    (item.content && item.content.toLowerCase().includes(q)) ||
    (item.description && item.description.toLowerCase().includes(q)) ||
    (item.faction && item.faction.toLowerCase().includes(q))
  ).slice(0, MAX_ARTICLE_RESULTS);

  // --- Отряды (датакарты) ---
  const unitMatches = searchUnits(q);

  const hasAny = articleMatches.length > 0 || unitMatches.length > 0;

  if (!hasAny) {
    dropdown.innerHTML = '<div class="search-item" style="padding: 10px 16px; color: var(--text-muted);">Ничего не найдено</div>';
    dropdown.classList.remove('hidden');
    return;
  }

  let html = '';

  if (articleMatches.length > 0) {
    html += `<div class="search-section-title">📚 Статьи</div>`;
    html += articleMatches.map(m => `
      <div class="search-item" data-id="${escapeHtml(m.id)}" data-type="article">
        <span style="font-weight: 600; color: #fff;">${escapeHtml(m.title)}</span>
        <small style="color: var(--accent); background: rgba(108,92,231,0.1); padding: 2px 6px; border-radius: 4px;">${escapeHtml(m.categoryTitle || m.faction || m.category)}</small>
      </div>
    `).join('');
  }

  if (unitMatches.length > 0) {
    html += `<div class="search-section-title">⚔️ Отряды</div>`;
    html += unitMatches.map(u => `
      <div class="search-item" data-id="${escapeHtml(u.id)}" data-type="unit" data-article="${escapeHtml(u.articleId)}">
        <span style="font-weight: 600; color: #fff;">${escapeHtml(u.title)}</span>
        <small style="color: var(--text-muted);">${escapeHtml(u.articleTitle)}${u.role ? ' • ' + escapeHtml(u.role) : ''}</small>
      </div>
    `).join('');
  }

  dropdown.innerHTML = html;

  dropdown.querySelectorAll('.search-item').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.id;
      if (!id) return;
      window.location.hash = id;
      const input = document.getElementById('search-input');
      if (input) input.value = '';
      dropdown.classList.add('hidden');
    });
  });

  dropdown.classList.remove('hidden');
}