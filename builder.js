import { DATABASE } from './data.js';

let roster = {
  name: 'Мой Ростер',
  clan: '',
  battleplanId: '',
  selectedStakes: [],
  units: [] // { title, role, ap, html }
};

const STAKES_LIST = [
  { id: 'bet-heights', name: 'Бич высот', cost: 2, desc: '+1 ОП за уничтожение врагов на высотах 2+. Порог: мин. 2 модели.' },
  { id: 'bet-piper', name: 'Волынщик', cost: 3, desc: '+1 ОП за удержание КТ/высоты 2+. Порог: мин. 2 раунда.' },
  { id: 'bet-breaker', name: 'Крушитель', cost: 2, desc: '+1 ОП за сдвиг слоя, +2 ОП за пролом/глыбу. Порог: мин. 3 сдвига.' },
  { id: 'bet-basket', name: 'Головы в корзину', cost: 1, desc: '+1 ОП за каждую уничтоженную модель. Порог: 3 модели.' },
  { id: 'bet-hero-scalp', name: 'Скальп Героя', cost: 2, desc: '+3 ОП за убийство Героя, +1 ОП за первый урон. Порог: 3 урона.' },
  { id: 'bet-banner', name: 'Знаменосец', cost: 3, desc: '+2 ОП за раунд удержания 2+ КТ. Порог: 2+ точки 2 раунда.' },
  { id: 'bet-outpost', name: 'Передовой пост', cost: 1, desc: '+1 ОП за контроль хотя бы 1 КТ.' },
  { id: 'bet-stone-master', name: 'Хозяин камня', cost: 2, desc: '+1 ОП за сдвиг слоя. Порог: 4 сдвига.' },
  { id: 'bet-map-draft', name: 'Чертёж местности', cost: 1, desc: '+2 ОП при наличии 3+ тайлов высотой 3.' },
  { id: 'bet-march', name: 'Марш-бросок', cost: 1, desc: '+2 ОП за нахождение на вражеской половине поля.' },
  { id: 'bet-wall', name: 'Стена до конца', cost: 2, desc: '+1 ОП за раунд без потерь. Порог: 2 раунда.' },
  { id: 'bet-reserve-opt', name: 'Резерв', cost: 1, desc: 'Объявление ставки стоимостью до 2 МИ до конца 2-го раунда.' }
];

