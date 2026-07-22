# Todo

## „Anmelden"-Link aus der Nav entfernt — erledigt

Nutzerwunsch, direkt im Anschluss an den entfernten „Neuer Beitrag"-Nav-Link: gleiche
Behandlung für den Login-Link. Widerspricht bewusst der früheren Entscheidung aus
„öffentliche und eingeloggte Navigation" (Login sollte dort öffentlich auffindbar sein) —
das war die alte Vorgabe. **Nutzer hat das explizit als Dauerregel festgelegt: Login darf
niemals öffentlich auffindbar gemacht werden** (nicht nur diese einmalige Änderung) — bei
künftigen Nav-/Auffindbarkeits-Arbeiten nicht erneut einen Login-Link für ausgeloggte
Besucher einführen.

- [x] `+layout.svelte`: „Anmelden"-Link aus Kopfzeile und Sidebar entfernt (inkl. toter
      `.login-link`/`.desktop-login`-CSS und der dadurch ungenutzten `loginHref`-Ableitung);
      `isLoginPage` bleibt für Chrome-Free-Layout und die Nav-Ausblendung auf `/login` selbst
      erhalten
- [x] `/login` bleibt unverändert per Direktaufruf erreichbar (kein Link mehr dorthin, aber
      Route/Redirect-Verhalten unangetastet)
- [x] `npm run check` — 0 Fehler
- [x] Mit temporärem QA-User (danach gelöscht) im Browser geprüft: ausgeloggt zeigt weder
      Desktop-Sidebar noch mobile Kopfzeile einen Login-Link; `/login` funktioniert per
      Direktaufruf weiterhin, Login setzt korrekt `data.user`, „Abmelden" erscheint danach an
      beiden Stellen wie zuvor

## Doppelter „Neuer Beitrag"-Einstieg entfernt — erledigt

Nutzerhinweis: Nav-Link „+ Beitrag"/„+ Neuer Beitrag" und der Feed-eigene Composer sind zwei
Wege zum selben Ziel — auf Nachfrage per Rückfrage geklärt: kein gleichzeitig sichtbarer Bug
(die Feed-Seite blendete den Nav-Link schon vorher aus), sondern eine grundsätzliche
Design-Redundanz. Nutzerentscheidung: Nav-Link ganz entfernen, Feed-Composer wird der einzige
Einstieg; `/posts/new` bleibt als reiner Direktlink-/No-JS-Fallback bestehen (unverändert
erreichbar, nur nicht mehr verlinkt).

- [x] `+layout.svelte`: „+ Beitrag"/„+ Neuer Beitrag"-Links aus Kopfzeile und Sidebar entfernt
      (inkl. der jetzt toten `.create-link`/`.desktop-create`-CSS); `isFeedPage` bleibt für die
      Timeline-Sidebar erhalten
- [x] Gleiche Dopplung auch im leeren, eingeloggten Feed gefunden: Composer war schon offen,
      der leere Zustand verlinkte zusätzlich auf `/posts/new` — Text auf „Nutze den Composer
      oben" umgestellt, Aktivitäts-Link bleibt (dafür gibt es keinen Feed-Composer)
- [x] `npm run check` — 0 Fehler
- [x] Mit temporärem QA-User (danach gelöscht) im Browser geprüft: Desktop-Sidebar und
      Mobile-Kopfzeile zeigen auf keiner Seite mehr einen Beitrag-Button, Feed-Composer
      unverändert funktionsfähig, `/posts/new` per Direktaufruf weiterhin erreichbar

## Usability-Audit: Überschriften auf Inhaltsseiten

- [x] Beitragsdetail und Aktivitätsdetail mit genau einer sichtbaren Hauptüberschrift auszeichnen
- [x] Karten in Feed, Archiv und Tagansicht als untergeordnete Überschriften strukturieren
- [x] Sport-Symbol in Überschriften als rein visuelle Ergänzung kennzeichnen
- [x] Zurück-Links der beiden Detailseiten als 44-Pixel-Touchziele vereinheitlichen
- [x] Öffentlich und angemeldet im Browser geprüft: Übersicht H1 → Karten-H2, beide Details mit
      genau einer H1; Aktivitäts-H1 bleibt auch beim Bearbeiten erhalten; Rückwege 44 Pixel hoch;
      bei 390 Pixeln kein Überlauf
- [x] Testnutzer und Sitzung entfernt; Check ohne Fehler/Warnungen, Produktions-Build und
      Diff-Prüfung erfolgreich

## Usability-Audit: Bildladen und Layoutstabilität

- [x] Gespeicherte Fotoabmessungen in Feed, Aktivitäten, Alben, Fotostream und Lightbox ausgeben
- [x] Nur das erste sichtbare Inhaltsbild priorisieren, nachfolgende Bilder verzögert laden
- [x] Bilddekodierung vom Hauptthread entkoppeln und Editor-Vorschaubilder ebenfalls stabilisieren
- [x] Feed, Fotostream, Aktivitätsdetail und Lightbox im Browser geprüft: erstes Foto eager/high,
      folgende Fotos lazy, alle mit echten Maßen und asynchroner Dekodierung; Album-Markup wird
      über denselben typgeprüften Galeriepfad erzeugt; mobil bei 390 Pixeln kein Überlauf
- [x] Keine lokalen Fotos ohne Abmessungen; Check ohne Fehler/Warnungen, Produktions-Build und
      Diff-Prüfung erfolgreich

## Usability-Audit: Fokus nach Seitenwechseln

- [x] Nach clientseitigen Seitenwechseln den Fokus an den Beginn des neuen Hauptinhalts setzen
- [x] Direkte Seitenaufrufe und gezielte Sprunglinks nicht durch automatischen Fokus stören
- [x] Foto-Lightbox-Shallow-Routing und bestehende Fokus-Rückkehr unverändert lassen
- [x] Direkte Beitragserstellung als fokussierte Aufgabe im Titelfeld beginnen
- [x] Öffentlich und angemeldet im Browser geprüft: Hauptnavigation und Pagination fokussieren den
      neuen Hauptinhalt; Login behält den E-Mail-Fokus; direkte Beitragserstellung fokussiert den
      Titel; Lightbox fokussiert Schließen und gibt den Fokus zum Fotolink zurück; bei 390 Pixeln
      kein Überlauf
- [x] Temporäre Paginationseinträge, Testnutzer und Sitzung entfernt; Check ohne
      Fehler/Warnungen, Produktions-Build und Diff-Prüfung erfolgreich

