import { lazy, Suspense, useEffect, type ComponentType } from 'react';
import { WelcomeScreen } from './arcade/welcome/WelcomeScreen';
import { useRoute } from './arcade/route';
import { loadingBgOf, SITE_NAME } from './arcade/games';
import type { GameRoute } from './arcade/slugs';

// Salon ilk pakettedir; her oyun kendi parçasıdır ve yalnızca girilince (ya da kartın üstüne gelince) iner.
const LOADERS: Record<GameRoute, () => Promise<{ default: ComponentType }>> = {
  iseAlim: () => import('./App'),
  test: () => import('./games/test/TestGame').then((m) => ({ default: m.TestGame })),
  insaat: () => import('./games/insaat/InsaatGame').then((m) => ({ default: m.InsaatGame })),
  bakkal: () => import('./games/bakkal/BakkalGame').then((m) => ({ default: m.BakkalGame })),
  ekran: () => import('./games/ekran/EkranGame').then((m) => ({ default: m.EkranGame })),
  meydan: () => import('./games/meydan/MeydanGame').then((m) => ({ default: m.MeydanGame })),
  asfalt: () => import('./games/asfalt/AsfaltGame').then((m) => ({ default: m.AsfaltGame })),
  trafik: () => import('./games/trafik/TrafikGame').then((m) => ({ default: m.TrafikGame })),
  cuzdan: () => import('./games/cuzdan/CuzdanGame').then((m) => ({ default: m.CuzdanGame })),
};
const GAME_VIEWS = {} as Record<GameRoute, ComponentType>;
for (const route of Object.keys(LOADERS) as GameRoute[]) GAME_VIEWS[route] = lazy(LOADERS[route]);

const preload = (route: string) => void LOADERS[route as GameRoute]?.();

const TITLES = { arcade: SITE_NAME, iseAlim: "Sen İK'sin — 5 günlük işe alım simülasyonu", test: 'Genel Yetenek ve Uyum Testi', insaat: 'İnşaat İzleme', bakkal: 'Köy Bakkalı', ekran: 'Ekran İhalesi', meydan: 'Meydan Islahı', asfalt: 'Yama Ekibi', trafik: 'Kavşak Amiri', cuzdan: 'Cüzdan Zamanı' };

export function Root() {
  const route = useRoute();
  useEffect(() => {
    document.title = TITLES[route];
    window.scrollTo(0, 0);
  }, [route]);

  if (route === 'arcade') return <WelcomeScreen preload={preload} />;
  const Game = GAME_VIEWS[route];
  // yüklenirken oyunun kendi açılış zemini görünür (games.ts): renk bir an başka bir şeye sıçramaz
  return (
    <Suspense fallback={<div style={{ minHeight: '100%', background: loadingBgOf(route) }} />}>
      <Game />
    </Suspense>
  );
}
