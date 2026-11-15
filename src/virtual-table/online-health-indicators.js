// src/virtual-table/online-health-indicators.js
//
// Одна общая подписка на здоровье комнаты для списка и жетонов.
// Не пишет в Firebase и не использует локальные сохранения.
//
// Отсутствие документа означает полный запас ХП только
// после получения снимка коллекции от сервера.
//
// Максимум проверяется тем же способом, что и в карточке:
// строгая датакарта + постоянный бонус артефакта,
// с обязательным совпадением с числовым maxHp ростера.

import { db } from '../core/firebase.js';

import {
  collection,
  onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

import {
  readOnlineModelCard
} from './online-model-card.js';

const maximumCache = new WeakMap();

function confirmedMaximum(unit) {
  if (!unit || typeof unit !== 'object') return null;

  if (maximumCache.has(unit)) {
    return maximumCache.get(unit);
  }

  const card = readOnlineModelCard(unit);
  const base = card.base.hp;
  const maximum = card.total.hp;

  const rosterMaximum = Number.isSafeInteger(unit.maxHp)
    ? unit.maxHp + (
      unit.artifactId === 'artifact-survival-amulet' ? 2 : 0
    )
    : null;

  const valid =
    Number.isSafeInteger(base) &&
    base > 0 &&
    unit.maxHp === base &&
    Number.isSafeInteger(maximum) &&
    maximum > 0 &&
    Number.isSafeInteger(rosterMaximum) &&
    rosterMaximum === maximum;

  const result = valid ? maximum : null;

  maximumCache.set(unit, result);

  return result;
}

export function emptyOnlineHealthState(error = '') {
  return {
    ready: false,
    error: String(error),
    values: new Map()
  };
}

export function onlineHealthIndicator(unit, side, index, state) {
  function unavailable(text, description) {
    return {
      text,
      description,
      zero: false
    };
  }

  if (state.error) {
    return unavailable(
      'ХП —',
      `ХП недоступно: ${state.error}`
    );
  }

  if (!state.ready) {
    return unavailable(
      'ХП …',
      'Ожидаем подтверждённые данные здоровья комнаты.'
    );
  }

  const maximum = confirmedMaximum(unit);

  if (maximum === null) {
    return unavailable(
      'ХП ?',
      'Максимум ХП не подтверждён: ростер и карточка не совпадают ' +
      'или значение не удалось прочитать.'
    );
  }

  const id = `${side}_${index}`;

  let current = maximum;

  if (state.values.has(id)) {
    const saved = state.values.get(id);

    if (
      !saved ||
      saved.side !== side ||
      saved.unitIndex !== index ||
      !Number.isSafeInteger(saved.currentHp) ||
      saved.currentHp < 0 ||
      saved.currentHp > maximum
    ) {
      return unavailable(
        'ХП ?',
        'Сохранённая запись здоровья имеет неподдерживаемый формат.'
      );
    }

    current = saved.currentHp;
  }

  return {
    text: `${current}/${maximum} ХП`,
    description:
      `ХП: ${current} из ${maximum}.` +
      (
        current === 0
          ? ' Нулевое ХП: модель остаётся на поле, эффекты применяются вручную.'
          : ''
      ),
    zero: current === 0
  };
}

export function connectOnlineHealthIndicators({
  roomId,
  onChange,
  onError
}) {
  if (!/^[A-Z0-9]{6}$/.test(roomId)) {
    throw new Error('Некорректный код комнаты для индикаторов ХП.');
  }

  let destroyed = false;

  const unsubscribe = onSnapshot(
    collection(db, 'rooms', roomId, 'tableHealth'),
    { includeMetadataChanges: true },

    snapshot => {
      if (destroyed) return;

      const values = new Map();

      for (const document of snapshot.docs) {
        values.set(document.id, document.data());
      }

      onChange({
        // Не считаем отсутствующий документ полным здоровьем
        // по одному только локальному кешу Firestore.
        ready: !snapshot.metadata.fromCache,
        error: '',
        values
      });
    },

    error => {
      if (destroyed) return;

      onError(error);
    }
  );

  return {
    destroy() {
      if (destroyed) return;

      destroyed = true;
      unsubscribe();
    }
  };
}

export function installOnlineHealthIndicatorStyles() {
  const id = 'vt-online-health-indicator-styles';

  if (document.getElementById(id)) return;

  const style = document.createElement('style');
  style.id = id;

  style.textContent = `
    #vt-unit-list .vt-online-health-label {
      display: block;
      margin-top: 3px;
      font-size: 0.85em;
      font-weight: 700;
      line-height: 1.25;
    }

    #vt-unit-list .vt-unit.vt-online-zero-hp {
      outline: 2px dashed #e89a63;
      outline-offset: -3px;
    }

    #vt-board .vt-token.vt-online-token {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1px;
    }

    #vt-board .vt-online-token > strong {
      line-height: 1;
    }

    #vt-board .vt-online-token .vt-online-health-label {
      display: block;
      max-width: 100%;
      font-size: clamp(
        7px,
        calc(var(--vt-cell, 40px) * 0.19),
        11px
      );
      font-weight: 700;
      line-height: 1.1;
      white-space: nowrap;
    }

    #vt-board .vt-cell.vt-online-zero-hp {
      outline: 2px dashed #e89a63;
      outline-offset: -3px;
    }
  `;

  document.head.append(style);
}