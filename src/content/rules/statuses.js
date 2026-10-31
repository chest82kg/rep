// src/content/rules/statuses.js
// Статусы и эффекты.

export const STATUSES_DATA = [
  {
    id: 'rules-statuses',
    category: 'rules',
    categoryTitle: 'Основные правила',
    type: 'article',
    title: 'Статусы и эффекты',
    content: `
      <h2>Базовые статусы и эффекты</h2>
      <p>В ходе боя модели могут получать различные временные состояния, которые влияют на их характеристики, передвижение или активацию.</p>

      <div class="status-list">
        <article class="status-card">
          <h3>«Горение»</h3>
          <p class="status-source"><strong>Как накладывается:</strong> атака огнём, особые способности, тайлы лавы/костра.</p>
          <p class="status-effect"><strong>Эффект:</strong> в начале каждого раунда модель получает 1 урон.</p>
          <p class="status-queue"><strong>Очередь:</strong> если модель с «Горением» стоит в очереди на 4-й позиции и дальше («Тыл»), она дополнительно получает -1 к Попаданию до конца раунда.</p>
        </article>

        <article class="status-card">
          <h3>«Яд»</h3>
          <p class="status-source"><strong>Как накладывается:</strong> стрелы с ядом, укусы, особые клинки.</p>
          <p class="status-effect"><strong>Эффект:</strong> в конце раунда модель теряет 1 ХП.</p>
          <p class="status-queue"><strong>Очередь:</strong> если модель с «Ядом» последняя в очереди, она получает маркер «Истощение» автоматически — в следующем раунде у неё на 1 ОД меньше.</p>
        </article>

        <article class="status-card status-card-control">
          <h3>«Окаменение»</h3>
          <p class="status-source"><strong>Как накладывается:</strong> способности вроде «Каменный взгляд», заклинания, руны.</p>

          <div class="status-effect">
            <strong>Эффект:</strong>
            <ul>
              <li>-2 к Движению.</li>
              <li>-1 к Попаданию.</li>
              <li>Нельзя входить в стойки.</li>
            </ul>
          </div>
        </article>

        <article class="status-card status-card-physical">
          <h3>«Скольжение»</h3>
          <p class="status-source"><strong>Как накладывается:</strong> лёд, масло, дождь, особые эффекты.</p>
          <p class="status-effect"><strong>Эффект:</strong> при любом перемещении (даже на 1 клетку) модель автоматически тратит дополнительно 1 ОД.</p>
          <p class="status-queue"><strong>Очередь:</strong> если модель активируется первой в очереди, она может объявить «Упор» (1 ОД): в этом ходу она не получает штраф за скольжение, но не может атаковать.</p>
        </article>

        <article class="status-card">
          <h3>«Кровотечение»</h3>
          <p class="status-source"><strong>Как накладывается:</strong> режущее оружие, критические удары, особые эффекты.</p>
          <p class="status-effect"><strong>Эффект:</strong> модель теряет 1 ХП в конце своей активации.</p>
          <p class="status-note"><strong>Дополнительно:</strong> если модель с «Кровотечением» использует «Спешку», она получает ещё 1 урон в конце активации.</p>
        </article>

        <article class="status-card status-card-control">
          <h3>«Путы»</h3>
          <p class="status-source"><strong>Как накладывается:</strong> сети, корни, ловушки, особые способности.</p>
          <p class="status-effect"><strong>Эффект:</strong> модель не может переместиться в этом раунде.</p>
          <p class="status-queue"><strong>Очередь:</strong> модель с «Путами» автоматически считается последней в своей очереди для целей штрафов, даже если стояла первой. То есть она получает штраф «Замыкания» (-1 к Защите), даже если ходит первой.</p>
        </article>

        <article class="status-card status-card-control">
          <h3>«Глухота»</h3>
          <p class="status-source"><strong>Как накладывается:</strong> оглушающие эффекты, взрывы, магия.</p>
          <p class="status-effect"><strong>Эффект:</strong> модель не может использовать фракционные ОД в этом раунде.</p>
          <p class="status-queue"><strong>Очередь:</strong> если модель стоит на 4-й позиции в очереди и позже, она может использовать фракционные ОД, но это требует на 1 фракционного ОД больше.</p>
        </article>
      </div>
    `
  }
];