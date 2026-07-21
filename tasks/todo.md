# Todo

## Kanonische URLs + SEO-Metadaten für Alben & Einzelfotos — erledigt

Direkte Fortsetzung des Posts-Features (siehe unten). Nutzerentscheidung per Rückfrage: Alben
bekommen exakt dieselbe Slug-Behandlung wie Posts (Titel existiert, eindeutig genug). Einzelne
Fotos bekommen bewusst **keinen eigenen Slug** — sie haben keinen Titel/Inhalt, nur Metadaten
(Canonical-Link, og:image = das Foto selbst, og:title vom zugehörigen Post/Album), URL bleibt bei
der rohen Foto-ID.

- [x] `album.slug` (nullable + unique, wie `post.slug`), per `sqlite3` lokal ergänzt
- [x] `src/lib/server/albums.ts` neu: `generateAlbumSlug()`/`findAlbumBySlugOrId()`, spiegelt
      `posts.ts`s Pendants 1:1
- [x] **Drei** Album-Erstellungsstellen gefunden und alle auf `id`+`slug` umgestellt:
      `albums/+page.server.ts` (`createAlbum`), `posts/new/+page.server.ts` (`saveAsAlbum`-Zweig),
      `photos/+page.server.ts` (`createAlbumFromSelection`, beim Ersuchen zuerst übersehen, im
      Nachhinein per Grep-Sweep über `insert(album)` gefunden)
- [x] `scripts/backfill-album-slugs.mjs` + `npm run backfill-album-slugs` (lokale Dev-DB hatte 0
      Alben, daher No-Op, aber vor dem nächsten Deploy nötig)
- [x] Route `albums/[id]` → `albums/[slug]` umbenannt (inkl. `photo/[photoId]`), Load/Actions lösen
      per `findAlbumBySlugOrId` auf, `redirect(301, ...)` bei Alt-Link über die rohe ID
- [x] Canonical/OG-Metadaten auf `albums/[slug]/+page.svelte` (kein Description-Tag — Alben haben
      keine eigene Textquelle, Layout-Fallback greift)
- [x] Metadaten (Canonical, og:image, og:title) auf allen drei Foto-Permalink-Kontexten ergänzt:
      `posts/[slug]/photo/[photoId]` (og:description via bestehendes `buildPostExcerpt`),
      `albums/[slug]/photo/[photoId]`, `photos/[photoId]` (Stream-Kontext — hatte bisher gar keinen
      Post-Bezug geladen, dafür eine gezielte Zusatzabfrage auf den Titel des besitzenden Posts
      ergänzt, nur für das jeweils angezeigte Foto, nicht die ganze Liste)
- [x] Interne Links umgestellt: `PostCard.svelte` (Album-Pill), `DeleteAlbumButton.svelte`
      (`albumId`-Prop zu `albumSlug`), `albums/+page.svelte`-Übersicht
- [x] **Bug beim eigenen Testen gefunden + gefixt (betraf auch das bereits gemergte Posts-Feature!):**
      alle `redirect(301/303, ...)`-Aufrufe, die einen Slug mit Nicht-ASCII-Zeichen (Umlaute) roh in
      die Ziel-URL einsetzten, schickten den `Location`-Header mit rohen UTF-8-Bytes statt
      Prozent-Kodierung — HTTP-Header dürfen das nicht, das Ergebnis war ein kaputtes Zeichen
      (`%E4` statt `%C3%A4`, per `curl -D -` am rohen Header bestätigt). Betraf **7 Stellen**
      insgesamt (4 neue Album-Redirects + 3 bereits vom Posts-Feature: `posts/[slug]` load,
      `posts/[slug]/photo/[photoId]` load, sowie die beiden `redirect(303, /albums/{slug})` nach
      Alben-Erstellung) — alle mit `encodeURIComponent()` um das Slug-Segment gefixt. Ohne diesen
      Fund wäre jeder alte rohe-ID-Link zu einem Post/Album mit Umlauten im Titel nach dem Redirect
      auf eine kaputte 404-URL gelandet
