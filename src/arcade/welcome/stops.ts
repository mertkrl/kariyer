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
  /** İşaretin kutu içindeki yeri, yüzde olarak. */
  x: number;
  y: number;
  /** Işığın yarıçapı, kutu genişliğinin yüzdesi. */
  r: number;
}

/** Görseldeki bir noktayı kutunun yüzdesine çevirir (cover kırpması dahil). */
export function toBox(ix: number, iy: number) {
  const scale = BOX_H / IMG_H;
  const crop = (IMG_W * scale - BOX_W) / 2;
  return { x: ((ix * scale - crop) / BOX_W) * 100, y: ((iy * scale) / BOX_H) * 100 };
}

const RAW: { id: PlaceId; at: [number, number]; r: number }[] = [
  { id: 'plaza', at: [597, 287], r: 13 },
  { id: 'santiye', at: [868, 398], r: 13 },
  { id: 'meydan', at: [230, 438], r: 13 },
  { id: 'bakkal', at: [430, 582], r: 10 },
  { id: 'durak', at: [509, 552], r: 7 },
  { id: 'isik', at: [618, 498], r: 6 },
  { id: 'doviz', at: [717, 616], r: 10 },
  { id: 'cukur', at: [523, 695], r: 7 },
];

export const STOPS: Stop[] = RAW.map(({ id, at, r }) => {
  const place = PLACES.find((p) => p.id === id)!;
  return { id, name: place.name, where: place.where, routes: place.routes, r, ...toBox(at[0], at[1]) };
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
