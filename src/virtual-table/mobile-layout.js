// src/virtual-table/mobile-layout.js
//
// На узком экране переключает основные области:
// поле / армия / панель.
//
// Существующие элементы не пересоздаются.
// Игровые данные не изменяются.

let initialized = false;

export function initMobileLayout() {
  if (initialized) return;

  const layout = document.querySelector('.vt-layout');
  const field = document.querySelector('.vt-field-panel');
  const army = document.querySelector('.vt-army-panel');
  const details = document.querySelector('.vt-details-panel');

  if (!layout || !field || !army || !details) {
    console.error('Мобильная раскладка: не найдены панели.');
    return;
  }

  initialized = true;

  const media = window.matchMedia('(max-width: 1000px)');
  const storageKey = 'mt_virtual_table_mobile_view';

  const areas = {
    field,
    army,
    details
  };

  const definitions = [
    { key: 'field', title: 'Поле' },
    { key: 'army', title: 'Армия' },
    { key: 'details', title: 'Панель' }
  ];

  let current = 'field';
  let frame = null;

  try {
    const saved = sessionStorage.getItem(storageKey);

    if (Object.hasOwn(areas, saved)) {
      current = saved;
    }
  } catch {
    // Работа переключателя не зависит от sessionStorage.
  }

  const navigation = document.createElement('nav');
  navigation.className = 'vt-mobile-navigation';
  navigation.setAttribute('aria-label', 'Области виртуального стола');

  const buttons = new Map();

  for (const definition of definitions) {
    const button = document.createElement('button');

    button.type = 'button';
    button.className = 'builder-action-btn';
    button.textContent = definition.title;
    button.dataset.mobileArea = definition.key;

    if (!areas[definition.key].id) {
      areas[definition.key].id = `vt-mobile-area-${definition.key}`;
    }

    button.setAttribute(
      'aria-controls',
      areas[definition.key].id
    );

    button.addEventListener('click', () => {
      activate(definition.key);
    });

    navigation.append(button);
    buttons.set(definition.key, button);
  }

  layout.before(navigation);

  function remember() {
    try {
      sessionStorage.setItem(storageKey, current);
    } catch {
      // Выбранная область продолжит работать без сохранения.
    }
  }

  function activate(key) {
    if (!Object.hasOwn(areas, key)) return;

    current = key;
    remember();
    render();
  }

  function render() {
    const mobile = media.matches;

    document.body.classList.toggle('vt-mobile-switching', mobile);

    for (const definition of definitions) {
      const selected = definition.key === current;
      const area = areas[definition.key];
      const button = buttons.get(definition.key);

      // Используем отдельный класс, не затрагивая hidden
      // внутренних вкладок «Модель / Ландшафт / Миссия / Партия».
      area.classList.toggle(
        'vt-mobile-area-hidden',
        mobile && !selected
      );

      button.setAttribute('aria-pressed', String(selected));
      button.classList.toggle('primary', selected);
    }

    scheduleHeight();
  }

  function updateHeight() {
    if (!media.matches) {
      layout.style.removeProperty('--vt-mobile-workspace-height');
      return;
    }

    const top = layout.getBoundingClientRect().top;

    const viewportHeight = window.visualViewport?.height ||
      window.innerHeight;

    // Минимальная высота сохраняет пригодность интерфейса
    // в очень низком окне. Общая прокрутка в таком случае допустима.
    const height = Math.max(
      320,
      Math.floor(viewportHeight - top - 12)
    );

    layout.style.setProperty(
      '--vt-mobile-workspace-height',
      `${height}px`
    );
  }

  function scheduleHeight() {
    if (frame !== null) {
      cancelAnimationFrame(frame);
    }

    frame = requestAnimationFrame(() => {
      frame = null;
      updateHeight();
    });
  }

  // При выборе модели из списка открываем её панель.
  document.getElementById('vt-unit-list')
    ?.addEventListener('click', event => {
      if (
        media.matches &&
        event.target.closest('[data-unit]')
      ) {
        activate('details');
      }
    });

  // Кнопка в панели модели возвращает к полю.
  // Не меняет режим инструмента и не сохраняет заметку автоматически.
  const backButton = document.createElement('button');

  backButton.type = 'button';
  backButton.className =
    'builder-action-btn vt-mobile-back-to-field';

  backButton.textContent = 'Вернуться к полю';

  backButton.addEventListener('click', () => {
    activate('field');
  });

  const tabBar = details.querySelector('.vt-tabs');

  if (tabBar) {
    tabBar.before(backButton);
  } else {
    details.prepend(backButton);
  }

  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', render);
  } else {
    media.addListener(render);
  }

  window.addEventListener('resize', scheduleHeight);

  window.visualViewport?.addEventListener(
    'resize',
    scheduleHeight
  );

  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(scheduleHeight);

    const header = document.querySelector('.vt-header');
    const message = document.getElementById('vt-message');

    if (header) observer.observe(header);
    if (message) observer.observe(message);

    observer.observe(navigation);
  }

  render();
}