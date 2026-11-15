// src/virtual-table/session.js
//
// Подготовка новой локальной партии.
//
// Переигровка сохраняет армии, местность, зоны, маркеры
// и памятку сценария. Сбрасывает модели, раунд, КТ и счёт.
//
// Полная очистка удаляет партию, КТ, счёт и черновики
// текущей вкладки.
//
// Ростеры билдера и библиотеки мастерской не изменяются.
//
// Хранилища браузера не поддерживают общую транзакцию.
// Сравнение исходных строк защищает от обычной записи
// из устаревшей вкладки, но не обеспечивает атомарность
// при одновременном редактировании или сбое браузера.

const TABLE_KEY = 'mt_virtual_table_local_v1';
const OBJECTIVES_KEY = 'mt_virtual_table_objectives_v1';
const DRAFTS_KEY = 'mt_virtual_table_note_drafts_v1';
const BUILDER_SIDE_KEY = 'mt_virtual_table_builder_side';

let initialized = false;

function readSnapshot() {
  return [
    {
      storage: localStorage,
      key: TABLE_KEY,
      label: 'Основная партия',
      previous: localStorage.getItem(TABLE_KEY)
    },
    {
      storage: localStorage,
      key: OBJECTIVES_KEY,
      label: 'Контрольные точки и счёт',
      previous: localStorage.getItem(OBJECTIVES_KEY)
    },
    {
      storage: sessionStorage,
      key: DRAFTS_KEY,
      label: 'Черновики заметок',
      previous: sessionStorage.getItem(DRAFTS_KEY)
    },
    {
      storage: sessionStorage,
      key: BUILDER_SIDE_KEY,
      label: 'Маркер перехода в билдер',
      previous: sessionStorage.getItem(BUILDER_SIDE_KEY)
    }
  ];
}

function assertSnapshot(snapshot) {
  for (const item of snapshot) {
    if (item.storage.getItem(item.key) !== item.previous) {
      throw new Error(
        `«${item.label}»: данные изменились после начала операции. ` +
        'Сброс остановлен. Проверьте актуальную партию ' +
        'и повторите действие.'
      );
    }
  }
}

function writeValue(storage, key, value) {
  if (value === null) {
    storage.removeItem(key);
  } else {
    storage.setItem(key, value);
  }
}

function replaceSessionData(nextState, snapshot) {
  // Сериализация выполняется до первой записи.
  const tableRaw = nextState === null
    ? null
    : JSON.stringify(nextState);

  const operations = snapshot.map(item => ({
    ...item,
    value: item.key === TABLE_KEY ? tableRaw : null
  }));

  // Проверяем весь набор до изменения первого ключа.
  assertSnapshot(snapshot);

  const written = [];

  try {
    for (const operation of operations) {
      if (
        operation.storage.getItem(operation.key) !==
        operation.previous
      ) {
        throw new Error(
          `«${operation.label}»: обнаружено внешнее изменение.`
        );
      }

      writeValue(
        operation.storage,
        operation.key,
        operation.value
      );

      written.push(operation);
    }

    // Не объявляем успех, если другой контекст уже успел
    // изменить одно из записанных значений.
    for (const operation of operations) {
      if (
        operation.storage.getItem(operation.key) !==
        operation.value
      ) {
        throw new Error(
          `«${operation.label}»: данные изменились во время сброса.`
        );
      }
    }
  } catch (error) {
    let restored = true;

    for (const operation of [...written].reverse()) {
      try {
        const actual = operation.storage.getItem(
          operation.key
        );

        // Не затираем значение, которое уже отличается
        // от записанного этой операцией.
        if (actual !== operation.value) {
          restored = false;
          continue;
        }

        writeValue(
          operation.storage,
          operation.key,
          operation.previous
        );

        if (
          operation.storage.getItem(operation.key) !==
          operation.previous
        ) {
          restored = false;
        }
      } catch {
        restored = false;
      }
    }

    throw new Error(
      restored
        ? 'Сброс остановлен. Выполненные записи отменены. ' +
          `Причина: ${error.message}`
        : 'Сброс не завершён, полный откат не подтверждён. ' +
          'Не закрывайте и не перезагружайте страницу: ' +
          'текущее состояние стола пока остаётся в памяти, ' +
          'но сохранения могли измениться. ' +
          `Причина: ${error.message}`
    );
  }
}

function replayQuestion() {
  return (
    'Начать новую партию теми же армиями?\n\n' +

    'Сохранятся:\n' +
    '• обе загруженные армии и их артефакты;\n' +
    '• ландшафт, зоны расстановки и маркеры карты;\n' +
    '• памятка сценария и её снимок карты.\n\n' +

    'Будут сброшены:\n' +
    '• позиции — все модели вернутся в резерв;\n' +
    '• ХП — восстановятся до максимума;\n' +
    '• раунд — станет 1;\n' +
    '• активации, усталость и направления фронта;\n' +
    '• заметки моделей и черновики текущей вкладки;\n' +
    '• контрольные точки и счёт;\n' +
    '• история отмены и измерения.\n\n' +

    'КТ снимка сценария автоматически не восстанавливаются. ' +
    'При необходимости загрузите их отдельной кнопкой ' +
    'после сброса.\n\n' +

    'Страница перезагрузится. Отменить сброс нельзя.'
  );
}

