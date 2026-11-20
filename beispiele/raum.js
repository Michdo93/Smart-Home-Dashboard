/**
 * raum.js – Model und Controller für die Beispiele 02 (Bootstrap) und
 * 03 (Material Design). Lädt einen Raum aus dem semantischen Modell, sendet
 * Befehle und hält die Zustände über Server-Sent Events aktuell. Die
 * Ansicht – das HTML mit den Klassen des Frameworks – baut die Seite selbst.
 */
import { ItemStore } from "../js/store.js";
import { baseType, isControl } from "../js/widgets.js";
import { formatState, hsbToCss, numberOf } from "../js/format.js";

export { baseType, formatState, hsbToCss, isControl, numberOf };

const { OpenHABClient, Items, ItemEvents, iterSSEEvents } = window.openHAB;

/** Verbindet, lädt alle Items und liefert Store, Geräte des Raums und send(). */
export async function raumLaden(raum) {
  const client = await new OpenHABClient(location.origin).ready;
  const items = new Items(client);
  const store = new ItemStore();
  store.load(await items.getItems());

  const geraete = store.members(raum)
    .filter((item) => item.type === "Group")
    .map((gruppe) => ({ gruppe, punkte: store.members(gruppe.name) }));

  const send = (name, befehl) => items.sendCommand(name, String(befehl));

  // Änderungen aus openHAB in den Store – die Ansicht hört auf den Store
  (async () => {
    const strom = await new ItemEvents(client).ItemStateChangedEvent();
    for await (const event of iterSSEEvents(strom)) {
      const name = event.topic?.split("/")[2];
      if (name) store.setState(name, event.payload.value);
    }
  })();

  return { label: store.get(raum)?.label ?? raum, geraete, store, send };
}
