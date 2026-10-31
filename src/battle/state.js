// src/battle/state.js

import { auth } from '../core/firebase.js';
import {
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

import { parseUnitCard } from '../utils/unit-parser.js';
import { ARTIFACTS_LIST } from '../content/artifacts.js';

export let playerName = '';
export let gameState = null;
export let currentUser = null;

export let battleMode = 'solo';
export let activeRoomId = null;
export let activeRoomRole = null;

let saveTimer = null;

export const LS_MATCHES_KEY = 'localMatches';

function numberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function firstNumber(...values) {
  for (const value of values) {
    const number = numberOrNull(value);
    if (number !== null) return number;
  }

  return null;
}

/**
 * Читает базовые характеристики непосредственно из исходной датакарты.
 *
 * Это устраняет зависимость от того, называется ли поле парсера
 * move, movement или speed.
 *
 * Исходный unit.html не изменяется.
 */
export function getUnitBaseStats(unit = {}) {
  const html = unit.html || '';

  let parsed = {};

  try {
    parsed = parseUnitCard(html) || {};
  } catch (error) {
    console.warn('Не удалось разобрать датакарту:', error);
  }

  const root = document.createElement('div');
  root.innerHTML = html;

  const domStats = {};
  const boxes = Array.from(root.querySelectorAll('.aos-stat-box'));

  boxes.forEach((box, index) => {
    const label = (
      box.querySelector('.aos-stat-label')?.textContent || ''
    ).trim().toUpperCase();

    const valueElement = box.querySelector('.aos-stat-value');
    const match = valueElement?.textContent?.match(/-?\d+/);

    if (!match) return;

    const value = Number(match[0]);
    let key = null;

    if (/ХП|HP|ЗДОРОВ|❤|♥/.test(label)) key = 'hp';
    else if (/ДВИЖ|MOVE|SPEED|👣/.test(label)) key = 'move';
    else if (/БРОН|ARMOU?R|🛡/.test(label)) key = 'armor';

    // В существующих датакартах порядок: ХП → Движение → Броня.
    // Нужен для карточек, где подпись характеристики — только иконка.
    if (!key && boxes.length === 3) {
      key = ['hp', 'move', 'armor'][index];
    }

    if (key) domStats[key] = value;
  });

  return {
    hp: firstNumber(
      domStats.hp,
      parsed.hp,
      unit.baseHp,
      unit.maxHp,
      6
    ),
    move: firstNumber(
      domStats.move,
      parsed.move,
      parsed.movement,
      parsed.speed,
      unit.baseMove,
      unit.move
    ),
    armor: firstNumber(
      domStats.armor,
      parsed.armor,
      unit.baseArmor,
      unit.armor
    )
  };
}

/**
 * Каталог — источник актуального описания и числовых бонусов.
 * Дополнительные поля сохранённого артефакта сохраняются.
 */
export function resolveArtifact(record) {
  if (!record || !record.id) return null;

  const catalog = ARTIFACTS_LIST.find(item => item.id === record.id);

  return {
    ...record,
    ...(catalog || {}),
    statBonuses: {
      ...(record.statBonuses || {}),
      ...(catalog?.statBonuses || {})
    }
  };
}

/**
 * Только постоянные изменения характеристик.
 * Нестатовые эффекты остаются текстовыми правилами.
 *
 * Резерв по effect нужен для старых данных, в которых statBonuses ещё нет.
 */
export function getArtifactStatBonuses(record) {
  const artifact = resolveArtifact(record);

  if (!artifact) {
    return { hp: 0, armor: 0, move: 0 };
  }

  const legacy = {
    give_hp_2_and_last_stand: { hp: 2 },
    give_armor_1: { armor: 1 },
    give_move_1: { move: 1 }
  }[artifact.effect] || {};

  const bonuses = {
    ...legacy,
    ...(artifact.statBonuses || {})
  };

  return {
    hp: firstNumber(bonuses.hp, 0),
    armor: firstNumber(bonuses.armor, 0),
    move: firstNumber(bonuses.move, 0)
  };
}

export function initAuthWatcher() {
  onAuthStateChanged(auth, user => {
    currentUser = (user && user.emailVerified) ? user : null;

    const element = document.getElementById('dash-auth-status');
    if (!element) return;

    element.textContent = currentUser
      ? `☁️ Аккаунт: ${currentUser.email}${battleMode === 'room' ? ' • режим комнаты' : ''}`
      : '💻 Гость — матч сохранится локально в этом браузере';
  });
}

export function setPlayerName(name) {
  playerName = name;
}

export function getPlayerName() {
  return playerName;
}

export function setRoomMode(roomId, role) {
  battleMode = 'room';
  activeRoomId = roomId;
  activeRoomRole = role;

  const element = document.getElementById('dash-auth-status');

  if (element && currentUser) {
    element.textContent =
      `☁️ Аккаунт: ${currentUser.email} • режим комнаты (${role === 'host' ? 'хост' : 'гость'})`;
  }
}

export function setSoloMode() {
  battleMode = 'solo';
  activeRoomId = null;
  activeRoomRole = null;

  const element = document.getElementById('dash-auth-status');

  if (element && currentUser) {
    element.textContent = `☁️ Аккаунт: ${currentUser.email}`;
  }
}

export function getStorageKey() {
  return `wargame_gamestate_${playerName}_${window.location.search}`;
}

function readActiveRoster() {
  try {
    const record = JSON.parse(localStorage.getItem('activeRoster') || 'null');

    if (record && Array.isArray(record.units)) {
      return {
        ...record,
        artifacts: Array.isArray(record.artifacts) ? record.artifacts : []
      };
    }
  } catch (error) {
    console.warn('Не удалось прочитать activeRoster:', error);
  }

  return {
    name: 'Армия',
    clan: '',
    units: [],
    artifacts: []
  };
}

/**
 * Не восстанавливаем бой только по совпадению названия:
 * проверяем также состав моделей и исходные датакарты.
 */
function matchesRoster(savedState, roster) {
  if (!savedState || !Array.isArray(savedState.units)) return false;
  if (savedState.name !== roster.name) return false;
  if (savedState.clan !== roster.clan) return false;
  if (savedState.units.length !== roster.units.length) return false;

  return savedState.units.every((unit, index) => {
    const rosterUnit = roster.units[index];

    return (
      (unit.uniqueKey || unit.title) ===
        (rosterUnit.uniqueKey || rosterUnit.title) &&
      (unit.html || '') === (rosterUnit.html || '')
    );
  });
}

function normalizeSavedState() {
  const numericDefaults = {
    round: 1,
    vpOwn: 0,
    vpOpp: 0,
    mage: 0,
    faith: 0,
    mageCap: 6,
    faithCap: 6
  };

  Object.entries(numericDefaults).forEach(([key, fallback]) => {
    if (!Number.isFinite(gameState[key])) {
      gameState[key] = fallback;
    }
  });

  if (!Array.isArray(gameState.battleLog)) gameState.battleLog = [];
  if (!Array.isArray(gameState.opponentUnits)) gameState.opponentUnits = [];

  ['opponentName', 'opponentRosterName', 'opponentRosterClan'].forEach(key => {
    if (typeof gameState[key] !== 'string') gameState[key] = '';
  });

  gameState.units.forEach(unit => {
    if (!Array.isArray(unit.statuses)) unit.statuses = [];
    if (typeof unit.activated !== 'boolean') unit.activated = false;
    if (!unit.stance) unit.stance = 'neutral';
  });
}

export function initGameState() {
  const baseRoster = readActiveRoster();

  let savedState = null;

  try {
    savedState = JSON.parse(localStorage.getItem(getStorageKey()) || 'null');
  } catch (error) {
    console.warn('Не удалось прочитать сохранённый бой:', error);
  }

  if (matchesRoster(savedState, baseRoster)) {
    gameState = savedState;
    normalizeSavedState();

    applyArtifactsToUnits(baseRoster.artifacts, false);
    saveGameStateNow();
    return;
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

    units: baseRoster.units.map(unit => {
      let parsed = {};

      try {
        parsed = parseUnitCard(unit.html || '') || {};
      } catch {
        // Значения характеристик ниже читаются также напрямую из HTML.
      }

      const base = getUnitBaseStats(unit);

      return {
        ...unit,
        baseHp: base.hp,
        baseArmor: base.armor,
        baseMove: base.move,
        currentHp: base.hp,
        maxHp: base.hp,
        armor: base.armor,
        move: base.move,
        statuses: [],
        activated: false,
        stance: 'neutral',
        role: unit.role || parsed.role || '',
        cost: unit.cost ?? parsed.cost ?? 0,
        artifact: null
      };
    })
  };

  applyArtifactsToUnits(baseRoster.artifacts, true);

  const mages = gameState.units.filter(unit =>
    (unit.html || '').includes('role-mage')
  ).length;

  const priests = gameState.units.filter(unit =>
    (unit.html || '').includes('role-priest')
  ).length;

  gameState.mage = Math.min(6, mages * 2);
  gameState.faith = Math.min(6, priests * 2);

  saveGameStateNow();
}

/**
 * Применение постоянных бонусов в соло.
 *
 * Новый бой: модель начинает с полным итоговым ХП.
 * Сохранённый бой:
 * - при неизменном максимуме текущее ХП сохраняется;
 * - при изменении максимума сохраняется количество полученного урона;
 * - погибшая модель остаётся с 0 ХП.
 *
 * Никакого повторного «лечения на +2» при загрузке.
 */
function applyArtifactsToUnits(artifacts, isNewBattle = false) {
  if (!gameState || !Array.isArray(gameState.units)) return;

  const assignments = new Map();

  (Array.isArray(artifacts) ? artifacts : []).forEach(record => {
    const index = record?.targetIdx;

    if (!Number.isInteger(index)) return;
    if (index < 0 || index >= gameState.units.length) return;

    const artifact = resolveArtifact(record);
    if (artifact) assignments.set(index, artifact);
  });

  gameState.units.forEach((unit, index) => {
    const base = getUnitBaseStats(unit);
    const artifact = assignments.get(index) || null;
    const bonuses = getArtifactStatBonuses(artifact);

    const previousMax = firstNumber(unit.maxHp, base.hp);
    const previousHp = firstNumber(unit.currentHp, previousMax);

    const nextMax = Math.max(1, base.hp + bonuses.hp);

    unit.baseHp = base.hp;
    unit.baseArmor = base.armor;
    unit.baseMove = base.move;

    unit.maxHp = nextMax;
    unit.armor = base.armor === null ? null : base.armor + bonuses.armor;
    unit.move = base.move === null ? null : base.move + bonuses.move;
    unit.artifact = artifact;

    if (isNewBattle) {
      unit.currentHp = nextMax;
    } else if (previousHp <= 0) {
      unit.currentHp = 0;
    } else {
      const damage = Math.max(0, previousMax - previousHp);
      unit.currentHp = Math.max(0, Math.min(nextMax, nextMax - damage));
    }
  });
}

export function saveGameState() {
  if (battleMode === 'room' || !playerName) return;

  clearTimeout(saveTimer);

  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(gameState));
    } catch (error) {
      console.warn('localStorage save failed:', error);
    }
  }, 250);
}

export function saveGameStateNow() {
  if (battleMode === 'room' || !playerName) return;

  clearTimeout(saveTimer);

  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(gameState));
  } catch (error) {
    console.warn('localStorage save failed:', error);
  }
}

export function loadLocalMatches() {
  try {
    const list = JSON.parse(localStorage.getItem(LS_MATCHES_KEY) || '[]');
    return Array.isArray(list) ? list : [];
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