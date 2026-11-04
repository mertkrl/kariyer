import { useEffect, useState } from 'react';
import { photo, tl, useLater } from './kit';
import type { SiteProps } from './registry';
import s from './CafeSite.module.css';

/*
 * Ilgın'ın yaptığı site: Maltepe'deki üç şubeli bir kafenin sipariş sayfası. Küçük ama baştan sona
 * çalışan bir iş: menü yüklenirken iskelet görünür, sepet sayfalar arasında kalır, adı boş bırakınca
 * form uyarır, kapalı şube seçilemez, sipariş verilince durum sayfası kendiliğinden ilerler.
 * Kusursuz değil: online ödeme yok ve "Kampanyalar" henüz hazır değil; ikisini de saklamıyor.
 */
type Cat = 'kahve' | 'cay' | 'yiyecek';
interface Item {
  name: string;
  price: number;
  note: string;
  cat: Cat;
  art: 'cup' | 'glass' | 'tulip' | 'simit' | 'cake' | 'toast';
  tag?: string;
  out?: boolean;
  /** public/sites/kafe altındaki fotoğraf; yoksa çizim. */
  img?: string;
}
const MENU: Item[] = [
  { img: 'cekirdek', name: 'Filtre kahve', price: 140, note: 'Haftanın çekirdeği: Etiyopya Guji', cat: 'kahve', art: 'cup', tag: 'En çok satan' },
  { img: 'turk-kahvesi', name: 'Türk kahvesi', price: 120, note: 'Yanında lokum', cat: 'kahve', art: 'cup' },
  { img: 'latte', name: 'Latte', price: 165, note: 'Yulaf sütü +30 TL', cat: 'kahve', art: 'glass' },
  { name: 'Soğuk demleme', price: 170, note: '16 saat demleniyor', cat: 'kahve', art: 'glass', out: true },
  { name: 'Demlik çay', price: 90, note: 'Rize, ince belli bardakta', cat: 'cay', art: 'tulip' },
  { name: 'Ihlamur', price: 100, note: 'Kış menüsü', cat: 'cay', art: 'tulip' },
  { name: 'Simit + peynir', price: 110, note: "Sabah 11:00'e kadar", cat: 'yiyecek', art: 'simit' },
  { img: 'tost', name: 'Kaşarlı tost', price: 180, note: 'Sahil şubesinde yok', cat: 'yiyecek', art: 'toast' },
  { img: 'kek', name: 'Havuçlu kek', price: 160, note: "Ayten Hanım'ın tarifi", cat: 'yiyecek', art: 'cake', tag: 'Ev yapımı' },
];
const CATS: { id: Cat; label: string }[] = [
  { id: 'kahve', label: 'Kahveler' },
  { id: 'cay', label: 'Çaylar' },
  { id: 'yiyecek', label: 'Yiyecekler' },
];
const BRANCHES = [
  { name: 'Bağdat Caddesi', addr: 'Bağdat Cd. No: 412, Maltepe', hours: 'Hafta içi 07:30–21:00 · Hafta sonu 09:00–22:00', open: true, wait: 6, x: 70, y: 30 },
  { name: 'Maltepe Sahil', addr: 'Sahil Yolu, Dragos girişi', hours: 'Her gün 08:00–23:00 · Bisiklet park yeri var', open: true, wait: 3, x: 120, y: 92 },
  { name: 'Cevizli Metro', addr: 'Cevizli Metro, B çıkışı yanı', hours: 'Hafta içi 07:00–19:00 · Hafta sonu kapalı', open: false, wait: 0, x: 215, y: 48 },
];
const STATUS = ['Sipariş alındı', 'Hazırlanıyor', 'Hazır: kasadan alabilirsin'];

