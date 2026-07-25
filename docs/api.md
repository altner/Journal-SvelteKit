# API-Referenz

Dieses Projekt hat keine öffentliche API im klassischen Sinn — alle Endpunkte sind entweder
session-auth-geschützt (nur für den eingeloggten Betreiber, über das eigene Frontend genutzt) oder
mit einem privaten Bearer-Token für die eigenen Apple Shortcuts abgesichert. Es gibt keine
Registrierung, kein OAuth, keine Rate-Limits für Dritte.

## Micropub-artige Endpunkte (`/api/micropub/*`)

Drei eigenständige Endpunkte, einer pro Inhaltstyp — bewusst **nicht** ein einzelner Endpoint mit
Dispatch-Logik (das gab's kurzzeitig, war aber fehleranfällig, siehe `tasks/todo.md`). Alle drei
teilen sich denselben Auth-Mechanismus.

### Auth (alle drei Endpunkte)

- Header `Authorization: Bearer <MICROPUB_TOKEN>` (aus `.env`, per `openssl rand -hex 32`
  generiert) — `401` bei fehlendem/falschem Token.
- Formularfeld `h` muss `entry` sein (oder fehlen, Default ist `entry`) — `400` sonst.
- `MICROPUB_USER_EMAIL` (aus `.env`) bestimmt den Account, dem alles zugeordnet wird — `500` falls
  nicht gesetzt oder kein passender User existiert.
- Request-Body: `multipart/form-data` oder `application/x-www-form-urlencoded` (Formulardaten,
  kein JSON).
- **Wichtig für externe Clients (z. B. Shortcuts):** Header `Origin` muss exakt der echten
  `ORIGIN` aus `.env` entsprechen, sonst blockiert SvelteKits CSRF-Schutz die Anfrage mit `403`
  (gilt nicht im `npm run dev`, dort ist der Check deaktiviert).
- Erfolgsantwort: immer `201 Created`, leerer Body, `Location`-Header mit der URL des neuen
  Eintrags.

### `POST /api/micropub/checkin`

Legt einen Checkin an (eigene Tabelle `checkin`, nicht `post` — siehe Datenmodell in
`CLAUDE.md`).

| Feld | Pflicht | Beschreibung |
| --- | --- | --- |
| `checkin[latitude]` | ✅ | Numerisch, als String |
| `checkin[longitude]` | ✅ | Numerisch, als String |
| `checkin[name]` | – | Ortsname (z. B. Venue) |
| `content` | – | Kurzer Text |
| `photo` | – | Foto-Datei, mehrere über wiederholtes `photo`-Feld möglich |

Reichert `locationPlace`/`locationCountry`/`road`/`houseNumber`/`postcode` best-effort per
Nominatim-Rückwärtssuche an (Fehler dabei sind nie fatal, Felder bleiben dann leer).

**Antwort:** `Location: /checkins/{slug}`

**Fehler:** `400` wenn `checkin[latitude]`/`checkin[longitude]` fehlen oder nicht numerisch sind.

```bash
curl -i -X POST https://achis.blog/api/micropub/checkin \
  -H "Authorization: Bearer $MICROPUB_TOKEN" -H "Origin: https://achis.blog" \
  -F "h=entry" -F "checkin[name]=Café X" \
  -F "checkin[latitude]=51.05" -F "checkin[longitude]=13.74" \
  -F "content=Kurzer Kommentar" -F "photo=@bild.jpg"
```

### `POST /api/micropub/post`

Legt einen normalen Post an. Keine Album-Fähigkeit — dafür gibt's den eigenen Endpoint unten.

**Auth, abweichend vom Rest dieses Abschnitts:** Dieser Endpoint akzeptiert zusätzlich zum
statischen `MICROPUB_TOKEN` auch einen echten IndieAuth-Bearer-Token (Introspection gegen
`INDIEAUTH_INTROSPECT_URL`, Scope `create`, `me === INDIEAUTH_ME` — exakt wie beim
`checkin`-Endpoint). Der statische Token wird zuerst geprüft (kein Netzwerk-Roundtrip); nur wenn
der nicht passt, wird IndieAuth-Introspection versucht. Damit können sowohl die eigenen Apple
Shortcuts (statischer Token) als auch browserbasierte IndieAuth-Clients wie der Quill-Editor
posten. Der Endpoint ist außerdem CORS-fähig (siehe `CORS_PATHS` in `hooks.server.ts`) — ein
Fetch von einer fremden Origin aus dem Browser funktioniert, solange ein gültiger Bearer-Token
mitgeschickt wird.

| Feld | Pflicht | Beschreibung |
| --- | --- | --- |
| `title` | ✅ | Post-Titel |
| `content` | ✅ | Text, wird als Markdown gerendert |
| `tags` | – | Kommagetrennte Liste, z. B. `foo,bar` |
| `photo` | – | Foto-Datei(en), wiederholtes Feld für mehrere |
| `latitude` / `longitude` | – | Numerisch als String, beide zusammen oder keins |
| `locationName` | – | Nur sinnvoll zusammen mit Koordinaten |

Bei gesetzten, validen Koordinaten: best-effort Reverse-Geocoding für `locationPlace`/
`locationCountry`.

**Antwort:** `Location: /posts/{slug}`

**Fehler:** `400` wenn `title` oder `content` fehlen/leer sind.

```bash
curl -i -X POST https://achis.blog/api/micropub/post \
  -H "Authorization: Bearer $MICROPUB_TOKEN" -H "Origin: https://achis.blog" \
  -F "h=entry" -F "title=Mein Titel" -F "content=Mein Text" -F "tags=urlaub,dresden"
```

Aus dem Browser mit einem echten IndieAuth-Token (z. B. der Quill-Editor, andere Origin):

```js
const form = new FormData();
form.append('h', 'entry');
form.append('title', 'Mein Titel');
form.append('content', 'Mein Text');
form.append('tags', 'urlaub,dresden');
// form.append('photo', fileFromInput); // wiederholbar für mehrere Fotos
await fetch('https://achis.blog/api/micropub/post', {
  method: 'POST',
  headers: { Authorization: `Bearer ${indieAuthAccessToken}` },
  body: form
});
```

### `POST /api/micropub/album`

Legt ein eigenständiges Album an. Erstellt intern zwingend auch einen `post`-Trägereintrag
(`photo.postId` ist schema-seitig `NOT NULL`), aber der Fokus des Endpoints liegt auf dem Album —
kein separates Post-Titel-Feld, kein Pflichttext.

| Feld | Pflicht | Beschreibung |
| --- | --- | --- |
| `title` | ✅ | Album-Titel (wird auch als Titel des Trägerposts verwendet) |
| `photo` | ✅ (≥ 2) | Foto-Dateien, wiederholtes Feld |
| `description` | – | Album-Beschreibung |
| `content` | – | Optionaler Text am Trägerpost |

**Antwort:** `Location: /albums/{slug}` (nicht `/posts/…` — bewusst der Album-Link)

**Fehler:** `400` wenn `title` fehlt, oder wenn weniger als 2 Fotos angehängt sind.

```bash
curl -i -X POST https://achis.blog/api/micropub/album \
  -H "Authorization: Bearer $MICROPUB_TOKEN" -H "Origin: https://achis.blog" \
  -F "h=entry" -F "title=Urlaub 2026" -F "description=Ein paar Bilder" \
  -F "photo=@a.jpg" -F "photo=@b.jpg"
```

### `POST /api/micropub/debug` (temporär)

Kein echter Endpoint für produktiven Gebrauch — spiegelt nur zurück, welche Formularfelder mit
welchem Typ (`text`/`file`) ankommen, als JSON. Gleiche Auth wie oben (`h=entry` + Bearer-Token).
Wurde gebaut, um herauszufinden, was macOS beim Teilen einer Notiz tatsächlich überträgt, ohne bei
Shortcuts-Verhalten raten zu müssen. **Vor einem Produktions-Deploy löschen**, wenn nicht mehr
gebraucht (`src/routes/api/micropub/debug/`).

## Interne Proxy-Endpunkte (`/api/*`, Session-Auth)

Diese drei sind **nicht** für externe Clients gedacht — sie reichen Anfragen an rate-limitierte
Drittanbieter-Dienste (Nominatim, Overpass) durch und sind deshalb hinter der normalen
Login-Session (`locals.user`) versteckt, nicht hinter dem Micropub-Token. Werden intern vom
Standort-Auswahl-Feature (`LocationPicker.svelte`) genutzt.

### `GET /api/reverse-geocode?lat={lat}&lon={lon}`

Wandelt Koordinaten in eine Adresse um (Nominatim `/reverse`).

**Antwort:** `{ place, country, poiName, road, houseNumber, postcode }` (alle Felder `string | null`)

**Fehler:** `401` ohne Session, `400` bei ungültigen Koordinaten, `502` wenn Nominatim nicht
erreichbar ist.

### `GET /api/search-place?q={suchbegriff}`

Namenssuche nach Orten/POIs (Nominatim `/search`, max. 5 Treffer).

**Antwort:** Array von `{ label, place, country, poiName, road, houseNumber, postcode, latitude, longitude }`

**Fehler:** `401` ohne Session, `400` ohne Suchbegriff, `502` bei Nominatim-Ausfall.

### `GET /api/nearby-places?lat={lat}&lon={lon}`

Benannte OSM-Punkte im 100-m-Umkreis (Overpass API) — liefert eine Liste statt nur des einen
nächsten Treffers wie Nominatim.

**Antwort:** Array von `{ name, category, latitude, longitude }` (`category` kann `null` sein)

**Fehler:** `401` ohne Session, `400` bei ungültigen Koordinaten, `502` bei Overpass-Ausfall.

## Sonstige Endpunkte

### `POST /logout`

Beendet die Session (löscht den Session-Cookie), leitet dann weiter. Erwartet Formularfeld
`redirectTo` (optional, wird gegen offene Redirects geprüft — `safePublicRedirect`).

### `GET /uploads/[filename]`

Liefert eine hochgeladene Datei (Foto oder GPX-Track) direkt aus. Öffentlich, kein Auth — Fotos
sind grundsätzlich öffentlich lesbar wie der Rest der Seite. `filename` wird über `path.basename`
bereinigt (Schutz vor Path Traversal). `Cache-Control: public, max-age=31536000, immutable`.

## Formular-Actions

Post/Checkin/Album-*Erstellung* läuft ausschließlich über die Micropub-Endpunkte oben — es gibt
kein Web-Formular dafür mehr. Bearbeiten und Löschen bereits existierender Posts/Checkins/Aktivitäten/
Alben läuft weiterhin über SvelteKit Form Actions auf den jeweiligen Detailseiten (`/posts/[slug]`,
`/checkins/[slug]`, `/activities`, `/activities/[slug]`, `/albums/[slug]`, `/photos`) — das sind
keine JSON/REST-Endpunkte, sondern normale HTML-Formular-Submits mit Session-Cookie-Auth, nicht Teil
dieser API-Referenz.
