// src/virtual-table/isometric.js
//
// Изометрическое представление локальной партии.
// Не изменяет сохранения и не создаёт отдельное состояние боя.
//
// Действия передаются существующим кнопкам обычной сетки.
// Проверки, опоры, сохранение и история остаются в index.js.
//
// Подписи моделей рисуются отдельным верхним слоем.
// Щелчок по подписи передаётся клетке соответствующей модели.
//
// Камера подключается из isometric-camera.js.
//
// Сами фигурки остаются в порядке от дальних клеток к ближним.
// Для сложного рельефа этот порядок пока не универсален.
//
// Линейка и маршрут получают клики через обычную сетку.
// Зоны, КТ и маркеры пока отображаются только в сетке.
//
// Фронт отображается стрелкой у основания модели.
// Используются существующие значения n/e/s/w.
// Формат состояния и правила перемещения не изменяются.

import {
  createTerrainSurfaceReader,
  terrainAt
} from './terrain.js';

import {
  initIsometricCamera
} from './isometric-camera.js';

import {
  renderTerrainSelectionView
} from './terrain-selection-view.js';

import {
  renderTerrainMovePreview
} from './terrain-move-preview.js';

import { getTableObjectives } from './objectives.js';

import {
  getModelVisualRole,
  createModelFigure
} from './model-visuals.js';

const NS = 'http://www.w3.org/2000/svg';
const SIZE = 14;
const LETTERS = 'ABCDEFGHIJKLMN';

const COLORS = {
  meadow: ['#81865a', '#535a3e', '#414933'],
  forest: ['#52694b', '#354b38', '#293b30'],
  river: ['#537b83', '#36565e', '#29424d'],
  mountain: ['#8d8776', '#625e54', '#494a44'],
  empty: ['#303b41', '#263137', '#202a30']
};

let initialized = false;
let context = null;
let isoEnabled = false;
let compressedHeight = false;

let board;
let host;
let scene;
let toolbar;
let hint;
let inspector;
let heightInput;
let heightLabels;
let camera;

function svgElement(name, attributes = {}, text = '') {
  const element = document.createElementNS(NS, name);

  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, String(value));
  }

  if (text !== '') {
    element.textContent = String(text);
  }

  return element;
}

function polygon(vertices, fill, className) {
  return svgElement('polygon', {
    points: vertices.map(point => point.join(',')).join(' '),
    fill,
    class: className
  });
}

function coordinate(x, y) {
  return `${LETTERS[x]}${y + 1}`;
}

function findCell(x, y) {
  return scene.querySelector(
    `[data-iso-x="${x}"][data-iso-y="${y}"]`
  );
}

function cellFromEvent(event) {
  return event.target instanceof Element
    ? event.target.closest('[data-iso-x]')
    : null;
}

function actionCellFromEvent(event) {
  const target = event.target instanceof Element
    ? event.target
    : null;

  if (!target) return null;

    const objective = target.closest('.vt-iso-objective');

  if (objective) {
    return findCell(
      Number(objective.dataset.pointX),
      Number(objective.dataset.pointY)
    );
  }

  const modelLabel = target.closest('.vt-iso-model-label');

  if (modelLabel) {
    return findCell(
      Number(modelLabel.dataset.modelX),
      Number(modelLabel.dataset.modelY)
    );
  }

  return cellFromEvent(event);
}

