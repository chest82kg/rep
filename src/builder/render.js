// src/builder/render.js
import { DATABASE } from '../core/data.js';
import {
  roster,
  ARMY_BUDGET,
  ARMY_MIN,
  STAKES_BUDGET,
  STAKES_LIST,
  getTotalArmyCost,
  getCommanderInfo,
  getArmyWarnings,
  getSelectedStakes,
  getStakesCost,
  buildRosterPayload
} from './state.js';
import {
  ARTIFACTS_LIST,
  getAvailableArtifacts,
  getUsedArtifacts,
  getArtifactsCost,
  canAddArtifact,
  addArtifact,
  removeArtifact,
  setArtifactTarget
} from './artifacts.js';
import { renderStakesList } from './stakes.js';
import { updateAvailableUnits, removeUnitFromRoster } from './units.js';
import { initAuthWatcher, saveRoster, openLoadModal, exportPdf, exportRosterJson, importRosterJson } from './storage.js';
import { escapeHtml } from '../utils/escape.js';

const MOBILE_BREAKPOINT = 768;

// --- Утилиты для HTML-шаблонов ---
function renderCard({ id, title, badge, body, open = true }) {
  return `
    <details class="builder-card" id="${id}" ${open ? 'open' : ''}>
      <summary>
        <span class="summary-title">${escapeHtml(title)}</span>
        ${badge ? `<span class="builder-budget-badge" id="${badge.id}" style="${badge.style || ''}">${badge.text}</span>` : ''}
      </summary>
      <div class="builder-card-body">${body}</div>
    </details>
  `;
}

function getBudgetColor(totalPts) {
  if (totalPts > ARMY_BUDGET) return '#ff4757';
  if (totalPts >= ARMY_MIN) return '#2ed573';
  return '#ffa502';
}

