import { ShareButton } from '../../../arcade/ShareButton';
import { NOW } from '../data';
import { cpiMultiple, duration, money, times, vsInflation, workMinutes } from '../model';
import type { Shop } from './shopState';

/*
 * Zaman Bakkalı'nın kasa fişi: üç çağda aynı hesap (o yılki ve bugünkü tutar, emek, TÜFE), görünüşü
 * çağın sınıflarından gelir (`c`): 2002'de daktilo fişi, 2010'da sipariş özeti, bugün uygulama
 * makbuzu.
 */

export function ShopReceipt({ shop, c }: { shop: Shop; c: { receipt: string; row: string; big: string; btn: string; btnAlt?: string } }) {
  const { year, lines, spent, then, now, k } = shop;
  return (
    <div className={c.receipt} role="status">
      <b>
        {year} → {NOW}
      </b>
      {lines.map((l) => (
        <div key={l.id} className={c.row}>
          <span>
            {l.n} × {l.name}
          </span>
          <span>
            {money(l.then, year)} → {l.now === null ? `artık yok (${l.nowNote})` : money(l.now, NOW)}
          </span>
        </div>
      ))}
      <hr />
      <p>
        Sepetin {year}'de <b>{money(spent, year)}</b>.{' '}
        {then < spent ? <>Bugün de satılanlar ({money(then, year)}) bugün <b>{money(now, NOW)}</b>.</> : <>Bugün <b>{money(now, NOW)}</b>.</>}
        <br />
        Asgari ücretle {duration(workMinutes(then, year))} → {duration(workMinutes(now, NOW))}
        <br />
        Genel fiyatlar (TÜFE) {times(cpiMultiple(year))} arttı: sepetin {vsInflation(k / cpiMultiple(year))}.
      </p>
      <div className={c.big}>{then ? `${times(k)} pahalı` : 'Sepettekilerin hiçbiri artık satılmıyor'}</div>
      <div className={c.row}>
        <ShareButton
          className={c.btn}
          make={() => ({
            route: 'cuzdan',
            kicker: `${year} sepeti, ${NOW} fiyatıyla`,
            title: `${times(k)} pahalı`,
            note: lines.map((l) => `${l.n} ${l.name.toLocaleLowerCase('tr-TR')}`).join(', '),
            stats: [
              { label: String(year), value: money(then, year) },
              { label: String(NOW), value: money(now, NOW) },
            ],
            question: 'Senin sepetin kaç kat?',
            text: `${year}'de ${money(then, year)} tutan sepetim bugün ${money(now, NOW)}.`,
          })}
        />
        <button type="button" className={c.btnAlt ?? c.btn} onClick={shop.reset}>
          Yeni sepet
        </button>
      </div>
    </div>
  );
}
