import type { GameRoute } from '../slugs';

/*
 * Mahallenin tıklanan yerleri: her yer bir (plazada iki) oyuna açılır. Koordinatlar sahnenin
 * viewBox'ındadır (1600 × 1000); `pin` yerin adının yazdığı tabelanın, kartın da çıktığı nokta.
 */

export const VIEW_W = 1600;
export const VIEW_H = 1000;

export type PlaceId = 'santiye' | 'bakkal' | 'meydan' | 'plaza' | 'doviz' | 'durak' | 'cukur' | 'isik';

export interface Place {
  id: PlaceId;
  /** Tabelada yazan kısa ad. */
  name: string;
  /** Kartın üstündeki küçük satır: yerin kendisi. */
  where: string;
  routes: GameRoute[];
  pin: { x: number; y: number };
}

export const PLACES: Place[] = [
  { id: 'santiye', name: 'Şantiye', where: 'Köşedeki inşaat', routes: ['insaat'], pin: { x: 150, y: 352 } },
  { id: 'bakkal', name: 'Bakkal', where: 'Şükrü Amca’nın bakkalı', routes: ['bakkal'], pin: { x: 397, y: 392 } },
  { id: 'meydan', name: 'Meydan', where: 'Meydandaki eski apartman', routes: ['meydan'], pin: { x: 630, y: 228 } },
  { id: 'plaza', name: 'Plaza', where: 'KASM Plaza · asansörle çık', routes: ['iseAlim', 'test'], pin: { x: 895, y: 560 } },
  { id: 'doviz', name: 'Döviz', where: 'Döviz bürosu · kurlar 2002’den', routes: ['cuzdan'], pin: { x: 1105, y: 448 } },
  { id: 'durak', name: 'Durak', where: 'Otobüs durağının ekranı', routes: ['ekran'], pin: { x: 1452, y: 578 } },
  { id: 'cukur', name: 'Çukur', where: 'Üç aydır yoldaki çukur', routes: ['asfalt'], pin: { x: 560, y: 842 } },
  { id: 'isik', name: 'Işık', where: 'Köşedeki trafik ışığı', routes: ['trafik'], pin: { x: 1205, y: 540 } },
];

export const placeOf = (route: GameRoute) => PLACES.find((p) => p.routes.includes(route));

/** Sabit sözde rastgele: aynı tohum her açılışta aynı ışıkları yakar. */
export function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Günün saatine göre sahnenin ışığı. */
export type Phase = 'sabah' | 'gunduz' | 'aksam' | 'gece';
export const PHASES: Phase[] = ['sabah', 'gunduz', 'aksam', 'gece'];
export const PHASE_NAMES: Record<Phase, string> = { sabah: 'Sabah', gunduz: 'Öğle', aksam: 'Akşam', gece: 'Gece' };

export function phaseOf(d: Date): Phase {
  const h = d.getHours();
  if (h >= 6 && h < 10) return 'sabah';
  if (h >= 10 && h < 17) return 'gunduz';
  if (h >= 17 && h < 20) return 'aksam';
  return 'gece';
}
