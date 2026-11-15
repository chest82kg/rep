// src/virtual-table/online-status.js
//
// Ручные активация и усталость.
// Общий сброс активаций выполняется через activationEpoch.
// Старые записи без activationEpoch относятся к версии 0.
//
// Усталость от версии активаций не зависит.

import { auth, db } from '../core/firebase.js';

import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

import { onlineUnitId } from './online-positions.js';

function validRecord(id, data) {
  const required = [
    'side',
    'unitIndex',
    'activated',
    'fatigued',
    'updatedAt'
  ];

  const allowed = [...required, 'activationEpoch'];

  return Boolean(
    data &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    required.every(key => Object.hasOwn(data, key)) &&
    Object.keys(data).every(key => allowed.includes(key)) &&
    ['a', 'b'].includes(data.side) &&
    Number.isSafeInteger(data.unitIndex) &&
    data.unitIndex >= 0 &&
    id === `${data.side}_${data.unitIndex}` &&
    typeof data.activated === 'boolean' &&
    typeof data.fatigued === 'boolean' &&
    (
      !Object.hasOwn(data, 'activationEpoch') ||
      (
        Number.isSafeInteger(data.activationEpoch) &&
        data.activationEpoch >= 0
      )
    ) &&
    typeof data.updatedAt?.toMillis === 'function'
  );
}

function node(tag, text = '', className = '') {
  const element = document.createElement(tag);
  element.textContent = String(text);
  element.className = className;
  return element;
}

export function connectOnlineStatus({
  roomId,
  userId,
  getRoom,
  getRoundState,
  onChange = () => {},
  onError = () => {}
}) {
  let destroyed = false;
  let ready = false;
  let failed = false;
  let busy = false;

  let records = new Map();
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

  function indicator(side, index) {
    const round = getRoundState();

    if (!ready || !round?.ready) {
      return {
        ready: false,
        activated: null,
        fatigued: null,
        text: failed
          ? 'Отметки недоступны'
          : 'Отметки и раунд загружаются'
      };
    }

    const data = records.get(onlineUnitId(side, index));

    const activated = Boolean(
      data?.activated &&
      (data.activationEpoch ?? 0) === round.activationEpoch
    );

    const fatigued = data?.fatigued ?? false;

    return {
      ready: true,
      activated,
      fatigued,
      text:
        (activated ? 'Активирована' : 'Не активирована') +
        (fatigued ? ' · Усталость' : '')
    };
  }

  function renderMounted() {
    if (!mounted || destroyed) return;

    const { container, side, index } = mounted;
    const status = indicator(side, index);
    const room = getRoom();

    container.replaceChildren();

    const description = node('p', status.text, 'vt-muted');
    description.setAttribute('aria-live', 'polite');
    container.append(description);

    if (!ownSide(side, room)) {
      container.append(
        node('p', 'Модель соперника · только просмотр.', 'vt-muted')
      );
      return;
    }

    const available = Boolean(
      status.ready &&
      room?.tableLocked === true &&
      !busy &&
      auth.currentUser?.uid === userId &&
      auth.currentUser?.emailVerified
    );

    const actions = node('div', '', 'vt-detail-actions');

    function button(field, text, pressed) {
      const control = node('button', text, 'builder-action-btn');

      control.type = 'button';
      control.disabled = !available;
      control.setAttribute('aria-pressed', String(pressed));
      control.classList.toggle('primary', pressed);

      control.addEventListener('click', () => {
        void toggle(side, index, field).catch(error => {
          if (!destroyed) onError(error);
        });
      });

      return control;
    }

    actions.append(
      button(
        'activated',
        status.activated
          ? 'Снять активацию'
          : 'Отметить активацию',
        status.activated === true
      ),
      button(
        'fatigued',
        status.fatigued
          ? 'Снять усталость'
          : 'Установить усталость',
        status.fatigued === true
      )
    );

    container.append(
      actions,
      node(
        'p',
        room?.tableLocked === true
          ? 'Ручные отметки. Общий сброс снимает только активации. ' +
            'Усталость снимается вручную.'
          : 'Отметки доступны после фиксации составов.',
        'vt-muted'
      )
    );
  }

  async function toggle(side, index, field) {
    checkActive();

    if (!['activated', 'fatigued'].includes(field)) {
      throw new Error('Неизвестная отметка.');
    }

    const roundAtClick = getRoundState();

    if (!ready || !roundAtClick?.ready || busy) {
      throw new Error('Дождитесь загрузки или сохранения отметок.');
    }

    const expectedEpoch = roundAtClick.activationEpoch;
    const id = onlineUnitId(side, index);

    const roomRef = doc(db, 'rooms', roomId);
    const roundRef = doc(
      db, 'rooms', roomId, 'tableRound', 'state'
    );
    const statusRef = doc(
      db, 'rooms', roomId, 'tableStatus', id
    );

    busy = true;
    renderMounted();

    try {
      await runTransaction(db, async transaction => {
        checkActive();

        const roomSnapshot = await transaction.get(roomRef);
        const roundSnapshot = await transaction.get(roundRef);
        const statusSnapshot = await transaction.get(statusRef);

        if (!roomSnapshot.exists()) {
          throw new Error('Комната удалена.');
        }

        const room = roomSnapshot.data();

        if (!ownSide(side, room)) {
          throw new Error('Можно изменять только свои модели.');
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

        const epoch = roundSnapshot.exists()
          ? roundSnapshot.data().activationEpoch
          : 0;

        if (!Number.isSafeInteger(epoch) || epoch < 0) {
          throw new Error('Неподдерживаемая версия активаций.');
        }

        if (epoch !== expectedEpoch) {
          throw new Error(
            'Активации уже сброшены. Проверьте отметки и повторите действие.'
          );
        }

        const previous = statusSnapshot.exists()
          ? statusSnapshot.data()
          : {
              activated: false,
              fatigued: false,
              activationEpoch: 0
            };

        if (
          statusSnapshot.exists() &&
          !validRecord(id, previous)
        ) {
          throw new Error('Неподдерживаемая запись отметок модели.');
        }

        const activated = Boolean(
          previous.activated &&
          (previous.activationEpoch ?? 0) === epoch
        );

        checkActive();

        transaction.set(statusRef, {
          side,
          unitIndex: index,
          activated: field === 'activated'
            ? !activated
            : activated,
          fatigued: field === 'fatigued'
            ? !previous.fatigued
            : previous.fatigued,
          activationEpoch: epoch,
          updatedAt: serverTimestamp()
        });
      });
    } finally {
      busy = false;
      if (!destroyed) renderMounted();
    }
  }

  const unsubscribe = onSnapshot(
    collection(db, 'rooms', roomId, 'tableStatus'),
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
        onChange();
        return;
      }

      const next = new Map();

      for (const record of snapshot.docs) {
        const data = record.data();

        if (!validRecord(record.id, data)) {
          ready = false;
          failed = true;
          renderMounted();
          onChange();
          onError(
            new Error('Неподдерживаемая запись отметок модели.')
          );
          return;
        }

        next.set(record.id, data);
      }

      records = next;
      ready = true;
      failed = false;
      renderMounted();
      onChange();
    },

    error => {
      if (destroyed) return;

      ready = false;
      failed = true;
      renderMounted();
      onChange();
      onError(error);
    }
  );

  return {
    indicator,

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
    }
  };
}