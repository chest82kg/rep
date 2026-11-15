// src/virtual-table/scenarios.js
//
// Сценарии мастерской на локальном ручном столе.
//
// Памятка, местность, зоны и маркеры загружаются через commit.
// КТ загружаются отдельным подтверждаемым действием.
// Армии, модели, раунд и игровые отметки не сбрасываются.
// Графический просмотр показывает снимок, а не текущее поле.

import {
  validWorkshopTerrain
} from '../workshop/terrain-editor.js';

import {
  validDeployment
} from '../workshop/deployment.js';

import {
  validMapObjectives
} from '../workshop/objectives.js';

import {
  validMapMarkers
} from '../workshop/markers.js';

import {
  createMapPreview
} from '../workshop/map-preview.js';

import { validateTerrain } from './terrain.js';

import {
  replaceObjectivesFromMap
} from './objectives.js';

const KEY = 'mt_workshop_scenarios_v1';

const MAX_RAW_LENGTH = 8 * 1024 * 1024;
const MAX_SCENARIOS = 100;
const MAX_SECTION_LENGTH = 12000;

const SECTION_LABELS = {
  preparation: 'Подготовка партии',
  deployment: 'Условия расстановки',
  duration: 'Продолжительность и завершение',
  scoring: 'Цели и начисление очков',
  specialRules: 'Особые правила'
};

const clone = value => JSON.parse(JSON.stringify(value));

let previewHost = null;
let pointsButton = null;
let detachButton = null;
let renderedRaw = undefined;

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

function validMap(map) {
  return Boolean(
    exactKeys(map, [
      'format', 'version', 'id', 'name', 'status',
      'revision', 'createdAt', 'updatedAt', 'board', 'layers'
    ]) &&
    map.format === 'mt-map' &&
    map.version === 1 &&
    text(map.id, 120, true) &&
    text(map.name, 120, true) &&
    ['draft', 'test-ready'].includes(map.status) &&
    Number.isSafeInteger(map.revision) &&
    map.revision >= 1 &&
    validDate(map.createdAt) &&
    validDate(map.updatedAt) &&
    exactKeys(map.board, ['width', 'height']) &&
    map.board.width === 14 &&
    map.board.height === 14 &&
    exactKeys(map.layers, [
      'terrain', 'deployment', 'objectives',
      'markers', 'decorations'
    ]) &&
    validWorkshopTerrain(map.layers.terrain) &&
    validDeployment(map.layers.deployment) &&
    validMapObjectives(map.layers.objectives) &&
    validMapMarkers(map.layers.markers) &&
    Array.isArray(map.layers.decorations) &&
    map.layers.decorations.length === 0
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
    (value.map === null || validMap(value.map)) &&
    exactKeys(value.sections, Object.keys(SECTION_LABELS)) &&
    Object.keys(SECTION_LABELS).every(key =>
      text(value.sections[key], MAX_SECTION_LENGTH)
    )
  );
}

// Старые партии без scenario остаются допустимыми.
export function validTableScenario(value) {
  return value === undefined ||
    value === null ||
    validScenario(value);
}

function readLibrary() {
  const raw = localStorage.getItem(KEY);

  if (raw === null) {
    return { raw, scenarios: [] };
  }

  if (raw.length > MAX_RAW_LENGTH) {
    throw new Error('Библиотека сценариев слишком большая.');
  }

  const library = JSON.parse(raw);

  if (
    !exactKeys(library, ['format', 'version', 'scenarios']) ||
    library.format !== 'mt-scenario-library' ||
    library.version !== 1 ||
    !Array.isArray(library.scenarios) ||
    library.scenarios.length > MAX_SCENARIOS
  ) {
    throw new Error(
      'Неподдерживаемый формат библиотеки сценариев.'
    );
  }

  const ids = new Set();

  for (const scenario of library.scenarios) {
    if (!validScenario(scenario) || ids.has(scenario.id)) {
      throw new Error(
        'В библиотеке есть повреждённый ' +
        'или неподдерживаемый сценарий.'
      );
    }

    ids.add(scenario.id);
  }

  return { raw, scenarios: library.scenarios };
}

