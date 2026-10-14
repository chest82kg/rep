// src/battle/room-sync.js
import { db } from '../core/firebase.js';
import { doc, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
  gameState,
  activeRoomId,
  activeRoomRole
} from './state.js';
import { renderDashboard } from './render.js';

let unsubscribe = null;
let isApplyingRemote = false;
let pushDebounceTimer = null;

export function startRoomSync(roomId, role) {
  stopRoomSync();

  const roomRef = doc(db, 'rooms', roomId);

  unsubscribe = onSnapshot(roomRef, (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    applyRemoteState(data, role);
  }, (err) => {
    console.error('room-sync onSnapshot error:', err);
  });
}

export function stopRoomSync() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  if (pushDebounceTimer) {
    clearTimeout(pushDebounceTimer);
    pushDebounceTimer = null;
  }
}

function applyRemoteState(roomData, role) {
  if (!gameState) return;

  const battle = roomData.battleState || {};
  const myUnitsRemote = role === 'host' ? (battle.hostUnits || []) : (battle.guestUnits || []);
  const oppUnitsRemote = role === 'host' ? (battle.guestUnits || []) : (battle.hostUnits || []);

  const myRoster = role === 'host' ? roomData.hostRoster : roomData.guestRoster;
  const oppRoster = role === 'host' ? roomData.guestRoster : roomData.hostRoster;

  isApplyingRemote = true;

  gameState.units.forEach((u, idx) => {
    const remote = myUnitsRemote[idx];
    if (!remote) return;
    u.currentHp = typeof remote.currentHp === 'number' ? remote.currentHp : u.currentHp;
    u.maxHp = typeof remote.maxHp === 'number' ? remote.maxHp : u.maxHp;
    u.statuses = Array.isArray(remote.statuses) ? remote.statuses.map(st => ({ ...st })) : [];
    if (typeof remote.activated === 'boolean') u.activated = remote.activated;
  });

  const oppUnits = [];
  const oppRosterUnits = oppRoster?.units || [];
  for (let i = 0; i < oppRosterUnits.length; i++) {
    const meta = oppRosterUnits[i];
    const state = oppUnitsRemote[i] || {};
    oppUnits.push({
      title: meta.title,
      uniqueKey: meta.uniqueKey,
      role: meta.role,
      cost: meta.cost,
      html: meta.html || '',
      maxHp: state.maxHp ?? meta.maxHp ?? 6,
      currentHp: typeof state.currentHp === 'number' ? state.currentHp : (meta.maxHp || 6),
      statuses: Array.isArray(state.statuses) ? state.statuses : [],
      artifactId: meta.artifactId || null
    });
  }

  gameState.opponentUnits = oppUnits;
  gameState.opponentName = role === 'host'
    ? (roomData.guestEmail || 'Оппонент')
    : (roomData.hostEmail || 'Оппонент');
  gameState.opponentRosterName = oppRoster?.name || '';
  gameState.opponentRosterClan = oppRoster?.clan || '';

  if (typeof battle.round === 'number') {
    gameState.round = battle.round;
  }

  if (role === 'host') {
    gameState.vpOwn = battle.vpHost || 0;
    gameState.vpOpp = battle.vpGuest || 0;
    if (typeof battle.hostMana === 'number') gameState.mage = battle.hostMana;
    if (typeof battle.hostFaith === 'number') gameState.faith = battle.hostFaith;
  } else {
    gameState.vpOwn = battle.vpGuest || 0;
    gameState.vpOpp = battle.vpHost || 0;
    if (typeof battle.guestMana === 'number') gameState.mage = battle.guestMana;
    if (typeof battle.guestFaith === 'number') gameState.faith = battle.guestFaith;
  }

  // Merge логов: свои + удалённые, без дубликатов по id
  if (Array.isArray(battle.battleLog)) {
    const mine = gameState.battleLog || [];
    const theirs = battle.battleLog;
    const seen = new Set(mine.map(e => e.id));
    const merged = [...mine, ...theirs.filter(e => !seen.has(e.id))];
    merged.sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
    gameState.battleLog = merged;
  }

  isApplyingRemote = false;

  renderDashboard();
}

export function pushMyState() {
  if (isApplyingRemote) return;
  if (!activeRoomId || !activeRoomRole) return;
  if (!gameState) return;

  if (pushDebounceTimer) clearTimeout(pushDebounceTimer);
  pushDebounceTimer = setTimeout(() => {
    pushDebounceTimer = null;
    doPush();
  }, 250);
}

async function doPush() {
  if (!activeRoomId || !activeRoomRole || !gameState) return;

  const roomRef = doc(db, 'rooms', activeRoomId);

  const myUnitsCompact = gameState.units.map(u => ({
    currentHp: u.currentHp,
    maxHp: u.maxHp,
    activated: !!u.activated,
    statuses: Array.isArray(u.statuses) ? u.statuses.map(st => ({
      type: st.type, name: st.name, value: st.value
    })) : []
  }));

  const update = {
    updatedAt: new Date().toISOString()
  };

  if (activeRoomRole === 'host') {
    update['battleState.hostUnits'] = myUnitsCompact;
    update['battleState.vpHost'] = gameState.vpOwn;
    update['battleState.round'] = gameState.round;
    update['battleState.hostMana'] = gameState.mage || 0;
    update['battleState.hostFaith'] = gameState.faith || 0;
    update['battleState.lastUpdatedBy'] = 'host';
  } else {
    update['battleState.guestUnits'] = myUnitsCompact;
    update['battleState.vpGuest'] = gameState.vpOwn;
    update['battleState.guestMana'] = gameState.mage || 0;
    update['battleState.guestFaith'] = gameState.faith || 0;
    update['battleState.lastUpdatedBy'] = 'guest';
  }

  update['battleState.battleLog'] = gameState.battleLog || [];

  try {
    await updateDoc(roomRef, update);
  } catch (err) {
    console.error('pushMyState error:', err);
  }
}