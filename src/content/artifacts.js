// src/content/artifacts.js
//
// Базовые артефакты, доступные любой фракции.
// Покупаются за очки армии в билдере.

export const ARTIFACTS_LIST = [
  {
    id: 'artifact-enchanted-weapon',
    name: 'Зачарованное оружие',
    cost: 25,
    description: 'Выбранное оружие ближнего боя модели получает тег [Пробой 1].',
    needClass: null,
    effect: 'give_tag_melee_rend1'
  },
  {
    id: 'artifact-thick-shield',
    name: 'Толстый щит',
    cost: 20,
    description: 'Модель получает +1 к Броне.',
    needClass: null,
    effect: 'give_armor_1'
  },
  {
    id: 'artifact-fast-boots',
    name: 'Быстрые сапоги',
    cost: 15,
    description: 'Модель получает +1 к Движению.',
    needClass: null,
    effect: 'give_move_1'
  },
  {
    id: 'artifact-survival-amulet',
    name: 'Амулет выживания',
    cost: 35,
    description: '+2 к ХП. Один раз за игру: при получении смертельного урона модель не уничтожается, а остаётся на поле с 1 ХП.',
    needClass: null,
    effect: 'give_hp_2_and_last_stand'
  },
  {
    id: 'artifact-signal-horn',
    name: 'Сигнальный рог',
    cost: 30,
    description: 'Один раз за раунд позволяет активировать одну союзную модель в радиусе 3 клеток вне очереди (сразу после завершения активации носителя).',
    needClass: ['hero', 'elite'],
    effect: 'extra_activation_aura_3'
  },
  {
    id: 'artifact-teleport-scroll',
    name: 'Свиток телепортации',
    cost: 25,
    description: 'Одноразовый. За 1 ОД телепортирует носителя на любую пустую клетку в радиусе 5 клеток.',
    needClass: null,
    effect: 'teleport_once'
  }
];