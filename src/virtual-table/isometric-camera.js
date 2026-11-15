// src/virtual-table/isometric-camera.js
//
// Камера SVG изометрического стола.
// Только представление: без сохранений и игровых действий.
//
// Управление:
// — колесо над картой: масштаб относительно указателя;
// — кнопки − / + / Вписать;
// — Alt + левая кнопка + перетаскивание: перемещение;
// — средняя кнопка + перетаскивание: перемещение.
//
// Ctrl/Cmd + колесо не перехватываем.
//
// bounds() обновляет размеры сцены без сброса камеры.

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

export function initIsometricCamera({ scene, toolbar }) {
  if (!scene || !toolbar) {
    throw new Error('Камера: не найдены сцена или панель.');
  }

  let base = {
    x: 0,
    y: 0,
    width: 980,
    height: 790
  };

  let zoom = 1;

  let center = {
    x: base.width / 2,
    y: base.height / 2
  };

  let drag = null;
  let suppressClickUntil = 0;

  const controls = document.createElement('span');

  controls.style.cssText =
    'display:inline-flex;align-items:center;gap:6px;';

  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', 'Камера изометрической карты');

  controls.innerHTML = `
    <button type="button"
      class="builder-action-btn"
      data-iso-camera="out"
      aria-label="Уменьшить изометрическую карту">
      −
    </button>

    <output aria-label="Масштаб изометрии">100%</output>

    <button type="button"
      class="builder-action-btn"
      data-iso-camera="in"
      aria-label="Увеличить изометрическую карту">
      +
    </button>

    <button type="button"
      class="builder-action-btn"
      data-iso-camera="fit">
      Вписать изометрию
    </button>
  `;

  controls.title =
    'Колесо над картой — масштаб. ' +
    'Средняя кнопка или Alt + перетаскивание — камера.';

  toolbar.append(controls);

  const output = controls.querySelector('output');
  const minus = controls.querySelector('[data-iso-camera="out"]');
  const plus = controls.querySelector('[data-iso-camera="in"]');

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function view() {
    const width = base.width / zoom;
    const height = base.height / zoom;

    return {
      x: center.x - width / 2,
      y: center.y - height / 2,
      width,
      height
    };
  }

  function constrainCenter() {
    const width = base.width / zoom;
    const height = base.height / zoom;

    center.x = clamp(
      center.x,
      base.x + width / 2,
      base.x + base.width - width / 2
    );

    center.y = clamp(
      center.y,
      base.y + height / 2,
      base.y + base.height - height / 2
    );
  }

  function apply() {
    constrainCenter();

    const current = view();

    scene.setAttribute(
      'viewBox',
      [
        current.x,
        current.y,
        current.width,
        current.height
      ].join(' ')
    );

    output.textContent = `${Math.round(zoom * 100)}%`;

    minus.disabled = zoom <= MIN_ZOOM;
    plus.disabled = zoom >= MAX_ZOOM;
  }

  function scenePoint(clientX, clientY) {
    const matrix = scene.getScreenCTM();

    if (!matrix) return null;

    try {
      const point = scene.createSVGPoint();

      point.x = clientX;
      point.y = clientY;

      return point.matrixTransform(matrix.inverse());
    } catch {
      return null;
    }
  }

  function changeZoom(nextZoom, anchor = null) {
    const previous = view();
    const next = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);

    if (next === zoom) return;

    if (anchor) {
      const relativeX =
        (anchor.x - previous.x) / previous.width;

      const relativeY =
        (anchor.y - previous.y) / previous.height;

      const width = base.width / next;
      const height = base.height / next;

      center = {
        x: anchor.x + (0.5 - relativeX) * width,
        y: anchor.y + (0.5 - relativeY) * height
      };
    }

    zoom = next;
    apply();
  }

  function fit() {
    zoom = MIN_ZOOM;

    center = {
      x: base.x + base.width / 2,
      y: base.y + base.height / 2
    };

    apply();
  }

  controls.addEventListener('click', event => {
    const button = event.target instanceof Element
      ? event.target.closest('[data-iso-camera]')
      : null;

    if (!button || button.disabled) return;

    const action = button.dataset.isoCamera;

    if (action === 'in') changeZoom(zoom * 1.25);
    if (action === 'out') changeZoom(zoom / 1.25);
    if (action === 'fit') fit();
  });

  scene.addEventListener('wheel', event => {
    // Сохраняем браузерное масштабирование, в том числе
    // жест pinch, который браузер может передавать как Ctrl + wheel.
    if (event.ctrlKey || event.metaKey) return;

    if (
      !Number.isFinite(event.deltaY) ||
      event.deltaY === 0
    ) {
      return;
    }

    // Колесо над сценой управляет только картой.
    // Даже на пределе масштаба не прокручиваем страницу.
    event.preventDefault();
    event.stopPropagation();

    if (drag) return;

    const anchor = scenePoint(event.clientX, event.clientY);

    if (!anchor) return;

    let delta = event.deltaY;

    if (event.deltaMode === 1) {
      delta *= 16;
    } else if (event.deltaMode === 2) {
      delta *= Math.max(100, scene.clientHeight);
    }

    // Плавное масштабирование для колеса и трекпада.
    const factor = Math.exp(
      -clamp(delta, -120, 120) * 0.003
    );

    changeZoom(zoom * factor, anchor);
  }, { passive: false });

  scene.addEventListener('pointerdown', event => {
    const middleButton = event.button === 1;
    const altLeftButton = event.button === 0 && event.altKey;

    if (
      drag ||
      event.ctrlKey ||
      event.metaKey ||
      (!middleButton && !altLeftButton)
    ) {
      return;
    }

    const matrix = scene.getScreenCTM();

    if (!matrix) return;

    let inverse;

    try {
      inverse = matrix.inverse();
    } catch {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      center: { ...center },
      inverse,
      previousCursor: scene.style.cursor
    };

    scene.style.cursor = 'grabbing';

    // Даже короткое Alt-нажатие не должно
    // превратиться в перемещение игровой модели.
    suppressClickUntil = performance.now() + 600;

    try {
      scene.setPointerCapture(event.pointerId);
    } catch {
      // Если захват недоступен, не оставляем камеру
      // в состоянии незавершённого перетаскивания.
      scene.style.cursor = drag.previousCursor;
      drag = null;
    }
  }, true);

  scene.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    // Матрица начала жеста предотвращает обратную связь
    // между изменением камеры и расчётом смещения.
    const shiftX =
      drag.inverse.a * dx + drag.inverse.c * dy;

    const shiftY =
      drag.inverse.b * dx + drag.inverse.d * dy;

    center = {
      x: drag.center.x - shiftX,
      y: drag.center.y - shiftY
    };

    apply();
  }, true);

  function finishDrag(event) {
    if (!drag) return;

    if (
      event &&
      event.pointerId !== undefined &&
      event.pointerId !== drag.pointerId
    ) {
      return;
    }

    const finished = drag;
    drag = null;

    scene.style.cursor = finished.previousCursor;
    suppressClickUntil = performance.now() + 600;

    if (scene.hasPointerCapture(finished.pointerId)) {
      scene.releasePointerCapture(finished.pointerId);
    }
  }

  scene.addEventListener('pointerup', finishDrag, true);
  scene.addEventListener('pointercancel', finishDrag, true);
  scene.addEventListener('lostpointercapture', finishDrag);

  window.addEventListener('blur', () => {
    finishDrag();
  });

  // Захват выполняется раньше игровых обработчиков клеток.
  scene.addEventListener('click', event => {
    if (
      event.altKey ||
      performance.now() < suppressClickUntil
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  scene.addEventListener('auxclick', event => {
    if (event.button === 1) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

   return {
    // Только представление: масштаб и состояние партии
    // не меняются. Центр ограничивается границами камеры.
    focusAt(point) {
      if (
        !point ||
        !Number.isFinite(point.x) ||
        !Number.isFinite(point.y)
      ) {
        return false;
      }

      finishDrag();

      center = {
        x: point.x,
        y: point.y
      };

      apply();
      return true;
    },

    bounds(next) {
      if (
        !next ||
        !Number.isFinite(next.x) ||
        !Number.isFinite(next.y) ||
        !Number.isFinite(next.width) ||
        !Number.isFinite(next.height) ||
        next.width <= 0 ||
        next.height <= 0
      ) {
        throw new Error('Камера: некорректные границы сцены.');
      }

      const relativeX = (center.x - base.x) / base.width;
      const relativeY = (center.y - base.y) / base.height;

      base = { ...next };

      center = {
        x: base.x + relativeX * base.width,
        y: base.y + relativeY * base.height
      };

      apply();
    }
  };
}