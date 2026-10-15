// src/battle/render.js
import { gameState, saveGameState, getPlayerName, battleMode, activeRoomRole } from './state.js';
import { pushMyState } from './room-sync.js';
import { DATABASE, getFactionFromClan, getFactionGeneralArticle } from '../core/data.js';
import { escapeHtml } from '../utils/escape.js';
import { openNoteModal } from './notes.js';
import { getUnitCastClass } from './resources.js';
import { openSpellbookModal, openPrayerModal } from './magic.js';

export function renderDashboard() {
  if (!gameState) return;

  document.getElementById('dash-roster-name').textContent = gameState.name;
  document.getElementById('dash-player-info').textContent = `Игрок: ${getPlayerName()}`;
  document.getElementById('dash-roster-clan').textContent = `Клан: ${gameState.clan || '—'}`;

  renderMeta();
  renderResources();
  renderTracker();
  renderUnits();
  renderOpponentUnits();
}

export function renderMeta() {
  const meta = document.getElementById('dash-meta');
  if (!meta) return;

  const alive = gameState.units.filter(u => u.currentHp > 0).length;
  const total = gameState.units.length;
  const totalCost = gameState.units.reduce((sum, u) => sum + (u.cost || 0), 0);
  const totalHp = gameState.units.reduce((sum, u) => sum + u.currentHp, 0);
  const maxHp = gameState.units.reduce((sum, u) => sum + u.maxHp, 0);

  meta.innerHTML = `
    <span><strong>Моделей:</strong> ${alive} / ${total}</span>
    <span><strong>Очков армии:</strong> ${totalCost}</span>
    <span><strong>Суммарное ХП:</strong> ${totalHp} / ${maxHp}</span>
  `;
}

export function renderResources() {
  const el = document.getElementById('resources-panel');
  if (!el) return;
  const mage = gameState.mage || 0;
  const faith = gameState.faith || 0;
  const mageCap = gameState.mageCap || 6;
  const faithCap = gameState.faithCap || 6;

  el.innerHTML = `
    <span><strong style="color:#6c5ce7;">Мана:</strong> ${mage} / ${mageCap}</span>
    <span><strong style="color:#d1b384;">Вера:</strong> ${faith} / ${faithCap}</span>
  `;
}

export function renderTracker() {
  const roundEl = document.getElementById('track-round');
  const vpOwnEl = document.getElementById('track-vp-own');
  const vpOppEl = document.getElementById('track-vp-opp');

  if (roundEl) roundEl.textContent = gameState.round;
  if (vpOwnEl) vpOwnEl.textContent = gameState.vpOwn;
  if (vpOppEl) vpOppEl.textContent = gameState.vpOpp;

  const isRoom = battleMode === 'room';
  const isHost = activeRoomRole === 'host';
  const lockRound = isRoom && !isHost;

  const tracker = document.getElementById('battle-tracker');
  if (tracker) {
    tracker.querySelectorAll('[data-track^="round"]').forEach(btn => {
      btn.disabled = lockRound;
      btn.style.opacity = lockRound ? '0.4' : '';
      btn.style.cursor = lockRound ? 'not-allowed' : '';
    });
  }
}

/**
 * Считает бонусы артефакта к характеристикам.
 * Возвращает: { hp: +N, move: +N, armor: +N, weaponTag: '[Пробой 1]' | null }
 */
function getArtifactBonuses(artifact) {
  const bonuses = { hp: 0, move: 0, armor: 0, weaponTag: null };
  if (!artifact || !artifact.effect) return bonuses;

  switch (artifact.effect) {
    case 'give_armor_1':                 bonuses.armor += 1; break;
    case 'give_move_1':                  bonuses.move += 1;  break;
    case 'give_hp_2_and_last_stand':     bonuses.hp += 2;    break;
    case 'give_tag_melee_rend1':         bonuses.weaponTag = '[Пробой 1]'; break;
  }
  return bonuses;
}

/**
 * Формирует бейдж с бонусом артефакта к стату.
 * Возвращает HTML для вставки в карточку.
 */
