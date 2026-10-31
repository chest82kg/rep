// src/virtual-table/index.js
//
// Локальный ручной стол двух сторон.
// Firebase и существующий боевой режим не изменяются.
// Стоимость действий и игровые эффекты не рассчитываются.

import { ARTIFACTS_LIST } from '../content/artifacts.js';
import { escapeHtml } from '../utils/escape.js';

import {
  initTerrainEditor,
  renderTerrainEditor,
  handleTerrainClick,
  terrainCellView,
  validateTerrain
} from './terrain.js';

import {
  initModelMarkers,
  renderModelMarkers,
  validModelMarkers,
  modelMarkerHTML,
  modelMarkerLabel
} from './markers.js';

import {
  initRounds,
  renderRounds,
  validRoundState
} from './rounds.js';

import {
  initHistory,
  recordHistory,
  clearHistory
} from './history.js';

import { initSessionControls } from './session.js';
import { initWorkshopMaps } from './workshop-maps.js';
import { initTableBackup } from './backup.js';

import {
  validTableDeployment,
  renderTableDeployment
} from './deployment.js';

import {
  initTableMapMarkers,
  renderTableMapMarkers,
  validTableMapMarkers
} from './map-markers.js';

import {
  initTableScenarios,
  renderTableScenario,
  validTableScenario
} from './scenarios.js';

import {
  validateBackupTable
} from './backup-validation.js';

const SIZE = 14;
const LETTERS = 'ABCDEFGHIJKLMN';

const STORAGE_KEY = 'mt_virtual_table_local_v1';
const SIDE_STORAGE_KEY = 'mt_virtual_table_selected_side';
const BUILDER_SIDE_KEY = 'mt_virtual_table_builder_side';

const SIDE_NAMES = {
  a: 'Игрок А',
  b: 'Игрок Б'
};

const FACINGS = {
  n: { name: 'Вверх', arrow: '↑' },
  e: { name: 'Вправо', arrow: '→' },
  s: { name: 'Вниз', arrow: '↓' },
  w: { name: 'Влево', arrow: '←' }
};

const FACING_ORDER = ['n', 'e', 's', 'w'];

const $ = id => document.getElementById(id);
const escape = value => escapeHtml(String(value ?? ''));
const clone = value => JSON.parse(JSON.stringify(value));

let state = null;
let selectedId = null;
let rosterChoices = [];

// Фильтры интерфейса, отдельно для каждой стороны.
// В сохранение партии не записываются.
const unitListFilters = {
  a: { query: '', location: 'all', status: 'all' },
  b: { query: '', location: 'all', status: 'all' }
};

// Исходная строка сохранения, с которой работает эта вкладка.
// Перед записью сравниваем её с фактическим localStorage.
let expectedTableRaw = null;

// null | 'damaged' | 'external' | 'storage'
let tableWriteLock = null;

function showTableSafetyNotice(text, allowReplacement = false) {
  let panel = document.getElementById('vt-storage-safety');

  if (!panel) {
    panel = document.createElement('section');
    panel.id = 'vt-storage-safety';
    panel.className = 'vt-detail-block';
    panel.setAttribute('aria-label', 'Защита локального сохранения');

    $('vt-message').after(panel);
  }

  panel.replaceChildren();

  const description = document.createElement('p');
  description.textContent = text;

  const actions = document.createElement('div');
  actions.className = 'vt-detail-actions';

  const reload = document.createElement('button');
  reload.type = 'button';
  reload.className = 'builder-action-btn';
  reload.textContent = 'Перезагрузить актуальное сохранение';

  reload.addEventListener('click', () => {
    window.location.reload();
  });

  actions.append(reload);

  if (allowReplacement) {
    const replace = document.createElement('button');

    replace.type = 'button';
    replace.className = 'builder-action-btn';
    replace.textContent = 'Разрешить замену непрочитанной партии';

    replace.addEventListener('click', () => {
      if (
        !confirm(
          'Разрешить создание новой партии вместо непрочитанного сохранения?\n\n' +
          'Старое сохранение будет заменено при следующей успешной ' +
          'загрузке армии на стол. Восстановить его средствами стола ' +
          'после этого нельзя.\n\n' +
          'Контрольные точки и счёт этим действием не сбрасываются.'
        )
      ) {
        return;
      }

      try {
        const actualRaw = localStorage.getItem(STORAGE_KEY);

        // Пока пользователь читал предупреждение,
        // другая вкладка могла записать новую партию.
        if (actualRaw !== expectedTableRaw) {
          lockTableWrites(
            'external',
            'Сохранение изменилось в другой вкладке. ' +
            'Перезагрузите страницу, прежде чем продолжать.'
          );

          return;
        }

        tableWriteLock = null;
        state = null;
        selectedId = null;

        clearHistory();
        panel.remove();
        render();

        message(
          'Замена разрешена. Выберите ростер и загрузите армию. ' +
          'До успешной загрузки прежнее сохранение остаётся в хранилище.'
        );
      } catch (error) {
        lockTableWrites(
          'storage',
          `Хранилище недоступно: ${error.message}`
        );
      }
    });

    actions.append(replace);
  }

  panel.append(description, actions);
}

function lockTableWrites(reason, text) {
  tableWriteLock = reason;

  showTableSafetyNotice(
    text,
    reason === 'damaged'
  );

  message(
    'Запись основной партии приостановлена для защиты сохранения.',
    true
  );
}

function assertTableWritable() {
  if (tableWriteLock) {
    throw new Error(
      'Запись заблокирована. Используйте панель защиты сохранения над столом.'
    );
  }

  let actualRaw;

  try {
    actualRaw = localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    lockTableWrites(
      'storage',
      `Не удалось проверить сохранение: ${error.message}`
    );

    throw new Error('Хранилище недоступно. Изменение не записано.');
  }

  if (actualRaw !== expectedTableRaw) {
    lockTableWrites(
      'external',
      'Основная партия изменена или удалена в другой вкладке. ' +
      'Эта вкладка больше не записывает армии и поле, чтобы не затереть ' +
      'актуальную версию. Перезагрузите сохранение.'
    );

    throw new Error(
      'Обнаружено внешнее изменение партии. Перезагрузите страницу.'
    );
  }
}

/* ==========================================================================
   Общие утилиты
   ========================================================================== */

function message(text, error = false) {
  $('vt-message').textContent = text;
  $('vt-message').classList.toggle('is-error', error);
}

function readJSON(key, fallback) {
  const raw = localStorage.getItem(key);
  return raw === null ? fallback : JSON.parse(raw);
}

function newId() {
  return crypto.randomUUID();
}

function activeSide() {
  return $('vt-side-select').value === 'b' ? 'b' : 'a';
}

function rememberSide(side) {
  try {
    sessionStorage.setItem(
      SIDE_STORAGE_KEY,
      side === 'b' ? 'b' : 'a'
    );
  } catch {
    // Недоступность sessionStorage не блокирует стол.
  }
}

function restoreSide() {
  try {
    const side = sessionStorage.getItem(SIDE_STORAGE_KEY);

    if (side === 'a' || side === 'b') {
      $('vt-side-select').value = side;
    }
  } catch {
    // Оставляем текущий выбор.
  }
}

function unitSide(unit) {
  return unit.side === 'b' ? 'b' : 'a';
}

function unitNumber(unit) {
  return `${unitSide(unit).toUpperCase()}${unit.rosterIndex + 1}`;
}

function sideRoster(side) {
  if (!state) return null;

  return side === 'b'
    ? state.opponentRoster || null
    : state.roster || null;
}

