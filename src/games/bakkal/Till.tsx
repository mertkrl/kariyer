import { tl, type Product, type Reaction, type Visit } from './data';
import { revealOf, type Receipt } from './returns';
import { LOAN, dilemmaAsk, shortBy, type Answer, type ChangeWay, type Outcome } from './week';
import styles from './BakkalGame.module.css';

/*
 * Tezgâhın önündeki panel: sıradaki müşterinin istediği (ya da eski hesap, borç isteyen nine),
 * raftan biten mal, pazarlık, veresiye ve ikilem düğmeleri, satışın sonucu. Fiyat ve borç tutarı
 * yazar kasadan girilir; bu panel yalnızca seçenekleri ve sonucu gösterir.
 */

export type Errand = 'account' | 'loan' | 'empty' | 'charity' | 'fine' | 'return' | 'audit' | null;
export type Step = 'ask' | 'counter' | 'credit' | 'dilemma' | 'change' | 'gift' | 'result';

/** "Süt (1 lt)" → ad ve ölçü ayrı satırda. */
const split = (name: string) => {
  const m = name.match(/^(.*?) \((.*)\)$/);
  return m ? { title: m[1], size: m[2] } : { title: name, size: '' };
};

/**
 * Müşterinin istediği: sipariş fişi gibi. Başlıkta kimin istediği, kaç kalem olduğu ve günün sırası; her kalem
 * yan yana kendi kutusunda: simgesi, adı, raf durumu ve ölçüsü (tost ve sandviçte içindekiler).
 */
