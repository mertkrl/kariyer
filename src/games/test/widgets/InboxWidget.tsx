import { useEffect, useMemo, useState } from 'react';
import type { ExamQuestion, ExamWidget } from '../data/questions';
import * as sfx from '../sfx';
import { prefersReducedMotion } from '../../../shared/motion';
import styles from './InboxWidget.module.css';

/*
 * Gelen kutusu: bir bilgisayar ekranında posta uygulaması. E-postalar birer birer düşer (yenisi en
 * üstte, köşede bildirim çıkar); araya şık olmayan bildirimler karışır. Şık olan bir e-postaya
 * tıklamak cevaptır; seçim sonradan değiştirilebilir.
 */
type InboxRow = { kind: 'option'; i: number } | { kind: 'noise'; i: number };

export function InboxWidget({ q, w, onAnswer, selected }: { q: ExamQuestion; onAnswer: (option: number) => void; w: Extract<ExamWidget, { type: 'inbox' }>; selected: number | null }) {
  // gürültü ile şıklar dönüşümlü: bildirim, e-posta, bildirim, e-posta…
  const rows = useMemo(() => {
    const out: InboxRow[] = [];
    const n = Math.max(q.options.length, w.noise.length);
    for (let i = 0; i < n; i++) {
      if (i < w.noise.length) out.push({ kind: 'noise', i });
      if (i < q.options.length) out.push({ kind: 'option', i });
    }
    return out;
  }, [q.options.length, w.noise.length]);
  // daha önce cevaplandıysa ya da hareket azaltılmışsa hepsi baştan ekranda
  const [shown, setShown] = useState(() => (selected !== null || prefersReducedMotion() ? rows.length : 1));
  useEffect(() => {
    if (shown >= rows.length) return;
    const id = window.setTimeout(() => {
      setShown((n) => n + 1);
      sfx.click();
    }, w.everyMs);
    return () => window.clearTimeout(id);
  }, [shown, rows.length, w.everyMs]);
  // açılan bildirimler: okunmuş sayılır, son açılanın yanında "acil değil" yazar
  const [peek, setPeekRaw] = useState<number | null>(null);
  const [read, setRead] = useState<ReadonlySet<number>>(new Set());
  const setPeek = (i: number) => {
    setPeekRaw(i);
    setRead((x) => new Set(x).add(i));
  };
  const visible = rows.slice(0, shown).reverse();
  const latest = rows[shown - 1];
  const minute = (k: number) => `09:${String(12 + k).padStart(2, '0')}`;
  const unread = Math.max(0, shown - (selected !== null ? 1 : 0) - read.size);
  return (
    <div className={styles.pc}>
      <div className={styles.pcScreen}>
        <div className={styles.pcBar}>
          <span className={styles.pcDots} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <b>Posta</b>
          <span className={styles.pcUnread}>Gelen Kutusu · {unread} okunmamış</span>
        </div>
        <ul className={styles.pcList} aria-label="Gelen kutusu" aria-live="polite">
          {visible.map((r) => {
            const k = rows.indexOf(r);
            if (r.kind === 'noise') {
              const m = w.noise[r.i];
              return (
                <li key={`n${r.i}`}>
                  {/* bildirimler de açılır ama cevap sayılmaz: açınca acil olmadığı görülür */}
                  <button
                    className={`${styles.pcMail} ${styles.pcPick}`}
                    onClick={() => {
                      sfx.click();
                      setPeek(r.i);
                    }}
                  >
                    <span className={styles.pcFrom}>
                      {!read.has(r.i) && peek !== r.i && <i className={styles.pcDot} aria-hidden="true" />}
                      {m.from}
                    </span>
                    <span className={styles.pcSubject}>{m.subject}</span>
                    <span className={`${styles.pcAt} mono`}>{peek === r.i ? 'Acil değil' : minute(k)}</span>
                  </button>
                </li>
              );
            }
            const text = q.options[r.i];
            const on = selected === r.i;
            return (
              <li key={`o${r.i}`}>
                <button
                  className={`${styles.pcMail} ${styles.pcPick} ${on ? styles.pcOn : ''}`}
                  aria-pressed={on}
                  onClick={() => {
                    sfx.select(r.i);
                    onAnswer(r.i);
                  }}
                >
                  <span className={styles.pcFrom}>
                    {!on && <i className={styles.pcDot} aria-hidden="true" />}
                    {w.from[text] ?? 'Bilinmeyen gönderici'}
                  </span>
                  <span className={styles.pcSubject}>{text}</span>
                  <span className={`${styles.pcAt} mono`}>{on ? '✓ Açıldı' : minute(k)}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {latest && shown < rows.length + 1 && selected === null && (
          <div key={shown} className={styles.pcToast} aria-hidden="true">
            <b>Yeni ileti</b>
            <span>{latest.kind === 'noise' ? w.noise[latest.i].subject : q.options[latest.i]}</span>
          </div>
        )}
      </div>
      <div className={styles.pcStand} aria-hidden="true" />
    </div>
  );
}
