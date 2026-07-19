# Todo

## Tags-Feature — erledigt

- [x] Diskussion vorab: Tags statt starrer Kategorien (Kategorien würden mit dem bestehenden
      Album-Konzept überlappen), case-insensitiver Dedup mit Erhalt der zuerst getippten
      Schreibweise
- [x] Neue Tabellen `tag` + `post_tag` (Junction-Tabelle, erste Many-to-Many-Beziehung im Schema)
      in `src/lib/server/db/schema.ts`; `unique()`-Constraint auf `(post_id, tag_id)`
- [x] `src/lib/server/tags.ts` neu: `slugifyTag()` (Unicode-Property-Escapes, Umlaute/ß bleiben
      erhalten, keine Diakritika-Entfernung), `parseTagsField()`, `setPostTags()`
      (Delete-dann-Insert, von Erstellung UND Bearbeitung gemeinsam genutzt)
- [x] `deletePostCascade()` (`src/lib/server/posts.ts`) räumt jetzt auch `post_tag`-Zeilen mit auf
      — notwendig, da Foreign Keys zur Laufzeit nicht durchgesetzt werden (bekanntes
      Projekt-Verhalten), sonst blieben verwaiste Verknüpfungen zurück
- [x] `src/lib/components/TagInput.svelte` neu: interaktiver Chip-Editor (Enter/Komma committet,
      Backspace auf leerem Feld entfernt letzten Chip, ×-Button pro Chip), verwendet in
      `PostComposer` UND `EditPostForm` (Tags sind nachträglich änderbar)
- [x] `src/lib/components/PostCard.svelte` neu: gemeinsame Post-Karte, ausgelagert aus Feed +
      Post-Detail (wären mit der neuen Tag-Ansicht sonst eine dritte Kopie geworden). Editier-
      Zustand kommt bewusst als Props von außen (`editing`/`onEdit`/`onEditDone`), NICHT lokal
      verwaltet — erhält das bisherige Verhalten (nur ein Post gleichzeitig im Bearbeiten-Modus
      pro Liste), exakt wie vom Nutzer gewünscht
- [x] Neue Routen: `/tags` (Übersicht, alphabetisch, Tags ohne verbleibende Posts ausgeblendet
      aber nicht gelöscht — Schreibweise bleibt bei erneuter Nutzung erhalten), `/tags/[slug]`
      (voll interaktiver gefilterter Feed über `PostCard`, zweistufige Query da Drizzles
      relationale API von der Junction-Tabelle aus nicht nach `post.createdAt` sortieren kann)
- [x] Nav-Eintrag "Tags" ergänzt (erscheint automatisch in Desktop-Sidebar, bleibt wie "Alben"
      aus der mobilen Topnav ausgeschlossen)
- [x] `npm run check` — 0 Fehler/Warnungen (ein `state_referenced_locally`-Warnung in
      `TagInput.svelte` bewusst per `untrack()` aufgelöst, gleiches Muster wie zuvor bei der
      Zeitleiste)
- [x] DB-Migration: neue Tabellen sind rein additiv (kein Risiko wie beim früheren
      `isStatusPost`-Vorfall), lokal direkt per `sqlite3 local.db` angelegt; `db:push` selbst
      noch vom Nutzer auszuführen (TTY-Pflicht durch `drizzle.config.ts`s `strict: true`,
      unabhängig von Destruktivität)
- [x] Im Browser mit temporärem QA-User (danach gelöscht) end-to-end getestet: Chip-Eingabe
      (hinzufügen/entfernen/Reset nach Submit), Tag-Pills im Feed, Klick navigiert zu
      `/tags/[slug]`, dort Tags bearbeiten (Chip entfernt/hinzugefügt, Pill-Zeile aktualisiert),
      Post von dort gelöscht (kein Redirect, Liste aktualisiert sich nur), Dedup-Test (ein Post
      mit "Urlaub", zweiter mit "urlaub" — per SQL bestätigt: genau eine Tag-Zeile mit
      `name='Urlaub'`, beide Posts verknüpft), `/tags`-Übersicht zeigt korrekte Zählung und
      blendet Tags ohne Posts aus, Post-Detailseite über `PostCard` weiterhin korrekt
- [x] **Test-Erkenntnis (kein Code-Fehler):** Das Browser-Automatisierungstool hat Enter/Komma-
      Tastendrücke beim ersten Versuch nicht zuverlässig als echte `keydown`-Events zugestellt
      (Text landete unverarbeitet im Eingabefeld). Per direkt dispatchtem `KeyboardEvent`
      bestätigt, dass die Komponenten-Logik korrekt reagiert (`preventDefault` + Chip-Erstellung)
      — ein reines Timing-/Synthese-Problem des Test-Tools, echte Tastatureingaben in einem
      normalen Browser funktionieren zuverlässig
