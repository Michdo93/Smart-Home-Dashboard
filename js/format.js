/**
 * format.js – macht aus einem openHAB-Zustand einen lesbaren Text (l10n).
 */
import { locale, t } from "./i18n.js";

const WORDS = {
  ON: "on", OFF: "off", OPEN: "open", CLOSED: "closed",
  PLAY: "playing", PAUSE: "paused"
};

function word(state) {
  return WORDS[state] ? t(WORDS[state]) : state;
}

/** Text für die Anzeige, mit Muster (pattern) und Auswahlwerten des Items. */
export function formatState(item, state = item.state) {
  if (state === "NULL" || state === "UNDEF" || state == null) return "–";
  const option = optionLabel(item, state);
  if (option) return option;
  if (item.transformedState && state === item.state) return item.transformedState;
  const base = item.type.split(":")[0];
  if (base === "DateTime") return formatDate(state);
  if (base === "Location") return formatLocation(state);
  if (base === "Color") return `${formatNumber(hsbOf(state)[2], 0)} %`;
  const pattern = item.stateDescription?.pattern;
  if (pattern && /%[\d.]*[dfs]/.test(pattern) && !pattern.includes("(")) {
    return applyPattern(pattern, state);
  }
  return word(state);
}

/** Wendet ein Muster wie "%.1f °C" oder "%d %%" auf einen Wert an. */
export function applyPattern(pattern, state) {
  const number = parseFloat(state);
  return pattern.replace(/%(\.(\d+))?([dfs])|%%/g, (match, _p, digits, kind) => {
    if (match === "%%") return "%";
    if (kind === "s" || Number.isNaN(number)) return word(state);
    return formatNumber(number, kind === "d" ? 0 : Number(digits ?? 6));
  }).trim();
}

/** 21.5 → "21,5" (de) oder "21.5" (en) */
export function formatNumber(value, places) {
  return Number(value).toLocaleString(locale(), {
    minimumFractionDigits: places, maximumFractionDigits: places
  });
}

function optionLabel(item, state) {
  const options = [
    ...(item.stateDescription?.options ?? []).map((o) => [o.value, o.label]),
    ...(item.commandDescription?.commandOptions ?? [])
      .map((o) => [o.command, o.label])
  ];
  return options.find(([value]) => value === state)?.[1];
}

/** openHAB-Zeit "2026-11-20T22:34:00.256328564+0100" → Date */
export function parseDate(state) {
  return new Date(String(state).replace(/(\.\d{3})\d+/, "$1")
    .replace(/([+-]\d{2})(\d{2})$/, "$1:$2"));
}

function formatDate(state) {
  const date = parseDate(state);
  if (Number.isNaN(date.getTime())) return state;
  return date.toLocaleString(locale(), {
    weekday: "short", day: "2-digit", month: "2-digit",
    hour: "2-digit", minute: "2-digit"
  });
}

function formatLocation(state) {
  const [lat, lon] = state.split(",").map(Number);
  return `${formatNumber(lat, 4)}, ${formatNumber(lon, 4)}`;
}

/** Zahl aus "21.5 °C" → 21.5 */
export function numberOf(state) {
  const value = parseFloat(state);
  return Number.isNaN(value) ? null : value;
}

/**
 * Zustand eines Color-Items als [H, S, B]. openHAB nimmt auch ON, OFF und
 * eine reine Helligkeit wie "60" an.
 */
export function hsbOf(state) {
  const text = String(state);
  if (text === "ON") return [0, 0, 100];
  if (text.includes(",")) return text.split(",").map(Number);
  const percent = Number(text);
  return [0, 0, Number.isNaN(percent) ? 0 : percent];
}

/** openHAB-Farbe → CSS-Farbe für die Vorschau. */
export function hsbToCss(state) {
  const [h, s, b] = hsbOf(state);
  if ([h, s, b].some(Number.isNaN)) return "transparent";
  const l = (b / 100) * (1 - s / 200);
  const sl = l === 0 || l === 1 ? 0 : ((b / 100) - l) / Math.min(l, 1 - l);
  return `hsl(${h} ${Math.round(sl * 100)}% ${Math.round(l * 100)}%)`;
}
