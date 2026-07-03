import { NextRequest, NextResponse } from "next/server";
import { asc, eq, gt, or, sql } from "drizzle-orm";

import { db, todos } from "@/lib/db";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Returns incomplete todos plus recently-completed ones. The client decides
// which completed todos are still within "today" in the user's timezone.
export async function GET() {
  const rows = await db
    .select()
    .from(todos)
    .where(
      or(
        eq(todos.completed, false),
        gt(todos.completedAt, sql`now() - interval '48 hours'`)
      )
    )
    .orderBy(sql`${todos.dueDate} ASC NULLS LAST`, asc(todos.createdAt));
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || typeof body.text !== "string") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const text = body.text.trim();
  if (!text) {
    return NextResponse.json({ error: "Todo text is empty" }, { status: 400 });
  }

  let dueDate: string | null = null;
  if (typeof body.dueDate === "string" && body.dueDate) {
    if (!DATE_RE.test(body.dueDate)) {
      return NextResponse.json({ error: "Invalid due date" }, { status: 400 });
    }
    dueDate = body.dueDate;
  }

  const [created] = await db
    .insert(todos)
    .values({ text, dueDate })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
