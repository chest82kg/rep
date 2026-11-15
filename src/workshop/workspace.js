// src/workshop/workspace.js
//
// Рабочая оболочка мастерской.
// Перемещает существующие DOM-элементы, сохраняя обработчики.
// Не изменяет формат документов и сохранения.

export function initWorkshopWorkspace() {
  const page = document.querySelector('.ws-page');
  const maps = document.getElementById('ws-maps');
  const form = document.getElementById('ws-map-form');
  const board = document.getElementById('ws-board');
  const scroll = board?.closest('.ws-board-scroll');

  if (!page || !maps || !form || !board || !scroll) {
    throw new Error('Не найдены элементы рабочего пространства мастерской.');
  }

  if (maps.dataset.workspaceReady === 'true') return;

  const panels = {
    terrain: maps.querySelector('.ws-terrain-controls'),
    deployment: maps.querySelector('.ws-deployment-controls'),
    objectives: maps.querySelector('.ws-objectives-controls'),
    markers: maps.querySelector('.ws-markers-controls')
  };

  if (Object.values(panels).some(panel => !panel)) {
    throw new Error('Не все инструменты карты инициализированы.');
  }

  const transfer = maps.querySelector('.ws-transfer');
  const heading = maps.querySelector('.ws-section-heading');
  const newButton = document.getElementById('ws-new-map');
  const meta = document.getElementById('ws-map-meta');
  const notice = document.querySelector('.ws-main > .ws-notice');
  const main = document.querySelector('.ws-main');
  const message = document.getElementById('ws-message');

  // Пояснения, которые изначально располагались под полем.
  const mapNotes = [...maps.children].filter(element =>
    element.matches('p.ws-muted')
  );

  const documentBox = document.createElement('details');
  documentBox.className = 'ws-document-menu';

  const documentSummary = document.createElement('summary');
  documentSummary.textContent = 'Документ';

  const documentContent = document.createElement('div');
  documentContent.className = 'ws-document-content';

  documentBox.append(documentSummary, documentContent);

  if (newButton) documentContent.append(newButton);
  if (meta) documentContent.append(meta);
  if (transfer) documentContent.append(transfer);

  for (const note of mapNotes) {
    documentContent.append(note);
  }

  if (notice) documentContent.append(notice);

  const documentBar = document.createElement('div');
  documentBar.className = 'ws-document-bar';
  documentBar.append(form, documentBox);

  const workspace = document.createElement('div');
  workspace.className = 'ws-workspace';

  const stage = document.createElement('section');
  stage.className = 'ws-stage';
  stage.setAttribute('aria-label', 'Рабочее поле карты');

  const stageHeader = document.createElement('div');
  stageHeader.className = 'ws-stage-header';

  const stageTitle = document.createElement('strong');
  stageTitle.textContent = 'Карта 14 × 14';

  const coordinate = document.createElement('span');
  coordinate.className = 'ws-stage-coordinate';
  coordinate.textContent = 'A–N · 1–14';

  stageHeader.append(stageTitle, coordinate);

  const tools = document.createElement('nav');
  tools.className = 'ws-workspace-tools';
  tools.setAttribute('aria-label', 'Слой редактирования карты');

  const toolNames = {
    terrain: 'Местность',
    deployment: 'Зоны',
    objectives: 'КТ',
    markers: 'Маркеры'
  };

  const toolButtons = new Map();

  for (const [key, label] of Object.entries(toolNames)) {
    const button = document.createElement('button');

    button.type = 'button';
    button.className = 'builder-action-btn';
    button.dataset.workspaceTool = key;
    button.textContent = label;
    button.setAttribute('aria-pressed', 'false');

    tools.append(button);
    toolButtons.set(key, button);
  }

  const inspector = document.createElement('aside');
  inspector.className = 'ws-inspector';
  inspector.setAttribute('aria-label', 'Свойства инструмента');

  for (const [key, panel] of Object.entries(panels)) {
    panel.dataset.workspacePanel = key;
    inspector.append(panel);
  }

  stage.append(stageHeader, scroll, tools);
  workspace.append(stage, inspector);

  // Формы КТ и маркеров остаются вне формы документа карты.
  maps.append(documentBar, workspace);
  heading?.remove();

  // Сообщение всегда остаётся отдельной строкой оболочки.
  if (main && message) main.append(message);

  const zoneButton = panels.deployment.querySelector('[data-zone-mode]');

  let activeTool = 'terrain';

  function setZoneActive(wanted) {
    if (!zoneButton) return;

    const current = zoneButton.getAttribute('aria-pressed') === 'true';

    if (current !== wanted) zoneButton.click();
  }

  function selectTool(key) {
    if (!Object.hasOwn(panels, key)) return;

    // Используем существующий обработчик режима зон.
    // Это сохраняет внутреннее active в deployment.js согласованным
    // с выбранным слоем интерфейса.
    setZoneActive(key === 'deployment');
    activeTool = key;

    for (const [name, panel] of Object.entries(panels)) {
      panel.hidden = name !== key;
    }

    for (const [name, button] of toolButtons) {
      const selected = name === key;

      button.classList.toggle('primary', selected);
      button.setAttribute('aria-pressed', String(selected));
    }

    maps.dataset.workspaceTool = key;

    // Возвращаем панель к началу при смене инструмента.
    inspector.scrollTop = 0;
  }

  tools.addEventListener('click', event => {
    const button = event.target.closest('[data-workspace-tool]');

    if (!button || !tools.contains(button)) return;

    selectTool(button.dataset.workspaceTool);
  });

  // Отдельная кнопка включения зон больше не нужна:
  // её функцию выполняет единый переключатель инструментов.
  if (zoneButton) zoneButton.hidden = true;

  function cellFromEvent(event) {
    const target = event.target;

    if (!(target instanceof Element)) return null;

    const cell = target.closest('button[data-cell-key]');

    return cell && board.contains(cell) ? cell : null;
  }

  function showCoordinate(cell) {
    const x = Number(cell.dataset.x);
    const y = Number(cell.dataset.y);

    if (!Number.isInteger(x) || !Number.isInteger(y)) return;

    coordinate.textContent = `${'ABCDEFGHIJKLMN'[x]}${y + 1}`;
  }

  board.addEventListener('pointerover', event => {
    const cell = cellFromEvent(event);
    if (cell) showCoordinate(cell);
  });

  board.addEventListener('focusin', event => {
    const cell = cellFromEvent(event);
    if (cell) showCoordinate(cell);
  });

  function choosePointCell(cell, markerMode) {
    const panel = markerMode ? panels.markers : panels.objectives;

    const select = panel.querySelector(
      markerMode
        ? '[data-marker-select]'
        : '[data-map-point-select]'
    );

    const xInput = panel.querySelector(
      markerMode
        ? '[data-marker-x]'
        : '[data-map-point-x]'
    );

    const yInput = panel.querySelector(
      markerMode
        ? '[data-marker-y]'
        : '[data-map-point-y]'
    );

    const mark = cell.querySelector(
      markerMode
        ? '[data-ws-note-marker]'
        : '[data-ws-objective-marker]'
    );

    const existingId = markerMode
      ? mark?.dataset.wsNoteMarker
      : mark?.dataset.wsObjectiveMarker;

    // Клик по существующей метке выбирает её через штатную форму.
    // По пустой клетке меняет координаты текущего черновика,
    // не стирая введённые название и заметку.
    if (existingId && select && select.value !== existingId) {
      select.value = existingId;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }

    if (xInput) xInput.value = cell.dataset.x;
    if (yInput) yInput.value = cell.dataset.y;

    showCoordinate(cell);
  }

  // Capture на родителе выполняется раньше capture-обработчика
  // deployment.js и bubble-обработчика terrain-editor.js.
  //
  // В режиме КТ/маркеров клик только выбирает координаты:
  // не рисует местность и не меняет зоны.
  stage.addEventListener('click', event => {
    const cell = cellFromEvent(event);

    if (!cell) return;

    showCoordinate(cell);

    if (activeTool !== 'objectives' && activeTool !== 'markers') {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    choosePointCell(cell, activeTool === 'markers');
  }, true);

  // Уменьшаем только клетку представления.
  // Координаты и геометрия документа остаются прежними.
  function fitBoard() {
    if (maps.hidden) return;

    const width = scroll.clientWidth;
    const height = scroll.clientHeight;

    if (width <= 0 || height <= 0) return;

    const available = Math.min(width - 32, height - 32);

    // 28px ось + 14 клеток + 14 промежутков по 2px.
    // На небольших экранах сохраняем читаемость и допускаем прокрутку.
    const cellSize = Math.max(
      24,
      Math.min(64, Math.floor((available - 56) / 14))
    );

    board.style.setProperty('--ws-cell-size', `${cellSize}px`);
  }

  const resizeObserver = new ResizeObserver(fitBoard);
  resizeObserver.observe(scroll);

  window.addEventListener('hashchange', () => {
    documentBox.open = false;
    requestAnimationFrame(fitBoard);
  });

  // Закрываем меню документа только при клике снаружи.
  document.addEventListener('pointerdown', event => {
    if (
      documentBox.open &&
      event.target instanceof Node &&
      !documentBox.contains(event.target)
    ) {
      documentBox.open = false;
    }
  });

  documentBox.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !documentBox.open) return;

    event.preventDefault();
    event.stopPropagation();

    documentBox.open = false;
    documentSummary.focus();
  });

  maps.dataset.workspaceReady = 'true';
  page.classList.add('ws-workspace-ready');

  selectTool('terrain');
  requestAnimationFrame(fitBoard);
}