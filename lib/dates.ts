// Date helpers for the todo widget. Due dates are plain YYYY-MM-DD strings
// and all "today" logic uses the device's local timezone.

export function toMs(value: string | Date | null | undefined): number | null {
  if (value == null) return null;
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

export function localDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startOfTodayMs(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function isOverdue(dueDate: string): boolean {
  return dueDate < localDateString();
}

export function formatDueDate(dueDate: string): string {
  const today = localDateString();
  if (dueDate === today) return "Today";

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (dueDate === localDateString(tomorrow)) return "Tomorrow";

  const [y, m, d] = dueDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const sameYear = y === new Date().getFullYear();
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}
