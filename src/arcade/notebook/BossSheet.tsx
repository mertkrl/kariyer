import { useEffect, useRef } from 'react';
import s from './BossSheet.module.css';

/*
 * Patron geliyor: defter bir anda sıkıcı bir hesap tablosuna döner. Esc ya da tablonun herhangi
 * bir yerine tıklamak defteri geri getirir. Tablo uydurmadır ve her açılışta aynıdır; sekmenin
 * başlığı da tablonun adına döner (ArcadeScreen aynı adı yazar).
 */

const BOSS_TITLE = 'Q3_rapor_v14_SON_son.xlsx · Tablolar';

const COLS = ['Bölge', 'Hedef', 'Gerçekleşen', 'Oran', 'Sapma', 'Sorumlu', 'Durum', 'Not'];
const REGIONS = ['Marmara', 'Ege', 'İç Anadolu', 'Akdeniz', 'Karadeniz', 'Doğu', 'Güneydoğu', 'Trakya', 'Kurumsal', 'E-ticaret', 'Bayi', 'İhracat', 'Kamu', 'Diğer'];
const OWNERS = ['A. Yılmaz', 'S. Kaya', 'M. Demir', 'E. Çelik', 'B. Şahin'];

const ROWS = REGIONS.map((r, i) => {
  const target = 1200 + ((i * 397) % 900);
  const real = Math.round(target * (0.82 + ((i * 53) % 30) / 100));
  const ratio = Math.round((real / target) * 1000) / 10;
  return [r, target.toLocaleString('tr-TR'), real.toLocaleString('tr-TR'), `%${ratio.toLocaleString('tr-TR')}`, (real - target).toLocaleString('tr-TR'), OWNERS[i % OWNERS.length], ratio >= 100 ? 'Tamam' : 'Takipte', ratio >= 100 ? '' : 'Q4 telafi'];
});

export function BossSheet({ onClose }: { onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => box.current?.focus(), []);

  return (
    <div ref={box} className={s.sheet} role="dialog" aria-label="Hesap tablosu (patron geliyor modu). Esc ile deftere dön." tabIndex={-1} onClick={onClose}>
      <div className={s.titlebar}>
        <span>{BOSS_TITLE}</span>
        <span className={s.saved}>Otomatik kaydedildi ✓</span>
      </div>
      <div className={s.ribbon}>
        {['Dosya', 'Giriş', 'Ekle', 'Sayfa Düzeni', 'Formüller', 'Veri', 'Gözden Geçir', 'Görünüm'].map((m, i) => (
          <span key={m} className={i === 1 ? s.ribbonOn : undefined}>
            {m}
          </span>
        ))}
      </div>
      <div className={s.formula}>
        <b className="mono">D4</b>
        <span className="mono">=YUVARLA(C4/B4*100;1)</span>
      </div>
      <div className={s.grid}>
        <table>
          <thead>
            <tr>
              <th />
              {COLS.map((_, i) => (
                <th key={i}>{String.fromCharCode(65 + i)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>1</th>
              {COLS.map((c) => (
                <td key={c} className={s.headCell}>
                  {c}
                </td>
              ))}
            </tr>
            {ROWS.map((row, r) => (
              <tr key={r}>
                <th>{r + 2}</th>
                {row.map((cell, c) => (
                  <td key={c} className={r === 2 && c === 3 ? s.picked : c > 0 && c < 5 ? s.num : undefined}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
            {Array.from({ length: 12 }, (_, r) => (
              <tr key={`b${r}`}>
                <th>{r + ROWS.length + 2}</th>
                {COLS.map((c) => (
                  <td key={c} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={s.status}>
        <span>Hazır</span>
        <span className="mono">Ortalama: %97,3 · Toplam: 26.418 · Sayı: 56</span>
        <span className={s.back}>Esc · deftere dön</span>
      </div>
    </div>
  );
}
