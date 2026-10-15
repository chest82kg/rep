// src/account/profile.js
import { db, getUserMatches } from '../core/firebase.js';
import { collection, getDocs, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { escapeHtml } from '../utils/escape.js';

let loadGeneration = 0;
let currentUserCache = null;

export function setCurrentUser(user) {
  currentUserCache = user;
}

export function getCurrentUser() {
  return currentUserCache;
}

export function nextGeneration() {
  return ++loadGeneration;
}

export function getGeneration() {
  return loadGeneration;
}

export async function loadUserData(uid, generation) {
  try {
    const matches = await getUserMatches(uid);

    if (generation !== loadGeneration) return;

    renderStats(matches);
    renderMatchHistory(matches);

    const rostersSnap = await getDocs(collection(db, "users", uid, "rosters"));
    const rosters = rostersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (generation !== loadGeneration) return;

    renderRosters(rosters);
  } catch (err) {
    console.error('Ошибка загрузки данных:', err);
    if (generation === loadGeneration) {
      const el = document.getElementById('match-history-list');
      if (el) {
        el.innerHTML = '<p style="color: #ff4757;">Не удалось загрузить данные: ' + escapeHtml(err?.message || 'ошибка') + '</p>';
      }
    }
  }
}

function renderStats(matches) {
  const total = matches.length;
  let wins = 0, losses = 0, draws = 0;
  const clansCount = {};

  matches.forEach(m => {
    if (m.result === 'win') wins++;
    else if (m.result === 'loss') losses++;
    else if (m.result === 'draw') draws++;

    const clan = m.myClan || m.faction;
    if (clan) clansCount[clan] = (clansCount[clan] || 0) + 1;
  });

  const withoutResult = matches.filter(m => !m.result);
  if (withoutResult.length > 0) {
    withoutResult.forEach(m => {
      if (typeof m.vpOwn === 'number' && typeof m.vpOpp === 'number') {
        if (m.vpOwn > m.vpOpp) wins++;
        else if (m.vpOwn < m.vpOpp) losses++;
        else draws++;
      }
    });
  }

  document.getElementById('stat-total-games').textContent = total;
  document.getElementById('stat-wins').textContent = wins;
  document.getElementById('stat-losses').textContent = losses;
  document.getElementById('stat-draws').textContent = draws;

  const decisive = wins + losses;
  const winrate = decisive > 0 ? Math.round((wins / decisive) * 100) + '%' : '—';
  document.getElementById('stat-winrate').textContent = winrate;

  const favClan = Object.keys(clansCount).reduce(
    (a, b) => (clansCount[a] > clansCount[b] ? a : b),
    ''
  );
  document.getElementById('stat-fav-clan').textContent = favClan || '—';
}

function renderMatchHistory(matches) {
  const list = document.getElementById('match-history-list');
  if (!list) return;

  if (matches.length === 0) {
    list.innerHTML = '<p style="color: var(--text-muted);">Вы еще не добавили ни одного сыгранного матча.</p>';
    return;
  }

  list.innerHTML = matches.map(m => {
    const result = m.result || (typeof m.vpOwn === 'number' && typeof m.vpOpp === 'number'
      ? (m.vpOwn > m.vpOpp ? 'win' : m.vpOwn < m.vpOpp ? 'loss' : 'draw')
      : null);

    const resultBadge = result === 'win'
      ? '<span class="match-badge badge-win">🏆 Победа</span>'
      : result === 'loss'
        ? '<span class="match-badge badge-loss">💀 Поражение</span>'
        : result === 'draw'
          ? '<span class="match-badge badge-draw">🤝 Ничья</span>'
          : '';

    const score = (typeof m.vpOwn === 'number' && typeof m.vpOpp === 'number')
      ? ` • ${m.vpOwn}:${m.vpOpp}`
      : '';

    const rounds = m.round ? ` • ${m.round} раунд(ов)` : '';
    const oppClan = m.opponentClan || m.faction || '';

    return `
      <div class="list-item-row">
        <div class="item-main">
          ${resultBadge}
          <strong>Оппонент: ${escapeHtml(m.opponent || '—')}</strong> (${escapeHtml(m.rank || '—')})${score}${rounds}<br>
          <span style="font-size: 0.85rem; color: var(--text-muted);">
            ${m.myClan ? 'Мой клан: ' + escapeHtml(m.myClan) : ''}
            ${oppClan ? ' • Против: ' + escapeHtml(oppClan) : ''}
            ${m.myRosterName ? ' • Ростер: ' + escapeHtml(m.myRosterName) : ''}
          </span>
          ${m.notes ? `<div style="font-size:0.85rem; color: var(--text-muted); margin-top:4px; font-style:italic;">${escapeHtml(m.notes)}</div>` : ''}
          ${m.battleLog ? `<details style="margin-top:6px;"><summary style="font-size:0.82rem; color: var(--accent); cursor:pointer;">📜 Лог боя</summary><pre style="font-size:0.78rem; color:var(--text-muted); white-space:pre-wrap; margin-top:6px; padding:8px; background:rgba(0,0,0,0.2); border-radius:6px;">${escapeHtml(m.battleLog)}</pre></details>` : ''}
        </div>
        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0;">
          <span style="font-size: 0.8rem; color: var(--accent);">${m.date ? new Date(m.date).toLocaleDateString() : ''}</span>
          <button class="danger" data-match-id="${escapeHtml(m.id)}" style="background:none; border:none; color:#ff4757; cursor:pointer; font-weight:bold; font-size:0.8rem; padding:4px 8px; border-radius:6px;">🗑 Удалить</button>
        </div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('button[data-match-id]').forEach(btn => {
    btn.addEventListener('click', () => deleteMatch(btn.dataset.matchId));
  });
}

export async function deleteMatch(matchId) {
  if (!confirm('Удалить этот матч из истории? Это повлияет на статистику.')) return;
  if (!currentUserCache) return;
  try {
    await deleteDoc(doc(db, "users", currentUserCache.uid, "matches", matchId));
    await loadUserData(currentUserCache.uid, nextGeneration());
  } catch (err) {
    alert('Ошибка удаления: ' + (err?.message || 'неизвестная ошибка'));
  }
}

export function renderRosters(rosters) {
  const container = document.getElementById('cloud-rosters-list');
  if (!container) return;

  if (rosters.length === 0) {
    container.innerHTML = '<p style="color: var(--text-muted);">В облаке пока нет сохраненных ростеров.</p>';
    return;
  }

  container.innerHTML = rosters.map(r => `
    <div class="list-item-row">
      <div class="item-main">
        <strong>${escapeHtml(r.name || 'Без имени')}</strong><br>
        <span style="font-size: 0.85rem; color: var(--text-muted);">
          ${escapeHtml(r.clan || 'Армия')} • Моделей: ${(r.units?.length || 0)}${r.totalCost ? ' • ' + r.totalCost + ' очков' : ''}
        </span>
      </div>
      <div class="item-actions" style="display:flex; gap:8px;">
        <button class="builder-action-btn" data-preview-id="${r.id}" style="padding:4px 10px; font-size:0.8rem;">👁 Просмотр</button>
        <button class="danger" data-roster-id="${r.id}">Удалить</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('button[data-roster-id]').forEach(btn => {
    btn.addEventListener('click', () => deleteRoster(btn.dataset.rosterId));
  });

  container.querySelectorAll('button[data-preview-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const roster = rosters.find(r => String(r.id) === String(btn.dataset.previewId));
      if (roster) openRosterPreview(roster);
    });
  });
}

