/*
 * Test setup: the module hooks, plus the few browser globals the game's logic touches
 * (localStorage for the save, window.location for the seed). No DOM, no audio.
 */
import { registerHooks } from 'node:module';
import { load, resolve } from './hooks.mjs';

registerHooks({ resolve, load });

class MemoryStorage {
  #items = new Map();
  get length() { return this.#items.size; }
  key(i) { return [...this.#items.keys()][i] ?? null; }
  getItem(k) { return this.#items.has(k) ? this.#items.get(k) : null; }
  setItem(k, v) { this.#items.set(k, String(v)); }
  removeItem(k) { this.#items.delete(k); }
  clear() { this.#items.clear(); }
}

Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true, writable: true });
globalThis.window ??= globalThis;
globalThis.window.location ??= new URL('http://localhost/');
