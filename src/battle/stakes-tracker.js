// src/battle/stakes-tracker.js
//
// Модалка «Мои клятвы»: показывает данные перед боем клятвы,
// даёт отметить сдержанность и условие, считает ОП.

import { gameState, saveGameState } from './state.js';
import { pushMyState } from './room-sync.js';
import { escapeHtml } from '../utils/escape.js';
import { getSelectedStakes } from './stakes-utils.js';

export function initStakesTracker() {
  const btn = document.getElementById('btn-my-stakes');
  if (btn) btn.addEventListener('click', openStakesModal);
}

function ensureStakeResults() {
  if (!gameState) return;
  if (!gameState.stakeResults || typeof gameState.stakeResults !== 'object') {
    gameState.stakeResults = {};
  }
}

function getStakeResult(stakeId) {
  ensureStakeResults();
  if (!gameState.stakeResults[stakeId]) {
    gameState.stakeResults[stakeId] = { done: false, minMet: false };
  }
  return gameState.stakeResults[stakeId];
}

function computeStakesTotal(stakes) {
  let earned = 0;
  let lost = 0;

  stakes.forEach(st => {
    const r = getStakeResult(st.id);
    if (r.done) {
      earned += st.reward;
    } else if (!r.minMet && st.penalty > 0) {
      lost += st.penalty;
    }
  });

  return { earned, lost, net: earned - lost };
}

export function openStakesModal() {
  const modal = document.getElementById('stakes-modal');
  const body = document.getElementById('stakes-modal-body');
  if (!modal || !body) return;

  if (!gameState) {
    body.innerHTML = '<p style="color:var(--text-muted);">Сначала войдите на поле боя.</p>';
    modal.classList.remove('hidden');
    return;
  }

  const stakes = getSelectedStakes();

  if (stakes.length === 0) {
    body.innerHTML = `
      <h2 style="color:var(--gold); border-bottom:2px solid var(--border); padding-bottom:8px;">📌 Мои клятвы</h2>
      <p style="color:var(--text-muted); margin-top:12px;">
        Клятвы не даны. Откройте билдер, выберите клятвы и нажмите «🎮 В бой».
      </p>
    `;
    modal.classList.remove('hidden');
    return;
  }

  ensureStakeResults();
  renderStakesModal(body, stakes);
  modal.classList.remove('hidden');
}

export function closeStakesModal() {
  document.getElementById('stakes-modal')?.classList.add('hidden');
}

function renderStakesModal(body, stakes) {
  const total = computeStakesTotal(stakes);

  body.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
      <h2 style="color:var(--gold); margin:0;">📌 Мои клятвы</h2>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <span style="background:rgba(46,213,115,0.15); color:#2ed573; padding:6px 12px; border-radius:6px; font-weight:700; font-size:0.9rem;">
          Сдержано: +${total.earned} ОП
        </span>
        ${total.lost > 0 ? `
          <span style="background:rgba(255,71,87,0.15); color:#ff4757; padding:6px 12px; border-radius:6px; font-weight:700; font-size:0.9rem;">
            Цена: −${total.lost} ОП
          </span>
        ` : ''}
        <span style="background:rgba(209,179,132,0.15); color:var(--gold); padding:6px 12px; border-radius:6px; font-weight:700; font-size:0.9rem;">
          Итог: ${total.net >= 0 ? '+' : ''}${total.net} ОП
        </span>
      </div>
    </div>

    <p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:16px;">
      Отмечайте сдержанность клятвы по ходу игры. «Условие соблюдено» — это пороговое правило.
      Если условие не соблюдено и клятва не сдержана — начисляется цена.
    </p>

    <div style="display:flex; flex-direction:column; gap:10px;">
      ${stakes.map(st => renderStakeRow(st)).join('')}
    </div>

    <div style="margin-top:20px; display:flex; gap:10px; flex-wrap:wrap;">
      <button class="builder-action-btn primary" id="stakes-modal-save" style="flex:1; min-width:150px;">✓ Сохранить отметки</button>
      <button class="builder-action-btn" id="stakes-modal-close-bottom" style="flex:1; min-width:150px;">Закрыть</button>
    </div>
  `;

  body.querySelectorAll('input[type="checkbox"][data-stake-id]').forEach(chk => {
    chk.addEventListener('change', () => {
      const stakeId = chk.dataset.stakeId;
      const field = chk.dataset.field;
      const r = getStakeResult(stakeId);
      r[field] = chk.checked;

      if (field === 'done' && chk.checked) {
        r.minMet = true;
      }
      if (field === 'minMet' && !chk.checked) {
        r.done = false;
      }

      saveGameState();
      pushMyState();
      renderStakesModal(body, stakes);
    });
  });

  const saveBtn = body.querySelector('#stakes-modal-save');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      saveGameState();
      pushMyState();
      closeStakesModal();
    });
  }

  const closeBottom = body.querySelector('#stakes-modal-close-bottom');
  if (closeBottom) {
    closeBottom.addEventListener('click', closeStakesModal);
  }
}

function renderStakeRow(st) {
  const r = getStakeResult(st.id);
  const rowClass = r.done ? 'done' : (!r.minMet && st.penalty > 0 ? 'failed' : 'in-progress');

  const statusLabel = r.done
    ? `<span style="color:#2ed573; font-weight:700;">✓ Сдержана (+${st.reward} ОП)</span>`
    : (!r.minMet && st.penalty > 0
        ? `<span style="color:#ff4757; font-weight:700;">✗ Нарушена (−${st.penalty} ОП)</span>`
        : `<span style="color:var(--text-muted);">в процессе</span>`);

  const minRulesHTML = st.minRules.length > 0
    ? `
      <div style="font-size:0.78rem; color:var(--text-muted); margin-top:6px;">
        <strong style="color:var(--text);">Условия соблюдения:</strong>
        <ul style="padding-left:18px; margin-top:4px;">
          ${st.minRules.map(rule => `<li>${escapeHtml(rule)}</li>`).join('')}
        </ul>
      </div>
    `
    : '';

  return `
    <div class="stake-tracker-row stake-${rowClass}">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; flex-wrap:wrap; margin-bottom:6px;">
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <strong style="color:#fff;">${escapeHtml(st.name)}</strong>
          <span class="stake-option-class class-${st.class}">${escapeHtml(st.classLabel)}</span>
          <span style="color:var(--gold); font-weight:700; font-size:0.85rem;">${st.cost} МИ</span>
        </div>
        ${statusLabel}
      </div>

      <div style="font-size:0.9rem; color:var(--text); margin-bottom:8px;">
        ${escapeHtml(st.description)}
      </div>

      ${minRulesHTML}

      <div style="display:flex; gap:16px; flex-wrap:wrap; margin-top:10px; padding-top:8px; border-top:1px solid var(--border);">
        <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:0.9rem;">
          <input type="checkbox" data-stake-id="${st.id}" data-field="done" ${r.done ? 'checked' : ''}
                 style="width:18px; height:18px; accent-color:#2ed573;">
          <span>Сдержана</span>
        </label>
        <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:0.9rem;">
          <input type="checkbox" data-stake-id="${st.id}" data-field="minMet" ${r.minMet ? 'checked' : ''}
                 style="width:18px; height:18px; accent-color:var(--gold);">
          <span>Условие соблюдено</span>
        </label>
      </div>
    </div>
  `;
}