function installStyles() {
  const style = document.createElement('style');

  style.textContent = `
    #vt-board.vt-iso-grid-hidden {
      display: none !important;
    }

    .vt-iso-host[hidden] {
      display: none !important;
    }

    .vt-iso-host {
      width: 100%;
      min-width: 320px;
      border-radius: 8px;
      background:
        radial-gradient(ellipse at center, #343f41, #171e23 80%);
    }

    .vt-iso-scene {
      display: block;
      width: 100%;
      height: auto;
      min-height: 280px;
    }

    .vt-iso-toolbar label {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .vt-iso-toolbar input[type="range"] {
      width: 110px;
    }

    .vt-iso-surface {
      stroke: #222e2c;
      stroke-width: 1;
      stroke-linejoin: round;
    }

    .vt-iso-wall {
      stroke: #29322e;
      stroke-width: 0.7;
      stroke-linejoin: round;
      pointer-events: none;
    }

    .vt-iso-cell {
      cursor: pointer;
    }

    .vt-iso-cell:hover .vt-iso-surface {
      stroke: #a4c8c6;
      stroke-width: 2;
    }

    .vt-iso-cell:focus {
      outline: none;
    }

    .vt-iso-cell:focus-visible .vt-iso-surface {
      stroke: #c7e5f3;
      stroke-width: 2.5;
      stroke-dasharray: 4 3;
    }

    .vt-iso-cell.is-selected .vt-iso-surface {
      stroke: #f0d47c;
      stroke-width: 3;
    }

    .vt-iso-text {
      fill: #f2ead5;
      font: 700 10px system-ui, sans-serif;
      text-anchor: middle;
      paint-order: stroke;
      stroke: #20292b;
      stroke-width: 3px;
      stroke-linejoin: round;
      pointer-events: none;
    }

    .vt-iso-coordinate {
      fill: #b9c8c5;
      font-size: 12px;
    }

    .vt-iso-height {
      fill: #d5d8bd;
      font-size: 9px;
    }

    .vt-iso-model,
    .vt-iso-overlays {
      pointer-events: none;
    }

    .vt-iso-badge {
      fill: #172327;
      fill-opacity: 0.94;
      stroke: #617777;
      stroke-width: 0.8;
    }

    .vt-iso-badge.is-selected {
      stroke: #f0d47c;
      stroke-width: 1.5;
    }

    .vt-iso-model-label {
      pointer-events: auto;
      cursor: pointer;
    }

    .vt-iso-model-label:hover .vt-iso-badge {
      stroke: #c7e5f3;
      stroke-width: 2;
    }

    .vt-iso-note {
      margin: 8px 10px;
      color: #bec5bb;
      font-size: 12px;
      line-height: 1.5;
    }

    .vt-iso-inspector {
      min-height: 20px;
      color: #e8ddbb;
    }

        .vt-iso-objective {
      pointer-events: auto;
      cursor: pointer;
    }

    .vt-iso-objective rect {
      fill: #172327;
      fill-opacity: 0.96;
      stroke-width: 1.5;
    }

    .vt-iso-objective:hover rect,
    .vt-iso-objective:focus-visible rect {
      stroke-width: 3;
    }

    .vt-iso-objective:focus {
      outline: none;
    }

    .vt-iso-objective:focus-visible rect {
      stroke-dasharray: 4 2;
    }

        .vt-iso-cell.is-located .vt-iso-surface {
      stroke: #fff0b0;
      stroke-width: 4;
      paint-order: stroke fill;
      animation: vt-iso-locate-pulse 450ms ease-in-out 4 alternate;
    }

    @keyframes vt-iso-locate-pulse {
      from {
        stroke: #fff0b0;
        stroke-width: 4;
      }

      to {
        stroke: #c89442;
        stroke-width: 2;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .vt-iso-cell.is-located .vt-iso-surface {
        animation: none;
      }
    }
  `;

  document.head.append(style);
}

