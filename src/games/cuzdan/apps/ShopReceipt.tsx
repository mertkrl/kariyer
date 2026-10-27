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
  const { year, basket, lines, spent, now, k } = shop;
  return (
    <div className={c.receipt} role="status">
      <b>
        {year} → {NOW}
      </b>
      {lines.map((it) => (
        <div key={it.id} className={c.row}>
          <span>
            {basket[it.id]} × {it.name}
          </span>
          <span>
            {money(basket[it.id] * it.prices[year], year)} → {money(basket[it.id] * it.prices[NOW], NOW)}
          </span>
        </div>
      ))}
      <hr />
      <p>
        Sepetin {year}'de <b>{money(spent, year)}</b>, bugün <b>{money(now, NOW)}</b>.
        <br />
        Asgari ücretle {duration(workMinutes(spent, year))} → {duration(workMinutes(now, NOW))}
        <br />
        Genel fiyatlar (TÜFE) {times(cpiMultiple(year))} arttı: sepetin {vsInflation(k / cpiMultiple(year))}.
      </p>
      <div className={c.big}>{times(k)} pahalı</div>
      <div className={c.row}>
        <ShareButton
          className={c.btn}
          make={() => ({
            route: 'cuzdan',
            kicker: `${year} sepeti, ${NOW} fiyatıyla`,
            title: `${times(k)} pahalı`,
            note: lines.map((it) => `${basket[it.id]} ${it.name.toLocaleLowerCase('tr-TR')}`).join(', '),
            stats: [
              { label: String(year), value: money(spent, year) },
              { label: String(NOW), value: money(now, NOW) },
            ],
            question: 'Senin sepetin kaç kat?',
            text: `${year}'de ${money(spent, year)} tutan sepetim bugün ${money(now, NOW)}.`,
          })}
        />
        <button type="button" className={c.btnAlt ?? c.btn} onClick={shop.reset}>
          Yeni sepet
        </button>
      </div>
    </div>
  );
}
