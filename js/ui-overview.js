import { db } from './db.js';
import { decimalToHm, isThisMonth } from './util.js';
import { getRunningTimerInfo, startTicking, stopActiveTimer } from './ui-timer.js';

const expandedClients = new Set();
let cancelTick = null;

export async function renderOverview(container, { onAddProject } = {}) {
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

  for (const client of clients) {
    const projects = await db.listProjectsByClient(client.id);
    const projectStats = [];
    let clientMonthTotal = 0;

    for (const project of projects) {
      const entries = await db.listEntriesByProject(project.id);
      const allTime = entries.reduce((sum, e) => sum + e.hours, 0);
      const thisMonth = entries.reduce((sum, e) => (isThisMonth(e.date) ? sum + e.hours : sum), 0);
      clientMonthTotal += thisMonth;
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
    subEl.textContent = `${decimalToHm(clientMonthTotal)} deze maand`;

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
      const pName = document.createElement('span');
      pName.className = 'project-name';
      pName.textContent = project.name;
      const pHours = document.createElement('span');
      pHours.className = 'project-hours';
      pHours.textContent = decimalToHm(allTime);
      main.append(pName, pHours);
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
      renderOverview(container, { onAddProject });
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
