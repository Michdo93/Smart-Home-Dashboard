/**
 * app.js – Controller: verbindet openHAB, Store und Ansicht.
 *
 * Nutzt nur die Klassen von js-openhab-rest-client (window.openHAB). Mit
 * js-openhab-proxy-client funktioniert dieselbe Datei unverändert.
 *
 * Adresszeile (z. B. für Wandtablets):
 *   ?room=gVH_Kueche   mit diesem Raum starten
 *   &kiosk=1           Raumleiste und Einstellungen ausblenden
 *   &theme=glas        Design wählen, &lang=en Sprache wählen
 */
import { ItemStore } from "./store.js";
import { deviceCard } from "./modules.js";
import { formatState } from "./format.js";
import { language, languages, locale, setLanguage, t } from "./i18n.js";
import { openColorWheel } from "./color.js";
import { openHistory } from "./history.js";
import { openDialog } from "./dialog.js";
import { setupLock } from "./lock.js";

const config = window.DASHBOARD_CONFIG;
const {
  OpenHABClient, Items, ItemEvents, Persistence, iterSSEEvents
} = window.openHAB;
const params = new URLSearchParams(location.search);
const store = new ItemStore();
const $ = (selector) => document.querySelector(selector);

// ?debug=1: Store in der Konsole des Browsers als window.store
if (params.get("debug") === "1") window.store = store;

let client;
let items;
let current = params.get("room") ?? "overview";

/** Das Gerät (die Gruppe), zu dem ein Punkt gehört */
const deviceOf = (item) => store.get(item.groupNames?.[0]);

/** Kontext für Widgets und Module */
const ctx = {
  store,
  send,
  color: (item) => openColorWheel(item, send, deviceOf(item)?.label),
  history: Persistence ? (item) => openHistory(item, loadHistory) : null
};

async function start() {
  setLanguage(params.get("lang") ?? remembered("lang") ?? config.language ?? "de");
  applyTheme(params.get("theme") ?? remembered("theme") ?? config.themes?.[0]);
  applyMode(remembered("mode") ?? "auto");
  document.body.classList.toggle("kiosk", params.get("kiosk") === "1");
  document.title = config.title;
  $("#title").textContent = config.title;
  $("#content").textContent = t("loading");
  $("#settings").addEventListener("click", openSettings);
  const lock = setupLock(config.lock);
  $("#lock").hidden = !config.lock?.pin;
  $("#lock").addEventListener("click", () => lock.lock());
  clock();

  client = await new OpenHABClient(config.openhabUrl, null, null, config.token).ready;
  items = new Items(client);
  if (!(await reload())) return;
  render();
  watch();
}

/** Lädt alle Items; true, wenn es geklappt hat. */
async function reload() {
  const list = await items.getItems();
  if (list.error) {
    status("offline", `${t("unreachable")}: ${list.error}`);
    $("#content").textContent = t("unreachable");
    return false;
  }
  store.load(list);
  return true;
}

/** Befehl senden; Fehler zeigt ein kurzer Hinweis. */
async function send(name, command) {
  const result = await items.sendCommand(name, String(command));
  if (result.error) toast(`${store.get(name)?.label ?? name}: ${result.error}`);
}

/** Verlauf aus der Persistence (Dienst aus config.persistenceService). */
function loadHistory(name, start, end) {
  return new Persistence(client).getItemPersistenceData(name,
    config.persistenceService ?? null,
    { startTime: start.toISOString(), endTime: end.toISOString() });
}

// ─── Modell: Räume → Geräte → Punkte ────────────────────────────────────────

