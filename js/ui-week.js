import { db } from './db.js';
import {
  DAY_SHORT,
  addDays,
  decimalToHm,
  formatDayLong,
  formatWeekRange,
  isoWeekNumber,
  parseDateStr,
  startOfWeek,
  todayStr,
} from './util.js';

const WORKDAYS = 5; // ma t/m vr; za/zo krijgen alleen een lichte achtergrond
const COLOR_SLOTS = 8; // clients beyond this fold into a grey "Overig" so hues are never cycled
const OTHER_SLOT = COLOR_SLOTS;
const AXIS_STEP = 4; // gridlines/labels every 4 hours
const REFERENCE_HOURS = [4, 8]; // dashed guide lines (half a day, full day): a yardstick, not a target

let weekStart = null;
let selectedDate = null;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function slotColor(slot) {
  return slot < COLOR_SLOTS ? `var(--c${slot + 1})` : 'var(--c-other)';
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Call when the tab is opened: start on the current week with today selected.
export function resetWeekView() {
  const today = todayStr();
  weekStart = startOfWeek(today);
  selectedDate = today;
}

async function loadModel() {
  const [entries, projects, clients] = await Promise.all([
    db.listAllEntries(),
    db.listAllProjects(),
    db.listAllClients(),
  ]);
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const clientById = new Map(clients.map((c) => [c.id, c]));

  // A client's colour follows the order in which clients first got hours, so a new client is
  // appended and never repaints existing ones (and unused imported clients don't burn a slot).
  const firstSeen = new Map();
  for (const e of entries) {
    const project = projectById.get(e.projectId);
    if (!project) continue;
    const prev = firstSeen.get(project.clientId);
    if (prev === undefined || e.createdAt < prev) firstSeen.set(project.clientId, e.createdAt);
  }
  const slotOf = new Map(
    [...firstSeen.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]) || a[0].localeCompare(b[0]))
      .map(([clientId], i) => [clientId, i])
  );

  return { entries, projectById, clientById, slotOf };
}

function buildWeek(model, start) {
  const dates = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const today = todayStr();
  const days = dates.map((date, idx) => ({
    date,
    idx,
    total: 0,
    isToday: date === today,
    clients: new Map(), // clientId -> { clientId, name, slot, hours, projects: Map }
  }));
  const dayByDate = new Map(days.map((d) => [d.date, d]));

  for (const entry of model.entries) {
    const day = dayByDate.get(entry.date);
    if (!day) continue;
    const project = model.projectById.get(entry.projectId);
    const clientId = project ? project.clientId : null;
    const client = clientId ? model.clientById.get(clientId) : null;
    const slot = Math.min(model.slotOf.has(clientId) ? model.slotOf.get(clientId) : OTHER_SLOT, OTHER_SLOT);

    let group = day.clients.get(clientId);
    if (!group) {
      group = { clientId, name: client ? client.name : '(onbekend)', slot, hours: 0, projects: new Map() };
      day.clients.set(clientId, group);
    }
    group.hours += entry.hours;
    day.total += entry.hours;
    if (project) {
      const row = group.projects.get(project.id) || { project, hours: 0 };
      row.hours += entry.hours;
      group.projects.set(project.id, row);
    }
  }

  // Stacked segments: one per colour slot ("Overig" merges every client beyond the palette).
  for (const day of days) {
    const segments = new Map();
    for (const group of day.clients.values()) {
      const seg = segments.get(group.slot) || { slot: group.slot, hours: 0, names: [] };
      seg.hours += group.hours;
      seg.names.push(group.name);
      segments.set(group.slot, seg);
    }
    day.segments = [...segments.values()].sort((a, b) => a.slot - b.slot);
  }

  const weekTotal = days.reduce((sum, d) => sum + d.total, 0);
  const legend = new Map();
  for (const day of days) {
    for (const group of day.clients.values()) {
      const item = legend.get(group.slot) || { slot: group.slot, hours: 0, name: group.slot === OTHER_SLOT ? 'Overig' : group.name };
      item.hours += group.hours;
      legend.set(group.slot, item);
    }
  }

  return { days, weekTotal, legend: [...legend.values()].sort((a, b) => a.slot - b.slot) };
}

