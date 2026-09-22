import { NextRequest, NextResponse } from "next/server";
import { getWeek, saveWeek, type DaySchedule, type Todo } from "@/lib/db";
import { SCHEDULE_SLOTS } from "@/lib/week";

type Params = { params: Promise<{ weekStart: string }> };

const WEEK_START_RE = /^\d{4}-\d{2}-\d{2}$/;

function isTodo(t: unknown): t is Todo {
  if (typeof t !== "object" || t === null) return false;
  const todo = t as Record<string, unknown>;
  return (
    typeof todo.id === "string" &&
    typeof todo.categoryId === "string" &&
    typeof todo.text === "string" &&
    (todo.day === null || typeof todo.day === "number") &&
    (todo.time === null || typeof todo.time === "string") &&
    (todo.status === null || todo.status === "o" || todo.status === "triangle" || todo.status === "x")
  );
}

function isDaySchedule(d: unknown): d is DaySchedule {
  if (typeof d !== "object" || d === null) return false;
  const day = d as Record<string, unknown>;
  return (
    Array.isArray(day.slots) &&
    day.slots.length === SCHEDULE_SLOTS.length &&
    day.slots.every((s) => typeof s === "string") &&
    (day.condition === null || (typeof day.condition === "number" && day.condition >= 1 && day.condition <= 5))
  );
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { weekStart } = await params;
  if (!WEEK_START_RE.test(weekStart)) {
    return NextResponse.json({ error: "weekStart must be YYYY-MM-DD" }, { status: 400 });
  }

  const week = await getWeek(weekStart);
  return NextResponse.json(week);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { weekStart } = await params;
  if (!WEEK_START_RE.test(weekStart)) {
    return NextResponse.json({ error: "weekStart must be YYYY-MM-DD" }, { status: 400 });
  }

  const body = await request.json();
  const todos = body.todos;
  const days = body.days;

  if (!Array.isArray(todos) || !todos.every(isTodo)) {
    return NextResponse.json({ error: "invalid todos" }, { status: 400 });
  }
  if (!Array.isArray(days) || days.length !== 7 || !days.every(isDaySchedule)) {
    return NextResponse.json({ error: "invalid days" }, { status: 400 });
  }

  const week = await saveWeek(weekStart, { todos, days });
  return NextResponse.json(week);
}