/** Kendi çizdiği basit ürün illüstrasyonları. */
function Art({ kind }: { kind: Item['art'] }) {
  return (
    <svg viewBox="0 0 64 64" className={s.art} aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#f3e6d4" />
      {kind === 'cup' && (
        <g>
          <path d="M16 28h28v10a12 12 0 0 1-12 12h-4a12 12 0 0 1-12-12z" fill="#fff" stroke="#3b2a1e" strokeWidth="2.5" />
          <path d="M44 31h4a5 5 0 0 1 0 10h-5" fill="none" stroke="#3b2a1e" strokeWidth="2.5" />
          <ellipse cx="30" cy="29" rx="12" ry="2.5" fill="#6b3f22" />
          <path d="M25 22c-2-3 2-5 0-8M33 22c-2-3 2-5 0-8" fill="none" stroke="#c9a88a" strokeWidth="2" strokeLinecap="round" />
        </g>
      )}
      {kind === 'glass' && (
        <g>
          <path d="M20 16h24l-3 34a4 4 0 0 1-4 3H27a4 4 0 0 1-4-3z" fill="#fff" stroke="#3b2a1e" strokeWidth="2.5" />
          <path d="M22 30h20l-1.6 19a3 3 0 0 1-3 2.6H26.6a3 3 0 0 1-3-2.6z" fill="#b57a4c" />
        </g>
      )}
      {kind === 'tulip' && (
        <g>
          <path d="M24 18h16c0 8-4 10-4 16s5 8 5 14H23c0-6 5-8 5-14s-4-8-4-16z" fill="#c4452d" stroke="#3b2a1e" strokeWidth="2.5" />
          <ellipse cx="32" cy="52" rx="13" ry="3" fill="#fff" stroke="#3b2a1e" strokeWidth="2" />
        </g>
      )}
      {kind === 'simit' && (
        <g>
          <circle cx="32" cy="33" r="16" fill="#c8813f" stroke="#3b2a1e" strokeWidth="2.5" />
          <circle cx="32" cy="33" r="6" fill="#f3e6d4" stroke="#3b2a1e" strokeWidth="2" />
        </g>
      )}
      {kind === 'toast' && (
        <g>
          <path d="M14 30l18-12 18 12-18 14z" fill="#e3b06a" stroke="#3b2a1e" strokeWidth="2.5" />
          <path d="M18 31l14 10 14-10" fill="none" stroke="#f6d27a" strokeWidth="3" />
        </g>
      )}
      {kind === 'cake' && (
        <g>
          <path d="M14 38l20-14 16 10v12H14z" fill="#d98a4a" stroke="#3b2a1e" strokeWidth="2.5" />
          <path d="M14 38h36" stroke="#fff" strokeWidth="3" />
          <circle cx="40" cy="27" r="3" fill="#e05a3a" />
        </g>
      )}
    </svg>
  );
}

