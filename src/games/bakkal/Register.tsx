import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useFloating } from './drag';
import * as sfx from './sfx';
import styles from './Register.module.css';

/*
 * Tezgâhın ortasındaki, müşterinin önündeki yazar kasa: fiyat kasanın tuşlarına basılarak girilir (klavyenin rakam
 * tuşları da çalışır). Yeşil ekran girileni gösterir; "=" fiyatı müşteriye söyler. Satış olunca
 * çekmece açılır. Ayrıca tezgâhta oyuncunun kendi hesabı için bir hesap makinesi durur.
 */

const typing = (e: KeyboardEvent) => e.target instanceof HTMLElement && /^(INPUT|TEXTAREA)$/.test(e.target.tagName);

/**
 * Tezgâhın üstündeki yazar kasa: tuşlarına basılarak fiyat girilir, kırmızı ONAY tuşu fiyatı
 * müşteriye söyler. Ekran girileni (ya da son satışı) gösterir; satışta çekmece açılır. Fiyat beklenmiyorken tuşlar kilitlidir.
 */
export function CashRegister({
  value,
  onChange,
  onSubmit,
  active,
  label,
  shown,
  open,
  onDrawer,
}: {
  value: string;
  onChange: Dispatch<SetStateAction<string>>;
  onSubmit: (price: number) => void;
  active: boolean;
  label: string;
  /** Fiyat beklenmiyorken ekranda yazan son işlem: adı, tutarı, alınan para ve üstü. */
  shown: { amount: number | null; label?: string; paid?: number; change?: number };
  open: boolean;
  /** Çekmeceye tıklayınca fişler açılır. */
  onDrawer?: () => void;
}) {
  // hızlı basılan tuşlar kaybolmasın: değer her zaman en güncel hâlinden güncellenir
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  }, [value]);
  const press = (k: string) => {
    if (!active) return;
    sfx.key();
    if (k === 'C') return onChange('');
    if (k === '⌫') return onChange((v) => v.slice(0, -1));
    if (k === '=') return latest.current && onSubmit(Number(latest.current));
    onChange((v) => ((v + k).length > 5 ? v : v === '0' ? k : v + k));
  };

  // fiziksel klavye: rakamlar, silme, Enter; defter ya da başka bir alana yazılırken karışmaz
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (typing(e) || e.metaKey || e.ctrlKey) return;
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('⌫');
      else if (e.key === 'Escape') press('C');
      else if (e.key === 'Enter') {
        e.preventDefault();
        press('=');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const keys = ['7', '8', '9', 'C', '4', '5', '6', '⌫', '1', '2', '3', '00', '0'];
  const seat = useCounterSeat();
  // nakit satışta ekran büyümez: satış, alınan para ve para üstü aynı satırda sırayla döner
  const frames = !active && shown.paid !== undefined ? [{ label: shown.label ?? 'SATIŞ', amount: shown.amount }, { label: 'ALINAN', amount: shown.paid }, { label: 'ÜSTÜ', amount: shown.change ?? 0 }] : null;
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    setFrame(0);
    if (!frames) return;
    const t = window.setInterval(() => setFrame((f) => (f + 1) % 3), 1700);
    return () => window.clearInterval(t);
    // yalnızca yeni bir ödeme gelince baştan başlar
  }, [shown.paid, shown.change, shown.amount, active]);
  const now = frames ? frames[frame] : { label: active ? label : (shown.label ?? 'KASA'), amount: active ? Number(value || 0) : shown.amount };
  const money = now.amount === null ? (now.label === 'İPTAL' ? '— — —' : '0,00') : `${now.amount},00`;
  return (
    <div data-tour="register" className={`${styles.cash} ${active ? styles.live : ''}`} style={{ bottom: seat.bottom, transform: `translateX(-50%) scale(${seat.scale})` }} role="group" aria-label="Yazar kasa">
      <div className={styles.printer}>
        <span className={styles.slot} />
      </div>
      <div className={styles.tower}>
        <div className={styles.lcd} aria-live="polite">
          <span key={`${now.label}-${frame}`} className={styles.frame}>
            <small>{now.label}</small>
            <b>
              {money}
              {now.amount !== null && ' ₺'}
            </b>
          </span>
        </div>
      </div>
      <div className={styles.deck}>
        <div className={styles.keys}>
          {keys.map((k) => (
            <button key={k} type="button" disabled={!active} className={`${styles.key} ${k === 'C' ? styles.clear : ''} ${k === '0' ? styles.wide : ''}`} onClick={() => press(k)} aria-label={k === '⌫' ? 'Sil' : k === 'C' ? 'Temizle' : k}>
              {k}
            </button>
          ))}
          <button type="button" className={`${styles.key} ${styles.enter}`} onClick={() => press('=')} disabled={!active || !value} aria-label="Fiyatı onayla ve söyle">
            ONAY
          </button>
        </div>
      </div>
      <button type="button" className={`${styles.drawer} ${open ? styles.drawerOpen : ''}`} onClick={onDrawer} aria-label="Kasanın çekmecesi: fişlere bak" title="Çekmece: fişler">
        <span />
      </button>
    </div>
  );
}

