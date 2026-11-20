/**
 * 02-bootstrap.js – derselbe Raum, gestaltet mit Bootstrap 5.
 * Nur die Ansicht ist neu: Model und Controller kommen aus raum.js.
 */
import {
  baseType, formatState, isControl, numberOf, raumLaden
} from "./raum.js";

const raum = new URLSearchParams(location.search).get("room") ?? "gVH_Wohnzimmer";
const dunkel = matchMedia("(prefers-color-scheme: dark)").matches;
document.documentElement.dataset.bsTheme = dunkel ? "dark" : "light";

const { label, geraete, store, send } = await raumLaden(raum);
document.querySelector("#titel").textContent = label;

/** Element mit Klassen und Kindern, Texte immer als Text */
function el(tag, klassen = "", ...kinder) {
  const node = document.createElement(tag);
  if (klassen) node.className = klassen;
  node.append(...kinder);
  return node;
}

/** Symbol als Schriftzeichen, nicht als buntes Emoji (Variation Selector 15) */
const TEXT = (zeichen) => `${zeichen}\uFE0E`;

function knopf(text, beschriftung, onclick, art = "btn-outline-secondary") {
  const b = el("button", `btn ${art}`, text);
  b.setAttribute("aria-label", beschriftung);
  b.addEventListener("click", onclick);
  return b;
}

function schalter(item) {
  const input = el("input", "form-check-input");
  Object.assign(input, { type: "checkbox", role: "switch" });
  input.setAttribute("aria-label", item.label);
  input.addEventListener("click", (event) => {
    event.preventDefault();               // erst umschalten, wenn openHAB es meldet
    send(item.name, input.checked ? "ON" : "OFF");
  });
  store.subscribe(item.name, (i) => (input.checked = i.state === "ON"
    || (baseType(i) === "Color" && numberOf(i.state.split(",")[2]) > 0)));
  return el("div", "form-check form-switch m-0", input);
}

function regler(item) {
  const input = el("input", "form-range");
  Object.assign(input, { type: "range", min: 0, max: 100 });
  const zahl = el("span", "text-end", "");
  zahl.style.width = "3.6em";
  input.addEventListener("input", () => (zahl.textContent = `${input.value} %`));
  input.addEventListener("change", () => send(item.name, input.value));
  store.subscribe(item.name, (i) => {
    if (document.activeElement !== input) input.value = numberOf(i.state) ?? 0;
    zahl.textContent = formatState(i);
  });
  return el("div", "d-flex align-items-center gap-2 flex-grow-1", input, zahl);
}

function gruppe(...knoepfe) {
  const g = el("div", "btn-group", ...knoepfe);
  g.setAttribute("role", "group");
  return g;
}

function sollwert(item) {
  const { minimum, maximum, step = 1 } = item.stateDescription;
  const einheit = item.unitSymbol ? ` ${item.unitSymbol}` : "";
  const wert = el("span", "btn btn-outline-secondary pe-none", "");
  const aendern = (richtung) => {
    const jetzt = numberOf(store.get(item.name).state) ?? minimum;
    const neu = Math.min(maximum, Math.max(minimum, jetzt + richtung * step));
    send(item.name, `${Number(neu.toFixed(3))}${einheit}`);
  };
  store.subscribe(item.name, (i) => (wert.textContent = formatState(i)));
  return gruppe(knopf("−", "weniger", () => aendern(-1)), wert,
    knopf("+", "mehr", () => aendern(1)));
}

function auswahl(item, optionen) {
  if (optionen.length === 1) {
    const [o] = optionen;
    return knopf(o.label || o.command, item.label, () => send(item.name, o.command),
      "btn-primary");
  }
  const select = el("select", "form-select w-auto",
    ...optionen.map((o) => Object.assign(el("option", "", o.label || o.command),
      { value: o.command })));
  select.addEventListener("change", () => send(item.name, select.value));
  store.subscribe(item.name, (i) => (select.value = i.state));
  return select;
}

/** HSB (openHAB) ↔ #rrggbb (Farbwähler des Browsers) */
function hsbZuHex(state) {
  const [h, s, v] = String(state).split(",").map(Number);
  const f = (n) => {
    const k = (n + h / 60) % 6;
    const x = (v / 100) * (1 - (s / 100) * Math.max(0, Math.min(k, 4 - k, 1)));
    return Math.round(x * 255).toString(16).padStart(2, "0");
  };
  return Number.isNaN(v) ? "#ffffff" : `#${f(5)}${f(3)}${f(1)}`;
}

function hexZuHsb(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), d = max - Math.min(r, g, b);
  let h;
  if (d === 0) h = 0;
  else if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  const hsb = [(h * 60 + 360) % 360, max ? (d / max) * 100 : 0, max * 100];
  return hsb.map(Math.round).join(",");
}

function farbe(item) {
  const input = el("input", "form-control form-control-color");
  input.type = "color";
  input.setAttribute("aria-label", item.label);
  input.addEventListener("change", () => send(item.name, hexZuHsb(input.value)));
  store.subscribe(item.name, (i) => (input.value = hsbZuHex(i.state)));
  return el("div", "d-flex gap-2 align-items-center", input, schalter(item));
}

function bedienelement(item) {
  const optionen = item.commandDescription?.commandOptions ?? [];
  if (optionen.length) return auswahl(item, optionen);
  const senden = (befehl) => () => send(item.name, befehl);
  switch (baseType(item)) {
    case "Switch": return schalter(item);
    case "Dimmer": return regler(item);
    case "Color": return farbe(item);
    case "Rollershutter": return gruppe(knopf("▲", "hoch", senden("UP")),
      knopf("■", "stopp", senden("STOP")), knopf("▼", "runter", senden("DOWN")));
    case "Player": return gruppe(knopf(TEXT("⏮"), "zurück", senden("PREVIOUS")),
      knopf(TEXT("⏯"), "Wiedergabe", () => send(item.name,
        store.get(item.name).state === "PLAY" ? "PAUSE" : "PLAY")),
      knopf(TEXT("⏭"), "weiter", senden("NEXT")));
    case "Number":
      if (item.stateDescription?.minimum !== undefined) return sollwert(item);
  }
  return anzeige(item);
}

function anzeige(item) {
  const wert = el("span", "text-body-secondary text-end");
  store.subscribe(item.name, (i) => (wert.textContent = formatState(i)));
  return wert;
}

const ZEILE = "list-group-item d-flex flex-wrap justify-content-between"
  + " align-items-center gap-2";
const karten = geraete.map(({ gruppe: g, punkte }) => {
  const liste = el("ul", "list-group list-group-flush",
    ...punkte.map((item) => el("li", ZEILE, el("span", "", item.label),
      isControl(item) ? bedienelement(item) : anzeige(item))));
  const karte = el("div", "card h-100 shadow-sm",
    el("div", "card-header fw-semibold", g.label), liste);
  return el("div", "col-12 col-md-6 col-xl-4", karte);
});
document.querySelector("#karten").replaceChildren(...karten);
