// src/workshop/custom-units.js
//
// Независимый редактор авторских моделей.
// Не использует официальный roster, DATABASE или сохранения карт.
// Пользовательский HTML не хранится и не исполняется.
//
// JSON-перенос:
// — экспорт одной модели из текущей формы;
// — импорт отдельной копией с новым ID;
// — исходная библиотека меняется только после успешной проверки
//   и записи;
// — неизвестные поля и неподдерживаемые версии отклоняются.

const KEY = 'mt_workshop_custom_units_v1';
const MAX_UNITS = 200;
const MAX_RAW_LENGTH = 4 * 1024 * 1024;

const MAX_FILE_BYTES = 256 * 1024;
const MAX_TEXT_LENGTH = MAX_FILE_BYTES;

const ROLES = {
  basic: 'Базовый',
  elite: 'Элита',
  hero: 'Герой'
};

const DICE = {
  basic: 3,
  elite: 4,
  hero: 5
};

const WEAPON_TYPES = {
  melee: 'Ближний бой',
  ranged: 'Дальний бой'
};

const MODES = {
  single: 'Одно оружие',
  choice: 'Выберите один вариант',
  loadout: 'Комплект вооружения'
};

const clone = value => JSON.parse(JSON.stringify(value));

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

function integer(value, min = 0) {
  // Технический предел интерфейса, не проверка баланса.
  return Number.isSafeInteger(value) &&
    value >= min &&
    value <= 99999;
}

function date(value) {
  return typeof value === 'string' &&
    Number.isFinite(Date.parse(value));
}

export function validCustomUnit(unit) {
  return Boolean(
    exactKeys(unit, [
      'format', 'version', 'contentType',
      'id', 'revision', 'createdAt', 'updatedAt',
      'name', 'role', 'traits', 'cost', 'costSource',
      'stats', 'weaponMode', 'weapons', 'abilities'
    ]) &&
    unit.format === 'mt-custom-unit' &&
    unit.version === 1 &&
    unit.contentType === 'custom' &&
    text(unit.id, 120, true) &&
    Number.isSafeInteger(unit.revision) &&
    unit.revision >= 1 &&
    date(unit.createdAt) &&
    date(unit.updatedAt) &&
    text(unit.name, 120, true) &&
    Object.hasOwn(ROLES, unit.role) &&
    text(unit.traits, 200) &&
    integer(unit.cost) &&
    unit.costSource === 'author' &&
    exactKeys(unit.stats, ['hp', 'move', 'armor']) &&
    integer(unit.stats.hp, 1) &&
    integer(unit.stats.move) &&
    integer(unit.stats.armor) &&
    Object.hasOwn(MODES, unit.weaponMode) &&
    Array.isArray(unit.weapons) &&
    (
      unit.weaponMode === 'single'
        ? unit.weapons.length === 1
        : unit.weapons.length === 2
    ) &&
    unit.weapons.every(weapon =>
      exactKeys(weapon, [
        'name', 'type', 'range', 'threshold', 'damage', 'tags'
      ]) &&
      text(weapon.name, 120, true) &&
      Object.hasOwn(WEAPON_TYPES, weapon.type) &&
      (weapon.range === null || integer(weapon.range, 1)) &&
      text(weapon.threshold, 30, true) &&
      integer(weapon.damage) &&
      text(weapon.tags, 500)
    ) &&
    Array.isArray(unit.abilities) &&
    unit.abilities.length <= 2 &&
    unit.abilities.every(ability =>
      exactKeys(ability, ['title', 'text']) &&
      text(ability.title, 120, true) &&
      text(ability.text, 4000, true)
    )
  );
}

function validLibrary(value) {
  if (
    !exactKeys(value, ['format', 'version', 'units']) ||
    value.format !== 'mt-custom-unit-library' ||
    value.version !== 1 ||
    !Array.isArray(value.units) ||
    value.units.length > MAX_UNITS
  ) {
    return false;
  }

  const ids = new Set();

  return value.units.every(unit => {
    if (!validCustomUnit(unit) || ids.has(unit.id)) {
      return false;
    }

    ids.add(unit.id);
    return true;
  });
}

