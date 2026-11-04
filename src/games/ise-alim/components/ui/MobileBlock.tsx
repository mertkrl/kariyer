import { useState } from 'react';
import { navigate } from '../../../../arcade/route';
import styles from './MobileBlock.module.css';

/**
 * Oyun (masa, bilgisayar, mülakatlar) geniş ekran için yapıldı; telefonda düzgün oynanmıyor. Telefon
 * boyutundaki bir ekranda (dar ya da yatayda alçak) görünür; ne zaman görüneceğine CSS karar verir,
 * böylece pencere büyüyünce kendiliğinden kaybolur.
 *
 * Açılış sayfasında (`inline`) tanıtım okunur kalır: "İşe başla" yerine altta bir şerit durumu baştan
 * söyler. Oyunun içinde ekranı kaplar. İkisinde de çıkış var: salona dönmek ya da bağlantıyı başka
 * cihaza göndermek (paylaşım menüsü, yoksa panoya kopyalama).
 */
export function MobileBlock({ inline = false }: { inline?: boolean }) {
  const [copied, setCopied] = useState<boolean | null>(null);
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) return await navigator.share({ title: "Sen İK'sin", url });
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch (e) {
      // paylaşım menüsünden vazgeçmek hata değildir
      if ((e as Error).name !== 'AbortError') setCopied(false);
    }
  };
  return (
    <div className={`${styles.hint} ${inline ? styles.inline : ''}`} role={inline ? 'note' : 'dialog'} aria-modal={inline ? undefined : true} aria-labelledby="mobile-title">
      {!inline && <div className={styles.screen} aria-hidden="true" />}
      <h2 id="mobile-title">Bu masa telefona sığmıyor</h2>
      <p>Sen İK'sin geniş ekran ister: CV'ler, telefon ve mülakat odası aynı anda açık. Bağlantıyı bilgisayarına (ya da yatay bir tablete) gönder, orada oyna.</p>
      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={share}>
          Bağlantıyı paylaş
        </button>
        <button type="button" className={styles.secondary} onClick={() => navigate('arcade')}>
          Salona dön
        </button>
      </div>
      <p className={styles.note} aria-live="polite">
        {copied === true && 'Bağlantı kopyalandı.'}
        {copied === false && `Kopyalanamadı; adres: ${window.location.href}`}
      </p>
    </div>
  );
}
