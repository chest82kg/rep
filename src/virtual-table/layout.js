// src/virtual-table/layout.js
//
// Компактная раскладка локального стола.
//
// Переносит существующие DOM-элементы без пересоздания.
// Сохранения и игровые данные не изменяет.
//
// Миссия:
// — контрольные точки и счёт;
// — памятка сценария и просмотр снимка.
//
// Партия:
// — участники;
// — загрузка армий, карт и сценариев;
// — начало новой партии.

let initialized = false;

export function initTableLayout() {
  if (initialized) return;

  const layout = document.querySelector('.vt-layout');
  const rightPanel = document.querySelector('.vt-details-panel');
  const fieldPanel = document.querySelector('.vt-field-panel');
  const boardScroll = document.querySelector('.vt-board-scroll');
  const board = document.getElementById('vt-board');

  if (
    !layout ||
    !rightPanel ||
    !fieldPanel ||
    !boardScroll ||
    !board
  ) {
    console.error(
      'Раскладка: не найдены основные элементы стола.'
    );
    return;
  }

  initialized = true;
  document.body.classList.add('vt-compact');

  // Находим элементы до изменения структуры страницы.
  const details = document.getElementById('vt-details');
  const terrain = document.getElementById('vt-terrain-editor');

  const participants = rightPanel.querySelector(
    '.vt-sides-summary'
  );

  const modelHeading = [...rightPanel.children].find(element =>
    element.tagName === 'H2' &&
    element.textContent.trim() === 'Выбранная модель'
  );

  const mission = document.getElementById('vt-objective-form')
    ?.closest('section');

  const scenarioMemo = rightPanel.querySelector(
    '[aria-label="Памятка сценария"]'
  );

  // Сохраняем порядок панелей и пояснений из исходного DOM.
  // Включает загрузку армий, карт мастерской и сценариев.
  const partyBlocks = [
    ...document.querySelectorAll(
      '.vt-load-panel, .vt-notice'
    )
  ];

  const sessionControls = fieldPanel.querySelector(
    '[aria-label="Начало новой партии"]'
  );

  // Удаляем только старые разделители правой колонки.
  [...rightPanel.children].forEach(element => {
    if (element.matches('hr.vt-panel-divider')) {
      element.remove();
    }
  });

  const tabBar = document.createElement('div');
  tabBar.className = 'vt-tabs';
  tabBar.setAttribute('role', 'tablist');

  tabBar.setAttribute(
    'aria-label',
    'Панель виртуального стола'
  );

  const definitions = [
    { key: 'model', title: 'Модель' },
    { key: 'terrain', title: 'Ландшафт' },
    { key: 'mission', title: 'Миссия' },
    { key: 'party', title: 'Партия' }
  ];

  const panes = new Map();
  const buttons = new Map();

  for (const definition of definitions) {
    const button = document.createElement('button');

    button.type = 'button';
    button.id = `vt-tab-${definition.key}`;
    button.className = 'vt-tab';
    button.textContent = definition.title;

    button.setAttribute('role', 'tab');

    button.setAttribute(
      'aria-controls',
      `vt-pane-${definition.key}`
    );

    const pane = document.createElement('section');

    pane.id = `vt-pane-${definition.key}`;
    pane.className = 'vt-tab-pane';

    pane.setAttribute('role', 'tabpanel');
    pane.setAttribute('aria-labelledby', button.id);

    tabBar.append(button);
    panes.set(definition.key, pane);
    buttons.set(definition.key, button);

    button.addEventListener('click', () => {
      activate(definition.key);
    });

    button.addEventListener('keydown', event => {
      const keys = definitions
  .filter(item => !buttons.get(item.key).hidden)
  .map(item => item.key);
      const current = keys.indexOf(definition.key);

      let target = null;

      if (event.key === 'ArrowRight') {
        target = keys[(current + 1) % keys.length];
      }

      if (event.key === 'ArrowLeft') {
        target = keys[
          (current - 1 + keys.length) % keys.length
        ];
      }

      if (event.key === 'Home') {
        target = keys[0];
      }

      if (event.key === 'End') {
        target = keys.at(-1);
      }

      if (!target) return;

      event.preventDefault();

      activate(target);
      buttons.get(target).focus();
    });
  }

  const modelPane = panes.get('model');
  const terrainPane = panes.get('terrain');
  const missionPane = panes.get('mission');
  const partyPane = panes.get('party');

  if (modelHeading) modelPane.append(modelHeading);
  if (details) modelPane.append(details);

  if (terrain) terrainPane.append(terrain);

  if (mission) {
    missionPane.append(mission);
  } else {
    const text = document.createElement('p');

    text.className = 'vt-muted';
    text.textContent = 'Модуль миссии не подключён.';

    missionPane.append(text);
  }

  if (scenarioMemo) {
    missionPane.append(scenarioMemo);
  }

  if (participants) {
    partyPane.append(participants);
  }

  // Если в будущем одна панель окажется вложенной в другую,
  // переносим только верхний блок, не разрывая его структуру.
  const topLevelPartyBlocks = partyBlocks.filter(element =>
    !partyBlocks.some(other =>
      other !== element &&
      other.contains(element)
    )
  );

  for (const block of topLevelPartyBlocks) {
    partyPane.append(block);
  }

  if (sessionControls) {
    partyPane.append(sessionControls);
  }

  rightPanel.prepend(tabBar);

  for (const pane of panes.values()) {
    rightPanel.append(pane);
  }

  function activate(key) {
    for (const definition of definitions) {
      const active = definition.key === key;
      const button = buttons.get(definition.key);
      const pane = panes.get(definition.key);

      button.setAttribute(
        'aria-selected',
        String(active)
      );

      button.tabIndex = active ? 0 : -1;
      pane.hidden = !active;
    }
  }

  // Выбор модели в списке открывает её панель.
  document.getElementById('vt-unit-list')
    ?.addEventListener('click', event => {
      if (event.target.closest('[data-unit]')) {
        activate('model');
      }
    });

  function selectedModelId() {
    return document.querySelector(
      '#vt-unit-list [data-unit].is-selected'
    )?.dataset.unit || null;
  }

  let previousSelectedId = selectedModelId();

  const unitList = document.getElementById('vt-unit-list');

  if (unitList) {
    new MutationObserver(() => {
      const id = selectedModelId();

      if (id && id !== previousSelectedId) {
        activate('model');
      }

      previousSelectedId = id;
    }).observe(unitList, {
      childList: true
    });
  }

  const fieldHelp = fieldPanel.querySelector(
    '.vt-field-help'
  );

  if (fieldHelp) {
    fieldHelp.textContent =
      'Активный инструмент определяет действие щелчка. ' +
      'Вкладки справа сами по себе не переключают режим поля.';
  }

  const firstToolbar = fieldPanel.querySelector(
    '.vt-field-toolbar'
  );

  const zoom = document.getElementById('vt-zoom');
  const zoomValue = document.getElementById('vt-zoom-value');

  const fitButton = document.createElement('button');

  fitButton.type = 'button';
  fitButton.className = 'builder-action-btn';
  fitButton.textContent = 'Вписать поле';

  fitButton.title =
    'Подобрать размер клеток под доступную область';

  firstToolbar?.append(fitButton);

  if (firstToolbar) {
    firstToolbar.classList.add('vt-main-field-toolbar');

    const settings = document.createElement('details');
    settings.className = 'vt-field-settings';

    const summary = document.createElement('summary');
    summary.textContent = 'Масштаб и справка';

    const content = document.createElement('div');
    content.className = 'vt-field-settings-content';

    const scale = document.createElement('div');
    scale.className = 'vt-field-scale';

    const zoomLabel = firstToolbar.querySelector(
      'label[for="vt-zoom"]'
    );

    if (zoomLabel) scale.append(zoomLabel);
    if (zoom) scale.append(zoom);
    if (zoomValue) scale.append(zoomValue);

    content.append(scale);

    const help = document.createElement('p');
    help.className = 'vt-muted';

    help.textContent =
      'В режиме «Модели» выберите модель и пустую клетку. ' +
      '«Ландшафт» работает с тайлами, ' +
      '«Линейка» — только с измерением. ' +
      'Вкладки панели сами по себе не меняют инструмент. ' +
      'Дальность, стоимость действий и эффекты ' +
      'игроки проверяют вручную.';

    content.append(help);
    settings.append(summary, content);

    firstToolbar.after(settings);

    const deselect = document.getElementById('vt-deselect');

    if (deselect) {
      deselect.textContent = 'Снять выбор';
    }

    if (fieldHelp) {
      fieldHelp.textContent =
        'Инструмент выбирается над сеткой. Эффекты — вручную.';
    }
  }

  let autoFit = false;
  let frame = null;

  if (zoom) {
    zoom.min = '16';
  }

  function fitBoard() {
    // Скрытая мобильная область не должна менять масштаб.
    if (
      boardScroll.clientWidth <= 0 ||
      boardScroll.clientHeight <= 0
    ) {
      return;
    }

    const style = getComputedStyle(boardScroll);

    const horizontalPadding =
      (parseFloat(style.paddingLeft) || 0) +
      (parseFloat(style.paddingRight) || 0);

    const verticalPadding =
      (parseFloat(style.paddingTop) || 0) +
      (parseFloat(style.paddingBottom) || 0);

    const availableWidth =
      boardScroll.clientWidth - horizontalPadding - 45;

    const availableHeight =
      boardScroll.clientHeight - verticalPadding - 45;

    const size = Math.max(
      16,
      Math.min(
        80,
        Math.floor(
          Math.min(availableWidth, availableHeight) / 14
        )
      )
    );

    if (zoom) {
      zoom.value = String(size);

      zoom.dispatchEvent(
        new Event('input', { bubbles: true })
      );
    } else {
      board.style.setProperty('--vt-cell', `${size}px`);

      if (zoomValue) {
        zoomValue.textContent = `${size} px`;
      }
    }
  }

  fitButton.addEventListener('click', () => {
    autoFit = true;
    fitBoard();
  });

  zoom?.addEventListener('input', event => {
    if (event.isTrusted) {
      autoFit = false;
    }
  });

  function resizeLayout() {
    const desktop = window.matchMedia(
      '(min-width: 1001px)'
    ).matches;

    if (desktop) {
      const top = layout.getBoundingClientRect().top;

      const height = Math.max(
        360,
        Math.floor(window.innerHeight - top - 16)
      );

      layout.style.setProperty(
        '--vt-workspace-height',
        `${height}px`
      );
    } else {
      layout.style.removeProperty(
        '--vt-workspace-height'
      );
    }

    if (autoFit) {
      fitBoard();
    }
  }

  function scheduleResize() {
    if (frame !== null) {
      cancelAnimationFrame(frame);
    }

    frame = requestAnimationFrame(() => {
      frame = null;
      resizeLayout();
    });
  }

  window.addEventListener('resize', scheduleResize);

  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(scheduleResize);

    observer.observe(boardScroll);

    const header = document.querySelector('.vt-header');
    const status = document.getElementById('vt-message');

    if (header) observer.observe(header);
    if (status) observer.observe(status);
  }

  activate('model');

  requestAnimationFrame(() => {
    resizeLayout();
  });
}