// src/core/firebase.js
//
// Инициализация Firebase для всего проекта.
// Конфиг вынесен в firebase-config.js — при смене проекта править только его.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { firebaseConfig } from './firebase-config.js';

// --- Проверка конфига ---
function validateConfig(cfg) {
  const required = ['apiKey', 'authDomain', 'projectId', 'appId'];
  const missing = required.filter(k => !cfg || !cfg[k] || String(cfg[k]).startsWith('YOUR_'));
  if (missing.length > 0) {
    throw new Error(
      '[firebase.js] Не заполнен firebaseConfig. Отсутствуют или оставлены заглушками: ' +
      missing.join(', ') +
      '. Откройте firebase-config.js и вставьте значения из консоли Firebase → Project settings → Your apps → Web app.'
    );
  }
}

validateConfig(firebaseConfig);

// --- Инициализация ---
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// --- Хелперы Firestore ---

export async function saveUserRoster(userId, rosterData, docId = null) {
  if (!userId) throw new Error('saveUserRoster: userId обязателен');
  try {
    const colRef = collection(db, 'users', userId, 'rosters');
    if (docId) {
      const ref = doc(colRef, docId);
      await setDoc(ref, {
        ...rosterData,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return docId;
    } else {
      const ref = doc(colRef);
      await setDoc(ref, {
        ...rosterData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return ref.id;
    }
  } catch (err) {
    console.error('[firebase.js] saveUserRoster error:', err);
    throw err;
  }
}

export async function getUserRosters(userId) {
  if (!userId) throw new Error('getUserRosters: userId обязателен');
  const snap = await getDocs(collection(db, 'users', userId, 'rosters'));
  const rosters = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  // Сортируем на клиенте: сначала свежие обновления
  rosters.sort((a, b) => {
    const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return dateB - dateA;
  });
  return rosters;
}

export async function deleteUserRoster(userId, rosterId) {
  if (!userId || !rosterId) throw new Error('deleteUserRoster: userId и rosterId обязательны');
  await deleteDoc(doc(db, 'users', userId, 'rosters', rosterId));
}

export async function saveUserMatch(userId, matchData) {
  if (!userId) throw new Error('saveUserMatch: userId обязателен');
  const ref = await addDoc(collection(db, 'users', userId, 'matches'), {
    ...matchData,
    date: matchData.date || new Date().toISOString()
  });
  return ref.id;
}

export async function getUserMatches(userId) {
  if (!userId) throw new Error('getUserMatches: userId обязателен');
  try {
    const snap = await getDocs(
      query(collection(db, 'users', userId, 'matches'), orderBy('date', 'desc'))
    );
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    if (err?.code === 'failed-precondition' || /index/i.test(err?.message || '')) {
      console.warn(
        '[firebase.js] Firestore требует индекс для orderBy("date"). ' +
        'Создайте его в консоли Firebase или уберите orderBy. Пока — fallback без сортировки.'
      );
      const snap = await getDocs(collection(db, 'users', userId, 'matches'));
      const matches = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      matches.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      return matches;
    }
    throw err;
  }
}

export async function deleteUserMatch(userId, matchId) {
  if (!userId || !matchId) throw new Error('deleteUserMatch: userId и matchId обязательны');
  await deleteDoc(doc(db, 'users', userId, 'matches', matchId));
}

// --- Реэкспорт Firestore-функций ---
// Эти же функции используются в account/*, battle/rooms.js и других модулях.

export {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch
};