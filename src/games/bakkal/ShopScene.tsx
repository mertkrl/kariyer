import type { ReactNode } from 'react';
import type { Weather } from './data';
import type { Stock } from './week';
import { CounterBody, CounterTop } from './Counter';
import { BreadCase, Fridge, Shelves } from './Goods';
import { ChipsRack } from './Furniture';
import { beamAt, darknessAt, skyAt, tintAt } from './sky';
import { COUNTER_Y, Extras } from './ShopDecor';
import { Street } from './Street';
import styles from './ShopScene.module.css';

/*
 * Dükkânın içi, tezgâhın arkasından bakış: tam ekran. Arkada sıva duvar ve lambri, solda tüplü
 * televizyon ve camı buğulu ahşap kapı, kapının yanında tel cips standı, ortada tavana kadar tek
 * büyük raf, yanında ışıklı soğuk dolap, onun yanında camlı ekmek dolabı (üstünde fileye geçirilmiş
 * toplar), tavanda çıplak ampul. Önde tezgâh: ortada yazar kasa, şeker kavanozları,
 * hesap makinesi, veresiye defteri, çay bardağı ve uyuyan kedi.
 * Ürünler emoji değil, çizimdir; renkleri tohumlu rastgeleyle seçilir, her açılışta aynıdır.
 * Müşteri (children) duvarla tezgâh arasında durur.
 */

const W = 1600;
const H = 900;
/**
 * Dükkânın eşyaları ortada, biraz küçültülmüş durur: 4:3 ekranda da kapı ve dolap görünsün.
 * Duvar, lambri ve tezgâh gövdesi bunun dışında tam genişlikte çizilir. Müşteri de aynı dönüşümü kullanır.
 */
export const FIT = 'translate(160 180) scale(0.8)';
const fitY = (y: number) => 180 + y * 0.8;

/** Tohumlu sözde rastgele (0–1): yağmur her açılışta aynı düşsün. */
const hash = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * Kapı camında yağmur: dışarıda iki katman (uzakta ince ve sık, yakında iri ve hızlı) eğik çizgiler
 * camın yüksekliği kadar kayarak dikişsiz döner; cam hafif buğulanır, üstünde duran damlalar ışığı
 * yakalar, birkaçı arkasında ıslak iz bırakarak aşağı süzülür.
 */
function RainGlass() {
  const layer = (n: number, seed: number, len: number, w: number, a: number) =>
    Array.from({ length: n }, (_, i) => {
      const x = 128 + hash(seed + i) * 200;
      const y = 190 + hash(seed + i + 500) * 240;
      const l = len * (0.7 + hash(seed + i + 900) * 0.6);
      return <path key={i} d={`M${x} ${y} l${-l * 0.18} ${l}`} strokeWidth={w} opacity={a * (0.5 + hash(seed + i + 1300) * 0.5)} />;
    });
  // bir katmanı iki kez, camın yüksekliği kadar arayla çizer: kayınca boşluk kalmaz
  const loop = (cls: string, children: ReactNode) => (
    <g className={cls}>
      <g>{children}</g>
      <g transform="translate(0 -240)">{children}</g>
    </g>
  );
  const beads = Array.from({ length: 34 }, (_, i) => ({ x: 136 + hash(i + 70) * 178, y: 196 + hash(i + 170) * 228, r: 1.2 + hash(i + 270) * 2.6 }));
  const runs = [
    { x: 158, d: 0, t: 7 },
    { x: 204, d: 2.6, t: 9 },
    { x: 262, d: 1.2, t: 6.5 },
    { x: 296, d: 4.4, t: 8 },
  ];
  return (
    <g>
      <rect x="132" y="190" width="186" height="240" fill="rgba(80,95,115,.36)" />
      <g stroke="rgba(205,220,240,.55)" strokeLinecap="round">
        {loop(styles.rainFar, layer(60, 1, 14, 0.8, 0.7))}
      </g>
      <g stroke="rgba(230,240,255,.75)" strokeLinecap="round">
        {loop(styles.rainNear, layer(22, 2000, 30, 1.4, 0.9))}
      </g>
      {/* camın buğusu: alta doğru biraz koyulaşır */}
      <rect x="132" y="190" width="186" height="240" fill="url(#mist)" />
      {/* camda duran damlalar: altta koyu kenar, üstte parlak nokta */}
      {beads.map((b, i) => (
        <g key={i}>
          <ellipse cx={b.x} cy={b.y} rx={b.r} ry={b.r * 1.15} fill="rgba(200,215,235,.28)" stroke="rgba(40,55,75,.35)" strokeWidth=".6" />
          <circle cx={b.x - b.r * 0.35} cy={b.y - b.r * 0.4} r={b.r * 0.35} fill="rgba(255,255,255,.85)" />
        </g>
      ))}
      {/* süzülen damlalar ve arkalarındaki ıslak iz */}
      {runs.map((r, i) => (
        <g key={i} className={styles.runDrop} style={{ animationDelay: `${r.d}s`, animationDuration: `${r.t}s` }}>
          <path d={`M${r.x} 190 q2 40 -1 80 t1 80 t-1 80`} pathLength={1} stroke="rgba(210,225,245,.35)" strokeWidth="2.2" fill="none" className={styles.runTrail} style={{ animationDelay: `${r.d}s`, animationDuration: `${r.t}s` }} />
          <g className={styles.runHead} style={{ animationDelay: `${r.d}s`, animationDuration: `${r.t}s` }}>
            <ellipse cx={r.x} cy="190" rx="2.6" ry="3.6" fill="rgba(210,225,245,.45)" stroke="rgba(40,55,75,.45)" strokeWidth=".7" />
            <circle cx={r.x - 0.9} cy="188.6" r="1" fill="#fff" />
          </g>
        </g>
      ))}
    </g>
  );
}

