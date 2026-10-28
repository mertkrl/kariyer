import { useState } from 'react';
import { CATEGORY_LABEL, type Category } from '../data';
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

type Cat = Category | 'donem';
const label = (c: Cat | 'hepsi', year: number) => (c === 'hepsi' ? 'Tümü' : c === 'donem' ? `${year}'e özel` : CATEGORY_LABEL[c]);
const catsOf = (shop: Shop): Cat[] => [...new Set(shop.goods.map((g) => g.cat))];
const stars = (id: string) => 3 + (id.length % 3);

export function Web2Shop({ shop }: { shop: Shop }) {
  const [cat, setCat] = useState<Cat | 'hepsi'>('hepsi');
  const { year } = shop;
  const shown = shop.goods.filter((g) => cat === 'hepsi' || g.cat === cat);
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
        <b>Gündem:</b> {shop.headline}
        <span className={w.news}>{shop.news.join(' · ')}</span>
      </div>
      <div className={w.body}>
        <aside className={w.side} aria-label="Kategoriler">
          <b>Kategoriler</b>
          {(['hepsi', ...catsOf(shop)] as const).map((c) => (
            <button key={c} type="button" className={`${c === cat ? w.sideOn : ''} ${c === 'donem' ? w.sideHot : ''}`} onClick={() => setCat(c)}>
              {c === 'hepsi' ? 'Tüm ürünler' : label(c, year)}
            </button>
          ))}
        </aside>
        <div className={w.grid}>
          {shown.map((g) => (
            <div key={g.id} className={w.card}>
              {g.tag && <span className={w.ribbon}>{g.tag}</span>}
              <span className={w.pic} aria-hidden="true">
                {g.emoji}
              </span>
              <b>{g.name}</b>
              <span className={w.stars} aria-label={`${stars(g.id)} yıldız`}>
                {'★'.repeat(stars(g.id))}
                {'☆'.repeat(5 - stars(g.id))}
              </span>
              <span className={w.price}>{money(g.price, year)}</span>
              {g.limit && <small className={w.limit}>Kişi başı {g.limit} adet</small>}
              <button type="button" className={w.add} disabled={shop.paid || g.soldOut} onClick={() => shop.add(g)} aria-label={`${g.unit} sepete at`}>
                {g.soldOut ? 'Stokta yok' : `Sepete At${shop.basket[g.id] ? ` (${shop.basket[g.id]})` : ''}`}
              </button>
            </div>
          ))}
        </div>
        <aside className={w.cart} aria-live="polite">
          <b>🛒 Sepetim</b>
          {shop.lines.length === 0 && <p className={w.empty}>Sepetiniz boş.</p>}
          {shop.lines.map((l) => (
            <div key={l.id} className={w.cartRow}>
              <span>
                {l.n}× {l.name}
              </span>
              <button type="button" onClick={() => shop.remove(shop.goods.find((g) => g.id === l.id)!)} aria-label={`${l.name} çıkar`} disabled={shop.paid}>
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
  const [cat, setCat] = useState<Cat | 'hepsi'>('hepsi');
  const [q, setQ] = useState('');
  const { year } = shop;
  const shown = shop.goods.filter((g) => (cat === 'hepsi' || g.cat === cat) && g.name.toLocaleLowerCase('tr-TR').includes(q.toLocaleLowerCase('tr-TR')));
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
        {(['hepsi', ...catsOf(shop)] as const).map((c) => (
          <button key={c} type="button" role="tab" aria-selected={c === cat} className={c === cat ? p.chipOn : p.chip} onClick={() => setCat(c)}>
            {c === 'donem' ? '🔥 ' : ''}
            {label(c, year)}
          </button>
        ))}
      </div>
      <div className={p.banner}>
        <b>{shop.headline}</b>
        <span className={p.news}>{shop.news.join(' · ')}</span>
      </div>
      <div className={p.grid}>
        {shown.map((g) => {
          const n = shop.basket[g.id] ?? 0;
          return (
            <div key={g.id} className={`${p.card} ${g.soldOut ? p.out : ''}`}>
              <span className={p.pic} aria-hidden="true">
                {g.emoji}
                {g.tag && <span className={p.tag}>{g.tag}</span>}
              </span>
              {n > 0 ? (
                <span className={p.stepper}>
                  <button type="button" onClick={() => shop.remove(g)} aria-label={`${g.name} azalt`} disabled={shop.paid}>
                    −
                  </button>
                  <b>{n}</b>
                  <button type="button" onClick={() => shop.add(g)} aria-label={`${g.name} artır`} disabled={shop.paid}>
                    +
                  </button>
                </span>
              ) : (
                <button type="button" className={p.plus} onClick={() => shop.add(g)} aria-label={`${g.unit} ekle`} disabled={shop.paid || g.soldOut}>
                  +
                </button>
              )}
              <b className={p.price}>{g.soldOut ? 'Tükendi' : money(g.price, year)}</b>
              <span className={p.name}>{g.name}</span>
              <small className={p.unit}>
                {g.unit}
                {g.limit ? ` · kişi başı ${g.limit}` : ''}
              </small>
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
