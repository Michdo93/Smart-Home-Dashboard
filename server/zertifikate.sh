#!/usr/bin/env bash
# Erzeugt eine eigene Zertifizierungsstelle (CA) und ein Serverzertifikat
# für nginx vor openHAB.
#
#   ./zertifikate.sh <name> [ip]
#   z. B. ./zertifikate.sh openhab.local 192.168.178.20
#
# Ergebnis im Ordner ssl/: smarthome-ca.crt (auf alle Geräte verteilen),
# smarthome-ca.key (geheim halten!), openhab.crt und openhab.key (für nginx).
# Eine vorhandene CA wird weiterverwendet; nur das Serverzertifikat ist neu.
set -euo pipefail
NAME="${1:?Name des Servers fehlt, z. B. openhab.local}"
IP="${2:-}"
mkdir -p ssl && cd ssl
umask 077   # Schlüssel nur für den Besitzer lesbar

if [ ! -f smarthome-ca.key ]; then
  openssl req -x509 -newkey rsa:3072 -nodes -days 3650 \
    -keyout smarthome-ca.key -out smarthome-ca.crt -subj "/CN=Smart Home CA"
fi

SAN="DNS:$NAME"
if [ -n "$IP" ]; then SAN="$SAN,IP:$IP"; fi
printf 'subjectAltName=%s\nextendedKeyUsage=serverAuth\n' "$SAN" > san.ext
openssl req -newkey rsa:2048 -nodes -keyout openhab.key -out openhab.csr \
  -subj "/CN=$NAME"
# Apple-Geräte nehmen Serverzertifikate höchstens 825 Tage lang an
openssl x509 -req -in openhab.csr -CA smarthome-ca.crt -CAkey smarthome-ca.key \
  -CAcreateserial -days 825 -extfile san.ext -out openhab.crt
rm -f openhab.csr san.ext
chmod 644 smarthome-ca.crt openhab.crt

openssl x509 -in openhab.crt -noout -subject -ext subjectAltName -enddate
