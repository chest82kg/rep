// src/virtual-table/online-objectives.js
//
// Общие ручные КТ и счёт.
// Не импортирует локальную миссию, историю и хранилища.
//
// Весь документ изменяется транзакционно.
// Устаревшее действие отклоняется по revision.
// Контроль точки не начисляет очки автоматически.

import { auth, db } from '../core/firebase.js';

import {
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const LETTERS = 'ABCDEFGHIJKLMN';
const MAX_SCORE = 99999;
const MAX_REVISION = Number.MAX_SAFE_INTEGER;

const OWNERS = {
  neutral: 'Нейтральная',
  a: 'Игрок А',
  b: 'Игрок Б'
};

const COLORS = {
  neutral: '#ffe09c',
  a: '#c1b6ff',
  b: '#84e0ef'
};

function node(tag, text = '', className = '') {
  const element = document.createElement(tag);
  element.textContent = text;
  element.className = className;
  return element;
}

function exactKeys(value, keys) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length === keys.length &&
    keys.every(key => Object.hasOwn(value, key))
  );
}

function emptyState() {
  return {
    version: 1,
    revision: 0,
    scores: { a: 0, b: 0 },
    objectives: [],
    changedPoint: -1
  };
}

function validState(data) {
  if (
    !exactKeys(data, [
      'version',
      'revision',
      'scores',
      'objectives',
      'changedPoint',
      'updatedAt'
    ]) ||
    data.version !== 1 ||
    !Number.isSafeInteger(data.revision) ||
    data.revision < 1 ||
    !exactKeys(data.scores, ['a', 'b']) ||
    !Array.isArray(data.objectives) ||
    data.objectives.length > 30 ||
    !Number.isInteger(data.changedPoint) ||
    data.changedPoint < -1 ||
    data.changedPoint >= data.objectives.length ||
    typeof data.updatedAt?.toMillis !== 'function'
  ) {
    return false;
  }

  if (!['a', 'b'].every(side =>
    Number.isInteger(data.scores[side]) &&
    data.scores[side] >= 0 &&
    data.scores[side] <= MAX_SCORE
  )) {
    return false;
  }

  const ids = new Set();
  const cells = new Set();

  return data.objectives.every(point => {
    if (
      !exactKeys(point, ['id', 'title', 'x', 'y', 'owner']) ||
      typeof point.id !== 'string' ||
      !/^[a-zA-Z0-9-]{1,80}$/.test(point.id) ||
      ids.has(point.id) ||
      typeof point.title !== 'string' ||
      !point.title.trim() ||
      point.title.length > 80 ||
      !Number.isInteger(point.x) ||
      !Number.isInteger(point.y) ||
      point.x < 0 || point.x >= 14 ||
      point.y < 0 || point.y >= 14 ||
      !Object.hasOwn(OWNERS, point.owner)
    ) {
      return false;
    }

    const cell = `${point.x}_${point.y}`;
    if (cells.has(cell)) return false;

    ids.add(point.id);
    cells.add(cell);
    return true;
  });
}

