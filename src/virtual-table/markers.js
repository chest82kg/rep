// src/virtual-table/markers.js
//
// Ручной маркер усталости и заметка экземпляра модели.
// Игровые эффекты автоматически не применяются.

const MAX_NOTE_LENGTH = 2000;

let getSelectedUnit;
let commit;
let notify;

export function validModelMarkers(unit) {
  const validFatigue =
    unit.fatigued === undefined ||
    typeof unit.fatigued === 'boolean';

  const validNote =
    unit.note === undefined ||
    (
      typeof unit.note === 'string' &&
      unit.note.length <= MAX_NOTE_LENGTH
    );

  return validFatigue && validNote;
}

export function modelMarkerLabel(unit) {
  return unit.fatigued ? 'Усталость' : '';
}

export function modelMarkerHTML(unit) {
  return unit.fatigued
    ? `
      <span class="vt-fatigue-mark" aria-hidden="true">
        У
      </span>
    `
    : '';
}

/* ==========================================================================
   Инициализация
   ========================================================================== */

export function initModelMarkers(options) {
  getSelectedUnit = options.getSelectedUnit;
  commit = options.commit;
  notify = options.message;

  // Сам контейнер остаётся, хотя его содержимое перерисовывается.
  document.getElementById('vt-details')
    .addEventListener('click', handleMarkerAction);
}

/* ==========================================================================
   Действия
   ========================================================================== */

function handleMarkerAction(event) {
  const button = event.target.closest('[data-marker-action]');

  if (!button || button.disabled) return;

  const unit = getSelectedUnit();
  if (!unit) return;

  const action = button.dataset.markerAction;
  const id = unit.id;

  if (action === 'fatigue') {
    commit(next => {
      const target = next.units.find(item => item.id === id);

      if (!target) {
        throw new Error('Модель не найдена.');
      }

      target.fatigued = !target.fatigued;
    }, unit.fatigued
      ? 'Маркер «Усталость» снят вручную.'
      : 'Маркер «Усталость» установлен. Игровые эффекты применяются вручную.'
    );

    return;
  }

  if (action === 'save-note') {
    const textarea = document.getElementById('vt-model-note');

    if (!textarea || textarea.dataset.unit !== id) {
      notify(
        'Выберите модель заново перед сохранением заметки.',
        true
      );
      return;
    }

    const note = textarea.value;

    if (note.length > MAX_NOTE_LENGTH) {
      notify(
        `Заметка не должна превышать ${MAX_NOTE_LENGTH} символов.`,
        true
      );
      return;
    }

    commit(next => {
      const target = next.units.find(item => item.id === id);

      if (!target) {
        throw new Error('Модель не найдена.');
      }

      target.note = note;
    }, 'Заметка модели сохранена.');

    return;
  }

  if (action === 'clear-note') {
    const textarea = document.getElementById('vt-model-note');

    const hasText = Boolean(
      unit.note ||
      (
        textarea?.dataset.unit === id &&
        textarea.value
      )
    );

    if (!hasText) return;

    if (!confirm('Очистить заметку этой модели?')) return;

    commit(next => {
      const target = next.units.find(item => item.id === id);

      if (!target) {
        throw new Error('Модель не найдена.');
      }

      target.note = '';
    }, 'Заметка модели очищена.');
  }
}

/* ==========================================================================
   Панель
   ========================================================================== */

export function renderModelMarkers() {
  document.getElementById('vt-model-markers')?.remove();

  const unit = getSelectedUnit?.();
  if (!unit) return;

  const section = document.createElement('section');

  section.id = 'vt-model-markers';
  section.className = 'vt-detail-block vt-markers-panel';

  section.innerHTML = `
    <h3>Маркеры и заметка</h3>

    <button type="button"
      class="builder-action-btn ${unit.fatigued ? 'primary' : ''}"
      data-marker-action="fatigue"
      aria-pressed="${Boolean(unit.fatigued)}">
      ${unit.fatigued
        ? 'Усталость: установлена — снять'
        : 'Установить «Усталость»'}
    </button>

    <p class="vt-muted">
      Маркер не меняет характеристики и порядок активации автоматически.
      Снимается вручную.
    </p>

    <label class="vt-note-label" for="vt-model-note">
      Заметка этой модели
    </label>

    <textarea id="vt-model-note"
      rows="4"
      maxlength="${MAX_NOTE_LENGTH}"
      placeholder="Временный эффект, использованная способность или другая отметка"></textarea>

    <div class="vt-detail-actions">
      <button type="button"
        class="builder-action-btn"
        data-marker-action="save-note">
        Сохранить заметку
      </button>

      <button type="button"
        class="builder-action-btn"
        data-marker-action="clear-note">
        Очистить заметку
      </button>
    </div>

    <p class="vt-muted">
      До ${MAX_NOTE_LENGTH} символов.
      Перед выбором другой модели или действием на столе
      нажмите «Сохранить заметку».
    </p>
  `;

  const textarea = section.querySelector('textarea');

  // Пользовательский текст назначается как значение поля,
  // а не вставляется через innerHTML.
  textarea.value = unit.note || '';
  textarea.dataset.unit = unit.id;

  const details = document.getElementById('vt-details');
  const stats = details.querySelector('.vt-stats');

  if (stats) {
    stats.before(section);
  } else {
    details.append(section);
  }
}