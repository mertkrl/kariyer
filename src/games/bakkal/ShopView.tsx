import type { CSSProperties } from 'react';
import { clearSlot } from '../../arcade/saveSlot';
import { SAVE_KEY } from './save';
import { StudioMark } from '../../arcade/Studio';
import { VILLAGERS, peddlerOn, RIVAL_DAY, LOW_REP, clockText, type Reaction } from './data';
import { Customer, type Face } from './Customer';
import { Ledger } from './Ledger';
import { Calculator, CashRegister } from './Register';
import { ShopScene } from './ShopScene';
import { Shutter } from './Shutter';
import { DayEndCard, FinalCard, IntroCard } from './Cards';
import { say } from './say';
import { Till } from './Till';
import { TopBar } from './TopBar';
import { GUM, START_WORTH, stockValue, expensesOn } from './week';
import { ReceiptDrawer } from './Drawer';
import { SUPPLY_NOTE } from './pressure';
import { viewAttrs } from './access';
import { TourOverlay } from './Tour';
import { SignFallback } from './SignFallback';
import styles from './BakkalGame.module.css';
import type { Bakkal } from './BakkalGame';

/* Dükkânın ekranı: sahne, tezgâh, kasa, defter, kartlar ve tanıtım. Bütün hâl ve işler BakkalGame'den (`g`) gelir. */

/** Fiyata tepkinin yüzü: kelepire sevinç, akıl almaz fiyata şok; gerisi tepkinin kendisi. */
const faceOf = (r: Reaction): Face => (r.mood === 'happy' && r.rep >= 2 ? 'delight' : r.mood === 'leave' && r.rep <= -4 ? 'shock' : r.mood);