function selectedUnit() {
  return state?.units.find(unit => unit.id === selectedId) || null;
}

function locationLabel(unit) {
  return unit.position
    ? `${LETTERS[unit.position.x]}${unit.position.y + 1}`
    : 'Резерв';
}

function statusLabel(unit) {
  if (unit.currentHp === 0) return 'Уничтожен';
  return unit.activated ? 'Активирован' : 'Готов';
}

function validFacing(facing) {
  return facing === undefined ||
    facing === null ||
    (
      typeof facing === 'string' &&
      Object.hasOwn(FACINGS, facing)
    );
}

function facingLabel(unit) {
  const facing = unit.facing &&
    Object.hasOwn(FACINGS, unit.facing)
    ? FACINGS[unit.facing]
    : null;

  return facing
    ? `${facing.arrow} ${facing.name}`
    : 'Не задан';
}

function validRoster(record) {
  return Boolean(
    record &&
    typeof record === 'object' &&
    Array.isArray(record.units) &&
    record.units.length > 0 &&
    record.units.every(unit => unit && typeof unit === 'object')
  );
}

/* ==========================================================================
   Список ростеров
   ========================================================================== */

function refreshRosters({ preferActive = false } = {}) {
  const previousValue = $('vt-roster-select').value;

  const previousKey = previousValue !== ''
    ? rosterChoices[Number(previousValue)]?.key
    : null;

  rosterChoices = [];

  const errors = [];

  try {
    const active = readJSON('activeRoster', null);

    if (validRoster(active)) {
      rosterChoices.push({
        key: 'active',
        label: `Активный: ${active.name || 'Без имени'}`,
        roster: active
      });
    }
  } catch {
    errors.push('Не удалось прочитать активный ростер.');
  }

  try {
    const saved = readJSON('savedRosters', []);

    if (!Array.isArray(saved)) {
      throw new Error('Неверный формат списка ростеров.');
    }

    saved.forEach((record, index) => {
      if (!validRoster(record)) return;

      rosterChoices.push({
        key: `saved:${record.name || ''}:${index}`,
        label: `Сохранённый: ${record.name || 'Без имени'}`,
        roster: record
      });
    });
  } catch {
    errors.push('Не удалось прочитать локальные ростеры.');
  }

  $('vt-roster-select').innerHTML = rosterChoices.length
    ? rosterChoices.map((choice, index) => `
        <option value="${index}">
          ${escape(choice.label)}
          · ${choice.roster.units.length} моделей
        </option>
      `).join('')
    : '<option value="">Нет доступных ростеров</option>';

  const desiredKey = preferActive ? 'active' : previousKey;

  const desiredIndex = rosterChoices.findIndex(
    choice => choice.key === desiredKey
  );

  if (desiredIndex >= 0) {
    $('vt-roster-select').value = String(desiredIndex);
  }

  $('vt-load').disabled = rosterChoices.length === 0;

  if (errors.length) {
    message(errors.join(' '), true);
  }

  return errors.length === 0;
}

/* ==========================================================================
   Чтение исходной датакарты
   ========================================================================== */

function readCard(unit) {
  // Исходный HTML не вставляется в страницу.
  const template = document.createElement('template');
  template.innerHTML = String(unit.html || '');

  const root = template.content;

  const stats = {
    hp: null,
    move: null,
    armor: null
  };

  const boxes = [...root.querySelectorAll('.aos-stat-box')];

  boxes.forEach((box, index) => {
    const label = (
      box.querySelector('.aos-stat-label')?.textContent || ''
    ).trim().toUpperCase();

    const raw =
      box.querySelector('.aos-stat-value')?.textContent || '';

    const match = raw.match(/-?\d+/);
    if (!match) return;

    let key = null;

    if (/ХП|HP|WOUNDS|ЗДОРОВ|❤|♥/.test(label)) {
      key = 'hp';
    } else if (/ДВИЖ|MOVE|SPEED|👣/.test(label)) {
      key = 'move';
    } else if (/БРОН|ARMOU?R|🛡/.test(label)) {
      key = 'armor';
    } else if (boxes.length === 3) {
      key = ['hp', 'move', 'armor'][index];
    }

    if (key) {
      stats[key] = Number(match[0]);
    }
  });

  if (!Number.isFinite(stats.hp) || stats.hp <= 0) {
    throw new Error(
      `Не удалось определить ХП: ${unit.title || unit.uniqueKey || 'модель'}.`
    );
  }

  const weapons = [...root.querySelectorAll('.aos-weapon-item')]
    .map(item => ({
      name:
        item.querySelector('.aos-weapon-name')
          ?.textContent?.trim() || '',
      type:
        item.querySelector('.aos-weapon-type')
          ?.textContent?.trim() || '',
      stats:
        item.querySelector('.aos-weapon-stats')
          ?.textContent?.replace(/\s+/g, ' ').trim() || ''
    }));

  const abilities = [...root.querySelectorAll('.aos-ability')]
    .map(item => ({
      title:
        item.querySelector('.aos-ability-title')
          ?.textContent?.trim() || '',
      text:
        item.querySelector('.aos-ability-text')
          ?.textContent?.trim() || ''
    }));

  return {
    stats,
    weapons,
    abilities
  };
}

/* ==========================================================================
   Подготовка загружаемой армии
   ========================================================================== */

function prepareArmy(roster, side) {
  const snapshot = clone(roster);

  const artifacts = Array.isArray(snapshot.artifacts)
    ? snapshot.artifacts
    : [];

  const assignments = new Map();

  artifacts.forEach(record => {
    if (
      !record ||
      !Number.isInteger(record.targetIdx) ||
      record.targetIdx < 0 ||
      record.targetIdx >= snapshot.units.length
    ) {
      throw new Error(
        'В ростере есть артефакт с некорректным носителем.'
      );
    }

    if (assignments.has(record.targetIdx)) {
      throw new Error(
        `Модели #${record.targetIdx + 1} назначено больше одного артефакта. ` +
        'Исправьте назначение в билдере.'
      );
    }

    const catalog = ARTIFACTS_LIST.find(
      item => item.id === record.id
    );

    if (!catalog) {
      throw new Error(
        `Неизвестный артефакт: ${record.id || 'без ID'}.`
      );
    }

    assignments.set(record.targetIdx, clone(catalog));
  });

  const units = snapshot.units.map((unit, index) => {
    const card = readCard(unit);
    const artifact = assignments.get(index) || null;

    const bonuses = {
      hp: 0,
      move: 0,
      armor: 0,
      ...(artifact?.statBonuses || {})
    };

    const total = {};

    for (const key of ['hp', 'move', 'armor']) {
      total[key] = card.stats[key] === null
        ? null
        : card.stats[key] + Number(bonuses[key] || 0);
    }

    return {
      id: newId(),
      side,
      rosterIndex: index,
      title: unit.title || 'Модель',
      uniqueKey: unit.uniqueKey || unit.title || 'Модель',
      role: unit.role || '',
      base: card.stats,
      stats: total,
      weapons: card.weapons,
      abilities: card.abilities,
      artifact,
      currentHp: total.hp,
      activated: false,
      facing: null,
      fatigued: false,
      note: '',
      position: null
    };
  });

  return {
    roster: snapshot,
    units
  };
}

function emptyState() {
  return {
    version: 1,
    id: newId(),
    round: 1,
    board: {
      width: SIZE,
      height: SIZE
    },
    roster: null,
    opponentRoster: null,
    terrain: [],
    deployment: [],
    mapMarkers: [],
    scenario: null,
    units: []
  };
}

