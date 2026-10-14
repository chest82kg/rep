// src/ui/breadcrumbs.js
//
// Строит хлебные крошки для статьи. Ничего не знает о внутренностях статей —
// работает с полями category, categoryTitle, faction, title.
//
// ВАЖНО: для статьи «Глоссарий» ссылки в крошках делаются НЕкликабельными,
// чтобы не создавать путаницы (глоссарий — это справочник терминов,
// а не навигационный раздел).

import { DATABASE } from '../core/data.js';

const CATEGORY_ICONS = {
  lore: '📖',
  rules: '⚙️',
  factions: '⚔️',
  bestiary: '🐉',
  missions: '🎯',
  faq: '❓',
  builder: '🛠️'
};

const CATEGORY_LABELS = {
  lore: 'Лор и начало',
  rules: 'Основные правила',
  factions: 'Фракции',
  bestiary: 'Бестиарий',
  missions: 'Правила миссий',
  faq: 'ЧАВО',
  builder: 'Конструктор'
};

// Статьи, для которых крошки должны быть некликабельными
// (или только для отдельных их элементов).
// Сейчас: сам глоссарий — не ссылка на себя, и категорию «Основные правила»
// для него тоже не делаем кликабельной.
const NON_CLICKABLE_IDS = new Set([
  'rules-glossary'
]);

/**
 * Возвращает HTML хлебных крошек для переданной статьи.
 * @param {Object} item — статья из DATABASE
 * @returns {string}
 */
export function renderBreadcrumbs(item) {
  if (!item) return '';

  const isNonClickable = NON_CLICKABLE_IDS.has(item.id);
  const crumbs = [];

  // 1. Главная
  crumbs.push({
    label: '🏠 Главная',
    href: `#${DATABASE[0]?.id || 'lore-wholeness'}`
  });

  // 2. Категория
  if (item.category) {
    const icon = CATEGORY_ICONS[item.category] || '📄';
    const label = CATEGORY_LABELS[item.category] || item.categoryTitle || item.category;
    const firstInCategory = DATABASE.find(d => d.category === item.category && d.type !== 'builder');
    crumbs.push({
      label: `${icon} ${label}`,
      // Если статья — сам глоссарий, категорию не делаем кликабельной
      href: (isNonClickable || !firstInCategory) ? null : `#${firstInCategory.id}`
    });
  }

  // 3. Фракция (если есть)
  if (item.faction) {
    const firstInFaction = DATABASE.find(d => d.faction === item.faction);
    crumbs.push({
      label: `🏔️ ${item.faction}`,
      href: (isNonClickable || !firstInFaction) ? null : `#${firstInFaction.id}`
    });
  }

  // 4. Подкатегория (если есть)
  if (item.subCategory) {
    const firstInSub = DATABASE.find(d => d.subCategory === item.subCategory && d.category === item.category);
    crumbs.push({
      label: item.subCategory,
      href: (isNonClickable || !firstInSub) ? null : `#${firstInSub.id}`
    });
  }

  // 5. Текущая статья — не кликабельна
  crumbs.push({
    label: item.title,
    href: null,
    current: true
  });

  // Собираем HTML
  const separator = `<span class="breadcrumb-sep">/</span>`;
  const itemsHTML = crumbs.map((c) => {
    if (c.current || !c.href) {
      return `<span class="breadcrumb-item current" title="${escapeAttr(c.label)}">${escapeHtml(c.label)}</span>`;
    }
    return `<a href="${escapeAttr(c.href)}" class="breadcrumb-item">${escapeHtml(c.label)}</a>`;
  }).join(separator);

  return `<nav class="breadcrumbs" aria-label="Навигация">${itemsHTML}</nav>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(str) {
  return escapeHtml(str);
}