// src/virtual-table/online-positions.js
//
// Адресные позиции моделей комнаты.
// Не использует браузерные хранилища.
//
// При первом реальном изменении позиции:
// — проверяет обоих участников и оба ростера;
// — фиксирует состав комнаты;
// — записывает позицию и занятость клетки
//   той же транзакцией.
//
// Фиксация необратима с клиента.
// Для другого состава создаётся новая комната.
//
// Готовность позиций:
// — кеш и неподтверждённые записи не разрешают движение;
// — отображение получает только подтверждённый серверный снимок;
// — при ошибке последние подтверждённые позиции сохраняются;
// — две модели на одной клетке блокируют обновление и движение.

import { auth, db } from '../core/firebase.js';

import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

import {
  validOnlinePosition,
  validOnlineUnitRecord
} from './online-unit-record.js';

export function onlineUnitId(side, index) {
  if (
    !['a', 'b'].includes(side) ||
    !Number.isInteger(index) ||
    index < 0
  ) {
    throw new Error('Некорректный идентификатор модели.');
  }

  return `${side}_${index}`;
}

function validPosition(position) {
  return validOnlinePosition(position);
}

function cellId(position) {
  return `${position.x}_${position.y}`;
}

function hasRoster(roster) {
  return Boolean(
    roster &&
    typeof roster === 'object' &&
    !Array.isArray(roster) &&
    Array.isArray(roster.units) &&
    roster.units.length > 0
  );
}

