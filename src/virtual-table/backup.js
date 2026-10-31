// src/virtual-table/backup.js
//
// Резервная копия локальной партии.
//
// Включает:
// — основное состояние стола;
// — КТ, контроль и счёт.
//
// Не включает:
// — историю отмены;
// — линейку;
// — черновики заметок;
// — настройки интерфейса;
// — библиотеки мастерской и билдера.
//
// Импорт не вставляет HTML в DOM.
// Пользовательские строки выводятся через textContent.
//
// У localStorage нет общей транзакции для нескольких ключей.
// При ошибке выполняется попытка отката.
// Одновременная работа нескольких вкладок не рекомендуется.

import {
  validMissionBackup as validMission
} from './objectives.js';

const TABLE_KEY = 'mt_virtual_table_local_v1';
const MISSION_KEY = 'mt_virtual_table_objectives_v1';
const DRAFTS_KEY = 'mt_virtual_table_note_drafts_v1';
const BUILDER_SIDE_KEY = 'mt_virtual_table_builder_side';

const MAX_FILE_BYTES = 16 * 1024 * 1024;
const LETTERS = 'ABCDEFGHIJKLMN';

const clone = value => JSON.parse(JSON.stringify(value));

let initialized = false;

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

function emptyMission() {
  return {
    version: 1,
    scores: { a: 0, b: 0 },
    objectives: []
  };
}


function readMission(raw) {
  const value = raw === null
    ? emptyMission()
    : JSON.parse(raw);

  if (!validMission(value)) {
    throw new Error(
      'Сохранение КТ и счёта повреждено ' +
      'или содержит неподдерживаемые поля.'
    );
  }

  return value;
}

function node(tag, content = '', className = '') {
  const element = document.createElement(tag);

  element.textContent = content;

  if (className) {
    element.className = className;
  }

  return element;
}

function exportName() {
  const date = new Date()
    .toISOString()
    .replace(/[:.]/g, '-');

  return `mt-table-backup-${date}.json`;
}

