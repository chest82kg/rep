// src/virtual-table/game-shell.js
//
// Игровая оболочка локального стола.
//
// Запускается после initLocalTable().
//
// Не изменяет игровое состояние и хранилища.
// Переносит существующие DOM-контейнеры с обработчиками.
//
// На широком экране:
// — единая верхняя панель;
// — армии и карточка поверх карты;
// — настройки в раскрываемых меню.
//
// На узком экране переносимые блоки возвращаются
// на исходные места для существующей мобильной раскладки.

let initialized = false;

export function initGameShell() {
  if (initialized) return;

  const layout = document.querySelector('.vt-layout');
  const field = document.querySelector('.vt-field-panel');
  const army = document.querySelector('.vt-army-panel');
  const details = document.querySelector('.vt-details-panel');
  const board = document.getElementById('vt-board');
  const unitList = document.getElementById('vt-unit-list');

  if (
    !layout ||
    !field ||
    !army ||
    !details ||
    !board ||
    !document.getElementById('vt-pane-model')
  ) {
    console.warn(
      'Игровая оболочка: сначала должна быть построена ' +
      'локальная раскладка с вкладками.'
    );
    return;
  }

  initialized = true;

  const desktop = window.matchMedia('(min-width: 1001px)');
  const transfers = new Map();

  let openedPanel = null;
  let returnFocus = null;
  let selectedId = readSelectedId();
  let selectionFrame = null;

  const hud = document.createElement('nav');
  hud.className = 'vt-hud';
  hud.setAttribute('aria-label', 'Управление игровым столом');

  hud.innerHTML = `
    <div class="vt-hud-group">
      <button type="button"
        class="builder-action-btn"
        data-shell-panel="army"
        aria-expanded="false">
        Армии
      </button>

      <button type="button"
        class="builder-action-btn"
        data-shell-panel="model"
        aria-expanded="false">
        Модель
      </button>
    </div>

    <div class="vt-hud-party"></div>

    <div class="vt-hud-group vt-hud-navigation">
      <button type="button"
        class="builder-action-btn"
        data-shell-panel="mission"
        aria-expanded="false">
        Миссия
      </button>
    </div>
  `;

  const partySlot = hud.querySelector('.vt-hud-party');
  const navigation = hud.querySelector('.vt-hud-navigation');

  const menu = createMenu('Меню');
  const view = createMenu('Вид');

  navigation.append(menu.root, view.root);

  const partyButton = document.createElement('button');
  partyButton.type = 'button';
  partyButton.className = 'builder-action-btn';
  partyButton.dataset.shellPanel = 'party';
  partyButton.textContent = 'Партия и сохранения';
  partyButton.setAttribute('aria-expanded', 'false');

  menu.content.append(partyButton);

  const fit = document.createElement('button');
  fit.type = 'button';
  fit.className = 'builder-action-btn';
  fit.textContent = 'Вписать';
  fit.title = 'Вписать текущий вид карты';

  navigation.append(fit);

  field.prepend(hud);

  const armyBar = createPanelBar('Армии');
  const detailsBar = createPanelBar('Панель стола');

  army.prepend(armyBar);
  details.prepend(detailsBar);

  function createMenu(title) {
    const root = document.createElement('details');
    root.className = 'vt-hud-menu';

    const summary = document.createElement('summary');
    summary.textContent = title;

    const content = document.createElement('div');
    content.className = 'vt-hud-menu-content';

    root.append(summary, content);

    return { root, summary, content };
  }

  function createPanelBar(title) {
    const bar = document.createElement('div');
    bar.className = 'vt-hud-panel-bar';

    const heading = document.createElement('strong');
    heading.textContent = title;

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'builder-action-btn';
    close.textContent = 'Закрыть';
    close.setAttribute('aria-label', `Закрыть: ${title}`);

    close.addEventListener('click', () => closePanel(true));

    bar.append(heading, close);

    return bar;
  }

  // Для каждого переносимого блока сохраняем его место.
  // При возврате на мобильный экран восстанавливаем порядок.
  function transfer(element, destination) {
    if (!element) return;

    let record = transfers.get(element);

    if (!record) {
      const anchor = document.createComment('vt-hud-original');

      element.before(anchor);

      record = { anchor, destination };
      transfers.set(element, record);
    }

    if (desktop.matches && element.parentElement !== destination) {
      destination.append(element);
    }
  }

  function restoreTransfers() {
    for (const [element, record] of transfers) {
      if (record.anchor.parentNode) {
        record.anchor.after(element);
      }
    }
  }

  function updateButtons() {
    hud.querySelectorAll('[data-shell-panel]').forEach(button => {
      const active = button.dataset.shellPanel === openedPanel;

      button.classList.toggle('primary', active);
      button.setAttribute('aria-expanded', String(active));
    });
  }

  function closeMenus() {
    menu.root.open = false;
    view.root.open = false;
  }

  function closePanel(restoreFocus = false) {
    const active = document.activeElement;

    const focusInside =
      army.contains(active) ||
      details.contains(active);

    layout.classList.remove(
      'vt-hud-army-open',
      'vt-hud-details-open'
    );

    openedPanel = null;
    updateButtons();

    if (
      desktop.matches &&
      (restoreFocus || focusInside) &&
      returnFocus?.isConnected
    ) {
      returnFocus.focus({ preventScroll: true });
    }
  }

  function openPanel(key, trigger = null) {
    if (!desktop.matches) return;

    if (key !== 'army') {
      const tab = document.getElementById(`vt-tab-${key}`);

      if (!tab || tab.hidden) return;

      // Существующая раскладка сама переключает вкладку.
      tab.click();
    }

    openedPanel = key;

    returnFocus = key === 'party'
      ? menu.summary
      : trigger || hud.querySelector(
          `[data-shell-panel="${key}"]`
        ) || hud.querySelector('[data-shell-panel="model"]');

    layout.classList.toggle(
      'vt-hud-army-open',
      key === 'army'
    );

    layout.classList.toggle(
      'vt-hud-details-open',
      key !== 'army'
    );

    closeMenus();
    updateButtons();
  }

  hud.addEventListener('click', event => {
    const button = event.target instanceof Element
      ? event.target.closest('[data-shell-panel]')
      : null;

    if (!button) return;

    const key = button.dataset.shellPanel;

    if (openedPanel === key) {
      closePanel();
      closeMenus();
    } else {
      openPanel(key, button);
    }
  });

  // Клики по вкладкам могут поступать от других модулей:
  // например, от кнопки счёта в party-bar.js.
  details.addEventListener('click', event => {
    const tab = event.target instanceof Element
      ? event.target.closest('.vt-tab')
      : null;

    if (!desktop.matches || !tab || tab.hidden) return;

    const key = tab.id.replace('vt-tab-', '');

    if (!['model', 'terrain', 'mission', 'party'].includes(key)) {
      return;
    }

    openedPanel = key;

    layout.classList.remove('vt-hud-army-open');
    layout.classList.add('vt-hud-details-open');

    returnFocus = hud.querySelector(
      `[data-shell-panel="${key}"]`
    ) || hud.querySelector('[data-shell-panel="model"]');

    if (key === 'party') {
      returnFocus = menu.summary;
    }

    updateButtons();
  });

  function readSelectedId() {
    return document.querySelector(
      '#vt-unit-list [data-unit].is-selected'
    )?.dataset.unit || null;
  }

  function scheduleSelectionCheck() {
    if (selectionFrame !== null) return;

    selectionFrame = requestAnimationFrame(() => {
      selectionFrame = null;

      const next = readSelectedId();

      // При выборе другой модели закрываем подробности.
      // Новая выбранная модель показывается в нижнем HUD.
      if (
        desktop.matches &&
        next !== selectedId &&
        openedPanel === 'model'
      ) {
        closePanel();
      }

      selectedId = next;
    });
  }

  if (unitList) {
    new MutationObserver(scheduleSelectionCheck).observe(unitList, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });

       unitList.addEventListener('click', event => {
      const unit = event.target instanceof Element
        ? event.target.closest('[data-unit]')
        : null;

      if (!unit || !desktop.matches) return;

      requestAnimationFrame(() => {
        if (openedPanel === 'army') {
          closePanel();
        }
      });
    });
  }
  // Успешный поиск модели освобождает обзор карты.
  // Используем штатное закрытие: классы, aria-expanded
  // и возврат фокуса обновляются одним механизмом.
  document.addEventListener('vt:unit-located', () => {
    if (!desktop.matches) return;

    closeMenus();

    if (openedPanel) {
      closePanel(true);
    }
  });

  // Срабатывает после остальных слушателей инструмента.
  document.addEventListener('vt:terrain-mode', () => {
    queueMicrotask(() => {
      if (
        desktop.matches &&
        board.dataset.fieldTool === 'terrain'
      ) {
        openPanel('terrain');
      }
    });
  });

  // Получаем существующие кнопки. Нового расчёта масштаба нет.
  function gridFitButton() {
    return [...field.querySelectorAll('button')].find(button =>
      button.title ===
      'Подобрать размер клеток под доступную область'
    );
  }

  function isoFitButton() {
    return field.querySelector('[data-iso-camera="fit"]');
  }

  fit.addEventListener('click', () => {
    const isIso = board.classList.contains('vt-iso-grid-hidden');

    const original = isIso
      ? isoFitButton()
      : gridFitButton();

    original?.click();
  });

  function refreshFitAvailability() {
    const isIso = board.classList.contains('vt-iso-grid-hidden');

    fit.disabled = !(
      isIso ? isoFitButton() : gridFitButton()
    );
  }

  function collectControls() {
    const partyBar = field.querySelector('.vt-party-bar');
    const toolbar = field.querySelector('.vt-main-field-toolbar');
    const isoToolbar = field.querySelector('.vt-iso-toolbar');
    const workspace = document.querySelector('.vt-workspace-mode');

    if (desktop.matches) {
      transfer(partyBar, partySlot);
      transfer(toolbar, view.content);
      transfer(isoToolbar, view.content);
      transfer(workspace, menu.content);
    }

    const gridFit = gridFitButton();
    const isoFit = isoFitButton();

    gridFit?.classList.add('vt-hud-original-fit');
    isoFit?.classList.add('vt-hud-original-fit');

    refreshFitAvailability();
  }

  // Изометрия может создать свою панель после запуска оболочки.
  // Наблюдаем только за добавлением/перемещением узлов.
  new MutationObserver(() => {
    if (desktop.matches) collectControls();
  }).observe(field, {
    childList: true,
    subtree: true
  });

  new MutationObserver(refreshFitAvailability).observe(board, {
    attributes: true,
    attributeFilter: ['class']
  });

  document.addEventListener('click', event => {
    if (!desktop.matches) return;

    if (
      menu.root.open &&
      !menu.root.contains(event.target)
    ) {
      menu.root.open = false;
    }

    if (
      view.root.open &&
      !view.root.contains(event.target)
    ) {
      view.root.open = false;
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !desktop.matches) return;

    const target = event.target;

    if (
      target instanceof Element &&
      target.closest(
        'input, textarea, select, [contenteditable="true"], dialog'
      )
    ) {
      return;
    }

    // Не мешаем Escape игровых инструментов.
    if (menu.root.open || view.root.open) {
      const summary = view.root.open
        ? view.summary
        : menu.summary;

      closeMenus();
      summary.focus({ preventScroll: true });
      return;
    }

    if (openedPanel) {
      closePanel(true);
    }
  });

  function applyScreenMode() {
    closeMenus();
    closePanel(true);

    if (desktop.matches) {
      collectControls();
    } else {
      // Не оставляем фокус в скрываемом HUD.
      if (hud.contains(document.activeElement)) {
        document.querySelector(
          '[data-mobile-area="field"]'
        )?.focus({ preventScroll: true });
      }

      restoreTransfers();
    }

    selectedId = readSelectedId();

    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
    });
  }

  installStyles();
  document.body.classList.add('vt-game-hud');

  desktop.addEventListener('change', applyScreenMode);
  applyScreenMode();
}

