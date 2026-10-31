// src/workshop/terrain-editor.js
//
// Редактор местности независимой карты.
// Сохранения партий и ростеров не используются.
//
// Тайлы:
// { id, type, x, y, height, cells: [{ x, y }] }
//
// x/y тайла — начало его габаритов на поле.
// cells — локальные неотрицательные координаты.
// Минимальные локальные x и y равны нулю.
//
// Форма может быть произвольной, в том числе несвязной.
// Это геометрия документа, а не правило допустимости местности.

const SIZE = 14;
const LETTERS = 'ABCDEFGHIJKLMN';
const HISTORY_LIMIT = 40;

const TYPES = {
  meadow: 'Луг',
  forest: 'Лес',
  river: 'Река',
  mountain: 'Гора'
};

const SYMBOLS = {
  meadow: '·',
  forest: '♣',
  river: '≈',
  mountain: '▲'
};

const clone = value => JSON.parse(JSON.stringify(value));
const cellKey = (x, y) => `${x}:${y}`;

function isRecord(value) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

/**
 * Поддерживает и старые одноклеточные,
 * и новые составные тайлы.
 */
export function validWorkshopTerrain(terrain) {
  if (!Array.isArray(terrain) || terrain.length > SIZE * SIZE) {
    return false;
  }

  const ids = new Set();
  const occupied = new Set();

  const tileFields = [
    'id',
    'type',
    'x',
    'y',
    'height',
    'cells'
  ];

  const cellFields = ['x', 'y'];

  for (const tile of terrain) {
    if (
      !isRecord(tile) ||
      Object.keys(tile).length !== tileFields.length ||
      !tileFields.every(key => Object.hasOwn(tile, key)) ||
      typeof tile.id !== 'string' ||
      !tile.id.trim() ||
      tile.id.length > 120 ||
      ids.has(tile.id) ||
      typeof tile.type !== 'string' ||
      !Object.hasOwn(TYPES, tile.type) ||
      !Number.isInteger(tile.x) ||
      !Number.isInteger(tile.y) ||
      tile.x < 0 ||
      tile.y < 0 ||
      tile.x >= SIZE ||
      tile.y >= SIZE ||
      !Number.isInteger(tile.height) ||
      tile.height < 0 ||
      tile.height > 99 ||
      !Array.isArray(tile.cells) ||
      tile.cells.length === 0 ||
      tile.cells.length > SIZE * SIZE
    ) {
      return false;
    }

    let minX = Infinity;
    let minY = Infinity;

    for (const cell of tile.cells) {
      if (
        !isRecord(cell) ||
        Object.keys(cell).length !== cellFields.length ||
        !cellFields.every(key => Object.hasOwn(cell, key)) ||
        !Number.isInteger(cell.x) ||
        !Number.isInteger(cell.y) ||
        cell.x < 0 ||
        cell.y < 0 ||
        cell.x >= SIZE ||
        cell.y >= SIZE
      ) {
        return false;
      }

      const x = tile.x + cell.x;
      const y = tile.y + cell.y;

      if (x >= SIZE || y >= SIZE) {
        return false;
      }

      const key = cellKey(x, y);

      // Проверяет пересечения разных тайлов
      // и повтор клеток внутри одного тайла.
      if (occupied.has(key)) {
        return false;
      }

      occupied.add(key);

      minX = Math.min(minX, cell.x);
      minY = Math.min(minY, cell.y);
    }

    if (minX !== 0 || minY !== 0) {
      return false;
    }

    ids.add(tile.id);
  }

  return true;
}
function normalizeCells(cells) {
  const minX = Math.min(...cells.map(cell => cell.x));
  const minY = Math.min(...cells.map(cell => cell.y));

  return cells
    .map(cell => ({
      x: cell.x - minX,
      y: cell.y - minY
    }))
    .sort((a, b) => a.y - b.y || a.x - b.x);
}

function occupiedCells(terrain) {
  const result = new Map();

  for (const tile of terrain) {
    for (const cell of tile.cells) {
      result.set(
        cellKey(tile.x + cell.x, tile.y + cell.y),
        tile
      );
    }
  }

  return result;
}

