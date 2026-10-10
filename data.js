import { GLOSSARY } from './glossary.js';
import { RULES_DATA } from './rules.js';
import { BESTIARY_DATA } from './bestiary.js';
import { FACTIONS_DATA } from './factions.js';
import { MISSIONS_DATA } from './missions.js';

export const DATABASE = [
  // --- ПУНКТ БИЛДЕРА (Появится внизу сайдбара) ---
  {
    id: 'builder',
    category: 'builder',
    categoryTitle: 'Конструктор ростера',
    type: 'builder',
    title: '🛠️ Ростер Билдер'
  },
  ...RULES_DATA,
  ...BESTIARY_DATA,
  ...FACTIONS_DATA,
  ...MISSIONS_DATA
];

export { GLOSSARY };