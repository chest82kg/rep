// src/virtual-table/online-layered-terrain-editor.js
//
// Добавление тайлов в многослойный ландшафт.
//
// Только создатель комнаты.
// Новый тайл получает верхний порядок слоя.
// Частичные перекрытия разрешены.
// Высоты складываются поклеточно.
//
// Не перемещает модели и не назначает им опоры.
// Не читает локальные сохранения.
//
// Штатные конкурентные изменения согласуются
// через tableTerrainMeta/layout.revision.
//
// Rules пока не проверяют глобальную уникальность layer.
// Защита от намеренно изменённого клиента владельца
// этим модулем не обеспечивается.

import { auth, db } from '../core/firebase.js';

import {
  collection,
  doc,
  getDocFromServer,
  getDocsFromServer,
  runTransaction,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

import {
  TERRAIN_TYPES
} from './terrain.js';

import {
  buildTerrainLayers
} from './terrain-layers.js';

import {
  decodeOnlineTerrainTile
} from './online-terrain.js';

const LETTERS = 'ABCDEFGHIJKLMN';

function node(tag, text = '', className = '') {
  const element = document.createElement(tag);
  element.textContent = text;

  if (className) element.className = className;

  return element;
}

function revisionOf(snapshot) {
  if (!snapshot.exists()) return 0;

  const revision = snapshot.data().revision;

  if (
    !Number.isSafeInteger(revision) ||
    revision < 1
  ) {
    throw new Error('Некорректная версия ландшафта.');
  }

  return revision;
}

function integer(input, title, min, max) {
  const raw = input.value.trim();
  const value = Number(raw);

  if (
    raw === '' ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  ) {
    throw new Error(
      `${title}: требуется целое число от ${min} до ${max}.`
    );
  }

  return value;
}

function positionOf(input) {
  const value = input.value.trim().toUpperCase();
  const match = /^([A-N])(1[0-4]|[1-9])$/.exec(value);

  if (!match) {
    throw new Error(
      'Укажите клетку от A1 до N14 латинскими буквами.'
    );
  }

  return {
    x: LETTERS.indexOf(match[1]),
    y: Number(match[2]) - 1
  };
}

function shapeCells(shape, width, depth) {
  const cells = [];

  for (let y = 0; y < depth; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (
        shape === 'corner' &&
        x !== 0 &&
        y !== depth - 1
      ) {
        continue;
      }

      cells.push({ x, y });
    }
  }

  return cells;
}

