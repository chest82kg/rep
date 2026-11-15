// src/virtual-table/ruler.js
//
// Общая геометрическая линейка сетки и изометрии.
// Не рассчитывает игровую дальность.
//
// Единственное состояние измерения для обоих видов.
// Щелчки изометрии передаются существующим клеткам сетки.
//
// Не изменяет партию, модели, terrain или сохранения.

const LETTERS = 'ABCDEFGHIJKLMN';
const SVG_NS = 'http://www.w3.org/2000/svg';

let initialized = false;
let enabled = false;
let updateView = null;

export function isRulerEnabled() {
  return enabled;
}

export function setRulerEnabled(value) {
  const next = Boolean(value);
  const changed = next !== enabled;

  enabled = next;
  updateView?.();

  if (changed) {
    document.dispatchEvent(new CustomEvent('vt:ruler-mode', {
      detail: { enabled }
    }));
  }
}

export function initRuler() {
  if (initialized) return;

  const board = document.getElementById('vt-board');
  const fieldPanel = document.querySelector('.vt-field-panel');
  const boardScroll = fieldPanel?.querySelector('.vt-board-scroll');

  if (!board || !fieldPanel || !boardScroll) {
    console.error('Линейка: не найдены элементы поля.');
    return;
  }

  initialized = true;

  let start = null;
  let end = null;

  const panel = document.createElement('section');
  panel.className = 'vt-field-toolbar vt-ruler-toolbar';
  panel.setAttribute('aria-label', 'Измерение на поле');

  panel.innerHTML = `
    <button type="button"
      class="builder-action-btn"
      id="vt-ruler-clear"
      disabled>
      Очистить измерение
    </button>

    <span id="vt-ruler-result"
      role="status"
      aria-live="polite">
      Измерение не задано.
    </span>
  `;

  boardScroll.before(panel);

  const clearButton = panel.querySelector('#vt-ruler-clear');
  const result = panel.querySelector('#vt-ruler-result');

  function svgElement(name, attributes = {}) {
    const element = document.createElementNS(SVG_NS, name);

    for (const [key, value] of Object.entries(attributes)) {
      element.setAttribute(key, String(value));
    }

    return element;
  }

  const gridOverlay = svgElement('svg', {
    'aria-hidden': 'true',
    focusable: 'false'
  });

  Object.assign(gridOverlay.style, {
    position: 'absolute',
    left: '0',
    top: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: '10',
    overflow: 'visible'
  });

  const isoOverlay = svgElement('g', {
    class: 'vt-iso-ruler-overlay',
    'aria-hidden': 'true',
    'pointer-events': 'none'
  });

  // Явно задаём и CSS-свойство, чтобы слой
  // никогда не перехватывал игровые нажатия.
  isoOverlay.style.pointerEvents = 'none';

  board.style.position = 'relative';

  function label(point) {
    return `${LETTERS[point.x]}${point.y + 1}`;
  }

  function gridGeometry(point) {
    const cell = board.querySelector(
      `button[data-x="${point.x}"][data-y="${point.y}"]`
    );

    if (!cell) return null;

    const cellRect = cell.getBoundingClientRect();
    const boardRect = board.getBoundingClientRect();

    const x = cellRect.left - boardRect.left - board.clientLeft;
    const y = cellRect.top - boardRect.top - board.clientTop;

    return {
      x,
      y,
      width: cellRect.width,
      height: cellRect.height,
      centerX: x + cellRect.width / 2,
      centerY: y + cellRect.height / 2
    };
  }

  function isoGeometry(scene, point) {
    const surface = scene.querySelector(
      `[data-iso-x="${point.x}"]` +
      `[data-iso-y="${point.y}"] .vt-iso-surface`
    );

    if (!surface) return null;

    // Координаты самой поверхности уже учитывают
    // визуальную высоту рельефа в isometric.js.
    const box = surface.getBBox();

    return {
      points: surface.getAttribute('points'),
      centerX: box.x + box.width / 2,
      centerY: box.y + box.height / 2
    };
  }

  function drawLine(target, first, second) {
    if (!first || !second) return;

    const coordinates = {
      x1: first.centerX,
      y1: first.centerY,
      x2: second.centerX,
      y2: second.centerY,
      'stroke-linecap': 'round',
      'vector-effect': 'non-scaling-stroke'
    };

    target.append(
      svgElement('line', {
        ...coordinates,
        stroke: '#111a1e',
        'stroke-width': 6
      }),
      svgElement('line', {
        ...coordinates,
        stroke: '#ffe09c',
        'stroke-width': 3,
        'stroke-dasharray': '8 5'
      })
    );
  }

  function drawPoint(target, geometry, color) {
    if (!geometry) return;

    target.append(
      svgElement('circle', {
        cx: geometry.centerX,
        cy: geometry.centerY,
        r: 4,
        fill: color,
        stroke: '#151d23',
        'stroke-width': 2,
        'vector-effect': 'non-scaling-stroke'
      })
    );
  }

  function drawGridCell(point, color) {
    const cell = gridGeometry(point);

    if (!cell) return;

    gridOverlay.append(
      svgElement('rect', {
        x: cell.x + 3,
        y: cell.y + 3,
        width: Math.max(0, cell.width - 6),
        height: Math.max(0, cell.height - 6),
        rx: 4,
        fill: color,
        'fill-opacity': 0.14,
        stroke: color,
        'stroke-width': 3
      })
    );

    drawPoint(gridOverlay, cell, color);
  }

  function drawIsoCell(scene, point, color) {
    const cell = isoGeometry(scene, point);

    if (!cell) return;

    if (cell.points) {
      isoOverlay.append(
        svgElement('polygon', {
          points: cell.points,
          fill: color,
          'fill-opacity': 0.14,
          stroke: color,
          'stroke-width': 3,
          'stroke-linejoin': 'round',
          'vector-effect': 'non-scaling-stroke'
        })
      );
    }

    drawPoint(isoOverlay, cell, color);
  }

  function drawGrid() {
    if (!board.contains(gridOverlay)) {
      board.append(gridOverlay);
    }

    gridOverlay.replaceChildren();

    gridOverlay.setAttribute(
      'viewBox',
      `0 0 ${Math.max(1, board.clientWidth)} ` +
      `${Math.max(1, board.clientHeight)}`
    );

    if (start && end) {
      drawLine(
        gridOverlay,
        gridGeometry(start),
        gridGeometry(end)
      );
    }

    if (start) drawGridCell(start, '#ffe09c');
    if (end) drawGridCell(end, '#8ee5f0');
  }

  function drawIso() {
    const scene = boardScroll.querySelector('.vt-iso-scene');

    if (!scene) return;

    if (!scene.contains(isoOverlay)) {
      scene.append(isoOverlay);
    }

    isoOverlay.replaceChildren();

    if (start && end) {
      drawLine(
        isoOverlay,
        isoGeometry(scene, start),
        isoGeometry(scene, end)
      );
    }

    if (start) drawIsoCell(scene, start, '#ffe09c');
    if (end) drawIsoCell(scene, end, '#8ee5f0');
  }

  function draw() {
    drawGrid();
    drawIso();
  }

  function refresh() {
    // Как прежде: завершённое измерение остаётся
    // видимым после переключения инструмента.
    panel.hidden = !enabled && !start;
    panel.style.display = panel.hidden ? 'none' : '';

    clearButton.disabled = !start && !end;

    if (!start) {
      result.textContent = enabled
        ? 'Выберите начальную клетку. Это не игровая дальность.'
        : 'Измерение не задано.';
    } else if (!end) {
      result.textContent =
        `Начало: ${label(start)}.` +
        (enabled ? ' Выберите конечную клетку.' : '');
    } else {
      result.textContent =
        `${label(start)} → ${label(end)} · ` +
        `по столбцам: ${Math.abs(end.x - start.x)}, ` +
        `по строкам: ${Math.abs(end.y - start.y)}. ` +
        'Это не игровая дальность.';
    }

    draw();
  }

  function clearMeasurement() {
    start = null;
    end = null;
    refresh();
  }

  updateView = refresh;

  clearButton.addEventListener('click', clearMeasurement);

  // Единственный обработчик выбора точек.
  // Изометрия вызывает настоящую кнопку клетки,
  // а этот capture-обработчик останавливает её
  // до игровых обработчиков index.js.
  board.addEventListener('click', event => {
    if (!enabled) return;

    const cell = event.target instanceof Element
      ? event.target.closest('button[data-x][data-y]')
      : null;

    if (!cell || !board.contains(cell)) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const point = {
      x: Number(cell.dataset.x),
      y: Number(cell.dataset.y)
    };

    if (
      !Number.isInteger(point.x) ||
      !Number.isInteger(point.y) ||
      point.x < 0 ||
      point.x >= 14 ||
      point.y < 0 ||
      point.y >= 14
    ) {
      return;
    }

    if (!start || end) {
      start = point;
      end = null;
    } else {
      end = point;
    }

    refresh();
  }, true);

  // Работает и при фокусе на сетке, и на SVG-клетке.
  // Не перехватывает Escape вне области карты.
  boardScroll.addEventListener('keydown', event => {
    if (
      !enabled ||
      event.key !== 'Escape' ||
      event.defaultPrevented ||
      event.isComposing ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    ) {
      return;
    }

    const target = event.target;

    if (
      target instanceof Element &&
      target.closest('input, textarea, select, [contenteditable="true"]')
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    clearMeasurement();
  }, true);

  // renderBoard() и draw() изометрии пересоздают содержимое.
  // Восстанавливаем слой только если он действительно удалён.
  // Собственные изменения слоя не запускают цикл перерисовки.
  new MutationObserver(() => {
    const scene = boardScroll.querySelector('.vt-iso-scene');

    const gridMissing = !board.contains(gridOverlay);
    const isoMissing = scene && !scene.contains(isoOverlay);

    if (gridMissing || isoMissing) {
      draw();
    }
  }).observe(boardScroll, {
    childList: true,
    subtree: true
  });

  if ('ResizeObserver' in window) {
    new ResizeObserver(draw).observe(board);
  } else {
    window.addEventListener('resize', draw);
  }

  document.getElementById('vt-zoom')
    ?.addEventListener('input', draw);

  refresh();
}