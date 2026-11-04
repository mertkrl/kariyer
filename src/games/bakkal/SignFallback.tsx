import { useEffect, useState } from 'react';
import styles from './BakkalGame.module.css';

/*
 * Dar ekranda sahne kenarlardan kırpılır ve kapı görünmez kalabilir. O zaman kapıdaki levhanın bir
 * eşi ekranın üst ortasında yanıp söner: oyuncu dükkânı yine levhaya basarak açar. Kapı görünüyorsa
 * hiçbir şey çizilmez.
 */
export function SignFallback({ onOpen }: { onOpen: () => void }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const check = () => {
      const r = document.querySelector('[data-tour="sign"]')?.getBoundingClientRect();
      setHidden(!!r && (r.right < 8 || r.left > window.innerWidth - 8 || r.bottom < 8 || r.top > window.innerHeight - 8));
    };
    check();
    const t = window.setInterval(check, 400);
    window.addEventListener('resize', check);
    return () => {
      window.clearInterval(t);
      window.removeEventListener('resize', check);
    };
  }, []);
  if (!hidden) return null;
  return (
    <button type="button" className={styles.signFallback} onClick={onOpen} aria-label="Levhayı çevir, dükkânı aç">
      AÇIK
    </button>
  );
}