// The axis always covers the 8-hour guide line and grows in 4-hour steps for longer days.
function axisMax(days) {
  const maxHours = Math.max(...REFERENCE_HOURS, ...days.map((d) => d.total));
  return Math.ceil(maxHours / AXIS_STEP) * AXIS_STEP;
}

function dayAriaLabel(day) {
  const parts = [...day.clients.values()].map((g) => `${g.name} ${decimalToHm(g.hours)}`);
  let text = `${formatDayLong(day.date)}: ${day.total > 0 ? decimalToHm(day.total) : 'geen uren'}`;
  if (parts.length) text += ` (${parts.join(', ')})`;
  return text;
}

function buildNav(week, ctx) {
  const currentStart = startOfWeek(todayStr());
  const isCurrent = weekStart === currentStart;

  const nav = el('div', 'week-nav');

  const prev = el('button', 'week-nav-btn', '‹');
  prev.type = 'button';
  prev.setAttribute('aria-label', 'Vorige week');
  prev.addEventListener('click', () => ctx.shift(-1));

  const title = el('div', 'week-nav-title');
  title.append(
    el('strong', null, `Week ${isoWeekNumber(weekStart)}`),
    el('span', 'week-nav-range', formatWeekRange(weekStart))
  );

  const next = el('button', 'week-nav-btn', '›');
  next.type = 'button';
  next.setAttribute('aria-label', 'Volgende week');
  next.disabled = isCurrent;
  next.addEventListener('click', () => ctx.shift(1));

  nav.append(prev, title, next);

  const summary = el('div', 'week-summary');
  summary.append(el('strong', null, decimalToHm(week.weekTotal)));
  if (!isCurrent) {
    const back = el('button', 'week-today-btn', 'Naar deze week');
    back.type = 'button';
    back.addEventListener('click', () => ctx.goToCurrent());
    summary.append(back);
  }

  const wrap = el('div', 'week-head');
  wrap.append(nav, summary);
  return wrap;
}

function buildChart(week, ctx) {
  const { days } = week;
  const yMax = axisMax(days);
  const pct = (hours) => `${(hours / yMax) * 100}%`;

  const chart = el('div', 'week-chart');

  const axis = el('div', 'week-axis');
  for (let v = 0; v <= yMax; v += AXIS_STEP) {
    const tick = el('span', 'week-axis-tick', v === 0 ? '0' : `${v}u`);
    tick.style.bottom = pct(v);
    axis.append(tick);
  }

  const plot = el('div', 'week-plot');

  // 4 and 8 hours are dashed guides; the baseline and any higher line stay plain hairlines.
  const grid = el('div', 'week-grid');
  for (let v = 0; v <= yMax; v += AXIS_STEP) {
    const kind = v === 0 ? 'baseline' : REFERENCE_HOURS.includes(v) ? 'reference' : '';
    const line = el('div', `week-gridline ${kind}`.trim());
    line.style.bottom = pct(v);
    grid.append(line);
  }

  const cols = el('div', 'week-cols');
  for (const day of days) {
    const col = el('button', 'week-col');
    col.type = 'button';
    if (day.idx >= WORKDAYS) col.classList.add('is-weekend');
    if (day.isToday) col.classList.add('is-today');
    if (day.date === selectedDate) col.classList.add('is-selected');
    col.setAttribute('aria-pressed', String(day.date === selectedDate));
    col.setAttribute('aria-label', dayAriaLabel(day));
    col.addEventListener('click', () => ctx.select(day.date));

    const area = el('div', 'week-bar-area');

    if (day.segments.length) {
      const stack = el('div', 'week-stack');
      for (const seg of day.segments) {
        const node = el('div', 'week-seg');
        node.style.height = pct(seg.hours);
        node.style.backgroundColor = slotColor(seg.slot); // not the shorthand: it would reset background-clip
        node.title = `${seg.slot === OTHER_SLOT ? 'Overig' : seg.names[0]}: ${decimalToHm(seg.hours)}`;
        stack.append(node);
      }
      area.append(stack);
    }

    const label = el('div', 'week-col-label');
    label.append(
      el('span', 'week-col-day', DAY_SHORT[day.idx]),
      el('span', 'week-col-date', String(parseDateStr(day.date).getDate())),
      el('span', 'week-col-total', day.total > 0 ? decimalToHm(day.total) : '–')
    );

    col.append(area, label);
    cols.append(col);
  }

  plot.append(grid, cols);
  chart.append(axis, plot);

  // Swipe sideways to page through weeks (the arrows do the same).
  let startX = 0;
  let startY = 0;
  chart.addEventListener('touchstart', (e) => {
    startX = e.changedTouches[0].clientX;
    startY = e.changedTouches[0].clientY;
  }, { passive: true });
  chart.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) ctx.shift(dx > 0 ? -1 : 1);
  }, { passive: true });

  return chart;
}

