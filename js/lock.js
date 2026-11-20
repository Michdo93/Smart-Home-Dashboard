/**
 * lock.js – Sperrbildschirm mit PIN.
 *
 * Achtung: Das ist ein Sichtschutz, keine Sicherheit. Die PIN steht in
 * config.js und damit im Browser; wer die Seite untersucht, findet sie.
 * Gegen Fremde schützen nur Netz, Anmeldung oder ein Proxy (siehe Buch).
 */
import { t } from "./i18n.js";

export function setupLock({ pin, afterMinutes, hint, startLocked = true } = {}) {
  if (!pin) return { lock() {} };
  const screen = document.createElement("div");
  screen.className = "lock-screen";
  screen.hidden = true;
  const title = document.createElement("p");
  title.className = "lock-title";
  const dots = document.createElement("p");
  dots.className = "lock-dots";
  dots.setAttribute("aria-live", "polite");
  const pad = document.createElement("div");
  pad.className = "lock-pad";
  const note = document.createElement("p");
  note.className = "hint";
  note.textContent = hint ?? "";
  screen.append(title, dots, pad, note);
  document.body.append(screen);

  let entered = "";
  const render = (message) => {
    title.textContent = message ?? t("enterPin");
    dots.textContent = "●".repeat(entered.length) || " ";
  };
  const press = (key) => {
    if (key === "⌫") entered = entered.slice(0, -1);
    else entered += key;
    if (entered.length < pin.length) return render();
    if (entered === String(pin)) unlock();
    else {
      entered = "";
      render(t("wrongPin"));
    }
  };
  for (const key of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"]) {
    const button = document.createElement("button");
    button.textContent = key;
    if (key === "⌫") button.setAttribute("aria-label", t("delete"));
    if (!key) button.disabled = true;
    else button.addEventListener("click", () => press(key));
    pad.append(button);
  }

  function lock() {
    entered = "";
    render();
    screen.hidden = false;
  }
  function unlock() {
    screen.hidden = true;
    restart();
  }

  // automatisch sperren, wenn niemand das Dashboard bedient
  let timer;
  const restart = () => {
    clearTimeout(timer);
    if (afterMinutes) timer = setTimeout(lock, afterMinutes * 60 * 1000);
  };
  for (const name of ["pointerdown", "keydown"]) {
    document.addEventListener(name, () => screen.hidden && restart(),
      { passive: true });
  }
  if (startLocked) lock();
  else restart();
  return { lock };
}