function Door({ hour, weather, open, onSign, glow }: { hour: number; weather: Weather; open: boolean; onSign?: () => void; glow?: boolean }) {
  const sunX = 140 + Math.max(0, Math.min(1, (hour - 8) / 11)) * 170;
  const sunY = 300 - Math.sin(Math.max(0, Math.min(1, (hour - 8) / 11)) * Math.PI) * 90;
  const night = hour >= 19;
  return (
    <g>
      <rect x="90" y="150" width="270" height="540" fill="#4f3220" />
      <rect x="110" y="168" width="230" height="522" fill="url(#doorWood)" />
      {/* cam: dışarısı köy sokağı (Street.tsx), kapı kasasına kırpılır */}
      <clipPath id="glass">
        <rect x="132" y="190" width="186" height="240" />
      </clipPath>
      <g clipPath="url(#glass)">
        <rect x="132" y="190" width="186" height="240" fill="url(#outside)" />
        {night ? (
          <circle cx="280" cy="215" r="10" fill="#f4f1de" />
        ) : (
          weather !== 'rain' && (
            <g opacity={weather === 'sunny' ? 1 : 0.35}>
              <circle cx={sunX} cy={sunY} r="34" fill={hour > 17 ? 'rgba(255,170,90,.5)' : 'rgba(255,244,200,.55)'} />
              <circle cx={sunX} cy={sunY} r="13" fill={hour > 17 ? '#ffb36b' : '#fff6d6'} />
            </g>
          )
        )}
        <g className={styles.clouds} fill={weather === 'sunny' ? 'rgba(255,255,255,.85)' : 'rgba(150,160,170,.9)'}>
          <ellipse cx="160" cy="222" rx="22" ry="7" />
          <ellipse cx="174" cy="217" rx="14" ry="7" />
          <ellipse cx="250" cy="245" rx="18" ry="5" />
        </g>
        <Street night={night} snow={weather === 'snow'} />
        {night && <rect x="132" y="190" width="186" height="240" fill="rgba(10,15,40,.45)" />}
        {weather === 'rain' && <RainGlass />}
        {weather === 'snow' && (
          <g className={styles.snow} fill="#fff">
            {Array.from({ length: 30 }, (_, i) => (
              <circle key={i} cx={136 + ((i * 41) % 186)} cy={180 + ((i * 59) % 250)} r={1.5 + (i % 3)} />
            ))}
          </g>
        )}
        {/* camın yansıması */}
        <path d="M140 190 L190 190 L140 300 Z" fill="rgba(255,255,255,.14)" />
      </g>
      <rect x="132" y="190" width="186" height="240" fill="none" stroke="#5c3b25" strokeWidth="8" />
      <rect x="221" y="190" width="8" height="240" fill="#5c3b25" />
      {/* kabartmalı kapı panoları: gölgeli üst-sol, aydınlık alt-sağ kenar */}
      {[456, 570].map((py) => (
        <g key={py}>
          <rect x="132" y={py} width="186" height="98" rx="3" fill="rgba(0,0,0,.18)" />
          <rect x="138" y={py + 6} width="174" height="86" rx="2" fill="url(#doorWood)" />
          <path d={`M138 ${py + 92} H312 V${py + 6}`} stroke="rgba(255,220,170,.25)" strokeWidth="3" fill="none" />
        </g>
      ))}
      {/* pirinç kol ve kilit aynası */}
      <rect x="316" y="456" width="20" height="74" rx="6" fill="url(#brass)" />
      <rect x="306" y="478" width="34" height="10" rx="5" fill="url(#brass)" />
      <circle cx="326" cy="510" r="4" fill="#3a2a10" />
      {/* eşik ve kapı pervazı */}
      <rect x="84" y="684" width="282" height="10" fill="#3b2516" />
      {/*
        asılı iki yüzlü levha: içeriden görünen yüz dışarıdakinin tersidir. Dükkân kapalıyken dışarıda
        KAPALI, içeride AÇIK yazar; oyuncu levhayı çevirince içeride KAPALI, dışarıda AÇIK olur ve
        müşteriler gelmeye başlar. Akşam kepenk inince levha geri döner.
      */}
      <path d="M185 210 L225 180 L265 210" fill="none" stroke="#333" strokeWidth="2" />
      <g
        key={open ? 'open' : 'closed'}
        data-tour="sign"
        className={`${styles.sign} ${open ? '' : styles.signReady} ${glow ? styles.coach : ''}`}
        role={open ? undefined : 'button'}
        tabIndex={open ? undefined : 0}
        aria-label={open ? 'Tabela: dışarıda AÇIK yazıyor' : 'Tabelayı çevir, dükkânı aç (dışarıda KAPALI yazıyor)'}
        onClick={open ? undefined : onSign}
        onKeyDown={open ? undefined : (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSign?.())}
      >
        <rect x="175" y="210" width="100" height="40" rx="4" fill={open ? '#f3e3e1' : '#fdf6e3'} stroke={open ? '#5a5a5a' : '#2e6b3a'} strokeWidth="3" />
        <text x="225" y="238" textAnchor="middle" fontSize="20" fontWeight="800" fill={open ? '#7a1f1f' : '#2e6b3a'} fontFamily="var(--font-mono)">
          {open ? 'KAPALI' : 'AÇIK'}
        </text>
      </g>
      {/* kapı çıngırağı */}
      <path d="M340 150 v20" stroke="#333" strokeWidth="2" />
      <path className={styles.bell} d="M330 186 Q330 168 340 168 Q350 168 350 186 Z" fill="#c9a227" />
    </g>
  );
}

