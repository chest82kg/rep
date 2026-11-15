// src/virtual-table/local-route.js
//
// Клеточный черновик маршрута локального стола.
//
// Дальний щелчок по ряду или столбцу добавляет все
// промежуточные клетки. Каждый переход — через общую сторону.
//
// Не перемещает модели, не меняет фронт и сохранения.
// Движение используется только для сравнения длины.
// Допустимость, препятствия и стоимость не рассчитываются.
//
// Сетка и изометрия используют один массив клеток пути.

const NS = 'http://www.w3.org/2000/svg';
const LETTERS = 'ABCDEFGHIJKLMN';

let tool = null;

export function isLocalRouteEnabled() {
  return tool?.isEnabled() || false;
}

export function setLocalRouteEnabled(value) {
  tool?.setEnabled(Boolean(value));
}

export function refreshLocalRoute() {
  tool?.refresh();
}

function element(tag, text = '', className = '') {
  const result = document.createElement(tag);
  result.textContent = text;
  result.className = className;
  return result;
}

function svg(tag, attributes = {}) {
  const result = document.createElementNS(NS, tag);

  for (const [key, value] of Object.entries(attributes)) {
    result.setAttribute(key, String(value));
  }

  return result;
}

function validPoint(point) {
  return Boolean(
    point &&
    Number.isInteger(point.x) &&
    Number.isInteger(point.y) &&
    point.x >= 0 &&
    point.x < 14 &&
    point.y >= 0 &&
    point.y < 14
  );
}

function label(point) {
  return `${LETTERS[point.x]}${point.y + 1}`;
}

function routeButton() {
  return document.querySelector(
    'button[data-field-tool="route"]'
  );
}

function visibleDialogExists() {
  return [
    ...document.querySelectorAll(
      'dialog[open], [role="dialog"], [aria-modal="true"]'
    )
  ].some(dialog => {
    const style = getComputedStyle(dialog);

    return dialog.getClientRects().length > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden';
  });
}

