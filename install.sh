#!/usr/bin/env bash
# Installiert oder aktualisiert das Smart-Home-Dashboard in openHAB.
#
#   sudo ./install.sh [Ordner]
#
# Ohne Ordner: /etc/openhab/html/dashboard (openHAB als Paket installiert).
# Eine vorhandene config.js bleibt erhalten; die neue Vorlage liegt dann
# als config.js.neu daneben. Installierte Themes und Ansichten bleiben.
set -euo pipefail
ZIEL="${1:-/etc/openhab/html/dashboard}"
HIER="$(cd "$(dirname "$0")" && pwd)"

mkdir -p "$ZIEL"
cp -r "$HIER"/{index.html,css,js,lib,themes} "$ZIEL"/
if [ -f "$ZIEL/config.js" ]; then
  install -m 644 "$HIER/config.js" "$ZIEL/config.js.neu"
  echo "Ihre config.js bleibt; die neue Vorlage steht in config.js.neu"
else
  install -m 644 "$HIER/config.js" "$ZIEL/config.js"
fi
# openHAB muss die Dateien lesen können
if id openhab >/dev/null 2>&1; then chown -R openhab:openhab "$ZIEL"; fi

echo "Dashboard installiert in $ZIEL"
echo "Aufruf: http://<openhab>:8080/static/$(basename "$ZIEL")/"
echo "Hinweis: Browser halten alte Dateien fest – siehe README, »Aktualisieren«."
