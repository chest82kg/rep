// src/virtual-table/online-health.js
//
// Ручное текущее ХП онлайн-поля.
// Отдельно от позиций и старого battleState.
//
// Не использует localStorage.
// Отсутствие документа здоровья означает полный запас ХП.
// Запись разрешена только после фиксации состава.
//
// Нуждается в подтверждённом максимуме из строгой карточки.
// Firebase отдельно ограничивает значение по числовому
// maxHp ростера и бонусу Амулета выживания.

import { auth, db } from '../core/firebase.js';

import {
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const panels = new WeakMap();

function node(tag, text = '', className = '') {
  const element = document.createElement(tag);
  element.textContent = String(text);

  if (className) element.className = className;

  return element;
}

function maximumFromRoster(unit) {
  if (
    !unit ||
    !Number.isSafeInteger(unit.maxHp) ||
    unit.maxHp <= 0
  ) {
    return null;
  }

  const maximum = unit.maxHp + (
    unit.artifactId === 'artifact-survival-amulet' ? 2 : 0
  );

  return Number.isSafeInteger(maximum) ? maximum : null;
}

export function stopOnlineHealth(container) {
  const dispose = panels.get(container);

  if (dispose) {
    dispose();
    panels.delete(container);
  }
}

export function appendOnlineHealth(
  container,
  {
    roomId,
    side,
    index,
    maximum,
    baseHp
  }
) {
  stopOnlineHealth(container);

  if (
    !/^[A-Z0-9]{6}$/.test(roomId) ||
    !['a', 'b'].includes(side) ||
    !Number.isInteger(index) ||
    index < 0
  ) {
    throw new Error('Некорректный контекст онлайн-ХП.');
  }

    const section = document.createElement('section');
  section.className = 'vt-card-controls vt-online-health';

  const row = document.createElement('div');
  row.className = 'vt-card-health-row';

  const title = node(
    'span',
    'ХП',
    'vt-card-health-label'
  );

  const value = node(
    'strong',
    '…',
    'vt-card-health-value'
  );

  const minus = node(
    'button',
    '−',
    'builder-action-btn'
  );

  const plus = node(
    'button',
    '+',
    'builder-action-btn'
  );

  minus.type = 'button';
  plus.type = 'button';

  minus.dataset.delta = '-1';
  plus.dataset.delta = '1';

  minus.setAttribute('aria-label', 'Уменьшить ХП на 1');
  plus.setAttribute('aria-label', 'Увеличить ХП на 1');

  const status = node(
    'p',
    '',
    'vt-muted vt-online-health-status'
  );

  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  row.append(title, minus, value, plus);
  section.append(row, status);
  container.append(section);

  const uid = auth.currentUser?.uid;

  const roomReference = doc(db, 'rooms', roomId);

  const healthReference = doc(
    db,
    'rooms',
    roomId,
    'tableHealth',
    `${side}_${index}`
  );

  let destroyed = false;
  let busy = false;
  let room = null;
  let health = null;
  let roomReady = false;
  let healthReady = false;
  let failure = '';

  function rosterUnit(sourceRoom) {
    const roster = side === 'a'
      ? sourceRoom?.hostRoster
      : sourceRoom?.guestRoster;

    return Array.isArray(roster?.units)
      ? roster.units[index]
      : null;
  }

  function ownsSide(sourceRoom) {
    if (
      !uid ||
      auth.currentUser?.uid !== uid ||
      !auth.currentUser?.emailVerified
    ) {
      return false;
    }

    return side === 'a'
      ? sourceRoom?.hostId === uid &&
        sourceRoom?.guestId !== uid
      : sourceRoom?.guestId === uid &&
        sourceRoom?.hostId !== uid;
  }

  function currentValue() {
    return health === null ? maximum : health.currentHp;
  }

  function render() {
    if (destroyed) return;

    minus.disabled = true;
    plus.disabled = true;

    if (failure) {
      value.textContent = 'ХП недоступно';
      status.textContent = failure;
      return;
    }

    if (!roomReady || !healthReady) {
      value.textContent = 'Загружаем…';
      return;
    }

    const unit = rosterUnit(room);

    if (
      !Number.isSafeInteger(maximum) ||
      maximum <= 0 ||
      !Number.isSafeInteger(baseHp) ||
      baseHp <= 0 ||
      unit?.maxHp !== baseHp ||
      maximumFromRoster(unit) !== maximum
    ) {
      value.textContent = 'Максимум ХП не подтверждён';
      status.textContent =
        'Числовое ХП ростера не совпадает со строгой карточкой ' +
        'или карточка не прочитана. Редактирование отключено.';
      return;
    }

    const current = currentValue();

    if (
      !Number.isSafeInteger(current) ||
      current < 0 ||
      current > maximum
    ) {
      value.textContent = 'Неподдерживаемое значение ХП';
      status.textContent =
        'Запись здоровья не соответствует максимуму модели.';
      return;
    }

    value.textContent = `${current} / ${maximum}`;

    if (!ownsSide(room)) {
      status.textContent = 'Модель соперника: только просмотр.';
      return;
    }

    if (room?.tableLocked !== true) {
      status.textContent =
        'Сначала начните расстановку: состав партии ' +
        'должен быть зафиксирован.';
      return;
    }

    minus.disabled = busy || current <= 0;
    plus.disabled = busy || current >= maximum;

        status.textContent = busy ? 'Сохраняем ХП…' : '';
  }

  async function change(delta) {
    if (destroyed || busy || ![-1, 1].includes(delta)) return;

    if (!roomReady || !healthReady || !ownsSide(room)) return;

    busy = true;
    render();

    try {
      await runTransaction(db, async transaction => {
        if (
          destroyed ||
          auth.currentUser?.uid !== uid ||
          !auth.currentUser?.emailVerified
        ) {
          throw new Error('Аккаунт или выбранная модель изменились.');
        }

        const roomSnapshot = await transaction.get(roomReference);
        const healthSnapshot = await transaction.get(healthReference);

        if (!roomSnapshot.exists()) {
          throw new Error('Комната удалена.');
        }

        const actualRoom = roomSnapshot.data();
        const unit = rosterUnit(actualRoom);

        if (!ownsSide(actualRoom)) {
          throw new Error('Можно менять ХП только своей модели.');
        }

        if (actualRoom.tableLocked !== true) {
          throw new Error('Состав партии ещё не зафиксирован.');
        }

        if (
          !Number.isSafeInteger(maximum) ||
          maximum <= 0 ||
          unit?.maxHp !== baseHp ||
          maximumFromRoster(unit) !== maximum
        ) {
          throw new Error('Максимум ХП не совпадает с карточкой.');
        }

        const saved = healthSnapshot.exists()
          ? healthSnapshot.data()
          : null;

        if (
          saved &&
          (
            saved.side !== side ||
            saved.unitIndex !== index
          )
        ) {
          throw new Error('Запись здоровья относится к другой модели.');
        }

        const previous = saved ? saved.currentHp : maximum;

        if (
          !Number.isSafeInteger(previous) ||
          previous < 0 ||
          previous > maximum
        ) {
          throw new Error('Сохранённое ХП имеет неверный формат.');
        }

        const next = previous + delta;

        if (next < 0 || next > maximum) {
          throw new Error('Достигнута граница ХП.');
        }

        if (destroyed || auth.currentUser?.uid !== uid) {
          throw new Error('Выбранная модель или аккаунт изменились.');
        }

        transaction.set(healthReference, {
          side,
          unitIndex: index,
          currentHp: next,
          updatedAt: serverTimestamp()
        });
      });
    } catch (error) {
      console.error('Online health write:', error);

      if (!destroyed) {
        busy = false;
        render();

        status.textContent =
          'Изменение не подтверждено: ' +
          String(error.code || error.message) +
          '. Проверьте актуальное ХП перед повтором.';
      }

      return;
    } finally {
      busy = false;
    }

    render();
  }

  minus.addEventListener('click', () => {
    void change(-1);
  });

  plus.addEventListener('click', () => {
    void change(1);
  });

  render();

  const unsubscribeRoom = onSnapshot(
    roomReference,

    snapshot => {
      if (destroyed) return;

      room = snapshot.exists() ? snapshot.data() : null;
      roomReady = true;

      if (!room) failure = 'Комната удалена.';

      render();
    },

    error => {
      if (destroyed) return;

      failure =
        'Не удалось проверить комнату: ' +
        String(error.code || error.message);

      render();
    }
  );

  const unsubscribeHealth = onSnapshot(
    healthReference,

    snapshot => {
      if (destroyed) return;

      health = snapshot.exists() ? snapshot.data() : null;
      healthReady = true;

      if (
        health &&
        (
          health.side !== side ||
          health.unitIndex !== index
        )
      ) {
        failure = 'Запись здоровья относится к другой модели.';
      }

      render();
    },

    error => {
      if (destroyed) return;

      failure =
        'Не удалось загрузить ХП: ' +
        String(error.code || error.message);

      render();
    }
  );

  panels.set(container, () => {
    destroyed = true;
    unsubscribeRoom();
    unsubscribeHealth();
    section.remove();
  });
}