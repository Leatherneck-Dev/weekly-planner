import { promises as fs } from "fs";
import path from "path";
import { SCHEDULE_SLOTS } from "@/lib/week";

export type Category = {
  id: string;
  name: string;
  order: number;
};

export type Todo = {
  id: string;
  categoryId: string;
  text: string;
  day: number | null; // 0=Mon .. 6=Sun, null = unassigned
  time: string | null; // "HH:MM", only meaningful when day is set
  status: "o" | "triangle" | "x" | null; // performance evaluation, only meaningful when day is set
};

export type DaySchedule = {
  slots: string[]; // free text per SCHEDULE_SLOTS entry, same length/order
  condition: number | null; // 1 (나쁨) .. 5 (좋음)
};

// A schedule item pinned to real calendar dates rather than a specific week,
// since some events (e.g. a trip or a break) run longer than one week.
export type ScheduleEvent = {
  id: string;
  label: string;
  startDate: string; // "YYYY-MM-DD", inclusive
  endDate: string; // "YYYY-MM-DD", inclusive, >= startDate
};

export type Week = {
  weekStart: string; // Monday, "YYYY-MM-DD"
  todos: Todo[];
  days: DaySchedule[]; // length 7, index 0=Mon .. 6=Sun
};

const DB_PATH = path.join(process.cwd(), "data", "weeks.json");
const EVENTS_DB_PATH = path.join(process.cwd(), "data", "events.json");
const CATEGORIES_DB_PATH = path.join(process.cwd(), "data", "categories.json");

const DEFAULT_CATEGORIES = ["학교", "취준", "개인"];

function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function ensureDbFile() {
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    await fs.writeFile(DB_PATH, "[]", "utf-8");
  }
}

async function readWeeks(): Promise<Week[]> {
  await ensureDbFile();
  const raw = await fs.readFile(DB_PATH, "utf-8");
  return JSON.parse(raw) as Week[];
}

async function writeWeeks(weeks: Week[]) {
  await fs.writeFile(DB_PATH, JSON.stringify(weeks, null, 2), "utf-8");
}

function defaultCategories(): Category[] {
  return DEFAULT_CATEGORIES.map((name, i) => ({ id: makeId(), name, order: i }));
}

function defaultDays(): DaySchedule[] {
  return Array.from({ length: 7 }, () => ({
    slots: SCHEDULE_SLOTS.map(() => ""),
    condition: null,
  }));
}

export async function getWeek(weekStart: string): Promise<Week> {
  const weeks = await readWeeks();
  const existing = weeks.find((w) => w.weekStart === weekStart);
  if (existing) return existing;

  const week: Week = { weekStart, todos: [], days: defaultDays() };
  weeks.push(week);
  await writeWeeks(weeks);
  return week;
}

export async function saveWeek(
  weekStart: string,
  data: { todos: Todo[]; days: DaySchedule[] }
): Promise<Week> {
  const weeks = await readWeeks();
  const idx = weeks.findIndex((w) => w.weekStart === weekStart);
  const week: Week = {
    weekStart,
    todos: data.todos,
    days: data.days,
  };
  if (idx === -1) {
    weeks.push(week);
  } else {
    weeks[idx] = week;
  }
  await writeWeeks(weeks);
  return week;
}

async function ensureCategoriesDbFile() {
  try {
    await fs.access(CATEGORIES_DB_PATH);
  } catch {
    await fs.mkdir(path.dirname(CATEGORIES_DB_PATH), { recursive: true });
    await fs.writeFile(CATEGORIES_DB_PATH, JSON.stringify(defaultCategories(), null, 2), "utf-8");
  }
}

// Categories are shared across all weeks, so a new one keeps showing up every week going forward.
export async function getCategories(): Promise<Category[]> {
  await ensureCategoriesDbFile();
  const raw = await fs.readFile(CATEGORIES_DB_PATH, "utf-8");
  return JSON.parse(raw) as Category[];
}

export async function saveCategories(categories: Category[]): Promise<Category[]> {
  await fs.writeFile(CATEGORIES_DB_PATH, JSON.stringify(categories, null, 2), "utf-8");
  return categories;
}

async function ensureEventsDbFile() {
  try {
    await fs.access(EVENTS_DB_PATH);
  } catch {
    await fs.mkdir(path.dirname(EVENTS_DB_PATH), { recursive: true });
    await fs.writeFile(EVENTS_DB_PATH, "[]", "utf-8");
  }
}

export async function getEvents(): Promise<ScheduleEvent[]> {
  await ensureEventsDbFile();
  const raw = await fs.readFile(EVENTS_DB_PATH, "utf-8");
  return JSON.parse(raw) as ScheduleEvent[];
}

export async function saveEvents(events: ScheduleEvent[]): Promise<ScheduleEvent[]> {
  await fs.writeFile(EVENTS_DB_PATH, JSON.stringify(events, null, 2), "utf-8");
  return events;
}