/**
 * Kasanın tezgâhın üst yüzeyine oturması için tezgâh çizgisinin ekrandaki yeri. Sahne 1600×900
 * birimlik, alttan hizalı ve ekranı dolduracak kadar büyütülür (slice); tezgâhın üstü alttan 168
 * birim yukarıdadır. Kasa da sahneyle birlikte büyüyüp küçülür.
 */
function useCounterSeat() {
  const read = () => {
    const s = Math.max(window.innerWidth / 1600, window.innerHeight / 900);
    // müşterinin yüzünü örtmesin diye küçük: sahne ölçeğinin dörtte üçü kadar
    return { bottom: Math.round(168 * s) - 4, scale: Math.min(0.85, Math.max(0.48, s * 0.74)) };
  };
  const [seat, setSeat] = useState(read);
  useEffect(() => {
    const on = () => setSeat(read());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return seat;
}

interface CalcState {
  shown: string;
  acc: number | null;
  op: string | null;
  fresh: boolean;
}

const CALC0: CalcState = { shown: '0', acc: null, op: null, fresh: true };
const calc = (a: number, b: number, o: string) => (o === '+' ? a + b : o === '−' ? a - b : o === '×' ? a * b : b === 0 ? NaN : a / b);
const fmt = (n: number) => (Number.isFinite(n) ? String(Math.round(n * 100) / 100).replace('.', ',') : 'Hata');

/** Hesap makinesinin bir tuşu: önceki durumdan yenisini üretir (hızlı basışlarda kayıp olmaz). */
function calcPress(x: CalcState, k: string): CalcState {
  const cur = Number(x.shown.replace(',', '.'));
  if (k === 'AC') return CALC0;
  if (/[0-9]/.test(k)) return { ...x, shown: x.fresh || x.shown === '0' ? k : (x.shown + k).slice(0, 10), fresh: false };
  if (k === ',') return x.shown.includes(',') && !x.fresh ? x : { ...x, shown: x.fresh ? '0,' : x.shown + ',', fresh: false };
  if (k === '=') return x.op === null || x.acc === null ? x : { shown: fmt(calc(x.acc, cur, x.op)), acc: null, op: null, fresh: true };
  // işlem tuşu: bekleyen işlem varsa önce onu tamamla
  const chained = x.op && x.acc !== null && !x.fresh;
  const acc = chained ? calc(x.acc!, cur, x.op!) : x.fresh && x.acc !== null ? x.acc : cur;
  return { shown: chained ? fmt(acc) : x.shown, acc, op: k, fresh: true };
}

/** Tezgâhtaki hesap makinesi: dört işlem; oyuncunun kendi hesabı için. Üst şeridinden sürüklenir, boyu değişmez. */
export function Calculator({ onClose }: { onClose: () => void }) {
  const [st, setSt] = useState<CalcState>(CALC0);
  const { box, onMove } = useFloating('hesap', () => ({ x: Math.max(8, window.innerWidth / 2 - 420), y: 110, w: 196, h: 0 }));
  const press = (k: string) => {
    sfx.key();
    setSt((x) => calcPress(x, k));
  };
  const { shown, acc, op } = st;

  const keys = ['AC', '÷', '×', '−', '7', '8', '9', '+', '4', '5', '6', '=', '1', '2', '3', '0', ','];
  return (
    <div className={styles.calc} style={{ left: box.x, top: box.y }} role="dialog" aria-label="Hesap makinesi">
      <div className={styles.calcHead} onPointerDown={onMove} title="Tutup sürükle">
        <span>HESAP-8 · güneş pilli</span>
        <button onClick={onClose} aria-label="Hesap makinesini kapat">
          ×
        </button>
      </div>
      <div className={styles.calcLcd}>
        <small>{acc !== null && op ? `${fmt(acc)} ${op}` : ''}</small>
        <span>{shown}</span>
      </div>
      <div className={styles.calcKeys}>
        {keys.map((k) => (
          <button key={k} className={`${/[0-9,]/.test(k) ? '' : styles.op} ${k === '=' ? styles.eq : ''} ${k === 'AC' ? styles.ac : ''}`} onClick={() => press(k)}>
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}
