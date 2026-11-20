/**
 * config.js – die einzige Datei, die Sie für Ihr openHAB anpassen.
 */
window.DASHBOARD_CONFIG = {
  // Adresse von openHAB. location.origin passt, wenn das Dashboard unter
  // http://<openhab>:8080/static/dashboard/ liegt (Ordner conf/html).
  openhabUrl: location.origin,

  // API-Token, nur nötig, wenn openHAB Befehle ohne Anmeldung ablehnt.
  // Nie in ein öffentlich erreichbares Dashboard eintragen.
  token: null,

  // Oberste Gruppe des semantischen Modells
  rootGroup: "gVH_Haus",

  // Titel in der Kopfzeile
  title: "Virtuelles Haus",

  // Sprache beim ersten Aufruf: "de" oder "en"
  language: "de",

  // Designs aus dem Ordner themes/ (das erste ist die Voreinstellung)
  themes: ["standard", "glas"],

  // Dienst für die Verlaufsdiagramme; null = Standard von openHAB
  persistenceService: "rrd4j",

  // Sperrbildschirm: pin = null schaltet ihn ab. Nur ein Sichtschutz –
  // die PIN steht im Browser und ist für Kundige lesbar.
  // afterMinutes: automatisch sperren (null = nie), startLocked: beim Laden
  lock: { pin: null, afterMinutes: 5, startLocked: true },

  // Gruppen mit Summen oder Mittelwerten für die Übersicht
  overview: ["gVH_Innen", "gVH_Lichter", "gVH_Fenster", "gVH_Verbrauch"],

  // Reihenfolge der Räume (fehlende kommen alphabetisch dahinter)
  roomOrder: ["gVH_Wohnzimmer", "gVH_Kueche", "gVH_Schlafzimmer", "gVH_Bad",
    "gVH_Diele", "gVH_Technik", "gVH_Garage", "gVH_Garten"]
};
