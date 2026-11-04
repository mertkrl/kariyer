import { useEffect, useState } from 'react';
import styles from './GameLoading.module.css';

/*
 * Oyunun parçası inerken görünen ekran: oyunun açılış zemini (renk sıçramasın), ortada adı ve ince
 * bir ilerleme çizgisi. Hızlı bağlantıda hiç görünmesin diye yazı ve çizgi 250 ms sonra belirir;
 * zemin hemen boyanır.
 */
export function GameLoading({ title, background }: { title: string; background: string }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setShown(true), 250);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <div className={styles.screen} style={{ background }} role="status" aria-live="polite">
      {shown && (
        <div className={styles.box}>
          <span className={styles.title}>{title}</span>
          <span className={styles.bar} aria-hidden="true">
            <i />
          </span>
          <span className={styles.sr}>{title} yükleniyor</span>
        </div>
      )}
    </div>
  );
}
