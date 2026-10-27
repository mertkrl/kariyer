import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { ITEMS, NOW, type Year } from './data';
import { money, times } from './model';
import s from './Saver.module.css';

/*
 * 2016–2022'nin ekran koruyucusu: düz bir kilit ekranı ve altında "Enflasyon Şehri". Her bina bir
 * ürün; yüksekliği o yıldan bugüne kaç kat pahalandığı (logaritmik), tepesinde ürünü ve katı yazar.
 * Binalar sırayla yükselir, pencereleri tek tek yanar. Üstte saat, tarih ve dört saniyede bir
 * değişen fiyat kartı. Geçişler CSS ile; hareket azaltılınca binalar dolu hâlde durur.
 */

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

export function FlatSaver({ year }: { year: Year }) {
  const [now, setNow] = useState(() => new Date());
  const [k, setK] = useState(0);
  useEffect(() => {
    const a = window.setInterval(() => setNow(new Date()), 10000);
    const b = window.setInterval(() => setK((x) => x + 1), 4000);
    return () => {
      window.clearInterval(a);
      window.clearInterval(b);
    };
  }, []);
  const it = ITEMS[k % ITEMS.length];
  // en çok 14 bina: her kategoriden ürünler, kat sayısı logaritmik yüksekliğe çevrilir
  const city = useMemo(() => {
    const picks = ITEMS.filter((_, i) => i % 2 === 0 || ITEMS.length <= 14).slice(0, 14);
    const mult = picks.map((p) => p.prices[NOW] / p.prices[year]);
    const lo = Math.log(Math.min(...mult));
    const hi = Math.log(Math.max(...mult));
    // en az pahalanan alçak, en çok pahalanan gökdelen: aradaki fark büyütülerek gösterilir
    return picks.map((p, i) => ({ id: p.id, emoji: p.emoji, x: Math.round(mult[i]), h: 22 + ((Math.log(mult[i]) - lo) / (hi - lo || 1)) * 70, hue: (i * 37) % 360, w: 1 + ((i * 7) % 3) * 0.35, spire: i % 3 === 1 }));
  }, [year]);
  const day = new Date(year, now.getMonth(), now.getDate());
  return (
    <div className={s.flat} aria-hidden="true">
      <div className={s.blobA} />
      <div className={s.blobB} />
      <div className={s.lock}>
        <div className={s.time}>{now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
        <div className={s.date}>
          {day.getDate()} {MONTHS[day.getMonth()]} {year}, {DAYS[day.getDay()]}
        </div>
        <div key={k} className={s.card}>
          <span className={s.cardEmoji}>{it.emoji}</span>
          <span className={s.cardText}>
            <b>{it.unit}</b>
            <span>
              {year}: {money(it.prices[year], year)} · bugün {money(it.prices[NOW], NOW)}
            </span>
          </span>
          <span className={s.cardX}>×{times(it.prices[NOW] / it.prices[year]).replace(' kat', '')}</span>
        </div>
      </div>
      <div className={s.city} aria-hidden="true">
        {city.map((b, i) => (
          <div key={b.id} className={`${s.tower} ${b.spire ? s.spire : ''}`} style={{ height: `${b.h}%`, flexGrow: b.w, animationDelay: `${i * 90}ms`, '--hue': b.hue } as CSSProperties}>
            <span className={s.roof}>
              {b.emoji}
              <small>×{b.x}</small>
            </span>
          </div>
        ))}
      </div>
      <div className={s.brand}>Cüzdan TL · {year}'den bugüne Enflasyon Şehri</div>
    </div>
  );
}
