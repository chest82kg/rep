// src/workshop/index.js
//
// Независимая локальная библиотека документов карт.
// Firebase, ростеры и сохранения партий не используются.
//
// Первый пакет:
// — пустая карта 14 × 14;
// — свойства и версии документа;
// — создание, сохранение, копирование и удаление;
// — поиск;
// — защита от записи поверх внешнего изменения.
//
// Редактирование слоёв добавляется следующим пакетом.

import {
  initWorkshopTerrainEditor,
  validWorkshopTerrain
} from './terrain-editor.js';

import { initMapTransfer } from './map-transfer.js';

import {
  initDeploymentEditor,
  validDeployment
} from './deployment.js';

import {
  initMapObjectives,
  validMapObjectives
} from './objectives.js';

import {
  initMapMarkers,
  validMapMarkers
} from './markers.js';

import { initCustomUnits } from './custom-units.js';
import { initScenarios } from './scenarios.js';


const STORAGE_KEY = 'mt_workshop_library_v1';

const MAX_MAPS = 200;
const MAX_RAW_LENGTH = 4 * 1024 * 1024;
const SIZE = 14;
const LETTERS = 'ABCDEFGHIJKLMN';

const LAYER_NAMES = [
  'terrain',
  'deployment',
  'objectives',
  'markers',
  'decorations'
];

const SECTIONS = ['maps', 'units', 'scenarios', 'library'];

const $ = id => document.getElementById(id);
const clone = value => JSON.parse(JSON.stringify(value));

let library = {
  format: 'mt-workshop-library',
  version: 1,
  maps: []
};

let expectedRaw = null;
let writeLocked = false;

let currentMap = null;
let dirty = false;
let terrainEditor = null;
let deploymentEditor = null;
let objectivesEditor = null;
let markersEditor = null;

function message(text, error = false) {
  $('ws-message').textContent = text;
  $('ws-message').classList.toggle('is-error', error);
}

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

function validId(value) {
  return typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 120;
}

function newId() {
  return crypto.randomUUID();
}

function dateLabel(value) {
  return new Date(value).toLocaleString('ru-RU');
}

function statusLabel(status) {
  return status === 'test-ready'
    ? 'Готово к тесту'
    : 'Черновик';
}

/**
 * Пока поддерживаются только пустые слои.
 * Если новая версия редактора запишет заполненные слои,
 * старая версия не должна молча удалить их при сохранении.
 */
/**
 * Проверяет документ карты текущей версии.
 *
 * Местность поддерживает поклеточное редактирование.
 * Остальные слои пока должны оставаться пустыми:
 * неизвестные данные не удаляются молча.
 */
function validateMap(record) {
  return Boolean(
    isRecord(record) &&
    record.format === 'mt-map' &&
    record.version === 1 &&
    validId(record.id) &&
    typeof record.name === 'string' &&
    record.name.trim().length > 0 &&
    record.name.length <= 120 &&
    ['draft', 'test-ready'].includes(record.status) &&
    Number.isSafeInteger(record.revision) &&
    record.revision >= 1 &&
    validDate(record.createdAt) &&
    validDate(record.updatedAt) &&
    isRecord(record.board) &&
    record.board.width === SIZE &&
    record.board.height === SIZE &&
    isRecord(record.layers) &&
    validWorkshopTerrain(record.layers.terrain) &&
    validDeployment(record.layers.deployment) &&
    validMapObjectives(record.layers.objectives) &&
    validMapMarkers(record.layers.markers) &&
    LAYER_NAMES
      .filter(name =>
        name !== 'terrain' &&
        name !== 'deployment' &&
        name !== 'objectives' &&
        name !== 'markers'
      )
      .every(name =>
        Array.isArray(record.layers[name]) &&
        record.layers[name].length === 0
      ) &&
    Object.keys(record.layers).every(name =>
      LAYER_NAMES.includes(name)
    )
  );
}

function validateLibrary(record) {
  if (
    !isRecord(record) ||
    record.format !== 'mt-workshop-library' ||
    record.version !== 1 ||
    !Array.isArray(record.maps) ||
    record.maps.length > MAX_MAPS
  ) {
    return false;
  }

  const ids = new Set();

  return record.maps.every(map => {
    if (!validateMap(map) || ids.has(map.id)) {
      return false;
    }

    ids.add(map.id);
    return true;
  });
}