export function initTableBackup({
  getState,
  validateState,
  assertWritable
}) {
  if (initialized) return;

  if (
    typeof getState !== 'function' ||
    typeof validateState !== 'function' ||
    typeof assertWritable !== 'function'
  ) {
    throw new Error(
      'Резервная копия: не заданы обработчики стола.'
    );
  }

  const detailsPanel = document.querySelector(
    '.vt-details-panel'
  );

  if (!detailsPanel) {
    throw new Error(
      'Резервная копия: не найдена панель стола.'
    );
  }

  initialized = true;

  const panel = document.createElement('section');

  panel.id = 'vt-backup';
  panel.className = 'vt-load-panel';

  panel.setAttribute(
    'aria-label',
    'Резервная копия партии'
  );

  // Класс vt-load-panel позволяет существующей раскладке
  // перенести весь блок во вкладку «Партия».
  panel.style.display = 'block';

  // Только статическая разметка приложения.
  panel.innerHTML = `
    <h3>Резервная копия партии</h3>

    <p class="vt-muted">
      JSON включает обе армии, поле, раунд,
      сохранённые отметки и заметки моделей,
      сценарий со снимком карты, КТ, контроль и счёт.
    </p>

    <p class="vt-muted">
      История, линейка, несохранённые черновики,
      настройки интерфейса и библиотеки мастерской
      в копию не входят.
      Максимальный размер — 16 МиБ.
    </p>

    <div class="vt-detail-actions">
      <button type="button"
              class="builder-action-btn"
              data-backup-export>
        Экспорт партии JSON
      </button>

      <button type="button"
              class="builder-action-btn"
              data-backup-open>
        Выбрать резервную копию
      </button>
    </div>

    <input type="file"
           accept=".json,application/json"
           aria-label="Резервная копия партии JSON"
           data-backup-file
           hidden>

    <div data-backup-preview hidden></div>

    <div class="vt-detail-actions">
      <button type="button"
              class="builder-action-btn primary"
              data-backup-restore
              disabled>
        Восстановить выбранную партию
      </button>

      <button type="button"
              class="builder-action-btn"
              data-backup-cancel
              disabled>
        Отменить выбор
      </button>
    </div>

    <p class="vt-muted"
       data-backup-message
       role="status"
       aria-live="polite"></p>
  `;

  detailsPanel.append(panel);

  const find = selector => panel.querySelector(selector);

  const exportButton = find('[data-backup-export]');
  const openButton = find('[data-backup-open]');
  const restoreButton = find('[data-backup-restore]');
  const cancelButton = find('[data-backup-cancel]');
  const fileInput = find('[data-backup-file]');
  const preview = find('[data-backup-preview]');
  const status = find('[data-backup-message]');

  let candidate = null;
  let busy = false;

  function message(text, error = false) {
    status.textContent = text;
    status.style.color = error ? '#ffadb7' : '#b9dfc5';
  }

  function updateButtons() {
    exportButton.disabled = busy;
    openButton.disabled = busy;
    restoreButton.disabled = busy || !candidate;
    cancelButton.disabled = busy || !candidate;
  }

  function clearCandidate() {
    candidate = null;
    preview.replaceChildren();
    preview.hidden = true;
    updateButtons();
  }

  function validBackup(value) {
    return Boolean(
      exactKeys(value, [
        'format', 'version', 'exportedAt', 'table', 'mission'
      ]) &&
      value.format === 'mt-table-backup' &&
      value.version === 1 &&
      typeof value.exportedAt === 'string' &&
      value.exportedAt.length <= 100 &&
      Number.isFinite(Date.parse(value.exportedAt)) &&
      record(value.table) &&
      validateState(value.table) &&
      validMission(value.mission)
    );
  }

  function readBaseline() {
    assertWritable();

    return {
      tableRaw: localStorage.getItem(TABLE_KEY),
      missionRaw: localStorage.getItem(MISSION_KEY)
    };
  }

  function assertBaseline(baseline) {
    assertWritable();

    if (
      localStorage.getItem(TABLE_KEY) !== baseline.tableRaw ||
      localStorage.getItem(MISSION_KEY) !== baseline.missionRaw
    ) {
      throw new Error(
        'Партия или миссия изменились после выбора копии. ' +
        'Восстановление остановлено. Выберите файл заново.'
      );
    }
  }

  function renderPreview(backup) {
    preview.replaceChildren();
    preview.hidden = false;

    const table = backup.table;
    const mission = backup.mission;

    preview.append(
      node('h4', 'Выбрана резервная копия'),
      node(
        'p',
        'Создана: ' +
        new Date(backup.exportedAt).toLocaleString('ru-RU')
      ),
      node('p', `Раунд: ${table.round ?? 1}`)
    );

    for (const side of ['a', 'b']) {
      const roster = side === 'a'
        ? table.roster
        : table.opponentRoster;

      const units = table.units.filter(unit =>
        (unit.side === 'b' ? 'b' : 'a') === side
      );

      const placed = units.filter(unit => unit.position).length;

      preview.append(
        node(
          'p',
          `Игрок ${side === 'a' ? 'А' : 'Б'}: ` +
          (roster
            ? `${String(roster.name || 'Без имени')} · ` +
              `${units.length} моделей · на поле ${placed}`
            : 'армия не загружена')
        )
      );
    }

    preview.append(
      node(
        'p',
        `Местность: ${table.terrain?.length || 0} тайлов · ` +
        `Зоны: ${table.deployment?.length || 0} клеток · ` +
        `Маркеры: ${table.mapMarkers?.length || 0}`
      ),
      node(
        'p',
        table.scenario
          ? `Сценарий: ${table.scenario.name}`
          : 'Сценарий не прикреплён.'
      ),
      node(
        'p',
        `КТ: ${mission.objectives.length} · ` +
        `Счёт А: ${mission.scores.a} · ` +
        `Счёт Б: ${mission.scores.b}`
      )
    );

    if (mission.objectives.length) {
      const list = document.createElement('ul');

      mission.objectives.forEach(point => {
        list.append(
          node(
            'li',
            `${point.title} · ` +
            `${LETTERS[point.x]}${point.y + 1} · ` +
            (point.owner === 'neutral'
              ? 'нейтральная'
              : `Игрок ${point.owner === 'a' ? 'А' : 'Б'}`)
          )
        );
      });

      preview.append(list);
    }

    preview.append(
      node(
        'p',
        'Файл проверен на совместимость с текущим столом. ' +
        'Это не проверка игровых правил, баланса ' +
        'или подлинности характеристик.',
        'vt-muted'
      )
    );
  }

  exportButton.addEventListener('click', () => {
    let url = null;
    let link = null;

    try {
      const baseline = readBaseline();
      const current = getState();

      if (!current || !validateState(current)) {
        throw new Error(
          'Сначала загрузите или восстановите корректную партию.'
        );
      }

      const backup = {
        format: 'mt-table-backup',
        version: 1,
        exportedAt: new Date().toISOString(),
        table: clone(current),
        mission: readMission(baseline.missionRaw)
      };

      if (!validBackup(backup)) {
        throw new Error(
          'Не удалось подготовить корректную резервную копию.'
        );
      }

      const raw = JSON.stringify(backup, null, 2);
      const blob = new Blob([raw], {
        type: 'application/json;charset=utf-8'
      });

      if (blob.size > MAX_FILE_BYTES) {
        throw new Error(
          'Размер резервной копии превышает 16 МиБ.'
        );
      }

      assertBaseline(baseline);

      url = URL.createObjectURL(blob);

      link = document.createElement('a');
      link.href = url;
      link.download = exportName();

      document.body.append(link);
      link.click();

      message(
        'Запрошено скачивание JSON. Проверьте загрузки браузера. ' +
        'Партия не изменена. Несохранённые черновики ' +
        'заметок в копию не входят.'
      );
    } catch (error) {
      message(`Экспорт не выполнен: ${error.message}`, true);
    } finally {
      link?.remove();

      if (url) {
        const savedUrl = url;

        setTimeout(() => {
          URL.revokeObjectURL(savedUrl);
        }, 10000);
      }
    }
  });

  openButton.addEventListener('click', () => {
    if (busy) return;

    fileInput.value = '';
    fileInput.click();
  });

  cancelButton.addEventListener('click', () => {
    clearCandidate();
    message('Выбор отменён. Партия не изменена.');
  });

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];

    if (!file || busy) return;

    clearCandidate();
    busy = true;
    updateButtons();

    try {
      // Фиксируем оба ключа до асинхронного чтения файла.
      const baseline = readBaseline();

      if (!file.size || file.size > MAX_FILE_BYTES) {
        throw new Error(
          'Выберите непустой JSON размером не более 16 МиБ.'
        );
      }

      const raw = await file.text();

      if (raw.length > MAX_FILE_BYTES) {
        throw new Error('Содержимое файла слишком большое.');
      }

      const backup = JSON.parse(
        raw.replace(/^\uFEFF/, '')
      );

      if (!validBackup(backup)) {
        throw new Error(
          'Ожидается mt-table-backup версии 1 ' +
          'с корректной партией и миссией. ' +
          'Файлы отдельных карт, сценариев и ростеров ' +
          'здесь не принимаются.'
        );
      }

      assertBaseline(baseline);

      candidate = {
        backup,
        baseline
      };

      renderPreview(backup);

      message(
        'Копия прочитана. Проверьте состав и нажмите ' +
        '«Восстановить выбранную партию». ' +
        'До подтверждения сохранения не изменяются.'
      );
    } catch (error) {
      clearCandidate();
      message(`Файл не принят: ${error.message}`, true);
    } finally {
      busy = false;
      fileInput.value = '';
      updateButtons();
    }
  });

  restoreButton.addEventListener('click', () => {
    if (!candidate || busy) return;

    try {
      assertBaseline(candidate.baseline);

      if (!validBackup(candidate.backup)) {
        throw new Error(
          'Выбранная копия больше не проходит проверку.'
        );
      }

      if (!confirm(
        'Заменить текущую локальную партию резервной копией?\n\n' +
        'Будут заменены обе армии, поле, раунд, ' +
        'отметки и заметки моделей, памятка сценария, ' +
        'КТ, их контроль и счёт.\n\n' +
        'Черновики заметок текущей вкладки будут удалены. ' +
        'История отмены и измерение линейки не сохранятся.\n\n' +
        'Ростеры билдера и библиотеки мастерской ' +
        'останутся прежними.\n\n' +
        'Страница перезагрузится. Отменить импорт ' +
        'через историю стола нельзя.'
      )) {
        return;
      }

      const selected = candidate;

      busy = true;
      updateButtons();

      // Проверяем оба ключа повторно после подтверждения.
      assertBaseline(selected.baseline);

      replaceData(
        selected.backup,
        selected.baseline
      );

      candidate = null;

      message('Партия восстановлена. Перезагрузка…');
      window.location.reload();
    } catch (error) {
      busy = false;
      clearCandidate();

      message(
        `Восстановление не завершено: ${error.message}`,
        true
      );
    }
  });

  message(
    'Экспорт не меняет партию. ' +
    'Для импорта сначала выберите и проверьте файл.'
  );
}

