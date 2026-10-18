/*
 * Oyun (store'u, kuralları ve her adayın dosyası) kodun büyük kısmıdır; karşılama ekranının
 * hiçbirine ihtiyacı yoktur. İlk ekran onsuz çizilir; bu dosya oyunu arka planda indirir ve
 * kabuğa (App, WelcomeScreen) ne zaman geldiğini ve oyunun hangi aşamada olduğunu söyler.
 */
import { useSyncExternalStore } from 'react';
import type { GamePhase } from '../types';

type StoreModule = typeof import('./store');

let loaded: StoreModule | null = null;
let loading: Promise<StoreModule> | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** Oyunu bir kez indirir; sonraki çağrılar aynı modülü alır. */
export function loadStore(): Promise<StoreModule> {
  loading ??= import('./store').then((m) => {
    loaded = m;
    // bundan sonra oyunun her değişikliği aşağıdaki kabuk hook'larına ulaşır
    m.useGameStore.subscribe(notify);
    notify();
    return m;
  });
  return loading;
}

/**
 * `act`ı oyunla çalıştırır: oyun zaten buradaysa hemen (biri tıkladığında neredeyse her zaman
 * buradadır; bu, tıklamanın ses için gereken kullanıcı hareketini korur), değilse gelince.
 */
export function withStore(act: (m: StoreModule) => void) {
  if (loaded) act(loaded);
  else void loadStore().then(act);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Oyunun aşaması; oyun yüklenene kadar 'welcome'. */
export function usePhase(): GamePhase {
  return useSyncExternalStore(subscribe, () => loaded?.useGameStore.getState().phase ?? 'welcome');
}

/** Yüklenmiş oyun modülü ya da hâlâ yoldaysa null. */
export function useLoadedStore(): StoreModule | null {
  return useSyncExternalStore(subscribe, () => loaded);
}
