// src/workshop/map-transfer.js
//
// Резервный экспорт и импорт одной карты.
//
// Импортированные данные никогда не вставляются как HTML.
// Импорт создаёт новую карту, без перезаписи существующих.
//
// Текущий поддерживаемый формат:
// mt-map, version 1.

const MAX_FILE_BYTES = 1024 * 1024;
const MAX_TEXT_LENGTH = MAX_FILE_BYTES;

const clone = value => JSON.parse(JSON.stringify(value));

function isRecord(value) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

/**
 * После валидации переносим только известные поля.
 * Произвольные дополнительные свойства не сохраняются.
 */
function cleanMap(source) {
  return {
    format: 'mt-map',
    version: 1,
    id: source.id,
    name: source.name.trim(),
    status: source.status,
    revision: source.revision,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,

    board: {
      width: source.board.width,
      height: source.board.height
    },

    layers: {
      terrain: source.layers.terrain.map(tile => ({
        id: tile.id,
        type: tile.type,
        x: tile.x,
        y: tile.y,
        height: tile.height,
        cells: tile.cells.map(cell => ({
          x: cell.x,
          y: cell.y
        }))
      })),

            deployment: source.layers.deployment.map(cell => ({
        x: cell.x,
        y: cell.y,
        side: cell.side
      })),
        objectives: source.layers.objectives.map(point => ({
        id: point.id,
        title: point.title,
        x: point.x,
        y: point.y
      })),
            markers: source.layers.markers.map(marker => ({
        id: marker.id,
        title: marker.title,
        note: marker.note,
        x: marker.x,
        y: marker.y
      })),
      decorations: []
    }
  };
}

function fileName(name) {
  const slug = name
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'map';

  return `mt-map-${slug}.json`;
}

export function initMapTransfer({
  getMapForExport,
  validateMap,
  importAsNew,
  message
}) {
  const form = document.getElementById('ws-map-form');

  const section = document.createElement('section');

  section.className = 'ws-transfer';
  section.setAttribute('aria-label', 'Резервные копии карт');

  // Только статическая разметка.
  section.innerHTML = `
    <h3>Резервная копия карты</h3>

    <div class="ws-actions">
      <button type="button"
              class="builder-action-btn"
              data-map-export>
        Экспорт карты JSON
      </button>

      <button type="button"
              class="builder-action-btn"
              data-map-import>
        Импорт карты JSON
      </button>
    </div>

    <input type="file"
           accept=".json,application/json"
           data-map-file
           aria-label="Файл карты JSON"
           hidden>

    <p class="ws-muted">
      Экспорт включает текущие изменения редактора,
      даже если они ещё не сохранены в библиотеку.
      Импорт создаёт новую карту с новым идентификатором.
      Существующие документы не перезаписываются.
      Максимальный размер файла — 1 МиБ.
    </p>
  `;

  form.after(section);

  const exportButton = section.querySelector('[data-map-export]');
  const importButton = section.querySelector('[data-map-import]');
  const fileInput = section.querySelector('[data-map-file]');

  let importing = false;

  exportButton.addEventListener('click', () => {
    let url = null;
    let link = null;

    try {
      const current = getMapForExport();

      if (!validateMap(current)) {
        throw new Error(
          'Документ карты имеет неподдерживаемый формат.'
        );
      }

      const document = cleanMap(current);
      const text = JSON.stringify(document, null, 2);

      const blob = new Blob([text], {
        type: 'application/json;charset=utf-8'
      });

      if (blob.size > MAX_FILE_BYTES) {
        throw new Error(
          'Карта превышает максимальный размер экспорта: 1 МиБ.'
        );
      }

      url = URL.createObjectURL(blob);

      link = window.document.createElement('a');
      link.href = url;
      link.download = fileName(document.name);

      window.document.body.append(link);
      link.click();

      message(
        `Запрошено скачивание карты «${document.name}». ` +
        'Проверьте загрузки браузера. ' +
        'Сохранённая библиотека не изменена.'
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

  importButton.addEventListener('click', () => {
    if (importing) return;

    // Позволяет повторно выбрать тот же файл.
    fileInput.value = '';
    fileInput.click();
  });

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];

    if (!file || importing) return;

    importing = true;
    importButton.disabled = true;

    try {
      if (file.size === 0) {
        throw new Error('Выбран пустой файл.');
      }

      if (file.size > MAX_FILE_BYTES) {
        throw new Error(
          'Файл слишком большой. Максимум — 1 МиБ.'
        );
      }

      const text = await file.text();

      if (text.length > MAX_TEXT_LENGTH) {
        throw new Error('Содержимое файла слишком большое.');
      }

      // Поддерживаем необязательный UTF-8 BOM.
      const source = JSON.parse(text.replace(/^\uFEFF/, ''));

      if (
        !isRecord(source) ||
        source.format !== 'mt-map' ||
        source.version !== 1
      ) {
        throw new Error(
          'Ожидается документ mt-map версии 1. ' +
          'Ростеры, партии и целые библиотеки сюда не импортируются.'
        );
      }

      if (!validateMap(source)) {
        throw new Error(
          'Карта не прошла проверку. Проверьте название, даты, ' +
          'слои, типы местности, высоты, координаты и пересечения. ' +
          'Проверьте также КТ, названия и заметки маркеров. ' +
          'Заполненный слой декораций ' +
          'эта версия пока не поддерживает.'
        );
      }

      const prepared = cleanMap(source);

      const now = new Date().toISOString();

      // Импорт — самостоятельная локальная копия.
      prepared.id = crypto.randomUUID();
      prepared.revision = 1;
      prepared.createdAt = now;
      prepared.updatedAt = now;

      // Пересоздаём идентификаторы тайлов новой карты.
      prepared.layers.terrain.forEach(tile => {
        tile.id = crypto.randomUUID();
      });

      prepared.layers.objectives.forEach(point => {
        point.id = crypto.randomUUID();
      });

      prepared.layers.markers.forEach(marker => {
        marker.id = crypto.randomUUID();
      });

      if (!validateMap(prepared)) {
        throw new Error(
          'Не удалось подготовить независимую копию карты.'
        );
      }

      const imported = importAsNew(clone(prepared));

      if (imported) {
        message(
          `Карта «${prepared.name}» импортирована как новый документ ` +
          'и сохранена в локальную библиотеку. ' +
          'Статус карты сохранён из исходного файла.'
        );
      }
    } catch (error) {
      console.error('Map import error:', error);

      message(
        `Импорт не выполнен: ${error.message}`,
        true
      );
    } finally {
      importing = false;
      importButton.disabled = false;
      fileInput.value = '';
    }
  });
}