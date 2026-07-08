import { db } from './db.js';

async function importClientsAndProjects(data) {
  let clientsAdded = 0;
  let projectsAdded = 0;
  let skipped = 0;

  const clients = Array.isArray(data.clients) ? data.clients : [];
  for (const entry of clients) {
    const name = (entry.name || '').trim();
    if (!name) continue;

    let client = await db.findClientByName(name);
    if (!client) {
      client = await db.addClient({ name });
      clientsAdded++;
    }

    const projects = Array.isArray(entry.projects) ? entry.projects : [];
    for (const projectEntry of projects) {
      const isString = typeof projectEntry === 'string';
      const projectName = (isString ? projectEntry : projectEntry.name || '').trim();
      if (!projectName) continue;
      const fixedHours = !isString && projectEntry.fixedHours != null ? Number(projectEntry.fixedHours) : null;

      const existing = await db.findProjectByName(client.id, projectName);
      if (existing) {
        skipped++;
        continue;
      }
      await db.addProject({ clientId: client.id, name: projectName, fixedHours });
      projectsAdded++;
    }
  }

  return { clientsAdded, projectsAdded, skipped };
}

export function initImportSection({ onImported } = {}) {
  const fileInput = document.getElementById('import-file-input');
  const btn = document.getElementById('import-btn');
  const resultEl = document.getElementById('import-result');

  btn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;

    resultEl.textContent = 'Bezig met importeren…';
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const summary = await importClientsAndProjects(data);
      resultEl.textContent =
        `${summary.clientsAdded} nieuwe opdrachtgever(s), ${summary.projectsAdded} nieuw(e) project(en) toegevoegd` +
        (summary.skipped ? ` (${summary.skipped} bestonden al en zijn overgeslagen).` : '.');
      onImported && onImported();
    } catch (err) {
      resultEl.textContent = 'Import mislukt: dit is geen geldig JSON-bestand.';
    }
  });
}