function installStyles() {
  const style = document.createElement('style');
  style.id = 'vt-game-hud-styles';

  style.textContent = `
    .vt-hud,
    .vt-hud-panel-bar {
      display: none;
    }

    @media (min-width: 1001px) {
      body.vt-page.vt-game-hud {
        padding: 10px;
      }

      body.vt-game-hud .vt-layout {
        position: relative;
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        grid-template-rows: minmax(0, 1fr);
        gap: 0;
        isolation: isolate;
      }

      body.vt-game-hud .vt-layout > .vt-field-panel {
        display: flex !important;
        grid-column: 1;
        grid-row: 1;
        width: 100%;
        height: 100%;
        min-height: 0;
        max-height: none;
        overflow: hidden;
        border-radius: 8px;
      }

      body.vt-game-hud .vt-hud {
        position: relative;
        z-index: 60;
        display: flex;
        flex: 0 0 auto;
        align-items: center;
        flex-wrap: wrap;
        gap: 7px;
        padding: 8px;
        color: #e8ddc7;
        background: #171e22;
        border-bottom: 1px solid #414b47;
      }

      body.vt-game-hud .vt-hud-group {
        display: flex;
        flex: 0 0 auto;
        align-items: center;
        gap: 6px;
      }

      body.vt-game-hud .vt-hud-party {
        flex: 1 1 300px;
        min-width: 0;
      }

      body.vt-game-hud .vt-hud .builder-action-btn,
      body.vt-game-hud .vt-hud-panel-bar .builder-action-btn {
        min-height: 36px;
        padding: 7px 10px;
        color: #e9e2d3;
        background: #252e31;
        border-color: #46534f;
        border-radius: 5px;
        font-size: 0.75rem;
      }

      body.vt-game-hud .vt-hud .builder-action-btn.primary {
        color: #f6e6bf;
        background: #3b3c31;
        border-color: #ad9866;
      }

      body.vt-game-hud .vt-hud .vt-party-bar {
        gap: 6px;
        margin: 0;
        padding: 0;
        background: transparent;
        border: 0;
      }

      body.vt-game-hud .vt-hud .vt-party-rounds,
      body.vt-game-hud .vt-hud .vt-party-history {
        gap: 6px;
      }

      body.vt-game-hud .vt-hud #vt-round-label {
        color: #dbc697;
        font-size: 0.8rem;
      }

      body.vt-game-hud .vt-hud .vt-party-history {
        margin-left: auto;
      }

      body.vt-game-hud .vt-hud .vt-party-history
        [data-history-action] {
        width: 36px;
        min-width: 36px;
        padding: 4px;
        font-size: 1.1rem;
      }

      body.vt-game-hud .vt-hud .vt-round-extras > summary {
        min-height: 36px;
        padding: 7px;
      }

      body.vt-game-hud .vt-hud-menu {
        position: relative;
        flex: 0 0 auto;
      }

      body.vt-game-hud .vt-hud-menu > summary {
        display: flex;
        align-items: center;
        min-height: 36px;
        padding: 7px 10px;
        color: #e9e2d3;
        background: #252e31;
        border: 1px solid #46534f;
        border-radius: 5px;
        font-size: 0.75rem;
        list-style: none;
        cursor: pointer;
      }

      body.vt-game-hud .vt-hud-menu
        > summary::-webkit-details-marker {
        display: none;
      }

      body.vt-game-hud .vt-hud-menu > summary::after {
        content: '▾';
        margin-left: 7px;
        color: #b8c0b7;
      }

      body.vt-game-hud .vt-hud-menu[open] > summary {
        border-color: #ad9866;
      }

      body.vt-game-hud .vt-hud-menu-content {
        position: absolute;
        top: calc(100% + 9px);
        right: 0;
        display: flex;
        flex-direction: column;
        gap: 12px;
        width: min(380px, calc(100vw - 48px));
        max-height: 60vh;
        padding: 14px;
        overflow-y: auto;
        color: #e8e1d3;
        background: #1b2429;
        border: 1px solid #687466;
        border-radius: 6px;
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45);
      }

      body.vt-game-hud .vt-hud-menu-content
        .vt-main-field-toolbar,
      body.vt-game-hud .vt-hud-menu-content
        .vt-iso-toolbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 9px;
        margin: 0;
        padding: 0;
        border: 0;
        background: transparent;
      }

      body.vt-game-hud .vt-hud-menu-content
        #vt-field-summary {
        flex-basis: 100%;
        color: #b8c0b7;
      }

      body.vt-game-hud .vt-hud-menu-content
        .vt-iso-toolbar {
        padding-top: 12px;
        border-top: 1px solid #414b47;
      }

      body.vt-game-hud .vt-hud-menu-content label {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      body.vt-game-hud .vt-hud-menu-content
        input[type="checkbox"] {
        width: auto;
      }

      body.vt-game-hud .vt-hud-menu-content
        .vt-field-settings {
        flex-basis: 100%;
        width: 100%;
      }

      body.vt-game-hud .vt-hud-menu-content
        .vt-field-settings[open]
        > .vt-field-settings-content {
        position: static;
        width: 100%;
        max-height: none;
        margin-top: 8px;
        padding: 10px;
        box-shadow: none;
      }

      body.vt-game-hud .vt-hud-menu-content
        .vt-workspace-mode {
        margin: 0;
        padding: 8px;
      }

      body.vt-game-hud .vt-hud-menu-content
        .vt-workspace-mode-description {
        flex-basis: 100%;
        margin: 3px 0 0;
      }

      body.vt-game-hud .vt-hud-original-fit {
        display: none !important;
      }

      body.vt-game-hud .vt-layout > .vt-army-panel,
      body.vt-game-hud .vt-layout > .vt-details-panel {
        position: absolute;
        z-index: 50;
        top: 65px;
        bottom: 12px;
        display: none !important;
        grid-column: auto;
        grid-row: auto;
        height: auto;
        min-height: 0;
        max-height: none;
        margin: 0;
        color: #e8e2d7;
        background: #191f24;
        border: 1px solid #687466;
        border-radius: 7px;
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.48);
      }

      body.vt-game-hud .vt-layout > .vt-army-panel {
        left: 12px;
        width: min(310px, calc(100% - 24px));
        padding: 12px;
        overflow-y: auto;
      }

      body.vt-game-hud .vt-layout > .vt-details-panel {
        right: 12px;
        width: min(360px, calc(100% - 24px));
        padding: 0;
        overflow: hidden;
      }

      body.vt-game-hud
        .vt-layout.vt-hud-army-open > .vt-army-panel,
      body.vt-game-hud
        .vt-layout.vt-hud-details-open > .vt-details-panel {
        display: flex !important;
        flex-direction: column;
      }

      body.vt-game-hud .vt-hud-panel-bar {
        display: flex;
        flex: 0 0 auto;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 10px;
        border-bottom: 1px solid #414b47;
      }

      body.vt-game-hud .vt-army-panel > .vt-hud-panel-bar {
        margin: 0 0 12px;
        padding: 0 0 10px;
      }

      body.vt-game-hud .vt-hud-panel-bar > strong {
        color: #d8c59b;
        font-size: 0.84rem;
      }

      body.vt-game-hud .vt-details-panel .vt-tab-pane {
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
      }

      body.vt-game-hud .vt-board-scroll {
        flex: 1 1 auto;
        min-height: 0;
        max-height: none;
        background: #131c21;
      }

      body.vt-game-hud .vt-iso-host {
        min-width: 0;
      }

      body.vt-game-hud .vt-mobile-navigation,
      body.vt-game-hud .vt-mobile-back-to-field {
        display: none !important;
      }
    }
  `;

  document.head.append(style);
}