## Usability-Audit: Entwurfsschutz bei Foto- und Aktivitätsuploads

- [x] Aktivitäts-, Album- und Albumfoto-Formulare bei begonnener Eingabe als geändert erkennen
- [x] Fotoauswahl zum Album einschließlich optionalem Titel gegen versehentliches Verlassen schützen
- [x] Abbrechen mit Inhalt bestätigen, unveränderte Formulare weiterhin direkt schließen
- [x] Erfolgreiches Absenden ohne Warnung erlauben und Zustand vollständig zurücksetzen
- [x] Eingeloggt im Browser geprüft: unverändertes Albumformular schließt direkt; begonnenes Album
      bleibt nach abgelehntem Verwerfen samt Titel erhalten und schließt nach Bestätigung;
      Aktivitätsentwurf bleibt bei abgelehnter Navigation erhalten; mobil bei 390 Pixeln kein
      Überlauf und Abbrechen 44 Pixel hoch
- [x] Testnutzer und Sitzung entfernt; Check ohne Fehler/Warnungen, Produktions-Build und
      Diff-Prüfung erfolgreich

## Usability-Audit: Anmeldung und Sitzung

- [x] E-Mail nach fehlgeschlagener Anmeldung erhalten, Passwort bewusst leeren
- [x] Nach Fehler das richtige Korrekturfeld fokussieren und Meldung eindeutig verknüpfen
- [x] Laufende Anmeldung vollständig sperren und verständlich kennzeichnen
- [x] Unerwartete Anmeldefehler innerhalb der Login-Seite auffangen
- [x] Ungültige oder verwaiste Sitzungscookies serverseitig entfernen
- [x] Falsches und korrektes Passwort sowie Rücksprung nach `/photos?view=qa` im Browser geprüft;
      mobil bei 390 Pixeln kein Überlauf, E-Mail initial fokussiert und Submit 44 Pixel hoch;
      verwaistes Sitzungscookie zusätzlich per lokaler HTTP-Antwort geprüft
- [x] Testnutzer und Sitzung entfernt; Check ohne Fehler/Warnungen, Produktions-Build und
      Diff-Prüfung erfolgreich

## Usability-Audit: Schutz vor Entwurfsverlust

- [x] Begonnene neue Beiträge bei interner Navigation, Zurück und Neuladen schützen
- [x] Beitrags- und Aktivitätsbearbeitung auf denselben Schutz umstellen
- [x] Änderungen aus Texteditor, Tags, Dateien und Standort zuverlässig erkennen
- [x] Erfolgreiches Speichern und unverändertes Verlassen ohne unnötige Warnung ermöglichen
- [x] Minimieren des Feed-Composers weiterhin ohne Verlust oder Warnung erlauben
- [x] Interne Navigation, Verbleiben und bewusstes Verwerfen bei neuem Beitrag und
      Beitragsbearbeitung im Browser geprüft; unveränderte Navigation bleibt promptfrei; bei
      390 Pixeln kein Überlauf; echter Beitrag unverändert und Testnutzer entfernt
- [x] Check ohne Fehler/Warnungen, Produktions-Build und Diff-Prüfung erfolgreich

## Usability-Audit: Standortauswahl

- [x] Standortbereich semantisch mit seinem Ein-/Ausklappschalter verknüpfen
- [x] Kartenbedienung und alternative Standortermittlung verständlich erklären
- [x] Browser-Standortermittlung gegen Mehrfachauslösung sperren und laufenden Zustand anzeigen
- [x] Geocoding-Anfragen bei neuer Position oder Entfernen des Standorts zuverlässig abbrechen
- [x] Lade- und Fehlermeldungen zugänglich ansagen und Fehler fokussieren
- [x] Erstellung und Bearbeitung mobil/desktop im Browser geprüft: Kartenwahl ermittelt Dresden,
      Entfernen leert alle Standortfelder dauerhaft; bei 390 Pixeln kein Überlauf und 44-Pixel-Aktion;
      öffentliche Ansicht bleibt ohne Editor; Testnutzer entfernt, echte Daten unverändert
- [x] Check ohne Fehler/Warnungen, Produktions-Build und Diff-Prüfung erfolgreich

## Usability-Audit: Erstell- und Uploadfehler

- [x] Beitrag, Aktivität, Album und Fotoauswahl unterscheiden Erfolg, Validierung und Systemfehler
- [x] Laufende Formulare und ihre Ein-/Ausklappaktionen gegen Doppelaktionen sperren
- [x] Fehlermeldungen als Live-Meldung ausgeben und fokussieren
- [x] Nach erfolgreichem Abschluss Fokus und Formularzustand nachvollziehbar zurücksetzen
- [x] Album-Fotoauswahl nach Erfolg vollständig verlassen und Auswahl leeren
- [x] Ungültigen GPX-Upload im Browser geprüft: Formular bleibt offen, Fehler wird angesagt und
      fokussiert; bei 390 Pixeln kein Überlauf; öffentliche Ansicht bleibt ohne Erstellaktion
- [x] Keine Datei und kein Inhalt durch den Fehlertest angelegt, Testnutzer entfernt; Check ohne
      Fehler/Warnungen, Produktions-Build und Diff-Prüfung erfolgreich

## Usability-Audit: Bearbeitungsformulare

- [x] Beitrag und Aktivität beim Öffnen direkt in das erste Feld fokussieren
- [x] Speichern eindeutig als laufenden Zustand anzeigen und Mehrfachsendungen verhindern
- [x] Server- und unerwartete Fehler zugänglich melden und fokussieren
- [x] Versehentlichen Abbruch geänderter Formulare bestätigen
- [x] Nach Speichern oder Abbrechen den Fokus zum sichtbaren Eigentümer-Aktionsmenü zurückgeben
- [x] Beitrag und Aktivität mobil/desktop im Browser geprüft; bei 390 Pixeln kein Überlauf und
      beide Abschlussaktionen 44 Pixel hoch; echte Inhalte unverändert und Testnutzer entfernt
- [x] Check ohne Fehler/Warnungen, Produktions-Build und Diff-Prüfung erfolgreich

## Usability-Audit: Löschaktionen

- [x] Beitrag, Aktivität und Album während des Löschens sperren und eindeutig beschriften
- [x] Server- und unerwartete Fehler als Live-Meldung ausgeben
- [x] Abbruch der Bestätigung ohne hängenden Wartezustand sicherstellen
- [x] Foto-Löschung auf dieselbe Fehlerbehandlung ergänzen
- [x] Öffentliche/eingeloggte Ansicht sowie Abbruch und Erfolg im Browser geprüft; temporäres Album
      erfolgreich gelöscht, echte lokale Inhalte wiederhergestellt und sämtliche Testdaten entfernt
