// src/battle/notes.js
//
// Лог боя: ручные заметки игроков.
// Хранятся в gameState.battleLog, синхронизируются через room-sync.

import { gameState, saveGameState, getPlayerName } from './state.js';
import { pushMyState } from './room-sync.js';
import { escapeHtml } from '../utils/escape.js';

export function initNotes() {
  const btn = document.getElementById('btn-battle-log');
  if (btn) btn.addEventListener('click', openLogModal);
}

/**
 * Открывает модалку для добавления заметки к конкретному юниту.
 */
export function openNoteModal(idx) {
  const u = gameState?.units?.[idx];
  if (!u) return;

  const modal = document.getElementById('note-modal');
  const body = document.getElementById('note-modal-body');
  if (!modal || !body) return;

  body.innerHTML = `
    <h2 style="color:var(--gold); margin-bottom:12px;">📝 Заметка к юниту</h2>
    <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:16px;">
      ${escapeHtml(u.uniqueKey || u.title)} (раунд ${gameState.round})
    </p>

    <div class="form-row">
      <label>Что произошло:</label>
      <textarea id="note-text" placeholder="Например: получил 3 урона от Прорыва, потерял 2 ХП" style="min-height:80px;"></textarea>
    </div>

    <div style="display:flex; gap:10px; margin-top:16px;">
      <button class="builder-action-btn primary" id="note-save">Добавить в лог</button>
      <button class="builder-action-btn" id="note-cancel">Отмена</button>
    </div>
  `;

  document.getElementById('note-cancel').addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  document.getElementById('note-save').addEventListener('click', () => {
    const text = document.getElementById('note-text').value.trim();
    if (!text) return;

    addLogEntry({
      round: gameState.round,
      unitTitle: u.uniqueKey || u.title,
      text
    });

    modal.classList.add('hidden');
  });

  modal.classList.remove('hidden');
  setTimeout(() => document.getElementById('note-text')?.focus(), 50);
}

/**
 * Добавляет запись в лог.
 */
export function addLogEntry({ round, unitTitle, text }) {
  if (!gameState) return;
  if (!Array.isArray(gameState.battleLog)) gameState.battleLog = [];

  gameState.battleLog.push({
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    round: round || gameState.round,
    unitTitle: unitTitle || '',
    text,
    author: getPlayerName() || 'Игрок',
    timestamp: new Date().toISOString()
  });

  saveGameState();
  pushMyState();
}

/**
 * Удаляет запись из лога по id.
 */
export function removeLogEntry(entryId) {
  if (!gameState || !Array.isArray(gameState.battleLog)) return;
  gameState.battleLog = gameState.battleLog.filter(e => e.id !== entryId);
  saveGameState();
  pushMyState();
}

/**
 * Открывает модалку с полным логом боя.
 */
export function openLogModal() {
  const modal = document.getElementById('log-modal');
  const body = document.getElementById('log-modal-body');
  if (!modal || !body) return;

  const log = Array.isArray(gameState?.battleLog) ? gameState.battleLog.slice().reverse() : [];

  if (log.length === 0) {
    body.innerHTML = `
      <h2 style="color:var(--gold); margin-bottom:12px;">📜 Лог боя</h2>
      <p style="color:var(--text-muted);">Пока пусто. Используйте кнопку «📝 Заметка» на карточке юнита.</p>
    `;
    modal.classList.remove('hidden');
    return;
  }

  const byRound = {};
  log.forEach(entry => {
    const r = entry.round || 0;
    if (!byRound[r]) byRound[r] = [];
    byRound[r].push(entry);
  });

  const roundsSorted = Object.keys(byRound).map(Number).sort((a, b) => b - a);

  body.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
      <h2 style="color:var(--gold); margin:0;">📜 Лог боя</h2>
      <button class="tab-btn danger" id="btn-clear-log-modal" style="padding:6px 12px; font-size:0.85rem;">🧹 Очистить</button>
    </div>

    ${roundsSorted.map(roundNum => `
      <div style="margin-bottom:20px;">
        <h3 style="color:var(--accent); font-size:1rem; margin-bottom:10px; border-bottom:1px solid var(--border); padding-bottom:6px;">
          Раунд ${roundNum}
        </h3>
        <div style="display:flex; flex-direction:column; gap:6px;">
          ${byRound[roundNum].map(entry => `
            <div style="background:rgba(255,255,255,0.02); border-left:3px solid var(--accent); padding:8px 12px; border-radius:0 6px 6px 0; font-size:0.9rem; position:relative;">
              <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-bottom:4px;">
                ${entry.unitTitle ? `<strong style="color:#fff;">${escapeHtml(entry.unitTitle)}</strong>` : '<em style="color:var(--text-muted);">Общее</em>'}
                <div style="display:flex; align-items:center; gap:10px;">
                  <span style="font-size:0.75rem; color:var(--text-muted);">
                    ${escapeHtml(entry.author || '')} • ${formatTime(entry.timestamp)}
                  </span>
                  <button class="log-remove-btn" data-log-id="${escapeHtml(entry.id)}" title="Удалить запись" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:1rem; padding:0 4px;">&times;</button>
                </div>
              </div>
              <div style="color:var(--text);">${escapeHtml(entry.text)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('')}
  `;

  document.getElementById('btn-clear-log-modal').addEventListener('click', () => {
    if (!confirm('Очистить лог боя?')) return;
    gameState.battleLog = [];
    saveGameState();
    pushMyState();
    openLogModal();
  });

  body.querySelectorAll('button.log-remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const entryId = btn.dataset.logId;
      if (!confirm('Удалить эту запись из лога?')) return;
      removeLogEntry(entryId);
      openLogModal();
    });
  });

  modal.classList.remove('hidden');
}

export function closeLogModal() {
  document.getElementById('log-modal')?.classList.add('hidden');
}

export function closeNoteModal() {
  document.getElementById('note-modal')?.classList.add('hidden');
}

/**
 * Возвращает текстовое представление лога — для прикрепления к матчу.
 */
export function getLogAsText() {
  const log = Array.isArray(gameState?.battleLog) ? gameState.battleLog : [];
  if (log.length === 0) return '';

  const byRound = {};
  log.forEach(e => {
    const r = e.round || 0;
    if (!byRound[r]) byRound[r] = [];
    byRound[r].push(e);
  });

  const lines = [];
  Object.keys(byRound).map(Number).sort((a, b) => a - b).forEach(r => {
    lines.push(`— Раунд ${r} —`);
    byRound[r].forEach(e => {
      const unit = e.unitTitle ? `[${e.unitTitle}] ` : '';
      lines.push(`${unit}${e.text}`);
    });
    lines.push('');
  });

  return lines.join('\n').trim();
}

function formatTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}