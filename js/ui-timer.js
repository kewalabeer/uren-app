import { db } from './db.js';
import { formatElapsed } from './util.js';

export async function getRunningTimerInfo() {
  const timer = await db.getActiveTimer();
  if (!timer) return null;
  const project = await db.getProject(timer.projectId);
  if (!project) return null;
  return { timer, project };
}

export async function startTimerForProject(projectId) {
  return db.startTimer(projectId);
}

export async function stopActiveTimer() {
  return db.stopTimer();
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
