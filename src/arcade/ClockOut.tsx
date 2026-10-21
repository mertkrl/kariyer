import { useEffect, useId, useRef, useState } from 'react';
import { SITE_NAME } from './games';
import { hrefOf, navigate } from './route';
import styles from './ClockOut.module.css';

/*
 * Oyundan salona dönüş: "Mesaiyi bitir". Solda Mesai Dışı monogramı (MD), yanında yazı; dar
 * ekranda yalnızca monogram kalır. Oyunda kaybolacak bir ilerleme varsa (`risk`) önce bir onay
 * balonu açılır, yoksa doğrudan salona gider. Her oyun aynı bileşeni kullanır; `tone` oyunun
 * zeminine uyar, `fixed` oyunun kendi üst çubuğu yoksa sol üst köşeye sabitler.
 */
export function ClockOut({ tone = 'light', fixed = false, centered = false, risk }: { tone?: 'light' | 'dark'; fixed?: boolean; centered?: boolean; risk?: string }) {
  const [asking, setAsking] = useState(false);
  const stay = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!asking) return;
    stay.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setAsking(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [asking]);

  return (
    <span className={`${styles.wrap} ${tone === 'dark' ? styles.dark : ''} ${fixed ? styles.fixed : ''} ${centered ? styles.centered : ''}`}>
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
        <span className={styles.badge} aria-hidden="true">
          MD
        </span>
        <span className={styles.label}>Mesaiyi bitir</span>
      </a>
      {asking && (
        <span id={id} className={styles.ask} role="alertdialog" aria-label="Mesaiyi bitir">
          <b>Çıkış kartınızı basmak istediğinize emin misiniz?</b>
          <span>{risk}</span>
          <span className={styles.actions}>
            <button ref={stay} type="button" className={styles.stay} onClick={() => setAsking(false)}>
              Biraz daha kal
            </button>
            <button type="button" className={styles.leave} onClick={() => navigate('arcade')}>
              Evet, çık
            </button>
          </span>
        </span>
      )}
    </span>
  );
}
