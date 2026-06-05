import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import { afterEach, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";

/**
 * Minimal in-memory localStorage stub.
 *
 * Node 22's jsdom build no longer exposes localStorage unless run with
 * `--localstorage-file`. Several stores (uiStore via zustand/persist) rely
 * on it, so we provide a per-test in-memory replacement and reset it in
 * `beforeEach`.
 */
function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
  };
}

function installStorage(): void {
  if (typeof window === "undefined") return;
  const local = createMemoryStorage();
  const session = createMemoryStorage();
  Object.defineProperty(window, "localStorage", {
    value: local,
    configurable: true,
  });
  Object.defineProperty(window, "sessionStorage", {
    value: session,
    configurable: true,
  });
}

installStorage();

beforeEach(() => {
  installStorage();
});

afterEach(() => {
  cleanup();
});
