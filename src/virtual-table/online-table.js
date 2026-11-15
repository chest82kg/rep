// src/virtual-table/online-table.js
//
// Самостоятельный онлайн-стол.
// Не импортирует локальный index.js.
// Не читает и не изменяет локальные сохранения.
//
// Подключены:
// — ростеры комнаты;
// — общие позиции;
// — просмотр обеих сторон;
// — перемещение только своих моделей;
// — общие броски через панель комнаты;
// — подробная карточка модели;
// — ручное текущее ХП и индикаторы ХП;
// — общий фронт;
// — ручные сетевые активация и усталость;
// — общий ручной раунд;
// — общие заметки моделей;
// — поиск и фильтры списка;
// — личный маршрут;
// — общий ландшафт;
// — переход старого ландшафта на слои;
// — добавление верхних тайлов создателем комнаты.
//
// Пока НЕ подключены:
// — отмена;
// — назначение сетевых опор;
// — перенос тайлов вместе с моделями.
//
// Игровые эффекты автоматически не применяются.

import { auth, db } from '../core/firebase.js';

import {
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

import {
  doc,
  onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

import {
  initTableRoomConnection
} from './room-connection.js';

import {
  connectOnlinePositions,
  onlineUnitId
} from './online-positions.js';

import {
  appendOnlineModelCard
} from './online-model-card.js';

import {
  appendOnlineHealth,
  stopOnlineHealth
} from './online-health.js';

import {
  connectOnlineHealthIndicators,
  emptyOnlineHealthState,
  onlineHealthIndicator,
  installOnlineHealthIndicatorStyles
} from './online-health-indicators.js';

import {
  initOnlineLayout
} from './online-layout.js';

import {
  connectOnlineFacing
} from './online-facing.js';

import {
  connectOnlineStatus
} from './online-status.js';

import {
  createOnlineRoute
} from './online-route.js';

import {
  connectOnlineTerrain,
  emptyOnlineTerrainState,
  readOnlineTerrainSurface,
  appendOnlineTerrainCell,
  installOnlineTerrainStyles
} from './online-terrain.js';

import {
  createOnlineTerrainEditor
} from './online-terrain-editor.js';

import {
  migrateOnlineTerrainToLayers
} from './online-terrain-migration.js';

import {
  createOnlineLayeredTerrainEditor
} from './online-layered-terrain-editor.js';

import {
  connectOnlineRounds
} from './online-rounds.js';

import {
  connectOnlineNotes
} from './online-notes.js';

import {
  getModelVisualRole,
  modelVisualRoleName,
  modelVisualIconHTML,
  installModelVisualStyles
} from './model-visuals.js';

import {
  connectOnlineObjectives
} from './online-objectives.js';

import {
  connectOnlineScenario
} from './online-scenario.js';

const SIZE = 14;
const LETTERS = 'ABCDEFGHIJKLMN';

const $ = id => document.getElementById(id);

let initialized = false;

function node(tag, text = '', className = '') {
  const element = document.createElement(tag);
  element.textContent = String(text);

  if (className) {
    element.className = className;
  }

  return element;
}

function modelName(unit) {
  return String(unit.uniqueKey || unit.title || 'Модель');
}

function modelNumber(side, index) {
  return `${side === 'a' ? 'А' : 'Б'}${index + 1}`;
}

export function initOnlineTable() {
  if (initialized) return;
  initialized = true;

  installOnlineHealthIndicatorStyles();
  installOnlineTerrainStyles();
  installModelVisualStyles();

  const rawCode = new URLSearchParams(
    window.location.search
  ).get('room') || '';

  const roomCode = rawCode.trim().toUpperCase();

  let room = null;
  let roomReady = false;
  let ownSide = null;
  let selected = null;

  let unsubscribeRoom = null;

  let positionsConnection = null;
  let positions = new Map();
  let positionsReady = false;

  let healthConnection = null;
  let healthState = emptyOnlineHealthState();

  let facingConnection = null;
  let statusConnection = null;
  let roundsConnection = null;
  let notesConnection = null;
  let objectivesConnection = null;
  let scenarioConnection = null;
  let routeTool = null;

  let terrainConnection = null;
  let terrainState = emptyOnlineTerrainState();

  let terrainEditor = null;
  let layeredTerrainEditor = null;
  let terrainMigrationBusy = false;

  let generation = 0;
  let moveBusy = false;

  const sideSelect = $('vt-side-select');
  const list = $('vt-unit-list');
  const details = $('vt-details');
  const board = $('vt-board');

  const searchInput = $('vt-unit-search');
  const locationFilter = $('vt-unit-location');
  const statusFilter = $('vt-unit-status');
  const selectionHint = $('vt-unit-selection-hint');

  function message(text, error = false) {
    $('vt-message').textContent = text;
    $('vt-message').classList.toggle('is-error', error);
  }

  /* ========================================================================
     Настройка онлайн-интерфейса
     ======================================================================== */

  for (const id of [
    'vt-roster-select',
    'vt-load',
    'vt-refresh',
    'vt-clear'
  ]) {
    const element = $(id);

    if (element) {
      element.disabled = true;
      element.title =
        'В онлайн-режиме ростеры выбираются в дашборде комнаты.';
    }
  }

  $('vt-roster-select').replaceChildren(
    new Option('Ростеры берутся из комнаты', '')
  );

  const builder = $('vt-open-builder');

  if (builder) {
    builder.textContent = 'Открыть билдер';
  }

  const headerText = document.querySelector(
    '.vt-header > div > p'
  );

  if (headerText) {
    headerText.textContent =
      'Онлайн-комната · общие позиции, ХП, отметки и ландшафт · поле 14 × 14';
  }

  const notice = document.querySelector('.vt-notice');

  if (notice) {
    notice.textContent =
      'Ростеры, позиции и ХП загружаются из комнаты. ' +
      'Перемещать модели и менять ХП можно только своей стороне. ' +
      'Активация и усталость отмечаются владельцем модели вручную. ' +
      'Общие броски доступны в панели комнаты. ' +
      'Нулевое ХП не удаляет модель с поля. ' +
      'Создание тайлов доступно только создателю комнаты. ' +
      'В многослойном формате высоты складываются поклеточно. ' +
      'Общим раундом управляет создатель комнаты. ' +
      'Следующий раунд снимает активации обеих сторон, ' +
      'но сохраняет усталость. ' +
      'Перенос тайлов с моделями пока не подключён. ' +
      'Локальная партия не загружается и не изменяется.';
  }

  const fieldHelp = document.querySelector('.vt-field-help');

  if (fieldHelp) {
    fieldHelp.textContent =
      'Выберите свою модель и пустую клетку. ' +
      'Нажатие занятой клетки выбирает модель. ' +
      'Дальность и стоимость перемещения проверяются вручную. ' +
      'Модели с 0 ХП остаются на поле. ' +
      'Маршрут — личный черновик без перемещения модели.';
  }

  // Меняем варианты только в онлайн-режиме.
  // Общий HTML и фильтры локального стола остаются прежними.
  statusFilter.replaceChildren(
    new Option('Все модели', 'all'),
    new Option('Не активированы', 'not-activated'),
    new Option('Активированы', 'activated'),
    new Option('С усталостью', 'fatigued')
  );

  statusFilter.value = 'all';
  statusFilter.disabled = false;
  statusFilter.title =
    'Фильтр по ручным отметкам. ' +
    'Отсутствие активации не определяет возможность действовать.';

  /* ========================================================================
     Ростеры и состояние моделей
     ======================================================================== */

  function currentSide() {
    return sideSelect.value === 'b' ? 'b' : 'a';
  }

  function rosterFor(side) {
    if (!room) return null;

    return side === 'a'
      ? room.hostRoster
      : room.guestRoster;
  }

  function unitsFor(side) {
    const units = rosterFor(side)?.units;
    return Array.isArray(units) ? units : [];
  }

  function positionFor(side, index) {
    return positions.get(
      onlineUnitId(side, index)
    )?.position || null;
  }

  function locationFor(side, index) {
    if (!positionsReady) {
      return 'позиция не подтверждена сервером';
    }

    const position = positionFor(side, index);

    return position
      ? `${LETTERS[position.x]}${position.y + 1}`
      : 'резерв';
  }

  function healthFor(unit, side, index) {
    return onlineHealthIndicator(
      unit,
      side,
      index,
      healthState
    );
  }

  function facingFor(side, index) {
    return facingConnection
      ? facingConnection.indicator(side, index)
      : {
          facing: null,
          text: 'Направление …',
          short: '…',
          description: 'Направление ещё не загружено.'
        };
  }

  function statusFor(side, index) {
    return statusConnection
      ? statusConnection.indicator(side, index)
      : {
          ready: false,
          activated: null,
          fatigued: null,
          text: 'Отметки загружаются'
        };
  }

  function selectModel(side, index) {
    selected = { side, index };
    sideSelect.value = side;
    render();
  }

  /* ========================================================================
     Перемещение моделей
     ======================================================================== */

  async function moveSelected(position) {
    if (!selected || !room) {
      message('Сначала выберите свою модель.', true);
      return;
    }

    if (selected.side !== ownSide) {
      message(
        'Модель соперника доступна только для просмотра.',
        true
      );
      return;
    }

    if (
      !roomReady ||
      !positionsReady ||
      !positionsConnection
    ) {
      message(
        'Дождитесь подтверждения комнаты и общих позиций сервером.',
        true
      );

      return;
    }

    if (moveBusy) {
      message(
        'Предыдущее перемещение ещё сохраняется. ' +
        'Дождитесь результата перед следующим действием.'
      );

      return;
    }

        const selectedUnit = unitsFor(
      selected.side
    )[selected.index];

    if (
      !selectedUnit ||
      typeof selectedUnit !== 'object'
    ) {
      message(
        'Выбранная модель больше не найдена в ростере. ' +
        'Выберите модель заново.',
        true
      );

      return;
    }

    if (position !== null) {
      if (
        !position ||
        !Number.isInteger(position.x) ||
        !Number.isInteger(position.y) ||
        position.x < 0 ||
        position.x >= SIZE ||
        position.y < 0 ||
        position.y >= SIZE
      ) {
        message('Недопустимая клетка назначения.', true);
        return;
      }

      const selectedId = onlineUnitId(
        selected.side,
        selected.index
      );

      for (const [unitId, record] of positions) {
        const occupiedPosition = record.position;

        if (
          unitId !== selectedId &&
          occupiedPosition &&
          occupiedPosition.x === position.x &&
          occupiedPosition.y === position.y
        ) {
          message(
            `Клетка ${LETTERS[position.x]}${position.y + 1} ` +
            'уже занята другой моделью. ' +
            'Выберите пустую клетку.',
            true
          );

          return;
        }
      }
    }

    const twoPlayers = Boolean(
      typeof room.hostId === 'string' &&
      room.hostId.length > 0 &&
      typeof room.guestId === 'string' &&
      room.guestId.length > 0 &&
      room.hostId !== room.guestId
    );

    if (!twoPlayers) {
      message(
        'Для размещения моделей нужны два разных участника. ' +
        'Дождитесь, пока второй игрок займёт сторону комнаты.',
        true
      );

      return;
    }

    if (
      unitsFor('a').length === 0 ||
      unitsFor('b').length === 0
    ) {
      message(
        'Перед размещением оба участника должны выбрать ' +
        'непустые ростеры в дашборде комнаты.',
        true
      );

      return;
    }

    const previousPosition = positionFor(
      selected.side,
      selected.index
    );

    const samePosition =
      previousPosition === null && position === null ||
      Boolean(
        previousPosition &&
        position &&
        previousPosition.x === position.x &&
        previousPosition.y === position.y
      );

    // Повторное нажатие не создаёт запись
    // и не должно предлагать фиксацию составов.
    if (samePosition) {
      message('Позиция модели не изменилась.');
      return;
    }

        if (position === null && previousPosition) {
      const number = modelNumber(
        selected.side,
        selected.index
      );

      const coordinate =
        `${LETTERS[previousPosition.x]}` +
        `${previousPosition.y + 1}`;

      const confirmed = window.confirm(
        `Вернуть модель ${number} в резерв?\n\n` +
        `Она покинет клетку ${coordinate}. ` +
        'ХП, фронт, активация, усталость и общая заметка ' +
        'сохранятся.\n\n' +
        'Это ручное изменение позиции, а не применение ' +
        'игрового правила. Сетевой отмены пока нет.'
      );

      if (!confirmed) {
        message(
          'Возврат в резерв отменён. ' +
          'Это действие не изменило позицию модели.'
        );

        return;
      }
    }

    if (room.tableLocked !== true) {
      const confirmed = window.confirm(
        'Начать расстановку и зафиксировать оба ростера?\n\n' +
        'Первое фактическое перемещение закрепит выбранные ' +
        'армии обеих сторон. После этого смена ростеров ' +
        'в этой комнате будет недоступна.\n\n' +
        'Это не начинает новый раунд, не начисляет очки ' +
        'и не применяет игровые эффекты.\n\n' +
        'Убедитесь, что оба игрока выбрали нужные армии.'
      );

      if (!confirmed) {
        message(
          'Размещение отменено. ' +
          'Это действие не изменило модель или составы.'
        );

        return;
      }
    }

    const target = { ...selected };
    const connection = positionsConnection;
    const currentGeneration = generation;

    moveBusy = true;
    routeTool?.refresh();
    renderDetails();

    message('Сохраняем позицию в комнате…');

    try {
      await connection.move(
        target.side,
        target.index,
        position
      );

      if (
        currentGeneration !== generation ||
        connection !== positionsConnection
      ) {
        return;
      }

      message(
        `${modelNumber(target.side, target.index)}: ` +
        (
          position
            ? `${LETTERS[position.x]}${position.y + 1}.`
            : 'модель возвращена в резерв.'
        )
      );
    } catch (error) {
      if (currentGeneration === generation) {
        console.error('Online model movement:', error);

        message(
          'Перемещение не подтверждено: ' +
          String(error.code || error.message) +
          '. Проверьте актуальную позицию перед повтором.',
          true
        );
      }
    } finally {
      if (
        currentGeneration === generation &&
        connection === positionsConnection
      ) {
        moveBusy = false;
        routeTool?.refresh();
        renderDetails();
      }
    }
  }

    /* ========================================================================
     Найти выбранную модель на поле
     ======================================================================== */

  function focusSelectedModel() {
    if (!selected || !roomReady || !positionsReady) {
      message(
        'Дождитесь подтверждения комнаты и позиций сервером.',
        true
      );

      return;
    }

    const position = positionFor(
      selected.side,
      selected.index
    );

    if (!position) {
      message('Выбранная модель находится в резерве.');
      return;
    }

    const cell = board.querySelector(
      `.vt-cell[data-x="${position.x}"]` +
      `[data-y="${position.y}"]`
    );

    if (!cell) {
      message('Клетка модели пока недоступна.', true);
      return;
    }

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    cell.scrollIntoView({
      behavior: reducedMotion ? 'instant' : 'smooth',
      block: 'center',
      inline: 'center'
    });

    // Не вызывает click и не меняет выбранную модель.
    // preventScroll не даёт фокусу отменить центрирование.
    cell.focus({ preventScroll: true });

    if (!reducedMotion && typeof cell.animate === 'function') {
      cell.animate(
        [
          {
            outline: '3px solid #ead19a',
            outlineOffset: '2px'
          },
          {
            outline: '3px solid transparent',
            outlineOffset: '8px'
          }
        ],
        {
          duration: 1200,
          iterations: 2,
          easing: 'ease-out'
        }
      );
    }

    message(
      `${modelNumber(selected.side, selected.index)} · ` +
      `${LETTERS[position.x]}${position.y + 1}. ` +
      'Позиция модели не изменена.'
    );
  }

  /* ========================================================================
     Карточка выбранной модели
     ======================================================================== */

  function renderDetails() {
    const unit = selected
      ? unitsFor(selected.side)[selected.index]
      : null;

    const selectedKey = unit
      ? onlineUnitId(selected.side, selected.index)
      : '';

    const sameModel = Boolean(
      selectedKey &&
      details.dataset.renderedUnit === selectedKey
    );

    const opened = sameModel
      ? [...details.querySelectorAll('details')]
          .map(element => element.open)
      : [];

    facingConnection?.unmount();
    statusConnection?.unmount();
    notesConnection?.unmount();
    stopOnlineHealth(details);
    details.replaceChildren();

    if (!unit || typeof unit !== 'object') {
      selected = null;
      delete details.dataset.renderedUnit;

      details.append(
        node(
          'p',
          'Выберите модель в списке или на поле.',
          'vt-muted'
        )
      );

      return;
    }

    details.dataset.renderedUnit = selectedKey;

    const own = selected.side === ownSide;

    details.append(
      node(
        'h3',
        `${modelNumber(selected.side, selected.index)} · ` +
        modelName(unit),
        'vt-model-card-title'
      ),
      node(
        'p',
        own
          ? 'Ваша модель'
          : 'Модель соперника · только просмотр',
        'vt-muted vt-model-card-meta'
      ),
      node(
        'p',
        String(unit.role || 'Категория не указана'),
        'vt-muted vt-model-card-meta'
      ),
      node(
        'p',
        `Позиция: ${locationFor(selected.side, selected.index)}`,
        'vt-muted vt-model-card-meta'
      )
    );

        const locateActions = node(
      'div',
      '',
      'vt-detail-actions'
    );

    const locateButton = node(
      'button',
      'На поле',
      'builder-action-btn'
    );

    locateButton.type = 'button';

    const selectedPosition = positionFor(
      selected.side,
      selected.index
    );

    locateButton.disabled =
      !roomReady ||
      !positionsReady ||
      !selectedPosition;

    locateButton.title =
      !roomReady || !positionsReady
        ? 'Дождитесь подтверждения комнаты и позиций сервером.'
        : !selectedPosition
          ? 'Модель находится в резерве.'
          : 'Показать клетку модели без перемещения.';

    locateButton.addEventListener(
      'click',
      focusSelectedModel
    );

    locateActions.append(locateButton);
    details.append(locateActions);

    const card = appendOnlineModelCard(details, unit);

    const stats = details.querySelector('.vt-card-stats');
    const firstCardDetail = stats?.nextElementSibling || null;

    appendOnlineHealth(details, {
      roomId: roomCode,
      side: selected.side,
      index: selected.index,
      maximum: card.total.hp,
      baseHp: card.base.hp
    });

    const healthPanel = details.querySelector(
      '.vt-online-health'
    );

    if (healthPanel && stats) {
      details.insertBefore(healthPanel, stats);
      healthPanel.append(stats);
    }

    function fold(title) {
      const section = node('details', '', 'vt-card-fold');
      const summary = node('summary', title);
      const content = node(
        'div',
        '',
        'vt-card-fold-content'
      );

      section.append(summary, content);

      return { section, content };
    }

    const facingFold = fold('Фронт');

    facingFold.content.classList.add(
      'vt-online-facing-content'
    );

    if (facingConnection) {
      facingConnection.mount(
        facingFold.content,
        selected.side,
        selected.index
      );
    } else {
      facingFold.content.append(
        node('p', 'Направление загружается…', 'vt-muted')
      );
    }

    if (firstCardDetail) {
      details.insertBefore(
        facingFold.section,
        firstCardDetail
      );
    } else {
      details.append(facingFold.section);
    }

    const statusPanel = node(
      'section',
      '',
      'vt-detail-block'
    );

    statusPanel.setAttribute(
      'aria-label',
      'Активация и усталость'
    );

    if (statusConnection) {
      statusConnection.mount(
        statusPanel,
        selected.side,
        selected.index
      );
    } else {
      statusPanel.append(
        node('p', 'Отметки загружаются…', 'vt-muted')
      );
    }

    details.insertBefore(
      statusPanel,
      facingFold.section
    );

    const notesFold = fold('Общая заметка модели');

    if (notesConnection) {
      notesConnection.mount(
        notesFold.content,
        selected.side,
        selected.index
      );
    } else {
      notesFold.content.append(
        node('p', 'Заметки загружаются…', 'vt-muted')
      );
    }

    details.append(notesFold.section);

    if (own) {
      const more = fold('Дополнительные действия');

      const reserve = node(
        'button',
        moveBusy ? 'Сохраняем…' : 'Вернуть в резерв',
        'builder-action-btn'
      );

      reserve.type = 'button';
      reserve.dataset.action = 'reserve';

      reserve.disabled =
        moveBusy ||
        !roomReady ||
        !positionsReady ||
        !positionFor(selected.side, selected.index);

      reserve.addEventListener('click', () => {
        void moveSelected(null);
      });

      more.content.append(reserve);
      details.append(more.section);
    }

    const help = fold('Справка');

    help.content.append(
      node(
        'p',
        'Для размещения или перемещения выберите свою модель ' +
        'и пустую клетку. Для общего броска откройте вкладку «Броски». ' +
        'Характеристики включают постоянные бонусы известного артефакта. ' +
        'Стоимость действий и особые эффекты проверяются вручную. ' +
        'Активация и усталость — общие ручные отметки; ' +
        'менять их может только владелец модели после фиксации составов. ' +
        'Перемещение и возврат в резерв не снимают эти отметки. ' +
        'Нулевое ХП не удаляет модель. ' +
        'ХП этого поля хранится отдельно от старого дашборда. ' +
        'Следующий раунд и общий сброс снимают активации обеих сторон. ' +
        'Усталость сохраняется. Уменьшение номера раунда ' +
        'не восстанавливает предыдущие действия. ' +
        'Общая заметка видна обоим участникам. ' +
        'Изменять её может только владелец модели. ' +
        'Несохранённый текст сохраняется при переключении моделей, ' +
        'но теряется после перезагрузки страницы. ' +
        'Фильтры меняют только список, а не выбранную модель или поле. ' +
        'Отсутствие активации не определяет возможность действовать. ' +
        'Назначение опор и перенос вместе с тайлами ' +
        'пока не подключены.',
        'vt-muted vt-online-card-help'
      )
    );

    details.append(help.section);

    if (sameModel) {
      [...details.querySelectorAll('details')]
        .forEach((element, index) => {
          if (index < opened.length) {
            element.open = opened[index];
          }
        });
    }
  }

  /* ========================================================================
     Список моделей и фильтры
     ======================================================================== */

  function renderList() {
    const side = currentSide();
    const units = unitsFor(side);

    const query = searchInput.value
      .normalize('NFKC')
      .toLocaleLowerCase('ru-RU')
      .replace(/ё/g, 'е')
      .trim();

    const location = locationFilter.value;
    const statusValue = statusFilter.value;
    const previousScroll = list.scrollTop;

    list.replaceChildren();

    const groups = {
      board: [],
      reserve: [],
      unknown: []
    };

    const visible = new Set();

    let count = 0;
    let waitingForPositions = false;
    let waitingForStatuses = false;

    units.forEach((unit, index) => {
      if (!unit || typeof unit !== 'object') return;

      const number = modelNumber(side, index);

      const searchText = `${number} ${modelName(unit)}`
        .normalize('NFKC')
        .toLocaleLowerCase('ru-RU')
        .replace(/ё/g, 'е');

      if (query && !searchText.includes(query)) return;

      const position = positionFor(side, index);

      // Пока позиции не загружены, нельзя считать модель
      // находящейся в резерве или на поле.
      if (location !== 'all' && !positionsReady) {
        waitingForPositions = true;
        return;
      }

      if (location === 'board' && !position) return;
      if (location === 'reserve' && position) return;

      const status = statusFor(side, index);

      // Неизвестные отметки не равны false.
      if (statusValue !== 'all') {
        if (!status.ready) {
          waitingForStatuses = true;
          return;
        }

        if (
          statusValue === 'not-activated' &&
          status.activated !== false
        ) {
          return;
        }

        if (
          statusValue === 'activated' &&
          status.activated !== true
        ) {
          return;
        }

        if (
          statusValue === 'fatigued' &&
          status.fatigued !== true
        ) {
          return;
        }
      }

      const active = Boolean(
        selected &&
        selected.side === side &&
        selected.index === index
      );

      const health = healthFor(unit, side, index);
      const facing = facingFor(side, index);

      const button = node(
        'button',
        '',
        'vt-unit vt-unit-compact'
      );

      button.type = 'button';
      button.dataset.unit = onlineUnitId(side, index);
      button.dataset.side = side;

      button.classList.toggle('is-selected', active);
      button.classList.toggle(
        'vt-online-zero-hp',
        health.zero
      );

      button.classList.toggle(
        'is-activated',
        status.activated === true
      );

      button.setAttribute('aria-pressed', String(active));

      const description =
        `${number} · ${modelName(unit)} · ` +
        `${locationFor(side, index)}. ` +
        `${health.description} ${facing.description} ` +
        `${status.text}.`;

      button.title = description;
      button.setAttribute('aria-label', description);

      const heading = node('span', '', 'vt-unit-heading');

      heading.append(
        node('span', number, 'vt-unit-number'),
        node('strong', modelName(unit))
      );

      const subline = node('span', '', 'vt-unit-subline');

      subline.append(
        node('span', health.text, 'vt-unit-hp'),
        node(
          'span',
          positionsReady
            ? position
              ? `${LETTERS[position.x]}${position.y + 1}`
              : 'Резерв'
            : '…',
          'vt-unit-coordinate'
        )
      );

      const tags = node('span', '', 'vt-unit-tags');

      if (!status.ready) {
        tags.append(
          node('span', status.text, 'vt-unit-tag')
        );
      } else {
        if (status.activated) {
          tags.append(
            node(
              'span',
              'Активирована',
              'vt-unit-tag is-activated'
            )
          );
        }

        if (status.fatigued) {
          tags.append(
            node(
              'span',
              'Усталость',
              'vt-unit-tag is-fatigued'
            )
          );
        }
      }

      if (active) {
        tags.append(
          node(
            'span',
            'Выбрана',
            'vt-unit-tag is-selection'
          )
        );
      }

      const facingTag = node(
        'span',
        facing.facing
          ? `Фронт ${facing.short}`
          : facing.text,
        'vt-unit-tag'
      );

      facingTag.title = facing.description;
      tags.append(facingTag);

      if (health.zero) {
        tags.append(
          node('span', '0 ХП', 'vt-unit-tag is-destroyed')
        );
      }

      button.append(heading, subline, tags);

      button.addEventListener('click', () => {
        selectModel(side, index);
      });

      const group = !positionsReady
        ? 'unknown'
        : position
          ? 'board'
          : 'reserve';

      groups[group].push(button);

      visible.add(index);
      count += 1;
    });

    function appendGroup(title, buttons) {
      if (!buttons.length) return;

      const section = node(
        'section',
        '',
        'vt-unit-group'
      );

      section.setAttribute('aria-label', title);

      const heading = node(
        'h4',
        '',
        'vt-unit-group-title'
      );

      heading.append(
        node('span', title),
        node('span', String(buttons.length))
      );

      section.append(heading, ...buttons);
      list.append(section);
    }

    appendGroup('На поле', groups.board);
    appendGroup('Резерв', groups.reserve);

    appendGroup(
      'Позиции не подтверждены',
      groups.unknown
    );

    const pending = [];

    if (waitingForPositions) {
      pending.push('ожидаем актуальные позиции');
    }

    if (waitingForStatuses) {
      pending.push('ожидаем актуальные отметки и раунд');
    }

    if (!count) {
      const emptyText = !units.length
        ? 'Ростер этой стороны ещё не выбран.'
        : pending.length
          ? 'Фильтр пока не может определить результат: ' +
            pending.join('; ') + '. ' +
            'Если загрузка не завершается, проверьте сообщение об ошибке.'
          : 'Нет моделей, подходящих под поиск и фильтры.';

      list.append(
        node('p', emptyText, 'vt-muted')
      );
    }

    list.scrollTop = previousScroll;

    $('vt-unit-count').textContent =
      `Показано ${count} из ${units.length}` +
      (
        pending.length
          ? ` · ${pending.join('; ')}`
          : ''
      );

    const selectedUnit = selected
      ? unitsFor(selected.side)[selected.index]
      : null;

    const hiddenSelection = Boolean(
      selectedUnit &&
      selected.side === side &&
      !visible.has(selected.index)
    );

    selectionHint.hidden = !hiddenSelection;

    selectionHint.textContent = hiddenSelection
      ? `Выбранная модель ${modelNumber(
          selected.side,
          selected.index
        )} не отображается в текущем списке` +
        (
          pending.length
            ? ': часть данных для фильтра ещё недоступна.'
            : ': она скрыта поиском или фильтрами.'
        ) +
        ' Выбор и карточка сохранены.'
      : '';

    document.querySelectorAll('[data-list-side]')
      .forEach(button => {
        const active = button.dataset.listSide === side;

        button.classList.toggle('primary', active);
        button.setAttribute('aria-pressed', String(active));
      });
  }

  /* ========================================================================
     Поле
     ======================================================================== */

  function renderBoard() {
    const occupied = new Map();

    for (const side of ['a', 'b']) {
      unitsFor(side).forEach((unit, index) => {
        if (!unit || typeof unit !== 'object') return;

        const position = positionFor(side, index);

        if (position) {
          occupied.set(
            `${position.x}_${position.y}`,
            { side, index, unit }
          );
        }
      });
    }

    board.replaceChildren();
    board.append(node('span', '', 'vt-axis'));

    for (const letter of LETTERS) {
      board.append(node('span', letter, 'vt-axis'));
    }

    for (let y = 0; y < SIZE; y += 1) {
      board.append(
        node('span', String(y + 1), 'vt-axis')
      );

      for (let x = 0; x < SIZE; x += 1) {
        const occupant = occupied.get(`${x}_${y}`);
        const cell = node('button', '', 'vt-cell');

        cell.type = 'button';
        cell.dataset.x = String(x);
        cell.dataset.y = String(y);
        cell.dataset.hasUnit = String(Boolean(occupant));

        cell.classList.toggle(
          'is-alternate',
          Boolean((x + y) % 2)
        );

        const active = Boolean(
          occupant &&
          selected &&
          selected.side === occupant.side &&
          selected.index === occupant.index
        );

        cell.classList.toggle('is-selected', active);
        cell.setAttribute('aria-pressed', String(active));

        const coordinate = `${LETTERS[x]}${y + 1}`;

        appendOnlineTerrainCell(cell, terrainState, x, y);

        if (occupant) {
          const health = healthFor(
            occupant.unit,
            occupant.side,
            occupant.index
          );

          const facing = facingFor(
            occupant.side,
            occupant.index
          );

          const status = statusFor(
            occupant.side,
            occupant.index
          );

          const description =
            `${coordinate}: ` +
            `${modelNumber(occupant.side, occupant.index)} ` +
            `${modelName(occupant.unit)}. ` +
            `${health.description} ${facing.description} ` +
            `${status.text}.`;

          cell.setAttribute('aria-label', description);
          cell.title = description;

          cell.classList.toggle(
            'vt-online-zero-hp',
            health.zero
          );

          const token = node(
            'span',
            '',
            'vt-token vt-online-token'
          );

          token.dataset.side = occupant.side;

          token.classList.toggle(
            'is-activated',
            status.activated === true
          );

          const visualRole = getModelVisualRole(occupant.unit);

          const tokenHeading = node('strong');

          const icon = node('span');
          icon.setAttribute('aria-hidden', 'true');

          // Только статическая разметка общего модуля.
          icon.innerHTML = modelVisualIconHTML(visualRole);

          tokenHeading.append(
            icon,
            document.createTextNode(
              `${facing.short} ` +
              modelNumber(occupant.side, occupant.index)
            )
          );

          token.append(
            tokenHeading,
            node(
              'small',
              health.text,
              'vt-online-health-label'
            )
          );

          const classDescription =
            `Класс: ${modelVisualRoleName(visualRole)}.`;

          cell.setAttribute(
            'aria-label',
            `${description} ${classDescription}`
          );

          if (
            status.activated === true ||
            status.fatigued === true
          ) {
            const marks = node(
              'small',
              [
                status.activated ? 'Акт.' : '',
                status.fatigued ? 'У' : ''
              ].filter(Boolean).join(' · ')
            );

            marks.title = status.text;
            token.append(marks);
          }

          cell.append(token);
        } else {
          cell.setAttribute(
            'aria-label',
            `${coordinate}: пустая клетка`
          );
        }

        const surface = readOnlineTerrainSurface(
          terrainState,
          { x, y }
        );

        const terrainDescription =
          surface.name +
          (
            surface.height === null
              ? ', высота неизвестна'
              : `, высота ${surface.height}`
          );

        const existingDescription =
          cell.getAttribute('aria-label') || coordinate;

        const fullDescription =
          `${existingDescription}. ${terrainDescription}.`;

        cell.setAttribute('aria-label', fullDescription);
        cell.title = fullDescription;

        cell.addEventListener('click', () => {
          if (occupant) {
            selectModel(occupant.side, occupant.index);
          } else {
            void moveSelected({ x, y });
          }
        });

        board.append(cell);
      }
    }

    routeTool?.refresh();
  }

  /* ========================================================================
     Перевод ландшафта на слои
     ======================================================================== */

  async function migrateTerrain() {
    if (
      terrainMigrationBusy ||
      !room ||
      ownSide !== 'a' ||
      !terrainState.ready ||
      terrainState.format !== 'legacy' ||
      terrainState.tiles.length === 0
    ) {
      return;
    }

    const confirmed = window.confirm(
      'Перевести ландшафт комнаты на слои?\n\n' +
      'Координаты, формы и числовые высоты сохранятся. ' +
      'Прежняя высота станет собственной высотой тайла.\n\n' +
      'Ноль и отрицательные значения тоже сохранятся: ' +
      'программа не будет самостоятельно исправлять их.\n\n' +
      'Позиции моделей не изменятся. ' +
      'Старый редактор сменится редактором слоёв. ' +
      'В нём пока доступно добавление верхних тайлов.\n\n' +
      'Перенос тайлов с моделями пока не подключён. ' +
      'Обратной кнопки перехода пока нет.'
    );

    if (!confirmed) return;

    const currentGeneration = generation;
    const currentUserId = auth.currentUser?.uid;

    terrainMigrationBusy = true;

    terrainEditor?.destroy();
    terrainEditor = null;

    layeredTerrainEditor?.destroy();
    layeredTerrainEditor = null;

    renderTerrainStatus();
    message('Переводим ландшафт комнаты на слои…');

    try {
      const result = await migrateOnlineTerrainToLayers({
        roomId: roomCode,

        isActive() {
          return (
            currentGeneration === generation &&
            Boolean(room) &&
            ownSide === 'a' &&
            auth.currentUser?.uid === currentUserId
          );
        }
      });

      if (currentGeneration !== generation) return;

      message(
        `Переход сохранён. Тайлов: ${result.count}. ` +
        'Ожидаем обновление общего ландшафта.'
      );
    } catch (error) {
      if (currentGeneration !== generation) return;

      console.error('Online terrain migration:', error);

      message(
        'Переход не подтверждён: ' +
        String(error.message || error.code || error) +
        ' Проверьте состояние поля перед повтором.',
        true
      );
    } finally {
      if (currentGeneration === generation) {
        terrainMigrationBusy = false;
        renderTerrainStatus();
      }
    }
  }

  /* ========================================================================
     Панель ландшафта
     ======================================================================== */

  function renderTerrainStatus() {
    const container = $('vt-terrain-editor');

    let status = container.querySelector(
      '[data-online-terrain-status]'
    );

    if (!status) {
      container.replaceChildren();

      status = node('div');
      status.dataset.onlineTerrainStatus = 'true';

      container.append(status);
    }

    status.replaceChildren(
      node('h2', 'Общий ландшафт')
    );

    if (!room) {
      status.append(
        node(
          'p',
          'Для загрузки ландшафта требуется доступ к комнате.',
          'vt-muted'
        )
      );

      terrainEditor?.destroy();
      terrainEditor = null;

      layeredTerrainEditor?.destroy();
      layeredTerrainEditor = null;

      return;
    }

    if (!terrainState.ready) {
      status.append(
        node(
          'p',
          terrainState.error ||
            'Ландшафт загружается с сервера…',
          'vt-muted'
        )
      );
    } else {
      status.append(
        node(
          'p',
          `Тайлов: ${terrainState.tiles.length}. ` +
          'Ландшафт подтверждён сервером.',
          'vt-muted'
        )
      );
    }

    status.append(
      node(
        'p',
        ownSide === 'a'
          ? 'Вы — создатель комнаты. Создание и настройка ' +
            'тайлов доступны до и после фиксации составов.'
          : 'Создание и настройка тайлов доступны ' +
            'только создателю комнаты.',
        'vt-muted'
      ),
      node(
        'p',
        'Высота клетки без тайла неизвестна. ' +
        'Местность не изменяет характеристики моделей автоматически. ' +
        'Новый тайл не должен накрывать клетки с моделями. ' +
        'Перенос тайлов с моделями пока не подключён.',
        'vt-muted'
      )
    );

    if (
      ownSide === 'a' &&
      terrainState.ready &&
      terrainState.format === 'legacy'
    ) {
      const migrateButton = node(
        'button',
        terrainMigrationBusy
          ? 'Переводим на слои…'
          : 'Перевести комнату на слои',
        'builder-action-btn'
      );

      migrateButton.type = 'button';

      migrateButton.disabled =
        terrainMigrationBusy ||
        terrainState.tiles.length === 0;

      migrateButton.addEventListener('click', () => {
        void migrateTerrain();
      });

      status.append(migrateButton);

      if (terrainState.tiles.length === 0) {
        status.append(
          node(
            'p',
            'Для перехода сначала добавьте хотя бы один тайл. ' +
            'Переход пустой комнаты пока не подключён.',
            'vt-muted'
          )
        );
      }
    }

    if (terrainState.format === 'layers-v2') {
      status.append(
        node(
          'p',
          'Многослойный ландшафт: высоты складываются поклеточно. ' +
          'Частичные перекрытия разрешены. ' +
          'В редакторе пока доступно добавление верхних тайлов.',
          'vt-muted'
        )
      );
    }

    if (ownSide !== 'a' || terrainMigrationBusy) {
      terrainEditor?.destroy();
      terrainEditor = null;

      layeredTerrainEditor?.destroy();
      layeredTerrainEditor = null;

      return;
    }

    if (!terrainState.ready) {
      terrainEditor?.refresh();
      layeredTerrainEditor?.refresh();
      return;
    }

    if (terrainState.format === 'layers-v2') {
      terrainEditor?.destroy();
      terrainEditor = null;

      if (!layeredTerrainEditor) {
        layeredTerrainEditor =
          createOnlineLayeredTerrainEditor({
            roomId: roomCode,
            container,

            getRoom() {
              return room;
            },

            getState() {
              return terrainState;
            }
          });
      }

      layeredTerrainEditor.refresh();
    } else {
      layeredTerrainEditor?.destroy();
      layeredTerrainEditor = null;

      if (!terrainEditor) {
        terrainEditor = createOnlineTerrainEditor({
          roomId: roomCode,
          container,

          getRoom() {
            return room;
          },

          getState() {
            return terrainState;
          }
        });
      }

      terrainEditor.refresh();
    }
  }

  /* ========================================================================
     Сводка подготовки комнаты
     ======================================================================== */

  function renderRoomSummary() {
    const container = $('vt-online-room-pane');

    if (!container) return;

    let summary = container.querySelector(
      '[data-online-room-summary]'
    );

    if (!summary) {
      summary = node('section', '', 'vt-detail-block');
      summary.dataset.onlineRoomSummary = 'true';

      summary.setAttribute(
        'aria-label',
        'Подготовка комнаты'
      );

      container.prepend(summary);
    }

    summary.replaceChildren(
      node('h3', `Подготовка комнаты ${roomCode}`)
    );

    if (!room) {
      summary.append(
        node(
          'p',
          'Нет подтверждённых данных комнаты. ' +
          'Состояние подключения указано в сообщении стола.',
          'vt-muted'
        )
      );

      return;
    }

    summary.append(
      node(
        'p',
        roomReady
          ? 'Документ комнаты подтверждён сервером.'
          : 'Документ комнаты сейчас не подтверждён сервером. ' +
            'Ниже — последние подтверждённые данные. ' +
            'Перемещение временно недоступно.',
        'vt-muted'
      )
    );

    const rows = node('dl');
    rows.style.display = 'grid';
    rows.style.gridTemplateColumns =
      'minmax(90px, auto) minmax(0, 1fr)';
    rows.style.gap = '6px 12px';
    rows.style.margin = '12px 0';

    function row(label, value) {
      const term = node('dt', label);
      const description = node('dd', value);

      term.style.fontWeight = '600';
      description.style.margin = '0';
      description.style.overflowWrap = 'anywhere';

      rows.append(term, description);
    }

    const twoPlayers = Boolean(
      typeof room.hostId === 'string' &&
      room.hostId.length > 0 &&
      typeof room.guestId === 'string' &&
      room.guestId.length > 0 &&
      room.hostId !== room.guestId
    );

    row(
      'Участники',
      twoPlayers
        ? 'Обе стороны заняты'
        : 'Ожидаем второго участника'
    );

    for (const side of ['a', 'b']) {
      const roster = rosterFor(side);
      const count = unitsFor(side).length;

      row(
        `Армия ${side === 'a' ? 'А' : 'Б'}`,
        roster && count > 0
          ? `${String(roster.name || 'Без имени')} · ` +
            `${count} моделей`
          : 'Непустой ростер не выбран'
      );
    }

    row(
      'Составы',
      room.tableLocked === true
        ? 'Зафиксированы'
        : 'Ещё не зафиксированы'
    );

    row(
      'Позиции',
      positionsReady
        ? 'Подтверждены сервером'
        : 'Не подтверждены · перемещение недоступно'
    );

    row(
      'Ландшафт',
      terrainState.ready
        ? `Подтверждён · тайлов: ${terrainState.tiles.length}`
        : 'Не подтверждён сервером'
    );

    summary.append(
      rows,
      node(
        'p',
        'Занятая сторона не означает, что игрок сейчас онлайн. ' +
        'Первое фактическое перемещение фиксирует составы. ' +
        'Памятка сценария необязательна; её состояние показано ' +
        'в отдельной панели ниже. ' +
        'Эта сводка не проверяет игровые правила ' +
        'и не начинает партию автоматически.',
        'vt-muted'
      )
    );
  }

  /* ========================================================================
     Общая отрисовка
     ======================================================================== */

  function render() {
    const side = currentSide();
    const roster = rosterFor(side);

    $('vt-army-name').textContent =
      `Игрок ${side === 'a' ? 'А' : 'Б'} — ` +
      String(roster?.name || 'ростер не выбран');

    $('vt-army-meta').textContent = roster
      ? `${String(roster.clan || 'Клан не указан')} · ` +
        `${unitsFor(side).length} моделей`
      : 'Выберите ростер в дашборде комнаты.';

    let total = 0;
    let placed = 0;

    for (const item of ['a', 'b']) {
      const sideRoster = rosterFor(item);
      const units = unitsFor(item);

      const onBoard = units.filter(
        (unit, index) => positionFor(item, index)
      ).length;

      total += units.length;
      placed += onBoard;

      $(`vt-side-${item}-summary`).textContent =
        `Игрок ${item === 'a' ? 'А' : 'Б'}: ` +
        (
          sideRoster
            ? `${String(sideRoster.name || 'Без имени')} · ` +
              `${units.length} моделей · ` +
              (
                positionsReady
                  ? `на поле ${onBoard}`
                  : 'позиции не подтверждены'
              )
            : 'ростер не выбран'
        );
    }

    $('vt-field-summary').textContent = !roomReady
      ? 'Онлайн · комната не подтверждена сервером · ' +
        'перемещение недоступно'
      : positionsReady
        ? `Онлайн · на поле ${placed} · в резерве ${total - placed}`
        : 'Онлайн · позиции не подтверждены сервером · ' +
          'перемещение недоступно';

    renderList();
    renderDetails();
    renderBoard();
    renderTerrainStatus();
    renderRoomSummary();
  }

  /* ========================================================================
     Очистка подключений
     ======================================================================== */

  function stopPositions() {
    positionsConnection?.destroy();
    positionsConnection = null;

    positions = new Map();
    positionsReady = false;
    moveBusy = false;
  }

  function stopHealthIndicators() {
    healthConnection?.destroy();
    healthConnection = null;

    healthState = emptyOnlineHealthState();
  }

  function stopTerrain() {
    terrainMigrationBusy = false;

    terrainEditor?.destroy();
    terrainEditor = null;

    layeredTerrainEditor?.destroy();
    layeredTerrainEditor = null;

    terrainConnection?.destroy();
    terrainConnection = null;

    terrainState = emptyOnlineTerrainState();
  }

  function clearRoom(text, error = true) {
    roomReady = false;

    stopPositions();
    stopHealthIndicators();
    stopTerrain();

    statusConnection?.destroy();
    statusConnection = null;

    roundsConnection?.destroy();
    roundsConnection = null;

    notesConnection?.destroy();
    notesConnection = null;

    facingConnection?.destroy();
    facingConnection = null;

    objectivesConnection?.destroy();
    objectivesConnection = null;

    scenarioConnection?.destroy();
    scenarioConnection = null;

    stopOnlineHealth(details);

    room = null;
    ownSide = null;
    selected = null;

    render();
    message(text, error);
  }
  /* ========================================================================
     События интерфейса
     ======================================================================== */

  function applyZoom() {
    const value = Number($('vt-zoom').value);

    board.style.setProperty('--vt-cell', `${value}px`);
    $('vt-zoom-value').textContent = `${value} px`;
  }

  $('vt-zoom').addEventListener('input', applyZoom);
  applyZoom();

  sideSelect.addEventListener('change', () => {
    selected = null;
    render();
  });

  document.querySelectorAll('[data-list-side]')
    .forEach(button => {
      button.addEventListener('click', () => {
        const side = button.dataset.listSide;

        if (!['a', 'b'].includes(side)) return;

        sideSelect.value = side;
        selected = null;
        render();
      });
    });

  // Фильтры обновляют только список.
  // Выбранная карточка, черновик заметки и поле не пересоздаются.
  searchInput.addEventListener('input', renderList);
  locationFilter.addEventListener('change', renderList);
  statusFilter.addEventListener('change', renderList);

  $('vt-unit-filter-reset').addEventListener('click', () => {
    searchInput.value = '';
    locationFilter.value = 'all';
    statusFilter.value = 'all';
    renderList();
  });

  $('vt-deselect').addEventListener('click', () => {
    selected = null;
    render();
  });

  /* ========================================================================
     Оформление и маршрут
     ======================================================================== */

  initOnlineLayout();

  routeTool = createOnlineRoute({
    board,

    toolbar: document.querySelector(
      '.vt-field-panel .vt-field-toolbar'
    ),

    boardScroll: document.querySelector(
      '.vt-field-panel .vt-board-scroll'
    ),

    getContext() {
      if (
        !room ||
        !roomReady ||
        !selected ||
        selected.side !== ownSide ||
        !positionsReady ||
        moveBusy
      ) {
        return null;
      }

      const unit = unitsFor(selected.side)[selected.index];
      const position = positionFor(
        selected.side,
        selected.index
      );

      if (
        !unit ||
        typeof unit !== 'object' ||
        !position
      ) {
        return null;
      }

      const facing = facingFor(
        selected.side,
        selected.index
      );

      return {
        key: onlineUnitId(selected.side, selected.index),

        label:
          `${modelNumber(selected.side, selected.index)} · ` +
          modelName(unit),

        position: {
          x: position.x,
          y: position.y
        },

        facing: facing.facing,
        facingText: facing.text,

        getSurface(point) {
          return readOnlineTerrainSurface(
            terrainState,
            point
          );
        }
      };
    }
  });

  render();
  initTableRoomConnection();

  /* ========================================================================
     Проверка кода комнаты
     ======================================================================== */

  if (!/^[A-Z0-9]{6}$/.test(roomCode)) {
    clearRoom('Неверный код комнаты в адресе страницы.');
    return;
  }

  /* ========================================================================
     Авторизация и подписки
     ======================================================================== */

  onAuthStateChanged(
    auth,

    user => {
      generation += 1;
      const currentGeneration = generation;

      if (unsubscribeRoom) {
        unsubscribeRoom();
        unsubscribeRoom = null;
      }

      clearRoom('Проверяем доступ к комнате…', false);

      if (!user || !user.emailVerified) {
        clearRoom(
          user
            ? 'Подтвердите электронную почту.'
            : 'Войдите в аккаунт.'
        );

        return;
      }

      unsubscribeRoom = onSnapshot(
        doc(db, 'rooms', roomCode),
        { includeMetadataChanges: true },

        snapshot => {
          if (currentGeneration !== generation) return;

          if (
            snapshot.metadata.fromCache ||
            snapshot.metadata.hasPendingWrites
          ) {
            roomReady = false;

            // Не заменяем подтверждённую комнату данными
            // из кеша или ещё не подтверждённой записью.
            // Отсутствие документа в кеше не означает удаление.
            render();

            message(
              'Ожидаем подтверждение комнаты сервером. ' +
              'Если поле уже показано, это последние ' +
              'подтверждённые данные. ' +
              'Перемещение временно недоступно.',
              false
            );

            return;
          }

          if (!snapshot.exists()) {
            clearRoom('Комната не найдена или удалена.');
            return;
          }

          const nextRoom = snapshot.data();

          const host = nextRoom.hostId === user.uid;
          const guest = nextRoom.guestId === user.uid;

          if (host === guest) {
            clearRoom(
              host
                ? 'Аккаунт указан за обе стороны. Подключение остановлено.'
                : 'Вы не участник комнаты.'
            );

            return;
          }

          const firstConnection = room === null;

          if (
            room &&
            (
              JSON.stringify(room.hostRoster) !==
                JSON.stringify(nextRoom.hostRoster) ||
              JSON.stringify(room.guestRoster) !==
                JSON.stringify(nextRoom.guestRoster)
            )
          ) {
            selected = null;
          }

          room = nextRoom;
          roomReady = true;
          ownSide = host ? 'a' : 'b';

          if (firstConnection) {
            sideSelect.value = ownSide;
          }

          // Ландшафт.
          if (!terrainConnection) {
            terrainConnection = connectOnlineTerrain({
              roomId: roomCode,

              onChange(nextState) {
                if (
                  currentGeneration !== generation ||
                  !room
                ) {
                  return;
                }

                terrainState = nextState;

                renderBoard();
                renderTerrainStatus();
                renderRoomSummary();
              },

              onError(error) {
                if (
                  currentGeneration !== generation ||
                  !room
                ) {
                  return;
                }

                console.error(
                  'Online terrain subscription:',
                  error
                );

                message(
                  'Ландшафт недоступен: ' +
                  String(error.code || error.message),
                  true
                );
              }
            });
          }

          // Позиции.
          if (!positionsConnection) {
            positionsConnection = connectOnlinePositions({
              roomId: roomCode,
              userId: user.uid,

              onPending() {
                if (
                  currentGeneration !== generation ||
                  !room
                ) {
                  return;
                }

                positionsReady = false;

                // Последние подтверждённые модели остаются
                // на поле, но перемещение временно запрещено.
                render();
              },

              onChange(nextPositions) {
                if (
                  currentGeneration !== generation ||
                  !room
                ) {
                  return;
                }

                positions = nextPositions;
                positionsReady = true;
                render();
              },

              onError(error) {
                if (
                  currentGeneration !== generation ||
                  !room
                ) {
                  return;
                }

                positionsReady = false;
                render();

                console.error(
                  'Online positions subscription:',
                  error
                );

                message(
                  'Не удалось получить актуальные позиции: ' +
                  String(error.code || error.message),
                  true
                );
              }
            });
          }

          // Индикаторы ХП.
          if (!healthConnection) {
            healthConnection = connectOnlineHealthIndicators({
              roomId: roomCode,

              onChange(nextHealthState) {
                if (
                  currentGeneration !== generation ||
                  !room
                ) {
                  return;
                }

                healthState = nextHealthState;

                renderList();
                renderBoard();
              },

              onError(error) {
                if (
                  currentGeneration !== generation ||
                  !room
                ) {
                  return;
                }

                healthState = emptyOnlineHealthState(
                  String(error.code || error.message)
                );

                renderList();
                renderBoard();

                console.error(
                  'Online health indicators subscription:',
                  error
                );

                message(
                  'Не удалось получить индикаторы ХП: ' +
                  String(error.code || error.message),
                  true
                );
              }
            });
          }

          // Фронт.
          if (!facingConnection) {
            facingConnection = connectOnlineFacing({
              roomId: roomCode,
              userId: user.uid,

              getRoom() {
                return room;
              },

              onChange() {
                if (
                  currentGeneration !== generation ||
                  !room
                ) {
                  return;
                }

                renderList();
                renderBoard();
              },

              onError(error) {
                if (
                  currentGeneration !== generation ||
                  !room
                ) {
                  return;
                }

                console.error(
                  'Online facing subscription:',
                  error
                );

                message(
                  'Не удалось получить направления: ' +
                  String(error.code || error.message),
                  true
                );
              }
            });
          }

          // Общие заметки моделей.
          if (!notesConnection) {
            notesConnection = connectOnlineNotes({
              roomId: roomCode,
              userId: user.uid,

              getRoom() {
                return room;
              },

              onError(error) {
                if (
                  currentGeneration !== generation ||
                  !room
                ) {
                  return;
                }

                console.error('Online notes:', error);

                message(
                  'Заметка недоступна или сохранение не подтверждено: ' +
                  String(error.message || error.code || error),
                  true
                );
              }
            });
          }

          // Общий ручной раунд.
          if (!roundsConnection) {
            roundsConnection = connectOnlineRounds({
              roomId: roomCode,
              userId: user.uid,

              container: document.querySelector(
                '.vt-field-panel .vt-field-toolbar'
              ),

              getRoom() {
                return room;
              },

              onChange() {
                if (
                  currentGeneration !== generation ||
                  !room
                ) {
                  return;
                }

                statusConnection?.refresh();
                renderList();
                renderBoard();
              },

              onError(error) {
                if (
                  currentGeneration !== generation ||
                  !room
                ) {
                  return;
                }

                console.error('Online rounds:', error);

                message(
                  'Раунд недоступен или изменение не подтверждено: ' +
                  String(error.message || error.code || error),
                  true
                );
              }
            });
          }

          roundsConnection.refresh();

          // Активация и усталость.
          if (!statusConnection) {
            statusConnection = connectOnlineStatus({
              roomId: roomCode,
              userId: user.uid,

              getRoom() {
                return room;
              },

              getRoundState() {
                return roundsConnection?.getState() || {
                  ready: false,
                  round: null,
                  activationEpoch: null
                };
              },

              onChange() {
                if (
                  currentGeneration !== generation ||
                  !room
                ) {
                  return;
                }

                // Блок карточки обновляет сам модуль.
                // Карточку ХП здесь не пересоздаём.
                renderList();
                renderBoard();
              },

              onError(error) {
                if (
                  currentGeneration !== generation ||
                  !room
                ) {
                  return;
                }

                console.error('Online model status:', error);

                message(
                  'Отметки модели недоступны или изменение ' +
                  'не подтверждено: ' +
                  String(error.message || error.code || error),
                  true
                );
              }
            });
          }

                    // Общие КТ и счёт.
          if (!objectivesConnection) {
            const missionHost = document.getElementById(
              'vt-online-room-pane'
            );

            if (!missionHost) {
              throw new Error(
                'Не найдена панель комнаты для сетевой миссии.'
              );
            }

            objectivesConnection = connectOnlineObjectives({
              roomId: roomCode,
              userId: user.uid,
              container: missionHost,
              board,

              getRoom() {
                return room;
              }
            });
          }

          objectivesConnection.refresh();

                    // Общая текстовая памятка сценария.
          if (!scenarioConnection) {
            const scenarioHost = document.getElementById(
              'vt-online-room-pane'
            );

            if (!scenarioHost) {
              throw new Error(
                'Не найдена панель комнаты для памятки сценария.'
              );
            }

            scenarioConnection = connectOnlineScenario({
              roomId: roomCode,
              userId: user.uid,
              container: scenarioHost,

              getRoom() {
                return room;
              }
            });
          }

          scenarioConnection.refresh();

          render();

          message(
            `Комната ${roomCode} · ваша сторона ` +
            `${ownSide === 'a' ? 'А' : 'Б'}. ` +
            'Выберите свою модель и пустую клетку.'
          );
        },

        error => {
          if (currentGeneration !== generation) return;

          console.error('Online table room:', error);

          clearRoom(
            'Не удалось прочитать комнату: ' +
            String(error.code || error.message)
          );
        }
      );
    },

    error => {
      generation += 1;

      if (unsubscribeRoom) {
        unsubscribeRoom();
        unsubscribeRoom = null;
      }

      console.error('Online table auth:', error);
      clearRoom('Не удалось проверить аккаунт Firebase.');
    }
  );
}