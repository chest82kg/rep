import { GLOSSARY } from './glossary.js';
import { RULES_DATA } from './rules.js';
import { BESTIARY_DATA } from './bestiary.js';
import { FACTIONS_DATA } from './factions.js'; // <--- Импортируем фракции

export const DATABASE = [
  ...RULES_DATA,
  ...BESTIARY_DATA,
  ...FACTIONS_DATA // <--- Добавляем в общий массив
];

export { GLOSSARY };
