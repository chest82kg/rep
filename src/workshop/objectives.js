// src/workshop/objectives.js
//
// Контрольные точки документа карты.
// Не содержат контроля А/Б, счёта или условий победы.
// Импорт модуля сам по себе не запускает редактор.

const SIZE = 14;
const MAX_POINTS = 30;
const MAX_TITLE = 80;
const HISTORY_LIMIT = 40;
const LETTERS = 'ABCDEFGHIJKLMN';

const clone = value => JSON.parse(JSON.stringify(value));

export function validMapObjectives(points) {
  if (!Array.isArray(points) || points.length > MAX_POINTS) {
    return false;
  }

  const ids = new Set();
  const cells = new Set();

  return points.every(point => {
    if (
      !point ||
      typeof point !== 'object' ||
      Array.isArray(point) ||
      typeof point.id !== 'string' ||
      !point.id.trim() ||
      point.id.length > 120 ||
      ids.has(point.id) ||
      typeof point.title !== 'string' ||
      !point.title.trim() ||
      point.title.length > MAX_TITLE ||
      !Number.isInteger(point.x) ||
      !Number.isInteger(point.y) ||
      point.x < 0 ||
      point.x >= SIZE ||
      point.y < 0 ||
      point.y >= SIZE ||
      Object.keys(point).some(key =>
        !['id', 'title', 'x', 'y'].includes(key)
      )
    ) {
      return false;
    }

    const cell = `${point.x}:${point.y}`;

    if (cells.has(cell)) return false;

    ids.add(point.id);
    cells.add(cell);

    return true;
  });
}

