// src/account/matches.js

import {
  saveUserMatch,
  saveMigratedLocalMatch
} from '../core/firebase.js';

import {
  getCurrentUser,
  loadUserData,
  nextGeneration,
  getGeneration
} from './profile.js';

import { showMessage } from './auth.js';
import { humanizeFirestoreError } from '../utils/errors.js';
import { escapeHtml } from '../utils/escape.js';

const LS_MATCHES_KEY = 'localMatches';

let migrationBusy = false;
let saveBusy = false;

/* ==========================================================================
   LocalStorage
   ========================================================================== */

function createLocalMatchId() {
  if (typeof crypto?.randomUUID === 'function') {
    return `local-${crypto.randomUUID()}`;
  }

  const random = Math.random()
    .toString(36)
    .slice(2);

  return `local-${Date.now().toString(36)}-${random}`;
}

function isLocalMatchId(value) {
  return typeof value === 'string' &&
    /^local-[A-Za-z0-9_-]{8,128}$/.test(value);
}

function normalizeLocalMatches(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  let changed = false;

  const result = value.reduce((list, item) => {
    if (
      !item ||
      typeof item !== 'object' ||
      Array.isArray(item)
    ) {
      changed = true;
      return list;
    }

    const localMatchId = isLocalMatchId(item.localMatchId)
      ? item.localMatchId
      : createLocalMatchId();

    if (localMatchId !== item.localMatchId) {
      changed = true;
    }

    list.push({
      ...item,
      localMatchId
    });

    return list;
  }, []);

  return {
    list: result,
    changed
  };
}

/* ==========================================================================
   Локальные матчи
   ========================================================================== */

export function loadLocalMatches() {
  try {
    const raw = JSON.parse(
      localStorage.getItem(LS_MATCHES_KEY) || '[]'
    );

    const normalized = normalizeLocalMatches(raw);

    if (normalized.changed) {
      saveLocalMatches(normalized.list);
    }

    return normalized.list;
  } catch {
    return [];
  }
}

export function saveLocalMatches(list) {
  localStorage.setItem(
    LS_MATCHES_KEY,
    JSON.stringify(Array.isArray(list) ? list : [])
  );
}

function removeLocalMatch(localMatchId) {
  const current = loadLocalMatches();

  const next = current.filter(item =>
    item.localMatchId !== localMatchId
  );

  saveLocalMatches(next);

  return next;
}

function getDateTime(value) {
  if (!value) return 0;

  if (typeof value.toMillis === 'function') {
    return value.toMillis();
  }

  if (typeof value.toDate === 'function') {
    return value.toDate().getTime();
  }

  const time = new Date(value).getTime();

  return Number.isFinite(time) ? time : 0;
}

function formatLocalDate(value) {
  const time = getDateTime(value);

  return time
    ? new Date(time).toLocaleString('ru-RU')
    : '';
}

function isCurrentContext(context) {
  return Boolean(
    getCurrentUser()?.uid === context.uid &&
    getGeneration() === context.generation
  );
}

function setButtonBusy(id, busy) {
  const button = document.getElementById(id);

  if (button) {
    button.disabled = busy;
  }
}

function getMatchForm() {
  return {
    opponent: document.getElementById('match-opponent'),
    rank: document.getElementById('match-rank'),
    faction: document.getElementById('match-faction'),
    opponentClan: document.getElementById(
      'match-opponent-clan'
    ),
    result: document.getElementById('match-result')
  };
}

/* ==========================================================================
   Отрисовка
   ========================================================================== */

export function renderLocalMatches() {
  const block = document.getElementById('local-matches-block');
  const listElement = document.getElementById(
    'local-matches-list'
  );

  if (!block || !listElement) return;

  const list = loadLocalMatches();

  if (list.length === 0) {
    block.classList.add('hidden');
    return;
  }

  block.classList.remove('hidden');

  listElement.innerHTML = list.map(match => {
    const resultBadge = match.result === 'win'
      ? '<span class="match-badge badge-win">🏆</span>'
      : match.result === 'loss'
        ? '<span class="match-badge badge-loss">💀</span>'
        : match.result === 'draw'
          ? '<span class="match-badge badge-draw">🤝</span>'
          : '';

    const date = formatLocalDate(match.date);

    return `
      <div style="
        font-size:0.9rem;
        padding:6px 0;
        border-bottom:1px solid var(--border);
      ">
        ${resultBadge}
        <strong>${escapeHtml(match.opponent || '—')}</strong>
        (${escapeHtml(match.rank || '—')})

        ${date ? `
          <span style="color:var(--text-muted);">
            • ${escapeHtml(date)}
          </span>
        ` : ''}
      </div>
    `;
  }).join('');
}

/* ==========================================================================
   События
   ========================================================================== */

