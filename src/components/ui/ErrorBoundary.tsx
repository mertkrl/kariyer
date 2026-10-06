import { Component, type ErrorInfo, type ReactNode } from 'react';
import { clearSave, readSave } from '../../game/save';
import { getState } from '../../game/storeApi';
import styles from './ErrorBoundary.module.css';

/*
 * Bir ekran çizilirken hata verirse oyuncu boş bir sayfa yerine bunu görür: ne olduğu ve geri
 * dönüş yolu. Günün başındaki kontrol noktası hâlâ tarayıcıda; bu yüzden yeniden yüklemek
 * "Devam et"li karşılama ekranına götürür.
 */
interface State {
  error: Error | null;
  componentStack: string;
  copied: boolean | null;
}

/** Çökmeyi yeniden üretmek için gereken her şey: oyun kodu (tohum) aynı haftayı yeniden oynatır. */
function report(error: Error, componentStack: string) {
  let where = 'oyun durumu okunamadı';
  try {
    const s = getState();
    where = `oyun kodu #${s.seed} · aşama ${s.phase} · gün ${s.currentDayIndex + 1} · saat dk ${Math.round(s.workdayMinutes)} · ${s.difficulty}`;
  } catch {
    // the store itself is what broke
  }
  return [
    `Sen İK'sin ${__APP_VERSION__} — hata raporu`,
    new Date().toISOString(),
    where,
    navigator.userAgent,
    '',
    `${error.name}: ${error.message}`,
    error.stack ?? '',
    componentStack.trim(),
  ].join('\n');
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, componentStack: '', copied: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Oyun bir hatayla durdu:', error, info.componentStack);
    this.setState({ componentStack: info.componentStack ?? '' });
  }

  copyReport = () => {
    const { error, componentStack } = this.state;
    if (!error) return;
    navigator.clipboard
      .writeText(report(error, componentStack))
      .then(() => this.setState({ copied: true }))
      .catch(() => this.setState({ copied: false }));
  };

  render() {
    const { error, copied } = this.state;
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
            <button className={styles.secondary} onClick={this.copyReport}>
              Hata raporunu kopyala
            </button>
          </div>
          <p className={styles.note} aria-live="polite">
            {copied === true && 'Rapor panoya kopyalandı. Hata bildirirken yapıştırman yeterli; içinde kişisel bilgi yok.'}
            {copied === false && 'Panoya erişilemedi; rapor aşağıda seçili. Kopyalayıp hata bildirirken yapıştırabilirsin.'}
          </p>
          {copied === false && (
            <textarea
              className={`${styles.report} mono`}
              readOnly
              rows={8}
              aria-label="Hata raporu"
              value={report(error, this.state.componentStack)}
              ref={(el) => el?.select()}
            />
          )}
        </div>
      </div>
    );
  }
}