- [x] Check ohne Fehler/Warnungen, Produktions-Build und Diff-Prüfung erfolgreich

## Usability-Audit: Fotos zu Album hinzufügen

- [x] Aufklappschalter und Formular semantisch verknüpfen, Fokus beim Öffnen setzen
- [x] Dateiauswahl mit verständlicher Anzahl live rückmelden
- [x] Uploadzustand sperren und Fehler als Live-Meldung ausgeben
- [x] Nach Erfolg Fokus zum wieder sichtbaren Auslöser zurückführen
- [x] Zurück-Link auf 44-Pixel-Ziel vereinheitlichen
- [x] Mobil/desktop sowie öffentlich/eingeloggt mit echtem Test-Upload geprüft; Testfoto,
      Statusbeitrag, Album und Testnutzer vollständig entfernt
- [x] Check ohne Fehler/Warnungen, Produktions-Build und Diff-Prüfung erfolgreich

## Usability-Audit: Eigentümer-Aktionsmenüs

- [x] Menü bei Klick außerhalb schließen
- [x] Escape schließt das Menü und gibt den Fokus an den Auslöser zurück
- [x] Beim Öffnen eines Menüs andere offene Eigentümer-Menüs schließen
- [x] Beitrag, Aktivität und temporäres Album mobil/desktop sowie öffentlich/eingeloggt geprüft;
      Testalbum und Testnutzer entfernt
- [x] Check ohne Fehler/Warnungen, Produktions-Build und Diff-Prüfung erfolgreich

## Usability-Audit: Aufklappbare Erstellformulare

- [x] Beitrag, Aktivität und Album mit `aria-expanded`/`aria-controls` eindeutig verknüpfen
- [x] Beim Öffnen den Fokus ins erste Feld und beim Minimieren zurück zum Auslöser führen
- [x] Minimieren als 44-Pixel-Touchziel ausführen
- [x] Alle drei Flüsse mobil/desktop und mit Tastatur geprüft; öffentliche Ansicht gegengeprüft;
      Testnutzer entfernt
- [x] Check ohne Fehler/Warnungen, Produktions-Build und Diff-Prüfung erfolgreich

## Usability-Audit: Tag-Navigation

- [x] Tag-Trefferseiten in das bestehende Vor/Zurück-Seitenmodell aufnehmen
- [x] Tag-Links in Übersicht, Beiträgen und Aktivitäten als gut erreichbare Touch-Ziele ausführen
- [x] Tag-Übersicht mobil/desktop und Trefferseiten mit 21 temporären Einträgen öffentlich geprüft;
      Testdaten vollständig entfernt
- [x] Check ohne Fehler/Warnungen, Produktions-Build und Diff-Prüfung erfolgreich

## Usability-Audit: Tag-Eingabe

- [x] TagInput selbst beschriften und interaktive Buttons aus übergeordneten Labels lösen
- [x] Gesamten Tag-Chip als 44-Pixel-Löschziel mit eindeutigem Namen ausführen
- [x] Bedienhinweis sowie Live-Rückmeldung für Hinzufügen, Duplikate und Entfernen ergänzen
- [x] Eingefügte kommagetrennte Werte als mehrere Tags übernehmen
- [x] Beitragserstellung und Aktivitätsformular mobil/desktop im Browser geprüft; Testnutzer entfernt
- [x] Check ohne Fehler/Warnungen, Produktions-Build und Diff-Prüfung erfolgreich

## Usability-Audit: Beitragseditor

- [x] Blockaktionen horizontal und mit 44 × 44 Pixel großen Zielen anordnen
- [x] Jeden Text-/Fotoblock und seine Verschieben-/Entfernen-Aktionen eindeutig nummerieren
- [x] Textformatierung auf 44-Pixel-Ziele mit Namen, Tooltip und `aria-pressed` umstellen
- [x] Editor-Ladezustand sperren und das eigentliche Textfeld als „Beitragstext“ benennen
- [x] Block-hinzufügen-Aktionen und Fotostream-Checkbox auf mindestens 44 Pixel bringen
- [x] Text-/Fotoblock, Verschieben, nummerierte Namen und gedrückte Formatierung bei 320 Pixeln
      geprüft; Desktop-Werkzeugleiste bei 1440 Pixeln geprüft; Testnutzer entfernt
- [x] Check ohne Fehler/Warnungen, Produktions-Build und Diff-Prüfung erfolgreich

## Usability-Audit: Kartenbedienung

- [x] Mobile Leaflet-Zoomtasten auf 44 × 44 Pixel vergrößern
- [x] Kartenregionen nach Zweck beschriften und rein visuelle Streckenmarker aus der Tab-Reihenfolge nehmen
- [x] Versehentliches Scrollrad-Zoomen in Feed-, Detail- und Standortkarten verhindern
- [x] Standortaktionen und Textfelder auf mindestens 44 Pixel Höhe bringen
- [x] Öffentliche Streckenkarte mobil/desktop sowie eingeloggten Standorteditor bei 390 Pixeln
      geprüft; Markersemantik, Kartenlabels und reale Controlgrößen bestätigt; Testnutzer entfernt
- [x] Check ohne Fehler/Warnungen, Produktions-Build und Diff-Prüfung erfolgreich

## Usability-Audit: Touch-Ziele

- [x] Kopfzeile, Sidebar, Foto-Tabs, Zurück-Links und Besitzer-Menü auf 44-Pixel-Ziele umstellen
- [x] Primäre Album-, Aktivitäts- und Fotoauswahl-Aktionen einschließlich Submit auf 44 Pixel bringen
- [x] Foto-Tabs mit Navigationsbezeichnung und `aria-current` ergänzen
- [x] Öffentlich bei 320 Pixeln sowie eingeloggt bei 390 Pixeln vermessen; Album-/Aktivitätsaktion,
      Kopfzeile, Tabs und Besitzer-Menü mindestens 44 Pixel, untere Navigation 48 Pixel
- [x] Desktop-Sidebar bei 1440 Pixeln vermessen; temporären Nutzer entfernt; Check ohne
      Fehler/Warnungen, Produktions-Build und Diff-Prüfung erfolgreich

## Usability-Audit: Pagination

