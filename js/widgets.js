/**
 * widgets.js – ein Bedienelement je Item-Typ (View-Schicht).
 *
 * Jedes Widget bekommt das Item, abonniert seine Änderungen im Store und
 * meldet Bedienungen über send(name, command). Was bedienbar ist, steht im
 * semantischen Modell: Punkte mit dem Tag Control, Setpoint oder Switch.
 */
import {
  formatState, hexToHsb, hsbOf, hsbToCss, hsbToHex, numberOf
} from "./format.js";

const CONTROL_TAGS = ["Control", "Setpoint", "Switch"];

export function isControl(item) {
  return item.tags?.some((tag) => CONTROL_TAGS.includes(tag))
    && !item.stateDescription?.readOnly;
}

function el(tag, attributes = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else if (value !== false && value != null) node.setAttribute(key, value);
  }
  node.append(...children);
  return node;
}

/** Knopf mit Symbol und Beschriftung für Screenreader. */
function iconButton(text, label, onclick) {
  return el("button", { class: "icon-button", "aria-label": label, onclick }, text);
}

/** Hält ein Ausgabefeld mit dem formatierten Zustand aktuell. */
function showState(output, item, store) {
  store.subscribe(item.name,
    (current) => (output.textContent = formatState(current)));
  return output;
}

/** Eine Zeile: Beschriftung links, Wert oder Bedienelement rechts. */
export function pointRow(item, store, send) {
  const label = el("span", { class: "point-label" }, item.label || item.name);
  const control = isControl(item) ? controlFor(item, store, send)
    : displayFor(item, store);
  return el("div", { class: "point", "data-item": item.name }, label, control);
}

function displayFor(item, store) {
  const base = item.type.split(":")[0];
  const value = el("span", { class: "point-value" });
  store.subscribe(item.name, (current) => {
    if (base === "Image" && current.state?.startsWith("data:image")) {
      value.replaceChildren(el("img", { src: current.state, alt: current.label }));
      return;
    }
    value.textContent = formatState(current);
    const on = ["ON", "OPEN"].includes(current.state);
    value.classList.toggle("is-active", on);
  });
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
  return value;
}

function controlFor(item, store, send) {
  const base = item.type.split(":")[0];
  const options = item.commandDescription?.commandOptions ?? [];
  if (options.length) return optionsControl(item, store, send, options);
  switch (base) {
    case "Switch": return switchControl(item, store, send);
    case "Dimmer": return sliderControl(item, store, send);
    case "Color": return colorControl(item, store, send);
    case "Rollershutter": return shutterControl(item, store, send);
    case "Player": return playerControl(item, store, send);
    case "Number": return item.stateDescription?.minimum !== undefined
      ? setpointControl(item, store, send) : displayFor(item, store);
    default: return displayFor(item, store);
  }
}

function switchControl(item, store, send) {
  let on = false;
  const button = el("button", {
    class: "toggle", role: "switch", "aria-label": item.label,
    onclick: () => send(item.name, on ? "OFF" : "ON")
  });
  store.subscribe(item.name, (current) => {
    on = current.state === "ON";
    button.setAttribute("aria-checked", String(on));
  });
  return button;
}

function sliderControl(item, store, send) {
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

function colorControl(item, store, send) {
  const swatch = el("span", { class: "swatch" });
  const picker = el("input", {
    type: "color", "aria-label": item.label,
    onchange: () => send(item.name, hexToHsb(picker.value))
  });
  store.subscribe(item.name, (current) => {
    swatch.style.background = hsbToCss(current.state);
    picker.value = hsbToHex(current.state);
  });
  return el("div", { class: "color" }, swatch, picker, switchControl(item, {
    subscribe: (name, fn) => store.subscribe(name, (current) => fn({
      ...current, state: hsbOf(current.state)[2] > 0 ? "ON" : "OFF"
    }))
  }, send));
}

function shutterControl(item, store, send) {
  const output = showState(el("output"), item, store);
  const button = (text, command, label) =>
    iconButton(text, label, () => send(item.name, command));
  return el("div", { class: "buttons" }, button("▲", "UP", "hoch"),
    button("■", "STOP", "stopp"), button("▼", "DOWN", "runter"), output);
}

function playerControl(item, store, send) {
  const play = el("button", {
    class: "icon-button", "aria-label": "Wiedergabe",
    onclick: () => send(item.name, item.state === "PLAY" ? "PAUSE" : "PLAY")
  });
  store.subscribe(item.name, (current) => {
    play.textContent = current.state === "PLAY" ? "⏸" : "▶";
  });
  const button = (text, command, label) =>
    iconButton(text, label, () => send(item.name, command));
  return el("div", { class: "buttons" },
    button("⏮", "PREVIOUS", "zurück"), play, button("⏭", "NEXT", "weiter"));
}

function setpointControl(item, store, send) {
  const { minimum, maximum, step = 1 } = item.stateDescription;
  const unit = item.unitSymbol ? ` ${item.unitSymbol}` : "";
  const output = showState(el("output"), item, store);
  const change = (direction) => {
    const now = numberOf(item.state) ?? minimum;
    const next = Math.min(maximum, Math.max(minimum, now + direction * step));
    send(item.name, `${Number(next.toFixed(3))}${unit}`);
  };
  return el("div", { class: "buttons" }, iconButton("−", "weniger", () => change(-1)),
    output, iconButton("+", "mehr", () => change(1)));
}

function optionsControl(item, store, send, options) {
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
