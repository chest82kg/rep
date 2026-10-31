// src/content/rules/reference.js
// Справочные статьи, ЧАВО и сезоны.

import { GLOSSARY } from '../glossary.js';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

const GLOSSARY_SECTIONS = [
  {
    title: 'Лор и мироздание',
    description: 'Понятия, описывающие Расслоение, Ритм и устройство мира.',
    terms: [
      'Ритм',
      'Тик',
      'Сшиватель',
      'Слой',
      'Цельный мир',
      'Глухое место',
      'Стежок',
      'Двойной рассвет'
    ]
  },
  {
    title: 'Базовые игровые понятия',
    description: 'Ресурсы, порядок игры, инициатива и командование.',
    terms: [
      'Действие Игрока',
      'Очки победы',
      'Монеты Империи',
      'Фракционный ОД',
      'Пул кубиков',
      'Пул',
      'Резерв',
      'Абсолютный приоритет',
      'Командир'
    ]
  },
  {
    title: 'Стойки, действия и приказы',
    description: 'Положения модели, доступные действия и способы использования кубиков.',
    terms: [
      'Стойка',
      'Атакующая',
      'Защищающаяся',
      'Нейтральная',
      'Клановая стойка',
      'Положение модели',
      'Фланг',
      'Тыл',
      'Приказ',
      'Марш',
      'Удар',
      'Защита',
      'Спешка',
      'Перемещение',
      'Натиск',
      'Прорыв',
      'Добивание',
      'Рывок',
      'Блок',
      'Прикрытие',
      'Контратака',
      'Глухая оборона',
      'Отчаянный удар',
      'Утилизация кубов'
    ]
  },
  {
    title: 'Боевые характеристики и теги',
    description: 'Характеристики моделей, проверки, урон и свойства оружия.',
    terms: [
      'Броня',
      'ХП',
      'Движение',
      'Порог',
      'Попадание',
      'Ранение',
      'Урон',
      'Пробой',
      'Пробитие',
      'Ренд',
      'Размах',
      'Залп',
      'Точное',
      'Тяжелое',
      'Оглушение',
      'Смертельное ранение'
    ]
  },
  {
    title: 'Ландшафт и игровое поле',
    description: 'Тайлы, типы местности и правила высоты.',
    terms: [
      'Ландшафт',
      'Луг',
      'Лес',
      'Река',
      'Гора',
      'Многоуровневая Гора',
      'Высота',
      'Тайл'
    ]
  },
  {
    title: 'Миссии, батлпланы и клятвы',
    description: 'Сценарии, зоны выставления, контрольные точки и обязательства перед боем.',
    terms: [
      'Батлплан',
      'Контрольная точка',
      'Зона А',
      'Зона З',
      'Клятва',
      'Звериная клятва',
      'Минимальное правило',
      'Атакующий',
      'Защищающийся',
      'Зона выставления'
    ]
  },
  {
    title: 'Фракции и состав армии',
    description: 'Фракции, кланы, классы моделей и элементы ростера.',
    terms: [
      'Кхад-Дарум',
      'Арафия',
      'Клан',
      'Фракционная способность',
      'Фракционный пул',
      'Фракционная территория',
      'Герой',
      'Элита',
      'Базовый отряд',
      'Монстр',
      'Варскролл'
    ]
  },
  {
    title: 'Статусы и маркеры',
    description: 'Негативные эффекты и последствия специальных действий.',
    terms: [
      'Горение',
      'Яд',
      'Окаменение',
      'Скольжение',
      'Кровотечение',
      'Путы',
      'Глухота',
      'Усталость',
      'Истощение'
    ]
  },
  {
    title: 'Магия, молитвы и артефакты',
    description: 'Ресурсы заклинателей, особые действия и дополнительное снаряжение.',
    terms: [
      'Мана',
      'Вера',
      'Заклинание',
      'Молитва',
      'Аура',
      'Артефакт',
      'Зачарованное оружие',
      'Толстый щит',
      'Быстрые сапоги',
      'Амулет выживания',
      'Сигнальный рог',
      'Свиток телепортации'
    ]
  }
];

function renderGlossarySection(section) {
  const entries = section.terms
    .filter(term => Object.hasOwn(GLOSSARY, term))
    .sort((termA, termB) =>
      termA.localeCompare(termB, 'ru', { sensitivity: 'base' })
    )
    .map(term => `
      <div class="glossary-entry">
        <dt>${escapeHtml(term)}</dt>
        <dd>${escapeHtml(GLOSSARY[term])}</dd>
      </div>
    `)
    .join('');

  if (!entries) return '';

  return `
    <section class="glossary-section">
      <header class="glossary-section-heading">
        <h3>${escapeHtml(section.title)}</h3>
        <p>${escapeHtml(section.description)}</p>
      </header>

      <dl class="glossary-list">
        ${entries}
      </dl>
    </section>
  `;
}

const GLOSSARY_CONTENT = GLOSSARY_SECTIONS
  .map(renderGlossarySection)
  .join('');

