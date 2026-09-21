import { uuid, todayStr } from './util.js';

const DB_NAME = 'urenapp';
const DB_VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const idb = e.target.result;
      if (!idb.objectStoreNames.contains('clients')) {
        idb.createObjectStore('clients', { keyPath: 'id' });
      }
      if (!idb.objectStoreNames.contains('projects')) {
        const s = idb.createObjectStore('projects', { keyPath: 'id' });
        s.createIndex('clientId', 'clientId');
      }
      if (!idb.objectStoreNames.contains('entries')) {
        const s = idb.createObjectStore('entries', { keyPath: 'id' });
        s.createIndex('projectId', 'projectId');
        s.createIndex('date', 'date');
        s.createIndex('exportedAt', 'exportedAt');
      }
      if (!idb.objectStoreNames.contains('activeTimer')) {
        idb.createObjectStore('activeTimer', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

let dbPromise = null;
function getDb() {
  if (!dbPromise) dbPromise = openDb();
  return dbPromise;
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function store(name, mode) {
  const idb = await getDb();
  return idb.transaction([name], mode).objectStore(name);
}

async function getAll(name) {
  return reqToPromise((await store(name, 'readonly')).getAll());
}

async function getOne(name, key) {
  return reqToPromise((await store(name, 'readonly')).get(key));
}

async function put(name, value) {
  await reqToPromise((await store(name, 'readwrite')).put(value));
  return value;
}

async function remove(name, key) {
  await reqToPromise((await store(name, 'readwrite')).delete(key));
}

async function getAllByIndex(name, indexName, value) {
  const s = await store(name, 'readonly');
  return reqToPromise(s.index(indexName).getAll(value));
}

export const db = {
  // ---- clients ----
  async listClients() {
    const all = await getAll('clients');
    return all.filter((c) => !c.archived).sort((a, b) => a.name.localeCompare(b.name));
  },

  // Includes archived clients: history (e.g. the week view) still needs their names.
  async listAllClients() {
    return getAll('clients');
  },

  async addClient({ name }) {
    const client = { id: uuid(), name, createdAt: new Date().toISOString(), archived: false };
    return put('clients', client);
  },

  async getClient(id) {
    return getOne('clients', id);
  },

  async findClientByName(name) {
    const all = await getAll('clients');
    return all.find((c) => c.name.toLowerCase() === name.toLowerCase() && !c.archived) || null;
  },

  // ---- projects ----
  async listProjects() {
    const all = await getAll('projects');
    return all.filter((p) => !p.archived);
  },

  // Includes archived (afgeronde) projects: their logged hours still belong in history views.
  async listAllProjects() {
    return getAll('projects');
  },

  async listProjectsByClient(clientId) {
    const all = await getAllByIndex('projects', 'clientId', clientId);
    return all.filter((p) => !p.archived).sort((a, b) => a.name.localeCompare(b.name));
  },

  async findProjectByName(clientId, name) {
    // Includes archived projects so a re-import can't resurrect/duplicate a finished project.
    const all = await getAllByIndex('projects', 'clientId', clientId);
    return all.find((p) => p.name.toLowerCase() === name.toLowerCase()) || null;
  },

  async getProject(id) {
    return getOne('projects', id);
  },

  async archiveProject(id) {
    const project = await getOne('projects', id);
    if (!project) return;
    project.archived = true;
    await put('projects', project);
  },

  async addProject({ clientId, name, fixedHours }) {
    const project = {
      id: uuid(),
      clientId,
      name,
      fixedHours: fixedHours != null ? Number(fixedHours) : null,
      billable: true,
      createdAt: new Date().toISOString(),
      archived: false,
    };
    return put('projects', project);
  },

  // ---- entries ----
  async listEntriesByProject(projectId) {
    return getAllByIndex('entries', 'projectId', projectId);
  },

  async listAllEntries() {
    return getAll('entries');
  },

  async addEntry({ projectId, date, hours, note, source }) {
    const entry = {
      id: uuid(),
      projectId,
      date: date || todayStr(),
      hours,
      note: note || null,
      billed: false,
      source,
      createdAt: new Date().toISOString(),
      exportedAt: null,
    };
    return put('entries', entry);
  },

  async listUnexportedEntries() {
    const all = await getAll('entries');
    return all.filter((e) => !e.exportedAt).sort((a, b) => a.date.localeCompare(b.date));
  },

  async updateEntry(id, changes) {
    const entry = await getOne('entries', id);
    if (!entry) return null;
    Object.assign(entry, changes);
    await put('entries', entry);
    return entry;
  },

  async deleteEntry(id) {
    await remove('entries', id);
  },

  async markExported(entryIds, exportedAt) {
    for (const id of entryIds) {
      const entry = await getOne('entries', id);
      if (entry) {
        entry.exportedAt = exportedAt;
        await put('entries', entry);
      }
    }
  },

  // ---- recent projects (for quick-pick tiles) ----
  async listRecentProjects(limit = 8) {
    const entries = await getAll('entries');
    const projects = await this.listProjects();
    const projectMap = new Map(projects.map((p) => [p.id, p]));
    const lastUsed = new Map();
    for (const e of entries) {
      const prev = lastUsed.get(e.projectId);
      if (!prev || e.createdAt > prev) lastUsed.set(e.projectId, e.createdAt);
    }
    return [...lastUsed.entries()]
      .sort((a, b) => b[1].localeCompare(a[1]))
      .map(([projectId]) => projectMap.get(projectId))
      .filter(Boolean)
      .slice(0, limit);
  },

  // ---- active timer ----
  async getActiveTimer() {
    return getOne('activeTimer', 'current');
  },

  async startTimer(projectId) {
    let stoppedEntry = null;
    const existing = await this.getActiveTimer();
    if (existing) {
      stoppedEntry = await this.stopTimer();
    }
    await put('activeTimer', { id: 'current', projectId, startedAt: new Date().toISOString() });
    return stoppedEntry;
  },

  async stopTimer(note, hoursOverride) {
    const existing = await this.getActiveTimer();
    if (!existing) return null;
    const elapsedMs = Date.now() - new Date(existing.startedAt).getTime();
    const hours = hoursOverride != null ? hoursOverride : elapsedMs / 3600000;
    const entry = await this.addEntry({
      projectId: existing.projectId,
      date: todayStr(),
      hours,
      note: note || null,
      source: 'timer',
    });
    await remove('activeTimer', 'current');
    return entry;
  },

  async discardTimer() {
    await remove('activeTimer', 'current');
  },
};
