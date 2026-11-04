import { useEffect, useMemo, useRef, useState } from 'react';
import { markPlayed } from '../../arcade/progress';
import { readSlot } from '../../arcade/saveSlot';
import { isShopSave, SAVE_KEY, type ShopSave } from './save';
import { audioEngine } from '../../shared/audio/audioEngine';
import { awayOf, loyalOf, basketOn, DAILY, characterOf, complains, BARGAIN, TOURIST_MARKUP, haggleOffer, isBasic, coolOff, dayVisits, effectiveType, eventOn, forget, hourOf, react, remember, rng, customerOf, settleDebts, titleFor, tl, weatherOn, type Product, type Reaction } from './data';
import { CREDIT_PAGE } from './pages';
import { type Errand, type Step } from './Till';
import { COINS_DAILY, GUM, EMPTY_FLOW, LOAN, LOAN_BACK, RETURN_DAY, START_WORTH, stockValue, expensesOn, morning, payment, settleChange, bulkDiscount, deliver, discard, fineFor, handOver, madeCost, priceTalk, rot, settleAccount, settleDilemma, split, weekDay, type Answer, type ChangeWay, type Flow, type Outcome, priceIndex } from './week';
import * as sfx from './sfx';
import { addReceipt, giftIn, planReturn, settleGift, settleReturn } from './returns';
import { addRep, applySupply, befriend, firmOf, rivalOf, settleAudit, spreadGossip, sulk, supplyOn } from './pressure';
import { TOUR_SALE, useShopUi } from './shopUi';
import { useShopState } from './shopState';
import { ShopView } from './ShopView';

/*
 * Köy Bakkalı: dükkân batana kadar tezgâhtasın. Tanıdık köylüler kapıdan girer, bir ya da birkaç şey ister;
 * sen fiyatı söylersin. Sevinir, söylenir, pazarlık eder ya da çeker gider; geçen seferi de
 * unutmaz. Kimi veresiye yazdırır. Gün sabah sekizde açılır, akşam kepenk iner; havası ve köy
 * olayı günün kalabalığını ve keseleri değiştirir. Şükrü Amca'nın defterinde eski veresiyeler ve aylar
 * önceki toptancı fiyatları yazılı; boş sayfalara oyuncu kendi notunu alır.
 *
 * İlk günlerde eski borçlular hesap görmeye gelir; doğru cevap defterdedir. Arada vicdanı yoklayan
 * anlar çıkar (week.ts). Raftaki mal sınırlıdır: her akşam fırına ekmek, toptancıya mal söylenir,
 * parası ertesi sabah kasadan çıkar. Fiyatlar her gün, her üründe farklı hızla artar. Gün sonunda
 * kasa eksiye düşerse dükkân batar ve oyun biter; istersen dükkânı daha önce de devredebilirsin.
 */

type Phase = 'intro' | 'shop' | 'dayEnd' | 'final';

/** Yazar kasanın ekranı: son işlemin adı ve tutarı; nakit satışta alınan para ve para üstü. */
type TillScreen = { amount: number | null; open: boolean; label?: string; paid?: number; change?: number };
const TILL_IDLE: TillScreen = { amount: null, open: false };
const TILL_CANCEL: TillScreen = { amount: null, open: false, label: 'İPTAL' };
/** Kasadan geçen paranın ekranda yazan adı. */
const TILL_LABEL: Partial<Record<keyof Flow, string>> = { sales: 'SATIŞ', accounts: 'ESKİ HESAP', collected: 'TAHSİLAT', loan: 'BORÇ VERİLDİ', charity: 'HAYIR', fine: 'CEZA', refund: 'İADE', gift: 'HEDİYE' };

