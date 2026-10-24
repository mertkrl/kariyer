import { useEffect, useRef, useState } from 'react';
import { dateText } from './live';
import { PRESETS, type Design } from './model';
import { TASKS, unlocked, type Progress, type Report, type Task } from './spec';
import styles from './Dossier.module.css';

/*
 * Zor modun ekranları: kurulun önündeki dosyalar (ekran başına üç dosya, sırayla açılır),
 * editörün üstündeki canlı şartname şeridi ve "Kurula sun" denince açılan değerlendirme raporu.
 * Rapor resmî bir yazı gibi durur: maddeler, puanlar, kurul görüşü ve sonda inen mühür.
 */

const VERDICT = { kabul: 'Kabul', sartli: 'Şartlı kabul', ret: 'Ret' } as const;

function Stars({ n, of = 3 }: { n: number; of?: number }) {
  return (
    <span className={styles.stars} aria-label={`${n} yıldız`}>
      {Array.from({ length: of }, (_, i) => (
        <i key={i} className={i < n ? styles.on : undefined}>
          ★
        </i>
      ))}
    </span>
  );
}

export function HardPick({ progress, onPick }: { progress: Progress; onPick: (t: Task) => void }) {
  const total = Object.values(progress).reduce((s, n) => s + n, 0);
  return (
    <main className={styles.hard}>
      <header className={styles.head}>
        <p className={styles.stamp}>
          Zor mod <span>İhale şartnamesi</span>
        </p>
        <h2>Kurulun önündeki dosyalar</h2>
        <p className={styles.pitch}>Her kurumun bir isteği var, bazıları birbirine ters. Şartnameyi karşıla, ekranı okunur tut, kurula sun. Bir dosyayı geçince sıradaki açılır.</p>
        <p className={styles.tally}>
          <Stars n={1} of={1} /> {total} / {TASKS.length * 3}
        </p>
      </header>
      <div className={styles.columns}>
        {PRESETS.map((p) => (
          <section key={p.id} className={styles.column} aria-label={p.title}>
            <h3>{p.title}</h3>
            {TASKS.filter((t) => t.preset === p.id).map((t) => {
              const open = unlocked(t, progress);
              const stars = progress[t.id] ?? 0;
              return (
                <button key={t.id} type="button" className={`${styles.dossier} ${open ? '' : styles.locked} ${stars ? styles.done : ''}`} disabled={!open} onClick={() => onPick(t)}>
                  <span className={styles.no}>{t.no}</span>
                  <b>{t.title}</b>
                  <span className={styles.from}>{t.from}</span>
                  <span className={styles.brief}>{open ? t.brief : 'Önceki dosya kurulu geçince açılır.'}</span>
                  <span className={styles.foot}>
                    {open ? <Stars n={stars} /> : <span className={styles.lock}>🔒 Mühürlü</span>}
                    <span>{t.rules.length} madde</span>
                  </span>
                </button>
              );
            })}
          </section>
        ))}
      </div>
    </main>
  );
}

/** Editörün üstünde: dosyanın maddeleri, tasarım değiştikçe ✓ ya da ✗. */
export function Checklist({ task, design, onSubmit }: { task: Task; design: Design; onSubmit: () => void }) {
  const [brief, setBrief] = useState(false);
  const passed = task.rules.map((r) => r.ok(design));
  const done = passed.filter(Boolean).length;
  return (
    <section className={styles.checklist} aria-label="Şartname">
      <div className={styles.checkHead}>
        <span className={styles.no}>{task.no}</span>
        <b>{task.title}</b>
        <button type="button" className={styles.linkish} aria-expanded={brief} onClick={() => setBrief((x) => !x)}>
          {brief ? 'Yazıyı gizle' : 'Kurumun yazısı'}
        </button>
        <span className={styles.grow} />
        <span className={styles.count}>
          {done}/{passed.length} madde
        </span>
        <button type="button" className={styles.submit} onClick={onSubmit}>
          Kurula sun
        </button>
      </div>
      {brief && (
        <p className={styles.letter}>
          <i>{task.from}:</i> “{task.brief}”
        </p>
      )}
      <ul>
        {task.rules.map((r, i) => (
          <li key={i} className={passed[i] ? styles.pass : styles.fail}>
            <span aria-hidden="true">{passed[i] ? '✓' : '✕'}</span>
            {r.text}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ReportCard({ task, report: rep, onClose, onNext, onFiles }: { task: Task; report: Report; onClose: () => void; onNext?: () => void; onFiles: () => void }) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label="Kurul raporu">
      <article className={styles.report}>
        <header className={styles.letterhead}>
          <span>Ekran Yenileme Kurulu</span>
          <b>Değerlendirme Raporu</b>
          <span>
            Sayı: {task.no} · {dateText(new Date())}
          </span>
        </header>
        <p className={styles.subject}>
          <b>Konu:</b> {task.title} ({task.from} talebi)
        </p>

        <table className={styles.items}>
          <tbody>
            {task.rules.map((r, i) => (
              <tr key={i}>
                <td>{i + 1}.</td>
                <td>{r.text}</td>
                <td className={rep.passed[i] ? styles.pass : styles.fail}>{rep.passed[i] ? 'Uygun' : 'Uygun değil'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className={styles.scores}>
          {rep.scores.map((s) => (
            <div key={s.label}>
              <span>{s.label}</span>
              <span className={styles.bar}>
                <i style={{ width: `${s.value}%` }} />
              </span>
              <b>{s.value}</b>
            </div>
          ))}
          <div className={styles.total}>
            <span>Genel puan</span>
            <b>{rep.total}</b>
            <Stars n={rep.stars} />
          </div>
        </div>

        <section className={styles.opinion}>
          <h4>Kurul görüşü</h4>
          {rep.notes.map((n) => (
            <p key={n}>{n}</p>
          ))}
          {rep.verdict === 'ret' && <p>Şartnamede uygun bulunmayan maddeler giderildikten sonra dosyanın yeniden sunulması uygun görülmüştür.</p>}
        </section>

        <span className={`${styles.seal} ${styles[rep.verdict]}`}>{VERDICT[rep.verdict]}</span>

        <footer className={styles.actions}>
          <button ref={close} type="button" onClick={onClose}>
            {rep.verdict === 'ret' ? 'Düzeltmeye dön' : 'Tasarıma dön'}
          </button>
          <button type="button" onClick={onFiles}>
            Dosyalara dön
          </button>
          {onNext && rep.stars > 0 && (
            <button type="button" className={styles.primary} onClick={onNext}>
              Sonraki dosya →
            </button>
          )}
        </footer>
      </article>
    </div>
  );
}
