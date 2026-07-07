import Link from "next/link";
import { Pin } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { NoteDTO } from "@/lib/types";

export function PinnedNotesPanel({ notes }: { notes: NoteDTO[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="u-label flex items-center gap-2 font-normal text-muted-foreground">
          <Pin className="size-3.5 text-primary" />
          Pinned
        </CardTitle>
      </CardHeader>
      <CardContent>
        {notes.length === 0 ? (
          <p className="py-6 text-center text-sm lowercase text-muted-foreground">
            nothing pinned yet. open a note and tap the pin to keep it here.
          </p>
        ) : (
          <ul className="grid gap-2">
            {notes.map((note) => (
              <li key={note.id}>
                <Link
                  href={`/notes/${note.id}`}
                  className="block rounded-lg border border-border/70 bg-background/50 p-3 transition-colors hover:border-primary/50 active:bg-accent"
                >
                  {note.title && (
                    <div className="font-display mb-1 truncate text-lg leading-snug">
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
