import Link from "next/link";
import { Pin } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { NoteDTO } from "@/lib/types";

export function PinnedNotesPanel({ notes }: { notes: NoteDTO[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Pin className="size-4 text-primary" />
          Pinned notes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {notes.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nothing pinned yet. Open a note and tap the pin to keep it here.
          </p>
        ) : (
          <ul className="grid gap-2">
            {notes.map((note) => (
              <li key={note.id}>
                <Link
                  href={`/notes/${note.id}`}
                  className="block rounded-lg border bg-background p-3 transition-colors hover:bg-accent/50 active:bg-accent"
                >
                  {note.title && (
                    <div className="mb-0.5 truncate font-medium">
                      {note.title}
                    </div>
                  )}
                  {note.body && (
                    <p className="line-clamp-3 whitespace-pre-line text-sm text-muted-foreground">
                      {note.body}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
