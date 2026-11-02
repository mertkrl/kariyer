import { useEffect, useState } from 'react';
import { DIFFICULTY, type Difficulty } from './model';
import styles from './Title.module.css';

/*
 * Kavşak Amiri'nin giriş ekranı: gece, kontrol merkezinin büyük ekranında yukarıdan bir kavşak.
 * Farlar yollarda akar, ortadaki sinyal kendi döngüsünü yakar, altta trafik radyosu kayar.
 * "Oyna" zorluk seçimini açar; kayıtlı vardiya varsa "Devam et" doğrudan sıradaki kavşağa gider.
 */

const RADIO = [
  'Bahariye’de kuyruk Boğa heykeline uzandı',
  'Ataşehir’de sola dönenler boşluk kolluyor',
  'Mahmutbey’de düğün konvoyu, kornalar susmuyor',
  'Büyükdere’de yol çalışması: Levent Çarşı kapanıyor',
  'Sahil yolunda makam konvoyu bekleniyor',
  'Kuşdili’nde maç çıkışı: stadyum yolu doldu',
  'İncirli’de ışıklar söndü, sürücüler sırayla geçiyor',
  'Vatan Caddesi’nde yeşil dalga bekleniyor',
  'Mecidiyeköy’de yağmur, konvoy ve arıza bir arada',
];

const DIFF_ICON: Record<Difficulty, number> = { rahat: 1, normal: 2, uzman: 3 };

