// src/workshop/scenarios.js
//
// Локальные авторские сценарии.
// Карта хранится независимым снимком.
// Firebase, ростеры и партии не используются.
// Пользовательские строки выводятся через textContent.

import { createMapPreview } from './map-preview.js';

const KEY = 'mt_workshop_scenarios_v1';

const MAX_SCENARIOS = 100;
const MAX_RAW_LENGTH = 8 * 1024 * 1024;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_SECTION_LENGTH = 12000;

const SECTIONS = {
  preparation: 'Подготовка партии',
  deployment: 'Условия расстановки',
  duration: 'Продолжительность и завершение',
  scoring: 'Цели и начисление очков',
  specialRules: 'Особые правила'
};

const clone = value => JSON.parse(JSON.stringify(value));

// DOM-документ отделён от объектов сценариев.
const dom = window.document;

function record(value) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

function exactKeys(value, keys) {
  return record(value) &&
    Object.keys(value).length === keys.length &&
    keys.every(key => Object.hasOwn(value, key));
}

function text(value, max, required = false) {
  return typeof value === 'string' &&
    value.length <= max &&
    (!required || value.trim().length > 0);
}

function validDate(value) {
  return text(value, 100, true) &&
    Number.isFinite(Date.parse(value));
}

function statusLabel(value) {
  return value === 'test-ready'
    ? 'Готово к тесту'
    : 'Черновик';
}

function exportName(name) {
  const safe = name
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'scenario';

  return `mt-scenario-${safe}.json`;
}

