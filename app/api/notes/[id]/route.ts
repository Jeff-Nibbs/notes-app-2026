import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db, notes } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const [note] = await db.select().from(notes).where(eq(notes.id, id));
  if (!note) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(note);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const updates: Partial<typeof notes.$inferInsert> = {};
  if (typeof body.title === "string") updates.title = body.title;
  if (typeof body.body === "string") updates.body = body.body;
  if (Array.isArray(body.tags)) {
    updates.tags = body.tags.filter(
      (t: unknown): t is string => typeof t === "string"
    );
  }
  if (typeof body.pinned === "boolean") updates.pinned = body.pinned;
  updates.updatedAt = new Date();

  const [updated] = await db
    .update(notes)
    .set(updates)
    .where(eq(notes.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  // Hard delete — no trash, no undo (spec §5.3).
  const deleted = await db.delete(notes).where(eq(notes.id, id)).returning();
  if (deleted.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