- [x] Gemeinsame Navigation semantisch als „Weitere Seiten“ und Links als Einträge benennen
- [x] Neuere/ältere Richtung zusätzlich mit `rel="prev"`/`rel="next"` auszeichnen
- [x] Beide Links auf mindestens 44 Pixel hohe Touch-Ziele vergrößern
- [x] Erste, mittlere und letzte Seite mit 45 temporären Beiträgen bei 390 Pixeln geprüft;
      Touch-Ziele jeweils 44 Pixel hoch; alle Testbeiträge anschließend entfernt
- [x] Check ohne Fehler/Warnungen, Produktions-Build und Diff-Prüfung erfolgreich

## Usability-Audit: Logout-Rückkehr

- [x] Abmelden behält die aktuelle öffentlich lesbare Seite einschließlich Suchparametern bei
- [x] Externe und nach dem Logout geschützte Ziele serverseitig auf den Feed zurückführen
- [x] Geschützte Pfaderkennung zwischen Auth-Hook und Logout zentral vereinheitlichen
- [x] Öffentlichen Rückweg mit Suchparametern und geschützten Fallback bei 390 Pixeln im Browser
      geprüft; extern manipuliertes Ziel am Endpunkt geprüft; temporären Nutzer entfernt
- [x] Check ohne Fehler/Warnungen, Produktions-Build und Diff-Prüfung erfolgreich

## Usability-Audit: Login-Rückkehr

- [x] Globale Login-Links merken sich die aktuelle interne Seite einschließlich Suchparametern
- [x] Rücksprungziel serverseitig strikt auf dieselbe Website begrenzen
- [x] Sichtbaren „Zurück“-Link und gesperrten Ladezustand während der Anmeldung ergänzen
- [x] Erfolgreichen Login mit Suchparametern, zugänglichen Fehlerzustand und manipuliertes
      externes Rücksprungziel bei 390 Pixeln im Browser geprüft; temporären Nutzer entfernt
- [x] Check ohne Fehler/Warnungen, Produktions-Build und Diff-Prüfung erfolgreich

## Usability-Audit: Mobile Lightbox-Geometrie

- [x] Horizontalen Überlauf gemessen: `100vw` machte den Dialog um die Scrollbarbreite zu groß
- [x] Dialog und Fotoinhalt an die tatsächlich verfügbare Breite statt an `100vw` binden
- [x] Schließen- und Löschaktion auf mindestens 44 × 44 Pixel vergrößern
- [x] Mobile Geometrie bei 390 × 844 und Desktop bei 1440 × 900 im Browser geprüft; kein
      horizontaler Überlauf mehr; Check, Build und Diff-Prüfung erfolgreich

## Usability-Audit: Foto-Lightbox

- [x] Gemeinsame Dialogsemantik und alle Aufrufkontexte geprüft
- [x] Aussagekräftigen Bild-Alternativtext und Dateinamen in der Dialogbezeichnung ergänzen
- [x] Fokus beim Öffnen auf „Schließen“ setzen und beim Schließen zum Auslöser zurückführen
- [x] Verbliebenes Lösch-Emoji durch ein zentriertes SVG ersetzen; Senden sperren und Fehler ansagen
- [x] Besitzeraktion der globalen Fotoansicht auch nach Neuladen/direktem Permalink erhalten
- [x] Shallow-Routing und Fokus-Rückkehr sowie öffentlicher/eingeloggter Direktlink im Browser
      geprüft; temporären Nutzer entfernt; Check, Build und Diff-Prüfung erfolgreich

## Usability-Audit: Profilbild-Performance

- [x] Live-Auslieferung geprüft: `me.jpg` wird als 173-KB-JPEG ohne `Cache-Control` gesendet
- [x] Responsive AVIF- und WebP-Varianten in 380 und 760 Pixel Breite erzeugt
- [x] Varianten über Vite-Imports mit gehashten, langfristig cachebaren URLs einbinden
- [x] Bildqualität und responsive Auswahl bei 390 Pixeln im Browser geprüft; `npm run check`,
      Produktions-Build und Diff-Prüfung erfolgreich

## Usability-Audit: Rückmeldung bei Uploads

- [x] Aktivitäts-, Album-, Albumfoto- und Fotoauswahl-Formulare während des Sendens sperren
- [x] Je Aktion einen eindeutigen laufenden Status direkt im Submit-Button anzeigen
- [x] Reaktive Zustände mit Check und Build geprüft; Album-Erstellung und anschließendes
      Foto-Hinzufügen im Browser durchlaufen, sämtliche Testdatensätze und Dateien danach entfernt

## Usability-Audit: öffentliche und eingeloggte Navigation — erste Runde erledigt

- [x] Aktiven Hauptbereich auch auf Detailseiten und bei Alben korrekt markieren
- [x] Marke als eindeutigen Home-Link ausführen
- [x] Mobile Navigation vollständig machen, ohne die Kopfzeile zu überladen
- [x] Login öffentlich auffindbar und „Neuer Beitrag“ eingeloggt global erreichbar machen
- [x] Öffentlich und mit temporärem lokalem Testnutzer geprüft: Desktop-Navigation, 390-px-Mobilansicht,
      Feed, Album-Bereich und Aktivitätsdetail; Testnutzer und Session anschließend entfernt

## Usability-Audit: Detailseiten und Erstellen-Aktionen — erledigt

- [x] Beitragsdetail logisch zum Beitragsarchiv zurückführen
- [x] Albumdetail auf dieselbe proportionale Fotodarstellung wie die Fotoübersicht umstellen
- [x] Album-Upload für eingeloggte Nutzer einklappbar machen, damit die Fotos im Mittelpunkt stehen
- [x] Leeres Album mit einem klaren rollenunabhängigen Zustand versehen
- [x] Login auf Mobil und Desktop als fokussierte Aufgabe ohne Footer/zusätzlichen Scrollbereich gestalten
- [x] Öffentliche Beitrags-/Album-/Loginzustände und 390-px-Loginansicht im Browser geprüft;
      eingeloggte Albumsteuerung zusätzlich durch Typprüfung abgedeckt

## Usability-Audit: Tastatur und zugängliche Bildaktionen — erledigt

- [x] Global gut sichtbare `:focus-visible`-Markierung für Links, Buttons und Formfelder ergänzt
- [x] „Zum Inhalt springen“ als ersten fokussierbaren Link ergänzt; Ziel ist das semantische `<main>`
- [x] Post- und Aktivitäts-Fotokacheln mit Position und Gesamtzahl zugänglich benannt
- [x] Globale Fotoübersicht, Albumauswahl und Albumdetail mit benannten Fotoaktionen versehen
- [x] Im Browser bestätigt: Sprunglink steht vor der Navigation, `<main>` ist semantisch vorhanden,
      Feed-Fotolinks heißen z. B. „Foto 2 von 13 öffnen“, globale Fotolinks tragen Dateinamen

