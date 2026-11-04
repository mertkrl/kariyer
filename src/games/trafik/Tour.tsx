import { useEffect, useLayoutEffect, useState } from 'react';
import styles from './Tour.module.css';

/*
 * Tanıtım: ilk vardiyadan önce, gerçek bir kavşakta trafik akarken adım adım tur. Her adım ekranın
 * bir parçasını halkayla gösterir (`data-tour` ile işaretli öğe) ve çoğu bir iş ister: yakınlaş,
 * haritayı sürükle, bütün haritayı aç, bir ışığa yeşil yak, yeşil süresini uzat. İş yapılınca adım
 * yeşile döner ve "İleri" açılır; istemeyen "Geç" ile atlar. Puan tutulmaz, süre işlemez.
 */

/** Oyuncunun tanıtım sırasında yaptıkları: adımların "tamam" koşulu bunlara bakar. */
export interface TourState {
  zoomed: boolean;
  panned: boolean;
  whole: boolean;
  green: boolean;
  timed: boolean;
  paused: boolean;
}

interface Step {
  title: string;
  text: string;
  /** Halkayla gösterilen öğenin `data-tour` adı; yoksa kart ortada durur. */
  target?: string;
  /** Oyuncudan istenen iş ve yapıldı mı. */
  task?: string;
  done?: (s: TourState) => boolean;
}

