// src/virtual-table/terrain.js
//
// Локальный ручной редактор тайлов.
//
// Поддерживает:
// — прежний непересекающийся ландшафт;
// — явно заданные слои;
// — переход старого набора на слои через commit;
// — поклеточную сумму высот;
// — выбор тайла из стека.
//
// Модели при изменении тайлов не перемещаются.
// Игровые эффекты автоматически не применяются.

import {
  buildTerrainLayers,
  readLayeredSurface,
  terrainTileMovement,
  previewTerrainTileMove
} from './terrain-layers.js';

import { initIsometricCamera } from './isometric-camera.js';

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
  select: 'Ландшафт · нажмите клетку, затем выберите тайл из списка слоёв.',
  place: 'Ландшафт · выберите верхний левый угол нового тайла.',
  move:
    'Ландшафт · выберите новый верхний левый угол выбранного тайла. ' +
    'Esc — отменить подготовку переноса без изменений.'
  };

const $ = id => document.getElementById(id);

let getState;
let commit;
let notify;
let redraw;

let mode = 'models';
let selectedTileId = null;
let selectedPoint = null;

/* ==========================================================================
   Проверка геометрии одного тайла
   ========================================================================== */

// Не вызывает buildTerrainLayers.
// Используется также общим модулем terrain-layers.js.
export function validateTerrainTile(tile) {
  if (
    !tile ||
    typeof tile !== 'object' ||
    typeof tile.id !== 'string' ||
    tile.id.length === 0 ||
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

    const key = `${offset.x}:${offset.y}`;

    if (ownCells.has(key)) return false;
    ownCells.add(key);

    const x = tile.x + offset.x;
    const y = tile.y + offset.y;

    if (
      x < 0 ||
      y < 0 ||
      x >= SIZE ||
      y >= SIZE
    ) {
      return false;
    }
  }

  return true;
}

export function tileCells(tile) {
  return tile.cells.map(cell => ({
    x: tile.x + cell.x,
    y: tile.y + cell.y
  }));
}

// Пустой набор не требует отдельной миграции:
// первый новый тайл сразу получает layer.
export function terrainIsLayered(terrain) {
  return Array.isArray(terrain) &&
    terrain.every(tile =>
      tile &&
      Object.hasOwn(tile, 'layer')
    );
}

export function validateTerrain(terrain) {
  if (terrain === undefined) return true;
  if (!Array.isArray(terrain)) return false;

  const ids = new Set();

  for (const tile of terrain) {
    if (!validateTerrainTile(tile) || ids.has(tile.id)) {
      return false;
    }

    ids.add(tile.id);
  }

  const withLayer = terrain.filter(tile =>
    Object.hasOwn(tile, 'layer')
  ).length;

  if (withLayer > 0) {
    // Смешанный набор не принимаем.
    if (withLayer !== terrain.length) return false;

    try {
      buildTerrainLayers(terrain);
      return true;
    } catch {
      return false;
    }
  }

  // Совместимость: старый формат остаётся непересекающимся.
  const occupied = new Set();

  for (const tile of terrain) {
    for (const cell of tileCells(tile)) {
      const key = `${cell.x}:${cell.y}`;

      if (occupied.has(key)) return false;
      occupied.add(key);
    }
  }

  return true;
}

/* ==========================================================================
   Чтение поверхности
   ========================================================================== */

function stackAt(terrain, x, y) {
  return (terrain || [])
    .filter(tile =>
      tileCells(tile).some(cell =>
        cell.x === x && cell.y === y
      )
    )
    .sort((first, second) =>
      (first.layer ?? 0) - (second.layer ?? 0)
    );
}

export function terrainAt(terrain, x, y) {
  const stack = stackAt(terrain, x, y);
  return stack[stack.length - 1] || null;
}

