# Journal (SvelteKit)

Ein minimales, selbst gehostetes "Post & Foto"-Journal im Facebook-Look: Login, Posts mit Text
und/oder Fotos erstellen, mehrere Fotos optional als Album speichern. Einzelfotos landen im
allgemeinen Foto-Stream.

## Datenmodell

- **Post** – Titel (optional), Text (optional), Autor, Zeitstempel. Kann 0, 1 oder mehrere Fotos
  haben und optional zu einem Album gehören.
- **Photo** – gehört immer zu genau einem Post. Gehört zusätzlich zu einem Album, *wenn* beim
  Erstellen "als Album speichern" aktiviert wurde. Sonst bleibt es ohne Album-Zuordnung und taucht
  im Foto-Stream (`/photos`) auf.
- **Album** – entsteht aus einem Post heraus (mind. 2 Fotos + Checkbox aktiviert), bleibt mit
  diesem Ursprungs-Post verknüpft.

## Stack

- [SvelteKit](https://svelte.dev/docs/kit) mit `@sveltejs/adapter-node` (läuft als eigenständiger
  Node-Server auf deinem Server, kein externer Hosting-Dienst nötig)
- [Drizzle ORM](https://orm.drizzle.team/) + SQLite (über `@libsql/client`, keine native
  Kompilierung nötig)
- Eigene, schlanke Session-Auth (Passwort-Hashing mit `node:crypto` scrypt, Session-Cookie) —
  bewusst kein Auth-Framework, da nur ein/wenige Nutzer vorgesehen sind
- Fotos werden als Dateien auf dem Server-Dateisystem gespeichert (Pfad in der DB), ausgeliefert
  über die Route `/uploads/[filename]`

## Lokale Entwicklung

```bash
npm install
cp .env.example .env      # ggf. Werte anpassen
npm run db:push           # legt die SQLite-Tabellen an
npm run create-user -- "du@example.com" "dein-passwort" "Dein Name"
npm run dev -- --open
```

## Nutzer anlegen

Es gibt keine öffentliche Registrierung. Accounts werden über ein Skript angelegt:

```bash
npm run create-user -- "du@example.com" "dein-passwort" "Dein Name"
```

## Deployment auf eigenem Server

```bash
npm install
npm run build
npm run db:push
npm run create-user -- "du@example.com" "dein-passwort" "Dein Name"

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
- **`ORIGIN`** muss auf deine echte URL gesetzt sein, sonst blockiert SvelteKits CSRF-Schutz alle
  Formular-Submits (Login, Post erstellen, …).

## Nützliche Skripte

| Befehl               | Zweck                                      |
| --------------------- | ------------------------------------------- |
| `npm run dev`          | Entwicklungsserver                          |
| `npm run build`        | Produktions-Build (`build/`)                |
| `npm run check`        | Typecheck (svelte-check)                    |
| `npm run db:push`      | Schema-Änderungen in die DB übernehmen      |
| `npm run db:studio`    | Drizzle Studio (DB im Browser ansehen)      |
| `npm run create-user`  | Login-Account anlegen                       |

## Seiten

- `/` – Feed, neueste Posts zuerst
- `/posts/new` – Post erstellen (Text, Fotos, Album-Option)
- `/photos` – Foto-Stream (nur Einzelfotos ohne Album)
- `/albums` – Alle Alben
- `/albums/[id]` – Album-Detail mit allen zugehörigen Fotos
- `/login` – Anmelden

## Bekannte Grenzen / mögliche nächste Schritte

- Kein Bearbeiten/Löschen von Posts, Fotos oder Alben (nur Erstellen + Ansehen)
- Kein Passwort-Reset-Flow (Passwort ggf. per `create-user`-Skript neu anlegen)
- Aktuell auf einen "Autor" ausgelegt; das Datenmodell trägt eine `authorId`, mehrere Accounts
  sind also grundsätzlich möglich, es gibt aber (noch) keine Rechteverwaltung zwischen Nutzern
- Keine Bildkompression/Thumbnails — Originale werden 1:1 gespeichert und ausgeliefert
