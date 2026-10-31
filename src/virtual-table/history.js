// src/virtual-table/history.js
//
// Общая история основного стола и подключённых модулей.
// До 40 изменений, только в памяти текущей страницы.

const LIMIT = 40;

let initialized = false;
let undoStack = [];
let redoStack = [];

let getState;
let applyState;
let notify;

let undoButton;
let redoButton;
let summary;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function equal(first, second) {
  return JSON.stringify(first) === JSON.stringify(second);
}

export function initHistory(options) {
  if (initialized) return;

  const fieldPanel = document.querySelector('.vt-field-panel');
  const boardScroll = fieldPanel?.querySelector('.vt-board-scroll');

  if (!fieldPanel || !boardScroll) {
    console.error('История: не найдены элементы поля.');
    return;
  }

  getState = options.getState;
  applyState = options.applyState;
  notify = options.message;

  const panel = document.createElement('section');
  panel.className = 'vt-field-toolbar';
  panel.setAttribute('aria-label', 'Отмена и повтор изменений');

  panel.innerHTML = `
    <button type="button"
      class="builder-action-btn"
      data-history-action="undo"
      disabled>
      ↶ Отменить
    </button>

    <button type="button"
      class="builder-action-btn"
      data-history-action="redo"
      disabled>
      ↷ Повторить
    </button>

    <span data-history-summary
      role="status"
      aria-live="polite">
      История пока пуста.
    </span>
  `;

  boardScroll.before(panel);

  undoButton = panel.querySelector('[data-history-action="undo"]');
  redoButton = panel.querySelector('[data-history-action="redo"]');
  summary = panel.querySelector('[data-history-summary]');

  panel.addEventListener('click', event => {
    const button = event.target.closest('[data-history-action]');

    if (!button || button.disabled) return;

    if (button.dataset.historyAction === 'undo') {
      travel('undo');
    }

    if (button.dataset.historyAction === 'redo') {
      travel('redo');
    }
  });

  initialized = true;
  updatePanel();
}

/* ==========================================================================
   Основной стол
   ========================================================================== */

export function recordHistory(previousState, nextState, description) {
  if (!initialized || !previousState || !nextState) return;

  recordExternalHistory({
    before: previousState,
    after: nextState,
    description,
    getCurrent: getState,
    apply: applyState
  });
}

/* ==========================================================================
   Подключаемые модули
   ========================================================================== */

export function recordExternalHistory(options) {
  if (!initialized) return;

  const {
    before,
    after,
    description,
    getCurrent,
    apply
  } = options;

  if (
    typeof getCurrent !== 'function' ||
    typeof apply !== 'function'
  ) {
    throw new Error('Не заданы обработчики истории модуля.');
  }

  if (equal(before, after)) return;

  undoStack.push({
    before: clone(before),
    after: clone(after),
    description: String(description || 'Изменение стола'),
    getCurrent,
    apply
  });

  if (undoStack.length > LIMIT) {
    undoStack.shift();
  }

  redoStack = [];
  updatePanel();
}

export function clearHistory() {
  undoStack = [];
  redoStack = [];
  updatePanel();
}

/* ==========================================================================
   Отмена и повтор
   ========================================================================== */

function travel(direction) {
  const undo = direction === 'undo';

  const source = undo ? undoStack : redoStack;
  const destination = undo ? redoStack : undoStack;

  const entry = source.at(-1);
  if (!entry) return;

  const expected = undo ? entry.after : entry.before;
  const target = undo ? entry.before : entry.after;

  try {
    if (!equal(entry.getCurrent(), expected)) {
      clearHistory();

      notify(
        'Данные изменились вне истории. ' +
        'История очищена, чтобы не затереть актуальное состояние.',
        true
      );

      return;
    }

    // Если применение или сохранение не удалось,
    // запись остаётся в исходном стеке.
    entry.apply(clone(target));

    source.pop();
    destination.push(entry);

    updatePanel();

    notify(
      `${undo ? 'Отменено' : 'Повторено'}: ${entry.description}`
    );
  } catch (error) {
    notify(
      `Не удалось ${undo ? 'отменить' : 'повторить'} изменение: ` +
      error.message,
      true
    );
  }
}

/* ==========================================================================
   Панель
   ========================================================================== */

function updatePanel() {
  if (!undoButton || !redoButton || !summary) return;

  const undoEntry = undoStack.at(-1);
  const redoEntry = redoStack.at(-1);

  undoButton.disabled = !undoEntry;
  redoButton.disabled = !redoEntry;

  undoButton.title = undoEntry
    ? `Отменить: ${undoEntry.description}`
    : 'Нет изменений для отмены';

  redoButton.title = redoEntry
    ? `Повторить: ${redoEntry.description}`
    : 'Нет изменений для повтора';

  summary.textContent = undoStack.length || redoStack.length
    ? `Для отмены: ${undoStack.length} · Для повтора: ${redoStack.length}`
    : 'История пока пуста.';
}