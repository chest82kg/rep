// src/virtual-table/dice.js
//
// Локальные числовые броски моделей.
// Не изменяет сохранение партии, ХП, ресурсы или активации.
//
// Один механизм броска для карточки и отдельного окна.
// Количество D6 определяется категорией модели.
// Последний результат хранится в памяти до перезагрузки.
//
// Проверка canRoll на клиенте не заменяет серверные правила.

const results = new Map();
const animationTimers = new WeakMap();

let initialized = false;
let options = null;

let dialog = null;
let dialogContent = null;
let dialogModelKey = null;
let returnFocus = null;

export function getModelDiceCount(role) {
  const normalized = String(role ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase('ru-RU')
    .replace(/ё/g, 'е')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const categories = {
    'базовый': 3,
    'базовая': 3,
    'базовые': 3,
    'базовая модель': 3,
    'базовый отряд': 3,

    'элита': 4,
    'элитный': 4,
    'элитная': 4,
    'элитная модель': 4,
    'элитный отряд': 4,

    'герой': 5,
    'герои': 5
  };

  return Object.hasOwn(categories, normalized)
    ? categories[normalized]
    : null;
}

export function rollD6Pool(count) {
  if (![3, 4, 5].includes(count)) {
    throw new Error('Поддерживаются только броски 3D6, 4D6 и 5D6.');
  }

  const values = [];
  const bytes = new Uint8Array(16);

  while (values.length < count) {
    crypto.getRandomValues(bytes);

    for (const value of bytes) {
      if (value >= 252) continue;

      values.push((value % 6) + 1);

      if (values.length === count) break;
    }
  }

  return values;
}

function modelKey(tableId, unitId) {
  return JSON.stringify([tableId, unitId]);
}

function currentContext() {
  const table = options?.getState();
  const unit = options?.getSelectedUnit();

  if (!table || !unit) return null;

  return {
    table,
    unit,
    key: modelKey(table.id, unit.id)
  };
}

function createDiceRow(values) {
  const row = document.createElement('div');
  row.className = 'vt-dice-row';
  row.setAttribute('aria-hidden', 'true');

  values.forEach((value, index) => {
    const die = document.createElement('span');

    die.className = 'vt-die';
    die.dataset.value = String(value);
    die.style.setProperty('--vt-die-order', String(index));

    for (let position = 1; position <= 9; position++) {
      const pip = document.createElement('span');

      pip.className = 'vt-die-pip';
      pip.dataset.pip = String(position);

      die.append(pip);
    }

    row.append(die);
  });

  return row;
}

function showResult(container, result, animate = false) {
  const previousTimer = animationTimers.get(container);

  if (previousTimer) {
    clearTimeout(previousTimer);
    animationTimers.delete(container);
  }

  container.classList.remove('is-rolling');
  container.replaceChildren();

  if (!result) {
    const placeholder = document.createElement('p');

    placeholder.className = 'vt-dice-placeholder';
    placeholder.textContent = 'Бросков этой модели пока нет.';

    container.append(placeholder);
    return;
  }

  const numbers = document.createElement('p');

  numbers.className = 'vt-dice-numbers';
  numbers.textContent = result.values.join(' · ');

  container.append(
    createDiceRow(result.values),
    numbers
  );

  if (
    animate &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    void container.offsetWidth;
    container.classList.add('is-rolling');

    const timer = setTimeout(() => {
      container.classList.remove('is-rolling');
      animationTimers.delete(container);
    }, 700);

    animationTimers.set(container, timer);
  }
}

function handleRoll(event) {
  const button = event.target instanceof Element
    ? event.target.closest('[data-model-dice-roll]')
    : null;

  if (!button || button.disabled) return;

  const context = currentContext();

  if (!context) return;

  const { table, unit, key } = context;

  // Защита от броска из устаревшего представления.
  const panel = button.closest('.vt-model-dice');

  if (!panel || panel.dataset.diceModel !== key) return;

  try {
    if (!options.canRoll(unit)) {
      options.message('Можно бросать только за свои модели.', true);
      return;
    }

    const count = getModelDiceCount(unit.role);

    if (count === null) {
      options.message(
        'Категория модели не распознана. Бросок не выполнен.',
        true
      );
      return;
    }

    const result = {
      id: crypto.randomUUID(),
      tableId: table.id,
      unitId: unit.id,
      values: rollD6Pool(count)
    };

    results.set(key, result);

    // Один результат одновременно отображается
    // в полной карточке и в окне кубиков.
    const roots = [
      document.getElementById('vt-details'),
      dialogContent
    ];

    roots.forEach(root => {
      root?.querySelectorAll('.vt-model-dice').forEach(element => {
        if (element.dataset.diceModel !== key) return;

        const output = element.querySelector('.vt-dice-result');

        if (output) {
          showResult(output, result, element === panel);
        }
      });
    });

    options.message(
      `${unit.uniqueKey || unit.title || 'Модель'} · ` +
      `${count}D6: ${result.values.join(' · ')}. ` +
      'Локальный бросок. Игровые эффекты не применялись.'
    );
  } catch (error) {
    options.message(
      `Не удалось бросить кубики: ${error.message}`,
      true
    );
  }
}

function createPanel(context) {
  const { unit, key } = context;

  const count = getModelDiceCount(unit.role);
  const allowed = options.canRoll(unit);

  const panel = document.createElement('section');

  panel.className = 'vt-model-dice';
  panel.dataset.diceModel = key;
  panel.setAttribute('aria-label', 'Бросок кубиков модели');

  const heading = document.createElement('div');
  heading.className = 'vt-dice-heading';

  const title = document.createElement('strong');
  title.textContent = 'Кубики модели';

  const badge = document.createElement('span');
  badge.className = 'vt-dice-pool';
  badge.textContent = count === null ? '—' : `${count}D6`;

  heading.append(title, badge);

  const button = document.createElement('button');

  button.type = 'button';
  button.className = 'builder-action-btn vt-dice-roll';
  button.dataset.modelDiceRoll = '';
  button.disabled = count === null || !allowed;

  button.textContent = !allowed
    ? 'Модель другого игрока'
    : count === null
      ? 'Категория не распознана'
      : `Бросить ${count}D6`;

  const output = document.createElement('div');

  output.className = 'vt-dice-result';
  output.setAttribute('role', 'status');
  output.setAttribute('aria-live', 'polite');
  output.setAttribute('aria-atomic', 'true');

  const explanation = document.createElement('p');

  explanation.className = 'vt-dice-explanation';

  explanation.textContent = count === null
    ? `Неизвестная категория: «${unit.role || 'не указана'}».`
    : 'Локальный бросок · без автоматических эффектов';

  showResult(output, results.get(key) || null);

  panel.append(heading, button, output, explanation);

  return panel;
}

function createDialog() {
  dialog = document.createElement('dialog');

  dialog.className = 'vt-dice-dialog';
  dialog.setAttribute('aria-labelledby', 'vt-dice-dialog-title');

  const header = document.createElement('header');
  header.className = 'vt-dice-dialog-header';

  const title = document.createElement('h2');

  title.id = 'vt-dice-dialog-title';
  title.textContent = 'Кубики';

  const close = document.createElement('button');

  close.type = 'button';
  close.className = 'builder-action-btn';
  close.textContent = '×';
  close.setAttribute('aria-label', 'Закрыть окно кубиков');

  close.addEventListener('click', () => dialog.close());

  header.append(title, close);

  dialogContent = document.createElement('div');
  dialogContent.className = 'vt-dice-dialog-content';

  dialog.append(header, dialogContent);
  document.body.append(dialog);

  dialog.addEventListener('click', handleRoll);

  // Escape закрывает только окно.
  // Не передаём его обработчику снятия выбора модели.
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.stopPropagation();
    }
  });

  dialog.addEventListener('close', () => {
    dialogModelKey = null;

    if (
      returnFocus instanceof HTMLElement &&
      returnFocus.isConnected
    ) {
      returnFocus.focus({ preventScroll: true });
    }

    returnFocus = null;
  });
}

