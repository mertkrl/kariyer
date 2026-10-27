import { useEffect, useState } from 'react';
import { markPlayed } from '../../../arcade/progress';
import { CATEGORY_LABEL, ITEMS, NOW, YEAR_NOTE, type Category, type Item, type Year } from '../data';
import { basketCost, basketCount, money, themeOf, times, walletFor, type Basket, type Persona } from '../model';
import { sfx } from '../sfx';
import { AppShop, Web2Shop } from './ShopModern';
import { ShopReceipt } from './ShopReceipt';
import type { Shop } from './shopState';
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

export function ShopApp({ year, persona, onPaid }: { year: Year; persona: Persona; onPaid: (k: number) => void }) {
  const era = themeOf(year);
  const steps = era === 'luna' ? DIAL : era === 'glass' ? ADSL : SPLASH;
  const [step, setStep] = useState(0);
  const [basket, setBasket] = useState<Basket>({});
  const [paid, setPaid] = useState(false);
  const [warn, setWarn] = useState('');
  const connected = step >= steps.length;
  const wallet = walletFor(year, persona.share);
  const spent = basketCost(basket, year);
  const left = wallet - spent;

  useEffect(() => {
    if (step === 0 && era === 'luna') sfx.modem();
    if (step >= steps.length) return;
    const t = window.setTimeout(() => setStep(step + 1), era === 'luna' ? 600 : 450);
    return () => window.clearTimeout(t);
  }, [step, era, steps.length]);

  const now = basketCost(basket, NOW);
  const k = spent ? now / spent : 0;
  const shop: Shop = {
    year,
    persona,
    wallet,
    left,
    basket,
    count: basketCount(basket),
    spent,
    now,
    k,
    lines: ITEMS.filter((it) => basket[it.id]),
    paid,
    warn,
    add: (it: Item) => {
      if (it.prices[year] > left + 1e-9) {
        sfx.error();
        setWarn(`Yetersiz bakiye! Cebinizde ${money(left, year)} kaldı.`);
        return;
      }
      sfx.click();
      setWarn('');
      setBasket({ ...basket, [it.id]: (basket[it.id] ?? 0) + 1 });
    },
    remove: (it: Item) => {
      const n = (basket[it.id] ?? 0) - 1;
      const next = { ...basket };
      if (n > 0) next[it.id] = n;
      else delete next[it.id];
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
                HOŞGELDİNİZ {persona.name.toLocaleUpperCase('tr-TR')}!!! {year} FİYATLARIYLA ALIŞVERİŞ · CEBİNİZDE {money(wallet, year)} VAR · {YEAR_NOTE[year].toLocaleUpperCase('tr-TR')} · KREDİ KARTI KABUL EDİLMEZ ·
              </span>
            </div>
            <div className={a.cartBar} aria-live="polite">
              🛒 Sepet: {shop.count} ürün · Kalan: {money(Math.max(0, left), year)} <span className={a.blink}>YENİ!</span>
              {warn && <div className={a.warn}>{warn}</div>}
            </div>
            {(Object.keys(CATEGORY_LABEL) as Category[]).map((cat) => (
              <section key={cat}>
                <h2 className={a.shelfTitle}>{CATEGORY_LABEL[cat]}</h2>
                <div className={a.goods}>
                  {ITEMS.filter((it) => it.cat === cat).map((it) => (
                    <div key={it.id} className={a.good}>
                      <span className={a.goodEmoji} aria-hidden="true">
                        {it.emoji}
                      </span>
                      <u>{it.name}</u>
                      <span className={a.goodPrice}>{money(it.prices[year], year)}</span>
                      <button type="button" disabled={paid} aria-label={`${it.unit} sepete ekle, ${money(it.prices[year], year)}`} onClick={() => shop.add(it)}>
                        Sepete Ekle{basket[it.id] ? ` (${basket[it.id]})` : ''}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            ))}
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
