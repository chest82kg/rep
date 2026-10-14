// src/builder/state.js

import { STAKES_LIST } from '../content/stakes.js';
import { ARTIFACTS_LIST } from '../content/artifacts.js';

export const roster = {
  name: 'Мой Ростер',
  clan: '',
  battleplanId: '',
  selectedStakes: [],
  artifacts: [],
  units: []
};

export const ARMY_BUDGET = 1000;
export const ARMY_MIN = 500;
export const STAKES_BUDGET = 6;
export const LS_ROSTERS_KEY = 'savedRosters';

export { STAKES_LIST };

export function getTotalArmyCost() {
  return roster.units.reduce((sum, u) => sum + (u.cost || 0), 0);
}

export function getCommanderInfo() {
  const hero = roster.units.find(u => (u.role || '').toLowerCase().includes('герой'));
  if (hero) return hero;
  const elite = roster.units.find(u => (u.role || '').toLowerCase().includes('элит'));
  return elite || null;
}

export function hasUnitOfClass(classId) {
  if (classId === 'army') return true;
  return roster.units.some(u => {
    const role = (u.role || '').toLowerCase();
    if (classId === 'basic' && (role.includes('базов') || role.includes('basic'))) return true;
    if (classId === 'elite' && role.includes('элит')) return true;
    if (classId === 'hero' && role.includes('герой')) return true;
    return false;
  });
}

export function getSelectedStakes() {
  return STAKES_LIST.filter(s => roster.selectedStakes.includes(s.id));
}

export function getStakesCost() {
  return getSelectedStakes().reduce((sum, s) => sum + s.cost, 0);
}

export function getStakesBudgetLeft() {
  return STAKES_BUDGET - getStakesCost();
}

export function getArmyWarnings() {
  const warnings = [];
  const total = getTotalArmyCost();

  if (roster.units.length === 0) {
    warnings.push({ level: 'info', text: 'Армия пуста — добавьте отряды.' });
  }
  if (total > ARMY_BUDGET) {
    warnings.push({ level: 'error', text: `Перебор очков: ${total} / ${ARMY_BUDGET}. Уберите отряды.` });
  } else if (total < ARMY_MIN && roster.units.length > 0) {
    warnings.push({ level: 'warn', text: `Армия меньше минимума: ${total} / ${ARMY_MIN}.` });
  } else if (roster.units.length > 0) {
    warnings.push({ level: 'ok', text: `Бюджет в норме: ${total} / ${ARMY_BUDGET}.` });
  }

  if (roster.units.length > 0 && !getCommanderInfo()) {
    warnings.push({ level: 'warn', text: 'В армии нет Командира (нужен Герой или элитный отряд).' });
  }

  const usedMI = getStakesCost();
  if (roster.selectedStakes.length === 0) {
    warnings.push({ level: 'info', text: `Клятвы не даны. Можно взять до ${STAKES_BUDGET} МИ.` });
  } else if (usedMI < STAKES_BUDGET) {
    warnings.push({ level: 'info', text: `Неиспользовано ${STAKES_BUDGET - usedMI} МИ на клятвы.` });
  } else if (usedMI > STAKES_BUDGET) {
    warnings.push({ level: 'error', text: `Перебор бюджета клятв: ${usedMI} / ${STAKES_BUDGET} МИ.` });
  }

  return warnings;
}

export function buildRosterPayload() {
  const selectedStakesFull = getSelectedStakes();
  return {
    name: roster.name || 'Без имени',
    clan: roster.clan || '',
    battleplanId: roster.battleplanId || '',
    selectedStakes: Array.isArray(roster.selectedStakes) ? [...roster.selectedStakes] : [],
    selectedStakesFull: selectedStakesFull.map(s => ({
      id: s.id,
      family: s.family,
      name: s.name,
      class: s.class,
      classLabel: s.classLabel,
      cost: s.cost,
      reward: s.reward,
      penalty: s.penalty,
      description: s.description,
      minRules: s.minRules
    })),
    stakesCost: getStakesCost(),
    artifacts: Array.isArray(roster.artifacts) ? roster.artifacts.map(a => {
      const art = ARTIFACTS_LIST.find(x => x.id === a.id);
      return {
        id: a.id,
        targetIdx: a.targetIdx,
        name: art ? art.name : '—',
        cost: art ? art.cost : 0
      };
    }) : [],
    units: roster.units.map(u => ({
      title: u.title,
      uniqueKey: u.uniqueKey,
      role: u.role || '',
      cost: u.cost || 0,
      html: u.html
    })),
    totalCost: getTotalArmyCost(),
    totalUnits: roster.units.length
  };
}