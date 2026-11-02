import { useState } from 'react';
import { FLOOR_PLANS, ROLES, STAGE_PLANS, planProgress, type Role } from './crew';
import { STAGES, floorStepAt, stageAt, stageProgress, type Idle } from './data';
import styles from './InsaatGame.module.css';

/*
 * Şantiye defteri: amcalar konuşurken meslek sahipleri ne yapıyor. Sahadaki ekip, çalışan
 * makineler, defterin son satırı, işaretlenen kontroller ve günün İSG önlemi. Dar ekranda kapalı açılır.
 */

/** Şantiye dururken deftere düşülen not. */
const IDLE_LOG: Record<Exclude<Idle, null>, { who: Role; text: string }> = {
  night: { who: 'sef', text: 'Mesai bitti. Şantiye kilitli, bekçi nöbette; projektörler açık.' },
  rain: { who: 'muh', text: 'Yağış nedeniyle döküm ertelendi; taze beton naylonla örtüldü, kazı şevleri kontrol ediliyor.' },
  snow: { who: 'muh', text: 'Don riski: hava 5 °C’nin altındayken beton dökülmez. Şantiye kapalı, iskeleler kardan temizlenecek.' },
};

export function Logbook({ w, idle, day }: { w: number; idle: Idle; day: number }) {
  const [open, setOpen] = useState(() => typeof window === 'undefined' || window.matchMedia?.('(min-width: 900px)').matches !== false);
  const i = stageAt(w);
  const fs = floorStepAt(w);
  const plan = fs ? FLOOR_PLANS[fs.id] : STAGE_PLANS[STAGES[i].id];
  const { log, checked } = planProgress(plan, fs ? fs.p : stageProgress(w, i));
  const entry = idle ? IDLE_LOG[idle] : log;

  return (
    <section className={styles.log} aria-label="Şantiye defteri">
      <button type="button" className={styles.logHead} aria-expanded={open} onClick={() => setOpen((x) => !x)}>
        <span>📒 Şantiye defteri</span>
        <small className="mono">Gün {day.toLocaleString('tr-TR')}</small>
      </button>
      {open && (
        <div className={styles.logBody}>
          <p className={styles.logStage}>
            <b>{STAGES[i].title}</b>
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

          <h3>Sahada</h3>
          <ul className={styles.chips}>
            {plan.crew.map((r) => (
              <li key={r} className={idle ? styles.off : undefined}>
                {ROLES[r]}
              </li>
            ))}
          </ul>

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
