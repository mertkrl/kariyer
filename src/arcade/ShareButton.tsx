import { useState } from 'react';
import { shareResult, type ResultCard } from './share';
import styles from './ShareButton.module.css';

/*
 * Oyun sonu ekranlarındaki "Sonucu paylaş" düğmesi. Görünüşü oyunun kendi düğmesidir (`className`);
 * kartı `make` ancak tıklanınca kurar, böylece bir resim gerekiyorsa (meydan) o an çizilir.
 */

// paylaşım menüsü kendi onayını gösterir; "paylaşıldı" diye ayrıca yazılmaz
const NOTE = {
  saved: 'Kart indirildi; metin ve bağlantı panoya kopyalandı.',
  shared: '',
  error: 'Kart oluşturulamadı.',
} as const;

/** `floatNote`: bildirim akışa girmez, düğmenin üstünde yüzer; dar ve yüksekliği sabit yerleşimlerde düğme yerinden oynamaz. */
export function ShareButton({ make, className, label = 'Sonucu paylaş', floatNote = false }: { make: () => ResultCard | Promise<ResultCard>; className?: string; label?: string; floatNote?: boolean }) {
  const [state, setState] = useState<'idle' | 'busy' | keyof typeof NOTE>('idle');
  const run = async () => {
    setState('busy');
    try {
      const outcome = await shareResult(await make());
      setState(outcome === 'cancelled' ? 'idle' : outcome);
    } catch {
      setState('error');
    }
  };
  return (
    <span className={`${styles.wrap} ${floatNote ? styles.float : ''}`}>
      <button type="button" className={className} onClick={run} disabled={state === 'busy'}>
        {state === 'busy' ? 'Kart hazırlanıyor…' : label}
      </button>
      <span className={styles.note} role="status">
        {state in NOTE ? NOTE[state as keyof typeof NOTE] : ''}
      </span>
    </span>
  );
}
