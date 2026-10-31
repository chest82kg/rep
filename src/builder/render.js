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
  canAssignArtifact,
  addArtifact,
  removeArtifact,
  setArtifactTarget,
  validateRosterArtifacts,
  getUnitCardGroupKey
} from './artifacts.js';

import { renderStakesList } from './stakes.js';

import {
  updateAvailableUnits,
  removeUnitFromRoster
} from './units.js';

import {
  initAuthWatcher,
  saveRoster,
  openLoadModal,
  exportPdf,
  exportRosterJson,
  importRosterJson
} from './storage.js';

import { PRESET_ROSTERS } from './presets.js';
import { escapeHtml } from '../utils/escape.js';
import { showToast } from '../ui/toast.js';
import { normalizeOfficialRoster } from './roster-import.js';

const MOBILE_BREAKPOINT = 768;

const ROLE_SORT_ORDER = {
  basic: 1,
  elite: 2,
  hero: 3,
  other: 4
};

/* ==========================================================================
   Сортировка моделей
   ========================================================================== */

function getRoleSortKey(role) {
  const normalizedRole = String(role || '').toLowerCase();

  if (normalizedRole.includes('базов')) return 'basic';
  if (normalizedRole.includes('элит')) return 'elite';
  if (normalizedRole.includes('герой')) return 'hero';

  return 'other';
}

/**
 * Базовые → Элита → Герои → Прочие,
 * затем название и вариант вооружения.
 */
function sortRosterUnits(items) {
  return [...items].sort((a, b) => {
    const roleA = ROLE_SORT_ORDER[getRoleSortKey(a.role)] || 99;
    const roleB = ROLE_SORT_ORDER[getRoleSortKey(b.role)] || 99;

    if (roleA !== roleB) return roleA - roleB;

    const titleComparison = String(a.title || '').localeCompare(
      String(b.title || ''),
      'ru',
      { sensitivity: 'base' }
    );

    if (titleComparison !== 0) return titleComparison;

    return String(a.uniqueKey || a.title || '').localeCompare(
      String(b.uniqueKey || b.title || ''),
      'ru',
      { sensitivity: 'base' }
    );
  });
}

/* ==========================================================================
   Карточки с артефактами
   ========================================================================== */

function getArtifactsForUnit(unitIndex) {
  return roster.artifacts
    .filter(artifact => artifact.targetIdx === unitIndex)
    .map(artifact =>
      ARTIFACTS_LIST.find(item => item.id === artifact.id)
    )
    .filter(Boolean);
}

/**
 * Дополняет отображаемую датакарту предметами носителя.
 * Исходный HTML в roster.units не изменяется.
 */
function renderUnitCardWithArtifacts(unit, unitIndex) {
  const artifacts = getArtifactsForUnit(unitIndex);

  if (artifacts.length === 0) {
    return unit.html;
  }

  const wrapper = document.createElement('div');
  wrapper.innerHTML = unit.html;

  const card = wrapper.querySelector('.aos-card');

  if (!card) {
    return unit.html;
  }

  const bonuses = artifacts.reduce((result, artifact) => {
    const statBonuses = artifact.statBonuses || {};

    result.hp += Number(statBonuses.hp || 0);
    result.armor += Number(statBonuses.armor || 0);
    result.move += Number(statBonuses.move || 0);

    return result;
  }, {
    hp: 0,
    armor: 0,
    move: 0
  });

  const bonusSources = {
    hp: artifacts
      .filter(artifact =>
        Number(artifact.statBonuses?.hp || 0) !== 0
      )
      .map(artifact => artifact.name),

    armor: artifacts
      .filter(artifact =>
        Number(artifact.statBonuses?.armor || 0) !== 0
      )
      .map(artifact => artifact.name),

    move: artifacts
      .filter(artifact =>
        Number(artifact.statBonuses?.move || 0) !== 0
      )
      .map(artifact => artifact.name)
  };

  const statMap = {
    'ХП': 'hp',
    'HP': 'hp',
    'БРОНЯ': 'armor',
    'ДВИЖЕНИЕ': 'move'
  };

  card.querySelectorAll('.aos-stat-box').forEach(statBox => {
    const label = statBox
      .querySelector('.aos-stat-label')
      ?.textContent
      ?.trim()
      ?.toUpperCase();

    const valueElement = statBox.querySelector('.aos-stat-value');

    if (!label || !valueElement) return;

    const bonusKey = statMap[label];
    const bonus = bonuses[bonusKey] || 0;

    if (!bonusKey || bonus === 0) return;

    const baseValue = parseInt(valueElement.textContent, 10);

    if (!Number.isFinite(baseValue)) return;

    const totalValue = baseValue + bonus;
    const sourceText = bonusSources[bonusKey].join(', ');

    valueElement.innerHTML = `
      <span class="artifact-stat-total">${totalValue}</span>
      <span class="artifact-stat-bonus">(+${bonus})</span>
    `;

    statBox.classList.add('has-artifact-stat-bonus');

    statBox.title =
      `Базовое значение: ${baseValue}. ` +
      `Бонус: +${bonus} — ${sourceText}.`;
  });

  const artifactsHTML = artifacts.map(artifact => {
    const description =
      artifact.description || 'Описание артефакта не указано.';

    const statBonuses = artifact.statBonuses || {};
    const bonusLabels = [];

    if (statBonuses.hp) {
      bonusLabels.push(`+${statBonuses.hp} ХП`);
    }

    if (statBonuses.armor) {
      bonusLabels.push(`+${statBonuses.armor} к Броне`);
    }

    if (statBonuses.move) {
      bonusLabels.push(`+${statBonuses.move} к Движению`);
    }

    return `
      <div class="roster-card-artifact">
        <div class="roster-card-artifact-header">
          <strong>${escapeHtml(artifact.name)}</strong>
          <span>${artifact.cost} очков</span>
        </div>

        ${bonusLabels.length > 0 ? `
          <div class="roster-card-artifact-bonus">
            Применено: ${escapeHtml(bonusLabels.join(', '))}
          </div>
        ` : ''}

        <p>${escapeHtml(description)}</p>
      </div>
    `;
  }).join('');

  card.insertAdjacentHTML('beforeend', `
    <section class="roster-card-artifacts">
      <h4>Артефакты носителя</h4>
      ${artifactsHTML}
    </section>
  `);

  return wrapper.innerHTML;
}

/* ==========================================================================
   HTML-шаблоны
   ========================================================================== */

