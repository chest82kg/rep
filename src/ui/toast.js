// src/ui/toast.js
//
// Всплывающие уведомления в правом нижнем углу.
// Используются для обратной связи при действиях (добавил юнита,
// купил артефакт, выбрал клятву и т.д.).

const TOAST_DURATION = 2500;

function ensureContainer() {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
  container.style.cssText = `
  position: fixed;
  bottom: 100px;
  right: 90px;
  z-index: 99999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
`;
    document.body.appendChild(container);
  }
  return container;
}

/**
 * Показывает всплывающее уведомление.
 * @param {string} text
 * @param {'ok'|'err'|'info'} type
 */
export function showToast(text, type = 'info') {
  const container = ensureContainer();

 const colors = {
  ok:   { bg: '#0d2a1a',  border: '#2ed573', color: '#2ed573' },
  err:  { bg: '#2a0e12',  border: '#ff4757', color: '#ff4757' },
  info: { bg: '#181430',  border: '#6c5ce7', color: '#a29bfe' }
};

  const c = colors[type] || colors.info;

  const el = document.createElement('div');
  el.style.cssText = `
    background: ${c.bg};
    border: 1px solid ${c.border};
    color: ${c.color};
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 600;
    box-shadow: 0 8px 24px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05);
    opacity: 0;
    transform: translateX(20px);
    transition: opacity 0.25s ease, transform 0.25s ease;
    pointer-events: auto;
    max-width: 320px;
  `;
  el.textContent = text;
  container.appendChild(el);

  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translateX(0)';
  });

  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    setTimeout(() => el.remove(), 300);
  }, TOAST_DURATION);
}