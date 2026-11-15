// src/virtual-table/online-layout.js
//
// Раскладка только онлайн-стола.
// Не читает и не изменяет сохранения партии.
// Переносит существующие DOM-элементы, сохраняя обработчики.
//
// Правая панель:
// — Модель;
// — Броски;
// — Комната.
//
// Контейнеры для room-connection.js создаются до его запуска.

import {
  initMobileLayout
} from './mobile-layout.js';

let initialized = false;

function node(tag, text = '', className = '') {
  const element = document.createElement(tag);
  element.textContent = text;

  if (className) element.className = className;

  return element;
}

export function initOnlineLayout() {
  if (initialized) return;

  const layout = document.querySelector('.vt-layout');
  const army = document.querySelector('.vt-army-panel');
  const field = document.querySelector('.vt-field-panel');
  const detailsPanel = document.querySelector('.vt-details-panel');

  const boardScroll = document.querySelector('.vt-board-scroll');
  const board = document.getElementById('vt-board');
  const details = document.getElementById('vt-details');
  const zoom = document.getElementById('vt-zoom');
  const zoomValue = document.getElementById('vt-zoom-value');
  const toolbar = field?.querySelector('.vt-field-toolbar');

  if (
    !layout ||
    !army ||
    !field ||
    !detailsPanel ||
    !boardScroll ||
    !board ||
    !details ||
    !toolbar ||
    !zoom
  ) {
    console.error(
      'Онлайн-раскладка: не найдены основные элементы стола.'
    );

    return;
  }

  initialized = true;

  document.body.classList.add(
    'vt-compact',
    'vt-online-layout',
    'vt-interface'
  );
  installStyles();

  // Компактная строка подключения.
  // Текст обновляет room-connection.js.
  const connectionBar = node(
    'div',
    '',
    'vt-online-connection-bar'
  );

  const connectionStatus = node(
    'span',
    'Проверяем подключение к комнате…'
  );

  connectionStatus.id = 'vt-online-compact-status';
  connectionStatus.setAttribute('role', 'status');
  connectionStatus.setAttribute('aria-live', 'polite');

  const openRoom = node(
    'button',
    'Комната',
    'builder-action-btn'
  );

  openRoom.type = 'button';

  connectionBar.append(connectionStatus, openRoom);

  const header = document.querySelector('.vt-header');

  if (header) {
    header.after(connectionBar);
  } else {
    layout.before(connectionBar);
  }

  // Сохраняем переключатель стороны и его обработчик.
  const loadPanel = document.querySelector('.vt-load-panel');

  const sideField = document.getElementById('vt-side-select')
    ?.closest('.vt-load-field');

  if (sideField) {
    army.prepend(sideField);
  }

  if (loadPanel) {
    loadPanel.classList.add('vt-online-unused-load');
    loadPanel.hidden = true;
  }

  const armyHelp = [...army.children].find(element =>
    element.matches('p.vt-muted') &&
    !element.id
  );

  if (armyHelp) {
    armyHelp.textContent =
      'Выберите модель в списке или на поле.';
  }

  // Поиск и фильтры не занимают высоту постоянно.
  const unitList = document.getElementById('vt-unit-list');

  const filters = node(
    'details',
    '',
    'vt-online-filters'
  );

  const filtersSummary = node('summary', 'Поиск и фильтры');
  const filtersContent = node(
    'div',
    '',
    'vt-online-filters-content'
  );

  filters.append(filtersSummary, filtersContent);

  const search = document.getElementById('vt-unit-search');

  const filterAnchor = search
    ? [...army.children].find(child => child.contains(search))
    : null;

  if (filterAnchor) {
    filterAnchor.before(filters);
  } else if (unitList) {
    unitList.before(filters);
  } else {
    army.append(filters);
  }

  function moveFilter(id, caption) {
    const control = document.getElementById(id);

    if (!control || !army.contains(control)) return;

    // Если элемент уже вложен в label, переносим label целиком.
    const wrappingLabel = control.closest('label');

    if (
      wrappingLabel &&
      army.contains(wrappingLabel) &&
      !wrappingLabel.contains(filters)
    ) {
      filtersContent.append(wrappingLabel);
      return;
    }

    // Убираем прежнюю отдельную подпись.
    army.querySelectorAll(`label[for="${id}"]`)
      .forEach(label => label.remove());

    const label = node('label', caption);
    label.htmlFor = id;
    label.append(control);

    filtersContent.append(label);
  }

  moveFilter('vt-unit-search', 'Поиск модели');
  moveFilter('vt-unit-location', 'Расположение');

  // Фильтр использует сетевые отметки активации и усталости.
  // Его варианты и обработчики задаёт online-table.js.
  const statusFilter = document.getElementById('vt-unit-status');

  if (statusFilter) {
    moveFilter('vt-unit-status', 'Состояние');

    const label = statusFilter.closest('label');

    if (label) {
      label.hidden = false;
    }

    statusFilter.hidden = false;
  }

  const resetFilters = document.getElementById(
    'vt-unit-filter-reset'
  );

  if (resetFilters) {
    filtersContent.append(resetFilters);
  }

  // Правая панель.
  const tabBar = node('div', '', 'vt-online-tabs');
  tabBar.setAttribute('role', 'tablist');
  tabBar.setAttribute('aria-label', 'Панели онлайн-стола');

  const modelPane = node('section', '', 'vt-online-pane');
  const dicePane = node('section', '', 'vt-online-pane');
  const roomPane = node('section', '', 'vt-online-pane');

  modelPane.id = 'vt-online-model-pane';
  dicePane.id = 'vt-online-dice-pane';
  roomPane.id = 'vt-online-room-pane';

  const heading = [...detailsPanel.children].find(element =>
    element.tagName === 'H2' &&
    element.textContent.trim() === 'Выбранная модель'
  );

  if (heading) modelPane.append(heading);

  // #vt-details сохраняется вместе с его обработчиками.
  modelPane.append(details);

  const diceHost = node('div');
  diceHost.id = 'vt-online-dice-host';
  dicePane.append(diceHost);

  const roomHost = node('div');
  roomHost.id = 'vt-online-room-host';
  roomPane.append(roomHost);

  const participants = detailsPanel.querySelector(
    '.vt-sides-summary'
  );

  const notice = document.querySelector('.vt-notice');
  const terrain = document.getElementById('vt-terrain-editor');

  if (participants) roomPane.append(participants);
  if (notice) roomPane.append(notice);
  if (terrain) roomPane.append(terrain);

  detailsPanel.querySelectorAll('hr.vt-panel-divider')
    .forEach(divider => divider.remove());

  const tabs = new Map();
  const panes = new Map([
    ['model', modelPane],
    ['dice', dicePane],
    ['room', roomPane]
  ]);

  function selectTab(key, focus = false) {
    if (!panes.has(key)) return;

    for (const [name, pane] of panes) {
      const active = name === key;
      const button = tabs.get(name);

      pane.hidden = !active;

      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      button.classList.toggle('primary', active);
    }

    if (focus) tabs.get(key).focus();
  }

  for (const [key, caption] of [
    ['model', 'Модель'],
    ['dice', 'Броски'],
    ['room', 'Комната']
  ]) {
    const button = node(
      'button',
      caption,
      'builder-action-btn'
    );

    button.type = 'button';
    button.id = `vt-online-tab-${key}`;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', panes.get(key).id);

    const pane = panes.get(key);
    pane.setAttribute('role', 'tabpanel');
    pane.setAttribute('aria-labelledby', button.id);

    button.addEventListener('click', () => selectTab(key));

    tabs.set(key, button);
    tabBar.append(button);
  }

  tabBar.addEventListener('keydown', event => {
    const keys = [...tabs.keys()];
    const current = keys.findIndex(
      key => tabs.get(key) === document.activeElement
    );

    if (current < 0) return;

    let next = current;

    if (event.key === 'ArrowRight') {
      next = (current + 1) % keys.length;
    } else if (event.key === 'ArrowLeft') {
      next = (current - 1 + keys.length) % keys.length;
    } else if (event.key === 'Home') {
      next = 0;
    } else if (event.key === 'End') {
      next = keys.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    selectTab(keys[next], true);
  });

  detailsPanel.append(tabBar, modelPane, dicePane, roomPane);
  selectTab('model');

  openRoom.addEventListener('click', () => {
    selectTab('room');

    // На мобильном сначала открываем правую область.
    document.querySelector(
      '.vt-mobile-navigation [data-mobile-area="details"]'
    )?.click();

    tabs.get('room').focus({ preventScroll: true });
  });

  // Настройки масштаба.
  toolbar.classList.add('vt-main-field-toolbar');

  const settings = node('details', '', 'vt-field-settings');
  const settingsSummary = node('summary', 'Масштаб и справка');

  const settingsContent = node(
    'div',
    '',
    'vt-field-settings-content'
  );

  const scale = node('div', '', 'vt-field-scale');
  const zoomLabel = toolbar.querySelector('label[for="vt-zoom"]');

  if (zoomLabel) scale.append(zoomLabel);

  scale.append(zoom);

  if (zoomValue) scale.append(zoomValue);

  const help = node(
    'p',
    'Выберите свою модель и пустую клетку. ' +
    'Чужие модели доступны для просмотра. ' +
    'Дальность и стоимость действий проверяются вручную. ' +
    'Нулевое ХП не удаляет модель.',
    'vt-muted'
  );

  settingsContent.append(scale, help);
  settings.append(settingsSummary, settingsContent);
  toolbar.after(settings);

  const fitButton = node(
    'button',
    'Вписать поле',
    'builder-action-btn'
  );

  fitButton.type = 'button';
  fitButton.title = 'Подобрать размер клеток под доступную область';

  const fullscreenButton = node(
    'button',
    'На весь экран',
    'builder-action-btn'
  );

  fullscreenButton.type = 'button';

  toolbar.append(fitButton, fullscreenButton);

  const deselect = document.getElementById('vt-deselect');

  if (deselect) deselect.textContent = 'Снять выбор';

  const fieldHelp = field.querySelector('.vt-field-help');

  if (fieldHelp) {
    fieldHelp.textContent =
      'Выберите модель и пустую клетку. ' +
      'Дальность и эффекты — вручную.';
  }

  zoom.min = '16';

  let autoFit = true;
  let frame = null;

  function fitBoard() {
    if (
      boardScroll.clientWidth <= 0 ||
      boardScroll.clientHeight <= 0
    ) {
      return;
    }

    const style = getComputedStyle(boardScroll);

    const horizontalPadding =
      (parseFloat(style.paddingLeft) || 0) +
      (parseFloat(style.paddingRight) || 0);

    const verticalPadding =
      (parseFloat(style.paddingTop) || 0) +
      (parseFloat(style.paddingBottom) || 0);

    const availableWidth =
      boardScroll.clientWidth - horizontalPadding - 45;

    const availableHeight =
      boardScroll.clientHeight - verticalPadding - 45;

    const size = Math.max(
      16,
      Math.min(
        Number(zoom.max) || 80,
        Math.floor(
          Math.min(availableWidth, availableHeight) / 14
        )
      )
    );

    if (Number(zoom.value) === size) return;

    zoom.value = String(size);
    zoom.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function resizeLayout() {
    const desktop = window.matchMedia(
      '(min-width: 1001px)'
    ).matches;

    if (document.fullscreenElement === layout) {
      layout.style.setProperty(
        '--vt-workspace-height',
        `${window.innerHeight}px`
      );
    } else if (desktop) {
      const top = layout.getBoundingClientRect().top;

      const height = Math.max(
        360,
        Math.floor(window.innerHeight - top - 16)
      );

      layout.style.setProperty(
        '--vt-workspace-height',
        `${height}px`
      );
    } else {
      layout.style.removeProperty('--vt-workspace-height');
    }

    if (autoFit) fitBoard();
  }

  function scheduleResize() {
    if (frame !== null) cancelAnimationFrame(frame);

    frame = requestAnimationFrame(() => {
      frame = null;
      resizeLayout();
    });
  }

  fitButton.addEventListener('click', () => {
    autoFit = true;
    fitBoard();
  });

  zoom.addEventListener('input', event => {
    if (event.isTrusted) autoFit = false;
  });

  fullscreenButton.hidden = !layout.requestFullscreen;

  fullscreenButton.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement === layout) {
        await document.exitFullscreen();
      } else {
        await layout.requestFullscreen();
      }
    } catch (error) {
      console.error('Online table fullscreen:', error);

      const message = document.getElementById('vt-message');

      if (message) {
        message.textContent =
          'Браузер не разрешил полноэкранный режим.';
        message.classList.add('is-error');
      }
    }
  });

  document.addEventListener('fullscreenchange', () => {
    fullscreenButton.textContent =
      document.fullscreenElement === layout
        ? 'Выйти из полного экрана'
        : 'На весь экран';

    scheduleResize();
  });

    // Используем структуру и оформление локального интерфейса,
  // но не подключаем его игровые обработчики.

  // Выбор стороны остаётся в DOM для online-table.js.
  // Пользователь переключает сторону кнопками списка.
  if (sideField) {
    sideField.hidden = true;
  }

  if (armyHelp) {
    armyHelp.hidden = true;
  }

  // Собираем оставшиеся элементы фильтров без пустых обёрток.
  const listControls = army.querySelector('.vt-list-controls');
  const quickSides = army.querySelector('.vt-quick-sides');
  const unitCount = document.getElementById('vt-unit-count');
  const selectionHint = document.getElementById(
    'vt-unit-selection-hint'
  );

  if (listControls && quickSides && unitCount) {
    listControls.replaceChildren(
      quickSides,
      filters,
      unitCount
    );

    if (selectionHint) {
      listControls.append(selectionHint);
    }
  }

  filters.classList.add('vt-army-filter-fold');
  filtersContent.classList.add('vt-army-filter-content');

  function updateFilterAppearance() {
    const query = document.getElementById('vt-unit-search')
      ?.value.trim();

    const location = document.getElementById('vt-unit-location')
      ?.value;

    const state = document.getElementById('vt-unit-status')
      ?.value;

    const active = Boolean(
      query ||
      (location && location !== 'all') ||
      (state && state !== 'all')
    );
    filters.classList.toggle('has-active-filters', active);

    filtersSummary.textContent = active
      ? 'Поиск и фильтры · включены'
      : 'Поиск и фильтры';
  }

  filtersContent.addEventListener(
    'input',
    updateFilterAppearance
  );

  filtersContent.addEventListener(
    'change',
    updateFilterAppearance
  );

  resetFilters?.addEventListener('click', () => {
    queueMicrotask(updateFilterAppearance);
  });

  updateFilterAppearance();

  // Общие классы вкладок локального стола.
  tabBar.classList.add('vt-tabs');

  for (const button of tabs.values()) {
    button.classList.add('vt-tab');
  }

  for (const pane of panes.values()) {
    pane.classList.add('vt-tab-pane');
  }

  // Настройки теперь находятся в строке инструментов,
  // а не занимают отдельную полосу над полем.
  settingsSummary.textContent = 'Настройки';
  settings.open = false;
  toolbar.append(settings);

  initMobileLayout();

  const modelButton = document.querySelector(
    '.vt-mobile-navigation [data-mobile-area="details"]'
  );

  if (modelButton) modelButton.textContent = 'Панели';

  window.addEventListener('resize', scheduleResize);

  window.visualViewport?.addEventListener(
    'resize',
    scheduleResize
  );

  settings.addEventListener('toggle', scheduleResize);

  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(scheduleResize);

    observer.observe(boardScroll);
    observer.observe(connectionBar);

    const headerElement = document.querySelector('.vt-header');
    const message = document.getElementById('vt-message');

    if (headerElement) observer.observe(headerElement);
    if (message) observer.observe(message);
  }

  scheduleResize();
}

