// src/virtual-table/online-facing.js
//
// Общее направление моделей комнаты.
//
// — отдельная коллекция tableFacing;
// — одна подписка на комнату;
// — направление не сбрасывается при перемещении;
// — отсутствие документа означает "не задано";
// — не списывает ОД и не определяет бесплатность поворота;
// — не использует браузерные сохранения.

import { auth, db } from '../core/firebase.js';

import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export const ONLINE_DIRECTIONS = Object.freeze({
  n: Object.freeze({ arrow: '↑', name: 'Север' }),
  e: Object.freeze({ arrow: '→', name: 'Восток' }),
  s: Object.freeze({ arrow: '↓', name: 'Юг' }),
  w: Object.freeze({ arrow: '←', name: 'Запад' })
});

function validDirection(value) {
  return Object.hasOwn(ONLINE_DIRECTIONS, value);
}

function validIdentity(side, index) {
  return ['a', 'b'].includes(side) &&
    Number.isSafeInteger(index) &&
    index >= 0;
}

function validRecord(id, data) {
  return Boolean(
    data &&
    validIdentity(data.side, data.unitIndex) &&
    id === `${data.side}_${data.unitIndex}` &&
    validDirection(data.facing)
  );
}

function node(tag, text = '', className = '') {
  const element = document.createElement(tag);
  element.textContent = String(text);

  if (className) element.className = className;

  return element;
}

