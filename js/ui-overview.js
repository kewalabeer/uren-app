import { db } from './db.js';
import { decimalToHm, isThisMonth, isToday } from './util.js';
import { getRunningTimerInfo, startTicking, startTimerForProject, stopActiveTimer } from './ui-timer.js';

const expandedClients = new Set();
let cancelTick = null;

export async function renderOverview(container, options = {}) {
  const { onAddProject, onQuickManual, onChange, onOpenEntries } = options;
  container.replaceChildren();

  const clients = await db.listClients();
  if (clients.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'Nog geen opdrachtgevers. Voeg er een toe om te beginnen.';
    const btn = document.createElement('button');
    btn.className = 'btn-primary';
    btn.textContent = '+ Nieuwe opdrachtgever';
    btn.addEventListener('click', () => onAddProject && onAddProject());
    container.append(empty, btn);
    return;
  }

  const activeTimer = await db.getActiveTimer();

  for (const client of clients) {
    const projects = await db.listProjectsByClient(client.id);
    const projectStats = [];
    let clientMonthTotal = 0;
    let clientTodayTotal = 0;

    for (const project of projects) {
      const entries = await db.listEntriesByProject(project.id);
      const allTime = entries.reduce((sum, e) => sum + e.hours, 0);
      const thisMonth = entries.reduce((sum, e) => (isThisMonth(e.date) ? sum + e.hours : sum), 0);
      const today = entries.reduce((sum, e) => (isToday(e.date) ? sum + e.hours : sum), 0);
      clientMonthTotal += thisMonth;
      clientTodayTotal += today;
      projectStats.push({ project, allTime, thisMonth });
    }

    const card = document.createElement('div');
    card.className = 'client-card';

    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'client-header';
    const isExpanded = expandedClients.has(client.id);
    header.setAttribute('aria-expanded', String(isExpanded));

    const nameEl = document.createElement('span');
    nameEl.className = 'client-name';
    nameEl.textContent = client.name;

    const subEl = document.createElement('span');
    subEl.className = 'client-sub';
    subEl.textContent = isExpanded
      ? `${decimalToHm(clientMonthTotal)} deze maand`
      : `${decimalToHm(clientTodayTotal)} vandaag`;

    const chevron = document.createElement('span');
    chevron.className = 'chevron';
    chevron.textContent = isExpanded ? '▾' : '▸';

    header.append(nameEl, subEl, chevron);

    const projectList = document.createElement('div');
    projectList.className = 'project-list';
    projectList.hidden = !isExpanded;

    if (projectStats.length === 0) {
      const none = document.createElement('div');
      none.className = 'project-empty';
      none.textContent = 'Nog geen projecten voor deze opdrachtgever.';
      projectList.append(none);
    }

    for (const { project, allTime } of projectStats) {
      const row = document.createElement('div');
      row.className = 'project-row';

      const main = document.createElement('div');
      main.className = 'project-row-main';
      const pName = document.createElement('button');
      pName.type = 'button';
      pName.className = 'project-name';
      pName.textContent = project.name;
      pName.title = 'Bekijk/wijzig regels';
      pName.addEventListener('click', () => onOpenEntries && onOpenEntries(project));
      const pHours = document.createElement('span');
      pHours.className = 'project-hours';
      pHours.textContent = decimalToHm(allTime);

      const actions = document.createElement('div');
      actions.className = 'project-row-actions';

      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'row-action-btn';
      addBtn.textContent = '+';
      addBtn.title = 'Uren toevoegen';
      addBtn.setAttribute('aria-label', `Uren toevoegen voor ${project.name}`);
      addBtn.addEventListener('click', () => onQuickManual && onQuickManual(project));

      const isRunning = Boolean(activeTimer && activeTimer.projectId === project.id);
      const timerBtn = document.createElement('button');
      timerBtn.type = 'button';
      timerBtn.className = `row-action-btn ${isRunning ? 'stop' : 'play'}`;
      timerBtn.textContent = isRunning ? '■' : '▶';
      timerBtn.title = isRunning ? 'Timer stoppen' : 'Timer starten';
      timerBtn.setAttribute('aria-label', `${timerBtn.title} voor ${project.name}`);
      timerBtn.addEventListener('click', async () => {
        if (isRunning) {
          await stopActiveTimer();
        } else {
          await startTimerForProject(project.id);
        }
        onChange && onChange();
      });

      const archiveBtn = document.createElement('button');
      archiveBtn.type = 'button';
      archiveBtn.className = 'row-action-btn archive';
      archiveBtn.textContent = '⋯';
      archiveBtn.title = 'Project afronden';
      archiveBtn.setAttribute('aria-label', `Project afronden: ${project.name}`);
      archiveBtn.addEventListener('click', async () => {
        const ok = confirm(
          `"${project.name}" afronden? Het project verdwijnt uit dit overzicht en uit toekomstige imports. Gelogde uren blijven bewaard.`
        );
        if (!ok) return;
        await db.archiveProject(project.id);
        onChange && onChange();
      });

      actions.append(addBtn, timerBtn, archiveBtn);
      main.append(pName, pHours, actions);
      row.append(main);

      if (project.fixedHours != null && project.fixedHours > 0) {
        const bar = document.createElement('div');
        bar.className = 'progress-bar';
        const fill = document.createElement('div');
        fill.className = 'progress-fill';
        const pct = Math.min(100, Math.round((allTime / project.fixedHours) * 100));
        fill.style.width = `${pct}%`;
        if (allTime > project.fixedHours) fill.classList.add('over-budget');
        bar.append(fill);
        const label = document.createElement('div');
        label.className = 'progress-label';
        label.textContent = `${allTime.toFixed(1).replace(/\.0$/, '')} / ${project.fixedHours} uur`;
        row.append(bar, label);
      }

      projectList.append(row);
    }

    const addProjectBtn = document.createElement('button');
    addProjectBtn.type = 'button';
    addProjectBtn.className = 'add-project-link';
    addProjectBtn.textContent = '+ nieuw project';
    addProjectBtn.addEventListener('click', () => onAddProject && onAddProject(client.id));
    projectList.append(addProjectBtn);

    header.addEventListener('click', () => {
      if (expandedClients.has(client.id)) {
        expandedClients.delete(client.id);
      } else {
        expandedClients.add(client.id);
      }
      renderOverview(container, options);
    });

    card.append(header, projectList);
    container.append(card);
  }
}

export async function renderTimerBanner(container, { onStopped } = {}) {
  if (cancelTick) {
    cancelTick();
    cancelTick = null;
  }
  container.replaceChildren();

  const info = await getRunningTimerInfo();
  if (!info) {
    container.hidden = true;
    return;
  }
  container.hidden = false;

  const label = document.createElement('span');
  label.className = 'timer-banner-label';
  label.textContent = `⏱ ${info.project.name}`;

  const elapsed = document.createElement('span');
  elapsed.className = 'timer-banner-elapsed';
  cancelTick = startTicking(elapsed, info.timer.startedAt);

  const stopBtn = document.createElement('button');
  stopBtn.type = 'button';
  stopBtn.className = 'btn-stop';
  stopBtn.textContent = 'Stop';
  stopBtn.addEventListener('click', async () => {
    await stopActiveTimer();
    onStopped && onStopped();
  });

  container.append(label, elapsed, stopBtn);
}