function installStyles() {
  const id = 'vt-online-layout-styles';

  if (document.getElementById(id)) return;

  const style = document.createElement('style');
  style.id = id;

  style.textContent = `
    .vt-online-layout .vt-online-unused-load,
    .vt-online-layout [hidden] {
      display: none !important;
    }

    .vt-online-layout .vt-online-connection-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
      padding: 5px 10px;
      margin: 6px 0;
      border: 1px solid var(--border, #30303e);
      border-radius: 8px;
      background: #15151e;
      font-size: .78rem;
    }

    .vt-online-layout #vt-online-compact-status {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .vt-online-layout #vt-online-compact-status[data-status="error"] {
      color: #ffb4b4;
      white-space: normal;
    }

    .vt-online-layout .vt-online-connection-bar > button {
      flex: 0 0 auto;
      padding: 5px 10px;
      font-size: .75rem;
    }

    .vt-online-layout .vt-army-panel > .vt-load-field {
      width: 100%;
      max-width: none;
      margin-bottom: 8px;
    }

    .vt-online-layout .vt-online-filters {
      margin: 8px 0;
      border-top: 1px solid var(--border, #30303e);
      border-bottom: 1px solid var(--border, #30303e);
    }

    .vt-online-layout .vt-online-filters > summary {
      padding: 9px 0;
      cursor: pointer;
      font-size: .78rem;
    }

    .vt-online-layout .vt-online-filters-content {
      display: grid;
      gap: 9px;
      padding-bottom: 10px;
    }

    .vt-online-layout .vt-online-filters-content label {
      display: grid;
      gap: 5px;
      min-width: 0;
      font-size: .75rem;
    }

    .vt-online-layout .vt-online-filters-content input,
    .vt-online-layout .vt-online-filters-content select {
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }

    .vt-online-layout .vt-details-panel {
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
    }

    .vt-online-layout .vt-online-tabs {
      display: flex;
      gap: 5px;
      flex: 0 0 auto;
      padding-bottom: 8px;
      margin-bottom: 8px;
      border-bottom: 1px solid var(--border, #30303e);
    }

    .vt-online-layout .vt-online-tabs > button {
      flex: 1;
      min-width: 0;
      padding: 8px 4px;
      font-size: .75rem;
    }

    .vt-online-layout .vt-online-pane {
      flex: 1;
      min-width: 0;
      min-height: 0;
      overflow: auto;
      overflow-wrap: anywhere;
    }

    .vt-online-layout #vt-details {
      overflow: visible;
      max-height: none;
    }

    .vt-online-layout #vt-online-room-host .vt-room-connection {
      margin: 0 0 12px;
      padding: 10px;
    }

    .vt-online-layout #vt-online-room-host .vt-room-connection-actions {
      display: flex;
      flex-direction: column;
      gap: 7px;
    }

    .vt-online-layout #vt-online-room-host .vt-room-connection-help,
    .vt-online-layout #vt-online-room-pane .vt-notice {
      font-size: .78rem;
      line-height: 1.45;
    }

    .vt-online-layout #vt-online-dice-host .vt-online-dice {
      margin: 0;
      padding: 0;
      border: 0;
      min-width: 0;
    }

    .vt-online-layout #vt-online-dice-host .vt-online-dice-controls {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 9px;
    }

    .vt-online-layout #vt-online-dice-host label,
    .vt-online-layout #vt-online-dice-host select {
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }

    .vt-online-layout #vt-online-dice-host label {
      display: grid;
      gap: 6px;
    }

    .vt-online-layout #vt-online-dice-host .vt-online-dice-log {
      max-height: none;
      overflow: visible;
    }

    .vt-online-layout .vt-board-scroll {
      min-height: 0;
    }

    .vt-online-layout .vt-layout:fullscreen {
      box-sizing: border-box;
      width: 100%;
      height: 100dvh;
      padding: 8px;
      background: #0e0e15;
      overflow: auto;
    }

    @media (min-width: 1001px) {
      .vt-online-layout .vt-layout {
        grid-template-columns:
          minmax(200px, 235px)
          minmax(0, 1fr)
          minmax(270px, 310px);
        height: var(--vt-workspace-height, 75vh);
        min-height: 360px;
      }
    }

    @media (max-width: 1000px) {
      .vt-online-layout .vt-online-pane {
        max-height: 72dvh;
      }
    }

        /* Онлайн использует визуальный язык локального стола. */

    .vt-interface.vt-online-layout .vt-army-panel {
      gap: 0;
    }

    .vt-interface.vt-online-layout .vt-list-controls {
      display: block;
      flex: 0 0 auto;
      margin: 0 0 10px;
    }

    .vt-interface.vt-online-layout .vt-quick-sides {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      margin: 0 0 8px;
    }

    .vt-interface.vt-online-layout .vt-online-filters {
      margin: 8px 0;
    }

    .vt-interface.vt-online-layout .vt-online-tabs {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 3px;
      padding: 7px;
      margin: 0;
      background: #14141c;
    }

    .vt-interface.vt-online-layout .vt-online-tabs > .vt-tab {
      min-height: 38px;
      padding: 6px 3px;
      color: var(--vt-ui-muted);
      background: transparent;
      border: 1px solid transparent;
      border-radius: 6px;
      font-size: .73rem;
    }

    .vt-interface.vt-online-layout
      .vt-online-tabs > .vt-tab[aria-selected="true"] {
      color: #f7f1e6;
      background: #302a3c;
      border-color: #8e7b9f;
    }

    .vt-interface.vt-online-layout .vt-online-pane {
      padding: 13px;
      scrollbar-gutter: stable;
    }

    .vt-interface.vt-online-layout .vt-online-pane > h2 {
      margin-top: 0;
      font-size: 1rem;
    }

    .vt-interface.vt-online-layout .vt-card-controls {
      padding: 12px 0;
      background: transparent;
      border-left: 0;
      border-right: 0;
      border-radius: 0;
    }

    .vt-interface.vt-online-layout .vt-online-health-status {
      margin: 9px 0 0;
      font-size: .71rem;
      line-height: 1.45;
    }

    .vt-interface.vt-online-layout
      .vt-online-health-status:empty {
      display: none;
    }

    .vt-interface.vt-online-layout
      .vt-online-facing-content > .vt-detail-block {
      margin: 0;
      padding: 0;
      background: transparent;
      border: 0;
    }

    .vt-interface.vt-online-layout
      .vt-online-facing-content .vt-detail-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 7px;
    }

    .vt-interface.vt-online-layout
      .vt-online-facing-content button {
      min-width: 0;
      min-height: 40px;
      padding: 7px 4px;
      font-size: .75rem;
    }

    .vt-interface.vt-online-layout
      .vt-online-facing-content p {
      font-size: .73rem;
      line-height: 1.45;
    }

    .vt-interface.vt-online-layout .vt-online-card-help {
      font-size: .74rem;
      line-height: 1.5;
    }

    .vt-interface.vt-online-layout .vt-unit {
      width: 100%;
      text-align: left;
    }

    .vt-interface.vt-online-layout .vt-unit-heading,
    .vt-interface.vt-online-layout .vt-unit-subline,
    .vt-interface.vt-online-layout .vt-unit-tags {
      width: 100%;
      box-sizing: border-box;
    }

    .vt-interface.vt-online-layout .vt-unit-heading strong {
      overflow-wrap: anywhere;
    }

    .vt-interface.vt-online-layout .vt-unit-coordinate {
      flex: 0 0 auto;
    }

    .vt-interface.vt-online-layout
      .vt-unit.vt-online-zero-hp {
      border-right-color: #9c5d6c;
    }

    .vt-interface.vt-online-layout
      #vt-online-dice-host .vt-online-dice-controls label {
      flex: 0 0 auto;
    }

    @media (min-width: 1251px) {
      .vt-interface.vt-online-layout .vt-layout {
        grid-template-columns: 235px minmax(0, 1fr) 310px;
      }
    }

    @media (min-width: 1001px) and (max-width: 1250px) {
      .vt-interface.vt-online-layout .vt-layout {
        grid-template-columns: 195px minmax(0, 1fr) 285px;
      }
    }

    @media (max-width: 1000px) {
      .vt-interface.vt-online-layout .vt-online-tabs > .vt-tab,
      .vt-interface.vt-online-layout
        .vt-online-facing-content button {
        min-height: 44px;
      }
    }

  `;

  document.head.append(style);
}