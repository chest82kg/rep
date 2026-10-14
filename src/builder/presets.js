// src/builder/presets.js
//
// Готовые ростеры на ~1000 очков — по одному на каждый клан.
// Используются в билдере как шаблон-старт для новичков.
//
// Формат: массив объектов с полями:
//   id          — уникальный id
//   name        — название ростера
//   clan        — точное название клана из factions.js
//   description — краткое описание стиля игры
//   picks       — массив { title, count }, где title точно совпадает
//                 с названием юнита в factions.js
//   stakes      — массив id клятв из STAKES_LIST (2 клятвы на ростер)

export const PRESET_ROSTERS = [
  {
    id: 'preset-dwarves-clan1',
    name: 'Железная Стена',
    clan: 'Клан 1 — Клан Железной Кузни',
    description: 'Непробиваемый строй: 2 героя, тяжёлая пехота, стрелки. Медленный, но несокрушимый.',
    picks: [
      { title: 'Гримир Железнорукий Молотобоец', count: 1 },
      { title: 'Вельга Рунный Чтец', count: 1 },
      { title: 'Железнобород-Воин', count: 2 },
      { title: 'Железнобород-Арбалетчик', count: 1 },
      { title: 'Железнобород-Скакун (Ближний бой)', count: 1 }
    ],
    stakes: ['stake-wall', 'stake-banner-basic']
  },
  {
    id: 'preset-dwarves-clan2',
    name: 'Тени Глубин',
    clan: 'Клан 2 — Клан Глубоких Троп',
    description: 'Скрытность и внезапные удары. Подкопы, засады, контроль подземных ходов.',
    picks: [
      { title: 'Двалин Змеебородый', count: 1 },
      { title: 'Подземные Разведчики', count: 3 },
      { title: 'Копатели-Подрывники', count: 1 },
      { title: 'Глубинный Прыгун', count: 1 }
    ],
    stakes: ['stake-march', 'stake-heads-basic']
  },
  {
    id: 'preset-dwarves-clan3',
    name: 'Ковка Рун',
    clan: 'Клан 3 — Клан Рунных Кузнецов',
    description: 'Магия и синергия. Руны усиливают союзников, ослабляют врагов.',
    picks: [
      { title: 'Альвиз Златорук', count: 1 },
      { title: 'Руноносцы', count: 2 },
      { title: 'Огненные Жрецы', count: 1 },
      { title: 'Рунный Страж', count: 1 },
      { title: 'Рунный Голем', count: 1 }
    ],
    stakes: ['stake-wall', 'stake-heads-elite']
  },
  {
    id: 'preset-goblins-clan1',
    name: 'Отравленный Укус',
    clan: 'Клан 1 — Клан Скорпионов',
    description: 'Ядовитые уколы и численное превосходство. Затяжная война на истощение.',
    picks: [
      { title: 'Шахрит Скорпионий Хвост', count: 1 },
      { title: 'Укус-гоблины', count: 3 },
      { title: 'Копьеметатели', count: 1 },
      { title: 'Скорпион-гоблин', count: 1 },
      { title: 'Зыбучий Ловец', count: 1 }
    ],
    stakes: ['stake-heads-basic', 'stake-scalp-basic']
  },
  {
    id: 'preset-goblins-clan2',
    name: 'Песчаный Вихрь',
    clan: 'Клан 2 — Клан Барханов',
    description: 'Скорость и манёвр. Удар — отступление — возврат. Не дай врагу опомниться.',
    picks: [
      { title: 'Рашад Золотой Вихрь', count: 1 },
      { title: 'Песчаные Бегуны', count: 3 },
      { title: 'Верблюжьи Наездники', count: 1 },
      { title: 'Барханный Стрелок', count: 1 },
      { title: 'Вихревой Клинок', count: 1 }
    ],
    stakes: ['stake-march', 'stake-heads-basic']
  },
  {
    id: 'preset-goblins-clan3',
    name: 'Кости Пустыни',
    clan: 'Клан 3 — Клан Костяных Шаманов',
    description: 'Магия, ловушки, контроль поля. Заставь песок убивать за тебя.',
    picks: [
      { title: 'Магара Костяная Матерь', count: 1 },
      { title: 'Костяные Собиратели', count: 2 },
      { title: 'Песчаные Колдуны', count: 1 },
      { title: 'Костяной Исполин', count: 1 },
      { title: 'Песчаная Угарная Жрица', count: 1 }
    ],
    stakes: ['stake-wall', 'stake-heads-elite']
  }
];