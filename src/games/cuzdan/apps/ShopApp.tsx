import { useEffect, useState } from 'react';
import { markPlayed } from '../../../arcade/progress';
import { CATEGORY_LABEL, ERA_ITEMS, EVENTS, ITEMS, LIMITS, NOW, type Category, type Year } from '../data';
import { basketCost, basketCount, money, priceIn, rng, themeOf, times, walletOf, type Basket, type Persona } from '../model';
import { sfx } from '../sfx';
import { AppShop, Web2Shop } from './ShopModern';
import { ShopReceipt } from './ShopReceipt';
import type { Goods, Line, Shop } from './shopState';
import a from '../Apps.module.css';
import w from '../ShopWeb2.module.css';
import p from '../ShopApp.module.css';

/*
 * Zaman Makinesi: saatin yılına göre Zaman Bakkalı. İnternet de yıllarla büyür:
 * - 2002–2005: menü çubuklu gezginde çevirmeli bağlantı (modem sesi), sonra Comic Sans başlıklı,
 *   kayan yazılı, "en iyi 800×600'de görüntülenir" bir portal satır satır yüklenir.
 * - 2009–2012: sekmeli gezginde kısa bir ADSL bağlantısı, sonra Web 2.0 e-ticaret sitesi.
 * - 2016–2022: gezgin yok; "zaman" uygulaması açılış ekranından sonra açılır.
 * Cebinde seçtiğin kişinin o yılki parası var; sepeti doldur, kasada bugünkü karşılığını gör.
 */

const DIAL = ['Numara çevriliyor: 0822 …', 'Karşı modem yanıt verdi', 'Kullanıcı adı ve parola doğrulanıyor…', 'Ağa kaydediliyor…', '56 Kbps hızında bağlandı'];
const ADSL = ['ADSL bağlantısı kuruluyor…', '8 Mbps bağlandı'];
const SPLASH = ['zaman', ''];

