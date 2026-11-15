// src/battle/rooms.js
//
// Комнаты двух игроков.
//
// После первого размещения на виртуальном столе:
// — tableLocked == true;
// — замена ростеров запрещена;
// — освобождение места гостем запрещено;
// — хост по-прежнему может закрыть комнату.
//
// TTL требует настройки политики Firestore.
// Удаление документа комнаты не удаляет подколлекции.

import {
  db,
  auth,
  getUserRosters
} from '../core/firebase.js';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

import {
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

import { escapeHtml } from '../utils/escape.js';
import { parseUnitCard } from '../utils/unit-parser.js';

import {
  setRoomMode,
  setSoloMode,
  replaceGameState,
  gameState,
  activeRoomId
} from './state.js';

import {
  startRoomSync,
  stopRoomSync
} from './room-sync.js';

// --------------------------------------------------------------------------
// Внутреннее состояние
// --------------------------------------------------------------------------

const ROOM_TTL_HOURS = 6;

const LOCK_MESSAGE =
  'Состав партии зафиксирован после начала расстановки. ' +
  'Заменить ростеры или освободить место гостя нельзя. ' +
  'Для другого состава создайте новую комнату.';

let initialized = false;
let currentUser = null;
let currentRoomId = null;
let currentRoomData = null;
let unsubscribeSnapshot = null;
let pendingRoomFromURL = null;
let battleInitDone = false;

let roomGeneration = 0;
let pickerGeneration = 0;
let rosterPickerOpen = false;
let rosterWriteBusy = false;
let leaveBusy = false;

// --------------------------------------------------------------------------
// Утилиты
// --------------------------------------------------------------------------

const escape = value => escapeHtml(String(value ?? ''));

function roomBody() {
  return document.getElementById('rooms-modal-body');
}

function isLocked(room = currentRoomData) {
  return room?.tableLocked === true;
}

function participantRole(room, uid = currentUser?.uid) {
  if (!room || !uid) return null;

  const host = room.hostId === uid;
  const guest = room.guestId === uid;

  if (host === guest) return null;

  return host ? 'host' : 'guest';
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';

  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return code;
}

function nextExpireAt() {
  return Timestamp.fromDate(
    new Date(
      Date.now() + ROOM_TTL_HOURS * 60 * 60 * 1000
    )
  );
}

function showRoomMessage(text, type = 'info') {
  const element = document.getElementById('rooms-message');

  if (!element) return;

  element.replaceChildren();

  if (!text) return;

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
  const message = document.createElement('div');

  message.style.cssText =
    `background:${color.bg};` +
    `border:1px solid ${color.border};` +
    `color:${color.color};` +
    'padding:8px 12px;border-radius:6px;font-size:0.9rem;';

  message.setAttribute('role', 'status');
  message.textContent = text;

  element.append(message);
}

function buildRoomShareURL(code) {
  const url = new URL(window.location.href);

  url.search = '';
  url.hash = '';
  url.searchParams.set('room', code);

  return url.toString();
}

function buildQRImageURL(data) {
  return (
    'https://api.qrserver.com/v1/create-qr-code/' +
    '?size=220x220&margin=8&data=' +
    encodeURIComponent(data)
  );
}

function updateURLWithRoom(code) {
  const url = new URL(window.location.href);

  if (code) {
    url.searchParams.set('room', code);
  } else {
    url.searchParams.delete('room');
  }

  window.history.replaceState({}, '', url.toString());
}

function stopRoomListener() {
  roomGeneration += 1;

  if (unsubscribeSnapshot) {
    unsubscribeSnapshot();
    unsubscribeSnapshot = null;
  }
}

function resetRoomConnection() {
  stopRoomListener();

  pickerGeneration += 1;
  rosterPickerOpen = false;

  stopRoomSync();
  setSoloMode();

  currentRoomId = null;
  currentRoomData = null;
  battleInitDone = false;

  renderOpponentBadge();
}

function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text)
      .then(() => true)
      .catch(() => false);
  }

  try {
    const textarea = document.createElement('textarea');

    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';

    document.body.append(textarea);
    textarea.select();

    const ok = document.execCommand('copy');

    textarea.remove();

    return Promise.resolve(ok);
  } catch {
    return Promise.resolve(false);
  }
}

// --------------------------------------------------------------------------
// Инициализация
// --------------------------------------------------------------------------

export function initRooms() {
  if (initialized) return;
  initialized = true;

  const params = new URLSearchParams(window.location.search);
  const roomFromURL = params.get('room');

  if (roomFromURL && /^[A-Z0-9]{6}$/i.test(roomFromURL)) {
    pendingRoomFromURL = roomFromURL.toUpperCase();
  }

  onAuthStateChanged(auth, user => {
    const previousUid = currentUser?.uid || null;

    currentUser = user?.emailVerified ? user : null;

    if (
      previousUid &&
      previousUid !== currentUser?.uid
    ) {
      resetRoomConnection();

      const body = roomBody();

      if (body) {
        body.replaceChildren();
      }
    }

    const button = document.getElementById('btn-rooms');

    if (button) {
      button.disabled = false;
      button.title = currentUser
        ? ''
        : 'Войдите в аккаунт, чтобы использовать комнаты';
    }

    if (currentUser && pendingRoomFromURL) {
      const code = pendingRoomFromURL;
      const uid = currentUser.uid;

      pendingRoomFromURL = null;

      setTimeout(() => {
        if (currentUser?.uid === uid) {
          void tryJoinByCode(code);
        }
      }, 300);
    }
  });

  document.getElementById('btn-rooms')
    ?.addEventListener('click', openRoomsModal);
}

