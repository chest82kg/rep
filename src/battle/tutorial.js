// src/battle/tutorial.js
//
// Интерактивный туториал для play.html.
// Запускается кнопкой «❓ Как играть» в шапке.

import { escapeHtml } from '../utils/escape.js';

const STEPS = [
  {
    selector: '#dash-units-container .battle-unit-wrapper',
    title: 'Это ваш отряд',
    text: 'Нажмите −1, чтобы снять 1 ХП, или −5 для массового урона. Полоска ХП обновляется автоматически. Клик по самой карточке открывает справку со статами и оружием.'
  },
  {
    selector: '#battle-tracker',
    title: 'Трекер раунда и ОП',
    text: 'Здесь вы отмечаете раунд и победные очки. Кнопки + и − меняют значения вручную. В комнате раунд меняет только хост.'
  },
  {
    selector: '.status-add-bar',
    title: 'Статусы юнита',
    text: 'Яд, Горение, Окаменение и «Другое». Каждый статус можно усилить или убрать кнопками рядом. Статусы «Яд» и «Горение» тикают в конце раунда.'
  },
  {
    selector: '.unit-bottom-bar',
    title: 'Активация и заметки',
    text: 'Кнопка «Активирован» отмечает, что модель уже ходила в этом раунде. «Заметка» добавляет запись в лог боя. Всё сбрасывается в конце раунда.'
  },
  {
    selector: '#btn-phase-helper',
    title: 'Фаза раунда',
    text: 'Открывает чек-лист всех трёх фаз: планирование, активация, конец раунда. Кнопка «Закончить раунд» применяет тикающие статусы и сдвигает счётчик.'
  },
  {
    selector: '#btn-battle-log',
    title: 'Лог боя',
    text: 'Все заметки за игру: урон, статусы, смерти. Лог прикрепится к записи партии и попадёт в личный кабинет.'
  },
  {
    selector: '#btn-finish-match',
    title: 'Завершить матч',
    text: 'Сохраняет результат: победу, поражение или ничью. Смотрите статистику в личном кабинете.'
  }
];

let currentStep = 0;

export function initTutorial() {
  const btn = document.getElementById('btn-tutorial');
  if (btn) {
    btn.addEventListener('click', startTutorial);
  }
}

export function startTutorial() {
  const dashboard = document.getElementById('battle-dashboard');
  if (!dashboard || dashboard.classList.contains('hidden')) {
    alert('Сначала войдите на поле боя.');
    return;
  }
  currentStep = 0;
  showStep();
}

function showStep() {
  document.querySelectorAll('.tutorial-highlight').forEach(el => {
    el.classList.remove('tutorial-highlight');
  });

  if (currentStep >= STEPS.length) {
    endTutorial();
    return;
  }

  const step = STEPS[currentStep];
  const target = document.querySelector(step.selector);

  if (!target) {
    currentStep++;
    showStep();
    return;
  }

  target.classList.add('tutorial-highlight');
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });

  let overlay = document.getElementById('tutorial-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'tutorial-overlay';
    overlay.className = 'tutorial-overlay';
    document.body.appendChild(overlay);
  }

  overlay.innerHTML = `
    <div class="tutorial-box">
      <div class="tutorial-step-counter">Шаг ${currentStep + 1} из ${STEPS.length}</div>
      <h3>${escapeHtml(step.title)}</h3>
      <p>${escapeHtml(step.text)}</p>
      <div class="tutorial-actions">
        <button id="tut-skip" type="button">Пропустить</button>
        <button id="tut-next" type="button">${currentStep === STEPS.length - 1 ? 'Завершить' : 'Дальше →'}</button>
      </div>
    </div>
  `;

  document.getElementById('tut-next').addEventListener('click', () => {
    currentStep++;
    showStep();
  });

  document.getElementById('tut-skip').addEventListener('click', endTutorial);
}

function endTutorial() {
  document.querySelectorAll('.tutorial-highlight').forEach(el => {
    el.classList.remove('tutorial-highlight');
  });
  const overlay = document.getElementById('tutorial-overlay');
  if (overlay) overlay.remove();
}