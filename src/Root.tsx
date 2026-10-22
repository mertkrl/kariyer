import { lazy, Suspense, useEffect } from 'react';
import { ArcadeScreen } from './arcade/ArcadeScreen';
import { useRoute } from './arcade/route';
import { SITE_NAME } from './arcade/games';

// Salon ilk pakettedir; her oyun kendi parçasıdır ve yalnızca girilince (ya da kartın üstüne gelince) iner.
const LOADERS: Record<string, () => Promise<unknown>> = {
  iseAlim: () => import('./App'),
  test: () => import('./games/test/TestGame'),
  insaat: () => import('./games/insaat/InsaatGame'),
  bakkal: () => import('./games/bakkal/BakkalGame'),
  ekran: () => import('./games/ekran/EkranGame'),
  asfalt: () => import('./games/asfalt/AsfaltGame'),
};
const IseAlim = lazy(() => import('./App'));
const TestGame = lazy(() => import('./games/test/TestGame').then((m) => ({ default: m.TestGame })));
const InsaatGame = lazy(() => import('./games/insaat/InsaatGame').then((m) => ({ default: m.InsaatGame })));
const AsfaltGame = lazy(() => import('./games/asfalt/AsfaltGame').then((m) => ({ default: m.AsfaltGame })));
const EkranGame = lazy(() => import('./games/ekran/EkranGame').then((m) => ({ default: m.EkranGame })));
const BakkalGame = lazy(() => import('./games/bakkal/BakkalGame').then((m) => ({ default: m.BakkalGame })));

const preload = (route: string) => void LOADERS[route]?.();

const TITLES = { arcade: SITE_NAME, iseAlim: "Sen İK'sin — 5 günlük işe alım simülasyonu", test: 'Genel Yetenek ve Uyum Testi', insaat: 'İnşaat İzleme', bakkal: 'Köy Bakkalı', ekran: 'Ekran İhalesi', asfalt: 'Yama Ekibi' };

export function Root() {
  const route = useRoute();
  useEffect(() => {
    document.title = TITLES[route];
    window.scrollTo(0, 0);
  }, [route]);

  if (route === 'arcade') return <ArcadeScreen preload={preload} />;
  if (route === 'iseAlim')
    return (
      <Suspense fallback={null}>
        <IseAlim />
      </Suspense>
    );
  // şantiyenin açık zemini: yüklenirken aynı renk görünsün
  if (route === 'asfalt')
    return (
      <Suspense fallback={<div style={{ minHeight: '100%', background: '#e9e4d8' }} />}>
        <AsfaltGame />
      </Suspense>
    );
  // atölyenin koyu zemini: yüklenirken aynı renk görünsün
  if (route === 'ekran')
    return (
      <Suspense fallback={<div style={{ minHeight: '100%', background: '#23262d' }} />}>
        <EkranGame />
      </Suspense>
    );
  // bakkalın ahşap zemini: yüklenirken aynı bej görünsün
  if (route === 'bakkal')
    return (
      <Suspense fallback={<div style={{ minHeight: '100%', background: '#f4e6c8' }} />}>
        <BakkalGame />
      </Suspense>
    );
  // inşaat sahnesi gökyüzüyle açılır: yüklenirken aynı mavi görünsün
  if (route === 'insaat')
    return (
      <Suspense fallback={<div style={{ minHeight: '100%', background: '#bcd9ea' }} />}>
        <InsaatGame />
      </Suspense>
    );
  // test platformu açık renkli: yüklenirken oyunun koyu zemini bir an görünmesin
  return (
    <Suspense fallback={<div style={{ minHeight: '100%', background: '#f4f6fa' }} />}>
      <TestGame />
    </Suspense>
  );
}
