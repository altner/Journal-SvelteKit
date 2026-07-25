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
npm run create-user -- "you@example.com" "Display Name"   # only way to create a login account
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
- `post` — optional title/text, always has an `authorId`. Has no relationship to albums at all —
  see below, that used to not be true and caused a lot of accidental complexity.
- `photo` — always belongs to exactly one `post` (`postId` not null). A "loose" photo, showing up
  in the `/photos` stream.
- `album` / `album_photo` — **fully independent of `post`/`photo`**, mirroring how `checkin`/
  `checkin_photo` and `activity`/`activity_photo` already worked. An album is `id`, `title`
  (required), optional `description`, `slug`, `authorId`, `createdAt` — no carrier post, no
  `originPostId`. Its photos live in their own `album_photo` table (`albumId` NOT NULL, cascade),
  with a `position` sequence just like `photo`/`checkin_photo`/`activity_photo`. Created directly
  via `createAlbum()` (`lib/server/albums.ts`) — web UI (`routes/albums/+page.server.ts`'s
  `createAlbum` action) or Micropub (`routes/api/micropub/album`) — and grown later via
  `addPhotosToAlbum()`, which continues the existing `position` sequence (queried via
  `desc(position) limit 1`, not reset to 0) and stamps every new row with a fresh, shared
  `createdAt`.
  **This used to be very different and much more complicated** — album photos lived in the shared
  `photo` table, every album needed a carrier `post` row (`photo.postId` is `NOT NULL`, so a
  post-less photo was impossible), adding photos later created an invisible auto-generated
  `isStatusPost` post, and the feed had a whole "origin post renders `post.album.photos` instead of
  its own `photos`" rendering quirk to make an album's card visually grow in the feed over time.
  All of that is gone now. If you ever see any of those terms (`originPostId`, `isStatusPost`,
  `post.albumId`, `photo.albumId`) in old comments/git history, that's what they refer to — don't
  reintroduce that coupling.
  **Feed signal without a carrier post:** since there's no post to represent "album was
  created"/"photos were added to this album" as separate feed moments, `routes/+page.server.ts`
  derives these directly from `album_photo`: rows sharing the *exact same* `createdAt` (one JS
  `Date` instance is passed to every insert in a given request, see `albums.ts`) are one batch: the
  batch whose `createdAt` equals `album.createdAt` is the "album created" event, any later batch is
  a "N photos added to album X" event. Both render via `AlbumFeedCard.svelte`.
  Note there is one legacy exception: `routes/photos/+page.server.ts` used to have a
  `createAlbumFromSelection` action letting you turn already-existing *loose* post photos into a
  new album without a carrier post (`photo.albumId` set directly, `originPostId: null`) — since a
  photo could belong to a post and an album at once there. That's gone too (removed, not migrated
  forward) since it's fundamentally incompatible with albums being independent — a photo can't be
  both an `album_photo` row and a `photo` row without being duplicated on disk-reference. Albums
  now only ever get photos through direct upload (web form or Micropub), never by re-tagging an
  existing post's photo.
- `user` / `session` — session tokens are opaque random tokens stored in the `session` table
  (not JWTs), checked against `expiresAt` on every request.

**Auth flow:** `src/hooks.server.ts` runs on every request, loads the session user via
`getSessionUser` (`src/lib/server/auth.ts`) into `event.locals.user`. Reading is public by
default — feed, photos, albums, post/photo permalinks and `/uploads/*` all work without a login.
`PROTECTED_PREFIXES` (`src/lib/server/redirect.ts`) is currently **empty**: post/checkin creation
moved to Micropub-only (see below), and `/albums`' own "+ Neues Album" form is a public *page*
whose `createAlbum` *action* does its own auth check (same pattern as `addPhotos` below) rather
than needing the whole page gated — so there is no write-only page left that needs a
prefix-based `/login` redirect. If a new write-only page is ever added again (a route
whose whole purpose is creating something, the way `/posts/new` used to be), add its prefix here
— but remember `PROTECTED_PREFIXES` alone doesn't help a route with no `load` function, since
SvelteKit skips the server round-trip on client-side navigation to such a route and the hook never
runs; give it a trivial `load` that itself checks `locals.user` and redirects, forcing the
round-trip. Write *actions on an otherwise-public page* (`addPhotos` on `/albums/[slug]`, `delete`
on `/posts/[slug]`) must NOT go through `PROTECTED_PREFIXES` — the prefix match is a plain
`startsWith` on the pathname, so protecting `/albums` or `/posts/[slug]` would also block public
GET access to those pages. Those actions instead do their own `if (!locals.user) return
fail(401, ...)` check inside the action handler — the default for new routes/actions is public,
opt into protection deliberately and at the right granularity.

