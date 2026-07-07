# Audit & Fix Plan — notes-app-2026

*Audit date: 2026-07-05 · Audited at commit `376aed0` ("finaaal push") on `main` · working tree clean.*

This document is a complete handoff for a fixing agent. Work the tasks in order.
Every task has exact file/line references, the precise change, and an acceptance
check. **Read the "Do NOT change" section before touching anything.**

---

## 1. Current state (verified during audit)

The app is a single-user notes/todos PWA built to [SPEC.md](./SPEC.md)
(Next.js 16.2.10 App Router + Tailwind v4 + Drizzle + Postgres/Neon + Vercel).
All of the following was **verified working** on 2026-07-05:

- `npx tsc --noEmit` — clean
- `npm run lint` — clean
- `npm run build` — succeeds (all routes compile; proxy/middleware compiles)
- Runtime smoke test against `next dev`:
  - `GET /` unauthenticated → 307 to `/login` ✓
  - `GET /api/notes` unauthenticated → 401 ✓
  - `GET /manifest.webmanifest`, `/sw.js` reachable without auth ✓
  - `POST /api/login` wrong password → 401 after ~1s delay ✓
  - `POST /api/login` correct password → 200 + `session` cookie; authed `GET /`
    and `GET /api/todos` → 200 ✓
  - `GET /login` while authed → 307 to `/` ✓
- The Neon database in `.env` is **live and migrated** (`notes` and `todos`
  tables exist; contains real data: 1 note, 7 todos). Treat it as production.

So: this is not a broken build. The issues are security/config, one deleted
deliverable, and a few small correctness defects.

---

## 2. Findings summary (priority order)

| # | Priority | Finding | Where |
|---|----------|---------|-------|
| 1 | **P0** | `SESSION_SECRET` is the literal placeholder string → forgeable session cookies (full auth bypass if deployed with this value) | `.env` line 8; possibly Vercel env |
| 2 | **P0** | `APP_PASSWORD` is a 4-letter dictionary word guarding all data on a public URL | `.env` line 5; possibly Vercel env |
| 3 | **P0** | `.env.example` was deleted in commit `376aed0` — SPEC §2 requires it; README links to it and tells users to `cp` it | repo root |
| 4 | P1 | `PUT /api/notes/[id]` accepts `{}` (bumps `updatedAt`, returns 200) and allows emptying a note that `POST` would reject | `app/api/notes/[id]/route.ts:23-54` |
| 5 | P1 | Optimistic todo toggle: failure rollback restores a stale snapshot of the whole list; success response never reconciled into state | `components/todo-widget.tsx:70-81` |
| 6 | P1 | Login failure map grows unbounded (never pruned) | `app/api/login/route.ts:12,51-65` |
| 7 | P2 | Manifest `theme_color` (`#4f46e5`) inconsistent with the app's themeColor (`#fafaf9`/`#16181f`) | `app/manifest.ts:11` |
| 8 | P3 (owner approval) | Todos can never be deleted — completed rows accumulate in the DB forever; a mistaken todo can only be hidden by completing it | API + widget |
| 9 | P3 (owner approval) | ~200 files of unrelated agent tooling committed in the app repo (`.claude/skills/**` incl. `.ttf` fonts, Python scripts, a `.coverage` artifact) | `.claude/skills/` |

Non-issues that were explicitly checked and are fine — see §5.

---

## 3. Tasks

### Task 1 (P0) — Rotate secrets  *(partly owner action — do this first)*

**Problem.** `.env` (untracked, correctly gitignored, never committed — verified
via `git log --all -- .env` and `git ls-files`) currently contains:
- `SESSION_SECRET=long-random-string` — the literal placeholder. Session cookies
  are HS256 JWTs signed with this string (`lib/session.ts:7-21`). Anyone who
  guesses it can mint a valid cookie and bypass the password entirely.
- `APP_PASSWORD` — a single 4-letter dictionary word. The 1s failed-login delay
  (`app/api/login/route.ts`) is in-memory per serverless instance, resets on
  cold start, and keys on spoofable `x-forwarded-for`, so it only slows — not
  stops — online guessing.