export function renderBuilderUI(container) {
  container.innerHTML = `
    <h1>Конструктор армий (Билдер)</h1>
    <p>Сформируйте ростер, выберите клан, настройте бюджет ставок (5 МИ) и добавьте бойцов.</p>

    <div class="builder-container">
      <!-- 1. Название и Клан -->
      <div class="builder-card">
        <h3>1. Название и Клан армии</h3>
        <div class="builder-form-group">
          <label>Название ростера:</label>
          <input type="text" id="builder-roster-name" class="search-input" value="${roster.name}">
        </div>
        <div class="builder-form-group">
          <label>Выберите Клан:</label>
          <select id="builder-faction-select" class="search-input">
            <option value="">-- Выберите клан --</option>
            <option value="Клан 1 — Клан Железной Кузни" ${roster.clan === 'Клан 1 — Клан Железной Кузни' ? 'selected' : ''}>Кхад‑Дарум: Клан Железной Кузни</option>
            <option value="Клан 2 — Клан Глубоких Троп" ${roster.clan === 'Клан 2 — Клан Глубоких Троп' ? 'selected' : ''}>Кхад‑Дарум: Клан Глубоких Троп</option>
            <option value="Клан 3 — Клан Рунных Кузнецов" ${roster.clan === 'Клан 3 — Клан Рунных Кузнецов' ? 'selected' : ''}>Кхад‑Дарум: Клан Рунных Кузнецов</option>
            <option value="Клан 1 — Клан Скорпионов" ${roster.clan === 'Клан 1 — Клан Скорпионов' ? 'selected' : ''}>Арафия: Клан Скорпионов</option>
            <option value="Клан 2 — Клан Барханов" ${roster.clan === 'Клан 2 — Клан Барханов' ? 'selected' : ''}>Арафия: Клан Барханов</option>
            <option value="Клан 3 — Клан Костяных Шаманов" ${roster.clan === 'Клан 3 — Клан Костяных Шаманов' ? 'selected' : ''}>Арафия: Клан Костяных Шаманов</option>
          </select>
        </div>
      </div>

      <!-- 2. Батлплан -->
      <div class="builder-card">
        <h3>2. Выбор Батлплана миссии</h3>
        <div class="builder-form-group">
          <select id="builder-battleplan-select" class="search-input">
            <option value="">-- Без батлплана (Произвольный бой) --</option>
            <option value="battleplan-1" ${roster.battleplanId === 'battleplan-1' ? 'selected' : ''}>Батлплан 1 — «Перевал»</option>
            <option value="battleplan-2" ${roster.battleplanId === 'battleplan-2' ? 'selected' : ''}>Батлплан 2 — «Речной Рубеж»</option>
            <option value="battleplan-3" ${roster.battleplanId === 'battleplan-3' ? 'selected' : ''}>Батлплан 3 — «Глухой Лес»</option>
            <option value="battleplan-4" ${roster.battleplanId === 'battleplan-4' ? 'selected' : ''}>Батлплан 4 — «Две Высоты»</option>
            <option value="battleplan-5" ${roster.battleplanId === 'battleplan-5' ? 'selected' : ''}>Батлплан 5 — «Прорыв»</option>
            <option value="battleplan-6" ${roster.battleplanId === 'battleplan-6' ? 'selected' : ''}>Батлплан 6 — «Истребление»</option>
          </select>
        </div>
      </div>

      <!-- 3. Ставки -->
      <div class="builder-card">
        <div class="builder-header-flex">
          <h3>3. Выбор Ставок</h3>
          <div class="builder-budget-badge" id="builder-mi-budget">Осталось бюджета: 5 МИ</div>
        </div>
        <div class="builder-stakes-grid" id="builder-stakes-list"></div>
      </div>

      <!-- 4. Юниты клана -->
      <div class="builder-card">
        <h3>4. Доступные отряды клана</h3>
        <div id="builder-units-available">
          <p style="color: var(--text-muted);">Сначала выберите клан в первом пункте выше.</p>
        </div>
      </div>

      <!-- 5. Экранная сводка и Кнопки управления -->
      <div class="builder-card">
        <h3 id="builder-summary-title">Состав армии (0 моделей)</h3>
        <div id="builder-roster-summary">
          <p style="color: var(--text-muted);">Отряды ещё не добавлены.</p>
        </div>

        <div style="margin-top: 24px; display: flex; flex-wrap: wrap; gap: 16px;">
          <button id="btn-show-mission" class="builder-action-btn large">📋 1. Сводка миссии</button>
          <button id="btn-show-army" class="builder-action-btn large">⚔️ 2. Карточки армии</button>
          <button id="btn-export-pdf" class="builder-action-btn primary large">📄 3. Скачать в PDF / Печать</button>
        </div>
      </div>

      <!-- Модальное окно -->
      <div id="builder-display-modal" class="builder-modal hidden">
        <div class="builder-modal-content">
          <button id="builder-modal-close" class="builder-modal-close">&times;</button>
          <div id="builder-modal-body"></div>
        </div>
      </div>
    </div>
  `;

  initBuilderEvents();
  updateAvailableUnits();
  renderRosterSummary();
}

