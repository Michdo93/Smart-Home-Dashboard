# Smart-Home-Dashboard

Ein Dashboard für openHAB 5 in reinem HTML, CSS und JavaScript – ohne Framework und ohne Build-Schritt. Begleit-Repo zum Buch *Smart-Home-Dashboards für Webentwickler und Designer*.

**Live-Demo:** <https://michdo93.github.io/Smart-Home-Dashboard-Live-Demo/> – dasselbe Dashboard, über einen Proxy mit dem [virtuellen Haus](https://github.com/Michdo93/openHAB-Virtual-Smart-Home) verbunden. Wie die Demo entsteht, beschreibt das Buch *openHAB Online Demos* ([Smart-Home-Dashboard-Live-Demo](https://github.com/Michdo93/Smart-Home-Dashboard-Live-Demo)).

## Was es kann

- **Baut sich selbst aus dem semantischen Modell:** Räume (Gruppen unter `rootGroup`) → Geräte (Gruppen im Raum) → Punkte (Items). Keine Item-Namen im Code.
- **Ein Bedienelement je Item-Typ:** Schalter, Slider (Dimmer), Farbwähler (Color), ▲ ■ ▼ (Rollershutter), ⏮ ▶ ⏭ (Player), − / + (Sollwerte), Auswahl (Befehlsoptionen); alles andere als formatierter Wert.
- **Bedienbar ist, was das Modell sagt:** Punkte mit dem Tag `Control`, `Setpoint` oder `Switch`. Messwerte (`Measurement`, `Status`, `Alarm`) werden nur angezeigt.
- **Bereiche und Optionen aus openHAB:** `stateDescription` (min, max, step, pattern) und `commandDescription` (Optionen) der Items.
- **Gerätemodule:** Lampen (`Lightbulb`), Thermostate (`Thermostat`) und Wetter (`WeatherStation`, `WeatherService`) bekommen eigene Karten, alle anderen Geräte die allgemeine. Neue Module in `js/modules.js`.
- **Farbkreis** mit [iro.js](https://iro.js.org) für Color-Items.
- **Verlaufsdiagramme** aus der Persistence mit [Chart.js](https://www.chartjs.org): Klick auf einen Zahlenwert, 6 h, 24 h oder 7 Tage.
- **Echtzeit** über Server-Sent Events (`ItemStateChangedEvent`), mit Wiederverbinden und Nachladen nach einer Unterbrechung.
- **Uhrzeit** des Geräts in der Kopfzeile.
- **Deutsch, Englisch und Französisch** (i18n), Zahlen und Zeiten nach Sprache (l10n); weitere Sprachen in `js/i18n.js`.
- **Themes:** mitgeliefert ist `standard`; weitere Designs und ganze Ansichten installieren Sie aus eigenen Repos (siehe [Themes und Ansichten](#themes-und-ansichten)). Ein Theme ist nur eine CSS-Datei mit Variablen, hell und dunkel, Kontrast nach WCAG geprüft (Text ≥ 4,5 : 1, Bedienelemente ≥ 3 : 1).
- **Sperrbildschirm** mit PIN, per Knopf oder nach einigen Minuten ohne Bedienung – ein Sichtschutz, keine Sicherheit.
- **Wandtablets:** `?room=gVH_Kueche&kiosk=1` startet in einem Raum und blendet die Raumleiste aus.
- **Mobile First**, jede Bedienfläche mindestens 44 × 44 px.

## Aufbau

| Datei | Schicht | Inhalt |
|---|---|---|
| `config.js` | – | Adresse, Token, oberste Gruppe, Übersicht, Reihenfolge der Räume |
| `js/store.js` | Model | `ItemStore`: Zustände und Abonnenten (Observer) |
| `js/widgets.js` | View | ein Bedienelement je Item-Typ |
| `js/modules.js` | View | Gerätemodule (Lampe, Thermostat, Wetter) und allgemeine Karte |
| `js/color.js`, `js/history.js`, `js/dialog.js` | View | Farbkreis, Verlaufsdiagramm, Fenster |
| `js/lock.js` | View | Sperrbildschirm |
| `js/format.js`, `js/i18n.js` | View | Zustände lesbar machen, Texte in Deutsch und Englisch |
| `js/controller.js` | Controller | Verbinden, Laden, Befehle senden, Räume und Geräte aus dem Modell, Echtzeit mit Wächter – ohne Ansicht, auch für die Bootstrap- und Material-Ansicht |
| `js/app.js` | View/Controller | Standard-Ansicht: Kopfzeile, Raumleiste, Übersicht, Karten, Einstellungen |
| `css/dashboard.css` | – | Aufbau und Abstände |
| `themes/standard.css` | – | Grund-Theme (Farben und Formen als CSS-Variablen) |
| `lib/openhab.min.js` | – | [js-openhab-rest-client](https://github.com/Michdo93/js-openhab-rest-client) (Commit `5c5f160`, MIT) |
| `lib/iro.min.js` | – | [iro.js](https://github.com/jaames/iro.js) 5.5.2 (MPL-2.0) |
| `lib/chart.umd.min.js` | – | [Chart.js](https://github.com/chartjs/Chart.js) 4.6.1 (MIT) |

## Beispiele zum Buch

| Datei | Kapitel | Inhalt |
|---|---|---|
| `beispiele/01-erste-schritte.html` | 3 | Verbinden, Item lesen, Änderungen abonnieren, schalten |

## Installation

Am einfachsten liefert openHAB das Dashboard selbst aus – dann gibt es keine CORS-Probleme:

```bash
git clone https://github.com/Michdo93/Smart-Home-Dashboard
sudo mkdir -p /etc/openhab/html/dashboard
sudo cp -r Smart-Home-Dashboard/{index.html,config.js,css,js,lib,themes} /etc/openhab/html/dashboard/
```

Aufrufen: `http://<openhab>:8080/static/dashboard/`

In `config.js` mindestens `rootGroup` an Ihr Modell anpassen. Für das virtuelle Haus passt die Voreinstellung. Für die Diagramme `persistenceService` auf Ihren Dienst setzen (z. B. `rrd4j`).

Adresszeile:

| Parameter | Wirkung |
|---|---|
| `?room=gVH_Kueche` | mit diesem Raum starten |
| `&kiosk=1` | Raumleiste und Einstellungen ausblenden (Wandtablet) |
| `&theme=glas` | Design wählen |
| `&lang=en` | Sprache wählen |

Zum Entwickeln geht auch ein lokaler Webserver (`python3 -m http.server 5173`). Dann `openhabUrl` auf Ihr openHAB setzen und dort CORS erlauben. Direkt als Datei (`file://`) laufen die JavaScript-Module nicht.

## Themes und Ansichten

Jedes Design liegt in einem eigenen Repo mit Installationsskript und eigener Online-Demo:

| Repo | Art | Idee | Online-Demo |
|---|---|---|---|
| [theme-standard](https://github.com/Michdo93/smart-home-dashboard-theme-standard) | CSS-Theme | schlicht, hell und dunkel; Vorlage für eigene Themes (hier schon enthalten) | [Demo](https://michdo93.github.io/smart-home-dashboard-theme-standard-live-demo/) |
| [theme-glas](https://github.com/Michdo93/smart-home-dashboard-theme-glas) | CSS-Theme | Farbverlauf, halbdurchsichtige Karten, Weichzeichner | [Demo](https://michdo93.github.io/smart-home-dashboard-theme-glas-live-demo/) |
| [theme-eink](https://github.com/Michdo93/smart-home-dashboard-theme-eink) | CSS-Theme | schwarz auf weiß für E-Paper-Displays, Form statt Farbe | [Demo](https://michdo93.github.io/smart-home-dashboard-theme-eink-live-demo/) |
| [theme-bootstrap](https://github.com/Michdo93/smart-home-dashboard-theme-bootstrap) | Ansicht | dasselbe Dashboard mit Bootstrap 5 | [Demo](https://michdo93.github.io/smart-home-dashboard-theme-bootstrap-live-demo/) |
| [theme-material](https://github.com/Michdo93/smart-home-dashboard-theme-material) | Ansicht | Material Design 3 (Beer CSS), Farben aus einer Markenfarbe | [Demo](https://michdo93.github.io/smart-home-dashboard-theme-material-live-demo/) |

Ein **CSS-Theme** ersetzt nur Farben und Formen und erscheint unter Zahnrad → Design. Eine **Ansicht** baut die Oberfläche mit einem anderen Framework neu und nutzt dafür den Controller dieses Repos (`js/controller.js`); sie liegt als Unterordner im Dashboard, z. B. `…/dashboard/bootstrap/`.

```bash
git clone https://github.com/Michdo93/smart-home-dashboard-theme-glas
sudo smart-home-dashboard-theme-glas/install.sh          # trägt "glas" in config.js ein
sudo smart-home-dashboard-theme-glas/install.sh --default # … und startet damit
```

## Voraussetzungen an das Modell

- Räume sind Gruppen unter `rootGroup`, die selbst Gruppen (Geräte) enthalten.
- Bedienbare Punkte tragen das Tag `Control`, `Setpoint` oder `Switch`.
- Sollwerte haben `stateDescription` mit `min` und `max`, Auswahlen `commandDescription` mit `options`, z. B.:

```
Number:Temperature Wohnzimmer_Thermostat_Soll "Solltemperatur [%.1f °C]"
    (Wohnzimmer_Thermostat) ["Setpoint", "Temperature"]
    { unit="°C", stateDescription=""[min="16", max="26", step="0.5"] }
String Wohnzimmer_Farblampe_Effekt "Effekt [%s]" (Wohnzimmer_Farblampe) ["Control", "Mode"]
    { commandDescription=""[options="kein=kein,Kerze=Kerze,Regenbogen=Regenbogen"] }
```

## Getestet

Mit openHAB 5.2.3 und dem virtuellen Haus in Chromium (Playwright), als Smartphone (Pixel 7) und Tablet (1280 × 800): Schalter, Slider, Sollwert, Auswahl, Farbkreis und Rollladen kommen in openHAB an; Änderungen von außen erscheinen live; Verlauf, Sperrbildschirm, Englisch, Themes und Kioskmodus; Wiederverbinden nach Ausfall und Wächter bei stummer Verbindung. Dieselbe Prüfung lief unverändert über den Proxy der Live-Demo.

## Unterstützen

Wenn Ihnen dieses Projekt hilft, freue ich mich über einen Kaffee:

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/Michdo93)

## Lizenz

MIT – siehe [LICENSE](LICENSE).
