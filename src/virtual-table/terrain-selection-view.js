// src/virtual-table/terrain-selection-view.js
//
// Отображение выбранного тайла в изометрии.
//
// Использует существующий выбор terrain.js.
// Подсвечивает только клетки, где выбранный тайл верхний.
// Внутренние границы соседних видимых клеток не обводит.
//
// Не перехватывает указатель.
// Не изменяет тайлы, модели, сохранения или историю.

import {
  getSelectedTerrainTileId,
  terrainAt,
  tileCells
} from './terrain.js';

const NS = 'http://www.w3.org/2000/svg';
const LETTERS = 'ABCDEFGHIJKLMN';

function svg(name, attributes = {}) {
  const result = document.createElementNS(NS, name);

  for (const [key, value] of Object.entries(attributes)) {
    result.setAttribute(key, String(value));
  }

  return result;
}

function keyOf(point) {
  return `${point.x}:${point.y}`;
}

function selectionData(state) {
  const id = getSelectedTerrainTileId();

  const tile = id
    ? (state?.terrain || []).find(item => item.id === id)
    : null;

  if (!tile) return null;

  const cells = tileCells(tile);

  const visible = cells.filter(point =>
    terrainAt(
      state?.terrain,
      point.x,
      point.y
    )?.id === tile.id
  );

  return {
    tile,
    cells,
    visible,
    visibleKeys: new Set(visible.map(keyOf)),
    coveredCount: cells.length - visible.length
  };
}

function updateSummary(data) {
  const container = document.getElementById(
    'vt-terrain-selection'
  );

  if (!container) return;

  let summary = container.querySelector(
    '[data-terrain-visibility]'
  );

  if (!data) {
    summary?.remove();
    return;
  }

  if (!summary) {
    summary = document.createElement('p');
    summary.className = 'vt-muted';
    summary.dataset.terrainVisibility = '';

    Object.assign(summary.style, {
      margin: '6px 0',
      color: '#d8c795',
      lineHeight: '1.5'
    });

    container.append(summary);
  }

  const { tile, cells, visible, coveredCount } = data;

  const anchor = `${LETTERS[tile.x]}${tile.y + 1}`;

  summary.textContent =
    `Начало габарита: ${anchor} · ` +
    `видимых клеток: ${visible.length} из ${cells.length}` +
    (
      coveredCount > 0
        ? ` · перекрыто: ${coveredCount}. ` +
          (
            visible.length === 0
              ? 'Тайл полностью скрыт верхними слоями.'
              : 'В изометрии выделена только открытая часть.'
          )
        : '. В изометрии выделен весь тайл.'
    );

  summary.title =
    'Начало габарита — точка, используемая при размещении ' +
    'и переносе. Собственная высота тайла указана выше; ' +
    'итоговая высота поверхности зависит от всех слоёв клетки.';
}

function surfaceGeometry(scene, point) {
  const surface = scene.querySelector(
    `[data-iso-x="${point.x}"]` +
    `[data-iso-y="${point.y}"] .vt-iso-surface`
  );

  if (!surface) return null;

  const vertices = surface.points;

  // isometric.js создаёт ромб в порядке:
  // верх, право, низ, лево.
  if (!vertices || vertices.numberOfItems !== 4) {
    return null;
  }

  return Array.from({ length: 4 }, (_, index) => {
    const vertex = vertices.getItem(index);

    return {
      x: vertex.x,
      y: vertex.y
    };
  });
}

function pointText(point) {
  return `${point.x},${point.y}`;
}

function drawSelection(scene, data) {
  scene.querySelectorAll('.vt-iso-terrain-selection')
    .forEach(layer => layer.remove());

  if (!data || data.visible.length === 0) return;

  const layer = svg('g', {
    class: 'vt-iso-terrain-selection',
    'aria-hidden': 'true',
    'pointer-events': 'none'
  });

  layer.style.pointerEvents = 'none';

  const fillLayer = svg('g', {
    'pointer-events': 'none'
  });

  const borderLayer = svg('g', {
    'pointer-events': 'none'
  });

  const segments = [];

  for (const cell of data.visible) {
    const vertices = surfaceGeometry(scene, cell);

    if (!vertices) continue;

    fillLayer.append(svg('polygon', {
      points: vertices.map(pointText).join(' '),
      fill: '#efd28b',
      'fill-opacity': 0.17,
      stroke: 'none',
      'pointer-events': 'none'
    }));

    // Каждая сторона ромба соответствует соседу
    // по одной из координат поля.
    const edges = [
      {
        neighbor: { x: cell.x, y: cell.y - 1 },
        from: 0,
        to: 1
      },
      {
        neighbor: { x: cell.x + 1, y: cell.y },
        from: 1,
        to: 2
      },
      {
        neighbor: { x: cell.x, y: cell.y + 1 },
        from: 2,
        to: 3
      },
      {
        neighbor: { x: cell.x - 1, y: cell.y },
        from: 3,
        to: 0
      }
    ];

    for (const edge of edges) {
      // Убираем внутренние швы между видимыми
      // клетками одного выбранного тайла.
      if (data.visibleKeys.has(keyOf(edge.neighbor))) {
        continue;
      }

      const from = vertices[edge.from];
      const to = vertices[edge.to];

      segments.push(
        `M ${from.x} ${from.y} L ${to.x} ${to.y}`
      );
    }
  }

  if (!fillLayer.childNodes.length) return;

  if (segments.length) {
    const path = segments.join(' ');

    // Тёмная подложка сохраняет читаемость
    // на светлых и тёмных типах поверхности.
    borderLayer.append(
      svg('path', {
        d: path,
        fill: 'none',
        stroke: '#172327',
        'stroke-width': 5,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'vector-effect': 'non-scaling-stroke',
        'pointer-events': 'none'
      }),

      svg('path', {
        d: path,
        fill: 'none',
        stroke: '#f0d28b',
        'stroke-width': 2.5,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'vector-effect': 'non-scaling-stroke',
        'pointer-events': 'none'
      })
    );
  }

  layer.append(fillLayer, borderLayer);

  // Стрелки фронта и подписи моделей сохраняют
  // приоритет над выделением поверхности.
  const modelOverlays = scene.querySelector(
    '.vt-iso-overlays'
  );

  if (modelOverlays) {
    scene.insertBefore(layer, modelOverlays);
  } else {
    scene.append(layer);
  }
}

export function renderTerrainSelectionView({
  state,
  scene = null
}) {
  const data = selectionData(state);

  updateSummary(data);

  if (scene) {
    drawSelection(scene, data);
  }
}