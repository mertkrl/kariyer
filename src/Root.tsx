import { lazy, Suspense, useEffect, useState, type ComponentType } from 'react';
import { WelcomeScreen } from './arcade/welcome/WelcomeScreen';
import { hrefOf, isUnknownHash, useRoute } from './arcade/route';
import { NotFoundNotice } from './arcade/shell/NotFoundNotice';
import { GAMES, loadingBgOf, SITE_NAME } from './arcade/games';
import type { GameRoute } from './arcade/slugs';
import { GameBoundary } from './arcade/shell/GameBoundary';
import { GameLoading } from './arcade/shell/GameLoading';
import { loadAudio } from './shared/audio/lazy';

// Salon ilk pakettedir; her oyun kendi parçasıdır ve yalnızca girilince (ya da kartın üstüne gelince) iner.
const LOADERS: Record<GameRoute, () => Promise<{ default: ComponentType }>> = {
  iseAlim: () => import('./games/ise-alim/App'),
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
  // bilinmeyen adres (açılışta ya da adres çubuğundan değişince): salonda not çıkar, adres salona
  // düzeltilir; yenileyince not tekrar çıkmaz
  const [lost, setLost] = useState<string | null>(null);
  useEffect(() => {
    const check = () => {
      if (!isUnknownHash(window.location.hash)) return;
      setLost(window.location.hash.replace(/^#/, ''));
      history.replaceState(null, '', hrefOf('arcade'));
    };
    check();
    window.addEventListener('hashchange', check);
    return () => window.removeEventListener('hashchange', check);
  }, []);
  useEffect(() => {
    // oyuna girildi: ses motoru (salonun ilk paketinde değil) hemen insin
    if (route !== 'arcade') void loadAudio();
    document.title = TITLES[route];
    window.scrollTo(0, 0);
  }, [route]);

  if (route === 'arcade')
    return (
      <>
        {lost && <NotFoundNotice key={lost} path={lost} />}
        <WelcomeScreen preload={preload} />
      </>
    );
  const Game = GAME_VIEWS[route];
  const title = GAMES.find((g) => g.route === route)?.title ?? SITE_NAME;
  /*
   * Her oyun kendi hata sınırında (adrese bağlı: başka oyuna geçince hata unutulur). İK'nın kayıt
   * bilen kendi sınırı App.tsx'te, İK'nın parçasında; parça inemezse hata bu sınıra kalır.
   * Yüklenirken oyunun kendi açılış zemini (renk sıçramaz), biraz sürerse adı ve ilerleme çizgisi.
   */
  return (
    <GameBoundary key={route} title={title}>
      <Suspense fallback={<GameLoading title={title} background={loadingBgOf(route)} />}>
        <Game />
      </Suspense>
    </GameBoundary>
  );
}
