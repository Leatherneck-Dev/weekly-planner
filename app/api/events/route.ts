import { NextRequest, NextResponse } from "next/server";
import { getEvents, saveEvents, type ScheduleEvent } from "@/lib/db";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isScheduleEvent(e: unknown): e is ScheduleEvent {
  if (typeof e !== "object" || e === null) return false;
  const event = e as Record<string, unknown>;
  return (
    typeof event.id === "string" &&
    typeof event.label === "string" &&
    typeof event.startDate === "string" &&
    typeof event.endDate === "string" &&
    DATE_RE.test(event.startDate) &&
    DATE_RE.test(event.endDate) &&
    event.endDate >= event.startDate
  );
}

export async function GET() {
  const events = await getEvents();
  return NextResponse.json(events);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const events = body.events;

  if (!Array.isArray(events) || !events.every(isScheduleEvent)) {
    return NextResponse.json({ error: "invalid events" }, { status: 400 });
  }

  const saved = await saveEvents(events);
  return NextResponse.json(saved);
}
