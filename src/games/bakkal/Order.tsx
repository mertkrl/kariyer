import type { Dispatch, SetStateAction } from 'react';
import { PRODUCTS, tl } from './data';
import { BREAD_MAX, GUM, GUM_MAX, GUM_PACK, SHELF_MAX, SPOIL, type Stock } from './week';
import styles from './Order.module.css';

/*
 * Akşam siparişleri: her akşam fırına ertesi sabahın ekmeği, toptancı Kemal'e mal söylenir. Fiyat
 * söylenmez; parası sabah mal gelince kasadan peşin çıkar, yetmeyen mal geri gider. Raftaki durum sayıyla değil, rafın dolu ve
 * boş gözleriyle görünür. Rafa en fazla SHELF_MAX sığar.
 */

/** Artı eksi düğmeleri: değişikliği bir önceki değere göre bildirir, art arda hızlı basışta kaybolmaz. */
function Stepper({ value, max, onStep, label }: { value: number; max: number; onStep: (delta: number) => void; label: string }) {
  return (
    <span className={styles.stepper}>
      <button type="button" onClick={() => onStep(-1)} disabled={value <= 0} aria-label={`${label} azalt`}>
        −
      </button>
      <b aria-live="polite">{value}</b>
      <button type="button" onClick={() => onStep(1)} disabled={value >= max} aria-label={`${label} artır`}>
        +
      </button>
    </span>
  );
}

export function BreadOrder({ value, onChange }: { value: number; onChange: Dispatch<SetStateAction<number>> }) {
  return (
    <div className={styles.bread}>
      <span>🥖 Fırına yarın sabah kaç ekmek söyleyelim? Kalan akşam bayatlar.</span>
      <Stepper value={value} max={BREAD_MAX} onStep={(d) => onChange((n) => Math.max(0, Math.min(BREAD_MAX, n + d)))} label="Ekmek" />
    </div>
  );
}

export function WholesaleOrder({ stock, order, money, onChange }: { stock: Stock; order: Stock; money: number; onChange: Dispatch<SetStateAction<Stock>> }) {
  return (
    <section className={styles.order} aria-label="Toptancı siparişi">
      <p className={styles.call}>
        📞 <b>Toptancı Kemal:</b> "Ne lazımsa söyle, sabah getiririm. Peşin çalışırım: kasadaki para kadar mal bırakırım. Süt çabuk bozulur, ona göre."
      </p>
      <p className={styles.till}>
        Kasada <b>{tl(money)}</b> var. Akşam elektriğine de para kalsın.
      </p>
      <ul>
        {PRODUCTS.filter((p) => p.id !== 'ekmek').map((p) => {
          const have = stock[p.id] ?? 0;
          return (
            <li key={p.id} className={have === 0 ? styles.out : ''}>
              <span className={styles.name}>
                {p.emoji} {p.name}
                {SPOIL[p.id] && <small> · bozulur</small>}
              </span>
              <span className={styles.shelf} title="Raftaki yer" aria-label={have ? 'Rafta var' : 'Rafta kalmadı'}>
                {Array.from({ length: SHELF_MAX }, (_, i) => (
                  <i key={i} className={i < have ? styles.full : i < have + (order[p.id] ?? 0) ? styles.coming : ''} />
                ))}
              </span>
              <Stepper
                value={order[p.id] ?? 0}
                max={SHELF_MAX - have}
                onStep={(d) => onChange((o) => ({ ...o, [p.id]: Math.max(0, Math.min(SHELF_MAX - have, (o[p.id] ?? 0) + d)) }))}
                label={p.name}
              />
            </li>
          );
        })}
        <li className={(stock[GUM] ?? 0) === 0 ? styles.out : ''}>
          <span className={styles.name}>
            🍬 Sakız, {GUM_PACK}'lu paket
            <small> · para üstü için</small>
          </span>
          <span className={styles.shelf} title="Kavanoz" aria-label={stock[GUM] ? 'Kavanozda var' : 'Kavanoz boş'}>
            {Array.from({ length: GUM_MAX / GUM_PACK }, (_, i) => (
              <i key={i} className={i < Math.ceil((stock[GUM] ?? 0) / GUM_PACK) ? styles.full : i < Math.ceil((stock[GUM] ?? 0) / GUM_PACK) + (order[GUM] ?? 0) ? styles.coming : ''} />
            ))}
          </span>
          <Stepper
            value={order[GUM] ?? 0}
            max={Math.floor((GUM_MAX - (stock[GUM] ?? 0)) / GUM_PACK)}
            onStep={(d) => onChange((o) => ({ ...o, [GUM]: Math.max(0, Math.min(Math.floor((GUM_MAX - (stock[GUM] ?? 0)) / GUM_PACK), (o[GUM] ?? 0) + d)) }))}
            label="Sakız"
          />
        </li>
      </ul>
    </section>
  );
}
