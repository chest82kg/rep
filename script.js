// --- 1. РОУТИНГ И РЕНДЕДИНГ СТРАНИЦ ---
function router() {
  const hash = window.location.hash.replace('#', '') || DATABASE[0].id;
  const item = DATABASE.find(entry => entry.id === hash);
  const container = document.getElementById('app-content');

  if (!item) {
    container.innerHTML = '<h1>404</h1><p>Страница не найдена</p>';
    return;
  }

  // Рендерим шаблон в зависимости от типа
  if (item.type === 'warcard') {
    container.innerHTML = renderWarCardTemplate(item);
  } else {
    container.innerHTML = renderArticleTemplate(item);
  }

  // Запускаем подсветку терминов глоссария в новом контенте
  highlightTerms();
  updateActiveSidebarLink(hash);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Шаблон статьи
function renderArticleTemplate(item) {
  return `
    <h1>${item.title}</h1>
    <div class="article-body">${item.content}</div>
  `;
}

// Шаблон карточки бойца (AoS Style)
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

// --- 2. АВТОМАТИЧЕСКАЯ ГЕНЕРАЦИЯ МЕНЮ САКДБАРА ---
function buildSidebar() {
  const sidebarMenu = document.getElementById('sidebar-menu');
  sidebarMenu.innerHTML = '';

  // Группируем элементы из DATABASE по категориям
  const categories = {};
  DATABASE.forEach(item => {
    if (!categories[item.category]) {
      categories[item.category] = {
        title: item.categoryTitle,
        items: []
      };
    }
    categories[item.category].items.push(item);
  });

  // Строим HTML меню
  Object.keys(categories).forEach(catKey => {
    const cat = categories[catKey];
    const li = document.createElement('li');
    li.className = 'nav-item';

    li.innerHTML = `
      <button class="accordion-btn" aria-expanded="false">
        <span>${cat.title}</span>
        <span class="accordion-icon">+</span>
      </button>
      <ul class="sub-nav-list" id="cat-${catKey}">
        ${cat.items.map(it => `
          <li class="nav-item">
            <a href="#${it.id}" class="nav-link" data-id="${it.id}">${it.title}</a>
          </li>
        `).join('')}
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
          const icon = parentBtn.querySelector('.accordion-icon');
          if (icon) icon.textContent = '−';
        }
      }
    }
  });
}

function initAccordions() {
  document.querySelectorAll('.accordion-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const submenu = btn.nextElementSibling;
      const isOpen = submenu.classList.toggle('open');
      btn.setAttribute('aria-expanded', isOpen);
      btn.querySelector('.accordion-icon').textContent = isOpen ? '−' : '+';
    });
  });
}

// --- 3. ГЛОБАЛЬНЫЙ ПОИСК ПО ВСЕЙ БАЗЕ ---
function initGlobalSearch() {
  const input = document.getElementById('search-input');
  const dropdown = document.getElementById('search-results');

  input.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) {
      dropdown.classList.add('hidden');
      return;
    }

    const matches = DATABASE.filter(item => 
      item.title.toLowerCase().includes(q) || 
      (item.content && item.content.toLowerCase().includes(q)) ||
      (item.description && item.description.toLowerCase().includes(q))
    );

    if (matches.length === 0) {
      dropdown.innerHTML = '<div class="search-item">Ничего не найдено</div>';
    } else {
      dropdown.innerHTML = matches.map(m => `
        <div class="search-item" onclick="location.hash='${m.id}'; document.getElementById('search-input').value=''; document.getElementById('search-results').classList.add('hidden');">
          <span>${m.title}</span>
          <small style="color:var(--text-muted);">${m.categoryTitle}</small>
        </div>
      `).join('');
    }

    dropdown.classList.remove('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-box')) {
      dropdown.classList.add('hidden');
    }
  });
}

// --- 4. ПОДСВЕТКА ГЛОССАРИЯ ---
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

// ИНИЦИАЛИЗАЦИЯ
document.addEventListener('DOMContentLoaded', () => {
  buildSidebar();
  initGlobalSearch();
  router(); // Запускаем первичный рендеринг
  window.addEventListener('hashchange', router); // Отслеживаем смену URL
});