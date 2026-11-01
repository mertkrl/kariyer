import { useState } from 'react';
import { ccOption, overtimeOption, sliderOption, type ExamQuestion, type ExamWidget } from '../data/questions';
import * as sfx from '../sfx';
import styles from './HrWidgets.module.css';

/*
 * İK işleri: bayram köprüsüne izin planlamak, hatırlatma e-postasında CC'ye kimi ekleyeceğine karar
 * vermek ve ay sonu fazla mesai formunu doldurmak. Her biri sonunda bir şık sırası verir.
 */

interface Props<T> {
  q: ExamQuestion;
  w: T;
  onAnswer: (option: number) => void;
  selected: number | null;
}

/** İzin sayısına göre yöneticinin takvimin altına düştüğü not. */
const LEAVE_NOTES = ['Bayramda da ulaşılabilir olmanız çok kıymetli', 'Bir gün sorun olmaz, yine de telefonunuz açık olsun.', 'Proje teslimi var ama… peki.', 'Bütün hafta mı? Bayram dönüşü konuşalım.'];

/* ── yıllık izin ── */

export function LeaveWidget({ w, onAnswer }: Props<Extract<ExamWidget, { type: 'leave' }>>) {
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [sent, setSent] = useState(false);
  const opt = sliderOption(picked.size, w.thresholds);
  const toggle = (i: number) => {
    sfx.select(i);
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  };
  return (
    <div className={styles.leave}>
      <header className={styles.appBar}>
        <b>📅 İzin Talep Sistemi</b>
        <span>Kalan hak: 14 gün</span>
      </header>
      <ol className={styles.days}>
        {w.days.map((d, i) => (
          <li key={i}>
            <button
              type="button"
              className={`${styles.day} ${d.holiday ? styles.holiday : ''} ${picked.has(i) ? styles.picked : ''}`}
              disabled={sent || !!d.holiday}
              aria-pressed={picked.has(i)}
              onClick={() => toggle(i)}
            >
              <b>{d.label}</b>
              <small>{d.holiday ?? (picked.has(i) ? 'İzinli' : 'İş günü')}</small>
            </button>
          </li>
        ))}
      </ol>
      <p className={styles.note}>
        <b>Yöneticiniz:</b> {LEAVE_NOTES[opt]}
      </p>
      {sent ? (
        <p className={styles.ok}>Talebiniz İK'ya iletildi. Onay süreci 3–5 iş günüdür.</p>
      ) : (
        <button
          type="button"
          className={styles.primary}
          onClick={() => {
            sfx.confirm();
            setSent(true);
            onAnswer(opt);
          }}
        >
          {picked.size ? `${picked.size} gün izin talep et` : 'İzin almadan devam et'}
        </button>
      )}
    </div>
  );
}

/* ── e-posta CC ── */

export function CcWidget({ w, onAnswer }: Props<Extract<ExamWidget, { type: 'cc' }>>) {
  const [cc, setCc] = useState<Set<number>>(new Set());
  const [sent, setSent] = useState(false);
  const toggle = (i: number) => {
    sfx.click();
    setCc((p) => {
      const n = new Set(p);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  };
  return (
    <div className={styles.mail}>
      <header className={styles.appBar}>
        <b>✉️ Yeni ileti</b>
        <span>Outlook</span>
      </header>
      <div className={styles.field}>
        <span>Kime:</span>
        <span className={styles.chip}>{w.to}</span>
      </div>
      <div className={styles.field}>
        <span>CC:</span>
        {cc.size === 0 && <em>Aşağıdan ekleyin</em>}
        {[...cc]
          .sort((a, b) => a - b)
          .map((i) => (
            <button key={i} type="button" className={`${styles.chip} ${styles.chipOn}`} disabled={sent} onClick={() => toggle(i)} aria-label={`${w.people[i]}: CC'den çıkar`}>
              {w.people[i]} ✕
            </button>
          ))}
      </div>
      <div className={styles.field}>
        <span>Konu:</span>
        <b>{w.subject}</b>
      </div>
      <p className={styles.body}>{w.body}</p>
      <div className={styles.suggest} aria-label="CC'ye eklenebilecekler">
        {w.people.map((p, i) =>
          cc.has(i) ? null : (
            <button key={p} type="button" className={styles.chip} disabled={sent} onClick={() => toggle(i)}>
              + {p}
            </button>
          ),
        )}
      </div>
      {cc.has(1) && !sent && <p className={styles.warn}>⚠️ Bu ileti 1.200 kişiye gidecek.</p>}
      {sent ? (
        <p className={styles.ok}>İleti gönderildi. {cc.size ? `CC: ${cc.size} kişi.` : 'Sadece Serkan Bey\'e.'}</p>
      ) : (
        <button
          type="button"
          className={styles.primary}
          onClick={() => {
            sfx.confirm();
            setSent(true);
            onAnswer(ccOption(cc, w.people.length));
          }}
        >
          Gönder
        </button>
      )}
    </div>
  );
}

/* ── fazla mesai formu ── */

export function OvertimeWidget({ w, onAnswer }: Props<Extract<ExamWidget, { type: 'overtime' }>>) {
  const [hours, setHours] = useState(0);
  const [pay, setPay] = useState(false);
  const [sent, setSent] = useState(false);
  const send = (skipped: boolean) => {
    sfx.confirm();
    setSent(true);
    onAnswer(overtimeOption(hours, pay, skipped));
  };
  return (
    <div className={styles.form}>
      <header className={styles.appBar}>
        <b>🕒 Puantaj · {w.month}</b>
        <span>Form No: PRS-114</span>
      </header>
      <label className={styles.row}>
        <span>Fazla mesai (saat)</span>
        <span className={styles.stepper}>
          <button type="button" disabled={sent || hours === 0} onClick={() => (sfx.click(), setHours((h) => h - 1))} aria-label="Azalt">
            −
          </button>
          <b className="mono">{hours}</b>
          <button type="button" disabled={sent || hours >= 40} onClick={() => (sfx.click(), setHours((h) => h + 1))} aria-label="Artır">
            +
          </button>
        </span>
      </label>
      <label className={styles.row}>
        <span>Ücret talep ediyorum</span>
        <input type="checkbox" checked={pay} disabled={sent || hours === 0} onChange={(e) => setPay(e.target.checked)} />
      </label>
      {pay && hours > 0 && !sent && <p className={styles.warn}>ℹ️ Ücretli talepler "bağlılık" skorunuza yansıtılır.</p>}
      {!pay && hours > 0 && !sent && <p className={styles.note}>"Gönüllü fazla mesai" olarak kaydedilecek. Teşekkür ederiz</p>}
      {sent ? (
        <p className={styles.ok}>Form iletildi.</p>
      ) : (
        <div className={styles.actions}>
          <button type="button" className={styles.ghost} onClick={() => send(true)}>
            Boş bırak
          </button>
          <button type="button" className={styles.primary} onClick={() => send(false)}>
            Formu gönder
          </button>
        </div>
      )}
    </div>
  );
}