export function connectOnlineObjectives({
  roomId,
  userId,
  getRoom,
  container,
  board
}) {
  const reference = doc(
    db, 'rooms', roomId, 'tableMission', 'state'
  );

  let destroyed = false;
  let ready = false;
  let busy = false;
  let state = emptyState();

  const panel = node('section', '', 'vt-detail-block');
  panel.setAttribute('aria-label', 'Общие КТ и счёт');

  const heading = node('h3', 'КТ и счёт');
  const help = node(
    'p',
    'Ручная миссия комнаты. Контроль не начисляет очки. ' +
    'Каждый меняет свой счёт; точки настраивает хост. ' +
    'Общей отмены пока нет.',
    'vt-muted'
  );

  const status = node('p', 'Загружаем миссию…', 'vt-muted');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  const scores = node('div');
  const pointList = node('div');

  const editor = node('form');
  editor.style.display = 'grid';
  editor.style.gap = '8px';

  const editorHeading = node('strong', 'Добавить КТ');

  function labeledInput(labelText, input) {
    const label = node('label', labelText);
    label.style.display = 'grid';
    label.style.gap = '5px';
    label.append(input);
    return label;
  }

  const title = node('input');
  title.type = 'text';
  title.maxLength = 80;
  title.required = true;

  const column = node('select');
  const row = node('select');

  [...LETTERS].forEach((letter, index) => {
    column.append(new Option(letter, String(index)));
    row.append(new Option(String(index + 1), String(index)));
  });

  const coordinates = node('div', '', 'vt-detail-actions');
  coordinates.append(
    labeledInput('Столбец', column),
    labeledInput('Строка', row)
  );

  const submit = node(
    'button', 'Добавить точку', 'builder-action-btn'
  );
  submit.type = 'submit';

  const cancelEdit = node(
    'button', 'Отменить редактирование', 'builder-action-btn'
  );
  cancelEdit.type = 'button';
  cancelEdit.hidden = true;

  let editingId = null;

  editor.append(
    editorHeading,
    labeledInput('Название точки', title),
    coordinates,
    submit,
    cancelEdit
  );

  panel.append(heading, help, scores, editor, status, pointList);
  container.append(panel);

  function message(text, error = false) {
    if (destroyed) return;
    status.textContent = text;
    status.style.color = error ? '#ffadb7' : '';
  }

  function sideFor(room) {
    if (!room) return null;

    const host = room.hostId === userId;
    const guest = room.guestId === userId;

    return host === guest ? null : host ? 'a' : 'b';
  }

  function active() {
    return !destroyed &&
      auth.currentUser?.uid === userId &&
      auth.currentUser?.emailVerified === true;
  }

  function allowed() {
    return active() &&
      ready &&
      !busy &&
      Boolean(sideFor(getRoom())) &&
      getRoom()?.tableLocked === true;
  }

  function clearEditor() {
    editingId = null;
    title.value = '';
    editorHeading.textContent = 'Добавить КТ';
    submit.textContent = 'Добавить точку';
    cancelEdit.hidden = true;
  }

  cancelEdit.addEventListener('click', clearEditor);

  const scoreControls = [];

  for (const side of ['a', 'b']) {
    const section = node('section', '', 'vt-detail-block');
    const label = node('strong');

    const actions = node('div', '', 'vt-detail-actions');
    const minus = node('button', '−1', 'builder-action-btn');
    const plus = node('button', '+1', 'builder-action-btn');

    minus.type = 'button';
    plus.type = 'button';

    const form = node('form', '', 'vt-detail-actions');
    form.style.marginTop = '8px';

    const amount = node('input');
    amount.type = 'number';
    amount.min = '1';
    amount.max = String(MAX_SCORE);
    amount.step = '1';
    amount.required = true;
    amount.inputMode = 'numeric';
    amount.placeholder = 'Очки';
    amount.setAttribute(
      'aria-label',
      `Количество очков игрока ${side === 'a' ? 'А' : 'Б'}`
    );
    amount.style.width = '100px';

    const add = node('button', 'Добавить', 'builder-action-btn');
    const subtract = node('button', 'Снять', 'builder-action-btn');

    add.type = 'submit';
    subtract.type = 'submit';
    subtract.dataset.direction = '-1';

    actions.append(minus, plus);
    form.append(amount, add, subtract);
    section.append(label, actions, form);
    scores.append(section);

    async function changeScore(delta) {
      return perform(next => {
        const result = next.scores[side] + delta;

        if (
          !Number.isInteger(result) ||
          result < 0 ||
          result > MAX_SCORE
        ) {
          throw new Error(
            `Итоговый счёт должен быть от 0 до ${MAX_SCORE}.`
          );
        }

        next.scores[side] = result;
      }, 'Счёт сохранён.');
    }

    minus.addEventListener('click', () => {
      void changeScore(-1);
    });

    plus.addEventListener('click', () => {
      void changeScore(1);
    });

    form.addEventListener('submit', event => {
      event.preventDefault();
      event.stopPropagation();

      const value = Number(amount.value);

      if (
        amount.value.trim() === '' ||
        amount.validity.badInput ||
        !Number.isInteger(value) ||
        value < 1 ||
        value > MAX_SCORE
      ) {
        message(`Введите целое число от 1 до ${MAX_SCORE}.`, true);
        return;
      }

      const delta = event.submitter?.dataset.direction === '-1'
        ? -value
        : value;

      void changeScore(delta).then(saved => {
        if (destroyed) return;
        if (saved) amount.value = '';
        amount.focus({ preventScroll: true });
      });
    });

    scoreControls.push({
      side, label, minus, plus, amount, add, subtract
    });
  }

  async function perform(change, successText) {
    if (!allowed()) {
      message(
        'Изменение недоступно: дождитесь серверных данных ' +
        'и фиксации составов.',
        true
      );
      return false;
    }

    const expectedRevision = state.revision;

    busy = true;
    refresh();

    try {
      await runTransaction(db, async transaction => {
        if (!active()) {
          throw new Error('Аккаунт или подключение изменились.');
        }

        const roomSnapshot = await transaction.get(
          doc(db, 'rooms', roomId)
        );

        const missionSnapshot = await transaction.get(reference);

        if (
          !roomSnapshot.exists() ||
          !sideFor(roomSnapshot.data()) ||
          roomSnapshot.data().tableLocked !== true
        ) {
          throw new Error('Нет доступа или составы не зафиксированы.');
        }

        const actual = missionSnapshot.exists()
          ? missionSnapshot.data()
          : emptyState();

        if (missionSnapshot.exists() && !validState(actual)) {
          throw new Error(
            'Неподдерживаемая миссия. Исходные данные не изменены.'
          );
        }

        if (actual.revision !== expectedRevision) {
          throw new Error(
            'КТ или счёт уже изменились. Проверьте обновление ' +
            'и повторите действие.'
          );
        }

        if (actual.revision >= MAX_REVISION) {
          throw new Error('Достигнут предел версии миссии.');
        }

        const next = {
          version: 1,
          revision: actual.revision + 1,
          scores: { ...actual.scores },
          objectives: actual.objectives.map(point => ({ ...point })),
          changedPoint: -1
        };

        change(next, sideFor(roomSnapshot.data()));

        const checked = {
          ...next,
          updatedAt: { toMillis: () => 0 }
        };

        if (!validState(checked)) {
          throw new Error('Некорректные данные КТ или счёта.');
        }

        if (!active()) {
          throw new Error('Аккаунт или подключение изменились.');
        }

        transaction.set(reference, {
          ...next,
          updatedAt: serverTimestamp()
        });
      });

      message(successText);
      return true;
    } catch (error) {
      message(
        'Изменение не подтверждено: ' +
        String(error.message || error.code || error),
        true
      );
      return false;
    } finally {
      busy = false;
      if (!destroyed) refresh();
    }
  }

  editor.addEventListener('submit', event => {
    event.preventDefault();
    event.stopPropagation();

    const pointTitle = title.value.trim();
    const x = Number(column.value);
    const y = Number(row.value);
    const id = editingId || crypto.randomUUID();

    void perform((next, ownSide) => {
      if (ownSide !== 'a') {
        throw new Error('Настройка точек доступна только хосту.');
      }

      if (!pointTitle || pointTitle.length > 80) {
        throw new Error('Название должно содержать от 1 до 80 символов.');
      }

      if (next.objectives.some(point =>
        point.id !== id && point.x === x && point.y === y
      )) {
        throw new Error('На этой клетке уже есть КТ.');
      }

      const existing = next.objectives.find(point => point.id === id);

      if (editingId) {
        if (!existing) {
          throw new Error('Редактируемая точка уже удалена.');
        }

        Object.assign(existing, { title: pointTitle, x, y });
      } else {
        if (next.objectives.length >= 30) {
          throw new Error('Допускается не больше 30 КТ.');
        }

        next.objectives.push({
          id, title: pointTitle, x, y, owner: 'neutral'
        });
      }
    }, 'Точка сохранена. Счёт не изменён.').then(saved => {
      if (saved && !destroyed) clearEditor();
    });
  });

  function drawMarkers() {
    board.querySelectorAll('[data-online-objective]')
      .forEach(marker => marker.remove());

    if (destroyed) return;

    state.objectives.forEach((point, index) => {
      const cell = board.querySelector(
        `button[data-x="${point.x}"][data-y="${point.y}"]`
      );

      if (!cell) return;

      const marker = node('span', `КТ${index + 1}`);
      marker.dataset.onlineObjective = point.id;
      marker.title =
        `${point.title} · ${OWNERS[point.owner]}. ` +
        'Контроль меняется в панели «КТ и счёт».';

      Object.assign(marker.style, {
        position: 'absolute',
        bottom: '1px',
        left: '1px',
        zIndex: '6',
        padding: '1px 3px',
        color: COLORS[point.owner],
        background: '#0d0e14eb',
        border: `1px solid ${COLORS[point.owner]}`,
        borderRadius: '3px',
        fontSize: 'calc(var(--vt-cell) * 0.17)',
        fontWeight: '800',
        lineHeight: '1.1',
        pointerEvents: 'none',
        opacity: ready ? '1' : '0.5'
      });

      cell.append(marker);
    });
  }

  function refresh() {
    if (destroyed) return;

    const ownSide = sideFor(getRoom());
    const writable = allowed();

    for (const control of scoreControls) {
      const own = ownSide === control.side;

      control.label.textContent =
        `Игрок ${control.side === 'a' ? 'А' : 'Б'}: ` +
        `${state.scores[control.side]}${ready ? '' : ' · не подтверждён'}`;

      control.minus.disabled =
        !writable || !own || state.scores[control.side] === 0;

      control.plus.disabled =
        !writable || !own || state.scores[control.side] === MAX_SCORE;

      for (const element of [
        control.amount, control.add, control.subtract
      ]) {
        element.disabled = !writable || !own;
      }
    }

    editor.hidden = ownSide !== 'a';

    for (const element of editor.elements) {
      element.disabled = !writable;
    }

    // Если список перестраивается, сохраняем фокус
    // на соответствующем элементе той же КТ.
    const focused = document.activeElement;
    const focusId = focused?.dataset?.pointId;
    const focusAction = focused?.dataset?.pointAction;

    pointList.replaceChildren();

    if (!state.objectives.length) {
      pointList.append(node('p', 'КТ ещё не добавлены.', 'vt-muted'));
    }

    state.objectives.forEach((point, index) => {
      const item = node('section', '', 'vt-detail-block');
      const label = node(
        'strong',
        `КТ${index + 1}: ${point.title} · ` +
        `${LETTERS[point.x]}${point.y + 1}`
      );

      const owner = node('select');
      owner.setAttribute('aria-label', `Контроль: ${point.title}`);
      owner.dataset.pointId = point.id;
      owner.dataset.pointAction = 'owner';

      for (const [value, text] of Object.entries(OWNERS)) {
        owner.append(new Option(text, value));
      }

      owner.value = point.owner;
      owner.disabled = !writable;

      owner.addEventListener('change', () => {
        const requestedOwner = owner.value;

        void perform(next => {
          const targetIndex = next.objectives.findIndex(
            target => target.id === point.id
          );

          if (targetIndex < 0) {
            throw new Error('Точка уже удалена.');
          }

          next.objectives[targetIndex].owner = requestedOwner;
          next.changedPoint = targetIndex;
        }, 'Контроль сохранён. Счёт не изменён.');
      });

      item.append(label, owner);

      if (ownSide === 'a') {
        const actions = node('div', '', 'vt-detail-actions');

        const edit = node('button', 'Изменить', 'builder-action-btn');
        const remove = node('button', 'Удалить', 'builder-action-btn');

        for (const [button, action] of [
          [edit, 'edit'], [remove, 'remove']
        ]) {
          button.type = 'button';
          button.disabled = !writable;
          button.dataset.pointId = point.id;
          button.dataset.pointAction = action;
        }

        edit.addEventListener('click', () => {
          editingId = point.id;
          title.value = point.title;
          column.value = String(point.x);
          row.value = String(point.y);
          editorHeading.textContent = 'Изменить КТ';
          submit.textContent = 'Сохранить точку';
          cancelEdit.hidden = false;
          title.focus({ preventScroll: true });
        });

        remove.addEventListener('click', () => {
          if (!window.confirm(
            `Удалить «${point.title}»? Счёт сохранится.`
          )) {
            return;
          }

          void perform((next, side) => {
            if (side !== 'a') {
              throw new Error('Удаление доступно только хосту.');
            }

            if (!next.objectives.some(target => target.id === point.id)) {
              throw new Error('Точка уже удалена.');
            }

            next.objectives = next.objectives.filter(
              target => target.id !== point.id
            );
          }, 'Точка удалена. Счёт не изменён.').then(saved => {
            if (saved && !destroyed && editingId === point.id) {
              clearEditor();
            }
          });
        });

        actions.append(edit, remove);
        item.append(actions);
      }

      pointList.append(item);
    });

    if (focusId && focusAction) {
      [...pointList.querySelectorAll('[data-point-id]')]
        .find(element =>
          element.dataset.pointId === focusId &&
          element.dataset.pointAction === focusAction &&
          !element.disabled
        )?.focus({ preventScroll: true });
    }

    drawMarkers();
  }

  const observer = new MutationObserver(drawMarkers);
  observer.observe(board, { childList: true });

  const unsubscribe = onSnapshot(
    reference,
    { includeMetadataChanges: true },

    snapshot => {
      if (destroyed) return;

      if (
        snapshot.metadata.fromCache ||
        snapshot.metadata.hasPendingWrites
      ) {
        ready = false;
        message(
          'Ожидаем серверное подтверждение миссии. ' +
          'Изменения временно недоступны.'
        );
        refresh();
        return;
      }

      const actual = snapshot.exists()
        ? snapshot.data()
        : emptyState();

      if (snapshot.exists() && !validState(actual)) {
        ready = false;
        message(
          'Неподдерживаемая миссия. Запись заблокирована; ' +
          'данные на сервере не изменены.',
          true
        );
        refresh();
        return;
      }

      state = actual;
      ready = true;

      message(
        getRoom()?.tableLocked === true
          ? 'Миссия получена с сервера.'
          : 'Миссия получена. Для редактирования сначала ' +
            'разместите модель и зафиксируйте составы.'
      );

      refresh();
    },

    error => {
      if (destroyed) return;
      ready = false;
      message(
        'Миссия недоступна: ' +
        String(error.code || error.message),
        true
      );
      refresh();
    }
  );

  refresh();

  return {
    refresh,

    destroy() {
      if (destroyed) return;
      destroyed = true;
      unsubscribe();
      observer.disconnect();
      board.querySelectorAll('[data-online-objective]')
        .forEach(marker => marker.remove());
      panel.remove();
    }
  };
}