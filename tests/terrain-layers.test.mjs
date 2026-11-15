// tests/terrain-layers.test.mjs
//
// Проверки общей геометрии местности.
// Без DOM, Firebase и браузерного хранилища.
//
// Запуск из корня проекта:
// node --experimental-default-type=module --test tests/terrain-layers.test.mjs
//
// Эти тесты проверяют геометрию тайлов.
// Перенос моделей и браузерный интерфейс проверяются отдельно.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildTerrainLayers,
  readLayeredSurface,
  terrainTileMovement,
  previewTerrainTileMove
} from '../src/virtual-table/terrain-layers.js';

import {
  validateTerrain,
  terrainAt,
  createTerrainSurfaceReader
} from '../src/virtual-table/terrain.js';

function makeTile(overrides = {}) {
  return {
    id: 'ground',
    type: 'meadow',
    x: 0,
    y: 0,
    cells: [{ x: 0, y: 0 }],
    height: 0,
    layer: 0,
    ...overrides
  };
}

function rectangle(width, depth) {
  const cells = [];

  for (let y = 0; y < depth; y += 1) {
    for (let x = 0; x < width; x += 1) {
      cells.push({ x, y });
    }
  }

  return cells;
}

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

test('пустое поле не получает выдуманную нулевую высоту', () => {
  const state = buildTerrainLayers([]);

  assert.deepEqual(
    readLayeredSurface(state, { x: 4, y: 7 }),
    {
      name: 'Без тайла',
      height: null,
      tileId: null,
      layers: []
    }
  );
});

test('верхний тайл определяется layer, а не порядком массива', () => {
  const top = makeTile({
    id: 'top',
    type: 'forest',
    layer: 8,
    height: 2
  });

  const bottom = makeTile({
    id: 'bottom',
    layer: 1,
    height: 3
  });

  const state = buildTerrainLayers([top, bottom]);
  const surface = readLayeredSurface(state, { x: 0, y: 0 });

  assert.equal(surface.tileId, 'top');
  assert.equal(surface.name, 'Лес');
  assert.equal(surface.height, 5);

  assert.equal(
    terrainAt([top, bottom], 0, 0)?.id,
    'top'
  );
});

test('отрицательная собственная высота участвует в сумме', () => {
  const state = buildTerrainLayers([
    makeTile({
      id: 'bottom',
      height: 5
    }),
    makeTile({
      id: 'river',
      type: 'river',
      height: -3,
      layer: 1
    })
  ]);

  const surface = readLayeredSurface(state, { x: 0, y: 0 });

  assert.equal(surface.height, 2);
  assert.equal(surface.tileId, 'river');
});

test('промежуточная большая сумма не теряет точность', () => {
  const maximum = Number.MAX_SAFE_INTEGER;

  const state = buildTerrainLayers([
    makeTile({
      id: 'first',
      height: maximum,
      layer: 0
    }),
    makeTile({
      id: 'second',
      height: maximum,
      layer: 1
    }),
    makeTile({
      id: 'third',
      height: -maximum,
      layer: 2
    })
  ]);

  assert.equal(
    readLayeredSurface(state, { x: 0, y: 0 }).height,
    maximum
  );
});

test('небезопасная конечная сумма высот отклоняется', () => {
  assert.throws(() => {
    buildTerrainLayers([
      makeTile({
        id: 'first',
        height: Number.MAX_SAFE_INTEGER
      }),
      makeTile({
        id: 'second',
        height: 1,
        layer: 1
      })
    ]);
  }, /Суммарная высота/);
});

test('повторяющиеся идентификаторы отклоняются', () => {
  assert.throws(() => {
    buildTerrainLayers([
      makeTile(),
      makeTile({ layer: 1, x: 2 })
    ]);
  }, /Повторяется идентификатор/);
});

test('повторяющиеся слои отклоняются даже без пересечения', () => {
  assert.throws(() => {
    buildTerrainLayers([
      makeTile({ id: 'first' }),
      makeTile({ id: 'second', x: 5 })
    ]);
  }, /одинаковым порядком слоя/);
});

test('перекрытие одной клетки блокирует весь нижний тайл', () => {
  const state = buildTerrainLayers([
    makeTile({
      id: 'bottom',
      cells: rectangle(2, 2)
    }),
    makeTile({
      id: 'top',
      x: 1,
      y: 1,
      layer: 1
    })
  ]);

  assert.deepEqual(
    terrainTileMovement(state, 'bottom'),
    {
      allowed: false,
      blockedBy: ['top']
    }
  );

  assert.equal(
    terrainTileMovement(state, 'top').allowed,
    true
  );

  assert.throws(() => {
    previewTerrainTileMove(
      state,
      'bottom',
      { x: 5, y: 5 }
    );
  }, /сверху расположен/);
});

