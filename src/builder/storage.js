// src/builder/storage.js
//
// Сохранение и загрузка ростеров: облако (Firestore) для авторизованных,
// localStorage для гостей. Плюс экспорт/импорт JSON-файла, экспорт PDF.

import { auth, saveUserRoster, getUserRosters, deleteUserRoster } from '../core/firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { DATABASE } from '../core/data.js';
import {
  roster,
  LS_ROSTERS_KEY,
  buildRosterPayload,
  ARMY_BUDGET,
  ARMY_MIN,
  STAKES_BUDGET,
  getTotalArmyCost,
  getCommanderInfo,
  getSelectedStakes,
  getStakesCost
} from './state.js';
import { renderRosterSummary, showSaveMessage } from './render.js';
import { updateAvailableUnits } from './units.js';
import { renderStakesList } from './stakes.js';
import { escapeHtml } from '../utils/escape.js';

export let currentUser = null;
let lastSavedDocId = null;

// --- Авторизация ---
export function initAuthWatcher() {
  onAuthStateChanged(auth, (user) => {
    currentUser = (user && user.emailVerified) ? user : null;
    const badge = document.getElementById('builder-user-status');
    if (!badge) return;
    if (currentUser) {
      badge.textContent = '☁️ ' + (currentUser.email || 'аккаунт');
      badge.style.background = 'rgba(46,213,115,0.15)';
      badge.style.color = '#2ed573';
    } else {
      badge.textContent = '💻 Гость (локально)';
      badge.style.background = '#2a2a3a';
      badge.style.color = 'var(--text-muted)';
    }
  });
}

// --- СОХРАНЕНИЕ ---

export async function saveRoster() {
  showSaveMessage('');
  if (!roster.clan) { showSaveMessage('Сначала выберите клан.', 'err'); return; }
  if (roster.units.length === 0) { showSaveMessage('Нельзя сохранить пустой ростер.', 'err'); return; }
  if (!roster.name || !roster.name.trim()) { showSaveMessage('Дайте ростеру имя.', 'err'); return; }

  const payload = buildRosterPayload();
  const saveBtn = document.getElementById('btn-save-roster');
  if (saveBtn) saveBtn.disabled = true;

  try {
    if (currentUser) {
      const existing = await getUserRosters(currentUser.uid);
      const same = existing.find(r => r.name === payload.name);
      const docId = await saveUserRoster(currentUser.uid, payload, same ? same.id : null);
      lastSavedDocId = docId;
      showSaveMessage(`Ростер «${payload.name}» сохранён в облако.`, 'ok');
    } else {
      saveToLocalStorage(payload);
      showSaveMessage(`Ростер «${payload.name}» сохранён локально.`, 'ok');
    }
  } catch (err) {
    console.error('saveRoster error:', err);
    showSaveMessage('Ошибка сохранения: ' + (err?.message || 'неизвестная ошибка'), 'err');
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}

function saveToLocalStorage(payload) {
  const list = loadLocalRosters();
  const idx = list.findIndex(r => r.name === payload.name);
  const record = { ...payload, id: 'local-' + Date.now(), updatedAt: new Date().toISOString() };
  if (idx >= 0) {
    record.id = list[idx].id;
    list[idx] = record;
  } else {
    list.push(record);
  }
  localStorage.setItem(LS_ROSTERS_KEY, JSON.stringify(list));
}

export function loadLocalRosters() {
  try {
    return JSON.parse(localStorage.getItem(LS_ROSTERS_KEY) || '[]');
  } catch {
    return [];
  }
}

// --- ЗАГРУЗКА ИЗ СПИСКА ---

export async function openLoadModal() {
  showSaveMessage('');
  const modal = document.getElementById('builder-display-modal');
  const body = document.getElementById('builder-modal-body');

  body.innerHTML = `<h2 style="color:var(--gold); border-bottom:2px solid var(--border); padding-bottom:8px;">📂 Загрузить ростер</h2><p style="color:var(--text-muted); margin-top:12px;">Загрузка…</p>`;
  modal.classList.remove('hidden');

  try {
    const list = currentUser
      ? await getUserRosters(currentUser.uid)
      : loadLocalRosters();

    if (!list || list.length === 0) {
      body.innerHTML = `
        <h2 style="color:var(--gold); border-bottom:2px solid var(--border); padding-bottom:8px;">📂 Загрузить ростер</h2>
        <p style="color:var(--text-muted); margin-top:16px;">
          ${currentUser ? 'В облаке пока нет сохранённых ростеров.' : 'Локальных ростеров пока нет.'}
        </p>
        <p style="margin-top:16px;">
          <a href="account.html" class="builder-action-btn" style="text-decoration:none;">👤 Открыть личный кабинет</a>
        </p>
      `;
      return;
    }

    body.innerHTML = `
      <h2 style="color:var(--gold); border-bottom:2px solid var(--border); padding-bottom:8px;">📂 Загрузить ростер</h2>
      <p style="color:var(--text-muted); margin-top:8px;">
        ${currentUser ? 'Облачные ростеры аккаунта:' : 'Локальные ростеры этого браузера:'}
      </p>
      <div style="margin-top:16px; display:flex; flex-direction:column; gap:8px;">
        ${list.map(r => `
          <div style="background: rgba(255,255,255,0.02); border:1px solid var(--border); padding:12px 14px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; gap:12px;">
            <div style="min-width:0;">
              <strong style="color:#fff;">${escapeHtml(r.name || 'Без имени')}</strong>
              <div style="font-size:0.85rem; color:var(--text-muted); margin-top:2px;">
                ${escapeHtml(r.clan || 'Армия')} • ${(r.units?.length || 0)} моделей • ${r.totalCost || 0} очков
                ${r.stakesCost ? ' • ставки: ' + r.stakesCost + ' МИ' : ''}
                ${r.updatedAt ? ' • ' + new Date(r.updatedAt).toLocaleString() : ''}
              </div>
            </div>
            <div style="display:flex; gap:8px; flex-shrink:0;">
              <button class="builder-action-btn primary" style="padding:6px 12px; font-size:0.85rem;" data-action="load" data-id="${r.id}">Загрузить</button>
              <button class="builder-action-btn" style="padding:6px 12px; font-size:0.85rem; background:rgba(255,71,87,0.15); border-color:#ff4757; color:#ff4757;" data-action="delete" data-id="${r.id}">Удалить</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    body.querySelectorAll('button[data-action]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        if (action === 'load') {
          await loadRosterById(id, list);
        } else if (action === 'delete') {
          await removeRosterById(id);
          await openLoadModal();
        }
      });
    });
  } catch (err) {
    console.error('openLoadModal error:', err);
    body.innerHTML = `
      <h2 style="color:var(--gold);">📂 Загрузить ростер</h2>
      <p style="color:#ff4757; margin-top:16px;">Ошибка загрузки: ${escapeHtml(err?.message || 'неизвестная ошибка')}</p>
    `;
  }
}

