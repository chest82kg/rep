// src/battle/room-sync.js
//
// Синхронизация ручного боевого дашборда в комнате.
//
// Важно:
// - каждый запуск получает собственный session token;
// - устаревший snapshot или debounce не могут записать другую комнату;
// - после первого snapshot собственное состояние не применяется обратно:
//   это защищает локальное изменение, ожидающее debounce;
// - общие поля и армия оппонента продолжают обновляться из Firestore.
//
// Лог боя пока остаётся legacy-общим массивом battleState.battleLog.
// Его безопасная конкурентная модель требует отдельного пакета.

import { db } from '../core/firebase.js';

import {
  doc,
  onSnapshot,
  updateDoc
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

import {
  gameState,
  activeRoomId,
  activeRoomRole
} from './state.js';

import { renderDashboard } from './render.js';

let unsubscribe = null;
let isApplyingRemote = false;
let pushDebounceTimer = null;

let syncSession = 0;
let activeContext = null;
let initialSnapshotReceived = false;
let localChangeBeforeInitialSnapshot = false;

const VALID_STANCES = new Set([
  'neutral',
  'attack',
  'defense',
  'clan'
]);

function isCurrentContext(context) {
  return Boolean(
    context &&
    context.session === syncSession &&
    activeContext === context &&
    activeRoomId === context.roomId &&
    activeRoomRole === context.role
  );
}

function numberOr(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : fallback;
}

function cloneStatuses(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(status => status && typeof status === 'object')
    .map(status => ({
      type: status.type,
      name: status.name,
      value: status.value
    }));
}

function normalizeStance(value, fallback = 'neutral') {
  return VALID_STANCES.has(value) ? value : fallback;
}

function cloneStakeResults(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce((result, [id, record]) => {
    if (
      typeof id !== 'string' ||
      !record ||
      typeof record !== 'object' ||
      Array.isArray(record)
    ) {
      return result;
    }

    result[id] = {
      done: record.done === true,
      minMet: record.minMet === true
    };

    return result;
  }, {});
}

function mergeBattleLog(localLog, remoteLog) {
  const mine = Array.isArray(localLog) ? localLog : [];
  const theirs = Array.isArray(remoteLog) ? remoteLog : [];

  const seen = new Set();
  const merged = [];

  for (const entry of [...mine, ...theirs]) {
    if (!entry || typeof entry !== 'object') continue;

    const id = String(entry.id || '');

    // Старые записи без ID не считаем одинаковыми.
    if (id && seen.has(id)) continue;

    if (id) seen.add(id);

    merged.push(entry);
  }

  merged.sort((a, b) => {
    const aTime = new Date(a.timestamp || 0).getTime() || 0;
    const bTime = new Date(b.timestamp || 0).getTime() || 0;

    return aTime - bTime;
  });

  return merged;
}

export function startRoomSync(roomId, role) {
  stopRoomSync();

  const context = {
    roomId,
    role,
    session: ++syncSession
  };

  activeContext = context;
  initialSnapshotReceived = false;
  localChangeBeforeInitialSnapshot = false;

  const roomRef = doc(db, 'rooms', roomId);

  unsubscribe = onSnapshot(
    roomRef,

    snapshot => {
      if (!isCurrentContext(context)) {
        return;
      }

      if (!snapshot.exists()) {
        console.warn(
          'room-sync: документ комнаты больше не существует'
        );
        return;
      }

      const applyOwnState =
        !initialSnapshotReceived &&
        !localChangeBeforeInitialSnapshot;

      initialSnapshotReceived = true;

      applyRemoteState(
        snapshot.data(),
        context,
        applyOwnState
      );
    },

    error => {
      if (!isCurrentContext(context)) {
        return;
      }

      console.error('room-sync onSnapshot error:', error);
    }
  );
}

export function stopRoomSync() {
  // Инвалидируем callback раньше unsubscribe:
  // callback, уже находящийся в очереди, ничего не сделает.
  syncSession += 1;
  activeContext = null;

  initialSnapshotReceived = false;
  localChangeBeforeInitialSnapshot = false;
  isApplyingRemote = false;

  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }

  if (pushDebounceTimer) {
    clearTimeout(pushDebounceTimer);
    pushDebounceTimer = null;
  }
}