export function initWorkshopTerrainEditor({
  getMap,
  onChange,
  message
}) {
  const board = document.getElementById('ws-board');
  const scroll = board.closest('.ws-board-scroll');

  let tool = 'brush';
  let selectedId = null;

  // move | copy | null
  let placement = null;

  const shapeCells = new Set();

  let activeMapId = null;
  let expectedTerrain = null;
  let undoStack = [];
  let redoStack = [];

  const controls = document.createElement('section');

  controls.className = 'ws-terrain-controls';
  controls.setAttribute('aria-label', 'Редактор местности');

  // Только статическая разметка приложения.
  controls.innerHTML = `
    <h3>Местность</h3>

    <div class="ws-terrain-tools"
         role="group"
         aria-label="Инструмент">

      <button type="button"
              class="builder-action-btn"
              data-tool="brush">
        Кисть
      </button>

      <button type="button"
              class="builder-action-btn"
              data-tool="erase">
        Ластик
      </button>

      <button type="button"
              class="builder-action-btn"
              data-tool="fill">
        Заливка
      </button>

      <button type="button"
              class="builder-action-btn"
              data-tool="shape">
        Форма
      </button>

      <button type="button"
              class="builder-action-btn"
              data-tool="select">
        Выбор тайла
      </button>
    </div>

    <div class="ws-form-grid">
      <label>
        Тип местности
        <select data-type>
          <option value="meadow">Луг</option>
          <option value="forest">Лес</option>
          <option value="river">Река</option>
          <option value="mountain">Гора</option>
        </select>
      </label>

      <label>
        Высота
        <input data-height
               type="number"
               min="0"
               max="99"
               step="1"
               value="0">
      </label>
    </div>

    <div class="ws-actions">
      <button type="button"
              class="builder-action-btn"
              data-command="create-shape">
        Создать тайл из формы
      </button>

      <button type="button"
              class="builder-action-btn"
              data-command="clear-shape">
        Сбросить форму
      </button>
    </div>

    <p class="ws-muted" data-selection></p>

    <div class="ws-actions">
      <button type="button"
              class="builder-action-btn"
              data-command="apply">
        Применить тип и высоту к тайлу
      </button>

      <button type="button"
              class="builder-action-btn"
              data-command="move">
        Перенести
      </button>

      <button type="button"
              class="builder-action-btn"
              data-command="copy">
        Копировать
      </button>

      <button type="button"
              class="builder-action-btn"
              data-command="rotate">
        Повернуть ↻
      </button>

      <button type="button"
              class="builder-action-btn ws-delete"
              data-command="delete">
        Удалить тайл
      </button>

      <button type="button"
              class="builder-action-btn"
              data-command="cancel">
        Снять выбор / отменить перенос
      </button>
    </div>

    <div class="ws-actions">
      <button type="button"
              class="builder-action-btn"
              data-command="undo">
        ↶ Отменить
      </button>

      <button type="button"
              class="builder-action-btn"
              data-command="redo">
        ↷ Повторить
      </button>

      <button type="button"
              class="builder-action-btn ws-delete"
              data-command="clear">
        Очистить местность
      </button>
    </div>

    <p class="ws-muted" data-summary></p>

    <p class="ws-muted">
      «Форма»: отмечайте пустые клетки и создайте из них один тайл.
      «Выбор тайла»: нажмите любую его клетку.
      Для переноса или копирования нажмите соответствующую кнопку,
      затем клетку нового верхнего левого угла габаритов.
      Тайлы не могут перекрываться или выходить за поле.
    </p>

    <p class="ws-muted">
      Кисть, ластик и заливка не разрезают составные тайлы.
      Заливка работает по сторонам между клетками одинакового
      типа и высоты. Пустая клетка отличается от луга.
      Высота — метаданные; эффекты применяются вручную.
      Предел высоты 99 — технический, не игровое правило.
    </p>
  `;

  scroll.before(controls);

  const typeSelect = controls.querySelector('[data-type]');
  const heightInput = controls.querySelector('[data-height]');
  const selectionText = controls.querySelector('[data-selection]');
  const summary = controls.querySelector('[data-summary]');

  const commandButton = command =>
    controls.querySelector(`[data-command="${command}"]`);

  function terrain() {
    return getMap()?.layers?.terrain || [];
  }

  function terrainRaw() {
    return JSON.stringify(terrain());
  }

  function selectedTile() {
    return terrain().find(tile => tile.id === selectedId) || null;
  }

  function resetHistory() {
    activeMapId = getMap()?.id || null;
    expectedTerrain = terrainRaw();

    undoStack = [];
    redoStack = [];

    selectedId = null;
    placement = null;
    shapeCells.clear();

    updateControls();
  }

  function ensureHistory() {
    if (
      (getMap()?.id || null) !== activeMapId ||
      terrainRaw() !== expectedTerrain
    ) {
      resetHistory();
    }
  }

  function readProperties() {
    const raw = heightInput.value.trim();
    const height = Number(raw);
    const type = typeSelect.value;

    if (
      raw === '' ||
      !Number.isInteger(height) ||
      height < 0 ||
      height > 99
    ) {
      throw new Error('Высота должна быть целым числом от 0 до 99.');
    }

    if (!Object.hasOwn(TYPES, type)) {
      throw new Error('Неизвестный тип местности.');
    }

    return { type, height };
  }

  function updateControls() {
    const map = getMap();
    const selected = selectedTile();

    controls.querySelectorAll('[data-tool]').forEach(button => {
      const active = button.dataset.tool === tool;

      button.classList.toggle('primary', active);
      button.setAttribute('aria-pressed', String(active));
    });

    commandButton('undo').disabled = !map || undoStack.length === 0;
    commandButton('redo').disabled = !map || redoStack.length === 0;
    commandButton('clear').disabled = !map || terrain().length === 0;

    commandButton('create-shape').disabled =
      !map || shapeCells.size === 0;

    commandButton('clear-shape').disabled = shapeCells.size === 0;

    for (const command of ['apply', 'move', 'copy', 'rotate', 'delete']) {
      commandButton(command).disabled = !selected;
    }

    commandButton('cancel').disabled = !selected && !placement;

    typeSelect.disabled = tool === 'erase';
    heightInput.disabled = tool === 'erase';

    selectionText.textContent = selected
      ? `Выбран тайл: ${TYPES[selected.type]} · ` +
        `${selected.cells.length} клеток · высота ${selected.height} · ` +
        `начало ${LETTERS[selected.x]}${selected.y + 1}` +
        (placement
          ? ` · Укажите место для ${
              placement === 'move' ? 'переноса' : 'копии'
            }`
          : '')
      : 'Тайл не выбран.';

    const count = terrain().reduce(
      (sum, tile) => sum + tile.cells.length,
      0
    );

    summary.textContent =
      `Тайлов: ${terrain().length} · ` +
      `Занято клеток: ${count} / ${SIZE * SIZE} · ` +
      `В форме: ${shapeCells.size} · ` +
      `Отмена: ${undoStack.length} · Повтор: ${redoStack.length}`;
  }

  function renderBoard() {
    const occupied = occupiedCells(terrain());
    const focused = document.activeElement;

    const focusedKey = board.contains(focused)
      ? focused?.dataset?.cellKey
      : null;

    const fragment = document.createDocumentFragment();

    function axis(text) {
      const element = document.createElement('span');

      element.className = 'ws-axis';
      element.textContent = text;
      element.setAttribute('aria-hidden', 'true');

      fragment.append(element);
    }

    axis('');

    for (const letter of LETTERS) {
      axis(letter);
    }

    for (let y = 0; y < SIZE; y++) {
      axis(String(y + 1));

      for (let x = 0; x < SIZE; x++) {
        const key = cellKey(x, y);
        const tile = occupied.get(key);

        const button = document.createElement('button');

        button.type = 'button';
        button.className =
          `ws-cell${(x + y) % 2 ? ' is-alternate' : ''}`;

        button.classList.toggle(
          'is-tile-selected',
          Boolean(tile && tile.id === selectedId)
        );

        button.classList.toggle(
          'is-shape-selected',
          shapeCells.has(key)
        );

        button.dataset.x = String(x);
        button.dataset.y = String(y);
        button.dataset.cellKey = key;
        button.dataset.terrain = tile?.type || 'empty';

        const description =
          `${LETTERS[x]}${y + 1}: ` +
          (tile
            ? `${TYPES[tile.type]}, высота ${tile.height}, ` +
              `тайл из ${tile.cells.length} клеток`
            : 'пустая клетка') +
          (shapeCells.has(key) ? ', входит в черновик формы' : '');

        button.title = description;
        button.setAttribute('aria-label', description);

        button.setAttribute(
          'aria-pressed',
          String(
            shapeCells.has(key) ||
            Boolean(tile && tile.id === selectedId)
          )
        );

        if (tile) {
          const mark = document.createElement('span');

          mark.className = 'ws-terrain-mark';
          mark.setAttribute('aria-hidden', 'true');
          mark.textContent = SYMBOLS[tile.type];

          const height = document.createElement('small');

          height.className = 'ws-terrain-height';
          height.setAttribute('aria-hidden', 'true');
          height.textContent = String(tile.height);

          button.append(mark, height);

          // Подсвечиваем внешние границы тайла.
          const sameTile = (nx, ny) =>
            occupied.get(cellKey(nx, ny))?.id === tile.id;

          button.classList.toggle(
            'ws-edge-top',
            !sameTile(x, y - 1)
          );

          button.classList.toggle(
            'ws-edge-right',
            !sameTile(x + 1, y)
          );

          button.classList.toggle(
            'ws-edge-bottom',
            !sameTile(x, y + 1)
          );

          button.classList.toggle(
            'ws-edge-left',
            !sameTile(x - 1, y)
          );
        }

        fragment.append(button);
      }
    }

    board.replaceChildren(fragment);

    board.setAttribute(
      'aria-label',
      'Редактор карты: столбцы A–N, строки 1–14'
    );

    if (focusedKey) {
      const replacement = [...board.querySelectorAll('[data-cell-key]')]
        .find(button => button.dataset.cellKey === focusedKey);

      replacement?.focus({ preventScroll: true });
    }
  }

  function sync() {
    ensureHistory();

    if (!selectedTile()) {
      selectedId = null;
      placement = null;
    }

    // Черновик формы содержит только свободные клетки.
    const occupied = occupiedCells(terrain());

    for (const key of shapeCells) {
      if (occupied.has(key)) shapeCells.delete(key);
    }

    updateControls();
    renderBoard();
  }

  function applyTerrain(next, text) {
    ensureHistory();

    const map = getMap();

    if (!map) {
      throw new Error('Сначала создайте или откройте карту.');
    }

    if (!validWorkshopTerrain(next)) {
      throw new Error(
        'Действие невозможно: тайл выходит за поле, ' +
        'перекрывает другой тайл или имеет некорректную форму.'
      );
    }

    const previous = clone(terrain());

    if (JSON.stringify(previous) === JSON.stringify(next)) {
      message('Изменений нет.');
      return;
    }

    undoStack.push(previous);

    if (undoStack.length > HISTORY_LIMIT) {
      undoStack.shift();
    }

    redoStack = [];

    map.layers.terrain = next;
    expectedTerrain = terrainRaw();

    onChange();
    sync();

    message(text + ' Изменения нужно сохранить в библиотеку.');
  }

  function createShape() {
    if (!shapeCells.size) return;

    const occupied = occupiedCells(terrain());

    const cells = [...shapeCells].map(key => {
      if (occupied.has(key)) {
        throw new Error('Форма пересекается с существующей местностью.');
      }

      const [x, y] = key.split(':').map(Number);

      return { x, y };
    });

    const x = Math.min(...cells.map(cell => cell.x));
    const y = Math.min(...cells.map(cell => cell.y));
    const properties = readProperties();
    const id = crypto.randomUUID();

    const tile = {
      id,
      ...properties,
      x,
      y,
      cells: normalizeCells(cells)
    };

    applyTerrain(
      [...clone(terrain()), tile],
      `Создан тайл из ${cells.length} клеток.`
    );

    shapeCells.clear();
    selectedId = id;
    placement = null;
    tool = 'select';

    sync();
  }

  function placeSelected(x, y) {
    const selected = selectedTile();

    if (!selected || !placement) {
      throw new Error('Сначала выберите тайл.');
    }

    const next = clone(terrain());
    const tile = clone(selected);
    const copying = placement === 'copy';

    tile.x = x;
    tile.y = y;

    if (copying) {
      tile.id = crypto.randomUUID();
      next.push(tile);
    } else {
      const index = next.findIndex(item => item.id === tile.id);
      next[index] = tile;
    }

    applyTerrain(
      next,
      copying ? 'Копия тайла размещена.' : 'Тайл перенесён.'
    );

    selectedId = tile.id;
    placement = null;

    sync();
  }

  function fillRegion(startX, startY, properties) {
    const source = terrain();
    const occupied = occupiedCells(source);
    const start = occupied.get(cellKey(startX, startY));

    if (
      start &&
      start.type === properties.type &&
      start.height === properties.height
    ) {
      message('Область уже имеет выбранные свойства.');
      return;
    }

    const sameSource = tile => !start
      ? !tile
      : Boolean(
          tile &&
          tile.type === start.type &&
          tile.height === start.height
        );

    const visited = new Set();
    const region = new Set();
    const queue = [[startX, startY]];

    for (let index = 0; index < queue.length; index++) {
      const [x, y] = queue[index];

      if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) continue;

      const key = cellKey(x, y);

      if (visited.has(key)) continue;
      visited.add(key);

      const tile = occupied.get(key);

      if (!sameSource(tile)) continue;

      if (tile && tile.cells.length > 1) {
        throw new Error(
          'Область содержит составной тайл. ' +
          'Измените его через «Выбор тайла», чтобы не разрезать форму.'
        );
      }

      region.add(key);

      queue.push(
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1]
      );
    }

    const next = clone(source).filter(tile =>
      !region.has(cellKey(tile.x, tile.y))
    );

    for (const key of region) {
      const [x, y] = key.split(':').map(Number);

      next.push({
        id: occupied.get(key)?.id || crypto.randomUUID(),
        ...properties,
        x,
        y,
        cells: [{ x: 0, y: 0 }]
      });
    }

    applyTerrain(next, `Заливка: изменено ${region.size} клеток.`);
  }

  function handleCell(x, y) {
    ensureHistory();

    if (!getMap()) return;

    if (placement) {
      placeSelected(x, y);
      return;
    }

    const key = cellKey(x, y);
    const tile = occupiedCells(terrain()).get(key);

    if (tool === 'select') {
      selectedId = tile?.id || null;

      if (tile) {
        typeSelect.value = tile.type;
        heightInput.value = String(tile.height);
      }

      sync();
      return;
    }

    if (tool === 'shape') {
      if (tile) {
        throw new Error(
          'В форму можно добавлять только пустые клетки.'
        );
      }

      if (shapeCells.has(key)) {
        shapeCells.delete(key);
      } else {
        shapeCells.add(key);
      }

      sync();
      return;
    }

    if (tool === 'fill') {
      fillRegion(x, y, readProperties());
      return;
    }

    if (tile && tile.cells.length > 1) {
      throw new Error(
        'Это часть составного тайла. ' +
        'Используйте «Выбор тайла» и действия с целым тайлом.'
      );
    }

    const next = clone(terrain());
    const index = tile
      ? next.findIndex(item => item.id === tile.id)
      : -1;

    if (tool === 'erase') {
      if (index < 0) {
        message('Клетка уже пустая.');
        return;
      }

      next.splice(index, 1);
      applyTerrain(next, 'Местность в клетке удалена.');
      return;
    }

    const properties = readProperties();

    // Не создаём новое действие для той же окраски.
    if (
      tile &&
      tile.type === properties.type &&
      tile.height === properties.height
    ) {
      message('Клетка уже имеет выбранные свойства.');
      return;
    }

    const painted = {
      id: tile?.id || crypto.randomUUID(),
      ...properties,
      x,
      y,
      cells: [{ x: 0, y: 0 }]
    };

    if (index < 0) {
      next.push(painted);
    } else {
      next[index] = painted;
    }

    applyTerrain(next, `Клетка ${LETTERS[x]}${y + 1} изменена.`);
  }

  function replay(direction) {
    ensureHistory();

    const map = getMap();

    if (!map) return;

    const source = direction === 'undo' ? undoStack : redoStack;
    const destination = direction === 'undo' ? redoStack : undoStack;

    if (!source.length) return;

    const restored = source.pop();

    destination.push(clone(terrain()));

    if (destination.length > HISTORY_LIMIT) {
      destination.shift();
    }

    map.layers.terrain = clone(restored);
    expectedTerrain = terrainRaw();

    placement = null;
    shapeCells.clear();

    onChange();
    sync();

    message(
      direction === 'undo'
        ? 'Действие отменено. Изменения нужно сохранить в библиотеку.'
        : 'Действие повторено. Изменения нужно сохранить в библиотеку.'
    );
  }

  function handleCommand(command) {
    ensureHistory();

    if (command === 'undo' || command === 'redo') {
      replay(command);
      return;
    }

    if (command === 'clear-shape') {
      shapeCells.clear();
      sync();
      return;
    }

    if (command === 'create-shape') {
      createShape();
      return;
    }

    if (command === 'cancel') {
      selectedId = null;
      placement = null;
      sync();
      return;
    }

    if (command === 'clear') {
      if (!confirm(
        'Удалить всю местность из открытого документа? ' +
        'До закрытия карты действие можно отменить.'
      )) {
        return;
      }

      applyTerrain([], 'Местность очищена.');
      return;
    }

    const selected = selectedTile();

    if (!selected) {
      throw new Error('Сначала выберите тайл.');
    }

    if (command === 'move' || command === 'copy') {
      placement = command;

      updateControls();

      message(
        'Нажмите клетку нового верхнего левого угла габаритов тайла. ' +
        'Для отказа нажмите «Снять выбор / отменить перенос».'
      );

      return;
    }

    const next = clone(terrain());
    const index = next.findIndex(tile => tile.id === selected.id);

    if (command === 'apply') {
      Object.assign(next[index], readProperties());

      placement = null;
      applyTerrain(next, 'Тип и высота тайла изменены.');
      return;
    }

    if (command === 'rotate') {
      const cells = next[index].cells;
      const maxY = Math.max(...cells.map(cell => cell.y));

      next[index].cells = normalizeCells(
        cells.map(cell => ({
          x: maxY - cell.y,
          y: cell.x
        }))
      );

      applyTerrain(next, 'Тайл повёрнут на 90° по часовой стрелке.');
      placement = null;
      updateControls();
      return;
    }

    if (command === 'delete') {
      if (!confirm(
        `Удалить выбранный тайл из ${selected.cells.length} клеток? ` +
        'До закрытия карты действие можно отменить.'
      )) {
        return;
      }

      next.splice(index, 1);
      applyTerrain(next, 'Тайл удалён.');
    }
  }

  controls.querySelectorAll('[data-tool]').forEach(button => {
    button.addEventListener('click', () => {
      tool = button.dataset.tool;
      placement = null;
      sync();
    });
  });

  controls.addEventListener('click', event => {
    const button = event.target.closest('button[data-command]');

    if (!button || button.disabled) return;

    try {
      handleCommand(button.dataset.command);
    } catch (error) {
      message(error.message, true);
    }
  });

  board.addEventListener('click', event => {
    const button = event.target.closest('button[data-cell-key]');

    if (!button || !board.contains(button)) return;

    try {
      handleCell(
        Number(button.dataset.x),
        Number(button.dataset.y)
      );
    } catch (error) {
      message(error.message, true);
    }
  });

  return {
    sync,
    resetHistory
  };
}