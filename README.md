# Smart-Home-Dashboard

Ein Dashboard für openHAB 5 in reinem HTML, CSS und JavaScript – ohne Framework und ohne Build-Schritt. Begleit-Repo zum Buch *Smart-Home-Dashboards für Webentwickler und Designer*.

**Live-Demo:** <https://michdo93.github.io/Smart-Home-Dashboard-Live-Demo/> – dasselbe Dashboard, über einen Proxy mit dem [virtuellen Haus](https://github.com/Michdo93/openHAB-Virtual-Smart-Home) verbunden. Wie die Demo entsteht, beschreibt das Buch *openHAB Online Demos* ([Smart-Home-Dashboard-Live-Demo](https://github.com/Michdo93/Smart-Home-Dashboard-Live-Demo)).

## Was es kann

- **Baut sich selbst aus dem semantischen Modell:** Räume (Gruppen unter `rootGroup`) → Geräte (Gruppen im Raum) → Punkte (Items). Keine Item-Namen im Code.
- **Ein Bedienelement je Item-Typ:** Schalter, Slider (Dimmer), Farbwähler (Color), ▲ ■ ▼ (Rollershutter), ⏮ ▶ ⏭ (Player), − / + (Sollwerte), Auswahl (Befehlsoptionen); alles andere als formatierter Wert.
- **Bedienbar ist, was das Modell sagt:** Punkte mit dem Tag `Control`, `Setpoint` oder `Switch`. Messwerte (`Measurement`, `Status`, `Alarm`) werden nur angezeigt.
- **Bereiche und Optionen aus openHAB:** `stateDescription` (min, max, step, pattern) und `commandDescription` (Optionen) der Items.
- **Echtzeit** über Server-Sent Events (`ItemStateChangedEvent`), mit Wiederverbinden und Nachladen nach einer Unterbrechung.
- **Mobile First**, hell und dunkel (folgt dem System, umschaltbar), Bedienflächen mindestens 44 px.

## Aufbau

| Datei | Schicht | Inhalt |
|---|---|---|
| `config.js` | – | Adresse, Token, oberste Gruppe, Übersicht, Reihenfolge der Räume |
| `js/store.js` | Model | `ItemStore`: Zustände und Abonnenten (Observer) |
| `js/widgets.js` | View | ein Bedienelement je Item-Typ |
| `js/format.js` | View | Zustände lesbar machen (Muster, Einheiten, Farben, Datum) |
| `js/app.js` | Controller | Laden, Modell aufbauen, Befehle senden, Ereignisse lesen |
| `css/dashboard.css` | – | Gestaltung, Farben als CSS-Variablen |
| `lib/openhab.min.js` | – | [js-openhab-rest-client](https://github.com/Michdo93/js-openhab-rest-client) (Commit `5c5f160`) |

## Installation

Am einfachsten liefert openHAB das Dashboard selbst aus – dann gibt es keine CORS-Probleme:

```bash
git clone https://github.com/Michdo93/Smart-Home-Dashboard
sudo mkdir -p /etc/openhab/html/dashboard
sudo cp -r Smart-Home-Dashboard/{index.html,config.js,css,js,lib} /etc/openhab/html/dashboard/
```

Aufrufen: `http://<openhab>:8080/static/dashboard/`

In `config.js` mindestens `rootGroup` an Ihr Modell anpassen. Für das virtuelle Haus passt die Voreinstellung.

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

Mit openHAB 5.2.3 und dem virtuellen Haus in Chromium (Playwright), als Smartphone (Pixel 7) und Tablet (1280 × 800): alle Räume, Schalter, Slider, Sollwert, Auswahl, Farbe und Rollladen kommen in openHAB an; Änderungen von außen erscheinen live. Dieselbe Prüfung lief unverändert über den Proxy der Live-Demo.

## Lizenz

MIT – siehe [LICENSE](LICENSE).
