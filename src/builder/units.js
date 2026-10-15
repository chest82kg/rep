// src/builder/units.js
import { roster } from './state.js';
import { DATABASE } from '../core/data.js';
import { parseCost } from '../utils/unit-parser.js';
import { renderRosterSummary } from './render.js';
import { escapeHtml } from '../utils/escape.js';
import { showToast } from '../ui/toast.js';

/**
 * Возвращает CSS-класс для бейджа роли, основываясь на тексте роли.
 */
function roleClass(role) {
  const r = String(role || '').toLowerCase();
  if (r.includes('герой')) return 'role-hero';
  if (r.includes('элит'))  return 'role-elite';
  if (r.includes('базов')) return 'role-basic';
  return '';
}

/**
 * Рендерит блок роль + стоимость для шапки карточки юнита.
 */
function renderRoleAndCost(role, pts) {
  return `
    <span style="display:inline-flex; gap:6px; align-items:center; flex-wrap:wrap;">
      <span class="aos-badge-role ${roleClass(role)}" style="font-size:0.72rem; padding:3px 8px;">${escapeHtml(role)}</span>
      <span style="font-size:0.8rem; color: var(--gold); font-weight:700;">${escapeHtml(pts)}</span>
    </span>
  `;
}

export function updateAvailableUnits() {
  const container = document.getElementById('builder-units-available');
  if (!container) return;

  if (!roster.clan) {
    container.innerHTML = `<p style="color: var(--text-muted);">Выберите клан в первом пункте выше.</p>`;
    return;
  }

  const clanArticle = DATABASE.find(item => item.title === roster.clan);
  if (!clanArticle) {
    container.innerHTML = `<p style="color: var(--text-muted);">Отряды клана не найдены в базе.</p>`;
    return;
  }

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = clanArticle.content;
  const cards = tempDiv.querySelectorAll('.aos-card');

  if (cards.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted);">В этом клане нет датакарт отрядов.</p>`;
    return;
  }

  let unitsHTML = '<div style="display: grid; gap: 10px;">';
  cards.forEach((card, index) => {
    const title = card.querySelector('.aos-title')?.textContent || 'Отряд';
    const role = card.querySelector('.aos-badge-role')?.textContent || 'Базовый';
    const pts = card.querySelector('.aos-badge-pts')?.textContent || '';

    const weaponItems = card.querySelectorAll('.aos-weapon-item');

    if (weaponItems.length > 1) {
      const w1 = extractWeaponData(weaponItems[0]);
      const w2 = extractWeaponData(weaponItems[1]);

      unitsHTML += `
        <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border); padding: 12px 14px; border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 10px;">
            <strong style="color:#fff; font-size:1.05rem;">${escapeHtml(title)}</strong>
            ${renderRoleAndCost(role, pts)}
          </div>

          <div style="font-size:0.8rem; color: var(--text-muted); margin-bottom: 8px;">Нажмите на вариант оружия, чтобы добавить отряд с ним:</div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <button class="weapon-pick-btn"
                    data-action="add-choice"
                    data-card-idx="${index}"
                    data-weapon="1"
                    style="text-align:left; background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: 6px; padding: 10px 12px; color: var(--text); cursor: pointer; transition: all 0.15s ease;">
              <div style="font-weight:700; color:#fff; margin-bottom:4px;">${escapeHtml(w1.name)}</div>
              <div style="font-size: 0.78rem; color: var(--text-muted); display:flex; flex-direction:column; gap:2px;">
                <span>Тип: <strong style="color:var(--text);">${escapeHtml(w1.type)}</strong></span>
                <span>Порог: <strong style="color:var(--text);">${escapeHtml(w1.hit)}</strong></span>
                <span>Урон: <strong style="color:var(--text);">${escapeHtml(w1.damage)}</strong></span>
                <span>Теги: <strong style="color: var(--gold);">${w1.tags ? escapeHtml(w1.tags) : 'нет'}</strong></span>
              </div>
              <div style="margin-top:8px; font-size:0.8rem; color: var(--accent); font-weight:700;">+ Добавить</div>
            </button>

            <button class="weapon-pick-btn"
                    data-action="add-choice"
                    data-card-idx="${index}"
                    data-weapon="2"
                    style="text-align:left; background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: 6px; padding: 10px 12px; color: var(--text); cursor: pointer; transition: all 0.15s ease;">
              <div style="font-weight:700; color:#fff; margin-bottom:4px;">${escapeHtml(w2.name)}</div>
              <div style="font-size: 0.78rem; color: var(--text-muted); display:flex; flex-direction:column; gap:2px;">
                <span>Тип: <strong style="color:var(--text);">${escapeHtml(w2.type)}</strong></span>
                <span>Порог: <strong style="color:var(--text);">${escapeHtml(w2.hit)}</strong></span>
                <span>Урон: <strong style="color:var(--text);">${escapeHtml(w2.damage)}</strong></span>
                <span>Теги: <strong style="color: var(--gold);">${escapeHtml(w2.tags)}</strong></span>
              </div>
              <div style="margin-top:8px; font-size:0.8rem; color: var(--accent); font-weight:700;">+ Добавить</div>
            </button>
          </div>
        </div>
      `;
    } else {
      const w = extractWeaponData(weaponItems[0]);
      unitsHTML += `
        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02); border: 1px solid var(--border); padding: 10px 14px; border-radius: 8px; gap: 10px; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 200px;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
              <strong style="color:#fff;">${escapeHtml(title)}</strong>
              ${renderRoleAndCost(role, pts)}
            </div>
            ${w ? `
              <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px;">
                ${escapeHtml(w.name)} (${escapeHtml(w.type)}): Порог ${escapeHtml(w.hit)}, Урон ${escapeHtml(w.damage)}${w.tags ? ', ' + escapeHtml(w.tags) : ''}
              </div>
            ` : ''}
          </div>
          <button class="builder-action-btn primary" data-action="add-simple" data-card-idx="${index}" style="padding: 8px 14px; font-size: 0.85rem; white-space: nowrap;">+ В армию</button>
        </div>
      `;
    }
  });
  unitsHTML += '</div>';

  container.innerHTML = unitsHTML;

  window.currentClanCards = Array.from(cards).map(c => ({
    title: c.querySelector('.aos-title')?.textContent || 'Отряд',
    role: c.querySelector('.aos-badge-role')?.textContent || 'Базовый',
    cost: parseCost(c.querySelector('.aos-badge-pts')?.textContent || ''),
    html: c.outerHTML
  }));

  container.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.cardIdx, 10);
      const action = btn.dataset.action;
      if (action === 'add-simple') addUnitToRoster(idx);
      if (action === 'add-choice') addChoiceUnitToRoster(idx, btn.dataset.weapon);
    });
  });
}

