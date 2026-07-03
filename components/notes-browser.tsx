"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pin, Plus, SearchIcon, Tag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { NoteDTO } from "@/lib/types";

export function NotesBrowser({ initialNotes }: { initialNotes: NoteDTO[] }) {
  const [q, setQ] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [results, setResults] = useState<NoteDTO[]>(initialNotes);
  const [searching, setSearching] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    for (const note of initialNotes) for (const t of note.tags) tags.add(t);
    return [...tags].sort((a, b) => a.localeCompare(b));
  }, [initialNotes]);

  const filtering = Boolean(q.trim() || activeTag);

  useEffect(() => {
    if (!filtering) {
      abortRef.current?.abort();
      return;
    }
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setSearching(true);
      try {
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        if (activeTag) params.set("tag", activeTag);
        const res = await fetch(`/api/notes?${params}`, {
          signal: controller.signal,
        });
        if (res.ok) setResults(await res.json());
      } catch {
        // aborted or offline — keep previous results
      } finally {
        if (abortRef.current === controller) setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [q, activeTag, filtering]);

  const shown = filtering ? results : initialNotes;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search notes…"
            aria-label="Search notes"
            className="pl-9"
          />
        </div>
        <Button asChild>
          <Link href="/notes/new">
            <Plus className="size-4" />
            New
          </Link>
        </Button>
      </div>

      {allTags.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setActiveTag((t) => (t === tag ? null : tag))}
              className="shrink-0"
              aria-pressed={activeTag === tag}
            >
              <Badge
                variant={activeTag === tag ? "default" : "secondary"}
                className="h-7 cursor-pointer px-3"
              >
                <Tag className="size-3" />
                {tag}
              </Badge>
            </button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {initialNotes.length === 0
            ? "No notes yet. Capture one from the dashboard or tap New."
            : "No notes match."}
        </p>
      ) : (
        <ul className={cn("grid gap-2", searching && "opacity-70")}>
          {shown.map((note) => (
            <li key={note.id}>
              <Link
                href={`/notes/${note.id}`}
                className="block rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-accent/50 active:bg-accent"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {note.title ? (
                      <div className="mb-0.5 truncate font-medium">
                        {note.title}
                      </div>
                    ) : null}
                    {note.body ? (
                      <p className="line-clamp-2 whitespace-pre-line text-sm text-muted-foreground">
                        {note.body}
                      </p>
                    ) : (
                      !note.title && (
                        <p className="text-sm italic text-muted-foreground">
                          Empty note
                        </p>
                      )
                    )}
                  </div>
                  {note.pinned && (
                    <Pin className="mt-0.5 size-4 shrink-0 text-primary" />
                  )}
                </div>
                {note.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {note.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="text-muted-foreground"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