// --------------------------------------------------------------------------
// Открытие модального окна
// --------------------------------------------------------------------------

export async function openRoomsModal() {
  const modal = document.getElementById('rooms-modal');
  const body = roomBody();

  if (!modal || !body) return;

  rosterPickerOpen = false;
  pickerGeneration += 1;

  if (!currentUser) {
    body.innerHTML = `
      <h2 style="color:var(--gold);">👥 Комнаты</h2>

      <p style="color:var(--text-muted);margin-top:16px;">
        Для использования комнат войдите в аккаунт
        и подтвердите электронную почту.
      </p>

      <p style="margin-top:16px;">
        <a href="account.html"
           class="builder-action-btn">
          👤 Открыть личный кабинет
        </a>
      </p>
    `;

    modal.classList.remove('hidden');
    return;
  }

  if (currentRoomId && currentRoomData) {
    renderRoomPanel(body);
  } else {
    renderRoomsLobby(body);
  }

  modal.classList.remove('hidden');
}

export function closeRoomsModal() {
  rosterPickerOpen = false;
  pickerGeneration += 1;

  document.getElementById('rooms-modal')
    ?.classList.add('hidden');
}

// --------------------------------------------------------------------------
// Присоединение
// --------------------------------------------------------------------------

async function tryJoinByCode(code) {
  if (!currentUser) return;

  const uid = currentUser.uid;
  const email = currentUser.email;

  const modal = document.getElementById('rooms-modal');
  const body = roomBody();

  if (!modal || !body) return;

  modal.classList.remove('hidden');

  body.innerHTML = `
    <h2 style="color:var(--gold);">
      👥 Комната ${escape(code)}
    </h2>

    <p style="color:var(--text-muted);margin-top:12px;">
      Присоединяемся…
    </p>
  `;

  try {
    const reference = doc(db, 'rooms', code);
    const snapshot = await getDoc(reference);

    if (currentUser?.uid !== uid) return;

    if (!snapshot.exists()) {
      renderJoinError(
        body,
        code,
        'Комната не найдена. Возможно, хост закрыл её.'
      );
      return;
    }

    const data = snapshot.data();

    // Уже существующий участник просто открывает комнату.
    // Повторная запись guestId не нужна.
    if (
      data.hostId === uid ||
      data.guestId === uid
    ) {
      await enterRoom(code);
      return;
    }

    if (isLocked(data)) {
      renderJoinError(
        body,
        code,
        'Состав этой партии уже зафиксирован. ' +
        'Присоединиться новым участником нельзя.'
      );
      return;
    }

    if (data.guestId) {
      renderJoinError(
        body,
        code,
        'В комнате уже есть второй игрок. ' +
        'Для другой пары игроков создайте новую комнату.'
      );
      return;
    }

    await updateDoc(reference, {
      guestId: uid,
      guestEmail: email,
      status: 'ready',
      updatedAt: new Date().toISOString(),
      expireAt: nextExpireAt()
    });

    if (currentUser?.uid !== uid) return;

    await enterRoom(code);
  } catch (error) {
    if (currentUser?.uid !== uid) return;

    console.error('tryJoinByCode error:', error);

    renderJoinError(
      body,
      code,
      'Не удалось присоединиться: ' +
      String(error?.message || 'неизвестная ошибка')
    );
  }
}

function renderJoinError(body, code, message) {
  body.innerHTML = `
    <h2 style="color:var(--gold);">
      👥 Комната ${escape(code)}
    </h2>

    <p style="margin-top:16px;color:#ff4757;">
      ${escape(message)}
    </p>

    <button type="button"
            class="builder-action-btn"
            id="btn-back-to-lobby"
            style="margin-top:16px;">
      ← Вернуться в лобби
    </button>
  `;

  body.querySelector('#btn-back-to-lobby')
    ?.addEventListener('click', () => {
      if (currentRoomId && currentRoomData) {
        renderRoomPanel(body);
        return;
      }

      updateURLWithRoom(null);
      renderRoomsLobby(body);
    });
}

async function joinRoom() {
  if (!currentUser) return;

  const input = document.getElementById('room-code-input');
  const code = input?.value.trim().toUpperCase();

  if (!code || !/^[A-Z0-9]{6}$/.test(code)) {
    showRoomMessage(
      'Введите код комнаты из 6 букв и цифр.',
      'err'
    );
    return;
  }

  showRoomMessage('');
  await tryJoinByCode(code);
}

// --------------------------------------------------------------------------
// Лобби
// --------------------------------------------------------------------------