/**
 * Запись нескольких ключей с попыткой отката.
 *
 * При откате не перезаписываем ключ, если его значение
 * уже отличается от записанного этой операцией.
 */
function replaceData(backup, baseline) {
  const operations = [
    {
      storage: localStorage,
      key: TABLE_KEY,
      value: JSON.stringify(backup.table)
    },
    {
      storage: localStorage,
      key: MISSION_KEY,
      value: JSON.stringify(backup.mission)
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

  // До первой записи читаем все исходные значения.
  const backups = operations.map(operation => ({
    ...operation,
    previous: operation.storage.getItem(operation.key)
  }));

  if (
    backups[0].previous !== baseline.tableRaw ||
    backups[1].previous !== baseline.missionRaw
  ) {
    throw new Error(
      'Сохранения изменились перед записью. ' +
      'Ничего не заменено. Выберите файл заново.'
    );
  }

  const written = [];

  try {
    for (const operation of backups) {
      if (
        operation.storage.getItem(operation.key) !==
        operation.previous
      ) {
        throw new Error(
          'Обнаружено внешнее изменение во время восстановления.'
        );
      }

      writeValue(
        operation.storage,
        operation.key,
        operation.value
      );

      written.push(operation);
    }
  } catch (error) {
    let restored = true;

    for (const operation of written.reverse()) {
      try {
        if (
          operation.storage.getItem(operation.key) !==
          operation.value
        ) {
          restored = false;
          continue;
        }

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
        ? 'Запись остановлена, затронутые значения восстановлены. ' +
          `Причина: ${error.message}`
        : 'Не удалось полностью восстановить исходные значения. ' +
          'Не закрывайте страницу: текущее состояние стола ' +
          'пока остаётся в памяти, но данные в хранилище ' +
          'могли измениться. ' +
          `Причина: ${error.message}`
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