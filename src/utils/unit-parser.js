/**
 * Универсальный парсер датакарты из HTML-строки.
 * Используется в builder/units.js, battle/state.js, battle/render.js и др.
 */

export function parseUnitCard(cardHtml) {
  const tmp = document.createElement('div');
  tmp.innerHTML = cardHtml;
  return {
    title: tmp.querySelector('.aos-title')?.textContent || 'Отряд',
    role: tmp.querySelector('.aos-badge-role')?.textContent || 'Базовый',
    cost: parseCost(tmp.querySelector('.aos-badge-pts')?.textContent || ''),
    hp: extractHp(tmp),
    html: cardHtml
  };
}

export function parseCost(raw) {
  if (!raw) return 0;
  const m = String(raw).match(/(\d+(?:[.,]\d+)?)/);
  if (!m) return 0;
  return Math.round(parseFloat(m[1].replace(',', '.')));
}

function extractHp(tmp) {
  const aosBoxes = tmp.querySelectorAll('.aos-stat-box');
  for (const box of aosBoxes) {
    const label = (box.querySelector('.aos-stat-label')?.textContent || '').trim().toUpperCase();
    if (label === 'ХП' || label === 'HP' || label === 'WOUNDS') {
      const val = parseInt((box.querySelector('.aos-stat-value')?.textContent || '').replace(/[^\d-]/g, ''));
      if (!isNaN(val)) return val;
    }
  }

  const statBoxes = tmp.querySelectorAll('.stat-box');
  for (const box of statBoxes) {
    const label = (box.querySelector('.stat-label')?.textContent || '').trim().toUpperCase();
    if (label === 'ХП' || label === 'ЗДОРОВЬЕ' || label === 'HP' || label === 'WOUNDS') {
      const val = parseInt((box.querySelector('.stat-value')?.textContent || '').replace(/[^\d-]/g, ''));
      if (!isNaN(val)) return val;
    }
  }

  return 6;
}

/**
 * Извлекает из HTML-строки карточки её статистику, оружие и способности.
 * Используется в модалке справки по юниту в игровом столе.
 *
 * @param {string} html
 * @returns {{ stats: Object, weapons: Array, abilities: Array }}
 */
export function extractUnitDetails(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';

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