// src/virtual-table/dice.js
//
// Локальные числовые броски моделей.
// Не изменяет основное сохранение, ХП, ресурсы или активации.
//
// Владение в будущем онлайн-режиме задаётся через canRoll.
// Проверка на клиенте не заменяет правила доступа Firebase.

const results = new Map();
const animationTimers = new WeakMap();

let initialized = false;
let options = null;

/**
 * Только известные категории.
 * Неизвестная роль не превращается автоматически в базовую.
 */
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

/**
 * Равномерный D6 через rejection sampling:
 * значения 252–255 отбрасываются.
 *
 * Это качественная браузерная случайность,
 * но не серверная защита от подмены результата.
 */
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
    // Перезапуск анимации даже при повторном броске.
    void container.offsetWidth;
    container.classList.add('is-rolling');

    const timer = setTimeout(() => {
      container.classList.remove('is-rolling');
      animationTimers.delete(container);
    }, 700);

    animationTimers.set(container, timer);
  }
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
  initialized = true;

  details.addEventListener('click', event => {
    const button = event.target instanceof Element
      ? event.target.closest('[data-model-dice-roll]')
      : null;

    if (!button || button.disabled) return;

    const table = options.getState();
    const unit = options.getSelectedUnit();

    if (!table || !unit) return;

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

    const panel = button.closest('.vt-model-dice');
    const output = panel?.querySelector('.vt-dice-result');

    if (!output) return;

    try {
      const result = {
        id: crypto.randomUUID(),
        tableId: table.id,
        unitId: unit.id,
        values: rollD6Pool(count)
      };

      results.set(modelKey(table.id, unit.id), result);
      showResult(output, result, true);

      options.message(
        `${unit.uniqueKey || unit.title || 'Модель'} · ` +
        `${count}D6: ${result.values.join(' · ')}. ` +
        'Локальный бросок. Игровые эффекты не применялись.'
      );
    } catch (error) {
      options.message(`Не удалось бросить кубики: ${error.message}`, true);
    }
  });
}

/**
 * Вызывается после перестроения карточки выбранной модели.
 * Последний результат не теряется при изменении ХП или фронта.
 */
export function renderModelDice() {
  if (!initialized) return;

  const details = document.getElementById('vt-details');

  details.querySelector('.vt-model-dice')?.remove();

  const table = options.getState();
  const unit = options.getSelectedUnit();

  if (!table || !unit) return;

  const count = getModelDiceCount(unit.role);
  const allowed = options.canRoll(unit);

  const panel = document.createElement('section');
  panel.className = 'vt-model-dice';
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

  const explanation = document.createElement('p');
  explanation.className = 'vt-dice-explanation';

  explanation.textContent = count === null
    ? `Неизвестная категория: «${unit.role || 'не указана'}».`
    : 'Локальный бросок · без автоматических эффектов';

  showResult(
    output,
    results.get(modelKey(table.id, unit.id)) || null
  );

  panel.append(heading, button, output, explanation);

  const controls = details.querySelector('.vt-card-controls');

  if (controls) {
    controls.after(panel);
  } else {
    details.append(panel);
  }
}