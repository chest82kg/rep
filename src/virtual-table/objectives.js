// src/virtual-table/objectives.js
//
// Ручные контрольные точки и счёт.
// Не определяет условия миссии и не начисляет очки автоматически.
//
// Изменения включены в общую историю стола.
//
// Защита записи:
// — запоминаем исходную строку localStorage;
// — проверяем её перед каждой записью;
// — проверяем также отмену, повтор, импорт и явный сброс;
// — внешнее изменение очищает общую историю;
// — повреждённые данные не заменяются без явного сброса.
//
// localStorage не поддерживает атомарный compare-and-set.
// Одновременное редактирование в нескольких вкладках
// по-прежнему не рекомендуется.

import {
  recordExternalHistory,
  clearHistory
} from './history.js';

import {
  validMapObjectives
} from '../workshop/objectives.js';

const STORAGE_KEY = 'mt_virtual_table_objectives_v1';

const LETTERS = 'ABCDEFGHIJKLMN';
const MAX_OBJECTIVES = 30;
const MAX_TITLE_LENGTH = 80;
const MAX_SCORE = 99999;

const OWNERS = {
  neutral: 'Нейтральная',
  a: 'Игрок А',
  b: 'Игрок Б'
};

const COLORS = {
  neutral: '#ffe09c',
  a: '#c1b6ff',
  b: '#84e0ef'
};

const clone = value => JSON.parse(JSON.stringify(value));

let initialized = false;
let importMapObjectives = null;

/**
 * Явная замена КТ партии точками карты.
 *
 * Счёт сохраняется.
 * Контроль новых точек — neutral.
 * Идентификаторы создаются заново.
 */
export function replaceObjectivesFromMap(points, mapName) {
  if (!validMapObjectives(points)) {
    throw new Error(
      'Контрольные точки карты не прошли проверку.'
    );
  }

  if (!importMapObjectives) {
    throw new Error(
      'Модуль контрольных точек стола ещё не готов.'
    );
  }

  const prepared = points.map(point => ({
    id: crypto.randomUUID(),
    title: point.title.trim(),
    x: point.x,
    y: point.y,
    owner: 'neutral'
  }));

  return importMapObjectives(
    prepared,
    String(mapName ?? 'Без названия')
  );
}

function emptyData() {
  return {
    version: 1,
    scores: {
      a: 0,
      b: 0
    },
    objectives: []
  };
}

