import { auth } from '../core/firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { initAuthUI, showAuthSection, showVerifyNotice, showProfile, showMessage } from './auth.js';
import { setCurrentUser, loadUserData, nextGeneration } from './profile.js';
import { initMatchesUI, renderLocalMatches } from './matches.js';
import { initRoomsCleanupUI } from './rooms-cleanup.js';

initAuthUI();
initMatchesUI();
initRoomsCleanupUI();

onAuthStateChanged(auth, async (user) => {
  const gen = nextGeneration();

  if (user) {
    if (!user.emailVerified) {
      setCurrentUser(null);
      showVerifyNotice();
      return;
    }

    setCurrentUser(user);
    showProfile(user.email);

    await loadUserData(user.uid, gen);
    renderLocalMatches();
  } else {
    setCurrentUser(null);
    showAuthSection();
    showMessage(document.getElementById('verify-message'), '');
  }
});