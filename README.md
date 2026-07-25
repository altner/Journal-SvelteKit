# Journal (SvelteKit)

Ein minimales, selbst gehostetes "Post & Foto"-Journal im Facebook-Look: Login, Posts mit Text
und/oder Fotos erstellen, mehrere Fotos optional als Album speichern. Einzelfotos landen im
allgemeinen Foto-Stream.

## Datenmodell

- **Post** – Titel (optional), Text (optional), Autor, Zeitstempel. Kann 0, 1 oder mehrere Fotos
  haben. Hat keinerlei Bezug zu Alben.
- **Photo** – gehört immer zu genau einem Post, taucht im Foto-Stream (`/photos`) auf.
- **Album** – komplett eigenständig (wie Checkin/Activity), eigene `album_photo`-Tabelle statt
  gemeinsamer `photo`-Tabelle. Entsteht direkt mit ≥2 eigenen Fotos (Web-Formular auf `/albums`
  oder Micropub), kein zugrundeliegender Post nötig. Weitere Fotos können später ergänzt werden.
- **Checkin** / **Activity** – ebenfalls komplett eigenständig, eigene Tabellen.

## Stack

- [SvelteKit](https://svelte.dev/docs/kit) mit `@sveltejs/adapter-node` (läuft als eigenständiger
  Node-Server auf deinem Server, kein externer Hosting-Dienst nötig)
- [Drizzle ORM](https://orm.drizzle.team/) + SQLite (über `@libsql/client`, keine native
  Kompilierung nötig)
- Login läuft über einen externen IndieAuth-Server (Passkey-basiert), kein lokales Passwort —
  Session-Cookie danach genau wie zuvor, bewusst kein Auth-Framework
- Fotos werden als Dateien auf dem Server-Dateisystem gespeichert (Pfad in der DB), ausgeliefert
  über die Route `/uploads/[filename]`

## Lokale Entwicklung

```bash
npm install
cp .env.example .env      # ggf. Werte anpassen
npm run db:push           # legt die SQLite-Tabellen an
npm run create-user -- "du@example.com" "Dein Name"
npm run dev -- --open
```

## Nutzer anlegen

Es gibt keine öffentliche Registrierung. Accounts werden über ein Skript angelegt:

```bash
npm run create-user -- "du@example.com" "Dein Name"
```

## Deployment auf eigenem Server

```bash
npm install
npm run build
npm run db:push
npm run create-user -- "du@example.com" "Dein Name"

# .env für Produktion anpassen, insbesondere:
#   ORIGIN=https://deine-domain.tld
#   NODE_ENV=production
#   DATABASE_URL=file:/var/lib/journal/local.db   (persistenter Pfad!)
#   UPLOAD_DIR=/var/lib/journal/uploads            (persistenter Pfad!)

node --env-file=.env build/index.js
```

Am besten mit einem Prozess-Manager (systemd-Service oder `pm2`) und einem Reverse Proxy
(nginx/Caddy) davor betreiben, der TLS terminiert und an `PORT` (Standard 3000) weiterleitet.

Wichtig:
- **`DATABASE_URL` und `UPLOAD_DIR` müssen auf einen persistenten Pfad zeigen**, der Deployments
  überlebt (nicht im Build-Ordner).
- **`BODY_SIZE_LIMIT`** in der `.env` steuert die maximale Upload-Größe pro Request (Standard im
  Adapter: 512 KB — in `.env.example` bereits auf `100M` gesetzt, da ein Aktivitäts-Upload GPX-Track
  und mehrere unverkleinerte Fotos in einem Request bündelt und real schon ~48 MB erreicht hat).
- **`ORIGIN`** muss auf deine echte URL gesetzt sein — SvelteKits CSRF-Schutz blockiert sonst
  Formular-Submits (Bearbeiten, Löschen, …), und der IndieAuth-Login baut `client_id`/`redirect_uri`
  direkt aus `ORIGIN` ab (muss exakt mit dem übereinstimmen, was beim IndieAuth-Server hinterlegt
  bzw. per Discovery erreichbar ist).

## Nützliche Skripte

| Befehl               | Zweck                                      |
| --------------------- | ------------------------------------------- |
| `npm run dev`          | Entwicklungsserver                          |
| `npm run build`        | Produktions-Build (`build/`)                |
| `npm run check`        | Typecheck (svelte-check)                    |
| `npm run db:push`      | Schema-Änderungen in die DB übernehmen      |
| `npm run db:studio`    | Drizzle Studio (DB im Browser ansehen)      |
| `npm run create-user`  | Login-Account anlegen (kein Passwort mehr, siehe unten) |

## Seiten

- `/` – Feed, neueste Posts zuerst
- `/photos` – Foto-Stream, aggregiert Fotos aus Posts, Aktivitäten, Checkins und Alben
- `/albums` – Alle Alben
- `/albums/[slug]` – Album-Detail mit allen zugehörigen Fotos
- `/login` – Anmelden per IndieAuth (kein Passwort — Redirect zum externen IndieAuth-Server)

Post-/Checkin-*Erstellung* gibt es nicht mehr als eigene Seite (siehe API unten). Album-Erstellung
läuft **beides**: ein "+ Neues Album"-Formular direkt auf `/albums`, und der Micropub-Endpoint.

## API

Erstellen von Posts und Checkins läuft ausschließlich über private, token-authentifizierte
Micropub-Endpunkte (eigene Apple Shortcuts per statischem Token, oder ein IndieAuth-Client wie der
separate Quill-Editor) — siehe [docs/api.md](docs/api.md). Alben können zusätzlich auch direkt über
die Web-UI angelegt werden. Bearbeiten/Löschen bereits bestehender Einträge bleibt immer normale
Web-UI.

## Bekannte Grenzen / mögliche nächste Schritte

- Login hängt am externen IndieAuth-Server — ist der nicht erreichbar, kommt niemand mehr rein
- Aktuell auf einen "Autor" ausgelegt; das Datenmodell trägt eine `authorId`, mehrere Accounts
  sind also grundsätzlich möglich, es gibt aber (noch) keine Rechteverwaltung zwischen Nutzern
- Keine Bildkompression/Thumbnails — Originale werden 1:1 gespeichert und ausgeliefert