export function renderBuilderUI(container) {
  container.innerHTML = `
    <h1>Конструктор армий (Билдер)</h1>
    <p>Сформируйте ростер: выберите клан, добавьте отряды, купите артефакты и дайте клятвы.</p>

    <div class="builder-container">
      ${renderCard({
        id: 'bc-save',
        title: '💾 Сохранение и загрузка',
        badge: { id: 'builder-user-status', text: 'Гость', style: 'background:#2a2a3a; color: var(--text-muted);' },
        body: `
          <div class="builder-btn-row">
            <button id="btn-save-roster" class="builder-action-btn primary">💾 Сохранить ростер</button>
            <button id="btn-load-roster" class="builder-action-btn">📂 Загрузить ростер</button>
            <button id="btn-load-preset" class="builder-action-btn">📚 Готовый ростер</button>
            <button id="btn-export-json" class="builder-action-btn">📤 Экспорт JSON</button>
            <button id="btn-import-json" class="builder-action-btn">📥 Импорт JSON</button>
            <button id="btn-reset-roster" class="builder-action-btn" style="background: rgba(255,71,87,0.15); border-color:#ff4757; color:#ff4757;">🔄 Сбросить ростер</button>
          </div>
          <div id="builder-save-message" style="margin-top: 12px;"></div>
        `
      })}

      ${renderCard({
        id: 'bc-clan',
        title: '1. Название и Клан армии',
        body: `
          <div class="builder-form-group">
            <label for="builder-roster-name">Название ростера:</label>
            <input type="text" id="builder-roster-name" class="search-input" value="${escapeHtml(roster.name)}">
          </div>
          <div class="builder-form-group">
            <label for="builder-faction-select">Выберите Клан:</label>
            <select id="builder-faction-select" class="search-input">
              <option value="">-- Выберите клан --</option>
              <option value="Клан 1 — Клан Железной Кузни" ${roster.clan === 'Клан 1 — Клан Железной Кузни' ? 'selected' : ''}>Кхад‑Дарум: Клан Железной Кузни</option>
              <option value="Клан 2 — Клан Глубоких Троп" ${roster.clan === 'Клан 2 — Клан Глубоких Троп' ? 'selected' : ''}>Кхад‑Дарум: Клан Глубоких Троп</option>
              <option value="Клан 3 — Клан Рунных Кузнецов" ${roster.clan === 'Клан 3 — Клан Рунных Кузнецов' ? 'selected' : ''}>Кхад‑Дарум: Клан Рунных Кузнецов</option>
              <option value="Клан 1 — Клан Скорпионов" ${roster.clan === 'Клан 1 — Клан Скорпионов' ? 'selected' : ''}>Арафия: Клан Скорпионов</option>
              <option value="Клан 2 — Клан Барханов" ${roster.clan === 'Клан 2 — Клан Барханов' ? 'selected' : ''}>Арафия: Клан Барханов</option>
              <option value="Клан 3 — Клан Костяных Шаманов" ${roster.clan === 'Клан 3 — Клан Костяных Шаманов' ? 'selected' : ''}>Арафия: Клан Костяных Шаманов</option>
            </select>
          </div>
        `
      })}

      ${renderCard({
        id: 'bc-battleplan',
        title: '2. Выбор Батлплана миссии',
        body: `
          <div class="builder-form-group">
            <select id="builder-battleplan-select" class="search-input" aria-label="Батлплан">
              <option value="">-- Без батлплана (Произвольный бой) --</option>
              <option value="battleplan-1" ${roster.battleplanId === 'battleplan-1' ? 'selected' : ''}>Батлплан 1 — «Перевал»</option>
              <option value="battleplan-2" ${roster.battleplanId === 'battleplan-2' ? 'selected' : ''}>Батлплан 2 — «Речной Рубеж»</option>
              <option value="battleplan-3" ${roster.battleplanId === 'battleplan-3' ? 'selected' : ''}>Батлплан 3 — «Глухой Лес»</option>
              <option value="battleplan-4" ${roster.battleplanId === 'battleplan-4' ? 'selected' : ''}>Батлплан 4 — «Две Высоты»</option>
              <option value="battleplan-5" ${roster.battleplanId === 'battleplan-5' ? 'selected' : ''}>Батлплан 5 — «Прорыв»</option>
              <option value="battleplan-6" ${roster.battleplanId === 'battleplan-6' ? 'selected' : ''}>Батлплан 6 — «Истребление»</option>
            </select>
          </div>
        `
      })}

      ${renderCard({
        id: 'bc-units',
        title: '3. Доступные отряды клана',
        body: `
          <div id="builder-units-available">
            <p style="color: var(--text-muted);">Сначала выберите клан в первом пункте выше.</p>
          </div>
        `
      })}

      ${renderCard({
        id: 'bc-summary',
        title: '4. Состав армии (0 моделей)',
        badge: null,
        body: `
          <div id="builder-budget-bar-wrapper">
            <div class="budget-bar-labels">
              <span id="budget-bar-min-label">Мин. ${ARMY_MIN}</span>
              <span id="budget-bar-current-label">0 / ${ARMY_BUDGET}</span>
              <span id="budget-bar-max-label">${ARMY_BUDGET}</span>
            </div>
            <div class="budget-bar-track">
              <div class="budget-bar-fill" id="budget-bar-fill" style="width: 0%;"></div>
              <div class="budget-bar-min-marker" style="left: ${(ARMY_MIN / ARMY_BUDGET * 100).toFixed(1)}%;" title="Минимум ${ARMY_MIN}"></div>
            </div>
          </div>

          <div id="builder-army-warnings" style="margin-bottom: 12px; margin-top: 12px;"></div>

          <div id="builder-roster-summary">
            <p style="color: var(--text-muted);">Отряды ещё не добавлены.</p>
          </div>
        `
      }).replace('<span class="summary-title">4. Состав армии (0 моделей)</span>', '<span class="summary-title" id="builder-summary-title">4. Состав армии (0 моделей)</span>')}

      ${renderCard({
        id: 'bc-artifacts',
        title: '5. Артефакты',
        badge: { id: 'builder-artifacts-badge', text: 'Доступно: 0 / 0', style: 'background:#2a2a3a;' },
        body: `
          <p style="color: var(--text-muted); font-size:0.85rem; margin-bottom:12px;">
            Артефакты покупаются за очки армии. Максимум — по 1 на каждого Героя в ростере.
            Одна модель может нести не более 1 артефакта.
          </p>
          <div id="builder-artifacts-list"></div>
          <div id="builder-artifacts-message" style="margin-top:8px;"></div>
          <button class="builder-action-btn primary" id="btn-add-artifact" style="margin-top:12px;">+ Добавить артефакт</button>
        `
      })}

      ${renderCard({
        id: 'bc-stakes',
        title: '6. Выбор Клятв',
        badge: { id: 'builder-mi-budget', text: `Осталось: ${STAKES_BUDGET} / ${STAKES_BUDGET} МИ` },
        body: `<div class="builder-stakes-grid" id="builder-stakes-list"></div>`
      })}

      ${renderCard({
        id: 'bc-actions',
        title: '7. Действия с ростером',
        body: `
          <div class="builder-actions-grid">
            <button id="btn-show-mission" class="builder-action-btn large">📋 Сводка миссии</button>
            <button id="btn-show-army" class="builder-action-btn large">⚔️ Карточки армии</button>
            <button id="btn-export-pdf" class="builder-action-btn primary large">📄 PDF / Печать</button>
            <button id="btn-go-to-battle" class="builder-action-btn large" style="background:#2ed573; border-color:#2ed573; color:#0b0b0f; font-weight:800;">🎮 В бой</button>
          </div>
        `
      })}

      <div id="builder-display-modal" class="builder-modal hidden">
        <div class="builder-modal-content">
          <button id="builder-modal-close" class="builder-modal-close">&times;</button>
          <div id="builder-modal-body"></div>
        </div>
      </div>
    </div>

    <div id="builder-sticky-budget" class="builder-sticky-budget hidden">
      <div class="sticky-item">
        <span class="sticky-label">Очки</span>
        <strong class="sticky-value" id="sticky-pts">0 / ${ARMY_BUDGET}</strong>
      </div>
      <div class="sticky-sep"></div>
      <div class="sticky-item">
        <span class="sticky-label">Клятвы</span>
        <strong class="sticky-value" id="sticky-mi">${STAKES_BUDGET} МИ</strong>
      </div>
      <div class="sticky-sep"></div>
      <div class="sticky-item">
        <span class="sticky-label">Моделей</span>
        <strong class="sticky-value" id="sticky-units">0</strong>
      </div>
      <button class="sticky-btn" id="sticky-scroll-top" title="Наверх">↑</button>
    </div>
  `;

  initBuilderEvents();
  updateAvailableUnits();
  renderRosterSummary();
  initAuthWatcher();
  initBuilderMobile();
}

