// src/account/auth.js
import { auth } from '../core/firebase.js';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { humanizeAuthError } from '../utils/errors.js';
import { escapeHtml } from '../utils/escape.js';

/**
 * Проверяет базовую валидность email/пароля.
 * @returns {string|null} — сообщение об ошибке или null.
 */
function validateCredentials(email, pass, options = {}) {
  if (!email || !pass) {
    return 'Введите Email и пароль!';
  }
  if (options.checkPasswordLength && pass.length < 6) {
    return 'Пароль должен быть не короче 6 символов (требование Firebase).';
  }
  return null;
}

export function initAuthUI() {
  const authMessage = document.getElementById('auth-message');
  const verifyMessage = document.getElementById('verify-message');

  document.getElementById('btn-login').addEventListener('click', async () => {
    const email = document.getElementById('email').value.trim();
    const pass = document.getElementById('password').value.trim();
    showMessage(authMessage, '');

    const err = validateCredentials(email, pass);
    if (err) { showMessage(authMessage, err); return; }

    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (e) {
      showMessage(authMessage, 'Ошибка входа: ' + humanizeAuthError(e));
    }
  });

  document.getElementById('btn-register').addEventListener('click', async () => {
    const email = document.getElementById('email').value.trim();
    const pass = document.getElementById('password').value.trim();
    showMessage(authMessage, '');

    const err = validateCredentials(email, pass, { checkPasswordLength: true });
    if (err) { showMessage(authMessage, err); return; }

    let cred;
    try {
      cred = await createUserWithEmailAndPassword(auth, email, pass);
    } catch (e) {
      showMessage(authMessage, 'Ошибка регистрации: ' + humanizeAuthError(e));
      return;
    }

    try {
      await sendEmailVerification(cred.user);
      showMessage(
        authMessage,
        'Аккаунт создан. На ваш Email отправлено письмо со ссылкой для активации. Проверьте почту (и папку «Спам»).',
        'info'
      );
    } catch (e) {
      console.error('sendEmailVerification error:', e);
      showMessage(
        authMessage,
        'Аккаунт создан, но письмо с подтверждением не удалось отправить: ' +
          humanizeAuthError(e) +
          '. Войдите в аккаунт — на странице появится кнопка «Отправить письмо повторно».'
      );
    }

    try { await signOut(auth); } catch (e) { /* ignore */ }
  });

  document.getElementById('btn-resend-verify').addEventListener('click', async () => {
    showMessage(verifyMessage, '');
    if (!auth.currentUser) {
      showMessage(verifyMessage, 'Сессия истекла — войдите заново.');
      return;
    }
    try {
      await sendEmailVerification(auth.currentUser);
      showMessage(verifyMessage, 'Письмо с подтверждением отправлено повторно. Проверьте почту и папку «Спам».', 'info');
    } catch (e) {
      showMessage(verifyMessage, 'Ошибка отправки: ' + humanizeAuthError(e));
    }
  });

  document.getElementById('btn-logout').addEventListener('click', () => {
    signOut(auth).catch(e => console.warn('signOut error:', e));
  });

  document.getElementById('btn-verify-logout').addEventListener('click', () => {
    signOut(auth).catch(e => console.warn('signOut error:', e));
  });
}

export function showAuthSection() {
  document.getElementById('auth-section').classList.remove('hidden');
  document.getElementById('login-form').classList.remove('hidden');
  document.getElementById('verify-notice').classList.add('hidden');
  document.getElementById('profile-section').classList.add('hidden');
  showMessage(document.getElementById('auth-message'), '');
}

export function showVerifyNotice() {
  document.getElementById('auth-section').classList.remove('hidden');
  document.getElementById('verify-notice').classList.remove('hidden');
  document.getElementById('login-form').classList.add('hidden');
  document.getElementById('profile-section').classList.add('hidden');
  showMessage(document.getElementById('auth-message'), '');
}

export function showProfile(email) {
  document.getElementById('auth-section').classList.add('hidden');
  document.getElementById('verify-notice').classList.add('hidden');
  document.getElementById('login-form').classList.add('hidden');
  document.getElementById('profile-section').classList.remove('hidden');
  document.getElementById('user-email-title').textContent = email;
}

export function showMessage(el, text, type = 'error') {
  if (!el) return;
  if (!text) { el.innerHTML = ''; return; }
  const cls = type === 'info' ? 'form-info' : 'form-error';
  el.innerHTML = `<div class="${cls}">${escapeHtml(text)}</div>`;
}