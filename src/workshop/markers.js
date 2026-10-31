// src/workshop/markers.js
//
// Ручные маркеры-памятки документа карты.
// Не создают игровых эффектов и не связаны со счётом.
//
// Импорт модуля не запускает редактор.

const SIZE = 14;
const MAX_MARKERS = 50;
const MAX_TITLE = 80;
const MAX_NOTE = 2000;
const HISTORY_LIMIT = 40;
const LETTERS = 'ABCDEFGHIJKLMN';

const clone = value => JSON.parse(JSON.stringify(value));

export function validMapMarkers(markers) {
  if (
    !Array.isArray(markers) ||
    markers.length > MAX_MARKERS
  ) {
    return false;
  }

  const ids = new Set();
  const cells = new Set();
  const fields = ['id', 'title', 'note', 'x', 'y'];

  return markers.every(marker => {
    if (
      !marker ||
      typeof marker !== 'object' ||
      Array.isArray(marker) ||
      typeof marker.id !== 'string' ||
      !marker.id.trim() ||
      marker.id.length > 120 ||
      ids.has(marker.id) ||
      typeof marker.title !== 'string' ||
      !marker.title.trim() ||
      marker.title.length > MAX_TITLE ||
      typeof marker.note !== 'string' ||
      marker.note.length > MAX_NOTE ||
      !Number.isInteger(marker.x) ||
      !Number.isInteger(marker.y) ||
      marker.x < 0 ||
      marker.x >= SIZE ||
      marker.y < 0 ||
      marker.y >= SIZE ||
      Object.keys(marker).some(key => !fields.includes(key))
    ) {
      return false;
    }

    const key = `${marker.x}:${marker.y}`;

    if (cells.has(key)) return false;

    ids.add(marker.id);
    cells.add(key);

    return true;
  });
}

