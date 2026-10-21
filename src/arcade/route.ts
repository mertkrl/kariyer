import { useSyncExternalStore } from 'react';

/*
 * Oyun salonunun adresleri: `#/` salon, `#/ise-alim`, `#/test` ve `#/insaat` oyunlar. Adres `#` ile tutulur;
 * böylece derleme herhangi bir statik sunucunun herhangi bir klasöründen, çevrimdışı da çalışır.
 */
export type Route = 'arcade' | 'iseAlim' | 'test' | 'insaat';

const PATHS: Record<Route, string> = { arcade: '#/', iseAlim: '#/ise-alim', test: '#/test', insaat: '#/insaat' };

export function routeOf(hash: string): Route {
  const path = hash.replace(/^#/, '').replace(/\/+$/, '');
  if (path === '/ise-alim') return 'iseAlim';
  if (path === '/test') return 'test';
  if (path === '/insaat') return 'insaat';
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
