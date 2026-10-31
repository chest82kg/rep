// src/virtual-table/backup-validation.js
//
// Дополнительная проверка внешней резервной копии.
//
// Не меняет данные и не проверяет игровые правила.
// Старые локальные сохранения этим модулем не проверяются.
//
// Основные связи и вложенные игровые слои проверяются
// штатным validateState, переданным из index.js.
//
// Метаданные ростеров и артефактов сохраняются целиком.
// Их внутреннюю схему здесь не подменяем предположениями:
// ограничиваем размер, глубину и типы JSON.

const MAX_MODELS_PER_SIDE = 200;
const MAX_STRING_LENGTH = 100000;
const MAX_ARRAY_LENGTH = 10000;
const MAX_OBJECT_KEYS = 300;
const MAX_DEPTH = 32;
const MAX_NODES = 200000;

function record(value) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

function fail(path, text) {
  throw new Error(`${path}: ${text}`);
}

function text(value, path, max, nonempty = false) {
  if (
    typeof value !== 'string' ||
    value.length > max ||
    (nonempty && !value.trim())
  ) {
    fail(
      path,
      `ожидается ${nonempty ? 'непустая ' : ''}` +
      `строка длиной не более ${max} символов`
    );
  }
}

function knownKeys(value, allowed, path) {
  if (!record(value)) {
    fail(path, 'ожидается объект');
  }

  const unexpected = Object.keys(value).find(
    key => !allowed.includes(key)
  );

  if (unexpected !== undefined) {
    // Не включаем произвольное имя поля в сообщение:
    // само имя тоже может оказаться очень большим.
    fail(path, 'обнаружено неподдерживаемое поле');
  }
}

/**
 * Ограничивает техническую сложность всего дерева.
 * Ничего не удаляет и не преобразует.
 */
function checkJSONTree(root) {
  let nodes = 0;

  function visit(value, path, depth) {
    nodes++;

    if (nodes > MAX_NODES) {
      fail('Партия', 'слишком много вложенных значений');
    }

    if (depth > MAX_DEPTH) {
      fail(path, 'слишком глубокая вложенность');
    }

    if (value === null || typeof value === 'boolean') {
      return;
    }

    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        fail(path, 'число должно быть конечным');
      }

      return;
    }

    if (typeof value === 'string') {
      text(value, path, MAX_STRING_LENGTH);
      return;
    }

    if (Array.isArray(value)) {
      if (value.length > MAX_ARRAY_LENGTH) {
        fail(path, 'слишком большой массив');
      }

      value.forEach((item, index) => {
        visit(item, `${path}[${index}]`, depth + 1);
      });

      return;
    }

    if (!record(value)) {
      fail(path, 'неподдерживаемый тип данных');
    }

    const keys = Object.keys(value);

    if (keys.length > MAX_OBJECT_KEYS) {
      fail(path, 'слишком много полей');
    }

    keys.forEach((key, index) => {
      if (
        key.length > 200 ||
        ['__proto__', 'prototype', 'constructor'].includes(key)
      ) {
        fail(path, 'неподдерживаемое имя поля');
      }

      visit(
        value[key],
        `${path}.поле${index + 1}`,
        depth + 1
      );
    });
  }

  visit(root, 'Партия', 0);
}

function checkRoster(roster, path) {
  if (roster === null || roster === undefined) {
    return;
  }

  if (
    !record(roster) ||
    !Array.isArray(roster.units) ||
    roster.units.length < 1 ||
    roster.units.length > MAX_MODELS_PER_SIDE
  ) {
    fail(
      path,
      `ожидается ростер с 1–${MAX_MODELS_PER_SIDE} моделями`
    );
  }

  // Эти поля участвуют в отображении.
  // Остальные метаданные сохраняются без изменений.
  for (const key of ['name', 'clan']) {
    if (Object.hasOwn(roster, key)) {
      text(roster[key], `${path}.${key}`, 2000);
    }
  }

  roster.units.forEach((unit, index) => {
    const unitPath = `${path}.units[${index}]`;

    if (!record(unit)) {
      fail(unitPath, 'ожидается объект модели');
    }

    for (const key of ['title', 'uniqueKey', 'role']) {
      if (Object.hasOwn(unit, key)) {
        text(unit[key], `${unitPath}.${key}`, 2000);
      }
    }

    if (Object.hasOwn(unit, 'html')) {
      text(unit.html, `${unitPath}.html`, MAX_STRING_LENGTH);
    }
  });
}

