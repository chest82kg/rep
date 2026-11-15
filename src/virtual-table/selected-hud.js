// src/virtual-table/selected-hud.js
//
// Компактная карточка выбранной модели поверх карты.
//
// ХП, активация, усталость и фронт передаются существующим
// кнопкам #vt-details. Их обработчики отвечают за сохранение
// и общую историю.
//
// Маршрут переключается через общую панель инструментов.
// Кубики открываются существующим диалогом.
//
// Отдельного игрового состояния здесь нет.
// Раскрытие выбора фронта — только состояние интерфейса.

import { openModelDice } from './dice.js';

const desktop = window.matchMedia('(min-width: 1001px)');

const DIRECTIONS = [
  {
    key: 'n',
    name: 'К первой строке',
    short: 'К строке 1',
    gridArrow: '↑',
    isoArrow: '↗'
  },
  {
    key: 'e',
    name: 'К столбцу N',
    short: 'К столбцу N',
    gridArrow: '→',
    isoArrow: '↘'
  },
  {
    key: 's',
    name: 'К четырнадцатой строке',
    short: 'К строке 14',
    gridArrow: '↓',
    isoArrow: '↙'
  },
  {
    key: 'w',
    name: 'К столбцу A',
    short: 'К столбцу A',
    gridArrow: '←',
    isoArrow: '↖'
  }
];

let initialized = false;
let latestUnit = null;
let facingMenuOpen = false;

let field;
let scroll;
let panel;
let resizeFrame = null;

export function renderSelectedHUD({ unit }) {
  const nextUnit = unit || null;

  if (latestUnit?.id !== nextUnit?.id) {
    facingMenuOpen = false;
  }

  latestUnit = nextUnit;

  if (!initialized && !initialize()) return;

  renderPanel();
  scheduleFit();
}

function initialize() {
  field = document.querySelector('.vt-field-panel');
  scroll = field?.querySelector('.vt-board-scroll');

  if (!field || !scroll) return false;

  installStyles();
  field.classList.add('vt-has-selected-hud');

  panel = document.createElement('section');
  panel.className = 'vt-selected-hud';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Выбранная модель');

  field.append(panel);

  panel.addEventListener('click', handlePanelClick);
  panel.addEventListener('keydown', handlePanelKeydown);

  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(scheduleFit);
    observer.observe(scroll);
  }

  // Изометрический host может появиться позже.
  const childrenObserver = new MutationObserver(scheduleFit);
  childrenObserver.observe(scroll, { childList: true });

  const board = document.getElementById('vt-board');

  if (board) {
    const boardObserver = new MutationObserver(records => {
      const viewChanged = records.some(record =>
        record.attributeName === 'class'
      );

      const toolChanged = records.some(record =>
        record.attributeName === 'data-field-tool'
      );

      if (viewChanged || toolChanged) renderPanel();
      if (viewChanged) scheduleFit();
    });

    boardObserver.observe(board, {
      attributes: true,
      attributeFilter: ['class', 'data-field-tool']
    });
  }

  desktop.addEventListener('change', scheduleFit);
  window.addEventListener('resize', scheduleFit);

  initialized = true;
  return true;
}

function selectedCard() {
  const card = document.getElementById('vt-details');

  if (
    !latestUnit ||
    card?.dataset.renderedUnit !== latestUnit.id
  ) {
    return null;
  }

  return card;
}

function originalButton(selector) {
  const original = selectedCard()?.querySelector(selector);

  return original instanceof HTMLButtonElement
    ? original
    : null;
}

function clickOriginal(selector) {
  const original = originalButton(selector);

  if (!original || original.disabled) return false;

  // Commit, проверка, сохранение и история —
  // в существующем обработчике полной карточки.
  original.click();
  return true;
}

function routeButton() {
  // У самого поля тоже бывает data-field-tool="route".
  // Поэтому ищем только настоящую кнопку инструмента.
  const button = document.querySelector(
    'button[data-field-tool="route"]'
  );

  return button instanceof HTMLButtonElement
    ? button
    : null;
}