function renderRoomsLobby(body) {
  rosterPickerOpen = false;
  pickerGeneration += 1;

  body.innerHTML = `
    <h2 style="color:var(--gold);">👥 Комнаты</h2>

    <p style="color:var(--text-muted);margin-top:8px;">
      Создайте комнату или присоединитесь по коду.
    </p>

    <div style="margin-top:20px;">
      <button type="button"
              class="builder-action-btn primary"
              id="btn-create-room">
        ✨ Создать комнату
      </button>
    </div>

    <div style="margin-top:24px;">
      <h3 style="color:var(--accent);">
        Присоединиться по коду
      </h3>

      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <input type="text"
               id="room-code-input"
               class="search-input"
               placeholder="ABC123"
               maxlength="6"
               autocomplete="off"
               style="text-transform:uppercase;letter-spacing:2px;">

        <button type="button"
                class="builder-action-btn primary"
                id="btn-join-room">
          🔗 Войти
        </button>
      </div>
    </div>

    <div id="rooms-message" style="margin-top:12px;"></div>
    <div id="rooms-active-list" style="margin-top:24px;"></div>
  `;

  body.querySelector('#btn-create-room')
    ?.addEventListener('click', createRoom);

  body.querySelector('#btn-join-room')
    ?.addEventListener('click', joinRoom);

  const input = body.querySelector('#room-code-input');

  input?.addEventListener('input', () => {
    input.value = input.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
  });

  input?.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      void joinRoom();
    }
  });

  void renderActiveRooms(body);
}

async function renderActiveRooms(body) {
  const container = body.querySelector('#rooms-active-list');
  const uid = currentUser?.uid;

  if (!container || !uid) return;

  container.textContent = 'Проверяем активные комнаты…';

  try {
    const hostQuery = query(
      collection(db, 'rooms'),
      where('hostId', '==', uid)
    );

    const guestQuery = query(
      collection(db, 'rooms'),
      where('guestId', '==', uid)
    );

    const [hostSnapshot, guestSnapshot] = await Promise.all([
      getDocs(hostQuery),
      getDocs(guestQuery)
    ]);

    if (
      currentUser?.uid !== uid ||
      !container.isConnected
    ) {
      return;
    }

    const rooms = new Map();

    hostSnapshot.forEach(record => {
      rooms.set(record.id, {
        ...record.data(),
        id: record.id
      });
    });

    guestSnapshot.forEach(record => {
      rooms.set(record.id, {
        ...record.data(),
        id: record.id
      });
    });

    if (!rooms.size) {
      container.replaceChildren();
      return;
    }

    container.innerHTML = `
      <h3 style="color:var(--accent);">
        Ваши активные комнаты
      </h3>

      ${[...rooms.values()].map(room => `
        <div style="margin-top:8px;padding:12px;
                    border:1px solid var(--border);
                    border-radius:8px;">
          <strong style="letter-spacing:2px;">
            ${escape(room.code || room.id)}
          </strong>

          <p style="font-size:0.85rem;color:var(--text-muted);">
            ${room.hostId === uid ? 'Вы хост' : 'Вы гость'}
            ${isLocked(room) ? ' · состав зафиксирован' : ''}
          </p>

          <button type="button"
                  class="builder-action-btn"
                  data-room-id="${escape(room.id)}">
            Открыть
          </button>
        </div>
      `).join('')}
    `;

    container.querySelectorAll('[data-room-id]')
      .forEach(button => {
        button.addEventListener('click', () => {
          void enterRoom(button.dataset.roomId);
        });
      });
  } catch (error) {
    console.error('renderActiveRooms error:', error);

    if (container.isConnected) {
      container.textContent =
        'Не удалось получить список активных комнат.';
    }
  }
}

// --------------------------------------------------------------------------
// Создание
// --------------------------------------------------------------------------

async function createRoom() {
  if (!currentUser) return;

  const uid = currentUser.uid;
  const email = currentUser.email;

  const button = document.getElementById('btn-create-room');

  if (button?.disabled) return;
  if (button) button.disabled = true;

  showRoomMessage('');

  try {
    let code = null;

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidate = generateCode();
      const existing = await getDoc(
        doc(db, 'rooms', candidate)
      );

      if (currentUser?.uid !== uid) return;

      if (!existing.exists()) {
        code = candidate;
        break;
      }
    }

    if (!code) {
      throw new Error(
        'Не удалось сгенерировать свободный код. Попробуйте ещё раз.'
      );
    }

     // Случайный ID экземпляра, независимый от короткого кода.
    // Создаётся только ссылка: документ в roomInstances не записывается.
    const instanceId = doc(collection(db, 'roomInstances')).id;

    await setDoc(doc(db, 'rooms', code), {
      code,
      instanceId,
      status: 'waiting',
      hostId: uid,
      hostEmail: email,
      hostRoster: null,
      guestId: null,
      guestEmail: null,
      guestRoster: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expireAt: nextExpireAt()
    });

    if (currentUser?.uid !== uid) return;

    await enterRoom(code);
  } catch (error) {
    console.error('createRoom error:', error);

    showRoomMessage(
      'Ошибка создания комнаты: ' +
      String(error?.message || 'неизвестная'),
      'err'
    );
  } finally {
    if (button?.isConnected) button.disabled = false;
  }
}

// --------------------------------------------------------------------------
// Вход и подписка
// --------------------------------------------------------------------------

