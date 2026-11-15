// src/workshop/scenarios-workspace.js
//
// Рабочая оболочка сценариев.
// Сохраняет существующие элементы и обработчики scenarios.js.
// Формат данных, storage и правила снимка карты не меняются.

export function initScenariosWorkspace() {
  const host = document.getElementById('ws-scenarios');

  if (!host || host.dataset.scenariosWorkspaceReady) return;

  const find = selector => host.querySelector(selector);

  const form = find('[data-s-form]');
  const list = find('[data-s-list]');
  const card = find('[data-s-card]');
  const save = find('[data-s-save]');
  const dirty = find('[data-s-dirty]');
  const message = find('[data-s-message]');
  const warning = find('[data-s-warning]');
  const newButton = find('[data-s-new]');
  const reloadButton = find('[data-s-reload]');
  const previewButton = find('[data-s-preview]');
  const searchLabel = find('[data-s-search]')?.closest('label');
  const count = find('[data-s-count]');
  const nameInput = find('[data-s-name]');
  const statusInput = find('[data-s-status]');
  const meta = find('[data-s-meta]');
  const mapInfo = find('[data-s-map-info]');
  const mapField = mapInfo?.closest('fieldset');
  const transfer = find('.ws-transfer');
  const notice = find('.ws-notice:not([data-s-warning])');
  const fields = [...host.querySelectorAll('.ws-scenario-text')];

  if (
    !form || !list || !card || !save || !dirty ||
    !newButton || !previewButton || !mapField ||
    !nameInput || !statusInput || fields.length !== 5
  ) {
    throw new Error('Не найдены элементы рабочего места сценариев.');
  }

  function node(tag, className, text) {
    const element = document.createElement(tag);

    if (className) element.className = className;
    if (text) element.textContent = text;

    return element;
  }

  function button(text) {
    const element = node('button', 'builder-action-btn', text);
    element.type = 'button';
    return element;
  }

  const oldHeading = host.querySelector(':scope > h2');
  const oldLibraryHeading = host.querySelector(':scope > h3');
  const oldActions = newButton.parentElement;
  const oldFormActions = save.parentElement;
  const properties = form.querySelector(':scope > .ws-form-grid');
  const formNote = form.querySelector(':scope > p.ws-muted:not([data-s-meta])');

  // Верхняя полоса
  const header = node('div', 'ws-scenario-header');
  const titleBox = node('div', 'ws-scenario-title');
  const title = node('h2', '', 'Новый сценарий');
  const subtitle = node('span', 'ws-muted', 'Авторский сценарий · ручная партия');

  titleBox.append(title, subtitle);

  const headerActions = node('div', 'ws-actions');

  if (!form.id) form.id = 'ws-scenario-document-form';

  // Штатная submit-кнопка сохраняет связь с формой.
  save.setAttribute('form', form.id);

  const menu = node('details', 'ws-scenario-document');
  const menuSummary = node('summary', '', 'Документ ▾');
  const menuBody = node('div', 'ws-scenario-document-body');

  if (meta) menuBody.append(meta);
  if (transfer) menuBody.append(transfer);
  if (reloadButton) menuBody.append(reloadButton);
  if (notice) menuBody.append(notice);
  if (formNote) menuBody.append(formNote);

  menu.append(menuSummary, menuBody);
  headerActions.append(dirty, save, menu);
  header.append(titleBox, headerActions);

  const workspace = node('div', 'ws-scenario-workspace');

  // Библиотека
  const library = node('details', 'ws-scenario-library');
  library.open = true;

  const librarySummary = node('summary', '', 'Мои сценарии');
  const libraryBody = node('div', 'ws-scenario-library-body');

  libraryBody.append(newButton);

  if (searchLabel) libraryBody.append(searchLabel);
  if (count) libraryBody.append(count);

  libraryBody.append(list);
  library.append(librarySummary, libraryBody);

  // Центральная форма
  const editor = node('section', 'ws-scenario-editor');
  editor.setAttribute('aria-label', 'Редактирование сценария');

  const editorHeading = node('h3', '', 'Содержание сценария');
  const navigation = node('nav', 'ws-scenario-section-nav');
  navigation.setAttribute('aria-label', 'Разделы сценария');

  const textArea = node('div', 'ws-scenario-writing');

  const labels = {
    preparation: 'Подготовка',
    deployment: 'Расстановка',
    duration: 'Завершение',
    scoring: 'Цели и очки',
    specialRules: 'Особые правила'
  };

  const tabButtons = new Map();
  let selectedSection = 'preparation';

  for (const field of fields) {
    const textarea = field.querySelector('textarea[data-s-section]');
    const key = textarea.dataset.sSection;
    const control = button(labels[key] || key);

    if (!textarea.id) textarea.id = `ws-scenario-section-${key}`;

    control.setAttribute('aria-controls', textarea.id);
    control.dataset.scenarioSection = key;

    navigation.append(control);
    tabButtons.set(key, control);
    textArea.append(field);
  }

  const sectionInfo = node('p', 'ws-scenario-section-info');

  function syncSections() {
    for (const field of fields) {
      const textarea = field.querySelector('textarea[data-s-section]');
      const key = textarea.dataset.sSection;
      const selected = key === selectedSection;
      const control = tabButtons.get(key);

      field.hidden = !selected;
      control.setAttribute('aria-pressed', String(selected));
      control.classList.toggle('primary', selected);

      // Небольшая отметка показывает, где уже есть текст.
      control.classList.toggle('has-content', Boolean(textarea.value.trim()));

      if (selected) {
        sectionInfo.textContent =
          `${textarea.value.length.toLocaleString('ru-RU')} / 12 000 символов` +
          ' · Можно оставить пустым';
      }
    }
  }

  navigation.addEventListener('click', event => {
    const control = event.target.closest('[data-scenario-section]');

    if (!control || !navigation.contains(control)) return;

    selectedSection = control.dataset.scenarioSection;
    syncSections();
  });

  // Все исходные поля сохраняются внутри той же формы.
  form.append(properties, editorHeading, navigation, textArea, sectionInfo);
  oldFormActions.remove();
  editor.append(form);

  // Правая колонка
  const side = node('aside', 'ws-scenario-side');
  side.setAttribute('aria-label', 'Карта и памятка сценария');

  const sideNavigation = node('nav', 'ws-scenario-side-nav');
  sideNavigation.setAttribute('aria-label', 'Просмотр карты и памятки');

  const mapButton = button('Карта');
  const memoButton = button('Памятка');
  sideNavigation.append(mapButton, memoButton);

  const mapPane = node('section', 'ws-scenario-map-pane');
  const mapHelp = node(
    'p',
    'ws-muted',
    'Сохраните карту в разделе «Карты», затем выберите её здесь и возьмите снимок.'
  );

  mapPane.append(mapHelp, mapField);

  const memoPane = node('section', 'ws-scenario-memo-pane');
  const previewState = node(
    'p',
    'ws-muted ws-scenario-preview-state',
    'Живая памятка. Изменения сохраняются отдельно.'
  );

  previewButton.textContent = 'Обновить сейчас';

  memoPane.append(previewButton, previewState, card);

  const sideBody = node('div', 'ws-scenario-side-body');
  sideBody.append(mapPane, memoPane);
  side.append(sideNavigation, sideBody);

  function selectSide(mode) {
    const showMap = mode === 'map';

    mapPane.hidden = !showMap;
    memoPane.hidden = showMap;

    mapButton.classList.toggle('primary', showMap);
    memoButton.classList.toggle('primary', !showMap);
    mapButton.setAttribute('aria-pressed', String(showMap));
    memoButton.setAttribute('aria-pressed', String(!showMap));
  }

  mapButton.addEventListener('click', () => selectSide('map'));
  memoButton.addEventListener('click', () => selectSide('memo'));

  workspace.append(library, editor, side);

  oldHeading?.remove();
  oldLibraryHeading?.remove();
  oldActions?.remove();

  host.append(header);
  if (warning) host.append(warning);
  host.append(workspace);
  if (message) host.append(message);

  function updateTitle() {
    title.textContent = nameInput.value.trim() || 'Новый сценарий';
  }

  function markPreviewStale() {
    updateTitle();
    syncSections();

    previewState.textContent = 'Обновление памятки…';
    previewState.classList.remove('is-stale');
  }

  form.addEventListener('input', markPreviewStale);
  statusInput.addEventListener('change', markPreviewStale);

  // mapInfo обновляется штатным модулем только после фактического
  // изменения снимка или открытия документа, а не при выборе карты.
  new MutationObserver(markPreviewStale).observe(mapInfo, {
    childList: true,
    characterData: true,
    subtree: true
  });

  new MutationObserver(() => {
    updateTitle();
    syncSections();

    previewState.textContent =
      'Живая памятка. Чтобы записать изменения в библиотеку, ' +
      'нажмите «Сохранить сценарий».';

    previewState.classList.remove('is-stale');
  }).observe(card, { childList: true });

  // Кнопка остаётся связанной со штатным обработчиком.
  // При открытии памятки она не обновляется автоматически:
  // несвежая версия явно помечена предупреждением.
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

  // Выбор исходной карты не меняет снимок сам по себе.
  const mapSelect = find('[data-s-map-select]');
  const attachButton = find('[data-s-attach-map]');
  const refreshButton = find('[data-s-refresh-maps]');

  const selectionHint = node(
    'p',
    'ws-muted ws-scenario-map-selection-hint'
  );

  mapSelect.closest('label').after(selectionHint);

  function syncMapSelection() {
    const option = mapSelect.selectedOptions[0];
    const selected = Boolean(mapSelect.value && option);

    attachButton.disabled = !selected;

    selectionHint.textContent = selected
      ? `Выбрана карта: ${option.textContent}. ` +
        'Чтобы прикрепить её копию к сценарию, нажмите ' +
        '«Взять снимок карты». Текущий снимок пока не изменён.'
      : 'Сначала выберите сохранённую карту. ' +
        'Если нужной карты нет, сохраните её в разделе «Карты».';
  }

  mapSelect.addEventListener('change', syncMapSelection);

  // Штатный refreshMaps() пересоздаёт option.
  // Наблюдатель только обновляет доступность кнопки и пояснение.
  new MutationObserver(syncMapSelection).observe(mapSelect, {
    childList: true,
    subtree: true,
    characterData: true
  });

  function isScenariosVisible() {
    return (
      !host.hidden &&
      host.getClientRects().length > 0 &&
      getComputedStyle(host).visibility !== 'hidden'
    );
  }

  let wasVisible = false;

  function refreshOnOpen() {
    const visible = isScenariosVisible();

    if (visible && !wasVisible) {
      // Используем штатную проверку и штатный источник карт.
      // Обновление списка не меняет снимок или dirty.
      refreshButton.click();
      syncMapSelection();
    }

    wasVisible = visible;
  }

  let visibilityFrame = null;

  function scheduleVisibilityCheck() {
    if (visibilityFrame !== null) return;

    visibilityFrame = requestAnimationFrame(() => {
      visibilityFrame = null;
      refreshOnOpen();
    });
  }

  // Переключение разделов через hidden/class/style.
  new MutationObserver(scheduleVisibilityCheck).observe(host, {
    attributes: true,
    attributeFilter: ['hidden', 'class', 'style']
  });

  // Также поддерживаем текущую навигацию по hash.
  window.addEventListener('hashchange', scheduleVisibilityCheck);

    // Быстрое сохранение только в видимом разделе сценариев.
  // Используем существующую кнопку, не обходим проверки.
  const scenarioSaveButton = host.querySelector('[data-s-save]');

  if (scenarioSaveButton) {
    scenarioSaveButton.setAttribute(
      'aria-keyshortcuts',
      'Meta+S Control+S'
    );

    scenarioSaveButton.title =
      'Сохранить сценарий · ⌘S / Ctrl+S';

    document.addEventListener('keydown', event => {
      const isSaveShortcut =
        event.code === 'KeyS' &&
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        !event.shiftKey;

      if (
        !isSaveShortcut ||
        event.defaultPrevented ||
        event.isComposing
      ) {
        return;
      }

      const visible =
        host.isConnected &&
        !host.hidden &&
        host.getClientRects().length > 0 &&
        getComputedStyle(host).visibility !== 'hidden';

      if (!visible) return;

      // Не вмешиваемся в просмотр карты или другое
      // открытое модальное окно.
      if (document.querySelector('dialog[open]')) return;

      // В редакторе сочетание сохраняет сценарий,
      // а не HTML-страницу браузера.
      event.preventDefault();

      if (
        event.repeat ||
        scenarioSaveButton.matches(':disabled')
      ) {
        return;
      }

      scenarioSaveButton.click();
    });
  }

  host.dataset.scenariosWorkspaceReady = 'true';

  updateTitle();
  syncSections();
  selectSide('map');
  syncMapSelection();
  scheduleVisibilityCheck();
}