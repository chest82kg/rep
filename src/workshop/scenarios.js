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

  function message(value, error = false) {
    const target = find('[data-s-message]');
    target.textContent = value;
    target.classList.toggle('is-error', error);
  }

  function updateButtons() {
    find('[data-s-save]').disabled = locked;
    find('[data-s-import]').disabled = locked || importing;
  }

  function setDirty(value) {
    dirty = value;

    find('[data-s-dirty]').textContent = value
      ? 'Есть несохранённые изменения'
      : '';
  }

  function changed() {
    generation += 1;
    setDirty(true);
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
    find('[data-s-map-info]').textContent = mapSnapshot
      ? `Снимок: ${mapSnapshot.name} · ` +
        `редакция ${mapSnapshot.revision} · ` +
        `местность: ${mapSnapshot.layers.terrain.length} тайлов · ` +
        `зоны: ${mapSnapshot.layers.deployment.length} клеток · ` +
        `КТ: ${mapSnapshot.layers.objectives.length} · ` +
        `маркеры: ${mapSnapshot.layers.markers.length}`
      : 'Снимок карты не прикреплён.';
  }

  function readDocument() {
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
      name: find('[data-s-name]').value.trim(),
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

  function fill(scenario) {
    generation += 1;

    current = scenario ? clone(scenario) : null;
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

    if (scenario) renderPreview(scenario);

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

  form.addEventListener('input', changed);
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
        `Взят снимок карты «${source.name}», ` +
        `редакция ${source.revision}. ` +
        'Нажмите «Обновить памятку» для просмотра и сохраните сценарий.'
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
      'Снимок убран из формы. ' +
      'Обновите памятку и сохраните сценарий.'
    );
  });

  find('[data-s-preview]').addEventListener('click', () => {
    try {
      renderPreview(readDocument());
      message('Памятка обновлена. Это не сохраняет сценарий.');
    } catch (error) {
      message(error.message, true);
    }
  });

  form.addEventListener('submit', event => {
    event.preventDefault();

    try {
      const scenario = readDocument();
      const next = clone(library);

      const index = next.scenarios.findIndex(
        item => item.id === scenario.id
      );

      if (index < 0) ensureSpace();

      scenario.revision = index < 0
        ? 1
        : next.scenarios[index].revision + 1;

      if (index < 0) {
        next.scenarios.push(scenario);
      } else {
        next.scenarios[index] = scenario;
      }

      persist(next);
      fill(scenario);
      renderList();

      message(`Сценарий «${scenario.name}» сохранён локально.`);
    } catch (error) {
      message(`Не сохранено: ${error.message}`, true);
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
      'Отмена удаления не предусмотрена.' +
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

      persist(next);

      if (current?.id === scenario.id) fill(null);

      renderList();
      message('Сценарий удалён. Исходная карта не изменена.');
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

  fill(null);
  renderList();
  updateButtons();

  if (!locked) {
    message(
      'Редактор сценариев готов. ' +
      'Сохранение и резервные копии выполняются отдельно от карт.'
    );
  }
}