- [ ] Nicht deployed — lokale Änderung, noch nicht auf achis.blog live; Nutzer sollte vorher
      `npm run db:push` in eigenem Terminal ausführen (siehe Migrations-Hinweis oben) und beim
      Deploy zusätzlich `ssh yaksha && cd /opt/achis-blog && npm install && npx drizzle-kit push`

## Jahr/Monat-Zeitleiste in der rechten Spalte (Desktop) — erledigt

- [x] Geprüft: Posts waren NICHT nach Jahr/Monat geclustert (reine flache `desc(createdAt)`-Liste,
      keine Gruppierungslogik, keine DOM-Anker) — bestätigt vor der Umsetzung
- [x] `src/lib/timeline.ts` neu: `clusterPostsByMonth()` — ein linearer Durchlauf über die bereits
      sortierten Posts, baut verschachtelte `YearGroup[]` (Jahr → Monate mit Post-Zahl) +
      `anchorIdByPostId`-Map (nur der jeweils neueste Post pro Monat bekommt einen Anker)
- [x] `src/routes/+page.server.ts`: Cluster-Berechnung ergänzt, `posts` bekommen `anchorId`,
      zusätzlich `clusters` zurückgegeben
- [x] `src/routes/+page.svelte`: `id={p.anchorId ?? undefined}` auf der Post-Karte — einzige
      sichtbare Änderung im Feed selbst (keine sichtbaren Trenner, nur unsichtbarer Scroll-Anker)
- [x] `src/lib/components/PostTimeline.svelte` neu: verschachtelte Jahr/Monat-Liste, echte
      `<a href="#anchor">`-Links (progressive enhancement — Klick ohne JS macht nativen Hash-Jump),
      mit JS abgefangen für `scrollIntoView({behavior:'smooth'})`; Scroll-Spy per
      `IntersectionObserver` (schmales Erkennungsband nahe Viewport-Oberkante statt naivem
      `threshold`, da Post-Karten stark unterschiedlich hoch sind)
- [x] **Nachtrag während der Verifikation:** Nutzer wollte explizit "Jahr ODER Monat" klickbar —
      die Jahres-Überschrift war anfangs nur Text, nicht klickbar. Gefunden + gefixt: Jahres-Label
      ist jetzt ebenfalls ein `<a>`, scrollt zum ersten (neuesten) Monat dieses Jahres
- [x] `src/app.d.ts`: `clusters?: YearGroup[]` zu `App.PageData` ergänzt (war auskommentiert) —
      nötig, damit `page.data.clusters` in `+layout.svelte` typsicher ist
- [x] `src/routes/+layout.svelte`: `PostTimeline` nur auf `/` gerendert; neuer `<aside
      class="right-rail">`-Wrapper um `PostTimeline` + `Footer`, da beide sonst unabhängig
      `position:sticky`/`grid-column:3` beansprucht hätten (Kollision) — jetzt ist nur der Wrapper
      sticky/grid-positioniert, `Footer.svelte` selbst wurde entsprechend abgespeckt
- [x] `npm run check` — 0 Fehler
- [x] Im Browser mit ~10 über 2024–2026 verteilten Test-Posts (temporärer QA-User, danach
      gelöscht) geprüft: verschachtelte Darstellung + korrekte Post-Zahlen pro Monat/Jahr,
      Anker-Zuordnung zeigt exakt auf den neuesten Post des jeweiligen Monats (per
      `getBoundingClientRect`/DOM-Inhalt verifiziert), Klick-Handler (Jahr **und** Monat) lösen
      korrekt aus (`preventDefault` bestätigt), `scrollIntoView` trifft mit nicht-smoothem
      Verhalten exakt das richtige Ziel
- [x] **Bekannte Verifikations-Lücke, ehrlich dokumentiert:** Die smooth-scroll-Animation und das
      Live-Aufleuchten des aktiven Monats beim Scrollen (Scroll-Spy) konnten im eingebetteten
      Vorschau-Browser NICHT visuell bestätigt werden — `document.visibilityState` dieses Browser-
      Tabs ist `"hidden"`, wodurch Chromium `requestAnimationFrame` (0 Aufrufe in 1,5s gemessen)
      und `IntersectionObserver`-Callbacks (nie ausgelöst, auch nicht der garantierte Initial-
      Callback) komplett aussetzt — bestätigt kein Code-Fehler, sondern eine Drosselung durch den
      Browser für nicht sichtbare Tabs. Die zugrunde liegende Logik (Ziel-Element, Bounding-Rect-
      Mathematik der Erkennungszone, Beobachter-Setup/Teardown) ist korrekt verifiziert; die
      Animation selbst sollte in einem echten, sichtbaren Browser-Tab normal funktionieren.
      Empfehlung: einmal manuell im echten Browser gegenprüfen, sobald deployed