// Создаёт читатель поверхности для неизменяемого снимка.
// Общий расчёт выполняется один раз, а не на каждую точку маршрута.
export function createTerrainSurfaceReader(terrain) {
  if (!validateTerrain(terrain)) {
    return () => ({
      name: 'Данные местности недоступны',
      height: null
    });
  }

  if (terrainIsLayered(terrain)) {
    const layers = buildTerrainLayers(terrain);

    return point => readLayeredSurface(layers, point);
  }

  return point => {
    const tile = terrainAt(terrain, point.x, point.y);

    return tile
      ? {
          name: TERRAIN_TYPES[tile.type].name,
          height: tile.height,
          tileId: tile.id
        }
      : {
          name: 'Без тайла',
          height: null,
          tileId: null
        };
  };
}

/* ==========================================================================
   Выбор и режим
   ========================================================================== */

function selectedTile() {
  return getState?.()?.terrain?.find(
    tile => tile.id === selectedTileId
  ) || null;
}

// Только чтение существующего выбора редактора.
// Второй механизм выбора и отдельное состояние не создаются.
export function getSelectedTerrainTileId() {
  return selectedTile()?.id ?? null;
}

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
    selectedPoint = null;
  }

  renderTerrainEditor();
  redraw?.();
}

function announceMode() {
  document.dispatchEvent(new CustomEvent('vt:terrain-mode', {
    detail: { mode, hint: HINTS[mode] }
  }));
}

function chooseTile(tile) {
  selectedTileId = tile?.id || null;

  if (tile) {
    $('vt-terrain-height').value = String(tile.height);
  }
}

/* ==========================================================================
   Размещение
   ========================================================================== */

function checkPlacement(tile, terrain, excludedId = null) {
  if (!validateTerrainTile(tile)) {
    throw new Error(
      'Некорректная форма тайла или выход за границы поля.'
    );
  }

  const candidate = (terrain || [])
    .filter(other => other.id !== excludedId);

  candidate.push(tile);

  if (!validateTerrain(candidate)) {
    throw new Error(
      'Не удалось разместить тайл. ' +
      'Для наложения переведите весь ландшафт на слои. ' +
      'Также проверьте порядок слоёв и суммарные высоты.'
    );
  }
}

// Запрещает накрывать клетки с моделями.
//
// movingUnitIds будет использоваться следующим пакетом:
// модели, перемещаемые вместе с тайлом, не считаются
// посторонними. Пока вызываем без исключений.
//
// Не меняет переданное состояние.
function checkTileModelCollisions(
  tile,
  units,
  movingUnitIds = new Set()
) {
  const destination = new Set(
    tileCells(tile).map(cell => `${cell.x}:${cell.y}`)
  );

  const conflicts = (units || []).filter(unit =>
    unit.position &&
    !movingUnitIds.has(unit.id) &&
    destination.has(
      `${unit.position.x}:${unit.position.y}`
    )
  );

  if (conflicts.length === 0) return;

  const first = conflicts[0];
  const { x, y } = first.position;

  const coordinate = `${'ABCDEFGHIJKLMN'[x]}${y + 1}`;
  const side = first.side === 'b' ? 'Б' : 'А';

  const number = Number.isInteger(first.rosterIndex)
    ? `${side}${first.rosterIndex + 1}`
    : side;

  throw new Error(
    `Тайл накрывает клетку ${coordinate} ` +
    `с моделью ${number}. ` +
    'Сначала переместите модель.' +
    (
      conflicts.length > 1
        ? ` Всего занятых клеток под тайлом: ${conflicts.length}.`
        : ''
    )
  );
}

function nextLayer(terrain) {
  const highest = terrain.reduce(
    (maximum, tile) => Math.max(maximum, tile.layer),
    -1
  );

  if (highest >= Number.MAX_SAFE_INTEGER) {
    throw new Error('Исчерпан диапазон порядка слоёв.');
  }

  return highest + 1;
}

