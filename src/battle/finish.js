// src/battle/finish.js
import { gameState, currentUser, saveLocalMatch, getPlayerName, getStorageKey, initGameState } from './state.js';
import { getFactionFromClan } from '../core/data.js';
import { saveUserMatch } from '../core/firebase.js';
import { renderDashboard } from './render.js';
import { getLogAsText } from './notes.js';
import { escapeHtml } from '../utils/escape.js';
import { getSelectedStakes } from './stakes-utils.js';

export function initFinishMatch() {
  const finishBtn = document.getElementById('btn-finish-match');
  if (finishBtn) finishBtn.addEventListener('click', openFinishModal);

  const resetBtn = document.getElementById('btn-reset-battle');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (!confirm('Сбросить бой? Все изменения (ХП, статусы, раунд, ОП) будут потеряны, но ростер останется.')) return;
      localStorage.removeItem(getStorageKey());
      initGameState();
      renderDashboard();
    });
  }
}

/**
 * Итог по клятвам: набрано, потеряно, чистыми + детали.
 */
function computeStakesSummary() {
  const stakes = getSelectedStakes();
  const results = gameState?.stakeResults || {};
  let earned = 0;
  let lost = 0;

  const details = stakes.map(st => {
    const r = results[st.id] || { done: false, minMet: false };
    if (r.done) {
      earned += st.reward;
    } else if (!r.minMet && st.penalty > 0) {
      lost += st.penalty;
    }
    return {
      id: st.id,
      name: st.name,
      classLabel: st.classLabel,
      cost: st.cost,
      reward: st.reward,
      penalty: st.penalty,
      done: !!r.done,
      minMet: !!r.minMet
    };
  });

  return { stakes, details, earned, lost, net: earned - lost };
}

