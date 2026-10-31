// src/battle/render.js

import {
  gameState,
  saveGameState,
  getPlayerName,
  battleMode,
  activeRoomRole,
  getUnitBaseStats,
  getArtifactStatBonuses,
  resolveArtifact
} from './state.js';

import { pushMyState } from './room-sync.js';
import {
  DATABASE,
  getFactionFromClan,
  getFactionGeneralArticle
} from '../core/data.js';

import { escapeHtml } from '../utils/escape.js';
import { openNoteModal } from './notes.js';
import { getUnitCastClass } from './resources.js';
import { openSpellbookModal, openPrayerModal } from './magic.js';

let compactMode = localStorage.getItem('battleCompactMode') === '1';
let viewTab = 'my';
let activeBattleFilter = 'all';

const detailCache = new Map();

const STANCES = {
  neutral: { text: 'Нейтрал', icon: '⚪' },
  attack: { text: 'Атака', icon: '⚔️' },
  defense: { text: 'Защита', icon: '🛡️' },
  clan: { text: 'Клан', icon: '🏰' }
};

function text(value) {
  return escapeHtml(String(value ?? ''));
}

function numeric(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;

  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function roleKey(role) {
  const value = String(role || '').toLowerCase();

  if (/герой|hero/.test(value)) return 'hero';
  if (/элит|elite/.test(value)) return 'elite';
  if (/базов|basic/.test(value)) return 'basic';

  return 'other';
}

function stateKey(unit) {
  if (numeric(unit.currentHp) <= 0) return 'dead';
  return unit.activated ? 'activated' : 'ready';
}

function stateBadge(unit) {
  const key = stateKey(unit);

  const labels = {
    ready: '○ Готов',
    activated: '✓ Активирован',
    dead: '✕ Уничтожен'
  };

  return `
    <span class="bu-state bu-state--${key}" data-unit-state>
      ${labels[key]}
    </span>
  `;
}

function stanceBadge(unit) {
  const key = STANCES[unit.stance] ? unit.stance : 'neutral';
  const stance = STANCES[key];

  return `
    <span class="bu-stance bu-stance--${key}" data-unit-stance>
      ${stance.icon} ${stance.text}
    </span>
  `;
}

/**
 * Разбирается исходный HTML, а не HTML с уже подставленными бонусами.
 */
function extractUnitDetails(html = '') {
  if (detailCache.has(html)) return detailCache.get(html);

  const root = document.createElement('div');
  root.innerHTML = html;

  const weapons = Array.from(
    root.querySelectorAll('.aos-weapon-item')
  ).map(weapon => {
    const statsElement = weapon.querySelector('.aos-weapon-stats');

    return {
      name: weapon.querySelector('.aos-weapon-name')?.textContent?.trim() || '',
      type: weapon.querySelector('.aos-weapon-type')?.textContent?.trim() || '',
      stats: statsElement?.textContent?.replace(/\s+/g, ' ').trim() || ''
    };
  });

  const abilities = Array.from(
    root.querySelectorAll('.aos-ability')
  ).map(ability => ({
    title:
      ability.querySelector('.aos-ability-title')?.textContent?.trim() ||
      'Особое свойство',
    description:
      ability.querySelector('.aos-ability-text')?.textContent?.trim() ||
      ability.textContent?.trim() ||
      ''
  }));

  const details = { weapons, abilities };

  if (detailCache.size > 200) detailCache.clear();
  detailCache.set(html, details);

  return details;
}

/**
 * ХП берётся из состояния боя, так как это изменяемая характеристика.
 * Постоянные Броня и Движение — исходная датакарта + бонус артефакта.
 * Отображение не изменяет сохранённый gameState.
 */
function getDisplayStats(unit) {
  const base = getUnitBaseStats(unit);
  const artifact = resolveArtifact(unit.artifact);
  const bonuses = getArtifactStatBonuses(artifact);

  return {
    hp: {
      base: base.hp,
      total: numeric(unit.maxHp, base.hp + bonuses.hp),
      bonus: bonuses.hp
    },
    armor: {
      base: base.armor,
      total: base.armor === null
        ? null
        : base.armor + bonuses.armor,
      bonus: bonuses.armor
    },
    move: {
      base: base.move,
      total: base.move === null
        ? null
        : base.move + bonuses.move,
      bonus: bonuses.move
    }
  };
}

function renderStats(unit) {
  const stats = getDisplayStats(unit);
  const artifact = resolveArtifact(unit.artifact);

  const items = [
    { key: 'hp', label: 'ХП', icon: '❤️' },
    { key: 'move', label: 'Движение', icon: '👣' },
    { key: 'armor', label: 'Броня', icon: '🛡️' }
  ];

  return `
    <div class="bu-stats">
      ${items.map(item => {
        const stat = stats[item.key];

        // Для ХП показываем только реально учтённое отличие максимума.
        const bonus = item.key === 'hp'
          ? stat.total - stat.base
          : stat.bonus;

        const hasBonus = stat.total !== null && bonus !== 0;
        const sign = bonus > 0 ? '+' : '';

        return `
          <div class="bu-stat ${hasBonus ? 'bu-stat--bonus' : ''}">
            <span class="bu-stat-label">${item.icon} ${item.label}</span>

            <strong class="bu-stat-value">
              ${stat.total === null ? '—' : text(stat.total)}
              ${hasBonus
                ? `<small>(${sign}${text(bonus)})</small>`
                : ''}
            </strong>

            ${hasBonus && artifact
              ? `<span class="bu-stat-source">${text(artifact.name)}</span>`
              : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderWeapons(weapons) {
  if (!weapons.length) return '';

  return `
    <section class="bu-weapons">
      <h4 class="bu-section-label">Вооружение</h4>

      ${weapons.map(weapon => `
        <div class="bu-weapon">
          <div class="bu-weapon-heading">
            <strong>${text(weapon.name)}</strong>
            <span>${text(weapon.type)}</span>
          </div>
          <p>${text(weapon.stats)}</p>
        </div>
      `).join('')}
    </section>
  `;
}

function renderAbilities(abilities) {
  if (!abilities.length) return '';

  return `
    <div class="bu-abilities">
      ${abilities.map(ability => `
        <section class="bu-ability">
          <h4>${text(ability.title)}</h4>
          <p>${text(ability.description)}</p>
        </section>
      `).join('')}
    </div>
  `;
}

function renderArtifact(unit) {
  const artifact = resolveArtifact(unit.artifact);
  if (!artifact) return '';

  return `
    <details class="bu-artifact">
      <summary>
        <span>🎁 ${text(artifact.name || 'Артефакт')}</span>
        <span class="bu-artifact-cost">${numeric(artifact.cost)} очков</span>
      </summary>

      <p>${text(
        artifact.description ||
        'Описание отсутствует в сохранённом ростере.'
      )}</p>
    </details>
  `;
}

function renderStatuses(unit, index, opponent = false) {
  const statuses = Array.isArray(unit.statuses) ? unit.statuses : [];

  if (!statuses.length) {
    return '<span class="bu-muted">Нет активных статусов</span>';
  }

  return statuses.map((status, statusIndex) => {
    const type = ['poison', 'fire', 'stone', 'custom', 'fatigue']
      .includes(status.type) ? status.type : 'custom';

    return `
      <span class="status-tag ${type}">
        <span>${text(status.name)}: ${text(status.value)}</span>

        ${opponent ? '' : `
          <button type="button" data-action="mod-status"
            data-idx="${index}" data-sidx="${statusIndex}" data-delta="1"
            aria-label="Усилить статус ${text(status.name)}">+</button>

          <button type="button" data-action="mod-status"
            data-idx="${index}" data-sidx="${statusIndex}" data-delta="-1"
            aria-label="Уменьшить статус ${text(status.name)}">−</button>

          <button type="button" data-action="rm-status"
            data-idx="${index}" data-sidx="${statusIndex}"
            aria-label="Удалить статус ${text(status.name)}">×</button>
        `}
      </span>
    `;
  }).join('');
}

function hpAppearance(unit) {
  const max = Math.max(1, numeric(unit.maxHp, 1));
  const percent = Math.max(
    0,
    Math.min(100, numeric(unit.currentHp) / max * 100)
  );

  return {
    percent,
    color: percent > 50 ? '#2ed573'
      : percent > 20 ? '#ffb454'
      : '#ef7a87'
  };
}

function renderHp(unit, index, opponent) {
  const appearance = hpAppearance(unit);

  return `
    <section class="bu-health">
      <div class="bu-health-heading">
        <span>Текущее ХП</span>
        <strong data-current-hp>
          ${text(unit.currentHp)} / ${text(unit.maxHp)}
        </strong>
      </div>

      <div class="bu-health-track">
        <div class="hp-bar-fill"
          style="width:${appearance.percent}%;background:${appearance.color}">
        </div>
      </div>

      ${opponent ? '' : `
        <div class="bu-hp-actions">
          ${[
            [5, '+5'],
            [1, '+1'],
            [-1, '−1'],
            [-5, '−5']
          ].map(([delta, label]) => `
            <button type="button"
              class="bu-button ${delta > 0 ? 'bu-button--heal' : 'bu-button--damage'}"
              data-action="hp" data-idx="${index}" data-delta="${delta}"
              aria-label="${delta > 0 ? 'Добавить' : 'Снять'} ${Math.abs(delta)} ХП">
              ${label}
            </button>
          `).join('')}
        </div>
      `}
    </section>
  `;
}

function renderStanceButtons(unit, index) {
  return `
    <div class="bu-stances" aria-label="Стойка модели">
      ${Object.entries(STANCES).map(([key, stance]) => `
        <button type="button"
          class="stance-btn ${unit.stance === key ? 'active' : ''}"
          data-action="change-stance"
          data-idx="${index}" data-stance="${key}"
          aria-pressed="${unit.stance === key}">
          ${stance.icon} ${stance.text}
        </button>
      `).join('')}
    </div>
  `;
}

function renderUnitCard(unit, index, opponent = false) {
  const state = stateKey(unit);
  const details = extractUnitDetails(unit.html || '');
  const cast = opponent
    ? { isMage: false, isPriest: false }
    : getUnitCastClass(index);

  return `
    <article
      class="battle-unit-wrapper bu-card ${compactMode ? 'compact' : ''} ${state === 'dead' ? 'dead' : ''} ${unit.activated ? 'activated' : ''}"
      data-idx="${index}"
      data-side="${opponent ? 'opp' : 'my'}">

      <div class="bu-card-top">
        ${stateBadge(unit)}
        <span class="bu-cost">${numeric(unit.cost)} очков</span>
      </div>

      <header class="bu-heading">
        <span class="bu-number">#${index + 1}</span>
        <h3>${text(unit.uniqueKey || unit.title || 'Отряд')}</h3>
      </header>

      <div class="bu-badges">
        <span class="bu-role bu-role--${roleKey(unit.role)}">
          ${text(unit.role || 'Отряд')}
        </span>
        ${stanceBadge(unit)}
      </div>

      ${renderStats(unit)}
      ${renderHp(unit, index, opponent)}
      ${renderArtifact(unit)}

      ${compactMode ? '' : `
        ${renderWeapons(details.weapons)}

        ${details.abilities.length ? `
          <details class="bu-fold">
            <summary>Способности модели (${details.abilities.length})</summary>
            ${renderAbilities(details.abilities)}
          </details>
        ` : ''}
      `}

      <section class="bu-status-section">
        <div class="status-container">
          ${renderStatuses(unit, index, opponent)}
        </div>

        ${opponent ? '' : `
          <details class="bu-status-editor">
            <summary>Добавить статус</summary>

            <div class="status-add-bar">
              <select id="status-type-${index}"
                class="status-select" aria-label="Тип статуса">
                <option value="poison">Яд</option>
                <option value="fire">Горение</option>
                <option value="stone">Окаменение</option>
                <option value="custom">Другое</option>
              </select>

              <input type="number" id="status-val-${index}"
                class="status-select bu-status-value"
                value="1" min="1" max="10"
                aria-label="Значение статуса">

              <button type="button" class="bu-button"
                data-action="add-status" data-idx="${index}">
                Добавить
              </button>
            </div>
          </details>
        `}
      </section>

      <footer class="bu-footer">
        <div class="bu-actions">
          ${opponent ? '' : `
            <button type="button"
              class="bu-button bu-activate ${unit.activated ? 'is-active' : ''}"
              data-action="toggle-activated" data-idx="${index}"
              aria-pressed="${!!unit.activated}">
              ${unit.activated ? '↶ Снять активацию' : '○ Активировать'}
            </button>

            ${cast.isMage ? `
              <button type="button" class="bu-button bu-button--magic"
                data-action="open-spellbook" data-idx="${index}">
                ✨ Магия
              </button>
            ` : ''}

            ${cast.isPriest ? `
              <button type="button" class="bu-button bu-button--faith"
                data-action="open-prayerbook" data-idx="${index}">
                🙏 Молитва
              </button>
            ` : ''}

            <button type="button" class="bu-button"
              data-action="add-note" data-idx="${index}">
              📝 Заметка
            </button>
          `}

          <button type="button" class="bu-button"
            data-action="open-card" data-idx="${index}"
            data-side="${opponent ? 'opp' : 'my'}">
            📖 Карточка
          </button>
        </div>

        ${opponent
          ? '<p class="bu-readonly">Только просмотр</p>'
          : renderStanceButtons(unit, index)}
      </footer>
    </article>
  `;
}

function matchesFilter(unit) {
  return activeBattleFilter === 'all' ||
    roleKey(unit.role) === activeBattleFilter;
}

function renderControls() {
  return `
    <div class="bu-toolbar">
      <div class="bu-toolbar-group" aria-label="Класс моделей">
        ${[
          ['all', 'Все'],
          ['basic', 'Базовые'],
          ['elite', 'Элита'],
          ['hero', 'Герои']
        ].map(([key, label]) => `
          <button type="button"
            class="bu-button ${activeBattleFilter === key ? 'is-selected' : ''}"
            data-action="filter" data-filter="${key}"
            aria-pressed="${activeBattleFilter === key}">
            ${label}
          </button>
        `).join('')}
      </div>

      <div class="bu-toolbar-group" aria-label="Вид карточек">
        <button type="button"
          class="bu-button ${!compactMode ? 'is-selected' : ''}"
          data-action="set-compact" data-compact="0"
          aria-pressed="${!compactMode}">
          Полный
        </button>
        <button type="button"
          class="bu-button ${compactMode ? 'is-selected' : ''}"
          data-action="set-compact" data-compact="1"
          aria-pressed="${compactMode}">
          Компактный
        </button>
      </div>
    </div>
  `;
}

/**
 * Один обработчик на контейнер.
 * Вложенные details работают самостоятельно и не открывают модальное окно.
 */
function bindActions(container) {
  container.onclick = event => {
    const button = event.target.closest('button[data-action]');
    if (!button || !container.contains(button)) return;

    const index = Number(button.dataset.idx);
    const action = button.dataset.action;

    if (action === 'filter') {
      filterBattleUnits(button.dataset.filter);
      return;
    }

    if (action === 'set-compact') {
      compactMode = button.dataset.compact === '1';
      localStorage.setItem('battleCompactMode', compactMode ? '1' : '0');
      renderUnits();
      renderOpponentUnits();
      return;
    }

    if (action === 'view-tab') {
      setViewTab(button.dataset.tab);
      return;
    }

    if (action === 'open-card') {
      openUnitCardModal(index, button.dataset.side || 'my');
      return;
    }

    if (action === 'hp') changeUnitHp(index, Number(button.dataset.delta));
    if (action === 'add-status') appendStatus(index);

    if (action === 'mod-status') {
      modifyStatusValue(
        index,
        Number(button.dataset.sidx),
        Number(button.dataset.delta)
      );
    }

    if (action === 'rm-status') {
      removeStatus(index, Number(button.dataset.sidx));
    }

    if (action === 'toggle-activated') toggleActivated(index);
    if (action === 'add-note') openNoteModal(index);
    if (action === 'open-spellbook') openSpellbookModal(index);
    if (action === 'open-prayerbook') openPrayerModal(index);

    if (action === 'change-stance') {
      changeUnitStance(index, button.dataset.stance);
    }
  };
}

export function renderDashboard() {
  if (!gameState) return;

  setText('dash-roster-name', gameState.name || 'Армия');
  setText('dash-player-info', `Игрок: ${getPlayerName()}`);
  setText('dash-roster-clan', `Клан: ${gameState.clan || '—'}`);

  renderMeta();
  renderResources();
  renderTracker();
  renderUnits();
  renderOpponentUnits();
}

export function renderMeta() {
  const element = document.getElementById('dash-meta');
  if (!element || !gameState) return;

  const units = gameState.units || [];
  const alive = units.filter(unit => numeric(unit.currentHp) > 0).length;

  const unitsCost = units.reduce(
    (sum, unit) => sum + numeric(unit.cost), 0
  );

  const artifactsCost = units.reduce(
    (sum, unit) => sum + numeric(resolveArtifact(unit.artifact)?.cost), 0
  );

  const currentHp = units.reduce(
    (sum, unit) => sum + numeric(unit.currentHp), 0
  );

  const maxHp = units.reduce(
    (sum, unit) => sum + numeric(unit.maxHp), 0
  );

  element.innerHTML = `
    <span><strong>Моделей:</strong> ${alive} / ${units.length}</span>
    <span><strong>Очков армии:</strong> ${unitsCost + artifactsCost}</span>
    <span><strong>Суммарное ХП:</strong> ${currentHp} / ${maxHp}</span>
  `;
}

export function renderResources() {
  const element = document.getElementById('resources-panel');
  if (!element || !gameState) return;

  element.innerHTML = `
    <span><strong class="resource-mana">Мана:</strong>
      ${numeric(gameState.mage)} / ${numeric(gameState.mageCap, 6)}
    </span>
    <span><strong class="resource-faith">Вера:</strong>
      ${numeric(gameState.faith)} / ${numeric(gameState.faithCap, 6)}
    </span>
  `;
}

export function renderTracker() {
  if (!gameState) return;

  setText('track-round', gameState.round);
  setText('track-vp-own', gameState.vpOwn);
  setText('track-vp-opp', gameState.vpOpp);

  const locked = battleMode === 'room' && activeRoomRole !== 'host';

  document.querySelectorAll(
    '#battle-tracker [data-track^="round"]'
  ).forEach(button => {
    button.disabled = locked;
    button.style.opacity = locked ? '0.4' : '';
    button.style.cursor = locked ? 'not-allowed' : '';
  });
}

export function filterBattleUnits(filter) {
  activeBattleFilter = ['all', 'basic', 'elite', 'hero'].includes(filter)
    ? filter : 'all';

  renderUnits();
  renderOpponentUnits();
}

export function toggleCompactMode() {
  compactMode = !compactMode;
  localStorage.setItem('battleCompactMode', compactMode ? '1' : '0');

  renderUnits();
  renderOpponentUnits();
}

export function setViewTab(tab) {
  viewTab = ['my', 'opp', 'both'].includes(tab) ? tab : 'my';

  renderUnits();
  renderOpponentUnits();
}

export function changeUnitStance(index, newStance) {
  const unit = gameState?.units?.[index];
  if (!unit || !STANCES[newStance]) return;

  unit.stance = newStance;
  saveGameState();
  pushMyState();

  const card = document.querySelector(
    `#dash-units-container .bu-card[data-idx="${index}"]`
  );

  if (!card) return;

  const badge = card.querySelector('[data-unit-stance]');
  if (badge) badge.outerHTML = stanceBadge(unit);

  card.querySelectorAll('[data-action="change-stance"]').forEach(button => {
    const selected = button.dataset.stance === newStance;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

export function renderUnits() {
  const container = document.getElementById('dash-units-container');
  if (!container || !gameState) return;

  // В соло нельзя остаться на скрытой вкладке оппонента после выхода из комнаты.
  const effectiveTab = battleMode === 'room' ? viewTab : 'my';

  const tabs = battleMode === 'room' ? `
    <div class="bu-tabs">
      ${[
        ['my', 'Мой ростер'],
        ['opp', 'Оппонент'],
        ['both', 'Оба']
      ].map(([key, label]) => `
        <button type="button"
          class="bu-button ${effectiveTab === key ? 'is-selected' : ''}"
          data-action="view-tab" data-tab="${key}"
          aria-pressed="${effectiveTab === key}">
          ${label}
        </button>
      `).join('')}
    </div>
  ` : '';

  const visibleUnits = (gameState.units || [])
    .map((unit, index) => ({ unit, index }))
    .filter(item => matchesFilter(item.unit));

  const showOwn = effectiveTab !== 'opp';

  container.innerHTML = `
    ${tabs}
    ${renderControls()}

    ${showOwn ? `
      <div class="bu-grid">
        ${visibleUnits.length
          ? visibleUnits.map(({ unit, index }) =>
              renderUnitCard(unit, index, false)
            ).join('')
          : '<p class="bu-empty">Нет моделей для выбранного фильтра.</p>'}
      </div>
    ` : ''}
  `;

  bindActions(container);
}

function commitChanges() {
  saveGameState();
  pushMyState();
}

function updateCardState(card, unit) {
  if (!card) return;

  card.classList.toggle('dead', numeric(unit.currentHp) <= 0);
  card.classList.toggle('activated', !!unit.activated);

  const badge = card.querySelector('[data-unit-state]');
  if (badge) badge.outerHTML = stateBadge(unit);

  const activationButton = card.querySelector(
    '[data-action="toggle-activated"]'
  );

  if (activationButton) {
    activationButton.classList.toggle('is-active', !!unit.activated);
    activationButton.setAttribute('aria-pressed', String(!!unit.activated));
    activationButton.textContent = unit.activated
      ? '↶ Снять активацию'
      : '○ Активировать';
  }
}

function changeUnitHp(index, delta) {
  const unit = gameState?.units?.[index];
  if (!unit || !Number.isFinite(delta)) return;

  unit.currentHp = Math.max(
    0,
    Math.min(numeric(unit.maxHp), numeric(unit.currentHp) + delta)
  );

  commitChanges();

  const card = document.querySelector(
    `#dash-units-container .bu-card[data-idx="${index}"]`
  );

  if (card) {
    const appearance = hpAppearance(unit);
    const label = card.querySelector('[data-current-hp]');
    const bar = card.querySelector('.hp-bar-fill');

    if (label) label.textContent = `${unit.currentHp} / ${unit.maxHp}`;

    if (bar) {
      bar.style.width = `${appearance.percent}%`;
      bar.style.background = appearance.color;
    }

    updateCardState(card, unit);
  }

  renderMeta();
}

function appendStatus(index) {
  const unit = gameState?.units?.[index];
  if (!unit) return;

  const select = document.getElementById(`status-type-${index}`);
  const input = document.getElementById(`status-val-${index}`);

  if (!select || !input) return;
  if (!Array.isArray(unit.statuses)) unit.statuses = [];

  unit.statuses.push({
    type: select.value,
    name: select.options[select.selectedIndex].text,
    value: Math.max(1, parseInt(input.value, 10) || 1)
  });

  commitChanges();
  refreshStatuses(index);
}

function refreshStatuses(index) {
  const unit = gameState?.units?.[index];

  const card = document.querySelector(
    `#dash-units-container .bu-card[data-idx="${index}"]`
  );

  const container = card?.querySelector('.status-container');

  if (unit && container) {
    container.innerHTML = renderStatuses(unit, index, false);
  }
}

function modifyStatusValue(unitIndex, statusIndex, delta) {
  const status = gameState?.units?.[unitIndex]?.statuses?.[statusIndex];
  if (!status) return;

  status.value = Math.max(1, numeric(status.value, 1) + delta);

  commitChanges();
  refreshStatuses(unitIndex);
}

function removeStatus(unitIndex, statusIndex) {
  const unit = gameState?.units?.[unitIndex];
  if (!Array.isArray(unit?.statuses)) return;

  unit.statuses.splice(statusIndex, 1);

  commitChanges();
  refreshStatuses(unitIndex);
}

function toggleActivated(index) {
  const unit = gameState?.units?.[index];
  if (!unit) return;

  unit.activated = !unit.activated;
  commitChanges();

  const card = document.querySelector(
    `#dash-units-container .bu-card[data-idx="${index}"]`
  );

  updateCardState(card, unit);
}

export function renderOpponentUnits() {
  let container = document.getElementById('dash-opponent-container');

  if (battleMode !== 'room' || !gameState) {
    container?.remove();
    return;
  }

  const ownContainer = document.getElementById('dash-units-container');
  if (!ownContainer) return;

  if (!container) {
    container = document.createElement('div');
    container.id = 'dash-opponent-container';
    ownContainer.after(container);
  }

  if (viewTab === 'my') {
    container.innerHTML = '';
    return;
  }

  const units = (gameState.opponentUnits || [])
    .map((unit, index) => ({ unit, index }))
    .filter(item => matchesFilter(item.unit));

  container.innerHTML = `
    <div class="bu-opponent-heading">
      <h2>🛡️ Армия оппонента</h2>
      <p>${text(gameState.opponentName || 'Оппонент')}</p>
      <p>${text(gameState.opponentRosterName || '')}</p>
      <p>${text(gameState.opponentRosterClan || '')}</p>
    </div>

    <div class="bu-grid">
      ${units.length
        ? units.map(({ unit, index }) =>
            renderUnitCard(unit, index, true)
          ).join('')
        : '<p class="bu-empty">Нет доступных моделей для выбранного фильтра.</p>'}
    </div>
  `;

  bindActions(container);
}

export function openRulesModal(type) {
  const modal = document.getElementById('rules-modal');
  const body = document.getElementById('rules-modal-body');

  if (!modal || !body || !gameState) return;

  let title = '';
  let content = '';

  if (type === 'faction') {
    const rule = getFactionGeneralArticle(gameState.clan);

    title = `🛡️ ${getFactionFromClan(gameState.clan) || 'Фракция'}: общие правила`;
    content = rule?.content || 'Правила фракции не найдены.';
  }

  if (type === 'clan') {
    const article = DATABASE.find(item => item.title === gameState.clan);

    title = `📜 Правила клана: ${gameState.clan || '—'}`;

    if (article) {
      const root = document.createElement('div');
      root.innerHTML = article.content;
      root.querySelectorAll('.aos-card').forEach(card => card.remove());

      content = root.innerHTML.split(/Состав клана/i)[0];
    }

    content ||= 'Правила клана не найдены.';
  }

  if (type === 'mission') {
    let battleplanId = null;

    try {
      const roster = JSON.parse(localStorage.getItem('activeRoster') || 'null');
      battleplanId = roster?.battleplanId;
    } catch {
      // Показываем общие правила миссии.
    }

    const article =
      DATABASE.find(item => item.id === battleplanId) ||
      DATABASE.find(item => item.id === 'battleplan-rules');

    title = `🎯 ${article?.title || 'Правила миссий'}`;
    content = article?.content || 'Правила миссий не найдены.';
  }

  body.innerHTML = `
    <h2 class="bu-modal-title">${text(title)}</h2>
    <div class="bu-rules-content">${content}</div>
  `;

  modal.classList.remove('hidden');
}

export function closeRulesModal() {
  document.getElementById('rules-modal')?.classList.add('hidden');
}

export function openUnitCardModal(index, side = 'my') {
  const opponent = side === 'opp';

  const unit = opponent
    ? gameState?.opponentUnits?.[index]
    : gameState?.units?.[index];

  if (!unit) return;

  const modal = document.getElementById('unit-card-modal');
  const body = document.getElementById('unit-card-modal-body');
  if (!modal || !body) return;

  const details = extractUnitDetails(unit.html || '');

  const clanTitle = opponent
    ? gameState.opponentRosterClan
    : gameState.clan;

  body.innerHTML = `
    <div class="bu-reference">
      <h2 class="bu-modal-title">
        ${text(unit.uniqueKey || unit.title || 'Отряд')}
      </h2>

      <p class="bu-reference-meta">
        ${text(unit.role || 'Отряд')} · ${numeric(unit.cost)} очков
      </p>

      ${renderStats(unit)}
      ${renderArtifact(unit)}
      ${renderWeapons(details.weapons)}

      ${details.abilities.length ? `
        <h3 class="bu-reference-section">Особые свойства</h3>
        ${renderAbilities(details.abilities)}
      ` : ''}

      <button type="button" class="bu-button" id="open-clan-article">
        📖 Открыть статью клана
      </button>
    </div>
  `;

  body.querySelector('#open-clan-article')?.addEventListener('click', () => {
    const article = DATABASE.find(item => item.title === clanTitle);

    if (article) {
     window.open(
  `knowledge-base.html#${article.id}`,
  '_blank',
  'noopener'
);
    } else {
      alert('Статья клана не найдена в базе.');
    }
  });

  modal.classList.remove('hidden');
}

export function closeUnitCardModal() {
  document.getElementById('unit-card-modal')?.classList.add('hidden');
}