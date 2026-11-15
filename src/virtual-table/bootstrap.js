// src/virtual-table/bootstrap.js
//
// Выбор режима ДО загрузки соответствующего стола.
//
// Без ?room:
// — существующий локальный стол;
// — после его запуска подключается игровая компоновка.
//
// С ?room:
// — самостоятельный онлайн-просмотр;
// — локальный index.js не импортируется;
// — локальное сохранение не восстанавливается;
// — при ошибке нет автоматического перехода к локальному столу.

function showStartupError(text) {
  const notice = document.createElement('p');

  notice.className = 'vt-message is-error';
  notice.setAttribute('role', 'alert');
  notice.textContent = text;

  const header = document.querySelector('.vt-header');

  if (header) {
    header.after(notice);
  } else {
    document.body.prepend(notice);
  }
}

async function startTable() {
  const params = new URLSearchParams(window.location.search);

  if (params.has('room')) {
    try {
      const module = await import('./online-table.js');

      await module.initOnlineTable();
    } catch (error) {
      console.error(
        'Не удалось запустить онлайн-стол:',
        error
      );

      showStartupError(
        'Не удалось запустить онлайн-стол. ' +
        'Локальная партия не открыта вместо него. ' +
        'Обновите страницу или откройте стол без параметра room.'
      );
    }

    return;
  }

  try {
    const module = await import('./local-bootstrap.js');

    await module.initLocalTable();
  } catch (error) {
    console.error(
      'Не удалось запустить локальный стол:',
      error
    );

    showStartupError(
      'Не удалось полностью запустить локальный стол. ' +
      'Проверьте консоль браузера перед продолжением.'
    );

    return;
  }

  // Ошибка визуальной оболочки не должна останавливать
  // уже запущенную локальную партию.
  try {
    const module = await import('./game-shell.js');

    module.initGameShell();
  } catch (error) {
    console.error(
      'Не удалось подключить игровую компоновку:',
      error
    );

    showStartupError(
      'Локальный стол запущен, но новая компоновка ' +
      'не подключилась полностью. Проверьте консоль браузера.'
    );
  }
}

void startTable();