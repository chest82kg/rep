// src/virtual-table/workshop-maps.js
//
// Загрузка карты из локальной мастерской.
//
// Не пишет напрямую в основное сохранение партии.
// Местность, зоны и маркеры меняются через commit стола.
//
// Не изменяет:
// — армии и модели;
// — раунд;
// — памятку сценария;
// — КТ и счёт при обычной загрузке карты.
//
// КТ карты загружаются отдельным подтверждаемым действием.
// При этом счёт сохраняется, контроль становится нейтральным.

import { validateTerrain } from './terrain.js';

import {
  validWorkshopTerrain
} from '../workshop/terrain-editor.js';

import {
  validDeployment
} from '../workshop/deployment.js';

import {
  validMapObjectives
} from '../workshop/objectives.js';

import {
  replaceObjectivesFromMap
} from './objectives.js';

import {
  validMapMarkers
} from '../workshop/markers.js';

const LIBRARY_KEY = 'mt_workshop_library_v1';

const MAX_RAW_LENGTH = 4 * 1024 * 1024;
const MAX_MAPS = 200;

const OTHER_LAYERS = [
  'deployment',
  'objectives',
  'markers',
  'decorations'
];

function isRecord(value) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

function validDate(value) {
  return typeof value === 'string' &&
    Number.isFinite(Date.parse(value));
}

function validMap(map) {
  return Boolean(
    isRecord(map) &&
    map.format === 'mt-map' &&
    map.version === 1 &&
    typeof map.id === 'string' &&
    map.id.length > 0 &&
    map.id.length <= 120 &&
    typeof map.name === 'string' &&
    map.name.trim().length > 0 &&
    map.name.length <= 120 &&
    ['draft', 'test-ready'].includes(map.status) &&
    Number.isSafeInteger(map.revision) &&
    map.revision >= 1 &&
    validDate(map.createdAt) &&
    validDate(map.updatedAt) &&
    isRecord(map.board) &&
    map.board.width === 14 &&
    map.board.height === 14 &&
    isRecord(map.layers) &&
    validWorkshopTerrain(map.layers.terrain) &&
    validDeployment(map.layers.deployment) &&
    validMapObjectives(map.layers.objectives) &&
    validMapMarkers(map.layers.markers) &&
    OTHER_LAYERS
      .filter(name =>
        name !== 'deployment' &&
        name !== 'objectives' &&
        name !== 'markers'
      )
      .every(name =>
        Array.isArray(map.layers[name]) &&
        map.layers[name].length === 0
      ) &&
    Object.keys(map.layers).every(name =>
      name === 'terrain' || OTHER_LAYERS.includes(name)
    )
  );
}

function readLibrary() {
  const raw = localStorage.getItem(LIBRARY_KEY);

  if (raw === null) {
    return { raw, maps: [] };
  }

  if (raw.length > MAX_RAW_LENGTH) {
    throw new Error(
      'Библиотека превышает поддерживаемый размер.'
    );
  }

  const library = JSON.parse(raw);

  if (
    !isRecord(library) ||
    library.format !== 'mt-workshop-library' ||
    library.version !== 1 ||
    !Array.isArray(library.maps) ||
    library.maps.length > MAX_MAPS
  ) {
    throw new Error(
      'Неподдерживаемый формат библиотеки мастерской.'
    );
  }

  const ids = new Set();

  for (const map of library.maps) {
    if (!validMap(map) || ids.has(map.id)) {
      throw new Error(
        'В библиотеке есть повреждённая ' +
        'или неподдерживаемая карта. ' +
        'Откройте мастерскую и проверьте библиотеку.'
      );
    }

    ids.add(map.id);
  }

  return { raw, maps: library.maps };
}

/**
 * Копируем поддерживаемую геометрию местности.
 *
 * cells — локальные координаты относительно tile.x/y.
 * Идентификаторы обновляются, чтобы прежний выбор тайла
 * не привязался к объекту другой карты.
 */