function renderDialog(context) {
  const side = context.unit.side === 'b' ? 'B' : 'A';
  const number = `${side}${context.unit.rosterIndex + 1}`;

  const identity = document.createElement('p');

  identity.className = 'vt-dice-dialog-identity';
  identity.textContent =
    `${number} · ` +
    `${context.unit.uniqueKey || context.unit.title || 'Модель'}`;

  dialogContent.replaceChildren(
    identity,
    createPanel(context)
  );
}

function installStyles() {
  const style = document.createElement('style');

  style.textContent = `
    .vt-dice-dialog {
      width: 390px;
      max-width: calc(100vw - 32px);
      max-height: calc(100dvh - 40px);
      box-sizing: border-box;
      padding: 16px;

      color: #e8e2d5;
      background: #1b252b;
      border: 1px solid #78877a;
      border-top: 3px solid #c3a66b;
      border-radius: 8px;
      box-shadow: 0 16px 65px rgba(0, 0, 0, 0.55);
      overflow: auto;
    }

    .vt-dice-dialog::backdrop {
      background: rgba(9, 15, 19, 0.42);
    }

    .vt-dice-dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 12px;
    }

    .vt-dice-dialog-header h2 {
      margin: 0;
      color: #e5d1a5;
      font-size: 1.1rem;
    }

    .vt-dice-dialog-header button {
      min-width: 36px;
      min-height: 36px;
      font-size: 1.1rem;
    }

    .vt-dice-dialog-identity {
      margin: 0 0 14px;
      color: #c7d3ca;
      font-size: 0.85rem;
      line-height: 1.5;
      overflow-wrap: anywhere;
    }

    .vt-dice-dialog .vt-model-dice {
      margin: 0;
      padding: 12px;
      border: 1px solid #46574f;
      border-radius: 5px;
      background: #202d32;
    }

    .vt-dice-dialog .vt-dice-heading {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .vt-dice-dialog .vt-dice-roll {
      width: 100%;
      min-height: 42px;
      color: #f0dfbc;
      background: #3c3a2c;
      border: 1px solid #9d885c;
      border-radius: 4px;
    }

    .vt-dice-dialog .vt-dice-result {
      min-height: 96px;
      padding-top: 14px;
      text-align: center;
    }

    .vt-dice-dialog .vt-dice-row {
      justify-content: center;
      flex-wrap: wrap;
    }

    .vt-dice-dialog .vt-dice-numbers {
      color: #ead5a7;
      font-size: 1rem;
      font-variant-numeric: tabular-nums;
    }

    .vt-dice-dialog .vt-dice-placeholder,
    .vt-dice-dialog .vt-dice-explanation {
      color: #b5c0b9;
      font-size: 0.76rem;
      line-height: 1.5;
    }

    .vt-dice-dialog button:focus-visible {
      outline: 2px solid #ead5a7;
      outline-offset: 3px;
    }
  `;

  document.head.append(style);
}

