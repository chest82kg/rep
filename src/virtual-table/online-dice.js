// src/virtual-table/online-dice.js
//
// Онлайн-броски для ростеров комнаты.
// Не связывает локальные жетоны с онлайн-моделями.
// Не изменяет локальную партию или battleState.

import { auth, db } from '../core/firebase.js';

import {
  collection,
  doc,
  setDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

import {
  getModelDiceCount,
  rollD6Pool
} from './dice.js';

const FACE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export function createOnlineDicePanel(parent, roomId) {
  const section = document.createElement('section');
  section.className = 'vt-online-dice';

  const title = document.createElement('h3');
  title.textContent = 'Броски комнаты';

  const description = document.createElement('p');
  description.className = 'vt-online-dice-help';
   description.textContent =
    'Выберите свою модель из ростера комнаты. ' +
    'Результат увидят оба участника. ' +
    'Выбор модели для броска выполняется в этом списке. ' +
    'Ресурсы и игровые эффекты автоматически не применяются.';

  const controls = document.createElement('div');
  controls.className = 'vt-online-dice-controls';

  const label = document.createElement('label');
  label.textContent = 'Ваша модель';

  const select = document.createElement('select');
  select.setAttribute('aria-label', 'Модель для онлайн-броска');

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'builder-action-btn';
  button.textContent = 'Выберите модель';
  button.disabled = true;

  const status = document.createElement('p');
  status.className = 'vt-online-dice-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  const logTitle = document.createElement('h4');
  logTitle.textContent = 'Последние броски';

  const log = document.createElement('ol');
  log.className = 'vt-online-dice-log';
  log.setAttribute('aria-label', 'Последние броски комнаты');

  label.append(select);
  controls.append(label, button);

  section.append(
    title,
    description,
    controls,
    status,
    logTitle,
    log
  );

  parent.append(section);

  let room = null;
  let side = null;
  let userId = null;
  let busy = false;
  let destroyed = false;
  let entries = [];
  let unsubscribe = null;
  let lastSeenId = null;
  let hasSnapshot = false;

  function ownRoster() {
    if (!room || !side) return null;

    return side === 'a'
      ? room.hostRoster
      : room.guestRoster;
  }

  function selectedModel() {
    if (select.value === '') return null;

    const index = Number(select.value);
    const unit = ownRoster()?.units?.[index];

    return Number.isInteger(index) && unit
      ? { index, unit }
      : null;
  }

  function updateButton() {
    const model = selectedModel();

    const count = model
      ? getModelDiceCount(model.unit.role)
      : null;

    button.disabled = busy || !model || count === null;

    button.textContent = busy
      ? 'Отправляем…'
      : !model
        ? 'Выберите модель'
        : count === null
          ? 'Категория не распознана'
          : `Бросить ${count}D6 онлайн`;
  }

  function renderChoices() {
    const previous = select.value;
    select.replaceChildren();

    const units = ownRoster()?.units;

    if (!Array.isArray(units) || units.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'Выберите свой ростер в дашборде';
      select.append(option);

      updateButton();
      return;
    }

    units.forEach((unit, index) => {
      const option = document.createElement('option');
      const count = getModelDiceCount(unit.role);

      option.value = String(index);
      option.textContent =
        `${side === 'a' ? 'А' : 'Б'}${index + 1} · ` +
        `${unit.uniqueKey || unit.title || 'Модель'} · ` +
        (count === null ? 'неизвестная категория' : `${count}D6`);

      select.append(option);
    });

    if (
      previous !== '' &&
      [...select.options].some(option => option.value === previous)
    ) {
      select.value = previous;
    }

    updateButton();
  }

  function renderLog() {
    log.replaceChildren();

    if (!entries.length) {
      const empty = document.createElement('li');
      empty.textContent = 'В комнате пока нет бросков.';
      log.append(empty);
      return;
    }

    entries.forEach(entry => {
      const item = document.createElement('li');

      const heading = document.createElement('strong');
      const sideLabel = entry.side === 'a' ? 'А' : 'Б';

      // Используем номер из записи броска, а не название
      // из текущего ростера: ростер могли заменить.
      heading.textContent =
        `${sideLabel}${entry.unitIndex + 1} · ${entry.count}D6`;

      const faces = document.createElement('div');
      faces.className = 'vt-online-dice-faces';
      faces.setAttribute('aria-hidden', 'true');
      faces.textContent = entry.values
        .map(value => FACE[value])
        .join(' ');

      const numbers = document.createElement('div');
      numbers.className = 'vt-online-dice-numbers';
      numbers.textContent = entry.values.join(' · ');

      const meta = document.createElement('small');

      const date = typeof entry.createdAt?.toDate === 'function'
        ? entry.createdAt.toDate()
        : null;

      meta.textContent =
        (entry.authorId === userId ? 'Ваш бросок' : 'Бросок соперника') +
        (date
          ? ` · ${date.toLocaleTimeString('ru-RU', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })}`
          : ' · подтверждается');

      item.append(heading, faces, numbers, meta);
      log.append(item);
    });
  }

  function startLog() {
    if (unsubscribe || !userId) return;

    unsubscribe = onSnapshot(
      query(
        collection(db, 'rooms', roomId, 'diceRolls'),
        orderBy('createdAt', 'desc'),
        limit(30)
      ),

      snapshot => {
        if (destroyed) return;

        entries = snapshot.docs
          .map(record => ({
            ...record.data(),
            id: record.id
          }))
          .filter(entry =>
            ['a', 'b'].includes(entry.side) &&
            Number.isInteger(entry.unitIndex) &&
            entry.unitIndex >= 0 &&
            [3, 4, 5].includes(entry.count) &&
            Array.isArray(entry.values) &&
            entry.values.length === entry.count &&
            entry.values.every(value =>
              Number.isInteger(value) &&
              value >= 1 &&
              value <= 6
            )
          );

        const newest = entries[0];

        if (
          hasSnapshot &&
          newest &&
          newest.id !== lastSeenId
        ) {
          status.textContent =
            `${newest.authorId === userId ? 'Ваш бросок' : 'Соперник бросил'}: ` +
            newest.values.join(' · ');
        }

        lastSeenId = newest?.id || null;
        hasSnapshot = true;

        renderLog();
      },

      error => {
        if (destroyed) return;

        console.error('Online dice subscription:', error);

        status.textContent =
          'Не удалось прочитать журнал бросков: ' +
          (error.code || error.message);
      }
    );
  }

  select.addEventListener('change', updateButton);

  button.addEventListener('click', async () => {
    if (busy || destroyed) return;

    const model = selectedModel();
    const count = model
      ? getModelDiceCount(model.unit.role)
      : null;

    if (!model || count === null || !side || !userId) return;

    if (
      auth.currentUser?.uid !== userId ||
      !auth.currentUser?.emailVerified
    ) {
      status.textContent =
        'Аккаунт изменился или почта не подтверждена. ' +
        'Проверьте аккаунт и обновите страницу.';
      return;
    }

    busy = true;
    updateButton();

    try {
      // Создаём отдельный документ.
      // При ошибке автоматически повторно не бросаем.
      const reference = doc(
        collection(db, 'rooms', roomId, 'diceRolls')
      );

      const values = rollD6Pool(count);

      status.textContent = 'Отправляем бросок в комнату…';

      await setDoc(reference, {
        authorId: userId,
        side,
        unitIndex: model.index,
        count,
        values,
        createdAt: serverTimestamp()
      });

      if (!destroyed) {
        status.textContent =
          'Бросок сохранён: ' + values.join(' · ');
      }
    } catch (error) {
      console.error('Online dice write:', error);

      if (!destroyed) {
        status.textContent =
          'Бросок не удалось подтвердить: ' +
          (error.code || error.message) +
          '. Проверьте журнал перед новым броском.';
      }
    } finally {
      busy = false;

      if (!destroyed) updateButton();
    }
  });

  return {
    update(nextRoom, nextSide, nextUserId) {
      if (destroyed) return;

      room = nextRoom;
      side = nextSide;
      userId = nextUserId;

      renderChoices();
      startLog();
    },

    destroy() {
      destroyed = true;

      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }

      section.remove();
    }
  };
}