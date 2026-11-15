// src/workshop/units-workspace.js
//
// Компоновка редактора авторских моделей.
// Не меняет формат данных, правила и обработчики сохранения
// из custom-units.js.

export function initUnitsWorkspace() {
  const host = document.getElementById('ws-units');

  if (!host || host.dataset.unitsWorkspaceReady) return;

  const find = selector => host.querySelector(selector);

  const form = find('[data-custom-form]');
  const list = find('[data-custom-list]');
  const card = find('[data-custom-card]');
  const message = find('[data-custom-message]');
  const warning = find('[data-custom-warning]');
  const save = find('[data-custom-save]');
  const previewButton = find('[data-custom-preview]');
  const dirty = find('[data-custom-dirty]');
  const newButton = find('[data-custom-new]');
  const reloadButton = find('[data-custom-reload]');
  const transfer = find('.ws-transfer');
  const notice = find('.ws-notice:not([data-custom-warning])');

  if (
    !form ||
    !list ||
    !card ||
    !message ||
    !save ||
    !previewButton ||
    !dirty ||
    !newButton
  ) {
    throw new Error(
      'Не найдены элементы редактора авторских моделей.'
    );
  }

  const mainFields = form.querySelector(':scope > .ws-form-grid');
  const nameInput = form.querySelector('[data-u-name]');
  const formActions = save.parentElement;

  // Проверяем исходную разметку до перемещения элементов.
  if (
    !mainFields ||
    !nameInput ||
    !formActions ||
    formActions === form
  ) {
    throw new Error(
      'Не найдена исходная сетка полей или панель действий модели.'
    );
  }

  const oldHeading = host.querySelector(':scope > h2');
  const oldLibraryHeading = host.querySelector(':scope > h3');
  const oldActions = newButton.parentElement;
  const weaponNote = form.querySelector(':scope > p.ws-muted');

  const weaponFields = [
    ...form.querySelectorAll('[data-custom-weapon]')
  ];

  const abilityFields = [
    ...form.querySelectorAll('[data-custom-ability]')
  ];

  function element(tag, className = '', text = '') {
    const node = document.createElement(tag);

    if (className) node.className = className;
    if (text !== '') node.textContent = text;

    return node;
  }

  function button(text) {
    const node = element('button', 'builder-action-btn', text);
    node.type = 'button';
    return node;
  }

  function isUnitsWorkspaceVisible() {
    return (
      host.isConnected &&
      !host.hidden &&
      host.getClientRects().length > 0 &&
      getComputedStyle(host).visibility !== 'hidden'
    );
  }

  function hasOpenDialog() {
    return Boolean(document.querySelector('dialog[open]'));
  }

  // -----------------------------------------------------------
  // Верхняя полоса документа
  // -----------------------------------------------------------

  const header = element('div', 'ws-unit-header');
  const titleBox = element('div', 'ws-unit-title-box');
  const title = element('h2', '', 'Новая модель');
  const subtitle = element('span', 'ws-muted', 'Авторский контент');

  titleBox.append(title, subtitle);

  const actions = element('div', 'ws-actions');

  // Сохраняем штатную связь submit-кнопки с формой,
  // хотя кнопка теперь находится за её пределами.
  if (!form.id) form.id = 'ws-custom-unit-form';

  save.setAttribute('form', form.id);
  save.setAttribute('aria-keyshortcuts', 'Meta+S Control+S');
  save.title = 'Сохранить модель · ⌘S / Ctrl+S';

  const menu = element('details', 'ws-unit-document');
  const menuSummary = element('summary', '', 'Документ ▾');
  const menuContent = element('div', 'ws-unit-document-content');

  if (transfer) menuContent.append(transfer);
  if (reloadButton) menuContent.append(reloadButton);
  if (notice) menuContent.append(notice);

  menuContent.append(
    element(
      'p',
      'ws-muted ws-unit-save-shortcut',
      'Быстрое сохранение: ⌘S на Mac · Ctrl+S на Windows/Linux.'
    )
  );

  menu.append(menuSummary, menuContent);
  actions.append(dirty, save, menu);
  header.append(titleBox, actions);

  const workspace = element('div', 'ws-unit-workspace');

  // -----------------------------------------------------------
  // Библиотека
  // -----------------------------------------------------------

  const library = element('details', 'ws-unit-library');
  library.open = true;

  const librarySummary = element(
    'summary',
    '',
    'Библиотека моделей'
  );

  const libraryBody = element('div', 'ws-unit-library-body');

  const searchLabel = element(
    'label',
    'ws-unit-search',
    'Поиск модели'
  );

  const search = element('input');
  search.type = 'search';
  search.maxLength = 120;
  search.autocomplete = 'off';
  search.placeholder = 'Название…';

  searchLabel.append(search);

  const count = element('p', 'ws-muted ws-unit-count');
  const noResults = element('div', 'ws-unit-no-results');
  noResults.hidden = true;

  noResults.append(
    element('strong', '', 'Ничего не найдено'),
    element(
      'p',
      '',
      'Попробуйте другое название или сбросьте поиск. ' +
      'Сохранённые модели не удалены.'
    )
  );

  const clearSearch = button('Сбросить поиск');
  noResults.append(clearSearch);

  libraryBody.append(
    newButton,
    searchLabel,
    count,
    list,
    noResults
  );

  library.append(librarySummary, libraryBody);

  function normalize(value) {
    return value
      .normalize('NFKC')
      .toLocaleLowerCase('ru-RU')
      .replace(/ё/g, 'е')
      .trim();
  }

  function filterLibrary() {
    const query = normalize(search.value);
    const items = [...list.querySelectorAll('.ws-library-card')];
    let visible = 0;

    for (const item of items) {
      const name = item.querySelector('h4')?.textContent || '';
      const matches = normalize(name).includes(query);

      item.hidden = !matches;

      if (matches) visible += 1;
    }

    count.textContent = items.length
      ? query
        ? `Найдено ${visible} из ${items.length}`
        : `Моделей в библиотеке: ${items.length}`
      : 'Библиотека пуста';

    noResults.hidden = !(
      items.length > 0 &&
      query &&
      visible === 0
    );
  }

  function resetSearch() {
    search.value = '';
    filterLibrary();
  }

  clearSearch.addEventListener('click', () => {
    resetSearch();
    search.focus();
  });

  search.addEventListener('input', filterLibrary);

  search.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !search.value) return;

    event.preventDefault();
    event.stopPropagation();

    resetSearch();
  });

  // Создание документа и проверка dirty остаются штатными.
  // Здесь очищается только фильтр библиотеки.
  newButton.addEventListener('click', resetSearch);

  new MutationObserver(filterLibrary).observe(list, {
    childList: true
  });

  // -----------------------------------------------------------
  // Центральный редактор: основные свойства
  // -----------------------------------------------------------

  const editor = element('section', 'ws-unit-editor');
  editor.setAttribute('aria-label', 'Параметры авторской модели');

  const navigation = element('nav', 'ws-unit-navigation');
  navigation.setAttribute('aria-label', 'Разделы параметров модели');

  const editorScroll = element('div', 'ws-unit-editor-scroll');

  const properties = element('section', 'ws-unit-properties');
  properties.append(element('h3', '', 'Модель'));

  // Перемещаем существующие поля, не пересоздавая их.
  const getMainLabel = selector =>
    mainFields.querySelector(selector)?.closest('label');

  const nameLabel = getMainLabel('[data-u-name]');
