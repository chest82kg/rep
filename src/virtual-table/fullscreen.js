// src/virtual-table/fullscreen.js
//
// Полноэкранный режим всей страницы виртуального стола.
// Игровое состояние не изменяет.

let initialized = false;

export function initFullscreen() {
  if (initialized) return;

  const toolbar = document.querySelector(
    '.vt-field-panel > .vt-field-toolbar'
  );

  if (!toolbar) {
    console.error('Полный экран: не найдена панель инструментов.');
    return;
  }

  initialized = true;

  const root = document.documentElement;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'builder-action-btn';
  button.setAttribute('aria-pressed', 'false');

  toolbar.append(button);

  const supported = Boolean(
    document.fullscreenEnabled &&
    typeof root.requestFullscreen === 'function' &&
    typeof document.exitFullscreen === 'function'
  );

  let busy = false;

  function isFullscreen() {
    return document.fullscreenElement === root;
  }

  function updateButton() {
    const active = isFullscreen();

    button.textContent = active
      ? 'Выйти из полного экрана'
      : 'На весь экран';

    button.setAttribute('aria-pressed', String(active));
    button.classList.toggle('primary', active);
    button.disabled = !supported || busy;

    button.title = !supported
      ? 'Этот браузер не поддерживает полноэкранный режим страницы.'
      : active
        ? 'Вернуться к обычному виду. На компьютере также можно нажать Esc.'
        : 'Развернуть весь виртуальный стол вместе с панелями управления.';
  }

  function message(text) {
    const status = document.getElementById('vt-message');

    if (!status) return;

    status.textContent = text;
    status.classList.add('is-error');
  }

  function refreshLayout() {
    // Существующие модули раскладки слушают resize.
    // Дополнительный вызов нужен для браузеров,
    // где fullscreenchange и resize приходят в разном порядке.
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));

      requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'));
      });
    });
  }

  button.addEventListener('click', async () => {
    if (!supported || busy) return;

    busy = true;
    updateButton();

    try {
      if (isFullscreen()) {
        await document.exitFullscreen();
      } else {
        // Запрос вызывается непосредственно из действия пользователя.
        await root.requestFullscreen();
      }
    } catch (error) {
      console.warn('Не удалось переключить полный экран:', error);

      message(
        'Браузер не разрешил переключение полноэкранного режима. ' +
        'Продолжайте работу в обычном окне.'
      );
    } finally {
      busy = false;
      updateButton();
      refreshLayout();
    }
  });

  document.addEventListener('fullscreenchange', () => {
    updateButton();
    refreshLayout();
  });

  updateButton();
}