function prepareLayers(map) {
  if (!validMap(map)) {
    throw new Error('Снимок карты не прошёл проверку.');
  }

  const terrain = map.layers.terrain.map(tile => ({
    id: crypto.randomUUID(),
    type: tile.type,
    x: tile.x,
    y: tile.y,
    height: tile.height,
    cells: tile.cells.map(cell => ({
      x: cell.x,
      y: cell.y
    }))
  }));

  const deployment = map.layers.deployment.map(cell => ({
    x: cell.x,
    y: cell.y,
    side: cell.side
  }));

  const mapMarkers = map.layers.markers.map(marker => ({
    id: crypto.randomUUID(),
    title: marker.title,
    note: marker.note,
    x: marker.x,
    y: marker.y
  }));

  if (
    !validateTerrain(terrain) ||
    !validDeployment(deployment) ||
    !validMapMarkers(mapMarkers)
  ) {
    throw new Error(
      'Снимок карты не принимается ' +
      'валидаторами виртуального стола.'
    );
  }

  return { terrain, deployment, mapMarkers };
}

export function renderTableScenario(value) {
  if (!previewHost) return;

  const scenario = value || null;

  pointsButton.disabled = !scenario?.map;
  detachButton.disabled = !scenario;

  const raw = JSON.stringify(scenario);

  // Не пересоздаём памятку при изменении только моделей.
  if (raw === renderedRaw) return;

  previewHost.replaceChildren();

  function line(tag, content) {
    const node = document.createElement(tag);
    node.textContent = content;
    previewHost.append(node);
  }

  if (!scenario) {
    line('p', 'Сценарий к партии не прикреплён.');
    renderedRaw = raw;
    return;
  }

  if (!validScenario(scenario)) {
    line('p', 'Памятка имеет неподдерживаемый формат.');
    pointsButton.disabled = true;
    renderedRaw = raw;
    return;
  }

  line('h3', scenario.name);

  line(
    'p',
    'Авторский сценарий · ' +
    (scenario.status === 'test-ready'
      ? 'Готово к тесту'
      : 'Черновик') +
    ` · редакция ${scenario.revision}`
  );

  if (scenario.map) {
    line(
      'p',
      `Снимок карты: ${scenario.map.name} · ` +
      `редакция ${scenario.map.revision} · ` +
      `КТ в снимке: ${scenario.map.layers.objectives.length}`
    );

    const fold = document.createElement('details');
    fold.className = 'vt-detail-block';

    const summary = document.createElement('summary');
    summary.textContent = 'Посмотреть снимок карты сценария';

    fold.append(
      summary,
      createMapPreview(scenario.map, {
        caption:
          'Снимок сценария — текущее поле может отличаться. ' +
          'Здесь нет моделей и текущего контроля КТ. ' +
          'Нажатия на клетки только показывают описание ' +
          'и не изменяют партию.'
      })
    );

    previewHost.append(fold);
  } else {
    line('p', 'Сценарий без карты.');
  }

  Object.entries(SECTION_LABELS).forEach(([key, label]) => {
    const details = document.createElement('details');
    details.className = 'vt-detail-block';

    const summary = document.createElement('summary');
    summary.textContent = label;

    const body = document.createElement('p');
    body.style.whiteSpace = 'pre-wrap';
    body.style.overflowWrap = 'anywhere';

    body.textContent = scenario.sections[key].trim()
      ? scenario.sections[key]
      : 'Не указано.';

    details.append(summary, body);
    previewHost.append(details);
  });

  line(
    'p',
    'Правила и очки применяются вручную. ' +
    'После загрузки поле можно редактировать независимо от памятки. ' +
    'Наличие снимка не означает, что текущая карта и КТ ' +
    'по-прежнему совпадают с ним.'
  );

  renderedRaw = raw;
}