export function initLocalRoute({ getContext }) {
  if (tool) return;

  const board = document.getElementById('vt-board');
  const field = document.querySelector('.vt-field-panel');
  const scroll = field?.querySelector('.vt-board-scroll');

  if (!board || !field || !scroll) {
    throw new Error('Локальный маршрут: не найдены элементы поля.');
  }

  if (typeof getContext !== 'function') {
    throw new Error('Локальный маршрут: не задан контекст модели.');
  }

  let enabled = false;
  let origin = null;
  let points = [];
  let notice = '';
  let frame = null;

  const panel = element('section', '', 'vt-cell-route-panel');
  panel.setAttribute('aria-label', 'Клеточный маршрут');

  const actions = element('div', '', 'vt-cell-route-actions');

  function button(text) {
    const result = element('button', text, 'builder-action-btn');
    result.type = 'button';
    return result;
  }

  const undo = button('Убрать участок');
  undo.title =
    'Убрать последний прямой участок до предыдущего поворота.';

  const clear = button('Очистить');
  clear.title = 'Оставить только исходную клетку модели.';

  const finish = button('Закрыть маршрут');
  finish.title =
    'Закрыть черновик без перемещения модели ' +
    'и без изменения её активации.';

  actions.append(undo, clear, finish);

  const status = element('p', '', 'vt-cell-route-status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  const details = element('details');
  const summary = element('summary', 'Клетки и высоты');
  const list = element('ol', '', 'vt-cell-route-list');
  list.start = 0;

  details.append(summary, list);
  panel.append(actions, status, details);
  panel.hidden = true;
  scroll.before(panel);

  const gridOverlay = svg('svg', {
    'aria-hidden': 'true',
    focusable: 'false'
  });

  Object.assign(gridOverlay.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    overflow: 'visible',
    zIndex: '10'
  });

  const isoOverlay = svg('g', {
    'aria-hidden': 'true',
    'pointer-events': 'none'
  });

  isoOverlay.style.pointerEvents = 'none';
  board.style.position = 'relative';

  function context() {
    const current = getContext();

    return current && validPoint(current.position)
      ? current
      : null;
  }

  function signature(current) {
    // Поворот не стирает черновик.
    // Смена модели или исходной клетки делает его неактуальным.
    return JSON.stringify([
      current.key,
      current.position.x,
      current.position.y
    ]);
  }

  function surface(current, point) {
    try {
      const value = current.getSurface?.({
        x: point.x,
        y: point.y
      });

      return {
        name: String(value?.name || 'Без данных местности'),
        height: Number.isSafeInteger(value?.height)
          ? value.height
          : null
      };
    } catch {
      return {
        name: 'Ошибка чтения местности',
        height: null
      };
    }
  }

  function gridGeometry(point) {
    const cell = board.querySelector(
      `button[data-x="${point.x}"][data-y="${point.y}"]`
    );

    if (!cell) return null;

    const rect = cell.getBoundingClientRect();
    const base = board.getBoundingClientRect();

    const x = rect.left - base.left - board.clientLeft;
    const y = rect.top - base.top - board.clientTop;

    return {
      x,
      y,
      width: rect.width,
      height: rect.height,
      cx: x + rect.width / 2,
      cy: y + rect.height / 2
    };
  }

  function isoGeometry(scene, point) {
    const polygon = scene.querySelector(
      `[data-iso-x="${point.x}"]` +
      `[data-iso-y="${point.y}"] .vt-iso-surface`
    );

    if (!polygon) return null;

    const box = polygon.getBBox();

    return {
      points: polygon.getAttribute('points'),
      cx: box.x + box.width / 2,
      cy: box.y + box.height / 2
    };
  }

  function paint(target, geometry, isIso) {
    target.replaceChildren();

    if (geometry.some(value => !value)) return;

    geometry.forEach((value, index) => {
      const last = index === geometry.length - 1;
      const color = last && index > 0 ? '#8ee5f0' : '#eed09b';

      const attributes = {
        fill: color,
        'fill-opacity': 0.15,
        stroke: color,
        'stroke-width': 2,
        'vector-effect': 'non-scaling-stroke'
      };

      if (isIso) {
        target.append(svg('polygon', {
          ...attributes,
          points: value.points
        }));
      } else {
        target.append(svg('rect', {
          ...attributes,
          x: value.x + 2,
          y: value.y + 2,
          width: Math.max(1, value.width - 4),
          height: Math.max(1, value.height - 4),
          rx: 3
        }));
      }
    });

    if (geometry.length > 1) {
      const coordinates = geometry
        .map(value => `${value.cx},${value.cy}`)
        .join(' ');

      for (const [color, width] of [
        ['#152025', 7],
        ['#eed09b', 3]
      ]) {
        target.append(svg('polyline', {
          points: coordinates,
          fill: 'none',
          stroke: color,
          'stroke-width': width,
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          'vector-effect': 'non-scaling-stroke'
        }));
      }
    }

    geometry.forEach((value, index) => {
      const last = index === geometry.length - 1;
      const color = last && index > 0 ? '#8ee5f0' : '#eed09b';

      target.append(svg('circle', {
        cx: value.cx,
        cy: value.cy,
        r: 4,
        fill: color,
        stroke: '#152025',
        'stroke-width': 1.5,
        'vector-effect': 'non-scaling-stroke'
      }));

      const number = svg('text', {
        x: value.cx,
        y: value.cy - 8,
        fill: color,
        stroke: '#152025',
        'stroke-width': 3,
        'paint-order': 'stroke',
        'text-anchor': 'middle',
        'font-size': 11,
        'font-weight': 700,
        'font-family': 'system-ui, sans-serif'
      });

      number.textContent = String(index);
      target.append(number);
    });
  }

  function draw() {
    if (!enabled || !points.length) {
      gridOverlay.remove();
      isoOverlay.remove();
      return;
    }

    const scene = scroll.querySelector('.vt-iso-scene');
    const host = scene?.closest('.vt-iso-host');

    if (scene && host && !host.hidden) {
      gridOverlay.remove();

      if (!scene.contains(isoOverlay)) {
        scene.append(isoOverlay);
      }

      paint(
        isoOverlay,
        points.map(point => isoGeometry(scene, point)),
        true
      );
    } else {
      isoOverlay.remove();

      if (!board.contains(gridOverlay)) {
        board.append(gridOverlay);
      }

      gridOverlay.setAttribute(
        'viewBox',
        `0 0 ${Math.max(1, board.clientWidth)} ` +
        `${Math.max(1, board.clientHeight)}`
      );

      paint(gridOverlay, points.map(gridGeometry), false);
    }
  }

  function scheduleDraw() {
    if (frame !== null) return;

    frame = requestAnimationFrame(() => {
      frame = null;
      draw();
    });
  }

  function renderList(current) {
    list.replaceChildren();

    if (!details.open || !current) return;

    let previous = null;

    points.forEach((point, index) => {
      const value = surface(current, point);
      let difference = '';

      if (index > 0) {
        if (previous === null || value.height === null) {
          difference = ' · перепад неизвестен';
        } else {
          const delta = value.height - previous;

          difference = !Number.isSafeInteger(delta)
            ? ' · перепад вне точного диапазона'
            : delta > 0
              ? ` · подъём +${delta}`
              : delta < 0
                ? ` · спуск ${delta}`
                : ' · один уровень';
        }
      }

      list.append(element(
        'li',
        `${label(point)} · ${value.name} · высота ` +
        `${value.height === null ? 'неизвестна' : value.height}` +
        difference
      ));

      previous = value.height;
    });
  }

  function refresh() {
    const current = context();

    if (
      enabled &&
      (!current || signature(current) !== origin)
    ) {
      setEnabled(false);
      return;
    }

    panel.hidden = !enabled;
    undo.disabled = points.length <= 1;
    clear.disabled = points.length <= 1;

    if (enabled && current) {
      const steps = points.length - 1;

      const movement =
        Number.isFinite(current.movement) &&
        current.movement >= 0
          ? current.movement
          : null;

      const exceeded = movement !== null && steps > movement;

      const format = value => value.toLocaleString('ru-RU', {
        maximumFractionDigits: 20
      });

      let comparison = 'Движение: не задано';

      if (movement !== null) {
        comparison = `Движение: ${format(movement)} · `;

        comparison += exceeded
          ? `Превышение: ${format(steps - movement)}`
          : `Осталось по длине: ${format(movement - steps)}`;
      }

      status.textContent =
        `${current.label} · ` +
        `Фронт: ${current.facingText || 'не задан'} · ` +
        `${label(points[0])} → ` +
        `${label(points[points.length - 1])} · ` +
        `Переходов: ${steps} · ${comparison}. ` +
        (
          notice ||
          'Нажмите конец участка в том же ряду или столбце. ' +
          'Фронт, повороты и условия движения проверяет игрок.'
        );

      status.style.color = exceeded ? '#f2a095' : '';

      status.title =
        'Сравнивается только число клеточных переходов ' +
        'с характеристикой «Движение». ' +
        'Местность, высоты, эффекты и допустимость прохода ' +
        'автоматически не рассчитываются. ' +
        'Остаток относится только к длине этого черновика, ' +
        'а не к сохранённому ресурсу модели.';

      renderList(current);
    } else {
      status.textContent = '';
      status.style.color = '';
      status.removeAttribute('title');
      list.replaceChildren();
    }

    draw();
    scheduleDraw();
  }

  function setEnabled(value) {
    const next = Boolean(value);

    if (next === enabled) {
      refresh();
      return;
    }

    if (next) {
      const current = context();
      if (!current) return;

      origin = signature(current);

      points = [{
        x: current.position.x,
        y: current.position.y
      }];
    } else {
      origin = null;
      points = [];
    }

    enabled = next;
    notice = '';

    refresh();

    document.dispatchEvent(new CustomEvent('vt:route-mode', {
      detail: { enabled }
    }));
  }

  board.addEventListener('click', event => {
    if (!enabled) return;

    const cell = event.target instanceof Element
      ? event.target.closest('button[data-x][data-y]')
      : null;

    if (!cell || !board.contains(cell)) return;

    // Не передаём клик обработчику перемещения модели.
    event.preventDefault();
    event.stopImmediatePropagation();

    const current = context();

    if (!current || signature(current) !== origin) {
      setEnabled(false);
      return;
    }

    const destination = {
      x: Number(cell.dataset.x),
      y: Number(cell.dataset.y)
    };

    if (!validPoint(destination)) return;

    const previous = points[points.length - 1];

    if (
      destination.x === previous.x &&
      destination.y === previous.y
    ) {
      return;
    }

    // Нажатие на пройденную клетку сокращает путь.
    let existingIndex = -1;

    for (let index = points.length - 2; index >= 0; index -= 1) {
      if (
        points[index].x === destination.x &&
        points[index].y === destination.y
      ) {
        existingIndex = index;
        break;
      }
    }

    if (existingIndex !== -1) {
      points = points.slice(0, existingIndex + 1);
      notice = '';
      refresh();
      return;
    }

    const dx = destination.x - previous.x;
    const dy = destination.y - previous.y;

    if (dx !== 0 && dy !== 0) {
      notice =
        'Выберите конец прямого участка в том же ряду ' +
        'или столбце. Промежуточные клетки добавятся сами.';

      refresh();
      return;
    }

    const stepX = Math.sign(dx);
    const stepY = Math.sign(dy);
    const distance = Math.abs(dx) + Math.abs(dy);

    for (let step = 1; step <= distance; step += 1) {
      points.push({
        x: previous.x + stepX * step,
        y: previous.y + stepY * step
      });
    }

    notice = '';
    refresh();
  }, true);

  undo.addEventListener('click', () => {
    if (points.length <= 1) return;

    const last = points[points.length - 1];
    const previous = points[points.length - 2];

    const directionX = last.x - previous.x;
    const directionY = last.y - previous.y;

    let startIndex = points.length - 2;

    while (startIndex > 0) {
      const current = points[startIndex];
      const before = points[startIndex - 1];

      const dx = current.x - before.x;
      const dy = current.y - before.y;

      if (dx !== directionX || dy !== directionY) break;

      startIndex -= 1;
    }

    points = points.slice(0, startIndex + 1);
    notice = '';
    refresh();
  });

  clear.addEventListener('click', () => {
    if (points.length) points = [points[0]];
    notice = '';
    refresh();
  });

  finish.addEventListener('click', () => setEnabled(false));
  details.addEventListener('toggle', refresh);

  document.addEventListener('keydown', event => {
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
      (
        target.closest('input, textarea, select, [role="textbox"]') ||
        (
          target instanceof HTMLElement &&
          target.isContentEditable
        )
      )
    ) {
      return;
    }

    if (visibleDialogExists()) return;

    // Даём карточке сначала закрыть её выбор направления.
    // Этот обработчик находится в capture-фазе документа.
    const hud = target instanceof Element
      ? target.closest('.vt-selected-hud')
      : null;

    if (
      hud?.querySelector(
        '[data-selected-command="facing-menu"][aria-expanded="true"]'
      )
    ) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    setEnabled(false);
    routeButton()?.focus({ preventScroll: true });
  }, true);

  // Восстанавливаем слой после пересоздания сетки или SVG.
  // Собственную перерисовку слоя не наблюдаем как причину
  // для новой перерисовки.
  new MutationObserver(records => {
    if (!enabled) return;

    const scene = scroll.querySelector('.vt-iso-scene');

    const relevant = records.some(record => {
      if (
        record.target === gridOverlay ||
        gridOverlay.contains(record.target) ||
        record.target === isoOverlay ||
        isoOverlay.contains(record.target)
      ) {
        return false;
      }

      if (record.type === 'attributes') return true;

      // Не запускаем ещё один кадр только из-за
      // собственного добавления или удаления overlay.
      const changed = [
        ...record.addedNodes,
        ...record.removedNodes
      ];

      if (
        changed.length > 0 &&
        changed.every(node =>
          node === gridOverlay || node === isoOverlay
        )
      ) {
        return false;
      }

      return record.target === board ||
        record.target === scene ||
        record.target === scroll;
    });

    if (relevant) scheduleDraw();
  }).observe(scroll, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['hidden', 'class']
  });

  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(scheduleDraw);
    observer.observe(board);
    observer.observe(scroll);
  }

  window.addEventListener('resize', scheduleDraw);

  document.getElementById('vt-zoom')
    ?.addEventListener('input', scheduleDraw);

  const style = document.createElement('style');

  style.textContent = `
    .vt-cell-route-panel {
      flex: 0 0 auto;
      min-width: 0;
      padding: 8px 10px;
      color: #ded8c9;
      background: #1b252b;
      border-bottom: 1px solid #776644;
    }

    .vt-cell-route-panel[hidden] {
      display: none !important;
    }

    .vt-cell-route-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .vt-cell-route-actions button {
      min-height: 34px;
      font-size: 0.75rem;
    }

    .vt-cell-route-status {
      margin: 7px 0;
      color: #eed09b;
      font-size: 0.76rem;
      line-height: 1.5;
    }

    .vt-cell-route-panel summary {
      color: #bfcac2;
      cursor: pointer;
      font-size: 0.75rem;
    }

    .vt-cell-route-list {
      max-height: 150px;
      margin: 8px 0 0;
      padding-left: 28px;
      overflow: auto;
      font-size: 0.75rem;
      line-height: 1.7;
      overscroll-behavior: contain;
    }
  `;

  document.head.append(style);

  tool = {
    isEnabled: () => enabled,
    setEnabled,
    refresh
  };

  refresh();
}