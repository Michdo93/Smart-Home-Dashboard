/**
 * app.js – Controller: verbindet openHAB, Store und Ansicht.
 *
 * Nutzt nur die Klassen von js-openhab-rest-client (window.openHAB). Mit
 * js-openhab-proxy-client funktioniert dieselbe Datei unverändert.
 */
import { ItemStore } from "./store.js";
import { pointRow } from "./widgets.js";
import { formatState } from "./format.js";

const config = window.DASHBOARD_CONFIG;
const { OpenHABClient, Items, ItemEvents, iterSSEEvents } = window.openHAB;
const store = new ItemStore();
const $ = (selector) => document.querySelector(selector);

let client;
let items;

async function start() {
  document.title = config.title;
  $("#title").textContent = config.title;
  setupTheme();
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
    status("offline", `openHAB nicht erreichbar: ${list.error}`);
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
  if (rest.length) list.push({ name: config.rootGroup, label: "Haus", only: rest });
  return list;
}

function devices(room) {
  const members = room.only ?? store.members(room.name);
  const groups = members.filter((item) => item.type === "Group");
  const loose = members.filter((item) => item.type !== "Group");
  const list = groups.map((group) => ({ group, points: store.members(group.name) }));
  if (loose.length) list.push({ group: { label: "Raum", name: "" }, points: loose });
  return list;
}

// ─── Ansicht ────────────────────────────────────────────────────────────────

function render() {
  const nav = $("#rooms");
  const main = $("#content");
  const pages = [{ name: "overview", label: "Übersicht" }, ...rooms()];
  nav.replaceChildren(...pages.map((page, index) => {
    const button = document.createElement("button");
    button.textContent = page.label;
    button.setAttribute("role", "tab");
    button.addEventListener("click", () => show(page, button));
    if (index === 0) queueMicrotask(() => show(page, button));
    return button;
  }));

  function show(page, button) {
    for (const tab of nav.children) tab.setAttribute("aria-selected", tab === button);
    main.replaceChildren(page.name === "overview" ? overview() : roomView(page));
  }
}

function overview() {
  const grid = document.createElement("div");
  grid.className = "tiles";
  for (const name of config.overview ?? []) {
    const item = store.get(name);
    if (!item) continue;
    const tile = document.createElement("div");
    tile.className = "tile";
    const value = document.createElement("strong");
    const label = document.createElement("span");
    label.textContent = item.label.replace(/\s*\[.*\]$/, "");
    const counted = ["Switch", "Contact"].includes(item.groupType);
    if (counted) {
      // "3 von 7" statt nur "an": aktive Mitglieder zählen
      const members = store.members(name);
      const update = () => {
        const active = members.filter((m) => ["ON", "OPEN"].includes(m.state)).length;
        value.textContent = `${active} von ${members.length}`;
      };
      for (const member of members) store.subscribe(member.name, update);
    } else {
      store.subscribe(name, (current) => (value.textContent = formatState(current)));
    }
    tile.append(value, label);
    grid.append(tile);
  }
  return grid;
}

function roomView(room) {
  const grid = document.createElement("div");
  grid.className = "cards";
  for (const { group, points } of devices(room)) {
    if (!points.length) continue;
    const card = document.createElement("section");
    card.className = "card";
    const heading = document.createElement("h2");
    heading.textContent = group.label;
    card.append(heading, ...points.map((item) => pointRow(item, store, send)));
    grid.append(card);
  }
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
      status("online", "verbunden");
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
    status("offline", "Verbindung unterbrochen – neuer Versuch …");
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
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

// ─── Hell und dunkel ────────────────────────────────────────────────────────

function setupTheme() {
  const root = document.documentElement;
  let saved = null;
  try { saved = localStorage.getItem("theme"); } catch { /* privat */ }
  if (saved) root.dataset.theme = saved;
  $("#theme").addEventListener("click", () => {
    const dark = root.dataset.theme
      ? root.dataset.theme === "dark"
      : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    try { localStorage.setItem("theme", root.dataset.theme); } catch { /* privat */ }
  });
}

start();
