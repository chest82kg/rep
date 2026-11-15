// src/virtual-table/terrain-layers.js
//
// Общая геометрия многослойного ландшафта.
// Без Firebase, DOM и браузерных сохранений.
//
// Формат нормализованного тайла:
// {
//   id: string,
//   type: 'meadow' | 'forest' | 'river' | 'mountain',
//   x: integer,
//   y: integer,
//   cells: [{ x, y }], // локальные смещения клеток
//   height: safe integer, // СОБСТВЕННАЯ высота
//   layer: safe non-negative integer // порядок слоя
// }
//
// Чем больше layer, тем выше тайл.
// Значения layer должны быть уникальными во всём наборе.
//
// Итоговая высота клетки — сумма собственных высот
// всех находящихся в ней тайлов.
//
// Тайлы с перекрытием сверху нельзя перемещать.
// Даже если перекрыта только одна клетка.
//
// Этот модуль не назначает опоры моделей,
// не перемещает модели и не проверяет их столкновения.
// Полный перенос с моделями будет отдельной операцией.
//
// Старые тайлы без layer отклоняются.
// Их нельзя молча трактовать как многослойный ландшафт.

import {
  TERRAIN_TYPES,
  validateTerrainTile
} from './terrain.js';

function cellKey(x, y) {
  return `${x}:${y}`;
}

function copyTile(tile) {
  return {
    id: tile.id,
    type: tile.type,
    x: tile.x,
    y: tile.y,
    height: tile.height,
    layer: tile.layer,
    cells: tile.cells.map(cell => ({
      x: cell.x,
      y: cell.y
    }))
  };
}

function validateTile(tile) {
  if (
    !tile ||
    typeof tile.id !== 'string' ||
    tile.id.length === 0 ||
    !Number.isSafeInteger(tile.layer) ||
    tile.layer < 0
  ) {
    throw new Error(
      'Тайл содержит некорректный идентификатор ' +
      'или не имеет явно заданного порядка слоя.'
    );
  }

  // Проверяем один тайл отдельно:
  // тип, собственную высоту, форму, повторы клеток
  // и границы поля.
  //
  // Перекрытия между разными тайлами здесь разрешены.
  if (!validateTerrainTile(tile)) {
    throw new Error(
      `Тайл ${tile.id} содержит некорректные данные ` +
      'или выходит за границы поля.'
    );
  }
}

function exactHeight(stack) {
  // BigInt позволяет проверить именно конечную сумму,
  // не теряя точность на промежуточных сложениях.
  const total = stack.reduce(
    (sum, tile) => sum + BigInt(tile.height),
    0n
  );

  if (
    total < BigInt(Number.MIN_SAFE_INTEGER) ||
    total > BigInt(Number.MAX_SAFE_INTEGER)
  ) {
    throw new Error(
      'Суммарная высота клетки выходит ' +
      'за диапазон точных целых чисел.'
    );
  }

  return Number(total);
}

export function buildTerrainLayers(input) {
  if (!Array.isArray(input)) {
    throw new Error('Ландшафт должен быть массивом тайлов.');
  }

  const ids = new Set();
  const layers = new Set();

  for (const tile of input) {
    validateTile(tile);

    if (ids.has(tile.id)) {
      throw new Error(
        `Повторяется идентификатор тайла ${tile.id}.`
      );
    }

    if (layers.has(tile.layer)) {
      throw new Error(
        'Обнаружены тайлы с одинаковым порядком слоя. ' +
        'Нельзя однозначно определить верхний тайл.'
      );
    }

    ids.add(tile.id);
    layers.add(tile.layer);
  }

  // Не меняем переданный массив и его объекты.
  const tiles = input
    .map(copyTile)
    .sort((first, second) => first.layer - second.layer);

  const byId = new Map(
    tiles.map(tile => [tile.id, tile])
  );

  const cells = new Map();

  for (const tile of tiles) {
    for (const offset of tile.cells) {
      const x = tile.x + offset.x;
      const y = tile.y + offset.y;
      const key = cellKey(x, y);

      let entry = cells.get(key);

      if (!entry) {
        entry = {
          x,
          y,
          stack: [],
          top: null,
          height: null
        };

        cells.set(key, entry);
      }

      // tiles уже упорядочены снизу вверх.
      entry.stack.push(tile);
    }
  }

  // Для каждого тайла собираем все тайлы,
  // находящиеся выше него хотя бы в одной клетке.
  const blockers = new Map(
    tiles.map(tile => [tile.id, new Set()])
  );

  for (const entry of cells.values()) {
    entry.top = entry.stack[entry.stack.length - 1];
    entry.height = exactHeight(entry.stack);

    for (
      let lower = 0;
      lower < entry.stack.length;
      lower += 1
    ) {
      const lowerId = entry.stack[lower].id;
      const above = blockers.get(lowerId);

      for (
        let upper = lower + 1;
        upper < entry.stack.length;
        upper += 1
      ) {
        above.add(entry.stack[upper].id);
      }
    }
  }

  return {
    tiles,
    byId,
    cells,
    blockers
  };
}

export function readLayeredSurface(state, point) {
  const entry = state.cells.get(
    cellKey(point.x, point.y)
  );

  if (!entry) {
    return {
      name: 'Без тайла',
      height: null,
      tileId: null,
      layers: []
    };
  }

  return {
    name: TERRAIN_TYPES[entry.top.type].name,
    height: entry.height,
    tileId: entry.top.id,

    // Возвращаем новые объекты, не внутренний stack.
    layers: entry.stack.map(tile => ({
      id: tile.id,
      type: tile.type,
      height: tile.height,
      layer: tile.layer
    }))
  };
}

export function terrainTileMovement(state, tileId) {
  if (!state.byId.has(tileId)) {
    throw new Error('Выбранный тайл не найден.');
  }

  const blockedBy = [
    ...state.blockers.get(tileId)
  ];

  return {
    allowed: blockedBy.length === 0,
    blockedBy
  };
}

// Предварительная проверка геометрии переноса.
//
// Тайл получает новый верхний порядок слоя.
// Другие тайлы сохраняют свои координаты и порядок.
//
// Это НЕ полная проверка игрового переноса:
// опоры моделей, их координаты и занятые клетки
// проверяются отдельной атомарной операцией.
export function previewTerrainTileMove(
  state,
  tileId,
  destination
) {
  const tile = state.byId.get(tileId);

  if (!tile) {
    throw new Error('Выбранный тайл не найден.');
  }

  if (
    !destination ||
    !Number.isInteger(destination.x) ||
    !Number.isInteger(destination.y)
  ) {
    throw new Error('Некорректная клетка назначения.');
  }

  const movement = terrainTileMovement(state, tileId);

  if (!movement.allowed) {
    throw new Error(
      'Тайл нельзя переместить: сверху расположен ' +
      'хотя бы один другой тайл.'
    );
  }

  if (
    destination.x === tile.x &&
    destination.y === tile.y
  ) {
    return buildTerrainLayers(state.tiles);
  }

  const highestLayer = Math.max(
    ...state.tiles.map(item => item.layer)
  );

  if (highestLayer >= Number.MAX_SAFE_INTEGER) {
    throw new Error(
      'Исчерпан диапазон порядка слоёв.'
    );
  }

  const next = state.tiles.map(item =>
    item.id === tileId
      ? {
          ...item,
          x: destination.x,
          y: destination.y,
          layer: highestLayer + 1
        }
      : item
  );

  // Повторно проверяем границы всех тайлов
  // и точность новых суммарных высот.
  return buildTerrainLayers(next);
}