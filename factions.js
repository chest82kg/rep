export const FACTIONS_DATA = [
  // --- ОБЩИЕ ПРАВИЛА ГНОМОВ ---
  {
    id: 'faction-dwarves-general',
    category: 'factions',
    categoryTitle: 'Фракции',
    faction: 'Кхад‑Дарум - Горные Гномы',
    type: 'article',
    title: 'Общие правила',
    content: `
      <h2>Кхад‑Дарум — Горные Гномы: Общие правила</h2>
      <p>Гномы — медлительная, но несокрушимая раса горных мастеров. Их сила — в удержании позиций, контроле высот и манипуляциях с ландшафтом. Каждая модель дорогая, каждая потеря болезненная, но сломить правильно выстроенную гномью линию — задача не из лёгких.</p>
      
      <h3>Фракционная способность — «Корни горы»</h3>
      <p>Любая модель гномов получает <strong>+1 к стату Броня</strong>, если находится на тайле Горы (любого уровня). Это складывается с другими бонусами к Броне.</p>

      <h3>Фракционный ОД — «Закалка»</h3>
      <p>Гномий фракционный пул состоит из 4 ОД «Закалка» (у некоторых кланов больше). ОД применяется к приказу в момент активации модели и усиливает его:</p>
      <ul>
        <li><strong>Марш:</strong> +2 к Движению (один раз за активацию)</li>
        <li><strong>Удар:</strong> +1 кубик к Урону</li>
        <li><strong>Защита:</strong> +1 кубик к Броне</li>
        <li><strong>Стойка:</strong> Модель может войти в клановую стойку, даже если уже провела действие в другой стойке в эту активацию</li>
        <li><strong>Спешка:</strong> +1 кубик к Урону вместо одного из удвоенных действий</li>
      </ul>
      <p><em>Один приказ может получить только один жетон «Закалка» за активацию. Жетоны из пула не восстанавливаются — потраченные уходят до конца игры.</em></p>

      <h3>Фракционные территории</h3>
      <p>Перед расстановкой моделей игрок выбирает от 1 до 3 фракционных территорий:</p>
      <ul>
        <li><strong>Кузница:</strong> Сопряжен с тайлом Горы. Все гномьи модели в радиусе 2 клеток получают +1 к Урону в ближнем бою.</li>
        <li><strong>Рудник:</strong> Сопряжен с тайлом Горы. +2 фракционных ОД в свой пул.</li>
        <li><strong>Зал Предков:</strong> Сопряжен с любым тайлом. Гномьи модели в радиусе 1 клетки получают +1 к Защите (стат, не кубики) — то есть успешный бросок защиты срабатывает на худшем результате кубика.</li>
      </ul>
    `
  },

  // --- КЛАН 1: ЖЕЛЕЗНАЯ КУЗНЯ ---
  {
    id: 'faction-dwarves-clan1',
    category: 'factions',
    categoryTitle: 'Фракции',
    faction: 'Кхад‑Дарум - Горные Гномы',
    type: 'article',
    title: 'Клан 1 — Клан Железной Кузни',
    content: `
      <h2>Клан 1 — Клан Железной Кузни</h2>
      <p><strong>Стиль:</strong> непробиваемый строй, медленное продвижение, контроль территории. Вы строите стену из щитов, переставляете горы и не даёте противнику подойти.</p>
      
      <h3>Клановая способность — «Горный щит»</h3>
      <p>Потратив фракционный ОД, модель Клана Железной Кузни на тайле Горы создаёт заслон — все союзные модели в радиусе 2 от этой модели получают +1 к Броне до конца раунда.</p>

      <h3>Клановая стойка — «Горный панцирь»</h3>
      <p>Модель не может совершать действия «Перемещение» и «Натиск». В обмен:</p>
      <ul>
        <li><strong>+2 к стату Броня</strong> (складывается с «Корнями горы» и «Блоком»).</li>
        <li><strong>Отражение:</strong> за успешный бросок защиты (хотя бы 1 успех) модель наносит атакующему 1 урон (без броска брони атакующего — урон проходит автоматически). Работает только против атак ближнего боя.</li>
        <li>Модель остаётся в этой стойке до тех пор, пока не сменит её жетоном «Стойка» или не будет выведена из неё эффектом.</li>
      </ul>
      <p>В стойке «Горный панцирь» доступны действия: «Атака» (только по смежной цели), «Блок», «Контратака», «Глухая оборона».</p>

      <h3>Клановый пул — 5 Фракционных ОД «Закалка»</h3>
      <p>У клана Железной Кузни самый большой пул среди всех кланов гномов — 5 ОД вместо 4. Это компенсирует низкую мобильность: лишние жетоны уходят на «Марш» и «Защиту».</p>

      <h2>Состав клана</h2>

      <h3>Базовые отряды (2 ОД)</h3>

      <!-- 1. Железнобород-Воин -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Железнобород-Воин</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-basic">Базовый</span>
            <span class="aos-badge-ap">2 ОД</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">Движ</span><span class="aos-stat-value">3</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Попад</span><span class="aos-stat-value">4+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Урон</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">6</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Защита</span><span class="aos-stat-value">3+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Дальн</span><span class="aos-stat-value">—</span></div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Отражение стрел</div>
            <div class="aos-ability-text">В стойке «Горный панцирь» отражение урона работает даже при стрелковой атаке — отражается 1 урон за успешный бросок защиты.</div>
          </div>
        </div>
      </div>

      <!-- 2. Железнобород-Арбалетчик -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Железнобород-Арбалетчик</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-basic">Базовый</span>
            <span class="aos-badge-ap">2 ОД</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">Движ</span><span class="aos-stat-value">3</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Попад</span><span class="aos-stat-value">4+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Урон</span><span class="aos-stat-value">3</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">5</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Защита</span><span class="aos-stat-value">3+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Дальн</span><span class="aos-stat-value">4</span></div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Зоркий глаз</div>
            <div class="aos-ability-text">Действие «Атака», совершённое с тайла Горы или фракционного террейна, даёт +1 к попаданию на дальнобойную атаку.</div>
          </div>
        </div>
      </div>

      <h3>Элитные отряды (3 ОД)</h3>

      <!-- 3. Железнобород - Скакун (ближний) -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Железнобород - Скакун (ближний)</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-elite">Элита</span>
            <span class="aos-badge-ap">3 ОД</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">Движ</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">5</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Попад</span><span class="aos-stat-value">3+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Урон</span><span class="aos-stat-value">5</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">6</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Защита</span><span class="aos-stat-value">3+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Дальн</span><span class="aos-stat-value">—</span></div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Пробой брони (1 ОД)</div>
            <div class="aos-ability-text">Каждый бросок 6 на атаку игнорирует одну успешную защиту врага — то есть один поглощённый урон возвращается и проходит сквозь броню. Если враг не поглотил ничего — эффект не срабатывает. Доступно в любой стойке.</div>
          </div>
        </div>
      </div>

      <!-- 4. Железнобород-Скакун (Дальний) -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Железнобород-Скакун (Дальний)</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-elite">Элита</span>
            <span class="aos-badge-ap">3 ОД</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">Движ</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">5</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Попад</span><span class="aos-stat-value">3+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Урон</span><span class="aos-stat-value">5</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">6</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Защита</span><span class="aos-stat-value">3+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Дальн</span><span class="aos-stat-value">3</span></div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Горная Охота (2 ОД)</div>
            <div class="aos-ability-text">Действие «Рывок», после него модель может провести одну бесплатную «Атаку» по ближайшей вражеской модели. Доступно только в стойке «Клановая».</div>
          </div>
        </div>
      </div>

      <h3>Герои (4 ОД)</h3>

      <!-- 5. Гримир Железнорукий Молотобоец -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Гримир Железнорукий Молотобоец</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-hero">Герой</span>
            <span class="aos-badge-ap">4 ОД</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">Движ</span><span class="aos-stat-value">2</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">6</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Попад</span><span class="aos-stat-value">2+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Урон</span><span class="aos-stat-value">7</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">8</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Защита</span><span class="aos-stat-value">2+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Дальн</span><span class="aos-stat-value">—</span></div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">«Не отступим!» (Аура 3 клетки)</div>
            <div class="aos-ability-text">Все гномьи модели в ауре не могут быть отброшены эффектами «Прорыв», «Таран» и подобными, а также получают +1 к стату Защита. Аура действует постоянно, пока Гримир на поле, и не требует траты ОД.</div>
          </div>
        </div>
      </div>

      <!-- 6. Вельга Рунный Чтец -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Вельга Рунный Чтец</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-hero">Герой</span>
            <span class="aos-badge-ap">4 ОД</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">Движ</span><span class="aos-stat-value">3</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">5</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Попад</span><span class="aos-stat-value">4+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Урон</span><span class="aos-stat-value">5</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">5</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Защита</span><span class="aos-stat-value">3+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Дальн</span><span class="aos-stat-value">3</span></div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Каменный взгляд (2 ОД)</div>
            <div class="aos-ability-text">Вельга выбирает одну вражескую модель в радиусе 4. Модель получает «Окаменение» до конца раунда: −2 к Движению, −1 к Попаданию, не может входить в стойки.</div>
          </div>
        </div>
      </div>
    `
  },

 // --- КЛАН 2: ГЛУБОКИЕ ТРОПЫ ---
  {
    id: 'faction-dwarves-clan2',
    category: 'factions',
    categoryTitle: 'Фракции',
    faction: 'Кхад‑Дарум - Горные Гномы',
    type: 'article',
    title: 'Клан 2 — Клан Глубоких Троп',
    content: `
      <h2>Клан 2 — Клан Глубоких Троп</h2>
      <p><strong>Стиль:</strong> скрытность, подкопы, внезапные удары. Вы появляетесь там, где вас не ждут, бьёте и исчезаете. Хрупкие, но быстрые и маневренные.</p>
      
      <h3>Клановая способность — «Подземный ход»</h3>
      <p>В начале каждого раунда модели клана, находящиеся на тайле Горы, могут быть сняты с поля и выставлены заново на любой тайл Горы на поле. Это не считается активацией и не требует ОД. Ограничения:</p>
      <ul>
        <li>Нельзя выставить модель на клетку, занятую другой моделью.</li>
        <li>Нельзя выставить модель в зону выставления противника.</li>
        <li>Максимум 2 модели за раунд могут использовать «Подземный ход».</li>
      </ul>

      <h3>Клановая стойка — «Засада»</h3>
      <p>Модель в стойке «Засада»:</p>
      <ul>
        <li><strong>Невидимость:</strong> не может быть выбрана целью стрелковой атаки с дистанции более 3 клеток. В ближнем бою — может быть атакована только моделью в смежной клетке.</li>
        <li><strong>Первый удар:</strong> при выходе из «Засады» (совершении любого действия, кроме «Смены стойки») первая атака модели в этом раунде получает +2 кубика к Урону. Бонус срабатывает один раз за активацию.</li>
        <li>Модель может оставаться в «Засаде» сколько угодно, но если она совершает перемещение или атаку — стойка автоматически меняется на «Атакующую» (бонус «Первого удара» срабатывает, затем стойка меняется).</li>
      </ul>

      <h3>Клановый пул — 3 жетона «Закалка»</h3>
      <p>Меньше всех, но способность «Подземный ход» компенсирует это — мобильность не требует траты жетонов.</p>

      <h2>Состав клана</h2>

      <h3>Базовые отряды (2 ОД)</h3>

      <!-- 1. Подземные Разведчики -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Подземные Разведчики</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-basic">Базовый</span>
            <span class="aos-badge-ap">2 ОД</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">Движ</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Попад</span><span class="aos-stat-value">4+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Урон</span><span class="aos-stat-value">3</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Защита</span><span class="aos-stat-value">4+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Дальн</span><span class="aos-stat-value">—</span></div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Горные крысы</div>
            <div class="aos-ability-text">Перемещение через тайлы Горы не стоит дополнительно (1 очко движения за клетку, даже на многоуровневой Горе). В стойке «Засада» могут перемещаться (но при перемещении стойка меняется на «Атакующую» — с бонусом «Первого удара»).</div>
          </div>
        </div>
      </div>

      <!-- 2. Болотные Топоры -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Болотные Топоры</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-basic">Базовый</span>
            <span class="aos-badge-ap">2 ОД</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">Движ</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Попад</span><span class="aos-stat-value">3+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Урон</span><span class="aos-stat-value">5</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">3</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Защита</span><span class="aos-stat-value">4+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Дальн</span><span class="aos-stat-value">4</span></div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Трясина</div>
            <div class="aos-ability-text">На тайле Реки или многоуровневой Реки Болотные Топоры получают +1 к Урону. При выходе из «Засады» на тайле Реки бонус «Первого удара» увеличивается до +3 Урона (вместо +2).</div>
          </div>
        </div>
      </div>

      <h3>Элитные отряды (3 ОД)</h3>

      <!-- 3. Копатели-Подрывники -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Копатели-Подрывники</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-elite">Элита</span>
            <span class="aos-badge-ap">3 ОД</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">Движ</span><span class="aos-stat-value">5</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Попад</span><span class="aos-stat-value">4+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Урон</span><span class="aos-stat-value">6</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Защита</span><span class="aos-stat-value">5+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Дальн</span><span class="aos-stat-value">3</span></div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Подкоп</div>
            <div class="aos-ability-text">Тратит 1 ОД «Марш» и совершает базовое «Перемещение», но вместо обычного перемещения телепортируется на любую клетку в радиусе 5 клеток, игнорируя модели и ландшафт на пути. Конечная клетка должна быть пустой. После «Подкопа» модель автоматически входит в стойку «Засада» (бесплатно, без траты ОД на «Стойка»).</div>
          </div>
        </div>
      </div>

      <!-- 4. Глубинный Прыгун -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Глубинный Прыгун</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-elite">Элита</span>
            <span class="aos-badge-ap">3 ОД</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">Движ</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">6</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Попад</span><span class="aos-stat-value">4+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Урон</span><span class="aos-stat-value">6</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">5</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Защита</span><span class="aos-stat-value">4+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Дальн</span><span class="aos-stat-value">—</span></div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Скалолаз</div>
            <div class="aos-ability-text">Игнорирует штраф за многоуровневые тайлы — движение по Горе любого уровня стоит 1 очко за клетку. При атаке сверху вниз (с более высокого уровня на более низкий) — +1 кубик к Урону. При атаке на тайл выше — штрафа нет.</div>
          </div>
        </div>
      </div>

      <h3>Герои (4 ОД)</h3>

      <!-- 5. Двалин Змеебородый -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Двалин Змеебородый</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-hero">Герой</span>
            <span class="aos-badge-ap">4 ОД</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">Движ</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">6</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Попад</span><span class="aos-stat-value">3+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Урон</span><span class="aos-stat-value">6</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">6</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Защита</span><span class="aos-stat-value">4+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Дальн</span><span class="aos-stat-value">—</span></div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Кружный путь & Удар из глубины</div>
            <div class="aos-ability-text"><strong>Кружный путь:</strong> Один раз за раунд Двалин может телепортироваться на любой тайл Горы на поле, используя способность «Подземный ход» — это не считается использованием «Подземного хода» (не тратит лимит в 2 модели). После телепортации Двалин может действовать нормально в эту активацию.<br><strong>Удар из глубины:</strong> Если Двалин атакует в тот же раунд, когда телепортировался — атака получает +2 кубика к Урону (бонус складывается с «Первым ударом»).</div>
          </div>
        </div>
      </div>
    `
  },

   // --- КЛАН 3: РУННЫЕ КУЗНЕЦЫ ---
  {
    id: 'faction-dwarves-clan3',
    category: 'factions',
    categoryTitle: 'Фракции',
    faction: 'Кхад‑Дарум - Горные Гномы',
    type: 'article',
    title: 'Клан 3 — Клан Рунных Кузнецов',
    content: `
      <h2>Клан 3 — Клан Рунных Кузнецов</h2>
      <p><strong>Стиль:</strong> руны, магия ландшафта, синергия. Вы усиливаете свои модели, ослабляете вражеские и меняете поле боя под себя. Слабы в одиночку, сильны в связке.</p>
      
      <h3>Клановая способность — «Рунная гравировка»</h3>
      <p>В начале каждого раунда (до активаций моделей) игрок может нанести до 2 рун на свои модели. Руны действуют до конца раунда. В начале следующего раунда можно нанести новые (старые стираются):</p>
      <ul>
        <li><strong>Руна Камня:</strong> +2 к стату Броня</li>
        <li><strong>Руна Пламени:</strong> +2 к Урону в ближнем бою</li>
        <li><strong>Руна Ветра:</strong> +2 к Движению</li>
        <li><strong>Руна Тишины:</strong> модель игнорирует 3 урона в раунде (поглощение до броска брони)</li>
      </ul>
      <p><em>На одну модель можно нанести только одну руну за раунд. Руну нельзя перенести на другую модель.</em></p>

      <h3>Клановая стойка — «Рунный круг»</h3>
      <p>Модель в стойке «Рунный круг»:</p>
      <ul>
        <li>Не может атаковать.</li>
        <li>Может перемещаться (базовое действие «Перемещение»).</li>
        <li><strong>Отдача:</strong> каждый раз, когда вражеская модель заканчивает перемещение в радиусе 2 клеток, немедленно получает 1 урон (без броска брони). Срабатывает на каждую модель, попадающую в зону, за одно перемещение — один раз на модель.</li>
        <li><strong>Рунный щит:</strong> модель получает +1 к стату Защита (3+ вместо 4+, если было 4+).</li>
      </ul>

      <h3>Клановый пул — 4 жетона «Закалка»</h3>
      <p>Стандартный пул, но у Рунных Кузнецов жетоны гибче: любой жетон «Закалка» может быть использован как руна одноразового действия при трате фракционных ОД:</p>
      <ul>
        <li><strong>Подложен к Удару:</strong> Атака получает свойство «Пробой» — один бросок 6 игнорирует броню.</li>
        <li><strong>Подложен к Защите:</strong> Модель восстанавливает 1 ХП (один раз за активацию).</li>
        <li><strong>Подложен к Маршу:</strong> Модель оставляет за собой Рунный след — клетка, по которой прошла, даёт союзным моделям +1 к Движению при перемещении через неё до конца раунда.</li>
        <li><strong>Подложен к Стойке:</strong> Модель может войти в стойку «Рунный круг», даже если уже потратила действие в эту активацию (бесплатное переключение).</li>
      </ul>

      <h2>Состав клана</h2>

      <h3>Базовые отряды (2 ОД)</h3>

      <!-- 1. Руноносцы -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Руноносцы</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-basic">Базовый</span>
            <span class="aos-badge-ap">2 ОД</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">Движ</span><span class="aos-stat-value">3</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">3</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Попад</span><span class="aos-stat-value">4+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Урон</span><span class="aos-stat-value">2</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Защита</span><span class="aos-stat-value">4+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Дальн</span><span class="aos-stat-value">—</span></div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Рунный канал</div>
            <div class="aos-ability-text">В стойке «Рунный круг» Руноносцы лечат одну союзную модель в смежной клетке на 1 ХП в конце своей активации. Пассивный эффект стойки. Если на Руноносце нанесена руна, лечение увеличивается до 2 ХП.</div>
          </div>
        </div>
      </div>

      <!-- 2. Огненные Жрецы -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Огненные Жрецы</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-basic">Базовый</span>
            <span class="aos-badge-ap">2 ОД</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">Движ</span><span class="aos-stat-value">3</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Попад</span><span class="aos-stat-value">3+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Урон</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Защита</span><span class="aos-stat-value">4+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Дальн</span><span class="aos-stat-value">6</span></div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Поджог</div>
            <div class="aos-ability-text">Тратит 1 жетон «Удар» — стрелковая атака по тайлу (не по модели). Выбранный тайл загорается: до двух выбранных моделей на нём получают 1 урон в начале своей активации, пока тайл горит. Тайл горит до конца следующего раунда. Нельзя поджечь тайл Горы.</div>
          </div>
        </div>
      </div>

      <h3>Элитные отряды (3 ОД)</h3>

      <!-- 3. Рунный Страж -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Рунный Страж</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-elite">Элита</span>
            <span class="aos-badge-ap">3 ОД</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">Движ</span><span class="aos-stat-value">3</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">5</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Попад</span><span class="aos-stat-value">3+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Урон</span><span class="aos-stat-value">5</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">7</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Защита</span><span class="aos-stat-value">3+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Дальн</span><span class="aos-stat-value">2</span></div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Рунный подавитель (Аура 3 клетки)</div>
            <div class="aos-ability-text">Один раз за раунд отменяет одно магическое действие врага в радиусе (поджог, руну, фракционную способность с пометкой «магия»). Отмена происходит до броска кубиков. Не работает на базовые атаки и перемещения.</div>
          </div>
        </div>
      </div>

      <!-- 4. Рунный Голем -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Рунный Голем</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-elite">Элита</span>
            <span class="aos-badge-ap">3 ОД</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">Движ</span><span class="aos-stat-value">2</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">7</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Попад</span><span class="aos-stat-value">3+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Урон</span><span class="aos-stat-value">6</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">9</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Защита</span><span class="aos-stat-value">4+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Дальн</span><span class="aos-stat-value">2</span></div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Конструкция & Перегрузка</div>
            <div class="aos-ability-text"><strong>Конструкция:</strong> На Голема не действуют руны врага (свои действуют). Голема нельзя лечить. Не может входить в клановую стойку «Рунный круг».<br><strong>Перегрузка:</strong> Тратит «Стойка» — в следующем раунде все атаки Голема игнорируют бросок брони врага на результате 5+ (пробой). Действует один раунд.</div>
          </div>
        </div>
      </div>

      <h3>Герои (4 ОД)</h3>

      <!-- 5. Альвиз Златорук -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Альвиз Златорук</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-hero">Герой</span>
            <span class="aos-badge-ap">4 ОД</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">Движ</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">6</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Попад</span><span class="aos-stat-value">3+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Урон</span><span class="aos-stat-value">6</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">6</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Защита</span><span class="aos-stat-value">3+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Дальн</span><span class="aos-stat-value">—</span></div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Рунная вспышка & Мастер рун</div>
            <div class="aos-ability-text"><strong>Рунная вспышка:</strong> Один раз за раунд Альвиз может поменять местами два тайла ландшафта на поле (того же типа: Гора с Горой, Лес с Лесом, Река с Рекой).<br><strong>Мастер рун:</strong> Альвиз может нанести 3 руны в начале раунда (вместо 2) и может нанести две руны на одну модель (эффекты складываются).</div>
          </div>
        </div>
      </div>
    `
  },

  // --- ФРАКЦИЯ 2: АРАФИЯ (ПЕСЧАНЫЕ ГОБЛИНЫ) - ОБЩИЕ ПРАВИЛА ---
  {
    id: 'faction-goblins-general',
    category: 'factions',
    categoryTitle: 'Фракции',
    faction: 'Арафия - Песчаные Гоблины',
    type: 'article',
    title: 'Общие правила',
    content: `
      <h2>Арафия — Песчаные Гоблины: Общие правила</h2>
      <p>Песчаные гоблины — быстрые, многочисленные и коварные. Там, где гномы стоят стеной, гоблины текут через пустыню как вода: обтекают, кусают, отступают, возвращаются. Каждая модель дешёвая и хрупкая, но их много, и они умеют использовать ландшафт противника против него самого.</p>
      
      <h3>Фракционная способность — «Зыбкий песок»</h3>
      <p>Любая модель песчаных гоблинов получает <strong>+1 к Движению</strong>, если находится на тайле Реки или Леса. Гоблины не видят разницы между рекой и песчаной стремниной — для них это родная среда.</p>
      <p><em>Дополнительно:</em> игнорируют штраф за тайл Реки при перемещении (1 очко движения за клетку вместо 2). Если Река многоуровневая (углубление) — штраф 2 очка вместо 3.</p>

      <h3>Фракционный пул — «Жадность»</h3>
      <p>Гоблинский пул состоит из 4 фракционных ОД «Жадность». ОД подкладывается к приказу в момент активации и усиливает его:</p>
      <ul>
        <li><strong>Марш:</strong> Модель может переместиться через вражеские модели (не останавливаясь на их клетках) до конца этого перемещения.</li>
        <li><strong>Удар:</strong> +3 кубика к Урону, но после атаки модель обязана немедленно переместиться на 1 клетку в любом направлении.</li>
        <li><strong>Защита:</strong> Модель перекидывает до 3 кубиков защиты заново.</li>
        <li><strong>Стойка:</strong> Модель входит в клановую стойку бесплатно (без траты ОД).</li>
        <li><strong>Спешка:</strong> В дополнение к удвоенному действию модель может совершить одно перемещение на 1 клетку (бесплатный шаг).</li>
      </ul>

      <h3>Фракционные территории</h3>
      <ul>
        <li><strong>Оазис:</strong> Сопряжен с тайлом Реки. Все гоблинские модели в радиусе 2 клеток получают +1 к Защите. Вражеские модели в радиусе 2 клеток получают −1 к Движению.</li>
        <li><strong>Слюдовый Грот:</strong> Сопряжен с любым тайлом. Вражеские модели в радиусе 1 клетки в начале следующей активации получают 1 урон (без броска брони). Срабатывает один раз на модель за раунд.</li>
        <li><strong>Костяной алтарь:</strong> Сопряжен с тайлом Леса. В конце раунда, если алтарь оспаривается или контролируется, игрок возвращает 1 ОД «Жадность» из сброса обратно в пул.</li>
      </ul>
    `
  },

  // --- КЛАН 1: КЛАН СКОРПИОНОВ ---
  {
    id: 'faction-goblins-clan1',
    category: 'factions',
    categoryTitle: 'Фракции',
    faction: 'Арафия - Песчаные Гоблины',
    type: 'article',
    title: 'Клан 1 — Клан Скорпионов',
    content: `
      <h2>Клан 1 — Клан Скорпионов</h2>
      <p><strong>Стиль:</strong> ядовитые уколы, численное превосходство, изматывание врага. Вы окружаете противника мелкими быстрыми моделями и отравляете их, заставляя терять здоровье постепенно. Выигрываете в затяжной войне.</p>
      
      <h3>Клановая способность — «Отравленное жало»</h3>
      <p>Каждый раз, когда модель клана Скорпионов наносит хотя бы 1 урон в ближнем бою, цель получает маркер «Яд». В конце активации отравленной модели она получает 1 урон (бросок брони не проводится). Маркер снимается в конце активации модели.</p>
      <ul>
        <li>Яд не складывается.</li>
        <li>Если модель с маркером «Яд» лечится — маркер снимается.</li>
        <li>Базовые отряды Скорпионов наносят яд только в ближнем бою. Элитные и герои — и в ближнем, и в стрелковом.</li>
      </ul>

      <h3>Клановая стойка — «Загон»</h3>
      <p>Модель в стойке «Загон»:</p>
      <ul>
        <li>Не может атаковать, но может перемещаться (базовое действие «Перемещение»).</li>
        <li><strong>Кольцо:</strong> каждый раз, когда вражеская модель в радиусе 3 клеток проводит атаку по любой другой цели (не по модели в «Загоне»), модель в «Загоне» немедленно проводит бесплатную атаку по этой вражеской модели (базовый Урон, без модификаторов). Одна атака на врага за его активацию.</li>
        <li><strong>Слаженная стая:</strong> если 2 и более моделей клана находятся в стойке «Загон» в радиусе 2 клеток друг от друга, все они получают +1 к стату Атака.</li>
      </ul>

      <h3>Клановый пул — 4 жетона «Жадность»</h3>
      <p>Стандартный пул. Жетоны особенно полезны на «Удар» (+3 кубика + отравление) и «Марш» (пройти сквозь врагов для окружения).</p>

      <h2>Состав клана</h2>

      <h3>Базовые отряды (2 ОД)</h3>

      <!-- 1. Укус-гоблины -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Укус-гоблины</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-basic">Базовый</span>
            <span class="aos-badge-ap">2 ОД</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">Движ</span><span class="aos-stat-value">5</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">3</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Попад</span><span class="aos-stat-value">4+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Урон</span><span class="aos-stat-value">3</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">3</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Защита</span><span class="aos-stat-value">4+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Дальн</span><span class="aos-stat-value">—</span></div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Стая</div>
            <div class="aos-ability-text">При выставлении армии Укус-гоблины занимают 2 клетки одновременно — выставляются парами (две модели на смежных клетках). Если одна из пары погибает, вторая получает +1 к Урону до конца игры.</div>
          </div>
        </div>
      </div>

      <!-- 2. Копьеметатели -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Копьеметатели</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-basic">Базовый</span>
            <span class="aos-badge-ap">2 ОД</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">Движ</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Попад</span><span class="aos-stat-value">4+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Урон</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Защита</span><span class="aos-stat-value">5+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Дальн</span><span class="aos-stat-value">4</span></div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Отравленные дротики</div>
            <div class="aos-ability-text">Стрелковая атака наносит маркер «Яд» при хотя бы 1 прошедшем уроне. Лес не блокирует их стрелковую атаку (навесная траектория). Гора блокирует как обычно.</div>
          </div>
        </div>
      </div>

      <h3>Элитные отряды (3 ОД)</h3>

      <!-- 3. Скорпион-гоблин -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Скорпион-гоблин</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-elite">Элита</span>
            <span class="aos-badge-ap">3 ОД</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">Движ</span><span class="aos-stat-value">5</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">5</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Попад</span><span class="aos-stat-value">3+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Урон</span><span class="aos-stat-value">5</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Защита</span><span class="aos-stat-value">4+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Дальн</span><span class="aos-stat-value">—</span></div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Хвост-жало</div>
            <div class="aos-ability-text">При успешной атаке ближнего боя наносит дополнительно 1 урон сверх броска (автоматически, без кубика, игнорируя броню). Маркер «Яд» накладывается как обычно.</div>
          </div>
        </div>
      </div>

      <!-- 4. Зыбучий Ловец -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Зыбучий Ловец</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-elite">Элита</span>
            <span class="aos-badge-ap">3 ОД</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">Движ</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">5</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Попад</span><span class="aos-stat-value">4+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Урон</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Защита</span><span class="aos-stat-value">5+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Дальн</span><span class="aos-stat-value">6</span></div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Песчаная ловушка</div>
            <div class="aos-ability-text">Тратит 1 жетон «Марш» — зарывается в землю на своей клетке. До конца раунда: не может быть атакована, враг на смежной клетке получает 2 урона и «Яд». При выходе из ловушки бесплатно входит в «Атакующую» с +2 кубика к Урону.</div>
          </div>
        </div>
      </div>

      <h3>Герои (4 ОД)</h3>

      <!-- 5. Шахрит Скорпионий Хвост -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Шахрит Скорпионий Хвост</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-hero">Герой</span>
            <span class="aos-badge-ap">4 ОД</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">Движ</span><span class="aos-stat-value">5</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">5</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Попад</span><span class="aos-stat-value">2+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Урон</span><span class="aos-stat-value">6</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">5</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Защита</span><span class="aos-stat-value">4+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Дальн</span><span class="aos-stat-value">4</span></div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Смертельный яд & Кольцо смерти</div>
            <div class="aos-ability-text"><strong>Смертельный яд:</strong> Яд Шахрита наносит 2 урона в начале активации. Все его атаки (ближние и дальние) накладывают яд.<br><strong>Кольцо смерти (Аура 3 клетки):</strong> Враги с маркером «Яд» в ауре не могут использовать действия «Блок» и «Глухая оборона».</div>
          </div>
        </div>
      </div>
    `
  },

   // --- КЛАН 2: КЛАН БАРХАНОВ ---
  {
    id: 'faction-goblins-clan2',
    category: 'factions',
    categoryTitle: 'Фракции',
    faction: 'Арафия - Песчаные Гоблины',
    type: 'article',
    title: 'Клан 2 — Клан Барханов',
    content: `
      <h2>Клан 2 — Клан Барханов</h2>
      <p><strong>Стиль:</strong> скорость, манёвр, удар-отступление. Вы проноситесь через поле, бьёте там, где враг не готов, и исчезаете, прежде чем он успевает ответить. Самый быстрый клан в игре, но самый хрупкий.</p>
      
      <h3>Клановая способность — «Песчаный вихрь»</h3>
      <p>Один раз за раунд любая модель клана Барханов может переместиться после атаки на количество клеток, равное половине её Движения (округление вверх). Это не тратит ОД — это пассивная способность. Перемещение после атаки происходит по обычным правилам движения (штрафы за ландшафт учитываются, нельзя проходить через врагов).</p>
      <ul>
        <li>Работает и в ближнем, и в стрелковом бою.</li>
        <li>Модель может отступить в стойку «Защищающаяся», если уже была в ней — стойка сохраняется. Если была в «Атакующей» — стойка сохраняется. Если была в клановой стойке — стойка сбрасывается в «Нейтральную» при отступлении.</li>
      </ul>

      <h3>Клановая стойка — «Вихрь»</h3>
      <p>Модель в стойке «Вихрь»:</p>
      <ul>
        <li>Может атаковать и перемещаться.</li>
        <li><strong>Перекати-поле:</strong> при перемещении модель может пройти через клетки с вражескими моделями (как при действии ОД «Жадность» на «Марш», но бесплатно). Каждой вражеской модели, через которую пройдено, наносится 1 урон (без броска брони — царапины, пыль, мелкие камни в глаза).</li>
        <li><strong>Песчаная завеса:</strong> вражеские модели не могут проводить стрелковые атаки по модели в «Вихре», если дистанция больше 3 клеток.</li>
        <li>Один проход через вражескую модель — один урон, один раз за активацию на одну вражескую модель.</li>
      </ul>

      <h3>Клановый пул — 5 жетонов «Жадность»</h3>

      <h2>Состав клана</h2>

      <h3>Базовые отряды (2 ОД)</h3>

      <!-- 1. Песчаные Бегуны -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Песчаные Бегуны</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-basic">Базовый</span>
            <span class="aos-badge-ap">2 ОД</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">Движ</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Попад</span><span class="aos-stat-value">3+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Урон</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">2</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Защита</span><span class="aos-stat-value">5+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Дальн</span><span class="aos-stat-value">—</span></div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Скорость ветра</div>
            <div class="aos-ability-text">При базовом «Перемещении» Бегуны тратят 1 очко движения за клетку на любом ландшафте.</div>
          </div>
        </div>
      </div>

      <!-- 2. Верблюжьи Наездники -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Верблюжьи Наездники</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-basic">Базовый</span>
            <span class="aos-badge-ap">2 ОД</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">Движ</span><span class="aos-stat-value">5</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Попад</span><span class="aos-stat-value">3+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Урон</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Защита</span><span class="aos-stat-value">4+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Дальн</span><span class="aos-stat-value">—</span></div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Сброс</div>
            <div class="aos-ability-text">При успешном «Прорыве» (действие из стойки «Атакующая») Верблюжьи Наездники отбрасывают вражескую модель на 2 клетки вместо 1 (если есть место). Если отбросить некуда — дополнительный урон 2 (вместо 1). При этом Наездники получают +1 к Защите до конца раунда.</div>
          </div>
        </div>
      </div>

      <h3>Элитные отряды (3 ОД)</h3>

      <!-- 3. Барханный Стрелок -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Барханный Стрелок</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-elite">Элита</span>
            <span class="aos-badge-ap">3 ОД</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">Движ</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Попад</span><span class="aos-stat-value">2+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Урон</span><span class="aos-stat-value">6</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">2</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Защита</span><span class="aos-stat-value">5+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Дальн</span><span class="aos-stat-value">6</span></div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Снайпер барханов</div>
            <div class="aos-ability-text">Стрелковая атака на дистанции 4+ клеток получает +1 кубик к Урону. Лес не блокирует видимость. Гора блокирует только если цель находится ниже атакующего. Многоуровневая Гора даёт стандартный бонус +2 к Урону за уровень.</div>
          </div>
        </div>
      </div>

      <!-- 4. Вихревой Клинок -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Вихревой Клинок</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-elite">Элита</span>
            <span class="aos-badge-ap">3 ОД</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">Движ</span><span class="aos-stat-value">5</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">5</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Попад</span><span class="aos-stat-value">2+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Урон</span><span class="aos-stat-value">5</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">5</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Защита</span><span class="aos-stat-value">3+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Дальн</span><span class="aos-stat-value">—</span></div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Танец клинков</div>
            <div class="aos-ability-text">В стойке «Вихрь» Вихревой Клинок может атаковать все вражеские модели, через которых прошёл при перемещении в эту активацию (одна атака по каждой). Каждая такая атака не тратит ОД — это часть одного действия «Перемещение» в стойке «Вихрь». Лимит: не более 3 вражеских моделей за активацию.</div>
          </div>
        </div>
      </div>

      <h3>Герои (4 ОД)</h3>

      <!-- 5. Рашад Золотой Вихрь -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Рашад Золотой Вихрь</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-hero">Герой</span>
            <span class="aos-badge-ap">4 ОД</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">Движ</span><span class="aos-stat-value">5</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">5</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Попад</span><span class="aos-stat-value">2+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Урон</span><span class="aos-stat-value">6</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">6</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Защита</span><span class="aos-stat-value">3+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Дальн</span><span class="aos-stat-value">4</span></div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Невидимый в песках & Ветер пустыни</div>
            <div class="aos-ability-text"><strong>Невидимый в песках:</strong> Рашад может использовать способность «Песчаный вихрь» (перемещение после атаки) дважды за активацию — то есть атаковать, отступить, атаковать снова, отступить снова. Второе отступление не тратит ОД.<br><strong>Ветер пустыни:</strong> Один раз за раунд Рашад может объявить перемещение любой вражеской модели в радиусе 4 клеток — вражеская модель отбрасывается на 2 клетки в направлении, выбранном Рашадом (песчаный шквал сбивает с ног).</div>
          </div>
        </div>
      </div>
    `
  },

  // --- КЛАН 3: КЛАН КОСТЯНЫХ ШАМАНОВ ---
  {
    id: 'faction-goblins-clan3',
    category: 'factions',
    categoryTitle: 'Фракции',
    faction: 'Арафия - Песчаные Гоблины',
    type: 'article',
    title: 'Клан 3 — Клан Костяных Шаманов',
    content: `
      <h2>Клан 3 — Клан Костяных Шаманов</h2>
      <p><strong>Стиль:</strong> магия, ловушки, контроль поля и чужих моделей. Вы не убиваете врага напрямую — вы заставляете ландшафт убить его за вас. Самый медленный из кланов гоблинов, но самый хитрый.</p>
      
      <h3>Клановая способность — «Песчаное проклятие»</h3>
      <p>В начале каждого раунда (до активации моделей) игрок может наложить до 2 проклятий на вражеские модели или тайлы ландшафта. Проклятия действуют до конца раунда:</p>
      <ul>
        <li><strong>Зыбь (Тайл ландшафта):</strong> Модель считается находящейся на тайле Реки для целей перемещения, даже если стоит на суше. Не складывается с реальной Рекой.</li>
        <li><strong>Слепота (Вражеская модель):</strong> Модель не может проводить стрелковые атаки на дистанции более 2 клеток.</li>
        <li><strong>Истощение (Вражеская модель):</strong> Модель теряет 1 ХП в начале своей активации.</li>
        <li><strong>Песчаная буря (Тайл ландшафта):</strong> Тайл становится непроходимым для всех моделей (своих и чужих) до конца раунда. Модели на нём в момент наложения получают 1 урон и остаются в ловушке до конца раунда.</li>
      </ul>
      <p><em>Проклятия нельзя накладывать на Героев (кроме «Слепоты» — на них можно).</em></p>

      <h3>Клановая стойка — «Тотем»</h3>
      <p>Модель в стойке «Тотем»:</p>
      <ul>
        <li>Не может перемещаться и атаковать.</li>
        <li><strong>Костяная аура:</strong> все вражеские модели в радиусе 2 клеток получают −1 к стату Защита (минимум до 6+).</li>
        <li><strong>Шаманский путь:</strong> если в радиусе 2 клеток от модели в «Тотеме» находится хотя бы одна союзная модель клана Костяных Шаманов, последняя получает +1 к стату Попадание (3+ вместо 4+ и так далее).</li>
        <li>Модель в «Тотеме» может быть перенесена на 1 клетку в любом направлении другой союзной моделью клана, заканчивающей перемещение в смежной клетке (бесплатный толчок, не тратит ОД).</li>
      </ul>

      <h3>Клановый пул — 3 жетона «Жадность»</h3>
      <p>Меньше всех, но проклятия и тотемы компенсируют это — контроль поля не требует ОД.</p>

      <h2>Состав клана</h2>

      <h3>Базовые отряды (2 ОД)</h3>

      <!-- 1. Костяные Собиратели -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Костяные Собиратели</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-basic">Базовый</span>
            <span class="aos-badge-ap">2 ОД</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">Движ</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">2</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Попад</span><span class="aos-stat-value">4+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Урон</span><span class="aos-stat-value">3</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">6</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Защита</span><span class="aos-stat-value">5+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Дальн</span><span class="aos-stat-value">3</span></div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Живые кости</div>
            <div class="aos-ability-text">Когда Костяной Собиратель уничтожается, на его клетке остаётся маркер «Кости». Любая союзная модель клана Костяных Шаманов, проходящая через эту клетку, восстанавливает 1 ХП (один раз на маркер). Маркер удаляется после использования.</div>
          </div>
        </div>
      </div>

      <!-- 2. Песчаные Колдуны -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Песчаные Колдуны</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-basic">Базовый</span>
            <span class="aos-badge-ap">2 ОД</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">Движ</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">3</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Попад</span><span class="aos-stat-value">4+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Урон</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">6</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Защита</span><span class="aos-stat-value">5+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Дальн</span><span class="aos-stat-value">4</span></div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Песчаный кулак</div>
            <div class="aos-ability-text">Тратит 1 ОД «Удар» — не атакует модель, а создаёт Стену песка на указанной клетке в радиусе 5 клеток. Клетка со Стеной песка блокирует перемещение вражеских моделей до конца следующего раунда и блокирует стрелковые атаки через неё. Свои модели проходят свободно.</div>
          </div>
        </div>
      </div>

      <h3>Элитные отряды (3 ОД)</h3>

      <!-- 3. Костяной Исполин -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Костяной Исполин</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-elite">Элита</span>
            <span class="aos-badge-ap">3 ОД</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">Движ</span><span class="aos-stat-value">3</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">5</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Попад</span><span class="aos-stat-value">3+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Урон</span><span class="aos-stat-value">5</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">10</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Защита</span><span class="aos-stat-value">5+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Дальн</span><span class="aos-stat-value">3 (Ближний)</span></div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Конструкция из костей & Пожирание душ</div>
            <div class="aos-ability-text"><strong>Конструкция из костей:</strong> Костяной Исполин — нежить. Иммунитет к «Яду» и «Истощению», нельзя лечить обычными способами.<br><strong>Пожирание душ:</strong> Каждая уничтоженная вражеская модель в радиусе 3 клеток восстанавливает Исполину 1 ХП в конце раунда.</div>
          </div>
        </div>
      </div>

      <!-- 4. Песчаная Угарная Жрица -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Песчаная Угарная Жрица</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-elite">Элита</span>
            <span class="aos-badge-ap">3 ОД</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">Движ</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">5</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Попад</span><span class="aos-stat-value">4+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Урон</span><span class="aos-stat-value">5</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">8</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Защита</span><span class="aos-stat-value">5+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Дальн</span><span class="aos-stat-value">5</span></div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Массовое проклятие</div>
            <div class="aos-ability-text">Тратит 1 ОД «Удар» — накладывает проклятие «Зыбь» на все вражеские модели в радиусе 3 клетки от Жрицы. Не складывается с клановой способностью, тратит ОД. Можно использовать один раз за раунд.</div>
          </div>
        </div>
      </div>

      <h3>Герои (4 ОД)</h3>

      <!-- 5. Магара Костяная Матерь -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Магара Костяная Матерь</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-hero">Герой</span>
            <span class="aos-badge-ap">4 ОД</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">Движ</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">7</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Попад</span><span class="aos-stat-value">3+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Урон</span><span class="aos-stat-value">5</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">12</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Защита</span><span class="aos-stat-value">5+</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Дальн</span><span class="aos-stat-value">6</span></div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Власть над песком & Поднять мёртвых</div>
            <div class="aos-ability-text"><strong>Власть над песком:</strong> Магара накладывает 3 проклятия в начале раунда (вместо 2) и может накладывать «Истощение» на Героев.<br><strong>Поднять мёртвых:</strong> Один раз за игру, в конце любого раунда, Магара может воскресить одну уничтоженную модель клана Костяных Шаманов (кроме Героя). Модель выставляется в смежной с Магарой клетке с половиной ХП (округление вверх). Не приносит победных очков противнику при повторном уничтожении.</div>
          </div>
        </div>
      </div>
    `
  }
];