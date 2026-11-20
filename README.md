# Smart-Home-Dashboard

Ein Dashboard für openHAB 5 in reinem HTML, CSS und JavaScript – ohne Framework und ohne Build-Schritt. Begleit-Repo zum Buch *Smart-Home-Dashboards für Webentwickler und Designer*.

**Live-Demo:** <https://michdo93.github.io/Smart-Home-Dashboard-Live-Demo/> – dasselbe Dashboard, über einen Proxy mit dem [virtuellen Haus](https://github.com/Michdo93/openHAB-Virtual-Smart-Home) verbunden. Wie die Demo entsteht, beschreibt das Buch *openHAB Online Demos* ([Smart-Home-Dashboard-Live-Demo](https://github.com/Michdo93/Smart-Home-Dashboard-Live-Demo)).

## Was es kann

- **Baut sich selbst aus dem semantischen Modell:** Räume (Gruppen unter `rootGroup`) → Geräte (Gruppen im Raum) → Punkte (Items). Keine Item-Namen im Code.
- **Ein Bedienelement je Item-Typ:** Schalter, Slider (Dimmer), Farbwähler (Color), ▲ ■ ▼ (Rollershutter), ⏮ ▶ ⏭ (Player), − / + (Sollwerte), Auswahl (Befehlsoptionen); alles andere als formatierter Wert.
- **Bedienbar ist, was das Modell sagt:** Punkte mit dem Tag `Control`, `Setpoint` oder `Switch`. Messwerte (`Measurement`, `Status`, `Alarm`) werden nur angezeigt.
- **Bereiche und Optionen aus openHAB:** `stateDescription` (min, max, step, pattern) und `commandDescription` (Optionen) der Items.
- **Gerätemodule:** Lampen (`Lightbulb`) und Thermostate (`Thermostat`) bekommen eigene Karten, alle anderen Geräte die allgemeine. Neue Module in `js/modules.js`.
- **Farbkreis** mit [iro.js](https://iro.js.org) für Color-Items.
- **Verlaufsdiagramme** aus der Persistence mit [Chart.js](https://www.chartjs.org): Klick auf einen Zahlenwert, 6 h, 24 h oder 7 Tage.
- **Echtzeit** über Server-Sent Events (`ItemStateChangedEvent`), mit Wiederverbinden und Nachladen nach einer Unterbrechung.
- **Uhrzeit** des Geräts in der Kopfzeile.
- **Deutsch und Englisch** (i18n), Zahlen und Zeiten nach Sprache (l10n).
- **Themes:** `standard` und `glas`, jeweils hell und dunkel; ein Theme ist nur eine CSS-Datei mit Variablen.
- **Sperrbildschirm** mit PIN, per Knopf oder nach einigen Minuten ohne Bedienung – ein Sichtschutz, keine Sicherheit.
- **Wandtablets:** `?room=gVH_Kueche&kiosk=1` startet in einem Raum und blendet die Raumleiste aus.
- **Mobile First**, Bedienflächen mindestens 44 px.

## Aufbau

| Datei | Schicht | Inhalt |
|---|---|---|
| `config.js` | – | Adresse, Token, oberste Gruppe, Übersicht, Reihenfolge der Räume |
| `js/store.js` | Model | `ItemStore`: Zustände und Abonnenten (Observer) |
| `js/widgets.js` | View | ein Bedienelement je Item-Typ |
| `js/modules.js` | View | Gerätemodule (Lampe, Thermostat) und allgemeine Karte |
| `js/color.js`, `js/history.js`, `js/dialog.js` | View | Farbkreis, Verlaufsdiagramm, Fenster |
| `js/lock.js` | View | Sperrbildschirm |
| `js/format.js`, `js/i18n.js` | View | Zustände lesbar machen, Texte in Deutsch und Englisch |
| `js/app.js` | Controller | Laden, Modell aufbauen, Befehle senden, Ereignisse lesen, Einstellungen |
| `css/dashboard.css` | – | Aufbau und Abstände |
| `themes/*.css` | – | Farben und Formen als CSS-Variablen |
| `lib/openhab.min.js` | – | [js-openhab-rest-client](https://github.com/Michdo93/js-openhab-rest-client) (Commit `5c5f160`, MIT) |
| `lib/iro.min.js` | – | [iro.js](https://github.com/jaames/iro.js) 5.5.2 (MPL-2.0) |
| `lib/chart.umd.min.js` | – | [Chart.js](https://github.com/chartjs/Chart.js) 4.6.1 (MIT) |

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

Mit openHAB 5.2.3 und dem virtuellen Haus in Chromium (Playwright), als Smartphone (Pixel 7) und Tablet (1280 × 800): Schalter, Slider, Sollwert, Auswahl, Farbkreis und Rollladen kommen in openHAB an; Änderungen von außen erscheinen live; Verlauf, Sperrbildschirm, Englisch, Theme „glas“ und Kioskmodus. Dieselbe Prüfung lief unverändert über den Proxy der Live-Demo.

## Lizenz

MIT – siehe [LICENSE](LICENSE).
