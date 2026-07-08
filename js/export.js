import { db } from './db.js';
import { uuid } from './util.js';

async function buildPayload(entries) {
  const exportId = uuid();
  const exportedAt = new Date().toISOString();
  const enriched = [];
  const summaryMap = new Map();

  for (const entry of entries) {
    const project = await db.getProject(entry.projectId);
    const client = project ? await db.getClient(project.clientId) : null;

    enriched.push({
      id: entry.id,
      clientName: client ? client.name : null,
      projectName: project ? project.name : null,
      projectFixedHours: project ? project.fixedHours : null,
      date: entry.date,
      hours: Math.round(entry.hours * 100) / 100,
      note: entry.note,
      billed: entry.billed,
    });

    if (project && !summaryMap.has(project.id)) {
      const allEntries = await db.listEntriesByProject(project.id);
      const totalHoursAllTime = allEntries.reduce((s, e) => s + e.hours, 0);
      summaryMap.set(project.id, {
        clientName: client ? client.name : null,
        projectName: project.name,
        fixedHours: project.fixedHours,
        totalHoursAllTime: Math.round(totalHoursAllTime * 100) / 100,
      });
    }
  }

  return { exportId, exportedAt, entries: enriched, projectsSummary: [...summaryMap.values()] };
}

async function runExport(entries) {
  const payload = await buildPayload(entries);
  const json = JSON.stringify(payload, null, 2);
  const filename = `uren-export-${payload.exportedAt.slice(0, 19).replace(/[:T]/g, '-')}.json`;
  const file = new File([json], filename, { type: 'application/json' });

  let completed = false;

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Uren-export' });
      completed = true;
    } catch (err) {
      if (err.name === 'AbortError') {
        return { cancelled: true };
      }
      // other share errors: fall through to download fallback below
    }
  }

  if (!completed) {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    completed = true;
  }

  await db.markExported(entries.map((e) => e.id), payload.exportedAt);
  return { cancelled: false };
}

export async function refreshExportBadge(badgeEl) {
  const unexported = await db.listUnexportedEntries();
  badgeEl.hidden = unexported.length === 0;
  if (unexported.length > 0) badgeEl.textContent = String(unexported.length);
}

export async function renderExportView(container, { onExported } = {}) {
  container.replaceChildren();
  const unexported = await db.listUnexportedEntries();

  const countEl = document.createElement('p');
  countEl.className = 'export-count';
  countEl.textContent =
    unexported.length === 0 ? 'Alles is al geëxporteerd.' : `${unexported.length} nog niet geëxporteerde regel(s).`;
  container.append(countEl);

  if (unexported.length > 0) {
    const list = document.createElement('div');
    list.className = 'export-preview';
    for (const entry of unexported) {
      const project = await db.getProject(entry.projectId);
      const client = project ? await db.getClient(project.clientId) : null;
      const row = document.createElement('div');
      row.className = 'export-row';
      const label = document.createElement('span');
      label.textContent = `${entry.date} — ${client ? client.name + ' / ' : ''}${project ? project.name : '?'}`;
      const hours = document.createElement('span');
      hours.textContent = `${entry.hours.toFixed(2)}u`;
      row.append(label, hours);
      list.append(row);
    }
    container.append(list);

    const exportBtn = document.createElement('button');
    exportBtn.type = 'button';
    exportBtn.className = 'btn-primary';
    exportBtn.textContent = 'Exporteer';
    exportBtn.addEventListener('click', async () => {
      await runExport(unexported);
      onExported && onExported();
      renderExportView(container, { onExported });
    });
    container.append(exportBtn);
  }

  const redoBtn = document.createElement('button');
  redoBtn.type = 'button';
  redoBtn.className = 'link-btn';
  redoBtn.textContent = 'Her-exporteer laatste 30 dagen (herstel)';
  redoBtn.addEventListener('click', async () => {
    const all = await db.listAllEntries();
    const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
    const recent = all.filter((e) => new Date(e.date).getTime() >= cutoff);
    if (recent.length === 0) return;
    await runExport(recent);
    onExported && onExported();
    renderExportView(container, { onExported });
  });
  container.append(redoBtn);
}
