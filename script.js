import { DATABASE, GLOSSARY } from './data.js';

console.log("УСПЕШНЫЙ ИМПОРТ БАЗЫ ДАННЫХ:", DATABASE); // <--- Добавьте эту строчку

// Рендеринг контента
function router() {
  const hash = window.location.hash.replace('#', '') || DATABASE[0].id;
  const item = DATABASE.find(entry => entry.id === hash);
  const container = document.getElementById('app-content');

  if (!item) {
    container.innerHTML = '<h1>404</h1><p>Страница не найдена</p>';
    return;
  }

  if (item.type === 'warcard') {
    container.innerHTML = renderWarCardTemplate(item);
  } else {
    container.innerHTML = renderArticleTemplate(item);
  }

  highlightTerms();
  updateActiveSidebarLink(hash);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderArticleTemplate(item) {
  return `<h1>${item.title}</h1><div class="article-body">${item.content}</div>`;
}

function renderWarCardTemplate(item) {
  const abilitiesHTML = item.abilities.map(ab => `
    <div class="ability-item">
      <div class="ability-name">${ab.name}</div>
      <div class="ability-desc">${ab.desc}</div>
    </div>
  `).join('');

  return `
    <h1>${item.title}</h1>
    <p>${item.description}</p>
    <div class="war-card">
      <div class="card-header">
        <span class="card-title">${item.title}</span>
        <span class="card-role">${item.role}</span>
      </div>
      <div class="card-stats">
        <div class="stat-box"><span class="stat-label">Движ</span><span class="stat-value">${item.stats.move}</span></div>
        <div class="stat-box"><span class="stat-label">Здоровье</span><span class="stat-value">${item.stats.wounds}</span></div>
        <div class="stat-box"><span class="stat-label">Атака</span><span class="stat-value">${item.stats.hit}</span></div>
        <div class="stat-box"><span class="stat-label">Броня</span><span class="stat-value">${item.stats.armor}</span></div>
      </div>
      <div class="card-abilities">${abilitiesHTML}</div>
    </div>
  `;
}

function buildSidebar() {
  const sidebarMenu = document.getElementById('sidebar-menu');
  if (!sidebarMenu) return;
  sidebarMenu.innerHTML = '';

  const categories = {};
  DATABASE.forEach(item => {
    if (!categories[item.category]) {
      categories[item.category] = { 
        title: item.categoryTitle, 
        items: [], 
        factions: {} // Для вложенных расовых групп во Фракциях
      };
    }

    const cat = categories[item.category];

    if (item.faction) {
      if (!cat.factions[item.faction]) {
        cat.factions[item.faction] = [];
      }
      cat.factions[item.faction].push(item);
    } else {
      cat.items.push(item);
    }
  });

  Object.keys(categories).forEach(catKey => {
    const cat = categories[catKey];
    const li = document.createElement('li');
    li.className = 'nav-item';

    // Рендерим обычные элементы (если есть)
    let htmlContent = cat.items.map(it => `
      <li class="nav-item">
        <a href="#${it.id}" class="nav-link" data-id="${it.id}">${it.title}</a>
      </li>
    `).join('');

    // Рендерим вложенные группы (Фракции -> Гномы / Гоблины)
    const factionKeys = Object.keys(cat.factions);
    if (factionKeys.length > 0) {
      factionKeys.forEach(facName => {
        const facItems = cat.factions[facName];
        htmlContent += `
          <li class="nav-item" style="margin-top: 4px;">
            <button class="accordion-btn sub-accordion" aria-expanded="false" style="font-size: 0.92rem; padding: 6px 4px; color: var(--text-muted);">
              <span>${facName}</span>
              <span class="accordion-icon">+</span>
            </button>
            <ul class="sub-nav-list" style="background: rgba(0,0,0,0.15);">
              ${facItems.map(it => `
                <li class="nav-item">
                  <a href="#${it.id}" class="nav-link" data-id="${it.id}">${it.title}</a>
                </li>
              `).join('')}
            </ul>
          </li>
        `;
      });
    }

    li.innerHTML = `
      <button class="accordion-btn" aria-expanded="false">
        <span>${cat.title}</span>
        <span class="accordion-icon">+</span>
      </button>
      <ul class="sub-nav-list" id="cat-${catKey}">
        ${htmlContent}
      </ul>
    `;
    sidebarMenu.appendChild(li);
  });

  initAccordions();
}

function updateActiveSidebarLink(activeId) {
  document.querySelectorAll('.nav-link').forEach(link => {
    const isActive = link.dataset.id === activeId;
    link.classList.toggle('active', isActive);

    if (isActive) {
      const parentSubmenu = link.closest('.sub-nav-list');
      if (parentSubmenu) {
        parentSubmenu.classList.add('open');
        const parentBtn = parentSubmenu.previousElementSibling;
        if (parentBtn) {
          parentBtn.setAttribute('aria-expanded', 'true');
          parentBtn.querySelector('.accordion-icon').textContent = '−';
        }
      }
    }
  });
}

function initAccordions() {
  document.querySelectorAll('.accordion-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const submenu = btn.nextElementSibling;
      if (!submenu) return;
      const isOpen = submenu.classList.toggle('open');
      btn.setAttribute('aria-expanded', isOpen);
      btn.querySelector('.accordion-icon').textContent = isOpen ? '−' : '+';
    });
  });
}

