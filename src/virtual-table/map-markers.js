// src/virtual-table/map-markers.js
//
// Визуальные маркеры-памятки карты.
// Не связаны с отметками моделей, КТ или счётом.
// Не перехватывают нажатия на клетки.

import {
  validMapMarkers
} from '../workshop/markers.js';

const LETTERS = 'ABCDEFGHIJKLMN';

let panel = null;
let select = null;
let note = null;
let currentMarkers = [];

export function validTableMapMarkers(value) {
  // Совместимость с партиями, созданными до этого слоя.
  return value === undefined || validMapMarkers(value);
}

export function initTableMapMarkers() {
  if (panel) return;

  const host = document.querySelector('.vt-details-panel');

  if (!host) {
    throw new Error('Не найдена панель для маркеров карты.');
  }

  panel = document.createElement('details');
  panel.id = 'vt-map-markers';
  panel.className = 'vt-detail-block';

  // Только статическая разметка приложения.
  panel.innerHTML = `
    <summary>Маркеры-памятки карты</summary>

    <p class="vt-muted">
      Ручные заметки. Не создают игровых эффектов
      и не ограничивают перемещение моделей.
    </p>

    <label class="vt-note-label">
      Маркер
      <select data-map-marker-select></select>
    </label>

    <p class="vt-map-marker-note"
       data-map-marker-note></p>
  `;

  // Не добавляем внутрь #vt-details:
  // содержимое карточки модели пересоздаётся при отрисовке.
  host.append(panel);

  select = panel.querySelector('[data-map-marker-select]');
  note = panel.querySelector('[data-map-marker-note]');

  select.addEventListener('change', renderSelectedNote);
}

function renderSelectedNote() {
  if (!select || !note) return;

  const marker = currentMarkers.find(
    item => item.id === select.value
  );

  note.textContent = marker
    ? marker.note || 'У этого маркера нет текста заметки.'
    : 'На столе нет маркеров карты.';
}

export function renderTableMapMarkers(markers) {
  currentMarkers = markers || [];

  const board = document.getElementById('vt-board');

  if (board) {
    board.querySelectorAll('[data-vt-map-marker]')
      .forEach(element => element.remove());

    currentMarkers.forEach((marker, index) => {
      const cell = board.querySelector(
        `button[data-x="${marker.x}"][data-y="${marker.y}"]`
      );

      if (!cell) return;

      const mark = document.createElement('span');

      mark.className = 'vt-map-marker-mark';
      mark.dataset.vtMapMarker = marker.id;
      mark.textContent = `М${index + 1}`;
      mark.setAttribute('aria-hidden', 'true');

      cell.append(mark);
    });
  }

  if (!panel || !select) return;

  const previousId = select.value;
  const previousIndex = select.selectedIndex;

  select.replaceChildren();

  if (!currentMarkers.length) {
    const option = document.createElement('option');

    option.value = '';
    option.textContent = 'Нет маркеров';

    select.append(option);
    select.disabled = true;
  } else {
    currentMarkers.forEach((marker, index) => {
      const option = document.createElement('option');

      option.value = marker.id;
      option.textContent =
        `М${index + 1}: ${marker.title} · ` +
        `${LETTERS[marker.x]}${marker.y + 1}`;

      select.append(option);
    });

    select.disabled = false;

    if (currentMarkers.some(marker => marker.id === previousId)) {
      select.value = previousId;
    } else {
      select.selectedIndex = Math.max(
        0,
        Math.min(previousIndex, currentMarkers.length - 1)
      );
    }
  }

  renderSelectedNote();
}