export function connectOnlinePositions({
  roomId,
  userId,
  onChange,
  onError,
  onPending = () => {}
}) {
  let destroyed = false;
  let busy = false;
  let serverReady = false;
  let records = new Map();

  const unsubscribe = onSnapshot(
    collection(db, 'rooms', roomId, 'tableUnits'),
    { includeMetadataChanges: true },

    snapshot => {
      if (destroyed) return;

      if (
        snapshot.metadata.fromCache ||
        snapshot.metadata.hasPendingWrites
      ) {
        serverReady = false;

        // Не заменяем подтверждённые позиции
        // кешированными или неподтверждёнными данными.
        onPending({
          fromCache: snapshot.metadata.fromCache,
          hasPendingWrites: snapshot.metadata.hasPendingWrites
        });

        return;
      }

      const next = new Map();
      const occupied = new Set();

      for (const record of snapshot.docs) {
        const data = record.data();

        if (!validOnlineUnitRecord(record.id, data)) {
          serverReady = false;

          onError(
            new Error(
              'Получена неподдерживаемая запись позиции. ' +
              'Перемещение заблокировано. ' +
              'Последние подтверждённые позиции сохранены на экране.'
            )
          );

          return;
        }

        if (data.position !== null) {
          const key = cellId(data.position);

          if (occupied.has(key)) {
            serverReady = false;

            onError(
              new Error(
                'В серверных данных две модели занимают одну клетку. ' +
                'Перемещение заблокировано; автоматическое ' +
                'исправление не выполняется.'
              )
            );

            return;
          }

          occupied.add(key);
        }

        next.set(record.id, data);
      }

      records = next;
      serverReady = true;

      onChange(new Map(records));
    },

    error => {
      if (destroyed) return;

      serverReady = false;
      onError(error);
    }
  );

  return {
    async move(side, index, position) {
      if (destroyed) {
        throw new Error('Подключение позиций закрыто.');
      }

      if (busy) {
        throw new Error(
          'Дождитесь завершения предыдущего перемещения.'
        );
      }

      if (!serverReady) {
        throw new Error(
          'Актуальные позиции ещё не подтверждены сервером. ' +
          'Дождитесь подключения и повторите действие.'
        );
      }

      if (
        auth.currentUser?.uid !== userId ||
        !auth.currentUser?.emailVerified
      ) {
        throw new Error(
          'Аккаунт изменился или почта не подтверждена. ' +
          'Обновите страницу.'
        );
      }

      if (!validPosition(position)) {
        throw new Error('Некорректная клетка назначения.');
      }

      const id = onlineUnitId(side, index);

      // Копируем цель до асинхронной работы.
      const destinationPosition = position
        ? { x: position.x, y: position.y }
        : null;

      const roomReference = doc(db, 'rooms', roomId);

      const unitReference = doc(
        db,
        'rooms',
        roomId,
        'tableUnits',
        id
      );

      busy = true;

      try {
        await runTransaction(db, async transaction => {
          if (
            destroyed ||
            auth.currentUser?.uid !== userId ||
            !auth.currentUser?.emailVerified
          ) {
            throw new Error(
              'Подключение или аккаунт изменились.'
            );
          }

          // Все чтения выполняются до первой записи.
          const roomSnapshot = await transaction.get(
            roomReference
          );

          if (!roomSnapshot.exists()) {
            throw new Error('Комната удалена.');
          }

          const room = roomSnapshot.data();

          const host = room.hostId === userId;
          const guest = room.guestId === userId;

          if (
            host === guest ||
            (side === 'a' ? !host : !guest)
          ) {
            throw new Error(
              'Можно перемещать только свои модели.'
            );
          }

          if (
            typeof room.hostId !== 'string' ||
            typeof room.guestId !== 'string' ||
            room.hostId === room.guestId ||
            !hasRoster(room.hostRoster) ||
            !hasRoster(room.guestRoster)
          ) {
            throw new Error(
              'Для начала расстановки нужны два участника ' +
              'и два выбранных непустых ростера.'
            );
          }

          if (
            Object.hasOwn(room, 'tableLocked') &&
            typeof room.tableLocked !== 'boolean'
          ) {
            throw new Error(
              'Комната содержит неподдерживаемое состояние фиксации.'
            );
          }

          const roster = side === 'a'
            ? room.hostRoster
            : room.guestRoster;

          if (!roster.units[index]) {
            throw new Error(
              'Модель отсутствует в текущем ростере комнаты.'
            );
          }

          const unitSnapshot = await transaction.get(
            unitReference
          );

          if (unitSnapshot.exists()) {
            const unit = unitSnapshot.data();

            if (
              !validOnlineUnitRecord(id, unit) ||
              unit.side !== side ||
              unit.unitIndex !== index
            ) {
              throw new Error(
                'Сохранённая запись модели имеет ' +
                'неподдерживаемый формат.'
              );
            }

            // Пока запись опоры ещё не подключена к move(),
            // не допускаем её случайной потери при полной
            // перезаписи документа позиции.
            if (Object.hasOwn(unit, 'supportTileId')) {
              throw new Error(
                'У модели уже записана сетевая опора. ' +
                'Эта версия перемещения ещё не умеет ' +
                'обновлять её безопасно. ' +
                'Нужен следующий пакет обновления.'
              );
            }
          }

          const previous = unitSnapshot.exists()
            ? unitSnapshot.data().position
            : null;

          if (!validPosition(previous)) {
            throw new Error(
              'Сохранённая позиция имеет неверный формат.'
            );
          }

          const samePosition =
            (
              previous === null &&
              destinationPosition === null
            ) ||
            (
              previous !== null &&
              destinationPosition !== null &&
              previous.x === destinationPosition.x &&
              previous.y === destinationPosition.y
            );

          // Нажатие без реального изменения
          // не фиксирует состав комнаты.
          if (samePosition) return;

          const destinationReference = destinationPosition
            ? doc(
                db,
                'rooms',
                roomId,
                'tableCells',
                cellId(destinationPosition)
              )
            : null;

          if (destinationReference) {
            const destination = await transaction.get(
              destinationReference
            );

            if (destination.exists()) {
              throw new Error(
                'Клетка уже занята другой моделью.'
              );
            }
          }

          // Проверяем старую клетку:
          // не удаляем запись, принадлежащую другой модели.
          const previousReference = previous
            ? doc(
                db,
                'rooms',
                roomId,
                'tableCells',
                cellId(previous)
              )
            : null;

          if (previousReference) {
            const previousCell = await transaction.get(
              previousReference
            );

            if (
              !previousCell.exists() ||
              previousCell.data().unitId !== id
            ) {
              throw new Error(
                'Позиция модели и занятость прежней клетки ' +
                'не согласованы. Перемещение остановлено.'
              );
            }
          }

          if (
            destroyed ||
            auth.currentUser?.uid !== userId ||
            !auth.currentUser?.emailVerified
          ) {
            throw new Error(
              'Подключение или аккаунт изменились.'
            );
          }

          // Ниже только записи.
          // Фиксация и перемещение применяются атомарно.
          if (room.tableLocked !== true) {
            transaction.update(roomReference, {
              tableLocked: true,
              updatedAt: serverTimestamp()
            });
          }

          if (previousReference) {
            transaction.delete(previousReference);
          }

          if (destinationReference) {
            transaction.set(destinationReference, {
              unitId: id,
              x: destinationPosition.x,
              y: destinationPosition.y
            });
          }

          transaction.set(unitReference, {
            side,
            unitIndex: index,
            position: destinationPosition,
            updatedAt: serverTimestamp()
          });
        });
      } finally {
        busy = false;
      }
    },

    destroy() {
      if (destroyed) return;

      destroyed = true;
      serverReady = false;

      unsubscribe();
      records.clear();
    }
  };
}