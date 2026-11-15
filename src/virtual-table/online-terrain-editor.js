// src/virtual-table/online-terrain-editor.js
//
// Первый этап сетевого редактора: добавление тайлов.
//
// Только создатель комнаты.
// Работает до и после фиксации составов.
// Не читает локальную партию и не перемещает модели.
//
// Штатные записи сериализуются через tableTerrainMeta/layout.
// Пересечения проверяются клиентом по серверному снимку.
//
// Важно: Rules пока не проверяют пересечения между документами.
// Намеренно изменённый клиент владельца может обойти эту проверку.

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
  TERRAIN_TYPES,
  validateTerrain
} from './terrain.js';

import {
  decodeOnlineTerrainTile
} from './online-terrain.js';

const LETTERS = 'ABCDEFGHIJKLMN';

function node(tag, text = '', className = '') {
  const element = document.createElement(tag);
  element.textContent = text;

  if (className) {
    element.className = className;
  }

  return element;
}

function readRevision(snapshot) {
  if (!snapshot.exists()) return 0;

  const revision = snapshot.data().revision;

  if (
    !Number.isSafeInteger(revision) ||
    revision < 1
  ) {
    throw new Error(
      'Некорректная версия общего ландшафта.'
    );
  }

  return revision;
}

function readInteger(input, title, min, max) {
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

function readPosition(input) {
  const value = input.value.trim().toUpperCase();
  const match = /^([A-N])(1[0-4]|[1-9])$/.exec(value);

  if (!match) {
    throw new Error(
      'Начальная клетка должна быть от A1 до N14. ' +
      'Используйте латинские буквы.'
    );
  }

  return {
    x: LETTERS.indexOf(match[1]),
    y: Number(match[2]) - 1
  };
}

function createCells(shape, width, depth) {
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

async function addTile({
  roomId,
  userId,
  data,
  isActive
}) {
  const roomRef = doc(db, 'rooms', roomId);

  const terrainRef = collection(
    db,
    'rooms',
    roomId,
    'tableTerrain'
  );

  const metaRef = doc(
    db,
    'rooms',
    roomId,
    'tableTerrainMeta',
    'layout'
  );

  // ID создаётся один раз для этой операции.
  const tileRef = doc(terrainRef);

  // Повторяем только при конфликте версии.
  // Сетевые ошибки автоматически новой записью не повторяем.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (!isActive()) {
      throw new Error('Подключение редактора изменилось.');
    }

    // Сначала версия, затем список тайлов.
    // Транзакция ниже проверит, что версия не изменилась.
    const beforeMeta = await getDocFromServer(metaRef);
    const revision = readRevision(beforeMeta);

    const snapshot = await getDocsFromServer(terrainRef);

    if (!isActive()) {
      throw new Error('Подключение редактора изменилось.');
    }

    const tiles = snapshot.docs.map(
      decodeOnlineTerrainTile
    );

    if (!validateTerrain(tiles)) {
      throw new Error(
        'Существующий ландшафт некорректен. ' +
        'Добавление остановлено.'
      );
    }

    const candidate = {
      id: tileRef.id,
      type: data.type,
      x: data.x,
      y: data.y,
      height: data.height,
      cells: createCells(
        data.shape,
        data.width,
        data.depth
      )
    };

    if (!validateTerrain([...tiles, candidate])) {
      throw new Error(
        'Тайл выходит за границы поля или ' +
        'пересекается с существующим тайлом.'
      );
    }

    if (revision >= Number.MAX_SAFE_INTEGER) {
      throw new Error(
        'Исчерпан диапазон версий ландшафта.'
      );
    }

    try {
      await runTransaction(db, async transaction => {
        const roomSnapshot = await transaction.get(roomRef);
        const metaSnapshot = await transaction.get(metaRef);
        const tileSnapshot = await transaction.get(tileRef);

        if (
          !isActive() ||
          auth.currentUser?.uid !== userId ||
          !auth.currentUser?.emailVerified
        ) {
          throw new Error(
            'Аккаунт или подключение редактора изменились.'
          );
        }

        if (!roomSnapshot.exists()) {
          throw new Error('Комната удалена.');
        }

        const room = roomSnapshot.data();

        if (
          room.hostId !== userId ||
          room.guestId === userId
        ) {
          throw new Error(
            'Ландшафт изменяет только создатель комнаты.'
          );
        }

        if (readRevision(metaSnapshot) !== revision) {
          const error = new Error(
            'Ландшафт изменён в другой вкладке.'
          );

          error.code = 'terrain/revision-conflict';
          throw error;
        }

        if (tileSnapshot.exists()) {
          throw new Error(
            'Тайл с этим идентификатором уже существует. ' +
            'Проверьте поле перед повтором.'
          );
        }

        transaction.set(tileRef, {
          ...data,
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

// Изменение высоты или удаление одного существующего тайла.
// Тайл и версия ландшафта меняются атомарно.
//
// Высота и удаление не создают новых пересечений,
// поэтому перечитывать всю коллекцию здесь не требуется.
async function changeTile({
  roomId,
  userId,
  tileId,
  action,
  height,
  isActive
}) {
  if (!['height', 'delete'].includes(action)) {
    throw new Error('Неизвестное действие с тайлом.');
  }

  if (
    action === 'height' &&
    !Number.isSafeInteger(height)
  ) {
    throw new Error('Высота должна быть безопасным целым числом.');
  }

  const roomRef = doc(db, 'rooms', roomId);

  const tileRef = doc(
    db,
    'rooms',
    roomId,
    'tableTerrain',
    tileId
  );

  const metaRef = doc(
    db,
    'rooms',
    roomId,
    'tableTerrainMeta',
    'layout'
  );

  await runTransaction(db, async transaction => {
    const roomSnapshot = await transaction.get(roomRef);
    const metaSnapshot = await transaction.get(metaRef);
    const tileSnapshot = await transaction.get(tileRef);

    if (
      !isActive() ||
      auth.currentUser?.uid !== userId ||
      !auth.currentUser?.emailVerified
    ) {
      throw new Error(
        'Аккаунт или подключение редактора изменились.'
      );
    }

    if (!roomSnapshot.exists()) {
      throw new Error('Комната удалена.');
    }

    const room = roomSnapshot.data();

    if (
      room.hostId !== userId ||
      room.guestId === userId
    ) {
      throw new Error(
        'Ландшафт изменяет только создатель комнаты.'
      );
    }

    if (!tileSnapshot.exists()) {
      throw new Error(
        'Тайл уже удалён. Выберите другой тайл.'
      );
    }

    // Не редактируем документ неизвестного формата.
    const tile = decodeOnlineTerrainTile(tileSnapshot);

    if (!validateTerrain([tile])) {
      throw new Error(
        'Тайл содержит некорректные данные.'
      );
    }

    const revision = readRevision(metaSnapshot);

    if (revision >= Number.MAX_SAFE_INTEGER) {
      throw new Error(
        'Исчерпан диапазон версий ландшафта.'
      );
    }

    if (action === 'height') {
      transaction.update(tileRef, {
        height,
        updatedAt: serverTimestamp()
      });
    } else {
      transaction.delete(tileRef);
    }

    transaction.set(metaRef, {
      revision: revision + 1,
      updatedAt: serverTimestamp()
    });
  });
}

export function createOnlineTerrainEditor({
  roomId,
  container,
  getRoom,
  getState
}) {
  const userId = auth.currentUser?.uid;

  if (!userId) {
    throw new Error(
      'Для редактора требуется авторизация.'
    );
  }

  let destroyed = false;
  let busy = false;

  const form = node(
    'form',
    '',
    'vt-online-terrain-form'
  );

  form.style.display = 'grid';
  form.style.gap = '8px';
  form.style.marginTop = '12px';

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

  field('Тип', type);

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
  const height = numberField('Высота', 0);

  const position = node('input');
  position.type = 'text';
  position.value = 'A1';
  position.maxLength = 3;
  position.autocomplete = 'off';
  position.spellcheck = false;

  field('Верхний левый угол габарита, например D6', position);

  const submit = node(
    'button',
    'Добавить тайл',
    'builder-action-btn'
  );

  submit.type = 'submit';

  const status = node('p', '', 'vt-muted');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  form.append(
    node(
      'p',
      'Размеры задаются в клетках. Для линии глубина равна 1. ' +
      'Новый тайл добавляется без поворота. ' +
      'Модели остаются на месте.',
      'vt-muted'
    ),
    submit,
    status
  );

  container.append(form);

    const existing = node(
    'section',
    '',
    'vt-online-terrain-existing'
  );

  existing.style.display = 'grid';
  existing.style.gap = '8px';
  existing.style.marginTop = '18px';
  existing.style.paddingTop = '12px';
  existing.style.borderTop = '1px solid #403747';

  existing.append(
    node('h3', 'Существующие тайлы')
  );

  const tileSelect = node('select');

  const tileLabel = node('label');
  tileLabel.style.display = 'grid';
  tileLabel.style.gap = '4px';
  tileLabel.append(
    node('span', 'Тайл'),
    tileSelect
  );

  const tileInfo = node('p', '', 'vt-muted');

  const editHeight = node('input');
  editHeight.type = 'number';
  editHeight.step = '1';
  editHeight.value = '0';

  const heightLabel = node('label');
  heightLabel.style.display = 'grid';
  heightLabel.style.gap = '4px';
  heightLabel.append(
    node('span', 'Новая высота'),
    editHeight
  );

  const setHeightButton = node(
    'button',
    'Сохранить высоту',
    'builder-action-btn'
  );

  const deleteButton = node(
    'button',
    'Удалить тайл',
    'builder-action-btn'
  );

  setHeightButton.type = 'button';
  deleteButton.type = 'button';

  const existingStatus = node('p', '', 'vt-muted');
  existingStatus.setAttribute('role', 'status');
  existingStatus.setAttribute('aria-live', 'polite');

  existing.append(
    tileLabel,
    tileInfo,
    heightLabel,
    setHeightButton,
    deleteButton,
    node(
      'p',
      'Изменение высоты и удаление тайла не перемещают модели. ' +
      'Если высота была изменена в другой вкладке, ' +
      'сохранение задаст выбранное вами новое значение.',
      'vt-muted'
    ),
    existingStatus
  );

  container.append(existing);

  function selectedExistingTile() {
    return getState().tiles.find(
      tile => tile.id === tileSelect.value
    ) || null;
  }

  function describeSelectedTile() {
    const tile = selectedExistingTile();

    tileInfo.textContent = tile
      ? `${TERRAIN_TYPES[tile.type].name} · ` +
        `начало ${LETTERS[tile.x]}${tile.y + 1} · ` +
        `клеток: ${tile.cells.length} · ` +
        `текущая высота: ${tile.height}`
      : 'Выберите тайл.';
  }

  function refreshExisting() {
    const state = getState();
    const owner = isOwner();
    const previous = tileSelect.value;

    // Во время ожидания сервера сохраняем список и ввод,
    // но запрещаем действия с неподтверждёнными данными.
    if (state.ready) {
      const options = [
        new Option('Выберите тайл', '')
      ];

      for (const tile of state.tiles) {
        options.push(
          new Option(
            `${TERRAIN_TYPES[tile.type].name} · ` +
            `${LETTERS[tile.x]}${tile.y + 1} · ` +
            `В: ${tile.height}`,
            tile.id
          )
        );
      }

      tileSelect.replaceChildren(...options);

      tileSelect.value = state.tiles.some(
        tile => tile.id === previous
      )
        ? previous
        : '';

      describeSelectedTile();
    }

    existing.hidden = !owner;

    const available = owner && state.ready && !busy;
    const selected = Boolean(selectedExistingTile());

    tileSelect.disabled = !available;
    editHeight.disabled = !available || !selected;
    setHeightButton.disabled = !available || !selected;
    deleteButton.disabled = !available || !selected;
  }

  function handleTileSelection() {
    const tile = selectedExistingTile();

    if (tile) {
      editHeight.value = String(tile.height);
    }

    existingStatus.textContent = '';
    refresh();
  }

  async function handleExistingAction(action) {
    if (busy || !isOwner()) return;

    if (!getState().ready) {
      existingStatus.textContent =
        'Дождитесь подтверждения ландшафта сервером.';
      return;
    }

    const tile = selectedExistingTile();

    if (!tile) {
      existingStatus.textContent = 'Сначала выберите тайл.';
      return;
    }

    let nextHeight;

    try {
      if (action === 'height') {
        nextHeight = readInteger(
          editHeight,
          'Высота',
          Number.MIN_SAFE_INTEGER,
          Number.MAX_SAFE_INTEGER
        );
      }

      if (
        action === 'delete' &&
        !window.confirm(
          `Удалить тайл «${TERRAIN_TYPES[tile.type].name}» ` +
          `из ${LETTERS[tile.x]}${tile.y + 1}? ` +
          'Модели останутся на своих клетках.'
        )
      ) {
        return;
      }

      busy = true;

      existingStatus.textContent = action === 'height'
        ? 'Сохраняем высоту…'
        : 'Удаляем тайл…';

      refresh();

      await changeTile({
        roomId,
        userId,
        tileId: tile.id,
        action,
        height: nextHeight,
        isActive: isOwner
      });

      if (!destroyed) {
        existingStatus.textContent = action === 'height'
          ? 'Высота сохранена. Ожидаем обновление общей подписки.'
          : 'Тайл удалён. Модели остались на месте.';
      }
    } catch (error) {
      if (!destroyed) {
        console.error('Online terrain change:', error);

        existingStatus.textContent =
          'Действие не подтверждено: ' +
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

  function handleSetHeight() {
    void handleExistingAction('height');
  }

  function handleDeleteTile() {
    void handleExistingAction('delete');
  }

  tileSelect.addEventListener(
    'change',
    handleTileSelection
  );

  setHeightButton.addEventListener(
    'click',
    handleSetHeight
  );

  deleteButton.addEventListener(
    'click',
    handleDeleteTile
  );

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

    const owner = isOwner();
    const ready = getState().ready;

    form.hidden = !owner;

    for (const control of [
      type,
      shape,
      width,
      depth,
      height,
      position,
      submit
    ]) {
      control.disabled = busy || !owner || !ready;
    }

    if (shape.value === 'line') {
      depth.disabled = true;
    }

    submit.textContent = busy
      ? 'Сохраняем…'
      : 'Добавить тайл';

          refreshExisting();
  }

  function handleShape() {
    refresh();
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (busy || !isOwner()) return;

    if (!getState().ready) {
      status.textContent =
        'Дождитесь подтверждения ландшафта сервером.';
      return;
    }

    try {
      const selectedType = type.value;
      const selectedShape = shape.value;

      if (
        !Object.hasOwn(TERRAIN_TYPES, selectedType) ||
        !['rectangle', 'corner', 'line'].includes(selectedShape)
      ) {
        throw new Error('Неизвестный тип или форма тайла.');
      }

      const point = readPosition(position);

      const data = {
        type: selectedType,
        shape: selectedShape,
        width: readInteger(width, 'Ширина', 1, 14),
        depth: selectedShape === 'line'
          ? 1
          : readInteger(depth, 'Глубина', 1, 14),
        rotation: 0,
        x: point.x,
        y: point.y,
        height: readInteger(
          height,
          'Высота',
          Number.MIN_SAFE_INTEGER,
          Number.MAX_SAFE_INTEGER
        )
      };

      busy = true;
      status.textContent = 'Проверяем и сохраняем тайл…';
      refresh();

      await addTile({
        roomId,
        userId,
        data,
        isActive: isOwner
      });

      if (!destroyed) {
        status.textContent =
          'Тайл сохранён. Его отображение обновляется ' +
          'через общую подписку комнаты.';
      }
    } catch (error) {
      if (!destroyed) {
        console.error('Online terrain addition:', error);

        status.textContent =
          'Тайл не подтверждён: ' +
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

  shape.addEventListener('change', handleShape);
  form.addEventListener('submit', handleSubmit);

  refresh();

  return {
    refresh,

       destroy() {
      if (destroyed) return;

      destroyed = true;

      shape.removeEventListener('change', handleShape);
      form.removeEventListener('submit', handleSubmit);

      tileSelect.removeEventListener(
        'change',
        handleTileSelection
      );

      setHeightButton.removeEventListener(
        'click',
        handleSetHeight
      );

      deleteButton.removeEventListener(
        'click',
        handleDeleteTile
      );

      form.remove();
      existing.remove();
    }
  };
}