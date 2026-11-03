import type { Dispatch, SetStateAction } from 'react';
import { Finale } from '../../arcade/Finale';
import { ShareButton } from '../../arcade/ShareButton';
import { CUSTOMERS, DAILY, PRODUCTS, priceOn, titleFor, tl, type Debt, type Product } from './data';
import { OrderBill, WholesaleOrder } from './Order';
import { ethicsTitle, type Flow, type Stock } from './week';
import { bestSellers, type Receipt } from './returns';
import styles from './BakkalGame.module.css';
import sheet from './DayEnd.module.css';

/*
 * Kepenk kapalıyken görünen kartlar: açılıştaki kısa emanet notu (kurallar dükkânın içindeki tanıtımda); akşam kepenk inince günün kasa
 * defteri, kasanın gün gün grafiği ve yarının siparişleri; dükkân batınca ya da devredilince
 * Şükrü Amca'nın karnesi.
 */

export function IntroCard({ onOpen, busy, resumeDay, onResume }: { onOpen: () => void; busy: boolean; resumeDay?: number; onResume?: () => void }) {
  return (
    <main className={styles.card}>
      <h2>Dükkân artık senin</h2>
      <p>Şükrü Amca bir aylığına memlekete gitti, bakkalı sana bıraktı. Etiket yok: fiyatı sen söylersin.</p>
      <p>Otuz gün sonra dönecek: dükkânı batırmadan, köyü küstürmeden teslim et. Gerisini içeride kendisi gösterecek.</p>
      {onResume && resumeDay ? (
        <div className={styles.introActions}>
          <button className={styles.primary} onClick={onResume} disabled={busy}>
            {resumeDay}. günün akşamından devam et
          </button>
          <button className={styles.secondary} onClick={onOpen} disabled={busy}>
            🗑 Kaydı sil, baştan aç
          </button>
        </div>
      ) : (
        <button className={styles.primary} onClick={onOpen} disabled={busy}>
          Kepengi aç
        </button>
      )}
    </main>
  );
}

/** Kasanın gün gün seyri: sıfır çizgisi, son gün noktası. */
function CashChart({ history }: { history: number[] }) {
  const w = 300;
  const h = 70;
  const lo = Math.min(0, ...history);
  const hi = Math.max(1, ...history);
  const x = (i: number) => (history.length < 2 ? w : (i / (history.length - 1)) * w);
  const y = (v: number) => h - 4 - ((v - lo) / (hi - lo || 1)) * (h - 8);
  const pts = history.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const last = history[history.length - 1];
  return (
    <figure className={sheet.chart}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" x2={w} y1={y(0)} y2={y(0)} className={sheet.zero} />
        <polyline points={`0,${h} ${pts} ${w},${h}`} className={sheet.area} />
        <polyline points={pts} className={sheet.line} />
        <circle cx={x(history.length - 1)} cy={y(last)} r="3.5" className={last < 0 ? sheet.dotNeg : sheet.dot} />
      </svg>
      <figcaption>Kasa, gün gün · açılış {tl(history[0])}</figcaption>
    </figure>
  );
}

const FLOW_LABELS: [keyof Flow, string][] = [
  ['sales', 'Satışlar'],
  ['rounding', 'Para üstü yuvarlama'],
  ['accounts', 'Eski hesaplar'],
  ['collected', 'Veresiye tahsilatı'],
  ['loan', 'Nazmiye Nine (borç)'],
  ['wholesale', 'Toptancının malı'],
  ['bakery', 'Fırının ekmeği'],
  ['power', 'Elektrik, buzdolabı'],
  ['tax', 'Vergi, kira ve aidat'],
  ['charity', 'Hayırseverin ödediği veresiye'],
  ['fine', 'Zabıta cezası'],
  ['bufe', 'Tost, sandviç malzemesi'],
  ['refund', 'İade edilen mal'],
  ['gift', 'Paketten çıkan hediye'],
];

const names = (ps: Product[]) => ps.map((p) => p.name.replace(/ \(.*\)$/, '').toLocaleLowerCase('tr-TR')).join(', ');

/**
 * Kasanın gün sonu Z raporu: termal fiş gibi. Bugün en çok satanlar adetle ve küçük çubukla,
 * en çok kazandıran mal. Fişler kasanın çekmecesinden okunur.
 */
