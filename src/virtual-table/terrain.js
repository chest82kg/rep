// src/virtual-table/terrain.js
//
// Ручной редактор составных тайлов.
// Высота не применяет игровые эффекты автоматически.
// Перенос тайла не перемещает модели.

const SIZE = 14;

export const TERRAIN_TYPES = {
  meadow: { name: 'Луг', icon: '·' },
  forest: { name: 'Лес', icon: '♣' },
  river: { name: 'Река', icon: '≈' },
  mountain: { name: 'Гора', icon: '▲' }
};

const SHAPES = {
  rectangle: 'Прямоугольник',
  corner: 'Угол',
  line: 'Линия'
};

const HINTS = {
  models: 'Модели · выберите жетон или разместите выбранную модель.',
  select: 'Ландшафт · нажмите клетку тайла для его выбора.',
  place: 'Ландшафт · выберите верхний левый угол нового тайла.',
  move: 'Ландшафт · выберите новый верхний левый угол выбранного тайла.'
};

const $ = id => document.getElementById(id);

let getState;
let commit;
let notify;
let redraw;

let mode = 'models';
let selectedTileId = null;

/* ==========================================================================
   Публичное управление инструментом
   ========================================================================== */

export function getTerrainMode() {
  return mode;
}

export function setTerrainMode(nextMode) {
  if (!Object.hasOwn(HINTS, nextMode)) {
    throw new Error('Неизвестный режим редактора ландшафта.');
  }

  if (nextMode === 'move' && !selectedTile()) {
    nextMode = 'select';
  }

  mode = nextMode;

  if (mode === 'models') {
    selectedTileId = null;
  }

  renderTerrainEditor();
  redraw?.();
}

function announceMode() {
  document.dispatchEvent(new CustomEvent('vt:terrain-mode', {
    detail: {
      mode,
      hint: HINTS[mode]
    }
  }));
}

/* ==========================================================================
   Данные тайлов
   ========================================================================== */

function selectedTile() {
  return getState?.()?.terrain?.find(
    tile => tile.id === selectedTileId
  ) || null;
}

export function tileCells(tile) {
  return tile.cells.map(cell => ({
    x: tile.x + cell.x,
    y: tile.y + cell.y
  }));
}

export function terrainAt(terrain, x, y) {
  return (terrain || []).find(tile =>
    tileCells(tile).some(cell => cell.x === x && cell.y === y)
  ) || null;
}

function checkPlacement(tile, terrain, excludedId = null) {
  const occupied = new Set();

  (terrain || []).forEach(other => {
    if (other.id === excludedId) return;

    tileCells(other).forEach(cell => {
      occupied.add(`${cell.x}:${cell.y}`);
    });
  });

  for (const cell of tileCells(tile)) {
    if (
      cell.x < 0 ||
      cell.y < 0 ||
      cell.x >= SIZE ||
      cell.y >= SIZE
    ) {
      throw new Error('Тайл выходит за границы поля.');
    }

    if (occupied.has(`${cell.x}:${cell.y}`)) {
      throw new Error(
        'Это место занято другим тайлом. ' +
        'Наложение слоёв пока не поддерживается.'
      );
    }
  }
}

/* ==========================================================================
   Проверка сохранения
   ========================================================================== */

export function validateTerrain(terrain) {
  if (terrain === undefined) return true;
  if (!Array.isArray(terrain)) return false;

  const ids = new Set();
  const occupied = new Set();

  return terrain.every(tile => {
    if (
      !tile ||
      typeof tile.id !== 'string' ||
      ids.has(tile.id) ||
      !Object.hasOwn(TERRAIN_TYPES, tile.type) ||
      !Number.isInteger(tile.x) ||
      !Number.isInteger(tile.y) ||
      !Number.isSafeInteger(tile.height) ||
      !Array.isArray(tile.cells) ||
      tile.cells.length < 1 ||
      tile.cells.length > SIZE * SIZE
    ) {
      return false;
    }

    ids.add(tile.id);

    const ownCells = new Set();

    for (const offset of tile.cells) {
      if (
        !offset ||
        !Number.isInteger(offset.x) ||
        !Number.isInteger(offset.y) ||
        offset.x < 0 ||
        offset.y < 0
      ) {
        return false;
      }

      const localKey = `${offset.x}:${offset.y}`;

      if (ownCells.has(localKey)) return false;
      ownCells.add(localKey);

      const x = tile.x + offset.x;
      const y = tile.y + offset.y;
      const key = `${x}:${y}`;

      if (
        x < 0 ||
        y < 0 ||
        x >= SIZE ||
        y >= SIZE ||
        occupied.has(key)
      ) {
        return false;
      }

      occupied.add(key);
    }

    return true;
  });
}

/* ==========================================================================
   Параметры нового тайла
   ========================================================================== */

