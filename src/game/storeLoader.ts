/*
 * The game (its store, rules and every candidate's file) is most of the code, and the welcome
 * screen needs none of it. The first screen draws without it; this fetches it in the background
 * and tells the shell (App, WelcomeScreen) when it has arrived and which phase the game is in.
 */
import { useSyncExternalStore } from 'react';
import type { GamePhase } from './types';

type StoreModule = typeof import('./store');

let loaded: StoreModule | null = null;
let loading: Promise<StoreModule> | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** Fetches the game once; later calls get the same module. */
export function loadStore(): Promise<StoreModule> {
  loading ??= import('./store').then((m) => {
    loaded = m;
    // from now on, every change of the game reaches the shell's hooks below
    m.useGameStore.subscribe(notify);
    notify();
    return m;
  });
  return loading;
}

/**
 * Runs `act` with the game: right away if it is already here (it nearly always is by the time
 * anyone clicks, which keeps the click's user gesture for audio), otherwise once it arrives.
 */
export function withStore(act: (m: StoreModule) => void) {
  if (loaded) act(loaded);
  else void loadStore().then(act);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The game's phase; 'welcome' until the game has loaded. */
export function usePhase(): GamePhase {
  return useSyncExternalStore(subscribe, () => loaded?.useGameStore.getState().phase ?? 'welcome');
}

/** The loaded game module, or null while it is still on its way. */
export function useLoadedStore(): StoreModule | null {
  return useSyncExternalStore(subscribe, () => loaded);
}
