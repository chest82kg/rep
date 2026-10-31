// src/content/rules.js
// Единая точка сборки статей правил.
// Порядок массивов повторяет порядок исходного RULES_DATA.

import { LORE_DATA } from './rules/lore.js';
import { QUICK_START_DATA } from './rules/quick-start.js';
import { CORE_RULES_DATA } from './rules/core-rules.js';
import { ARTIFACTS_MAGIC_DATA } from './rules/artifacts-magic.js';
import { STATUSES_DATA } from './rules/statuses.js';
import {
  RULES_REFERENCE_DATA,
  FAQ_DATA,
  SEASONS_DATA
} from './rules/reference.js';

export const RULES_DATA = [
  // Лор и начало
  ...LORE_DATA,

  // Правила быстрого старта
  ...QUICK_START_DATA,

  // Базовые и продвинутые правила
  ...CORE_RULES_DATA,

  // Артефакты, магия и молитвы
  ...ARTIFACTS_MAGIC_DATA,

  // Глоссарий и очковая стоимость
  ...RULES_REFERENCE_DATA,

  // Статусы
  ...STATUSES_DATA,

  // ЧАВО
  ...FAQ_DATA,

  // Миссии: сезоны
  ...SEASONS_DATA
];