/* Основные справочные статьи.
   В исходном RULES_DATA они шли перед статьёй статусов. */
export const RULES_REFERENCE_DATA = [
  {
    id: 'rules-glossary',
    category: 'rules',
    categoryTitle: 'Основные правила',
    type: 'article',
    title: 'Глоссарий',
    content: `
      <h2>Глоссарий терминов</h2>

      <p class="glossary-lead">
        Справочник основных понятий, правил и определений мира.
        Термины сгруппированы по игровым разделам.
      </p>

      <div class="glossary-directory" aria-label="Список терминов глоссария">
        ${GLOSSARY_CONTENT}
      </div>
    `
  },

  {
  id: 'rules-points',
  category: 'rules',
  categoryTitle: 'Основные правила',
  type: 'article',
  title: 'Очковая стоимость',
  content: `
    <h2>Очковая стоимость и состав армии</h2>

    <p class="points-lead">Ростер собирается из отрядов одного клана. Стоимость моделей и артефактов суммируется в общий бюджет армии, а клятвы оплачиваются отдельно — Монетами Империи.</p>

    <section class="points-overview">
      <div class="points-overview-card points-overview-card--budget">
        <span class="points-overview-value">500–1000</span>
        <span class="points-overview-label">очков армии</span>
        <p>Минимальный рекомендуемый и максимальный размер ростера.</p>
      </div>

      <div class="points-overview-card points-overview-card--stakes">
        <span class="points-overview-value">6 МИ</span>
        <span class="points-overview-label">бюджет клятв</span>
        <p>Клятвы не оплачиваются очками армии.</p>
      </div>

      <div class="points-overview-card points-overview-card--commander">
        <span class="points-overview-value">1</span>
        <span class="points-overview-label">Командир</span>
        <p>Герой либо элитная модель, если Героя в армии нет.</p>
      </div>
    </section>

    <section class="points-section points-section--formation">
      <h3>Формирование армии</h3>

      <ol class="rule-steps">
        <li><strong>Выберите один клан.</strong> Все отряды в ростере должны принадлежать выбранному клану.</li>
        <li><strong>Добавьте отряды.</strong> Стоимость каждой модели указана на её датакарте и входит в бюджет армии.</li>
        <li><strong>Назначьте Командира.</strong> Любой Герой автоматически становится Командиром. Если Героев нет, Командиром становится любая элитная модель.</li>
        <li><strong>При необходимости купите артефакты.</strong> Их стоимость также входит в общий бюджет армии.</li>
        <li><strong>Дайте клятвы.</strong> Клятвы выбираются отдельно от очкового бюджета и оплачиваются Монетами Империи.</li>
      </ol>
    </section>

    <section class="points-section points-section--limits">
      <h3>Ограничения ростера</h3>

      <div class="points-rule-grid">
        <article class="points-rule-card points-rule-card--budget">
          <h4>Бюджет армии</h4>
          <p>Полная стоимость ростера должна составлять <strong>от 500 до 1000 очков</strong>.</p>
          <p>В стоимость входят все выбранные отряды и купленные для них артефакты.</p>
        </article>

        <article class="points-rule-card points-rule-card--clan">
          <h4>Один клан</h4>
          <p>Армия собирается только из отрядов одного выбранного клана.</p>
          <p>Смешивать отряды разных кланов или фракций в одном ростере нельзя.</p>
        </article>

        <article class="points-rule-card points-rule-card--commander">
          <h4>Командир</h4>
          <p>В армии должен быть Командир: Герой или, при отсутствии Героя, элитная модель.</p>
          <p>Командир приносит +1 Фракционный ОД в начале каждого раунда; его гибель даёт противнику +2 ПО однократно.</p>
        </article>

        <article class="points-rule-card points-rule-card--open">
          <h4>Состав по классам</h4>
          <p>В текущей версии нет отдельных числовых лимитов на Базовые отряды, Элиты и Героев.</p>
          <p>Их количество ограничивается общим бюджетом армии, доступным составом клана и остальными правилами ростера.</p>
        </article>
      </div>
    </section>

    <section class="points-section points-section--artifacts">
      <h3>Артефакты в бюджете армии</h3>

      <div class="rule-callout">
        <p><strong>Стоимость артефакта прибавляется к стоимости армии.</strong> Например, армия стоимостью 970 очков может приобрести артефакт стоимостью до 30 очков, не превышая лимит в 1000 очков.</p>
      </div>

      <ul class="points-check-list">
        <li><strong>Одна модель</strong> может нести не более одного артефакта.</li>
        <li><strong>Лимит артефактов армии</strong> равен числу Героев в ростере.</li>
        <li><strong>Артефакты</strong> нельзя покупать, если в армии нет ни одного Героя.</li>
        <li><strong>Каждый артефакт</strong> должен быть назначен конкретной модели армии.</li>
      </ul>
    </section>

    <section class="points-section points-section--stakes">
      <h3>Клятвы и Монеты Империи</h3>

      <p>Клятвы не занимают очки армии. Перед игрой игрок получает отдельный бюджет: <strong>6 Монет Империи</strong>.</p>

      <div class="points-rule-grid">
        <article class="points-rule-card points-rule-card--stakes">
          <h4>Количество клятв</h4>
          <p>Перед игрой игрок выбирает <strong>от 1 до 3 клятв</strong> из доступных семейств.</p>
        </article>

        <article class="points-rule-card points-rule-card--stakes">
          <h4>Бюджет клятв</h4>
          <p>Общая стоимость выбранных клятв не может превышать <strong>6 МИ</strong>.</p>
        </article>

        <article class="points-rule-card points-rule-card--stakes">
          <h4>Требования классов</h4>
          <p>Клятва определённого класса доступна, только если в армии есть соответствующая модель: Базовая, Элитная или Герой.</p>
        </article>

        <article class="points-rule-card points-rule-card--stakes">
          <h4>Семейства клятв</h4>
          <p>Из одного семейства можно выбрать только одну версию клятвы.</p>
        </article>
      </div>
    </section>

    <section class="points-section points-section--monsters">
      <h3>Монстры</h3>

      <div class="rule-callout">
        <p><strong>Звериная клятва:</strong> чтобы включить Монстра в армию, необходимо выбрать хотя бы одну Звериную клятву.</p>
      </div>

      <p>Отдельного числового лимита на Монстров в текущей версии правил нет. Их доступность определяется составом выбранного клана, бюджетом армии и обязательной Звериной клятвой.</p>
    </section>

    <section class="points-section points-section--example">
      <h3>Пример расчёта стоимости</h3>

      <details class="rule-example">
        <summary>Пример: как считается общий бюджет</summary>
        <div>
          Игрок выбрал отряды на 925 очков и приобрёл два артефакта стоимостью 20 и 35 очков. Итоговая стоимость армии: 925 + 20 + 35 = 980 очков. Такой ростер находится в пределах лимита 500–1000 очков. Клятвы оплачиваются отдельно из бюджета в 6 МИ и не увеличивают стоимость в очках армии.
        </div>
      </details>
    </section>
  `
}
];

