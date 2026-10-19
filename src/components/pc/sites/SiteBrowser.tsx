import { useEffect, useRef, useState } from 'react';
import { useDialog } from '../../ui/useDialog';
import { SITES, type SiteId } from './registry';
import styles from './SiteBrowser.module.css';

/**
 * Adayın gönderdiği sitenin açıldığı tarayıcı: portal penceresinin tamamını kaplar. Site oyunun
 * içinde çizilir (gerçek bir bağlantı değil); oyuncu sayfaları gezer, düğmelere basar, bir siteden
 * ötekine geçer (portfolyodan canlı projeye). Bir İK uzmanının yapacağı kadar: kod ya da telefon
 * görünümü yok. Yapay zekâ bunu da yapmaz: yalnızca CV'deki kelimeleri saydı.
 */
interface Stop {
  site: SiteId;
  page: string;
}

export function SiteBrowser({ site, onClose }: { site: SiteId; onClose: () => void }) {
  const [history, setHistory] = useState<Stop[]>([{ site, page: SITES[site].pages[0] }]);
  const ref = useDialog<HTMLDivElement>(onClose);
  const backdrop = useRef<HTMLDivElement>(null);
  // tarayıcı portalın üstünde durur: portalın kendisi (odak ya da kaydırma yüzünden) kayarsa
  // adres çubuğu da kaybolur, o yüzden açıkken portal hep en üstte tutulur
  useEffect(() => {
    const host = backdrop.current?.parentElement;
    if (!host) return;
    const pin = () => {
      if (host.scrollTop || host.scrollLeft) host.scrollTo(0, 0);
    };
    pin();
    host.addEventListener('scroll', pin);
    return () => host.removeEventListener('scroll', pin);
  }, []);
  const here = history[history.length - 1];
  const def = SITES[here.site];
  const Site = def.Component;
  const path = here.page === def.pages[0] ? '' : `/${here.page}`;
  const push = (stop: Stop) => setHistory((h) => [...h, stop]);
  // her sayfa en üstünden açılır
  const viewport = useRef<HTMLDivElement>(null);
  useEffect(() => {
    viewport.current?.scrollTo(0, 0);
  }, [history.length]);

  return (
    <div ref={backdrop} className={styles.backdrop}>
      <div ref={ref} className={styles.window} role="dialog" aria-label={`Tarayıcı: ${def.url}`}>
        <div className={styles.bar}>
          <button className={styles.tool} onClick={onClose} title="Tarayıcıyı kapat, CV'ye dön">
            ← Portala dön
          </button>
          <button className={styles.tool} onClick={() => setHistory((h) => h.slice(0, -1))} disabled={history.length < 2} aria-label="Geri" title="Önceki sayfa">
            ‹
          </button>
          <span className={`${styles.address} mono`}>
            https://{def.url}
            {path}
          </span>
        </div>
        <div ref={viewport} className={styles.viewport}>
          {/* site sayfa değişince yeniden kurulmaz: sepet, form, giriş sayfalar arasında kalır */}
          <div key={here.site} className={styles.frame}>
            <Site page={here.page} go={(page) => push({ site: here.site, page })} visit={(to) => push({ site: to, page: SITES[to].pages[0] })} />
          </div>
        </div>
      </div>
    </div>
  );
}
