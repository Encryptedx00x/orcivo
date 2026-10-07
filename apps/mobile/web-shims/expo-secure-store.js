// Browser-only stand-in for expo-secure-store, used by `expo start --web` for local QA.
// Native builds keep the real module (see metro.config.js).
const store = typeof localStorage !== 'undefined' ? localStorage : new Map();
const get = (k) => (store instanceof Map ? store.get(k) : store.getItem(k)) ?? null;

module.exports = {
  getItemAsync: async (key) => get(key),
  setItemAsync: async (key, value) =>
    store instanceof Map ? store.set(key, value) : store.setItem(key, value),
  deleteItemAsync: async (key) =>
    store instanceof Map ? store.delete(key) : store.removeItem(key),
  isAvailableAsync: async () => true,
};