export function openFinishModal() {
  const modal = document.getElementById('finish-modal');
  const body = document.getElementById('finish-modal-body');
  if (!modal || !body || !gameState) return;

  let autoResult = 'draw';
  if (gameState.vpOwn > gameState.vpOpp) autoResult = 'win';
  else if (gameState.vpOwn < gameState.vpOpp) autoResult = 'loss';

  const stakesSummary = computeStakesSummary();

  const stakesBlockHTML = stakesSummary.details.length === 0
    ? `<p style="color:var(--text-muted); font-size:0.9rem;">Клятвы не выбраны или не отмечены.</p>`
    : `
      <div style="background:rgba(0,0,0,0.2); border:1px solid var(--border); border-radius:8px; padding:12px 14px; margin-top:8px;">
        <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:8px;">Отметки клятв на момент завершения:</div>
        <div style="display:flex; flex-direction:column; gap:6px;">
          ${stakesSummary.details.map(d => {
            const status = d.done
              ? `<span style="color:#2ed573; font-weight:700;">✓ +${d.reward} ОП</span>`
              : (!d.minMet && d.penalty > 0
                  ? `<span style="color:#ff4757; font-weight:700;">✗ −${d.penalty} ОП</span>`
                  : `<span style="color:var(--text-muted);">в процессе</span>`);
            return `
              <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; font-size:0.88rem;">
                <span><strong>${escapeHtml(d.name)}</strong> <span style="color:var(--text-muted);">[${escapeHtml(d.classLabel)}]</span></span>
                ${status}
              </div>
            `;
          }).join('')}
        </div>
        <div style="margin-top:10px; padding-top:8px; border-top:1px solid var(--border); font-size:0.9rem; display:flex; gap:12px; flex-wrap:wrap;">
          <span style="color:#2ed573;">Сдержано: +${stakesSummary.earned} ОП</span>
          ${stakesSummary.lost > 0 ? `<span style="color:#ff4757;">Цена: −${stakesSummary.lost} ОП</span>` : ''}
          <span style="color:var(--gold); font-weight:700;">Итог: ${stakesSummary.net >= 0 ? '+' : ''}${stakesSummary.net} ОП</span>
        </div>
      </div>
    `;

  body.innerHTML = `
    <h2 style="color:var(--gold); border-bottom:2px solid var(--border); padding-bottom:8px;">🏁 Завершить матч</h2>
    <p style="color:var(--text-muted); margin-top:8px; font-size:0.9rem;">
      Запись уйдёт в историю матчей ${currentUser ? 'облачного аккаунта' : 'этого браузера'}.
    </p>

    ${stakesBlockHTML}

    <div style="margin-top:16px;">
      <div class="form-row">
        <label>Имя оппонента *</label>
        <input type="text" id="fm-opponent" placeholder="Например: Алексей">
      </div>
      <div class="form-row">
        <label>Ранг оппонента</label>
        <input type="text" id="fm-rank" placeholder="Например: Ветеран / 2 ранг">
      </div>
      <div class="form-row">
        <label>Фракция / Клан оппонента</label>
        <input type="text" id="fm-faction" placeholder="Например: Кхад-Дарум: Клан Рунных Кузнецов">
      </div>
      <div class="form-row">
        <label>Результат</label>
        <div class="result-buttons" id="fm-result-buttons">
          <button data-result="win"  class="${autoResult === 'win'  ? 'active' : ''}">🏆 Победа</button>
          <button data-result="loss" class="${autoResult === 'loss' ? 'active' : ''}">💀 Поражение</button>
          <button data-result="draw" class="${autoResult === 'draw' ? 'active' : ''}">🤝 Ничья</button>
        </div>
      </div>
      <div class="form-row" style="display:flex; flex-direction:row; gap:12px;">
        <div style="flex:1;">
          <label>Мои ОП</label>
          <input type="number" id="fm-vp-own" value="${gameState.vpOwn}" min="0">
        </div>
        <div style="flex:1;">
          <label>ОП оппонента</label>
          <input type="number" id="fm-vp-opp" value="${gameState.vpOpp}" min="0">
        </div>
        <div style="flex:1;">
          <label>Раундов сыграно</label>
          <input type="number" id="fm-round" value="${gameState.round}" min="1">
        </div>
      </div>
      <div class="form-row">
        <label>Заметки (что было интересного)</label>
        <textarea id="fm-notes" placeholder="Опционально"></textarea>
      </div>
    </div>

    <div id="fm-message"></div>

    <div style="margin-top:16px; display:flex; gap:10px; flex-wrap:wrap;">
      <button class="builder-action-btn primary" id="fm-save" style="flex:1; min-width:150px;">💾 Сохранить матч</button>
      <button class="builder-action-btn" id="fm-save-and-clear" style="flex:1; min-width:150px;">💾 Сохранить и очистить бой</button>
    </div>
  `;

  let selectedResult = autoResult;
  body.querySelectorAll('#fm-result-buttons button').forEach(btn => {
    btn.addEventListener('click', () => {
      body.querySelectorAll('#fm-result-buttons button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedResult = btn.dataset.result;
    });
  });

  async function doSave(clearAfter) {
    const opponent = document.getElementById('fm-opponent').value.trim();
    const rank = document.getElementById('fm-rank').value.trim();
    const faction = document.getElementById('fm-faction').value.trim();
    const vpOwn = parseInt(document.getElementById('fm-vp-own').value, 10) || 0;
    const vpOpp = parseInt(document.getElementById('fm-vp-opp').value, 10) || 0;
    const round = parseInt(document.getElementById('fm-round').value, 10) || 1;
    const notes = document.getElementById('fm-notes').value.trim();
    const msgEl = document.getElementById('fm-message');

    if (!opponent) {
      msgEl.innerHTML = '<div class="form-error">Введите имя оппонента.</div>';
      return;
    }

    const payload = {
      playerName: getPlayerName(),
      myRosterName: gameState.name,
      myClan: gameState.clan,
      myFaction: getFactionFromClan(gameState.clan) || 'Неизвестно',
      opponent,
      rank: rank || 'Новичок',
      faction: faction || 'Не указана',
      result: selectedResult,
      vpOwn,
      vpOpp,
      round,
      notes,
      battleLog: getLogAsText(),
      stakesSummary: {
        earned: stakesSummary.earned,
        lost: stakesSummary.lost,
        net: stakesSummary.net,
        details: stakesSummary.details
      },
      date: new Date().toISOString()
    };

    try {
      if (currentUser) {
        await saveUserMatch(currentUser.uid, payload);
        msgEl.innerHTML = '<div class="form-info">Матч сохранён в облако ✅</div>';
      } else {
        saveLocalMatch(payload);
        msgEl.innerHTML = '<div class="form-info">Матч сохранён локально ✅ (войдите в аккаунт, чтобы хранить в облаке)</div>';
      }

      if (clearAfter) {
        localStorage.removeItem(getStorageKey());
        setTimeout(() => {
          closeFinishModal();
          initGameState();
          renderDashboard();
        }, 700);
      } else {
        setTimeout(() => closeFinishModal(), 700);
      }
    } catch (err) {
      console.error('save match error:', err);
      msgEl.innerHTML = `<div class="form-error">Ошибка сохранения: ${escapeHtml(err?.message || 'неизвестная')}</div>`;
    }
  }

  document.getElementById('fm-save').addEventListener('click', () => doSave(false));
  document.getElementById('fm-save-and-clear').addEventListener('click', () => doSave(true));

  modal.classList.remove('hidden');
}

export function closeFinishModal() {
  document.getElementById('finish-modal')?.classList.add('hidden');
}