function buildShape() {
  const shape = $('vt-terrain-shape').value;
  const width = Number($('vt-terrain-width').value);
  const depth = Number($('vt-terrain-depth').value);

  if (!Object.hasOwn(SHAPES, shape)) {
    throw new Error('Неизвестная форма тайла.');
  }

  if (
    !Number.isInteger(width) ||
    !Number.isInteger(depth) ||
    width < 1 ||
    width > SIZE ||
    depth < 1 ||
    depth > SIZE
  ) {
    throw new Error('Размеры должны быть целыми числами от 1 до 14.');
  }

  const cells = [];

  for (let y = 0; y < depth; y++) {
    for (let x = 0; x < width; x++) {
      if (shape === 'line' && y !== 0) continue;

      if (shape === 'corner' && x !== 0 && y !== depth - 1) {
        continue;
      }

      cells.push({ x, y });
    }
  }

  return cells;
}

function readHeight() {
  const raw = $('vt-terrain-height').value.trim();
  const height = Number(raw);

  if (raw === '' || !Number.isSafeInteger(height)) {
    throw new Error('Высота должна быть целым числом.');
  }

  return height;
}

/* ==========================================================================
   Панель
   ========================================================================== */

export function initTerrainEditor(options) {
  getState = options.getState;
  commit = options.commit;
  notify = options.message;
  redraw = options.render;

  const container = $('vt-terrain-editor');

  container.innerHTML = `
    <h2>Ландшафт</h2>

    <p class="vt-muted">
      Инструмент поля выбирается на панели под сеткой.
Кнопки ниже включают выбор, добавление или перенос тайла.
    </p>

    <div class="vt-terrain-modes">
      <button type="button"
        class="builder-action-btn"
        data-terrain-mode="select">
        Выбрать тайл
      </button>

      <button type="button"
        class="builder-action-btn"
        data-terrain-mode="place">
        Добавить тайл
      </button>
    </div>

    <div class="vt-terrain-form">
      <label>
        Тип
        <select id="vt-terrain-type">
          ${Object.entries(TERRAIN_TYPES).map(([key, value]) => `
            <option value="${key}">${value.name}</option>
          `).join('')}
        </select>
      </label>

      <label>
        Форма
        <select id="vt-terrain-shape">
          ${Object.entries(SHAPES).map(([key, value]) => `
            <option value="${key}">${value}</option>
          `).join('')}
        </select>
      </label>

      <label>
        Ширина
        <input id="vt-terrain-width"
          type="number" min="1" max="14" step="1" value="2">
      </label>

      <label>
        Глубина
        <input id="vt-terrain-depth"
          type="number" min="1" max="14" step="1" value="2">
      </label>

      <label>
        Высота
        <input id="vt-terrain-height"
          type="number" step="1" value="0">
      </label>
    </div>

    <p class="vt-muted">
      Размеры задаются в клетках.
      Для линии используется только ширина.
      Точка размещения — верхний левый угол габарита.
    </p>

    <div id="vt-terrain-selection"></div>

    <div class="vt-detail-actions">
      <button type="button"
        class="builder-action-btn"
        data-terrain-action="move">
        Перенести
      </button>

      <button type="button"
        class="builder-action-btn"
        data-terrain-action="rotate">
        Повернуть ↻
      </button>

      <button type="button"
        class="builder-action-btn"
        data-terrain-action="height">
        Задать высоту
      </button>

      <button type="button"
        class="builder-action-btn"
        data-terrain-action="delete">
        Удалить тайл
      </button>
    </div>

    <p id="vt-terrain-help" class="vt-muted"></p>

    <p class="vt-muted">
      Высота и ландшафт не изменяют характеристики автоматически.
      При переносе или повороте тайла модели остаются на своих клетках.
    </p>
  `;

  container.addEventListener('click', handleEditorAction);
  renderTerrainEditor();
}

/* ==========================================================================
   Действия панели
   ========================================================================== */

function handleEditorAction(event) {
  const modeButton = event.target.closest('[data-terrain-mode]');

  if (modeButton) {
    setTerrainMode(modeButton.dataset.terrainMode);
    return;
  }

  const button = event.target.closest('[data-terrain-action]');
  if (!button || button.disabled) return;

  const tile = selectedTile();

  if (!tile) {
    notify('Сначала выберите тайл на поле.', true);
    return;
  }

  const action = button.dataset.terrainAction;

  if (action === 'move') {
    setTerrainMode('move');

    notify('Нажмите клетку для нового верхнего левого угла тайла.');
    return;
  }

  if (action === 'delete') {
    if (
      !confirm(
        'Удалить выбранный тайл? Модели останутся на своих клетках.'
      )
    ) {
      return;
    }

    commit(next => {
      next.terrain = (next.terrain || []).filter(
        item => item.id !== tile.id
      );
    }, 'Тайл удалён. Положение моделей не изменено.');

    return;
  }

  if (action === 'height') {
    commit(next => {
      const target = next.terrain.find(item => item.id === tile.id);
      target.height = readHeight();
    }, 'Высота тайла изменена.');

    return;
  }

  if (action === 'rotate') {
    commit(next => {
      const target = next.terrain.find(item => item.id === tile.id);
      const maxY = Math.max(...target.cells.map(cell => cell.y));

      const rotated = {
        ...target,
        cells: target.cells.map(cell => ({
          x: maxY - cell.y,
          y: cell.x
        }))
      };

      checkPlacement(rotated, next.terrain, tile.id);
      target.cells = rotated.cells;
    }, 'Тайл повёрнут. Модели автоматически не перемещаются.');
  }
}

