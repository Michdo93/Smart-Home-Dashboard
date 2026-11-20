/**
 * i18n.js – Texte der Oberfläche in Deutsch und Englisch.
 *
 * i18n (internationalization): Texte stehen nicht im Code, sondern in
 * Wörterbüchern. l10n (localization): Zahlen, Datum und Uhrzeit folgen den
 * Regeln der Sprache – dafür sorgt Intl mit dem passenden Locale.
 * Die Beschriftungen der Items kommen aus openHAB und bleiben, wie sie dort
 * stehen.
 */
const TEXTS = {
  de: {
    overview: "Übersicht", house: "Haus", room: "Raum", loading: "Lade Items …",
    online: "verbunden", offline: "Verbindung unterbrochen – neuer Versuch …",
    unreachable: "openHAB nicht erreichbar", of: "von",
    on: "an", off: "aus", open: "offen", closed: "geschlossen",
    playing: "läuft", paused: "pausiert",
    settings: "Einstellungen", language: "Sprache", theme: "Design",
    mode: "Hell oder dunkel", light: "hell", dark: "dunkel", auto: "wie System",
    lock: "Sperren", locked: "Gesperrt", enterPin: "PIN eingeben",
    wrongPin: "Falsche PIN", close: "Schließen", delete: "Löschen",
    up: "hoch", stop: "stopp", down: "runter", less: "weniger", more: "mehr",
    previous: "zurück", play: "Wiedergabe", next: "weiter",
    color: "Farbe wählen", history: "Verlauf", hours: "{n} h", days: "{n} Tage",
    noHistory: "Keine Daten für diesen Zeitraum.", setpoint: "Soll", heating: "heizt"
  },
  en: {
    overview: "Overview", house: "House", room: "Room", loading: "Loading items …",
    online: "connected", offline: "Connection lost – retrying …",
    unreachable: "openHAB not reachable", of: "of",
    on: "on", off: "off", open: "open", closed: "closed",
    playing: "playing", paused: "paused",
    settings: "Settings", language: "Language", theme: "Theme",
    mode: "Light or dark", light: "light", dark: "dark", auto: "like system",
    lock: "Lock", locked: "Locked", enterPin: "Enter PIN",
    wrongPin: "Wrong PIN", close: "Close", delete: "Delete",
    up: "up", stop: "stop", down: "down", less: "less", more: "more",
    previous: "previous", play: "play", next: "next",
    color: "Choose colour", history: "History", hours: "{n} h", days: "{n} days",
    noHistory: "No data for this period.", setpoint: "Target", heating: "heating"
  }
};

const LOCALES = { de: "de-DE", en: "en-GB" };
let current = "de";

export function setLanguage(language) {
  current = TEXTS[language] ? language : "de";
  document.documentElement.lang = current;
}

export function language() {
  return current;
}

export function languages() {
  return Object.keys(TEXTS);
}

/** Locale für Intl, z. B. "de-DE" → 21,5 und 24-Stunden-Uhr. */
export function locale() {
  return LOCALES[current];
}

/** Text zum Schlüssel; {n} wird durch vars.n ersetzt. */
export function t(key, vars = {}) {
  const text = TEXTS[current][key] ?? TEXTS.de[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? "");
}
