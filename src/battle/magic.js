// src/battle/magic.js
//
// Модалки заклинаний (Маг) и молитв (Жрец).

import { gameState } from './state.js';
import { spendMana, spendFaith } from './resources.js';
import { SPELLS } from '../content/spells.js';
import { PRAYERS } from '../content/prayers.js';
import { escapeHtml } from '../utils/escape.js';
import { renderResources } from './render.js';

export function openSpellbookModal(idx) {
  openMagicModal({
    idx,
    items: SPELLS,
    resourceKey: 'mage',
    resourceName: 'Мана',
    resourceColor: '#6c5ce7',
    icon: '✨',
    title: 'Книга заклинаний',
    spellWord: 'Применить',
    spendFn: spendMana,
    costField: 'mana'
  });
}

export function openPrayerModal(idx) {
  openMagicModal({
    idx,
    items: PRAYERS,
    resourceKey: 'faith',
    resourceName: 'Вера',
    resourceColor: '#d1b384',
    icon: '🙏',
    title: 'Молитвенник',
    spellWord: 'Произнести',
    spendFn: spendFaith,
    costField: 'faith'
  });
}

/**
 * Универсальная модалка для заклинаний и молитв.
 */
function openMagicModal({ idx, items, resourceKey, resourceName, resourceColor, icon, title, spellWord, spendFn, costField }) {
  const u = gameState?.units?.[idx];
  if (!u) return;

  const modal = document.getElementById('magic-modal');
  const body = document.getElementById('magic-modal-body');
  if (!modal || !body) return;

  const resource = gameState[resourceKey] || 0;

  body.innerHTML = `
    <h2 style="color:${resourceColor}; margin-bottom:4px;">${icon} ${escapeHtml(title)}</h2>
    <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:16px;">
      ${escapeHtml(u.uniqueKey || u.title)} • ${escapeHtml(resourceName)}: <strong style="color:${resourceColor};">${resource}</strong>
    </p>

    <div style="display:flex; flex-direction:column; gap:8px;">
      ${items.map(item => {
        const cost = item[costField];
        const canCast = resource >= cost;
        const costLabel = costField === 'mana' ? 'Мана' : 'Вера';

        return `
          <div style="background:rgba(${costField === 'mana' ? '108,92,231' : '209,179,132'},0.06); border:1px solid ${canCast ? resourceColor : 'var(--border)'}; border-radius:8px; padding:12px 14px; opacity:${canCast ? 1 : 0.5};">
            <div style="display:flex; justify-content:space-between; gap:10px; margin-bottom:6px; flex-wrap:wrap;">
              <strong style="color:#fff;">${escapeHtml(item.name)}</strong>
              <span style="color:${resourceColor}; font-weight:700;">${cost} ${costLabel}</span>
            </div>
            <div style="font-size:0.85rem; color:var(--text); margin-bottom:6px;">${escapeHtml(item.description)}</div>
            <div style="display:flex; gap:12px; font-size:0.78rem; color:var(--text-muted); margin-bottom:8px; flex-wrap:wrap;">
              ${item.threshold !== undefined ? `<span>Порог: <strong>${item.threshold}+</strong></span>` : ''}
              ${item.aura
                ? `<span>Аура радиус ${item.range}</span>`
                : `<span>Дальность: <strong>${item.range}</strong></span>`}
            </div>
            <button class="builder-action-btn primary cast-btn"
                    data-item-id="${item.id}"
                    data-unit-idx="${idx}"
                    ${canCast ? '' : 'disabled'}
                    style="padding:6px 12px; font-size:0.85rem; ${canCast ? '' : 'opacity:0.5; cursor:not-allowed;'}">
              ${canCast ? `${spellWord} (списать ${cost} ${costLabel.toLowerCase() === 'мана' ? 'Маны' : 'Веры'})` : `Не хватает ${costLabel.toLowerCase() === 'мана' ? 'Маны' : 'Веры'}`}
            </button>
          </div>
        `;
      }).join('')}
    </div>

    <p style="color:var(--text-muted); font-size:0.78rem; margin-top:16px;">
      ${costField === 'mana'
        ? 'После списания ресурса примените эффект вручную на поле: урон, лечение, отбрасывание.'
        : 'Молитвы не требуют проверки по кубикам — просто применяйте эффект на поле.'}
    </p>
  `;

  body.querySelectorAll('button.cast-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      const itemId = btn.dataset.itemId;
      const item = items.find(i => i.id === itemId);
      if (!item) return;

      const ok = spendFn(item[costField]);
      if (!ok) return;

      renderResources();
      modal.classList.add('hidden');
    });
  });

  modal.classList.remove('hidden');
}

export function closeMagicModal() {
  document.getElementById('magic-modal')?.classList.add('hidden');
}