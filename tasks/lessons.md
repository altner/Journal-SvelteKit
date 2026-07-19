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
