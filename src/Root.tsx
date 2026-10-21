import { lazy, Suspense, useEffect } from 'react';
import { ArcadeScreen } from './arcade/ArcadeScreen';
import { useRoute } from './arcade/route';
import { SITE_NAME } from './arcade/games';

// Salon ilk pakettedir; her oyun kendi parçasıdır ve yalnızca girilince (ya da kartın üstüne gelince) iner.
const LOADERS: Record<string, () => Promise<unknown>> = {
  iseAlim: () => import('./App'),
  test: () => import('./games/test/TestGame'),
  insaat: () => import('./games/insaat/InsaatGame'),
};
const IseAlim = lazy(() => import('./App'));
const TestGame = lazy(() => import('./games/test/TestGame').then((m) => ({ default: m.TestGame })));
const InsaatGame = lazy(() => import('./games/insaat/InsaatGame').then((m) => ({ default: m.InsaatGame })));

const preload = (route: string) => void LOADERS[route]?.();

const TITLES = { arcade: SITE_NAME, iseAlim: "Sen İK'sin — 5 günlük işe alım simülasyonu", test: 'Genel Yetenek ve Uyum Testi', insaat: 'İnşaat İzleme' };

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