export async function deleteRoster(rosterId) {
  if (!confirm('Удалить этот ростер из облака?')) return;
  if (!currentUserCache) return;
  try {
    await deleteDoc(doc(db, "users", currentUserCache.uid, "rosters", rosterId));
    await loadUserData(currentUserCache.uid, nextGeneration());
  } catch (err) {
    alert('Ошибка удаления: ' + (err?.message || 'неизвестная ошибка'));
  }
}

// --- Просмотр ростера ---

export function openRosterPreview(roster) {
  const modal = document.getElementById('roster-preview-modal');
  const body = document.getElementById('roster-preview-body');
  if (!modal || !body) return;

  const units = roster.units || [];
  const artifacts = roster.artifacts || [];
  const stakes = roster.selectedStakesFull || [];

  body.innerHTML = `
    <h2 style="color:var(--gold); border-bottom:2px solid var(--border); padding-bottom:8px;">
      ${escapeHtml(roster.name || 'Без имени')}
    </h2>
    <p style="color:var(--text-muted); margin-top:8px; font-size:0.9rem;">
      ${escapeHtml(roster.clan || 'Армия')} • ${units.length} моделей • ${roster.totalCost || 0} очков
    </p>

    ${units.length > 0 ? `
      <h3 style="color:var(--accent); font-size:1rem; margin-top:20px; margin-bottom:8px;">Состав</h3>
      <div style="display:flex; flex-direction:column; gap:6px;">
        ${units.map((u, idx) => {
          const art = artifacts.find(a => a.targetIdx === idx);
          return `
            <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border); border-radius:6px; padding:8px 12px; display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
              <span>
                <strong>#${idx + 1}</strong> ${escapeHtml(u.uniqueKey || u.title || '—')}
                ${art ? `<span style="background:rgba(209,179,132,0.15); color:var(--gold); font-size:0.72rem; padding:2px 6px; border-radius:6px; font-weight:700; margin-left:6px;">🎁 ${escapeHtml(art.name || art.id)}</span>` : ''}
              </span>
              <span style="color:var(--text-muted); font-size:0.85rem;">${escapeHtml(u.role || '')} • ${u.cost || 0} очков</span>
            </div>
          `;
        }).join('')}
      </div>
    ` : '<p style="color:var(--text-muted);">Юниты не добавлены.</p>'}

    ${stakes.length > 0 ? `
      <h3 style="color:var(--accent); font-size:1rem; margin-top:20px; margin-bottom:8px;">Клятвы</h3>
      <div style="display:flex; flex-direction:column; gap:6px;">
        ${stakes.map(st => `
          <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border); border-radius:6px; padding:8px 12px;">
            <strong>${escapeHtml(st.name || '—')}</strong>
            <span style="color:var(--text-muted); font-size:0.85rem; margin-left:6px;">[${escapeHtml(st.classLabel || '—')}] • ${st.cost || 0} МИ</span>
          </div>
        `).join('')}
      </div>
    ` : ''}
  `;

  modal.classList.remove('hidden');
}

export function closeRosterPreview() {
  document.getElementById('roster-preview-modal')?.classList.add('hidden');
}