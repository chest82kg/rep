// src/core/data.js
import { GLOSSARY } from '../content/glossary.js';
import { RULES_DATA } from '../content/rules.js';
import { BESTIARY_DATA } from '../content/bestiary.js';
import { FACTIONS_DATA } from '../content/factions.js';
import { MISSIONS_DATA } from '../content/missions.js';

const CATEGORY_ORDER = [
  'lore',        // Лор и начало
  'rules',       // Основные правила
  'factions',    // Фракции
  'bestiary',    // Бестиарий
  'missions',    // Правила миссий
  'faq',         // ЧАВО
  'builder'      // Конструктор ростера (в самом низу)
];

const RAW_DATABASE = [
  {
    id: 'builder',
    category: 'builder',
    categoryTitle: 'Конструктор ростера',
    type: 'builder',
    title: '🛠️ Ростер Билдер'
  },
  ...RULES_DATA,
  ...BESTIARY_DATA,
  ...FACTIONS_DATA,
  ...MISSIONS_DATA
];

function checkDuplicates(items) {
  const seen = new Map();
  const duplicates = [];
  items.forEach(item => {
    if (!item || !item.id) return;
    if (seen.has(item.id)) {
      duplicates.push({ id: item.id, first: seen.get(item.id), second: item.title });
    } else {
      seen.set(item.id, item.title);
    }
  });
  if (duplicates.length > 0) {
    console.warn(
      '[DATABASE] Обнаружены дубликаты id (роутер будет открывать только первую запись):',
      duplicates
    );
  }
}

function sortByCategory(items) {
  const orderIndex = (cat) => {
    const idx = CATEGORY_ORDER.indexOf(cat);
    return idx === -1 ? CATEGORY_ORDER.length : idx;
  };
  return [...items].sort((a, b) => orderIndex(a.category) - orderIndex(b.category));
}

const SORTED_DATABASE = sortByCategory(RAW_DATABASE);
checkDuplicates(SORTED_DATABASE);

export const DATABASE = SORTED_DATABASE;

// --- Индекс по id для O(1) поиска ---
const INDEX_BY_ID = new Map();
DATABASE.forEach(item => {
  if (item && item.id && !INDEX_BY_ID.has(item.id)) {
    INDEX_BY_ID.set(item.id, item);
  }
});

export function getItemById(id) {
  if (!id) return undefined;
  return INDEX_BY_ID.get(id);
}

export function getItemsByCategory(category, subCategory) {
  return DATABASE.filter(item => {
    if (item.category !== category) return false;
    if (subCategory !== undefined && item.subCategory !== subCategory) return false;
    return true;
  });
}

// --- ФРАКЦИИ И КЛАНЫ ---

const CLAN_TO_FACTION = {
  'Клан 1 — Клан Железной Кузни': 'Кхад-Дарум',
  'Клан 2 — Клан Глубоких Троп': 'Кхад-Дарум',
  'Клан 3 — Клан Рунных Кузнецов': 'Кхад-Дарум',
  'Клан 1 — Клан Скорпионов': 'Арафия',
  'Клан 2 — Клан Барханов': 'Арафия',
  'Клан 3 — Клан Костяных Шаманов': 'Арафия'
};

const FACTION_GENERAL_ID = {
  'Кхад-Дарум': 'faction-dwarves-general',
  'Арафия': 'faction-goblins-general'
};

export function getFactionFromClan(clanName) {
  if (!clanName) return null;
  if (CLAN_TO_FACTION[clanName]) return CLAN_TO_FACTION[clanName];
  const c = String(clanName);
  if (c.includes('Кузни') || c.includes('Троп') || c.includes('Кузнецов') || c.includes('Кхад')) return 'Кхад-Дарум';
  if (c.includes('Скорпион') || c.includes('Бархан') || c.includes('Шаман') || c.includes('Араф')) return 'Арафия';
  return null;
}

export function isGoblinClan(clanName) {
  return getFactionFromClan(clanName) === 'Арафия';
}

export function isDwarfClan(clanName) {
  return getFactionFromClan(clanName) === 'Кхад-Дарум';
}

export function getFactionGeneralId(clanName) {
  const faction = getFactionFromClan(clanName);
  if (!faction) return null;
  return FACTION_GENERAL_ID[faction] || null;
}

export function getFactionGeneralArticle(clanName) {
  const id = getFactionGeneralId(clanName);
  if (!id) return null;
  return getItemById(id) || null;
}

export { GLOSSARY };