function checkStats(stats, path) {
  knownKeys(stats, ['hp', 'move', 'armor'], path);

  for (const key of ['hp', 'move', 'armor']) {
    if (!Object.hasOwn(stats, key)) {
      fail(path, `отсутствует характеристика ${key}`);
    }
  }

  // Численные условия проверяет штатный validateState.
  // Новых ограничений на характеристики здесь нет.
}

function checkUnits(units) {
  if (
    !Array.isArray(units) ||
    units.length > MAX_MODELS_PER_SIDE * 2
  ) {
    fail('Модели', 'неподдерживаемое количество моделей');
  }

  units.forEach((unit, index) => {
    const path = `Модель ${index + 1}`;

    knownKeys(unit, [
      'id',
      'side',
      'rosterIndex',
      'title',
      'uniqueKey',
      'role',
      'base',
      'stats',
      'weapons',
      'abilities',
      'artifact',
      'currentHp',
      'activated',
      'facing',
      'fatigued',
      'note',
      'position'
    ], path);

    text(unit.id, `${path}.id`, 120, true);

    for (const key of ['title', 'uniqueKey', 'role']) {
      text(unit[key], `${path}.${key}`, 2000);
    }

    checkStats(unit.base, `${path}.base`);
    checkStats(unit.stats, `${path}.stats`);

    if (Object.hasOwn(unit, 'note')) {
      text(unit.note, `${path}.note`, 2000);
    }

    if (
      Object.hasOwn(unit, 'artifact') &&
      unit.artifact !== null &&
      !record(unit.artifact)
    ) {
      fail(`${path}.artifact`, 'ожидается объект или null');
    }

    if (!Array.isArray(unit.weapons)) {
      fail(`${path}.weapons`, 'ожидается массив');
    }

    unit.weapons.forEach((weapon, weaponIndex) => {
      const weaponPath =
        `${path}.оружие ${weaponIndex + 1}`;

      knownKeys(
        weapon,
        ['name', 'type', 'stats'],
        weaponPath
      );

      for (const key of ['name', 'type', 'stats']) {
        text(
          weapon[key],
          `${weaponPath}.${key}`,
          MAX_STRING_LENGTH
        );
      }
    });

    if (!Array.isArray(unit.abilities)) {
      fail(`${path}.abilities`, 'ожидается массив');
    }

    unit.abilities.forEach((ability, abilityIndex) => {
      const abilityPath =
        `${path}.способность ${abilityIndex + 1}`;

      knownKeys(
        ability,
        ['title', 'text'],
        abilityPath
      );

      for (const key of ['title', 'text']) {
        text(
          ability[key],
          `${abilityPath}.${key}`,
          MAX_STRING_LENGTH
        );
      }
    });

    if (unit.position !== null) {
      knownKeys(
        unit.position,
        ['x', 'y', 'surfaceId'],
        `${path}.position`
      );
    }
  });
}

function checkLayerIds(items, path) {
  // Отсутствующий слой может быть допустим
  // для совместимой старой партии.
  if (items === undefined || items === null) {
    return;
  }

  if (!Array.isArray(items)) {
    fail(path, 'ожидается массив');
  }

  const ids = new Set();

  items.forEach((item, index) => {
    if (!record(item)) {
      fail(`${path}[${index}]`, 'ожидается объект');
    }

    text(item.id, `${path}[${index}].id`, 120, true);

    if (ids.has(item.id)) {
      fail(path, 'повторяется идентификатор');
    }

    ids.add(item.id);
  });
}

/**
 * Возвращает true либо выбрасывает ошибку с причиной.
 * Используется только резервной копией.
 */
export function validateBackupTable(table, validateState) {
  checkJSONTree(table);

  knownKeys(table, [
    'version',
    'id',
    'round',
    'board',
    'roster',
    'opponentRoster',
    'terrain',
    'deployment',
    'mapMarkers',
    'scenario',
    'units'
  ], 'Партия');

  text(table.id, 'Партия.id', 120, true);

  knownKeys(
    table.board,
    ['width', 'height'],
    'Поле'
  );

  checkRoster(table.roster, 'Ростер А');
  checkRoster(table.opponentRoster, 'Ростер Б');

  checkUnits(table.units);

  checkLayerIds(table.terrain, 'Местность');
  checkLayerIds(table.mapMarkers, 'Маркеры');

  // Здесь повторно используются действующие валидаторы:
  // — раунда;
  // — местности;
  // — зон;
  // — маркеров;
  // — памятки сценария;
  // — моделей и связей с ростерами;
  // — занятости клеток.
  if (!validateState(table)) {
    fail(
      'Партия',
      'не прошли проверку структура, игровые слои ' +
      'или связи моделей с ростерами'
    );
  }

  return true;
}