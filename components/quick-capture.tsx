"use client";

import { FormEvent, useRef, useState } from "react";
import { CalendarIcon, CheckIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TodoDTO } from "@/lib/types";

type Mode = "note" | "todo";

export function QuickCapture({
  onTodoCreated,
}: {
  onTodoCreated: (todo: TodoDTO) => void;
}) {
  const [mode, setMode] = useState<Mode>("note");
  const [text, setText] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [showDate, setShowDate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function flashSaved() {
    setSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 1500);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      if (mode === "note") {
        const res = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: trimmed }),
        });
        if (!res.ok) throw new Error();
      } else {
        const res = await fetch("/api/todos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: trimmed, dueDate: dueDate || null }),
        });
        if (!res.ok) throw new Error();
        onTodoCreated(await res.json());
      }
      setText("");
      setDueDate("");
      setShowDate(false);
      flashSaved();
    } catch {
      // Keep the text so nothing is lost; the user can retry.
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <div
            className="flex rounded-full border border-border p-0.5"
            role="tablist"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "note"}
              onClick={() => setMode("note")}
              className={cn(
                "u-label flex h-8 items-center rounded-full px-4 transition-colors",
                mode === "note"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Note
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "todo"}
              onClick={() => setMode("todo")}
              className={cn(
                "u-label flex h-8 items-center rounded-full px-4 transition-colors",
                mode === "todo"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Todo
            </button>
          </div>
          <span
            aria-live="polite"
            className={cn(
              "u-label flex items-center gap-1.5 text-primary transition-opacity duration-300",
              saved ? "opacity-100" : "opacity-0"
            )}
          >
            <CheckIcon className="size-3.5" />
            Saved
          </span>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                mode === "note" ? "jot down a note…" : "add a todo…"
              }
              aria-label={mode === "note" ? "New note" : "New todo"}
              enterKeyHint="done"
            />
            {mode === "todo" && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Set due date"
                onClick={() => setShowDate((v) => !v)}
                className={cn(dueDate && "border-primary text-primary")}
              >
                <CalendarIcon className="size-4" />
              </Button>
            )}
            <Button type="submit" disabled={!text.trim() || saving}>
              Save
            </Button>
          </div>
          {mode === "todo" && showDate && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                aria-label="Due date"
                className="w-auto"
              />
              {dueDate && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDueDate("")}
                >
                  Clear
                </Button>
              )}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
