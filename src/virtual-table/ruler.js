// src/virtual-table/ruler.js
//
// Геометрическая линейка.
// Не рассчитывает игровую дальность.

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
  panel.className = 'vt-field-toolbar';
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

  const overlay = document.createElementNS(SVG_NS, 'svg');

  overlay.setAttribute('aria-hidden', 'true');
  overlay.setAttribute('focusable', 'false');

  Object.assign(overlay.style, {
    position: 'absolute',
    left: '0',
    top: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: '10',
    overflow: 'visible'
  });

  board.style.position = 'relative';

  function label(point) {
    return `${LETTERS[point.x]}${point.y + 1}`;
  }

  function geometry(point) {
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

  function svgElement(name, attributes) {
    const element = document.createElementNS(SVG_NS, name);

    for (const [key, value] of Object.entries(attributes)) {
      element.setAttribute(key, String(value));
    }

    return element;
  }

  function drawCell(point, color) {
    const cell = geometry(point);
    if (!cell) return;

    overlay.append(
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
      }),
      svgElement('circle', {
        cx: cell.centerX,
        cy: cell.centerY,
        r: 4,
        fill: color,
        stroke: '#15151d',
        'stroke-width': 2
      })
    );
  }

  function draw() {
    if (!board.contains(overlay)) {
      board.append(overlay);
    }

    overlay.replaceChildren();

    overlay.setAttribute(
      'viewBox',
      `0 0 ${Math.max(1, board.clientWidth)} ${Math.max(1, board.clientHeight)}`
    );

    if (start && end) {
      const first = geometry(start);
      const second = geometry(end);

      if (first && second) {
        const coordinates = {
          x1: first.centerX,
          y1: first.centerY,
          x2: second.centerX,
          y2: second.centerY,
          'stroke-linecap': 'round'
        };

        overlay.append(
          svgElement('line', {
            ...coordinates,
            stroke: '#11121a',
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
    }

    if (start) drawCell(start, '#ffe09c');
    if (end) drawCell(end, '#8ee5f0');
  }

  function refresh() {
    // Скрываем пустую панель результата вне режима измерения.
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

  updateView = refresh;

  clearButton.addEventListener('click', () => {
    start = null;
    end = null;
    refresh();
  });

  // Перехватываем только режим линейки.
  board.addEventListener('click', event => {
    if (!enabled) return;

    const cell = event.target.closest('button[data-x][data-y]');
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

  // Escape не переключает инструмент незаметно:
  // очищает текущее измерение, оставляя режим линейки.
  board.addEventListener('keydown', event => {
    if (event.key === 'Escape' && enabled) {
      event.preventDefault();

      start = null;
      end = null;

      refresh();
    }
  });

  new MutationObserver(() => {
    if (!board.contains(overlay)) {
      draw();
    }
  }).observe(board, {
    childList: true
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