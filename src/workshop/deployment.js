// src/workshop/deployment.js
//
// Ручные зоны расстановки.
// Не задают официальную схему и не размещают модели.
//
// Формат клетки зоны: { x, y, side: 'a' | 'b' }.
// В одной клетке хранится одна отметка зоны.
// Это ограничение текущего редактора, не игровое правило.

const SIZE = 14;
const LIMIT = 40;
const clone = value => JSON.parse(JSON.stringify(value));

export function validDeployment(records) {
  if (!Array.isArray(records) || records.length > SIZE * SIZE) {
    return false;
  }

  const occupied = new Set();
  const allowedFields = ['x', 'y', 'side'];

  return records.every(cell => {
    if (
      !cell ||
      typeof cell !== 'object' ||
      Array.isArray(cell) ||
      Object.keys(cell).length !== allowedFields.length ||
      !allowedFields.every(key => Object.hasOwn(cell, key)) ||
      !Number.isInteger(cell.x) ||
      !Number.isInteger(cell.y) ||
      cell.x < 0 ||
      cell.y < 0 ||
      cell.x >= SIZE ||
      cell.y >= SIZE ||
      !['a', 'b'].includes(cell.side)
    ) {
      return false;
    }

    const key = `${cell.x}:${cell.y}`;

    if (occupied.has(key)) {
      return false;
    }

    occupied.add(key);
    return true;
  });
}

