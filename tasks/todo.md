# Todo

## Wählbares Datum bei neuem Post/Album — erledigt

- [x] `src/lib/components/PostComposer.svelte`: neues `<input type="date">`-Feld, Default = heute
      (lokal berechnet, nicht `toISOString()` wegen UTC-Verschiebung), editierbar für rückdatierte
      Posts (z.B. ältere Fotos)
- [x] `src/routes/posts/new/+page.server.ts`: `resolveCreatedAt()` kombiniert das gewählte Datum
      mit der aktuellen Uhrzeit (damit mehrere rückdatierte Posts am selben Tag noch sinnvoll
      sortiert bleiben); fällt bei fehlendem/ungültigem Wert auf `new Date()` zurück
- [x] Das gewählte `createdAt` wird konsistent für **Post, neu erstelltes Album und alle
      hochgeladenen Fotos** verwendet — sonst wäre der Post im Feed richtig einsortiert, aber die
      Fotos wären im `/photos`-Stream trotzdem mit "heute" sortiert (Feed: `desc(post.createdAt)`,
      Foto-Stream: `desc(photo.createdAt)`, Alben-Übersicht: `desc(album.createdAt)`)
- [x] Bug gefunden + gefixt: nach erfolgreichem Submit blieb das Datumsfeld leer statt auf "heute"
      zurückzuspringen — `formElement.reset()` setzt den DOM-Wert direkt, ohne dass Sveltes
      `bind:value` das mitbekommt; `await tick()` vor dem Reassign behebt es
- [x] `npm run check` — 0 Fehler
- [x] Im Browser mit temporärem Test-User geprüft (danach wieder gelöscht): rückdatierter Post
      (15.03.2020) landet im Feed korrekt ganz unten/chronologisch einsortiert statt an heutiger
      Stelle; Datumsfeld zeigt nach Veröffentlichen wieder korrekt heute
- [x] Deployed (kein Schema-Change nötig, `createdAt`-Spalten existierten schon)

## Impressum & Datenschutz — erledigt

- [x] `src/lib/consts.ts` neu: `CONTACT_*` (Name/Anschrift/Telefon/E-Mail, übernommen von
      adrian-altner.com, gleiche Person) + `SOCIAL_PROFILES`-Liste, bewusst ohne E-Mail-
      Verschleierung (anders als adrian-altner.com) — Nutzerentscheidung
- [x] `src/routes/impressum/+page.svelte` neu
- [x] `src/routes/datenschutz/+page.svelte` neu — Inhalt an das tatsächliche Verhalten dieser App
      angepasst (kein Stadia Maps/YouTube/Webmentions wie bei adrian-altner.com; stattdessen
      eigene Abschnitte zu Server-Logfiles, generischem Hosting, dem `session`-Login-Cookie
      (nur beim Betreiber-Login gesetzt, nicht bei öffentlichem Lesezugriff) und dazu, dass Fotos/
      Texte ausschließlich vom Betreiber selbst stammen
- [x] `src/lib/components/Footer.svelte` neu: Social-Links + Impressum/Datenschutz, immer sichtbar
      (unabhängig vom Login-Status, da Feed/Fotos/Alben öffentlich lesbar sind)
- [x] `src/routes/+layout.svelte`: `<Footer />` unterhalb von `{@render children()}` ergänzt,
      außerhalb des `{#if data?.user}`-Blocks der Topnav
- [x] `.claude/launch.json` neu angelegt (existierte noch nicht) für Browser-Preview
- [x] `npm run check` — 0 Fehler
- [x] Im Browser geprüft: `/impressum` und `/datenschutz` rendern korrekt, Footer mit
      Social-Links + Rechtliches-Links erscheint auf dem Feed

## Post bearbeiten — erledigt

- [x] `src/lib/server/db/schema.ts`: neue Spalte `isStatusPost` (boolean, default false)
- [x] `src/routes/albums/[id]/+page.server.ts`: `addPhotos`-Action setzt `isStatusPost: true`
- [x] `src/routes/posts/[id]/+page.server.ts`: neue `edit`-Action — `fail(401)` ohne Login,
      `fail(403)` für Status-Posts, `fail(400)` wenn Text leer UND keine Fotos vorhanden, sonst
      Update von `title`/`text`
- [x] `src/lib/components/EditPostForm.svelte` neu: geteilt zwischen Feed und Detailseite,
      `onSaved`/`onCancel`-Callback-Props, vorausgefüllte Werte, kein Reset auf leer nach Erfolg
- [x] `src/routes/+page.svelte` und `src/routes/posts/[id]/+page.svelte`: Inline-Toggle
      (`editingId`/`editing`-State), "Bearbeiten"-Button nur wenn `data.user && !isStatusPost`,
      zusammen mit `DeletePostButton` in `.post-actions`
- [x] DB-Migration: `npm run db:push` wollte interaktiv bestätigen und schlug dabei `delete from
      post;` vor (Datenverlust für alle 6 Posts) — **abgebrochen**, stattdessen Spalte sicher per
      manuellem `ALTER TABLE ... ADD COLUMN ... DEFAULT 0 NOT NULL` ergänzt (Standard-SQLite-Weg
      ohne Datenverlust), bestehende Status-Posts rückwirkend per `UPDATE` markiert
- [x] `npm run check` — 0 Fehler
- [x] Im Browser + curl geprüft: normalen Post bearbeiten (Feed + Detailseite) → Titel/Text ändern,
      Speichern zeigt neue Werte sofort, kein Seitenwechsel; Abbrechen verwirft Änderungen; leeren
      Text bei reinem Text-Post speichern → Inline-Fehler; Status-Post zeigt kein
      "Bearbeiten"-Button, direkter POST an `?/edit` dafür → 403; ausgeloggt kein Button sichtbar,
      direkter POST ohne Session → 401