**Fix (agent):**
1. In `.env`, replace `SESSION_SECRET` with the output of `openssl rand -hex 32`.
2. Replace `APP_PASSWORD` with a long passphrase (4+ random words). Coordinate
   the actual value with the owner — do not invent one silently and do not
   print either value into logs, commits, or this file.

**Fix (owner — cannot be done by the agent from this machine):**
3. Check the Vercel project's env vars (`vercel env ls` or dashboard →
   Settings → Environment Variables). If `SESSION_SECRET` there is also the
   placeholder, this is an actively exploitable hole on the public URL —
   update both vars to the new values and **redeploy**.
4. Rotating `SESSION_SECRET` invalidates all sessions: every device re-enters
   the password once. Expected, fine.
5. Optional hygiene: rotate the Neon database password (Neon console → Roles)
   and update `DATABASE_URL` in `.env` and Vercel. The credential was never
   committed, so this is precautionary, not urgent.

**Acceptance:** `.env` no longer contains `long-random-string`; login works
locally with the new password; owner confirms Vercel envs updated + redeployed.

---

### Task 2 (P0) — Restore `.env.example`

**Problem.** Commit `376aed0` deleted `.env.example`. SPEC §2 explicitly
requires it, `README.md:11` links to it, and `README.md:42` instructs
`cp .env.example .env.local`. The deleted version contained only safe
placeholders (verified — no secrets in git history).

**Fix:** restore it verbatim from history and commit:

```bash
git show e17e0a4:.env.example > .env.example
```

Expected contents (placeholders only):

```
# Postgres connection string (Neon: copy from the Neon console, keep ?sslmode=require)
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# The single shared password used to sign in
APP_PASSWORD=choose-a-strong-password

# Secret used to sign the session cookie (generate with: openssl rand -hex 32)
SESSION_SECRET=replace-with-a-long-random-string
```

**Acceptance:** `git ls-files | grep .env.example` shows the file
(`.gitignore:35` already whitelists it via `!.env.example`); README's link and
copy instruction work again. Commit it (never commit `.env` itself).

---

### Task 3 (P1) — Harden `PUT /api/notes/[id]`

**File:** `app/api/notes/[id]/route.ts`, `PUT` handler (lines 23–54).

**Problems.**
1. A `PUT` with `{}` (or no recognized fields) returns 200 and bumps
   `updatedAt` (line 42 sets it unconditionally), silently reordering the
   "newest-updated first" All Notes list.
2. A note can be updated to have empty title *and* body, which `POST
   /api/notes` rejects (`app/api/notes/route.ts:48-50`). Inconsistent.
3. Pin-toggle-only requests (`{"pinned": true|false}` — sent by
   `components/note-editor.tsx:96-100`) also bump `updatedAt`, so pinning
   reorders the notes list and misrepresents "last edited".

**Fix.** In the `PUT` handler:
- After building `updates` (keep lines 33–41 as-is), if no recognized field was
  present (`title`, `body`, `tags`, `pinned` all absent), return
  `400 {"error":"Nothing to update"}` — mirror the todos PATCH guard
  (`app/api/todos/[id]/route.ts:37-39`).
- Only set `updates.updatedAt = new Date()` when at least one of
  `title`/`body`/`tags` is in the update (i.e. content changed). A pin-only
  request must NOT bump `updatedAt`.
- Empty-note guard: if the update touches `title` or `body`, fetch the current
  row first (`db.select().from(notes).where(eq(notes.id, id))` — return 404 if
  missing), merge (`incoming value if provided, else current`), and if merged
  `title.trim()` and `body.trim()` are both empty, return
  `400 {"error":"Note is empty"}`. The extra select is fine — single-user app.
- Client polish, same commit: in `components/note-editor.tsx` the PUT branch
  (`handleSave`, lines 64–70) throws a bare `Error()` so the user sees only
  "Could not save". Parse the response body like the POST branch does
  (lines 77–80) so "Note is empty" surfaces.

**Acceptance** (with dev server + auth cookie; get a cookie via
`curl -c cookies.txt -X POST -H 'Content-Type: application/json' -d "{\"password\":\"<APP_PASSWORD from .env>\"}" http://localhost:4321/api/login`):
- `PUT` with `{}` → 400 "Nothing to update".
- `PUT` with `{"title":"","body":""}` on a real note → 400 "Note is empty"; the
  editor shows that message.