**Login is IndieAuth, not a local password** — `src/lib/server/indieAuthLogin.ts` +
`routes/login/{start,callback}/+server.ts`. `/login` only shows a "Mit IndieAuth anmelden" link;
`/login/start` (GET) generates a PKCE verifier + single-use `state` (stashed in an in-memory `Map`,
same one-Node-process reasoning as the old rate-limiter) and redirects to
`INDIEAUTH_AUTHORIZATION_ENDPOINT` (the same external server as `INDIEAUTH_INTROSPECT_URL`, see
`indieAuthCheckinAuth.ts`) with `me=INDIEAUTH_ME` (skips the identity picker) and **no scope** —
this is a pure identity confirmation, not an API credential, so the auth server's token endpoint
takes a shortcut for scope-less requests and returns `{ me }` directly instead of issuing an access
token. `/login/callback` (GET) exchanges the code for that `{ me }`, checks it equals
`INDIEAUTH_ME` (plus `iss` against the token endpoint's origin, if present), resolves the local
owner account via `MICROPUB_USER_EMAIL` (same pattern as the Micropub IndieAuth path), and creates
a normal session — the `session` table/cookie mechanism itself is unchanged. There is no password
anymore: `user.passwordHash` was dropped from the schema, `hashPassword`/`verifyPassword` removed
from `auth.ts`, and `create-user` no longer takes a password argument — recovery if the IndieAuth
server itself is ever unreachable means restoring *that* server, not this app's DB.

**Post/checkin creation is Micropub-only — there is no web form. Album creation has both a web
form AND Micropub.** `PostComposer.svelte`, `CheckinComposer.svelte`, `/posts/new`, and
`/checkins/new` were removed; the only way to create a post or checkin is `POST
/api/micropub/{post,checkin}` (see `docs/api.md`), called by an IndieAuth/Micropub client (e.g. the
separate Quill editor project, an Apple Shortcut, or osm-checkin). Albums are the one exception —
`routes/albums/+page.server.ts`'s `createAlbum` action (the "+ Neues Album" form on `/albums`) and
`POST /api/micropub/album` both create albums directly, independently of each other, no dispatch
flag or shared code path between the two beyond `lib/server/albums.ts`'s `createAlbum()` helper.
Editing and deleting existing posts/checkins/albums happens through the web UI regardless of how
they were created (`EditPostForm.svelte`, `EditCheckinForm.svelte`, `DeleteAlbumButton.svelte`,
the delete actions on `/posts/[slug]` etc.) — only *creation* is split this way. One real feature
gap versus the old web composer: the Micropub post/checkin endpoints only support a single fixed
text block + single photos block per entity, while the web UI's `BlockEditor` (still used by the
edit forms) supports an arbitrarily ordered mix of multiple text/photo blocks — a
Micropub-created post/checkin can't produce that richer block structure, only editing one
afterward can. Albums never had blocks at all (single `description` field instead), so this gap
doesn't apply to them.

**`/api/micropub/checkin` supports photos via a Micropub media endpoint, not direct multipart
upload** — it takes a JSON body (the h-entry shape osm-checkin sends), so a photo can't be
attached in the same request the way `post`/`album` do it. Instead: `GET
/api/micropub/checkin?q=config` (IndieAuth-authenticated, same as `POST`) tells the client where
the media endpoint is; the client `POST`s the file to `/api/micropub/media` first (also
IndieAuth-only, `saveUploadedPhoto()` same as everywhere else) and gets back a `{origin}/uploads/
{filename}` URL; that URL is what goes in the checkin's `properties.photo`. The checkin endpoint
only ever resolves `photo` URLs matching its own `{origin}/uploads/` prefix
(`extractOwnUploadFilename` in `routes/api/micropub/checkin/+server.ts`) — it never fetches an
arbitrary third-party URL — and reads the file's dimensions back off disk via
`readUploadedPhotoDimensions()` (`storage.ts`) since the media endpoint's response doesn't carry
them. A URL that doesn't match, or a file that's gone, is silently skipped rather than failing the
whole checkin.

