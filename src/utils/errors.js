// src/utils/errors.js
//
// Преобразует технические коды Firebase в человеческие сообщения.
// Используется в UI для отображения понятных ошибок.

export function humanizeAuthError(err) {
  const code = err?.code || '';
  const map = {
    'auth/invalid-email': 'неверный формат Email',
    'auth/user-not-found': 'пользователь с таким Email не найден',
    'auth/user-disabled': 'этот аккаунт отключён',
    'auth/wrong-password': 'неверный пароль',
    'auth/invalid-credential': 'неверный Email или пароль',
    'auth/email-already-in-use': 'этот Email уже зарегистрирован',
    'auth/weak-password': 'слишком простой пароль (минимум 6 символов)',
    'auth/too-many-requests': 'слишком много попыток, попробуйте позже',
    'auth/network-request-failed': 'проблема с сетью, проверьте подключение',
    'auth/operation-not-allowed': 'в Firebase не включён вход по Email/Password',
    'auth/requires-recent-login': 'требуется повторный вход (операция устарела)',
    'auth/invalid-verification-code': 'неверный код подтверждения',
    'auth/missing-email': 'Email не указан'
  };
  return map[code] || (err?.message || 'неизвестная ошибка');
}

export function humanizeFirestoreError(err) {
  const code = err?.code || '';
  const map = {
    'permission-denied': 'доступ запрещён (проверьте Firestore Rules)',
    'unavailable': 'сервис временно недоступен',
    'unauthenticated': 'требуется авторизация',
    'failed-precondition': 'не выполняется предусловие (часто — нужен индекс Firestore)',
    'not-found': 'документ не найден',
    'already-exists': 'документ уже существует',
    'resource-exhausted': 'превышен лимит ресурсов (слишком много запросов)',
    'deadline-exceeded': 'превышено время ожидания',
    'cancelled': 'операция отменена',
    'invalid-argument': 'некорректный аргумент',
    'data-loss': 'потеря данных (необратимая ошибка)',
    'unknown': 'неизвестная ошибка Firestore'
  };
  return map[code] || (err?.message || 'неизвестная ошибка');
}