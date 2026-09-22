export const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

export const SCHEDULE_SLOTS = [
  "기상",
  "오전1",
  "오전2",
  "오후1",
  "오후2",
  "오후3",
  "저녁1",
  "저녁2",
  "저녁3",
  "취침",
];

// slot indices where a new group (기상/오전/오후/저녁/취침) begins, so a
// divider can be drawn above them (index 0 is the first item, no divider needed).
export const SCHEDULE_GROUP_STARTS = new Set([1, 3, 6, 9]);

// 기상/취침 are picked from a fixed 24h, 30-minute-interval list rather than typed freely.
export const HALF_HOUR_TIMES: string[] = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2)
    .toString()
    .padStart(2, "0");
  const minute = i % 2 === 0 ? "00" : "30";
  return `${hour}:${minute}`;
});

// Rendered left (best) to right (worst); `level` is the value persisted to disk.
export const CONDITION_LEVELS = [
  { level: 5, emoji: "😄", border: "border-emerald-500 dark:border-emerald-400" },
  { level: 4, emoji: "🙂", border: "border-lime-500 dark:border-lime-400" },
  { level: 3, emoji: "😐", border: "border-amber-500 dark:border-amber-400" },
  { level: 2, emoji: "🙁", border: "border-orange-500 dark:border-orange-400" },
  { level: 1, emoji: "😣", border: "border-red-500 dark:border-red-400" },
];

// Per-todo pass/fail evaluation, rendered left (done) to right (not done).
export const TODO_STATUS_OPTIONS: { value: "o" | "triangle" | "x"; symbol: string; className: string }[] = [
  { value: "o", symbol: "○", className: "border-blue-500 text-blue-500 dark:border-blue-400 dark:text-blue-400" },
  {
    value: "triangle",
    symbol: "△",
    className: "border-emerald-500 text-emerald-500 dark:border-emerald-400 dark:text-emerald-400",
  },
  { value: "x", symbol: "✕", className: "border-red-500 text-red-500 dark:border-red-400 dark:text-red-400" },
];

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function formatDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function getMonday(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function currentWeekStart(): string {
  return formatDate(getMonday(new Date()));
}

export function shiftWeek(weekStart: string, deltaWeeks: number): string {
  const [y, m, d] = weekStart.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + deltaWeeks * 7);
  return formatDate(date);
}

export function getWeekDates(weekStart: string): Date[] {
  const [y, m, d] = weekStart.split("-").map(Number);
  const monday = new Date(y, m - 1, d);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return date;
  });
}

export function formatWeekRange(weekStart: string): string {
  const dates = getWeekDates(weekStart);
  const start = dates[0];
  const end = dates[6];
  const startLabel = `${start.getMonth() + 1}/${start.getDate()}`;
  const endLabel = `${end.getMonth() + 1}/${end.getDate()}`;
  return `${startLabel} ~ ${endLabel}`;
}

// A week "belongs" to whichever month its Thursday falls in.
function dominantMonth(monday: Date): { year: number; month: number } {
  const thursday = new Date(monday);
  thursday.setDate(monday.getDate() + 3);
  return { year: thursday.getFullYear(), month: thursday.getMonth() + 1 };
}

export function formatMonthLabel(weekStart: string): string {
  const { year, month } = dominantMonth(parseDate(weekStart));
  return `${year}년 ${month}월`;
}

export function getDominantYearMonth(weekStart: string): { year: number; month: number } {
  return dominantMonth(parseDate(weekStart));
}

// All week-start Mondays (chronological order) that dominantly belong to `year`/`month` (1-12).
// A week's 1-based index in this list is that week's "N주차".
export function weeksInMonth(year: number, month: number): string[] {
  const cursor = getMonday(new Date(year, month - 1, 1));
  cursor.setDate(cursor.getDate() - 7); // start a week early to catch the month's first week
  const weeks: string[] = [];
  for (let i = 0; i < 7; i++) {
    const dominant = dominantMonth(cursor);
    if (dominant.year === year && dominant.month === month) {
      weeks.push(formatDate(cursor));
    }
    cursor.setDate(cursor.getDate() + 7);
  }
  return weeks;
}

export function weekOfMonth(weekStart: string): number {
  const { year, month } = dominantMonth(parseDate(weekStart));
  const idx = weeksInMonth(year, month).indexOf(weekStart);
  return idx === -1 ? 1 : idx + 1;
}

export function formatWeekRangeCompact(weekStart: string): string {
  const dates = getWeekDates(weekStart);
  const fmt = (d: Date) => `${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
  return `${fmt(dates[0])}~${fmt(dates[6])}`;
}

export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Number of days from `a` to `b` (positive when b is later than a).
export function diffInDays(a: string, b: string): number {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86400000);
}