export function initMatchesUI() {
  const migrateMessage = document.getElementById(
    'migrate-message'
  );
  const matchMessage = document.getElementById(
    'match-message'
  );

  const migrateButton = document.getElementById(
    'btn-migrate-local'
  );
  const clearButton = document.getElementById(
    'btn-clear-local'
  );
  const saveButton = document.getElementById(
    'btn-save-match'
  );

  migrateButton?.addEventListener('click', async () => {
    if (migrationBusy) return;

    showMessage(migrateMessage, '');

    const user = getCurrentUser();

    if (!user?.uid) {
      showMessage(
        migrateMessage,
        'Требуется авторизация.'
      );
      return;
    }

    const context = {
      uid: user.uid,
      generation: getGeneration()
    };

    const initialList = loadLocalMatches();

    if (initialList.length === 0) {
      showMessage(
        migrateMessage,
        'Локальных матчей нет.'
      );
      return;
    }

    migrationBusy = true;
    setButtonBusy('btn-migrate-local', true);
    setButtonBusy('btn-clear-local', true);

    let saved = 0;
    let failed = 0;

    try {
      for (const localMatch of initialList) {
        // Не продолжаем операцию в интерфейсе другого аккаунта.
        // Уже завершённый Firestore-запрос перенаправить нельзя,
        // но следующий запрос старой сессии не начнётся.
        if (!isCurrentContext(context)) {
          return;
        }

        try {
          await saveMigratedLocalMatch(
            context.uid,
            localMatch.localMatchId,
            localMatch
          );

          if (!isCurrentContext(context)) {
            return;
          }

          // Убираем только уже подтверждённую запись.
          // При сбое на следующей останутся только неперенесённые.
          removeLocalMatch(localMatch.localMatchId);
          saved += 1;
        } catch (error) {
          console.error(
            'Local match migration error:',
            localMatch.localMatchId,
            error
          );

          failed += 1;
        }
      }

      if (!isCurrentContext(context)) {
        return;
      }

      renderLocalMatches();

      if (failed > 0) {
        showMessage(
          migrateMessage,
          `Перенесено матчей: ${saved}. ` +
          `Не удалось перенести: ${failed}. ` +
          'Они остались локально, повторите попытку позже.'
        );
      } else {
        showMessage(
          migrateMessage,
          `Перенесено матчей: ${saved}.`,
          'info'
        );
      }

      // Загружаем облако только для того же аккаунта.
      const refreshGeneration = nextGeneration();

      await loadUserData(
        context.uid,
        refreshGeneration
      );
    } catch (error) {
      console.error('migrate error:', error);

      if (isCurrentContext(context)) {
        showMessage(
          migrateMessage,
          'Ошибка миграции: ' +
          humanizeFirestoreError(error)
        );
      }
    } finally {
      migrationBusy = false;

      // Не меняем кнопки в интерфейсе другого пользователя.
      if (getCurrentUser()?.uid === context.uid) {
        setButtonBusy('btn-migrate-local', false);
        setButtonBusy('btn-clear-local', false);
      }
    }
  });

  clearButton?.addEventListener('click', () => {
    if (migrationBusy) return;

    if (!confirm(
      'Удалить все локальные матчи? Это не затронет облако.'
    )) {
      return;
    }

    saveLocalMatches([]);
    renderLocalMatches();

    showMessage(migrateMessage, '');
  });

  saveButton?.addEventListener('click', async () => {
    if (saveBusy) return;

    showMessage(matchMessage, '');

    const fields = getMatchForm();

    const opponent = fields.opponent?.value.trim() || '';
    const rank = fields.rank?.value.trim() || '';
    const faction = fields.faction?.value || '';
    const opponentClan = fields.opponentClan?.value || '';
    const result = fields.result?.value || '';

    if (!opponent) {
      showMessage(
        matchMessage,
        'Введите имя оппонента!'
      );
      fields.opponent?.focus();
      return;
    }

    const user = getCurrentUser();

    if (!user?.uid) {
      showMessage(
        matchMessage,
        'Сессия истекла — войдите заново.'
      );
      return;
    }

    const context = {
      uid: user.uid,
      generation: getGeneration()
    };

    saveBusy = true;
    setButtonBusy('btn-save-match', true);

    try {
      await saveUserMatch(context.uid, {
        opponent,
        rank: rank || 'Новичок',

        // Совместимость со старым форматом.
        faction,

        opponentClan,
        result,
        myClan: faction,
        date: new Date().toISOString()
      });

      if (!isCurrentContext(context)) {
        return;
      }

      showMessage(
        matchMessage,
        'Матч успешно сохранён!',
        'info'
      );

      if (fields.opponent) fields.opponent.value = '';
      if (fields.rank) fields.rank.value = '';
      if (fields.opponentClan) {
        fields.opponentClan.value = '';
      }

      const refreshGeneration = nextGeneration();

      await loadUserData(
        context.uid,
        refreshGeneration
      );
    } catch (error) {
      console.error('save match error:', error);

      if (isCurrentContext(context)) {
        showMessage(
          matchMessage,
          'Ошибка сохранения матча: ' +
          humanizeFirestoreError(error)
        );
      }
    } finally {
      saveBusy = false;

      if (getCurrentUser()?.uid === context.uid) {
        setButtonBusy('btn-save-match', false);
      }
    }
  });
}