/**
 * history.js – Verlauf eines Items aus der Persistence mit Chart.js.
 *
 * Persistence.getItemPersistenceData() liefert { name, datapoints, data },
 * data ist eine Liste aus { time (ms), state (Text) }.
 */
import { openDialog } from "./dialog.js";
import { formatNumber } from "./format.js";
import { locale, t } from "./i18n.js";

const RANGES = [
  { hours: 6, label: () => t("hours", { n: 6 }) },
  { hours: 24, label: () => t("hours", { n: 24 }) },
  { hours: 24 * 7, label: () => t("days", { n: 7 }) }
];

export function openHistory(item, loadHistory) {
  const buttons = document.createElement("div");
  buttons.className = "segmented";
  const canvas = document.createElement("canvas");
  const note = document.createElement("p");
  note.className = "hint";
  const frame = document.createElement("div");
  frame.className = "chart";
  frame.append(canvas);
  openDialog(`${item.label} – ${t("history")}`, buttons, frame, note);

  let chart;
  const show = async (range, button) => {
    for (const other of buttons.children) {
      other.setAttribute("aria-pressed", other === button);
    }
    const end = new Date();
    const start = new Date(end.getTime() - range.hours * 3600 * 1000);
    const result = await loadHistory(item.name, start, end);
    const points = (result.data ?? [])
      .map((p) => ({ x: Number(p.time), y: toNumber(p.state) }))
      .filter((p) => p.y !== null);
    note.textContent = result.error ?? (points.length ? "" : t("noHistory"));
    chart?.destroy();
    chart = draw(canvas, points, item, range.hours, start, end);
  };

  for (const range of RANGES) {
    const button = document.createElement("button");
    button.textContent = range.label();
    button.addEventListener("click", () => show(range, button));
    buttons.append(button);
  }
  show(RANGES[1], buttons.children[1]);
}

function toNumber(state) {
  if (state === "ON" || state === "OPEN") return 1;
  if (state === "OFF" || state === "CLOSED") return 0;
  const value = parseFloat(state);
  return Number.isNaN(value) ? null : value;
}

function draw(canvas, points, item, hours, start, end) {
  const css = getComputedStyle(document.documentElement);
  const color = (name) => css.getPropertyValue(name).trim();
  const unit = item.unitSymbol ? ` ${item.unitSymbol}` : "";
  const time = (ms) => new Date(ms).toLocaleString(locale(), hours > 24
    ? { weekday: "short", hour: "2-digit" } : { hour: "2-digit", minute: "2-digit" });
  return new window.Chart(canvas, {
    type: "line",
    data: { datasets: [{
      data: points, borderColor: color("--accent"), borderWidth: 2,
      pointRadius: 0, tension: 0.25,
      stepped: item.type === "Switch" || item.type === "Contact"
    }] },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: {
          title: (items) => time(items[0].parsed.x),
          label: (context) => `${formatNumber(context.parsed.y, 1)}${unit}`
        } }
      },
      scales: {
        x: {
          type: "linear", min: start.getTime(), max: end.getTime(),
          ticks: { color: color("--muted"), maxTicksLimit: 6, callback: time },
          grid: { color: color("--line") }
        },
        y: { ticks: { color: color("--muted"),
          callback: (value) => `${formatNumber(value, 1)}${unit}` },
        grid: { color: color("--line") } }
      }
    }
  });
}
