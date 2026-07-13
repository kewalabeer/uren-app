import { renderOverview, renderTimerBanner, renderWeekTotal } from './ui-overview.js';
import { initLogEntrySheet, openLogEntrySheet, openManualEntryForProject } from './ui-log-entry.js';
import { initAddProjectSheet, openAddProjectSheet } from './ui-add-project.js';
import { renderExportView, refreshExportBadge } from './export.js';
import { initImportSection } from './ui-import.js';
import { initTimerConfirmDialog } from './ui-timer.js';
import { initEntriesSheet, openEntriesForProject } from './ui-entries.js';

const overviewEl = document.getElementById('view-overview');
const exportEl = document.getElementById('view-export');
const exportContentEl = document.getElementById('export-content');
const timerBannerEl = document.getElementById('timer-banner');
const exportBadgeEl = document.getElementById('export-badge');
const fabEl = document.getElementById('fab');
const logEntryDialog = document.getElementById('log-entry-dialog');
const addProjectDialog = document.getElementById('add-project-dialog');
const timerConfirmDialog = document.getElementById('timer-confirm-dialog');
const entriesDialog = document.getElementById('entries-dialog');
const weekTotalEl = document.getElementById('week-total');
const tabButtons = document.querySelectorAll('.tab-btn');

async function refreshAll() {
  await renderOverview(overviewEl, {
    onAddProject: (clientId) => openAddProjectSheet(clientId),
    onQuickManual: (project) => openManualEntryForProject(project),
    onOpenEntries: (project) => openEntriesForProject(project),
    onChange: refreshAll,
  });
  await renderTimerBanner(timerBannerEl, { onStopped: refreshAll });
  await renderWeekTotal(weekTotalEl);
  await refreshExportBadge(exportBadgeEl);
  if (!exportEl.hidden) {
    await renderExportView(exportContentEl, { onExported: refreshAll });
  }
}

function switchView(view) {
  overviewEl.hidden = view !== 'overview';
  exportEl.hidden = view !== 'export';
  fabEl.hidden = view !== 'overview';
  tabButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.view === view));
  if (view === 'export') {
    renderExportView(exportContentEl, { onExported: refreshAll });
  }
}

tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

fabEl.addEventListener('click', () => openLogEntrySheet());

initLogEntrySheet(logEntryDialog, { onChange: refreshAll });
initAddProjectSheet(addProjectDialog, { onChange: refreshAll });
initImportSection({ onImported: refreshAll });
initTimerConfirmDialog(timerConfirmDialog);
initEntriesSheet(entriesDialog, { onChange: refreshAll });

refreshAll();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) => {
      console.error('Service worker registratie mislukt', err);
    });
  });
}
