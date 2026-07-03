import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { NoteEditor } from "@/components/note-editor";
import { db, notes } from "@/lib/db";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function NotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const [note] = await db.select().from(notes).where(eq(notes.id, id));
  if (!note) notFound();

  return <NoteEditor note={note} />;
}
