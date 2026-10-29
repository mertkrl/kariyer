import { useEffect, useMemo, useRef, useState } from 'react';
import { markPlayed } from '../../arcade/progress';
import { StudioMark } from '../../arcade/Studio';
import { audioEngine } from '../../audio/audioEngine';
import {
  START_REPUTATION,
  WEATHER,
  basketOn,
  clockText,
  dayVisits,
  effectiveType,
  eventOn,
  forget,
  hikesOn,
  hourOf,
  react,
  remember,
  rng,
  settleDebts,
  titleFor,
  weatherOn,
  type Debt,
  type LogEntry,
  type Memories,
  type Product,
  type Reaction,
} from './data';
import { Customer } from './Customer';
import { Ledger } from './Ledger';
import { Calculator, CashRegister } from './Register';
import { CREDIT_PAGE, EMPTY_PAGES, type Pages } from './pages';
import { ShopScene } from './ShopScene';
import { Shutter } from './Shutter';
import { DayEndCard, FinalCard, IntroCard } from './Cards';
import { say } from './say';
import { Till, type Step } from './Till';
import { TopBar } from './TopBar';
import {
  BREAD_DEFAULT,
  COINS_DAILY,
  GUM,
  EMPTY_FLOW,
  LOAN,
  LOAN_BACK,
  RETURN_DAY,
  START_CASH,
  START_STOCK,
  expensesOn,
  morning,
  payment,
  settleChange,
  deliver,
  settleAccount,
  settleDilemma,
  spoil,
  split,
  take,
  weekDay,
  type Answer,
  type ChangeWay,
  type Flow,
  type Outcome,
  type Stock,
} from './week';
import * as sfx from './sfx';
import styles from './BakkalGame.module.css';

/*
 * Köy Bakkalı: dükkân batana kadar tezgâhtasın. Tanıdık köylüler kapıdan girer, bir ya da birkaç şey ister;
 * sen fiyatı söylersin. Sevinir, söylenir, pazarlık eder ya da çeker gider; geçen seferi de
 * unutmaz. Kimi veresiye yazdırır. Gün sabah sekizde açılır, akşam kepenk iner; havası ve köy
 * olayı günün kalabalığını ve keseleri değiştirir. Hacı Emmi'nin defterinde eski veresiyeler ve aylar
 * önceki toptancı fiyatları yazılı; boş sayfalara oyuncu kendi notunu alır.
 *
 * İlk günlerde eski borçlular hesap görmeye gelir; doğru cevap defterdedir. Arada vicdanı yoklayan
 * anlar çıkar (week.ts). Raftaki mal sınırlıdır: her akşam fırına ekmek, toptancıya mal söylenir,
 * parası ertesi sabah kasadan çıkar. Fiyatlar her gün, her üründe farklı hızla artar. Gün sonunda
 * kasa eksiye düşerse dükkân batar ve oyun biter; istersen dükkânı daha önce de devredebilirsin.
 */

type Phase = 'intro' | 'shop' | 'dayEnd' | 'final';

const clamp = (n: number) => Math.max(0, Math.min(100, n));