function initialize() {
  board = document.getElementById('vt-board');

  const scroll = board?.closest('.vt-board-scroll');

  if (!board || !scroll) return false;

  installStyles();

  toolbar = document.createElement('section');
  toolbar.className = 'vt-field-toolbar vt-iso-toolbar';
  toolbar.setAttribute('aria-label', 'Вид карты');

  toolbar.innerHTML = `
    <button type="button"
      class="builder-action-btn"
      data-map-view="grid"
      aria-pressed="true">
      Сетка
    </button>

    <button type="button"
      class="builder-action-btn"
      data-map-view="iso"
      aria-pressed="false">
      Изометрия
    </button>

    <label>
      Рельеф
      <input type="range"
        min="0" max="24" step="1" value="12"
        aria-label="Визуальная высота рельефа">
    </label>

    <label>
      <input type="checkbox" data-iso-heights checked>
      Высоты
    </label>
  `;

  scroll.before(toolbar);

  host = document.createElement('section');
  host.className = 'vt-iso-host';
  host.hidden = true;
  host.setAttribute('aria-label', 'Изометрическая карта');

  scene = svgElement('svg', {
    class: 'vt-iso-scene',
    role: 'group',
    'aria-label': 'Изометрическая карта четырнадцать на четырнадцать'
  });

  inspector = document.createElement('p');
  inspector.className = 'vt-iso-note vt-iso-inspector';
  inspector.textContent =
    'Наведите указатель на клетку, чтобы увидеть координаты и высоту.';

  hint = document.createElement('p');
  hint.className = 'vt-iso-note';

  host.append(scene, inspector, hint);
  scroll.append(host);

  camera = initIsometricCamera({
    scene,
    toolbar
  });

  heightInput = toolbar.querySelector('input[type="range"]');
  heightLabels = toolbar.querySelector('[data-iso-heights]');

  heightInput.addEventListener('input', draw);
  heightLabels.addEventListener('change', draw);

  toolbar.addEventListener('click', event => {
    const button = event.target instanceof Element
      ? event.target.closest('[data-map-view]')
      : null;

    if (!button) return;

    isoEnabled = button.dataset.mapView === 'iso';

    updateVisibility();
    draw();
  });

  scene.addEventListener('click', event => {
    const cell = actionCellFromEvent(event);

    if (cell) {
      activateCell(cell, false);
    }
  });

  scene.addEventListener('keydown', event => {
       const cell = actionCellFromEvent(event);

    if (!cell) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activateCell(cell, true);
      return;
    }

    // Направления соответствуют координатам поля:
    // вправо — следующий столбец, вниз — следующая строка.
    const steps = {
      ArrowRight: [1, 0],
      ArrowLeft: [-1, 0],
      ArrowDown: [0, 1],
      ArrowUp: [0, -1]
    };

    const step = steps[event.key];

    if (!step) return;

    event.preventDefault();

    const x = Number(cell.dataset.isoX) + step[0];
    const y = Number(cell.dataset.isoY) + step[1];

    findCell(x, y)?.focus({ preventScroll: true });
  });

  scene.addEventListener('pointerover', event => {
    const cell = actionCellFromEvent(event);

    if (cell) {
      inspectCell(cell);
    }
  });

  scene.addEventListener('focusin', event => {
    const cell = cellFromEvent(event);

    if (cell) {
      inspectCell(cell);
    }
  });

  // Инструменты поля обновляют data-field-tool.
  // Наблюдаем только за этим атрибутом.
  new MutationObserver(() => {
    if (isoEnabled) {
      updateHint();
    }
  }).observe(board, {
    attributes: true,
    attributeFilter: ['data-field-tool']
  });

    document.addEventListener('vt:objectives-updated', () => {
    draw();
  });

  initialized = true;
  return true;
}

function inspectCell(cell) {
  inspector.textContent = cell.getAttribute('aria-label');
}