export function initTableScenarios({
  getState,
  commit,
  assertWritable,
  message
}) {
  if (document.getElementById('vt-scenarios')) return;

  const panel = document.createElement('section');
  panel.id = 'vt-scenarios';
  panel.className = 'vt-load-panel';
  panel.setAttribute('aria-label', 'Сценарий из мастерской');

  // Только статическая разметка приложения.
  panel.innerHTML = `
    <div class="vt-load-field">
      <label for="vt-scenario-select">
        Сценарий локальной мастерской
      </label>

      <select id="vt-scenario-select">
        <option value="">Загрузка списка…</option>
      </select>
    </div>

        <button type="button"
            data-scenario-inspect
            class="builder-action-btn"
            aria-haspopup="dialog">
      Посмотреть сценарий
    </button>

    <button type="button"
            data-scenario-load
            class="builder-action-btn primary">
      Загрузить сценарий
    </button>

        <button type="button"
            data-scenario-memo-only
            class="builder-action-btn">
      Взять только памятку
    </button>

    <button type="button"
            data-scenario-refresh
            class="builder-action-btn">
      Обновить сценарии
    </button>

    <a href="workshop.html#scenarios"
       class="builder-action-btn">
      Редактор сценариев
    </a>
  `;

  const anchor = document.getElementById('vt-workshop-maps') ||
    document.querySelector('.vt-load-panel');

  anchor.after(panel);

  const help = document.createElement('p');
  help.className = 'vt-notice';

    help.textContent =
    '«Загрузить сценарий» сохраняет памятку вместе с партией ' +
    'и при наличии снимка заменяет местность, зоны и маркеры. ' +
    '«Взять только памятку» заменяет только документ сценария: ' +
    'текущее поле и позиции моделей остаются прежними. ' +
    'Для обеих команд сначала загрузите хотя бы одну армию. ' +
    'Армии, игровые отметки и раунд не сбрасываются. ' +
    'КТ и счёт этими командами не меняются. ' +
    'КТ снимка загружаются отдельно в панели памятки.';

  panel.after(help);

  const memo = document.createElement('section');
  memo.className = 'vt-detail-block';
  memo.setAttribute('aria-label', 'Памятка сценария');

  memo.innerHTML = `
    <h2>Сценарий партии</h2>

    <div data-scenario-preview></div>

    <div class="vt-detail-actions">
      <button type="button"
              data-scenario-points
              class="builder-action-btn">
        Загрузить КТ снимка
      </button>

      <button type="button"
              data-scenario-detach
              class="builder-action-btn">
        Убрать памятку
      </button>
    </div>
  `;

  document.querySelector('.vt-details-panel').append(memo);

  previewHost = memo.querySelector('[data-scenario-preview]');
  pointsButton = memo.querySelector('[data-scenario-points]');
  detachButton = memo.querySelector('[data-scenario-detach]');

  const select = panel.querySelector('#vt-scenario-select');
  const loadButton = panel.querySelector('[data-scenario-load]');

    const memoOnlyButton = panel.querySelector(
    '[data-scenario-memo-only]'
  );

    const inspectButton = panel.querySelector(
    '[data-scenario-inspect]'
  );

  let listedRaw = null;

  function refresh({ announce = false } = {}) {
    const previous = select.value;

    try {
      const library = readLibrary();
      listedRaw = library.raw;

      select.replaceChildren();

      if (!library.scenarios.length) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Нет сохранённых сценариев';
        select.append(option);
      } else {
        library.scenarios.forEach(scenario => {
          const option = document.createElement('option');

          option.value = scenario.id;
          option.textContent =
            `${scenario.name} · редакция ${scenario.revision}` +
            (scenario.status === 'draft' ? ' · Черновик' : '');

          select.append(option);
        });

        if (library.scenarios.some(item => item.id === previous)) {
          select.value = previous;
        }
      }

      const empty = library.scenarios.length === 0;

      loadButton.disabled = empty;
      memoOnlyButton.disabled = empty;
      inspectButton.disabled = empty;

      if (announce) {
        message('Список сценариев обновлён.');
      }
    } catch (error) {
      listedRaw = null;

      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'Библиотека сценариев недоступна';

      select.replaceChildren(option);
      loadButton.disabled = true;

            memoOnlyButton.disabled = true;
            inspectButton.disabled = true;

      message(
        `Не удалось прочитать сценарии: ${error.message}`,
        true
      );
    }
  }

  panel.querySelector('[data-scenario-refresh]')
    .addEventListener('click', () => {
      refresh({ announce: true });
    });

      inspectButton.addEventListener('click', () => {
    if (document.querySelector('dialog[open]')) return;

    let dialog = null;

    try {
      const id = select.value;
      const library = readLibrary();

      if (library.raw !== listedRaw) {
        refresh();

        throw new Error(
          'Библиотека изменилась. Список обновлён. ' +
          'Проверьте выбор и откройте просмотр повторно.'
        );
      }

      const source = library.scenarios.find(
        item => item.id === id
      );

      if (!source) {
        throw new Error('Выберите доступный сценарий.');
      }

      // Просмотр работает с независимой копией.
      // Партию и библиотеку не меняем.
      const scenario = clone(source);
      const inspectedRaw = library.raw;

      function node(tag, className = '', content = '') {
        const element = document.createElement(tag);

        if (className) element.className = className;
        element.textContent = content;

        return element;
      }

      dialog = node('dialog', 'vt-scenario-inspect-dialog');
      dialog.setAttribute(
        'aria-label',
        `Просмотр сценария «${scenario.name}»`
      );

      const header = node('header', 'vt-scenario-inspect-header');
      const heading = node('div');

      heading.append(
        node('h2', '', scenario.name),
        node(
          'p',
          '',
          `Редакция ${scenario.revision} · ` +
          (scenario.status === 'test-ready'
            ? 'Готово к тесту'
            : 'Черновик')
        )
      );

      const closeButton = node(
        'button',
        'builder-action-btn',
        'Закрыть'
      );

      closeButton.type = 'button';
      closeButton.autofocus = true;

      header.append(heading, closeButton);

      const body = node('div', 'vt-scenario-inspect-body');

      body.append(
        node(
          'p',
          'vt-scenario-inspect-notice',
          'Просмотр сохранённого сценария мастерской. ' +
          'Открытие этого окна не изменяет партию. ' +
          'Несохранённые правки редактора здесь не показаны.'
        )
      );

      if (scenario.map) {
        body.append(
          node(
            'p',
            'vt-scenario-inspect-notice',
            `Карта: ${scenario.map.name} · ` +
            `редакция снимка ${scenario.map.revision} · ` +
            `КТ: ${scenario.map.layers.objectives.length}`
          ),
          createMapPreview(scenario.map, {
            expandable: false,
            caption:
              'Независимый снимок сценария, не текущее поле. ' +
              'Нажатия на клетки только показывают сведения.'
          })
        );
      } else {
        body.append(
          node(
            'p',
            'vt-scenario-inspect-notice',
            'Сценарий без карты. При загрузке будет заменена ' +
            'только памятка; текущее поле останется прежним.'
          )
        );
      }

      let filledSections = 0;

      for (const [key, label] of Object.entries(SECTION_LABELS)) {
        const content = scenario.sections[key];

        if (!content.trim()) continue;

        filledSections += 1;

        const section = node(
          'section',
          'vt-scenario-inspect-section'
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
            'vt-scenario-inspect-notice',
            'Текстовые разделы не заполнены.'
          )
        );
      }

      const footer = node('footer', 'vt-scenario-inspect-footer');
      const notice = node(
        'p',
        'vt-scenario-inspect-notice',
        getState()
          ? 'Выберите действие. «Только памятка» не меняет поле. ' +
            '«Загрузить сценарий» также применяет снимок карты, ' +
            'если он есть. Обе команды требуют подтверждения. ' +
            'КТ и счёт не меняются. Замена карты будет отклонена, ' +
            'если нарушит опоры моделей.'
          : 'Сценарий можно прочитать без армии. ' +
            'Для прикрепления к партии сначала загрузите ' +
            'хотя бы одну армию на стол.'
      );

      notice.setAttribute('role', 'status');
      notice.setAttribute('aria-live', 'polite');

      const applyButton = node(
        'button',
        'builder-action-btn primary',
        'Загрузить этот сценарий…'
      );

      applyButton.type = 'button';
      applyButton.disabled = !getState();

      const memoButton = node(
        'button',
        'builder-action-btn',
        'Взять только памятку…'
      );

      memoButton.type = 'button';
      memoButton.disabled = !getState();

      const actions = node(
        'div',
        'vt-scenario-inspect-actions'
      );

      actions.append(memoButton, applyButton);

      footer.append(notice, actions);
      dialog.append(header, body, footer);

      closeButton.addEventListener('click', () => {
        dialog.close();
      });

      function runInspectedAction(targetButton) {
        try {
          // Обе команды должны работать именно
          // с просмотренным документом, а не новым выбором.
          if (
            select.value !== scenario.id ||
            localStorage.getItem(KEY) !== inspectedRaw
          ) {
            refresh();

            applyButton.disabled = true;
            memoButton.disabled = true;

            notice.textContent =
              'Выбор или библиотека изменились. ' +
              'Закройте окно и откройте сценарий повторно. ' +
              'Партия не изменена.';

            return;
          }

          assertWritable();

          if (!getState()) {
            throw new Error(
              'Сначала загрузите хотя бы одну армию.'
            );
          }

          if (!targetButton.isConnected || targetButton.disabled) {
            throw new Error(
              'Команда сейчас недоступна. ' +
              'Закройте окно и проверьте панель сценариев.'
            );
          }

          // Сначала закрываем просмотр, затем запускаем
          // штатное подтверждение выбранной операции.
          dialog.close();
          targetButton.click();
        } catch (error) {
          notice.textContent =
            `Действие недоступно: ${error.message}`;
        }
      }

      applyButton.addEventListener('click', () => {
        runInspectedAction(loadButton);
      });

      memoButton.addEventListener('click', () => {
        runInspectedAction(memoOnlyButton);
      });

      dialog.addEventListener('close', () => {
        dialog.remove();

        const focusTarget = inspectButton.disabled
          ? select
          : inspectButton;

        if (
          focusTarget.isConnected &&
          focusTarget.getClientRects().length > 0
        ) {
          focusTarget.focus({ preventScroll: true });
        }
      }, { once: true });

      document.body.append(dialog);
      dialog.showModal();
    } catch (error) {
      dialog?.remove();

      message(
        `Не удалось открыть сценарий: ${error.message}`,
        true
      );
    }
  });

  loadButton.addEventListener('click', () => {
    try {
      assertWritable();

      if (!getState()) {
        throw new Error('Сначала загрузите хотя бы одну армию.');
      }

      const id = select.value;
      const library = readLibrary();

      if (library.raw !== listedRaw) {
        refresh();

        throw new Error(
          'Библиотека изменилась. Проверьте обновлённый список ' +
          'и повторите загрузку.'
        );
      }

      const source = library.scenarios.find(item => item.id === id);

      if (!source) {
        throw new Error('Выберите доступный сценарий.');
      }

      const scenario = clone(source);
      const layers = scenario.map
        ? prepareLayers(scenario.map)
        : null;

      const mapWarning = scenario.map
        ? `\n\nКарта: «${scenario.map.name}», ` +
          `редакция ${scenario.map.revision}.\n` +
          'Текущие местность, зоны и маркеры будут заменены, ' +
          'в том числе очищены там, где слои снимка пусты.'
        : '\n\nВ сценарии нет карты: поле останется прежним.';

      if (!confirm(
        `Загрузить сценарий «${scenario.name}»?\n\n` +
        'Текущая памятка сценария будет заменена.\n' +
        'Армии, позиции, ХП, активации, фронт, усталость, ' +
        'заметки моделей и раунд сохранятся.\n' +
        'Модели не перемещаются. Игровая допустимость ' +
        'расстановки автоматически не проверяется.\n\n' +
        'КТ, их контроль и счёт сейчас не изменятся. ' +
        'Для КТ снимка предусмотрена отдельная кнопка.\n\n' +
        'Загрузку можно отменить общей историей стола.' +
        mapWarning +
        (scenario.status === 'draft'
          ? '\n\nСценарий помечен как черновик.'
          : '')
      )) {
        return;
      }

      assertWritable();

      if (localStorage.getItem(KEY) !== library.raw) {
        refresh();

        throw new Error(
          'За время подтверждения библиотека изменилась. ' +
          'Загрузка отменена.'
        );
      }

      commit(next => {
        next.scenario = scenario;

        if (layers) {
          next.terrain = layers.terrain;
          next.deployment = layers.deployment;
          next.mapMarkers = layers.mapMarkers;
        }
      },
      `Загружен сценарий «${scenario.name}». ` +
      (layers
        ? 'Местность, зоны и маркеры заменены. '
        : 'Поле не изменено. ') +
      'Модели, раунд, КТ и счёт сохранены.');
    } catch (error) {
      message(`Сценарий не загружен: ${error.message}`, true);
    }
  });

    memoOnlyButton.addEventListener('click', () => {
    try {
      assertWritable();

      if (!getState()) {
        throw new Error(
          'Сначала загрузите хотя бы одну армию.'
        );
      }

      const id = select.value;
      const library = readLibrary();

      if (library.raw !== listedRaw) {
        refresh();

        throw new Error(
          'Библиотека изменилась. Проверьте обновлённый ' +
          'список и повторите действие.'
        );
      }

      const source = library.scenarios.find(
        item => item.id === id
      );

      if (!source) {
        throw new Error('Выберите доступный сценарий.');
      }

      const scenario = clone(source);
      const previousScenarioRaw = JSON.stringify(
        getState().scenario ?? null
      );

      if (!confirm(
        `Взять только памятку «${scenario.name}», ` +
        `редакция ${scenario.revision}?\n\n` +
        'Текущая памятка сценария будет заменена.\n\n' +
        'Местность, зоны, маркеры, армии, позиции и опоры ' +
        'моделей, ХП, активации, фронт, усталость, заметки ' +
        'и раунд останутся прежними.\n\n' +
        'КТ, их контроль и счёт не меняются.\n\n' +
        (scenario.map
          ? 'Снимок карты останется внутри памятки только ' +
            'для просмотра. Он может отличаться от текущего поля.\n\n'
          : 'В сценарии нет снимка карты.\n\n') +
        'Действие можно отменить общей историей стола.' +
        (scenario.status === 'draft'
          ? '\n\nСценарий помечен как черновик.'
          : '')
      )) {
        return;
      }

      assertWritable();

      if (!getState()) {
        throw new Error(
          'Партия больше недоступна. Повторите действие.'
        );
      }

      if (localStorage.getItem(KEY) !== library.raw) {
        refresh();

        throw new Error(
          'За время подтверждения библиотека изменилась. ' +
          'Прикрепление отменено.'
        );
      }

      if (
        JSON.stringify(getState().scenario ?? null) !==
        previousScenarioRaw
      ) {
        throw new Error(
          'Текущая памятка изменилась. ' +
          'Проверьте её и повторите действие.'
        );
      }

      // Не подготавливаем и не применяем слои карты.
      // Опоры моделей и отдельное хранилище миссии
      // этим действием не затрагиваются.
      commit(next => {
        next.scenario = scenario;
      },
      `Прикреплена только памятка «${scenario.name}», ` +
      `редакция ${scenario.revision}. ` +
      'Поле, модели, раунд, КТ и счёт не изменены. ' +
      (scenario.map
        ? 'Снимок памятки не применялся к полю.'
        : 'Сценарий без снимка карты.'));
    } catch (error) {
      message(
        `Памятка не прикреплена: ${error.message}`,
        true
      );
    }
  });

  pointsButton.addEventListener('click', () => {
    try {
      assertWritable();

      const scenario = getState()?.scenario;

      if (!validScenario(scenario) || !scenario.map) {
        throw new Error(
          'К партии не прикреплён сценарий с картой.'
        );
      }

      const expectedScenarioRaw = JSON.stringify(scenario);

      const points = scenario.map.layers.objectives.map(point => ({
        id: point.id,
        title: point.title,
        x: point.x,
        y: point.y
      }));

      if (!validMapObjectives(points)) {
        throw new Error('КТ снимка не прошли проверку.');
      }

      if (!confirm(
        `Загрузить КТ снимка сценария «${scenario.name}»?\n\n` +
        `Количество точек: ${points.length}.\n` +
        (points.length === 0
          ? 'Все текущие КТ будут удалены.\n'
          : 'Все текущие КТ будут заменены.\n') +
        'Контроль загруженных точек станет нейтральным.\n\n' +
        'Счёт обеих сторон сохраняется. ' +
        'Поле, модели, раунд и памятка не меняются.\n\n' +
        'Это отдельное действие общей истории отмены.'
      )) {
        return;
      }

      assertWritable();

      if (
        JSON.stringify(getState()?.scenario) !== expectedScenarioRaw
      ) {
        throw new Error(
          'Прикреплённый сценарий изменился. Повторите действие.'
        );
      }

      const saved = replaceObjectivesFromMap(
        points,
        `${scenario.map.name} · сценарий ${scenario.name}`
      );

      if (!saved) {
        throw new Error(
          'Запись КТ не выполнена. Подробности — ' +
          'в панели «Задачи миссии».'
        );
      }

      message(
        `КТ снимка загружены: ${points.length}. ` +
        'Контроль нейтральный, счёт сохранён.'
      );
    } catch (error) {
      message(`КТ не загружены: ${error.message}`, true);
    }
  });

  detachButton.addEventListener('click', () => {
    if (!getState()?.scenario) return;

    if (!confirm(
      'Убрать памятку сценария из партии?\n\n' +
      'Поле, армии, КТ, счёт и раунд останутся прежними. ' +
      'Сценарий в мастерской не удаляется.'
    )) {
      return;
    }

    commit(next => {
      next.scenario = null;
    },
    'Памятка сценария убрана. Поле, модели, КТ и счёт сохранены.');
  });

  window.addEventListener('storage', event => {
    if (
      event.storageArea === localStorage &&
      (event.key === KEY || event.key === null)
    ) {
      refresh();
    }
  });

    if (!document.getElementById('vt-scenario-inspect-styles')) {
    const style = document.createElement('style');
    style.id = 'vt-scenario-inspect-styles';

    style.textContent = `
      .vt-scenario-inspect-dialog {
        box-sizing: border-box;
        width: min(1040px, calc(100vw - 32px));
        height: min(1000px, calc(100dvh - 32px));
        max-width: none;
        max-height: none;
        margin: auto;
        padding: 0;
        overflow: hidden;
        color: #e8e2d7;
        background: #191f24;
        border: 1px solid #8d805a;
        border-radius: 6px;
        box-shadow: 0 20px 80px #0009;
      }

      .vt-scenario-inspect-dialog[open] {
        display: flex;
        flex-direction: column;
      }

      .vt-scenario-inspect-dialog::backdrop {
        background: rgb(5 10 7 / 80%);
      }

      .vt-scenario-inspect-dialog *,
      .vt-scenario-inspect-dialog *::before,
      .vt-scenario-inspect-dialog *::after {
        box-sizing: border-box;
      }

      .vt-scenario-inspect-header {
        display: flex;
        flex: 0 0 auto;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 18px 22px;
        background: #252d2a;
        border-bottom: 1px solid #465044;
      }

      .vt-scenario-inspect-header > div {
        min-width: 0;
      }

      .vt-scenario-inspect-header h2 {
        margin: 0;
        color: #d0b477;
        font-size: 24px;
        overflow-wrap: anywhere;
      }

      .vt-scenario-inspect-header p {
        margin: 6px 0 0;
        color: #b1b8ac;
        font-size: 13px;
      }

      .vt-scenario-inspect-header > button {
        flex: 0 0 auto;
      }

      .vt-scenario-inspect-body {
        flex: 1 1 auto;
        min-height: 0;
        padding: 24px 30px;
        overflow: auto;
        overscroll-behavior: contain;
        overflow-wrap: anywhere;
      }

      .vt-scenario-inspect-notice {
        margin: 0;
        color: #b1b8ac;
        font-size: 13px;
        line-height: 1.6;
        overflow-wrap: anywhere;
      }

      .vt-scenario-inspect-body > .vt-scenario-inspect-notice {
        margin-bottom: 18px;
      }

      .vt-scenario-inspect-section {
        margin-top: 26px;
        padding-top: 20px;
        border-top: 1px solid #465044;
      }

      .vt-scenario-inspect-section h3 {
        margin: 0 0 12px;
        color: #d0b477;
        font-size: 20px;
      }

      .vt-scenario-inspect-section p {
        max-width: 78ch;
        margin: 0;
        font-size: 16px;
        line-height: 1.8;
        white-space: pre-wrap;
      }

      .vt-scenario-inspect-footer {
        display: flex;
        flex: 0 0 auto;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        padding: 14px 22px;
        border-top: 1px solid #465044;
        background: #202823;
      }

      .vt-scenario-inspect-footer > button {
        flex: 0 0 auto;
      }

            .vt-scenario-inspect-actions {
        display: flex;
        flex: 0 0 auto;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 8px;
        max-width: 100%;
      }

      .vt-scenario-inspect-actions > button {
        white-space: normal;
      }

              .vt-scenario-inspect-actions {
          flex-direction: column;
          align-items: stretch;
          width: 100%;
        }

      @media (max-width: 600px) {
        .vt-scenario-inspect-dialog {
          width: calc(100vw - 12px);
          height: calc(100dvh - 12px);
        }

        .vt-scenario-inspect-header,
        .vt-scenario-inspect-body,
        .vt-scenario-inspect-footer {
          padding: 14px;
        }

        .vt-scenario-inspect-header h2 {
          font-size: 20px;
        }

        .vt-scenario-inspect-footer {
          align-items: stretch;
          flex-direction: column;
          gap: 10px;
        }
      }
    `;

    document.head.append(style);
  }

  window.addEventListener('focus', () => refresh());

  refresh();
  renderTableScenario(getState()?.scenario);
}