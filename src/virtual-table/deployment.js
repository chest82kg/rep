// src/virtual-table/deployment.js
//
// Визуальные зоны расстановки.
// Не ограничивают размещение и перемещение моделей.

import {
  validDeployment
} from '../workshop/deployment.js';

/**
 * Отсутствующее поле допустимо для старых партий.
 * null и некорректные значения не принимаются.
 */
export function validTableDeployment(value) {
  return value === undefined || validDeployment(value);
}

export function renderTableDeployment(zones) {
  const board = document.getElementById('vt-board');

  if (!board) return;

  const byCell = new Map(
    (zones || []).map(cell => [
      `${cell.x}:${cell.y}`,
      cell.side
    ])
  );

  board.querySelectorAll('button[data-x][data-y]').forEach(button => {
    button.querySelector('.vt-deployment-mark')?.remove();

    delete button.dataset.deployment;

    const suffix = / · Зона расстановки [АБ]$/;

    const label = (button.getAttribute('aria-label') || '')
      .replace(suffix, '');

    const title = button.title.replace(suffix, '');

    const side = byCell.get(
      `${button.dataset.x}:${button.dataset.y}`
    );

    if (!side) {
      button.setAttribute('aria-label', label);
      button.title = title;
      return;
    }

    button.dataset.deployment = side;

    const sideName = side === 'a' ? 'А' : 'Б';

    const mark = document.createElement('span');

    mark.className = 'vt-deployment-mark';
    mark.textContent = sideName;
    mark.setAttribute('aria-hidden', 'true');

    button.append(mark);

    const addition = ` · Зона расстановки ${sideName}`;

    button.setAttribute('aria-label', label + addition);
    button.title = title + addition;
  });
}