function updateVisibility() {
  board.classList.toggle('vt-iso-grid-hidden', isoEnabled);
  host.hidden = !isoEnabled;

  toolbar.querySelectorAll('[data-map-view]').forEach(button => {
    const active = isoEnabled
      ? button.dataset.mapView === 'iso'
      : button.dataset.mapView === 'grid';

    button.classList.toggle('primary', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function updateHint() {
  const tool = board.dataset.fieldTool;

  const instruction = tool === 'ruler'
    ? 'Линейка: выберите две клетки. ' +
      'Показана разница координат, не игровая дальность. '
    : tool === 'route'
      ? 'Маршрут: нажмите дальнюю клетку в том же ряду или столбце. ' +
        'Все промежуточные клетки добавятся автоматически. '
      : 'Выбор и действия выполняются активным инструментом поля. ';

  hint.textContent =
    instruction +
        'КТ показаны поверх карты; в режиме моделей ' +
    'нажмите обозначение точки для изменения контроля. ' +
    'Зоны и маркеры-памятки пока показаны только в сетке. ' +
    (
      compressedHeight
        ? 'Большие высоты визуально сжаты; игровые числа не изменены.'
        : 'Визуальный масштаб не меняет игровые высоты.'
    );
}

function activateCell(cell, restoreFocus) {
  const x = Number(cell.dataset.isoX);
  const y = Number(cell.dataset.isoY);

  // Все инструменты получают одну и ту же настоящую
  // клетку сетки. Линейка и маршрут перехватывают её
  // в capture-фазе раньше обработчика перемещения модели.
  const original = board.querySelector(
    `button[data-x="${x}"][data-y="${y}"]`
  );

  original?.click();

  const replacement = findCell(x, y);

  if (replacement) {
    inspectCell(replacement);

    if (restoreFocus) {
      replacement.focus({ preventScroll: true });
    }
  }
}

function appendFacingIndicator(parent, unit, cx, cy, selected) {
  // Проекция направлений поля на изометрическую плоскость.
  // n: строка уменьшается; e: столбец увеличивается.
  const vectors = {
    n: [1, -0.5],
    e: [1, 0.5],
    s: [-1, 0.5],
    w: [-1, -0.5]
  };

  const vector = vectors[unit.facing];

  // Не подменяем отсутствующий фронт выдуманным направлением.
  if (!vector) return;

  const sideColor = unit.side === 'b'
    ? '#e0a48d'
    : '#9ad4cd';

  const color = selected ? '#ffe298' : sideColor;
  const scale = selected ? 1.12 : 1;

  const [vx, vy] = vector;

  // Перпендикуляр в плоскости поля, затем та же
  // изометрическая проекция: стрелка лежит на поверхности.
  const px = -vx;
  const py = vy;

  function point(distance, sideways = 0) {
    return [
      cx + (vx * distance + px * sideways) * scale,
      cy + 2 + (vy * distance + py * sideways) * scale
    ];
  }

  // Наконечник выступает за основание фигурки,
  // но остаётся внутри ромба её клетки.
  const vertices = [
    point(28),
    point(18, 7),
    point(19, 2.5),
    point(11, 2.5),
    point(11, -2.5),
    point(19, -2.5),
    point(18, -7)
  ];

  parent.append(
    svgElement('polygon', {
      class: 'vt-iso-facing-indicator',
      points: vertices.map(value => value.join(',')).join(' '),
      fill: color,
      stroke: '#172327',
      'stroke-width': selected ? 2 : 1.5,
      'stroke-linejoin': 'round',
      'vector-effect': 'non-scaling-stroke',
      'pointer-events': 'none'
    })
  );
}

function isoFacingLabel(unit) {
  const names = {
    n: 'к первой строке',
    e: 'к столбцу N',
    s: 'к четырнадцатой строке',
    w: 'к столбцу A'
  };

  return names[unit.facing] || 'не задан';
}

function appendModel(parent, unit, cx, cy, selected) {
  const dead = unit.currentHp === 0;

  const roster = unit.side === 'b'
    ? context?.state?.opponentRoster
    : context?.state?.roster;

  const source = roster?.units?.[unit.rosterIndex];
  const role = getModelVisualRole(unit, source);

  const group = svgElement('g', {
    class: 'vt-iso-model',
    'aria-hidden': 'true',
    opacity: dead ? 0.65 : 1
  });

  // Одинаковая подставка у всех классов.
  group.append(
    svgElement('ellipse', {
      cx,
      cy: cy + 2,
      rx: 15,
      ry: 7,
      fill: '#162226',
      stroke: selected ? '#ffe298' : '#718582',
      'stroke-width': selected ? 3 : 1.5
    })
  );

  const figure = createModelFigure(role, unit.side);
  figure.setAttribute('transform', `translate(${cx} ${cy})`);

  // При 0 ХП сохраняем читаемость класса,
  // но приглушаем фигурку и добавляем крест.
  if (dead) {
    figure.setAttribute('opacity', '0.4');
  }

  group.append(figure);

  if (dead) {
    group.append(
      svgElement('path', {
        d:
          `M ${cx - 7} ${cy - 7} L ${cx + 7} ${cy + 5} ` +
          `M ${cx + 7} ${cy - 7} L ${cx - 7} ${cy + 5}`,
        fill: 'none',
        stroke: '#e1ae95',
        'stroke-width': 3,
        'stroke-linecap': 'square',
        'pointer-events': 'none'
      })
    );
  }

  parent.append(group);
}

function appendModelLabel(parent, unit, cx, cy, selected) {
  const side = unit.side === 'b' ? 'B' : 'A';
  const dead = unit.currentHp === 0;

  const number = `${side}${unit.rosterIndex + 1}`;
  const label = `${dead ? '× ' : ''}${number} · ${unit.currentHp}`;

  const width = Math.max(48, label.length * 6 + 12);

  // Между основанием и плашкой оставляем место
  // для стрелок, направленных вниз-влево и вниз-вправо.
  const badgeY = cy + 24;

  const group = svgElement('g', {
    class: 'vt-iso-model-label',
    'data-model-x': unit.position.x,
    'data-model-y': unit.position.y,
    'aria-hidden': 'true'
  });

  group.append(
    svgElement(
      'title',
      {},
      `${number} · ${coordinate(
        unit.position.x,
        unit.position.y
      )} · ХП ${unit.currentHp} · фронт: ${isoFacingLabel(unit)}`
    ),

    svgElement('rect', {
      x: cx - width / 2,
      y: badgeY,
      width,
      height: 17,
      rx: 4,
      class: `vt-iso-badge${selected ? ' is-selected' : ''}`
    }),

    svgElement('text', {
      x: cx,
      y: badgeY + 12,
      class: 'vt-iso-text'
    }, label)
  );

  const statuses = [
    unit.activated ? 'Акт.' : '',
    unit.fatigued ? 'Уст.' : ''
  ].filter(Boolean).join(' · ');

  if (statuses) {
    group.append(
      svgElement('text', {
        x: cx,
        y: cy - 44,
        class: 'vt-iso-text'
      }, statuses)
    );
  }

  if (selected) {
    group.append(
      svgElement('text', {
        x: cx,
        y: badgeY + 30,
        class: 'vt-iso-text'
      }, coordinate(unit.position.x, unit.position.y))
    );
  }

  parent.append(group);
}
function hideOverlappingAxisLabels() {
  const labels = [
    ...scene.querySelectorAll('.vt-iso-coordinate')
  ];

  // Проверяем экранные габариты: учитываются текущая
  // проекция, высоты и масштаб SVG.
  const obstacles = [
    ...scene.querySelectorAll(
      '.vt-iso-model, ' +
      '.vt-iso-model-label, ' +
      '.vt-iso-wall, ' +
      '.vt-iso-height'
    )
  ].map(element => element.getBoundingClientRect())
    .filter(rect => rect.width > 0 && rect.height > 0);

  for (const label of labels) {
    label.style.removeProperty('visibility');

    const rect = label.getBoundingClientRect();

    // Небольшой зазор вокруг надписи.
    const gap = 3;

    const overlaps = obstacles.some(obstacle =>
      rect.left < obstacle.right + gap &&
      rect.right > obstacle.left - gap &&
      rect.top < obstacle.bottom + gap &&
      rect.bottom > obstacle.top - gap
    );

    if (overlaps) {
      label.style.visibility = 'hidden';
    }
  }
}

function draw() {
  if (!initialized || !isoEnabled || !context) return;

  const { state, selectedId } = context;

  const readSurface = createTerrainSurfaceReader(state?.terrain);
  const cells = [];

  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const surface = readSurface({ x, y });
      const tile = terrainAt(state?.terrain, x, y);

      cells.push({
        x,
        y,
        height: surface.height,
        type: tile?.type || 'empty'
      });
    }
  }

  // Ноль — только визуальная плоскость пустых клеток.
  // Отсутствие тайла не превращается в игровую высоту 0.
  const heights = cells
    .filter(cell => cell.height !== null)
    .map(cell => cell.height);

  const minimum = Math.min(0, ...heights);
  const maximum = Math.max(0, ...heights);
  const range = maximum - minimum;

  const requestedStep = Number(heightInput.value);

  const step = range > 0
    ? Math.min(requestedStep, 200 / range)
    : requestedStep;

  compressedHeight = step < requestedStep;

  const tileWidth = 64;
  const originX = 490;
  const originY = 275;

  function displayHeight(height) {
    return height === null ? 0 : height * step;
  }

  function project(x, y, z) {
    return [
      originX + (x - y) * tileWidth / 2,
      originY + (x + y) * tileWidth / 4 - z
    ];
  }

  const byCell = new Map(
    cells.map(cell => [`${cell.x}:${cell.y}`, cell])
  );

  const units = new Map();

  for (const unit of state?.units || []) {
    if (unit.position) {
      units.set(
        `${unit.position.x}:${unit.position.y}`,
        unit
      );
    }
  }

  const focused = document.activeElement;

  const focusedCell = focused instanceof Element
    ? focused.closest('[data-iso-x]')
    : null;

  const focusedPosition =
    focusedCell && scene.contains(focusedCell)
      ? {
          x: focusedCell.dataset.isoX,
          y: focusedCell.dataset.isoY
        }
      : null;

  scene.replaceChildren();

  const overlays = svgElement('g', {
    class: 'vt-iso-overlays',
    'aria-hidden': 'true'
  });

  cells.sort((first, second) =>
    first.x + first.y - second.x - second.y ||
    first.x - second.x
  );

  for (const cell of cells) {
    const { x, y, height, type } = cell;

    const z = displayHeight(height);
    const colors = COLORS[type] || COLORS.empty;

    const unit = units.get(`${x}:${y}`);
    const selected = Boolean(unit && unit.id === selectedId);

    const description = [
      coordinate(x, y),
      height === null
        ? 'без тайла, высота неизвестна'
        : `итоговая высота ${height}`,
      unit
        ? `${unit.uniqueKey}, ` +
          `ХП ${unit.currentHp} из ${unit.stats.hp}, ` +
          `фронт: ${isoFacingLabel(unit)}`
        : 'нет модели'
    ].join(' · ');

    const group = svgElement('g', {
      class: `vt-iso-cell${selected ? ' is-selected' : ''}`,
      role: 'button',
      tabindex: 0,
      'data-iso-x': x,
      'data-iso-y': y,
      'aria-label': description,
      'aria-pressed': selected
    });

    group.append(svgElement('title', {}, description));

    const top = project(x, y, z);
    const right = project(x + 1, y, z);
    const bottom = project(x + 1, y + 1, z);
    const left = project(x, y + 1, z);

    const neighborX = byCell.get(`${x + 1}:${y}`);
    const neighborY = byCell.get(`${x}:${y + 1}`);

    // Внешняя стенка — условная толщина подставки.
    const lowerX = neighborX
      ? displayHeight(neighborX.height)
      : z - 10;

    const lowerY = neighborY
      ? displayHeight(neighborY.height)
      : z - 10;

    if (z > lowerX) {
      group.append(
        polygon([
          right,
          bottom,
          project(x + 1, y + 1, lowerX),
          project(x + 1, y, lowerX)
        ], colors[1], 'vt-iso-wall')
      );
    }

    if (z > lowerY) {
      group.append(
        polygon([
          left,
          bottom,
          project(x + 1, y + 1, lowerY),
          project(x, y + 1, lowerY)
        ], colors[2], 'vt-iso-wall')
      );
    }

    group.append(
      polygon(
        [top, right, bottom, left],
        colors[0],
        'vt-iso-surface'
      )
    );

    // У пустых клеток нет числовой игровой высоты.
    if (heightLabels.checked && height !== null) {
      // Высота внутри поверхности, а не возле верхней
      // вершины: на краю она не сливается с координатами.
      const [labelX, labelY] = project(
        x + 0.5,
        y + 0.5,
        z
      );

      group.append(
        svgElement('text', {
          x: labelX,
          y: labelY,
          'dominant-baseline': 'central',
          class: 'vt-iso-text vt-iso-height'
        }, height)
      );
    }

    if (unit) {
      const [cx, cy] = project(
        x + 0.5,
        y + 0.5,
        z
      );

      appendModel(group, unit, cx, cy, selected);

      // Фронт — интерфейсный указатель поверх клеток и фигурок.
      // Следующие нарисованные клетки больше не скрывают стрелку.
      appendFacingIndicator(
        overlays,
        unit,
        cx,
        cy,
        selected
      );

      appendModelLabel(overlays, unit, cx, cy, selected);
    }

    scene.append(group);
  }

  // Координаты располагаются вне поверхности:
  // буквы — вдоль y=0, числа — вдоль x=0.
  // Внешние координаты отнесены от края карты:
  // оставляем место для фигурок на крайних клетках.
  const axisOffset = 1.8;

   // Исходные края поля, небольшой отступ.
  // Пересекающиеся с моделями подписи убираются отдельно.
  for (let index = 0; index < SIZE; index += 1) {
    const letterPoint = project(index + 0.5, -0.65, 0);
    const numberPoint = project(-0.65, index + 0.5, 0);

    overlays.append(
      svgElement('text', {
        x: letterPoint[0],
        y: letterPoint[1] + 4,
        class: 'vt-iso-text vt-iso-coordinate'
      }, LETTERS[index]),

      svgElement('text', {
        x: numberPoint[0],
        y: numberPoint[1] + 4,
        class: 'vt-iso-text vt-iso-coordinate'
      }, index + 1)
    );
  }

    // Отдельный верхний слой КТ.
  // Читаем независимую копию действующей миссии,
  // не КТ из снимка сценария.
  const objectiveLayer = svgElement('g', {
    class: 'vt-iso-objectives'
  });

  const objectiveColors = {
    neutral: '#ffe09c',
    a: '#c1b6ff',
    b: '#84e0ef'
  };

  const objectiveOwners = {
    neutral: 'Нейтральная',
    a: 'Игрок А',
    b: 'Игрок Б'
  };

  getTableObjectives().forEach((point, index) => {
    const cell = byCell.get(`${point.x}:${point.y}`);

    if (!cell) return;

    const [cx, cy] = project(
      point.x + 0.5,
      point.y + 0.5,
      displayHeight(cell.height)
    );

    // Сдвигаем в сторону от центра модели
    // и её нижней плашки ХП.
    const badgeX = cx + 21;
    const badgeY = cy - 17;
    const label = `КТ${index + 1}`;
    const width = Math.max(34, label.length * 7 + 10);
    const color = objectiveColors[point.owner];

    const marker = svgElement('g', {
      class: 'vt-iso-objective',
      role: 'button',
      tabindex: 0,
      'data-vt-point-open': point.id,
      'data-point-x': point.x,
      'data-point-y': point.y,
      'aria-label':
        `${label}: ${point.title}, ` +
        `${coordinate(point.x, point.y)}, ` +
        `контроль: ${objectiveOwners[point.owner]}. ` +
        'В режиме моделей — изменить контроль.'
    });

    marker.append(
      svgElement('title', {},
        `${point.title} · ${objectiveOwners[point.owner]}`
      ),

      svgElement('rect', {
        x: badgeX - width / 2,
        y: badgeY,
        width,
        height: 20,
        rx: 3,
        stroke: color
      }),

      svgElement('text', {
        x: badgeX,
        y: badgeY + 14,
        class: 'vt-iso-text',
        style: `fill: ${color}`
      }, label)
    );

    objectiveLayer.append(marker);
  });

  // Подписи не перекрываются следующими клетками.
  // Плашки моделей кликабельны; остальные элементы
  // верхнего слоя пропускают щелчки к карте.
  scene.append(overlays);

    scene.append(objectiveLayer);

  // Читаем существующий выбор редактора ландшафта.
  // Подсветка не перехватывает клики и располагается
  // ниже стрелок фронта и подписей моделей.
  renderTerrainSelectionView({
    state,
    scene
  });

  // Вписываем фактически нарисованное поле:
  // поверхность, стенки, фигурки, подписи и координаты.
  // getBBox() возвращает координаты SVG независимо
  // от текущего масштаба камеры.
  const bounds = scene.getBBox();
  const padding = 24;

  if (
    Number.isFinite(bounds.x) &&
    Number.isFinite(bounds.y) &&
    Number.isFinite(bounds.width) &&
    Number.isFinite(bounds.height) &&
    bounds.width > 0 &&
    bounds.height > 0
  ) {
    camera.bounds({
      x: bounds.x - padding,
      y: bounds.y - padding,
      width: bounds.width + padding * 2,
      height: bounds.height + padding * 2
    });
  }

  // Предпросмотр использует ту же проекцию и тот же
  // визуальный масштаб высоты, что основная сцена.
  // Подключается после расчёта границ камеры.
  renderTerrainMovePreview({
    state,
    scene,
    toolbar,
    project,
    displayHeight
  });

  hideOverlappingAxisLabels();

  updateHint();

  if (focusedPosition) {
    findCell(
      focusedPosition.x,
      focusedPosition.y
    )?.focus({ preventScroll: true });
  }
}

export function renderIsometricTable(options) {
  context = options;

  if (!initialized && !initialize()) return;

  // Панель ландшафта обновляется и при обычной сетке.
  // SVG-выделение строится отдельно внутри draw(),
  // только когда включена изометрия.
  renderTerrainSelectionView({
    state: context?.state
  });

  updateVisibility();
  draw();
}

// Поиск модели — только действие представления.
// Не выбирает модель, не нажимает клетку,
// не меняет инструмент и не записывает историю.
//
// false означает, что действие не выполнено:
// изометрия скрыта, модель в резерве или уже отсутствует.
export function focusIsometricUnit(unitId) {
  if (
    !initialized ||
    !isoEnabled ||
    !context ||
    !camera
  ) {
    return false;
  }

  // Позицию берём из последнего состояния стола,
  // а не из старых атрибутов кнопки списка армии.
  const unit = context.state?.units?.find(
    item => item.id === unitId
  );

  if (!unit?.position) return false;

  const cell = findCell(
    unit.position.x,
    unit.position.y
  );

  const surface = cell?.querySelector('.vt-iso-surface');

  if (!cell || !surface) return false;

  let bounds;

  try {
    bounds = surface.getBBox();
  } catch {
    return false;
  }

  if (
    !Number.isFinite(bounds.x) ||
    !Number.isFinite(bounds.y) ||
    !Number.isFinite(bounds.width) ||
    !Number.isFinite(bounds.height) ||
    bounds.width <= 0 ||
    bounds.height <= 0
  ) {
    return false;
  }

  // Используем координаты уже нарисованной поверхности:
  // учитываются рельеф и текущая визуальная высота.
  const focused = camera.focusAt({
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2
  });

  if (!focused) return false;

  // Повторный поиск перезапускает подсветку.
  scene.querySelectorAll('.is-located').forEach(element => {
    element.classList.remove('is-located');
  });

  cell.classList.remove('is-located');

  // Запускаем CSS-анимацию заново без перерисовки сцены.
  void cell.getBoundingClientRect();

  cell.classList.add('is-located');

  const token = {};
  cell._vtLocateToken = token;

  window.setTimeout(() => {
    // Старый таймер не должен снимать новую подсветку.
    if (cell._vtLocateToken !== token) return;

    cell.classList.remove('is-located');
    delete cell._vtLocateToken;
  }, 2200);

  // Не передаём клавиатурный фокус клетке:
  // он остаётся на кнопке списка армии.
  return true;
}