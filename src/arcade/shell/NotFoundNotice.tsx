import { useEffect, useState } from 'react';
import styles from './NotFoundNotice.module.css';

/*
 * Bilinmeyen adresle gelene (eski ya da yanlış yazılmış bir paylaşım bağlantısı) salonun üstünde
 * kısa bir not: neden burada olduğunu anlasın. Birkaç saniye sonra kendiliğinden kapanır; adres
 * Root.tsx'te salona düzeltilir, yenileyince not yeniden çıkmaz.
 */
export function NotFoundNotice({ path }: { path: string }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(() => setOpen(false), 9000);
    return () => window.clearTimeout(t);
  }, []);
  if (!open) return null;
  return (
    <div className={styles.note} role="status">
      <span>
        <b>Bu sokakta öyle bir dükkân yok.</b> <code>{path}</code> adresinde bir oyun bulamadık; işte mahalle, buradan seç.
      </span>
      <button type="button" onClick={() => setOpen(false)} aria-label="Notu kapat">
        ×
      </button>
    </div>
  );
}