function rooms() {
  const order = config.roomOrder ?? [];
  const rank = (name) => (order.includes(name) ? order.indexOf(name) : order.length);
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

function devices(room) {
  const members = room.only ?? store.members(room.name);
  const groups = members.filter((item) => item.type === "Group");
  const loose = members.filter((item) => item.type !== "Group");
  const list = groups.map((group) => ({ group, points: store.members(group.name) }));
  if (loose.length) {
    list.push({ group: { label: t("room"), name: "" }, points: loose });
  }
  return list.filter((device) => device.points.length);
}

// ─── Ansicht ────────────────────────────────────────────────────────────────

function render() {
  const nav = $("#rooms");
  const pages = [{ name: "overview", label: t("overview") }, ...rooms()];
  const tabs = pages.map((page) => {
    const button = document.createElement("button");
    button.textContent = page.label;
    button.setAttribute("role", "tab");
    button.addEventListener("click", () => show(page));
    return button;
  });
  nav.replaceChildren(...tabs);

  function show(page) {
    current = page.name;
    store.newView();                      // Widgets der alten Ansicht abmelden
    tabs.forEach((tab, i) => tab.setAttribute("aria-selected", pages[i] === page));
    $("#content").replaceChildren(
      page.name === "overview" ? overview() : roomView(page));
  }
  show(pages.find((page) => page.name === current) ?? pages[0]);
}

function overview() {
  const grid = document.createElement("div");
  grid.className = "tiles";
  for (const name of config.overview ?? []) {
    const item = store.get(name);
    if (!item) continue;
    const value = document.createElement("strong");
    const label = document.createElement("span");
    label.textContent = item.label;
    if (["Switch", "Contact"].includes(item.groupType)) {
      // "3 von 7" statt nur "an": aktive Mitglieder zählen
      const members = store.members(name);
      const update = () => {
        const active = members.filter((m) => ["ON", "OPEN"].includes(m.state)).length;
        value.textContent = `${active} ${t("of")} ${members.length}`;
      };
      for (const member of members) store.subscribe(member.name, update);
    } else {
      store.subscribe(name, (state) => (value.textContent = formatState(state)));
    }
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.append(value, label);
    grid.append(tile);
  }
  return grid;
}

function roomView(room) {
  const grid = document.createElement("div");
  grid.className = "cards";
  grid.append(...devices(room).map((device) => deviceCard(device, ctx)));
  return grid;
}

// ─── Echtzeit ───────────────────────────────────────────────────────────────

/** Liest Zustandsänderungen und verbindet sich nach einem Abbruch neu. */
async function watch() {
  let first = true;
  while (true) {
    const stream = await new ItemEvents(client).ItemStateChangedEvent();
    if (!stream.error) {
      if (!first) await reload();          // Änderungen während der Pause
      first = false;
      status("online", t("online"));
      try {
        for await (const event of iterSSEEvents(stream)) {
          const name = event.topic.split("/")[2];
          const value = event.payload?.value;
          if (value !== undefined) store.setState(name, value);
        }
      } catch (err) {
        console.warn("Ereignisstrom:", err);
      }
    }
    status("offline", t("offline"));
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}

// ─── Kopfzeile: Uhr, Status, Hinweise ───────────────────────────────────────

/** Uhrzeit des Geräts, formatiert nach Sprache (l10n). */
function clock() {
  const node = $("#clock");
  const tick = () => {
    const now = new Date();
    node.textContent = now.toLocaleTimeString(locale(),
      { hour: "2-digit", minute: "2-digit" });
    node.title = now.toLocaleDateString(locale(), { dateStyle: "full" });
    node.dateTime = now.toISOString();
  };
  clock.tick = tick;
  tick();
  setTimeout(() => { tick(); setInterval(tick, 60000); }, 60000 - Date.now() % 60000);
}

function status(state, text) {
  const dot = $("#status");
  dot.dataset.state = state;
  dot.title = text;
  dot.setAttribute("aria-label", text);
}

function toast(text) {
  const box = $("#toast");
  box.textContent = text;
  box.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (box.hidden = true), 4000);
}

// ─── Einstellungen: Sprache, Design, hell/dunkel ────────────────────────────

function remembered(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function remember(key, value) {
  try { localStorage.setItem(key, value); } catch { /* privates Fenster */ }
}

function applyTheme(name) {
  const themes = config.themes ?? ["standard"];
  const theme = themes.includes(name) ? name : themes[0];
  $("#theme-css").href = `themes/${theme}.css`;
  document.documentElement.dataset.themeName = theme;
}

function applyMode(mode) {
  if (mode === "auto") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = mode;
}

function openSettings() {
  const choice = (label, options, selected, onChange) => {
    const select = document.createElement("select");
    for (const [value, text] of options) select.add(new Option(text, value));
    select.value = selected;
    select.addEventListener("change", () => onChange(select.value));
    const row = document.createElement("label");
    row.className = "point";
    const span = document.createElement("span");
    span.className = "point-label";
    span.textContent = label;
    row.append(span, select);
    return row;
  };
  openDialog(t("settings"),
    choice(t("language"), languages().map((l) => [l, l.toUpperCase()]), language(),
      (value) => { remember("lang", value); setLanguage(value); refresh(); }),
    choice(t("theme"), (config.themes ?? ["standard"]).map((n) => [n, n]),
      document.documentElement.dataset.themeName,
      (value) => { remember("theme", value); applyTheme(value); }),
    choice(t("mode"),
      [["auto", t("auto")], ["light", t("light")], ["dark", t("dark")]],
      document.documentElement.dataset.theme ?? "auto",
      (value) => { remember("mode", value); applyMode(value); }));
}

/** Nach einem Sprachwechsel alles neu zeichnen. */
function refresh() {
  for (const dialog of document.querySelectorAll("dialog")) dialog.close();
  render();
  clock.tick();
  openSettings();
}

start();
