// src/utils/escape.js
//
// Утилиты для безопасной вставки строк в HTML.
//
// escapeHtml(str)  — экранирует &, <, >, ", '.
// escapeAttr(str)  — алиас для escapeHtml, для семантики при работе с атрибутами.
//
// Используется во всех UI-модулях для защиты от XSS при интерполяции
// пользовательских данных (имён, ростеров, логов) в шаблоны.

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function escapeAttr(str) {
  return escapeHtml(str);
}