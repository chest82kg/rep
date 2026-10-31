// src/builder/artifacts.js
//
// Покупка, назначение и проверка артефактов.
//
// Общий лимит предметов определяется числом Героев.
// Допустимый класс конкретного носителя определяется needClass
// в официальном каталоге артефактов.
//
// Цены, эффекты и бонусы каталога здесь не изменяются.

import { roster } from './state.js';
import { ARTIFACTS_LIST } from '../content/artifacts.js';

/* ==========================================================================
   Классы моделей
   ========================================================================== */

function isHero(unit) {
  return String(unit?.role || '')
    .toLowerCase()
    .includes('герой');
}

function matchesClass(unit, classId) {
  const role = String(unit?.role || '').toLowerCase();

  if (classId === 'hero') {
    return role.includes('герой');
  }

  if (classId === 'elite') {
    return role.includes('элит');
  }

  if (classId === 'basic') {
    return role.includes('базов') || role.includes('basic');
  }

  // Неизвестное ограничение не разрешаем автоматически.
  return false;
}

function classLabel(classId) {
  const labels = {
    hero: 'Герой',
    elite: 'Элита',
    basic: 'Базовый'
  };

  return labels[classId] || String(classId);
}

/* ==========================================================================
   Лимит и стоимость
   ========================================================================== */

/**
 * Максимальное количество артефактов в текущем ростере.
 * Лимит равен количеству Героев.
 */
export function getAvailableArtifacts() {
  return roster.units.filter(isHero).length;
}

/**
 * Количество купленных артефактов.
 */
export function getUsedArtifacts() {
  return roster.artifacts.length;
}

/**
 * Стоимость предметов по официальному каталогу.
 */
export function getArtifactsCost() {
  return roster.artifacts.reduce((sum, record) => {
    const artifact = ARTIFACTS_LIST.find(
      item => item.id === record?.id
    );

    return sum + (artifact ? artifact.cost : 0);
  }, 0);
}

/* ==========================================================================
   Проверка конкретного носителя
   ========================================================================== */

/**
 * Проверяет возможность назначить предмет конкретной модели.
 *
 * ignoreArtifactIndex:
 * индекс уже купленного предмета, который переназначается.
 * Его собственное назначение не считается занятым другим предметом.
 *
 * source:
 * текущий ростер либо отдельный объект, проверяемый до загрузки.
 */
export function canAssignArtifact(
  artId,
  targetIdx,
  ignoreArtifactIndex = -1,
  source = roster
) {
  const artifact = ARTIFACTS_LIST.find(
    item => item.id === artId
  );

  if (!artifact) {
    return {
      ok: false,
      reason: 'Артефакт не найден.'
    };
  }

  if (
    !source ||
    !Array.isArray(source.units) ||
    !Array.isArray(source.artifacts)
  ) {
    return {
      ok: false,
      reason: 'Некорректные данные ростера.'
    };
  }

  if (
    !Number.isInteger(targetIdx) ||
    targetIdx < 0 ||
    targetIdx >= source.units.length
  ) {
    return {
      ok: false,
      reason: 'Выберите существующую модель.'
    };
  }

  const unit = source.units[targetIdx];

  if (
    !unit ||
    typeof unit !== 'object' ||
    Array.isArray(unit)
  ) {
    return {
      ok: false,
      reason: 'Некорректные данные модели.'
    };
  }

  const requirements = artifact.needClass == null
    ? []
    : Array.isArray(artifact.needClass)
      ? artifact.needClass
      : [artifact.needClass];

  if (
    requirements.length > 0 &&
    !requirements.some(classId => matchesClass(unit, classId))
  ) {
    return {
      ok: false,
      reason:
        'Носитель должен иметь класс: ' +
        requirements.map(classLabel).join(' / ') +
        '.'
    };
  }

  const occupied = source.artifacts.some((record, index) =>
    index !== ignoreArtifactIndex &&
    record &&
    record.targetIdx === targetIdx
  );

  if (occupied) {
    return {
      ok: false,
      reason: 'У этой модели уже есть артефакт.'
    };
  }

  return { ok: true };
}

/**
 * Возвращает индексы допустимых свободных носителей.
 */
export function getEligibleArtifactTargets(
  artId,
  ignoreArtifactIndex = -1
) {
  return roster.units.reduce((result, unit, index) => {
    const check = canAssignArtifact(
      artId,
      index,
      ignoreArtifactIndex
    );

    if (check.ok) {
      result.push(index);
    }

    return result;
  }, []);
}

/* ==========================================================================
   Покупка и переназначение
   ========================================================================== */

/**
 * Проверяет возможность купить предмет.
 *
 * Без targetIdx выбирается первый допустимый свободный носитель.
 * Если targetIdx передан явно, проверяется именно эта модель.
 */