function requireUncovered(terrain, tileId) {
  if (!terrainIsLayered(terrain)) return;

  const movement = terrainTileMovement(
    buildTerrainLayers(terrain),
    tileId
  );

  if (!movement.allowed) {
    throw new Error(
      'Тайл перекрыт сверху другим тайлом. ' +
      'Перенос и поворот недоступны.'
    );
  }
}

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
    width < 1 || width > SIZE ||
    depth < 1 || depth > SIZE
  ) {
    throw new Error('Размеры должны быть целыми числами от 1 до 14.');
  }

  const cells = [];

  for (let y = 0; y < depth; y += 1) {
    for (let x = 0; x < width; x += 1) {
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
    throw new Error('Высота должна быть точным целым числом.');
  }

  return height;
}

/* ==========================================================================
   Отмена подготовки переноса
   ========================================================================== */

function handleTerrainMoveEscape(event) {
  if (
    mode !== 'move' ||
    event.key !== 'Escape' ||
    event.defaultPrevented ||
    event.isComposing ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey
  ) {
    return;
  }

  const target = event.target;

  // Не мешаем редактированию полей.
  if (
    target instanceof Element &&
    (
      target.closest(
        'input, textarea, select, [role="textbox"]'
      ) ||
      (
        target instanceof HTMLElement &&
        target.isContentEditable
      )
    )
  ) {
    return;
  }

  // Диалоги имеют приоритет над инструментами поля.
  const visibleDialog = [
    ...document.querySelectorAll(
      'dialog[open], [role="dialog"], [aria-modal="true"]'
    )
  ].some(dialog => {
    const style = getComputedStyle(dialog);

    return dialog.getClientRects().length > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden';
  });

  if (visibleDialog) return;

  event.preventDefault();
  event.stopImmediatePropagation();

  // Только интерфейс: сохраняем выбранный тайл,
  // но больше не ждём точки переноса.
  // commit и общую историю не вызываем.
  setTerrainMode('select');

  notify(
    'Подготовка переноса отменена. ' +
    'Тайл и модели остались на прежних местах.'
  );

  // Если пользователь работал с картой, возвращаем
  // фокус в доступную кнопку выбора тайла.
  const selectButton = document.querySelector(
    '#vt-terrain-editor button[data-terrain-mode="select"]'
  );

  if (
    selectButton instanceof HTMLButtonElement &&
    !selectButton.disabled &&
    selectButton.getClientRects().length > 0 &&
    getComputedStyle(selectButton).visibility !== 'hidden'
  ) {
    selectButton.focus({ preventScroll: true });
  }
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

    <p id="vt-terrain-format" class="vt-muted"></p>

    <button type="button"
      class="builder-action-btn"
      data-terrain-action="migrate">
      Перевести ландшафт на слои
    </button>

    <p class="vt-muted">
      Инструмент поля выбирается на панели под сеткой.
      Нажмите клетку для выбора тайла и просмотра её слоёв.
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
        Собственная высота
        <input id="vt-terrain-height"
          type="number" step="1" value="0">
      </label>
    </div>

    <p class="vt-muted">
      Размеры задаются в клетках.
      Для линии используется только ширина.
      Точка размещения — верхний левый угол габарита.
      В многослойном формате новый тайл добавляется сверху.
    </p>

    <div id="vt-terrain-selection"></div>
    <div id="vt-terrain-stack"></div>

    <div class="vt-detail-actions">
      <button type="button" class="builder-action-btn"
        data-terrain-action="move">Перенести</button>
      <button type="button" class="builder-action-btn"
        data-terrain-action="cancel-move" hidden>
        Отменить перенос
      </button>
      <button type="button" class="builder-action-btn"
        data-terrain-action="rotate">Повернуть ↻</button>
      <button type="button" class="builder-action-btn"
        data-terrain-action="height">Задать высоту</button>
      <button type="button" class="builder-action-btn"
        data-terrain-action="delete">Удалить тайл</button>
    </div>

    <p id="vt-terrain-help" class="vt-muted"></p>

        <p class="vt-muted">
      Высота и ландшафт не изменяют характеристики автоматически.
      При переносе верхнего тайла модели с назначенной
      опорой на него перемещаются вместе с ним.
      Посторонняя модель под тайлом в месте назначения
      блокирует перенос целиком.
      Поворот тайла вместе с моделями пока не подключён.
    </p>
  `;

  container.addEventListener('click', handleEditorAction);

  document.addEventListener(
    'keydown',
    handleTerrainMoveEscape
  );

  renderTerrainEditor();
}

/* ==========================================================================
   Действия панели
   ========================================================================== */

function handleEditorAction(event) {
  const pick = event.target.closest('[data-terrain-pick]');

  if (pick) {
    const tile = getState()?.terrain?.find(
      item => item.id === pick.dataset.terrainPick
    );

    chooseTile(tile);
    redraw?.();
    return;
  }

  const modeButton = event.target.closest('[data-terrain-mode]');

  if (modeButton) {
    setTerrainMode(modeButton.dataset.terrainMode);
    return;
  }

  const button = event.target.closest('[data-terrain-action]');
  if (!button || button.disabled) return;

  const action = button.dataset.terrainAction;

    if (action === 'cancel-move') {
    if (mode !== 'move') return;

    // Только смена инструмента.
    // Выбранный тайл сохраняется, commit не вызывается.
    setTerrainMode('select');

    notify(
      'Подготовка переноса отменена. ' +
      'Тайл и модели остались на прежних местах.'
    );

    return;
  }

  if (action === 'migrate') {
    const terrain = getState()?.terrain || [];

    if (
      !getState() ||
      terrain.length === 0 ||
      terrainIsLayered(terrain)
    ) {
      return;
    }

    if (!confirm(
      'Перевести локальный ландшафт на слои?\n\n' +
      'Геометрия, идентификаторы и числовые высоты сохранятся. ' +
      'Каждый тайл получит явный порядок слоя. ' +
      'Новые тайлы можно будет добавлять сверху.\n\n' +
      'Позиции моделей не изменятся. ' +
      'Переход можно отменить общей историей стола.'
    )) {
      return;
    }

    commit(next => {
      if (!validateTerrain(next.terrain)) {
        throw new Error('Исходный ландшафт не прошёл проверку.');
      }

      if (terrainIsLayered(next.terrain)) return;

      next.terrain = next.terrain.map((tile, index) => ({
        ...tile,
        layer: index
      }));

      buildTerrainLayers(next.terrain);
    }, 'Локальный ландшафт переведён на слои. Модели не изменены.');

    return;
  }

  const tile = selectedTile();

  if (!tile) {
    notify('Сначала выберите тайл на поле.', true);
    return;
  }

  if (action === 'move') {
    try {
      requireUncovered(getState().terrain, tile.id);
      setTerrainMode('move');
      notify('Выберите новый верхний левый угол тайла.');
    } catch (error) {
      notify(error.message, true);
    }

    return;
  }

  if (action === 'delete') {
    if (!confirm(
      'Удалить выбранный тайл? ' +
      'Итоговые высоты будут пересчитаны. ' +
      'Модели останутся на своих клетках.'
    )) {
      return;
    }

    commit(next => {
      next.terrain = next.terrain.filter(
        item => item.id !== tile.id
      );
    }, 'Тайл удалён. Положение моделей не изменено.');

    return;
  }

  if (action === 'height') {
    commit(next => {
      const target = next.terrain.find(item => item.id === tile.id);

      if (!target) throw new Error('Тайл не найден.');

      target.height = readHeight();

      if (terrainIsLayered(next.terrain)) {
        buildTerrainLayers(next.terrain);
      }
    }, 'Собственная высота тайла изменена.');

    return;
  }

  if (action === 'rotate') {
    commit(next => {
      requireUncovered(next.terrain, tile.id);

      const target = next.terrain.find(item => item.id === tile.id);

      if (!target) throw new Error('Тайл не найден.');

      const maxY = Math.max(...target.cells.map(cell => cell.y));

      const rotated = {
        ...target,
        cells: target.cells.map(cell => ({
          x: maxY - cell.y,
          y: cell.x
        }))
      };

      checkPlacement(rotated, next.terrain, tile.id);

      // Пока поворот моделей вместе с тайлом не подключён,
      // не разрешаем поворачивать тайл под моделями.
      checkTileModelCollisions(target, next.units);
      checkTileModelCollisions(rotated, next.units);

      target.cells = rotated.cells;
    }, 'Тайл повёрнут. Модели остались на прежних клетках.');
  }
}

/* ==========================================================================
   Обновление панели
   ========================================================================== */

export function renderTerrainEditor() {
  if (!getState || !$('vt-terrain-selection')) return;

  const current = getState();
  const terrain = current?.terrain || [];
  const layered = terrainIsLayered(terrain);

  let tile = selectedTile();

  if (!tile && selectedTileId) {
    selectedTileId = null;
    selectedPoint = null;

    if (mode === 'move') mode = 'select';
    tile = null;
  }

  $('vt-terrain-format').textContent = layered
    ? 'Слои включены. Высота клетки — сумма собственных высот тайлов.'
    : 'Прежний формат: наложение недоступно до перехода на слои.';

  const migrate = document.querySelector(
    '[data-terrain-action="migrate"]'
  );

  migrate.hidden = layered;
  migrate.disabled = !current || terrain.length === 0;

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

  let covered = false;

  if (tile && layered) {
    covered = !terrainTileMovement(
      buildTerrainLayers(terrain),
      tile.id
    ).allowed;
  }

  document.querySelectorAll('[data-terrain-action]').forEach(button => {
    const action = button.dataset.terrainAction;

    if (action === 'migrate') return;

    if (action === 'cancel-move') {
      button.hidden = mode !== 'move';
      button.disabled = mode !== 'move';
      return;
    }

    if (action === 'move') {
      // В ожидании точки назначения вместо повторного
      // запуска переноса показываем явную отмену.
      button.hidden = mode === 'move';
    }

    button.disabled = !tile ||
      (covered && ['move', 'rotate'].includes(action));
  });

  const selection = $('vt-terrain-selection');
  selection.replaceChildren();

  const description = document.createElement('p');
  description.className = 'vt-muted';

  description.textContent = tile
    ? `${TERRAIN_TYPES[tile.type].name} · ` +
      `клеток: ${tile.cells.length} · ` +
      `собственная высота: ${tile.height}` +
      (layered ? ` · слой: ${tile.layer}` : '') +
      (covered ? ' · перекрыт сверху' : '')
    : 'Тайл не выбран.';

  selection.append(description);

  const stackPanel = $('vt-terrain-stack');
  stackPanel.replaceChildren();

  if (selectedPoint) {
    const stack = stackAt(
      terrain,
      selectedPoint.x,
      selectedPoint.y
    );

    if (stack.length) {
      const surface = createTerrainSurfaceReader(terrain)(
        selectedPoint
      );

      const heading = document.createElement('p');
      heading.className = 'vt-muted';

      heading.textContent =
        `Слои клетки, сверху вниз. Итоговая высота: ${surface.height}.`;

      stackPanel.append(heading);

      for (const item of [...stack].reverse()) {
        const button = document.createElement('button');

        button.type = 'button';
        button.className = 'builder-action-btn';
        button.dataset.terrainPick = item.id;

        button.classList.toggle(
          'primary',
          item.id === selectedTileId
        );

        button.setAttribute(
          'aria-pressed',
          String(item.id === selectedTileId)
        );

        button.textContent =
          `${TERRAIN_TYPES[item.type].name} · ` +
          `высота ${item.height}` +
          (layered ? ` · слой ${item.layer}` : '');

        stackPanel.append(button);
      }
    }
  }

  $('vt-terrain-help').textContent = HINTS[mode];
  announceMode();
}

/* ==========================================================================
   Нажатия на поле
   ========================================================================== */

export function handleTerrainClick(x, y) {
  if (mode === 'models') return false;

  if (!getState()) {
    notify('Сначала загрузите хотя бы одну армию на стол.', true);
    return true;
  }

  if (mode === 'select') {
    selectedPoint = { x, y };

    const tile = terrainAt(getState().terrain, x, y);
    chooseTile(tile);
    renderTerrainEditor();

    notify(
      tile
        ? `Выбран верхний тайл: ${TERRAIN_TYPES[tile.type].name}. ` +
          'Другой слой можно выбрать в панели ландшафта.'
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

      next.terrain ||= [];

      const tile = {
        id: crypto.randomUUID(),
        type,
        x,
        y,
        height: readHeight(),
        cells: buildShape()
      };

      if (terrainIsLayered(next.terrain)) {
        tile.layer = nextLayer(next.terrain);
      }

      checkPlacement(tile, next.terrain);
      checkTileModelCollisions(tile, next.units);

      next.terrain.push(tile);
    }, 'Тайл добавлен. Положение моделей не изменено.');

    return true;
  }

   if (mode === 'move') {
    const tile = selectedTile();

    if (!tile) {
      notify('Тайл не выбран.', true);
      return true;
    }

    // Не создаём запись истории при нажатии исходной точки.
    if (tile.x === x && tile.y === y) {
      mode = 'select';
      selectedPoint = null;

      redraw?.();
      notify('Положение тайла не изменено.');

      return true;
    }

    const saved = commit(next => {
      const terrain = next.terrain || [];

      if (!terrainIsLayered(terrain)) {
        throw new Error(
          'Для совместного переноса сначала ' +
          'переведите ландшафт на слои.'
        );
      }

      const layers = buildTerrainLayers(terrain);
      const source = layers.byId.get(tile.id);

      if (!source) {
        throw new Error('Переносимый тайл не найден.');
      }

      const movement = terrainTileMovement(
        layers,
        source.id
      );

      if (!movement.allowed) {
        throw new Error(
          'Тайл нельзя переместить: сверху расположен ' +
          'хотя бы один другой тайл.'
        );
      }

      const sourceCells = new Set(
        tileCells(source).map(cell =>
          `${cell.x}:${cell.y}`
        )
      );

      // На переносимом тайле не должно оставаться моделей,
      // связь которых с ним ещё не назначена явно.
      //
      // Координаты сами по себе не являются опорой.
      const unassigned = (next.units || []).find(unit =>
        unit.position &&
        sourceCells.has(
          `${unit.position.x}:${unit.position.y}`
        ) &&
        unit.position.supportTileId !== source.id
      );

      if (unassigned) {
        const position = unassigned.position;

        const coordinate =
          `${'ABCDEFGHIJKLMN'[position.x]}` +
          `${position.y + 1}`;

        const side = unassigned.side === 'b' ? 'Б' : 'А';
        const number =
          `${side}${unassigned.rosterIndex + 1}`;

        throw new Error(
          `На тайле находится модель ${number} ` +
          `в клетке ${coordinate} без назначенной опоры на него. ` +
          'Выберите модель и нажмите ' +
          '«Поставить на верхний тайл» ' +
          'либо переместите её с тайла.'
        );
      }

      const carried = (next.units || []).filter(unit =>
        unit.position &&
        unit.position.supportTileId === source.id
      );

      // Дополнительная проверка исходных связей.
      // Не переносим модель с повреждённой опорой.
      for (const unit of carried) {
        if (!sourceCells.has(
          `${unit.position.x}:${unit.position.y}`
        )) {
          throw new Error(
            'Модель с опорой на переносимый тайл ' +
            'находится вне его клеток. Перенос отменён.'
          );
        }
      }

      const carriedIds = new Set(
        carried.map(unit => unit.id)
      );

      // Общий расчёт проверяет:
      // — доступность переноса;
      // — границы поля;
      // — новый верхний порядок слоя;
      // — точность итоговых высот.
      const preview = previewTerrainTileMove(
        layers,
        source.id,
        { x, y }
      );

      const moved = preview.byId.get(source.id);

      if (!moved) {
        throw new Error(
          'Не удалось подготовить положение тайла.'
        );
      }

      // Правило А:
      // тайл не может накрывать постороннюю модель.
      //
      // Переносимые вместе с ним модели здесь исключаются:
      // их прежние координаты будут освобождены
      // в той же записи состояния.
      checkTileModelCollisions(
        moved,
        next.units,
        carriedIds
      );

      const dx = moved.x - source.x;
      const dy = moved.y - source.y;

      const occupiedByOthers = new Set(
        (next.units || [])
          .filter(unit =>
            unit.position &&
            !carriedIds.has(unit.id)
          )
          .map(unit =>
            `${unit.position.x}:${unit.position.y}`
          )
      );

      const destinations = new Set();
      const plannedPositions = new Map();

      for (const unit of carried) {
        const destination = {
          ...unit.position,
          x: unit.position.x + dx,
          y: unit.position.y + dy,
          supportTileId: source.id
        };

        if (
          !Number.isInteger(destination.x) ||
          !Number.isInteger(destination.y) ||
          destination.x < 0 ||
          destination.y < 0 ||
          destination.x >= SIZE ||
          destination.y >= SIZE
        ) {
          throw new Error(
            'Перенос выводит модель за границы поля.'
          );
        }

        const key =
          `${destination.x}:${destination.y}`;

        if (
          occupiedByOthers.has(key) ||
          destinations.has(key)
        ) {
          throw new Error(
            'Перенос приводит к столкновению моделей. ' +
            'Сначала освободите клетки назначения.'
          );
        }

        const surface = readLayeredSurface(
          preview,
          destination
        );

        if (surface.tileId !== source.id) {
          throw new Error(
            'После переноса модель теряет верхнюю опору. ' +
            'Операция отменена.'
          );
        }

        destinations.add(key);
        plannedPositions.set(unit.id, destination);
      }

      const target = terrain.find(
        item => item.id === source.id
      );

      if (!target) {
        throw new Error('Переносимый тайл не найден.');
      }

      // Применяем подготовленный перенос к копии состояния.
      // Сохранение и история выполняются внешним commit
      // только после полной проверки всей партии.
      target.x = moved.x;
      target.y = moved.y;
      target.layer = moved.layer;

      for (const unit of carried) {
        unit.position = plannedPositions.get(unit.id);
      }
    },
    'Тайл и модели с назначенной опорой перенесены. ' +
    'ХП, фронт и остальные отметки сохранены.');

    if (saved) {
      selectedPoint = null;
      mode = 'select';
      redraw?.();
    }

    return true;
  }
  return true;
}

/* ==========================================================================
   Отображение клетки
   ========================================================================== */

export function terrainCellView(terrain, x, y) {
  const stack = stackAt(terrain, x, y);
  const tile = stack[stack.length - 1];

  if (!tile) {
    return {
      type: 'empty',
      title: 'Без тайла, высота неизвестна',
      html: '',
      selected: false
    };
  }

  const info = TERRAIN_TYPES[tile.type];

  // Точная сумма даже при больших отрицательных высотах.
  const total = stack.reduce(
    (sum, item) => sum + BigInt(item.height),
    0n
  );

  const height = total.toString();

  const anchor = tile.cells[0];
  const isAnchor =
    x === tile.x + anchor.x &&
    y === tile.y + anchor.y;

  // В многослойном формате итоговая высота показывается
  // в каждой клетке: под одним тайлом она может различаться.
  const showLabel = terrainIsLayered(terrain) || isAnchor;

  return {
    type: tile.type,
    title:
      `${info.name}, итоговая высота ${height}, ` +
      `тайлов в клетке: ${stack.length}`,
    selected: stack.some(item => item.id === selectedTileId),
    html: showLabel
      ? `
        <span class="vt-terrain-label" aria-hidden="true">
          <span class="vt-terrain-label-name">${info.name}</span>
          <span class="vt-terrain-label-height">В: ${height}</span>
        </span>
      `
      : ''
  };
}