/* ==========================================================================
   Проверка сохранения
   ========================================================================== */

function validPosition(position) {
  return position === null || Boolean(
    position &&
    Number.isInteger(position.x) &&
    Number.isInteger(position.y) &&
    position.x >= 0 &&
    position.x < SIZE &&
    position.y >= 0 &&
    position.y < SIZE &&
    position.surfaceId === 'ground'
  );
}

function validStats(stats, requirePositiveHp = false) {
  if (!stats || typeof stats !== 'object') return false;

  if (
    !Number.isFinite(stats.hp) ||
    (requirePositiveHp && stats.hp <= 0)
  ) {
    return false;
  }

  return ['move', 'armor'].every(key =>
    stats[key] === null || Number.isFinite(stats[key])
  );
}

function validateState(record) {
  if (
    !record ||
    record.version !== 1 ||
    !validRoundState(record) ||
    record.board?.width !== SIZE ||
    record.board?.height !== SIZE ||
    !validateTerrain(record.terrain) ||
    !validTableDeployment(record.deployment) ||
    !validTableMapMarkers(record.mapMarkers) ||
    !validTableScenario(record.scenario) ||
    !Array.isArray(record.units)
  ) {
    return false;
  }

  const rosterA = record.roster || null;
  const rosterB = record.opponentRoster || null;

  if (rosterA !== null && !validRoster(rosterA)) return false;
  if (rosterB !== null && !validRoster(rosterB)) return false;
  if (!rosterA && !rosterB) return false;

  const expectedCount =
    (rosterA?.units.length || 0) +
    (rosterB?.units.length || 0);

  if (record.units.length !== expectedCount) return false;

  const ids = new Set();
  const occupied = new Set();

  const indexes = {
    a: new Set(),
    b: new Set()
  };

  return record.units.every(unit => {
    if (
      !unit ||
      typeof unit.id !== 'string' ||
      ids.has(unit.id) ||
      (unit.side !== undefined && !['a', 'b'].includes(unit.side)) ||
      !validStats(unit.stats, true) ||
      !validStats(unit.base, true) ||
      !Number.isFinite(unit.currentHp) ||
      unit.currentHp < 0 ||
      unit.currentHp > unit.stats.hp ||
      typeof unit.activated !== 'boolean' ||
      !validFacing(unit.facing) ||
      !validModelMarkers(unit) ||
      !Array.isArray(unit.weapons) ||
      !unit.weapons.every(item => item && typeof item === 'object') ||
      !Array.isArray(unit.abilities) ||
      !unit.abilities.every(item => item && typeof item === 'object') ||
      !validPosition(unit.position)
    ) {
      return false;
    }

    const side = unitSide(unit);
    const roster = side === 'b' ? rosterB : rosterA;

    if (
      !roster ||
      !Number.isInteger(unit.rosterIndex) ||
      unit.rosterIndex < 0 ||
      unit.rosterIndex >= roster.units.length ||
      indexes[side].has(unit.rosterIndex)
    ) {
      return false;
    }

    indexes[side].add(unit.rosterIndex);
    ids.add(unit.id);

    if (unit.position) {
      const key = `${unit.position.x}:${unit.position.y}`;

      if (occupied.has(key)) return false;
      occupied.add(key);
    }

    return true;
  });
}

/* ==========================================================================
   Сохранение и общая история
   ========================================================================== */

function persist(next) {
  assertTableWritable();

  const raw = JSON.stringify(next);

  localStorage.setItem(STORAGE_KEY, raw);

  // Обновляем ожидаемую версию только после успешной записи.
  expectedTableRaw = raw;
}

function commit(change, successText) {
  if (!state) return false;

  try {
    const previous = state;
    const next = clone(state);

    change(next);

    if (!validateState(next)) {
      throw new Error('Получено некорректное состояние стола.');
    }

    persist(next);
    recordHistory(previous, next, successText);

    state = next;

    render();
    message(successText);

    return true;
  } catch (error) {
    message(`Изменение не сохранено: ${error.message}`, true);
    return false;
  }
}

function selectUnit(id) {
  const unit = state?.units.find(item => item.id === id);
  if (!unit) return;

  selectedId = id;

  const side = unitSide(unit);

  $('vt-side-select').value = side;
  rememberSide(side);

  render();
}

/* ==========================================================================
   Контекст выбора и предпросмотр

   Только интерфейс. Не изменяет состояние партии.
   Свободная клетка означает отсутствие модели,
   а не разрешение перемещения по игровым правилам.
   ========================================================================== */

let previewCell = null;

function clearModelPreview() {
  if (previewCell) {
    previewCell.classList.remove(
      'vt-model-target-free',
      'vt-model-target-occupied',
      'vt-model-target-current'
    );

    delete previewCell.dataset.previewCoordinate;
    previewCell = null;
  }
}

function modelActionHint() {
  const unit = selectedUnit();

  if (!unit) {
    return 'Выберите модель в списке или жетон на поле.';
  }

  const name = `${unitNumber(unit)} · ${unit.uniqueKey}`;

  return unit.position
    ? `${name} · ${locationLabel(unit)} — ` +
      'выберите пустую клетку для перемещения. Esc — снять выбор.'
    : `${name} · резерв — ` +
      'выберите пустую клетку для размещения. Esc — снять выбор.';
}

function updateModelContext() {
  const board = $('vt-board');

  board.dataset.modelHint = modelActionHint();

  document.dispatchEvent(
    new Event('vt:model-context')
  );
}

function showModelPreview(cell) {
  clearModelPreview();

  const board = $('vt-board');
  const unit = selectedUnit();

  if (
    !cell ||
    !board.contains(cell) ||
    board.dataset.fieldTool !== 'models' ||
    !unit
  ) {
    return;
  }

  const x = Number(cell.dataset.x);
  const y = Number(cell.dataset.y);

  if (
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    x < 0 || x >= SIZE ||
    y < 0 || y >= SIZE
  ) {
    return;
  }

  const occupant = state.units.find(item =>
    item.position?.x === x &&
    item.position?.y === y
  );

  const kind = !occupant
    ? 'free'
    : occupant.id === unit.id
      ? 'current'
      : 'occupied';

  cell.classList.add(`vt-model-target-${kind}`);
  cell.dataset.previewCoordinate = `${LETTERS[x]}${y + 1}`;

  previewCell = cell;
}

/* ==========================================================================
   Поиск и фильтры списка моделей
   ========================================================================== */

