import { useState } from 'react';
import { photo, tl, useLater } from './kit';
import type { SiteProps } from './registry';
import s from './ZeynepSite.module.css';

/*
 * Zeynep'in hafta sonları kurduğu küçük bir online market: Ege'den yöresel ürünler. Sıradan bir
 * alışveriş sitesi; ama yük altında sepet ve ödeme işi yapmış birinin dikkatleri görünür: stoktan
 * fazlası sepete girmez, indirim kodunun neden geçmediği söylenir, kargo bedavaya ne kaldığı
 * hesaplanır, sipariş iki kez gönderilemez.
 */
interface Product {
  id: string;
  name: string;
  from: string;
  price: number;
  stock: number;
  color: string;
  img?: string;
}
const PRODUCTS: Product[] = [
  { id: 'zeytinyagi', img: 'zeytinyagi', name: 'Erken hasat zeytinyağı 1 L', from: 'Ayvalık', price: 420, stock: 12, color: '#7a8b3c' },
  { id: 'bal', img: 'bal', name: 'Çam balı 850 g', from: 'Marmaris', price: 390, stock: 2, color: '#d49a2a' },
  { id: 'kekik', name: 'Kekik 100 g', from: 'Bozdağ', price: 85, stock: 30, color: '#5f7a5a' },
  { id: 'incir', img: 'incir', name: 'Kuru incir 500 g', from: 'Aydın', price: 160, stock: 0, color: '#8a5a7a' },
  { id: 'tarhana', name: 'Ev tarhanası 500 g', from: 'Uşak', price: 140, stock: 8, color: '#c96f3b' },
  { id: 'peynir', img: 'peynir', name: 'Keçi tulum peyniri 400 g', from: 'İzmir', price: 230, stock: 5, color: '#e3d6b0' },
];
const FREE_SHIP = 600;
const SHIP = 79;