async function enterRoom(roomId) {
  if (!currentUser) return;

  const body = roomBody();
  if (!body) return;

  stopRoomListener();
  stopRoomSync();
  setSoloMode();

  rosterPickerOpen = false;
  pickerGeneration += 1;

  currentRoomId = roomId;
  currentRoomData = null;
  battleInitDone = false;

  updateURLWithRoom(roomId);
  renderOpponentBadge();

  body.innerHTML = `
    <h2 style="color:var(--gold);">
      👥 Комната ${escape(roomId)}
    </h2>
    <p style="color:var(--text-muted);">Загрузка…</p>
    <div id="rooms-message"></div>
  `;

  const generation = roomGeneration;
  const uid = currentUser.uid;

  unsubscribeSnapshot = onSnapshot(
    doc(db, 'rooms', roomId),

    snapshot => {
      if (
        generation !== roomGeneration ||
        currentUser?.uid !== uid
      ) {
        return;
      }

      if (!snapshot.exists()) {
        resetRoomConnection();
        updateURLWithRoom(null);

        renderRoomsLobby(body);
        showRoomMessage('Комната была закрыта.', 'err');
        return;
      }

      const data = {
        ...snapshot.data(),
        id: snapshot.id
      };

      if (!participantRole(data, uid)) {
        resetRoomConnection();
        updateURLWithRoom(null);

        renderRoomsLobby(body);
        showRoomMessage(
          'Вы больше не участник этой комнаты ' +
          'либо данные участников неоднозначны.',
          'err'
        );
        return;
      }

      currentRoomData = data;

      // Не закрываем выбор ростера при каждом обновлении battleState.
      // Но фиксация состава немедленно закрывает выбор.
      if (!rosterPickerOpen || isLocked(data)) {
        if (rosterPickerOpen) {
          rosterPickerOpen = false;
          pickerGeneration += 1;
        }

        renderRoomPanel(body);
      }

      renderOpponentBadge();
      maybeInitBattleFromRoom();
    },

    error => {
      if (generation !== roomGeneration) return;

      console.error('Room snapshot error:', error);

      stopRoomSync();

      showRoomMessage(
        'Ошибка синхронизации комнаты: ' +
        String(error?.message || 'неизвестная') +
        '. Обновите страницу перед продолжением.',
        'err'
      );
    }
  );
}

// --------------------------------------------------------------------------
// Подготовка существующего боевого дашборда
// --------------------------------------------------------------------------

function packRosterForRoom(roster) {
  const units = (roster.units || []).map((unit, index) => {
    const parsed = parseUnitCard(unit.html || '');

    const artifact = (roster.artifacts || [])
      .find(item => item.targetIdx === index);

    return {
      title: unit.title || '',
      uniqueKey: unit.uniqueKey || unit.title || '',
      role: unit.role || parsed.role || '',
      cost: unit.cost || parsed.cost || 0,
      html: unit.html || '',
      maxHp: parsed.hp || 6,
      artifactId: artifact ? artifact.id : null,
      artifactName: artifact
        ? artifact.name || artifact.id
        : null,
      artifactCost: artifact ? artifact.cost || 0 : 0,
      artifactDescription: artifact
        ? artifact.description || ''
        : '',
      artifactEffect: artifact ? artifact.effect || '' : ''
    };
  });

  const totalCost = roster.totalCost ||
    units.reduce((sum, unit) => sum + (unit.cost || 0), 0);

  const artifactsCost = (roster.artifacts || [])
    .reduce((sum, artifact) => sum + (artifact.cost || 0), 0);

  return {
    name: roster.name || 'Без имени',
    clan: roster.clan || '',
    totalCost,
    totalUnits: units.length,
    artifactsCost,
    units
  };
}

function maybeInitBattleFromRoom() {
  const room = currentRoomData;
  const role = participantRole(room);

  if (!room || !role) return;

  const myRoster = role === 'host'
    ? room.hostRoster
    : room.guestRoster;

  if (!myRoster || !Array.isArray(myRoster.units)) return;

  const roomId = room.id || room.code;

  if (
    battleInitDone &&
    gameStateBelongsToRoom(roomId, myRoster)
  ) {
    return;
  }

  const units = myRoster.units.map(unit => {
    const maxHp = unit.maxHp || 6;

    return {
      title: unit.title,
      uniqueKey: unit.uniqueKey,
      role: unit.role,
      cost: unit.cost,
      html: unit.html ||
        `<div style="padding:10px;">
          ${escape(unit.title)}
          <em>(карточка недоступна)</em>
        </div>`,
      currentHp: maxHp,
      maxHp,
      statuses: [],
      activated: false,
      artifact: unit.artifactId
        ? {
            id: unit.artifactId,
            name: unit.artifactName || unit.artifactId,
            cost: unit.artifactCost || 0,
            description: unit.artifactDescription || '',
            effect: unit.artifactEffect || ''
          }
        : null
    };
  });

  const newState = {
    name: myRoster.name,
    clan: myRoster.clan,
    round: gameState?.round || 1,
    vpOwn: 0,
    vpOpp: 0,
    opponentUnits: [],
    opponentName: '',
    opponentRosterName: '',
    opponentRosterClan: '',
    battleLog: [],
    mage: 0,
    faith: 0,
    mageCap: 6,
    faithCap: 6,
    units
  };

  // Существующая подготовка ресурсов сохранена без изменений.
  const mages = units.filter(
    unit => (unit.html || '').includes('role-mage')
  ).length;

  const priests = units.filter(
    unit => (unit.html || '').includes('role-priest')
  ).length;

  newState.mage = Math.min(6, mages * 2);
  newState.faith = Math.min(6, priests * 2);

  replaceGameState(newState);
  setRoomMode(roomId, role);
  startRoomSync(roomId, role);

  battleInitDone = true;

  const generation = roomGeneration;

  import('./render.js')
    .then(module => {
      if (
        generation === roomGeneration &&
        currentRoomId === roomId
      ) {
        module.renderDashboard();
      }
    })
    .catch(error => {
      console.error('Room dashboard render:', error);
    });
}

