import { useEffect, useMemo, useRef, useState } from 'react';
import { ClockOut } from '../../arcade/ClockOut';
import { markPlayed } from '../../arcade/progress';
import { ShareButton } from '../../arcade/ShareButton';
import { StudioMark } from '../../arcade/Studio';
import { audioEngine } from '../../audio/audioEngine';
import {
  CUSTOMERS,
  DAYS,
  EVENTS,
  HIKE_DAY,
  PRODUCTS,
  START_REPUTATION,
  WEATHER,
  basketOn,
  clockText,
  dayVisits,
  effectiveType,
  greetingFor,
  hourOf,
  lineFor,
  priceOn,
  profitOf,
  react,
  remember,
  sayItems,
  settleDebts,
  titleFor,
  weatherOn,
  type Debt,
  type LogEntry,
  type Memories,
  type Reaction,
} from './data';
import { Customer } from './Customer';
import { Ledger } from './Ledger';
import { Calculator, CashRegister, Receipt } from './Register';
import { EMPTY_PAGES, type Pages } from './pages';
import { ShopScene } from './ShopScene';
import * as sfx from './sfx';
import styles from './BakkalGame.module.css';

/*
 * Köy Bakkalı: beş gün tezgâhtasın. Tanıdık köylüler kapıdan girer, bir ya da birkaç şey ister;
 * sen fiyatı söylersin. Sevinir, söylenir, pazarlık eder ya da çeker gider; geçen seferi de
 * unutmaz. Kimi veresiye yazdırır. Gün sabah sekizde açılır, akşam kepenk iner; havası ve köy
 * olayı günün kalabalığını ve keseleri değiştirir. Defter fiyatları ve veresiyeyi tutar.
 */

type Phase = 'intro' | 'shop' | 'dayEnd' | 'final';
type Step = 'ask' | 'counter' | 'credit' | 'result';

const clamp = (n: number) => Math.max(0, Math.min(100, n));
const tl = (n: number) => `${n.toLocaleString('tr-TR')} ₺`;
const cap = (s: string) => s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1);