function initBuilderEvents() {
  const factionSelect = document.getElementById('builder-faction-select');
  if (factionSelect) {
    factionSelect.addEventListener('change', (e) => {
      roster.clan = e.target.value;
      roster.units = []; 
      updateAvailableUnits();
      renderRosterSummary();
    });
  }

  const rosterNameInput = document.getElementById('builder-roster-name');
  if (rosterNameInput) {
    rosterNameInput.addEventListener('input', (e) => {
      roster.name = e.target.value;
    });
  }

  const battleplanSelect = document.getElementById('builder-battleplan-select');
  if (battleplanSelect) {
    battleplanSelect.addEventListener('change', (e) => {
      roster.battleplanId = e.target.value;
    });
  }

  const modalClose = document.getElementById('builder-modal-close');
  if (modalClose) {
    modalClose.addEventListener('click', () => {
      document.getElementById('builder-display-modal').classList.add('hidden');
    });
  }

  // Кнопка 1: Сводка миссии
  const btnMission = document.getElementById('btn-show-mission');
  if (btnMission) {
    btnMission.addEventListener('click', () => {
      const selectedBattleplan = DATABASE.find(i => i.id === roster.battleplanId);
      const modal = document.getElementById('builder-display-modal');
      const body = document.getElementById('builder-modal-body');

      body.innerHTML = `
        <h2 style="color:#d1b384; border-bottom:2px solid var(--border); padding-bottom:8px;">📋 Сводка миссии</h2>
        <h3 style="margin-top:16px; color:var(--accent);">Выбранные Ставки:</h3>
        ${roster.selectedStakes.length === 0 ? '<p style="color:var(--text-muted);">Ставки не выбраны.</p>' : `
          <ul style="padding-left:20px; margin-top:8px;">
            ${roster.selectedStakes.map(id => {
              const st = STAKES_LIST.find(s => s.id === id);
              return st ? `<li style="margin-bottom:8px;"><strong>${st.name} [${st.cost} МИ]:</strong> ${st.desc}</li>` : '';
            }).join('')}
          </ul>
        `}
        <h3 style="margin-top:24px; color:var(--accent);">Батлплан: ${selectedBattleplan ? selectedBattleplan.title : 'Не выбран'}</h3>
        ${selectedBattleplan ? `<div style="margin-top:12px;">${selectedBattleplan.content}</div>` : '<p style="color:var(--text-muted);">Произвольный бой без специального сценария.</p>'}
      `;
      modal.classList.remove('hidden');
    });
  }

  // Кнопка 2: Карточки армии (сводный подсчет + уникальные датакарты)
  const btnArmy = document.getElementById('btn-show-army');
  if (btnArmy) {
    btnArmy.addEventListener('click', () => {
      const clanArticle = DATABASE.find(item => item.title === roster.clan);
      const modal = document.getElementById('builder-display-modal');
      const body = document.getElementById('builder-modal-body');

      let cleanClanContent = '';
      if (clanArticle) {
        cleanClanContent = clanArticle.content
          .replace(/<div class="aos-card">[\s\S]*?<\/div>\s*<\/div>/g, '')
          .split(/Состав клана/i)[0];
      }

      const counts = {};
      roster.units.forEach(u => {
        counts[u.title] = (counts[u.title] || 0) + 1;
      });

      const uniqueCardsMap = new Map();
      roster.units.forEach(u => {
        if (!uniqueCardsMap.has(u.title)) uniqueCardsMap.set(u.title, u.html);
      });
      const uniqueCardsHTML = Array.from(uniqueCardsMap.values());

      body.innerHTML = `
        <h2 style="color:#d1b384; border-bottom:2px solid var(--border); padding-bottom:8px;">⚔️ Состав и Карточки Армии</h2>
        <p style="margin-top:8px;"><strong>Ростер:</strong> ${roster.name || 'Безымянный'}</p>
        <p><strong>Клан:</strong> ${roster.clan || 'Не выбран'}</p>

        ${cleanClanContent ? `
          <div style="margin-top:20px; background:rgba(0,0,0,0.3); padding:16px; border-radius:8px; border:1px solid var(--border);">
            <h3 style="color:var(--accent); margin-bottom:12px;">Правила и способности клана</h3>
            <div>${cleanClanContent}</div>
          </div>
        ` : ''}

        <h3 style="margin-top:24px; color:var(--accent);">Сводный состав армии (${roster.units.length} моделей):</h3>
        ${roster.units.length === 0 ? '<p style="color:var(--text-muted);">Юниты не добавлены.</p>' : `
          <ul style="padding-left:20px; margin-top:8px; margin-bottom:20px;">
            ${Object.keys(counts).map(title => `<li><strong>${title}</strong> — ${counts[title]} шт.</li>`).join('')}
          </ul>
        `}

        <h3 style="margin-top:24px; color:var(--accent);">Уникальные датакарты юнитов:</h3>
        ${uniqueCardsHTML.length === 0 ? '<p style="color:var(--text-muted);">Юниты не добавлены в ростер.</p>' : `
          <div style="display:flex; flex-direction:column; gap:16px; margin-top:12px;">
            ${uniqueCardsHTML.join('')}
          </div>
        `}
      `;
      modal.classList.remove('hidden');
    });
  }

  // Кнопка 3: Скачать в PDF / Печать
  const btnPdf = document.getElementById('btn-export-pdf');
  if (btnPdf) {
    btnPdf.addEventListener('click', () => {
      const selectedBattleplan = DATABASE.find(i => i.id === roster.battleplanId);
      const clanArticle = DATABASE.find(item => item.title === roster.clan);

      let cleanClanContent = '';
      if (clanArticle) {
        cleanClanContent = clanArticle.content
          .replace(/<div class="aos-card">[\s\S]*?<\/div>\s*<\/div>/g, '')
          .split(/Состав клана/i)[0];
      }

      let formattedBattleplanHTML = '';
      if (selectedBattleplan) {
        formattedBattleplanHTML = selectedBattleplan.content
          .replace(/<h3>Основное игровое поле<\/h3>/g, '<div class="map-page-break"></div><h3>Основное игровое поле</h3>')
          .replace(/<h3>Расстановка Атакующего и Защищающегося<\/h3>/g, '<div class="map-page-break"></div><h3>Расстановка Атакующего и Защищающегося</h3>')
          .replace(/<h3>Эвакуация<\/h3>/g, '<div class="map-page-break"></div><h3>Эвакуация</h3>')
          .replace(/<h3>Тайлы и подсказки<\/h3>/g, '<div class="map-page-break"></div><h3>Тайлы и подсказки</h3>');
      }

      const counts = {};
      roster.units.forEach(u => { counts[u.title] = (counts[u.title] || 0) + 1; });

      const uniqueCardsMap = new Map();
      roster.units.forEach(u => { if (!uniqueCardsMap.has(u.title)) uniqueCardsMap.set(u.title, u.html); });
      const uniqueCardsHTML = Array.from(uniqueCardsMap.values());

      const printHTML = `
        <!DOCTYPE html>
        <html lang="ru">
        <head>
          <meta charset="UTF-8">
          <title>${roster.name || 'Боевой Ростер'}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              color: #000; 
              background: #fff; 
              padding: 24px; 
              line-height: 1.6; 
            }
            h1 { 
              font-size: 26px; 
              text-align: center; 
              border-bottom: 2px solid #000; 
              padding-bottom: 8px; 
              margin-bottom: 20px; 
            }
            h2 { 
              font-size: 20px; 
              margin-top: 10px; 
              border-bottom: 1px solid #000; 
              padding-bottom: 6px; 
              page-break-after: avoid;
              break-after: avoid;
            }
            h3 { 
              font-size: 16px;
              margin-top: 16px;
              page-break-after: avoid;
              break-after: avoid;
            }
            p { margin-bottom: 10px; }
            ul, ol { padding-left: 24px; margin-bottom: 12px; }
            li { margin-bottom: 6px; }

            .page-break {
              page-break-before: always;
              break-before: page;
              padding-top: 10px;
            }

            .map-page-break {
              page-break-before: always;
              break-before: page;
            }

            /* Защита датакарт от разрывов пополам */
            .aos-card { 
              border: 1px solid #000; 
              border-radius: 8px; 
              margin: 16px 0; 
              padding: 16px; 
              page-break-inside: avoid !important; 
              break-inside: avoid !important;
              -webkit-column-break-inside: avoid;
              display: block;
              background: #f9f9f9; 
            }
            .aos-header { 
              display: flex; 
              justify-content: space-between; 
              font-weight: bold; 
              font-size: 16px; 
              border-bottom: 1px solid #000; 
              padding-bottom: 8px; 
              margin-bottom: 8px; 
            }
            .aos-stats-grid { 
              display: flex; 
              gap: 10px; 
              margin: 8px 0; 
              font-size: 14px; 
            }
            .aos-stat-box { 
              border: 1px solid #ccc; 
              padding: 4px 8px; 
              text-align: center; 
              background: #fff; 
            }
            .aos-ability { 
              margin-top: 8px; 
              font-size: 13px; 
            }

            img { 
              max-width: 85%; 
              max-height: 70vh;
              height: auto; 
              display: block;
              margin: 12px auto;
              border: 1px solid #333;
              border-radius: 6px;
              page-break-inside: avoid; 
              break-inside: avoid;
            }
          </style>
        </head>
        <body>
          <!-- СТРАНИЦА 1: Шапка, Ставки и Сводка армии -->
          <h1>${roster.name || 'Боевой Ростер'}</h1>
          <p><strong>Клан армии:</strong> ${roster.clan || 'Не выбран'}</p>

          <h2>Выбранные Ставки:</h2>
          <ul>
            ${roster.selectedStakes.map(id => {
              const st = STAKES_LIST.find(s => s.id === id);
              return st ? `<li><strong>${st.name} [${st.cost} МИ]:</strong> ${st.desc}</li>` : '';
            }).join('')}
          </ul>

          <h2 style="margin-top: 24px;">Сводный состав армии (${roster.units.length} моделей):</h2>
          <ul>
            ${Object.keys(counts).map(name => `<li><strong>${name}</strong> — ${counts[name]} шт.</li>`).join('')}
          </ul>

          <!-- СТРАНИЦА 2: Правила клана -->
          ${cleanClanContent ? `
            <div class="page-break"></div>
            <h2>Правила и способности клана</h2>
            <div>${cleanClanContent}</div>
          ` : ''}

          <!-- СТРАНИЦА 3: Сценарий и карты -->
          ${selectedBattleplan ? `
            <div class="page-break"></div>
            <h2>Сценарий: ${selectedBattleplan.title}</h2>
            <div>${formattedBattleplanHTML}</div>
          ` : ''}

          <!-- СТРАНИЦА 4: Уникальные датакарты отрядов -->
          <div class="page-break"></div>
          <h2>Датакарты отрядов армии:</h2>
          <div style="display:flex; flex-direction:column; gap:16px; margin-top:12px;">
            ${uniqueCardsHTML.join('')}
          </div>

          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printHTML);
        printWindow.document.close();
      }
    });
  }

  renderStakesList();
}

function renderStakesList() {
  const container = document.getElementById('builder-stakes-list');
  if (!container) return;

  const usedMI = roster.selectedStakes.reduce((acc, id) => {
    const st = STAKES_LIST.find(s => s.id === id);
    return acc + (st ? st.cost : 0);
  }, 0);

  const remainingMI = 5 - usedMI;
  const badge = document.getElementById('builder-mi-budget');
  if (badge) badge.textContent = `Осталось бюджета: ${remainingMI} МИ`;

  container.innerHTML = STAKES_LIST.map(st => {
    const isChecked = roster.selectedStakes.includes(st.id);
    const isDisabled = !isChecked && st.cost > remainingMI;

    return `
      <label class="stake-checkbox-item ${isChecked ? 'active' : ''} ${isDisabled ? 'disabled' : ''}">
        <input type="checkbox" data-id="${st.id}" ${isChecked ? 'checked' : ''} ${isDisabled ? 'disabled' : ''}>
        <div>
          <div class="stake-title">${st.name} <span class="stake-cost">${st.cost} МИ</span></div>
          <div class="stake-desc">${st.desc}</div>
        </div>
      </label>
    `;
  }).join('');

  container.querySelectorAll('input[type="checkbox"]').forEach(chk => {
    chk.addEventListener('change', (e) => {
      const stakeId = e.target.dataset.id;
      if (e.target.checked) {
        if (roster.selectedStakes.length < 3) roster.selectedStakes.push(stakeId);
      } else {
        roster.selectedStakes = roster.selectedStakes.filter(id => id !== stakeId);
      }
      renderStakesList();
    });
  });
}

function updateAvailableUnits() {
  const container = document.getElementById('builder-units-available');
  if (!container) return;

  if (!roster.clan) {
    container.innerHTML = `<p style="color: var(--text-muted);">Выберите клан в первом пункте выше.</p>`;
    return;
  }

  const clanArticle = DATABASE.find(item => item.title === roster.clan);
  if (!clanArticle) {
    container.innerHTML = `<p style="color: var(--text-muted);">Отряды клана не найдены в базе.</p>`;
    return;
  }

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = clanArticle.content;
  const cards = tempDiv.querySelectorAll('.aos-card');

  if (cards.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted);">В этом клане нет датакарт отрядов.</p>`;
    return;
  }

  let unitsHTML = '<div style="display: grid; gap: 10px;">';
  cards.forEach((card, index) => {
    const title = card.querySelector('.aos-title')?.textContent || 'Отряд';
    const role = card.querySelector('.aos-badge-role')?.textContent || 'Базовый';
    const ap = card.querySelector('.aos-badge-ap')?.textContent || '2 ОД';

    unitsHTML += `
      <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02); border: 1px solid var(--border); padding: 10px 14px; border-radius: 8px;">
        <div>
          <strong style="color:#fff;">${title}</strong> 
          <span style="font-size: 0.8rem; color: var(--text-muted); margin-left: 8px;">[${role} • ${ap}]</span>
        </div>
        <button class="accordion-btn" onclick="window.addUnitToRoster('${index}')" style="background: var(--accent); color: #fff; padding: 6px 12px; border-radius: 6px; font-size: 0.85rem; width: auto;">+ В армию</button>
      </div>
    `;
  });
  unitsHTML += '</div>';

  container.innerHTML = unitsHTML;

  window.currentClanCards = Array.from(cards).map(c => ({
    title: c.querySelector('.aos-title')?.textContent || 'Отряд',
    html: c.outerHTML
  }));
}

window.addUnitToRoster = function(cardIndex) {
  const cardData = window.currentClanCards[cardIndex];
  if (cardData) {
    roster.units.push(cardData);
    renderRosterSummary();
  }
};

window.removeUnitFromRoster = function(index) {
  roster.units.splice(index, 1);
  renderRosterSummary();
};

function renderRosterSummary() {
  const container = document.getElementById('builder-roster-summary');
  const titleContainer = document.getElementById('builder-summary-title');
  if (!container || !titleContainer) return;

  titleContainer.textContent = `Состав армии (${roster.units.length} моделей)`;

  if (roster.units.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted);">Отряды ещё не добавлены в армию.</p>`;
    return;
  }

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
      ${roster.units.map((u, idx) => `
        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02); padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border);">
          <span><strong>${u.title}</strong></span>
          <button onclick="window.removeUnitFromRoster(${idx})" style="background:none; border:none; color: #ff4757; cursor:pointer; font-weight:bold; font-size:0.85rem;">Удалить</button>
        </div>
      `).join('')}
    </div>
  `;
}