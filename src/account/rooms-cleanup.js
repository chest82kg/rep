// src/account/rooms-cleanup.js
//
// Просмотр комнат пользователя.
//
// Важно:
// Firestore из браузера не умеет рекурсивно удалять документ
// вместе со всеми подколлекциями. Удаление только /rooms/{id}
// оставляет tableUnits, tableCells, health, terrain и другие
// подколлекции сиротами.
//
// Поэтому кабинет намеренно НЕ удаляет комнаты и НЕ освобождает
// гостя массовой записью. Комнату следует завершать штатным
// механизмом игрового лобби/стола. Для настоящего рекурсивного
// удаления понадобится доверенный backend или Firebase Functions.

import { db } from '../core/firebase.js';

import {
  collection,
  query,
  where,
  getDocs
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

import { getCurrentUser } from './profile.js';
import { humanizeFirestoreError } from '../utils/errors.js';
import { escapeHtml } from '../utils/escape.js';

const ROOM_MAX_AGE_HOURS = 6;

let cleanupBusy = false;
let cleanupGeneration = 0;

export function initRoomsCleanupUI() {
  const scanButton = document.getElementById('btn-rooms-scan');
  const deleteOldButton = document.getElementById(
    'btn-rooms-delete-old'
  );
  const deleteAllButton = document.getElementById(
    'btn-rooms-delete-all'
  );

  if (scanButton) {
    scanButton.addEventListener('click', scanRooms);
  }

  // Кнопки сохранены в разметке, чтобы не ломать layout,
  // но опасные действия отключены и объяснены пользователю.
  for (const button of [deleteOldButton, deleteAllButton]) {
    if (!button) continue;

    button.disabled = true;
    button.title =
      'Рекурсивное удаление комнат из браузера недоступно. ' +
      'Откройте комнату через лобби и завершите её штатно.';
  }
}

function getDateTime(value) {
  if (!value) return 0;

  if (typeof value.toMillis === 'function') {
    return value.toMillis();
  }

  if (typeof value.toDate === 'function') {
    return value.toDate().getTime();
  }

  const time = new Date(value).getTime();

  return Number.isFinite(time) ? time : 0;
}

function isOlderThan(room, hours) {
  const time = getDateTime(
    room.updatedAt || room.createdAt
  );

  // Неизвестную дату не выдаём за старую комнату:
  // сначала её должен разобрать автор/штатное лобби.
  if (!time) return false;

  return Date.now() - time > hours * 60 * 60 * 1000;
}

function isSameUser(context) {
  return Boolean(
    getCurrentUser()?.uid === context.uid &&
    cleanupGeneration === context.generation
  );
}

function setCleanupBusy(value) {
  cleanupBusy = value;

  const scanButton = document.getElementById('btn-rooms-scan');

  if (scanButton) {
    scanButton.disabled = value;
  }
}

function showCleanupMessage(text, type = 'info') {
  const element = document.getElementById(
    'rooms-cleanup-message'
  );

  if (!element) return;

  if (!text) {
    element.innerHTML = '';
    return;
  }

  const colors = {
    ok: {
      bg: 'rgba(46,213,115,0.12)',
      border: '#2ed573',
      color: '#2ed573'
    },
    err: {
      bg: 'rgba(255,71,87,0.12)',
      border: '#ff4757',
      color: '#ff4757'
    },
    info: {
      bg: 'rgba(108,92,231,0.12)',
      border: '#6c5ce7',
      color: '#a29bfe'
    }
  };

  const color = colors[type] || colors.info;

  element.innerHTML = `
    <div style="
      background:${color.bg};
      border:1px solid ${color.border};
      color:${color.color};
      padding:8px 12px;
      border-radius:6px;
      font-size:0.9rem;
    ">
      ${escapeHtml(text)}
    </div>
  `;
}

function renderCleanupStats(stats) {
  const element = document.getElementById(
    'rooms-cleanup-stats'
  );

  if (!element) return;

  if (!stats) {
    element.innerHTML = '';
    return;
  }

  element.innerHTML = `
    <div style="
      display:flex;
      gap:16px;
      flex-wrap:wrap;
      margin-top:10px;
      font-size:0.9rem;
    ">
      <span>
        <strong style="color:#fff;">Всего моих комнат:</strong>
        ${stats.total}
      </span>

      <span>
        <strong style="color:#ffa502;">
          Старше ${ROOM_MAX_AGE_HOURS} ч:
        </strong>
        ${stats.old}
      </span>

      <span>
        <strong style="color:#2ed573;">Активных:</strong>
        ${stats.active}
      </span>

      ${stats.unknownDate > 0 ? `
        <span>
          <strong style="color:#a29bfe;">
            Без распознанной даты:
          </strong>
          ${stats.unknownDate}
        </span>
      ` : ''}
    </div>
  `;
}

async function fetchMyRooms(context) {
  const rooms = collection(db, 'rooms');

  const [hostSnapshot, guestSnapshot] = await Promise.all([
    getDocs(
      query(rooms, where('hostId', '==', context.uid))
    ),
    getDocs(
      query(rooms, where('guestId', '==', context.uid))
    )
  ]);

  const result = new Map();

  hostSnapshot.forEach(snapshot => {
    result.set(snapshot.id, {
      id: snapshot.id,
      ...snapshot.data(),
      _role: 'host'
    });
  });

  guestSnapshot.forEach(snapshot => {
    if (result.has(snapshot.id)) return;

    result.set(snapshot.id, {
      id: snapshot.id,
      ...snapshot.data(),
      _role: 'guest'
    });
  });

  return [...result.values()];
}

async function scanRooms() {
  if (cleanupBusy) {
    return;
  }

  const user = getCurrentUser();

  if (!user?.uid) {
    showCleanupMessage('Требуется авторизация.', 'err');
    return;
  }

  const context = {
    uid: user.uid,
    generation: ++cleanupGeneration
  };

  setCleanupBusy(true);
  showCleanupMessage('Сканируем комнаты…', 'info');
  renderCleanupStats(null);

  try {
    const rooms = await fetchMyRooms(context);

    if (!isSameUser(context)) {
      return;
    }

    const old = rooms.filter(room =>
      isOlderThan(room, ROOM_MAX_AGE_HOURS)
    );

    const unknownDate = rooms.filter(room => {
      return !getDateTime(room.updatedAt || room.createdAt);
    });

    renderCleanupStats({
      total: rooms.length,
      old: old.length,
      active: rooms.length - old.length - unknownDate.length,
      unknownDate: unknownDate.length
    });

    if (old.length === 0) {
      showCleanupMessage(
        'Старых комнат не найдено. ' +
        'Удаление комнат из кабинета отключено: ' +
        'иначе в Firestore останутся их подколлекции.',
        'ok'
      );

      return;
    }

    showCleanupMessage(
      `Найдено старых комнат: ${old.length}. ` +
      'Удаление из кабинета отключено, чтобы не оставлять ' +
      'подколлекции без родительской комнаты. ' +
      'Откройте комнату через игровое лобби и завершите её ' +
      'штатным способом.',
      'info'
    );
  } catch (error) {
    console.error('scanRooms error:', error);

    if (!isSameUser(context)) {
      return;
    }

    showCleanupMessage(
      'Ошибка сканирования: ' +
      humanizeFirestoreError(error),
      'err'
    );
  } finally {
    if (
      getCurrentUser()?.uid === context.uid &&
      cleanupGeneration === context.generation
    ) {
      setCleanupBusy(false);
    }
  }
}