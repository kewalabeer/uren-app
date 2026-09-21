export function uuid() {
  return crypto.randomUUID();
}

export function todayStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isThisMonth(dateStr) {
  const today = new Date();
  const [y, m] = dateStr.split('-').map(Number);
  return y === today.getFullYear() && m === today.getMonth() + 1;
}

export function isToday(dateStr) {
  return dateStr === todayStr();
}

// ISO week: Monday through Sunday.
export function isThisWeek(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);

  const now = new Date();
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffToMonday = (startOfWeek.getDay() + 6) % 7;
  startOfWeek.setDate(startOfWeek.getDate() - diffToMonday);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  return date >= startOfWeek && date < endOfWeek;
}

// hours+minutes -> decimal hours
export function hmToDecimal(hours, minutes) {
  return (Number(hours) || 0) + (Number(minutes) || 0) / 60;
}

// decimal hours -> "Xu Ym" for display
export function decimalToHm(decimalHours) {
  const totalMinutes = Math.round(decimalHours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}u`;
  return `${h}u ${m}m`;
}

// elapsed ms -> "H:MM" live timer display
export function formatElapsed(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

// ---- date helpers for the week view (all dates are local 'YYYY-MM-DD' strings) ----

const DAY_LONG = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
const MONTH_SHORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const MONTH_LONG = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
];
export const DAY_SHORT = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];

export function dateToStr(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDateStr(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(dateStr, n) {
  const d = parseDateStr(dateStr);
  d.setDate(d.getDate() + n);
  return dateToStr(d);
}

// Monday of the ISO week containing dateStr.
export function startOfWeek(dateStr) {
  const d = parseDateStr(dateStr);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return dateToStr(d);
}

export function isoWeekNumber(dateStr) {
  const d = parseDateStr(dateStr);
  // The Thursday of a week decides which ISO year (and so which week 1) it belongs to.
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

// "woensdag 16 september"
export function formatDayLong(dateStr) {
  const d = parseDateStr(dateStr);
  return `${DAY_LONG[(d.getDay() + 6) % 7]} ${d.getDate()} ${MONTH_LONG[d.getMonth()]}`;
}

// "14 – 20 sep", "28 sep – 4 okt", with the year appended when it isn't the current one
export function formatWeekRange(mondayStr) {
  const from = parseDateStr(mondayStr);
  const to = parseDateStr(addDays(mondayStr, 6));
  const fromPart = from.getMonth() === to.getMonth()
    ? String(from.getDate())
    : `${from.getDate()} ${MONTH_SHORT[from.getMonth()]}`;
  const year = to.getFullYear() === new Date().getFullYear() ? '' : ` ${to.getFullYear()}`;
  return `${fromPart} – ${to.getDate()} ${MONTH_SHORT[to.getMonth()]}${year}`;
}
