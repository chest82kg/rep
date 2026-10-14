// src/battle/stakes-utils.js
//
// Утилиты для работы с клятвами в игровом столе.
// Используются в stakes-tracker.js и finish.js.

/**
 * Возвращает список выбранных клятв из activeRoster.
 * Поддерживает два формата:
 *   - новый: activeRoster.selectedStakesFull (массив полных объектов)
 *   - старый: activeRoster.selectedStakes (массив id)
 */
export function getSelectedStakes() {
  let activeRoster = null;
  try {
    activeRoster = JSON.parse(localStorage.getItem('activeRoster') || 'null');
  } catch { /* ignore */ }
  if (!activeRoster) return [];

  if (Array.isArray(activeRoster.selectedStakesFull) && activeRoster.selectedStakesFull.length > 0) {
    return activeRoster.selectedStakesFull.map(s => ({
      id: s.id,
      name: s.name,
      class: s.class,
      classLabel: s.classLabel || '—',
      cost: s.cost || 0,
      reward: s.reward || 0,
      penalty: s.penalty || 0,
      description: s.description || '',
      minRules: Array.isArray(s.minRules) ? s.minRules : []
    }));
  }

  if (Array.isArray(activeRoster.selectedStakes)) {
    return activeRoster.selectedStakes.map(id => ({
      id,
      name: id,
      class: 'army',
      classLabel: '—',
      cost: 0,
      reward: 0,
      penalty: 0,
      description: 'Клятва из старого формата ростера.',
      minRules: []
    }));
  }

  return [];
}