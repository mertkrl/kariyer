import type { ReactNode } from 'react';
import styles from './Finale.module.css';

/*
 * Oyun sonunun duygusal zirvesi: puan kartından önce, oyunun dünyasından bir belge. Üç biçimi var:
 * gazete haberi (manşet ve sütun), radyo yayını (dalga ve anons) ve elle yazılmış mektup. Metni her
 * oyun kendi sonucundan kurar; bu bileşen yalnızca sahneyi giydirir.
 */

export type FinaleKind = 'news' | 'radio' | 'letter';

export function Finale({ kind, kicker, title, children, sign }: { kind: FinaleKind; kicker: string; title: string; children: ReactNode; sign?: string }) {
  return (
    <section className={`${styles.finale} ${styles[kind]}`} aria-label={kicker}>
      {kind === 'radio' && (
        <div className={styles.wave} aria-hidden="true">
          {Array.from({ length: 24 }, (_, i) => (
            <i key={i} style={{ animationDelay: `${(i % 6) * 0.12}s` }} />
          ))}
        </div>
      )}
      <p className={styles.kicker}>{kicker}</p>
      <h3 className={styles.title}>{title}</h3>
      <div className={styles.body}>{children}</div>
      {sign && <p className={styles.sign}>{sign}</p>}
    </section>
  );
}
