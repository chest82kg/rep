// src/virtual-table/online-terrain.js
//
// Чтение общего ландшафта комнаты.
//
// Поддерживаемые форматы:
//
// legacy:
// прежние документы без schemaVersion и layer.
// Пересечения запрещены, height — прежняя высота поверхности.
//
// layers-v2:
// schemaVersion: 2
// layer: уникальный неотрицательный порядок слоя
// height: собственная высота тайла
// Пересечения разрешены, высоты складываются поклеточно.
//
// Смешанный набор форматов отклоняется:
// нельзя молча переосмысливать старые высоты.
//
// Не читает локальную партию.
// Не перемещает модели.
// Не записывает документы Firebase.

import { db } from '../core/firebase.js';

import {
  collection,
  onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

import {
  TERRAIN_TYPES,
  validateTerrain
} from './terrain.js';

import {
  buildTerrainLayers
} from './terrain-layers.js';

const SIZE = 14;

const SHAPES = new Set([
  'rectangle',
  'corner',
  'line'
]);

const BASE_FIELDS = [
  'type',
  'shape',
  'width',
  'depth',
  'rotation',
  'x',
  'y',
  'height',
  'updatedAt'
];

export function emptyOnlineTerrainState(error = '') {
  return {
    ready: false,
    format: null,
    tiles: [],
    cells: new Map(),
    blockers: new Map(),
    error
  };
}

export function decodeOnlineTerrainTile(snapshot) {
  const data = snapshot.data();

  const layered = Object.hasOwn(data, 'schemaVersion');

  const expectedFields = layered
    ? [...BASE_FIELDS, 'schemaVersion', 'layer']
    : BASE_FIELDS;

  const keys = Object.keys(data);

  if (
    keys.length !== expectedFields.length ||
    !expectedFields.every(key => Object.hasOwn(data, key)) ||
    !Object.hasOwn(TERRAIN_TYPES, data.type) ||
    !SHAPES.has(data.shape) ||
    !Number.isInteger(data.width) ||
    !Number.isInteger(data.depth) ||
    data.width < 1 ||
    data.width > SIZE ||
    data.depth < 1 ||
    data.depth > SIZE ||
    !Number.isInteger(data.rotation) ||
    data.rotation < 0 ||
    data.rotation > 3 ||
    !Number.isInteger(data.x) ||
    !Number.isInteger(data.y) ||
    !Number.isSafeInteger(data.height) ||
    typeof data.updatedAt?.toMillis !== 'function'
  ) {
    throw new Error(
      `Неподдерживаемые данные тайла ${snapshot.id}.`
    );
  }

  if (
    layered &&
    (
      data.schemaVersion !== 2 ||
      !Number.isSafeInteger(data.layer) ||
      data.layer < 0
    )
  ) {
    throw new Error(
      `Неподдерживаемая версия или порядок слоя тайла ${snapshot.id}.`
    );
  }

  if (data.shape === 'line' && data.depth !== 1) {
    throw new Error(
      `У линейного тайла ${snapshot.id} глубина должна быть 1.`
    );
  }

  let cells = [];

  for (let y = 0; y < data.depth; y += 1) {
    for (let x = 0; x < data.width; x += 1) {
      if (
        data.shape === 'corner' &&
        x !== 0 &&
        y !== data.depth - 1
      ) {
        continue;
      }

      cells.push({ x, y });
    }
  }

  for (let turn = 0; turn < data.rotation; turn += 1) {
    const maxY = Math.max(...cells.map(cell => cell.y));

    cells = cells.map(cell => ({
      x: maxY - cell.y,
      y: cell.x
    }));
  }

  const tile = {
    id: snapshot.id,
    type: data.type,
    x: data.x,
    y: data.y,
    height: data.height,
    cells
  };

  // Проверка отдельного тайла, не всего набора:
  // пересечения разных тайлов для v2 допустимы.
  if (!validateTerrain([tile])) {
    throw new Error(
      `Тайл ${snapshot.id} некорректен или выходит за поле.`
    );
  }

  if (layered) {
    tile.schemaVersion = 2;
    tile.layer = data.layer;
  }

  return tile;
}

function buildLegacyState(tiles) {
  if (!validateTerrain(tiles)) {
    throw new Error(
      'Старый формат ландшафта содержит пересечения ' +
      'или некорректные данные. Автоматическое ' +
      'преобразование в слои не выполняется.'
    );
  }

  const cells = new Map();

  for (const tile of tiles) {
    const anchor = tile.cells[0];

    for (const offset of tile.cells) {
      const x = tile.x + offset.x;
      const y = tile.y + offset.y;

      cells.set(`${x}:${y}`, {
        tile,
        stack: [tile],
        height: tile.height,
        anchor:
          offset.x === anchor.x &&
          offset.y === anchor.y
      });
    }
  }

  return {
    ready: true,
    format: 'legacy',
    tiles,
    cells,
    blockers: new Map(
      tiles.map(tile => [tile.id, new Set()])
    ),
    error: ''
  };
}

function buildLayeredState(tiles) {
  const layered = buildTerrainLayers(tiles);
  const cells = new Map();

  for (const [key, entry] of layered.cells) {
    cells.set(key, {
      tile: entry.top,
      stack: entry.stack,
      height: entry.height
    });
  }

  return {
    ready: true,
    format: 'layers-v2',
    tiles,
    cells,
    blockers: layered.blockers,
    error: ''
  };
}

function buildState(snapshot) {
  const tiles = snapshot.docs.map(decodeOnlineTerrainTile);

  // Пустой набор пока остаётся совместим со старым редактором.
  // Явный режим новой комнаты подключим вместе с миграцией.
  if (tiles.length === 0) {
    return buildLegacyState([]);
  }

  const layeredCount = tiles.filter(
    tile => tile.schemaVersion === 2
  ).length;

  if (layeredCount === 0) {
    return buildLegacyState(tiles);
  }

  if (layeredCount !== tiles.length) {
    throw new Error(
      'В комнате смешаны старые и многослойные тайлы. ' +
      'Ландшафт отклонён: требуется согласованный переход формата.'
    );
  }

  return buildLayeredState(tiles);
}

export function readOnlineTerrainSurface(state, point) {
  if (!state.ready) {
    return {
      name: state.error
        ? 'Ландшафт недоступен'
        : 'Ландшафт загружается',
      height: null,
      tileId: null,
      layers: []
    };
  }

  const entry = state.cells.get(`${point.x}:${point.y}`);

  if (!entry) {
    return {
      name: 'Без тайла',
      height: null,
      tileId: null,
      layers: []
    };
  }

  const count = entry.stack.length;
  const terrainName = TERRAIN_TYPES[entry.tile.type].name;

  return {
    name: count > 1
      ? `${terrainName} · слоёв: ${count}`
      : terrainName,

    height: entry.height,
    tileId: entry.tile.id,

    layers: entry.stack.map(tile => ({
      id: tile.id,
      type: tile.type,
      height: tile.height,
      layer: tile.layer ?? null
    }))
  };
}

export function appendOnlineTerrainCell(cell, state, x, y) {
  if (!state.ready) return;

  const entry = state.cells.get(`${x}:${y}`);

  if (!entry) return;

  const count = entry.stack.length;

  cell.classList.add('vt-online-terrain-cell');
  cell.classList.toggle('vt-online-terrain-stack', count > 1);

  cell.dataset.terrain = entry.tile.type;
  cell.dataset.terrainLayers = String(count);
  cell.dataset.terrainHeight = String(entry.height);

  // В старом формате сохраняем прежнюю подпись
  // только в опорной клетке тайла.
  //
  // В многослойном формате высота может различаться
  // внутри одного тайла — подписываем каждую клетку.
  if (
    state.format === 'legacy' &&
    !entry.anchor
  ) {
    return;
  }

  const label = document.createElement('span');
  label.className = 'vt-online-terrain-label';
  label.setAttribute('aria-hidden', 'true');

  const name = document.createElement('span');
  name.textContent = TERRAIN_TYPES[entry.tile.type].name;

  const height = document.createElement('span');
  height.textContent = `В: ${entry.height}`;

  label.append(name, height);

  if (count > 1) {
    const layers = document.createElement('span');
    layers.textContent = `Слоёв: ${count}`;
    label.append(layers);
  }

  cell.append(label);
}

export function connectOnlineTerrain({
  roomId,
  onChange,
  onError = () => {}
}) {
  let destroyed = false;

  const unsubscribe = onSnapshot(
    collection(db, 'rooms', roomId, 'tableTerrain'),

    { includeMetadataChanges: true },

    snapshot => {
      if (destroyed) return;

      if (
        snapshot.metadata.fromCache ||
        snapshot.metadata.hasPendingWrites
      ) {
        onChange(
          emptyOnlineTerrainState(
            'Ожидаем подтверждение ландшафта сервером.'
          )
        );

        return;
      }

      try {
        onChange(buildState(snapshot));
      } catch (error) {
        onChange(
          emptyOnlineTerrainState(
            String(error.message || error)
          )
        );

        onError(error);
      }
    },

    error => {
      if (destroyed) return;

      onChange(
        emptyOnlineTerrainState(
          String(error.code || error.message || error)
        )
      );

      onError(error);
    }
  );

  return {
    destroy() {
      if (destroyed) return;

      destroyed = true;
      unsubscribe();
    }
  };
}

export function installOnlineTerrainStyles() {
  const id = 'vt-online-terrain-styles';

  if (document.getElementById(id)) return;

  const style = document.createElement('style');
  style.id = id;

  style.textContent = `
    .vt-page .vt-online-terrain-cell {
      position: relative;
      isolation: isolate;
    }

    .vt-page .vt-online-terrain-cell::before {
      content: '';
      position: absolute;
      inset: 0;
      z-index: -1;
      pointer-events: none;
      opacity: .42;
    }

    .vt-page
      .vt-online-terrain-cell[data-terrain="meadow"]::before {
      background: #526c36;
    }

    .vt-page
      .vt-online-terrain-cell[data-terrain="forest"]::before {
      background: #235b3c;
    }

    .vt-page
      .vt-online-terrain-cell[data-terrain="river"]::before {
      background: #285e87;
    }

    .vt-page
      .vt-online-terrain-cell[data-terrain="mountain"]::before {
      background: #786976;
    }

    .vt-page .vt-online-terrain-stack {
      box-shadow: inset 0 0 0 2px #c5a76c;
    }

    .vt-page .vt-online-terrain-label {
      position: absolute;
      top: 2px;
      left: 2px;
      right: 2px;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 1px;
      color: #f0eadc;
      font-size: 8px;
      line-height: 1.15;
      pointer-events: none;
      text-shadow: 0 1px 2px #000;
    }

    .vt-page
      .vt-online-terrain-cell[data-has-unit="true"]
      .vt-online-terrain-label {
      opacity: .55;
    }

    .vt-page .vt-online-terrain-cell .vt-token {
      position: relative;
      z-index: 1;
    }
  `;

  document.head.append(style);
}