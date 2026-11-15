// src/virtual-table/online-route.js
//
// Личный черновик маршрута для локального и онлайн-стола.
//
// Не обращается к Firebase и браузерным сохранениям.
// Не перемещает модели и не изменяет фронт.
// Не рассчитывает стоимость или допустимость движения.
//
// Необязательный current.getSurface({ x, y }):
// возвращает { name, height }.
// Неизвестная высота — null, а не 0.
//
// Геометрия участков:
// линия проводится между центрами выбранных клеток.
// Касания углов и движение по границе выводятся отдельно.
// Они не включаются в цепочку перепадов высоты.
//
// showToggle:
// true — собственная кнопка;
// false — управление через внешнюю панель.
//
// onModeChange(enabled) сообщает об изменении режима.

const SIZE = 14;
const LETTERS = 'ABCDEFGHIJKLMN';
const SVG_NS = 'http://www.w3.org/2000/svg';
const EPSILON = 1e-9;

const FACING_ANGLES = Object.freeze({
  n: 0,
  e: 90,
  s: 180,
  w: 270
});

function node(tag, text = '', className = '') {
  const element = document.createElement(tag);
  element.textContent = text;

  if (className) {
    element.className = className;
  }

  return element;
}

function validPoint(point) {
  return Boolean(
    point &&
    Number.isInteger(point.x) &&
    Number.isInteger(point.y) &&
    point.x >= 0 &&
    point.x < SIZE &&
    point.y >= 0 &&
    point.y < SIZE
  );
}

function label(point) {
  return `${LETTERS[point.x]}${point.y + 1}`;
}

function samePoint(first, second) {
  return first.x === second.x && first.y === second.y;
}

function svgNode(tag, attributes) {
  const element = document.createElementNS(SVG_NS, tag);

  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, String(value));
  }

  return element;
}

/* ==========================================================================
   Направления и повороты
   ========================================================================== */

function segmentAngle(first, second) {
  const dx = second.x - first.x;
  const dy = second.y - first.y;

  return (
    Math.atan2(dx, -dy) * 180 / Math.PI + 360
  ) % 360;
}

function angleChange(previous, next) {
  let delta = (next - previous + 540) % 360 - 180;

  if (Math.abs(Math.abs(delta) - 180) < 0.001) {
    delta = 180;
  }

  return delta;
}

function turnDescription(delta) {
  const degrees = Math.abs(delta).toLocaleString('ru-RU', {
    maximumFractionDigits: 1
  });

  if (Math.abs(Math.abs(delta) - 180) < 0.001) {
    return 'разворот на 180°';
  }

  return delta > 0
    ? `вправо на ${degrees}°`
    : `влево на ${degrees}°`;
}

function describeRouteTurns(points, facing) {
  const result = [];

  let previous = Object.hasOwn(FACING_ANGLES, facing)
    ? FACING_ANGLES[facing]
    : null;

  for (let index = 1; index < points.length; index += 1) {
    const first = points[index - 1];
    const second = points[index];

    if (samePoint(first, second)) continue;

    const next = segmentAngle(first, second);

    if (previous !== null) {
      const delta = angleChange(previous, next);

      if (Math.abs(delta) > 0.001) {
        result.push({
          point: first,
          initial: index === 1,
          description: turnDescription(delta)
        });
      }
    }

    previous = next;
  }

  return result;
}

