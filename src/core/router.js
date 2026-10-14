// src/core/router.js
import { DATABASE, getItemById } from './data.js';
import { renderBuilderUI } from '../builder/index.js';
import { highlightTerms } from '../ui/glossary-highlight.js';
import { updateActiveSidebarLink } from '../ui/sidebar.js';
import { slugify } from '../utils/slugify.js';
import { renderBreadcrumbs } from '../ui/breadcrumbs.js';
import { escapeHtml } from '../utils/escape.js';

export function router() {
  const rawHash = window.location.hash.replace('#', '');
  const { articleId, anchorId } = splitHash(rawHash);

  const targetId = articleId || DATABASE[0].id;
  const item = getItemById(targetId);
  const container = document.getElementById('app-content');

  if (!item) {
    container.innerHTML = '<h1>404</h1><p>Страница не найдена</p>';
    return;
  }

  if (item.type === 'builder') {
    renderBuilderUI(container);
  } else if (item.type === 'warcard') {
    container.innerHTML = renderWithBreadcrumbs(item, renderWarCardBody(item));
    highlightTerms();
  } else {
    container.innerHTML = renderWithBreadcrumbs(item, renderArticleBody(item));
    highlightTerms();
    if (anchorId) assignAnchorsAndScroll(container, anchorId);
  }

  updateActiveSidebarLink(item.id);
  if (!anchorId) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

/**
 * Разбирает хеш на id статьи и полный anchorId (который может включать подъякорь `--slug`).
 *
 * Примеры:
 *   "rules-quick-start"           → { articleId: "rules-quick-start", anchorId: "" }
 *   "faction-dwarves-clan1--voin" → { articleId: "faction-dwarves-clan1", anchorId: "faction-dwarves-clan1--voin" }
 */
function splitHash(hash) {
  if (!hash) return { articleId: '', anchorId: '' };
  const idx = hash.indexOf('--');
  if (idx === -1) return { articleId: hash, anchorId: '' };
  return {
    articleId: hash.slice(0, idx),
    anchorId: hash
  };
}

function renderWithBreadcrumbs(item, bodyHTML) {
  const breadcrumbs = renderBreadcrumbs(item);
  return `
    ${breadcrumbs}
    <h1>${escapeHtml(item.title)}</h1>
    ${bodyHTML}
  `;
}

function renderArticleBody(item) {
  return `<div class="article-body">${item.content}</div>`;
}

function renderWarCardBody(item) {
  const abilitiesHTML = (item.abilities || []).map(ab => `
    <div class="ability-item">
      <div class="ability-name">${escapeHtml(ab.name)}</div>
      <div class="ability-desc">${escapeHtml(ab.desc)}</div>
    </div>
  `).join('');

  const stats = item.stats || {};

  return `
    <p>${escapeHtml(item.description || '')}</p>
    <div class="war-card">
      <div class="card-header">
        <span class="card-title">${escapeHtml(item.title)}</span>
        <span class="card-role">${escapeHtml(item.role || '')}</span>
      </div>
      <div class="card-stats">
        <div class="stat-box"><span class="stat-label">Движ</span><span class="stat-value">${escapeHtml(stats.move || '—')}</span></div>
        <div class="stat-box"><span class="stat-label">Здоровье</span><span class="stat-value">${escapeHtml(stats.wounds || '—')}</span></div>
        <div class="stat-box"><span class="stat-label">Атака</span><span class="stat-value">${escapeHtml(stats.hit || '—')}</span></div>
        <div class="stat-box"><span class="stat-label">Броня</span><span class="stat-value">${escapeHtml(stats.armor || '—')}</span></div>
      </div>
      <div class="card-abilities">${abilitiesHTML}</div>
    </div>
  `;
}

function assignAnchorsAndScroll(container, anchorId) {
  const articleId = anchorId.split('--')[0];
  const cards = container.querySelectorAll('.aos-card');
  let found = false;

  cards.forEach(card => {
    const title = card.querySelector('.aos-title')?.textContent?.trim() || '';
    const cardId = `${articleId}--${slugify(title)}`;
    card.id = cardId;

    if (cardId === anchorId) {
      found = true;
      setTimeout(() => {
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        card.classList.add('highlight-flash');
        setTimeout(() => card.classList.remove('highlight-flash'), 2000);
      }, 120);
    }
  });

  if (!found) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}