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

let authWatcherStarted = false;
let authReady = false;
let authGeneration = 0;

let saveBusy = false;
let listActionBusy = false;

let loadModalGeneration = 0;

function renderAuthBadge() {
  const badge = document.getElementById('builder-user-status');

  if (!badge) return;

  if (!authReady) {
    badge.textContent = 'Проверяем аккаунт…';
    badge.style.background = '#2a2a3a';
    badge.style.color = 'var(--text-muted)';
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
}

function invalidateLoadModal() {
  loadModalGeneration += 1;

  const body = document.getElementById('builder-modal-body');

  if (!body?.hasAttribute('data-roster-list-generation')) {
    return;
  }

  body.removeAttribute('data-roster-list-generation');

  const notice = document.createElement('p');

  notice.setAttribute('role', 'status');
  notice.style.marginTop = '12px';
  notice.textContent =
    'Аккаунт изменился или его проверка прервалась. ' +
    'Закройте окно и откройте список ростеров заново.';

  body.replaceChildren(notice);
}

function captureStorageContext() {
  initAuthWatcher();

  if (!authReady) {
    throw new Error(
      'Дождитесь проверки аккаунта и повторите действие.'
    );
  }

  const actual = auth.currentUser;

  const verifiedUid = actual?.emailVerified
    ? actual.uid
    : null;

  if ((currentUser?.uid ?? null) !== verifiedUid) {
    throw new Error(
      'Аккаунт изменился. Дождитесь обновления его состояния.'
    );
  }

  return {
    generation: authGeneration,
    uid: currentUser?.uid ?? null,

    // Даже неподтверждённый аккаунт отличаем от полного выхода.
    authUid: actual?.uid ?? null,
    verified: actual?.emailVerified === true
  };
}

function storageContextIsCurrent(context) {
  const actual = auth.currentUser;

  return Boolean(
    authReady &&
    context.generation === authGeneration &&
    context.uid === (currentUser?.uid ?? null) &&
    context.authUid === (actual?.uid ?? null) &&
    context.verified === (actual?.emailVerified === true)
  );
}

function assertStorageContext(context) {
  if (!storageContextIsCurrent(context)) {
    throw new Error(
      'Аккаунт изменился во время операции. ' +
      'Откройте список или повторите действие заново.'
    );
  }
}

function listViewIsCurrent(view) {
  return Boolean(
    storageContextIsCurrent(view.context) &&
    view.generation === loadModalGeneration &&
    view.modal.isConnected &&
    view.body.isConnected &&
    document.getElementById('builder-modal-body') === view.body &&
    !view.modal.classList.contains('hidden') &&
    view.body.dataset.rosterListGeneration ===
      String(view.generation)
  );
}

function assertListView(view) {
  if (!listViewIsCurrent(view)) {
    throw new Error(
      'Этот список ростеров устарел. Откройте его заново.'
    );
  }
}

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
  // Повторное открытие билдера обновляет новый badge,
  // но не создаёт ещё одну подписку Firebase.
  if (authWatcherStarted) {
    renderAuthBadge();
    return;
  }

  authWatcherStarted = true;
  renderAuthBadge();

  onAuthStateChanged(
    auth,

    user => {
      authGeneration += 1;
      authReady = true;

      currentUser = user && user.emailVerified
        ? user
        : null;

      lastSavedDocId = null;

      invalidateLoadModal();
      renderAuthBadge();
    },

    error => {
      console.error('Builder auth watcher:', error);

      authGeneration += 1;
      authReady = false;
      currentUser = null;
      lastSavedDocId = null;

      invalidateLoadModal();
      renderAuthBadge();

      showSaveMessage(
        'Не удалось проверить аккаунт. ' +
        'Сохранение и список ростеров временно недоступны. ' +
        'Обновите страницу перед продолжением.',
        'err'
      );
    }
  );
}

/* ==========================================================================
   Сохранение
   ========================================================================== */

