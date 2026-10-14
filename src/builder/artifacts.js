// src/builder/artifacts.js

import { roster } from './state.js';
import { ARTIFACTS_LIST } from '../content/artifacts.js';

export function getAvailableArtifacts() {
  return roster.units.filter(u => (u.role || '').toLowerCase().includes('герой')).length;
}

export function getUsedArtifacts() {
  return roster.artifacts.length;
}

export function getArtifactsCost() {
  return roster.artifacts.reduce((sum, a) => {
    const art = ARTIFACTS_LIST.find(x => x.id === a.id);
    return sum + (art ? art.cost : 0);
  }, 0);
}

export function canAddArtifact(artId) {
  const art = ARTIFACTS_LIST.find(x => x.id === artId);
  if (!art) return { ok: false, reason: 'Артефакт не найден.' };

  const available = getAvailableArtifacts();
  const used = getUsedArtifacts();

  if (used >= available) {
    return { ok: false, reason: `Лимит: ${available} артефактов (по числу Героев).` };
  }

  if (art.needClass && Array.isArray(art.needClass)) {
    const hasClass = roster.units.some(u => {
      const role = (u.role || '').toLowerCase();
      if (art.needClass.includes('hero') && role.includes('герой')) return true;
      if (art.needClass.includes('elite') && role.includes('элит')) return true;
      return false;
    });
    if (!hasClass) {
      return { ok: false, reason: `Нужен юнит класса: ${art.needClass.join(' / ')}.` };
    }
  }

  return { ok: true };
}

export function addArtifact(artId, targetIdx = 0) {
  const check = canAddArtifact(artId);
  if (!check.ok) return check;
  roster.artifacts.push({ id: artId, targetIdx });
  return { ok: true };
}

export function removeArtifact(idx) {
  if (idx < 0 || idx >= roster.artifacts.length) return;
  roster.artifacts.splice(idx, 1);
}

export function setArtifactTarget(idx, targetIdx) {
  if (idx < 0 || idx >= roster.artifacts.length) return;
  roster.artifacts[idx].targetIdx = targetIdx;
}

export { ARTIFACTS_LIST };