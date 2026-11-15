// src/virtual-table/online-rounds.js
//
// Общий ручной раунд.
// Управление — только создателю комнаты после фиксации составов.
//
// Следующий раунд: номер +1, версия активаций +1.
// Общий сброс: только версия активаций +1.
// Предыдущий раунд: только номер -1.
//
// Не изменяет усталость, ХП, позиции, фронт и ландшафт.

import { auth, db } from '../core/firebase.js';

import {
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const MAX = Number.MAX_SAFE_INTEGER;

function node(tag, text = '', className = '') {
  const element = document.createElement(tag);
  element.textContent = text;
  element.className = className;
  return element;
}

function initialState() {
  return {
    round: 1,
    activationEpoch: 0
  };
}

function validState(data) {
  const keys = ['round', 'activationEpoch', 'updatedAt'];

  return Boolean(
    data &&
    Object.keys(data).length === keys.length &&
    keys.every(key => Object.hasOwn(data, key)) &&
    Number.isSafeInteger(data.round) &&
    data.round >= 1 &&
    Number.isSafeInteger(data.activationEpoch) &&
    data.activationEpoch >= 0 &&
    typeof data.updatedAt?.toMillis === 'function'
  );
}

export function connectOnlineRounds({
  roomId,
  userId,
  getRoom,
  container,
  onChange = () => {},
  onError = () => {}
}) {
  const reference = doc(
    db, 'rooms', roomId, 'tableRound', 'state'
  );

  const panel = node('section', '', 'vt-field-toolbar');
  panel.setAttribute('aria-label', 'Общий раунд');

  const label = node('strong', 'Раунд: …');
  label.setAttribute('aria-live', 'polite');

  const previous = node(
    'button', '−1 раунд', 'builder-action-btn'
  );

  const next = node(
    'button', 'Следующий раунд', 'builder-action-btn primary'
  );

  const reset = node(
    'button', 'Снять активации', 'builder-action-btn'
  );

  const help = node('p', '', 'vt-muted');
  help.style.flexBasis = '100%';
  help.style.margin = '0';

  for (const button of [previous, next, reset]) {
    button.type = 'button';
  }

  panel.append(label, previous, next, reset, help);
  container.append(panel);

  let destroyed = false;
  let ready = false;
  let failed = false;
  let busy = false;
  let state = initialState();

  function isHost(room = getRoom()) {
    return Boolean(
      room &&
      room.hostId === userId &&
      room.guestId !== userId
    );
  }

  function checkActive() {
    if (
      destroyed ||
      auth.currentUser?.uid !== userId ||
      !auth.currentUser?.emailVerified
    ) {
      throw new Error(
        'Подключение или аккаунт изменились. Обновите страницу.'
      );
    }
  }

  function getState() {
    return {
      ready,
      round: ready ? state.round : null,
      activationEpoch: ready ? state.activationEpoch : null
    };
  }

  function render() {
    if (destroyed) return;

    const room = getRoom();
    const host = isHost(room);

    const allowed = Boolean(
      ready &&
      !busy &&
      host &&
      room?.tableLocked === true &&
      auth.currentUser?.uid === userId &&
      auth.currentUser?.emailVerified
    );

    label.textContent = ready
      ? `Раунд: ${state.round}`
      : failed
        ? 'Раунд недоступен'
        : 'Раунд: загрузка…';

    previous.hidden = !host;
    next.hidden = !host;
    reset.hidden = !host;

    previous.disabled = !allowed || state.round <= 1;

    next.disabled =
      !allowed ||
      state.round >= MAX ||
      state.activationEpoch >= MAX;

    reset.disabled =
      !allowed ||
      state.activationEpoch >= MAX;

    help.textContent = room?.tableLocked !== true
      ? 'Управление раундом доступно после фиксации составов.'
      : host
        ? 'Следующий раунд снимает активации обеих сторон. ' +
          'Усталость и остальные данные сохраняются.'
        : 'Общим раундом управляет создатель комнаты. ' +
          'Усталость снимается вручную.';
  }

  async function perform(action) {
    checkActive();

    if (!ready || busy) return;

    if (!isHost() || getRoom()?.tableLocked !== true) {
      throw new Error('Управление раундом сейчас недоступно.');
    }

    const expected = { ...state };

    if (action === 'previous' && expected.round <= 1) return;

    if (
      (action === 'next' && expected.round >= MAX) ||
      (
        action !== 'previous' &&
        expected.activationEpoch >= MAX
      )
    ) {
      throw new Error('Достигнут предел счётчика.');
    }

    const question = action === 'next'
      ? `Перейти к раунду ${expected.round + 1} ` +
        'и снять активации обеих сторон?\n\n' +
        'Усталость, ХП, фронт, позиции и ландшафт сохранятся. ' +
        'Игровые эффекты применяются вручную.'
      : action === 'previous'
        ? `Исправить номер раунда: ${expected.round} → ` +
          `${expected.round - 1}?\n\n` +
          'Изменится только номер. Предыдущие действия ' +
          'и активации не восстанавливаются.'
        : 'Снять активации обеих сторон?\n\n' +
          'Номер раунда, усталость и остальные данные сохранятся.';

    if (!window.confirm(question)) return;

    busy = true;
    render();

    try {
      await runTransaction(db, async transaction => {
        checkActive();

        const roomSnapshot = await transaction.get(
          doc(db, 'rooms', roomId)
        );

        const roundSnapshot = await transaction.get(reference);

        if (
          !roomSnapshot.exists() ||
          !isHost(roomSnapshot.data()) ||
          roomSnapshot.data().tableLocked !== true
        ) {
          throw new Error('Нет доступа к управлению раундом.');
        }

        const actual = roundSnapshot.exists()
          ? roundSnapshot.data()
          : initialState();

        if (
          roundSnapshot.exists() &&
          !validState(actual)
        ) {
          throw new Error('Неподдерживаемая запись раунда.');
        }

        // Не применяем подтверждённое действие к уже
        // изменённому раунду, например из другой вкладки.
        if (
          actual.round !== expected.round ||
          actual.activationEpoch !== expected.activationEpoch
        ) {
          throw new Error(
            'Раунд уже изменился. Проверьте его и повторите действие.'
          );
        }

        checkActive();

        transaction.set(reference, {
          round: action === 'next'
            ? actual.round + 1
            : action === 'previous'
              ? actual.round - 1
              : actual.round,

          activationEpoch: action === 'previous'
            ? actual.activationEpoch
            : actual.activationEpoch + 1,

          updatedAt: serverTimestamp()
        });
      });
    } finally {
      busy = false;
      render();
    }
  }

  for (const [button, action] of [
    [previous, 'previous'],
    [next, 'next'],
    [reset, 'reset']
  ]) {
    button.addEventListener('click', () => {
      void perform(action).catch(error => {
        if (!destroyed) onError(error);
      });
    });
  }

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
        failed = false;
        render();
        onChange();
        return;
      }

      const data = snapshot.exists()
        ? snapshot.data()
        : initialState();

      if (snapshot.exists() && !validState(data)) {
        ready = false;
        failed = true;
        render();
        onChange();
        onError(new Error('Неподдерживаемая запись раунда.'));
        return;
      }

      state = data;
      ready = true;
      failed = false;

      render();
      onChange();
    },

    error => {
      if (destroyed) return;

      ready = false;
      failed = true;

      render();
      onChange();
      onError(error);
    }
  );

  render();

  return {
    getState,
    refresh: render,

    destroy() {
      if (destroyed) return;
      destroyed = true;
      unsubscribe();
      panel.remove();
    }
  };
}