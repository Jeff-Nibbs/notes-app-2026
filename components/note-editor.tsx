"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowLeft, CheckIcon, Pin, PinOff, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { NoteDTO } from "@/lib/types";

export function NoteEditor({ note }: { note: NoteDTO | null }) {
  const router = useRouter();
  const [title, setTitle] = useState(note?.title ?? "");
  const [body, setBody] = useState(note?.body ?? "");
  const [tags, setTags] = useState<string[]>(note?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [pinned, setPinned] = useState(note?.pinned ?? false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function flashSaved() {
    setSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 1500);
  }

  function commitTagInput(current: string[]): string[] {
    const pending = tagInput.trim().replace(/,+$/, "");
    setTagInput("");
    if (!pending || current.includes(pending)) return current;
    const next = [...current, pending];
    setTags(next);
    return next;
  }

  function addTagFromInput() {
    commitTagInput(tags);
  }

  async function handleSave() {
    if (saving) return;
    const finalTags = commitTagInput(tags);
    setSaving(true);
    setError(null);
    try {
      const payload = { title, body, tags: finalTags, pinned };
      if (note) {
        const res = await fetch(`/api/notes/${note.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
        flashSaved();
      } else {
        const res = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? "Could not save");
        }
        const created = (await res.json()) as NoteDTO;
        router.replace(`/notes/${created.id}`);
      }
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  function togglePin() {
    const next = !pinned;
    setPinned(next);
    if (note) {
      // Optimistic pin toggle straight from the editor (spec §6).
      fetch(`/api/notes/${note.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: next }),
      }).catch(() => setPinned(!next));
    }
  }

  async function handleDelete() {
    if (!note || deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/notes/${note.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.push("/notes");
      router.refresh();
    } catch {
      setDeleting(false);
      setError("Could not delete");
      setConfirmOpen(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="icon" asChild aria-label="All notes">
          <Link href="/notes">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div className="flex items-center gap-1.5">
          <span
            aria-live="polite"
            className={cn(
              "flex items-center gap-1 text-sm font-medium text-primary transition-opacity duration-300",
              saved ? "opacity-100" : "opacity-0"
            )}
          >
            <CheckIcon className="size-4" />
            Saved
          </span>
          <Button
            variant={pinned ? "secondary" : "ghost"}
            size="icon"
            onClick={togglePin}
            aria-label={pinned ? "Unpin note" : "Pin note"}
            aria-pressed={pinned}
          >
            {pinned ? (
              <Pin className="size-5 text-primary" />
            ) : (
              <PinOff className="size-5 text-muted-foreground" />
            )}
          </Button>
          {note && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setConfirmOpen(true)}
              aria-label="Delete note"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="size-5" />
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (optional)"
        aria-label="Note title"
        className="border-none bg-transparent px-1 text-lg font-semibold shadow-none focus-visible:ring-0"
      />

      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write your note…"
        aria-label="Note body"
        className="min-h-[50vh] resize-y border-none bg-transparent px-1 shadow-none focus-visible:ring-0"
      />

      <div className="space-y-2 border-t pt-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 pr-1">
              {tag}
              <button
                type="button"
                onClick={() => setTags(tags.filter((t) => t !== tag))}
                aria-label={`Remove tag ${tag}`}
                className="rounded-full p-0.5 hover:bg-foreground/10"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
          <Input
            value={tagInput}
            onChange={(e) => {
              const value = e.target.value;
              if (value.endsWith(",")) {
                setTagInput(value.slice(0, -1));
                addTagFromInput();
              } else {
                setTagInput(value);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTagFromInput();
              }
            }}
            onBlur={addTagFromInput}
            placeholder={tags.length === 0 ? "Add tags…" : "Add tag"}
            aria-label="Add tag"
            className="h-8 w-28 flex-1 border-none bg-transparent px-1 text-sm shadow-none focus-visible:ring-0"
          />
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this note?</DialogTitle>
            <DialogDescription>This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
