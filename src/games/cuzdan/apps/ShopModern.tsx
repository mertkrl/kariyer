import { useState } from 'react';
import { CATEGORY_LABEL, ITEMS, YEAR_NOTE, type Category } from '../data';
import { money } from '../model';
import { ShopReceipt } from './ShopReceipt';
import type { Shop } from './shopState';
import w from '../ShopWeb2.module.css';
import p from '../ShopApp.module.css';

/*
 * Zaman Bakkalı büyüdükçe: 2009–2012'de "zamanbakkali.com" bir Web 2.0 e-ticaret sitesi (parlak logo,
 * "beta" rozeti, sekmeli gezinti, yan menü, yıldızlı ürün kartları, kenarda sepet kutusu, sosyal
 * ağ şeridi); 2016 sonrasında "zaman" adlı bir hızlı market uygulaması (teslimat süresi, adres,
 * arama, kategori çipleri, artı-eksi düğmeleri, altta sabit sepet çubuğu). Sepet hesabı ortak.
 */

const CATS = Object.keys(CATEGORY_LABEL) as Category[];
const stars = (id: string) => 3 + (id.length % 3);

export function Web2Shop({ shop }: { shop: Shop }) {
  const [cat, setCat] = useState<Category | 'hepsi'>('hepsi');
  const { year } = shop;
  const shown = ITEMS.filter((it) => cat === 'hepsi' || it.cat === cat);
  return (
    <div className={w.site}>
      <header className={w.head}>
        <span className={w.logo}>
          zamanbakkali<em>.com</em>
          <sup>beta</sup>
        </span>
        <span className={w.welcome}>
          Merhaba <b>{shop.persona.name}</b> · Cüzdan: <b>{money(Math.max(0, shop.left), year)}</b>
        </span>
      </header>
      <nav className={w.tabs} aria-label="Site menüsü">
        <span className={w.tabOn}>Ana Sayfa</span>
        <span>Kampanyalar</span>
        <span>Sepetim ({shop.count})</span>
        <span>Yardım</span>
      </nav>
      <div className={w.promo}>
        <b>Yeni!</b> {year}'in fiyatlarıyla online alışveriş · {YEAR_NOTE[year]}
      </div>
      <div className={w.body}>
        <aside className={w.side} aria-label="Kategoriler">
          <b>Kategoriler</b>
          {(['hepsi', ...CATS] as const).map((c) => (
            <button key={c} type="button" className={c === cat ? w.sideOn : ''} onClick={() => setCat(c)}>
              {c === 'hepsi' ? 'Tüm ürünler' : CATEGORY_LABEL[c]}
            </button>
          ))}
        </aside>
        <div className={w.grid}>
          {shown.map((it) => (
            <div key={it.id} className={w.card}>
              <span className={w.pic} aria-hidden="true">
                {it.emoji}
              </span>
              <b>{it.name}</b>
              <span className={w.stars} aria-label={`${stars(it.id)} yıldız`}>
                {'★'.repeat(stars(it.id))}
                {'☆'.repeat(5 - stars(it.id))}
              </span>
              <span className={w.price}>{money(it.prices[year], year)}</span>
              <button type="button" className={w.add} disabled={shop.paid} onClick={() => shop.add(it)} aria-label={`${it.unit} sepete at`}>
                Sepete At{shop.basket[it.id] ? ` (${shop.basket[it.id]})` : ''}
              </button>
            </div>
          ))}
        </div>
        <aside className={w.cart} aria-live="polite">
          <b>🛒 Sepetim</b>
          {shop.lines.length === 0 && <p className={w.empty}>Sepetiniz boş.</p>}
          {shop.lines.map((it) => (
            <div key={it.id} className={w.cartRow}>
              <span>
                {shop.basket[it.id]}× {it.name}
              </span>
              <button type="button" onClick={() => shop.remove(it)} aria-label={`${it.name} çıkar`} disabled={shop.paid}>
                ✕
              </button>
            </div>
          ))}
          <div className={w.total}>
            Toplam: <b>{money(shop.spent, year)}</b>
          </div>
          {shop.warn && <p className={w.warn}>{shop.warn}</p>}
          {!shop.paid && (
            <button type="button" className={w.order} disabled={!shop.count} onClick={shop.pay}>
              Siparişi Tamamla »
            </button>
          )}
        </aside>
      </div>
      {shop.paid && <ShopReceipt shop={shop} c={{ receipt: w.receipt, row: w.receiptRow, big: w.big, btn: w.order, btnAlt: w.plain }} />}
      <footer className={w.foot}>
        <span>Bizi takip edin: Arkadaşlarınla paylaş · RSS</span>
        <span>© {year} zamanbakkali.com · Güvenli alışveriş</span>
      </footer>
    </div>
  );
}

