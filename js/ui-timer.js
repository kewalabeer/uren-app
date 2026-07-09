import { db } from './db.js';
import { formatElapsed, hmToDecimal } from './util.js';

// A timer running longer than this asks for confirmation before it's saved as
// an entry — catches "forgot to stop it" without adding friction to normal use.
const LONG_TIMER_THRESHOLD_HOURS = 4;

let confirmDialogEl, hintEl, hoursInputEl, minutesInputEl, saveBtnEl, discardBtnEl;

export function initTimerConfirmDialog(dialog) {
  confirmDialogEl = dialog;
  hintEl = dialog.querySelector('#timer-confirm-hint');
  hoursInputEl = dialog.querySelector('#timer-confirm-hours');
  minutesInputEl = dialog.querySelector('#timer-confirm-minutes');
  saveBtnEl = dialog.querySelector('#timer-confirm-save');
  discardBtnEl = dialog.querySelector('#timer-confirm-discard');
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
}

export async function getRunningTimerInfo() {
  const timer = await db.getActiveTimer();
  if (!timer) return null;
  const project = await db.getProject(timer.projectId);
  if (!project) return null;
  return { timer, project };
}

// Resolves whatever timer is currently active (if any). Short timers stop
// immediately; timers over the threshold pause for confirmation so an
// absurd duration (forgot to stop it) can be corrected before it's saved.
// Returns { resolved, entry } — resolved is false if the user dismissed the
// confirmation without deciding, so callers know not to proceed further.
async function resolveCurrentTimer() {
  const timer = await db.getActiveTimer();
  if (!timer) return { resolved: true, entry: null };

  const elapsedMs = Date.now() - new Date(timer.startedAt).getTime();
  const elapsedHours = elapsedMs / 3600000;

  if (elapsedHours <= LONG_TIMER_THRESHOLD_HOURS) {
    const entry = await db.stopTimer();
    return { resolved: true, entry };
  }

  const project = await db.getProject(timer.projectId);
  const totalMinutes = Math.round(elapsedHours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  hintEl.textContent =
    `De timer voor "${project ? project.name : 'onbekend project'}" liep ${h} uur ${m} min. ` +
    'Klopt dat? Pas zo nodig aan voordat je opslaat.';
  hoursInputEl.value = h;
  minutesInputEl.value = m;

  return new Promise((resolve) => {
    const cleanup = () => {
      saveBtnEl.removeEventListener('click', onSave);
      discardBtnEl.removeEventListener('click', onDiscard);
      confirmDialogEl.removeEventListener('close', onClose);
    };
    const onSave = async () => {
      const hours = hmToDecimal(hoursInputEl.value, minutesInputEl.value);
      if (hours <= 0) {
        hoursInputEl.focus();
        return;
      }
      cleanup();
      confirmDialogEl.close();
      const entry = await db.stopTimer(null, hours);
      resolve({ resolved: true, entry });
    };
    const onDiscard = async () => {
      cleanup();
      confirmDialogEl.close();
      await db.discardTimer();
      resolve({ resolved: true, entry: null });
    };
    const onClose = () => {
      cleanup();
      resolve({ resolved: false, entry: null });
    };
    saveBtnEl.addEventListener('click', onSave);
    discardBtnEl.addEventListener('click', onDiscard);
    confirmDialogEl.addEventListener('close', onClose);
    confirmDialogEl.showModal();
  });
}

export async function startTimerForProject(projectId) {
  const result = await resolveCurrentTimer();
  if (!result.resolved) return null;
  return db.startTimer(projectId);
}

export async function stopActiveTimer() {
  const result = await resolveCurrentTimer();
  return result.entry;
}

// Ticks `el.textContent` every second with elapsed time since startedAt.
// Returns a cancel function.
export function startTicking(el, startedAt) {
  const started = new Date(startedAt).getTime();
  const tick = () => {
    el.textContent = formatElapsed(Date.now() - started);
  };
  tick();
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
}