// --- ГЛОБАЛЬНЫЙ ПОИСК ПО ВСЕЙ БАЗЕ ---
// --- ГЛОБАЛЬНЫЙ ПОИСК ПО ВСЕЙ БАЗЕ ---
// --- ГЛОБАЛЬНЫЙ ПОИСК ПО ВСЕЙ БАЗЕ ---
function initGlobalSearch() {
  const input = document.getElementById('search-input');
  const dropdown = document.getElementById('search-results');

  if (!input || !dropdown) return;

  input.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();

    if (!q) {
      dropdown.classList.add('hidden');
      dropdown.innerHTML = '';
      return;
    }

    if (!DATABASE || DATABASE.length === 0) return;

    const matches = DATABASE.filter(item => 
      (item.title && item.title.toLowerCase().includes(q)) || 
      (item.content && item.content.toLowerCase().includes(q)) ||
      (item.description && item.description.toLowerCase().includes(q)) ||
      (item.faction && item.faction.toLowerCase().includes(q))
    );

    if (matches.length === 0) {
      dropdown.innerHTML = '<div class="search-item" style="padding: 10px 16px; color: var(--text-muted);">Ничего не найдено</div>';
    } else {
      dropdown.innerHTML = matches.map(m => `
        <div class="search-item" data-id="${m.id}" style="padding: 10px 16px; cursor: pointer; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: var(--bg-panel);">
          <span style="font-weight: 600; color: #fff;">${m.title}</span>
          <small style="color: var(--accent); background: rgba(108,92,231,0.1); padding: 2px 6px; border-radius: 4px;">${m.categoryTitle || m.faction || m.category}</small>
        </div>
      `).join('');

      dropdown.querySelectorAll('.search-item').forEach(el => {
        el.addEventListener('click', () => {
          const targetId = el.getAttribute('data-id');
          window.location.hash = targetId;
          input.value = '';
          dropdown.classList.add('hidden');
        });
      });
    }

    dropdown.classList.remove('hidden');
  });

  // Закрытие выпадающего списка при клике мимо поиска
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-box')) {
      dropdown.classList.add('hidden');
    }
  });
}

  // 

function highlightTerms() {
  const content = document.getElementById('app-content');
  if (!content) return;

  const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (node.parentNode.classList && node.parentNode.classList.contains('tooltip-term')) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const termsRegex = new RegExp(`\\b(${Object.keys(GLOSSARY).join('|')})\\b`, 'gi');
  let node;
  const nodesToReplace = [];

  while (node = walker.nextNode()) {
    if (termsRegex.test(node.nodeValue)) {
      nodesToReplace.push(node);
    }
  }

  nodesToReplace.forEach(textNode => {
    const fragment = document.createDocumentFragment();
    const text = textNode.nodeValue;
    let lastIdx = 0;

    text.replace(termsRegex, (match, p1, idx) => {
      if (idx > lastIdx) {
        fragment.appendChild(document.createTextNode(text.slice(lastIdx, idx)));
      }
      const span = document.createElement('span');
      span.className = 'tooltip-term';
      span.setAttribute('data-tooltip', GLOSSARY[match] || GLOSSARY[match.toLowerCase()] || '');
      span.textContent = match;
      fragment.appendChild(span);
      lastIdx = idx + match.length;
    });

    if (lastIdx < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIdx)));
    }
    textNode.parentNode.replaceChild(fragment, textNode);
  });
}

// Запуск модуля
buildSidebar();
initGlobalSearch();
router();
window.addEventListener('hashchange', router);