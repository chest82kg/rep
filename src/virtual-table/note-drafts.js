// src/virtual-table/note-drafts.js
//
// Защита несохранённого текста заметок.
// Черновики сохраняются в sessionStorage:
// доступны после обновления страницы в той же вкладке.
//
// Само состояние партии изменяет существующий markers.js.

const STORAGE_KEY = 'mt_virtual_table_note_drafts_v1';
const MAX_NOTE_LENGTH = 2000;

let initialized = false;

export function initNoteDrafts() {
  if (initialized) return;

  const details = document.getElementById('vt-details');
  if (!details) return;

  initialized = true;

  const drafts = new Map();

  let storageAvailable = true;

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);

    if (raw !== null) {
      const saved = JSON.parse(raw);

      if (
        !saved ||
        typeof saved !== 'object' ||
        Array.isArray(saved)
      ) {
        throw new Error('Неверный формат черновиков.');
      }

      for (const [id, value] of Object.entries(saved)) {
        if (
          typeof value === 'string' &&
          value.length <= MAX_NOTE_LENGTH
        ) {
          drafts.set(id, value);
        }
      }
    }
  } catch (error) {
    console.warn('Не удалось прочитать черновики заметок:', error);
  }

  function persistDrafts() {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(Object.fromEntries(drafts))
      );

      storageAvailable = true;
    } catch (error) {
      storageAvailable = false;

      console.warn(
        'Черновики доступны только до закрытия или обновления страницы:',
        error
      );
    }
  }

  function currentTextarea() {
    return details.querySelector('#vt-model-note');
  }

  function updateHint(textarea) {
    if (!textarea) return;

    let hint = details.querySelector('#vt-note-draft-status');

    if (!hint) {
      hint = document.createElement('p');
      hint.id = 'vt-note-draft-status';
      hint.className = 'vt-muted';
      hint.setAttribute('role', 'status');
      hint.setAttribute('aria-live', 'polite');

      textarea.after(hint);
    }

    const id = textarea.dataset.unit;
    const hasDraft = drafts.has(id);

    const original = textarea.dataset.savedNote ?? '';
    const dirty = hasDraft && drafts.get(id) !== original;

    if (dirty) {
      hint.textContent = storageAvailable
        ? 'Есть несохранённый черновик. Он защищён в этой вкладке. ' +
          'Нажмите «Сохранить заметку», чтобы записать его в партию.'
        : 'Есть несохранённый черновик. Хранилище вкладки недоступно: ' +
          'не обновляйте страницу до сохранения заметки.';

      hint.style.color = '#ffd18a';
    } else {
      hint.textContent =
        'Изменения текста защищаются черновиком. ' +
        'Для записи в партию используйте «Сохранить заметку».';

      hint.style.color = '';
    }
  }

  function restoreDraft() {
    const textarea = currentTextarea();

    if (!textarea || !textarea.dataset.unit) return;

    // Одно и то же поле не обрабатываем повторно:
    // иначе можно принять черновик за сохранённую заметку.
    if (textarea.dataset.draftProtection === 'ready') return;

    textarea.dataset.draftProtection = 'ready';

    const id = textarea.dataset.unit;
    const savedValue = textarea.value;

    textarea.dataset.savedNote = savedValue;

    if (drafts.has(id)) {
      const draft = drafts.get(id);

      if (draft === savedValue) {
        // Такой текст уже находится в состоянии партии.
        drafts.delete(id);
        persistDrafts();
      } else {
        textarea.value = draft;
      }
    }

    updateHint(textarea);
  }

  details.addEventListener('input', event => {
    const textarea = event.target;

    if (
      !(textarea instanceof HTMLTextAreaElement) ||
      textarea.id !== 'vt-model-note'
    ) {
      return;
    }

    const id = textarea.dataset.unit;
    if (!id) return;

    const value = textarea.value;

    if (value.length > MAX_NOTE_LENGTH) return;

    const savedValue = textarea.dataset.savedNote ?? '';

    if (value === savedValue) {
      drafts.delete(id);
    } else {
      drafts.set(id, value);
    }

    persistDrafts();
    updateHint(textarea);
  });

  // Существующий markers.js выполняет действие в фазе всплытия.
  // После него проверяем, произошла ли успешная перерисовка.
  details.addEventListener('click', event => {
    const button = event.target.closest('[data-marker-action]');

    if (!button || button.disabled) return;

    const action = button.dataset.markerAction;

    if (!['save-note', 'clear-note'].includes(action)) return;

    const previousTextarea = currentTextarea();
    const id = previousTextarea?.dataset.unit;

    if (!previousTextarea || !id) return;

    queueMicrotask(() => {
      const nextTextarea = currentTextarea();

      // При отмене подтверждения или ошибке сохранения
      // основная панель не пересоздаётся. Черновик оставляем.
      if (
        !nextTextarea ||
        nextTextarea === previousTextarea ||
        nextTextarea.dataset.unit !== id
      ) {
        return;
      }

      // Успешное действие записало заметку или очистило её.
      drafts.delete(id);
      persistDrafts();

      // MutationObserver мог уже восстановить старый черновик.
      // Возвращаем значение, полученное из состояния партии.
      if (nextTextarea.dataset.draftProtection === 'ready') {
        nextTextarea.value = nextTextarea.dataset.savedNote ?? '';
      } else {
        nextTextarea.dataset.savedNote = nextTextarea.value;
        nextTextarea.dataset.draftProtection = 'ready';
      }

      updateHint(nextTextarea);
    });
  }, true);

  const observer = new MutationObserver(restoreDraft);

  observer.observe(details, {
    childList: true,
    subtree: true
  });

  // Если sessionStorage не работает, предупреждаем о потере
  // несохранённого текста при уходе со страницы.
  window.addEventListener('beforeunload', event => {
    if (storageAvailable || drafts.size === 0) return;

    event.preventDefault();
    event.returnValue = '';
  });

  restoreDraft();
}