// src/builder/roster-import.js
//
// Проверка загружаемого официального ростера.
//
// Импортированный HTML не используется для отображения.
// Карточки восстанавливаются из локального официального каталога.
//
// Из старого HTML в инертном template считываются только
// названия оружия для восстановления выбранного варианта.
//
// Авторские юниты требуют отдельного формата мастерской.

import { DATABASE } from '../core/data.js';

import {
  STAKES_LIST,
  STAKES_BUDGET
} from './state.js';

import { validateRosterArtifacts } from './artifacts.js';

export const MAX_ROSTER_IMPORT_BYTES = 2 * 1024 * 1024;

const MAX_UNITS = 200;
const MAX_CARD_HTML_LENGTH = 100000;
const MAX_TOTAL_HTML_LENGTH = MAX_ROSTER_IMPORT_BYTES;

const CLAN_NAMES = new Set([
  'Клан 1 — Клан Железной Кузни',
  'Клан 2 — Клан Глубоких Троп',
  'Клан 3 — Клан Рунных Кузнецов',
  'Клан 1 — Клан Скорпионов',
  'Клан 2 — Клан Барханов',
  'Клан 3 — Клан Костяных Шаманов'
]);

function isRecord(value) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

function readText(value, label, maxLength, fallback = '') {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== 'string') {
    throw new Error(`Поле «${label}» должно быть строкой.`);
  }

  if (value.length > maxLength) {
    throw new Error(
      `Поле «${label}» слишком длинное. Максимум: ${maxLength}.`
    );
  }

  return value.trim();
}

function normalizedText(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim();
}

function weaponName(element) {
  return normalizedText(
    element.querySelector('.aos-weapon-name')?.textContent
  );
}

function sameNames(first, second) {
  return (
    first.length === second.length &&
    first.every((name, index) => name === second[index])
  );
}

function readFormatVersion(record) {
  if (record._meta === undefined) return;

  if (!isRecord(record._meta)) {
    throw new Error('Поле _meta должно быть объектом.');
  }

  const version = record._meta.formatVersion;

  // Старый ростер без версии поддерживается.
  if (version === undefined) return;

  if (!Number.isInteger(version) || ![1, 2].includes(version)) {
    throw new Error(
      'Неподдерживаемая версия формата ростера.'
    );
  }
}

function readStakes(record) {
  const source = record.selectedStakes === undefined
    ? []
    : record.selectedStakes;

  if (!Array.isArray(source)) {
    throw new Error('Поле selectedStakes должно быть массивом.');
  }

  if (source.length > STAKES_LIST.length) {
    throw new Error('Слишком много записей Клятв.');
  }

  const ids = new Set();
  const families = new Set();
  let totalCost = 0;

  source.forEach(id => {
    if (typeof id !== 'string' || id.length > 120) {
      throw new Error('Некорректный идентификатор Клятвы.');
    }

    const stake = STAKES_LIST.find(item => item.id === id);

    if (!stake) {
      throw new Error(`Неизвестная Клятва: ${id}.`);
    }

    if (ids.has(id)) {
      throw new Error(`Клятва «${stake.name}» указана повторно.`);
    }

        // Проверяем семейство только тогда, когда оно явно
    // указано в каталоге. Отсутствующее поле не означает,
    // что все такие Клятвы относятся к одному семейству.
    const family = typeof stake.family === 'string'
      ? stake.family.trim()
      : '';

    if (family && families.has(family)) {
      throw new Error(
        `Выбрано несколько вариантов Клятвы «${stake.name}».`
      );
    }

    ids.add(id);

    if (family) {
      families.add(family);
    }

    totalCost += stake.cost;
  });

  if (totalCost > STAKES_BUDGET) {
    throw new Error(
      `Превышен бюджет Клятв: ${totalCost} / ${STAKES_BUDGET} МИ.`
    );
  }

  return [...ids];
}

