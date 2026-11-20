/**
 * store.js – Model-Schicht: kennt Items und Zustände, aber kein DOM.
 *
 * ItemStore hält zu jedem Item den letzten Zustand. Widgets abonnieren ein
 * Item und werden bei jeder Änderung aufgerufen – egal, ob der Wert vom
 * ersten Laden oder aus einem Ereignis (SSE) stammt.
 */
export class ItemStore {
  constructor() {
    this.items = new Map();      // Name -> Item aus der REST API
    this.observers = new Map();  // Name -> Set von Funktionen
  }

  /** Übernimmt die Liste aus Items.getItems(). */
  load(items) {
    for (const item of items) {
      this.items.set(item.name, item);
      this.notify(item.name);
    }
  }

  get(name) {
    return this.items.get(name);
  }

  /** Setzt einen neuen Zustand, etwa aus einem ItemStateChangedEvent. */
  setState(name, state) {
    const item = this.items.get(name);
    if (!item || item.state === state) return;
    item.state = state;
    item.transformedState = undefined;   // gilt nur für den alten Wert
    this.notify(name);
  }

  /**
   * fn(item) wird sofort und bei jeder Änderung aufgerufen – bis signal
   * abbricht. Ohne Angabe gilt das Signal der aktuellen Ansicht (newView).
   */
  subscribe(name, fn, signal = this.viewSignal) {
    if (signal?.aborted) return () => {};
    if (!this.observers.has(name)) this.observers.set(name, new Set());
    this.observers.get(name).add(fn);
    const unsubscribe = () => this.observers.get(name).delete(fn);
    signal?.addEventListener("abort", unsubscribe, { once: true });
    const item = this.items.get(name);
    if (item) fn(item);
    return unsubscribe;
  }

  /** Neue Ansicht: Alle Beobachter der vorigen melden sich ab. */
  newView() {
    this.view?.abort();
    this.view = new AbortController();
    this.viewSignal = this.view.signal;
  }

  notify(name) {
    const item = this.items.get(name);
    for (const fn of this.observers.get(name) ?? []) fn(item);
  }

  /** Anzahl der angemeldeten Beobachter (zur Fehlersuche) */
  get observerCount() {
    let count = 0;
    for (const set of this.observers.values()) count += set.size;
    return count;
  }

  /** Direkte Mitglieder einer Gruppe in der Reihenfolge der REST API. */
  members(group) {
    return [...this.items.values()]
      .filter((item) => item.groupNames?.includes(group));
  }
}