function normalizeUnitSearch(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase('ru-RU')
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesUnitListFilters(unit, filters) {
  const query = normalizeUnitSearch(filters.query);

  if (query) {
    const searchText = normalizeUnitSearch([
      unitNumber(unit),
      unit.title,
      unit.uniqueKey
    ].join(' '));

    if (!searchText.includes(query)) return false;
  }

  if (filters.location === 'board' && !unit.position) {
    return false;
  }

  if (filters.location === 'reserve' && unit.position) {
    return false;
  }

  if (filters.status === 'ready') {
    return unit.currentHp > 0 && !unit.activated;
  }

  if (filters.status === 'activated') {
    return unit.currentHp > 0 && unit.activated;
  }

  if (filters.status === 'dead') {
    return unit.currentHp === 0;
  }

  return true;
}

function renderUnitList() {
  const side = activeSide();
  const filters = unitListFilters[side];

  const units = (state?.units || []).filter(
    unit => unitSide(unit) === side
  );

  const visibleUnits = units.filter(
    unit => matchesUnitListFilters(unit, filters)
  );

  const list = $('vt-unit-list');
  const previousScroll = list.scrollTop;
  const focused = document.activeElement;

  const focusedId = list.contains(focused)
    ? focused?.closest('[data-unit]')?.dataset.unit
    : null;

  if ($('vt-unit-search').value !== filters.query) {
    $('vt-unit-search').value = filters.query;
  }

  $('vt-unit-location').value = filters.location;
  $('vt-unit-status').value = filters.status;

  document.querySelectorAll('[data-list-side]')
    .forEach(button => {
      const isActive = button.dataset.listSide === side;

      button.classList.toggle('primary', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });

  $('vt-unit-count').textContent =
    `Показано ${visibleUnits.length} из ${units.length}`;

  function rowHTML(unit) {
    const tags = [];

    if (unit.id === selectedId) {
  tags.push(
    '<span class="vt-unit-tag is-selection">Выбрана</span>'
  );
}

    if (unit.currentHp === 0) {
      tags.push(
        '<span class="vt-unit-tag is-destroyed">Уничтожена</span>'
      );
    } else if (unit.activated) {
      tags.push(
        '<span class="vt-unit-tag is-activated">Активирована</span>'
      );
    }

    if (unit.fatigued) {
      tags.push(
        '<span class="vt-unit-tag is-fatigued">Усталость</span>'
      );
    }

    if (unit.note) {
      tags.push(
        '<span class="vt-unit-tag">Заметка</span>'
      );
    }

    const label = [
      unitNumber(unit),
      unit.uniqueKey,
      locationLabel(unit),
      `ХП ${unit.currentHp} из ${unit.stats.hp}`,
      statusLabel(unit),
      unit.fatigued ? 'Усталость' : '',
      unit.note ? 'Есть сохранённая заметка' : ''
    ].filter(Boolean).join(', ');

    return `
      <button type="button"
        class="vt-unit vt-unit-compact
          ${unit.id === selectedId ? 'is-selected' : ''}
          ${unit.activated ? 'is-activated' : ''}
          ${unit.currentHp === 0 ? 'is-dead' : ''}"
        data-unit="${escape(unit.id)}"
        data-side="${unitSide(unit)}"
        aria-label="${escape(label)}"
        aria-pressed="${unit.id === selectedId}">

        <span class="vt-unit-heading">
          <span class="vt-unit-number">
            ${unitNumber(unit)}
          </span>

          <strong>${escape(unit.uniqueKey)}</strong>
        </span>

        <span class="vt-unit-subline">
          <span class="vt-unit-hp">
            ХП ${unit.currentHp}/${unit.stats.hp}
          </span>

          ${unit.position ? `
            <span class="vt-unit-coordinate">
              ${locationLabel(unit)}
            </span>
          ` : ''}
        </span>

        ${tags.length ? `
          <span class="vt-unit-tags">
            ${tags.join('')}
          </span>
        ` : ''}
      </button>
    `;
  }

  function groupHTML(title, group) {
    if (!group.length) return '';

    return `
      <section class="vt-unit-group"
               aria-label="${title}">
        <h4 class="vt-unit-group-title">
          ${title}
          <span>${group.length}</span>
        </h4>

        ${group.map(rowHTML).join('')}
      </section>
    `;
  }

  list.innerHTML = visibleUnits.length
    ? groupHTML(
        'На поле',
        visibleUnits.filter(unit => unit.position)
      ) +
      groupHTML(
        'Резерв',
        visibleUnits.filter(unit => !unit.position)
      )
    : `
      <p class="vt-muted">
        ${units.length
          ? 'Нет моделей, подходящих под поиск и фильтры.'
          : 'Для этой стороны ещё не загружена армия.'}
      </p>
    `;

  list.scrollTop = previousScroll;

  const selected = selectedUnit();

  const selectionHidden = Boolean(
    selected &&
    unitSide(selected) === side &&
    !visibleUnits.some(unit => unit.id === selected.id)
  );

  const hint = $('vt-unit-selection-hint');

  hint.hidden = !selectionHidden;

  hint.textContent = selectionHidden
    ? `Выбрана ${unitNumber(selected)} ${selected.uniqueKey}. ` +
      'Модель скрыта фильтрами, но остаётся выбранной.'
    : '';

  if (focusedId) {
    const replacement = [
      ...list.querySelectorAll('[data-unit]')
    ].find(button => button.dataset.unit === focusedId);

    if (replacement) {
      replacement.focus({ preventScroll: true });
    } else {
      $('vt-unit-search').focus({ preventScroll: true });
    }
  }
}

/* ==========================================================================
   Общая отрисовка
   ========================================================================== */

function render() {
  const allUnits = state?.units || [];
  const side = activeSide();
  const roster = sideRoster(side);

  const units = allUnits.filter(unit => unitSide(unit) === side);
  const placed = allUnits.filter(unit => unit.position).length;

  $('vt-army-name').textContent = roster
    ? `${SIDE_NAMES[side]} — ${roster.name || 'Без имени'}`
    : `${SIDE_NAMES[side]} — армия не загружена`;

  $('vt-army-meta').textContent = roster
    ? `${roster.clan || 'Клан не указан'} · ${units.length} моделей`
    : 'Выберите ростер и нажмите «Загрузить на стол».';

  $('vt-load').textContent =
    `Загрузить для ${side === 'b' ? 'Игрока Б' : 'Игрока А'}`;

  $('vt-open-builder').textContent =
    `Собрать ростер для ${side === 'b' ? 'Игрока Б' : 'Игрока А'}`;

  for (const currentSide of ['a', 'b']) {
    const currentRoster = sideRoster(currentSide);

    const sideUnits = allUnits.filter(
      unit => unitSide(unit) === currentSide
    );

    const onBoard = sideUnits.filter(unit => unit.position).length;

    $(`vt-side-${currentSide}-summary`).textContent = currentRoster
      ? `${SIDE_NAMES[currentSide]}: ` +
        `${currentRoster.name || 'Без имени'} · ` +
        `${sideUnits.length} моделей · на поле ${onBoard}`
      : `${SIDE_NAMES[currentSide]}: армия не загружена`;
  }

  $('vt-field-summary').textContent =
    `На поле: ${placed} · В резерве: ${allUnits.length - placed}`;

  
  renderUnitList();
  renderTerrainEditor();
  renderBoard();
  renderTableDeployment(state?.deployment);
  renderTableMapMarkers(state?.mapMarkers);
  renderSelectedModelPanel();
  renderRounds();
  renderTableScenario(state?.scenario);
  updateModelContext();
}

/* ==========================================================================
   Поле
   ========================================================================== */

function renderBoard() {

  clearModelPreview();

const focused = document.activeElement;

const focusedCell = focused instanceof Element &&
  $('vt-board').contains(focused)
  ? focused.closest('button[data-x][data-y]')
  : null;

const focusPosition = focusedCell
  ? {
      x: focusedCell.dataset.x,
      y: focusedCell.dataset.y
    }
  : null;
  const occupied = new Map();

  (state?.units || []).forEach(unit => {
    if (unit.position) {
      occupied.set(`${unit.position.x}:${unit.position.y}`, unit);
    }
  });

  let html = '<span class="vt-axis" aria-hidden="true"></span>';

  for (const letter of LETTERS) {
    html += `
      <span class="vt-axis" aria-hidden="true">${letter}</span>
    `;
  }

  for (let y = 0; y < SIZE; y++) {
    html += `
      <span class="vt-axis" aria-hidden="true">${y + 1}</span>
    `;

    for (let x = 0; x < SIZE; x++) {
      const unit = occupied.get(`${x}:${y}`);
      const terrain = terrainCellView(state?.terrain, x, y);
      const label = `${LETTERS[x]}${y + 1}`;

      const facing = unit?.facing ? FACINGS[unit.facing] : null;
      const markerLabel = unit ? modelMarkerLabel(unit) : '';

      const description = [
        label,
        terrain.title,
        unit
          ? `${SIDE_NAMES[unitSide(unit)]}, ` +
            `${unitNumber(unit)} ${unit.uniqueKey}, ` +
            `ХП ${unit.currentHp}/${unit.stats.hp}, ` +
            `${statusLabel(unit)}, фронт: ${facingLabel(unit)}` +
            (markerLabel ? `, ${markerLabel}` : '')
          : 'Нет модели'
      ].join(': ');

      html += `
        <button type="button"
          class="vt-cell
            ${(x + y) % 2 ? 'is-alternate' : ''}
            ${unit?.id === selectedId ? 'is-selected' : ''}
            ${terrain.selected ? 'is-terrain-selected' : ''}"
          data-x="${x}"
          data-y="${y}"
          data-terrain="${terrain.type}"
          data-has-unit="${Boolean(unit)}"
aria-pressed="${Boolean(unit && unit.id === selectedId)}"
aria-label="${escape(description)}"
          title="${escape(description)}">

          ${terrain.html}

          ${unit ? `
            <span
              data-side="${unitSide(unit)}"
              data-facing="${unit.facing || 'unset'}"
              class="vt-token
                ${unit.activated ? 'is-activated' : ''}
                ${unit.currentHp === 0 ? 'is-dead' : ''}">

              ${facing ? `
                <span class="vt-facing-mark" aria-hidden="true">
                  ${facing.arrow}
                </span>
              ` : ''}

              ${modelMarkerHTML(unit)}

              <strong>
                ${unit.currentHp === 0 ? '×' : ''}${unitNumber(unit)}
              </strong>

              <small>${unit.currentHp} ХП</small>
            </span>
          ` : ''}
        </button>
      `;
    }
  }

  $('vt-board').innerHTML = html;

  if (focusPosition) {
  const replacement = $('vt-board').querySelector(
    `button[data-x="${focusPosition.x}"]` +
    `[data-y="${focusPosition.y}"]`
  );

  replacement?.focus({ preventScroll: true });
}
}

/* ==========================================================================
   Карточка выбранной модели
   ========================================================================== */

   /**
 * Обновляет панель модели:
 * — основные действия располагаются в начале;
 * — фронт помещается в раскрывающийся блок;
 * — открытые способности и фокус кнопок сохраняются
 *   при обновлении той же модели.
 *
 * Черновики textarea по-прежнему обслуживает note-drafts.js.
 */
function renderSelectedModelPanel() {
  const container = $('vt-details');
  const unit = selectedUnit();

  const sameUnit = Boolean(
    unit &&
    container.dataset.renderedUnit === unit.id
  );

  const openSections = new Map();

  if (sameUnit) {
    container.querySelectorAll('details').forEach(element => {
      const key = element.dataset.panelSection;

      if (key) {
        openSections.set(key, element.open);
      }
    });
  }

  const focused = document.activeElement;

  const focusKey = sameUnit && container.contains(focused)
    ? modelPanelFocusKey(focused)
    : null;

  // Исходные обработчики и создание поля заметки сохраняются.
  renderDetails();
  renderModelMarkers();

  if (!unit) {
    delete container.dataset.renderedUnit;
    return;
  }

  container.dataset.renderedUnit = unit.id;
  container.classList.add('vt-model-card');

  const heading = container.querySelector(':scope > h3');
  const metadata = [
    ...container.querySelectorAll(':scope > p.vt-muted')
  ];

  if (heading) {
    heading.classList.add('vt-model-card-title');
  }

  metadata.forEach(element => {
    element.classList.add('vt-model-card-meta');
  });

  function fold(key, title, elements) {
    const section = document.createElement('details');

    section.className = 'vt-card-fold';
    section.dataset.panelSection = key;

    const summary = document.createElement('summary');
    summary.textContent = title;

    const content = document.createElement('div');
    content.className = 'vt-card-fold-content';

    section.append(summary, content);

    elements.filter(Boolean).forEach(element => {
      content.append(element);
    });

    container.append(section);

    return section;
  }

  /* ======================================================================
     ХП и ручные состояния
     ====================================================================== */

  const stats = container.querySelector('.vt-stats');

  // В renderDetails() эти элементы идут сразу после stats.
  const originalHealth = stats?.nextElementSibling;
  const originalActions = originalHealth?.nextElementSibling;

  const hpMinus = originalActions?.querySelector(
    '[data-action="hp"][data-delta="-1"]'
  );

  const hpPlus = originalActions?.querySelector(
    '[data-action="hp"][data-delta="1"]'
  );

  const activate = originalActions?.querySelector(
    '[data-action="activate"]'
  );

  const reserve = originalActions?.querySelector(
    '[data-action="reserve"]'
  );

  const markers = container.querySelector('#vt-model-markers');

  const fatigue = markers?.querySelector(
    '[data-marker-action="fatigue"]'
  );

  const controls = document.createElement('section');

  controls.className = 'vt-card-controls';
  controls.setAttribute('aria-label', 'ХП и состояния модели');

  if (hpMinus && hpPlus) {
    const healthRow = document.createElement('div');
    healthRow.className = 'vt-card-health-row';

    const label = document.createElement('span');
    label.className = 'vt-card-health-label';
    label.textContent = 'ХП';

    const value = document.createElement('strong');
    value.className = 'vt-card-health-value';
    value.textContent = `${unit.currentHp} / ${unit.stats.hp}`;

    hpMinus.textContent = '−';
    hpMinus.setAttribute('aria-label', 'Уменьшить ХП на 1');
    hpMinus.disabled = unit.currentHp <= 0;

    hpPlus.textContent = '+';
    hpPlus.setAttribute('aria-label', 'Увеличить ХП на 1');
    hpPlus.disabled = unit.currentHp >= unit.stats.hp;

    healthRow.append(label, hpMinus, value, hpPlus);
    controls.append(healthRow);
  } else if (originalHealth) {
    controls.append(originalHealth);
  }

  const states = document.createElement('div');
  states.className = 'vt-card-states';

  if (activate) {
    activate.textContent = unit.activated
      ? 'Активирована'
      : 'Не активирована';

    activate.setAttribute(
      'aria-pressed',
      String(unit.activated)
    );

    activate.title = unit.activated
      ? 'Снять отметку активации'
      : 'Отметить модель активированной';

    states.append(activate);
  }

  if (fatigue) {
    fatigue.textContent = unit.fatigued
      ? 'Усталость: есть'
      : 'Усталость: нет';

    fatigue.title =
      'Ручная отметка. Игровые эффекты не применяются автоматически.';

    states.append(fatigue);
  }

  controls.append(states);

  if (stats) {
    stats.classList.add('vt-card-stats');
    controls.append(stats);
  }

  const lastMetadata = metadata.at(-1);

  if (lastMetadata) {
    lastMetadata.after(controls);
  } else if (heading) {
    heading.after(controls);
  } else {
    container.prepend(controls);
  }

  if (hpMinus && hpPlus) {
    originalHealth?.remove();
  }

  // Кнопки перенесены, прежняя пустая обёртка не нужна.
  originalActions?.remove();

  /* ======================================================================
     Подробности
     ====================================================================== */

  const facing = container.querySelector('.vt-facing-panel');

  if (facing) {
    fold('facing', `Фронт: ${facingLabel(unit)}`, [facing]);
  }

  const weapons = [
    ...container.querySelectorAll(':scope > .vt-weapon-block')
  ];

  if (weapons.length) {
    fold('weapons', `Оружие · ${weapons.length}`, weapons);
  }

  const abilities = [
    ...container.querySelectorAll(':scope > details.vt-detail-block')
  ];

  if (abilities.length) {
    abilities.forEach((element, index) => {
      element.dataset.panelSection = `ability:${index}`;
    });

    fold(
      'abilities',
      `Способности · ${abilities.length}`,
      abilities
    );
  }

  const artifact = container.querySelector(
    ':scope > .vt-artifact-block'
  );

  if (artifact) {
    fold('artifact', 'Артефакт', [artifact]);
  }

  if (markers) {
    // Усталость уже перенесена в основные состояния.
    // Оставшиеся элементы и ID заметки сохраняются.
    markers.querySelector('h3')?.remove();

    const explanation = markers.querySelector(
      ':scope > p.vt-muted'
    );

    if (explanation) {
      explanation.textContent =
        'Заметка относится только к этому экземпляру модели.';
    }

    fold(
      'note',
      unit.note ? 'Заметка · сохранена' : 'Заметка',
      [markers]
    );
  }

  if (reserve) {
    fold('more', 'Дополнительные действия', [reserve]);
  }

  /* ======================================================================
     Восстановление раскрытых разделов и фокуса
     ====================================================================== */

  if (sameUnit) {
    container.querySelectorAll('details').forEach(element => {
      const key = element.dataset.panelSection;

      if (openSections.has(key)) {
        element.open = openSections.get(key);
      }
    });
  }

  if (focusKey) {
    const replacement = [
      ...container.querySelectorAll('button, summary')
    ].find(element =>
      modelPanelFocusKey(element) === focusKey
    );

    if (replacement && !replacement.disabled) {
      replacement.focus({ preventScroll: true });
    }
  }
}

/**
 * Ключ элемента управления без привязки к его тексту.
 * Надпись кнопки может меняться после активации или установки маркера.
 */
function modelPanelFocusKey(element) {
  if (!(element instanceof HTMLElement)) return null;

  if (element.tagName === 'SUMMARY') {
    const section = element.parentElement?.dataset.panelSection;

    return section ? `summary:${section}` : null;
  }

  if (element.tagName !== 'BUTTON') return null;

  if (element.dataset.markerAction) {
    return `marker:${element.dataset.markerAction}`;
  }

  if (element.dataset.action) {
    return JSON.stringify([
      'action',
      element.dataset.action,
      element.dataset.delta || '',
      element.dataset.facing || '',
      element.dataset.turn || ''
    ]);
  }

  return null;
}

function statHTML(unit, key, label) {
  const total = unit.stats[key];
  const base = unit.base[key];

  const bonus = total !== null && base !== null
    ? total - base
    : 0;

  return `
    <div class="vt-stat">
      <span>${label}</span>
      <strong>${total === null ? '—' : escape(total)}</strong>
      ${bonus ? `
        <small>(${bonus > 0 ? '+' : ''}${bonus})</small>
      ` : ''}
    </div>
  `;
}

function renderDetails() {
  const unit = selectedUnit();

  if (!unit) {
    $('vt-details').innerHTML = `
      <p class="vt-muted">
        Выберите модель в списке или на поле.
      </p>
    `;

    return;
  }

  $('vt-details').innerHTML = `
    <h3>${unitNumber(unit)} ${escape(unit.uniqueKey)}</h3>

    <p class="vt-muted">${SIDE_NAMES[unitSide(unit)]}</p>
    <p class="vt-muted">${escape(unit.role)}</p>

    <p class="vt-muted">
      ${locationLabel(unit)} · ${statusLabel(unit)}
    </p>

    <section class="vt-facing-panel">
      <p class="vt-muted">
        Фронт: <strong>${facingLabel(unit)}</strong>
      </p>

      <div class="vt-facing-directions"
        role="group"
        aria-label="Направление фронта модели">

        ${FACING_ORDER.map(direction => `
          <button type="button"
            class="builder-action-btn
              ${unit.facing === direction ? 'primary' : ''}"
            data-action="facing"
            data-facing="${direction}"
            aria-label="Фронт: ${FACINGS[direction].name}"
            aria-pressed="${unit.facing === direction}">
            ${FACINGS[direction].arrow}
            ${FACINGS[direction].name}
          </button>
        `).join('')}
      </div>

      <div class="vt-detail-actions">
        <button type="button"
          class="builder-action-btn"
          data-action="rotate"
          data-turn="-1"
          ${unit.facing ? '' : 'disabled'}>
          ↶ На 90°
        </button>

        <button type="button"
          class="builder-action-btn"
          data-action="rotate"
          data-turn="1"
          ${unit.facing ? '' : 'disabled'}>
          ↷ На 90°
        </button>

        <button type="button"
          class="builder-action-btn"
          data-action="facing-clear"
          ${unit.facing ? '' : 'disabled'}>
          Снять направление
        </button>
      </div>

      <p class="vt-muted">
        Направления указаны относительно экрана.
        Вверх — к первой строке, вправо — к столбцу N.
        Действия и ресурсы за поворот автоматически не списываются.
      </p>
    </section>

    <div class="vt-stats">
      ${statHTML(unit, 'hp', 'Макс. ХП')}
      ${statHTML(unit, 'move', 'Движение')}
      ${statHTML(unit, 'armor', 'Броня')}
    </div>

    <p>
      Текущее ХП:
      <strong>${unit.currentHp} / ${unit.stats.hp}</strong>
    </p>

    <div class="vt-detail-actions">
      <button type="button"
        class="builder-action-btn"
        data-action="hp"
        data-delta="-1">
        −1 ХП
      </button>

      <button type="button"
        class="builder-action-btn"
        data-action="hp"
        data-delta="1">
        +1 ХП
      </button>

      <button type="button"
        class="builder-action-btn"
        data-action="activate">
        ${unit.activated
          ? 'Снять активацию'
          : 'Отметить активированным'}
      </button>

      <button type="button"
        class="builder-action-btn"
        data-action="reserve"
        ${unit.position ? '' : 'disabled'}>
        Вернуть в резерв
      </button>
    </div>

   ${unit.artifact ? `
  <section class="vt-detail-block vt-artifact-block">
        <strong>🎁 ${escape(unit.artifact.name)}</strong>
        <p>${escape(unit.artifact.description)}</p>
        <p>
          Постоянные бонусы учтены.
          Особый эффект применяется вручную.
        </p>
      </section>
    ` : ''}

    ${unit.weapons.map(weapon => `
  <section class="vt-detail-block vt-weapon-block">
        <strong>${escape(weapon.name)}</strong>
        <p>${escape(weapon.type)}</p>
        <p>${escape(weapon.stats)}</p>
      </section>
    `).join('')}

    ${unit.abilities.map(ability => `
      <details class="vt-detail-block">
        <summary>${escape(ability.title || 'Способность')}</summary>
        <p>${escape(ability.text)}</p>
      </details>
    `).join('')}
  `;
}

/* ==========================================================================
   Загрузка армии
   ========================================================================== */

$('vt-load').addEventListener('click', () => {
  try {
    assertTableWritable();
  } catch (error) {
    message(error.message, true);
    return;
  }

  const value = $('vt-roster-select').value;
  if (value === '') return;

  const choice = rosterChoices[Number(value)];
  if (!choice) return;

  const side = activeSide();

  if (
    sideRoster(side) &&
    !confirm(
      `Заменить армию стороны «${SIDE_NAMES[side]}» ` +
      `ростером «${choice.roster.name || 'Без имени'}»? ` +
      'Её позиции, ХП, активации, направления, усталость и заметки ' +
      'будут сброшены. Другая армия и ландшафт сохранятся. ' +
      'Общая история отмены будет очищена.'
    )
  ) {
    return;
  }

  try {
    const prepared = prepareArmy(choice.roster, side);
    const next = state ? clone(state) : emptyState();

    next.terrain ||= [];

    if (side === 'a') {
      next.roster = prepared.roster;
    } else {
      next.opponentRoster = prepared.roster;
    }

    next.units = next.units.filter(
      unit => unitSide(unit) !== side
    );

    next.units.push(...prepared.units);

    if (!validateState(next)) {
      throw new Error('Не удалось сформировать состояние двух армий.');
    }

    persist(next);

    state = next;
    selectedId = null;
    rememberSide(side);

    clearHistory();

    render();

    message(
      `${SIDE_NAMES[side]}: загружен ростер ` +
      `«${prepared.roster.name || 'Без имени'}». ` +
      'Новые модели находятся в резерве. История очищена.'
    );
  } catch (error) {
    message(`Не удалось загрузить армию: ${error.message}`, true);
  }
});

$('vt-refresh').addEventListener('click', () => {
  if (refreshRosters()) {
    message('Список ростеров обновлён.');
  }
});

$('vt-side-select').addEventListener('change', () => {
  rememberSide(activeSide());
  selectedId = null;
  render();
});

/* ==========================================================================
   Управление списком моделей
   ========================================================================== */

document.querySelectorAll('[data-list-side]').forEach(button => {
  button.addEventListener('click', () => {
    const side = button.dataset.listSide;

    if (!['a', 'b'].includes(side) || side === activeSide()) {
      return;
    }

    $('vt-side-select').value = side;

    // Используем тот же обработчик, что у основного выбора стороны.
    $('vt-side-select').dispatchEvent(
      new Event('change', { bubbles: true })
    );
  });
});

$('vt-unit-search').addEventListener('input', event => {
  unitListFilters[activeSide()].query = event.target.value;

  // Не перерисовываем поле и карточку модели при поиске.
  renderUnitList();
});

$('vt-unit-location').addEventListener('change', event => {
  const value = event.target.value;

  unitListFilters[activeSide()].location =
    ['all', 'board', 'reserve'].includes(value)
      ? value
      : 'all';

  renderUnitList();
});

$('vt-unit-status').addEventListener('change', event => {
  const value = event.target.value;

  unitListFilters[activeSide()].status =
    ['all', 'ready', 'activated', 'dead'].includes(value)
      ? value
      : 'all';

  renderUnitList();
});

$('vt-unit-filter-reset').addEventListener('click', () => {
  unitListFilters[activeSide()] = {
    query: '',
    location: 'all',
    status: 'all'
  };

  renderUnitList();
});

/* ==========================================================================
   Выбор модели
   ========================================================================== */

$('vt-unit-list').addEventListener('click', event => {
  const button = event.target.closest('[data-unit]');

  if (button) {
    selectUnit(button.dataset.unit);
  }
});

/* ==========================================================================
   Нажатия на поле
   ========================================================================== */

$('vt-board').addEventListener('click', event => {
  const cell = event.target.closest('button[data-x]');
  if (!cell) return;

  const x = Number(cell.dataset.x);
  const y = Number(cell.dataset.y);

  if (handleTerrainClick(x, y)) {
    render();
    return;
  }

  if (!state) return;

  const occupant = state.units.find(unit =>
    unit.position?.x === x &&
    unit.position?.y === y
  );

  if (occupant) {
    selectUnit(occupant.id);
    message(`Выбрана модель ${unitNumber(occupant)}.`);
    return;
  }

  const unit = selectedUnit();

  if (!unit) {
    message(
      'Сначала выберите модель в списке или на поле.',
      true
    );

    return;
  }

  const id = unit.id;

  commit(next => {
    const target = next.units.find(item => item.id === id);

    target.position = {
      x,
      y,
      surfaceId: 'ground'
    };
  }, `Модель ${unitNumber(unit)}: ${LETTERS[x]}${y + 1}.`);
});

/* ==========================================================================
   Предпросмотр размещения: мышь и клавиатура
   ========================================================================== */

$('vt-board').addEventListener('pointerover', event => {
  // На сенсорном экране не создаём «зависшее» наведение.
  if (event.pointerType === 'touch') return;

  const cell = event.target instanceof Element
    ? event.target.closest('button[data-x][data-y]')
    : null;

  if (cell) {
    showModelPreview(cell);
  }
});

$('vt-board').addEventListener('pointerleave', () => {
  clearModelPreview();

  const focused = document.activeElement;

  if (focused instanceof Element) {
    const cell = focused.closest('button[data-x][data-y]');

    if (cell && $('vt-board').contains(cell)) {
      showModelPreview(cell);
    }
  }
});

$('vt-board').addEventListener('focusin', event => {
  const cell = event.target instanceof Element
    ? event.target.closest('button[data-x][data-y]')
    : null;

  if (cell) {
    showModelPreview(cell);
  }
});

$('vt-board').addEventListener('focusout', () => {
  clearModelPreview();
});

document.addEventListener('vt:terrain-mode', clearModelPreview);
document.addEventListener('vt:ruler-mode', clearModelPreview);

/* ==========================================================================
   Esc: снять выбор только при работе с моделями
   ========================================================================== */

document.addEventListener('keydown', event => {
  if (
    event.key !== 'Escape' ||
    event.defaultPrevented ||
    event.isComposing ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    !selectedUnit() ||
    $('vt-board').dataset.fieldTool !== 'models'
  ) {
    return;
  }

  const target = event.target;

  if (target instanceof Element) {
    if (
      target.closest('input, textarea, select') ||
      target.closest('[role="textbox"]') ||
      (
        target instanceof HTMLElement &&
        target.isContentEditable
      ) ||
      target.closest('details[open]')
    ) {
      return;
    }
  }

  // Открытый диалог имеет приоритет над снятием выбора.
  const visibleDialog = [
    ...document.querySelectorAll(
      'dialog[open], [role="dialog"], [aria-modal="true"]'
    )
  ].some(element => {
    const style = getComputedStyle(element);

    return element.getClientRects().length > 0 &&
      style.visibility !== 'hidden' &&
      style.display !== 'none';
  });

  if (visibleDialog) return;

  event.preventDefault();

  // Используем существующее действие, без записи в историю.
  $('vt-deselect').click();
});

/* ==========================================================================
   Редактирование модели
   ========================================================================== */

$('vt-details').addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  const unit = selectedUnit();

  if (!button || !unit || button.disabled) return;

  const id = unit.id;
  const action = button.dataset.action;

  if (![
    'hp',
    'activate',
    'reserve',
    'facing',
    'rotate',
    'facing-clear'
  ].includes(action)) {
    return;
  }

  const facingAction = [
    'facing',
    'rotate',
    'facing-clear'
  ].includes(action);

  const successText = facingAction
    ? 'Направление фронта сохранено. Ресурсы не списывались.'
    : 'Изменение сохранено локально.';

  commit(next => {
    const target = next.units.find(item => item.id === id);

    if (!target) {
      throw new Error('Модель не найдена.');
    }

    if (action === 'hp') {
      const delta = Number(button.dataset.delta);

      if (![-1, 1].includes(delta)) {
        throw new Error('Некорректное изменение ХП.');
      }

      target.currentHp = Math.max(
        0,
        Math.min(target.stats.hp, target.currentHp + delta)
      );
    }

    if (action === 'activate') {
      target.activated = !target.activated;
    }

    if (action === 'reserve') {
      target.position = null;
    }

    if (action === 'facing') {
      const direction = button.dataset.facing;

      if (!Object.hasOwn(FACINGS, direction)) {
        throw new Error('Неизвестное направление фронта.');
      }

      target.facing = direction;
    }

    if (action === 'rotate') {
      const index = FACING_ORDER.indexOf(target.facing);
      const turn = Number(button.dataset.turn);

      if (index < 0) {
        throw new Error('Сначала задайте направление фронта.');
      }

      if (![-1, 1].includes(turn)) {
        throw new Error('Некорректный поворот.');
      }

      target.facing = FACING_ORDER[
        (index + turn + FACING_ORDER.length) % FACING_ORDER.length
      ];
    }

    if (action === 'facing-clear') {
      target.facing = null;
    }
  }, successText);
});

