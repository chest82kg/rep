// src/content/prayers.js
//
// Базовые молитвы (Пантеон Защиты и Света).
// Читаются Жрецами. Тратят Веру из общего пула армии.
// Не требуют проверки по кубикам.

export const PRAYERS = [
  {
    id: 'prayer-heal',
    name: 'Молитва Исцеления',
    faith: 1,
    range: 3,
    aura: false,
    description: 'Восстанавливает 2 ХП выбранной союзной модели.',
    effect: 'heal_2'
  },
  {
    id: 'prayer-stability',
    name: 'Благословение стойкости',
    faith: 1,
    range: 3,
    aura: false,
    description: 'Выбранная союзная модель получает иммунитет к отбрасыванию, яду и проклятиям до конца раунда.',
    effect: 'immune_push_poison_curse'
  },
  {
    id: 'prayer-holy-weapon',
    name: 'Освященное оружие',
    faith: 1,
    range: 2,
    aura: false,
    description: 'Следующая атака союзной модели в текущем раунде получает тег [Пробой 2].',
    effect: 'next_attack_pierce_2'
  },
  {
    id: 'prayer-sky-cover',
    name: 'Небесный заслон',
    faith: 2,
    range: 2,
    aura: true,
    description: 'Все союзные модели в радиусе 2 клеток от Жреца игнорируют первые 2 единицы любого входящего урона до конца раунда.',
    effect: 'aura_ignore_first_2_damage'
  }
];