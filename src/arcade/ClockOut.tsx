import { useEffect, useId, useRef, useState } from 'react';
import { SITE_NAME } from './games';
import { hrefOf, navigate } from './route';
import styles from './ClockOut.module.css';

/*
 * Oyundan salona dönüş: "Mesaiyi bitir". Solda geri oku, yanında yazı; dar ekranda yalnızca ok
 * kalır. Oyunda kaybolacak bir ilerleme varsa (`risk`) önce bir onay
 * balonu açılır, yoksa doğrudan salona gider. Her oyun aynı bileşeni kullanır; `tone` oyunun
 * zeminine uyar, `fixed` oyunun kendi üst çubuğu yoksa sol üst köşeye sabitler.
 */
export function ClockOut({ tone = 'light', fixed = false, risk }: { tone?: 'light' | 'dark'; fixed?: boolean; risk?: string }) {
  const [asking, setAsking] = useState(false);
  const stay = useRef<HTMLButtonElement>(null);
  const id = useId();
  // oyuna girilen saat: çıkış kartının giriş satırı
  const [since] = useState(() => new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
  useEffect(() => {
    if (!asking) return;
    stay.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setAsking(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [asking]);

  return (
    <span className={`${styles.wrap} ${tone === 'dark' ? styles.dark : ''} ${fixed ? styles.fixed : ''}`}>
      <a
        className={styles.out}
        href={hrefOf('arcade')}
        aria-label={`Mesaiyi bitir, ${SITE_NAME} ana sayfasına dön`}
        aria-expanded={risk ? asking : undefined}
        aria-controls={risk ? id : undefined}
        onClick={(e) => {
          if (!risk) return;
          e.preventDefault();
          setAsking((a) => !a);
        }}
      >
        <svg className={styles.arrow} viewBox="0 0 20 20" aria-hidden="true">
          <path d="M16 10H4M9 4.5 3.5 10 9 15.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className={styles.label}>Mesaiyi bitir</span>
      </a>
      {asking && (
        <span id={id} className={styles.ask} role="alertdialog" aria-label="Mesaiyi bitir">
          {/* çıkış kartı: kart saatine basılmayı bekleyen bir puantaj kartı */}
          <span className={styles.card} aria-hidden="true">
            <span className={styles.cardHead}>
              <svg viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="7.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <path d="M10 5.6V10l3 1.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              ÇIKIŞ KARTI
            </span>
            <span className={styles.cardRows}>
              <span>Giriş</span>
              <b className="mono">{since}</b>
              <span>Çıkış</span>
              <b className={`mono ${styles.blank}`}>__:__</b>
            </span>
          </span>
          <b className={styles.q}>Çıkış kartınızı basmak istediğinize emin misiniz?</b>
          <span className={styles.risk}>{risk}</span>
          <span className={styles.actions}>
            <button ref={stay} type="button" className={styles.stay} onClick={() => setAsking(false)}>
              Biraz daha kal
            </button>
            <button type="button" className={styles.leave} onClick={() => navigate('arcade')}>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M8 3.5H4.5v13H8M12.5 6.5 16 10l-3.5 3.5M16 10H7.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Evet, çık
            </button>
          </span>
        </span>
      )}
    </span>
  );
}