function applyOwnUnits(remoteUnits) {
  if (!gameState || !Array.isArray(gameState.units)) {
    return;
  }

  gameState.units.forEach((unit, index) => {
    const remote = remoteUnits[index];

    if (!remote || typeof remote !== 'object') {
      return;
    }

    unit.currentHp = numberOr(
      remote.currentHp,
      unit.currentHp
    );

    unit.maxHp = numberOr(
      remote.maxHp,
      unit.maxHp
    );

    unit.statuses = cloneStatuses(remote.statuses);

    if (typeof remote.activated === 'boolean') {
      unit.activated = remote.activated;
    }

    unit.stance = normalizeStance(
      remote.stance,
      unit.stance || 'neutral'
    );
  });
}

function buildOpponentUnits(roster, remoteUnits) {
  const rosterUnits = Array.isArray(roster?.units)
    ? roster.units
    : [];

  const remote = Array.isArray(remoteUnits)
    ? remoteUnits
    : [];

  return rosterUnits.map((meta, index) => {
    const state = remote[index] || {};
    const maxHp = numberOr(
      state.maxHp,
      numberOr(meta.maxHp, 6)
    );

    return {
      title: meta.title,
      uniqueKey: meta.uniqueKey,
      role: meta.role,
      cost: meta.cost,
      html: meta.html || '',

      maxHp,
      currentHp: numberOr(state.currentHp, maxHp),
      statuses: cloneStatuses(state.statuses),
      activated: state.activated === true,
      stance: normalizeStance(state.stance),

      artifactId: meta.artifactId || null,
      artifact: meta.artifactId
        ? {
            id: meta.artifactId,
            name: meta.artifactName || meta.artifactId,
            cost: meta.artifactCost || 0,
            description: meta.artifactDescription || '',
            effect: meta.artifactEffect || ''
          }
        : null
    };
  });
}

function applyRemoteState(
  roomData,
  context,
  applyOwnState
) {
  if (!gameState || !isCurrentContext(context)) {
    return;
  }

  const battle = roomData?.battleState || {};

  const isHost = context.role === 'host';

  const myUnitsRemote = isHost
    ? battle.hostUnits
    : battle.guestUnits;

  const opponentUnitsRemote = isHost
    ? battle.guestUnits
    : battle.hostUnits;

  const opponentRoster = isHost
    ? roomData.guestRoster
    : roomData.hostRoster;

  isApplyingRemote = true;

  try {
    // Собственная часть применяется только при первом snapshot,
    // если пользователь ещё не успел сделать локальное изменение.
    if (applyOwnState) {
      applyOwnUnits(
        Array.isArray(myUnitsRemote)
          ? myUnitsRemote
          : []
      );

      gameState.vpOwn = numberOr(
        isHost ? battle.vpHost : battle.vpGuest,
        gameState.vpOwn
      );

      gameState.mage = numberOr(
        isHost ? battle.hostMana : battle.guestMana,
        gameState.mage
      );

      gameState.faith = numberOr(
        isHost ? battle.hostFaith : battle.guestFaith,
        gameState.faith
      );

            gameState.stakeResults = cloneStakeResults(
        isHost
          ? battle.hostStakeResults
          : battle.guestStakeResults
      );
    }

    gameState.opponentUnits = buildOpponentUnits(
      opponentRoster,
      opponentUnitsRemote
    );

    gameState.opponentName = isHost
      ? roomData.guestEmail || 'Оппонент'
      : roomData.hostEmail || 'Оппонент';

    gameState.opponentRosterName =
      opponentRoster?.name || '';

    gameState.opponentRosterClan =
      opponentRoster?.clan || '';

    // Раунд общий: его ведёт хост, но видеть должны оба игрока.
    if (typeof battle.round === 'number') {
      gameState.round = battle.round;
    }

    // Соперник может менять только свои ОП и ресурсы.
    // Поэтому эти значения всегда можно принять из snapshot.
    gameState.vpOpp = numberOr(
      isHost ? battle.vpGuest : battle.vpHost,
      gameState.vpOpp
    );

    // Legacy-синхронизация лога. Удаление/очистка конкурентно
    // пока не разрешается корректно — это отдельный пакет.
    if (Array.isArray(battle.battleLog)) {
      gameState.battleLog = mergeBattleLog(
        gameState.battleLog,
        battle.battleLog
      );
    }
  } finally {
    isApplyingRemote = false;
  }

  if (isCurrentContext(context)) {
    renderDashboard();
  }
}