function statBonusBadge(value, bonus, suffix = '') {
  if (!bonus) return '';
  return `
    <span style="color: var(--gold); font-weight: 700; margin-left: 4px; font-size: 0.9em;">(${value}${suffix} <span style="color:#2ed573;">+${bonus}</span>)</span>
  `;
}

/**
 * Модифицирует HTML карточки юнита, добавляя бонусы артефакта.
 * Работает на DOM, не изменяет исходник.
 */
function applyArtifactBonusesToCardHtml(html, artifact) {
  if (!artifact) return html;
  const bonuses = getArtifactBonuses(artifact);
  if (!bonuses.armor && !bonuses.move && !bonuses.hp && !bonuses.weaponTag) return html;

  const tmp = document.createElement('div');
  tmp.innerHTML = html;

  // Находим статы в aos-stat-box
  const statBoxes = tmp.querySelectorAll('.aos-stat-box');
  statBoxes.forEach(box => {
    const label = (box.querySelector('.aos-stat-label')?.textContent || '').trim().toUpperCase();
    const valueEl = box.querySelector('.aos-stat-value');
    if (!valueEl) return;

    const baseValue = parseInt(valueEl.textContent.trim().replace(/[^\d-]/g, ''));

    if ((label === 'БРОНЯ' || label === 'ARMOR') && bonuses.armor) {
      valueEl.innerHTML = `${baseValue + bonuses.armor} <span style="color:#2ed573; font-size:0.75em;">(+${bonuses.armor})</span>`;
    }
    if ((label === 'ДВИЖЕНИЕ' || label === 'MOVE') && bonuses.move) {
      valueEl.innerHTML = `${baseValue + bonuses.move} <span style="color:#2ed573; font-size:0.75em;">(+${bonuses.move})</span>`;
    }
    if ((label === 'ХП' || label === 'HP' || label === 'WOUNDS') && bonuses.hp) {
      valueEl.innerHTML = `${baseValue + bonuses.hp} <span style="color:#2ed573; font-size:0.75em;">(+${bonuses.hp})</span>`;
    }
  });

  // Добавляем тег к оружию (Пробой 1)
  if (bonuses.weaponTag) {
    const weapons = tmp.querySelectorAll('.aos-weapon-item');
    weapons.forEach((weaponEl, i) => {
      if (i > 0) return; // только первое оружие
      const statsEl = weaponEl.querySelector('.aos-weapon-stats');
      if (!statsEl) return;
      // Проверяем, нет ли уже этого тега
      if (statsEl.textContent.includes('Пробой 1') || statsEl.textContent.includes('Пробой 2')) return;
      const tagSpan = document.createElement('span');
      tagSpan.innerHTML = `Теги: <span style="color:#2ed573; font-weight:700;">${bonuses.weaponTag}</span>`;
      statsEl.appendChild(tagSpan);
    });
  }

  return tmp.innerHTML;
}