async function addLayeredTile({
  roomId,
  userId,
  data,
  isActive
}) {
  const roomRef = doc(db, 'rooms', roomId);

  const terrainRef = collection(
    db, 'rooms', roomId, 'tableTerrain'
  );

  const metaRef = doc(
    db, 'rooms', roomId, 'tableTerrainMeta', 'layout'
  );

  // Один ID на всю пользовательскую операцию.
  const tileRef = doc(terrainRef);

  function checkActive() {
    if (
      !isActive() ||
      auth.currentUser?.uid !== userId ||
      !auth.currentUser?.emailVerified
    ) {
      throw new Error(
        'Аккаунт или подключение редактора изменились.'
      );
    }
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    checkActive();

    // Версия читается перед списком документов.
    const metaSnapshot = await getDocFromServer(metaRef);
    const revision = revisionOf(metaSnapshot);

    const terrainSnapshot = await getDocsFromServer(
      terrainRef
    );

    checkActive();

    const tiles = terrainSnapshot.docs.map(
      decodeOnlineTerrainTile
    );

    if (
      tiles.length === 0 ||
      tiles.some(tile => tile.schemaVersion !== 2)
    ) {
      throw new Error(
        'Комната должна быть переведена на многослойный формат.'
      );
    }

    // Проверяем текущие слои, порядок и суммы высот.
    buildTerrainLayers(tiles);

    const highestLayer = tiles.reduce(
      (highest, tile) => Math.max(highest, tile.layer),
      -1
    );

    if (
      highestLayer >= Number.MAX_SAFE_INTEGER ||
      revision >= Number.MAX_SAFE_INTEGER
    ) {
      throw new Error(
        'Исчерпан диапазон порядка слоёв или версий.'
      );
    }

    const layer = highestLayer + 1;

    const candidate = {
      id: tileRef.id,
      type: data.type,
      x: data.x,
      y: data.y,
      height: data.height,
      layer,
      cells: shapeCells(
        data.shape,
        data.width,
        data.depth
      )
    };

    // Перекрытия разрешены.
    // Проверяем границы и точность суммарных высот.
    buildTerrainLayers([...tiles, candidate]);

        // Проверяем все клетки нового тайла, а не его габарит:
    // пустая часть угловой формы не должна блокировать добавление.
    const candidateCellRefs = candidate.cells.map(offset => {
      const x = candidate.x + offset.x;
      const y = candidate.y + offset.y;

      return {
        x,
        y,
        reference: doc(
          db,
          'rooms',
          roomId,
          'tableCells',
          `${x}_${y}`
        )
      };
    });

    try {
      await runTransaction(db, async transaction => {
        checkActive();

        const roomSnapshot = await transaction.get(roomRef);
        const currentMeta = await transaction.get(metaRef);
        const existingTile = await transaction.get(tileRef);

        if (!roomSnapshot.exists()) {
          throw new Error('Комната удалена.');
        }

        const room = roomSnapshot.data();

        if (
          room.hostId !== userId ||
          room.guestId === userId
        ) {
          throw new Error(
            'Добавлять тайлы может только создатель комнаты.'
          );
        }

        if (revisionOf(currentMeta) !== revision) {
          const error = new Error(
            'Ландшафт изменился в другой вкладке.'
          );

          error.code = 'terrain/revision-conflict';
          throw error;
        }

                if (existingTile.exists()) {
          throw new Error(
            'Тайл уже существует. Проверьте поле перед повтором.'
          );
        }

        // Все чтения — до первой записи.
        //
        // Читаем и пустые документы клеток:
        // если другая транзакция разместит в них модель,
        // Firestore повторит нашу транзакцию.
        for (const cell of candidateCellRefs) {
          const occupiedSnapshot = await transaction.get(
            cell.reference
          );

          if (occupiedSnapshot.exists()) {
            const coordinate =
              `${LETTERS[cell.x]}${cell.y + 1}`;

            throw new Error(
              `Тайл накрывает клетку ${coordinate} с моделью. ` +
              'Сначала переместите модель. ' +
              'Добавление отменено целиком.'
            );
          }
        }

        checkActive();

        transaction.set(tileRef, {
          ...data,
          schemaVersion: 2,
          layer,
          updatedAt: serverTimestamp()
        });

        transaction.set(metaRef, {
          revision: revision + 1,
          updatedAt: serverTimestamp()
        });
      });

      return;
    } catch (error) {
      if (
        error.code === 'terrain/revision-conflict' &&
        attempt < 2
      ) {
        continue;
      }

      throw error;
    }
  }
}

