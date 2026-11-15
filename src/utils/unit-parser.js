// src/utils/unit-parser.js
//
// Общие средства чтения датакарт.
//
// Совместимость:
// — parseUnitCard сохраняет прежнее поведение;
// — parseCost сохраняет прежнее поведение;
// — extractUnitDetails сохраняет прежнее поведение.
//
// Для новых онлайн-модулей:
// — extractStrictUnitDetails не подставляет характеристики;
// — неизвестные значения возвращаются как null;
// — HTML разбирается в template и не вставляется в страницу;
// — артефакты здесь НЕ начисляются.

export function parseUnitCard(cardHtml) {
  const tmp = document.createElement('div');
  tmp.innerHTML = cardHtml;

  return {
    title:
      tmp.querySelector('.aos-title')?.textContent ||
      'Отряд',

    role:
      tmp.querySelector('.aos-badge-role')?.textContent ||
      'Базовый',

    cost: parseCost(
      tmp.querySelector('.aos-badge-pts')?.textContent || ''
    ),

    hp: extractHp(tmp),

    html: cardHtml
  };
}

export function parseCost(raw) {
  if (!raw) return 0;

  const match = String(raw).match(/(\d+(?:[.,]\d+)?)/);

  if (!match) return 0;

  return Math.round(
    parseFloat(match[1].replace(',', '.'))
  );
}

// Прежнее поведение для существующих потребителей.
// Новый онлайн-стол не должен использовать эту функцию
// как источник проверенного максимального ХП.
function extractHp(tmp) {
  const aosBoxes = tmp.querySelectorAll('.aos-stat-box');

  for (const box of aosBoxes) {
    const label = (
      box.querySelector('.aos-stat-label')?.textContent || ''
    ).trim().toUpperCase();

    if (
      label === 'ХП' ||
      label === 'HP' ||
      label === 'WOUNDS'
    ) {
      const value = parseInt(
        (
          box.querySelector('.aos-stat-value')?.textContent || ''
        ).replace(/[^\d-]/g, '')
      );

      if (!isNaN(value)) return value;
    }
  }

  const statBoxes = tmp.querySelectorAll('.stat-box');

  for (const box of statBoxes) {
    const label = (
      box.querySelector('.stat-label')?.textContent || ''
    ).trim().toUpperCase();

    if (
      label === 'ХП' ||
      label === 'ЗДОРОВЬЕ' ||
      label === 'HP' ||
      label === 'WOUNDS'
    ) {
      const value = parseInt(
        (
          box.querySelector('.stat-value')?.textContent || ''
        ).replace(/[^\d-]/g, '')
      );

      if (!isNaN(value)) return value;
    }
  }

  return 6;
}

/**
 * Прежний формат подробностей.
 * Сохранён для существующих потребителей.
 */
export function extractUnitDetails(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';

  const stats = {};

  tmp.querySelectorAll('.aos-stat-box').forEach(box => {
    const label = box.querySelector('.aos-stat-label')
      ?.textContent?.trim();

    const value = box.querySelector('.aos-stat-value')
      ?.textContent?.trim();

    if (label && value) {
      stats[label] = value;
    }
  });

  const weapons = Array.from(
    tmp.querySelectorAll('.aos-weapon-item')
  ).map(weapon => ({
    name: weapon.querySelector('.aos-weapon-name')
      ?.textContent?.trim() || '',

    type: weapon.querySelector('.aos-weapon-type')
      ?.textContent?.trim() || '',

    stats: Array.from(
      weapon.querySelectorAll('.aos-weapon-stats span')
    ).map(span => span.textContent.trim())
  }));

  const abilities = Array.from(
    tmp.querySelectorAll('.aos-ability')
  ).map(ability => ({
    title: ability.querySelector('.aos-ability-title')
      ?.textContent?.trim() || '',

    text: ability.querySelector('.aos-ability-text')
      ?.textContent?.trim() || ''
  }));

  return { stats, weapons, abilities };
}

