// src/virtual-table/online-model-card.js
//
// Карточка модели онлайн-стола.
//
// — только отображение;
// — не обращается к Firebase;
// — не читает браузерные сохранения;
// — не изменяет модель;
// — не использует запасные характеристики;
// — постоянные бонусы берёт из каталога артефактов.
//
// Особые эффекты артефактов автоматически не применяются.

import {
  extractStrictUnitDetails
} from '../utils/unit-parser.js';

import {
  ARTIFACTS_LIST
} from '../content/artifacts.js';

function node(tag, text = '', className = '') {
  const element = document.createElement(tag);

  element.textContent = String(text ?? '');

  if (className) {
    element.className = className;
  }

  return element;
}

function addFold(parent, title) {
  const details = document.createElement('details');
  details.className = 'vt-card-fold';

  const summary = node('summary', title);

  const content = document.createElement('div');
  content.className = 'vt-card-fold-content';

  details.append(summary, content);
  parent.append(details);

  return content;
}

function artifactFor(unit) {
  if (
    unit.artifactId === null ||
    unit.artifactId === undefined ||
    unit.artifactId === ''
  ) {
    return {
      artifact: null,
      error: null
    };
  }

  const artifact = ARTIFACTS_LIST.find(
    item => item.id === unit.artifactId
  );

  if (!artifact) {
    return {
      artifact: null,
      error:
        'Артефакт отсутствует в текущем каталоге. ' +
        'Итоговые характеристики не определены.'
    };
  }

  return {
    artifact,
    error: null
  };
}

export function readOnlineModelCard(unit) {
  const source = extractStrictUnitDetails(unit.html || '');
  const assignment = artifactFor(unit);

  const total = {
    hp: null,
    move: null,
    armor: null
  };

  if (!assignment.error) {
    for (const key of ['hp', 'move', 'armor']) {
      const base = source.stats[key];

      const bonus = Number(
        assignment.artifact?.statBonuses?.[key] || 0
      );

      if (
        base !== null &&
        Number.isSafeInteger(bonus) &&
        Number.isSafeInteger(base + bonus)
      ) {
        total[key] = base + bonus;
      }
    }
  }

  return {
    base: source.stats,
    total,
    weapons: source.weapons,
    abilities: source.abilities,
    artifact: assignment.artifact,

    errors: [
      ...source.errors,
      ...(assignment.error ? [assignment.error] : [])
    ]
  };
}

/**
 * Добавляет подробности модели к существующей панели.
 *
 * Перед вызовом основной онлайн-стол очищает панель
 * и рисует название, принадлежность и позицию.
 */
export function appendOnlineModelCard(container, unit) {
  const card = readOnlineModelCard(unit);

  container.classList.add('vt-model-card');

  const stats = document.createElement('div');
  stats.className = 'vt-stats vt-card-stats';

  const definitions = [
    ['hp', 'Макс. ХП'],
    ['move', 'Движение'],
    ['armor', 'Броня']
  ];

  for (const [key, label] of definitions) {
    const box = document.createElement('div');
    box.className = 'vt-stat';

    const value = card.total[key];

    box.append(
      node('span', label),
      node('strong', value === null ? '—' : value)
    );

    const base = card.base[key];

    if (
      value !== null &&
      base !== null &&
      value !== base
    ) {
      const bonus = value - base;

      box.append(
        node(
          'small',
          `База ${base}; артефакт ${bonus > 0 ? '+' : ''}${bonus}`
        )
      );
    }

    stats.append(box);
  }

  container.append(stats);


  if (card.errors.length) {
    const warning = document.createElement('section');
    warning.className = 'vt-detail-block';

    warning.append(
      node('strong', 'Не все характеристики удалось прочитать')
    );

    const list = document.createElement('ul');

    for (const error of card.errors) {
      list.append(node('li', error));
    }

    warning.append(list);

    warning.append(
      node(
        'p',
        'Неизвестные значения не заменяются на 6 или другие числа.',
        'vt-muted'
      )
    );

    container.append(warning);
  }

  if (card.weapons.length) {
    const content = addFold(
      container,
      `Оружие · ${card.weapons.length}`
    );

    for (const weapon of card.weapons) {
      const block = document.createElement('section');
      block.className = 'vt-detail-block vt-weapon-block';

      block.append(
        node('strong', weapon.name || 'Оружие')
      );

      if (weapon.type) {
        block.append(node('p', weapon.type));
      }

      if (weapon.stats) {
        block.append(node('p', weapon.stats));
      }

      content.append(block);
    }
  }

  if (card.abilities.length) {
    const content = addFold(
      container,
      `Способности · ${card.abilities.length}`
    );

    for (const ability of card.abilities) {
      const details = document.createElement('details');
      details.className = 'vt-detail-block';

      details.append(
        node('summary', ability.title || 'Способность'),
        node('p', ability.text)
      );

      content.append(details);
    }
  }

  if (card.artifact) {
    const content = addFold(
      container,
      `Артефакт · ${card.artifact.name}`
    );

    content.append(
      node('p', card.artifact.description),
      node(
        'p',
        'Постоянные бонусы показаны в характеристиках выше. ' +
        'Особый эффект применяется вручную. ' +
        'Заряды, ресурсы и использование эффекта не отмечаются автоматически.',
        'vt-muted'
      )
    );
  }

  return card;
}