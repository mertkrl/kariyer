import { useSyncExternalStore } from 'react';
import { SLUGS, type GameRoute } from './slugs';

/*
 * Oyun salonunun adresleri: `#/` salon (etkileşimli maket; eski `#/mahalle` adresi de buraya düşer), `#/ise-alim`, `#/test`, `#/insaat`, `#/bakkal`, `#/ekran`, `#/meydan`, `#/asfalt`, `#/trafik` ve `#/cuzdan` oyunlar (`#/ekran?t=…` paylaşılan bir ekran tasarımını taşır). Adres `#` ile tutulur;
 * böylece derleme herhangi bir statik sunucunun herhangi bir klasöründen, çevrimdışı da çalışır.
 */
export type Route = 'arcade' | GameRoute;

export function routeOf(hash: string): Route {
  const path = hash.replace(/^#/, '').split('?')[0].replace(/\/+$/, '');
  const found = (Object.keys(SLUGS) as GameRoute[]).find((r) => path === `/${SLUGS[r]}`);
  return found ?? 'arcade';
}

export function hrefOf(route: Route): string {
  return route === 'arcade' ? '#/' : `#/${SLUGS[route]}`;
}

export function navigate(route: Route) {
  window.location.hash = hrefOf(route);
}

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, () => routeOf(window.location.hash));
}