- [x] `npm run check` — 0 Fehler
- [x] Im Browser + `curl` (Datei-Uploads lassen sich über das Browser-Automatisierungstool nicht
      simulieren, bekannte Einschränkung) mit temporärem QA-User (danach gelöscht) end-to-end
      getestet: Album mit Umlaut-Titel über `posts/new`s `saveAsAlbum`-Zweig erstellt (2 echte
      PNG-Testfotos per multipart) → korrekter Slug `testalbum-verify-ärger`; Album-Seite zeigt
      korrekte Canonical-/OG-Metadaten, Fotogrid verlinkt korrekt auf Slug-basierte Foto-URLs;
      Foto-Permalink in allen drei Kontexten (post-, album-, stream-scoped) mit korrekten
      Metadaten/og:image bestätigt; alter roher Album-Link redirectet nach dem Fix korrekt (per
      `curl`-Header UND im Browser verifiziert — erste Browser-Prüfung zeigte fälschlich noch den
      kaputten gecachten 301 von vor dem Fix, mit `?cachebust`-Query-Param umgangen); Album- und
      Post-Löschung (Kaskade) hinterließen keine Datei-Waisen; Test-Alben/-Posts/-User danach
      vollständig entfernt (lokale DB wieder im Ausgangszustand, nur der vorbestehende `TEST`-Post
      übrig)
- [ ] Nicht deployed — Produktions-DB braucht dieselbe `ALTER TABLE`/Unique-Index-Ergänzung für
      `album.slug` plus `npm run backfill-album-slugs` vor dem nächsten `db:push` (zusätzlich zum
      bereits offenen `backfill-post-slugs`-Punkt aus dem Posts-Feature unten)

## Kanonische URLs + SEO-Metadaten für Posts — erledigt

Plan mit dem Nutzer abgestimmt (Details: `/Users/adrian/.claude/plans/k-nnen-wir-den-posts-polished-sprout.md`).
Nutzerentscheidungen: Slug IST die URL (`/posts/{slug}`, nicht nur dekorativ neben der ID), Status-
Posts bekommen keine SEO-Sonderbehandlung (kein `noindex`) — sie hatten schon immer einen
auto-generierten Titel und werden dadurch automatisch genauso behandelt wie echte Posts.

- [x] `src/lib/server/slug.ts` neu: generisches `slugify()`, aus `tags.ts`s `slugifyTag()`
      verallgemeinert (`slugifyTag` bleibt als dünner Re-Export bestehen, keine Call-Site-Änderung)
- [x] Neue Spalte `post.slug` (nullable + `unique()` — SQLite erlaubt mehrere NULLs unter einem
      UNIQUE-Index, folgt damit demselben sicheren Muster wie die GPS-Spalten). Per `sqlite3` direkt
      angelegt (`ALTER TABLE` + `CREATE UNIQUE INDEX`), kein `db:push`-Risiko
- [x] `src/lib/server/posts.ts`: `generatePostSlug(title, id)` (Basis = `slugify(title)`, fällt bei
      leerem/unbrauchbarem Titel auf die eigene UUID zurück, `-2`/`-3`-Suffix bei Kollision) +
      `findPostBySlugOrId(param)` (Slug zuerst, dann ID als Rückwärtskompat-Fallback für Alt-Links)
- [x] **Slug ist unveränderlich** — wird einmalig bei Erstellung generiert (`id` dafür jetzt per
      `randomUUID()` selbst erzeugt statt Schema-Default, da er ggf. selbst als Slug-Basis dient)
      und bleibt beim späteren Bearbeiten des Titels bewusst bestehen (kein Redirect-Tabellen-Bedarf)
- [x] `scripts/backfill-post-slugs.mjs` neu (idempotent, Vorbild `backfill-post-blocks.mjs`),
      `npm run backfill-post-slugs` — lokal einmalig gelaufen (1 bestehender Post: `TEST` → `test`)
- [x] Route `posts/[id]` → `posts/[slug]` umbenannt (inkl. `photo/[photoId]`-Unterordner); Laden/
      Actions lösen jetzt per `findPostBySlugOrId` auf, `redirect(301, ...)` bei Treffer über die
      alte rohe ID (Alt-Links bleiben funktionsfähig)
- [x] `PhotoGrid.svelte` bewusst **unverändert** gelassen — Foto-Permalinks bauen weiterhin auf der
      rohen `photo.postId` auf, die umbenannte Route löst ID oder Slug transparent auf
- [x] SEO-Metadaten auf der Post-Seite: `<link rel="canonical">`, `og:*`, `twitter:card`,
      Description aus dem ersten Text-Block (`src/lib/server/seo.ts`, grobe Markdown-Bereinigung +
      Kürzung auf ~160 Zeichen), OG-Bild unter Beachtung der "Origin-Post zeigt `album.photos`"-Regel
- [x] **Bug beim eigenen Testen gefunden + gefixt:** `app.html` hatte eine statische
      `<meta name="description">`, die zusätzlich zur neuen Pro-Seiten-Description im DOM landete —
      zwei `meta[name=description]`-Tags gleichzeitig, Browser/Crawler nehmen den ersten (die
      statische, generische) und ignorieren die neue. Fix: statisches Tag aus `app.html` entfernt,
      stattdessen bedingt im Root-`+layout.svelte` gerendert (`{#if !page.data.description}`) —
      Fallback bleibt für alle Seiten ohne eigene Description erhalten, `App.PageData.description?`
      in `app.d.ts` ergänzt
