// Client-facing shapes. Timestamps may be Date (RSC props) or ISO strings
// (JSON API responses), so client code normalizes with `toMs`.
export type NoteDTO = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  pinned: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type TodoDTO = {
  id: string;
  text: string;
  dueDate: string | null; // YYYY-MM-DD
  completed: boolean;
  completedAt: string | Date | null;
  createdAt: string | Date;
};
