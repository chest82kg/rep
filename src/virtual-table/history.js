// src/virtual-table/history.js
//
// Общая история локального стола и подключённых модулей.
// До 40 изменений, только в памяти текущей страницы.
//
// Клавиатура:
// — Cmd/Ctrl+Z: отмена;
// — Cmd/Ctrl+Shift+Z: повтор;
// — Ctrl+Y: повтор.
//
// Не перехватывает редактирование полей и открытые диалоги.
// Онлайн-стол этот модуль не подключает.

const LIMIT = 40;

let initialized = false;
let busy = false;

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

  if (
    !options ||
    typeof options.getState !== 'function' ||
    typeof options.applyState !== 'function' ||
    typeof options.message !== 'function'
  ) {
    throw new Error(
      'История: не заданы необходимые обработчики.'
    );
  }

  const fieldPanel = document.querySelector(
    '.vt-field-panel'
  );

  const boardScroll = fieldPanel?.querySelector(
    '.vt-board-scroll'
  );

  if (!fieldPanel || !boardScroll) {
    console.error(
      'История: не найдены элементы поля.'
    );
    return;
  }

  getState = options.getState;
  applyState = options.applyState;
  notify = options.message;

  const panel = document.createElement('section');

  panel.className = 'vt-field-toolbar';
  panel.setAttribute(
    'aria-label',
    'Отмена и повтор изменений'
  );

  // Только статическая разметка приложения.
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

  undoButton = panel.querySelector(
    '[data-history-action="undo"]'
  );

  redoButton = panel.querySelector(
    '[data-history-action="redo"]'
  );

  summary = panel.querySelector(
    '[data-history-summary]'
  );

  panel.addEventListener('click', event => {
    const button = event.target instanceof Element
      ? event.target.closest('[data-history-action]')
      : null;

    if (!button || button.disabled || busy) return;

    const direction = button.dataset.historyAction;

    if (direction === 'undo' || direction === 'redo') {
      travel(direction);
    }
  });

  document.addEventListener(
    'keydown',
    handleHistoryShortcut
  );

  initialized = true;
  updatePanel();
}

/* ==========================================================================
   Основной стол
   ========================================================================== */

export function recordHistory(
  previousState,
  nextState,
  description
) {
  if (
    !initialized ||
    !previousState ||
    !nextState
  ) {
    return;
  }

  recordExternalHistory({
    before: previousState,
    after: nextState,
    description,
    getCurrent: getState,
    apply: applyState
  });
}

/* ==========================================================================
   Подключённые модули
   ========================================================================== */

export function recordExternalHistory(options) {
  if (!initialized || busy) return;

  const {
    before,
    after,
    description,
    getCurrent,
    apply
  } = options || {};

  if (
    typeof getCurrent !== 'function' ||
    typeof apply !== 'function'
  ) {
    throw new Error(
      'Не заданы обработчики истории модуля.'
    );
  }

  if (equal(before, after)) return;

  // Подготавливаем снимки до изменения стеков.
  const entry = {
    before: clone(before),
    after: clone(after),
    description: String(
      description || 'Изменение стола'
    ),
    getCurrent,
    apply
  };

  undoStack.push(entry);

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
  if (!initialized || busy) return;

  const undo = direction === 'undo';

  const source = undo ? undoStack : redoStack;
  const destination = undo ? redoStack : undoStack;

  const entry = source.at(-1);

  if (!entry) return;

  const expected = undo
    ? entry.after
    : entry.before;

  const target = undo
    ? entry.before
    : entry.after;

  busy = true;
  updatePanel();

  try {
    if (!equal(entry.getCurrent(), expected)) {
      clearHistory();

      notify(
        'Данные изменились вне истории. ' +
        'История очищена, чтобы не затереть ' +
        'актуальное состояние.',
        true
      );

      return;
    }

    // Обработчики существующих модулей синхронные.
    // При ошибке применения запись остаётся в исходном
    // стеке, если сам модуль не очистил историю.
    entry.apply(clone(target));

    // Модуль мог явно очистить общую историю.
    // Не возвращаем после этого старую запись.
    const historyUnchanged = undo
      ? source === undoStack &&
        destination === redoStack
      : source === redoStack &&
        destination === undoStack;

    if (
      !historyUnchanged ||
      source.at(-1) !== entry
    ) {
      return;
    }

    source.pop();
    destination.push(entry);

    if (destination.length > LIMIT) {
      destination.shift();
    }

    notify(
      `${undo ? 'Отменено' : 'Повторено'}: ` +
      entry.description
    );
  } catch (error) {
    notify(
      `Не удалось ${
        undo ? 'отменить' : 'повторить'
      } изменение: ${error.message}`,
      true
    );
  } finally {
    busy = false;
    updatePanel();
  }
}