export function connectOnlineFacing({
  roomId,
  userId,
  getRoom,
  onChange,
  onError
}) {
  if (!/^[A-Z0-9]{6}$/.test(roomId)) {
    throw new Error('Некорректный код комнаты для направлений.');
  }

  let destroyed = false;
  let ready = false;
  let failure = '';
  let busy = false;
  let writeError = '';
  let records = new Map();
  let panel = null;

  function ownsSide(room, side) {
    if (
      !room ||
      auth.currentUser?.uid !== userId ||
      !auth.currentUser?.emailVerified
    ) {
      return false;
    }

    return side === 'a'
      ? room.hostId === userId && room.guestId !== userId
      : room.guestId === userId && room.hostId !== userId;
  }

  function rosterUnit(room, side, index) {
    const roster = side === 'a'
      ? room?.hostRoster
      : room?.guestRoster;

    return Array.isArray(roster?.units)
      ? roster.units[index]
      : null;
  }

  function indicator(side, index) {
    if (destroyed || failure) {
      return {
        facing: null,
        text: 'Направление —',
        short: '—',
        description: failure || 'Подключение направления закрыто.'
      };
    }

    if (!ready) {
      return {
        facing: null,
        text: 'Направление …',
        short: '…',
        description: 'Ожидаем направление от сервера.'
      };
    }

    const saved = records.get(`${side}_${index}`);

    if (!saved) {
      return {
        facing: null,
        text: 'Направление не задано',
        short: '?',
        description: 'Направление модели ещё не задано.'
      };
    }

    const direction = ONLINE_DIRECTIONS[saved.facing];

    return {
      facing: saved.facing,
      text: `${direction.arrow} ${direction.name}`,
      short: direction.arrow,
      description: `Направление: ${direction.name.toLowerCase()}.`
    };
  }

  function renderPanel() {
    if (!panel || destroyed) return;

    const room = getRoom();
    const view = indicator(panel.side, panel.index);

    panel.value.textContent = view.text;

    const own = ownsSide(room, panel.side);
    const exists = Boolean(
      rosterUnit(room, panel.side, panel.index)
    );

    for (const [key, button] of panel.buttons) {
      button.disabled =
        !ready ||
        Boolean(failure) ||
        busy ||
        !own ||
        !exists ||
        room?.tableLocked !== true ||
        view.facing === key;

      button.setAttribute(
        'aria-pressed',
        String(view.facing === key)
      );

      button.classList.toggle('primary', view.facing === key);
    }

    if (failure) {
      panel.status.textContent = failure;
    } else if (!ready) {
      panel.status.textContent = 'Загружаем направления комнаты…';
    } else if (writeError) {
      panel.status.textContent = writeError;
    } else if (!own) {
      panel.status.textContent =
        'Модель соперника: только просмотр.';
    } else if (!exists) {
      panel.status.textContent =
        'Модель отсутствует в ростере комнаты.';
    } else if (room?.tableLocked !== true) {
      panel.status.textContent =
        'Сначала разместите модель: состав должен быть зафиксирован.';
    } else {
      panel.status.textContent = busy
        ? 'Сохраняем направление…'
        : 'Ручная отметка направления. Фракционный ОД не списывается. ' +
          'Бесплатность поворота игроки проверяют самостоятельно.';
    }
  }

  async function setFacing(side, index, facing) {
    if (destroyed || busy || !ready || failure) return;

    if (
      !validIdentity(side, index) ||
      !validDirection(facing)
    ) {
      return;
    }

    if (!ownsSide(getRoom(), side)) return;

    busy = true;
    writeError = '';
    renderPanel();

    const id = `${side}_${index}`;
    const roomReference = doc(db, 'rooms', roomId);
    const facingReference = doc(
      db,
      'rooms',
      roomId,
      'tableFacing',
      id
    );

    try {
      await runTransaction(db, async transaction => {
        if (destroyed || auth.currentUser?.uid !== userId) {
          throw new Error('Подключение или аккаунт изменились.');
        }

        const roomSnapshot = await transaction.get(roomReference);
        const savedSnapshot = await transaction.get(facingReference);

        if (!roomSnapshot.exists()) {
          throw new Error('Комната удалена.');
        }

        const actualRoom = roomSnapshot.data();

        if (!ownsSide(actualRoom, side)) {
          throw new Error('Можно менять направление только своей модели.');
        }

        if (actualRoom.tableLocked !== true) {
          throw new Error('Состав партии ещё не зафиксирован.');
        }

        if (!rosterUnit(actualRoom, side, index)) {
          throw new Error('Модель отсутствует в ростере комнаты.');
        }

        if (
          savedSnapshot.exists() &&
          !validRecord(id, savedSnapshot.data())
        ) {
          throw new Error(
            'Сохранённое направление имеет неподдерживаемый формат.'
          );
        }

        if (
          savedSnapshot.exists() &&
          savedSnapshot.data().facing === facing
        ) {
          return;
        }

        if (destroyed || auth.currentUser?.uid !== userId) {
          throw new Error('Подключение или аккаунт изменились.');
        }

        transaction.set(facingReference, {
          side,
          unitIndex: index,
          facing,
          updatedAt: serverTimestamp()
        });
      });
    } catch (error) {
      console.error('Online facing write:', error);

      if (!destroyed) {
        writeError =
          'Изменение не подтверждено: ' +
          String(error.code || error.message) +
          '. Проверьте актуальное направление перед повтором.';
      }
    } finally {
      busy = false;
      renderPanel();
    }
  }

  function unmount() {
    if (!panel) return;

    panel.section.remove();
    panel = null;
  }

  function mount(container, side, index) {
    unmount();

    if (destroyed || !validIdentity(side, index)) return;

    const section = node('section', '', 'vt-detail-block');
    const value = node('p');
    const actions = node('div', '', 'vt-detail-actions');
    const status = node('p', '', 'vt-muted');

    actions.setAttribute('role', 'group');
    actions.setAttribute('aria-label', 'Направление модели');

    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');

    const buttons = new Map();

    for (const [key, direction] of Object.entries(ONLINE_DIRECTIONS)) {
      const button = node(
        'button',
        `${direction.arrow} ${direction.name}`,
        'builder-action-btn'
      );

      button.type = 'button';

      button.addEventListener('click', () => {
        void setFacing(side, index, key);
      });

      buttons.set(key, button);
      actions.append(button);
    }

    section.append(
      node('strong', 'Направление модели'),
      value,
      actions,
      status
    );

    container.append(section);

    panel = {
      section,
      side,
      index,
      value,
      status,
      buttons
    };

    renderPanel();
  }

  const unsubscribe = onSnapshot(
    collection(db, 'rooms', roomId, 'tableFacing'),
    { includeMetadataChanges: true },

    snapshot => {
      if (destroyed) return;

      const next = new Map();

      for (const document of snapshot.docs) {
        const data = document.data();

        if (!validRecord(document.id, data)) {
          ready = false;
          failure =
            'Получена неподдерживаемая запись направления. ' +
            'Редактирование отключено.';

          records = new Map();
          renderPanel();
          onChange();
          return;
        }

        next.set(document.id, data);
      }

      records = next;
      ready = !snapshot.metadata.fromCache;
      failure = '';

      renderPanel();
      onChange();
    },

    error => {
      if (destroyed) return;

      ready = false;
      records = new Map();

      failure =
        'Не удалось прочитать направления: ' +
        String(error.code || error.message);

      renderPanel();
      onChange();
      onError(error);
    }
  );

  return {
    indicator,
    mount,
    unmount,

    destroy() {
      if (destroyed) return;

      destroyed = true;
      unsubscribe();
      unmount();
      records = new Map();
    }
  };
}