function fileName(name) {
  const slug = name
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'unit';

  return `mt-custom-unit-${slug}.json`;
}

export function initCustomUnits() {
  const host = document.getElementById('ws-units');

  if (!host) {
    throw new Error('Не найден раздел авторских юнитов.');
  }

  if (host.dataset.customUnitsInitialized) return;
  host.dataset.customUnitsInitialized = 'true';

  let library = {
    format: 'mt-custom-unit-library',
    version: 1,
    units: []
  };

  let expectedRaw = null;
  let locked = false;
  let current = null;
  let dirty = false;
  let importing = false;

  // Позволяет обнаружить изменение формы, пока файл читается.
  let editorGeneration = 0;

  function weaponFields(index) {
    return `
      <fieldset data-custom-weapon="${index}">
        <legend>Оружие ${index + 1}</legend>

        <div class="ws-form-grid">
          <label>
            Название
            <input data-w-name maxlength="120">
          </label>

          <label>
            Тип
            <select data-w-type>
              <option value="melee">Ближний бой</option>
              <option value="ranged">Дальний бой</option>
            </select>
          </label>

          <label>
            Дальность, если задана
            <input data-w-range
                   type="number" min="1" max="99999" step="1">
          </label>

          <label>
            Порог — текст, например 3+
            <input data-w-threshold maxlength="30">
          </label>

          <label>
            Урон
            <input data-w-damage
                   type="number" min="0" max="99999" step="1">
          </label>

          <label>
            Теги
            <input data-w-tags maxlength="500">
          </label>
        </div>
      </fieldset>
    `;
  }

  function abilityFields(index) {
    return `
      <fieldset data-custom-ability="${index}">
        <legend>Способность ${index + 1}, необязательно</legend>

        <label>
          Название
          <input data-a-title maxlength="120">
        </label>

        <label>
          Описание
          <textarea data-a-text rows="4" maxlength="4000"></textarea>
        </label>
      </fieldset>
    `;
  }

  // Только статическая разметка приложения.
  host.innerHTML = `
    <h2>Авторские юниты</h2>

    <p class="ws-notice">
      Авторский контент. Стоимость задаёт автор;
      баланс и соответствие правилам автоматически не проверяются.
      Документы хранятся локально, отдельно от карт
      и официальных ростеров.
      Для резервного копирования экспортируйте каждую модель в JSON.
    </p>

    <p data-custom-warning
       class="ws-notice ws-error"
       role="alert"
       hidden></p>

    <div class="ws-actions">
      <button type="button"
              class="builder-action-btn"
              data-custom-new>
        Новая модель
      </button>

      <button type="button"
              class="builder-action-btn"
              data-custom-reload>
        Перезагрузить страницу
      </button>
    </div>

    <form data-custom-form>
      <div class="ws-form-grid">
        <label>
          Название
          <input data-u-name maxlength="120" required>
        </label>

        <label>
          Класс
          <select data-u-role>
            <option value="basic">Базовый — 3 кубика</option>
            <option value="elite">Элита — 4 кубика</option>
            <option value="hero">Герой — 5 кубиков</option>
          </select>
        </label>

        <label>
          Дополнительные признаки, например Жрец или Маг
          <input data-u-traits maxlength="200">
        </label>

        <label>
          Стоимость, заданная автором
          <input data-u-cost
                 type="number" min="0" max="99999" step="1"
                 required>
        </label>

        <label>
          ХП
          <input data-u-hp
                 type="number" min="1" max="99999" step="1"
                 required>
        </label>

        <label>
          Движение
          <input data-u-move
                 type="number" min="0" max="99999" step="1"
                 required>
        </label>

        <label>
          Броня
          <input data-u-armor
                 type="number" min="0" max="99999" step="1"
                 required>
        </label>

        <label>
          Вооружение
          <select data-u-mode>
            <option value="single">Одно оружие</option>
            <option value="choice">Два альтернативных варианта</option>
            <option value="loadout">Комплект из двух оружий</option>
          </select>
        </label>
      </div>

      <p class="ws-muted">
        Дальность хранится отдельно от типа боя.
        Пустое поле означает «не указана», а не нулевую дальность.
        Порог и теги — текстовые данные без автоматического судейства.
      </p>

      ${weaponFields(0)}
      ${weaponFields(1)}
      ${abilityFields(0)}
      ${abilityFields(1)}

      <div class="ws-actions">
        <button type="button"
                class="builder-action-btn"
                data-custom-preview>
          Обновить предпросмотр
        </button>

        <button type="submit"
                class="builder-action-btn primary"
                data-custom-save>
          Сохранить модель
        </button>

        <span class="ws-muted" data-custom-dirty></span>
      </div>
    </form>

    <section class="ws-transfer"
             aria-label="Резервные копии авторских моделей">
      <h3>Перенос модели JSON</h3>

      <div class="ws-actions">
        <button type="button"
                class="builder-action-btn"
                data-custom-export>
          Экспорт модели JSON
        </button>

        <button type="button"
                class="builder-action-btn"
                data-custom-import>
          Импорт модели JSON
        </button>
      </div>

      <input type="file"
             accept=".json,application/json"
             aria-label="Файл авторской модели JSON"
             data-custom-file
             hidden>

      <p class="ws-muted">
        Экспорт включает текущий заполненный ввод формы,
        даже если он ещё не сохранён в библиотеку.
        Экспорт не сохраняет изменения в браузере.
        Импорт создаёт и сохраняет новую независимую модель
        с новым идентификатором.
        Существующие модели не перезаписываются.
        Максимальный размер файла — 256 КиБ.
      </p>
    </section>

    <p data-custom-message
       class="ws-message"
       role="status"
       aria-live="polite"></p>

    <section class="ws-custom-preview"
             aria-label="Предпросмотр авторской модели"
             data-custom-card></section>

    <h3>Локальная библиотека авторских моделей</h3>
    <div class="ws-library-list" data-custom-list></div>
  `;

  const find = selector => host.querySelector(selector);
  const form = find('[data-custom-form]');
  const status = find('[data-custom-message]');
  const warning = find('[data-custom-warning]');
  const list = find('[data-custom-list]');
  const card = find('[data-custom-card]');
  const saveButton = find('[data-custom-save]');
  const importButton = find('[data-custom-import]');
  const fileInput = find('[data-custom-file]');

  function message(value, error = false) {
    status.textContent = value;
    status.classList.toggle('is-error', error);
  }

  function setDirty(value) {
    dirty = value;

    find('[data-custom-dirty]').textContent = dirty
      ? 'Есть несохранённые изменения'
      : '';
  }

  function syncTransferState() {
    importButton.disabled = locked || importing;
    saveButton.disabled = locked;
  }

  function lock(value) {
    locked = true;
    warning.hidden = false;
    warning.textContent = value;

    syncTransferState();
    renderList();
  }

  function syncWeaponMode() {
    const second = find('[data-custom-weapon="1"]');
    const single = find('[data-u-mode]').value === 'single';

    second.hidden = single;
    second.disabled = single;
  }

  function readNumber(input, label, min = 0) {
    const raw = input.value.trim();
    const value = Number(raw);

    if (
      input.validity.badInput ||
      raw === '' ||
      !integer(value, min)
    ) {
      throw new Error(
        `${label}: укажите целое число от ${min} до 99999.`
      );
    }

    return value;
  }

  function readDocument() {
    const now = new Date().toISOString();
    const mode = find('[data-u-mode]').value;
    const count = mode === 'single' ? 1 : 2;

    const weapons = Array.from({ length: count }, (_, index) => {
      const field = find(`[data-custom-weapon="${index}"]`);
      const get = selector => field.querySelector(selector);
      const rangeInput = get('[data-w-range]');

      if (rangeInput.validity.badInput) {
        throw new Error(
          'Дальность: укажите целое число от 1 до 99999 ' +
          'или оставьте поле пустым.'
        );
      }

      return {
        name: get('[data-w-name]').value.trim(),
        type: get('[data-w-type]').value,
        range: rangeInput.value.trim() === ''
          ? null
          : readNumber(rangeInput, 'Дальность', 1),
        threshold: get('[data-w-threshold]').value.trim(),
        damage: readNumber(get('[data-w-damage]'), 'Урон'),
        tags: get('[data-w-tags]').value.trim()
      };
    });

    const abilities = [];

    host.querySelectorAll('[data-custom-ability]').forEach(field => {
      const title = field.querySelector('[data-a-title]').value.trim();
      const description = field.querySelector('[data-a-text]')
        .value.trim();

      if (!title && !description) return;

      if (!title || !description) {
        throw new Error(
          'Для способности заполните название и описание ' +
          'или оставьте оба поля пустыми.'
        );
      }

      abilities.push({ title, text: description });
    });

    const unit = {
      format: 'mt-custom-unit',
      version: 1,
      contentType: 'custom',
      id: current?.id || crypto.randomUUID(),
      revision: current?.revision || 1,
      createdAt: current?.createdAt || now,
      updatedAt: now,
      name: find('[data-u-name]').value.trim(),
      role: find('[data-u-role]').value,
      traits: find('[data-u-traits]').value.trim(),
      cost: readNumber(find('[data-u-cost]'), 'Стоимость'),
      costSource: 'author',
      stats: {
        hp: readNumber(find('[data-u-hp]'), 'ХП', 1),
        move: readNumber(find('[data-u-move]'), 'Движение'),
        armor: readNumber(find('[data-u-armor]'), 'Броня')
      },
      weaponMode: mode,
      weapons,
      abilities
    };

    if (!validCustomUnit(unit)) {
      throw new Error(
        'Проверьте название модели, названия оружия, ' +
        'пороги и длину текстовых полей.'
      );
    }

    return unit;
  }

  function renderPreview(unit) {
    card.replaceChildren();

    function line(tag, value) {
      const element = document.createElement(tag);
      element.textContent = value;
      card.append(element);
    }

    line('p', 'Авторский контент · стоимость задана автором');
    line('h3', unit.name);

    line(
      'p',
      `${ROLES[unit.role]} · ${DICE[unit.role]} куб. · ` +
      `${unit.cost} очков`
    );

    if (unit.traits) line('p', unit.traits);

    line(
      'p',
      `ХП: ${unit.stats.hp} · Движение: ${unit.stats.move} · ` +
      `Броня: ${unit.stats.armor}`
    );

    line('h4', MODES[unit.weaponMode]);

    unit.weapons.forEach(weapon => {
      line('h4', weapon.name);

      line(
        'p',
        WEAPON_TYPES[weapon.type] +
        (weapon.range === null
          ? ' · Дальность не указана'
          : ` · Дальность: ${weapon.range}`)
      );

      line(
        'p',
        `Порог: ${weapon.threshold} · Урон: ${weapon.damage}`
      );

      line('p', `Теги: ${weapon.tags || 'нет'}`);
    });

    unit.abilities.forEach(ability => {
      line('h4', ability.title);
      line('p', ability.text);
    });

    line(
      'p',
      'Игровые эффекты применяются вручную. ' +
      'Стоимость и баланс не подтверждены.'
    );
  }

  function fill(unit) {
    editorGeneration += 1;

    form.reset();
    current = unit ? clone(unit) : null;

    const values = {
      name: unit?.name || '',
      role: unit?.role || 'basic',
      traits: unit?.traits || '',
      cost: unit?.cost ?? '',
      hp: unit?.stats.hp ?? '',
      move: unit?.stats.move ?? '',
      armor: unit?.stats.armor ?? '',
      mode: unit?.weaponMode || 'single'
    };

    Object.entries(values).forEach(([key, value]) => {
      find(`[data-u-${key}]`).value = String(value);
    });

    host.querySelectorAll('[data-custom-weapon]').forEach(
      (field, index) => {
        const weapon = unit?.weapons[index];

        const weaponValues = {
          name: weapon?.name || '',
          type: weapon?.type || 'melee',
          range: weapon?.range ?? '',
          threshold: weapon?.threshold || '',
          damage: weapon?.damage ?? '',
          tags: weapon?.tags || ''
        };

        Object.entries(weaponValues).forEach(([key, value]) => {
          field.querySelector(`[data-w-${key}]`).value =
            String(value);
        });
      }
    );

    host.querySelectorAll('[data-custom-ability]').forEach(
      (field, index) => {
        const ability = unit?.abilities[index];

        field.querySelector('[data-a-title]').value =
          ability?.title || '';

        field.querySelector('[data-a-text]').value =
          ability?.text || '';
      }
    );

    syncWeaponMode();
    setDirty(false);
    card.replaceChildren();

    if (unit) renderPreview(unit);
  }

  function canDiscard() {
    return !dirty || confirm(
      'Отказаться от несохранённых изменений авторской модели? ' +
      'Сохранённая библиотека останется прежней.'
    );
  }

  function persist(next) {
    if (locked) {
      throw new Error(
        'Запись заблокирована. Перезагрузите актуальную библиотеку.'
      );
    }

    if (!validLibrary(next)) {
      throw new Error('Некорректный документ библиотеки.');
    }

    const raw = JSON.stringify(next);

    if (raw.length > MAX_RAW_LENGTH) {
      throw new Error('Превышен технический размер библиотеки.');
    }

    if (localStorage.getItem(KEY) !== expectedRaw) {
      lock(
        'Библиотека авторских моделей изменена в другой вкладке. ' +
        'Запись заблокирована. Несохранённый ввод остаётся в форме. ' +
        'Заполненную модель можно экспортировать в JSON.'
      );

      throw new Error('Обнаружено внешнее изменение.');
    }

    // localStorage не даёт атомарного compare-and-set.
    localStorage.setItem(KEY, raw);

    expectedRaw = raw;
    library = next;
  }

  function renderList() {
    list.replaceChildren();

    if (!library.units.length) {
      const empty = document.createElement('p');
      empty.className = 'ws-muted';
      empty.textContent = 'Сохранённых авторских моделей пока нет.';
      list.append(empty);
      return;
    }

    library.units.forEach(unit => {
      const item = document.createElement('article');
      item.className = 'ws-library-card';

      const title = document.createElement('h4');
      title.textContent = unit.name;

      const meta = document.createElement('p');
      meta.className = 'ws-muted';

      meta.textContent =
        `Авторский контент · ${ROLES[unit.role]} · ` +
        `${unit.cost} очков · редакция ${unit.revision}`;

      const actions = document.createElement('div');
      actions.className = 'ws-actions';

      for (const [action, label] of [
        ['open', 'Открыть'],
        ['delete', 'Удалить']
      ]) {
        const button = document.createElement('button');

        button.type = 'button';
        button.className = 'builder-action-btn' +
          (action === 'delete' ? ' ws-delete' : '');

        button.dataset.customAction = action;
        button.dataset.id = unit.id;
        button.textContent = label;
        button.disabled = locked && action === 'delete';

        actions.append(button);
      }

      item.append(title, meta, actions);
      list.append(item);
    });
  }

  function exportCurrentUnit() {
    let url = null;
    let link = null;

    try {
      const unit = readDocument();

      // Не изменяем current, dirty и сохранённую библиотеку.
      const output = JSON.stringify(unit, null, 2);

      const blob = new Blob([output], {
        type: 'application/json;charset=utf-8'
      });

      if (blob.size > MAX_FILE_BYTES) {
        throw new Error(
          'Размер экспорта превышает 256 КиБ.'
        );
      }

      url = URL.createObjectURL(blob);

      link = document.createElement('a');
      link.href = url;
      link.download = fileName(unit.name);

      document.body.append(link);
      link.click();

      message(
        `Запрошено скачивание модели «${unit.name}». ` +
        'Проверьте загрузки браузера. ' +
        'Библиотека не изменена; несохранённые изменения ' +
        'остаются несохранёнными в браузере.'
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
  }

  async function importUnitFile(file) {
    if (importing) return;

    if (locked) {
      message(
        'Импорт недоступен: запись библиотеки заблокирована. ' +
        'Сначала перезагрузите актуальные данные.',
        true
      );
      return;
    }

    importing = true;
    syncTransferState();

    const startedGeneration = editorGeneration;

    try {
      if (file.size === 0) {
        throw new Error('Выбран пустой файл.');
      }

      if (file.size > MAX_FILE_BYTES) {
        throw new Error(
          'Файл слишком большой. Максимальный размер — 256 КиБ.'
        );
      }

      if (library.units.length >= MAX_UNITS) {
        throw new Error('Достигнут предел: 200 авторских моделей.');
      }

      const raw = await file.text();

      if (raw.length > MAX_TEXT_LENGTH) {
        throw new Error('Содержимое файла слишком большое.');
      }

      // Поддерживаем необязательный UTF-8 BOM.
      const source = JSON.parse(raw.replace(/^\uFEFF/, ''));

      if (
        !record(source) ||
        source.format !== 'mt-custom-unit' ||
        source.version !== 1 ||
        source.contentType !== 'custom'
      ) {
        throw new Error(
          'Ожидается одна авторская модель ' +
          'mt-custom-unit версии 1. ' +
          'Карты, ростеры, партии и целые библиотеки ' +
          'сюда не импортируются.'
        );
      }

      if (!validCustomUnit(source)) {
        throw new Error(
          'Модель не прошла проверку. Проверьте поля, ' +
          'класс, характеристики, вооружение и способности. ' +
          'Неизвестные дополнительные поля не поддерживаются.'
        );
      }

      if (locked) {
        throw new Error(
          'За время чтения файла запись библиотеки ' +
          'была заблокирована. Исходные данные не изменены.'
        );
      }

      // Пользователь мог редактировать, открыть другую модель
      // или сохранить форму, пока выполнялся file.text().
      if (startedGeneration !== editorGeneration) {
        throw new Error(
          'Во время чтения файла редактор изменился. ' +
          'Импорт отменён, чтобы не заменить новый ввод. ' +
          'При необходимости выберите файл повторно.'
        );
      }

      if (library.units.length >= MAX_UNITS) {
        throw new Error('Достигнут предел: 200 авторских моделей.');
      }

      const prepared = clone(source);
      const now = new Date().toISOString();

      // Импорт — самостоятельная локальная копия.
      prepared.id = crypto.randomUUID();
      prepared.revision = 1;
      prepared.createdAt = now;
      prepared.updatedAt = now;

      if (library.units.some(unit => unit.id === prepared.id)) {
        throw new Error(
          'Совпадение идентификаторов. Повторите импорт.'
        );
      }

      if (!validCustomUnit(prepared)) {
        throw new Error(
          'Не удалось подготовить независимую копию модели.'
        );
      }

      if (!canDiscard()) {
        message(
          'Импорт отменён. Текущая форма и библиотека не изменены.'
        );
        return;
      }

      const next = clone(library);
      next.units.push(prepared);

      // Сначала успешная запись; только затем заменяем форму.
      persist(next);

      fill(prepared);
      renderList();

      message(
        `Авторская модель «${prepared.name}» импортирована ` +
        'как новая копия и сохранена локально. ' +
        'Стоимость и характеристики перенесены без изменений.'
      );
    } catch (error) {
      message(`Импорт не выполнен: ${error.message}`, true);
    } finally {
      importing = false;
      fileInput.value = '';
      syncTransferState();
    }
  }

  form.addEventListener('input', () => {
    editorGeneration += 1;
    setDirty(true);
  });

  form.addEventListener('change', () => {
    editorGeneration += 1;
    syncWeaponMode();
    setDirty(true);
  });

  find('[data-custom-new]').addEventListener('click', () => {
    if (!canDiscard()) return;

    fill(null);
    message('Новая авторская модель. Заполните поля и сохраните.');
  });

  find('[data-custom-reload]').addEventListener('click', () => {
    if (confirm(
      'Перезагрузить страницу?\n\n' +
      'Несохранённый ввод модели будет потерян. ' +
      'Если в редакторе карты есть изменения, сначала сохраните карту.'
    )) {
      window.location.reload();
    }
  });

  find('[data-custom-preview]').addEventListener('click', () => {
    try {
      renderPreview(readDocument());

      message(
        'Предпросмотр обновлён. ' +
        'Это не сохраняет модель в библиотеку.'
      );
    } catch (error) {
      message(error.message, true);
    }
  });

  find('[data-custom-export]').addEventListener(
    'click',
    exportCurrentUnit
  );

  importButton.addEventListener('click', () => {
    if (importing || locked) return;

    // Позволяет выбрать тот же файл повторно.
    fileInput.value = '';
    fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];

    if (!file || importing) return;

    void importUnitFile(file);
  });

  form.addEventListener('submit', event => {
    event.preventDefault();

    try {
      const unit = readDocument();
      const next = clone(library);
      const index = next.units.findIndex(
        item => item.id === unit.id
      );

      if (index < 0 && next.units.length >= MAX_UNITS) {
        throw new Error('Достигнут предел: 200 авторских моделей.');
      }

      unit.revision = index < 0
        ? 1
        : next.units[index].revision + 1;

      if (index < 0) {
        next.units.push(unit);
      } else {
        next.units[index] = unit;
      }

      persist(next);

      fill(unit);
      renderList();

      message(`Авторская модель «${unit.name}» сохранена локально.`);
    } catch (error) {
      message(`Не сохранено: ${error.message}`, true);
    }
  });

  list.addEventListener('click', event => {
    const button = event.target.closest('[data-custom-action]');

    if (!button || button.disabled) return;

    const unit = library.units.find(
      item => item.id === button.dataset.id
    );

    if (!unit) return;

    if (button.dataset.customAction === 'open') {
      if (!canDiscard()) return;

      fill(unit);
      message(`Открыта авторская модель «${unit.name}».`);
      return;
    }

    if (button.dataset.customAction !== 'delete') return;

    if (!confirm(
      `Удалить авторскую модель «${unit.name}»?\n\n` +
      'Отмена удаления пока не предусмотрена.' +
      (current?.id === unit.id
        ? '\nНесохранённые изменения этой модели также будут потеряны.'
        : '')
    )) {
      return;
    }

    try {
      const next = clone(library);

      next.units = next.units.filter(
        item => item.id !== unit.id
      );

      persist(next);

      if (current?.id === unit.id) fill(null);

      renderList();
      message('Авторская модель удалена.');
    } catch (error) {
      message(`Не удалено: ${error.message}`, true);
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
        'Библиотека авторских моделей изменена или удалена ' +
        'в другой вкладке. Перезагрузите актуальные данные. ' +
        'Несохранённый ввод пока остаётся в форме. ' +
        'Заполненную модель можно экспортировать в JSON.'
      );
    } catch (error) {
      lock(
        `Не удалось проверить библиотеку: ${error.message} ` +
        'Заполненную модель можно экспортировать в JSON.'
      );
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
      `Библиотека авторских моделей недоступна: ${error.message} ` +
      'Исходное сохранение не изменено. Запись заблокирована.'
    );
  }

  fill(null);
  renderList();
  syncTransferState();

  if (!locked) {
    message(
      'Редактор авторских моделей готов. ' +
      'Для резервного копирования используйте экспорт JSON.'
    );
  }
}