test('перенос назначает новый верхний слой', () => {
  const state = buildTerrainLayers([
    makeTile({
      id: 'moving',
      height: 2,
      layer: 0
    }),
    makeTile({
      id: 'destination',
      x: 5,
      y: 5,
      height: 3,
      layer: 7
    })
  ]);

  const moved = previewTerrainTileMove(
    state,
    'moving',
    { x: 5, y: 5 }
  );

  assert.equal(moved.byId.get('moving').layer, 8);

  const surface = readLayeredSurface(
    moved,
    { x: 5, y: 5 }
  );

  assert.equal(surface.tileId, 'moving');
  assert.equal(surface.height, 5);

  assert.equal(
    readLayeredSurface(moved, { x: 0, y: 0 }).tileId,
    null
  );

  // Исходный снимок не должен измениться.
  assert.equal(state.byId.get('moving').x, 0);
  assert.equal(state.byId.get('moving').layer, 0);
});

test('выход тайла за поле отклоняется без изменения исходника', () => {
  const input = [
    makeTile({
      cells: rectangle(2, 2)
    })
  ];

  const original = copy(input);
  const state = buildTerrainLayers(input);

  assert.throws(() => {
    previewTerrainTileMove(
      state,
      'ground',
      { x: 13, y: 13 }
    );
  }, /границы поля/);

  assert.deepEqual(input, original);
  assert.equal(state.byId.get('ground').x, 0);
  assert.equal(state.byId.get('ground').y, 0);
});

test('перенос в исходную точку не повышает слой', () => {
  const state = buildTerrainLayers([
    makeTile({ layer: 3 })
  ]);

  const result = previewTerrainTileMove(
    state,
    'ground',
    { x: 0, y: 0 }
  );

  assert.deepEqual(result.tiles, state.tiles);
  assert.equal(result.byId.get('ground').layer, 3);
});

test('исчерпанный диапазон слоёв не допускает новый перенос', () => {
  const state = buildTerrainLayers([
    makeTile({
      layer: Number.MAX_SAFE_INTEGER
    })
  ]);

  assert.throws(() => {
    previewTerrainTileMove(
      state,
      'ground',
      { x: 1, y: 1 }
    );
  }, /диапазон порядка слоёв/);
});

test('ошибка новой суммы высот отменяет подготовку переноса', () => {
  const state = buildTerrainLayers([
    makeTile({
      id: 'moving',
      height: 1,
      layer: 0
    }),
    makeTile({
      id: 'destination',
      x: 5,
      y: 5,
      height: Number.MAX_SAFE_INTEGER,
      layer: 1
    })
  ]);

  const original = copy(state.tiles);

  assert.throws(() => {
    previewTerrainTileMove(
      state,
      'moving',
      { x: 5, y: 5 }
    );
  }, /Суммарная высота/);

  assert.deepEqual(state.tiles, original);
});

test('результаты чтения не предоставляют доступ к внутренним слоям', () => {
  const input = [makeTile()];
  const state = buildTerrainLayers(input);

  input[0].cells[0].x = 9;

  assert.equal(state.byId.get('ground').cells[0].x, 0);

  const surface = readLayeredSurface(
    state,
    { x: 0, y: 0 }
  );

  surface.layers[0].height = 999;

  assert.equal(
    readLayeredSurface(state, { x: 0, y: 0 }).height,
    0
  );
});

test('старый непересекающийся формат остаётся поддержанным', () => {
  const first = makeTile({
    id: 'first',
    height: 4
  });

  const second = makeTile({
    id: 'second',
    x: 2,
    height: -1
  });

  delete first.layer;
  delete second.layer;

  assert.equal(validateTerrain([first, second]), true);

  const read = createTerrainSurfaceReader([first, second]);

  assert.equal(read({ x: 0, y: 0 }).height, 4);
  assert.equal(read({ x: 2, y: 0 }).height, -1);
  assert.equal(read({ x: 1, y: 0 }).height, null);

  assert.equal(
    validateTerrain([
      first,
      { ...second, x: 0 }
    ]),
    false
  );
});

test('смешанный старый и многослойный формат отклоняется', () => {
  const legacy = makeTile({
    id: 'legacy',
    x: 3
  });

  delete legacy.layer;

  assert.equal(
    validateTerrain([
      makeTile({ id: 'layered' }),
      legacy
    ]),
    false
  );
});