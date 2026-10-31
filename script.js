import { DATABASE, GLOSSARY } from './archive/data.js';
import { renderBuilderUI } from './builder.js';

// --- РОУТИНГ ---
function router() {
  const hash = window.location.hash.replace('#', '') || DATABASE[0].id;
  const item = DATABASE.find(entry => entry.id === hash);
  const container = document.getElementById('app-content');

  if (!item) {
    container.innerHTML = '<h1>404</h1><p>Страница не найдена</p>';
    return;
  }

  if (item.type === 'builder') {
    renderBuilderUI(container);
  } else if (item.type === 'warcard') {
    container.innerHTML = renderWarCardTemplate(item);
    highlightTerms();
  } else {
    container.innerHTML = renderArticleTemplate(item);
    highlightTerms();
  }

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

// --- САЙДБАР (Чистый рендер меню) ---
function buildSidebar() {
  const sidebarMenu = document.getElementById('sidebar-menu');
  if (!sidebarMenu) return;
  sidebarMenu.innerHTML = '';

  const categories = {};

  DATABASE.forEach(item => {
    if (item.type === 'builder') return; // Билдер вынесен в статические кнопки HTML

    if (!categories[item.category]) {
      categories[item.category] = { title: item.categoryTitle, items: [], subCategories: {}, factions: {} };
    }

    const cat = categories[item.category];

    if (item.subCategory) {
      if (!cat.subCategories[item.subCategory]) cat.subCategories[item.subCategory] = [];
      cat.subCategories[item.subCategory].push(item);
    } else if (item.faction) {
      if (!cat.factions[item.faction]) cat.factions[item.faction] = [];
      cat.factions[item.faction].push(item);
    } else {
      cat.items.push(item);
    }
  });

  Object.keys(categories).forEach(catKey => {
    const cat = categories[catKey];
    const li = document.createElement('li');
    li.className = 'nav-item';

    let htmlContent = cat.items.map(it => `
      <li class="nav-item"><a href="#${it.id}" class="nav-link" data-id="${it.id}">${it.title}</a></li>
    `).join('');

    Object.keys(cat.subCategories).forEach(subKey => {
      htmlContent += `
        <li class="nav-item" style="margin-top: 4px;">
          <button class="accordion-btn sub-accordion" aria-expanded="false" style="font-size: 0.92rem; padding: 6px 4px; color: var(--text-muted);">
            <span>${subKey}</span><span class="accordion-icon">+</span>
          </button>
          <ul class="sub-nav-list" style="background: rgba(0,0,0,0.15);">
            ${cat.subCategories[subKey].map(it => `<li class="nav-item"><a href="#${it.id}" class="nav-link" data-id="${it.id}">${it.title}</a></li>`).join('')}
          </ul>
        </li>
      `;
    });

    Object.keys(cat.factions).forEach(facName => {
      htmlContent += `
        <li class="nav-item" style="margin-top: 4px;">
          <button class="accordion-btn sub-accordion" aria-expanded="false" style="font-size: 0.92rem; padding: 6px 4px; color: var(--text-muted);">
            <span>${facName}</span><span class="accordion-icon">+</span>
          </button>
          <ul class="sub-nav-list" style="background: rgba(0,0,0,0.15);">
            ${cat.factions[facName].map(it => `<li class="nav-item"><a href="#${it.id}" class="nav-link" data-id="${it.id}">${it.title}</a></li>`).join('')}
          </ul>
        </li>
      `;
    });

    li.innerHTML = `
      <button class="accordion-btn" aria-expanded="false">
        <span>${cat.title}</span><span class="accordion-icon">+</span>
      </button>
      <ul class="sub-nav-list" id="cat-${catKey}">${htmlContent}</ul>
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
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const submenu = btn.nextElementSibling;
      if (!submenu) return;
      const isOpen = submenu.classList.toggle('open');
      btn.setAttribute('aria-expanded', isOpen);
      const icon = btn.querySelector('.accordion-icon');
      if (icon) icon.textContent = isOpen ? '−' : '+';
    });
  });
}

// --- ПОИСК ---
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
        <div class="search-item" data-id="${m.id}">
          <span style="font-weight: 600; color: #fff;">${m.title}</span>
          <small style="color: var(--accent); background: rgba(108,92,231,0.1); padding: 2px 6px; border-radius: 4px;">${m.categoryTitle || m.faction || m.category}</small>
        </div>
      `).join('');

      dropdown.querySelectorAll('.search-item').forEach(el => {
        el.addEventListener('click', () => {
          const targetId = el.getAttribute('data-id');
          if (!targetId) return;
          window.location.hash = targetId;
          input.value = '';
          dropdown.classList.add('hidden');
        });
      });
    }

    dropdown.classList.remove('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-box')) {
      dropdown.classList.add('hidden');
    }
  });
}

/// --- ПОДСВЕТКА ГЛОССАРИЯ ---
function highlightTerms() {
  const content = document.getElementById('app-content');
  if (!content) return;

  const terms = Object.keys(GLOSSARY);
  if (terms.length === 0) return;

  // Регистронезависимая карта: ключ в нижнем регистре → значение
  const GLOSSARY_LC = {};
  terms.forEach(k => { GLOSSARY_LC[k.toLowerCase()] = GLOSSARY[k]; });

  const escapedTerms = terms
    .slice()
    .sort((a, b) => b.length - a.length)
    .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

  const buildRegex = () => new RegExp(
    `(?<![\\p{L}\\p{N}_])(${escapedTerms.join('|')})(?![\\p{L}\\p{N}_])`,
    'giu'
  );

  const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.parentNode) return NodeFilter.FILTER_REJECT;
      const p = node.parentNode;
      if (p.classList && p.classList.contains('tooltip-term')) return NodeFilter.FILTER_REJECT;
      if (p.tagName === 'SCRIPT' || p.tagName === 'STYLE') return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const nodesToReplace = [];
  let node;
  while ((node = walker.nextNode())) {
    const re = buildRegex();
    if (re.test(node.nodeValue)) {
      nodesToReplace.push(node);
    }
  }

  nodesToReplace.forEach(textNode => {
    const fragment = document.createDocumentFragment();
    const text = textNode.nodeValue;
    const re = buildRegex();
    let lastIdx = 0;
    let match;

    while ((match = re.exec(text)) !== null) {
      const matchIdx = match.index;
      const matchText = match[0];

      if (matchIdx > lastIdx) {
        fragment.appendChild(document.createTextNode(text.slice(lastIdx, matchIdx)));
      }

      // Ищем в глоссарии без учёта регистра
      const lookup = GLOSSARY[matchText] || GLOSSARY_LC[matchText.toLowerCase()] || '';

      const span = document.createElement('span');
      span.className = 'tooltip-term';
      span.setAttribute('data-tooltip', lookup);
      span.textContent = matchText;
      fragment.appendChild(span);

      lastIdx = matchIdx + matchText.length;

      if (matchText.length === 0) re.lastIndex++;
    }

    if (lastIdx < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIdx)));
    }
    textNode.parentNode.replaceChild(fragment, textNode);
  });
}

// --- ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ ---
buildSidebar();
initGlobalSearch();
router();
window.addEventListener('hashchange', router);