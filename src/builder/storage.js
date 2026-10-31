// src/builder/storage.js
//
// Сохранение и загрузка ростеров:
// Firestore для авторизованных пользователей,
// localStorage для гостей,
// экспорт/импорт JSON,
// печать и экспорт PDF через диалог браузера.
//
// Назначения артефактов проверяются:
// — перед сохранением;
// — перед JSON-экспортом;
// — перед печатью;
// — до загрузки ростера в текущее состояние.
//
// Важно: проверка назначений артефактов не заменяет
// полную валидацию импортируемых датакарт и HTML.

import {
  auth,
  saveUserRoster,
  getUserRosters,
  deleteUserRoster
} from '../core/firebase.js';

import {
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

import { DATABASE } from '../core/data.js';
import { ARTIFACTS_LIST } from '../content/artifacts.js';

import {
  roster,
  LS_ROSTERS_KEY,
  buildRosterPayload,
  ARMY_BUDGET,
  ARMY_MIN,
  STAKES_BUDGET,
  getRosterTotalCost,
  getArtifactsRosterCost,
  getCommanderInfo,
  getSelectedStakes,
  getStakesCost
} from './state.js';

import {
  validateRosterArtifacts,
  getUnitCardGroupKey
} from './artifacts.js';

import {
  renderRosterSummary,
  showSaveMessage
} from './render.js';

import { updateAvailableUnits } from './units.js';
import { renderStakesList } from './stakes.js';
import { escapeHtml } from '../utils/escape.js';

import {
  normalizeOfficialRoster,
  MAX_ROSTER_IMPORT_BYTES
} from './roster-import.js';

export let currentUser = null;

let lastSavedDocId = null;

const ROLE_SORT_ORDER = {
  basic: 1,
  elite: 2,
  hero: 3,
  other: 4
};

/* ==========================================================================
   Общие проверки
   ========================================================================== */

function checkArtifactsBeforeOutput() {
  const check = validateRosterArtifacts();

  if (check.ok) {
    return true;
  }

  showSaveMessage(
    'Исправьте назначения артефактов. ' +
    check.errors.join(' '),
    'err'
  );

  return false;
}

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

function sortRosterUnits(items) {
  return [...items].sort((a, b) => {
    const roleA = ROLE_SORT_ORDER[getRoleSortKey(a.role)] || 99;
    const roleB = ROLE_SORT_ORDER[getRoleSortKey(b.role)] || 99;

    if (roleA !== roleB) {
      return roleA - roleB;
    }

    const titleComparison = String(a.title || '').localeCompare(
      String(b.title || ''),
      'ru',
      { sensitivity: 'base' }
    );

    if (titleComparison !== 0) {
      return titleComparison;
    }

    return String(a.uniqueKey || a.title || '').localeCompare(
      String(b.uniqueKey || b.title || ''),
      'ru',
      { sensitivity: 'base' }
    );
  });
}

/* ==========================================================================
   Артефакты в печатных карточках
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
 * Дополняет датакарту артефактами носителя.
 * Исходные данные модели не изменяются.
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

    if (!label || !valueElement) {
      return;
    }

    const bonusKey = statMap[label];
    const bonus = bonuses[bonusKey] || 0;

    if (!bonusKey || bonus === 0) {
      return;
    }

    const baseValue = parseInt(valueElement.textContent, 10);

    if (!Number.isFinite(baseValue)) {
      return;
    }

    const totalValue = baseValue + bonus;
    const sourceText = bonusSources[bonusKey].join(', ');

    valueElement.innerHTML = `
      <span class="print-artifact-stat-total">${totalValue}</span>
      <span class="print-artifact-stat-bonus">(+${bonus})</span>
    `;

    statBox.classList.add('has-print-artifact-stat-bonus');

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
      <section class="print-card-artifact">
        <div class="print-card-artifact-header">
          <strong>${escapeHtml(artifact.name)}</strong>
          <span>${artifact.cost} очков</span>
        </div>

        ${bonusLabels.length > 0 ? `
          <div class="print-card-artifact-bonus">
            Применено: ${escapeHtml(bonusLabels.join(', '))}
          </div>
        ` : ''}

        <p>${escapeHtml(description)}</p>
      </section>
    `;
  }).join('');

  card.insertAdjacentHTML('beforeend', `
    <section class="print-card-artifacts">
      <h4>Артефакты носителя</h4>
      ${artifactsHTML}
    </section>
  `);

  return wrapper.innerHTML;
}

/* ==========================================================================
   Авторизация
   ========================================================================== */

export function initAuthWatcher() {
  onAuthStateChanged(auth, user => {
    currentUser = user && user.emailVerified
      ? user
      : null;

    const badge = document.getElementById('builder-user-status');

    if (!badge) {
      return;
    }

    if (currentUser) {
      badge.textContent = `☁️ ${currentUser.email || 'аккаунт'}`;
      badge.style.background = 'rgba(46,213,115,0.15)';
      badge.style.color = '#2ed573';
    } else {
      badge.textContent = '💻 Гость (локально)';
      badge.style.background = '#2a2a3a';
      badge.style.color = 'var(--text-muted)';
    }
  });
}

/* ==========================================================================
   Сохранение
   ========================================================================== */

export async function saveRoster() {
  showSaveMessage('');

  if (!checkArtifactsBeforeOutput()) {
    return;
  }

  if (!roster.clan) {
    showSaveMessage('Сначала выберите клан.', 'err');
    return;
  }

  if (roster.units.length === 0) {
    showSaveMessage('Нельзя сохранить пустой ростер.', 'err');
    return;
  }

  if (!roster.name || !roster.name.trim()) {
    showSaveMessage('Дайте ростеру имя.', 'err');
    return;
  }

  const payload = buildRosterPayload();
  const saveButton = document.getElementById('btn-save-roster');

  if (saveButton) {
    saveButton.disabled = true;
  }

  try {
    if (currentUser) {
      const existing = await getUserRosters(currentUser.uid);

      const sameNameRoster = existing.find(
        item => item.name === payload.name
      );

      const docId = await saveUserRoster(
        currentUser.uid,
        payload,
        sameNameRoster ? sameNameRoster.id : null
      );

      lastSavedDocId = docId;

      showSaveMessage(
        `Ростер «${payload.name}» сохранён в облако.`,
        'ok'
      );
    } else {
      saveToLocalStorage(payload);

      showSaveMessage(
        `Ростер «${payload.name}» сохранён локально.`,
        'ok'
      );
    }
  } catch (error) {
    console.error('saveRoster error:', error);

    showSaveMessage(
      `Ошибка сохранения: ${error?.message || 'неизвестная ошибка'}`,
      'err'
    );
  } finally {
    if (saveButton) {
      saveButton.disabled = false;
    }
  }
}

function saveToLocalStorage(payload) {
  const list = loadLocalRosters();

  const index = list.findIndex(
    item => item.name === payload.name
  );

  const record = {
    ...payload,
    id: `local-${Date.now()}`,
    updatedAt: new Date().toISOString()
  };

  if (index >= 0) {
    record.id = list[index].id;
    list[index] = record;
  } else {
    list.push(record);
  }

  localStorage.setItem(
    LS_ROSTERS_KEY,
    JSON.stringify(list)
  );
}

export function loadLocalRosters() {
  try {
    return JSON.parse(
      localStorage.getItem(LS_ROSTERS_KEY) || '[]'
    );
  } catch {
    return [];
  }
}

/* ==========================================================================
   Загрузка из списка
   ========================================================================== */

export async function openLoadModal() {
  showSaveMessage('');

  const modal = document.getElementById('builder-display-modal');
  const body = document.getElementById('builder-modal-body');

  if (!modal || !body) {
    return;
  }

  body.innerHTML = `
    <h2 style="
      color:var(--gold);
      border-bottom:2px solid var(--border);
      padding-bottom:8px;
    ">
      📂 Загрузить ростер
    </h2>

    <p style="color:var(--text-muted); margin-top:12px;">
      Загрузка…
    </p>
  `;

  modal.classList.remove('hidden');

  try {
    const list = currentUser
      ? await getUserRosters(currentUser.uid)
      : loadLocalRosters();

    if (!list || list.length === 0) {
      body.innerHTML = `
        <h2 style="
          color:var(--gold);
          border-bottom:2px solid var(--border);
          padding-bottom:8px;
        ">
          📂 Загрузить ростер
        </h2>

        <p style="color:var(--text-muted); margin-top:16px;">
          ${currentUser
            ? 'В облаке пока нет сохранённых ростеров.'
            : 'Локальных ростеров пока нет.'}
        </p>

        <p style="margin-top:16px;">
          <a href="account.html"
             class="builder-action-btn"
             style="text-decoration:none;">
            👤 Открыть личный кабинет
          </a>
        </p>
      `;

      return;
    }

    body.innerHTML = `
      <h2 style="
        color:var(--gold);
        border-bottom:2px solid var(--border);
        padding-bottom:8px;
      ">
        📂 Загрузить ростер
      </h2>

      <p style="color:var(--text-muted); margin-top:8px;">
        ${currentUser
          ? 'Облачные ростеры аккаунта:'
          : 'Локальные ростеры этого браузера:'}
      </p>

      <div style="
        margin-top:16px;
        display:flex;
        flex-direction:column;
        gap:8px;
      ">
        ${list.map(record => `
          <div style="
            background:rgba(255,255,255,0.02);
            border:1px solid var(--border);
            padding:12px 14px;
            border-radius:8px;
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:12px;
            flex-wrap:wrap;
          ">
            <div style="min-width:0; overflow-wrap:anywhere;">
              <strong style="color:#fff;">
                ${escapeHtml(String(record.name || 'Без имени'))}
              </strong>

              <div style="
                font-size:0.85rem;
                color:var(--text-muted);
                margin-top:2px;
              ">
                ${escapeHtml(String(record.clan || 'Армия'))}
                • ${escapeHtml(String(record.units?.length || 0))} моделей
                • ${escapeHtml(String(record.totalCost || 0))} очков

                ${record.stakesCost ? `
                  • клятвы:
                  ${escapeHtml(String(record.stakesCost))} МИ
                ` : ''}

                ${record.updatedAt ? `
                  • ${escapeHtml(
                    new Date(record.updatedAt).toLocaleString()
                  )}
                ` : ''}
              </div>
            </div>

            <div style="
              display:flex;
              gap:8px;
              flex-shrink:0;
            ">
              <button type="button"
                      class="builder-action-btn primary"
                      style="padding:6px 12px; font-size:0.85rem;"
                      data-action="load"
                      data-id="${escapeHtml(String(record.id))}">
                Загрузить
              </button>

              <button type="button"
                      class="builder-action-btn"
                      style="
                        padding:6px 12px;
                        font-size:0.85rem;
                        background:rgba(255,71,87,0.15);
                        border-color:#ff4757;
                        color:#ff4757;
                      "
                      data-action="delete"
                      data-id="${escapeHtml(String(record.id))}">
                Удалить
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    body.querySelectorAll('button[data-action]').forEach(button => {
      button.addEventListener('click', async () => {
        const action = button.dataset.action;
        const id = button.dataset.id;

        if (action === 'load') {
          await loadRosterById(id, list);
        }

        if (action === 'delete') {
          await removeRosterById(id);
          await openLoadModal();
        }
      });
    });
  } catch (error) {
    console.error('openLoadModal error:', error);

    body.innerHTML = `
      <h2 style="color:var(--gold);">
        📂 Загрузить ростер
      </h2>

      <p style="color:#ff4757; margin-top:16px;">
        Ошибка загрузки:
        ${escapeHtml(error?.message || 'неизвестная ошибка')}
      </p>
    `;
  }
}

async function loadRosterById(id, list) {
  const record = list.find(
    item => String(item.id) === String(id)
  );

  if (!record) {
    showSaveMessage('Ростер не найден в списке.', 'err');
    return;
  }

  try {
    loadRosterFromPayload(record);

    document
      .getElementById('builder-display-modal')
      .classList
      .add('hidden');

    showSaveMessage(
      `Ростер «${roster.name}» загружен.`,
      'ok'
    );
  } catch (error) {
    console.error('loadRosterById error:', error);

    const text =
      error?.message || 'Не удалось загрузить ростер.';

    showSaveMessage(text, 'err');

    // Сообщение видно и в открытом модальном окне.
    const body = document.getElementById('builder-modal-body');

    if (body) {
      let notice = body.querySelector(
        '[data-roster-load-error]'
      );

      if (!notice) {
        notice = document.createElement('p');
        notice.dataset.rosterLoadError = '';
        notice.setAttribute('role', 'alert');
        notice.style.color = '#ffadb7';
        notice.style.marginTop = '12px';

        body.prepend(notice);
      }

      notice.textContent = text;
    }
  }
}

async function removeRosterById(id) {
  if (!confirm('Удалить этот ростер?')) {
    return;
  }

  try {
    if (currentUser) {
      await deleteUserRoster(currentUser.uid, id);

      showSaveMessage(
        'Ростер удалён из облака.',
        'ok'
      );
    } else {
      const list = loadLocalRosters();

      const filtered = list.filter(
        item => String(item.id) !== String(id)
      );

      localStorage.setItem(
        LS_ROSTERS_KEY,
        JSON.stringify(filtered)
      );

      showSaveMessage(
        'Локальный ростер удалён.',
        'ok'
      );
    }
  } catch (error) {
    console.error('removeRosterById error:', error);

    showSaveMessage(
      `Ошибка удаления: ${error?.message || 'неизвестная ошибка'}`,
      'err'
    );
  }
}

/* ==========================================================================
   Экспорт и импорт JSON
   ========================================================================== */

export function exportRosterJson() {
  if (!checkArtifactsBeforeOutput()) {
    return;
  }

  if (!roster.clan) {
    showSaveMessage('Сначала выберите клан.', 'err');
    return;
  }

  if (roster.units.length === 0) {
    showSaveMessage(
      'Нельзя экспортировать пустой ростер — ' +
      'добавьте хотя бы один отряд.',
      'err'
    );

    return;
  }

  const payload = buildRosterPayload();

  payload._meta = {
    exportedAt: new Date().toISOString(),
    exportedBy: currentUser ? currentUser.email : 'гость',
    formatVersion: 2
  };

  const json = JSON.stringify(payload, null, 2);

  const blob = new Blob([json], {
    type: 'application/json;charset=utf-8'
  });

  const url = URL.createObjectURL(blob);

  const slug = (payload.name || 'roster')
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'roster';

  const link = document.createElement('a');

  link.href = url;
  link.download = `roster-${slug}.json`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);

  showSaveMessage(
    `Ростер «${payload.name}» выгружен в файл.`,
    'ok'
  );
}