function renderTurns(container, points, current) {
  container.replaceChildren();

  if (points.length <= 1) {
    container.append(
      node(
        'p',
        'Добавьте точку маршрута, чтобы увидеть направление пути.',
        'vt-muted'
      )
    );

    return;
  }

  const changes = describeRouteTurns(points, current.facing);

  container.append(
    node(
      'strong',
      `Изменения направления на схеме: ${changes.length}`
    )
  );

  if (!Object.hasOwn(FACING_ANGLES, current.facing)) {
    container.append(
      node(
        'p',
        'Фронт не задан: первый участок не сравнивается ' +
        'с направлением модели.',
        'vt-muted'
      )
    );
  }

  if (!changes.length) {
    container.append(
      node(
        'p',
        'На сравниваемых участках направление не меняется.',
        'vt-muted'
      )
    );

    return;
  }

  const list = node('ol');

  for (const change of changes) {
    list.append(
      node(
        'li',
        `${label(change.point)} · ` +
        (change.initial ? 'от исходного фронта: ' : '') +
        change.description
      )
    );
  }

  container.append(list);
}

/* ==========================================================================
   Геометрия прямого участка
   ========================================================================== */

// Пересечение отрезка с замкнутым квадратом клетки.
// Координаты центров клеток совпадают с их x/y.
// Границы клетки: x ± 0.5 и y ± 0.5.
//
// Возвращает интервал параметра t на отрезке [0, 1],
// либо null, если пересечения нет.
function cellIntersection(first, second, x, y) {
  const dx = second.x - first.x;
  const dy = second.y - first.y;

  let enter = 0;
  let exit = 1;

  const axes = [
    [first.x, dx, x - 0.5, x + 0.5],
    [first.y, dy, y - 0.5, y + 0.5]
  ];

  for (const [start, direction, min, max] of axes) {
    if (Math.abs(direction) < EPSILON) {
      if (
        start < min - EPSILON ||
        start > max + EPSILON
      ) {
        return null;
      }

      continue;
    }

    const firstT = (min - start) / direction;
    const secondT = (max - start) / direction;

    enter = Math.max(enter, Math.min(firstT, secondT));
    exit = Math.min(exit, Math.max(firstT, secondT));

    if (enter > exit + EPSILON) {
      return null;
    }
  }

  enter = Math.max(0, Math.min(1, enter));
  exit = Math.max(0, Math.min(1, exit));

  // Единственная точка пересечения: касание угла.
  if (exit - enter <= EPSILON) {
    return {
      x,
      y,
      enter,
      exit,
      kind: 'corner'
    };
  }

  const middle = (enter + exit) / 2;
  const middleX = first.x + dx * middle;
  const middleY = first.y + dy * middle;

  const inside =
    middleX > x - 0.5 + EPSILON &&
    middleX < x + 0.5 - EPSILON &&
    middleY > y - 0.5 + EPSILON &&
    middleY < y + 0.5 - EPSILON;

  return {
    x,
    y,
    enter,
    exit,
    kind: inside ? 'inside' : 'boundary'
  };
}

function traceSegment(first, second) {
  const crossed = [];
  const contacts = [];

  if (samePoint(first, second)) {
    return {
      crossed: [{ ...first }],
      contacts
    };
  }

  // Поле небольшое: проверяем все 196 клеток.
  // Это позволяет явно отличать внутреннее пересечение
  // от касания угла, не выбирая одну из соседних клеток.
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const hit = cellIntersection(first, second, x, y);

      if (!hit) continue;

      if (hit.kind === 'inside') {
        crossed.push(hit);
      } else {
        contacts.push(hit);
      }
    }
  }

  const byPosition = (a, b) =>
    a.enter - b.enter ||
    a.exit - b.exit ||
    a.y - b.y ||
    a.x - b.x;

  crossed.sort(byPosition);
  contacts.sort(byPosition);

  return { crossed, contacts };
}

/* ==========================================================================
   Высоты и таблицы
   ========================================================================== */

function readSurface(current, point) {
  if (typeof current.getSurface !== 'function') {
    return {
      name: 'Данные не подключены',
      height: null
    };
  }

  try {
    const surface = current.getSurface({
      x: point.x,
      y: point.y
    });

    return {
      name: String(surface?.name || 'Неизвестно'),
      height: Number.isSafeInteger(surface?.height)
        ? surface.height
        : null
    };
  } catch {
    // Ошибка чтения не должна выглядеть как нулевая высота.
    return {
      name: 'Ошибка чтения местности',
      height: null
    };
  }
}