function gameStateBelongsToRoom(roomId, myRoster) {
  if (!gameState) return false;
  if (activeRoomId && activeRoomId !== roomId) return false;
  if (gameState.name !== myRoster.name) return false;

  return (gameState.units?.length || 0) ===
    (myRoster.units?.length || 0);
}

// --------------------------------------------------------------------------
// Панель комнаты
// --------------------------------------------------------------------------

function renderRoomPanel(body) {
  const room = currentRoomData;
  const role = participantRole(room);

  if (!room || !role) {
    body.innerHTML = `
      <p style="color:var(--text-muted);">
        Комната недоступна.
      </p>
    `;
    return;
  }

  const host = role === 'host';
  const locked = isLocked(room);

  const myRoster = host ? room.hostRoster : room.guestRoster;
  const opponentRoster = host ? room.guestRoster : room.hostRoster;
  const opponentEmail = host ? room.guestEmail : room.hostEmail;

  const code = room.code || room.id;
  const shareURL = buildRoomShareURL(code);
  const qrURL = buildQRImageURL(shareURL);

  const tableURL = new URL(
    'virtual-table.html',
    window.location.href
  );

  tableURL.searchParams.set('room', code);

  body.innerHTML = `
    <h2 style="color:var(--gold);">
      👥 Комната
    </h2>

    <div style="margin-top:16px;display:flex;gap:20px;
                flex-wrap:wrap;align-items:flex-start;">
      <div style="flex:1;min-width:200px;">
        <div style="color:var(--text-muted);">Код комнаты:</div>

        <div style="font-size:2rem;font-weight:800;
                    letter-spacing:6px;color:var(--accent);
                    font-family:monospace;">
          ${escape(code)}
        </div>

        <div style="display:flex;gap:8px;margin-top:10px;
                    flex-wrap:wrap;">
          <button type="button"
                  class="builder-action-btn"
                  id="btn-copy-code">
            📋 Скопировать код
          </button>

          <button type="button"
                  class="builder-action-btn"
                  id="btn-copy-link">
            🔗 Скопировать ссылку
          </button>
        </div>
      </div>

      <div style="text-align:center;">
        <p style="color:var(--text-muted);font-size:0.85rem;">
          QR для открытия комнаты
        </p>

        <img id="room-qr"
             src="${escape(qrURL)}"
             alt="QR-код комнаты"
             width="180"
             height="180"
             style="background:#fff;padding:6px;
                    border-radius:10px;">

        <p id="room-qr-fallback"
           hidden
           style="color:var(--text-muted);">
          QR не загрузился. Введите код вручную:
          <strong>${escape(code)}</strong>
        </p>
      </div>
    </div>

    <div style="margin-top:16px;padding:12px;
                border:1px solid var(--border);
                border-radius:8px;">
      <div>
        <strong>Вы:</strong>
        ${escape(currentUser?.email || '—')}
        ${host ? '(хост)' : '(гость)'}
      </div>

      <div style="margin-top:4px;">
        <strong>${host ? 'Гость' : 'Хост'}:</strong>
        ${opponentEmail
          ? escape(opponentEmail)
          : 'ещё не присоединился'}
      </div>
    </div>

    ${locked ? `
      <section style="margin-top:16px;padding:12px;
                      background:rgba(209,179,132,0.1);
                      border:1px solid var(--gold);
                      border-radius:8px;"
               aria-label="Фиксация состава партии">
        <strong style="color:var(--gold);">
          🔒 Состав партии зафиксирован
        </strong>

        <p style="margin:8px 0 0;font-size:0.9rem;">
          ${escape(LOCK_MESSAGE)}
        </p>

        <p style="margin:8px 0 0;font-size:0.85rem;
                  color:var(--text-muted);">
          Перемещения и онлайн-броски доступны.
          Выход из аккаунта не освобождает место в комнате.
        </p>
      </section>
    ` : `
      <p style="margin-top:16px;color:var(--text-muted);
                font-size:0.85rem;">
        До первого размещения можно менять свой ростер.
        Первая расстановка фиксирует оба ростера
        и состав участников.
      </p>
    `}

    <div id="rooms-message" style="margin-top:12px;"></div>

    <div style="margin-top:16px;">
      <a class="builder-action-btn"
         href="${escape(tableURL.href)}">
        Открыть виртуальный стол
      </a>

      <p style="margin:8px 0 0;color:var(--text-muted);
                font-size:0.8rem;">
        Общие позиции и онлайн-броски видны обоим участникам.
        ХП и состояния моделей на поле пока не подключены.
      </p>
    </div>

    <h3 style="color:var(--accent);margin-top:24px;">
      Ваш ростер
    </h3>

    <div id="my-roster-panel"></div>

    <h3 style="color:var(--accent);margin-top:24px;">
      Ростер оппонента
    </h3>

    <div id="opp-roster-panel"></div>

    <div style="margin-top:24px;display:flex;gap:10px;
                flex-wrap:wrap;">
      <button type="button"
              class="builder-action-btn primary"
              id="btn-select-my-roster"
              ${locked || rosterWriteBusy ? 'disabled' : ''}>
        ${locked ? '🔒 Ростер зафиксирован' : '📂 Выбрать мой ростер'}
      </button>

      <button type="button"
              class="builder-action-btn"
              id="btn-leave-room"
              ${leaveBusy || (!host && locked) ? 'disabled' : ''}>
        ${host
          ? 'Закрыть комнату для обоих'
          : locked
            ? '🔒 Место гостя закреплено'
            : '🚪 Выйти из комнаты'}
      </button>
    </div>
  `;

  const qr = body.querySelector('#room-qr');

  qr?.addEventListener('error', () => {
    qr.hidden = true;

    const fallback = body.querySelector('#room-qr-fallback');
    if (fallback) fallback.hidden = false;
  });

  body.querySelector('#btn-copy-code')
    ?.addEventListener('click', async () => {
      const ok = await copyToClipboard(code);

      showRoomMessage(
        ok
          ? 'Код скопирован.'
          : 'Не удалось скопировать. Код: ' + code,
        ok ? 'ok' : 'err'
      );
    });

  body.querySelector('#btn-copy-link')
    ?.addEventListener('click', async () => {
      const ok = await copyToClipboard(shareURL);

      showRoomMessage(
        ok ? 'Ссылка скопирована.' : 'Не удалось скопировать ссылку.',
        ok ? 'ok' : 'err'
      );
    });

  body.querySelector('#btn-select-my-roster')
    ?.addEventListener('click', openRosterPicker);

  body.querySelector('#btn-leave-room')
    ?.addEventListener('click', leaveRoom);

  renderRosterPanel(
    body.querySelector('#my-roster-panel'),
    myRoster,
    'mine'
  );

  renderRosterPanel(
    body.querySelector('#opp-roster-panel'),
    opponentRoster,
    'opponent'
  );
}