## Usability-Audit: Besitzeraktionen — erledigt

- [x] Seltene Verwaltungsaktionen aus den dauerhaft sichtbaren Kartenköpfen entfernt
- [x] Zugängliches Drei-Punkte-Menü als gemeinsame Komponente ergänzt (natives `<summary>`,
      `aria-expanded`)
- [x] Beitrag, Aktivität und Album konsistent auf Bearbeiten/Löschen im Menü umgestellt
- [x] Destruktive Aktionen eindeutig nach ihrem Ziel benannt („Beitrag löschen“ usw.)
- [x] Menü schließt beim Bearbeiten, bleibt für mögliche Löschfehler aber geöffnet
- [x] Bei 390 px eingeloggt im Browser geprüft: Menü öffnet, zeigt Bearbeiten/Löschen, startet das
      Formular ohne überlagerndes Menü; temporären Testnutzer und Session danach entfernt

## Usability-Audit: kompakter Feed-Composer — erledigt

- [x] Feed zunächst auf Inhalte statt auf den vollständigen Editor fokussiert
- [x] Composer zugänglich öffnen und Fokus ins erste Feld setzen
- [x] Minimieren ohne Verlust eines begonnenen Entwurfs ermöglichen
- [x] Doppeltes Absenden verhindern und Fehlerzustände sauber unterscheiden
- [x] Direkte Seite `/posts/new` unverändert vollständig geöffnet halten
- [x] Sichtbare Begriffe von „Post“ auf „Beitrag“ vereinheitlicht
- [x] Eingeloggt bei 390 px und Desktop geprüft: kompakter Start, Fokus auf Titel, Entwurf nach
      Minimieren/Wiederöffnen erhalten, Direktseite offen; temporären Nutzer danach entfernt

## Usability-Audit: Seitenorientierung und Fehlerwege — erledigt

- [x] Feed mit einer semantischen Hauptüberschrift versehen
- [x] Leeren Feed öffentlich neutral, eingeloggt handlungsorientiert formuliert
- [x] Eigene verständliche 404-/Fehlerseite mit sicherem Rückweg ergänzt
- [x] Mobile Navigationsziele auf echte 48 px Mindesthöhe gebracht
- [x] Bei 320 px im Browser geprüft: kein horizontaler Overflow, alle fünf Labels lesbar,
      jedes Ziel exakt 64 × 48 px; 404 mit Titel, Erklärung, Feed-Rückweg und Navigation
- [x] Check, Build und Diff-Prüfung abgeschlossen

## Usability-Audit: Album-Auswahl aus Fotos

- [x] Unmöglichen Album-Einstieg bei weniger als zwei losen Beitragsfotos entfernen
- [x] Aktion eindeutig als Zusammenfassen vorhandener loser Fotos benennen
- [x] Im Auswahlmodus nur tatsächlich auswählbare Fotos zeigen
- [x] Mindestanzahl und Auswahlfortschritt verständlich kommunizieren
- [x] Eingeloggt im Browser sowie mit Check und Build verifizieren; temporäre Fotos, Testnutzer
      und Session anschließend vollständig entfernt

## Cursor-Pagination nach Aaron-Parecki-Muster — erledigt

- [x] Gemeinsamen stabilen Cursor aus Datum und ID sowie wiederverwendbare Navigation ergänzt
- [x] Feed und Beiträge mit „Neuere“/„Ältere“ paginiert
- [x] Fotos, Alben und Aktivitäten ebenso paginiert; Lightbox bleibt innerhalb der sichtbaren Seite
- [x] Pro Ansicht werden höchstens 20 Einträge geladen; gemischte Streams werden aus begrenzten
      Teilabfragen zusammengeführt und stabil nach Datum plus ID sortiert
- [x] Typprüfung ohne Fehler/Warnungen, Produktions-Build erfolgreich, Diff-Prüfung sauber

## Astro-Lightbox identisch nach Svelte portieren — erledigt

- [x] Native `<dialog>`-Darstellung, SVG-Bedienelemente und Bildgrößen aus dem Paket übernommen;
      X und Pfeile sind anhand ihrer ViewBox rechnerisch exakt mittig (0 px Abweichung geprüft)
- [x] 220-ms-Slidewechsel für Buttons und Pfeiltasten portiert, inklusive Decode vor Slide-in
- [x] Pointer-Swipe mit 6-px-Achsensperre, 60-px-Schwelle und Zurückschnappen portiert
- [x] Bestehende Deep-Links, Shallow Routing, Löschen und Herkunftsleiste bewahrt; direkte
      Permalinks behalten echte Anchor-Ziele als Progressive-Enhancement-Fallback
- [x] Browserprüfung mit 14 Fotos: SVGs vorhanden/zentriert, ArrowRight animiert und aktualisiert
      URL, horizontaler Swipe wechselt genau ein Foto, Escape schließt nach `/photos`, Body-Scroll
      wird entsperrt, keine Browserfehler/-warnungen
- [x] `npm run check` ohne Fehler/Warnungen, Produktions-Build erfolgreich

## Justified Gallery für Fotos und Alben — erledigt

- [x] Framework-unabhängigen `computeLayout()`-Kern aus
      `@altner/astro-justified-gallery-layout` direkt in Svelte verwenden
- [x] Bildbreite/-höhe bei neuen Post- und Aktivitätsfotos speichern; bestehende 14 lokale Bilder
      mit dem idempotenten `backfill-photo-dimensions`-Skript sicher ergänzt
- [x] Gemeinsame responsive Svelte-Komponente mit `ResizeObserver` und unverändertem
      Shallow-Routing/Lightbox-Verhalten bauen
- [x] `/photos` auf justified Zeilen umgestellt, Auswahlmodus weiterhin korrekt unterstützt
- [x] `/albums` mit den jeweiligen Cover-Seitenverhältnissen ebenfalls justified dargestellt;
      Albumtitel als gut lesbares Verlaufs-Overlay auf dem Cover
- [x] `npm run check` ohne Fehler/Warnungen; lokales `/photos` mit 14 Bildern geprüft: drei exakt
      gefüllte 205×154-Zellen pro 624-px-Zeile, korrekte 4-px-Abstände, kein horizontaler Overflow