function describeHeightDifference(previous, height) {
  if (previous === null || height === null) {
    return 'Не определён';
  }

  const delta = height - previous;

  if (!Number.isSafeInteger(delta)) {
    return 'Вне точного диапазона';
  }

  if (delta > 0) return `Подъём +${delta}`;
  if (delta < 0) return `Спуск −${Math.abs(delta)}`;

  return 'Один уровень';
}

function appendTable(container, captionText, headers, rows) {
  const scroll = node('div', '', 'vt-route-height-scroll');
  const table = node('table', '', 'vt-route-height-table');
  const caption = node('caption', captionText);
  const head = node('thead');
  const header = node('tr');
  const body = node('tbody');

  for (const title of headers) {
    const cell = node('th', title);
    cell.scope = 'col';
    header.append(cell);
  }

  for (const values of rows) {
    const row = node('tr');

    for (const value of values) {
      row.append(node('td', String(value)));
    }

    body.append(row);
  }

  head.append(header);
  table.append(caption, head, body);
  scroll.append(table);
  container.append(scroll);
}

function heightRows(points, current) {
  let previousHeight = null;
  let unknown = 0;

  const rows = points.map((point, index) => {
    const surface = readSurface(current, point);

    if (surface.height === null) {
      unknown += 1;
    }

    const difference = index === 0
      ? 'Начало'
      : describeHeightDifference(
          previousHeight,
          surface.height
        );

    // Не соединяем известные высоты через неизвестную клетку.
    previousHeight = surface.height;

    return [
      label(point),
      surface.name,
      surface.height === null ? '—' : surface.height,
      difference
    ];
  });

  return { rows, unknown };
}

function renderRouteHeights(container, points, current) {
  container.replaceChildren();
  container.append(node('strong', 'Высоты точек маршрута'));

  if (typeof current.getSurface !== 'function') {
    container.append(
      node(
        'p',
        'Для этого режима данные высот не подключены. ' +
        'Неизвестная высота не считается нулевой.',
        'vt-muted'
      )
    );

    return;
  }

  const { rows } = heightRows(points, current);

  appendTable(
    container,
    'Высоты выбранных точек и перепады между ними',
    ['Точка', 'Местность', 'Высота', 'Перепад'],
    rows
  );

  container.append(
    node(
      'p',
      'Здесь сравниваются только выбранные точки. ' +
      'Промежуточные клетки показаны в отдельном разделе ниже. ' +
      'Клетка без тайла имеет неизвестную высоту.',
      'vt-muted'
    )
  );
}

