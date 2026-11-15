// src/virtual-table/online-notes.js
//
// Общие заметки моделей, до 2000 символов.
// Редактирование — только владельцем после фиксации составов.
//
// Черновики хранятся только в памяти текущего подключения.
// Обновления карточки и переключение моделей их не удаляют.
// Перезагрузка страницы удаляет несохранённые черновики.
//
// При одновременном изменении заметки в другой вкладке
// устаревший черновик автоматически не перезаписывает сервер.

import { auth, db } from '../core/firebase.js';

import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

import { onlineUnitId } from './online-positions.js';

const MAX_NOTE_LENGTH = 2000;

function node(tag, text = '', className = '') {
  const element = document.createElement(tag);
  element.textContent = String(text);
  element.className = className;
  return element;
}

function validRecord(id, data) {
  const keys = [
    'side',
    'unitIndex',
    'note',
    'updatedAt'
  ];

  return Boolean(
    data &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    Object.keys(data).length === keys.length &&
    keys.every(key => Object.hasOwn(data, key)) &&
    ['a', 'b'].includes(data.side) &&
    Number.isSafeInteger(data.unitIndex) &&
    data.unitIndex >= 0 &&
    id === `${data.side}_${data.unitIndex}` &&
    typeof data.note === 'string' &&
    data.note.length <= MAX_NOTE_LENGTH &&
    typeof data.updatedAt?.toMillis === 'function'
  );
}

// Различаем отсутствие документа и существующую пустую заметку.
// Время используется для обнаружения изменения в другой вкладке.
function recordVersion(data) {
  if (!data) return 'absent';

  return (
    `${data.updatedAt.seconds}:` +
    `${data.updatedAt.nanoseconds}:` +
    data.note
  );
}

