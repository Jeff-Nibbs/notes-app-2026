import { desc } from "drizzle-orm";

import { NotesBrowser } from "@/components/notes-browser";
import { db, notes } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const rows = await db.select().from(notes).orderBy(desc(notes.updatedAt));
  return <NotesBrowser initialNotes={rows} />;
}
