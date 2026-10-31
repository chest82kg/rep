// src/ui/bug-report.js
//
// Кнопка «🐞 Сообщить о баге». Открывает модалку с формой,
// по отправке формирует mailto: с предзаполненным письмом на satisgulag@gmail.com.

const SUPPORT_EMAIL = 'satisgulag@gmail.com';

const PAGES = [
  { value: 'knowledge-base', label: '📖 База знаний' },
  { value: 'builder', label: '🛠️ Конструктор ростера' },
  { value: 'play', label: '⚔️ Игровой стол' },
  { value: 'account', label: '👤 Личный кабинет' },
  { value: 'workshop', label: '🧪 Мастерская' },
  { value: 'other', label: '❓ Другое' }
];

const CLANS = [
  { value: '', label: '— Не указан —' },
  { value: 'Кхад-Дарум: Клан Железной Кузни', label: 'Кхад-Дарум: Клан Железной Кузни' },
  { value: 'Кхад-Дарум: Клан Глубоких Троп', label: 'Кхад-Дарум: Клан Глубоких Троп' },
  { value: 'Кхад-Дарум: Клан Рунных Кузнецов', label: 'Кхад-Дарум: Клан Рунных Кузнецов' },
  { value: 'Арафия: Клан Скорпионов', label: 'Арафия: Клан Скорпионов' },
  { value: 'Арафия: Клан Барханов', label: 'Арафия: Клан Барханов' },
  { value: 'Арафия: Клан Костяных Шаманов', label: 'Арафия: Клан Костяных Шаманов' }
];

export function initBugReport() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="open-bug-report"]');
    if (!btn) return;
    e.preventDefault();
    openBugReportModal();
  });
}