export function BakkalGame() {
  const [seed, setSeed] = useState(() => Date.now() % 100000);
  const [phase, setPhase] = useState<Phase>('intro');
  const [day, setDay] = useState(1);
  const [rep, setRep] = useState(START_REPUTATION);
  const [repAtDayStart, setRepAtDayStart] = useState(START_REPUTATION);
  const [money, setMoney] = useState(START_CASH);
  /** Bugün kasaya girenler ve çıkanlar. */
  const [flow, setFlow] = useState<Flow>(EMPTY_FLOW);
  /** Her gün sonundaki kasa (ilki açılış). */
  const [history, setHistory] = useState<number[]>([START_CASH]);
  const [daySales, setDaySales] = useState(0);
  const [idx, setIdx] = useState(0);
  const [step, setStep] = useState<Step>('ask');
  const [price, setPrice] = useState('');
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [book, setBook] = useState(false);
  const [bookAt, setBookAt] = useState(1);
  const [pages, setPages] = useState<Pages>(EMPTY_PAGES);
  const [lineNo, setLineNo] = useState(0);
  const [memories, setMemories] = useState<Memories>({});
  const [debts, setDebts] = useState<Debt[]>([]);
  const [paidToday, setPaidToday] = useState<Debt[]>([]);
  /** Bu akşam vadesi dolup batan veresiyeler. */
  const [lostToday, setLostToday] = useState<Debt[]>([]);
  const [credited, setCredited] = useState<boolean | null>(null);
  const [till, setTill] = useState<{ amount: number | null; open: boolean }>({ amount: null, open: false });
  const [calc, setCalc] = useState(false);
  const [muted, setMuted] = useState(sfx.isMuted());
  // kepenk kalkarken kartlar gizlenir; kalkınca dükkân açılır
  const [rising, setRising] = useState(false);
  const [stock, setStock] = useState<Stock>(START_STOCK);
  const [bread, setBread] = useState(BREAD_DEFAULT);
  const [order, setOrder] = useState<Stock>({});
  /** Dün akşam bayatlayan ekmek ve gece bozulan mal. */
  const [stale, setStale] = useState(0);
  const [spoiled, setSpoiled] = useState<Stock>({});
  const [bankrupt, setBankrupt] = useState(false);
  /** Hacı Emmi hacdan döndü: dükkân batmadan son güne varıldı. */
  const [returned, setReturned] = useState(false);
  /** Bu sabah kasadaki para yetmediği için geri giden mal oldu mu. */
  const [short, setShort] = useState(false);
  /** Kasadaki bozukluk (₺): her sabah bankadan bozdurulur. */
  const [coins, setCoins] = useState(COINS_DAILY);
  /** Müşterinin uzattığı para ve para üstü (küsuratı varsa sorulur). */
  const [pay, setPay] = useState<{ bill: number; change: number; odd: number } | null>(null);
  /** Sakızla verilen para üstünde kaç kez kol çevrildi (null: makine beklemiyor). */
  const [gumGiven, setGumGiven] = useState<number | null>(null);
  const [ethics, setEthics] = useState(0);
  /** Eski hesapların ve vicdan anlarının karneye düşen notları. */
  const [verdicts, setVerdicts] = useState<string[]>([]);
  const [deeds, setDeeds] = useState<string[]>([]);
  const [lent, setLent] = useState(false);
  /** Eski hesap, ikilem ya da rafta olmayan mal: müşterinin son sözü ve kasaya etkisi. */
  const [outcome, setOutcome] = useState<Outcome | null>(null);
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
  const event = eventOn(seed, day);
  const visits = useMemo(() => weekDay(dayVisits(seed, day, repAtDayStart), day), [seed, day, repAtDayStart]);
  const visit = phase === 'shop' ? visits[idx] : undefined;
  // istenenlerden rafta olanlar satılır; kalmayanlar için müşteri söylenir
  const shelf = visit ? split(visit.items, stock) : null;
  const basket = shelf ? basketOn(shelf.have, day) : null;
  // alışveriş olmayan ziyaret: eski hesap, borç isteyen nine ya da istediği hiçbir şey rafta yok
  const errand = visit?.account ? 'account' : visit?.dilemma === 'loan' ? 'loan' : shelf && !shelf.have.length ? 'empty' : null;
  const hour = phase === 'shop' ? hourOf(idx, visits.length) + 0.4 : phase === 'dayEnd' || phase === 'final' ? 20 : 8;

  // arka plan sesi havaya göre; dükkân kapalıyken susar
  useEffect(() => {
    if (phase !== 'shop') return sfx.setAmbience('quiet');
    sfx.setAmbience(weather === 'rain' ? 'rain' : weather === 'snow' ? 'quiet' : 'birds');
  }, [phase, weather]);

  // her müşteri kapıdan çıngırakla girer
  useEffect(() => {
    if (phase === 'shop' && visit) sfx.bell();
  }, [phase, visit]);

  /** `pending`: satış veresiye ya da ikilem kararını bekliyor; itibar ve hafıza karardan sonra yazılır. */
  const finish = (p: number, r: Reaction, pending = false) => {
    if (!visit || !basket) return;
    const single = visit.items.length === 1;
    setLog((l) => [...l, { product: single ? visit.items[0].id : '', basket: single ? undefined : visit.items.map((i) => i.name), day, price: p, mood: r.mood, customer: visit.villager.name }]);
    if (!pending) setRep((x) => clamp(x + r.rep));
    if (r.mood !== 'counter' && !pending) setMemories((m) => remember(m, visit.villager.id, r.mood, r.mild));
    setReaction(r);
    setLineNo((n) => n + 1);
  };

  /** Kasaya para girer ya da çıkar; günün kasa defterine kalemiyle yazılır. */
  const move = (kind: keyof Flow, amount: number) => {
    if (!amount) return;
    setMoney((x) => x + amount);
    setFlow((f) => ({ ...f, [kind]: f[kind] + amount }));
  };

  /** Tezgâhta para el değiştirir: çekmece açılır; satışsa mal raftan düşer ve fiş kesilir. */
  const cash = (amount: number, kind: keyof Flow, goods?: Product[]) => {
    move(kind, amount);
    setTill({ amount, open: true });
    sfx.register();
    later(1600, () => setTill((t) => ({ ...t, open: false })));
    if (!goods) return;
    setStock((st) => take(st, goods));
    setDaySales((x) => x + 1);
  };

  /** Eski hesabın, ikilemin ya da boş rafın sonucu: itibar, vicdan, karne notu, müşterinin son sözü. */
  const settle = (o: Outcome, book?: 'account' | 'deed') => {
    setRep((x) => clamp(x + o.rep));
    setEthics((x) => x + o.ethics);
    if (o.verdict && book === 'account') setVerdicts((v) => [...v, o.verdict!]);
    if (o.verdict && book === 'deed') setDeeds((v) => [...v, o.verdict!]);
    setOutcome(o);
    setLineNo((n) => n + 1);
    setStep('result');
  };

  const answerAccount = (a: Answer) => {
    if (!visit?.account) return;
    // borç tutarı olarak 0 girilmez: "borcun yok" düğmesi var
    if (typeof a === 'number' && a <= 0) return;
    const o = settleAccount(visit.account, visit.villager.name, a);
    if (o.cash) cash(o.cash, 'accounts');
    setMemories((m) => remember(m, visit.villager.id, o.mood));
    settle(o, 'account');
  };

  /** İkilemde karar: `kindly` iyiliği seçmektir. Borç isteyen ninede satış yoktur. */
  const decideDilemma = (kindly: boolean) => {
    if (!visit?.dilemma || !shelf || !basket) return;
    const o = settleDilemma(visit.dilemma, kindly, reaction?.sold ?? 0);
    if (visit.dilemma === 'loan') {
      if (o.cash) cash(o.cash, 'loan');
      setLent(kindly);
      setMemories((m) => remember(m, visit.villager.id, o.mood));
    } else if (o.cash) cash(o.cash, 'sales', shelf.have);
    // satışın itibarı yalnızca mal gerçekten verildiyse; eli boş giden çocuk küsmüş hatırlar
    if (visit.dilemma !== 'loan' && reaction) {
      const sold = o.cash > 0;
      if (sold) setRep((x) => clamp(x + reaction.rep));
      setMemories((m) => remember(m, visit.villager.id, sold ? reaction.mood : o.mood, sold && reaction.mild));
    }
    settle(o, 'deed');
  };

  const noStock = () => settle({ cash: 0, rep: -1, ethics: 0, mood: 'grumble', line: 'Yok mu? Peki, kasabadan alırım.' });

  const sell = (second: boolean, asked?: number) => {
    const p = asked ?? Number(price);
    if (!visit || !basket || !Number.isFinite(p) || p <= 0) return;
    const who = effectiveType(visit.customer, event, memories[visit.villager.id]);
    const raw = react(p, basket.market, who, second);
    // maliyetin altında satış köyü sevindirir ama kahvede konuşulmaz: itibar ancak 1 artar
    const r = raw.sold !== undefined && raw.sold < basket.cost ? { ...raw, rep: Math.min(raw.rep, 1) } : raw;
    finish(p, r, r.sold !== undefined && (!!visit.dilemma || visit.credit));
    // istediklerinin bir kısmı rafta yoksa söylenir
    if (!second && shelf?.missing.length) setRep((x) => clamp(x - shelf.missing.length));
    if (r.mood === 'counter') {
      setPrice('');
      return setStep('counter');
    }
    if (r.sold !== undefined && visit.dilemma) return setStep('dilemma');
    if (r.sold !== undefined && visit.credit) {
      setCredited(null);
      return setStep('credit');
    }
    if (r.sold !== undefined) {
      cash(r.sold, 'sales', shelf!.have);
      if (askChange(r.sold)) return;
    }
    setStep('result');
  };

  /** Satıştan sonra para üstü: küsurat varsa bozukluk mu, sakız mı, yuvarlamak mı sorulur. */
  const askChange = (sold: number) => {
    const p = payment(sold, seed + day * 31 + idx * 7);
    if (!p.odd) return false;
    setPay(p);
    setStep('change');
    return true;
  };

  const giveChange = (way: ChangeWay) => {
    if (!visit || !pay) return;
    // sakız: makinenin kolu küsurat kadar çevrilir, her çevirişte bir sakız düşer
    if (way === 'gum' && gumGiven === null) return setGumGiven(0);
    const o = settleChange(way, pay.odd, visit.customer.id);
    setGumGiven(null);
    if (way === 'coins') setCoins((c) => c - pay.odd);
    if (way === 'round') move('rounding', o.cash);
    setRep((x) => clamp(x + o.rep));
    setOutcome(o);
    setLineNo((n) => n + 1);
    setStep('result');
  };

  /** Makinenin kolu çevrildi: kavanozdan bir sakız eksilir; küsurat tamamlanınca para üstü verilmiş olur. */
  const turnGum = () => {
    if (!pay || gumGiven === null || (stock[GUM] ?? 0) < 1) return;
    setStock((st) => ({ ...st, [GUM]: Math.max(0, (st[GUM] ?? 0) - 1) }));
    sfx.key();
    if (gumGiven + 1 < pay.odd) return setGumGiven(gumGiven + 1);
    later(700, () => giveChange('gum'));
    setGumGiven(pay.odd);
  };

  /** Veresiye kararı: yazarsan mal gider, para sonra gelir (belki); yazmazsan küser. */
  const decideCredit = (write: boolean) => {
    if (!visit || !basket || reaction?.sold === undefined) return;
    // satışın itibarı her iki durumda da; peşin istenen müşteri söylenmiş olarak hatırlar
    setRep((x) => clamp(x + reaction.rep));
    setMemories((m) => remember(m, visit.villager.id, write ? reaction.mood : 'grumble', write && reaction.mild));
    if (write) {
      // mal gider, para borç ödenince kasaya girer (belki hiç girmez)
      setDebts((d) => [...d, { who: visit.villager.id, name: visit.villager.name, amount: reaction.sold!, cost: basket.cost, day }]);
      setStock((st) => take(st, shelf!.have));
      setDaySales((x) => x + 1);
      setRep((x) => clamp(x + 2));
      // deftere oyuncu kendi eliyle yazar: defter veresiye sayfasında açılır
      setBookAt(CREDIT_PAGE);
      setBook(true);
    } else {
      cash(reaction.sold, 'sales', shelf!.have);
      setRep((x) => clamp(x - 2));
      setCredited(false);
      setLineNo((n) => n + 1);
      if (askChange(reaction.sold)) return;
    }
    setCredited(write);
    setLineNo((n) => n + 1);
    setStep('result');
  };

  /**
   * Kepenk iner: borcunu getirenler gelir, elektrik ve (haftada bir) vergi ödenir, rafta kalan ekmek
   * bayatlar, gece bir kısım süt, yumurta, peynir bozulur. Kasa eksideyse dükkân batar.
   */
  const closeDay = () => {
    const settled = settleDebts(debts, seed, day);
    const paid = settled.filter((d, i) => d.paid && !debts[i].paid);
    const lost = settled.filter((d, i) => d.lost && !debts[i].lost);
    const collected = paid.reduce((s, d) => s + d.amount, 0);
    const back = lent && day === LOAN_BACK ? LOAN : 0;
    const { power, tax } = expensesOn(day);
    const night = spoil(stock, rng(seed * 59 + day * 11));
    setDebts(settled);
    setPaidToday(paid);
    setLostToday(lost);
    // batan borç köyde konuşulur: borçlu da artık yüzüne bakamaz
    if (lost.length) {
      setRep((x) => clamp(x - lost.length));
      setMemories((m) => lost.reduce((acc, d) => remember(acc, d.who, 'leave'), m));
    }
    move('collected', collected);
    move('loan', back);
    if (back) setDeeds((v) => [...v, `Nazmiye Nine'nin oğlu ${LOAN} ₺ borcu gönderdi.`]);
    move('power', -power);
    move('tax', -tax);
    setStale(stock.ekmek ?? 0);
    setSpoiled(night.spoiled);
    setStock(night.stock);
    const end = money + collected + back - power - tax;
    setHistory((h) => [...h, end]);
    if (paid.length || back) sfx.register();
    sfx.shutter(true);
    setBankrupt(end < 0);
    setReturned(end >= 0 && day >= RETURN_DAY);
    setPhase(end < 0 || day >= RETURN_DAY ? 'final' : 'dayEnd');
  };

  /** Kepengi kaldırır: ses, yukarı sarılma; kepenk açılınca dükkân başlar. */
  const raise = (then: () => void) => {
    if (rising) return;
    sfx.shutter();
    setRising(true);
    later(1450, () => {
      setRising(false);
      then();
    });
  };

  const next = () => {
    setPrice('');
    setReaction(null);
    setCredited(null);
    setOutcome(null);
    setPay(null);
    setGumGiven(null);
    setStep('ask');
    setTill((t) => ({ ...t, open: false }));
    if (idx + 1 < visits.length) setIdx(idx + 1);
    else closeDay();
  };

  /** Ertesi sabah: fırının ekmeği ve toptancının malı gelir, parası o günün fiyatıyla peşin ödenir. */
  const nextDay = () =>
    raise(() => {
      const d = day + 1;
      // önce fırın, sonra toptancı: ikisi de peşin, kasadaki para kadar
      const loaves = deliver({ ekmek: bread }, money, d);
      const goods = deliver(order, money - loaves.cost, d);
      setFlow(EMPTY_FLOW);
      move('bakery', -loaves.cost);
      move('wholesale', -goods.cost);
      setShort(loaves.short || goods.short);
      setCoins(COINS_DAILY);
      setStock((st) => morning(st, loaves.delivered.ekmek ?? 0, goods.delivered));
      setOrder({});
      setDay(d);
      setIdx(0);
      setDaySales(0);
      setPaidToday([]);
      setLostToday([]);
      // gece köy biraz unutur: itibar başlangıca doğru döner
      const morningRep = forget(rep);
      setRep(morningRep);
      setRepAtDayStart(morningRep);
      setTill({ amount: null, open: false });
      setPhase('shop');
    });

  /** Dükkânı batmadan Hacı Emmi'ye devretmek: oyun karneyle biter. */
  const retire = () => {
    setBankrupt(false);
    setReturned(false);
    setPhase('final');
  };

  const restart = () =>
    raise(() => {
      setSeed((s) => s + 7);
      setDay(1);
      setRep(START_REPUTATION);
      setRepAtDayStart(START_REPUTATION);
      setMoney(START_CASH);
      setFlow(EMPTY_FLOW);
      setHistory([START_CASH]);
      setDaySales(0);
      setIdx(0);
      setLog([]);
      setPages(EMPTY_PAGES);
      setMemories({});
      setDebts([]);
      setPaidToday([]);
      setLostToday([]);
      setTill({ amount: null, open: false });
      setStock(START_STOCK);
      setBread(BREAD_DEFAULT);
      setOrder({});
      setStale(0);
      setSpoiled({});
      setBankrupt(false);
      setReturned(false);
      setShort(false);
      setCoins(COINS_DAILY);
      setEthics(0);
      setVerdicts([]);
      setDeeds([]);
      setLent(false);
      setPhase('shop');
    });

  const pet = () => sfx.purr();

  const toggleMute = () => {
    sfx.setMuted(!muted);
    setMuted(!muted);
  };

  const playing = phase === 'shop' || phase === 'dayEnd';
  const unpaid = debts.filter((d) => !d.paid && !d.lost).reduce((s, d) => s + d.amount, 0);
  const written = debts.filter((d) => d.lost).reduce((s, d) => s + d.amount, 0);
  // dükkân kapandı: salonun defterine tik ve karne
  useEffect(() => {
    if (phase !== 'final') return;
    const t = titleFor(day, rep);
    markPlayed('bakkal', t.title);
    // yalnızca final ekranı açıldığında
    // oxlint-disable-next-line react/exhaustive-deps
  }, [phase]);

  return (
    <div className={styles.app}>
      <ShopScene stock={stock} gumActive={gumGiven !== null && !!pay && gumGiven < pay.odd} onGum={turnGum} hour={hour} weather={weather} onPet={pet} onCalc={() => setCalc((c) => !c)} onBook={() => setBook((b) => !b)}>
        {visit && (
          <Customer
            key={`${day}-${idx}`}
            type={visit.customer.id}
            look={visit.villager.look}
            face={outcome ? outcome.mood : credited === false ? 'grumble' : credited === true ? 'happy' : reaction ? reaction.mood : 'ask'}
            state={reaction?.mood === 'leave' || outcome?.mood === 'leave' || (step === 'dilemma' && visit.dilemma === 'change') ? 'leave' : 'enter'}
            name={visit.villager.name}
            reply={!!reaction}
            lineKey={String(lineNo)}
            line={say({ visit, step, outcome, reaction, credited, lineNo, memory: memories[visit.villager.id] })}
          />
        )}
      </ShopScene>
      <TopBar intro={phase === 'intro'} risk={playing ? 'Kasa ve defter kaybolur; dükkân kapanır.' : undefined} day={day} clock={clockText(hour)} weather={WEATHER[weather].label} money={money} rep={rep} muted={muted} onMute={toggleMute} />

      <Shutter down={phase !== 'shop' && !rising} />

      {phase === 'intro' && !rising && <IntroCard onOpen={() => raise(() => setPhase('shop'))} busy={rising} />}

      {phase === 'shop' && visit && basket && shelf && (
        <Till
          queue={`${day}. gün · ${clockText(hour)} · müşteri ${idx + 1}/${visits.length}`}
          last={idx + 1 >= visits.length}
          visit={visit}
          stock={stock}
          shelf={shelf}
          errand={errand}
          step={step}
          reaction={reaction}
          outcome={outcome}
          credited={credited}
          onSell={sell}
          onCredit={decideCredit}
          onAccount={answerAccount}
          onDilemma={decideDilemma}
          onNoStock={noStock}
          pay={pay}
          coins={coins}
          gum={stock[GUM] ?? 0}
          gumGiven={gumGiven}
          onChange={giveChange}
          onNext={next}
        />
      )}

      {phase === 'dayEnd' && !rising && (
        <DayEndCard
          day={day}
          sales={daySales}
          visitors={visits.filter((v) => v.items.length).length}
          money={money}
          flow={flow}
          history={history}
          repFrom={repAtDayStart}
          rep={rep}
          unpaid={unpaid}
          paidToday={paidToday}
          lostToday={lostToday}
          dues={expensesOn(day + 1)}
          left={RETURN_DAY - day}
          stale={stale}
          spoiled={spoiled}
          short={short}
          weather={WEATHER[weatherOn(seed, day + 1)].label}
          event={eventOn(seed, day + 1)}
          hikes={hikesOn(day + 1)}
          stock={stock}
          order={order}
          onOrder={setOrder}
          bread={bread}
          onBread={setBread}
          onNext={nextDay}
          onRetire={retire}
        />
      )}

      {phase === 'final' && !rising && (
        <FinalCard
          bankrupt={bankrupt}
          returned={returned}
          days={day}
          money={money}
          history={history}
          rep={rep}
          sales={log.filter((l) => l.mood === 'happy' || l.mood === 'grumble').length}
          lost={written}
          unpaid={unpaid}
          ethics={ethics}
          verdicts={verdicts}
          deeds={deeds}
          onRestart={restart}
        />
      )}

      {phase === 'shop' && visit && (
        <CashRegister
          value={price}
          onChange={setPrice}
          onSubmit={(v) => (errand === 'account' ? answerAccount(v) : sell(step === 'counter', v))}
          active={(step === 'ask' && (!errand || (errand === 'account' && visit.account!.kind !== 'claim'))) || step === 'counter'}
          label={errand === 'account' ? 'BORÇ' : step === 'counter' ? 'SON SÖZ' : visit.items.length > 1 ? 'TOPLAM' : 'FİYAT'}
          shown={till.amount}
          open={till.open}
        />
      )}
      {calc && <Calculator onClose={() => setCalc(false)} />}
      {book && phase !== 'intro' && (
        <Ledger pages={pages} at={bookAt} onTurn={setBookAt} onChange={(id, page) => setPages((p) => ({ ...p, [id]: page }))} onClose={() => setBook(false)} />
      )}

      <footer className={styles.sign}>
        <StudioMark minimal />
      </footer>
    </div>
  );
}