function lockWrites(text) {
  writeLocked = true;

  $('ws-storage-warning').hidden = false;
  $('ws-storage-warning-text').textContent = text;

  updateEditorState();
  renderLibrary();
}

function loadLibrary() {
  try {
    expectedRaw = localStorage.getItem(STORAGE_KEY);

    if (expectedRaw === null) {
      return;
    }

    if (expectedRaw.length > MAX_RAW_LENGTH) {
      throw new Error('Библиотека превышает поддерживаемый размер.');
    }

    const saved = JSON.parse(expectedRaw);

    if (!validateLibrary(saved)) {
      throw new Error(
        'Повреждённый или неподдерживаемый формат библиотеки.'
      );
    }

    library = saved;
  } catch (error) {
    lockWrites(
      `Не удалось прочитать библиотеку: ${error.message} ` +
      'Запись заблокирована. Исходные данные не изменены. ' +
      'Если библиотека создана более новой версией мастерской, ' +
      'обновите страницу и проверьте версию приложения.'
    );
  }
}

/**
 * Сравнение исходной строки защищает от обычной записи
 * из устаревшей вкладки.
 *
 * localStorage не обеспечивает атомарную операцию compare-and-set:
 * одновременно редактировать библиотеку в разных вкладках
 * по-прежнему не следует.
 */
function persistLibrary(next) {
  if (writeLocked) {
    throw new Error(
      'Запись заблокирована. Перезагрузите библиотеку.'
    );
  }

  if (!validateLibrary(next)) {
    throw new Error('Получены некорректные данные библиотеки.');
  }

  const raw = JSON.stringify(next);

  if (raw.length > MAX_RAW_LENGTH) {
    throw new Error('Превышен технический размер библиотеки.');
  }

  try {
    const actualRaw = localStorage.getItem(STORAGE_KEY);

    if (actualRaw !== expectedRaw) {
      lockWrites(
        'Библиотека изменена или удалена в другой вкладке. ' +
        'Запись приостановлена, чтобы не затереть актуальные данные. ' +
        'Перезагрузите библиотеку. ' +
        'Несохранённые изменения редактора пока остаются на экране.'
      );

      throw new Error('Обнаружено внешнее изменение библиотеки.');
    }

    localStorage.setItem(STORAGE_KEY, raw);

    expectedRaw = raw;
    library = next;
  } catch (error) {
    if (!writeLocked) {
      message(
        'Не удалось записать библиотеку. ' +
        'Проверьте доступность и свободное место хранилища.',
        true
      );
    }

    throw error;
  }
}

function emptyMap() {
  const now = new Date().toISOString();

  return {
    format: 'mt-map',
    version: 1,
    id: newId(),
    name: 'Новая карта',
    status: 'draft',
    revision: 1,
    createdAt: now,
    updatedAt: now,
    board: {
      width: SIZE,
      height: SIZE
    },
    layers: {
      terrain: [],
      deployment: [],
      objectives: [],
      markers: [],
      decorations: []
    }
  };
}

function canDiscardChanges() {
  return !dirty || confirm(
    'В редакторе есть несохранённые изменения. ' +
    'Отказаться от них? Сохранённая библиотека не изменится.'
  );
}

function setDirty(value) {
  dirty = value;
  updateEditorState();
}

function updateEditorState() {
  const saveButton = $('ws-save-map');

  saveButton.disabled = writeLocked || !currentMap;

  $('ws-dirty-state').textContent = dirty
    ? 'Есть несохранённые изменения'
    : 'Изменения сохранены';

  if (!currentMap) {
    $('ws-dirty-state').textContent = '';
  }
}

function renderEditor() {
  if (!currentMap) return;

  $('ws-map-name').value = currentMap.name;
  $('ws-map-status').value = currentMap.status;

  const saved = library.maps.some(map => map.id === currentMap.id);

  $('ws-map-meta').textContent =
    `Поле ${SIZE} × ${SIZE} · ` +
    (saved
      ? `Редакция ${currentMap.revision}`
      : 'Новый документ, ещё не сохранён') +
    ` · Создано: ${dateLabel(currentMap.createdAt)}` +
    ` · Изменено: ${dateLabel(currentMap.updatedAt)}`;

    updateEditorState();

  terrainEditor?.sync();
  deploymentEditor?.sync();

  // Сохранение карты обновляет документ и поле,
  // но не сбрасывает ещё не применённый ввод форм.
  objectivesEditor?.sync({ preserveInput: true });
  markersEditor?.sync({ preserveInput: true });
}