export function initScenarios({ getMaps, validateMap }) {
  const host = dom.getElementById('ws-scenarios');

  if (!host) {
    throw new Error('Не найден раздел сценариев.');
  }

  if (
    typeof getMaps !== 'function' ||
    typeof validateMap !== 'function'
  ) {
    throw new Error('Не заданы источники карт для сценариев.');
  }

  if (host.dataset.scenariosInitialized) return;
  host.dataset.scenariosInitialized = 'true';

  let library = {
    format: 'mt-scenario-library',
    version: 1,
    scenarios: []
  };

  let expectedRaw = null;
  let locked = false;
  let current = null;
  let mapSnapshot = null;
  let dirty = false;
  let importing = false;
  let generation = 0;
  let previewTimer = null;
    let draftRecovery = null;

  function validSnapshot(map) {
    return Boolean(
      exactKeys(map, [
        'format', 'version', 'id', 'name', 'status',
        'revision', 'createdAt', 'updatedAt', 'board', 'layers'
      ]) &&
      exactKeys(map.board, ['width', 'height']) &&
      exactKeys(map.layers, [
        'terrain', 'deployment', 'objectives',
        'markers', 'decorations'
      ]) &&
      validateMap(map)
    );
  }

  function validScenario(value) {
    return Boolean(
      exactKeys(value, [
        'format', 'version', 'contentType',
        'id', 'revision', 'createdAt', 'updatedAt',
        'name', 'status', 'map', 'sections'
      ]) &&
      value.format === 'mt-scenario' &&
      value.version === 1 &&
      value.contentType === 'custom' &&
      text(value.id, 120, true) &&
      Number.isSafeInteger(value.revision) &&
      value.revision >= 1 &&
      validDate(value.createdAt) &&
      validDate(value.updatedAt) &&
      text(value.name, 120, true) &&
      ['draft', 'test-ready'].includes(value.status) &&
      (value.map === null || validSnapshot(value.map)) &&
      exactKeys(value.sections, Object.keys(SECTIONS)) &&
      Object.keys(SECTIONS).every(key =>
        text(value.sections[key], MAX_SECTION_LENGTH)
      )
    );
  }

    // Документы уже прошли проверку формата.
  // Порядок ключей объектов не важен,
  // порядок элементов массивов сохраняет значение.
  function sameJsonValue(left, right) {
    if (left === right) return true;

    if (Array.isArray(left) || Array.isArray(right)) {
      return (
        Array.isArray(left) &&
        Array.isArray(right) &&
        left.length === right.length &&
        left.every((value, index) =>
          sameJsonValue(value, right[index])
        )
      );
    }

    if (!record(left) || !record(right)) return false;

    const keys = Object.keys(left);

    return (
      keys.length === Object.keys(right).length &&
      keys.every(key =>
        Object.hasOwn(right, key) &&
        sameJsonValue(left[key], right[key])
      )
    );
  }

  function sameScenarioContent(left, right) {
    return (
      left.name === right.name &&
      left.status === right.status &&
      Object.keys(SECTIONS).every(key =>
        left.sections[key] === right.sections[key]
      ) &&
      sameJsonValue(left.map, right.map)
    );
  }

  function validLibrary(value) {
    if (
      !exactKeys(value, ['format', 'version', 'scenarios']) ||
      value.format !== 'mt-scenario-library' ||
      value.version !== 1 ||
      !Array.isArray(value.scenarios) ||
      value.scenarios.length > MAX_SCENARIOS
    ) {
      return false;
    }

    const ids = new Set();

    return value.scenarios.every(scenario => {
      if (!validScenario(scenario) || ids.has(scenario.id)) {
        return false;
      }

      ids.add(scenario.id);
      return true;
    });
  }

  // Только статическая разметка приложения.
  host.innerHTML = `
    <h2>Авторские сценарии</h2>

    <p class="ws-notice">
      Локальная памятка партии, без автоматического судейства.
      Подготовку, расстановку, раунды, цели и очки задаёт автор.
      Карта хранится независимым снимком.
      Изменение или удаление исходной карты не меняет сценарий.
    </p>

    <p data-s-warning
       class="ws-notice ws-error"
       role="alert"
       hidden></p>

    <div class="ws-actions">
      <button type="button"
              class="builder-action-btn"
              data-s-new>
        Новый сценарий
      </button>

      <button type="button"
              class="builder-action-btn"
              data-s-reload>
        Перезагрузить страницу
      </button>
    </div>

    <form data-s-form>
      <div class="ws-form-grid">
        <label>
          Название сценария
          <input data-s-name maxlength="120" required>
        </label>

        <label>
          Статус
          <select data-s-status>
            <option value="draft">Черновик</option>
            <option value="test-ready">Готово к тесту</option>
          </select>
        </label>
      </div>

      <p data-s-meta class="ws-muted"></p>

      <fieldset>
        <legend>Карта сценария</legend>

        <p class="ws-muted">
          Выберите сохранённую карту и нажмите
          «Взять снимок карты».
          Несохранённые изменения редактора карты сюда не попадают.
          Обновление списка само по себе не заменяет снимок.
        </p>

        <label>
          Сохранённые карты
          <select data-s-map-select></select>
        </label>

        <div class="ws-actions">
          <button type="button"
                  class="builder-action-btn"
                  data-s-refresh-maps>
            Обновить список карт
          </button>

          <button type="button"
                  class="builder-action-btn"
                  data-s-attach-map>
            Взять снимок карты
          </button>

          <button type="button"
                  class="builder-action-btn"
                  data-s-remove-map>
            Убрать снимок
          </button>
        </div>

        <p data-s-map-info class="ws-muted"></p>
      </fieldset>

      ${Object.entries(SECTIONS).map(([key, label]) => `
        <label class="ws-scenario-text">
          ${label}
          <textarea data-s-section="${key}"
                    rows="5"
                    maxlength="${MAX_SECTION_LENGTH}"></textarea>
        </label>
      `).join('')}

      <p class="ws-muted">
        Поля можно оставлять пустыми.
        «Готово к тесту» — отметка автора, а не автоматическая
        проверка полноты или баланса.
        Для каждой контрольной точки укажите порядок подсчёта
        в разделе целей и очков.
      </p>

      <div class="ws-actions">
        <button type="button"
                class="builder-action-btn"
                data-s-preview>
          Обновить памятку
        </button>

        <button type="submit"
                class="builder-action-btn primary"
                data-s-save>
          Сохранить сценарий
        </button>

        <span data-s-dirty class="ws-muted"></span>
      </div>
    </form>

    <section class="ws-transfer"
             aria-label="Перенос сценария JSON">
      <h3>Резервная копия сценария</h3>

      <div class="ws-actions">
        <button type="button"
                class="builder-action-btn"
                data-s-export>
          Экспорт JSON
        </button>

        <button type="button"
                class="builder-action-btn"
                data-s-import>
          Импорт JSON
        </button>
      </div>

      <input type="file"
             data-s-file
             accept=".json,application/json"
             aria-label="Файл сценария JSON"
             hidden>

      <p class="ws-muted">
        Экспорт включает текущий ввод и снимок карты,
        но не сохраняет изменения в библиотеку.
        Импорт сохраняет новую независимую копию.
        Максимальный размер файла — 2 МиБ.
      </p>
    </section>

    <p data-s-message
       class="ws-message"
       role="status"
       aria-live="polite"></p>

    <section data-s-card
             class="ws-scenario-preview"
             aria-label="Памятка сценария"></section>

    <h3>Локальная библиотека сценариев</h3>

    <label class="ws-search">
      Поиск по названию
      <input type="search"
             data-s-search
             maxlength="120">
    </label>

    <p data-s-count class="ws-muted"></p>
    <div data-s-list class="ws-library-list"></div>
  `;

  const find = selector => host.querySelector(selector);
  const form = find('[data-s-form]');
  const list = find('[data-s-list]');
  const card = find('[data-s-card]');
  const fileInput = find('[data-s-file]');

    // Последнее успешное удаление в текущем сеансе страницы.
  let lastDeletedScenario = null;

  const undoDeleteButton = dom.createElement('button');

  undoDeleteButton.type = 'button';
  undoDeleteButton.className = 'builder-action-btn';
  undoDeleteButton.textContent = 'Восстановить удалённый сценарий';
  undoDeleteButton.disabled = true;

  find('.ws-transfer .ws-actions').append(undoDeleteButton);

  function syncUndoDeleteButton() {
    undoDeleteButton.disabled =
      locked ||
      importing ||
      !lastDeletedScenario;

    undoDeleteButton.title = lastDeletedScenario
      ? `Восстановить: ${lastDeletedScenario.name}`
      : 'В текущем сеансе нет удалённого сценария';
  }

    const openBriefButton = dom.createElement('button');

  openBriefButton.type = 'button';
  openBriefButton.className = 'builder-action-btn';
  openBriefButton.textContent = 'Открыть памятку';
  openBriefButton.setAttribute('aria-haspopup', 'dialog');

  // Кнопка добавляется в renderPreview().
  // Так она сохраняется при перестройке оболочки
  // и каждом обновлении памятки.
  openBriefButton.classList.add('ws-scenario-open-brief');

    const saveAsNewButton = dom.createElement('button');

  saveAsNewButton.type = 'button';
  saveAsNewButton.className = 'builder-action-btn';
  saveAsNewButton.dataset.sSaveAsNew = '';
  saveAsNewButton.textContent = 'Сохранить как новый сценарий';

  find('.ws-transfer .ws-actions').prepend(saveAsNewButton);

    const revertButton = dom.createElement('button');

  revertButton.type = 'button';
  revertButton.className = 'builder-action-btn';
  revertButton.dataset.sRevert = '';
  revertButton.textContent = 'Вернуть сохранённую версию';
  revertButton.disabled = true;

  saveAsNewButton.after(revertButton);

  function syncRevertButton() {
    revertButton.disabled =
      locked ||
      importing ||
      !current ||
      !dirty;
  }

  function message(value, error = false) {
    const target = find('[data-s-message]');
    target.textContent = value;
    target.classList.toggle('is-error', error);
  }

  function updateButtons() {
    const saveButton = find('[data-s-save]');

    saveButton.disabled =
      locked ||
      importing ||
      Boolean(current && !dirty);

    saveButton.title = current && !dirty
      ? 'Нет несохранённых изменений.'
      : '';

    find('[data-s-import]').disabled = locked || importing;
    saveAsNewButton.disabled = locked || importing;

    syncRevertButton();
    syncUndoDeleteButton();
  }

  function setDirty(value) {
    dirty = value;

      const indicator = find('[data-s-dirty]');

    indicator.textContent = value
      ? 'Есть несохранённые изменения'
      : current
        ? 'Изменения сохранены'
        : 'Новый сценарий · ещё не сохранён';

    indicator.classList.toggle('has-unsaved-changes', value);

    updateButtons();

    if (value) draftRecovery?.schedule();
  }

  function schedulePreview() {
    clearTimeout(previewTimer);

    const scheduledGeneration = generation;

    previewTimer = setTimeout(() => {
      previewTimer = null;

      // Не обновляем старый черновик после открытия,
      // создания или сохранения другого документа.
      if (scheduledGeneration !== generation) return;

      try {
        renderPreview(readDocument({ draft: true }));
      } catch (error) {
        message(
          `Не удалось обновить памятку: ${error.message}`,
          true
        );
      }
    }, 350);
  }

  function changed() {
    generation += 1;
    setDirty(true);
    schedulePreview();
  }

  function lock(value) {
    locked = true;

    const warning = find('[data-s-warning]');
    warning.hidden = false;
    warning.textContent = value;

    updateButtons();
    renderList();
  }

  function persist(next) {
    if (locked) {
      throw new Error('Запись сценариев заблокирована.');
    }

    if (!validLibrary(next)) {
      throw new Error('Некорректная библиотека сценариев.');
    }

    const raw = JSON.stringify(next);

    if (raw.length > MAX_RAW_LENGTH) {
      throw new Error(
        'Превышен технический размер библиотеки сценариев.'
      );
    }

    if (localStorage.getItem(KEY) !== expectedRaw) {
      lock(
        'Библиотека сценариев изменена в другой вкладке. ' +
        'Запись заблокирована. Текущий ввод остаётся в форме; ' +
        'его можно экспортировать в JSON.'
      );

      throw new Error('Обнаружено внешнее изменение.');
    }

    // localStorage не даёт атомарного compare-and-set.
    localStorage.setItem(KEY, raw);

    expectedRaw = raw;
    library = next;
  }

  function refreshMaps() {
    const select = find('[data-s-map-select]');
    const previous = select.value;
    const maps = getMaps();

    if (!Array.isArray(maps) || !maps.every(validSnapshot)) {
      throw new Error(
        'Список карт содержит неподдерживаемые документы.'
      );
    }

    select.replaceChildren();

    const placeholder = dom.createElement('option');
    placeholder.value = '';
    placeholder.textContent = maps.length
      ? 'Выберите сохранённую карту'
      : 'Нет доступных сохранённых карт';

    select.append(placeholder);

    maps.forEach(map => {
      const option = dom.createElement('option');
      option.value = map.id;
      option.textContent =
        `${map.name} · редакция ${map.revision}`;

      select.append(option);
    });

    if (maps.some(map => map.id === previous)) {
      select.value = previous;
    }
  }

  function mapInfo() {
    const info = find('[data-s-map-info]');
    const field = info.closest('fieldset');

    let preview = field.querySelector('[data-s-attached-map-preview]');

    if (!preview) {
      preview = dom.createElement('div');
      preview.dataset.sAttachedMapPreview = '';
      preview.className = 'ws-scenario-attached-map';
      preview.setAttribute('aria-label', 'Прикреплённый снимок карты');

      info.after(preview);
    }

    preview.replaceChildren();

    find('[data-s-remove-map]').disabled = !mapSnapshot;

    if (!mapSnapshot) {
      info.textContent = 'Снимок карты не прикреплён.';

      const empty = dom.createElement('p');
      empty.className = 'ws-scenario-map-empty';

      empty.textContent =
        'Выберите сохранённую карту и нажмите «Взять снимок карты». ' +
        'Здесь появится её изображение.';

      preview.append(empty);
      return;
    }

    info.textContent =
      `Снимок: ${mapSnapshot.name} · ` +
      `редакция ${mapSnapshot.revision} · ` +
      `местность: ${mapSnapshot.layers.terrain.length} тайлов · ` +
      `зоны: ${mapSnapshot.layers.deployment.length} клеток · ` +
      `КТ: ${mapSnapshot.layers.objectives.length} · ` +
      `маркеры: ${mapSnapshot.layers.markers.length}`;

    preview.append(
      createMapPreview(mapSnapshot, {
        caption:
          'Прикреплённый снимок. Изменение исходной карты ' +
          'не обновляет его автоматически.'
      })
    );
  }

  function readDocument({ draft = false } = {}) {
    const now = new Date().toISOString();

    const sections = Object.fromEntries(
      Object.keys(SECTIONS).map(key => [
        key,
        find(`[data-s-section="${key}"]`).value
      ])
    );

    const scenario = {
      format: 'mt-scenario',
      version: 1,
      contentType: 'custom',
      id: current?.id || crypto.randomUUID(),
      revision: current?.revision || 1,
      createdAt: current?.createdAt || now,
      updatedAt: now,
            name: find('[data-s-name]').value.trim() ||
        (draft ? 'Новый сценарий' : ''),
      status: find('[data-s-status]').value,
      map: mapSnapshot ? clone(mapSnapshot) : null,
      sections
    };

    if (!validScenario(scenario)) {
      throw new Error(
        'Проверьте название, статус, длину текстов ' +
        'и формат снимка карты.'
      );
    }

    return scenario;
  }

  function renderPreview(scenario) {
    card.replaceChildren();

    // Перемещаем ту же кнопку, а не создаём новую:
    // обработчик открытия окна сохраняется.
    card.append(openBriefButton);

    function line(tag, value) {
      const node = dom.createElement(tag);
      node.textContent = value;
      card.append(node);
    }

    line('p', 'Авторский сценарий · ручное проведение партии');
    line('h3', scenario.name);
    line('p', statusLabel(scenario.status));

    if (scenario.map) {
      const map = scenario.map;

      line(
        'p',
        `${map.name} · ${map.board.width} × ${map.board.height} · ` +
        `редакция снимка ${map.revision}`
      );

      card.append(
        createMapPreview(map, {
          caption:
            'Снимок, прикреплённый к этой памятке. ' +
            'Изменение исходной карты в библиотеке ' +
            'не обновляет его автоматически.'
        })
      );

      const details = dom.createElement('details');
      const summary = dom.createElement('summary');
      const data = dom.createElement('pre');

      summary.textContent = 'Данные снимка карты JSON';
      data.textContent = JSON.stringify(map, null, 2);

      details.append(summary, data);
      card.append(details);
    } else {
      line('p', 'Карта не прикреплена.');
    }

    Object.entries(SECTIONS).forEach(([key, label]) => {
      line('h4', label);

      line(
        'p',
        scenario.sections[key].trim()
          ? scenario.sections[key]
          : 'Не указано.'
      );
    });

    line(
      'p',
      'Игроки применяют правила и подсчитывают очки вручную. ' +
      'Этот документ не изменяет текущую партию.'
    );
  }

  function syncOpenedScenario() {
    list.querySelectorAll('.ws-library-card').forEach(item => {
      const openButton = item.querySelector(
        '[data-scenario-action="open"]'
      );

      const opened = Boolean(
        current && openButton?.dataset.id === current.id
      );

      item.classList.toggle('is-open-document', opened);

      if (!openButton) return;

      openButton.textContent = opened ? 'Открыт' : 'Открыть';
      openButton.disabled = opened;

      if (opened) {
        openButton.setAttribute('aria-current', 'true');
        openButton.title =
          'Этот сценарий уже открыт в редакторе. ' +
          'Для отмены правок используйте ' +
          '«Документ → Вернуть сохранённую версию».';
      } else {
        openButton.removeAttribute('aria-current');
        openButton.removeAttribute('title');
      }
    });
  }

  function fill(scenario) {
    // Вызывается после подтверждённого перехода
    // или успешного сохранения документа.
    draftRecovery?.clearActive();

    clearTimeout(previewTimer);
    previewTimer = null;

    generation += 1;

    current = scenario ? clone(scenario) : null;
        syncOpenedScenario();

    const editor = host.querySelector('.ws-scenario-editor');

    if (editor) editor.scrollTop = 0;
    mapSnapshot = scenario?.map ? clone(scenario.map) : null;

    form.reset();

    find('[data-s-name]').value = scenario?.name || '';
    find('[data-s-status]').value = scenario?.status || 'draft';

    Object.keys(SECTIONS).forEach(key => {
      find(`[data-s-section="${key}"]`).value =
        scenario?.sections[key] || '';
    });

    find('[data-s-meta]').textContent = scenario
      ? `Редакция ${scenario.revision} · ` +
        `Изменено: ${
          new Date(scenario.updatedAt).toLocaleString('ru-RU')
        }`
      : 'Новый документ, ещё не сохранён.';

    mapInfo();
    setDirty(false);
    card.replaceChildren();
    
    renderPreview(
      scenario || readDocument({ draft: true })
    );

    try {
      refreshMaps();
    } catch (error) {
      message(error.message, true);
    }
  }

  function canDiscard() {
    return !dirty || confirm(
      'Отказаться от несохранённых изменений сценария? ' +
      'Сохранённая библиотека останется прежней.'
    );
  }

  function searchText(value) {
    return value
      .normalize('NFKC')
      .toLocaleLowerCase('ru-RU')
      .replace(/ё/g, 'е')
      .trim();
  }

  function renderList() {
    const query = searchText(find('[data-s-search]').value);

    const scenarios = library.scenarios
      .filter(item => searchText(item.name).includes(query))
      .sort((a, b) =>
        Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
      );

    find('[data-s-count]').textContent =
      `Показано ${scenarios.length} из ${library.scenarios.length}`;

    list.replaceChildren();

    if (!scenarios.length) {
      const empty = dom.createElement('p');
      empty.className = 'ws-muted';
      empty.textContent = query
        ? 'Сценарии не найдены.'
        : 'Сохранённых сценариев пока нет.';

      list.append(empty);
      return;
    }

    scenarios.forEach(scenario => {
      const item = dom.createElement('article');
      item.className = 'ws-library-card';

      const title = dom.createElement('h4');
      title.textContent = scenario.name;

      const meta = dom.createElement('p');
      meta.className = 'ws-muted';

      meta.textContent =
        `${statusLabel(scenario.status)} · ` +
        `редакция ${scenario.revision} · ` +
        (scenario.map
          ? `Карта: ${scenario.map.name}`
          : 'Без карты');

      const actions = dom.createElement('div');
      actions.className = 'ws-actions';

      for (const [action, label] of [
        ['open', 'Открыть'],
        ['copy', 'Создать копию'],
        ['delete', 'Удалить']
      ]) {
        const button = dom.createElement('button');

        button.type = 'button';
        button.className = 'builder-action-btn' +
          (action === 'delete' ? ' ws-delete' : '');

        button.dataset.scenarioAction = action;
        button.dataset.id = scenario.id;
        button.textContent = label;
        button.disabled = locked && action !== 'open';

        actions.append(button);
      }

      item.append(title, meta, actions);
      list.append(item);
    });
        syncOpenedScenario();
  }

  function independentCopy(source) {
    const result = clone(source);
    const now = new Date().toISOString();

    result.id = crypto.randomUUID();
    result.revision = 1;
    result.createdAt = now;
    result.updatedAt = now;

    if (library.scenarios.some(item => item.id === result.id)) {
      throw new Error(
        'Совпадение идентификаторов. Повторите операцию.'
      );
    }

    // Метаданные вложенной карты сохраняются.
    // Изменяемой ссылки на исходную карту здесь нет.
    return result;
  }

  function ensureSpace() {
    if (library.scenarios.length >= MAX_SCENARIOS) {
      throw new Error(
        `Достигнут технический предел: ${MAX_SCENARIOS} сценариев.`
      );
    }
  }

  // Отслеживаем именно поля сценария.
  // Переключатели и поиск внутри просмотра карты
  // не являются изменением документа.
  form.addEventListener('input', event => {
    if (!(event.target instanceof Element)) return;

    if (
      event.target.matches(
        '[data-s-name], [data-s-section]'
      )
    ) {
      changed();
    }
  });

  find('[data-s-status]').addEventListener('change', changed);

  find('[data-s-new]').addEventListener('click', () => {
    if (!canDiscard()) return;

    fill(null);
    message('Новый сценарий. Заполните поля и сохраните.');
  });

  find('[data-s-reload]').addEventListener('click', () => {
    if (confirm(
      'Перезагрузить страницу?\n\n' +
      'Несохранённые изменения сценария, карты и авторской модели ' +
      'могут быть потеряны. Сначала сохраните нужные документы.'
    )) {
      location.reload();
    }
  });

  find('[data-s-refresh-maps]').addEventListener('click', () => {
    try {
      refreshMaps();
      message(
        'Список карт обновлён. Прикреплённый снимок не изменён.'
      );
    } catch (error) {
      message(error.message, true);
    }
  });

  find('[data-s-attach-map]').addEventListener('click', () => {
    try {
      const id = find('[data-s-map-select]').value;
      const maps = getMaps();

      if (!Array.isArray(maps)) {
        throw new Error('Список карт недоступен.');
      }

      const source = maps.find(map => map.id === id);

      if (!source || !validSnapshot(source)) {
        throw new Error('Выберите доступную сохранённую карту.');
      }

      if (mapSnapshot && !confirm(
        'Заменить снимок карты в сценарии?\n\n' +
        'Текст сценария не изменится. Проверьте, что условия ' +
        'расстановки и цели соответствуют новой карте.'
      )) {
        return;
      }

      mapSnapshot = clone(source);
      changed();
      mapInfo();

      message(
        `Прикреплён снимок карты «${source.name}», ` +
        `редакция ${source.revision}. ` +
        'Карта показана справа, памятка обновляется автоматически. ' +
        'Сохраните сценарий, чтобы записать изменения.'
      );
    } catch (error) {
      message(error.message, true);
    }
  });

  find('[data-s-remove-map]').addEventListener('click', () => {
    if (!mapSnapshot) return;

    if (!confirm(
      'Убрать снимок карты из сценария? ' +
      'Исходная карта и текст сценария останутся прежними.'
    )) {
      return;
    }

    mapSnapshot = null;
    changed();
    mapInfo();

     message(
      'Снимок убран из формы. Памятка обновляется автоматически. ' +
      'Сохраните сценарий, чтобы записать изменения.'
    );
  });

  find('[data-s-preview]').addEventListener('click', () => {
    clearTimeout(previewTimer);
    previewTimer = null;

    try {
      renderPreview(readDocument({ draft: true }));

      message(
        'Черновая памятка обновлена. ' +
        'Изменения записываются только кнопкой ' +
        '«Сохранить сценарий».'
      );
    } catch (error) {
      message(error.message, true);
    }
  });
  revertButton.addEventListener('click', () => {
    if (
      locked ||
      importing ||
      !current ||
      !dirty
    ) {
      return;
    }

    try {
      // Не восстанавливаем устаревшую версию, если библиотека
      // уже изменилась, а storage-событие ещё не обработано.
      if (localStorage.getItem(KEY) !== expectedRaw) {
        lock(
          'Библиотека сценариев изменена в другой вкладке. ' +
          'Возврат сохранённой версии заблокирован. ' +
          'Текущий ввод остаётся в форме; ' +
          'его можно экспортировать в JSON.'
        );

        return;
      }

      const saved = library.scenarios.find(
        scenario => scenario.id === current.id
      );

      if (!saved) {
        throw new Error(
          'Сохранённый сценарий не найден. ' +
          'Текущий ввод оставлен без изменений.'
        );
      }

      if (!confirm(
        `Вернуть сохранённую версию «${saved.name}»?\n\n` +
        'Несохранённые изменения названия, статуса, ' +
        'всех текстовых разделов и снимка карты будут отброшены.\n\n' +
        'Сама библиотека не изменится.'
      )) {
        return;
      }

      // Используем штатное заполнение:
      // оно отменяет отложенный предпросмотр,
      // обновляет карту и очищает активный временный черновик.
      fill(saved);

      // Закрываем меню, чтобы сразу видеть результат.
      const documentMenu = revertButton.closest('details');

      if (documentMenu) {
        documentMenu.open = false;

        documentMenu.querySelector('summary')
          ?.focus({ preventScroll: true });
      }

      message(
        `Восстановлена сохранённая версия «${saved.name}», ` +
        `редакция ${saved.revision}. ` +
        'Несохранённые правки отброшены. Библиотека не изменена.'
      );
    } catch (error) {
      message(
        `Не удалось вернуть сохранённую версию: ${error.message}`,
        true
      );
    }
  });

    saveAsNewButton.addEventListener('click', () => {
    if (locked || importing) return;

    // Кнопка находится вне формы.
    // Проверяем обязательное название штатным механизмом.
    if (!form.reportValidity()) return;

    try {
      ensureSpace();

      // Читаем текущие тексты и прикреплённый снимок,
      // а не сохранённую версию из библиотеки.
      const source = readDocument();
      const prepared = independentCopy(source);
      const suffix = ' — вариант';

      prepared.name =
        source.name
          .slice(0, 120 - suffix.length)
          .trimEnd() +
        suffix;

      // Изменённый вариант требует нового авторского теста.
      // Оригинальный статус при этом не меняется.
      prepared.status = 'draft';

      if (!validScenario(prepared)) {
        throw new Error(
          'Не удалось подготовить новый вариант сценария.'
        );
      }

      if (!confirm(
        `Сохранить «${prepared.name}» как новый сценарий?\n\n` +
        'Будут использованы текущие тексты и прикреплённый ' +
        'снимок карты. Исходный сценарий останется прежним.\n\n' +
        'Новый вариант получит статус «Черновик» ' +
        'и откроется в редакторе.'
      )) {
        return;
      }

      const next = clone(library);
      next.scenarios.push(prepared);

      // Сначала успешная запись.
      // При ошибке текущий ввод остаётся в редакторе.
      persist(next);

      fill(prepared);
      renderList();

      message(
        `Вариант «${prepared.name}» сохранён и открыт. ` +
        'Исходный сценарий не изменён. ' +
        'Статус нового варианта — «Черновик».'
      );
    } catch (error) {
      message(
        `Новый вариант не сохранён: ${error.message}`,
        true
      );
    }
  });

    openBriefButton.addEventListener('click', () => {
    if (dom.querySelector('dialog[open]')) return;

    try {
      // Черновое чтение допускает пустое название,
      // но проверяет поддерживаемый формат содержимого.
      const scenario = readDocument({ draft: true });

      const dialog = dom.createElement('dialog');
      dialog.className = 'ws-scenario-brief-dialog';
      dialog.setAttribute('aria-label', 'Полная памятка сценария');

      function node(tag, className = '', value = '') {
        const result = dom.createElement(tag);

        if (className) result.className = className;
        if (value !== '') result.textContent = value;

        return result;
      }

      const header = node('div', 'ws-scenario-brief-header');
      const titleBox = node('div');

      titleBox.append(
        node('h2', '', scenario.name),
        node(
          'p',
          '',
          `${statusLabel(scenario.status)} · ` +
          'текущий ввод редактора · только просмотр'
        )
      );

      const closeButton = node(
        'button',
        'builder-action-btn',
        'Закрыть ×'
      );

      closeButton.type = 'button';
      closeButton.autofocus = true;

      header.append(titleBox, closeButton);

      const body = node('div', 'ws-scenario-brief-body');

      body.append(
        node(
          'p',
          'ws-scenario-brief-notice',
          'Открытие памятки не сохраняет изменения. ' +
          'Правила, эффекты и подсчёт очков игроки применяют вручную.'
        )
      );

      if (scenario.map) {
        body.append(
          createMapPreview(scenario.map, {
            // Внутри диалога не открываем второй
            // модальный просмотр поверх первого.
            expandable: false,
            caption:
              'Прикреплённый снимок сценария. ' +
              'Исходная карта из библиотеки здесь не подменяется.'
          })
        );
      } else {
        body.append(
          node(
            'p',
            'ws-scenario-brief-notice',
            'Карта к сценарию не прикреплена.'
          )
        );
      }

      let filledSections = 0;

      for (const [key, label] of Object.entries(SECTIONS)) {
        const content = scenario.sections[key];

        if (!content.trim()) continue;

        filledSections += 1;

        const section = node(
          'section',
          'ws-scenario-brief-section'
        );

        section.append(
          node('h3', '', label),
          node('p', '', content)
        );

        body.append(section);
      }

      if (!filledSections) {
        body.append(
          node(
            'p',
            'ws-scenario-brief-notice',
            'Текстовые разделы пока не заполнены.'
          )
        );
      }

      dialog.append(header, body);

      function restoreFocus() {
        if (
          openBriefButton.isConnected &&
          openBriefButton.getClientRects().length > 0
        ) {
          openBriefButton.focus({ preventScroll: true });
        }
      }

      closeButton.addEventListener('click', () => {
        dialog.close();
      });

      // Esc закрывает нативный dialog.
      dialog.addEventListener('close', () => {
        dialog.remove();
        restoreFocus();
      }, { once: true });

      dom.body.append(dialog);

      try {
        dialog.showModal();
      } catch (error) {
        dialog.remove();
        restoreFocus();
        throw error;
      }
    } catch (error) {
      message(
        `Не удалось открыть памятку: ${error.message}`,
        true
      );
    }
  });

   form.addEventListener('submit', event => {
    event.preventDefault();

    if (locked) {
      message(
        'Сохранение недоступно: запись библиотеки заблокирована. ' +
        'Текущий ввод остаётся в форме.',
        true
      );
      return;
    }

    if (importing) {
      message(
        'Дождитесь завершения импорта. ' +
        'Текущий ввод остаётся в форме.'
      );
      return;
    }

    if (current && !dirty) {
      message(
        'Нет несохранённых изменений. ' +
        'Номер редакции и библиотека не изменены.'
      );
      return;
    }

    try {
      const scenario = readDocument();

      const index = library.scenarios.findIndex(
        item => item.id === scenario.id
      );

      if (
        index >= 0 &&
        sameScenarioContent(scenario, library.scenarios[index])
      ) {
        // Даже без записи нельзя подтверждать сохранение
        // относительно устаревшей библиотеки.
        if (localStorage.getItem(KEY) !== expectedRaw) {
          lock(
            'Библиотека сценариев изменена в другой вкладке. ' +
            'Подтверждение сохранения заблокировано. ' +
            'Текущий ввод остаётся в форме; ' +
            'его можно экспортировать в JSON.'
          );

          throw new Error('Обнаружено внешнее изменение.');
        }

        const saved = library.scenarios[index];

        clearTimeout(previewTimer);
        previewTimer = null;

        // Форму и снимок не заменяем.
        // Снимаем dirty и очищаем только активный черновик.
        // Ещё не рассмотренный найденный черновик сохраняется.
        setDirty(false);
        draftRecovery?.clearActive();

        renderPreview(scenario);

        message(
          `Содержимое сценария «${saved.name}» ` +
          'совпадает с сохранённой версией. ' +
          `Редакция ${saved.revision} не изменена. ` +
          'Повторная запись не требуется.'
        );

        return;
      }

      if (index < 0) ensureSpace();

      const next = clone(library);

      scenario.revision = index < 0
        ? 1
        : next.scenarios[index].revision + 1;

      if (index < 0) {
        next.scenarios.push(scenario);
      } else {
        next.scenarios[index] = scenario;
      }

      // Форма меняется только после успешной записи.
      persist(next);

      fill(scenario);
      renderList();

      message(`Сценарий «${scenario.name}» сохранён локально.`);
    } catch (error) {
      message(`Не сохранено: ${error.message}`, true);
    }
  });

    undoDeleteButton.addEventListener('click', () => {
    if (
      locked ||
      importing ||
      !lastDeletedScenario
    ) {
      return;
    }

    try {
      ensureSpace();

      const restored = clone(lastDeletedScenario);

      // Не перезаписываем существующую запись.
      if (
        library.scenarios.some(
          scenario => scenario.id === restored.id
        )
      ) {
        throw new Error(
          'Сценарий с таким идентификатором уже существует. ' +
          'Восстановление не выполнено, чтобы не перезаписать его.'
        );
      }

      if (!validScenario(restored)) {
        throw new Error(
          'Удалённая копия не прошла проверку.'
        );
      }

      const next = clone(library);
      next.scenarios.push(restored);

      // Штатный persist проверяет внешние изменения,
      // ограничения и успешность записи.
      persist(next);

      lastDeletedScenario = null;
      syncUndoDeleteButton();

      // Форму не заполняем: текущий ввод, dirty
      // и его временный черновик остаются прежними.
      renderList();

      message(
        `Сценарий «${restored.name}» восстановлен ` +
        'в библиотеке вместе со снимком карты. ' +
        'Текущая форма не изменена. ' +
        'Чтобы открыть его, выберите сценарий в библиотеке.'
      );
    } catch (error) {
      // При ошибке копию не удаляем — можно повторить действие.
      message(
        `Не удалось восстановить сценарий: ${error.message}`,
        true
      );
    }
  });

  find('[data-s-search]').addEventListener('input', renderList);

  list.addEventListener('click', event => {
    const button = event.target.closest('[data-scenario-action]');

    if (!button || button.disabled) return;

    const scenario = library.scenarios.find(
      item => item.id === button.dataset.id
    );

    if (!scenario) return;

    const action = button.dataset.scenarioAction;

    if (action === 'open') {
      // Текущий документ уже находится в форме.
      // Повторное открытие не должно сбрасывать ввод,
      // прикреплённый снимок и временный черновик.
      if (current?.id === scenario.id) return;

      if (!canDiscard()) return;

      fill(scenario);
      message(`Открыт сценарий «${scenario.name}».`);
      return;
    }

    if (action === 'copy') {
      try {
        ensureSpace();

        const copy = independentCopy(scenario);
        copy.name = `${scenario.name.slice(0, 110)} — копия`;
        copy.status = 'draft';

        const next = clone(library);
        next.scenarios.push(copy);

        persist(next);
        renderList();

        message(
          `Копия «${copy.name}» сохранена. ` +
          'Текущая форма не изменена.'
        );
      } catch (error) {
        message(`Копия не создана: ${error.message}`, true);
      }

      return;
    }

    if (action !== 'delete') return;

    if (!confirm(
      `Удалить сценарий «${scenario.name}»?\n\n` +
            'Последний удалённый сценарий можно восстановить через ' +
      '«Документ» до перезагрузки страницы. ' +
      'Следующее удаление заменит эту возможность.' +
      (current?.id === scenario.id && dirty
        ? '\nНесохранённые изменения этого сценария будут потеряны.'
        : '')
    )) {
      return;
    }

    try {
      const next = clone(library);

      next.scenarios = next.scenarios.filter(
        item => item.id !== scenario.id
      );

      // Подготавливаем копию до записи, но делаем её доступной
      // для восстановления только после успешного удаления.
      const removed = clone(scenario);

      persist(next);

      lastDeletedScenario = removed;
      syncUndoDeleteButton();

      if (current?.id === scenario.id) fill(null);

      renderList();

      message(
        `Сценарий «${scenario.name}» удалён. ` +
        'Его можно восстановить через «Документ» ' +
        'до следующего удаления или перезагрузки страницы. ' +
        'Исходная карта не изменена.'
      );
    } catch (error) {
      message(`Не удалено: ${error.message}`, true);
    }
  });

  find('[data-s-export]').addEventListener('click', () => {
    let url = null;
    let link = null;

    try {
      const scenario = readDocument();
      const raw = JSON.stringify(scenario, null, 2);

      const blob = new Blob([raw], {
        type: 'application/json;charset=utf-8'
      });

      if (blob.size > MAX_FILE_BYTES) {
        throw new Error('Размер экспорта превышает 2 МиБ.');
      }

      url = URL.createObjectURL(blob);

      link = dom.createElement('a');
      link.href = url;
      link.download = exportName(scenario.name);

      dom.body.append(link);
      link.click();

      message(
        'Запрошено скачивание JSON. Проверьте загрузки браузера. ' +
        'Библиотека не изменена; текущий ввод не отмечен сохранённым.'
      );
    } catch (error) {
      message(`Экспорт не выполнен: ${error.message}`, true);
    } finally {
      link?.remove();

      if (url) {
        const savedUrl = url;
        setTimeout(() => URL.revokeObjectURL(savedUrl), 10000);
      }
    }
  });

  find('[data-s-import]').addEventListener('click', () => {
    if (locked || importing) return;

    fileInput.value = '';
    fileInput.click();
  });

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];

    if (!file || importing || locked) return;

    importing = true;
    updateButtons();

    const startedGeneration = generation;

    try {
      ensureSpace();

      if (!file.size || file.size > MAX_FILE_BYTES) {
        throw new Error(
          'Выберите непустой JSON размером не более 2 МиБ.'
        );
      }

      const raw = await file.text();

      if (raw.length > MAX_FILE_BYTES) {
        throw new Error('Содержимое файла слишком большое.');
      }

      const source = JSON.parse(raw.replace(/^\uFEFF/, ''));

      if (!validScenario(source)) {
        throw new Error(
          'Ожидается один сценарий mt-scenario версии 1 ' +
          'с поддерживаемой картой и текстовыми разделами. ' +
          'Неизвестные поля не принимаются.'
        );
      }

      if (locked) {
        throw new Error('Запись библиотеки заблокирована.');
      }

      if (generation !== startedGeneration) {
        throw new Error(
          'За время чтения файла редактор изменился. ' +
          'Импорт отменён, чтобы не заменить новый ввод.'
        );
      }

      ensureSpace();

      if (!canDiscard()) {
        message('Импорт отменён. Форма и библиотека не изменены.');
        return;
      }

      const imported = independentCopy(source);
      const next = clone(library);
      next.scenarios.push(imported);

      persist(next);
      fill(imported);
      renderList();

      message(
        `Сценарий «${imported.name}» импортирован ` +
        'и сохранён отдельной копией.'
      );
    } catch (error) {
      message(`Импорт не выполнен: ${error.message}`, true);
    } finally {
      importing = false;
      fileInput.value = '';
      updateButtons();
    }
  });

  window.addEventListener('beforeunload', event => {
    if (!dirty) return;

    event.preventDefault();
    event.returnValue = '';
  });

  window.addEventListener('storage', event => {
    if (
      event.storageArea !== localStorage ||
      (event.key !== KEY && event.key !== null)
    ) {
      return;
    }

    try {
      if (localStorage.getItem(KEY) === expectedRaw) return;

      lock(
        'Библиотека сценариев изменена или удалена в другой вкладке. ' +
        'Запись заблокирована. Текущий ввод остаётся в форме. ' +
        'Для его переноса можно использовать экспорт JSON.'
      );
    } catch (error) {
      lock(`Не удалось проверить сценарии: ${error.message}`);
    }
  });

  try {
    expectedRaw = localStorage.getItem(KEY);

    if (expectedRaw !== null) {
      if (expectedRaw.length > MAX_RAW_LENGTH) {
        throw new Error(
          'Библиотека превышает поддерживаемый размер.'
        );
      }

      const saved = JSON.parse(expectedRaw);

      if (!validLibrary(saved)) {
        throw new Error(
          'Повреждённый или неподдерживаемый формат.'
        );
      }

      library = saved;
    }
  } catch (error) {
    lock(
      `Библиотека сценариев недоступна: ${error.message} ` +
      'Исходное сохранение не изменено. Запись заблокирована.'
    );
  }

    function createDraftRecovery() {
    const DRAFT_KEY = 'mt_workshop_scenario_draft_v1';

    // Отдельный технический предел временной копии.
    // Реальная квота sessionStorage зависит от браузера.
    const MAX_DRAFT_LENGTH = 4 * 1024 * 1024;

    let timer = null;
    let pending = null;
    let unavailable = false;

    const nameField = find('[data-s-name]');
    const statusField = find('[data-s-status]');

    const sectionFields = Object.fromEntries(
      Object.keys(SECTIONS).map(key => [
        key,
        find(`[data-s-section="${key}"]`)
      ])
    );

    const panel = dom.createElement('section');
    panel.className = 'ws-scenario-draft-recovery';
    panel.setAttribute('aria-label', 'Восстановление сценария');
    panel.hidden = true;

    const heading = dom.createElement('strong');
    heading.textContent = 'Найден несохранённый сценарий';

    const description = dom.createElement('p');

    const actions = dom.createElement('div');
    actions.className = 'ws-actions';

    const restoreButton = dom.createElement('button');
    restoreButton.type = 'button';
    restoreButton.className = 'builder-action-btn primary';
    restoreButton.textContent = 'Восстановить черновик';

    const discardButton = dom.createElement('button');
    discardButton.type = 'button';
    discardButton.className = 'builder-action-btn';
    discardButton.textContent = 'Удалить черновик';

    actions.append(restoreButton, discardButton);
    panel.append(heading, description, actions);

    // Панель остаётся в форме после перестройки оболочки.
    form.prepend(panel);

    function cancelTimer() {
      clearTimeout(timer);
      timer = null;
    }

    function reportUnavailable() {
      if (unavailable) return;

      unavailable = true;

      message(
        'Временная копия сценария недоступна или превышает ' +
        'доступное место. Текущий ввод остаётся в редакторе, ' +
        'но восстановление после перезагрузки не гарантируется. ' +
        'Сохраните сценарий в библиотеку или экспортируйте JSON.',
        true
      );
    }

    function validDraft(value) {
      return Boolean(
        exactKeys(value, [
          'format', 'version', 'savedAt', 'base', 'values'
        ]) &&
        value.format === 'mt-scenario-draft' &&
        value.version === 1 &&
        validDate(value.savedAt) &&
        (
          value.base === null ||
          validScenario(value.base)
        ) &&
        exactKeys(value.values, [
          'name', 'status', 'sections', 'map'
        ]) &&
        text(value.values.name, 120) &&
        ['draft', 'test-ready'].includes(value.values.status) &&
        exactKeys(
          value.values.sections,
          Object.keys(SECTIONS)
        ) &&
        Object.keys(SECTIONS).every(key =>
          text(
            value.values.sections[key],
            MAX_SECTION_LENGTH
          )
        ) &&
        (
          value.values.map === null ||
          validSnapshot(value.values.map)
        )
      );
    }

    function removeStored() {
      try {
        sessionStorage.removeItem(DRAFT_KEY);
        return true;
      } catch {
        reportUnavailable();
        return false;
      }
    }

    function flush() {
      cancelTimer();

      // Найденный черновик не затираем новым вводом,
      // пока пользователь не примет решение.
      if (!dirty || pending || unavailable) return false;

      try {
        const draft = {
          format: 'mt-scenario-draft',
          version: 1,
          savedAt: new Date().toISOString(),

          // Сохранённая версия нужна для проверки:
          // можно ли продолжить исходный документ.
          base: current ? clone(current) : null,

          values: {
            name: nameField.value,
            status: statusField.value,

            sections: Object.fromEntries(
              Object.entries(sectionFields).map(
                ([key, field]) => [key, field.value]
              )
            ),

            // Только уже прикреплённый снимок.
            // Выбор в списке карт сюда не попадает.
            map: mapSnapshot ? clone(mapSnapshot) : null
          }
        };

        if (!validDraft(draft)) {
          throw new Error('Некорректный временный черновик.');
        }

        const raw = JSON.stringify(draft);

        if (raw.length > MAX_DRAFT_LENGTH) {
          throw new Error('Временный черновик слишком большой.');
        }

        sessionStorage.setItem(DRAFT_KEY, raw);
        return true;
      } catch {
        reportUnavailable();
        return false;
      }
    }

    function schedule() {
      cancelTimer();

      if (pending || unavailable) return;

      timer = setTimeout(flush, 400);
    }

    function clearActive() {
      cancelTimer();

      // Не удаляем ещё не рассмотренный найденный черновик.
      if (pending) return;

      removeStored();
    }

    restoreButton.addEventListener('click', () => {
      if (!pending || !canDiscard()) return;

      const draft = pending;

      const original = draft.base
        ? library.scenarios.find(
            scenario => scenario.id === draft.base.id
          )
        : null;

      // Продолжаем старую запись только при точном совпадении
      // с её сохранённой версией. Иначе создаём новый документ.
      const sameBase = Boolean(
        !locked &&
        original &&
        JSON.stringify(original) === JSON.stringify(draft.base)
      );

      const detached = Boolean(draft.base && !sameBase);

      // Пока pending установлен, fill() не удаляет
      // найденную временную копию.
      fill(sameBase ? original : null);

      nameField.value = draft.values.name;
      statusField.value = draft.values.status;

      for (const key of Object.keys(SECTIONS)) {
        sectionFields[key].value =
          draft.values.sections[key];
      }

      mapSnapshot = draft.values.map
        ? clone(draft.values.map)
        : null;

      clearTimeout(previewTimer);
      previewTimer = null;

      generation += 1;

      mapInfo();
      renderPreview(readDocument({ draft: true }));

      pending = null;
      panel.hidden = true;

      setDirty(true);
      flush();

      message(
        detached
          ? 'Черновик восстановлен как новый сценарий: ' +
            'исходная запись изменена, удалена или библиотека ' +
            'заблокирована. Тексты и прикреплённый снимок ' +
            'восстановлены; библиотека не изменена.'
          : 'Черновик сценария восстановлен вместе ' +
            'с прикреплённым снимком карты. ' +
            'Для записи в библиотеку нажмите ' +
            '«Сохранить сценарий».'
      );
    });

    discardButton.addEventListener('click', () => {
      if (!pending) return;

      if (!confirm(
        'Удалить найденный временный черновик сценария?\n\n' +
        'Текущая форма, сохранённые сценарии и карты ' +
        'останутся прежними.'
      )) {
        return;
      }

      if (!removeStored()) return;

      pending = null;
      panel.hidden = true;

      // Если новая форма уже редактировалась,
      // начинаем сохранять временную копию именно её.
      if (dirty) flush();

      message(
        'Найденный черновик удалён. ' +
        'Текущая форма и библиотека не изменены.'
      );
    });

    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);

      if (raw !== null) {
        if (raw.length > MAX_DRAFT_LENGTH) {
          throw new Error('Превышен размер черновика.');
        }

        const saved = JSON.parse(raw);

        if (!validDraft(saved)) {
          throw new Error('Неподдерживаемый черновик.');
        }

        pending = saved;

        const savedTime = new Date(saved.savedAt)
          .toLocaleString('ru-RU');

        description.textContent =
          `Временная копия от ${savedTime}. ` +
          'Восстанавливаются название, статус, все разделы ' +
          'и прикреплённый снимок карты. ' +
          'Пока вы не восстановите или не удалите этот черновик, ' +
          'новый ввод не заменяет его временную копию.';

        panel.hidden = false;
      }
    } catch {
      // Повреждённую или неизвестную копию не затираем.
      reportUnavailable();
    }

    // Подстраховка на случай, если таймер ещё не сработал.
    window.addEventListener('beforeunload', flush);
    window.addEventListener('pagehide', flush);

    dom.addEventListener('visibilitychange', () => {
      if (dom.visibilityState === 'hidden') flush();
    });

    return {
      schedule,
      clearActive
    };
  }

  fill(null);
  renderList();
  updateButtons();

  if (!locked) {
    message(
      'Редактор сценариев готов. ' +
      'Сохранение и резервные копии выполняются отдельно от карт.'
    );
  }

  // После стартового fill(), чтобы найденный черновик
  // не удалился во время инициализации.
  draftRecovery = createDraftRecovery();
}