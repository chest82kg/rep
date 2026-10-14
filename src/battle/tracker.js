// src/battle/tracker.js
import { gameState, saveGameState, battleMode, activeRoomRole } from './state.js';
import { pushMyState } from './room-sync.js';
import { renderTracker } from './render.js';

// Карта действий: ключ — значение data-track, значение — функция,
// которая изменяет gameState. Проще расширять, чем цепочка if.
const TRACK_ACTIONS = {
  'round-up':    (gs) => { gs.round += 1; },
  'round-down':  (gs) => { gs.round = Math.max(1, gs.round - 1); },
  'vp-own-up':   (gs) => { gs.vpOwn += 1; },
  'vp-own-down': (gs) => { gs.vpOwn = Math.max(0, gs.vpOwn - 1); },
  'vp-opp-up':   (gs) => { gs.vpOpp += 1; },
  'vp-opp-down': (gs) => { gs.vpOpp = Math.max(0, gs.vpOpp - 1); }
};

export function initTracker() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-track]');
    if (!btn) return;
    const t = btn.dataset.track;
    if (!gameState) return;

    const action = TRACK_ACTIONS[t];
    if (!action) return;

    // В режиме комнаты гость не может менять раунд
    if ((t === 'round-up' || t === 'round-down') && battleMode === 'room' && activeRoomRole !== 'host') {
      return;
    }

    action(gameState);
    saveGameState();
    pushMyState();
    renderTracker();
  });
}