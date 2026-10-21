import type { ReactNode } from 'react';
import type { Weather } from './data';
import { CounterBody, CounterTop, type Till } from './Counter';
import { Fridge, Shelves } from './Goods';
import { darknessAt, skyAt } from './sky';
import { COUNTER_Y, Extras } from './ShopDecor';
import styles from './ShopScene.module.css';

/*
 * Dükkânın içi, tezgâhın arkasından bakış: tam ekran. Arkada sıva duvar ve lambri, solda camı
 * buğulu ahşap kapı, ortada tavana kadar ürün rafları, sağda ışıklı içecek dolabı, tavanda çıplak
 * ampul. Önde tezgâh: üstünde yazar kasa, şeker kavanozları, ekmek sepeti ve kefeli terazi.
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



function Door({ hour, weather }: { hour: number; weather: Weather }) {
  const sunX = 140 + Math.max(0, Math.min(1, (hour - 8) / 11)) * 170;
  const sunY = 300 - Math.sin(Math.max(0, Math.min(1, (hour - 8) / 11)) * Math.PI) * 90;
  const night = hour >= 19;
  return (
    <g>
      <rect x="90" y="150" width="270" height="540" fill="#4f3220" />
      <rect x="110" y="168" width="230" height="522" fill="url(#doorWood)" />
      {/* cam: dışarısı köy, kapı kasasına kırpılır */}
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
        {/* uzak dağlar: havadan soluklaşan üç kat */}
        <path d="M132 300 L170 262 L196 282 L232 248 L270 280 L300 266 L318 276 V430 H132Z" fill="#a9b9c6" />
        <path d="M132 318 L162 296 L200 314 L240 290 L282 312 L318 300 V430 H132Z" fill="#8ea38a" />
        <path d="M132 336 Q190 318 240 330 T318 326 V430 H132Z" fill="#7c9a5e" />
        {/* kavaklar */}
        {[146, 158, 300].map((x, i) => (
          <g key={x}>
            <rect x={x - 1.5} y={318 - i * 4} width="3" height="18" fill="#5b4330" />
            <ellipse cx={x} cy={300 - i * 4} rx="6" ry="24" fill={i % 2 ? '#56743d' : '#4a6834'} />
          </g>
        ))}
        {/* köy evi: taş duvar, kiremit çatı, baca, pencere */}
        <rect x="208" y="318" width="54" height="34" fill="#e7dcc6" />
        <rect x="208" y="344" width="54" height="8" fill="#cbbd9f" />
        <path d="M202 320 L235 296 L268 320 Z" fill="#b5523b" />
        <path d="M202 320 L235 296 L268 320" fill="none" stroke="#8c3b2a" strokeWidth="2" />
        <rect x="248" y="296" width="7" height="14" fill="#8c7b6b" />
        <rect x="216" y="326" width="12" height="11" fill="#5e7d93" />
        <rect x="238" y="330" width="12" height="22" fill="#6e4526" />
        {/* toprak yol ve taş duvar */}
        <path d="M200 430 Q214 380 232 352 L240 352 Q250 390 280 430 Z" fill="#c9a87a" />
        <path d="M132 372 H200 V382 H132 Z" fill="#b8ad98" />
        {[136, 150, 164, 178, 192].map((x) => (
          <rect key={x} x={x} y="373" width="12" height="4" rx="1" fill="#d3c8b2" />
        ))}
        <path d="M132 400 Q160 390 200 404 V430 H132Z" fill="#6d8c4f" />
        <path d="M280 430 Q300 396 318 400 V430Z" fill="#6d8c4f" />
        {night && <rect x="132" y="190" width="186" height="240" fill="rgba(10,15,40,.45)" />}
        {weather === 'rain' && (
          <g className={styles.rain} stroke="rgba(220,235,255,.7)" strokeWidth="1.5">
            {Array.from({ length: 26 }, (_, i) => (
              <path key={i} d={`M${136 + ((i * 37) % 186)} ${180 + ((i * 53) % 250)} l-4 16`} />
            ))}
          </g>
        )}
        {weather === 'snow' && (
          <g className={styles.snow} fill="#fff">
            {Array.from({ length: 30 }, (_, i) => (
              <circle key={i} cx={136 + ((i * 41) % 186)} cy={180 + ((i * 59) % 250)} r={1.5 + (i % 3)} />
            ))}
          </g>
        )}
        {weather === 'snow' && <path d="M132 400 Q200 390 318 398 V430 H132Z" fill="#f4f7f9" />}
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
      {/* asılı AÇIK levhası */}
      <path d="M185 210 L225 180 L265 210" fill="none" stroke="#333" strokeWidth="2" />
      <rect x="175" y="210" width="100" height="40" rx="4" fill="#fdf6e3" stroke="#7a1f1f" strokeWidth="3" />
      <text x="225" y="238" textAnchor="middle" fontSize="20" fontWeight="800" fill="#7a1f1f" fontFamily="var(--font-mono)">
        AÇIK
      </text>
      {/* kapı çıngırağı */}
      <path d="M340 150 v20" stroke="#333" strokeWidth="2" />
      <path className={styles.bell} d="M330 186 Q330 168 340 168 Q350 168 350 186 Z" fill="#c9a227" />
    </g>
  );
}

export function ShopScene({ children, hour = 12, weather = 'sunny', till = { amount: null, open: false }, catAwake = false, onPet, onCalc }: { children?: ReactNode; hour?: number; weather?: Weather; till?: Till; catAwake?: boolean; onPet?: () => void; onCalc?: () => void }) {
  const sky = skyAt(hour, weather);
  const dark = darknessAt(hour, weather);
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
          <linearGradient id="outside" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={sky[0]} />
            <stop offset=".7" stopColor={sky[1]} />
            <stop offset="1" stopColor={sky[2]} />
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
          <pattern id="weave" width="12" height="8" patternUnits="userSpaceOnUse">
            <path d="M0 4 q3 -4 6 0 t6 0" stroke="#8a6232" strokeWidth="2" fill="none" />
            <path d="M0 8 q3 -4 6 0 t6 0" stroke="#d1a066" strokeWidth="1" fill="none" />
          </pattern>
          <radialGradient id="bread" cx=".4" cy=".35" r=".7">
            <stop offset="0" stopColor="#f0c27b" />
            <stop offset="1" stopColor="#b8742f" />
          </radialGradient>
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
        <Door hour={hour} weather={weather} />
        <Shelves />
        <Fridge />
        <Extras />

        {/* duvar saati */}
        <g transform="translate(1530 120)">
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
        <g className={styles.lamp} opacity={Math.min(1, 0.55 + dark * 1.6)}>
          <circle cx="800" cy="88" r="16" fill="#fff6c8" />
          <ellipse cx="800" cy="460" rx="700" ry="460" fill="url(#lampLight)" />
        </g>
      </svg>

      {children}

      <svg className={`${styles.layer} ${styles.front}`} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <CounterBody y={fitY(COUNTER_Y)} width={W} height={H} />
        <g transform={FIT}>
          <CounterTop till={till} catAwake={catAwake} onPet={onPet} onCalc={onCalc} />
        </g>
        {/* akşam ve kötü havada oda kararır; ampulün çevresi aydınlık kalır */}
        <rect width={W} height={H} fill="#1a1530" opacity={dark} pointerEvents="none" />
        <rect width={W} height={H} fill="url(#vignette)" pointerEvents="none" />
      </svg>
    </div>
  );
}