- [x] Interne Links auf `post.slug` umgestellt: `PostCard.svelte`-Permalink,
      `DeletePostButton`/`EditPostForm` (`postId`-Prop zu `postSlug` umbenannt, Formular-`action`
      zeigt jetzt auf die Slug-URL), `albums/[id]`s "Zum Ursprungs-Post"-Link (neue Zusatzabfrage im
      Load für den Origin-Post-Slug)
- [x] `npm run check` — 0 Fehler
- [x] Im Browser mit temporärem QA-User (danach gelöscht) end-to-end getestet: Post mit Umlauten im
      Titel ("Ärger im Café – Größenwahn?!") → Slug `ärger-im-café-größenwahn`; Titel danach
      bearbeitet → URL bleibt exakt gleich (Unveränderlichkeit bestätigt); zweiter Post mit
      identischem Titel wie ein bestehender ("TEST") → Slug korrekt `test-2`; alte rohe UUID-URL
      (Post- **und** Foto-Permalink) redirectet korrekt mit 301 auf die neue Slug-URL; Canonical-
      Link/OG-Tags/Twitter-Card per DOM-Inspektion bestätigt; Test-Posts + Test-User danach wieder
      vollständig entfernt (lokale DB im Ausgangszustand)
- [x] Album/Status-Post-Fall (`addPhotos`) nur per Code-Review + Typecheck verifiziert, nicht live
      im Browser — kein Album in der lokalen Dev-DB vorhanden und Datei-Uploads lassen sich über das
      Browser-Automatisierungstool nicht simulieren (bekannte Einschränkung, siehe frühere Einträge)
- [ ] Nicht deployed — Produktions-DB braucht dieselbe `ALTER TABLE`/Unique-Index-Ergänzung plus
      `npm run backfill-post-slugs` vor dem nächsten `db:push`

## Sicherheitshärtung: Login-Rate-Limiting + Security-Header — erledigt

Auf Nachfrage des Nutzers nach einem Security-Review (Login/Manipulation). Review-Ergebnis: Login/
Sessions/CSRF/Autorisierung (alle 9 Schreib-Aktionen einzeln geprüft) solide, zwei Lücken behoben.

- [x] `src/lib/server/rate-limit.ts` neu — In-Memory-Map, keyed by E-Mail (kein Verlass auf
      Client-IP, da der Reverse-Proxy laut README ohne `ADDRESS_HEADER`/`XFF_DEPTH` läuft und
      `getClientAddress()` sonst nur die Proxy-Adresse liefern würde). Erste 2 Fehlversuche frei
      (Typos), danach exponentiell wachsende Sperre (1s/2s/4s/… bis max. 60s), Reset bei Erfolg
- [x] `src/routes/login/+page.server.ts`: Rate-Limit-Check vor dem Passwortvergleich, `fail(429)`
      mit Restzeit bei aktiver Sperre