function useBakkal() {
  const [phase, setPhase] = useState<Phase>('intro');
  // dükkânın günden güne süren hâli (kasa, defter, raf, köyün hafızası) ve akşam kaydı: shopState.ts
  const shop = useShopState(phase);
  const { seed, day, setDay, rep, setRep, repAtDayStart, setRepAtDayStart, money, setMoney, flow, setFlow, history, setHistory, daySales, setDaySales, log, setLog, pages, setPages, memories, setMemories, away, setAway, debts, setDebts, paidToday, setPaidToday, lostToday, setLostToday, stock, setStock, carried, setCarried, order, setOrder, old, setOld, spoiled, setSpoiled, keep, setKeep, staleSold, setStaleSold, staleYesterday, setStaleYesterday, short, setShort, coins, setCoins, ethics, setEthics, verdicts, setVerdicts, deeds, setDeeds, lent, setLent, receipts, setReceipts, hidden, setHidden, supply, setSupply, loyal, setLoyal, befriended, setBefriended, bankrupt, setBankrupt, returned, setReturned } = shop;
  const [idx, setIdx] = useState(0);
  const [step, setStep] = useState<Step>('ask');
  const [price, setPrice] = useState('');
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const [lineNo, setLineNo] = useState(0);
  const [saved, setSaved] = useState(() => readSlot(SAVE_KEY, isShopSave));
  const [credited, setCredited] = useState<boolean | null>(null);
  const [till, setTill] = useState<TillScreen>(TILL_IDLE);
  // ekranla ilgili hâl: defter, hesap makinesi, çekmece, görünüm, ses, tanıtım (shopUi.ts)
  const ui = useShopUi();
  const { setBook, openBookAt, setDrawer, tour, setTour } = ui;
  // kepenk kalkarken kartlar gizlenir; kalkınca dükkân açılır
  const [rising, setRising] = useState(false);
  const [staleNote, setStaleNote] = useState<string | null>(null);
  /** Bugünkü satışlarda fiyatın market fiyatına oranı; akşam kahvede konuşulur. */
  const [ratios, setRatios] = useState<number[]>([]);
  /** Müşterinin uzattığı para ve para üstü (küsuratı varsa sorulur). */
  const [pay, setPay] = useState<{ bill: number; change: number; odd: number } | null>(null);
  /** Sakızla verilen para üstünde kaç kez kol çevrildi (null: makine beklemiyor). */
  const [gumGiven, setGumGiven] = useState<number | null>(null);
  /** Eski hesap, ikilem ya da rafta olmayan mal: müşterinin son sözü ve kasaya etkisi. */
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  /** Kapıdaki levha çevrildi mi: her sabah kepenk kalkınca dükkân kapalıdır, oyuncu açar. */
  const [signOpen, setSignOpen] = useState(false);
  /** Satılan paketin içinden çıkan para (karar bekliyor). */
  const [gift, setGift] = useState<{ amount: number; product: Product } | null>(null);
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
  // iade getiren günün sabahındaki fişlere bakar: gün içinde kesilen ya da iade edilen fiş planı değiştirmez
  const [dawn, setDawn] = useState({ day, receipts });
  if (dawn.day !== day) setDawn({ day, receipts });
  const returning = useMemo(() => planReturn(dawn.receipts, seed, day), [dawn.receipts, seed, day]);
  const visits = useMemo(() => {
    const list = weekDay(dayVisits(seed, day, repAtDayStart, weatherOn(seed, day), away, loyal), day, { seed, staleSold: staleYesterday });
    if (!returning || away.includes(returning.villager.id)) return list;
    // iade getiren o gün ayrıca alışverişe gelmez; günün rastgele bir saatinde kapıdan girer
    const rest = list.filter((v) => v.villager.id !== returning.villager.id);
    const at = Math.floor(rng(seed * 5 + day * 3)() * (rest.length + 1));
    rest.splice(at, 0, { villager: returning.villager, customer: customerOf(returning.villager), items: [], credit: false, returning: returning.ask });
    return rest;
  }, [seed, day, repAtDayStart, away, loyal, staleYesterday, returning]);
  // tabela çevrilip dükkân açılmadan müşteri gelmez
  const visit = phase === 'shop' && signOpen ? visits[idx] : undefined;
  // istenenlerden rafta olanlar satılır; kalmayanlar için müşteri söylenir
  const shelf = visit ? split(visit.items, stock) : null;
  const basket = shelf ? basketOn(shelf.have, day) : null;
  // alışveriş olmayan ziyaret: eski hesap, borç isteyen nine ya da istediği hiçbir şey rafta yok
  const errand: Errand = visit?.audit ? 'audit' : visit?.returning ? 'return' : visit?.account ? 'account' : visit?.dilemma === 'loan' ? 'loan' : visit?.charity ? 'charity' : visit?.fine ? 'fine' : shelf && !shelf.have.length ? 'empty' : null;
  // hayırsever bütün açık veresiyeyi öder, batmış olanlar dahil
  const openDebt = debts.filter((d) => !d.paid).reduce((s, d) => s + d.amount, 0);
  const fine = visit?.fine ? fineFor(visit.fine, day) : 0;
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
    if (!pending) setRep((x) => addRep(x, r.rep));
    if (r.mood !== 'counter' && !pending) setMemories((m) => remember(m, visit.villager.id, r.mood, r.mild));
    if (r.sold !== undefined) setRatios((x) => [...x, r.sold! / Math.max(1, basket.fair)]);
    setReaction(r);
    setLineNo((n) => n + 1);
  };

  /** Kasaya para girer ya da çıkar; günün kasa defterine kalemiyle yazılır. */
  const move = (kind: keyof Flow, amount: number) => {
    if (!amount) return;
    setMoney((x) => x + amount);
    setFlow((f) => ({ ...f, [kind]: (f[kind] ?? 0) + amount }));
  };

  /** Mal müşteriye geçer: raftan düşer; rafta bayat varsa eline bayatı da geçebilir. */
  const handGoods = (goods: Product[]) => {
    const h = handOver(stock, old, goods, rng(seed * 61 + day * 101 + idx * 13));
    setStock(h.stock);
    setOld(h.old);
    // tezgâhta hazırlanan tost ve sandviçin malzemesi kasadan çıkar
    move('bufe', -madeCost(goods, day));
    setDaySales((x) => x + 1);
    if (!h.stale.length || !visit) return;
    const what = h.stale.map((p) => p.name.replace(/ \(.*\)$/, '').toLocaleLowerCase('tr-TR')).join(', ');
    // bayatı fark edip şikâyet eden olursa ertesi gün zabıta gelir
    if (complains(visit.villager.id, rng(seed * 7 + day * 53 + idx)())) {
      setStaleSold((n) => n + h.stale.length);
      setStaleNote(`${visit.villager.name} bayat ${what} aldı ve fark etti: belediyeye şikâyet edecek. Yarın zabıta gelir.`);
    } else setStaleNote(`${visit.villager.name} raftaki bayat ${what} aldı, bu sefer fark etmedi.`);
  };

  /** Tezgâhta para el değiştirir: çekmece açılır; satışsa mal raftan düşer ve fiş kesilir. */
  const cash = (amount: number, kind: keyof Flow, goods?: Product[]) => {
    move(kind, amount);
    setTill({ amount, open: true, label: TILL_LABEL[kind] ?? (amount < 0 ? 'ÇIKIŞ' : 'GİRİŞ') });
    sfx.register();
    later(1600, () => setTill((t) => ({ ...t, open: false })));
    if (goods) handGoods(goods);
  };

  /** Hayırsever defteri kapatır: bütün açık (ve batmış) veresiye ödenir. */
  const acceptCharity = () => {
    if (!visit?.charity) return;
    if (openDebt > 0) {
      cash(openDebt, 'charity');
      setDebts((ds) => ds.map((d) => (d.paid ? d : { ...d, paid: day, lost: undefined })));
      setDeeds((v) => [...v, `${visit.villager.name} defterdeki ${tl(openDebt)} veresiyeyi hayır için kapattı.`]);
    }
    settle(
      openDebt > 0
        ? { cash: openDebt, rep: 3, ethics: 0, mood: 'happy', line: 'Hayırlı olsun, köyümün kimseye borcu kalmasın. Kimin ödendiğini söyleme, hayır gizli yapılır.' }
        : { cash: 0, rep: 2, ethics: 0, mood: 'happy', line: 'Maşallah, defterin tertemiz! O zaman dükkânına bereket dilerim.' },
    );
  };

  /** Zabıta dün satılan bayat mal için ceza keser. */
  const payFine = () => {
    if (!visit?.fine) return;
    cash(-fine, 'fine');
    settle({ cash: -fine, rep: -3, ethics: -1, mood: 'grumble', line: 'Tutanak kesildi. Bir daha bayat mal görürsem dükkânı mühürlerim, haberin olsun!', verdict: `Bayat mal sattın: zabıta ${tl(fine)} ceza kesti.` }, 'deed');
  };

  /** Eski hesabın, ikilemin ya da boş rafın sonucu: itibar, vicdan, karne notu, müşterinin son sözü. */
  const settle = (o: Outcome, book?: 'account' | 'deed') => {
    setRep((x) => addRep(x, o.rep));
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
    // eksik paralı çocuğa "eksik olmaz" denince satış olmaz
    else setTill(TILL_CANCEL);
    // satışın itibarı yalnızca mal gerçekten verildiyse; eli boş giden çocuk küsmüş hatırlar
    if (visit.dilemma !== 'loan' && reaction) {
      const sold = o.cash > 0;
      if (sold) setRep((x) => addRep(x, reaction.rep));
      setMemories((m) => remember(m, visit.villager.id, sold ? reaction.mood : o.mood, sold && reaction.mild));
    }
    settle(o, 'deed');
  };

  // temel gıda yoksa söylenir; özel malı getirtmeni ister
  const noStock = () => {
    setTill(TILL_CANCEL);
    return visit?.items.some((p) => isBasic(p.id))
      ? settle({ cash: 0, rep: -1, ethics: 0, mood: 'grumble', line: 'Yok mu? Bakkalda bu bile yoksa… Peki, kasabadan alırım.' })
      : settle({ cash: 0, rep: 0, ethics: 0, mood: 'grumble', line: 'Yok mu? Kemal\'e söyle de getirsin, ben yine gelirim.' });
  };

  const sell = (second: boolean, asked?: number) => {
    const p = asked ?? Number(price);
    if (!visit || !basket || !Number.isFinite(p) || p <= 0) return;
    const mem = memories[visit.villager.id];
    // zincir marketten sonra temel gıdada köylü daha az pahalılığa katlanır
    const local = rivalOf(effectiveType(visit.customer, event, mem), day, shelf!.have);
    // turist alış fiyatının iki katına kadar öder: tavanı malın maliyetinden gelir
    const tourist = visit.customer.id === 'turist';
    const who = tourist ? { ...local, ceiling: Math.max(1.02, (TOURIST_MARKUP * basket.cost) / Math.max(1, basket.fair)) } : local;
    // köylü temel gıdada market fiyatını, öteki malda biraz fazlasını olağan sayar
    const fair = react(p, basket.fair, who, second, firmOf(shelf!.have));
    // pazarlıkçı ilk fiyata, alacak olsa bile, bir kez pazarlık eder; ama kelepir fiyata pazarlık
    // etmez, sevinip alır (piyasanın %15 altı: react'teki "çok ucuz" eşiği)
    const bargain = p <= basket.fair * BARGAIN;
    const raw: Reaction = !second && fair.sold !== undefined && characterOf(visit.villager.id).haggle && !(mem?.loyal ?? 0) && p > 1 && !bargain ? { mood: 'counter', offer: haggleOffer(p), rep: 0 } : fair;
    // maliyetin altında satış köyü sevindirir ama kahvede konuşulmaz: itibar ancak 1 artar
    const under = raw.sold !== undefined && raw.sold < basket.cost ? { ...raw, rep: Math.min(raw.rep, 1) } : raw;
    // turist söylenir ama köyde konuşmaz: yalnızca tavana dayanan fiyat biraz ad kaybettirir
    const r = tourist && under.mood === 'grumble' ? { ...under, rep: Math.max(-1, under.rep + 1) } : under;
    finish(p, r, r.sold !== undefined && (!!visit.dilemma || visit.credit));
    // çok kazıklanan (ya da çekip giden) köylü kahvede anlatır: iki köylü daha duyar
    if (r.rep <= -2) setMemories((m) => spreadGossip(m, visit.villager.id, seed, day).memories);
    // müşteri fiyatı kabul ettiği an kasa tutarı yazar; para (ya da veresiye) sonra işlenir
    if (r.sold !== undefined) setTill({ amount: r.sold, open: false, label: 'SATIŞ' });
    // müşteri çekip gittiyse satış iptal: ekranda girilen fiyat kalmaz
    else if (r.mood === 'leave') setTill(TILL_CANCEL);
    // istediği temel gıdanın bir kısmı rafta yoksa söylenir; özel malın yokluğunu dert etmez
    const lacking = shelf?.missing.filter((p) => isBasic(p.id)).length ?? 0;
    if (!second && lacking) setRep((x) => addRep(x, -lacking));
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
      cutReceipt(r.sold, shelf!.have);
      const g = findGift(shelf!.have);
      if (askChange(r.sold)) return;
      return afterSale(g);
    }
    setStep('result');
  };

  /** Satış fişi kasadan çıkar, çekmeceye düşer. */
  const cutReceipt = (total: number, goods: Product[], credit = false) => {
    if (!visit) return;
    setReceipts((rs) => addReceipt(rs, { day, who: visit.villager.id, name: visit.villager.name, items: goods.map((p) => ({ id: p.id, name: p.name })), total, credit: credit || undefined }));
  };

  /** Satılan paketlerden birinin içinden para çıkar mı: çıkarsa karar sırası gelir. */
  const findGift = (goods: Product[]) => {
    const g = giftIn(goods, seed * 97 + day * 13 + idx * 7);
    setGift(g);
    return g;
  };
  const afterSale = (g: { amount: number } | null) => setStep(g ? 'gift' : 'result');

  /** Paketten çıkan para: kasaya mı atılır, müşteriye mi verilir. */
  const decideGift = (keep: boolean) => {
    if (!gift || !visit) return;
    const o = settleGift(gift.amount, keep, visit.villager.name);
    if (o.cash) cash(o.cash, 'gift');
    if (keep) setHidden((h) => h + gift.amount);
    setGift(null);
    settle(o, 'deed');
  };

  /** Vergi memuru Z raporlarıyla kasayı karşılaştırır: kayıt dışı para varsa ceza keser. */
  const showBooks = () => {
    if (!visit?.audit) return;
    const o = settleAudit(hidden, priceIndex(day));
    if (o.cash) cash(o.cash, 'fine');
    setHidden(0);
    settle(o, 'deed');
  };

  /** İade: parayı geri vermek ya da vermemek. Fişi çekmecede aramak oyuncuya kalmış. */
  const decideReturn = (accept: boolean) => {
    const ask = visit?.returning;
    if (!ask || !visit) return;
    const o = settleReturn(ask, accept, visit.villager.name);
    if (o.cash) cash(o.cash, 'refund');
    // para geri verildiyse mal tezgâha gelir; gerçek (ya da fişteki kadarı ödenen) iade fişe işlenir
    if (o.cash < 0 && ask.restock) setStock((st) => ({ ...st, [ask.product.id]: (st[ask.product.id] ?? 0) + 1 }));
    if (o.cash < 0 && (ask.kind === 'real' || ask.kind === 'inflated')) setReceipts((rs) => rs.map((x) => (x.no === ask.receipt ? { ...x, returnedOn: day } : x)));
    setMemories((m) => remember(m, visit.villager.id, o.mood));
    setDrawer(false);
    settle(o, 'deed');
  };

  /** Satıştan sonra para üstü: küsurat varsa bozukluk mu, sakız mı, yuvarlamak mı sorulur. */
  const askChange = (sold: number) => {
    const p = payment(sold, seed + day * 31 + idx * 7);
    // kasa ekranı müşterinin uzattığı parayı ve üstünü de yazar
    if (p.bill > sold) setTill((t) => ({ ...t, paid: p.bill, change: p.change }));
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
    setRep((x) => addRep(x, o.rep));
    setOutcome(o);
    setLineNo((n) => n + 1);
    afterSale(gift);
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
    setRep((x) => addRep(x, reaction.rep));
    setMemories((m) => remember(m, visit.villager.id, write ? reaction.mood : 'grumble', write && reaction.mild));
    if (write) {
      // mal gider, para borç ödenince kasaya girer (belki hiç girmez)
      setDebts((d) => [...d, { who: visit.villager.id, name: visit.villager.name, amount: reaction.sold!, cost: basket.cost, day }]);
      cutReceipt(reaction.sold, shelf!.have, true);
      // para girmez ama satış kasadan geçer: ekranda veresiye tutarı yazar
      setTill({ amount: reaction.sold, open: false, label: 'VERESİYE' });
      handGoods(shelf!.have);
      setRep((x) => addRep(x, 1));
      // deftere oyuncu kendi eliyle yazar: defter veresiye sayfasında açılır
      openBookAt(CREDIT_PAGE);
    } else {
      cash(reaction.sold, 'sales', shelf!.have);
      cutReceipt(reaction.sold, shelf!.have);
      const g = findGift(shelf!.have);
      setRep((x) => addRep(x, -1));
      // veresiyesi yazılmayan birkaç gün küser: kasabadaki markete gider
      setMemories((m) => sulk(m, visit.villager.id, day));
      setCredited(false);
      setLineNo((n) => n + 1);
      if (askChange(reaction.sold)) return;
      return afterSale(g);
    }
    setCredited(write);
    setLineNo((n) => n + 1);
    setStep('result');
  };

  /**
   * Kepenk iner: borcunu getirenler gelir, elektrik ve (haftada bir) vergi ödenir, rafta kalan ekmek
   * bayatlar, gece bir kısım süt, yoğurt, yumurta, peynir bozulur; atılıp atılmayacağı oyuncuya
   * kalır. Kasa eksideyse dükkân batar.
   */
  const closeDay = () => {
    const settled = settleDebts(debts, seed, day, rep);
    const said = priceTalk(ratios);
    if (said) setRep((x) => addRep(x, said.rep));
    const paid = settled.filter((d, i) => d.paid && !debts[i].paid);
    const lost = settled.filter((d, i) => d.lost && !debts[i].lost);
    const collected = paid.reduce((s, d) => s + d.amount, 0);
    const back = lent && day === LOAN_BACK ? LOAN : 0;
    const { power, tax } = expensesOn(day);
    // ilk gece Şükrü Amca'nın malı tazedir: yalnız ekmek bayatlar
    const night = rot(stock, old, rng(seed * 59 + day * 11), day === 1 ? DAILY : undefined);
    setDebts(settled);
    setPaidToday(paid);
    // borcunu ödeyen sadık müşteri olur
    if (paid.length) setMemories((m) => paid.reduce((acc, d) => befriend(acc, d.who), m));
    setBefriended(paid.map((d) => d.name));
    setLostToday(lost);
    // batan borç köyde konuşulur: borçlu da artık yüzüne bakamaz
    if (lost.length) {
      setRep((x) => addRep(x, -lost.length));
      setMemories((m) => lost.reduce((acc, d) => remember(acc, d.who, 'leave'), m));
    }
    move('collected', collected);
    move('loan', back);
    if (back) setDeeds((v) => [...v, `Nazmiye Nine'nin oğlu ${LOAN} ₺ borcu gönderdi.`]);
    move('power', -power);
    move('tax', -tax);
    // markete gidenlerin kini gece biraz soğur
    setMemories((m) => coolOff(m, away));
    setOld(night.old);
    setSpoiled(night.spoiled);
    setKeep({});
    const end = money + collected + back - power - tax;
    // kepenk inince defter de kapanır
    setBook(false);
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
    setStaleNote(null);
    setGift(null);
    setDrawer(false);
    setStep('ask');
    // yeni müşteride kasa sıfırlanır: önceki satışın tutarı ekranda kalmaz
    setTill(TILL_IDLE);
    if (idx + 1 < visits.length) setIdx(idx + 1);
    else closeDay();
  };

  /** Ertesi sabah: Kemal ekmeği ve malı getirir, parası o günün fiyatıyla peşin ödenir; büyük siparişe indirim yapar. */
  const nextDay = () =>
    raise(() => {
      const d = day + 1;
      // atılmasına karar verilen bayat mal raftan iner; tutulan bayat ekmek yeni ekmeğin yanında kalır
      const shelf = discard(stock, old, keep);
      // peşin, kasadaki para kadar: önce ekmek, sonra öteki mallar
      // Kemal bazen gelmez ya da yarısını getirir; gelmeyenin parası ödenmez
      const s = supplyOn(seed, d);
      setSupply(s);
      const goods = deliver(applySupply(order, s), money, d);
      setFlow(EMPTY_FLOW);
      move('wholesale', -(goods.cost - bulkDiscount(goods.cost)));
      setShort(goods.short);
      setCoins(COINS_DAILY);
      const next = morning(shelf.stock, (goods.delivered.ekmek ?? 0) + (shelf.old.ekmek ?? 0), goods.delivered);
      setStock(next);
      setCarried((c) => [...new Set([...c, ...Object.keys(goods.delivered)])]);
      setOld(shelf.old.ekmek ? { ...shelf.old, ekmek: Math.min(shelf.old.ekmek, next.ekmek ?? 0) } : shelf.old);
      setKeep({});
      setStaleYesterday(staleSold);
      setStaleSold(0);
      setRatios([]);
      setOrder({ ekmek: order.ekmek ?? 0 });
      setDay(d);
      setIdx(0);
      setDaySales(0);
      setPaidToday([]);
      setLostToday([]);
      // gece köy biraz unutur: itibar başlangıca doğru döner
      const morningRep = forget(rep);
      setAway(awayOf(memories, d));
      setLoyal(loyalOf(memories));
      setBefriended([]);
      setRep(morningRep);
      setRepAtDayStart(morningRep);
      setTill(TILL_IDLE);
      // levha ilk gün öğretilir; sonraki sabahlar dükkân kepenkle birlikte açılır
      setSignOpen(true);
      setPhase('shop');
    });


  const restart = () =>
    raise(() => {
      shop.reset();
      setIdx(0);
      setTill(TILL_IDLE);
      setSignOpen(false);
      setPhase('shop');
    });

  /** Levha çevrilir: dışarıda AÇIK yazar, ilk müşteri kapıdan girer. */
  const openShop = () => {
    if (phase !== 'shop' || signOpen) return;
    sfx.key();
    setSignOpen(true);
    // tanıtımda levha çevrilince ilk müşteriyle birlikte satış yapılır
    ui.signTurned();
  };

  // ilk satış adımı: müşteri fiyata tepki verince tanıtım biter
  useEffect(() => {
    if (tour === TOUR_SALE && (reaction || outcome)) setTour(null);
  }, [tour, reaction, outcome, setTour]);

  const playing = phase === 'shop' || phase === 'dayEnd';
  const unpaid = debts.filter((d) => !d.paid && !d.lost).reduce((s, d) => s + d.amount, 0);
  const written = debts.filter((d) => d.lost).reduce((s, d) => s + d.amount, 0);
  /** Kayıttan dönüş: aynı akşamın gün sonu kartı açılır. */
  const resume = (s: ShopSave) =>
    raise(() => {
      shop.restore(s);
      setSaved(null);
      setPhase('dayEnd');
    });

  // dükkân kapandı: salonun defterine tik ve karne
  useEffect(() => {
    if (phase !== 'final') return;
    const gain = money + stockValue(stock, day) + unpaid - START_WORTH;
    const t = titleFor(day, rep, gain);
    // sayısal sonuç: dükkânın başlangıca göre kazancı (₺)
    markPlayed('bakkal', t.title, Math.round(gain));
    // yalnızca final ekranı açıldığında
    // oxlint-disable-next-line react/exhaustive-deps
  }, [phase]);

  /*
   * ShopView'a üç grup gider: `state` dükkânın ve tezgâhın okunan hâli, `act` oyuncunun yapabildiği
   * işler, `ui` yalnızca ekranla ilgili hâl (shopUi.ts). Düz yüz alanlık bir torba yerine kim neyi
   * okuyor, kim neyi değiştiriyor ayrı görünür.
   */
  const state = { bankrupt, basket, befriended, carried, coins, credited, day, daySales, deeds, errand, ethics, fine, flow, gift, gumGiven, history, hour, idx, keep, lineNo, log, lostToday, memories, money, old, openDebt, order, outcome, pages, paidToday, pay, phase, playing, price, reaction, receipts, rep, repAtDayStart, returned, rising, saved, seed, shelf, short, signOpen, spoiled, staleNote, step, stock, supply, till, unpaid, verdicts, visit, visits, weather, written };
  const act = { acceptCharity, answerAccount, decideCredit, decideDilemma, decideGift, decideReturn, giveChange, next, nextDay, noStock, openShop, payFine, raise, restart, resume, sell, setKeep, setOrder, setPages, setPhase, setPrice, setSaved, setSignOpen, showBooks, turnGum };
  return { state, act, ui };
}

/** Oyunun bütün hâli ve işleri: ShopView bunları çizer. */
export type Bakkal = ReturnType<typeof useBakkal>;

export function BakkalGame() {
  return <ShopView g={useBakkal()} />;
}
