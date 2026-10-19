import styles from './MobileBlock.module.css';

/**
 * Oyun (masa, bilgisayar, mülakatlar) geniş ekran için yapıldı; telefonda düzgün oynanmıyor. Telefon
 * boyutundaki bir ekranda (dar ya da yatayda alçak) oyunun üstünü kaplar ve geçilemez. Ne zaman
 * görüneceğine CSS karar verir, böylece pencere büyüyünce kendiliğinden kaybolur.
 */
export function MobileBlock() {
  return (
    <div className={styles.hint} role="dialog" aria-modal="true" aria-labelledby="mobile-title">
      <div className={styles.screen} aria-hidden="true" />
      <h2 id="mobile-title">Bu oyun bilgisayar için</h2>
      <p>Masan, bilgisayarın ve mülakat odası geniş bir ekran için tasarlandı; telefonda henüz düzgün oynanmıyor.</p>
      <p>Aynı adresi bir bilgisayarda (ya da büyük bir tablette yatay) açarak oynayabilirsin.</p>
    </div>
  );
}
