import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import styles from './Tour.module.css';

/*
 * İlk günün tanıtımı: Şükrü Amca'nın ağzından, adım adım. Ekran kararır, anlatılan nesne
 * (data-tour işaretli öğe) bir spot ışığında aydınlık kalır, çevresinde altın bir halka atar; kart
 * nesnenin yanına oturur, oku ona döner. Bazı adımlar oyuncunun bir şey yapmasını bekler (defteri
 * açmak, levhayı çevirmek, ilk fiyatı söylemek): o adımda "İleri" yoktur, nesnenin kendisine
 * tıklanır. Hedef hareket ederse (müşteri yürüyerek gelir, defter sürüklenir) spot onu izler.
 */

export type TourWait = 'book' | 'sign' | 'sale';

export interface TourStep {
  /** data-tour değeri (virgülle birden çok: spot hepsini kapsar); yoksa kart ekranın ortasında durur. */
  target?: string;
  title: string;
  body: string;
  /** Oyuncunun yapması beklenen: o adımda "İleri" yerine bu iş adımı geçirir. */
  wait?: TourWait;
  /** Bekleme adımında kartın altındaki küçük ipucu. */
  hint?: string;
}

export const TOUR: TourStep[] = [
  {
    title: 'Hoş geldin evladım',
    body: 'Ben bir aylığına memlekete gidiyorum, dükkân sana emanet. Burada etiket yok: fiyatı sen söylersin. Gitmeden sana birkaç şey göstereyim.',
  },
  {
    target: 'shelves',
    title: 'Raflar',
    body: 'Her malın rafta sabit bir yeri var. Etiketin yanındaki sayı raftaki adettir; azalan turuncuya döner, biten "TÜKENDİ" olur. Akşam siparişi rafa bakarak verirsin.',
  },
  {
    target: 'ledger',
    title: 'Defterim',
    body: 'Veresiyeler, eski hesaplar ve en önemlisi geçen yılki etiket fiyatlarım bu defterde. Hadi aç bakalım.',
    wait: 'book',
    hint: 'Tezgâhtaki yeşil ciltli deftere tıkla.',
  },
  {
    target: 'book',
    title: 'Geçen yılın fiyatları',
    body: 'Fiyat söylerken pusulan bu sayfa; fiyatlar o günden beri biraz arttı, aklında olsun. Ekmeğin, yağın fiyatını köylü bilir, temel gıdada fazlasına razı olmaz. Cipste, kolonyada biraz kâr koyabilirsin.',
  },
  {
    target: 'register',
    title: 'Yazar kasa',
    body: 'Müşteri bir şey isteyince fiyatı buraya yazıp ONAY\'a basarsın; klavyenin rakamları da çalışır. Çekmeceye tıklarsan her akşamın Z raporu çıkar: iade getiren olursa oradan bakarsın.',
  },
  {
    target: 'calc',
    title: 'Hesap makinesi',
    body: 'Üç kalem birden isteyen olur, kafadan toplama. Tıkla, açılsın.',
  },
  {
    target: 'stats',
    title: 'Dükkânın durumu',
    body: 'Kasa, itibar ve veresiye burada. Üstüne gelince ne anlama geldiği yazar. Kira her hafta kasadan çıkar: bütün parayı mala yatırma, kira günü kasa eksiye düşerse dükkân batar.',
  },
  {
    target: 'sign',
    title: 'Dükkânı aç',
    body: 'Kapıdaki levhada içeriden AÇIK yazıyor: demek ki dışarıdan dükkân kapalı görünüyor. Levhayı çevir ki dışarıda AÇIK yazsın.',
    wait: 'sign',
    hint: 'Kapıdaki levhaya tıkla.',
  },
  {
    target: 'bubble,register',
    title: 'İlk müşterin',
    body: 'Ne istediğini söyledi. Defterdeki fiyata bak, kasaya bir fiyat yaz, ONAY\'a bas. Yüzüne bak: sevinir mi, söylenir mi, çekip gider mi?',
    wait: 'sale',
    hint: 'Fiyatı kasaya yaz, ONAY\'a bas.',
  },
];

type Box = { x: number; y: number; w: number; h: number };
const PAD = 10;
const CARD_W = 340;
const GAP = 16;

/** Hedefin (ya da hedeflerin birleşiminin) ekrandaki yeri; hiçbiri görünmüyorsa null. */
function boxOf(target?: string): Box | null {
  if (!target) return null;
  const rects = target
    .split(',')
    .map((id) => document.querySelector(`[data-tour="${id}"]`)?.getBoundingClientRect())
    .filter((r): r is DOMRect => !!r && r.width > 0 && r.height > 0);
  if (!rects.length) return null;
  const x0 = Math.min(...rects.map((r) => r.left));
  const y0 = Math.min(...rects.map((r) => r.top));
  const x1 = Math.max(...rects.map((r) => r.right));
  const y1 = Math.max(...rects.map((r) => r.bottom));
  return { x: x0 - PAD, y: y0 - PAD, w: x1 - x0 + PAD * 2, h: y1 - y0 + PAD * 2 };
}

