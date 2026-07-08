import { db } from './db.js';
import { hmToDecimal, todayStr } from './util.js';
import { getRunningTimerInfo, startTicking, startTimerForProject, stopActiveTimer } from './ui-timer.js';

const LAST_MODE_KEY = 'uren:lastMode';

let dialogEl;
let bodyEl;
let onChangeCb;
let mode = localStorage.getItem(LAST_MODE_KEY) || 'manual';
let pickedProject = null;
let showingFullPicker = false;
let cancelTick = null;

function stopTicking() {
  if (cancelTick) {
    cancelTick();
    cancelTick = null;
  }
}

async function renderProjectPicker(container, onPick) {
  showingFullPicker = false;

  const renderRecent = async () => {
    container.replaceChildren();
    const recent = await db.listRecentProjects(8);

    const heading = document.createElement('p');
    heading.className = 'picker-hint';
    heading.textContent = recent.length ? 'Kies een project' : 'Nog geen recente projecten';
    container.append(heading);

    const tiles = document.createElement('div');
    tiles.className = 'project-tiles';
    for (const project of recent) {
      const client = await db.getClient(project.clientId);
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'project-tile';
      const pName = document.createElement('span');
      pName.className = 'project-tile-name';
      pName.textContent = project.name;
      const cName = document.createElement('span');
      cName.className = 'project-tile-client';
      cName.textContent = client ? client.name : '';
      tile.append(pName, cName);
      tile.addEventListener('click', () => onPick(project));
      tiles.append(tile);
    }
    container.append(tiles);

    const otherBtn = document.createElement('button');
    otherBtn.type = 'button';
    otherBtn.className = 'link-btn';
    otherBtn.textContent = 'Andere project…';
    otherBtn.addEventListener('click', () => renderFull());
    container.append(otherBtn);
  };

  const renderFull = async () => {
    showingFullPicker = true;
    container.replaceChildren();
    const clients = await db.listClients();

    if (clients.length === 0) {
      const none = document.createElement('p');
      none.className = 'picker-hint';
      none.textContent = 'Nog geen opdrachtgevers of projecten.';
      container.append(none);
      return;
    }

    for (const client of clients) {
      const projects = await db.listProjectsByClient(client.id);
      if (projects.length === 0) continue;

      const heading = document.createElement('p');
      heading.className = 'picker-client-heading';
      heading.textContent = client.name;
      container.append(heading);

      const list = document.createElement('div');
      list.className = 'project-tiles';
      for (const project of projects) {
        const tile = document.createElement('button');
        tile.type = 'button';
        tile.className = 'project-tile';
        tile.textContent = project.name;
        tile.addEventListener('click', () => onPick(project));
        list.append(tile);
      }
      container.append(list);
    }

    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'link-btn';
    backBtn.textContent = '← Terug naar recente projecten';
    backBtn.addEventListener('click', () => renderRecent());
    container.append(backBtn);
  };

  await renderRecent();
}

async function renderTimerMode() {
  stopTicking();
  bodyEl.replaceChildren();

  const info = await getRunningTimerInfo();
  if (info) {
    const wrap = document.createElement('div');
    wrap.className = 'timer-running';

    const name = document.createElement('p');
    name.className = 'timer-running-name';
    name.textContent = info.project.name;

    const elapsed = document.createElement('p');
    elapsed.className = 'timer-running-elapsed';
    cancelTick = startTicking(elapsed, info.timer.startedAt);

    const stopBtn = document.createElement('button');
    stopBtn.type = 'button';
    stopBtn.className = 'btn-primary';
    stopBtn.textContent = 'Stop';
    stopBtn.addEventListener('click', async () => {
      await stopActiveTimer();
      onChangeCb && onChangeCb();
      dialogEl.close();
    });

    wrap.append(name, elapsed, stopBtn);
    bodyEl.append(wrap);
    return;
  }

  const pickerContainer = document.createElement('div');
  bodyEl.append(pickerContainer);
  await renderProjectPicker(pickerContainer, async (project) => {
    await startTimerForProject(project.id);
    onChangeCb && onChangeCb();
    dialogEl.close();
  });
}

function renderManualForm() {
  bodyEl.replaceChildren();

  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'link-btn';
  backBtn.textContent = '← Ander project';
  backBtn.addEventListener('click', () => {
    pickedProject = null;
    renderManualMode();
  });

  const title = document.createElement('p');
  title.className = 'picker-hint';
  title.textContent = pickedProject.name;

  const form = document.createElement('form');
  form.className = 'manual-entry-form';

  const dateLabel = document.createElement('label');
  dateLabel.className = 'field';
  dateLabel.append('Datum');
  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.value = todayStr();
  dateLabel.append(dateInput);

  const hmRow = document.createElement('div');
  hmRow.className = 'hm-row';
  const hoursLabel = document.createElement('label');
  hoursLabel.className = 'field';
  hoursLabel.append('Uren');
  const hoursInput = document.createElement('input');
  hoursInput.type = 'number';
  hoursInput.min = '0';
  hoursInput.inputMode = 'numeric';
  hoursInput.value = '0';
  hoursLabel.append(hoursInput);

  const minutesLabel = document.createElement('label');
  minutesLabel.className = 'field';
  minutesLabel.append('Minuten');
  const minutesInput = document.createElement('input');
  minutesInput.type = 'number';
  minutesInput.min = '0';
  minutesInput.max = '59';
  minutesInput.inputMode = 'numeric';
  minutesInput.value = '0';
  minutesLabel.append(minutesInput);

  hmRow.append(hoursLabel, minutesLabel);

  const noteLabel = document.createElement('label');
  noteLabel.className = 'field';
  noteLabel.append('Notitie (optioneel)');
  const noteInput = document.createElement('input');
  noteInput.type = 'text';
  noteLabel.append(noteInput);

  const saveBtn = document.createElement('button');
  saveBtn.type = 'submit';
  saveBtn.className = 'btn-primary';
  saveBtn.textContent = 'Opslaan';

  form.append(dateLabel, hmRow, noteLabel, saveBtn);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const hours = hmToDecimal(hoursInput.value, minutesInput.value);
    if (hours <= 0) {
      hoursInput.focus();
      return;
    }
    await db.addEntry({
      projectId: pickedProject.id,
      date: dateInput.value || todayStr(),
      hours,
      note: noteInput.value.trim() || null,
      source: 'manual',
    });
    pickedProject = null;
    onChangeCb && onChangeCb();
    dialogEl.close();
  });

  bodyEl.append(backBtn, title, form);
  hoursInput.focus();
}

async function renderManualMode() {
  if (pickedProject) {
    renderManualForm();
    return;
  }
  bodyEl.replaceChildren();
  const pickerContainer = document.createElement('div');
  bodyEl.append(pickerContainer);
  await renderProjectPicker(pickerContainer, (project) => {
    pickedProject = project;
    renderManualForm();
  });
}

async function renderBody() {
  dialogEl.querySelectorAll('.mode-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  if (mode === 'timer') {
    await renderTimerMode();
  } else {
    await renderManualMode();
  }
}

export function initLogEntrySheet(dialog, { onChange } = {}) {
  dialogEl = dialog;
  bodyEl = dialog.querySelector('#log-entry-body');
  onChangeCb = onChange;

  dialog.querySelectorAll('.mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      mode = btn.dataset.mode;
      localStorage.setItem(LAST_MODE_KEY, mode);
      pickedProject = null;
      renderBody();
    });
  });

  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => stopTicking());
}

export async function openLogEntrySheet() {
  pickedProject = null;
  showingFullPicker = false;
  await renderBody();
  dialogEl.showModal();
}