/* ==========================================================================
   Клавиатура
   ========================================================================== */

function isEditingTarget(target) {
  if (!(target instanceof Element)) return false;

  return Boolean(
    target.closest('input, textarea, select') ||
    target.closest('[role="textbox"]') ||
    (
      target instanceof HTMLElement &&
      target.isContentEditable
    )
  );
}

function hasVisibleDialog() {
  return [
    ...document.querySelectorAll(
      'dialog[open], [role="dialog"], [aria-modal="true"]'
    )
  ].some(element => {
    const style = getComputedStyle(element);

    return element.getClientRects().length > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden';
  });
}

function shortcutDirection(event) {
  if (
    event.altKey ||
    (!event.ctrlKey && !event.metaKey) ||
    (event.ctrlKey && event.metaKey)
  ) {
    return null;
  }

  // code работает независимо от русской/английской
  // раскладки физической клавиатуры.
  const key = String(event.key || '').toLowerCase();

  const z = event.code === 'KeyZ' || key === 'z';
  const y = event.code === 'KeyY' || key === 'y';

  if (z) {
    return event.shiftKey ? 'redo' : 'undo';
  }

  if (
    y &&
    event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey
  ) {
    return 'redo';
  }

  return null;
}

function handleHistoryShortcut(event) {
  if (
    !initialized ||
    event.defaultPrevented ||
    event.isComposing ||
    isEditingTarget(event.target) ||
    isEditingTarget(document.activeElement)
  ) {
    return;
  }

  const direction = shortcutDirection(event);

  if (!direction || hasVisibleDialog()) return;

  // За пределами редакторов сочетание относится
  // к истории стола, даже когда стек пуст.
  event.preventDefault();

  // Удержание клавиш не должно отменять всю партию.
  if (event.repeat || busy) return;

  const source = direction === 'undo'
    ? undoStack
    : redoStack;

  if (!source.length) {
    notify(
      direction === 'undo'
        ? 'Нет изменений для отмены.'
        : 'Нет изменений для повтора.'
    );

    return;
  }

  travel(direction);
}

/* ==========================================================================
   Панель
   ========================================================================== */

function updatePanel() {
  if (
    !undoButton ||
    !redoButton ||
    !summary
  ) {
    return;
  }

  const undoEntry = undoStack.at(-1);
  const redoEntry = redoStack.at(-1);

  undoButton.disabled = busy || !undoEntry;
  redoButton.disabled = busy || !redoEntry;

  undoButton.title = undoEntry
    ? `Отменить: ${undoEntry.description} ` +
      '(⌘Z / Ctrl+Z)'
    : 'Нет изменений для отмены (⌘Z / Ctrl+Z)';

  redoButton.title = redoEntry
    ? `Повторить: ${redoEntry.description} ` +
      '(⌘Shift+Z / Ctrl+Shift+Z)'
    : 'Нет изменений для повтора ' +
      '(⌘Shift+Z / Ctrl+Shift+Z)';

  summary.textContent = busy
    ? 'Применяем изменение…'
    : undoStack.length || redoStack.length
      ? `Для отмены: ${undoStack.length} · ` +
        `Для повтора: ${redoStack.length}`
      : 'История пока пуста.';
}