export function canAddArtifact(artId, targetIdx) {
  const artifact = ARTIFACTS_LIST.find(
    item => item.id === artId
  );

  if (!artifact) {
    return {
      ok: false,
      reason: 'Артефакт не найден.'
    };
  }

  const available = getAvailableArtifacts();

  if (getUsedArtifacts() >= available) {
    return {
      ok: false,
      reason: `Лимит: ${available} артефактов (по числу Героев).`
    };
  }

  if (targetIdx !== undefined) {
    const check = canAssignArtifact(artId, targetIdx);

    return check.ok
      ? { ok: true, targetIdx }
      : check;
  }

  const targets = getEligibleArtifactTargets(artId);

  if (targets.length === 0) {
    return {
      ok: false,
      reason:
        'Нет допустимого свободного носителя. ' +
        'Проверьте класс моделей и назначенные артефакты.'
    };
  }

  return {
    ok: true,
    targetIdx: targets[0]
  };
}

/**
 * Покупает предмет и назначает проверенному носителю.
 */
export function addArtifact(artId, targetIdx) {
  const check = canAddArtifact(artId, targetIdx);

  if (!check.ok) {
    return check;
  }

  roster.artifacts.push({
    id: artId,
    targetIdx: check.targetIdx
  });

  return {
    ok: true,
    targetIdx: check.targetIdx
  };
}

/**
 * Удаляет предмет из текущего ростера.
 */
export function removeArtifact(index) {
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= roster.artifacts.length
  ) {
    return {
      ok: false,
      reason: 'Артефакт не найден.'
    };
  }

  roster.artifacts.splice(index, 1);

  return { ok: true };
}

/**
 * Меняет носителя уже купленного предмета.
 * При ошибке исходное назначение остаётся без изменений.
 */
export function setArtifactTarget(index, targetIdx) {
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= roster.artifacts.length
  ) {
    return {
      ok: false,
      reason: 'Артефакт не найден.'
    };
  }

  const record = roster.artifacts[index];

  if (
    !record ||
    typeof record !== 'object' ||
    Array.isArray(record)
  ) {
    return {
      ok: false,
      reason: 'Некорректная запись артефакта.'
    };
  }

  const check = canAssignArtifact(
    record.id,
    targetIdx,
    index
  );

  if (!check.ok) {
    return check;
  }

  record.targetIdx = targetIdx;

  return { ok: true };
}

/* ==========================================================================
   Проверка назначений ростера
   ========================================================================== */

/**
 * Проверяет назначения без изменения переданного объекта.
 *
 * Проверяется:
 * — структура списка моделей и предметов;
 * — общий лимит по числу Героев;
 * — наличие предмета в официальном каталоге;
 * — существование носителя;
 * — допустимый класс конкретного носителя;
 * — не более одного предмета на модель.
 *
 * Отсутствие artifacts допустимо для старого ростера без предметов.
 *
 * Это не полная проверка безопасности импортируемого ростера:
 * HTML датакарт и остальные поля требуют отдельной валидации.
 */
export function validateRosterArtifacts(source = roster) {
  const errors = [];

  if (
    !source ||
    typeof source !== 'object' ||
    Array.isArray(source) ||
    !Array.isArray(source.units) ||
    !source.units.every(unit =>
      unit &&
      typeof unit === 'object' &&
      !Array.isArray(unit) &&
      (
        unit.role === undefined ||
        typeof unit.role === 'string'
      )
    )
  ) {
    return {
      ok: false,
      errors: ['Некорректный список моделей ростера.']
    };
  }

  if (
    source.artifacts !== undefined &&
    !Array.isArray(source.artifacts)
  ) {
    return {
      ok: false,
      errors: ['Поле artifacts должно быть массивом.']
    };
  }

  const checkedSource = {
    units: source.units,
    artifacts: source.artifacts || []
  };

  const heroCount = checkedSource.units.filter(isHero).length;

  if (checkedSource.artifacts.length > heroCount) {
    errors.push(
      'Превышен лимит артефактов: ' +
      `${checkedSource.artifacts.length} при ${heroCount} Героях.`
    );
  }

  checkedSource.artifacts.forEach((record, index) => {
    if (
      !record ||
      typeof record !== 'object' ||
      Array.isArray(record) ||
      typeof record.id !== 'string'
    ) {
      errors.push(
        `Артефакт #${index + 1}: некорректная запись.`
      );

      return;
    }

    const check = canAssignArtifact(
      record.id,
      record.targetIdx,
      index,
      checkedSource
    );

    if (!check.ok) {
      const artifact = ARTIFACTS_LIST.find(
        item => item.id === record.id
      );

      errors.push(
        `Артефакт #${index + 1} ` +
        `«${artifact?.name || record.id}»: ${check.reason}`
      );
    }
  });

  return {
    ok: errors.length === 0,
    errors
  };
}

/* ==========================================================================
   Группировка датакарт
   ========================================================================== */

/**
 * Возвращает ключ группы для просмотра и печати.
 *
 * Карточки объединяются только при одинаковых исходных данных
 * и одинаковом наборе назначенных предметов.
 *
 * Бонусы не записываются в исходный HTML:
 * их отображение выполняется отдельно при построении карточки.
 */
export function getUnitCardGroupKey(unit, unitIndex) {
  const artifactIds = roster.artifacts
    .filter(record =>
      record &&
      record.targetIdx === unitIndex
    )
    .map(record => record.id)
    .sort();

  return JSON.stringify([
    unit.title || '',
    unit.uniqueKey || '',
    unit.role || '',
    unit.cost || 0,
    unit.html || '',
    artifactIds
  ]);
}

export { ARTIFACTS_LIST };