- [x] **Nutzer-Feedback nach erstem Test:** letztes (ältestes) Jahr wurde nie als aktiv markiert,
      da diese Posts am Seitenende stehen und nicht mehr genug Inhalt folgt, um sie ins
      Erkennungsband nahe der Viewport-Oberkante zu schieben — klassisches
      Scroll-Spy-Problem. Fix: zusätzlicher `scroll`-Listener, der bei Erreichen des Seitenendes
      (`innerHeight + scrollY >= scrollHeight - 2`) den letzten Cluster erzwungen aktiv setzt.
      Im Browser verifiziert (nach anfänglich falschem Testergebnis durch zu schnellen
      Scroll-Dispatch vor vollständiger Hydration) — Jahr **und** Monat werden am Seitenende
      jetzt korrekt aktiv markiert
- [x] Nebenbei: verwaisten `vite dev`-Prozess aus einer früheren Session-Runde gefunden
      (PID auf Port 5173, blockierte wiederholt den Standard-Port) und beendet
- [x] Nutzer-Rückfrage: "nicht ganz sauber" bei wenigen/kurzen Posts — teils erwartetes Verhalten
      (mehr/längerer Content → mehr Scroll-Strecke zwischen Clustern → graduellere Hervorhebung,
      bessert sich mit der Zeit von selbst), teils schlicht zu wenig Testdaten (aktuell nur 2 echte
      Posts, beide im selben Monat — nur ein Cluster vorhanden, kein Wechsel testbar)
- [x] Zusätzlich behoben: neuester Cluster wird jetzt sofort beim Laden aktiv markiert (vorher erst
      nach erstem Scrollen) — `activeAnchorId` defaultet auf den neuesten Anker, per `untrack()`
      bewusst nur als Startwert (kein reaktiver Re-Trigger bei späteren `clusters`-Änderungen);
      im Browser verifiziert, `npm run check` 0 Fehler/Warnungen
- [ ] Nicht deployed — lokale Änderung, noch nicht auf achis.blog live

## Foto & Album löschen — erledigt

- [x] `src/lib/server/posts.ts` neu: `deletePostCascade()` (bisherige `posts/[id]`-`delete`-Logik
      extrahiert, unverändertes Verhalten) + `isPostNowEmpty()` — Helper, um zu entscheiden, ob ein
      Post nach dem Foto-Löschen nur noch eine leere Hülle ist
- [x] **Bug gefunden + gefixt:** `isPostNowEmpty()` prüfte anfangs `!title && !text`, aber
      Status-Posts (`isStatusPost: true`, aus der `addPhotos`-Action) haben IMMER einen
      automatisch generierten Titel ("Ein neues Foto zum Album ... wurde hinzugefügt") — dieser
      zählte fälschlich als "hat Inhalt", wodurch leere Status-Posts nie automatisch gelöscht
      wurden (im Browser-Test bestätigt: Post blieb mit 0 Fotos im Feed stehen). Fix: bei
      Status-Posts wird nur `text` geprüft, der Auto-Titel wird ignoriert; bei normalen Posts
      bleiben Titel UND Text relevant
- [x] `src/routes/albums/[id]/+page.server.ts`: neue `deletePhoto`-Action (löscht Foto-Datei+Zeile,
      löscht den besitzenden Post automatisch mit, falls danach leer) und `deleteAlbum`-Action
      (löscht alle Fotos über alle beitragenden Posts hinweg, löscht alle reinen Status-Posts,
      detached+behält den Ursprungs-Post falls er eigenen Text hat — sonst wird auch er
      mitgelöscht —, löscht zuletzt die Album-Zeile, `redirect(303, '/albums')`)
- [x] `src/lib/components/PhotoLightbox.svelte`: neue optionale `deleteAction`/`onDeleted`-Props,
      Lösch-Button (🗑) neben Schließen, echtes `<form>` (funktioniert auch ohne JS), `confirm()`
      vor dem Submit
- [x] `src/routes/albums/[id]/+page.svelte`: Lightbox-Wiring (`invalidateAll()` + `goToIndex`/
      `close()` je nachdem ob noch Fotos übrig sind) + neuer `DeleteAlbumButton` im Album-Header