- `PUT` with `{"pinned":true}` → 200 and `updated_at` unchanged in response.
- `PUT` with `{"body":"x"}` → 200 and `updated_at` bumped.
- Normal editor save (title/body/tags/pinned) still works.

---

### Task 4 (P1) — Fix optimistic todo-toggle rollback

**File:** `components/todo-widget.tsx`, `toggleCompleted` (lines 70–81).

**Problems.** On PATCH failure it restores `previous` — a snapshot of the
*entire* list — clobbering any concurrent state changes (e.g. a todo added via
QuickCapture while the request was in flight, since QuickCapture appends into
the same `setTodos` state via `components/dashboard.tsx:22`). On success the
server response is discarded, so client `completedAt` (a client-clock `Date`)
drifts from the server value.

**Fix.** Replace the snapshot/restore with per-item reconciliation:

```ts
function toggleCompleted(todo: TodoDTO, completed: boolean) {
  // Optimistic: strike through / restore immediately (spec §6).
  setTodos((prev) =>
    prev.map((t) =>
      t.id === todo.id
        ? { ...t, completed, completedAt: completed ? new Date() : null }
        : t
    )
  );
  patchTodo(todo.id, { completed })
    .then((updated) =>
      setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    )
    .catch(() =>
      setTodos((prev) =>
        prev.map((t) =>
          t.id === todo.id
            ? { ...t, completed: todo.completed, completedAt: todo.completedAt }
            : t
        )
      )
    );
}
```

**Acceptance:** checking/unchecking still strikes through instantly; with the
network offline (DevTools) a toggle reverts only that one item; happy path
leaves list state matching a fresh reload.

---

### Task 5 (P1) — Prune the login-failure map

**File:** `app/api/login/route.ts` (lines 12, 49–65).

**Problem.** `failures` entries are deleted only on a successful login from the
same IP; every unique failing IP stays in the Map forever. Irrelevant on
short-lived serverless instances, a slow leak on any long-lived deployment.

**Fix.** Cheapest correct version: at the top of `POST`, sweep expired entries —

```ts
const now = Date.now();
for (const [key, value] of failures) {
  if (now - value.last >= FAILURE_WINDOW_MS) failures.delete(key);
}
```

(Map is small by construction after this; no LRU needed.)

**Acceptance:** wrong-password attempt still delayed ~1s (first attempt) and
escalates on repeats within 15 min; tsc/lint clean.

---

### Task 6 (P2) — Align manifest `theme_color`

**File:** `app/manifest.ts:11` — `theme_color: "#4f46e5"` (indigo) vs the
layout's `themeColor` `#fafaf9` light / `#16181f` dark
(`app/layout.tsx:36-39`). Manifest files can't media-query, so pick the light
value for consistency with `background_color` (already `#fafaf9`):

```ts
theme_color: "#fafaf9",
```

**Acceptance:** build passes; `curl http://localhost:4321/manifest.webmanifest`
shows the new value.

---

### Task 7 (P3, OPTIONAL — get owner approval first) — Todo deletion

SPEC §5.1 doesn't require deleting todos, so **skip unless the owner says yes**.
Today a mistaken todo can only be hidden by completing it, and completed rows
live in the `todos` table forever (the 48h window in
`app/api/todos/route.ts:17` only hides them). If approved:
- Add `DELETE` to `app/api/todos/[id]/route.ts` mirroring the notes version
  (`app/api/notes/[id]/route.ts:56-67`): UUID check → hard delete → 404 if
  nothing deleted.
- Add a small trash `Button` (`variant="ghost"`, `Trash2` icon, destructive
  text color) inside `TodoEditForm`'s button row in
  `components/todo-widget.tsx:275-289`; on click, `DELETE` then remove the item
  from state via `setTodos`. No confirm dialog needed (spec reserves the
  confirm ritual for notes; todos are low-value).

### Task 8 (P3, OPTIONAL — get owner approval first) — Repo hygiene