function renderRosterPanel(container, roster, kind) {
  if (!container) return;

  if (!roster) {
    container.innerHTML = `
      <p style="padding:16px;color:var(--text-muted);
                border:1px dashed var(--border);
                border-radius:8px;">
        ${kind === 'mine'
          ? 'Вы ещё не выбрали ростер'
          : 'Оппонент ещё не выбрал ростер'}
      </p>
    `;
    return;
  }

  const units = Array.isArray(roster.units) ? roster.units : [];

  const totalCost = roster.totalCost ||
    units.reduce((sum, unit) => sum + (unit.cost || 0), 0);

  container.innerHTML = `
    <section style="padding:14px;border:1px solid var(--border);
                    border-radius:8px;">
      <strong>${escape(roster.name || 'Без имени')}</strong>

      <p style="font-size:0.85rem;color:var(--text-muted);">
        ${escape(roster.clan || 'Армия')} ·
        ${units.length} моделей ·
        ${escape(totalCost)} очков
        ${roster.artifactsCost
          ? ' · артефакты: ' + escape(roster.artifactsCost)
          : ''}
      </p>

      ${units.map((unit, index) => `
        <div style="margin-top:6px;padding:6px 10px;
                    background:rgba(255,255,255,0.02);
                    border-radius:6px;font-size:0.85rem;">
          #${index + 1} ·
          <strong>
            ${escape(unit.uniqueKey || unit.title || '—')}
          </strong>

          ${unit.artifactId ? `
            <span style="color:var(--gold);">
              🎁 ${escape(unit.artifactName || 'Артефакт')}
            </span>
          ` : ''}

          <div style="color:var(--text-muted);margin-top:3px;">
            ${escape(unit.role || '')} ·
            ${escape(unit.cost || 0)} очков
          </div>
        </div>
      `).join('')}
    </section>
  `;
}

// --------------------------------------------------------------------------
// Выбор ростера
// --------------------------------------------------------------------------

function closeRosterPicker() {
  rosterPickerOpen = false;
  pickerGeneration += 1;

  const body = roomBody();

  if (body) renderRoomPanel(body);
}

