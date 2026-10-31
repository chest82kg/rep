// src/content/missions.js
// Единая точка сборки статей миссий.
// Порядок массивов повторяет исходный MISSIONS_DATA.

import { BATTLEPLANS_DATA } from './missions/battleplans.js';
import { OATH_RULES_DATA } from './missions/oath-rules.js';
import { OATH_TYPES_DATA } from './missions/oath-types.js';

export const MISSIONS_DATA = [
  ...BATTLEPLANS_DATA,
  ...OATH_RULES_DATA,
  ...OATH_TYPES_DATA
];