function renderCard({ id, title, badge, body, open = true }) {
  return `
    <details class="builder-card" id="${id}" ${open ? 'open' : ''}>
      <summary>
        <span class="summary-title">${escapeHtml(title)}</span>

        ${badge ? `
          <span class="builder-budget-badge"
                id="${badge.id}"
                style="${badge.style || ''}">
            ${badge.text}
          </span>
        ` : ''}
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

/* ==========================================================================
   Основной интерфейс
   ========================================================================== */

export function renderBuilderUI(container) {
  container.innerHTML = `
    <h1>Конструктор армий (Билдер)</h1>

    <p>
      Сформируйте ростер: выберите клан, добавьте отряды,
      купите артефакты и дайте клятвы.
    </p>

    <div class="builder-container">
      ${renderCard({
        id: 'bc-save',
        title: '💾 Сохранение и загрузка',
        badge: {
          id: 'builder-user-status',
          text: 'Гость',
          style: 'background:#2a2a3a; color:var(--text-muted);'
        },
        body: `
          <div class="builder-btn-row">
            <button type="button"
                    id="btn-save-roster"
                    class="builder-action-btn primary">
              💾 Сохранить ростер
            </button>

            <button type="button"
                    id="btn-load-roster"
                    class="builder-action-btn">
              📂 Загрузить ростер
            </button>

            <button type="button"
                    id="btn-load-preset"
                    class="builder-action-btn">
              📚 Готовый ростер
            </button>

            <button type="button"
                    id="btn-export-json"
                    class="builder-action-btn">
              📤 Экспорт JSON
            </button>

            <button type="button"
                    id="btn-import-json"
                    class="builder-action-btn">
              📥 Импорт JSON
            </button>

            <button type="button"
                    id="btn-reset-roster"
                    class="builder-action-btn"
                    style="
                      background:rgba(255,71,87,0.15);
                      border-color:#ff4757;
                      color:#ff4757;
                    ">
              🔄 Сбросить ростер
            </button>
          </div>

          <div id="builder-save-message"
               style="margin-top:12px;"></div>
        `
      })}

      ${renderCard({
        id: 'bc-clan',
        title: '1. Название и Клан армии',
        body: `
          <div class="builder-form-group">
            <label for="builder-roster-name">
              Название ростера:
            </label>

            <input type="text"
                   id="builder-roster-name"
                   class="search-input"
                   value="${escapeHtml(roster.name)}">
          </div>

          <div class="builder-form-group">
            <label for="builder-faction-select">
              Выберите Клан:
            </label>

            <select id="builder-faction-select" class="search-input">
              <option value="">-- Выберите клан --</option>

              <option value="Клан 1 — Клан Железной Кузни"
                ${roster.clan === 'Клан 1 — Клан Железной Кузни'
                  ? 'selected' : ''}>
                Кхад‑Дарум: Клан Железной Кузни
              </option>

              <option value="Клан 2 — Клан Глубоких Троп"
                ${roster.clan === 'Клан 2 — Клан Глубоких Троп'
                  ? 'selected' : ''}>
                Кхад‑Дарум: Клан Глубоких Троп
              </option>

              <option value="Клан 3 — Клан Рунных Кузнецов"
                ${roster.clan === 'Клан 3 — Клан Рунных Кузнецов'
                  ? 'selected' : ''}>
                Кхад‑Дарум: Клан Рунных Кузнецов
              </option>

              <option value="Клан 1 — Клан Скорпионов"
                ${roster.clan === 'Клан 1 — Клан Скорпионов'
                  ? 'selected' : ''}>
                Арафия: Клан Скорпионов
              </option>

              <option value="Клан 2 — Клан Барханов"
                ${roster.clan === 'Клан 2 — Клан Барханов'
                  ? 'selected' : ''}>
                Арафия: Клан Барханов
              </option>

              <option value="Клан 3 — Клан Костяных Шаманов"
                ${roster.clan === 'Клан 3 — Клан Костяных Шаманов'
                  ? 'selected' : ''}>
                Арафия: Клан Костяных Шаманов
              </option>
            </select>
          </div>
        `
      })}

      ${renderCard({
        id: 'bc-battleplan',
        title: '2. Выбор Батлплана миссии',
        body: `
          <div class="builder-form-group">
            <select id="builder-battleplan-select"
                    class="search-input"
                    aria-label="Батлплан">

              <option value="">
                -- Без батлплана (Произвольный бой) --
              </option>

              <option value="battleplan-1"
                ${roster.battleplanId === 'battleplan-1'
                  ? 'selected' : ''}>
                Батлплан 1 — «Перевал»
              </option>

              <option value="battleplan-2"
                ${roster.battleplanId === 'battleplan-2'
                  ? 'selected' : ''}>
                Батлплан 2 — «Речной Рубеж»
              </option>

              <option value="battleplan-3"
                ${roster.battleplanId === 'battleplan-3'
                  ? 'selected' : ''}>
                Батлплан 3 — «Глухой Лес»
              </option>

              <option value="battleplan-4"
                ${roster.battleplanId === 'battleplan-4'
                  ? 'selected' : ''}>
                Батлплан 4 — «Две Высоты»
              </option>

              <option value="battleplan-5"
                ${roster.battleplanId === 'battleplan-5'
                  ? 'selected' : ''}>
                Батлплан 5 — «Прорыв»
              </option>

              <option value="battleplan-6"
                ${roster.battleplanId === 'battleplan-6'
                  ? 'selected' : ''}>
                Батлплан 6 — «Истребление»
              </option>
            </select>
          </div>
        `
      })}

      ${renderCard({
        id: 'bc-units',
        title: '3. Доступные отряды клана',
        body: `
          <div id="builder-units-available">
            <p style="color:var(--text-muted);">
              Сначала выберите клан в первом пункте выше.
            </p>
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
              <span id="budget-bar-min-label">
                Мин. ${ARMY_MIN}
              </span>

              <span id="budget-bar-current-label">
                0 / ${ARMY_BUDGET}
              </span>

              <span id="budget-bar-max-label">
                ${ARMY_BUDGET}
              </span>
            </div>

            <div class="budget-bar-track">
              <div class="budget-bar-fill"
                   id="budget-bar-fill"
                   style="width:0%;"></div>

              <div class="budget-bar-min-marker"
                   style="
                     left:${(ARMY_MIN / ARMY_BUDGET * 100).toFixed(1)}%;
                   "
                   title="Минимум ${ARMY_MIN}"></div>
            </div>
          </div>

          <div id="builder-army-warnings"
               style="margin:12px 0;"></div>

          <div id="builder-roster-summary">
            <p style="color:var(--text-muted);">
              Отряды ещё не добавлены.
            </p>
          </div>
        `
      }).replace(
        '<span class="summary-title">4. Состав армии (0 моделей)</span>',
        '<span class="summary-title" id="builder-summary-title">' +
        '4. Состав армии (0 моделей)</span>'
      )}

      ${renderCard({
        id: 'bc-artifacts',
        title: '5. Артефакты',
        badge: {
          id: 'builder-artifacts-badge',
          text: 'Доступно: 0 / 0',
          style: 'background:#2a2a3a;'
        },
        body: `
          <p style="
            color:var(--text-muted);
            font-size:0.85rem;
            margin-bottom:12px;
          ">
            Артефакты покупаются за очки армии.
            Общий лимит — по числу Героев в ростере.
            Одна модель может нести не более 1 артефакта.
            Допустимый класс носителя определяется самим предметом.
          </p>

          <div id="builder-artifacts-list"></div>

          <div id="builder-artifacts-message"
               style="margin-top:8px;"></div>

          <button type="button"
                  class="builder-action-btn primary"
                  id="btn-add-artifact"
                  style="margin-top:12px;">
            + Добавить артефакт
          </button>
        `
      })}

      ${renderCard({
        id: 'bc-stakes',
        title: '6. Выбор Клятв',
        badge: {
          id: 'builder-mi-budget',
          text: `Осталось: ${STAKES_BUDGET} / ${STAKES_BUDGET} МИ`
        },
        body: `
          <div class="builder-stakes-grid"
               id="builder-stakes-list"></div>
        `
      })}

      ${renderCard({
        id: 'bc-actions',
        title: '7. Действия с ростером',
        body: `
          <div class="builder-actions-grid">
            <button type="button"
                    id="btn-show-mission"
                    class="builder-action-btn large">
              📋 Сводка миссии
            </button>

            <button type="button"
                    id="btn-show-army"
                    class="builder-action-btn large">
              ⚔️ Карточки армии
            </button>

            <button type="button"
                    id="btn-export-pdf"
                    class="builder-action-btn primary large">
              📄 PDF / Печать
            </button>

            <button type="button"
                    id="btn-go-to-battle"
                    class="builder-action-btn large"
                    style="
                      background:#2ed573;
                      border-color:#2ed573;
                      color:#0b0b0f;
                      font-weight:800;
                    ">
              🎮 В бой
            </button>
          </div>
        `
      })}

      <div id="builder-display-modal" class="builder-modal hidden">
        <div class="builder-modal-content">
          <button type="button"
                  id="builder-modal-close"
                  class="builder-modal-close"
                  aria-label="Закрыть">
            &times;
          </button>

          <div id="builder-modal-body"></div>
        </div>
      </div>
    </div>

    <div id="builder-sticky-budget"
         class="builder-sticky-budget hidden">

      <div class="sticky-item">
        <span class="sticky-label">Очки</span>
        <strong class="sticky-value" id="sticky-pts">
          0 / ${ARMY_BUDGET}
        </strong>
      </div>

      <div class="sticky-sep"></div>

      <div class="sticky-item">
        <span class="sticky-label">Клятвы</span>
        <strong class="sticky-value" id="sticky-mi">
          ${STAKES_BUDGET} МИ
        </strong>
      </div>

      <div class="sticky-sep"></div>

      <div class="sticky-item">
        <span class="sticky-label">Моделей</span>
        <strong class="sticky-value" id="sticky-units">0</strong>
      </div>

      <button type="button"
              class="sticky-btn"
              id="sticky-scroll-top"
              title="Наверх">
        ↑
      </button>
    </div>
  `;

  initBuilderEvents();
  updateAvailableUnits();
  renderRosterSummary();
  initAuthWatcher();
  initBuilderMobile();
}

/* ==========================================================================
   Состав армии и бюджет
   ========================================================================== */

export function renderRosterSummary() {
  const container = document.getElementById('builder-roster-summary');
  const titleContainer = document.getElementById('builder-summary-title');

  if (!container || !titleContainer) return;

  titleContainer.textContent =
    `4. Состав армии (${roster.units.length} моделей)`;

  const totalPts = getTotalArmyCost() + getArtifactsCost();

  updateBudgetBar(totalPts);
  updateStickyBudget();
  renderArtifactsList();
  renderArmyWarnings();
  renderStakesList();

  if (roster.units.length === 0) {
    container.innerHTML = `
      <p style="color:var(--text-muted);">
        Отряды ещё не добавлены в армию.
      </p>
    `;

    return;
  }

  const groups = {
    basic: { title: 'Базовые отряды', items: [] },
    elite: { title: 'Элита', items: [] },
    hero: { title: 'Герои', items: [] },
    other: { title: 'Прочие', items: [] }
  };

  roster.units.forEach((unit, index) => {
    const role = String(unit.role || '').toLowerCase();

    const item = {
      ...unit,
      origIdx: index
    };

    if (role.includes('базов')) {
      groups.basic.items.push(item);
    } else if (role.includes('элит')) {
      groups.elite.items.push(item);
    } else if (role.includes('герой')) {
      groups.hero.items.push(item);
    } else {
      groups.other.items.push(item);
    }
  });

  let groupsHTML = '';

  Object.keys(groups).forEach(key => {
    const group = groups[key];

    if (group.items.length === 0) return;

    group.items = sortRosterUnits(group.items);

    groupsHTML += `
      <div style="margin-bottom:16px;">
        <h4 style="
          color:var(--gold);
          font-size:0.95rem;
          margin-bottom:8px;
          padding-left:4px;
          text-transform:uppercase;
          letter-spacing:0.5px;
        ">
          ${group.title}

          <span style="
            color:var(--text-muted);
            font-size:0.8rem;
            font-weight:400;
          ">
            (${group.items.length})
          </span>
        </h4>

        <div style="
          display:flex;
          flex-direction:column;
          gap:6px;
        ">
          ${group.items.map(unit => {
            const artifacts = getArtifactsForUnit(unit.origIdx);

            return `
              <div style="
                display:flex;
                justify-content:space-between;
                align-items:center;
                gap:10px;
                background:rgba(255,255,255,0.02);
                padding:8px 12px;
                border-radius:6px;
                border:1px solid var(--border);
              ">
                <span style="min-width:0; overflow-wrap:anywhere;">
                  <strong>
                    #${unit.origIdx + 1}
                    ${escapeHtml(unit.uniqueKey || unit.title)}
                  </strong>

                  <span style="
                    font-size:0.8rem;
                    color:var(--text-muted);
                    margin-left:8px;
                  ">
                    [${unit.cost || 0} очков]
                  </span>

                  ${artifacts.length ? `
                    <small style="
                      display:block;
                      margin-top:4px;
                      color:var(--gold);
                    ">
                      ${escapeHtml(
                        artifacts.map(artifact => artifact.name).join(', ')
                      )}
                    </small>
                  ` : ''}
                </span>

                <button type="button"
                        data-action="remove-unit"
                        data-idx="${unit.origIdx}"
                        style="
                          background:none;
                          border:none;
                          color:#ff4757;
                          cursor:pointer;
                          font-weight:bold;
                          font-size:0.85rem;
                          flex-shrink:0;
                        ">
                  Удалить
                </button>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  });

  container.innerHTML = groupsHTML;

  container
    .querySelectorAll('button[data-action="remove-unit"]')
    .forEach(button => {
      button.addEventListener('click', () => {
        removeUnitFromRoster(Number(button.dataset.idx));
      });
    });
}

function updateBudgetBar(totalPts) {
  const fill = document.getElementById('budget-bar-fill');
  const currentLabel = document.getElementById(
    'budget-bar-current-label'
  );

  if (!fill || !currentLabel) return;

  const percent = Math.min(100, (totalPts / ARMY_BUDGET) * 100);
  const color = getBudgetColor(totalPts);

  fill.style.width = `${percent.toFixed(1)}%`;
  fill.style.background = color;

  currentLabel.style.color = color;
  currentLabel.textContent = `${totalPts} / ${ARMY_BUDGET}`;
}

export function updateStickyBudget() {
  const totalPts = getTotalArmyCost() + getArtifactsCost();

  const ptsElement = document.getElementById('sticky-pts');
  const miElement = document.getElementById('sticky-mi');
  const unitsElement = document.getElementById('sticky-units');

  if (ptsElement) {
    ptsElement.textContent = `${totalPts} / ${ARMY_BUDGET}`;
    ptsElement.style.color = getBudgetColor(totalPts);
  }

  if (miElement) {
    const left = STAKES_BUDGET - getStakesCost();

    miElement.textContent = `${left} / ${STAKES_BUDGET} МИ`;

    miElement.style.color = left < 0
      ? '#ff4757'
      : left === 0
        ? '#2ed573'
        : 'var(--text)';
  }

  if (unitsElement) {
    unitsElement.textContent = String(roster.units.length);
  }
}

function renderArmyWarnings() {
  const container = document.getElementById('builder-army-warnings');

  if (!container) return;

  const artifactCheck = validateRosterArtifacts();

  const warnings = [
    ...getArmyWarnings(),
    ...artifactCheck.errors.map(text => ({
      level: 'error',
      text
    }))
  ];

  const colors = {
    ok: {
      bg: 'rgba(46,213,115,0.12)',
      border: '#2ed573',
      text: '#2ed573'
    },
    warn: {
      bg: 'rgba(255,165,2,0.12)',
      border: '#ffa502',
      text: '#ffa502'
    },
    error: {
      bg: 'rgba(255,71,87,0.12)',
      border: '#ff4757',
      text: '#ff4757'
    },
    info: {
      bg: 'rgba(108,92,231,0.12)',
      border: '#6c5ce7',
      text: '#a29bfe'
    }
  };

  container.innerHTML = warnings.map(warning => {
    const color = colors[warning.level] || colors.info;

    return `
      <div style="
        background:${color.bg};
        border:1px solid ${color.border};
        color:${color.text};
        padding:6px 10px;
        border-radius:6px;
        margin-bottom:6px;
        font-size:0.9rem;
      ">
        ${escapeHtml(warning.text)}
      </div>
    `;
  }).join('');
}

/* ==========================================================================
   Артефакты
   ========================================================================== */

function renderArtifactsList() {
  const container = document.getElementById('builder-artifacts-list');
  const badge = document.getElementById('builder-artifacts-badge');
  const messageElement = document.getElementById(
    'builder-artifacts-message'
  );

  if (messageElement) messageElement.innerHTML = '';
  if (!container) return;

  const available = getAvailableArtifacts();
  const used = getUsedArtifacts();
  const left = available - used;

  if (badge) {
    badge.textContent = `Доступно: ${left} / ${available}`;

    if (left < 0) {
      badge.style.background = '#ff4757';
      badge.style.color = '#fff';
    } else if (available === 0) {
      badge.style.background = '#2a2a3a';
      badge.style.color = 'var(--text-muted)';
    } else if (left === 0) {
      badge.style.background = '#ffa502';
      badge.style.color = '#0b0b0f';
    } else {
      badge.style.background = 'var(--accent)';
      badge.style.color = '#fff';
    }
  }

  if (used === 0) {
    container.innerHTML = `
      <p style="color:var(--text-muted); font-size:0.9rem;">
        Артефакты не куплены.
      </p>
    `;

    return;
  }

  container.innerHTML = roster.artifacts.map((record, index) => {
    const artifact = ARTIFACTS_LIST.find(
      item => item.id === record.id
    );

    const currentCheck = canAssignArtifact(
      record.id,
      record.targetIdx,
      index
    );

    const options = roster.units.map((unit, unitIndex) => {
      const check = canAssignArtifact(
        record.id,
        unitIndex,
        index
      );

      const label =
        `#${unitIndex + 1} ` +
        `${unit.uniqueKey || unit.title || 'Модель'}`;

      return `
        <option value="${unitIndex}"
          ${unitIndex === record.targetIdx ? 'selected' : ''}
          ${check.ok ? '' : 'disabled'}>
          ${escapeHtml(label)}
          ${check.ok ? '' : ` — ${escapeHtml(check.reason)}`}
        </option>
      `;
    }).join('');

    return `
      <section style="
        background:rgba(255,255,255,0.02);
        border:1px solid var(--border);
        padding:10px 12px;
        border-radius:6px;
        margin-bottom:6px;
      ">
        <div style="
          display:flex;
          justify-content:space-between;
          gap:10px;
          flex-wrap:wrap;
          margin-bottom:6px;
        ">
          <strong>
            ${escapeHtml(artifact?.name || 'Неизвестный артефакт')}
          </strong>

          <span style="color:var(--gold); font-weight:700;">
            ${artifact ? `${artifact.cost} очков` : 'Нет в каталоге'}
          </span>
        </div>

        <p style="font-size:0.82rem; color:var(--text-muted);">
          ${escapeHtml(artifact?.description || record.id || '')}
        </p>

        ${!currentCheck.ok ? `
          <p style="color:#ffadb7; font-size:0.82rem;">
            ${escapeHtml(currentCheck.reason)}
          </p>
        ` : ''}

        <div style="
          display:flex;
          gap:8px;
          align-items:center;
          flex-wrap:wrap;
        ">
          <label for="artifact-target-${index}"
                 style="font-size:0.82rem;">
            Носитель:
          </label>

          <select id="artifact-target-${index}"
                  class="search-input artifact-target-select"
                  data-artifact-idx="${index}"
                  style="
                    flex:1;
                    min-width:150px;
                    font-size:0.85rem;
                  ">
            <option value=""
                    ${currentCheck.ok ? '' : 'selected'}
                    disabled>
              Выберите допустимого носителя
            </option>

            ${options}
          </select>

          <button type="button"
                  class="builder-action-btn"
                  data-remove-artifact="${index}">
            Удалить
          </button>
        </div>
      </section>
    `;
  }).join('');

  container
    .querySelectorAll('.artifact-target-select')
    .forEach(select => {
      const index = Number(select.dataset.artifactIdx);
      const record = roster.artifacts[index];

      const check = canAssignArtifact(
        record.id,
        record.targetIdx,
        index
      );

      select.value = check.ok
        ? String(record.targetIdx)
        : '';

      select.addEventListener('change', () => {
        const result = setArtifactTarget(
          index,
          Number(select.value)
        );

        renderRosterSummary();

        if (!result.ok) {
          showToast(result.reason, 'err');
          return;
        }

        showToast('Носитель артефакта изменён', 'ok');
      });
    });

  container
    .querySelectorAll('[data-remove-artifact]')
    .forEach(button => {
      button.addEventListener('click', () => {
        const result = removeArtifact(
          Number(button.dataset.removeArtifact)
        );

        if (!result.ok) {
          showToast(result.reason, 'err');
          return;
        }

        renderRosterSummary();
        showToast('Артефакт удалён', 'info');
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
      <h2 style="color:var(--gold); margin-bottom:12px;">
        Артефакты
      </h2>

      <p style="color:var(--text-muted);">
        В армии нет Героев.
        Общий лимит артефактов равен числу Героев в ростере.
      </p>
    `;

    modal.classList.remove('hidden');
    return;
  }

  if (used >= available) {
    body.innerHTML = `
      <h2 style="color:var(--gold); margin-bottom:12px;">
        Артефакты
      </h2>

      <p style="color:var(--text-muted);">
        Лимит артефактов исчерпан (${used} из ${available}).
        Добавьте ещё Героя в ростер, чтобы купить больше.
      </p>
    `;

    modal.classList.remove('hidden');
    return;
  }

  body.innerHTML = `
    <h2 style="color:var(--gold); margin-bottom:16px;">
      Добавить артефакт
    </h2>

    <p style="
      color:var(--text-muted);
      font-size:0.9rem;
      margin-bottom:16px;
    ">
      Доступно артефактов: ${available - used} из ${available}.
      Стоимость прибавится к общему бюджету армии.
      Предмет назначается первому допустимому свободному носителю.
      После покупки носителя можно изменить.
    </p>

    <p id="artifact-picker-error"
       role="alert"
       style="color:#ffadb7;"
       hidden></p>

    <div style="display:flex; flex-direction:column; gap:8px;">
      ${ARTIFACTS_LIST.map(artifact => {
        const check = canAddArtifact(artifact.id);
        const disabled = !check.ok;

        return `
          <button type="button"
                  class="
                    builder-action-btn
                    artifact-pick-btn
                    ${disabled ? 'disabled' : ''}
                  "
                  data-add-artifact-id="${escapeHtml(artifact.id)}"
                  ${disabled ? 'disabled' : ''}
                  title="${disabled ? escapeHtml(check.reason) : ''}"
                  style="
                    text-align:left;
                    padding:12px 14px;
                    display:block;
                    ${disabled ? 'opacity:0.45; cursor:not-allowed;' : ''}
                  ">
            <div style="
              display:flex;
              justify-content:space-between;
              gap:10px;
              margin-bottom:4px;
            ">
              <strong style="color:#fff;">
                ${escapeHtml(artifact.name)}
              </strong>

              <span style="color:var(--gold);">
                ${artifact.cost} очков
              </span>
            </div>

            <div style="font-size:0.82rem; color:var(--text-muted);">
              ${escapeHtml(artifact.description)}
            </div>

            ${disabled ? `
              <div style="
                font-size:0.78rem;
                color:#ffa502;
                margin-top:4px;
              ">
                ${escapeHtml(check.reason)}
              </div>
            ` : ''}
          </button>
        `;
      }).join('')}
    </div>
  `;

  body
    .querySelectorAll('button[data-add-artifact-id]:not([disabled])')
    .forEach(button => {
      button.addEventListener('click', () => {
        const artId = button.dataset.addArtifactId;
        const result = addArtifact(artId);

        if (!result.ok) {
          const errorElement = body.querySelector(
            '#artifact-picker-error'
          );

          if (errorElement) {
            errorElement.textContent =
              result.reason || 'Не удалось добавить артефакт.';

            errorElement.hidden = false;
          }

          return;
        }

        const artifact = ARTIFACTS_LIST.find(
          item => item.id === artId
        );

        const target = roster.units[result.targetIdx];

        showToast(
          `Куплено: ${artifact ? artifact.name : 'артефакт'}. ` +
          `Носитель: #${result.targetIdx + 1} ` +
          `${target?.uniqueKey || target?.title || 'Модель'}`,
          'ok'
        );

        modal.classList.add('hidden');
        renderRosterSummary();
      });
    });

  modal.classList.remove('hidden');
}

