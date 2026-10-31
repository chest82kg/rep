// src/account/auth.js

import {
  auth,
  db,
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from '../core/firebase.js';

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import {
  getDocFromServer
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { humanizeAuthError } from '../utils/errors.js';
import { escapeHtml } from '../utils/escape.js';

// Значения должны совпадать с правилами Firestore.
// Точные тексты этих редакций необходимо сохранять в истории проекта.
const LEGAL_VERSIONS = Object.freeze({
  terms: 'mt-terms-v1',
  consent: 'mt-consent-v1',
  privacy: 'mt-privacy-v1'
});

// Только подсказка для восстановления незавершённой операции.
// Не является доказательством согласия и не содержит пароля.
const PENDING_KEY = 'mt_registration_confirmation_pending_v1';

let initialized = false;
let authBusy = false;
let resendBusy = false;
let pendingUserId = null;

function readPendingUserId() {
  try {
    const value = localStorage.getItem(PENDING_KEY);

    return typeof value === 'string' && value.length <= 128
      ? value
      : null;
  } catch {
    return null;
  }
}

function rememberPending(userId) {
  pendingUserId = userId;

  try {
    localStorage.setItem(PENDING_KEY, userId);
  } catch {
    // В текущей вкладке восстановление остаётся доступным.
  }
}

function clearPending(userId) {
  if (pendingUserId === userId) {
    pendingUserId = null;
  }

  try {
    if (localStorage.getItem(PENDING_KEY) === userId) {
      localStorage.removeItem(PENDING_KEY);
    }
  } catch {
    // Не влияет на уже сохранённое подтверждение.
  }
}

export function registrationNeedsCompletion(user) {
  if (!user) return false;

  return pendingUserId === user.uid ||
    readPendingUserId() === user.uid;
}

function resetLegalChecks() {
  for (const id of ['register-terms', 'register-consent']) {
    const input = document.getElementById(id);

    if (input) {
      input.checked = false;
    }
  }
}

function validateRegistrationLegal() {
  const terms = document.getElementById('register-terms');
  const consent = document.getElementById('register-consent');

  if (
    !terms ||
    !consent ||
    terms.disabled ||
    consent.disabled
  ) {
    return {
      message:
        'Подтверждение условий недоступно. Обновите страницу.',
      field: null
    };
  }

  if (!terms.checked) {
    return {
      message:
        'Для регистрации необходимо принять ' +
        'Пользовательское соглашение.',
      field: terms
    };
  }

  if (!consent.checked) {
    return {
      message:
        'Для регистрации необходимо предоставить согласие ' +
        'на обработку персональных данных.',
      field: consent
    };
  }

  return null;
}

function validateCredentials(email, pass, registration = false) {
  const emailInput = document.getElementById('email');

  if (!email || !pass) {
    return 'Введите электронную почту и пароль.';
  }

  if (!emailInput.checkValidity()) {
    return 'Укажите корректный адрес электронной почты.';
  }

  if (registration && pass.length < 6) {
    return 'Пароль должен быть не короче 6 символов.';
  }

  return null;
}

function setAuthBusy(value) {
  authBusy = value;

  for (const id of [
    'btn-login',
    'btn-register',
    'btn-complete-registration',
    'btn-logout',
    'btn-verify-logout'
  ]) {
    const button = document.getElementById(id);

    if (button) {
      button.disabled = value;
    }
  }

  for (const id of [
    'email',
    'password',
    'register-terms',
    'register-consent'
  ]) {
    const input = document.getElementById(id);

    if (input) {
      input.disabled = value;
    }
  }

  const resendButton = document.getElementById('btn-resend-verify');

  if (resendButton) {
    resendButton.disabled = value || resendBusy;
  }

  document.getElementById('login-form')
    ?.setAttribute('aria-busy', String(value));
}

function errorText(error) {
  return error?.code
    ? humanizeAuthError(error)
    : error?.message || 'Неизвестная ошибка.';
}

function confirmationRef(userId) {
  return doc(db, 'registrationConfirmations', userId);
}

function validConfirmation(data, userId) {
  return Boolean(
    data &&
    data.userId === userId &&
    data.termsAccepted === true &&
    data.consentAccepted === true &&
    data.termsVersion === LEGAL_VERSIONS.terms &&
    data.consentVersion === LEGAL_VERSIONS.consent &&
    data.privacyVersion === LEGAL_VERSIONS.privacy &&
    data.source === 'account-registration' &&
    data.recordedAt &&
    typeof data.recordedAt.toMillis === 'function'
  );
}

/**
 * Проверяет именно серверную запись, а не локальный кэш.
 */
async function hasSavedConfirmation(userId) {
  const snapshot = await getDocFromServer(
    confirmationRef(userId)
  );

  if (!snapshot.exists()) {
    return false;
  }

  if (!validConfirmation(snapshot.data(), userId)) {
    throw new Error(
      'Сохранённое подтверждение относится к другой редакции ' +
      'или имеет неподдерживаемый формат. ' +
      'Обратитесь на info@mt-universe.ru.'
    );
  }

  return true;
}

/**
 * Создание подтверждения с серверным временем.
 * Повторная запись существующего документа не требуется.
 */
async function saveRegistrationConfirmation(userId) {
  const ref = confirmationRef(userId);

  if (await hasSavedConfirmation(userId)) {
    return;
  }

  try {
    await setDoc(ref, {
      userId,
      termsAccepted: true,
      consentAccepted: true,
      termsVersion: LEGAL_VERSIONS.terms,
      consentVersion: LEGAL_VERSIONS.consent,
      privacyVersion: LEGAL_VERSIONS.privacy,
      recordedAt: serverTimestamp(),
      source: 'account-registration'
    });
  } catch (error) {
    // Запись могла выполниться, а ответ — не дойти.
    try {
      if (await hasSavedConfirmation(userId)) {
        return;
      }
    } catch {
      // Ниже возвращаем исходную ошибку записи.
    }

    throw error;
  }
}

export function showRegistrationCompletion(user) {
  showAuthSection();
  resetLegalChecks();

  document.getElementById('email').value = user.email || '';
  document.getElementById('password').value = '';

  showMessage(
    document.getElementById('auth-message'),
    'Для завершения регистрации ознакомьтесь с документами, ' +
    'отметьте оба подтверждения и нажмите «Регистрация». ' +
    'Вы уже вошли в аккаунт, повторно вводить пароль не требуется.',
    'info'
  );
}

function showCurrentMessage(text, type = 'error') {
  const profile = document.getElementById('profile-section');
  const verify = document.getElementById('verify-notice');

  if (!profile.classList.contains('hidden')) {
    // Для ошибки выхода нет отдельного блока в профиле.
    window.alert(text);
    return;
  }

  const target = !verify.classList.contains('hidden')
    ? document.getElementById('verify-message')
    : document.getElementById('auth-message');

  showMessage(target, text, type);
}

export function initAuthUI() {
  if (initialized) return;
  initialized = true;

  pendingUserId = readPendingUserId();

  const authMessage = document.getElementById('auth-message');
  const verifyMessage = document.getElementById('verify-message');

  resetLegalChecks();

  // При восстановлении страницы из back-forward cache
  // прежние отметки не считаются новым действием пользователя.
  window.addEventListener('pageshow', event => {
    if (event.persisted && !authBusy) {
      resetLegalChecks();
    }
  });

  // Обычный вход не требует повторного принятия документов.
  document.getElementById('btn-login').addEventListener(
    'click',
    async () => {
      if (authBusy || resendBusy) return;

      const email = document.getElementById('email').value.trim();

      // Пробелы являются частью пароля.
      const pass = document.getElementById('password').value;

      showMessage(authMessage, '');

      const error = validateCredentials(email, pass);

      if (error) {
        showMessage(authMessage, error);
        return;
      }

      setAuthBusy(true);

      try {
        await signInWithEmailAndPassword(auth, email, pass);
        document.getElementById('password').value = '';
      } catch (error) {
        showMessage(
          authMessage,
          'Ошибка входа: ' + humanizeAuthError(error)
        );
      } finally {
        setAuthBusy(false);
      }
    }
  );

  document.getElementById('btn-register').addEventListener(
    'click',
    async () => {
      if (authBusy || resendBusy) return;

      showMessage(authMessage, '');
      showMessage(verifyMessage, '');

      const legalError = validateRegistrationLegal();

      if (legalError) {
        showMessage(authMessage, legalError.message);
        legalError.field?.focus();
        return;
      }

      const email = document.getElementById('email').value.trim();
      const pass = document.getElementById('password').value;
      const sessionUser = auth.currentUser;

      if (sessionUser) {
        const sessionEmail =
          (sessionUser.email || '').toLowerCase();

        if (sessionEmail !== email.toLowerCase()) {
          showMessage(
            authMessage,
            'Сначала выйдите из текущего аккаунта, ' +
            'чтобы зарегистрировать другой адрес.'
          );
          return;
        }
      } else {
        const error = validateCredentials(email, pass, true);

        if (error) {
          showMessage(authMessage, error);
          return;
        }
      }

      setAuthBusy(true);

      let user = sessionUser;

      try {
        if (!user) {
          const cred = await createUserWithEmailAndPassword(
            auth,
            email,
            pass
          );

          user = cred.user;
        }

        rememberPending(user.uid);

        await saveRegistrationConfirmation(user.uid);

        clearPending(user.uid);
        resetLegalChecks();

        document.getElementById('password').value = '';

        if (user.emailVerified) {
          // Повторно запускает существующую загрузку профиля
          // через onAuthStateChanged после перезагрузки.
          window.location.reload();
          return;
        }

        showVerifyNotice();

        try {
          await sendEmailVerification(user);

          showMessage(
            verifyMessage,
            'Подтверждения сохранены. На вашу почту отправлено ' +
            'письмо со ссылкой подтверждения. Проверьте также ' +
            'папку «Спам». После подтверждения выйдите ' +
            'из аккаунта и войдите заново.',
            'info'
          );
        } catch (error) {
          showMessage(
            verifyMessage,
            'Аккаунт создан, подтверждения сохранены, ' +
            'но письмо не удалось отправить: ' +
            humanizeAuthError(error) +
            '. Используйте кнопку повторной отправки.'
          );
        }
      } catch (error) {
        if (user) {
          // Аккаунт не удаляем: ошибка записи может быть временной.
          // Не объявляем регистрацию успешно завершённой.
          rememberPending(user.uid);

          showAuthSection();
          resetLegalChecks();

          document.getElementById('email').value =
            user.email || email;

          document.getElementById('password').value = '';

          showMessage(
            authMessage,
            'Аккаунт существует, но сохранить подтверждения ' +
            'не удалось. Проверьте соединение, снова отметьте ' +
            'оба пункта и нажмите «Регистрация». ' +
            'Пароль повторно вводить не требуется. ' +
            errorText(error)
          );
        } else {
          showMessage(
            authMessage,
            'Ошибка регистрации: ' +
            humanizeAuthError(error) +
            (error.code === 'auth/email-already-in-use'
              ? ' Если аккаунт создан ранее, войдите в него. ' +
                'При необходимости используйте кнопку ' +
                '«Завершить регистрацию».'
              : '')
          );
        }
      } finally {
        setAuthBusy(false);
      }
    }
  );

  document.getElementById('btn-complete-registration')
    .addEventListener('click', async () => {
      if (authBusy || resendBusy) return;

      const user = auth.currentUser;

      if (!user) {
        showMessage(
          verifyMessage,
          'Сессия истекла — войдите заново.'
        );
        return;
      }

      setAuthBusy(true);

      try {
        if (await hasSavedConfirmation(user.uid)) {
          clearPending(user.uid);

          showMessage(
            verifyMessage,
            'Подтверждения уже сохранены. ' +
            'Подтвердите почту, затем выйдите и войдите заново.',
            'info'
          );

          return;
        }

        rememberPending(user.uid);
        showRegistrationCompletion(user);
        document.getElementById('register-terms').focus();
      } catch (error) {
        showMessage(
          verifyMessage,
          'Не удалось проверить подтверждения: ' +
          errorText(error)
        );
      } finally {
        setAuthBusy(false);
      }
    });

  document.getElementById('btn-resend-verify').addEventListener(
    'click',
    async () => {
      if (resendBusy || authBusy) return;

      const user = auth.currentUser;

      if (!user) {
        showMessage(
          verifyMessage,
          'Сессия истекла — войдите заново.'
        );
        return;
      }

      resendBusy = true;
      const button = document.getElementById('btn-resend-verify');
      button.disabled = true;

      showMessage(verifyMessage, '');

      try {
        await sendEmailVerification(user);

        showMessage(
          verifyMessage,
          'Письмо отправлено повторно. Проверьте почту ' +
          'и папку «Спам».',
          'info'
        );
      } catch (error) {
        showMessage(
          verifyMessage,
          'Ошибка отправки: ' + humanizeAuthError(error)
        );
      } finally {
        resendBusy = false;
        button.disabled = authBusy;
      }
    }
  );

  for (const id of ['btn-logout', 'btn-verify-logout']) {
    document.getElementById(id).addEventListener(
      'click',
      async () => {
        if (authBusy || resendBusy) return;

        setAuthBusy(true);

        try {
          await signOut(auth);

          resetLegalChecks();
          document.getElementById('password').value = '';
        } catch (error) {
          showCurrentMessage(
            'Не удалось выйти: ' + humanizeAuthError(error)
          );
        } finally {
          setAuthBusy(false);
        }
      }
    );
  }
}

export function showAuthSection() {
  document.getElementById('auth-section')
    .classList.remove('hidden');

  document.getElementById('login-form')
    .classList.remove('hidden');

  document.getElementById('verify-notice')
    .classList.add('hidden');

  document.getElementById('profile-section')
    .classList.add('hidden');

  showMessage(
    document.getElementById('auth-message'),
    ''
  );
}

export function showVerifyNotice() {
  document.getElementById('auth-section')
    .classList.remove('hidden');

  document.getElementById('verify-notice')
    .classList.remove('hidden');

  document.getElementById('login-form')
    .classList.add('hidden');

  document.getElementById('profile-section')
    .classList.add('hidden');

  showMessage(
    document.getElementById('auth-message'),
    ''
  );
}

export function showProfile(email) {
  document.getElementById('auth-section')
    .classList.add('hidden');

  document.getElementById('verify-notice')
    .classList.add('hidden');

  document.getElementById('login-form')
    .classList.add('hidden');

  document.getElementById('profile-section')
    .classList.remove('hidden');

  document.getElementById('user-email-title').textContent = email;
}

export function showMessage(el, text, type = 'error') {
  if (!el) return;

  if (!text) {
    el.innerHTML = '';
    return;
  }

  const cls = type === 'info'
    ? 'form-info'
    : 'form-error';

  el.innerHTML =
    `<div class="${cls}">${escapeHtml(text)}</div>`;
}