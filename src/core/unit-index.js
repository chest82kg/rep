// src/core/unit-index.js
//
// Строит плоский индекс всех датакарт, найденных в статьях DATABASE.
// Каждая карточка получает id, якорь и обратную ссылку на статью-родителя.
// Используется поиском (src/ui/search.js) и роутером (src/core/router.js).

import { DATABASE } from './data.js';
import { slugify } from '../utils/slugify.js';

/**
 * @typedef {Object} UnitIndexEntry
 * @property {string} id           — уникальный якорь, например 'faction-dwarves-clan1--zheleznoborod-voin'
 * @property {string} title        — название юнита
 * @property {string} role         — 'Базовый (3 куб.)' / 'Элита (4 куб.)' / 'Герой (5 куб.)'
 * @property {string} cost         — '115 очков' / '1.5 МИ'
 * @property {string} articleId    — id статьи, в которой лежит карточка
 * @property {string} articleTitle — название статьи
 * @property {string} faction      — фракция (если есть)
 * @property {string} searchText   — нормализованный текст для поиска
 */

let cache = null;
let indexById = null;

export function getUnitIndex() {
  if (cache) return cache;
  cache = buildIndex();
  indexById = new Map(cache.map(entry => [entry.id, entry]));
  return cache;
}

function buildIndex() {
  const entries = [];

  DATABASE.forEach(article => {
    if (!article.content || typeof article.content !== 'string') return;
    if (!article.content.includes('aos-card')) return;

    const tmp = document.createElement('div');
    tmp.innerHTML = article.content;
    const cards = tmp.querySelectorAll('.aos-card');

    cards.forEach((card, idx) => {
      const title = card.querySelector('.aos-title')?.textContent?.trim() || `Отряд ${idx + 1}`;
      const role = card.querySelector('.aos-badge-role')?.textContent?.trim() || '';
      const cost = card.querySelector('.aos-badge-pts')?.textContent?.trim() || '';

      const slug = slugify(title);
      const id = `${article.id}--${slug}`;

      const weaponNames = Array.from(card.querySelectorAll('.aos-weapon-name'))
        .map(el => el.textContent.trim())
        .join(' ');
      const abilities = Array.from(card.querySelectorAll('.aos-ability-title, .aos-ability-text'))
        .map(el => el.textContent.trim())
        .join(' ');

      const searchText = [title, role, cost, weaponNames, abilities, article.title]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      entries.push({
        id,
        title,
        role,
        cost,
        articleId: article.id,
        articleTitle: article.title,
        faction: article.faction || '',
        searchText
      });
    });
  });

  return entries;
}

export function getUnitById(id) {
  if (!indexById) getUnitIndex();
  return indexById.get(id) || null;
}

export function searchUnits(query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q || q.length < 2) return [];
  const words = q.split(/\s+/).filter(Boolean);

  return getUnitIndex()
    .filter(entry => words.every(w => entry.searchText.includes(w)))
    .slice(0, 20);
}