/* ==========================================================================
   Возврат стороны в резерв
   ========================================================================== */

$('vt-clear').addEventListener('click', () => {
  if (!state) return;

  const side = activeSide();
  const units = state.units.filter(unit => unitSide(unit) === side);

  if (!units.length) {
    message('У выбранной стороны нет моделей.', true);
    return;
  }

  if (
    !confirm(
      `Вернуть все модели стороны «${SIDE_NAMES[side]}» в резерв? ` +
      'ХП, активации, направления, усталость, заметки, ' +
      'другая армия и ландшафт сохранятся.'
    )
  ) {
    return;
  }

  commit(next => {
    next.units.forEach(unit => {
      if (unitSide(unit) === side) {
        unit.position = null;
      }
    });
  }, `${SIDE_NAMES[side]}: все модели возвращены в резерв.`);
});

/* ==========================================================================
   Выбор и масштаб
   ========================================================================== */

$('vt-deselect').addEventListener('click', () => {
  selectedId = null;
  render();
});

function applyZoom() {
  const size = Number($('vt-zoom').value);

  $('vt-board').style.setProperty('--vt-cell', `${size}px`);
  $('vt-zoom-value').textContent = `${size} px`;
}

$('vt-zoom').addEventListener('input', applyZoom);

/* ==========================================================================
   Инициализация модулей
   ========================================================================== */

