// src/content/spells.js
//
// Базовые заклинания (Школа Стихий и Разума).
// Читаются Магами. Тратят Ману из общего пула армии.

export const SPELLS = [
  {
    id: 'spell-fire-arrow',
    name: 'Огненная стрела',
    threshold: 3,
    mana: 1,
    range: 4,
    description: 'Наносит 3 урона цели. Тег: [Пробой 1].',
    effect: 'damage_3_pierce_1'
  },
  {
    id: 'spell-stone-shield',
    name: 'Каменный щит',
    threshold: 3,
    mana: 1,
    range: 3,
    description: 'Выбранная союзная модель получает +2 к Броне до конца раунда.',
    effect: 'ally_armor_2_until_round_end'
  },
  {
    id: 'spell-illusions',
    name: 'Туман иллюзий',
    threshold: 4,
    mana: 1,
    range: 4,
    description: 'Вражеская модель не может проводить дальнобойные атаки и использовать «Спешку» до своей следующей активации.',
    effect: 'enemy_no_ranged_no_rush'
  },
  {
    id: 'spell-force-blast',
    name: 'Взрыв силы',
    threshold: 4,
    mana: 2,
    range: 3,
    description: 'Все вражеские модели в радиусе 2 клеток от указанной точки получают по 2 урона и отбрасываются на 1 клетку назад.',
    effect: 'aoe_2_damage_2_push_1'
  }
];