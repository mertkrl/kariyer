import { FILL_TO, H, idx, EMPTY, WATER, type Material, type StepKey, type World } from './model';
import type { Tool } from './levels';

/*
 * İlk günün rehberi: ustabaşı Hayri yamayı adım adım yaptırır. Her adım bir araç gösterir ve
 * dünyaya bakarak biter; biten adım kendiliğinden bir sonrakine geçer.
 */

export interface Lesson {
  text: string;
  /** Parlatılan araç; 'open' sağ üstteki "Trafiğe aç" düğmesi. */
  tool: Tool | 'open';
  /** Adım bitti mi: iş sırası, silindir geçişleri (adımın başından beri) ve dünya. */
  done: (w: World, ck: Record<StepKey, boolean>, passes: number) => boolean;
}

/** Çukur sütunlarının ne kadarı o malzemenin ipine kadar dolmuş (0–1). */
export function filledTo(w: World, mat: Material) {
  const [h0, h1] = w.hole;
  let n = 0;
  for (let x = h0; x <= h1; x++) {
    let y = H - 1;
    while (y >= 0 && w.cells[idx(x, y)] !== EMPTY && w.cells[idx(x, y)] !== WATER) y--;
    if (y + 1 <= FILL_TO[mat] + 1) n++;
  }
  return n / (h1 - h0 + 1);
}

export const GUIDE: Lesson[] = [
  {
    text: 'Ben ustabaşı Hayri. Kenarları sabah kestik; dipte kırık asfalt parçaları kaldı. Kürek’i seç, çukurun dibinde basılı tutup gezdir.',
    tool: 'shovel',
    done: (w, ck) => ck.rubble || w.used.soil > 0,
  },
  {
    text: 'Şimdi Toprak: en ucuz alt dolgu. Oluğu çukurun üstünde gezdir. Beyaz ipe gelince oluk kendi kapanır, fazlası boşa gitmez.',
    tool: 'soil',
    done: (w) => filledTo(w, 'soil') >= 0.85,
  },
  {
    text: 'Silindir’i seç, çukurun üstünde sağa sola sürükle: dört geçiş. Sıkışmayan dolgu ilk otobüste oturur.',
    tool: 'roller',
    done: (_w, _ck, passes) => passes >= 4,
  },
  {
    text: 'Mıcır asfaltın yatağıdır. Yine ipe kadar dök, oluk kendi durur.',
    tool: 'gravel',
    done: (w) => filledTo(w, 'gravel') >= 0.85,
  },
  {
    text: 'Mıcırı da silindirle: dört geçiş daha.',
    tool: 'roller',
    done: (_w, _ck, passes) => passes >= 4,
  },
  {
    text: 'Yapıştırıcı: iki kenarı ve tabanı fırçala, parlak siyah olsun. Yoksa yama kenardan ayrılır.',
    tool: 'tack',
    done: (_w, ck) => ck.tack,
  },
  {
    text: 'Sıcak asfalt 160 °C gelir. İpin üstüne kadar dök; o biraz fazlası silindirde sıkışıp hizaya iner.',
    tool: 'asphalt',
    done: (w, ck) => ck.asphalt || filledTo(w, 'asphalt') >= 0.9,
  },
  {
    text: 'Çabuk, silindir! Sağ üstteki termometre 78 °C’nin altına inerse asfalt artık sıkışmaz.',
    tool: 'roller',
    done: (_w, ck) => ck.roll,
  },
  {
    text: 'Tamamdır. Asfalt soğuyunca sağ üstteki “Trafiğe aç”a bas; araçlar geçsin, mühendis puanını versin.',
    tool: 'open',
    done: () => false,
  },
];
