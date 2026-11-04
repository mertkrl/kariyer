# Yeni oyun eklemek

Her oyun `src/games/<ad>/` altında kendi klasöründedir ve başka bir oyunu import etmez
(`docs/mimari.md`). Bu belge yeni bir oyunun iskeletini ve salona bağlanmasını anlatır.

## 1. Klasör ve kalıp

```
src/games/<ad>/
├── model.ts        tipler ve sabitler (seviyeler, ürünler, kurallar); React yok
├── logic.ts        saf işlevler: (durum, eylem) → yeni durum; React yok, test edilir
├── reducer.ts      oyunun durumu ve eylemleri: useReducer'a verilen saf reducer
├── use<Ad>.ts      oyun hook'u: reducer + yan etkiler (ses, kayıt, zamanlayıcı)
├── <Ad>Game.tsx    giriş bileşeni: hook'u çağırır, görünümü çizer
├── <Ad>View.tsx    görünüm: yalnızca çizer ve eylemleri çağırır
├── save.ts         kayıt biçimi ve doğrulayıcısı (readSlot/writeSlot)
└── *.module.css
```

Kurallar:

- **Mantık saf kalır.** Puan, fiyat, simülasyon `logic.ts`'te; React, `window`, `Math.random` yok.
  Rastgelelik tohumludur: `import { mulberry32 } from '../../shared/random'`.
- **Durum bir reducer'dadır.** Oyuncunun yapabildiği her şey bir eylem (`{ type: 'sell', price }`);
  reducer saf olduğu için `node --test` ile tarayıcısız denenir.
- **Hook üç grup döndürür:** `state` (okunan hâl), `act` (eylemler), `ui` (yalnızca ekranla ilgili
  hâl: açık paneller, ses, görünüm). Örnek: `games/bakkal/BakkalGame.tsx` ve `shopUi.ts`. Düz
  yüz alanlık bir nesne döndürmeyin.
- **Kayıt** `arcade/saveSlot.ts` ile: `readSlot(KEY, isSave, legacy)`. Anahtar
  `kariyerweb-<ad>-v1`; biçim değişince `v2` yapın ve eski anahtarı `legacy`'ye ekleyin.
- **Ortak olanı kopyalamayın:** renk (`shared/color.ts`), rastgelelik (`shared/random.ts`), depo
  (`shared/storage.ts`), hareket tercihi (`shared/motion.ts`). `requestAnimationFrame` kullanan
  her döngü `prefersReducedMotion()` sorar (`tests/motion.test.ts`).
- **Dosya başına 500 satır** (yorum ve boşluk hariç; lint hatası). Aşınca bölün.

### Reducer şablonu

```ts
// reducer.ts
export interface State { phase: 'title' | 'play' | 'end'; score: number; seed: number }
export type Action = { type: 'start'; seed: number } | { type: 'score'; points: number } | { type: 'end' };

export const initial: State = { phase: 'title', score: 0, seed: 0 };

export function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'start':
      return { ...initial, phase: 'play', seed: a.seed };
    case 'score':
      return s.phase === 'play' ? { ...s, score: s.score + a.points } : s;
    case 'end':
      return { ...s, phase: 'end' };
  }
}
```

```ts
// useOyun.ts
export function useOyun() {
  const [state, dispatch] = useReducer(reducer, initial);
  const [panel, setPanel] = useState(false); // yalnızca ekran: reducer'a girmez
  useEffect(() => {
    if (state.phase === 'end') markPlayed('<ad>', `${state.score} puan`);
  }, [state.phase, state.score]);
  const act = {
    start: () => dispatch({ type: 'start', seed: Date.now() >>> 0 }),
    score: (points: number) => dispatch({ type: 'score', points }),
    end: () => dispatch({ type: 'end' }),
  };
  return { state, act, ui: { panel, setPanel } };
}
```

## 2. Salona bağlamak

| Ne | Nerede |
| --- | --- |
| Adres (`#/<ad>`) | `src/arcade/slugs.ts` |
| Kart: ad, renk, espri, yükleme zemini | `src/arcade/games.ts` (en yenisi en üstte) |
| Paylaşım metni | `src/arcade/blurbs.ts` |
| Maketteki yeri | `src/arcade/mahalle/places.ts` |
| Kart ve paylaşım çizimi | `src/arcade/CardArt.tsx`, `src/og/OgCard.tsx` (`ART`) |
| Tembel yükleme | `src/Root.tsx` `LOADERS` |
| Paylaşım görseli | `npm run og` (geliştirme sunucusu açıkken) → `public/og/<ad>.png` |
| Bittiğini salona bildirmek | `markPlayed('<ad>', sonuç)` (`src/arcade/progress.ts`) |

Hata sınırı ve yükleniyor ekranı otomatik gelir (`Root.tsx`, `arcade/shell/`).

## 3. Testler

- `tests/<ad>.test.ts`: reducer ve saf mantık; tohumla aynı sonucun çıktığı.
- Kayıt doğrulayıcısı bozuk ve eski kaydı reddediyor mu.
- `npm run check` (tip + lint + test) ve `npm run size` (ilk paket bütçesi) yeşil olmadan PR açılmaz.
