# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A minimal, self-hosted "post & photo" journal in a Facebook-feed style: login, create posts with
text and/or photos, optionally group multiple photos of a post into an album. Single/few-user app
by design — no public registration, no per-user permission system.

## Commands

```bash
npm run dev              # dev server
npm run build             # production build -> build/
npm run check              # svelte-check (typecheck)
npm run db:push            # push schema.ts changes to the SQLite DB (no migration files, dev workflow)
npm run db:generate        # generate migration files (not currently used by db:push workflow)
npm run db:migrate         # apply generated migrations
npm run db:studio          # Drizzle Studio, browse the DB
npm run create-user -- "you@example.com" "password" "Display Name"   # only way to create a login account
```

There is no test suite/runner configured in this project.

Local dev requires `.env` (copy from `.env.example`) with `DATABASE_URL` and `UPLOAD_DIR` set before
running `db:push` or `create-user`.

**`npm run db:push` needs a real TTY and can propose destructive statements — don't pipe/run it
blind from a non-interactive shell.** When a new column is `NOT NULL` (even with a schema-level
`.default(...)`), drizzle-kit's SQLite push can decide the safest path is `delete from <table>;`
before adding the column (observed firsthand adding `post.isStatusPost` — it proposed wiping the
entire `post` table), and it always prompts for confirmation before running anything, which throws
`Interactive prompts require a TTY terminal` when stdin/stdout aren't a real terminal (exactly the
situation running it via an agent's shell tool). If you hit this: do NOT find a way to
auto-confirm the prompt blind. Add the column safely yourself instead —
`ALTER TABLE <table> ADD COLUMN <col> <type> DEFAULT <value> NOT NULL;` via `sqlite3` directly is
the standard, non-destructive way SQLite supports this exact case (existing rows get backfilled
with the default, nothing is lost) — then backfill any rows that need a non-default value with a
plain `UPDATE`. Ask the user to run `npm run db:push` themselves in their own interactive terminal
if you want drizzle-kit's own migration state reconciled afterward; the app works fine either way
since the DDL ends up equivalent.

## Architecture

**Stack:** SvelteKit (`adapter-node`, runs as a standalone Node server) + Drizzle ORM over SQLite via
`@libsql/client` (no native compilation needed) + hand-rolled session auth (no auth framework).

**Data model** (`src/lib/server/db/schema.ts`):
- `post` — optional title/text, always has an `authorId`, optionally an `albumId`, plus
  `isStatusPost` (boolean, default `false`) marking auto-generated "photos added to album" posts
  (see below) as distinct from user-authored ones. This is a real column, not a title-string
  heuristic — deliberately, since matching on the generated title text would break if albums ever
  become renameable, and can't be told apart from a user-typed title that happens to coincide.
  `routes/posts/[id]/+page.server.ts`'s `edit` action checks this flag (`fail(403)` if true) —
  status posts stay delete-only, never editable; the "Bearbeiten" button is hidden client-side for
  the same reason but the server check is the actual guard.
- `photo` — always belongs to exactly one `post` (`postId` not null). Only gets an `albumId` when
  it was saved as part of an album; otherwise it's a "loose" photo and shows up in the `/photos`
  stream.
