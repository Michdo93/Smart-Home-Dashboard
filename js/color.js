/**
 * color.js – Farbkreis mit iro.js (lib/iro.min.js, global "iro").
 *
 * iro.js rechnet in HSV mit H 0–360, S und V 0–100 – genau das Format, das
 * openHAB für Color-Items als "H,S,B" erwartet.
 */
import { openDialog } from "./dialog.js";
import { hsbOf } from "./format.js";
import { t } from "./i18n.js";

export function openColorWheel(item, send, title = item.label) {
  const box = document.createElement("div");
  box.className = "color-wheel";
  const dialog = openDialog(`${title} – ${t("color")}`, box);
  const [h, s, v] = hsbOf(item.state);
  const size = Math.min(280, window.innerWidth - 80);
  const picker = new window.iro.ColorPicker(box, {
    width: size,
    color: { h: h || 0, s: s || 0, v: v || 100 },
    layoutDirection: "vertical",
    layout: [
      { component: window.iro.ui.Wheel },
      { component: window.iro.ui.Slider, options: { sliderType: "value" } }
    ]
  });
  // erst beim Loslassen senden – sonst ein Befehl je Pixel
  picker.on("input:end", (color) => {
    const { h: hue, s: sat, v: val } = color.hsv;
    send(item.name, `${Math.round(hue)},${Math.round(sat)},${Math.round(val)}`);
  });
  return dialog;
}
