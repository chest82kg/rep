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

export function createMapPreview(
  map,
  { caption = '', expandable = true } = {}
) {
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
  const heading = element('div', 'mt-map-preview-heading');
  const titleBox = element('div', 'mt-map-preview-title');

  titleBox.append(
    element('h4', '', `Снимок карты: ${map.name}`)
  );

  if (Number.isSafeInteger(map.revision) && map.revision >= 1) {
    titleBox.append(
      element(
        'p',
        'mt-map-preview-revision',
        `Редакция снимка: ${map.revision}`
      )
    );
  }

  heading.append(titleBox);

  if (expandable) {
    // Крупный просмотр получает именно этот снимок,
    // а не актуальную карту из библиотеки.
    const snapshot = JSON.parse(JSON.stringify(map));
    const expandButton = element(
      'button',
      'mt-map-preview-expand',
      'Открыть крупно'
    );

    expandButton.type = 'button';
    expandButton.setAttribute('aria-haspopup', 'dialog');

    expandButton.addEventListener('click', () => {
      openMapPreviewDialog(snapshot, expandButton);
    });

    heading.append(expandButton);
  }

  root.append(heading);


  if (caption) {
    root.append(element('p', 'mt-map-preview-caption', caption));
  }

  root.append(
    element(
      'p',
      'mt-map-preview-caption',
      'Только просмотр. Нажмите клетку, чтобы прочитать её состав. ' +
      'С клавиатуры: Tab — вход и выход из поля, ' +
      'стрелки — выбор клетки, Home/End — края строки. ' +
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

    board.querySelectorAll(
      '.mt-map-preview-cell[tabindex="0"]'
    ).forEach(cell => {
      cell.tabIndex = -1;
    });

    selectedButton = button;
    button.tabIndex = 0;
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
      button.dataset.previewX = String(x);
      button.dataset.previewY = String(y);
      button.tabIndex = x === 0 && y === 0 ? 0 : -1;
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

    board.addEventListener('keydown', event => {
    if (
      !(event.target instanceof Element) ||
      event.altKey ||
      event.metaKey ||
      event.shiftKey
    ) {
      return;
    }

    const current = event.target.closest('.mt-map-preview-cell');

    if (!current || !board.contains(current)) return;

    let x = Number(current.dataset.previewX);
    let y = Number(current.dataset.previewY);

    // Ctrl используем только для первой/последней клетки.
    if (
      event.ctrlKey &&
      event.key !== 'Home' &&
      event.key !== 'End'
    ) {
      return;
    }

    switch (event.key) {
      case 'ArrowLeft':
        x = Math.max(0, x - 1);
        break;

      case 'ArrowRight':
        x = Math.min(SIZE - 1, x + 1);
        break;

      case 'ArrowUp':
        y = Math.max(0, y - 1);
        break;

      case 'ArrowDown':
        y = Math.min(SIZE - 1, y + 1);
        break;

      case 'Home':
        x = 0;
        if (event.ctrlKey) y = 0;
        break;

      case 'End':
        x = SIZE - 1;
        if (event.ctrlKey) y = SIZE - 1;
        break;

      default:
        return;
    }

    event.preventDefault();
    event.stopPropagation();

    const next = board.querySelector(
      `.mt-map-preview-cell` +
      `[data-preview-x="${x}"]` +
      `[data-preview-y="${y}"]`
    );

    if (!next) return;

    showCell(x, y, next);
    next.focus({ preventScroll: true });

    next.scrollIntoView({
      block: 'nearest',
      inline: 'nearest'
    });
  });

  const displayOptions = element(
    'fieldset',
    'mt-map-preview-options'
  );

  displayOptions.append(
    element('legend', '', 'Показать на поле')
  );

  const options = [
    {
      label: 'Зоны',
      attribute: 'data-hide-zones'
    },
    {
      label: 'КТ',
      attribute: 'data-hide-objectives'
    },
    {
      label: 'Маркеры',
      attribute: 'data-hide-markers'
    },
    {
      label: 'Высоты',
      attribute: 'data-hide-heights'
    }
  ];

  options.forEach(({ label, attribute }) => {
    const control = element(
      'label',
      'mt-map-preview-option'
    );

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;

    checkbox.addEventListener('change', () => {
      // Только отображение текущего просмотра.
      // Данные снимка и содержимое инспектора не меняются.
      root.toggleAttribute(attribute, !checkbox.checked);
    });

    control.append(
      checkbox,
      element('span', '', label)
    );

    displayOptions.append(control);
  });

  const displayHint = element(
    'p',
    'mt-map-preview-caption mt-map-preview-display-hint',
    'Переключатели скрывают только обозначения на поле. ' +
    'Сведения о выбранной клетке всегда показываются полностью.'
  );

  const navigation = element(
    'div',
    'mt-map-preview-navigation'
  );

  const targets = new Map();

  function addTargets(select, title, entries, prefix) {
    if (!entries.length) return;

    const group = document.createElement('optgroup');
    group.label = title;

    entries.forEach((entry, index) => {
      const value = `${prefix}-${index}`;
      const option = document.createElement('option');

      option.value = value;
      option.textContent =
        `${prefix}${index + 1} · ${coordinate(entry.x, entry.y)}` +
        ` · ${entry.title}`;

      targets.set(value, {
        x: entry.x,
        y: entry.y
      });

      group.append(option);
    });

    select.append(group);
  }

  if (
    map.layers.objectives.length ||
    map.layers.markers.length
  ) {
    const label = element(
      'label',
      'mt-map-preview-navigation-label'
    );

    label.append(
      element('span', '', 'Найти на карте')
    );

    const select = document.createElement('select');
    select.className = 'mt-map-preview-target-select';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Выберите КТ или маркер…';

    select.append(placeholder);

    addTargets(
      select,
      'Контрольные точки',
      map.layers.objectives,
      'КТ'
    );

    addTargets(
      select,
      'Маркеры',
      map.layers.markers,
      'М'
    );

    select.addEventListener('change', () => {
      const target = targets.get(select.value);
      if (!target) return;

      const button = board.querySelector(
        `.mt-map-preview-cell` +
        `[data-preview-x="${target.x}"]` +
        `[data-preview-y="${target.y}"]`
      );

      if (!button) return;

      showCell(target.x, target.y, button);

      // Оставляем фокус в списке: можно сразу выбрать
      // следующую точку, не возвращаясь к нему через Tab.
      button.scrollIntoView({
        block: 'nearest',
        inline: 'nearest'
      });
    });

    label.append(select);

    navigation.append(
      label,
      element(
        'p',
        'mt-map-preview-navigation-hint',
        'Выбор выделяет клетку и показывает её состав. ' +
        'Скрытые обозначения при этом остаются скрытыми.'
      )
    );
  }

  scroll.append(board);
  root.append(displayOptions, displayHint);

  if (navigation.childElementCount) {
    root.append(navigation);
  }

  root.append(scroll, inspector);

  return root;
}

function openMapPreviewDialog(snapshot, opener) {
  // Одновременно открываем только один крупный просмотр.
  if (document.querySelector('dialog.mt-map-dialog[open]')) return;

  const dialog = element('dialog', 'mt-map-dialog');
  dialog.setAttribute('aria-label', `Снимок карты: ${snapshot.name}`);

  const header = element('div', 'mt-map-dialog-header');
  const titleBox = element('div', 'mt-map-dialog-title');

  titleBox.append(
    element('h2', '', snapshot.name),
    element(
      'p',
      '',
      'Независимый снимок · только просмотр' +
      (
        Number.isSafeInteger(snapshot.revision) &&
        snapshot.revision >= 1
          ? ` · редакция ${snapshot.revision}`
          : ''
      )
    )
  );

  const closeButton = element(
    'button',
    'mt-map-dialog-close',
    'Закрыть ×'
  );

  closeButton.type = 'button';
  closeButton.autofocus = true;

  header.append(titleBox, closeButton);

  const content = element('div', 'mt-map-dialog-content');

  content.append(
    createMapPreview(snapshot, {
      expandable: false,
      caption:
        'Нажмите клетку, чтобы увидеть её местность, зону, ' +
        'контрольную точку и заметки. Исходная карта не изменяется.'
    })
  );

  dialog.append(header, content);

  function cleanup() {
    dialog.remove();

    if (opener.isConnected) {
      opener.focus({ preventScroll: true });
    }
  }

  closeButton.addEventListener('click', () => {
    dialog.close();
  });

  // Esc обрабатывается нативным dialog:
  // браузер закрывает окно и вызывает close.
  dialog.addEventListener('close', cleanup, { once: true });

  document.body.append(dialog);

  try {
    dialog.showModal();
  } catch (error) {
    cleanup();
    console.error('Не удалось открыть крупный просмотр карты:', error);
  }
}