export function renderRosterSummary() {
  const container = document.getElementById('builder-roster-summary');
  const titleContainer = document.getElementById('builder-summary-title');
  if (!container || !titleContainer) return;

  titleContainer.textContent = `4. Состав армии (${roster.units.length} моделей)`;

  const totalPts = getTotalArmyCost() + getArtifactsCost();
  updateBudgetBar(totalPts);
  updateStickyBudget();
  renderArtifactsList();
  renderArmyWarnings();
  renderStakesList();

  if (roster.units.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted);">Отряды ещё не добавлены в армию.</p>`;
    return;
  }

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
      ${roster.units.map((u, idx) => `
        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02); padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border);">
          <span>
            <strong>${escapeHtml(u.uniqueKey || u.title)}</strong>
            <span style="font-size:0.8rem; color:var(--text-muted); margin-left:8px;">[${escapeHtml(u.role || '—')} • ${u.cost || 0} очков]</span>
          </span>
          <button data-action="remove-unit" data-idx="${idx}" style="background:none; border:none; color: #ff4757; cursor:pointer; font-weight:bold; font-size:0.85rem;">Удалить</button>
        </div>
      `).join('')}
    </div>
  `;

  container.querySelectorAll('button[data-action="remove-unit"]').forEach(btn => {
    btn.addEventListener('click', () => {
      removeUnitFromRoster(parseInt(btn.dataset.idx, 10));
    });
  });
}

function updateBudgetBar(totalPts) {
  const fill = document.getElementById('budget-bar-fill');
  const currentLabel = document.getElementById('budget-bar-current-label');
  if (!fill || !currentLabel) return;

  const percent = Math.min(100, (totalPts / ARMY_BUDGET) * 100);
  fill.style.width = `${percent.toFixed(1)}%`;

  const color = getBudgetColor(totalPts);
  fill.style.background = color;
  currentLabel.style.color = color;
  currentLabel.textContent = `${totalPts} / ${ARMY_BUDGET}`;
}

export function updateStickyBudget() {
  const totalPts = getTotalArmyCost() + getArtifactsCost();
  const ptsEl = document.getElementById('sticky-pts');
  const miEl = document.getElementById('sticky-mi');
  const unitsEl = document.getElementById('sticky-units');

  if (ptsEl) {
    ptsEl.textContent = `${totalPts} / ${ARMY_BUDGET}`;
    ptsEl.style.color = getBudgetColor(totalPts);
  }

  if (miEl) {
    const left = STAKES_BUDGET - getStakesCost();
    miEl.textContent = `${left} / ${STAKES_BUDGET} МИ`;
    miEl.style.color = left < 0 ? '#ff4757' : (left === 0 ? '#2ed573' : 'var(--text)');
  }

  if (unitsEl) {
    unitsEl.textContent = String(roster.units.length);
  }
}

function renderArmyWarnings() {
  const container = document.getElementById('builder-army-warnings');
  if (!container) return;
  const warnings = getArmyWarnings();
  const colors = {
    ok: { bg: 'rgba(46,213,115,0.12)', border: '#2ed573', text: '#2ed573' },
    warn: { bg: 'rgba(255,165,2,0.12)', border: '#ffa502', text: '#ffa502' },
    error: { bg: 'rgba(255,71,87,0.12)', border: '#ff4757', text: '#ff4757' },
    info: { bg: 'rgba(108,92,231,0.12)', border: '#6c5ce7', text: '#a29bfe' }
  };
  container.innerHTML = warnings.map(w => {
    const c = colors[w.level] || colors.info;
    return `<div style="background:${c.bg}; border:1px solid ${c.border}; color:${c.text}; padding:6px 10px; border-radius:6px; margin-bottom:6px; font-size:0.9rem;">${escapeHtml(w.text)}</div>`;
  }).join('');
}

// --- Артефакты ---

function renderArtifactsList() {
  const container = document.getElementById('builder-artifacts-list');
  const badge = document.getElementById('builder-artifacts-badge');
  const msgEl = document.getElementById('builder-artifacts-message');
  if (msgEl) msgEl.innerHTML = '';
  if (!container) return;

  const available = getAvailableArtifacts();
  const used = getUsedArtifacts();

  if (badge) {
    badge.textContent = `Доступно: ${available - used} / ${available}`;
    if (available === 0) {
      badge.style.background = '#2a2a3a';
      badge.style.color = 'var(--text-muted)';
    } else if (available - used === 0) {
      badge.style.background = '#ffa502';
      badge.style.color = '#0b0b0f';
    } else {
      badge.style.background = 'var(--accent)';
      badge.style.color = '#fff';
    }
  }

  if (roster.artifacts.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); font-size:0.9rem;">Артефакты не куплены.</p>`;
    return;
  }

  const unitsOptions = roster.units.map((u, idx) =>
    `<option value="${idx}">${escapeHtml(u.uniqueKey || u.title)}</option>`
  ).join('');

  container.innerHTML = roster.artifacts.map((a, idx) => {
    const art = ARTIFACTS_LIST.find(x => x.id === a.id);
    if (!art) return '';
    return `
      <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border); padding: 10px 12px; border-radius: 6px; margin-bottom: 6px;">
        <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-bottom:6px;">
          <strong style="color:#fff;">${escapeHtml(art.name)}</strong>
          <span style="color: var(--gold); font-weight:700;">${art.cost} очков</span>
        </div>
        <div style="font-size:0.82rem; color:var(--text-muted); margin-bottom:8px;">${escapeHtml(art.description)}</div>
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <label style="font-size:0.82rem; color: var(--text-muted);">На модель:</label>
          <select class="search-input artifact-target-select" data-artifact-idx="${idx}" style="padding:4px 8px; font-size:0.85rem; flex:1; min-width:150px;">
            ${unitsOptions}
          </select>
          <button class="builder-action-btn" data-remove-artifact="${idx}" style="padding:4px 10px; font-size:0.8rem; background: rgba(255,71,87,0.15); border-color:#ff4757; color:#ff4757;">Удалить</button>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('select.artifact-target-select').forEach(sel => {
    const i = parseInt(sel.dataset.artifactIdx, 10);
    if (roster.artifacts[i] && typeof roster.artifacts[i].targetIdx === 'number') {
      sel.value = roster.artifacts[i].targetIdx;
    }
    sel.addEventListener('change', () => {
      const idx = parseInt(sel.dataset.artifactIdx, 10);
      setArtifactTarget(idx, parseInt(sel.value, 10));
    });
  });

  container.querySelectorAll('button[data-remove-artifact]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.dataset.removeArtifact, 10);
      removeArtifact(i);
      renderRosterSummary();
    });
  });
}

function openArtifactPicker() {
  const modal = document.getElementById('builder-display-modal');
  const body = document.getElementById('builder-modal-body');
  if (!modal || !body) return;

  const available = getAvailableArtifacts();
  const used = getUsedArtifacts();

  if (available === 0) {
    body.innerHTML = `
      <h2 style="color:var(--gold); margin-bottom:12px;">Артефакты</h2>
      <p style="color:var(--text-muted);">В армии нет Героев. Артефакты доступны только при наличии хотя бы одного Героя — по 1 артефакту на каждого.</p>
    `;
    modal.classList.remove('hidden');
    return;
  }

  if (used >= available) {
    body.innerHTML = `
      <h2 style="color:var(--gold); margin-bottom:12px;">Артефакты</h2>
      <p style="color:var(--text-muted);">Лимит артефактов исчерпан (${used} из ${available}). Добавьте ещё Героя в ростер, чтобы купить больше.</p>
    `;
    modal.classList.remove('hidden');
    return;
  }

  body.innerHTML = `
    <h2 style="color:var(--gold); margin-bottom:16px;">Добавить артефакт</h2>
    <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:16px;">
      Доступно артефактов: ${available - used} из ${available}. Стоимость прибавится к общему бюджету армии.
    </p>

    <div style="display:flex; flex-direction:column; gap:8px;">
      ${ARTIFACTS_LIST.map(a => {
        const check = canAddArtifact(a.id);
        const disabled = !check.ok;
        return `
          <button class="builder-action-btn artifact-pick-btn ${disabled ? 'disabled' : ''}"
                  data-add-artifact-id="${a.id}"
                  ${disabled ? 'disabled' : ''}
                  title="${disabled ? escapeHtml(check.reason) : ''}"
                  style="text-align:left; padding:12px 14px; display:block; ${disabled ? 'opacity:0.45; cursor:not-allowed;' : ''}">
            <div style="display:flex; justify-content:space-between; gap:10px; margin-bottom:4px;">
              <strong style="color:#fff;">${escapeHtml(a.name)}</strong>
              <span style="color: var(--gold);">${a.cost} очков</span>
            </div>
            <div style="font-size:0.82rem; color: var(--text-muted);">${escapeHtml(a.description)}</div>
            ${disabled ? `<div style="font-size:0.78rem; color:#ffa502; margin-top:4px;">${escapeHtml(check.reason)}</div>` : ''}
          </button>
        `;
      }).join('')}
    </div>
  `;

  body.querySelectorAll('button[data-add-artifact-id]:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      const artId = btn.dataset.addArtifactId;
      const res = addArtifact(artId, 0);
      if (!res.ok) {
        const msgEl = document.getElementById('builder-artifacts-message');
        if (msgEl) {
          msgEl.innerHTML = `<div style="background:rgba(255,165,2,0.12); border:1px solid #ffa502; color:#ffa502; padding:6px 10px; border-radius:6px; font-size:0.85rem;">${escapeHtml(res.reason || 'Не удалось добавить артефакт.')}</div>`;
        }
        return;
      }
      modal.classList.add('hidden');
      renderRosterSummary();
    });
  });

  modal.classList.remove('hidden');
}

// --- События ---

function initBuilderEvents() {
  const factionSelect = document.getElementById('builder-faction-select');
  if (factionSelect) {
    factionSelect.addEventListener('change', (e) => {
      roster.clan = e.target.value;
      roster.units = [];
      roster.artifacts = [];
      updateAvailableUnits();
      renderRosterSummary();
      // renderStakesList() не вызываем — она уже вызывается внутри renderRosterSummary()
    });
  }

  const rosterNameInput = document.getElementById('builder-roster-name');
  if (rosterNameInput) {
    rosterNameInput.addEventListener('input', (e) => {
      roster.name = e.target.value;
    });
  }

  const battleplanSelect = document.getElementById('builder-battleplan-select');
  if (battleplanSelect) {
    battleplanSelect.addEventListener('change', (e) => {
      roster.battleplanId = e.target.value;
    });
  }

  const modalClose = document.getElementById('builder-modal-close');
  if (modalClose) {
    modalClose.addEventListener('click', () => {
      document.getElementById('builder-display-modal').classList.add('hidden');
    });
  }

  const btnSave = document.getElementById('btn-save-roster');
  if (btnSave) btnSave.addEventListener('click', saveRoster);

  const btnLoad = document.getElementById('btn-load-roster');
  if (btnLoad) btnLoad.addEventListener('click', openLoadModal);

  const btnExportJson = document.getElementById('btn-export-json');
  if (btnExportJson) btnExportJson.addEventListener('click', exportRosterJson);

  const btnImportJson = document.getElementById('btn-import-json');
  if (btnImportJson) btnImportJson.addEventListener('click', importRosterJson);

  const btnReset = document.getElementById('btn-reset-roster');
  if (btnReset) btnReset.addEventListener('click', resetRoster);

  const btnAddArtifact = document.getElementById('btn-add-artifact');
  if (btnAddArtifact) btnAddArtifact.addEventListener('click', openArtifactPicker);

  const btnMission = document.getElementById('btn-show-mission');
  if (btnMission) {
    btnMission.addEventListener('click', () => {
      const selectedBattleplan = DATABASE.find(i => i.id === roster.battleplanId);
      const selectedStakes = getSelectedStakes();
      const modal = document.getElementById('builder-display-modal');
      const body = document.getElementById('builder-modal-body');

      const usedArtifacts = roster.artifacts.map(a => {
        const art = ARTIFACTS_LIST.find(x => x.id === a.id);
        const targetUnit = roster.units[a.targetIdx];
        return art ? {
          name: art.name,
          cost: art.cost,
          description: art.description,
          target: targetUnit ? (targetUnit.uniqueKey || targetUnit.title) : '—'
        } : null;
      }).filter(Boolean);

      body.innerHTML = `
        <h2 style="color:var(--gold); border-bottom:2px solid var(--border); padding-bottom:8px;">📋 Сводка миссии</h2>

        <h3 style="margin-top:16px; color:var(--accent);">Клятвы (${selectedStakes.length}, ${getStakesCost()} / ${STAKES_BUDGET} МИ):</h3>
        ${selectedStakes.length === 0
          ? '<p style="color:var(--text-muted);">Клятвы не даны.</p>'
          : selectedStakes.map(st => `
              <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border); border-radius:8px; padding:12px 14px; margin-bottom:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:6px;">
                  <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    <strong style="color:#fff;">${escapeHtml(st.name)}</strong>
                    <span class="stake-option-class class-${st.class}">${st.classLabel}</span>
                  </div>
                  <span style="color:var(--gold); font-weight:700;">${st.cost} МИ</span>
                </div>
                <div style="font-size:0.9rem; color:var(--text); margin-bottom:6px;">${escapeHtml(st.description)}</div>
                <div style="display:flex; gap:10px; flex-wrap:wrap; font-size:0.8rem; margin-bottom:6px;">
                  <span style="color:#2ed573; font-weight:700;">Награда: +${st.reward} ОП</span>
                  ${st.penalty > 0
                    ? `<span style="color:#ff4757; font-weight:700;">Цена: −${st.penalty} ОП</span>`
                    : `<span style="color:var(--text-muted);">Без цены</span>`}
                </div>
                ${st.minRules.length > 0 ? `
                  <div style="font-size:0.78rem; color:var(--text-muted); margin-top:6px;">
                    <strong style="color:var(--text);">Условия соблюдения:</strong>
                    <ul style="padding-left:18px; margin-top:4px;">
                      ${st.minRules.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
                    </ul>
                  </div>
                ` : ''}
              </div>
            `).join('')
        }

        ${usedArtifacts.length > 0 ? `
          <h3 style="margin-top:24px; color:var(--accent);">Артефакты (${usedArtifacts.length}, ${getArtifactsCost()} очков):</h3>
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${usedArtifacts.map(a => `
              <div style="background:rgba(209,179,132,0.06); border:1px solid var(--border); border-radius:8px; padding:10px 12px;">
                <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-bottom:4px;">
                  <strong style="color:#fff;">${escapeHtml(a.name)}</strong>
                  <span style="color:var(--gold); font-weight:700;">${a.cost} очков</span>
                </div>
                <div style="font-size:0.82rem; color:var(--text-muted);">${escapeHtml(a.description)}</div>
                <div style="font-size:0.78rem; color:var(--accent); margin-top:4px;">Носитель: ${escapeHtml(a.target)}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <h3 style="margin-top:24px; color:var(--accent);">Батлплан: ${selectedBattleplan ? selectedBattleplan.title : 'Не выбран'}</h3>
        ${selectedBattleplan
          ? `<div style="margin-top:12px;">${selectedBattleplan.content}</div>`
          : '<p style="color:var(--text-muted);">Произвольный бой без специального сценария.</p>'}
      `;
      modal.classList.remove('hidden');
    });
  }

  const btnArmy = document.getElementById('btn-show-army');
  if (btnArmy) {
    btnArmy.addEventListener('click', () => {
      const clanArticle = DATABASE.find(item => item.title === roster.clan);
      const modal = document.getElementById('builder-display-modal');
      const body = document.getElementById('builder-modal-body');

      let cleanClanContent = '';
      if (clanArticle) {
        cleanClanContent = clanArticle.content
          .replace(/<div class="aos-card">[\s\S]*?<\/div>\s*<\/div>/g, '')
          .split(/Состав клана/i)[0];
      }

      const counts = {};
      roster.units.forEach(u => {
        counts[u.uniqueKey] = (counts[u.uniqueKey] || 0) + 1;
      });

      const uniqueCardsMap = new Map();
      roster.units.forEach(u => {
        if (!uniqueCardsMap.has(u.uniqueKey)) uniqueCardsMap.set(u.uniqueKey, u.html);
      });
      const uniqueCardsHTML = Array.from(uniqueCardsMap.values());

      const totalPts = getTotalArmyCost() + getArtifactsCost();
      const commanderInfo = getCommanderInfo();
      const selectedStakes = getSelectedStakes();
      const artifactsCost = getArtifactsCost();

      body.innerHTML = `
        <h2 style="color:#d1b384; border-bottom:2px solid var(--border); padding-bottom:8px;">⚔️ Состав и Карточки Армии</h2>
        <p style="margin-top:8px;"><strong>Ростер:</strong> ${escapeHtml(roster.name || 'Безымянный')}</p>
        <p><strong>Клан:</strong> ${escapeHtml(roster.clan || 'Не выбран')}</p>
        <p><strong>Очки армии:</strong> ${totalPts} / ${ARMY_BUDGET}${artifactsCost > 0 ? ` (артефакты: ${artifactsCost})` : ''}</p>
        <p><strong>Командир:</strong> ${commanderInfo ? escapeHtml(commanderInfo.title) : 'не назначен'}</p>
        <p><strong>Клятв дано:</strong> ${selectedStakes.length} на ${getStakesCost()} МИ</p>
        <p><strong>Артефактов:</strong> ${roster.artifacts.length}</p>

        ${cleanClanContent ? `
          <div style="margin-top:20px; background:rgba(0,0,0,0.3); padding:16px; border-radius:8px; border:1px solid var(--border);">
            <h3 style="color:var(--accent); margin-bottom:12px;">Правила и способности клана</h3>
            <div>${cleanClanContent}</div>
          </div>
        ` : ''}

        <h3 style="margin-top:24px; color:var(--accent);">Сводный состав армии (${roster.units.length} моделей):</h3>
        ${roster.units.length === 0 ? '<p style="color:var(--text-muted);">Юниты не добавлены.</p>' : `
          <ul style="padding-left:20px; margin-top:8px; margin-bottom:20px;">
            ${Object.keys(counts).map(key => `<li><strong>${escapeHtml(key)}</strong> — ${counts[key]} шт.</li>`).join('')}
          </ul>
        `}

        <h3 style="margin-top:24px; color:var(--accent);">Уникальные датакарты юнитов:</h3>
        ${uniqueCardsHTML.length === 0 ? '<p style="color:var(--text-muted);">Юниты не добавлены в ростер.</p>' : `
          <div style="display:flex; flex-direction:column; gap:16px; margin-top:12px;">
            ${uniqueCardsHTML.join('')}
          </div>
        `}
      `;
      modal.classList.remove('hidden');
    });
  }

  const btnPdf = document.getElementById('btn-export-pdf');
  if (btnPdf) {
    btnPdf.addEventListener('click', exportPdf);
  }

  const btnGoBattle = document.getElementById('btn-go-to-battle');
  if (btnGoBattle) {
    btnGoBattle.addEventListener('click', () => {
      if (roster.units.length === 0) {
        showSaveMessage('Нельзя отправить в бой пустую армию — добавьте хотя бы один отряд.', 'err');
        return;
      }
      if (!roster.clan) {
        showSaveMessage('Сначала выберите клан.', 'err');
        return;
      }

      const activeRoster = buildRosterPayload();

      try {
        localStorage.setItem('activeRoster', JSON.stringify(activeRoster));
      } catch (err) {
        console.error('Не удалось сохранить активный ростер:', err);
        showSaveMessage('Ошибка сохранения ростера в localStorage.', 'err');
        return;
      }

      window.open('play.html', '_blank');
    });
  }

  // renderStakesList() вызывается внутри renderRosterSummary(), дублировать не нужно.
}

function resetRoster() {
  const hasSomething = roster.clan || roster.units.length > 0 || roster.selectedStakes.length > 0 || roster.battleplanId || roster.artifacts.length > 0;

  if (!hasSomething) {
    showSaveMessage('Ростер уже пуст.', 'info');
    return;
  }

  if (!confirm('Сбросить ростер? Все выбранные отряды, артефакты, клятвы и настройки будут удалены.')) return;

  roster.clan = '';
  roster.battleplanId = '';
  roster.selectedStakes = [];
  roster.artifacts = [];
  roster.units = [];
  roster.name = 'Мой Ростер';

  const nameInput = document.getElementById('builder-roster-name');
  if (nameInput) nameInput.value = roster.name;

  const factionSelect = document.getElementById('builder-faction-select');
  if (factionSelect) factionSelect.value = '';

  const battleplanSelect = document.getElementById('builder-battleplan-select');
  if (battleplanSelect) battleplanSelect.value = '';

  updateAvailableUnits();
  renderStakesList();
  renderRosterSummary();

  showSaveMessage('Ростер сброшен.', 'ok');
}

function initBuilderMobile() {
  const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);

  const applyMobileState = (isMobile) => {
    const details = document.querySelectorAll('.builder-container .builder-card');
    details.forEach((det) => {
      if (isMobile) {
        det.classList.add('collapsible-mobile');
        det.open = det.id === 'bc-clan' || det.id === 'bc-battleplan' || det.id === 'bc-units';
      } else {
        det.classList.remove('collapsible-mobile');
        det.open = true;
      }
    });

    const sticky = document.getElementById('builder-sticky-budget');
    if (sticky) sticky.classList.toggle('hidden', !isMobile);

    updateStickyBudget();
  };

  applyMobileState(mq.matches);

  const handleChange = (e) => applyMobileState(e.matches);
  if (mq.addEventListener) mq.addEventListener('change', handleChange);
  else mq.addListener(handleChange);

  const stickyTop = document.getElementById('sticky-scroll-top');
  if (stickyTop) {
    stickyTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

export function showSaveMessage(text, type = 'info') {
  const el = document.getElementById('builder-save-message');
  if (!el) return;
  if (!text) { el.innerHTML = ''; return; }
  const colors = {
    ok: { bg: 'rgba(46,213,115,0.12)', border: '#2ed573', color: '#2ed573' },
    err: { bg: 'rgba(255,71,87,0.12)', border: '#ff4757', color: '#ff4757' },
    info: { bg: 'rgba(108,92,231,0.12)', border: '#6c5ce7', color: '#a29bfe' }
  };
  const c = colors[type] || colors.info;
  el.innerHTML = `<div style="background:${c.bg}; border:1px solid ${c.border}; color:${c.color}; padding:8px 12px; border-radius:6px; font-size:0.9rem;">${escapeHtml(text)}</div>`;
}

// --- Готовые ростеры ---

import { PRESET_ROSTERS } from './presets.js';

function openPresetsModal() {
  const modal = document.getElementById('builder-display-modal');
  const body = document.getElementById('builder-modal-body');
  if (!modal || !body) return;

  body.innerHTML = `
    <h2 style="color:var(--gold); border-bottom:2px solid var(--border); padding-bottom:8px;">📚 Готовые ростеры</h2>
    <p style="color:var(--text-muted); font-size:0.9rem; margin-top:8px;">
      Выберите один из заранее собранных ростеров. Его можно загрузить в билдер и сразу отправить в бой.
    </p>

    <div style="margin-top:16px; display:flex; flex-direction:column; gap:10px;">
      ${PRESET_ROSTERS.map(p => `
        <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border); padding:14px 16px; border-radius:8px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap;">
            <div style="flex:1; min-width:0;">
              <strong style="color:#fff; font-size:1.05rem;">${escapeHtml(p.name)}</strong>
              <div style="font-size:0.85rem; color:var(--accent); margin-top:2px;">
                ${escapeHtml(p.clan)}
              </div>
              <div style="font-size:0.85rem; color:var(--text-muted); margin-top:6px;">
                ${escapeHtml(p.description)}
              </div>
              <div style="font-size:0.8rem; color:var(--text-muted); margin-top:6px;">
                Состав: ${p.picks.map(pick => `${escapeHtml(pick.title)} ×${pick.count}`).join(', ')}
              </div>
            </div>
            <button class="builder-action-btn primary" data-preset-id="${p.id}" style="flex-shrink:0;">
              Загрузить
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  body.querySelectorAll('button[data-preset-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = PRESET_ROSTERS.find(p => p.id === btn.dataset.presetId);
      if (!preset) return;
      loadPreset(preset);
      modal.classList.add('hidden');
    });
  });

  modal.classList.remove('hidden');
}

function loadPreset(preset) {
  roster.clan = preset.clan;
  roster.battleplanId = '';
  roster.selectedStakes = [];
  roster.artifacts = [];
  roster.units = [];
  roster.name = preset.name;

  const nameInput = document.getElementById('builder-roster-name');
  if (nameInput) nameInput.value = roster.name;

  const factionSelect = document.getElementById('builder-faction-select');
  if (factionSelect) factionSelect.value = roster.clan;

  const battleplanSelect = document.getElementById('builder-battleplan-select');
  if (battleplanSelect) battleplanSelect.value = '';

  const clanArticle = DATABASE.find(item => item.title === preset.clan);
  if (!clanArticle) {
    showSaveMessage('Клан не найден в базе.', 'err');
    return;
  }

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = clanArticle.content;
  const cards = Array.from(tempDiv.querySelectorAll('.aos-card'));

  preset.picks.forEach(pick => {
    for (let i = 0; i < pick.count; i++) {
      const card = cards.find(c => {
        const title = c.querySelector('.aos-title')?.textContent?.trim();
        return title === pick.title;
      });

      if (!card) {
        console.warn('Не найден юнит для готового ростера:', pick.title);
        continue;
      }

      const roleEl = card.querySelector('.aos-badge-role');
      const role = roleEl?.textContent || 'Базовый';
      const costText = card.querySelector('.aos-badge-pts')?.textContent || '';
      const costMatch = costText.match(/(\d+)/);
      const cost = costMatch ? parseInt(costMatch[1]) : 0;

      let unitHTML = card.outerHTML;

      const weapons = card.querySelectorAll('.aos-weapon-item');
      if (weapons.length > 1) {
        const tempCard = document.createElement('div');
        tempCard.innerHTML = unitHTML;
        const weaponItems = tempCard.querySelectorAll('.aos-weapon-item');
        for (let w = 1; w < weaponItems.length; w++) {
          weaponItems[w].remove();
        }
        const divider = tempCard.querySelector('div[style*="--accent"]');
        if (divider) divider.remove();
        unitHTML = tempCard.innerHTML;
      }

      roster.units.push({
        title: pick.title,
        uniqueKey: pick.title,
        html: unitHTML,
        role,
        cost
      });
    }
  });

  if (Array.isArray(preset.stakes)) {
    preset.stakes.forEach(stakeId => {
      const stakeExists = STAKES_LIST.some(s => s.id === stakeId);
      if (stakeExists) {
        roster.selectedStakes.push(stakeId);
      } else {
        console.warn('Клятва не найдена:', stakeId);
      }
    });
  }

  updateAvailableUnits();
  renderStakesList();
  renderRosterSummary();

  showSaveMessage(`Ростер «${preset.name}» загружен (${roster.units.length} моделей, ${getStakesCost()} МИ клятв).`, 'ok');
}