const classLabel = getMainLabel('[data-u-role]');
  const costLabel = getMainLabel('[data-u-cost]');
  const modeLabel = getMainLabel('[data-u-mode]');

  const statLabels = ['hp', 'move', 'armor']
    .map(key => getMainLabel(`[data-u-${key}]`))
    .filter(Boolean);

  if (modeLabel) modeLabel.remove();

  const identity = element('div', 'ws-unit-identity');

  if (nameLabel) {
    nameLabel.classList.add('ws-unit-name-field');
    identity.append(nameLabel);
  }

  const classification = element(
    'div',
    'ws-unit-classification'
  );

  if (classLabel) classification.append(classLabel);
  if (costLabel) classification.append(costLabel);

  const stats = element('div', 'ws-unit-stats');

  for (const label of statLabels) {
    stats.append(label);
  }

  // Сохраняем оставшиеся поля и их исходный порядок.
  while (mainFields.firstChild) {
    identity.append(mainFields.firstChild);
  }

  mainFields.remove();

  const overview = element('div', 'ws-unit-model-overview');
  overview.append(identity);

  if (classification.childElementCount) {
    overview.append(classification);
  }

  const characteristics = element(
    'div',
    'ws-unit-characteristics'
  );

  characteristics.append(
    element('h4', '', 'Основные характеристики'),
    stats
  );

  properties.append(overview, characteristics);

  // -----------------------------------------------------------
  // Вооружение и способности
  // -----------------------------------------------------------

  const armament = element('section', 'ws-unit-armament');
  armament.append(element('h3', '', 'Вооружение'));

  if (modeLabel) armament.append(modeLabel);
  if (weaponNote) armament.append(weaponNote);

  for (const field of weaponFields) {
    armament.append(field);
  }

  const abilities = element('section', 'ws-unit-abilities');
  abilities.append(element('h3', '', 'Способности'));

  for (const field of abilityFields) {
    abilities.append(field);
  }

  form.append(properties, armament, abilities);

  // Все используемые действия уже перемещены из старой панели.
  formActions.remove();

  editorScroll.append(form);

  const sectionHint = element('p', 'ws-unit-section-hint');
  editor.append(navigation, sectionHint, editorScroll);

  // -----------------------------------------------------------
  // Переключение разделов
  // -----------------------------------------------------------

  const sections = [
    {
      key: 'model',
      label: 'Модель',
      section: properties,
      hint: 'Название, класс, стоимость и основные характеристики.'
    },
    {
      key: 'weapons',
      label: 'Оружие',
      section: armament,
      hint: 'Вариант вооружения и параметры каждого оружия.'
    },
    {
      key: 'abilities',
      label: 'Способности',
      section: abilities,
      hint: 'До двух способностей. Необязательные поля.'
    }
  ];

  let selectedSection = 'model';

  function selectSection(key, { resetScroll = true } = {}) {
    const selected = sections.find(item => item.key === key);
    if (!selected) return;

    selectedSection = key;

    for (const item of sections) {
      const active = item.key === key;

      item.section.hidden = !active;
      item.control.classList.toggle('primary', active);
      item.control.setAttribute('aria-pressed', String(active));
    }

    sectionHint.textContent = selected.hint;

    if (resetScroll) editorScroll.scrollTop = 0;
  }

  for (const item of sections) {
    const control = button(item.label);

    if (!item.section.id) {
      item.section.id = `ws-unit-editor-${item.key}`;
    }

    control.setAttribute('aria-controls', item.section.id);
    control.setAttribute('aria-pressed', 'false');

    control.addEventListener('click', () => {
      selectSection(item.key);
    });

    item.control = control;
    navigation.append(control);
  }

  // Во время одного прохода проверки оставляем стандартное
  // сообщение браузера только у первого ошибочного поля.
  // Остальные invalid отменяем только в части браузерного UI:
  // сами поля остаются невалидными, отправка не разрешается.
  let firstInvalidField = null;

  form.addEventListener('invalid', event => {
    const item = sections.find(entry =>
      entry.section.contains(event.target)
    );

    if (!item) return;

    if (firstInvalidField) {
      event.preventDefault();
      return;
    }

    firstInvalidField = event.target;
    selectSection(item.key);

    queueMicrotask(() => {
      firstInvalidField = null;
    });
  }, true);

  // -----------------------------------------------------------
  // Предпросмотр
  // -----------------------------------------------------------

  const preview = element('details', 'ws-unit-preview-panel');
  preview.open = true;

  const previewSummary = element('summary', '', 'Карточка модели');
  const previewBody = element('div', 'ws-unit-preview-body');

  const previewState = element(
    'p',
    'ws-muted ws-unit-preview-state'
  );

  previewButton.textContent = 'Обновить карточку';

  const previewTools = element(
    'details',
    'ws-unit-preview-tools'
  );

  const previewToolsSummary = element(
    'summary',
    '',
    'О предпросмотре'
  );

  const previewToolsBody = element(
    'div',
    'ws-unit-preview-tools-body'
  );

  previewToolsBody.append(previewState, previewButton);
  previewTools.append(previewToolsSummary, previewToolsBody);

  const expandCardButton = button('Открыть карточку');
  expandCardButton.classList.add('ws-unit-expand-card');
  expandCardButton.setAttribute('aria-haspopup', 'dialog');

  previewBody.append(expandCardButton, card, previewTools);
  preview.append(previewSummary, previewBody);

  // -----------------------------------------------------------
  // Счётчики текста способностей
  // -----------------------------------------------------------

  const abilityCounters = [];

  abilities.querySelectorAll('input, textarea').forEach(field => {
    const limit = field.maxLength;

    if (!Number.isInteger(limit) || limit <= 0) return;

    const label = field.closest('label');
    if (!label) return;

    const counter = element('span', 'ws-unit-field-counter');

    counter.id =
      `ws-unit-ability-counter-${abilityCounters.length + 1}`;

    const describedBy = new Set(
      (field.getAttribute('aria-describedby') || '')
        .split(/\s+/)
        .filter(Boolean)
    );

    describedBy.add(counter.id);

    field.setAttribute(
      'aria-describedby',
      [...describedBy].join(' ')
    );

    label.append(counter);

    abilityCounters.push({
      field,
      counter,
      limit
    });
  });

  function syncAbilityCounters() {
    for (const { field, counter, limit } of abilityCounters) {
      const used = field.value.length;
      const remaining = Math.max(0, limit - used);

      counter.textContent =
        `${used.toLocaleString('ru-RU')} / ` +
        `${limit.toLocaleString('ru-RU')} символов`;

      counter.classList.toggle(
        'is-near-limit',
        remaining <= Math.ceil(limit * 0.1)
      );
    }
  }

  // -----------------------------------------------------------
  // Заполненность способностей на вкладке
  // -----------------------------------------------------------

  const abilitySection = sections.find(
    item => item.key === 'abilities'
  );

  function syncAbilitySectionState() {
    let started = 0;
    let incomplete = 0;

    for (const field of abilityFields) {
      const titleField = field.querySelector(
        'input:not([type="hidden"])'
      );

      const textField = field.querySelector('textarea');

      const hasTitle = Boolean(titleField?.value.trim());
      const hasText = Boolean(textField?.value.trim());

      if (hasTitle || hasText) started += 1;
      if (hasTitle !== hasText) incomplete += 1;
    }

    abilitySection.control.textContent =
      `Способности · ${started}/${abilityFields.length}`;

    abilitySection.control.classList.toggle(
      'has-incomplete-content',
      incomplete > 0
    );

    abilitySection.hint = incomplete > 0
      ? 'Есть незавершённая способность: заполните и название, ' +
        'и описание либо очистите оба поля. ' +
        'Полностью пустые способности можно оставить.'
      : 'До двух способностей. Необязательные поля. ' +
        'Счётчик показывает, сколько блоков начато.';

    if (selectedSection === 'abilities') {
      sectionHint.textContent = abilitySection.hint;
    }
  }

  // -----------------------------------------------------------
  // Общая синхронизация оболочки
  // -----------------------------------------------------------

  function updateTitle() {
    title.textContent = nameInput.value.trim() || 'Новая модель';
  }

  function syncFormDisplay() {
    updateTitle();
    syncAbilityCounters();
    syncAbilitySectionState();
  }

  function setPreviewReady() {
    previewState.textContent =
      'Живой предпросмотр · «—» означает незаполненное поле. ' +
      'Изменения записываются только кнопкой «Сохранить модель».';

    previewState.classList.remove('is-stale');
  }

  function handleFormEdit() {
    syncFormDisplay();

    previewState.textContent = 'Обновление карточки…';
    previewState.classList.remove('is-stale');
  }

  form.addEventListener('input', handleFormEdit);
  form.addEventListener('change', handleFormEdit);

  form.addEventListener('reset', () => {
    selectSection('model');

    // reset возникает до восстановления значений браузером.
    // Штатный fill() также завершится до этой микрозадачи.
    queueMicrotask(syncFormDisplay);
  });

  // Один наблюдатель вместо трёх.
  // Обновление карточки служит сигналом после штатного fill().
  new MutationObserver(() => {
    syncFormDisplay();
    setPreviewReady();
  }).observe(card, {
    childList: true,
    subtree: true,
    characterData: true
  });

  // -----------------------------------------------------------
  // Крупная карточка: копия текущего предпросмотра
  // -----------------------------------------------------------

  let openingCard = false;

  expandCardButton.addEventListener('click', () => {
    if (
      openingCard ||
      !isUnitsWorkspaceVisible() ||
      hasOpenDialog()
    ) {
      return;
    }

    openingCard = true;

    // Штатный ручной предпросмотр читает текущий черновик.
    // Не запускаем сохранение и не создаём второй редактор.
    previewButton.click();

    queueMicrotask(() => {
      openingCard = false;

      if (!isUnitsWorkspaceVisible() || hasOpenDialog()) return;

      const dialog = element('dialog', 'ws-unit-card-dialog');
      dialog.setAttribute('aria-label', 'Карточка авторской модели');

      const dialogHeader = element(
        'div',
        'ws-unit-card-dialog-header'
      );

      const heading = element('div');

      heading.append(
        element('h2', '', 'Карточка модели'),
        element(
          'p',
          '',
          'Текущий предпросмотр · открытие окна не сохраняет модель'
        )
      );

      const closeButton = button('Закрыть ×');
      closeButton.autofocus = true;

      dialogHeader.append(heading, closeButton);

      const dialogBody = element(
        'div',
        'ws-unit-card-dialog-body'
      );

      const copy = card.cloneNode(true);
      const copiedNodes = [copy, ...copy.querySelectorAll('*')];

      // В карточке нет отдельной интерактивной формы.
      // Убираем идентификаторы и ссылки на них, чтобы копия
      // не связывалась с элементами основного редактора.
      for (const node of copiedNodes) {
        for (const attribute of [
          'id',
          'data-custom-card',
          'aria-labelledby',
          'aria-describedby',
          'aria-controls',
          'aria-owns',
          'aria-activedescendant',
          'for'
        ]) {
          node.removeAttribute(attribute);
        }
      }

      dialogBody.append(copy);
      dialog.append(dialogHeader, dialogBody);

      function restoreFocus() {
        if (
          expandCardButton.isConnected &&
          isUnitsWorkspaceVisible()
        ) {
          expandCardButton.focus({ preventScroll: true });
        }
      }

      closeButton.addEventListener('click', () => {
        dialog.close();
      });

      // Esc закрывает нативный dialog и вызывает close.
      dialog.addEventListener('close', () => {
        dialog.remove();
        restoreFocus();
      }, { once: true });

      document.body.append(dialog);

      try {
        dialog.showModal();
      } catch (error) {
        dialog.remove();
        restoreFocus();

        console.error(
          'Не удалось открыть карточку модели:',
          error
        );
      }
    });
  });

  // -----------------------------------------------------------
  // Монтаж оболочки
  // -----------------------------------------------------------

  workspace.append(library, editor, preview);

  oldHeading?.remove();
  oldLibraryHeading?.remove();

  // Удаляем только опустевшую прежнюю панель действий.
  // Не удаляем родительский раздел, если разметка изменилась.
  if (
    oldActions &&
    oldActions !== host &&
    oldActions !== form &&
    oldActions.childElementCount === 0
  ) {
    oldActions.remove();
  }

  host.append(header);

  if (warning) host.append(warning);

  host.append(workspace, message);

  // -----------------------------------------------------------
  // Меню документа
  // -----------------------------------------------------------

  document.addEventListener('pointerdown', event => {
    if (
      menu.open &&
      event.target instanceof Node &&
      !menu.contains(event.target)
    ) {
      menu.open = false;
    }
  });

  menu.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !menu.open) return;

    event.preventDefault();
    event.stopPropagation();

    menu.open = false;
    menuSummary.focus();
  });

  // -----------------------------------------------------------
  // Быстрое сохранение
  // -----------------------------------------------------------

  document.addEventListener('keydown', event => {
    const isSaveShortcut =
      event.code === 'KeyS' &&
      (event.metaKey || event.ctrlKey) &&
      !event.altKey &&
      !event.shiftKey;

    if (
      !isSaveShortcut ||
      event.defaultPrevented ||
      event.isComposing ||
      !isUnitsWorkspaceVisible() ||
      hasOpenDialog()
    ) {
      return;
    }

    event.preventDefault();

    if (event.repeat || save.matches(':disabled')) return;

    // Тот же путь, что обычное нажатие кнопки.
    // Сохраняем нативную валидацию и штатные guards.
    save.click();
  });

  host.dataset.unitsWorkspaceReady = 'true';

  selectSection('model');
  syncFormDisplay();
  setPreviewReady();
  filterLibrary();
}