function handlePanelClick(event) {
  const button = event.target instanceof Element
    ? event.target.closest('[data-selected-command]')
    : null;

  if (!button || !panel.contains(button) || button.disabled) {
    return;
  }

  const command = button.dataset.selectedCommand;

  if (command === 'deselect') {
    facingMenuOpen = false;
    document.getElementById('vt-deselect')?.click();
    return;
  }

  if (command === 'dice') {
    openModelDice();
    return;
  }

  if (command === 'route') {
    if (!latestUnit?.position || !selectedCard()) return;

    const original = routeButton();

    if (original && !original.disabled) {
      original.click();
    }

    return;
  }

  if (command === 'details') {
    openDetails();
    return;
  }

  if (command === 'facing-menu') {
    facingMenuOpen = !facingMenuOpen;
    renderPanel();
    return;
  }

  if (command.startsWith('facing-set-')) {
    const facing = command.slice('facing-set-'.length);

    if (!DIRECTIONS.some(item => item.key === facing)) return;

    clickOriginal(
      `[data-action="facing"][data-facing="${facing}"]`
    );

    return;
  }

  const selectors = {
    minus: '[data-action="hp"][data-delta="-1"]',
    plus: '[data-action="hp"][data-delta="1"]',
    activate: '[data-action="activate"]',
    fatigue: '[data-marker-action="fatigue"]',
    'rotate-left': '[data-action="rotate"][data-turn="-1"]',
    'rotate-right': '[data-action="rotate"][data-turn="1"]',
    'facing-clear': '[data-action="facing-clear"]'
  };

  if (selectors[command]) {
    clickOriginal(selectors[command]);
  }
}

function handlePanelKeydown(event) {
  if (
    event.key !== 'Escape' ||
    !facingMenuOpen ||
    event.defaultPrevented ||
    event.isComposing ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey
  ) {
    return;
  }

  // Первый Esc закрывает выбор фронта,
  // не снимает модель и не выключает маршрут.
  event.preventDefault();
  event.stopPropagation();

  facingMenuOpen = false;
  renderPanel();

  panel.querySelector(
    '[data-selected-command="facing-menu"]'
  )?.focus({ preventScroll: true });
}

function openDetails() {
  if (!latestUnit) return;

  if (desktop.matches) {
    const modelButton = [
      ...document.querySelectorAll('.vt-hud button')
    ].find(button =>
      button.textContent.trim() === 'Модель'
    );

    const alreadyOpen =
      document.body.classList.contains('vt-hud-details-open') ||
      modelButton?.getAttribute('aria-expanded') === 'true';

    if (!alreadyOpen) modelButton?.click();
  }

  document.getElementById('vt-tab-model')?.click();
}

function makeButton(command, text, label = text) {
  const button = document.createElement('button');

  button.type = 'button';
  button.className = 'builder-action-btn';
  button.dataset.selectedCommand = command;
  button.textContent = text;
  button.setAttribute('aria-label', label);

  return button;
}

function isIsometricView() {
  return Boolean(
    document.getElementById('vt-board')
      ?.classList.contains('vt-iso-grid-hidden')
  );
}

function directionArrow(direction) {
  return isIsometricView()
    ? direction.isoArrow
    : direction.gridArrow;
}

function renderFacingControls(unit) {
  const container = document.createElement('div');
  container.className = 'vt-selected-facing';

  const row = document.createElement('div');
  row.className = 'vt-selected-facing-row';
  row.setAttribute('role', 'group');
  row.setAttribute('aria-label', 'Ручное направление фронта');

  const direction = DIRECTIONS.find(
    item => item.key === unit.facing
  );

  const selector = makeButton(
    'facing-menu',
    direction
      ? `Фронт: ${directionArrow(direction)}`
      : 'Задать фронт',
    direction
      ? `Фронт: ${direction.name}. Выбрать направление`
      : 'Выбрать направление фронта'
  );

  selector.classList.add('vt-selected-facing-toggle');
  selector.setAttribute('aria-expanded', String(facingMenuOpen));
  selector.setAttribute('aria-controls', 'vt-selected-facing-options');

  selector.title = direction
    ? `${direction.name}. Нажмите для выбора направления.`
    : 'Направление модели пока не задано.';

  const left = makeButton(
    'rotate-left',
    '↶',
    'Повернуть фронт на 90° против часовой стрелки'
  );

  left.title =
    'Повернуть на 90° против часовой стрелки. ' +
    'Ресурсы не списываются.';

  const right = makeButton(
    'rotate-right',
    '↷',
    'Повернуть фронт на 90° по часовой стрелке'
  );

  right.title =
    'Повернуть на 90° по часовой стрелке. ' +
    'Ресурсы не списываются.';

  const originalLeft = originalButton(
    '[data-action="rotate"][data-turn="-1"]'
  );

  const originalRight = originalButton(
    '[data-action="rotate"][data-turn="1"]'
  );

  left.disabled = !originalLeft || originalLeft.disabled;
  right.disabled = !originalRight || originalRight.disabled;

  row.append(selector, left, right);
  container.append(row);

  const options = document.createElement('div');
  options.id = 'vt-selected-facing-options';
  options.className = 'vt-selected-facing-options';
  options.hidden = !facingMenuOpen;
  options.setAttribute('role', 'group');
  options.setAttribute('aria-label', 'Выбор направления фронта');

  for (const item of DIRECTIONS) {
    const button = makeButton(
      `facing-set-${item.key}`,
      `${directionArrow(item)} ${item.short}`,
      `Задать фронт: ${item.name}`
    );

    button.setAttribute(
      'aria-pressed',
      String(unit.facing === item.key)
    );

    button.title = item.name;

    const original = originalButton(
      `[data-action="facing"][data-facing="${item.key}"]`
    );

    button.disabled = !original || original.disabled;
    options.append(button);
  }

  const clear = makeButton(
    'facing-clear',
    'Снять направление',
    'Снять направление фронта модели'
  );

  clear.classList.add('vt-selected-facing-clear');

  const originalClear = originalButton(
    '[data-action="facing-clear"]'
  );

  clear.disabled = !originalClear || originalClear.disabled;

  options.append(clear);
  container.append(options);

  return container;
}