- `album` — created *from* a post (requires ≥2 photos + a checkbox at creation time), keeps a
  reference back to the originating post via `originPostId` (purely historical — never updated
  again after creation). More photos can be added later via `routes/albums/[id]/+page.server.ts`'s
  `addPhotos` action, which does NOT touch the existing album/photos — it inserts a *new* `post`
  row with `albumId` set directly to the existing album (no schema constraint stops an album having
  multiple contributing posts) plus new `photo` rows continuing the existing `position` sequence
  (queried via `desc(photo.position) limit 1`, not reset to 0, so ordering across batches stays
  stable). This new post gets `isStatusPost: true` and an auto-generated `title` ("Ein neues Foto
  zum Album ... wurde hinzugefügt" for exactly one file, else "Neue Fotos zum Album ... wurden
  hinzugefügt" — singular vs. plural wording only, deliberately no exact count in the plural case)
  instead of user-provided text, and shows up in the feed like any other post via the existing
  `post.album` truthiness check — no feed-specific code needed.
  **Rendering quirk to know about:** the feed and `/posts/[id]` intentionally do NOT always render
  a post's own `photos` relation — if `post.id === post.album.originPostId` (i.e. this is the post
  that originally created the album), they render `post.album.photos` instead (the album's full,
  current photo list) so the origin post's card visibly grows as more photos are added to its
  album over time; every other post (including `addPhotos`-created ones) still renders its own
  `photos` only. Both `src/routes/+page.server.ts` and `src/routes/posts/[id]/+page.server.ts` load
  `album: { with: { photos: ... } }` (not just `album: true`) to make this possible — if you add a
  new place that renders a post's photo grid, replicate this same origin-post check rather than
  defaulting to `post.photos`, or the "album grows in place" behavior will silently regress there.
- `user` / `session` — session tokens are opaque random tokens stored in the `session` table
  (not JWTs), checked against `expiresAt` on every request.

