import { NextRequest, NextResponse } from "next/server";
import { and, arrayContains, desc, eq, ilike, or, type SQL } from "drizzle-orm";

import { db, notes } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q")?.trim();
  const tag = searchParams.get("tag")?.trim();
  const pinned = searchParams.get("pinned");

  const conditions: SQL[] = [];
  if (q) {
    const pattern = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
    conditions.push(
      or(ilike(notes.title, pattern), ilike(notes.body, pattern))!
    );
  }
  if (tag) {
    conditions.push(arrayContains(notes.tags, [tag]));
  }
  if (pinned === "true") {
    conditions.push(eq(notes.pinned, true));
  }

  const rows = await db
    .select()
    .from(notes)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(notes.updatedAt));

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title : "";
  const noteBody = typeof body.body === "string" ? body.body : "";
  const tags = Array.isArray(body.tags)
    ? body.tags.filter((t: unknown): t is string => typeof t === "string")
    : [];
  const pinned = body.pinned === true;

  if (!title.trim() && !noteBody.trim()) {
    return NextResponse.json({ error: "Note is empty" }, { status: 400 });
  }

  const [created] = await db
    .insert(notes)
    .values({ title, body: noteBody, tags, pinned })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