async function openRosterPicker() {
  if (!currentUser || !currentRoomId || rosterWriteBusy) return;

  if (isLocked()) {
    showRoomMessage(LOCK_MESSAGE);
    return;
  }

  if (!participantRole(currentRoomData)) return;

  const body = roomBody();
  if (!body) return;

  const uid = currentUser.uid;
  const roomId = currentRoomId;
  const generation = ++pickerGeneration;

  rosterPickerOpen = true;

  body.innerHTML = `
    <h2 style="color:var(--gold);">📂 Выбрать ростер</h2>
    <p style="color:var(--text-muted);">
      Загрузка ваших сохранённых ростеров…
    </p>
    <button type="button"
            class="builder-action-btn"
            id="btn-picker-back">
      ← Назад
    </button>
    <div id="rooms-message" style="margin-top:12px;"></div>
  `;

  body.querySelector('#btn-picker-back')
    ?.addEventListener('click', closeRosterPicker);

  try {
    const rosters = await getUserRosters(uid);

    if (
      generation !== pickerGeneration ||
      !rosterPickerOpen ||
      currentUser?.uid !== uid ||
      currentRoomId !== roomId
    ) {
      return;
    }

    if (isLocked()) {
      closeRosterPicker();
      showRoomMessage(LOCK_MESSAGE);
      return;
    }

    const choices = Array.isArray(rosters) ? rosters : [];

    body.innerHTML = `
      <h2 style="color:var(--gold);">📂 Выбрать ростер</h2>

      <p style="color:var(--text-muted);">
        ${choices.length
          ? 'Выберите ростер для этой комнаты.'
          : 'Сохранённых ростеров нет. Сохраните ростер в билдере.'}
      </p>

      <div style="margin-top:16px;">
        ${choices.map(roster => `
          <div style="margin-top:8px;padding:12px;
                      border:1px solid var(--border);
                      border-radius:8px;">
            <strong>${escape(roster.name || 'Без имени')}</strong>

            <p style="font-size:0.85rem;color:var(--text-muted);">
              ${escape(roster.clan || 'Армия')} ·
              ${roster.units?.length || 0} моделей ·
              ${escape(
                roster.totalCost ||
                (roster.units || []).reduce(
                  (sum, unit) => sum + (unit.cost || 0),
                  0
                )
              )} очков
            </p>

            <button type="button"
                    class="builder-action-btn primary"
                    data-roster-id="${escape(roster.id)}">
              Выбрать
            </button>
          </div>
        `).join('')}
      </div>

      <button type="button"
              class="builder-action-btn"
              id="btn-picker-back"
              style="margin-top:16px;">
        ← Назад
      </button>

      <div id="rooms-message" style="margin-top:12px;"></div>
    `;

    body.querySelector('#btn-picker-back')
      ?.addEventListener('click', closeRosterPicker);

    body.querySelectorAll('[data-roster-id]')
      .forEach(button => {
        button.addEventListener('click', () => {
          void selectRosterForRoom(
            button.dataset.rosterId,
            choices,
            roomId,
            uid
          );
        });
      });
  } catch (error) {
    if (generation !== pickerGeneration) return;

    console.error('openRosterPicker error:', error);

    showRoomMessage(
      'Ошибка загрузки ростеров: ' +
      String(error?.message || 'неизвестная'),
      'err'
    );
  }
}

async function selectRosterForRoom(
  rosterId,
  allRosters,
  roomId,
  uid
) {
  if (
    rosterWriteBusy ||
    currentRoomId !== roomId ||
    currentUser?.uid !== uid
  ) {
    return;
  }

  if (isLocked()) {
    closeRosterPicker();
    showRoomMessage(LOCK_MESSAGE);
    return;
  }

  const selected = allRosters.find(
    roster => String(roster.id) === String(rosterId)
  );

  if (!selected) return;

  rosterWriteBusy = true;

  roomBody()?.querySelectorAll('[data-roster-id]')
    .forEach(button => {
      button.disabled = true;
    });

  try {
    // Проверяем актуальный документ, а не старый выбор стороны.
    // При гонке окончательное решение остаётся за Firebase Rules.
    const reference = doc(db, 'rooms', roomId);
    const snapshot = await getDoc(reference);

    if (
      currentRoomId !== roomId ||
      currentUser?.uid !== uid
    ) {
      return;
    }

    if (!snapshot.exists()) {
      throw new Error('Комната удалена.');
    }

    const room = snapshot.data();
    const role = participantRole(room, uid);

    if (!role) {
      throw new Error('Вы не участник этой комнаты.');
    }

    if (isLocked(room)) {
      throw new Error(LOCK_MESSAGE);
    }

    const packed = packRosterForRoom(selected);

    const update = {
      updatedAt: new Date().toISOString(),
      expireAt: nextExpireAt(),
      [role === 'host' ? 'hostRoster' : 'guestRoster']: packed
    };

    await updateDoc(reference, update);

    if (
      currentRoomId !== roomId ||
      currentUser?.uid !== uid
    ) {
      return;
    }

    rosterWriteBusy = false;
    closeRosterPicker();

    showRoomMessage('Ростер выбран.', 'ok');
  } catch (error) {
    console.error('selectRosterForRoom error:', error);

    if (
      currentRoomId === roomId &&
      currentUser?.uid === uid
    ) {
      showRoomMessage(
        error.code === 'permission-denied'
          ? 'Изменение отклонено Firebase. Возможно, ' +
            'состав партии уже зафиксирован или доступ изменился. ' +
            'Вернитесь к панели комнаты и проверьте её состояние.'
          : String(error?.message || 'Не удалось выбрать ростер.'),
        'err'
      );
    }
  } finally {
    rosterWriteBusy = false;

    roomBody()?.querySelectorAll('[data-roster-id]')
      .forEach(button => {
        button.disabled = isLocked();
      });
  }
}

