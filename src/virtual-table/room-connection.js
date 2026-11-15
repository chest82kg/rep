// src/virtual-table/room-connection.js
//
// Подключение виртуального стола к комнате.
//
// — читает ?room=CODE;
// — проверяет авторизованного участника;
// — определяет закреплённую сторону;
// — показывает состояние подключения;
// — подключает онлайн-броски для ростера участника.
//
// НЕ синхронизирует поле.
// НЕ изменяет локальное сохранение.
// НЕ связывает локальные жетоны с ростерами комнаты.
// НЕ импортирует дашборд battle/*.

import { auth, db } from '../core/firebase.js';

import {
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

import {
  doc,
  onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

import {
  createOnlineDicePanel
} from './online-dice.js';

let initialized = false;
let unsubscribeRoom = null;
let generation = 0;
let onlineDicePanel = null;

function stopRoomListener() {
  if (unsubscribeRoom) {
    unsubscribeRoom();
    unsubscribeRoom = null;
  }
}

function stopOnlineDice() {
  if (onlineDicePanel) {
    onlineDicePanel.destroy();
    onlineDicePanel = null;
  }
}

export function initTableRoomConnection() {
  if (initialized) return;
  initialized = true;

  const params = new URLSearchParams(window.location.search);

  if (!params.has('room')) return;

  const rawCode = params.get('room') || '';
  const roomCode = rawCode.trim().toUpperCase();

  const header = document.querySelector('.vt-header');

  if (!header) return;

  const panel = document.createElement('section');
  panel.className = 'vt-room-connection';
  panel.setAttribute('aria-label', 'Подключение к онлайн-комнате');

  const status = document.createElement('div');
  status.className = 'vt-room-connection-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');

  const explanation = document.createElement('p');
  explanation.className = 'vt-room-connection-help';
   explanation.textContent =
    'Позиции, ХП, направления и броски общие для участников комнаты. ' +
    'Менять модели может только владелец своей стороны. ' +
    'Дальность и стоимость действий проверяются вручную. ' +
    'Локальная партия не загружается и не изменяется.';

  const actions = document.createElement('nav');
  actions.className = 'vt-room-connection-actions';
  actions.setAttribute('aria-label', 'Навигация комнаты');

  const dashboard = document.createElement('a');
  dashboard.className = 'builder-action-btn';
  dashboard.textContent = 'Открыть комнату в дашборде';

  const dashboardURL = new URL('play.html', window.location.href);
  dashboardURL.searchParams.set('room', roomCode);
  dashboard.href = dashboardURL.href;

  const local = document.createElement('a');
  local.className = 'builder-action-btn';
  local.textContent = 'Открыть стол без подключения';

  const localURL = new URL(window.location.href);
  localURL.searchParams.delete('room');
  local.href = localURL.href;

   actions.append(dashboard, local);
  panel.append(status, explanation, actions);

  const roomHost = document.getElementById(
    'vt-online-room-host'
  );

  if (roomHost) {
    roomHost.append(panel);
  } else {
    header.after(panel);
  }

  const compactStatus = document.getElementById(
    'vt-online-compact-status'
  );

    function show(text, kind = 'loading', shortText = text) {
    panel.dataset.status = kind;
    status.textContent = text;

    if (compactStatus) {
      compactStatus.textContent = shortText;
      compactStatus.title = text;
      compactStatus.dataset.status = kind;
    }
  }

  if (!/^[A-Z0-9]{6}$/.test(roomCode)) {
    dashboard.hidden = true;

    show(
      'Неверный код комнаты в адресе страницы.',
      'error'
    );

    return;
  }

  show(`Комната ${roomCode} · проверяем аккаунт…`);

  onAuthStateChanged(
    auth,

    user => {
      generation += 1;
      const currentGeneration = generation;

      stopRoomListener();
      stopOnlineDice();

      panel.querySelector('[data-room-login]')?.remove();

      if (!user || !user.emailVerified) {
        show(
          user
            ? 'Для подключения подтвердите электронную почту.'
            : 'Для подключения к комнате войдите в аккаунт.',
          'error'
        );

        const login = document.createElement('a');
        login.className = 'builder-action-btn';
        login.dataset.roomLogin = '';
        login.textContent = 'Открыть личный кабинет';
        login.href = new URL(
          'account.html',
          window.location.href
        ).href;

        actions.prepend(login);
        return;
      }

      show(`Комната ${roomCode} · подключаемся…`);

      unsubscribeRoom = onSnapshot(
        doc(db, 'rooms', roomCode),
        { includeMetadataChanges: true },

        snapshot => {
          if (currentGeneration !== generation) return;

          if (!snapshot.exists()) {
            stopOnlineDice();

            if (snapshot.metadata.fromCache) {
              show(
                `Комната ${roomCode}: в кеше нет данных. ` +
                'Ожидаем ответ сервера.',
                'loading',
                `Комната ${roomCode} · ожидаем сервер`
              );
            } else {
              show(
                `Комната ${roomCode} не найдена или уже закрыта.`,
                'error'
              );
            }

            return;
          }

          const room = snapshot.data();

          const isHost = room.hostId === user.uid;
          const isGuest = room.guestId === user.uid;

          if (!isHost && !isGuest) {
            stopOnlineDice();

            show(
              `Вы не участник комнаты ${roomCode}. ` +
              'Присоединитесь через дашборд армии.',
              'error'
            );

            return;
          }

          // Не выбираем сторону молча при неоднозначных данных.
          if (isHost && isGuest) {
            stopOnlineDice();

            show(
              'В комнате один аккаунт указан сразу за обе стороны. ' +
              'Подключение стола приостановлено.',
              'error'
            );

            return;
          }

                    if (!onlineDicePanel) {
            const diceHost = document.getElementById(
              'vt-online-dice-host'
            );

            onlineDicePanel = createOnlineDicePanel(
              diceHost || panel,
              roomCode
            );
          }

          onlineDicePanel.update(
            room,
            isHost ? 'a' : 'b',
            user.uid
          );

          const sideLabel = isHost ? 'А' : 'Б';
          const roleLabel = isHost ? 'хост' : 'гость';

          const ownRoster = isHost
            ? room.hostRoster
            : room.guestRoster;

          const opponentRoster = isHost
            ? room.guestRoster
            : room.hostRoster;

          const opponentJoined = Boolean(
            isHost ? room.guestId : room.hostId
          );

          const ownLabel = ownRoster
            ? String(ownRoster.name || 'Без имени')
            : 'не выбран';

          const opponentLabel = !opponentJoined
            ? 'ожидание участника'
            : opponentRoster
              ? String(opponentRoster.name || 'Без имени')
              : 'ростер не выбран';

          const cached = snapshot.metadata.fromCache;
          const pending = snapshot.metadata.hasPendingWrites;

          const sourceText = cached
            ? 'Показаны кешированные данные комнаты; ' +
              'актуальность на сервере не подтверждена.'
            : pending
              ? 'Есть локальные изменения комнаты, ' +
                'ещё не подтверждённые сервером.'
              : 'Данные комнаты получены с сервера.';

          const participantText = opponentJoined
            ? 'Второй участник занял сторону. ' +
              'Его присутствие за столом сейчас не отслеживается.'
            : 'Ожидаем второго участника.';

          show(
            `Комната ${roomCode} · вы ${roleLabel}, сторона ${sideLabel}. ` +
            `Ваш ростер: ${ownLabel}. ` +
            `Соперник: ${opponentLabel}. ` +
            `${participantText} ${sourceText}`,
            cached || pending ? 'loading' : 'connected',
            `Комната ${roomCode} · ваша сторона ${sideLabel} · ` +
            (
              cached
                ? 'данные из кеша'
                : pending
                  ? 'ожидаем подтверждение'
                  : 'комната получена с сервера'
            )
          );
        },

        error => {
          if (currentGeneration !== generation) return;

          stopOnlineDice();

          console.error('Table room connection:', error);

          show(
            'Не удалось прочитать комнату. ' +
            'Проверьте подключение и доступ к Firebase. ' +
            `Код ошибки: ${error.code || 'неизвестен'}.`,
            'error'
          );
        }
      );
    },

    error => {
      generation += 1;

      stopRoomListener();
      stopOnlineDice();

      console.error('Table room auth:', error);

      show(
        'Не удалось проверить аккаунт Firebase.',
        'error'
      );
    }
  );
}