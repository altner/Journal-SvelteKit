<script lang="ts">
	import { CONTACT_NAME, CONTACT_EMAIL } from '$lib/consts';
</script>

<svelte:head>
	<title>Datenschutzerklärung · achis.blog</title>
</svelte:head>

<div class="page">
	<div class="card prose">
		<h1>Datenschutzerklärung</h1>

		<hr />

		<h2>1. Verantwortlicher</h2>
		<p>
			Verantwortlicher für die Datenverarbeitung auf dieser Website im Sinne der
			Datenschutz-Grundverordnung (DSGVO) ist:
		</p>
		<p>
			<strong>{CONTACT_NAME}</strong><br />
			<strong>E-Mail:</strong> {CONTACT_EMAIL}
		</p>

		<hr />

		<h2>2. Allgemeine Hinweise zur Datenverarbeitung</h2>
		<p>
			Der Schutz deiner personenbezogenen Daten ist mir wichtig. Ich behandle deine
			personenbezogenen Daten vertraulich und entsprechend den gesetzlichen
			Datenschutzvorschriften sowie dieser Datenschutzerklärung.
		</p>
		<p>
			Die Nutzung dieser Website zum reinen Lesen (Feed, Fotos, Alben, einzelne Beiträge) ist
			ohne Angabe personenbezogener Daten möglich. Ein Login ist nur für das Erstellen von
			Beiträgen nötig und ausschließlich für den Betreiber selbst vorgesehen — es gibt keine
			öffentliche Registrierung.
		</p>

		<hr />

		<h2>3. Datenerfassung beim Besuch dieser Website</h2>
		<p><strong>Server-Logfiles</strong></p>
		<p>
			Beim Besuch dieser Website erhebt und speichert der Hosting-Anbieter automatisch
			Informationen in sogenannten Server-Logfiles, die dein Browser automatisch übermittelt.
			Dies sind:
		</p>
		<ul>
			<li>Deine IP-Adresse</li>
			<li>Datum und Uhrzeit der Anfrage</li>
			<li>Inhalt der Anforderung (konkrete Seite)</li>
			<li>Zugriffsstatus / HTTP-Statuscode</li>
			<li>Übertragene Datenmenge</li>
			<li>Website, von der die Anforderung kommt (Referrer)</li>
			<li>Browsertyp und Version</li>
			<li>Betriebssystem</li>
		</ul>
		<p>
			Diese Daten werden nicht mit anderen Datenquellen zusammengeführt. Rechtsgrundlage der
			Verarbeitung ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse). Das berechtigte
			Interesse liegt in der technisch fehlerfreien Darstellung und Optimierung dieser
			Website.
		</p>

		<hr />

		<h2>4. Hosting</h2>
		<p>
			Diese Website wird gehostet bei der <strong>Hetzner Online GmbH</strong>,
			Industriestr. 25, 91710 Gunzenhausen, Deutschland (<a
				href="https://www.hetzner.com"
				target="_blank"
				rel="noopener noreferrer">hetzner.com</a
			>). Die Datenverarbeitung erfolgt ausschließlich auf Servern innerhalb der
			Europäischen Union und gewährleistet damit ein hohes Datenschutzniveau im Sinne der
			DSGVO.
		</p>
		<p>
			Beim Besuch dieser Website kann Hetzner technische Verbindungsdaten (z.B.
			IP-Adresse) im Rahmen des Serverbetriebs verarbeiten. Details siehe
			Datenschutzerklärung von Hetzner: <a
				href="https://www.hetzner.com/de/rechtliches/datenschutz"
				target="_blank"
				rel="noopener noreferrer">hetzner.com/de/rechtliches/datenschutz</a
			>.
		</p>

		<hr />

		<h2>5. Login-Cookie</h2>
		<p>
			Diese Website setzt ein einziges, technisch notwendiges Cookie namens <code>session</code>
			— und zwar ausschließlich dann, wenn sich der Betreiber einloggt, um einen Beitrag zu
			erstellen. Es enthält ein zufälliges Sitzungs-Token, ist <code>httpOnly</code> (per
			JavaScript nicht auslesbar) und läuft nach 30 Tagen automatisch ab. Besucher, die diese
			Website nur lesen, erhalten dieses Cookie nicht, da hierfür kein Login erforderlich ist.
		</p>
		<p>
			Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer sicheren
			und funktionsfähigen Login-Funktion) bzw. § 25 Abs. 2 Nr. 2 TTDSG (technisch notwendiges
			Cookie).
		</p>

		<hr />

		<h2>6. Fotos und Beiträge</h2>
		<p>
			Die auf dieser Website veröffentlichten Fotos und Texte werden ausschließlich vom
			Betreiber selbst hochgeladen bzw. verfasst — Besucher können keine eigenen Inhalte
			einstellen. Enthalten Fotos abgebildete Personen, geschieht die Veröffentlichung in
			redaktioneller Verantwortung des Betreibers.
		</p>

		<hr />

		<h2>7. Cookies, Tracking und Analyse</h2>
		<p>
			Über das in Abschnitt 5 beschriebene Login-Cookie hinaus setzt diese Website
			<strong>keine weiteren Cookies</strong> und verwendet keine Tracking- oder
			Analyse-Tools (z.B. Google Analytics, Matomo, Plausible). Es findet kein
			websiteübergreifendes Tracking und keine Profilbildung statt. Es werden auch keine
			Inhalte von Drittanbietern (z.B. Karten, Videos, Schriftarten) von externen Servern
			nachgeladen.
		</p>

		<hr />

		<h2>8. Weitergabe an Dritte</h2>
		<p>
			Eine Weitergabe deiner Daten an Dritte findet nicht statt, mit Ausnahme des in Abschnitt
			4 genannten Hosting-Anbieters, der im Rahmen einer Auftragsverarbeitung (Art. 28 DSGVO)
			technisch notwendige Verbindungsdaten verarbeitet.
		</p>

		<hr />

		<h2>9. Deine Rechte</h2>
		<p>Dir stehen folgende Rechte bezüglich deiner personenbezogenen Daten zu:</p>
		<ul>
			<li><strong>Auskunftsrecht</strong> (Art. 15 DSGVO)</li>
			<li><strong>Recht auf Berichtigung</strong> (Art. 16 DSGVO)</li>
			<li><strong>Recht auf Löschung</strong> (Art. 17 DSGVO)</li>
			<li><strong>Recht auf Einschränkung der Verarbeitung</strong> (Art. 18 DSGVO)</li>
			<li><strong>Recht auf Datenübertragbarkeit</strong> (Art. 20 DSGVO)</li>
			<li><strong>Widerspruchsrecht</strong> (Art. 21 DSGVO)</li>
		</ul>
		<p>Zur Ausübung dieser Rechte wende dich bitte an die in Abschnitt 1 genannte Adresse.</p>

		<hr />

		<h2>10. Beschwerderecht</h2>
		<p>
			Du hast das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu beschweren. Die
			zuständige Aufsichtsbehörde richtet sich nach deinem Wohnort bzw. dem Ort des
			mutmaßlichen Verstoßes. Eine Liste aller deutschen Aufsichtsbehörden findest du unter:
			<a
				href="https://www.bfdi.bund.de/DE/Service/Anschriften/Laender/Laender-node.html"
				target="_blank"
				rel="noopener noreferrer"
				>bfdi.bund.de</a
			>
		</p>

		<hr />

		<h2>11. Datensicherheit</h2>
		<p>
			Diese Website nutzt aus Sicherheitsgründen und zum Schutz der Übertragung vertraulicher
			Inhalte eine SSL/TLS-Verschlüsselung. Eine verschlüsselte Verbindung erkennst du am
			Schloss-Symbol in der Adressleiste deines Browsers sowie am Präfix <code>https://</code>.
		</p>

		<hr />

		<h2>12. Änderungen dieser Datenschutzerklärung</h2>
		<p>
			Ich behalte mir vor, diese Datenschutzerklärung anzupassen, damit sie stets den
			aktuellen rechtlichen Anforderungen entspricht oder um Änderungen an dieser Website
			umzusetzen. Die aktuelle Version ist immer auf dieser Seite verfügbar.
		</p>
	</div>
</div>

<style>
	.prose {
		padding: 24px 20px;
	}
	h1 {
		font-size: 22px;
		margin: 0 0 16px 0;
	}
	h2 {
		font-size: 16px;
		margin: 0 0 8px 0;
	}
	p {
		font-size: 14px;
		line-height: 1.6;
		margin: 0 0 16px 0;
	}
	ul {
		font-size: 14px;
		line-height: 1.6;
		margin: 0 0 16px 0;
		padding-left: 20px;
	}
	li {
		margin-bottom: 4px;
	}
	code {
		background: var(--fb-hover);
		padding: 1px 5px;
		border-radius: 4px;
		font-size: 13px;
	}
	hr {
		border: none;
		border-top: 1px solid var(--fb-border);
		margin: 20px 0;
	}
	a {
		color: var(--fb-blue);
		text-decoration: none;
	}
	a:hover {
		text-decoration: underline;
	}
</style>
