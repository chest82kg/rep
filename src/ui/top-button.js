// src/ui/top-button.js
//
// Плавающая кнопка «↑ Наверх». Появляется после скролла 400px.

export function initTopButton() {
  let btn = document.getElementById('scroll-top-btn');

  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'scroll-top-btn';
    btn.className = 'scroll-top-btn';
    btn.title = 'Наверх';
    btn.setAttribute('aria-label', 'Наверх');
    btn.innerHTML = '↑';
    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    document.body.appendChild(btn);
  }

  const toggleVisibility = () => {
    const shouldShow = window.scrollY > 400;
    btn.classList.toggle('visible', shouldShow);
  };

  window.addEventListener('scroll', toggleVisibility, { passive: true });
  toggleVisibility();
}