function renderBoard() {
  const board = $('ws-board');
  const fragment = document.createDocumentFragment();

  const corner = document.createElement('span');
  corner.className = 'ws-axis';
  fragment.append(corner);

  for (const letter of LETTERS) {
    const axis = document.createElement('span');
    axis.className = 'ws-axis';
    axis.textContent = letter;
    fragment.append(axis);
  }

  for (let y = 0; y < SIZE; y++) {
    const axis = document.createElement('span');
    axis.className = 'ws-axis';
    axis.textContent = String(y + 1);
    fragment.append(axis);

    for (let x = 0; x < SIZE; x++) {
      const cell = document.createElement('div');

      cell.className =
        `ws-cell${(x + y) % 2 ? ' is-alternate' : ''}`;

      cell.title = `${LETTERS[x]}${y + 1}: пустая клетка`;

      fragment.append(cell);
    }
  }

  board.replaceChildren(fragment);
}

function showSection() {
  const hash = location.hash.slice(1);
  const section = SECTIONS.includes(hash) ? hash : 'maps';

  for (const name of SECTIONS) {
    $(`ws-${name}`).hidden = name !== section;
  }

  document.querySelectorAll('[data-ws-section]').forEach(link => {
    if (link.dataset.wsSection === section) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });

  if (section === 'library') {
    renderLibrary();
  }
}

function goToMaps() {
  location.hash = 'maps';
  showSection();
}

function createMap() {
  if (!canDiscardChanges()) return;

  currentMap = emptyMap();
  setDirty(true);

  renderEditor();
  goToMaps();

  $('ws-map-name').focus();

  message(
    'Создан новый пустой документ. ' +
    'Нажмите «Сохранить в библиотеку», чтобы сохранить его.'
  );
}

function openMap(id) {
  const saved = library.maps.find(map => map.id === id);

  if (!saved) {
    message('Карта не найдена.', true);
    return;
  }

  if (!canDiscardChanges()) return;

  currentMap = clone(saved);
  terrainEditor?.resetHistory();
  deploymentEditor?.resetHistory();
  objectivesEditor?.resetHistory();
  markersEditor?.resetHistory();
  setDirty(false);

  renderEditor();
  goToMaps();

  message(`Открыта карта «${currentMap.name}».`);
}

function saveMap(event) {
  event.preventDefault();

  if (!currentMap) return;

  const name = $('ws-map-name').value.trim();

  if (!name || name.length > 120) {
    message('Укажите название карты: от 1 до 120 символов.', true);
    $('ws-map-name').focus();
    return;
  }

  try {
    const next = clone(library);
    const index = next.maps.findIndex(map => map.id === currentMap.id);

    if (index < 0 && next.maps.length >= MAX_MAPS) {
      throw new Error(
        `Достигнут технический предел: ${MAX_MAPS} карт.`
      );
    }

    const document = clone(currentMap);

    document.name = name;
    document.status = $('ws-map-status').value;
    document.updatedAt = new Date().toISOString();
    document.revision = index < 0
      ? 1
      : next.maps[index].revision + 1;

    if (index < 0) {
      next.maps.push(document);
    } else {
      next.maps[index] = document;
    }

    persistLibrary(next);

    currentMap = clone(document);
    setDirty(false);

    renderEditor();
    renderLibrary();

    message(`Карта «${document.name}» сохранена локально.`);
  } catch (error) {
    message(`Карта не сохранена: ${error.message}`, true);
  }
}

function copyMap(id) {
  try {
    const source = library.maps.find(map => map.id === id);

    if (!source) {
      throw new Error('Карта не найдена.');
    }

    if (library.maps.length >= MAX_MAPS) {
      throw new Error(
        `Достигнут технический предел: ${MAX_MAPS} карт.`
      );
    }

    const copy = clone(source);
    const now = new Date().toISOString();

    copy.id = newId();
    copy.name = `${source.name.slice(0, 110)} — копия`;
    copy.status = 'draft';
    copy.revision = 1;
    copy.createdAt = now;
    copy.updatedAt = now;

    const next = clone(library);
    next.maps.push(copy);

    persistLibrary(next);
    renderLibrary();

    message(
      `Создана сохранённая копия «${copy.name}». ` +
      'Текущий документ редактора не изменён.'
    );
  } catch (error) {
    message(`Не удалось создать копию: ${error.message}`, true);
  }
}

