import { useState } from 'react';
import { useLater } from './kit';
import type { SiteProps } from './registry';
import s from './DenizSite.module.css';

/*
 * Deniz'in projesi: bir kargo firmasının denemeye aldığı takip uygulaması ve API'si. Gösterişsiz
 * ama çalışır: örnek kodla gerçekten sorgulanır, yanlış kod düzgün bir hata verir, fiyat
 * hesaplayıcı ağırlıkla hacimden büyüğünü alır.
 */
const SHIPMENTS: Record<string, { to: string; steps: [string, string, boolean][] }> = {
  'KT-2025-0412': {
    to: 'Kadıköy, İstanbul',
    steps: [
      ['Kargo kabul edildi', '12 Mar 09:14 · Ankara Şube', true],
      ['Transfer merkezinde', '12 Mar 22:40 · Ankara Aktarma', true],
      ['Dağıtım şubesinde', '13 Mar 07:05 · Kadıköy Şube', true],
      ['Kuryede', 'Tahmini teslim: 13 Mar 14:00–18:00', false],
    ],
  },
  'KT-2025-0388': {
    to: 'Çankaya, Ankara',
    steps: [
      ['Kargo kabul edildi', '10 Mar 16:30 · İzmir Şube', true],
      ['Transfer merkezinde', '11 Mar 03:10 · İzmir Aktarma', true],
      ['Teslim edildi', '11 Mar 15:42 · Alıcı: K. Y.', true],
    ],
  },
};

const CITIES = ['Ankara', 'İstanbul', 'İzmir', 'Bursa', 'Antalya', 'Van'];
/** Şehirler arası mesafe kademesi: aynı şehir 0, komşu 1, uzak 2. */
const zone = (a: string, b: string) => (a === b ? 0 : [a, b].includes('Van') ? 2 : 1);