function prepareTerrain(map) {
  const terrain = map.layers.terrain.map(tile => ({
    id: crypto.randomUUID(),
    type: tile.type,
    x: tile.x,
    y: tile.y,
    height: tile.height,
    cells: tile.cells.map(cell => ({
      x: cell.x,
      y: cell.y
    }))
  }));

  if (!validateTerrain(terrain)) {
    throw new Error(
      'Местность карты не принимается валидатором стола.'
    );
  }

  return terrain;
}

export function initWorkshopMaps({
  getState,
  commit,
  assertWritable,
  message
}) {
  if (document.getElementById('vt-workshop-maps')) {
    return;
  }

  const panel = document.createElement('section');

  panel.id = 'vt-workshop-maps';
  panel.className = 'vt-load-panel';

  panel.setAttribute(
    'aria-label',
    'Карта из мастерской'
  );

  // Только статическая разметка приложения.
  panel.innerHTML = `
    <div class="vt-load-field">
      <label for="vt-workshop-map-select">
        Карта локальной мастерской
      </label>

      <select id="vt-workshop-map-select">
        <option value="">Загрузка списка…</option>
      </select>
    </div>

    <button type="button"
            id="vt-workshop-map-load"
            class="builder-action-btn primary">
      Загрузить карту
    </button>

    <button type="button"
            id="vt-workshop-objectives-load"
            class="builder-action-btn">
      Загрузить КТ из карты
    </button>

    <button type="button"
            id="vt-workshop-map-refresh"
            class="builder-action-btn">
      Обновить карты
    </button>

    <a href="workshop.html"
       class="builder-action-btn">
      Открыть мастерскую
    </a>
  `;

  document.querySelector('.vt-load-panel').after(panel);

  const help = document.createElement('p');
  help.className = 'vt-notice';

  help.textContent =
    '«Загрузить карту» заменяет местность, зоны расстановки ' +
    'и маркеры-памятки текущей партии; ' +
    'сначала загрузите хотя бы одну армию. ' +
    'Модели остаются на своих клетках. ' +
    'Памятка сценария не меняется и может описывать другую карту. ' +
    'Зоны и маркеры не ограничивают перемещение ' +
    'и не создают игровых эффектов. ' +
    '«Загрузить КТ из карты» — отдельное действие: ' +
    'оно заменяет точки партии, задаёт нейтральный контроль ' +
    'и сохраняет счёт. Используются только сохранённые ' +
    'в библиотеке изменения карты.';

  panel.after(help);

  const select = panel.querySelector(
    '#vt-workshop-map-select'
  );

  const loadButton = panel.querySelector(
    '#vt-workshop-map-load'
  );

  const objectivesButton = panel.querySelector(
    '#vt-workshop-objectives-load'
  );

  const refreshButton = panel.querySelector(
    '#vt-workshop-map-refresh'
  );

  let listedRaw = null;
  let maps = [];

  function refresh({ announce = false } = {}) {
    const previousId = select.value;

    try {
      const library = readLibrary();

      listedRaw = library.raw;
      maps = library.maps;

      select.replaceChildren();

      if (!maps.length) {
        const option = document.createElement('option');

        option.value = '';
        option.textContent = 'Нет сохранённых карт';

        select.append(option);
      } else {
        for (const map of maps) {
          const option = document.createElement('option');

          const status = map.status === 'test-ready'
            ? 'Готово к тесту'
            : 'Черновик';

          option.value = map.id;

          option.textContent =
            `${map.name} · ${status} · ` +
            `ред. ${map.revision} · ` +
            `${map.layers.terrain.length} тайлов`;

          select.append(option);
        }

        if (maps.some(map => map.id === previousId)) {
          select.value = previousId;
        }
      }

      loadButton.disabled = maps.length === 0;
      objectivesButton.disabled = maps.length === 0;

      if (announce) {
        message('Список карт мастерской обновлён.');
      }

      return true;
    } catch (error) {
      maps = [];
      listedRaw = null;

      const option = document.createElement('option');

      option.value = '';
      option.textContent = 'Библиотека недоступна';

      select.replaceChildren(option);

      loadButton.disabled = true;
      objectivesButton.disabled = true;

      message(
        `Не удалось прочитать карты: ${error.message}`,
        true
      );

      return false;
    }
  }

  refreshButton.addEventListener('click', () => {
    refresh({ announce: true });
  });

  /* ========================================================================
     Местность, зоны и маркеры
     ======================================================================== */

  loadButton.addEventListener('click', () => {
    try {
      assertWritable();

      if (!getState()) {
        throw new Error(
          'Сначала загрузите хотя бы одну армию на стол.'
        );
      }

      const id = select.value;

      if (!id) {
        throw new Error('Выберите карту.');
      }

      const library = readLibrary();

      if (library.raw !== listedRaw) {
        refresh();

        throw new Error(
          'Библиотека изменилась. Список обновлён. ' +
          'Проверьте выбор карты и повторите загрузку.'
        );
      }

      const map = library.maps.find(
        item => item.id === id
      );

      if (!map) {
        throw new Error(
          'Выбранная карта больше не найдена.'
        );
      }

      // Подготовка и проверки до изменения партии.
      const terrain = prepareTerrain(map);

      const deployment = map.layers.deployment.map(cell => ({
        x: cell.x,
        y: cell.y,
        side: cell.side
      }));

      const mapMarkers = map.layers.markers.map(marker => ({
        id: crypto.randomUUID(),
        title: marker.title,
        note: marker.note,
        x: marker.x,
        y: marker.y
      }));

      if (!validDeployment(deployment)) {
        throw new Error(
          'Зоны расстановки карты не прошли проверку.'
        );
      }

      if (!validMapMarkers(mapMarkers)) {
        throw new Error(
          'Маркеры карты не прошли проверку.'
        );
      }

      const currentCount =
        getState().terrain?.length || 0;

      const draftWarning = map.status === 'draft'
        ? '\n\nКарта помечена как черновик.'
        : '';

      const emptyWarning = terrain.length === 0
        ? '\n\nВ карте нет местности: ' +
          'текущие тайлы будут удалены.'
        : '';

      const zonesWarning = deployment.length === 0
        ? '\n\nВ карте нет зон: ' +
          'текущие зоны расстановки будут очищены.'
        : `\n\nБудет загружено ${deployment.length} клеток зон. ` +
          'Они служат только визуальной памяткой ' +
          'и не ограничивают модели.';

      const objectivesWarning =
        map.layers.objectives.length > 0
          ? '\n\nВ документе карты есть КТ: ' +
            `${map.layers.objectives.length}. ` +
            'Эта кнопка их не переносит. ' +
            'Для них используйте отдельную команду ' +
            '«Загрузить КТ из карты». ' +
            'Текущие КТ партии, их контроль и счёт сохранятся.'
          : '';

      const markersWarning = mapMarkers.length > 0
        ? '\n\nТекущие маркеры-памятки будут заменены. ' +
          `Будет загружено: ${mapMarkers.length}. ` +
          'Они не создают игровых эффектов.'
        : '\n\nВ карте нет маркеров-памяток: ' +
          'текущие маркеры партии будут очищены.';

      const scenarioWarning = getState().scenario
        ? '\n\nПамятка сценария и её снимок останутся прежними. ' +
          'После замены они могут не совпадать с текущим полем.'
        : '';

      if (!confirm(
        `Загрузить карту «${map.name}» ` +
        `(редакция ${map.revision})?\n\n` +

        `Текущих тайлов: ${currentCount}. ` +
        `Будет загружено: ${terrain.length}.\n\n` +

        'Местность, зоны расстановки и маркеры-памятки ' +
        'партии будут заменены. ' +
        'Армии, позиции моделей, ХП, активации, направления, ' +
        'усталость, заметки и раунд сохранятся. ' +
        'КТ и счёт не изменятся. ' +
        'Модели автоматически не перемещаются.\n\n' +

        'Замену можно отменить общей историей стола, ' +
        'пока она доступна в текущей вкладке.' +

        draftWarning +
        emptyWarning +
        zonesWarning +
        objectivesWarning +
        markersWarning +
        scenarioWarning
      )) {
        return;
      }

      // Повторные проверки после подтверждения.
      assertWritable();

      if (
        localStorage.getItem(LIBRARY_KEY) !== library.raw
      ) {
        refresh();

        throw new Error(
          'Во время подтверждения библиотека изменилась. ' +
          'Загрузка отменена. Проверьте карту ' +
          'и повторите действие.'
        );
      }

      commit(next => {
        next.terrain = terrain;
        next.deployment = deployment;
        next.mapMarkers = mapMarkers;
      },
      `Загружена карта «${map.name}», ` +
      `редакция ${map.revision}: местность, зоны и маркеры. ` +
      'Модели, раунд, памятка сценария, КТ и счёт не изменены. ' +
      'Зоны и маркеры не создают автоматических игровых эффектов.');
    } catch (error) {
      message(
        `Карта не загружена: ${error.message}`,
        true
      );
    }
  });

  /* ========================================================================
     Отдельная загрузка контрольных точек
     ======================================================================== */

  objectivesButton.addEventListener('click', () => {
    try {
      const id = select.value;

      if (!id) {
        throw new Error('Выберите карту.');
      }

      const library = readLibrary();

      if (library.raw !== listedRaw) {
        refresh();

        throw new Error(
          'Библиотека изменилась. Список обновлён. ' +
          'Проверьте выбранную карту ' +
          'и повторите действие.'
        );
      }

      const map = library.maps.find(
        item => item.id === id
      );

      if (!map) {
        throw new Error(
          'Выбранная карта больше не найдена.'
        );
      }

      const points = map.layers.objectives.map(point => ({
        id: point.id,
        title: point.title,
        x: point.x,
        y: point.y
      }));

      if (!validMapObjectives(points)) {
        throw new Error(
          'КТ выбранной карты не прошли проверку.'
        );
      }

      const draftWarning = map.status === 'draft'
        ? '\n\nКарта помечена как черновик.'
        : '';

      const emptyWarning = points.length === 0
        ? '\n\nВ карте нет КТ: ' +
          'текущие точки партии будут удалены.'
        : '';

      if (!confirm(
        `Загрузить КТ карты «${map.name}» ` +
        `(редакция ${map.revision})?\n\n` +

        `Точек в карте: ${points.length}.\n\n` +

        'Все текущие КТ партии будут заменены. ' +
        'Контроль всех загруженных точек ' +
        'станет нейтральным.\n\n' +

        'Счёт обеих сторон сохранится. ' +
        'Армии, модели, раунд, местность, зоны, ' +
        'маркеры и памятка сценария не изменятся.\n\n' +

        'Замену можно отменить общей историей стола, ' +
        'пока она доступна в текущей вкладке.' +

        draftWarning +
        emptyWarning
      )) {
        return;
      }

      if (
        localStorage.getItem(LIBRARY_KEY) !== library.raw
      ) {
        refresh();

        throw new Error(
          'Во время подтверждения библиотека изменилась. ' +
          'Загрузка КТ отменена. Проверьте карту ' +
          'и повторите действие.'
        );
      }

      // Модуль миссии самостоятельно проверяет
      // свою ожидаемую строку перед записью.
      const saved = replaceObjectivesFromMap(
        points,
        map.name
      );

      if (!saved) {
        message(
          'КТ не загружены. Подробности — ' +
          'в панели «Задачи миссии».',
          true
        );

        return;
      }

      message(
        `Загружены КТ карты «${map.name}», ` +
        `редакция ${map.revision}: ${points.length}. ` +
        'Контроль — нейтральный. Счёт сохранён. ' +
        'Поле, модели и памятка сценария не изменены.'
      );
    } catch (error) {
      message(
        `КТ не загружены: ${error.message}`,
        true
      );
    }
  });

  /* ========================================================================
     Обновление списка
     ======================================================================== */

  window.addEventListener('storage', event => {
    if (
      event.storageArea === localStorage &&
      (
        event.key === LIBRARY_KEY ||
        event.key === null
      )
    ) {
      refresh();
    }
  });

  window.addEventListener('focus', () => {
    refresh();
  });

  refresh();
}