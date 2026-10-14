// src/builder/stakes.js
//
// Рендер списка клятв в билдере.
// Блокировка по классам (если в ростере нет нужной модели),
// запрет дубликатов одной семьи клятв.
// Повторный клик по выбранной клятве снимает выбор.

import {
  roster,
  STAKES_BUDGET,
  STAKES_LIST,
  getStakesCost,
  getStakesBudgetLeft,
  hasUnitOfClass
} from './state.js';
import { renderRosterSummary } from './render.js';

export function renderStakesList() {
  const container = document.getElementById('builder-stakes-list');
  if (!container) return;

  const remainingMI = getStakesBudgetLeft();
  const badge = document.getElementById('builder-mi-budget');
  if (badge) badge.textContent = `Осталось: ${remainingMI} / ${STAKES_BUDGET} МИ`;

  const families = {};
  STAKES_LIST.forEach(st => {
    if (!families[st.family]) families[st.family] = [];
    families[st.family].push(st);
  });

  const FAMILY_ORDER = ['march', 'wall', 'scalp', 'heights', 'heads', 'banner'];

  const sortedFamilyKeys = Object.keys(families).sort((a, b) => {
    const ia = FAMILY_ORDER.indexOf(a);
    const ib = FAMILY_ORDER.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  container.innerHTML = sortedFamilyKeys.map(familyKey => {
    const familyStakes = families[familyKey];
    const familyName = familyStakes[0].name;
    const isArmyFamily = familyStakes.every(s => s.class === 'army');

    const selectedInFamily = familyStakes.find(s => roster.selectedStakes.includes(s.id));

    return `
      <div class="stake-family ${isArmyFamily ? 'stake-family-army' : ''}">
        <div class="stake-family-title">
          <span>
            ${isArmyFamily ? '🌍 ' : '⚔️ '}${familyName}
            ${isArmyFamily ? '<span style="font-size:0.75rem; color:var(--text-muted); font-weight:400; margin-left:6px;">(не требует моделей класса)</span>' : ''}
          </span>
          ${selectedInFamily ? `<span class="stake-selected-badge">дана: ${selectedInFamily.classLabel}</span>` : ''}
        </div>
        <div class="stake-family-options">
          ${familyStakes.map(st => renderStakeOption(st, selectedInFamily, remainingMI)).join('')}
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('input[type="radio"]').forEach(radio => {
    radio.addEventListener('click', (e) => {
      const stakeId = e.target.value;
      const isAlreadySelected = roster.selectedStakes.includes(stakeId);

      if (isAlreadySelected) {
        e.preventDefault();
        roster.selectedStakes = roster.selectedStakes.filter(id => id !== stakeId);
        renderStakesList();
        renderRosterSummary();
        return;
      }

      selectStake(stakeId);
      renderRosterSummary();
    });
  });
}

function renderStakeOption(st, selectedInFamily, remainingMI) {
  const isSelected = roster.selectedStakes.includes(st.id);
  const hasClass = hasUnitOfClass(st.needClass);

  const isOtherSelected = selectedInFamily && !isSelected;
  const notEnoughMI = !isSelected && st.cost > remainingMI;
  const isDisabled = !hasClass || isOtherSelected || notEnoughMI;

  let reason = '';
  if (!hasClass) reason = `Требуется модель класса «${st.classLabel}» в ростере`;
  else if (isOtherSelected) reason = `Уже дана другая версия «${st.name}»`;
  else if (notEnoughMI) reason = `Не хватает МИ (нужно ${st.cost}, есть ${remainingMI})`;

  const penaltyText = st.penalty > 0
    ? `<span class="stake-penalty">Цена: −${st.penalty} ОП</span>`
    : `<span class="stake-penalty none">Без цены</span>`;

  return `
    <label class="stake-option ${isSelected ? 'active' : ''} ${isDisabled ? 'disabled' : ''}"
           title="${escapeAttr(reason)}">
      <input type="radio"
             name="stake-family-${st.family}"
             value="${st.id}"
             ${isSelected ? 'checked' : ''}
             ${isDisabled && !isSelected ? 'disabled' : ''}>
      <div class="stake-option-body">
        <div class="stake-option-header">
          <span class="stake-option-class class-${st.class}">${st.classLabel}</span>
          <span class="stake-option-cost">${st.cost} МИ</span>
        </div>
        <div class="stake-option-desc">${escapeHtml(st.description)}</div>
        <div class="stake-option-meta">
          <span class="stake-reward">Награда: +${st.reward} ОП</span>
          ${penaltyText}
        </div>
        ${st.minRules.length > 0 ? `
          <ul class="stake-min-rules">
            ${st.minRules.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
          </ul>
        ` : ''}
      </div>
    </label>
  `;
}

function selectStake(stakeId) {
  const stake = STAKES_LIST.find(s => s.id === stakeId);
  if (!stake) return;

  roster.selectedStakes = roster.selectedStakes.filter(id => {
    const s = STAKES_LIST.find(x => x.id === id);
    return s && s.family !== stake.family;
  });

  if (!roster.selectedStakes.includes(stakeId)) {
    roster.selectedStakes.push(stakeId);
  }

  renderStakesList();
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(str) {
  return escapeHtml(str);
}