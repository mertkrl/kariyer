import type { StoreApi } from 'zustand';
import type { GameState } from './storeTypes';

/*
 * The store, reachable from the modules that make the game run (the clock, the slices) without
 * importing store.ts itself — which would be a cycle. store.ts binds it right after creating it.
 */
let store: StoreApi<GameState> | null = null;

export function bindStore(api: StoreApi<GameState>) {
  store = api;
}

function api() {
  if (!store) throw new Error('Oyun durumu henüz oluşturulmadı.');
  return store;
}

export const getState = () => api().getState();
export const setState: StoreApi<GameState>['setState'] = (...args) => api().setState(...(args as Parameters<StoreApi<GameState>['setState']>));

export type SetState = StoreApi<GameState>['setState'];
export type GetState = StoreApi<GameState>['getState'];
