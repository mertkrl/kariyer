import { useEffect, useState } from 'react';
import { clearSlot, writeSlot } from '../../arcade/saveSlot';
import { SAVE_KEY, type ShopSave } from './save';
import { BASIC, START_REPUTATION, loyalOf, type Debt, type LogEntry, type Memories } from './data';
import { EMPTY_PAGES, type Pages } from './pages';
import { BREAD_DEFAULT, COINS_DAILY, EMPTY_FLOW, START_CASH, START_STOCK, type Flow, type Stock } from './week';
import type { Receipt } from './returns';
import type { Supply } from './pressure';

/*
 * Dükkânın günden güne süren hâli: kasa ve akış, defter ve veresiye, raf ve sipariş, köyün hafızası,
 * karne notları. Gün içindeki anlık hâl (sıradaki müşteri, söylenen fiyat, açık pencereler)
 * BakkalGame'de kalır. Her akşam gün sonu kartı açılınca kaydedilir, dükkân kapanınca kayıt silinir;
 * `reset` yeni bir otuz gün, `restore` kayıttan dönüş.
 */
export function useShopState(phase: string) {
  const [seed, setSeed] = useState(() => Date.now() % 100000);
  const [day, setDay] = useState(1);
  const [rep, setRep] = useState(START_REPUTATION);
  const [repAtDayStart, setRepAtDayStart] = useState(START_REPUTATION);
  const [money, setMoney] = useState(START_CASH);
  /** Bugün kasaya girenler ve çıkanlar. */
  const [flow, setFlow] = useState<Flow>(EMPTY_FLOW);
  /** Her gün sonundaki kasa (ilki açılış). */
  const [history, setHistory] = useState<number[]>([START_CASH]);
  const [daySales, setDaySales] = useState(0);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [pages, setPages] = useState<Pages>(EMPTY_PAGES);
  const [memories, setMemories] = useState<Memories>({});
  /** Sabah, kini birikip kasabanın marketine gidenler: o gün dükkâna uğramazlar. */
  const [away, setAway] = useState<string[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [paidToday, setPaidToday] = useState<Debt[]>([]);
  /** Bu akşam vadesi dolup batan veresiyeler. */
  const [lostToday, setLostToday] = useState<Debt[]>([]);
  const [stock, setStock] = useState<Stock>(START_STOCK);
  /** Dükkânın tuttuğu mallar: açılışta hepsi; "paraya göre doldur" bunları doldurur. */
  const [carried, setCarried] = useState<string[]>(Object.keys(START_STOCK));
  /** Akşam toptancı Kemal'e söylenen mal; ekmek de onunla gelir, adedi ertesi akşama aynen kalır. */
  const [order, setOrder] = useState<Stock>({ ekmek: BREAD_DEFAULT });
  /** Raftaki bayat ve bozuk mal (stoğun içinde), bu gece bozulan ve hangilerinin rafta tutulacağı. */
  const [old, setOld] = useState<Stock>({});
  const [spoiled, setSpoiled] = useState<Stock>({});
  const [keep, setKeep] = useState<Record<string, boolean>>({});
  /** Bugün ve dün müşteriye giden bayat mal: dün satıldıysa bugün zabıta gelir. */
  const [staleSold, setStaleSold] = useState(0);
  const [staleYesterday, setStaleYesterday] = useState(0);
  const [bankrupt, setBankrupt] = useState(false);
  /** Şükrü Amca memleketten döndü: dükkân batmadan son güne varıldı. */
  const [returned, setReturned] = useState(false);
  /** Bu sabah kasadaki para yetmediği için geri giden mal oldu mu. */
  const [short, setShort] = useState(false);
  /** Kasadaki bozukluk (₺): her sabah bankadan bozdurulur. */
  const [coins, setCoins] = useState(COINS_DAILY);
  const [ethics, setEthics] = useState(0);
  /** Eski hesapların ve vicdan anlarının karneye düşen notları. */
  const [verdicts, setVerdicts] = useState<string[]>([]);
  const [deeds, setDeeds] = useState<string[]>([]);
  const [lent, setLent] = useState(false);
  /** Kasanın çekmecesindeki fişler; iade getirenin fişi burada aranır. */
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  /** Kasaya atılıp Z raporuna girmeyen para: vergi memuru bulursa ceza keser. */
  const [hidden, setHidden] = useState(0);
  /** Sabah Kemal'in getirdiği: tam, yarım ya da hiç. */
  const [supply, setSupply] = useState<Supply>('ok');
  /** Sadık müşteriler (sabahki hâl): sıranın başına geçerler. */
  const [loyal, setLoyal] = useState<string[]>([]);
  /** Bugün veresiyesi yazılmadığı için küsenler ve borcunu ödeyip sadık müşteri olanlar (gün sonu notu). */
  const [befriended, setBefriended] = useState<string[]>([]);

  // her akşam gün sonu kartı açılınca kayıt; dükkân kapanınca kayıt silinir
  useEffect(() => {
    if (phase === 'final') {
      clearSlot(SAVE_KEY);
      return;
    }
    if (phase !== 'dayEnd') return;
    const snap: ShopSave = { v: 1, seed, day, rep, repAtDayStart, money, flow, history, daySales, log, pages, memories, away, debts, paidToday, lostToday, stock, carried, bread: order.ekmek ?? 0, order, stale: old.ekmek ?? 0, spoiled, old, keep, staleSold, short, coins, ethics, verdicts, deeds, lent, receipts, hidden };
    writeSlot(SAVE_KEY, snap);
  }, [phase, seed, day, rep, repAtDayStart, money, flow, history, daySales, log, pages, memories, away, debts, paidToday, lostToday, stock, carried, order, old, spoiled, keep, staleSold, short, coins, ethics, verdicts, deeds, lent, receipts, hidden]);

  /** Yeni oyun: Şükrü Amca'nın bıraktığı dükkân, başka bir köy tohumuyla. */
  const reset = () => {
    setSeed((s) => s + 7);
    setDay(1);
    setRep(START_REPUTATION);
    setRepAtDayStart(START_REPUTATION);
    setMoney(START_CASH);
    setFlow(EMPTY_FLOW);
    setHistory([START_CASH]);
    setDaySales(0);
    setLog([]);
    setPages(EMPTY_PAGES);
    setMemories({});
    setAway([]);
    setDebts([]);
    setPaidToday([]);
    setLostToday([]);
    setStock(START_STOCK);
    setCarried(Object.keys(START_STOCK));
    setOrder({ ekmek: BREAD_DEFAULT });
    setOld({});
    setSpoiled({});
    setKeep({});
    setStaleSold(0);
    setStaleYesterday(0);
    setBankrupt(false);
    setReturned(false);
    setReceipts([]);
    setHidden(0);
    setSupply('ok');
    setLoyal([]);
    setBefriended([]);
    setShort(false);
    setCoins(COINS_DAILY);
    setEthics(0);
    setVerdicts([]);
    setDeeds([]);
    setLent(false);
  };

  /** Kayıttan dönüş: aynı akşamın dükkânı. */
  const restore = (s: ShopSave) => {
    setSeed(s.seed);
    setDay(s.day);
    setRep(s.rep);
    setRepAtDayStart(s.repAtDayStart);
    setMoney(s.money);
    setFlow({ ...EMPTY_FLOW, ...s.flow });
    setHistory(s.history);
    setDaySales(s.daySales);
    setLog(s.log);
    setPages(s.pages);
    setMemories(s.memories);
    setAway(s.away);
    setDebts(s.debts);
    setPaidToday(s.paidToday);
    setLostToday(s.lostToday);
    setStock(s.stock);
    setCarried(s.carried ?? [...new Set([...BASIC, ...Object.keys(s.stock).filter((id) => s.stock[id] > 0)])]);
    setOrder({ ekmek: s.bread, ...s.order });
    setOld(s.old ?? {});
    setSpoiled(s.spoiled);
    setKeep(s.keep ?? {});
    setStaleSold(s.staleSold ?? 0);
    setStaleYesterday(0);
    setShort(s.short);
    setCoins(s.coins);
    setEthics(s.ethics);
    setVerdicts(s.verdicts);
    setDeeds(s.deeds);
    setLent(s.lent);
    setReceipts(Array.isArray(s.receipts) ? s.receipts : []);
    setHidden(typeof s.hidden === 'number' ? s.hidden : 0);
    setLoyal(loyalOf(s.memories));
  };

  return { seed, setSeed, day, setDay, rep, setRep, repAtDayStart, setRepAtDayStart, money, setMoney, flow, setFlow, history, setHistory, daySales, setDaySales, log, setLog, pages, setPages, memories, setMemories, away, setAway, debts, setDebts, paidToday, setPaidToday, lostToday, setLostToday, stock, setStock, carried, setCarried, order, setOrder, old, setOld, spoiled, setSpoiled, keep, setKeep, staleSold, setStaleSold, staleYesterday, setStaleYesterday, short, setShort, coins, setCoins, ethics, setEthics, verdicts, setVerdicts, deeds, setDeeds, lent, setLent, receipts, setReceipts, hidden, setHidden, supply, setSupply, loyal, setLoyal, befriended, setBefriended, bankrupt, setBankrupt, returned, setReturned, reset, restore };
}
