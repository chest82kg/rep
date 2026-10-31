// src/virtual-table/workspace-mode.js
//
// Режимы интерфейса «Игра / Подготовка».
//
// Не изменяет сохранения и игровые данные.
// Не пересоздаёт существующие формы и панели.
//
// Запускается после initTableInterface().

import {
  getTerrainMode,
  setTerrainMode
} from './terrain.js';

import {
  isRulerEnabled,
  setRulerEnabled
} from './ruler.js';

let initialized = false;

export function initWorkspaceMode() {
  if (initialized) return;

  const layout = document.querySelector('.vt-layout');
  const field = document.querySelector('.vt-field-panel');

  const terrainTab = document.getElementById('vt-tab-terrain');
  const terrainPane = document.getElementById('vt-pane-terrain');
  const modelTab = document.getElementById('vt-tab-model');

  const partyPane = document.getElementById('vt-pane-party');

  if (
    !layout ||
    !field ||
    !terrainTab ||
    !terrainPane ||
    !modelTab ||
    !partyPane
  ) {
    console.error(
      'Режимы интерфейса: сначала должна быть построена раскладка.'
    );

    return;
  }

  initialized = true;

  let current = null;
  let changing = false;
  let resizeFrame = null;

  document.body.classList.add('vt-workspace-modes');

  /* ======================================================================
     Общий переключатель

     Находится вне переключаемых мобильных областей,
     поэтому доступен и при открытой армии, и при открытой панели.
     ====================================================================== */

  const navigation = document.createElement('nav');

  navigation.className = 'vt-workspace-mode';
  navigation.setAttribute('aria-label', 'Режим интерфейса стола');

  const buttons = new Map();

  for (const [key, title] of [
    ['game', 'Игра'],
    ['prepare', 'Подготовка']
  ]) {
    const button = document.createElement('button');

    button.type = 'button';
    button.className = 'builder-action-btn';
    button.textContent = title;
    button.dataset.workspaceMode = key;

    button.addEventListener('click', () => {
      applyMode(key);
    });

    navigation.append(button);
    buttons.set(key, button);
  }

  const description = document.createElement('span');

  description.className = 'vt-workspace-mode-description';
  description.setAttribute('role', 'status');
  description.setAttribute('aria-live', 'polite');
  description.setAttribute('aria-atomic', 'true');

  navigation.append(description);

  // Ставим перед мобильной навигацией, если она уже создана.
  const mobileNavigation = document.querySelector(
    '.vt-mobile-navigation'
  );

  (mobileNavigation || layout).before(navigation);

  /* ======================================================================
     Помечаем подготовительные блоки
     ====================================================================== */

  const preparationBlocks = new Set();

  function preparationOnly(element) {
    if (!element) return;

    element.classList.add('vt-preparation-only');
    preparationBlocks.add(element);
  }

  // Формы загрузки скрываем в игре.
  // Резервная копия остаётся доступной в обоих режимах.
  partyPane.querySelectorAll('.vt-load-panel').forEach(panel => {
    if (panel.id !== 'vt-backup') {
      preparationOnly(panel);
    }
  });

  partyPane.querySelectorAll('.vt-notice')
    .forEach(preparationOnly);

  preparationOnly(
    partyPane.querySelector('[aria-label="Начало новой партии"]')
  );

  // Контроль и счёт остаются в игре.
  // Создание, удаление и полный сброс — в подготовке.
  preparationOnly(
    document.getElementById('vt-objective-form')
  );

  preparationOnly(
    document.querySelector('[data-mission-action="reset"]')
  );

  // Кнопки удаления КТ пересоздаются при отрисовке миссии.
  // Их видимость задаётся CSS по data-mission-action.

  const partyHint = document.createElement('p');

  partyHint.className = 'vt-game-preparation-hint vt-muted';
  partyHint.textContent =
    'Загрузка армий, карт, сценариев и начало новой партии ' +
    'доступны в режиме «Подготовка».';

  partyPane.prepend(partyHint);

  const missionForm = document.getElementById('vt-objective-form');
  const missionSection = missionForm?.closest('section');

  if (missionSection) {
    const hint = document.createElement('p');

    hint.className = 'vt-game-preparation-hint vt-muted';
    hint.textContent =
      'Чтобы добавить или удалить КТ, включите «Подготовку». ' +
      'Контроль точек и счёт доступны здесь.';

    missionForm.before(hint);
  }

  const terrainTool = field.querySelector(
    '[data-field-tool="terrain"]'
  );

  /* ======================================================================
     Переключение
     ====================================================================== */

  function scheduleResize() {
    if (resizeFrame !== null) {
      cancelAnimationFrame(resizeFrame);
    }

    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = null;
      window.dispatchEvent(new Event('resize'));
    });
  }

  function applyMode(next) {
    if (
      changing ||
      !['game', 'prepare'].includes(next)
    ) {
      return;
    }

    changing = true;

    try {
      const game = next === 'game';

      // Незавершённое добавление или перемещение тайла
      // отменяется как режим инструмента.
      // Уже сохранённая местность не меняется.
      if (game && getTerrainMode() !== 'models') {
        if (isRulerEnabled()) {
          setRulerEnabled(false);
        }

        setTerrainMode('models');
      }

      // Перед скрытием активной вкладки открываем модель.
      if (
        game &&
        terrainTab.getAttribute('aria-selected') === 'true'
      ) {
        modelTab.click();
      }

      // Не оставляем клавиатурный фокус внутри скрываемой формы.
      const focused = document.activeElement;

      const focusWillBeHidden = game && (
        preparationBlocks.has(focused) ||
        [...preparationBlocks].some(element =>
          element.contains(focused)
        ) ||
        terrainTab === focused ||
        terrainPane.contains(focused) ||
        terrainTool === focused ||
        focused?.closest?.(
          '[data-mission-action="remove"]'
        )
      );

      current = next;
      document.body.dataset.workspaceMode = next;

      terrainTab.hidden = game;

      if (terrainTool) {
        terrainTool.hidden = game;
      }

      for (const [key, button] of buttons) {
        const selected = key === next;

        button.classList.toggle('primary', selected);
        button.setAttribute('aria-pressed', String(selected));
      }

      description.textContent = game
        ? 'Модели, измерения и ведение партии'
        : 'Армии, поле и настройка миссии';

      if (focusWillBeHidden) {
        buttons.get(next).focus({ preventScroll: true });
      }
    } finally {
      changing = false;
      scheduleResize();
    }
  }

  // Если редактор местности был включён другим явным действием,
  // показываем соответствующий режим интерфейса.
  document.addEventListener('vt:terrain-mode', () => {
    if (
      !changing &&
      current === 'game' &&
      getTerrainMode() !== 'models'
    ) {
      applyMode('prepare');
    }
  });

  // Первоначально показываем игровой интерфейс.
  // Ни формы, ни их значения не удаляются.
  applyMode('game');
}