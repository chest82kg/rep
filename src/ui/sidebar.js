import { DATABASE } from '../core/data.js';

export function buildSidebar() {
  const sidebarMenu = document.getElementById('sidebar-menu');
  if (!sidebarMenu) return;
  sidebarMenu.innerHTML = '';

  const categories = {};

  DATABASE.forEach(item => {
    if (item.type === 'builder') return;

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

export function updateActiveSidebarLink(activeId) {
  const sidebar = document.getElementById('sidebar-menu');
  if (!sidebar) return;

  sidebar.querySelectorAll('.nav-link').forEach(link => {
    const isActive = link.dataset.id === activeId;

    link.classList.toggle('active', isActive);

    if (isActive) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }

    if (!isActive) return;

    // Раскрываем не только ближайшее подменю,
    // но и все внешние разделы до корня сайдбара.
    let parent = link.parentElement;

    while (parent && parent !== sidebar) {
      if (parent.classList.contains('sub-nav-list')) {
        parent.classList.add('open');

        const button = parent.previousElementSibling;

        if (button?.matches('button.accordion-btn')) {
          button.setAttribute('aria-expanded', 'true');

          const icon = button.querySelector('.accordion-icon');

          if (icon) {
            icon.textContent = '−';
          }
        }
      }

      parent = parent.parentElement;
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