export function Title({
  resume,
  diffName,
  onPlay,
  onResume,
  onTour,
  onFree,
  day,
}: {
  /** Kayıtlı vardiyada biten kavşak sayısı (yoksa null). */
  resume: number | null;
  diffName: string;
  onPlay: (d: Difficulty) => void;
  onResume: () => void;
  onTour: () => void;
  /** Vardiya dışı tek kavşak: günün (herkese aynı) ya da rastgele. */
  onFree: (daily: boolean) => void;
  /** Günün kavşağının tarihi ve en iyi puan. */
  day: string;
}) {
  const [picking, setPicking] = useState(false);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15000);
    return () => window.clearInterval(id);
  }, []);
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return (
    <div className={styles.screen}>
      <CityMap />
      <div className={styles.vignette} />
      <div className={styles.scan} />

      <div className={styles.statusLeft}>
        <i className={styles.dot} />
        <span>TKM · TRAFİK KONTROL MERKEZİ · ÇEVRİMİÇİ</span>
      </div>
      <div className={styles.statusRight}>İSTANBUL · {hhmm} · AKŞAM ZİRVESİ</div>

      <div className={styles.readout} style={{ top: '22%', left: '6%', animationDelay: '0s' }}>
        KAVŞAK 3120 · DÖNGÜ 72 SN
      </div>
      <div className={styles.readout} style={{ top: '28%', right: '7%', animationDelay: '2.4s' }}>
        KUYRUK · KUZEY KOLU 14 ARAÇ
      </div>
      <div className={styles.readout} style={{ bottom: '24%', left: '8%', animationDelay: '4.8s' }}>
        HİZMET DÜZEYİ · C
      </div>
      <div className={styles.readout} style={{ bottom: '30%', right: '9%', animationDelay: '1.2s' }}>
        EKİP 34-T-07 · MÜSAİT
      </div>

      <main className={styles.content}>
        <Signal />
        <div className={styles.eyebrow}>Trafik Kontrol Merkezi · Akşam vardiyası</div>
        <h1 className={styles.title}>Kavşak Amiri.</h1>
        <p className={styles.subtitle}>
          Saat altı, İstanbul eve dönüyor. Önce tek kavşak, sonra koca cadde: yeşili, sarıyı, kırmızıyı sen ayarla; ambulansa yol aç, düğüne ekip gönder, maç çıkışında dedektörü aç, ışıklar sönünce ustayı çağır, Vatan’da yeşil dalga kur. Kavşağı kilitleme amirim.
        </p>

        <div className={styles.actions}>
          {resume !== null ? (
            <>
              <div className={styles.buttonRow}>
                <button type="button" className={styles.cta} onClick={onResume}>
                  Devam et
                </button>
                <button type="button" className={styles.secondary} onClick={() => setPicking(true)}>
                  Yeni vardiya
                </button>
              </div>
              <p className={styles.note}>
                {resume} kavşak bitti · zorluk {diffName}
              </p>
            </>
          ) : (
            <button type="button" className={styles.cta} onClick={() => setPicking(true)}>
              Oyna
            </button>
          )}
          <div className={styles.buttonRow}>
            <button type="button" className={styles.secondary} onClick={() => onFree(true)} title="Her gün herkese aynı kavşak: sokaklar, talep ve olaylar değişir">
              Günün kavşağı <small className={styles.day}>{day}</small>
            </button>
            <button type="button" className={styles.secondary} onClick={() => onFree(false)} title="Her seferinde başka bir kavşak">
              Rastgele kavşak
            </button>
          </div>
          <button type="button" className={styles.howTo} onClick={onTour}>
            Nasıl oynanır? · Tanıtım
          </button>
        </div>
      </main>

      <div className={styles.ticker} aria-hidden="true">
        <b>📻 104.6 Trafik Radyosu</b>
        <div className={styles.tickerTrack}>
          <span>{[...RADIO, ...RADIO].join('   ·   ')}</span>
        </div>
      </div>

      {picking && (
        <div className={styles.overlay} onClick={() => setPicking(false)}>
          <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="trafik-zorluk" onClick={(e) => e.stopPropagation()}>
            <div className={styles.dialogEyebrow}>VARDİYA ATAMASI · ZORLUK</div>
            <h2 id="trafik-zorluk">Hangi vardiyayı alıyorsun?</h2>
            {resume !== null && <p className={styles.warn}>Kayıtlı vardiya silinir; dokuz bölüm baştan başlar.</p>}
            <div className={styles.diffs}>
              {(Object.keys(DIFFICULTY) as Difficulty[]).map((d) => (
                <button key={d} type="button" className={styles.diff} data-level={d} onClick={() => onPlay(d)} autoFocus={d === 'normal'}>
                  <span className={styles.diffCars} aria-hidden="true">
                    {[1, 2, 3].map((k) => (
                      <i key={k} className={k <= DIFF_ICON[d] ? styles.carOn : undefined} />
                    ))}
                  </span>
                  <b>{DIFFICULTY[d].name}</b>
                  <small>{DIFFICULTY[d].note}</small>
                </button>
              ))}
            </div>
            <button type="button" className={styles.cancel} onClick={() => setPicking(false)}>
              Vazgeç
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Logo: kendi döngüsünü yakan üç lambalı sinyal. */
function Signal() {
  return (
    <div className={styles.signal} aria-hidden="true">
      <i className={styles.lampRed} />
      <i className={styles.lampAmber} />
      <i className={styles.lampGreen} />
    </div>
  );
}

/**
 * Arka plan: kontrol ekranındaki şehir şeması. İki cadde kesişir, kenarlarda bloklar; araç farları
 * şeritlerde akar, kavşakta zebra çizgileri. Hepsi tek bir SVG, ekranı kaplar.
 */
function CityMap() {
  const cars = [
    // [yol, şerit konumu, süre, gecikme]
    ['h', 488, 9, 0],
    ['h', 488, 9, 3.2],
    ['h', 488, 9, 6.1],
    ['hr', 452, 11, 1.4],
    ['hr', 452, 11, 5.8],
    ['v', 782, 10, 0.8],
    ['v', 782, 10, 5.5],
    ['vr', 818, 12, 2.6],
    ['vr', 818, 12, 8.4],
  ] as const;
  return (
    <svg className={styles.map} viewBox="0 0 1600 940" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <pattern id="tkm-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" fill="none" stroke="rgba(120,170,220,0.06)" strokeWidth="1" />
        </pattern>
        <radialGradient id="tkm-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,184,28,0.16)" />
          <stop offset="100%" stopColor="rgba(255,184,28,0)" />
        </radialGradient>
      </defs>
      <rect width="1600" height="940" fill="url(#tkm-grid)" />
      {/* bloklar */}
      <g fill="rgba(120,150,190,0.07)" stroke="rgba(120,170,220,0.14)">
        {[
          [80, 70, 260, 150],
          [380, 70, 300, 300],
          [80, 260, 260, 110],
          [940, 70, 240, 180],
          [1220, 70, 300, 300],
          [940, 290, 240, 80],
          [80, 570, 340, 300],
          [460, 570, 220, 140],
          [460, 750, 220, 120],
          [940, 570, 280, 300],
          [1260, 570, 260, 130],
          [1260, 740, 260, 130],
        ].map(([x, y, w, h]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} rx="4" />
        ))}
      </g>
      {/* yollar */}
      <g fill="#14171c">
        <rect x="0" y="420" width="1600" height="100" />
        <rect x="750" y="0" width="100" height="940" />
      </g>
      <g stroke="rgba(236,233,225,0.28)" strokeWidth="2" strokeDasharray="18 16">
        <line x1="0" y1="470" x2="730" y2="470" />
        <line x1="870" y1="470" x2="1600" y2="470" />
        <line x1="800" y1="0" x2="800" y2="400" />
        <line x1="800" y1="540" x2="800" y2="940" />
      </g>
      {/* zebralar */}
      <g fill="rgba(236,233,225,0.22)">
        {Array.from({ length: 8 }, (_, k) => (
          <g key={k}>
            <rect x={756 + k * 12} y="398" width="6" height="16" />
            <rect x={756 + k * 12} y="526" width="6" height="16" />
            <rect x="728" y={426 + k * 12} width="16" height="6" />
            <rect x="856" y={426 + k * 12} width="16" height="6" />
          </g>
        ))}
      </g>
      <circle cx="800" cy="470" r="230" fill="url(#tkm-glow)" />
      {/* farlar */}
      {cars.map(([road, pos, dur, delay], i) => {
        // yukarıdan bakış: önde iki far, arkada iki stop lambası
        const f = road === 'h' || road === 'v' ? 1 : -1;
        const lamps = (along: number, color: string, r: number) =>
          road[0] === 'h'
            ? [-3, 3].map((o) => <circle key={`${along}${o}`} cx={along} cy={pos + o} r={r} fill={color} />)
            : [-3, 3].map((o) => <circle key={`${along}${o}`} cx={pos + o} cy={along} r={r} fill={color} />);
        return (
          <g key={i} className={styles[`car_${road}`]} style={{ animationDuration: `${dur}s`, animationDelay: `-${delay}s` }}>
            {road[0] === 'h' ? <rect x="-14" y={pos - 6} width="28" height="12" rx="3" fill="#2b313a" /> : <rect x={pos - 6} y="-14" width="12" height="28" rx="3" fill="#2b313a" />}
            {lamps(f * 14, '#fff3c4', 2.4)}
            {lamps(-f * 14, '#ff4b3a', 1.6)}
          </g>
        );
      })}
      {/* köşe sinyalleri */}
      {[
        [736, 402],
        [864, 538],
      ].map(([x, y]) => (
        <g key={x}>
          <circle cx={x} cy={y} r="7" fill="#0c0e11" stroke="rgba(255,255,255,0.15)" />
          <circle cx={x} cy={y} r="4" className={styles.mapLamp} />
        </g>
      ))}
    </svg>
  );
}