export function DenizSite({ page, go }: SiteProps) {
  const later = useLater();
  const [from, setFrom] = useState('Ankara');
  const [to, setTo] = useState('İstanbul');
  const [kg, setKg] = useState('2');
  const [dims, setDims] = useState({ w: '30', h: '20', d: '15' });
  const [quote, setQuote] = useState<{ desi: number; price: number; days: string } | null>(null);
  const [qErr, setQErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const query = () => {
    setLoading(true);
    setError(null);
    setResult(null);
    later(() => {
      setLoading(false);
      check();
    }, 650);
  };
  const check = () => {
    const c = code.trim().toUpperCase();
    if (!/^KT-\d{4}-\d{4}$/.test(c)) {
      setResult(null);
      setError('Takip kodu KT-YYYY-NNNN biçiminde olmalı (örnek: KT-2025-0412).');
    } else if (!SHIPMENTS[c]) {
      setResult(null);
      setError(`${c} kodlu bir gönderi bulunamadı. Kodu kontrol edin; yeni verilen kargolar sisteme 30 dk içinde düşer.`);
    } else {
      setError(null);
      setResult(c);
    }
  };
  const ship = result ? SHIPMENTS[result] : null;

  return (
    <div className={s.site}>
      <header className={s.head}>
        <button className={s.logo} onClick={() => go('home')}>
          📦 Hızlı Kargo · takip
        </button>
        <nav>
          <button className={page === 'home' ? s.on : ''} onClick={() => go('home')}>Takip</button>
          <button className={page === 'fiyat' ? s.on : ''} onClick={() => go('fiyat')}>Fiyat hesapla</button>
        </nav>
      </header>
      <div className={s.demo}>Demo sürüm · Hızlı Kargo'nun Ankara bölgesinde Mart'tan beri denemede</div>

      {page === 'home' && (
        <>
        <section className={s.hero}>
          <div>
          <h1>Kargon nerede?</h1>
          <p className={s.heroLead}>Takip kodunu yaz, kargonun nerede olduğunu ve ne zaman geleceğini gör.</p>
          <form
            className={s.search}
            onSubmit={(e) => {
              e.preventDefault();
              query();
            }}
          >
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Takip kodu (ör. KT-2025-0412)" aria-label="Takip kodu" />
            <button disabled={loading}>{loading ? 'Sorgulanıyor…' : 'Sorgula'}</button>
          </form>
          <p className={s.try}>
            Denemek için:{' '}
            {Object.keys(SHIPMENTS).map((k) => (
              <button key={k} className={s.sample} onClick={() => setCode(k)}>
                {k}
              </button>
            ))}
          </p>
          </div>
          <svg viewBox="0 0 260 160" className={s.van} aria-hidden="true">
            <ellipse cx="130" cy="140" rx="110" ry="8" fill="rgba(0,0,0,0.18)" />
            <rect x="20" y="40" width="150" height="90" rx="10" fill="#fff" />
            <path d="M170 64h44l28 30v36h-72z" fill="#e8eefb" />
            <path d="M178 72h32l20 22h-52z" fill="#9ec0f5" />
            <rect x="32" y="56" width="124" height="40" rx="6" fill="#1f6feb" />
            <text x="94" y="82" fontSize="15" fontWeight="800" fill="#fff" textAnchor="middle">HIZLI KARGO</text>
            <circle cx="62" cy="132" r="16" fill="#1c2533" />
            <circle cx="62" cy="132" r="6" fill="#c4ceda" />
            <circle cx="206" cy="132" r="16" fill="#1c2533" />
            <circle cx="206" cy="132" r="6" fill="#c4ceda" />
            <path d="M0 70h14M4 86h12M8 102h10" stroke="#9ec0f5" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </section>
        <main className={s.main}>
          {loading && <div className={s.loadingCard} aria-busy="true" />}
          {error && (
            <p className={s.error} role="alert">
              {error}
            </p>
          )}
          {ship && (
            <section className={s.result} aria-live="polite">
              <b>{result}</b> · Alıcı adresi: {ship.to}
              <div className={s.bar} aria-hidden="true">
                <i style={{ width: `${(ship.steps.filter((st) => st[2]).length / ship.steps.length) * 100}%` }} />
              </div>
              <ol className={s.steps}>
                {ship.steps.map(([t, d, done]) => (
                  <li key={t} className={done ? s.done : s.next}>
                    <b>{t}</b>
                    <small>{d}</small>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section className={s.how}>
            <h2>Nasıl çalışır?</h2>
            <ol>
              <li>
                <b>1</b>
                <span>
                  <strong>Şubeye bırak ya da kurye çağır</strong>
                  Ankara içinde aynı gün kapından alıyoruz.
                </span>
              </li>
              <li>
                <b>2</b>
                <span>
                  <strong>Takip kodunu al</strong>
                  SMS ile gelir; kargon her şubeden geçtiğinde burada görünür.
                </span>
              </li>
              <li>
                <b>3</b>
                <span>
                  <strong>Teslim saatini öğren</strong>
                  Kurye yola çıkınca 4 saatlik teslim aralığı yazılır.
                </span>
              </li>
            </ol>
          </section>

          <section className={s.figures}>
            <div>
              <b>18</b>
              <span>şube</span>
            </div>
            <div>
              <b>%97</b>
              <span>zamanında teslim (Mart)</span>
            </div>
            <div>
              <b>1–2 gün</b>
              <span>şehirler arası</span>
            </div>
          </section>
        </main>
        </>
      )}

      {page === 'fiyat' && (
        <main className={s.main}>
          <h1>Kargom ne kadar tutar?</h1>
          <p>Ağırlığı ve kutunun ölçülerini yaz; hangisi büyükse ondan ücretlendirilir (desi).</p>
          <form
            className={s.quoteForm}
            onSubmit={(e) => {
              e.preventDefault();
              const w = Number(kg.replace(',', '.'));
              const [a, b, c] = [dims.w, dims.h, dims.d].map((x) => Number(x));
              if (!(w > 0) || !(a > 0 && b > 0 && c > 0)) {
                setQuote(null);
                return setQErr('Ağırlık ve ölçüler sıfırdan büyük sayılar olmalı.');
              }
              if (w > 30) {
                setQuote(null);
                return setQErr('30 kg üstü gönderiler için şubeye gelmeniz gerekiyor.');
              }
              setQErr(null);
              const desi = Math.max(w, Math.ceil((a * b * c) / 3000));
              const z = zone(from, to);
              setQuote({ desi, price: Math.round(85 + desi * [12, 18, 26][z]), days: ['Aynı gün', '1–2 iş günü', '2–3 iş günü'][z] });
            }}
          >
            <label>
              Nereden
              <select value={from} onChange={(e) => setFrom(e.target.value)}>
                {CITIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Nereye
              <select value={to} onChange={(e) => setTo(e.target.value)}>
                {CITIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Ağırlık (kg)
              <input value={kg} onChange={(e) => setKg(e.target.value)} inputMode="decimal" />
            </label>
            <label>
              Ölçüler (cm)
              <span className={s.dims}>
                {(['w', 'h', 'd'] as const).map((k) => (
                  <input key={k} value={dims[k]} onChange={(e) => setDims({ ...dims, [k]: e.target.value })} inputMode="numeric" aria-label={{ w: 'En', h: 'Boy', d: 'Yükseklik' }[k]} />
                ))}
              </span>
            </label>
            <button>Hesapla</button>
          </form>
          {qErr && (
            <p className={s.error} role="alert">
              {qErr}
            </p>
          )}
          {quote && (
            <section className={s.result}>
              <b className={s.bigPrice}>{quote.price.toLocaleString('tr-TR')} TL</b>
              <span>
                {from} → {to} · {quote.desi} desi · Tahmini teslim: {quote.days}
              </span>
            </section>
          )}
        </main>
      )}

      <footer className={s.foot}>Hızlı Kargo takip · deneme sürümü</footer>
    </div>
  );
}
