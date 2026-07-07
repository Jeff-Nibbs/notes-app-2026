"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarIcon, ListTodo, Pencil, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  formatDueDate,
  isOverdue,
  startOfTodayMs,
  toMs,
} from "@/lib/dates";
import type { TodoDTO } from "@/lib/types";

function sortIncomplete(a: TodoDTO, b: TodoDTO): number {
  // Due dates soonest-first, undated last, then oldest-first (spec §5.1).
  if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate)
    return a.dueDate < b.dueDate ? -1 : 1;
  if (a.dueDate && !b.dueDate) return -1;
  if (!a.dueDate && b.dueDate) return 1;
  return (toMs(a.createdAt) ?? 0) - (toMs(b.createdAt) ?? 0);
}

export function TodoWidget({
  todos,
  setTodos,
}: {
  todos: TodoDTO[];
  setTodos: React.Dispatch<React.SetStateAction<TodoDTO[]>>;
}) {
  const [newText, setNewText] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  // Ticks every minute so completed items auto-clear when the day rolls over.
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  const todayStart = startOfTodayMs();
  const { incomplete, completedToday } = useMemo(() => {
    const incomplete = todos.filter((t) => !t.completed).sort(sortIncomplete);
    const completedToday = todos
      .filter((t) => {
        if (!t.completed) return false;
        const ms = toMs(t.completedAt);
        return ms !== null && ms >= todayStart;
      })
      .sort((a, b) => (toMs(a.completedAt) ?? 0) - (toMs(b.completedAt) ?? 0));
    return { incomplete, completedToday };
  }, [todos, todayStart]);

  async function patchTodo(id: string, patch: Record<string, unknown>) {
    const res = await fetch(`/api/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error();
    return (await res.json()) as TodoDTO;
  }

  function toggleCompleted(todo: TodoDTO, completed: boolean) {
    const previous = todos;
    // Optimistic: strike through / restore immediately (spec §6).
    setTodos((prev) =>
      prev.map((t) =>
        t.id === todo.id
          ? { ...t, completed, completedAt: completed ? new Date() : null }
          : t
      )
    );
    patchTodo(todo.id, { completed }).catch(() => setTodos(previous));
  }

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    const text = newText.trim();
    if (!text || adding) return;
    setAdding(true);
    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error();
      const created = (await res.json()) as TodoDTO;
      setTodos((prev) => [...prev, created]);
      setNewText("");
    } catch {
      // Keep the text so nothing is lost.
    } finally {
      setAdding(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="u-label flex items-center gap-2 font-normal text-muted-foreground">
          <ListTodo className="size-3.5 text-primary" />
          Todos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {incomplete.length === 0 && completedToday.length === 0 ? (
          <p className="py-4 text-center text-sm lowercase text-muted-foreground">
            no todos yet. add one below.
          </p>
        ) : (
          <ul className="space-y-1">
            {incomplete.map((todo) => (
              <TodoRow
                key={todo.id}
                todo={todo}
                editing={editingId === todo.id}
                onToggleEdit={() =>
                  setEditingId((id) => (id === todo.id ? null : todo.id))
                }
                onToggleCompleted={(checked) => toggleCompleted(todo, checked)}
                onSaveEdit={async (patch) => {
                  const updated = await patchTodo(todo.id, patch);
                  setTodos((prev) =>
                    prev.map((t) => (t.id === todo.id ? updated : t))
                  );
                  setEditingId(null);
                }}
              />
            ))}
            {completedToday.map((todo) => (
              <li
                key={todo.id}
                className="flex min-h-11 items-center gap-3 rounded-lg px-2 py-1.5 opacity-50 transition-opacity duration-500"
              >
                <Checkbox
                  checked
                  aria-label={`Mark "${todo.text}" as not done`}
                  onCheckedChange={() => toggleCompleted(todo, false)}
                />
                <span className="min-w-0 flex-1 text-sm line-through">
                  {todo.text}
                </span>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={handleAdd} className="flex gap-2 border-t pt-3">
          <Input
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="add a todo…"
            aria-label="Add a todo"
            enterKeyHint="done"
          />
          <Button
            type="submit"
            size="icon"
            aria-label="Add todo"
            disabled={!newText.trim() || adding}
          >
            <Plus className="size-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function TodoRow({
  todo,
  editing,
  onToggleEdit,
  onToggleCompleted,
  onSaveEdit,
}: {
  todo: TodoDTO;
  editing: boolean;
  onToggleEdit: () => void;
  onToggleCompleted: (checked: boolean) => void;
  onSaveEdit: (patch: {
    text?: string;
    dueDate?: string | null;
  }) => Promise<void>;
}) {
  const overdue = todo.dueDate ? isOverdue(todo.dueDate) : false;

  return (
    <li className="rounded-lg transition-colors hover:bg-accent/40">
      <div className="flex min-h-11 items-center gap-3 px-2 py-1.5">
        <Checkbox
          checked={false}
          aria-label={`Mark "${todo.text}" as done`}
          onCheckedChange={(checked) => onToggleCompleted(checked === true)}
        />
        <span className="min-w-0 flex-1 text-sm">{todo.text}</span>
        {todo.dueDate && (
          <Badge variant={overdue ? "destructive" : "secondary"}>
            <CalendarIcon className="size-3" />
            {formatDueDate(todo.dueDate)}
          </Badge>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground"
          aria-label={`Edit "${todo.text}"`}
          onClick={onToggleEdit}
        >
          <Pencil className="size-3.5" />
        </Button>
      </div>
      {editing && <TodoEditForm todo={todo} onSave={onSaveEdit} />}
    </li>
  );
}

// Mounted only while editing, so its state starts fresh from the todo.
function TodoEditForm({
  todo,
  onSave,
}: {
  todo: TodoDTO;
  onSave: (patch: { text?: string; dueDate?: string | null }) => Promise<void>;
}) {
  const [text, setText] = useState(todo.text);
  const [dueDate, setDueDate] = useState(todo.dueDate ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await onSave({
        text: text.trim() || todo.text,
        dueDate: dueDate || null,
      });
    } catch {
      // leave the editor open so the user can retry
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSave}
      className="flex flex-wrap items-center gap-2 px-2 pb-2 pl-10"
    >
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="Todo text"
        className="h-9 min-w-40 flex-1"
      />
      <Input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        aria-label="Due date"
        className="h-9 w-auto"
      />
      <div className="flex gap-1">
        {dueDate && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDueDate("")}
          >
            No date
          </Button>
        )}
        <Button type="submit" size="sm" disabled={saving}>
          Save
        </Button>
      </div>
    </form>
  );
}
