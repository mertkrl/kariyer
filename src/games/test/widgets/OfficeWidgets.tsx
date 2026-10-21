import { useState } from 'react';
import { sliderOption, type ExamQuestion, type ExamWidget } from '../data/questions';
import { audioEngine } from '../../../audio/audioEngine';
import styles from './OfficeWidgets.module.css';

/*
 * Ofis gününden iki sahne: öğle arasında yemek siparişi ve yıllık zam tablosunda kendi oranını
 * yazmak. Zam hücresi ne yazılırsa yazılsın %3'e kilitlenir; cevap yine de yazılan değerden çıkar.
 */

interface Props<T> {
  q: ExamQuestion;
  w: T;
  onAnswer: (option: number) => void;
  selected: number | null;
}

const click = () => audioEngine.playUi('click');
const tl = (n: number) => `${Math.round(n).toLocaleString('tr-TR')} ₺`;

/* ── öğle siparişi ── */

const DISHES = [
  { icon: '🥗', name: 'Akdeniz salatası', note: 'Hafif, toplantı dostu', price: 180 },
  { icon: '🌯', name: 'Tavuk dürüm', note: 'Tek elle yenir', price: 220 },
  { icon: '🍲', name: 'Günün ev yemeği', note: 'Kaşıkla yenir (klavyeye zarar)', price: 240 },
];

const LUNCH_ACTIONS = [
  { icon: '🪑', label: 'Masama getir', needsDish: true },
  { icon: '🗂️', label: 'Toplantı odasına getir', needsDish: true },
  { icon: '🚶', label: 'Dışarı çıkıyorum', needsDish: false },
  { icon: '⏭️', label: 'Yemeği atla', needsDish: false },
];

const LUNCH_STATUS = [
  'Siparişiniz alındı. Teslimat 12:41, masanıza. Klavyenizi koruyun.',
  'Teslimat 12:41, toplantı odasına. Ağzınız doluyken kameranız açık olacak.',
  'Takviminize "Uzakta" yazıldı. Yöneticiniz durumunuzu 3 kez kontrol etti.',
  'Yemek atlandı. Verimlilik puanı +5. Mideniz bu değerlendirmeye katılmıyor.',
];

export function LunchWidget({ w, onAnswer, selected }: Props<Extract<ExamWidget, { type: 'lunch' }>>) {
  const [dish, setDish] = useState<number | null>(null);
  return (
    <div className={styles.app}>
      <div className={styles.appHead}>
        <b>🍽️ Lokma</b>
        <span>Teslimat adresi: Plaza, 14. kat · Masa 42</span>
        <span className={`${styles.clock} mono`}>{w.clock}</span>
      </div>
      <p className={styles.ping}>
        <b>Yönetici:</b> Öğlen hızlıca bir şey yiyip 12:30'da toplanalım mı? 🙏
      </p>
      <div className={styles.menu}>
        {DISHES.map((d, i) => (
          <button
            key={d.name}
            className={`${styles.dish} ${dish === i ? styles.dishOn : ''}`}
            aria-pressed={dish === i}
            onClick={() => {
              click();
              setDish(i);
            }}
          >
            <span className={styles.dishIcon} aria-hidden="true">
              {d.icon}
            </span>
            <b>{d.name}</b>
            <small>{d.note}</small>
            <span className={styles.price}>{tl(d.price)}</span>
          </button>
        ))}
      </div>
      <div className={styles.actions}>
        {LUNCH_ACTIONS.map((a, i) => (
          <button
            key={a.label}
            className={`${styles.action} ${i === 2 ? styles.actionOut : ''} ${selected === i ? styles.actionOn : ''}`}
            disabled={a.needsDish && dish === null}
            onClick={() => {
              click();
              onAnswer(i);
            }}
          >
            <span aria-hidden="true">{a.icon}</span> {a.label}
          </button>
        ))}
      </div>
      {selected !== null && (
        <p className={styles.status} role="status">
          {LUNCH_STATUS[selected]}
        </p>
      )}
    </div>
  );
}

/* ── zam tablosu ── */

