import { NextRequest, NextResponse } from "next/server";
import { updateTodo, deleteTodo } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();

  const todo = await updateTodo(Number(id), Boolean(body.done));
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
