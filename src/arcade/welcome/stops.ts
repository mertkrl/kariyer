import type { GameRoute } from '../slugs';
import { PLACES, type PlaceId } from '../mahalle/places';

/*
 * Maketin üstündeki duraklar: her biri mahallenin bir yeri ve oyunu (plazada iki). `at` yerin
 * maket görselindeki (1152 × 928) noktasıdır; işaret orada durur, ışık oraya düşer.
 */

export const IMG_W = 1152;
export const IMG_H = 928;
/** Görselin çerçevedeki kutusu: görselle aynı oranda, kırpılmaz. */
export const BOX_W = 1028;
export const BOX_H = 828;

export interface Stop {
  id: PlaceId;
  name: string;
  where: string;
  routes: GameRoute[];
  /** Kartta oyunun altına düşen kısa satır. */
  line: string;
  /** İşaretin kutu içindeki yeri, yüzde olarak. */
  x: number;
  y: number;
  /** Işığın yarıçapı, kutu genişliğinin yüzdesi. */
  r: number;
}

/** Görseldeki bir noktayı kutunun yüzdesine çevirir (cover kırpması dahil). */
function toBox(ix: number, iy: number) {
  const scale = BOX_H / IMG_H;
  const crop = (IMG_W * scale - BOX_W) / 2;
  return { x: ((ix * scale - crop) / BOX_W) * 100, y: ((iy * scale) / BOX_H) * 100 };
}

const RAW: { id: PlaceId; at: [number, number]; r: number; line: string }[] = [
  { id: 'plaza', at: [545, 250], r: 13, line: 'Asansör iki kat sorar: işe alım ya da uyum testi.' },
  { id: 'santiye', at: [845, 330], r: 13, line: 'Temelden çatıya bir apartman. İzle, karışma.' },
  { id: 'meydan', at: [255, 470], r: 13, line: 'Çatlak sıvalar, kaçak katlar: cepheyi elden geçir.' },
  { id: 'bakkal', at: [350, 615], r: 10, line: 'Etiket yok; fiyatı sen söylersin.' },
  { id: 'durak', at: [495, 605], r: 7, line: 'Yıllardır aynı duran ekranı baştan tasarla.' },
  { id: 'isik', at: [697, 585], r: 6, line: 'Yeşili, sarıyı, kırmızıyı sen ayarla.' },
  { id: 'doviz', at: [790, 625], r: 10, line: 'Kurlar 2002’den. Eski fiyatı bil, cüzdanı doldur.' },
  { id: 'cukur', at: [672, 716], r: 7, line: 'Üç aydır kapanmayan çukur. Asfalt soğumadan kapat.' },
];

export const STOPS: Stop[] = RAW.map(({ id, at, r, line }) => {
  const place = PLACES.find((p) => p.id === id)!;
  return { id, name: place.name, where: place.where, routes: place.routes, line, r, ...toBox(at[0], at[1]) };
});

/** İmlecin en yakın durağı (kutu yüzdesiyle; yükseklik kutunun en-boy oranıyla düzeltilir). */
export function nearestStop(px: number, py: number): Stop | null {
  const ratio = BOX_H / BOX_W;
  let best: Stop | null = null;
  let bestD = Infinity;
  for (const s of STOPS) {
    const d = Math.hypot(px - s.x, (py - s.y) * ratio) / Math.max(s.r, 7);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return bestD <= 1.15 ? best : null;
}
