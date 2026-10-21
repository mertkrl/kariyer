import { useSyncExternalStore } from 'react';

/*
 * Oyun salonunun adresleri: `#/` salon, `#/ise-alim` ve `#/test` oyunlar. Adres `#` ile tutulur;
 * böylece derleme herhangi bir statik sunucunun herhangi bir klasöründen, çevrimdışı da çalışır.
 */
export type Route = 'arcade' | 'iseAlim' | 'test';

const PATHS: Record<Route, string> = { arcade: '#/', iseAlim: '#/ise-alim', test: '#/test' };

export function routeOf(hash: string): Route {
  const path = hash.replace(/^#/, '').replace(/\/+$/, '');
  if (path === '/ise-alim') return 'iseAlim';
  if (path === '/test') return 'test';
  return 'arcade';
}

export function hrefOf(route: Route): string {
  return PATHS[route];
}

export function navigate(route: Route) {
  window.location.hash = PATHS[route];
}

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, () => routeOf(window.location.hash));
}
