import { asc, desc, eq, gt, or, sql } from "drizzle-orm";

import { Dashboard } from "@/components/dashboard";
import { db, notes, todos } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [pinnedNotes, todoRows] = await Promise.all([
    db
      .select()
      .from(notes)
      .where(eq(notes.pinned, true))
      .orderBy(desc(notes.updatedAt)),
    db
      .select()
      .from(todos)
      .where(
        or(
          eq(todos.completed, false),
          gt(todos.completedAt, sql`now() - interval '48 hours'`)
        )
      )
      .orderBy(sql`${todos.dueDate} ASC NULLS LAST`, asc(todos.createdAt)),
  ]);

  return <Dashboard pinnedNotes={pinnedNotes} initialTodos={todoRows} />;
}
