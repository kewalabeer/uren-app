import { db } from './db.js';
import { decimalToHm, hmToDecimal } from './util.js';

let dialogEl, titleEl, listEl, onChangeCb, currentProject;

export function initEntriesSheet(dialog, { onChange } = {}) {
  dialogEl = dialog;
  titleEl = dialog.querySelector('#entries-dialog-title');
  listEl = dialog.querySelector('#entries-list');
  onChangeCb = onChange;
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
}

function renderEditForm(row, entry) {
  row.replaceChildren();
  const form = document.createElement('form');
  form.className = 'manual-entry-form entry-edit-form';

  const totalMinutes = Math.round(entry.hours * 60);

  const dateLabel = document.createElement('label');
  dateLabel.className = 'field';
  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.value = entry.date;
  dateLabel.append('Datum', dateInput);

  const hmRow = document.createElement('div');
  hmRow.className = 'hm-row';
  const hoursLabel = document.createElement('label');
  hoursLabel.className = 'field';
  const hoursInput = document.createElement('input');
  hoursInput.type = 'number';
  hoursInput.min = '0';
  hoursInput.inputMode = 'numeric';
  hoursInput.value = String(Math.floor(totalMinutes / 60));
  hoursLabel.append('Uren', hoursInput);

  const minutesLabel = document.createElement('label');
  minutesLabel.className = 'field';
  const minutesInput = document.createElement('input');
  minutesInput.type = 'number';
  minutesInput.min = '0';
  minutesInput.max = '59';
  minutesInput.inputMode = 'numeric';
  minutesInput.value = String(totalMinutes % 60);
  minutesLabel.append('Minuten', minutesInput);
  hmRow.append(hoursLabel, minutesLabel);

  const noteLabel = document.createElement('label');
  noteLabel.className = 'field';
  const noteInput = document.createElement('input');
  noteInput.type = 'text';
  noteInput.value = entry.note || '';
  noteLabel.append('Notitie', noteInput);

  const saveBtn = document.createElement('button');
  saveBtn.type = 'submit';
  saveBtn.className = 'btn-primary';
  saveBtn.textContent = 'Opslaan';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'link-btn';
  cancelBtn.textContent = 'Annuleren';
  cancelBtn.addEventListener('click', () => renderViewRow(row, entry));

  form.append(dateLabel, hmRow, noteLabel, saveBtn, cancelBtn);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const hours = hmToDecimal(hoursInput.value, minutesInput.value);
    if (hours <= 0) {
      hoursInput.focus();
      return;
    }
    const updated = await db.updateEntry(entry.id, {
      date: dateInput.value || entry.date,
      hours,
      note: noteInput.value.trim() || null,
    });
    renderViewRow(row, updated);
    onChangeCb && onChangeCb();
  });

  row.append(form);
}

function renderViewRow(row, entry) {
  row.replaceChildren();

  const info = document.createElement('div');
  info.className = 'entry-row-info';
  const line1 = document.createElement('span');
  line1.className = 'entry-row-main';
  line1.textContent = `${entry.date} — ${decimalToHm(entry.hours)}`;
  const line2 = document.createElement('span');
  line2.className = 'entry-row-note';
  line2.textContent = entry.note || (entry.source === 'timer' ? '(via timer)' : '');
  info.append(line1, line2);

  const actions = document.createElement('div');
  actions.className = 'entry-row-actions';

  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'row-action-btn';
  editBtn.textContent = '✎';
  editBtn.title = 'Wijzigen';
  editBtn.setAttribute('aria-label', `Regel van ${entry.date} wijzigen`);
  editBtn.addEventListener('click', () => renderEditForm(row, entry));

  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'row-action-btn archive';
  delBtn.textContent = '🗑';
  delBtn.title = 'Verwijderen';
  delBtn.setAttribute('aria-label', `Regel van ${entry.date} verwijderen`);
  delBtn.addEventListener('click', async () => {
    const ok = confirm(`Deze regel (${decimalToHm(entry.hours)} op ${entry.date}) verwijderen?`);
    if (!ok) return;
    await db.deleteEntry(entry.id);
    await renderEntriesList();
    onChangeCb && onChangeCb();
  });

  actions.append(editBtn, delBtn);
  row.append(info, actions);
}

async function renderEntriesList() {
  listEl.replaceChildren();
  const entries = await db.listEntriesByProject(currentProject.id);
  entries.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

  if (entries.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'picker-hint';
    empty.textContent = 'Nog geen regels voor dit project.';
    listEl.append(empty);
    return;
  }

  for (const entry of entries) {
    const row = document.createElement('div');
    row.className = 'entry-row';
    renderViewRow(row, entry);
    listEl.append(row);
  }
}

export async function openEntriesForProject(project) {
  currentProject = project;
  titleEl.textContent = project.name;
  await renderEntriesList();
  dialogEl.showModal();
}