initTerrainEditor({
  getState: () => state,
  commit,
  message,
  render
});

initModelMarkers({
  getSelectedUnit: selectedUnit,
  commit,
  message
});

initRounds({
  getState: () => state,
  commit,
  message
});

initHistory({
  getState: () => state,

  applyState: restored => {
    if (!validateState(restored)) {
      throw new Error('Некорректное состояние в истории.');
    }

    persist(restored);
    state = restored;

    if (
      selectedId &&
      !state.units.some(unit => unit.id === selectedId)
    ) {
      selectedId = null;
    }

    render();
  },

  message
});

initTableMapMarkers();

initSessionControls({
  getState: () => state,
  validateState,
  assertWritable: assertTableWritable,
  message
});

initWorkshopMaps({
  getState: () => state,
  commit,
  assertWritable: assertTableWritable,
  message
});

initTableScenarios({
  getState: () => state,
  commit,
  assertWritable: assertTableWritable,
  message
});

/* ==========================================================================
   Переход в билдер и возвращение
   ========================================================================== */

$('vt-open-builder').addEventListener('click', () => {
  const side = activeSide();

  rememberSide(side);

  try {
    sessionStorage.setItem(BUILDER_SIDE_KEY, side);
  } catch {
    // Навигация продолжится без маркера.
  }
});

