import { applyUpdate, useUpdateReady } from '../../swUpdate';
import styles from './UpdateNotice.module.css';

/** A newer build is ready: shown on the welcome screen only, so no week is cut short. */
export function UpdateNotice() {
  const ready = useUpdateReady();
  if (!ready) return null;
  return (
    <div className={styles.notice} role="status">
      <span>Oyunun yeni sürümü hazır.</span>
      <button className={styles.action} onClick={applyUpdate}>
        Yenile
      </button>
    </div>
  );
}