function deleteMap(id) {
  const saved = library.maps.find(map => map.id === id);
  if (!saved) return;

  const editingThisMap = currentMap?.id === id;

  const warning = editingThisMap && dirty
    ? ' Несохранённые изменения этой карты также будут потеряны.'
    : '';

  if (!confirm(
    `Удалить карту «${saved.name}» из локальной библиотеки? ` +
    'Отмена удаления пока не предусмотрена.' +
    warning
  )) {
    return;
  }

  try {
    const next = clone(library);

    next.maps = next.maps.filter(map => map.id !== id);

    persistLibrary(next);

    if (editingThisMap) {
      currentMap = emptyMap();
      setDirty(true);
      renderEditor();
    }

    renderLibrary();
    message(`Карта «${saved.name}» удалена.`);
  } catch (error) {
    message(`Карта не удалена: ${error.message}`, true);
  }
}

function searchText(value) {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('ru-RU')
    .replace(/ё/g, 'е')
    .trim();
}

function actionButton(label, action, id, destructive = false) {
  const button = document.createElement('button');

  button.type = 'button';
  button.className = 'builder-action-btn' +
    (destructive ? ' ws-delete' : '');

  button.textContent = label;
  button.dataset.action = action;
  button.dataset.id = id;

  button.disabled = writeLocked && action !== 'open';

  return button;
}

function renderLibrary() {
  const query = searchText($('ws-library-search').value);

  const maps = library.maps
    .filter(map => searchText(map.name).includes(query))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));

  $('ws-library-count').textContent =
    `Показано ${maps.length} из ${library.maps.length} карт`;

  const list = $('ws-library-list');
  const fragment = document.createDocumentFragment();

  if (!maps.length) {
    const empty = document.createElement('p');

    empty.className = 'ws-muted';
    empty.textContent = query
      ? 'Карты с таким названием не найдены.'
      : 'В библиотеке пока нет сохранённых карт.';

    fragment.append(empty);
  }

  for (const map of maps) {
    const card = document.createElement('article');
    card.className = 'ws-library-card';

    const title = document.createElement('h3');
    title.textContent = map.name;

    const meta = document.createElement('p');
    meta.className = 'ws-muted';

    meta.textContent =
      `${statusLabel(map.status)} · ` +
      `14 × 14 · Формат ${map.version} · Редакция ${map.revision}`;

    const dates = document.createElement('p');
    dates.className = 'ws-muted';

    dates.textContent =
      `Создано: ${dateLabel(map.createdAt)} · ` +
      `Изменено: ${dateLabel(map.updatedAt)}`;

    const actions = document.createElement('div');
    actions.className = 'ws-actions';

    actions.append(
      actionButton('Открыть', 'open', map.id),
      actionButton('Создать копию', 'copy', map.id),
      actionButton('Удалить', 'delete', map.id, true)
    );

    card.append(title, meta, dates, actions);
    fragment.append(card);
  }

  list.replaceChildren(fragment);
}

$('ws-map-form').addEventListener('submit', saveMap);

$('ws-map-name').addEventListener('input', () => setDirty(true));
$('ws-map-status').addEventListener('change', () => setDirty(true));

$('ws-new-map').addEventListener('click', createMap);
$('ws-library-new').addEventListener('click', createMap);

$('ws-library-search').addEventListener('input', renderLibrary);

$('ws-library-list').addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');

  if (!button || button.disabled) return;

  const { action, id } = button.dataset;

  if (action === 'open') openMap(id);
  if (action === 'copy') copyMap(id);
  if (action === 'delete') deleteMap(id);
});

$('ws-reload').addEventListener('click', () => {
  if (canDiscardChanges()) {
    location.reload();
  }
});

window.addEventListener('hashchange', showSection);

window.addEventListener('beforeunload', event => {
  if (!dirty) return;

  event.preventDefault();
  event.returnValue = '';
});