export function initDeploymentEditor({
  getMap,
  onChange,
  message
}) {
  const board = document.getElementById('ws-board');
  const scroll = board.closest('.ws-board-scroll');

  let active = false;
  let brush = 'a';
  let mapId = null;
  let expectedRaw = null;
  let undo = [];
  let redo = [];

  const panel = document.createElement('section');

  panel.className = 'ws-deployment-controls';
  panel.setAttribute('aria-label', 'Зоны расстановки');

  panel.innerHTML = `
    <h3>Зоны расстановки</h3>

    <div class="ws-actions">
      <button type="button"
              class="builder-action-btn"
              data-zone-mode>
        Редактировать зоны
      </button>

      <label>
        Инструмент зоны
        <select data-zone-brush>
          <option value="a">Зона А</option>
          <option value="b">Зона Б</option>
          <option value="erase">Ластик зон</option>
        </select>
      </label>
    </div>

    <div class="ws-actions">
      <button type="button"
              class="builder-action-btn"
              data-zone-undo>
        ↶ Отменить зону
      </button>

      <button type="button"
              class="builder-action-btn"
              data-zone-redo>
        ↷ Повторить зону
      </button>

      <button type="button"
              class="builder-action-btn ws-delete"
              data-zone-clear>
        Очистить зоны
      </button>
    </div>

    <p class="ws-muted" data-zone-summary></p>

    <p class="ws-muted">
      Включите редактирование зон и нажимайте клетки.
      Для возврата к местности выключите этот режим.
      Зона рисуется поверх местности и не меняет тайлы.
      Новая отметка А/Б заменяет прежнюю отметку этой клетки.
      Это ограничение редактора, не правило расстановки.
      Схему и допустимость зон игроки определяют самостоятельно.
    </p>
  `;

  scroll.before(panel);

  const modeButton = panel.querySelector('[data-zone-mode]');
  const undoButton = panel.querySelector('[data-zone-undo]');
  const redoButton = panel.querySelector('[data-zone-redo]');
  const clearButton = panel.querySelector('[data-zone-clear]');
  const summary = panel.querySelector('[data-zone-summary]');

  function zones() {
    return getMap()?.layers?.deployment || [];
  }

  function raw() {
    return JSON.stringify(zones());
  }

  function resetHistory() {
    mapId = getMap()?.id || null;
    expectedRaw = raw();
    undo = [];
    redo = [];
  }

  function ensureHistory() {
    if (
      mapId !== (getMap()?.id || null) ||
      expectedRaw !== raw()
    ) {
      resetHistory();
    }
  }

  function renderOverlay() {
    const byCell = new Map(
      zones().map(cell => [`${cell.x}:${cell.y}`, cell.side])
    );

    board.querySelectorAll('button[data-cell-key]').forEach(button => {
      const side = byCell.get(button.dataset.cellKey);
      const previous = button.querySelector('.ws-zone-mark');

      const oldSide = button.dataset.zone || '';

      if (side) {
        button.dataset.zone = side;

        if (!previous || previous.textContent !== side.toUpperCase()) {
          previous?.remove();

          const mark = document.createElement('span');
          mark.className = 'ws-zone-mark';
          mark.textContent = side.toUpperCase();
          mark.setAttribute('aria-hidden', 'true');

          button.append(mark);
        }
      } else {
        delete button.dataset.zone;
        previous?.remove();
      }

      // Удаляем только добавленный нами суффикс.
      const suffix = / · Зона расстановки [АБ]$/;

      const label = (button.getAttribute('aria-label') || '')
        .replace(suffix, '');

      const title = button.title.replace(suffix, '');

      const addition = side
        ? ` · Зона расстановки ${side === 'a' ? 'А' : 'Б'}`
        : '';

      if (oldSide !== (side || '') ||
          button.getAttribute('aria-label') !== label + addition) {
        button.setAttribute('aria-label', label + addition);
        button.title = title + addition;
      }
    });
  }

  function sync() {
    ensureHistory();

    modeButton.classList.toggle('primary', active);
    modeButton.setAttribute('aria-pressed', String(active));

    modeButton.textContent = active
      ? 'Зоны включены — вернуться к местности'
      : 'Редактировать зоны';

    undoButton.disabled = undo.length === 0;
    redoButton.disabled = redo.length === 0;
    clearButton.disabled = zones().length === 0;

    const countA = zones().filter(cell => cell.side === 'a').length;
    const countB = zones().filter(cell => cell.side === 'b').length;

    summary.textContent =
      `Зона А: ${countA} клеток · Зона Б: ${countB} клеток · ` +
      `Отмена: ${undo.length} · Повтор: ${redo.length}`;

    renderOverlay();
  }

  function apply(next, text) {
    ensureHistory();

    const map = getMap();

    if (!map) throw new Error('Сначала откройте карту.');

    if (!validDeployment(next)) {
      throw new Error('Некорректные данные зон расстановки.');
    }

    if (JSON.stringify(next) === raw()) return;

    undo.push(clone(zones()));
    if (undo.length > LIMIT) undo.shift();

    redo = [];

    map.layers.deployment = next;
    expectedRaw = raw();

    onChange();
    sync();

    message(text + ' Изменения нужно сохранить в библиотеку.');
  }

  function replay(direction) {
    ensureHistory();

    const map = getMap();
    if (!map) return;

    const source = direction === 'undo' ? undo : redo;
    const destination = direction === 'undo' ? redo : undo;

    if (!source.length) return;

    destination.push(clone(zones()));
    if (destination.length > LIMIT) destination.shift();

    map.layers.deployment = source.pop();
    expectedRaw = raw();

    onChange();
    sync();

    message(
      'Изменение зоны ' +
      (direction === 'undo' ? 'отменено.' : 'повторено.') +
      ' Сохраните карту в библиотеку.'
    );
  }

  modeButton.addEventListener('click', () => {
    active = !active;
    sync();
  });

  panel.querySelector('[data-zone-brush]').addEventListener(
    'change',
    event => {
      brush = event.target.value;
    }
  );

  // Capture позволяет перехватить нажатие до обработчика местности.
  board.addEventListener('click', event => {
    if (!active) return;

    const button = event.target.closest('button[data-cell-key]');

    if (!button || !board.contains(button)) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    try {
      const x = Number(button.dataset.x);
      const y = Number(button.dataset.y);

      const existing = zones().find(cell => cell.x === x && cell.y === y);

      if (
        (!existing && brush === 'erase') ||
        (existing && existing.side === brush)
      ) {
        return;
      }

      const next = clone(zones()).filter(
        cell => cell.x !== x || cell.y !== y
      );

      if (brush !== 'erase') {
        next.push({ x, y, side: brush });
      }

      apply(next, 'Зона расстановки изменена.');
    } catch (error) {
      message(error.message, true);
    }
  }, true);

  undoButton.addEventListener('click', () => replay('undo'));
  redoButton.addEventListener('click', () => replay('redo'));

  clearButton.addEventListener('click', () => {
    if (!confirm(
      'Удалить все зоны расстановки открытой карты? ' +
      'Местность останется прежней.'
    )) {
      return;
    }

    try {
      apply([], 'Зоны очищены.');
    } catch (error) {
      message(error.message, true);
    }
  });

  // Редактор местности пересоздаёт клетки.
  // Обновляем только наложение, не перерисовывая поле целиком.
  const observer = new MutationObserver(records => {
    const boardRebuilt = records.some(record =>
      record.target === board
    );

    if (boardRebuilt) renderOverlay();
  });

  observer.observe(board, { childList: true });

  return { sync, resetHistory };
}