export const GOBLINS_FACTIONS_DATA = [
  {
    id: 'faction-goblins-general',
    category: 'factions',
    categoryTitle: 'Фракции',
    faction: 'Арафия - Песчаные Гоблины',
    type: 'article',
    title: 'Общие правила',
    content: `
  <div class="faction-kicker">Арафия · Песчаные Гоблины</div>

  <div class="faction-summary">
    <p>Песчаные гоблины — быстрые, многочисленные и коварные. Там, где гномы стоят стеной, гоблины текут через пустыню как вода: обтекают, кусают, отступают, возвращаются. Каждая модель дешёвая и хрупкая, но их много, и они умеют использовать ландшафт противника против него самого.</p>
  </div>

  <div class="faction-rule-grid">
    <section class="faction-rule-card faction-rule-card--ability">
      <h3>Фракционная способность — «Зыбкий песок»</h3>
      <p>Любая модель песчаных гоблинов получает <strong>+1 к Движению</strong>, если находится на тайле Реки или Леса. Гоблины не видят разницы между рекой и песчаной стремниной — для них это родная среда.</p>
      <p class="faction-note"><em>Дополнительно:</em> игнорируют штраф за тайл Реки при перемещении (1 очко движения за клетку вместо 2). Если Река многоуровневая (углубление) — штраф 2 очка вместо 3.</p>
    </section>

    <section class="faction-rule-card faction-rule-card--pool">
      <h3>Фракционный пул — «Жадность»</h3>
      <p>Гоблинский пул состоит из 4 фракционных ОД «Жадность». ОД подкладывается к приказу в момент активации и усиливает его:</p>
    </section>
  </div>

  <table style="width:100%; border-collapse: collapse; margin: 16px 0; background: var(--bg-panel);">
    <thead>
      <tr style="border-bottom: 2px solid var(--border); text-align: left;">
        <th style="padding: 8px;">Приказ</th>
        <th style="padding: 8px;">Эффект «Жадности»</th>
      </tr>
    </thead>
    <tbody>
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 8px;"><strong>Марш</strong></td>
        <td style="padding: 8px;">Модель может переместиться через вражеские модели (не останавливаясь на их клетках) до конца этого перемещения</td>
      </tr>
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 8px;"><strong>Удар</strong></td>
        <td style="padding: 8px;">+3 к Урону, но после атаки модель обязана немедленно переместиться на 1 клетку в любом направлении (это вызывает атаки по возможности, реакции и т.д.)</td>
      </tr>
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 8px;"><strong>Защита</strong></td>
        <td style="padding: 8px;">При получении урона или сбросе кубиков модель получает +1 к броне в текущую активацию</td>
      </tr>
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 8px;"><strong>Стойка</strong></td>
        <td style="padding: 8px;">Модель входит в клановую стойку бесплатно (без траты ОД)</td>
      </tr>
      <tr>
        <td style="padding: 8px;"><strong>Спешка</strong></td>
        <td style="padding: 8px;">В дополнение к удвоенному действию модель может после него совершить одно перемещение на 1 клетку (бесплатный шаг)</td>
      </tr>
    </tbody>
  </table>

  <section class="faction-rule-card faction-rule-card--wide">
    <h3>Фракционные территории</h3>
  </section>

  <table style="width:100%; border-collapse: collapse; margin: 16px 0; background: var(--bg-panel);">
    <thead>
      <tr style="border-bottom: 2px solid var(--border); text-align: left;">
        <th style="padding: 8px;">Территория</th>
        <th style="padding: 8px;">Размещение</th>
        <th style="padding: 8px;">Эффект</th>
      </tr>
    </thead>
    <tbody>
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 8px;"><strong>Оазис</strong></td>
        <td style="padding: 8px;">Сопряжен с тайлом Реки</td>
        <td style="padding: 8px;">Все гоблинские модели в радиусе 2 клеток получают +1 к броне. Вражеские модели в радиусе 2 клеток получают −1 к Движению</td>
      </tr>
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 8px;"><strong>Слюдовый Грот</strong></td>
        <td style="padding: 8px;">Сопряжен с любым тайлом</td>
        <td style="padding: 8px;">Вражеские модели в радиусе 1 клетки в начале своей следующей активации получают 1 урон (без учета брони). Действует один раз на модель за раунд</td>
      </tr>
      <tr>
        <td style="padding: 8px;"><strong>Костяной алтарь</strong></td>
        <td style="padding: 8px;">Сопряжен с тайлом Леса</td>
        <td style="padding: 8px;">В конце каждого раунда, если алтарь оспаривается (хотя бы одна дружественная модель в радиусе 1) или контролируется, игрок получает 1 ОД «Жадность» в резерв</td>
      </tr>
    </tbody>
  </table>
`
  },

 // ==========================================
  // КЛАН 1: КЛАН СКОРПИОНОВ (ПЕСЧАНЫЕ ГОБЛИНЫ)
  // ==========================================
  {
    id: 'faction-goblins-clan1',
    category: 'factions',
    categoryTitle: 'Фракции',
    faction: 'Арафия - Песчаные Гоблины',
    type: 'article',
    title: 'Клан 1 — Клан Скорпионов',
    content: `
      <div class="faction-kicker">Арафия · КЛАН СКОРПИОНОВ</div>

<div class="faction-summary">
  <p><strong>Стиль:</strong> ядовитые уколы, численное превосходство, изматывание врага. Вы окружаете противника мелкими быстрыми моделями и отравляете их, заставляя терять здоровье постепенно. Не выигрываете в прямом столкновении — выигрываете в затяжной войне.</p>
</div>

<div class="faction-rule-grid">
  <section class="faction-rule-card faction-rule-card--ability faction-rule-card--wide">
    <h3>Клановая способность — «Отравленное жало»</h3>
    <p>Каждый раз, когда модель клана Скорпионов наносит хотя бы 1 урон в ближнем бою (не базовый урон), цель получает маркер «Яд». В конце активации отравленной модели она получает 1 урон (Броня не блокирует этот урон). Маркер снимается в конце активации модели.</p>
    <ul class="faction-rule-list">
      <li>Яд не складывается.</li>
      <li>Если модель с маркером «Яд» получает лечение, то вместо него — маркер снимается.</li>
      <li>Базовые отряды Скорпионов наносят яд только в ближнем бою. Элитные и герои — и в ближнем, и в стрелковом.</li>
    </ul>
  </section>

  <section class="faction-rule-card faction-rule-card--stance faction-rule-card--wide">
    <h3>Клановая стойка — «Загон»</h3>
    <p>Модель в стойке «Загон»:</p>
    <ul class="faction-rule-list">
      <li>Не может атаковать.</li>
      <li>Может перемещаться (базовое действие «Перемещение»).</li>
      <li><strong>Кольцо:</strong> Каждый раз, когда вражеская модель в радиусе 3 клеток проводит атаку по любой другой цели (кроме модели в «Загоне»), эта модель в «Загоне» немедленно проводит бесплатную ответную атаку (наносит базовый урон, без модификаторов за флаг/тыл). Срабатывает один раз за вражескую модель за её активацию.</li>
      <li><strong>Слаженная стая:</strong> Если две и более модели клана Скорпионов находятся в стойке «Загон» в радиусе 2 клеток друг от друга, их ответные удары получают +1 к урону.</li>
    </ul>
  </section>

  <section class="faction-rule-card faction-rule-card--pool faction-rule-card--wide">
    <h3>Клановый пул — 4 жетона «Жадность»</h3>
  </section>
</div>

<h2 class="roster-heading">Состав клана</h2>

      <h3>Базовые отряды (3 кубика)</h3>

      <!-- 1. Укус-гоблины -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Укус-гоблины</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-basic">Базовый (3 куб.)</span>
            <span class="aos-badge-pts">100 очков</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">6</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Движение</span><span class="aos-stat-value">5</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">2</span></div>
        </div>
        <div class="aos-weapons-section">
          <div class="aos-section-title">Вооружение</div>
          <div class="aos-weapon-item">
            <div class="aos-weapon-header"><span class="aos-weapon-name">Отравленный стилет</span><span class="aos-weapon-type">Ближний бой</span></div>
            <div class="aos-weapon-stats"><span>Порог: <strong>2+</strong></span><span>Урон: <strong>2</strong></span><span>Теги: <span class="aos-tag">[Точное]</span></span></div>
          </div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Особое: Стая</div>
            <div class="aos-ability-text">При выставлении армии занимают 2 клетки одновременно — выставляются парами (две модели на смежных клетках). Если одна из пары погибает, вторая получает +1 к урону до конца игры.</div>
          </div>
        </div>
      </div>

      <!-- 2. Копьеметатели -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Копьеметатели</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-basic">Базовый (3 куб.)</span>
            <span class="aos-badge-pts">80 очков</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">6</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Движение</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">2</span></div>
        </div>
        <div class="aos-weapons-section">
          <div class="aos-section-title">Вооружение (выберите один вариант)</div>
          <div class="aos-weapon-item" data-weapon-option="1">
            <div class="aos-weapon-header"><span class="aos-weapon-name">Легкое копье</span><span class="aos-weapon-type">Ближний бой</span></div>
            <div class="aos-weapon-stats"><span>Порог: <strong>3+</strong></span><span>Урон: <strong>3</strong></span><span>Теги: <em>нет</em></span></div>
          </div>
          <div style="text-align: center; font-weight: bold; color: var(--accent); margin: 6px 0; font-size: 0.9rem;">— ИЛИ —</div>
          <div class="aos-weapon-item" data-weapon-option="2">
            <div class="aos-weapon-header"><span class="aos-weapon-name">Трубковые дротики</span><span class="aos-weapon-type">Дальний бой (Дальность 4)</span></div>
            <div class="aos-weapon-stats"><span>Порог: <strong>4+</strong></span><span>Урон: <strong>2</strong></span><span>Теги: <em>нет</em></span></div>
          </div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Особое: Отравленные дротики</div>
            <div class="aos-ability-text">Дальнобойная Атака Копьеметателей накладывает маркер «Яд» при нанесении урона (исключение из правила базовых отрядов). Лес не блокирует их стрельбу (дротики летят по навесной траектории), но Гора блокирует как обычно.</div>
          </div>
        </div>
      </div>

      <h3>Элитные отряды (4 кубика)</h3>

      <!-- 3. Скорпион-гоблин -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Скорпион-гоблин</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-elite">Элита (4 куб.)</span>
            <span class="aos-badge-pts">160 очков</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">9</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Движение</span><span class="aos-stat-value">5</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">3</span></div>
        </div>
        <div class="aos-weapons-section">
          <div class="aos-section-title">Вооружение</div>
          <div class="aos-weapon-item">
            <div class="aos-weapon-header"><span class="aos-weapon-name">Жалящий меч</span><span class="aos-weapon-type">Ближний бой</span></div>
            <div class="aos-weapon-stats"><span>Порог: <strong>2+</strong></span><span>Урон: <strong>4</strong></span><span>Теги: <span class="aos-tag">[Пробой 1]</span></span></div>
          </div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Особое: Засадный удар</div>
            <div class="aos-ability-text">Если модель атакует в тот же ход, когда вошла в контакт с врагом, она получает +2 к Урону.</div>
          </div>
          <div class="aos-ability">
            <div class="aos-ability-title">Особое: Хвост-жало</div>
            <div class="aos-ability-text">При успешной атаке ближнего боя по цели с ядом +1 урон. Маркер «Яд» накладывается как обычно.</div>
          </div>
        </div>
      </div>

      <!-- 4. Зыбучий Ловец -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Зыбучий Ловец</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-elite">Элита (4 куб.)</span>
            <span class="aos-badge-pts">155 очков</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">9</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Движение</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">3</span></div>
        </div>
        <div class="aos-weapons-section">
          <div class="aos-section-title">Вооружение</div>
          <div class="aos-weapon-item">
            <div class="aos-weapon-header"><span class="aos-weapon-name">Песчаный тесак</span><span class="aos-weapon-type">Ближний бой</span></div>
            <div class="aos-weapon-stats"><span>Порог: <strong>3+</strong></span><span>Урон: <strong>4</strong></span><span>Теги: <span class="aos-tag">[Пробой 1]</span></span></div>
          </div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Особое: Песчаная ловушка (1 ОД)</div>
            <div class="aos-ability-text">Модель не перемещается, а зарывается в землю на своей клетке до конца раунда: не может быть выбрана целью боя; враг, заканчивающий перемещение в смежной клетке, получает 2 урона (броня учитывается) и маркер «Яд». При выходе из ловушки (за жетон «Стойка») автоматически переходит в «Атакующую» стойку и получает +2 к урону на первую атаку.</div>
          </div>
        </div>
      </div>

      <h3>Герои (5 кубиков)</h3>

      <!-- 5. Шахрит Скорпионий Хвост -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Шахрит Скорпионий Хвост</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-hero">Герой (5 куб.)</span>
            <span class="aos-badge-pts">255 очков</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">14</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Движение</span><span class="aos-stat-value">5</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">4</span></div>
        </div>
        <div class="aos-weapons-section">
          <div class="aos-section-title">Вооружение (выберите один вариант)</div>
          <div class="aos-weapon-item" data-weapon-option="1">
            <div class="aos-weapon-header"><span class="aos-weapon-name">Когтистая рапира</span><span class="aos-weapon-type">Ближний бой</span></div>
            <div class="aos-weapon-stats"><span>Порог: <strong>2+</strong></span><span>Урон: <strong>5</strong></span><span>Теги: <span class="aos-tag">[Пробой 2], [Оглушение]</span></span></div>
          </div>
          <div style="text-align: center; font-weight: bold; color: var(--accent); margin: 6px 0; font-size: 0.9rem;">— ИЛИ —</div>
          <div class="aos-weapon-item" data-weapon-option="2">
            <div class="aos-weapon-header"><span class="aos-weapon-name">Скорпионий арбалет</span><span class="aos-weapon-type">Дальний бой (Дальность 4)</span></div>
            <div class="aos-weapon-stats"><span>Порог: <strong>3+</strong></span><span>Урон: <strong>4</strong></span><span>Теги: <span class="aos-tag">[Пробой 1]</span></span></div>
          </div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Особое</div>
            <div class="aos-ability-text"><strong>Смертельный яд:</strong> Яд Шахрита наносит 2 урона в начале активации. Все атаки Шахрита накладывают яд.<br><strong>Кольцо смерти (Аура 3 клетки):</strong> Враги в ауре с маркером «Яд» не могут использовать действия «Блок» и «Глухая оборона».</div>
          </div>
        </div>
      </div>
    `
  }, 

   // ==========================================
  // КЛАН 2: КЛАН БАРХАНОВ (ПЕСЧАНЫЕ ГОБЛИНЫ)
  // ==========================================
  {
    id: 'faction-goblins-clan2',
    category: 'factions',
    categoryTitle: 'Фракции',
    faction: 'Арафия - Песчаные Гоблины',
    type: 'article',
    title: 'Клан 2 — Клан Барханов',
    content: `
      <div class="faction-kicker">Арафия · КЛАН БАРХАНОВ</div>

<div class="faction-summary">
  <p><strong>Стиль:</strong> скорость, манёвр, удар-отступление. Вы проноситесь через поле, бьёте там, где враг не готов, и исчезаете, прежде чем он успевает ответить. Самый быстрый клан в игре, но самый хрупкий.</p>
</div>

<div class="faction-rule-grid">
  <section class="faction-rule-card faction-rule-card--ability faction-rule-card--wide">
    <h3>Клановая способность — «Песчаный вихрь»</h3>
    <p>Один раз за раунд любая модель клана Барханов может переместиться после атаки на количество клеток, равное половине её Движения (округление вверх).</p>
    <ul class="faction-rule-list">
      <li>Работает и в ближнем, и в дальнем бою.</li>
      <li>Перемещение происходит по общим правилам (штрафы за ландшафт учитываются, проходимость сквозь врагов закрыта, если не активны специальные эффекты).</li>
      <li>Сохраняет стойки «Атакующая» и «Защищающаяся». Из клановой стойки «Вихрь» модель при отступлении сбрасывается в «Нейтральную».</li>
    </ul>
  </section>

  <section class="faction-rule-card faction-rule-card--stance">
    <h3>Клановая стойка — «Вихрь»</h3>
    <p>Модель в стойке «Вихрь»:</p>
    <ul class="faction-rule-list">
      <li>Может атаковать и перемещаться.</li>
      <li><strong>Перекати-поле:</strong> При перемещении модель может проходить сквозь клетки с вражескими моделями (как при действии «Марш» с жетоном «Жадность», но бесплатно). Каждой вражеской модели, через которую пройдено, наносится 1 автоматический урон (без учета брони). Не более 1 раза за модель за активацию.</li>
      <li><strong>Песчаная завеса:</strong> Вражеские модели не могут проводить дальнобойные атаки по модели в «Вихре», если дистанция до неё превышает 3 клетки.</li>
    </ul>
  </section>

  <section class="faction-rule-card faction-rule-card--pool">
    <h3>Клановый пул — 5 жетонов «Жадность»</h3>
  </section>
</div>

<h2 class="roster-heading">Состав клана</h2>

      <h3>Базовые отряды (3 кубика)</h3>

      <!-- 1. Песчаные Бегуны -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Песчаные Бегуны</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-basic">Базовый (3 куб.)</span>
            <span class="aos-badge-pts">80 очков</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">7</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Движение</span><span class="aos-stat-value">5</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">2</span></div>
        </div>
        <div class="aos-weapons-section">
          <div class="aos-section-title">Вооружение</div>
          <div class="aos-weapon-item">
            <div class="aos-weapon-header"><span class="aos-weapon-name">Песчаные сабли</span><span class="aos-weapon-type">Ближний бой</span></div>
            <div class="aos-weapon-stats"><span>Порог: <strong>3+</strong></span><span>Урон: <strong>3</strong></span><span>Теги: <span class="aos-tag">[Точное]</span></span></div>
          </div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Особое: Скорость ветра</div>
            <div class="aos-ability-text">При базовом «Перемещении» Бегуны всегда тратят 1 очко движения за клетку на любом ландшафте (игнорируют штрафы Леса, Реки и Гор).</div>
          </div>
        </div>
      </div>

      <!-- 2. Верблюжьи Наездники -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Верблюжьи Наездники</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-basic">Базовый (3 куб.)</span>
            <span class="aos-badge-pts">90 очков</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">7</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Движение</span><span class="aos-stat-value">5</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">2</span></div>
        </div>
        <div class="aos-weapons-section">
          <div class="aos-section-title">Вооружение</div>
          <div class="aos-weapon-item">
            <div class="aos-weapon-header"><span class="aos-weapon-name">Наездническое копье</span><span class="aos-weapon-type">Ближний бой</span></div>
            <div class="aos-weapon-stats"><span>Порог: <strong>3+</strong></span><span>Урон: <strong>3</strong></span><span>Теги: <span class="aos-tag">[Пробой 1]</span></span></div>
          </div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Особое: Сброс</div>
            <div class="aos-ability-text">При успешном действии «Прорыв» (из стойки «Атакующая») отбрасывают вражескую модель на 2 клетки вместо 1. Если отбросить некуда — наносят +2 дополнительных урона (вместо +1). При этом Наездники получают +1 к Броне до конца раунда.</div>
          </div>
        </div>
      </div>

      <h3>Элитные отряды (4 кубика)</h3>

      <!-- 3. Барханный Стрелок -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Барханный Стрелок</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-elite">Элита (4 куб.)</span>
            <span class="aos-badge-pts">170 очков</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">9</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Движение</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">2</span></div>
        </div>
        <div class="aos-weapons-section">
          <div class="aos-section-title">Вооружение</div>
          <div class="aos-weapon-item">
            <div class="aos-weapon-header"><span class="aos-weapon-name">Длинный составной лук</span><span class="aos-weapon-type">Дальний бой (Дальность 6)</span></div>
            <div class="aos-weapon-stats"><span>Порог: <strong>2+</strong></span><span>Урон: <strong>4</strong></span><span>Теги: <span class="aos-tag">[Пробой 1]</span></span></div>
          </div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Особое: Снайпер барханов</div>
            <div class="aos-ability-text">Дальнобойная Атака на дистанции 4+ клеток наносит +1 к урону. Лес не блокирует видимость. Гора блокирует только если цель находится ниже атакующего. Стрельба с многоуровневой Горы дает стандартный бонус +2 к урону за уровень.</div>
          </div>
        </div>
      </div>

      <!-- 4. Вихревой Клинок -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Вихревой Клинок</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-elite">Элита (4 куб.)</span>
            <span class="aos-badge-pts">165 очков</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">9</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Движение</span><span class="aos-stat-value">5</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">3</span></div>
        </div>
        <div class="aos-weapons-section">
          <div class="aos-section-title">Вооружение</div>
          <div class="aos-weapon-item">
            <div class="aos-weapon-header"><span class="aos-weapon-name">Парные парфянские клинки</span><span class="aos-weapon-type">Ближний бой</span></div>
            <div class="aos-weapon-stats"><span>Порог: <strong>2+</strong></span><span>Урон: <strong>4</strong></span><span>Теги: <span class="aos-tag">[Пробой 1]</span></span></div>
          </div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Особое: Танец клинков</div>
            <div class="aos-ability-text">Находясь в стойке «Вихрь», Вихревой Клинок может нанести атаку по каждой вражеской модели, через которую он прошёл во время перемещения в эту активацию. Каждая такая атака не тратит отдельных ОД (является частью действия «Перемещение»). Лимит: не более 3 целей за активацию.</div>
          </div>
        </div>
      </div>

      <h3>Герои (5 кубиков)</h3>

      <!-- 5. Рашад Золотой Вихрь -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Рашад Золотой Вихрь</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-hero">Герой (5 куб.)</span>
            <span class="aos-badge-pts">265 очков</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">14</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Движение</span><span class="aos-stat-value">5</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">3</span></div>
        </div>
        <div class="aos-weapons-section">
          <div class="aos-section-title">Вооружение (выберите один вариант)</div>
          <div class="aos-weapon-item" data-weapon-option="1">
            <div class="aos-weapon-header"><span class="aos-weapon-name">Золотой аминан</span><span class="aos-weapon-type">Ближний бой</span></div>
            <div class="aos-weapon-stats"><span>Порог: <strong>2+</strong></span><span>Урон: <strong>5</strong></span><span>Теги: <span class="aos-tag">[Пробой 2], [Точное]</span></span></div>
          </div>
          <div style="text-align: center; font-weight: bold; color: var(--accent); margin: 6px 0; font-size: 0.9rem;">— ИЛИ —</div>
          <div class="aos-weapon-item" data-weapon-option="2">
            <div class="aos-weapon-header"><span class="aos-weapon-name">Пустынный лук</span><span class="aos-weapon-type">Дальний бой (Дальность 4)</span></div>
            <div class="aos-weapon-stats"><span>Порог: <strong>2+</strong></span><span>Урон: <strong>4</strong></span><span>Теги: <span class="aos-tag">[Пробой 1]</span></span></div>
          </div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Особое</div>
            <div class="aos-ability-text"><strong>Невидимый в песках:</strong> Рашад может использовать способность «Песчаный вихрь» (перемещение после атаки) дважды за активацию (атаковать, отступить, атаковать снова, отступить снова).<br><strong>Ветер пустыни (1 ОД):</strong> Один раз за раунд Рашад выбирает вражескую модель в радиусе 4 клеток и отбрасывает её на 2 клетки в любом выбранном направлении (песчаный шквал сбивает с ног).</div>
          </div>
        </div>
      </div>
    `
  }, 

    // ==========================================
  // КЛАН 3: КЛАН КОСТЯНЫХ ШАМАНОВ (ПЕСЧАНЫЕ ГОБЛИНЫ)
  // ==========================================
  {
    id: 'faction-goblins-clan3',
    category: 'factions',
    categoryTitle: 'Фракции',
    faction: 'Арафия - Песчаные Гоблины',
    type: 'article',
    title: 'Клан 3 — Клан Костяных Шаманов',
    content: `
      <div class="faction-kicker">Арафия · КЛАН КОСТЯНЫХ ШАМАНОВ</div>

<div class="faction-summary">
  <p><strong>Стиль:</strong> магия, ловушки, контроль поля и чужих моделей. Вы не убиваете врага напрямую — вы заставляете ландшафт убить его за вас. Самый медленный из кланов гоблинов, но самый хитрый.</p>
</div>

<div class="faction-rule-grid">
  <section class="faction-rule-card faction-rule-card--ability faction-rule-card--wide">
    <h3>Клановая способность — «Песчаное проклятие»</h3>
    <p>В начале каждого раунда (до активации моделей) игрок может наложить до 2 проклятий на вражеские модели или тайлы ландшафта. Проклятия действуют до конца раунда.</p>
    <ul class="faction-rule-list">
      <li><strong>Зыбь (Тайл Ландшафта):</strong> Модель считается находящейся на тайле Реки для целей перемещения, даже если стоит на суше. Не складывается с реальной Рекой.</li>
      <li><strong>Слепота (Вражеская модель в пределах 4 клеток):</strong> Модель не может проводить дальнобойные атаки на дистанции более 2 клеток.</li>
      <li><strong>Истощение (Вражеская модель в пределах 4 клеток):</strong> Модель теряет 1 ХП в начале своей активации.</li>
      <li><strong>Песчаная буря (Тайл ландшафта):</strong> Тайл становится непроходимым для всех моделей (своих и чужих) до конца раунда. Модели на нём в момент наложения получают 1 урон и остаются в ловушке до конца раунда.</li>
    </ul>
    <p class="faction-note"><em>Проклятия нельзя накладывать на Героев (кроме «Слепоты» — на них можно).</em></p>
  </section>

  <section class="faction-rule-card faction-rule-card--stance">
    <h3>Клановая стойка — «Тотем»</h3>
    <p>Модель в стойке «Тотем»:</p>
    <ul class="faction-rule-list">
      <li>Не может перемещаться и атаковать.</li>
      <li><strong>Костяная аура:</strong> все вражеские модели в радиусе 2 клетки получают −1 к броне.</li>
      <li><strong>Шаманский путь:</strong> если в радиусе 2 клетки от модели в «Тотеме» находится хотя бы одна союзная модель клана Костяных Шаманов, последняя получает +1 к стату Попадание.</li>
      <li>Модель в «Тотеме» может быть перенесена на 1 клетку в любом направлении другой союзной моделью клана, заканчивающей перемещение в смежной клетке (бесплатный толчок, не тратит ОД у той модели).</li>
    </ul>
  </section>

  <section class="faction-rule-card faction-rule-card--pool">
    <h3>Клановый пул — 3 жетона «Жадность»</h3>
  </section>
</div>

<h2 class="roster-heading">Состав клана</h2>

      <h3>Базовые отряды (3 кубика)</h3>

      <!-- 1. Костяные Собиратели -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Костяные Собиратели</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-basic">Базовый (3 куб.)</span>
            <span class="aos-badge-pts">70 очков</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">6</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Движение</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">2</span></div>
        </div>
        <div class="aos-weapons-section">
          <div class="aos-section-title">Вооружение (выберите один вариант)</div>
          <div class="aos-weapon-item" data-weapon-option="1">
            <div class="aos-weapon-header"><span class="aos-weapon-name">Костяной тесак</span><span class="aos-weapon-type">Ближний бой</span></div>
            <div class="aos-weapon-stats"><span>Порог: <strong>4+</strong></span><span>Урон: <strong>2</strong></span><span>Теги: <em>нет</em></span></div>
          </div>
          <div style="text-align: center; font-weight: bold; color: var(--accent); margin: 6px 0; font-size: 0.9rem;">— ИЛИ —</div>
          <div class="aos-weapon-item" data-weapon-option="2">
            <div class="aos-weapon-header"><span class="aos-weapon-name">Метательные кости</span><span class="aos-weapon-type">Дальний бой (Дальность 3)</span></div>
            <div class="aos-weapon-stats"><span>Порог: <strong>4+</strong></span><span>Урон: <strong>2</strong></span><span>Теги: <em>нет</em></span></div>
          </div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Особое: Живые кости</div>
            <div class="aos-ability-text">Когда Костяной Собиратель уничтожается, на его клетке остаётся маркер «Кости». Любая союзная модель клана, проходящая через эту клетку, восстанавливает 1 ХП (один раз за маркер, после чего маркер удаляется).</div>
          </div>
        </div>
      </div>

      <!-- 2. Песчаные Колдуны (Маг) -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Песчаные Колдуны</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-basic">Базовый (3 куб.)</span>
            <span class="aos-badge-class role-mage">[Маг]</span>
            <span class="aos-badge-pts">85 очков</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">7</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Движение</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">2</span></div>
        </div>
        <div class="aos-weapons-section">
          <div class="aos-section-title">Вооружение</div>
          <div class="aos-weapon-item">
            <div class="aos-weapon-header"><span class="aos-weapon-name">Посох изломов</span><span class="aos-weapon-type">Дальний бой (Дальность 4)</span></div>
            <div class="aos-weapon-stats"><span>Порог: <strong>4+</strong></span><span>Урон: <strong>3</strong></span><span>Теги: <em>нет</em></span></div>
          </div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Особое: Песчаный кулак (1 ОД)</div>
            <div class="aos-ability-text">Тратит действие «Удар» не на атаку, а на создание Стены песка на указанной клетке в радиусе 5 клеток: блокирует перемещение врагов до конца следующего раунда; блокирует дальнобойные атаки через неё; союзные модели проходят сквозь неё свободно.</div>
          </div>
        </div>
      </div>

      <h3>Элитные отряды (4 кубика)</h3>

      <!-- 3. Костяной Исполин -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Костяной Исполин</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-elite">Элита (4 куб.)</span>
            <span class="aos-badge-pts">180 очков</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">11</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Движение</span><span class="aos-stat-value">3</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">5</span></div>
        </div>
        <div class="aos-weapons-section">
          <div class="aos-section-title">Вооружение</div>
          <div class="aos-weapon-item">
            <div class="aos-weapon-header"><span class="aos-weapon-name">Костяная дубина</span><span class="aos-weapon-type">Ближний бой (Дальность 2)</span></div>
            <div class="aos-weapon-stats"><span>Порог: <strong>3+</strong></span><span>Урон: <strong>5</strong></span><span>Теги: <span class="aos-tag">[Пробой 1]</span></span></div>
          </div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Особое: Конструкция из костей</div>
            <div class="aos-ability-text">Исполин — нежить. Уязвим к обычному урону, но имеет иммунитет к «Яду» и проклятию «Истощение». Его нельзя лечить обычными способностями: вместо этого каждая уничтоженная вражеская модель в радиусе 3 клеток восстанавливает Исполину 1 ХП в конце раунда (пожирание душ).</div>
          </div>
        </div>
      </div>

      <!-- 4. Песчаная Угарная Жрица (Жрец) -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Песчаная Угарная Жрица</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-elite">Элита (4 куб.)</span>
            <span class="aos-badge-class role-priest">[Жрец]</span>
            <span class="aos-badge-pts">165 очков</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">10</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Движение</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">3</span></div>
        </div>
        <div class="aos-weapons-section">
          <div class="aos-section-title">Вооружение</div>
          <div class="aos-weapon-item">
            <div class="aos-weapon-header"><span class="aos-weapon-name">Жезл иссушения</span><span class="aos-weapon-type">Дальний бой (Дальность 5)</span></div>
            <div class="aos-weapon-stats"><span>Порог: <strong>4+</strong></span><span>Урон: <strong>4</strong></span><span>Теги: <em>нет</em></span></div>
          </div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Особое: Массовое проклятие (1 ОД)</div>
            <div class="aos-ability-text">Тратит действие «Удар» на наложение проклятия «Зыбь» на все вражеские модели в радиусе 3 клеток от Жрицы (вместо одного проклятия в начале раунда). Можно использовать один раз за раунд.</div>
          </div>
        </div>
      </div>

      <h3>Герои (5 кубиков)</h3>

      <!-- 5. Магара Костяная Матерь (Маг) -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Магара Костяная Матерь</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-hero">Герой (5 куб.)</span>
            <span class="aos-badge-class role-mage">[Маг]</span>
            <span class="aos-badge-pts">280 очков</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">15</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Движение</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">4</span></div>
        </div>
        <div class="aos-weapons-section">
          <div class="aos-section-title">Вооружение</div>
          <div class="aos-weapon-item">
            <div class="aos-weapon-header"><span class="aos-weapon-name">Посох душ</span><span class="aos-weapon-type">Дальний бой (Дальность 4)</span></div>
            <div class="aos-weapon-stats"><span>Порог: <strong>3+</strong></span><span>Урон: <strong>4</strong></span><span>Теги: <span class="aos-tag">[Пробой 1], [Оглушение]</span></span></div>
          </div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Особое</div>
            <div class="aos-ability-text"><strong>Власть над песком:</strong> Магара накладывает 3 проклятия в начале раунда (вместо 2) и имеет право накладывать проклятие «Истощение» даже на Героев противника.<br><strong>Поднять мёртвых:</strong> Один раз за игру, в конце любого раунда, Магара может воскресить одну уничтоженную модель (кроме Героя клана Шаманов). Модель выставляется в смежной с Магарой клетке с половиной ХП (округление вверх). Эта модель не приносит победных очков противнику при повторном уничтожении.</div>
          </div>
        </div>
      </div>
    `
  }
];