export function importRosterJson() {
  const input = document.createElement('input');

  input.type = 'file';
  input.accept = '.json,application/json';

  input.addEventListener('change', async event => {
    const file = event.target.files && event.target.files[0];

    if (!file) {
      return;
    }

    try {
      if (file.size > MAX_ROSTER_IMPORT_BYTES) {
        throw new Error(
          'Файл слишком большой. Максимальный размер — 2 МиБ.'
        );
      }

      const text = await file.text();
      const data = JSON.parse(text);

      loadRosterFromPayload(data);

      showSaveMessage(
        `Ростер «${roster.name}» загружен. ` +
        'Официальные карточки, классы и цены восстановлены ' +
        'из текущего каталога.',
        'ok'
      );
    } catch (error) {
      console.error('importRosterJson error:', error);

      showSaveMessage(
        'Ошибка импорта: ' +
        (error?.message || 'файл повреждён или не подходит'),
        'err'
      );
    }
  });

  input.click();
}

/**
 * Восстанавливает ростер из localStorage, Firestore или JSON.
 *
 * Проверка артефактов выполняется до изменения текущей армии.
 * Ошибочные назначения не удаляются и не исправляются молча.
 *
 * Полная проверка остальных импортируемых полей и восстановление
 * официального HTML из каталога будут добавлены отдельно.
 */
