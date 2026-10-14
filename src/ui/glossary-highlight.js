// src/ui/glossary-highlight.js
//
// Подсвечивает термины глоссария в тексте статьи и показывает всплывающие подсказки.
// ВАЖНО: термины подсвечиваются только в основном тексте — не в заголовках
// (h1–h6) и не в служебных элементах (script, style, .tooltip-term).

import { GLOSSARY } from '../content/glossary.js';

export function highlightTerms() {
  const content = document.getElementById('app-content');
  if (!content) return;

  const terms = Object.keys(GLOSSARY);
  if (terms.length === 0) return;

  const GLOSSARY_LC = {};
  terms.forEach(k => { GLOSSARY_LC[k.toLowerCase()] = GLOSSARY[k]; });

  const escapedTerms = terms
    .slice()
    .sort((a, b) => b.length - a.length)
    .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

  const buildRegex = () => new RegExp(
    `(?<![\\p{L}\\p{N}_])(${escapedTerms.join('|')})(?![\\p{L}\\p{N}_])`,
    'giu'
  );

  const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.parentNode) return NodeFilter.FILTER_REJECT;
      const p = node.parentNode;

      // Уже подсвечено
      if (p.classList && p.classList.contains('tooltip-term')) return NodeFilter.FILTER_REJECT;

      // Служебные теги
      if (p.tagName === 'SCRIPT' || p.tagName === 'STYLE') return NodeFilter.FILTER_REJECT;

      // Заголовки — не подсвечиваем (включая текст внутри <strong> внутри <h2> и т.п.)
      if (p.closest && p.closest('h1, h2, h3, h4, h5, h6')) return NodeFilter.FILTER_REJECT;

      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const nodesToReplace = [];
  let node;
  while ((node = walker.nextNode())) {
    const re = buildRegex();
    if (re.test(node.nodeValue)) {
      nodesToReplace.push(node);
    }
  }

  nodesToReplace.forEach(textNode => {
    const fragment = document.createDocumentFragment();
    const text = textNode.nodeValue;
    const re = buildRegex();
    let lastIdx = 0;
    let match;

    while ((match = re.exec(text)) !== null) {
      const matchIdx = match.index;
      const matchText = match[0];

      if (matchIdx > lastIdx) {
        fragment.appendChild(document.createTextNode(text.slice(lastIdx, matchIdx)));
      }

      const lookup = GLOSSARY[matchText] || GLOSSARY_LC[matchText.toLowerCase()] || '';

      const span = document.createElement('span');
      span.className = 'tooltip-term';
      span.setAttribute('data-tooltip', lookup);
      span.textContent = matchText;
      fragment.appendChild(span);

      lastIdx = matchIdx + matchText.length;

      if (matchText.length === 0) re.lastIndex++;
    }

    if (lastIdx < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIdx)));
    }
    textNode.parentNode.replaceChild(fragment, textNode);
  });

  // Коррекция позиции тултипов при наведении — один раз
  if (!document._tooltipAdjustBound) {
    document._tooltipAdjustBound = true;
    document.addEventListener('mouseover', (e) => {
      const term = e.target.closest && e.target.closest('.tooltip-term');
      if (!term) return;

      term.classList.remove('tooltip-below', 'tooltip-shift-left', 'tooltip-shift-right');

      const rect = term.getBoundingClientRect();
      const vw = window.innerWidth;

      if (rect.right > vw - 40) {
        term.classList.add('tooltip-shift-left');
      } else if (rect.left < 40) {
        term.classList.add('tooltip-shift-right');
      }

      if (rect.top < 140) {
        term.classList.add('tooltip-below');
      }
    });
  }
}