/* ==========================================================================
   События
   ========================================================================== */

function initBuilderEvents() {
  const factionSelect = document.getElementById(
    'builder-faction-select'
  );

    if (factionSelect) {
    factionSelect.addEventListener('change', event => {
      const nextClan = event.target.value;
      const previousClan = roster.clan;

      if (nextClan === previousClan) {
        return;
      }

      const hasArmy =
        roster.units.length > 0 ||
        roster.artifacts.length > 0;

      if (
        hasArmy &&
        !confirm(
          'Сменить клан? Все модели и артефакты текущей армии ' +
          'будут убраны из билдера. Название, батлплан и Клятвы ' +
          'сохранятся. Сохранённые ростеры не изменятся.'
        )
      ) {
        factionSelect.value = previousClan;
        return;
      }

      roster.clan = nextClan;
      roster.units = [];
      roster.artifacts = [];

      updateAvailableUnits();
      renderRosterSummary();

      if (hasArmy) {
        showSaveMessage(
          'Клан изменён. Состав армии и артефакты очищены. ' +
          'Сохранённые ростеры не изменены.',
          'info'
        );
      }
    });
  }

  const rosterNameInput = document.getElementById(
    'builder-roster-name'
  );

  if (rosterNameInput) {
    rosterNameInput.addEventListener('input', event => {
      roster.name = event.target.value;
    });
  }

  const battleplanSelect = document.getElementById(
    'builder-battleplan-select'
  );

  if (battleplanSelect) {
    battleplanSelect.addEventListener('change', event => {
      roster.battleplanId = event.target.value;
    });
  }

  const modalClose = document.getElementById('builder-modal-close');

  if (modalClose) {
    modalClose.addEventListener('click', () => {
      document
        .getElementById('builder-display-modal')
        .classList
        .add('hidden');
    });
  }

  const btnSave = document.getElementById('btn-save-roster');
  if (btnSave) {
    btnSave.addEventListener('click', saveRoster);
  }

  const btnLoad = document.getElementById('btn-load-roster');
  if (btnLoad) {
    btnLoad.addEventListener('click', openLoadModal);
  }

  const btnLoadPreset = document.getElementById('btn-load-preset');
  if (btnLoadPreset) {
    btnLoadPreset.addEventListener('click', openPresetsModal);
  }

  const btnExportJson = document.getElementById('btn-export-json');
  if (btnExportJson) {
    btnExportJson.addEventListener('click', exportRosterJson);
  }

  const btnImportJson = document.getElementById('btn-import-json');
  if (btnImportJson) {
    btnImportJson.addEventListener('click', importRosterJson);
  }

  const btnReset = document.getElementById('btn-reset-roster');
  if (btnReset) {
    btnReset.addEventListener('click', resetRoster);
  }

  const btnAddArtifact = document.getElementById('btn-add-artifact');
  if (btnAddArtifact) {
    btnAddArtifact.addEventListener('click', openArtifactPicker);
  }

  const btnMission = document.getElementById('btn-show-mission');
  if (btnMission) {
    btnMission.addEventListener('click', showMissionSummary);
  }

  const btnArmy = document.getElementById('btn-show-army');
  if (btnArmy) {
    btnArmy.addEventListener('click', showArmyCards);
  }

  const btnPdf = document.getElementById('btn-export-pdf');
  if (btnPdf) {
    btnPdf.addEventListener('click', exportPdf);
  }

  const btnGoBattle = document.getElementById('btn-go-to-battle');

  if (btnGoBattle) {
    btnGoBattle.addEventListener('click', () => {
      if (roster.units.length === 0) {
        showSaveMessage(
          'Нельзя отправить в бой пустую армию — ' +
          'добавьте хотя бы один отряд.',
          'err'
        );

        return;
      }

      if (!roster.clan) {
        showSaveMessage('Сначала выберите клан.', 'err');
        return;
      }

      const artifactCheck = validateRosterArtifacts();

      if (!artifactCheck.ok) {
        showSaveMessage(
          'Нельзя передать ростер в бой. ' +
          artifactCheck.errors.join(' '),
          'err'
        );

        return;
      }

      const activeRoster = buildRosterPayload();

      try {
        localStorage.setItem(
          'activeRoster',
          JSON.stringify(activeRoster)
        );
      } catch (error) {
        console.error(
          'Не удалось сохранить активный ростер:',
          error
        );

        showSaveMessage(
          'Ошибка сохранения ростера в localStorage.',
          'err'
        );

        return;
      }

      window.open('play.html', '_blank');
    });
  }
}

