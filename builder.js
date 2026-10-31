import { DATABASE } from './archive/data.js';

let roster = {
  name: 'Мой Ростер',
  clan: '',
  battleplanId: '',
  selectedStakes: [],
  units: [] // { title, uniqueKey, html, cost, role }
};

const ARMY_BUDGET = 1000;
const ARMY_MIN = 500;
const STAKES_BUDGET = 5;

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
        <div class="builder-header-flex">
          <h3 id="builder-summary-title">Состав армии (0 моделей)</h3>
          <div class="builder-budget-badge" id="builder-pts-budget">0 / ${ARMY_BUDGET} очков</div>
        </div>

        <div id="builder-army-warnings" style="margin-bottom: 12px;"></div>

        <div id="builder-roster-summary">
          <p style="color: var(--text-muted);">Отряды ещё не добавлены.</p>
        </div>

        <div style="margin-top: 24px; display: flex; flex-wrap: wrap; gap: 16px;">
          <button id="btn-show-mission" class="builder-action-btn large">📋 1. Сводка миссии</button>
          <button id="btn-show-army" class="builder-action-btn large">⚔️ 2. Карточки армии</button>
          <button id="btn-export-pdf" class="builder-action-btn primary large">📄 3. Скачать в PDF / Печать</button>
          <button id="btn-go-to-battle" class="builder-action-btn large" style="background:#2ed573; border-color:#2ed573; color:#0b0b0f; font-weight:800;">🎮 В бой</button>
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

  // Кнопка 2: Карточки армии
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
        counts[u.uniqueKey] = (counts[u.uniqueKey] || 0) + 1;
      });

      const uniqueCardsMap = new Map();
      roster.units.forEach(u => {
        if (!uniqueCardsMap.has(u.uniqueKey)) uniqueCardsMap.set(u.uniqueKey, u.html);
      });
      const uniqueCardsHTML = Array.from(uniqueCardsMap.values());

      const totalPts = getTotalArmyCost();
      const commanderInfo = getCommanderInfo();

      body.innerHTML = `
        <h2 style="color:#d1b384; border-bottom:2px solid var(--border); padding-bottom:8px;">⚔️ Состав и Карточки Армии</h2>
        <p style="margin-top:8px;"><strong>Ростер:</strong> ${roster.name || 'Безымянный'}</p>
        <p><strong>Клан:</strong> ${roster.clan || 'Не выбран'}</p>
        <p><strong>Очки армии:</strong> ${totalPts} / ${ARMY_BUDGET}</p>
        <p><strong>Командир:</strong> ${commanderInfo ? commanderInfo.title : 'не назначен'}</p>

        ${cleanClanContent ? `
          <div style="margin-top:20px; background:rgba(0,0,0,0.3); padding:16px; border-radius:8px; border:1px solid var(--border);">
            <h3 style="color:var(--accent); margin-bottom:12px;">Правила и способности клана</h3>
            <div>${cleanClanContent}</div>
          </div>
        ` : ''}

        <h3 style="margin-top:24px; color:var(--accent);">Сводный состав армии (${roster.units.length} моделей):</h3>
        ${roster.units.length === 0 ? '<p style="color:var(--text-muted);">Юниты не добавлены.</p>' : `
          <ul style="padding-left:20px; margin-top:8px; margin-bottom:20px;">
            ${Object.keys(counts).map(key => `<li><strong>${key}</strong> — ${counts[key]} шт.</li>`).join('')}
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
      roster.units.forEach(u => { counts[u.uniqueKey] = (counts[u.uniqueKey] || 0) + 1; });

      const uniqueCardsMap = new Map();
      roster.units.forEach(u => { if (!uniqueCardsMap.has(u.uniqueKey)) uniqueCardsMap.set(u.uniqueKey, u.html); });
      const uniqueCardsHTML = Array.from(uniqueCardsMap.values());

      const cardPairs = [];
      for (let i = 0; i < uniqueCardsHTML.length; i += 2) {
        cardPairs.push(uniqueCardsHTML.slice(i, i + 2));
      }

      const cardsPagesHTML = cardPairs.map((pair, pageIdx) => `
        <div class="cards-page">
          <h2>Датакарты отрядов армии (стр. ${pageIdx + 1}):</h2>
          <div class="cards-grid-page">
            ${pair.join('')}
          </div>
        </div>
      `).join('');

      const totalPts = getTotalArmyCost();
      const commanderInfo = getCommanderInfo();

      const printHTML = `
        <!DOCTYPE html>
        <html lang="ru">
        <head>
          <meta charset="UTF-8">
          <title>${roster.name || 'Боевой Ростер'}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #000; background: #fff; padding: 24px; line-height: 1.5; }
            h1 { font-size: 26px; text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 20px; }
            h2 { font-size: 18px; margin-top: 10px; border-bottom: 1px solid #000; padding-bottom: 6px; page-break-after: avoid; }
            ul { padding-left: 20px; } li { margin-bottom: 6px; }
            .page-break { page-break-before: always; break-before: page; padding-top: 10px; }
            .map-page-break { page-break-before: always; break-before: page; }
            .cards-page { page-break-before: always; break-before: page; box-sizing: border-box; }
            .cards-grid-page { display: flex; flex-direction: column; gap: 16px; margin-top: 12px; }
            .aos-card { border: 2px solid #000 !important; border-radius: 8px !important; padding: 12px 16px !important; margin: 8px 0 !important; page-break-inside: avoid !important; background: #ffffff !important; }
            .aos-header { display: flex !important; justify-content: space-between !important; font-weight: bold !important; font-size: 15px !important; border-bottom: 1px solid #000 !important; padding-bottom: 6px !important; margin-bottom: 6px !important; }
            .aos-stats-grid { display: table !important; width: 100% !important; table-layout: fixed !important; background: #000 !important; margin: 8px 0 !important; border-collapse: collapse !important; }
            .aos-stat-box { display: table-cell !important; width: 33.333% !important; background: #fff !important; border: 1px solid #000 !important; padding: 6px 4px !important; text-align: center !important; }
            .aos-stat-label { font-size: 10px !important; font-weight: bold !important; text-transform: uppercase !important; color: #000 !important; display: block !important; margin-bottom: 2px !important; }
            .aos-stat-value { font-size: 14px !important; font-weight: bold !important; color: #000 !important; display: block !important; }
            .aos-weapons-section { border-bottom: 1px solid #000 !important; padding-bottom: 6px !important; margin-bottom: 6px !important; }
            .aos-weapon-item { border: 1px solid #999 !important; padding: 6px 10px !important; margin-bottom: 4px !important; border-radius: 4px !important; background: #fff !important; }
            .aos-weapon-header { display: flex !important; justify-content: space-between !important; font-weight: bold !important; margin-bottom: 2px !important; }
            .aos-weapon-stats { display: flex !important; gap: 20px !important; font-size: 12px !important; }
            .aos-ability { margin-top: 6px !important; font-size: 12px !important; }
            img { max-width: 85%; max-height: 70vh; height: auto; display: block; margin: 12px auto; border: 1px solid #333; border-radius: 6px; page-break-inside: avoid; }
          </style>
        </head>
        <body>
          <h1>${roster.name || 'Боевой Ростер'}</h1>
          <p><strong>Клан армии:</strong> ${roster.clan || 'Не выбран'}</p>
          <p><strong>Очки армии:</strong> ${totalPts} / ${ARMY_BUDGET} ${totalPts < ARMY_MIN ? '(ниже минимума ' + ARMY_MIN + ')' : ''}</p>
          <p><strong>Командир:</strong> ${commanderInfo ? commanderInfo.title : 'не назначен'}</p>

          <h2>Выбранные Ставки:</h2>
          <ul>
            ${roster.selectedStakes.map(id => {
              const st = STAKES_LIST.find(s => s.id === id);
              return st ? `<li><strong>${st.name} [${st.cost} МИ]:</strong> ${st.desc}</li>` : '';
            }).join('')}
          </ul>

          <h2 style="margin-top: 24px;">Сводный состав армии (${roster.units.length} моделей):</h2>
          <ul>
            ${Object.keys(counts).map(key => `<li><strong>${key}</strong> — ${counts[key]} шт.</li>`).join('')}
          </ul>

          ${cleanClanContent ? `<div class="page-break"></div><h2>Правила и способности клана</h2><div>${cleanClanContent}</div>` : ''}
          ${selectedBattleplan ? `<div class="page-break"></div><h2>Сценарий: ${selectedBattleplan.title}</h2><div>${formattedBattleplanHTML}</div>` : ''}
          ${cardsPagesHTML}

          <script>window.onload = function() { window.print(); window.close(); };</script>
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

  // Кнопка 4: В бой (сохранить ростер и открыть play.html)
  const btnGoBattle = document.getElementById('btn-go-to-battle');
  if (btnGoBattle) {
    btnGoBattle.addEventListener('click', () => {
      if (roster.units.length === 0) {
        alert('Нельзя отправить в бой пустую армию — добавьте хотя бы один отряд.');
        return;
      }
      if (!roster.clan) {
        alert('Сначала выберите клан.');
        return;
      }

      const activeRoster = {
        name: roster.name || 'Армия',
        clan: roster.clan,
        battleplanId: roster.battleplanId || '',
        selectedStakes: Array.isArray(roster.selectedStakes) ? [...roster.selectedStakes] : [],
        units: roster.units.map(u => ({
          title: u.title,
          uniqueKey: u.uniqueKey,
          role: u.role || '',
          cost: u.cost || 0,
          html: u.html
        }))
      };

      try {
        localStorage.setItem('activeRoster', JSON.stringify(activeRoster));
      } catch (err) {
        console.error('Не удалось сохранить активный ростер:', err);
        alert('Ошибка сохранения ростера в localStorage. Проверьте, что браузер не блокирует хранилище.');
        return;
      }

      window.open('play.html', '_blank');
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

  const remainingMI = STAKES_BUDGET - usedMI;
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
    const pts = card.querySelector('.aos-badge-pts')?.textContent || '';

    const weaponItems = card.querySelectorAll('.aos-weapon-item');

    if (weaponItems.length > 1) {
      unitsHTML += `
        <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border); padding: 12px 14px; border-radius: 8px; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="color:#fff;">${title}</strong> 
            <span style="font-size: 0.8rem; color: var(--accent);">[${role} • ${pts}]</span>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <select id="weapon-select-${index}" class="search-input" style="padding: 6px 10px; font-size: 0.85rem;">
              <option value="1">${weaponItems[0].querySelector('.aos-weapon-name').textContent}</option>
              <option value="2">${weaponItems[1].querySelector('.aos-weapon-name').textContent}</option>
            </select>
            <button class="accordion-btn" onclick="window.addChoiceUnitToRoster(${index})" style="background: var(--accent); color: #fff; padding: 6px 12px; border-radius: 6px; font-size: 0.85rem; width: auto; white-space: nowrap;">+ В армию</button>
          </div>
        </div>
      `;
    } else {
      unitsHTML += `
        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02); border: 1px solid var(--border); padding: 10px 14px; border-radius: 8px;">
          <div>
            <strong style="color:#fff;">${title}</strong> 
            <span style="font-size: 0.8rem; color: var(--text-muted); margin-left: 8px;">[${role} • ${pts}]</span>
          </div>
          <button class="accordion-btn" onclick="window.addUnitToRoster('${index}')" style="background: var(--accent); color: #fff; padding: 6px 12px; border-radius: 6px; font-size: 0.85rem; width: auto;">+ В армию</button>
        </div>
      `;
    }
  });
  unitsHTML += '</div>';

  container.innerHTML = unitsHTML;

  window.currentClanCards = Array.from(cards).map(c => ({
    title: c.querySelector('.aos-title')?.textContent || 'Отряд',
    role: c.querySelector('.aos-badge-role')?.textContent || 'Базовый',
    cost: parseCost(c.querySelector('.aos-badge-pts')?.textContent || ''),
    html: c.outerHTML
  }));
}

// Утилита: вытащить очки из строки «115 очков» / «1.5 МИ»
function parseCost(raw) {
  if (!raw) return 0;
  const m = String(raw).match(/(\d+(?:[.,]\d+)?)/);
  if (!m) return 0;
  return Math.round(parseFloat(m[1].replace(',', '.')));
}

window.addChoiceUnitToRoster = function(cardIndex) {
  const cardData = window.currentClanCards[cardIndex];
  const selectElem = document.getElementById(`weapon-select-${cardIndex}`);
  if (!cardData || !selectElem) return;

  const chosenOption = selectElem.value;
  const tempContainer = document.createElement('div');
  tempContainer.innerHTML = cardData.html;

  const weapons = tempContainer.querySelectorAll('.aos-weapon-item');
  if (weapons.length >= 2) {
    if (chosenOption === "1") {
      weapons[1].remove();
    } else {
      weapons[0].remove();
    }
    const divider = tempContainer.querySelector('div[style*="--accent"]');
    if (divider) divider.remove();
  }

  const sectionTitle = tempContainer.querySelector('.aos-section-title');
  if (sectionTitle) {
    sectionTitle.textContent = 'Вооружение';
  }

  const weaponName = tempContainer.querySelector('.aos-weapon-name')?.textContent || '';
  const uniqueKey = `${cardData.title} (${weaponName})`;

  roster.units.push({
    title: cardData.title,
    uniqueKey: uniqueKey,
    html: tempContainer.innerHTML,
    role: cardData.role,
    cost: cardData.cost
  });
  renderRosterSummary();
};

window.addUnitToRoster = function(cardIndex) {
  const cardData = window.currentClanCards[cardIndex];
  if (cardData) {
    roster.units.push({
      title: cardData.title,
      uniqueKey: cardData.title,
      html: cardData.html,
      role: cardData.role,
      cost: cardData.cost
    });
    renderRosterSummary();
  }
};

window.removeUnitFromRoster = function(index) {
  roster.units.splice(index, 1);
  renderRosterSummary();
};

function getTotalArmyCost() {
  return roster.units.reduce((sum, u) => sum + (u.cost || 0), 0);
}

function getCommanderInfo() {
  const hero = roster.units.find(u => (u.role || '').toLowerCase().includes('герой'));
  if (hero) return hero;
  const elite = roster.units.find(u => (u.role || '').toLowerCase().includes('элит'));
  return elite || null;
}

function getArmyWarnings() {
  const warnings = [];
  const total = getTotalArmyCost();

  if (roster.units.length === 0) {
    warnings.push({ level: 'info', text: 'Армия пуста — добавьте отряды.' });
  }
  if (total > ARMY_BUDGET) {
    warnings.push({ level: 'error', text: `Перебор очков: ${total} / ${ARMY_BUDGET}. Уберите отряды.` });
  } else if (total < ARMY_MIN && roster.units.length > 0) {
    warnings.push({ level: 'warn', text: `Армия меньше минимума: ${total} / ${ARMY_MIN}.` });
  } else if (roster.units.length > 0) {
    warnings.push({ level: 'ok', text: `Бюджет в норме: ${total} / ${ARMY_BUDGET}.` });
  }

  if (roster.units.length > 0 && !getCommanderInfo()) {
    warnings.push({ level: 'warn', text: 'В армии нет Командира (нужен Герой или элитный отряд).' });
  }

  const usedMI = roster.selectedStakes.reduce((acc, id) => {
    const st = STAKES_LIST.find(s => s.id === id);
    return acc + (st ? st.cost : 0);
  }, 0);
  if (roster.selectedStakes.length === 0) {
    warnings.push({ level: 'info', text: 'Ставки не выбраны. Можно взять до 3 ставок на 5 МИ.' });
  } else if (usedMI < STAKES_BUDGET) {
    warnings.push({ level: 'info', text: `Неиспользовано ${STAKES_BUDGET - usedMI} МИ на ставки.` });
  }

  return warnings;
}

function renderArmyWarnings() {
  const container = document.getElementById('builder-army-warnings');
  if (!container) return;
  const warnings = getArmyWarnings();
  const colors = {
    ok: { bg: 'rgba(46,213,115,0.12)', border: '#2ed573', text: '#2ed573' },
    warn: { bg: 'rgba(255,165,2,0.12)', border: '#ffa502', text: '#ffa502' },
    error: { bg: 'rgba(255,71,87,0.12)', border: '#ff4757', text: '#ff4757' },
    info: { bg: 'rgba(108,92,231,0.12)', border: '#6c5ce7', text: '#a29bfe' }
  };
  container.innerHTML = warnings.map(w => {
    const c = colors[w.level] || colors.info;
    return `<div style="background:${c.bg}; border:1px solid ${c.border}; color:${c.text}; padding:6px 10px; border-radius:6px; margin-bottom:6px; font-size:0.9rem;">${w.text}</div>`;
  }).join('');
}

function renderRosterSummary() {
  const container = document.getElementById('builder-roster-summary');
  const titleContainer = document.getElementById('builder-summary-title');
  const ptsBadge = document.getElementById('builder-pts-budget');
  if (!container || !titleContainer) return;

  titleContainer.textContent = `Состав армии (${roster.units.length} моделей)`;

  const totalPts = getTotalArmyCost();
  if (ptsBadge) {
    ptsBadge.textContent = `${totalPts} / ${ARMY_BUDGET} очков`;
    ptsBadge.style.background = totalPts > ARMY_BUDGET
      ? '#ff4757'
      : (totalPts < ARMY_MIN && roster.units.length > 0 ? '#ffa502' : 'var(--accent)');
  }

  renderArmyWarnings();

  if (roster.units.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted);">Отряды ещё не добавлены в армию.</p>`;
    return;
  }

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
      ${roster.units.map((u, idx) => `
        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02); padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border);">
          <span>
            <strong>${u.uniqueKey || u.title}</strong>
            <span style="font-size:0.8rem; color:var(--text-muted); margin-left:8px;">[${u.role || '—'} • ${u.cost || 0} очков]</span>
          </span>
          <button onclick="window.removeUnitFromRoster(${idx})" style="background:none; border:none; color: #ff4757; cursor:pointer; font-weight:bold; font-size:0.85rem;">Удалить</button>
        </div>
      `).join('')}
    </div>
  `;
}