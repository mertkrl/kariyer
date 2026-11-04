import { Component, type ErrorInfo, type ReactNode } from 'react';
import { navigate } from '../route';
import { gameReport, isChunkError } from './errors';
import styles from './GameBoundary.module.css';

/*
 * Bir oyunun hata sınırı: oyun çizilirken hata verirse ya da oyunun parçası inemezse oyuncu boş
 * sayfa yerine bunu görür. Başlıkta hangi oyunun durduğu yazar (İK'nın sistem diliyle değil);
 * parça inemediyse "yeni sürüm geldi" denir. Salona dönüş her zaman var. Root.tsx her oyunu
 * kendi sınırıyla sarar ve sınırı adrese bağlar: başka oyuna geçince hata unutulur.
 */
interface Props {
  /** Ekranda yazan ad: oyunun adı ya da sitenin adı. */
  title: string;
  /** Salona dönüş düğmesi (salonun kendi sınırında yok). */
  canLeave?: boolean;
  children: ReactNode;
}

interface State {
  error: Error | null;
  componentStack: string;
  copied: boolean | null;
}


export class GameBoundary extends Component<Props, State> {
  state: State = { error: null, componentStack: '', copied: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`${this.props.title} bir hatayla durdu:`, error, info.componentStack);
    this.setState({ componentStack: info.componentStack ?? '' });
  }

  copyReport = () => {
    const { error, componentStack } = this.state;
    if (!error) return;
    navigator.clipboard
      .writeText(gameReport(this.props.title, error, componentStack))
      .then(() => this.setState({ copied: true }))
      .catch(() => this.setState({ copied: false }));
  };

  render() {
    const { error, copied } = this.state;
    const { title, canLeave = true } = this.props;
    if (!error) return this.props.children;
    const chunk = isChunkError(error);
    return (
      <div className={styles.screen} role="alert">
        <div className={styles.card}>
          <div className={`${styles.eyebrow} mono`}>{chunk ? `${title} · YENİ SÜRÜM` : `${title} · BEKLENMEYEN HATA`}</div>
          <h1>{chunk ? 'Mahalleye yeni bir sürüm geldi.' : `${title} takıldı.`}</h1>
          <p>
            {chunk
              ? 'Oyunun dosyası inemedi: ya bağlantı koptu ya da site bu arada güncellendi. Sayfayı yenile; kayıtlı ilerlemen tarayıcında duruyor.'
              : 'Bir şey ters gitti; sen değil, kod. Sayfayı yenile, kayıtlı ilerlemen tarayıcında duruyor. Tekrar olursa hata raporunu kopyalayıp bize ilet.'}
          </p>
          {!chunk && <pre className={`${styles.detail} mono`}>{error.message}</pre>}
          <div className={styles.actions}>
            <button className={styles.primary} onClick={() => window.location.reload()} autoFocus>
              Sayfayı yenile
            </button>
            {canLeave && (
              <button className={styles.secondary} onClick={() => navigate('arcade')}>
                Salona dön
              </button>
            )}
            {!chunk && (
              <button className={styles.secondary} onClick={this.copyReport}>
                Hata raporunu kopyala
              </button>
            )}
          </div>
          <p className={styles.note} aria-live="polite">
            {copied === true && 'Rapor panoya kopyalandı. Hata bildirirken yapıştırman yeterli; içinde kişisel bilgi yok.'}
            {copied === false && 'Panoya erişilemedi; rapor aşağıda seçili. Kopyalayıp hata bildirirken yapıştırabilirsin.'}
          </p>
          {copied === false && (
            <textarea className={`${styles.report} mono`} readOnly rows={8} aria-label="Hata raporu" value={gameReport(title, error, this.state.componentStack)} ref={(el) => el?.select()} />
          )}
        </div>
      </div>
    );
  }
}