**Auth flow:** `src/hooks.server.ts` runs on every request, loads the session user via
`getSessionUser` (`src/lib/server/auth.ts`) into `event.locals.user`. Reading is public by
default — feed, photos, albums, post/photo permalinks and `/uploads/*` all work without a login;
only paths matching `PROTECTED_PREFIXES` (currently just `/posts/new`) redirect to `/login` when
logged out. New write *pages* (a route whose whole purpose is creating something, like
`/posts/new`) should be added to that list. New write *actions on an otherwise-public page*
(`addPhotos` on `/albums/[id]`, `delete` on `/posts/[id]`) must NOT be added — the prefix match is
a plain `startsWith` on the pathname, so protecting `/albums` or `/posts/[id]` would also block
public GET access to those pages. Those actions instead do their own `if (!locals.user) return
fail(401, ...)` check inside the action handler — the default for new routes/actions is public,
opt into protection deliberately and at the right granularity. **`PROTECTED_PREFIXES` alone is not
enough for a route that has no `load` function** (like `/posts/new`, which originally only
exported `actions`) — SvelteKit skips the server round-trip entirely for client-side navigation to
such a route (e.g. clicking an `<a href="/posts/new">` from an already-hydrated page), so the hook
never runs and a logged-out visitor sees the page/form rendered anyway (confirmed live: form was
reachable without a session cookie, only the actual submit got redirected to `/login` via the
action's own check). Fixed by adding a trivial `load` to `posts/new/+page.server.ts` that itself
checks `locals.user` and redirects — this forces the round-trip the hook needs to run on. Any new
protected write-page route needs the same: don't rely on the hook alone unless the route already
has a `load` for other reasons. Passwords are hashed with `node:crypto` scrypt
(`salt:hash` hex format), not bcrypt/argon2, to avoid native dependencies. There's no
password-reset flow; recovery means re-running `create-user`.

**Photo storage:** Photos are written to disk (`UPLOAD_DIR`, default `./uploads`) with a random
UUID filename (original extension preserved if it's an allowed image type) — see
`src/lib/server/storage.ts`. Served back through `src/routes/uploads/[filename]/+server.ts`, which
streams the file and resolves the MIME type from the extension. `uploadFilePath()` strips any
directory components from the requested filename (`path.basename`) to prevent path traversal, so
that route is intentionally excluded from the auth gate in `hooks.server.ts`.

**Post creation is a single transa-style sequence** (not an actual DB transaction — libsql/http
here): insert the post, then conditionally insert an album and back-fill the post's `albumId`, then
insert one `photo` row per uploaded file with an incrementing `position`. When touching this flow,
keep the order (post → album → photos) since photos and albums both reference the post's id.

**Foreign keys are NOT enforced at runtime — this bit post deletion once already, watch for it
again.** SQLite only applies `ON DELETE CASCADE`/`SET NULL` when the connection has run `PRAGMA
foreign_keys = ON`; this project never does that (verified: `@libsql/client`'s regular
`execute()`/`batch()` path — what Drizzle actually calls — never touches that pragma; it's only
toggled inside the client's `migrate()` method, which this project doesn't use, relying on
`drizzle-kit push` instead). So every `.references(..., { onDelete: ... })` in `schema.ts` only
shapes the DDL `drizzle-kit push` emits — it is otherwise decorative. **Any code that deletes a
`post` or `album` row must explicitly delete/update everything that would have cascaded**, in the
right order, before or after the row delete as needed (see `routes/posts/[id]/+page.server.ts`'s
`delete` action: reads the post's own `photos` and its `album` first, nulls `album.originPostId` if
this post was the origin, deletes the post's own `photo` rows and their on-disk files via
`deleteUploadedPhoto()` (`lib/server/storage.ts`), then deletes the `post` row — nothing here
happens automatically). Forgetting this leaves orphaned rows/files behind (e.g. photo rows with no
owning post would keep showing up in the `/photos` global stream forever).

**Deleting a post never touches the `album` row itself**, even when the post created the album —
only `album.originPostId` gets nulled if this post was that album's origin (so the "Zum
Ursprungs-Post" link disappears instead of pointing at a 404). This is an unavoidable consequence
of the schema, not a bug: an origin post's own `photo` rows carry both `postId` *and* `albumId` on
the same rows (they're not duplicated), and `photo.postId` is `NOT NULL`, so deleting the origin
post necessarily deletes its own original photos (files + rows) along with it — only the album
entity and any photos contributed later by other posts (via `addPhotos`) survive.

**`DeletePostButton.svelte` is shared between the feed and `/posts/[id]`** via an optional
`afterDelete?: () => void` prop (same callback-prop precedent as `PhotoLightbox`'s
`onClose`/`onPrev`/`onNext`) — the feed passes nothing (successful delete just calls `update()`,
i.e. `invalidateAll()`, so the post disappears from the list on reload), the detail page passes
`() => goto('/')` since its own route is gone. **Do not call both `afterDelete()` and `update()` on
success** — an earlier version did, and calling `update()` after navigating away re-ran the
now-deleted post's own `load()` in a race with the `goto()`, occasionally flashing its 404 error
page before the redirect landed. The fix: call `update()` only when `afterDelete` was *not*
provided; when it was, trust the caller to navigate away and skip refreshing the (about to be
gone) current route entirely.

**Env vars** (`src/lib/server/db/index.ts`, `src/lib/server/storage.ts`) are read via
`$env/dynamic/private`, not `$env/static/private` — `DATABASE_URL` throws at import time if unset;
`UPLOAD_DIR` falls back to `./uploads` if unset. In production, both must point at paths outside the
build output (see README's deployment section) since the build directory doesn't persist across
deploys. `ORIGIN` must match the real deployment URL or SvelteKit's CSRF protection will block all
form submissions (login, post creation, etc.). `BODY_SIZE_LIMIT` governs max upload size (default
512KB is too small for photo uploads; `.env.example` sets it to `20M`).

**Photo lightbox (deep-linkable, via SvelteKit shallow routing):** clicking a photo in
`src/lib/components/PhotoGrid.svelte` doesn't just toggle local state — it calls `pushState()`
(`$app/navigation`) to change the URL to `/posts/[id]/photo/[photoId]` while keeping the current
page (feed or post detail) mounted underneath; the overlay itself is
`src/lib/components/PhotoLightbox.svelte`, shown whenever `page.state.lightboxPhotoId`
(`$app/state`) matches a photo in that grid's list. Prev/next inside the overlay use
`replaceState()` (not `pushState`) so browser-back always closes the lightbox in one step instead
of stepping back through every photo viewed. Closing (X, backdrop click, Escape) calls
`history.back()`. `PhotoLightbox` itself only renders real `<a href>` elements for close/prev/next
— when no `onClose`/`onPrev`/`onNext` callback is passed, those links behave as plain navigation.
That's what makes `src/routes/posts/[id]/photo/[photoId]/+page.svelte` work as a genuine
progressive-enhancement fallback: a hard reload/direct link/no-JS request lands on that route
directly (no "background" feed exists to overlay), and it renders the same `PhotoLightbox`
component without any callbacks, so prev/next/close are just normal links. When changing the
lightbox, keep both paths in mind — the shallow-routed overlay from a grid and the standalone
fallback page both share `PhotoLightbox`; don't special-case one without checking the other still
works via a fresh page load of the relevant permalink route.

There are **three independent deep-link contexts**, each with its own permalink route and its own
notion of what prev/next cycles through — because "the next photo" means something different
depending on where you clicked:
- Post-scoped: `/posts/[id]/photo/[photoId]`, used by `PhotoGrid.svelte` (feed + post detail).
  Prev/next cycles through that one post's photos.
- Stream-scoped: `/photos/[photoId]`, used by `routes/photos/+page.svelte`. Prev/next cycles
  through *all* photos site-wide (same `desc(createdAt)` order as the `/photos` grid), crossing
  post boundaries.
- Album-scoped: `/albums/[id]/photo/[photoId]`, used by `routes/albums/[id]/+page.svelte`.
  Prev/next cycles through that album's photos only (`asc(position)` order).

Each context duplicates the same small shallow-routing glue (`pushState` on open, `replaceState`
on prev/next, `history.back()` on close, `Escape`/arrow-key handling, body-scroll lock) inline in
its own component rather than sharing one abstraction — the three photo lists and href shapes
differ enough that a generic wrapper would need as much branching as just repeating the ~20 lines.
Only the presentational `PhotoLightbox` is actually shared. Adding a fourth context (e.g. a
per-author stream) means repeating this pattern again, not extending an existing one.

**Post composer is cross-route (`src/lib/components/PostComposer.svelte`):** the create-post
`<form>` is rendered inline above the feed on `/` (only when `data.user` is set — `/` itself has
no `load`-level auth check since it's public, so this is purely a display gate) as well as
standalone on `/posts/new` (kept as a progressive-enhancement fallback / direct-link target). Both
instances post to the same `action="/posts/new"`, which is where the actual `actions.default` and
its own auth check live (`routes/posts/new/+page.server.ts`). **Do not rely on `page.form`
(`$app/state`) to read the result of a cross-route form action** — in practice it did not update
reactively here when the form's `action` pointed at a different route than the one it was
rendered on (`/` submitting to `/posts/new`); use an explicit `use:enhance={() => async ({result,
update, formElement}) => {...}}` callback instead and read `result.data` directly into local
component state, as `PostComposer` does. Because the server action always responds with a
`redirect` on success (never a `success` result), remember to reset the form/local state
(`formElement.reset()`) yourself in that branch — SvelteKit's default post-submit form reset only
fires for `success` results, not redirects.

## Workflow-Konventionen

- Vor größeren/nicht-trivialen Änderungen den Plan in `tasks/todo.md` festhalten (nicht nur im
  TodoWrite/Task-Tool) — Schritte und betroffene Dateien, während der Arbeit abhaken.
- Nach Korrekturen durch den Nutzer eine kurze, konkrete Lektion in `tasks/lessons.md` ergänzen
  (was war falsch, was ist stattdessen richtig) — projektspezifisch für fb-journal, keine
  allgemeinen Plattitüden.
- Das TodoWrite/Task-Tool ergänzend zur Fortschrittsanzeige innerhalb einer Session nutzen, ersetzt
  aber nicht `tasks/todo.md`.

## Known gaps (see README for full list)

No edit/delete for posts, photos, or albums (create + view only). No image compression/thumbnails —
originals are stored and served as-is.