export function AppShop({ shop }: { shop: Shop }) {
  const [cat, setCat] = useState<Category | 'hepsi'>('hepsi');
  const [q, setQ] = useState('');
  const { year } = shop;
  const shown = ITEMS.filter((it) => (cat === 'hepsi' || it.cat === cat) && it.name.toLocaleLowerCase('tr-TR').includes(q.toLocaleLowerCase('tr-TR')));
  const eta = 10 + (year % 7);
  return (
    <div className={p.app}>
      <header className={p.head}>
        <div className={p.top}>
          <span className={p.brand}>zaman</span>
          <span className={p.eta}>⚡ {eta} dk</span>
        </div>
        <div className={p.addr}>
          📍 Ev · {shop.persona.name} · cüzdan <b>{money(Math.max(0, shop.left), year)}</b>
        </div>
        <label className={p.search}>
          <span aria-hidden="true">🔍</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ürün ara" aria-label="Ürün ara" />
        </label>
      </header>
      <div className={p.chips} role="tablist" aria-label="Kategoriler">
        {(['hepsi', ...CATS] as const).map((c) => (
          <button key={c} type="button" role="tab" aria-selected={c === cat} className={c === cat ? p.chipOn : p.chip} onClick={() => setCat(c)}>
            {c === 'hepsi' ? 'Tümü' : CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>
      <div className={p.banner}>
        <b>{year}</b> fiyatlarıyla sipariş · {YEAR_NOTE[year]}
      </div>
      <div className={p.grid}>
        {shown.map((it) => {
          const n = shop.basket[it.id] ?? 0;
          return (
            <div key={it.id} className={p.card}>
              <span className={p.pic} aria-hidden="true">
                {it.emoji}
              </span>
              {n > 0 ? (
                <span className={p.stepper}>
                  <button type="button" onClick={() => shop.remove(it)} aria-label={`${it.name} azalt`} disabled={shop.paid}>
                    −
                  </button>
                  <b>{n}</b>
                  <button type="button" onClick={() => shop.add(it)} aria-label={`${it.name} artır`} disabled={shop.paid}>
                    +
                  </button>
                </span>
              ) : (
                <button type="button" className={p.plus} onClick={() => shop.add(it)} aria-label={`${it.unit} ekle`} disabled={shop.paid}>
                  +
                </button>
              )}
              <b className={p.price}>{money(it.prices[year], year)}</b>
              <span className={p.name}>{it.name}</span>
              <small className={p.unit}>{it.unit}</small>
            </div>
          );
        })}
      </div>
      {shop.warn && <p className={p.warn}>{shop.warn}</p>}
      {shop.paid && (
        <div className={p.sheet}>
          <ShopReceipt shop={shop} c={{ receipt: p.receipt, row: p.receiptRow, big: p.big, btn: p.cta, btnAlt: p.ghost }} />
        </div>
      )}
      {shop.count > 0 && !shop.paid && (
        <button type="button" className={p.cartBar} onClick={shop.pay}>
          <span>🛍 {shop.count} ürün</span>
          <b>Siparişi ver · {money(shop.spent, year)}</b>
        </button>
      )}
    </div>
  );
}