export function RaiseWidget({ w, onAnswer, selected }: Props<Extract<ExamWidget, { type: 'raise' }>>) {
  const [value, setValue] = useState('');
  const [locked, setLocked] = useState(selected !== null);
  // kilitlenince yazılan öneri; hücre MİN(öneri; %3) olur: az isteyen azını alır
  const [proposed, setProposed] = useState<number | null>(null);
  const typed = Number(value.replace(',', '.'));
  const valid = value.trim() !== '' && Number.isFinite(typed) && typed >= 0;
  const cap = proposed === null ? w.locked : Math.min(proposed, w.locked);
  const rate = locked ? cap : valid ? typed : 0;
  const commit = () => {
    if (!valid) return;
    click();
    setLocked(true);
    setProposed(typed);
    onAnswer(sliderOption(typed, w.thresholds));
  };
  const pct = (n: number) => `%${n.toLocaleString('tr-TR')}`;
  return (
    <div className={styles.sheet}>
      <div className={styles.sheetTop}>
        <span className={styles.file}>📊 Zam_Tablosu_2027_GIZLI.xlsx</span>
        <span className={styles.share}>Paylaşılan: İK, Genel Müdür, siz (yalnızca C2)</span>
      </div>
      <div className={styles.formula}>
        <b>fx</b> {locked ? '=MİN(C2_ÖNERİNİZ; %3)' : 'C2'}
      </div>
      <table className={styles.grid}>
        <thead>
          <tr>
            <th />
            <th>A · Çalışan</th>
            <th>B · Mevcut maaş</th>
            <th>C · Zam oranı</th>
            <th>D · Yeni maaş</th>
          </tr>
        </thead>
        <tbody>
          <tr className={styles.me}>
            <th>2</th>
            <td>Siz</td>
            <td className="mono">{tl(w.salary)}</td>
            <td className={`${styles.cell} ${locked ? (proposed !== null && proposed <= w.locked ? styles.cellOk : styles.cellLocked) : ''}`}>
              {locked ? (
                <span className="mono">🔒 {pct(cap)}</span>
              ) : (
                <span className={styles.inputWrap}>
                  %
                  <input
                    aria-label="Zam oranınız (yüzde)"
                    inputMode="decimal"
                    value={value}
                    autoFocus
                    onChange={(e) => setValue(e.target.value.replace(/[^\d.,]/g, '').slice(0, 5))}
                    onKeyDown={(e) => e.key === 'Enter' && commit()}
                    placeholder="?"
                  />
                </span>
              )}
            </td>
            <td className="mono">{tl(w.salary * (1 + rate / 100))}</td>
          </tr>
          <tr>
            <th>3</th>
            <td>Ekip ortalaması</td>
            <td className="mono">{tl(39500)}</td>
            <td className="mono">%3</td>
            <td className="mono">{tl(39500 * 1.03)}</td>
          </tr>
          <tr className={styles.boss}>
            <th>4</th>
            <td>Genel Müdür</td>
            <td className={`mono ${styles.blur}`}>{tl(640000)}</td>
            <td className="mono">%60</td>
            <td className={`mono ${styles.blur}`}>{tl(1024000)}</td>
          </tr>
        </tbody>
      </table>
      <div className={styles.sheetBar}>
        {locked ? (
          <>
            {proposed !== null && proposed < w.locked ? (
              <span className={styles.okNote} role="status">
                ✓ Biz {pct(w.locked)} düşünmüştük ama {pct(proposed)} daha iyiymiş. Fedakârlığınız sicilinize işlendi.
              </span>
            ) : proposed === w.locked ? (
              <span className={styles.okNote} role="status">
                ✓ Doğru düşündünüz. {pct(w.locked)} kurum vizyonumuzla birebir örtüşüyor.
              </span>
            ) : (
              <span className={styles.lockNote} role="status">
                ⚠ Bu hücre İK tarafından kilitlenmiştir. Değeriniz "öneri" olarak kaydedildi.
              </span>
            )}
            <button
              className={styles.ghost}
              onClick={() => {
                click();
                setValue('');
                setProposed(null);
                setLocked(false);
              }}
            >
              Yeniden öner
            </button>
          </>
        ) : (
          <>
            <span>Oranı yazıp Enter'a basın.</span>
            <button className={styles.enter} disabled={!valid} onClick={commit}>
              ↵ Enter
            </button>
          </>
        )}
      </div>
    </div>
  );
}