export function BakkalGame() {
  const [seed, setSeed] = useState(() => Date.now() % 100000);
  const [phase, setPhase] = useState<Phase>('intro');
  const [day, setDay] = useState(1);
  const [rep, setRep] = useState(START_REPUTATION);
  const [repAtDayStart, setRepAtDayStart] = useState(START_REPUTATION);
  const [profit, setProfit] = useState(0);
  const [dayProfit, setDayProfit] = useState(0);
  const [daySales, setDaySales] = useState(0);
  const [idx, setIdx] = useState(0);
  const [step, setStep] = useState<Step>('ask');
  const [price, setPrice] = useState('');
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [book, setBook] = useState(false);
  const [pages, setPages] = useState<Pages>(EMPTY_PAGES);
  const [lineNo, setLineNo] = useState(0);
  const [memories, setMemories] = useState<Memories>({});
  const [debts, setDebts] = useState<Debt[]>([]);
  const [paidToday, setPaidToday] = useState<Debt[]>([]);
  const [credited, setCredited] = useState<boolean | null>(null);
  const [till, setTill] = useState<{ amount: number | null; open: boolean }>({ amount: null, open: false });
  const [catAwake, setCatAwake] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [calc, setCalc] = useState(false);
  const [receipts, setReceipts] = useState(0);
  const [muted, setMuted] = useState(sfx.isMuted());
  const timers = useRef<number[]>([]);

  const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
  useEffect(() => {
    audioEngine.setMusicMood('off');
    const pending = timers.current;
    return () => {
      pending.forEach((t) => window.clearTimeout(t));
      sfx.setAmbience('quiet');
    };
  }, []);

  const weather = weatherOn(seed, day);
  const visits = useMemo(() => dayVisits(seed, day, repAtDayStart), [seed, day, repAtDayStart]);
  const visit = phase === 'shop' ? visits[idx] : undefined;
  const basket = visit ? basketOn(visit.items, day) : null;
  const hour = phase === 'shop' ? hourOf(idx, visits.length) + 0.4 : phase === 'dayEnd' ? 20 : phase === 'final' ? 12 : 8;

  // arka plan sesi havaya göre; dükkân kapalıyken susar
  useEffect(() => {
    if (phase !== 'shop') return sfx.setAmbience('quiet');
    sfx.setAmbience(weather === 'rain' ? 'rain' : weather === 'snow' ? 'quiet' : 'birds');
  }, [phase, weather]);

  // her müşteri: çıngırak; kedi kaderindeyse biraz sonra uyanıp raftan bir şey düşürür
  useEffect(() => {
    if (phase !== 'shop' || !visit) return;
    sfx.bell();
    if (!visit.cat) return;
    const fallen = visit.cat;
    const { cost } = priceOn(fallen, day);
    const mine: number[] = [];
    const later = (ms: number, fn: () => void) => mine.push(window.setTimeout(fn, ms));
    later(1800, () => {
      setCatAwake(true);
      sfx.thud();
      setProfit((x) => x - cost);
      setDayProfit((x) => x - cost);
      setToast(`🐈 Kedi uyandı, raftan bir ${fallen.name.toLocaleLowerCase('tr-TR')} düşürdü: −${tl(cost)}`);
    });
    later(5200, () => {
      setCatAwake(false);
      setToast(null);
    });
    return () => mine.forEach((t) => window.clearTimeout(t));
  }, [phase, visit, day]);

  const finish = (p: number, r: Reaction) => {
    if (!visit || !basket) return;
    const single = visit.items.length === 1;
    setLog((l) => [...l, { product: single ? visit.items[0].id : '', basket: single ? undefined : visit.items.map((i) => i.name), day, price: p, mood: r.mood, customer: visit.villager.name }]);
    setRep((x) => clamp(x + r.rep));
    if (r.mood !== 'counter') setMemories((m) => remember(m, visit.villager.id, r.mood));
    setReaction(r);
    setLineNo((n) => n + 1);
  };

  const cash = (amount: number, cost: number) => {
    const gain = profitOf(amount, cost);
    setProfit((x) => x + gain);
    setDayProfit((x) => x + gain);
    setDaySales((x) => x + 1);
    setTill({ amount, open: true });
    setReceipts((n) => n + 1);
    sfx.register();
    later(1600, () => setTill((t) => ({ ...t, open: false })));
  };

  const sell = (second: boolean, asked?: number) => {
    const p = asked ?? Number(price);
    if (!visit || !basket || !Number.isFinite(p) || p <= 0) return;
    const who = effectiveType(visit.customer, day, memories[visit.villager.id]);
    const r = react(p, basket.market, who, second);
    finish(p, r);
    if (r.mood === 'counter') {
      setPrice('');
      return setStep('counter');
    }
    if (r.sold !== undefined && visit.credit) {
      setCredited(null);
      return setStep('credit');
    }
    if (r.sold !== undefined) cash(r.sold, basket.cost);
    setStep('result');
  };

  /** Veresiye kararı: yazarsan mal gider, para sonra gelir (belki); yazmazsan küser. */
  const decideCredit = (write: boolean) => {
    if (!visit || !basket || reaction?.sold === undefined) return;
    if (write) {
      // veresiyenin kârı borç ödenince yazılır; batarsa hafta sonunda maliyeti zarardır
      setDebts((d) => [...d, { who: visit.villager.id, name: visit.villager.name, amount: reaction.sold!, cost: basket.cost, day }]);
      setDaySales((x) => x + 1);
      setReceipts((n) => n + 1);
      setRep((x) => clamp(x + 2));
    } else {
      cash(reaction.sold, basket.cost);
      setRep((x) => clamp(x - 2));
    }
    setCredited(write);
    setLineNo((n) => n + 1);
    setStep('result');
  };

  const closeDay = () => {
    // akşam veresiyeler toplanır: borcunu getiren gelir
    const settled = settleDebts(debts, seed, day);
    const paid = settled.filter((d, i) => d.paid && !debts[i].paid);
    const gain = paid.reduce((s, d) => s + d.amount - d.cost, 0);
    setDebts(settled);
    setPaidToday(paid);
    setProfit((x) => x + gain);
    setDayProfit((x) => x + gain);
    if (paid.length) sfx.register();
    setPhase(day >= DAYS ? 'final' : 'dayEnd');
  };

  const next = () => {
    setPrice('');
    setReaction(null);
    setCredited(null);
    setStep('ask');
    setToast(null);
    setTill((t) => ({ ...t, open: false }));
    if (idx + 1 < visits.length) setIdx(idx + 1);
    else closeDay();
  };

  const nextDay = () => {
    setDay(day + 1);
    setIdx(0);
    setDayProfit(0);
    setDaySales(0);
    setPaidToday([]);
    setRepAtDayStart(rep);
    setTill({ amount: null, open: false });
    setPhase('shop');
  };

  const restart = () => {
    setSeed((s) => s + 7);
    setDay(1);
    setRep(START_REPUTATION);
    setRepAtDayStart(START_REPUTATION);
    setProfit(0);
    setDayProfit(0);
    setDaySales(0);
    setIdx(0);
    setLog([]);
    setPages(EMPTY_PAGES);
    setMemories({});
    setDebts([]);
    setPaidToday([]);
    setTill({ amount: null, open: false });
    setPhase('shop');
  };

  const pet = () => {
    sfx.purr();
    setCatAwake(false);
  };

  const toggleMute = () => {
    sfx.setMuted(!muted);
    setMuted(!muted);
  };

  const playing = phase === 'shop' || phase === 'dayEnd';
  const openDebts = debts.filter((d) => !d.paid);
  const unpaid = openDebts.reduce((s, d) => s + d.amount, 0);
  // hafta bitince ödenmemiş veresiyenin malı zarardır
  const finalProfit = profit - openDebts.reduce((s, d) => s + d.cost, 0);
  // hafta bitti: salonun defterine tik ve karne
  useEffect(() => {
    if (phase !== 'final') return;
    const t = titleFor(finalProfit, rep);
    markPlayed('bakkal', t.title);
    // yalnızca final ekranı açıldığında
    // oxlint-disable-next-line react/exhaustive-deps
  }, [phase]);

  const say = () => {
    if (!visit) return null;
    if (step === 'credit') {
      if (credited === null) return `${lineFor(reaction!.mood, lineNo, reaction!.offer)} Ama bir ricam var: deftere yazar mısın? Ay başı getiririm.`;
    }
    if (credited === true) return 'Allah razı olsun evladım, ilk fırsatta getiririm!';
    if (credited === false) return 'Peki peki, al paranı… Hacı Emmi yazardı ama.';
    if (reaction) return lineFor(reaction.mood, lineNo, reaction.offer);
    const items = sayItems(visit.items);
    return (
      <>
        {greetingFor(visit.villager, memories[visit.villager.id])} <b>{cap(items)}</b> verir misin? {visit.items.length > 1 ? 'Hepsi kaça?' : 'Kaça bu?'}
      </>
    );
  };

  return (
    <div className={styles.app}>
      <ShopScene hour={hour} weather={weather} catAwake={catAwake} onPet={pet} onCalc={() => setCalc((c) => !c)}>
        {visit && (
          <Customer
            key={`${day}-${idx}`}
            type={visit.customer.id}
            color={visit.customer.color}
            face={credited === false ? 'grumble' : credited === true ? 'happy' : reaction ? reaction.mood : 'ask'}
            state={reaction?.mood === 'leave' ? 'leave' : 'enter'}
            name={visit.villager.name}
            reply={!!reaction}
            lineKey={String(lineNo)}
            line={say()}
          />
        )}
      </ShopScene>
      <header className={styles.top}>
        <ClockOut risk={playing ? 'Kasa ve defter kaybolur; dükkân kapanır.' : undefined} />
        <div className={styles.title}>
          <h1>Köy Bakkalı</h1>
          <p>Yukarıkavaklı · Hacı Emmi'nin dükkânı</p>
        </div>
        <div className={styles.stats}>
          {phase !== 'intro' && (
            <>
              <span title="Gün ve saat">
                📅 {Math.min(day, DAYS)}/{DAYS} · {clockText(hour)}
              </span>
              <span title="Hava">{WEATHER[weather].label}</span>
              <span title="Toplam kâr" className={profit < 0 ? styles.neg : ''}>
                💰 {tl(profit)}
              </span>
              <span title="Köydeki itibar">
                ⭐ <meter min={0} max={100} low={35} high={70} optimum={100} value={rep} /> {rep}
              </span>
            </>
          )}
          <button className={styles.mute} onClick={toggleMute} aria-label={muted ? 'Sesi aç' : 'Sesi kapat'}>
            {muted ? '🔇' : '🔊'}
          </button>
        </div>
      </header>

      {phase === 'intro' && (
        <main className={styles.card}>
          <div className={styles.big}>🏪</div>
          <h2>Dükkân artık senin</h2>
          <p>Hacı Emmi hacca gitti, bakkalı sana bıraktı. Ama etiket bırakmadı: fiyatları sen söyleyeceksin.</p>
          <ul className={styles.rules}>
            <li>😄 Market fiyatı ya da altı: müşteri sevinerek alır, itibarın artar.</li>
            <li>😒 Biraz üstü: söylenir ama alır. Kâr güzel, itibar azalır.</li>
            <li>🤨 Çok üstü: pazarlık eder, karşı teklif verir. Bir şansın daha var.</li>
            <li>😠 Yine çok üstü: çeker gider, köyde adın çıkar.</li>
            <li>🧺 Kimi birkaç şey ister: toplam fiyatı söylersin.</li>
            <li>🧠 Köylüler geçen seferi hatırlar: kazıkladığın daha az öder, sevindirdiğin biraz daha fazla.</li>
            <li>📝 Veresiye isteyene yazarsan itibar kazanırsın ama para gelmeyebilir.</li>
            <li>📒 Defter boş: fiyatları ve borçluları kendin not al. Kalemle yaz ya da klavyeye geç.</li>
            <li>🌦 Hava ve köy olayları kalabalığı ve keseleri değiştirir. 🐈 Kediye dikkat.</li>
          </ul>
          <button className={styles.primary} onClick={() => setPhase('shop')}>
            Kepengi aç
          </button>
        </main>
      )}

      {phase === 'shop' && visit && basket && (
        <main className={styles.shop}>
          {toast && <p className={styles.toast}>{toast}</p>}

          <section className={styles.till}>
            <p className={styles.queue}>
              {day}. gün · {clockText(hour)} · müşteri {idx + 1}/{visits.length}
            </p>
            <div className={styles.product}>
              <span className={styles.big}>{visit.items.map((i) => i.emoji).join('')}</span>
              <div>
                <b>{visit.items.map((i) => i.name).join(' + ')}</b>
                <small>Toptancıdan geliş: {tl(basket.cost)}</small>
              </div>
            </div>

            {step === 'ask' && <p className={styles.or}>Fiyatı soldaki kasaya gir, ONAY'a bas.</p>}

            {step === 'counter' && reaction?.offer !== undefined && (
              <div className={styles.counterOffer}>
                <button type="button" className={styles.primary} onClick={() => sell(true, reaction.offer)}>
                  {tl(reaction.offer)} kabul
                </button>
                <span className={styles.or}>ya da son fiyatını kasaya gir</span>
              </div>
            )}

            {step === 'credit' && reaction?.sold !== undefined && (
              <div className={styles.priceForm}>
                <span>
                  {tl(reaction.sold)} veresiye istiyor
                </span>
                <button autoFocus className={styles.primary} onClick={() => decideCredit(true)}>
                  📝 Deftere yaz
                </button>
                <button className={styles.ghost} onClick={() => decideCredit(false)}>
                  Peşin isterim
                </button>
              </div>
            )}

            {step === 'result' && reaction && (
              <div className={styles.result}>
                {reaction.sold !== undefined ? (
                  credited ? (
                    <p>
                      Deftere yazıldı: <b>{tl(reaction.sold)}</b> · mal gitti, para gelecek mi bakalım
                    </p>
                  ) : (
                    <p>
                      Satıldı: <b>{tl(reaction.sold)}</b> · kâr{' '}
                      <b className={profitOf(reaction.sold, basket.cost) < 0 ? styles.neg : styles.pos}>{tl(profitOf(reaction.sold, basket.cost))}</b>
                    </p>
                  )
                ) : (
                  <p>Satış olmadı.</p>
                )}
                <button autoFocus className={styles.primary} onClick={next}>
                  {idx + 1 < visits.length ? 'Sıradaki müşteri' : 'Kepengi indir'}
                </button>
              </div>
            )}
          </section>
        </main>
      )}

      {phase === 'dayEnd' && (
        <main className={styles.card}>
          <div className={styles.big}>🌙</div>
          <h2>{day}. gün bitti</h2>
          <dl className={styles.report}>
            <dt>Satış</dt>
            <dd>
              {daySales}/{visits.length}
            </dd>
            <dt>Günün kârı</dt>
            <dd className={dayProfit < 0 ? styles.neg : ''}>{tl(dayProfit)}</dd>
            <dt>İtibar</dt>
            <dd>
              {repAtDayStart} → {rep}
            </dd>
            <dt>Açık veresiye</dt>
            <dd>{tl(unpaid)}</dd>
          </dl>
          {paidToday.length > 0 && <p>📝 Akşam borcunu getirenler: {paidToday.map((d) => `${d.name} (${tl(d.amount)})`).join(', ')}</p>}
          <p>{rep > repAtDayStart ? 'Kahvede adın iyi anılıyor. Yarın kalabalık olur.' : rep < repAtDayStart ? 'Kahvede fısıltılar var. Yarın daha az kişi gelebilir.' : 'Sakin bir gün.'}</p>
          <p className={styles.banner}>
            📻 Yarın: {WEATHER[weatherOn(seed, day + 1)].label} · {EVENTS[day + 1].title}
          </p>
          <button className={styles.primary} onClick={nextDay}>
            {day + 1}. günü başlat
          </button>
        </main>
      )}

      {phase === 'final' && (
        <main className={styles.card}>
          <div className={styles.big}>🏆</div>
          <p className={styles.kicker}>Hacı Emmi döndü. Hafta sonu karnen:</p>
          <h2>{titleFor(finalProfit, rep).title}</h2>
          <p>{titleFor(finalProfit, rep).note}</p>
          <dl className={styles.report}>
            <dt>Toplam kâr</dt>
            <dd className={finalProfit < 0 ? styles.neg : ''}>{tl(finalProfit)}</dd>
            <dt>İtibar</dt>
            <dd>{rep}/100</dd>
            <dt>Satış</dt>
            <dd>{log.filter((l) => l.mood === 'happy' || l.mood === 'grumble').length}</dd>
            <dt>Batan veresiye</dt>
            <dd className={unpaid ? styles.neg : ''}>{tl(unpaid)} (mal: −{tl(openDebts.reduce((s, d) => s + d.cost, 0))})</dd>
          </dl>
          <details className={styles.reveal}>
            <summary>Gerçek market fiyatları</summary>
            <ul>
              {PRODUCTS.map((p) => (
                <li key={p.id}>
                  {p.emoji} {p.name}: {tl(p.market)} → zamdan sonra {tl(priceOn(p, HIKE_DAY).market)}
                </li>
              ))}
            </ul>
            <p>
              Müşterilerin tavanları: {CUSTOMERS.map((c) => `${c.emoji} ${c.name} ×${c.ceiling}`).join(' · ')}
            </p>
          </details>
          <div className={styles.finalActions}>
            <ShareButton
              className={styles.primary}
              make={() => {
                const t = titleFor(finalProfit, rep);
                return {
                  route: 'bakkal',
                  kicker: 'Hacı Emmi döndü · Hafta sonu karnesi',
                  title: t.title,
                  note: t.note,
                  stats: [
                    { label: 'Toplam kâr', value: tl(finalProfit), tone: finalProfit < 0 ? '#a8402f' : '#2f7a4e' },
                    { label: 'İtibar', value: `${rep}/100` },
                    { label: 'Batan veresiye', value: tl(unpaid), tone: unpaid ? '#a8402f' : undefined },
                  ],
                  question: 'Sen olsan kaça satardın?',
                  text: `Köy Bakkalı'nda bir hafta: "${t.title}" oldum. Kâr ${tl(finalProfit)}, itibar ${rep}/100. Etiket yok, fiyatı sen söylüyorsun.`,
                };
              }}
            />
            <button className={styles.ghost} onClick={restart}>
              Yeni hafta
            </button>
          </div>
        </main>
      )}

      {phase === 'shop' && visit && (
        <CashRegister
          value={price}
          onChange={setPrice}
          onSubmit={(v) => sell(step === 'counter', v)}
          active={step === 'ask' || step === 'counter'}
          label={step === 'counter' ? 'SON SÖZ' : visit.items.length > 1 ? 'TOPLAM' : 'FİYAT'}
          shown={till.amount}
          open={till.open}
          receipt={
            step === 'result' && reaction?.sold !== undefined ? (
              <Receipt key={receipts} no={receipts} items={visit.items.map((i) => i.name)} total={reaction.sold} day={day} time={clockText(hour)} credit={!!credited} />
            ) : undefined
          }
        />
      )}
      {calc && <Calculator onClose={() => setCalc(false)} />}
      {phase !== 'intro' && (
        <button className={styles.calcToggle} onClick={() => setCalc((c) => !c)} aria-expanded={calc}>
          🧮 Hesap
        </button>
      )}
      {phase !== 'intro' && (
        <button className={styles.bookToggle} onClick={() => setBook((b) => !b)} aria-expanded={book}>
          📒 Defter
        </button>
      )}
      {book && phase !== 'intro' && (
        <Ledger pages={pages} onChange={(id, page) => setPages((p) => ({ ...p, [id]: page }))} onClose={() => setBook(false)} />
      )}

      <footer className={styles.sign}>
        <StudioMark minimal />
      </footer>
    </div>
  );
}
