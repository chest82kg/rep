// src/battle/resources.js
//
// Мана и Вера: подсчёт живых Магов/Жрецов, начисление, списание.

import { gameState, saveGameState } from './state.js';
import { pushMyState } from './room-sync.js';

const DEFAULT_CAP = 6;
const PER_UNIT = 2;

export function countLivingCasters() {
  let mages = 0;
  let priests = 0;
  if (!gameState || !Array.isArray(gameState.units)) return { mages, priests };

  gameState.units.forEach(u => {
    if (u.currentHp <= 0) return;
    const html = u.html || '';
    if (html.includes('role-mage')) mages++;
    if (html.includes('role-priest')) priests++;
  });

  return { mages, priests };
}

export function getUnitCastClass(idx) {
  const u = gameState?.units?.[idx];
  if (!u) return { isMage: false, isPriest: false };
  const html = u.html || '';
  return {
    isMage: html.includes('role-mage'),
    isPriest: html.includes('role-priest')
  };
}

export function tickResourcesAtRoundStart() {
  if (!gameState) return;
  const { mages, priests } = countLivingCasters();

  gameState.mageCap = gameState.mageCap || DEFAULT_CAP;
  gameState.faithCap = gameState.faithCap || DEFAULT_CAP;

  gameState.mage = Math.min(gameState.mageCap, (gameState.mage || 0) + mages * PER_UNIT);
  gameState.faith = Math.min(gameState.faithCap, (gameState.faith || 0) + priests * PER_UNIT);

  saveGameState();
  pushMyState();
}

export function spendMana(amount) {
  if (!gameState) return false;
  if ((gameState.mage || 0) < amount) return false;
  gameState.mage = gameState.mage - amount;
  saveGameState();
  pushMyState();
  return true;
}

export function spendFaith(amount) {
  if (!gameState) return false;
  if ((gameState.faith || 0) < amount) return false;
  gameState.faith = gameState.faith - amount;
  saveGameState();
  pushMyState();
  return true;
}