// --------------------------------------------------------------------------
// Выход / закрытие комнаты
// --------------------------------------------------------------------------

async function leaveRoom() {
  if (!currentRoomId || !currentUser || leaveBusy) return;

  const roomId = currentRoomId;
  const uid = currentUser.uid;
  const role = participantRole(currentRoomData, uid);

  if (!role) return;

  if (role === 'guest' && isLocked()) {
    showRoomMessage(LOCK_MESSAGE);
    return;
  }

  const confirmed = confirm(
    role === 'host'
      ? 'Закрыть комнату для обоих игроков?\n\n' +
        'Документ комнаты будет удалён. ' +
        'Оба игрока потеряют доступ к её столу.\n\n' +
        'Подколлекции позиций и бросков автоматически не удаляются.'
      : 'Выйти из комнаты и освободить место гостя?'
  );

  if (!confirmed) return;

  leaveBusy = true;

  try {
    const reference = doc(db, 'rooms', roomId);
    const snapshot = await getDoc(reference);

    if (
      currentRoomId !== roomId ||
      currentUser?.uid !== uid
    ) {
      return;
    }

    if (snapshot.exists()) {
      const room = snapshot.data();
      const actualRole = participantRole(room, uid);

      if (!actualRole) {
        throw new Error('Состав участников изменился.');
      }

      if (actualRole === 'host') {
        await deleteDoc(reference);
      } else {
        if (isLocked(room)) {
          throw new Error(LOCK_MESSAGE);
        }

        await updateDoc(reference, {
          guestId: null,
          guestEmail: null,
          guestRoster: null,
          status: 'waiting',
          updatedAt: new Date().toISOString(),
          expireAt: nextExpireAt()
        });
      }
    }

    // Подписка могла уже обработать успешное удаление/выход.
    // Не отключаем другую комнату, если пользователь успел её открыть.
    if (
      currentUser?.uid !== uid ||
      (currentRoomId && currentRoomId !== roomId)
    ) {
      return;
    }

    if (currentRoomId === roomId) {
      resetRoomConnection();
    }

    updateURLWithRoom(null);

    const body = roomBody();

    if (body) {
      renderRoomsLobby(body);

      showRoomMessage(
        role === 'host'
          ? 'Комната закрыта.'
          : 'Вы вышли из комнаты.',
        'ok'
      );
    }
  } catch (error) {
    console.error('leaveRoom error:', error);

    // При отказе сохраняем подключение и синхронизацию.
    if (
      currentRoomId === roomId &&
      currentUser?.uid === uid
    ) {
      showRoomMessage(
        error.code === 'permission-denied'
          ? 'Выход отклонён Firebase. Возможно, состав партии ' +
            'уже зафиксирован. Подключение к комнате сохранено.'
          : String(error?.message || 'Не удалось выйти из комнаты.'),
        'err'
      );
    }
  } finally {
    leaveBusy = false;
  }
}

// --------------------------------------------------------------------------
// Индикатор комнаты в шапке
// --------------------------------------------------------------------------

export function renderOpponentBadge() {
  let badge = document.getElementById('room-badge');

  const room = currentRoomData;
  const role = participantRole(room);

  if (!currentRoomId || !room || !role) {
    badge?.remove();
    return;
  }

  const host = role === 'host';
  const locked = isLocked(room);

  const opponentEmail = host
    ? room.guestEmail
    : room.hostEmail;

  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'room-badge';

    badge.style.cssText = `
      display:flex;
      align-items:center;
      gap:10px;
      padding:8px 12px;
      margin-bottom:12px;
      background:rgba(108,92,231,0.12);
      border:1px solid var(--accent);
      border-radius:10px;
      font-size:0.9rem;
      flex-wrap:wrap;
    `;

    const header = document.querySelector('.dash-header');

    if (header?.parentNode) {
      header.parentNode.insertBefore(
        badge,
        header.nextSibling
      );
    }
  }

  badge.innerHTML = `
    <span style="color:var(--accent);font-weight:700;">
      👥 Комната ${escape(room.code || room.id)}
    </span>

    <span>
      Оппонент:
      ${opponentEmail
        ? `<strong>${escape(opponentEmail)}</strong>`
        : 'ожидание участника'}
    </span>

    ${locked ? `
      <span style="color:var(--gold);">
        🔒 Состав зафиксирован
      </span>
    ` : ''}

    <button type="button"
            class="builder-action-btn"
            id="btn-open-room-badge"
            style="padding:4px 10px;margin-left:auto;">
      Комната
    </button>

    <button type="button"
            class="builder-action-btn"
            id="btn-leave-room-badge"
            style="padding:4px 10px;"
            ${!host && locked ? 'disabled' : ''}>
      ${host
        ? 'Закрыть комнату'
        : locked
          ? 'Место закреплено'
          : 'Выйти из комнаты'}
    </button>
  `;

  badge.querySelector('#btn-open-room-badge')
    ?.addEventListener('click', openRoomsModal);

  badge.querySelector('#btn-leave-room-badge')
    ?.addEventListener('click', leaveRoom);
}