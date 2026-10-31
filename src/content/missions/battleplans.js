 export const BATTLEPLANS_DATA = [
 
 {
    id: 'battleplan-rules',
    category: 'missions',
    categoryTitle: 'Правила миссий',
    subCategory: 'Книга Миссий',
    type: 'article',
    title: 'Батлпланы (Общие правила)',
    content: `
      <h2>Батлпланы (Общие правила)</h2>
      <p>Все батлпланы рассчитаны на поле 14 на 14 клеток. Игроки определяют, кто атакующий, а кто защищающийся, по взаимному согласию или броском кубика. Зоны выставления и особые правила описаны для каждого батлплана отдельно.</p>

      <h3>Обозначения</h3>
      <ul>
        <li><strong>КТ</strong> — контрольная точка (маркер ставится на указанный тайл или клетку).</li>
        <li><strong>Зона А</strong> — зона выставления атакующего (Красная).</li>
        <li><strong>Зона З</strong> — зона выставления защищающегося (Синяя).</li>
        <li><strong>Ландшафт</strong> — предустановленные тайлы ландшафта, которые раскладываются до выставления фракционных территорий.</li>
      </ul>
    `
  },

  // --- БАТЛПЛАН 1: ПЕРЕВАЛ ---
  {
    id: 'battleplan-1',
    category: 'missions',
    categoryTitle: 'Правила миссий',
    subCategory: 'Книга Миссий',
    type: 'article',
    title: 'Батлплан 1 — «Перевал»',
    content: `
      <h2>Батлплан 1 — «Перевал»</h2>
      <p><strong>Суть:</strong> атакующий прорывается через горный перевал, защищающийся удерживает узкий проход.</p>

     <section class="mission-block">
        <h3>Зоны выставления</h3>
        <ul class="mission-list">
          <li><strong>Зона Красная:</strong> атакующий.</li>
          <li><strong>Зона Синяя:</strong> защищающийся.</li>
        </ul>
      </section>

        <section class="mission-block">
        <h3>Контрольные точки</h3>
        <ul class="mission-list">
          <li>КТ1</li>
          <li>КТ2</li>
        </ul>
      </section>

      <section class="mission-block mission-block--special">
        <h3>Особые правила</h3>
        <ul class="mission-list">
          <li><strong>Обвал:</strong> Защищающийся один раз за игру (в конце любого раунда) может объявить «Обвал» — один тайл Горы в колонках 5–8 становится непроходимым до конца игры. Все модели на нём получают 2 урона.</li>
        </ul>
      </section>

      <section class="mission-block mission-block--points">
        <h3>Победные очки (в конце каждого раунда)</h3>
        <ul class="mission-list">
          <li>Контроль К1 — 1 очко.</li>
          <li>Контроль К2 — 1 очко.</li>
          <li><strong>Бонус:</strong> если атакующий контролирует парные точки К1 — дополнительно +1 очко.</li>
          <li><strong>Бонус:</strong> если защищающийся контролирует парные точки К2 — дополнительно +1 очко.</li>
          <li><strong>Бонус:</strong> если любой из игроков контролирует все 3 прохода (2 после обвала), на конец третьего раунда, то получает 2 дополнительных очка.</li>
        </ul>
      </section>

      <h3>Основное игровое поле</h3>
      <img src="./images/map1.png" alt="Основное игровое поле" style="width: 100%; border-radius: 8px; margin: 12px 0 24px 0; border: 1px solid var(--border);">

      <h3>Тайлы и подсказки</h3>
      <img src="./images/map1tiles.png" alt="Тайлы и подсказки" style="width: 100%; border-radius: 8px; margin: 12px 0 24px 0; border: 1px solid var(--border);">
    `
  },

  // --- БАТЛПЛАН 2: РЕЧНОЙ РУБЕЖ ---
  {
    id: 'battleplan-2',
    category: 'missions',
    categoryTitle: 'Правила миссий',
    subCategory: 'Книга Миссий',
    type: 'article',
    title: 'Батлплан 2 — «Речной Рубеж»',
    content: `
      <h2>Батлплан 2 — «Речной Рубеж»</h2>
      <p><strong>Суть:</strong> река разделяет поле пополам. Контроль мостов и бродов решает исход.</p>

      <section class="mission-block">
        <h3>Зоны выставления</h3>
        <ul class="mission-list">
          <li><strong>Зона Красная:</strong> атакующий.</li>
          <li><strong>Зона Синяя:</strong> защищающийся.</li>
        </ul>
      </section>

      <section class="mission-block">
        <h3>Контрольные точки</h3>
        <ul class="mission-list">
          <li>КТ1</li>
          <li>КТ2</li>
          <li>КТ3 (глубокий брод)</li>
        </ul>
      </section>

     <section class="mission-block mission-block--special">
        <h3>Особые правила</h3>
        <ul class="mission-list">
          <li><strong>Брод:</strong> КТ3 считается труднопроходимой — движение через эту клетку стоит 3 очка движения вместо 2. Но контроль КТ3 даёт больше очков.</li>
          <li><strong>Разлив:</strong> В конце раунда 3 и раунда 5 Река разливается — все модели на клетках Реки (кроме мостов) получают 1 урон и отбрасываются на ближайшую сушу.</li>
        </ul>
      </section>

     <section class="mission-block mission-block--points">
        <h3>Победные очки (в конце каждого раунда)</h3>
        <ul class="mission-list">
          <li>Контроль К1 — 1 очко.</li>
          <li>Контроль К2 — 1 очко.</li>
          <li>Контроль КТ3 — 2 очка.</li>
          <li><strong>Бонус:</strong> если один игрок контролирует все точки — дополнительно +2 очка.</li>
        </ul>
      </section>

      <h3>Основное игровое поле</h3>
      <img src="./images/map2.png" alt="Основное игровое поле" style="width: 100%; border-radius: 8px; margin: 12px 0 24px 0; border: 1px solid var(--border);">

      <h3>Тайлы и подсказки</h3>
      <img src="./images/map2tiles.png" alt="Тайлы и подсказки" style="width: 100%; border-radius: 8px; margin: 12px 0 24px 0; border: 1px solid var(--border);">
    `
  },

  // --- БАТЛПЛАН 3: ГЛУХОЙ ЛЕС ---
  {
    id: 'battleplan-3',
    category: 'missions',
    categoryTitle: 'Правила миссий',
    subCategory: 'Книга Миссий',
    type: 'article',
    title: 'Батлплан 3 — «Глухой Лес»',
    content: `
      <h2>Батлплан 3 — «Глухой Лес»</h2>
      <p><strong>Суть:</strong> плотный лес скрывает цели. Захват и удержание ключевых полян.</p>

     <section class="mission-block">
        <h3>Зоны выставления</h3>
        <ul class="mission-list">
          <li><strong>Зона Красная:</strong> атакующий.</li>
          <li><strong>Зона Синяя:</strong> защищающийся.</li>
        </ul>
      </section>
     
      <section class="mission-block">
        <h3>Контрольные точки</h3>
        <ul class="mission-list">
          <li>КТ1</li>
          <li>КТ2</li>
          <li>КТ3</li>
        </ul>
      </section>

      <section class="mission-block mission-block--special">
        <h3>Особые правила</h3>
        <ul class="mission-list">
          <li><strong>Засадный лес:</strong> Любая модель, находящаяся на тайле Леса, не может быть выбрана целью дальнобойной атаки с дистанции более 3 клеток.</li>
          <li><strong>Сторожевой холм:</strong> КТ3 — это тайл Горы. Модель на нём видит сквозь Лес для целей дальнобойной атаки (игнорирует правило «Засадный лес»).</li>
          <li><strong>Тайная тропа:</strong> В начале раунда защищающийся может переместить один маркер КП (кроме КТ3) на соседний тайл Леса.</li>
        </ul>
      </section>

      <section class="mission-block mission-block--points">
        <h3>Победные очки (в конце каждого раунда)</h3>
        <ul class="mission-list">
          <li>Контроль КТ1 — 1 очко.</li>
          <li>Контроль КТ2 — 1 очко.</li>
          <li>Контроль КТ3 — 2 очка.</li>
          <li><strong>В конце раунда 5:</strong> модель на КТ3, принадлежащая игроку, контролирующему также КТ1 или КТ2, приносит дополнительно +3 очка.</li>
        </ul>
      </section>

      <h3>Основное игровое поле</h3>
      <img src="./images/map3.png" alt="Основное игровое поле" style="width: 100%; border-radius: 8px; margin: 12px 0 24px 0; border: 1px solid var(--border);">

      <h3>Расстановка Атакующего и Защищающегося</h3>
      <img src="./images/map3rast.png" alt="Расстановка Атакующего и Защищающегося" style="width: 100%; border-radius: 8px; margin: 12px 0 24px 0; border: 1px solid var(--border);">

      <h3>Тайлы и подсказки</h3>
      <img src="./images/map3tiles.png" alt="Тайлы и подсказки" style="width: 100%; border-radius: 8px; margin: 12px 0 24px 0; border: 1px solid var(--border);">
    `
  },

  // --- БАТЛПЛАН 4: ДВЕ ВЫСОТЫ ---
  {
    id: 'battleplan-4',
    category: 'missions',
    categoryTitle: 'Правила миссий',
    subCategory: 'Книга Миссий',
    type: 'article',
    title: 'Батлплан 4 — «Две Высоты»',
    content: `
      <h2>Батлплан 4 — «Две Высоты»</h2>
      <p><strong>Суть:</strong> две горы по краям поля — захват и удержание вершин.</p>

      <section class="mission-block">
        <h3>Зоны выставления</h3>
        <ul class="mission-list">
          <li><strong>Зона Атакующий:</strong> Красный.</li>
          <li><strong>Зона Защищающийся:</strong> Синий.</li>
        </ul>
      </section>

      <section class="mission-block">
        <h3>Контрольные точки</h3>
        <ul class="mission-list">
          <li>КТ1</li>
          <li>КТ2</li>
          <li>КТ3</li>
        </ul>
      </section>

       <section class="mission-block mission-block--special">
        <h3>Особые правила</h3>
        <ul class="mission-list">
          <li><strong>Высотное превосходство:</strong> Модель на КТ1 (для атакующего) или КТ2 (для защищающегося) получает +1 к победным очкам за контроль этой точки (в дополнение к базовому).</li>
          <li><strong>Разделяющая линия:</strong> Речные тайлы нельзя переставлять или модифицировать фракционными способностями в этом батлплане.</li>
        </ul>
      </section>

      <section class="mission-block mission-block--points">
        <h3>Победные очки (в конце каждого раунда)</h3>
        <ul class="mission-list">
          <li>Контроль КТ1 — 1 очко.</li>
          <li>Контроль КТ2 — 1 очко.</li>
          <li>Контроль КТ3 — 1 очко.</li>
          <li><strong>Бонус:</strong> контроль всех трёх точек — дополнительно +2 очка.</li>
        </ul>
      </section>

      <h3>Основное игровое поле</h3>
      <img src="./images/map4.png" alt="Основное игровое поле" style="width: 100%; border-radius: 8px; margin: 12px 0 24px 0; border: 1px solid var(--border);">

      <h3>Расстановка Атакующего и Защищающегося</h3>
      <img src="./images/map4rast.png" alt="Расстановка Атакующего и Защищающегося" style="width: 100%; border-radius: 8px; margin: 12px 0 24px 0; border: 1px solid var(--border);">

      <h3>Тайлы и подсказки</h3>
      <img src="./images/map4tiles.png" alt="Тайлы и подсказки" style="width: 100%; border-radius: 8px; margin: 12px 0 24px 0; border: 1px solid var(--border);">
    `
  },

  // --- БАТЛПЛАН 5: ПРОРЫВ ---
  {
    id: 'battleplan-5',
    category: 'missions',
    categoryTitle: 'Правила миссий',
    subCategory: 'Книга Миссий',
    type: 'article',
    title: 'Батлплан 5 — «Прорыв»',
    content: `
      <h2>Батлплан 5 — «Прорыв»</h2>
      <p><strong>Суть:</strong> атакующий должен провести одну ключевую модель к клетке эвакуации на стороне противника. Защищающийся — не дать.</p>

       <section class="mission-block">
        <h3>Зоны выставления</h3>
        <ul class="mission-list">
          <li><strong>Зона Атакующий:</strong> Красный.</li>
          <li><strong>Зона Защищающийся:</strong> Синий.</li>
        </ul>
      </section>

     <section class="mission-block">
        <h3>Контрольные точки</h3>
        <p>Отсутствуют.</p>
      </section>

       <section class="mission-block mission-block--special">
        <h3>Особые правила</h3>
        <ul class="mission-list">
          <li><strong>Реликвия:</strong> Атакующий выбирает одну модель-Героя в своей армии — она несёт «Реликвию». Реликвия передаётся: если Герой погибает, союзная модель в смежной клетке может подобрать её действием (тратит 1 ОД).</li>
          <li><strong>Эвакуация:</strong> Если модель с Реликвией заканчивает свою активацию на клетке эвакуации — атакующий немедленно получает 3 победных очка, и в его зоне расстановки появляется новая реликвия (самая центральная точка).</li>
        </ul>
      </section>

      <section class="mission-block mission-block--points">
        <h3>Победные очки (в конце каждого раунда)</h3>
        <ul class="mission-list">
          <li><strong>Атакующий:</strong> 1 очко за каждую вражескую модель, уничтоженную в этом раунде.</li>
          <li><strong>Защищающийся:</strong> 1 очко за каждую модель атакующего, уничтоженную в этом раунде.</li>
          <li><strong>Защищающийся:</strong> +2 очка, если контролирует клетку эвакуации.</li>
          <li><strong>Атакующий:</strong> 3 очков за эвакуацию Реликвии (досрочный конец).</li>
        </ul>
      </section>

      <h3>Основное игровое поле</h3>
      <img src="./images/map5.png" alt="Основное игровое поле" style="width: 100%; border-radius: 8px; margin: 12px 0 24px 0; border: 1px solid var(--border);">

      <h3>Эвакуация</h3>
      <img src="./images/map5evok.png" alt="Эвакуация" style="width: 100%; border-radius: 8px; margin: 12px 0 24px 0; border: 1px solid var(--border);">

      <h3>Расстановка Атакующего и Защищающегося</h3>
      <img src="./images/map5rast.png" alt="Расстановка Атакующего и Защищающегося" style="width: 100%; border-radius: 8px; margin: 12px 0 24px 0; border: 1px solid var(--border);">

      <h3>Тайлы и подсказки</h3>
      <img src="./images/map5tiles.png" alt="Тайлы и подсказки" style="width: 100%; border-radius: 8px; margin: 12px 0 24px 0; border: 1px solid var(--border);">
    `
  },

  // --- БАТЛПЛАН 6: ИСТРЕБЛЕНИЕ ---
  {
    id: 'battleplan-6',
    category: 'missions',
    categoryTitle: 'Правила миссий',
    subCategory: 'Книга Миссий',
    type: 'article',
    title: 'Батлплан 6 — «Истребление»',
    content: `
      <h2>Батлплан 6 — «Истребление»</h2>
      <p><strong>Суть:</strong> открытая битва без точек — цель уничтожить как можно больше вражеских моделей. Но поле таит опасности.</p>

      <section class="mission-block">
        <h3>Зоны выставления</h3>
        <ul class="mission-list">
          <li><strong>Зона Атакующий:</strong> Красный.</li>
          <li><strong>Зона Защищающийся:</strong> Синий.</li>
        </ul>
      </section>

       <section class="mission-block">
        <h3>Контрольные точки</h3>
        <p>Отсутствуют.</p>
      </section>

      <section class="mission-block mission-block--special">
        <h3>Особые правила</h3>
        <ul class="mission-list">
          <li><strong>Огненный шторм:</strong> Начиная с раунда 2, в конце каждого раунда оба игрока бросают по 1 кубику. На результате 5+ один тайл Леса на стороне противника загорается — все модели на нём получают 2 урона, а тайл становится «Выжженной землёй» (открытая местность, Лес больше не даёт укрытия).</li>
          <li><strong>Героическая стойкость:</strong> Каждый Герой в этом батлплане получает +2 к ХП.</li>
          <li><strong>Награда:</strong> За уничтожение вражеского Героя — +3 очка (однократно за каждого Героя).</li>
        </ul>
      </section>

       <section class="mission-block mission-block--points">
        <h3>Победные очки (в конце каждого раунда)</h3>
        <ul class="mission-list">
          <li>1 очко за каждую вражескую модель, уничтоженную в этом раунде.</li>
          <li>+3 очка за уничтожение вражеского Героя.</li>
          <li>+1 очко, если на поле нет ни одной вражеской элитной модели в конце раунда. Если у оппонента не было элитных моделей, то бонус получается за убийство героя. Если у оппонента нет героя, то бонус получается, если уничтожить все модели оппонента.</li>
        </ul>
      </section>

      <h3>Основное игровое поле</h3>
      <img src="./images/map6.png" alt="Основное игровое поле" style="width: 100%; border-radius: 8px; margin: 12px 0 24px 0; border: 1px solid var(--border);">

      <h3>Расстановка Атакующего и Защищающегося</h3>
      <img src="./images/map6rast.png" alt="Расстановка Атакующего и Защищающегося" style="width: 100%; border-radius: 8px; margin: 12px 0 24px 0; border: 1px solid var(--border);">

      <h3>Тайлы и подсказки</h3>
      <img src="./images/map6tiles.png" alt="Тайлы и подсказки" style="width: 100%; border-radius: 8px; margin: 12px 0 24px 0; border: 1px solid var(--border);">
    `
  }
  ];