export function ShopScene({ children, stock, gumActive = false, onGum, hour = 12, weather = 'sunny', onPet, onCalc, onBook, open = true, onSign, coach = null }: { children?: ReactNode; stock: Stock; gumActive?: boolean; onGum?: () => void; hour?: number; weather?: Weather; onPet?: () => void; onCalc?: () => void; onBook?: () => void; open?: boolean; onSign?: () => void; coach?: 'book' | 'calc' | 'sign' | null }) {
  const sky = skyAt(hour, weather);
  const dark = darknessAt(hour, weather);
  const tint = tintAt(hour, weather);
  const beam = beamAt(hour, weather);
  return (
    <div className={styles.scene}>
      <svg className={styles.layer} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <defs>
          <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d9c7a1" />
            <stop offset="1" stopColor="#c8b085" />
          </linearGradient>
          <linearGradient id="shelfBack" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3a2414" />
            <stop offset="1" stopColor="#4a2f1b" />
          </linearGradient>
          <linearGradient id="shelfShade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(0,0,0,.35)" />
            <stop offset="1" stopColor="rgba(0,0,0,0)" />
          </linearGradient>
          <linearGradient id="oil" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e8b923" />
            <stop offset="1" stopColor="#f5d76e" />
          </linearGradient>
          <linearGradient id="tin" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#8e9aa3" />
            <stop offset=".5" stopColor="#e6ebee" />
            <stop offset="1" stopColor="#8e9aa3" />
          </linearGradient>
          <linearGradient id="fridgeGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f4fbff" />
            <stop offset="1" stopColor="#cfe3ee" />
          </linearGradient>
          <linearGradient id="doorWood" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#7a4e2d" />
            <stop offset="1" stopColor="#6a4226" />
          </linearGradient>
          <linearGradient id="mist" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(200,210,225,.05)" />
            <stop offset="1" stopColor="rgba(200,210,225,.22)" />
          </linearGradient>
          <linearGradient id="outside" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className={styles.light} style={{ stopColor: sky[0] }} />
            <stop offset=".7" className={styles.light} style={{ stopColor: sky[1] }} />
            <stop offset="1" className={styles.light} style={{ stopColor: sky[2] }} />
          </linearGradient>
          <linearGradient id="counterTop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#c99a68" />
            <stop offset="1" stopColor="#9e7146" />
          </linearGradient>
          <linearGradient id="counterFront" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7d5131" />
            <stop offset="1" stopColor="#4d301b" />
          </linearGradient>
          <linearGradient id="cyl" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="rgba(0,0,0,.38)" />
            <stop offset=".22" stopColor="rgba(255,255,255,.22)" />
            <stop offset=".45" stopColor="rgba(255,255,255,.04)" />
            <stop offset="1" stopColor="rgba(0,0,0,.42)" />
          </linearGradient>
          <linearGradient id="plank" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#a8754a" />
            <stop offset="1" stopColor="#7a5030" />
          </linearGradient>
          <linearGradient id="post" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#3d2615" />
            <stop offset=".5" stopColor="#5e3d23" />
            <stop offset="1" stopColor="#34200f" />
          </linearGradient>
          <linearGradient id="fridgeBody" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#c2c9ce" />
            <stop offset=".5" stopColor="#eef1f3" />
            <stop offset="1" stopColor="#aeb6bc" />
          </linearGradient>
          <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#eef1f3" />
            <stop offset=".5" stopColor="#9aa3a9" />
            <stop offset="1" stopColor="#c9d0d4" />
          </linearGradient>
          <linearGradient id="brass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f3d27a" />
            <stop offset=".5" stopColor="#b8892c" />
            <stop offset="1" stopColor="#d9b25a" />
          </linearGradient>
          <linearGradient id="registerBody" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8191a0" />
            <stop offset=".5" stopColor="#5d6d7e" />
            <stop offset="1" stopColor="#3e4a56" />
          </linearGradient>
          <linearGradient id="glass" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="rgba(255,255,255,.35)" />
            <stop offset=".3" stopColor="rgba(210,230,240,.12)" />
            <stop offset=".8" stopColor="rgba(210,230,240,.08)" />
            <stop offset="1" stopColor="rgba(255,255,255,.3)" />
          </linearGradient>
          <linearGradient id="panel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#875a36" />
            <stop offset="1" stopColor="#5a3a20" />
          </linearGradient>
          <radialGradient id="bread" cx=".4" cy=".35" r=".7">
            <stop offset="0" stopColor="#f0c27b" />
            <stop offset="1" stopColor="#b8742f" />
          </radialGradient>
          <linearGradient id="sunBeam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(255,240,200,.9)" />
            <stop offset="1" stopColor="rgba(255,226,160,0)" />
          </linearGradient>
          <radialGradient id="lampLight" cx=".5" cy="0" r=".9">
            <stop offset="0" stopColor="rgba(255,226,150,.45)" />
            <stop offset="1" stopColor="rgba(255,226,150,0)" />
          </radialGradient>
          <radialGradient id="vignette" cx=".5" cy=".45" r=".75">
            <stop offset=".6" stopColor="rgba(0,0,0,0)" />
            <stop offset="1" stopColor="rgba(20,10,0,.55)" />
          </radialGradient>
        </defs>

        <rect width={W} height={H} fill="url(#wall)" />
        {/* tavan kirişi ve sıva lekeleri */}
        <rect width={W} height="40" fill="#5c3b22" />
        <rect y="40" width={W} height="8" fill="rgba(0,0,0,.2)" />
        <ellipse cx="300" cy="200" rx="160" ry="70" fill="rgba(120,90,40,.08)" />
        <ellipse cx="1300" cy="170" rx="120" ry="50" fill="rgba(120,90,40,.08)" />
        {/* lambri */}
        <rect y={fitY(560)} width={W} height="140" fill="#7a5232" />
        {Array.from({ length: 50 }, (_, i) => (
          <rect key={i} x={i * 32} y={fitY(560)} width="3" height="140" fill="rgba(0,0,0,.18)" />
        ))}
        <rect y={fitY(560) - 8} width={W} height="8" fill="#5c3b22" />

        <g transform={FIT}>
        <Door hour={hour} weather={weather} open={open} onSign={onSign} glow={coach === 'sign'} />
        {/* kapı camından yere düşen güneş: saat ilerledikçe yönü ve gücü değişir */}
        <polygon
          className={`${styles.light} ${styles.beam}`}
          points="132,430 318,430 420,700 160,700"
          fill="url(#sunBeam)"
          style={{ opacity: beam.opacity, transform: `skewX(${-beam.skew}deg)` }}
          pointerEvents="none"
        />
        <ChipsRack stock={stock} />
        <Shelves stock={stock} />
        {/* rafın yanında soğuk dolap, onun yanında ekmek dolabı: çizimleri kendi yerlerinden kaydırılır */}
        <g transform="translate(-76 0)">
          <Fridge stock={stock} />
        </g>
        <g transform="translate(380 0)">
          <BreadCase bread={stock.ekmek ?? 0} />
        </g>
        <Extras />

        {/* duvar saati: soğuk dolabın üstünde */}
        <g transform="translate(1254 -70)">
          <circle r="42" fill="#fdf8ea" stroke="#5c3b22" strokeWidth="6" />
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} d="M0 -36 V-30" stroke="#333" strokeWidth={i % 3 ? 1.5 : 3} transform={`rotate(${i * 30})`} />
          ))}
          <path d="M0 0 V-24" stroke="#222" strokeWidth="5" strokeLinecap="round" transform={`rotate(${((hour % 12) / 12) * 360})`} />
          <path d="M0 0 V-34" stroke="#222" strokeWidth="3" strokeLinecap="round" transform={`rotate(${(hour % 1) * 360})`} />
          <circle r="4" fill="#222" />
        </g>
        {/* sinek kağıdı */}
        <path d="M420 0 v60" stroke="#c9a227" strokeWidth="6" />

        </g>
        {/* tavandan sarkan ampul ve ışığı */}
        <path d="M800 40 V60" stroke="#222" strokeWidth="3" />
        <rect x="790" y="58" width="20" height="16" fill="#555" />
        <g className={styles.light} style={{ opacity: Math.min(1, 0.55 + dark * 1.6) }} pointerEvents="none">
          <circle cx="800" cy="88" r="16" fill="#fff6c8" />
          <ellipse cx="800" cy="460" rx="700" ry="460" fill="url(#lampLight)" />
        </g>
      </svg>

      {children}

      <svg className={`${styles.layer} ${styles.front}`} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <CounterBody y={fitY(COUNTER_Y)} width={W} height={H} />
        <g transform={FIT}>
          <CounterTop coach={coach} onPet={onPet} onCalc={onCalc} onBook={onBook} gum={stock.sakiz ?? 0} gumActive={gumActive} onGum={onGum} />
        </g>
        {/* akşam ve kötü havada oda kararır; ampulün çevresi aydınlık kalır */}
        <rect className={styles.light} width={W} height={H} fill="#1a1530" style={{ opacity: dark }} pointerEvents="none" />
        {/* günün renk tonu: sabah altın, akşam turuncu */}
        <rect className={`${styles.light} ${styles.tint}`} width={W} height={H} style={{ fill: tint.color, opacity: tint.alpha }} pointerEvents="none" />
        <rect width={W} height={H} fill="url(#vignette)" pointerEvents="none" />
      </svg>
    </div>
  );
}
