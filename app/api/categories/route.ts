import { NextRequest, NextResponse } from "next/server";
import { getCategories, saveCategories, type Category } from "@/lib/db";

function isCategory(c: unknown): c is Category {
  if (typeof c !== "object" || c === null) return false;
  const cat = c as Record<string, unknown>;
  return typeof cat.id === "string" && typeof cat.name === "string" && typeof cat.order === "number";
}

export async function GET() {
  const categories = await getCategories();
  return NextResponse.json(categories);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const categories = body.categories;

  if (!Array.isArray(categories) || !categories.every(isCategory)) {
    return NextResponse.json({ error: "invalid categories" }, { status: 400 });
  }

  const saved = await saveCategories(categories);
  return NextResponse.json(saved);
}
