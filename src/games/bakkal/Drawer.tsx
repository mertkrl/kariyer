import { useEffect, useMemo, useState } from 'react';
import { tl } from './data';
import type { Receipt } from './returns';
import styles from './Drawer.module.css';

/*
 * Kasanın çekmecesi: her günün tek bir gün sonu Z raporu durur, en yenisi önde. Raporda o günün
 * bütün satışları satır satır yazar: fiş no, kim, ne aldı, kaç lira; veresiye ve iadesi alınan
 * satırlar işaretlidir. Bugünün raporu kepenk inince çıkar. İade getiren biri gelince oyuncu burada
 * adını ya da malı arar; rapor kimin haklı olduğunu söylemez, yalnızca ne olduğunu yazar.
 */
export function ReceiptDrawer({ receipts, day, onClose }: { receipts: readonly Receipt[]; day: number; onClose: () => void }) {
  const [q, setQ] = useState('');
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);
  const reports = useMemo(() => {
    const k = q.trim().toLocaleLowerCase('tr-TR');
    const hit = (r: Receipt) => !k || r.name.toLocaleLowerCase('tr-TR').includes(k) || r.items.some((i) => i.name.toLocaleLowerCase('tr-TR').includes(k));
    const days = [...new Set(receipts.filter((r) => r.day < day).map((r) => r.day))].sort((a, b) => b - a);
    return days
      .map((d) => {
        const all = receipts.filter((r) => r.day === d);
        return { day: d, all, lines: all.filter(hit) };
      })
      .filter((z) => z.lines.length);
  }, [receipts, q, day]);
  return (
    <div className={styles.back} onClick={onClose}>
      <div className={styles.drawer} role="dialog" aria-label="Kasa çekmecesi: gün sonu Z raporları" onClick={(e) => e.stopPropagation()}>
        <header>
          <b>🧾 Gün sonu Z raporları</b>
          <span>bugünün raporu kepenk inince çıkar</span>
          <button type="button" onClick={onClose} aria-label="Çekmeceyi kapat">
            ✕
          </button>
        </header>
        <input autoFocus type="search" placeholder="Ad ya da mal ara… (ör. Ayşe, yoğurt)" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Z raporlarında ara" />
        <div className={styles.slips}>
          {reports.map((z) => (
            <section key={z.day} className={styles.slip} aria-label={`${z.day}. gün Z raporu`}>
              <div className={styles.slipHead}>
                <b>ŞÜKRÜ BAKKALİYE</b>
                <span>Z RAPORU · {z.day}. GÜN</span>
              </div>
              <ol>
                {z.lines.map((r) => (
                  <li key={r.no} className={r.returnedOn !== undefined ? styles.returned : undefined}>
                    <span className={styles.no}>{String(r.no).padStart(4, '0')}</span>
                    <span className={styles.who}>
                      <b>{r.name}</b>
                      <small>{r.items.map((i) => i.name).join(', ')}</small>
                    </span>
                    <span className={styles.sum}>
                      {tl(r.total)}
                      {r.credit && <em>veresiye</em>}
                      {r.returnedOn !== undefined && <em className={styles.stamp}>iade · {r.returnedOn}. gün</em>}
                    </span>
                  </li>
                ))}
              </ol>
              <div className={styles.total}>
                <span>{z.all.length} SATIŞ</span>
                <b>{tl(z.all.reduce((s, r) => s + r.total, 0))}</b>
              </div>
            </section>
          ))}
          {!reports.length && <p className={styles.empty}>{receipts.some((r) => r.day < day) ? 'Bu aramaya uyan satış yok.' : 'Çekmece boş: ilk Z raporu bu akşam kepenk inince çıkar.'}</p>}
        </div>
      </div>
    </div>
  );
}
