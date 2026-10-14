// src/account/matches.js
import { db, auth } from '../core/firebase.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getCurrentUser, loadUserData, nextGeneration } from './profile.js';
import { showMessage } from './auth.js';
import { humanizeFirestoreError } from '../utils/errors.js';
import { escapeHtml } from '../utils/escape.js';

const LS_MATCHES_KEY = 'localMatches';

// --- Локальные матчи ---
export function loadLocalMatches() {
  try {
    return JSON.parse(localStorage.getItem(LS_MATCHES_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveLocalMatches(list) {
  localStorage.setItem(LS_MATCHES_KEY, JSON.stringify(list));
}

export function renderLocalMatches() {
  const block = document.getElementById('local-matches-block');
  const listEl = document.getElementById('local-matches-list');
  if (!block || !listEl) return;

  const list = loadLocalMatches();
  if (list.length === 0) {
    block.classList.add('hidden');
    return;
  }

  block.classList.remove('hidden');
  listEl.innerHTML = list.map(m => {
    const resultBadge = m.result === 'win'
      ? '<span class="match-badge badge-win">🏆</span>'
      : m.result === 'loss'
        ? '<span class="match-badge badge-loss">💀</span>'
        : m.result === 'draw'
          ? '<span class="match-badge badge-draw">🤝</span>'
          : '';
    return `
      <div style="font-size:0.9rem; padding: 6px 0; border-bottom: 1px solid var(--border);">
        ${resultBadge}
        <strong>${escapeHtml(m.opponent || '—')}</strong> (${escapeHtml(m.rank || '—')})
        ${m.date ? '<span style="color: var(--text-muted);"> • ' + new Date(m.date).toLocaleString() + '</span>' : ''}
      </div>
    `;
  }).join('');
}

export function initMatchesUI() {
  const migrateMessage = document.getElementById('migrate-message');
  const matchMessage = document.getElementById('match-message');

  document.getElementById('btn-migrate-local').addEventListener('click', async () => {
    showMessage(migrateMessage, '');
    const user = getCurrentUser();
    if (!user) {
      showMessage(migrateMessage, 'Требуется авторизация.');
      return;
    }

    const list = loadLocalMatches();
    if (list.length === 0) {
      showMessage(migrateMessage, 'Локальных матчей нет.');
      return;
    }

    try {
      let saved = 0;
      for (const m of list) {
        const { id, ...data } = m;
        await addDoc(collection(db, 'users', user.uid, 'matches'), {
          ...data,
          migratedAt: new Date().toISOString()
        });
        saved++;
      }
      saveLocalMatches([]);
      showMessage(migrateMessage, `Перенесено матчей: ${saved}.`, 'info');
      await loadUserData(user.uid, nextGeneration());
      renderLocalMatches();
    } catch (err) {
      console.error('migrate error:', err);
      showMessage(migrateMessage, 'Ошибка миграции: ' + humanizeFirestoreError(err));
    }
  });

  document.getElementById('btn-clear-local').addEventListener('click', () => {
    if (!confirm('Удалить все локальные матчи? Это не затронет облако.')) return;
    saveLocalMatches([]);
    renderLocalMatches();
  });

  document.getElementById('btn-save-match').addEventListener('click', async () => {
    showMessage(matchMessage, '');
    const opponent = document.getElementById('match-opponent').value.trim();
    const rank = document.getElementById('match-rank').value.trim();
    const faction = document.getElementById('match-faction').value;
    const result = document.getElementById('match-result').value;

    if (!opponent) {
      showMessage(matchMessage, 'Введите имя оппонента!');
      return;
    }
    const user = getCurrentUser();
    if (!user) {
      showMessage(matchMessage, 'Сессия истекла — войдите заново.');
      return;
    }

    try {
      await addDoc(collection(db, "users", user.uid, "matches"), {
        opponent,
        rank: rank || 'Новичок',
        faction,
        result,
        myClan: faction,
        date: new Date().toISOString()
      });
      showMessage(matchMessage, 'Матч успешно сохранен!', 'info');
      document.getElementById('match-opponent').value = '';
      document.getElementById('match-rank').value = '';
      await loadUserData(user.uid, nextGeneration());
    } catch (err) {
      showMessage(matchMessage, 'Ошибка сохранения матча: ' + humanizeFirestoreError(err));
    }
  });
}