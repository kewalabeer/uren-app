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