/* ==========================================================================
   Строгое чтение для онлайн-стола
   ========================================================================== */

function cleanText(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim();
}

function strictInteger(value) {
  const text = cleanText(value);

  // Не извлекаем случайное число из "6/8", "6 (+2)" или "D6".
  // Такой формат должен быть обработан явно, а не угадан.
  if (!/^[+-]?\d+$/.test(text)) return null;

  const number = Number(text);

  return Number.isSafeInteger(number)
    ? number
    : null;
}

function statKey(label) {
  const text = cleanText(label)
    .toUpperCase()
    .replace(/Ё/g, 'Е');

  if (
    /^(ХП|HP|WOUNDS|ЗДОРОВЬЕ)$/.test(text)
  ) {
    return 'hp';
  }

  if (
    /^(ДВИЖЕНИЕ|ДВИЖ|ДВ|MOVE|MOVEMENT|SPEED)$/.test(text)
  ) {
    return 'move';
  }

  if (
    /^(БРОНЯ|БРОНЬ|БРОН|ARMOR|ARMOUR)$/.test(text)
  ) {
    return 'armor';
  }

  return null;
}

/**
 * Читает исходные характеристики без запасных значений.
 *
 * Поддерживает:
 * — .aos-stat-box / .aos-stat-label / .aos-stat-value;
 * — .stat-box / .stat-label / .stat-value.
 *
 * Артефакты не начисляет.
 * Полученные строки нельзя вставлять через innerHTML.
 *
 * @returns {{
 *   stats: { hp: number|null, move: number|null, armor: number|null },
 *   weapons: Array,
 *   abilities: Array,
 *   errors: string[]
 * }}
 */
export function extractStrictUnitDetails(html) {
  const template = document.createElement('template');
  template.innerHTML = String(html ?? '');

  const root = template.content;

  const stats = {
    hp: null,
    move: null,
    armor: null
  };

  const candidates = {
    hp: [],
    move: [],
    armor: []
  };

  const errors = [];

  root.querySelectorAll('.aos-stat-box, .stat-box')
    .forEach(box => {
      const label = box.querySelector(
        '.aos-stat-label, .stat-label'
      )?.textContent;

      const key = statKey(label);

      if (!key) return;

      const raw = box.querySelector(
        '.aos-stat-value, .stat-value'
      )?.textContent;

      candidates[key].push(strictInteger(raw));
    });

  for (const key of ['hp', 'move', 'armor']) {
    const values = candidates[key];

    if (!values.length) {
      errors.push(`Не найдена характеристика: ${key}.`);
      continue;
    }

    if (values.some(value => value === null)) {
      errors.push(
        `Неподдерживаемый формат характеристики: ${key}.`
      );
      continue;
    }

    const unique = [...new Set(values)];

    if (unique.length !== 1) {
      errors.push(
        `В карточке несколько разных значений: ${key}.`
      );
      continue;
    }

    const value = unique[0];

    if (key === 'hp' && value <= 0) {
      errors.push('Максимальное ХП должно быть больше нуля.');
      continue;
    }

    stats[key] = value;
  }

  const weapons = [
    ...root.querySelectorAll('.aos-weapon-item')
  ].map(weapon => ({
    name: cleanText(
      weapon.querySelector('.aos-weapon-name')?.textContent
    ),

    type: cleanText(
      weapon.querySelector('.aos-weapon-type')?.textContent
    ),

    stats: cleanText(
      weapon.querySelector('.aos-weapon-stats')?.textContent
    )
  }));

  const abilities = [
    ...root.querySelectorAll('.aos-ability')
  ].map(ability => ({
    title: cleanText(
      ability.querySelector('.aos-ability-title')?.textContent
    ),

    text: cleanText(
      ability.querySelector('.aos-ability-text')?.textContent
    )
  }));

  return {
    stats,
    weapons,
    abilities,
    errors
  };
}