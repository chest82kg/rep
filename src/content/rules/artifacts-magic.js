export const ARTIFACTS_MAGIC_DATA = [
  {
    id: 'rules-artifacts-magic',
    category: 'rules',
    categoryTitle: 'Основные правила',
    type: 'article',
    title: 'Артефакты и Магия',
    content: `
      <p>Этот раздел описывает три механики, которые расширяют возможности армии за пределами базовых правил: <strong>артефакты</strong>, <strong>магия</strong> и <strong>молитвы</strong>.</p>

      <div class="art-magic-overview">
        <section class="art-magic-overview-card art-magic-overview-card--artifacts">
          <h3>Артефакты</h3>
          <p>Дополнительное снаряжение, приобретаемое за очки армии при составлении ростера.</p>
        </section>

        <section class="art-magic-overview-card art-magic-overview-card--magic">
          <h3>Магия</h3>
          <p>Заклинания Мага: проверка кубиком из пула и трата Маны.</p>
        </section>

        <section class="art-magic-overview-card art-magic-overview-card--prayers">
          <h3>Молитвы</h3>
          <p>Действия Жреца без проверки по кубикам, расходующие Веру.</p>
        </section>
      </div>

      <section class="artifacts-section">
        <h3>Артефакты</h3>

        <div class="rule-callout">
          <p><strong>Ограничения по составу:</strong></p>
          <ul>
            <li><strong>Лимит на модель:</strong> одна модель может нести не более 1 артефакта.</li>
            <li><strong>Лимит на армию:</strong> максимальное количество артефактов в ростере ограничено числом Героев (за каждого Героя в армии можно докупить по 1 артефакту на любую модель).</li>
            <li><strong>Покупка:</strong> артефакты приобретаются за очки армии при составлении ростера.</li>
          </ul>
        </div>

        <section class="artifacts-table-section">
          <h4>Базовые Артефакты (доступны любой фракции)</h4>

          <table style="width:100%; border-collapse: collapse; margin: 16px 0; background: var(--bg-panel);">
            <thead>
              <tr style="border-bottom: 2px solid var(--border); text-align: left;">
                <th style="padding: 8px;">Артефакт</th>
                <th style="padding: 8px;">Стоимость</th>
                <th style="padding: 8px;">Эффект</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: 8px;"><strong>Зачарованное оружие</strong></td>
                <td style="padding: 8px;">25 очков</td>
                <td style="padding: 8px;">Выбранное оружие ближнего боя модели получает тег <span class="aos-tag">[Пробой 1]</span>.</td>
              </tr>
              <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: 8px;"><strong>Толстый щит</strong></td>
                <td style="padding: 8px;">20 очков</td>
                <td style="padding: 8px;">Модель получает +1 к Броне.</td>
              </tr>
              <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: 8px;"><strong>Быстрые сапоги</strong></td>
                <td style="padding: 8px;">15 очков</td>
                <td style="padding: 8px;">Модель получает +1 к Движению.</td>
              </tr>
              <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: 8px;"><strong>Амулет выживания</strong></td>
                <td style="padding: 8px;">35 очков</td>
                <td style="padding: 8px;">+2 к ХП. Один раз за игру: при получении смертельного урона модель не уничтожается, а остаётся на поле с 1 ХП.</td>
              </tr>
              <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: 8px;"><strong>Сигнальный рог</strong><br><em style="font-size:0.85rem; color:var(--text-muted);">только Герои и Элита</em></td>
                <td style="padding: 8px;">30 очков</td>
                <td style="padding: 8px;">Один раз за раунд позволяет активировать одну союзную модель в радиусе 3 клеток вне очереди (сразу после завершения активации носителя).</td>
              </tr>
              <tr>
                <td style="padding: 8px;"><strong>Свиток телепортации</strong></td>
                <td style="padding: 8px;">25 очков</td>
                <td style="padding: 8px;">Одноразовый. За 1 ОД телепортирует носителя на любую пустую клетку в радиусе 5 клеток.</td>
              </tr>
            </tbody>
          </table>
        </section>
      </section>

      <section class="artifact-bonuses-section">
        <h3>Правило артефактов, изменяющих характеристики</h3>

        <img src="./images/rules/artifact-bonuses.svg" alt="Схема бонусов артефактов: ХП, Броня, Движение" class="rule-image">

        <p>Некоторые артефакты (например, «Амулет выживания») изменяют базовые характеристики модели. Это работает следующим образом:</p>

        <ol class="rule-steps">
          <li><strong>Бонус к ХП:</strong> Если артефакт даёт +N к ХП, увеличьте <em>и текущее, и максимальное</em> значение ХП модели на N при надевании артефакта. Лечение может восстанавливать модель до нового максимума.</li>
          <li><strong>Бонус к Броне:</strong> Если артефакт даёт +N к Броне, добавьте N к значению Брони модели. Этот бонус складывается с другими бонусами (например, от стойки).</li>
          <li><strong>Бонус к Движению:</strong> Если артефакт даёт +N к Движению, добавьте N к базовому Движению модели. Это влияет на «Перемещение» и «Рывок».</li>
          <li><strong>Бонус к оружию:</strong> Если артефакт даёт тег оружию (например, «Зачарованное оружие» → [Пробой 1]), добавьте этот тег к оружию модели. Если оружие уже имеет тег Пробой — бонусы складываются.</li>
        </ol>

        <details class="rule-example">
          <summary>Пример: как работают артефакты на ХП</summary>
          <div>
            У Железноборода-Воина 6 ХП и 3 Брони. Ему надели «Амулет выживания» (+2 ХП) и «Толстый щит» (+1 Броня). Теперь у него 8 ХП (и текущее, и максимум) и 4 Брони. Лечение восстановит его до 8 ХП, а не до 6.
          </div>
        </details>
      </section>

      <section class="magic-prayers-section">
        <h3>Механика Магии и Молитв</h3>

        <h4>Разделение ролей</h4>

        <div class="magic-role-grid">
          <section class="magic-role-card magic-role-card--magic">
            <h5>Магия (Заклинания)</h5>
            <p>требует выделения кубика из пула Мага (аналогично атаке) + траты ресурса Маны. Магия направлена на урон, контроль поля и ослабление врагов.</p>
          </section>

          <section class="magic-role-card magic-role-card--prayers">
            <h5>Молитвы</h5>
            <p>не требуют проверки по кубикам. Жрец тратит ресурс Веры и совершает действие. Молитвы направлены на исцеление, защитные ауры и снятие негативных эффектов.</p>
          </section>
        </div>

        <section class="resource-economy-section">
          <h4>Экономика Маны и Веры</h4>

          <div class="rule-callout">
            <ul>
              <li>В начале раунда армия генерирует Ману (за каждого живого Мага) и Веру (за каждого живого Жреца).</li>
              <li><strong>Приток:</strong> +2 очка ресурса за каждого Мага/Жреца в строю.</li>
              <li><strong>Максимальный запас:</strong> в пуле армии не может храниться более 6 единиц Маны и 6 единиц Веры одновременно.</li>
            </ul>
          </div>
        </section>

        <section class="spell-table-section">
          <h4>Базовая Магия (Школа Стихий и Разума)</h4>
          <p>Для применения заклинания Маг выделяет 1 кубик из своего пула (соответствующий Порогу) и тратит указанное количество Маны.</p>

          <table style="width:100%; border-collapse: collapse; margin: 16px 0; background: var(--bg-panel);">
            <thead>
              <tr style="border-bottom: 2px solid var(--border); text-align: left;">
                <th style="padding: 8px;">Заклинание</th>
                <th style="padding: 8px;">Порог / Мана / Дальность</th>
                <th style="padding: 8px;">Эффект</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: 8px;"><strong>Огненная стрела</strong></td>
                <td style="padding: 8px;">3+ / 1 Мана / Дальность 4</td>
                <td style="padding: 8px;">Наносит 3 урона цели. Тег: <span class="aos-tag">[Пробой 1]</span>.</td>
              </tr>
              <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: 8px;"><strong>Каменный щит</strong></td>
                <td style="padding: 8px;">3+ / 1 Мана / Дальность 3</td>
                <td style="padding: 8px;">Выбранная союзная модель получает +2 к Броне до конца раунда.</td>
              </tr>
              <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: 8px;"><strong>Туман иллюзий</strong></td>
                <td style="padding: 8px;">4+ / 1 Мана / Дальность 4</td>
                <td style="padding: 8px;">Вражеская модель не может проводить дальнобойные атаки и использовать действие «Спешка» до своей следующей активации.</td>
              </tr>
              <tr>
                <td style="padding: 8px;"><strong>Взрыв силы</strong></td>
                <td style="padding: 8px;">4+ / 2 Маны / Дальность 3</td>
                <td style="padding: 8px;">Все вражеские модели в радиусе 2 клеток от указанной точки получают по 2 урона и отбрасываются на 1 клетку назад.</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="prayer-table-section">
          <h4>Базовые Молитвы (Пантеон Защиты и Света)</h4>
          <p>Жрец тратит 1 ОД на действие «Молитва» и списывает Веру из общего пула армии (значение кубика не имеет значения, достаточно любого кубика, удовлетворяющего действию).</p>

          <table style="width:100%; border-collapse: collapse; margin: 16px 0; background: var(--bg-panel);">
            <thead>
              <tr style="border-bottom: 2px solid var(--border); text-align: left;">
                <th style="padding: 8px;">Молитва</th>
                <th style="padding: 8px;">Стоимость / Дальность</th>
                <th style="padding: 8px;">Эффект</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: 8px;"><strong>Молитва Исцеления</strong></td>
                <td style="padding: 8px;">1 Вера / Дальность 3</td>
                <td style="padding: 8px;">Восстанавливает 2 ХП выбранной союзной модели.</td>
              </tr>
              <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: 8px;"><strong>Благословение стойкости</strong></td>
                <td style="padding: 8px;">1 Вера / Дальность 3</td>
                <td style="padding: 8px;">Выбранная союзная модель получает иммунитет к отбрасыванию, яду и проклятиям до конца раунда.</td>
              </tr>
              <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: 8px;"><strong>Освященное оружие</strong></td>
                <td style="padding: 8px;">1 Вера / Дальность 2</td>
                <td style="padding: 8px;">Следующая атака союзной модели в текущем раунде получает тег <span class="aos-tag">[Пробой 2]</span>.</td>
              </tr>
              <tr>
                <td style="padding: 8px;"><strong>Небесный заслон</strong></td>
                <td style="padding: 8px;">2 Веры / Аура радиус 2</td>
                <td style="padding: 8px;">Все союзные модели в радиусе 2 клеток от Жреца игнорируют первые 2 единицы любого входящего урона до конца раунда.</td>
              </tr>
            </tbody>
          </table>
        </section>
      </section>
    `
  }
];