/**
 * Восстанавливает официальный ростер из локального списка,
 * облачного списка или JSON.
 *
 * Все проверки и восстановление карточек выполняются
 * до изменения текущего ростера.
 */
export function loadRosterFromPayload(record) {
  const next = normalizeOfficialRoster(record);

  roster.name = next.name;
  roster.clan = next.clan;
  roster.battleplanId = next.battleplanId;
  roster.selectedStakes = next.selectedStakes;
  roster.units = next.units;
  roster.artifacts = next.artifacts;

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
}

/* ==========================================================================
   Печать / PDF
   ========================================================================== */

export function exportPdf() {
  if (!checkArtifactsBeforeOutput()) {
    return;
  }

  const selectedBattleplan = DATABASE.find(
    item => item.id === roster.battleplanId
  );

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

  let formattedBattleplanHTML = '';

  if (selectedBattleplan) {
    formattedBattleplanHTML = selectedBattleplan.content
      .replace(
        /<h3>Основное игровое поле<\/h3>/g,
        '<div class="map-page-break"></div>' +
        '<h3>Основное игровое поле</h3>'
      )
      .replace(
        /<h3>Расстановка Атакующего и Защищающегося<\/h3>/g,
        '<div class="map-page-break"></div>' +
        '<h3>Расстановка Атакующего и Защищающегося</h3>'
      )
      .replace(
        /<h3>Эвакуация<\/h3>/g,
        '<div class="map-page-break"></div><h3>Эвакуация</h3>'
      )
      .replace(
        /<h3>Тайлы и подсказки<\/h3>/g,
        '<div class="map-page-break"></div>' +
        '<h3>Тайлы и подсказки</h3>'
      );
  }

  const sortedRosterUnits = sortRosterUnits(
    roster.units.map((unit, rosterIndex) => ({
      ...unit,
      rosterIndex
    }))
  );

  // Одинаковое название само по себе недостаточно:
  // учитываем исходную карточку и назначенное снаряжение.
  const uniqueCardsMap = new Map();

  sortedRosterUnits.forEach(unit => {
    const key = getUnitCardGroupKey(
      unit,
      unit.rosterIndex
    );

    const existing = uniqueCardsMap.get(key);

    if (existing) {
      existing.modelNumbers.push(unit.rosterIndex + 1);
    } else {
      uniqueCardsMap.set(key, {
        ...unit,
        modelNumbers: [unit.rosterIndex + 1]
      });
    }
  });

  const uniqueCardsHTML = Array
    .from(uniqueCardsMap.values())
    .map(unit => `
      <section class="print-model-group">
        <p class="print-model-numbers">
          Экземпляры:
          ${unit.modelNumbers
            .map(number => `#${number}`)
            .join(', ')}
          · ${unit.modelNumbers.length} шт.
        </p>

        ${renderUnitCardWithArtifacts(
          unit,
          unit.rosterIndex
        )}
      </section>
    `);

  const cardPairs = [];

  for (
    let index = 0;
    index < uniqueCardsHTML.length;
    index += 2
  ) {
    cardPairs.push(
      uniqueCardsHTML.slice(index, index + 2)
    );
  }

  const cardsPagesHTML = cardPairs.map((pair, pageIndex) => `
    <div class="cards-page">
      <h2>
        Датакарты отрядов армии (стр. ${pageIndex + 1}):
      </h2>

      <div class="cards-grid-page">
        ${pair.join('')}
      </div>
    </div>
  `).join('');

  const totalPts = getRosterTotalCost();
  const artifactsCost = getArtifactsRosterCost();
  const commanderInfo = getCommanderInfo();
  const selectedStakes = getSelectedStakes();

  const stakesHTML = selectedStakes.length === 0
    ? '<p style="color:#888;">Клятвы не выбраны.</p>'
    : selectedStakes.map(stake => `
        <div style="
          border:1px solid #ccc;
          border-radius:6px;
          padding:10px 12px;
          margin-bottom:8px;
        ">
          <div style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:10px;
            margin-bottom:4px;
          ">
            <strong>
              ${escapeHtml(stake.name)}
              [${escapeHtml(stake.classLabel)}]
            </strong>

            <span>${stake.cost} МИ</span>
          </div>

          <div style="font-size:12px; margin-bottom:4px;">
            ${escapeHtml(stake.description)}
          </div>

          <div style="font-size:11px;">
            <span>Награда: +${stake.reward} ОП</span>

            ${stake.penalty > 0 ? `
              <span style="margin-left:12px;">
                Провал: −${stake.penalty} ОП
              </span>
            ` : ''}
          </div>

          ${stake.minRules.length > 0 ? `
            <div style="
              font-size:11px;
              color:#555;
              margin-top:4px;
            ">
              <strong>Минимум:</strong>

              <ul style="padding-left:16px; margin-top:2px;">
                ${stake.minRules.map(rule => `
                  <li>${escapeHtml(rule)}</li>
                `).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      `).join('');

  const armySummaryHTML = Array
    .from(uniqueCardsMap.values())
    .map(unit => {
      const artifacts = getArtifactsForUnit(
        unit.rosterIndex
      );

      const equipment = artifacts.length
        ? artifacts.map(artifact => artifact.name).join(', ')
        : 'без артефакта';

      return `
        <li>
          <strong>
            ${escapeHtml(unit.uniqueKey || unit.title)}
          </strong>
          — ${unit.modelNumbers.length} шт.

          <br>

          Экземпляры:
          ${unit.modelNumbers
            .map(number => `#${number}`)
            .join(', ')}
          · ${escapeHtml(equipment)}
        </li>
      `;
    }).join('');

  const printHTML = `
    <!DOCTYPE html>
    <html lang="ru">
      <head>
        <meta charset="UTF-8">

        <title>
          ${escapeHtml(roster.name || 'Боевой Ростер')}
        </title>

        <style>
          body {
            font-family: Arial, sans-serif;
            color: #000;
            background: #fff;
            padding: 24px;
            line-height: 1.5;
          }

          h1 {
            font-size: 26px;
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 8px;
            margin-bottom: 20px;
          }

          h2 {
            font-size: 18px;
            margin-top: 10px;
            border-bottom: 1px solid #000;
            padding-bottom: 6px;
            page-break-after: avoid;
            break-after: avoid;
          }

          ul {
            padding-left: 20px;
          }

          li {
            margin-bottom: 6px;
          }

          .page-break {
            page-break-before: always;
            break-before: page;
            padding-top: 10px;
          }

          .map-page-break {
            page-break-before: always;
            break-before: page;
          }

          .cards-page {
            page-break-before: always;
            break-before: page;
            box-sizing: border-box;
          }

          .cards-grid-page {
            display: flex;
            flex-direction: column;
            gap: 16px;
            margin-top: 12px;
          }

          .print-model-group {
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .print-model-numbers {
            font-size: 11px;
            margin: 0 0 5px;
          }

          .aos-card {
            border: 2px solid #000 !important;
            border-radius: 8px !important;
            padding: 12px 16px !important;
            margin: 8px 0 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            background: #fff !important;
          }

          .aos-header {
            display: flex !important;
            justify-content: space-between !important;
            font-weight: bold !important;
            font-size: 15px !important;
            border-bottom: 1px solid #000 !important;
            padding-bottom: 6px !important;
            margin-bottom: 6px !important;
          }

          .aos-stats-grid {
            display: table !important;
            width: 100% !important;
            table-layout: fixed !important;
            background: #000 !important;
            margin: 8px 0 !important;
            border-collapse: collapse !important;
          }

          .aos-stat-box {
            display: table-cell !important;
            width: 33.333% !important;
            background: #fff !important;
            border: 1px solid #000 !important;
            padding: 6px 4px !important;
            text-align: center !important;
          }

          .aos-stat-label {
            font-size: 10px !important;
            font-weight: bold !important;
            text-transform: uppercase !important;
            color: #000 !important;
            display: block !important;
            margin-bottom: 2px !important;
          }

          .aos-stat-value {
            font-size: 14px !important;
            font-weight: bold !important;
            color: #000 !important;
            display: block !important;
          }

          .aos-weapons-section {
            border-bottom: 1px solid #000 !important;
            padding-bottom: 6px !important;
            margin-bottom: 6px !important;
          }

          .aos-weapon-item {
            border: 1px solid #999 !important;
            padding: 6px 10px !important;
            margin-bottom: 4px !important;
            border-radius: 4px !important;
            background: #fff !important;
          }

          .aos-weapon-header {
            display: flex !important;
            justify-content: space-between !important;
            font-weight: bold !important;
            margin-bottom: 2px !important;
          }

          .aos-weapon-stats {
            display: flex !important;
            gap: 20px !important;
            font-size: 12px !important;
          }

          .aos-ability {
            margin-top: 6px !important;
            font-size: 12px !important;
          }

          .print-card-artifacts {
            margin-top: 12px !important;
            padding-top: 10px !important;
            border-top: 2px solid #000 !important;
          }

          .print-card-artifacts h4 {
            margin: 0 0 8px !important;
            font-size: 12px !important;
            text-transform: uppercase !important;
            letter-spacing: 0.08em !important;
          }

          .print-card-artifact {
            padding: 8px 10px !important;
            margin-top: 6px !important;
            border: 1px solid #000 !important;
            border-left: 4px solid #000 !important;
            border-radius: 4px !important;
          }

          .print-card-artifact-header {
            display: flex !important;
            justify-content: space-between !important;
            gap: 12px !important;
            font-size: 12px !important;
            font-weight: bold !important;
          }

          .print-card-artifact p {
            margin: 4px 0 0 !important;
            font-size: 11px !important;
          }

          .aos-stat-box.has-print-artifact-stat-bonus {
            background: #edf9f0 !important;
          }

          .aos-stat-box.has-print-artifact-stat-bonus
          .aos-stat-label {
            color: #156b35 !important;
          }

          .print-artifact-stat-total {
            color: #156b35 !important;
          }

          .print-artifact-stat-bonus {
            margin-left: 4px !important;
            color: #156b35 !important;
            font-size: 11px !important;
            font-weight: bold !important;
          }

          .print-card-artifact-bonus {
            margin-top: 4px !important;
            color: #156b35 !important;
            font-size: 11px !important;
            font-weight: bold !important;
          }

          img {
            max-width: 85%;
            max-height: 70vh;
            height: auto;
            display: block;
            margin: 12px auto;
            border: 1px solid #333;
            border-radius: 6px;
            page-break-inside: avoid;
            break-inside: avoid;
          }
        </style>
      </head>

      <body>
        <h1>
          ${escapeHtml(roster.name || 'Боевой Ростер')}
        </h1>

        <p>
          <strong>Клан армии:</strong>
          ${escapeHtml(roster.clan || 'Не выбран')}
        </p>

        <p>
          <strong>Очки армии:</strong>
          ${totalPts} / ${ARMY_BUDGET}

          ${artifactsCost > 0 ? `
            (включая артефакты: ${artifactsCost})
          ` : ''}

          ${totalPts < ARMY_MIN ? `
            (ниже рекомендуемого размера ${ARMY_MIN})
          ` : ''}
        </p>

        <p>
          <strong>Командир:</strong>
          ${commanderInfo
            ? escapeHtml(commanderInfo.title)
            : 'не назначен'}
        </p>

        <h2>
          Выбранные клятвы
          (${selectedStakes.length},
          ${getStakesCost()} / ${STAKES_BUDGET} МИ):
        </h2>

        ${stakesHTML}

        <h2 style="margin-top:24px;">
          Сводный состав армии
          (${roster.units.length} моделей):
        </h2>

        <ul>
          ${armySummaryHTML}
        </ul>

        ${cleanClanContent ? `
          <div class="page-break"></div>

          <h2>Правила и способности клана</h2>

          <div>${cleanClanContent}</div>
        ` : ''}

        ${selectedBattleplan ? `
          <div class="page-break"></div>

          <h2>
            Сценарий:
            ${escapeHtml(selectedBattleplan.title)}
          </h2>

          <div>${formattedBattleplanHTML}</div>
        ` : ''}

        ${cardsPagesHTML}

        <script>
          window.onload = function() {
            window.print();
            window.close();
          };
        </script>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');

  if (!printWindow) {
    showSaveMessage(
      'Не удалось открыть окно печати. ' +
      'Разрешите всплывающие окна для этого сайта.',
      'err'
    );

    return;
  }

  printWindow.document.write(printHTML);
  printWindow.document.close();
}