export function renderUnits() {
  const container = document.getElementById('dash-units-container');
  if (!container) return;

  if (gameState.units.length === 0) {
    container.innerHTML = '<p style="color: var(--text-muted);">В армии нет юнитов.</p>';
    return;
  }

  container.innerHTML = gameState.units.map((u, idx) => {
    const isDead = u.currentHp <= 0;
    const isActivated = u.activated === true;
    const cast = getUnitCastClass(idx);

    const statusesHTML = (u.statuses || []).map((st, sIdx) => `
      <span class="status-tag ${st.type}">
        ${escapeHtml(st.name)}: ${st.value}
        <button data-action="mod-status" data-idx="${idx}" data-sidx="${sIdx}" data-delta="1" title="+1">+</button>
        <button data-action="mod-status" data-idx="${idx}" data-sidx="${sIdx}" data-delta="-1" title="−">−</button>
        <button data-action="rm-status" data-idx="${idx}" data-sidx="${sIdx}" title="Удалить">&times;</button>
      </span>
    `).join('');

    // Бейдж артефакта над карточкой — крупный
    const artifactBadge = u.artifact
      ? `<span style="background: rgba(209,179,132,0.20); color: var(--gold); font-size:1rem; padding:6px 14px; border-radius:8px; font-weight:800; margin-left:10px; border: 2px solid var(--gold); box-shadow: 0 0 12px rgba(209,179,132,0.25);" title="${escapeHtml(u.artifact.description || u.artifact.name)}">🎁 ${escapeHtml(u.artifact.name)}</span>`
      : '';

    // Карточка с применёнными бонусами артефакта
    const cardHtmlWithBonuses = applyArtifactBonusesToCardHtml(u.html, u.artifact);

    return `
      <div class="battle-unit-wrapper ${isDead ? 'dead' : ''} ${isActivated ? 'activated' : ''}" data-idx="${idx}">
        <div class="unit-meta-row">
          <span style="display:flex; align-items:center; flex-wrap:wrap; gap:6px;">
            ${isActivated ? '<span style="color:#2ed573; margin-right:6px;">✓</span>' : ''}
            <strong>#${idx + 1}</strong> • ${escapeHtml(u.role || 'Отряд')}${artifactBadge}
          </span>
          <span>${u.cost || 0} очков</span>
        </div>

        <div class="unit-card-clickable" data-action="open-card" data-idx="${idx}" title="Нажмите, чтобы открыть справку">
          ${cardHtmlWithBonuses}
        </div>

        <div class="unit-control-panel">
          <div style="flex: 1; min-width: 250px;">
            <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 4px;">Активные статусы:</div>
            <div class="status-container">
              ${statusesHTML || '<span style="color:var(--text-muted); font-size:0.85rem;">нет активных статусов</span>'}
            </div>
            <div class="status-add-bar">
              <select id="status-type-${idx}" class="status-select" aria-label="Тип статуса">
                <option value="poison">Яд</option>
                <option value="fire">Горение</option>
                <option value="stone">Окаменение</option>
                <option value="custom">Другое</option>
              </select>
              <input type="number" id="status-val-${idx}" value="1" min="1" max="10" style="width: 55px; padding: 4px;" class="status-select" aria-label="Значение статуса">
              <button class="builder-action-btn" style="padding: 4px 10px; font-size: 0.8rem;" data-action="add-status" data-idx="${idx}">+ Статус</button>
            </div>
          </div>

          <div class="hp-box">
            <span>ХП: <strong style="font-size: 1.4rem; color: #fff;">${u.currentHp} / ${u.maxHp}</strong></span>
            <div style="display: flex; gap: 4px; flex-wrap: wrap;">
              <button class="hp-btn big" data-action="hp" data-idx="${idx}" data-delta="5" title="+5 ХП">+5</button>
              <button class="hp-btn" data-action="hp" data-idx="${idx}" data-delta="1" title="+1 ХП">+</button>
              <button class="hp-btn" data-action="hp" data-idx="${idx}" data-delta="-1" title="−1 ХП">−</button>
              <button class="hp-btn big" data-action="hp" data-idx="${idx}" data-delta="-5" title="−5 ХП">−5</button>
            </div>
          </div>
        </div>

        <div class="unit-bottom-bar">
          <button class="activate-btn ${isActivated ? 'active' : ''}" data-action="toggle-activated" data-idx="${idx}">
            ${isActivated ? '✓ Активирован' : '○ Отметить активированным'}
          </button>
          ${cast.isMage ? `<button class="magic-btn spell-btn" data-action="open-spellbook" data-idx="${idx}">✨ Заклинание</button>` : ''}
          ${cast.isPriest ? `<button class="magic-btn prayer-btn" data-action="open-prayerbook" data-idx="${idx}">🙏 Молитва</button>` : ''}
          <button class="notes-btn" data-action="add-note" data-idx="${idx}">
            📝 Заметка
          </button>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const idx = parseInt(btn.dataset.idx, 10);
      if (action === 'hp') changeUnitHp(idx, parseInt(btn.dataset.delta, 10));
      if (action === 'add-status') appendStatus(idx);
      if (action === 'mod-status') modifyStatusValue(idx, parseInt(btn.dataset.sidx, 10), parseInt(btn.dataset.delta, 10));
      if (action === 'rm-status') removeStatus(idx, parseInt(btn.dataset.sidx, 10));
      if (action === 'toggle-activated') toggleActivated(idx);
      if (action === 'add-note') openNoteModal(idx);
      if (action === 'open-card') openUnitCardModal(idx);
      if (action === 'open-spellbook') openSpellbookModal(idx);
      if (action === 'open-prayerbook') openPrayerModal(idx);
    });
  });
}

function changeUnitHp(idx, delta) {
  const u = gameState?.units?.[idx];
  if (!u) return;
  u.currentHp = Math.max(0, Math.min(u.maxHp, u.currentHp + delta));
  saveGameState();
  pushMyState();
  renderUnits();
  renderMeta();
}

function appendStatus(idx) {
  const u = gameState?.units?.[idx];
  if (!u) return;
  if (!Array.isArray(u.statuses)) u.statuses = [];

  const typeSelect = document.getElementById(`status-type-${idx}`);
  const valInput = document.getElementById(`status-val-${idx}`);
  if (!typeSelect || !valInput) return;

  const type = typeSelect.value;
  const name = typeSelect.options[typeSelect.selectedIndex].text;
  const value = Math.max(1, parseInt(valInput.value) || 1);

  u.statuses.push({ type, name, value });
  saveGameState();
  pushMyState();
  renderUnits();
}

function modifyStatusValue(uIdx, sIdx, delta) {
  const st = gameState?.units?.[uIdx]?.statuses?.[sIdx];
  if (!st) return;
  st.value = Math.max(1, st.value + delta);
  saveGameState();
  pushMyState();
  renderUnits();
}

function removeStatus(uIdx, sIdx) {
  const u = gameState?.units?.[uIdx];
  if (!u || !u.statuses) return;
  u.statuses.splice(sIdx, 1);
  saveGameState();
  pushMyState();
  renderUnits();
}

function toggleActivated(idx) {
  const u = gameState?.units?.[idx];
  if (!u) return;
  u.activated = !u.activated;
  saveGameState();
  pushMyState();
  renderUnits();
}

function renderOpponentUnits() {
  const wrapper = document.getElementById('dash-opponent-container');

  if (battleMode !== 'room' || !Array.isArray(gameState.opponentUnits) || gameState.opponentUnits.length === 0) {
    if (wrapper) wrapper.remove();
    return;
  }

  let container = wrapper;
  if (!container) {
    container = document.createElement('div');
    container.id = 'dash-opponent-container';
    const myContainer = document.getElementById('dash-units-container');
    myContainer.parentNode.insertBefore(container, myContainer.nextSibling);
  }

  const oppName = gameState.opponentName || 'Оппонент';
  const oppRosterName = gameState.opponentRosterName || '';
  const oppRosterClan = gameState.opponentRosterClan || '';

  container.innerHTML = `
    <h2 style="margin-top:40px; color:var(--text-muted);">🛡️ Армия оппонента <span style="font-size:0.9rem; font-weight:400;">(${escapeHtml(oppName)})</span></h2>
    <div style="margin-bottom:16px; font-size:0.85rem; color:var(--text-muted);">
      ${oppRosterName ? 'Ростер: ' + escapeHtml(oppRosterName) : ''}
      ${oppRosterClan ? ' • ' + escapeHtml(oppRosterClan) : ''}
      • Только просмотр
    </div>
    ${gameState.opponentUnits.map((u, idx) => {
      const isDead = u.currentHp <= 0;
      const role = escapeHtml(u.role || 'Отряд');
      const statusesHTML = (u.statuses || []).map(st => `
        <span class="status-tag ${st.type}" style="opacity:0.9;">${escapeHtml(st.name)}: ${st.value}</span>
      `).join('');

      const artifactBadge = u.artifact
        ? `<span style="background: rgba(209,179,132,0.20); color: var(--gold); font-size:1rem; padding:6px 14px; border-radius:8px; font-weight:800; margin-left:10px; border: 2px solid var(--gold);">🎁 ${escapeHtml(u.artifact.name || 'Артефакт')}</span>`
        : '';

      const cardHtmlWithBonuses = applyArtifactBonusesToCardHtml(u.html || '', u.artifact);

      return `
        <div class="battle-unit-wrapper ${isDead ? 'dead' : ''}" style="opacity:0.92;">
          <div class="unit-meta-row">
            <span style="display:flex; align-items:center; flex-wrap:wrap; gap:6px;"><strong>#${idx + 1}</strong> • ${role}${artifactBadge}</span>
            <span>${u.cost || 0} очков</span>
          </div>
          ${cardHtmlWithBonuses || `<div style="padding:10px; background:rgba(0,0,0,0.2); border-radius:8px; font-size:0.9rem; color:var(--text-muted);">${escapeHtml(u.title || 'Отряд')}</div>`}
          <div class="unit-control-panel" style="justify-content:space-between;">
            <div style="flex:1; min-width:220px;">
              <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:4px;">Статусы:</div>
              <div class="status-container">
                ${statusesHTML || '<span style="color:var(--text-muted); font-size:0.85rem;">нет статусов</span>'}
              </div>
            </div>
            <div class="hp-box">
              <span>ХП: <strong style="font-size:1.3rem; color:#fff;">${u.currentHp} / ${u.maxHp}</strong></span>
            </div>
          </div>
        </div>
      `;
    }).join('')}
  `;
}

export function openRulesModal(type) {
  const modal = document.getElementById('rules-modal');
  const body = document.getElementById('rules-modal-body');
  if (!modal || !body || !gameState) return;

  if (type === 'faction') {
    const factionRule = getFactionGeneralArticle(gameState.clan);
    const factionName = getFactionFromClan(gameState.clan) || 'Фракция';
    body.innerHTML = `
      <h2 style="color:var(--gold); border-bottom:2px solid var(--border); padding-bottom:8px;">🛡️ ${escapeHtml(factionName)}: общие правила</h2>
      <div style="margin-top: 16px;">${factionRule ? factionRule.content : 'Правила фракции не найдены.'}</div>
    `;
  } else if (type === 'clan') {
    const clanArticle = DATABASE.find(item => item.title === gameState.clan);
    let cleanClanContent = '';
    if (clanArticle) {
      cleanClanContent = clanArticle.content
        .replace(/<div class="aos-card">[\s\S]*?<\/div>\s*<\/div>/g, '')
        .split(/Состав клана/i)[0];
    }
    body.innerHTML = `
      <h2 style="color:var(--gold); border-bottom:2px solid var(--border); padding-bottom:8px;">📜 Правила клана: ${escapeHtml(gameState.clan)}</h2>
      <div style="margin-top: 16px;">${cleanClanContent || 'Правила клана не найдены.'}</div>
    `;
  }
  modal.classList.remove('hidden');
}

export function closeRulesModal() {
  document.getElementById('rules-modal')?.classList.add('hidden');
}

export function openUnitCardModal(idx) {
  const u = gameState?.units?.[idx];
  if (!u) return;

  const modal = document.getElementById('unit-card-modal');
  const body = document.getElementById('unit-card-modal-body');
  if (!modal || !body) return;

  const details = extractUnitDetails(u.html || '');
  const clanTitle = gameState.clan;

  const artifactBlock = u.artifact ? `
    <h3 style="color:var(--gold); font-size:1.2rem; margin-bottom:10px; margin-top:20px;">🎁 Артефакт</h3>
    <div style="background:rgba(209,179,132,0.10); border:2px solid var(--gold); border-radius:10px; padding:16px 18px; margin-bottom:16px;">
      <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:10px;">
        <strong style="color:#fff; font-size:1.15rem;">${escapeHtml(u.artifact.name)}</strong>
        <span style="color:var(--gold); font-weight:700; font-size:1rem;">${u.artifact.cost || 0} очков</span>
      </div>
      ${u.artifact.description
        ? `<div style="font-size:1rem; color:var(--text); line-height:1.55;">${escapeHtml(u.artifact.description)}</div>`
        : '<div style="font-size:0.9rem; color:#ffa502; font-style:italic;">⚠️ Описание артефакта отсутствует. Откройте билдер и обновите ростер — данные подтянутся из справочника.</div>'
      }
    </div>
  ` : '';

  body.innerHTML = `
    <h2 style="color:var(--gold); margin-bottom:4px;">${escapeHtml(u.uniqueKey || u.title)}</h2>
    <p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:16px;">
      ${escapeHtml(u.role || '')} • ${u.cost || 0} очков
    </p>

    ${Object.keys(details.stats).length > 0 ? `
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap:8px; margin-bottom:16px;">
        ${Object.entries(details.stats).map(([label, value]) => `
          <div style="background:rgba(0,0,0,0.3); border:1px solid var(--border); border-radius:8px; padding:10px; text-align:center;">
            <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:4px;">${escapeHtml(label)}</div>
            <div style="font-size:1.2rem; font-weight:800; color:var(--gold);">${escapeHtml(value)}</div>
          </div>
        `).join('')}
      </div>
    ` : ''}

    ${artifactBlock}

    ${details.weapons.length > 0 ? `
      <h3 style="color:var(--accent); font-size:1rem; margin-bottom:8px;">Вооружение</h3>
      <div style="margin-bottom:16px;">
        ${details.weapons.map(w => `
          <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border); border-radius:6px; padding:10px 12px; margin-bottom:6px;">
            <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-bottom:4px;">
              <strong style="color:#fff;">${escapeHtml(w.name)}</strong>
              <span style="font-size:0.8rem; color:var(--accent); font-style:italic;">${escapeHtml(w.type)}</span>
            </div>
            <div style="font-size:0.85rem; color:var(--text-muted); display:flex; gap:12px; flex-wrap:wrap;">
              ${w.stats.map(s => `<span>${escapeHtml(s)}</span>`).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    ` : ''}

    ${details.abilities.length > 0 ? `
      <h3 style="color:var(--accent); font-size:1rem; margin-bottom:8px;">Особые свойства</h3>
      <div style="margin-bottom:16px;">
        ${details.abilities.map(a => `
          <div style="background:rgba(162,155,254,0.06); border-left:3px solid #a29bfe; padding:10px 12px; border-radius:0 6px 6px 0; margin-bottom:8px;">
            <div style="color:#a29bfe; font-weight:700; margin-bottom:4px;">${escapeHtml(a.title)}</div>
            <div style="font-size:0.9rem;">${escapeHtml(a.text)}</div>
          </div>
        `).join('')}
      </div>
    ` : ''}

    <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:20px;">
      <button class="builder-action-btn" id="open-clan-article" style="flex:1; min-width:150px;">
        📖 Открыть статью клана
      </button>
    </div>
  `;

  const clanBtn = body.querySelector('#open-clan-article');
  if (clanBtn) {
    clanBtn.addEventListener('click', () => {
      const clanArticle = DATABASE.find(item => item.title === clanTitle);
      if (clanArticle) {
        window.open(`index.html#${clanArticle.id}`, '_blank');
      } else {
        alert('Статья клана не найдена в базе.');
      }
    });
  }

  modal.classList.remove('hidden');
}

function extractUnitDetails(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;

  const stats = {};
  tmp.querySelectorAll('.aos-stat-box').forEach(box => {
    const label = box.querySelector('.aos-stat-label')?.textContent?.trim();
    const value = box.querySelector('.aos-stat-value')?.textContent?.trim();
    if (label && value) stats[label] = value;
  });

  const weapons = Array.from(tmp.querySelectorAll('.aos-weapon-item')).map(w => ({
    name: w.querySelector('.aos-weapon-name')?.textContent?.trim() || '',
    type: w.querySelector('.aos-weapon-type')?.textContent?.trim() || '',
    stats: Array.from(w.querySelectorAll('.aos-weapon-stats span')).map(s => s.textContent.trim())
  }));

  const abilities = Array.from(tmp.querySelectorAll('.aos-ability')).map(a => ({
    title: a.querySelector('.aos-ability-title')?.textContent?.trim() || '',
    text: a.querySelector('.aos-ability-text')?.textContent?.trim() || ''
  }));

  return { stats, weapons, abilities };
}

export function closeUnitCardModal() {
  document.getElementById('unit-card-modal')?.classList.add('hidden');
}