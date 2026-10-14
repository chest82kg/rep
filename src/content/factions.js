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
      <p>Гномий фракционный пул состоит из 4 ОД «Закалка». ОД применяется к приказу в момент активации модели и усиливает его:</p>
      
      <table style="width:100%; border-collapse: collapse; margin: 16px 0; background: var(--bg-panel);">
        <thead>
          <tr style="border-bottom: 2px solid var(--border); text-align: left;">
            <th style="padding: 8px;">Приказ</th>
            <th style="padding: 8px;">Эффект «Закалки»</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid var(--border);">
            <td style="padding: 8px;"><strong>Марш</strong></td>
            <td style="padding: 8px;">+2 к Движению (один раз за активацию)</td>
          </tr>
          <tr style="border-bottom: 1px solid var(--border);">
            <td style="padding: 8px;"><strong>Удар</strong></td>
            <td style="padding: 8px;">+1 к Урону</td>
          </tr>
          <tr style="border-bottom: 1px solid var(--border);">
            <td style="padding: 8px;"><strong>Защита</strong></td>
            <td style="padding: 8px;">+1 к Броне</td>
          </tr>
          <tr style="border-bottom: 1px solid var(--border);">
            <td style="padding: 8px;"><strong>Стойка</strong></td>
            <td style="padding: 8px;">Модель может войти в клановую стойку, даже если уже провела действие в другой стойке в эту активацию</td>
          </tr>
          <tr>
            <td style="padding: 8px;"><strong>Спешка</strong></td>
            <td style="padding: 8px;">+1 к Атаке вместо одного из удвоенных действий</td>
          </tr>
        </tbody>
      </table>

      <p><em>Один приказ может получить только один жетон «Закалка» за активацию. Жетоны из пула не восстанавливаются — потраченные уходят до конца игры.</em></p>

      <h3>Фракционные территории</h3>
      <p>Перед расстановкой моделей игрок выбирает от 1 до 3 фракционных территорий (в зависимости от договоренности или формата игры). Каждая размещается по правилам расстановки.</p>
      
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
            <td style="padding: 8px;"><strong>Кузница</strong></td>
            <td style="padding: 8px;">Сопряжен с тайлом Горы</td>
            <td style="padding: 8px;">Все гномьи модели в радиусе 2 клеток получают +1 к Урону в ближнем бою</td>
          </tr>
          <tr style="border-bottom: 1px solid var(--border);">
            <td style="padding: 8px;"><strong>Рудник</strong></td>
            <td style="padding: 8px;">Сопряжен с тайлом Горы</td>
            <td style="padding: 8px;">+2 фракционных ОД в свой пул</td>
          </tr>
          <tr>
            <td style="padding: 8px;"><strong>Зал Предков</strong></td>
            <td style="padding: 8px;">Сопряжен с любым тайлом</td>
            <td style="padding: 8px;">Гномьи модели в радиусе 1 клетки получают +1 к Броне</td>
          </tr>
        </tbody>
      </table>
    `
  }, 

   // ==========================================
  // КЛАН 1: КЛАН ЖЕЛЕЗНОЙ КУЗНИ
  // ==========================================
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
      <p>Потратив фракционный ОД, модель Клана Железной Кузни на тайле Горы создаёт заслон — все союзные модели в радиусе 2 от этой модели получают +1 к Броне до конца раунда. <em>Один раз за раунд.</em></p>

      <h3>Клановая стойка — «Горный панцирь»</h3>
      <p>Модель не может совершать действия «Перемещение» и «Натиск». В обмен:</p>
      <ul>
        <li><strong>+2 к Броне</strong> (складывается с «Корнями горы» и «Блоком»).</li>
        <li><strong>Отражение:</strong> Если моделью получен минимальный урон, то она наносит в ответ 1 урон (не поглощается броней). Работает только против атак ближнего боя. <em>Один раз за атаку.</em></li>
        <li>Модель остаётся в этой стойке до тех пор, пока не сменит её приказом «Стойка» или не будет выведена из неё эффектом.</li>
      </ul>
      <p>В стойке «Горный панцирь» доступны действия: «Атака» (только по смежной цели), «Блок», «Контратака», «Глухая оборона».</p>

      <h3>Клановый пул — 5 Фракционных ОД «Закалка»</h3>
      <p>У клана Железной Кузни самый большой пул среди всех кланов гномов — 5 ОД вместо 4. Это компенсирует низкую мобильность: лишние жетоны уходят на «Марш» и «Защиту».</p>

      <h2>Состав клана</h2>

      <h3>Базовые отряды (3 кубика)</h3>

      <!-- 1. Железнобород-Воин -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Железнобород-Воин</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-basic">Базовый (3 куб.)</span>
            <span class="aos-badge-pts">105 очков</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">6</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Движение</span><span class="aos-stat-value">3</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">3</span></div>
        </div>
        <div class="aos-weapons-section">
          <div class="aos-section-title">Вооружение (выберите один вариант)</div>
          <div class="aos-weapon-item" data-weapon-option="1">
            <div class="aos-weapon-header"><span class="aos-weapon-name">Железный топор</span><span class="aos-weapon-type">Ближний бой</span></div>
            <div class="aos-weapon-stats"><span>Порог: <strong>3+</strong></span><span>Урон: <strong>3</strong></span><span>Теги: <em>нет</em></span></div>
          </div>
          <div style="text-align: center; font-weight: bold; color: var(--accent); margin: 6px 0; font-size: 0.9rem;">— ИЛИ —</div>
          <div class="aos-weapon-item" data-weapon-option="2">
            <div class="aos-weapon-header"><span class="aos-weapon-name">Чекан</span><span class="aos-weapon-type">Ближний бой</span></div>
            <div class="aos-weapon-stats"><span>Порог: <strong>4+</strong></span><span>Урон: <strong>4</strong></span><span>Теги: <span class="aos-tag">[Пробой 1]</span></span></div>
          </div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Особое</div>
            <div class="aos-ability-text">В стойке «Горный панцирь» отражение урона работает даже при дальнобойной атаке — отражается 1 урон за успешный бросок защиты.</div>
          </div>
        </div>
      </div>

      <!-- 2. Железнобород-Арбалетчик -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Железнобород-Арбалетчик</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-basic">Базовый (3 куб.)</span>
            <span class="aos-badge-pts">90 очков</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">5</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Движение</span><span class="aos-stat-value">3</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">2</span></div>
        </div>
        <div class="aos-weapons-section">
          <div class="aos-section-title">Вооружение (выберите один вариант)</div>
          <div class="aos-weapon-item" data-weapon-option="1">
            <div class="aos-weapon-header"><span class="aos-weapon-name">Горный арбалет</span><span class="aos-weapon-type">Дальний бой (Дальность 4)</span></div>
            <div class="aos-weapon-stats"><span>Порог: <strong>3+</strong></span><span>Урон: <strong>3</strong></span><span>Теги: <em>нет</em></span></div>
          </div>
          <div style="text-align: center; font-weight: bold; color: var(--accent); margin: 6px 0; font-size: 0.9rem;">— ИЛИ —</div>
          <div class="aos-weapon-item" data-weapon-option="2">
            <div class="aos-weapon-header"><span class="aos-weapon-name">Шрапнельный самострел</span><span class="aos-weapon-type">Дальний бой (Дальность 3)</span></div>
            <div class="aos-weapon-stats"><span>Порог: <strong>4+</strong></span><span>Урон: <strong>2</strong></span><span>Теги: <span class="aos-tag">[Залп]</span></span></div>
          </div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Особое: Зоркий глаз</div>
            <div class="aos-ability-text">Действие «Атака», совершённое с тайла Горы или фракционного террейна, даёт +1 к попаданию на дальнобойную атаку.</div>
          </div>
        </div>
      </div>

      <h3>Элитные отряды (4 кубика)</h3>

      <!-- 3. Железнобород-Скакун (Ближний бой) -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Железнобород-Скакун (Ближний бой)</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-elite">Элита (4 куб.)</span>
            <span class="aos-badge-pts">180 очков</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">8</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Движение</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">3</span></div>
        </div>
        <div class="aos-weapons-section">
          <div class="aos-section-title">Вооружение (выберите один вариант)</div>
          <div class="aos-weapon-item" data-weapon-option="1">
            <div class="aos-weapon-header"><span class="aos-weapon-name">Рунический клевец</span><span class="aos-weapon-type">Ближний бой</span></div>
            <div class="aos-weapon-stats"><span>Порог: <strong>2+</strong></span><span>Урон: <strong>4</strong></span><span>Теги: <span class="aos-tag">[Пробой 2]</span></span></div>
          </div>
          <div style="text-align: center; font-weight: bold; color: var(--accent); margin: 6px 0; font-size: 0.9rem;">— ИЛИ —</div>
          <div class="aos-weapon-item" data-weapon-option="2">
            <div class="aos-weapon-header"><span class="aos-weapon-name">Двуручный молот</span><span class="aos-weapon-type">Ближний бой</span></div>
            <div class="aos-weapon-stats"><span>Порог: <strong>4+</strong></span><span>Урон: <strong>6</strong></span><span>Теги: <span class="aos-tag">[Тяжелое]</span></span></div>
          </div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Особое: Пробой брони (1 ОД)</div>
            <div class="aos-ability-text">Каждый бросок 6 на атаку игнорирует 2 Брони. Доступно в любой стойке.</div>
          </div>
        </div>
      </div>

      <!-- 4. Железнобород-Скакун (Дальний) -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Железнобород-Скакун (Дальний)</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-elite">Элита (4 куб.)</span>
            <span class="aos-badge-pts">175 очков</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">8</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Движение</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">2</span></div>
        </div>
        <div class="aos-weapons-section">
          <div class="aos-section-title">Вооружение</div>
          <div class="aos-weapon-item">
            <div class="aos-weapon-header">
              <span class="aos-weapon-name">Тяжелый горный штуцер</span>
              <span class="aos-weapon-type">Дальний бой (Дальность 3)</span>
            </div>
            <div class="aos-weapon-stats">
              <span>Порог: <strong>3+</strong></span>
              <span>Урон: <strong>4</strong></span>
              <span>Теги: <span class="aos-tag">[Пробой 1]</span></span>
            </div>
          </div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Особое: Горная Охота (2 ОД)</div>
            <div class="aos-ability-text">Действие «Рывок», после него модель может провести одну бесплатную «Атаку» по ближайшей вражеской модели. Доступно только в стойке «Клановая».</div>
          </div>
        </div>
      </div>

      <h3>Герои (5 кубиков)</h3>

      <!-- 5. Гримир Железнорукий Молотобоец -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Гримир Железнорукий Молотобоец</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-hero">Герой (5 куб.)</span>
            <span class="aos-badge-pts">285 очков</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">14</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Движение</span><span class="aos-stat-value">3</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">4</span></div>
        </div>
        <div class="aos-weapons-section">
          <div class="aos-section-title">Вооружение (выберите один вариант)</div>
          <div class="aos-weapon-item" data-weapon-option="1">
            <div class="aos-weapon-header"><span class="aos-weapon-name">Молот Предков</span><span class="aos-weapon-type">Ближний бой</span></div>
            <div class="aos-weapon-stats"><span>Порог: <strong>2+</strong></span><span>Урон: <strong>5</strong></span><span>Теги: <span class="aos-tag">[Пробой 2]</span></span></div>
          </div>
          <div style="text-align: center; font-weight: bold; color: var(--accent); margin: 6px 0; font-size: 0.9rem;">— ИЛИ —</div>
          <div class="aos-weapon-item" data-weapon-option="2">
            <div class="aos-weapon-header"><span class="aos-weapon-name">Руническая булава</span><span class="aos-weapon-type">Ближний бой</span></div>
            <div class="aos-weapon-stats"><span>Порог: <strong>3+</strong></span><span>Урон: <strong>6</strong></span><span>Теги: <span class="aos-tag">[Тяжелое]</span></span></div>
          </div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Особое: «Не отступим!» (Аура 3 клетки)</div>
            <div class="aos-ability-text">Все гномьи модели в ауре не могут быть отброшены эффектами «Прорыв», «Таран» и получают +1 к Броне. Аура действует постоянно, пока Гримир на поле.</div>
          </div>
        </div>
      </div>

      <!-- 6. Вельга Рунный Чтец (Жрец) -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Вельга Рунный Чтец</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-hero">Герой (5 куб.)</span>
            <span class="aos-badge-class role-priest">[Жрец]</span>
            <span class="aos-badge-pts">250 очков</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">10</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Движение</span><span class="aos-stat-value">3</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">3</span></div>
        </div>
        <div class="aos-weapons-section">
          <div class="aos-section-title">Вооружение</div>
          <div class="aos-weapon-item">
            <div class="aos-weapon-header">
              <span class="aos-weapon-name">Посох Рун</span>
              <span class="aos-weapon-type">Дальний бой (Дальность 3)</span>
            </div>
            <div class="aos-weapon-stats">
              <span>Порог: <strong>3+</strong></span>
              <span>Урон: <strong>3</strong></span>
              <span>Теги: <em>нет</em></span>
            </div>
          </div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Особое действие: «Каменный взгляд» (2 ОД)</div>
            <div class="aos-ability-text">Вельга выбирает одну вражескую модель в радиусе 4. Модель получает «Окаменение» до конца раунда: −2 к Движению, −1 к Попаданию, не может входить в стойки.</div>
          </div>
        </div>
      </div>
    `
  },


  // ==========================================
  // КЛАН 2: ГЛУБОКИЕ ТРОПЫ
  // ==========================================
  {
    id: 'faction-dwarves-clan2',
    category: 'factions',
    categoryTitle: 'Фракции',
    faction: 'Кхад‑Дарум - Горные Гномы',
    type: 'article',
    title: 'Клан 2 — Клан Глубоких Троп',
    content: `
      <h2>Клан 2 — Клан Глубоких Троп</h2>
      <p><strong>Стиль:</strong> скрытность, подкопы, внезапные удары. Вы появляетесь там, где вас не ждут, бьете и исчезаете. Хрупкие, но быстрые и маневренные.</p>
      
      <h3>Клановая способность — «Подземный ход»</h3>
      <p>В начале каждого раунда модели клана, находящиеся на тайле Горы, могут быть сняты с поля и выставлены заново на любой тайл Горы на поле. Это не считается активацией. Ограничения:</p>
      <ul>
        <li>Нельзя выставить модель на клетку, занятую другой моделью.</li>
        <li>Нельзя выставить модель в зону выставления противника.</li>
        <li>Максимум 2 модели за раунд могут использовать «Подземный ход».</li>
      </ul>

      <h3>Клановая стойка — «Засада»</h3>
      <p>Модель в стойке «Засада»:</p>
      <ul>
        <li><strong>Невидимость:</strong> не может быть выбрана целью дальнобойной атаки с дистанции более 3 клеток. В ближнем бою — может быть атакована только моделью в смежной клетке.</li>
        <li><strong>Первый удар:</strong> при выходе из «Засады» (совершении любого действия, кроме «Смены стойки») первая атака модели в этом раунде получает +2 Урону. Бонус срабатывает один раз за раунд.</li>
        <li>Модель может оставаться в «Засаде» сколько угодно, но если она совершает перемещение или атаку — стойка автоматически меняется на «Атакующую» (бонус «Первого удара» срабатывает, затем стойка меняется).</li>
      </ul>

      <h3>Клановый пул — 3 жетона «Закалка»</h3>

      <h2>Состав клана</h2>

      <h3>Базовые отряды (3 кубика)</h3>

      <!-- 1. Подземные Разведчики -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Подземные Разведчики</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-basic">Базовый (3 куб.)</span>
            <span class="aos-badge-pts">75 очков</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">5</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Движение</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">2</span></div>
        </div>
        <div class="aos-weapons-section">
          <div class="aos-section-title">Вооружение (выберите один вариант)</div>
          <div class="aos-weapon-item" data-weapon-option="1">
            <div class="aos-weapon-header"><span class="aos-weapon-name">Парные кинжалы</span><span class="aos-weapon-type">Ближний бой</span></div>
            <div class="aos-weapon-stats"><span>Порог: <strong>3+</strong></span><span>Урон: <strong>2</strong></span><span>Теги: <span class="aos-tag">[Точное]</span></span></div>
          </div>
          <div style="text-align: center; font-weight: bold; color: var(--accent); margin: 6px 0; font-size: 0.9rem;">— ИЛИ —</div>
          <div class="aos-weapon-item" data-weapon-option="2">
            <div class="aos-weapon-header"><span class="aos-weapon-name">Метательные топорики</span><span class="aos-weapon-type">Дальний бой (Дальность 3)</span></div>
            <div class="aos-weapon-stats"><span>Порог: <strong>4+</strong></span><span>Урон: <strong>2</strong></span><span>Теги: <em>нет</em></span></div>
          </div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Особое: Горные крысы</div>
            <div class="aos-ability-text">Перемещение через тайлы Горы не стоит дополнительно (1 очко движения за клетку, даже на многоуровневой Горе). В стойке «Засада» могут перемещаться (но при перемещении стойка меняется на «Атакующую» — с бонусом «Первого удара»).</div>
          </div>
        </div>
      </div>

      <!-- 2. Болотные Топоры -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Болотные Топоры</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-basic">Базовый (3 куб.)</span>
            <span class="aos-badge-pts">90 очков</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">5</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Движение</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">2</span></div>
        </div>
        <div class="aos-weapons-section">
          <div class="aos-section-title">Вооружение (выберите один вариант)</div>
          <div class="aos-weapon-item" data-weapon-option="1">
            <div class="aos-weapon-header"><span class="aos-weapon-name">Тяжелый секатор</span><span class="aos-weapon-type">Ближний бой</span></div>
            <div class="aos-weapon-stats"><span>Порог: <strong>4+</strong></span><span>Урон: <strong>4</strong></span><span>Теги: <span class="aos-tag">[Пробой 1]</span></span></div>
          </div>
          <div style="text-align: center; font-weight: bold; color: var(--accent); margin: 6px 0; font-size: 0.9rem;">— ИЛИ —</div>
          <div class="aos-weapon-item" data-weapon-option="2">
            <div class="aos-weapon-header"><span class="aos-weapon-name">Арбалет топей</span><span class="aos-weapon-type">Дальний бой (Дальность 3)</span></div>
            <div class="aos-weapon-stats"><span>Порог: <strong>4+</strong></span><span>Урон: <strong>3</strong></span><span>Теги: <em>нет</em></span></div>
          </div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Особое: Трясина</div>
            <div class="aos-ability-text">На тайле Реки наносят +1 к урону. При выходе из «Засады» на тайле Реки бонус «Первого удара» увеличивается до +3 к урону.</div>
          </div>
        </div>
      </div>

      <h3>Элитные отряды (4 кубика)</h3>

      <!-- 3. Копатели-Подрывники -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Копатели-Подрывники</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-elite">Элита (4 куб.)</span>
            <span class="aos-badge-pts">175 очков</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">6</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Движение</span><span class="aos-stat-value">5</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">3</span></div>
        </div>
        <div class="aos-weapons-section">
          <div class="aos-section-title">Вооружение (выберите один вариант)</div>
          <div class="aos-weapon-item" data-weapon-option="1">
            <div class="aos-weapon-header"><span class="aos-weapon-name">Саперный бур</span><span class="aos-weapon-type">Ближний бой</span></div>
            <div class="aos-weapon-stats"><span>Порог: <strong>4+</strong></span><span>Урон: <strong>4</strong></span><span>Теги: <span class="aos-tag">[Пробой 2]</span></span></div>
          </div>
          <div style="text-align: center; font-weight: bold; color: var(--accent); margin: 6px 0; font-size: 0.9rem;">— ИЛИ —</div>
          <div class="aos-weapon-item" data-weapon-option="2">
            <div class="aos-weapon-header"><span class="aos-weapon-name">Осколочная граната</span><span class="aos-weapon-type">Дальний бой (Дальность 3)</span></div>
            <div class="aos-weapon-stats"><span>Порог: <strong>5+</strong></span><span>Урон: <strong>3</strong></span><span>Теги: <span class="aos-tag">[Размах]</span></span></div>
          </div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Особое: Подкоп (1 ОД)</div>
            <div class="aos-ability-text">Модель совершает базовое перемещение телепортацией на любую пустую клетку в радиусе 5, игнорируя препятствия и модели на пути. После «Подкопа» модель автоматически и бесплатно входит в стойку «Засада».</div>
          </div>
        </div>
      </div>

      <!-- 4. Глубинный Прыгун -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Глубинный Прыгун</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-elite">Элита (4 куб.)</span>
            <span class="aos-badge-pts">165 очков</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">7</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Движение</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">3</span></div>
        </div>
        <div class="aos-weapons-section">
          <div class="aos-section-title">Вооружение</div>
          <div class="aos-weapon-item">
            <div class="aos-weapon-header"><span class="aos-weapon-name">Прыжковый клевец</span><span class="aos-weapon-type">Ближний бой</span></div>
            <div class="aos-weapon-stats"><span>Порог: <strong>2+</strong></span><span>Урон: <strong>5</strong></span><span>Теги: <span class="aos-tag">[Пробой 1]</span></span></div>
          </div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Особое: Скалолаз</div>
            <div class="aos-ability-text">Игнорирует штрафы движения по Горе. При атаке сверху вниз (с возвышенности) наносит +2 к урону.</div>
          </div>
        </div>
      </div>

      <h3>Герои (5 кубиков)</h3>

      <!-- 5. Двалин Змеебородый -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Двалин Змеебородый</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-hero">Герой (5 куб.)</span>
            <span class="aos-badge-pts">265 очков</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">12</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Движение</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">4</span></div>
        </div>
        <div class="aos-weapons-section">
          <div class="aos-section-title">Вооружение (выберите один вариант)</div>
          <div class="aos-weapon-item" data-weapon-option="1">
            <div class="aos-weapon-header"><span class="aos-weapon-name">Змеиный клинок</span><span class="aos-weapon-type">Ближний бой</span></div>
            <div class="aos-weapon-stats"><span>Порог: <strong>2+</strong></span><span>Урон: <strong>5</strong></span><span>Теги: <span class="aos-tag">[Пробой 2], [Оглушение]</span></span></div>
          </div>
          <div style="text-align: center; font-weight: bold; color: var(--accent); margin: 6px 0; font-size: 0.9rem;">— ИЛИ —</div>
          <div class="aos-weapon-item" data-weapon-option="2">
            <div class="aos-weapon-header"><span class="aos-weapon-name">Арбалет глубин</span><span class="aos-weapon-type">Дальний бой (Дальность 4)</span></div>
            <div class="aos-weapon-stats"><span>Порог: <strong>3+</strong></span><span>Урон: <strong>4</strong></span><span>Теги: <span class="aos-tag">[Пробой 1]</span></span></div>
          </div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Особое</div>
            <div class="aos-ability-text"><strong>Кружный путь:</strong> Один раз за раунд Двалин может телепортироваться на любой тайл Горы, используя «Подземный ход» сверх лимита в 2 модели. После этого может совершить нормальную активацию.<br><strong>Удар из глубины:</strong> Если Двалин атакует в тот же раунд, когда телепортировался — атака получает +2 к урону (складывается с бонусом «Первого удара»).</div>
          </div>
        </div>
      </div>
    `
  }, 

    // ==========================================
  // КЛАН 3: КЛАН РУННЫХ КУЗНЕЦОВ
  // ==========================================
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
      <p>В начале каждого раунда (до активаций моделей) игрок может нанести до 2 рун на свои модели. Руны действуют до конца раунда. В начале следующего раунда можно нанести новые (старые стираются).</p>
      <p><strong>Список рун:</strong></p>
      <ul>
        <li><strong>Руна Камня:</strong> дает +2 к Броне.</li>
        <li><strong>Руна Пламени:</strong> при атаке ближнего боя добавляет +2 к урону.</li>
        <li><strong>Руна Ветра:</strong> дает +2 к Движению.</li>
        <li><strong>Руна Тишины:</strong> полностью поглощает первые 3 единицы входящего урона за раунд (срабатывает до вычета брони). <em>Один раз за активацию.</em></li>
      </ul>
      <p><em>На одну модель можно нанести только одну руну за раунд. Руну нельзя перенести на другую модель.</em></p>

      <h3>Клановая стойка — «Рунный круг»</h3>
      <p>Модель в стойке «Рунный круг»:</p>
      <ul>
        <li>Не может атаковать.</li>
        <li>Может совершать базовое действие «Перемещение».</li>
        <li><strong>Отдача:</strong> Каждый раз, когда вражеская модель заканчивает перемещение в радиусе 2 клеток от неё, она немедленно получает 1 единицу урона (без брони). Срабатывает один раз за перемещение на каждую вражескую модель.</li>
        <li><strong>Рунный щит:</strong> модель получает защиту от позиционных атак (атаки с фланга/тыла не получают бонуса против нее).</li>
      </ul>

      <h3>Клановый пул — 4 жетона «Закалка»</h3>
      <p>Стандартный пул. Но жетоны «Закалка» у Рунных Кузнецов можно тратить как одноразовые руны прямо во время активации модели, сжигая жетон из пула при объявлении действия:</p>
      <ul>
        <li><strong>При действии «Удар»:</strong> Атака получает тег <span class="aos-tag">[Пробой 1]</span>.</li>
        <li><strong>При действии «Защита»:</strong> Модель мгновенно восстанавливает 1 ХП (один раз за активацию).</li>
        <li><strong>При действии «Марш»:</strong> Модель оставляет за собой «Рунный след» — клетки, по которым она прошла, дают союзникам +1 к Движению при прохождении через них до конца раунда.</li>
        <li><strong>При смене стойки:</strong> Позволяет войти в «Рунный круг» бесплатно, без траты дополнительного ОД.</li>
      </ul>

      <h2>Состав клана</h2>

      <h3>Базовые отряды (3 кубика)</h3>

      <!-- 1. Руноносцы -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Руноносцы</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-basic">Базовый (3 куб.)</span>
            <span class="aos-badge-pts">80 очков</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Движение</span><span class="aos-stat-value">3</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">3</span></div>
        </div>
        <div class="aos-weapons-section">
          <div class="aos-section-title">Вооружение</div>
          <div class="aos-weapon-item">
            <div class="aos-weapon-header"><span class="aos-weapon-name">Рунический посох</span><span class="aos-weapon-type">Ближний бой</span></div>
            <div class="aos-weapon-stats"><span>Порог: <strong>3+</strong></span><span>Урон: <strong>2</strong></span><span>Теги: <em>нет</em></span></div>
          </div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Особое: Рунный канал</div>
            <div class="aos-ability-text">Находясь в стойке «Рунный круг», Руноносцы в конце своей активации лечат одну союзную модель в смежной клетке на 1 ХП. Если на самом Руноносце нанесена руна, лечение увеличивается до 2 ХП.</div>
          </div>
        </div>
      </div>

      <!-- 2. Огненные Жрецы (Жрец) -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Огненные Жрецы</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-basic">Базовый (3 куб.)</span>
            <span class="aos-badge-class role-priest">[Жрец]</span>
            <span class="aos-badge-pts">90 очков</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">5</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Движение</span><span class="aos-stat-value">3</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">2</span></div>
        </div>
        <div class="aos-weapons-section">
          <div class="aos-section-title">Вооружение</div>
          <div class="aos-weapon-item">
            <div class="aos-weapon-header"><span class="aos-weapon-name">Огненный жезл</span><span class="aos-weapon-type">Дальний бой (Дальность 4)</span></div>
            <div class="aos-weapon-stats"><span>Порог: <strong>3+</strong></span><span>Урон: <strong>3</strong></span><span>Теги: <span class="aos-tag">[Пробой 1]</span></span></div>
          </div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Особое: Поджог (1 ОД)</div>
            <div class="aos-ability-text">Жрец тратит действие «Удар» на обстрел тайла (не конкретной модели). Выбранный тайл загорается: до двух вражеских моделей на нём получают 1 урон в начале своей активации. Тайл горит до конца следующего раунда. Тайлы Горы поджигать нельзя.</div>
          </div>
        </div>
      </div>

      <h3>Элитные отряды (4 кубика)</h3>

      <!-- 3. Рунный Страж -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Рунный Страж</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-elite">Элита (4 куб.)</span>
            <span class="aos-badge-pts">170 очков</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">7</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Движение</span><span class="aos-stat-value">3</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">4</span></div>
        </div>
        <div class="aos-weapons-section">
          <div class="aos-section-title">Вооружение</div>
          <div class="aos-weapon-item">
            <div class="aos-weapon-header"><span class="aos-weapon-name">Алебарда стража</span><span class="aos-weapon-type">Ближний бой (Дальность 2)</span></div>
            <div class="aos-weapon-stats"><span>Порог: <strong>4+</strong></span><span>Урон: <strong>4</strong></span><span>Теги: <span class="aos-tag">[Пробой 1]</span></span></div>
          </div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Особое: Рунный подавитель</div>
            <div class="aos-ability-text">Пассивная аура радиусом 3 клетки. Один раз за раунд отменяет любое магическое или рунное действие врага в радиусе (до броска кубиков). Не работает на базовые атаки и перемещения.</div>
          </div>
        </div>
      </div>

      <!-- 4. Рунный Голем -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Рунный Голем</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-elite">Элита (4 куб.)</span>
            <span class="aos-badge-pts">185 очков</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">10</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Движение</span><span class="aos-stat-value">2</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">5</span></div>
        </div>
        <div class="aos-weapons-section">
          <div class="aos-section-title">Вооружение</div>
          <div class="aos-weapon-item">
            <div class="aos-weapon-header"><span class="aos-weapon-name">Каменный кулак</span><span class="aos-weapon-type">Ближний бой (Дальность 2)</span></div>
            <div class="aos-weapon-stats"><span>Порог: <strong>5+</strong></span><span>Урон: <strong>6</strong></span><span>Теги: <span class="aos-tag">[Пробой 2]</span></span></div>
          </div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Особое: Конструкция &amp; Перегрузка (1 ОД)</div>
            <div class="aos-ability-text"><strong>Конструкция:</strong> Не живое существо. На голем не действуют вражеские руны (свои — действуют). Голема нельзя лечить. Не может входить в стойку «Рунный круг» (доступны только Атакующая, Защищающаяся и Нейтральная).<br><strong>Перегрузка (1 ОД):</strong> Тратится при смене стойки — в следующем раунде все атаки Голема автоматически получают тег <span class="aos-tag">[Пробой 3]</span>.</div>
          </div>
        </div>
      </div>

      <h3>Герои (5 кубиков)</h3>

      <!-- 5. Альвиз Златорук (Маг) -->
      <div class="aos-card">
        <div class="aos-header">
          <div class="aos-title-group"><span class="aos-title">Альвиз Златорук</span></div>
          <div class="aos-badges">
            <span class="aos-badge-role role-hero">Герой (5 куб.)</span>
            <span class="aos-badge-class role-mage">[Маг]</span>
            <span class="aos-badge-pts">275 очков</span>
          </div>
        </div>
        <div class="aos-stats-grid">
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">13</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Движение</span><span class="aos-stat-value">4</span></div>
          <div class="aos-stat-box"><span class="aos-stat-label">Броня</span><span class="aos-stat-value">4</span></div>
        </div>
        <div class="aos-weapons-section">
          <div class="aos-section-title">Вооружение (выберите один вариант)</div>
          <div class="aos-weapon-item" data-weapon-option="1">
            <div class="aos-weapon-header"><span class="aos-weapon-name">Молот Созидания</span><span class="aos-weapon-type">Ближний бой</span></div>
            <div class="aos-weapon-stats"><span>Порог: <strong>2+</strong></span><span>Урон: <strong>5</strong></span><span>Теги: <span class="aos-tag">[Пробой 2], [Размах]</span></span></div>
          </div>
          <div style="text-align: center; font-weight: bold; color: var(--accent); margin: 6px 0; font-size: 0.9rem;">— ИЛИ —</div>
          <div class="aos-weapon-item" data-weapon-option="2">
            <div class="aos-weapon-header"><span class="aos-weapon-name">Рунный резак</span><span class="aos-weapon-type">Дальний бой (Дальность 3)</span></div>
            <div class="aos-weapon-stats"><span>Порог: <strong>3+</strong></span><span>Урон: <strong>4</strong></span><span>Теги: <span class="aos-tag">[Пробой 1]</span></span></div>
          </div>
        </div>
        <div class="aos-body">
          <div class="aos-ability">
            <div class="aos-ability-title">Особое: Рунная вспышка &amp; Мастер рун</div>
            <div class="aos-ability-text"><strong>Рунная вспышка (1 ОД):</strong> Один раз за раунд Альвиз меняет местами два тайла ландшафта одинакового типа (Гора с Горой, Лес с Лесом, Река с Рекой).<br><strong>Мастер рун:</strong> Альвиз может нанести до 3 рун в начале раунда (вместо 2) и имеет право наложить две руны на одну модель (их эффекты суммируются).</div>
          </div>
        </div>
      </div>
    `
  },

  // ==========================================
  // ФРАКЦИЯ 2: АРАФИЯ (ПЕСЧАНЫЕ ГОБЛИНЫ) - ОБЩИЕ ПРАВИЛА
  // ==========================================
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

      <h3>Фракционные территории</h3>
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
      <h2>Клан 1 — Клан Скорпионов</h2>
      <p><strong>Стиль:</strong> ядовитые уколы, численное превосходство, изматывание врага. Вы окружаете противника мелкими быстрыми моделями и отравляете их, заставляя терять здоровье постепенно. Не выигрываете в прямом столкновении — выигрываете в затяжной войне.</p>
      
      <h3>Клановая способность — «Отравленное жало»</h3>
      <p>Каждый раз, когда модель клана Скорпионов наносит хотя бы 1 урон в ближнем бою (не базовый урон), цель получает маркер «Яд». В конце активации отравленной модели она получает 1 урон (Броня не блокирует этот урон). Маркер снимается в конце активации модели.</p>
      <ul>
        <li>Яд не складывается.</li>
        <li>Если модель с маркером «Яд» получает лечение, то вместо него — маркер снимается.</li>
        <li>Базовые отряды Скорпионов наносят яд только в ближнем бою. Элитные и герои — и в ближнем, и в стрелковом.</li>
      </ul>

      <h3>Клановая стойка — «Загон»</h3>
      <p>Модель в стойке «Загон»:</p>
      <ul>
        <li>Не может атаковать.</li>
        <li>Может перемещаться (базовое действие «Перемещение»).</li>
        <li><strong>Кольцо:</strong> Каждый раз, когда вражеская модель в радиусе 3 клеток проводит атаку по любой другой цели (кроме модели в «Загоне»), эта модель в «Загоне» немедленно проводит бесплатную ответную атаку (наносит базовый урон, без модификаторов за флаг/тыл). Срабатывает один раз за вражескую модель за её активацию.</li>
        <li><strong>Слаженная стая:</strong> Если две и более модели клана Скорпионов находятся в стойке «Загон» в радиусе 2 клеток друг от друга, их ответные удары получают +1 к урону.</li>
      </ul>

      <h3>Клановый пул — 4 жетона «Жадность»</h3>

      <h2>Состав клана</h2>

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
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">4</span></div>
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
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">4</span></div>
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
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">6</span></div>
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
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">6</span></div>
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
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">11</span></div>
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
      <h2>Клан 2 — Клан Барханов</h2>
      <p><strong>Стиль:</strong> скорость, манёвр, удар-отступление. Вы проноситесь через поле, бьёте там, где враг не готов, и исчезаете, прежде чем он успевает ответить. Самый быстрый клан в игре, но самый хрупкий.</p>
      
      <h3>Клановая способность — «Песчаный вихрь»</h3>
      <p>Один раз за раунд любая модель клана Барханов может переместиться после атаки на количество клеток, равное половине её Движения (округление вверх).</p>
      <ul>
        <li>Работает и в ближнем, и в дальнем бою.</li>
        <li>Перемещение происходит по общим правилам (штрафы за ландшафт учитываются, проходимость сквозь врагов закрыта, если не активны специальные эффекты).</li>
        <li>Сохраняет стойки «Атакующая» и «Защищающаяся». Из клановой стойки «Вихрь» модель при отступлении сбрасывается в «Нейтральную».</li>
      </ul>

      <h3>Клановая стойка — «Вихрь»</h3>
      <p>Модель в стойке «Вихрь»:</p>
      <ul>
        <li>Может атаковать и перемещаться.</li>
        <li><strong>Перекати-поле:</strong> При перемещении модель может проходить сквозь клетки с вражескими моделями (как при действии «Марш» с жетоном «Жадность», но бесплатно). Каждой вражеской модели, через которую пройдено, наносится 1 автоматический урон (без учета брони). Не более 1 раза за модель за активацию.</li>
        <li><strong>Песчаная завеса:</strong> Вражеские модели не могут проводить дальнобойные атаки по модели в «Вихре», если дистанция до неё превышает 3 клетки.</li>
      </ul>

      <h3>Клановый пул — 5 жетонов «Жадность»</h3>

      <h2>Состав клана</h2>

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
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">5</span></div>
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
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">5</span></div>
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
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">6</span></div>
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
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">6</span></div>
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
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">11</span></div>
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
      <h2>Клан 3 — Клан Костяных Шаманов</h2>
      <p><strong>Стиль:</strong> магия, ловушки, контроль поля и чужих моделей. Вы не убиваете врага напрямую — вы заставляете ландшафт убить его за вас. Самый медленный из кланов гоблинов, но самый хитрый.</p>
      
      <h3>Клановая способность — «Песчаное проклятие»</h3>
      <p>В начале каждого раунда (до активации моделей) игрок может наложить до 2 проклятий на вражеские модели или тайлы ландшафта. Проклятия действуют до конца раунда.</p>
      <ul>
        <li><strong>Зыбь (Тайл Ландшафта):</strong> Модель считается находящейся на тайле Реки для целей перемещения, даже если стоит на суше. Не складывается с реальной Рекой.</li>
        <li><strong>Слепота (Вражеская модель в пределах 4 клеток):</strong> Модель не может проводить дальнобойные атаки на дистанции более 2 клеток.</li>
        <li><strong>Истощение (Вражеская модель в пределах 4 клеток):</strong> Модель теряет 1 ХП в начале своей активации.</li>
        <li><strong>Песчаная буря (Тайл ландшафта):</strong> Тайл становится непроходимым для всех моделей (своих и чужих) до конца раунда. Модели на нём в момент наложения получают 1 урон и остаются в ловушке до конца раунда.</li>
      </ul>
      <p><em>Проклятия нельзя накладывать на Героев (кроме «Слепоты» — на них можно).</em></p>

      <h3>Клановая стойка — «Тотем»</h3>
      <p>Модель в стойке «Тотем»:</p>
      <ul>
        <li>Не может перемещаться и атаковать.</li>
        <li><strong>Костяная аура:</strong> все вражеские модели в радиусе 2 клетки получают −1 к броне.</li>
        <li><strong>Шаманский путь:</strong> если в радиусе 2 клетки от модели в «Тотеме» находится хотя бы одна союзная модель клана Костяных Шаманов, последняя получает +1 к стату Попадание.</li>
        <li>Модель в «Тотеме» может быть перенесена на 1 клетку в любом направлении другой союзной моделью клана, заканчивающей перемещение в смежной клетке (бесплатный толчок, не тратит ОД у той модели).</li>
      </ul>

      <h3>Клановый пул — 3 жетона «Жадность»</h3>

      <h2>Состав клана</h2>

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
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">4</span></div>
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
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">5</span></div>
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
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">8</span></div>
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
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">7</span></div>
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
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">12</span></div>
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