function readArtifacts(record) {
  const source = record.artifacts === undefined
    ? []
    : record.artifacts;

  if (!Array.isArray(source)) {
    throw new Error('Поле artifacts должно быть массивом.');
  }

  if (source.length > MAX_UNITS) {
    throw new Error('Слишком много записей артефактов.');
  }

  return source.map((artifact, index) => {
    if (
      !isRecord(artifact) ||
      typeof artifact.id !== 'string' ||
      artifact.id.length > 120 ||
      !Number.isInteger(artifact.targetIdx)
    ) {
      throw new Error(
        `Некорректная запись артефакта #${index + 1}.`
      );
    }

    return {
      id: artifact.id,
      targetIdx: artifact.targetIdx
    };
  });
}

function buildClanCatalog(clan) {
  const article = DATABASE.find(item => item.title === clan);

  if (!article || typeof article.content !== 'string') {
    throw new Error('Выбранный клан не найден в каталоге.');
  }

  const template = document.createElement('template');
  template.innerHTML = article.content;

  const catalog = new Map();

  template.content.querySelectorAll('.aos-card').forEach(card => {
    const title = normalizedText(
      card.querySelector('.aos-title')?.textContent
    );

    if (!title) return;

    const matches = catalog.get(title) || [];
    matches.push(card);
    catalog.set(title, matches);
  });

  return catalog;
}

/**
 * Восстанавливает выбранное вооружение старого ростера.
 *
 * Поддерживает:
 * — полную исходную карточку;
 * — карточку с одним выбранным оружием.
 *
 * Неоднозначные и неизвестные наборы не угадываются.
 */
function restoreWeaponSelection(card, importedUnit, title) {
  const officialWeapons = [
    ...card.querySelectorAll('.aos-weapon-item')
  ];

  if (officialWeapons.length <= 1) {
    return { card, selectedWeapon: null };
  }

  if (typeof importedUnit.html !== 'string') {
    throw new Error(
      `«${title}»: нельзя определить выбранное вооружение. ` +
      'Пересоберите модель в билдере.'
    );
  }

  const template = document.createElement('template');
  template.innerHTML = importedUnit.html;

  const importedCards = template.content.querySelectorAll('.aos-card');

  if (importedCards.length !== 1) {
    throw new Error(
      `«${title}»: требуется одна исходная датакарта модели.`
    );
  }

  const importedNames = [
    ...importedCards[0].querySelectorAll('.aos-weapon-item')
  ].map(weaponName);

  const officialNames = officialWeapons.map(weaponName);

  if (sameNames(importedNames, officialNames)) {
    return { card, selectedWeapon: null };
  }

  if (importedNames.length !== 1 || !importedNames[0]) {
    throw new Error(
      `«${title}»: набор вооружения не распознан. ` +
      'Пересоберите модель в билдере.'
    );
  }

  const matchingIndexes = officialNames.reduce(
    (result, name, index) => {
      if (name === importedNames[0]) {
        result.push(index);
      }

      return result;
    },
    []
  );

  if (matchingIndexes.length !== 1) {
    throw new Error(
      `«${title}»: оружие отсутствует в каталоге ` +
      'или его выбор неоднозначен.'
    );
  }

  const selectedIndex = matchingIndexes[0];

  officialWeapons.forEach((weapon, index) => {
    if (index !== selectedIndex) {
      weapon.remove();
    }
  });

  // Аналогично существующему билдеру убираем разделитель
  // альтернативных вариантов только при выборе одного оружия.
  const divider = card.querySelector('div[style*="--accent"]');

  if (divider) {
    divider.remove();
  }

  const sectionTitle = card.querySelector('.aos-section-title');

  if (sectionTitle) {
    sectionTitle.textContent = 'Вооружение';
  }

  return {
    card,
    selectedWeapon: officialNames[selectedIndex]
  };
}