export function createOnlineLayeredTerrainEditor({
  roomId,
  container,
  getRoom,
  getState
}) {
  const userId = auth.currentUser?.uid;

  if (!userId) {
    throw new Error('Требуется авторизация.');
  }

  let destroyed = false;
  let busy = false;

  const form = node('form');

  form.style.display = 'grid';
  form.style.gap = '8px';
  form.style.marginTop = '12px';

  form.append(node('h3', 'Добавить верхний тайл'));

  function field(title, control) {
    const label = node('label');

    label.style.display = 'grid';
    label.style.gap = '4px';

    label.append(node('span', title), control);
    form.append(label);

    return control;
  }

  const type = node('select');

  for (const [key, info] of Object.entries(TERRAIN_TYPES)) {
    type.append(new Option(info.name, key));
  }

  field('Тип местности', type);

  const shape = node('select');

  shape.append(
    new Option('Прямоугольник', 'rectangle'),
    new Option('Угол', 'corner'),
    new Option('Линия', 'line')
  );

  field('Форма', shape);

  function numberField(title, value, min, max) {
    const input = node('input');

    input.type = 'number';
    input.step = '1';
    input.value = String(value);

    if (min !== undefined) input.min = String(min);
    if (max !== undefined) input.max = String(max);

    return field(title, input);
  }

  const width = numberField('Ширина', 2, 1, 14);
  const depth = numberField('Глубина', 2, 1, 14);
  const height = numberField('Собственная высота', 1);

  const position = node('input');

  position.type = 'text';
  position.value = 'A1';
  position.maxLength = 3;
  position.autocomplete = 'off';
  position.spellcheck = false;

  field('Верхний левый угол габарита, например D6', position);

  const submit = node(
    'button',
    'Добавить сверху',
    'builder-action-btn'
  );

  submit.type = 'submit';

  const status = node('p', '', 'vt-muted');

  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  const summary = node('p', '', 'vt-muted');

  form.append(
    node(
      'p',
      'Частичное наложение тайлов разрешено. Собственная высота ' +
      'прибавляется к сумме нижних тайлов в каждой клетке. ' +
      'Нельзя накрывать клетки с моделями: ' +
      'сначала переместите их. ' +
      'Для линии глубина равна 1. Новый тайл не повёрнут. ' +
      'Этот инструмент не переносит модели и не меняет их опоры.',
      'vt-muted'
    ),
    submit,
    status,
    summary
  );

  container.append(form);

  function isOwner() {
    const room = getRoom();

    return Boolean(
      !destroyed &&
      room &&
      auth.currentUser?.uid === userId &&
      auth.currentUser?.emailVerified &&
      room.hostId === userId &&
      room.guestId !== userId
    );
  }

  function refresh() {
    if (destroyed) return;

    const state = getState();
    const owner = isOwner();

    const available =
      owner &&
      state.ready &&
      state.format === 'layers-v2' &&
      !busy;

    form.hidden = !owner;

    for (const control of [
      type, shape, width, depth, height, position, submit
    ]) {
      control.disabled = !available;
    }

    if (shape.value === 'line') {
      depth.disabled = true;
    }

    submit.textContent = busy
      ? 'Сохраняем…'
      : 'Добавить сверху';

    if (state.ready && state.format === 'layers-v2') {
      const blocked = [...state.blockers.values()]
        .filter(items => items.size > 0)
        .length;

      summary.textContent =
        `Тайлов: ${state.tiles.length}. ` +
        `Заблокировано верхними тайлами: ${blocked}.`;
    } else {
      summary.textContent =
        'Ожидаем подтверждённый многослойный ландшафт.';
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (busy || !isOwner()) return;

    const state = getState();

    if (!state.ready || state.format !== 'layers-v2') {
      status.textContent =
        'Дождитесь подтверждения многослойного ландшафта.';
      return;
    }

    try {
      if (
        !Object.hasOwn(TERRAIN_TYPES, type.value) ||
        !['rectangle', 'corner', 'line'].includes(shape.value)
      ) {
        throw new Error('Неизвестный тип или форма.');
      }

      const point = positionOf(position);

      const data = {
        type: type.value,
        shape: shape.value,
        width: integer(width, 'Ширина', 1, 14),
        depth: shape.value === 'line'
          ? 1
          : integer(depth, 'Глубина', 1, 14),
        rotation: 0,
        x: point.x,
        y: point.y,
        height: integer(
          height,
          'Собственная высота',
          Number.MIN_SAFE_INTEGER,
          Number.MAX_SAFE_INTEGER
        )
      };

      busy = true;
      status.textContent = 'Проверяем и сохраняем верхний тайл…';
      refresh();

      await addLayeredTile({
        roomId,
        userId,
        data,
        isActive: isOwner
      });

      if (!destroyed) {
        status.textContent =
          'Тайл сохранён. Поле обновляется через общую подписку.';
      }
    } catch (error) {
      if (!destroyed) {
        console.error('Layered terrain addition:', error);

        status.textContent =
          'Добавление не подтверждено: ' +
          String(error.message || error.code || error) +
          ' Проверьте поле перед повтором.';
      }
    } finally {
      if (!destroyed) {
        busy = false;
        refresh();
      }
    }
  }

  function handleShapeChange() {
    refresh();
  }

  form.addEventListener('submit', handleSubmit);
  shape.addEventListener('change', handleShapeChange);

  refresh();

  return {
    refresh,

    destroy() {
      if (destroyed) return;

      destroyed = true;

      form.removeEventListener('submit', handleSubmit);
      shape.removeEventListener('change', handleShapeChange);

      form.remove();
    }
  };
}