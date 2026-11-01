import type { Plan } from './model';
import { breakdownNow, type Sim } from './sim';

/*
 * İlk vardiyanın rehberi: oyuncu her özelliği bir kez kendi eliyle dener. Her adımın bir
 * hedefi (parlayan düğme) ve çoğunun bir bitiş koşulu var; koşul tutunca rehber kendiliğinden
 * ilerler. Koşulsuz adımlar "İleri" ile geçilir. Arıza adımı yolda gerçekten bir arıza çıkarır.
 */

export type HintTarget = 'cards' | 'editor' | 'play' | 'live' | 'roads' | 'manual' | 'incidents';

export interface GuideState {
  sim: Sim;
  plan: Plan;
  selected: number | null;
  running: boolean;
  used: Set<string>;
}

export interface GuideStep {
  title: string;
  text: string;
  target?: HintTarget;
  /** Adım tamam mı: tutunca rehber ilerler. Yoksa "İleri" düğmesi çıkar. */
  done?: (g: GuideState) => boolean;
  /** Adıma girince bir kez. */
  enter?: (sim: Sim) => void;
}

export const GUIDE: GuideStep[] = [
  {
    title: 'Kontrol merkezine hoş geldin',
    text: 'Karşında Moda Caddesi’nin kavşağı. Arabalar dört koldan geliyor; ışıklar alttaki kontrolörden yönetiliyor. Süre şu an durdu, istediğin kadar inceleyebilirsin.',
  },
  {
    title: 'Kollar ve kuyruklar',
    text: 'Her kolun ucundaki etiket o koldaki kuyruğu ve en uzun bekleyişi gösterir. Sağ üstte araç başına gecikme ve hizmet düzeyi var: A en iyi, F kilit.',
  },
  {
    title: 'Evre kartları',
    text: 'Alttaki kartlar “evre”dir: hangi yönlerin birlikte yeşil yandığını gösterir. İlk karta dokun (Altıyol–Moda Burnu, kuzey–güney).',
    target: 'cards',
    done: (g) => g.selected === 0,
  },
  {
    title: 'Yeşil süresi',
    text: 'Kalabalık cadde yalnızca 12 saniye yeşil alıyor. Kartın üstündeki + ile bu evrenin yeşilini en az 26 saniyeye çıkar.',
    target: 'cards',
    done: (g) => (g.plan.phases[0]?.green ?? 0) >= 26,
  },
  {
    title: 'Boş sokağa az yeşil',
    text: 'İkinci evre neredeyse boş bir sokağa 34 saniye veriyor. Onun yeşilini 20 saniyenin altına indir: döngü kısalır, herkes daha az bekler.',
    target: 'cards',
    done: (g) => (g.plan.phases[1]?.green ?? 99) <= 20,
  },
  {
    title: 'Trafiği başlat',
    text: '▶ düğmesine bas (ya da boşluk tuşu). Hızı 1×, 2×, 4× ile değiştirebilirsin.',
    target: 'play',
    done: (g) => g.running && g.sim.t > 0,
  },
  {
    title: 'Yeşili tut',
    text: '“Tut” o an yanan yeşili sabitler: ambulans ya da konvoy geçerken işe yarar. Bir kez “Tut”a bas, sonra “Bırak”.',
    target: 'live',
    done: (g) => g.used.has('hold') && !g.sim.ctl.hold,
  },
  {
    title: 'Yolu düzenle',
    text: 'Sağdaki Yollar panelinde bir kolun düzenine dokun: tek yön (giriş ya da çıkış) ya da kapalı yap. Kapanan yönden gelenler ara sokaklara sapar; her biri 40 saniye kaybeder, sürücüler söylenir.',
    target: 'roads',
    done: (g) => Object.values(g.sim.mode).some((m) => m && m !== 'iki'),
  },
  {
    title: 'Geri aç',
    text: 'Bariyerleri gördün. Şimdi o kolu yeniden “Çift yön” yap (düğmeye dokunarak sırayla dön).',
    target: 'roads',
    done: (g) => Object.values(g.sim.mode).every((m) => !m || m === 'iki'),
  },
  {
    title: 'Elle kumanda',
    text: 'Yollar panelindeki “Elle kumanda”yı aç: kontrolör durur, her kolun ışığı sende. Bir kolun yanındaki ışığa dokunup çevir.',
    target: 'manual',
    done: (g) => g.used.has('toggle'),
  },
  {
    title: 'Dikkat: çakışan yeşil',
    text: 'Elle kumandada iki dik kolu birlikte yeşil yakarsan kutuda kaza çıkar, kırmızıya çevirmeyi unutursan kuyruk kilitlenir. Şimdi “Elle kumanda”yı kapat; kontrolör tüm kırmızıdan sonra devralır.',
    target: 'manual',
    done: (g) => g.used.has('manual') && !g.sim.manual,
  },
  {
    title: 'Yolda olay var',
    text: 'Altıyol kolundan gelen bir araç birazdan arızalanacak. Sol tarafta olay kartı çıkınca “Trafik ekiplerine bildir”e bas.',
    target: 'incidents',
    enter: (sim) => breakdownNow(sim, 'N.T', 'Altıyol kolunda bir dolmuş arızalandı: şerit kapandı, dörtlüler yanıyor.'),
    done: (g) => g.sim.incidents.some((i) => i.team),
  },
  {
    title: 'Ekip yolda',
    text: 'Haritada mavi-kırmızı lambalı ekip aracını izle: olay yerine gidiyor, dubaları dizip aracı çekecek. Ekip çağrılmasaydı şerit iki dakika kapalı kalacaktı.',
    done: (g) => g.sim.incidents.some((i) => i.team && i.cleared !== undefined),
  },
  {
    title: 'Vardiya senin',
    text: 'Hepsi bu kadar. Süre dolana kadar kuyrukları kısa tut; sonunda tutanak gelir. Sonraki kavşaklarda düğün konvoyları, iş çıkışı, ambulanslar ve bir makam konvoyu var. Kolay gelsin amirim.',
  },
];
