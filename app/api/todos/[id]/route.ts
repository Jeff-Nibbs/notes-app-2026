import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db, todos } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const updates: Partial<typeof todos.$inferInsert> = {};
  if (typeof body.text === "string" && body.text.trim()) {
    updates.text = body.text.trim();
  }
  if (body.dueDate === null) {
    updates.dueDate = null;
  } else if (typeof body.dueDate === "string" && DATE_RE.test(body.dueDate)) {
    updates.dueDate = body.dueDate;
  }
  if (typeof body.completed === "boolean") {
    updates.completed = body.completed;
    // completed_at is set when checked off, cleared on undo (spec §4).
    updates.completedAt = body.completed ? new Date() : null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const [updated] = await db
    .update(todos)
    .set(updates)
    .where(eq(todos.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}
