import { Component, type ErrorInfo, type ReactNode } from 'react';
import { clearSave, readSave } from '../../game/save';
import styles from './ErrorBoundary.module.css';

/*
 * If a screen throws while rendering, the player gets this instead of a blank page: what
 * happened, and a way back. The checkpoint from the start of the day is still in the browser,
 * so reloading lands on the welcome screen with "Devam et".
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Oyun bir hatayla durdu:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const hasSave = readSave() !== null;
    return (
      <div className={styles.screen} role="alert">
        <div className={styles.card}>
          <div className={`${styles.eyebrow} mono`}>İK SİSTEMİ v4.2 · BEKLENMEYEN HATA</div>
          <h1>Sistem yanıt vermiyor.</h1>
          <p>
            Oyun beklenmeyen bir hatayla durdu.{' '}
            {hasSave ? 'Günün başındaki kaydın duruyor: sayfayı yenileyip "Devam et" ile kaldığın günden sürdürebilirsin.' : 'Kayıtlı bir günün yok; sayfayı yenileyince oyun baştan başlar.'}
          </p>
          <pre className={`${styles.detail} mono`}>{error.message}</pre>
          <div className={styles.actions}>
            <button className={styles.primary} onClick={() => window.location.reload()}>
              Sayfayı yenile
            </button>
            {hasSave && (
              <button
                className={styles.secondary}
                onClick={() => {
                  clearSave();
                  window.location.reload();
                }}
              >
                Kaydı sil ve baştan başla
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
