/**
 * dialog.js – ein schlichtes modales Fenster mit dem <dialog>-Element.
 */
import { t } from "./i18n.js";

/** Öffnet ein Fenster mit Titel und Inhalt; gibt das Element zurück. */
export function openDialog(title, ...content) {
  const dialog = document.createElement("dialog");
  dialog.className = "dialog";
  const heading = document.createElement("h2");
  heading.textContent = title;
  const close = document.createElement("button");
  close.className = "icon-button dialog-close";
  close.setAttribute("aria-label", t("close"));
  close.textContent = "✕";
  close.addEventListener("click", () => dialog.close());
  const head = document.createElement("header");
  head.append(heading, close);
  dialog.append(head, ...content);
  dialog.addEventListener("close", () => dialog.remove());
  // Klick neben das Fenster schließt es
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  document.body.append(dialog);
  dialog.showModal();
  return dialog;
}
