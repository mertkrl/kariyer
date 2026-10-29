import type { Dispatch, SetStateAction } from 'react';
import { ShareButton } from '../../arcade/ShareButton';
import { CUSTOMERS, PRODUCTS, priceOn, titleFor, tl, type Debt, type Product, type VillageEvent } from './data';
import { BreadOrder, WholesaleOrder } from './Order';
import { ethicsTitle, type Flow, type Stock } from './week';
import styles from './BakkalGame.module.css';
import sheet from './DayEnd.module.css';

/*
 * Kepenk kapalıyken görünen kartlar: açılıştaki kısa kurallar; akşam kepenk inince günün kasa
 * defteri, kasanın gün gün grafiği ve yarının siparişleri; dükkân batınca ya da devredilince
 * Hacı Emmi'nin karnesi.
 */

export function IntroCard({ onOpen, busy }: { onOpen: () => void; busy: boolean }) {
  return (
    <main className={styles.card}>
      <div className={styles.big}>🏪</div>
      <h2>Dükkân artık senin</h2>
      <p>Hacı Emmi hacca gitti, bakkalı sana bıraktı. Etiket yok: fiyatı sen söylersin.</p>
      <ul className={styles.rules}>
        <li>😄 Ucuzsa sevinir, pahalıysa söylenir; çok pahalıysa pazarlık eder ya da gider.</li>
        <li>📒 Defter ve hesap makinesi tezgâhta. Defterde eski borçlar ve çok eski bir toptancı fişi var.</li>
        <li>📦 Her akşam fırına ve toptancıya sipariş verirsin. Her malın zammı başka.</li>
        <li>💰 Elektrik her akşam, vergi ve kira haftada bir kasadan çıkar. Kasa eksiye düşerse dükkân batar.</li>
        <li>🕋 Hacı Emmi 40 gün sonra dönecek: dükkânı ona batırmadan teslim et.</li>
      </ul>
      <button className={styles.primary} onClick={onOpen} disabled={busy}>
        Kepengi aç
      </button>
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
  ['tax', 'Haftalık vergi ve kira'],
];

const names = (ps: Product[]) => ps.map((p) => p.name.replace(/ \(.*\)$/, '').toLocaleLowerCase('tr-TR')).join(', ');

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
  left,
  stale,
  spoiled,
  short,
  weather,
  event,
  hikes,
  stock,
  order,
  onOrder,
  bread,
  onBread,
  onNext,
  onRetire,
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
  /** Hacı Emmi'nin dönüşüne kalan gün. */
  left: number;
  stale: number;
  spoiled: Stock;
  /** Sabah kasadaki para yetmeyen mal geri gitti. */
  short: boolean;
  weather: string;
  event: VillageEvent;
  hikes: Product[];
  stock: Stock;
  order: Stock;
  onOrder: Dispatch<SetStateAction<Stock>>;
  bread: number;
  onBread: Dispatch<SetStateAction<number>>;
  onNext: () => void;
  onRetire: () => void;
}) {
  const net = Object.values(flow).reduce((s, n) => s + n, 0);
  const rows = FLOW_LABELS.filter(([k]) => flow[k] !== 0);
  const out = PRODUCTS.filter((p) => p.id !== 'ekmek' && !(stock[p.id] ?? 0));
  const rotten = PRODUCTS.filter((p) => spoiled[p.id]);
  const repDelta = rep - repFrom;
  return (
    <main className={`${styles.card} ${sheet.sheet}`}>
      <header className={sheet.head}>
        <div>
          <p className={sheet.kicker}>Kepenk indi · 20.00</p>
          <h2>{day}. gün kapandı</h2>
        </div>
        <p className={sheet.mood}>{repDelta > 0 ? '☕ Kahvede adın iyi anılıyor' : repDelta < 0 ? '🤫 Kahvede fısıltılar var' : '🌾 Sakin bir gün'}</p>
      </header>

      <div className={sheet.tiles}>
        <div className={`${sheet.tile} ${sheet.cash} ${money < 0 ? sheet.bad : ''}`}>
          <small>Kasa</small>
          <b>{tl(money)}</b>
          <span className={net < 0 ? sheet.down : sheet.up}>
            bugün {net >= 0 ? '+' : ''}
            {tl(net)}
          </span>
        </div>
        <div className={sheet.tile}>
          <small>Satış</small>
          <b>
            {sales}/{visitors}
          </b>
          <span>alışveriş eden / gelen</span>
          <span className={sheet.hint}>veresiye dahil, hesap görmeye gelen hariç</span>
        </div>
        <div className={sheet.tile}>
          <small>İtibar</small>
          <b>{rep}</b>
          <span className={repDelta < 0 ? sheet.down : repDelta > 0 ? sheet.up : ''}>
            {repDelta > 0 ? '▲' : repDelta < 0 ? '▼' : '•'} {Math.abs(repDelta)}
          </span>
        </div>
        <div className={sheet.tile}>
          <small>Açık veresiye</small>
          <b>{tl(unpaid)}</b>
          <span>alacak</span>
        </div>
      </div>

      <div className={sheet.cols}>
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
          <ul className={sheet.notes}>
            {paidToday.length > 0 && <li>📝 Borcunu getiren: {paidToday.map((d) => `${d.name} (${tl(d.amount)})`).join(', ')}</li>}
            {lostToday.length > 0 && <li>💸 Vadesi geçti, battı: {lostToday.map((d) => `${d.name} (${tl(d.amount)})`).join(', ')}</li>}
            {short && <li>🚚 Sabah kasadaki para yetmedi: malın bir kısmı geri gitti</li>}
            {stale > 0 && <li>🥖 {stale} ekmek bayatladı</li>}
            {rotten.length > 0 && <li>🧊 Gece bozuldu: {rotten.map((p) => `${spoiled[p.id]} ${names([p])}`).join(', ')}</li>}
            {out.length > 0 && <li>📦 Rafta biten: {names(out)}</li>}
          </ul>
        </section>

        <section className={sheet.plan} aria-label="Yarının hazırlığı">
          <div className={sheet.radio}>
            <b>
              📻 Yarın: {weather} · {event.title}
            </b>
            <span>🕋 Hacı Emmi'nin dönüşüne {left} gün.</span>
            <span>{event.text}</span>
            {hikes.length > 0 && <span className={sheet.hike}>Radyo: yarın {names(hikes)} zamlanıyor.</span>}
          </div>
          <BreadOrder value={bread} onChange={onBread} />
          <WholesaleOrder stock={stock} order={order} money={money} onChange={onOrder} />
          {dues.tax > 0 && <p className={sheet.warn}>Yarın akşam vergi ve kira günü: elektrikle birlikte {tl(dues.power + dues.tax)} kasadan çıkacak. Siparişe bütün parayı yatırma.</p>}
          {money < 300 && !dues.tax && <p className={sheet.warn}>Kasa azaldı. Sabah mal parası peşin ödenir; akşam elektriği ödeyecek para kalmazsa dükkân batar.</p>}
          <div className={sheet.actions}>
            <button className={styles.primary} onClick={onNext}>
              {day + 1}. günü başlat
            </button>
            <button className={sheet.retire} onClick={onRetire}>
              Dükkânı Hacı Emmi'ye devret
            </button>
          </div>
        </section>
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
  onRestart,
}: {
  bankrupt: boolean;
  /** Hacı Emmi hacdan dönüp dükkânı geri aldı. */
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
  onRestart: () => void;
}) {
  const t = titleFor(days, rep);
  return (
    <main className={styles.card}>
      <div className={styles.big}>{bankrupt ? '📉' : returned ? '🕋' : '🤝'}</div>
      <p className={styles.kicker}>{bankrupt ? `${days}. gün akşamı kasa eksiye düştü: dükkân battı.` : returned ? `Hacı Emmi hacdan döndü: dükkânı ${days} gün ayakta tuttun, anahtarı teslim ettin.` : `${days}. günün akşamı dükkânı Hacı Emmi'ye erken devrettin.`}</p>
      <h2>{t.title}</h2>
      <p>{t.note}</p>
      <dl className={styles.report}>
        <dt>Dayandığın gün</dt>
        <dd>{days}</dd>
        <dt>Kasa</dt>
        <dd className={money < 0 ? styles.neg : ''}>{tl(money)}</dd>
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
          <h3>📒 Hacı Emmi defteri okudu</h3>
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
            text: `Köy Bakkalı'nda ${days} gün dayandım: "${t.title}" oldum, itibar ${rep}/100. Etiket yok, fiyatı sen söylüyorsun; zamlar her gün geliyor.`,
          })}
        />
        <button className={sheet.again} onClick={onRestart}>
          Yeniden aç
        </button>
      </div>
    </main>
  );
}