/* ==========================================================================
   Обновление панели
   ========================================================================== */

export function renderTerrainEditor() {
  if (!getState || !$('vt-terrain-selection')) return;

  let tile = selectedTile();

  if (!tile && selectedTileId) {
    selectedTileId = null;

    if (mode === 'move') mode = 'select';

    tile = null;
  }

  document.querySelectorAll('[data-terrain-mode]').forEach(button => {
    const active =
      button.dataset.terrainMode === mode ||
      (
        mode === 'move' &&
        button.dataset.terrainMode === 'select'
      );

    button.classList.toggle('primary', active);
    button.setAttribute('aria-pressed', String(active));
  });

  document.querySelectorAll('[data-terrain-action]').forEach(button => {
    button.disabled = !tile;
  });

  const selection = $('vt-terrain-selection');
  selection.replaceChildren();

  if (tile) {
    const block = document.createElement('div');
    block.className = 'vt-detail-block';

    const title = document.createElement('strong');
    title.textContent = TERRAIN_TYPES[tile.type].name;

    const description = document.createElement('p');
    description.textContent =
      `Клеток: ${tile.cells.length} · Высота: ${tile.height}`;

    block.append(title, description);
    selection.append(block);
  } else {
    const text = document.createElement('p');
    text.className = 'vt-muted';
    text.textContent = 'Тайл не выбран.';
    selection.append(text);
  }

  $('vt-terrain-help').textContent = HINTS[mode];
  announceMode();
}

/* ==========================================================================
   Поле
   ========================================================================== */

export function handleTerrainClick(x, y) {
  if (mode === 'models') return false;

  if (!getState()) {
    notify('Сначала загрузите хотя бы одну армию на стол.', true);
    return true;
  }

  if (mode === 'select') {
    const tile = terrainAt(getState().terrain, x, y);
    selectedTileId = tile?.id || null;

    if (tile) {
      $('vt-terrain-height').value = String(tile.height);
    }

    renderTerrainEditor();

    notify(
      tile
        ? `Выбран тайл: ${TERRAIN_TYPES[tile.type].name}.`
        : 'В этой клетке нет тайла.'
    );

    return true;
  }

  if (mode === 'place') {
    commit(next => {
      const type = $('vt-terrain-type').value;

      if (!Object.hasOwn(TERRAIN_TYPES, type)) {
        throw new Error('Неизвестный тип ландшафта.');
      }

      const tile = {
        id: crypto.randomUUID(),
        type,
        x,
        y,
        height: readHeight(),
        cells: buildShape()
      };

      next.terrain ||= [];

      checkPlacement(tile, next.terrain);
      next.terrain.push(tile);
    }, 'Тайл добавлен.');

    return true;
  }

  if (mode === 'move') {
    const tile = selectedTile();

    if (!tile) {
      notify('Тайл не выбран.', true);
      return true;
    }

    commit(next => {
      const target = next.terrain.find(item => item.id === tile.id);

      const moved = { ...target, x, y };

      checkPlacement(moved, next.terrain, tile.id);

      target.x = x;
      target.y = y;
    }, 'Тайл перенесён. Модели остались на прежних клетках.');

    return true;
  }

  return true;
}

/* ==========================================================================
   Отображение клетки
   ========================================================================== */

export function terrainCellView(terrain, x, y) {
  const tile = terrainAt(terrain, x, y);

  if (!tile) {
    return {
      type: 'empty',
      title: 'Без тайла',
      html: '',
      selected: false
    };
  }

  const info = TERRAIN_TYPES[tile.type];
  const anchor = tile.cells[0];

  const isLabelCell =
    x === tile.x + anchor.x &&
    y === tile.y + anchor.y;

  return {
    type: tile.type,
    title: `${info.name}, высота ${tile.height}`,
    selected: tile.id === selectedTileId,
    html: isLabelCell
      ? `
        <span class="vt-terrain-label" aria-hidden="true">
          <span class="vt-terrain-label-name">
            ${info.name}
          </span>
          <span class="vt-terrain-label-height">
            В: ${tile.height}
          </span>
        </span>
      `
      : ''
  };
}