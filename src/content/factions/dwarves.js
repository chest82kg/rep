export const DWARVES_FACTIONS_DATA = [
  // --- ОБЩИЕ ПРАВИЛА ГНОМОВ ---
  {
    id: 'faction-dwarves-general',
    category: 'factions',
    categoryTitle: 'Фракции',
    faction: 'Кхад‑Дарум - Горные Гномы',
    type: 'article',
    title: 'Общие правила',
    content: `
  <div class="faction-kicker">Кхад‑Дарум · Горные Гномы</div>

  <div class="faction-summary">
    <p>Гномы — медлительная, но несокрушимая раса горных мастеров. Их сила — в удержании позиций, контроле высот и манипуляциях с ландшафтом. Каждая модель дорогая, каждая потеря болезненная, но сломить правильно выстроенную гномью линию — задача не из лёгких.</p>
  </div>

  <div class="faction-rule-grid">
    <section class="faction-rule-card faction-rule-card--ability">
      <h3>Фракционная способность — «Корни горы»</h3>
      <p>Любая модель гномов получает <strong>+1 к стату Броня</strong>, если находится на тайле Горы (любого уровня). Это складывается с другими бонусами к Броне.</p>
    </section>

    <section class="faction-rule-card faction-rule-card--pool">
      <h3>Фракционный ОД — «Закалка»</h3>
      <p>Гномий фракционный пул состоит из 4 ОД «Закалка». ОД применяется к приказу в момент активации модели и усиливает его:</p>
    </section>
  </div>

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

  <p class="faction-note"><em>Один приказ может получить только один жетон «Закалка» за активацию. Жетоны из пула не восстанавливаются — потраченные уходят до конца игры.</em></p>

  <section class="faction-rule-card faction-rule-card--wide">
    <h3>Фракционные территории</h3>
    <p>Перед расстановкой моделей игрок выбирает от 1 до 3 фракционных территорий (в зависимости от договоренности или формата игры). Каждая размещается по правилам расстановки.</p>
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
      <div class="faction-kicker">Кхад‑Дарум · КЛАН ЖЕЛЕЗНОЙ КУЗНИ</div>

<div class="faction-summary">
  <p><strong>Стиль:</strong> непробиваемый строй, медленное продвижение, контроль территории. Вы строите стену из щитов, переставляете горы и не даёте противнику подойти.</p>
</div>

<div class="faction-rule-grid">
  <section class="faction-rule-card faction-rule-card--ability">
    <h3>Клановая способность — «Горный щит»</h3>
    <p>Потратив фракционный ОД, модель Клана Железной Кузни на тайле Горы создаёт заслон — все союзные модели в радиусе 2 от этой модели получают +1 к Броне до конца раунда. <em>Один раз за раунд.</em></p>
  </section>

  <section class="faction-rule-card faction-rule-card--pool">
    <h3>Клановый пул — 5 Фракционных ОД «Закалка»</h3>
    <p>У клана Железной Кузни самый большой пул среди всех кланов гномов — 5 ОД вместо 4. Это компенсирует низкую мобильность: лишние жетоны уходят на «Марш» и «Защиту».</p>
  </section>

  <section class="faction-rule-card faction-rule-card--stance faction-rule-card--wide">
    <h3>Клановая стойка — «Горный панцирь»</h3>
    <p>Модель не может совершать действия «Перемещение» и «Натиск». В обмен:</p>
    <ul class="faction-rule-list">
      <li><strong>+2 к Броне</strong> (складывается с «Корнями горы» и «Блоком»).</li>
      <li><strong>Отражение:</strong> Если моделью получен минимальный урон, то она наносит в ответ 1 урон (не поглощается броней). Работает только против атак ближнего боя. <em>Один раз за атаку.</em></li>
      <li>Модель остаётся в этой стойке до тех пор, пока не сменит её приказом «Стойка» или не будет выведена из неё эффектом.</li>
    </ul>
    <p class="faction-note">В стойке «Горный панцирь» доступны действия: «Атака» (только по смежной цели), «Блок», «Контратака», «Глухая оборона».</p>
  </section>
</div>

<h2 class="roster-heading">Состав клана</h2>

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
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">8</span></div>
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
            <div class="aos-ability-title">Особое: Щитовая стена</div>
            <div class="aos-ability-text">Если модель не двигалась в эту активацию, она получает +1 к Броне до конца раунда.</div>
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
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">7</span></div>
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
            <div class="aos-ability-title">Особое: Окоп</div>
            <div class="aos-ability-text">Если модель не двигалась в эту активацию, она получает +1 к Порогу попадания (например, 3+ → 2+).</div>
          </div>
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
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">11</span></div>
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
            <div class="aos-ability-title">Особое: Таранный удар</div>
            <div class="aos-ability-text">Если модель переместилась на 3+ клетки и вошла в контакт с врагом, её первая атака в этом раунде получает +2 к Урону.</div>
          </div>
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
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">11</span></div>
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
            <div class="aos-ability-title">Особое: Горная охота</div>
            <div class="aos-ability-text">Если модель стоит на тайле Горы, она получает +1 к Дальности (3 → 4).</div>
          </div>
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
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">17</span></div>
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
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">13</span></div>
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
     <div class="faction-kicker">Кхад‑Дарум · ГЛУБОКИЕ ТРОПЫ</div>

<div class="faction-summary">
  <p><strong>Стиль:</strong> скрытность, подкопы, внезапные удары. Вы появляетесь там, где вас не ждут, бьете и исчезаете. Хрупкие, но быстрые и маневренные.</p>
</div>

<div class="faction-rule-grid">
  <section class="faction-rule-card faction-rule-card--ability faction-rule-card--wide">
    <h3>Клановая способность — «Подземный ход»</h3>
    <p>В начале каждого раунда модели клана, находящиеся на тайле Горы, могут быть сняты с поля и выставлены заново на любой тайл Горы на поле. Это не считается активацией. Ограничения:</p>
    <ul class="faction-rule-list">
      <li>Нельзя выставить модель на клетку, занятую другой моделью.</li>
      <li>Нельзя выставить модель в зону выставления противника.</li>
      <li>Максимум 2 модели за раунд могут использовать «Подземный ход».</li>
    </ul>
  </section>

  <section class="faction-rule-card faction-rule-card--stance faction-rule-card--wide">
    <h3>Клановая стойка — «Засада»</h3>
    <p>Модель в стойке «Засада»:</p>
    <ul class="faction-rule-list">
      <li><strong>Невидимость:</strong> не может быть выбрана целью дальнобойной атаки с дистанции более 3 клеток. В ближнем бою — может быть атакована только моделью в смежной клетке.</li>
      <li><strong>Первый удар:</strong> при выходе из «Засады» (совершении любого действия, кроме «Смены стойки») первая атака модели в этом раунде получает +2 Урону. Бонус срабатывает один раз за раунд.</li>
      <li>Модель может оставаться в «Засаде» сколько угодно, но если она совершает перемещение или атаку — стойка автоматически меняется на «Атакующую» (бонус «Первого удара» срабатывает, затем стойка меняется).</li>
    </ul>
  </section>

  <section class="faction-rule-card faction-rule-card--pool faction-rule-card--wide">
    <h3>Клановый пул — 3 жетона «Закалка»</h3>
  </section>
</div>

<h2 class="roster-heading">Состав клана</h2>

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
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">7</span></div>
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
            <div class="aos-ability-title">Особое: Тени</div>
            <div class="aos-ability-text">Если модель заканчивает активацию на тайле Леса, она получает −1 к Порогу попадания по ней (врагу сложнее попасть).</div>
          </div>
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
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">7</span></div>
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
          <div class="aos-ability">
            <div class="aos-ability-title">Особое: Болотная защита</div>
            <div class="aos-ability-text">Если модель стоит на тайле Реки, она получает +1 к Броне.</div>
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
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">9</span></div>
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
          <div class="aos-ability">
            <div class="aos-ability-title">Особое: Сюрприз</div>
            <div class="aos-ability-text">При выходе из «Подкопа» они могут бесплатно провести одну атаку по модели в радиусе 2 клеток (метание гранаты).</div>
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
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">10</span></div>
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
          <div class="aos-ability">
            <div class="aos-ability-title">Особое: Прыжок</div>
            <div class="aos-ability-text">Один раз за активацию может переместиться на 2 клетки по прямой, игнорируя модели и препятствия.</div>
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
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">15</span></div>
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
     <div class="faction-kicker">Кхад‑Дарум · КЛАН РУННЫХ КУЗНЕЦОВ</div>

<div class="faction-summary">
  <p><strong>Стиль:</strong> руны, магия ландшафта, синергия. Вы усиливаете свои модели, ослабляете вражеские и меняете поле боя под себя. Слабы в одиночку, сильны в связке.</p>
</div>

<div class="faction-rule-grid">
  <section class="faction-rule-card faction-rule-card--ability faction-rule-card--wide">
    <h3>Клановая способность — «Рунная гравировка»</h3>
    <p>В начале каждого раунда (до активаций моделей) игрок может нанести до 2 рун на свои модели. Руны действуют до конца раунда. В начале следующего раунда можно нанести новые (старые стираются).</p>
    <p><strong>Список рун:</strong></p>
    <ul class="faction-rule-list">
      <li><strong>Руна Камня:</strong> дает +2 к Броне.</li>
      <li><strong>Руна Пламени:</strong> при атаке ближнего боя добавляет +2 к урону.</li>
      <li><strong>Руна Ветра:</strong> дает +2 к Движению.</li>
      <li><strong>Руна Тишины:</strong> полностью поглощает первые 3 единицы входящего урона за раунд (срабатывает до вычета брони). <em>Один раз за активацию.</em></li>
    </ul>
    <p class="faction-note"><em>На одну модель можно нанести только одну руну за раунд. Руну нельзя перенести на другую модель.</em></p>
  </section>

  <section class="faction-rule-card faction-rule-card--stance">
    <h3>Клановая стойка — «Рунный круг»</h3>
    <p>Модель в стойке «Рунный круг»:</p>
    <ul class="faction-rule-list">
      <li>Не может атаковать.</li>
      <li>Может совершать базовое действие «Перемещение».</li>
      <li><strong>Отдача:</strong> Каждый раз, когда вражеская модель заканчивает перемещение в радиусе 2 клеток от неё, она немедленно получает 1 единицу урона (без брони). Срабатывает один раз за перемещение на каждую вражескую модель.</li>
      <li><strong>Рунный щит:</strong> модель получает защиту от позиционных атак (атаки с фланга/тыла не получают бонуса против нее).</li>
    </ul>
  </section>

  <section class="faction-rule-card faction-rule-card--pool">
    <h3>Клановый пул — 4 жетона «Закалка»</h3>
    <p>Стандартный пул. Но жетоны «Закалка» у Рунных Кузнецов можно тратить как одноразовые руны прямо во время активации модели, сжигая жетон из пула при объявлении действия:</p>
    <ul class="faction-rule-list">
      <li><strong>При действии «Удар»:</strong> Атака получает тег <span class="aos-tag">[Пробой 1]</span>.</li>
      <li><strong>При действии «Защита»:</strong> Модель мгновенно восстанавливает 1 ХП (один раз за активацию).</li>
      <li><strong>При действии «Марш»:</strong> Модель оставляет за собой «Рунный след» — клетки, по которым она прошла, дают союзникам +1 к Движению при прохождении через них до конца раунда.</li>
      <li><strong>При смене стойки:</strong> Позволяет войти в «Рунный круг» бесплатно, без траты дополнительного ОД.</li>
    </ul>
  </section>
</div>

<h2 class="roster-heading">Состав клана</h2>

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
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">6</span></div>
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
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">7</span></div>
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
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">10</span></div>
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
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">13</span></div>
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
          <div class="aos-stat-box"><span class="aos-stat-label">ХП</span><span class="aos-stat-value">16</span></div>
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
  }
];