export function connectOnlineNotes({
  roomId,
  userId,
  getRoom,
  onError = () => {}
}) {
  let destroyed = false;
  let ready = false;
  let failed = false;

  let records = new Map();
  const drafts = new Map();
  const saving = new Set();

  let mounted = null;

  function ownSide(side, room = getRoom()) {
    return Boolean(
      room &&
      (
        (
          side === 'a' &&
          room.hostId === userId &&
          room.guestId !== userId
        ) ||
        (
          side === 'b' &&
          room.guestId === userId &&
          room.hostId !== userId
        )
      )
    );
  }

  function checkActive() {
    if (
      destroyed ||
      auth.currentUser?.uid !== userId ||
      !auth.currentUser?.emailVerified
    ) {
      throw new Error(
        'Аккаунт или подключение изменились. Обновите страницу.'
      );
    }
  }

  function renderMounted() {
    if (!mounted || destroyed) return;

    const { container, side, index } = mounted;
    const id = onlineUnitId(side, index);
    const record = records.get(id);
    const draft = drafts.get(id);
    const own = ownSide(side);
    const busy = saving.has(id);

    const editable = Boolean(
      own &&
      ready &&
      !busy &&
      getRoom()?.tableLocked === true &&
      auth.currentUser?.uid === userId &&
      auth.currentUser?.emailVerified
    );

    // Сохраняем фокус и положение курсора при обновлении подписки.
    const oldTextarea = container.querySelector('textarea');
    const focused = document.activeElement === oldTextarea;

    const selectionStart = focused
      ? oldTextarea.selectionStart
      : null;

    const selectionEnd = focused
      ? oldTextarea.selectionEnd
      : null;

    container.replaceChildren();

    container.append(
      node('h3', 'Общая заметка модели')
    );

    const label = node(
      'label',
      own
        ? 'Заметка видна обоим участникам'
        : 'Заметка владельца модели'
    );

    const textarea = node('textarea');
    textarea.rows = 4;
    textarea.maxLength = MAX_NOTE_LENGTH;
    textarea.readOnly = !editable;

    textarea.value = draft
      ? draft.text
      : ready
        ? record?.note ?? ''
        : '';

    textarea.setAttribute(
      'aria-label',
      'Общая заметка модели'
    );

    label.append(textarea);
    container.append(label);

    const status = node('p', '', 'vt-muted');
    status.setAttribute('aria-live', 'polite');

    function updateStatus() {
      const currentDraft = drafts.get(id);

      status.textContent = !ready
        ? failed
          ? 'Заметки недоступны. Черновик не удалён.'
          : 'Заметки загружаются. Редактирование временно недоступно.'
        : busy
          ? 'Сохраняем заметку…'
          : currentDraft
            ? recordVersion(record) !== currentDraft.baseVersion
              ? 'На сервере заметка изменилась. Черновик сохранён ' +
                'в этой вкладке. Скопируйте его перед загрузкой ' +
                'серверного текста.'
              : 'Есть несохранённый черновик.'
            : own
              ? 'До 2000 символов. Сохраняйте отдельной кнопкой. ' +
                'Перезагрузка удалит несохранённый текст.'
              : 'Только просмотр. Изменять может владелец модели.';
    }

    textarea.addEventListener('input', () => {
      const existing = drafts.get(id);

      drafts.set(id, {
        text: textarea.value,
        baseVersion: existing
          ? existing.baseVersion
          : recordVersion(records.get(id))
      });

      updateStatus();
    });

    if (own) {
      const actions = node('div', '', 'vt-detail-actions');

      const save = node(
        'button',
        busy ? 'Сохраняем…' : 'Сохранить заметку',
        'builder-action-btn'
      );

      save.type = 'button';
      save.disabled = !editable;

      save.addEventListener('click', () => {
        void saveNote(side, index).catch(error => {
          if (!destroyed) onError(error);
        });
      });

      const restore = node(
        'button',
        'Загрузить сохранённый текст',
        'builder-action-btn'
      );

      restore.type = 'button';
      restore.disabled = !ready || busy || !draft;

      restore.addEventListener('click', () => {
        if (
          drafts.has(id) &&
          !window.confirm(
            'Отбросить несохранённый черновик этой модели ' +
            'и загрузить текст с сервера?'
          )
        ) {
          return;
        }

        drafts.delete(id);
        renderMounted();
      });

      actions.append(save, restore);
      container.append(actions);
    }

    updateStatus();
    container.append(status);

    if (focused) {
      textarea.focus();
      textarea.setSelectionRange(
        Math.min(selectionStart, textarea.value.length),
        Math.min(selectionEnd, textarea.value.length)
      );
    }
  }

  async function saveNote(side, index) {
    checkActive();

    const id = onlineUnitId(side, index);
    const draft = drafts.get(id);

    if (!ready || saving.has(id)) {
      throw new Error('Дождитесь загрузки или сохранения заметки.');
    }

    if (!draft) return;

    const text = draft.text;
    const baseVersion = draft.baseVersion;

    if (text.length > MAX_NOTE_LENGTH) {
      throw new Error(
        `Заметка не должна превышать ${MAX_NOTE_LENGTH} символов.`
      );
    }

    const roomRef = doc(db, 'rooms', roomId);
    const noteRef = doc(
      db, 'rooms', roomId, 'tableNotes', id
    );

    saving.add(id);
    renderMounted();

    try {
      await runTransaction(db, async transaction => {
        checkActive();

        const roomSnapshot = await transaction.get(roomRef);
        const noteSnapshot = await transaction.get(noteRef);

        if (!roomSnapshot.exists()) {
          throw new Error('Комната удалена.');
        }

        const room = roomSnapshot.data();

        if (!ownSide(side, room)) {
          throw new Error('Можно изменять только свои заметки.');
        }

        if (room.tableLocked !== true) {
          throw new Error('Сначала выполните фиксацию составов.');
        }

        const roster = side === 'a'
          ? room.hostRoster
          : room.guestRoster;

        if (
          !Array.isArray(roster?.units) ||
          index >= roster.units.length ||
          !roster.units[index]
        ) {
          throw new Error('Модель отсутствует в ростере комнаты.');
        }

        const actual = noteSnapshot.exists()
          ? noteSnapshot.data()
          : null;

        if (actual && !validRecord(id, actual)) {
          throw new Error('Неподдерживаемая запись заметки.');
        }

        if (recordVersion(actual) !== baseVersion) {
          throw new Error(
            'Заметка уже изменена в другой вкладке. ' +
            'Ваш черновик сохранён в памяти этой страницы. ' +
            'Скопируйте его и загрузите сохранённый текст.'
          );
        }

        checkActive();

        transaction.set(noteRef, {
          side,
          unitIndex: index,
          note: text,
          updatedAt: serverTimestamp()
        });
      });

      if (
        !destroyed &&
        drafts.get(id)?.text === text &&
        drafts.get(id)?.baseVersion === baseVersion
      ) {
        drafts.delete(id);
      }
    } finally {
      saving.delete(id);
      if (!destroyed) renderMounted();
    }
  }

  const unsubscribe = onSnapshot(
    collection(db, 'rooms', roomId, 'tableNotes'),
    { includeMetadataChanges: true },

    snapshot => {
      if (destroyed) return;

      if (
        snapshot.metadata.fromCache ||
        snapshot.metadata.hasPendingWrites
      ) {
        ready = false;
        failed = false;
        renderMounted();
        return;
      }

      const next = new Map();

      for (const record of snapshot.docs) {
        const data = record.data();

        if (!validRecord(record.id, data)) {
          ready = false;
          failed = true;
          renderMounted();

          onError(
            new Error('Неподдерживаемая запись заметки модели.')
          );

          return;
        }

        next.set(record.id, data);
      }

      records = next;
      ready = true;
      failed = false;

      renderMounted();
    },

    error => {
      if (destroyed) return;

      ready = false;
      failed = true;

      renderMounted();
      onError(error);
    }
  );

  return {
    mount(container, side, index) {
      mounted = { container, side, index };
      renderMounted();
    },

    unmount() {
      mounted = null;
    },

    refresh: renderMounted,

    destroy() {
      if (destroyed) return;

      destroyed = true;
      unsubscribe();
      mounted = null;
      records.clear();
      drafts.clear();
      saving.clear();
    }
  };
}