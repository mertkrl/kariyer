import { SITE_NAME } from '../games';
import styles from './GameBoundary.module.css';

/*
 * Site başka bir sitenin çerçevesinde açıldığında oyunun yerine çizilen tek ekran (shared/frameGuard.ts):
 * oyun yok, yalnızca kendi adresinde açma bağlantısı. Bağlantı üst pencereyi değiştirir.
 */
export function FramedNotice() {
  return (
    <div className={styles.screen} role="alert">
      <div className={styles.card}>
        <div className={`${styles.eyebrow} mono`}>{SITE_NAME.toLocaleUpperCase('tr-TR')} · GÜVENLİK</div>
        <h1>Bu oyun başka bir sitenin içinde açılmış.</h1>
        <p>Güvenliğin için oyunlar başka bir sayfanın içinde çalışmaz; tıkladığın şeyin gerçekten oyunun düğmesi olduğundan emin olamazsın. Kendi adresinde aç, kaldığın yer orada duruyor.</p>
        <div className={styles.actions}>
          <a className={styles.primary} href={window.location.href} target="_top" rel="noopener noreferrer">
            {SITE_NAME}'nı kendi adresinde aç
          </a>
        </div>
      </div>
    </div>
  );
}