window.addEventListener('pageshow', () => {
  restoreSide();

  let builderSide = null;

  try {
    builderSide = sessionStorage.getItem(BUILDER_SIDE_KEY);

    if (builderSide === 'a' || builderSide === 'b') {
      $('vt-side-select').value = builderSide;
      rememberSide(builderSide);
      sessionStorage.removeItem(BUILDER_SIDE_KEY);
    }
  } catch {
    // Работа стола не зависит от маркера перехода.
  }

  const returnedFromBuilder =
    builderSide === 'a' || builderSide === 'b';

  const refreshed = refreshRosters({
    preferActive: returnedFromBuilder
  });

  selectedId = null;
  render();

  if (returnedFromBuilder && refreshed) {
    message(
      `${SIDE_NAMES[builderSide]}: выберите актуальный ростер ` +
      'и нажмите «Загрузить на стол». ' +
      'Если в списке осталась старая армия, нажмите «В бой» ' +
      'в билдере или сохраните новый ростер под отдельным именем.'
    );
  }
});

window.addEventListener('focus', () => {
  refreshRosters();
});

window.addEventListener('storage', event => {
  if (event.storageArea !== localStorage) return;

  if (
    event.key === 'activeRoster' ||
    event.key === 'savedRosters' ||
    event.key === null
  ) {
    refreshRosters();
  }

  if (event.key !== STORAGE_KEY && event.key !== null) {
    return;
  }

  try {
    const actualRaw = localStorage.getItem(STORAGE_KEY);

    if (actualRaw === expectedTableRaw) return;

    lockTableWrites(
      'external',
      'Основная партия изменена или удалена в другой вкладке. ' +
      'Текущее отображение может быть устаревшим. ' +
      'Запись армий и поля приостановлена: ' +
      'перезагрузите актуальное сохранение перед продолжением.'
    );
  } catch (error) {
    lockTableWrites(
      'storage',
      `Не удалось проверить внешнее изменение: ${error.message}`
    );
  }
});

