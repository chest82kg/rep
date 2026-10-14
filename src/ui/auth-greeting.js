// src/ui/auth-greeting.js
import { auth } from '../core/firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { escapeHtml } from '../utils/escape.js';

export function initAuthGreeting() {
  const greetingEl = document.getElementById('user-greeting');
  if (!greetingEl) return;

  onAuthStateChanged(auth, (user) => {
    if (user && user.emailVerified) {
      greetingEl.innerHTML = `Привет! <strong style="color: var(--accent);">${escapeHtml(user.email)}</strong>`;
    } else {
      greetingEl.textContent = 'Привет, Гость!';
    }
  });
}