- [x] `src/routes/albums/[id]/photo/[photoId]/+page.svelte`: Type-Import auf `PageData`
      umgestellt (für `data.user`), Lightbox-Props ergänzt (`onDeleted` navigiert per `goto` zurück
      zum Album — verhindert denselben 404-Race-Bug, den `DeletePostButton`s `afterDelete`-Pattern
      schon einmal behoben hat)
- [x] `src/lib/components/DeleteAlbumButton.svelte` neu, Spiegelbild von `DeletePostButton.svelte`
- [x] Bewusst NICHT geändert: Feed (`PhotoGrid.svelte`), `/photos`-Stream — Foto-Löschen bleibt auf
      den Album-Kontext beschränkt
- [x] `npm run check` — 0 Fehler
- [x] Im Browser mit temporärem QA-User (danach gelöscht) end-to-end getestet: Foto aus
      Mehrfoto-Status-Post löschen → Post bleibt; letztes Foto eines Status-Posts löschen → Post
      verschwindet automatisch (nach Bugfix bestätigt); Album mit textbehaftetem Ursprungs-Post
      löschen → Ursprungs-Post bleibt als Text-Post (`albumId` null), alle Status-Posts + Fotos
      weg, Album weg, Redirect zu `/albums`; Album mit leerem Ursprungs-Post löschen →
      Ursprungs-Post wird ebenfalls mitgelöscht; Standalone-Permalink-Löschung
      (`/albums/[id]/photo/[photoId]` direkt aufgerufen) → sauberer `goto` zurück, kein
      404-Flash; Datei/DB-Konsistenz nach jedem Test geprüft (keine verwaisten Dateien)
- [ ] Nicht deployed — lokale Änderung, noch nicht auf achis.blog live

## Responsive Desktop/Tablet-Layout — erledigt

- [x] App war komplett mobile-only (eine feste `.page`-Spalte, `max-width:500px`, keine einzige
      `@media`-Query im ganzen Code, feste 3-/2-Spalten-Grids)
- [x] Breakpoints: 768px (Tablet), 1024px (Desktop) — hartcodiert pro Komponente (keine
      Preprocessing-Pipeline vorhanden, CSS Custom Properties funktionieren nicht als
      `@media`-Bedingung ohne PostCSS-Plugin)
- [x] `src/routes/+layout.svelte`: neue `.app-shell`-Grid-Struktur — bei ≥1024px 3 Spalten
      (Sidebar 240px / Hauptinhalt max. 680px / Footer-Rail 280px, `max-width:1240px` gedeckelt,
      zentriert). Sidebar zeigt Feed/Fotos/Alben + Login-Status, `position:sticky`. Mobile/Tablet
      (<1024px) unverändert: bestehende Topnav (jetzt bis 640px bei Tablet verbreitert)
- [x] `/login` bleibt bei ≥1024px bewusst chrome-frei (kein Sidebar/Footer-Rail) über
      `isLoginPage`-Check + `.chrome-free-desktop`-Klasse; bei Mobile/Tablet unverändert wie vorher
- [x] `src/lib/components/Footer.svelte`: neuer `desktopRail`-Prop — wird bei ≥1024px zur rechten
      Sidebar (`grid-column:3; position:sticky`), bei `desktopRail=false` (Login) komplett
      ausgeblendet
- [x] `src/lib/app.css`: `.page` bekommt 640px (Tablet) / wird bei Desktop redundant (100%, da
      `.main-col`-Grid-Track die eigentliche 680px-Grenze übernimmt — keine zwei Breiten-Werte,
      die auseinanderlaufen können)
- [x] Grid-Dichte ab 768px: `/photos` 3→4 Spalten, `/albums` 2→3 Spalten, `/albums/[id]` 3→4
      Spalten (eigene CSS-Kopie, separat geändert)
- [x] `PhotoLightbox.svelte`: Close/Prev/Next-Buttons bekommen ab 1024px größere Abstände/Größen
      (waren mobil-daumen-optimiert, wirkten bei breitem Viewport verloren)
- [x] `PhotoGrid.svelte`: `.single`-Foto-Höhe ab 768px 500px→600px (sonst mehr Bildausschnitt
      abgeschnitten bei breiterer Spalte, gleicher Höhen-Deckel)
