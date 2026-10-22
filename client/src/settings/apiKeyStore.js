import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'teach-me-this-file.gemini-key';
const listeners = new Set();
let current = load();

/**
 * The user's Gemini key stays in the browser. By default it is kept for this
 * tab only (sessionStorage); "remember" keeps it on this device (localStorage).
 * It is sent to our server with each request and never stored there.
 */
export function useApiKey() {
  return useSyncExternalStore(subscribe, () => current);
}

export function saveApiKey(key, remember) {
  const trimmed = key.trim();
  write(localStorage, remember ? trimmed : '');
  write(sessionStorage, remember ? '' : trimmed);
  current = { key: trimmed, remember: remember && Boolean(trimmed) };
  listeners.forEach((listener) => listener());
}

function load() {
  const remembered = read(localStorage);
  if (remembered) return { key: remembered, remember: true };
  return { key: read(sessionStorage), remember: false };
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function read(storage) {
  try {
    return storage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function write(storage, value) {
  try {
    if (value) storage.setItem(STORAGE_KEY, value);
    else storage.removeItem(STORAGE_KEY);
  } catch {
    // Blocked storage (private mode): the key still works for this page.
  }
}
