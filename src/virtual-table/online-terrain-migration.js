// src/virtual-table/online-terrain-migration.js
//
// Явный переход существующего непустого ландшафта
// на многослойный формат.
//
// Только создатель комнаты с подтверждённой почтой.
// Не изменяет позиции моделей и локальные сохранения.
//
// Старые тайлы не пересекаются, поэтому назначение
// порядка слоёв не меняет существующую поверхность.
//
// Существующее height становится собственной высотой.
// Значения не изменяются, включая ноль и отрицательные.
//
// Штатные изменения согласуются через revision.
// Это не защита от намеренно изменённого клиента владельца.

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
  validateTerrain
} from './terrain.js';

import {
  decodeOnlineTerrainTile
} from './online-terrain.js';

function revisionOf(snapshot) {
  if (!snapshot.exists()) return 0;

  const revision = snapshot.data().revision;

  if (
    !Number.isSafeInteger(revision) ||
    revision < 1
  ) {
    throw new Error(
      'Некорректная версия ландшафта.'
    );
  }

  return revision;
}

function checkAccount(userId, isActive) {
  if (
    !isActive() ||
    auth.currentUser?.uid !== userId ||
    !auth.currentUser?.emailVerified
  ) {
    throw new Error(
      'Аккаунт или подключение изменились. ' +
      'Переход остановлен.'
    );
  }
}

export async function migrateOnlineTerrainToLayers({
  roomId,
  isActive = () => true
}) {
  const userId = auth.currentUser?.uid;

  if (!userId || !auth.currentUser?.emailVerified) {
    throw new Error(
      'Войдите в аккаунт с подтверждённой почтой.'
    );
  }

  checkAccount(userId, isActive);

  const roomRef = doc(db, 'rooms', roomId);

  const metaRef = doc(
    db,
    'rooms',
    roomId,
    'tableTerrainMeta',
    'layout'
  );

  const terrainRef = collection(
    db,
    'rooms',
    roomId,
    'tableTerrain'
  );

  // Версия читается перед коллекцией.
  // В транзакции проверим, что штатный редактор
  // не изменил ландшафт во время подготовки.
  const initialMeta = await getDocFromServer(metaRef);
  const revision = revisionOf(initialMeta);

  const initialTiles = await getDocsFromServer(terrainRef);

  checkAccount(userId, isActive);

  if (initialTiles.empty) {
    throw new Error(
      'В этом пакете переход пустой комнаты ещё не подключён. ' +
      'Сначала добавьте хотя бы один тайл старым редактором.'
    );
  }

  // На поле без пересечений может быть не более 196
  // непустых тайлов. Проверяем и ограничиваем
  // объём одной операции.
  if (initialTiles.size > 196) {
    throw new Error(
      'Слишком много тайлов для старого формата. ' +
      'Переход остановлен.'
    );
  }

  const initialDecoded = initialTiles.docs.map(
    decodeOnlineTerrainTile
  );

  if (
    initialDecoded.some(tile => tile.schemaVersion === 2)
  ) {
    throw new Error(
      'В комнате уже есть многослойные тайлы. ' +
      'Повторный переход не выполняется.'
    );
  }

  if (!validateTerrain(initialDecoded)) {
    throw new Error(
      'Старый ландшафт содержит пересечения ' +
      'или некорректные данные.'
    );
  }

  if (revision >= Number.MAX_SAFE_INTEGER) {
    throw new Error(
      'Исчерпан диапазон версий ландшафта.'
    );
  }

  // Начальные тайлы не пересекаются, поэтому их порядок
  // не влияет на текущую поверхность.
  // Сортируем по ID, а не по updatedAt.
  const references = initialTiles.docs
    .map(snapshot => snapshot.ref)
    .sort((first, second) =>
      first.id < second.id
        ? -1
        : first.id > second.id
          ? 1
          : 0
    );

  await runTransaction(db, async transaction => {
    checkAccount(userId, isActive);

    // Все чтения выполняются до записей.
    const roomSnapshot = await transaction.get(roomRef);
    const metaSnapshot = await transaction.get(metaRef);

    if (!roomSnapshot.exists()) {
      throw new Error('Комната удалена.');
    }

    const room = roomSnapshot.data();

    if (
      room.hostId !== userId ||
      room.guestId === userId
    ) {
      throw new Error(
        'Переводить ландшафт может только создатель комнаты.'
      );
    }

    if (revisionOf(metaSnapshot) !== revision) {
      throw new Error(
        'Ландшафт изменился во время подготовки. ' +
        'Проверьте поле и запустите переход ещё раз.'
      );
    }

    const snapshots = [];

    for (const reference of references) {
      const snapshot = await transaction.get(reference);

      if (!snapshot.exists()) {
        throw new Error(
          'Один из тайлов уже удалён. ' +
          'Проверьте поле и повторите переход.'
        );
      }

      snapshots.push(snapshot);
    }

    const decoded = snapshots.map(
      decodeOnlineTerrainTile
    );

    if (
      decoded.some(tile => tile.schemaVersion === 2) ||
      !validateTerrain(decoded)
    ) {
      throw new Error(
        'Формат или расположение тайлов изменились. ' +
        'Переход остановлен.'
      );
    }

    checkAccount(userId, isActive);

    for (let index = 0; index < snapshots.length; index += 1) {
      transaction.update(snapshots[index].ref, {
        schemaVersion: 2,
        layer: index,
        updatedAt: serverTimestamp()
      });
    }

    transaction.set(metaRef, {
      revision: revision + 1,
      updatedAt: serverTimestamp()
    });
  });

  return {
    count: references.length
  };
}