- [x] Impressum/Datenschutz: `.prose` bekommt eigene schmalere Lesebreite (620px statt 680px)
- [x] `npm run check` — 0 Fehler
- [x] Im Browser bei 375×812 (Mobile, unverändert), 768×1024 (Tablet, breiter + dichtere Grids,
      kein Sidebar), 1280×800 und 1920×1080 (Desktop, Sidebar+Rail, `.app-shell` bei 1240px
      gedeckelt) geprüft — Feed, Fotos, Alben, Post-Detail, Lightbox (Button-Position + Overlay
      deckt Sidebar korrekt ab), Login (chrome-frei ab 1024px), Impressum (schmalere Breite);
      eingeloggt (temporärer QA-User, danach gelöscht) und ausgeloggt getestet; keine
      Konsolenfehler
- [ ] Nicht deployed — lokale Änderung, noch nicht auf achis.blog live

## Wählbare Uhrzeit bei neuem Post — erledigt

- [x] Inkonsistenz: Datum beim Post war editierbar, Uhrzeit lief aber immer auf `now()` mit
      (`resolveCreatedAt()` nahm nur `date` entgegen)
- [x] `src/lib/components/PostComposer.svelte`: neues `<input type="time">`-Feld neben dem
      Datumsfeld (`nowLocalTime()`-Default, gleiche Reset-nach-Submit-Logik wie beim Datum
      — `formElement.reset()` + `tick()` vor Reassign, siehe bestehender Kommentar)
- [x] `src/routes/posts/new/+page.server.ts`: `resolveCreatedAt(dateInput, timeInput)` kombiniert
      jetzt Datum + gewählte Uhrzeit; fehlt/ungültig ist die Uhrzeit, Fallback auf aktuelle Uhrzeit
      (wie zuvor); Sekunden/Millisekunden kommen weiterhin von `now()` (nur für Sortierstabilität
      bei mehreren Posts in derselben Minute, nicht user-relevant)
- [x] `npm run check` — 0 Fehler
- [x] Im Browser geprüft (temporärer QA-User, danach gelöscht): Post mit Datum 15.03.2020 + Uhrzeit
      09:30 erstellt → `created_at` in der DB tatsächlich `2020-03-15 09:30:xx` (lokale Zeit)

## Foto-Uploads: Resize + WebP-Konvertierung — erledigt

- [x] Ursache für lange Ladezeiten auf `/photos` gefunden: Originalfotos wurden 1:1 gespeichert und
      ausgeliefert (bestätigt live auf achis.blog: ein einzelnes Foto lud 5,79 MB, ~915 ms allein
      Netzwerk-Transfer) — deckt sich mit dem bekannten Gap "keine Bildkompression/Thumbnails"
- [x] `sharp` als Dependency ergänzt (`package.json`)
- [x] `src/lib/server/storage.ts`: `saveUploadedPhoto()` wandelt den hochgeladenen Buffer jetzt
      direkt im Speicher um (`sharp().rotate().resize({width: 2000, withoutEnlargement:
      true}).webp({quality: 80})`) und schreibt nur das Ergebnis auf die Platte — das Original
      wird nie geschrieben, es gibt also nichts nachträglich zu löschen. `.rotate()` bäckt die
      EXIF-Orientierung in die Pixel ein, bevor sie beim Re-Encoding verloren geht. Erzeugte
      Dateien heißen jetzt immer `<uuid>.webp`, unabhängig vom Original-Dateityp;
      `photo.originalName` behält weiterhin den ursprünglichen Dateinamen (nur Anzeige-Metadatum,
      nicht Pfadbestandteil)
- [x] Alte `safeExtension()`-Hilfsfunktion entfernt (nicht mehr gebraucht, da Output-Format fix ist)
- [x] Beide Upload-Stellen (`routes/posts/new/+page.server.ts`, `routes/albums/[id]/+page.server.ts`
      `addPhotos`-Action) unverändert — rufen weiterhin nur `saveUploadedPhoto(file)` auf
- [x] `npm run check` — 0 Fehler
- [x] End-to-End im Dev-Server geprüft (temporärer QA-Test-User, danach wieder gelöscht): Upload
      eines echten 1,46-MB-JPGs über `POST /posts/new` (curl mit Session-Cookie, da Datei-Uploads
      sich über das Browser-Automatisierungstool nicht simulieren lassen) → gespeicherte Datei ist
      `.webp`, 304 KB (−79 %), DB-Zeile korrekt (`filename` endet auf `.webp`, `original_name`
      bleibt `.jpg`); `/uploads/<file>.webp` liefert `Content-Type: image/webp` mit korrektem
      `Cache-Control`
- [x] Bestehende Alt-Fotos (unverkleinerte Originale) — kein Nachzieh-Skript nötig, Nutzer löscht
      die alten Fotos manuell selbst statt sie zu konvertieren
- [ ] Nicht deployed — lokale Änderung, noch nicht auf achis.blog live

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