export async function saveRoster() {
  if (saveBusy) {
    showSaveMessage(
      'Сохранение уже выполняется. Дождитесь результата.',
      'err'
    );
    return;
  }

  showSaveMessage('');

  if (!checkArtifactsBeforeOutput()) return;

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

  let context;
  let payload;

  try {
    context = captureStorageContext();

    // После начала сохранения работаем с независимым снимком,
    // даже если пользователь продолжит менять армию.
    payload = JSON.parse(
      JSON.stringify(buildRosterPayload())
    );
  } catch (error) {
    showSaveMessage(
      error?.message || 'Не удалось подготовить сохранение.',
      'err'
    );
    return;
  }

  const saveButton = document.getElementById('btn-save-roster');

  const previousDisabled = saveButton?.disabled ?? false;

  saveBusy = true;

  if (saveButton) {
    saveButton.disabled = true;
  }

  try {
    assertStorageContext(context);

    if (context.uid !== null) {
      const existing = await getUserRosters(context.uid);

      assertStorageContext(context);

      if (!Array.isArray(existing)) {
        throw new Error(
          'Облако вернуло неподдерживаемый список ростеров.'
        );
      }

      const sameNameRoster = existing.find(
        item => item && item.name === payload.name
      );

      // UID зафиксирован до первого await.
      // Никогда не подставляем сюда новый currentUser.uid.
      const docId = await saveUserRoster(
        context.uid,
        payload,
        sameNameRoster ? sameNameRoster.id : null
      );

      // Уже отправленный запрос отменить этим guard нельзя.
      // Но его результат не принимаем за сохранение
      // текущего нового аккаунта.
      if (!storageContextIsCurrent(context)) {
        showSaveMessage(
          'Аккаунт изменился во время сохранения. ' +
          'Запрос был адресован исходному аккаунту. ' +
          'Проверьте его облачный список перед повторным сохранением.',
          'err'
        );
        return;
      }

      lastSavedDocId = docId;

      showSaveMessage(
        `Ростер «${payload.name}» сохранён в облако.`,
        'ok'
      );
    } else {
      assertStorageContext(context);

      saveToLocalStorage(payload);

      showSaveMessage(
        `Ростер «${payload.name}» сохранён локально.`,
        'ok'
      );
    }
  } catch (error) {
    console.error('saveRoster error:', error);

    showSaveMessage(
      storageContextIsCurrent(context)
        ? `Ошибка сохранения: ${
            error?.message || 'неизвестная ошибка'
          }`
        : 'Аккаунт изменился. Результат сохранения не принят ' +
          'для текущего аккаунта. Проверьте исходный список ' +
          'ростеров перед повтором.',
      'err'
    );
  } finally {
    saveBusy = false;

    if (
      saveButton?.isConnected &&
      document.getElementById('btn-save-roster') === saveButton
    ) {
      saveButton.disabled = previousDisabled;
    }
  }
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
  if (listActionBusy) {
    showSaveMessage(
      'Дождитесь завершения действия со списком ростеров.',
      'err'
    );
    return;
  }

  showSaveMessage('');

  let context;

  try {
    context = captureStorageContext();
  } catch (error) {
    showSaveMessage(error.message, 'err');
    return;
  }

  const modal = document.getElementById('builder-display-modal');
  const body = document.getElementById('builder-modal-body');

  if (!modal || !body) return;

  const generation = ++loadModalGeneration;

  const view = {
    context,
    generation,
    modal,
    body
  };

  function node(tag, text = '', className = '') {
    const element = document.createElement(tag);

    element.textContent = text;

    if (className) element.className = className;

    return element;
  }

  function heading() {
    const title = node('h2', '📂 Загрузить ростер');

    Object.assign(title.style, {
      color: 'var(--gold)',
      borderBottom: '2px solid var(--border)',
      paddingBottom: '8px'
    });

    return title;
  }

  const loading = node('p', 'Загрузка…');

  loading.style.marginTop = '12px';
  loading.setAttribute('role', 'status');

  body.replaceChildren(heading(), loading);

  body.dataset.rosterListGeneration = String(generation);

  modal.classList.remove('hidden');

  let actionBusy = false;
  let list = [];

  const status = node('p');

  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.style.marginTop = '12px';

  function notice(text, error = false) {
    if (!listViewIsCurrent(view)) return;

    status.textContent = text;
    status.style.color = error ? '#ffadb7' : '';

    if (!body.contains(status)) {
      body.append(status);
    }
  }

  function updateActionButtons() {
    body.querySelectorAll('button[data-roster-list-action]')
      .forEach(button => {
        button.disabled = actionBusy;
      });
  }

  function displayDate(value) {
    if (!value) return '';

    const date = typeof value.toDate === 'function'
      ? value.toDate()
      : new Date(value);

    return Number.isFinite(date.getTime())
      ? date.toLocaleString('ru-RU')
      : '';
  }

  function renderList() {
    assertListView(view);

    const description = node(
      'p',
      context.uid !== null
        ? 'Облачные ростеры аккаунта:'
        : 'Локальные ростеры этого браузера:'
    );

    description.style.color = 'var(--text-muted)';
    description.style.marginTop = '8px';

    body.replaceChildren(heading(), description);

    if (!list.length) {
      body.append(
        node(
          'p',
          context.uid !== null
            ? 'В облаке пока нет сохранённых ростеров.'
            : 'Локальных ростеров пока нет.'
        )
      );

      const account = node(
        'a',
        '👤 Открыть личный кабинет',
        'builder-action-btn'
      );

      account.href = 'account.html';
      account.style.marginTop = '16px';

      body.append(account, status);
      return;
    }

    const container = node('div');

    Object.assign(container.style, {
      marginTop: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    });

    for (const record of list) {
      const row = node('div');

      Object.assign(row.style, {
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid var(--border)',
        padding: '12px 14px',
        borderRadius: '8px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap'
      });

      const info = node('div');

      info.style.minWidth = '0';
      info.style.overflowWrap = 'anywhere';

      const title = node(
        'strong',
        String(record.name || 'Без имени')
      );

      title.style.color = '#fff';

      const metadata = [
        String(record.clan || 'Армия'),
        `${record.units?.length || 0} моделей`,
        `${record.totalCost || 0} очков`
      ];

      if (record.stakesCost) {
        metadata.push(`клятвы: ${record.stakesCost} МИ`);
      }

      const date = displayDate(record.updatedAt);

      if (date) metadata.push(date);

      const details = node('p', metadata.join(' • '));

      Object.assign(details.style, {
        fontSize: '0.85rem',
        color: 'var(--text-muted)',
        marginTop: '2px'
      });

      info.append(title, details);

      const actions = node('div');

      Object.assign(actions.style, {
        display: 'flex',
        gap: '8px',
        flexShrink: '0'
      });

      const load = node(
        'button',
        'Загрузить',
        'builder-action-btn primary'
      );

      const remove = node(
        'button',
        'Удалить',
        'builder-action-btn'
      );

      for (const button of [load, remove]) {
        button.type = 'button';
        button.dataset.rosterListAction = '';
        button.style.padding = '6px 12px';
        button.style.fontSize = '0.85rem';
      }

      Object.assign(remove.style, {
        background: 'rgba(255,71,87,0.15)',
        borderColor: '#ff4757',
        color: '#ff4757'
      });

      load.addEventListener('click', () => {
        if (actionBusy || listActionBusy) return;

        try {
          assertListView(view);

          loadRosterFromPayload(record);

          // Загрузка синхронная; только после её успеха
          // закрываем именно этот список.
          if (listViewIsCurrent(view)) {
            modal.classList.add('hidden');
            body.removeAttribute('data-roster-list-generation');
            loadModalGeneration += 1;
          }

          showSaveMessage(
            `Ростер «${roster.name}» загружен.`,
            'ok'
          );
        } catch (error) {
          console.error('Roster list load:', error);

          notice(
            error?.message || 'Не удалось загрузить ростер.',
            true
          );
        }
      });

      remove.addEventListener('click', async () => {
        if (actionBusy || listActionBusy) return;

        let requestStarted = false;

        try {
          assertListView(view);

          if (!confirm(
            `Удалить ростер «${record.name || 'Без имени'}»?`
          )) {
            return;
          }

          // Подтверждение не является гарантией,
          // что контекст аккаунта всё ещё актуален.
          assertListView(view);

          actionBusy = true;
          listActionBusy = true;
          updateActionButtons();

          const id = String(record.id);

          if (context.uid !== null) {
            requestStarted = true;

            // Удаление всегда адресовано исходному UID.
            await deleteUserRoster(context.uid, id);

            if (!listViewIsCurrent(view)) return;
          } else {
            assertStorageContext(context);

            const actualList = loadLocalRosters();

            if (!Array.isArray(actualList)) {
              throw new Error(
                'Локальный список имеет неподдерживаемый формат.'
              );
            }

            const filtered = actualList.filter(
              item => String(item.id) !== id
            );

            localStorage.setItem(
              LS_ROSTERS_KEY,
              JSON.stringify(filtered)
            );
          }

          assertListView(view);

          list = list.filter(
            item => String(item.id) !== id
          );

          renderList();

          notice(
            context.uid !== null
              ? 'Ростер удалён из облака.'
              : 'Локальный ростер удалён.'
          );
        } catch (error) {
          console.error('Roster list delete:', error);

          if (listViewIsCurrent(view)) {
            notice(
              `Ошибка удаления: ${
                error?.message || 'неизвестная ошибка'
              }` +
              (requestStarted
                ? ' Перед повтором обновите список.'
                : ''),
              true
            );
          }
        } finally {
          actionBusy = false;
          listActionBusy = false;

          if (listViewIsCurrent(view)) {
            updateActionButtons();
          }
        }
      });

      actions.append(load, remove);
      row.append(info, actions);
      container.append(row);
    }

    body.append(container, status);
    updateActionButtons();
  }

  try {
    const received = context.uid !== null
      ? await getUserRosters(context.uid)
      : loadLocalRosters();

    // Старый запрос не должен заменить содержимое
    // нового окна или список другого аккаунта.
    if (!listViewIsCurrent(view)) return;

    if (
      !Array.isArray(received) ||
      received.some(record =>
        !record ||
        typeof record !== 'object' ||
        Array.isArray(record) ||
        !['string', 'number'].includes(typeof record.id)
      )
    ) {
      throw new Error(
        'Список ростеров имеет неподдерживаемый формат.'
      );
    }

    list = received;

    renderList();
  } catch (error) {
    console.error('openLoadModal error:', error);

    if (!listViewIsCurrent(view)) return;

    body.replaceChildren(heading(), status);

    notice(
      `Ошибка загрузки: ${
        error?.message || 'неизвестная ошибка'
      }`,
      true
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