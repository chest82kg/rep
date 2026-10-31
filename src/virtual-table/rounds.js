// src/virtual-table/rounds.js
//
// Ручной счётчик раунда.
// Не рассчитывает инициативу, игровые эффекты и условия победы.
// Усталость и другие данные моделей автоматически не изменяет.

let getState;
let commit;
let notify;
let panel;

export function validRoundState(state) {
  // Совместимость с предыдущими сохранениями.
  return state.round === undefined ||
    (
      Number.isSafeInteger(state.round) &&
      state.round >= 1
    );
}

export function initRounds(options) {
  getState = options.getState;
  commit = options.commit;
  notify = options.message;

  const fieldPanel = document.querySelector('.vt-field-panel');

  panel = document.createElement('section');
  panel.className = 'vt-field-toolbar';
  panel.setAttribute('aria-label', 'Раунд и активации');

  panel.innerHTML = `
    <span id="vt-round-label">Раунд: —</span>

    <button type="button"
      class="builder-action-btn"
      data-round-action="previous">
      −1 раунд
    </button>

    <button type="button"
      class="builder-action-btn primary"
      data-round-action="next">
      Следующий раунд
    </button>

    <button type="button"
      class="builder-action-btn"
      data-round-action="reset">
      Снять активации
    </button>

    <p id="vt-round-summary"
      class="vt-muted"
      style="flex-basis: 100%; margin: 0;">
      Загрузите армию на стол.
    </p>
  `;

  const boardScroll = fieldPanel.querySelector('.vt-board-scroll');
  boardScroll.before(panel);

  panel.addEventListener('click', handleRoundAction);

  renderRounds();
}

function handleRoundAction(event) {
  const button = event.target.closest('[data-round-action]');

  if (!button || button.disabled) return;

  const state = getState();

  if (!state) {
    notify('Сначала загрузите хотя бы одну армию.', true);
    return;
  }

  const action = button.dataset.roundAction;
  const round = state.round ?? 1;

  if (action === 'next') {
    if (round >= Number.MAX_SAFE_INTEGER) {
      notify('Достигнут предел счётчика раундов.', true);
      return;
    }

    if (
      !confirm(
        `Перейти к раунду ${round + 1} и снять отметки активации ` +
        'у обеих армий?\n\n' +
        'ХП, усталость, заметки, фронт, позиции и ландшафт сохранятся. ' +
        'Остальные эффекты начала и конца раунда применяются вручную.'
      )
    ) {
      return;
    }

    commit(next => {
      next.round = round + 1;

      next.units.forEach(unit => {
        unit.activated = false;
      });
    }, `Начат раунд ${round + 1}. Активации сняты, остальные данные сохранены.`);

    return;
  }

  if (action === 'previous') {
    if (round <= 1) return;

    if (
      !confirm(
        `Исправить номер раунда: ${round} → ${round - 1}?\n\n` +
        'Это изменит только счётчик. ' +
        'Предыдущие действия и активации не восстанавливаются.'
      )
    ) {
      return;
    }

    commit(next => {
      next.round = round - 1;
    }, `Номер раунда исправлен: ${round - 1}. Остальные данные не изменены.`);

    return;
  }

  if (action === 'reset') {
    const activated = state.units.filter(unit => unit.activated).length;

    if (!activated) {
      notify('У обеих армий уже сняты отметки активации.');
      return;
    }

    if (
      !confirm(
        `Снять отметки активации у обеих армий? Отметок: ${activated}.\n\n` +
        'Номер раунда, ХП, усталость и остальные данные не изменятся.'
      )
    ) {
      return;
    }

    commit(next => {
      next.units.forEach(unit => {
        unit.activated = false;
      });
    }, 'Отметки активации обеих армий сняты. Номер раунда не изменён.');
  }
}

export function renderRounds() {
  if (!panel || !getState) return;

  const state = getState();
  const round = state?.round ?? 1;

  panel.querySelector('#vt-round-label').textContent = state
    ? `Раунд: ${round}`
    : 'Раунд: —';

  const previous = panel.querySelector(
    '[data-round-action="previous"]'
  );

  const next = panel.querySelector(
    '[data-round-action="next"]'
  );

  const reset = panel.querySelector(
    '[data-round-action="reset"]'
  );

  previous.disabled = !state || round <= 1;
  next.disabled = !state || round >= Number.MAX_SAFE_INTEGER;

  reset.disabled = !state ||
    !state.units.some(unit => unit.activated);

  const summary = panel.querySelector('#vt-round-summary');

  if (!state) {
    summary.textContent = 'Загрузите армию на стол.';
    return;
  }

  const sides = [
    { id: 'a', label: 'А' },
    { id: 'b', label: 'Б' }
  ];

  summary.textContent = sides.map(side => {
    // Счётчик учитывает только живые модели, находящиеся на поле.
    const units = state.units.filter(unit => {
      const unitSide = unit.side === 'b' ? 'b' : 'a';

      return unitSide === side.id &&
        unit.position !== null &&
        unit.currentHp > 0;
    });

    const activated = units.filter(unit => unit.activated).length;
    const ready = units.length - activated;
    const fatigued = units.filter(unit => unit.fatigued).length;

    return `${side.label}: готовы ${ready}, ` +
      `активированы ${activated}, усталость ${fatigued}`;
  }).join(' · ');

  summary.textContent += ' — только живые модели на поле.';
}