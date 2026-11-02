import { LEVELS, type Level } from './levels';
import type { Demand, Event } from './model';
import { rng } from './sim';

/*
 * Vardiya dışı kavşaklar: "Günün kavşağı" her gün herkese aynı, "Rastgele kavşak" her açılışta başka.
 * Dokuz bölümden biri temel alınır; tohum değişince ara sokaklar ve mahalle başka çıkar, her hareketin
 * talebi %80–125 arası oynar, olayların saati kayar, akşam ve yağmur zarla gelir. Araçlar ve geçer not
 * bölümünkiyle aynı.
 */

/** Günün tohumu: tarihten (yerel saat), herkese aynı. */
export const daySeed = (d = new Date()) => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();

export const dayLabel = (d = new Date()) => d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });

const scale = (r: Demand['rate'], f: number): Demand['rate'] => (typeof r === 'number' ? Math.round(r * f * 2) / 2 : r.map(([t, v]) => [t, Math.round(v * f * 2) / 2] as [number, number]));

export function freeLevel(seed: number, daily: boolean): Level {
  const r = rng(seed * 17 + 3);
  const base = LEVELS[Math.floor(r() * LEVELS.length)];
  const spec = base.spec;
  const shift = (e: Event): Event => ({ ...e, at: Math.max(6, Math.min(spec.duration - 20, e.at + Math.round((r() - 0.5) * 24))) });
  const dusk = r() < 0.35 ? 0.4 + r() * 0.5 : (spec.dusk ?? 0);
  const rain = spec.rain || r() < 0.2;
  const busy = 0.8 + r() * 0.45;
  return {
    ...base,
    title: daily ? 'Günün kavşağı' : 'Rastgele kavşak',
    order: `${base.place.split('·').pop()!.trim()} bugün başka: ${busy > 1.1 ? 'trafik her zamankinden yoğun' : busy < 0.9 ? 'trafik biraz sakin ama sokaklar değişti' : 'ara sokaklar ve kalabalık yollar değişti'}${rain && !spec.rain ? ', yağmur bekleniyor' : ''}${dusk > (spec.dusk ?? 0) ? ', hava kararıyor' : ''}. Işıkları baştan oku; dünkü ayar bugün tutmayabilir.`,
    spec: {
      ...spec,
      id: `${spec.id}-${daily ? 'gun' : 'rast'}-${seed}`,
      seed: (seed % 100000) + 7,
      dusk,
      rain,
      events: spec.events.map(shift).sort((a, b) => a.at - b.at),
      nodes: spec.nodes.map((n) => ({ ...n, demand: n.demand.map((d) => ({ ...d, rate: scale(d.rate, busy * (0.85 + r() * 0.3)) })) })),
    },
  };
}