function ZReport({ day, receipts }: { day: number; receipts: readonly Receipt[] }) {
  const rows = bestSellers(receipts, day);
  const top = rows.slice(0, 5);
  const most = Math.max(1, ...top.map((r) => r.count));
  const earner = [...rows].sort((a, b) => b.revenue - a.revenue)[0];
  const today = receipts.filter((r) => r.day === day);
  return (
    <section className={sheet.z} aria-label="Gün sonu Z raporu: çok satanlar">
      <header>
        <b>ŞÜKRÜ BAKKALİYE</b>
        <span>Z RAPORU · {day}. GÜN</span>
        <span>
          {today.length} FİŞ · {tl(today.reduce((s, r) => s + r.total, 0))}
        </span>
      </header>
      {top.length ? (
        <>
          <h3>Çok satanlar</h3>
          <ol>
            {top.map((r, i) => (
              <li key={r.id}>
                <span className={sheet.zName}>
                  {i + 1}. {r.emoji} {r.name.replace(/ \(.*\)$/, '')}
                </span>
                <span className={sheet.zDots} />
                <b>{r.count} ad.</b>
                <span className={sheet.zTrack}>
                  <i className={sheet.zBar} style={{ width: `${(r.count / most) * 100}%` }} />
                </span>
              </li>
            ))}
          </ol>
          {earner && (
            <p className={sheet.zNote}>
              💰 En çok kazandıran: <b>{earner.name.replace(/ \(.*\)$/, '')}</b> ({tl(earner.revenue)})
            </p>
          )}
        </>
      ) : (
        <p className={sheet.zNote}>Bugün fiş kesilmedi.</p>
      )}
      <footer>*** MALİ DEĞERİ YOKTUR ***</footer>
    </section>
  );
}

