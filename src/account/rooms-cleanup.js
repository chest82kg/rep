// src/account/rooms-cleanup.js
//
// Очистка старых комнат из Firestore.
// Firestore TTL требует платного тарифа, поэтому здесь ручная очистка:
// игрок заходит в кабинет и удаляет свои комнаты старше N часов.

import { db } from '../core/firebase.js';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getCurrentUser } from './profile.js';
import { humanizeFirestoreError } from '../utils/errors.js';

const ROOM_MAX_AGE_HOURS = 6;

// --- Инициализация UI ---
export function initRoomsCleanupUI() {
  const scanBtn = document.getElementById('btn-rooms-scan');
  const deleteOldBtn = document.getElementById('btn-rooms-delete-old');
  const deleteAllBtn = document.getElementById('btn-rooms-delete-all');

  if (scanBtn) scanBtn.addEventListener('click', scanRooms);
  if (deleteOldBtn) deleteOldBtn.addEventListener('click', deleteOldRooms);
  if (deleteAllBtn) deleteAllBtn.addEventListener('click', deleteAllMyRooms);
}

function showCleanupMessage(text, type = 'info') {
  const el = document.getElementById('rooms-cleanup-message');
  if (!el) return;
  if (!text) { el.innerHTML = ''; return; }
  const colors = {
    ok: { bg: 'rgba(46,213,115,0.12)', border: '#2ed573', color: '#2ed573' },
    err: { bg: 'rgba(255,71,87,0.12)', border: '#ff4757', color: '#ff4757' },
    info: { bg: 'rgba(108,92,231,0.12)', border: '#6c5ce7', color: '#a29bfe' }
  };
  const c = colors[type] || colors.info;
  el.innerHTML = `<div style="background:${c.bg}; border:1px solid ${c.border}; color:${c.color}; padding:8px 12px; border-radius:6px; font-size:0.9rem;">${text}</div>`;
}

function renderCleanupStats(stats) {
  const el = document.getElementById('rooms-cleanup-stats');
  if (!el) return;
  if (!stats) { el.innerHTML = ''; return; }

  el.innerHTML = `
    <div style="display:flex; gap:16px; flex-wrap:wrap; margin-top:10px; font-size:0.9rem;">
      <span><strong style="color:#fff;">Всего моих комнат:</strong> ${stats.total}</span>
      <span><strong style="color:#ffa502;">Старше ${ROOM_MAX_AGE_HOURS} ч:</strong> ${stats.old}</span>
      <span><strong style="color:#2ed573;">Активных:</strong> ${stats.active}</span>
    </div>
  `;
}

async function fetchMyRooms() {
  const user = getCurrentUser();
  if (!user) return [];

  const roomsCol = collection(db, 'rooms');
  const [hostSnap, guestSnap] = await Promise.all([
    getDocs(query(roomsCol, where('hostId', '==', user.uid))),
    getDocs(query(roomsCol, where('guestId', '==', user.uid)))
  ]);

  const map = new Map();
  hostSnap.forEach(d => map.set(d.id, { id: d.id, ...d.data(), _role: 'host' }));
  guestSnap.forEach(d => {
    if (!map.has(d.id)) map.set(d.id, { id: d.id, ...d.data(), _role: 'guest' });
  });

  return Array.from(map.values());
}

function isOlderThan(room, hours) {
  const ref = room.updatedAt || room.createdAt;
  if (!ref) return true;
  const t = new Date(ref).getTime();
  if (isNaN(t)) return true;
  return (Date.now() - t) > hours * 60 * 60 * 1000;
}

async function scanRooms() {
  const user = getCurrentUser();
  if (!user) {
    showCleanupMessage('Требуется авторизация.', 'err');
    return;
  }

  showCleanupMessage('Сканируем комнаты…', 'info');
  renderCleanupStats(null);

  try {
    const rooms = await fetchMyRooms();
    const old = rooms.filter(r => isOlderThan(r, ROOM_MAX_AGE_HOURS));
    const active = rooms.length - old.length;

    renderCleanupStats({ total: rooms.length, old: old.length, active });
    showCleanupMessage(
      old.length > 0
        ? `Найдено ${old.length} стар${old.length === 1 ? 'ая' : 'ых'} комнат${old.length === 1 ? 'а' : ''}. Можно удалить.`
        : 'Старых комнат не найдено.',
      old.length > 0 ? 'info' : 'ok'
    );
  } catch (err) {
    console.error('scanRooms error:', err);
    showCleanupMessage('Ошибка сканирования: ' + humanizeFirestoreError(err), 'err');
  }
}

async function deleteOldRooms() {
  const user = getCurrentUser();
  if (!user) {
    showCleanupMessage('Требуется авторизация.', 'err');
    return;
  }

  let rooms;
  try {
    rooms = await fetchMyRooms();
  } catch (err) {
    showCleanupMessage('Ошибка загрузки: ' + humanizeFirestoreError(err), 'err');
    return;
  }

  const old = rooms.filter(r => isOlderThan(r, ROOM_MAX_AGE_HOURS));

  if (old.length === 0) {
    showCleanupMessage('Нет старых комнат для удаления.', 'info');
    return;
  }

  if (!confirm(`Удалить ${old.length} стар${old.length === 1 ? 'ую' : 'ых'} комнат${old.length === 1 ? 'у' : ''}?`)) {
    return;
  }

  await bulkDelete(old, 'Старые комнаты удалены.');
}

async function deleteAllMyRooms() {
  const user = getCurrentUser();
  if (!user) {
    showCleanupMessage('Требуется авторизация.', 'err');
    return;
  }

  let rooms;
  try {
    rooms = await fetchMyRooms();
  } catch (err) {
    showCleanupMessage('Ошибка загрузки: ' + humanizeFirestoreError(err), 'err');
    return;
  }

  if (rooms.length === 0) {
    showCleanupMessage('У вас нет комнат.', 'info');
    return;
  }

  if (!confirm(`Удалить ВСЕ ваши комнаты (${rooms.length} шт.)? Это действие необратимо.`)) {
    return;
  }

  await bulkDelete(rooms, 'Все комнаты удалены.');
}

async function bulkDelete(rooms, successMessage) {
  showCleanupMessage('Удаляем…', 'info');

  try {
    const toDelete = rooms.filter(r => r._role === 'host');
    const toUnjoin = rooms.filter(r => r._role === 'guest');

    let deletedCount = 0;

    for (let i = 0; i < toDelete.length; i += 500) {
      const batch = writeBatch(db);
      const chunk = toDelete.slice(i, i + 500);
      chunk.forEach(r => batch.delete(doc(db, 'rooms', r.id)));
      await batch.commit();
      deletedCount += chunk.length;
    }

    for (let i = 0; i < toUnjoin.length; i += 500) {
      const batch = writeBatch(db);
      const chunk = toUnjoin.slice(i, i + 500);
      chunk.forEach(r => {
        batch.update(doc(db, 'rooms', r.id), {
          guestId: null,
          guestEmail: null,
          guestRoster: null,
          status: 'waiting',
          updatedAt: new Date().toISOString()
        });
      });
      await batch.commit();
    }

    showCleanupMessage(
      `${successMessage} Удалено ${deletedCount}. Отписано от ${toUnjoin.length} чужих комнат.`,
      'ok'
    );
    renderCleanupStats(null);
  } catch (err) {
    console.error('bulkDelete error:', err);
    showCleanupMessage('Ошибка удаления: ' + humanizeFirestoreError(err), 'err');
  }
}