const STEPS: Step[] = [
  {
    title: 'Hoş geldin amirim',
    text: 'Trafik Kontrol Merkezi’ndesin. Ekrandaki gerçek bir İstanbul kavşağı; araçlar kendi kafalarına göre gelir, ışıkları sen yönetirsin. Bu turda trafik akar ama puan tutulmaz, süre işlemez.',
  },
  {
    title: 'Yakınlaş',
    text: 'Fare tekerleğini çevir, telefonda iki parmakla aç ya da sağ üstteki + düğmesine bas. Sürücüleri, sinyal veren arabaları, yayaları yakından gör.',
    target: 'zoom',
    task: 'Biraz yakınlaş.',
    done: (s) => s.zoomed,
  },
  {
    title: 'Haritayı sürükle',
    text: 'Haritayı tutup sürükle. Yollar uzun: kuyruk kavşaktan yüzlerce metre geriye uzayabilir, ara sokakların ağzını tıkayabilir.',
    task: 'Haritayı bir yöne kaydır.',
    done: (s) => s.panned,
  },
  {
    title: 'Bütün harita',
    text: '⤢ düğmesi bütün mahalleyi açar: ana yollar, ışıksız ara sokaklar, parklar. Bir daha basınca kavşağa döner.',
    target: 'zoom',
    task: '⤢ ile bütün haritayı aç.',
    done: (s) => s.whole,
  },
  {
    title: 'Kuyruk etiketleri',
    text: 'Her yolun kavşağa yakın ucunda bir etiket durur: kaç araç bekliyor ve en uzun bekleyen kaç saniyedir orada. Yeşil nokta rahat, sarı sıkışık, kırmızı “korna çalıyorlar” demek.',
  },
  {
    title: 'Işıksız ara sokaklar',
    text: 'Ana yollara dik ara sokaklar bağlanır. Sokaktan çıkan sürücü ağızda durup bakar, boşluk bulunca katılır; kavşaktan çıkanların bir kısmı da sokaklara sapar. Kuyruk sokağın ağzına dayanırsa oradakiler de bekler ve onların beklemesi de puanından düşer.',
  },
  {
    title: 'Işık kartları',
    text: 'Aşağıdaki her kart, birlikte yeşil yanan yolların ışığıdır. Üstünde yolların adı ve ışığın şimdi ne yaptığı yazar: “Yeşil · 8 sn”, “Yeşile 20 sn”.',
    target: 'cards',
  },
  {
    title: 'Yeşil yak',
    text: 'Kırmızıda bekleyen bir kartın yeşil lambasına bas. Yanan yeşil önce sarıya, sonra kırmızıya döner; birkaç saniye sonra yeşil senin seçtiğin yollara geçer.',
    target: 'cards',
    task: 'Kırmızıdaki ışığa yeşil yak.',
    done: (s) => s.green,
  },
  {
    title: 'Süreleri ayarla',
    text: 'Kartın altındaki “Yeşil” satırı o ışığın her turda kaç saniye yeşil yanacağıdır. Kalabalık yola uzun, boş yola kısa yeşil ver. Sarı ve “Hepsi kırmızı” güvenlik içindir: kısalırsa kaza olur.',
    target: 'cards',
    task: 'Bir ışığın yeşil süresini + ya da − ile değiştir.',
    done: (s) => s.timed,
  },
  {
    title: 'Süre ve hız',
    text: 'Vardiyanın kalan süresi burada. ❚❚ oyunu durdurur (boşluk tuşu da), 2× zamanı hızlandırır. Durdurup düşünmek serbest.',
    target: 'clock',
    task: 'Oyunu bir kez durdur.',
    done: (s) => s.paused,
  },
  {
    title: 'Takılırsan',
    text: '? düğmesi cep kartını açar: paneldeki her şeyin bir cümlelik anlatımı. Kart açıkken oyun durur.',
    target: 'help',
  },
  {
    title: 'Hazırsın',
    text: 'Amaç: sürücülerin sabrı tükenmeden herkesi geçirmek. Vardiya bitince tutanakta puanın, yıldızların ve bir dahaki sefere neyi değiştirmen gerektiği yazar. İlk kavşak Bahariye; kolay gelsin amirim.',
  },
];

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function Tour({ state, onDone }: { state: TourState; onDone: () => void }) {
  const [i, setI] = useState(0);
  const [found, setBox] = useState<Box | null>(null);
  const step = STEPS[i];
  // hedefi olmayan adımda halka yok; yoklama yalnızca hedefi olan adımda çalışır
  const box = step.target ? found : null;
  const ok = !step.done || step.done(state);
  const last = i === STEPS.length - 1;

  // halka hedefi izler: panel açılıp kapanınca, pencere boyu değişince yer değişebilir
  useLayoutEffect(() => {
    if (!step.target) return;
    const find = () => {
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      const r = el?.getBoundingClientRect();
      setBox((b) => (!r ? null : b && b.x === r.left && b.y === r.top && b.w === r.width && b.h === r.height ? b : { x: r.left, y: r.top, w: r.width, h: r.height }));
    };
    find();
    // canlandırma değil, yer yoklaması: saniyede beş kez yeter
    const id = window.setInterval(find, 200);
    return () => window.clearInterval(id);
  }, [step.target]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDone();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDone]);

  const next = () => (last ? onDone() : setI(i + 1));
  // kart halkanın üstüne binmesin: hedef ekranın altındaysa kart üstte, üstündeyse altta
  const place = !box ? styles.middle : box.y + box.h / 2 > window.innerHeight / 2 ? styles.above : styles.below;
  const pos = box ? (box.y + box.h / 2 > window.innerHeight / 2 ? { bottom: window.innerHeight - box.y + 14 } : { top: box.y + box.h + 14 }) : undefined;

  return (
    <>
      {box && <div className={`${styles.ring} ${ok && step.task ? styles.ringOk : ''}`} style={{ left: box.x - 6, top: box.y - 6, width: box.w + 12, height: box.h + 12 }} aria-hidden="true" />}
      <aside className={`${styles.card} ${place}`} style={pos} role="dialog" aria-labelledby="trafik-tur" aria-live="polite">
        <header>
          <span>TANITIM · {i + 1} / {STEPS.length}</span>
          <button type="button" className={styles.skip} onClick={onDone}>
            Tanıtımı bitir
          </button>
        </header>
        <h3 id="trafik-tur">{step.title}</h3>
        <p>{step.text}</p>
        {step.task && (
          <p className={`${styles.task} ${ok ? styles.taskOk : ''}`}>
            <i aria-hidden="true">{ok ? '✓' : '→'}</i> {ok ? 'Tamam!' : step.task}
          </p>
        )}
        <div className={styles.row}>
          <div className={styles.dots} aria-hidden="true">
            {STEPS.map((_, k) => (
              <i key={k} className={k < i ? styles.dotDone : k === i ? styles.dotOn : undefined} />
            ))}
          </div>
          {i > 0 && (
            <button type="button" className={styles.back} onClick={() => setI(i - 1)}>
              Geri
            </button>
          )}
          {!ok && (
            <button type="button" className={styles.back} onClick={next}>
              Geç
            </button>
          )}
          <button type="button" className={styles.next} onClick={next} disabled={!ok} autoFocus>
            {last ? 'Vardiyaya başla' : 'İleri'}
          </button>
        </div>
      </aside>
    </>
  );
}