function validData(data) {
  if (
    !data ||
    data.version !== 1 ||
    !data.scores ||
    !Array.isArray(data.objectives) ||
    data.objectives.length > MAX_OBJECTIVES
  ) {
    return false;
  }

  for (const side of ['a', 'b']) {
    const score = data.scores[side];

    if (
      !Number.isInteger(score) ||
      score < 0 ||
      score > MAX_SCORE
    ) {
      return false;
    }
  }

  const ids = new Set();
  const cells = new Set();

  return data.objectives.every(point => {
    if (
      !point ||
      typeof point.id !== 'string' ||
      ids.has(point.id) ||
      typeof point.title !== 'string' ||
      !point.title.trim() ||
      point.title.length > MAX_TITLE_LENGTH ||
      !Number.isInteger(point.x) ||
      !Number.isInteger(point.y) ||
      point.x < 0 ||
      point.x >= 14 ||
      point.y < 0 ||
      point.y >= 14 ||
      !Object.hasOwn(OWNERS, point.owner)
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

/**
 * Проверка миссии для внешней резервной копии.
 *
 * Основные условия берём из действующего validData.
 * Дополнительно запрещаем неизвестные поля
 * и пустые/слишком длинные идентификаторы.
 *
 * Проверку старых локальных сохранений не меняем.
 */
export function validMissionBackup(data) {
  function exactKeys(value, keys) {
    return Boolean(
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.keys(value).length === keys.length &&
      keys.every(key => Object.hasOwn(value, key))
    );
  }

  if (
    !exactKeys(data, [
      'version',
      'scores',
      'objectives'
    ]) ||
    !exactKeys(data.scores, ['a', 'b']) ||
    !validData(data)
  ) {
    return false;
  }

  return data.objectives.every(point =>
    exactKeys(point, [
      'id',
      'title',
      'x',
      'y',
      'owner'
    ]) &&
    point.id.trim().length > 0 &&
    point.id.length <= 120
  );
}

export function initObjectives() {
  if (initialized) return;

  const detailsPanel = document.querySelector(
    '.vt-details-panel'
  );

  const board = document.getElementById('vt-board');

  if (!detailsPanel || !board) {
    console.error(
      'Контрольные точки: не найдены элементы стола.'
    );
    return;
  }

  initialized = true;

  let data = emptyData();

  // Последняя успешно прочитанная или записанная строка.
  let expectedRaw = null;

  // При ошибке первоначального чтения нельзя разрешать
  // замену неизвестного содержимого хранилища.
  let hasReadSnapshot = false;

  // Непустая строка блокирует обычные изменения.
  // Явный сброс допускается только после проверки expectedRaw.
  let loadError = '';

  try {
    expectedRaw = localStorage.getItem(STORAGE_KEY);
    hasReadSnapshot = true;

    if (expectedRaw !== null) {
      const saved = JSON.parse(expectedRaw);

      if (!validData(saved)) {
        throw new Error('Неподдерживаемый формат данных.');
      }

      data = saved;
    }
  } catch (error) {
    loadError =
      `Не удалось восстановить точки и счёт: ${error.message} ` +
      'Исходное сохранение не изменено.';
  }

  const section = document.createElement('section');
  section.className = 'vt-detail-block';

  // Только статическая разметка приложения.
  section.innerHTML = `
    <h3 style="margin-top: 0;">Задачи миссии</h3>

    <p class="vt-muted">
      Ручные точки и счёт.
      Контроль и начисление очков определяются игроками
      по выбранному батлплану.
      Обычные изменения включены в общую историю отмены.
    </p>

    <div id="vt-objective-scores"></div>

    <hr class="vt-panel-divider">

    <form id="vt-objective-form">
      <label class="vt-note-label"
             for="vt-objective-title">
        Название точки
      </label>

      <input id="vt-objective-title"
             type="text"
             maxlength="${MAX_TITLE_LENGTH}"
             placeholder="Например: центральная точка"
             required>

      <div class="vt-terrain-form"
           style="margin-top: 10px;">
        <label>
          Столбец
          <select id="vt-objective-column">
            ${[...LETTERS].map((letter, index) => `
              <option value="${index}">${letter}</option>
            `).join('')}
          </select>
        </label>

        <label>
          Строка
          <select id="vt-objective-row">
            ${Array.from({ length: 14 }, (_, index) => `
              <option value="${index}">${index + 1}</option>
            `).join('')}
          </select>
        </label>
      </div>

      <button type="submit"
              class="builder-action-btn">
        Добавить точку
      </button>
    </form>

    <p id="vt-objective-message"
       class="vt-muted"
       role="status"
       aria-live="polite"></p>

    <div id="vt-objective-list"></div>

    <div class="vt-detail-actions">
      <button type="button"
              class="builder-action-btn"
              data-mission-action="reset">
        Сбросить точки и счёт
      </button>
    </div>

    <p class="vt-muted">
      Точки и счёт сохраняются отдельно от армий.
      Замена ростера и переход к следующему раунду
      их не сбрасывают.
      Явный сброс миссии очищает общую историю отмены.
      Не редактируйте миссию одновременно в разных вкладках.
    </p>
  `;

  detailsPanel.append(section);

  const titleInput = section.querySelector(
    '#vt-objective-title'
  );

  Object.assign(titleInput.style, {
    width: '100%',
    minHeight: '40px',
    padding: '8px',
    color: '#eeeaf5',
    background: '#20202d',
    border: '1px solid #3b3b4d',
    borderRadius: '6px',
    font: 'inherit',
    fontSize: '0.82rem'
  });

  const status = section.querySelector(
    '#vt-objective-message'
  );

  const list = section.querySelector(
    '#vt-objective-list'
  );

  const scores = section.querySelector(
    '#vt-objective-scores'
  );

  function message(text, error = false) {
    status.textContent = text;
    status.style.color = error ? '#ffadb7' : '#b9dfc5';
  }

  /* ========================================================================
     Защита записи
     ======================================================================== */

  function assertWritable({ allowReset = false } = {}) {
    if (!hasReadSnapshot) {
      throw new Error(
        'Исходное сохранение миссии не удалось прочитать. ' +
        'Перезагрузите страницу после восстановления ' +
        'доступа к хранилищу.'
      );
    }

    let actualRaw;

    try {
      actualRaw = localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      throw new Error(
        `Хранилище миссии недоступно: ${error.message}`
      );
    }

    if (actualRaw !== expectedRaw) {
      loadError =
        'Точки или счёт изменены вне этой вкладки. ' +
        'Текущее отображение может быть устаревшим.';

      clearHistory();

      throw new Error(
        loadError +
        ' Запись остановлена. Перезагрузите страницу ' +
        'и повторите действие.'
      );
    }

    if (loadError && !allowReset) {
      throw new Error(
        loadError +
        ' Обычные изменения заблокированы. ' +
        'Перезагрузите страницу; для удаления повреждённых ' +
        'данных предусмотрен явный сброс миссии.'
      );
    }
  }

  function persist(next, { allowReset = false } = {}) {
    if (!validData(next)) {
      throw new Error(
        'Некорректные данные точек или счёта.'
      );
    }

    // Сериализация до проверки сокращает промежуток
    // между чтением ожидаемой строки и записью.
    const raw = JSON.stringify(next);

    assertWritable({ allowReset });

    localStorage.setItem(STORAGE_KEY, raw);

    // Только успешная запись меняет ожидаемую строку.
    expectedRaw = raw;
    hasReadSnapshot = true;
  }

  /* ========================================================================
     Сохранение и история
     ======================================================================== */

  function applyFromHistory(restored) {
    if (!validData(restored)) {
      throw new Error(
        'Некорректные данные миссии в истории.'
      );
    }

    persist(restored);

    data = restored;

    render();

    message(
      'Данные миссии восстановлены через историю изменений.'
    );
  }

  function save(change, successText) {
    try {
      // Проверяем до подготовки изменения.
      assertWritable();

      const previous = data;
      const next = clone(data);

      change(next);

      // persist повторно проверяет строку непосредственно
      // перед записью в хранилище.
      persist(next);

      recordExternalHistory({
        before: previous,
        after: next,
        description: successText,
        getCurrent: () => data,
        apply: applyFromHistory
      });

      data = next;

      render();
      message(successText);

      return true;
    } catch (error) {
      message(
        `Не удалось сохранить: ${error.message}`,
        true
      );

      return false;
    }
  }

  importMapObjectives = (points, mapName) => {
    return save(next => {
      next.objectives = points.map(point => ({
        ...point
      }));

      // next.scores намеренно не меняем.
    },
    `Загружены КТ карты «${mapName}»: ${points.length}. ` +
    'Контроль всех точек — нейтральный. Счёт сохранён.');
  };

  function coordinate(point) {
    return `${LETTERS[point.x]}${point.y + 1}`;
  }

  /* ========================================================================
     Счёт
     ======================================================================== */

  function renderScores() {
    scores.replaceChildren();

    for (const side of ['a', 'b']) {
      const row = document.createElement('div');
      row.className = 'vt-detail-block';

      const label = document.createElement('strong');
      label.dataset.missionScoreSide = side;
label.dataset.missionScoreValue = String(data.scores[side]);

      label.textContent =
        `${side === 'a' ? 'Игрок А' : 'Игрок Б'}: ` +
        data.scores[side];

      const actions = document.createElement('div');
      actions.className = 'vt-detail-actions';

      for (const delta of [-1, 1]) {
        const button = document.createElement('button');

        button.type = 'button';
        button.className = 'builder-action-btn';
        button.dataset.missionAction = 'score';
        button.dataset.side = side;
        button.dataset.delta = String(delta);
        button.textContent =
          delta < 0 ? '−1 очко' : '+1 очко';

        button.disabled = delta < 0
          ? data.scores[side] === 0
          : data.scores[side] === MAX_SCORE;

        actions.append(button);
      }

      row.append(label, actions);
      scores.append(row);
    }
  }

  /* ========================================================================
     Список точек
     ======================================================================== */

  function renderList() {
    list.replaceChildren();

    if (!data.objectives.length) {
      const empty = document.createElement('p');

      empty.className = 'vt-muted';
      empty.textContent =
        'Контрольные точки ещё не добавлены.';

      list.append(empty);
      return;
    }

    data.objectives.forEach((point, index) => {
      const item = document.createElement('div');
      item.className = 'vt-detail-block';

      const heading = document.createElement('strong');

      heading.textContent =
        `КТ${index + 1}: ${point.title} · ` +
        coordinate(point);

      const label = document.createElement('label');
      label.className = 'vt-note-label';
      label.textContent = 'Контроль';

      const select = document.createElement('select');
      select.dataset.objectiveOwner = point.id;

      for (const [value, text] of Object.entries(OWNERS)) {
        const option = document.createElement('option');

        option.value = value;
        option.textContent = text;

        select.append(option);
      }

      select.value = point.owner;

      Object.assign(select.style, {
        width: '100%',
        minHeight: '40px',
        padding: '8px',
        color: '#eeeaf5',
        background: '#20202d',
        border: '1px solid #3b3b4d',
        borderRadius: '6px'
      });

      const remove = document.createElement('button');

      remove.type = 'button';
      remove.className = 'builder-action-btn';
      remove.dataset.missionAction = 'remove';
      remove.dataset.id = point.id;
      remove.textContent = 'Удалить точку';
      remove.style.marginTop = '9px';

      label.append(select);
      item.append(heading, label, remove);
      list.append(item);
    });
  }

  /* ========================================================================
     Маркеры на игровом поле
     ======================================================================== */

  function drawBoardMarkers() {
    board.querySelectorAll('[data-vt-objective-marker]')
      .forEach(marker => marker.remove());

    data.objectives.forEach((point, index) => {
      const cell = board.querySelector(
        `button[data-x="${point.x}"][data-y="${point.y}"]`
      );

      if (!cell) return;

      const marker = document.createElement('span');

      marker.dataset.vtObjectiveMarker = point.id;
      marker.setAttribute('aria-hidden', 'true');
      marker.textContent = `КТ${index + 1}`;

      Object.assign(marker.style, {
        position: 'absolute',
        bottom: '1px',
        left: '1px',
        zIndex: '6',
        padding: '1px 3px',
        color: COLORS[point.owner],
        background: 'rgba(13, 14, 20, 0.92)',
        border: `1px solid ${COLORS[point.owner]}`,
        borderRadius: '3px',
        fontSize: 'calc(var(--vt-cell) * 0.17)',
        fontWeight: '800',
        lineHeight: '1.1',
        pointerEvents: 'none'
      });

      cell.append(marker);
    });
  }

  function render() {
    renderScores();
    renderList();
    drawBoardMarkers();
  }

  /* ========================================================================
     Добавление точки
     ======================================================================== */

  section.querySelector('#vt-objective-form')
    .addEventListener('submit', event => {
      event.preventDefault();

      const title = titleInput.value.trim();

      const x = Number(
        section.querySelector('#vt-objective-column').value
      );

      const y = Number(
        section.querySelector('#vt-objective-row').value
      );

      if (!title) {
        message('Введите название точки.', true);
        return;
      }

      if (data.objectives.length >= MAX_OBJECTIVES) {
        message(
          `Допускается не больше ${MAX_OBJECTIVES} точек.`,
          true
        );
        return;
      }

      if (
        data.objectives.some(point =>
          point.x === x && point.y === y
        )
      ) {
        message(
          'На этой клетке уже есть контрольная точка.',
          true
        );
        return;
      }

      const saved = save(next => {
        next.objectives.push({
          id: crypto.randomUUID(),
          title,
          x,
          y,
          owner: 'neutral'
        });
      },
      `Добавлена точка «${title}»: ` +
      `${LETTERS[x]}${y + 1}.`);

      if (saved) {
        titleInput.value = '';
      }
    });

  /* ========================================================================
     Контроль точки
     ======================================================================== */

  section.addEventListener('change', event => {
    const select = event.target.closest(
      '[data-objective-owner]'
    );

    if (!select) return;

    const id = select.dataset.objectiveOwner;
    const owner = select.value;

    const point = data.objectives.find(
      item => item.id === id
    );

    if (!point || !Object.hasOwn(OWNERS, owner)) {
      renderList();
      return;
    }

    const saved = save(next => {
      const target = next.objectives.find(
        item => item.id === id
      );

      if (!target) {
        throw new Error('Контрольная точка не найдена.');
      }

      target.owner = owner;
    },
    `Контроль точки «${point.title}»: ` +
    `${OWNERS[owner]}. Счёт не изменён.`);

    if (!saved) {
      renderList();
    }
  });

  /* ========================================================================
     Кнопки
     ======================================================================== */

  section.addEventListener('click', event => {
    const button = event.target.closest(
      '[data-mission-action]'
    );

    if (!button || button.disabled) return;

    const action = button.dataset.missionAction;

    if (action === 'score') {
      const side = button.dataset.side;
      const delta = Number(button.dataset.delta);

      if (
        !['a', 'b'].includes(side) ||
        ![-1, 1].includes(delta)
      ) {
        return;
      }

      const sideName = side === 'a'
        ? 'Игрок А'
        : 'Игрок Б';

      save(next => {
        next.scores[side] += delta;
      },
      `${sideName}: ${delta > 0 ? '+1' : '−1'} очко.`);

      return;
    }

    if (action === 'remove') {
      const point = data.objectives.find(
        item => item.id === button.dataset.id
      );

      if (!point) return;

      if (!confirm(
        `Удалить точку «${point.title}»? Счёт сохранится.`
      )) {
        return;
      }

      save(next => {
        next.objectives = next.objectives.filter(
          item => item.id !== point.id
        );
      },
      `Удалена точка «${point.title}». Счёт не изменён.`);

      return;
    }

    if (action !== 'reset') return;

    // Проверяем до показа подтверждения.
    try {
      assertWritable({ allowReset: true });
    } catch (error) {
      message(
        `Сброс не выполнен: ${error.message}`,
        true
      );
      return;
    }

    if (!confirm(
      'Удалить все контрольные точки ' +
      'и обнулить счёт обеих сторон?\n\n' +
      'Армии, раунд, модели, заметки, ландшафт ' +
      'и памятка сценария не изменятся.\n\n' +
      'Общая история отмены будет очищена. ' +
      'Отменить сброс нельзя.' +
      (loadError
        ? '\n\nНепрочитанные или повреждённые данные миссии ' +
          'будут заменены пустой миссией.'
        : '')
    )) {
      return;
    }

    try {
      const next = emptyData();

      // Повторная проверка после подтверждения.
      persist(next, { allowReset: true });

      data = next;
      loadError = '';

      clearHistory();
      render();

      message(
        'Контрольные точки удалены. ' +
        'Счёт обнулён. История очищена.'
      );
    } catch (error) {
      message(
        `Не удалось выполнить сброс: ${error.message}`,
        true
      );
    }
  });

  /* ========================================================================
     Внешние изменения
     ======================================================================== */

  function refreshFromStorage() {
    let raw;

    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      loadError =
        `Не удалось проверить миссию: ${error.message}`;

      clearHistory();
      message(loadError, true);
      return;
    }

    if (hasReadSnapshot && raw === expectedRaw) {
      return;
    }

    // Запоминаем фактически прочитанную строку даже при
    // повреждении: явный сброс должен проверять именно её.
    expectedRaw = raw;
    hasReadSnapshot = true;

    clearHistory();

    try {
      const next = raw === null
        ? emptyData()
        : JSON.parse(raw);

      if (!validData(next)) {
        throw new Error(
          'Некорректное сохранение точек или счёта.'
        );
      }

      data = next;
      loadError = '';

      render();

      message(
        'Точки и счёт обновлены из хранилища. ' +
        'Общая история очищена.'
      );
    } catch (error) {
      // Последние прочитанные корректные данные остаются
      // на экране, но обычная запись заблокирована.
      loadError =
        `Не удалось обновить миссию: ${error.message} ` +
        'Показанные точки и счёт могут быть устаревшими. ' +
        'Исходная строка сохранения не изменена.';

      message(loadError, true);
    }
  }

  window.addEventListener('storage', event => {
    if (event.storageArea !== localStorage) return;

    if (
      event.key !== STORAGE_KEY &&
      event.key !== null
    ) {
      return;
    }

    refreshFromStorage();
  });

  // Дополнительная проверка при возвращении во вкладку.
  window.addEventListener('focus', refreshFromStorage);

  // Наблюдаем только замену непосредственных детей поля.
  // Добавление маркеров внутрь клеток не создаёт цикл.
  new MutationObserver(drawBoardMarkers).observe(board, {
    childList: true
  });

  render();

  if (loadError) {
    message(loadError, true);
  }
}