export function DayEndCard({
  day,
  sales,
  visitors,
  money,
  flow,
  history,
  repFrom,
  rep,
  unpaid,
  paidToday,
  lostToday,
  dues,
  old,
  spoiled,
  keep,
  onKeep,
  short,
  stock,
  order,
  onOrder,
  carried,
  shelf,
  lowRep,
  receipts,
  befriended = [],
  supplyNote,
  onNext,
}: {
  day: number;
  sales: number;
  visitors: number;
  money: number;
  flow: Flow;
  history: number[];
  repFrom: number;
  rep: number;
  unpaid: number;
  paidToday: Debt[];
  /** Bu akşam vadesi dolup batan veresiyeler. */
  lostToday: Debt[];
  /** Yarın akşam kasadan çıkacak giderler. */
  dues: { power: number; tax: number };
  /** Raftaki bayat ve bozuk mal (bu gece bozulanlar dahil). */
  old: Stock;
  /** Bu gece bayatlayan ya da bozulan. */
  spoiled: Stock;
  /** Hangi bayat mal rafta tutulacak (gerisi sabah atılır). */
  keep: Record<string, boolean>;
  onKeep: Dispatch<SetStateAction<Record<string, boolean>>>;
  /** Sabah kasadaki para yetmeyen mal geri gitti. */
  short: boolean;
  stock: Stock;
  order: Stock;
  onOrder: Dispatch<SetStateAction<Stock>>;
  /** Dükkânın tuttuğu mallar. */
  carried: readonly string[];
  /** Raftaki malın alış fiyatıyla değeri. */
  shelf: number;
  /** İtibar düşükse uyarı. */
  lowRep?: boolean;
  /** Çekmecedeki fişler: Z raporu bugünkülerden çıkar. */
  receipts: readonly Receipt[];
  /** Borcunu ödeyip sadık müşteri olanlar. */
  befriended?: string[];
  /** Bu sabah Kemal'in gelmediği ya da eksik getirdiği. */
  supplyNote?: string | null;
  onNext: () => void;
}) {
  const net = Object.values(flow).reduce((s, n) => s + n, 0);
  const rows = FLOW_LABELS.filter(([k]) => (flow[k] ?? 0) !== 0);
  const rotten = PRODUCTS.filter((p) => old[p.id]);
  const repDelta = rep - repFrom;
  return (
    <main className={sheet.sheet}>
      <div className={sheet.inner}>
        <header className={sheet.head}>
          <div className={sheet.title}>
            <p className={sheet.kicker}>Kepenk indi · 20.00</p>
            <h2>{day}. gün kapandı</h2>
            {repDelta > 0 && <p className={sheet.mood}>☕ Kahvede adın iyi anılıyor</p>}
          </div>
          <div className={sheet.tiles}>
            <div className={`${sheet.tile} ${sheet.cash} ${money < 0 ? sheet.bad : ''}`}>
              <small>Kasa</small>
              <b>{tl(money)}</b>
              <span className={net < 0 ? sheet.down : sheet.up}>
                bugün {net >= 0 ? '+' : '−'}
                {tl(Math.abs(net))}
              </span>
            </div>
            <div className={sheet.tile}>
              <small>Satış</small>
              <b>
                {sales}/{visitors}
              </b>
              <span>alışveriş eden / gelen</span>
            </div>
            <div className={sheet.tile}>
              <small>İtibar</small>
              <b>{rep}</b>
              <span className={repDelta < 0 ? sheet.down : repDelta > 0 ? sheet.up : ''}>
                {repDelta > 0 ? '▲' : repDelta < 0 ? '▼' : '•'} {Math.abs(repDelta)}
              </span>
            </div>
            <div className={sheet.tile}>
              <small>Raftaki mal</small>
              <b>{tl(shelf)}</b>
              <span>alış fiyatıyla</span>
            </div>
            <div className={sheet.tile}>
              <small>Açık veresiye</small>
              <b>{tl(unpaid)}</b>
              <span>alacak</span>
            </div>
          </div>
        </header>

        <div className={sheet.cols}>
          <div className={sheet.main}>
          <WholesaleOrder stock={stock} order={order} onChange={onOrder} day={day + 1} budget={money - dues.power - dues.tax} carried={carried} />
          <div className={sheet.left}>
          <ZReport day={day} receipts={receipts} />
          <section className={sheet.ledger} aria-label="Günün kasa defteri">
            <h3>Kasa defteri</h3>
            <dl>
              {rows.map(([k, label]) => (
                <div key={k}>
                  <dt>{label}</dt>
                  <dd className={flow[k] < 0 ? sheet.down : sheet.up}>
                    {flow[k] > 0 ? '+' : '−'}
                    {tl(Math.abs(flow[k]))}
                  </dd>
                </div>
              ))}
              <div className={sheet.total}>
                <dt>Günün farkı</dt>
                <dd className={net < 0 ? sheet.down : sheet.up}>
                  {net >= 0 ? '+' : '−'}
                  {tl(Math.abs(net))}
                </dd>
              </div>
            </dl>
            <CashChart history={history} />
          </section>
          </div>
          </div>

          <aside className={sheet.plan} aria-label="Yarının hazırlığı">
            {(lowRep || paidToday.length > 0 || befriended.length > 0 || supplyNote || lostToday.length > 0 || short) && (
              <section className={sheet.news} aria-label="Günün notları">
                <h3>📰 Bugün köyde</h3>
                <ul className={sheet.notes}>
                  {lowRep && <li className={sheet.downNote}>⭐ İtibarın çok düştü: veresiyeciler borcunu ödemiyor, köylü yerine yoldan geçen yabancılar geliyor.</li>}
                  {paidToday.length > 0 && <li>📝 Borcunu getiren: {paidToday.map((d) => `${d.name} (${tl(d.amount)})`).join(', ')}</li>}
                  {befriended.length > 0 && <li>🤝 Artık sadık müşterin: {[...new Set(befriended)].join(', ')}. Her gün uğrar, pazarlık etmez.</li>}
                  {supplyNote && <li>{supplyNote}</li>}
                  {lostToday.length > 0 && <li>💸 Vadesi geçti, battı: {lostToday.map((d) => `${d.name} (${tl(d.amount)})`).join(', ')}</li>}
                  {short && <li>🚚 Sabah kasadaki para yetmedi: malın bir kısmı geri gitti</li>}
                </ul>
              </section>
            )}
            {rotten.length > 0 && (
              <div className={sheet.rotten} aria-label="Bayat ve bozuk mal">
                <h3>🧺 Bayat ve bozuk mal</h3>
                <p>Bayat ekmek köyün hayvanlarına gider, bozulan atılır. Rafta tutarsan biri alabilir; fark edip şikâyet ederse ertesi gün zabıta gelir.</p>
                <ul>
                  {rotten.map((p) => {
                    const stale = p.id === 'ekmek';
                    const daily = DAILY.includes(p.id);
                    return (
                      <li key={p.id}>
                        <span>
                          {p.emoji} {old[p.id]} {names([p])}
                          <small> · {spoiled[p.id] ? (daily ? 'bayatladı' : 'bozuldu') : 'dünden kalma'}</small>
                        </span>
                        <span className={sheet.toggle} role="group" aria-label={`${p.name}: ${stale ? 'hayvanlara ver' : 'at'} ya da rafta tut`}>
                          <button type="button" className={!keep[p.id] ? sheet.on : ''} aria-pressed={!keep[p.id]} onClick={() => onKeep((k) => ({ ...k, [p.id]: false }))}>
                            {stale ? '🐄 Hayvanlara ver' : '🗑 At'}
                          </button>
                          <button type="button" className={keep[p.id] ? sheet.on : ''} aria-pressed={!!keep[p.id]} onClick={() => onKeep((k) => ({ ...k, [p.id]: true }))}>
                            Rafta tut
                          </button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            <OrderBill money={money} order={order} day={day + 1} dues={dues} />
            <button className={`${styles.primary} ${sheet.start}`} onClick={onNext}>
              {day + 1}. günü başlat
            </button>
          </aside>
        </div>
      </div>
    </main>
  );
}

export function FinalCard({
  bankrupt,
  returned,
  days,
  money,
  history,
  rep,
  sales,
  lost,
  unpaid,
  ethics,
  verdicts,
  deeds,
  friend,
  foe,
  worth,
  startWorth,
  shelf,
  onRestart,
}: {
  bankrupt: boolean;
  /** Şükrü Amca memleketten dönüp dükkânı geri aldı. */
  returned: boolean;
  days: number;
  money: number;
  history: number[];
  rep: number;
  sales: number;
  /** Vadesi geçip batan veresiye. */
  lost: number;
  unpaid: number;
  ethics: number;
  verdicts: string[];
  deeds: string[];
  /** En çok sevindirdiğin ve en çok kızdırdığın köylü (hafızadan). */
  friend?: string;
  foe?: string;
  /** Dükkânın değeri (kasa + raftaki mal + açık veresiye), devralınan değer ve raftaki malın değeri. */
  worth: number;
  startWorth: number;
  shelf: number;
  onRestart: () => void;
}) {
  const gain = worth - startWorth;
  const t = titleFor(days, rep, gain);
  return (
    <main className={styles.card}>
      <div className={styles.big}>{bankrupt ? '📉' : returned ? '🚌' : '🤝'}</div>
      <p className={styles.kicker}>{bankrupt ? `${days}. gün akşamı kasa eksiye düştü: dükkân battı.` : returned ? `Şükrü Amca memleketten döndü: dükkânı ${days} gün ayakta tuttun, anahtarı teslim ettin.` : `${days}. günün akşamı dükkânı Şükrü Amca'ya erken devrettin.`}</p>
      <h2>{t.title}</h2>
      <p>{t.note}</p>
      <Finale kind="letter" kicker={bankrupt ? 'Kepengin altına sıkıştırılmış bir not' : 'Tezgâhın üstünde bir mektup'} title={bankrupt ? 'Evladım,' : 'Hayırlı akşamlar evladım,'} sign="Şükrü Amca">
        {bankrupt ? (
          <p>Kasayı eksi görünce kızmadım, inan. Bu köyde dükkân tutmak kolay değil; ben de ilk yıl iki kere battım. Defteri karıştırdım: {lost > 0 ? `${tl(lost)} veresiye gitmiş, ` : ''}zamlar seni kovalamış.</p>
        ) : (
          <p>
            Defteri satır satır okudum. {days} gün dükkânı ayakta tutmuşsun, kasada {tl(money)}, raflarda {tl(shelf)} değerinde mal var.{' '}
            {gain >= 0 ? `Dükkân bıraktığımdan ${tl(gain)} daha değerli: eline sağlık.` : `Ama dükkân bıraktığımdan ${tl(-gain)} eksik; raflar boşalmış.`} {rep >= 70 ? 'Köyde adın iyiye çıkmış, kahvede herkes seni soruyor.' : rep >= 40 ? 'Köy seni tanıdı; seven de var, söylenen de.' : 'Kahvede adın pek hayırla anılmıyor, haberin olsun.'}
          </p>
        )}
        {friend && <p>{friend} geçen gün beni yolda durdurdu, "Yeni bakkal iyi insan" dedi. Bu, kasadaki paradan kıymetlidir.</p>}
        {foe && <p>{foe} ise küsmüş, kasabadaki markete gidiyormuş. Bir tas çorbayla gönlünü al, müşteri kaybetmek kolay, kazanmak zor.</p>}
        <p>{ethics >= 0 ? 'Terazin doğru tartmış. Allah bereket versin.' : 'Teraziye bir daha bak; köyde her şey konuşulur.'}</p>
      </Finale>
      <dl className={styles.report}>
        <dt>Dayandığın gün</dt>
        <dd>{days}</dd>
        <dt>Kasa</dt>
        <dd className={money < 0 ? styles.neg : ''}>{tl(money)}</dd>
        <dt>Raftaki mal (alış)</dt>
        <dd>{tl(shelf)}</dd>
        <dt>Dükkânın değeri</dt>
        <dd>{tl(worth)}</dd>
        <dt>Devraldığın değer</dt>
        <dd>{tl(startWorth)}</dd>
        <dt>Fark</dt>
        <dd className={gain < 0 ? styles.neg : ''}>
          {gain >= 0 ? '+' : '−'}
          {tl(Math.abs(gain))}
        </dd>
        <dt>Satış</dt>
        <dd>{sales}</dd>
        <dt>İtibar</dt>
        <dd>{rep}/100</dd>
        <dt>Batan veresiye</dt>
        <dd className={lost ? styles.neg : ''}>{tl(lost)}</dd>
        {unpaid > 0 && (
          <>
            <dt>Açık veresiye</dt>
            <dd>{tl(unpaid)}</dd>
          </>
        )}
        <dt>Esnaf ahlakı</dt>
        <dd>{ethicsTitle(ethics)}</dd>
      </dl>
      <CashChart history={history} />
      {verdicts.length > 0 && (
        <div className={styles.notes}>
          <h3>📒 Şükrü Amca defteri okudu</h3>
          <ul>
            {verdicts.map((v) => (
              <li key={v}>{v}</li>
            ))}
          </ul>
        </div>
      )}
      {deeds.length > 0 && (
        <div className={styles.notes}>
          <h3>🤝 Kahvede anlatılanlar</h3>
          <ul>
            {deeds.map((v, i) => (
              <li key={i}>{v}</li>
            ))}
          </ul>
        </div>
      )}
      <details className={styles.reveal}>
        <summary>Market fiyatları: ilk gün ve bugün</summary>
        <ul>
          {PRODUCTS.map((p) => (
            <li key={p.id}>
              {p.emoji} {p.name}: {tl(p.market)} → {tl(priceOn(p, days).market)}
            </li>
          ))}
        </ul>
        <p>Müşterilerin tavanları: {CUSTOMERS.map((c) => `${c.emoji} ${c.name} ×${c.ceiling}`).join(' · ')}</p>
      </details>
      <div className={styles.finalActions}>
        <ShareButton
          className={styles.primary}
          make={() => ({
            route: 'bakkal',
            kicker: bankrupt ? `Köy bakkalı ${days}. gün battı` : `Köy bakkalı · ${days} gün`,
            title: t.title,
            note: t.note,
            stats: [
              { label: 'Gün', value: String(days) },
              { label: 'Kasa', value: tl(money), tone: money < 0 ? '#a8402f' : '#2f7a4e' },
              { label: 'Esnaf ahlakı', value: ethicsTitle(ethics) },
            ],
            question: 'Sen kaç gün dayanırdın?',
            text: foe
              ? `Köy Bakkalı'nda ${days} gün dayandım; fiyatlarıma ${foe} o kadar kızdı ki kasabadaki markete gitti. Şükrü Amca'nın mektubu: "${t.title}". Sen fiyatı kaça söylerdin?`
              : friend
                ? `Köy Bakkalı'nda ${days} gün dükkân tuttum; ${friend} köyde "yeni bakkal iyi insan" diye anlatıyor. Unvanım "${t.title}". Sen fiyatı kaça söylerdin?`
                : `Köy Bakkalı'nda ${days} gün dayandım: "${t.title}" oldum, itibar ${rep}/100. Etiket yok, fiyatı sen söylüyorsun.`,
          })}
        />
        <button className={sheet.again} onClick={onRestart}>
          Yeniden aç
        </button>
      </div>
    </main>
  );
}
