import { promises as fs } from "fs";
import path from "path";
import { Redis } from "@upstash/redis";
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

const DEFAULT_CATEGORIES = ["학교", "취준", "개인"];

function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
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

// Vercel's Upstash Redis integration injects KV_REST_API_URL/TOKEN; the
// @upstash/redis package's own env vars are UPSTASH_REDIS_REST_URL/TOKEN.
// Checking both means it works whether the project was wired up through the
// Vercel Marketplace or by pointing at Upstash directly.
const REDIS_URL = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = REDIS_URL && REDIS_TOKEN ? new Redis({ url: REDIS_URL, token: REDIS_TOKEN }) : null;

// Redis in production (persists across deploys/instances); local JSON files
// in dev, so `npm run dev` needs no cloud account. Each "blob" is one key/file
// holding a whole JSON value, matching how this app already reads/writes
// weeks, categories, and events as single documents rather than rows.
async function readBlob<T>(key: string, fileName: string, fallback: T): Promise<T> {
  if (redis) {
    const value = await redis.get<T>(key);
    return value ?? fallback;
  }
  const filePath = path.join(process.cwd(), "data", fileName);
  try {
    await fs.access(filePath);
  } catch {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(fallback, null, 2), "utf-8");
  }
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

async function writeBlob<T>(key: string, fileName: string, value: T): Promise<void> {
  if (redis) {
    await redis.set(key, value);
    return;
  }
  const filePath = path.join(process.cwd(), "data", fileName);
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf-8");
}

async function readWeeks(): Promise<Week[]> {
  return readBlob<Week[]>("weeks", "weeks.json", []);
}

async function writeWeeks(weeks: Week[]): Promise<void> {
  await writeBlob("weeks", "weeks.json", weeks);
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

// Categories are shared across all weeks, so a new one keeps showing up every week going forward.
export async function getCategories(): Promise<Category[]> {
  return readBlob<Category[]>("categories", "categories.json", defaultCategories());
}

export async function saveCategories(categories: Category[]): Promise<Category[]> {
  await writeBlob("categories", "categories.json", categories);
  return categories;
}

export async function getEvents(): Promise<ScheduleEvent[]> {
  return readBlob<ScheduleEvent[]>("events", "events.json", []);
}

export async function saveEvents(events: ScheduleEvent[]): Promise<ScheduleEvent[]> {
  await writeBlob("events", "events.json", events);
  return events;
}
