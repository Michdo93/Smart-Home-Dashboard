/**
 * modules.js – Gerätemodule: ein Baustein für ein ganzes Gerät.
 *
 * Eine Hue-Lampe hat mehrere Items (Schalter, Helligkeit, Farbe, Effekt …).
 * Ein Modul fasst sie zu einer Karte zusammen und wird über das Geräte-Tag
 * der Gruppe gewählt (Lightbulb, Thermostat …). Für alle anderen Geräte
 * gibt es die allgemeine Karte. Neue Module: MODULES.<Tag> = (gerät, ctx) => …
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

export const MODULES = {
  Lightbulb: lightbulb,
  Thermostat: thermostat
};

/** Wählt das Modul nach den Tags der Gerätegruppe. */
export function deviceCard(device, ctx) {
  const tag = device.group.tags?.find((name) => MODULES[name]);
  return (tag ? MODULES[tag] : genericCard)(device, ctx);
}
