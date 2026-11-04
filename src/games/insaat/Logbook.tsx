import { useState } from 'react';
import { FLOOR_PLANS, ROLES, STAGE_PLANS, planProgress, type Role } from './crew';
import { floorStepAt, stageAt, stageProgress, type Idle, type Plan as Schedule } from './data';
import styles from './InsaatGame.module.css';

/*
 * Şantiye defteri: amcalar konuşurken meslek sahipleri ne yapıyor. Çalışan
 * makineler, defterin son satırı, işaretlenen kontroller ve günün İSG önlemi. Dar ekranda kapalı açılır.
 */

/** Şantiye dururken deftere düşülen not. */
const IDLE_LOG: Record<Exclude<Idle, null>, { who: Role; text: string }> = {
  night: { who: 'sef', text: 'Mesai bitti. Şantiye kilitli, bekçi nöbette; projektörler açık.' },
  rain: { who: 'muh', text: 'Yağış nedeniyle döküm ertelendi; taze beton naylonla örtüldü, kazı şevleri kontrol ediliyor.' },
  snow: { who: 'muh', text: 'Don riski: hava 5 °C’nin altındayken beton dökülmez. Şantiye kapalı, iskeleler kardan temizlenecek.' },
};

export function Logbook({ schedule, w, idle, day }: { schedule: Schedule; w: number; idle: Idle; day: number }) {
  const [open, setOpen] = useState(() => typeof window === 'undefined' || window.matchMedia?.('(min-width: 900px)').matches !== false);
  const i = stageAt(schedule, w);
  const fs = floorStepAt(schedule, w);
  const plan = fs ? FLOOR_PLANS[fs.id] : STAGE_PLANS[schedule.stages[i].id];
  const { log, checked } = planProgress(plan, fs ? fs.p : stageProgress(schedule, w, i));
  const entry = idle ? IDLE_LOG[idle] : log;

  return (
    <section className={styles.log} aria-label="Şantiye defteri">
      <button type="button" className={styles.logHead} aria-expanded={open} onClick={() => setOpen((x) => !x)}>
        <span className={styles.logTitle}>
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <rect x="4" y="2.5" width="12.5" height="15" rx="1.2" fill="#c9a35c" stroke="currentColor" strokeWidth="1.3" />
            <rect x="4" y="2.5" width="2.6" height="15" fill="#8b5a33" stroke="currentColor" strokeWidth="1.3" />
            <path d="M9 7h5.2M9 10h5.2M9 13h3.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M2.8 5.5h2.6M2.8 10h2.6M2.8 14.5h2.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          Şantiye defteri
        </span>
        <small className="mono">Gün {day.toLocaleString('tr-TR')}</small>
      </button>
      {open && (
        <div className={styles.logBody}>
          <p className={styles.logStage}>
            <b>{schedule.stages[i].title}</b>
            {fs && (
              <span>
                {fs.floor + 1}. kat · {fs.title}
              </span>
            )}
          </p>

          <blockquote className={styles.logEntry}>
            <small>{ROLES[entry.who]}</small>
            {entry.text}
          </blockquote>

          {plan.machines.length > 0 && (
            <>
              <h3>Makine ve ekipman</h3>
              <p className={styles.machines}>{plan.machines.join(' · ')}</p>
            </>
          )}

          <h3>Kontrol listesi</h3>
          <ul className={styles.checks}>
            {plan.checks.map((c, k) => (
              <li key={c} className={k < checked ? styles.ok : undefined}>
                <i aria-hidden="true">{k < checked ? '✓' : ''}</i>
                {c}
                <span className="sr-only">{k < checked ? ' (tamam)' : ' (bekliyor)'}</span>
              </li>
            ))}
          </ul>

          <p className={styles.isg}>
            <b>İSG</b> {plan.isg}
          </p>
        </div>
      )}
    </section>
  );
}
