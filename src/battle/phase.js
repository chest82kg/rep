// src/battle/phase.js
import { gameState, saveGameStateNow } from './state.js';
import { renderDashboard } from './render.js';
import { tickResourcesAtRoundStart } from './resources.js';

const PHASES = [
  {
    id: 'phase-1',
    title: 'Фаза 1 — Планирование и Инициатива',
    steps: [
      'Приток ресурсов: 2 ОД + 1 ОД за живого Командира + Резерв прошлого раунда (кроме 1-го раунда).',
      'Компенсация второму игроку: +1 Фракционный ОД тому, кто ходит вторым.',
      'Определение очерёдности: игрок с Абсолютным приоритетом решает, кто ходит первым.',
      'Распределение приказов: игроки одновременно активируют модели, бросают кубики, распределяют приказы.'
    ]
  },
  {
    id: 'phase-2',
    title: 'Фаза 2 — Активация моделей',
    steps: [
      'Бросок пула кубиков каждой моделью (База 3 / Элита 4 / Герой 5).',
      'Распределение выпавших значений на движение, атаку, защиту.',
      'Вмешательство за ОД: сдвиг грани (+1/-1), переброс, добавление кубика.',
      'Заработок Резерва: жетон за успешные действия уходит в Резерв (придёт в следующем раунде).',
      'Отмечайте активированных юнитов кнопкой «○ Отметить активированным».'
    ]
  },
  {
    id: 'phase-3',
    title: 'Фаза 3 — Конец раунда',
    steps: [
      'Подсчёт ПО: начисление по миссии и за контрольные точки.',
      'Перенос Резерва и Сгорание: неиспользованные ОД сгорают, Резерв переходит в пул.',
      'Проверка Приоритета: уступающий по ПО получает Абсолютный приоритет на следующий раунд.',
      'Очистка: сброс временных эффектов, маркеров и стоек.',
      'Тикающие статусы: Яд и Горение наносят по 1 урону в начале/конце раунда.'
    ]
  }
];

function getChecklistKey() {
  const name = gameState?.name || 'default';
  return `wargame_phase_checklist_${name}_${window.location.search}`;
}

function loadChecklist() {
  try {
    return JSON.parse(localStorage.getItem(getChecklistKey()) || '{}');
  } catch {
    return {};
  }
}

function saveChecklist(state) {
  localStorage.setItem(getChecklistKey(), JSON.stringify(state));
}

export function initPhaseHelper() {
  const btn = document.getElementById('btn-phase-helper');
  if (btn) btn.addEventListener('click', openPhaseModal);
}

export function openPhaseModal() {
  const modal = document.getElementById('phase-modal');
  const body = document.getElementById('phase-modal-body');
  if (!modal || !body) return;

  const checklist = loadChecklist();

  body.innerHTML = `
    <h2 style="color:var(--gold); border-bottom:2px solid var(--border); padding-bottom:8px;">⚙️ Фазы раунда ${gameState.round}</h2>
    <p style="color:var(--text-muted); margin-top:8px; font-size:0.9rem;">
      Отмечайте галочки по мере прохождения. Кнопка «Закончить раунд» внизу — сдвинет счётчик раунда, применит тикающие статусы и сбросит чек-лист.
    </p>

    <div style="margin-top:16px; display:flex; flex-direction:column; gap:16px;">
      ${PHASES.map(phase => `
        <div style="background: rgba(0,0,0,0.2); border:1px solid var(--border); border-radius:10px; padding:14px 16px;">
          <h3 style="color:var(--accent); margin-bottom:10px; font-size:1rem;">${phase.title}</h3>
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${phase.steps.map((step, idx) => {
              const key = `${phase.id}-${idx}`;
              const checked = checklist[key] ? 'checked' : '';
              return `
                <label style="display:flex; gap:10px; align-items:flex-start; cursor:pointer; padding:6px 8px; border-radius:6px; transition:background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background='transparent'">
                  <input type="checkbox" data-check-key="${key}" ${checked} style="margin-top:3px; flex-shrink:0; width:16px; height:16px; accent-color: var(--accent);">
                  <span style="font-size:0.9rem; line-height:1.4;">${step}</span>
                </label>
              `;
            }).join('')}
          </div>
        </div>
      `).join('')}
    </div>

    <div style="margin-top:20px; display:flex; gap:10px; flex-wrap:wrap;">
      <button class="builder-action-btn primary" id="phase-end-round" style="flex:1; min-width:150px;">🏁 Закончить раунд</button>
      <button class="builder-action-btn" id="phase-reset" style="flex:1; min-width:150px;">↺ Сбросить галочки</button>
    </div>
  `;

  body.querySelectorAll('input[data-check-key]').forEach(chk => {
    chk.addEventListener('change', () => {
      const state = loadChecklist();
      state[chk.dataset.checkKey] = chk.checked;
      saveChecklist(state);
    });
  });

  const endBtn = body.querySelector('#phase-end-round');
  if (endBtn) endBtn.addEventListener('click', () => {
    closePhaseModal();
    endRound();
  });

  const resetBtn = body.querySelector('#phase-reset');
  if (resetBtn) resetBtn.addEventListener('click', () => {
    if (!confirm('Сбросить все галочки фаз?')) return;
    saveChecklist({});
    openPhaseModal();
  });

  modal.classList.remove('hidden');
}

export function closePhaseModal() {
  document.getElementById('phase-modal')?.classList.add('hidden');
}

export function endRound() {
  if (!gameState) return;

  const tickReport = applyTickStatuses(true);

  const summary = tickReport.length > 0
    ? `Закончить раунд ${gameState.round}?\n\nТикающие статусы:\n${tickReport.join('\n')}\n\nСледующий раунд: ${gameState.round + 1}`
    : `Закончить раунд ${gameState.round}? Следующий раунд: ${gameState.round + 1}`;

  if (!confirm(summary)) return;

  applyTickStatuses(false);

  gameState.units.forEach(u => {
    if (Array.isArray(u.statuses)) {
      u.statuses = u.statuses.filter(st => st.type !== 'fatigue');
    }
  });

  gameState.units.forEach(u => { u.activated = false; });

gameState.round = Math.min(5, gameState.round + 1);
saveGameStateNow();

  // Приток Маны и Веры в начале нового раунда
  tickResourcesAtRoundStart();

  saveChecklist({});

  renderDashboard();
}

/**
 * Применяет тикающие статусы (Яд, Горение).
 * @param {boolean} dryRun — если true, только генерирует отчёт, не меняет ХП.
 * @returns {string[]} — отчёт для dryRun.
 */
function applyTickStatuses(dryRun = false) {
  const report = [];
  if (!gameState || !Array.isArray(gameState.units)) return report;

  gameState.units.forEach((u, idx) => {
    if (u.currentHp <= 0) return;
    if (!Array.isArray(u.statuses)) return;

    u.statuses.forEach(st => {
      const unitLabel = `#${idx + 1} ${u.title || 'отряд'}`;
      let statusName = '';
      if (st.type === 'poison') statusName = 'Яд';
      if (st.type === 'fire') statusName = 'Горение';

      if (!statusName) return;

      if (dryRun) {
        report.push(`• ${unitLabel}: ${statusName} — минус 1 ХП (${u.currentHp} → ${Math.max(0, u.currentHp - 1)})`);
      } else {
        u.currentHp = Math.max(0, u.currentHp - 1);
      }
    });
  });

  return report;
}