function buildLegend(week) {
  if (week.legend.length === 0) {
    return el('p', 'picker-hint week-empty', 'Nog geen uren gelogd in deze week.');
  }
  const list = el('ul', 'week-legend');
  for (const item of week.legend) {
    const li = el('li');
    const swatch = el('span', 'week-swatch');
    swatch.style.background = slotColor(item.slot);
    li.append(swatch, el('span', 'week-legend-name', item.name), el('span', 'week-legend-hours', decimalToHm(item.hours)));
    list.append(li);
  }
  return list;
}

function buildDetail(week, ctx) {
  const card = el('div', 'week-detail');
  const day = week.days.find((d) => d.date === selectedDate);
  if (!day) {
    card.append(el('p', 'picker-hint week-detail-hint', 'Tik op een dag voor de details.'));
    return card;
  }

  const head = el('div', 'week-detail-head');
  const heading = el('div', 'week-detail-title');
  heading.append(
    el('strong', null, capitalize(formatDayLong(day.date))),
    el('span', 'week-detail-total', day.total > 0 ? decimalToHm(day.total) : 'geen uren')
  );
  const addBtn = el('button', 'btn-primary week-add-btn', '+ Uren');
  addBtn.type = 'button';
  addBtn.setAttribute('aria-label', `Uren toevoegen op ${formatDayLong(day.date)}`);
  addBtn.addEventListener('click', () => ctx.addForDate(day.date));
  head.append(heading, addBtn);
  card.append(head);

  const groups = [...day.clients.values()].sort((a, b) => a.slot - b.slot);
  for (const group of groups) {
    const row = el('div', 'week-detail-client');
    const swatch = el('span', 'week-swatch');
    swatch.style.background = slotColor(group.slot);
    row.append(swatch, el('span', 'week-detail-client-name', group.name), el('span', 'week-detail-hours', decimalToHm(group.hours)));
    card.append(row);

    const projects = [...group.projects.values()].sort((a, b) => b.hours - a.hours);
    for (const { project, hours } of projects) {
      const pRow = el('button', 'week-detail-project');
      pRow.type = 'button';
      pRow.title = 'Bekijk/wijzig regels';
      pRow.append(el('span', 'week-detail-project-name', project.name), el('span', 'week-detail-hours', decimalToHm(hours)));
      pRow.addEventListener('click', () => ctx.openEntries(project));
      card.append(pRow);
    }
  }
  return card;
}

export async function renderWeekView(container, { onOpenEntries, onAddForDate } = {}) {
  if (!weekStart) resetWeekView();

  const model = await loadModel();
  const week = buildWeek(model, weekStart);

  const rerender = () => renderWeekView(container, { onOpenEntries, onAddForDate });
  const ctx = {
    shift(direction) {
      const next = addDays(weekStart, direction * 7);
      if (next > startOfWeek(todayStr())) return; // no browsing into the future
      weekStart = next;
      selectedDate = null;
      rerender();
    },
    goToCurrent() {
      resetWeekView();
      rerender();
    },
    select(date) {
      selectedDate = selectedDate === date ? null : date;
      rerender();
    },
    openEntries: (project) => onOpenEntries && onOpenEntries(project),
    addForDate: (date) => onAddForDate && onAddForDate(date),
  };

  container.replaceChildren(
    buildNav(week, ctx),
    buildChart(week, ctx),
    buildLegend(week),
    buildDetail(week, ctx)
  );
}
