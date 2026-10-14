// src/battle/index.js
import { setPlayerName, initGameState, initAuthWatcher, saveGameStateNow, getPlayerName } from './state.js';
import { renderDashboard, openRulesModal, closeRulesModal, closeUnitCardModal } from './render.js';
import { initTracker } from './tracker.js';
import { initFinishMatch, closeFinishModal } from './finish.js';
import { initPhaseHelper, closePhaseModal } from './phase.js';
import { initRooms, openRoomsModal, closeRoomsModal, renderOpponentBadge } from './rooms.js';
import { initNotes, closeLogModal, closeNoteModal } from './notes.js';
import { initTutorial } from './tutorial.js';
import { initStakesTracker, closeStakesModal } from './stakes-tracker.js';
import { closeMagicModal } from './magic.js';
import { initBugReport, closeBugReportModal } from '../ui/bug-report.js';

initAuthWatcher();
initTracker();
initFinishMatch();
initPhaseHelper();
initRooms();
initNotes();
initTutorial();
initStakesTracker();
initBugReport();

window.startBattleSession = function() {
  const input = document.getElementById('player-name-input');
  const name = input.value.trim();
  if (!name) {
    alert('Пожалуйста, введите имя игрока!');
    return;
  }

  setPlayerName(name);
  document.getElementById('setup-screen').style.display = 'none';
  document.getElementById('battle-dashboard').classList.remove('hidden');

  initGameState();
  renderDashboard();
  renderOpponentBadge();
};

window.openRulesModal = openRulesModal;
window.closeRulesModal = closeRulesModal;
window.closeFinishModal = closeFinishModal;
window.closePhaseModal = closePhaseModal;
window.openRoomsModal = openRoomsModal;
window.closeRoomsModal = closeRoomsModal;
window.closeLogModal = closeLogModal;
window.closeNoteModal = closeNoteModal;
window.closeUnitCardModal = closeUnitCardModal;
window.closeStakesModal = closeStakesModal;
window.closeMagicModal = closeMagicModal;
window.closeBugReportModal = closeBugReportModal;

window.addEventListener('beforeunload', () => {
  if (getPlayerName()) saveGameStateNow();
});