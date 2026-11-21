/**
 * app.js – die Standard-Ansicht: Kopfzeile, Raumleiste, Übersicht, Karten,
 * Einstellungen. Verbindung, Store, Befehle und Echtzeit übernimmt der
 * Controller (controller.js).
 *
 * Adresszeile (z. B. für Wandtablets):
 *   ?room=gVH_Kueche   mit diesem Raum starten
 *   &kiosk=1           Raumleiste und Einstellungen ausblenden
 *   &theme=glas        Design wählen, &lang=en Sprache wählen
 */
import { createController } from "./controller.js";
import { deviceCard } from "./modules.js";
import { formatState } from "./format.js";
import { language, languages, locale, setLanguage, t } from "./i18n.js";
import { openColorWheel } from "./color.js";
import { openHistory } from "./history.js";
import { openDialog } from "./dialog.js";
import { setupLock } from "./lock.js";

const config = window.DASHBOARD_CONFIG;
const params = new URLSearchParams(location.search);
const $ = (selector) => document.querySelector(selector);
const controller = createController(config, { onStatus: status, onError: toast });
const { store, send } = controller;

// ?debug=1: Store in der Konsole des Browsers als window.store
if (params.get("debug") === "1") window.store = store;

let current = params.get("room") ?? "overview";

/** Das Gerät (die Gruppe), zu dem ein Punkt gehört */
const deviceOf = (item) => store.get(item.groupNames?.[0]);

/** Kontext für Widgets und Module */
const ctx = {
  store,
  send,
  color: (item) => openColorWheel(item, send, deviceOf(item)?.label),
  history: controller.loadHistory
    ? (item) => openHistory(item, controller.loadHistory) : null
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

  if (!(await controller.connect())) {
    $("#content").textContent = t("unreachable");
    return;
  }
  render();
  controller.watch();
}

// ─── Ansicht ────────────────────────────────────────────────────────────────

function render() {
  const nav = $("#rooms");
  const pages = [{ name: "overview", label: t("overview") }, ...controller.rooms()];
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
  grid.append(...controller.devices(room).map((device) => deviceCard(device, ctx)));
  return grid;
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

/** Installierte Themes; ohne Eintrag gilt das mitgelieferte "standard" */
const installedThemes = () =>
  (config.themes?.length ? config.themes : ["standard"]);

function applyTheme(name) {
  const themes = installedThemes();
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
    choice(t("theme"), installedThemes().map((n) => [n, n]),
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