function renderRouteCells(container, points, current) {
  container.replaceChildren();

  if (points.length < 2) {
    container.append(
      node(
        'p',
        'Добавьте точку маршрута, чтобы увидеть клетки участка.',
        'vt-muted'
      )
    );

    return;
  }

  container.append(
    node(
      'p',
      'Клетки перечислены по ходу прямой между центрами точек. ' +
      'Касания углов и движение по границе вынесены отдельно. ' +
      'Это не проверка проходимости и не стоимость движения.',
      'vt-muted'
    )
  );

  if (typeof current.getSurface !== 'function') {
    container.append(
      node(
        'p',
        'Данные местности не подключены: показана только ' +
        'геометрия. Высоты остаются неизвестными.',
        'vt-route-warning'
      )
    );
  }

  for (let index = 1; index < points.length; index += 1) {
    const first = points[index - 1];
    const second = points[index];
    const { crossed, contacts } = traceSegment(first, second);

    const section = node(
      'section',
      '',
      'vt-route-segment'
    );

    section.append(
      node(
        'h3',
        `Участок ${index}: ${label(first)} → ${label(second)}`
      )
    );

    const { rows, unknown } = heightRows(crossed, current);

    appendTable(
      section,
      'Клетки, через внутреннюю часть которых проходит линия',
      ['Клетка', 'Местность', 'Высота', 'Перепад'],
      rows
    );

    if (unknown > 0) {
      section.append(
        node(
          'p',
          `Клеток с неизвестной высотой на участке: ${unknown}. ` +
          'Полный профиль высоты определить нельзя.',
          'vt-route-warning'
        )
      );
    }

    if (contacts.length > 0) {
      section.append(
        node(
          'p',
          'Касания перечислены отдельно и не включены ' +
          'в цепочку перепадов. Их игровое значение ' +
          'определяют участники.',
          'vt-muted'
        )
      );

      const contactRows = contacts.map(contact => {
        const surface = readSurface(current, contact);

        return [
          label(contact),
          contact.kind === 'corner'
            ? 'Касание угла'
            : 'По границе',
          surface.name,
          surface.height === null ? '—' : surface.height
        ];
      });

      appendTable(
        section,
        'Касания: клетки в одной точке касания равноправны',
        ['Клетка', 'Контакт', 'Местность', 'Высота'],
        contactRows
      );

      const unknownContacts = contactRows.filter(
        row => row[3] === '—'
      ).length;

      if (unknownContacts > 0) {
        section.append(
          node(
            'p',
            'Среди клеток касания также есть неизвестные высоты: ' +
            `${unknownContacts}.`,
            'vt-route-warning'
          )
        );
      }
    } else {
      section.append(
        node(
          'p',
          'Отдельных касаний углов или движения по границе нет.',
          'vt-muted'
        )
      );
    }

    container.append(section);
  }
}

/* ==========================================================================
   Панель маршрута
   ========================================================================== */

