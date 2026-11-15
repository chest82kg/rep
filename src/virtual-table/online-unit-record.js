// src/virtual-table/online-unit-record.js
//
// Общая проверка сетевой записи позиции модели.
//
// Без Firebase, DOM и браузерных сохранений.
//
// Старый формат:
// side, unitIndex, position, updatedAt.
//
// Формат с опорой:
// те же поля + supportTileId.
//
// Отсутствующее supportTileId:
// старая запись, опора явно не назначена.
//
// supportTileId === null:
// опора явно назначена как отсутствие тайла.
//
// supportTileId — непустая строка:
// идентификатор опорного тайла.
//
// Этот модуль проверяет структуру записи.
// Наличие тайла и его положение проверяются отдельно.

const REQUIRED_FIELDS = [
  'side',
  'unitIndex',
  'position',
  'updatedAt'
];

const ALLOWED_FIELDS = [
  ...REQUIRED_FIELDS,
  'supportTileId'
];

function isRecord(value) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

export function validOnlinePosition(position) {
  if (position === null) return true;

  return Boolean(
    isRecord(position) &&
    Object.keys(position).length === 2 &&
    Object.hasOwn(position, 'x') &&
    Object.hasOwn(position, 'y') &&
    Number.isInteger(position.x) &&
    Number.isInteger(position.y) &&
    position.x >= 0 &&
    position.x < 14 &&
    position.y >= 0 &&
    position.y < 14
  );
}

function validTileId(value) {
  // Идентификатор должен обозначать один документ,
  // а не произвольный путь Firestore.
  return typeof value === 'string' &&
    value.length > 0 &&
    value !== '.' &&
    value !== '..' &&
    !value.includes('/');
}

export function validOnlineUnitRecord(
  unitId,
  data,
  { allowPendingTimestamp = false } = {}
) {
  if (!isRecord(data)) return false;

  if (
    !REQUIRED_FIELDS.every(key =>
      Object.hasOwn(data, key)
    ) ||
    !Object.keys(data).every(key =>
      ALLOWED_FIELDS.includes(key)
    )
  ) {
    return false;
  }

  if (
    !['a', 'b'].includes(data.side) ||
    !Number.isSafeInteger(data.unitIndex) ||
    data.unitIndex < 0 ||
    unitId !== `${data.side}_${data.unitIndex}` ||
    !validOnlinePosition(data.position)
  ) {
    return false;
  }

  const timestampValid =
    typeof data.updatedAt?.toMillis === 'function';

  if (
    !timestampValid &&
    !(
      allowPendingTimestamp &&
      data.updatedAt === null
    )
  ) {
    return false;
  }

  if (!Object.hasOwn(data, 'supportTileId')) {
    // Совместимость со старыми записями.
    return true;
  }

  const supportId = data.supportTileId;

  if (
    supportId !== null &&
    !validTileId(supportId)
  ) {
    return false;
  }

  // У модели в резерве не может быть опорного тайла.
  if (
    data.position === null &&
    supportId !== null
  ) {
    return false;
  }

  return true;
}

export function readOnlineUnitSupport(data) {
  if (!data || data.position === null) {
    return {
      status: 'reserve',
      tileId: null
    };
  }

  if (!Object.hasOwn(data, 'supportTileId')) {
    return {
      status: 'unassigned',
      tileId: null
    };
  }

  if (data.supportTileId === null) {
    return {
      status: 'no-tile',
      tileId: null
    };
  }

  return {
    status: 'tile',
    tileId: data.supportTileId
  };
}