export function ZeynepSite({ page, go }: SiteProps) {
  const later = useLater();
  const [q, setQ] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [warn, setWarn] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [codeMsg, setCodeMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState<string | null>(null);

  const items = PRODUCTS.filter((p) => cart[p.id]);
  const subtotal = items.reduce((n, p) => n + p.price * cart[p.id], 0);
  const off = Math.round(subtotal * discount);
  const ship = subtotal - off >= FREE_SHIP || subtotal === 0 ? 0 : SHIP;
  const total = subtotal - off + ship;
  const count = Object.values(cart).reduce((n, k) => n + k, 0);
  const list = PRODUCTS.filter((p) => `${p.name} ${p.from}`.toLocaleLowerCase('tr').includes(q.toLocaleLowerCase('tr')));

  const add = (p: Product, d = 1) => {
    const now = cart[p.id] ?? 0;
    if (now + d > p.stock) return setWarn(`${p.name}: stokta yalnızca ${p.stock} adet var.`);
    setWarn(null);
    setPlaced(null);
    setCart((c) => {
      const next = { ...c, [p.id]: now + d };
      if (!next[p.id]) delete next[p.id];
      return next;
    });
  };
  const apply = () => {
    const c = code.trim().toUpperCase();
    if (!c) return setCodeMsg({ ok: false, text: 'Bir kod yaz.' });
    if (c === 'BAHAR10') {
      if (subtotal < 300) return setCodeMsg({ ok: false, text: `BAHAR10 en az ${tl(300)} alışverişte geçerli. ${tl(300 - subtotal)} daha ekle.` });
      setDiscount(0.1);
      return setCodeMsg({ ok: true, text: 'BAHAR10 uygulandı: %10 indirim.' });
    }
    if (c === 'KIS20') return setCodeMsg({ ok: false, text: 'KIS20 kodunun süresi 28 Şubat\'ta doldu.' });
    setCodeMsg({ ok: false, text: `"${c}" diye bir kod bulamadık.` });
  };

  return (
    <div className={s.site}>
      <div className={s.strip}>{tl(FREE_SHIP)} üzeri kargo bedava · Siparişler 1 iş gününde kargoda</div>
      <header className={s.head}>
        <button className={s.logo} onClick={() => go('home')}>
          Ege Sepeti
        </button>
        <input className={s.search} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ürün ya da yöre ara (ör. bal, Ayvalık)" aria-label="Ürün ara" />
        <button className={s.cartBtn} onClick={() => go('sepet')}>
          Sepet <b>{count}</b>
        </button>
      </header>

      {page === 'home' && (
        <main className={s.main}>
          <section className={s.hero}>
            <div>
              <small className={s.kicker}>Bahar hasadı geldi</small>
              <h1>Üreticisinden, aracısız.</h1>
              <p className={s.lead}>Ege köylerindeki 14 üreticiden zeytinyağı, bal, peynir ve kuru meyve. Her ürünün hangi köyden, kimden geldiği yazılı.</p>
              <div className={s.trust}>
                <span>🚚 1 iş gününde kargoda</span>
                <span>💳 Kapıda ödeme</span>
                <span>↩ 14 gün içinde iade</span>
              </div>
            </div>
            <img src={photo('market/zeytinyagi.jpg')} alt="Cam şişede zeytinyağı" />
          </section>
          <h2 className={s.sectionTitle}>Ürünler</h2>
          {warn && (
            <p className={s.warn} role="alert">
              {warn}
            </p>
          )}
          {list.length === 0 ? (
            <p className={s.empty}>"{q}" için ürün bulamadık. Başka bir kelime dene.</p>
          ) : (
            <ul className={s.grid}>
              {list.map((p) => (
                <li key={p.id} className={p.stock === 0 ? s.out : ''}>
                  <div className={s.pic} style={{ background: p.color }}>
                    {p.img ? <img src={photo(`market/${p.img}.jpg`)} alt={p.name} loading="lazy" /> : <i className={s.icon} aria-hidden="true">{p.id === 'kekik' ? '🌿' : '🥣'}</i>}
                    <span>{p.from}</span>
                  </div>
                  <b>{p.name}</b>
                  <span className={s.price}>{tl(p.price)}</span>
                  <small className={p.stock > 0 && p.stock <= 3 ? s.low : ''}>{p.stock === 0 ? 'Tükendi' : p.stock <= 3 ? `Son ${p.stock} ürün` : 'Stokta'}</small>
                  <button disabled={p.stock === 0} onClick={() => add(p)}>
                    {cart[p.id] ? `Sepette ${cart[p.id]} · bir tane daha` : 'Sepete ekle'}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <section className={s.makers}>
            <h2 className={s.sectionTitle}>Üreticilerimiz</h2>
            <div>
              {[
                ['Ayşe & Hasan Yılmaz', 'Ayvalık · zeytinyağı', 'Üç kuşaktır aynı bahçe. Zeytin elle toplanıyor, 6 saat içinde sıkılıyor.', 'zeytinyagi'],
                ['Kemal Usta', 'Marmaris · çam balı', "Kovanlar Eylül'e kadar dağda. Balı süzüp doğrudan kavanozluyor.", 'bal'],
                ['Kınık Kadın Kooperatifi', 'Aydın · kuru incir', '42 kadın üye. İncirler güneşte, tel kafeslerde kurutuluyor.', 'incir'],
              ].map(([n, w, t, img]) => (
                <article key={n}>
                  <img src={photo(`market/${img}.jpg`)} alt="" loading="lazy" />
                  <b>{n}</b>
                  <small>{w}</small>
                  <p>{t}</p>
                </article>
              ))}
            </div>
          </section>

          <section className={s.quote}>
            <p>"Siparişim ertesi gün geldi; bal kavanozu kâğıda sarılmış, üstünde üreticinin el yazısıyla bir not vardı."</p>
            <small>★★★★★ · Deniz Y., İstanbul · 1.240 değerlendirmeden biri</small>
          </section>
        </main>
      )}

      {page === 'sepet' && (
        <main className={s.main}>
          <h1>Sepetim</h1>
          {placed ? (
            <div className={s.done} role="status">
              <b>Siparişin alındı · {placed}</b>
              <p>Onay e-postası gönderdik. Kargoya verilince takip numarası gelecek.</p>
              <button onClick={() => go('home')}>Alışverişe dön</button>
            </div>
          ) : items.length === 0 ? (
            <p className={s.empty}>Sepetin boş.</p>
          ) : (
            <div className={s.cartLayout}>
              <ul className={s.lines}>
                {items.map((p) => (
                  <li key={p.id}>
                    <div className={s.dot} style={{ background: p.color }} />
                    <div>
                      <b>{p.name}</b>
                      <small>{p.from}</small>
                    </div>
                    <span className={s.qty}>
                      <button onClick={() => add(p, -1)} aria-label="Azalt">−</button>
                      {cart[p.id]}
                      <button onClick={() => add(p, 1)} aria-label="Artır" disabled={cart[p.id] >= p.stock}>
                        +
                      </button>
                    </span>
                    <b>{tl(p.price * cart[p.id])}</b>
                  </li>
                ))}
                {warn && <p className={s.warn}>{warn}</p>}
              </ul>
              <aside className={s.summary}>
                <div className={s.ship}>
                  {ship === 0 ? (
                    <span>🎉 Kargo bedava</span>
                  ) : (
                    <span>Kargonun bedava olmasına {tl(FREE_SHIP - (subtotal - off))} kaldı</span>
                  )}
                  <i>
                    <em style={{ width: `${Math.min(100, ((subtotal - off) / FREE_SHIP) * 100)}%` }} />
                  </i>
                </div>
                <div className={s.code}>
                  <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="İndirim kodu" aria-label="İndirim kodu" />
                  <button onClick={apply}>Uygula</button>
                </div>
                {codeMsg && <small className={codeMsg.ok ? s.okText : s.badText}>{codeMsg.text}</small>}
                <dl>
                  <dt>Ara toplam</dt>
                  <dd>{tl(subtotal)}</dd>
                  {off > 0 && (
                    <>
                      <dt>İndirim</dt>
                      <dd>−{tl(off)}</dd>
                    </>
                  )}
                  <dt>Kargo</dt>
                  <dd>{ship ? tl(ship) : 'Bedava'}</dd>
                  <dt className={s.totalRow}>Toplam</dt>
                  <dd className={s.totalRow}>{tl(total)}</dd>
                </dl>
                <button
                  className={s.pay}
                  disabled={placing}
                  onClick={() => {
                    setPlacing(true);
                    later(() => {
                      setPlaced(`ES-${2400 + count}`);
                      setCart({});
                      setDiscount(0);
                      setCodeMsg(null);
                      setPlacing(false);
                    }, 1100);
                  }}
                >
                  {placing ? 'Sipariş veriliyor…' : 'Siparişi tamamla'}
                </button>
                <small className={s.note}>Kapıda kartla ya da nakit ödeme.</small>
              </aside>
            </div>
          )}
        </main>
      )}

      <footer className={s.foot}>Ege Sepeti · İzmir</footer>
    </div>
  );
}
