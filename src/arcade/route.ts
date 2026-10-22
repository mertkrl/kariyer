import { useSyncExternalStore } from 'react';

/*
 * Oyun salonunun adresleri: `#/` salon, `#/ise-alim`, `#/test`, `#/insaat`, `#/bakkal`, `#/ekran` ve `#/asfalt` oyunlar (`#/ekran?t=…` paylaşılan bir ekran tasarımını taşır). Adres `#` ile tutulur;
 * böylece derleme herhangi bir statik sunucunun herhangi bir klasöründen, çevrimdışı da çalışır.
 */
export type Route = 'arcade' | 'iseAlim' | 'test' | 'insaat' | 'bakkal' | 'ekran' | 'asfalt';

const PATHS: Record<Route, string> = { arcade: '#/', iseAlim: '#/ise-alim', test: '#/test', insaat: '#/insaat', bakkal: '#/bakkal', ekran: '#/ekran', asfalt: '#/asfalt' };

export function routeOf(hash: string): Route {
  const path = hash.replace(/^#/, '').split('?')[0].replace(/\/+$/, '');
  if (path === '/ise-alim') return 'iseAlim';
  if (path === '/test') return 'test';
  if (path === '/insaat') return 'insaat';
  if (path === '/bakkal') return 'bakkal';
  if (path === '/ekran') return 'ekran';
  if (path === '/asfalt') return 'asfalt';
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
