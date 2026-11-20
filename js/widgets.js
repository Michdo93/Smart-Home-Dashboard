/**
 * widgets.js – ein Bedienelement je Item-Typ (View-Schicht).
 *
 * Jedes Widget bekommt das Item und den Kontext ctx:
 *   ctx.store        Zustände (abonnieren)
 *   ctx.send         Befehl senden: send(name, command)
 *   ctx.color        Farbkreis öffnen: color(item)
 *   ctx.history      Verlauf öffnen: history(item)
 * Was bedienbar ist, steht im semantischen Modell: Punkte mit dem Tag
 * Control, Setpoint oder Switch.
 */
import { formatState, hsbOf, hsbToCss, numberOf } from "./format.js";
import { t } from "./i18n.js";

const CONTROL_TAGS = ["Control", "Setpoint", "Switch"];
const NUMERIC = ["Number", "Dimmer", "Rollershutter"];

export function isControl(item) {
  return item.tags?.some((tag) => CONTROL_TAGS.includes(tag))
    && !item.stateDescription?.readOnly;
}

export function baseType(item) {
  return item.type.split(":")[0];
}

export function el(tag, attributes = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else if (value !== false && value != null) node.setAttribute(key, value);
  }
  node.append(...children);
  return node;
}

/** Knopf mit Symbol und Beschriftung für Screenreader. */
export function iconButton(text, label, onclick) {
  return el("button", { class: "icon-button", "aria-label": label, onclick }, text);
}

/** Hält ein Element mit dem formatierten Zustand aktuell. */
export function showState(node, item, store) {
  store.subscribe(item.name,
    (current) => (node.textContent = formatState(current)));
  return node;
}

/** Eine Zeile: Beschriftung links, Wert oder Bedienelement rechts. */
export function pointRow(item, ctx) {
  const label = el("span", { class: "point-label" }, item.label || item.name);
  return el("div", { class: "point", "data-item": item.name }, label,
    control(item, ctx));
}

/** Das passende Element für ein Item – bedienbar oder nur Anzeige. */
export function control(item, ctx) {
  if (!isControl(item)) return display(item, ctx);
  const options = item.commandDescription?.commandOptions ?? [];
  if (options.length) return optionsControl(item, ctx, options);
  switch (baseType(item)) {
    case "Switch": return switchControl(item, ctx);
    case "Dimmer": return sliderControl(item, ctx);
    case "Color": return colorControl(item, ctx);
    case "Rollershutter": return shutterControl(item, ctx);
    case "Player": return playerControl(item, ctx);
    case "Number": return item.stateDescription?.minimum !== undefined
      ? setpointControl(item, ctx) : display(item, ctx);
    default: return display(item, ctx);
  }
}

function display(item, { store, history }) {
  const base = baseType(item);
  if (base === "Image") {
    const box = el("span", { class: "point-value" });
    store.subscribe(item.name, (current) => {
      box.replaceChildren(String(current.state).startsWith("data:image")
        ? el("img", { src: current.state, alt: current.label }) : "–");
    });
    return box;
  }
  if (base === "Location") {
    const link = el("a", { class: "point-value", target: "_blank", rel: "noopener" });
    store.subscribe(item.name, (current) => {
      const [lat, lon] = String(current.state).split(",");
      link.href = "https://www.openstreetmap.org/"
        + `?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`;
      link.textContent = formatState(current);
    });
    return link;
  }
  // Zahlen öffnen per Klick ihren Verlauf
  const value = NUMERIC.includes(base) && history
    ? el("button", { class: "point-value link", onclick: () => history(item),
      "aria-label": `${item.label}: ${t("history")}` })
    : el("span", { class: "point-value" });
  store.subscribe(item.name, (current) => {
    value.textContent = formatState(current);
    value.classList.toggle("is-active", ["ON", "OPEN"].includes(current.state));
  });
  return value;
}

export function switchControl(item, { store, send }) {
  let on = false;
  const button = el("button", {
    class: "toggle", role: "switch", "aria-label": item.label,
    onclick: () => send(item.name, on ? "OFF" : "ON")
  });
  store.subscribe(item.name, (current) => {
    on = baseType(current) === "Color" ? hsbOf(current.state)[2] > 0
      : current.state === "ON";
    button.setAttribute("aria-checked", String(on));
  });
  return button;
}

export function sliderControl(item, { store, send }) {
  const output = el("output");
  const slider = el("input", {
    type: "range", min: 0, max: 100, step: 1, "aria-label": item.label,
    oninput: () => (output.textContent = `${slider.value} %`),
    onchange: () => send(item.name, slider.value)
  });
  store.subscribe(item.name, (current) => {
    if (document.activeElement === slider) return;   // nicht unterm Finger springen
    slider.value = numberOf(current.state) ?? 0;
    output.textContent = formatState(current);
  });
  return el("div", { class: "slider" }, slider, output);
}

function colorControl(item, ctx) {
  const swatch = el("button", {
    class: "swatch", "aria-label": t("color"), onclick: () => ctx.color(item)
  });
  ctx.store.subscribe(item.name,
    (current) => (swatch.style.background = hsbToCss(current.state)));
  return el("div", { class: "color" }, swatch, switchControl(item, ctx));
}

function shutterControl(item, { store, send }) {
  const button = (text, command, label) =>
    iconButton(text, t(label), () => send(item.name, command));
  return el("div", { class: "buttons" }, button("▲", "UP", "up"),
    button("■", "STOP", "stop"), button("▼", "DOWN", "down"),
    showState(el("output"), item, store));
}

function playerControl(item, { store, send }) {
  let playing = false;
  const play = iconButton("▶", t("play"),
    () => send(item.name, playing ? "PAUSE" : "PLAY"));
  store.subscribe(item.name, (current) => {
    playing = current.state === "PLAY";
    play.textContent = playing ? "⏸" : "▶";
  });
  const button = (text, command, label) =>
    iconButton(text, t(label), () => send(item.name, command));
  return el("div", { class: "buttons" },
    button("⏮", "PREVIOUS", "previous"), play, button("⏭", "NEXT", "next"));
}

export function setpointControl(item, { store, send }) {
  const { minimum, maximum, step = 1 } = item.stateDescription;
  const unit = item.unitSymbol ? ` ${item.unitSymbol}` : "";
  const change = (direction) => {
    const now = numberOf(store.get(item.name).state) ?? minimum;
    const next = Math.min(maximum, Math.max(minimum, now + direction * step));
    send(item.name, `${Number(next.toFixed(3))}${unit}`);
  };
  return el("div", { class: "buttons" },
    iconButton("−", t("less"), () => change(-1)),
    showState(el("output"), item, store),
    iconButton("+", t("more"), () => change(1)));
}

function optionsControl(item, { store, send }, options) {
  if (options.length === 1) {
    const [{ command, label }] = options;
    return el("button", { class: "action", onclick: () => send(item.name, command) },
      label || command);
  }
  const select = el("select", {
    "aria-label": item.label, onchange: () => send(item.name, select.value)
  }, ...options.map((o) => el("option", { value: o.command }, o.label || o.command)));
  store.subscribe(item.name, (current) => (select.value = current.state));
  return select;
}