export function initMapObjectives({
  getMap,
  onChange,
  message
}) {
  const board = document.getElementById('ws-board');
  const scroll = board?.closest('.ws-board-scroll');

  if (!board || !scroll) {
    throw new Error('Не найдено поле мастерской для КТ.');
  }

  const panel = document.createElement('section');
  panel.className = 'ws-objectives-controls';
  panel.setAttribute('aria-label', 'Контрольные точки карты');

  // Только статическая разметка приложения.
  panel.innerHTML = `
    <h3>Контрольные точки карты</h3>

    <p class="ws-muted">
      Укажите название и координаты точки.
      КТ не меняет местность или зоны расстановки.
      Контроль сторон, счёт и условия победы в карте не хранятся.
    </p>

    <form data-map-point-form>
      <label>
        Точка
        <select data-map-point-select>
          <option value="">Новая точка</option>
        </select>
      </label>

      <label>
        Название
        <input type="text"
               maxlength="${MAX_TITLE}"
               data-map-point-title
               required>
      </label>

      <div class="ws-actions">
        <label>
          Столбец
          <select data-map-point-x>
            ${[...LETTERS].map((letter, x) => `
              <option value="${x}">${letter}</option>
            `).join('')}
          </select>
        </label>

        <label>
          Строка
          <select data-map-point-y>
            ${Array.from({ length: SIZE }, (_, y) => `
              <option value="${y}">${y + 1}</option>
            `).join('')}
          </select>
        </label>
      </div>

      <div class="ws-actions">
        <button type="submit"
                class="builder-action-btn"
                data-map-point-save>
          Добавить КТ
        </button>

        <button type="button"
                class="builder-action-btn"
                data-map-point-new>
          Новая КТ
        </button>

        <button type="button"
                class="builder-action-btn ws-delete"
                data-map-point-delete>
          Удалить выбранную
        </button>
      </div>
    </form>

    <div class="ws-actions">
      <button type="button"
              class="builder-action-btn"
              data-map-point-undo>
        ↶ Отменить КТ
      </button>

      <button type="button"
              class="builder-action-btn"
              data-map-point-redo>
        ↷ Повторить КТ
      </button>
    </div>

    <p class="ws-muted" data-map-point-summary></p>

    <p class="ws-muted">
      После заполнения формы нажмите «Добавить КТ»
      или «Применить к КТ», затем сохраните карту в библиотеку.
      Отмена КТ не изменяет местность и зоны.
    </p>
  `;

  // Не вкладываем форму КТ в форму свойств карты.
  scroll.after(panel);

  const find = selector => panel.querySelector(selector);

  const form = find('[data-map-point-form]');
  const select = find('[data-map-point-select]');
  const titleInput = find('[data-map-point-title]');
  const xInput = find('[data-map-point-x]');
  const yInput = find('[data-map-point-y]');
  const saveButton = find('[data-map-point-save]');
  const deleteButton = find('[data-map-point-delete]');
  const undoButton = find('[data-map-point-undo]');
  const redoButton = find('[data-map-point-redo]');
  const summary = find('[data-map-point-summary]');

    let selectedId = '';
  let mapId = null;
  let expectedRaw = null;
  let undo = [];
  let redo = [];

  // Сохранение той же карты не должно стирать
  // неприменённые название и координаты КТ.
  let formNeedsReset = true;

  function points() {
    return getMap()?.layers?.objectives || [];
  }

  function raw() {
    return JSON.stringify(points());
  }

    function resetHistory() {
    mapId = getMap()?.id || null;
    expectedRaw = raw();
    selectedId = '';
    undo = [];
    redo = [];
    formNeedsReset = true;
  }

  function ensureHistory() {
    if (
      mapId !== (getMap()?.id || null) ||
      expectedRaw !== raw()
    ) {
      resetHistory();
    }
  }

  function coordinate(point) {
    return `${LETTERS[point.x]}${point.y + 1}`;
  }

  function fillForm() {
    const point = points().find(item => item.id === selectedId);

    titleInput.value = point?.title || '';
    xInput.value = String(point?.x ?? 0);
    yInput.value = String(point?.y ?? 0);
  }

  function drawMarkers() {
    board.querySelectorAll('[data-ws-objective-marker]')
      .forEach(marker => marker.remove());

    points().forEach((point, index) => {
      const cell = board.querySelector(
        `button[data-x="${point.x}"][data-y="${point.y}"]`
      );

      if (!cell) return;

      const marker = document.createElement('span');

      marker.className = 'ws-objective-mark';
      marker.dataset.wsObjectiveMarker = point.id;
      marker.textContent = `КТ${index + 1}`;
      marker.setAttribute('aria-hidden', 'true');

      cell.append(marker);
    });
  }

    function sync({ preserveInput = false } = {}) {
    ensureHistory();

    if (
      selectedId &&
      !points().some(point => point.id === selectedId)
    ) {
      selectedId = '';
      formNeedsReset = true;
    }

    select.replaceChildren();

    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = 'Новая точка';
    select.append(empty);

    points().forEach((point, index) => {
      const option = document.createElement('option');

      option.value = point.id;
      option.textContent =
        `КТ${index + 1}: ${point.title} · ${coordinate(point)}`;

      select.append(option);
    });

    select.value = selectedId;

    saveButton.textContent = selectedId
      ? 'Применить к КТ'
      : 'Добавить КТ';

    saveButton.disabled = !getMap();
    deleteButton.disabled = !selectedId;
    undoButton.disabled = undo.length === 0;
    redoButton.disabled = redo.length === 0;

    summary.textContent =
      `Точек: ${points().length} из ${MAX_POINTS} · ` +
      `Отмена: ${undo.length} · Повтор: ${redo.length}`;

    if (!preserveInput || formNeedsReset) {
      fillForm();
    }

    formNeedsReset = false;
    drawMarkers();
  }

  function apply(next, text) {
    ensureHistory();

    const map = getMap();

    if (!map) throw new Error('Сначала откройте карту.');

    if (!validMapObjectives(next)) {
      throw new Error(
        'Проверьте КТ: до 30 точек, название до 80 символов, ' +
        'координаты в пределах поля, без совпадающих клеток.'
      );
    }

    if (JSON.stringify(next) === raw()) {
      message('Данные КТ не изменились.');
      return;
    }

    undo.push(clone(points()));
    if (undo.length > HISTORY_LIMIT) undo.shift();

    redo = [];

    map.layers.objectives = clone(next);
    expectedRaw = raw();

    onChange();
    sync();

    message(text + ' Сохраните карту в библиотеку.');
  }

  function replay(direction) {
    ensureHistory();

    const map = getMap();
    if (!map) return;

    const source = direction === 'undo' ? undo : redo;
    const destination = direction === 'undo' ? redo : undo;

    if (!source.length) return;

    const restored = source[source.length - 1];

    if (!validMapObjectives(restored)) {
      throw new Error('Некорректные данные КТ в истории.');
    }

    destination.push(clone(points()));
    if (destination.length > HISTORY_LIMIT) destination.shift();

    map.layers.objectives = source.pop();
    expectedRaw = raw();

    onChange();
    sync();

    message(
      direction === 'undo'
        ? 'Изменение КТ отменено. Сохраните карту в библиотеку.'
        : 'Изменение КТ повторено. Сохраните карту в библиотеку.'
    );
  }

  function safely(action) {
    try {
      action();
    } catch (error) {
      message(error.message, true);
    }
  }

  select.addEventListener('change', () => {
    selectedId = select.value;
    sync();
  });

  find('[data-map-point-new]').addEventListener('click', () => {
    selectedId = '';
    sync();
    titleInput.focus();
  });

  form.addEventListener('submit', event => {
    event.preventDefault();

    safely(() => {
      ensureHistory();

      const title = titleInput.value.trim();
      const x = Number(xInput.value);
      const y = Number(yInput.value);

      if (!title || title.length > MAX_TITLE) {
        throw new Error('Название КТ: от 1 до 80 символов.');
      }

      if (points().some(point =>
        point.id !== selectedId &&
        point.x === x &&
        point.y === y
      )) {
        throw new Error('На этой клетке уже есть КТ.');
      }

      const next = clone(points());

      if (selectedId) {
        const index = next.findIndex(point => point.id === selectedId);

        if (index < 0) {
          throw new Error('Выбранная КТ больше не найдена.');
        }

        next[index] = { id: selectedId, title, x, y };
      } else {
        if (next.length >= MAX_POINTS) {
          throw new Error('Допускается не больше 30 КТ.');
        }

        next.push({
          id: crypto.randomUUID(),
          title,
          x,
          y
        });
      }

      apply(next, 'Контрольные точки карты обновлены.');
    });
  });

  deleteButton.addEventListener('click', () => {
    safely(() => {
      ensureHistory();

      const point = points().find(item => item.id === selectedId);
      if (!point) return;

      if (!confirm(
        `Удалить КТ «${point.title}» из карты? ` +
        'Местность и зоны останутся прежними.'
      )) {
        return;
      }

      apply(
        points().filter(item => item.id !== point.id),
        'КТ удалена.'
      );
    });
  });

  undoButton.addEventListener('click', () => {
    safely(() => replay('undo'));
  });

  redoButton.addEventListener('click', () => {
    safely(() => replay('redo'));
  });

  // Редактор местности пересоздаёт клетки поля.
  // Изменения внутри самих клеток не отслеживаем:
  // собственные метки не вызывают цикл перерисовки.
  new MutationObserver(drawMarkers).observe(board, {
    childList: true
  });

  return { sync, resetHistory };
}