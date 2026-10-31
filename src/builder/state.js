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

/**
 * Стоимость только отрядов в ростере.
 */
export function getTotalArmyCost() {
  return roster.units.reduce((sum, unit) => sum + (unit.cost || 0), 0);
}

/**
 * Стоимость всех купленных артефактов.
 */
export function getArtifactsRosterCost() {
  return roster.artifacts.reduce((sum, artifact) => {
    const artifactData = ARTIFACTS_LIST.find(item => item.id === artifact.id);
    return sum + (artifactData?.cost || 0);
  }, 0);
}

/**
 * Полная стоимость армии: отряды + артефакты.
 */
export function getRosterTotalCost() {
  return getTotalArmyCost() + getArtifactsRosterCost();
}

/**
 * Командиром становится первый Герой.
 * Если Героев нет — первая элитная модель.
 */
export function getCommanderInfo() {
  const hero = roster.units.find(unit =>
    (unit.role || '').toLowerCase().includes('герой')
  );

  if (hero) return hero;

  const elite = roster.units.find(unit =>
    (unit.role || '').toLowerCase().includes('элит')
  );

  return elite || null;
}

/**
 * Проверяет, есть ли в армии модель нужного класса.
 */
export function hasUnitOfClass(classId) {
  if (classId === 'army') return true;

  return roster.units.some(unit => {
    const role = (unit.role || '').toLowerCase();

    if (classId === 'basic' && (role.includes('базов') || role.includes('basic'))) {
      return true;
    }

    if (classId === 'elite' && role.includes('элит')) {
      return true;
    }

    if (classId === 'hero' && role.includes('герой')) {
      return true;
    }

    return false;
  });
}

/**
 * Полные данные выбранных клятв.
 */
export function getSelectedStakes() {
  return STAKES_LIST.filter(stake =>
    roster.selectedStakes.includes(stake.id)
  );
}

/**
 * Общая стоимость клятв в Монетах Империи.
 */
export function getStakesCost() {
  return getSelectedStakes().reduce((sum, stake) => sum + stake.cost, 0);
}

/**
 * Остаток бюджета Монет Империи.
 */
export function getStakesBudgetLeft() {
  return STAKES_BUDGET - getStakesCost();
}

/**
 * Предупреждения и статус ростера для билдера.
 * Здесь полная стоимость учитывает и отряды, и артефакты.
 */
export function getArmyWarnings() {
  const warnings = [];

  const unitsCost = getTotalArmyCost();
  const artifactsCost = getArtifactsRosterCost();
  const total = getRosterTotalCost();

  if (roster.units.length === 0) {
    warnings.push({
      level: 'info',
      text: 'Армия пуста — добавьте отряды.'
    });
  } else if (total > ARMY_BUDGET) {
    warnings.push({
      level: 'error',
      text: `Перебор очков: ${total} / ${ARMY_BUDGET}. Уберите отряды или артефакты.`
    });
  } else if (total < ARMY_MIN) {
    warnings.push({
      level: 'warn',
      text: `Армия меньше рекомендуемого размера: ${total} / ${ARMY_MIN} очков.${artifactsCost > 0 ? ` Включая артефакты: ${artifactsCost} очков.` : ''}`
    });
  } else {
    warnings.push({
      level: 'ok',
      text: `Бюджет в норме: ${total} / ${ARMY_BUDGET}.${artifactsCost > 0 ? ` Артефакты: ${artifactsCost} очков.` : ''}`
    });
  }

  if (roster.units.length > 0 && !getCommanderInfo()) {
    warnings.push({
      level: 'warn',
      text: 'В армии нет Командира (нужен Герой или элитный отряд).'
    });
  }

  const usedMI = getStakesCost();

  if (roster.selectedStakes.length === 0) {
    warnings.push({
      level: 'info',
      text: `Клятвы не даны. Можно взять до ${STAKES_BUDGET} МИ.`
    });
  } else if (usedMI < STAKES_BUDGET) {
    warnings.push({
      level: 'info',
      text: `Неиспользовано ${STAKES_BUDGET - usedMI} МИ на клятвы.`
    });
  } else if (usedMI > STAKES_BUDGET) {
    warnings.push({
      level: 'error',
      text: `Перебор бюджета клятв: ${usedMI} / ${STAKES_BUDGET} МИ.`
    });
  }

  return warnings;
}

/**
 * Формирует переносимый объект ростера:
 * для localStorage, Firestore, JSON-экспорта и игрового стола.
 */
export function buildRosterPayload() {
  const selectedStakesFull = getSelectedStakes();

  return {
    name: roster.name || 'Без имени',
    clan: roster.clan || '',
    battleplanId: roster.battleplanId || '',

    selectedStakes: Array.isArray(roster.selectedStakes)
      ? [...roster.selectedStakes]
      : [],

    selectedStakesFull: selectedStakesFull.map(stake => ({
      id: stake.id,
      family: stake.family,
      name: stake.name,
      class: stake.class,
      classLabel: stake.classLabel,
      cost: stake.cost,
      reward: stake.reward,
      penalty: stake.penalty,
      description: stake.description,
      minRules: stake.minRules
    })),

    stakesCost: getStakesCost(),

    artifacts: Array.isArray(roster.artifacts)
      ? roster.artifacts.map(artifact => {
          const artifactData = ARTIFACTS_LIST.find(item => item.id === artifact.id);

          return {
            id: artifact.id,
            targetIdx: artifact.targetIdx,
            name: artifactData ? artifactData.name : '—',
            cost: artifactData ? artifactData.cost : 0,
            description: artifactData ? artifactData.description : '',
            effect: artifactData ? artifactData.effect : '',
            statBonuses: artifactData?.statBonuses || {}
          };
        })
      : [],

    units: roster.units.map(unit => ({
      title: unit.title,
      uniqueKey: unit.uniqueKey,
      role: unit.role || '',
      cost: unit.cost || 0,
      html: unit.html
    })),

    unitsCost: getTotalArmyCost(),
    artifactsCost: getArtifactsRosterCost(),
    totalCost: getRosterTotalCost(),
    totalUnits: roster.units.length
  };
}