/* ЧАВО в исходном RULES_DATA шло после статьи статусов. */
export const FAQ_DATA = [
  {
    id: 'faq-general',
    category: 'faq',
    categoryTitle: 'ЧАВО',
    type: 'article',
    title: 'Часто задаваемые вопросы',
    content: `
      <h2>ЧАВО (Часто задаваемые вопросы)</h2>
      <p>Здесь собраны ответы на самые популярные вопросы по правилам и механике игры.</p>

      <section class="faq-list">
        <details class="faq-item">
          <summary>Что происходит при одновременной атаке?</summary>
          <div class="faq-answer">
            <p>Атаки разрешаются поочередно, начиная с бойца с большей характеристикой инициативы.</p>
          </div>
        </details>

        <details class="faq-item">
          <summary>Можно ли менять оружие в середине боя?</summary>
          <div class="faq-answer">
            <p>Да, это стоит 1 ОД.</p>
          </div>
        </details>

        <details class="faq-item">
          <summary>Можно ли стрелять вплотную?</summary>
          <div class="faq-answer">
            <p>Да, можно. Однако любая дальнобойная атака по цели, находящейся в смежной клетке (вплотную), получает штраф <strong>−1 к Попаданию</strong>.</p>
          </div>
        </details>
      </section>
    `
  }
];

/* Правила миссий — сезоны. */
export const SEASONS_DATA = [
  {
    id: 'mission-season-1',
    category: 'missions',
    categoryTitle: 'Правила миссий',
    subCategory: 'Сезоны',
    type: 'article',
    title: 'Сезон 1',
    content: `
      <h2>Сезон 1</h2>
      <p>Описание правил, особенностей и меты первого сезона.</p>
    `
  },

  {
    id: 'mission-season-2',
    category: 'missions',
    categoryTitle: 'Правила миссий',
    subCategory: 'Сезоны',
    type: 'article',
    title: 'Сезон 2',
    content: `
      <h2>Сезон 2</h2>
      <p>Описание правил, особенностей и меты второго сезона.</p>
    `
  },

  {
    id: 'mission-season-3',
    category: 'missions',
    categoryTitle: 'Правила миссий',
    subCategory: 'Сезоны',
    type: 'article',
    title: 'Сезон 3',
    content: `
      <h2>Сезон 3</h2>
      <p>Описание правил, особенностей и меты третьего сезона.</p>
    `
  },

  {
    id: 'mission-season-4',
    category: 'missions',
    categoryTitle: 'Правила миссий',
    subCategory: 'Сезоны',
    type: 'article',
    title: 'Сезон 4',
    content: `
      <h2>Сезон 4</h2>
      <p>Описание правил, особенностей и меты четвертого сезона.</p>
    `
  }
];