`.claude/skills/**` (~200 tracked files: `ui-ux-pro-max`, `design`, `brand`,
`slides`, `banner-design`, `ui-styling` with ~70 bundled `.ttf` fonts,
`design-system`, `grill-me`, plus a stray test artifact
`.claude/skills/ui-styling/scripts/.coverage`) is agent tooling unrelated to
the deliverable app. They were added deliberately in earlier commits, so **ask
the owner** before removing. If approved: move them to `~/.claude/skills/`
(global, works across projects), `git rm -r .claude/skills`, commit.

---

## 4. Final verification (run after all tasks)

```bash
npx tsc --noEmit          # must be clean
npm run lint              # must be clean
npm run build             # must succeed
PORT=4321 npm run dev &   # then:
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4321/            # 307
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4321/api/notes   # 401
# login with the APP_PASSWORD value from .env (do not hardcode it):
PW=$(grep '^APP_PASSWORD=' .env | cut -d= -f2-)
curl -s -c /tmp/c.txt -o /dev/null -w "%{http_code}\n" -X POST \
  -H 'Content-Type: application/json' -d "{\"password\":\"$PW\"}" \
  http://localhost:4321/api/login                                          # 200
curl -s -b /tmp/c.txt -o /dev/null -w "%{http_code}\n" http://localhost:4321/            # 200
curl -s -b /tmp/c.txt -o /dev/null -w "%{http_code}\n" http://localhost:4321/api/todos   # 200
```

Plus the per-task acceptance checks above. Manual pass on a ~390px viewport:
quick capture (note + todo modes), todo check-off strike-through, pin/unpin
from the editor, search + tag filter on `/notes`, note delete confirm dialog,
dark mode via system preference.

**Caution:** the `DATABASE_URL` in `.env` points at the live Neon database with
real user data. Don't run destructive experiments against it; if you need write
tests beyond the acceptance checks, create/delete only records you created.

---

## 5. Verified fine — do NOT "fix" these

- **Auth coverage:** `proxy.ts` (Next 16's middleware) gates every page and API
  route except `/login`, `/api/login`, `_next/*`, favicon, manifest, `sw.js`,
  `/icons/*`. Verified at runtime. The `(app)` pages don't re-check the session
  server-side; that's acceptable defense-in-depth to skip for this app.
- **Login security details:** timing-safe password compare, always-on ~1s
  failure delay with exponential escalation (spec §3 asks only for "rate-limit
  or a small delay"), cookie flags `httpOnly` + `secure` (prod) + `sameSite:
  lax` + 180-day maxAge (spec asks 90+).
- **Search:** `ILIKE` with correct `%`/`_`/`\` escaping and parameterized
  queries (`app/api/notes/route.ts:14`); substring search satisfies the spec's
  "full-text search" for a single-user dataset. No SQL injection anywhere
  (all Drizzle-parameterized).
- **Todo day-rollover:** server returns completed-within-48h; client filters to
  device-local "today" and re-evaluates every 60s. Matches spec §5.1 including
  the uncheck-to-restore window.
- **PWA:** manifest route, all four icons present, minimal no-cache service
  worker — spec's online-only requirement is deliberate; do not add caching.
- **Plain `pg` Pool** (`lib/db/index.ts`) works on Vercel Fluid Compute — do
  not migrate to `@neondatabase/serverless`. The pg "SSL modes" warning in dev
  logs is informational only; no action.
- **`lucide-react@1.23.0`, Next 16.2.10, React 19.2.4** — installed and
  compatible; no dependency changes needed.
- **Spec non-goals (§7):** no markdown, folders, offline mode, trash/undo,
  colors, reminders, attachments, recent-notes widget, or multi-user. Do not
  add any of these. No logout button either — not in spec.

## 6. Suggested commits

1. `Restore .env.example deleted in 376aed0` (Task 2)
2. `Validate note updates and keep updatedAt meaning "content edited"` (Task 3)
3. `Fix optimistic todo toggle rollback and reconcile server state` (Task 4)
4. `Prune expired login-failure entries` (Task 5)
5. `Align manifest theme_color with app theme` (Task 6)
6. (optional, if approved) Tasks 7/8 as separate commits.

Secret rotation (Task 1) produces **no commit** — `.env` stays untracked.
