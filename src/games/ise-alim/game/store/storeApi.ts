import type { StoreApi } from 'zustand';
import type { GameState } from './storeTypes';

/*
 * Store'a, oyunu çalıştıran modüllerden (saat, dilimler) store.ts'in kendisini içe aktarmadan
 * ulaşılır; aksi bir döngü olurdu. store.ts onu oluşturduktan hemen sonra bağlar.
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