window.addEventListener('storage', event => {
  if (
    event.storageArea !== localStorage ||
    (event.key !== STORAGE_KEY && event.key !== null)
  ) {
    return;
  }

  try {
    if (localStorage.getItem(STORAGE_KEY) === expectedRaw) {
      return;
    }

    lockWrites(
      'Библиотека изменена или удалена в другой вкладке. ' +
      'Запись заблокирована. Перезагрузите актуальную библиотеку. ' +
      'Несохранённый документ остаётся на экране до перезагрузки.'
    );
  } catch (error) {
    lockWrites(
      `Не удалось проверить библиотеку: ${error.message}. ` +
      'Запись приостановлена.'
    );
  }
});

/**
 * Создаёт снимок текущего редактора для экспорта.
 * Ни currentMap, ни библиотеку не изменяет.
 */
function prepareMapForExport() {
  if (!currentMap) {
    throw new Error('Сначала создайте или откройте карту.');
  }

  const name = $('ws-map-name').value.trim();
  const status = $('ws-map-status').value;

  if (!name || name.length > 120) {
    throw new Error(
      'Укажите название карты: от 1 до 120 символов.'
    );
  }

  if (!['draft', 'test-ready'].includes(status)) {
    throw new Error('Неизвестный статус карты.');
  }

  const snapshot = clone(currentMap);

  snapshot.name = name;
  snapshot.status = status;

  if (dirty) {
    snapshot.updatedAt = new Date().toISOString();
  }

  return snapshot;
}

/**
 * Сохраняет проверенный импорт как отдельную карту.
 *
 * Сначала — проверки и успешная запись.
 * Только затем заменяем открытый документ редактора.
 */
function acceptImportedMap(imported) {
  if (writeLocked) {
    throw new Error(
      'Запись библиотеки заблокирована. ' +
      'Сначала перезагрузите актуальную библиотеку.'
    );
  }

  if (!validateMap(imported)) {
    throw new Error('Импортированная карта не прошла проверку.');
  }

  if (library.maps.length >= MAX_MAPS) {
    throw new Error(
      `Достигнут технический предел: ${MAX_MAPS} карт.`
    );
  }

  if (library.maps.some(map => map.id === imported.id)) {
    throw new Error(
      'Совпадение идентификаторов карт. Повторите импорт.'
    );
  }

  if (!canDiscardChanges()) {
    message(
      'Импорт отменён. Текущий документ и библиотека не изменены.'
    );

    return false;
  }

  const next = clone(library);
  next.maps.push(clone(imported));

  // При конфликте с другой вкладкой или ошибке записи
  // открытая карта остаётся прежней.
  persistLibrary(next);

  currentMap = clone(imported);

  terrainEditor?.resetHistory();
  deploymentEditor?.resetHistory();
  objectivesEditor?.resetHistory();
  markersEditor?.resetHistory();
  setDirty(false);

  renderEditor();
  renderLibrary();
  goToMaps();

  return true;
}

terrainEditor = initWorkshopTerrainEditor({
  getMap: () => currentMap,
  onChange: () => setDirty(true),
  message
});

deploymentEditor = initDeploymentEditor({
  getMap: () => currentMap,
  onChange: () => setDirty(true),
  message
});

objectivesEditor = initMapObjectives({
  getMap: () => currentMap,
  onChange: () => setDirty(true),
  message
});

markersEditor = initMapMarkers({
  getMap: () => currentMap,
  onChange: () => setDirty(true),
  message
});

loadLibrary();

currentMap = emptyMap();

// Начальная пустая заготовка не требует предупреждения о закрытии.
// Любое изменение местности или свойств отметит документ изменённым.
setDirty(false);

renderEditor();
renderLibrary();
showSection();

initMapTransfer({
  getMapForExport: prepareMapForExport,
  validateMap,
  importAsNew: acceptImportedMap,
  message
});

if (!writeLocked) {
  message(
    'Мастерская готова. Создайте карту или откройте её из библиотеки.'
  );
}

// Отдельная библиотека авторских моделей.
// Не меняет документ карты и её dirty-состояние.
initCustomUnits();

// Независимая библиотека сценариев.
// Передаём только копии сохранённых карт.
// При заблокированной библиотеке карт не предлагаем её
// потенциально устаревшие данные для новых снимков.
// Уже сохранённые снимки внутри сценариев остаются доступны.
initScenarios({
  getMaps: () => writeLocked ? [] : clone(library.maps),
  validateMap
});