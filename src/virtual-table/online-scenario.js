// src/virtual-table/online-scenario.js
//
// Общая текстовая памятка сценария комнаты.
//
// Читает локальную библиотеку только для выбора исходника.
// Не изменяет библиотеку, локальную партию и историю.
// Не копирует карту и не изменяет сетевые КТ или счёт.
//
// Запись — только хостом, транзакционно,
// с проверкой ожидаемой версии документа.

import { auth, db } from '../core/firebase.js';

import {
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const KEY = 'mt_workshop_scenarios_v1';
const MAX_RAW_LENGTH = 8 * 1024 * 1024;
const MAX_REVISION = Number.MAX_SAFE_INTEGER;

const LABELS = {
  preparation: 'Подготовка партии',
  deployment: 'Условия расстановки',
  duration: 'Продолжительность и завершение',
  scoring: 'Цели и начисление очков',
  specialRules: 'Особые правила'
};

function node(tag, text = '', className = '') {
  const element = document.createElement(tag);
  element.textContent = text;
  element.className = className;
  return element;
}

function exactKeys(value, keys) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length === keys.length &&
    keys.every(key => Object.hasOwn(value, key))
  );
}

function text(value, maximum, required = false) {
  return typeof value === 'string' &&
    value.length <= maximum &&
    (!required || value.trim().length > 0);
}

function validSections(sections) {
  return exactKeys(sections, Object.keys(LABELS)) &&
    Object.keys(LABELS).every(key =>
      text(sections[key], 12000)
    );
}

function validMemo(memo) {
  return Boolean(
    exactKeys(memo, [
      'sourceId',
      'sourceRevision',
      'name',
      'status',
      'sections'
    ]) &&
    text(memo.sourceId, 120, true) &&
    Number.isSafeInteger(memo.sourceRevision) &&
    memo.sourceRevision >= 1 &&
    text(memo.name, 120, true) &&
    ['draft', 'test-ready'].includes(memo.status) &&
    validSections(memo.sections)
  );
}

function initialState() {
  return {
    version: 1,
    revision: 0,
    memo: null
  };
}

function validState(data) {
  return Boolean(
    exactKeys(data, [
      'version',
      'revision',
      'memo',
      'updatedAt'
    ]) &&
    data.version === 1 &&
    Number.isSafeInteger(data.revision) &&
    data.revision >= 1 &&
    (data.memo === null || validMemo(data.memo)) &&
    typeof data.updatedAt?.toMillis === 'function'
  );
}

// Проверяем текстовую проекцию сценария.
// Содержимое map намеренно не используется и здесь
// не объявляется пригодным для загрузки на поле.
function projectScenario(source) {
  if (
    !exactKeys(source, [
      'format',
      'version',
      'contentType',
      'id',
      'revision',
      'createdAt',
      'updatedAt',
      'name',
      'status',
      'map',
      'sections'
    ]) ||
    source.format !== 'mt-scenario' ||
    source.version !== 1 ||
    source.contentType !== 'custom' ||
    !text(source.createdAt, 100, true) ||
    !Number.isFinite(Date.parse(source.createdAt)) ||
    !text(source.updatedAt, 100, true) ||
    !Number.isFinite(Date.parse(source.updatedAt))
  ) {
    throw new Error(
      'Неподдерживаемый исходник текстовой памятки.'
    );
  }

  const memo = {
    sourceId: source.id,
    sourceRevision: source.revision,
    name: source.name,
    status: source.status,
    sections: Object.fromEntries(
      Object.keys(LABELS).map(key => [
        key,
        source.sections?.[key]
      ])
    )
  };

  if (
    !validSections(source.sections) ||
    !validMemo(memo)
  ) {
    throw new Error(
      'Название, редакция или разделы сценария повреждены.'
    );
  }

  return memo;
}

function readMemoLibrary() {
  const raw = localStorage.getItem(KEY);

  if (raw === null) return [];

  if (raw.length > MAX_RAW_LENGTH) {
    throw new Error('Библиотека сценариев слишком большая.');
  }

  const library = JSON.parse(raw);

  if (
    !exactKeys(library, ['format', 'version', 'scenarios']) ||
    library.format !== 'mt-scenario-library' ||
    library.version !== 1 ||
    !Array.isArray(library.scenarios) ||
    library.scenarios.length > 100
  ) {
    throw new Error(
      'Неподдерживаемый формат библиотеки сценариев.'
    );
  }

  const ids = new Set();

  return library.scenarios.map(source => {
    const memo = projectScenario(source);

    if (ids.has(memo.sourceId)) {
      throw new Error(
        'В библиотеке повторяются идентификаторы сценариев.'
      );
    }

    ids.add(memo.sourceId);
    return memo;
  });
}

