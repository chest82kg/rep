// src/workshop/map-preview.js
//
// Общий просмотр снимка карты для мастерской и стола.
// Только чтение: без сохранения, перемещения моделей
// и автоматических игровых эффектов.

import {
  validWorkshopTerrain
} from './terrain-editor.js';

import {
  validDeployment
} from './deployment.js';

import {
  validMapObjectives
} from './objectives.js';

import {
  validMapMarkers
} from './markers.js';

const SIZE = 14;
const LETTERS = 'ABCDEFGHIJKLMN';

const TYPES = {
  meadow: { name: 'Луг', symbol: '·' },
  forest: { name: 'Лес', symbol: '♣' },
  river: { name: 'Река', symbol: '≈' },
  mountain: { name: 'Гора', symbol: '▲' }
};

function validPreviewMap(map) {
  return Boolean(
    map &&
    map.format === 'mt-map' &&
    map.version === 1 &&
    typeof map.name === 'string' &&
    map.name.trim() &&
    map.name.length <= 120 &&
    map.board?.width === SIZE &&
    map.board?.height === SIZE &&
    map.layers &&
    validWorkshopTerrain(map.layers.terrain) &&
    validDeployment(map.layers.deployment) &&
    validMapObjectives(map.layers.objectives) &&
    validMapMarkers(map.layers.markers) &&
    Array.isArray(map.layers.decorations) &&
    map.layers.decorations.length === 0 &&
    Object.keys(map.layers).length === 5
  );
}

function key(x, y) {
  return `${x}:${y}`;
}

function coordinate(x, y) {
  return `${LETTERS[x]}${y + 1}`;
}

function element(tag, className = '', content = '') {
  const node = document.createElement(tag);

  if (className) node.className = className;
  if (content !== '') node.textContent = content;

  return node;
}