- [x] Security-Header ergänzt: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`
      (`src/hooks.server.ts`) sowie Content-Security-Policy über SvelteKits `kit.csp` (in
      `vite.config.ts`, nicht per Hand im hook — SvelteKit generiert dafür pro Request einen Nonce
      für seinen eigenen Inline-Bootstrap-`<script>`, das ginge von Hand nicht ohne
      `'unsafe-inline'` im ganzen `script-src`)
- [x] `src/app.html`: einzige verbliebene Inline-`style`-Angabe (`display: contents`) entfernt,
      nach `.sveltekit-body`-Klasse in `src/lib/app.css` verschoben — Voraussetzung dafür, dass
      `style-src` überhaupt ohne komplett offenes `unsafe-inline` auskommen könnte (siehe unten,
      wird trotzdem gebraucht, aber aus einem anderen Grund)
- [x] **Bug beim eigenen Testen gefunden + gefixt:** Erste CSP-Version (`style-src 'self'` ohne
      `unsafe-inline`, händisch im hook gesetzt) hat die komplette App unstyled UND
      **interaktionslos** gerendert — Klicks auf Buttons taten nichts mehr. Ursache in zwei Teilen:
      (1) Vites Dev-Server injiziert CSS per HMR als Inline-`<style>`-Elemente, nicht als externe
      `<link>`-Dateien — bricht unter strikter `style-src`; (2) SvelteKit selbst injiziert (auch im
      **Produktions-Build**, per curl gegen einen lokalen `node build/index.js` bestätigt) einen
      Inline-Bootstrap-`<script>`, der `script-src 'self'` ohne Nonce/Hash ebenfalls verletzt —
      das erklärt die kaputte Interaktivität. Behoben durch Umzug der gesamten CSP-Direktiven von
      `hooks.server.ts` in `vite.config.ts`s `sveltekit({ csp: {...} })`-Option (SvelteKit >=2.62
      erlaubt Kit-Konfiguration direkt im Vite-Plugin statt in einer separaten `svelte.config.js`)
      — SvelteKit hängt den nötigen Nonce jetzt selbst an `script-src` an; `style-src` behält
      bewusst `'unsafe-inline'` (Styles sind ein deutlich schwächerer Angriffsvektor als Scripts,
      und sowohl Vites Dev-HMR als auch Sveltes eigene Transition-Inline-Styles brauchen es laut
      SvelteKit-Doku ohnehin)
- [x] `npm run check` — 0 Fehler
- [x] Mit temporärem QA-User (danach gelöscht) end-to-end getestet: Rate-Limiting (2 freie
      Fehlversuche, 3. normal, 4. → 429 mit Wartezeit, nach Ablauf wieder normaler 400-Fehler,
      erfolgreicher Login setzt Zähler zurück, danach wieder 2 freie Versuche); CSP-Header per curl
      bestätigt (inkl. dynamischem Nonce); Leaflet-Karte im LocationPicker lädt echte
      OpenStreetMap-Kacheln unter der strikten `img-src`-Direktive; Hydration/Klick-Interaktivität
      auf Feed, Fotos, Alben nach dem Fix bestätigt fehlerfrei (keine Konsolenfehler)
- [ ] Nicht deployed

## Einzelfoto-Löschen auf /photos — erledigt

Bisher war Foto-Löschen bewusst auf den Album-Kontext beschränkt (`albums/[id]`s `deletePhoto`);
`/photos` hatte gar keine Lösch-Option in der Lightbox — vom Nutzer als Lücke gemeldet.

- [x] `src/routes/photos/+page.server.ts`: neue `actions.deletePhoto` — fast identisch zu
      `albums/[id]`s `deletePhoto` (Datei+Zeile löschen, `pruneEmptyPhotoBlocks`, Post bei
      `isPostNowEmpty` kaskadierend mitlöschen), nur ohne die Album-Zugehörigkeits-Prüfung, da hier
      nicht auf ein bestimmtes Album beschränkt — jedes Foto im Stream (lose oder in einem Album)
      ist löschbar
- [x] `src/routes/photos/+page.svelte`: `PhotoLightbox` bekommt jetzt `deleteAction`/`onDeleted`
      (nur wenn `data.user`), `handlePhotoDeleted()` identisch zum bestehenden Muster in
      `albums/[id]/+page.svelte` (`invalidateAll()`, dann `goToIndex` oder `close()` falls keine
      Fotos mehr übrig)
- [x] `npm run check` — 0 Fehler
- [x] Mit temporärem QA-User (danach gelöscht) end-to-end getestet: Foto aus Mehrfoto-Post löschen
      → Post bleibt mit dem verbleibenden Foto, Datei korrekt von der Platte entfernt; letztes Foto
      eines **titellosen** Posts löschen → Post kaskadiert vollständig weg (Block+Zeile);
      (Gegenprobe bewusst mit einem titelbehafteten Post gemacht, blieb korrekt bestehen — deckt
      sich mit der bestehenden, unveränderten `isPostNowEmpty`-Regel: Titel allein zählt als
      Inhalt); Lightbox-Wiring im Browser bestätigt (🗑-Button erscheint, Formular zeigt korrekt auf
      `/photos?/deletePhoto` mit richtiger `photoId`) — tatsächlichen Klick nicht ausgelöst, da
      `confirm()`-Dialoge im Sandbox-Browser nicht automatisierbar sind (bekannte Einschränkung)
- [ ] Nicht deployed

## Album direkt erstellen (ohne Umweg über einen Post) — erledigt

Plan mit dem Nutzer abgestimmt (Details: `/Users/adrian/.claude/plans/prancy-scribbling-goblet.md`).
Zwei Einstiegspunkte: `/albums` (frischer Upload → neues Album) und `/photos` (lose Fotos per
Mehrfachauswahl bündeln, Foto bleibt im Ursprungs-Post, `originPostId` bleibt NULL).

- [x] `src/routes/albums/+page.server.ts`: `actions.createAlbum` (Post → Block/Fotos → Album →
      Rückschreiben, wie `posts/new`s `saveAsAlbum`-Branch, Redirect zu `/albums/{id}`)
- [x] `src/routes/albums/+page.svelte`: eingeklapptes "+ Neues Album"-Formular (Auf-/Zuklapp-Muster
      wie `LocationPicker`), nur sichtbar für `data.user`
- [x] `src/routes/photos/+page.server.ts`: `actions.createAlbumFromSelection` (serverseitige
      Gegenprüfung auf `albumId IS NULL`, kein `saveNewPostBlocks`, kein `postId`-Wechsel)
- [x] `src/routes/photos/+page.svelte`: Auswahlmodus (Checkbox + `bind:group`, nur lose Fotos —
      bereits eingeordnete Fotos werden abgedunkelt und sind nicht auswählbar), feste Leiste mit
      Anzahl/Titel-Feld/Submit bei Auswahl
- [x] Typ-Fix: beide Seiten nutzten `PageServerData` statt `PageData`, dadurch war `data.user`
      (aus dem Root-`+layout.server.ts` gemergt) nicht sichtbar — auf `PageData` umgestellt
- [x] `npm run check` — 0 Fehler
- [x] Mit temporärem QA-User (danach gelöscht) end-to-end getestet: Feature A (frischer Upload,
      <2 Dateien → 400, ≥2 → Album inkl. normalem editierbarem Ursprungs-Post korrekt angelegt);
      Feature B (zwei lose Fotos aus unterschiedlichen Posts per curl gebündelt → Album ohne
      `originPostId`, Fotos bleiben in ihren Ursprungs-Posts, `/photos` zeigt sie weiterhin;
      Gegenprüfung bestätigt: schon eingeordnetes Foto wird beim erneuten Bündeln serverseitig
      aussortiert, <2 verbleibende → 400); Auswahl-UI im echten Browser visuell verifiziert
      (Checkboxen nur auf losen Kacheln, abgedunkelte Kacheln bei bereits eingeordneten Fotos,
      Leiste mit korrekter Anzahl) — Submit dort bewusst nicht ausgelöst, da dabei das echte Foto
      des Nutzers betroffen gewesen wäre; Cascade-Sanity beim Aufräumen bestätigt (Post- und
      Album-Löschung hinterlassen keine Waisen)
- [ ] Nicht deployed

## Rich-Text + interleavable Text/Foto-Blöcke im Post-Composer — erledigt

Plan mit dem Nutzer abgestimmt (Details: `/Users/adrian/.claude/plans/prancy-scribbling-goblet.md`).
Entscheidungen: Markdown-Speicherformat, Tiptap-Editor, volle Block-Verschachtelung inkl. Edit-Flow,
plus neue Anforderung: Foto-Blöcke einzeln von `/photos`-Stream & Album ausschließbar (Infografiken).

- [x] Schema: neue Tabelle `postBlock` (id/postId/position/type/text), `photo.blockId` +
      `photo.excludeFromStream` (beide nullable ohne Default, DDL sicher per `sqlite3` angewendet,
      kein `db:push`-Risiko). `post.text` bleibt als Spalte bestehen (kein `DROP COLUMN`), wird von
      neuem Code aber nie mehr beschrieben/gelesen
- [x] Backfill-Skript `scripts/backfill-post-blocks.mjs` (idempotent, escaped Markdown-Sonderzeichen
      + Hard-Breaks pro Zeile für bestehenden Plain-Text, setzt `post.text` danach auf NULL) — mit
      synthetischen Alt-Format-Testposts verifiziert (Konvertierung + Re-Run-Idempotenz bestätigt);
      lokale Dev-DB hatte 0 echte Posts, daher kein Produktiv-Backfill hier nötig — **muss vor dem
      nächsten Deploy einmalig gegen die Prod-DB laufen** (`npm run backfill-post-blocks`)
- [x] `src/lib/markdown.ts` (marked + isomorphic-dompurify, `renderMarkdownToSafeHtml()`)
- [x] `src/lib/server/blocks.ts` (parseBlocksMeta / saveNewPostBlocks / reconcileEditedPostBlocks /
      pruneEmptyPhotoBlocks / blocksMetaHasContent / countNonExcludedNewFiles)
- [x] `src/lib/components/TextBlockEditor.svelte` (Tiptap: StarterKit inkl. Link, Markdown-Extension
      via `tiptap-markdown`, SSR-sicherer Dynamic-Import-in-`onMount` wie `LocationPicker`) +
      `BlockEditor.svelte` (Block-Liste, Umsortieren, Ausschließen-Checkbox pro Foto-Block,
      `blocksMeta`-Hidden-Input, `reset()`)
- [x] `PostComposer.svelte`, `EditPostForm.svelte`, `PostCard.svelte` auf Blocks umgestellt;
      Album-Ursprungsregel: erster nicht-ausgeschlossener Foto-Block wird durch die volle,
      wachsende Album-Liste ersetzt, ausgeschlossene Blöcke bleiben immer separat sichtbar
- [x] `posts/new`, `posts/[id]` (load+edit), `+page.server.ts`, `tags/[tag]`, `albums/[id]`
      (addPhotos/deletePhoto/deleteAlbum) angepasst; `posts.ts` (`deletePostCascade` löscht jetzt
      auch `post_block`-Zeilen, `isPostNowEmpty` prüft Blocks statt flachem Textfeld)
- [x] **Bug gefunden + gefixt:** `/photos`-Stream und die Stream-Lightbox
      (`/photos/[photoId]`) filterten `excludeFromStream` anfangs gar nicht — Infografik-Fotos
      wären trotz Checkbox im öffentlichen Foto-Stream erschienen. Gefixt in beiden
      `+page.server.ts`, per curl-Test bestätigt (Stream zeigt nur die nicht-ausgeschlossenen 2 von
      3 Test-Fotos)
- [x] Tiptap-Warnung "Duplicate extension names: ['link']" gefunden + gefixt — `@tiptap/starter-kit`
      v3 bringt die Link-Extension bereits mit, `@tiptap/extension-link` separat hinzuzufügen war
      redundant; Dependency entfernt, Link stattdessen über `StarterKit.configure({ link: {...} })`
      konfiguriert
- [x] `npm run check` — 0 Fehler/Warnungen
- [x] Im Browser mit temporärem QA-User (danach gelöscht) + `curl` (Datei-Uploads lassen sich über
      das Browser-Automatisierungstool nicht simulieren, gleiche Einschränkung wie beim
      WebP-Feature) end-to-end getestet: Formatierung (H2/H3, Fett, Kursiv, Liste, Zitat) im
      Composer erstellt und im Feed korrekt als sicheres HTML gerendert; Mehrfach-Foto-Block-Post
      mit einem als Infografik ausgeschlossenen Block + "Als Album speichern" → Album enthält nur
      die 2 nicht-ausgeschlossenen Fotos, `/photos` und `/albums/[id]` zeigen die Infografik nicht,
      Feed zeigt konsolidierte Album-Grid am ersten nicht-ausgeschlossenen Block und die Infografik
      separat an ihrer eigenen Position; Bearbeiten eines migrierten/bestehenden Posts (Foto-Block
      entfernen inkl. Datei+DB-Cleanup, Text-Formatierung ändern) über `reconcileEditedPostBlocks`
      verifiziert; `addPhotos` erzeugt jetzt korrekt Text- + Foto-Block mit fortlaufender Position;
      Status-Post-403-Guard weiterhin aktiv; Post- und Album-Löschung kaskadieren vollständig ohne
      Waisen (Dateien, `photo`-, `post_block`-, `post_tag`-Zeilen), auch über mehrere beitragende
      Posts hinweg
- [x] **Testtool-Einschränkung, kein Code-Fehler:** Enter-Tastendrücke wurden im Tiptap-Editor vom
      Browser-Automatisierungstool nicht immer als echte Zeilenumbrüche zugestellt (gleiche
      Kategorie wie das bereits dokumentierte Enter/Komma-Problem bei `TagInput`) — über gezielte
      Selection-Range-Manipulation + Button-Klicks umgangen, echte Tastatureingabe in einem
      normalen Browser sollte zuverlässig funktionieren. `window.prompt()` für den Link-Button
      ließ sich im Sandbox-Browser ebenfalls nicht automatisiert bedienen (native Dialoge) — Logik
      ist Standard-Tiptap-API, nicht separat verifizierbar
- [x] Vorbestehende `npm audit`-Findings (SvelteKit/cookie, drizzle-kit/esbuild) unverändert, nicht
      durch die neuen Dependencies verursacht
- [x] **Bug gefunden + gefixt:** `EditPostForm.svelte`s `<form>` hatte kein
      `enctype="multipart/form-data"` — war nie nötig, solange dort keine Foto-Uploads möglich
      waren; jetzt kann man beim Bearbeiten neue Foto-Blöcke hinzufügen, also fehlte es. Live vom
      Nutzer reproduziert (Konsolenfehler beim Speichern nach Foto-Block-Entfernen + erneutem
      Hinzufügen), Fix verifiziert: identischer Ablauf per QA-User + curl nachgestellt, Server-Seite
      persistiert korrekt, Client-Fehler verschwunden nach dem Attribut-Fix
- [x] **Deploy-Vorfall (bereits behoben):** Der Code war schon live auf achis.blog (`build/` enthielt
      bereits die `blocks`-Query), aber `scripts/deploy.sh`s DB-Schema-Push läuft nur bei einem
      echten TTY und wurde beim tatsächlichen Deploy übersprungen — dabei kam heraus, dass das
      **nicht nur** für dieses Feature passiert ist: der Prod-DB fehlten zusätzlich auch die
      `tag`/`post_tag`-Tabellen (Tags-Feature) und alle 5 GPS-Spalten auf `post`
      (GPS-Standort-Feature) — beide laut `todo.md` längst als "deployed" markiert, aber die
      DB-Migration war nie tatsächlich gegen die Prod-DB gelaufen. Live-Feed zeigte deshalb 500.
      Alles per sicherer additiver DDL (neue Tabellen + nullable Spalten, kein Datenverlust-Risiko)
      direkt auf yaksha nachgeholt, Backfill-Skript einmalig gegen die Prod-DB gelaufen (1 Post
      konvertiert), Service neu gestartet (durch den Nutzer, `sudo` braucht TTY) — Feed, Fotos,
      Alben, Tags liefern jetzt wieder 200 auf achis.blog
- [ ] **Lektion für künftige Deploys:** `scripts/deploy.sh` beim nächsten Mal in einem echten
      interaktiven Terminal laufen lassen (nicht nur den Build/Sync-Teil), damit der
      `drizzle-kit push`-Schritt tatsächlich durchläuft und nicht wieder stillschweigend
      übersprungen wird — sonst driftet die Prod-DB erneut vom Code weg

## GPS-Standort-Feature — erledigt

- [x] Neue nullable Spalten auf `post` (`latitude`, `longitude`, `location_place`,
      `location_country`, `location_name`) — bewusst alle ohne `NOT NULL`/Default, um das bekannte
      `db:push`-Risiko (destruktiver Vorschlag bei NOT-NULL-Spalten, siehe `isStatusPost`-Vorfall)
      von vornherein zu vermeiden
- [x] `leaflet` + `@types/leaflet` installiert
- [x] Neuer Endpunkt `src/routes/api/reverse-geocode/+server.ts` — erster serverseitiger
      Outbound-Fetch des Projekts, Proxy zu Nominatim, auth-gated (gleiche Begründung wie
      addPhotos/delete/edit: verhindert, dass Besucher über diesen Server Nominatims
      Rate-Limit strapazieren)
- [x] `src/lib/components/LocationPicker.svelte` neu: Leaflet-Karte (SSR-sicher per dynamischem
      `import('leaflet')` in `onMount`, CSS-Import auf Modul-Ebene unproblematisch), Klick setzt
      draggable Marker, "Meinen Standort verwenden"-Button (Browser-Geolocation), debounced
      Reverse-Geocoding, Ort/Land/POI-Name frei editierbar, `reset()`-Methode nach demselben
      `bind:this`-Muster wie `TagInput`
      Sitzung bestätigt: exportierte Funktionen sind unabhängig von Runes/Legacy-Modus über
      `bind:this` erreichbar)
- [x] `PostComposer`/`EditPostForm` um `LocationPicker` erweitert, `PostCard` zeigt Standort als
      reine Text-Pill (📍 POI · Ort, Land) mit Link zu openstreetmap.org — **keine** eingebettete
      Karte für Leser, nur der Betreiber lädt beim Erstellen/Bearbeiten Kartenkacheln
- [x] Datenschutzerklärung angepasst: §7 präzisiert (Karten werden nur im Browser des Betreibers
      geladen, nie bei Lesern), §8 neuer Unterabsatz zur Nominatim-Weitergabe (nur serverseitig,
      nur bei aktivem Setzen/Ändern eines Standorts durch den Betreiber)
- [x] `npm run check` — 0 Fehler/Warnungen (`state_referenced_locally`-Warnung in
      `LocationPicker.svelte` erwartungsgemäß per `untrack()` aufgelöst, gleiches Muster wie
      `TagInput`/`PostTimeline`)
- [x] Im Browser mit temporärem QA-User (danach gelöscht) end-to-end getestet: Karte rendert ohne
      SSR-/Hydration-Fehler, Klick auf Karte setzt Marker, Reverse-Geocoding liefert innerhalb ~1s
      korrekten Ort/Land/POI-Namen (getestet mit einem Punkt im Riesengebirge → "Rokytnice nad
      Jizerou", "Česko", POI "Kládová cesta"), POI manuell angepasst, Post erstellt → Feed zeigt
      korrekte Pill + korrekten openstreetmap.org-Link, DB-Werte korrekt persistiert; Bearbeiten
      bestehender Post → Picker vorbefüllt mit vorhandenem Standort (Karte bereits expandiert,
      alle Felder korrekt); Standort über "Standort entfernen" im Edit-Formular gelöscht,
      gespeichert → alle fünf Spalten korrekt auf NULL zurückgesetzt, Pill verschwindet
- [x] Re-Geocoding beim Marker-Ziehen (`dragend`) nicht separat end-to-end getestet (Leaflet-
      Karteninstanz nicht von außen ansprechbar für Automatisierung) — nutzt aber exakt denselben
      Code-Pfad (`scheduleGeocode`/`runGeocode`) wie das bereits verifizierte Klick-Verhalten
- [x] "Meinen Standort verwenden" (Browser-Geolocation) nicht interaktiv getestet — passt zur
      bereits dokumentierten Einschränkung des Vorschau-Browser-Tools bei Berechtigungsdialogen
- [x] **Wichtiger Hinweis, nicht durch dieses Feature verursacht:** Bei der Verifikation aufgefallen,
      dass ein zweiter ursprünglicher Post (`ef9d947e...`, "Neue Fotos zum Album Volleyball wurden
      hinzugefügt", 19.07.2026 13:48, mit einem Foto) nicht mehr in der lokalen Dev-DB vorhanden
      ist. Geprüft und ausgeschlossen, dass meine Änderungen das verursacht haben (meine
      Edit-Aktion wirkt ausschließlich auf die konkret bearbeitete Post-ID, hier ein separater
      Test-Post) — Foto-Tabelle und `uploads/`-Ordner sind konsistent (kein verwaistes File),
      spricht für eine bereits zuvor sauber über die App gelöschte Zeile statt Datenkorruption.
      Da ich zu Sitzungsbeginn keinen Baseline-Check gemacht habe, kann ich nicht zweifelsfrei
      sagen, wann das passiert ist — falls das unerwartet war, bitte Bescheid geben
- [x] Deployed auf achis.blog (Build, Sync, `npm ci --omit=dev`, `drizzle-kit push` → "No changes
      detected" da Schema bereits synchron, Service-Neustart — alles über `scripts/deploy.sh`)

## `scripts/deploy.sh` — `db:push` ins Deploy integriert (erledigt)

- [x] Auf Wunsch: `npm run db:push` nicht mehr als separater manueller Schritt, sondern in
      `scripts/deploy.sh` integriert, TTY-gated (`[ -t 0 ]`) — `drizzle-kit push` braucht ein
      echtes Terminal für seinen (bei `strict:true` immer erscheinenden) Bestätigungsprompt, der
      nie blind auto-bestätigt werden darf (siehe `isStatusPost`-Vorfall). Läuft der Nutzer das
      Skript selbst interaktiv, wird der Schritt per `ssh -t` mit echtem Remote-Pseudo-Terminal
      ausgeführt; läuft es nicht-interaktiv (z.B. Agent-Shell), wird er übersprungen und
      stattdessen der manuelle Fallback-Hinweis ausgegeben
- [x] Zwei live gefundene und behobene Probleme dabei:
      1. `npx drizzle-kit push` allein reicht nicht — `drizzle.config.ts` macht selbst
         `require('drizzle-kit')`, aufgelöst gegen `node_modules` des Projekts; `npx`s
         On-Demand-Fetch in den npx-Cache erfüllt das nicht (`Cannot find module 'drizzle-kit'`).
         Fix: `npm install` (volle Deps inkl. `drizzle-kit` als devDependency) vor dem Push-Aufruf,
         zusätzlich zum bestehenden `npm ci --omit=dev` für die Laufzeit-Deps.
      2. `DATABASE_URL is not set` — die remote systemd-Unit setzt Env-Vars direkt über
         `Environment=`-Zeilen in der Unit-Datei (kein `.env`), eine reine `ssh`-Shell sieht davon
         nichts. Fix: `DATABASE_URL` wird für den Push-Aufruf explizit gesetzt, Wert als
         `REMOTE_DATABASE_URL="file:$REMOTE_DIR/data/local.db"` oben im Skript neben den anderen
         Konstanten gepflegt (muss manuell synchron gehalten werden mit der `Environment=
         DATABASE_URL=...`-Zeile der systemd-Unit, falls sich der DB-Pfad je ändert)
- [x] End-to-end mit echtem Deploy verifiziert (siehe GPS-Feature-Deploy oben)

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
- [x] Deployed auf achis.blog

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
- [x] Deployed auf achis.blog

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
- [x] Deployed auf achis.blog

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
- [x] Deployed auf achis.blog

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
- [x] Deployed auf achis.blog

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
