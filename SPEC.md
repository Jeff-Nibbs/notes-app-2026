# Build Spec: Personal Dashboard Notes App

A single-user, dashboard-style notes app, hosted on a public URL and used
primarily from a phone. This document is the complete requirements spec —
build exactly what is described here; where something is unspecified, prefer
the simplest option consistent with the decisions below.

## 1. Overview

- **User count:** exactly one (the owner). No signup, no multi-user concepts.
- **Primary device:** phone browser. The app is a **mobile-first PWA**
  (installable to the home screen), but must remain fully usable and
  pleasant on desktop.
- **Connectivity:** online-only. No offline caching, no sync queue, no
  service-worker data layer (a minimal service worker for PWA
  installability is fine).

## 2. Tech stack & hosting

| Concern   | Decision |
|-----------|----------|
| Framework | Next.js (App Router) — one codebase for UI + API routes |
| Styling   | Tailwind CSS + shadcn/ui components |
| Database  | Hosted Postgres on the Neon free tier |
| Hosting   | Vercel free tier |
| PWA       | Web app manifest + icons so it installs to a phone home screen |

Provide a `.env.example` documenting all required environment variables
(`DATABASE_URL`, `APP_PASSWORD`, session secret, etc.) and a README section
covering: creating the Neon database, running migrations, local dev, and
deploying to Vercel.

## 3. Authentication

- **Single shared password**, set via the `APP_PASSWORD` environment
  variable. No user table, no registration, no password reset flow.
- Login page: one password field. On success, set a **long-lived signed
  session cookie** (httpOnly, secure, e.g. 90+ days) so each device stays
  signed in after one login.
- Every page and API route except the login screen requires the session;
  unauthenticated requests redirect to login (pages) or return 401 (API).
- Rate-limit or add a small delay to failed login attempts.

## 4. Data model

### Note
- `id`
- `title` (optional, may be empty)
- `body` — **plain text only**. No markdown rendering, no rich text.
  Preserve line breaks.
- `tags` — zero or more free-form text tags
- `pinned` — boolean
- `created_at`, `updated_at`

### Todo
- `id`
- `text`
- `due_date` — optional date (no time of day)
- `completed` — boolean
- `completed_at` — timestamp, set when checked off
- `created_at`

Todos and notes are **separate entities** — a todo is not a kind of note.

## 5. Screens

### 5.1 Dashboard (home, `/`)
The main screen. A widget/panel layout containing, top to bottom on mobile
(side-by-side panels are fine on wider screens):

1. **Quick capture box** — always visible at the top. A text input with a
   **Note / Todo toggle**:
   - *Note* mode: saves instantly as an untagged, unpinned note.
   - *Todo* mode: adds a todo (optionally allow picking a due date inline;
     due date may also be added later by editing).
   - Saving clears the box and gives brief visual confirmation. No page
     navigation required.
2. **Pinned notes panel** — cards for every pinned note; tap to open/edit.
   Empty state with a short hint when nothing is pinned.
3. **Todo widget** —
   - List of incomplete todos; those with due dates sorted soonest-first,
     **overdue items visually highlighted** (e.g. red date badge).
   - Checkbox to complete. On check: item gets strikethrough, **fades, and
     auto-clears** — it remains visible (struck through) until end of the
     current day, then disappears from the widget. The brief visible window
     doubles as the undo affordance (unchecking restores it).
   - Inline add input at the bottom of the widget.

There is **no recent-notes panel** — deliberately excluded.

### 5.2 All Notes page (`/notes`)
- Lists all notes (newest-updated first).
- **Search bar** — full-text search over title + body.
- **Tag filter** — tap a tag to filter; show the set of existing tags.
- Tap a note to open it for viewing/editing.

### 5.3 Note editor
- Edit title, body (plain textarea), tags; toggle pin.
- **Delete = hard delete**: a confirm dialog ("Delete this note? This
  cannot be undone."), then the note is permanently removed. No trash, no
  undo toast. This is a deliberate decision.

### 5.4 Login page
As described in §3.

Navigation between Dashboard and All Notes must be one tap (e.g. a simple
top bar or bottom nav).

## 6. Look & feel

- **Auto theme:** follow the device's system light/dark preference
  (`prefers-color-scheme`). Both themes must be fully styled.
- Clean, modern dashboard aesthetic; large tap targets; comfortable on a
  ~390px-wide phone screen with no horizontal scrolling.
- Fast perceived interactions: optimistic UI for quick capture, todo
  check-off, and pin toggles is encouraged.

## 7. Explicit non-goals

Do **not** build: multi-user support, markdown/rich text, folders,
offline mode, trash/undo for notes, note colors, reminders/notifications,
attachments, or a recent-notes widget.

## 8. Acceptance checklist

- [ ] Installs as a PWA on a phone; usable one-handed at mobile widths
- [ ] Password login persists across visits on the same device
- [ ] Quick capture creates a note or a todo per the toggle, without leaving the dashboard
- [ ] Pinned notes appear on the dashboard; pin/unpin works from the editor
- [ ] Todos support optional due dates; overdue items are highlighted
- [ ] Completed todos show struck-through, then auto-clear after the day ends
- [ ] All Notes page supports text search and tag filtering
- [ ] Note delete asks for confirmation and permanently removes the note
- [ ] Theme follows the system light/dark setting
- [ ] Deploys to Vercel with Neon Postgres using only documented env vars
