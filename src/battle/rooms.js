// src/battle/rooms.js
//
// Система комнат для двух игроков.
// Хост создаёт комнату с кодом → гость присоединяется по коду или QR.
// Комнаты автоматически удаляются через 6 часов через Firestore TTL.

import { db, auth, getUserRosters } from '../core/firebase.js';
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
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { escapeHtml } from '../utils/escape.js';
import { parseUnitCard } from '../utils/unit-parser.js';
import { setRoomMode, setSoloMode, replaceGameState, gameState, activeRoomId } from './state.js';
import { startRoomSync, stopRoomSync } from './room-sync.js';

// --- Внутреннее состояние ---
let currentUser = null;
let currentRoomId = null;
let currentRoomData = null;
let unsubscribeSnapshot = null;
let pendingRoomFromURL = null;
let battleInitDone = false;

const ROOM_TTL_HOURS = 6;

// --- Инициализация ---
export function initRooms() {
  const params = new URLSearchParams(window.location.search);
  const roomFromURL = params.get('room');
  if (roomFromURL && /^[A-Z0-9]{6}$/i.test(roomFromURL)) {
    pendingRoomFromURL = roomFromURL.toUpperCase();
  }

  onAuthStateChanged(auth, (user) => {
    currentUser = (user && user.emailVerified) ? user : null;

    const btn = document.getElementById('btn-rooms');
    if (btn) {
      btn.disabled = false;
      btn.title = currentUser ? '' : 'Войдите в аккаунт, чтобы использовать комнаты';
    }

    if (currentUser && pendingRoomFromURL) {
      const code = pendingRoomFromURL;
      pendingRoomFromURL = null;
      setTimeout(() => tryJoinByCode(code), 300);
    }
  });

  const btnOpen = document.getElementById('btn-rooms');
  if (btnOpen) btnOpen.addEventListener('click', openRoomsModal);
}

// --- Утилиты ---
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function nextExpireAt() {
  return Timestamp.fromDate(new Date(Date.now() + ROOM_TTL_HOURS * 60 * 60 * 1000));
}

function showRoomMessage(text, type = 'info') {
  const el = document.getElementById('rooms-message');
  if (!el) return;
  if (!text) { el.innerHTML = ''; return; }
  const colors = {
    ok: { bg: 'rgba(46,213,115,0.12)', border: '#2ed573', color: '#2ed573' },
    err: { bg: 'rgba(255,71,87,0.12)', border: '#ff4757', color: '#ff4757' },
    info: { bg: 'rgba(108,92,231,0.12)', border: '#6c5ce7', color: '#a29bfe' }
  };
  const c = colors[type] || colors.info;
  el.innerHTML = `<div style="background:${c.bg}; border:1px solid ${c.border}; color:${c.color}; padding:8px 12px; border-radius:6px; font-size:0.9rem;">${escapeHtml(text)}</div>`;
}

function buildRoomShareURL(code) {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('room', code);
  return url.toString();
}

