"use client";

import { useState } from "react";

import { PinnedNotesPanel } from "@/components/pinned-notes";
import { QuickCapture } from "@/components/quick-capture";
import { TodoWidget } from "@/components/todo-widget";
import type { NoteDTO, TodoDTO } from "@/lib/types";

export function Dashboard({
  pinnedNotes,
  initialTodos,
}: {
  pinnedNotes: NoteDTO[];
  initialTodos: TodoDTO[];
}) {
  const [todos, setTodos] = useState<TodoDTO[]>(initialTodos);

  return (
    <div className="space-y-5">
      <QuickCapture
        onTodoCreated={(todo) => setTodos((prev) => [...prev, todo])}
      />
      <div className="grid gap-5 md:grid-cols-2 md:items-start">
        <PinnedNotesPanel notes={pinnedNotes} />
        <TodoWidget todos={todos} setTodos={setTodos} />
      </div>
    </div>
  );
}
