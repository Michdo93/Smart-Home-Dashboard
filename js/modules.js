/**
 * modules.js – Gerätemodule: ein Baustein für ein ganzes Gerät.
 *
 * Eine Hue-Lampe hat mehrere Items (Schalter, Helligkeit, Farbe, Effekt …).
 * Ein Modul fasst sie zu einer Karte zusammen und wird über das Geräte-Tag
 * der Gruppe gewählt (Lightbulb, Thermostat, WeatherStation …). Für alle
 * anderen Geräte gibt es die allgemeine Karte.
 * Neue Module: MODULES.<Tag> = (gerät, ctx) => …
 */
import {
  control, el, pointRow, setpointControl, showState, switchControl
} from "./widgets.js";
import { t } from "./i18n.js";

/** Erstes Item, das alle Tags trägt. */
function find(points, ...tags) {
  return points.find((item) => tags.every((tag) => item.tags?.includes(tag)));
}

function card(title, classes = "") {
  const node = el("section", { class: `card ${classes}` });
  node.append(el("h2", {}, title));
  return node;
}

/** Allgemeine Karte: eine Zeile je Item. */
export function genericCard({ group, points }, ctx) {
  const node = card(group.label);
  node.append(...points.map((item) => pointRow(item, ctx)));
  return node;
}

/** Lampe: Schalter im Kopf, große Farbe und Helligkeit, Rest darunter. */
function lightbulb({ group, points }, ctx) {
  const power = find(points, "Switch") ?? find(points, "Color");
  const color = find(points, "Color");
  const brightness = find(points, "Brightness");
  const node = card(group.label, "module lightbulb");
  if (power) node.querySelector("h2").append(switchControl(power, ctx));
  if (color) {
    const swatch = control(color, ctx).querySelector(".swatch");
    swatch.classList.add("large");
    node.append(swatch);
  }
  const shown = new Set([power, color]);
  if (brightness && brightness !== power) {
    node.append(pointRow(brightness, ctx));
    shown.add(brightness);
  }
  node.append(...points.filter((item) => !shown.has(item))
    .map((item) => pointRow(item, ctx)));
  return node;
}

/** Thermostat: Ist-Temperatur groß, Sollwert darunter, Heizen als Hinweis. */
function thermostat({ group, points }, ctx) {
  const current = find(points, "Measurement", "Temperature");
  const target = find(points, "Setpoint");
  const heating = find(points, "Heating") ?? find(points, "Status");
  if (!current || target?.stateDescription?.minimum === undefined) {
    return genericCard({ group, points }, ctx);
  }
  const node = card(group.label, "module thermostat");
  const big = showState(el("button", { class: "big-value link",
    onclick: () => ctx.history?.(current) }), current, ctx.store);
  const badge = el("span", { class: "badge" }, t("heating"));
  if (heating) {
    ctx.store.subscribe(heating.name, (item) => (badge.hidden = item.state !== "ON"));
  } else badge.hidden = true;
  node.append(el("div", { class: "thermo-head" }, big, badge),
    el("div", { class: "point", "data-item": target.name },
      el("span", { class: "point-label" }, t("setpoint")),
      setpointControl(target, ctx)));
  const shown = new Set([current, target, heating]);
  node.append(...points.filter((item) => !shown.has(item))
    .map((item) => pointRow(item, ctx)));
  return node;
}

/** Symbole als SVG-Pfade (24 × 24), gezeichnet in der Textfarbe */
const ICONS = {
  Wind: "M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8",
  Rain: "M7 15a5 5 0 1 1 3-9 6 6 0 0 1 11 4 4 4 0 0 1-4 5zM8 19l-1 2M12 19l-1 2"
    + "M16 19l-1 2",
  Humidity: "M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z",
  Pressure: "M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18zM12 12l4-4"
};

function icon(path) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const shape = document.createElementNS("http://www.w3.org/2000/svg", "path");
  shape.setAttribute("d", path);
  svg.append(shape);
  return svg;
}

/** Wetter: Temperatur groß, die übrigen Werte als Kacheln mit Symbol. */
function weather({ group, points }, ctx) {
  const temperature = find(points, "Measurement", "Temperature");
  if (!temperature) return genericCard({ group, points }, ctx);
  const node = card(group.label, "module weather");
  node.append(showState(el("button", { class: "big-value link",
    onclick: () => ctx.history?.(temperature) }), temperature, ctx.store));
  const facts = points.filter((item) => item !== temperature).map((item) => {
    const tag = item.tags?.find((name) => ICONS[name]);
    const value = showState(el("strong"), item, ctx.store);
    const open = ctx.history ? () => ctx.history(item) : null;   // Verlauf
    return el(open ? "button" : "div", { class: "fact", onclick: open },
      tag ? icon(ICONS[tag]) : "", value, el("span", {}, item.label));
  });
  node.append(el("div", { class: "facts" }, ...facts));
  return node;
}

export const MODULES = {
  Lightbulb: lightbulb,
  Thermostat: thermostat,
  WeatherStation: weather,
  WeatherService: weather
};

/** Wählt das Modul nach den Tags der Gerätegruppe. */
export function deviceCard(device, ctx) {
  const tag = device.group.tags?.find((name) => MODULES[name]);
  return (tag ? MODULES[tag] : genericCard)(device, ctx);
}