export function createOnlineRoute({
  board,
  toolbar,
  boardScroll,
  getContext,
  showToggle = true,
  onModeChange = () => {}
}) {
  if (!board || !toolbar || !boardScroll) {
    throw new Error('Маршрут: не найдены элементы поля.');
  }

  if (typeof getContext !== 'function') {
    throw new Error('Маршрут: не задан источник выбранной модели.');
  }

  installStyles();

  let enabled = false;
  let destroyed = false;
  let origin = null;
  let points = [];
  let frame = null;
  let reportedEnabled = false;

  const toggle = node('button', 'Маршрут', 'builder-action-btn');
  toggle.type = 'button';
  toggle.hidden = !showToggle;
  toggle.setAttribute('aria-pressed', 'false');
  toggle.title =
    'Построить личный черновик пути без перемещения модели';

  toolbar.append(toggle);

  const panel = node('section', '', 'vt-online-route-panel');
  panel.setAttribute('aria-label', 'Черновик маршрута');

  const actions = node('div', '', 'vt-online-route-actions');
  const undo = node('button', 'Убрать точку', 'builder-action-btn');
  const clear = node('button', 'Очистить', 'builder-action-btn');
  const finish = node('button', 'Завершить', 'builder-action-btn');

  for (const button of [undo, clear, finish]) {
    button.type = 'button';
  }

  const status = node('p', '', 'vt-online-route-status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  const turns = node('div', '', 'vt-route-turns');

  const heights = node('details', '', 'vt-route-heights');
  const heightsSummary = node('summary', 'Высоты точек');
  const heightsContent = node(
    'div',
    '',
    'vt-route-heights-content'
  );

  heights.append(heightsSummary, heightsContent);

  const cells = node('details', '', 'vt-route-heights');
  const cellsSummary = node('summary', 'Клетки вдоль участков');
  const cellsContent = node(
    'div',
    '',
    'vt-route-heights-content'
  );

  cells.append(cellsSummary, cellsContent);

  const explanation = node(
    'p',
    'Нажимайте клетки по порядку. Золотая заливка — линия ' +
    'проходит через внутреннюю часть клетки. Голубой пунктир — ' +
    'только касание угла или движение по границе. ' +
    'Если разные участки и пересекают клетку, и касаются её, ' +
    'на поле показана золотая заливка; подробности — в таблице. ' +
    'Это геометрия, не разрешение прохода. Стоимость действий ' +
    'и препятствия не рассчитываются. ' +
    'Фронт и позиция модели не изменяются.',
    'vt-muted'
  );

  actions.append(undo, clear, finish);
  panel.append(
    actions,
    status,
    turns,
    heights,
    cells,
    explanation
  );

  boardScroll.before(panel);

  const overlay = document.createElementNS(SVG_NS, 'svg');
  overlay.classList.add('vt-online-route-overlay');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.setAttribute('focusable', 'false');

  function context() {
    const current = getContext();

    return current && validPoint(current.position)
      ? current
      : null;
  }

  function signature(current) {
    return JSON.stringify([
      current.key,
      current.position.x,
      current.position.y,
      current.facing || null
    ]);
  }

  function stop() {
    enabled = false;
    origin = null;
    points = [];
  }

  function center(point) {
    const cell = board.querySelector(
      `button[data-x="${point.x}"][data-y="${point.y}"]`
    );

    if (!cell) return null;

    const cellRect = cell.getBoundingClientRect();
    const boardRect = board.getBoundingClientRect();

    return {
      x:
        cellRect.left -
        boardRect.left -
        board.clientLeft +
        cellRect.width / 2,

      y:
        cellRect.top -
        boardRect.top -
        board.clientTop +
        cellRect.height / 2,

            width: cellRect.width,
      height: cellRect.height,

      radius: Math.max(
        4,
        Math.min(8, cellRect.width * 0.16)
      )
    };
  }

    function drawRouteCells() {
    const crossed = new Map();
    const contacts = new Map();

    function key(point) {
      return `${point.x}:${point.y}`;
    }

    for (let index = 1; index < points.length; index += 1) {
      const segment = traceSegment(
        points[index - 1],
        points[index]
      );

      for (const point of segment.crossed) {
        crossed.set(key(point), point);
      }

      for (const point of segment.contacts) {
        contacts.set(key(point), point);
      }
    }

    // Если клетка пересекается внутренней частью хотя бы
    // одного участка, показываем её как пересечённую.
    // Касания каждого отдельного участка остаются в таблице.
    for (const cellKey of crossed.keys()) {
      contacts.delete(cellKey);
    }

    function appendCell(point, contactOnly) {
      const geometry = center(point);

      if (!geometry) return;

      const inset = Math.min(
        3,
        geometry.width / 8,
        geometry.height / 8
      );

      overlay.append(
        svgNode('rect', {
          x: geometry.x - geometry.width / 2 + inset,
          y: geometry.y - geometry.height / 2 + inset,
          width: Math.max(1, geometry.width - inset * 2),
          height: Math.max(1, geometry.height - inset * 2),
          rx: 3,

          fill: contactOnly ? 'none' : '#eed09b',
          'fill-opacity': contactOnly ? 0 : 0.16,

          stroke: contactOnly ? '#8ee5f0' : '#eed09b',
          'stroke-opacity': contactOnly ? 0.9 : 0.55,
          'stroke-width': contactOnly ? 2 : 1,
          'stroke-dasharray': contactOnly ? '4 3' : 'none'
        })
      );
    }

    // Сначала рисуем клетки, затем основная draw()
    // поверх них добавит линию и точки маршрута.
    for (const point of crossed.values()) {
      appendCell(point, false);
    }

    for (const point of contacts.values()) {
      appendCell(point, true);
    }
  }

  function draw() {
    overlay.replaceChildren();

    if (!enabled || !points.length) {
      overlay.remove();
      return;
    }

    if (!board.contains(overlay)) {
      board.append(overlay);
    }

    overlay.setAttribute(
      'viewBox',
      `0 0 ${Math.max(1, board.clientWidth)} ` +
      `${Math.max(1, board.clientHeight)}`
    );

    const geometry = points.map(center);

    if (geometry.some(point => !point)) return;

    drawRouteCells();

    if (geometry.length > 1) {
      const coordinates = geometry
        .map(point => `${point.x},${point.y}`)
        .join(' ');

      overlay.append(
        svgNode('polyline', {
          points: coordinates,
          fill: 'none',
          stroke: '#11121a',
          'stroke-width': 7,
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round'
        }),

        svgNode('polyline', {
          points: coordinates,
          fill: 'none',
          stroke: '#eed09b',
          'stroke-width': 3,
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round'
        })
      );
    }

    geometry.forEach((point, index) => {
      const last = index === geometry.length - 1;

      const color = index === 0
        ? '#eed09b'
        : last
          ? '#8ee5f0'
          : '#eee5d4';

      overlay.append(
        svgNode('circle', {
          cx: point.x,
          cy: point.y,
          r: point.radius,
          fill: color,
          stroke: '#15151d',
          'stroke-width': 2
        })
      );

      if (index > 0) {
        const text = svgNode('text', {
          x: point.x,
          y: point.y - point.radius - 5,
          fill: color,
          stroke: '#11121a',
          'stroke-width': 3,
          'paint-order': 'stroke',
          'text-anchor': 'middle',
          'font-size': 12,
          'font-weight': 700
        });

        text.textContent = String(index);
        overlay.append(text);
      }
    });
  }

  function scheduleDraw() {
    if (destroyed || frame !== null) return;

    frame = requestAnimationFrame(() => {
      frame = null;

      if (!destroyed) {
        draw();
      }
    });
  }

  // Содержимое закрытых разделов не строим:
  // длинный маршрут не должен без необходимости
  // пересоздавать все таблицы при каждом обновлении.
  function renderOpenDetails(current) {
    if (heights.open) {
      renderRouteHeights(heightsContent, points, current);
    } else {
      heightsContent.replaceChildren();
    }

    if (cells.open) {
      renderRouteCells(cellsContent, points, current);
    } else {
      cellsContent.replaceChildren();
    }
  }

  function refresh() {
    if (destroyed) return;

    const current = context();

    // При смене модели, её позиции или фронта
    // прежний черновик становится неактуальным.
    if (
      enabled &&
      (!current || signature(current) !== origin)
    ) {
      stop();
    }

    toggle.disabled = !current;
    toggle.classList.toggle('primary', enabled);
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.textContent = enabled
      ? 'Маршрут включён'
      : 'Маршрут';

    panel.hidden = !enabled;
    board.classList.toggle('vt-online-route-mode', enabled);

    undo.disabled = points.length <= 1;
    clear.disabled = points.length <= 1;

    if (enabled && current) {
      const destination = points[points.length - 1];

      status.textContent =
        `${current.label} · начало ${label(points[0])} · ` +
        `фронт: ${current.facingText || 'не задан'} · ` +
        `конец ${label(destination)} · ` +
        `участков: ${points.length - 1}. ` +
        'Это не стоимость движения.';

      renderTurns(turns, points, current);
      renderOpenDetails(current);
    } else {
      status.textContent = '';
      turns.replaceChildren();
      heightsContent.replaceChildren();
      cellsContent.replaceChildren();
    }

    // Поле может быть пересоздано основным столом.
    draw();
    scheduleDraw();

    if (reportedEnabled !== enabled) {
      reportedEnabled = enabled;
      onModeChange(enabled);
    }
  }

  function setEnabled(value) {
    if (destroyed) return;

    const next = Boolean(value);

    if (!next) {
      stop();
    } else if (!enabled) {
      const current = context();

      if (!current) {
        refresh();
        return;
      }

      enabled = true;
      origin = signature(current);
      points = [{
        x: current.position.x,
        y: current.position.y
      }];
    }

    refresh();
  }

  toggle.addEventListener('click', () => {
    setEnabled(!enabled);
  });

  undo.addEventListener('click', () => {
    if (points.length > 1) {
      points.pop();
    }

    refresh();
  });

  clear.addEventListener('click', () => {
    if (points.length) {
      points = [points[0]];
    }

    refresh();
  });

  finish.addEventListener('click', () => {
    setEnabled(false);
  });

  function handleDetailsToggle() {
    if (!destroyed && enabled) {
      refresh();
    }
  }

  heights.addEventListener('toggle', handleDetailsToggle);
  cells.addEventListener('toggle', handleDetailsToggle);

  function handleClick(event) {
    if (!enabled) return;

    const target = event.target instanceof Element
      ? event.target
      : null;

    const cell = target?.closest('button[data-x][data-y]');

    if (!cell || !board.contains(cell)) return;

    // Не передаём клик обычному обработчику поля:
    // не перемещаем модель и не редактируем ландшафт.
    event.preventDefault();
    event.stopImmediatePropagation();

    const current = context();

    if (!current || signature(current) !== origin) {
      stop();
      refresh();
      return;
    }

    const point = {
      x: Number(cell.dataset.x),
      y: Number(cell.dataset.y)
    };

    if (!validPoint(point)) return;

    const previous = points[points.length - 1];

    if (!samePoint(previous, point)) {
      points.push(point);
    }

    refresh();
  }

  function handleKeydown(event) {
    if (!enabled || event.key !== 'Escape') return;

    event.preventDefault();
    event.stopImmediatePropagation();

    setEnabled(false);

    const focusTarget = showToggle
      ? toggle
      : document.querySelector('[data-field-tool="route"]');

    focusTarget?.focus({ preventScroll: true });
  }

  board.addEventListener('click', handleClick, true);
  document.addEventListener('keydown', handleKeydown, true);
  window.addEventListener('resize', scheduleDraw);

  const zoom = document.getElementById('vt-zoom');
  zoom?.addEventListener('input', scheduleDraw);

  const observer = 'ResizeObserver' in window
    ? new ResizeObserver(scheduleDraw)
    : null;

  observer?.observe(board);
  observer?.observe(boardScroll);

  refresh();

  return {
    refresh,

    isEnabled() {
      return enabled;
    },

    setEnabled,

    destroy() {
      if (destroyed) return;

      stop();
      refresh();
      destroyed = true;

      if (frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
      }

      observer?.disconnect();

      board.removeEventListener('click', handleClick, true);
      document.removeEventListener(
        'keydown',
        handleKeydown,
        true
      );
      window.removeEventListener('resize', scheduleDraw);
      zoom?.removeEventListener('input', scheduleDraw);

      heights.removeEventListener(
        'toggle',
        handleDetailsToggle
      );
      cells.removeEventListener(
        'toggle',
        handleDetailsToggle
      );

      board.classList.remove('vt-online-route-mode');

      toggle.remove();
      panel.remove();
      overlay.remove();
    }
  };
}

/* ==========================================================================
   Оформление
   ========================================================================== */

function installStyles() {
  const id = 'vt-online-route-styles';

  if (document.getElementById(id)) return;

  const style = document.createElement('style');
  style.id = id;

  style.textContent = `
    .vt-page #vt-board {
      position: relative;
    }

    .vt-page .vt-online-route-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 10;
      overflow: visible;
      pointer-events: none;
    }

    .vt-page .vt-online-route-panel {
      flex: 0 0 auto;
      min-width: 0;
      padding: 9px;
      background: #19171f;
      border-bottom: 1px solid #65513c;
    }

    .vt-page .vt-online-route-panel[hidden] {
      display: none !important;
    }

    .vt-page .vt-online-route-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .vt-page
      .vt-online-route-actions .builder-action-btn {
      min-height: 34px;
      padding: 6px 9px;
      font-size: .73rem;
    }

    .vt-page .vt-online-route-status {
      margin: 9px 0 0;
      color: #eed09b;
      font-size: .76rem;
      line-height: 1.5;
      font-variant-numeric: tabular-nums;
    }

    .vt-page .vt-online-route-panel > .vt-muted {
      margin: 6px 0 0;
      font-size: .71rem;
      line-height: 1.45;
    }

    .vt-page .vt-online-route-mode .vt-cell {
      cursor: crosshair;
    }

    .vt-page .vt-online-route-mode .vt-cell:hover {
      outline: 2px dashed #eed09b;
      outline-offset: -3px;
    }

    .vt-page .vt-route-turns {
      max-height: 150px;
      margin-top: 8px;
      padding: 9px 10px;
      overflow-y: auto;
      overscroll-behavior: contain;
      color: #ddd3e3;
      background: #14131b;
      border: 1px solid #403747;
      border-radius: 6px;
      font-size: .73rem;
      line-height: 1.5;
    }

    .vt-page .vt-route-turns > strong,
    .vt-page .vt-route-heights-content > strong {
      color: #d8bf92;
      font-size: .74rem;
    }

    .vt-page .vt-route-turns > p {
      margin: 5px 0 0;
      font-size: .71rem;
    }

    .vt-page .vt-route-turns > ol {
      margin: 7px 0 0;
      padding-left: 22px;
    }

    .vt-page .vt-route-turns li + li {
      margin-top: 4px;
    }

    .vt-page .vt-route-heights {
      min-width: 0;
      margin-top: 8px;
      color: #ddd3e3;
      background: #14131b;
      border: 1px solid #403747;
      border-radius: 6px;
      font-size: .73rem;
    }

    .vt-page .vt-route-heights > summary {
      padding: 10px;
      color: #d8bf92;
      cursor: pointer;
    }

    .vt-page .vt-route-heights-content {
      max-height: 320px;
      min-width: 0;
      padding: 0 10px 10px;
      overflow: auto;
      overscroll-behavior: contain;
    }

    .vt-page .vt-route-heights-content > p,
    .vt-page .vt-route-segment > p {
      margin: 8px 0 0;
      font-size: .71rem;
      line-height: 1.45;
    }

    .vt-page .vt-route-height-scroll {
      max-height: 180px;
      margin-top: 8px;
      overflow: auto;
      overscroll-behavior: contain;
    }

    .vt-page .vt-route-height-table {
      width: 100%;
      border-collapse: collapse;
      font-size: .72rem;
      line-height: 1.4;
      font-variant-numeric: tabular-nums;
    }

    .vt-page .vt-route-height-table caption {
      padding-bottom: 7px;
      color: #b4b0bf;
      text-align: left;
      font-size: .69rem;
    }

    .vt-page .vt-route-height-table th,
    .vt-page .vt-route-height-table td {
      padding: 7px 8px;
      border-bottom: 1px solid #34303d;
      text-align: left;
      vertical-align: top;
    }

    .vt-page .vt-route-height-table th {
      color: #d8bf92;
      font-weight: 600;
    }

    .vt-page .vt-route-height-table td:first-child {
      color: #eee5d4;
      white-space: nowrap;
    }

    .vt-page .vt-route-segment {
      margin-top: 12px;
      padding-top: 10px;
      border-top: 1px solid #403747;
    }

    .vt-page .vt-route-segment > h3 {
      margin: 0;
      color: #eed09b;
      font-size: .76rem;
      line-height: 1.5;
    }

    .vt-page .vt-route-warning {
      color: #f0c58e;
    }

    @media (max-width: 1000px) {
      .vt-page
        .vt-online-route-actions .builder-action-btn {
        min-height: 44px;
      }

      .vt-page .vt-route-heights > summary {
        min-height: 44px;
        box-sizing: border-box;
      }
    }
  `;

  document.head.append(style);
}