function restoreOfficialUnit(importedUnit, index, catalog) {
  if (!isRecord(importedUnit)) {
    throw new Error(`Модель #${index + 1}: требуется объект.`);
  }

  const title = normalizedText(
    readText(importedUnit.title, 'Название модели', 300)
  );

  if (!title) {
    throw new Error(`У модели #${index + 1} нет названия.`);
  }

  if (
    importedUnit.html !== undefined &&
    (
      typeof importedUnit.html !== 'string' ||
      importedUnit.html.length > MAX_CARD_HTML_LENGTH
    )
  ) {
    throw new Error(
      `«${title}»: некорректная или слишком большая датакарта.`
    );
  }

  const matches = catalog.get(title);

  if (!matches || matches.length === 0) {
    throw new Error(
      `«${title}» не найдена в официальном каталоге выбранного клана. ` +
      'Авторский контент будет загружаться через мастерскую.'
    );
  }

  if (matches.length !== 1) {
    throw new Error(
      `«${title}»: название неоднозначно в официальном каталоге.`
    );
  }

  const card = matches[0].cloneNode(true);

  const role = (
    card.querySelector('.aos-badge-role')?.textContent || ''
  ).trim();

  const costText =
    card.querySelector('.aos-badge-pts')?.textContent || '';

  const costMatch = costText.match(/(\d+)/);
  const cost = costMatch ? Number(costMatch[1]) : NaN;

  if (!role || !Number.isSafeInteger(cost) || cost < 0) {
    throw new Error(
      `«${title}»: не удалось прочитать класс или стоимость из каталога.`
    );
  }

  const restored = restoreWeaponSelection(
    card,
    importedUnit,
    title
  );

  return {
    title,
    uniqueKey: restored.selectedWeapon
      ? `${title} (${restored.selectedWeapon})`
      : title,
    role,
    cost,
    html: restored.card.outerHTML
  };
}

/**
 * Возвращает новый проверенный объект.
 * Текущий ростер и исходный импорт не изменяет.
 */
export function normalizeOfficialRoster(record) {
  if (!isRecord(record)) {
    throw new Error('Требуется объект ростера.');
  }

  readFormatVersion(record);

  const name = readText(
    record.name,
    'Название ростера',
    200,
    'Мой Ростер'
  ) || 'Мой Ростер';

  const clan = readText(record.clan, 'Клан', 200);

  if (!CLAN_NAMES.has(clan)) {
    throw new Error('Выберите существующий официальный клан.');
  }

  const battleplanId = readText(
    record.battleplanId,
    'Батлплан',
    100
  );

  if (
    battleplanId &&
    !/^battleplan-[1-6]$/.test(battleplanId)
  ) {
    throw new Error('Неизвестный официальный батлплан.');
  }

  if (
    !Array.isArray(record.units) ||
    record.units.length === 0 ||
    record.units.length > MAX_UNITS
  ) {
    throw new Error(
      `В ростере должно быть от 1 до ${MAX_UNITS} моделей.`
    );
  }

  let totalHtmlLength = 0;

  record.units.forEach(unit => {
    if (typeof unit?.html === 'string') {
      totalHtmlLength += unit.html.length;
    }
  });

  if (totalHtmlLength > MAX_TOTAL_HTML_LENGTH) {
    throw new Error('Суммарный объём датакарт слишком большой.');
  }

  const catalog = buildClanCatalog(clan);

  const next = {
    name,
    clan,
    battleplanId,
    selectedStakes: readStakes(record),
    artifacts: readArtifacts(record),
    units: record.units.map((unit, index) =>
      restoreOfficialUnit(unit, index, catalog)
    )
  };

  // Проверяем по восстановленным официальным классам моделей,
  // а не по role из импортированного файла.
  const artifactCheck = validateRosterArtifacts(next);

  if (!artifactCheck.ok) {
    throw new Error(artifactCheck.errors.join(' '));
  }

  return next;
}