export function CafeSite({ page, go }: SiteProps) {
  const later = useLater();
  const [loaded, setLoaded] = useState(false);
  const [cat, setCat] = useState<Cat>('kahve');
  const [basket, setBasket] = useState<Record<string, number>>({});
  const [branch, setBranch] = useState(BRANCHES[0].name);
  const [checkout, setCheckout] = useState(false);
  const [name, setName] = useState('');
  const [when, setWhen] = useState('Hemen');
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const [order, setOrder] = useState<{ no: number; name: string; total: number; items: string; when: string } | null>(null);
  const [step, setStep] = useState(0);

  // menü sunucudan gelir: ilk açılışta yarım saniyelik iskelet
  // oxlint-disable-next-line react/exhaustive-deps
  useEffect(() => later(() => setLoaded(true), 550), []);
  // sipariş durumu kendiliğinden ilerler (barista tableti onaylar)
  useEffect(() => {
    if (!order || step >= STATUS.length - 1) return;
    later(() => setStep((n) => n + 1), 2600);
    // oxlint-disable-next-line react/exhaustive-deps
  }, [order, step]);

  const total = MENU.reduce((n, m) => n + (basket[m.name] ?? 0) * m.price, 0);
  const count = Object.values(basket).reduce((n, k) => n + k, 0);
  const b = BRANCHES.find((x) => x.name === branch) ?? BRANCHES[0];
  const nameError = touched && name.trim().length < 2 ? 'Barista seni bu adla çağıracak; en az 2 harf yaz.' : null;
  const change = (item: string, d: number) =>
    setBasket((cur) => {
      const next = { ...cur, [item]: Math.max(0, (cur[item] ?? 0) + d) };
      if (!next[item]) delete next[item];
      return next;
    });
  const send = () => {
    setTouched(true);
    if (name.trim().length < 2) return;
    setSending(true);
    later(() => {
      setOrder({ no: 40 + (count % 9), name: name.trim(), total, items: MENU.filter((m) => basket[m.name]).map((m) => `${basket[m.name]} × ${m.name}`).join(', '), when });
      setStep(0);
      setBasket({});
      setSending(false);
      setCheckout(false);
      go('siparis');
    }, 900);
  };

  return (
    <div className={s.site}>
      <div className={s.notice}>Bugün Maltepe Sahil şubesi 23:00'e kadar açık · Soğuk demleme bitti, yarın sabah tekrar</div>
      <header className={s.head}>
        <button className={s.logo} onClick={() => go('menu')}>
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <circle cx="16" cy="16" r="15" fill="#c8692c" />
            <path d="M9 13h12v5a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z M21 14h2a2.5 2.5 0 0 1 0 5h-2" fill="none" stroke="#fbf6ee" strokeWidth="2" />
          </svg>
          Durak Kahve
        </button>
        <nav className={s.nav}>
          <button className={page === 'menu' ? s.active : ''} onClick={() => go('menu')}>Sipariş ver</button>
          <button className={page === 'subeler' ? s.active : ''} onClick={() => go('subeler')}>Şubeler</button>
          <button className={page === 'kampanyalar' ? s.active : ''} onClick={() => go('kampanyalar')}>Kampanyalar</button>
          {order && <button className={page === 'siparis' ? s.active : ''} onClick={() => go('siparis')}>Siparişim</button>}
        </nav>
        <button
          className={s.cartBadge}
          onClick={() => {
            go('menu');
            setCheckout(count > 0);
          }}
          aria-label={`Sepette ${count} ürün`}
        >
          🛍 {count}
        </button>
      </header>

      {page === 'menu' && (
        <>
          <section className={s.hero} style={{ backgroundImage: `linear-gradient(90deg, rgba(36, 24, 16, 0.92) 0%, rgba(36, 24, 16, 0.7) 55%, rgba(36, 24, 16, 0.25) 100%), url(${photo('kafe/cekirdek.jpg')})` }}>
            <div>
              <small className={s.kicker}>Maltepe · 2016'dan beri · 3 şube</small>
              <h1>Sıra beklemeden al.</h1>
              <p>Siparişini buradan ver, hazır olunca adını söyleyelim. Ödemeyi kasada yaparsın; kart da nakit de olur.</p>
              <label className={s.branchPick}>
                Hangi şubeden alacaksın?
                <select value={branch} onChange={(e) => setBranch(e.target.value)}>
                  {BRANCHES.map((x) => (
                    <option key={x.name} value={x.name} disabled={!x.open}>
                      {x.name}
                      {x.open ? ` · şu an ~${x.wait} dk` : ' · şu an kapalı'}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className={s.heroCard}>
              <b>{b.name}</b>
              <span>{b.addr}</span>
              <span className={s.open}>Açık · tahmini hazırlık {b.wait} dk</span>
            </div>
          </section>

          <main className={s.main}>
            <section>
              <div className={s.tabs} role="tablist">
                {CATS.map((c) => (
                  <button key={c.id} role="tab" aria-selected={cat === c.id} className={cat === c.id ? s.tabOn : ''} onClick={() => setCat(c.id)}>
                    {c.label}
                  </button>
                ))}
              </div>
              <ul className={s.menu} aria-busy={!loaded}>
                {!loaded
                  ? [0, 1, 2].map((i) => (
                      <li key={i} className={s.skeleton}>
                        <i />
                        <span />
                      </li>
                    ))
                  : MENU.filter((m) => m.cat === cat).map((m) => (
                      <li key={m.name} className={m.out ? s.soldOut : ''}>
                        {m.img ? <img className={s.thumb} src={photo(`kafe/${m.img}.jpg`)} alt={m.name} loading="lazy" /> : <Art kind={m.art} />}
                        <div className={s.itemText}>
                          <b>
                            {m.name} {m.tag && <em>{m.tag}</em>}
                          </b>
                          <small>{m.out ? 'Bugünlük bitti' : m.note}</small>
                        </div>
                        <span className={s.price}>{tl(m.price)}</span>
                        {m.out ? (
                          <span className={s.outLabel}>Tükendi</span>
                        ) : basket[m.name] ? (
                          <span className={s.qty}>
                            <button onClick={() => change(m.name, -1)} aria-label={`${m.name} azalt`}>−</button>
                            <b>{basket[m.name]}</b>
                            <button onClick={() => change(m.name, 1)} aria-label={`${m.name} artır`}>+</button>
                          </span>
                        ) : (
                          <button className={s.add} onClick={() => change(m.name, 1)}>
                            Ekle
                          </button>
                        )}
                      </li>
                    ))}
              </ul>
            </section>

            <aside className={s.basket} aria-label="Sepet">
              <h2>Siparişin</h2>
              <p className={s.where}>{branch} şubesinden</p>
              {total === 0 ? (
                <p className={s.empty}>Henüz bir şey eklemedin.</p>
              ) : (
                <ul>
                  {MENU.filter((m) => basket[m.name]).map((m) => (
                    <li key={m.name}>
                      {basket[m.name]} × {m.name}
                      <span>{tl(basket[m.name] * m.price)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className={s.total}>
                Toplam <b>{tl(total)}</b>
              </div>

              {!checkout ? (
                <button className={s.order} disabled={total === 0} onClick={() => setCheckout(true)}>
                  Devam et
                </button>
              ) : (
                <form
                  className={s.checkout}
                  noValidate
                  onSubmit={(e) => {
                    e.preventDefault();
                    send();
                  }}
                >
                  <label>
                    Adın
                    <input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => setTouched(true)} placeholder="Barista seni böyle çağıracak" aria-invalid={!!nameError} />
                  </label>
                  {nameError && <small className={s.fieldError}>{nameError}</small>}
                  <label>
                    Ne zaman alacaksın?
                    <select value={when} onChange={(e) => setWhen(e.target.value)}>
                      <option>Hemen</option>
                      <option>15 dk sonra</option>
                      <option>30 dk sonra</option>
                    </select>
                  </label>
                  <button className={s.order} disabled={sending || total === 0}>
                    {sending ? 'Gönderiliyor…' : `Siparişi gönder · ${tl(total)}`}
                  </button>
                  <button type="button" className={s.linkBtn} onClick={() => setCheckout(false)}>
                    Sepete dön
                  </button>
                </form>
              )}
              <small className={s.hint}>Ödeme kasada. Online ödeme henüz yok.</small>
            </aside>
          </main>

          <section className={s.story}>
            <img src={photo('kafe/turk-kahvesi.jpg')} alt="Mavi fincanda Türk kahvesi ve bir bardak su" loading="lazy" />
            <div>
              <small className={s.kicker}>Hikâyemiz</small>
              <h2>Bir mahalle kahvecisi olarak başladık.</h2>
              <p>2016'da Bağdat Caddesi'nde dört masalık bir dükkân açtık. Çekirdeklerimizi hâlâ haftada iki kez Kadıköy'de küçük bir kavurucudan alıyoruz; kekleri Ayten Hanım her sabah kendisi yapıyor.</p>
              <p>Üç şubede 14 kişiyiz. Sabah 8'de kapıda sıra olursa, artık telefonundan sipariş verip sıranı beklemeden alabiliyorsun.</p>
            </div>
          </section>

          <section className={s.reviews}>
            <div className={s.rating}>
              <b>4,8</b>
              <span className={s.stars}>★★★★★</span>
              <small>612 değerlendirme</small>
            </div>
            {[
              ['Ece K.', 'Sabah işe giderken siparişi metroda veriyorum, vardığımda hazır oluyor. Filtre kahveleri gerçekten iyi.'],
              ['Murat T.', 'Havuçlu kek için bile gelinir. Sahil şubesinin bahçesi hafta sonu çok güzel.'],
              ['Selin A.', 'Kapalı şubeden sipariş verememek başta garip geldi ama mantıklı; bir kere boşuna gitmiştim.'],
            ].map(([who, text]) => (
              <blockquote key={who}>
                <span className={s.stars}>★★★★★</span>
                <p>"{text}"</p>
                <footer>{who}</footer>
              </blockquote>
            ))}
          </section>

          <section className={s.gallery} aria-label="Fotoğraflar">
            {['latte', 'kek', 'tost', 'cekirdek'].map((g) => (
              <img key={g} src={photo(`kafe/${g}.jpg`)} alt="" loading="lazy" />
            ))}
          </section>
        </>
      )}

      {page === 'siparis' && (
        <main className={s.page}>
          {order ? (
            <div className={s.status}>
              <small>Sıra numaran</small>
              <b className={s.no}>{order.no}</b>
              <p>
                {order.name} · {order.items} · {tl(order.total)} · {order.when}
              </p>
              <ol className={s.steps}>
                {STATUS.map((t, i) => (
                  <li key={t} className={i < step ? s.done : i === step ? s.now : ''}>
                    {t}
                  </li>
                ))}
              </ol>
              <p className={s.hint}>Bu sayfa kendiliğinden güncellenir; yenilemene gerek yok.</p>
            </div>
          ) : (
            <p>Henüz bir siparişin yok.</p>
          )}
        </main>
      )}

      {page === 'subeler' && (
        <main className={s.page}>
          <h1>Şubeler</h1>
          <svg viewBox="0 0 280 130" className={s.map} aria-label="Şubelerin haritası">
            <rect width="280" height="130" fill="#e9e2d2" />
            <path d="M0 105 C60 95 110 120 170 108 S250 95 280 100 V130 H0z" fill="#9cc3d5" />
            <path d="M0 60 H280 M140 0 V100 M40 0 L90 100" stroke="#fff" strokeWidth="5" />
            <text x="200" y="122" fontSize="9" fill="#4d7a8f">Marmara Denizi</text>
            {BRANCHES.map((x) => (
              <g key={x.name}>
                <circle cx={x.x} cy={x.y} r="7" fill={x.open ? '#c8692c' : '#8a705c'} stroke="#fff" strokeWidth="2" />
                <text x={x.x + 10} y={x.y + 4} fontSize="9" fill="#3b2a1e">{x.name}</text>
              </g>
            ))}
          </svg>
          <ul className={s.branches}>
            {BRANCHES.map((x) => (
              <li key={x.name}>
                <b>
                  {x.name} <span className={x.open ? s.open : s.closed}>{x.open ? 'Şu an açık' : 'Şu an kapalı'}</span>
                </b>
                <span>{x.addr}</span>
                <small>{x.hours}</small>
                {x.open && (
                  <button
                    className={s.linkBtn}
                    onClick={() => {
                      setBranch(x.name);
                      go('menu');
                    }}
                  >
                    Bu şubeden sipariş ver →
                  </button>
                )}
              </li>
            ))}
          </ul>
        </main>
      )}

      {page === 'kampanyalar' && (
        <main className={s.page}>
          <h1>Kampanyalar</h1>
          <div className={s.soon}>
            <b>Bu sayfa henüz hazır değil.</b>
            <p>Sadakat kartı (10. kahve bizden) Mart'ta açılacak. O zamana kadar kâğıt kartlar kasada.</p>
          </div>
        </main>
      )}

      <footer className={s.foot}>
        <div>
          <b>Durak Kahve</b>
          <span>Maltepe, İstanbul · 0216 555 04 12</span>
        </div>
        <div>
          <span>@durakkahve</span>
          <span>KVKK aydınlatma metni</span>
        </div>
      </footer>
    </div>
  );
}
