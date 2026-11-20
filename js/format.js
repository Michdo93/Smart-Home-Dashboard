/**
 * format.js – macht aus einem openHAB-Zustand einen lesbaren Text.
 */
const WORDS = {
  ON: "an", OFF: "aus", OPEN: "offen", CLOSED: "geschlossen",
  PLAY: "läuft", PAUSE: "pausiert", NULL: "–", UNDEF: "–"
};

/** Text für die Anzeige, mit Muster (pattern) und Auswahlwerten des Items. */
export function formatState(item, state = item.state) {
  if (state === "NULL" || state === "UNDEF" || state == null) return "–";
  const option = optionLabel(item, state);
  if (option) return option;
  if (item.transformedState && state === item.state) return item.transformedState;
  const base = item.type.split(":")[0];
  if (base === "DateTime") return formatDate(state);
  if (base === "Location") return formatLocation(state);
  if (base === "Color") return `${hsbOf(state)[2]} %`;
  const pattern = item.stateDescription?.pattern;
  if (pattern && /%[\d.]*[dfs]/.test(pattern) && !pattern.includes("(")) {
    return applyPattern(pattern, state);
  }
  return WORDS[state] ?? state;
}

/** Wendet ein Muster wie "%.1f °C" oder "%d %%" auf einen Wert an. */
export function applyPattern(pattern, state) {
  const number = parseFloat(state);
  return pattern.replace(/%(\.(\d+))?([dfs])|%%/g, (match, _p, digits, kind) => {
    if (match === "%%") return "%";
    if (kind === "s" || Number.isNaN(number)) return WORDS[state] ?? state;
    const places = kind === "d" ? 0 : Number(digits ?? 6);
    return number.toLocaleString("de-DE", {
      minimumFractionDigits: places, maximumFractionDigits: places
    });
  }).trim();
}

function optionLabel(item, state) {
  const options = [
    ...(item.stateDescription?.options ?? []).map((o) => [o.value, o.label]),
    ...(item.commandDescription?.commandOptions ?? [])
      .map((o) => [o.command, o.label])
  ];
  return options.find(([value]) => value === state)?.[1];
}

function formatDate(state) {
  const date = new Date(state.replace(/(\.\d{3})\d+/, "$1")
    .replace(/([+-]\d{2})(\d{2})$/, "$1:$2"));
  if (Number.isNaN(date.getTime())) return state;
  return date.toLocaleString("de-DE", {
    weekday: "short", day: "2-digit", month: "2-digit",
    hour: "2-digit", minute: "2-digit"
  });
}

function formatLocation(state) {
  const [lat, lon] = state.split(",").map(Number);
  return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
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

/** "#rrggbb" aus dem Farbwähler → "H,S,B" für openHAB. */
export function hexToHsb(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const delta = max - Math.min(r, g, b);
  let h = 0;
  if (delta) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
  }
  h = Math.round((h * 60 + 360) % 360);
  const s = max ? Math.round((delta / max) * 100) : 0;
  return `${h},${s},${Math.round(max * 100)}`;
}

/** "H,S,B" → "#rrggbb" für den Farbwähler (Helligkeit 100 %). */
export function hsbToHex(state) {
  const [h, s] = hsbOf(state);
  if (Number.isNaN(h)) return "#ffffff";
  const f = (n) => {
    const k = (n + h / 60) % 6;
    const v = 1 - (s / 100) * Math.max(0, Math.min(k, 4 - k, 1));
    return Math.round(v * 255).toString(16).padStart(2, "0");
  };
  return `#${f(5)}${f(3)}${f(1)}`;
}