async function loadRosterById(id, list) {
  const record = list.find(r => String(r.id) === String(id));
  if (!record) {
    showSaveMessage('Ростер не найден в списке.', 'err');
    return;
  }

  loadRosterFromPayload(record);

  document.getElementById('builder-display-modal').classList.add('hidden');
  showSaveMessage(`Ростер «${roster.name}» загружен.`, 'ok');
}

async function removeRosterById(id) {
  if (!confirm('Удалить этот ростер?')) return;
  try {
    if (currentUser) {
      await deleteUserRoster(currentUser.uid, id);
      showSaveMessage('Ростер удалён из облака.', 'ok');
    } else {
      const list = loadLocalRosters();
      const filtered = list.filter(r => String(r.id) !== String(id));
      localStorage.setItem(LS_ROSTERS_KEY, JSON.stringify(filtered));
      showSaveMessage('Локальный ростер удалён.', 'ok');
    }
  } catch (err) {
    console.error('removeRosterById error:', err);
    showSaveMessage('Ошибка удаления: ' + (err?.message || 'неизвестная ошибка'), 'err');
  }
}

// --- ЭКСПОРТ / ИМПОРТ JSON ---

export function exportRosterJson() {
  if (!roster.clan) {
    showSaveMessage('Сначала выберите клан.', 'err');
    return;
  }
  if (roster.units.length === 0) {
    showSaveMessage('Нельзя экспортировать пустой ростер — добавьте хотя бы один отряд.', 'err');
    return;
  }

  const payload = buildRosterPayload();
  payload._meta = {
    exportedAt: new Date().toISOString(),
    exportedBy: currentUser ? currentUser.email : 'гость',
    formatVersion: 2
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const slug = (payload.name || 'roster')
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'roster';

  const a = document.createElement('a');
  a.href = url;
  a.download = `roster-${slug}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => URL.revokeObjectURL(url), 1000);

  showSaveMessage(`Ростер «${payload.name}» выгружен в файл.`, 'ok');
}

export function importRosterJson() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';

  input.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data || typeof data !== 'object') {
        throw new Error('Файл не содержит объект ростера.');
      }
      if (!Array.isArray(data.units)) {
        throw new Error('В файле нет поля «units» или оно не массив.');
      }

      loadRosterFromPayload(data);
      showSaveMessage(`Ростер «${data.name || 'Без имени'}» загружен из файла.`, 'ok');
    } catch (err) {
      console.error('importRosterJson error:', err);
      showSaveMessage('Ошибка импорта: ' + (err?.message || 'файл повреждён или не подходит'), 'err');
    }
  });

  input.click();
}

export function loadRosterFromPayload(record) {
  roster.name = record.name || 'Мой Ростер';
  roster.clan = record.clan || '';
  roster.battleplanId = record.battleplanId || '';
  roster.selectedStakes = Array.isArray(record.selectedStakes) ? [...record.selectedStakes] : [];
  roster.units = Array.isArray(record.units) ? record.units.map(u => ({
    title: u.title,
    uniqueKey: u.uniqueKey,
    role: u.role || '',
    cost: u.cost || 0,
    html: u.html
  })) : [];

  const nameInput = document.getElementById('builder-roster-name');
  if (nameInput) nameInput.value = roster.name;

  const factionSelect = document.getElementById('builder-faction-select');
  if (factionSelect) factionSelect.value = roster.clan;

  const battleplanSelect = document.getElementById('builder-battleplan-select');
  if (battleplanSelect) battleplanSelect.value = roster.battleplanId;

  updateAvailableUnits();
  renderStakesList();
  renderRosterSummary();
}

// --- ЭКСПОРТ PDF ---

export function exportPdf() {
  const selectedBattleplan = DATABASE.find(i => i.id === roster.battleplanId);
  const clanArticle = DATABASE.find(item => item.title === roster.clan);

  let cleanClanContent = '';
  if (clanArticle) {
    cleanClanContent = clanArticle.content
      .replace(/<div class="aos-card">[\s\S]*?<\/div>\s*<\/div>/g, '')
      .split(/Состав клана/i)[0];
  }

  let formattedBattleplanHTML = '';
  if (selectedBattleplan) {
    formattedBattleplanHTML = selectedBattleplan.content
      .replace(/<h3>Основное игровое поле<\/h3>/g, '<div class="map-page-break"></div><h3>Основное игровое поле</h3>')
      .replace(/<h3>Расстановка Атакующего и Защищающегося<\/h3>/g, '<div class="map-page-break"></div><h3>Расстановка Атакующего и Защищающегося</h3>')
      .replace(/<h3>Эвакуация<\/h3>/g, '<div class="map-page-break"></div><h3>Эвакуация</h3>')
      .replace(/<h3>Тайлы и подсказки<\/h3>/g, '<div class="map-page-break"></div><h3>Тайлы и подсказки</h3>');
  }

  const counts = {};
  roster.units.forEach(u => { counts[u.uniqueKey] = (counts[u.uniqueKey] || 0) + 1; });

  const uniqueCardsMap = new Map();
  roster.units.forEach(u => { if (!uniqueCardsMap.has(u.uniqueKey)) uniqueCardsMap.set(u.uniqueKey, u.html); });
  const uniqueCardsHTML = Array.from(uniqueCardsMap.values());

  const cardPairs = [];
  for (let i = 0; i < uniqueCardsHTML.length; i += 2) {
    cardPairs.push(uniqueCardsHTML.slice(i, i + 2));
  }

  const cardsPagesHTML = cardPairs.map((pair, pageIdx) => `
    <div class="cards-page">
      <h2>Датакарты отрядов армии (стр. ${pageIdx + 1}):</h2>
      <div class="cards-grid-page">
        ${pair.join('')}
      </div>
    </div>
  `).join('');

  const totalPts = getTotalArmyCost();
  const commanderInfo = getCommanderInfo();
  const selectedStakes = getSelectedStakes();

  const stakesHTML = selectedStakes.length === 0
    ? '<p style="color:#888;">Ставки не выбраны.</p>'
    : selectedStakes.map(st => `
        <div style="border:1px solid #ccc; border-radius:6px; padding:10px 12px; margin-bottom:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <strong>${escapeHtml(st.name)} [${st.classLabel}]</strong>
            <span>${st.cost} МИ</span>
          </div>
          <div style="font-size:12px; margin-bottom:4px;">${escapeHtml(st.description)}</div>
          <div style="font-size:11px;">
            <span>Награда: +${st.reward} ОП</span>
            ${st.penalty > 0 ? `<span style="margin-left:12px;">Провал: −${st.penalty} ОП</span>` : ''}
          </div>
          ${st.minRules.length > 0 ? `
            <div style="font-size:11px; color:#555; margin-top:4px;">
              <strong>Минимум:</strong>
              <ul style="padding-left:16px; margin-top:2px;">
                ${st.minRules.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      `).join('');

  const printHTML = `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <title>${escapeHtml(roster.name || 'Боевой Ростер')}</title>
      <style>
        body { font-family: Arial, sans-serif; color: #000; background: #fff; padding: 24px; line-height: 1.5; }
        h1 { font-size: 26px; text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 20px; }
        h2 { font-size: 18px; margin-top: 10px; border-bottom: 1px solid #000; padding-bottom: 6px; page-break-after: avoid; }
        ul { padding-left: 20px; } li { margin-bottom: 6px; }
        .page-break { page-break-before: always; break-before: page; padding-top: 10px; }
        .map-page-break { page-break-before: always; break-before: page; }
        .cards-page { page-break-before: always; break-before: page; box-sizing: border-box; }
        .cards-grid-page { display: flex; flex-direction: column; gap: 16px; margin-top: 12px; }
        .aos-card { border: 2px solid #000 !important; border-radius: 8px !important; padding: 12px 16px !important; margin: 8px 0 !important; page-break-inside: avoid !important; background: #ffffff !important; }
        .aos-header { display: flex !important; justify-content: space-between !important; font-weight: bold !important; font-size: 15px !important; border-bottom: 1px solid #000 !important; padding-bottom: 6px !important; margin-bottom: 6px !important; }
        .aos-stats-grid { display: table !important; width: 100% !important; table-layout: fixed !important; background: #000 !important; margin: 8px 0 !important; border-collapse: collapse !important; }
        .aos-stat-box { display: table-cell !important; width: 33.333% !important; background: #fff !important; border: 1px solid #000 !important; padding: 6px 4px !important; text-align: center !important; }
        .aos-stat-label { font-size: 10px !important; font-weight: bold !important; text-transform: uppercase !important; color: #000 !important; display: block !important; margin-bottom: 2px !important; }
        .aos-stat-value { font-size: 14px !important; font-weight: bold !important; color: #000 !important; display: block !important; }
        .aos-weapons-section { border-bottom: 1px solid #000 !important; padding-bottom: 6px !important; margin-bottom: 6px !important; }
        .aos-weapon-item { border: 1px solid #999 !important; padding: 6px 10px !important; margin-bottom: 4px !important; border-radius: 4px !important; background: #fff !important; }
        .aos-weapon-header { display: flex !important; justify-content: space-between !important; font-weight: bold !important; margin-bottom: 2px !important; }
        .aos-weapon-stats { display: flex !important; gap: 20px !important; font-size: 12px !important; }
        .aos-ability { margin-top: 6px !important; font-size: 12px !important; }
        img { max-width: 85%; max-height: 70vh; height: auto; display: block; margin: 12px auto; border: 1px solid #333; border-radius: 6px; page-break-inside: avoid; }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(roster.name || 'Боевой Ростер')}</h1>
      <p><strong>Клан армии:</strong> ${escapeHtml(roster.clan || 'Не выбран')}</p>
      <p><strong>Очки армии:</strong> ${totalPts} / ${ARMY_BUDGET} ${totalPts < ARMY_MIN ? '(ниже минимума ' + ARMY_MIN + ')' : ''}</p>
      <p><strong>Командир:</strong> ${commanderInfo ? escapeHtml(commanderInfo.title) : 'не назначен'}</p>

      <h2>Выбранные Ставки (${selectedStakes.length}, ${getStakesCost()} / ${STAKES_BUDGET} МИ):</h2>
      ${stakesHTML}

      <h2 style="margin-top: 24px;">Сводный состав армии (${roster.units.length} моделей):</h2>
      <ul>
        ${Object.keys(counts).map(key => `<li><strong>${escapeHtml(key)}</strong> — ${counts[key]} шт.</li>`).join('')}
      </ul>

      ${cleanClanContent ? `<div class="page-break"></div><h2>Правила и способности клана</h2><div>${cleanClanContent}</div>` : ''}
      ${selectedBattleplan ? `<div class="page-break"></div><h2>Сценарий: ${escapeHtml(selectedBattleplan.title)}</h2><div>${formattedBattleplanHTML}</div>` : ''}
      ${cardsPagesHTML}

      <script>window.onload = function() { window.print(); window.close(); };</script>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(printHTML);
    printWindow.document.close();
  }
}