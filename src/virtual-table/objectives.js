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

let readObjectives = null;

// Только независимая копия для отображения.
// Изменять миссию через этот интерфейс нельзя.
export function getTableObjectives() {
  return readObjectives ? readObjectives() : [];
}

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

    readObjectives = () => clone(data.objectives);

  let pointDialog = null;
  let pointDialogId = null;
  let pointDialogHeading = null;
  let pointDialogStatus = null;
  let pointDialogButtons = [];

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

  function syncPointDialog() {
    if (!pointDialog) return;

    const point = data.objectives.find(
      item => item.id === pointDialogId
    );

    if (!point) {
      pointDialog.close();
      return;
    }

    pointDialogHeading.textContent =
      `${point.title} · ${coordinate(point)}`;

    for (const button of pointDialogButtons) {
      const selected = button.dataset.pointOwner === point.owner;

      button.classList.toggle('primary', selected);
      button.setAttribute('aria-pressed', String(selected));

      // При ошибке чтения/внешнем конфликте не предлагаем запись.
      button.disabled = selected || Boolean(loadError);
    }
  }

  function openPointDialog(id, trigger) {
    if (document.querySelector('dialog[open]')) return;

    const point = data.objectives.find(item => item.id === id);

    if (!point) return;

    const dialog = document.createElement('dialog');
    dialog.className = 'vt-point-control-dialog';
    dialog.setAttribute('aria-label', 'Контроль точки');

    const heading = document.createElement('h2');

    const explanation = document.createElement('p');
    explanation.textContent =
      'Изменение контроля сохраняется сразу. ' +
      'Счёт не меняется; очки начисляют игроки вручную.';

    const actions = document.createElement('div');
    actions.className = 'vt-detail-actions';

    const buttons = [];

    for (const [owner, label] of Object.entries(OWNERS)) {
      const button = document.createElement('button');

      button.type = 'button';
      button.className = 'builder-action-btn';
      button.dataset.pointOwner = owner;
      button.textContent = label;

      button.addEventListener('click', () => {
        const actual = data.objectives.find(
          item => item.id === id
        );

        if (!actual) {
          dialog.close();
          return;
        }

        if (actual.owner === owner) return;

        const saved = save(next => {
          const target = next.objectives.find(
            item => item.id === id
          );

          if (!target) {
            throw new Error('Контрольная точка больше не найдена.');
          }

          target.owner = owner;
        },
        `Контроль точки «${actual.title}»: ` +
        `${OWNERS[owner]}. Счёт не изменён.`);

        // При ошибке показываем сообщение и в самом окне,
        // а не только в скрытой за ним панели миссии.
        if (pointDialog === dialog) {
          pointDialogStatus.textContent = saved
            ? `Контроль: ${OWNERS[owner]}. Счёт не изменён.`
            : status.textContent;

          syncPointDialog();

          // Выбранная кнопка теперь отключена.
          // Не оставляем на ней клавиатурный фокус.
          if (saved) closeButton.focus({ preventScroll: true });
        }
      });

      buttons.push(button);
      actions.append(button);
    }

    const dialogStatus = document.createElement('p');
    dialogStatus.setAttribute('role', 'status');
    dialogStatus.setAttribute('aria-live', 'polite');
    dialogStatus.textContent = loadError || '';

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'builder-action-btn';
    closeButton.textContent = 'Закрыть';
    closeButton.autofocus = true;

    closeButton.addEventListener('click', () => dialog.close());

    dialog.append(
      heading,
      explanation,
      actions,
      dialogStatus,
      closeButton
    );

    const position = { x: point.x, y: point.y };

    pointDialog = dialog;
    pointDialogId = id;
    pointDialogHeading = heading;
    pointDialogStatus = dialogStatus;
    pointDialogButtons = buttons;

    dialog.addEventListener('close', () => {
      if (pointDialog === dialog) {
        pointDialog = null;
        pointDialogId = null;
        pointDialogHeading = null;
        pointDialogStatus = null;
        pointDialogButtons = [];
      }

      dialog.remove();

      // Маркер мог быть перестроен после записи.
      const visibleMarker = [
        ...document.querySelectorAll('[data-vt-point-open]')
      ].find(element =>
        element.dataset.vtPointOpen === id &&
        element.getClientRects().length > 0
      );

      const fallbackCell = board.querySelector(
        `button[data-x="${position.x}"]` +
        `[data-y="${position.y}"]`
      );

      const target = trigger?.isConnected &&
        trigger.getClientRects().length > 0
          ? trigger
          : visibleMarker || fallbackCell;

      // У маркера сетки нет отдельного tab-stop:
      // возвращаем фокус в содержащую его клетку.
      const focusTarget = target?.closest(
        'button[data-x][data-y]'
      ) || target;

      if (
        focusTarget &&
        focusTarget.getClientRects().length > 0
      ) {
        focusTarget.focus({ preventScroll: true });
      }
    }, { once: true });

    document.body.append(dialog);
    syncPointDialog();

    try {
      dialog.showModal();
    } catch (error) {
      pointDialog = null;
      pointDialogId = null;
      pointDialogHeading = null;
      pointDialogStatus = null;
      pointDialogButtons = [];

      dialog.remove();

      message(
        `Не удалось открыть контроль точки: ${error.message}`,
        true
      );
    }
  }

  function pointTrigger(event) {
    return event.target instanceof Element
      ? event.target.closest('[data-vt-point-open]')
      : null;
  }

  // Перехватываем только точное нажатие на обозначение КТ
  // и только в режиме моделей. Остальная клетка работает
  // как раньше; линейка, маршрут и местность не блокируются.
  document.addEventListener('click', event => {
    const trigger = pointTrigger(event);

    if (
      !trigger ||
      board.dataset.fieldTool !== 'models' ||
      !data.objectives.some(
        point => point.id === trigger.dataset.vtPointOpen
      )
    ) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    openPointDialog(trigger.dataset.vtPointOpen, trigger);
  }, true);

  // SVG-маркер доступен с клавиатуры.
  document.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;

    const trigger = pointTrigger(event);

    if (
      !trigger ||
      !trigger.matches('.vt-iso-objective') ||
      board.dataset.fieldTool !== 'models'
    ) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    openPointDialog(trigger.dataset.vtPointOpen, trigger);
  }, true);

  const pointStyle = document.createElement('style');

  pointStyle.textContent = `
    .vt-point-control-dialog {
      box-sizing: border-box;
      width: min(460px, calc(100vw - 24px));
      max-height: calc(100dvh - 24px);
      margin: auto;
      padding: 22px;
      overflow: auto;
      color: #e8e2d7;
      background: #191f24;
      border: 1px solid #ad9866;
      border-radius: 6px;
      box-shadow: 0 16px 60px #0009;
    }

    .vt-point-control-dialog::backdrop {
      background: rgb(5 10 7 / 75%);
    }

    .vt-point-control-dialog h2 {
      margin: 0 0 14px;
      color: #d0b477;
      font-size: 21px;
      overflow-wrap: anywhere;
    }

    .vt-point-control-dialog p {
      line-height: 1.6;
      overflow-wrap: anywhere;
    }

    .vt-point-control-dialog .vt-detail-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    #vt-board[data-field-tool="models"]
      [data-vt-point-open] {
      cursor: pointer;
    }
  `;

  document.head.append(pointStyle);
     
  function renderScores() {
    scores.replaceChildren();

    for (const side of ['a', 'b']) {
      const sideName = side === 'a'
        ? 'Игрок А'
        : 'Игрок Б';

      const row = document.createElement('div');
      row.className = 'vt-detail-block';

      const label = document.createElement('strong');

      // Эти атрибуты используются существующей панелью партии.
      label.dataset.missionScoreSide = side;
      label.dataset.missionScoreValue = String(data.scores[side]);

      label.textContent =
        `${sideName}: ${data.scores[side]}`;

      const quickActions = document.createElement('div');
      quickActions.className = 'vt-detail-actions';

      // Существующие быстрые действия и их обработчик сохраняем.
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

        quickActions.append(button);
      }

      const adjustForm = document.createElement('form');
      adjustForm.setAttribute(
        'aria-label',
        `Изменение счёта: ${sideName}`
      );

      Object.assign(adjustForm.style, {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'end',
        gap: '8px',
        marginTop: '12px'
      });

      const amountLabel = document.createElement('label');
      amountLabel.textContent = 'Количество очков';

      Object.assign(amountLabel.style, {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        flex: '0 1 150px',
        minWidth: '0',
        fontSize: '0.82rem'
      });

      const amountInput = document.createElement('input');

      amountInput.type = 'number';
      amountInput.min = '1';
      amountInput.max = String(MAX_SCORE);
      amountInput.step = '1';
      amountInput.required = true;
      amountInput.inputMode = 'numeric';
      amountInput.placeholder = 'Например, 5';
      amountInput.dataset.missionScoreAmount = side;

      Object.assign(amountInput.style, {
        boxSizing: 'border-box',
        width: '100%',
        minHeight: '40px',
        padding: '8px',
        color: '#eeeaf5',
        background: '#20202d',
        border: '1px solid #3b3b4d',
        borderRadius: '6px',
        font: 'inherit'
      });

      amountLabel.append(amountInput);

      const addButton = document.createElement('button');

      addButton.type = 'submit';
      addButton.className = 'builder-action-btn';
      addButton.dataset.scoreDirection = '1';
      addButton.textContent = 'Добавить';

      const subtractButton = document.createElement('button');

      subtractButton.type = 'submit';
      subtractButton.className = 'builder-action-btn';
      subtractButton.dataset.scoreDirection = '-1';
      subtractButton.textContent = 'Снять';

      adjustForm.append(
        amountLabel,
        addButton,
        subtractButton
      );

      adjustForm.addEventListener('submit', event => {
        event.preventDefault();

        // Не передаём отправку этой формы другим обработчикам.
        event.stopPropagation();

        const raw = amountInput.value.trim();
        const amount = Number(raw);

        if (
          amountInput.validity.badInput ||
          raw === '' ||
          !Number.isSafeInteger(amount) ||
          amount < 1 ||
          amount > MAX_SCORE
        ) {
          message(
            `Укажите целое количество очков от 1 до ${MAX_SCORE}.`,
            true
          );

          amountInput.focus({ preventScroll: true });
          return;
        }

        // Enter в числовом поле означает добавление.
        const direction =
          event.submitter?.dataset.scoreDirection === '-1'
            ? -1
            : 1;

        const delta = direction * amount;

        const saved = save(next => {
          const result = next.scores[side] + delta;

          // Не обрезаем результат молча:
          // либо применяем всё изменение, либо ничего.
          if (
            !Number.isSafeInteger(result) ||
            result < 0 ||
            result > MAX_SCORE
          ) {
            throw new Error(
              direction < 0
                ? `${sideName}: нельзя снять ${amount} очков. ` +
                  `Текущий счёт — ${next.scores[side]}.`
                : `${sideName}: после добавления ${amount} очков ` +
                  `счёт превысит ${MAX_SCORE}.`
            );
          }

          next.scores[side] = result;
        },
        `${sideName}: ${direction > 0 ? '+' : '−'}${amount} очков.`);

        if (!saved) {
          // save() не перестраивает форму при ошибке.
          // Введённое количество остаётся доступным.
          amountInput.focus({ preventScroll: true });
          return;
        }

        // Успешный save() уже перестроил панель.
        // Возвращаем фокус в новое поле той же стороны.
        scores.querySelector(
          `[data-mission-score-amount="${side}"]`
        )?.focus({ preventScroll: true });
      });

      row.append(label, quickActions, adjustForm);
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
      marker.dataset.vtPointOpen = point.id;
      marker.textContent = `КТ${index + 1}`;

      marker.title =
        `${point.title} · ${OWNERS[point.owner]}. ` +
        'В режиме моделей нажмите для изменения контроля.';

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
        pointerEvents: 'auto'
      });

      cell.append(marker);
    });
  }

  function render() {
    renderScores();
    renderList();
    drawBoardMarkers();
    syncPointDialog();

    document.dispatchEvent(
      new Event('vt:objectives-updated')
    );
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