export function openBugReportModal() {
  const modal = document.getElementById('bug-modal');
  const body = document.getElementById('bug-modal-body');
  if (!modal || !body) return;

  body.innerHTML = `
    <h2 class="bug-title">🐞 Сообщить о баге</h2>
    <p class="bug-subtitle">
      Опишите проблему — письмо уйдёт на <strong>${SUPPORT_EMAIL}</strong>.
      Если почтовый клиент не откроется, текст можно скопировать.
    </p>

    <div class="bug-form">
      <div class="bug-field">
        <label for="bug-what">Что случилось <span class="bug-required">*</span></label>
        <textarea id="bug-what" class="bug-input bug-textarea" placeholder="Опишите, что пошло не так. Чем подробнее, тем лучше."></textarea>
      </div>

      <div class="bug-field">
        <label for="bug-steps">Как воспроизвести <span class="bug-hint">(опционально)</span></label>
        <textarea id="bug-steps" class="bug-input bug-textarea" placeholder="1. Открыл билдер&#10;2. Выбрал клан…&#10;3. Нажал…"></textarea>
      </div>

      <div class="bug-grid-2">
        <div class="bug-field">
          <label for="bug-page">Где вы были</label>
          <select id="bug-page" class="bug-input">
            ${PAGES.map(p => `<option value="${p.value}">${p.label}</option>`).join('')}
          </select>
        </div>

        <div class="bug-field">
          <label for="bug-clan">Клан / фракция</label>
          <select id="bug-clan" class="bug-input">
            ${CLANS.map(c => `<option value="${c.value}">${c.label}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="bug-grid-2">
        <div class="bug-field">
          <label for="bug-name">Ваше имя <span class="bug-hint">(опционально)</span></label>
          <input type="text" id="bug-name" class="bug-input" placeholder="Как к вам обращаться">
        </div>

        <div class="bug-field">
          <label for="bug-email">Email для ответа <span class="bug-hint">(опционально)</span></label>
          <input type="email" id="bug-email" class="bug-input" placeholder="you@example.com">
        </div>
      </div>
    </div>

    <div id="bug-message" class="bug-message"></div>

    <div class="bug-actions">
      <button class="builder-action-btn primary" id="bug-send">📧 Отправить письмо</button>
      <button class="builder-action-btn" id="bug-copy">📋 Скопировать текст</button>
      <button class="builder-action-btn bug-cancel" id="bug-cancel">Отмена</button>
    </div>
  `;

  document.getElementById('bug-cancel').addEventListener('click', closeBugReportModal);
  document.getElementById('bug-send').addEventListener('click', () => sendReport());
  document.getElementById('bug-copy').addEventListener('click', () => copyReport());

  modal.classList.remove('hidden');
  setTimeout(() => document.getElementById('bug-what')?.focus(), 50);
}

export function closeBugReportModal() {
  document.getElementById('bug-modal')?.classList.add('hidden');
}

function collectForm() {
  return {
    what: (document.getElementById('bug-what')?.value || '').trim(),
    steps: (document.getElementById('bug-steps')?.value || '').trim(),
    page: document.getElementById('bug-page')?.value || 'other',
    clan: document.getElementById('bug-clan')?.value || '',
    name: (document.getElementById('bug-name')?.value || '').trim(),
    email: (document.getElementById('bug-email')?.value || '').trim()
  };
}

function buildReportText(data) {
  const pageLabel = PAGES.find(p => p.value === data.page)?.label || data.page;
  const lines = [];

  lines.push(`Сообщение от: ${data.name || 'Аноним'}${data.email ? ' (' + data.email + ')' : ''}`);
  lines.push(`Страница: ${pageLabel}`);
  if (data.clan) lines.push(`Клан: ${data.clan}`);
  lines.push(`Браузер: ${navigator.userAgent}`);
  lines.push(`Дата: ${new Date().toISOString()}`);
  lines.push(`URL: ${window.location.href}`);
  lines.push('');
  lines.push('--- Что случилось ---');
  lines.push(data.what || '(не указано)');
  if (data.steps) {
    lines.push('');
    lines.push('--- Как воспроизвести ---');
    lines.push(data.steps);
  }

  return lines.join('\n');
}

function buildSubject(data) {
  const short = (data.what || 'Сообщение о баге').split('\n')[0].slice(0, 60);
  return `[MFT Bug] ${short}`;
}

function sendReport() {
  const data = collectForm();
  const msgEl = document.getElementById('bug-message');

  if (!data.what) {
    msgEl.innerHTML = '<div class="form-error">Опишите, что случилось — это обязательное поле.</div>';
    document.getElementById('bug-what')?.focus();
    return;
  }

  const subject = encodeURIComponent(buildSubject(data));
  const body = encodeURIComponent(buildReportText(data));
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;

  try {
    window.location.href = mailto;
    msgEl.innerHTML = `
      <div class="form-info">
        Открываем почтовый клиент… Если ничего не произошло — нажмите «📋 Скопировать текст» и отправьте вручную на <strong>${SUPPORT_EMAIL}</strong>.
      </div>
    `;
  } catch (err) {
    msgEl.innerHTML = `
      <div class="form-error">
        Не удалось открыть почтовый клиент. Скопируйте текст и отправьте на <strong>${SUPPORT_EMAIL}</strong>.
      </div>
    `;
  }
}

async function copyReport() {
  const data = collectForm();
  const msgEl = document.getElementById('bug-message');

  if (!data.what) {
    msgEl.innerHTML = '<div class="form-error">Опишите, что случилось — это обязательное поле.</div>';
    return;
  }

  const text = `Кому: ${SUPPORT_EMAIL}\nТема: ${buildSubject(data)}\n\n${buildReportText(data)}`;

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    msgEl.innerHTML = `
      <div class="form-info">
        Текст скопирован. Вставьте его в письмо на <strong>${SUPPORT_EMAIL}</strong>.
      </div>
    `;
  } catch (err) {
    msgEl.innerHTML = `<div class="form-error">Не удалось скопировать. Скопируйте вручную: ${SUPPORT_EMAIL}</div>`;
  }
}