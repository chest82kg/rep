// src/utils/debounce.js
//
// Классический debounce: откладывает вызов fn до момента, когда
// пройдёт ms миллисекунд без новых вызовов.
//
// Пример:
//   const search = debounce(query => runSearch(query), 200);
//   input.addEventListener('input', e => search(e.target.value));
//   // Если нужно отменить отложенный вызов:
//   search.cancel();

export function debounce(fn, ms = 250) {
  let timer = null;

  const debounced = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, ms);
  };

  debounced.cancel = () => {
    clearTimeout(timer);
    timer = null;
  };

  return debounced;
}