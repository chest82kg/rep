// src/content/missions/oath-types.js
// Система «Клятва»: виды клятв.

export const OATH_TYPES_DATA = [
  {
    id: 'bet-monster',
    category: 'missions',
    categoryTitle: 'Правила миссий',
    subCategory: 'Система "Клятва"',
    type: 'article',
    title: 'Звериная клятва',
    content: `
      <h2>Звериные клятвы</h2>

      <p class="oath-warning oath-warning-intro"><em>Цена при нарушении: -3 победных очка за каждую несдержанную Звериную клятву.</em></p>

      <div class="oath-list">
        <article class="oath-card">
          <h3>«Бич высот» <span class="oath-cost">2 МИ</span></h3>
          <p class="oath-condition"><strong>Условие:</strong> +1 ОП за каждую вражескую модель, уничтоженную атаками монстра по врагам на тайлах 2 уровня и выше. +2 ОП, если монстр уничтожил Героя.</p>
          <p class="oath-minimum"><strong>Минимум:</strong> монстр должен уничтожить минимум 2 модели за игру.</p>
        </article>

        <article class="oath-card">
          <h3>«Волынщик» <span class="oath-cost">3 МИ</span></h3>
          <p class="oath-condition"><strong>Условие:</strong> +1 ОП в конце каждого раунда, если ваш монстр стоит на контрольной точке или тайле высоты 2 и выше, доминируемом вами.</p>
          <p class="oath-minimum"><strong>Минимум:</strong> монстр должен удерживать точку или высоту минимум 2 раунда.</p>
        </article>

        <article class="oath-card">
          <h3>«Крушитель» <span class="oath-cost">2 МИ</span></h3>
          <p class="oath-condition"><strong>Условие:</strong> +1 ОП за каждый сдвиг слоя тайла, совершённый монстром, и +2 ОП за каждую вражескую модель, уничтоженную эффектом «Пролом» или «Бросок глыбы».</p>
          <p class="oath-minimum"><strong>Минимум:</strong> монстр должен совершить минимум 3 сдвига слоя за игру.</p>
        </article>
      </div>
    `
  },

  {
    id: 'bet-bounty',
    category: 'missions',
    categoryTitle: 'Правила миссий',
    subCategory: 'Система "Клятва"',
    type: 'article',
    title: 'Охота за головами',
    content: `
      <h2>Клятвы: Охота за головами</h2>

      <div class="oath-list">
        <article class="oath-card">
          <h3>«Головы в корзину» <span class="oath-cost">1 МИ</span></h3>
          <p class="oath-condition"><strong>Условие:</strong> +1 ОП за каждую уничтоженную вами вражескую модель.</p>
          <p class="oath-minimum"><strong>Минимум:</strong> уничтожить минимум 3 модели за игру.</p>
        </article>

        <article class="oath-card">
          <h3>«Скальп Героя» <span class="oath-cost">2 МИ</span></h3>
          <p class="oath-condition"><strong>Условие:</strong> +3 ОП за уничтожение вражеского Героя, +1 ОП одноразово за первый нанесённый Герою урон.</p>
          <p class="oath-minimum"><strong>Минимум:</strong> Герой противника должен получить минимум 3 урона за игру.</p>
        </article>
      </div>
    `
  },

  {
    id: 'bet-control',
    category: 'missions',
    categoryTitle: 'Правила миссий',
    subCategory: 'Система "Клятва"',
    type: 'article',
    title: 'Контроль точек',
    content: `
      <h2>Клятвы: Контроль точек</h2>

      <div class="oath-list">
        <article class="oath-card">
          <h3>«Знаменосец» <span class="oath-cost">3 МИ</span></h3>
          <p class="oath-condition"><strong>Условие:</strong> +2 ОП за каждый раунд, когда вы контролируете две и более контрольных точек одновременно.</p>
          <p class="oath-minimum"><strong>Минимум:</strong> удержать 2+ точки минимум 2 раунда.</p>
          <p class="oath-note"><strong>Особенность:</strong> если точку удерживает модель с дальнобойным оружием, она не может совершать дальнобойные атаки.</p>
        </article>

        <article class="oath-card">
          <h3>«Передовой пост» <span class="oath-cost">1 МИ</span></h3>
          <p class="oath-condition"><strong>Условие:</strong> +1 ОП за каждый раунд, когда вы контролируете хотя бы одну точку.</p>
          <p class="oath-minimum"><strong>Минимум:</strong> контроль хотя бы в 1 раунде.</p>
        </article>
      </div>
    `
  },

  {
    id: 'bet-terra',
    category: 'missions',
    categoryTitle: 'Правила миссий',
    subCategory: 'Система "Клятва"',
    type: 'article',
    title: 'Терраформирование',
    content: `
      <h2>Клятвы: Терраформирование</h2>

      <div class="oath-list">
        <article class="oath-card">
          <h3>«Хозяин камня» <span class="oath-cost">2 МИ</span></h3>
          <p class="oath-condition"><strong>Условие:</strong> +1 ОП за каждый сдвиг слоя тайла, совершённый любой вашей моделью или способностью.</p>
          <p class="oath-minimum"><strong>Минимум:</strong> совершить минимум 4 сдвига слоя за игру.</p>
        </article>

        <article class="oath-card">
          <h3>«Чертёж местности» <span class="oath-cost">1 МИ</span></h3>
          <p class="oath-condition"><strong>Условие:</strong> +2 ОП, если в конце игры на поле есть минимум 3 тайла высотой 3.</p>
          <p class="oath-minimum"><strong>Минимум:</strong> минимум 1 тайл высотой 3 на поле в конце игры.</p>
        </article>
      </div>
    `
  },

  {
    id: 'bet-maneuver',
    category: 'missions',
    categoryTitle: 'Правила миссий',
    subCategory: 'Система "Клятва"',
    type: 'article',
    title: 'Маневр и выживание',
    content: `
      <h2>Клятвы: Манёвр и выживание</h2>

      <div class="oath-list">
        <article class="oath-card">
          <h3>«Марш-бросок» <span class="oath-cost">1 МИ</span></h3>
          <p class="oath-condition"><strong>Условие:</strong> +2 ОП, если одна из ваших моделей в любой момент игры находится на дальней половине поля (или в зоне развертывания противника).</p>
          <p class="oath-minimum"><strong>Минимум:</strong> хотя бы одна модель достигла края поля или зоны развертывания противника.</p>
        </article>

        <article class="oath-card">
          <h3>«Стена до конца» <span class="oath-cost">2 МИ</span></h3>
          <p class="oath-condition"><strong>Условие:</strong> +1 ОП за каждый раунд, в котором ни одна ваша модель не погибла.</p>
          <p class="oath-minimum"><strong>Минимум:</strong> продержаться минимум 2 раунда без потерь.</p>
        </article>
      </div>
    `
  },

  {
    id: 'bet-reserve',
    category: 'missions',
    categoryTitle: 'Правила миссий',
    subCategory: 'Система "Клятва"',
    type: 'article',
    title: 'Резерв',
    content: `
      <h2>Клятвы: Резерв</h2>

      <div class="oath-list oath-list-single">
        <article class="oath-card">
          <h3>Резерв <span class="oath-cost">1 МИ</span></h3>
          <p class="oath-condition">Если у вас осталось 1 МИ и ничего из текущего списка не подходит, вы можете купить <strong>«Резерв»</strong> — нераскрытую клятву.</p>
          <p class="oath-note"><strong>Правило:</strong> в любой момент до конца 2-го раунда вы объявляете любую клятву стоимостью до 2 МИ из общего списка (пороговые значения для этой клятвы считаются с самого начала игры).</p>
        </article>
      </div>
    `
  }
];