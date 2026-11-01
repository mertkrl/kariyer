import { useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { CATEGORIES, DAILY, PRODUCTS, priceOn, tl } from './data';
import { BREAD_MAX, BULK, GUM, GUM_MAX, GUM_PACK, GUM_PACK_COST, SHELF_MAX, SPOIL, bulkDiscount, bulkRate, orderCost, type Stock } from './week';
import { SHELF_SLOTS, canStock, kindsOf } from './pressure';
import styles from './Order.module.css';

/*
 * Akşam siparişi: ekmek dahil her şey toptancı Kemal'e söylenir. Kemal yarının alış fiyatını
 * söyler, büyük siparişe indirim yapar; satış fiyatını yine oyuncu bulur. Liste iki sütundur. Her satırda birim fiyat ve ara
 * toplam, altta siparişin hesabı: kasadan sabah ne çıkar, akşamki giderlerden sonra ne kalır.
 * Parası sabah mal gelince kasadan peşin çıkar, yetmeyen mal geri gider. Raftaki durum rafın dolu
 * ve boş gözleriyle görünür. Rafa en fazla SHELF_MAX sığar.
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

/** Bir malın yarınki alış fiyatı. */
const unit = (id: string, day: number) => (id === GUM ? GUM_PACK_COST : priceOn(PRODUCTS.find((p) => p.id === id)!, day).cost);

/** Rafa sığan: ekmek dolabına BREAD_MAX, öteki raflara SHELF_MAX. */
const capOf = (id: string) => (id === 'ekmek' ? BREAD_MAX : SHELF_MAX);

/** Eksi tutar: "−1.250 ₺". */
const signed = (n: number) => (n < 0 ? `−${tl(-n)}` : tl(n));

const Head = () => (
  <li className={styles.cols} aria-hidden="true">
    <span>Mal</span>
    <span>Var</span>
    <span>Birim</span>
    <span>Adet</span>
    <span>Tutar</span>
  </li>
);

/** Bir sipariş satırı: ad (tost ve sandviçte içindekiler), raftaki adet, birim fiyat, artı eksi, ara toplam. */
function Row({ name, detail, note, out, have, price, n, max, onStep, label }: { name: ReactNode; detail?: string; note?: string; out: boolean; have: string; price: number; n: number; max: number; onStep: (d: number) => void; label: string }) {
  return (
    <li className={out ? styles.out : ''}>
      <span className={styles.name} title={detail}>
        {name}
        {note && <small> · {note}</small>}
        {detail && <em className={styles.detail}>{detail}</em>}
      </span>
      <span className={`${styles.have} ${out ? styles.haveOut : have !== '–' && Number(have) <= 2 ? styles.haveLow : ''}`}>{out ? 'yok' : have}</span>
      <span className={styles.unit}>{tl(price)}</span>
      <Stepper value={n} max={max} onStep={onStep} label={label} />
      <b className={n ? styles.sum : styles.zero}>{n ? tl(n * price) : '–'}</b>
    </li>
  );
}

/** Kemal'in reyonları: tost ve sandviç tezgâhta hazırlandığı için listede yok. */
const TABS = CATEGORIES.filter((c) => c.id !== 'bufe').map((c) => ({ ...c, ids: c.id === 'diger' ? [...c.ids, GUM] : c.ids }));

/**
 * Toptancı Kemal'in listesi: reyon reyon sekmeler, her sekmede o reyonun malları iki sütun. Her
 * satırda raftaki adet; ekmek, tost ve sandviçin rafı her sabah boşalır (bayatı ya verilir ya
 * tutulur). Sekmenin yanında o reyondan söylenen adet.
 */
export function WholesaleOrder({ stock, order, onChange, day, budget, carried }: { stock: Stock; order: Stock; onChange: Dispatch<SetStateAction<Stock>>; day: number; budget: number; carried: readonly string[] }) {
  const [tab, setTab] = useState(TABS[0].id);
  const have = (id: string) => (DAILY.includes(id) ? 0 : (stock[id] ?? 0));
  const gumMax = Math.floor((GUM_MAX - (stock[GUM] ?? 0)) / GUM_PACK);
  const set = (id: string, max: number, d: number) => onChange((o) => ({ ...o, [id]: Math.max(0, Math.min(max, (o[id] ?? 0) + d)) }));
  // paraya göre doldur: yalnızca dükkânın tuttuğu dayanıklı mallar, en boş raftan başlayarak birer birer
  const fill = () => {
    const next: Stock = Object.fromEntries(Object.entries(order).filter(([id]) => DAILY.includes(id)));
    let left = budget - wholesaleCost(next, day);
    const goods = PRODUCTS.filter((p) => !DAILY.includes(p.id) && carried.includes(p.id));
    for (let added = true; added; ) {
      added = false;
      // rafta göz kalmadıysa tükenmiş malı geri getirmez
      const open = goods.filter((p) => have(p.id) + (next[p.id] ?? 0) < SHELF_MAX && canStock(p.id, stock, next)).sort((a, b) => have(a.id) + (next[a.id] ?? 0) - (have(b.id) + (next[b.id] ?? 0)));
      for (const p of open) {
        const c = unit(p.id, day);
        if (c > left) continue;
        next[p.id] = (next[p.id] ?? 0) + 1;
        left -= c;
        added = true;
      }
    }
    onChange(next);
  };
  const row = (id: string) => {
    if (id === GUM) {
      const g = stock[GUM] ?? 0;
      return <Row key={GUM} name={`🍬 Sakız, ${GUM_PACK}'lu paket`} note="para üstü" out={g === 0} have={String(g)} price={GUM_PACK_COST} n={order[GUM] ?? 0} max={gumMax} onStep={(d) => set(GUM, gumMax, d)} label="Sakız" />;
    }
    const p = PRODUCTS.find((x) => x.id === id)!;
    const h = have(id);
    // rafta göz kalmadıysa tükenmiş ya da yeni mal söylenemez
    const full = !canStock(id, stock, order);
    return (
      <Row
        key={id}
        name={`${p.emoji} ${p.name}`}
        detail={p.detail}
        note={full ? 'raf dolu' : DAILY.includes(id) ? 'akşam bayatlar' : SPOIL[id] ? 'bozulur' : carried.includes(id) ? undefined : 'yeni'}
        out={!DAILY.includes(id) && carried.includes(id) && h === 0}
        have={DAILY.includes(id) ? '–' : String(h)}
        price={unit(id, day)}
        n={order[id] ?? 0}
        max={full ? 0 : capOf(id) - h}
        onStep={(d) => set(id, full ? 0 : capOf(id) - h, d)}
        label={p.name}
      />
    );
  };
  const ids = TABS.find((t) => t.id === tab)!.ids;
  const half = Math.ceil(ids.length / 2);
  const count = (t: (typeof TABS)[number]) => t.ids.reduce((s, id) => s + (order[id] ?? 0), 0);
  return (
    <section className={styles.order} aria-label="Toptancı siparişi">
      <div className={styles.callRow}>
        <p className={styles.call}>
          📞 <b>Toptancı Kemal:</b> "Ekmek de bende. Fiyatlar yarın sabahki alış fiyatım; {BULK.map((b) => `${tl(b.from)} üstüne %${b.rate * 100}`).reverse().join(', ')} indirim."
        </p>
        <div className={styles.quick}>
          <span className={styles.slots} title="Rafta aynı anda bu kadar çeşit mal durur. Tükenen bir malı geri getirmek için boş göz gerekir.">
            Raf gözü {kindsOf(stock, order)}/{SHELF_SLOTS}
          </span>
          <button type="button" onClick={fill} title="Dükkânın tuttuğu mallar, kasadaki para yettiği kadar, akşam giderini ayırarak">
            Paraya göre doldur
          </button>
          <button type="button" onClick={() => onChange({ ekmek: order.ekmek ?? 0 })} disabled={!Object.entries(order).some(([id, n]) => id !== 'ekmek' && n > 0)}>
            Siparişi sil
          </button>
        </div>
      </div>
      <div className={styles.tabs} role="tablist" aria-label="Reyonlar">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? styles.tabOn : ''} onClick={() => setTab(t.id)}>
            {t.label}
            {count(t) > 0 && <b className={styles.badge}>{count(t)}</b>}
          </button>
        ))}
      </div>
      <div className={styles.lists} role="tabpanel">
        <ul>
          <Head />
          {ids.slice(0, half).map(row)}
        </ul>
        <ul>
          <Head />
          {ids.slice(half).map(row)}
        </ul>
      </div>
    </section>
  );
}