/** Kartın yeri: hedefin altına sığarsa altına, yoksa üstüne, o da olmazsa yanına; ekrana kıstırılır. */
function place(box: Box | null, cardH: number) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.min(CARD_W, vw - 24);
  if (!box) return { left: (vw - w) / 2, top: Math.max(80, (vh - cardH) / 2), w, side: 'none' as const, arrow: 0 };
  const cx = box.x + box.w / 2;
  const left = Math.max(12, Math.min(vw - w - 12, cx - w / 2));
  const arrow = Math.max(18, Math.min(w - 18, cx - left));
  if (box.y + box.h + GAP + cardH < vh - 8) return { left, top: box.y + box.h + GAP, w, side: 'top' as const, arrow };
  if (box.y - GAP - cardH > 8) return { left, top: box.y - GAP - cardH, w, side: 'bottom' as const, arrow };
  // ne altına ne üstüne sığıyor: hedefin soluna ya da sağına
  const right = vw - (box.x + box.w) >= box.x;
  const top = Math.max(12, Math.min(vh - cardH - 12, box.y + box.h / 2 - cardH / 2));
  return { left: right ? box.x + box.w + GAP : Math.max(12, box.x - GAP - w), top, w, side: right ? ('left' as const) : ('right' as const), arrow: Math.max(18, Math.min(cardH - 18, box.y + box.h / 2 - top)) };
}

export function TourOverlay({ at, onNext, onBack, onSkip }: { at: number; onNext: () => void; onBack: () => void; onSkip: () => void }) {
  const step = TOUR[at];
  const card = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [cardH, setCardH] = useState(200);

  // hedef hareket edebilir: birkaç yüz milisaniyede bir yeniden ölçülür
  useLayoutEffect(() => {
    const measure = () => {
      setBox((prev) => {
        const next = boxOf(step.target);
        if (prev && next && Math.abs(prev.x - next.x) + Math.abs(prev.y - next.y) + Math.abs(prev.w - next.w) + Math.abs(prev.h - next.h) < 1) return prev;
        return next;
      });
      if (card.current) setCardH(card.current.offsetHeight);
    };
    measure();
    const t = window.setInterval(measure, 250);
    window.addEventListener('resize', measure);
    return () => {
      window.clearInterval(t);
      window.removeEventListener('resize', measure);
    };
  }, [step.target, at]);

  // klavye: sağ ok ileri, sol ok geri (bekleme adımlarında ileri yok)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'ArrowRight' && !step.wait) onNext();
      else if (e.key === 'ArrowLeft' && at > 0) onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [at, step.wait, onNext, onBack]);

  const p = place(box, cardH);
  return (
    <div className={styles.layer} aria-live="polite">
      {box ? (
        <div className={styles.spot} style={{ left: box.x, top: box.y, width: box.w, height: box.h }} />
      ) : (
        <div className={styles.dim} />
      )}
      <div
        ref={card}
        key={at}
        className={`${styles.card} ${styles[p.side]}`}
        style={{ left: p.left, top: p.top, width: p.w, ['--arrow' as string]: `${p.arrow}px` }}
        role="dialog"
        aria-label={`Tanıtım ${at + 1}/${TOUR.length}: ${step.title}`}
      >
        <div className={styles.head}>
          <span className={styles.avatar} aria-hidden="true">
            👴
          </span>
          <span>
            <small>Şükrü Amca'nın notu · {at + 1}/{TOUR.length}</small>
            <b>{step.title}</b>
          </span>
        </div>
        <p>{step.body}</p>
        {step.wait && step.hint && (
          <p className={styles.hint}>
            <span aria-hidden="true">👉</span> {step.hint}
          </p>
        )}
        <div className={styles.foot}>
          <div className={styles.dots} aria-hidden="true">
            {TOUR.map((_, i) => (
              <i key={i} className={i === at ? styles.dotOn : i < at ? styles.dotDone : undefined} />
            ))}
          </div>
          <div className={styles.actions}>
            {at > 0 && !step.wait && (
              <button type="button" className={styles.back} onClick={onBack}>
                Geri
              </button>
            )}
            {!step.wait && (
              <button type="button" className={styles.next} onClick={onNext} autoFocus>
                {at === 0 ? 'Başlayalım' : 'İleri'}
              </button>
            )}
          </div>
        </div>
        <button type="button" className={styles.skip} onClick={onSkip}>
          Tanıtımı atla
        </button>
      </div>
    </div>
  );
}