export function initModelDice(config) {
  if (initialized) return;

  if (
    !config ||
    typeof config.getState !== 'function' ||
    typeof config.getSelectedUnit !== 'function' ||
    typeof config.canRoll !== 'function' ||
    typeof config.message !== 'function'
  ) {
    throw new Error('Кубики: не заданы необходимые обработчики.');
  }

  const details = document.getElementById('vt-details');

  if (!details) {
    throw new Error('Кубики: не найдена карточка модели.');
  }

  options = config;

  installStyles();
  createDialog();

  details.addEventListener('click', handleRoll);

  initialized = true;
}

/**
 * Открывает окно без автоматического броска.
 */
export function openModelDice() {
  if (!initialized) return;

  const context = currentContext();

  if (!context) {
    options.message('Сначала выберите модель.', true);
    return;
  }

  if (dialog.open) return;

  returnFocus = document.activeElement;
  dialogModelKey = context.key;

  renderDialog(context);
  dialog.showModal();

  const rollButton = dialogContent.querySelector(
    '[data-model-dice-roll]'
  );

  if (rollButton && !rollButton.disabled) {
    rollButton.focus({ preventScroll: true });
  } else {
    dialog.querySelector('header button')
      ?.focus({ preventScroll: true });
  }
}

/**
 * Вызывается после перестроения полной карточки модели.
 * Последний результат сохраняется при изменении ХП и фронта.
 */
export function renderModelDice() {
  if (!initialized) return;

  const details = document.getElementById('vt-details');

  details.querySelector('.vt-model-dice')?.remove();

  const context = currentContext();

  if (dialog.open) {
    if (!context || context.key !== dialogModelKey) {
      dialog.close();
    }
  }

  if (!context) return;

  const panel = createPanel(context);
  const controls = details.querySelector('.vt-card-controls');

  if (controls) {
    controls.after(panel);
  } else {
    details.append(panel);
  }

  if (dialog.open) {
    const hadRollFocus =
      dialogContent.contains(document.activeElement) &&
      document.activeElement?.matches('[data-model-dice-roll]');

    renderDialog(context);

    if (hadRollFocus) {
      const button = dialogContent.querySelector(
        '[data-model-dice-roll]'
      );

      if (button && !button.disabled) {
        button.focus({ preventScroll: true });
      }
    }
  }
}