export function initMapMarkers({
  getMap,
  onChange,
  message
}) {
  const board = document.getElementById('ws-board');
  const scroll = board?.closest('.ws-board-scroll');

  if (!board || !scroll) {
    throw new Error('Не найдено поле мастерской для маркеров.');
  }

  if (document.getElementById('ws-markers-controls')) {
    throw new Error('Редактор маркеров уже запущен.');
  }

  const panel = document.createElement('section');

  panel.id = 'ws-markers-controls';
  panel.className = 'ws-markers-controls';
  panel.setAttribute('aria-label', 'Маркеры-памятки карты');

  // Только статическая разметка приложения.
  panel.innerHTML = `
    <h3>Маркеры-памятки</h3>

    <p class="ws-muted">
      Произвольные заметки на клетках.
      Маркеры не создают препятствий, не меняют характеристики
      и не начисляют очки.
    </p>

    <form data-marker-form>
      <label>
        Маркер
        <select data-marker-select>
          <option value="">Новый маркер</option>
        </select>
      </label>

      <label>
        Название
        <input type="text"
               maxlength="${MAX_TITLE}"
               data-marker-title
               required>
      </label>

      <label>
        Заметка
        <textarea rows="4"
                  maxlength="${MAX_NOTE}"
                  data-marker-note></textarea>
      </label>

      <div class="ws-actions">
        <label>
          Столбец
          <select data-marker-x>
            ${[...LETTERS].map((letter, x) => `
              <option value="${x}">${letter}</option>
            `).join('')}
          </select>
        </label>

        <label>
          Строка
          <select data-marker-y>
            ${Array.from({ length: SIZE }, (_, y) => `
              <option value="${y}">${y + 1}</option>
            `).join('')}
          </select>
        </label>
      </div>

      <div class="ws-actions">
        <button type="submit"
                class="builder-action-btn"
                data-marker-save>
          Добавить маркер
        </button>

        <button type="button"
                class="builder-action-btn"
                data-marker-new>
          Новый маркер
        </button>

        <button type="button"
                class="builder-action-btn ws-delete"
                data-marker-delete>
          Удалить выбранный
        </button>
      </div>
    </form>

    <div class="ws-actions">
      <button type="button"
              class="builder-action-btn"
              data-marker-undo>
        ↶ Отменить маркер
      </button>

      <button type="button"
              class="builder-action-btn"
              data-marker-redo>
        ↷ Повторить маркер
      </button>
    </div>

    <p class="ws-muted" data-marker-summary></p>

    <p class="ws-muted">
      Заполнение формы само по себе не изменяет документ.
      Нажмите «Добавить маркер» или «Применить к маркеру»,
      затем сохраните карту в библиотеку.
      Переключение выбранного маркера сбрасывает
      неприменённый ввод формы.
    </p>
  `;

  // Форма маркеров находится вне формы свойств карты.
  // Если панель КТ уже создана, размещаем маркеры после неё.
  const anchor = scroll.parentElement.querySelector(
    '.ws-objectives-controls'
  ) || scroll;

  anchor.after(panel);

  const find = selector => panel.querySelector(selector);

  const form = find('[data-marker-form]');
  const select = find('[data-marker-select]');
  const titleInput = find('[data-marker-title]');
  const noteInput = find('[data-marker-note]');
  const xInput = find('[data-marker-x]');
  const yInput = find('[data-marker-y]');
  const saveButton = find('[data-marker-save]');
  const deleteButton = find('[data-marker-delete]');
  const undoButton = find('[data-marker-undo]');
  const redoButton = find('[data-marker-redo]');
  const summary = find('[data-marker-summary]');

    let selectedId = '';
  let mapId = null;
  let expectedRaw = null;
  let undo = [];
  let redo = [];

  // При смене документа форму нужно заполнить заново.
  // При сохранении той же карты неприменённый ввод сохраняем.
  let formNeedsReset = true;

  function markers() {
    return getMap()?.layers?.markers || [];
  }

  function raw() {
    return JSON.stringify(markers());
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

  function fillForm() {
    const marker = markers().find(item => item.id === selectedId);

    titleInput.value = marker?.title || '';
    noteInput.value = marker?.note || '';
    xInput.value = String(marker?.x ?? 0);
    yInput.value = String(marker?.y ?? 0);
  }

  function drawMarkers() {
    board.querySelectorAll('[data-ws-note-marker]')
      .forEach(element => element.remove());

    markers().forEach((marker, index) => {
      const cell = board.querySelector(
        `button[data-x="${marker.x}"][data-y="${marker.y}"]`
      );

      if (!cell) return;

      const mark = document.createElement('span');

      mark.className = 'ws-note-marker';
      mark.dataset.wsNoteMarker = marker.id;
      mark.textContent = `М${index + 1}`;
      mark.setAttribute('aria-hidden', 'true');

      cell.append(mark);
    });
  }

    function sync({ preserveInput = false } = {}) {
    ensureHistory();

    if (
      selectedId &&
      !markers().some(marker => marker.id === selectedId)
    ) {
      selectedId = '';
      formNeedsReset = true;
    }

    select.replaceChildren();

    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = 'Новый маркер';
    select.append(empty);

    markers().forEach((marker, index) => {
      const option = document.createElement('option');

      option.value = marker.id;
      option.textContent =
        `М${index + 1}: ${marker.title} · ` +
        `${LETTERS[marker.x]}${marker.y + 1}`;

      select.append(option);
    });

    select.value = selectedId;

    saveButton.textContent = selectedId
      ? 'Применить к маркеру'
      : 'Добавить маркер';

    saveButton.disabled = !getMap();
    deleteButton.disabled = !selectedId;
    undoButton.disabled = undo.length === 0;
    redoButton.disabled = redo.length === 0;

    summary.textContent =
      `Маркеров: ${markers().length} из ${MAX_MARKERS} · ` +
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

    if (!map) {
      throw new Error('Сначала откройте карту.');
    }

    if (!validMapMarkers(next)) {
      throw new Error(
        'Некорректные маркеры. Проверьте координаты, ' +
        'названия, длину заметок и совпадающие клетки.'
      );
    }

    if (JSON.stringify(next) === raw()) {
      message('Данные маркера не изменились.');
      return;
    }

    undo.push(clone(markers()));
    if (undo.length > HISTORY_LIMIT) undo.shift();

    redo = [];

    map.layers.markers = clone(next);
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

    if (!validMapMarkers(restored)) {
      throw new Error('Некорректные маркеры в истории.');
    }

    destination.push(clone(markers()));
    if (destination.length > HISTORY_LIMIT) destination.shift();

    map.layers.markers = source.pop();
    expectedRaw = raw();

    onChange();
    sync();

    message(
      direction === 'undo'
        ? 'Изменение маркеров отменено. Сохраните карту.'
        : 'Изменение маркеров повторено. Сохраните карту.'
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

  find('[data-marker-new]').addEventListener('click', () => {
    selectedId = '';
    sync();
    titleInput.focus();
  });

  form.addEventListener('submit', event => {
    event.preventDefault();

    safely(() => {
      ensureHistory();

      const title = titleInput.value.trim();
      const note = noteInput.value;
      const x = Number(xInput.value);
      const y = Number(yInput.value);

      if (!title || title.length > MAX_TITLE) {
        throw new Error('Название маркера: от 1 до 80 символов.');
      }

      if (note.length > MAX_NOTE) {
        throw new Error('Заметка: не больше 2000 символов.');
      }

      if (markers().some(marker =>
        marker.id !== selectedId &&
        marker.x === x &&
        marker.y === y
      )) {
        throw new Error('На этой клетке уже есть маркер-памятка.');
      }

      const next = clone(markers());

      if (selectedId) {
        const index = next.findIndex(
          marker => marker.id === selectedId
        );

        if (index < 0) {
          throw new Error('Выбранный маркер больше не найден.');
        }

        next[index] = {
          id: selectedId,
          title,
          note,
          x,
          y
        };
      } else {
        if (next.length >= MAX_MARKERS) {
          throw new Error('Допускается не больше 50 маркеров.');
        }

        next.push({
          id: crypto.randomUUID(),
          title,
          note,
          x,
          y
        });
      }

      apply(next, 'Маркеры карты обновлены.');
    });
  });

  deleteButton.addEventListener('click', () => {
    safely(() => {
      ensureHistory();

      const marker = markers().find(
        item => item.id === selectedId
      );

      if (!marker) return;

      if (!confirm(
        `Удалить маркер «${marker.title}»? ` +
        'Местность, зоны и КТ останутся прежними.'
      )) {
        return;
      }

      apply(
        markers().filter(item => item.id !== marker.id),
        'Маркер удалён.'
      );
    });
  });

  undoButton.addEventListener('click', () => {
    safely(() => replay('undo'));
  });

  redoButton.addEventListener('click', () => {
    safely(() => replay('redo'));
  });

  // Следим только за пересозданием клеток самого поля.
  // Добавление меток внутрь клеток не запускает наблюдатель.
  new MutationObserver(drawMarkers).observe(board, {
    childList: true
  });

  return { sync, resetHistory };
}