function clearQuestion() {
  return (
    'Полностью очистить виртуальный стол?\n\n' +

    'Будут удалены:\n' +
    '• обе армии с текущего стола;\n' +
    '• ландшафт, зоны расстановки и маркеры карты;\n' +
    '• памятка сценария на столе;\n' +
    '• раунд и все отметки моделей;\n' +
    '• заметки и черновики текущей вкладки;\n' +
    '• контрольные точки и счёт;\n' +
    '• история отмены и измерения.\n\n' +

    'Сохранённые ростеры билдера и активный ростер останутся. ' +
    'Карты, авторские модели и сценарии мастерской ' +
    'также останутся.\n\n' +

    'Страница перезагрузится. Отменить очистку нельзя.'
  );
}

function prepareReplay(current, validateState) {
  const next = JSON.parse(JSON.stringify(current));

  next.id = crypto.randomUUID();
  next.round = 1;

  next.units.forEach(unit => {
    unit.position = null;
    unit.currentHp = unit.stats.hp;
    unit.activated = false;
    unit.fatigued = false;
    unit.facing = null;
    unit.note = '';
  });

  if (!validateState(next)) {
    throw new Error(
      'Не удалось подготовить корректное состояние новой партии.'
    );
  }

  return next;
}

export function initSessionControls(options) {
  if (initialized) return;

  const fieldPanel = document.querySelector(
    '.vt-field-panel'
  );

  const boardScroll = fieldPanel?.querySelector(
    '.vt-board-scroll'
  );

  if (!fieldPanel || !boardScroll) {
    console.error(
      'Управление партией: не найдены элементы поля.'
    );
    return;
  }

  const {
    getState,
    validateState,
    assertWritable,
    message
  } = options || {};

  if (
    typeof getState !== 'function' ||
    typeof validateState !== 'function' ||
    typeof assertWritable !== 'function' ||
    typeof message !== 'function'
  ) {
    throw new Error(
      'Управление партией: не заданы необходимые обработчики.'
    );
  }

  initialized = true;

  const panel = document.createElement('section');

  panel.className = 'vt-field-toolbar';
  panel.setAttribute('aria-label', 'Начало новой партии');

  // Только статическая разметка приложения.
  panel.innerHTML = `
    <span>Новая партия</span>

    <button type="button"
            class="builder-action-btn"
            data-session-action="replay">
      Переиграть теми же армиями
    </button>

    <button type="button"
            class="builder-action-btn"
            data-session-action="clear">
      Полностью очистить стол
    </button>
  `;

  boardScroll.before(panel);

  let busy = false;

  function setBusy(value) {
    busy = value;

    panel.querySelectorAll('button').forEach(button => {
      button.disabled = value;
    });
  }

  panel.addEventListener('click', event => {
    const button = event.target instanceof Element
      ? event.target.closest('[data-session-action]')
      : null;

    if (!button || button.disabled || busy) return;

    const action = button.dataset.sessionAction;

    if (!['replay', 'clear'].includes(action)) return;

    setBusy(true);

    let completed = false;

    try {
      assertWritable();

      // Фиксируем все затрагиваемые значения до подтверждения.
      const snapshot = readSnapshot();

      // Повторная проверка основного сохранения после чтения.
      assertWritable();

      let nextState = null;

      if (action === 'replay') {
        const current = getState();

        if (!current || !current.units?.length) {
          throw new Error(
            'Сначала загрузите хотя бы одну армию. ' +
            'Для пустого стола доступна полная очистка.'
          );
        }

        if (!validateState(current)) {
          throw new Error(
            'Текущая партия не прошла проверку. ' +
            'Сброс не выполнен.'
          );
        }

        nextState = prepareReplay(current, validateState);
      }

      const confirmed = window.confirm(
        action === 'replay'
          ? replayQuestion()
          : clearQuestion()
      );

      if (!confirmed) return;

      // За время подтверждения могли измениться
      // как основная партия, так и отдельное сохранение миссии.
      assertWritable();
      assertSnapshot(snapshot);

      replaceSessionData(nextState, snapshot);

      completed = true;

      message(
        action === 'replay'
          ? 'Новая партия подготовлена. Перезагрузка…'
          : 'Стол очищен. Перезагрузка…'
      );

      window.location.reload();
    } catch (error) {
      console.error('Сброс локальной партии:', error);

      message(
        `Операция не завершена: ${error.message}`,
        true
      );
    } finally {
      if (!completed) {
        setBusy(false);
      }
    }
  });
}