function renderPanel() {
  const unit = latestUnit;
  const focused = document.activeElement;

  const focusedCommand =
    focused instanceof Element && panel.contains(focused)
      ? focused.closest('[data-selected-command]')
        ?.dataset.selectedCommand
      : null;

  panel.replaceChildren();
  panel.hidden = !unit;

  if (!unit) return;

  const side = unit.side === 'b' ? 'B' : 'A';
  const number = `${side}${unit.rosterIndex + 1}`;

  panel.dataset.side = unit.side === 'b' ? 'b' : 'a';

  const heading = document.createElement('div');
  heading.className = 'vt-selected-heading';

  const title = document.createElement('strong');
  title.className = 'vt-selected-title';
  title.textContent =
    `${number} · ${unit.uniqueKey || unit.title || 'Модель'}`;

  const close = makeButton(
    'deselect',
    '×',
    'Снять выбор модели'
  );

  close.classList.add('vt-selected-close');
  close.title = 'Снять выбор · Esc';

  heading.append(title, close);

  const middle = document.createElement('div');
  middle.className = 'vt-selected-middle';

  const location = document.createElement('span');
  location.className = 'vt-selected-location';

  const coordinate = unit.position
    ? `${'ABCDEFGHIJKLMN'[unit.position.x]}${unit.position.y + 1}`
    : 'Резерв';

  const coordinateLine = document.createElement('span');
  coordinateLine.className = 'vt-selected-coordinate';
  coordinateLine.textContent = unit.currentHp === 0
    ? `${coordinate} · Уничтожена`
    : coordinate;

  const characteristics = document.createElement('span');
  characteristics.className = 'vt-selected-characteristics';

  function formatStat(value) {
    return Number.isFinite(value)
      ? value.toLocaleString('ru-RU')
      : '—';
  }

  const movement = document.createElement('span');
  movement.textContent = `Движение ${formatStat(unit.stats.move)}`;
  movement.title =
    'Итоговая характеристика с постоянными бонусами. ' +
    'Это не остаток движения: ресурсы учитывает игрок.';

  const armor = document.createElement('span');
  armor.textContent = `Броня ${formatStat(unit.stats.armor)}`;
  armor.title =
    'Итоговая характеристика с постоянными бонусами. ' +
    'Временные игровые эффекты применяются вручную.';

  characteristics.append(movement, armor);
  location.append(coordinateLine, characteristics);

  const health = document.createElement('div');
  health.className = 'vt-selected-health';
  health.setAttribute('role', 'group');
  health.setAttribute('aria-label', 'ХП выбранной модели');

  const minus = makeButton('minus', '−', 'Уменьшить ХП на 1');
  const originalMinus = originalButton(
    '[data-action="hp"][data-delta="-1"]'
  );

  minus.disabled =
    unit.currentHp <= 0 ||
    !originalMinus ||
    originalMinus.disabled;

  const hp = document.createElement('strong');
  hp.textContent = `${unit.currentHp}/${unit.stats.hp} ХП`;

  const plus = makeButton('plus', '+', 'Увеличить ХП на 1');
  const originalPlus = originalButton(
    '[data-action="hp"][data-delta="1"]'
  );

  plus.disabled =
    unit.currentHp >= unit.stats.hp ||
    !originalPlus ||
    originalPlus.disabled;

  health.append(minus, hp, plus);
  middle.append(location, health);

  const facing = renderFacingControls(unit);

  const states = document.createElement('div');
  states.className = 'vt-selected-states';

  const activate = makeButton(
    'activate',
    unit.activated ? 'Активирована' : 'Активация'
  );

  activate.setAttribute('aria-pressed', String(unit.activated));

  activate.title = unit.activated
    ? 'Снять отметку активации'
    : 'Отметить активированной';

  const originalActivate = originalButton(
    '[data-action="activate"]'
  );

  activate.disabled =
    !originalActivate || originalActivate.disabled;

  const fatigue = makeButton(
    'fatigue',
    unit.fatigued ? 'Усталость: есть' : 'Усталость'
  );

  fatigue.setAttribute(
    'aria-pressed',
    String(Boolean(unit.fatigued))
  );

  fatigue.title = unit.fatigued
    ? 'Снять отметку усталости'
    : 'Отметить усталость';

  const originalFatigue = originalButton(
    '[data-marker-action="fatigue"]'
  );

  fatigue.disabled =
    !originalFatigue || originalFatigue.disabled;

  states.append(activate, fatigue);

  const routeEnabled =
    document.getElementById('vt-board')
      ?.dataset.fieldTool === 'route';

  const route = makeButton(
    'route',
    routeEnabled ? 'Закрыть маршрут' : 'Построить маршрут'
  );

  route.classList.add('vt-selected-route');
  route.setAttribute('aria-pressed', String(routeEnabled));

  const originalRoute = routeButton();

  route.disabled =
    !unit.position ||
    !selectedCard() ||
    !originalRoute ||
    originalRoute.disabled;

  route.title = !unit.position
    ? 'Для построения маршрута разместите модель на поле.'
    : routeEnabled
      ? 'Выключить инструмент маршрута. Модель не перемещается.'
      : 'Построить клеточный черновик без перемещения модели.';

  const footer = document.createElement('div');
  footer.className = 'vt-selected-footer';

  const dice = makeButton('dice', 'Кубики');
  dice.title = 'Открыть окно кубиков без автоматического броска';

  const details = makeButton('details', 'Подробнее');
  details.classList.add('vt-selected-more');

  footer.append(dice, details);

  panel.append(
    heading,
    middle,
    facing,
    states,
    route,
    footer
  );

  if (focusedCommand) {
    const replacement = panel.querySelector(
      `[data-selected-command="${focusedCommand}"]`
    );

    if (
      replacement &&
      !replacement.disabled &&
      !replacement.closest('[hidden]')
    ) {
      replacement.focus({ preventScroll: true });
    }
  }
}

