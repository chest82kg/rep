// src/battle/state.js

import { auth } from '../core/firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { parseUnitCard } from '../utils/unit-parser.js';

export let playerName = '';
export let gameState = null;
export let currentUser = null;

export let battleMode = 'solo';
export let activeRoomId = null;
export let activeRoomRole = null;

let saveTimer = null;

export const LS_MATCHES_KEY = 'localMatches';

export function initAuthWatcher() {
  onAuthStateChanged(auth, (user) => {
    currentUser = (user && user.emailVerified) ? user : null;
    const el = document.getElementById('dash-auth-status');
    if (el) {
      el.textContent = currentUser
        ? `☁️ Аккаунт: ${currentUser.email}${battleMode === 'room' ? ' • режим комнаты' : ''}`
        : '💻 Гость — матч сохранится локально в этом браузере';
    }
  });
}

export function setPlayerName(name) { playerName = name; }
export function getPlayerName() { return playerName; }

export function setRoomMode(roomId, role) {
  battleMode = 'room';
  activeRoomId = roomId;
  activeRoomRole = role;
  const el = document.getElementById('dash-auth-status');
  if (el && currentUser) {
    el.textContent = `☁️ Аккаунт: ${currentUser.email} • режим комнаты (${role === 'host' ? 'хост' : 'гость'})`;
  }
}

export function setSoloMode() {
  battleMode = 'solo';
  activeRoomId = null;
  activeRoomRole = null;
  const el = document.getElementById('dash-auth-status');
  if (el && currentUser) {
    el.textContent = `☁️ Аккаунт: ${currentUser.email}`;
  }
}

export function getStorageKey() {
  return `wargame_gamestate_${playerName}_${window.location.search}`;
}

export function initGameState() {
  const baseRoster = JSON.parse(localStorage.getItem('activeRoster')) || { name: 'Армия', clan: '', units: [], artifacts: [] };
  const saved = localStorage.getItem(getStorageKey());

  if (saved) {
    try {
      const savedState = JSON.parse(saved);
      if (savedState.name === baseRoster.name && savedState.clan === baseRoster.clan) {
        gameState = savedState;
        if (typeof gameState.round !== 'number') gameState.round = 1;
        if (typeof gameState.vpOwn !== 'number') gameState.vpOwn = 0;
        if (typeof gameState.vpOpp !== 'number') gameState.vpOpp = 0;
        if (!Array.isArray(gameState.battleLog)) gameState.battleLog = [];
        if (!Array.isArray(gameState.opponentUnits)) gameState.opponentUnits = [];
        if (typeof gameState.opponentName !== 'string') gameState.opponentName = '';
        if (typeof gameState.opponentRosterName !== 'string') gameState.opponentRosterName = '';
        if (typeof gameState.opponentRosterClan !== 'string') gameState.opponentRosterClan = '';
        if (typeof gameState.mage !== 'number') gameState.mage = 0;
        if (typeof gameState.faith !== 'number') gameState.faith = 0;
        if (typeof gameState.mageCap !== 'number') gameState.mageCap = 6;
        if (typeof gameState.faithCap !== 'number') gameState.faithCap = 6;

        // Восстанавливаем артефакты на юнитах (если потерялись).
        applyArtifactsToUnits(baseRoster.artifacts || []);
        return;
      }
    } catch (e) { /* ignore */ }
  }

  gameState = {
    name: baseRoster.name,
    clan: baseRoster.clan,
    round: 1,
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
    units: baseRoster.units.map(u => {
      const parsed = parseUnitCard(u.html);
      const maxHp = parsed.hp || 6;
      return {
        ...u,
        currentHp: maxHp,
        maxHp: maxHp,
        statuses: [],
        activated: false,
        role: u.role || parsed.role || '',
        cost: u.cost || parsed.cost || 0,
        artifact: null,
        // Базовые характеристики (без артефактов)
        baseStats: parsed.stats || null
      };
    })
  };

  // Переносим артефакты из ростера в состояние боя + применяем бонусы ХП.
  applyArtifactsToUnits(baseRoster.artifacts || []);

  // Стартовые ресурсы по числу Магов/Жрецов
  const mages = gameState.units.filter(u => (u.html || '').includes('role-mage')).length;
  const priests = gameState.units.filter(u => (u.html || '').includes('role-priest')).length;
  gameState.mage = Math.min(6, mages * 2);
  gameState.faith = Math.min(6, priests * 2);

  saveGameStateNow();
}

/**
 * Переносит артефакты из ростера в gameState.units[idx].artifact.
 * Дополнительно: применяет бонусы ХП к maxHp и currentHp.
 *
 * Структура ростера: [{ id, targetIdx, name, cost, description, effect }, ...]
 */
function applyArtifactsToUnits(artifacts) {
  if (!gameState || !Array.isArray(gameState.units)) return;

  // Сбрасываем все артефакты и откатываем применённые бонусы ХП
  gameState.units.forEach(u => {
    if (u.artifact && u.artifact._hpBonus) {
      u.maxHp -= u.artifact._hpBonus;
      u.currentHp = Math.max(1, Math.min(u.currentHp, u.maxHp));
    }
    u.artifact = null;
  });

  // Расставляем артефакты
  artifacts.forEach(a => {
    const idx = a.targetIdx;
    if (typeof idx !== 'number' || idx < 0 || idx >= gameState.units.length) return;

    const art = {
      id: a.id,
      name: a.name || a.id,
      cost: a.cost || 0,
      description: a.description || '',
      effect: a.effect || ''
    };

    // Амулет выживания: +2 к ХП. Применяем сразу.
    if (art.effect === 'give_hp_2_and_last_stand') {
      art._hpBonus = 2;
      gameState.units[idx].maxHp += 2;
      gameState.units[idx].currentHp += 2;
    }

    gameState.units[idx].artifact = art;
  });
}

export function saveGameState() {
  if (battleMode === 'room') return;
  if (!playerName) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(gameState));
    } catch (err) {
      console.warn('localStorage save failed:', err);
    }
  }, 250);
}

export function saveGameStateNow() {
  if (battleMode === 'room') return;
  if (!playerName) return;
  clearTimeout(saveTimer);
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(gameState));
  } catch (err) {
    console.warn('localStorage save failed:', err);
  }
}

export function loadLocalMatches() {
  try {
    return JSON.parse(localStorage.getItem(LS_MATCHES_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveLocalMatch(match) {
  const list = loadLocalMatches();
  list.push(match);
  localStorage.setItem(LS_MATCHES_KEY, JSON.stringify(list));
}

export function replaceGameState(newState) {
  gameState = newState;
}