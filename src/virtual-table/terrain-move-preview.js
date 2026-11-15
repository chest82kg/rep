// src/virtual-table/terrain-move-preview.js
//
// Предпросмотр переноса тайла в изометрии.
// Не обрабатывает подтверждение щелчком.
// Не изменяет состояние партии, сохранения и историю.
//
// Геометрия рассчитывается previewTerrainTileMove().
// Окончательная операция остаётся в terrain.js.

import {
  getTerrainMode,
  getSelectedTerrainTileId,
  terrainIsLayered,
  tileCells
} from './terrain.js';

import {
  buildTerrainLayers,
  previewTerrainTileMove,
  readLayeredSurface
} from './terrain-layers.js';

const NS = 'http://www.w3.org/2000/svg';
const LETTERS = 'ABCDEFGHIJKLMN';

let initialized = false;
let context = null;
let layer = null;
let status = null;
let lastPoint = null;

function svg(name, attributes = {}, text = '') {
  const result = document.createElementNS(NS, name);

  for (const [key, value] of Object.entries(attributes)) {
    result.setAttribute(key, String(value));
  }

  if (text !== '') result.textContent = String(text);

  return result;
}

function key(point) {
  return `${point.x}:${point.y}`;
}

function coordinate(point) {
  return `${LETTERS[point.x]}${point.y + 1}`;
}

function modelNumber(unit) {
  return `${unit.side === 'b' ? 'B' : 'A'}${unit.rosterIndex + 1}`;
}

function clearPreview() {
  layer?.remove();
  layer = null;

  if (status) {
    status.hidden = true;
    status.textContent = '';
  }
}

function eventPoint(event) {
  const target = event.target instanceof Element
    ? event.target
    : null;

  if (!target) return null;

  const label = target.closest('.vt-iso-model-label');
  const cell = target.closest('[data-iso-x][data-iso-y]');

  const x = Number(
    label ? label.dataset.modelX : cell?.dataset.isoX
  );

  const y = Number(
    label ? label.dataset.modelY : cell?.dataset.isoY
  );

  if (
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    x < 0 || y < 0 ||
    x >= 14 || y >= 14
  ) {
    return null;
  }

  return { x, y };
}

function prepare(state, source, destination) {
  if (!terrainIsLayered(state.terrain || [])) {
    throw new Error(
      'Для переноса сначала переведите ландшафт на слои.'
    );
  }

  const layers = buildTerrainLayers(state.terrain || []);

  const sourceCells = new Set(
    tileCells(source).map(key)
  );

  const units = state.units || [];

  const unassigned = units.find(unit =>
    unit.position &&
    sourceCells.has(key(unit.position)) &&
    unit.position.supportTileId !== source.id
  );

  if (unassigned) {
    throw new Error(
      `${modelNumber(unassigned)} в ${coordinate(unassigned.position)}: ` +
      'не назначена опора на выбранный тайл.'
    );
  }

  const carried = units.filter(unit =>
    unit.position &&
    unit.position.supportTileId === source.id
  );

  for (const unit of carried) {
    if (!sourceCells.has(key(unit.position))) {
      throw new Error(
        'Модель с опорой на тайл находится вне его клеток.'
      );
    }
  }

  const preview = previewTerrainTileMove(
    layers,
    source.id,
    destination
  );

  const moved = preview.byId.get(source.id);

  if (!moved) {
    throw new Error('Не удалось подготовить положение тайла.');
  }

  const carriedIds = new Set(
    carried.map(unit => unit.id)
  );

  const otherUnits = units.filter(unit =>
    unit.position &&
    !carriedIds.has(unit.id)
  );

  const destinationCells = new Set(
    tileCells(moved).map(key)
  );

  const conflict = otherUnits.find(unit =>
    destinationCells.has(key(unit.position))
  );

  if (conflict) {
    throw new Error(
      `Тайл накрывает ${modelNumber(conflict)} ` +
      `в клетке ${coordinate(conflict.position)}.`
    );
  }

  const occupied = new Set(
    otherUnits.map(unit => key(unit.position))
  );

  const dx = moved.x - source.x;
  const dy = moved.y - source.y;

  const planned = [];
  const destinations = new Set();

  for (const unit of carried) {
    const position = {
      x: unit.position.x + dx,
      y: unit.position.y + dy
    };

    if (
      position.x < 0 || position.y < 0 ||
      position.x >= 14 || position.y >= 14
    ) {
      throw new Error('Перенос выводит модель за границы поля.');
    }

    const cellKey = key(position);

    if (
      occupied.has(cellKey) ||
      destinations.has(cellKey)
    ) {
      throw new Error('Перенос приводит к столкновению моделей.');
    }

    const surface = readLayeredSurface(preview, position);

    if (surface.tileId !== source.id) {
      throw new Error('После переноса модель теряет верхнюю опору.');
    }

    destinations.add(cellKey);

    planned.push({
      unit,
      position,
      height: surface.height
    });
  }

  return { preview, moved, planned };
}