/** Raf her açılışta başka sırayla dizilir: aynı kategori içinde ürünler karışık gelir. */
function shuffled<T>(salt: number, xs: T[]): T[] {
  const r = rng(salt);
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function ShopApp({ year, persona, onPaid }: { year: Year; persona: Persona; onPaid: (k: number) => void }) {
  const era = themeOf(year);
  const steps = era === 'luna' ? DIAL : era === 'glass' ? ADSL : SPLASH;
  const [step, setStep] = useState(0);
  const [salt] = useState(() => Math.floor(Math.random() * 2 ** 31) + 1);
  const [basket, setBasket] = useState<Basket>({});
  const [paid, setPaid] = useState(false);
  const [warn, setWarn] = useState('');
  const connected = step >= steps.length;
  const wallet = walletOf(year, persona);
  const spent = basketCost(basket, year);
  const left = wallet - spent;

  useEffect(() => {
    if (step === 0 && era === 'luna') sfx.modem();
    if (step >= steps.length) return;
    const t = window.setTimeout(() => setStep(step + 1), era === 'luna' ? 600 : 450);
    return () => window.clearTimeout(t);
  }, [step, era, steps.length]);

  // o yılın rafı: her zamanki ürünler ve o yıla özgü dönem ürünleri
  const limits = LIMITS[year] ?? {};
  const goods: Goods[] = shuffled(salt, [
    ...ERA_ITEMS.filter((e) => e.prices[year] !== undefined).map((e) => ({ id: e.id, name: e.name, unit: e.unit, emoji: e.emoji, cat: 'donem' as const, price: e.prices[year]!, tag: e.tag, soldOut: e.soldOut?.includes(year), limit: limits[e.id] })),
    ...ITEMS.map((it) => ({ id: it.id, name: it.name, unit: it.unit, emoji: it.emoji, cat: it.cat, price: it.prices[year], limit: limits[it.id] })),
  ]);
  const lines: Line[] = goods
    .filter((g) => basket[g.id])
    .map((g) => ({ id: g.id, name: g.name, n: basket[g.id], then: basket[g.id] * g.price, now: priceIn(g.id, NOW) === null ? null : basket[g.id] * priceIn(g.id, NOW)!, nowNote: ERA_ITEMS.find((e) => e.id === g.id)?.nowNote }));
  // kaç kat: yalnızca bugün de satılanlar kıyaslanır
  const then = lines.filter((l) => l.now !== null).reduce((x, l) => x + l.then, 0);
  const now = basketCost(basket, NOW);
  const k = then ? now / then : 0;
  const shop: Shop = {
    year,
    persona,
    goods,
    headline: EVENTS[year].headline,
    news: EVENTS[year].news,
    wallet,
    left,
    basket,
    count: basketCount(basket),
    spent,
    then,
    now,
    k,
    lines,
    paid,
    warn,
    add: (g: Goods) => {
      if (g.soldOut) {
        sfx.error();
        setWarn(`${g.name} tükendi! Herkes aynı şeyi almış.`);
        return;
      }
      if (g.limit && (basket[g.id] ?? 0) >= g.limit) {
        sfx.error();
        setWarn(`${g.name}: kişi başı en fazla ${g.limit} adet.`);
        return;
      }
      if (g.price > left + 1e-9) {
        sfx.error();
        setWarn(`Yetersiz bakiye! Cebinizde ${money(left, year)} kaldı.`);
        return;
      }
      sfx.click();
      setWarn('');
      setBasket({ ...basket, [g.id]: (basket[g.id] ?? 0) + 1 });
    },
    remove: (g: Goods) => {
      const n = (basket[g.id] ?? 0) - 1;
      const next = { ...basket };
      if (n > 0) next[g.id] = n;
      else delete next[g.id];
      setBasket(next);
      setWarn('');
    },
    pay: () => {
      if (!basketCount(basket)) return;
      sfx.ok();
      setPaid(true);
      markPlayed('cuzdan', `${year} sepeti ${times(k)}`);
      onPaid(k);
    },
    reset: () => {
      setPaid(false);
      setBasket({});
    },
  };
  const reload = () => {
    setStep(0);
    shop.reset();
  };

  if (era === 'flat')
    return (
      <div className={p.frame}>
        {!connected ? (
          <div className={p.splash} role="status">
            <span className={p.brand}>zaman</span>
            <small>{year} · market kapında</small>
          </div>
        ) : (
          <AppShop shop={shop} />
        )}
      </div>
    );

  if (era === 'glass')
    return (
      <div className={w.browser}>
        <div className={w.tabStrip} aria-hidden="true">
          <span className={w.tab}>🛒 zamanbakkali.com — Online Alışveriş</span>
          <span className={w.newTab}>+</span>
        </div>
        <div className={w.navBar}>
          <span className={w.round} aria-hidden="true">
            ◀
          </span>
          <span className={w.round} aria-hidden="true">
            ▶
          </span>
          <span className={w.urlBox}>http://www.zamanbakkali.com/{year}</span>
          <button type="button" className={w.round} onClick={reload} aria-label="Yenile">
            ⟳
          </button>
        </div>
        <div className={w.viewport}>
          {!connected ? (
            <div className={w.loading} role="status">
              <span className={w.spinner} aria-hidden="true" />
              {steps[Math.min(step, steps.length - 1)]}
            </div>
          ) : (
            <Web2Shop shop={shop} />
          )}
        </div>
      </div>
    );

  return (
    <div className={a.browser}>
      <div className={a.menu} aria-hidden="true">
        <span>Dosya</span>
        <span>Düzen</span>
        <span>Görünüm</span>
        <span>Sık Kullanılanlar</span>
        <span>Yardım</span>
      </div>
      <div className={a.addr}>
        Adres <span className={a.url}>http://www.zamanbakkali.com.tr/{year}/index.htm</span>
        <button type="button" className={a.btn} onClick={reload}>
          Yenile
        </button>
      </div>
      <div className={a.web}>
        {!connected ? (
          <div className={a.dial}>
            <div className={a.dialBox} role="status">
              <div className={a.modem} aria-hidden="true">
                📞
              </div>
              <b>Çevirmeli Ağ Bağlantısı</b>
              <p>{steps[Math.min(step, steps.length - 1)]}</p>
              <span className={a.prog}>
                <i style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
              </span>
            </div>
          </div>
        ) : (
          <div className={a.page}>
            <h1 className={a.siteTitle}>★ ZAMAN BAKKALI ★</h1>
            <div className={a.marquee} aria-hidden="true">
              <span>
                HOŞGELDİNİZ {persona.name.toLocaleUpperCase('tr-TR')}!!! CEBİNİZDE {money(wallet, year)} VAR · {[shop.headline, ...shop.news].map((x) => x.toLocaleUpperCase('tr-TR')).join(' · ')} · KREDİ KARTI KABUL EDİLMEZ ·
              </span>
            </div>
            <div className={a.cartBar} aria-live="polite">
              🛒 Sepet: {shop.count} ürün · Kalan: {money(Math.max(0, left), year)} <span className={a.blink}>YENİ!</span>
              {warn && <div className={a.warn}>{warn}</div>}
            </div>
            {(['donem', ...Object.keys(CATEGORY_LABEL)] as (Category | 'donem')[]).map((cat) => {
              const shelf = shop.goods.filter((g) => g.cat === cat);
              if (!shelf.length) return null;
              return (
                <section key={cat}>
                  <h2 className={`${a.shelfTitle} ${cat === 'donem' ? a.shelfHot : ''}`}>{cat === 'donem' ? `${year}'E ÖZEL!!! DÖNEMİN RAFI` : CATEGORY_LABEL[cat]}</h2>
                  <div className={a.goods}>
                    {shelf.map((g) => (
                      <div key={g.id} className={a.good}>
                        <span className={a.goodEmoji} aria-hidden="true">
                          {g.emoji}
                        </span>
                        <u>{g.name}</u>
                        {g.tag && <small className={a.goodTag}>{g.tag}</small>}
                        <span className={a.goodPrice}>{money(g.price, year)}</span>
                        {g.limit && <small className={a.goodTag}>kişi başı {g.limit}</small>}
                        <button type="button" disabled={paid || g.soldOut} aria-label={`${g.unit} sepete ekle, ${money(g.price, year)}`} onClick={() => shop.add(g)}>
                          {g.soldOut ? 'TÜKENDİ' : `Sepete Ekle${basket[g.id] ? ` (${basket[g.id]})` : ''}`}
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
            <div className={a.checkout}>
              {!paid ? (
                <button type="button" disabled={!shop.count} onClick={shop.pay}>
                  KASAYA GİT &gt;&gt;
                </button>
              ) : (
                <ShopReceipt shop={shop} c={{ receipt: a.receipt, row: a.between, big: a.blink, btn: a.btn }} />
              )}
            </div>
            <div className={a.construction} aria-hidden="true" />
            <p className={a.footer}>
              Ziyaretçi: <span className={a.counter}>{String(471853 + year).padStart(7, '0')}</span> · En iyi 800×600'de görüntülenir · © {year}
            </p>
          </div>
        )}
      </div>
      <div className={a.status}>
        <span>{connected ? '✔ Bitti' : steps[Math.min(step, steps.length - 1)]}</span>
        <span>🌐 İnternet</span>
      </div>
    </div>
  );
}