/** Siparişin tutarı: Kemal'in mal parası (ekmek ve sakız paketleri dahil), indirimden önce. */
const wholesaleCost = (order: Stock, day: number) => orderCost(Object.fromEntries(Object.entries(order).filter(([id]) => id !== GUM)), day) + Math.max(0, order[GUM] ?? 0) * GUM_PACK_COST;

/**
 * Siparişin hesabı: sabah kasadan Kemal'e ne çıkar (indirimiyle), kasada ne kalır; akşam elektrik
 * (ve haftalıksa vergi) ödenince satış olmasa ne kalır. Para yetmiyorsa ne kadar eksik olduğu.
 */
export function OrderBill({ money, order, day, dues }: { money: number; order: Stock; day: number; dues: { power: number; tax: number } }) {
  const gross = wholesaleCost(order, day);
  const off = bulkDiscount(gross);
  const after = money - gross + off;
  const night = after - dues.power - dues.tax;
  const nextTier = [...BULK].reverse().find((b) => gross < b.from);
  return (
    <section className={styles.bill} aria-label="Siparişin hesabı">
      <h4>🧮 Siparişin hesabı</h4>
      <dl>
        <div>
          <dt>Kasada şu an</dt>
          <dd>{tl(money)}</dd>
        </div>
        <div>
          <dt>Kemal'in malı ({order.ekmek ?? 0} ekmek dahil)</dt>
          <dd className={styles.minus}>−{tl(gross)}</dd>
        </div>
        <div>
          <dt>Toptan indirimi {off ? `(%${bulkRate(gross) * 100})` : ''}</dt>
          <dd className={off ? styles.plus : styles.zero}>{off ? `+${tl(off)}` : '–'}</dd>
        </div>
        <div className={styles.line}>
          <dt>Sabah kasada kalır</dt>
          <dd className={after < 0 ? styles.minus : ''}>{signed(after)}</dd>
        </div>
        <div>
          <dt>Yarın akşam {dues.tax ? 'elektrik + vergi, kira' : 'elektrik'}</dt>
          <dd className={styles.minus}>−{tl(dues.power + dues.tax)}</dd>
        </div>
        <div className={styles.line}>
          <dt>Hiç satış olmazsa akşam</dt>
          <dd className={night < 0 ? styles.minus : styles.plus}>{signed(night)}</dd>
        </div>
      </dl>
      {nextTier && gross > 0 && <p className={styles.hint}>%{nextTier.rate * 100} indirim için {tl(nextTier.from - gross)} daha mal.</p>}
      {after < 0 && <p className={styles.alert}>Kasa {tl(-after)} eksik: sabah yetmeyen mal geri gider.</p>}
      {after >= 0 && night < 0 && <p className={styles.alert}>Akşamki gideri karşılamak için yarın en az {tl(-night)} satış yapmalısın.</p>}
    </section>
  );
}
