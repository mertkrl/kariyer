import { useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import * as sfx from './sfx';
import styles from './Register.module.css';

/*
 * Tezgâhın önündeki yazar kasa: fiyat kasanın tuşlarına basılarak girilir (klavyenin rakam
 * tuşları da çalışır). Yeşil ekran girileni gösterir; "=" fiyatı müşteriye söyler. Satış olunca
 * kasadan fiş çıkar. Ayrıca tezgâhta oyuncunun kendi hesabı için bir hesap makinesi durur.
 */

const typing = (e: KeyboardEvent) => e.target instanceof HTMLElement && /^(INPUT|TEXTAREA)$/.test(e.target.tagName);

/**
 * Tezgâhın üstündeki yazar kasa: tuşlarına basılarak fiyat girilir, kırmızı ONAY tuşu fiyatı
 * müşteriye söyler. Ekran girileni (ya da son satışı) gösterir; satışta çekmece açılır ve fiş
 * kasanın tepesindeki ağızdan yukarı doğru çıkar. Fiyat beklenmiyorken tuşlar kilitlidir.
 */
export function CashRegister({
  value,
  onChange,
  onSubmit,
  active,
  label,
  shown,
  open,
  receipt,
}: {
  value: string;
  onChange: Dispatch<SetStateAction<string>>;
  onSubmit: (price: number) => void;
  active: boolean;
  label: string;
  /** Fiyat beklenmiyorken ekranda yazan tutar. */
  shown: number | null;
  open: boolean;
  receipt?: ReactNode;
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
  const screen = active ? `${value || '0'},00` : shown === null ? '0,00' : `${shown},00`;
  return (
    <div className={`${styles.cash} ${active ? styles.live : ''}`} role="group" aria-label="Yazar kasa">
      <div className={styles.printer}>
        <span className={styles.slot} />
        {receipt}
      </div>
      <div className={styles.tower}>
        <div className={styles.lcd} aria-live="polite">
          <small>{active ? label : 'KASA'}</small>
          <span>{screen} ₺</span>
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
      <div className={`${styles.drawer} ${open ? styles.drawerOpen : ''}`}>
        <span />
      </div>
    </div>
  );
}

/** Kasadan çıkan fiş: yazıcı sesiyle aşağı doğru uzar. */
export function Receipt({ items, total, day, time, no, credit }: { items: string[]; total: number; day: number; time: string; no: number; credit?: boolean }) {
  useEffect(() => {
    sfx.receipt();
  }, []);
  return (
    <div className={styles.receipt} aria-label="Fiş">
      <div className={styles.paper}>
        <b>HACI EMMİ BAKKALİYE</b>
        <small>Yukarıkavaklı · Fiş no {String(no).padStart(4, '0')}</small>
        <small>
          {day}. gün · {time}
        </small>
        <hr />
        {items.map((i) => (
          <p key={i}>{i}</p>
        ))}
        <hr />
        <p className={styles.total}>
          <span>TOPLAM</span>
          <span>{total},00 ₺</span>
        </p>
        <small>{credit ? 'VERESİYE · deftere yazıldı' : 'NAKİT'}</small>
        <small>Yine bekleriz</small>
      </div>
    </div>
  );
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

/** Tezgâhtaki hesap makinesi: dört işlem; oyuncunun kendi hesabı için. */
export function Calculator({ onClose }: { onClose: () => void }) {
  const [st, setSt] = useState<CalcState>(CALC0);
  const press = (k: string) => {
    sfx.key();
    setSt((x) => calcPress(x, k));
  };
  const { shown, acc, op } = st;

  const keys = ['AC', '÷', '×', '−', '7', '8', '9', '+', '4', '5', '6', '=', '1', '2', '3', '0', ','];
  return (
    <div className={styles.calc} role="dialog" aria-label="Hesap makinesi">
      <div className={styles.calcHead}>
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