**Photo storage:** Photos are written to disk (`UPLOAD_DIR`, default `./uploads`) with a random
UUID filename (original extension preserved if it's an allowed image type) — see
`src/lib/server/storage.ts`. Served back through `src/routes/uploads/[filename]/+server.ts`, which
streams the file and resolves the MIME type from the extension. `uploadFilePath()` strips any
directory components from the requested filename (`path.basename`) to prevent path traversal, so
that route is intentionally excluded from the auth gate in `hooks.server.ts`.

**Post creation** (not an actual DB transaction — libsql/http here): insert the post, then insert
one `photo` row per uploaded file with an incrementing `position`. Album creation is its own,
separate sequence now (`createAlbum` in `lib/server/albums.ts`): insert the album, then insert one
`album_photo` row per file — no post involved at all.

**Foreign keys are NOT enforced at runtime — this bit post deletion once already, watch for it
again.** SQLite only applies `ON DELETE CASCADE`/`SET NULL` when the connection has run `PRAGMA
foreign_keys = ON`; this project never does that (verified: `@libsql/client`'s regular
`execute()`/`batch()` path — what Drizzle actually calls — never touches that pragma; it's only
toggled inside the client's `migrate()` method, which this project doesn't use, relying on
`drizzle-kit push` instead). So every `.references(..., { onDelete: ... })` in `schema.ts` only
shapes the DDL `drizzle-kit push` emits — it is otherwise decorative. **Any code that deletes a
`post` or `album` row must explicitly delete/update everything that would have cascaded**, in the
right order, before or after the row delete as needed (see `deletePostCascade` in
`lib/server/posts.ts`: deletes the post's own `photo` rows and their on-disk files via
`deleteUploadedPhoto()` (`lib/server/storage.ts`), its `post_block`/`post_tag` rows, then the
`post` row itself — nothing here happens automatically). Forgetting this leaves orphaned
rows/files behind (e.g. photo rows with no owning post would keep showing up in the `/photos`
global stream forever). Album deletion (`routes/albums/[slug]/+page.server.ts`'s `deleteAlbum`
action) is now simpler than it used to be for the same reason albums are independent: delete its
`album_photo` rows + files, then the `album` row — no posts to untangle at all anymore.

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
512KB is too small for photo uploads; `.env.example` sets it to `100M` — activity uploads bundle a
GPX track with multiple unresized photos in one request and have hit ~48M in practice).

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
  through *all* photos site-wide (same `desc(createdAt)` order as the `/photos` grid) — this
  stream aggregates all four photo-owning entities (`photo`/`activity_photo`/`checkin_photo`/
  `album_photo`), crossing post/activity/checkin/album boundaries alike. `deletePhoto` on
  `/photos` tries all four tables in turn to find which one a given photo id belongs to.
- Album-scoped: `/albums/[slug]/photo/[photoId]`, implemented in `AlbumPhotoGrid.svelte` and used
  by both `routes/albums/[slug]/+page.svelte` and the main feed's `AlbumFeedCard.svelte`. Prev/next
  cycles through that album's photos only (`asc(position)` order).

Each context duplicates the same small shallow-routing glue (`pushState` on open, `replaceState`
on prev/next, `history.back()` on close, `Escape`/arrow-key handling, body-scroll lock) inline in
its own component rather than sharing one abstraction — the three photo lists and href shapes
differ enough that a generic wrapper would need as much branching as just repeating the ~20 lines.
Only the presentational `PhotoLightbox` is actually shared. Adding a fourth context (e.g. a
per-author stream) means repeating this pattern again, not extending an existing one.

## Workflow-Konventionen

- Vor größeren/nicht-trivialen Änderungen den Plan in `tasks/todo.md` festhalten (nicht nur im
  TodoWrite/Task-Tool) — Schritte und betroffene Dateien, während der Arbeit abhaken.
- Nach Korrekturen durch den Nutzer eine kurze, konkrete Lektion in `tasks/lessons.md` ergänzen
  (was war falsch, was ist stattdessen richtig) — projektspezifisch für fb-journal, keine
  allgemeinen Plattitüden.
- Das TodoWrite/Task-Tool ergänzend zur Fortschrittsanzeige innerhalb einer Session nutzen, ersetzt
  aber nicht `tasks/todo.md`.
- **Deploys macht ausschließlich der Nutzer selbst.** Claude führt `scripts/deploy.sh` nicht aus und
  stößt auch sonst keinen Rollout auf achis.blog an (Build+Sync, Service-Neustart) — Änderungen
  lokal fertigstellen/testen und dem Nutzer zum eigenen Deploy übergeben. Direkte Eingriffe auf dem
  Produktions-Server (z.B. eine DB-Migration nachholen, wie beim Blocks-Feature-Vorfall nötig) sind
  nur mit expliziter Rückfrage/Zustimmung im jeweiligen Moment vertretbar, nie als Ersatz für einen
  eigenständigen Deploy durch Claude.

## Known gaps (see README for full list)

No edit/delete for posts, photos, or albums (create + view only). No image compression/thumbnails —
originals are stored and served as-is.