- [ ] Nicht deployed — Produktion braucht vier nullable Spalten (`photo.width/height`,
      `activity_photo.width/height`) und anschließend `npm run backfill-photo-dimensions`

## Fotos bei Aktivitäten — erledigt

- [x] Globale Foto-Lightbox zeigt eine kompakte Herkunftsleiste unter dem Bild: anklickbare Links
      zu Beitrag und ggf. Album beziehungsweise zur Aktivität; direkter `/photos/[photoId]`-Aufruf
      rendert dieselben Informationen wie die Shallow-Routing-Ansicht
- [x] Nutzerkorrektur: Aktivitätsfotos in den globalen `/photos`-Stream aufgenommen, inklusive
      chronologischer Sortierung, globalem Foto-Permalink und Löschen; bei „Album erstellen“ sind
      sie sichtbar, aber bewusst nicht auswählbar
- [x] Nutzerkorrektur: Streckenkarte steht in Aktivitätskarte und Detailseite oberhalb der Fotos;
      Foto-Lightbox auf `z-index: 2000` angehoben, damit Leaflet-Panes/-Controls sie nicht überlagern
- [x] Eigene `activity_photo`-Tabelle samt Relationen ergänzt, da bestehende `photo`-Zeilen
      zwingend einen Post benötigen
- [x] Mehrfach-Fotoauswahl beim Aktivitäts-Upload sowie nachträglich über „Bearbeiten“ ergänzt;
      gespeicherte Dateien werden bei einem fehlgeschlagenen Vorgang wieder entfernt
- [x] Aktivitätsfotos in Feed, Aktivitätenliste, Tag-Feed und Detailseite angezeigt
- [x] Aktivitätsbezogene Foto-Permalinks mit eigener Lightbox-Navigation (Shallow Routing sowie
      funktionierender Direktlink ohne JS) ergänzt
- [x] Beim Löschen einer Aktivität Fotozeilen und Dateien explizit mit entfernen; zusätzlich auch
      `activity_tag` explizit bereinigt, da Foreign Keys zur Laufzeit nicht aktiv sind
- [x] Lokale additive `activity_photo`-Tabelle direkt per SQLite angelegt (keine bestehenden Daten
      geändert); `npm run check` 0 Fehler/0 Warnungen, Produktions-Build erfolgreich,
      `git diff --check` sauber
- [ ] Nicht deployed — Produktion braucht vor dem Nutzer-Deploy dieselbe additive
      `CREATE TABLE activity_photo`-Migration; Deployment bleibt beim Nutzer

## Aktivitäten: Karte in der Liste, Tags, Bearbeiten — erledigt

Drei Lücken vom Nutzer benannt: Karte fehlte in der `/activities`-Liste (nur im Feed sichtbar),
keine Tags für Aktivitäten, kein Bearbeiten.

- [x] `/activities`-Liste zeigt jetzt dieselbe `ActivityFeedCard`-Komponente wie der Feed (inkl.
      Karte) statt einer eigenen schlichten Tile-Darstellung — `load` parst dafür jetzt auch
      `trackPoints`
- [x] Neue `activity_tag`-Junction-Tabelle (spiegelt `post_tag` exakt, eigene Tabelle pro Entität
      statt polymorph, wie schon beim restlichen Schema üblich). Per `sqlite3` als `CREATE TABLE`
      angelegt (neue, leere Tabelle, kein Risiko)
- [x] `src/lib/server/tags.ts`: neue `setActivityTags()` — nutzt das bereits vorhandene
      `resolveOrCreateTags()` mit, identisches Delete-dann-Reinsert-Schema wie `setPostTags()`
- [x] Tags jetzt Teil des Upload-Formulars (`TagInput`-Komponente wiederverwendet) und im
      Bearbeiten-Formular
- [x] `edit`-Action ergänzt (`activities/[slug]/+page.server.ts`) — Titel/Sportart/Tags änderbar,
      **Slug bleibt bewusst unangetastet** (gleiche Unveränderlichkeits-Regel wie bei
      `post.slug`/`album.slug` — bestehende Links brechen nicht, wenn der Titel sich ändert). Bei
      leerem Titel greift derselbe Fallback wie bei der Erstellung
      (`buildFallbackTitle(sport, startedAt)`)
- [x] `src/lib/components/EditActivityForm.svelte` neu (Titel/Sportart-Select/Tags, spiegelt
      `EditPostForm.svelte`s Formular-Grundgerüst, aber ohne Blocks/Standort)
- [x] `ActivityFeedCard.svelte` bekommt `editing`/`onEdit`/`onEditDone`-Props (identisches Muster zu
      `PostCard`) — Bearbeiten funktioniert jetzt sowohl auf der Detailseite als auch inline im
      Feed und in der `/activities`-Liste
- [x] `/tags/[tag]` zeigt jetzt Posts UND Aktivitäten gemeinsam (gleiches
      Merge-nach-Zeitstempel-Prinzip wie der Haupt-Feed) — ohne das wäre Tagging von Aktivitäten
      nutzlos gewesen, da sie nirgends auffindbar wären
- [x] `/tags`-Übersicht zählt jetzt Post- UND Aktivitäts-Verknüpfungen zusammen (zwei getrennte
      gruppierte Queries statt einem Join über beide Junction-Tabellen — ein einzelner Join hätte
      bei Tags mit sowohl Post- als auch Aktivitäts-Verknüpfungen zu falschen counts durch
      Zeilen-Multiplikation geführt)
- [x] **Bug beim eigenen Testen gefunden + gefixt:** `/tags/[tag]/+page.server.ts`s
      Merge-und-Sortier-Kette hatte ein `.sort().map()` verkettet, wobei der finale `.map()`-Schritt
      das `sortDate`-Feld nicht mehr durchreichte, aber der TS-Typ es weiterhin verlangte —
      `npm run check` hat das sofort als Typfehler aufgedeckt (kein Laufzeit-Bug, da nie deployt/
      getestet), behoben durch Trennung in einen `merged`-Zwischenschritt (mit `sortDate`, fürs
      Sortieren) und einen separaten finalen `items`-Map-Schritt (ohne `sortDate`, fürs Rendering)
