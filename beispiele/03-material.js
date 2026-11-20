/**
 * 03-material.js – derselbe Raum in Material Design 3 mit Beer CSS.
 * Model und Controller kommen wie bei Bootstrap aus raum.js.
 */
import {
  baseType, formatState, hsbToCss, isControl, numberOf, raumLaden
} from "./raum.js";

const raum = new URLSearchParams(location.search).get("room") ?? "gVH_Wohnzimmer";
const MARKE = "#c97a00";                  // Grundfarbe: Material leitet alle Töne ab
const dunkel = matchMedia("(prefers-color-scheme: dark)").matches;
await ui("theme", MARKE);
ui("mode", dunkel ? "dark" : "light");

const { label, geraete, store, send } = await raumLaden(raum);
document.querySelector("#titel").textContent = label;

function el(tag, klassen = "", ...kinder) {
  const node = document.createElement(tag);
  if (klassen) node.className = klassen;
  node.append(...kinder);
  return node;
}

/** Runder Knopf mit Material-Symbol (Name des Symbols als Text) */
function symbol(name, beschriftung, onclick) {
  const b = el("button", "circle transparent", el("i", "", name));
  b.setAttribute("aria-label", beschriftung);
  b.addEventListener("click", onclick);
  return b;
}

function schalter(item) {
  const input = el("input");
  input.type = "checkbox";
  input.setAttribute("aria-label", item.label);
  input.addEventListener("click", (event) => {
    event.preventDefault();               // Anzeige folgt der Meldung von openHAB
    send(item.name, input.checked ? "ON" : "OFF");
  });
  store.subscribe(item.name, (i) => (input.checked = i.state === "ON"
    || (baseType(i) === "Color" && numberOf(i.state.split(",")[2]) > 0)));
  return el("label", "switch", input, el("span"));
}

/** Material-Slider stehen unter der Zeile, die Zahl steht in der Zeile */
function regler(item) {
  const input = el("input");
  Object.assign(input, { type: "range", min: 0, max: 100 });
  input.setAttribute("aria-label", item.label);
  const zahl = el("span");
  input.addEventListener("change", () => send(item.name, input.value));
  store.subscribe(item.name, (i) => {
    zahl.textContent = formatState(i);
    if (document.activeElement === input) return;
    input.value = numberOf(i.state) ?? 0;
    input.dispatchEvent(new Event("input"));   // Beer CSS zeichnet die Spur neu
  });
  return el("div", "", el("div", "row", el("div", "max", item.label), zahl),
    el("label", "slider", input, el("span")));
}

function sollwert(item) {
  const { minimum, maximum, step = 1 } = item.stateDescription;
  const einheit = item.unitSymbol ? ` ${item.unitSymbol}` : "";
  const wert = el("span", "bold");
  const aendern = (richtung) => {
    const jetzt = numberOf(store.get(item.name).state) ?? minimum;
    const neu = Math.min(maximum, Math.max(minimum, jetzt + richtung * step));
    send(item.name, `${Number(neu.toFixed(3))}${einheit}`);
  };
  store.subscribe(item.name, (i) => (wert.textContent = formatState(i)));
  return el("nav", "no-space", symbol("remove", "weniger", () => aendern(-1)),
    wert, symbol("add", "mehr", () => aendern(1)));
}

function auswahl(item, optionen) {
  if (optionen.length === 1) {
    const [o] = optionen;
    const b = el("button", "", o.label || o.command);
    b.addEventListener("click", () => send(item.name, o.command));
    return b;
  }
  const select = el("select", "",
    ...optionen.map((o) => Object.assign(el("option", "", o.label || o.command),
      { value: o.command })));
  select.setAttribute("aria-label", item.label);
  select.addEventListener("change", () => send(item.name, select.value));
  store.subscribe(item.name, (i) => (select.value = i.state));
  return el("div", "field border round", select,
    el("i", "", "arrow_drop_down"));
}

/** Material hat keinen Farbkreis – hier: feste Farben als runde Knöpfe */
const FARBEN = [["Warmweiß", "35,30,100"], ["Orange", "28,85,90"],
  ["Rot", "0,90,90"], ["Grün", "130,70,80"], ["Blau", "220,80,90"],
  ["Violett", "275,70,85"]];

function farbe(item) {
  const knoepfe = FARBEN.map(([name, hsb]) => {
    const b = el("button", "circle");
    b.style.background = hsbToCss(hsb);
    b.setAttribute("aria-label", name);
    b.addEventListener("click", () => send(item.name, hsb));
    return b;
  });
  store.subscribe(item.name, (i) => knoepfe.forEach((b, n) =>
    b.setAttribute("aria-pressed", String(FARBEN[n][1] === i.state))));
  return el("div", "farben", ...knoepfe);
}

function bedienelement(item) {
  const optionen = item.commandDescription?.commandOptions ?? [];
  if (optionen.length) return auswahl(item, optionen);
  const senden = (befehl) => () => send(item.name, befehl);
  switch (baseType(item)) {
    case "Switch": return schalter(item);
    case "Color": return farbe(item);
    case "Rollershutter": return el("nav", "no-space",
      symbol("arrow_upward", "hoch", senden("UP")),
      symbol("stop", "stopp", senden("STOP")),
      symbol("arrow_downward", "runter", senden("DOWN")));
    case "Player": return el("nav", "no-space",
      symbol("skip_previous", "zurück", senden("PREVIOUS")),
      symbol("play_pause", "Wiedergabe", () => send(item.name,
        store.get(item.name).state === "PLAY" ? "PAUSE" : "PLAY")),
      symbol("skip_next", "weiter", senden("NEXT")));
    case "Number":
      if (item.stateDescription?.minimum !== undefined) return sollwert(item);
  }
  return anzeige(item);
}

function anzeige(item) {
  const wert = el("span");
  store.subscribe(item.name, (i) => (wert.textContent = formatState(i)));
  return wert;
}

function zeile(item) {
  if (isControl(item) && baseType(item) === "Dimmer") return regler(item);
  return el("div", "row wrap", el("div", "max", item.label),
    isControl(item) ? bedienelement(item) : anzeige(item));
}

const karten = geraete.map(({ gruppe, punkte }) => el("div", "s12 m6 l4",
  el("article", "round", el("h6", "", gruppe.label), ...punkte.map(zeile))));
document.querySelector("#karten").replaceChildren(...karten);
