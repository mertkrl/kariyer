import { hash } from '../mahalle/places';
import { WINDOWS } from './windows';

/*
 * Maketin saati İstanbul'un gerçek gününü izler: güneşin doğuş ve batışı o günün tarihine göre
 * hesaplanır (İstanbul, UTC+3). Mahalle gün batımından yarım saat önce kararmaya başlar, batıştan
 * bir saat sonra tam gecedir; sabah doğuştan bir saat önce aydınlanmaya başlar, doğuştan yarım saat
 * sonra tam gündüzdür. Evlerin ışıkları gün batarken yanar; 22:00'de bir kısmı, 23:00'te bir kısmı
 * daha, gece yarısı çoğu söner. 01:00'den sonra yalnızca uykusuz bir pencere yanık kalır.
 * Plazanın ışıkları yalnızca fazla mesaide yanar. Herkes için aynı saatte aynı pencereler yanar.
 */

/** 01:00'den sabaha kadar yanan tek pencere (WINDOWS'taki sırası). */
export const NIGHT_OWL = 42;

/** İstanbul: enlem, boylam ve saat dilimi (2016'dan beri yıl boyu UTC+3). */
const LAT = 41.01;
const LON = 28.98;
const TZ = 180;

/** İstanbul saatiyle günün dakikası (0–1439), cihazın saat diliminden bağımsız. */
const istanbulMinutes = (d: Date) => (d.getUTCHours() * 60 + d.getUTCMinutes() + TZ + 1440) % 1440;

/** O günün İstanbul'daki güneş doğuşu ve batışı (İstanbul saatiyle gece yarısından dakika). */
export function sunTimes(d: Date): { rise: number; set: number } {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  const day = Math.floor((d.getTime() + TZ * 60_000 - start) / 86_400_000);
  // NOAA'nın kısaltılmış formülü: güneşin sapması ve zaman denklemi
  const g = ((2 * Math.PI) / 365) * (day - 1);
  const eqTime = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const lat = (LAT * Math.PI) / 180;
  const zenith = (90.833 * Math.PI) / 180;
  const ha = (Math.acos(Math.cos(zenith) / (Math.cos(lat) * Math.cos(decl)) - Math.tan(lat) * Math.tan(decl)) * 180) / Math.PI;
  const noon = 720 - 4 * LON - eqTime + TZ;
  return { rise: Math.round(noon - 4 * ha), set: Math.round(noon + 4 * ha) };
}

/** Öğleden bu yana geçen dakika (İstanbul saati): 18:00 → 360, 00:00 → 720, 06:00 → 1080. Gece yarısında kopmaz. */
const sinceNoon = (d: Date) => (istanbulMinutes(d) + 720) % 1440;

/** Günün eşikleri, öğleden bu yana dakika: kararma başı, tam gece, aydınlanma başı, tam gündüz. */
function edges(d: Date) {
  const { rise, set } = sunTimes(d);
  return { dusk: set - 720 - 30, night: set - 720 + 60, dawn: rise + 720 - 60, morning: rise + 720 + 30, set: set - 720 };
}

/** 0 gündüz, 1 tam gece. */
export function darkness(d: Date): number {
  const m = sinceNoon(d);
  const e = edges(d);
  if (m < e.dusk || m >= e.morning) return 0;
  if (m < e.night) return (m - e.dusk) / (e.night - e.dusk);
  if (m < e.dawn) return 1;
  return 1 - (m - e.dawn) / (e.morning - e.dawn);
}

/** Bir evin ışığının yandığı ve söndüğü dakika (öğleden bu yana); boş dairede null. */
function schedule(i: number, dusk: number): [number, number] | null {
  if (i === NIGHT_OWL) return [dusk, 1080];
  if (hash(i * 3 + 1) > 0.82) return null;
  // gün batarken, batıştan yarım saat önce ile bir saat sonrası arasında yanar
  const on = dusk + hash(i * 3 + 2) * 90;
  const r = hash(i * 3 + 3);
  const f = hash(i * 7 + 5);
  // 22:00–23:00, 23:00–00:00, 00:00–00:30, 00:30–00:50
  const off = r < 0.3 ? 600 + f * 60 : r < 0.6 ? 660 + f * 60 : r < 0.92 ? 720 + f * 30 : 750 + f * 20;
  return [on, off];
}

/** Şu an hangi pencereler yanıyor (WINDOWS sırasıyla). */
export function windowsOn(d: Date, overtime: boolean): boolean[] {
  const m = sinceNoon(d);
  const { dusk } = edges(d);
  return WINDOWS.map(([group], i) => {
    if (group === 'plaza') return overtime;
    const s = schedule(i, dusk);
    return s !== null && m >= s[0] && m < s[1];
  });
}