- [x] `npm run check` — 0 Fehler
- [x] Im Browser + `curl` mit temporärem QA-User (danach gelöscht) end-to-end getestet: Upload mit
      Tags → Tags korrekt verknüpft; `/activities`-Liste zeigt Karte + Tag-Pills; `/tags/laufen`
      zeigt die Aktivität; `/tags`-Übersicht zählt korrekt; Bearbeiten (Titel/Sportart/Tags
      geändert) → Slug bleibt exakt gleich, Änderungen sofort im Feed UND auf der Detailseite
      sichtbar; Löschen entfernt Aktivität, Verknüpfungen UND Datei; Tags ohne verbleibende
      Verknüpfung verschwinden korrekt aus der Übersicht (Zeile bleibt aber erhalten, wie bei
      Post-Tags auch). Test-Daten/-User danach vollständig entfernt
- [ ] Nicht deployed — Produktions-DB braucht die zusätzliche `CREATE TABLE activity_tag`-Migration
      (rein additiv, kein Risiko) vor dem nächsten Deploy

## "Alben" aus der Navigation entfernt — erledigt

Auf Wunsch: `src/routes/+layout.svelte`s `navItems` ohne `/albums`-Eintrag — Alben bleiben über den
"Alben"-Tab auf `/photos` (`PhotoTabs.svelte`) erreichbar, unverändert. Mobile-Exclude-Filter
entsprechend bereinigt (nur noch `/activities` ausgeschlossen). `npm run check` 0 Fehler, im
Browser verifiziert: Nav zeigt Feed/Beiträge/Fotos/Aktivitäten/Tags, `/photos`s Alben-Tab
funktioniert weiterhin.

## `/posts`-Archivseite für Beiträge — erledigt

Nutzer-Feedback: `/` (Feed) ist ein Fetch-all (Posts + Aktivitäten gemischt), aber Posts hatten
anders als Fotos/Alben/Aktivitäten/Tags keine eigene reine Übersichtsseite.

- [x] `src/routes/posts/+page.server.ts` neu — identische Post-Query wie der Feed (inkl.
      Status-Posts, gleiche Behandlung wie im Feed), aber ohne Aktivitäten/Clustering
- [x] `src/routes/posts/+page.svelte` neu — gleiche `PostCard`-Liste wie der Feed, ohne
      `PostComposer`. Kein Routing-Konflikt mit `posts/new` (statisch, Vorrang) oder `posts/[slug]`
      (dynamisch, matcht nicht den leeren Pfad)
- [x] Nav-Eintrag "Beiträge" ergänzt (zwischen Feed und Fotos, auch auf Mobile sichtbar — anders
      als Alben/Aktivitäten, die dort aus Platzgründen ausgeblendet bleiben)
- [x] `npm run check` — 0 Fehler; im Browser verifiziert (`/posts` zeigt bestehenden Post korrekt,
      Nav-Highlight aktiv)

## Activity-Feature: GPS-Läufe/Fahrten per GPX-Upload — erledigt

Ausgangspunkt: Frage nach aaronparecki.com's Seitenorganisation (Content-Typ-Archive, Tags,
Permalinks) → Wunsch, seine Checkins/Rides nachzubilden. Checkins sind mit den bestehenden
Post-Standortfeldern schon abgedeckt (kein Extra-Modell). Für Rides fehlte echtes GPS-Tracking.
Nutzerentscheidungen: manueller GPX/FIT-Upload (kein Strava-API-Sync), explizit nicht nur Rides
sondern allgemein Aktivitäten (Laufen eingeschlossen). Umfang dieser Umsetzung: **nur GPX** (FIT
bewusst zurückgestellt, Architektur aber so angelegt, dass es später eine kleine Ergänzung wird).
Plan mit Nutzer abgestimmt (Details: `/Users/adrian/.claude/plans/k-nnen-wir-den-posts-polished-sprout.md`).

- [x] Neue `activity`-Tabelle (`src/lib/server/db/schema.ts`) — folgt post/album-Konventionen
      (UUID-IDs, nullable-unique `slug`). Da komplett neue/leere Tabelle (kein `ALTER TABLE` auf
      bestehende Zeilen), sind `title`/`distanceMeters`/`durationSeconds`/`startedAt`/`filename`/
      `trackPoints` ganz regulär `NOT NULL` — die "nullable wegen db:push-Gefahr"-Regel aus
      CLAUDE.md gilt nur für `slug` (SQLite erlaubt mehrere NULLs unter UNIQUE-Index), nicht
      pauschal für jede Spalte. `elevationGainMeters` bleibt nullable (echtes "unbekannt", wenn
      auch nur ein Trackpunkt kein `<ele>` hat). Per `sqlite3` direkt als `CREATE TABLE` angelegt
      (kein Backfill-Skript nötig, anders als bei `post.slug`/`album.slug`).
- [x] `src/lib/server/gpx.ts` neu: `parseGpxTrack()` mit `fast-xml-parser` (bewusst **nicht** das
      npm-Paket `gpxparser`, das `jsdom` als Abhängigkeit zieht) — Haversine-Distanz, Höhengewinn
      als Summe der positiven Deltas (NULL bei auch nur einer Datenlücke, kein Teil-Summen-
      Fallback), Dauer als Elapsed Time über alle `<trk>`/`<trkseg>` hinweg zusammengefasst
      (schließt Auto-Pause-Lücken ein). Volle Auflösung wird zurückgegeben — Downsampling passiert
      bewusst getrennt in `activities.ts`, damit die Statistik-Berechnung nie versehentlich auf
      die downgesampelte Kartendarstellung zugreifen kann.
- [x] `src/lib/server/activities.ts` neu: `generateActivitySlug`/`findActivityBySlugOrId`
      (identisch zu `generatePostSlug`/`generateAlbumSlug`), `normalizeSport()`-Whitelist (Drizzles
      `{enum:[...]}` ist nur TypeScript-seitig, kein SQL-`CHECK` — eine rohe Formular-Eingabe muss
      serverseitig geprüft werden), `buildFallbackTitle()`, `downsampleTrack()`.
- [x] `src/lib/server/storage.ts`: neue `saveUploadedTrackFile(file, allowedExtensions)` — bewusst
      mit Endungs-Parameter statt hartkodiertem `.gpx`, damit späterer FIT-Support ein
      zusätzlicher Aufruf wird, kein Rewrite. Schreibt Rohbytes ohne Transcoding (anders als Fotos).
- [x] Route `activities` + `activities/[slug]` neu, spiegelt `albums`/`albums/[slug]`: `load`
      löst per `findActivityBySlugOrId` auf + `redirect(301,...)` bei Alt-Link über die rohe ID;
      `upload`-Action mit eigenem `if (!locals.user)`-Check **innerhalb** der Action (nicht über
      `hooks.server.ts`, gleiche Begründung wie bei `/albums`); `delete`-Action ohne
      Kaskaden-Komplexität (Aktivitäten besitzen keine Posts/Fotos/Tags).
