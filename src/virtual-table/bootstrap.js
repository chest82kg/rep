// src/virtual-table/bootstrap.js
//
// Сначала основной стол, затем дополнительные модули
// и компактная раскладка.

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