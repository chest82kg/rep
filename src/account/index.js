// src/account/index.js

import { auth } from '../core/firebase.js';

import {
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

import {
  initAuthUI,
  showAuthSection,
  showVerifyNotice,
  showProfile,
  showMessage,
  registrationNeedsCompletion,
  showRegistrationCompletion
} from './auth.js';

import {
  setCurrentUser,
  loadUserData,
  nextGeneration,
  getGeneration,
  closeRosterPreview
} from './profile.js';

import {
  initMatchesUI,
  renderLocalMatches
} from './matches.js';

import { initRoomsCleanupUI } from './rooms-cleanup.js';

initAuthUI();
initMatchesUI();
initRoomsCleanupUI();

onAuthStateChanged(auth, async user => {
  // Любая смена Auth-состояния инвалидирует все незавершённые
  // загрузки и действия предыдущего пользователя.
  const generation = nextGeneration();

  closeRosterPreview();

  if (!user) {
    setCurrentUser(null);
    showAuthSection();

    showMessage(
      document.getElementById('verify-message'),
      ''
    );

    return;
  }

  // Восстановление незавершённой регистрации в этом браузере.
  // Это не серверное ограничение доступа и не требование
  // повторного согласия для существующих аккаунтов.
  if (registrationNeedsCompletion(user)) {
    setCurrentUser(null);
    showRegistrationCompletion(user);
    return;
  }

  if (!user.emailVerified) {
    setCurrentUser(null);
    showVerifyNotice();
    return;
  }

  setCurrentUser(user);
  showProfile(user.email);

  await loadUserData(user.uid, generation);

  // Пока ожидали Firestore, пользователь мог выйти,
  // подтвердить другую учётную запись или сменить её.
  if (generation !== getGeneration()) {
    return;
  }

  renderLocalMatches();
});

// Совместимость с onclick в разметке модального окна.
window.closeRosterPreview = closeRosterPreview;