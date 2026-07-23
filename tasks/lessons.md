# Lessons

Lektionen aus Nutzerkorrekturen zu diesem Projekt (fb-journal). Nach jeder Korrektur kurz und
konkret ergänzen: was war falsch, was ist stattdessen richtig.

## Auth-Schutz über PROTECTED_PREFIXES allein reicht nicht bei Routen ohne `load`

`hooks.server.ts`s `PROTECTED_PREFIXES`-Check läuft nur bei einem echten HTTP-Request. Eine
Route wie `/posts/new`, die nur `actions` exportiert und **keine** `load`-Funktion hat, löst bei
Client-Side-Navigation (Klick auf `<a href="/posts/new">` in einer bereits geladenen SvelteKit-
App) **keinen Server-Request** aus — SvelteKit rendert die Seite rein clientseitig, der Hook
greift nie, und ein ausgeloggter Besucher sieht das Formular ungeschützt (erst beim Submit
schlägt die Action fehl, per direktem eigenem `if (!user)`-Check in der Action selbst). Auf
Live-achis.blog live reproduziert: `/posts/new` per Klick erreichbar ohne Login, obwohl direkter
GET/POST-Request via curl korrekt mit 303 zu `/login` umleitet.

Fix: jede geschützte Route braucht eine eigene `load`-Funktion mit explizitem Auth-Check (auch
wenn sie sonst nichts lädt) — das erzwingt den Server-Roundtrip, über den der Hook/Check
überhaupt erst laufen kann. Sich nicht allein auf den globalen Hook verlassen, wenn die Route
keine anderen Datenabhängigkeiten hat.

## Aktivitätsfotos: Kartenebenen und Inhaltsreihenfolge mitprüfen

Beim ersten Einbau der Aktivitätsfotos stand das Fotogrid vor der Streckenkarte und die gemeinsame
`PhotoLightbox` hatte nur `z-index: 100`. Leaflet verwendet für Karten-Panes und Bedienelemente
Werte bis 1000; dadurch blieb die Karte über einem geöffneten Aktivitätsfoto sichtbar. Richtig ist:
Die Lightbox liegt mit einer Ebene oberhalb sämtlicher Leaflet-Elemente, und Aktivitätskarten
ordnen den Inhalt konsistent als Statistiken → Streckenkarte → Fotos an. Beides auf Feed-Karte und
Detailseite prüfen.

## Einzelne Post-Fotos nicht in eine begrenzte Cover-Fläche zwingen

Ein einzelnes Foto wurde in `PhotoGrid` mit voller Breite, einer festen Maximalhöhe und
`object-fit: cover` kombiniert. Bei Hochkantbildern entstand dadurch faktisch ein annähernd
quadratischer Ausschnitt. Für Einzelbilder gilt stattdessen: volle verfügbare Breite und
`height: auto`, damit das gespeicherte Original-Seitenverhältnis vollständig sichtbar bleibt.
Feste Cover-Ausschnitte sind nur für Mehrfachfoto-Grids sinnvoll.

## Social- und Rechtlinks gehören nicht in die rechte Funktionsleiste

Der Footer wurde auf Desktop als Teil der sticky rechten Seitenleiste gerendert. Dadurch wirkten
Social-Profile, Impressum und Datenschutz wie eine konkurrierende Navigation neben dem Inhalt.
Diese Links gehören in einen eigenen Footer unterhalb der Inhalts-/Timeline-Zeile; die rechte
Leiste bleibt ausschließlich funktionalen, seitenbezogenen Elementen wie der Timeline vorbehalten.
Der Footer muss dabei auf Desktop alle drei Grid-Spalten (`1 / -1`) überspannen; über nur
Hauptspalte plus rechte Leiste wäre seine optische Mitte gegenüber der gesamten Seite verschoben.
## Footer und persönliche Links

- Den globalen Footer bewusst kompakt halten: persönliche Social-Profile gehören gesammelt auf die Seite „Über mich“; im Footer reichen die Verweise auf Über mich, Impressum und Datenschutz.
- Copyright und Inhaltslizenz bilden links einen eigenen kompakten Block; die Seitennavigation bleibt rechts davon klar getrennt.
- Die Seite „Über mich“ bleibt bewusst einspaltig: Porträt oben, Text und Profil-Links darunter; auch auf breiten Ansichten nicht in Bild- und Linkspalte aufteilen.
## Cursor-Pagination

- Auf der ersten Seite darf „Ältere“ nur erscheinen, wenn wirklich ein überzähliger Datensatz
  geladen wurde (`hasMore`). Das bloße Fehlen eines Cursors beweist nicht, dass eine Folgeseite
  existiert.

## Wartungsskripte im Deployment

- Wenn ein neues `npm run`-Wartungsskript nach einem Deploy auf dem Server ausgeführt werden soll,
  muss `scripts/` Teil der Synchronisation sein. Serverkommandos dürfen außerdem nicht zwingend
  eine `.env` voraussetzen, weil die Produktion ihre Variablen über systemd erhält.

## Leere Zustände

- Handlungsaufforderungen zum Erstellen oder Hochladen nur eingeloggten Nutzern zeigen. Öffentliche
  leere Übersichten bleiben neutral und beschreiben lediglich, dass noch keine Inhalte vorhanden sind.

## Statische Inhaltsbilder

- Ein unverändert aus `static/` geladenes Inhaltsbild erhält in der aktuellen Produktion keinen
  `Cache-Control`-Header. Für sichtbare Seitenbilder responsive AVIF-/WebP-Varianten über einen
  Vite-Import einbinden: Das reduziert die erste Übertragung und erzeugt gehashte, langfristig
  cachebare Build-URLs. Das Original in `static/` kann als Quelldatei erhalten bleiben.

## Bestätigung destruktiver Aktionen

- Eine Löschbestätigung nicht auf einen nativen `onsubmit`-Handler neben SvelteKits
  `use:enhance` verteilen: Der erweiterte Submit-Ablauf kann bereits starten, obwohl der andere
  Handler das Ereignis abbricht. Die Bestätigung gehört direkt in den `enhance`-Callback und muss
  dort mit `cancel()` stoppen.
- Bei einer zweistufigen Inline-Bestätigung ist der erste Auslöser immer `type="button"`. Nur der
  ausdrücklich bestätigende zweite Button darf das Formular absenden; so kann die Löschung auch
  vor der Hydrierung nicht versehentlich ohne Bestätigung ausgelöst werden.

## Test-Daten nie eine echte, bereits verlinkte Foto-Datei wiederverwenden

Beim Verifizieren des Checkin-Löschens wurde testweise ein `checkin_photo`-Datensatz mit dem
`filename` eines bereits existierenden, echten Fotos (Volleyball-Post) angelegt, statt eine eigene
Test-Datei hochzuladen. Der reguläre Lösch-Kaskaden-Code (`deleteCheckinCascade`/
`deletePostCascade`) löscht beim Löschen korrekt auch die Datei auf der Platte via
`deleteUploadedPhoto` — das betrifft dann aber **jede** DB-Zeile mit demselben `filename`, nicht
nur die Test-Zeile. Ergebnis: eine echte Foto-Datei wurde von der Platte gelöscht, obwohl nur der
Test-Checkin gelöscht werden sollte. Für Foto-bezogene Testdaten (egal ob Post, Checkin, Activity)
immer eine eigene, für den Test angelegte Datei in `uploads/` verwenden (oder eine Kopie einer
bestehenden Datei unter neuem Namen) — nie einen bestehenden `filename`-Wert aus der DB
wiederverwenden, auch nicht "nur zum Anzeigen".
