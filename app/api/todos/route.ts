import { NextRequest, NextResponse } from "next/server";
import { getTodos, addTodo } from "@/lib/db";

export async function GET() {
  const todos = await getTodos();
  return NextResponse.json(todos);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const title = typeof body.title === "string" ? body.title.trim() : "";

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const todo = await addTodo(title);
  return NextResponse.json(todo, { status: 201 });
}