export function connectOnlineScenario({
  roomId,
  userId,
  getRoom,
  container
}) {
  const reference = doc(
    db, 'rooms', roomId, 'tableScenario', 'state'
  );

  let destroyed = false;
  let ready = false;
  let busy = false;
  let state = initialState();

  let library = [];
  let libraryFailed = false;
  let renderedMemo = undefined;

  const panel = node('section', '', 'vt-detail-block');
  panel.setAttribute('aria-label', 'Памятка сценария комнаты');

  const heading = node('h3', 'Сценарий комнаты');

  const explanation = node(
    'p',
    'Общая текстовая памятка. Карта, КТ, счёт и модели ' +
    'не загружаются и не изменяются. ' +
    'Правила применяются игроками вручную.',
    'vt-muted'
  );

  const status = node('p', 'Загружаем памятку…', 'vt-muted');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  const controls = node('div');

  const selectLabel = node(
    'label',
    'Сценарий из мастерской на этом устройстве'
  );
  selectLabel.style.display = 'grid';
  selectLabel.style.gap = '6px';

  const select = node('select');
  selectLabel.append(select);

  const actions = node('div', '', 'vt-detail-actions');
  actions.style.marginTop = '8px';

  const attach = node(
    'button',
    'Прикрепить памятку',
    'builder-action-btn'
  );

  const reload = node(
    'button',
    'Обновить список',
    'builder-action-btn'
  );

  const detach = node(
    'button',
    'Снять памятку',
    'builder-action-btn'
  );

  for (const button of [attach, reload, detach]) {
    button.type = 'button';
  }

  const libraryStatus = node('p', '', 'vt-muted');
  libraryStatus.setAttribute('role', 'status');

  actions.append(attach, reload, detach);
  controls.append(selectLabel, actions, libraryStatus);

  const memoHost = node('div');

  panel.append(
    heading,
    explanation,
    controls,
    status,
    memoHost
  );

  container.append(panel);

  function message(value, error = false) {
    if (destroyed) return;
    status.textContent = value;
    status.style.color = error ? '#ffadb7' : '';
  }

  function host(room = getRoom()) {
    return Boolean(
      room &&
      room.hostId === userId &&
      room.guestId !== userId
    );
  }

  function active() {
    return !destroyed &&
      auth.currentUser?.uid === userId &&
      auth.currentUser?.emailVerified === true;
  }

  function writable() {
    return active() && ready && !busy && host();
  }

  function loadLibrary() {
    if (destroyed) return;

    const previous = select.value;
    select.replaceChildren();

    try {
      library = readMemoLibrary();
      libraryFailed = false;

      if (!library.length) {
        select.append(
          new Option('На этом устройстве нет сценариев', '')
        );
      } else {
        for (const memo of library) {
          select.append(
            new Option(
              `${memo.name} · редакция ${memo.sourceRevision}` +
              (memo.status === 'draft' ? ' · Черновик' : ''),
              memo.sourceId
            )
          );
        }

        if (library.some(memo => memo.sourceId === previous)) {
          select.value = previous;
        }
      }

      libraryStatus.textContent =
        'Список берётся из мастерской этого браузера. ' +
        'В комнату копируется только текстовая памятка.';
    } catch (error) {
      library = [];
      libraryFailed = true;

      select.append(
        new Option('Не удалось прочитать библиотеку', '')
      );

      libraryStatus.textContent =
        'Библиотека недоступна: ' +
        String(error.message || error) +
        ' Исходные данные не изменены.';
    }

    refresh();
  }

  function renderMemo() {
    const raw = JSON.stringify(state.memo);

    if (raw === renderedMemo) return;
    renderedMemo = raw;

    memoHost.replaceChildren();

    const memo = state.memo;

    if (!memo) {
      memoHost.append(
        node('p', 'Памятка к комнате не прикреплена.', 'vt-muted')
      );
      return;
    }

    memoHost.append(
      node('h4', memo.name),
      node(
        'p',
        'Авторский сценарий · ' +
        (memo.status === 'test-ready'
          ? 'Готово к тесту'
          : 'Черновик') +
        ` · редакция исходника ${memo.sourceRevision}`,
        'vt-muted'
      )
    );

    for (const [key, label] of Object.entries(LABELS)) {
      const fold = node('details', '', 'vt-detail-block');
      const summary = node('summary', label);
      const body = node(
        'p',
        memo.sections[key].trim()
          ? memo.sections[key]
          : 'Не указано.'
      );

      body.style.whiteSpace = 'pre-wrap';
      body.style.overflowWrap = 'anywhere';

      fold.append(summary, body);
      memoHost.append(fold);
    }

    memoHost.append(
      node(
        'p',
        'Это независимый текстовый снимок. Изменение исходника ' +
        'в мастерской не обновляет комнату автоматически. ' +
        'Карта сценария не копировалась; текущее поле и КТ ' +
        'могут не соответствовать описанию.',
        'vt-muted'
      )
    );
  }

  function refresh() {
    if (destroyed) return;

    controls.hidden = !host();

    select.disabled =
      !writable() || libraryFailed || !library.length;

    attach.disabled =
      !writable() || libraryFailed || !library.length;

    reload.disabled = busy || !active();
    detach.disabled = !writable() || state.memo === null;

    attach.textContent = state.memo
      ? 'Заменить памятку'
      : 'Прикрепить памятку';

    // Последний подтверждённый текст остаётся видимым,
    // но явно помечается как неподтверждённый.
    memoHost.style.opacity = ready ? '1' : '0.65';

    renderMemo();
  }

  async function saveMemo(memo) {
    if (!writable()) {
      message(
        'Изменение недоступно. Дождитесь серверных данных; ' +
        'памяткой управляет только хост.',
        true
      );
      return;
    }

    const expectedRevision = state.revision;

    busy = true;
    refresh();

    try {
      await runTransaction(db, async transaction => {
        if (!active()) {
          throw new Error('Аккаунт или подключение изменились.');
        }

        const roomSnapshot = await transaction.get(
          doc(db, 'rooms', roomId)
        );

        const memoSnapshot = await transaction.get(reference);

        if (
          !roomSnapshot.exists() ||
          !host(roomSnapshot.data())
        ) {
          throw new Error('Нет доступа к изменению памятки.');
        }

        const actual = memoSnapshot.exists()
          ? memoSnapshot.data()
          : initialState();

        if (memoSnapshot.exists() && !validState(actual)) {
          throw new Error(
            'Неподдерживаемая памятка. Исходные данные не изменены.'
          );
        }

        if (actual.revision !== expectedRevision) {
          throw new Error(
            'Памятка уже изменилась. Проверьте актуальный текст ' +
            'и повторите действие.'
          );
        }

        if (actual.revision >= MAX_REVISION) {
          throw new Error('Достигнут предел версии памятки.');
        }

        if (!active()) {
          throw new Error('Аккаунт или подключение изменились.');
        }

        transaction.set(reference, {
          version: 1,
          revision: actual.revision + 1,
          memo,
          updatedAt: serverTimestamp()
        });
      });

      message(
        memo
          ? 'Памятка сохранена. Поле, КТ и счёт не изменены.'
          : 'Памятка снята. Остальные данные комнаты сохранены.'
      );
    } catch (error) {
      message(
        'Изменение не подтверждено: ' +
        String(error.message || error.code || error),
        true
      );
    } finally {
      busy = false;
      if (!destroyed) refresh();
    }
  }

  reload.addEventListener('click', loadLibrary);

  attach.addEventListener('click', () => {
    if (!writable()) return;

    try {
      // Повторно читаем исходник перед подтверждением:
      // список мог устареть после работы в мастерской.
      const actualLibrary = readMemoLibrary();
      const selected = actualLibrary.find(
        memo => memo.sourceId === select.value
      );

      if (!selected) {
        throw new Error(
          'Сценарий больше не найден. Обновите список.'
        );
      }

      const memo = JSON.parse(JSON.stringify(selected));

      const confirmed = window.confirm(
        `${state.memo ? 'Заменить' : 'Прикрепить'} памятку ` +
        `«${memo.name}», редакция ${memo.sourceRevision}?\n\n` +
        'Оба участника увидят одинаковый текст. ' +
        'Карта сценария не копируется. ' +
        'Поле, КТ, счёт, армии и раунд не изменятся.' +
        (memo.status === 'draft'
          ? '\n\nВнимание: выбран черновик.'
          : '')
      );

      if (confirmed) void saveMemo(memo);
    } catch (error) {
      message(
        'Не удалось подготовить памятку: ' +
        String(error.message || error),
        true
      );
    }
  });

  detach.addEventListener('click', () => {
    if (!writable() || state.memo === null) return;

    if (!window.confirm(
      'Снять общую памятку сценария?\n\n' +
      'Поле, КТ, счёт, армии и раунд сохранятся. ' +
      'Отмены этого действия пока нет.'
    )) {
      return;
    }

    void saveMemo(null);
  });

  const unsubscribe = onSnapshot(
    reference,
    { includeMetadataChanges: true },

    snapshot => {
      if (destroyed) return;

      if (
        snapshot.metadata.fromCache ||
        snapshot.metadata.hasPendingWrites
      ) {
        ready = false;

        message(
          'Памятка не подтверждена сервером. ' +
          'Если текст уже показан, это последняя подтверждённая версия. ' +
          'Редактирование временно недоступно.'
        );

        refresh();
        return;
      }

      const actual = snapshot.exists()
        ? snapshot.data()
        : initialState();

      if (snapshot.exists() && !validState(actual)) {
        ready = false;

        message(
          'Неподдерживаемая памятка. Запись заблокирована; ' +
          'данные на сервере не изменены.',
          true
        );

        refresh();
        return;
      }

      state = actual;
      ready = true;

      message(
        state.memo
          ? 'Памятка получена с сервера.'
          : 'Сервер подтвердил: памятка не прикреплена.'
      );

      refresh();
    },

    error => {
      if (destroyed) return;

      ready = false;

      message(
        'Памятка недоступна: ' +
        String(error.code || error.message),
        true
      );

      refresh();
    }
  );

  // Гость не обязан иметь сценарии в своей мастерской.
  if (host()) loadLibrary();
  refresh();

  return {
    refresh,

    destroy() {
      if (destroyed) return;
      destroyed = true;

      unsubscribe();
      panel.remove();
    }
  };
}