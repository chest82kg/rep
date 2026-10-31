// src/virtual-table/party-bar.js
//
// Компактная строка раунда, счёта и истории.
//
// Переносит существующие панели и кнопки.
// Сохраняет делегированные обработчики rounds.js/history.js.
//
// Счёт берётся из отображаемой панели миссии.
// Новый редактор счёта и новые записи в хранилище не создаются.
//
// Запускать после initWorkspaceMode().

let initialized = false;

export function initPartyBar() {
  if (initialized) return;

  const field = document.querySelector('.vt-field-panel');
  const boardScroll = field?.querySelector('.vt-board-scroll');

  const rounds = field?.querySelector(
    '[aria-label="Раунд и активации"]'
  );

  const history = field?.querySelector(
    '[aria-label="Отмена и повтор изменений"]'
  );

  const roundLabel = rounds?.querySelector('#vt-round-label');
  const next = rounds?.querySelector('[data-round-action="next"]');
  const previous = rounds?.querySelector(
    '[data-round-action="previous"]'
  );
  const reset = rounds?.querySelector('[data-round-action="reset"]');
  const roundSummary = rounds?.querySelector('#vt-round-summary');

  const undo = history?.querySelector('[data-history-action="undo"]');
  const redo = history?.querySelector('[data-history-action="redo"]');
  const historySummary = history?.querySelector(
    '[data-history-summary]'
  );

  const scores = document.getElementById('vt-objective-scores');

  if (
    !field ||
    !boardScroll ||
    !rounds ||
    !history ||
    !roundLabel ||
    !next ||
    !previous ||
    !reset ||
    !roundSummary ||
    !undo ||
    !redo ||
    !historySummary ||
    !scores
  ) {
    console.error(
      'Панель партии: сначала должны быть подключены ' +
      'раунды, история и миссия.'
    );

    return;
  }

  initialized = true;
  document.body.classList.add('vt-party-bar-enabled');

  /* ======================================================================
     Общая строка

     Панели остаются отдельными DOM-контейнерами:
     обработчики кликов продолжают работать.
     ====================================================================== */

  const bar = document.createElement('div');

  bar.className = 'vt-party-bar';
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', 'Управление партией');

  boardScroll.before(bar);

  rounds.classList.add('vt-party-rounds');
  history.classList.add('vt-party-history');

  bar.append(rounds, history);

  /* ======================================================================
     Дополнительные действия раунда

     Всё остаётся внутри rounds: renderRounds()
     продолжает находить кнопки и сводку.
     ====================================================================== */

  const extras = document.createElement('details');
  extras.className = 'vt-round-extras';

  const extrasSummary = document.createElement('summary');
  extrasSummary.textContent = 'Действия';

  const extrasContent = document.createElement('div');
  extrasContent.className = 'vt-round-extras-content';

  previous.textContent = 'Исправить раунд: −1';

  extrasContent.append(previous, reset, roundSummary);
  extras.append(extrasSummary, extrasContent);
  rounds.append(extras);

  /* ======================================================================
     История

     Доступные имена остаются полными.
     title продолжает обновляться самим history.js.
     ====================================================================== */

  undo.textContent = '↶';
  undo.setAttribute('aria-label', 'Отменить последнее изменение');

  redo.textContent = '↷';
  redo.setAttribute('aria-label', 'Повторить отменённое изменение');

  historySummary.classList.add('vt-party-visually-hidden');

  /* ======================================================================
     Сводка счёта

     Это отражение существующей панели миссии,
     а не самостоятельное состояние.
     ====================================================================== */

  const scoreButton = document.createElement('button');

  scoreButton.type = 'button';
  scoreButton.className = 'builder-action-btn vt-party-score';
  scoreButton.title =
    'Открыть миссию: контрольные точки и изменение счёта';

  rounds.insertBefore(scoreButton, extras);

  const missionStatus = document.getElementById(
    'vt-objective-message'
  );

  function readDisplayedScore(side) {
    const element = scores.querySelector(
      `[data-mission-score-side="${side}"]`
    );

    const raw = element?.dataset.missionScoreValue;

    if (typeof raw !== 'string' || !/^\d+$/.test(raw)) {
      return null;
    }

    const value = Number(raw);

    return Number.isSafeInteger(value) ? value : null;
  }

  function updateScore() {
    const a = readDisplayedScore('a');
    const b = readDisplayedScore('b');

    if (a === null || b === null) {
      scoreButton.textContent = 'Счёт: —';
      scoreButton.setAttribute(
        'aria-label',
        'Счёт недоступен. Открыть панель миссии'
      );
    } else {
      scoreButton.textContent = `А ${a} : ${b} Б`;
      scoreButton.setAttribute(
        'aria-label',
        `Отображаемый счёт: Игрок А — ${a}, ` +
        `Игрок Б — ${b}. Открыть панель миссии`
      );
    }

    // Не выдаём сводку за гарантированно актуальные данные,
    // если модуль миссии показывает сообщение об ошибке.
    const hasWarning = Boolean(
      missionStatus?.textContent.trim()
    );

    scoreButton.title =
      'Открыть миссию: контрольные точки и изменение счёта.' +
      (hasWarning
        ? ' В панели миссии также есть сообщение о состоянии данных.'
        : '');
  }

  scoreButton.addEventListener('click', () => {
    const missionTab = document.getElementById('vt-tab-mission');

    if (!missionTab) return;

    missionTab.click();

    // Используем существующую мобильную навигацию,
    // не управляя её внутренним состоянием напрямую.
    if (window.matchMedia('(max-width: 1000px)').matches) {
      document.querySelector('[data-mobile-area="details"]')
        ?.click();
    }

    missionTab.focus({ preventScroll: true });
  });

  new MutationObserver(updateScore).observe(scores, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: [
      'data-mission-score-value',
      'data-mission-score-side'
    ]
  });

  if (missionStatus) {
    new MutationObserver(updateScore).observe(missionStatus, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  updateScore();

  /* ======================================================================
     Закрытие дополнительных действий
     ====================================================================== */

  document.addEventListener('click', event => {
    if (extras.open && !extras.contains(event.target)) {
      extras.open = false;
    }
  });

  extras.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;

    event.preventDefault();
    event.stopPropagation();

    extras.open = false;
    extrasSummary.focus({ preventScroll: true });
  });

  // Модули раскладки пересчитают свободную высоту.
  requestAnimationFrame(() => {
    window.dispatchEvent(new Event('resize'));
  });
}