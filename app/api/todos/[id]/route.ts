import { NextRequest, NextResponse } from "next/server";
import { updateTodo, deleteTodo } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();

  const updates: { title?: string; done?: boolean } = {};
  if (typeof body.title === "string") {
    const trimmed = body.title.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "title cannot be empty" }, { status: 400 });
    }
    updates.title = trimmed;
  }
  if (typeof body.done === "boolean") {
    updates.done = body.done;
  }

  const todo = await updateTodo(Number(id), updates);
  if (!todo) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json(todo);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  await deleteTodo(Number(id));
  return NextResponse.json({ ok: true });
}