export function pushMyState() {
  if (isApplyingRemote || !gameState || !activeContext) {
    return;
  }

  const context = activeContext;

  if (!isCurrentContext(context)) {
    return;
  }

  // Если действие произошло раньше первого snapshot,
  // не позволяем начальному удалённому состоянию стереть его.
  if (!initialSnapshotReceived) {
    localChangeBeforeInitialSnapshot = true;
  }

  if (pushDebounceTimer) {
    clearTimeout(pushDebounceTimer);
  }

  pushDebounceTimer = setTimeout(() => {
    pushDebounceTimer = null;

    if (isCurrentContext(context)) {
      void doPush(context);
    }
  }, 250);
}

async function doPush(context) {
  if (!gameState || !isCurrentContext(context)) {
    return;
  }

  const myUnitsCompact = (gameState.units || []).map(unit => ({
    currentHp: numberOr(unit.currentHp, 0),
    maxHp: numberOr(unit.maxHp, 1),
    activated: unit.activated === true,
    stance: normalizeStance(unit.stance),

    statuses: cloneStatuses(unit.statuses)
  }));

  const update = {
    updatedAt: new Date().toISOString(),

    // Legacy-поле. Его конкурентную модель пока не меняем
    // без отдельной миграции лога.
    'battleState.battleLog': Array.isArray(gameState.battleLog)
      ? gameState.battleLog
      : []
  };

  if (context.role === 'host') {
    update['battleState.hostUnits'] = myUnitsCompact;
    update['battleState.vpHost'] = numberOr(
      gameState.vpOwn,
      0
    );
    update['battleState.round'] = numberOr(
      gameState.round,
      1
    );
    update['battleState.hostMana'] = numberOr(
      gameState.mage,
      0
    );
     update['battleState.hostFaith'] = numberOr(
      gameState.faith,
      0
    );

    update['battleState.hostStakeResults'] =
      cloneStakeResults(gameState.stakeResults);

    update['battleState.lastUpdatedBy'] = 'host';
  } else {
    update['battleState.guestUnits'] = myUnitsCompact;
    update['battleState.vpGuest'] = numberOr(
      gameState.vpOwn,
      0
    );
    update['battleState.guestMana'] = numberOr(
      gameState.mage,
      0
    );
    update['battleState.guestFaith'] = numberOr(
      gameState.faith,
      0
    );

    update['battleState.guestStakeResults'] =
      cloneStakeResults(gameState.stakeResults);

    update['battleState.lastUpdatedBy'] = 'guest';
  }

  try {
    // Перед началом запроса повторно убеждаемся,
    // что debounce относится к текущей комнате.
    if (!isCurrentContext(context)) {
      return;
    }

    await updateDoc(
      doc(db, 'rooms', context.roomId),
      update
    );
  } catch (error) {
    if (isCurrentContext(context)) {
      console.error('pushMyState error:', error);
    }
  }
}