/* ==========================================================================
   Первоначальное восстановление
   ========================================================================== */

refreshRosters();

try {
  expectedTableRaw = localStorage.getItem(STORAGE_KEY);

  const saved = expectedTableRaw === null
    ? null
    : JSON.parse(expectedTableRaw);

  if (saved !== null) {
    if (!validateState(saved)) {
      throw new Error(
        'Сохранённое состояние имеет неподдерживаемый формат.'
      );
    }

    saved.terrain ||= [];
    saved.opponentRoster ||= null;
    saved.round ??= 1;

    saved.units.forEach(unit => {
      unit.side ||= 'a';
      unit.facing ??= null;
      unit.fatigued ??= false;
      unit.note ??= '';
    });

    state = saved;

    if (!state.roster && state.opponentRoster) {
      $('vt-side-select').value = 'b';
    }

    message('Локальная партия и поле восстановлены.');
  }
} catch (error) {
  lockTableWrites(
    'damaged',
    `Не удалось восстановить стол: ${error.message} ` +
    'Автоматическая запись основной партии заблокирована. ' +
    'Исходное сохранение не изменено. ' +
    'Можно повторить загрузку или явно разрешить его замену.'
  );
}

restoreSide();
applyZoom();
render();

initTableBackup({
  getState: () => state,

  validateState: table => {
    return validateBackupTable(table, validateState);
  },

  assertWritable: assertTableWritable
});