export function createMapPreview(map, { caption = '' } = {}) {
  const root = element('section', 'mt-map-preview');
  root.setAttribute('aria-label', 'Просмотр снимка карты');

  if (!validPreviewMap(map)) {
    root.append(
      element(
        'p',
        'mt-map-preview-error',
        'Снимок карты не поддерживается. Предпросмотр не построен.'
      )
    );

    return root;
  }

  root.append(element('h4', '', `Снимок карты: ${map.name}`));

  if (caption) {
    root.append(element('p', 'mt-map-preview-caption', caption));
  }

  root.append(
    element(
      'p',
      'mt-map-preview-caption',
      'Только просмотр. Нажмите клетку, чтобы прочитать её состав. ' +
      'А/Б — зоны расстановки; КТ — контрольные точки; ' +
      'М — маркеры. Число справа внизу — высота местности.'
    )
  );

  const terrain = new Map();
  const zones = new Map();
  const objectives = new Map();
  const markers = new Map();

  map.layers.terrain.forEach((tile, index) => {
    tile.cells.forEach(cell => {
      terrain.set(
        key(tile.x + cell.x, tile.y + cell.y),
        { tile, number: index + 1 }
      );
    });
  });

  map.layers.deployment.forEach(cell => {
    zones.set(key(cell.x, cell.y), cell.side);
  });

  map.layers.objectives.forEach((point, index) => {
    const cellKey = key(point.x, point.y);
    const entries = objectives.get(cellKey) || [];

    entries.push({ point, number: index + 1 });
    objectives.set(cellKey, entries);
  });

  map.layers.markers.forEach((marker, index) => {
    const cellKey = key(marker.x, marker.y);
    const entries = markers.get(cellKey) || [];

    entries.push({ marker, number: index + 1 });
    markers.set(cellKey, entries);
  });

  const scroll = element('div', 'mt-map-preview-scroll');
  const board = element('div', 'mt-map-preview-board');

  board.setAttribute('role', 'group');
  board.setAttribute(
    'aria-label',
    'Снимок карты: столбцы A–N, строки 1–14'
  );

  const inspector = element('div', 'mt-map-preview-inspector');
  inspector.setAttribute('role', 'status');
  inspector.setAttribute('aria-live', 'polite');
  inspector.setAttribute('aria-atomic', 'true');

  inspector.append(element('p', '', 'Выберите клетку снимка.'));

  let selectedButton = null;

  function describe(x, y) {
    const cellKey = key(x, y);
    const entry = terrain.get(cellKey);
    const zone = zones.get(cellKey);
    const points = objectives.get(cellKey) || [];
    const notes = markers.get(cellKey) || [];

    const parts = [
      coordinate(x, y),
      entry
        ? `${TYPES[entry.tile.type].name}, ` +
          `высота ${entry.tile.height}, тайл ${entry.number}`
        : 'Нет местности'
    ];

    if (zone) {
      parts.push(`Зона ${zone === 'a' ? 'А' : 'Б'}`);
    }

    points.forEach(({ point, number }) => {
      parts.push(`КТ${number}: ${point.title}`);
    });

    notes.forEach(({ marker, number }) => {
      parts.push(`М${number}: ${marker.title}`);
    });

    return parts.join(' · ');
  }

  function showCell(x, y, button) {
    if (selectedButton) {
      selectedButton.classList.remove('is-selected');
      selectedButton.setAttribute('aria-pressed', 'false');
    }

    selectedButton = button;
    button.classList.add('is-selected');
    button.setAttribute('aria-pressed', 'true');

    inspector.replaceChildren();

    const cellKey = key(x, y);
    const entry = terrain.get(cellKey);
    const zone = zones.get(cellKey);
    const points = objectives.get(cellKey) || [];
    const notes = markers.get(cellKey) || [];

    inspector.append(element('strong', '', coordinate(x, y)));

    inspector.append(
      element(
        'p',
        '',
        entry
          ? `${TYPES[entry.tile.type].name} · ` +
            `высота ${entry.tile.height} · ` +
            `тайл ${entry.number}, ${entry.tile.cells.length} клеток`
          : 'Местность не задана.'
      )
    );

    inspector.append(
      element(
        'p',
        '',
        zone
          ? `Зона расстановки: Игрок ${zone === 'a' ? 'А' : 'Б'}.`
          : 'Зона расстановки не задана.'
      )
    );

    points.forEach(({ point, number }) => {
      inspector.append(
        element('p', '', `КТ${number}: ${point.title}`)
      );
    });

    notes.forEach(({ marker, number }) => {
      inspector.append(
        element('p', '', `М${number}: ${marker.title}`)
      );

      if (marker.note) {
        inspector.append(
          element('p', 'mt-map-preview-note', marker.note)
        );
      }
    });

    if (!points.length && !notes.length) {
      inspector.append(
        element('p', '', 'Контрольных точек и маркеров нет.')
      );
    }
  }

  function axis(content) {
    const node = element('span', 'mt-map-preview-axis', content);
    node.setAttribute('aria-hidden', 'true');
    board.append(node);
  }

  function badge(className, content) {
    const node = element('span', className, content);
    node.setAttribute('aria-hidden', 'true');
    return node;
  }

  axis('');

  for (const letter of LETTERS) {
    axis(letter);
  }

  for (let y = 0; y < SIZE; y++) {
    axis(String(y + 1));

    for (let x = 0; x < SIZE; x++) {
      const cellKey = key(x, y);
      const entry = terrain.get(cellKey);
      const zone = zones.get(cellKey);
      const points = objectives.get(cellKey) || [];
      const notes = markers.get(cellKey) || [];

      const button = element('button', 'mt-map-preview-cell');

      button.type = 'button';
      button.dataset.previewTerrain = entry?.tile.type || 'empty';
      button.setAttribute('aria-pressed', 'false');

      const description = describe(x, y);
      button.title = description;
      button.setAttribute('aria-label', description);

      if ((x + y) % 2) {
        button.classList.add('is-alternate');
      }

      if (entry) {
        button.append(
          badge(
            'mt-map-preview-symbol',
            TYPES[entry.tile.type].symbol
          ),
          badge(
            'mt-map-preview-height',
            String(entry.tile.height)
          )
        );

        const sameTile = (nx, ny) =>
          terrain.get(key(nx, ny))?.tile.id === entry.tile.id;

        button.classList.toggle(
          'has-edge-top',
          !sameTile(x, y - 1)
        );

        button.classList.toggle(
          'has-edge-right',
          !sameTile(x + 1, y)
        );

        button.classList.toggle(
          'has-edge-bottom',
          !sameTile(x, y + 1)
        );

        button.classList.toggle(
          'has-edge-left',
          !sameTile(x - 1, y)
        );
      }

      if (zone) {
        button.dataset.previewZone = zone;
        button.append(
          badge('mt-map-preview-zone', zone === 'a' ? 'А' : 'Б')
        );
      }

      if (points.length) {
        button.append(
          badge(
            'mt-map-preview-objective',
            points.length === 1
              ? `КТ${points[0].number}`
              : `КТ×${points.length}`
          )
        );
      }

      if (notes.length) {
        button.append(
          badge(
            'mt-map-preview-marker',
            notes.length === 1
              ? `М${notes[0].number}`
              : `М×${notes.length}`
          )
        );
      }

      button.addEventListener('click', () => {
        showCell(x, y, button);
      });

      board.append(button);
    }
  }

  scroll.append(board);
  root.append(scroll, inspector);

  return root;
}