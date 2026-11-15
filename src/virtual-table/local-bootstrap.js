// src/virtual-table/local-bootstrap.js
//
// Запуск существующего локального стола.
//
// Этот модуль импортирует index.js, который:
// — восстанавливает локальную партию;
// — подключает обработчики моделей;
// — инициализирует локальные сохранения и историю.
//
// Не импортировать этот модуль при запуске будущего
// самостоятельного онлайн-поля.

import './index.js';

import { initRuler } from './ruler.js';
import { initNoteDrafts } from './note-drafts.js';
import { initObjectives } from './objectives.js';

import { initTableLayout } from './layout.js';
import { initMobileLayout } from './mobile-layout.js';

import { initFieldTools } from './field-tools.js';
import { initFullscreen } from './fullscreen.js';
import { initTableInterface } from './interface.js';

import {
  initWorkspaceMode
} from './workspace-mode.js';

import { initPartyBar } from './party-bar.js';

let initialized = false;

export function initLocalTable() {
  if (initialized) return;

  // Ставим флаг до запуска обработчиков:
  // повторный вызов не создаёт второй комплект интерфейса.
  initialized = true;

  initRuler();
  initNoteDrafts();
  initObjectives();

  initTableLayout();
  initMobileLayout();

  initFieldTools();
  initFullscreen();

  initTableInterface();
  initWorkspaceMode();
  initPartyBar();
}