import { renderOverview, renderTimerBanner } from './ui-overview.js';
import { initLogEntrySheet, openLogEntrySheet } from './ui-log-entry.js';
import { initAddProjectSheet, openAddProjectSheet } from './ui-add-project.js';
import { renderExportView, refreshExportBadge } from './export.js';

const overviewEl = document.getElementById('view-overview');
const exportEl = document.getElementById('view-export');
const timerBannerEl = document.getElementById('timer-banner');
const exportBadgeEl = document.getElementById('export-badge');
const fabEl = document.getElementById('fab');
const logEntryDialog = document.getElementById('log-entry-dialog');
const addProjectDialog = document.getElementById('add-project-dialog');
const tabButtons = document.querySelectorAll('.tab-btn');

async function refreshAll() {
  await renderOverview(overviewEl, { onAddProject: (clientId) => openAddProjectSheet(clientId) });
  await renderTimerBanner(timerBannerEl, { onStopped: refreshAll });
  await refreshExportBadge(exportBadgeEl);
  if (!exportEl.hidden) {
    await renderExportView(exportEl, { onExported: refreshAll });
  }
}

function switchView(view) {
  overviewEl.hidden = view !== 'overview';
  exportEl.hidden = view !== 'export';
  fabEl.hidden = view !== 'overview';
  tabButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.view === view));
  if (view === 'export') {
    renderExportView(exportEl, { onExported: refreshAll });
  }
}

tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

fabEl.addEventListener('click', () => openLogEntrySheet());

initLogEntrySheet(logEntryDialog, { onChange: refreshAll });
initAddProjectSheet(addProjectDialog, { onChange: refreshAll });

refreshAll();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) => {
      console.error('Service worker registratie mislukt', err);
    });
  });
}