export function ShopView({ g }: { g: Bakkal }) {
  // dükkânın ve tezgâhın hâli, oyuncunun işleri, ekranın hâli (BakkalGame.tsx, shopUi.ts)
  const { bankrupt, basket, befriended, carried, coins, credited, day, daySales, deeds, errand, ethics, fine, flow, gift, gumGiven, history, hour, idx, keep, lineNo, log, lostToday, memories, money, old, openDebt, order, outcome, pages, paidToday, pay, phase, playing, price, reaction, receipts, rep, repAtDayStart, returned, rising, saved, seed, shelf, short, signOpen, spoiled, staleNote, step, stock, supply, till, unpaid, verdicts, visit, visits, weather, written } = g.state;
  const { acceptCharity, answerAccount, decideCredit, decideDilemma, decideGift, decideReturn, giveChange, next, nextDay, noStock, openShop, payFine, raise, restart, resume, sell, setKeep, setOrder, setPages, setPhase, setPrice, setSaved, setSignOpen, showBooks, turnGum } = g.act;
  const { book, bookAt, calc, changeVolume, drawer, muted, openBook, setBook, setBookAt, setCalc, setDrawer, setTour, setView, toggleMute, tour, tourTo, view, volume } = g.ui;
  return (
    <div className={styles.app} {...viewAttrs(view)}>
      {/* ekran okuyucunun başlık listesinde oyunun adı (görsel başlık sahnenin içinde) */}
      <h1 className="sr-only">Köy Bakkalı</h1>
      <ShopScene open={signOpen} onSign={openShop} coach={tour === null && !signOpen ? 'sign' : null} stock={stock} gumActive={gumGiven !== null && !!pay && gumGiven < pay.odd} onGum={turnGum} hour={hour} weather={weather} onCalc={() => setCalc((c) => !c)} onBook={openBook}>
        {visit && (
          <Customer
            key={`${day}-${idx}`}
            type={visit.customer.id}
            look={visit.villager.look}
            face={outcome ? outcome.mood : credited === false ? 'grumble' : credited === true ? 'happy' : reaction ? faceOf(reaction) : 'ask'}
            state={reaction?.mood === 'leave' || outcome?.mood === 'leave' || (step === 'dilemma' && visit.dilemma === 'change') ? 'leave' : 'enter'}
            name={visit.villager.name}
            reply={!!reaction}
            lineKey={String(lineNo)}
            line={say({ visit, step, outcome, reaction, credited, lineNo, memory: memories[visit.villager.id], day })}
          />
        )}
      </ShopScene>
      <TopBar intro={phase === 'intro'} risk={playing ? 'Dükkân her akşam kaydedilir; bugünün satışları kaybolur.' : undefined} day={day} clock={clockText(hour)} money={money} rep={rep} unpaid={unpaid} muted={muted} onMute={toggleMute} volume={volume} onVolume={changeVolume} view={view} onView={setView} />

      <Shutter down={phase !== 'shop' && !rising} />

      {phase === 'intro' && !rising && (
        <IntroCard
          onOpen={() =>
            raise(() => {
              clearSlot(SAVE_KEY);
              setSaved(null);
              setSignOpen(false);
              // yeni dükkânın ilk sabahı: defter, kasa ve levha kısaca tanıtılır
              setTour(day === 1 ? 0 : null);
              setPhase('shop');
            })
          }
          busy={rising}
          resumeDay={saved?.day}
          onResume={saved ? () => resume(saved) : undefined}
        />
      )}

      {/* dükkân kapalıyken yönerge kartı yok: kapıdaki AÇIK levhası yanıp söner, oyuncu oradan açar */}
      {phase === 'shop' && !signOpen && !rising && tour === null && <SignFallback onOpen={openShop} />}
      {phase === 'shop' && !rising && tour !== null && <TourOverlay at={tour} onNext={() => tourTo(tour + 1)} onBack={() => tourTo(tour - 1)} onSkip={() => tourTo(null)} />}

      {phase === 'shop' && visit && basket && shelf && (
        <Till
          firstDay={day === 1}
          queue={`${day}. gün · ${clockText(hour)} · müşteri ${idx + 1}/${visits.length}`}
          news={[supply !== 'ok' && idx === 0 ? SUPPLY_NOTE[supply] : null, peddlerOn(seed, day) && idx === 0 ? '🛻 Bugün köye seyyar satıcı geldi: meydanda tezgâh açmış, müşteri az.' : null, day === RIVAL_DAY && idx === 0 ? '🏬 Kasabaya zincir market açıldı: temel gıdada köylü fiyata daha çok bakacak.' : null].filter((x): x is string => !!x)}
          onAudit={showBooks}
          last={idx + 1 >= visits.length}
          visit={visit}
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
          onCharity={acceptCharity}
          onFine={payFine}
          charity={openDebt}
          fine={fine}
          staleNote={staleNote}
          pay={pay}
          coins={coins}
          gum={stock[GUM] ?? 0}
          gumGiven={gumGiven}
          onChange={giveChange}
          onReturn={decideReturn}
          receipts={receipts}
          onDrawer={() => setDrawer(true)}
          gift={gift}
          onGift={decideGift}
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
          old={old}
          spoiled={spoiled}
          keep={keep}
          onKeep={setKeep}
          short={short}
          stock={stock}
          order={order}
          onOrder={setOrder}
          carried={carried}
          shelf={stockValue(stock, day)}
          lowRep={rep < LOW_REP}
          receipts={receipts}
          befriended={befriended}
          supplyNote={supply !== 'ok' ? SUPPLY_NOTE[supply] : null}
          onNext={nextDay}
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
          friend={VILLAGERS.find((v) => v.id === Object.entries(memories).sort((x, y) => y[1].happy - x[1].happy).find(([, m]) => m.happy >= 2)?.[0])?.name}
          foe={VILLAGERS.find((v) => v.id === Object.entries(memories).sort((x, y) => y[1].grudge - x[1].grudge).find(([, m]) => m.grudge >= 2)?.[0])?.name}
          worth={money + stockValue(stock, day) + unpaid}
          startWorth={START_WORTH}
          shelf={stockValue(stock, day)}
          onRestart={restart}
        />
      )}

      {phase === 'shop' && (visit || !rising) && (
        <CashRegister
          value={price}
          onChange={setPrice}
          onSubmit={(v) => (errand === 'account' ? answerAccount(v) : sell(step === 'counter', v))}
          active={!!visit && ((step === 'ask' && (!errand || (errand === 'account' && visit.account!.kind !== 'claim'))) || step === 'counter')}
          label={!visit ? 'KASA' : errand === 'account' ? 'BORÇ' : step === 'counter' ? 'SON SÖZ' : visit.items.length > 1 ? 'TOPLAM' : 'FİYAT'}
          shown={till}
          open={till.open || drawer}
          onDrawer={() => setDrawer(true)}
        />
      )}
      {drawer && phase === 'shop' && <ReceiptDrawer receipts={receipts} day={day} onClose={() => setDrawer(false)} />}
      {calc && <Calculator onClose={() => setCalc(false)} />}
      {book && phase !== 'intro' && (
        <Ledger pages={pages} at={bookAt} onTurn={setBookAt} onChange={(id, page) => setPages((p) => ({ ...p, [id]: page }))} onClose={() => setBook(false)} />
      )}

      {/* KASM damgası kepengin rayının (alt profil + kaldırım, 66 px) üstünde dursun */}
      <footer className={styles.sign} style={{ '--studio-mark-bottom': '80px' } as CSSProperties}>
        {phase === 'intro' && <StudioMark minimal />}
      </footer>
    </div>
  );
}