- [x] `src/lib/components/TrackMap.svelte` neu: Read-only Leaflet-Karte, kopiert
      `LocationPicker.svelte`s SSR-sicheres Muster (dynamisches `import('leaflet')` in `onMount`,
      gleicher Marker-Icon-Fix), zeichnet Polyline + Start/Ziel-Marker + `fitBounds` statt eines
      ziehbaren Markers. CSP erlaubte `tile.openstreetmap.org` bereits (für `LocationPicker`),
      keine Änderung nötig.
- [x] Canonical-Link/`og:title`/`og:description` auf der Detailseite (kein `og:image` — Aktivitäten
      haben kein Foto, gleiches Vorbild wie bei Alben ohne Titelbild), `src/lib/activityFormat.ts`
      neu für die geteilten Format-Helper (Karte + Detailseite).
- [x] Nav-Eintrag "Aktivitäten" ergänzt (aus der mobilen Topnav ausgeschlossen, wie "Alben").
- [x] `fast-xml-parser` als neue Abhängigkeit — geprüft, dass keine der 7 vorbestehenden
      `npm audit`-Findings davon kommt (alle bereits vor dieser Session bekannt: SvelteKit/cookie,
      esbuild/drizzle-kit).
- [x] **Bug beim eigenen Testen gefunden + gefixt:** `buildFallbackTitle()` nutzte
      `toLocaleDateString('de-DE')` ohne explizite Formatoptionen — Node füllt den Monat dabei
      nicht mit führender Null auf ("Lauf am 21.7.2026" statt "21.07.2026", inkonsistent zum Rest
      der App). Mit `{day:'2-digit', month:'2-digit', year:'numeric'}` behoben, wie
      `PostCard.svelte`s `formatDate` es bereits macht.
- [x] `npm run check` — 0 Fehler
- [x] Parsing-Logik isoliert unit-getestet (Node-Skript außerhalb der App, drei synthetische
      GPX-Fixtures mit von Hand nachgerechneten Werten): Normalfall (Distanz ≈1667,9 m, Dauer
      900 s, Höhengewinn 25 m **nicht** 15 m netto, Sport "running" korrekt erkannt), Datei ganz
      ohne Zeitstempel (Dauer/Start korrekt `null`), Datei mit `<ele>` auf nur 3 von 4 Punkten
      (Höhengewinn korrekt `null`, keine Teil-Summe)
- [x] Im Browser + `curl` (Datei-Uploads lassen sich über das Browser-Automatisierungstool nicht
      simulieren) mit temporärem QA-User (danach gelöscht) end-to-end getestet: Upload der
      Normalfall-Datei → Karte/Liste zeigen korrekte Werte, Route zeichnet sichtbar eine Linie
      (SVG-Pfad + 2 Marker im DOM bestätigt), Canonical/OG-Metadaten korrekt, `og:image` komplett
      abwesend; alter roher-ID-Link redirectet mit 301; `/uploads/{filename}` liefert die rohen
      GPX-Bytes mit `Content-Type: application/gpx+xml`; ausgeloggter Upload-Versuch → 401; Datei
      ohne Zeitstempel → 400 mit der erwarteten Fehlermeldung; Datei mit Höhen-Datenlücke → Zeile
      korrekt mit `elevation_gain_meters = NULL`, Detailseite blendet "Höhengewinn"-Stat sauber aus;
      Löschen entfernt DB-Zeile UND Datei von der Platte (per UI-Button, `afterDelete`-Navigation
      zurück zu `/activities` bestätigt). Alle Test-Aktivitäten/-Dateien/-User danach vollständig
      entfernt (lokale DB im Ausgangszustand)
- [x] **Nachtrag auf Nutzer-Feedback:** live angelegte Aktivität tauchte nicht im Feed auf, nur
      unter `/activities` — war zunächst bewusst getrennt wie `/photos`/`/albums`, aber eigentlicher
      Auslöser des ganzen Features war ja aaronparecki.com's EINEM gemeinsamen Feed. Per Rückfrage
      bestätigt: Aktivitäten sollen zusätzlich als Karte im Haupt-Feed erscheinen.
      - `src/routes/+page.server.ts`: lädt jetzt zusätzlich `activity`, merged Posts+Aktivitäten zu
        einer nach "wann ist das passiert" sortierten Liste (`post.createdAt` bzw.
        `activity.startedAt`), Clustering (`clusterPostsByMonth`) läuft über die gemergte Liste —
        die Funktion war durch ihre generische `{id, createdAt}`-Signatur bereits dafür geeignet,
        keine Änderung an `timeline.ts` nötig
      - `src/lib/components/ActivityFeedCard.svelte` neu — kompakte Feed-Variante der
        Aktivitäts-Detailseite (Titel als Permalink statt Datum, wie bei `PostCard` diese Session
        schon umgestellt), inklusive eingebetteter `TrackMap` und Lösch-Button (ohne
        `afterDelete`-Prop im Feed-Kontext → fällt auf `update()` zurück, exakt wie `PostCard`s
        eigenes Verhalten im Feed)
      - `src/routes/+page.svelte`: rendert `PostCard` oder `ActivityFeedCard` je nach `item.kind`
      - Timeline-Sidebar (`PostTimeline.svelte`) brauchte keine Änderung — arbeitet bereits rein
        über generische Anchor-ID-Strings, kennt den Unterschied Post/Aktivität gar nicht
      - `npm run check` — 0 Fehler; im Browser mit temporärem QA-User verifiziert: Aktivität
        erscheint chronologisch korrekt einsortiert im Feed (vor einem älteren Test-Post),
        Zeitleisten-Zähler aktualisiert sich korrekt, Karte rendert inline, Löschen aus dem
        Feed-Kontext aktualisiert die Liste in-place ohne Navigation. Test-Daten/-User danach
        entfernt
- [ ] Nicht deployed — Produktions-DB braucht dieselbe `CREATE TABLE activity`-Migration (rein
      additiv, kein Risiko) vor dem nächsten Deploy
- [x] **Nutzerentscheidung:** FIT-Support wird nicht benötigt — bleibt bei nur GPX. Der
      Endungs-Parameter in `saveUploadedTrackFile` ist trotzdem kein Problem, war nie
      FIT-spezifisch, sondern ein generisches Allow-List-Argument statt einer hartkodierten
      Endung

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
