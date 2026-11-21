/**
 * controller.js – Controller ohne Ansicht: verbindet openHAB, hält den Store
 * aktuell, sendet Befehle und leitet Räume und Geräte aus dem semantischen
 * Modell ab. app.js (Standard-Ansicht) nutzt ihn ebenso wie die Ansichten
 * mit Bootstrap und Material Design aus den Theme-Repos.
 *
 * Nutzt nur die Klassen von js-openhab-rest-client (window.openHAB). Mit
 * js-openhab-proxy-client funktioniert dieselbe Datei unverändert.
 */
import { ItemStore } from "./store.js";
import { t } from "./i18n.js";

const {
  OpenHABClient, Items, ItemEvents, Persistence, iterSSELines, parseSSEData
} = window.openHAB;
const SILENCE_MS = 30000;   // so lange ohne Lebenszeichen gilt die Verbindung als tot

/**
 * config:  window.DASHBOARD_CONFIG
 * onStatus(state, text): "online" | "offline" – für den Punkt in der Kopfzeile
 * onError(text): kurzer Hinweis, wenn ein Befehl scheitert
 */
export function createController(config, callbacks = {}) {
  const { onStatus = () => {}, onError = () => {} } = callbacks;
  const store = new ItemStore();
  let client;
  let items;

  /** Verbinden und alle Items laden; true, wenn es geklappt hat. */
  async function connect() {
    const { openhabUrl, token } = config;
    client = await new OpenHABClient(openhabUrl, null, null, token).ready;
    items = new Items(client);
    return reload();
  }

  /** Lädt alle Items in den Store; true, wenn es geklappt hat. */
  async function reload() {
    const list = await items.getItems();
    if (list.error) {
      onStatus("offline", `${t("unreachable")}: ${list.error}`);
      return false;
    }
    store.load(list);
    return true;
  }

  /** Befehl senden; Fehler meldet onError. */
  async function send(name, command) {
    const result = await items.sendCommand(name, String(command));
    if (result.error) onError(`${store.get(name)?.label ?? name}: ${result.error}`);
  }

  /** Verlauf aus der Persistence (Dienst aus config.persistenceService). */
  function loadHistory(name, start, end) {
    return new Persistence(client).getItemPersistenceData(name,
      config.persistenceService ?? null,
      { startTime: start.toISOString(), endTime: end.toISOString() });
  }

  // ─── Modell: Räume → Geräte → Punkte ──────────────────────────────────────

  /** Räume: Gruppen unter rootGroup, die selbst Gruppen (Geräte) enthalten */
  function rooms() {
    const order = config.roomOrder ?? [];
    const rank = (name) =>
      (order.includes(name) ? order.indexOf(name) : order.length);
    const direct = store.members(config.rootGroup);
    const roomGroups = direct.filter((item) => item.type === "Group"
      && store.members(item.name).some((member) => member.type === "Group"));
    const rest = direct.filter((item) => !roomGroups.includes(item));
    const list = roomGroups.sort((a, b) => rank(a.name) - rank(b.name)
      || a.label.localeCompare(b.label));
    if (rest.length) {
      list.push({ name: config.rootGroup, label: t("house"), only: rest });
    }
    return list;
  }

  /** Geräte eines Raums: Gruppen mit ihren Punkten, lose Items als "Raum" */
  function devices(room) {
    const members = room.only ?? store.members(room.name);
    const groups = members.filter((item) => item.type === "Group");
    const loose = members.filter((item) => item.type !== "Group");
    const list = groups.map((group) =>
      ({ group, points: store.members(group.name) }));
    if (loose.length) {
      list.push({ group: { label: t("room"), name: "" }, points: loose });
    }
    return list.filter((device) => device.points.length);
  }

  // ─── Echtzeit ─────────────────────────────────────────────────────────────

  /**
   * Liest Zustandsänderungen und verbindet sich nach einem Abbruch neu.
   * openHAB schickt alle 10 s ein ALIVE (der Proxy der Live-Demo einen
   * Kommentar). Bleibt jedes Lebenszeichen 30 s aus – etwa weil das WLAN
   * eines Tablets eingeschlafen ist –, bricht der Wächter ab und verbindet neu.
   */
  async function watch() {
    let first = true;
    while (true) {
      const stream = await new ItemEvents(client).ItemStateChangedEvent();
      if (!stream.error) {
        if (!first) await reload();          // Änderungen während der Pause
        first = false;
        onStatus("online", t("online"));
        let heard = Date.now();
        const guard = setInterval(() => {
          if (Date.now() - heard > SILENCE_MS) stream.abort?.();
        }, 5000);
        try {
          for await (const line of iterSSELines(stream)) {
            heard = Date.now();               // jede Zeile ist ein Lebenszeichen
            const event = parseSSEData(line);
            const value = event?.payload?.value;
            if (event?.topic && value !== undefined) {
              store.setState(event.topic.split("/")[2], value);
            }
          }
        } catch (err) {
          console.warn("Ereignisstrom:", err);
        } finally {
          clearInterval(guard);
        }
      }
      onStatus("offline", t("offline"));
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  return {
    store, connect, reload, send, rooms, devices, watch,
    loadHistory: Persistence ? loadHistory : null
  };
}