/**
 * Извлекает из HTML .aos-weapon-item данные оружия.
 */
function extractWeaponData(weaponItem) {
  if (!weaponItem) return null;

  const name = weaponItem.querySelector('.aos-weapon-name')?.textContent?.trim() || '';
  const type = weaponItem.querySelector('.aos-weapon-type')?.textContent?.trim() || '';

  let hit = '—';
  let damage = '—';
  let tags = '';

  const stats = weaponItem.querySelectorAll('.aos-weapon-stats span');
  stats.forEach(s => {
    const t = s.textContent;
    if (t.includes('Порог')) {
      const m = t.match(/(\d\+)/);
      if (m) hit = m[1];
    }
    if (t.includes('Урон')) {
      const m = t.match(/(\d+)/);
      if (m) damage = m[1];
    }
    if (t.includes('Теги')) {
      const afterColon = t.split(':').slice(1).join(':').trim();
      tags = afterColon === 'нет' ? '' : afterColon;
    }
  });

  return { name, type, hit, damage, tags };
}

function addChoiceUnitToRoster(cardIndex, weaponOption) {
  const cardData = window.currentClanCards[cardIndex];
  if (!cardData) return;

  const tempContainer = document.createElement('div');
  tempContainer.innerHTML = cardData.html;

  const weapons = tempContainer.querySelectorAll('.aos-weapon-item');
  if (weapons.length >= 2) {
    if (weaponOption === "1") {
      weapons[1].remove();
    } else {
      weapons[0].remove();
    }
    const divider = tempContainer.querySelector('div[style*="--accent"]');
    if (divider) divider.remove();
  }

  const sectionTitle = tempContainer.querySelector('.aos-section-title');
  if (sectionTitle) {
    sectionTitle.textContent = 'Вооружение';
  }

  const weaponName = tempContainer.querySelector('.aos-weapon-name')?.textContent || '';
  const uniqueKey = `${cardData.title} (${weaponName})`;

  roster.units.push({
    title: cardData.title,
    uniqueKey: uniqueKey,
    html: tempContainer.innerHTML,
    role: cardData.role,
    cost: cardData.cost
  });
  showToast(`Добавлено: ${uniqueKey}`, 'ok');
  renderRosterSummary();
}

function addUnitToRoster(cardIndex) {
  const cardData = window.currentClanCards[cardIndex];
  if (!cardData) return;
  roster.units.push({
    title: cardData.title,
    uniqueKey: cardData.title,
    html: cardData.html,
    role: cardData.role,
    cost: cardData.cost
  });
  showToast(`Добавлено: ${cardData.title}`, 'ok');
  renderRosterSummary();
}

export function removeUnitFromRoster(index) {
  const removed = roster.units[index];
  roster.units.splice(index, 1);

  // 1. Удаляем артефакты, привязанные к удалённому юниту.
  // 2. Переиндексируем targetIdx у оставшихся.
  roster.artifacts = roster.artifacts
    .filter(a => a.targetIdx !== index)
    .map(a => ({
      ...a,
      targetIdx: a.targetIdx > index ? a.targetIdx - 1 : a.targetIdx
    }));

  // 3. Если артефактов больше, чем Героев — удаляем «лишние» (последние по списку).
  const heroCount = roster.units.filter(u => (u.role || '').toLowerCase().includes('герой')).length;
  if (roster.artifacts.length > heroCount) {
    const excess = roster.artifacts.length - heroCount;
    roster.artifacts = roster.artifacts.slice(0, heroCount);
    if (excess > 0) {
      showToast(`Удалено артефактов сверх лимита: ${excess}`, 'err');
    }
  }

  if (removed) {
    showToast(`Удалено: ${removed.uniqueKey || removed.title}`, 'err');
  }
  renderRosterSummary();
}