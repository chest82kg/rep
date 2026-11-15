// src/virtual-table/model-visuals.js
//
// Общие условные силуэты классов.
// Только представление: без игровых эффектов и сохранений.
// В SVG вставляется только собственная статическая разметка.

const NS = 'http://www.w3.org/2000/svg';

const ROLE_NAMES = {
  basic: 'Базовый',
  elite: 'Элитный',
  hero: 'Герой',
  unknown: 'Класс не определён'
};

function roleFromValue(value) {
  const text = String(value ?? '')
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('ru-RU');

  if (/^(basic|role-basic|базовый|базовые)(?:$|[\s(])/.test(text)) {
    return 'basic';
  }

  if (/^(elite|role-elite|элита|элитный|элитные)(?:$|[\s(])/.test(text)) {
    return 'elite';
  }

  if (/^(hero|role-hero|герой|герои)(?:$|[\s(])/.test(text)) {
    return 'hero';
  }

  return null;
}

// HTML исходной карточки разбирается инертно.
// Он никогда не вставляется в отображаемый документ.
const htmlRoleCache = new Map();

function roleFromHTML(html) {
  if (typeof html !== 'string' || !html) return null;

  if (htmlRoleCache.has(html)) {
    return htmlRoleCache.get(html);
  }

  const template = document.createElement('template');
  template.innerHTML = html;

  const roles = new Set();

  template.content.querySelectorAll('.aos-badge-role')
    .forEach(badge => {
      for (const role of ['basic', 'elite', 'hero']) {
        if (badge.classList.contains(`role-${role}`)) {
          roles.add(role);
        }
      }
    });

  const result = roles.size === 1
    ? [...roles][0]
    : null;

  // Ограничиваем вспомогательный кеш.
  if (htmlRoleCache.size >= 400) {
    htmlRoleCache.clear();
  }

  htmlRoleCache.set(html, result);
  return result;
}

export function getModelVisualRole(unit, sourceUnit = null) {
  return roleFromValue(unit?.role) ||
    roleFromValue(sourceUnit?.role) ||
    roleFromHTML(unit?.html) ||
    roleFromHTML(sourceUnit?.html) ||
    'unknown';
}

export function modelVisualRoleName(role) {
  return ROLE_NAMES[role] || ROLE_NAMES.unknown;
}

function figureMarkup(role) {
  if (role === 'unknown') {
    return `
      <path d="M 0 -31 L 11 -20 L 0 -7 L -11 -20 Z"
        fill="var(--mv-cloth)"
        stroke="var(--mv-outline)" stroke-width="2"/>
      <path d="M 0 -26 L 0 -16"
        stroke="var(--mv-metal)" stroke-width="3"/>
      <path d="M 0 -12 L 0 -10"
        stroke="var(--mv-metal)" stroke-width="3"/>
    `;
  }

  const cloak = role === 'hero'
    ? `
      <path d="M -9 -29 L 9 -29 L 18 -3
        L 7 -7 L 0 -3 L -9 -7 L -17 -3 Z"
        fill="var(--mv-cloak)"
        stroke="var(--mv-outline)" stroke-width="2"/>
    `
    : '';

  const shoulders = role === 'elite' || role === 'hero'
    ? `
      <path d="M -7 -28 L -16 -26 L -18 -18
        L -9 -16 L -5 -23 Z"
        fill="var(--mv-metal)"
        stroke="var(--mv-outline)" stroke-width="2"/>
      <path d="M 7 -28 L 16 -26 L 18 -18
        L 9 -16 L 5 -23 Z"
        fill="var(--mv-metal)"
        stroke="var(--mv-outline)" stroke-width="2"/>
    `
    : `
      <path d="M -7 -26 L -12 -23 L -13 -13 L -7 -12 Z"
        fill="var(--mv-cloth)"
        stroke="var(--mv-outline)" stroke-width="2"/>
      <path d="M 7 -26 L 12 -23 L 13 -13 L 7 -12 Z"
        fill="var(--mv-cloth)"
        stroke="var(--mv-outline)" stroke-width="2"/>
    `;

  const crest = role === 'hero'
    ? `
      <path d="M -4 -37 L -5 -45 L 0 -42
        L 5 -45 L 4 -37 Z"
        fill="var(--mv-trim)"
        stroke="var(--mv-outline)" stroke-width="1.5"/>
    `
    : '';

  const chest = role === 'basic'
    ? ''
    : `
      <path d="M -5 -24 L 5 -24 L 6 -15
        L 0 -12 L -6 -15 Z"
        fill="var(--mv-metal)"
        stroke="var(--mv-outline)" stroke-width="1.5"/>
    `;

  return `
    ${cloak}

    <path d="M -7 -12 L -1 -12 L -2 -3 L -9 -3 Z"
      fill="var(--mv-outline)"/>
    <path d="M 1 -12 L 7 -12 L 9 -3 L 2 -3 Z"
      fill="var(--mv-outline)"/>

    ${shoulders}

    <path d="M -7 -27 L 7 -27 L 10 -10
      L 0 -7 L -10 -10 Z"
      fill="var(--mv-cloth)"
      stroke="var(--mv-outline)" stroke-width="2"/>

    ${chest}

    <path d="M -8 -12 L 8 -12"
      stroke="var(--mv-trim)" stroke-width="3"/>

    <path d="M -6 -36 L 0 -39 L 6 -36
      L 7 -29 L 0 -26 L -7 -29 Z"
      fill="var(--mv-metal)"
      stroke="var(--mv-outline)" stroke-width="2"/>

    <path d="M -4 -31 L 4 -31"
      stroke="var(--mv-outline)" stroke-width="2"/>

    ${crest}
  `;
}

function palette(side) {
  return side === 'b'
    ? {
        cloth: '#b67e68',
        cloak: '#704a43',
        metal: '#c0b49a',
        trim: '#d2ae68'
      }
    : {
        cloth: '#77a7a0',
        cloak: '#365a58',
        metal: '#b7bdae',
        trim: '#d2ae68'
      };
}

export function createModelFigure(role, side) {
  const actualRole = Object.hasOwn(ROLE_NAMES, role)
    ? role
    : 'unknown';

  const group = document.createElementNS(NS, 'g');
  const colors = palette(side);

  group.setAttribute('pointer-events', 'none');
  group.setAttribute('aria-hidden', 'true');

  group.style.setProperty('--mv-cloth', colors.cloth);
  group.style.setProperty('--mv-cloak', colors.cloak);
  group.style.setProperty('--mv-metal', colors.metal);
  group.style.setProperty('--mv-trim', colors.trim);
  group.style.setProperty('--mv-outline', '#202a2b');

  group.innerHTML = figureMarkup(actualRole);
  return group;
}

// Компактный вариант для сетки.
// Возвращаемая строка содержит только собственную SVG-разметку.
export function modelVisualIconHTML(role) {
  const actualRole = Object.hasOwn(ROLE_NAMES, role)
    ? role
    : 'unknown';

  return `
    <svg class="vt-model-class-icon"
      viewBox="-22 -48 44 48"
      width="17" height="19"
      aria-hidden="true"
      focusable="false">
      ${figureMarkup(actualRole)}
    </svg>
  `;
}

export function installModelVisualStyles() {
  if (document.getElementById('vt-model-visual-styles')) return;

  const style = document.createElement('style');
  style.id = 'vt-model-visual-styles';

  style.textContent = `
    .vt-token {
      --mv-cloth: #77a7a0;
      --mv-cloak: #365a58;
      --mv-metal: #b7bdae;
      --mv-trim: #d2ae68;
      --mv-outline: #202a2b;
    }

    .vt-token[data-side="b"] {
      --mv-cloth: #b67e68;
      --mv-cloak: #704a43;
      --mv-metal: #c0b49a;
    }

    .vt-model-class-icon {
      display: inline-block;
      flex: 0 0 auto;
      width: 17px;
      height: 19px;
      margin-right: 3px;
      overflow: visible;
      vertical-align: middle;
      pointer-events: none;
    }
  `;

  document.head.append(style);
}