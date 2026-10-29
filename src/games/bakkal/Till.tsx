import { tl, type Product, type Reaction, type Visit } from './data';
import { LOAN, dilemmaAsk, shortBy, type Answer, type ChangeWay, type Outcome, type Stock } from './week';
import styles from './BakkalGame.module.css';

/*
 * Tezgâhın önündeki panel: sıradaki müşterinin istediği (ya da eski hesap, borç isteyen nine),
 * raftan biten mal, pazarlık, veresiye ve ikilem düğmeleri, satışın sonucu. Fiyat ve borç tutarı
 * yazar kasadan girilir; bu panel yalnızca seçenekleri ve sonucu gösterir.
 */

export type Errand = 'account' | 'loan' | 'empty' | null;
export type Step = 'ask' | 'counter' | 'credit' | 'dilemma' | 'change' | 'result';

export function Till({
  queue,
  last,
  visit,
  stock,
  shelf,
  errand,
  step,
  reaction,
  outcome,
  credited,
  onSell,
  onCredit,
  onAccount,
  onDilemma,
  onNoStock,
  onNext,
  pay,
  coins,
  gum,
  gumGiven,
  onChange,
}: {
  queue: string;
  last: boolean;
  visit: Visit;
  stock: Stock;
  shelf: { have: Product[]; missing: Product[] };
  errand: Errand;
  step: Step;
  reaction: Reaction | null;
  outcome: Outcome | null;
  credited: boolean | null;
  onSell: (second: boolean, asked?: number) => void;
  onCredit: (write: boolean) => void;
  onAccount: (a: Answer) => void;
  onDilemma: (kindly: boolean) => void;
  onNoStock: () => void;
  onNext: () => void;
  /** Müşterinin uzattığı para ve para üstü. */
  pay: { bill: number; change: number; odd: number } | null;
  /** Kasadaki bozukluk (₺) ve kavanozdaki sakız. */
  coins: number;
  gum: number;
  /** Sakızla verilirken çevrilen kol sayısı (null: sakız seçilmedi). */
  gumGiven: number | null;
  onChange: (way: ChangeWay) => void;
}) {
  return (
    <main className={styles.shop}>

      <section className={styles.till}>
        <p className={styles.queue}>
          {queue}
        </p>
        {errand === 'account' || errand === 'loan' ? (
          <div className={styles.product}>
            <span className={styles.big}>{errand === 'account' ? '📒' : '💊'}</span>
            <b>{errand === 'account' ? `Eski hesap · ${visit.villager.name}` : `${visit.villager.name} borç istiyor`}</b>
          </div>
        ) : (
          <div className={styles.product}>
            <span className={styles.big}>{visit.items.map((i) => i.emoji).join('')}</span>
            <span>
              {visit.items.map((i) => (
                <b key={i.id} className={stock[i.id] ? '' : styles.gone}>
                  {i.name}
                </b>
              ))}
            </span>
          </div>
        )}

        {step === 'ask' && !errand && shelf.missing.length > 0 && (
          <p className={styles.warn}>Rafta kalmamış: {shelf.missing.map((i) => i.name).join(', ')}. Gerisini alır ama söylenir.</p>
        )}
        {step === 'ask' && !errand && <p className={styles.or}>Fiyatı kasaya gir, ONAY'a bas.</p>}

        {step === 'ask' && errand === 'empty' && (
          <div className={styles.priceForm}>
            <span className={styles.warn}>İstediği hiçbir şey rafta kalmamış.</span>
            <button autoFocus className={styles.primary} onClick={onNoStock}>
              Kusura bakma, kalmadı
            </button>
          </div>
        )}

        {step === 'ask' && errand === 'account' && visit.account!.kind !== 'claim' && (
          <div className={styles.priceForm}>
            <span className={styles.or}>Deftere bak: borcu kasaya gir, ONAY'a bas. Ya da:</span>
            <button className={styles.ghost} onClick={() => onAccount('none')}>
              Borcun yok, ödenmiş
            </button>
          </div>
        )}

        {step === 'ask' && errand === 'account' && visit.account!.kind === 'claim' && (
          <div className={styles.priceForm}>
            <span className={styles.or}>Deftere bak, kararı sen ver:</span>
            <button className={styles.primary} onClick={() => onAccount('believe')}>
              İnandım, çiziyorum
            </button>
            <button className={styles.ghost} onClick={() => onAccount('insist')}>
              Defterde açık, ödemelisin
            </button>
          </div>
        )}

        {step === 'ask' && errand === 'loan' && (
          <div className={styles.priceForm}>
            <span>{tl(LOAN)} istiyor, oğlu birkaç güne gönderecekmiş.</span>
            <button className={styles.primary} onClick={() => onDilemma(true)}>
              Ver
            </button>
            <button className={styles.ghost} onClick={() => onDilemma(false)}>
              Veremem
            </button>
          </div>
        )}

        {step === 'dilemma' && reaction?.sold !== undefined && (
          <div className={styles.priceForm}>
            <span>
              {visit.dilemma === 'short'
                ? `Fiyat ${tl(reaction.sold)}, çocuğun elinde ${tl(reaction.sold - shortBy(reaction.sold))} var.`
                : dilemmaAsk('change', reaction.sold)}
            </span>
            <button autoFocus className={styles.primary} onClick={() => onDilemma(true)}>
              {visit.dilemma === 'short' ? 'Olsun, eksik kalsın' : 'Arkasından koş, üstünü ver'}
            </button>
            <button className={styles.ghost} onClick={() => onDilemma(false)}>
              {visit.dilemma === 'short' ? 'Eksik olmaz' : 'Kasaya at'}
            </button>
          </div>
        )}

        {step === 'counter' && reaction?.offer !== undefined && (
          <div className={styles.counterOffer}>
            <button type="button" className={styles.primary} onClick={() => onSell(true, reaction.offer)}>
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
            <button autoFocus className={styles.primary} onClick={() => onCredit(true)}>
              📝 Deftere yaz
            </button>
            <button className={styles.ghost} onClick={() => onCredit(false)}>
              Peşin isterim
            </button>
          </div>
        )}

        {step === 'change' && pay && gumGiven !== null && (
          <p className={styles.or}>
            🍬 Tezgâhtaki sakız makinesinin koluna tıkla:{' '}
            <b>
              {gumGiven}/{pay.odd}
            </b>{' '}
            sakız. Kavanozda {gum} kaldı.
          </p>
        )}

        {step === 'change' && pay && gumGiven === null && (
          <div className={styles.change}>
            <p>
              {tl(pay.bill)} uzattı. Üstü {tl(pay.change)}: {pay.change - pay.odd > 0 && `${tl(pay.change - pay.odd)} kâğıt + `}
              <b>{tl(pay.odd)} küsurat</b>. Küsuratı nasıl vereceksin?
            </p>
            <div className={styles.choices}>
              <button autoFocus onClick={() => onChange('coins')} disabled={coins < pay.odd}>
                <span>🪙 Bozukluk</span>
                <small>kasada {tl(coins)}</small>
              </button>
              <button onClick={() => onChange('gum')} disabled={gum < pay.odd}>
                <span>🍬 {pay.odd} sakız</span>
                <small>makinede {gum}</small>
              </button>
              <button onClick={() => onChange('round')}>
                <span>💵 5 ₺ ver</span>
                <small>+{tl(5 - pay.odd)} fazla</small>
              </button>
            </div>
          </div>
        )}

        {step === 'result' && (reaction || outcome) && (
          <div className={styles.result}>
            {outcome && reaction?.sold !== undefined && !visit.dilemma ? (
              <p>
                Satıldı: <b>{tl(reaction.sold)}</b>
                {outcome.cash < 0 && ` · üstünü yuvarladın (−${tl(-outcome.cash)})`}
              </p>
            ) : outcome ? (
              <p>{outcome.cash > 0 ? <>Kasaya girdi: <b className={styles.pos}>{tl(outcome.cash)}</b></> : outcome.cash < 0 ? <>Kasadan çıktı: <b className={styles.neg}>{tl(-outcome.cash)}</b></> : 'Kasaya para girmedi.'}</p>
            ) : reaction!.sold !== undefined ? (
              credited ? (
                <p>
                  Deftere yazıldı: <b>{tl(reaction!.sold)}</b> · mal gitti, para gelecek mi bakalım
                </p>
              ) : (
                <p>
                  Satıldı: <b>{tl(reaction!.sold)}</b>
                </p>
              )
            ) : (
              <p>Satış olmadı.</p>
            )}
            <button autoFocus className={styles.primary} onClick={onNext}>
              {last ? 'Kepengi indir' : 'Sıradaki müşteri'}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