function WantList({ visit, missing, queue }: { visit: Visit; missing: Product[]; queue: string }) {
  return (
    <div className={styles.want}>
      <div className={styles.wantHead}>
        <span className={styles.wantWho}>
          {visit.villager.name}
          <span className={styles.wantCount}>{visit.items.length} kalem</span>
        </span>
        <span className={styles.wantQueue}>{queue}</span>
      </div>
      <ul className={styles.wantList} style={{ gridTemplateColumns: `repeat(${visit.items.length}, minmax(0, 1fr))` }}>
        {visit.items.map((p) => {
          const { title, size } = split(p.name);
          const out = missing.includes(p);
          return (
            <li key={p.id} className={out ? styles.wantOut : ''}>
              <span className={styles.wantIcon} aria-hidden="true">
                {p.emoji}
              </span>
              <span className={styles.wantText} title={p.detail}>
                <b>{title}</b>
                <small>
                  <i className={`${styles.wantTag} ${out ? styles.wantTagOut : p.detail ? styles.wantTagMade : ''}`}>{out ? 'yok' : p.detail ? 'tezgâhta' : 'rafta'}</i>
                  {p.detail ?? size}
                </small>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function Till({
  queue,
  news = [],
  onAudit,
  last,
  visit,
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
  onCharity,
  onFine,
  charity,
  fine,
  staleNote,
  onNext,
  pay,
  coins,
  gum,
  gumGiven,
  onChange,
  onReturn,
  receipts,
  onDrawer,
  gift,
  onGift,
}: {
  queue: string;
  /** Sabahın haberleri: toptancı, seyyar satıcı, zincir market. */
  news?: string[];
  onAudit: () => void;
  last: boolean;
  visit: Visit;
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
  onCharity: () => void;
  onFine: () => void;
  /** Hayırseverin ödeyeceği açık veresiye ve zabıtanın cezası. */
  charity: number;
  fine: number;
  /** Bu satışta müşterinin eline geçen bayat mal. */
  staleNote: string | null;
  onNext: () => void;
  /** Müşterinin uzattığı para ve para üstü. */
  pay: { bill: number; change: number; odd: number } | null;
  /** Kasadaki bozukluk (₺) ve kavanozdaki sakız. */
  coins: number;
  gum: number;
  /** Sakızla verilirken çevrilen kol sayısı (null: sakız seçilmedi). */
  gumGiven: number | null;
  onChange: (way: ChangeWay) => void;
  /** İade kararı ve fiş çekmecesi. */
  onReturn: (accept: boolean) => void;
  receipts: readonly Receipt[];
  onDrawer: () => void;
  /** Satılan paketin içinden çıkan para ve kararı. */
  gift: { amount: number; product: Product } | null;
  onGift: (keep: boolean) => void;
}) {
  return (
    <main className={styles.shop}>

      <section className={styles.till}>
        {errand && <p className={styles.queue}>{queue}</p>}
        {news.map((n) => (
          <p key={n} className={styles.warn}>
            {n}
          </p>
        ))}
        {errand === 'audit' ? (
          <div className={styles.product}>
            <span className={styles.big}>🗂️</span>
            <b>{visit.villager.name} · vergi denetimi</b>
          </div>
        ) : errand === 'return' && visit.returning ? (
          <div className={styles.product}>
            <span className={styles.big}>{visit.returning.product.emoji}</span>
            <b>
              {visit.villager.name} iade getirdi · {visit.returning.product.name} · {tl(visit.returning.price)} istiyor
            </b>
          </div>
        ) : errand === 'account' || errand === 'loan' || errand === 'charity' || errand === 'fine' ? (
          <div className={styles.product}>
            <span className={styles.big}>{{ account: '📒', loan: '💊', charity: '🤲', fine: '🧾' }[errand]}</span>
            <b>{{ account: `Eski hesap · ${visit.villager.name}`, loan: `${visit.villager.name} borç istiyor`, charity: `${visit.villager.name} · hayır için geldi`, fine: `${visit.villager.name} · denetim` }[errand]}</b>
          </div>
        ) : (
          <WantList visit={visit} missing={shelf.missing} queue={queue} />
        )}

        {step === 'ask' && !errand && (
          <p className={styles.wantHint}>
            {shelf.missing.length > 0 && shelf.missing.length < visit.items.length && 'Rafta olmayanı almaz; gerisinin '}
            {shelf.missing.length > 0 && shelf.missing.length < visit.items.length ? 'fiyatını' : 'Fiyatı'} kasaya gir, <kbd>ONAY</kbd>'a bas
          </p>
        )}

        {step === 'ask' && errand === 'audit' && (
          <div className={styles.priceForm}>
            <span className={styles.or}>Z raporlarını kasayla karşılaştıracak. Kasaya kayıtsız para attıysan bulunur.</span>
            <button autoFocus className={styles.primary} onClick={onAudit}>
              🗂️ Defteri ve kasayı göster
            </button>
          </div>
        )}

        {step === 'ask' && errand === 'return' && (
          <div className={styles.priceForm}>
            <span className={styles.or}>Gün sonu Z raporlarına bak: bu mal buradan mı, kaça alınmış, iadesi alınmış mı?</span>
            <button autoFocus className={styles.ghost} onClick={onDrawer}>
              🧾 Z raporlarına bak
            </button>
            <button className={styles.primary} onClick={() => onReturn(true)}>
              İadeyi al
            </button>
            <button className={styles.ghost} onClick={() => onReturn(false)}>
              İade almam
            </button>
          </div>
        )}

        {step === 'gift' && gift && (
          <div className={styles.priceForm}>
            <span>
              🎁 {gift.product.name.replace(/ \(.*\)$/, '')} paketinin içinden <b>{tl(gift.amount)}</b> çıktı ("kapağın altına bak" kampanyası). Müşteri fark etmedi.
            </span>
            <button autoFocus className={styles.primary} onClick={() => onGift(false)}>
              Müşteriye ver
            </button>
            <button className={styles.ghost} onClick={() => onGift(true)}>
              Kasaya at
            </button>
          </div>
        )}

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

        {step === 'ask' && errand === 'charity' && (
          <div className={styles.priceForm}>
            <span>{charity > 0 ? `Defterdeki bütün veresiyeyi ödeyecek: ${tl(charity)}.` : 'Defterde açık veresiye yok.'}</span>
            <button autoFocus className={styles.primary} onClick={onCharity}>
              {charity > 0 ? '📒 Defteri göster, Allah razı olsun' : 'Defter temiz, sağ olun'}
            </button>
          </div>
        )}

        {step === 'ask' && errand === 'fine' && (
          <div className={styles.priceForm}>
            <span className={styles.warn}>Dün {visit.fine} bayat mal satıldı, şikâyet gelmiş. Ceza: {tl(fine)}.</span>
            <button autoFocus className={styles.primary} onClick={onFine}>
              Cezayı öde
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
            {staleNote && <p className={styles.warn}>⚠️ {staleNote}</p>}
            {errand === 'return' && visit.returning && (
              <p className={styles.or}>{revealOf(visit.returning, visit.villager.name, receipts)}</p>
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
