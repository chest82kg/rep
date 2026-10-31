// src/virtual-table/interface.js
//
// Первый пакет упрощения интерфейса.
//
// Запускается после layout, mobile-layout,
// field-tools и fullscreen.
//
// Переносит существующие DOM-элементы,
// не пересоздавая их и не меняя игровые данные.
//
// Не пишет в localStorage или sessionStorage.

let initialized = false;

export function initTableInterface() {
  if (initialized) return;

  const field = document.querySelector('.vt-field-panel');
  const army = document.querySelector('.vt-army-panel');

  const boardScroll = field?.querySelector('.vt-board-scroll');
  const tools = field?.querySelector('.vt-field-tools');
  const toolbar = field?.querySelector('.vt-main-field-toolbar');
  const settings = field?.querySelector('.vt-field-settings');

  if (
    !field ||
    !army ||
    !boardScroll ||
    !tools ||
    !toolbar ||
    !settings
  ) {
    console.error(
      'Интерфейс: сначала должны быть построены ' +
      'раскладка и инструменты поля.'
    );

    return;
  }

  initialized = true;
  document.body.classList.add('vt-interface');

  /* ========================================================================
     Компактные настройки
     ======================================================================== */

  const settingsSummary = settings.querySelector('summary');
  const settingsContent = settings.querySelector(
    '.vt-field-settings-content'
  );

  if (settingsSummary) {
    settingsSummary.textContent = 'Настройки';

    settingsSummary.title =
      'Масштаб поля и краткая инструкция';
  }

  // Оставляем прежние slider, output и обработчики.
  toolbar.append(settings);

  // Дополнительная инструкция теперь доступна внутри
  // настроек, а не отдельной полосой под полем.
  const fieldHelp = field.querySelector('.vt-field-help');

  if (fieldHelp && settingsContent) {
    fieldHelp.textContent =
      'Стол — ручной помощник. Дальность, стоимость действий, ' +
      'контроль точек и игровые эффекты определяют игроки.';

    settingsContent.append(fieldHelp);
  }

  /* ========================================================================
     Инструменты под полем
     ======================================================================== */

  const dock = document.createElement('div');

  dock.className = 'vt-tool-dock';
  dock.setAttribute('aria-label', 'Инструменты игрового поля');

  boardScroll.after(dock);
  dock.append(tools);

  // Сам field-tools.js продолжает управлять режимами.
  // Меняем только тексты подсказок и расположение.
  const toolHint = tools.querySelector('#vt-field-tool-hint');

  if (toolHint) {
    toolHint.setAttribute('aria-atomic', 'true');
  }

  /* ========================================================================
     Сворачиваем дополнительные фильтры армии
     ======================================================================== */

  const controls = army.querySelector('.vt-list-controls');
  const search = document.getElementById('vt-unit-search');

  if (controls && search) {
    const filterDetails = document.createElement('details');

    filterDetails.className = 'vt-army-filter-fold';

    const summary = document.createElement('summary');
    summary.textContent = 'Поиск и фильтры';

    const content = document.createElement('div');
    content.className = 'vt-army-filter-content';

    const searchLabel = controls.querySelector(
      'label[for="vt-unit-search"]'
    );

    const filterGrid = controls.querySelector(
      '.vt-list-filter-grid'
    );

    const resetButton = document.getElementById(
      'vt-unit-filter-reset'
    );

    const footer = controls.querySelector(
      '.vt-list-filter-footer'
    );

    const count = document.getElementById('vt-unit-count');

    filterDetails.append(summary, content);

    const quickSides = controls.querySelector(
      '.vt-quick-sides'
    );

    if (quickSides) {
      quickSides.after(filterDetails);
    } else {
      controls.prepend(filterDetails);
    }

    if (searchLabel) content.append(searchLabel);

    content.append(search);

    if (filterGrid) content.append(filterGrid);
    if (resetButton) content.append(resetButton);

    // Счётчик оставляем доступным и при закрытых фильтрах.
    if (footer && count) {
      footer.append(count);
    }

    const location = document.getElementById(
      'vt-unit-location'
    );

    const status = document.getElementById(
      'vt-unit-status'
    );

    function updateFilterSummary() {
      const active = Boolean(
        search.value.trim() ||
        (location && location.value !== 'all') ||
        (status && status.value !== 'all')
      );

      summary.textContent = active
        ? 'Поиск и фильтры · включены'
        : 'Поиск и фильтры';

      filterDetails.classList.toggle(
        'has-active-filters',
        active
      );
    }

    // При переключении сторон значения фильтров обновляет
    // основной стол. Читаем их после его обработчиков.
    function scheduleFilterSummary() {
      queueMicrotask(updateFilterSummary);
    }

    controls.addEventListener(
      'input',
      scheduleFilterSummary
    );

    controls.addEventListener(
      'change',
      scheduleFilterSummary
    );

    controls.addEventListener(
      'click',
      scheduleFilterSummary
    );

    document.getElementById('vt-side-select')
      ?.addEventListener(
        'change',
        scheduleFilterSummary
      );

    const unitList = document.getElementById(
      'vt-unit-list'
    );

    if (unitList) {
      new MutationObserver(updateFilterSummary)
        .observe(unitList, { childList: true });
    }

    // Если фильтр был активен до построения интерфейса,
    // сразу раскрываем его, чтобы причина была понятна.
    updateFilterSummary();

    filterDetails.open =
      filterDetails.classList.contains('has-active-filters');
  }

  /* ========================================================================
     Убираем повторяющуюся инструкцию из армии
     ======================================================================== */

  const armyHelp = army.querySelector(
    ':scope > p.vt-muted:last-of-type'
  );

  // Метаданные армии не скрываем.
  if (armyHelp && armyHelp.id !== 'vt-army-meta') {
    armyHelp.hidden = true;
  }

  /* ========================================================================
     Первый автоподбор масштаба
     ======================================================================== */

  // Кнопка создаётся layout.js. Её обработчик включает
  // существующий autoFit, не дублируя расчёт размера.
  const fitButton = [...toolbar.querySelectorAll('button')]
    .find(button =>
      button.title ===
      'Подобрать размер клеток под доступную область'
    );

  if (fitButton) {
    fitButton.textContent = 'Вписать';
    fitButton.setAttribute('aria-label', 'Вписать поле в экран');

    let manuallyChangedZoom = false;

    document.getElementById('vt-zoom')
      ?.addEventListener('input', event => {
        if (event.isTrusted) {
          manuallyChangedZoom = true;
        }
      });

    // Даём стилям и мобильной раскладке примениться.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (
          !manuallyChangedZoom &&
          boardScroll.clientWidth > 0 &&
          boardScroll.clientHeight > 0
        ) {
          fitButton.click();
        }
      });
    });
  }

  // Сообщаем существующим обработчикам размеров,
  // что высота и расположение панелей изменились.
  window.dispatchEvent(new Event('resize'));
}