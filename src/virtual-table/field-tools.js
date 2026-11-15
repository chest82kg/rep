// src/virtual-table/field-tools.js
//
// Единое управление режимом поля.
// Вкладки интерфейса не определяют активный инструмент.
//
// Контекст выбранной модели передаётся основным столом
// через data-model-hint поля и событие vt:model-context.
// Игровое состояние не изменяет.

import {
  getTerrainMode,
  setTerrainMode
} from './terrain.js';

import {
  isRulerEnabled,
  setRulerEnabled
} from './ruler.js';

import {
  isLocalRouteEnabled,
  setLocalRouteEnabled
} from './local-route.js';

let initialized = false;

export function initFieldTools() {
  if (initialized) return;

  const fieldPanel = document.querySelector('.vt-field-panel');
  const boardScroll = fieldPanel?.querySelector('.vt-board-scroll');

  if (!fieldPanel || !boardScroll) {
    console.error('Инструменты: не найдены элементы поля.');
    return;
  }

  initialized = true;

  let switching = false;

  const panel = document.createElement('section');
  panel.className = 'vt-field-toolbar vt-field-tools';
  panel.setAttribute('aria-label', 'Режим поля');

  panel.innerHTML = `
    <button type="button"
      class="builder-action-btn"
      data-field-tool="models">
      Модели
    </button>

    <button type="button"
      class="builder-action-btn"
      data-field-tool="terrain">
      Ландшафт
    </button>

    <button type="button"
      class="builder-action-btn"
      data-field-tool="ruler">
      Линейка
    </button>

        <button type="button"
      class="builder-action-btn"
      data-field-tool="route">
      Маршрут
    </button>

    <span id="vt-field-tool-hint"
      role="status"
      aria-live="polite"></span>
  `;

  // Сразу после основной панели масштаба.
  const firstToolbar = fieldPanel.querySelector('.vt-field-toolbar');

  if (firstToolbar) {
    firstToolbar.after(panel);
  } else {
    boardScroll.before(panel);
  }

  const hint = panel.querySelector('#vt-field-tool-hint');

  const hints = {
    models:
      'Выберите модель в списке или жетон на поле.',
    select:
      'Ландшафт · нажмите клетку тайла для его выбора.',
    place:
      'Ландшафт · выберите верхний левый угол нового тайла.',
    move:
      'Ландшафт · выберите новый верхний левый угол тайла.'
  };

  function activeTool() {
    if (isLocalRouteEnabled()) return 'route';
    if (isRulerEnabled()) return 'ruler';

    return getTerrainMode() === 'models'
      ? 'models'
      : 'terrain';
  }

  function render() {
    const active = activeTool();

    panel.querySelectorAll('[data-field-tool]').forEach(button => {
      const selected = button.dataset.fieldTool === active;

      button.classList.toggle('primary', selected);
      button.setAttribute('aria-pressed', String(selected));
    });

    const board = document.getElementById('vt-board');

    if (board) {
      board.dataset.fieldTool = active;
    }

        hint.textContent = active === 'route'
      ? 'Маршрут · нажимайте клетки по порядку. ' +
        'Escape — завершить. Модель не перемещается.'
      : active === 'ruler'
        ? 'Линейка · выберите две клетки. Модели и тайлы не изменяются.'
        : active === 'models'
          ? board?.dataset.modelHint || hints.models
          : hints[getTerrainMode()] ||
            'Выберите действие с ландшафтом.';
  }

  function choose(tool) {
    if (switching) return;

    switching = true;

    try {
      if (tool === 'models') {
        setLocalRouteEnabled(false);
        setRulerEnabled(false);
        setTerrainMode('models');
      }

      if (tool === 'terrain') {
        setLocalRouteEnabled(false);
        setRulerEnabled(false);

        // Повторное нажатие не сбрасывает добавление или перенос.
        if (getTerrainMode() === 'models') {
          setTerrainMode('select');
        }
      }

      if (tool === 'ruler') {
        setLocalRouteEnabled(false);
        setTerrainMode('models');
        setRulerEnabled(true);
      }

      if (tool === 'route') {
        setRulerEnabled(false);
        setTerrainMode('models');
        setLocalRouteEnabled(true);
      }
    } finally {
      switching = false;
      render();
    }

    if (tool === 'route' && !isLocalRouteEnabled()) {
      hint.textContent =
        'Для маршрута выберите модель, размещённую на поле, ' +
        'затем снова нажмите «Маршрут».';
    }
  }

  panel.addEventListener('click', event => {
    const button = event.target.closest('[data-field-tool]');

    if (button) {
      choose(button.dataset.fieldTool);
    }
  });

   // Выбор действия с ландшафтом отключает оба измерителя.
  document.addEventListener('vt:terrain-mode', () => {
    if (switching) return;

    switching = true;

    try {
      if (getTerrainMode() !== 'models') {
        setRulerEnabled(false);
        setLocalRouteEnabled(false);
      }
    } finally {
      switching = false;
      render();
    }
  });

  // Линейка исключает маршрут и редактирование ландшафта.
  document.addEventListener('vt:ruler-mode', () => {
    if (switching) return;

    switching = true;

    try {
      if (isRulerEnabled()) {
        setLocalRouteEnabled(false);

        if (getTerrainMode() !== 'models') {
          setTerrainMode('models');
        }
      }
    } finally {
      switching = false;
      render();
    }
  });

  // Маршрут исключает линейку и редактирование ландшафта.
  // Событие приходит также при Escape или сбросе контекста.
  document.addEventListener('vt:route-mode', () => {
    if (switching) return;

    switching = true;

    try {
      if (isLocalRouteEnabled()) {
        setRulerEnabled(false);

        if (getTerrainMode() !== 'models') {
          setTerrainMode('models');
        }
      }
    } finally {
      switching = false;
      render();
    }
  });

  // Обновляем старые подсказки после построения раскладки.
  const fieldHelp = fieldPanel.querySelector('.vt-field-help');

  if (fieldHelp) {
    fieldHelp.textContent =
      'Выберите инструмент на панели поля. Эффекты — вручную.';
  }

  const armyHelp = document.querySelector(
    '.vt-army-panel > p.vt-muted:last-of-type'
  );

  if (armyHelp) {
    armyHelp.textContent =
      'Выберите модель в списке. ' +
      'Для размещения и перемещения включите инструмент «Модели».';
  }

  // Основной стол сообщает только об изменении контекста выбора.
  // Импорт index.js здесь не нужен.
  document.addEventListener('vt:model-context', render);

  choose('models');
}