/* ==========================================================================
   Сводка миссии
   ========================================================================== */

function showMissionSummary() {
  const selectedBattleplan = DATABASE.find(
    item => item.id === roster.battleplanId
  );

  const selectedStakes = getSelectedStakes();

  const modal = document.getElementById('builder-display-modal');
  const body = document.getElementById('builder-modal-body');

  if (!modal || !body) return;

  const usedArtifacts = roster.artifacts.map(record => {
    const artifact = ARTIFACTS_LIST.find(
      item => item.id === record.id
    );

    const targetUnit = roster.units[record.targetIdx];

    if (!artifact) return null;

    return {
      name: artifact.name,
      cost: artifact.cost,
      description: artifact.description,
      target: targetUnit
        ? `#${record.targetIdx + 1} ` +
          `${targetUnit.uniqueKey || targetUnit.title}`
        : '—'
    };
  }).filter(Boolean);

  body.innerHTML = `
    <h2 style="
      color:var(--gold);
      border-bottom:2px solid var(--border);
      padding-bottom:8px;
    ">
      📋 Сводка миссии
    </h2>

    <h3 style="margin-top:16px; color:var(--accent);">
      Клятвы (${selectedStakes.length},
      ${getStakesCost()} / ${STAKES_BUDGET} МИ):
    </h3>

    ${selectedStakes.length === 0 ? `
      <p style="color:var(--text-muted);">Клятвы не даны.</p>
    ` : selectedStakes.map(stake => `
      <div style="
        background:rgba(255,255,255,0.02);
        border:1px solid var(--border);
        border-radius:8px;
        padding:12px 14px;
        margin-bottom:8px;
      ">
        <div style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:10px;
          flex-wrap:wrap;
          margin-bottom:6px;
        ">
          <div style="
            display:flex;
            align-items:center;
            gap:8px;
            flex-wrap:wrap;
          ">
            <strong style="color:#fff;">
              ${escapeHtml(stake.name)}
            </strong>

            <span class="stake-option-class class-${stake.class}">
              ${escapeHtml(stake.classLabel)}
            </span>
          </div>

          <span style="color:var(--gold); font-weight:700;">
            ${stake.cost} МИ
          </span>
        </div>

        <div style="
          font-size:0.9rem;
          color:var(--text);
          margin-bottom:6px;
        ">
          ${escapeHtml(stake.description)}
        </div>

        <div style="
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          font-size:0.8rem;
          margin-bottom:6px;
        ">
          <span style="color:#2ed573; font-weight:700;">
            Награда: +${stake.reward} ОП
          </span>

          ${stake.penalty > 0 ? `
            <span style="color:#ff4757; font-weight:700;">
              Цена: −${stake.penalty} ОП
            </span>
          ` : `
            <span style="color:var(--text-muted);">
              Без цены
            </span>
          `}
        </div>

        ${stake.minRules.length > 0 ? `
          <div style="
            font-size:0.78rem;
            color:var(--text-muted);
            margin-top:6px;
          ">
            <strong style="color:var(--text);">
              Условия соблюдения:
            </strong>

            <ul style="padding-left:18px; margin-top:4px;">
              ${stake.minRules.map(rule => `
                <li>${escapeHtml(rule)}</li>
              `).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `).join('')}

    ${usedArtifacts.length > 0 ? `
      <h3 style="margin-top:24px; color:var(--accent);">
        Артефакты (${usedArtifacts.length},
        ${getArtifactsCost()} очков):
      </h3>

      <div style="display:flex; flex-direction:column; gap:8px;">
        ${usedArtifacts.map(artifact => `
          <div style="
            background:rgba(209,179,132,0.06);
            border:1px solid var(--border);
            border-radius:8px;
            padding:10px 12px;
          ">
            <div style="
              display:flex;
              justify-content:space-between;
              gap:10px;
              flex-wrap:wrap;
              margin-bottom:4px;
            ">
              <strong style="color:#fff;">
                ${escapeHtml(artifact.name)}
              </strong>

              <span style="color:var(--gold); font-weight:700;">
                ${artifact.cost} очков
              </span>
            </div>

            <div style="font-size:0.82rem; color:var(--text-muted);">
              ${escapeHtml(artifact.description)}
            </div>

            <div style="
              font-size:0.78rem;
              color:var(--accent);
              margin-top:4px;
            ">
              Носитель: ${escapeHtml(artifact.target)}
            </div>
          </div>
        `).join('')}
      </div>
    ` : ''}

    <h3 style="margin-top:24px; color:var(--accent);">
      Батлплан:
      ${selectedBattleplan
        ? escapeHtml(selectedBattleplan.title)
        : 'Не выбран'}
    </h3>

    ${selectedBattleplan ? `
      <div style="margin-top:12px;">
        ${selectedBattleplan.content}
      </div>
    ` : `
      <p style="color:var(--text-muted);">
        Произвольный бой без специального сценария.
      </p>
    `}
  `;

  modal.classList.remove('hidden');
}

/* ==========================================================================
   Просмотр карточек армии
   ========================================================================== */

function showArmyCards() {
  const modal = document.getElementById('builder-display-modal');
  const body = document.getElementById('builder-modal-body');

  if (!modal || !body) return;

  // Не показываем суммированные бонусы некорректного назначения
  // как допустимое снаряжение модели.
  const artifactCheck = validateRosterArtifacts();

  if (!artifactCheck.ok) {
    showSaveMessage(
      'Сначала исправьте назначения артефактов. ' +
      artifactCheck.errors.join(' '),
      'err'
    );

    return;
  }

  const clanArticle = DATABASE.find(
    item => item.title === roster.clan
  );

  let cleanClanContent = '';

  if (clanArticle) {
    cleanClanContent = clanArticle.content
      .replace(
        /<div class="aos-card">[\s\S]*?<\/div>\s*<\/div>/g,
        ''
      )
      .split(/Состав клана/i)[0];
  }

  const counts = new Map();

  roster.units.forEach(unit => {
    const key = unit.uniqueKey || unit.title || 'Модель';

    counts.set(key, (counts.get(key) || 0) + 1);
  });

  const uniqueCardsMap = new Map();

  roster.units.forEach((unit, unitIndex) => {
    const key = getUnitCardGroupKey(unit, unitIndex);
    const existing = uniqueCardsMap.get(key);

    if (existing) {
      existing.modelNumbers.push(unitIndex + 1);
    } else {
      uniqueCardsMap.set(key, {
        ...unit,
        rosterIndex: unitIndex,
        modelNumbers: [unitIndex + 1]
      });
    }
  });

  const uniqueCardsHTML = sortRosterUnits(
    Array.from(uniqueCardsMap.values())
  ).map(unit => `
    <section>
      <p style="color:var(--text-muted); font-size:0.85rem;">
        Экземпляры:
        ${unit.modelNumbers.map(number => `#${number}`).join(', ')}
        · ${unit.modelNumbers.length} шт.
      </p>

      ${renderUnitCardWithArtifacts(unit, unit.rosterIndex)}
    </section>
  `);

  const totalPts = getTotalArmyCost() + getArtifactsCost();
  const commanderInfo = getCommanderInfo();
  const selectedStakes = getSelectedStakes();
  const artifactsCost = getArtifactsCost();

  body.innerHTML = `
    <h2 style="
      color:#d1b384;
      border-bottom:2px solid var(--border);
      padding-bottom:8px;
    ">
      ⚔️ Состав и Карточки Армии
    </h2>

    <p style="margin-top:8px;">
      <strong>Ростер:</strong>
      ${escapeHtml(roster.name || 'Безымянный')}
    </p>

    <p>
      <strong>Клан:</strong>
      ${escapeHtml(roster.clan || 'Не выбран')}
    </p>

    <p>
      <strong>Очки армии:</strong>
      ${totalPts} / ${ARMY_BUDGET}
      ${artifactsCost > 0 ? ` (артефакты: ${artifactsCost})` : ''}
    </p>

    <p>
      <strong>Командир:</strong>
      ${commanderInfo
        ? escapeHtml(commanderInfo.title)
        : 'не назначен'}
    </p>

    <p>
      <strong>Клятв дано:</strong>
      ${selectedStakes.length} на ${getStakesCost()} МИ
    </p>

    <p>
      <strong>Артефактов:</strong>
      ${roster.artifacts.length}
    </p>

    ${cleanClanContent ? `
      <div style="
        margin-top:20px;
        background:rgba(0,0,0,0.3);
        padding:16px;
        border-radius:8px;
        border:1px solid var(--border);
      ">
        <h3 style="color:var(--accent); margin-bottom:12px;">
          Правила и способности клана
        </h3>

        <div>${cleanClanContent}</div>
      </div>
    ` : ''}

    <h3 style="margin-top:24px; color:var(--accent);">
      Сводный состав армии (${roster.units.length} моделей):
    </h3>

    ${roster.units.length === 0 ? `
      <p style="color:var(--text-muted);">
        Юниты не добавлены.
      </p>
    ` : `
      <ul style="
        padding-left:20px;
        margin-top:8px;
        margin-bottom:20px;
      ">
        ${Array.from(counts.entries()).map(([name, count]) => `
          <li>
            <strong>${escapeHtml(name)}</strong>
            — ${count} шт.
          </li>
        `).join('')}
      </ul>
    `}

    <h3 style="margin-top:24px; color:var(--accent);">
      Датакарты по вариантам снаряжения:
    </h3>

    ${uniqueCardsHTML.length === 0 ? `
      <p style="color:var(--text-muted);">
        Юниты не добавлены в ростер.
      </p>
    ` : `
      <div style="
        display:flex;
        flex-direction:column;
        gap:16px;
        margin-top:12px;
      ">
        ${uniqueCardsHTML.join('')}
      </div>
    `}
  `;

  modal.classList.remove('hidden');
}

/* ==========================================================================
   Сброс ростера
   ========================================================================== */

function resetRoster() {
  const hasSomething =
    roster.clan ||
    roster.units.length > 0 ||
    roster.selectedStakes.length > 0 ||
    roster.battleplanId ||
    roster.artifacts.length > 0;

  if (!hasSomething) {
    showSaveMessage('Ростер уже пуст.', 'info');
    return;
  }

  if (
    !confirm(
      'Сбросить ростер? Все выбранные отряды, артефакты, ' +
      'клятвы и настройки будут удалены.'
    )
  ) {
    return;
  }

  roster.clan = '';
  roster.battleplanId = '';
  roster.selectedStakes = [];
  roster.artifacts = [];
  roster.units = [];
  roster.name = 'Мой Ростер';

  const nameInput = document.getElementById('builder-roster-name');
  if (nameInput) nameInput.value = roster.name;

  const factionSelect = document.getElementById(
    'builder-faction-select'
  );
  if (factionSelect) factionSelect.value = '';

  const battleplanSelect = document.getElementById(
    'builder-battleplan-select'
  );
  if (battleplanSelect) battleplanSelect.value = '';

  updateAvailableUnits();
  renderStakesList();
  renderRosterSummary();

  showSaveMessage('Ростер сброшен.', 'ok');
}

/* ==========================================================================
   Мобильный интерфейс
   ========================================================================== */

function initBuilderMobile() {
  const media = window.matchMedia(
    `(max-width: ${MOBILE_BREAKPOINT}px)`
  );

  const applyMobileState = isMobile => {
    const details = document.querySelectorAll(
      '.builder-container .builder-card'
    );

    details.forEach(element => {
      if (isMobile) {
        element.classList.add('collapsible-mobile');

        element.open =
          element.id === 'bc-clan' ||
          element.id === 'bc-battleplan' ||
          element.id === 'bc-units';
      } else {
        element.classList.remove('collapsible-mobile');
        element.open = true;
      }
    });

    const sticky = document.getElementById('builder-sticky-budget');

    if (sticky) {
      sticky.classList.toggle('hidden', !isMobile);
    }

    updateStickyBudget();
  };

  applyMobileState(media.matches);

  const handleChange = event => {
    applyMobileState(event.matches);
  };

  if (media.addEventListener) {
    media.addEventListener('change', handleChange);
  } else {
    media.addListener(handleChange);
  }

  const stickyTop = document.getElementById('sticky-scroll-top');

  if (stickyTop) {
    stickyTop.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }
}

/* ==========================================================================
   Сообщения
   ========================================================================== */

export function showSaveMessage(text, type = 'info') {
  const element = document.getElementById('builder-save-message');

  if (!element) return;

  if (!text) {
    element.innerHTML = '';
    return;
  }

  const colors = {
    ok: {
      bg: 'rgba(46,213,115,0.12)',
      border: '#2ed573',
      color: '#2ed573'
    },
    err: {
      bg: 'rgba(255,71,87,0.12)',
      border: '#ff4757',
      color: '#ff4757'
    },
    info: {
      bg: 'rgba(108,92,231,0.12)',
      border: '#6c5ce7',
      color: '#a29bfe'
    }
  };

  const color = colors[type] || colors.info;

  element.innerHTML = `
    <div style="
      background:${color.bg};
      border:1px solid ${color.border};
      color:${color.color};
      padding:8px 12px;
      border-radius:6px;
      font-size:0.9rem;
    ">
      ${escapeHtml(text)}
    </div>
  `;
}

/* ==========================================================================
   Готовые ростеры
   ========================================================================== */

function openPresetsModal() {
  const modal = document.getElementById('builder-display-modal');
  const body = document.getElementById('builder-modal-body');

  if (!modal || !body) return;

  body.innerHTML = `
    <h2 style="
      color:var(--gold);
      border-bottom:2px solid var(--border);
      padding-bottom:8px;
    ">
      📚 Готовые ростеры
    </h2>

    <p style="
      color:var(--text-muted);
      font-size:0.9rem;
      margin-top:8px;
    ">
      Выберите один из заранее собранных ростеров.
      Его можно загрузить в билдер и затем изменить.
    </p>

    <div style="
      margin-top:16px;
      display:flex;
      flex-direction:column;
      gap:10px;
    ">
      ${PRESET_ROSTERS.map(preset => `
        <div style="
          background:rgba(255,255,255,0.02);
          border:1px solid var(--border);
          padding:14px 16px;
          border-radius:8px;
        ">
          <div style="
            display:flex;
            justify-content:space-between;
            align-items:flex-start;
            gap:12px;
            flex-wrap:wrap;
          ">
            <div style="flex:1; min-width:0;">
              <strong style="color:#fff; font-size:1.05rem;">
                ${escapeHtml(preset.name)}
              </strong>

              <div style="
                font-size:0.85rem;
                color:var(--accent);
                margin-top:2px;
              ">
                ${escapeHtml(preset.clan)}
              </div>

              <div style="
                font-size:0.85rem;
                color:var(--text-muted);
                margin-top:6px;
              ">
                ${escapeHtml(preset.description)}
              </div>

              <div style="
                font-size:0.8rem;
                color:var(--text-muted);
                margin-top:6px;
              ">
                Состав:
                ${preset.picks.map(pick =>
                  `${escapeHtml(pick.title)} ×${pick.count}`
                ).join(', ')}
              </div>
            </div>

            <button type="button"
                    class="builder-action-btn primary"
                    data-preset-id="${escapeHtml(preset.id)}"
                    style="flex-shrink:0;">
              Загрузить
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  body.querySelectorAll('button[data-preset-id]').forEach(button => {
    button.addEventListener('click', () => {
      const preset = PRESET_ROSTERS.find(
        item => item.id === button.dataset.presetId
      );

      if (!preset) return;

      const loaded = loadPreset(preset);

      if (loaded) {
        modal.classList.add('hidden');
      }
    });
  });

  modal.classList.remove('hidden');
}

/**
 * Существующий механизм загрузки шаблона.
 * Проверка полноты шаблона до замены текущего ростера
 * будет добавлена отдельным обновлением.
 */
/**
 * Показывает ошибку и на странице, и в открытом окне шаблонов.
 * Текст выводится через textContent.
 */
function showPresetLoadError(text) {
  showSaveMessage(text, 'err');

  const body = document.getElementById('builder-modal-body');

  if (!body) {
    return;
  }

  let notice = body.querySelector('[data-preset-load-error]');

  if (!notice) {
    notice = document.createElement('p');
    notice.dataset.presetLoadError = '';
    notice.setAttribute('role', 'alert');

    notice.style.color = '#ffadb7';
    notice.style.marginTop = '12px';
    notice.style.padding = '10px 12px';
    notice.style.border = '1px solid #ff4757';
    notice.style.borderRadius = '6px';

    body.prepend(notice);
  }

  notice.textContent = text;
}

/**
 * Собирает готовый ростер отдельно от текущего состояния.
 *
 * До подтверждения и завершения проверки:
 * — roster не изменяется;
 * — поля интерфейса не изменяются;
 * — сохранённые ростеры не затрагиваются.
 *
 * Выбор первого оружия сохраняет прежнее поведение шаблонов.
 * Это не новое правило вооружения.
 */
function loadPreset(preset) {
  const body = document.getElementById('builder-modal-body');

  body
    ?.querySelector('[data-preset-load-error]')
    ?.remove();

  let next;

  try {
    if (
      !preset ||
      typeof preset !== 'object' ||
      typeof preset.name !== 'string' ||
      typeof preset.clan !== 'string' ||
      !Array.isArray(preset.picks) ||
      preset.picks.length === 0
    ) {
      throw new Error('Некорректная структура готового ростера.');
    }

    const clanArticle = DATABASE.find(
      item => item.title === preset.clan
    );

    if (
      !clanArticle ||
      typeof clanArticle.content !== 'string'
    ) {
      throw new Error('Клан готового ростера не найден в каталоге.');
    }

    const template = document.createElement('template');
    template.innerHTML = clanArticle.content;

    const cards = [
      ...template.content.querySelectorAll('.aos-card')
    ];

    const units = [];
    const missingTitles = [];

    for (const pick of preset.picks) {
      if (
        !pick ||
        typeof pick.title !== 'string' ||
        !pick.title.trim() ||
        !Number.isInteger(pick.count) ||
        pick.count < 1 ||
        pick.count > 200
      ) {
        throw new Error(
          'В готовом ростере есть некорректная запись модели.'
        );
      }

      if (units.length + pick.count > 200) {
        throw new Error(
          'Готовый ростер превышает технический предел: 200 моделей.'
        );
      }

      const matchingCards = cards.filter(card => {
        const title = card
          .querySelector('.aos-title')
          ?.textContent
          ?.trim();

        return title === pick.title.trim();
      });

      if (matchingCards.length === 0) {
        missingTitles.push(pick.title);
        continue;
      }

      if (matchingCards.length > 1) {
        throw new Error(
          `Название «${pick.title}» неоднозначно в каталоге.`
        );
      }

      const card = matchingCards[0].cloneNode(true);

      const title = card
        .querySelector('.aos-title')
        ?.textContent
        ?.trim();

      const weapons = [
        ...card.querySelectorAll('.aos-weapon-item')
      ];

      // Сохраняем прежнюю логику готовых шаблонов:
      // при нескольких вариантах оставляем первый.
      if (weapons.length > 1) {
        weapons.slice(1).forEach(weapon => {
          weapon.remove();
        });

        const divider = card.querySelector(
          'div[style*="--accent"]'
        );

        if (divider) {
          divider.remove();
        }
      }

      for (let index = 0; index < pick.count; index++) {
        units.push({
          title,
          html: card.outerHTML
        });
      }
    }

    if (missingTitles.length > 0) {
      throw new Error(
        'В каталоге не найдены модели: ' +
        [...new Set(missingTitles)].join(', ') +
        '. Частичная загрузка отменена.'
      );
    }

    if (
      preset.stakes !== undefined &&
      !Array.isArray(preset.stakes)
    ) {
      throw new Error(
        'Список Клятв готового ростера должен быть массивом.'
      );
    }

    // Проверяем весь подготовленный шаблон:
    // модели, официальные карточки, цены, Клятвы и артефакты.
    next = normalizeOfficialRoster({
      name: preset.name,
      clan: preset.clan,
      battleplanId: '',
      selectedStakes: preset.stakes === undefined
        ? []
        : [...preset.stakes],
      artifacts: [],
      units
    });
  } catch (error) {
    console.error('loadPreset validation error:', error);

    showPresetLoadError(
      'Готовый ростер не загружен. ' +
      (error?.message || 'Не удалось проверить шаблон.') +
      ' Текущая армия не изменена.'
    );

    return false;
  }

  const hasCurrentWork =
    Boolean(roster.clan) ||
    roster.units.length > 0 ||
    roster.artifacts.length > 0 ||
    roster.selectedStakes.length > 0 ||
    Boolean(roster.battleplanId) ||
    Boolean(
      roster.name &&
      roster.name.trim() !== 'Мой Ростер'
    );

  if (
    hasCurrentWork &&
    !confirm(
      `Загрузить готовый ростер «${next.name}»? ` +
      'Текущие название, клан, модели, артефакты, батлплан ' +
      'и Клятвы в билдере будут заменены. ' +
      'Сохранённые ростеры не изменятся.'
    )
  ) {
    return false;
  }

  // Все проверки завершены, замена подтверждена.
  roster.name = next.name;
  roster.clan = next.clan;
  roster.battleplanId = next.battleplanId;
  roster.selectedStakes = next.selectedStakes;
  roster.artifacts = next.artifacts;
  roster.units = next.units;

  const nameInput = document.getElementById(
    'builder-roster-name'
  );

  if (nameInput) {
    nameInput.value = roster.name;
  }

  const factionSelect = document.getElementById(
    'builder-faction-select'
  );

  if (factionSelect) {
    factionSelect.value = roster.clan;
  }

  const battleplanSelect = document.getElementById(
    'builder-battleplan-select'
  );

  if (battleplanSelect) {
    battleplanSelect.value = roster.battleplanId;
  }

  updateAvailableUnits();
  renderStakesList();
  renderRosterSummary();

  showSaveMessage(
    `Ростер «${roster.name}» загружен ` +
    `(${roster.units.length} моделей, ` +
    `${getStakesCost()} МИ Клятв).`,
    'ok'
  );

  return true;
}