function scheduleFit() {
  if (resizeFrame !== null) return;

  resizeFrame = requestAnimationFrame(() => {
    resizeFrame = null;
    fitScene();
  });
}

function fitScene() {
  const host = scroll.querySelector('.vt-iso-host');
  const scene = host?.querySelector('.vt-iso-scene');

  if (!scene) return;

  if (!desktop.matches) {
    scene.style.removeProperty('height');
    scene.style.removeProperty('min-height');
    return;
  }

  if (
    host.hidden ||
    scroll.clientHeight <= 0 ||
    scroll.clientWidth <= 0
  ) {
    return;
  }

  const style = getComputedStyle(scroll);

  const verticalPadding =
    (parseFloat(style.paddingTop) || 0) +
    (parseFloat(style.paddingBottom) || 0);

  const availableHeight = Math.max(
    120,
    Math.floor(scroll.clientHeight - verticalPadding - 2)
  );

  const height = `${availableHeight}px`;

  scene.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  if (scene.style.height !== height) {
    scene.style.height = height;
  }

  if (scene.style.minHeight !== '0px') {
    scene.style.minHeight = '0px';
  }
}

function installStyles() {
  const style = document.createElement('style');

  style.textContent = `
    .vt-selected-hud {
      display: none;
    }

    .vt-selected-hud[hidden],
    .vt-selected-facing-options[hidden] {
      display: none !important;
    }

    @media (min-width: 1001px) {
      .vt-field-panel.vt-has-selected-hud {
        position: relative;
      }

      .vt-selected-hud {
        position: absolute;
        left: 14px;
        bottom: 58px;
        z-index: 6;

        display: flex;
        flex-direction: column;
        gap: 9px;

        width: 350px;
        max-width: calc(100% - 28px);
        box-sizing: border-box;
        padding: 11px 12px;

        color: #e8e2d5;
        background: rgba(24, 33, 38, 0.97);
        border: 1px solid #61736c;
        border-top: 2px solid #8ab8ac;
        border-radius: 7px;
        box-shadow: 0 5px 18px rgba(0, 0, 0, 0.3);
      }

      .vt-selected-hud[data-side="b"] {
        border-top-color: #bd806b;
      }

      .vt-selected-heading {
        display: flex;
        align-items: flex-start;
        gap: 10px;
      }

      .vt-selected-title {
        flex: 1;
        min-width: 0;
        color: #e5d1a5;
        font-size: 0.85rem;
        line-height: 1.4;
        overflow-wrap: anywhere;
      }

      .vt-selected-middle {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .vt-selected-location {
        display: flex;
        flex: 1;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
        color: #b7c5bf;
        font-size: 0.77rem;
      }

      .vt-selected-coordinate {
        color: #d2ddd5;
        line-height: 1.3;
      }

      .vt-selected-characteristics {
        display: flex;
        flex-wrap: wrap;
        gap: 3px 10px;
        color: #b8bcae;
        font-size: 0.69rem;
        line-height: 1.4;
        font-variant-numeric: tabular-nums;
      }

      .vt-selected-characteristics > span {
        white-space: nowrap;
      }

      .vt-selected-health {
        display: flex;
        flex-shrink: 0;
        align-items: center;
        gap: 7px;
      }

      .vt-selected-health > strong {
        min-width: 74px;
        color: #e9d9b4;
        text-align: center;
        font-size: 0.88rem;
        font-variant-numeric: tabular-nums;
      }

      .vt-selected-states,
      .vt-selected-footer {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 7px;
      }

      .vt-selected-facing {
        min-width: 0;
      }

      .vt-selected-facing-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 40px 40px;
        gap: 7px;
      }

      .vt-selected-facing-options {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
        margin-top: 7px;
        padding: 8px;
        background: #151e22;
        border: 1px solid #465650;
        border-radius: 5px;
      }

      .vt-selected-facing-clear {
        grid-column: 1 / -1;
      }

      .vt-selected-hud .builder-action-btn {
        min-height: 36px;
        margin: 0;
        padding: 7px 9px;
        color: #e9e2d3;
        background: #293338;
        border: 1px solid #4b5a54;
        border-radius: 4px;
        font-size: 0.75rem;
        line-height: 1.2;
        cursor: pointer;
      }

      .vt-selected-hud .builder-action-btn:hover:not(:disabled) {
        background: #354249;
        border-color: #91a79a;
      }

      .vt-selected-hud .builder-action-btn:focus-visible {
        outline: 2px solid #e5d1a5;
        outline-offset: 2px;
      }

      .vt-selected-hud .builder-action-btn:disabled {
        opacity: 0.4;
        cursor: default;
      }

      .vt-selected-hud .vt-selected-close {
        flex: 0 0 27px;
        min-height: 27px;
        padding: 2px;
        font-size: 1rem;
        background: transparent;
        border-color: transparent;
      }

      .vt-selected-health .builder-action-btn {
        min-width: 35px;
        font-size: 1rem;
      }

      .vt-selected-hud .vt-selected-facing-toggle {
        text-align: left;
        color: #d9d1b7;
      }

      .vt-selected-hud [data-selected-command="rotate-left"],
      .vt-selected-hud [data-selected-command="rotate-right"] {
        font-size: 1.2rem;
        padding: 4px;
      }

      .vt-selected-hud [data-selected-command="minus"] {
        color: #efb9b2;
      }

      .vt-selected-hud [data-selected-command="plus"] {
        color: #b9dcc2;
      }

      .vt-selected-hud [aria-pressed="true"] {
        color: #f0d498;
        background: #3c3829;
        border-color: #a58d5e;
      }

      .vt-selected-hud
        .vt-selected-facing-toggle[aria-expanded="true"] {
        color: #f0d498;
        border-color: #a58d5e;
      }

      .vt-selected-hud .vt-selected-route {
        width: 100%;
        color: #c6d8d1;
        border-style: dashed;
      }

      .vt-selected-hud .vt-selected-route[aria-pressed="true"] {
        color: #f0d498;
        border-style: solid;
        border-color: #a58d5e;
      }

      .vt-selected-hud .vt-selected-more {
        color: #ead6ad;
        border-color: #8c7b58;
      }

      /*
       * Пояснения под SVG не увеличивают кадр карты.
       * Данные клеток остаются в title и aria-label.
       */
      .vt-has-selected-hud .vt-iso-host > .vt-iso-note {
        display: none;
      }

      .vt-has-selected-hud .vt-iso-host {
        flex: 0 0 auto;
        width: 100%;
        min-width: 0;
      }

      /*
       * Открытые боковые панели имеют приоритет.
       */
      body.vt-hud-details-open .vt-selected-hud,
      body.vt-hud-army-open .vt-selected-hud {
        display: none;
      }
    }
  `;

  document.head.append(style);
}