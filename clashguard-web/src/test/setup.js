import '@testing-library/jest-dom/vitest';

// Some sandboxes expose a non-standard localStorage object in jsdom.
if (!window.localStorage || typeof window.localStorage.getItem !== 'function') {
  const store = new Map();
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => {
        store.set(key, String(value));
      },
      removeItem: (key) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
    },
    configurable: true,
  });
}
