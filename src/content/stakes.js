// src/content/stakes.js
//
// Клятвы (бывшие ставки). Справочные данные, используются:
//   - в билдере (выбор клятв)
//   - в игровом столе (модалка «Мои клятвы»)
//   - в финише матча (отметки клятв)
//   - в мастерской (аудит, экспорт)
//
// Формат:
//   id          — уникальный id
//   family      — семейство (заменяемое: если выбрана одна клятва семьи, другие недоступны)
//   name        — название для интерфейса
//   class       — 'basic' | 'elite' | 'hero' | 'army'
//   classLabel  — метка класса для UI
//   cost        — стоимость в МИ
//   reward      — награда в ОП при сдержании
//   penalty     — цена в ОП при нарушении
//   needClass   — какой класс модели требуется
//   description — что нужно сделать
//   minRules    — пороги, ниже которых клятва нарушена

export const STAKES_LIST = [
  // ==== Скальп Героя ====
  {
    id: 'stake-scalp-basic',
    family: 'scalp',
    name: 'Скальп Героя',
    class: 'basic',
    classLabel: 'Баз',
    cost: 2,
    reward: 3,
    penalty: 2,
    needClass: 'basic',
    description: 'Базовый отряд нанёс последний урон вражескому Герою и уничтожил его.',
    minRules: ['Базовый отряд нанёс вражескому Герою хотя бы 1 урон.']
  },
  {
    id: 'stake-scalp-elite',
    family: 'scalp',
    name: 'Скальп Героя',
    class: 'elite',
    classLabel: 'Элит',
    cost: 3,
    reward: 4,
    penalty: 3,
    needClass: 'elite',
    description: 'Элитный отряд нанёс последний урон вражескому Герою и уничтожил его.',
    minRules: [
      'Элитный отряд нанёс вражескому Герою хотя бы 3 урона.',
      'Элитный отряд пережил бой с Героем.'
    ]
  },
  {
    id: 'stake-scalp-hero',
    family: 'scalp',
    name: 'Скальп Героя',
    class: 'hero',
    classLabel: 'Герой',
    cost: 4,
    reward: 5,
    penalty: 4,
    needClass: 'hero',
    description: 'Ваш Герой победил вражеского Героя в дуэли 1×1, без поддержки союзников.',
    minRules: [
      'Ваш Герой нанёс последний урон вражескому Герою.',
      'В дуэли участвовали только два Героя.',
      'Ваш Герой выжил после дуэли.'
    ]
  },

  // ==== Бич высот ====
  {
    id: 'stake-heights-basic',
    family: 'heights',
    name: 'Бич высот',
    class: 'basic',
    classLabel: 'Баз',
    cost: 2,
    reward: 3,
    penalty: 2,
    needClass: 'basic',
    description: '+1 ОП за каждую вражескую модель, уничтоженную базовым отрядом на тайле высотой 2+.',
    minRules: ['Базовый отряд уничтожил хотя бы 2 вражеские модели на высоте 2+.']
  },
  {
    id: 'stake-heights-elite',
    family: 'heights',
    name: 'Бич высот',
    class: 'elite',
    classLabel: 'Элит',
    cost: 3,
    reward: 4,
    penalty: 3,
    needClass: 'elite',
    description: '+1 ОП за каждую вражескую модель, уничтоженную элитой на высоте 2+. +2 ОП за уничтожение Героя на высоте.',
    minRules: [
      'Элитный отряд уничтожил хотя бы 3 вражеские модели на высоте 2+.',
      'Элитный отряд сам не погиб на этой высоте.'
    ]
  },
  {
    id: 'stake-heights-hero',
    family: 'heights',
    name: 'Бич высот',
    class: 'hero',
    classLabel: 'Герой',
    cost: 4,
    reward: 5,
    penalty: 4,
    needClass: 'hero',
    description: '+2 ОП за каждую вражескую модель, уничтоженную Героем на высоте 2+.',
    minRules: [
      'Герой уничтожил хотя бы 3 вражеские модели на высоте 2+.',
      'Герой сам не покидал высоту до конца игры.',
      'Герой не был уничтожен.'
    ]
  },

  // ==== Головы в корзину ====
  {
    id: 'stake-heads-basic',
    family: 'heads',
    name: 'Головы в корзину',
    class: 'basic',
    classLabel: 'Баз',
    cost: 1,
    reward: 3,
    penalty: 2,
    needClass: 'basic',
    description: '+1 ОП за каждую вражескую модель, уничтоженную базовым отрядом.',
    minRules: ['Базовый отряд уничтожил хотя бы 3 вражеские модели.']
  },
  {
    id: 'stake-heads-elite',
    family: 'heads',
    name: 'Головы в корзину',
    class: 'elite',
    classLabel: 'Элит',
    cost: 2,
    reward: 4,
    penalty: 3,
    needClass: 'elite',
    description: '+1 ОП за каждую вражескую модель, уничтоженную элитой. +2 ОП за уничтожение Героя.',
    minRules: ['Элитный отряд уничтожил хотя бы 2 вражеские модели.']
  },
  {
    id: 'stake-heads-hero',
    family: 'heads',
    name: 'Головы в корзину',
    class: 'hero',
    classLabel: 'Герой',
    cost: 3,
    reward: 5,
    penalty: 4,
    needClass: 'hero',
    description: '+2 ОП за каждую вражескую модель, уничтоженную Героем.',
    minRules: [
      'Герой уничтожил хотя бы 3 вражеские модели.',
      'Герой не был уничтожен.'
    ]
  },

  // ==== Знаменосец ====
  {
    id: 'stake-banner-basic',
    family: 'banner',
    name: 'Знаменосец',
    class: 'basic',
    classLabel: 'Баз',
    cost: 2,
    reward: 3,
    penalty: 2,
    needClass: 'basic',
    description: '+1 ОП за каждый раунд, в котором базовый отряд удерживает 2+ контрольные точки.',
    minRules: ['Базовый отряд удерживал 2+ точки хотя бы 2 раунда.']
  },
  {
    id: 'stake-banner-elite',
    family: 'banner',
    name: 'Знаменосец',
    class: 'elite',
    classLabel: 'Элит',
    cost: 3,
    reward: 4,
    penalty: 3,
    needClass: 'elite',
    description: '+2 ОП за каждый раунд, в котором элита удерживает 2+ контрольные точки.',
    minRules: [
      'Элитный отряд удерживал 2+ точки хотя бы 2 раунда.',
      'Элитный отряд не покидал точку более чем на 1 раунд.'
    ]
  },
  {
    id: 'stake-banner-hero',
    family: 'banner',
    name: 'Знаменосец',
    class: 'hero',
    classLabel: 'Герой',
    cost: 4,
    reward: 5,
    penalty: 4,
    needClass: 'hero',
    description: '+3 ОП за каждый раунд, в котором Герой удерживает 2+ контрольные точки.',
    minRules: [
      'Герой удерживал 2+ точки хотя бы 3 раунда.',
      'Герой не был уничтожен.',
      'Герой лично находился на одной из точек в конце игры.'
    ]
  },

  // ==== Армейские ====
  {
    id: 'stake-march',
    family: 'march',
    name: 'Марш-бросок',
    class: 'army',
    classLabel: 'Армия',
    cost: 1,
    reward: 2,
    penalty: 0,
    needClass: 'army',
    description: '+2 ОП, если хотя бы одна ваша модель дошла до зоны выставления противника.',
    minRules: ['Хотя бы 1 модель достигла зоны выставления противника.']
  },
  {
    id: 'stake-wall',
    family: 'wall',
    name: 'Стена до конца',
    class: 'army',
    classLabel: 'Армия',
    cost: 2,
    reward: 3,
    penalty: 0,
    needClass: 'army',
    description: '+1 ОП за каждый раунд, в котором ни одна ваша модель не погибла.',
    minRules: ['Продержаться без потерь минимум 2 раунда.']
  }
];