// src/virtual-table/session.js
//
// Команды подготовки новой локальной партии.
// Не являются игровыми действиями.
//
// Сохранённые ростеры билдера, activeRoster и библиотеки
// мастерской не изменяются.
//
// Переигровка:
// — сохраняет армии, местность, зоны и маркеры;
// — сохраняет памятку сценария с её снимком карты;
// — сбрасывает модели, раунд, КТ и счёт.
//
// Полная очистка:
// — удаляет основное состояние стола, включая памятку сценария;
// — удаляет КТ, счёт и черновики текущей вкладки;
// — не удаляет документы мастерской.

const TABLE_KEY = 'mt_virtual_table_local_v1';
const OBJECTIVES_KEY = 'mt_virtual_table_objectives_v1';
const DRAFTS_KEY = 'mt_virtual_table_note_drafts_v1';
const BUILDER_SIDE_KEY = 'mt_virtual_table_builder_side';

let initialized = false;

export function initSessionControls(options) {
  if (initialized) return;

  const fieldPanel = document.querySelector('.vt-field-panel');
  const boardScroll = fieldPanel?.querySelector('.vt-board-scroll');

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
  } = options;

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

  panel.addEventListener('click', event => {
    const button = event.target.closest('[data-session-action]');

    if (!button || button.disabled || busy) return;

    const action = button.dataset.sessionAction;

    if (!['replay', 'clear'].includes(action)) return;

    try {
      assertWritable();
    } catch (error) {
      message(error.message, true);
      return;
    }

    let nextState = null;

    if (action === 'replay') {
      const current = getState();

      if (!current || !current.units?.length) {
        message(
          'Сначала загрузите хотя бы одну армию. ' +
          'Для пустого стола доступна полная очистка.',
          true
        );
        return;
      }

      if (!confirm(
        'Начать новую партию теми же армиями?\n\n' +

        'Сохранятся:\n' +
        '• обе загруженные армии и их артефакты;\n' +
        '• ландшафт, зоны расстановки и маркеры карты;\n' +
        '• памятка сценария и прикреплённый к ней снимок карты, ' +
        'если сценарий загружен.\n\n' +

        'Будут сброшены:\n' +
        '• позиции — все модели вернутся в резерв;\n' +
        '• ХП — восстановятся до максимума;\n' +
        '• раунд — станет 1;\n' +
        '• активации, усталость и направления фронта;\n' +
        '• заметки моделей и их черновики текущей вкладки;\n' +
        '• контрольные точки и счёт;\n' +
        '• история отмены и измерение линейки.\n\n' +

        'КТ снимка сценария автоматически не восстанавливаются. ' +
        'При необходимости загрузите их отдельной кнопкой ' +
        'после сброса.\n\n' +

        'Страница перезагрузится. Отменить сброс нельзя.'
      )) {
        return;
      }

      try {
        // Копируем всё состояние, включая scenario.
        // Сохранённый снимок сценария не применяется к полю повторно:
        // текущие местность, зоны и маркеры сохраняются как есть.
        nextState = JSON.parse(JSON.stringify(current));

        nextState.id = crypto.randomUUID();
        nextState.round = 1;

        nextState.units.forEach(unit => {
          unit.position = null;
          unit.currentHp = unit.stats.hp;
          unit.activated = false;
          unit.fatigued = false;
          unit.facing = null;
          unit.note = '';
        });

        if (!validateState(nextState)) {
          throw new Error(
            'Не удалось подготовить корректное состояние новой партии.'
          );
        }
      } catch (error) {
        message(
          `Партия не сброшена: ${error.message}`,
          true
        );
        return;
      }
    }

    if (action === 'clear') {
      if (!confirm(
        'Полностью очистить виртуальный стол?\n\n' +

        'Будут удалены:\n' +
        '• обе армии с текущего стола;\n' +
        '• ландшафт, зоны расстановки и маркеры карты;\n' +
        '• памятка сценария на столе;\n' +
        '• раунд и все отметки моделей;\n' +
        '• заметки и черновики текущей вкладки;\n' +
        '• контрольные точки и счёт;\n' +
        '• история отмены и измерение линейки.\n\n' +

        'Сохранённые ростеры в билдере и активный ростер останутся. ' +
        'Карты, авторские модели и сценарии в мастерской ' +
        'также останутся.\n\n' +

        'Страница перезагрузится. Отменить очистку нельзя.'
      )) {
        return;
      }
    }

    busy = true;

    panel.querySelectorAll('button').forEach(item => {
      item.disabled = true;
    });

    try {
      // Повторная проверка после подтверждения:
      // другая вкладка могла изменить основное сохранение.
      assertWritable();

      replaceSessionData(nextState);
    } catch (error) {
      busy = false;

      panel.querySelectorAll('button').forEach(item => {
        item.disabled = false;
      });

      message(error.message, true);
      return;
    }

    message(
      action === 'replay'
        ? 'Новая партия подготовлена. Перезагрузка…'
        : 'Стол очищен. Перезагрузка…'
    );

    // Перезагрузка синхронизирует существующие модули:
    // основное состояние, миссию, историю, линейку,
    // памятку сценария и черновики.
    window.location.reload();
  });
}

/**
 * Обновляет связанные ключи сохранения.
 *
 * Браузерные хранилища не поддерживают общую транзакцию.
 * Перед записью сохраняем исходные значения.
 * При ошибке пытаемся восстановить затронутые ключи.
 *
 * Это не гарантирует атомарность при сбое браузера
 * или одновременной работе нескольких вкладок.
 */
function replaceSessionData(nextState) {
  const operations = [
    {
      storage: localStorage,
      key: TABLE_KEY,
      value: nextState === null
        ? null
        : JSON.stringify(nextState)
    },
    {
      storage: localStorage,
      key: OBJECTIVES_KEY,
      value: null
    },
    {
      storage: sessionStorage,
      key: DRAFTS_KEY,
      value: null
    },
    {
      storage: sessionStorage,
      key: BUILDER_SIDE_KEY,
      value: null
    }
  ];

  // Сначала читаем все исходные значения.
  // Если чтение недоступно, ничего не изменяем.
  const backups = operations.map(operation => ({
    ...operation,
    previous: operation.storage.getItem(operation.key)
  }));

  const attempted = [];

  try {
    for (const operation of backups) {
      attempted.push(operation);

      writeValue(
        operation.storage,
        operation.key,
        operation.value
      );
    }
  } catch (error) {
    let restored = true;

    for (const operation of attempted.reverse()) {
      try {
        writeValue(
          operation.storage,
          operation.key,
          operation.previous
        );
      } catch {
        restored = false;
      }
    }

    throw new Error(
      restored
        ? 'Не удалось обновить сохранение. ' +
          'Исходные данные восстановлены. ' +
          `Причина: ${error.message}`
        : 'Ошибка хранилища: не удалось полностью восстановить данные. ' +
          'Не закрывайте страницу. ' +
          'Текущее состояние армий пока остаётся в памяти, ' +
          'но сохранение на диске могло измениться.'
    );
  }
}

function writeValue(storage, key, value) {
  if (value === null) {
    storage.removeItem(key);
  } else {
    storage.setItem(key, value);
  }
}