function drawFootprint(tile, readHeight, color) {
  const { project, displayHeight } = context;

  const cells = tileCells(tile);
  const own = new Set(cells.map(key));
  const segments = [];

  for (const cell of cells) {
    const height = readHeight(cell);
    const z = displayHeight(height);

    const vertices = [
      project(cell.x, cell.y, z),
      project(cell.x + 1, cell.y, z),
      project(cell.x + 1, cell.y + 1, z),
      project(cell.x, cell.y + 1, z)
    ];

    layer.append(svg('polygon', {
      points: vertices.map(point => point.join(',')).join(' '),
      fill: color,
      'fill-opacity': 0.22,
      stroke: 'none'
    }));

    const edges = [
      [0, 1, cell.x, cell.y - 1],
      [1, 2, cell.x + 1, cell.y],
      [2, 3, cell.x, cell.y + 1],
      [3, 0, cell.x - 1, cell.y]
    ];

    for (const [from, to, x, y] of edges) {
      if (own.has(`${x}:${y}`)) continue;

      segments.push(
        `M ${vertices[from][0]} ${vertices[from][1]} ` +
        `L ${vertices[to][0]} ${vertices[to][1]}`
      );
    }
  }

  if (!segments.length) return;

  const d = segments.join(' ');

  for (const [stroke, width] of [
    ['#172327', 5],
    [color, 2.5]
  ]) {
    layer.append(svg('path', {
      d,
      fill: 'none',
      stroke,
      'stroke-width': width,
      'stroke-dasharray': '7 4',
      'stroke-linejoin': 'round',
      'vector-effect': 'non-scaling-stroke'
    }));
  }
}

function showPreview(point) {
  clearPreview();

  if (
    !context ||
    getTerrainMode() !== 'move' ||
    !point
  ) {
    return;
  }

  const { state, scene, project, displayHeight } = context;

  if (scene.closest('.vt-iso-host')?.hidden) return;

  const id = getSelectedTerrainTileId();

  const source = (state?.terrain || []).find(
    tile => tile.id === id
  );

  if (!source) return;

  lastPoint = point;

  status.hidden = false;

  if (point.x === source.x && point.y === source.y) {
    status.style.color = '#d8c795';
    status.textContent =
      'Исходная точка тайла. Щелчок завершит перенос без изменений.';
    return;
  }

  layer = svg('g', {
    class: 'vt-iso-terrain-move-preview',
    'aria-hidden': 'true',
    'pointer-events': 'none'
  });

  layer.style.pointerEvents = 'none';

  try {
    const result = prepare(state, source, point);
    const color = '#9bd7bc';

    drawFootprint(
      result.moved,
      cell => readLayeredSurface(result.preview, cell).height,
      color
    );

    for (const item of result.planned) {
      const [cx, cy] = project(
        item.position.x + 0.5,
        item.position.y + 0.5,
        displayHeight(item.height)
      );

      layer.append(
        svg('ellipse', {
          cx,
          cy,
          rx: 15,
          ry: 7,
          fill: '#172327',
          'fill-opacity': 0.8,
          stroke: color,
          'stroke-width': 2,
          'vector-effect': 'non-scaling-stroke'
        }),

        svg('text', {
          x: cx,
          y: cy - 11,
          fill: color,
          stroke: '#172327',
          'stroke-width': 3,
          'paint-order': 'stroke',
          'text-anchor': 'middle',
          'font-size': 11,
          'font-weight': 700
        }, modelNumber(item.unit))
      );
    }

    status.style.color = color;
    status.textContent =
      `Предпросмотр: начало габарита ${coordinate(point)} · ` +
      `моделей с опорой: ${result.planned.length}. ` +
      'Предварительные проверки пройдены. ' +
      'Щелчок выполнит окончательную проверку и перенос.';
  } catch (error) {
    // При ошибке точной будущей поверхности может не быть.
    // Красный след показываем на условном нулевом уровне,
    // не выдавая его за рассчитанную высоту.
    drawFootprint(
      {
        ...source,
        x: point.x,
        y: point.y
      },
      () => 0,
      '#f2a095'
    );

    status.style.color = '#f2a095';
    status.textContent =
      `Перенос не подготовлен: ${error.message} ` +
      'Красный след показан на условном нулевом уровне.';
  }

  // Это временный интерфейсный слой.
  // Он не участвует в изменении границ камеры.
  scene.append(layer);
}

function initialize(scene, toolbar) {
  status = document.createElement('p');
  status.className = 'vt-terrain-move-preview-status';
  status.hidden = true;
  status.setAttribute('role', 'status');

  Object.assign(status.style, {
    margin: '6px 10px',
    fontSize: '0.76rem',
    lineHeight: '1.5'
  });

  toolbar.after(status);

  scene.addEventListener('pointerover', event => {
    if (event.pointerType === 'touch') return;
    if (getTerrainMode() !== 'move') return;

    const point = eventPoint(event);

    if (!point) return;

    if (
      lastPoint?.x === point.x &&
      lastPoint?.y === point.y
    ) {
      return;
    }

    showPreview(point);
  });

  scene.addEventListener('focusin', event => {
    if (getTerrainMode() !== 'move') return;

    const point = eventPoint(event);
    if (point) showPreview(point);
  });

  scene.addEventListener('pointerleave', () => {
    lastPoint = null;
    clearPreview();
  });

  document.addEventListener('vt:terrain-mode', () => {
    lastPoint = null;
    clearPreview();
  });

  new MutationObserver(() => {
    lastPoint = null;
    clearPreview();
  }).observe(
    document.getElementById('vt-board'),
    {
      attributes: true,
      attributeFilter: ['data-field-tool', 'class']
    }
  );

  initialized = true;
}

export function renderTerrainMovePreview(options) {
  context = options;

  if (!initialized) {
    initialize(options.scene, options.toolbar);
  }

  // При каждом новом снимке убираем старый прогноз.
  // Следующее наведение или фокус пересчитает его заново.
  lastPoint = null;
  clearPreview();
}