function buildQRImageURL(data) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(data)}`;
}

function packRosterForRoom(roster) {
  const units = (roster.units || []).map((u, idx) => {
    const parsed = parseUnitCard(u.html || '');
    // Ищем артефакт, привязанный к этому юниту
    const artifact = (roster.artifacts || []).find(a => a.targetIdx === idx);
    return {
      title: u.title || '',
      uniqueKey: u.uniqueKey || u.title || '',
      role: u.role || parsed.role || '',
      cost: u.cost || parsed.cost || 0,
      html: u.html || '',
      maxHp: parsed.hp || 6,
      artifactId: artifact ? artifact.id : null
    };
  });

  const totalCost = roster.totalCost || units.reduce((s, u) => s + (u.cost || 0), 0);
  const artifactsCost = (roster.artifacts || []).reduce((sum, a) => sum + (a.cost || 0), 0);

  return {
    name: roster.name || 'Без имени',
    clan: roster.clan || '',
    totalCost,
    totalUnits: units.length,
    artifactsCost,
    units
  };
}

/**
 * Обновляет URL — добавляет или удаляет ?room=CODE.
 */
function updateURLWithRoom(code) {
  const url = new URL(window.location.href);
  if (code) {
    url.searchParams.set('room', code);
  } else {
    url.searchParams.delete('room');
  }
  window.history.replaceState({}, '', url.toString());
}

// --- Открытие модалки ---
export async function openRoomsModal() {
  const modal = document.getElementById('rooms-modal');
  const body = document.getElementById('rooms-modal-body');
  if (!modal || !body) return;

  if (!currentUser) {
    body.innerHTML = `
      <h2 style="color:var(--gold); border-bottom:2px solid var(--border); padding-bottom:8px;">👥 Комнаты</h2>
      <p style="color:var(--text-muted); margin-top:16px;">
        Для использования комнат нужно войти в аккаунт. Комнаты позволяют двум игрокам видеть ростеры друг друга в реальном времени.
      </p>
      <p style="margin-top:16px;">
        <a href="account.html" class="builder-action-btn" style="text-decoration:none;">👤 Войти в аккаунт</a>
      </p>
    `;
    modal.classList.remove('hidden');
    return;
  }

  if (currentRoomId && currentRoomData) {
    renderRoomPanel(body);
    modal.classList.remove('hidden');
    return;
  }

  renderRoomsLobby(body);
  modal.classList.remove('hidden');
}

// --- Автоприсоединение ---
async function tryJoinByCode(code) {
  if (!currentUser) return;

  const modal = document.getElementById('rooms-modal');
  const body = document.getElementById('rooms-modal-body');
  if (!modal || !body) return;

  modal.classList.remove('hidden');
  body.innerHTML = `
    <h2 style="color:var(--gold); border-bottom:2px solid var(--border); padding-bottom:8px;">👥 Комната ${escapeHtml(code)}</h2>
    <p style="color:var(--text-muted); margin-top:12px;">Присоединяемся…</p>
  `;

  try {
    const roomRef = doc(db, 'rooms', code);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) {
      renderJoinError(body, code, 'Комната с таким кодом не найдена. Возможно, хост закрыл её или код устарел.');
      return;
    }

    const data = roomSnap.data();

    if (data.hostId === currentUser.uid) {
      await enterRoom(code);
      return;
    }

    if (data.guestId && data.guestId !== currentUser.uid) {
      renderJoinError(body, code, 'В этой комнате уже есть второй игрок. Если это ошибка — попросите хоста создать новую комнату.');
      return;
    }

    await updateDoc(roomRef, {
      guestId: currentUser.uid,
      guestEmail: currentUser.email,
      status: 'ready',
      updatedAt: new Date().toISOString(),
      expireAt: nextExpireAt()
    });

    await enterRoom(code);
  } catch (err) {
    console.error('tryJoinByCode error:', err);
    renderJoinError(body, code, 'Ошибка присоединения: ' + (err?.message || 'неизвестная'));
  }
}

function renderJoinError(body, code, message) {
  body.innerHTML = `
    <h2 style="color:var(--gold); border-bottom:2px solid var(--border); padding-bottom:8px;">👥 Комната ${escapeHtml(code)}</h2>
    <div style="margin-top:16px; background:rgba(255,71,87,0.12); border:1px solid #ff4757; color:#ff4757; padding:12px; border-radius:6px;">
      ${escapeHtml(message)}
    </div>
    <button class="builder-action-btn" id="btn-back-to-lobby" style="margin-top:16px;">← Вернуться в лобби</button>
  `;
  body.querySelector('#btn-back-to-lobby')?.addEventListener('click', () => {
    battleInitDone = false;
    updateURLWithRoom(null);
    renderRoomsLobby(body);
  });
}

// --- Лобби ---
function renderRoomsLobby(body) {
  body.innerHTML = `
    <h2 style="color:var(--gold); border-bottom:2px solid var(--border); padding-bottom:8px;">👥 Комнаты</h2>
    <p style="color:var(--text-muted); margin-top:8px; font-size:0.9rem;">
      Создайте комнату или присоединитесь по коду. Оба игрока увидят ростеры друг друга.
    </p>

    <div style="margin-top:20px; display:flex; gap:12px; flex-wrap:wrap;">
      <button class="builder-action-btn primary" id="btn-create-room" style="flex:1; min-width:150px;">✨ Создать комнату</button>
    </div>

    <div style="margin-top:24px; padding-top:20px; border-top:1px solid var(--border);">
      <h3 style="color:var(--accent); font-size:1rem; margin-bottom:10px;">Присоединиться по коду</h3>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <input type="text" id="room-code-input" class="search-input" placeholder="ABC123" maxlength="6" style="flex:1; min-width:150px; text-transform:uppercase; letter-spacing:2px; font-weight:700; text-align:center; font-size:1.1rem;">
        <button class="builder-action-btn primary" id="btn-join-room" style="min-width:150px;">🔗 Войти</button>
      </div>
    </div>

    <div id="rooms-message" style="margin-top:12px;"></div>

    <div id="rooms-active-list" style="margin-top:24px;"></div>
  `;

  body.querySelector('#btn-create-room')?.addEventListener('click', createRoom);
  body.querySelector('#btn-join-room')?.addEventListener('click', joinRoom);

  const codeInput = body.querySelector('#room-code-input');
  if (codeInput) {
    codeInput.addEventListener('input', () => {
      codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });
    codeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') joinRoom();
    });
  }

  renderActiveRooms(body);
}

async function renderActiveRooms(body) {
  const container = body.querySelector('#rooms-active-list');
  if (!container) return;

  container.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem;">Проверяем активные комнаты…</p>';

  try {
    const hostQuery = query(collection(db, 'rooms'), where('hostId', '==', currentUser.uid));
    const guestQuery = query(collection(db, 'rooms'), where('guestId', '==', currentUser.uid));

    const [hostSnap, guestSnap] = await Promise.all([getDocs(hostQuery), getDocs(guestQuery)]);

    const rooms = [];
    hostSnap.forEach(d => rooms.push({ id: d.id, ...d.data() }));
    guestSnap.forEach(d => {
      if (!rooms.find(r => r.id === d.id)) rooms.push({ id: d.id, ...d.data() });
    });

    if (rooms.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = `
      <h3 style="color:var(--accent); font-size:1rem; margin-bottom:10px;">Ваши активные комнаты</h3>
      <div style="display:flex; flex-direction:column; gap:8px;">
        ${rooms.map(r => `
          <div style="background: rgba(255,255,255,0.02); border:1px solid var(--border); padding:12px 14px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
            <div>
              <strong style="color:#fff; letter-spacing:2px;">${escapeHtml(r.code || r.id)}</strong>
              <div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">
                ${r.hostId === currentUser.uid ? 'Вы хост' : 'Вы гость'}
                ${r.hostRoster ? ' • хост выбрал ростер' : ' • хост не выбрал ростер'}
                ${r.guestRoster ? ' • гость выбрал ростер' : ''}
              </div>
            </div>
            <button class="builder-action-btn primary" data-room-id="${r.id}" style="padding:6px 12px; font-size:0.85rem;">Открыть</button>
          </div>
        `).join('')}
      </div>
    `;

    container.querySelectorAll('button[data-room-id]').forEach(btn => {
      btn.addEventListener('click', () => enterRoom(btn.dataset.roomId));
    });
  } catch (err) {
    console.error('renderActiveRooms error:', err);
    container.innerHTML = '';
  }
}

// --- Создание комнаты ---
async function createRoom() {
  if (!currentUser) return;
  showRoomMessage('');

  try {
    let code;
    let attempts = 0;
    while (attempts < 10) {
      code = generateCode();
      const existing = await getDoc(doc(db, 'rooms', code));
      if (!existing.exists()) break;
      attempts++;
    }
    if (attempts >= 10) {
      showRoomMessage('Не удалось сгенерировать уникальный код. Попробуйте ещё раз.', 'err');
      return;
    }

    const roomRef = doc(db, 'rooms', code);
    await setDoc(roomRef, {
      code,
      status: 'waiting',
      hostId: currentUser.uid,
      hostEmail: currentUser.email,
      hostRoster: null,
      guestId: null,
      guestEmail: null,
      guestRoster: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expireAt: nextExpireAt()
    });

    await enterRoom(code);
  } catch (err) {
    console.error('createRoom error:', err);
    showRoomMessage('Ошибка создания комнаты: ' + (err?.message || 'неизвестная'), 'err');
  }
}

// --- Присоединение ---
async function joinRoom() {
  if (!currentUser) return;
  const input = document.getElementById('room-code-input');
  const code = input?.value.trim().toUpperCase();
  if (!code || code.length !== 6) {
    showRoomMessage('Введите 6-значный код комнаты.', 'err');
    return;
  }
  showRoomMessage('');
  await tryJoinByCode(code);
}

// --- Вход ---
async function enterRoom(roomId) {
  currentRoomId = roomId;
  battleInitDone = false;
  updateURLWithRoom(roomId);
  renderOpponentBadge();

  const body = document.getElementById('rooms-modal-body');
  body.innerHTML = `<h2 style="color:var(--gold);">👥 Комната ${escapeHtml(roomId)}</h2><p style="color:var(--text-muted); margin-top:12px;">Загрузка…</p>`;

  if (unsubscribeSnapshot) {
    unsubscribeSnapshot();
    unsubscribeSnapshot = null;
  }

  const roomRef = doc(db, 'rooms', roomId);

  unsubscribeSnapshot = onSnapshot(roomRef, (snap) => {
    if (!snap.exists()) {
      showRoomMessage('Комната была закрыта.', 'err');
      currentRoomId = null;
      currentRoomData = null;
      battleInitDone = false;
      stopRoomSync();
      setSoloMode();
      updateURLWithRoom(null);
      renderOpponentBadge();
      renderRoomsLobby(body);
      return;
    }
    currentRoomData = { id: snap.id, ...snap.data() };
    renderRoomPanel(body);
    renderOpponentBadge();
    maybeInitBattleFromRoom();
  }, (err) => {
    console.error('onSnapshot error:', err);
    showRoomMessage('Ошибка синхронизации: ' + (err?.message || 'неизвестная'), 'err');
  });
}

function maybeInitBattleFromRoom() {
  if (!currentRoomData) return;

  const room = currentRoomData;
  const isHost = room.hostId === currentUser?.uid;
  const myRoster = isHost ? room.hostRoster : room.guestRoster;

  if (!myRoster || !Array.isArray(myRoster.units)) return;

  const role = isHost ? 'host' : 'guest';
  const roomId = room.id || room.code;

  if (battleInitDone && gameStateBelongsToRoom(roomId, myRoster)) {
    return;
  }

  const units = myRoster.units.map(u => {
    const maxHp = u.maxHp || 6;
    return {
      title: u.title,
      uniqueKey: u.uniqueKey,
      role: u.role,
      cost: u.cost,
      html: u.html || `<div style="padding:10px; background:rgba(0,0,0,0.2); border-radius:8px; font-size:0.9rem; color:var(--text-muted);">${escapeHtml(u.title)} <em>(карточка недоступна)</em></div>`,
      currentHp: maxHp,
      maxHp: maxHp,
      statuses: [],
      activated: false
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

  // Стартовые ресурсы по числу Магов/Жрецов
  const mages = units.filter(u => (u.html || '').includes('role-mage')).length;
  const priests = units.filter(u => (u.html || '').includes('role-priest')).length;
  newState.mage = Math.min(6, mages * 2);
  newState.faith = Math.min(6, priests * 2);

  replaceGameState(newState);
  setRoomMode(roomId, role);
  startRoomSync(roomId, role);

  battleInitDone = true;

  import('./render.js').then(m => m.renderDashboard());
}

function gameStateBelongsToRoom(roomId, myRoster) {
  if (!gameState) return false;
  if (activeRoomId && activeRoomId !== roomId) return false;
  if (gameState.name !== myRoster.name) return false;
  if ((gameState.units?.length || 0) !== (myRoster.units?.length || 0)) return false;
  return true;
}

// --- Панель комнаты ---
function renderRoomPanel(body) {
  if (!currentRoomData) {
    body.innerHTML = `<p style="color:var(--text-muted);">Комната не найдена.</p>`;
    return;
  }

  const room = currentRoomData;
  const isHost = room.hostId === currentUser?.uid;
  const myRoster = isHost ? room.hostRoster : room.guestRoster;
  const oppRoster = isHost ? room.guestRoster : room.hostRoster;
  const oppEmail = isHost ? room.guestEmail : room.hostEmail;
  const oppLabel = isHost ? 'Гость' : 'Хост';
  const shareURL = buildRoomShareURL(room.code || room.id);
  const qrSrc = buildQRImageURL(shareURL);

  body.innerHTML = `
    <h2 style="color:var(--gold); border-bottom:2px solid var(--border); padding-bottom:8px;">👥 Комната</h2>

    <div style="margin-top:16px; display:flex; gap:20px; align-items:flex-start; flex-wrap:wrap;">
      <div style="flex:1; min-width:200px;">
        <div style="color:var(--text-muted); font-size:0.85rem;">Код комнаты:</div>
        <div style="font-size:2rem; font-weight:800; letter-spacing:6px; color:var(--accent); font-family:monospace;">${escapeHtml(room.code || room.id)}</div>
        <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
          <button class="builder-action-btn" id="btn-copy-code" style="padding:8px 14px;">📋 Скопировать код</button>
          <button class="builder-action-btn" id="btn-copy-link" style="padding:8px 14px;">🔗 Скопировать ссылку</button>
        </div>
        <div style="margin-top:10px; font-size:0.8rem; color:var(--text-muted);">
          Ссылка открывает комнату сразу. Отсканируйте QR справа телефоном.
        </div>
      </div>

      <div style="text-align:center;">
        <div style="color:var(--text-muted); font-size:0.85rem; margin-bottom:6px;">QR для присоединения:</div>
        <img id="room-qr" src="${qrSrc}" alt="QR-код комнаты" width="180" height="180"
             style="border-radius:10px; border:1px solid var(--border); background:#fff; padding:6px;"
             onerror="this.style.display='none'; var f=document.getElementById('room-qr-fallback'); if(f) f.style.display='block';">
        <div id="room-qr-fallback" style="display:none; padding:20px; background:rgba(255,255,255,0.03); border:1px dashed var(--border); border-radius:10px; font-size:0.85rem; color:var(--text-muted);">
          QR не загрузился.<br>Введите код вручную: <strong style="color:var(--accent); letter-spacing:2px;">${escapeHtml(room.code || room.id)}</strong>
        </div>
      </div>
    </div>

    <div style="margin-top:16px; padding:12px 14px; background:rgba(0,0,0,0.2); border:1px solid var(--border); border-radius:8px;">
      <div style="font-size:0.9rem;">
        <strong>Вы:</strong> ${escapeHtml(currentUser?.email || '—')} ${isHost ? '(хост)' : '(гость)'}
      </div>
      <div style="font-size:0.9rem; margin-top:4px;">
        <strong>${oppLabel}:</strong> ${oppEmail ? escapeHtml(oppEmail) : '<span style="color:var(--text-muted);">ещё не присоединился</span>'}
      </div>
    </div>

    <div id="rooms-message" style="margin-top:12px;"></div>

    <h3 style="color:var(--accent); margin-top:24px; margin-bottom:10px;">Ваш ростер</h3>
    <div id="my-roster-panel"></div>

    <h3 style="color:var(--accent); margin-top:24px; margin-bottom:10px;">Ростер оппонента</h3>
    <div id="opp-roster-panel"></div>

    <div style="margin-top:24px; display:flex; gap:10px; flex-wrap:wrap;">
      <button class="builder-action-btn primary" id="btn-select-my-roster" style="flex:1; min-width:150px;">📂 Выбрать мой ростер</button>
      <button class="builder-action-btn" id="btn-leave-room" style="flex:1; min-width:150px; background:rgba(255,71,87,0.15); border-color:#ff4757; color:#ff4757;">🚪 Выйти из комнаты</button>
    </div>
  `;

  body.querySelector('#btn-copy-code')?.addEventListener('click', () => {
    const code = room.code || room.id;
    copyToClipboard(code).then(ok => {
      showRoomMessage(ok ? 'Код скопирован.' : 'Не удалось скопировать. Скопируйте вручную: ' + code, ok ? 'ok' : 'err');
    });
  });

  body.querySelector('#btn-copy-link')?.addEventListener('click', () => {
    copyToClipboard(shareURL).then(ok => {
      showRoomMessage(ok ? 'Ссылка скопирована.' : 'Не удалось скопировать ссылку.', ok ? 'ok' : 'err');
    });
  });

  body.querySelector('#btn-select-my-roster')?.addEventListener('click', () => openRosterPicker(isHost));
  body.querySelector('#btn-leave-room')?.addEventListener('click', leaveRoom);

  renderRosterPanel(body.querySelector('#my-roster-panel'), myRoster, 'mine');
  renderRosterPanel(body.querySelector('#opp-roster-panel'), oppRoster, 'opponent');
}

function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return Promise.resolve(ok);
  } catch {
    return Promise.resolve(false);
  }
}

// --- Панель ростера ---
function renderRosterPanel(container, roster, kind) {
  if (!container) return;

  if (!roster) {
    container.innerHTML = `
      <div style="background:rgba(0,0,0,0.2); border:1px dashed var(--border); padding:16px; border-radius:8px; text-align:center; color:var(--text-muted); font-size:0.9rem;">
        ${kind === 'mine' ? 'Вы ещё не выбрали ростер' : 'Оппонент ещё не выбрал ростер'}
      </div>
    `;
    return;
  }

  const totalCost = roster.totalCost || (roster.units?.reduce((s, u) => s + (u.cost || 0), 0) || 0);
  const unitCount = roster.units?.length || 0;

  container.innerHTML = `
    <div style="background:rgba(0,0,0,0.2); border:1px solid var(--border); padding:14px 16px; border-radius:8px;">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
        <div>
          <strong style="color:#fff; font-size:1.05rem;">${escapeHtml(roster.name || 'Без имени')}</strong>
          <div style="font-size:0.85rem; color:var(--text-muted); margin-top:2px;">
            ${escapeHtml(roster.clan || 'Армия')} • ${unitCount} моделей • ${totalCost} очков
            ${roster.artifactsCost ? ' • артефакты: ' + roster.artifactsCost : ''}
          </div>
        </div>
      </div>
      <div style="margin-top:12px; display:flex; flex-direction:column; gap:6px;">
        ${(roster.units || []).map((u, idx) => `
          <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding:6px 10px; border-radius:6px; font-size:0.85rem;">
            <span>
              #${idx + 1} • <strong>${escapeHtml(u.uniqueKey || u.title || '—')}</strong>
              ${u.artifactId ? `<span style="background: rgba(209,179,132,0.15); color: var(--gold); font-size:0.72rem; padding:2px 6px; border-radius:6px; font-weight:700; margin-left:6px;">🎁</span>` : ''}
            </span>
            <span style="color:var(--text-muted);">${escapeHtml(u.role || '')} • ${u.cost || 0} очков</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// --- Выбор ростера ---
async function openRosterPicker(isHost) {
  if (!currentUser) return;

  const body = document.getElementById('rooms-modal-body');
  const oldHTML = body.innerHTML;
  showRoomMessage('');

  body.innerHTML = `
    <h2 style="color:var(--gold); border-bottom:2px solid var(--border); padding-bottom:8px;">📂 Выбрать ростер</h2>
    <p style="color:var(--text-muted); margin-top:8px;">Загрузка ваших сохранённых ростеров…</p>
    <button class="builder-action-btn" id="btn-picker-back" style="margin-top:16px;">← Назад</button>
  `;

  body.querySelector('#btn-picker-back')?.addEventListener('click', () => {
    body.innerHTML = oldHTML;
    renderRoomPanel(body);
  });

  try {
    const rosters = await getUserRosters(currentUser.uid);

    if (!rosters || rosters.length === 0) {
      body.innerHTML = `
        <h2 style="color:var(--gold); border-bottom:2px solid var(--border); padding-bottom:8px;">📂 Выбрать ростер</h2>
        <p style="color:var(--text-muted); margin-top:16px;">У вас нет сохранённых ростеров.</p>
        <p style="margin-top:12px; font-size:0.9rem; color:var(--text-muted);">
          Сохраните ростер в конструкторе — и он появится здесь.
        </p>
        <button class="builder-action-btn" id="btn-picker-back" style="margin-top:16px;">← Назад</button>
      `;
      body.querySelector('#btn-picker-back')?.addEventListener('click', () => {
        body.innerHTML = oldHTML;
        renderRoomPanel(body);
      });
      return;
    }

    body.innerHTML = `
      <h2 style="color:var(--gold); border-bottom:2px solid var(--border); padding-bottom:8px;">📂 Выбрать ростер</h2>
      <p style="color:var(--text-muted); margin-top:8px; font-size:0.9rem;">Выберите, каким ростером вы будете играть в этой комнате:</p>

      <div style="margin-top:16px; display:flex; flex-direction:column; gap:8px;">
        ${rosters.map(r => {
          const unitCount = r.units?.length || 0;
          const cost = r.totalCost || (r.units?.reduce((s, u) => s + (u.cost || 0), 0) || 0);
          return `
            <div style="background: rgba(255,255,255,0.02); border:1px solid var(--border); padding:12px 14px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
              <div style="min-width:0;">
                <strong style="color:#fff;">${escapeHtml(r.name || 'Без имени')}</strong>
                <div style="font-size:0.85rem; color:var(--text-muted); margin-top:2px;">
                  ${escapeHtml(r.clan || 'Армия')} • ${unitCount} моделей • ${cost} очков
                </div>
              </div>
              <button class="builder-action-btn primary" data-roster-id="${r.id}" style="padding:6px 12px; font-size:0.85rem; flex-shrink:0;">Выбрать</button>
            </div>
          `;
        }).join('')}
      </div>

      <button class="builder-action-btn" id="btn-picker-back" style="margin-top:16px;">← Назад</button>
    `;

    body.querySelector('#btn-picker-back')?.addEventListener('click', () => {
      body.innerHTML = oldHTML;
      renderRoomPanel(body);
    });

    body.querySelectorAll('button[data-roster-id]').forEach(btn => {
      btn.addEventListener('click', () => selectRosterForRoom(btn.dataset.rosterId, rosters, isHost));
    });
  } catch (err) {
    console.error('openRosterPicker error:', err);
    showRoomMessage('Ошибка загрузки ростеров: ' + (err?.message || 'неизвестная'), 'err');
  }
}

async function selectRosterForRoom(rosterId, allRosters, isHost) {
  if (!currentRoomId) return;
  const selected = allRosters.find(r => String(r.id) === String(rosterId));
  if (!selected) return;

  const packed = packRosterForRoom(selected);

  const update = {
    updatedAt: new Date().toISOString(),
    expireAt: nextExpireAt()
  };
  if (isHost) {
    update.hostRoster = packed;
  } else {
    update.guestRoster = packed;
  }

  try {
    await updateDoc(doc(db, 'rooms', currentRoomId), update);
    showRoomMessage('Ростер выбран.', 'ok');
  } catch (err) {
    console.error('selectRosterForRoom error:', err);
    showRoomMessage('Ошибка: ' + (err?.message || 'неизвестная'), 'err');
  }
}

// --- Выход ---
async function leaveRoom() {
  if (!currentRoomId || !currentUser) return;

  const confirmText = currentRoomData?.hostId === currentUser.uid
    ? 'Вы хост. Если вы выйдете, комната будет удалена. Продолжить?'
    : 'Выйти из комнаты?';

  if (!confirm(confirmText)) return;

  stopRoomSync();
  setSoloMode();
  battleInitDone = false;

  const roomId = currentRoomId;

  if (unsubscribeSnapshot) {
    unsubscribeSnapshot();
    unsubscribeSnapshot = null;
  }

  try {
    if (currentRoomData?.hostId === currentUser.uid) {
      await deleteDoc(doc(db, 'rooms', roomId));
    } else {
      await updateDoc(doc(db, 'rooms', roomId), {
        guestId: null,
        guestEmail: null,
        guestRoster: null,
        status: 'waiting',
        updatedAt: new Date().toISOString(),
        expireAt: nextExpireAt()
      });
    }
  } catch (err) {
    console.error('leaveRoom error:', err);
  }

  currentRoomId = null;
  currentRoomData = null;

  updateURLWithRoom(null);
  renderOpponentBadge();

  openRoomsModal();
}

export function closeRoomsModal() {
  document.getElementById('rooms-modal')?.classList.add('hidden');
}

// --- Индикатор оппонента в шапке ---
export function renderOpponentBadge() {
  let badge = document.getElementById('room-badge');

  if (!currentRoomId || !currentRoomData) {
    if (badge) badge.remove();
    return;
  }

  const room = currentRoomData;
  const isHost = room.hostId === currentUser?.uid;
  const oppEmail = isHost ? room.guestEmail : room.hostEmail;

  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'room-badge';
    badge.style.cssText = `
      display: flex; align-items: center; gap: 10px;
      padding: 8px 12px; margin-bottom: 12px;
      background: rgba(108,92,231,0.12);
      border: 1px solid var(--accent);
      border-radius: 10px;
      font-size: 0.9rem;
      flex-wrap: wrap;
    `;
    const dashHeader = document.querySelector('.dash-header');
    if (dashHeader && dashHeader.parentNode) {
      dashHeader.parentNode.insertBefore(badge, dashHeader.nextSibling);
    }
  }

  badge.innerHTML = `
    <span style="color: var(--accent); font-weight: 700;">👥 Комната ${escapeHtml(room.code || room.id)}</span>
    <span style="color: var(--text-muted);">•</span>
    <span>Оппонент: ${oppEmail ? `<strong style="color:#2ed573;">${escapeHtml(oppEmail)}</strong> (онлайн)` : '<span style="color:var(--text-muted);">ожидание…</span>'}</span>
    <button class="builder-action-btn" id="btn-leave-room-badge" style="padding: 4px 10px; font-size: 0.8rem; margin-left: auto;">🚪 Выйти в соло</button>
  `;

  badge.querySelector('#btn-leave-room-badge')?.addEventListener('click', leaveRoom);
}